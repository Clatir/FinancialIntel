/**
 * The layers' engine (T4): the state of the ship computed from the records, deterministically, never stored – every
 * computer sees the same. Rules: docs/specyfikacja.md, „Pieniądze: konta, warstwy i przepływy” and „Plan miesiąca i
 * dzienny przydział”.
 *
 * Every złoty on the budget's accounts belongs to exactly one layer, so the layers always sum to the balances:
 * - shields (osłony) – the buffer; every delivery fills them first, the salary is paid from them on the 1st; above
 *   their target = „wolne do decyzji”;
 * - hull (kadłub) – the emergency fund; goals – savings by priority;
 * - energy – this month's salary (envelopes, cargo, tanks); what is left at the month's end is the loot (D18);
 * - tanks (odkładki) – periodic fees filled monthly from the energy;
 * - tax hold – the ICTTJ pool „Podatek”, outside the budget until PIT-38 is paid;
 * - deposit – the household members' advances (D80): their money on my accounts, never mine to spend.
 * Receivables (what household members owe – `calc/household.ts` – and the loans given) are not money on the accounts:
 * they are counted beside.
 *
 * The layers start on the budget's first day (`settings.budget.start`, else the earliest opening balance) with the
 * money on the accounts then; the history before serves the statistics only (average costs and income).
 */
import type { Settings } from '../schema/settings'
import { envelopeKind, type EnvelopeKind, type MemberOpening } from '../schema/budget'
import type { Balance, Container, Docking, Goal, Loan, MonthPlan, Transaction, TxKind } from '../schema/records'
import { addDays, addMonths, dayOfMonth, daysInMonth, firstDayOf, monthOf, monthRange, monthsBetween, warsawEndOf, warsawNow, warsawStamp, warsawStartOf } from './dates'
import { openingsOf } from './balances'
import { balanceOf, heldOf, settleHousehold, type HouseholdLedger, type MemberBalance, type MemberFlow } from './household'
import { incomeByMonth, incomeStats, taxOfDockings, type IncomeContext, type IncomeStats } from './income'
import { goalAt, goalDecided, goalTakes } from './goals'
import { debtOf, loanStates, type LoanState } from './loans'
import { categoryIndex, costOf, partsOf, splitEvenly, sum } from './operations'

// ------------------------------------------------------------------ the rules as small pure functions

export interface DockTargets {
  /** null = unknown (no salary yet): everything stays in the shields. */
  shields: number | null
  /** null = unknown (no costs yet): nothing goes on past the shields. */
  hull: number | null
}

export interface DockLayers {
  shields: number
  hull: number
  goals: ReadonlyArray<{ id: string; amount: number; target: number }>
}

export interface DockSplit {
  shields: number
  hull: number
  goals: Record<string, number>
  /** Part of `shields` above their target: „wolne do decyzji”. */
  free: number
}

/**
 * The docking order (D13): shields to their target, hull to its target, goals by priority (`goals` in that order),
 * the rest stays in the shields as „wolne do decyzji”.
 */
export function dockAmount(amount: number, layers: DockLayers, targets: DockTargets): DockSplit {
  let rest = Math.max(0, amount)
  const toShields = targets.shields == null ? rest : Math.min(rest, Math.max(0, targets.shields - layers.shields))
  rest -= toShields
  let hull = 0
  const goals: Record<string, number> = {}
  if (targets.shields != null && targets.hull != null) {
    hull = Math.min(rest, Math.max(0, targets.hull - layers.hull))
    rest -= hull
    for (const g of layers.goals) {
      const take = Math.min(rest, Math.max(0, g.target - g.amount))
      if (take > 0) goals[g.id] = take
      rest -= take
    }
  }
  return { shields: toShields + rest, hull, goals, free: rest }
}

export interface SalaryPayment {
  fromShields: number
  fromHull: number
  paid: number
  /** 'yellow' = part from the hull (D14), 'red' = not enough in the hull either (a partial salary). */
  alarm: 'yellow' | 'red' | null
}

/** The salary on the 1st (D11, D14): from the shields, what is missing from the hull. */
export function paySalary(salary: number, shields: number, hull: number): SalaryPayment {
  const fromShields = Math.min(salary, Math.max(0, shields))
  const fromHull = Math.min(salary - fromShields, Math.max(0, hull))
  const paid = fromShields + fromHull
  return { fromShields, fromHull, paid, alarm: paid < salary ? 'red' : fromHull > 0 ? 'yellow' : null }
}

/** The tank's plan for one cycle of a periodic fee: 1 240 zł a year = 11 × 103,33 zł + 103,37 zł. */
export function sinkingSchedule(amount: number, cycleMonths: number): number[] {
  return splitEvenly(amount, cycleMonths)
}

/** Position of `month` in a container's cycle: 0 = the first month after a payment, cycleMonths − 1 = the payment's month. */
export function cyclePosition(container: Pick<Container, 'cycleMonths' | 'dueMonth'>, month: string): { index: number; dueMonth: string } {
  const n = container.cycleMonths
  const r = ((monthsBetween(container.dueMonth, month) % n) + n) % n
  const dueMonth = addMonths(month, (n - r) % n)
  return { index: n - 1 - monthsBetween(month, dueMonth), dueMonth }
}

/**
 * This month's contribution to a tank: the plan's installment plus an even share of what the tank lacks against
 * the plan (a fee added late, a smaller salary) – or minus an even share of a surplus. Never negative.
 */
export function sinkingInstallment(container: Pick<Container, 'amount' | 'cycleMonths' | 'dueMonth'>, month: string, tank: number): number {
  const n = container.cycleMonths
  const plan = sinkingSchedule(container.amount, n)
  const { index } = cyclePosition(container, month)
  const expected = sum(plan.slice(0, index))
  const left = n - index
  const deficit = expected - tank
  const share = left > 1 ? Math.trunc(deficit / left) : deficit
  return Math.max(0, (plan[index] ?? 0) + share)
}

export interface DailyAllowance {
  /** „Podstawowy przydział”: the daily envelopes over the days of the month. */
  base: number
  /** Today's energy: what is left of the daily envelopes over the days left, today included (never below 0). */
  allowance: number
  /** Today's energy after today's spending (below 0 = over). */
  left: number
  daysLeft: number
}

/** Today's energy (spec, „Dzienny przydział”): unspent energy carries to the next days, an overspent day lowers them. */
export function dailyAllowance(o: { limit: number; spentBefore: number; spentToday: number; day: number; daysInMonth: number }): DailyAllowance {
  const daysLeft = Math.max(1, o.daysInMonth - o.day + 1)
  const allowance = Math.max(0, Math.floor((o.limit - o.spentBefore) / daysLeft))
  return { base: Math.floor(o.limit / o.daysInMonth), allowance, left: allowance - o.spentToday, daysLeft }
}

/**
 * Range (zasięg): how many months the shields and the hull last at the average net costs. A taken loan's debt still to
 * pay comes off first (D72: the shields less the debt); more debt than money = 0.
 */
export function rangeMonths(shields: number, hull: number, monthlyCosts: number | null, debt = 0): number | null {
  if (monthlyCosts == null || monthlyCosts <= 0) return null
  return Math.max(0, shields + hull - debt) / monthlyCosts
}

export const SHIP_CLASSES = ['scout', 'corvette', 'frigate', 'destroyer', 'cruiser', 'flagship'] as const
export type ShipClass = (typeof SHIP_CLASSES)[number]
export const SHIP_CLASS_LABEL: Record<ShipClass, string> = {
  scout: 'Zwiadowca',
  corvette: 'Korweta',
  frigate: 'Fregata',
  destroyer: 'Niszczyciel',
  cruiser: 'Krążownik',
  flagship: 'Flagowiec'
}

/** The range (months) each class starts at (T10): < 1, 1–3, 3–6, 6–9, 9–12, ≥ 12 months. */
export const CLASS_FROM: Record<ShipClass, number> = { scout: 0, corvette: 1, frigate: 3, destroyer: 6, cruiser: 9, flagship: 12 }

/** The ship's class by its range (T10). */
export function shipClass(range: number): ShipClass {
  let out: ShipClass = 'scout'
  for (const c of SHIP_CLASSES) if (range >= CLASS_FROM[c]) out = c
  return out
}

/** The next payment of a container on or after `today`. */
export function nextPaymentOf(c: Pick<Container, 'cycleMonths' | 'dueMonth' | 'dueDay'>, today: string): string {
  const at = (month: string) => `${month}-${String(Math.min(c.dueDay, daysInMonth(month))).padStart(2, '0')}`
  const due = cyclePosition(c, today.slice(0, 7)).dueMonth
  const date = at(due)
  if (date >= today) return date
  // This cycle's payment day has passed (earlier this month): the next cycle.
  return at(cyclePosition(c, addMonths(due, 1)).dueMonth)
}

/** The next payment still to make (B55): when this cycle's (`paidDue` – its due month) is paid already, the one after it. */
export function nextUnpaidOf(c: Pick<Container, 'cycleMonths' | 'dueMonth' | 'dueDay'>, today: string, paidDue: string | null | undefined): string {
  const date = nextPaymentOf(c, today)
  return paidDue && date.slice(0, 7) === paidDue ? nextPaymentOf(c, addDays(date, 1)) : date
}

/**
 * The cycle (its due month) a payment of a periodic fee in `month` closes (B55): the due month's, or – a cycle of 3
 * months or more – the next due month's when paid the month before it (early: the 1st on a Monday); null = paid late.
 */
export function paidCycleOf(c: Pick<Container, 'cycleMonths' | 'dueMonth'>, month: string): string | null {
  const due = cyclePosition(c, month).dueMonth
  return due === month || (c.cycleMonths >= 3 && addMonths(month, 1) === due) ? due : null
}

/** The month a container archived from 1.4.2 counts until (its end); null = archived before (never counts), or not archived. */
const archivedMonth = (c: { archived: boolean; archivedAt?: string | null }): string | null => (c.archived && c.archivedAt ? warsawNow(c.archivedAt).month : null)

/**
 * A container counts in this month: between its `from` and `until`, not archived – archived from 1.4.2 (`archivedAt`),
 * it still counts until that month's end (B56: archiving does not rewrite the months before).
 */
export const activeIn = (c: Pick<Container, 'archived' | 'from' | 'until'> & { archivedAt?: string | null }, month: string): boolean =>
  (!c.archived || (archivedMonth(c) ?? '') >= month) && (c.from == null || c.from <= month) && (c.until == null || month <= c.until)

/** The container's life is over by `month` (its `until` or its archiving before it): its tank has nothing to wait for. */
const lifeOver = (c: Pick<Container, 'archived' | 'until'> & { archivedAt?: string | null }, month: string): boolean =>
  (c.until != null && c.until < month) || (c.archived && (archivedMonth(c) ?? '') < month)

/** The cargo's mass: fixed costs a month (periodic fees by their monthly share) as a % of the salary; the load line 40%. */
export function cargoMass(containers: readonly Container[], month: string, salary: number | null, limitPct: number): FleetState['cargo'] {
  const monthly = sum(containers.filter((c) => activeIn(c, month)).map((c) => Math.round(c.amount / c.cycleMonths)))
  const pct = salary && salary > 0 ? (monthly / salary) * 100 : null
  return { monthly, pct, limitPct, over: pct != null && pct > limitPct }
}

/**
 * The docking of each operation: two computers docking one delivery before OneDrive brought the other's file give two
 * records – the earlier (by its creation, then id) counts, the same in the engine and in the docking window.
 */
export function dockingsByTx(dockings: readonly Docking[]): Map<string, Docking> {
  const out = new Map<string, Docking>()
  for (const d of [...dockings].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))) if (!out.has(d.transactionId)) out.set(d.transactionId, d)
  return out
}

/**
 * The budget's first day: the start wizard's (`settings.budget.start`), else the earliest opening balance – each
 * account's latest one up to `today` (none = all).
 */
export function budgetStartOf(settings: Pick<Settings, 'budget'>, balances: readonly Balance[] = [], today?: string): string | null {
  if (settings.budget.start) return settings.budget.start
  return [...openingsOf(balances, today).values()].map((o) => o.date).sort()[0] ?? null
}

/**
 * The settlements with the household start (D81): on the day chosen (`settings.household.since`), not before the
 * budget's start; none chosen = the budget's start (as 1.3.0).
 */
export function settleFromOf(settings: Pick<Settings, 'household'>, budgetStart: string | null): string | null {
  const since = settings.household.since
  if (!since) return budgetStart
  return budgetStart && since < budgetStart ? budgetStart : since
}

/**
 * The ledger's options as the engine settles the household (D80, D81): from the settlements' start with the members'
 * opening balances, each account's operations from its opening.
 */
const ledgerOptions = (settings: Pick<Settings, 'household'>, budgetStart: string | null, openings: ReadonlyMap<string, Balance>, until: string) => ({
  until,
  from: settleFromOf(settings, budgetStart),
  reset: budgetStart,
  openings: new Map([...openings].map(([id, o]) => [id, o.date])),
  members: settings.household.members
})

/**
 * The household's ledger as the engine keeps it on `today` (D80), up to `until` (default `today`): the same balances
 * and flows as `FleetState.household` – for what has no fleet at hand (the game's missions).
 */
export function householdOf(input: Pick<FleetInput, 'settings' | 'balances' | 'transactions'>, today: string, until: string = today): HouseholdLedger {
  const balances = input.balances ?? []
  return settleHousehold(input.transactions, ledgerOptions(input.settings, budgetStartOf(input.settings, balances, today), openingsOf(balances, today), until))
}

/**
 * The members' opening balances for another settlements' start (B3, D81): each one's balance on the day before it as
 * the ledger counts it now – a later start takes in the operations between the two, an earlier one gives them back and
 * keeps what was typed beyond them (a debt from before the budget); from the budget's start nothing before it counts
 * (1.3.0). null = the same start (nothing to change).
 */
export function rebaseOpenings(input: Pick<FleetInput, 'settings' | 'balances' | 'transactions'>, today: string, since: string | null): Map<string, MemberOpening> | null {
  const { settings } = input
  const budgetStart = budgetStartOf(settings, input.balances ?? [], today)
  const from = settleFromOf(settings, budgetStart)
  const next = settleFromOf({ household: { ...settings.household, since } }, budgetStart)
  if (!from || !next || from === next) return null
  const net = (b: { owed: number; deposit: number }) => b.deposit - b.owed
  const value = new Map<string, number>()
  if (next > from) {
    const then = householdOf(input, today, addDays(next, -1))
    for (const m of settings.household.members) value.set(m.id, net(balanceOf(then, m.id)))
  } else {
    // The balances as 1.3.0 counted them (from the budget's start, no openings) – the old opening's typed part on top.
    const members = settings.household.members.map((m) => ({ ...m, opening: { owed: 0, deposit: 0 } }))
    const plain = { ...input, settings: { ...settings, household: { ...settings.household, since: null, members } } }
    const atNext = householdOf(plain, today, addDays(next, -1))
    const atFrom = householdOf(plain, today, addDays(from, -1))
    for (const m of settings.household.members) value.set(m.id, net(balanceOf(atNext, m.id)) + net(m.opening) - net(balanceOf(atFrom, m.id)))
  }
  return new Map([...value].map(([id, v]) => [id, v >= 0 ? { owed: 0, deposit: v } : { owed: -v, deposit: 0 }]))
}

// ------------------------------------------------------------------ the whole state

export interface FleetInput {
  settings: Pick<Settings, 'accounts' | 'categories' | 'layers' | 'orders' | 'budget' | 'household'>
  transactions: readonly Transaction[]
  containers?: readonly Container[]
  goals?: readonly Goal[]
  months?: readonly MonthPlan[]
  dockings?: readonly Docking[]
  loans?: readonly Loan[]
  balances?: readonly Balance[]
  /** The moment of the state; the budget's day is its Warsaw date. */
  now: Date | string
}

export type AlarmKind =
  | 'salary-from-hull'
  | 'salary-partial'
  | 'energy-exhausted'
  | 'firewall'
  | 'sinking-short'
  | 'deficit'
  | 'shields-below-min'
  | 'correction'
  | 'daily-over'
  | 'envelope-over'
  | 'cargo-over'
  | 'salary-above-income'

export interface Alarm {
  kind: AlarmKind
  level: 'yellow' | 'red'
  date: string
  amount: number
  txId?: string
  /** A category, container or month the alarm is about. */
  ref?: string
}

/** Layer movements of one event (grosze, + = into the layer). */
export interface Moves {
  shields?: number
  hull?: number
  energy?: number
  taxHold?: number
  loot?: number
  /** What household members owe (+ lent, − paid back) – beside the money (D80). */
  house?: number
  /** The household members' advances (D80). */
  deposit?: number
  goals?: Record<string, number>
  tanks?: Record<string, number>
  loans?: Record<string, number>
}

export interface FleetEvent {
  date: string
  /** 'goal' = a goal's money moved out (to the shields or another goal – 1.4.2); 'tank' = a tank's rest back to the shields after its fee's life (1.4.2). */
  kind: 'start' | 'account' | 'household' | 'salary' | 'sinking' | 'month-end' | 'loot' | 'goal' | 'tank' | TxKind
  amount: number
  txId?: string
  /** 'loot': the month whose loot it splits (1.4.2, B10). */
  ref?: string
  moves: Moves
}

export interface EnvelopeState {
  categoryId: string
  kind: EnvelopeKind
  limit: number
  spent: number
  left: number
  /** Spent today (part of `spent`): the game sees the day an envelope went over (E7). */
  today: number
}

export interface FleetState {
  today: string
  month: string
  /** The layers run (a start day and money known). */
  started: boolean
  start: string | null
  accounts: Array<{ id: string; name: string; balance: number; opening: { date: string; amount: number } | null }>
  /** The money on the budget's accounts = the layers' sum. */
  total: number
  shields: { amount: number; target: number | null; free: number; min: number | null }
  hull: { amount: number; target: number | null }
  /** Every goal, archived too; `takes` = it takes money today (the loot's and an expense's choice – B13, N1). */
  goals: Array<{ id: string; name: string; amount: number; target: number; priority: number; takes: boolean }>
  energy: number
  /** The periodic fees' tanks: `dueMonth` = the next payment still to make; `paidDue` = this cycle's due month when paid already (B6, B55). */
  tanks: Array<{ containerId: string; name: string; amount: number; dueMonth: string; paidDue: string | null; due: number }>
  taxHold: number
  /** The household members' advances held on the accounts (D80): a layer, never the ship's money. */
  deposit: number
  loot: { month: string | null; amount: number }
  /**
   * Not money on the accounts, counted beside: what the household members owe (`house` all of them, `houseSince` the
   * oldest purchase still owed; `members` – each member's balance both ways, their advance too – D80) and the loans
   * given still open (by loan; an operation without its loan record by `-`).
   */
  receivables: { house: number; houseSince: string | null; members: MemberBalance[]; loans: Record<string, number>; total: number }
  /** The household's ledger (D80): each member's balance and each operation's flows – the editor's and the reports'. */
  household: HouseholdLedger
  /** The loans with their schedules and payments (`calc/loans.ts`, E6). */
  loans: LoanState[]
  /** What the taken loans still want back (E6): the range counts the shields less it (D72). */
  debt: number
  costs: { average: number | null; months: number; source: 'history' | 'assumed' | null }
  /** The average income of the last 6 full months (`calc/income.ts`): work and trading, as the panel „Przychody”. */
  income: { average: number | null; months: number }
  /** Income by month, averages of 3, 6 and 12 months and medians (D81). */
  incomeStats: IncomeStats
  /** What the statistics count as income (the reports read it too). */
  incomeContext: IncomeContext
  /** The settlements with the household start (D81): `settleFromOf`. */
  settleFrom: string | null
  range: number | null
  shipClass: ShipClass | null
  cargo: { monthly: number; pct: number | null; limitPct: number; over: boolean }
  /** The plan in force this month (its own or the last earlier one). */
  plan: { month: string; salary: number } | null
  /** This month's salary as paid. */
  salary: SalaryPayment | null
  envelopes: EnvelopeState[]
  daily: (DailyAllowance & { limit: number; spentBefore: number; spentToday: number }) | null
  alarms: Alarm[]
  log: FleetEvent[]
}

interface Ev {
  key: string
  run: () => void
}

/** Average of the last `count` full months before `month` (from the first fully covered month). */
function averageOf(byMonth: ReadonlyMap<string, number>, firstFull: string | null, month: string, count: number): { average: number | null; months: number } {
  if (!firstFull) return { average: null, months: 0 }
  const last = addMonths(month, -1)
  if (last < firstFull) return { average: null, months: 0 }
  const months = monthRange(firstFull, last).slice(-count)
  return { average: Math.round(sum(months.map((m) => byMonth.get(m) ?? 0)) / months.length), months: months.length }
}

export function computeFleet(input: FleetInput): FleetState {
  const { date: today, month } = warsawNow(input.now)
  const nowMs = typeof input.now === 'string' ? Date.parse(input.now) : input.now.getTime()
  const { settings } = input
  const cats = categoryIndex(settings.categories)
  const containers = input.containers ?? []
  const goalsAll = [...(input.goals ?? [])].sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  const plans = [...(input.months ?? [])].sort((a, b) => a.month.localeCompare(b.month))
  const dockingByTx = dockingsByTx(input.dockings ?? [])
  const loansById = new Map((input.loans ?? []).map((l) => [l.id, l]))
  const txs = input.transactions.filter((t) => t.date <= today)

  // ---------------------------------------------------------------- accounts and balances
  const openings = openingsOf(input.balances ?? [], today)
  const accountIds = [...new Set([...settings.accounts.map((a) => a.id), ...txs.map((t) => t.accountId), ...openings.keys()])]
  const counts = (t: Transaction) => {
    const o = openings.get(t.accountId)
    return !o || t.date >= o.date
  }
  const balanceAt = (accountId: string, beforeDate: string | null) => {
    const o = openings.get(accountId)
    return (o?.amount ?? 0) + sum(txs.filter((t) => t.accountId === accountId && counts(t) && (beforeDate == null || t.date < beforeDate)).map((t) => t.amount))
  }
  const accounts = accountIds.map((id) => {
    const o = openings.get(id)
    return { id, name: settings.accounts.find((a) => a.id === id)?.name ?? '(usunięte konto)', balance: balanceAt(id, null), opening: o ? { date: o.date, amount: o.amount } : null }
  })
  const total = sum(accounts.map((a) => a.balance))

  // ---------------------------------------------------------------- the household (D80)
  // Its balances from the budget's start, the operations the layers count (`counts`) – the same ledger for the screens
  // and the statistics.
  const budgetStart = budgetStartOf(settings, input.balances, today)
  const settleFrom = settleFromOf(settings, budgetStart)
  const household = settleHousehold(input.transactions, ledgerOptions(settings, budgetStart, openings, today))

  // ---------------------------------------------------------------- statistics from the whole history
  const dataDates = [...txs.map((t) => t.date), ...[...openings.values()].map((o) => o.date)].sort()
  const coverage = dataDates[0] ?? null
  const firstFull = coverage ? (coverage.endsWith('-01') ? monthOf(coverage) : addMonths(monthOf(coverage), 1)) : null
  const costsByMonth = new Map<string, number>()
  for (const t of txs) {
    const m = monthOf(t.date)
    const c = costOf(t)
    if (c) costsByMonth.set(m, (costsByMonth.get(m) ?? 0) + c)
  }
  // Income (D81): work and trading net, without the members' money and the pool „Podatek”.
  const incomeContext: IncomeContext = { ledger: household, since: settleFrom, members: settings.household.members, tax: taxOfDockings(dockingByTx, txs) }
  const incomeMonths = incomeByMonth(txs, incomeContext)
  const costsFor = (m: string): FleetState['costs'] => {
    const h = averageOf(costsByMonth, firstFull, m, 12)
    const assumed = settings.layers.assumedCosts
    if (h.months >= 3 || (assumed == null && h.average != null)) return { average: h.average, months: h.months, source: 'history' }
    if (assumed != null) return { average: assumed, months: h.months, source: 'assumed' }
    return { average: null, months: 0, source: null }
  }
  const costsCache = new Map<string, FleetState['costs']>()
  const costsAt = (m: string) => costsCache.get(m) ?? costsCache.set(m, costsFor(m)).get(m)!
  const planFor = (m: string): MonthPlan | null => {
    let found: MonthPlan | null = null
    for (const p of plans) if (p.month <= m) found = p
    return found
  }
  const salaryOf = (m: string) => planFor(m)?.salary ?? null
  const targetsAt = (date: string): DockTargets => {
    const m = monthOf(date)
    const salary = salaryOf(m)
    const costs = costsAt(m).average
    return {
      shields: salary != null && salary > 0 ? settings.layers.shieldSalaries * salary : null,
      hull: costs != null ? settings.layers.hullMonths * costs : null
    }
  }

  // ---------------------------------------------------------------- the layers
  const start = budgetStart
  const started = start != null && start <= today
  let shields = 0
  let hull = 0
  let energy = 0
  let taxHold = 0
  let loot = 0
  let lootMonth: string | null = null
  let deposit = 0
  const goalAmount = new Map<string, number>()
  const tanks = new Map<string, number>()
  const loanOpen = new Map<string, number>()
  // Repayments of the loans given (their records), from before the start too – the same count as `calc/loans.ts`.
  const givenBack = new Map<string, number>()
  for (const t of txs) if (t.kind === 'loan' && t.amount > 0 && t.loanId && start && t.date < start && loansById.get(t.loanId)?.direction === 'given') givenBack.set(t.loanId, (givenBack.get(t.loanId) ?? 0) + t.amount)
  const salaryOfMonth = new Map<string, SalaryPayment>()
  const dailyExtra = new Map<string, number>()
  const alarms: Alarm[] = []
  const log: FleetEvent[] = []

  // The goals as they were that day (C1): added by then, not archived then, by the priority and target then – a change
  // of the list never moves money docked before it.
  const activeGoals = (at: number) =>
    goalsAll
      .filter((g) => goalTakes(g, at))
      .map((g) => ({ g, at: goalAt(g, at) }))
      .sort((a, b) => a.at.priority - b.at.priority || a.g.createdAt.localeCompare(b.g.createdAt) || a.g.id.localeCompare(b.g.id))
      .map(({ g, at }) => ({ id: g.id, amount: goalAmount.get(g.id) ?? 0, target: at.target, ictj: g.source === 'ictj' }))
  const addGoal = (id: string, v: number, moves: Moves) => {
    goalAmount.set(id, (goalAmount.get(id) ?? 0) + v)
    moves.goals = { ...moves.goals, [id]: (moves.goals?.[id] ?? 0) + v }
  }
  const addShields = (v: number, moves: Moves) => {
    shields += v
    moves.shields = (moves.shields ?? 0) + v
  }
  /** Money out of the shields; what they lack comes from the hull, then the shields go below zero (a deficit). */
  const drawShields = (v: number, moves: Moves) => {
    const fromShields = Math.min(v, Math.max(0, shields))
    const fromHull = Math.min(v - fromShields, Math.max(0, hull))
    hull -= fromHull
    if (fromHull) moves.hull = (moves.hull ?? 0) - fromHull
    addShields(-(v - fromHull), moves)
  }
  /** A delivery docked by the order: shields, hull, the goals that take money at `at` (when it came in – `cameIn`). */
  const dock = (v: number, date: string, at: number, moves: Moves) => {
    const split = dockAmount(v, { shields, hull, goals: activeGoals(at) }, targetsAt(date))
    addShields(split.shields, moves)
    hull += split.hull
    if (split.hull) moves.hull = (moves.hull ?? 0) + split.hull
    for (const [id, g] of Object.entries(split.goals)) addGoal(id, g, moves)
  }
  /**
   * Straight into the goals (the ICTTJ pool „Cele”): the goals of the ICTTJ forecast first – the money was set aside
   * for them – then the own ones, each by the common priority list (D72); what they do not need stays in the shields.
   */
  const fillGoals = (v: number, at: number, moves: Moves) => {
    let rest = v
    const goals = activeGoals(at)
    for (const g of [...goals.filter((x) => x.ictj), ...goals.filter((x) => !x.ictj)]) {
      const take = Math.min(rest, Math.max(0, g.target - g.amount))
      if (take > 0) addGoal(g.id, take, moves)
      rest -= take
    }
    if (rest) addShields(rest, moves)
  }
  const knownGoal = (id: string) => goalsAll.some((g) => g.id === id)
  /**
   * When a delivery came in, for the goals it may fill (C1 – a goal's change counts from its moment on): its docking,
   * else when the operation came to FI (an import, a hand entry), never before its day – the goals then, as the
   * docking window shows them now.
   */
  const cameIn = (t: Transaction, d: Docking | undefined): number => Math.max(Date.parse(d?.updatedAt ?? t.createdAt), warsawStartOf(t.date).getTime())
  const applySplit = (v: number, split: NonNullable<Docking['split']>, moves: Moves) => {
    let rest = v
    if (split.hull) {
      hull += split.hull
      moves.hull = (moves.hull ?? 0) + split.hull
      rest -= split.hull
    }
    for (const [id, g] of Object.entries(split.goals)) {
      if (!g || !knownGoal(id)) continue
      addGoal(id, g, moves)
      rest -= g
    }
    if (split.taxHold) {
      taxHold += split.taxHold
      moves.taxHold = (moves.taxHold ?? 0) + split.taxHold
      rest -= split.taxHold
    }
    addShields(rest, moves)
  }
  const energyActive = (date: string) => salaryOfMonth.has(monthOf(date))
  const spendEnergy = (v: number, t: Transaction, moves: Moves) => {
    if (!energyActive(t.date)) return drawShields(v, moves)
    const fromEnergy = Math.min(v, Math.max(0, energy))
    energy -= fromEnergy
    if (fromEnergy) moves.energy = (moves.energy ?? 0) - fromEnergy
    if (v > fromEnergy) {
      drawShields(v - fromEnergy, moves)
      alarms.push({ kind: 'energy-exhausted', level: 'red', date: t.date, amount: v - fromEnergy, txId: t.id })
    }
  }
  const refundEnergy = (v: number, t: Transaction, moves: Moves) => {
    if (!energyActive(t.date)) return addShields(v, moves)
    energy += v
    moves.energy = (moves.energy ?? 0) + v
  }
  const record = (ev: FleetEvent) => {
    if (Object.keys(ev.moves).length) log.push(ev)
  }
  /**
   * The household's share of an operation (D80, `calc/household.ts`): a financed purchase takes the member's advance,
   * the rest the shields lend; their money repays the loan (back to the shields) and the rest is their advance.
   */
  const settle = (flows: readonly MemberFlow[] | undefined, moves: Moves) => {
    for (const f of flows ?? []) {
      if (f.fromDeposit) {
        deposit -= f.fromDeposit
        moves.deposit = (moves.deposit ?? 0) - f.fromDeposit
      }
      if (f.lent) {
        drawShields(f.lent, moves)
        moves.house = (moves.house ?? 0) + f.lent
      }
      if (f.repaid) {
        addShields(f.repaid, moves)
        moves.house = (moves.house ?? 0) - f.repaid
      }
      if (f.advance) {
        deposit += f.advance
        moves.deposit = (moves.deposit ?? 0) + f.advance
      }
    }
  }

  // The budget's first month started before the budget did: what it spent until the start came out of that month's
  // salary already (T45), the start pays only the rest.
  // A periodic fee is its tank's, never the salary's.
  const periodicIds = new Set(containers.filter((c) => c.cycleMonths > 1).map((c) => c.id))
  /** The cycles (due months) of each periodic fee paid already (B55). */
  const paidCycles = new Map<string, Set<string>>()
  const startMonthSpent = start ? sum(txs.filter((t) => monthOf(t.date) === monthOf(start) && t.date < start && !(t.containerId && periodicIds.has(t.containerId))).map(costOf)) : 0
  const payMonth = (m: string, date: string) => {
    // A periodic fee's life over (its `until`, its archiving): what its tank still holds goes back to the shields (B56).
    for (const c of containers) {
      const tank = tanks.get(c.id) ?? 0
      if (c.cycleMonths <= 1 || !tank || !lifeOver(c, m)) continue
      tanks.set(c.id, 0)
      shields += tank
      record({ date, kind: 'tank', amount: tank, moves: { tanks: { [c.id]: -tank }, shields: tank } })
    }
    const salary = salaryOf(m)
    if (salary != null && salary > 0) {
      const due = start && m === monthOf(start) ? Math.max(0, salary - startMonthSpent) : salary
      const pay = paySalary(due, shields, hull)
      shields -= pay.fromShields
      hull -= pay.fromHull
      energy += pay.paid
      salaryOfMonth.set(m, pay)
      record({ date, kind: 'salary', amount: pay.paid, moves: { shields: -pay.fromShields, ...(pay.fromHull ? { hull: -pay.fromHull } : {}), energy: pay.paid } })
      if (pay.alarm === 'yellow') alarms.push({ kind: 'salary-from-hull', level: 'yellow', date, amount: pay.fromHull, ref: m })
      if (pay.alarm === 'red') alarms.push({ kind: 'salary-partial', level: 'red', date, amount: due - pay.paid, ref: m })
    }
    if (!salaryOfMonth.has(m)) return
    // The tanks of the periodic fees, from this month's energy.
    for (const c of containers) {
      if (c.cycleMonths <= 1 || !activeIn(c, m)) continue
      // This cycle paid already (early, B55): nothing more to collect for it.
      if (paidCycles.get(c.id)?.has(cyclePosition(c, m).dueMonth)) continue
      const tank = tanks.get(c.id) ?? 0
      const want = sinkingInstallment(c, m, tank)
      const take = Math.min(want, Math.max(0, energy))
      if (!take) continue
      energy -= take
      tanks.set(c.id, tank + take)
      record({ date, kind: 'sinking', amount: take, moves: { energy: -take, tanks: { [c.id]: take } } })
    }
  }

  const runTx = (t: Transaction) => {
    const moves: Moves = {}
    const amt = t.amount
    switch (t.kind) {
      case 'expense': {
        const container = t.containerId ? containers.find((c) => c.id === t.containerId) : undefined
        // Its tank pays only during the fee's life: a payment before it (the history linked to a fee added later – B56)
        // or after it is an ordinary expense.
        const periodic = container && container.cycleMonths > 1 && activeIn(container, monthOf(t.date)) ? container : undefined
        const goal = t.goalId && knownGoal(t.goalId) ? t.goalId : null
        for (const p of partsOf(t)) {
          // A household member's part: the ledger's (below).
          if (p.refundable) continue
          if (goal) {
            if (p.amount < 0) {
              const have = goalAmount.get(goal) ?? 0
              const fromGoal = Math.min(-p.amount, Math.max(0, have))
              if (fromGoal) addGoal(goal, -fromGoal, moves)
              if (-p.amount > fromGoal) drawShields(-p.amount - fromGoal, moves)
            } else addGoal(goal, p.amount, moves)
          } else if (periodic) {
            if (p.amount < 0) {
              const cycle = paidCycleOf(periodic, monthOf(t.date))
              if (cycle) paidCycles.set(periodic.id, (paidCycles.get(periodic.id) ?? new Set()).add(cycle))
              const tank = tanks.get(periodic.id) ?? 0
              const fromTank = Math.min(-p.amount, Math.max(0, tank))
              tanks.set(periodic.id, tank - fromTank)
              if (fromTank) moves.tanks = { ...moves.tanks, [periodic.id]: -fromTank }
              if (-p.amount > fromTank) {
                spendEnergy(-p.amount - fromTank, t, moves)
                alarms.push({ kind: 'sinking-short', level: 'yellow', date: t.date, amount: -p.amount - fromTank, txId: t.id, ref: periodic.id })
              }
            } else {
              tanks.set(periodic.id, (tanks.get(periodic.id) ?? 0) + p.amount)
              moves.tanks = { ...moves.tanks, [periodic.id]: p.amount }
            }
          } else if (p.amount < 0) spendEnergy(-p.amount, t, moves)
          else refundEnergy(p.amount, t, moves)
        }
        settle(household.byTx.get(t.id), moves)
        break
      }
      case 'income': {
        if (amt < 0) {
          drawShields(-amt, moves)
          break
        }
        // A household member's money (D80, D81 – by parts): it repays what they owe (back to the shields), then it is
        // their advance or income – only income docks (a part of no member too).
        const flows = household.byTx.get(t.id)
        settle(flows, moves)
        const rest = amt - heldOf(flows)
        const d = dockingByTx.get(t.id)
        if (!rest) break
        if (d?.split) applySplit(rest, d.split, moves)
        else dock(rest, t.date, cameIn(t, d), moves)
        break
      }
      case 'trading': {
        if (amt > 0) {
          // A withdrawal from the trading account (D55): the pool decides – Cele → goals, Podatek → outside the budget.
          const d = dockingByTx.get(t.id)
          if (d?.split) applySplit(amt, d.split, moves)
          else if (d?.pool === 'goals') fillGoals(amt, cameIn(t, d), moves)
          else if (d?.pool === 'tax') {
            taxHold += amt
            moves.taxHold = amt
          } else dock(amt, t.date, cameIn(t, d), moves)
        } else if (amt < 0) {
          // The tax money going back to the trading capital (an ICTTJ return of the pool „Podatek”): out of the tax
          // hold, not the budget's money – no firewall.
          const d = dockingByTx.get(t.id)
          if (d?.pool === 'tax') {
            const fromHold = Math.min(-amt, Math.max(0, taxHold))
            taxHold -= fromHold
            if (fromHold) moves.taxHold = -fromHold
            if (-amt > fromHold) drawShields(-amt - fromHold, moves)
            break
          }
          // A top-up of the trading account: only from „wolne do decyzji” with full shields and hull (D23, firewall).
          const tg = targetsAt(t.date)
          const allowed = tg.shields != null && tg.hull != null && shields + amt >= tg.shields && hull >= tg.hull
          if (!allowed && settings.orders.firewall) alarms.push({ kind: 'firewall', level: 'red', date: t.date, amount: -amt, txId: t.id })
          drawShields(-amt, moves)
        }
        break
      }
      case 'tax': {
        if (amt < 0) {
          const fromHold = Math.min(-amt, Math.max(0, taxHold))
          taxHold -= fromHold
          if (fromHold) moves.taxHold = -fromHold
          if (-amt > fromHold) drawShields(-amt - fromHold, moves)
        } else addShields(amt, moves)
        break
      }
      case 'loan': {
        const loan = t.loanId ? loansById.get(t.loanId) : undefined
        const key = t.loanId ?? '-'
        if (loan?.direction === 'taken') {
          if (amt < 0) drawShields(-amt, moves)
          else addShields(amt, moves)
          break
        }
        if (amt < 0) {
          drawShields(-amt, moves)
          loanOpen.set(key, (loanOpen.get(key) ?? 0) - amt)
          moves.loans = { [key]: -amt }
        } else {
          // A repayment comes back to the shields up to what is owed: a loan record knows its amount (lent before the
          // start or without its operation too), else what its operations lent; more than that (interest) is income.
          const owed = loan ? Math.max(0, loan.amount - (givenBack.get(loan.id) ?? 0)) : (loanOpen.get(key) ?? 0)
          const back = Math.min(amt, owed)
          if (loan) givenBack.set(loan.id, (givenBack.get(loan.id) ?? 0) + back)
          loanOpen.set(key, (loanOpen.get(key) ?? 0) - back)
          if (back) {
            moves.loans = { [key]: -back }
            addShields(back, moves)
          }
          if (amt > back) dock(amt - back, t.date, cameIn(t, undefined), moves)
        }
        break
      }
      case 'transfer':
      case 'correction':
        addShields(amt, moves)
        break
    }
    record({ date: t.date, kind: t.kind, amount: amt, txId: t.id, moves })
  }

  if (started && start) {
    const events: Ev[] = []
    const at = (date: string, slot: number, rest = '') => `${date} ${slot} ${rest}`
    // The start: the money on the accounts then, split as the wizard said or by the docking order; this month's salary.
    events.push({
      key: at(start, 0, '0'),
      run: () => {
        const moves: Moves = {}
        const startTotal = sum(accountIds.filter((id) => (openings.get(id)?.date ?? start) <= start).map((id) => balanceAt(id, start)))
        const initial = settings.budget.initial
        if (initial) {
          hull += initial.hull
          if (initial.hull) moves.hull = initial.hull
          let rest = startTotal - initial.hull
          for (const [id, g] of Object.entries(initial.goals)) {
            if (!g || !knownGoal(id)) continue
            addGoal(id, g, moves)
            rest -= g
          }
          addShields(rest, moves)
        } else if (startTotal > 0) dock(startTotal, start, warsawEndOf(start).getTime(), moves)
        else addShields(startTotal, moves)
        record({ date: start, kind: 'start', amount: startTotal, moves })
        payMonth(monthOf(start), start)
      }
    })
    // Accounts that join the budget later: their opening balance comes into the shields that day.
    for (const [id, o] of openings) {
      if (o.date <= start) continue
      events.push({
        key: at(o.date, 1),
        run: () => {
          const moves: Moves = {}
          addShields(o.amount, moves)
          record({ date: o.date, kind: 'account', amount: o.amount, moves })
        }
      })
    }
    // The settlements with the household start (D81): the deposit is the members' opening advances from then on – what
    // was held for them before goes to the shields (or the shields hold the advances now).
    if (settleFrom && settleFrom >= start && settleFrom <= today)
      events.push({
        key: at(settleFrom, 1, 'h'),
        run: () => {
          const target = sum(settings.household.members.map((m) => m.opening?.deposit ?? 0))
          const delta = target - deposit
          if (!delta) return
          const moves: Moves = { deposit: delta }
          deposit = target
          if (delta > 0) drawShields(delta, moves)
          else addShields(-delta, moves)
          record({ date: settleFrom, kind: 'household', amount: delta, moves })
        }
      })
    // Month by month: the energy left becomes the loot, the salary, the tanks; the loot without a decision in 7 days → shields.
    for (const m of monthRange(addMonths(monthOf(start), 1), month)) {
      const prev = addMonths(m, -1)
      events.push({
        key: at(firstDayOf(m), 0, '1'),
        run: () => {
          if (lootMonth && loot) {
            shields += loot
            record({ date: firstDayOf(m), kind: 'loot', amount: loot, ref: lootMonth, moves: { loot: -loot, shields: loot } })
          }
          loot = Math.max(0, energy)
          lootMonth = prev
          if (energy) record({ date: firstDayOf(m), kind: 'month-end', amount: energy, moves: { energy: -energy, loot: energy } })
          shields += Math.min(0, energy)
          energy = 0
          payMonth(m, firstDayOf(m))
        }
      })
      const deadline = `${m}-08`
      if (deadline <= today)
        events.push({
          key: at(deadline, 2),
          run: () => {
            if (lootMonth !== prev || !loot) return
            shields += loot
            record({ date: deadline, kind: 'loot', amount: loot, ref: prev, moves: { loot: -loot, shields: loot } })
            loot = 0
            lootMonth = null
          }
        })
      const decision = plans.find((p) => p.month === prev)?.loot
      if (decision) {
        const stamp = warsawStamp(decision.decidedAt)
        const date = stamp.slice(0, 10)
        if (date >= firstDayOf(m) && date < deadline && date <= today)
          events.push({
            key: at(date, 3, stamp.slice(11)),
            run: () => {
              if (lootMonth !== prev || !loot) return
              const moves: Moves = { loot: -loot }
              let rest = loot
              for (const [id, g] of Object.entries(decision.goals)) {
                const take = Math.min(rest, g)
                const target = goalsAll.find((x) => x.id === id)
                // A goal archived by then takes nothing more (B13): its share stays in the shields.
                if (!take || !target || !goalDecided(target, Date.parse(decision.decidedAt))) continue
                addGoal(id, take, moves)
                rest -= take
              }
              const next = Math.min(rest, decision.nextMonth)
              if (next) {
                energy += next
                moves.energy = next
                dailyExtra.set(m, (dailyExtra.get(m) ?? 0) + next)
                rest -= next
              }
              if (rest) addShields(rest, moves)
              record({ date, kind: 'loot', amount: loot, ref: prev, moves })
              loot = 0
              lootMonth = null
            }
          })
      }
    }
    for (const t of txs) {
      if (t.date < start || !counts(t)) continue
      events.push({ key: at(t.date, 3, `${t.time ?? ''} ${t.createdAt} ${t.id}`), run: () => runTx(t) })
    }
    // A goal's money moved out (C2, B30) at the end of its day: what it held then (never more than it holds), to the
    // shields or another goal.
    for (const g of goalsAll)
      for (const [i, tr] of (g.transfers ?? []).entries()) {
        const date = warsawNow(tr.at).date
        if (date < start || date > today) continue
        events.push({
          key: at(date, 4, `${g.id} ${String(i).padStart(4, '0')}`),
          run: () => {
            const move = Math.min(tr.amount, goalAmount.get(g.id) ?? 0)
            if (move <= 0) return
            const moves: Moves = {}
            addGoal(g.id, -move, moves)
            if (tr.to !== g.id && knownGoal(tr.to)) addGoal(tr.to, move, moves)
            else addShields(move, moves)
            record({ date, kind: 'goal', amount: move, moves })
          }
        })
      }
    events.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    for (const e of events) e.run()
  }

  // ---------------------------------------------------------------- now
  const plan = planFor(month)
  const salary = plan?.salary ?? null
  const targets = targetsAt(today)
  const costs = costsAt(month)
  const incomeNow = incomeStats(incomeMonths, firstFull, month)
  const income = { average: incomeNow.windows[6].total, months: incomeNow.windows[6].months }
  // A loan taken is in the shields, but it is not the ship's money: the range counts the shields less the debt (D72).
  const loanList = loanStates(input.loans ?? [], txs, containers, today)
  const debt = debtOf(loanList)
  const range = started ? rangeMonths(shields, hull, costs.average, debt) : null
  // The loans given still open: by their records (closed = none); operations of a loan without its record as counted.
  const given = Object.fromEntries(loanList.filter((l) => l.loan.direction === 'given' && l.open > 0).map((l) => [l.loan.id, l.open]))
  for (const [key, open] of loanOpen) if (open > 0 && !loansById.has(key)) given[key] = open
  const minShields = salary ? Math.round(settings.orders.minShieldSalaries * salary) : null

  // Envelopes and today's energy: the whole month counts (spending before the budget's start too).
  const envelopes: EnvelopeState[] = []
  let daily: FleetState['daily'] = null
  if (plan) {
    const spentBy = new Map<string, { before: number; today: number }>()
    let dailyBefore = 0
    let dailyToday = 0
    for (const t of txs) {
      if (monthOf(t.date) !== month || t.kind !== 'expense' || t.goalId || t.containerId) continue
      for (const p of partsOf(t)) {
        if (p.refundable) continue
        const cost = -p.amount
        const main = cats.mainOf(p.categoryId)
        const kind = main ? envelopeKind(main) : 'daily'
        if (main) {
          const s = spentBy.get(main.id) ?? { before: 0, today: 0 }
          if (t.date === today) s.today += cost
          else s.before += cost
          spentBy.set(main.id, s)
        }
        // Spending without a category counts against today's energy: most likely a daily purchase.
        if (kind === 'daily') {
          if (t.date === today) dailyToday += cost
          else dailyBefore += cost
        }
      }
    }
    let dailyLimit = dailyExtra.get(month) ?? 0
    for (const main of cats.mains) {
      const kind = envelopeKind(main)
      if (!kind) continue
      const limit = plan.envelopes[main.id]
      if (kind === 'daily') dailyLimit += limit ?? 0
      if (limit == null) continue
      const s = spentBy.get(main.id) ?? { before: 0, today: 0 }
      const spent = s.before + s.today
      envelopes.push({ categoryId: main.id, kind, limit, spent, left: limit - spent, today: s.today })
      if (kind === 'planned' && spent > limit) alarms.push({ kind: 'envelope-over', level: spent > limit * 1.2 ? 'red' : 'yellow', date: today, amount: spent - limit, ref: main.id })
    }
    const d = dailyAllowance({ limit: dailyLimit, spentBefore: dailyBefore, spentToday: dailyToday, day: dayOfMonth(today), daysInMonth: daysInMonth(month) })
    daily = { ...d, limit: dailyLimit, spentBefore: dailyBefore, spentToday: dailyToday }
    if (d.left < 0) alarms.push({ kind: 'daily-over', level: 'yellow', date: today, amount: -d.left })
  }

  if (started) {
    if (shields < 0) alarms.push({ kind: 'deficit', level: 'red', date: today, amount: -shields })
    else if (minShields != null && shields < minShields) alarms.push({ kind: 'shields-below-min', level: 'yellow', date: today, amount: minShields - shields })
  }
  for (const t of txs) if (t.kind === 'correction' && counts(t)) alarms.push({ kind: 'correction', level: 'yellow', date: t.date, amount: t.amount, txId: t.id })
  const cargo = cargoMass(containers, month, salary, settings.orders.cargoLimitPct)
  if (cargo.over) alarms.push({ kind: 'cargo-over', level: 'yellow', date: today, amount: cargo.monthly })
  if (salary != null && income.average != null && salary > income.average) alarms.push({ kind: 'salary-above-income', level: 'yellow', date: today, amount: salary - income.average })

  /** The tank's cycle: this one, or – paid already – the next one (B6). */
  const tankCycle = (c: Container) => {
    const due = cyclePosition(c, month).dueMonth
    return paidCycles.get(c.id)?.has(due) ? { dueMonth: addMonths(due, c.cycleMonths), paidDue: due } : { dueMonth: due, paidDue: null }
  }
  return {
    today,
    month,
    started,
    start,
    accounts,
    total,
    shields: { amount: shields, target: targets.shields, free: targets.shields != null ? Math.max(0, shields - targets.shields) : 0, min: minShields },
    hull: { amount: hull, target: targets.hull },
    goals: goalsAll.map((g) => ({ id: g.id, name: g.name, amount: goalAmount.get(g.id) ?? 0, target: g.target, priority: g.priority, takes: goalTakes(g, nowMs) })),
    energy,
    tanks: containers
      .filter((c) => c.cycleMonths > 1 && (activeIn(c, month) || (tanks.get(c.id) ?? 0) !== 0))
      .map((c) => ({ containerId: c.id, name: c.name, amount: tanks.get(c.id) ?? 0, ...tankCycle(c), due: c.amount })),
    taxHold,
    deposit,
    loot: { month: lootMonth, amount: loot },
    receivables: { house: household.owed, houseSince: household.since, members: household.members, loans: given, total: household.owed + sum(Object.values(given)) },
    household,
    loans: loanList,
    debt,
    costs,
    income,
    incomeStats: incomeNow,
    incomeContext,
    settleFrom,
    range,
    shipClass: range != null ? shipClass(range) : null,
    cargo,
    plan: plan ? { month: plan.month, salary: plan.salary } : null,
    salary: salaryOfMonth.get(month) ?? null,
    envelopes,
    daily,
    alarms,
    log
  }
}

/** Sum of the layers – equal to `total` (the balances) once the layers run (the invariant the tests check). */
export function layersSum(s: FleetState): number {
  return s.shields.amount + s.hull.amount + sum(s.goals.map((g) => g.amount)) + s.energy + sum(s.tanks.map((t) => t.amount)) + s.taxHold + s.deposit + s.loot.amount
}
