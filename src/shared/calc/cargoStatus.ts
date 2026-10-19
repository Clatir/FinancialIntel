/**
 * The fixed fees of this month (F1, D86): every monthly container of the cargo hold – and a periodic fee in its due
 * month – is paid (a payment linked to it in this cycle), waiting (before its due, or its account's files from the bank
 * do not reach the days after it yet) or overdue (3 days after its due without a payment). The due: the day of the month
 * its payments come on (its last linked payments), else its own payment day. A loan's installments are the loan's
 * (its own reminder – T70), an archived container is out of the hold. Pure.
 */
import type { Container, Transaction } from '../schema/records'
import { addDays, addMonths, dayOfMonth, daysInMonth, firstDayOf, monthOf } from './dates'
import { activeIn, cyclePosition, type FleetState } from './fleet'
import { OVERDUE_DAYS } from './loans'

/** A payment this many days before its due is that due's (a rent paid at the month's end for the next one). */
export const EARLY_DAYS = 14
/** The linked payments the payment day is read from (the latest ones). */
export const DAY_FROM_PAYMENTS = 6

export type CargoState = 'paid' | 'waiting' | 'overdue'

export interface CargoPayment {
  id: string
  date: string
  /** Grosze, positive. */
  amount: number
}

export interface CargoStatus {
  containerId: string
  name: string
  amount: number
  cycleMonths: number
  /** The day of the month its payment comes on: read from its payments ('history'), or its own payment day ('set'). */
  day: number
  dayFrom: 'history' | 'set'
  /** This cycle's due date (this month). */
  due: string
  state: CargoState
  /** Waiting for the bank: its account's files do not reach the days after the due yet – never overdue then. */
  importPending: boolean
  /** The payments linked to it in this cycle (by date) and their sum (grosze, positive). */
  payments: CargoPayment[]
  paid: number
}

export interface CargoInput {
  containers: readonly Container[]
  transactions: readonly Transaction[]
  today: string
  /** The periodic fees' tanks of the engine (`paidDue` – this cycle paid, early too: B55). */
  tanks: FleetState['tanks']
  /** The last day the bank's files cover on each account (`settings.import.coveredTo`). */
  coveredTo: Readonly<Record<string, string>>
}

interface Linked extends CargoPayment {
  accountId: string
}

interface PaymentsIndex {
  /** The payments linked to each container, by date. */
  byContainer: Map<string, Linked[]>
  /** Each account's latest row from the bank (a folder from before 1.5.0 has no `coveredTo`). */
  lastBank: Map<string, string>
}

const indexes = new WeakMap<readonly Transaction[], PaymentsIndex>()

/** Once per list of the store (its lists stay while the records do). */
function paymentsIndex(transactions: readonly Transaction[]): PaymentsIndex {
  let index = indexes.get(transactions)
  if (index) return index
  index = { byContainer: new Map(), lastBank: new Map() }
  for (const t of transactions) {
    if (t.bank && t.date > (index.lastBank.get(t.accountId) ?? '')) index.lastBank.set(t.accountId, t.date)
    if (!t.containerId || t.amount >= 0) continue
    const p: Linked = { id: t.id, date: t.date, amount: -t.amount, accountId: t.accountId }
    const list = index.byContainer.get(t.containerId)
    if (list) list.push(p)
    else index.byContainer.set(t.containerId, [p])
  }
  for (const list of index.byContainer.values()) list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1))
  indexes.set(transactions, index)
  return index
}

/** The day `day` of `month`, cut to the month's length. */
export const dueIn = (month: string, day: number): string => `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, '0')}`

/** The payment day: the middle one of its last payments before this month, else the container's own. */
function paymentDay(c: Container, linked: readonly Linked[], month: string): Pick<CargoStatus, 'day' | 'dayFrom'> {
  const before = firstDayOf(month)
  const days = linked
    .filter((p) => p.date < before)
    .slice(-DAY_FROM_PAYMENTS)
    .map((p) => dayOfMonth(p.date))
    .sort((a, b) => a - b)
  return days.length ? { day: days[(days.length - 1) >> 1]!, dayFrom: 'history' } : { day: c.dueDay, dayFrom: 'set' }
}

export function cargoStatuses(o: CargoInput): CargoStatus[] {
  const month = monthOf(o.today)
  const index = paymentsIndex(o.transactions)
  const out: CargoStatus[] = []
  for (const c of o.containers) {
    if (c.archived || c.loanId || !activeIn(c, month)) continue
    // A periodic fee only in its due month (the months before fill its tank – the asteroids announce it).
    if (c.cycleMonths > 1 && cyclePosition(c, month).dueMonth !== month) continue
    const linked = index.byContainer.get(c.id) ?? []
    const { day, dayFrom } = paymentDay(c, linked, month)
    const due = dueIn(month, day)
    // This cycle's payments: from a little before its due up to a little before the next one's.
    const from = addDays(due, -EARLY_DAYS)
    const until = addDays(dueIn(addMonths(month, c.cycleMonths), day), -EARLY_DAYS)
    const payments = linked.filter((p) => p.date >= from && p.date < until).map(({ id, date, amount }) => ({ id, date, amount }))
    const paid = payments.reduce((s, p) => s + p.amount, 0)
    const tankPaid = c.cycleMonths > 1 && o.tanks.some((t) => t.containerId === c.id && t.paidDue === month)
    // The last of the 3 days a payment may take: overdue after it – when the bank's files reach it (or none come).
    const graceEnd = addDays(due, OVERDUE_DAYS - 1)
    let state: CargoState = 'waiting'
    let importPending = false
    if (payments.length || tankPaid) state = 'paid'
    else if (o.today > graceEnd) {
      const account = c.accountId ?? linked.at(-1)?.accountId ?? null
      const covered = account ? [o.coveredTo[account] ?? '', index.lastBank.get(account) ?? ''].sort().at(-1)! : ''
      importPending = covered !== '' && covered < graceEnd
      state = importPending ? 'waiting' : 'overdue'
    }
    out.push({ containerId: c.id, name: c.name, amount: c.amount, cycleMonths: c.cycleMonths, day, dayFrom, due, state, importPending, payments, paid })
  }
  return out.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.name.localeCompare(b.name)))
}
