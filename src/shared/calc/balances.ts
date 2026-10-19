/**
 * Balances of the accounts: the opening balance (at the START of its day) and the confirmations read from the bank
 * (at the END of their day). A confirmation that differs from the operations makes a correction to explain – the
 * „rozbieżność w ładowni” (spec, „Potwierdzanie sald”).
 */
import type { Balance, Transaction } from '../schema/records'
import { daysBetween } from './dates'
import { sum } from './operations'

/** Is `b` an account's opening balance in force rather than `prev`: the later one, of one day the last edited. */
const laterOpening = (b: Balance, prev: Balance | null | undefined): boolean => !prev || b.date > prev.date || (b.date === prev.date && b.updatedAt > prev.updatedAt)

/** The opening balance in force for an account: the latest one (an opening moved later restarts the account). */
export function openingOf(accountId: string, balances: readonly Balance[]): Balance | null {
  let found: Balance | null = null
  for (const b of balances) if (b.accountId === accountId && b.kind === 'opening' && laterOpening(b, found)) found = b
  return found
}

/** Each account's opening balance in force on `today` – the ones dated later do not count yet (none = all of them). */
export function openingsOf(balances: readonly Balance[], today?: string): Map<string, Balance> {
  const out = new Map<string, Balance>()
  for (const b of balances) if (b.kind === 'opening' && (today == null || b.date <= today) && laterOpening(b, out.get(b.accountId))) out.set(b.accountId, b)
  return out
}

/** Balance of an account at the end of `date`: the opening plus the operations from its day to `date`. */
export function balanceAt(accountId: string, date: string, transactions: readonly Transaction[], balances: readonly Balance[]): number {
  const opening = openingOf(accountId, balances)
  const from = opening?.date ?? ''
  return (opening?.amount ?? 0) + sum(transactions.filter((t) => t.accountId === accountId && t.date >= from && t.date <= date).map((t) => t.amount))
}

/** Days apart two equal corrections of one account may be one confirmation made twice (B129). */
export const DOUBLE_CORRECTION_DAYS = 7

/**
 * The corrections of a balance confirmed twice (B129): two computers confirmed the same balance before OneDrive brought
 * the first one's correction – the same account, the same amount, within 7 days, saved by different computers. The later
 * one of each pair, with the earlier; to check (and delete with „Cofnij”).
 */
export function doubleCorrections(transactions: readonly Transaction[]): Array<{ later: Transaction; earlier: Transaction }> {
  const byAccount = new Map<string, Transaction[]>()
  for (const t of transactions) {
    if (t.kind !== 'correction' || t.amount === 0) continue
    const list = byAccount.get(t.accountId)
    if (list) list.push(t)
    else byAccount.set(t.accountId, [t])
  }
  const out: Array<{ later: Transaction; earlier: Transaction }> = []
  for (const list of byAccount.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    for (let i = 1; i < list.length; i++) {
      const later = list[i]!
      const earlier = list.slice(0, i).find((e) => e.amount === later.amount && daysBetween(e.date, later.date) <= DOUBLE_CORRECTION_DAYS && !!e.updatedBy && !!later.updatedBy && e.updatedBy !== later.updatedBy)
      if (earlier) out.push({ later, earlier })
    }
  }
  return out
}

/** The last confirmed balance of an account (for „potwierdzone N dni temu”). */
export function lastConfirmation(accountId: string, balances: readonly Balance[]): Balance | null {
  let found: Balance | null = null
  for (const b of balances) {
    if (b.accountId !== accountId || b.kind !== 'confirmation') continue
    if (!found || b.date > found.date || (b.date === found.date && b.createdAt > found.createdAt)) found = b
  }
  return found
}

export type ConfirmationPlan =
  /** No opening balance yet: the confirmed balance sets it (at the account's first operation, or that day). */
  | { kind: 'opening'; date: string; amount: number }
  /** The operations agree with the bank. */
  | { kind: 'match'; computed: number }
  /** A difference: a correction of `diff` (bank − operations) dated that day, to be explained. */
  | { kind: 'correction'; computed: number; diff: number }
  /** The day is before the opening balance: nothing to compare with (the opening's date needs a look). */
  | { kind: 'before-opening'; opening: string }

/** What confirming `amount` as the balance at the end of `date` does. */
export function planConfirmation(accountId: string, amount: number, date: string, transactions: readonly Transaction[], balances: readonly Balance[]): ConfirmationPlan {
  const opening = openingOf(accountId, balances)
  if (opening && date < opening.date) return { kind: 'before-opening', opening: opening.date }
  if (!opening) {
    const first = transactions.filter((t) => t.accountId === accountId && t.date <= date).reduce<string | null>((m, t) => (m == null || t.date < m ? t.date : m), null)
    const start = first ?? date
    const moved = sum(transactions.filter((t) => t.accountId === accountId && t.date >= start && t.date <= date).map((t) => t.amount))
    return { kind: 'opening', date: start, amount: amount - moved }
  }
  const computed = balanceAt(accountId, date, transactions, balances)
  return computed === amount ? { kind: 'match', computed } : { kind: 'correction', computed, diff: amount - computed }
}
