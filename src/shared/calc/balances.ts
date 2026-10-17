/**
 * Balances of the accounts: the opening balance (at the START of its day) and the confirmations read from the bank
 * (at the END of their day). A confirmation that differs from the operations makes a correction to explain – the
 * „rozbieżność w ładowni” (spec, „Potwierdzanie sald”).
 */
import type { Balance, Transaction } from '../schema/records'
import { sum } from './operations'

/** The opening balance in force for an account: the latest one (an opening moved later restarts the account). */
export function openingOf(accountId: string, balances: readonly Balance[]): Balance | null {
  let found: Balance | null = null
  for (const b of balances) {
    if (b.accountId !== accountId || b.kind !== 'opening') continue
    if (!found || b.date > found.date || (b.date === found.date && b.updatedAt > found.updatedAt)) found = b
  }
  return found
}

/** Balance of an account at the end of `date`: the opening plus the operations from its day to `date`. */
export function balanceAt(accountId: string, date: string, transactions: readonly Transaction[], balances: readonly Balance[]): number {
  const opening = openingOf(accountId, balances)
  const from = opening?.date ?? ''
  return (opening?.amount ?? 0) + sum(transactions.filter((t) => t.accountId === accountId && t.date >= from && t.date <= date).map((t) => t.amount))
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

/** What confirming `amount` as the balance at the end of `date` does. */
export function planConfirmation(accountId: string, amount: number, date: string, transactions: readonly Transaction[], balances: readonly Balance[]): ConfirmationPlan {
  if (!openingOf(accountId, balances)) {
    const first = transactions.filter((t) => t.accountId === accountId && t.date <= date).reduce<string | null>((m, t) => (m == null || t.date < m ? t.date : m), null)
    const start = first ?? date
    const moved = sum(transactions.filter((t) => t.accountId === accountId && t.date >= start && t.date <= date).map((t) => t.amount))
    return { kind: 'opening', date: start, amount: amount - moved }
  }
  const computed = balanceAt(accountId, date, transactions, balances)
  return computed === amount ? { kind: 'match', computed } : { kind: 'correction', computed, diff: amount - computed }
}
