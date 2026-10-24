import { firstDayOf, monthOf, warsawNow } from '@shared/calc/dates'
import { pastAfterChange } from '@shared/calc/cargoWatch'
import { unlinkedPayments, type RecurringPayment } from '@shared/calc/plan'
import { newId } from '@shared/ids'
import { containerSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Container, type Transaction } from '@shared/schema'
import { addRecord, canWrite, deleteOrSay, listOf, replaceRecords, updateRecord, updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'
import { plnText } from '../../components/fields'
import { countLabel, monthGenLabel, plDate } from '../../lib/format'
import { deleteWithUndo } from '../history/actions'

/** A new container's fields before it goes into the hold (the load line is checked first – spec). */
export type ContainerDraft = Pick<
  Container,
  'name' | 'type' | 'amount' | 'cycleMonths' | 'dueMonth' | 'dueDay' | 'accountId' | 'categoryId' | 'counterparty' | 'from' | 'until' | 'loanId' | 'archived' | 'note' | 'schedule' | 'variable'
>

export function emptyDraft(): ContainerDraft {
  const { month, date } = warsawNow()
  // The defaults of the schema; the name is typed by the user (a saved container needs one).
  const parsed = containerSchema
    .omit({ schemaVersion: true, id: true, createdAt: true, updatedAt: true, updatedBy: true })
    .parse({ name: '-', amount: 0, dueMonth: month, dueDay: Number(date.slice(8, 10)) }) as ContainerDraft
  return { ...parsed, name: '' }
}

/**
 * A recurring payment of the history as a container (a monthly one = a subscription, the others – and a bill of a
 * varying amount – a fixed fee); a schedule's and a variable bill's with their marks (F23).
 */
export function draftFromPayment(p: RecurringPayment): ContainerDraft {
  return {
    ...emptyDraft(),
    name: p.label.slice(0, 80),
    type: p.cycleMonths === 1 && !p.variable ? 'subscription' : 'fixed',
    amount: p.amount,
    cycleMonths: p.cycleMonths,
    schedule: p.schedule,
    variable: p.variable,
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
  if (!canWrite()) return null
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
  if (!from || !canWrite()) return 0
  const records = useData.getState().records
  // A payment of a container deleted (B58) is not linked: it may join this one.
  const found = unlinkedPayments(listOf(records.transactions), counterparty, from, new Set(Object.keys(records.containers)))
  if (found.length) replaceRecords('transactions', found.map((t) => ({ ...t, containerId })))
  if (found.length || !quiet) toast(found.length ? `Połączono z kontenerem: ${countLabel(found.length, 'płatność', 'płatności', 'płatności')} od ${plDate(from)}.` : 'Brak płatności do połączenia.', 'info', 3500)
  return found.length
}

/**
 * What makes a container's monthly mass (B89): its change is the game's day of a raise – the schedule's months and the
 * amounts of months before (F9, F23) too.
 */
const MASS_FIELDS = ['amount', 'cycleMonths', 'from', 'until', 'archived', 'archivedAt', 'schedule', 'past'] as const

/** The same value – a list (the schedule, the amounts before) by its content. */
const same = (a: unknown, b: unknown) => a === b || (Array.isArray(a) && Array.isArray(b) && JSON.stringify(a) === JSON.stringify(b))

export const patchContainer = (id: string, p: Partial<Container>) =>
  updateRecord('containers', id, (c) => {
    let next = { ...c, ...p }
    // A new amount counts from this month (F9): the months before keep the old one.
    if ('amount' in p && p.amount !== c.amount && !('past' in p)) next = { ...next, past: pastAfterChange(c, warsawNow().month) }
    const massChanged = MASS_FIELDS.some((k) => k in next && !same(next[k], c[k]))
    const stamped = massChanged ? { ...next, amountAt: new Date().toISOString() } : next
    return c.cycleMonths <= 1 && stamped.cycleMonths > 1 ? fromNow(stamped) : stamped
  })

/** What a change of a container's amount writes (F9) – its „Cofnij” puts these back. */
const AMOUNT_FIELDS = ['amount', 'past', 'priceIgnored', 'amountAt'] as const

function amountUndo(c: Container): () => void {
  const before: Partial<Container> = {}
  for (const k of AMOUNT_FIELDS) (before as Record<string, unknown>)[k] = c[k]
  return () => updateRecord('containers', c.id, (x) => ({ ...x, ...before }))
}

/**
 * „Zaktualizuj” (F9): the container's new price from this month on – the months before keep the old one (its history of
 * amounts); „Cofnij” takes it back.
 */
export function updatePrice(c: Container, to: number): void {
  if (!canWrite()) return
  const undo = amountUndo(c)
  const { month } = warsawNow()
  patchContainer(c.id, { amount: to, priceIgnored: null })
  toast(`${c.name}: ${plnText(to)} zł od ${monthGenLabel(month)} – wcześniejsze miesiące liczą się kwotą ${plnText(c.amount)} zł.`, 'success', 8000, { label: 'Cofnij', run: undo })
}

/** „To nie zmiana ceny” (F9): this price is not proposed again (another one would be). */
export function ignorePrice(c: Container, to: number): void {
  if (!canWrite()) return
  patchContainer(c.id, { priceIgnored: to })
  toast(`${c.name}: kwota ${plnText(to)} zł nie będzie proponowana.`, 'info', 6000, { label: 'Cofnij', run: () => patchContainer(c.id, { priceIgnored: c.priceIgnored }) })
}

/** The amount for every month (F9 – a typo set right, not a raise): the history of amounts goes. */
export function clearPast(c: Container): void {
  if (!canWrite() || !c.past.length) return
  patchContainer(c.id, { past: [] })
  toast(`${c.name}: ${plnText(c.amount)} zł we wszystkich miesiącach.`, 'success', 8000, { label: 'Cofnij', run: () => patchContainer(c.id, { past: c.past }) })
}

/** „Nadal płacę” (F9): the payments missing so far never make it look cancelled. */
export function keepContainer(c: Container): void {
  if (!canWrite()) return
  patchContainer(c.id, { aliveAt: warsawNow().date })
  toast(`${c.name} zostaje w ładowni.`, 'info', 6000, { label: 'Cofnij', run: () => patchContainer(c.id, { aliveAt: c.aliveAt }) })
}

/** „Nie proponuj” (F23): the payee's recurring payments are not proposed for the hold any more. */
export function ignoreProposal(p: Pick<RecurringPayment, 'key' | 'label'>): void {
  if (!canWrite()) return
  const set = (on: boolean) =>
    updateSettings((f) => {
      const list = f.settings.cargo.ignored.filter((k) => k !== p.key)
      return { ...f, settings: { ...f.settings, cargo: { ...f.settings.cargo, ignored: on ? [...list, p.key] : list } } }
    })
  set(true)
  toast(`„${p.label}” nie będzie proponowany do ładowni.`, 'info', 6000, { label: 'Cofnij', run: () => set(false) })
}

/** „Proponuj znowu” (F23): the payees said „nie proponuj” to – back among the proposals. */
export function unignoreProposals(keys: readonly string[]): void {
  if (!canWrite() || !keys.length) return
  updateSettings((f) => ({ ...f, settings: { ...f.settings, cargo: { ...f.settings.cargo, ignored: f.settings.cargo.ignored.filter((k) => !keys.includes(k)) } } }))
}

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

/**
 * A fixed fee paid where no file of the bank shows it (cash, Portfel XTB) – or before its import (F1): its operation
 * today, linked to the container, with its amount, account and category; „Cofnij” takes it back. An operation of an
 * imported account is matched with the bank's row by the next import (a hand-typed entry).
 */
export function payContainer(c: Container): string | null {
  if (!canWrite()) return null
  const accounts = useData.getState().fi?.settings.accounts ?? []
  const accountId = accounts.some((a) => a.id === c.accountId && !a.archived) ? c.accountId! : MBANK_ACCOUNT_ID
  const now = new Date().toISOString()
  const record = transactionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    createdAt: now,
    updatedAt: now,
    date: warsawNow().date,
    accountId,
    amount: -c.amount,
    kind: 'expense',
    categoryId: c.categoryId,
    counterparty: c.counterparty.trim() || c.name,
    containerId: c.id
  })
  addRecord('transactions', record)
  toast(`Zapisano płatność: ${c.name} ${plnText(c.amount)} zł (dziś).`, 'success', 6000, { label: 'Cofnij', run: () => deleteOrSay('transactions', record.id) })
  return record.id
}

/**
 * Sets the initial tank balance of a periodic container at the budget's start (`settings.budget.initial.tanks`, N-PC-7)
 * from the shields, so a cycle that started before the budget does not inflate the remaining installments; „Cofnij”
 * restores the previous value.
 */
export function setInitialTank(containerId: string, name: string, amount: number): void {
  if (!canWrite()) return
  const prev = useData.getState().fi?.settings.budget.initial?.tanks?.[containerId] ?? 0
  const apply = (val: number) =>
    updateSettings((f) => {
      const init = f.settings.budget.initial ?? { shields: 0, hull: 0, goals: {} }
      const tanks = { ...(init.tanks ?? {}) }
      if (val > 0) tanks[containerId] = val
      else delete tanks[containerId]
      return {
        ...f,
        settings: {
          ...f.settings,
          budget: { ...f.settings.budget, initial: { ...init, ...(Object.keys(tanks).length ? { tanks } : { tanks: undefined }) } }
        }
      }
    })
  apply(amount)
  toast(`Zbiornik „${name}” zasilony na starcie budżetu kwotą ${plnText(amount)} zł (z osłon).`, 'success', 7000, {
    label: 'Cofnij',
    run: () => apply(prev)
  })
}
