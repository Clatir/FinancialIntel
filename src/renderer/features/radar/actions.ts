/**
 * Loans (E6, D72): a new loan with its schedule (and its operation – the money out or in), a taken one with its
 * installments as a container of the cargo hold; a repayment or an installment recorded; closed, deleted with „Cofnij”.
 */
import { monthlySchedule, type LoanState } from '@shared/calc/loans'
import { newId } from '@shared/ids'
import { containerSchema, loanSchema, SCHEMA_VERSION, transactionSchema, type Loan, type Transaction } from '@shared/schema'
import { addRecord, canWrite, deleteRecord, updateRecord, useData } from '../../store/data'
import { toast } from '../../store/ui'
import { playSound } from '../../lib/sounds'
import { plnText } from '../../components/fields'
import { countLabel } from '../../lib/format'

export interface NewLoan {
  direction: Loan['direction']
  name: string
  counterparty: string
  amount: number
  /** To pay back with the interest (a taken loan); the amount when the same. */
  total: number
  date: string
  accountId: string
  installments: number
  firstDue: string
  /** The money leaves (given) or comes (taken) now: its operation on the account. */
  withOperation: boolean
}

const stamp = () => {
  const now = new Date().toISOString()
  return { schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now }
}

export function addLoan(o: NewLoan): Loan {
  const loan = loanSchema.parse({
    ...stamp(),
    id: newId(),
    name: o.name.trim().slice(0, 80),
    direction: o.direction,
    counterparty: o.counterparty.trim(),
    amount: o.amount,
    date: o.date,
    accountId: o.accountId,
    schedule: monthlySchedule(o.direction === 'taken' ? o.total : o.amount, o.installments, o.firstDue, newId)
  })
  addRecord('loans', loan)
  if (o.withOperation)
    addRecord(
      'transactions',
      transactionSchema.parse({
        ...stamp(),
        id: newId(),
        date: o.date,
        accountId: o.accountId,
        kind: 'loan',
        amount: o.direction === 'given' ? -o.amount : o.amount,
        counterparty: loan.counterparty,
        title: o.direction === 'given' ? `Pożyczka: ${loan.name}` : `Pożyczka otrzymana: ${loan.name}`,
        loanId: loan.id
      })
    )
  // Own installments are a container of the cargo hold for the time of the repayment (spec, D72).
  if (o.direction === 'taken') {
    const first = loan.schedule[0]
    const last = loan.schedule.at(-1)
    if (first && last)
      addRecord(
        'containers',
        containerSchema.parse({
          ...stamp(),
          id: newId(),
          name: `Rata: ${loan.name}`.slice(0, 80),
          type: 'installment',
          amount: first.amount,
          cycleMonths: 1,
          dueMonth: first.date.slice(0, 7),
          dueDay: Number(first.date.slice(8, 10)),
          accountId: o.accountId,
          counterparty: loan.counterparty,
          from: first.date.slice(0, 7),
          until: last.date.slice(0, 7),
          loanId: loan.id
        })
      )
  }
  playSound('entry')
  toast(`Pożyczka „${loan.name}” zapisana – ${countLabel(loan.schedule.length, 'rata', 'raty', 'rat')} na radarze.`, 'success')
  return loan
}

/** A repayment from the borrower (given) or an own installment (taken – paid as the cargo's container). */
export function recordPayment(s: LoanState, amount: number, date: string): Transaction | null {
  if (!canWrite()) return null
  const fi = useData.getState()
  const loan = s.loan
  const container = Object.values(fi.records.containers)
    .map((e) => e.record)
    .find((c) => c.loanId === loan.id && !c.archived)
  const accountId = loan.accountId ?? fi.fi?.settings.accounts[0]?.id
  if (!accountId) return null
  const taken = loan.direction === 'taken'
  const t = transactionSchema.parse({
    ...stamp(),
    id: newId(),
    date,
    accountId,
    kind: taken && container ? 'expense' : 'loan',
    amount: taken ? -amount : amount,
    counterparty: loan.counterparty,
    title: taken ? `Rata: ${loan.name}` : `Spłata: ${loan.name}`,
    containerId: taken && container ? container.id : null,
    // A taken loan's installment is its container's payment (the cargo); the loan's own operations carry its id.
    loanId: taken && container ? null : loan.id
  })
  addRecord('transactions', t)
  playSound('entry')
  toast(`${taken ? 'Rata' : 'Spłata'} ${plnText(amount)} zł zapisana.`, 'success', 5000, { label: 'Cofnij', run: () => void deleteRecord('transactions', t.id) })
  return t
}

/** A loan without operations (a mistake): deleted with its container, „Cofnij” brings both back. */
export async function deleteLoan(loan: Loan): Promise<void> {
  if (!canWrite()) return
  const s = useData.getState()
  const containers = Object.values(s.records.containers)
    .map((e) => e.record)
    .filter((c) => c.loanId === loan.id)
  const own = new Set(containers.map((c) => c.id))
  // Its operations – its own and the installments paid by its container (the import links them by the payee).
  if (Object.values(s.records.transactions).some((e) => e.record.loanId === loan.id || (e.record.containerId != null && own.has(e.record.containerId)))) {
    toast('Ta pożyczka ma operacje – zamknij ją zamiast usuwać.', 'error', 5000)
    return
  }
  for (const c of containers) await deleteRecord('containers', c.id)
  await deleteRecord('loans', loan.id)
  toast(`Pożyczka „${loan.name}” usunięta.`, 'info', 6000, {
    label: 'Cofnij',
    run: () => {
      addRecord('loans', loan)
      for (const c of containers) addRecord('containers', c)
    }
  })
}

export function closeLoan(loan: Loan, closed: boolean): void {
  updateRecord('loans', loan.id, (l) => ({ ...l, closedAt: closed ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }))
  // The installments of a closed taken loan leave the cargo hold (and come back with it).
  const containers = Object.values(useData.getState().records.containers).map((e) => e.record)
  for (const c of containers) if (c.loanId === loan.id) updateRecord('containers', c.id, (r) => ({ ...r, archived: closed, updatedAt: new Date().toISOString() }))
}
