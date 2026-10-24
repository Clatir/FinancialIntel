/**
 * The month's plan (spec, „Plan miesiąca i dzienny przydział”, „Kreator startu”, „Debriefing i podział łupów”):
 * proposals from the history (the salary, the envelopes, recurring payments as containers – D70), the salary's split
 * into the cargo, the tanks and the envelopes, and the debriefing of a finished month. Pure; the layers' engine
 * (fleet.ts) applies what the records say.
 */
import { envelopeKind, type Category, type EnvelopeKind } from '../schema/budget'
import type { Container, MonthPlan, Transaction } from '../schema/records'
import { counterpartyKey } from '../import/classify'
import { addMonths, dayOfMonth, daysBetween, daysInMonth, firstDayOf, monthOf, monthRange, monthsBetween } from './dates'
import { activeIn, amountIn, coverMoves, cyclePosition, monthlyWeight, rangeMonths, sinkingSchedule, type Alarm, type FleetEvent } from './fleet'
import { coveredMonths, firstFullOf, historyStart, monthsBefore } from './history'
import { financedBy } from './household'
import { categoryIndex, costOf, isCargoPayment, partsOf, sum } from './operations'

/** Months of the salary's average (D70). */
export const SALARY_MONTHS = 6
/** Months of the envelopes' averages (D70). */
export const ENVELOPE_MONTHS = 3
/** The salary is proposed in whole hundreds of złoty, up (D70). */
const SALARY_STEP = 100_00
/** Envelopes in tens of złoty (D70). */
const ENVELOPE_STEP = 10_00

/** The first month the history covers in whole (`calc/history.ts`: where the bank's history starts – B25). */
export function firstFullMonth(transactions: readonly Pick<Transaction, 'date' | 'kind' | 'bank'>[]): string | null {
  return firstFullOf(historyStart(transactions))
}

/**
 * The last `count` full months of data before `month` (fewer when the history is shorter): the months the engine's
 * averages read (`FleetState.historyMonths` – before the current month, B23), else the history of `transactions` alone.
 */
export function fullMonthsBefore(transactions: readonly Pick<Transaction, 'date' | 'kind' | 'bank'>[], month: string, count: number, covered?: readonly string[]): string[] {
  return monthsBefore(covered ?? coveredMonths(transactions, month), month, count)
}

/** Each list's costs by month, once per list (W38: a proposal for each month never walks the whole history again). */
const costsMemo = new WeakMap<readonly Transaction[], ReadonlyMap<string, number>>()

/** Net costs (fleet.ts `costOf`) month by month – shared, never to be changed by the caller. */
export function costsByMonth(transactions: readonly Transaction[]): ReadonlyMap<string, number> {
  let out = costsMemo.get(transactions) as Map<string, number> | undefined
  if (out) return out
  out = new Map<string, number>()
  for (const t of transactions) {
    const c = costOf(t)
    if (c) out.set(monthOf(t.date), (out.get(monthOf(t.date)) ?? 0) + c)
  }
  costsMemo.set(transactions, out)
  return out
}

/** Each list's operations by month, once per list (W30, W38): a month's debriefing never filters the whole history. */
const txMonths = new WeakMap<readonly Transaction[], Map<string, Transaction[]>>()

/** The operations of one month (in the list's order), from the list's index by month. */
export function transactionsOfMonth(transactions: readonly Transaction[], month: string): readonly Transaction[] {
  let by = txMonths.get(transactions)
  if (!by) {
    by = new Map()
    for (const t of transactions) {
      const m = monthOf(t.date)
      const list = by.get(m)
      if (list) list.push(t)
      else by.set(m, [t])
    }
    txMonths.set(transactions, by)
  }
  return by.get(month) ?? []
}

/** The engine's log by month, its months' ends and its start – once per log (W30, W38). */
interface LogIndex {
  months: Map<string, FleetEvent[]>
  /** The 'month-end' events by their date (the 1st of the month after). */
  ends: Map<string, FleetEvent>
  /** The day the engine started (its 'start' event); null = no start in this log. */
  start: string | null
}
const logIndexes = new WeakMap<readonly FleetEvent[], LogIndex>()

function logIndex(log: readonly FleetEvent[]): LogIndex {
  let ix = logIndexes.get(log)
  if (ix) return ix
  ix = { months: new Map(), ends: new Map(), start: null }
  for (const e of log) {
    const m = monthOf(e.date)
    const list = ix.months.get(m)
    if (list) list.push(e)
    else ix.months.set(m, [e])
    if (e.kind === 'month-end') ix.ends.set(e.date, e)
    else if (e.kind === 'start' && (ix.start == null || e.date < ix.start)) ix.start = e.date
  }
  logIndexes.set(log, ix)
  return ix
}

const logOfMonth = (log: readonly FleetEvent[], month: string): readonly FleetEvent[] => logIndex(log).months.get(month) ?? []

export interface SalaryProposal {
  /** The proposal: the average up to whole hundreds of złoty. */
  amount: number
  average: number
  months: string[]
}

/**
 * The salary (D70): the average net costs of the last 6 full months, up to whole hundreds; null without a full month.
 * `covered` – the engine's history months (a month ahead never averages the current one – B23).
 */
export function proposeSalary(transactions: readonly Transaction[], month: string, covered?: readonly string[]): SalaryProposal | null {
  const months = fullMonthsBefore(transactions, month, SALARY_MONTHS, covered)
  if (!months.length) return null
  const byMonth = costsByMonth(transactions)
  const average = Math.round(sum(months.map((m) => byMonth.get(m) ?? 0)) / months.length)
  return { amount: Math.max(SALARY_STEP, Math.ceil(average / SALARY_STEP) * SALARY_STEP), average, months }
}

/** A container as the proposals read it: its payee, and its id – a payment linked to it is the cargo's (B58). */
type CounterpartyOf = Pick<Container, 'counterparty' | 'archived'> & { id?: string }

const containerKeys = (containers: readonly CounterpartyOf[]): Set<string> =>
  new Set(containers.filter((c) => !c.archived).map((c) => counterpartyKey(c.counterparty)).filter(Boolean))

/** Each record's payee key, once per record object (W6: a record never changes in place). */
const payeeKeys = new WeakMap<object, string>()
/** Who an operation pays, as a container and the import name them: the counterparty, else the title (`counterpartyKey`). */
export function payeeKey(t: Pick<Transaction, 'counterparty' | 'title'>): string {
  let key = payeeKeys.get(t)
  if (key === undefined) payeeKeys.set(t, (key = counterpartyKey(t.counterparty || t.title)))
  return key
}

const containerIdsOf = (containers: readonly CounterpartyOf[]): Set<string> => new Set(containers.map((c) => c.id).filter((id): id is string => !!id))

/** Does an operation pay a container (linked to one that exists, or the same payee as one)? Fixed costs are no envelope's spending. */
const paysContainer = (t: Transaction, keys: ReadonlySet<string>, ids: ReadonlySet<string>) => isCargoPayment(t, ids) || (keys.size > 0 && keys.has(payeeKey(t)))

export interface EnvelopeProposal {
  categoryId: string
  kind: EnvelopeKind
  /** The proposal, in tens of złoty. */
  limit: number
  average: number
}

/**
 * The envelopes (D70): each main category's average spending of the last 3 full months, to tens of złoty – without
 * the payments of the containers (they are the cargo, not an envelope's spending). Spending without a category is
 * reported apart (`uncategorized`).
 */
export function proposeEnvelopes(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  month: string,
  containers: readonly CounterpartyOf[] = [],
  covered?: readonly string[]
): { envelopes: EnvelopeProposal[]; uncategorized: number; months: string[] } {
  const months = fullMonthsBefore(transactions, month, ENVELOPE_MONTHS, covered)
  if (!months.length) return { envelopes: [], uncategorized: 0, months }
  const cats = categoryIndex(categories)
  const keys = containerKeys(containers)
  const ids = containerIdsOf(containers)
  const inWindow = new Set(months)
  const spent = new Map<string, number>()
  let uncategorized = 0
  for (const t of transactions) {
    if (t.kind !== 'expense' || t.goalId || !inWindow.has(monthOf(t.date)) || paysContainer(t, keys, ids)) continue
    for (const p of partsOf(t)) {
      if (p.refundable || p.goalId || isCargoPayment(p, ids)) continue
      const main = cats.mainOf(p.categoryId)
      if (main) spent.set(main.id, (spent.get(main.id) ?? 0) - p.amount)
      else uncategorized -= p.amount
    }
  }
  const envelopes: EnvelopeProposal[] = []
  for (const main of cats.mains) {
    const kind = envelopeKind(main)
    if (!kind || main.archived) continue
    const average = Math.round((spent.get(main.id) ?? 0) / months.length)
    envelopes.push({ categoryId: main.id, kind, limit: Math.max(0, Math.round(average / ENVELOPE_STEP) * ENVELOPE_STEP), average })
  }
  return { envelopes, uncategorized: Math.round(uncategorized / months.length), months }
}

export interface RecurringPayment {
  /** The counterparty's key (`counterpartyKey`). */
  key: string
  /** The counterparty as the bank writes it. */
  label: string
  /** One payment: the latest (a subscription's price may change); a variable bill's – the 75th percentile of a year (F23). */
  amount: number
  /** 1, 2, 3, 6 or 12 months (F23); a schedule's: 12. */
  cycleMonths: number
  /** The payment months of a fee no single cycle describes (F23 – a property tax 3, 5, 9, 11); empty = its cycle. */
  schedule: number[]
  /** A monthly bill of a varying amount (F23 – electricity, water). */
  variable: boolean
  /** The month of the latest payment: the container's cycle counts from it. */
  dueMonth: string
  dueDay: number
  categoryId: string | null
  accountId: string
  payments: number
  last: string
  /** Its latest payment, of the month before, made it a fee (F23): new in the history – the briefing announces it this month. */
  fresh: boolean
}

/** A month's days (a cycle of N months ≈ N × this). */
const MONTH_DAYS = 30.44
/** A payment this many days off its cycle still keeps it (a weekend, a month of 28 days). */
const CYCLE_SLACK_DAYS = 12
/** The cycles of the history's fees besides the monthly and the yearly one (F23). */
const MID_CYCLES = [2, 3, 6] as const
/** A variable bill's amounts lie within this share of their median (F23): electricity 150–260 zł – a shop's do not. */
const VARIABLE_SPREAD = 0.6
/** The payments of a bill (a variable one, a schedule's) come within this many days of their usual day of the month. */
const BILL_DAY_SLACK = 6

/** Amounts within ±`spread` of their median. */
function within(amounts: readonly number[], spread: number): boolean {
  const sorted = [...amounts].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]!
  return sorted.every((a) => Math.abs(a - median) <= median * spread)
}

/** Amounts within ±15% of their median: the same fee, not a shop visited every month. */
const steady = (amounts: readonly number[]): boolean => within(amounts, 0.15)

/** The `q` percentile (the nearest rank) of amounts – 0 without any. */
export function percentile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(sorted.length * q) - 1)] ?? 0
}

/** The 75th percentile (the nearest rank) of amounts: a variable bill's amount (F23). */
export const p75 = (values: readonly number[]): number => percentile(values, 0.75)

/** Days of the month within `slack` of their median: a bill's, not a shop's. */
function onItsDay(dates: readonly string[], slack = BILL_DAY_SLACK): number | null {
  const days = dates.map(dayOfMonth).sort((a, b) => a - b)
  const day = days[(days.length - 1) >> 1]
  return day != null && days.every((d) => Math.abs(d - day) <= slack) ? day : null
}

type Detected = Pick<RecurringPayment, 'amount' | 'cycleMonths' | 'schedule' | 'variable' | 'dueMonth' | 'dueDay' | 'payments' | 'last'>

/**
 * The cycle of a payee's payments (sorted, before `month`): monthly – nearly every month of the window (a steady amount,
 * or a variable bill on its day of the month); every 2, 3 or 6 months – its latest payments a cycle apart (±12 days),
 * at least 3; yearly – two or three, 11–13 months apart; a schedule – 3 to 11 payments in the last 12 months, each in
 * its own month on about the same day, with a year of history behind them. Each – recent: its next payment not missed.
 */
function detectCycle(sorted: readonly Transaction[], month: string, window: readonly string[], historyFrom: string | null): Detected | null {
  const last = sorted.at(-1)
  if (!last) return null
  const start = firstDayOf(month)
  const amountsOf = (xs: readonly Transaction[]) => xs.map((t) => -t.amount)
  const found = (cycleMonths: number, payments: number, amount: number, more: Partial<Detected> = {}): Detected => ({
    amount,
    cycleMonths,
    schedule: [],
    variable: false,
    dueMonth: monthOf(last.date),
    dueDay: dayOfMonth(last.date),
    payments,
    last: last.date,
    ...more
  })
  if (window.length >= 3) {
    const inWindowMonths = new Set(window)
    const inWindow = sorted.filter((t) => inWindowMonths.has(monthOf(t.date)))
    const months = new Set(inWindow.map((t) => monthOf(t.date)))
    if (months.size >= Math.max(3, window.length - 1) && inWindow.length <= window.length + 1) {
      if (steady(amountsOf(inWindow))) return found(1, inWindow.length, -last.amount)
      // A bill of a varying amount (F23): its amount the 75th percentile of a year, up to whole złoty.
      const day = onItsDay(inWindow.map((t) => t.date))
      if (day != null && within(amountsOf(inWindow), VARIABLE_SPREAD)) {
        const year = sorted.filter((t) => t.date >= firstDayOf(addMonths(month, -12)))
        return found(1, inWindow.length, Math.ceil(p75(amountsOf(year)) / 100) * 100, { variable: true, dueDay: day })
      }
    }
  }
  for (const n of MID_CYCLES) {
    const want = n * MONTH_DAYS
    let run = 1
    for (let i = sorted.length - 1; i > 0 && Math.abs(daysBetween(sorted[i - 1]!.date, sorted[i]!.date) - want) <= CYCLE_SLACK_DAYS; i--) run++
    if (run < 3 || daysBetween(last.date, start) > want + CYCLE_SLACK_DAYS || !steady(amountsOf(sorted.slice(-run)))) continue
    return found(n, run, -last.amount)
  }
  // Once a year: two or three steady payments, each 11–13 months after the one before (no shop visited monthly).
  const gaps = sorted.slice(1).map((t, i) => monthsBetween(monthOf(sorted[i]!.date), monthOf(t.date)))
  if (sorted.length >= 2 && sorted.length <= 3 && gaps.every((g) => g >= 11 && g <= 13) && steady(amountsOf(sorted)) && monthsBetween(monthOf(last.date), month) <= 13)
    return found(12, sorted.length, -last.amount)
  // A schedule (F23): the last 12 months seen whole.
  const yearFrom = firstDayOf(addMonths(month, -12))
  if (!historyFrom || historyFrom > yearFrom) return null
  const year = sorted.filter((t) => t.date >= yearFrom)
  const months = [...new Set(year.map((t) => Number(t.date.slice(5, 7))))].sort((a, b) => a - b)
  if (year.length < 3 || year.length > 11 || months.length !== year.length || !steady(amountsOf(year))) return null
  const day = onItsDay(year.map((t) => t.date))
  if (day == null) return null
  // Its longest gap between payments: the next one not missed yet.
  const longest = Math.max(...months.map((m, i) => (i ? m - months[i - 1]! : m + 12 - months[months.length - 1]!)))
  if (monthsBetween(monthOf(last.date), month) > longest) return null
  return found(12, year.length, -last.amount, { schedule: months, dueDay: day })
}

/**
 * Recurring payments of the history – proposals for the cargo (D70), each to be confirmed: a fee every 1, 2, 3, 6 or 12
 * months, a monthly bill of a varying amount, a fee of a schedule (F23 – `detectCycle`). Counterparties of existing
 * containers are left out, and those said „nie proponuj” to (`ignored` – payee keys).
 */
export function recurringPayments(
  transactions: readonly Transaction[],
  month: string,
  containers: readonly CounterpartyOf[] = [],
  covered?: readonly string[],
  ignored: ReadonlySet<string> = new Set()
): RecurringPayment[] {
  const known = containerKeys(containers)
  const ids = containerIdsOf(containers)
  const groups = new Map<string, Transaction[]>()
  let historyFrom: string | null = null
  for (const t of transactions) {
    if (t.bank && (!historyFrom || t.date < historyFrom)) historyFrom = t.date
    if (t.kind !== 'expense' || t.amount >= 0 || isCargoPayment(t, ids) || t.goalId || t.date >= firstDayOf(month)) continue
    const key = payeeKey(t)
    if (!key || known.has(key) || ignored.has(key)) continue
    // Pushed, never copied (W6: a shop of thousands of payments made this quadratic).
    const list = groups.get(key)
    if (list) list.push(t)
    else groups.set(key, [t])
  }
  // The history's start (B23): the bank's first row, else the earliest operation.
  if (!historyFrom) for (const t of transactions) if (!historyFrom || t.date < historyFrom) historyFrom = t.date
  const windows = new Map<string, string[]>()
  const windowAt = (m: string) => {
    let w = windows.get(m)
    if (!w) windows.set(m, (w = fullMonthsBefore(transactions, m, SALARY_MONTHS, covered)))
    return w
  }
  const out: RecurringPayment[] = []
  for (const [key, list] of groups) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    const found = detectCycle(sorted, month, windowAt(month), historyFrom)
    if (!found) continue
    const last = sorted.at(-1)!
    const counts = new Map<string | null, number>()
    for (const t of sorted) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1)
    const categoryId = [...counts.entries()].filter(([id]) => id).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    // New (F23): its latest payment of the month before made it a fee – not one yet in that month, before it came.
    const at = monthOf(last.date)
    const fresh = at === addMonths(month, -1) && !detectCycle(sorted.slice(0, -1), at, windowAt(at), historyFrom)
    out.push({ key, label: last.counterparty || last.title, ...found, categoryId, accountId: last.accountId, fresh })
  }
  return out.sort((a, b) => monthlyWeight(b) - monthlyWeight(a) || a.label.localeCompare(b.label))
}

// ------------------------------------------------------------------ the salary's split

export interface SalarySplit {
  salary: number
  /** Fixed costs paid every month (containers of a 1-month cycle). */
  cargo: { items: Array<{ containerId: string; name: string; amount: number }>; total: number }
  /** The month's installments of the periodic fees' tanks (actual for a month the engine ran, else the plan's). */
  tanks: { items: Array<{ containerId: string; name: string; amount: number; dueMonth: string; due: number }>; total: number }
  /**
   * The goals' installments (F15 – „Kurs przechwycenia”): as the engine took them that month, else the plan's – these
   * only when the shields and the hull are full at the turn (`planned`).
   */
  rates: { items: Array<{ goalId: string; name: string; amount: number; deadline: string | null }>; total: number; planned: boolean }
  /**
   * Each envelope's limit of the plan and what the month adds to it (F28): the loot kept in it from the month before and
   * the covers moved to it (− from it); `total` – the plan's limits, the salary's.
   */
  envelopes: Record<EnvelopeKind, { items: Array<{ categoryId: string; limit: number; extra: number }>; total: number; extra: number }>
  /** The loot of the month before given to this month (T28 – it adds to the daily envelopes, N11): not the salary's. */
  lootExtra: number
  /** „Podstawowy przydział”: the daily envelopes and the loot added to them over the days of the month (as the engine). */
  dailyBase: number
  allocated: number
  /** The salary not given to anything: it stays in the energy and becomes the loot (or a reserve for overspending). */
  unallocated: number
}

/**
 * How a month's salary divides (spec, „Podział pensji”): the cargo, the tanks, the planned and the daily envelopes.
 * `sinking` = the tanks' installments the engine took that month (the log), else the plan's installments; `lootExtra` =
 * the loot of the month before the engine gave to this one (`lootExtraOf`) – the daily envelopes' too.
 */
export function salarySplit(
  plan: Pick<MonthPlan, 'salary' | 'envelopes'>,
  month: string,
  containers: readonly Container[],
  categories: readonly Category[],
  sinking?: ReadonlyMap<string, number>,
  lootExtra = 0,
  more: {
    /** The goals' installments (F15): the engine's of the month (`ratesOf`) or the planned ones. */
    rates?: { items: SalarySplit['rates']['items']; planned: boolean }
    /** What the month adds to each envelope's limit (F28): the loot kept (`keptOf`) and the covers (`coverMoves`). */
    extra?: ReadonlyMap<string, number>
  } = {}
): SalarySplit {
  const active = containers.filter((c) => activeIn(c, month))
  // Each at its amount in the month (F9: a raise counts from its month on).
  const cargoItems = active.filter((c) => c.cycleMonths <= 1).map((c) => ({ containerId: c.id, name: c.name, amount: amountIn(c, month) }))
  const tankItems = active
    .filter((c) => c.cycleMonths > 1)
    .map((c) => {
      const pos = cyclePosition(c, month)
      const planned = sinkingSchedule(amountIn(c, month), pos.length)[pos.index] ?? 0
      return { containerId: c.id, name: c.name, amount: sinking ? (sinking.get(c.id) ?? 0) : planned, dueMonth: pos.dueMonth, due: amountIn(c, pos.dueMonth) }
    })
  const cats = categoryIndex(categories)
  const envelopes: SalarySplit['envelopes'] = { planned: { items: [], total: 0, extra: 0 }, daily: { items: [], total: 0, extra: 0 } }
  for (const main of cats.mains) {
    const kind = envelopeKind(main)
    const limit = plan.envelopes[main.id]
    const extra = more.extra?.get(main.id) ?? 0
    if (!kind || (limit == null && !extra)) continue
    envelopes[kind].items.push({ categoryId: main.id, limit: limit ?? 0, extra })
    envelopes[kind].total += limit ?? 0
    envelopes[kind].extra += extra
  }
  const cargo = { items: cargoItems, total: sum(cargoItems.map((c) => c.amount)) }
  const tanks = { items: tankItems, total: sum(tankItems.map((c) => c.amount)) }
  const rateItems = more.rates?.items ?? []
  const rates = { items: rateItems, total: sum(rateItems.map((r) => r.amount)), planned: more.rates?.planned ?? false }
  const allocated = cargo.total + tanks.total + rates.total + envelopes.planned.total + envelopes.daily.total
  // The daily pool as the engine's: its limits, what the month moved to them and the loot of the month before.
  const dailyBase = Math.floor((envelopes.daily.total + envelopes.daily.extra + lootExtra) / daysInMonth(month))
  return { salary: plan.salary, cargo, tanks, rates, envelopes, lootExtra, dailyBase, allocated, unallocated: plan.salary - allocated }
}

/**
 * The loot of the month before the engine gave to `month` for its daily envelopes (a decision „na następny miesiąc” –
 * N11); what it kept in planned envelopes (F28) is theirs (`keptOf`).
 */
export function lootExtraOf(log: readonly FleetEvent[], month: string): number {
  return sum(logOfMonth(log, month).filter((e) => e.kind === 'loot').map((e) => Math.max(0, (e.moves.energy ?? 0) - sum(Object.values(e.moves.envelopes ?? {})))))
}

/** The loot of the month before the engine kept in each planned envelope of `month` (F28). */
export function keptOf(log: readonly FleetEvent[], month: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const e of logOfMonth(log, month)) if (e.kind === 'loot') for (const [id, v] of Object.entries(e.moves.envelopes ?? {})) out.set(id, (out.get(id) ?? 0) + v)
  return out
}

/** What `month` adds to each envelope's limit (F28): the loot kept in it and the covers of the month's own plan (± ). */
export function envelopeExtraOf(log: readonly FleetEvent[], month: string, plans: readonly MonthPlan[], now = Infinity): Map<string, number> {
  const out = keptOf(log, month)
  for (const [id, v] of coverMoves(plans.find((p) => p.month === month), now)) out.set(id, (out.get(id) ?? 0) + v)
  return out
}

/** The goals' installments the engine took in `month` (F15): goal → grosze. */
export function ratesOf(log: readonly FleetEvent[], month: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const e of logOfMonth(log, month)) if (e.kind === 'rate') for (const [id, v] of Object.entries(e.moves.goals ?? {})) out.set(id, (out.get(id) ?? 0) + v)
  return out
}

/** The tanks' installments the engine took in `month` (its log). */
export function sinkingOf(log: readonly FleetEvent[], month: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const e of logOfMonth(log, month)) if (e.kind === 'sinking') for (const [id, v] of Object.entries(e.moves.tanks ?? {})) out.set(id, (out.get(id) ?? 0) + v)
  return out
}

// ------------------------------------------------------------------ the debriefing

export interface Debriefing {
  month: string
  /** The plan in force that month (its own or the last earlier one). */
  salary: number | null
  /** What the engine paid as the salary (less in the budget's first month – the part spent before the start). */
  paid: number | null
  /** Net costs of the month. */
  costs: number
  /** The month has ended (today is past it): its result and its loot are final. */
  ended: boolean
  /**
   * „Miesiąc zamknięty na plus” (spec, T52 – N6): the month's spending did not take more than its energy, as the engine
   * counts it – a periodic fee its tank paid is no cost of the salary, the tanks' installments are. Without the engine's
   * month (no log, a month before the start): net costs not above the salary. null = no salary, or the month still runs
   * (N65 – never „tak” before its end).
   */
  plus: boolean | null
  /**
   * The month's energy as the engine ran it (N6, N11): `budget` = the salary paid less the tanks' and the goals'
   * installments (F15) plus the loot of the month before given to it (its daily envelopes' and the planned ones' kept –
   * F28); `used` = what the spending took of it and over it (from the shields);
   * `result` = budget − used (+ left – the loot at the month's end, − the shields paid). null = no salary paid by the engine
   * that month.
   */
  energy: { salary: number; sinking: number; rates: number; loot: number; budget: number; used: number; exhausted: number; result: number } | null
  /**
   * The daily pool as the engine's daily energy counts it (N11): the daily envelopes and the loot added to them against
   * their spending and the spending without a category. null = no daily envelope that month.
   */
  daily: { limit: number; extra: number; spent: number; gap: number } | null
  /**
   * Plan against fact per envelope of the month's plan – the FVG of the debriefing (+ = left, − = over); 0 zł is a limit
   * too. `limit` with what the month added to it (`extra` – the loot kept, the covers; F28).
   */
  envelopes: Array<{ categoryId: string; kind: EnvelopeKind; limit: number; extra: number; spent: number; gap: number }>
  /**
   * Spending of the main categories without an envelope that month (N25, N54, N101): no limit to be over – shown apart,
   * without red. A daily one still counts in the daily pool (as the engine's daily energy); the most first.
   */
  outside: Array<{ categoryId: string; spent: number }>
  /** Spending of the containers linked to them (the cargo and the periodic fees). */
  cargo: number
  uncategorized: number
  /**
   * The energy left at the month's end: the loot (D18). null = the month has not ended, or the engine did not run
   * through its end (a month before the budget's start – B92).
   */
  loot: number | null
  /** What household members financed this month (D80): apart from my costs, by member (the most first). */
  financed: Array<{ memberId: string; amount: number }>
}

/**
 * A month's own plan has the month's id (1.4.2, B46): two computers making it before OneDrive synced write one record,
 * a change of it, not a second plan of the month.
 */
export const monthPlanId = (month: string): string => `01KMTH${month.replace('-', '').padStart(20, '0')}`

/**
 * A month's spending of the main categories as the debriefing counts it (and the year's plan – F37): the expenses without
 * a goal's money, the parts to be refunded not, the cargo's payments apart – of a container that exists (B58); null = every
 * linked payment is the cargo's (an older caller).
 */
export function monthSpending(txs: readonly Transaction[], cats: ReturnType<typeof categoryIndex>, containerIds: ReadonlySet<string> | null): { spent: Map<string, number>; cargo: number; uncategorized: number } {
  const spent = new Map<string, number>()
  let cargo = 0
  let uncategorized = 0
  for (const t of txs) {
    if (t.kind !== 'expense' || t.goalId) continue
    if (containerIds ? isCargoPayment(t, containerIds) : t.containerId) {
      cargo += costOf(t)
      continue
    }
    for (const p of partsOf(t)) {
      if (p.refundable || p.goalId) continue
      if (containerIds ? isCargoPayment(p, containerIds) : p.containerId) {
        cargo -= p.amount
        continue
      }
      const main = cats.mainOf(p.categoryId)
      if (main) spent.set(main.id, (spent.get(main.id) ?? 0) - p.amount)
      else uncategorized -= p.amount
    }
  }
  return { spent, cargo, uncategorized }
}

/** The planned month in force for `month`: its own plan or the last earlier one. */
export function planFor(plans: readonly MonthPlan[], month: string): MonthPlan | null {
  let found: MonthPlan | null = null
  for (const p of plans) if (p.month <= month && (!found || p.month > found.month)) found = p
  return found
}

export function debriefing(
  month: string,
  input: {
    transactions: readonly Transaction[]
    categories: readonly Category[]
    plans: readonly MonthPlan[]
    log?: readonly FleetEvent[]
    /** The engine's alarms (`FleetState.alarms`): the energy run out in the month (N6). */
    alarms?: readonly Alarm[]
    /** The containers now: a payment of one deleted is an envelope's spending again (B58). */
    containers?: readonly Pick<Container, 'id'>[]
    /** The budget's day: the loot is known once the month has ended. */
    today: string
  }
): Debriefing {
  const plan = planFor(input.plans, month)
  const cats = categoryIndex(input.categories)
  const txs = transactionsOfMonth(input.transactions, month)
  const costs = sum(txs.map(costOf))
  // Without the containers (an older caller): every linked payment is the cargo's.
  const { spent, cargo, uncategorized } = monthSpending(txs, cats, input.containers ? new Set(input.containers.map((c) => c.id)) : null)
  const envelopes: Debriefing['envelopes'] = []
  const outside: Debriefing['outside'] = []
  // What the month added to the limits (F28): the loot kept in an envelope, the covers of the month's own plan.
  const extras = envelopeExtraOf(input.log ?? [], month, input.plans)
  // The daily pool's spending as the engine's daily energy counts it: every daily category's, with an envelope or not.
  let dailySpent = uncategorized
  for (const main of cats.mains) {
    const kind = envelopeKind(main)
    const base = plan?.envelopes[main.id]
    const extra = extras.get(main.id) ?? 0
    const limit = base == null && !extra ? null : Math.max(0, (base ?? 0) + extra)
    const s = spent.get(main.id) ?? 0
    if (kind === 'daily') dailySpent += s
    if (kind && limit != null) envelopes.push({ categoryId: main.id, kind, limit, extra, spent: s, gap: limit - s })
    else if (s) outside.push({ categoryId: main.id, spent: s })
  }
  outside.sort((a, b) => b.spent - a.spent)
  const log = input.log ?? []
  const ix = logIndex(log)
  const inMonth = ix.months.get(month) ?? []
  const salaries = inMonth.filter((e) => e.kind === 'salary')
  const next = firstDayOf(addMonths(month, 1))
  const end = ix.ends.get(next)
  const ended = input.today >= next
  // The engine ran through the month's end (B92): its start was before it – without a log (the game) as before.
  const ranThrough = !input.log || (ix.start != null && ix.start < next)
  const salary = plan?.salary ?? null
  const loot = ended && ranThrough ? Math.max(0, end?.amount ?? 0) : null
  let energy: Debriefing['energy'] = null
  if (salaries.length) {
    const paid = sum(salaries.map((e) => e.amount))
    const sinking = 0 - sum(inMonth.filter((e) => e.kind === 'sinking').map((e) => e.moves.energy ?? 0))
    const rates = 0 - sum(inMonth.filter((e) => e.kind === 'rate').map((e) => e.moves.energy ?? 0))
    // The loot given to the month: its daily envelopes' and what it kept in the planned ones (F28).
    const extra = lootExtraOf(log, month) + sum([...keptOf(log, month).values()])
    // What the operations took of the energy (less what came back to it) and what the shields paid when it ran out.
    const spentOf = -sum(inMonth.filter((e) => e.txId).map((e) => e.moves.energy ?? 0))
    const exhausted = sum((input.alarms ?? []).filter((a) => a.kind === 'energy-exhausted' && monthOf(a.date) === month).map((a) => a.amount))
    const budget = paid - sinking - rates + extra
    const used = spentOf + exhausted
    energy = { salary: paid, sinking, rates, loot: extra, budget, used, exhausted, result: budget - used }
  }
  // The daily pool (N11): the daily envelopes, the loot added to them; their spending and the spending without a category.
  const dailyRows = envelopes.filter((e) => e.kind === 'daily')
  const extra = lootExtraOf(log, month)
  const daily =
    dailyRows.length || extra
      ? (() => {
          const limit = sum(dailyRows.map((e) => e.limit)) + extra
          return { limit, extra, spent: dailySpent, gap: limit - dailySpent }
        })()
      : null
  return {
    month,
    salary,
    paid: salaries.length ? sum(salaries.map((e) => e.amount)) : null,
    costs,
    ended,
    // Never „na plus” before the month's end (N65) nor with an unreturned energy exhaustion (N-PC-3).
    plus: !ended ? null : energy ? energy.result >= 0 && energy.exhausted === 0 : salary != null && salary > 0 ? costs <= salary : null,
    energy,
    daily,
    envelopes,
    outside,
    cargo,
    uncategorized,
    loot,
    financed: financedBy(txs)
  }
}

/** The loot decision (D18) as the month plan stores it; what is not given away stays in the shields. */
export function lootDecision(loot: number, choice: { nextMonth: number; goals: Record<string, number>; envelopes?: Record<string, number> }, decidedAt: string): NonNullable<MonthPlan['loot']> {
  let rest = Math.max(0, loot)
  const take = (v: number) => {
    const t = Math.min(rest, Math.max(0, Math.round(v)))
    rest -= t
    return t
  }
  const goals: Record<string, number> = {}
  for (const [id, v] of Object.entries(choice.goals)) {
    const t = take(v)
    if (t) goals[id] = t
  }
  // The engine's order: the goals, the planned envelopes kept for the next month (F28), the daily ones, the shields.
  const envelopes: Record<string, number> = {}
  for (const [id, v] of Object.entries(choice.envelopes ?? {})) {
    const t = take(v)
    if (t) envelopes[id] = t
  }
  const nextMonth = take(choice.nextMonth)
  return { decidedAt, shields: rest, nextMonth, goals, envelopes }
}

/**
 * How the engine split the loot of `month` (B10): the loot as it is now (a late import changes it) by the decision –
 * the goals first, then the envelopes kept (F28) and the next month, the rest to the shields – or all to the shields
 * after the 7th. null = not yet.
 */
export function lootApplied(log: readonly FleetEvent[], month: string): { date: string; amount: number; goals: number; envelopes: number; nextMonth: number; shields: number } | null {
  const e = log.find((x) => x.kind === 'loot' && x.ref === month)
  if (!e) return null
  const envelopes = sum(Object.values(e.moves.envelopes ?? {}))
  return { date: e.date, amount: e.amount, goals: sum(Object.values(e.moves.goals ?? {})), envelopes, nextMonth: (e.moves.energy ?? 0) - envelopes, shields: e.moves.shields ?? 0 }
}

/** Until when the loot of `month` waits for a decision: the 7th of the next month (then it goes to the shields – D18). */
export const lootDeadline = (month: string): string => `${addMonths(month, 1)}-07`

// ------------------------------------------------------------------ the cargo's simulation

/** A container's monthly weight now: a periodic fee by its monthly share (as the load line counts it – `monthlyWeight`). */
export const monthlyShare = (c: Pick<Container, 'amount' | 'cycleMonths'> & { schedule?: readonly number[] | null }): number => monthlyWeight(c)

export interface CargoSimulation {
  /** The cargo a month and its % of the salary, against the load line. */
  before: { monthly: number; pct: number | null; over: boolean }
  after: { monthly: number; pct: number | null; over: boolean }
  /** The range in months with the costs changed by the container's monthly weight (when it is a new cost or a dropped one). */
  rangeBefore: number | null
  rangeAfter: number | null
}

/**
 * The spec's simulation of adding a container (before it is saved), dropping one or giving one a new price (F9): the
 * load line and the range – the shields and the hull over the average costs plus (or minus) the change of the monthly
 * weight.
 */
export function simulateCargo(
  o: { shields: number; hull: number; costs: number | null; salary: number | null; limitPct: number; month: string; containers: readonly Container[]; debt?: number },
  change: { add?: Pick<Container, 'amount' | 'cycleMonths'> & { schedule?: readonly number[] | null }; drop?: string; amount?: { id: string; to: number } }
): CargoSimulation {
  const live = o.containers.filter((c) => activeIn(c, o.month))
  const mass = (monthly: number) => {
    const pct = o.salary && o.salary > 0 ? (monthly / o.salary) * 100 : null
    return { monthly, pct, over: pct != null && pct > o.limitPct }
  }
  const weight = (c: Container) => monthlyWeight(c, o.month)
  const before = sum(live.map(weight))
  const dropped = change.drop ? live.find((c) => c.id === change.drop) : undefined
  // A new price (F9): the container's weight at its new amount instead of its own.
  const priced = change.amount ? live.find((c) => c.id === change.amount!.id) : undefined
  const repriced = priced ? monthlyWeight({ ...priced, amount: change.amount!.to, past: [] }) - weight(priced) : 0
  const delta = (change.add ? monthlyShare(change.add) : 0) - (dropped ? weight(dropped) : 0) + repriced
  // The range as the bridge counts it (a taken loan's debt off – D72).
  const range = (costs: number | null) => rangeMonths(o.shields, o.hull, costs, o.debt ?? 0)
  return {
    before: mass(before),
    after: mass(before + delta),
    rangeBefore: range(o.costs),
    rangeAfter: o.costs != null ? range(Math.max(1, o.costs + delta)) : null
  }
}

/**
 * Expense payments of a counterparty not linked to any container yet, from `from` on (the import links new ones itself);
 * `containerIds` given – a payment of a container deleted counts as not linked (B58).
 */
export function unlinkedPayments(transactions: readonly Transaction[], counterparty: string, from: string, containerIds?: ReadonlySet<string>): Transaction[] {
  const key = counterpartyKey(counterparty)
  if (!key) return []
  const linked = (t: Transaction) => (containerIds ? isCargoPayment(t, containerIds) : !!t.containerId)
  return transactions.filter((t) => t.kind === 'expense' && t.amount < 0 && !linked(t) && t.date >= from && payeeKey(t) === key)
}
