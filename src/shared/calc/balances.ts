/**
 * Balances of the accounts: the opening balance (at the START of its day) and the confirmations read from the bank
 * (at the END of their day). A confirmation that differs from the operations makes a correction to explain – the
 * „rozbieżność w ładowni” (spec, „Potwierdzanie sald”).
 */
import type { Balance, Transaction } from '../schema/records'
import { daysBetween } from './dates'
import { accountAmounts, amountOn, dateOn, touchesAccount } from './operations'

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
  // Both sides of a transfer in one operation (F10): the other account's side counts here too, on its own day.
  return (opening?.amount ?? 0) + movedOn(accountId, from, date, transactions)
}

/** The money an account's operations moved from `from` to `date` (both days in), each side on its own day (F10). */
function movedOn(accountId: string, from: string, date: string, transactions: readonly Transaction[]): number {
  let moved = 0
  for (const t of transactions) {
    if (!touchesAccount(t, accountId)) continue
    const d = dateOn(t, accountId)
    if (d >= from && d <= date) moved += amountOn(t, accountId)
  }
  return moved
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
    let first: string | null = null
    for (const t of transactions) {
      if (!touchesAccount(t, accountId)) continue
      const d = dateOn(t, accountId)
      if (d <= date && (first == null || d < first)) first = d
    }
    const start = first ?? date
    const moved = movedOn(accountId, start, date, transactions)
    return { kind: 'opening', date: start, amount: amount - moved }
  }
  const computed = balanceAt(accountId, date, transactions, balances)
  return computed === amount ? { kind: 'match', computed } : { kind: 'correction', computed, diff: amount - computed }
}

/** A confirmed balance an edit changes (F12): the account, the day of its last confirmation, by how much. */
export interface ConfirmedChange {
  accountId: string
  date: string
  delta: number
}

/** One operation's change: before and after it (null – a new one, a deleted one). */
export type OperationEdit = readonly [before: Transaction | null, after: Transaction | null]

/**
 * What edits of operations do to the confirmed balances (F12): for each account they are on – before or after, each side
 * of a transfer in one operation on its day – the change of the balance on the day of the account's last confirmation
 * (an operation before the account's opening balance never counted); the edits summed (a transfer of two operations made
 * one moves nothing). None – no confirmed balance moves.
 */
export function confirmedChanges(edits: readonly OperationEdit[], balances: readonly Balance[]): ConfirmedChange[] {
  const accounts = new Set<string>()
  for (const [before, after] of edits) for (const t of [before, after]) if (t) for (const [id] of accountAmounts(t)) accounts.add(id)
  const out: ConfirmedChange[] = []
  for (const accountId of accounts) {
    const confirmed = lastConfirmation(accountId, balances)
    if (!confirmed) continue
    const from = openingOf(accountId, balances)?.date ?? ''
    const counted = (t: Transaction | null) => {
      if (!t || !touchesAccount(t, accountId)) return 0
      const d = dateOn(t, accountId)
      return d >= from && d <= confirmed.date ? amountOn(t, accountId) : 0
    }
    let delta = 0
    for (const [before, after] of edits) delta += counted(after) - counted(before)
    if (delta) out.push({ accountId, date: confirmed.date, delta })
  }
  return out
}

/** The confirmed balance an operation is in (F12): the first of its accounts whose last confirmation covers its day. */
export function confirmedPeriodOf(t: Transaction, balances: readonly Balance[]): { accountId: string; date: string } | null {
  for (const [accountId, , day] of accountAmounts(t)) {
    const confirmed = lastConfirmation(accountId, balances)
    if (confirmed && day <= confirmed.date && day >= (openingOf(accountId, balances)?.date ?? '')) return { accountId, date: confirmed.date }
  }
  return null
}
