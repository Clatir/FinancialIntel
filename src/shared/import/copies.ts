/**
 * One operation and its copies (D77, the duplicates panel – and the import's repair, AF-9): which one stays (the user's
 * data), whether a copy decides otherwise (a conflict to check), and what the kept one takes from the copies. No import
 * of the plan's (`reconcile.ts` uses it).
 */
import { isTwoSided } from '../calc/operations'
import { withBankAmount } from '../calc/share'
import type { Transaction } from '../schema/records'

export type DuplicateKind = 'same-row' | 'manual' | 'bank-format'

/** The user's own data of an operation (the kept one: the most of it). */
export function userContent(t: Transaction): number {
  return (
    Number(!!t.categoryId) +
    t.splits.length +
    Number(!!t.note.trim()) +
    // The receipt lines' descriptions (D89).
    Number(t.splits.some((s) => s.note.trim())) +
    Number(!!t.logNote.trim()) +
    Number(!!t.impulse) +
    Number(!!t.time) +
    Number(t.refundable) +
    Number(!!t.containerId) +
    Number(!!t.goalId) +
    Number(!!t.loanId)
  )
}

/** What an operation was decided to be: two different decisions of one operation are a conflict. */
function decision(t: Transaction): string | null {
  const decided = t.kind !== 'expense' || !!t.categoryId || t.splits.length > 0 || t.refundable || !!t.containerId || !!t.loanId || !!t.goalId
  if (!decided) return null
  const member = (refundable: boolean, memberId: string | null) => (refundable ? (memberId ?? '-') : '')
  return [
    t.kind,
    t.categoryId ?? '',
    // An income's parts are its members' money (D81): the member and the rest as an advance decide too.
    t.splits.map((s) => `${s.categoryId}:${s.amount}:${member(s.refundable || t.kind === 'income', s.memberId)}:${t.kind === 'income' && s.advance ? 'a' : ''}`).join(','),
    t.refundable,
    member(t.refundable || t.kind === 'income', t.memberId),
    t.counterAccountId ?? '',
    // A transfer in one operation is another decision than one side of it (F10).
    isTwoSided(t) ? 'both' : '',
    t.loanId ?? '',
    t.goalId ?? ''
  ].join('|')
}

/** Does a copy decide otherwise than the kept one (both decided)? */
export const conflicting = (keep: Transaction, copies: readonly Transaction[]): boolean => {
  const mine = decision(keep)
  return copies.some((c) => {
    const theirs = decision(c)
    return mine != null && theirs != null && theirs !== mine
  })
}

/**
 * The kept operation with what only the copies had: the bank's data (date, amount, row – a hand-typed one takes
 * them from its copy), the user's fields it lacks (category, notes, log, time, container… – `takeUserData`).
 */
export function mergeDuplicate(keep: Transaction, copies: readonly Transaction[], kind: DuplicateKind, now: string): Transaction {
  let out: Transaction = { ...keep }
  const bankCopy = copies.find((c) => c.bank)
  if (kind === 'manual' && bankCopy) {
    // A receipt's lines follow the bank's amount (B99), a shared purchase's are made again.
    out = withBankAmount({ ...out, date: bankCopy.date, bank: bankCopy.bank, counterparty: out.counterparty || bankCopy.counterparty, title: out.title || bankCopy.title }, bankCopy.amount)
  }
  if (kind === 'same-row' && out.bank?.pending && copies.some((c) => c.bank && !c.bank.pending)) out = { ...out, bank: { ...out.bank, pending: false } }
  // The other format's key stays with the kept one: a file of it finds the operation at once.
  if (kind === 'bank-format' && out.bank) {
    const keys = copies.flatMap((c) => (c.bank ? [c.bank.key, ...(c.bank.altKeys ?? [])] : [])).filter((k) => k !== out.bank!.key)
    out = { ...out, bank: { ...out.bank, altKeys: [...new Set([...(out.bank.altKeys ?? []), ...keys])].slice(-20) } }
  }
  return takeUserData(out, copies, now)
}

/**
 * The kept operation with the user's fields only the copies had (category and the whole decision when it has none,
 * notes, log, time, container…); its bank's rows as they are – a copy removed by the import's repair (AF-9).
 */
export function takeUserData(keep: Transaction, copies: readonly Transaction[], now: string): Transaction {
  let out: Transaction = { ...keep }
  for (const c of copies) {
    // Undecided (an expense without a category – a quick entry): the copy's whole decision, whatever its kind (XTB, an
    // own transfer, a loan…), so a docking moved onto it stays right.
    if (decision(out) == null && decision(c) != null)
      out = {
        ...out,
        kind: c.kind,
        categoryId: c.categoryId,
        splits: c.splits,
        refundable: c.refundable,
        memberId: c.memberId,
        advance: c.advance,
        covers: c.covers,
        coversOpening: c.coversOpening,
        repaid: c.repaid,
        counterAccountId: c.counterAccountId,
        // A transfer in one operation stays one (F10): its other side's row and day with it.
        bothSides: c.bothSides,
        counterBank: c.counterBank,
        counterDate: c.counterDate,
        containerId: c.containerId,
        goalId: c.goalId,
        loanId: c.loanId
      }
    out = {
      ...out,
      note: out.note.trim() ? out.note : c.note,
      logNote: out.logNote.trim() ? out.logNote : c.logNote,
      impulse: out.impulse ?? c.impulse,
      time: out.time ?? c.time,
      containerId: out.containerId ?? c.containerId,
      goalId: out.goalId ?? c.goalId,
      loanId: out.loanId ?? c.loanId
    }
  }
  return { ...out, updatedAt: now }
}
