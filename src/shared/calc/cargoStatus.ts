/**
 * The fixed fees' state (F1, D86; AP-10 – one state for Ładownia, the Radar, the briefing and the notifications): every
 * monthly container of the cargo hold – and a periodic fee in its due month – is paid (a payment of this due), waiting
 * (before its due, or its account's files from the bank do not reach the days after it yet) or overdue (3 days after its
 * due without a payment). A due of an earlier month still unpaid stays (D99 pkt 3, T375) – overdue until a payment pays
 * it. The due: the day of the month its payments come on (its last linked payments since its day was set – T376), else
 * its own payment day. A loan's installments are the loan's (its own reminder – T70), an archived container is out of
 * the hold. Which payment pays a fee (`paymentsIndex`) and which due it pays (`feeDuesOf`) is one rule (T393) – the
 * engine's paid cycles and the start wizard's too (`paidDuesOf`); a payment written ahead pays only from its day (T398).
 * Pure.
 */
import type { Container, Transaction } from '../schema/records'
import { addDays, addMonths, dayOfMonth, daysInMonth, firstDayOf, monthOf, warsawNow } from './dates'
// The engine reads its paid cycles from here (T393) and this module the calendar from it – a cycle of functions only.
import { activeIn, amountIn, cyclePosition, followedFrom, nextPaymentOf, nextUnpaidOf, type AmountOf, type CycleOf, type FeeOf } from './fleet'
import { OVERDUE_DAYS } from './loans'
import { partsOf } from './operations'

/** A payment this many days before its due is that due's (a rent paid at the month's end for the next one). */
export const EARLY_DAYS = 14
/**
 * How far ahead the payments written ahead (dated after today – T398) are matched to the dues they pay: the Radar's
 * window (`RADAR_DAYS` is this one) – a due of it its payment pays is the payment's, never the Radar's again.
 */
export const AHEAD_DAYS = 90
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
  /**
   * A payment today closes this due (T375, T394, T398 – the oldest one neither paid nor planned a payment of today leaves
   * paid or planned, the payments written ahead counted in): not the one before it, still open, nor the next one.
   */
  payToday: boolean
  /**
   * The payment written ahead (dated after today – T398) the same rule gives this due, unpaid now – its first one: the
   * state and the engine count it only from its day; Ładownia shows it beside the due, the Radar and the briefing leave
   * the due out (`plannedDues` – the balances ahead count the operation on its day). null – none.
   */
  planned: CargoPayment | null
}

export interface CargoInput {
  containers: readonly Container[]
  transactions: readonly Transaction[]
  today: string
  /** The last day the bank's files cover on each account (`settings.import.coveredTo`). */
  coveredTo: Readonly<Record<string, string>>
  /**
   * The budget's start (the engine's `FleetState.start`): the dues from that day on are followed (and from the month the
   * container came into the hold) – unpaid, they stay (D99 pkt 3). None (or a start ahead) – this month's only.
   */
  start?: string | null
}

export interface Linked extends CargoPayment {
  accountId: string
}

export interface PaymentsIndex {
  /** The payments of each container (`paymentsIndex`), by date. */
  byContainer: Map<string, Linked[]>
  /** Each account's latest row from the bank (a folder from before 1.5.0 has no `coveredTo`). */
  lastBank: Map<string, string>
}

const indexes = new WeakMap<readonly Transaction[], PaymentsIndex>()

/**
 * The order of a fee's payments (T393 – the hold's index and the engine's payments before the start alike): by their day,
 * then their operation – the payments of one day come in one order everywhere.
 */
export const byPaymentDay = (a: Pick<Linked, 'date' | 'id'>, b: Pick<Linked, 'date' | 'id'>): number =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0

/**
 * Once per list of the store (its lists stay while the records do). A container's payments – the one rule of which
 * payment pays a fee (T393, T345): Ładownia, the Radar, the briefing, the hold's watch, the engine's paid cycles and the
 * start wizard read only these. An expense's parts linked to the container (the part's own, else the operation's), one
 * payment per operation – their sum, money out. A part paid from a goal or to be refunded by a household member pays it
 * too – the bill is paid (the money is the goal's or the household's: the engine never draws the tank for it). Another kind
 * with a container – an old transfer, loan or XTB operation from before T362 (`withKind`) – never.
 */
export function paymentsIndex(transactions: readonly Transaction[]): PaymentsIndex {
  let index = indexes.get(transactions)
  if (index) return index
  index = { byContainer: new Map(), lastBank: new Map() }
  for (const t of transactions) {
    if (t.bank && t.date > (index.lastBank.get(t.accountId) ?? '')) index.lastBank.set(t.accountId, t.date)
    if (t.kind !== 'expense' || (!t.containerId && !t.splits.length)) continue
    let byContainer: Map<string, number> | null = null
    for (const part of partsOf(t)) {
      if (!part.containerId) continue
      byContainer ??= new Map()
      byContainer.set(part.containerId, (byContainer.get(part.containerId) ?? 0) - part.amount)
    }
    for (const [containerId, amount] of byContainer ?? []) {
      if (amount <= 0) continue
      const p: Linked = { id: t.id, date: t.date, amount, accountId: t.accountId }
      const list = index.byContainer.get(containerId)
      if (list) list.push(p)
      else index.byContainer.set(containerId, [p])
    }
  }
  for (const list of index.byContainer.values()) list.sort(byPaymentDay)
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
  /** A due that may take a payment on `at` late (in the fee's life, not settled – `feeDuesOf`); unpaid besides. */
  open?: (d: FeeDue, at: string) => boolean
}

/**
 * The due a payment on `date` in the window of `dues[i]` pays (T135, T375, przegląd N3 10): its own – but before its day,
 * while the due before it is still unpaid (late), the oldest one unpaid: the late one first. The due before paid, a
 * payment before the day is the next cycle's early one (T135), whatever older due stays unpaid.
 */
function payeeOf(dues: readonly FeeDue[], i: number, date: string, open: (d: FeeDue, at: string) => boolean): number {
  if (i === 0 || date >= dues[i]!.early || !open(dues[i - 1]!, date)) return i
  let k = 0
  while (!open(dues[k]!, date)) k++
  return k
}

/**
 * A fee's dues with their payments (AP-10, T375, T393 – one rule for the state, the hold's watch, the briefing and the
 * engine's paid cycles), the payments in their order – each day's state stays as it was: a payment is the due's whose
 * window it falls in (`dueWindow`); before that due's day, while the due before is still unpaid, it pays the oldest unpaid
 * due (the late one first – T135 „zaległa zapłata poprzedniego cyklu”); and what a due's payments bring beyond its amount
 * (a second payment: its own latest ones make its amount) pays the oldest unpaid due before it then. A payment today pays
 * the due `payToday` says. The list ends with one more due: its window bounds the last one's.
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
  const open = (d: FeeDue, at: string) => !d.payments.length && (o.open ? o.open(d, at) : true)
  const need = (x: FeeDue) => {
    if (o.variable || !o.amountAt) return 1
    const amount = o.amountAt(x.month)
    return Math.max(1, amount - priceTolerance(amount))
  }
  /** A double payment of `dues[j]` (a second transfer, or one of two dues): the spare pays the oldest unpaid due before it. */
  const spareOf = (j: number) => {
    const d = dues[j]!
    // One payment is all its own: a spare needs a second one.
    if (d.payments.length < 2) return
    // Its own: its latest payments that make its amount (the latest one at least); the earlier ones are spare.
    let keep = d.payments.length
    let own = 0
    do own += d.payments[--keep]!.amount
    while (keep > 0 && own < need(d))
    if (own < need(d) || keep === 0) return
    let spare = d.payments.slice(0, keep)
    for (let k = 0; k < j && spare.length; k++) {
      const x = dues[k]!
      if (!open(x, spare[0]!.date)) continue
      let sum = 0
      let n = 0
      while (n < spare.length && sum < need(x)) sum += spare[n++]!.amount
      if (sum < need(x)) break
      x.payments.push(...spare.slice(0, n))
      spare = spare.slice(n)
    }
    d.payments = [...spare, ...d.payments.slice(keep)]
  }
  let i = 0
  for (const p of linked) {
    if (p.date < dues[0]!.from) continue
    while (i < real && p.date >= dues[i + 1]!.from) i++
    if (i >= real) break
    const j = payeeOf(dues, i, p.date, open)
    dues[j]!.payments.push(p)
    spareOf(j)
  }
  return dues
}

/**
 * A fee as its dues count (T375, T393): its calendar, life and amounts; its payment day (`dueDay`, set by hand at `dueAt`
 * – T376; a fee of the start wizard without one – its latest payment's); the month it came into the hold (`createdAt`),
 * the day the dues before are settled outside the budget or by „Nadal płacę” (`aliveAt`), a bill of a varying amount.
 */
export type FeeDuesOf = FeeOf & AmountOf & { dueDay?: number; dueAt?: string | null; createdAt?: string; aliveAt?: string | null; variable?: boolean }

/** Whose dues are followed (T375, T393). */
export interface FeeFollow {
  /** The budget's first day (`FleetState.start`) – the dues from it on are the budget's; null – none: this month's only. */
  start: string | null
  /** The month of the state: its due stays followed whatever settled the ones before (`aliveAt`). */
  month: string
  /** The dues followed on to this month's (the payments written ahead – T398); none – to the due after `month`'s. */
  until?: string
}

export interface FeeDuesState {
  /** The dues with their payments (`feeDues`); the last one bounds the one before. */
  dues: FeeDue[]
  /** A due may take a payment on `at` late – and a spare one (`FeeDuesOptions.open`, unpaid besides). */
  followed: (d: FeeDue, at: string) => boolean
}

/** Its payment day for the dues of `month` (T208, T376) – a fee without its own day (a proposal): its latest payment's. */
export const feeDayOf = (c: Pick<FeeDuesOf, 'dueDay' | 'dueAt'>, linked: readonly Linked[], month: string): number =>
  paymentDay({ dueDay: c.dueDay ?? (linked.length ? dayOfMonth(linked[linked.length - 1]!.date) : 1), dueAt: c.dueAt }, linked, month).day

/** The Warsaw month a fee came into the hold – once per record (the engine asks at every month's turn). */
const createdMonths = new WeakMap<object, string>()
function createdMonthOf(c: FeeDuesOf): string {
  if (!c.createdAt) return ''
  let month = createdMonths.get(c)
  if (month == null) createdMonths.set(c, (month = warsawNow(c.createdAt).month))
  return month
}

/**
 * A fee's dues with their payments as of `f.month` (T375, T393) – the one rule of Ładownia, the Radar, the briefing and
 * the engine's paid cycles (`paidDuesOf`). The budget's dues: from its first day (przegląd N3 5 – a due before it was
 * paid or not before the budget, never „po terminie”), from the month the fee came into the hold (przegląd N3 4), in its
 * life, not settled outside the budget (`aliveAt`, przegląd N3 3 – this month's never). A payment before the budget's
 * start pays the dues of the fee followed from its first payment seen (T345, przegląd N2 4): a late one the late due,
 * never the next; a due whose window began before that payment is not followed. The list runs from the budget's start
 * (or the cycle before that first payment) to the due after this month's (`f.until`'s).
 */
export function feeDuesOf(c: FeeDuesOf, linked: readonly Linked[], day: number, f: FeeFollow): FeeDuesState {
  const { start, month } = f
  const first0 = linked[0]?.date
  const seen = start && first0 && first0 < start ? first0 : null
  let first = start ? [followedFrom(c, start), month].sort()[0]! : month
  if (seen) {
    const pos = cyclePosition(c, monthOf(seen))
    const before = addMonths(pos.dueMonth, -pos.length)
    if (before < first) first = before
  }
  const created = createdMonthOf(c)
  const settled = c.aliveAt ?? ''
  const followed = (d: FeeDue, at: string): boolean => {
    if (!activeIn(c, d.month)) return false
    if (start && at < start) return seen != null && d.from > seen
    if (start && d.date < start) return false
    return d.month >= month || (d.month >= created && d.date >= settled)
  }
  const last = nextDueMonth(c, f.until && f.until > month ? f.until : month)
  const dues = feeDues(c, day, linked, { first, last, amountAt: (m) => amountIn(c, m), variable: c.variable, open: followed })
  return { dues, followed }
}

/**
 * The dues (their months) a fee's payments paid – the engine's paid cycles (B55, T345, T393), by the state's own rule
 * (`feeDuesOf`) with these payments: a cycle paid is a due Ładownia shows paid, a cycle not paid one it shows unpaid.
 */
export function paidDuesOf(c: FeeDuesOf, linked: readonly Linked[], day: number, f: FeeFollow): Set<string> {
  const out = new Set<string>()
  if (!linked.length) return out
  const { dues } = feeDuesOf(c, linked, day, f)
  for (let i = 0; i < dues.length - 1; i++) if (dues[i]!.payments.length) out.add(dues[i]!.month)
  return out
}

/** The first of a fee's payments (by day) dated after `today` – the list's length when none: the ones written ahead. */
function aheadFrom(linked: readonly Linked[], today: string): number {
  let i = linked.length
  while (i > 0 && linked[i - 1]!.date > today) i--
  return i
}

const strip = ({ id, date, amount }: CargoPayment): CargoPayment => ({ id, date, amount })

/** A fee today (T375, T393, T398): its state by the payments up to today, as the engine – and the dues planned. */
interface FeeToday extends FeeDuesState {
  all: readonly Linked[]
  /** Its payments up to today (the state's) – the ones after them in `all` are written ahead. */
  linked: readonly Linked[]
  day: number
  dayFrom: CargoStatus['dayFrom']
  follow: FeeFollow
  /** The state's follow with the dues on to the Radar's window (`AHEAD_DAYS`) – the payments written ahead are matched in it. */
  view: FeeFollow
  /** The dues a payment written ahead pays (its first one) by the same rule, all the payments in – by their months. */
  planned: ReadonlyMap<string, CargoPayment>
}

const NO_PLANNED: ReadonlyMap<string, CargoPayment> = new Map()

/**
 * The dues unpaid in `stateDues` (at `today`) that `viewDues` (with the payments written ahead, up to the Radar's
 * window) leaves paid (T398, T495): a due holding a payment dated after `today` – its first one; a late due closed by an
 * earlier payment shifted to it by a second payment of a window written ahead – the forward payment that shifted it.
 */
function plannedIn(stateDues: readonly FeeDue[], viewDues: readonly FeeDue[], today: string): Map<string, CargoPayment> {
  const paidNow = new Set(stateDues.slice(0, -1).filter((d) => d.payments.length).map((d) => d.month))
  const byMoved = new Map<Linked, CargoPayment>()
  const viewByMonth = new Map(viewDues.slice(0, -1).map((d) => [d.month, d]))
  const shifted: CargoPayment[] = []
  for (const d of stateDues.slice(0, -1)) {
    if (!d.payments.length) continue
    const v = viewByMonth.get(d.month)
    const forward = v?.payments.find((x) => x.date > today)
    if (!forward) continue
    const stripped = strip(forward)
    shifted.push(stripped)
    for (const p of d.payments) byMoved.set(p, stripped)
  }
  let s = 0
  const out = new Map<string, CargoPayment>()
  for (const d of viewDues.slice(0, -1)) {
    if (paidNow.has(d.month) || !d.payments.length) continue
    const p = d.payments.find((x) => x.date > today)
    const plan = p ? strip(p) : (byMoved.get(d.payments[0]!) ?? shifted[s++])
    if (plan) out.set(d.month, plan)
  }
  return out
}

/**
 * The fee `c` today – one rule for the state (`cargoStatuses`) and the dues planned on the Radar and in the briefing
 * (`plannedDues`): a payment written ahead (dated after today – B127) pays no due before its day, as in the engine
 * (`paidBefore` up to today – T398); a due unpaid today that the same rule leaves paid (`feeDuesOf` with all the
 * payments, up to the Radar's window – directly or by shifting an earlier payment of the window, T495) is planned.
 */
function feeToday(c: FeeDuesOf & Pick<Container, 'dueDay'>, all: readonly Linked[], today: string, start: string | null): FeeToday {
  const month = monthOf(today)
  const ahead = aheadFrom(all, today)
  const linked = ahead < all.length ? all.slice(0, ahead) : all
  const { day, dayFrom } = paymentDay(c, linked, month)
  const follow: FeeFollow = { start, month }
  // Up to the next due: a payment in its window before its day may be a late one of this month's.
  const state = feeDuesOf(c, linked, day, follow)
  if (ahead === all.length) return { ...state, all, linked, day, dayFrom, follow, view: follow, planned: NO_PLANNED }
  const view: FeeFollow = { ...follow, until: monthOf(addDays(today, AHEAD_DAYS)) }
  return { ...state, all, linked, day, dayFrom, follow, view, planned: plannedIn(state.dues, feeDuesOf(c, all, day, view).dues, today) }
}

/**
 * The due a payment on `today` of the fee's amount closes (T375 – „Zapłacone (kwota, dziś)”; T398): the oldest one neither
 * paid nor planned that it leaves paid or planned – the payments written ahead counted in, after it (przegląd 3 N3: the
 * due it really closes beside them); null – none.
 */
function paidToday(c: FeeDuesOf, f: FeeToday, today: string): string | null {
  const payment: Linked = { id: '', date: today, amount: amountIn(c, f.follow.month), accountId: '' }
  const closed = (dues: readonly FeeDue[], planned: ReadonlyMap<string, unknown>) => new Set([...dues.slice(0, -1).filter((d) => d.payments.length).map((d) => d.month), ...planned.keys()])
  const before = closed(f.dues, f.planned)
  const ahead = f.all.slice(f.linked.length)
  const stateAfter = feeDuesOf(c, [...f.linked, payment], f.day, f.follow).dues
  const plannedAfter = new Map<string, CargoPayment>()
  if (ahead.length) {
    for (const d of feeDuesOf(c, [...f.linked, payment, ...ahead], f.day, f.view).dues.slice(0, -1)) {
      const p = d.payments.find((x) => x.date > today)
      if (p) plannedAfter.set(d.month, strip(p))
    }
  }
  const after = closed(stateAfter, plannedAfter)
  return f.dues.slice(0, -1).find((d) => !before.has(d.month) && after.has(d.month))?.month ?? null
}

/**
 * The dues of each fee a payment written ahead pays (T398) – in the Radar's window, by the state's own rule: the Radar,
 * the briefing and Ładownia's next due leave them out (the balances ahead count the payment, on its day). Only the fees
 * with such payments.
 */
export function plannedDues(o: Pick<CargoInput, 'containers' | 'transactions' | 'today' | 'start'>): Map<string, ReadonlySet<string>> {
  const start = o.start && o.start <= o.today ? o.start : null
  const index = paymentsIndex(o.transactions)
  const out = new Map<string, ReadonlySet<string>>()
  for (const c of o.containers) {
    const all = index.byContainer.get(c.id)
    if (c.archived || c.loanId || !all?.length || all.at(-1)!.date <= o.today) continue
    const f = feeToday(c, all, o.today, start)
    if (f.planned.size) out.set(c.id, new Set(f.planned.keys()))
  }
  return out
}

export function cargoStatuses(o: CargoInput): CargoStatus[] {
  const month = monthOf(o.today)
  // A start ahead follows nothing yet: this month's due only, as without one.
  const start = o.start && o.start <= o.today ? o.start : null
  const index = paymentsIndex(o.transactions)
  const out: CargoStatus[] = []
  for (const c of o.containers) {
    // A fee whose life ended (`until`) still has its last dues unpaid; one out of the hold (archived) none.
    if (c.archived || c.loanId || (!start && !activeIn(c, month))) continue
    const all = index.byContainer.get(c.id) ?? []
    const f = feeToday(c, all, o.today, start)
    const { dues, followed, day, dayFrom } = f
    const isPaid = (d: FeeDue) => d.payments.length > 0
    // This month's due (a periodic fee only in its due month – the months before fill its tank, the asteroids announce
    // it); an earlier month's only while unpaid (D99 pkt 3); one not the budget's (before its first day, before the fee
    // came into the hold, settled) – only paid this month (T379).
    const shown = dues.slice(0, -1).filter((d) => d.month <= month && activeIn(c, d.month) && (isPaid(d) ? d.month === month : followed(d, o.today)))
    // „Zapłacone (dziś)” only for a fee with a due still to pay: a fee paid never counts its whole history again (T399).
    const payToday = shown.some((d) => !isPaid(d)) ? paidToday(c, f, o.today) : null
    const account = c.accountId ?? all.at(-1)?.accountId ?? null
    const covered = account ? [o.coveredTo[account] ?? '', index.lastBank.get(account) ?? ''].sort().at(-1)! : ''
    for (const d of shown) {
      const carried = d.month < month
      const payments = d.payments.map(strip)
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
        payToday: payToday === d.month,
        planned: isPaid(d) ? null : (f.planned.get(d.month) ?? null)
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
 * already skipped (`paidDue`, B55); a due a payment written ahead pays (T398 – `planned`, the status's or `plannedDues`)
 * is not to pay any more.
 */
export function nextDueOf(
  c: CycleOf & Pick<Container, 'dueDay'>,
  today: string,
  o: { day?: number; paidDue?: string | null; status?: Pick<CargoStatus, 'due' | 'state' | 'carried'> & Partial<Pick<CargoStatus, 'planned'>>; planned?: ReadonlySet<string> }
): string {
  const at = o.day != null ? { ...c, dueDay: o.day } : c
  const s = o.status && !o.status.carried ? o.status : undefined
  if (s && s.state !== 'paid' && !s.planned) return s.due
  const from = s ? firstDayOf(addMonths(monthOf(s.due), 1)) : today
  let date = nextUnpaidOf(at, from > today ? from : today, o.paidDue)
  for (let n = 0; n < 24 && o.planned?.has(date.slice(0, 7)); n++) date = nextPaymentOf(at, addDays(date, 1))
  return date
}
