/**
 * Income for the statistics (D81, 1.4.0): what came in as mine, month by month, in two lines – work and other income,
 * and trading (the withdrawals from the trading account less the top-ups of it). Never income: own transfers, what a
 * household member pays back or pays ahead (`calc/household.ts`), a member's money before the settlements' start (it
 * cannot be told apart any more), and the money of the ICTTJ pool „Podatek” (the PIT-38 reserve, outside the budget).
 * The panel „Przychody” (averages of 3, 6 and 12 months, the median) and the engine's income average (the salary
 * warning) read the same numbers.
 */
import type { HouseholdMember } from '../schema/budget'
import type { Docking, Transaction } from '../schema/records'
import { monthOf } from './dates'
import { heldOf, incomeShares, isMemberMoney, settleHousehold, type HouseholdLedger } from './household'
import { sum } from './operations'

export interface IncomeContext {
  /** The household's ledger (the engine's: `FleetState.household`). */
  ledger: Pick<HouseholdLedger, 'byTx'>
  /** The settlements' start (D81, `settleFromOf`): a member's money before it is not income; null = none. */
  since: string | null
  /** The members (their names in the bank tell their money from before the settlements). */
  members: ReadonlyArray<Pick<HouseholdMember, 'bankNames'>>
  /** Of each operation, what went to the ICTTJ pool „Podatek” (grosze, ≥ 0). */
  tax: ReadonlyMap<string, number>
}

export interface IncomeParts {
  /** Work and other income (≥ 0). */
  work: number
  /** Trading: a withdrawal > 0, a top-up of the trading account < 0. */
  trading: number
}

const NONE: IncomeParts = { work: 0, trading: 0 }

/** The context without the engine: the whole history's ledger, no settlements' start, no pools. */
export const plainIncomeContext = (transactions: readonly Transaction[]): IncomeContext => ({ ledger: settleHousehold(transactions), since: null, members: [], tax: new Map() })

/** What of each operation went to the pool „Podatek” (a docking of the pool, or the tax part of a docking's split). */
export function taxOfDockings(byTx: ReadonlyMap<string, Pick<Docking, 'pool' | 'split'>>, transactions: readonly Transaction[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const t of transactions) {
    const d = byTx.get(t.id)
    if (!d) continue
    const v = d.pool === 'tax' ? Math.abs(t.amount) : (d.split?.taxHold ?? 0)
    if (v > 0) out.set(t.id, v)
  }
  return out
}

/** An operation's income: work (an income less what household members keep of it) and trading (signed). */
export function incomeParts(t: Transaction, ctx: IncomeContext): IncomeParts {
  const tax = ctx.tax.get(t.id) ?? 0
  if (t.kind === 'income') {
    if (t.amount <= 0) return NONE
    // A member's money before the settlements (D81): what of it was theirs cannot be told any more – not income.
    if (ctx.since && t.date < ctx.since && isMemberMoney(t, ctx.members)) return NONE
    // The members' parts the ledger did not settle (an account's operation inside its opening balance) are theirs.
    const flows = ctx.ledger.byTx.get(t.id)
    const kept = flows ? heldOf(flows) : sum(incomeShares(t).filter((x) => x.memberId).map((x) => x.amount))
    return { work: Math.max(0, t.amount - kept - tax), trading: 0 }
  }
  if (t.kind === 'trading') {
    // The tax pool's money (a withdrawal into it, its return to the trading capital) is not the budget's.
    if (t.amount < 0) return tax ? NONE : { work: 0, trading: t.amount }
    return { work: 0, trading: Math.max(0, t.amount - tax) }
  }
  return NONE
}

/** Income of some operations together; trading as their net (withdrawals less top-ups), never below zero. */
export function incomeOfPeriod(transactions: readonly Transaction[], ctx: IncomeContext): { work: number; trading: number; total: number } {
  let work = 0
  let trading = 0
  for (const t of transactions) {
    const p = incomeParts(t, ctx)
    work += p.work
    trading += p.trading
  }
  trading = Math.max(0, trading)
  return { work, trading, total: work + trading }
}

/** Income by month (trading net, possibly below zero in a month of top-ups). */
export function incomeByMonth(transactions: readonly Transaction[], ctx: IncomeContext): Map<string, IncomeParts> {
  const out = new Map<string, IncomeParts>()
  for (const t of transactions) {
    const p = incomeParts(t, ctx)
    if (!p.work && !p.trading) continue
    const m = monthOf(t.date)
    const cur = out.get(m) ?? { work: 0, trading: 0 }
    out.set(m, { work: cur.work + p.work, trading: cur.trading + p.trading })
  }
  return out
}

export interface IncomeFigures {
  work: number | null
  trading: number | null
  total: number | null
}

export interface IncomeWindow extends IncomeFigures {
  /** Full months in it (fewer than asked when the history is shorter). */
  months: number
}

export interface IncomeStats {
  /** The last 12 full months before this one (oldest first): trading net, total = work + trading (never below zero). */
  months: Array<{ month: string; work: number; trading: number; total: number }>
  /** Averages of the last 3, 6 and 12 full months (trading: the window's net, never below zero). */
  windows: { 3: IncomeWindow; 6: IncomeWindow; 12: IncomeWindow }
  /** Medians of the same 12 months (a single big month – a bonus – does not move them). */
  median: IncomeWindow
}

const median = (xs: readonly number[]): number | null => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2)
}

const EMPTY: IncomeWindow = { months: 0, work: null, trading: null, total: null }

/**
 * The statistics of the last 12 covered full months (`calc/history.ts` – the engine's history, oldest first). A month's
 * total counts its trading as the reports do – never below zero (N4, T119): a month of top-ups is work only.
 */
export function incomeStats(byMonth: ReadonlyMap<string, IncomeParts>, covered: readonly string[]): IncomeStats {
  if (!covered.length) return { months: [], windows: { 3: EMPTY, 6: EMPTY, 12: EMPTY }, median: EMPTY }
  const months = covered.slice(-12).map((m) => {
    const v = byMonth.get(m) ?? { work: 0, trading: 0 }
    return { month: m, work: v.work, trading: v.trading, total: v.work + Math.max(0, v.trading) }
  })
  const windowOf = (n: number): IncomeWindow => {
    const ms = months.slice(-n)
    const work = Math.round(sum(ms.map((m) => m.work)) / ms.length)
    const trading = Math.max(0, Math.round(sum(ms.map((m) => m.trading)) / ms.length))
    return { months: ms.length, work, trading, total: work + trading }
  }
  const pos = (v: number | null) => (v == null ? null : Math.max(0, v))
  return {
    months,
    windows: { 3: windowOf(3), 6: windowOf(6), 12: windowOf(12) },
    median: { months: months.length, work: median(months.map((m) => m.work)), trading: pos(median(months.map((m) => m.trading))), total: pos(median(months.map((m) => m.total))) }
  }
}
