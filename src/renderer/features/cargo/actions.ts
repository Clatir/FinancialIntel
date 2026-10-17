import { firstDayOf, monthOf, warsawNow } from '@shared/calc/dates'
import { unlinkedPayments, type RecurringPayment } from '@shared/calc/plan'
import { newId } from '@shared/ids'
import { containerSchema, SCHEMA_VERSION, type Container } from '@shared/schema'
import { addRecord, replaceRecords, updateRecord, useData } from '../../store/data'
import { toast } from '../../store/ui'
import { deleteWithUndo } from '../history/actions'

/** A new container's fields before it goes into the hold (the load line is checked first – spec). */
export type ContainerDraft = Pick<
  Container,
  'name' | 'type' | 'amount' | 'cycleMonths' | 'dueMonth' | 'dueDay' | 'accountId' | 'categoryId' | 'counterparty' | 'from' | 'until' | 'loanId' | 'archived' | 'note'
>

export function emptyDraft(): ContainerDraft {
  const { month, date } = warsawNow()
  // The defaults of the schema; the name is typed by the user (a saved container needs one).
  const parsed = containerSchema
    .omit({ schemaVersion: true, id: true, createdAt: true, updatedAt: true, updatedBy: true })
    .parse({ name: '-', amount: 0, dueMonth: month, dueDay: Number(date.slice(8, 10)) }) as ContainerDraft
  return { ...parsed, name: '' }
}

/** A recurring payment of the history as a container (a monthly one = a subscription, a yearly one = a fixed fee). */
export function draftFromPayment(p: RecurringPayment): ContainerDraft {
  return {
    ...emptyDraft(),
    name: p.label.slice(0, 80),
    type: p.cycleMonths === 1 ? 'subscription' : 'fixed',
    amount: p.amount,
    cycleMonths: p.cycleMonths,
    dueMonth: p.dueMonth,
    dueDay: p.dueDay,
    accountId: p.accountId,
    categoryId: p.categoryId,
    counterparty: p.label
  }
}

export function addContainer(draft: ContainerDraft): string | null {
  if (useData.getState().status?.readOnly) {
    toast('Folder jest tylko do odczytu.', 'error')
    return null
  }
  const now = new Date().toISOString()
  const record = containerSchema.parse({ ...draft, schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: now, updatedAt: now })
  addRecord('containers', record)
  linkPayments(record.id, record.counterparty, true)
  return record.id
}

/** Where linking starts: the budget's first month (its envelopes count the whole month); null = no budget yet. */
function linkFrom(): string | null {
  const start = useData.getState().fi?.settings.budget.start ?? null
  return start ? firstDayOf(monthOf(start)) : null
}

/** The payments of the container's counterparty not linked yet (in the budget's time). */
export function paymentsToLink(counterparty: string): number {
  const from = linkFrom()
  if (!from) return 0
  const txs = Object.values(useData.getState().records.transactions).map((e) => e.record)
  return unlinkedPayments(txs, counterparty, from).length
}

/**
 * Link the counterparty's payments to the container: the cargo's (a periodic fee from its tank), no envelope's – the
 * engine counts what is linked. The import links new ones by itself.
 */
export function linkPayments(containerId: string, counterparty: string, quiet = false): number {
  const from = linkFrom()
  if (!from || useData.getState().status?.readOnly) return 0
  const txs = Object.values(useData.getState().records.transactions).map((e) => e.record)
  const found = unlinkedPayments(txs, counterparty, from)
  if (found.length) replaceRecords('transactions', found.map((t) => ({ ...t, containerId })))
  if (found.length || !quiet) toast(found.length ? `Połączono z kontenerem: ${found.length} płatności od ${from.slice(8, 10)}.${from.slice(5, 7)}.${from.slice(0, 4)}.` : 'Brak płatności do połączenia.', 'info', 3500)
  return found.length
}

export const patchContainer = (id: string, p: Partial<Container>) => updateRecord('containers', id, (c) => ({ ...c, ...p }))

export const deleteContainer = (c: Container) => deleteWithUndo('containers', c.id, c.name, `Usunięto kontener „${c.name}”.`)
