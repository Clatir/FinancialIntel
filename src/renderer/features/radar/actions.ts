/**
 * Loans (E6, D72): a new loan with its schedule (and its operation – the money out or in), a taken one with its
 * installments as a container of the cargo hold; a repayment or an installment recorded; closed, deleted with „Cofnij”.
 */
import { coverAmount, type AccountAhead } from '@shared/calc/ahead'
import { warsawNow } from '@shared/calc/dates'
import { monthlySchedule, type LoanState } from '@shared/calc/loans'
import { newId } from '@shared/ids'
import { containerSchema, loanSchema, SCHEMA_VERSION, transactionSchema, type Container, type Loan, type Transaction } from '@shared/schema'
import { addRecord, canWrite, deleteOrSay, deleteRecord, updateRecord, useData } from '../../store/data'
import { toast } from '../../store/ui'
import { playSound } from '../../lib/sounds'
import { plnText } from '../../components/fields'
import { countLabel } from '../../lib/format'
import { errorMessage } from '../../lib/api'
import { patchContainer } from '../cargo/actions'
import { openOperation } from '../operations/state'

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
  /** A taken loan's installments added as a container in the cargo hold (default true; false = repaid from shields, N-PC-17). */
  withContainer?: boolean
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
  // Own installments are a container of the cargo hold for the time of the repayment (spec, D72; optional in N-PC-17).
  if (o.direction === 'taken' && (o.withContainer ?? true)) {
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

/** Create or restore a cargo container for a taken loan's installments so repayments come from monthly salary (N-PC-17). */
export function ensureLoanContainer(s: LoanState): Container | null {
  if (!canWrite() || s.loan.direction !== 'taken') return null
  const fi = useData.getState()
  const existing = Object.values(fi.records.containers)
    .map((e) => e.record)
    .find((c) => c.loanId === s.loan.id)
  if (existing && !existing.archived) return existing
  if (existing && existing.archived) {
    patchContainer(existing.id, { archived: false, archivedAt: null })
    toast(`Kontener „${existing.name}” przywrócony do Ładowni.`, 'success', 5000, {
      label: 'Cofnij',
      run: () => patchContainer(existing.id, { archived: true, archivedAt: existing.archivedAt })
    })
    return useData.getState().records.containers[existing.id]?.record ?? existing
  }
  const first = s.next ?? s.loan.schedule[0]
  const last = s.left.at(-1) ?? s.loan.schedule.at(-1) ?? first
  const dueDate = first?.date ?? s.loan.date
  const c = containerSchema.parse({
    ...stamp(),
    id: newId(),
    name: `Rata: ${s.loan.name}`.slice(0, 80),
    type: 'installment',
    amount: first?.amount ?? s.open,
    cycleMonths: 1,
    dueMonth: dueDate.slice(0, 7),
    dueDay: Number(dueDate.slice(8, 10)),
    accountId: s.loan.accountId ?? fi.fi?.settings.accounts[0]?.id ?? null,
    counterparty: s.loan.counterparty,
    from: dueDate.slice(0, 7),
    until: (last?.date ?? dueDate).slice(0, 7),
    loanId: s.loan.id
  })
  addRecord('containers', c)
  toast(`Utworzono kontener „${c.name}” w Ładowni – raty zejdą z pensji.`, 'success', 5000, {
    label: 'Cofnij',
    run: () => deleteOrSay('containers', c.id)
  })
  return c
}

/** A repayment from the borrower (given) or an own installment (taken – paid as the cargo's container, or from shields when `fromShields` is true). */
export function recordPayment(s: LoanState, amount: number, date: string, opts: { fromShields?: boolean } = {}): Transaction | null {
  if (!canWrite()) return null
  const fi = useData.getState()
  const loan = s.loan
  const container = opts.fromShields
    ? undefined
    : Object.values(fi.records.containers)
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
  toast(`${taken ? 'Rata' : 'Spłata'} ${plnText(amount)} zł zapisana.`, 'success', 5000, { label: 'Cofnij', run: () => deleteOrSay('transactions', t.id) })
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
  // A file the disk or this version refused (B9, B67): said, the rest as it is – never an unhandled error with the loan
  // gone from the screen. A container deleted before it comes back with the loan's „Cofnij” only, so the loan goes last.
  const gone: Container[] = []
  try {
    for (const c of containers) {
      await deleteRecord('containers', c.id)
      gone.push(c)
    }
    await deleteRecord('loans', loan.id)
  } catch (e) {
    for (const c of gone) addRecord('containers', c)
    toast(errorMessage(e), 'error', 8000)
    return
  }
  toast(`Pożyczka „${loan.name}” usunięta.`, 'info', 6000, {
    label: 'Cofnij',
    run: () => {
      addRecord('loans', loan)
      for (const c of containers) addRecord('containers', c)
    }
  })
}

/**
 * Closed (paid off or written off) or open again (N35). The installments of a taken loan still in the cargo hold leave
 * it with the loan – dropped as a container is (B56: the mass counts to this month's end), at the loan's `closedAt` –
 * and opening brings back only those (archived at that time, or closed before 1.6.6 – every one then), never one
 * archived on its own. The toast's „Cofnij” puts back the loan and only the containers this changed, as they were.
 */
export function closeLoan(loan: Loan, closed: boolean): void {
  if (!canWrite()) return
  const records = useData.getState().records
  const before = records.loans[loan.id]?.record ?? loan
  const now = new Date().toISOString()
  const changed = Object.values(records.containers)
    .map((e) => e.record)
    .filter((c) => c.loanId === loan.id && (closed ? !c.archived : !!c.archived && (c.archivedAt == null || c.archivedAt === before.closedAt)))
  updateRecord('loans', loan.id, (l) => ({ ...l, closedAt: closed ? now : null, updatedAt: now }))
  for (const c of changed) patchContainer(c.id, { archived: closed, archivedAt: closed ? now : null })
  const what = loan.direction === 'given' ? 'należność' : 'dług'
  toast(closed ? `Pożyczka „${loan.name}” zamknięta – ${what} znika z Radaru i zasięgu.` : `Pożyczka „${loan.name}” otwarta ponownie.`, 'info', 6000, {
    label: 'Cofnij',
    run: () => {
      const at = new Date().toISOString()
      updateRecord('loans', loan.id, () => ({ ...before, updatedAt: at }))
      for (const c of changed) updateRecord('containers', c.id, () => ({ ...c, updatedAt: at }))
    }
  })
}

/**
 * „Zaplanuj przelew własny” (F26): the money a payment lacks moved from the account that keeps it – one operation of
 * both accounts (F10), today, up to whole złoty; saved and opened in Operacje (its day and amount to change there).
 */
export function planTransfer(a: AccountAhead): void {
  if (!canWrite() || !a.short) return
  if (!a.source) return toast('Żadne inne konto nie ma tyle do tego dnia – przelew trzeba zaplanować ręcznie.', 'error', 6000)
  const t = transactionSchema.parse({
    ...stamp(),
    id: newId(),
    date: warsawNow().date,
    accountId: a.source.accountId,
    kind: 'transfer',
    amount: -coverAmount(a.short.amount),
    counterAccountId: a.accountId,
    bothSides: true,
    title: `Przelew własny na płatność: ${a.short.cause}`.slice(0, 1000)
  })
  addRecord('transactions', t)
  playSound('entry')
  openOperation(t)
  toast(`Przelew ${plnText(-t.amount)} zł z konta ${a.source.name} na konto ${a.name} zapisany – zmień dzień, gdy zrobisz go później.`, 'success', 7000, { label: 'Cofnij', run: () => deleteOrSay('transactions', t.id) })
}
