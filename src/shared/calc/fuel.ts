/**
 * The fuel balance of a month (1.10.0, F25 – „Bilans paliwa”): what the month added to the ship – its income (the work
 * and the trading net, never the household members' money – D81) less its net costs – and the savings rate (that
 * balance in % of the income). Beside it the variant „bez tradingu”: does the work alone cover the costs. Pure; Wywiad,
 * the debriefing, the reports and the months' export read it.
 */
import type { Transaction } from '../schema/records'
import { addMonths } from './dates'
import { incomeOfPeriod, type IncomeContext } from './income'
import { costsByMonth, transactionsOfMonth } from './plan'

export interface FuelMonth {
  month: string
  /** Income of the month: the work and the trading net (a month of top-ups – 0, never below – N4). */
  income: number
  work: number
  trading: number
  /** Net costs of the month (as the debriefing counts them). */
  costs: number
  /** income − costs: what the month added to the ship (< 0 – what it took). */
  balance: number
  /** The balance in % of the income (one decimal); null – no income. */
  rate: number | null
  /** Without the trading: the work less the costs, and its rate. */
  workBalance: number
  workRate: number | null
}

/** A balance in % of its income (one decimal); null – no income. */
export const savingsRate = (balance: number, income: number): number | null => (income > 0 ? Math.round((balance / income) * 1000) / 10 : null)

/** Each month's fuel balance (`months` in order). */
export function fuelMonths(transactions: readonly Transaction[], ctx: IncomeContext, months: readonly string[]): FuelMonth[] {
  const costs = costsByMonth(transactions)
  return months.map((month) => {
    const income = incomeOfPeriod(transactionsOfMonth(transactions, month), ctx)
    const c = costs.get(month) ?? 0
    const balance = income.total - c
    const workBalance = income.work - c
    return { month, income: income.total, work: income.work, trading: income.trading, costs: c, balance, rate: savingsRate(balance, income.total), workBalance, workRate: savingsRate(workBalance, income.work) }
  })
}

/** The median of the rates there are (null – none). */
export function medianRate(rates: ReadonlyArray<number | null>): number | null {
  const xs = rates.filter((r): r is number => r != null).sort((a, b) => a - b)
  if (!xs.length) return null
  const mid = xs.length >> 1
  return xs.length % 2 ? xs[mid]! : Math.round(((xs[mid - 1]! + xs[mid]!) / 2) * 10) / 10
}

export interface FuelSummary {
  /** The month asked and its rate. */
  month: FuelMonth | null
  /** Medians of the 6 and the 12 months before it (its full months). */
  median6: number | null
  median12: number | null
  /** The same without the trading. */
  workMedian6: number | null
  /** The rate's direction: the last 3 months' median against the 3 before them. */
  trend: 'up' | 'down' | null
}

/**
 * The month's savings rate with the medians of the months before it (`history` – the months the averages read, oldest
 * first; the debriefing's line: „Stopa oszczędności 23% (mediana 6 mies.: 18%)”).
 */
export function fuelSummary(transactions: readonly Transaction[], ctx: IncomeContext, month: string, history: readonly string[]): FuelSummary {
  const before = history.filter((m) => m < month).slice(-12)
  const list = fuelMonths(transactions, ctx, [...before, month])
  const current = list[list.length - 1] ?? null
  const past = list.slice(0, -1)
  const last = (n: number) => past.slice(-n)
  const recent = medianRate(last(3).map((m) => m.rate))
  const earlier = medianRate(past.slice(-6, -3).map((m) => m.rate))
  return {
    month: current,
    median6: medianRate(last(6).map((m) => m.rate)),
    median12: medianRate(last(12).map((m) => m.rate)),
    workMedian6: medianRate(last(6).map((m) => m.workRate)),
    trend: recent == null || earlier == null || recent === earlier ? null : recent > earlier ? 'up' : 'down'
  }
}

/** The 12 months up to `month` (oldest first): Wywiad's „Bilans paliwa”. */
export const fuelWindow = (month: string, count = 12): string[] => Array.from({ length: count }, (_, i) => addMonths(month, i - count + 1))

/** „23%” – a rate in words (a comma, as Polish writes it); „—” without one. */
export const rateText = (rate: number | null): string => (rate == null ? '—' : `${String(rate).replace('.', ',')}%`)
