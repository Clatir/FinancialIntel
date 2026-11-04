import { create } from 'zustand'
import { warsawNow } from '@shared/calc/dates'
import { draftFromPayment } from '../cargo/actions'
import { addContainer } from '../cargo/actions'
import { openingFromNow } from '@shared/calc/start'
import { openingOf } from '@shared/calc/balances'
import type { RecurringPayment } from '@shared/calc/plan'
import type { Orders } from '@shared/schema'
import { DEFAULT_QUICK_SHORTCUT } from '@shared/machine'
import { api } from '../../lib/api'
import { unsavedNote, updateSettings, useData } from '../../store/data'
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
  autostart: true
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

export function cancelWizard(): void {
  useWizard.setState(initial())
  dropDraft(shownDir())
  navigate({ page: 'bridge' })
}

/**
 * Start the budget: the opening balances at the start of today (the balance now without today's operations), the
 * settings (the ship, the layers, the orders, the start and its split), this month's plan, the chosen containers, the
 * shortcut and the start with Windows (D64: the wizard asks about it).
 */
export async function finishWizard(o: { salary: number; hull: number; goals: Record<string, number>; tanks?: Record<string, number>; envelopes: Record<string, number> }): Promise<boolean> {
  const s = useData.getState()
  if (!s.fi || s.status?.readOnly || s.switching) {
    toast('Folder jest tylko do odczytu – budżetu nie można uruchomić.', 'error')
    return false
  }
  const w = useWizard.getState()
  const { date: today, month } = warsawNow()
  const txs = Object.values(s.records.transactions).map((e) => e.record)
  const balances = Object.values(s.records.balances).map((e) => e.record)
  // The cash (D83) has no history of the bank: empty = 0 zł.
  const missing = s.fi.settings.accounts.filter((a) => !a.archived && a.kind !== 'cash' && w.balances[a.id] == null && !openingOf(a.id, balances))
  if (missing.length) {
    toast(`Wpisz saldo teraz (krok 1): ${missing.map((a) => a.name).join(', ')} – 0, jeśli konto jest puste.`, 'error', 6000)
    useWizard.setState({ step: 0 })
    return false
  }
  for (const [accountId, now] of Object.entries(w.balances)) if (now != null) setOpening(accountId, openingFromNow(accountId, now, today, txs), today)
  const initialTanks: Record<string, number> = {}
  for (const [k, v] of Object.entries(o.tanks ?? {})) if (v > 0 && s.records.containers[k]) initialTanks[k] = v
  updateSettings((f) => ({
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
  editPlan(month, (p) => ({ ...p, salary: o.salary, envelopes: { ...o.envelopes } }))
  // After the start: a container links this month's payments of its counterparty (the cargo, not an envelope).
  let addedProposalTanks = false
  for (const p of Object.values(w.cargo)) {
    const id = addContainer(draftFromPayment(p))
    const tank = o.tanks?.[p.key] ?? 0
    if (id && tank > 0) {
      initialTanks[id] = tank
      addedProposalTanks = true
    }
  }
  if (addedProposalTanks) {
    updateSettings((f) => ({
      ...f,
      settings: {
        ...f.settings,
        budget: { ...f.settings.budget, initial: f.settings.budget.initial ? { ...f.settings.budget.initial, tanks: { ...initialTanks } } : null }
      }
    }))
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
