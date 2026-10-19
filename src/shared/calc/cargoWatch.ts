/**
 * The cargo hold's watch (1.9.0, F9): a container heavier – or lighter – than its manifest (its latest payments at a new
 * price, a variable bill's year above or below its amount), and a container gone quiet (no payment for two of its
 * cycles: a subscription cancelled?). Pure; the briefing, the inbox and Ładownia read it.
 */
import type { Container, Transaction } from '../schema/records'
import { dm, formatPln, plural } from '../format'
import { addDays, addMonths, firstDayOf, monthOf, warsawNow } from './dates'
import { activeIn, cyclePosition, paymentsPerYear, scheduleOf } from './fleet'
import { dueIn, EARLY_DAYS, paymentDay, paymentsIndex, type CargoPayment, type Linked } from './cargoStatus'
import { OVERDUE_DAYS } from './loans'
import { p75 } from './plan'

/** A payment this far from the container's amount is another price (F9): 5%, at least 2 zł. */
export const priceTolerance = (amount: number): number => Math.max(Math.round(amount * 0.05), 200)

/** A variable bill's amount (F23) is out of date this far from its year's 75th percentile: 10%, at least 2 zł. */
export const variableTolerance = (amount: number): number => Math.max(Math.round(amount * 0.1), 200)

/** Payments missing for this many cycles make a container look cancelled (F9). */
export const DEAD_CYCLES = 2

/** The months in short: „mar, maj, wrz, lis” (a schedule's months – F23). */
export const SHORT_MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']

/** How often it is paid, in words: „co kwartał”, „w miesiącach: mar, maj, wrz, lis” (a schedule – F23). */
export function cycleText(c: Pick<Container, 'cycleMonths'> & { schedule?: readonly number[] | null }): string {
  const months = scheduleOf(c)
  if (months) return `w miesiącach: ${months.map((m) => SHORT_MONTHS[m - 1]).join(', ')}`
  const n = c.cycleMonths
  if (n <= 1) return 'co miesiąc'
  if (n === 2) return 'co 2 miesiące'
  if (n === 3) return 'co kwartał'
  if (n === 6) return 'co pół roku'
  if (n === 12) return 'co rok'
  return `co ${n} mies.`
}

export interface PriceChange {
  containerId: string
  name: string
  /** One payment: the container's amount now and the new one. */
  from: number
  to: number
  /** The change in % of the amount now (rounded). */
  pct: number
  /** The change a year: its payments a year × the difference. */
  yearly: number
  /** 'payments' – its latest payments are at the new price; 'variable' – a variable bill's year (the 75th percentile). */
  basis: 'payments' | 'variable'
  /** The payments that show it, by date. */
  payments: CargoPayment[]
  /** The briefing's and the notifications' key: each new price once. */
  key: string
}

export interface CargoWatchInput {
  containers: readonly Container[]
  transactions: readonly Transaction[]
  today: string
  /** The last day the bank's files cover on each account (`settings.import.coveredTo`). */
  coveredTo?: Readonly<Record<string, string>>
}

/** The Warsaw day of an ISO time ('' for none). */
const dayOf = (iso: string | null | undefined): string => (iso ? warsawNow(iso).date : '')

interface CyclePaid {
  /** The due month the payments are for. */
  due: string
  /** Their sum: a fee paid in several transfers (the rent in two) counts whole. */
  amount: number
  payments: CargoPayment[]
}

/**
 * Its payments by the due they are for – as the fee's state counts them (`cargoStatuses`): a payment up to 14 days before
 * a due is that due's. The latest cycle only once it is whole: its days over, or as many payments as the cycle before it
 * (the second transfer of the rent not come yet – no lower price).
 */
function cyclesPaid(c: Container, linked: readonly Linked[], day: number, today: string): CyclePaid[] {
  const out: CyclePaid[] = []
  for (const p of linked) {
    const shifted = addDays(p.date, EARLY_DAYS)
    let due = cyclePosition(c, monthOf(shifted)).dueMonth
    for (let n = 0; n < 24 && dueIn(due, day) > shifted; n++) due = addMonths(due, -cyclePosition(c, due).length)
    const payment = { id: p.id, date: p.date, amount: p.amount }
    const last = out[out.length - 1]
    if (last?.due === due) {
      last.amount += p.amount
      last.payments.push(payment)
    } else out.push({ due, amount: p.amount, payments: [payment] })
  }
  const last = out[out.length - 1]
  const before = out[out.length - 2]
  if (last && before && last.payments.length < before.payments.length) {
    const ends = addDays(dueIn(cyclePosition(c, addMonths(last.due, 1)).dueMonth, day), -EARLY_DAYS)
    if (ends > today) out.pop()
  }
  return out
}

/**
 * The containers whose payments are at another price (F9): a fee of every month or two – what its latest two cycles
 * took (the sum of each cycle's payments), both off its amount by more than the tolerance and agreeing with each other;
 * a periodic one (3 months and more, a schedule) – its latest cycle. Only payments after its amount's last change count
 * (`amountAt`: a price set after them is a decision). A variable bill (F23): its year's 75th percentile of the cycles,
 * up to whole złoty, off its amount by more than 10%. A price said „nie” to (`priceIgnored`) is not proposed again; a
 * loan's installments are the loan's.
 */
export function priceChanges(o: CargoWatchInput): PriceChange[] {
  const month = monthOf(o.today)
  const index = paymentsIndex(o.transactions)
  const out: PriceChange[] = []
  for (const c of o.containers) {
    if (c.archived || c.loanId || c.amount <= 0 || !activeIn(c, month)) continue
    const linked = index.byContainer.get(c.id) ?? []
    if (!linked.length) continue
    const { day } = paymentDay(c, linked, addMonths(month, 1))
    let to: number
    let basis: PriceChange['basis']
    let payments: CargoPayment[]
    if (c.variable) {
      const yearFrom = firstDayOf(addMonths(month, -12))
      const cycles = cyclesPaid(c, linked.filter((p) => p.date >= yearFrom), day, o.today)
      if (cycles.length < 3) continue
      to = Math.ceil(p75(cycles.map((x) => x.amount)) / 100) * 100
      if (Math.abs(to - c.amount) <= variableTolerance(c.amount)) continue
      payments = cycles.flatMap((x) => x.payments)
      basis = 'variable'
    } else {
      const changed = dayOf(c.amountAt)
      const need = c.cycleMonths >= 3 || scheduleOf(c) ? 1 : 2
      const cycles = cyclesPaid(c, linked.filter((p) => p.date > changed), day, o.today).slice(-need)
      if (cycles.length < need) continue
      const tol = priceTolerance(c.amount)
      if (!cycles.every((x) => Math.abs(x.amount - c.amount) > tol)) continue
      to = cycles[cycles.length - 1]!.amount
      if (cycles.some((x) => Math.abs(x.amount - to) > priceTolerance(to))) continue
      payments = cycles.flatMap((x) => x.payments)
      basis = 'payments'
    }
    if (to === c.priceIgnored) continue
    out.push({
      containerId: c.id,
      name: c.name,
      from: c.amount,
      to,
      pct: Math.round(((to - c.amount) / c.amount) * 100),
      yearly: Math.round((to - c.amount) * paymentsPerYear(c)),
      basis,
      payments,
      key: `price:${c.id}:${to}`
    })
  }
  return out.sort((a, b) => Math.abs(b.yearly) - Math.abs(a.yearly) || a.name.localeCompare(b.name))
}

export interface DeadContainer {
  containerId: string
  name: string
  /** Its latest payment. */
  last: string
  /** The dues since without a payment, each past its 3 days and within the bank's files: `DEAD_CYCLES` or more. */
  missed: string[]
  key: string
}

/**
 * The containers gone quiet (F9): paid before, but no payment for its last `DEAD_CYCLES` dues – each past its 3 days of
 * grace, and the account's files from the bank reaching past it (an account without them: today) – a subscription
 * cancelled? The dues on the day its payments come (`paymentDay`); a payment up to 14 days before a due is that due's.
 * „Nadal płacę” (`aliveAt`) counts as a payment that day.
 */
export function deadContainers(o: CargoWatchInput): DeadContainer[] {
  const month = monthOf(o.today)
  const index = paymentsIndex(o.transactions)
  const out: DeadContainer[] = []
  for (const c of o.containers) {
    if (c.archived || c.loanId || !activeIn(c, month)) continue
    const linked = index.byContainer.get(c.id)
    if (!linked?.length) continue
    const latest = linked[linked.length - 1]!
    const from = c.aliveAt && c.aliveAt > latest.date ? c.aliveAt : latest.date
    const account = c.accountId ?? latest.accountId
    const files = [o.coveredTo?.[account] ?? '', index.lastBank.get(account) ?? ''].sort()[1]!
    const covered = files || o.today
    const { day } = paymentDay(c, linked, addMonths(month, 1))
    const missed: string[] = []
    // Its dues from the cycle of the latest payment on: each one the bank's files show without a payment.
    for (let due = cyclePosition(c, monthOf(from)).dueMonth, n = 0; n < 60; due = cyclePosition(c, addMonths(due, 1)).dueMonth, n++) {
      const date = dueIn(due, day)
      const graceEnd = addDays(date, OVERDUE_DAYS - 1)
      if (graceEnd >= o.today || graceEnd > covered) break
      if (addDays(date, -EARLY_DAYS) > from) missed.push(date)
    }
    if (missed.length >= DEAD_CYCLES) out.push({ containerId: c.id, name: c.name, last: latest.date, missed, key: `dead:${c.id}:${missed[DEAD_CYCLES - 1]}` })
  }
  return out.sort((a, b) => a.last.localeCompare(b.last) || a.name.localeCompare(b.name))
}

/**
 * Its amount history after a change of the amount in `month` (F9): the amount so far up to the month before – unless it
 * counts only from this month on (its `from`, else its creation) or a change of this month already ended the history
 * there (a second change the same month only sets the new amount).
 */
export function pastAfterChange(c: Pick<Container, 'amount' | 'past' | 'from' | 'createdAt'>, month: string): Container['past'] {
  const prev = addMonths(month, -1)
  const first = c.from ?? warsawNow(c.createdAt).month
  if (first > prev || c.past.some((x) => x.until >= prev)) return c.past
  return [...c.past, { until: prev, amount: c.amount }]
}

const zlotych = (grosze: number) => `${formatPln(grosze)} zł`
const signed = (n: number, text: string) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${text}`

/**
 * A new price in words (F9): „Netflix: 43,00 → 49,00 zł co miesiąc (+14%, +72,00 zł rocznie)” – heavier or lighter than
 * the manifest.
 */
export function priceText(p: PriceChange, c: Pick<Container, 'cycleMonths'> & { schedule?: readonly number[] | null }, zl: (grosze: number) => string = zlotych): string {
  const pct = `${signed(p.pct, `${Math.abs(p.pct)}%`)}`
  return `${p.name}: ${zl(p.from)} → ${zl(p.to)} ${cycleText(c)} (${pct}, ${signed(p.yearly, zl(Math.abs(p.yearly)))} rocznie)`
}

/** A container gone quiet in words (F9). */
export function deadText(d: DeadContainer): string {
  const n = d.missed.length
  return `${d.name}: brak płatności od ${dm(d.last)} (${n} ${plural(n, 'termin', 'terminy', 'terminów')} bez płatności) – subskrypcja anulowana?`
}
