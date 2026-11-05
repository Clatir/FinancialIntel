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
 * N3 integration (T390, T391): the month's rest pays what its plan still spends (the envelopes, the fees due) from the
 * month's energy left – today's energy is never more (AP-13, T371) – and over it from the shields; the hull counts as
 * full from 99 % of its target (AP-17, T372), its docking and the goals' installments at 100 %.
 *
 * R2 review (T486): a taken loan's installments leave the money in their months (`loanFlows` – a late one this month), as
 * the engine pays them – a loan op from the shields, or a payment of its cargo container; the months spend the average
 * costs without the part of them those containers' payments are (`loanCosts` – the assumed costs' too), the range and the
 * hull's target read the average whole (Mostek's). This month's installment of a loan with a container in the hold (a
 * late one too) is a payment of the hold from the month's energy (`energy.needs`, as the engine's `spendEnergy`).
 * R2 review 2: the loans' money apart from the buoys – an installment out never cancels money coming back the same month
 * (the payments first, the month's low point after them); a given loan's installment back goes to the shields (the
 * engine's, T70 – not docked by the order).
 */
import type { Settings } from '../schema/settings'
import type { Container, Goal, MonthPlan, Scheduled, Transaction } from '../schema/records'
import type { CargoStatus } from './cargoStatus'
import { addMonths, monthOf } from './dates'
import { amountIn, dockAmount, goalInstallment, hullCountsFull, paySalary, rangeMonths, ratedIn, shipClass, type DockTargets, type FleetState, type ShipClass } from './fleet'
import { byPriority } from './goals'
import type { IncomeStats } from './income'
import { categoryIndex, sum } from './operations'
import { monthsBefore } from './history'
import { containerCostsByMonth, planFor } from './plan'
import { openDays, scheduledWindow } from './scheduled'

export const COURSE_MONTHS = 12
/** The buoys the course reads: its 12 months after this one, whole. */
const COURSE_DAYS = 400

export type CourseKind = 'noXtb' | 'median' | 'average'
export const COURSE_KINDS: readonly CourseKind[] = ['noXtb', 'median', 'average']
export const COURSE_LABEL: Record<CourseKind, string> = { noXtb: 'bez wypłat z XTB', median: 'mediana', average: 'średnia' }

/** A month's money of the loans (T486, R2 review 2): what leaves and what comes back – never netted. */
export interface LoanFlow {
  /** The taken loans' installments paid by the loan's operation: from the shields (the hull when they lack). */
  out: number
  /**
   * The taken loans' installments paid by their cargo container: from the month's energy left, over it from the shields
   * (the engine's `spendEnergy` – a payment of the hold).
   */
  cargo: number
  /** The given loans' installments coming back: to the shields (the engine's – up to what is owed, T70; never docked). */
  back: number
}

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
  /**
   * Of them the taken loans' installments (T486): their cargo containers' payments in the months the average reads, or –
   * the assumed costs (R2 review 2) – their containers' installment a month. The months spend `costs` without it, the
   * installments leave in their months (`loanFlows`); the range and the hull's target read `costs` whole (Mostek's).
   * Absent – none.
   */
  loanCosts?: number
  layers: { shieldSalaries: number; hullMonths: number }
  /** The minimum of the shields in salaries (the orders – never above their target, B84). */
  minShieldSalaries: number
  /** The income a month by its source (`courseIncome`). */
  income: { work: number; trading: number }
  /** Money of the planned operations (the buoys) by month (grosze, signed): this month's rest too. */
  extras: ReadonlyMap<string, number>
  /**
   * The loans' money by month (T486, R2 review 2 – `loanFlowsOf`): this month's rest too (a late installment in it). Apart
   * from `extras` – an installment out never cancels money in of the same month. Absent – none.
   */
  loanFlows?: ReadonlyMap<string, LoanFlow>
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
   * the planned envelopes' rest, the fees still to pay – `restNeeds`). What `left` cannot pay of it and of this month's
   * hold installments of the taken loans (`loanFlows` – `cargo`, R2 review 2) comes from the shields in the month's rest,
   * as the engine's „energy-exhausted”; absent – the month's energy pays its rest (nothing drawn), the shields the hold's
   * installments.
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
  /** The planned operations and the loans' money of the month (signed). */
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
  /**
   * The shields' lowest point of this month's rest: after what it pays from them, before what it brings in – never below
   * zero (the forecast's „Osłony do zera”, R2 review – T487).
   */
  restLow: number
  months: CourseMonth[]
  /**
   * The first month the shields and the hull end full – this month when full now (null = not in the course); the hull
   * full from 99 % of its target (T372 – as the firewall and „wolne do decyzji” count it; T391).
   */
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
  return pool + planned + feesDue(fleet.tanks, cargo).energy
}

/**
 * The fees still to pay this month (`cargoStatuses`), by what pays them: a periodic one's tank what it holds (each tank
 * once: two dues of one fee – a late one and this month's – share it), the month's energy the rest (`restNeeds`). The
 * forecast for years (AP-44, T486) reads the tanks' part: that money leaves the budget this month too.
 */
export function feesDue(tanks: Pick<FleetState, 'tanks'>['tanks'], cargo: ReadonlyArray<Pick<CargoStatus, 'containerId' | 'cycleMonths' | 'amount' | 'state'>> = []): { energy: number; tanks: number } {
  const held = new Map(tanks.map((t) => [t.containerId, Math.max(0, t.amount)]))
  let energy = 0
  let fromTanks = 0
  for (const s of cargo) {
    if (s.state === 'paid') continue
    const have = s.cycleMonths > 1 ? (held.get(s.containerId) ?? 0) : 0
    const fromTank = Math.min(have, s.amount)
    if (fromTank) held.set(s.containerId, have - fromTank)
    fromTanks += fromTank
    energy += s.amount - fromTank
  }
  return { energy, tanks: fromTanks }
}

const NO_FLOW: LoanFlow = { out: 0, cargo: 0, back: 0 }

/**
 * What this month's rest spends from the month's energy (T390): its plan's needs and the hold's loan installments still
 * due (R2 review 2 – the engine pays a container's payment from the energy, `spendEnergy`); null – the energy not known.
 * The course draws what `left` cannot pay from the shields, the forecast leaves what it pays out of the money.
 */
export function restEnergy(input: Pick<CourseInput, 'month' | 'energy' | 'loanFlows'>): { needs: number; left: number } | null {
  if (!input.energy) return null
  return { needs: input.energy.needs + (input.loanFlows?.get(input.month)?.cargo ?? 0), left: Math.max(0, input.energy.left) }
}

/**
 * The loans' money by month (T486, R2 review 2): a given loan's installments not covered yet come back (`back`), a taken
 * loan's leave – paid by its cargo container in the hold (`cargo`; the container not archived) or by the loan's
 * operation (`out`); a late one in this month. A closed loan – none.
 */
export function loanFlowsOf(fleet: Pick<FleetState, 'loans' | 'today' | 'month'>, containers: readonly Container[] = []): Map<string, LoanFlow> {
  const held = new Set(containers.filter((c) => c.loanId != null && !c.archived).map((c) => c.loanId!))
  const out = new Map<string, LoanFlow>()
  for (const l of fleet.loans) {
    if (l.loan.closedAt) continue
    const key: keyof LoanFlow = l.loan.direction === 'given' ? 'back' : held.has(l.loan.id) ? 'cargo' : 'out'
    for (const i of l.left) {
      const month = i.date < fleet.today ? fleet.month : monthOf(i.date)
      const f = out.get(month) ?? { ...NO_FLOW }
      f[key] += i.amount
      out.set(month, f)
    }
  }
  return out
}

/**
 * The course's input from the engine's state now and the records (Wywiad): the plans, the buoys, the loans. The layers,
 * the average costs and the debt are the engine's – the course's „teraz” is Mostek's (AF-33). The income – `courseIncome`.
 * `cargo` – the fees' state (`cargoStatuses`): the month's rest pays the ones still due from its energy (T390). A buoy
 * of this month spent from a planned envelope (its category's) is in that envelope's rest already (`restNeeds`): only
 * what it is over the rest is this month's extra (N3 review). The loans' money (T486, R2 review 2) – `loanFlowsOf`, each
 * installment in its month (a late one this month); this month's of a loan with a container in the hold (`containers`)
 * is the hold's payment from the month's energy – in `energy.needs` (the fees' state leaves the loans' containers out).
 * The part of the average costs the taken loans' containers' payments are – `loanCosts`.
 */
export function courseInputOf(
  fleet: FleetState,
  r: {
    settings: Pick<Settings, 'layers' | 'orders' | 'categories'>
    plans: readonly MonthPlan[]
    goals: readonly Goal[]
    scheduled: readonly Scheduled[]
    transactions: readonly Transaction[]
    cargo?: readonly CargoStatus[]
    /** The cargo hold's containers: a taken loan's container (`loanId`) pays its installments. Absent – none. */
    containers?: readonly Container[]
  }
): CourseInput | null {
  if (!fleet.started) return null
  const extras = new Map<string, number>()
  const add = (month: string, v: number) => extras.set(month, (extras.get(month) ?? 0) + v)
  // The buoys' open days of the course's year (a late one in this month), the repayments expected of the loans given.
  // This month's money out of a planned envelope's category is spent from that envelope (as the engine counts its
  // operation): its rest, counted by `restNeeds`, pays it first – the buoys of one envelope share it.
  const cats = categoryIndex(r.settings.categories)
  const planned = new Map(fleet.envelopes.filter((e) => e.kind === 'planned').map((e) => [e.categoryId, Math.max(0, e.left)]))
  // A yearly buoy is in the 12-month average of the history's costs already (T276, T497): never counted twice.
  const fullYearAvg = fleet.costs.source === 'history' && fleet.costs.months >= 12
  for (const d of openDays(scheduledWindow(r.scheduled, r.transactions, fleet.today, COURSE_DAYS))) {
    const amount = d.scheduled.amount
    if (amount == null || (fullYearAvg && d.scheduled.yearly)) continue
    const month = d.date < fleet.today ? fleet.month : monthOf(d.date)
    const main = month === fleet.month && amount < 0 ? cats.mainOf(d.scheduled.categoryId)?.id : undefined
    const rest = main ? (planned.get(main) ?? 0) : 0
    const fromEnvelope = Math.min(rest, -amount)
    if (main && fromEnvelope) planned.set(main, rest - fromEnvelope)
    add(month, amount + fromEnvelope)
  }
  // The debt falls by the taken loans' installments in their own months (the range – D72).
  const installments: Array<{ month: string; amount: number }> = []
  for (const l of fleet.loans) if (l.loan.direction !== 'given' && !l.loan.closedAt) for (const i of l.left) installments.push({ month: monthOf(i.date), amount: i.amount })
  // The part of the average costs the taken loans' containers' payments are (a loan closed since too: its installments
  // are in the average, none ahead). The history's average: their payments in the months it reads. The assumed costs
  // stand for that average (R2 review 2): they hold the installment of each such container in the hold this month.
  const taken = new Set(fleet.loans.filter((l) => l.loan.direction === 'taken').map((l) => l.loan.id))
  const loanContainers = (r.containers ?? []).filter((c) => c.loanId != null && taken.has(c.loanId))
  let loanCosts = 0
  if (fleet.costs.source === 'history') {
    const window = monthsBefore(fleet.historyMonths, fleet.month, 12)
    if (window.length) {
      const byContainer = containerCostsByMonth(r.transactions)
      for (const c of loanContainers) for (const m of window) loanCosts += byContainer.get(c.id)?.get(m) ?? 0
      loanCosts = Math.max(0, Math.round(loanCosts / window.length))
    }
  } else if (fleet.costs.source === 'assumed')
    for (const c of loanContainers) {
      // In the hold and not over: its installment from this month (or its first month, when it starts later).
      if (c.archived || (c.until != null && c.until < fleet.month)) continue
      loanCosts += amountIn(c, c.from != null && c.from > fleet.month ? c.from : fleet.month)
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
    ...(loanCosts ? { loanCosts } : {}),
    layers: r.settings.layers,
    minShieldSalaries: r.settings.orders.minShieldSalaries,
    income: { work: 0, trading: 0 },
    extras,
    loanFlows: loanFlowsOf(fleet, r.containers),
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
  // What the months spend (T486): the average without the taken loans' installments – those leave in their months.
  const spent = costs == null ? null : Math.max(0, costs - (input.loanCosts ?? 0))
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
  // A layer or a goal full now is full this month (PR sp. 8): the course never names a later month for it. The hull from
  // 99 % of its target (T372 – Mostek's „liczy się jako pełny”, the firewall's; T391).
  let shieldsFull: string | null = turnNow.shields != null && shields >= turnNow.shields ? input.month : null
  let hullFull: string | null = hullCountsFull(hull, turnNow.hull) ? input.month : null
  for (const g of goals) goalEta[g.id] = g.target > 0 && g.amount >= g.target ? input.month : null
  // Now the whole debt: an installment of this month or a late one is not paid yet (it leaves `debt` when it is).
  const rangeNow = rangeMonths(shields, hull, costs, input.debt)
  // This month's rest (AP-13 – T390): what its plan still spends – and the hold's loan installments still due (R2 review
  // 2) – over the month's energy left comes from the shields (the hull when they lack), as the engine's
  // „energy-exhausted” – today's energy is never more than the month's (T371): a partial salary, none, or the energy
  // spent leave the days ahead without it. What the energy leaves stays the month's (the loot – D18, the captain's
  // decision). Without the month's energy known the hold's installments come from the shields.
  const flowNow = input.loanFlows?.get(input.month) ?? NO_FLOW
  const rest = restEnergy(input)
  const overEnergy = rest ? Math.max(0, rest.needs - rest.left) : 0
  if (overEnergy) drawShields(overEnergy)
  // Its planned operations and the loans' installments still to come (its salary is behind it): the payments first –
  // the low point after them –, then what comes back (R2 review 2: never netted).
  const now = input.extras.get(input.month) ?? 0
  const paidNow = flowNow.out + (rest ? 0 : flowNow.cargo) + Math.max(0, -now)
  if (paidNow) drawShields(paidNow)
  const restLow = Math.max(0, shields)
  shields += flowNow.back
  if (now > 0) dock(now, turnNow)
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
    // The month's costs and the hold's loan installments (T486 – the engine's `spendEnergy`) from the salary, over it from
    // the shields; the loans' installments paid by their operation and the planned payments out of the shields.
    const flow = input.loanFlows?.get(month) ?? NO_FLOW
    const costsOfMonth = (spent ?? salary) + flow.cargo
    const fromEnergy = Math.min(costsOfMonth, Math.max(0, energy))
    energy -= fromEnergy
    if (costsOfMonth > fromEnergy) drawShields(costsOfMonth - fromEnergy)
    const buoys = input.extras.get(month) ?? 0
    if (flow.out + Math.max(0, -buoys)) drawShields(flow.out + Math.max(0, -buoys))
    spend(month)
    const low = Math.max(0, shields)
    // A given loan's installment back to the shields (the engine's – T70, never docked); the income docked by the order
    // (D13), the planned money in too; what the salary left – back to the shields.
    shields += flow.back
    const trading = i <= (input.noTradingMonths ?? 0) ? 0 : input.income.trading
    const income = input.income.work + trading
    dock(income + Math.max(0, buoys), targets)
    shields += energy
    const extras = buoys + flow.back - flow.out - flow.cargo
    // What the month's income did not cover either (AF-32): lacking, not money of the shields – they end at zero.
    const short = Math.max(0, -shields)
    shields += short
    const min = salary > 0 ? Math.round(Math.min(input.minShieldSalaries, input.layers.shieldSalaries) * salary) : null
    const range = rangeMonths(shields, hull, costs, debtAt(month))
    for (const g of goals) {
      if (goalEta[g.id] == null && g.target > 0 && g.amount >= g.target) goalEta[g.id] = month
      // A goal with a deadline is spent on its purchase once achieved at or after its deadline (T498).
      if (g.deadline != null && month >= g.deadline && g.target > 0 && g.amount >= g.target) {
        g.amount = 0
        g.target = 0
      }
    }
    if (!shieldsFull && targets.shields != null && shields >= targets.shields) shieldsFull = month
    if (!hullFull && hullCountsFull(hull, targets.hull)) hullFull = month
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
    restLow,
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
