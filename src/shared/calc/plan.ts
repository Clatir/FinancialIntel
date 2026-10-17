/**
 * The month's plan (spec, „Plan miesiąca i dzienny przydział”, „Kreator startu”, „Debriefing i podział łupów”):
 * proposals from the history (the salary, the envelopes, recurring payments as containers – D70), the salary's split
 * into the cargo, the tanks and the envelopes, and the debriefing of a finished month. Pure; the layers' engine
 * (fleet.ts) applies what the records say.
 */
import { envelopeKind, type Category, type EnvelopeKind } from '../schema/budget'
import type { Container, MonthPlan, Transaction } from '../schema/records'
import { counterpartyKey } from '../import/classify'
import { addMonths, dayOfMonth, daysInMonth, firstDayOf, monthOf, monthRange, monthsBetween } from './dates'
import { cyclePosition, sinkingSchedule, type FleetEvent } from './fleet'
import { categoryIndex, costOf, partsOf, sum } from './operations'

/** Months of the salary's average (D70). */
export const SALARY_MONTHS = 6
/** Months of the envelopes' averages (D70). */
export const ENVELOPE_MONTHS = 3
/** The salary is proposed in whole hundreds of złoty, up (D70). */
const SALARY_STEP = 100_00
/** Envelopes in tens of złoty (D70). */
const ENVELOPE_STEP = 10_00

/** The first month the history covers in whole (the earliest operation on its 1st, else the next month). */
export function firstFullMonth(transactions: readonly Pick<Transaction, 'date'>[]): string | null {
  let first: string | null = null
  for (const t of transactions) if (first == null || t.date < first) first = t.date
  if (!first) return null
  return first.endsWith('-01') ? monthOf(first) : addMonths(monthOf(first), 1)
}

/** The last `count` full months of data before `month` (fewer when the history is shorter). */
export function fullMonthsBefore(transactions: readonly Pick<Transaction, 'date'>[], month: string, count: number): string[] {
  const first = firstFullMonth(transactions)
  const last = addMonths(month, -1)
  if (!first || last < first) return []
  return monthRange(first, last).slice(-count)
}

/** Net costs (fleet.ts `costOf`) month by month. */
export function costsByMonth(transactions: readonly Transaction[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const t of transactions) {
    const c = costOf(t)
    if (c) out.set(monthOf(t.date), (out.get(monthOf(t.date)) ?? 0) + c)
  }
  return out
}

export interface SalaryProposal {
  /** The proposal: the average up to whole hundreds of złoty. */
  amount: number
  average: number
  months: string[]
}

/** The salary (D70): the average net costs of the last 6 full months, up to whole hundreds; null without a full month. */
export function proposeSalary(transactions: readonly Transaction[], month: string): SalaryProposal | null {
  const months = fullMonthsBefore(transactions, month, SALARY_MONTHS)
  if (!months.length) return null
  const byMonth = costsByMonth(transactions)
  const average = Math.round(sum(months.map((m) => byMonth.get(m) ?? 0)) / months.length)
  return { amount: Math.max(SALARY_STEP, Math.ceil(average / SALARY_STEP) * SALARY_STEP), average, months }
}

type CounterpartyOf = Pick<Container, 'counterparty' | 'archived'>

const containerKeys = (containers: readonly CounterpartyOf[]): Set<string> =>
  new Set(containers.filter((c) => !c.archived).map((c) => counterpartyKey(c.counterparty)).filter(Boolean))

/** Who an operation pays, as a container and the import name them: the counterparty, else the title (`counterpartyKey`). */
export const payeeKey = (t: Pick<Transaction, 'counterparty' | 'title'>): string => counterpartyKey(t.counterparty || t.title)

/** Does an operation pay a container (linked, or the same payee as one)? Fixed costs are no envelope's spending. */
const paysContainer = (t: Transaction, keys: ReadonlySet<string>) => !!t.containerId || (keys.size > 0 && keys.has(payeeKey(t)))

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
  containers: readonly CounterpartyOf[] = []
): { envelopes: EnvelopeProposal[]; uncategorized: number; months: string[] } {
  const months = fullMonthsBefore(transactions, month, ENVELOPE_MONTHS)
  if (!months.length) return { envelopes: [], uncategorized: 0, months }
  const cats = categoryIndex(categories)
  const keys = containerKeys(containers)
  const inWindow = new Set(months)
  const spent = new Map<string, number>()
  let uncategorized = 0
  for (const t of transactions) {
    if (t.kind !== 'expense' || t.goalId || !inWindow.has(monthOf(t.date)) || paysContainer(t, keys)) continue
    for (const p of partsOf(t)) {
      if (p.refundable) continue
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
  /** The latest payment (a subscription's price may change). */
  amount: number
  cycleMonths: 1 | 12
  /** The month of the latest payment: the container's cycle counts from it. */
  dueMonth: string
  dueDay: number
  categoryId: string | null
  accountId: string
  payments: number
  last: string
}

/** Amounts within ±15% of their median: the same fee, not a shop visited every month. */
function steady(amounts: readonly number[]): boolean {
  const sorted = [...amounts].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]!
  return sorted.every((a) => Math.abs(a - median) <= median * 0.15)
}

/**
 * Recurring payments of the history – proposals for the cargo (D70), each to be confirmed: the same counterparty about
 * once a month for nearly every one of the last full months (at least 3), or once a year (two payments 11–13 months
 * apart), with a steady amount. Counterparties of existing containers are left out.
 */
export function recurringPayments(transactions: readonly Transaction[], month: string, containers: readonly CounterpartyOf[] = []): RecurringPayment[] {
  const known = containerKeys(containers)
  const groups = new Map<string, Transaction[]>()
  for (const t of transactions) {
    if (t.kind !== 'expense' || t.amount >= 0 || t.containerId || t.goalId || t.date >= firstDayOf(month)) continue
    const key = payeeKey(t)
    if (!key || known.has(key)) continue
    groups.set(key, [...(groups.get(key) ?? []), t])
  }
  const window = fullMonthsBefore(transactions, month, SALARY_MONTHS)
  const out: RecurringPayment[] = []
  for (const [key, list] of groups) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    const last = sorted.at(-1)!
    const candidate = (cycleMonths: 1 | 12, payments: number): RecurringPayment => {
      const counts = new Map<string | null, number>()
      for (const t of sorted) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1)
      const categoryId = [...counts.entries()].filter(([id]) => id).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      return { key, label: last.counterparty || last.title, amount: -last.amount, cycleMonths, dueMonth: monthOf(last.date), dueDay: dayOfMonth(last.date), categoryId, accountId: last.accountId, payments, last: last.date }
    }
    if (window.length >= 3) {
      const inWindow = sorted.filter((t) => window.includes(monthOf(t.date)))
      const months = new Set(inWindow.map((t) => monthOf(t.date)))
      if (months.size >= Math.max(3, window.length - 1) && inWindow.length <= window.length + 1 && steady(inWindow.map((t) => -t.amount))) {
        out.push(candidate(1, inWindow.length))
        continue
      }
    }
    // Once a year: two or three steady payments, each 11–13 months after the one before (no shop visited monthly).
    const gaps = sorted.slice(1).map((t, i) => monthsBetween(monthOf(sorted[i]!.date), monthOf(t.date)))
    if (sorted.length >= 2 && sorted.length <= 3 && gaps.every((g) => g >= 11 && g <= 13) && steady(sorted.map((t) => -t.amount))) out.push(candidate(12, sorted.length))
  }
  return out.sort((a, b) => b.amount / b.cycleMonths - a.amount / a.cycleMonths || a.label.localeCompare(b.label))
}

// ------------------------------------------------------------------ the salary's split

const activeIn = (c: Container, month: string) => !c.archived && (c.from == null || c.from <= month) && (c.until == null || month <= c.until)

export interface SalarySplit {
  salary: number
  /** Fixed costs paid every month (containers of a 1-month cycle). */
  cargo: { items: Array<{ containerId: string; name: string; amount: number }>; total: number }
  /** The month's installments of the periodic fees' tanks (actual for a month the engine ran, else the plan's). */
  tanks: { items: Array<{ containerId: string; name: string; amount: number; dueMonth: string; due: number }>; total: number }
  envelopes: Record<EnvelopeKind, { items: Array<{ categoryId: string; limit: number }>; total: number }>
  /** „Podstawowy przydział”: the daily envelopes over the days of the month. */
  dailyBase: number
  allocated: number
  /** The salary not given to anything: it stays in the energy and becomes the loot (or a reserve for overspending). */
  unallocated: number
}

/**
 * How a month's salary divides (spec, „Podział pensji”): the cargo, the tanks, the planned and the daily envelopes.
 * `sinking` = the tanks' installments the engine took that month (the log), else the plan's installments.
 */
export function salarySplit(
  plan: Pick<MonthPlan, 'salary' | 'envelopes'>,
  month: string,
  containers: readonly Container[],
  categories: readonly Category[],
  sinking?: ReadonlyMap<string, number>
): SalarySplit {
  const active = containers.filter((c) => activeIn(c, month))
  const cargoItems = active.filter((c) => c.cycleMonths <= 1).map((c) => ({ containerId: c.id, name: c.name, amount: c.amount }))
  const tankItems = active
    .filter((c) => c.cycleMonths > 1)
    .map((c) => {
      const pos = cyclePosition(c, month)
      const planned = sinkingSchedule(c.amount, c.cycleMonths)[pos.index] ?? 0
      return { containerId: c.id, name: c.name, amount: sinking ? (sinking.get(c.id) ?? 0) : planned, dueMonth: pos.dueMonth, due: c.amount }
    })
  const cats = categoryIndex(categories)
  const envelopes: SalarySplit['envelopes'] = { planned: { items: [], total: 0 }, daily: { items: [], total: 0 } }
  for (const main of cats.mains) {
    const kind = envelopeKind(main)
    const limit = plan.envelopes[main.id]
    if (!kind || limit == null) continue
    envelopes[kind].items.push({ categoryId: main.id, limit })
    envelopes[kind].total += limit
  }
  const cargo = { items: cargoItems, total: sum(cargoItems.map((c) => c.amount)) }
  const tanks = { items: tankItems, total: sum(tankItems.map((c) => c.amount)) }
  const allocated = cargo.total + tanks.total + envelopes.planned.total + envelopes.daily.total
  return { salary: plan.salary, cargo, tanks, envelopes, dailyBase: Math.floor(envelopes.daily.total / daysInMonth(month)), allocated, unallocated: plan.salary - allocated }
}

/** The tanks' installments the engine took in `month` (its log). */
export function sinkingOf(log: readonly FleetEvent[], month: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const e of log) if (e.kind === 'sinking' && monthOf(e.date) === month) for (const [id, v] of Object.entries(e.moves.tanks ?? {})) out.set(id, (out.get(id) ?? 0) + v)
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
  /** Costs not above the salary: „Miesiąc zamknięty na plus” (spec). null = no salary to compare with. */
  plus: boolean | null
  /** Plan against fact per envelope – the FVG of the debriefing (+ = left, − = over). */
  envelopes: Array<{ categoryId: string; kind: EnvelopeKind; limit: number; spent: number; gap: number }>
  /** Spending of the containers linked to them (the cargo and the periodic fees). */
  cargo: number
  uncategorized: number
  /** The energy left at the month's end: the loot (D18). null = the month has not ended in the engine. */
  loot: number | null
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
    /** The budget's day: the loot is known once the month has ended. */
    today: string
  }
): Debriefing {
  const plan = planFor(input.plans, month)
  const cats = categoryIndex(input.categories)
  const txs = input.transactions.filter((t) => monthOf(t.date) === month)
  const costs = sum(txs.map(costOf))
  const spent = new Map<string, number>()
  let cargo = 0
  let uncategorized = 0
  for (const t of txs) {
    if (t.kind !== 'expense' || t.goalId) continue
    // The cargo as the engine sees it: payments linked to a container (`containerId`).
    if (t.containerId) {
      cargo += costOf(t)
      continue
    }
    for (const p of partsOf(t)) {
      if (p.refundable) continue
      const main = cats.mainOf(p.categoryId)
      if (main) spent.set(main.id, (spent.get(main.id) ?? 0) - p.amount)
      else uncategorized -= p.amount
    }
  }
  const envelopes: Debriefing['envelopes'] = []
  for (const main of cats.mains) {
    const kind = envelopeKind(main)
    const limit = plan?.envelopes[main.id]
    if (!kind || (limit == null && !spent.get(main.id))) continue
    const s = spent.get(main.id) ?? 0
    envelopes.push({ categoryId: main.id, kind, limit: limit ?? 0, spent: s, gap: (limit ?? 0) - s })
  }
  const log = input.log ?? []
  const salaries = log.filter((e) => e.kind === 'salary' && monthOf(e.date) === month)
  const end = log.find((e) => e.kind === 'month-end' && e.date === firstDayOf(addMonths(month, 1)))
  const ended = input.today >= firstDayOf(addMonths(month, 1))
  const salary = plan?.salary ?? null
  return {
    month,
    salary,
    paid: salaries.length ? sum(salaries.map((e) => e.amount)) : null,
    costs,
    plus: salary != null && salary > 0 ? costs <= salary : null,
    envelopes,
    cargo,
    uncategorized,
    loot: ended ? Math.max(0, end?.amount ?? 0) : null
  }
}

/** The loot decision (D18) as the month plan stores it; what is not given away stays in the shields. */
export function lootDecision(loot: number, choice: { nextMonth: number; goals: Record<string, number> }, decidedAt: string): NonNullable<MonthPlan['loot']> {
  let rest = Math.max(0, loot)
  const goals: Record<string, number> = {}
  for (const [id, v] of Object.entries(choice.goals)) {
    const take = Math.min(rest, Math.max(0, Math.round(v)))
    if (take) goals[id] = take
    rest -= take
  }
  const nextMonth = Math.min(rest, Math.max(0, Math.round(choice.nextMonth)))
  rest -= nextMonth
  return { decidedAt, shields: rest, nextMonth, goals }
}

/** Until when the loot of `month` waits for a decision: the 7th of the next month (then it goes to the shields – D18). */
export const lootDeadline = (month: string): string => `${addMonths(month, 1)}-07`

// ------------------------------------------------------------------ the cargo's simulation

/** A container's monthly weight: a periodic fee by its monthly share (as the load line counts it). */
export const monthlyShare = (c: Pick<Container, 'amount' | 'cycleMonths'>): number => Math.round(c.amount / Math.max(1, c.cycleMonths))

export interface CargoSimulation {
  /** The cargo a month and its % of the salary, against the load line. */
  before: { monthly: number; pct: number | null; over: boolean }
  after: { monthly: number; pct: number | null; over: boolean }
  /** The range in months with the costs changed by the container's monthly weight (when it is a new cost or a dropped one). */
  rangeBefore: number | null
  rangeAfter: number | null
}

/**
 * The spec's simulation of adding a container (before it is saved) or dropping one: the load line and the range – the
 * shields and the hull over the average costs plus (or minus) the container's monthly weight.
 */
export function simulateCargo(
  o: { shields: number; hull: number; costs: number | null; salary: number | null; limitPct: number; month: string; containers: readonly Container[] },
  change: { add?: Pick<Container, 'amount' | 'cycleMonths'>; drop?: string }
): CargoSimulation {
  const live = o.containers.filter((c) => activeIn(c, o.month))
  const mass = (monthly: number) => {
    const pct = o.salary && o.salary > 0 ? (monthly / o.salary) * 100 : null
    return { monthly, pct, over: pct != null && pct > o.limitPct }
  }
  const before = sum(live.map(monthlyShare))
  const dropped = change.drop ? live.find((c) => c.id === change.drop) : undefined
  const delta = (change.add ? monthlyShare(change.add) : 0) - (dropped ? monthlyShare(dropped) : 0)
  const range = (costs: number | null) => (costs != null && costs > 0 ? (o.shields + o.hull) / costs : null)
  return {
    before: mass(before),
    after: mass(before + delta),
    rangeBefore: range(o.costs),
    rangeAfter: o.costs != null ? range(Math.max(1, o.costs + delta)) : null
  }
}

/** Expense payments of a counterparty not linked to any container yet, from `from` on (the import links new ones itself). */
export function unlinkedPayments(transactions: readonly Transaction[], counterparty: string, from: string): Transaction[] {
  const key = counterpartyKey(counterparty)
  if (!key) return []
  return transactions.filter((t) => t.kind === 'expense' && t.amount < 0 && !t.containerId && t.date >= from && payeeKey(t) === key)
}
