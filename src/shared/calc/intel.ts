/**
 * The intelligence layer (E8, spec „Wywiad i raporty”, D73): the structure of the own money read like a chart – the
 * wealth week by week with its drawdown and BOS / CHoCH, the killzones of spending, the spending over time, the range
 * forecast without any payout, the captain's log accuracy; and the reports – the watch report of a week and the year's
 * review. Pure.
 */
import type { Balance, Transaction } from '../schema/records'
import type { Category, Orders } from '../schema/budget'
import { addDays, addMonths, daysBetween, firstDayOf, lastDayOf, monthOf, monthRange, mondayOf, weekdayOf } from './dates'
import type { FleetEvent } from './fleet'
import { financedBy } from './household'
import { incomeOfPeriod, plainIncomeContext, type IncomeContext } from './income'
import { asksImpulse, categoryIndex, costOf, partsOf, sum } from './operations'

// ------------------------------------------------------------------ the wealth curve

export interface WealthPoint {
  /** The week's end (Sunday) – today for the running week. */
  date: string
  /** The money on the budget's accounts at that day's end. */
  value: number
  /** Below the highest value so far (≤ 0). */
  drawdown: number
}

/** The balance of every account at the end of each day asked: from its latest opening, back and forth (imported history). */
export function balancesAt(dates: readonly string[], transactions: readonly Transaction[], balances: readonly Balance[], accountIds: readonly string[], today: string): number[] {
  const openings = new Map<string, Balance>()
  for (const b of balances) {
    if (b.kind !== 'opening' || b.date > today) continue
    const prev = openings.get(b.accountId)
    if (!prev || b.date > prev.date || (b.date === prev.date && b.updatedAt > prev.updatedAt)) openings.set(b.accountId, b)
  }
  // Per account: the operations by date with running sums – a day's balance by a binary search (years of history).
  const byAccount = new Map<string, Transaction[]>()
  for (const t of transactions) {
    if (t.date > today) continue
    const list = byAccount.get(t.accountId)
    if (list) list.push(t)
    else byAccount.set(t.accountId, [t])
  }
  const ledgers = new Map<string, { dates: string[]; cum: number[] }>()
  for (const [id, list] of byAccount) {
    list.sort((a, b) => a.date.localeCompare(b.date))
    let run = 0
    ledgers.set(id, { dates: list.map((t) => t.date), cum: list.map((t) => (run += t.amount)) })
  }
  /** The sum of an account's operations dated before `date` (`inclusive`: on it too). */
  const upTo = (id: string, date: string, inclusive: boolean): number => {
    const l = ledgers.get(id)
    if (!l) return 0
    let lo = 0
    let hi = l.dates.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (inclusive ? l.dates[mid]! <= date : l.dates[mid]! < date) lo = mid + 1
      else hi = mid
    }
    return lo ? l.cum[lo - 1]! : 0
  }
  const ids = [...new Set([...accountIds, ...openings.keys()])]
  return dates.map((d) =>
    sum(
      ids.map((id) => {
        const o = openings.get(id)
        // The opening is the balance before its day's operations (as the engine counts it).
        if (!o) return upTo(id, d, true)
        if (d >= o.date) return o.amount + upTo(id, d, true) - upTo(id, o.date, false)
        return o.amount - (upTo(id, o.date, false) - upTo(id, d, true))
      })
    )
  )
}

/** The wealth at the end of every week from the first known data to today, with the drawdown. */
export function wealthCurve(transactions: readonly Transaction[], balances: readonly Balance[], accountIds: readonly string[], today: string): WealthPoint[] {
  const first = [...transactions.map((t) => t.date), ...balances.map((b) => b.date)].filter((d) => d <= today).sort()[0]
  if (!first) return []
  const dates: string[] = []
  for (let d = addDays(mondayOf(first), 6); d < today; d = addDays(d, 7)) dates.push(d)
  dates.push(today)
  const values = balancesAt(dates, transactions, balances, accountIds, today)
  let peak = -Infinity
  return dates.map((date, i) => {
    peak = Math.max(peak, values[i]!)
    return { date, value: values[i]!, drawdown: values[i]! - peak }
  })
}

export interface StructureMark {
  date: string
  /** BOS – a break of the last swing in the trend's direction; CHoCH – the first break against it (a change). */
  kind: 'bos' | 'choch'
  direction: 'up' | 'down'
  /** The swing's level broken. */
  level: number
}

/**
 * The market structure of the wealth (D73): swings of the weekly closes (higher / lower than both neighbours), a close
 * past the last swing high or low is a BOS in the trend's direction, a CHoCH against it.
 */
export function structureOf(points: readonly Pick<WealthPoint, 'date' | 'value'>[]): { marks: StructureMark[]; trend: 'up' | 'down' | null } {
  const marks: StructureMark[] = []
  let high: number | null = null
  let low: number | null = null
  let trend: 'up' | 'down' | null = null
  for (let j = 0; j < points.length; j++) {
    const v = points[j]!.value
    if (high != null && v > high) {
      marks.push({ date: points[j]!.date, kind: trend === 'down' ? 'choch' : 'bos', direction: 'up', level: high })
      trend = 'up'
      high = null
    } else if (low != null && v < low) {
      marks.push({ date: points[j]!.date, kind: trend === 'up' ? 'choch' : 'bos', direction: 'down', level: low })
      trend = 'down'
      low = null
    }
    // The point before is a swing once this one confirms it.
    if (j >= 2) {
      const a = points[j - 2]!.value
      const b = points[j - 1]!.value
      if (b > a && b > v) high = b
      else if (b < a && b < v) low = b
    }
  }
  return { marks, trend }
}

// ------------------------------------------------------------------ the killzones of spending

export interface KillzoneCell {
  weekday: number
  hour: number
  cost: number
  count: number
}

/** Spending by weekday × hour (spec: only the entries with a time). */
export function killzoneGrid(transactions: readonly Transaction[], from: string, to: string): { cells: Map<string, KillzoneCell>; total: number; withTime: number; withoutTime: number } {
  const cells = new Map<string, KillzoneCell>()
  let total = 0
  let withTime = 0
  let withoutTime = 0
  for (const t of transactions) {
    if (t.date < from || t.date > to) continue
    const cost = costOf(t)
    if (cost <= 0) continue
    if (t.time == null) {
      withoutTime++
      continue
    }
    const weekday = weekdayOf(t.date)
    const hour = Number(t.time.slice(0, 2))
    const key = `${weekday}:${hour}`
    const c = cells.get(key) ?? { weekday, hour, cost: 0, count: 0 }
    c.cost += cost
    c.count++
    cells.set(key, c)
    total += cost
    withTime++
  }
  return { cells, total, withTime, withoutTime }
}

// ------------------------------------------------------------------ spending over time

/** Net costs by main category, month by month (`months` in order); the cargo (container payments) as its own row. */
export function spendingByMonth(transactions: readonly Transaction[], categories: readonly Category[], months: readonly string[]): { rows: Array<{ id: string; values: number[]; total: number }>; totals: number[]; cargo: number[] } {
  const cats = categoryIndex(categories)
  const index = new Map(months.map((m, i) => [m, i]))
  const byCat = new Map<string, number[]>()
  const cargo = months.map(() => 0)
  const totals = months.map(() => 0)
  for (const t of transactions) {
    const i = index.get(monthOf(t.date))
    if (i == null || t.kind !== 'expense' || t.goalId) continue
    totals[i]! += costOf(t)
    if (t.containerId) {
      cargo[i]! += costOf(t)
      continue
    }
    for (const p of partsOf(t)) {
      if (p.refundable) continue
      const id = cats.mainOf(p.categoryId)?.id ?? '-'
      const row = byCat.get(id) ?? months.map(() => 0)
      row[i]! -= p.amount
      byCat.set(id, row)
    }
  }
  const rows = [...byCat.entries()].map(([id, values]) => ({ id, values, total: sum(values) })).sort((a, b) => b.total - a.total)
  return { rows, totals, cargo }
}

// ------------------------------------------------------------------ the range forecast

/** The fuel without any payout (spec): the shields and the hull less the debt, spent at the average costs month by month. */
export function rangeForecast(o: { shields: number; hull: number; debt: number; costs: number | null; month: string; horizon?: number }): { points: Array<{ month: string; fuel: number }>; emptyIn: number | null } {
  const start = Math.max(0, o.shields + o.hull - o.debt)
  if (!o.costs || o.costs <= 0) return { points: [{ month: o.month, fuel: start }], emptyIn: null }
  const horizon = o.horizon ?? 24
  const points: Array<{ month: string; fuel: number }> = []
  for (let i = 0; i <= horizon; i++) {
    const fuel = Math.max(0, start - i * o.costs)
    points.push({ month: addMonths(o.month, i), fuel })
    if (!fuel) break
  }
  return { points, emptyIn: start / o.costs }
}

// ------------------------------------------------------------------ the captain's log

export interface LogMonth {
  month: string
  plan: { count: number; amount: number }
  impulse: { count: number; amount: number }
  /** Purchases from the threshold without a mark (imported). */
  unmarked: number
}

/** „Plan czy impuls” month by month (spec): how many impulses, for how much. */
export function logAccuracy(transactions: readonly Transaction[], orders: Pick<Orders, 'impulseThreshold'>, months: readonly string[]): LogMonth[] {
  return months.map((month) => {
    const out: LogMonth = { month, plan: { count: 0, amount: 0 }, impulse: { count: 0, amount: 0 }, unmarked: 0 }
    for (const t of transactions) {
      if (monthOf(t.date) !== month || t.kind !== 'expense' || t.amount >= 0) continue
      if (t.impulse === 'plan') {
        out.plan.count++
        out.plan.amount -= t.amount
      } else if (t.impulse === 'impulse') {
        out.impulse.count++
        out.impulse.amount -= t.amount
      } else if (asksImpulse(t, orders)) out.unmarked++
    }
    return out
  })
}

// ------------------------------------------------------------------ the reports

export interface WeekNumbers {
  from: string
  to: string
  costs: number
  income: number
  /** Costs day by day, Monday first. */
  days: Array<{ date: string; costs: number }>
  /** The categories of the week by cost. */
  categories: Array<{ id: string; cost: number }>
}

/** A week in numbers (the watch report, spec: on Sunday); `start` = the budget's (the household's balances – D80). */
/** `income` – what is income (D81, `FleetState.incomeContext`): not the household members' money, trading net. */
export function weekNumbers(transactions: readonly Transaction[], categories: readonly Category[], monday: string, income: IncomeContext = plainIncomeContext(transactions)): WeekNumbers {
  const to = addDays(monday, 6)
  const cats = categoryIndex(categories)
  const txs = transactions.filter((t) => t.date >= monday && t.date <= to)
  const byCat = new Map<string, number>()
  for (const t of txs) {
    if (t.kind !== 'expense' || t.goalId) continue
    for (const p of partsOf(t)) {
      if (p.refundable) continue
      const id = t.containerId ? 'cargo' : (cats.mainOf(p.categoryId)?.id ?? '-')
      byCat.set(id, (byCat.get(id) ?? 0) - p.amount)
    }
  }
  return {
    from: monday,
    to,
    costs: sum(txs.map(costOf)),
    income: incomeOfPeriod(txs, income).total,
    days: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i)
      return { date, costs: sum(txs.filter((t) => t.date === date).map(costOf)) }
    }),
    categories: [...byCat.entries()].map(([id, cost]) => ({ id, cost })).filter((c) => c.cost > 0).sort((a, b) => b.cost - a.cost)
  }
}

/**
 * What each envelope can take in the next days of its month (the watch report's plan): what is left over the days left
 * after today, for up to 7 of them (`days` – fewer at the month's end: the envelopes start again on the 1st).
 */
export function nextWeekEnvelopes(envelopes: ReadonlyArray<{ categoryId: string; limit: number; spent: number }>, today: string): Array<{ categoryId: string; week: number; left: number; days: number }> {
  const daysLeft = Math.max(1, daysBetween(today, lastDayOf(monthOf(today))))
  const days = Math.min(7, daysLeft)
  return envelopes.map((e) => {
    const left = Math.max(0, e.limit - e.spent)
    return { categoryId: e.categoryId, left, week: Math.floor((left * days) / daysLeft), days }
  })
}

export interface YearNumbers {
  year: string
  months: Array<{ month: string; costs: number; income: number }>
  costs: number
  income: number
  categories: Array<{ id: string; cost: number }>
  /** What household members financed in the year (D80): apart from the costs, by member. */
  financed: Array<{ memberId: string; amount: number }>
}

/**
 * A year in numbers (the year's review, spec: in January); `ctx` – what is income (D81). The year's income nets the
 * trading over the whole year (a withdrawal in January and a top-up in March cancel out), each month over itself.
 */
export function yearNumbers(transactions: readonly Transaction[], categories: readonly Category[], year: string, ctx: IncomeContext = plainIncomeContext(transactions)): YearNumbers {
  const months = monthRange(`${year}-01`, `${year}-12`)
  const spend = spendingByMonth(transactions, categories, months)
  const income = months.map((m) => incomeOfPeriod(transactions.filter((t) => monthOf(t.date) === m), ctx).total)
  return {
    year,
    months: months.map((month, i) => ({ month, costs: spend.totals[i]!, income: income[i]! })),
    costs: sum(spend.totals),
    income: incomeOfPeriod(transactions.filter((t) => t.date.startsWith(`${year}-`)), ctx).total,
    categories: [...spend.rows.map((r) => ({ id: r.id, cost: r.total })), { id: 'cargo', cost: sum(spend.cargo) }].filter((c) => c.cost > 0).sort((a, b) => b.cost - a.cost),
    financed: financedBy(transactions.filter((t) => t.date.startsWith(`${year}-`)))
  }
}

/** The watch report's hour on Sunday (D73): the notification and the report's default week. */
export const WATCH_TIME = '18:00'

/** The watch report's week: this one from Sunday 18:00, else the last whole one. */
export function defaultWatchMonday(today: string, time: string): string {
  return weekdayOf(today) === 7 && time >= WATCH_TIME ? mondayOf(today) : addDays(mondayOf(today), -7)
}

/** The wealth of a year's review: at the end of the day before 1 January and of 31 December (or today, this year). */
export function yearWealth(transactions: readonly Transaction[], balances: readonly Balance[], accountIds: readonly string[], year: string, today: string): { start: number; end: number } {
  const end = `${year}-12-31` < today ? `${year}-12-31` : today
  const [a, b] = balancesAt([addDays(firstDayOf(`${year}-01`), -1), end], transactions, balances, accountIds, today)
  return { start: a!, end: b! }
}

/** The goals that reached their target in a year (the engine's log: the first day their money came to the target). */
export function goalsReachedIn(log: readonly FleetEvent[], goals: ReadonlyArray<{ id: string; name: string; target: number }>, year: string): string[] {
  const amount = new Map<string, number>()
  const reached = new Map<string, string>()
  for (const e of log) {
    for (const [id, v] of Object.entries(e.moves.goals ?? {})) {
      const now = (amount.get(id) ?? 0) + v
      amount.set(id, now)
      const g = goals.find((x) => x.id === id)
      if (g && g.target > 0 && now >= g.target && !reached.has(id)) reached.set(id, e.date)
    }
  }
  return goals.filter((g) => reached.get(g.id)?.startsWith(year)).map((g) => g.name)
}
