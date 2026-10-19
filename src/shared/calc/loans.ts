/**
 * Loans and receivables (E6, D72; spec: „Pożyczka udzielona to należność, a jej spłata nie jest przychodem. Własna rata
 * to kontener w ładowni.”):
 * - a loan given: the money leaves the shields, each installment of its schedule comes back to them; one not paid
 *   3 days after its date is overdue (a reminder);
 * - a loan taken: the money comes into the shields, its installments are a container of the cargo hold for the time of
 *   the repayment, and the range counts the shields less the debt still to pay;
 * - what a household member owes (the purchases they finance – `calc/household.ts`, D80) is recalled 30 days after
 *   their oldest purchase still owed.
 */
import type { Container, Loan, Transaction } from '../schema/records'
import { addMonths, daysBetween, daysInMonth } from './dates'
import { splitEvenly, sum } from './operations'

/** An installment unpaid this many days after its date is overdue (D72). */
export const OVERDUE_DAYS = 3
/** What a household member owes is recalled when their oldest purchase still owed is older than this (D72, D80). */
export const HOUSE_DAYS = 30

export interface LoanState {
  loan: Loan
  /** Given: lent; taken: to pay back (the schedule's sum, else the amount). */
  total: number
  /** Given: repaid by the borrower; taken: the installments paid. */
  paid: number
  /** total − paid (0 once closed). */
  open: number
  /**
   * The installments not covered by the payments 3 days after their date: the earliest (`date`, `days` late), the
   * latest (`last` – a new one makes a new reminder) and their sum.
   */
  overdue: { date: string; last: string; amount: number; days: number } | null
  /** The earliest installment not covered by the payments yet. */
  next: { date: string; amount: number } | null
  /** Installments not covered yet, in order (what is left of each). */
  left: Array<{ date: string; amount: number }>
}

interface Flows {
  out: number
  in: number
}

/**
 * The money of the loans' operations, by loan, in one pass over the operations (W27): out of the budget (< 0) and into
 * it (> 0) – the loan's own operations, and the payments of its container (an installment of a taken loan is the
 * cargo's).
 */
function flowsByLoan(loans: readonly Loan[], transactions: readonly Transaction[], containers: readonly Container[], today: string): Map<string, Flows> {
  const flows = new Map<string, Flows>()
  for (const l of loans) flows.set(l.id, { out: 0, in: 0 })
  const loanOfContainer = new Map<string, string>()
  for (const c of containers) if (c.loanId != null && flows.has(c.loanId)) loanOfContainer.set(c.id, c.loanId)
  for (const t of transactions) {
    if (t.date > today) continue
    const id = t.kind === 'loan' ? t.loanId : t.kind === 'expense' && t.containerId != null ? loanOfContainer.get(t.containerId) : undefined
    const f = id != null ? flows.get(id) : undefined
    if (!f) continue
    if (t.amount < 0) f.out += -t.amount
    else f.in += t.amount
  }
  return flows
}

export function loanState(loan: Loan, transactions: readonly Transaction[], containers: readonly Container[], today: string): LoanState {
  return stateOf(loan, flowsByLoan([loan], transactions, containers, today).get(loan.id)!, today)
}

function stateOf(loan: Loan, flows: Flows, today: string): LoanState {
  const schedule = [...loan.schedule].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  const total = loan.direction === 'taken' && schedule.length ? sum(schedule.map((s) => s.amount)) : loan.amount
  const paid = loan.direction === 'given' ? flows.in : flows.out
  const closed = loan.closedAt != null
  const open = closed ? 0 : Math.max(0, total - paid)
  // The payments cover the installments in their order.
  let cover = closed ? Infinity : paid
  const left: LoanState['left'] = []
  for (const s of schedule) {
    const take = Math.min(cover, s.amount)
    cover -= take
    if (s.amount - take > 0) left.push({ date: s.date, amount: s.amount - take })
  }
  const due = left.filter((s) => daysBetween(s.date, today) >= OVERDUE_DAYS)
  const overdue = due.length ? { date: due[0]!.date, last: due.at(-1)!.date, amount: sum(due.map((s) => s.amount)), days: daysBetween(due[0]!.date, today) } : null
  return { loan, total, paid, open, overdue, next: left[0] ?? null, left }
}

export function loanStates(loans: readonly Loan[], transactions: readonly Transaction[], containers: readonly Container[], today: string): LoanState[] {
  if (!loans.length) return []
  const flows = flowsByLoan(loans, transactions, containers, today)
  return loans.map((l) => stateOf(l, flows.get(l.id)!, today))
}

/** The debt of the taken loans still to pay (the range counts the shields less it – D72). */
export function debtOf(states: readonly LoanState[]): number {
  return sum(states.filter((s) => s.loan.direction === 'taken').map((s) => s.open))
}

/** A schedule of `count` monthly installments of `total` from `first` (the day kept, the month's last day at most). */
export function monthlySchedule(total: number, count: number, first: string, makeId: () => string): Loan['schedule'] {
  const amounts = splitEvenly(total, Math.max(1, count))
  const day = Number(first.slice(8, 10))
  return amounts.map((amount, i) => {
    const month = addMonths(first.slice(0, 7), i)
    return { id: makeId(), date: `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, '0')}`, amount }
  })
}
