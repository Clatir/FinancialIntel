import { weekdayOf } from '@shared/calc/dates'
import { costOf } from '@shared/calc/operations'
import type { Transaction } from '@shared/schema'

/**
 * The purchases behind a cell of the killzone map (UX-74): the same ones `killzoneGrid` counts into the weekday × hour
 * (a cost, with a time, in the window), the biggest first. Operacje has no weekday / hour filter – the list is shown in
 * Wywiad, each line opens its operation.
 */
export function killzoneOperations(transactions: readonly Transaction[], from: string, to: string, weekday: number, hour: number): Transaction[] {
  return transactions.filter((t) => t.date >= from && t.date <= to && t.time != null && Number(t.time.slice(0, 2)) === hour && weekdayOf(t.date) === weekday && costOf(t) > 0).sort((a, b) => costOf(b) - costOf(a) || (a.date < b.date ? 1 : -1))
}
