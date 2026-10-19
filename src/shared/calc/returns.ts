/**
 * Returns on the way (1.9.0, F34 – Turtle Soup „w drodze”): a purchase marked „czekam na zwrot” (goods sent back, a
 * complaint, a booking cancelled) waits for its money until its day. An incoming operation of the same brand – the
 * bank's „ZWROT”, „POS ZWROT TOWARU”, a transfer back – of the amount ±10%, on the purchase's day or later, closes it by
 * itself; one past its day is late (the briefing says so, the Radar shows it). Pure.
 */
import type { Transaction } from '../schema/records'
import type { BrandAliases } from '../import/aliases'
import { brandKeyOf } from '../operationsView'
import { addDays, daysBetween } from './dates'
import { dm } from '../format'

/** The default wait for a return: 14 days from the purchase. */
export const RETURN_DAYS = 14
/** The money back may differ by this share of the awaited amount (a fee kept, a currency). */
export const RETURN_TOLERANCE = 0.1

export type ReturnState = 'waiting' | 'late' | 'arrived' | 'closed'

export interface AwaitedReturn {
  /** The purchase awaiting its money. */
  tx: Transaction
  amount: number
  until: string
  state: ReturnState
  /** Days past its day (late); days left (waiting). */
  days: number
  /** The operation that brought the money (arrived). */
  refund: Transaction | null
}

/** The default return of a purchase: its whole amount, 14 days after it. */
export const defaultReturn = (t: Pick<Transaction, 'amount' | 'date'>) => ({ amount: Math.abs(t.amount), until: addDays(t.date, RETURN_DAYS), closedAt: null })

/** Money coming in that may be a return: an income, or an expense of a positive amount (goods returned). */
const isMoneyBack = (t: Transaction) => t.amount > 0 && (t.kind === 'expense' || t.kind === 'income')

/**
 * Every purchase awaiting a return, with its state: each money back pairs with one purchase only – the earliest
 * awaiting first, the closest amount. Only a purchase (money out) awaits: never money coming in – it would be its own
 * return.
 */
export function awaitedReturns(transactions: readonly Transaction[], today: string, aliases?: BrandAliases): AwaitedReturn[] {
  const awaiting = transactions.filter((t) => t.awaitReturn && t.kind === 'expense' && t.amount < 0).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  if (!awaiting.length) return []
  const back = transactions.filter(isMoneyBack)
  const used = new Set<string>()
  const out: AwaitedReturn[] = []
  for (const t of awaiting) {
    const r = t.awaitReturn!
    const key = brandKeyOf(t, aliases)
    let refund: Transaction | null = null
    if (key) {
      for (const b of back) {
        if (used.has(b.id) || b.date < t.date || brandKeyOf(b, aliases) !== key) continue
        if (Math.abs(b.amount - r.amount) > r.amount * RETURN_TOLERANCE) continue
        if (!refund || Math.abs(b.amount - r.amount) < Math.abs(refund.amount - r.amount) || (b.amount === refund.amount && b.date < refund.date)) refund = b
      }
    }
    if (refund) used.add(refund.id)
    const state: ReturnState = refund ? 'arrived' : r.closedAt ? 'closed' : today > r.until ? 'late' : 'waiting'
    out.push({ tx: t, amount: r.amount, until: r.until, state, days: state === 'late' ? daysBetween(r.until, today) : state === 'waiting' ? daysBetween(today, r.until) : 0, refund })
  }
  return out
}

/** The ones still on the way (waiting or late) – the Radar's and the mark's („czeka na zwrot”). */
export const onTheWay = (list: readonly AwaitedReturn[]): AwaitedReturn[] => list.filter((r) => r.state === 'waiting' || r.state === 'late')


/** „Allegro: 249,00 zł zwrotu nie dotarło od 12 dni.” – a late return in words (F34). */
export function lateReturnText(r: AwaitedReturn, zl: (grosze: number) => string): string {
  const name = r.tx.counterparty || r.tx.title || 'zakup'
  return `${name}: ${zl(r.amount)} zwrotu nie dotarło od ${r.days} ${r.days === 1 ? 'dnia' : 'dni'} (termin ${dm(r.until)}, zakup ${dm(r.tx.date)}).`
}
