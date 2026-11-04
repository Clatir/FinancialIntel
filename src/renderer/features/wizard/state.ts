import { create } from 'zustand'
import { warsawNow } from '@shared/calc/dates'
import { draftFromPayment } from '../cargo/actions'
import { addContainer, linkPayments } from '../cargo/actions'
import { openingFromNow } from '@shared/calc/start'
import { openingOf } from '@shared/calc/balances'
import { counterpartyKey } from '@shared/import/classify'
import type { RecurringPayment } from '@shared/calc/plan'
import type { Orders, SettingsFile } from '@shared/schema'
import { DEFAULT_QUICK_SHORTCUT } from '@shared/machine'
import { newId } from '@shared/ids'
import { api, errorMessage } from '../../lib/api'
import { listOf, saveFirst, unsavedNote, useData, writeStart } from '../../store/data'
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
  traces: []
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
    const state = { ...initial(), ...(kept.state as Partial<WizardState>), active: true }
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
 * The question when the wizard is broken off (AP-22, KR.30): what is lost and what stays – and where it goes away. The
 * answers are all that is lost: „Uruchom budżet” writes nothing of the start before the folder took fi.json (T446).
 */
export function cancelWizardText(traces: readonly string[]): string {
  const where = ['w Ustawieniach', 'na Mapie gwiezdnej', ...(traces.includes(IMPORT_TRACE) ? ['w Imporcie („Cofnij import”)'] : [])]
  const whereText = `${where.slice(0, -1).join(', ')} albo ${where.at(-1)}`
  return `Odpowiedzi kreatora (salda, plan, wybór kontenerów) przepadną, budżet się nie uruchomi.${traces.length ? ` Zostaje w folderze: ${traces.join(', ')} – usuniesz to ${whereText}.` : ''}`
}

export function cancelWizard(): void {
  useWizard.setState(initial())
  dropDraft(shownDir())
  navigate({ page: 'bridge' })
}

/** What „Uruchom budżet” still needs (AF-14): only what is missing – never the whole list when the steps are filled in. */
export function finishBlockers(o: { missing: readonly string[]; salary: number | null; overSplit: boolean }): string[] {
  return [
    ...(o.missing.length ? [`saldo teraz (krok 1): ${o.missing.join(', ')}`] : []),
    ...(o.salary == null || o.salary <= 0 ? ['pensja (krok 3)'] : []),
    ...(o.overSplit ? ['kadłub, cele i zbiorniki w granicach środków (krok 6)'] : [])
  ]
}

/** How long the start waits for fi.json on the disk before it says the folder is slow (and waits on – T446). */
const START_WRITE_MS = 15_000
/** A slow folder at „Uruchom budżet” (T446): the start waits for fi.json – nothing of it is written before the folder took it. */
export const SLOW_START_TEXT = 'Folder zapisuje wolno – start czeka, aż przyjmie ustawienia budżetu; salda otwarcia, plan i kontenery zapiszą się zaraz po nich.'

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

/** What the last steps give „Uruchom budżet”: the first month's salary and envelopes, the split of the money at the start. */
interface StartInput {
  salary: number
  hull: number
  goals: Record<string, number>
  tanks?: Record<string, number>
  envelopes: Record<string, number>
}

/**
 * Start the budget: the opening balances at the start of today (the balance now without today's operations), the
 * settings (the ship, the layers, the orders, the start and its split), this month's plan, the chosen containers, the
 * shortcut and the start with Windows (D64: the wizard asks about it).
 *
 * fi.json first (AF-14, KR.29 – T446, przegląd 3 N5): what waited from before is written first (a folder that refuses it
 * refuses the start – nothing of it written), then fi.json with `budget.start` – the mark of a running budget – and the
 * folder's answer awaited (a slow folder: said, and awaited on – `writeStart`). Refused: nothing of the start is in the
 * folder nor in the window, nothing to take back; the answers stay, the next „Uruchom budżet” starts afresh. Taken: the
 * window gets the start together with its records – the openings, the month's plan, the chosen containers with their
 * payments linked (T379) – written as every change (a write refused is said below and retried by itself); until they are
 * on the disk no background write starts (the game, ICTTJ's goals, the settlements' start).
 */
export async function finishWizard(o: StartInput): Promise<boolean> {
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
  // A chosen proposal becomes a container – its id known before fi.json, which keeps its tank (N-PC-7). One of its payee
  // there already (made in Ładownia meanwhile) is that one – never a second.
  const containers = listOf(s.records.containers)
  const made = new Map(Object.values(w.cargo).map((p) => [p.key, containers.find((c) => !c.archived && counterpartyKey(c.counterparty) === p.key)?.id ?? newId()]))
  const tanks: Record<string, number> = {}
  for (const [k, v] of Object.entries(o.tanks ?? {})) if (v > 0 && s.records.containers[k]) tanks[k] = v
  for (const [key, id] of made) if ((o.tanks?.[key] ?? 0) > 0) tanks[id] = o.tanks![key]!
  // 2. fi.json with the start; 3. once the folder took it – the start's records, with it in the window.
  const refused = await writeStart(
    (f) => startSettings(f, w, o, today, tanks),
    () => startRecords(w, o, today, month, made),
    START_WRITE_MS,
    () => toast(SLOW_START_TEXT, 'info', 12_000)
  )
  if (refused) return notStarted(`nie udało się zapisać ustawień w folderze (${refused}). Nic ze startu nie trafiło do folderu – odpowiedzi kreatora zostają, ponowne „Uruchom budżet” zacznie od nowa.`)
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

/** fi.json of the running budget: the ship, the layers' targets, the orders, the start and its split. */
function startSettings(f: SettingsFile, w: WizardState, o: StartInput, today: string, tanks: Record<string, number>): SettingsFile {
  return {
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
          ...(Object.keys(tanks).length ? { tanks: { ...tanks } } : {})
        }
      }
    }
  }
}

/**
 * The start's records, once fi.json is on the disk (T446): the openings at the start of today (an opening typed before the
 * wizard changes), this month's plan, the chosen containers with their payments linked from the month before the start
 * (T379 – the cargo, not an envelope; a fee paid early for this month's due is paid).
 */
function startRecords(w: WizardState, o: StartInput, today: string, month: string, made: ReadonlyMap<string, string>): void {
  const txs = listOf(useData.getState().records.transactions)
  for (const [accountId, now] of Object.entries(w.balances)) if (now != null) setOpening(accountId, openingFromNow(accountId, now, today, txs), today)
  editPlan(month, (p) => ({ ...p, salary: o.salary, envelopes: { ...o.envelopes } }))
  for (const p of Object.values(w.cargo)) {
    const id = made.get(p.key)!
    const there = useData.getState().records.containers[id]?.record
    if (there) linkPayments(there.id, there.counterparty, true)
    else addContainer(draftFromPayment(p), id)
  }
}
