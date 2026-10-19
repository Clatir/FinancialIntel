import { firstDayOf, monthOf, warsawNow } from '@shared/calc/dates'
import { unlinkedPayments, type RecurringPayment } from '@shared/calc/plan'
import { newId } from '@shared/ids'
import { containerSchema, SCHEMA_VERSION, type Container, type Transaction } from '@shared/schema'
import { addRecord, listOf, replaceRecords, updateRecord, useData } from '../../store/data'
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

/** This month, when the budget ran before it (null = it starts now or later: the container counts from the start anyway). */
function runningMonth(): string | null {
  const start = useData.getState().fi?.settings.budget.start ?? null
  const { month } = warsawNow()
  return start && monthOf(start) < month ? month : null
}

/**
 * A periodic fee added (or made periodic) while the budget runs fills its tank from this month on – catching up from
 * now (T29), never from the energy of months gone by (B56).
 */
const fromNow = <T extends Pick<Container, 'cycleMonths' | 'from'>>(c: T): T => (c.cycleMonths > 1 && c.from == null ? { ...c, from: runningMonth() } : c)

export function addContainer(draft: ContainerDraft): string | null {
  if (useData.getState().status?.readOnly) {
    toast('Folder jest tylko do odczytu.', 'error')
    return null
  }
  const now = new Date().toISOString()
  const record = containerSchema.parse({ ...fromNow(draft), schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: now, updatedAt: now })
  addRecord('containers', record)
  linkPayments(record.id, record.counterparty, true)
  return record.id
}

/** Where linking starts: the budget's first month (its envelopes count the whole month); null = no budget yet. */
function linkFrom(start = useData.getState().fi?.settings.budget.start ?? null): string | null {
  return start ? firstDayOf(monthOf(start)) : null
}

/** The payments of the container's counterparty not linked yet (in the budget's time; one of a deleted container is not – B58). */
export function paymentsToLink(counterparty: string, txs: readonly Transaction[], start: string | null, containerIds: ReadonlySet<string>): number {
  const from = linkFrom(start)
  return from ? unlinkedPayments(txs, counterparty, from, containerIds).length : 0
}

/**
 * Link the counterparty's payments to the container: the cargo's (a periodic fee from its tank), no envelope's – the
 * engine counts what is linked. The import links new ones by itself.
 */
export function linkPayments(containerId: string, counterparty: string, quiet = false): number {
  const from = linkFrom()
  if (!from || useData.getState().status?.readOnly) return 0
  const records = useData.getState().records
  // A payment of a container deleted (B58) is not linked: it may join this one.
  const found = unlinkedPayments(listOf(records.transactions), counterparty, from, new Set(Object.keys(records.containers)))
  if (found.length) replaceRecords('transactions', found.map((t) => ({ ...t, containerId })))
  if (found.length || !quiet) toast(found.length ? `Połączono z kontenerem: ${found.length} płatności od ${from.slice(8, 10)}.${from.slice(5, 7)}.${from.slice(0, 4)}.` : 'Brak płatności do połączenia.', 'info', 3500)
  return found.length
}

export const patchContainer = (id: string, p: Partial<Container>) =>
  updateRecord('containers', id, (c) => {
    const next = { ...c, ...p }
    return c.cycleMonths <= 1 && next.cycleMonths > 1 ? fromNow(next) : next
  })

/** Dropped from the hold (or brought back): it still counts until this month's end – the months before stay as they were (B56). */
export const archiveContainer = (c: Container, archived: boolean) => patchContainer(c.id, { archived, archivedAt: archived ? new Date().toISOString() : null })

/**
 * Deleted with its payments let go (B58): they are ordinary expenses again – of the energy, the envelopes and the
 * debriefing alike. „Cofnij” brings the container back and links them again (those not linked to another meanwhile).
 */
export async function deleteContainer(c: Container): Promise<boolean> {
  const linked = listOf(useData.getState().records.transactions).filter((t) => t.containerId === c.id)
  const ids = linked.map((t) => t.id)
  const ok = await deleteWithUndo('containers', c.id, c.name, `Usunięto kontener „${c.name}”${ids.length ? ` – jego płatności (${ids.length}) liczą się teraz jak zwykłe wydatki` : ''}.`, undefined, async () => {
    const now = useData.getState().records.transactions
    const back = ids.map((id) => now[id]?.record).filter((t): t is Transaction => !!t && t.containerId == null)
    if (back.length) replaceRecords('transactions', back.map((t) => ({ ...t, containerId: c.id })))
  })
  if (ok && linked.length) {
    const now = useData.getState().records.transactions
    const still = ids.map((id) => now[id]?.record).filter((t): t is Transaction => !!t && t.containerId === c.id)
    if (still.length) replaceRecords('transactions', still.map((t) => ({ ...t, containerId: null })))
  }
  return ok
}
