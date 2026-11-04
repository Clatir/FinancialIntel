/**
 * Loans and receivables (E6, D72; spec: „Pożyczka udzielona to należność, a jej spłata nie jest przychodem. Własna rata
 * to kontener w ładowni.”):
 * - a loan given: the money leaves the shields, each installment of its schedule comes back to them; one not paid
 *   3 days after its date is overdue (a reminder);
 * - a loan taken: the money comes into the shields, its installments are a container of the cargo hold for the time of
 *   the repayment, and the range counts the shields less the debt still to pay;
 * - what a household member owes (the purchases they finance – `calc/household.ts`, D80) is recalled 30 days after
 *   their oldest purchase still owed.
 * - a loan given is repaid by its operations of kind 'loan' and by the parts of any inflow naming it (D100, T355 –
 *   `Split.loanId`, whoever sent it): both read here (`forEachLoanOperation`), each with who paid (`payments`, T356).
 */
import type { HouseholdMember } from '../schema/budget'
import type { Container, Loan, Transaction } from '../schema/records'
import { addMonths, daysBetween, daysInMonth } from './dates'
import { incomeShares, memberName, memberOf, nameIn } from './household'
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
  /** A given loan's repayments, oldest first, each with who sent it (D100, T356); a taken loan – none. */
  payments: LoanPayment[]
}

/** One repayment of a loan given (D100): its operation – whole, or a part of an inflow – and who sent it. */
export interface LoanPayment {
  txId: string
  date: string
  amount: number
  /** The household member whose inflow it was (an income's `memberId`), else null. */
  memberId: string | null
  /** The operation's counterparty: the sender as the bank (or the user) wrote it. */
  counterparty: string
  /** A part of an inflow (`Split.loanId`), not a whole operation of the loan. */
  part: boolean
}

interface Flows {
  out: number
  in: number
  payments: LoanPayment[]
}

const NO_PARTS: ReadonlyArray<{ loanId: string; amount: number }> = []

/**
 * The parts of an inflow repaying loans (D100, T355 – `Split.loanId`): as `incomeShares` cuts them at its money, in the
 * lines' order. Whose the rest is – the household's (`calc/household.ts`).
 */
export function loanParts(t: Pick<Transaction, 'kind' | 'amount' | 'memberId' | 'repaid' | 'advance' | 'inflowKind' | 'splits'>): ReadonlyArray<{ loanId: string; amount: number }> {
  if (t.kind !== 'income' || t.amount <= 0 || !t.splits.some((s) => s.loanId)) return NO_PARTS
  return incomeShares(t).flatMap((s) => (s.loanId ? [{ loanId: s.loanId, amount: s.amount }] : []))
}

/** The loans an operation pays into – a loan's own operation, the parts of an inflow (D100): for the filters. */
export const loanIdsOf = (t: Pick<Transaction, 'kind' | 'amount' | 'memberId' | 'repaid' | 'advance' | 'inflowKind' | 'splits' | 'loanId'>): string[] => [
  ...(t.loanId ? [t.loanId] : []),
  ...loanParts(t).map((x) => x.loanId)
]

/**
 * The money of the loans' operations, by loan, in one pass over the operations (W27): out of the budget (< 0) and into
 * it (> 0) – the loan's own operations, the payments of its container (an installment of a taken loan is the cargo's)
 * and the parts of inflows repaying a given one (D100); a given loan's money in with who sent it.
 */
function flowsByLoan(loans: readonly Loan[], transactions: readonly Transaction[], containers: readonly Container[], today: string): Map<string, Flows> {
  const flows = new Map<string, Flows>()
  for (const l of loans) flows.set(l.id, { out: 0, in: 0, payments: [] })
  const given = new Set(loans.filter((l) => l.direction === 'given').map((l) => l.id))
  forEachLoanOperation(loans, transactions, containers, today, (id, t, amount) => {
    const f = flows.get(id)!
    if (amount < 0) f.out += -amount
    else if (amount > 0) {
      f.in += amount
      if (given.has(id)) f.payments.push({ txId: t.id, date: t.date, amount, memberId: t.kind === 'income' ? t.memberId : null, counterparty: t.counterparty, part: t.kind === 'income' })
    }
  })
  return flows
}

/**
 * Each operation of the loans up to `today` with its loan and its money (signed): the loan's own operations, its
 * container's payments (an installment of a taken loan is the cargo's) and the parts of inflows repaying a given one
 * (D100, `loanParts` – each part apart) – the one reading of them, for the loans' states and the net worth (F24).
 */
export function forEachLoanOperation(
  loans: readonly Loan[],
  transactions: readonly Transaction[],
  containers: readonly Container[],
  today: string,
  each: (loanId: string, t: Transaction, amount: number) => void
): void {
  const known = new Set(loans.map((l) => l.id))
  const given = new Set(loans.filter((l) => l.direction === 'given').map((l) => l.id))
  const loanOfContainer = new Map<string, string>()
  for (const c of containers) if (c.loanId != null && known.has(c.loanId)) loanOfContainer.set(c.id, c.loanId)
  for (const t of transactions) {
    if (t.date > today) continue
    const id = t.kind === 'loan' ? t.loanId : t.kind === 'expense' && t.containerId != null ? loanOfContainer.get(t.containerId) : undefined
    if (id != null && known.has(id)) each(id, t, t.amount)
    // A part of an inflow (D100): of a given loan only – of another one the engine docks it as income (as an older version).
    for (const x of loanParts(t)) if (given.has(x.loanId)) each(x.loanId, t, x.amount)
  }
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
  const payments = [...flows.payments].sort((a, b) => a.date.localeCompare(b.date) || a.txId.localeCompare(b.txId))
  return { loan, total, paid, open, overdue, next: left[0] ?? null, left, payments }
}

/** A payer of a loan given (D100, T356): their name, what they paid together, whether they are the borrower. */
export interface LoanPayer {
  name: string
  amount: number
  /** The loan's own person (the loan's counterparty – all its words in the sender's name, as `loanFor` reads it). */
  borrower: boolean
}

/**
 * Who paid a loan given (D100, T356 – the Radar's row „kto zapłacił”): each payer once, in the order they first paid,
 * with their sum – a household member by their name (their inflow, or their name in the bank), anyone else by the name
 * the operation has.
 */
export function loanPayers(s: Pick<LoanState, 'loan' | 'payments'>, members: ReadonlyArray<Pick<HouseholdMember, 'id' | 'name' | 'bankNames'>> = []): LoanPayer[] {
  const person = s.loan.counterparty || s.loan.name
  const out = new Map<string, LoanPayer>()
  for (const p of s.payments) {
    const member = p.memberId ? null : memberOf(p.counterparty, members)
    const name = p.memberId ? memberName(p.memberId, members) : (member?.name ?? (p.counterparty.trim() || 'bez nazwy'))
    const key = p.memberId ? `m:${p.memberId}` : member ? `m:${member.id}` : `n:${name.toLowerCase()}`
    const prev = out.get(key)
    if (prev) prev.amount += p.amount
    else out.set(key, { name, amount: p.amount, borrower: nameIn(person, p.counterparty) })
  }
  return [...out.values()]
}

export function loanStates(loans: readonly Loan[], transactions: readonly Transaction[], containers: readonly Container[], today: string): LoanState[] {
  if (!loans.length) return []
  const flows = flowsByLoan(loans, transactions, containers, today)
  return loans.map((l) => stateOf(l, flows.get(l.id)!, today))
}

/** A loan given an inflow's part may repay (D100): its name and what is still open (the engine's state). */
export interface LoanChoice {
  id: string
  name: string
  /** Open now (closed – 0). */
  open: number
  /** Closed already: offered only because something names it (it stays as it was). */
  closed: boolean
  /** Open without one operation's repayment of it – what it owed for that operation (the editor of a saved one). */
  openWithout: (txId: string) => number
}

/**
 * The loans given an inflow's part may repay (D100, T359 – the quick entry, the editor, the import): the open ones of
 * the Radar, oldest first, and the ones named already (`keep` – a closed one stays as it was).
 */
export function loanChoices(
  loans: readonly Pick<Loan, 'id' | 'name' | 'direction' | 'date' | 'closedAt'>[],
  states: readonly Pick<LoanState, 'loan' | 'open' | 'total' | 'paid' | 'payments'>[] | null | undefined,
  keep: readonly string[] = []
): LoanChoice[] {
  const byId = new Map((states ?? []).map((s) => [s.loan.id, s]))
  return loans
    .filter((l) => l.direction === 'given' && (!l.closedAt || keep.includes(l.id)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((l) => {
      const s = byId.get(l.id)
      const closed = l.closedAt != null
      return {
        id: l.id,
        name: l.name,
        open: s?.open ?? 0,
        closed,
        openWithout: (txId: string) => (closed || !s ? 0 : Math.max(0, s.total - s.paid + sum(s.payments.filter((p) => p.txId === txId).map((p) => p.amount))))
      }
    })
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

/**
 * A taken loan's installments as its container's amounts (AP-11, AF-51 – amends T72): each month the schedule's – its
 * `amount` the last month's, the months before as its amount history (`past`, F9 – `amountIn`), so the cargo and the
 * month's plan count 33,33 / 33,33 / 33,34 zł of 100 zł in 3, the rest in the last as the schedule has it.
 */
export function installmentAmounts(installments: ReadonlyArray<{ date: string; amount: number }>): Pick<Container, 'amount' | 'past'> {
  const byMonth = new Map<string, number>()
  for (const s of [...installments].sort((a, b) => a.date.localeCompare(b.date))) byMonth.set(s.date.slice(0, 7), (byMonth.get(s.date.slice(0, 7)) ?? 0) + s.amount)
  const months = [...byMonth]
  const past: Container['past'] = []
  for (const [i, [month, amount]] of months.entries()) if (i < months.length - 1 && months[i + 1]![1] !== amount) past.push({ until: month, amount })
  return { amount: months.at(-1)?.[1] ?? 0, past }
}
