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
import type { Balance, Container, Docking, Goal, IctjPool, Loan, MonthPlan, Transaction, TxKind } from '../schema/records'
import { addDays, addMonths, dayOfMonth, daysInMonth, firstDayOf, monthOf, monthRange, monthsBetween, warsawEndOf, warsawNow, warsawStamp, warsawStartOf } from './dates'
import { openingsOf } from './balances'
import { balanceOf, heldOf, ledgerOrder, settleHousehold, settlesHousehold, type HouseholdLedger, type MemberBalance, type MemberFlow } from './household'
import { incomeByMonth, incomeStats, taxOfDockings, type IncomeContext, type IncomeStats } from './income'
import { goalAt, goalDecided, goalTakes } from './goals'
import { debtOf, loanStates, type LoanState } from './loans'
import { coveredMonths, monthsBefore } from './history'
import { accountAmounts, categoryIndex, costOf, isCargoPayment, isTwoSided, partsOf, splitEvenly, sum } from './operations'
// The paid cycles by the fees' state rule (T393) – that module reads the calendar from this one: a cycle of functions only.
import { feeDayOf, paidDuesOf, paymentDay, type FeeDuesOf, type Linked } from './cargoStatus'

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

/**
 * A goal's installment from the salary in `month` (F15, D87 – „Kurs przechwycenia”): what it lacks (`need`) over the
 * months to its deadline – this one included – in whole grosze, the rest in the deadline's month (as T29 splits a fee);
 * 0 past the deadline or with nothing lacking.
 */
export function goalInstallment(need: number, month: string, deadline: string): number {
  if (need <= 0 || month > deadline) return 0
  if (month === deadline) return need
  return Math.floor(need / (monthsBetween(month, deadline) + 1))
}

/** A goal takes installments from the salary in `month` (F15): one of its periods holds it. */
export const ratedIn = (rates: ReadonlyArray<{ from: string; until: string | null }> | undefined, month: string): boolean =>
  (rates ?? []).some((r) => r.from <= month && (r.until == null || month <= r.until))

/**
 * The month's limits moved between envelopes (F28): each cover of the month's own plan made by `now` (ms) – and, for
 * the game, before `cut` (D73: a day is rated by the limits before the covers made that day). Category → + / − grosze.
 */
export function coverMoves(own: Pick<MonthPlan, 'envelopeCovers'> | null | undefined, now = Infinity, cut = Infinity): Map<string, number> {
  const out = new Map<string, number>()
  for (const c of own?.envelopeCovers ?? []) {
    const at = Date.parse(c.at)
    if (!(at <= now) || !(at < cut)) continue
    out.set(c.from, (out.get(c.from) ?? 0) - c.amount)
    out.set(c.to, (out.get(c.to) ?? 0) + c.amount)
  }
  return out
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

/** A container's payment calendar: its cycle, or – a fee of a schedule (F23) – its payment months. */
export type CycleOf = Pick<Container, 'cycleMonths' | 'dueMonth'> & { schedule?: readonly number[] | null }

/**
 * The payment months of a fee of a schedule (1.9.0, F23): 2–11 distinct months of the year, sorted – only for a periodic
 * fee (`cycleMonths` > 1); null = its cycle counts.
 */
export function scheduleOf(c: Pick<Container, 'cycleMonths'> & { schedule?: readonly number[] | null }): number[] | null {
  if (c.cycleMonths <= 1 || !c.schedule?.length) return null
  const months = [...new Set(c.schedule.filter((m) => Number.isInteger(m) && m >= 1 && m <= 12))].sort((a, b) => a - b)
  return months.length >= 2 && months.length <= 11 ? months : null
}

/**
 * Position of `month` in a container's cycle: 0 = the first month after a payment, `length` − 1 = the payment's month
 * (`dueMonth`). A fee of a schedule (F23): the cycle from its payment month before to the next one – its length varies.
 */
export function cyclePosition(container: CycleOf, month: string): { index: number; dueMonth: string; length: number } {
  const months = scheduleOf(container)
  if (months) {
    const m = Number(month.slice(5, 7))
    const next = months.find((x) => x >= m)
    const dueMonth = next != null ? addMonths(month, next - m) : addMonths(month, 12 - m + months[0]!)
    const due = Number(dueMonth.slice(5, 7))
    const i = months.indexOf(due)
    const length = due - (i > 0 ? months[i - 1]! : months[months.length - 1]! - 12)
    return { index: length - 1 - monthsBetween(month, dueMonth), dueMonth, length }
  }
  const n = container.cycleMonths
  const r = ((monthsBetween(container.dueMonth, month) % n) + n) % n
  const dueMonth = addMonths(month, (n - r) % n)
  return { index: n - 1 - monthsBetween(month, dueMonth), dueMonth, length: n }
}

/** A container's amount with its history (F9): the earlier amounts up to their months. */
export type AmountOf = Pick<Container, 'amount'> & { past?: ReadonlyArray<{ until: string; amount: number }> | null }

/** Its amount in `month` (1.9.0, F9): the earlier amount whose month is the first not before it, else the current one. */
export function amountIn(c: AmountOf, month: string): number {
  let found: { until: string; amount: number } | null = null
  for (const p of c.past ?? []) if (month <= p.until && (!found || p.until < found.until)) found = p
  return found ? found.amount : c.amount
}

/** Its payments a year: 12 over the cycle, or the schedule's months (F23). */
export const paymentsPerYear = (c: Pick<Container, 'cycleMonths'> & { schedule?: readonly number[] | null }): number => scheduleOf(c)?.length ?? 12 / Math.max(1, c.cycleMonths)

/**
 * A container's monthly weight (the load line's, the plans'): its payment over its cycle – a fee of a schedule by its
 * payments a year over 12 (F23); `month` given – its amount then (F9), else the current one.
 */
export function monthlyWeight(c: AmountOf & Pick<Container, 'cycleMonths'> & { schedule?: readonly number[] | null }, month?: string): number {
  const amount = month ? amountIn(c, month) : c.amount
  const months = scheduleOf(c)
  return Math.round(months ? (amount * months.length) / 12 : amount / Math.max(1, c.cycleMonths))
}

/**
 * This month's contribution to a tank: the plan's installment plus an even share of what the tank lacks against
 * the plan (a fee added late, a smaller salary) – or minus an even share of a surplus. Never negative. The plan is the
 * cycle's of this month: the amount then (F9), the cycle up to the next payment (a schedule's – F23).
 */
export function sinkingInstallment(container: CycleOf & AmountOf, month: string, tank: number): number {
  const { index, length: n } = cyclePosition(container, month)
  const plan = sinkingSchedule(amountIn(container, month), n)
  const expected = sum(plan.slice(0, index))
  const left = n - index
  const deficit = expected - tank
  const share = left > 1 ? Math.trunc(deficit / left) : deficit
  return Math.max(0, (plan[index] ?? 0) + share)
}

/**
 * What a tank wants from this month's energy (T29) – the engine's, the start wizard's and the plan's one rule: nothing for
 * a cycle paid already (`paid` – its due months; B55, AP-5), else `sinkingInstallment`.
 */
export function tankWant(container: CycleOf & AmountOf, month: string, tank: number, paid: ReadonlySet<string> | null | undefined): number {
  return paid?.has(cyclePosition(container, month).dueMonth) ? 0 : sinkingInstallment(container, month, tank)
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
 * Today's energy as shown (AP-13, D99 pkt 4 – T371): the allowance less today's spending (T295), never more than the
 * month's energy left (`month`; null – no cap: the layers do not run). Over the day (below 0) it stays as it is – the
 * month's energy is never below 0.
 */
export const cappedEnergy = (left: number, month: number | null | undefined): number => (month != null && month < left ? month : left)

/** The parts of today's energy (the engine's `daily`, the quick entry's – N3): what its preview counts with. */
export interface EnergyPreview {
  today: string
  limit: number
  spentBefore: number
  spentToday: number
  days: number
  /**
   * The month's energy left (AP-13, T371) – today's is never more; absent / null: no cap. `spends` – a purchase takes it
   * (the month's salary paid; without one the shields pay and the month's energy stays).
   */
  month?: { energy: number; spends: boolean } | null
  /** Today's refunds of earlier purchases by main category ('' – none, T370): a purchase of its category today takes them first. */
  returned?: Readonly<Record<string, number>>
}

/**
 * Today's energy after a purchase (N3, AP-13 – the quick entry's preview, as the engine counts it): `daily` – its parts
 * of the daily pool by main category ('' – none; a number – one part, no refund of today taken into account), `other` –
 * its parts of the month's energy beyond the pool (a planned envelope, a category without one). One of today takes its
 * daily part today – less what a refund of an earlier purchase of its category returned today (T370); one of an earlier
 * day of this month lowers the allowance of the days left; both take the month's energy, and today's is never more
 * (T371). Another month or a day ahead leaves today's energy as it is (null).
 */
export function energyAfter(d: EnergyPreview, date: string, daily: number | ReadonlyMap<string, number>, other = 0): { before: number; after: number } | null {
  if (date > d.today || date.slice(0, 7) !== d.today.slice(0, 7)) return null
  const base = { limit: d.limit, spentBefore: d.spentBefore, spentToday: d.spentToday, day: dayOfMonth(d.today), daysInMonth: d.days }
  let total = 0
  let today = 0
  for (const [key, v] of typeof daily === 'number' ? [[null, daily] as const] : daily) {
    total += v
    today += key == null ? v : Math.max(0, v - (d.returned?.[key] ?? 0))
  }
  const left = date === d.today ? dailyAllowance({ ...base, spentToday: d.spentToday + today }).left : dailyAllowance({ ...base, spentBefore: d.spentBefore + total }).left
  const month = d.month ? (d.month.spends ? Math.max(0, d.month.energy - total - other) : d.month.energy) : null
  return { before: cappedEnergy(dailyAllowance(base).left, d.month?.energy), after: cappedEnergy(left, month) }
}

/**
 * Today's energy after the daily pool's limit changes by `delta` (AP-13, PM sp. 6 – „Pokryj z koperty…”: a daily
 * envelope's limit moved to a planned one shrinks the pool): its spending as it is, the month's energy as it is (a cover
 * moves no money). null – no plan of the month.
 */
export function energyAfterLimit(f: Pick<FleetState, 'daily' | 'energy' | 'started'>, delta: number): { before: number; after: number } | null {
  const d = f.daily
  if (!d) return null
  const allowance = Math.max(0, Math.floor((d.limit + delta - d.spentBefore) / d.daysLeft))
  return { before: d.energy, after: f.started ? cappedEnergy(allowance - d.spentToday, f.energy) : allowance - d.spentToday }
}

/** What the hull may lack and still count as full (AP-17, D99 – T372): 1 % of its target. */
export const HULL_TOLERANCE_PCT = 1

/**
 * The hull full for the firewall and „wolne do decyzji” (AP-17, T372): from 99 % of its target – it follows the average
 * costs, so after a month's turn it ends a few złoty short until the next delivery. null = the target unknown.
 */
export const hullCountsFull = (hull: number, target: number | null): boolean => target != null && hull * 100 >= target * (100 - HULL_TOLERANCE_PCT)

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
export function nextPaymentOf(c: CycleOf & Pick<Container, 'dueDay'>, today: string): string {
  const at = (month: string) => `${month}-${String(Math.min(c.dueDay, daysInMonth(month))).padStart(2, '0')}`
  const due = cyclePosition(c, today.slice(0, 7)).dueMonth
  const date = at(due)
  if (date >= today) return date
  // This cycle's payment day has passed (earlier this month): the next cycle.
  return at(cyclePosition(c, addMonths(due, 1)).dueMonth)
}

/** The next payment still to make (B55): when this cycle's (`paidDue` – its due month) is paid already, the one after it. */
export function nextUnpaidOf(c: CycleOf & Pick<Container, 'dueDay'>, today: string, paidDue: string | null | undefined): string {
  const date = nextPaymentOf(c, today)
  return paidDue && date.slice(0, 7) === paidDue ? nextPaymentOf(c, addDays(date, 1)) : date
}

/** The month a periodic fee is followed from (T135): the budget's start, or its `from` when later (T136). */
export const followedFrom = (c: { from?: string | null }, start: string): string => [monthOf(start), c.from ?? ''].sort().at(-1)!

/** A periodic fee's calendar and life (a proposal of the start wizard: `from`, `until` null, not archived). */
export type FeeOf = CycleOf & Pick<Container, 'archived' | 'from' | 'until'> & { archivedAt?: string | null }

/** Payments by their day, then their operation (as the hold's index – `paymentsIndex`). */
const byDay = (a: Linked, b: Linked): number => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * The cycles (due months) a periodic fee's payments made before the budget's start paid (AP-5, T135, T345, T393): they
 * never pass the run – the money left before the opening balances – yet each pays its due as the hold counts it
 * (`paidDuesOf`, the engine's turn of the start the same): the due of its window, the next cycle's early only with the one
 * before paid; a late one the late due (the fee followed from its first payment seen – przegląd N2 4), never the next.
 * The start wizard reads it; `paid` – the payments (a day alone: the fee's amount then).
 */
export function paidBeforeStart(c: FeeDuesOf, paid: Iterable<string | { date: string; amount: number }>, start: string): Set<string> {
  const linked: Linked[] = []
  for (const p of paid) {
    const date = typeof p === 'string' ? p : p.date
    if (date < start) linked.push({ id: String(linked.length).padStart(6, '0'), date, amount: typeof p === 'string' ? amountIn(c, monthOf(date)) : p.amount, accountId: '' })
  }
  linked.sort(byDay)
  const month = monthOf(start)
  return paidDuesOf(c, linked, feeDayOf(c, linked, month), { start, month })
}

const NO_CYCLES: ReadonlySet<string> = new Set()

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
  const monthly = sum(containers.filter((c) => activeIn(c, month)).map((c) => monthlyWeight(c, month)))
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
  covered: settings.household.openingIds ?? null,
  assignFrom: settings.household.assignFrom
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
 * The household's ledger just before an operation (N40, D91): the operations before it in the ledger's order, up to its
 * day – what its money finds open (the editor, the purchases a repayment pays back).
 */
export function householdBefore(input: Pick<FleetInput, 'settings' | 'balances' | 'transactions'>, t: Transaction, today: string): HouseholdLedger {
  return householdOf({ ...input, transactions: input.transactions.filter((x) => x.id !== t.id && ledgerOrder(x, t) < 0) }, today, t.date)
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

/** An ICTTJ payout's pair not docked yet (AP-12): its entry's pool and day (the month of a goal without a price – N46). */
export interface PendingPair {
  pool: IctjPool
  entryDate: string
}

export interface FleetInput {
  /** `game`: the serious overrun's threshold of Dowództwo (N102) – without it the default 20%. */
  settings: Pick<Settings, 'accounts' | 'categories' | 'layers' | 'orders' | 'budget' | 'household'> & { game?: Pick<Settings['game'], 'seriousEnvelopePct'> }
  transactions: readonly Transaction[]
  /**
   * Payouts of the ICTTJ pool „Podatek” paired with operations before the budget's start (N38 – `preStartTaxOf`, the
   * renderer's: the engine never reads ICTTJ): no income. Operation id → amount.
   */
  preStartTax?: ReadonlyMap<string, number>
  /**
   * The ICTTJ payouts paired with an operation and not docked yet (AP-12, T341 – `pendingPairsOf`, the renderer's: the
   * engine never reads ICTTJ): operation id → the entry's pool and day. Counted at once by the pool, as their docking
   * without a split counts (Cele → the goals, Podatek → the tax reserve, a return of it without the firewall); a docking
   * of the operation decides over it.
   */
  pendingPairs?: ReadonlyMap<string, PendingPair>
  containers?: readonly Container[]
  goals?: readonly Goal[]
  months?: readonly MonthPlan[]
  dockings?: readonly Docking[]
  loans?: readonly Loan[]
  balances?: readonly Balance[]
  /** The moment of the state; the budget's day is its Warsaw date. */
  now: Date | string
  /**
   * The game's day (F28, D73): the covers of an overrun made from this moment on (ISO – the rated day's start) do not
   * count – the day is rated by the limits before them.
   */
  coversBefore?: string
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
  /** No layer (F28): the part of `energy` the loot keeps in a planned envelope for its month (its limit grows by it). */
  envelopes?: Record<string, number>
}

export interface FleetEvent {
  date: string
  /**
   * 'goal' = a goal's money moved out (to the shields or another goal – 1.4.2); 'tank' = a tank's rest back to the
   * shields after its fee's life (1.4.2); 'rate' = a goal's installment from the salary (1.8.0, F15); 'hull' = the hull
   * topped up from the shields above their target (1.15.7, AP-17 – „Dopełnij kadłub z osłon”).
   */
  kind: 'start' | 'account' | 'household' | 'salary' | 'sinking' | 'rate' | 'month-end' | 'loot' | 'goal' | 'tank' | 'hull' | TxKind
  amount: number
  txId?: string
  /** 'loot': the month whose loot it splits (1.4.2, B10). */
  ref?: string
  /** An operation counted by its ICTTJ payout's pool before its docking (AP-12) – „do zadokowania”. */
  pending?: true
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
   * docking order fills the hull first, and the firewall lets a top-up of XTB only from there) – full from 99 % of its
   * target (AP-17, T372).
   */
  shields: { amount: number; target: number | null; free: number; over: number; min: number | null }
  hull: { amount: number; target: number | null }
  /** Every goal, archived too; `takes` = it takes money today (the loot's and an expense's choice – B13, N1). */
  goals: Array<{ id: string; name: string; amount: number; target: number; priority: number; takes: boolean }>
  energy: number
  /**
   * The periodic fees' tanks: `dueMonth` = the next payment still to make; `paidDue` = this cycle's due month when paid
   * already (B6, B55) – its due paid in Ładownia by the same payments (T393); `want` = the installment it wanted at this
   * month's turn (T29, `tankWant`) – the energy gave it or less (the log's `sinking`; without a salary nothing – C20);
   * none = the engine did not run this month's turn.
   */
  tanks: Array<{ containerId: string; name: string; amount: number; dueMonth: string; paidDue: string | null; due: number; want?: number }>
  taxHold: number
  /** The household members' advances held on the accounts (D80): a layer, never the ship's money. */
  deposit: number
  /**
   * „Do zadokowania” (AP-12): the pairs of ICTTJ payouts not docked yet, in the layers by their entry's pool – how many,
   * the money in and out (grosze, both positive) and what of it went to the goals.
   */
  toDock: { count: number; inflow: number; outflow: number; goals: number }
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
  daily: DailyState | null
  alarms: Alarm[]
  log: FleetEvent[]
}

/**
 * Today's energy (D16, T30, T295; AP-13): `left` – the allowance less today's spending (below 0 = over the day: the
 * engine's alarm and the game's violation); `energy` – what every screen shows as „Energia dziś”: `left`, never more than
 * the month's energy left (T371) – `cap` says by how much and why.
 */
export interface DailyState extends DailyAllowance {
  limit: number
  /** Spent from the daily pool before today (refunds of those days netted). */
  spentBefore: number
  /** Spent today – each main category's purchases less its refunds of today, never below 0 (T370). */
  spentToday: number
  /**
   * What today's refunds of earlier purchases returned (AP-13, D99 pkt 4 – T370): beyond the day's purchases of their
   * category – not today's energy; from tomorrow on in the days' pool (spent before), spread over the days left.
   */
  returned: number
  /** …by main category ('' – none): a purchase of its category today takes it first (the quick entry's preview). */
  returnedBy: Record<string, number>
  /** Today's energy as shown (AP-13, T371). */
  energy: number
  /**
   * The month's energy left capped today's (T371): its amount and why it is short – 'partial' a partial salary (D14),
   * 'none' no salary paid this month, 'spent' the planned envelopes, the cargo and the rest took it. null = not capped.
   */
  cap: { month: number; why: 'partial' | 'none' | 'spent' } | null
}

/**
 * An event of the calendar (the start, an account joining, a month's turn, the loot): its place among the operations is
 * `${date} ${slot} ${rest}` – an operation's is `${date} 3 ${time} ${createdAt} ${id}`.
 */
interface Ev {
  date: string
  slot: number
  rest: string
  /** Slot 3 (among the operations): when it came to FI (ms) – a goal's money moved before it goes first (AP-3). */
  at?: number
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
  /** The pair of an operation not docked yet (AP-12): its ICTTJ entry's pool counts until a docking decides. */
  const pairOf = (t: Transaction): PendingPair | undefined => (input.pendingPairs?.size && !dockingByTx.has(t.id) && (t.kind === 'trading' || t.kind === 'income') ? input.pendingPairs.get(t.id) : undefined)
  const loansById = new Map((input.loans ?? []).map((l) => [l.id, l]))
  const txs = input.transactions.filter((t) => t.date <= today)

  // ---------------------------------------------------------------- accounts and balances
  const openings = openingsOf(input.balances ?? [], today)
  const budgetStart = budgetStartOf(settings, input.balances, today)
  const countsOn = (accountId: string, date: string) => {
    const o = openings.get(accountId)
    return !o || date >= o.date
  }
  const counts = (t: Transaction) => countsOn(t.accountId, t.date)
  // Each account's operations counted, all of them and those before the budget's start – one pass (W27); a transfer in
  // one operation on both of its accounts, each side on its day (F10).
  const accountIdSet = new Set<string>()
  for (const a of settings.accounts) accountIdSet.add(a.id)
  const moved = new Map<string, number>()
  const movedBeforeStart = new Map<string, number>()
  for (const t of input.transactions)
    for (const [id, amount, date] of accountAmounts(t)) {
      if (date > today) continue
      accountIdSet.add(id)
      if (!countsOn(id, date)) continue
      moved.set(id, (moved.get(id) ?? 0) + amount)
      if (budgetStart != null && date < budgetStart) movedBeforeStart.set(id, (movedBeforeStart.get(id) ?? 0) + amount)
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
  // Income (D81): work and trading net, without the members' money and the pool „Podatek” – of a pair not docked yet too
  // (AP-12: the engine holds it in the reserve).
  let pools: ReadonlyMap<string, Pick<Docking, 'pool' | 'split'>> = dockingByTx
  if (input.pendingPairs?.size) {
    const all = new Map<string, Pick<Docking, 'pool' | 'split'>>()
    for (const [id, p] of input.pendingPairs) all.set(id, { pool: p.pool, split: null })
    // A docking decides over the pair.
    for (const [id, d] of dockingByTx) all.set(id, d)
    pools = all
  }
  const tax = taxOfDockings(pools, txs)
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
  /**
   * A side of a transfer in one operation (F10) moves the layers in their run – from the budget's start to today, its
   * account counting then –, each side on its own day as the balances count it (one before the start is in the start's
   * money, one after today in no balance yet).
   */
  const inRun = (accountId: string, date: string) => start != null && date >= start && date <= today && countsOn(accountId, date)
  const otherInRun = (t: Transaction) => isTwoSided(t) && inRun(t.counterAccountId!, t.counterDate ?? t.date)
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
  /** The loot kept in the planned envelopes (F28): month → category → grosze. */
  const envelopeExtra = new Map<string, Map<string, number>>()
  const alarms: Alarm[] = []
  const log: FleetEvent[] = []
  const toDock: FleetState['toDock'] = { count: 0, inflow: 0, outflow: 0, goals: 0 }

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
    // A return in a month whose energy ran out repays the shields first (N-PC-3): the alarm and the debriefing stay true.
    let rest = v
    const m = monthOf(t.date)
    for (let i = alarms.length - 1; i >= 0 && rest > 0; i--) {
      const a = alarms[i]!
      if (a.kind !== 'energy-exhausted' || monthOf(a.date) !== m) continue
      const back = Math.min(rest, a.amount)
      a.amount -= back
      if (a.amount <= 0) alarms.splice(i, 1)
      addShields(back, moves)
      rest -= back
    }
    if (rest > 0) {
      energy += rest
      moves.energy = (moves.energy ?? 0) + rest
    }
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
  /** What each tank wanted at this month's turn (T29, C20) – the energy gave it, or less (`FleetState.tanks[].want`). */
  const wantedNow = new Map<string, number>()
  /**
   * Each periodic fee's payments its cycles count (B55, T393), by day: an expense's parts linked to it as the run counts
   * them – a known goal's money is the goal's (T131), a part to be refunded the household's –, one per operation; the
   * ones before the budget's start too (AP-5, T345: the first salary never sets a fee paid then aside again).
   */
  const feePayments = new Map<string, Linked[]>()
  for (const t of txs) {
    if (t.kind !== 'expense' || (!t.containerId && !t.splits.length)) continue
    let byFee: Map<string, number> | null = null
    for (const p of partsOf(t)) {
      const cid = p.containerId ?? t.containerId
      const gid = p.goalId ?? t.goalId
      if (p.refundable || p.amount >= 0 || !cid || !periodicIds.has(cid) || (gid && knownGoal(gid))) continue
      byFee ??= new Map()
      byFee.set(cid, (byFee.get(cid) ?? 0) - p.amount)
    }
    for (const [cid, amount] of byFee ?? []) {
      const p: Linked = { id: t.id, date: t.date, amount, accountId: t.accountId }
      const list = feePayments.get(cid)
      if (list) list.push(p)
      else feePayments.set(cid, [p])
    }
  }
  for (const list of feePayments.values()) list.sort(byDay)
  /** Each fee's last paid cycles: its payments then, its payment day – the same for its active dues whatever the month. */
  const paidMemo = new Map<string, { n: number; day: number; paid: ReadonlySet<string> }>()
  /**
   * The cycles (due months) of a periodic fee its payments before `before` paid (B55, T393): the dues Ładownia showed paid
   * then – the hold's one rule (`paidDuesOf`) for the month `m`, on its payment day then; a cycle paid wants nothing more.
   * The budget's dues from its first day – none before it runs (this month's only, as Ładownia).
   */
  const paidBefore = (c: Container, before: string, m: string): ReadonlySet<string> => {
    const list = feePayments.get(c.id)
    if (!list) return NO_CYCLES
    let n = 0
    while (n < list.length && list[n]!.date < before) n++
    if (!n) return NO_CYCLES
    const known = n === list.length ? list : list.slice(0, n)
    const day = paymentDay(c, known, m).day
    const memo = paidMemo.get(c.id)
    if (memo && memo.n === n && memo.day === day) return memo.paid
    const paid = paidDuesOf(c, known, day, { start: started ? start : null, month: m })
    paidMemo.set(c.id, { n, day, paid })
    return paid
  }
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
    // The shields and the hull full at the turn (before the salary): the goals' installments may come after the tanks.
    const turn = targetsAt(date)
    const full = turn.shields != null && turn.hull != null && shields >= turn.shields && hull >= turn.hull
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
    const paid = salaryOfMonth.has(m)
    // The tanks of the periodic fees, from this month's energy – none without a salary (C20: what each wanted is kept for
    // this month's plan, beside the 0 taken).
    for (const c of containers) {
      if (c.cycleMonths <= 1 || !activeIn(c, m)) continue
      const tank = tanks.get(c.id) ?? 0
      // This cycle paid already (early – B55, before the start – AP-5) as Ładownia showed it then (T393): nothing more to
      // collect for it.
      const want = tankWant(c, m, tank, paidBefore(c, date, m))
      if (m === month) wantedNow.set(c.id, want)
      if (!paid) continue
      const take = Math.min(want, Math.max(0, energy))
      if (!take) continue
      energy -= take
      tanks.set(c.id, tank + take)
      record({ date, kind: 'sinking', amount: take, moves: { energy: -take, tanks: { [c.id]: take } } })
    }
    // The goals' installments from the salary (F15, D87): after the tanks, only with the shields and the hull full at the
    // turn – they come first (D13); each goal of a deadline with its option on this month, by the priority then.
    if (!paid || !full) return
    const at = dayStart(date)
    const rated = goalsAll
      .filter((g) => ratedIn(g.rates, m) && goalTakes(g, at))
      .map((g) => ({ g, then: goalAt(g, at) }))
      .sort((a, b) => a.then.priority - b.then.priority || a.g.createdAt.localeCompare(b.g.createdAt) || a.g.id.localeCompare(b.g.id))
    for (const { g, then } of rated) {
      if (!then.deadline) continue
      const want = goalInstallment(then.target - (goalAmount.get(g.id) ?? 0), m, then.deadline)
      const take = Math.min(want, Math.max(0, energy))
      if (take <= 0) continue
      energy -= take
      const moves: Moves = { energy: -take }
      addGoal(g.id, take, moves)
      record({ date, kind: 'rate', amount: take, ref: g.id, moves })
    }
  }

  /**
   * A payout by its ICTTJ pool (D55, T65): Cele → the goals, Podatek → outside the budget, the rest by the docking order.
   * `d` – the operation's docking (when the money came in – `cameIn`); `entryDate` – the ICTTJ payout's day (N46).
   */
  const dockByPool = (v: number, t: Transaction, d: Docking | undefined, pool: IctjPool | null, entryDate: string, moves: Moves) => {
    if (pool === 'goals') fillGoals(v, cameIn(t, d), moves, entryDate)
    else if (pool === 'tax') {
      taxHold += v
      moves.taxHold = (moves.taxHold ?? 0) + v
    } else dock(v, t.date, cameIn(t, d), moves)
  }
  /** An operation in the run; `on` – the day it moves the layers (a transfer's other side alone – its own day). */
  const runTx = (t: Transaction, on = t.date) => {
    const moves: Moves = {}
    const amt = t.amount
    // Paired with an ICTTJ payout, not docked yet (AP-12): counted by the entry's pool at once – the docking confirms it.
    const pair = pairOf(t)
    switch (t.kind) {
      case 'expense': {
        for (const p of partsOf(t)) {
          // A household member's part: the ledger's (below).
          if (p.refundable) continue
          const cid = p.containerId ?? t.containerId
          const container = cid ? containerById.get(cid) : undefined
          // Its tank pays only during the fee's life: a payment before it (the history linked to a fee added later – B56)
          // or after it is an ordinary expense.
          const periodic = container && container.cycleMonths > 1 && activeIn(container, monthOf(t.date)) ? container : undefined
          const gid = p.goalId ?? t.goalId
          const goal = gid && knownGoal(gid) ? gid : null
          if (goal) {
            if (p.amount < 0) {
              const have = goalAmount.get(goal) ?? 0
              const fromGoal = Math.min(-p.amount, Math.max(0, have))
              if (fromGoal) addGoal(goal, -fromGoal, moves)
              if (-p.amount > fromGoal) drawShields(-p.amount - fromGoal, moves)
            } else addGoal(goal, p.amount, moves)
          } else if (periodic) {
            if (p.amount < 0) {
              // The cycle it pays: the hold's rule, read at each turn and today (`paidBefore`, T393).
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
        // A payout typed on Portfel XTB as an inflow (B69), paired with its ICTTJ entry: by the entry's pool (AP-12).
        else dockByPool(rest, t, d, pair?.pool ?? null, pair?.entryDate ?? t.date, moves)
        break
      }
      case 'trading': {
        const d = dockingByTx.get(t.id)
        const pool = d ? d.pool : (pair?.pool ?? null)
        if (amt > 0) {
          // A withdrawal from the trading account (D55): the pool decides – Cele → goals, Podatek → outside the budget.
          if (d?.split) applySplit(amt, d.split, moves)
          // The ICTTJ payout's day decides a goal's month (N46: entered on the 31st, in the bank on the 2nd).
          else dockByPool(amt, t, d, pool, d?.entryDate ?? pair?.entryDate ?? t.date, moves)
        } else if (amt < 0) {
          // The tax money going back to the trading capital (an ICTTJ return of the pool „Podatek”): out of the tax
          // hold, not the budget's money – no firewall.
          if (pool === 'tax') {
            const fromHold = Math.min(-amt, Math.max(0, taxHold))
            taxHold -= fromHold
            if (fromHold) moves.taxHold = -fromHold
            if (-amt > fromHold) drawShields(-amt - fromHold, moves)
            break
          }
          // A top-up of the trading account: only from „wolne do decyzji” with full shields and hull (D23, firewall) – the
          // hull from 99 % of its target (AP-17, T372).
          const tg = targetsAt(t.date)
          const allowed = tg.shields != null && tg.hull != null && shields + amt >= tg.shields && hullCountsFull(hull, tg.hull)
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
      case 'transfer': {
        // Both sides in one operation (F10, D87): the money stays in the budget – only a side outside the run (its
        // account not counting yet, its day before the start or after today) leaves the other one moving the shields.
        const delta = isTwoSided(t) ? (inRun(t.accountId, t.date) ? amt : 0) - (otherInRun(t) ? amt : 0) : amt
        if (delta) addShields(delta, moves)
        break
      }
      case 'correction':
        addShields(amt, moves)
        break
    }
    if (!pair) return record({ date: on, kind: t.kind, amount: amt, txId: t.id, moves })
    record({ date: on, kind: t.kind, amount: amt, txId: t.id, pending: true, moves })
    toDock.count++
    if (amt > 0) toDock.inflow += amt
    else toDock.outflow -= amt
    for (const v of Object.values(moves.goals ?? {})) if (v > 0) toDock.goals += v
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
          for (const [id, v] of Object.entries(initial.tanks ?? {})) {
            if (!v || !periodicIds.has(id)) continue
            tanks.set(id, (tanks.get(id) ?? 0) + v)
            moves.tanks = { ...moves.tanks, [id]: (moves.tanks?.[id] ?? 0) + v }
            rest -= v
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
      const decision = plans.find((p) => p.month === prev)?.loot
      const decidedStamp = decision ? warsawStamp(decision.decidedAt) : null
      const decidedDate = decidedStamp ? decidedStamp.slice(0, 10) : null
      if (deadline <= today && (!decidedDate || decidedDate < firstDayOf(m) || decidedDate > today))
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
      if (decision && decidedStamp && decidedDate && decidedDate >= firstDayOf(m) && decidedDate <= today) {
        // A decision made on or after the 8th (N-PC-16) still applies at the deadline (`${m}-07`) once `decidedDate <= today`.
        const date = decidedDate >= deadline ? `${m}-07` : decidedDate
        events.push({
          date,
          slot: 3,
          rest: decidedStamp.slice(11),
          at: Date.parse(decision.decidedAt),
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
            // What a planned envelope did not spend, kept in it for this month (F28): its limit grows by it.
            for (const [id, v] of Object.entries(decision.envelopes ?? {})) {
              const take = Math.min(rest, v)
              if (take <= 0) continue
              energy += take
              moves.energy = (moves.energy ?? 0) + take
              moves.envelopes = { ...moves.envelopes, [id]: (moves.envelopes?.[id] ?? 0) + take }
              const kept = envelopeExtra.get(m) ?? new Map<string, number>()
              kept.set(id, (kept.get(id) ?? 0) + take)
              envelopeExtra.set(m, kept)
              rest -= take
            }
            const next = Math.min(rest, decision.nextMonth)
            if (next) {
              energy += next
              moves.energy = (moves.energy ?? 0) + next
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
    // A transfer in one operation whose own side is outside the run (F10): its other side alone, on that side's day, in
    // the operations' order there.
    for (const t of input.transactions) {
      if (!otherInRun(t) || inRun(t.accountId, t.date)) continue
      const date = t.counterDate ?? t.date
      events.push({ date, slot: 3, rest: opRest(t), at: Math.max(Date.parse(t.createdAt), dayStart(date)), run: () => runTx(t, date) })
    }
    const keys = new Map(events.map((e) => [e, evKey(e)]))
    events.sort((a, b) => order(keys.get(a)!, keys.get(b)!))

    // A goal's money moved out (C2, B30; AP-3 – T340 instead of T129's „at the end of its day”): at its moment `at` among
    // the events of its day – before the first one (in the engine's order) that came to FI after it (`cameIn`: an
    // operation's docking, else the operation; a loot's decision), after the day's start; nothing of its day after it –
    // after the day's last. What the goal does not hold then (money that came before it, counted later in the day's
    // order) moves at the day's end; never more than the goal holds. The hull topped up from the shields (AP-17, T373)
    // the same way: a top-up of XTB entered after it sees the hull full.
    const goalMove = (g: Goal, to: string, date: string, amount: number): number => {
      const move = Math.min(amount, goalAmount.get(g.id) ?? 0)
      if (move <= 0) return 0
      const moves: Moves = {}
      addGoal(g.id, -move, moves)
      if (to !== g.id && knownGoal(to)) addGoal(to, move, moves)
      else addShields(move, moves)
      record({ date, kind: 'goal', amount: move, moves })
      return move
    }
    /**
     * „Dopełnij kadłub z osłon” (AP-17, D99 – T373): up to `amount` from the shields above their target to what the hull
     * lacks then – never more than either, nothing with a target unknown (a later change of the targets or of the day's
     * operations moves only what is there).
     */
    const hullTopUp = (date: string, amount: number): number => {
      const tg = targetsAt(date)
      if (tg.shields == null || tg.hull == null) return 0
      const move = Math.min(amount, shields - tg.shields, tg.hull - hull)
      if (move <= 0) return 0
      const moves: Moves = { hull: move }
      hull += move
      addShields(-move, moves)
      record({ date, kind: 'hull', amount: move, moves })
      return move
    }
    /** A move at its moment: `key`, `i` – its place among the moves of the same moment (a goal and its transfer's index). */
    interface Move {
      date: string
      at: number
      key: string
      i: number
      amount: number
      run: (amount: number) => number
    }
    const transfers: Move[] = [
      ...goalsAll.flatMap((g) =>
        (g.transfers ?? []).map((tr, i) => {
          const date = warsawNow(tr.at).date
          return { date, at: Date.parse(tr.at), key: g.id, i, amount: tr.amount, run: (v: number) => goalMove(g, tr.to, date, v) }
        })
      ),
      ...plans.flatMap((p) =>
        (p.hullTopUps ?? []).map((u) => {
          const date = warsawNow(u.at).date
          return { date, at: Date.parse(u.at), key: u.id, i: 0, amount: u.amount, run: (v: number) => hullTopUp(date, v) }
        })
      )
    ]
      .filter((m) => m.date >= start && m.date <= today)
      .sort((a, b) => order(a.date, b.date) || a.at - b.at || order(a.key, b.key) || a.i - b.i)
    let nextMove = 0
    /** The day of the events run last: its transfers wait for its later events. */
    let moveDay: string | null = null
    /** The parts of `moveDay`'s moves not made at their moment (the goal did not hold them, the shields had no surplus): at the day's end. */
    let short: Array<{ m: Move; rest: number }> = []
    const moveOut = (m: Move, amount: number): number => m.run(amount)
    /** The next transfer whole – its day has nothing after it. */
    const moveNext = () => {
      const m = transfers[nextMove++]!
      moveOut(m, m.amount)
    }
    /** The end of `moveDay`: the parts its transfers could not move at their moment, then those after its last event. */
    const endMoveDay = () => {
      for (const s of short) moveOut(s.m, s.rest)
      short = []
      while (nextMove < transfers.length && transfers[nextMove]!.date === moveDay) moveNext()
    }
    /** The events of `date` come: the days before it end; true = a transfer of `date` still waits. */
    const movesWait = (date: string): boolean => {
      if (nextMove >= transfers.length && !short.length) return false
      if (moveDay !== date) {
        if (moveDay !== null) endMoveDay()
        // Days without an event of their own: their transfers at their end.
        while (nextMove < transfers.length && transfers[nextMove]!.date < date) moveNext()
        moveDay = date
      }
      return nextMove < transfers.length && transfers[nextMove]!.date === date
    }
    /** The transfers of `date` made before an event of that day that came to FI at `at` (ms). */
    const movesBefore = (date: string, at: number) => {
      while (nextMove < transfers.length && transfers[nextMove]!.date === date && transfers[nextMove]!.at < at) {
        const m = transfers[nextMove++]!
        const moved = moveOut(m, m.amount)
        if (moved < m.amount) short.push({ m, rest: m.amount - moved })
      }
    }
    const runEvent = (e: Ev) => {
      // The calendar's day start (the start, a month's turn, the loot's deadline) comes before the day's transfers.
      if (movesWait(e.date) && e.slot === 3) movesBefore(e.date, e.at ?? -Infinity)
      e.run()
    }
    // The operations in their order, merged with the calendar's events (W27) – no event, key or closure for each.
    let next = 0
    for (const t of sortedOps(input.transactions)) {
      if (t.date < start || t.date > today || !counts(t)) continue
      while (next < events.length && evFirst(events[next]!, t)) runEvent(events[next++]!)
      if (movesWait(t.date)) movesBefore(t.date, cameIn(t, dockingByTx.get(t.id)))
      runTx(t)
    }
    while (next < events.length) runEvent(events[next++]!)
    if (moveDay !== null) endMoveDay()
    while (nextMove < transfers.length) moveNext()
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
    /** Today's daily spending by main category ('' – none): its refunds net its purchases first (T370). */
    const todayBy = new Map<string, number>()
    for (const t of txs) {
      if (monthOf(t.date) !== month || t.kind !== 'expense' || t.goalId || isCargoPayment(t, containerIds)) continue
      for (const p of partsOf(t)) {
        if (p.refundable || p.goalId || isCargoPayment(p, containerIds)) continue
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
          if (t.date === today) todayBy.set(main?.id ?? '', (todayBy.get(main?.id ?? '') ?? 0) + cost)
          else dailyBefore += cost
        }
      }
    }
    // A refund of an earlier purchase (AP-13, D99 pkt 4 – T370): today's refunds of a category return its purchases of
    // today first (goods taken back the same day); what they return beyond them is not today's energy – from tomorrow it
    // is spent before (less), so the days left share it.
    let dailyToday = 0
    let returned = 0
    const returnedBy: Record<string, number> = {}
    for (const [key, v] of todayBy) {
      if (v >= 0) dailyToday += v
      else {
        returned -= v
        returnedBy[key] = -v
      }
    }
    let dailyLimit = dailyExtra.get(month) ?? 0
    // The loot kept in the envelopes (F28) and the covers of the month's own plan – the game's day without its own (D73).
    const kept = envelopeExtra.get(month)
    const moved = coverMoves(plans.find((p) => p.month === month), nowMs, input.coversBefore ? Date.parse(input.coversBefore) : Infinity)
    for (const main of cats.mains) {
      const kind = envelopeKind(main)
      if (!kind) continue
      const base = plan.envelopes[main.id]
      const extra = (kept?.get(main.id) ?? 0) + (moved.get(main.id) ?? 0)
      const limit = base == null && !extra ? null : Math.max(0, (base ?? 0) + extra)
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
    // Never more than the month's energy left (AP-13, D99 pkt 4 – T371): a partial salary, none, or the month's energy
    // taken by the planned envelopes and the cargo leave less for today than the daily pool says. The layers run only.
    const shown = started ? cappedEnergy(d.left, energy) : d.left
    const paid = salaryOfMonth.get(month)
    const cap: DailyState['cap'] = shown < d.left ? { month: energy, why: !paid ? 'none' : paid.alarm === 'red' ? 'partial' : 'spent' } : null
    daily = { ...d, limit: dailyLimit, spentBefore: dailyBefore, spentToday: dailyToday, returned, returnedBy, energy: shown, cap }
    if (d.left < 0) alarms.push({ kind: 'daily-over', level: 'yellow', date: today, amount: -d.left })
  }

  if (started) {
    if (shields < 0) alarms.push({ kind: 'deficit', level: 'red', date: today, amount: -shields })
    else if (minShields != null && shields < minShields) alarms.push({ kind: 'shields-below-min', level: 'yellow', date: today, amount: minShields - shields })
  }
  for (const t of txs) if (t.kind === 'correction' && !t.explained && counts(t)) alarms.push({ kind: 'correction', level: 'yellow', date: t.date, amount: t.amount, txId: t.id })
  const cargo = cargoMass(containers, month, salary, settings.orders.cargoLimitPct)
  if (cargo.over) alarms.push({ kind: 'cargo-over', level: 'yellow', date: today, amount: cargo.monthly })
  if (salary != null && income.average != null && salary > income.average) alarms.push({ kind: 'salary-above-income', level: 'yellow', date: today, amount: salary - income.average })

  const overTarget = targets.shields != null ? Math.max(0, shields - targets.shields) : 0
  // „Wolne do decyzji” with the hull from 99 % of its target (AP-17, T372) – as the firewall lets a top-up of XTB.
  const hullFull = hullCountsFull(hull, targets.hull)
  /** The tank's cycle: this one, or – paid already by today's payments, as Ładownia shows it (T393) – the next one (B6). */
  const tankCycle = (c: Container) => {
    const due = cyclePosition(c, month).dueMonth
    return paidBefore(c, addDays(today, 1), month).has(due) ? { dueMonth: cyclePosition(c, addMonths(due, 1)).dueMonth, paidDue: due } : { dueMonth: due, paidDue: null }
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
      .map((c) => {
        const cycle = tankCycle(c)
        const want = wantedNow.get(c.id)
        // The payment it collects for at its amount then (F9: a raise from a month on).
        return { containerId: c.id, name: c.name, amount: tanks.get(c.id) ?? 0, ...cycle, due: amountIn(c, cycle.dueMonth), ...(want != null ? { want } : {}) }
      }),
    taxHold,
    deposit,
    toDock,
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
