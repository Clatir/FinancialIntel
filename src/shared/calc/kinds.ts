/**
 * The kind of an operation changed (the editor, a bulk change in Operacje – F11): the amount and the fields that still
 * mean something stay; the sign follows the new kind.
 */
import type { Transaction, TxKind } from '../schema/records'

/** The sign of a new amount of a kind (money out of the account < 0). */
export const DEFAULT_SIGN: Record<TxKind, 1 | -1> = { expense: -1, income: 1, transfer: -1, trading: -1, tax: -1, loan: -1, correction: -1 }

/** A kind change keeps the amount and the fields that still mean something; the sign follows the new kind. */
export function withKind(t: Transaction, kind: TxKind): Transaction {
  const abs = Math.abs(t.amount)
  const sign = kind === 'income' ? 1 : t.kind === kind || kind === 'correction' ? Math.sign(t.amount) || DEFAULT_SIGN[kind] : DEFAULT_SIGN[kind]
  return {
    ...t,
    kind,
    amount: sign * abs,
    refundable: kind === 'expense' ? t.refundable : false,
    // Who finances a purchase and whose money an income is are other things (D80): the member stays with the same kind.
    memberId: kind === t.kind ? t.memberId : null,
    // A gift and a shared purchase (D83): an expense's only.
    gift: kind === 'expense' ? t.gift : undefined,
    share: kind === 'expense' ? t.share : null,
    advance: kind === 'income' ? t.advance : false,
    // The purchases a member's money pays back (D91): an income's, an expense's (a product return's) – the editor's
    // „Wydatek” clicked again keeps them.
    covers: kind === 'income' || kind === 'expense' ? t.covers : [],
    coversOpening: kind === 'income' || kind === 'expense' ? t.coversOpening : undefined,
    coversOpeningMembers: kind === 'income' || kind === 'expense' ? t.coversOpeningMembers : undefined,
    // A receipt's lines and an income's parts (D81) are other things too: they stay with the same kind.
    splits: kind === t.kind && (kind === 'expense' || kind === 'income') ? t.splits : [],
    repaid: kind === 'income' ? t.repaid : 0,
    counterAccountId: kind === 'transfer' ? t.counterAccountId : null,
    // A transfer between two accounts of the budget is one operation for both sides (F10, D87); another kind has none.
    ...(kind === 'transfer' ? { bothSides: t.kind === 'transfer' ? t.bothSides : true } : { bothSides: undefined, counterBank: undefined, counterDate: undefined }),
    impulse: kind === 'expense' ? t.impulse : null,
    // The loan's link only on a loan's operation (an installment of a taken loan is its container's payment).
    loanId: kind === 'loan' ? t.loanId : null,
    // Paid from a goal's money (T24, N1): an expense only; so is a return awaited (F34).
    goalId: kind === 'expense' ? t.goalId : null,
    ...(kind === 'expense' ? {} : { awaitReturn: undefined }),
    ...(kind === 'correction' ? {} : { explained: undefined })
  }
}

