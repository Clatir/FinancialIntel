/**
 * The fixed fees' state (F1, D86; AP-10 – one state for Ładownia, the Radar, the briefing and the notifications): every
 * monthly container of the cargo hold – and a periodic fee in its due month – is paid (a payment of this due), waiting
 * (before its due, or its account's files from the bank do not reach the days after it yet) or overdue (3 days after its
 * due without a payment). A due of an earlier month still unpaid stays (D99 pkt 3, T375) – overdue until a payment pays
 * it. The due: the day of the month its payments come on (its last linked payments since its day was set – T376), else
 * its own payment day. A loan's installments are the loan's (its own reminder – T70), an archived container is out of
 * the hold. Pure.
 */
import type { Container, Transaction } from '../schema/records'
import { addDays, addMonths, dayOfMonth, daysInMonth, firstDayOf, monthOf, warsawNow } from './dates'
import { activeIn, amountIn, cyclePosition, followedFrom, nextUnpaidOf, type CycleOf, type FleetState } from './fleet'
import { OVERDUE_DAYS } from './loans'
import { partsOf } from './operations'

/** A payment this many days before its due is that due's (a rent paid at the month's end for the next one). */
export const EARLY_DAYS = 14
/** The linked payments the payment day is read from (the latest ones). */
export const DAY_FROM_PAYMENTS = 6

/** A payment this far from the container's amount is another price (F9): 5%, at least 2 zł. */
export const priceTolerance = (amount: number): number => Math.max(Math.round(amount * 0.05), 200)

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
  /** This due's date: this month's – or, `carried`, an earlier month's. */
  due: string
  /** Its payments count from this day (14 days before it; T135 – the month before): an earlier one is the due before's. */
  from: string
  state: CargoState
  /** Waiting for the bank: its account's files do not reach the days after the due yet – never overdue then. */
  importPending: boolean
  /** The payments of this due (by date) and their sum (grosze, positive). */
  payments: CargoPayment[]
  paid: number
  /** A due of an earlier month still unpaid (AP-10, D99 pkt 3): it stays until a payment pays it. */
  carried: boolean
  /** A payment today pays this due – not the one before it, still unpaid, nor the next one (T375). */
  payToday: boolean
}

export interface CargoInput {
  containers: readonly Container[]
  transactions: readonly Transaction[]
  today: string
  /** The periodic fees' tanks of the engine (`paidDue` – this cycle paid, early too: B55). */
  tanks: FleetState['tanks']
  /** The last day the bank's files cover on each account (`settings.import.coveredTo`). */
  coveredTo: Readonly<Record<string, string>>
  /**
   * The budget's start (the engine's `FleetState.start`): the dues of the months before this one are followed from it
   * (and from the month the container came into the hold) – unpaid, they stay (D99 pkt 3). None – this month's only.
   */
  start?: string | null
}

export interface Linked extends CargoPayment {
  accountId: string
}

export interface PaymentsIndex {
  /** The payments linked to each container, by date. */
  byContainer: Map<string, Linked[]>
  /** Each account's latest row from the bank (a folder from before 1.5.0 has no `coveredTo`). */
  lastBank: Map<string, string>
}

const indexes = new WeakMap<readonly Transaction[], PaymentsIndex>()

/** Once per list of the store (its lists stay while the records do). */
export function paymentsIndex(transactions: readonly Transaction[]): PaymentsIndex {
  let index = indexes.get(transactions)
  if (index) return index
  index = { byContainer: new Map(), lastBank: new Map() }
  for (const t of transactions) {
    if (t.bank && t.date > (index.lastBank.get(t.accountId) ?? '')) index.lastBank.set(t.accountId, t.date)
    if (t.containerId) {
      if (t.amount >= 0) continue
      const p: Linked = { id: t.id, date: t.date, amount: -t.amount, accountId: t.accountId }
      const list = index.byContainer.get(t.containerId)
      if (list) list.push(p)
      else index.byContainer.set(t.containerId, [p])
    } else if (t.splits.length > 0 && t.kind === 'expense') {
      for (const part of partsOf(t)) {
        if (!part.containerId || part.amount >= 0 || part.refundable) continue
        const p: Linked = { id: t.id, date: t.date, amount: -part.amount, accountId: t.accountId }
        const list = index.byContainer.get(part.containerId)
        if (list) list.push(p)
        else index.byContainer.set(part.containerId, [p])
      }
    }
  }
  for (const list of index.byContainer.values()) list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1))
  indexes.set(transactions, index)
  return index
}

/** The day `day` of `month`, cut to the month's length. */
export const dueIn = (month: string, day: number): string => `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, '0')}`

/** The Warsaw day of an ISO time ('' for none). */
const dayOf = (iso: string | null | undefined): string => (iso ? warsawNow(iso).date : '')

/**
 * The payment day: the middle one of its last payments before this month, else the container's own. A day set by hand
 * (`dueAt`, T376) is a decision: only the payments from that day on count – none yet, the container's day.
 */
export function paymentDay(c: Pick<Container, 'dueDay'> & { dueAt?: string | null }, linked: readonly Linked[], month: string): Pick<CargoStatus, 'day' | 'dayFrom'> {
  const before = firstDayOf(month)
  const set = dayOf(c.dueAt)
  const days = linked
    .filter((p) => p.date < before && p.date >= set)
    .slice(-DAY_FROM_PAYMENTS)
    .map((p) => dayOfMonth(p.date))
    .sort((a, b) => a - b)
  return days.length ? { day: days[(days.length - 1) >> 1]!, dayFrom: 'history' } : { day: c.dueDay, dayFrom: 'set' }
}

/** One due of a fee: its month and day, the day its payments count from and the day from which they are its own. */
export interface FeeDue {
  month: string
  date: string
  /** Its payments count from this day – up to the next due's `from`. */
  from: string
  /** A payment before this day (from `from` on) pays the due before when that one is unpaid: the late one first. */
  early: string
  payments: Linked[]
}

/**
 * A due's window (T208, T135, T375): a monthly fee's (and one of a 2-month cycle) from 14 days before its day; a periodic
 * fee's of 3 months and more from the 1st of the month before its due month (T135 – early: the 1st on a Monday). A payment
 * before the due's day (a periodic fee: before its due month) is its own only when the due before is paid.
 */
export function dueWindow(c: CycleOf, month: string, day: number): Pick<FeeDue, 'month' | 'date' | 'from' | 'early'> {
  const date = dueIn(month, day)
  if (c.cycleMonths > 1 && cyclePosition(c, month).length >= 3) return { month, date, from: firstDayOf(addMonths(month, -1)), early: firstDayOf(month) }
  return { month, date, from: addDays(date, -EARLY_DAYS), early: date }
}

/** The due month after `month`'s (the next cycle's). */
const nextDueMonth = (c: CycleOf, month: string): string => (c.cycleMonths > 1 ? cyclePosition(c, addMonths(month, 1)).dueMonth : addMonths(month, 1))

export interface FeeDuesOptions {
  /** The dues followed: from the one of `first`'s cycle to the one of `last`'s. */
  first: string
  last: string
  /** The fee's amount in a due's month (the spare of a double payment – T375); none – any spare payment pays. */
  amountAt?: (month: string) => number
  /** A bill of a varying amount (F23): any spare payment pays an older due. */
  variable?: boolean
  /** A due that may take a late payment (in the fee's life, not settled); unpaid besides. */
  open?: (d: FeeDue) => boolean
}

/**
 * A fee's dues with their payments (AP-10, T375 – one rule for the state, the hold's watch and the briefing): a payment
 * is the due's whose window it falls in (`dueWindow`); before that due's day it pays the due before when that one is
 * still unpaid (the late one first – T135 „zaległa zapłata poprzedniego cyklu”); and what a due's payments bring beyond
 * its amount (a second payment, after its own latest ones make its amount) pays the oldest unpaid due before it. The
 * list ends with one more due: its window bounds the last one's.
 */
export function feeDues(c: CycleOf, day: number, linked: readonly Linked[], o: FeeDuesOptions): FeeDue[] {
  const dues: FeeDue[] = []
  let m = c.cycleMonths > 1 ? cyclePosition(c, o.first).dueMonth : o.first
  for (let n = 0; n < 1200; n++) {
    dues.push({ ...dueWindow(c, m, day), payments: [] })
    if (m > o.last) break
    m = nextDueMonth(c, m)
  }
  const real = dues.length - 1
  const open = (d: FeeDue) => !d.payments.length && (o.open ? o.open(d) : true)
  let i = 0
  for (const p of linked) {
    if (p.date < dues[0]!.from) continue
    while (i < real && p.date >= dues[i + 1]!.from) i++
    if (i >= real) break
    dues[p.date < dues[i]!.early && i > 0 && open(dues[i - 1]!) ? i - 1 : i]!.payments.push(p)
  }
  // A double payment (a second transfer, or one of two dues): the spare pays the oldest unpaid due before it.
  const need = (x: FeeDue) => {
    if (o.variable || !o.amountAt) return 1
    const amount = o.amountAt(x.month)
    return Math.max(1, amount - priceTolerance(amount))
  }
  for (let j = 1; j < real; j++) {
    const d = dues[j]!
    if (!d.payments.length) continue
    const older = dues.slice(0, j).filter(open)
    if (!older.length) continue
    // Its own: its latest payments that make its amount (the latest one at least); the earlier ones are spare.
    let keep = d.payments.length
    let own = 0
    do own += d.payments[--keep]!.amount
    while (keep > 0 && own < need(d))
    if (own < need(d) || keep === 0) continue
    let spare = d.payments.slice(0, keep)
    for (const x of older) {
      let sum = 0
      let n = 0
      while (n < spare.length && sum < need(x)) sum += spare[n++]!.amount
      if (sum < need(x)) break
      x.payments.push(...spare.slice(0, n))
      spare = spare.slice(n)
    }
    d.payments = [...spare, ...d.payments.slice(keep)]
  }
  return dues
}

/** The due a payment on `date` would go to (`feeDues` – the late one first); -1 = none of them. */
function dueOfPayment(dues: readonly FeeDue[], date: string, open: (d: FeeDue) => boolean): number {
  const real = dues.length - 1
  if (date < dues[0]!.from) return -1
  let i = 0
  while (i < real && date >= dues[i + 1]!.from) i++
  if (i >= real) return -1
  return date < dues[i]!.early && i > 0 && open(dues[i - 1]!) ? i - 1 : i
}

/** The month the hold follows a fee from (T375): the budget's start, its `from`, the month it came into the hold. */
function followedMonth(c: Container, start: string, month: string): string {
  const from = [followedFrom(c, start), warsawNow(c.createdAt).month].sort().at(-1)!
  return from < month ? from : month
}

export function cargoStatuses(o: CargoInput): CargoStatus[] {
  const month = monthOf(o.today)
  const index = paymentsIndex(o.transactions)
  const out: CargoStatus[] = []
  for (const c of o.containers) {
    // A fee whose life ended (`until`) still has its last dues unpaid; one out of the hold (archived) none.
    if (c.archived || c.loanId || (!o.start && !activeIn(c, month))) continue
    const linked = index.byContainer.get(c.id) ?? []
    const { day, dayFrom } = paymentDay(c, linked, month)
    const first = o.start ? followedMonth(c, o.start, month) : month
    const settled = c.aliveAt ?? ''
    // An earlier due takes a late payment while in the fee's life and not settled outside the budget (`aliveAt`).
    const followed = (d: FeeDue) => d.month >= month || (activeIn(c, d.month) && d.date >= settled)
    // Up to the next due: a payment in its window before its day may be a late one of this month's.
    const dues = feeDues(c, day, linked, { first, last: nextDueMonth(c, month), amountAt: (m) => amountIn(c, m), variable: c.variable, open: followed })
    const tankPaid = c.cycleMonths > 1 && o.tanks.some((t) => t.containerId === c.id && t.paidDue === month)
    const isPaid = (d: FeeDue) => d.payments.length > 0 || (d.month === month && tankPaid)
    const payToday = dueOfPayment(dues, o.today, (d) => !isPaid(d) && followed(d))
    const account = c.accountId ?? linked.at(-1)?.accountId ?? null
    const covered = account ? [o.coveredTo[account] ?? '', index.lastBank.get(account) ?? ''].sort().at(-1)! : ''
    for (let i = 0; i < dues.length - 1; i++) {
      const d = dues[i]!
      // This month's due (a periodic fee only in its due month – the months before fill its tank, the asteroids announce
      // it); an earlier month's only while unpaid (D99 pkt 3).
      if (d.month > month || !activeIn(c, d.month)) continue
      const carried = d.month < month
      if (carried && (isPaid(d) || !followed(d))) continue
      const payments = d.payments.map(({ id, date, amount }) => ({ id, date, amount }))
      // The last of the 3 days a payment may take: overdue after it – when the bank's files reach it (or none come).
      const graceEnd = addDays(d.date, OVERDUE_DAYS - 1)
      let state: CargoState = 'waiting'
      let importPending = false
      if (isPaid(d)) state = 'paid'
      else if (o.today > d.date) {
        importPending = covered !== '' && covered < graceEnd
        state = o.today > graceEnd && !importPending ? 'overdue' : 'waiting'
      }
      out.push({
        containerId: c.id,
        name: c.name,
        amount: amountIn(c, d.month),
        cycleMonths: c.cycleMonths,
        day,
        dayFrom,
        due: d.date,
        from: d.from,
        state,
        importPending,
        payments,
        paid: payments.reduce((s, p) => s + p.amount, 0),
        carried,
        payToday: payToday === i
      })
    }
  }
  return out.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.name.localeCompare(b.name)))
}

/** Each container's payment day as its state counts it (T208, T376): the dues ahead on the Radar and in the briefing too. */
export function cargoDays(o: Pick<CargoInput, 'containers' | 'transactions' | 'today'>): Map<string, number> {
  const month = monthOf(o.today)
  const index = paymentsIndex(o.transactions)
  const out = new Map<string, number>()
  for (const c of o.containers) if (!c.loanId) out.set(c.id, paymentDay(c, index.byContainer.get(c.id) ?? [], month).day)
  return out
}

/**
 * The next due of a fee still to pay (AP-10, AF-15 – the briefing, the Radar and Ładownia alike): this month's from its
 * state (late – still this one), else the next one on its payment day (`day` – `cargoDays`), a cycle the engine has paid
 * already skipped (`paidDue`, B55).
 */
export function nextDueOf(
  c: CycleOf & Pick<Container, 'dueDay'>,
  today: string,
  o: { day?: number; paidDue?: string | null; status?: Pick<CargoStatus, 'due' | 'state' | 'carried'> }
): string {
  const at = o.day != null ? { ...c, dueDay: o.day } : c
  const s = o.status && !o.status.carried ? o.status : undefined
  if (s && s.state !== 'paid') return s.due
  const from = s ? firstDayOf(addMonths(monthOf(s.due), 1)) : today
  return nextUnpaidOf(at, from > today ? from : today, o.paidDue)
}
