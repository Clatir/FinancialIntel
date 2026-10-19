/**
 * The net worth (1.10.0, F24 – „Siła floty netto”, D87: a second line beside the wealth – D73 / T81 unchanged): the
 * money on the budget's accounts plus what others owe (loans given, household members' purchases financed) less what is
 * owed (loans taken, the members' money held on the accounts). A loan taken lifts the accounts and the debt alike – the
 * net line stays; lending money moves it from the accounts to the receivables. Pure.
 */
import type { Container, Loan, Transaction } from '../schema/records'
import { warsawNow } from './dates'
import type { HouseholdLedger } from './household'
import { forEachLoanOperation, loanStates } from './loans'
import { sum } from './operations'
import type { WealthPoint } from './intel'

export interface NetInput {
  loans: readonly Loan[]
  transactions: readonly Transaction[]
  containers: readonly Container[]
  /** The engine's household ledger: the members' balances now and each operation's flows. */
  household: Pick<HouseholdLedger, 'owed' | 'deposit' | 'byTx'>
  today: string
}

/** The sorted payments of a loan with their running sums: what was paid up to a day by a binary search. */
interface Paid {
  dates: string[]
  cum: number[]
}

function paidUpTo(p: Paid | undefined, date: string): number {
  if (!p) return 0
  let lo = 0
  let hi = p.dates.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (p.dates[mid]! <= date) lo = mid + 1
    else hi = mid
  }
  return lo ? p.cum[lo - 1]! : 0
}

/**
 * What the net worth adds to the accounts' money at the end of each day asked: the loans' open amounts then (a loan
 * counts from its day; a closed one – from the day it was closed – is 0) and the household members' balance then (the
 * balance now less the flows of the operations after the day).
 */
export function netAdjustments(dates: readonly string[], o: NetInput): number[] {
  const states = loanStates(o.loans, o.transactions, o.containers, o.today)
  const direction = new Map(o.loans.map((l) => [l.id, l.direction]))
  // Each loan's payments by day (as its state counts them): a given loan's repayments come in, a taken loan's go out.
  const payments = new Map<string, Array<{ date: string; amount: number }>>()
  forEachLoanOperation(o.loans, o.transactions, o.containers, o.today, (id, t) => {
    const paid = direction.get(id) === 'given' ? Math.max(0, t.amount) : Math.max(0, -t.amount)
    if (!paid) return
    const list = payments.get(id) ?? []
    list.push({ date: t.date, amount: paid })
    payments.set(id, list)
  })
  const paidOf = new Map<string, Paid>()
  for (const [id, list] of payments) {
    list.sort((a, b) => a.date.localeCompare(b.date))
    let run = 0
    paidOf.set(id, { dates: list.map((x) => x.date), cum: list.map((x) => (run += x.amount)) })
  }
  // The household: the balance now (owed to me less their money held), each day's change by the operations' flows.
  const dayOf = new Map<string, string>()
  for (const t of o.transactions) dayOf.set(t.id, t.date)
  const changes: Array<{ date: string; delta: number }> = []
  for (const [txId, flows] of o.household.byTx) {
    const date = dayOf.get(txId)
    if (!date) continue
    const delta = sum(flows.map((f) => f.lent - f.repaid - (f.advance - f.fromDeposit)))
    if (delta) changes.push({ date, delta })
  }
  changes.sort((a, b) => a.date.localeCompare(b.date))
  const now = o.household.owed - o.household.deposit
  let suffix = sum(changes.map((c) => c.delta))
  let k = 0
  // Dates in order: the flows after each date, by one sweep.
  const order = dates.map((d, i) => ({ d, i })).sort((a, b) => a.d.localeCompare(b.d))
  const out = dates.map(() => 0)
  for (const { d, i } of order) {
    while (k < changes.length && changes[k]!.date <= d) suffix -= changes[k++]!.delta
    const household = now - suffix
    let loans = 0
    for (const s of states) {
      const l = s.loan
      if (l.date > d) continue
      const closed = l.closedAt != null && warsawNow(l.closedAt).date <= d
      const open = closed ? 0 : Math.max(0, s.total - paidUpTo(paidOf.get(l.id), d))
      loans += l.direction === 'given' ? open : -open
    }
    out[i] = household + loans
  }
  return out
}

/** The net worth's curve on the wealth's weeks, with its own drawdown. */
export function netWorthCurve(points: readonly WealthPoint[], o: NetInput): WealthPoint[] {
  const adj = netAdjustments(
    points.map((p) => p.date),
    o
  )
  let peak = -Infinity
  return points.map((p, i) => {
    const value = p.value + adj[i]!
    peak = Math.max(peak, value)
    return { date: p.date, value, drawdown: value - peak }
  })
}
