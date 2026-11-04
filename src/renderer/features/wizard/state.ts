import { create } from 'zustand'
import { warsawNow } from '@shared/calc/dates'
import { draftFromPayment } from '../cargo/actions'
import { addContainer, linkPayments } from '../cargo/actions'
import { openingFromNow } from '@shared/calc/start'
import { openingOf } from '@shared/calc/balances'
import { counterpartyKey } from '@shared/import/classify'
import type { RecurringPayment } from '@shared/calc/plan'
import type { Orders } from '@shared/schema'
import { DEFAULT_QUICK_SHORTCUT } from '@shared/machine'
import type { RecordEntry } from '@shared/api'
import { contentMark } from '@shared/merge'
import { api, errorMessage } from '../../lib/api'
import { monthLabel } from '../../lib/format'
import { deleteRecords, listOf, saveFirst, takeBackSettings, unsavedNote, unsavedOf, unsavedReport, updateSettings, useData, writeNow, type RecordMaps } from '../../store/data'
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
   * The new records of „Uruchom budżet” while the budget is not running (KR.29, T446 – przegląd 2 N5): the start's own until
   * fi.json is written; after a refusal those the folder could not take back yet. Only their ids and the marks of what the
   * start wrote – the draft on this computer is written at every answer. They keep the wizard from ending in silence:
   * „Przerwij kreator” or the next refusal takes them back, the next start uses them.
   */
  startWrites: StartWrite[]
  /**
   * The containers a refused start left in the folder that stand for proposals of step 4 (the proposal moved to its
   * container – T446): their payments are linked once the budget starts, as the new ones' (T379). Ids only.
   */
  startContainers: string[]
}

/** What „Uruchom budżet” writes before fi.json – new records only (AF-14, KR.29): the openings, the plan, the containers. */
const START_COLLECTIONS = ['balances', 'months', 'containers'] as const
type StartCollection = (typeof START_COLLECTIONS)[number]
type AnyRecord = Record<string, unknown>

/** A new record of the start: its id and the mark (`contentMark`) of what the start wrote – the only version taken back. */
export interface StartWrite {
  collection: StartCollection
  id: string
  mark: string
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
    typeof v.mark === 'string' &&
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
  startWrites: [],
  startContainers: []
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
    // A draft without the start's records or with a list this version cannot read: none.
    const known = Array.isArray(read.startWrites) && read.startWrites.every(isStartWrite) ? read : { ...read, startWrites: [] }
    const state = Array.isArray(known.startContainers) && known.startContainers.every((id) => typeof id === 'string') ? known : { ...known, startContainers: [] }
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
 * Broken off (AP-22): the answers go – and the records of a start the folder refused, those still as the start wrote them
 * (T446). One that cannot be taken back now (a newer version's, a decision about another computer's change waiting, the
 * folder refusing) keeps the wizard as it is: said, „Przerwij kreator” once more takes it back – never a silent end.
 */
export async function cancelWizard(): Promise<void> {
  const writes = useWizard.getState().startWrites
  if (writes.length) {
    const r = await withdrawStart(writes)
    if (r.blocked.length) {
      useWizard.setState({ startWrites: r.blocked.map((b) => b.w) })
      toast(`Kreator nie został przerwany – ${blockedText(r.blocked, 'spróbuj ponownie za chwilę')}${r.changed.length ? ` ${changedText(r.changed)}` : ''}`, 'error', 12_000)
      return
    }
    toast(`Kreator przerwany. ${r.changed.length ? changedText(r.changed) : 'Rekordy nieudanego startu usunięte z folderu.'}`, 'info', 10_000)
  }
  useWizard.setState(initial())
  dropDraft(shownDir())
  navigate({ page: 'bridge' })
}

/** A record of the start that cannot be taken back now, with why (it stays tracked). */
interface Blocked {
  w: StartWrite
  why: string
}

interface Withdrawn {
  /** Taken back (or gone already). */
  done: StartWrite[]
  /** Not what the start wrote any more – in the window, on the disk, or a container with payments linked: it stays, the user's. */
  changed: StartWrite[]
  blocked: Blocked[]
}

/** The containers with a payment linked to them (a part of a receipt too): in use, never taken back with a start. */
function containersInUse(transactions: RecordMaps['transactions']): Set<string> {
  const out = new Set<string>()
  for (const t of listOf(transactions)) {
    if (t.containerId) out.add(t.containerId)
    for (const s of t.splits) if (s.containerId) out.add(s.containerId)
  }
  return out
}

/**
 * The new records of a start the folder refused taken back (KR.29, T446 – przegląd 2 N5): each only while it is what the
 * start wrote – in the window (its content's mark) and on the disk (`deleteRecords` with `expected`: the main process
 * reads the file again at the deletion – a version another computer wrote a moment ago is never deleted unseen). Any
 * other – it stays and is named: changed since (the user's now), or not to take back now (a newer version wrote it, a
 * decision about another computer's change waits, the folder refused – tracked further).
 */
async function withdrawStart(writes: readonly StartWrite[]): Promise<Withdrawn> {
  const { records } = useData.getState()
  const waiting = new Set(useRemote.getState().pending.map((p) => `${p.collection}:${p.id}`))
  const inUse = containersInUse(records.transactions)
  const out: Withdrawn = { done: [], changed: [], blocked: [] }
  const ask = new Map<StartCollection, StartWrite[]>()
  for (const w of writes) {
    const entry = (records[w.collection] as Record<string, RecordEntry<AnyRecord> | undefined>)[w.id]
    if (!entry) out.done.push(w)
    else if (entry.readOnly) out.blocked.push({ w, why: 'zapisała go nowsza wersja aplikacji' })
    else if (waiting.has(`${w.collection}:${w.id}`)) out.blocked.push({ w, why: 'czeka na Twoją decyzję o zmianie z drugiego komputera' })
    else if (contentMark(entry.record) !== w.mark || (w.collection === 'containers' && inUse.has(w.id))) out.changed.push(w)
    else ask.set(w.collection, [...(ask.get(w.collection) ?? []), w])
  }
  // To the history as taken back – „Usunięte wpisy” can bring one back.
  for (const [c, list] of ask) {
    const r = await deleteRecords(c, list.map((w) => w.id), { reason: 'undo', expected: Object.fromEntries(list.map((w) => [w.id, w.mark])) })
    const deleted = new Set(r.deleted)
    const changed = new Set(r.changed)
    for (const w of list) {
      if (deleted.has(w.id)) out.done.push(w)
      else if (changed.has(w.id)) out.changed.push(w)
      else out.blocked.push({ w, why: r.error ?? 'folder nie pozwolił usunąć pliku' })
    }
  }
  return out
}

/** The name of a record of the start for the texts: „saldo otwarcia „mBank””, „plan miesiąca (listopad 2026)”, „kontener „Netflix””. */
function labelOf(w: StartWrite): string {
  const { fi, records } = useData.getState()
  const r = (records[w.collection] as Record<string, RecordEntry<AnyRecord> | undefined>)[w.id]?.record
  if (w.collection === 'balances') return `saldo otwarcia „${fi?.settings.accounts.find((a) => a.id === r?.accountId)?.name ?? 'konto'}”`
  if (w.collection === 'months') return r ? `plan miesiąca (${monthLabel(String(r.month))})` : 'plan miesiąca'
  return `kontener „${String(r?.name ?? w.proposal?.label ?? '')}”`
}

/** The records of a start still in the folder, by name (the question of „Przerwij kreator”). */
export const startWriteLabels = (writes: readonly StartWrite[]): string[] => writes.map(labelOf)

const changedText = (list: readonly StartWrite[]) => `Zostają w folderze, bo zmieniły się od zapisu startu: ${list.map(labelOf).join(', ')}.`
const blockedText = (list: readonly Blocked[], again: string) => `nie da się teraz wycofać: ${list.map((b) => `${labelOf(b.w)} (${b.why})`).join(', ')} – ${again}.`
const capital = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

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
 * A start the folder refused after its new records (KR.29, T446 – przegląd 2 N5): they are taken back first (`withdrawStart`
 * – only what is still what the start wrote), then it is said with what stays and why. A proposal whose container stays is
 * that container in the answers – the next try uses it, never a second; one whose container went is the proposal again.
 */
async function refusedStart(reason: string, made: Readonly<Record<string, string>>): Promise<false> {
  const writes = useWizard.getState().startWrites
  const r = await withdrawStart(writes)
  const { containers } = useData.getState().records
  const stays = Object.entries(made).filter(([, id]) => containers[id])
  const back = r.done.filter((x) => x.collection === 'containers' && x.proposal)
  useWizard.setState((x) => {
    const cargo = { ...x.cargo }
    const tanks = { ...(x.tanks ?? {}) }
    const move = (from: string, to: string) => {
      if (tanks[from] == null) return
      tanks[to] = tanks[from]!
      delete tanks[from]
    }
    const kept = new Set(x.startContainers)
    for (const [key, id] of stays) {
      delete cargo[key]
      move(key, id)
      kept.add(id)
    }
    for (const c of back) {
      cargo[c.proposal!.key] = c.proposal!
      move(c.id, c.proposal!.key)
      kept.delete(c.id)
    }
    return { cargo, tanks, startWrites: r.blocked.map((b) => b.w), startContainers: [...kept] }
  })
  if (!r.changed.length && !r.blocked.length) return notStarted(`${reason} Zapisane już salda otwarcia, plan i kontenery wycofano – w folderze nie ma nic ze startu, „Uruchom budżet” zapisze je od nowa.`)
  const said = [
    ...(r.changed.length ? [changedText(r.changed)] : []),
    ...(r.blocked.length ? [capital(blockedText(r.blocked, 'kreator je pamięta, „Przerwij kreator” albo ponowny start spróbuje jeszcze raz'))] : []),
    ...(r.done.length ? ['Resztę rekordów startu wycofano.'] : [])
  ]
  return notStarted(`${reason} ${said.join(' ')}`)
}

/**
 * Start the budget: the opening balances at the start of today (the balance now without today's operations), the
 * settings (the ship, the layers, the orders, the start and its split), this month's plan, the chosen containers, the
 * shortcut and the start with Windows (D64: the wizard asks about it).
 *
 * Whole or not at all (AF-14, KR.29 – przegląd 2 N5): what waited from before is written first (a folder that refuses it
 * refuses the start – nothing of it written); then the start's new records (the openings of accounts without one, marked
 * `byStart`; the month's plan when it has none; the containers of the proposals) and only when they are on the disk
 * fi.json with `budget.start` – the mark of a running budget. A folder that refuses them or fi.json: the settings taken
 * back in the window, the new records taken back (`refusedStart`), the answers kept. What was there before – an opening or
 * a plan typed over, the payments linked to the chosen containers (T379) – changes only once fi.json is written, so a
 * refusal never has anything of the user's to put back.
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
  // 2. The start's new records, on the disk before the settings; the changes of what is there wait for fi.json (`later`).
  const before = s.records
  const later: Array<() => void> = []
  const openings = listOf(s.records.balances)
  for (const [accountId, now] of Object.entries(w.balances)) {
    if (now == null) continue
    const amount = openingFromNow(accountId, now, today, txs)
    if (openingOf(accountId, openings)) later.push(() => setOpening(accountId, amount, today))
    else setOpening(accountId, amount, today, { byStart: true })
  }
  const setPlan = () => void editPlan(month, (p) => ({ ...p, salary: o.salary, envelopes: { ...o.envelopes } }))
  if (listOf(s.records.months).some((p) => p.month === month)) later.push(setPlan)
  else setPlan()
  const initialTanks: Record<string, number> = {}
  for (const [k, v] of Object.entries(o.tanks ?? {})) if (v > 0 && s.records.containers[k]) initialTanks[k] = v
  // A chosen proposal becomes a container (its payments linked once fi.json is written – step 4). One of its payee already
  // there (a start the folder refused before, whose container it could not take back) is that one – never a second.
  const containers = listOf(s.records.containers)
  const made: Record<string, string> = {}
  for (const p of Object.values(w.cargo)) {
    const id = containers.find((c) => !c.archived && counterpartyKey(c.counterparty) === p.key)?.id ?? addContainer(draftFromPayment(p))
    if (!id) continue
    made[p.key] = id
    const tank = o.tanks?.[p.key] ?? 0
    if (tank > 0) initialTanks[id] = tank
  }
  // What the start made, with the answers (also in the draft: ids and marks) – a refusal takes back only these.
  const after = useData.getState().records
  const proposals = new Map(Object.entries(made).flatMap(([key, id]) => (w.cargo[key] ? [[id, w.cargo[key]!] as const] : [])))
  const madeNow = START_COLLECTIONS.flatMap((c) =>
    Object.entries(after[c] as Record<string, RecordEntry<AnyRecord>>)
      .filter(([id]) => !(before[c] as Record<string, unknown>)[id])
      .map(([id, e]): StartWrite => ({ collection: c, id, mark: contentMark(e.record), ...(proposals.get(id) ? { proposal: proposals.get(id)! } : {}) }))
  )
  useWizard.setState({ startWrites: [...useWizard.getState().startWrites, ...madeNow] })
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
  // 4. The budget runs: what was there before changes now – the openings and the plan typed over, the payments of the
  // chosen containers linked from the month before the start (T379 – the cargo, not an envelope; a fee paid early for this
  // month's due is paid). Never taken back: a write the folder refuses is said below and retried by itself.
  for (const run of later) run()
  for (const id of new Set([...Object.values(made), ...useWizard.getState().startContainers])) {
    const c = useData.getState().records.containers[id]?.record
    if (c && !c.archived) linkPayments(c.id, c.counterparty, true, today)
  }
  await setMachinePrefs({ quickShortcut: w.shortcut })
  try {
    // The closing to the tray stays this computer's choice (N100): the wizard asks only about the start with Windows.
    await setTrayPrefs({ launchAtLogin: w.autostart })
  } catch {
    /* applied at once in the system; a refused write of config.json is retried by itself (T433) – said by the tray store */
  }
  const note = await unsavedNote()
  useWizard.setState(initial())
  dropDraft(shownDir())
  navigate({ page: 'bridge' })
  playSound('docking')
  toast(note ? `Budżet uruchomiony – ${note}.` : 'Okręt wypłynął: budżet działa od dziś.', note ? 'info' : 'success', note ? 9000 : 5000)
  return true
}
