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
import { balanceOf, heldOf, settleHousehold, settlesHousehold, type HouseholdLedger, type MemberBalance, type MemberFlow } from './household'
import { incomeByMonth, incomeStats, taxOfDockings, type IncomeContext, type IncomeStats } from './income'
import { goalAt, goalDecided, goalTakes } from './goals'
import { debtOf, loanStates, type LoanState } from './loans'
import { coveredMonths, monthsBefore } from './history'
import { categoryIndex, costOf, isCargoPayment, partsOf, splitEvenly, sum } from './operations'

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

/**
 * A docking's split from the window fitted to the operation's amount now (B59): the tax reserve first, then the hull,
 * the goals as saved – each up to what is left – the rest to the shields. An amount changed after the docking never
 * takes money from the shields for a part, nor leaves a part of it undocked.
 */
export function fitSplit(amount: number, split: { hull: number; goals: Record<string, number>; taxHold: number }): { hull: number; goals: Record<string, number>; taxHold: number; shields: number } {
  let rest = Math.max(0, amount)
  const take = (v: number) => {
    const t = Math.min(rest, Math.max(0, v))
    rest -= t
    return t
  }
  const taxHold = take(split.taxHold)
  const hull = take(split.hull)
  const goals: Record<string, number> = {}
  for (const [id, g] of Object.entries(split.goals)) {
    const t = take(g)
    if (t) goals[id] = t
  }
  return { hull, goals, taxHold, shields: rest }
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

/** The serious overrun's threshold of a folder without game settings (the schema's default). */
export const SERIOUS_ENVELOPE_PCT = 20

/**
 * An envelope over its limit (N102) – one rule for the engine's alarm, the game and the notifications: over = spent
 * above the limit (0 zł too: „nic na prezenty”), serious = above the game's threshold (`seriousEnvelopePct`, a limit of
 * 0 never – a part of nothing is no measure). A daily envelope's own overrun is no alarm: the daily pool decides (D16).
 */
export function envelopeOverrun(e: { limit: number; spent: number }, seriousPct: number): { over: boolean; serious: boolean } {
  if (e.spent <= e.limit) return { over: false, serious: false }
  return { over: true, serious: e.limit > 0 && e.spent > Math.floor((e.limit * (100 + seriousPct)) / 100) }
}

/**
 * What the budget's first month spent before its start (T45, B126): its salary is paid less this – that money is gone
 * from the opening balances already. The net costs of the month's days before the start (a refund nets a purchase),
 * never below 0 – a refund is no salary; `periodic` – a periodic fee's payment is its tank's, not the salary's (N9).
 * The engine and the start wizard count it so.
 */
export function startMonthSpentOf(transactions: readonly Transaction[], start: string, periodic: (t: Transaction) => boolean): number {
  const month = monthOf(start)
  let spent = 0
  for (const t of transactions) if (t.date < start && monthOf(t.date) === month && !periodic(t)) spent += costOf(t)
  return Math.max(0, spent)
}

/** Today's energy (spec, „Dzienny przydział”): unspent energy carries to the next days, an overspent day lowers them. */
export function dailyAllowance(o: { limit: number; spentBefore: number; spentToday: number; day: number; daysInMonth: number }): DailyAllowance {
  const daysLeft = Math.max(1, o.daysInMonth - o.day + 1)
  const allowance = Math.max(0, Math.floor((o.limit - o.spentBefore) / daysLeft))
  return { base: Math.floor(o.limit / o.daysInMonth), allowance, left: allowance - o.spentToday, daysLeft }
}

/**
 * Today's energy after a purchase of `amount` (N3 – the quick entry's preview, as the engine counts it): one of today
 * takes it all today; one of an earlier day of this month lowers the allowance of the days left; another month or a day
 * ahead leaves today's energy as it is (null).
 */
export function energyAfter(d: { today: string; limit: number; spentBefore: number; spentToday: number; days: number }, date: string, amount: number): { before: number; after: number } | null {
  if (date > d.today || date.slice(0, 7) !== d.today.slice(0, 7)) return null
  const base = { limit: d.limit, spentBefore: d.spentBefore, spentToday: d.spentToday, day: dayOfMonth(d.today), daysInMonth: d.days }
  const before = dailyAllowance(base).left
  const after = date === d.today ? dailyAllowance({ ...base, spentToday: d.spentToday + amount }).left : dailyAllowance({ ...base, spentBefore: d.spentBefore + amount }).left
  return { before, after }
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
 * months or more – the next due month's when paid the month before it (early: the 1st on a Monday), only while the cycle
 * before is closed (`closed` – paid, or before the fee was followed): else it is that cycle's, late. null = paid late.
 */
export function paidCycleOf(c: Pick<Container, 'cycleMonths' | 'dueMonth'>, month: string, closed: (dueMonth: string) => boolean = () => true): string | null {
  const due = cyclePosition(c, month).dueMonth
  if (due === month) return due
  return c.cycleMonths >= 3 && addMonths(month, 1) === due && closed(addMonths(due, -c.cycleMonths)) ? due : null
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
  members: settings.household.members,
  covered: settings.household.openingIds ?? null
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
  // The oldest purchase a debt comes from (N41), when the balance on the new day is the ledger's own.
  const oldest = new Map<string, string | null>()
  if (next > from) {
    const then = householdOf(input, today, addDays(next, -1))
    for (const m of settings.household.members) {
      const b = balanceOf(then, m.id)
      value.set(m.id, net(b))
      oldest.set(m.id, b.since)
    }
  } else {
    // The balances as 1.3.0 counted them (from the budget's start, no openings) – the old opening's typed part on top.
    // The operations the old openings never took in (B14) are not given back: they count after the new start as before.
    const late = new Set(householdOf(input, today).late)
    const members = settings.household.members.map((m) => ({ ...m, opening: { owed: 0, deposit: 0 } }))
    const plain = {
      ...input,
      transactions: late.size ? input.transactions.filter((t) => !late.has(t.id)) : input.transactions,
      settings: { ...settings, household: { ...settings.household, since: null, members } }
    }
    const atNext = householdOf(plain, today, addDays(next, -1))
    const atFrom = householdOf(plain, today, addDays(from, -1))
    for (const m of settings.household.members) {
      value.set(m.id, net(balanceOf(atNext, m.id)) + net(m.opening) - net(balanceOf(atFrom, m.id)))
      oldest.set(m.id, balanceOf(atNext, m.id).since)
    }
  }
  return new Map([...value].map(([id, v]) => [id, v >= 0 ? { owed: 0, deposit: v, since: null } : { owed: -v, deposit: 0, since: oldest.get(id) ?? null }]))
}

/**
 * The operations the members' balances at a settlements' start take in (B14, `settings.household.openingIds`): the
 * household's operations dated from the budget's start to the day before it – set together with the balances.
 */
export function openingIdsOf(input: Pick<FleetInput, 'settings' | 'balances' | 'transactions'>, today: string, since: string | null): string[] {
  const budgetStart = budgetStartOf(input.settings, input.balances ?? [], today)
  const from = settleFromOf({ household: { ...input.settings.household, since } }, budgetStart)
  if (!budgetStart || !from || from <= budgetStart) return []
  return input.transactions
    .filter((t) => t.date >= budgetStart && t.date < from && settlesHousehold(t))
    .map((t) => t.id)
    .sort()
}

// ------------------------------------------------------------------ the whole state

export interface FleetInput {
  /** `game`: the serious overrun's threshold of Dowództwo (N102) – without it the default 20%. */
  settings: Pick<Settings, 'accounts' | 'categories' | 'layers' | 'orders' | 'budget' | 'household'> & { game?: Pick<Settings['game'], 'seriousEnvelopePct'> }
  transactions: readonly Transaction[]
  /**
   * Payouts of the ICTTJ pool „Podatek” paired with operations before the budget's start (N38 – `preStartTaxOf`, the
   * renderer's: the engine never reads ICTTJ): no income. Operation id → amount.
   */
  preStartTax?: ReadonlyMap<string, number>
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
  /**
   * `over` = above their target; `free` = „wolne do decyzji” – the part above the target only with a full hull (N21: the
   * docking order fills the hull first, and the firewall lets a top-up of XTB only from there).
   */
  shields: { amount: number; target: number | null; free: number; over: number; min: number | null }
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
  /** The full months the averages read (`calc/history.ts`, oldest first) – the plan's proposals read the same (B23, B25). */
  historyMonths: string[]
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

/**
 * An event of the calendar (the start, an account joining, a month's turn, the loot, a goal's money moved): its place
 * among the operations is `${date} ${slot} ${rest}` – an operation's is `${date} 3 ${time} ${createdAt} ${id}`.
 */
interface Ev {
  date: string
  slot: number
  rest: string
  run: () => void
}

const order = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
const evKey = (e: Ev) => `${e.date} ${e.slot} ${e.rest}`
/** An operation's rest of its place (`Ev`). */
const opRest = (t: Transaction) => `${t.time ?? ''} ${t.createdAt} ${t.id}`
/**
 * The operations in their order (W27): as their places `${date} 3 ${time} ${createdAt} ${id}` would sort – none built;
 * the parts never hold a space (a date, HH:MM, an ISO moment, a ULID), so part by part is the text's order.
 */
const opOrder = (a: Transaction, b: Transaction): number => order(a.date, b.date) || order(a.time ?? '', b.time ?? '') || order(a.createdAt, b.createdAt) || order(a.id, b.id)
/** Each list of operations in that order, sorted once (W27): the game rates many days of one list. */
const sortedMemo = new WeakMap<readonly Transaction[], readonly Transaction[]>()
function sortedOps(list: readonly Transaction[]): readonly Transaction[] {
  let sorted = sortedMemo.get(list)
  if (!sorted) sortedMemo.set(list, (sorted = [...list].sort(opOrder)))
  return sorted
}
/** The calendar's event before the operation; the same place – the event (it came first before W27 too). */
const evFirst = (e: Ev, t: Transaction): boolean => (e.date !== t.date ? e.date < t.date : e.slot !== 3 ? e.slot < 3 : e.rest <= opRest(t))

function hasKeys(o: object): boolean {
  for (const k in o) if (Object.hasOwn(o, k)) return true
  return false
}

export function computeFleet(input: FleetInput): FleetState {
  const { date: today, month } = warsawNow(input.now)
  const nowMs = typeof input.now === 'string' ? Date.parse(input.now) : input.now.getTime()
  const { settings } = input
  const cats = categoryIndex(settings.categories)
  const containers = input.containers ?? []
  const containerIds = new Set(containers.map((c) => c.id))
  const containerById = new Map<string, Container>()
  for (const c of containers) if (!containerById.has(c.id)) containerById.set(c.id, c)
  const goalsAll = [...(input.goals ?? [])].sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  const plans = [...(input.months ?? [])].sort((a, b) => a.month.localeCompare(b.month))
  const dockingByTx = dockingsByTx(input.dockings ?? [])
  const loansById = new Map((input.loans ?? []).map((l) => [l.id, l]))
  const txs = input.transactions.filter((t) => t.date <= today)

  // ---------------------------------------------------------------- accounts and balances
  const openings = openingsOf(input.balances ?? [], today)
  const budgetStart = budgetStartOf(settings, input.balances, today)
  const counts = (t: Transaction) => {
    const o = openings.get(t.accountId)
    return !o || t.date >= o.date
  }
  // Each account's operations counted, all of them and those before the budget's start – one pass (W27).
  const accountIdSet = new Set<string>()
  for (const a of settings.accounts) accountIdSet.add(a.id)
  const moved = new Map<string, number>()
  const movedBeforeStart = new Map<string, number>()
  for (const t of txs) {
    accountIdSet.add(t.accountId)
    if (!counts(t)) continue
    moved.set(t.accountId, (moved.get(t.accountId) ?? 0) + t.amount)
    if (budgetStart != null && t.date < budgetStart) movedBeforeStart.set(t.accountId, (movedBeforeStart.get(t.accountId) ?? 0) + t.amount)
  }
  for (const id of openings.keys()) accountIdSet.add(id)
  const accountIds = [...accountIdSet]
  const accounts = accountIds.map((id) => {
    const o = openings.get(id)
    return { id, name: settings.accounts.find((a) => a.id === id)?.name ?? '(usunięte konto)', balance: (o?.amount ?? 0) + (moved.get(id) ?? 0), opening: o ? { date: o.date, amount: o.amount } : null }
  })
  const total = sum(accounts.map((a) => a.balance))

  // ---------------------------------------------------------------- the household (D80)
  // Its balances from the budget's start, the operations the layers count (`counts`) – the same ledger for the screens
  // and the statistics.
  const settleFrom = settleFromOf(settings, budgetStart)
  const household = settleHousehold(input.transactions, ledgerOptions(settings, budgetStart, openings, today))

  // ---------------------------------------------------------------- statistics from the whole history
  // The full months the averages read (T27, B23, B25 – `calc/history.ts`): from where the bank's history (or an account's
  // opening) starts, each with an operation, never the month still running.
  const covered = coveredMonths(txs, month, [...openings.values()].map((o) => o.date))
  const costsByMonth = new Map<string, number>()
  for (const t of txs) {
    const m = monthOf(t.date)
    const c = costOf(t)
    if (c) costsByMonth.set(m, (costsByMonth.get(m) ?? 0) + c)
  }
  // Income (D81): work and trading net, without the members' money and the pool „Podatek”.
  const tax = taxOfDockings(dockingByTx, txs)
  // The pool „Podatek” before the start (N38): paired, never docked – no income either.
  for (const [id, v] of input.preStartTax ?? []) if (!tax.has(id)) tax.set(id, v)
  const incomeContext: IncomeContext = { ledger: household, since: settleFrom, members: settings.household.members, tax }
  const incomeMonths = incomeByMonth(txs, incomeContext)
  const costsFor = (m: string): FleetState['costs'] => {
    const window = monthsBefore(covered, m, 12)
    const h = { average: window.length ? Math.round(sum(window.map((x) => costsByMonth.get(x) ?? 0)) / window.length) : null, months: window.length }
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
  /** What loan operations without their record brought in beyond repaying a receivable (B57): money out repays it first. */
  const borrowedNoRecord = new Map<string, number>()
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
      .map(({ g, at }) => ({
        id: g.id,
        amount: goalAmount.get(g.id) ?? 0,
        target: at.target,
        ictj: g.source === 'ictj',
        // An ICTTJ goal without a price (N46): it takes everything set aside in its month (ICTTJ's own rule).
        allIn: g.source === 'ictj' && g.ictj != null && g.ictj.amount == null ? g.deadline : null
      }))
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
  const fillGoals = (v: number, at: number, moves: Moves, date: string) => {
    let rest = v
    const goals = activeGoals(at)
    for (const g of [...goals.filter((x) => x.ictj), ...goals.filter((x) => !x.ictj)]) {
      // A goal without a price in its month takes all the pool's rest (N46); else up to its target.
      const take = g.allIn && g.allIn === monthOf(date) ? rest : Math.min(rest, Math.max(0, g.target - g.amount))
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
  // The docking's creation, never its last save: a later edit or a merge of duplicates moves no money docked before (C1).
  const dayStarts = new Map<string, number>()
  const dayStart = (date: string) => dayStarts.get(date) ?? dayStarts.set(date, warsawStartOf(date).getTime()).get(date)!
  const cameIn = (t: Transaction, d: Docking | undefined): number => Math.max(Date.parse(d?.createdAt ?? t.createdAt), dayStart(t.date))
  const applySplit = (v: number, split: NonNullable<Docking['split']>, moves: Moves) => {
    // Fitted to the amount (B59): a goal gone since takes nothing – its part stays in the shields.
    const fit = fitSplit(v, { hull: split.hull, taxHold: split.taxHold, goals: Object.fromEntries(Object.entries(split.goals).filter(([id]) => knownGoal(id))) })
    if (fit.hull) {
      hull += fit.hull
      moves.hull = (moves.hull ?? 0) + fit.hull
    }
    for (const [id, g] of Object.entries(fit.goals)) addGoal(id, g, moves)
    if (fit.taxHold) {
      taxHold += fit.taxHold
      moves.taxHold = (moves.taxHold ?? 0) + fit.taxHold
    }
    addShields(fit.shields, moves)
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
    if (hasKeys(ev.moves)) log.push(ev)
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
      // Their gift (D83): the shields pay what their advance did not – nobody owes it; a returned gift comes back.
      if (f.gift > 0) drawShields(f.gift, moves)
      else if (f.gift < 0) addShields(-f.gift, moves)
    }
  }

  // The budget's first month started before the budget did: what it spent until the start came out of that month's
  // salary already (T45), the start pays only the rest.
  // A periodic fee is its tank's, never the salary's.
  const periodicIds = new Set(containers.filter((c) => c.cycleMonths > 1).map((c) => c.id))
  /** The cycles (due months) of each periodic fee paid already (B55). */
  const paidCycles = new Map<string, Set<string>>()
  const startMonthSpent = start ? startMonthSpentOf(txs, start, (t) => !!t.containerId && periodicIds.has(t.containerId)) : 0
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
        const container = t.containerId ? containerById.get(t.containerId) : undefined
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
              // The cycle before closed – paid, or before the fee was followed (the budget's start, its `from`).
              const followed = start ? [monthOf(start), periodic.from ?? ''].sort().at(-1)! : ''
              const cycle = paidCycleOf(periodic, monthOf(t.date), (due) => due < followed || !!paidCycles.get(periodic.id)?.has(due))
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
          // The ICTTJ payout's day decides a goal's month (N46: entered on the 31st, in the bank on the 2nd).
          else if (d?.pool === 'goals') fillGoals(amt, cameIn(t, d), moves, d.entryDate ?? t.date)
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
        if (!loan) {
          // Without its loan record (B57) the direction is unknown: the money moves only the shields – never docked as
          // income, never a receivable it repays. Money out repays what such operations brought in first, the rest is
          // lent (a receivable by `-`); money in comes back of what they lent first, the rest is borrowed.
          if (amt < 0) {
            drawShields(-amt, moves)
            const repaid = Math.min(-amt, borrowedNoRecord.get(key) ?? 0)
            borrowedNoRecord.set(key, (borrowedNoRecord.get(key) ?? 0) - repaid)
            if (-amt > repaid) {
              loanOpen.set(key, (loanOpen.get(key) ?? 0) - amt - repaid)
              moves.loans = { [key]: -amt - repaid }
            }
          } else if (amt > 0) {
            addShields(amt, moves)
            const back = Math.min(amt, Math.max(0, loanOpen.get(key) ?? 0))
            if (back) {
              loanOpen.set(key, (loanOpen.get(key) ?? 0) - back)
              moves.loans = { [key]: -back }
            }
            if (amt > back) borrowedNoRecord.set(key, (borrowedNoRecord.get(key) ?? 0) + amt - back)
          }
          break
        }
        if (amt < 0) {
          drawShields(-amt, moves)
          loanOpen.set(key, (loanOpen.get(key) ?? 0) - amt)
          moves.loans = { [key]: -amt }
        } else {
          // A repayment comes back to the shields up to what is owed – the loan record knows its amount (lent before
          // the start or without its operation too); more than that (interest) is income.
          const owed = Math.max(0, loan.amount - (givenBack.get(loan.id) ?? 0))
          const back = Math.min(amt, owed)
          givenBack.set(loan.id, (givenBack.get(loan.id) ?? 0) + back)
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
    // The start: the money on the accounts then, split as the wizard said or by the docking order; this month's salary.
    events.push({
      date: start,
      slot: 0,
      rest: '0',
      run: () => {
        const moves: Moves = {}
        const startTotal = sum(accountIds.filter((id) => (openings.get(id)?.date ?? start) <= start).map((id) => (openings.get(id)?.amount ?? 0) + (movedBeforeStart.get(id) ?? 0)))
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
    // Accounts that join the budget later: their opening balance comes into the shields at the start of that day –
    // before the salary of a month starting then (B60: an opening on the 1st pays it, not the shields of the day before).
    for (const [id, o] of openings) {
      if (o.date <= start) continue
      events.push({
        date: o.date,
        slot: 0,
        rest: '0a',
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
        date: settleFrom,
        slot: 1,
        rest: 'h',
        run: () => {
          // The operations dated before it and added after the openings were set (B14) count after them: their part too.
          const target = sum(settings.household.members.map((m) => m.opening?.deposit ?? 0)) + household.lateDeposit
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
        date: firstDayOf(m),
        slot: 0,
        rest: '1',
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
          date: deadline,
          slot: 2,
          rest: '',
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
            date,
            slot: 3,
            rest: stamp.slice(11),
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
    // A goal's money moved out (C2, B30) at the end of its day: what it held then (never more than it holds), to the
    // shields or another goal.
    for (const g of goalsAll)
      for (const [i, tr] of (g.transfers ?? []).entries()) {
        const date = warsawNow(tr.at).date
        if (date < start || date > today) continue
        events.push({
          date,
          slot: 4,
          rest: `${g.id} ${String(i).padStart(4, '0')}`,
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
    const keys = new Map(events.map((e) => [e, evKey(e)]))
    events.sort((a, b) => order(keys.get(a)!, keys.get(b)!))
    // The operations in their order, merged with the calendar's events (W27) – no event, key or closure for each.
    let next = 0
    for (const t of sortedOps(input.transactions)) {
      if (t.date < start || t.date > today || !counts(t)) continue
      while (next < events.length && evFirst(events[next]!, t)) events[next++]!.run()
      runTx(t)
    }
    while (next < events.length) events[next++]!.run()
  }

  // ---------------------------------------------------------------- now
  const plan = planFor(month)
  const salary = plan?.salary ?? null
  const targets = targetsAt(today)
  const costs = costsAt(month)
  const incomeNow = incomeStats(incomeMonths, monthsBefore(covered, month, 12))
  const income = { average: incomeNow.windows[6].total, months: incomeNow.windows[6].months }
  // A loan taken is in the shields, but it is not the ship's money: the range counts the shields less the debt (D72).
  const loanList = loanStates(input.loans ?? [], txs, containers, today)
  const debt = debtOf(loanList)
  const range = started ? rangeMonths(shields, hull, costs.average, debt) : null
  // The loans given still open: by their records (closed = none); operations of a loan without its record as counted.
  const given = Object.fromEntries(loanList.filter((l) => l.loan.direction === 'given' && l.open > 0).map((l) => [l.loan.id, l.open]))
  for (const [key, open] of loanOpen) if (open > 0 && !loansById.has(key)) given[key] = open
  // The minimum never above the shields' target (B84): the dockings fill the shields only up to the target – a higher
  // minimum would be a lasting alarm, a Bearish bias and the game's violations.
  const minShields = salary ? Math.round(Math.min(settings.orders.minShieldSalaries, settings.layers.shieldSalaries) * salary) : null

  // Envelopes and today's energy: the whole month counts (spending before the budget's start too).
  const envelopes: EnvelopeState[] = []
  let daily: FleetState['daily'] = null
  if (plan) {
    const spentBy = new Map<string, { before: number; today: number }>()
    let dailyBefore = 0
    let dailyToday = 0
    for (const t of txs) {
      if (monthOf(t.date) !== month || t.kind !== 'expense' || t.goalId || isCargoPayment(t, containerIds)) continue
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
      // Red as the game's serious violation (N102): one threshold – the one of Dowództwo.
      const over = kind === 'planned' ? envelopeOverrun({ limit, spent }, settings.game?.seriousEnvelopePct ?? SERIOUS_ENVELOPE_PCT) : null
      if (over?.over) alarms.push({ kind: 'envelope-over', level: over.serious ? 'red' : 'yellow', date: today, amount: spent - limit, ref: main.id })
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

  const overTarget = targets.shields != null ? Math.max(0, shields - targets.shields) : 0
  const hullFull = targets.hull != null && hull >= targets.hull
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
    shields: { amount: shields, target: targets.shields, free: hullFull ? overTarget : 0, over: overTarget, min: minShields },
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
    historyMonths: covered,
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
