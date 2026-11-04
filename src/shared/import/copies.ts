/**
 * One operation and its copies (D77, the duplicates panel – and the import's repair, AF-9): which one stays (the user's
 * data), whether a copy decides otherwise (a conflict to check), and what the kept one takes from the copies. No import
 * of the plan's (`reconcile.ts` uses it).
 */
import { incomeShares } from '../calc/household'
import { financerOf, isTwoSided, partsOf } from '../calc/operations'
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
    // An income's parts are its members' money (D81): the member and the rest as an advance decide too – a part repaying
    // a loan (D100) its loan.
    t.splits.map((s) => `${s.categoryId}:${s.amount}:${member(s.refundable || t.kind === 'income', s.memberId)}:${t.kind === 'income' && s.advance ? 'a' : ''}${t.kind === 'income' && s.loanId ? `:l=${s.loanId}` : ''}`).join(','),
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
 * What a member's money says it pays back, as one text (D91: `covers`, the opening's debt – also per member; D20:
 * `repaid` of before 1.3.0); '' = nothing named. Not of `decision`: a copy naming purchases decides no other kind.
 */
function assignmentOf(t: Transaction): string {
  if (!t.covers.length && !t.coversOpening && !t.coversOpeningMembers?.length && !t.repaid) return ''
  return [[...t.covers].sort().join(','), t.coversOpening ? 'o' : '', [...(t.coversOpeningMembers ?? [])].sort().join(','), t.repaid].join('|')
}

/**
 * Does a copy pay back other purchases than the kept one, which names its own (AF-9 review: removed, the copy's would
 * be paid back no more – the user decides)? Named by the copy only, they go to the kept one (`takeUserData`).
 */
export const coversOtherwise = (keep: Transaction, copy: Transaction): boolean => {
  const mine = assignmentOf(keep)
  const theirs = assignmentOf(copy)
  return mine !== '' && theirs !== '' && theirs !== mine
}

/**
 * The members whose purchases an operation's money pays back, as the ledger reads it (`settleHousehold`, D91): an
 * income's shares of members that repay (not their income nor advance, never a part repaying a loan – D100), a product
 * return's lines of a member's purchase.
 */
function repayers(t: Transaction): ReadonlySet<string> {
  if (t.kind === 'income') return new Set(incomeShares(t).flatMap((s) => (s.memberId && !s.loanId && s.inflowKind !== 'income' && s.inflowKind !== 'advance' ? [s.memberId] : [])))
  if (t.kind !== 'expense' || t.amount <= 0) return new Set()
  return new Set(partsOf(t).flatMap((p) => (p.refundable && !p.gift && p.amount > 0 ? [financerOf(p)] : [])))
}
const within = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => [...a].every((x) => b.has(x))

/**
 * Does the kept operation (decided) take what a copy pays back (AF-9 – review N1 2)? It names nothing itself, and it
 * decides the same or its money pays back every member the copy's does – the purchases named are theirs (D91), so they
 * stay paid back by this money, whatever else the kept one decides.
 */
function takesCovers(keep: Transaction, copy: Transaction): boolean {
  if (assignmentOf(keep) || !assignmentOf(copy)) return false
  if (decision(keep) === decision(copy)) return true
  const theirs = repayers(copy)
  return theirs.size > 0 && within(theirs, repayers(keep))
}

/**
 * Would removing a copy leave the purchases it pays back unpaid (AF-9 – review N1 2: never silently)? Its money pays them
 * back, and the kept one with what it takes from the copy (`takeUserData`) does not: it names others (`coversOtherwise`),
 * or decides otherwise without those members' money, or its money is no repayment of theirs (their income, an advance).
 * A copy whose money repays nobody loses nothing.
 */
export function dropsCovers(keep: Transaction, copy: Transaction): boolean {
  const theirs = repayers(copy)
  if (!assignmentOf(copy) || !theirs.size) return false
  const out = takeUserData(keep, [copy], keep.updatedAt)
  return assignmentOf(out) !== assignmentOf(copy) || !within(theirs, repayers(out))
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
 * what a member's money pays back when it names nothing and pays back those members – `takesCovers`, notes, log, time,
 * container…); its bank's rows as they are – a copy removed by the import's repair (AF-9).
 */
export function takeUserData(keep: Transaction, copies: readonly Transaction[], now: string): Transaction {
  let out: Transaction = { ...keep }
  for (const c of copies) {
    const mine = decision(out)
    // Undecided (an expense without a category – a quick entry): the copy's whole decision, whatever its kind (XTB, an
    // own transfer, a loan…), so a docking moved onto it stays right.
    if (mine == null && decision(c) != null)
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
        coversOpeningMembers: c.coversOpeningMembers,
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
    // The same decision (a member's money, a product return of theirs) – or another one whose money pays back the same
    // members (review N1 2): the purchases only the copy names stay paid back by it (D91 – a removed copy never takes
    // their repayment away; when it would, `dropsCovers` says so before).
    else if (mine != null && takesCovers(out, c))
      out = { ...out, covers: c.covers, coversOpening: c.coversOpening, coversOpeningMembers: c.coversOpeningMembers, repaid: c.repaid }
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
