/**
 * The course for 12 months (1.8.0, F27 – „Kurs na 12 miesięcy”) and the maneuvers' simulator (F35): the layers month by
 * month ahead, from today's, by the rules of the engine – the salary from the shields on the 1st (the hull when they
 * lack – D14), the goals' installments from it when the shields and the hull were full (F15), the month's costs at their
 * average from the salary and over it from the shields, what the salary leaves back to the shields (the loot – D18),
 * the income docked by the order (D13), the planned operations (F16) and the repayments expected in their months. Three
 * courses by the income: without the payouts from XTB, the median and the average of the last 12 months. Nothing is
 * stored; a maneuver is a changed input. Pure.
 */
import { addMonths } from './dates'
import { dockAmount, goalInstallment, paySalary, rangeMonths, ratedIn, shipClass, type DockTargets, type ShipClass } from './fleet'
import type { IncomeStats } from './income'

export const COURSE_MONTHS = 12

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
  /** A goal's money spent in a month (F35: a purchase from a goal) – what it lacks the shields pay. */
  fromGoals?: ReadonlyArray<{ month: string; goalId: string; amount: number }>
  horizon?: number
}

export interface CourseMonth {
  month: string
  salary: number
  /** The part of the salary the hull paid (the shields lacked – D14). */
  fromHull: number
  income: number
  /** The planned operations and the repayments of the month (signed). */
  extras: number
  /** The goals' installments from the salary (F15). */
  rates: number
  /** The shields' lowest point of the month: after the salary, the costs and the planned payments, before the income. */
  low: number
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
  /** The range now, after this month's planned operations (the maneuver's purchase now too). */
  rangeNow: number | null
  months: CourseMonth[]
  /** The first month the shields and the hull end full (null = not in the course). */
  shieldsFull: string | null
  hullFull: string | null
  /** Each goal's month (null = not in the course; a goal full now – this month). */
  goalEta: Record<string, string | null>
  /** Months under the minimum of the shields, and months the hull paid the salary. */
  belowMin: string[]
  fromHull: string[]
}

/** The income a month of each course (F27): work alone, the medians, the averages of the last 12 months. */
export function courseIncome(stats: IncomeStats, kind: CourseKind): { work: number; trading: number } {
  if (kind === 'average') return { work: stats.windows[12].work ?? 0, trading: stats.windows[12].trading ?? 0 }
  return { work: stats.median.work ?? 0, trading: kind === 'noXtb' ? 0 : (stats.median.trading ?? 0) }
}

export function course(input: CourseInput, kind: CourseKind): Course {
  const horizon = input.horizon ?? COURSE_MONTHS
  let shields = input.shields
  let hull = input.hull
  const goals = input.goals.map((g) => ({ ...g }))
  const goalEta: Record<string, string | null> = {}
  for (const g of goals) goalEta[g.id] = g.target > 0 && g.amount >= g.target ? input.month : null
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
  /** A purchase from a goal's money (F35): the goal pays what it holds, the shields the rest – as the engine's expense. */
  const spendGoals = (month: string) => {
    for (const x of input.fromGoals ?? []) {
      if (x.month !== month) continue
      const g = goals.find((y) => y.id === x.goalId)
      const fromGoal = Math.min(x.amount, Math.max(0, g?.amount ?? 0))
      if (g) g.amount -= fromGoal
      if (x.amount > fromGoal) drawShields(x.amount - fromGoal)
    }
  }
  // This month's rest: its planned operations and repayments still to come (its salary and costs are behind it).
  const now = input.extras.get(input.month) ?? 0
  if (now < 0) drawShields(-now)
  else dock(now, targetsOf(input.salaryOf(input.month)))
  spendGoals(input.month)
  // Now the whole debt: an installment of this month or a late one is not paid yet (it leaves `debt` when it is).
  const rangeNow = rangeMonths(shields, hull, costs, input.debt)
  const months: CourseMonth[] = []
  let shieldsFull: string | null = null
  let hullFull: string | null = null
  for (let i = 1; i <= horizon; i++) {
    const month = addMonths(input.month, i)
    const salary = input.salaryOf(month) ?? 0
    const targets = targetsOf(salary)
    const full = targets.shields != null && targets.hull != null && shields >= targets.shields && hull >= targets.hull
    // The turn: the salary from the shields, the hull when they lack (D14).
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
    const spend = costs ?? salary
    const fromEnergy = Math.min(spend, Math.max(0, energy))
    energy -= fromEnergy
    if (spend > fromEnergy) drawShields(spend - fromEnergy)
    const extras = input.extras.get(month) ?? 0
    if (extras < 0) drawShields(-extras)
    spendGoals(month)
    const low = shields
    // The income docked by the order (D13), the planned money in too; what the salary left – back to the shields.
    const trading = i <= (input.noTradingMonths ?? 0) ? 0 : input.income.trading
    const income = input.income.work + trading
    dock(income + Math.max(0, extras), targets)
    shields += energy
    const min = salary > 0 ? Math.round(Math.min(input.minShieldSalaries, input.layers.shieldSalaries) * salary) : null
    const range = rangeMonths(shields, hull, costs, debtAt(month))
    for (const g of goals) if (goalEta[g.id] == null && g.target > 0 && g.amount >= g.target) goalEta[g.id] = month
    if (!shieldsFull && targets.shields != null && shields >= targets.shields) shieldsFull = month
    if (!hullFull && targets.hull != null && hull >= targets.hull) hullFull = month
    months.push({
      month,
      salary,
      fromHull: pay.fromHull,
      income,
      extras,
      rates,
      low,
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
    months,
    shieldsFull,
    hullFull,
    goalEta,
    belowMin: months.filter((m) => m.belowMin).map((m) => m.month),
    fromHull: months.filter((m) => m.fromHull > 0).map((m) => m.month)
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
    if (from === 'shields') {
      const extras = new Map(input.extras)
      extras.set(month, (extras.get(month) ?? 0) - amount)
      next.extras = extras
    } else next.fromGoals = [...(input.fromGoals ?? []), { month, goalId: from, amount }]
  }
  return next
}
