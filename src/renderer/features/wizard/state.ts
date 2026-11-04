import { create } from 'zustand'
import { warsawNow } from '@shared/calc/dates'
import { draftFromPayment } from '../cargo/actions'
import { addContainer } from '../cargo/actions'
import { openingFromNow } from '@shared/calc/start'
import { openingOf } from '@shared/calc/balances'
import { counterpartyKey } from '@shared/import/classify'
import type { RecurringPayment } from '@shared/calc/plan'
import type { Orders } from '@shared/schema'
import { DEFAULT_QUICK_SHORTCUT } from '@shared/machine'
import type { RecordEntry } from '@shared/api'
import { countLabel } from '@shared/format'
import { BOOKKEEPING, deepEqual, sameContentAs } from '@shared/merge'
import { api, errorMessage } from '../../lib/api'
import { monthLabel } from '../../lib/format'
import { deleteRecords, flushSaves, listOf, replaceRecords, saveFirst, takeBackSettings, unsavedNote, unsavedOf, unsavedReport, updateSettings, useData, writeNow, type RecordMaps } from '../../store/data'
import { useRemote } from '../../store/remote'
import { setMachinePrefs, useMachine } from '../../store/machine'
import { setTrayPrefs } from '../../store/tray'
import { navigate, toast } from '../../store/ui'
import { setOpening } from '../balances/actions'
import { editPlan } from '../month/actions'
import { playSound } from '../../lib/sounds'

export const WIZARD_STEPS = ['Konta i salda', 'Historia z mBanku', 'Pensja i warstwy', 'Ładownia i koperty', 'ICTTJ i cele', 'Podział środków', 'Okręt i rozkazy'] as const

/** The start wizard's answers (spec, „Kreator startu”); applied together at the end. */
export interface WizardState {
  /** The wizard runs (the import page offers the way back). */
  active: boolean
  step: number
  /** Balance in the bank now, per account (null = not typed). */
  balances: Record<string, number | null>
  salary: number | null
  shieldSalaries: number
  hullMonths: number
  /** Average costs assumed while the history is shorter than 3 full months. */
  assumedCosts: number | null
  /**
   * The first month's envelopes typed by hand, over the proposals (B75: a change of the cargo proposes the rest again, never
   * these); null = cleared by hand.
   */
  envelopes: Record<string, number | null>
  /** Recurring payments chosen for the cargo (by key). */
  cargo: Record<string, RecurringPayment>
  /** The hull at the start (null = the docking order's proposal). */
  hull: number | null
  /** The goals' money at the start (null = the docking order's proposal – N7). */
  goals: Record<string, number> | null
  /** Initial money in periodic cargo tanks at the start (N-PC-7), keyed by container id or chosen proposal key. */
  tanks: Record<string, number> | null
  shipName: string
  orders: Orders | null
  shortcut: string
  autostart: boolean
  /** What the wizard has already written into the folder (members, goals): it stays when the wizard is broken off (AP-22). */
  traces: string[]
  /**
   * The records „Uruchom budżet” wrote before fi.json while the budget is not running (KR.29, T446 – przegląd N5 2): the
   * start's own until it is whole; after a refusal what the folder still has of them (it refused to let go, or changed
   * since). „Przerwij kreator” takes them back, the next start uses them.
   */
  startWrites: StartWrite[]
}

/** What „Uruchom budżet” writes before fi.json (AF-14, KR.29): the openings, the plan, the containers, the payments linked. */
const START_COLLECTIONS = ['balances', 'months', 'containers', 'transactions'] as const
type StartCollection = (typeof START_COLLECTIONS)[number]
type AnyRecord = Record<string, unknown>

/** A record the start wrote: as it was before (null – the start made it) and as the start left it. */
export interface StartWrite {
  collection: StartCollection
  id: string
  before: AnyRecord | null
  after: AnyRecord
  /** A container made of a proposal of step 4: the proposal – among the answers again when the container is taken back. */
  proposal?: RecurringPayment
}

const isRecord = (v: unknown): v is AnyRecord => typeof v === 'object' && v !== null && !Array.isArray(v)

/** One kept with the answers on this computer (the draft), as this version reads it. */
function isStartWrite(v: unknown): v is StartWrite {
  return (
    isRecord(v) &&
    (START_COLLECTIONS as readonly unknown[]).includes(v.collection) &&
    typeof v.id === 'string' &&
    (v.before === null || isRecord(v.before)) &&
    isRecord(v.after) &&
    (v.proposal === undefined || (isRecord(v.proposal) && typeof v.proposal.key === 'string'))
  )
}

const initial = (): WizardState => ({
  active: false,
  step: 0,
  balances: {},
  salary: null,
  shieldSalaries: 3,
  hullMonths: 6,
  assumedCosts: null,
  envelopes: {},
  cargo: {},
  hull: null,
  goals: null,
  tanks: null,
  shipName: '',
  orders: null,
  shortcut: DEFAULT_QUICK_SHORTCUT,
  autostart: true,
  traces: [],
  startWrites: []
})

export const useWizard = create<WizardState>(() => initial())

/**
 * The wizard's answers kept on this computer (AP-8, AF-11): typed and not applied yet, they live through a restart – one
 * draft per data folder (its accounts, its goals), until the budget starts or the wizard is broken off.
 */
const DRAFT_KEY = 'fi.wizard.draft:'
const draftKey = (dir: string) => `${DRAFT_KEY}${dir.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()}`

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** The draft of the folder shown; null = none (or one this version cannot read – started afresh). */
export function wizardDraftOf(dir: string): WizardState | null {
  try {
    const raw = storage()?.getItem(draftKey(dir))
    if (!raw) return null
    const kept = JSON.parse(raw) as { v?: unknown; state?: unknown }
    if (kept.v !== 1 || !kept.state || typeof kept.state !== 'object') return null
    const read = { ...initial(), ...(kept.state as Partial<WizardState>), active: true }
    // A draft of before 1.15.9 (no start's records) or a list this version cannot read: none.
    const state = Array.isArray(read.startWrites) && read.startWrites.every(isStartWrite) ? read : { ...read, startWrites: [] }
    return Number.isInteger(state.step) && state.step >= 0 && state.step < WIZARD_STEPS.length ? state : { ...state, step: 0 }
  } catch {
    return null
  }
}

function keepDraft(dir: string, w: WizardState): void {
  try {
    storage()?.setItem(draftKey(dir), JSON.stringify({ v: 1, at: new Date().toISOString(), state: w }))
  } catch {
    /* a full or blocked storage: the answers stay for this session */
  }
}

function dropDraft(dir: string | undefined): void {
  if (!dir) return
  try {
    storage()?.removeItem(draftKey(dir))
  } catch {
    /* ignore */
  }
}

const shownDir = () => useData.getState().status?.dataDir

// The answers kept as they change, while the wizard runs.
useWizard.subscribe((w) => {
  const dir = shownDir()
  if (w.active && dir) keepDraft(dir, w)
})

// A folder shown (the start, another folder): its own draft, if the budget is not running yet; a running budget's goes.
useData.subscribe((s, prev) => {
  const dir = s.status?.dataDir
  const shown = s.phase === 'ready' && (prev.phase !== 'ready' || dir !== prev.status?.dataDir)
  if (shown && dir) {
    if (s.fi?.settings.budget.start) {
      dropDraft(dir)
      if (useWizard.getState().active) useWizard.setState(initial())
    } else useWizard.setState(wizardDraftOf(dir) ?? initial())
  } else if (dir && s.fi?.settings.budget.start && !prev.fi?.settings.budget.start) dropDraft(dir)
})

export function startWizard(): void {
  const fi = useData.getState().fi
  // A running budget is never restarted from here: the start would reset the layers' history.
  if (fi?.settings.budget.start) {
    useWizard.setState(initial())
    navigate({ page: 'wizard' })
    return
  }
  // Already running (the banner, the palette – AF-11): back to it with every answer, never from the start.
  if (useWizard.getState().active) {
    navigate({ page: 'wizard' })
    return
  }
  useWizard.setState({
    ...initial(),
    active: true,
    shipName: fi?.settings.shipName ?? 'Flagowiec',
    shieldSalaries: fi?.settings.layers.shieldSalaries ?? 3,
    hullMonths: fi?.settings.layers.hullMonths ?? 6,
    assumedCosts: fi?.settings.layers.assumedCosts ?? null,
    orders: fi?.settings.orders ?? null,
    // This computer's own choices (N100): its shortcut, its start with Windows – on unless switched off here before.
    shortcut: useMachine.getState().prefs.quickShortcut || DEFAULT_QUICK_SHORTCUT
  })
  void api.trayPrefs().then(
    (p) => {
      if (useWizard.getState().active) useWizard.setState({ autostart: p.launchAtLogin || !p.autostartAsked })
    },
    () => undefined
  )
  navigate({ page: 'wizard' })
}

export const patchWizard = (p: Partial<WizardState>) => useWizard.setState(p)

/** Something the wizard wrote at once (a member, a goal): said when it is broken off, for it stays in the folder. */
export const noteTrace = (text: string): void => useWizard.setState((w) => (w.traces.includes(text) ? w : { traces: [...w.traces, text] }))

/** The traces the wizard knows of besides its members and goals (AP-25): ICTTJ's folder chosen, an import made meanwhile. */
export const ICTJ_TRACE = 'cele prognozy ICT Trade Journal (folder ICTTJ zostaje wybrany na tym komputerze)'
export const IMPORT_TRACE = 'operacje z importu'

/** An import done (its batch `after`, none before it or another) while the wizard runs: a trace of it (AP-25, KR sp. 6). */
export function noteImportTrace(before: string | null, after: string | null): void {
  if (after && after !== before && useWizard.getState().active) noteTrace(IMPORT_TRACE)
}

/**
 * The question when the wizard is broken off (AP-22, KR.30): what is lost and what stays – and where it goes away.
 * `started` – the records of a start the folder refused still in it (`startWriteLabels`): „Przerwij” takes them back.
 */
export function cancelWizardText(traces: readonly string[], started: readonly string[] = []): string {
  const where = ['w Ustawieniach', 'na Mapie gwiezdnej', ...(traces.includes(IMPORT_TRACE) ? ['w Imporcie („Cofnij import”)'] : [])]
  const whereText = `${where.slice(0, -1).join(', ')} albo ${where.at(-1)}`
  const left = started.length ? ` Zapisane już w folderze rekordy nieudanego startu (${started.join(', ')}) kreator usunie – zmienione od tego czasu zostaną, jak są.` : ''
  return `Odpowiedzi kreatora (salda, plan, wybór kontenerów) przepadną, budżet się nie uruchomi.${left}${traces.length ? ` Zostaje w folderze: ${traces.join(', ')} – usuniesz to ${whereText}.` : ''}`
}

/**
 * Broken off (AP-22): the answers go – and the records of a start the folder refused, those still as it left them (T446).
 * One the folder will not let go yet keeps the wizard as it is: said, „Przerwij kreator” once more takes it back.
 */
export async function cancelWizard(): Promise<void> {
  const writes = useWizard.getState().startWrites
  if (writes.length) {
    const r = await withdrawStart(writes)
    if (r.left.length) {
      useWizard.setState({ startWrites: [...r.left, ...r.changed] })
      const text = withdrawnText(r, 'cancel')!
      toast(`Kreator nie został przerwany – ${text.charAt(0).toLowerCase()}${text.slice(1)}`, 'error', 12_000)
      return
    }
    toast(`Kreator przerwany. ${withdrawnText(r, 'cancel') ?? 'Rekordy nieudanego startu usunięte z folderu.'}`, 'info', 10_000)
  }
  useWizard.setState(initial())
  dropDraft(shownDir())
  navigate({ page: 'bridge' })
}

/**
 * What a start wrote before fi.json (KR.29): each record of the start's collections that `after` has anew – the
 * synchronous step between the two states writes nothing else. One an earlier refused start wrote keeps its version from
 * before that start (and its proposal); `proposals` – the containers made of the proposals of step 4.
 */
function startWritesOf(before: RecordMaps, after: RecordMaps, earlier: readonly StartWrite[], proposals: ReadonlyMap<string, RecurringPayment>): StartWrite[] {
  const out = new Map(earlier.map((w) => [`${w.collection}:${w.id}`, w]))
  for (const c of START_COLLECTIONS) {
    const was = before[c] as Record<string, RecordEntry<unknown> | undefined>
    for (const [id, e] of Object.entries(after[c] as Record<string, RecordEntry<unknown>>)) {
      if (was[id]?.record === e.record) continue
      const key = `${c}:${id}`
      const known = out.get(key)
      const proposal = known?.proposal ?? (c === 'containers' ? proposals.get(id) : undefined)
      out.set(key, { collection: c, id, before: known ? known.before : ((was[id]?.record as AnyRecord | undefined) ?? null), after: e.record as AnyRecord, ...(proposal ? { proposal } : {}) })
    }
  }
  return [...out.values()]
}

/**
 * Taking a write back, as „Cofnij” (AP-22, T418): one the start made goes only as it left it; one it changed gets back
 * the fields it changed, only while they are as it left them (a change of another field since stays). null – changed
 * since: it stays.
 */
function takenBack(now: AnyRecord, w: StartWrite): 'gone' | AnyRecord | null {
  if (!w.before) return sameContentAs(now, w.after) ? 'gone' : null
  const was = w.before
  const keys = [...new Set([...Object.keys(was), ...Object.keys(w.after)])].filter((k) => !BOOKKEEPING.has(k) && !deepEqual(was[k], w.after[k]))
  if (!keys.every((k) => deepEqual(now[k], w.after[k]))) return null
  const out: AnyRecord = { ...now }
  for (const k of keys) {
    if (k in was) out[k] = was[k]
    else delete out[k]
  }
  return out
}

interface Withdrawn {
  /** Taken back (or gone already). */
  done: number
  /** Not taken back: the folder refused (to take back again), or changed since (stays as it is). */
  left: StartWrite[]
  changed: StartWrite[]
  /** The folder's reason of the first refusal. */
  error: string | null
  /** Taken back in the window, not on the disk yet (the app writes it again by itself). */
  unsaved: boolean
}

/**
 * The records of a start the folder refused taken back (KR.29, T446 – przegląd N5 2): no opening the engine would run
 * from without the start (T25), no plan, no container, no payment linked to one – only what is still as the start left
 * it; one written by a newer version of the app or waiting for a decision about another computer's change stays as it is.
 */
async function withdrawStart(writes: readonly StartWrite[]): Promise<Withdrawn> {
  const { records } = useData.getState()
  const waiting = new Set(useRemote.getState().pending.map((p) => `${p.collection}:${p.id}`))
  const gone = new Map<StartCollection, StartWrite[]>()
  const back: Array<{ w: StartWrite; record: AnyRecord }> = []
  const changed: StartWrite[] = []
  for (const w of writes) {
    const entry = (records[w.collection] as Record<string, RecordEntry<AnyRecord> | undefined>)[w.id]
    if (!entry) continue
    const made = entry.readOnly || waiting.has(`${w.collection}:${w.id}`) ? null : takenBack(entry.record, w)
    if (made === 'gone') gone.set(w.collection, [...(gone.get(w.collection) ?? []), w])
    else if (made) back.push({ w, record: made })
    else changed.push(w)
  }
  const left: StartWrite[] = []
  let error: string | null = null
  // The records the start made go first (to the history – „Usunięte wpisy” can bring one back).
  for (const [c, list] of gone) {
    const r = await deleteRecords(c, list.map((w) => w.id), { reason: 'undo' })
    error ??= r.error
    const deleted = new Set(r.deleted)
    left.push(...list.filter((w) => !deleted.has(w.id)))
  }
  // A payment keeps its link to a container that stays: they stay together – one the folder kept (the next start uses it
  // with its payments, „Przerwij” takes both back), one changed since (it is the user's now, with its payments).
  const containerOf = (list: readonly StartWrite[]) => new Set(list.filter((w) => w.collection === 'containers').map((w) => w.id))
  const refused = containerOf(left)
  const changedOnes = containerOf(changed)
  const linkedTo = (ids: ReadonlySet<string>) => back.filter(({ w }) => w.collection === 'transactions' && ids.has(String(w.after.containerId)))
  left.push(...linkedTo(refused).map((x) => x.w))
  changed.push(...linkedTo(changedOnes).map((x) => x.w))
  const restore = back.filter(({ w }) => !(w.collection === 'transactions' && (refused.has(String(w.after.containerId)) || changedOnes.has(String(w.after.containerId)))))
  for (const c of START_COLLECTIONS) {
    const list = restore.filter((x) => x.w.collection === c)
    if (list.length && !replaceRecords(c, list.map((x) => x.record) as never[])) left.push(...list.map((x) => x.w))
  }
  if (restore.length) await flushSaves()
  const unsaved = restore.some((x) => unsavedOf(x.w.collection, x.w.id) != null)
  return { done: writes.length - left.length - changed.length, left, changed, error, unsaved }
}

/** The names of the start's records for the texts: „saldo otwarcia „mBank””, „kontener „Netflix””, „3 płatności połączone…”. */
export function startWriteLabels(writes: readonly StartWrite[]): string[] {
  const accounts = useData.getState().fi?.settings.accounts ?? []
  const out: string[] = []
  for (const w of writes) {
    if (w.collection === 'balances') out.push(`saldo otwarcia „${accounts.find((a) => a.id === w.after.accountId)?.name ?? 'konto'}”`)
    else if (w.collection === 'months') out.push(`plan miesiąca (${monthLabel(String(w.after.month))})`)
    else if (w.collection === 'containers') out.push(`kontener „${String(w.after.name)}”`)
  }
  const linked = writes.filter((w) => w.collection === 'transactions').length
  if (linked) out.push(`${countLabel(linked, 'płatność połączona', 'płatności połączone', 'płatności połączonych')} z kontenerem`)
  return out
}

/** What taking the start back left, said – after the refused start or at „Przerwij kreator”; nothing – null. */
function withdrawnText(r: Withdrawn, when: 'start' | 'cancel'): string | null {
  const again = when === 'start' ? '„Przerwij kreator” albo ponowny start spróbuje jeszcze raz' : 'spróbuj ponownie za chwilę'
  const parts = [
    ...(r.left.length ? [`nie udało się wycofać z folderu: ${startWriteLabels(r.left).join(', ')}${r.error ? ` (${r.error})` : ''} – ${again}.`] : []),
    ...(r.changed.length ? [`Zmienione od tego czasu zostają, jak są: ${startWriteLabels(r.changed).join(', ')}.`] : []),
    ...(r.unsaved ? ['Część wycofania czeka na zapis w folderze – aplikacja ponawia go sama.'] : [])
  ]
  if (!parts.length) return null
  const text = parts.join(' ')
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

/** What „Uruchom budżet” still needs (AF-14): only what is missing – never the whole list when the steps are filled in. */
export function finishBlockers(o: { missing: readonly string[]; salary: number | null; overSplit: boolean }): string[] {
  return [
    ...(o.missing.length ? [`saldo teraz (krok 1): ${o.missing.join(', ')}`] : []),
    ...(o.salary == null || o.salary <= 0 ? ['pensja (krok 3)'] : []),
    ...(o.overSplit ? ['kadłub, cele i zbiorniki w granicach środków (krok 6)'] : [])
  ]
}

/** How long the start waits for fi.json on the disk before it counts it as written later (a slow folder). */
const START_WRITE_MS = 15_000

/** The wizard's answers kept for the folder shown again (a start the folder refused – they must outlive a restart). */
function keepShownDraft(): void {
  const dir = shownDir()
  const w = useWizard.getState()
  if (dir && w.active) keepDraft(dir, w)
}

/** The budget did not start (AF-14): said with the reason, the answers kept for „Uruchom budżet” once more. */
function notStarted(text: string): false {
  keepShownDraft()
  toast(`Budżet nie wystartował – ${text.charAt(0).toLowerCase()}${text.slice(1)}`, 'error', 12_000)
  return false
}

/**
 * A start the folder refused after its records (KR.29, T446 – przegląd N5 2): they are taken back first – the folder
 * keeps no opening the engine would run from without the start (T25), no plan, no container, no payment linked to one –
 * then it is said, with what could not be taken back (kept with the answers: „Przerwij kreator” or the next start takes
 * it). A proposal whose container stays is that container in the answers – the next try uses it, never a second; one
 * whose container went (an earlier refusal kept it) is the proposal again.
 */
async function refusedStart(reason: string, made: Readonly<Record<string, string>>): Promise<false> {
  const writes = useWizard.getState().startWrites
  const r = await withdrawStart(writes)
  const { containers } = useData.getState().records
  const stays = Object.entries(made).filter(([, id]) => containers[id])
  const back = writes.filter((x) => x.collection === 'containers' && x.proposal && !containers[x.id])
  useWizard.setState((x) => {
    const cargo = { ...x.cargo }
    const tanks = { ...(x.tanks ?? {}) }
    const move = (from: string, to: string) => {
      if (tanks[from] == null) return
      tanks[to] = tanks[from]!
      delete tanks[from]
    }
    for (const [key, id] of stays) {
      delete cargo[key]
      move(key, id)
    }
    for (const c of back) {
      cargo[c.proposal!.key] = c.proposal!
      move(c.id, c.proposal!.key)
    }
    return { cargo, tanks, startWrites: [...r.left, ...r.changed] }
  })
  const text =
    r.left.length || r.changed.length
      ? `${withdrawnText(r, 'start')!}${r.done ? ' Resztę rekordów startu wycofano.' : ''}`
      : r.unsaved
        ? 'Zapisane już salda otwarcia, plan i kontenery wycofano; część wycofania czeka na zapis w folderze – aplikacja ponawia go sama, a „Uruchom budżet” zapisze je od nowa.'
        : 'Zapisane już salda otwarcia, plan i kontenery wycofano – w folderze nie ma nic ze startu, „Uruchom budżet” zapisze je od nowa.'
  return notStarted(`${reason} ${text}`)
}

/**
 * Start the budget: the opening balances at the start of today (the balance now without today's operations), the
 * settings (the ship, the layers, the orders, the start and its split), this month's plan, the chosen containers, the
 * shortcut and the start with Windows (D64: the wizard asks about it).
 *
 * Whole or not at all (AF-14, KR.29): what waited from before is written first (a folder that refuses it refuses the
 * start – nothing of it written); then the start's records (the openings, the plan, the containers with their payments)
 * and only when they are on the disk fi.json with `budget.start` – the mark of a running budget. A folder that refuses
 * the records or fi.json: the settings taken back in the window, the records the start wrote taken back too
 * (`refusedStart` – przegląd N5 2), the answers kept for the next „Uruchom budżet”.
 */
export async function finishWizard(o: { salary: number; hull: number; goals: Record<string, number>; tanks?: Record<string, number>; envelopes: Record<string, number> }): Promise<boolean> {
  const s0 = useData.getState()
  if (!s0.fi || s0.status?.readOnly || s0.switching) {
    toast(s0.switching ? 'Trwa otwieranie innego folderu – budżetu nie można teraz uruchomić.' : `${s0.status?.readOnlyReason ?? 'Folder jest tylko do odczytu.'} Budżetu nie można uruchomić.`, 'error', 8000)
    return false
  }
  const w = useWizard.getState()
  const { date: today, month } = warsawNow()
  // The cash (D83) has no history of the bank: empty = 0 zł.
  const missing = s0.fi.settings.accounts.filter((a) => !a.archived && a.kind !== 'cash' && w.balances[a.id] == null && !openingOf(a.id, listOf(s0.records.balances)))
  if (missing.length) {
    toast(`Wpisz saldo teraz (krok 1): ${missing.map((a) => a.name).join(', ')} – 0, jeśli konto jest puste.`, 'error', 6000)
    useWizard.setState({ step: 0 })
    return false
  }
  // 1. What waited from before (a member, a goal of the wizard, any change): the folder takes it, or nothing starts.
  try {
    await saveFirst('start budżetu')
  } catch (e) {
    return notStarted(errorMessage(e))
  }
  const s = useData.getState()
  if (!s.fi || s.status?.readOnly || s.switching) return notStarted(s.status?.readOnlyReason ?? 'folder jest tylko do odczytu.')
  const txs = listOf(s.records.transactions)
  // 2. The start's records: on the disk before the settings – each remembered as it was before (a refusal takes it back).
  const before = s.records
  for (const [accountId, now] of Object.entries(w.balances)) if (now != null) setOpening(accountId, openingFromNow(accountId, now, today, txs), today)
  editPlan(month, (p) => ({ ...p, salary: o.salary, envelopes: { ...o.envelopes } }))
  const initialTanks: Record<string, number> = {}
  for (const [k, v] of Object.entries(o.tanks ?? {})) if (v > 0 && s.records.containers[k]) initialTanks[k] = v
  // A chosen proposal becomes a container, its payments linked from the month before the start (T379 – the cargo, not an
  // envelope; a fee paid early for this month's due is paid). One of its payee already there (a start the folder refused
  // before, whose container it could not take back) is that one – never a second.
  const containers = listOf(s.records.containers)
  const made: Record<string, string> = {}
  for (const p of Object.values(w.cargo)) {
    const id = containers.find((c) => !c.archived && counterpartyKey(c.counterparty) === p.key)?.id ?? addContainer(draftFromPayment(p), { start: today })
    if (!id) continue
    made[p.key] = id
    const tank = o.tanks?.[p.key] ?? 0
    if (tank > 0) initialTanks[id] = tank
  }
  // What the start wrote, with the answers (on this computer too – a restart): „Przerwij” knows it until the start is whole.
  const proposals = new Map(Object.entries(made).flatMap(([key, id]) => (w.cargo[key] ? [[id, w.cargo[key]!] as const] : [])))
  useWizard.setState({ startWrites: startWritesOf(before, useData.getState().records, useWizard.getState().startWrites, proposals) })
  try {
    await saveFirst('start budżetu')
  } catch (e) {
    const r = unsavedReport()
    return refusedStart(r.error ? `nie udało się zapisać rekordów startu w folderze (${r.error}).` : errorMessage(e), made)
  }
  // 3. The mark of a running budget.
  const ok = updateSettings((f) => ({
    ...f,
    settings: {
      ...f.settings,
      shipName: w.shipName.trim() || f.settings.shipName,
      layers: { ...f.settings.layers, shieldSalaries: w.shieldSalaries, hullMonths: w.hullMonths, assumedCosts: w.assumedCosts },
      orders: w.orders ?? f.settings.orders,
      household:
        f.settings.household.since === undefined && f.settings.household.members.some((m) => m.opening.owed > 0 || m.opening.deposit > 0)
          ? { ...f.settings.household, since: today }
          : f.settings.household,
      budget: {
        start: today,
        initial: {
          shields: 0,
          hull: o.hull,
          goals: Object.fromEntries(Object.entries(o.goals).filter(([, v]) => v > 0)),
          ...(Object.keys(initialTanks).length ? { tanks: { ...initialTanks } } : {})
        }
      }
    }
  }))
  const marked = useData.getState().fi
  if (!ok || !marked) return refusedStart(useData.getState().status?.readOnlyReason ?? 'folder jest tylko do odczytu.', made)
  if (!(await writeNow('fi', 'fi', START_WRITE_MS))) {
    const reason = unsavedOf('fi', 'fi') ?? 'zapis jeszcze trwa'
    // Refused by the folder: taken back – the window shows what the folder has, and so the start's records. On its way
    // still (a slow folder): it is written later, as every change, and said so below.
    if (takeBackSettings(marked)) return refusedStart(`nie udało się zapisać ustawień w folderze (${reason}).`, made)
  }
  await setMachinePrefs({ quickShortcut: w.shortcut })
  try {
    // The closing to the tray stays this computer's choice (N100): the wizard asks only about the start with Windows.
    await setTrayPrefs({ launchAtLogin: w.autostart })
  } catch {
    /* the tray settings stay as they were */
  }
  const note = await unsavedNote()
  useWizard.setState(initial())
  dropDraft(shownDir())
  navigate({ page: 'bridge' })
  playSound('docking')
  toast(note ? `Budżet uruchomiony – ${note}.` : 'Okręt wypłynął: budżet działa od dziś.', note ? 'info' : 'success', note ? 9000 : 5000)
  return true
}
