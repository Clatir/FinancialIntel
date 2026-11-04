/**
 * The course for 12 months (1.8.0, F27 – „Kurs na 12 miesięcy”) and the maneuvers' simulator (F35): the layers month by
 * month ahead, from today's, by the rules of the engine – the salary from the shields on the 1st (the hull when they
 * lack – D14), the goals' installments from it when the shields and the hull were full (F15), the month's costs at their
 * average from the salary and over it from the shields, what the salary leaves back to the shields (the loot – D18),
 * the income docked by the order (D13), the planned operations (F16) and the repayments expected in their months. Three
 * courses by the income: without the payouts from XTB, the median and the average of the last 12 months. Nothing is
 * stored; a maneuver is a changed input. Pure.
 *
 * AP-18 (AF-32, AF-33): the shields never end a month below zero – what the month lacks (the costs and the payments over
 * the shields, the hull and its income) is its `short`, a salary the shields and the hull cannot pay whole its `partial`
 * (the engine's red alarm, `paySalary`); „teraz” is the state the engine has now (`rangeNow` = Mostek), the month's rest
 * of buoys and repayments only in `rangeRest`; a layer full now is full this month.
 *
 * N3 integration (T390): the month's rest pays what its plan still spends (the envelopes, the fees due) from the month's
 * energy left – today's energy is never more (AP-13, T371) – and over it from the shields.
 */
import type { Settings } from '../schema/settings'
import type { Goal, MonthPlan, Scheduled, Transaction } from '../schema/records'
import type { CargoStatus } from './cargoStatus'
import { addMonths, monthOf } from './dates'
import { dockAmount, goalInstallment, paySalary, rangeMonths, ratedIn, shipClass, type DockTargets, type FleetState, type ShipClass } from './fleet'
import { byPriority } from './goals'
import type { IncomeStats } from './income'
import { sum } from './operations'
import { planFor } from './plan'
import { openDays, scheduledWindow } from './scheduled'

export const COURSE_MONTHS = 12
/** The buoys the course reads: its 12 months after this one, whole. */
const COURSE_DAYS = 400

export type CourseKind = 'noXtb' | 'median' | 'average'
export const COURSE_KINDS: readonly CourseKind[] = ['noXtb', 'median', 'average']
export const COURSE_LABEL: Record<CourseKind, string> = { noXtb: 'bez wypłat z XTB', median: 'mediana', average: 'średnia' }

export interface CourseGoal {
  id: string
  name: string
  amount: number
  target: number
  deadline: string | null
  rates?: ReadonlyArray<{ from: string; until: string | null }>
}

export interface CourseInput {
  /** This month: the course goes from its end, month by month. */
  month: string
  shields: number
  hull: number
  /** The goals taking money now, in the list's order (the priority). */
  goals: readonly CourseGoal[]
  /** The salary of each month (the plan in force then – `planFor`); null = none. */
  salaryOf: (month: string) => number | null
  /** The months with their own plan (a maneuver's salary stops at the next one – as „Zastosuj pensję” changes the plan). */
  planMonths?: readonly string[]
  /** The average costs a month (the engine's `costs.average`); null = not known yet. */
  costs: number | null
  layers: { shieldSalaries: number; hullMonths: number }
  /** The minimum of the shields in salaries (the orders – never above their target, B84). */
  minShieldSalaries: number
  /** The income a month by its source (`courseIncome`). */
  income: { work: number; trading: number }
  /** Money of the planned operations and the repayments expected, by month (grosze, signed): this month's rest too. */
  extras: ReadonlyMap<string, number>
  /** What the taken loans still want back, and each installment's month (the debt falls by them – the range, D72). */
  debt: number
  installments?: ReadonlyArray<{ month: string; amount: number }>
  /** Months without trading income from the first one on (F35: „bez wypłat z XTB przez N miesięcy”). */
  noTradingMonths?: number
  /**
   * The maneuver's purchases (F35): from a goal's money (`goalId` – what it lacks the shields pay) or from the shields
   * (null). Apart from `extras`: a purchase this month is in „teraz” after the maneuver, this month's buoys are not (AF-33).
   */
  purchases?: ReadonlyArray<{ month: string; goalId: string | null; amount: number }>
  /**
   * This month's energy (AP-13 – T390): `left` – the month's energy left now (the engine's `energy`: today's energy is
   * never more – T371), `needs` – what the month's plan still spends from it (the daily pool's rest for the days left,
   * the planned envelopes' rest, the fees still to pay – `restNeeds`). What `left` cannot pay comes from the shields in
   * the month's rest, as the engine's „energy-exhausted”; absent – the month's energy pays its rest (nothing drawn).
   */
  energy?: { left: number; needs: number }
  horizon?: number
}

export interface CourseMonth {
  month: string
  salary: number
  /** The part of the salary the hull paid (the shields lacked – D14). */
  fromHull: number
  /** The salary the shields and the hull could not pay (0 = whole): a partial salary, the engine's red alarm (AF-32). */
  partial: number
  income: number
  /** The planned operations and the repayments of the month (signed). */
  extras: number
  /** The goals' installments from the salary (F15). */
  rates: number
  /**
   * The shields' lowest point of the month: after the salary, the costs and the planned payments, before the income –
   * never below zero.
   */
  low: number
  /**
   * What the month lacks (AF-32): its costs and payments over the shields, the hull and its income – the shields end it
   * at zero, never below (the money is not there; the next month starts from what is).
   */
  short: number
  shields: number
  hull: number
  goals: Record<string, number>
  range: number | null
  shipClass: ShipClass | null
  /** The low point under the minimum of the shields. */
  belowMin: boolean
}

export interface Course {
  kind: CourseKind
  /** The income a month the course assumes. */
  income: number
  /**
   * The range now (AF-33): the engine's state – Mostek's range without a maneuver; a maneuver's purchase this month and
   * its costs count in it.
   */
  rangeNow: number | null
  /**
   * The range after this month's rest: what its plan spends over the month's energy left (T390), its open buoys and the
   * repayments expected (a late one too) – the course's start.
   */
  rangeRest: number | null
  /**
   * This month's rest (AP-13 – T390): `overEnergy` – what its plan still spends over the month's energy left (the shields
   * pay it – a partial salary: all of it); `short` – what the shields and the hull lack for it and the month's buoys (they
   * end the rest at zero, as a month – AF-32).
   */
  rest: { overEnergy: number; short: number }
  months: CourseMonth[]
  /** The first month the shields and the hull end full – this month when full now (null = not in the course). */
  shieldsFull: string | null
  hullFull: string | null
  /** Each goal's month (null = not in the course; a goal full now – this month). */
  goalEta: Record<string, string | null>
  /** Months under the minimum of the shields, and months the hull paid the salary. */
  belowMin: string[]
  fromHull: string[]
  /**
   * Months of a partial salary (AF-32), and what the course lacks together: this month's rest (`rest.short`) and its
   * months' (`CourseMonth.short`).
   */
  partial: string[]
  short: number
}

/** The income a month of each course (F27): work alone, the medians, the averages of the last 12 months. */
export function courseIncome(stats: IncomeStats, kind: CourseKind): { work: number; trading: number } {
  if (kind === 'average') return { work: stats.windows[12].work ?? 0, trading: stats.windows[12].trading ?? 0 }
  return { work: stats.median.work ?? 0, trading: kind === 'noXtb' ? 0 : (stats.median.trading ?? 0) }
}

/**
 * What this month's plan still spends from the month's energy (AP-13 – T390): the daily pool's rest for the days left,
 * today's included (its limit less what it took – a refund of an earlier purchase back in it, T370), each planned
 * envelope's rest and the fees still to pay (`cargoStatuses` – AP-10's one state): a monthly one whole, a periodic one
 * what its tank lacks (the energy pays a tank's shortfall – „za mało w zbiorniku”), an earlier month's due still unpaid
 * too (D99 pkt 3, `carried`).
 */
export function restNeeds(fleet: Pick<FleetState, 'daily' | 'envelopes' | 'tanks'>, cargo: ReadonlyArray<Pick<CargoStatus, 'containerId' | 'cycleMonths' | 'amount' | 'state'>> = []): number {
  const d = fleet.daily
  const pool = d ? Math.max(0, d.limit - d.spentBefore - d.spentToday + d.returned) : 0
  const planned = sum(fleet.envelopes.filter((e) => e.kind === 'planned').map((e) => Math.max(0, e.left)))
  // Each tank once: two dues of one fee (a late one and this month's) share what it holds.
  const tanks = new Map(fleet.tanks.map((t) => [t.containerId, Math.max(0, t.amount)]))
  let fees = 0
  for (const s of cargo) {
    if (s.state === 'paid') continue
    const have = s.cycleMonths > 1 ? (tanks.get(s.containerId) ?? 0) : 0
    const fromTank = Math.min(have, s.amount)
    if (fromTank) tanks.set(s.containerId, have - fromTank)
    fees += s.amount - fromTank
  }
  return pool + planned + fees
}

/**
 * The course's input from the engine's state now and the records (Wywiad): the plans, the buoys, the loans. The layers,
 * the average costs and the debt are the engine's – the course's „teraz” is Mostek's (AF-33). The income – `courseIncome`.
 * `cargo` – the fees' state (`cargoStatuses`): the month's rest pays the ones still due from its energy (T390).
 */
export function courseInputOf(
  fleet: FleetState,
  r: {
    settings: Pick<Settings, 'layers' | 'orders'>
    plans: readonly MonthPlan[]
    goals: readonly Goal[]
    scheduled: readonly Scheduled[]
    transactions: readonly Transaction[]
    cargo?: readonly CargoStatus[]
  }
): CourseInput | null {
  if (!fleet.started) return null
  const extras = new Map<string, number>()
  const add = (month: string, v: number) => extras.set(month, (extras.get(month) ?? 0) + v)
  // The buoys' open days of the course's year (a late one in this month), the repayments expected of the loans given.
  for (const d of openDays(scheduledWindow(r.scheduled, r.transactions, fleet.today, COURSE_DAYS))) if (d.scheduled.amount != null) add(d.date < fleet.today ? fleet.month : monthOf(d.date), d.scheduled.amount)
  const installments: Array<{ month: string; amount: number }> = []
  for (const l of fleet.loans) {
    if (l.loan.closedAt) continue
    for (const i of l.left) {
      if (l.loan.direction === 'given') add(i.date < fleet.today ? fleet.month : monthOf(i.date), i.amount)
      else installments.push({ month: monthOf(i.date), amount: i.amount })
    }
  }
  const records = new Map(r.goals.map((g) => [g.id, g]))
  return {
    month: fleet.month,
    shields: fleet.shields.amount,
    hull: fleet.hull.amount,
    goals: byPriority(fleet.goals.filter((g) => g.takes).map((g) => ({ ...g, createdAt: records.get(g.id)?.createdAt ?? '' }))).map((g) => ({
      id: g.id,
      name: g.name,
      amount: g.amount,
      target: g.target,
      deadline: records.get(g.id)?.deadline ?? null,
      rates: records.get(g.id)?.rates ?? []
    })),
    salaryOf: (m: string) => planFor(r.plans, m)?.salary ?? null,
    planMonths: r.plans.map((p) => p.month),
    costs: fleet.costs.average,
    layers: r.settings.layers,
    minShieldSalaries: r.settings.orders.minShieldSalaries,
    income: { work: 0, trading: 0 },
    extras,
    debt: fleet.debt,
    installments,
    // The month's rest from its energy left (AP-13 – T390): what today's energy is capped with (T371).
    energy: { left: fleet.energy, needs: restNeeds(fleet, r.cargo) }
  }
}

export function course(input: CourseInput, kind: CourseKind): Course {
  const horizon = input.horizon ?? COURSE_MONTHS
  let shields = input.shields
  let hull = input.hull
  const goals = input.goals.map((g) => ({ ...g }))
  const goalEta: Record<string, string | null> = {}
  const costs = input.costs
  const drawShields = (v: number) => {
    const fromShields = Math.min(v, Math.max(0, shields))
    const fromHull = Math.min(v - fromShields, Math.max(0, hull))
    hull -= fromHull
    shields -= v - fromHull
  }
  const targetsOf = (salary: number | null): DockTargets => ({
    shields: salary != null && salary > 0 ? input.layers.shieldSalaries * salary : null,
    hull: costs != null ? input.layers.hullMonths * costs : null
  })
  const dock = (v: number, targets: DockTargets) => {
    if (v <= 0) return
    const split = dockAmount(v, { shields, hull, goals }, targets)
    shields += split.shields
    hull += split.hull
    for (const g of goals) g.amount += split.goals[g.id] ?? 0
  }
  const debtAt = (month: string) => Math.max(0, input.debt - (input.installments ?? []).filter((i) => i.month <= month).reduce((a, i) => a + i.amount, 0))
  /** The maneuver's purchases (F35): a goal pays what it holds, the shields the rest – as the engine's expense. */
  const spend = (month: string) => {
    for (const x of input.purchases ?? []) {
      if (x.month !== month) continue
      const g = x.goalId == null ? undefined : goals.find((y) => y.id === x.goalId)
      const fromGoal = Math.min(x.amount, Math.max(0, g?.amount ?? 0))
      if (g) g.amount -= fromGoal
      if (x.amount > fromGoal) drawShields(x.amount - fromGoal)
    }
  }
  // „Teraz” (AF-33): the engine's state now, the maneuver's purchase this month in it – without a maneuver Mostek's.
  spend(input.month)
  const turnNow = targetsOf(input.salaryOf(input.month))
  // A layer or a goal full now is full this month (PR sp. 8): the course never names a later month for it.
  let shieldsFull: string | null = turnNow.shields != null && shields >= turnNow.shields ? input.month : null
  let hullFull: string | null = turnNow.hull != null && hull >= turnNow.hull ? input.month : null
  for (const g of goals) goalEta[g.id] = g.target > 0 && g.amount >= g.target ? input.month : null
  // Now the whole debt: an installment of this month or a late one is not paid yet (it leaves `debt` when it is).
  const rangeNow = rangeMonths(shields, hull, costs, input.debt)
  // This month's rest (AP-13 – T390): what its plan still spends over the month's energy left comes from the shields (the
  // hull when they lack), as the engine's „energy-exhausted” – today's energy is never more than the month's (T371): a
  // partial salary, none, or the energy spent leave the days ahead without it. What the energy leaves stays the month's
  // (the loot – D18, the captain's decision).
  const overEnergy = input.energy ? Math.max(0, input.energy.needs - Math.max(0, input.energy.left)) : 0
  if (overEnergy) drawShields(overEnergy)
  // Its planned operations and repayments still to come (its salary is behind it).
  const now = input.extras.get(input.month) ?? 0
  if (now < 0) drawShields(-now)
  else dock(now, turnNow)
  // What the rest lacks (AF-32, as a month's): the shields end it at zero – the next month starts from what is.
  const restShort = Math.max(0, -shields)
  shields += restShort
  const rangeRest = rangeMonths(shields, hull, costs, input.debt)
  const months: CourseMonth[] = []
  for (let i = 1; i <= horizon; i++) {
    const month = addMonths(input.month, i)
    const salary = input.salaryOf(month) ?? 0
    const targets = targetsOf(salary)
    const full = targets.shields != null && targets.hull != null && shields >= targets.shields && hull >= targets.hull
    // The turn: the salary from the shields, the hull when they lack (D14); neither – a partial salary (red alarm).
    const pay = paySalary(salary, shields, hull)
    shields -= pay.fromShields
    hull -= pay.fromHull
    let energy = pay.paid
    // The goals' installments from it (F15): only with the shields and the hull full at the turn (D13).
    let rates = 0
    if (full)
      for (const g of goals) {
        if (!g.deadline || !ratedIn(g.rates, month)) continue
        const take = Math.min(goalInstallment(g.target - g.amount, month, g.deadline), Math.max(0, energy))
        if (take <= 0) continue
        energy -= take
        g.amount += take
        rates += take
      }
    // The month's costs from the salary, over it from the shields; the planned payments out of the shields.
    const costsOfMonth = costs ?? salary
    const fromEnergy = Math.min(costsOfMonth, Math.max(0, energy))
    energy -= fromEnergy
    if (costsOfMonth > fromEnergy) drawShields(costsOfMonth - fromEnergy)
    const extras = input.extras.get(month) ?? 0
    if (extras < 0) drawShields(-extras)
    spend(month)
    const low = Math.max(0, shields)
    // The income docked by the order (D13), the planned money in too; what the salary left – back to the shields.
    const trading = i <= (input.noTradingMonths ?? 0) ? 0 : input.income.trading
    const income = input.income.work + trading
    dock(income + Math.max(0, extras), targets)
    shields += energy
    // What the month's income did not cover either (AF-32): lacking, not money of the shields – they end at zero.
    const short = Math.max(0, -shields)
    shields += short
    const min = salary > 0 ? Math.round(Math.min(input.minShieldSalaries, input.layers.shieldSalaries) * salary) : null
    const range = rangeMonths(shields, hull, costs, debtAt(month))
    for (const g of goals) if (goalEta[g.id] == null && g.target > 0 && g.amount >= g.target) goalEta[g.id] = month
    if (!shieldsFull && targets.shields != null && shields >= targets.shields) shieldsFull = month
    if (!hullFull && targets.hull != null && hull >= targets.hull) hullFull = month
    months.push({
      month,
      salary,
      fromHull: pay.fromHull,
      partial: salary - pay.paid,
      income,
      extras,
      rates,
      low,
      short,
      shields,
      hull,
      goals: Object.fromEntries(goals.map((g) => [g.id, g.amount])),
      range,
      shipClass: range != null ? shipClass(range) : null,
      belowMin: min != null && low < min
    })
  }
  return {
    kind,
    income: input.income.work + input.income.trading,
    rangeNow,
    rangeRest,
    rest: { overEnergy, short: restShort },
    months,
    shieldsFull,
    hullFull,
    goalEta,
    belowMin: months.filter((m) => m.belowMin).map((m) => m.month),
    fromHull: months.filter((m) => m.fromHull > 0).map((m) => m.month),
    partial: months.filter((m) => m.partial > 0).map((m) => m.month),
    short: months.reduce((a, m) => a + m.short, restShort)
  }
}

// ------------------------------------------------------------------ the maneuvers (F35)

export interface Maneuver {
  /** Another salary from a month on – up to the next month with its own plan (that one and the later ones as they are). */
  salary?: { amount: number; from: string } | null
  /** A purchase in a month: from the shields, or a goal's money (its id). */
  purchase?: { amount: number; month: string; from: 'shields' | string } | null
  /** No payouts from XTB for this many months. */
  noXtbMonths?: number | null
  /** The costs higher by this many percent. */
  costsPct?: number | null
  /** A new goal at the end of the list. */
  goal?: { name: string; target: number; deadline: string | null; rate: boolean } | null
  /** A new container: its payment and cycle (the costs grow by its monthly share). */
  container?: { amount: number; cycleMonths: number } | null
}

/** The new goal's id in a maneuver's course. */
export const MANEUVER_GOAL = 'maneuver-goal'

/** The input of the course with the maneuver made (nothing stored – F35). */
export function maneuver(input: CourseInput, m: Maneuver): CourseInput {
  const next: CourseInput = { ...input }
  if (m.salary) {
    const { amount, from } = m.salary
    const base = input.salaryOf
    const until = [...(input.planMonths ?? [])].filter((x) => x > from).sort()[0] ?? null
    next.salaryOf = (month) => (month >= from && (until == null || month < until) ? amount : base(month))
  }
  // Costs not known yet (no full month): a change of them has nothing to change – the course spends the salary.
  if ((m.costsPct || m.container) && input.costs != null) {
    const pct = m.costsPct ?? 0
    const share = m.container ? Math.round(m.container.amount / Math.max(1, m.container.cycleMonths)) : 0
    next.costs = Math.round(input.costs * (1 + pct / 100) + share)
  }
  if (m.noXtbMonths) next.noTradingMonths = m.noXtbMonths
  if (m.goal && m.goal.target > 0)
    next.goals = [...input.goals, { id: MANEUVER_GOAL, name: m.goal.name || 'Nowy cel', amount: 0, target: m.goal.target, deadline: m.goal.deadline, rates: m.goal.rate && m.goal.deadline ? [{ from: addMonths(input.month, 1), until: null }] : [] }]
  if (m.purchase && m.purchase.amount > 0) {
    const { amount, month, from } = m.purchase
    next.purchases = [...(input.purchases ?? []), { month, goalId: from === 'shields' ? null : from, amount }]
  }
  return next
}
