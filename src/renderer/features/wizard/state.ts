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
import { flushSaves, updateSettings, useData } from '../../store/data'
import { setMachinePrefs } from '../../store/machine'
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
  shipName: '',
  orders: null,
  shortcut: DEFAULT_QUICK_SHORTCUT,
  autostart: true
})

export const useWizard = create<WizardState>(() => initial())

export function startWizard(): void {
  const fi = useData.getState().fi
  // A running budget is never restarted from here: the start would reset the layers' history.
  if (fi?.settings.budget.start) {
    useWizard.setState(initial())
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
    orders: fi?.settings.orders ?? null
  })
  navigate({ page: 'wizard' })
}

export const patchWizard = (p: Partial<WizardState>) => useWizard.setState(p)

export function cancelWizard(): void {
  useWizard.setState(initial())
  navigate({ page: 'bridge' })
}

/**
 * Start the budget: the opening balances at the start of today (the balance now without today's operations), the
 * settings (the ship, the layers, the orders, the start and its split), this month's plan, the chosen containers, the
 * shortcut and the start with Windows (D64: the wizard turns it on).
 */
export async function finishWizard(o: { salary: number; hull: number; goals: Record<string, number>; envelopes: Record<string, number> }): Promise<boolean> {
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
  updateSettings((f) => ({
    ...f,
    settings: {
      ...f.settings,
      shipName: w.shipName.trim() || f.settings.shipName,
      layers: { ...f.settings.layers, shieldSalaries: w.shieldSalaries, hullMonths: w.hullMonths, assumedCosts: w.assumedCosts },
      orders: w.orders ?? f.settings.orders,
      budget: { start: today, initial: { shields: 0, hull: o.hull, goals: Object.fromEntries(Object.entries(o.goals).filter(([, v]) => v > 0)) } }
    }
  }))
  editPlan(month, (p) => ({ ...p, salary: o.salary, envelopes: { ...o.envelopes } }))
  // After the start: a container links this month's payments of its counterparty (the cargo, not an envelope).
  for (const p of Object.values(w.cargo)) addContainer(draftFromPayment(p))
  await setMachinePrefs({ quickShortcut: w.shortcut })
  try {
    await api.setTrayPrefs({ launchAtLogin: w.autostart, closeToTray: true })
  } catch {
    /* the tray settings stay as they were */
  }
  const saved = await flushSaves()
  useWizard.setState(initial())
  navigate({ page: 'bridge' })
  playSound('docking')
  toast(saved ? 'Okręt wypłynął: budżet działa od dziś.' : 'Budżet uruchomiony – część zmian zapisze się za chwilę.', saved ? 'success' : 'info', 5000)
  return true
}
