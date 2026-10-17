/**
 * Settlements with the household (D80, 1.3.0): every member has one balance, both ways – what they owe for the
 * purchases they finance (a receivable: the shields lent the money) or what they paid ahead (an advance: their money
 * on my accounts, the deposit). Computed from the operations alone, in the order of the layers' engine (date, time,
 * creation, id), never stored – every computer sees the same, and a purchase marked later settles by itself. Before
 * the budget's start everything is settled in the opening balance (as the loans – T70): the balances start at zero
 * then; the history before still says what of a member's money was income (the statistics).
 *
 * - A purchase a member finances (a refundable part, `financerOf`) takes their advance first; the rest the shields lend
 *   and the member owes it.
 * - A member's money (an income with `memberId`) repays what they owe – the purchases it `covers` first, then the
 *   oldest; the rest is their advance (`advance`) or income (docks as any delivery).
 * - A product return of a financed purchase is the member's money: it repays what they owe, the rest is their advance.
 * - An income of before 1.3.0 with `repaid` and no member is the first member's money repaying at most that much (D20).
 */
import { HOUSE_MEMBER_ID, type HouseholdMember } from '../schema/budget'
import type { Transaction } from '../schema/records'
import { financedOf, financerOf, partsOf } from './operations'

/** One member's share of an operation (grosze, all ≥ 0). */
export interface MemberFlow {
  memberId: string
  /** Money out financed by them: taken from their advance… */
  fromDeposit: number
  /** …and lent by the shields (they owe it now). */
  lent: number
  /** Money in of theirs: repaying what they owe (back to the shields)… */
  repaid: number
  /** …held for them (their advance, the deposit)… */
  advance: number
  /** …and income (an income only: docks as a delivery). */
  income: number
}

/** A purchase they still owe (its open part). */
export interface OpenPurchase {
  txId: string
  date: string
  amount: number
}

export interface MemberBalance {
  memberId: string
  /** What they owe: purchases financed with the shields' money, not paid back yet. */
  owed: number
  /** Their advance held on the accounts. */
  deposit: number
  /** The purchases they owe, oldest first. */
  open: OpenPurchase[]
  /** The oldest open purchase's date. */
  since: string | null
}

export interface HouseholdLedger {
  /** The members with a balance or a settled operation, in the order they first appear. */
  members: MemberBalance[]
  /** Each settled operation's flows (an expense of two members' lines has two). */
  byTx: Map<string, MemberFlow[]>
  /** All members together. */
  owed: number
  deposit: number
  /** The oldest purchase still owed by anyone. */
  since: string | null
}

/** The engine's order of operations: date, time (none first), creation, id. */
export const ledgerOrder = (a: Transaction, b: Transaction): number =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time ?? '').localeCompare(b.time ?? '') || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)

/** The member whose money an income is: its `memberId`, else (an income of before 1.3.0 with `repaid`) the first one. */
export function payerOf(t: Pick<Transaction, 'kind' | 'amount' | 'memberId' | 'repaid'>): string | null {
  if (t.kind !== 'income' || t.amount <= 0) return null
  return t.memberId ?? (t.repaid > 0 ? HOUSE_MEMBER_ID : null)
}

/** Does the operation touch a member's balance (a financed part, a member's income)? */
export const settlesHousehold = (t: Transaction): boolean => (t.kind === 'expense' ? partsOf(t).some((p) => p.refundable) : payerOf(t) != null)

interface State {
  owed: number
  deposit: number
  queue: OpenPurchase[]
}

const flowOf = (memberId: string): MemberFlow => ({ memberId, fromDeposit: 0, lent: 0, repaid: 0, advance: 0, income: 0 })

/** Pay back up to `v` of what is owed: the covered purchases first (in their order), then the oldest. */
function repay(st: State, v: number, covers: readonly string[]): number {
  let rest = Math.min(v, st.owed)
  const paid = rest
  const take = (item: OpenPurchase) => {
    const x = Math.min(rest, item.amount)
    item.amount -= x
    rest -= x
  }
  if (covers.length) for (const item of st.queue) if (rest > 0 && covers.includes(item.txId)) take(item)
  for (const item of st.queue) if (rest > 0) take(item)
  st.queue = st.queue.filter((i) => i.amount > 0)
  st.owed -= paid
  return paid
}

const memo = new WeakMap<readonly Transaction[], Map<string, HouseholdLedger>>()

/**
 * The household's balances from the operations up to `until` (a Warsaw date; none = all); `from` = the budget's start
 * (the balances are zero at its beginning; none = the whole history counts).
 */
export function settleHousehold(transactions: readonly Transaction[], opts: { until?: string; from?: string | null } = {}): HouseholdLedger {
  const { until, from } = opts
  const key = `${until ?? ''}|${from ?? ''}`
  const cached = memo.get(transactions)?.get(key)
  if (cached) return cached
  const states = new Map<string, State>()
  const stateOf = (id: string) => states.get(id) ?? states.set(id, { owed: 0, deposit: 0, queue: [] }).get(id)!
  const byTx = new Map<string, MemberFlow[]>()
  const txs = transactions.filter((t) => (until == null || t.date <= until) && settlesHousehold(t)).sort(ledgerOrder)
  let started = !from
  for (const t of txs) {
    if (!started && t.date >= from!) {
      // The start: what was owed or held before it is in the opening balance.
      started = true
      states.clear()
    }
    const flows = new Map<string, MemberFlow>()
    const flow = (id: string) => flows.get(id) ?? flows.set(id, flowOf(id)).get(id)!
    if (t.kind === 'expense') {
      for (const p of partsOf(t)) {
        if (!p.refundable || !p.amount) continue
        const id = financerOf(p)
        const st = stateOf(id)
        const f = flow(id)
        if (p.amount < 0) {
          const fromDeposit = Math.min(-p.amount, st.deposit)
          st.deposit -= fromDeposit
          const lent = -p.amount - fromDeposit
          if (lent) {
            st.owed += lent
            const last = st.queue.at(-1)
            if (last?.txId === t.id) last.amount += lent
            else st.queue.push({ txId: t.id, date: t.date, amount: lent })
          }
          f.fromDeposit += fromDeposit
          f.lent += lent
        } else {
          // A product return of a purchase they financed: their money.
          const back = repay(st, p.amount, [])
          st.deposit += p.amount - back
          f.repaid += back
          f.advance += p.amount - back
        }
      }
    } else {
      const id = payerOf(t)!
      const st = stateOf(id)
      const f = flow(id)
      // Before 1.3.0 an income said how much of it repays (`repaid`); the rest was income.
      const back = repay(st, t.memberId ? t.amount : Math.min(t.amount, t.repaid), t.covers)
      const rest = t.amount - back
      f.repaid = back
      f.advance = t.memberId && t.advance ? rest : 0
      f.income = rest - f.advance
      st.deposit += f.advance
    }
    if (flows.size) byTx.set(t.id, [...flows.values()])
  }
  if (!started) states.clear()
  const members: MemberBalance[] = [...states].map(([memberId, st]) => ({ memberId, owed: st.owed, deposit: st.deposit, open: st.queue.map((i) => ({ ...i })), since: st.queue[0]?.date ?? null }))
  const since = members.map((m) => m.since).filter((d): d is string => d != null).sort()[0] ?? null
  const out: HouseholdLedger = {
    members,
    byTx,
    owed: members.reduce((a, m) => a + m.owed, 0),
    deposit: members.reduce((a, m) => a + m.deposit, 0),
    since
  }
  const forList = memo.get(transactions) ?? new Map<string, HouseholdLedger>()
  forList.set(key, out)
  memo.set(transactions, forList)
  return out
}

/** The deposit's change of one operation (advances in, advances spent). */
export const depositMove = (flows: readonly MemberFlow[] | undefined): number => (flows ?? []).reduce((a, f) => a + f.advance - f.fromDeposit, 0)

/** A member's balance (a member without one = all zero). */
export function balanceOf(ledger: HouseholdLedger, memberId: string): MemberBalance {
  return ledger.members.find((m) => m.memberId === memberId) ?? { memberId, owed: 0, deposit: 0, open: [], since: null }
}

/** A member's name for the screens: from the settings, else the first member's „Dom”, else an unknown one. */
export function memberName(memberId: string | null | undefined, members: ReadonlyArray<Pick<HouseholdMember, 'id' | 'name'>> | undefined): string {
  const id = memberId ?? HOUSE_MEMBER_ID
  return members?.find((m) => m.id === id)?.name ?? (id === HOUSE_MEMBER_ID ? 'Dom' : 'domownik spoza listy')
}

/** What household members financed in some operations, by member, the most first (D80: the reports show it apart). */
export function financedBy(transactions: readonly Transaction[]): Array<{ memberId: string; amount: number }> {
  const out = new Map<string, number>()
  for (const t of transactions) for (const [id, v] of financedOf(t)) out.set(id, (out.get(id) ?? 0) + v)
  return [...out]
    .filter(([, amount]) => amount !== 0)
    .map(([memberId, amount]) => ({ memberId, amount }))
    .sort((a, b) => b.amount - a.amount || a.memberId.localeCompare(b.memberId))
}
