/**
 * The history the averages read (T27, T47 – B23, B25): one rule for the engine's average costs and income and for the
 * plan's proposals. It starts where the bank's history does – the earliest imported operation (the bank's record is
 * whole; a purchase typed by hand before it, or an opening balance dated earlier, never makes a month of it whole).
 * Without any operation from the bank: at the earliest of the accounts' opening balances (the budget's own beginning)
 * and the expenses and incomes typed by hand – a loan of Radar, a correction or a transfer dated back never moves it.
 * From there the full calendar months count, up to the month before the current one (a month still running is never a
 * full one), and a month without any operation – a gap of the imports – is left out instead of counting as a month of
 * no costs.
 */
import type { Transaction } from '../schema/records'
import { addMonths, monthOf, monthRange } from './dates'

type HistoryTx = Pick<Transaction, 'date' | 'kind' | 'bank'>

/** The first day the history covers; null = no history at all. */
export function historyStart(transactions: readonly HistoryTx[], openingDates: readonly string[] = []): string | null {
  let bank: string | null = null
  for (const t of transactions) if (t.bank && (bank == null || t.date < bank)) bank = t.date
  if (bank != null) return bank
  // Typed by hand only: from the budget's beginning or the earliest purchase or income – what an average is made of.
  let start: string | null = null
  for (const d of openingDates) if (start == null || d < start) start = d
  for (const t of transactions) if ((t.kind === 'expense' || t.kind === 'income') && (start == null || t.date < start)) start = t.date
  return start
}

/** The first month the history covers in whole: its start's month when it starts on the 1st, else the next one. */
export const firstFullOf = (start: string | null): string | null => (start == null ? null : start.endsWith('-01') ? monthOf(start) : addMonths(monthOf(start), 1))

/**
 * The full months the averages may read, oldest first: from the history's first full month to the month before
 * `current`, each with at least one operation.
 */
export function coveredMonths(transactions: readonly HistoryTx[], current: string, openingDates: readonly string[] = []): string[] {
  const first = firstFullOf(historyStart(transactions, openingDates))
  const last = addMonths(current, -1)
  if (!first || last < first) return []
  const withData = new Set<string>()
  for (const t of transactions) withData.add(monthOf(t.date))
  return monthRange(first, last).filter((m) => withData.has(m))
}

/** The last `count` covered months before `month` (fewer when the history is shorter). */
export function monthsBefore(covered: readonly string[], month: string, count: number): string[] {
  let end = covered.length
  while (end > 0 && covered[end - 1]! >= month) end--
  return covered.slice(Math.max(0, end - count), end)
}
