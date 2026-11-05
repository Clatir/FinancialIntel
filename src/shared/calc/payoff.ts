/**
 * Plan spłaty pożyczek (1.17.0, AP-41 – T480–T483; D101 (2): the taken loans only, no credit cards): what each taken
 * loan still wants back by its schedule (`LoanState.left` – the installments not covered yet, `LoanState.open`) paid
 * month by month – as the schedule says (no overpayment) and with money over the installments by two strategies: the
 * avalanche (the highest interest first) and the snowball (the smallest balance first). A proposal only: nothing here is
 * stored and no money moves – the engine never reads it (the layers and the debt in the range stay the schedule's).
 *
 * Each month (T481): the interest of the month on what is left (the yearly rate ÷ 12, to the grosz – half up), then the
 * schedule's installments of the month (an installment of a month before the plan's – due in its first; the schedule's
 * last installment pays the whole rest – the rounding of the interest in it), then the money over them (T482): the extra
 * of each month, once in the first month the „once”, and the installments of the loans paid off already that their
 * schedules still have (the snowball's roll) – to the loans in the strategy's order, each up to what is left of it.
 */
import type { Loan } from '../schema/records'
import { addMonths, monthOf, monthsBetween } from './dates'
import type { LoanState } from './loans'
import { sum } from './operations'

export const PAYOFF_STRATEGIES = ['avalanche', 'snowball'] as const
export type PayoffStrategy = (typeof PAYOFF_STRATEGIES)[number]
/** 'none' – the schedule as it is (no overpayment). */
export type PayoffVariant = 'none' | PayoffStrategy

/** The longest plan – 50 years: what is not paid off by then counts as never (`paidOff` null). */
export const PAYOFF_MAX_MONTHS = 600

/** A month's interest = balance × basis points ÷ 120 000 (1 % a year = 100 basis points, ÷ 12 months). */
const MONTH_BP = 120_000

/** A taken loan as the plan reads it. */
export interface PayoffDebt {
  id: string
  name: string
  /** To pay back by the schedule now (`LoanState.open`). */
  open: number
  /** The installments not covered yet (`LoanState.left`), by day. */
  installments: ReadonlyArray<{ date: string; amount: number }>
  /** Yearly nominal interest in percent (the loan's `rate`); null – not known (counted as none). */
  rate: number | null
  /** The loan's day: the orders' tie-break before its id. */
  date: string
}

export interface PayoffInput {
  debts: readonly PayoffDebt[]
  /** The plan's first month – the month of today. */
  month: string
  /** Paid over the installments each month (grosze ≥ 0). */
  extra: number
  /** Paid over them once, in the first month, beside `extra` (grosze ≥ 0) – e.g. „wolne do decyzji”. */
  once: number
}

/** One loan in one month of the plan. */
export interface PayoffLine {
  id: string
  /** The month's interest (0 – no rate). */
  interest: number
  /** The schedule's installment paid (the last one – the whole rest). */
  installment: number
  /** Paid over the installment (the overpayment). */
  extra: number
  /** Left to pay after the month. */
  balance: number
}

export interface PayoffMonth {
  month: string
  /** The loans not paid off before this month, in the input's order. */
  lines: PayoffLine[]
  /** Paid in the month together. */
  paid: number
  /** Left to pay after it together. */
  balance: number
}

export interface PayoffResult {
  id: string
  /** The month of its last payment; null – not paid off within the plan (no schedule and no money over it, interest over it). */
  paidOff: string | null
  /** Its interest together (0 – no rate). */
  interest: number
  /** Paid together. */
  paid: number
}

export interface PayoffPlan {
  variant: PayoffVariant
  /** The order the money over the installments goes in (`'none'` – none). */
  order: string[]
  months: PayoffMonth[]
  /** By loan, in the input's order. */
  debts: PayoffResult[]
  /** The month the last loan is paid off; null – not all within the plan. */
  end: string | null
  /** Interest together – of the loans with a rate; a plan never ending (`end` null) – up to its last month, no total. */
  interest: number
  /** Paid together. */
  paid: number
}

export interface Payoff {
  none: PayoffPlan
  avalanche: PayoffPlan
  snowball: PayoffPlan
  /** Each loan's principal at the plan's start (`principalOf`). */
  principal: Record<string, number>
}

/** A loan's rate as the plan counts it: a percent of 0–100, else not known (null). */
export function rateOf(loan: Pick<Loan, 'rate'>): number | null {
  const r = loan.rate
  return typeof r === 'number' && Number.isFinite(r) && r >= 0 && r <= 100 ? r : null
}

/** Basis points of a yearly percent (7,25 % → 725); not known – 0. */
const bpOf = (rate: number | null): number => (rate == null ? 0 : Math.round(rate * 100))

/** The taken loans still open (`LoanState`) as the plan's input: the oldest first, then by id (the records' order is the reading's). */
export function payoffDebtsOf(states: readonly LoanState[]): PayoffDebt[] {
  return states
    .filter((s) => s.loan.direction === 'taken' && s.loan.closedAt == null && s.open > 0)
    .map((s) => ({ id: s.loan.id, name: s.loan.name, open: s.open, installments: s.left, rate: rateOf(s.loan), date: s.loan.date }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

/** The installments by the plan's month (0 – the first; one of a month before it is due in it). */
function duesOf(d: PayoffDebt, start: string): Map<number, number> {
  const dues = new Map<number, number>()
  for (const i of d.installments) {
    if (i.amount <= 0) continue
    const k = Math.max(0, monthsBetween(start, monthOf(i.date)))
    dues.set(k, (dues.get(k) ?? 0) + i.amount)
  }
  return dues
}

/**
 * A loan's principal at the plan's start (T481): with a rate – the present value of its installments at it, backwards
 * from the last month, to the grosz at each month: (what is left after the month + its installments) × 120 000 ÷
 * (120 000 + basis points). The schedule's installments carry the interest, so the plan without overpayments pays the
 * schedule (its last installment the rest). Without a rate (or 0 %) or without a schedule – what is open.
 */
export function principalOf(d: PayoffDebt, start: string): number {
  const bp = bpOf(d.rate)
  const dues = duesOf(d, start)
  if (!bp || !dues.size) return d.open
  let b = 0
  for (let k = Math.max(...dues.keys()); k >= 0; k--) b = Math.round(((b + (dues.get(k) ?? 0)) * MONTH_BP) / (MONTH_BP + bp))
  return b
}

/**
 * The order the money over the installments goes in (T482): the avalanche – the highest rate first (not known = 0 %),
 * of equal rates the smaller open first; the snowball – the smallest open first (what the schedule still wants), of
 * equal ones the higher rate first; then the older loan, then its id. Fixed for the whole plan.
 */
export function payoffOrder(debts: readonly PayoffDebt[], strategy: PayoffStrategy): string[] {
  const rest = (a: PayoffDebt, b: PayoffDebt) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  const byRate = (a: PayoffDebt, b: PayoffDebt) => bpOf(b.rate) - bpOf(a.rate)
  const byOpen = (a: PayoffDebt, b: PayoffDebt) => a.open - b.open
  return [...debts]
    .sort((a, b) => (strategy === 'avalanche' ? byRate(a, b) || byOpen(a, b) : byOpen(a, b) || byRate(a, b)) || rest(a, b))
    .map((d) => d.id)
}

interface Run {
  d: PayoffDebt
  bp: number
  dues: Map<number, number>
  /** The plan's month of its last installment; −1 – no schedule. */
  last: number
  balance: number
  interest: number
  paid: number
  paidOff: string | null
}

function plan(input: PayoffInput, principal: Readonly<Record<string, number>>, variant: PayoffVariant): PayoffPlan {
  const order = variant === 'none' ? [] : payoffOrder(input.debts, variant)
  // Without money over the installments a strategy is the schedule: nothing goes anywhere else (T482).
  const extra = Math.max(0, Math.trunc(input.extra))
  const once = Math.max(0, Math.trunc(input.once))
  const over = variant !== 'none' && extra + once > 0
  const runs: Run[] = input.debts.map((d) => {
    const dues = duesOf(d, input.month)
    const balance = principal[d.id] ?? d.open
    return { d, bp: bpOf(d.rate), dues, last: dues.size ? Math.max(...dues.keys()) : -1, balance, interest: 0, paid: 0, paidOff: balance <= 0 ? input.month : null }
  })
  const byId = new Map(runs.map((r) => [r.d.id, r]))
  const lastDue = Math.max(-1, ...runs.map((r) => r.last))
  const months: PayoffMonth[] = []
  const interestOf = (r: Run) => (r.bp ? Math.round((r.balance * r.bp) / MONTH_BP) : 0)
  for (let k = 0; k < PAYOFF_MAX_MONTHS; k++) {
    if (runs.every((r) => r.balance <= 0)) break
    const month = addMonths(input.month, k)
    const lines = new Map<string, PayoffLine>()
    // The installments the schedules still have for the loans paid off already: free for the others (the roll).
    let free = 0
    for (const r of runs) {
      const due = r.dues.get(k) ?? 0
      if (r.balance <= 0) {
        free += due
        continue
      }
      const interest = interestOf(r)
      r.balance += interest
      r.interest += interest
      const pay = k === r.last ? r.balance : Math.min(due, r.balance)
      r.balance -= pay
      r.paid += pay
      free += Math.max(0, due - pay)
      lines.set(r.d.id, { id: r.d.id, interest, installment: pay, extra: 0, balance: r.balance })
    }
    if (over) {
      let pool = extra + (k === 0 ? once : 0) + free
      for (const id of order) {
        if (pool <= 0) break
        const r = byId.get(id)!
        const line = lines.get(id)
        if (!line || r.balance <= 0) continue
        const x = Math.min(pool, r.balance)
        r.balance -= x
        r.paid += x
        pool -= x
        line.extra += x
        line.balance = r.balance
      }
    }
    for (const r of runs) if (r.balance <= 0 && r.paidOff == null) r.paidOff = month
    const list = runs.flatMap((r) => lines.get(r.d.id) ?? [])
    months.push({ month, lines: list, paid: sum(list.map((l) => l.installment + l.extra)), balance: sum(runs.map((r) => Math.max(0, r.balance))) })
    // Past every schedule (review of R2: loan by loan, never the sum of all): from the next month only the extra pays –
    // all of it to the first loan of the order still open, the next ones get it only once that one is paid off. Without
    // the extra, or with the first one's interest not less than it (that loan never gets less), nothing is ever paid off
    // again – the plan ends; a loan the extra still makes less goes on, while the ones waiting behind it grow.
    if (k >= lastDue) {
      const next = over ? extra : 0
      const first = order.map((id) => byId.get(id)!).find((r) => r.balance > 0)
      if (!next || !first || next <= interestOf(first)) break
    }
  }
  const debts = runs.map((r) => ({ id: r.d.id, paidOff: r.balance <= 0 ? r.paidOff : null, interest: r.interest, paid: r.paid }))
  const end = debts.every((x) => x.paidOff != null) ? debts.reduce((m, x) => (x.paidOff! > m ? x.paidOff! : m), input.month) : null
  return { variant, order, months, debts, end, interest: sum(debts.map((x) => x.interest)), paid: sum(debts.map((x) => x.paid)) }
}

/** The plan without overpayments and by both strategies, from the same principals (T480–T482). */
export function payoff(input: PayoffInput): Payoff {
  const principal: Record<string, number> = {}
  for (const d of input.debts) principal[d.id] = principalOf(d, input.month)
  return { none: plan(input, principal, 'none'), avalanche: plan(input, principal, 'avalanche'), snowball: plan(input, principal, 'snowball'), principal }
}
