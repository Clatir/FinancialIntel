/**
 * The year's plan (1.8.0, F37 – „Plan kampanii”): the salary and each envelope month by month over a calendar year –
 * the limit in force (a month's own plan or the last earlier one – T46), the fact next to it (the month's costs, the
 * envelope's spending as the debriefing counts it) and the same month a year before (the season: December's gifts, July's
 * travels). Pure.
 */
import { envelopeKind, type Category, type EnvelopeKind } from '../schema/budget'
import type { Container, MonthPlan, Transaction } from '../schema/records'
import { addMonths } from './dates'
import { categoryIndex, costOf, sum } from './operations'
import { monthSpending, planFor, transactionsOfMonth } from './plan'

export interface YearCell {
  month: string
  /** The plan's limit in force (null = none – no plan yet, or no envelope that month): what the grid edits. */
  limit: number | null
  /** What the month added to it (F28: the loot kept in it, the covers ±) – the engine's limit is the sum. */
  extra: number
  /** The month has its own plan (else the last earlier one's). */
  own: boolean
  /** The fact: the month's spending (null – a month still ahead). */
  spent: number | null
  /** The same month a year before. */
  yearAgo: number
  /** Over the engine's limit (the plan's with `extra`). */
  over: boolean
  /** The current month and the ones ahead: a month past keeps its plan (the engine ran it). */
  editable: boolean
}

export interface YearRow {
  /** 'salary' or the main category's id. */
  id: string
  kind: 'salary' | EnvelopeKind
  cells: YearCell[]
  /** The year's limits together and its fact so far. */
  total: number
  spent: number
}

export interface YearPlan {
  year: string
  months: string[]
  rows: YearRow[]
}

export function yearPlan(
  year: string,
  input: {
    plans: readonly MonthPlan[]
    categories: readonly Category[]
    transactions: readonly Transaction[]
    containers: readonly Pick<Container, 'id'>[]
    today: string
    /** What each month added to the limits (F28 – `envelopeExtraOf` of the engine's log); none = nothing. */
    extraOf?: (month: string) => ReadonlyMap<string, number>
  }
): YearPlan {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
  const current = input.today.slice(0, 7)
  const cats = categoryIndex(input.categories)
  const containerIds = new Set(input.containers.map((c) => c.id))
  const own = new Set(input.plans.map((p) => p.month))
  const spending = new Map<string, Map<string, number>>()
  const costs = new Map<string, number>()
  for (const m of [...months, ...months.map((x) => addMonths(x, -12))]) {
    spending.set(m, monthSpending(transactionsOfMonth(input.transactions, m), cats, containerIds).spent)
    costs.set(m, sum(transactionsOfMonth(input.transactions, m).map(costOf)))
  }
  const plans = months.map((m) => planFor(input.plans, m))
  const extras = months.map((m) => input.extraOf?.(m))
  const row = (id: string, kind: YearRow['kind'], limitOf: (p: MonthPlan | null) => number | null, factOf: (m: string) => number): YearRow => {
    const cells = months.map((m, i): YearCell => {
      const limit = limitOf(plans[i]!)
      const extra = kind === 'salary' ? 0 : (extras[i]?.get(id) ?? 0)
      // The engine's limit: the plan's with what the month added (an envelope without one – the extra alone).
      const engine = limit == null && !extra ? null : Math.max(0, (limit ?? 0) + extra)
      const spent = m <= current ? factOf(m) : null
      return { month: m, limit, extra, own: own.has(m), spent, yearAgo: factOf(addMonths(m, -12)), over: spent != null && engine != null && spent > engine, editable: m >= current }
    })
    return { id, kind, cells, total: sum(cells.map((c) => c.limit ?? 0)), spent: sum(cells.map((c) => c.spent ?? 0)) }
  }
  const rows: YearRow[] = [row('salary', 'salary', (p) => p?.salary ?? null, (m) => costs.get(m) ?? 0)]
  for (const main of cats.mains) {
    const kind = envelopeKind(main)
    if (!kind) continue
    const used = plans.some((p) => p?.envelopes[main.id] != null)
    // An archived one only while the year's plans still give it a limit.
    if (main.archived && !used) continue
    rows.push(row(main.id, kind, (p) => p?.envelopes[main.id] ?? null, (m) => spending.get(m)?.get(main.id) ?? 0))
  }
  return { year, months, rows }
}

/**
 * The months a row's value is set in to copy it on (F37): the month itself and each later month of the year with its own
 * plan – the months without one take it from the last earlier plan anyway.
 */
export function copyOnMonths(year: string, month: string, plans: readonly Pick<MonthPlan, 'month'>[]): string[] {
  return [month, ...plans.map((p) => p.month).filter((m) => m > month && m.startsWith(`${year}-`))].sort()
}
