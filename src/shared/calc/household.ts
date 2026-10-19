/**
 * Settlements with the household (D80, 1.3.0): every member has one balance, both ways – what they owe for the
 * purchases they finance (a receivable: the shields lent the money) or what they paid ahead (an advance: their money
 * on my accounts, the deposit). Computed from the operations alone, in the order of the layers' engine (date, time,
 * creation, id), never stored – every computer sees the same, and a purchase marked later settles by itself. Before
 * the budget's start everything is settled in the opening balance (as the loans – T70): the balances start at zero
 * then; the flows before are kept for the editor's preview only – the income statistics skip a member's money before
 * the settlements' start (T119, N49).
 *
 * - A purchase a member finances (a refundable part, `financerOf`) takes their advance first; the rest the shields lend
 *   and the member owes it.
 * - A member's money (an income with `memberId`) repays what they owe – the purchases it `covers` first, then the
 *   oldest; the rest is their advance (`advance`) or income (docks as any delivery).
 * - A product return of a financed purchase is the member's money: it repays what they owe, the rest is their advance.
 * - An income of before 1.3.0 with `repaid` and no member is the first member's money repaying at most that much (D20).
 * - An account joining the budget after its start: its operations before its opening balance are inside that balance
 *   (as the layers' engine skips them) – they settle nothing.
 * - An income split among members (D81 – one transfer carrying the money of several): each part is its member's money
 *   (a part without a member is income); the rest of the amount is the sender's (`memberId`).
 * - The settlements start at `from` (the budget's start, or later – D81): each member's balance is then their `opening`,
 *   its debt dated by its oldest purchase when known (`opening.since` – N41).
 *   An operation dated before `from` the openings do not take in (`covered` – added later by a late import of the bank or
 *   another computer, its date or its members changed since: B14) counts right after them.
 * - A member's part as their gift (D83): their advance first, the rest the shields pay – nobody owes it; a returned gift
 *   goes back to the shields.
 */
import { fold } from '../fold'
import { HOUSE_MEMBER_ID, type HouseholdMember, type MemberOpening } from '../schema/budget'
import type { Transaction } from '../schema/records'
import { financedOf, financerOf, partsOf, sum } from './operations'

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
  /** Money out of a purchase they gave (D83): what their advance did not cover, paid by the shields – nobody owes it; < 0 = a returned gift back to the shields. */
  gift: number
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
  /** Operations dated before the settlements' start, added after the openings were set (B14): counted right after them. */
  late: string[]
  /** Their change of the deposit (the engine's deposit at the start = the openings' and this). */
  lateDeposit: number
}

/** The engine's order of operations: date, time (none first), creation, id. */
export const ledgerOrder = (a: Transaction, b: Transaction): number =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time ?? '').localeCompare(b.time ?? '') || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)

/** The member whose money an income is: its `memberId`, else (an income of before 1.3.0 with `repaid`) the first one. */
export function payerOf(t: Pick<Transaction, 'kind' | 'amount' | 'memberId' | 'repaid'>): string | null {
  if (t.kind !== 'income' || t.amount <= 0) return null
  return t.memberId ?? (t.repaid > 0 ? HOUSE_MEMBER_ID : null)
}

/** One member's part of an income (or mine: `memberId` null). */
export interface IncomeShare {
  memberId: string | null
  amount: number
  /** What they do not owe is their advance. */
  advance: boolean
  /** An income of before 1.3.0: it repays at most this much (`repaid`, D20). */
  limit?: number
}

/**
 * Whose money an income is, by parts (D81): its split – a part's member, null = mine – and the rest of the amount the
 * sender's (`payerOf`); unsplit, all of it the sender's. Parts summing to more than the amount (a file edited by hand)
 * are cut at it.
 */
export function incomeShares(t: Pick<Transaction, 'kind' | 'amount' | 'memberId' | 'repaid' | 'advance' | 'splits'>): IncomeShare[] {
  const payer = payerOf(t)
  if (t.kind !== 'income' || t.amount <= 0) return []
  const own = (amount: number): IncomeShare =>
    t.memberId ? { memberId: t.memberId, amount, advance: t.advance } : payer ? { memberId: payer, amount, advance: false, limit: Math.min(amount, t.repaid) } : { memberId: null, amount, advance: false }
  if (!t.splits.length) return [own(t.amount)]
  const out: IncomeShare[] = []
  let left = t.amount
  for (const s of t.splits) {
    const amount = Math.min(s.amount, left)
    if (amount <= 0) continue
    out.push({ memberId: s.memberId ?? null, amount, advance: !!s.memberId && !!s.advance })
    left -= amount
  }
  if (left > 0) out.push(own(left))
  return out
}

/**
 * Does the operation touch a member's balance (a financed part, a member's income)? Without a split or a mark – most
 * operations – no line to read (W27).
 */
export const settlesHousehold = (t: Transaction): boolean =>
  t.kind === 'expense' ? (t.refundable || t.splits.length > 0) && partsOf(t).some((p) => p.refundable) : t.kind === 'income' && t.amount > 0 && incomeShares(t).some((s) => s.memberId != null)

/** The open item of a member's opening balance (it has no operation): `OpenPurchase.txId`. */
export const OPENING_TX = 'opening:'
export const isOpeningItem = (txId: string): boolean => txId.startsWith(OPENING_TX)

/**
 * The household member a counterparty is (D80 a): all words of one of their bank names in it, in any order – a name of
 * one word only when it is the whole counterparty („MAMA”). Archived members too: their money is still theirs.
 */
export function memberOf<M extends Pick<HouseholdMember, 'bankNames'>>(counterparty: string, members: readonly M[] | undefined): M | null {
  if (!members?.length) return null
  // The members' names split once per list, each counterparty answered once (W12: the engine asks for every income).
  let cache = memberCache.get(members)
  if (!cache) {
    const names = members.flatMap((m) => m.bankNames.map((name) => ({ m, parts: fold(name).split(/[^a-z0-9]+/).filter((w) => w.length >= 2) })).filter((n) => n.parts.length))
    memberCache.set(members, (cache = { names, by: new Map() }))
  }
  const known = cache.by.get(counterparty)
  if (known !== undefined) return known as M | null
  const who = fold(counterparty).split(/[^a-z0-9]+/).filter(Boolean)
  let found: M | null = null
  if (who.length)
    for (const { m, parts } of cache.names)
      if (parts.length === 1 ? who.length === 1 && who[0] === parts[0] : parts.every((w) => who.includes(w))) {
        found = m as M
        break
      }
  cache.by.set(counterparty, found)
  return found
}
const memberCache = new WeakMap<object, { names: Array<{ m: unknown; parts: string[] }>; by: Map<string, unknown> }>()

/** Is an income a household member's money – marked so, split among members, or from a member's name in the bank? */
export function isMemberMoney(t: Pick<Transaction, 'kind' | 'amount' | 'memberId' | 'repaid' | 'splits' | 'counterparty'>, members: ReadonlyArray<Pick<HouseholdMember, 'bankNames'>>): boolean {
  if (t.kind !== 'income' || t.amount <= 0) return false
  return payerOf(t) != null || t.splits.some((s) => s.memberId) || memberOf(t.counterparty, members) != null
}

interface State {
  owed: number
  deposit: number
  queue: OpenPurchase[]
}

const flowOf = (memberId: string): MemberFlow => ({ memberId, fromDeposit: 0, lent: 0, repaid: 0, advance: 0, income: 0, gift: 0 })

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

export interface LedgerOptions {
  /** A Warsaw date: the operations up to it (none = all). */
  until?: string
  /** The settlements' start (the budget's or later – D81): the balances are the members' openings then; none = the whole history counts. */
  from?: string | null
  /**
   * The budget's start, when the settlements start later (D81): the balances are zero then too – what was before it is
   * in the opening balances of the accounts, as in 1.3.0; an account's operations before its opening count from it.
   */
  reset?: string | null
  /** Each account's opening balance's date (the engine's: `fleet.ts` `householdOf`). */
  openings?: ReadonlyMap<string, string>
  /** The members' balances at `from` (D81). */
  members?: ReadonlyArray<Pick<HouseholdMember, 'id'> & { opening?: MemberOpening }>
  /**
   * The operations the members' balances at `from` take in (B14 – `settings.household.openingIds`): one dated before
   * `from` and not among them counts right after them. None = all of them are in (1.4.x).
   */
  covered?: readonly string[] | null
}

/** A list of ids as a set and a number for the memo's key, once per list (the settings keep it while unchanged). */
const coveredSets = new WeakMap<readonly string[], { set: ReadonlySet<string>; n: number }>()
let coveredN = 0
function coveredOf(ids: readonly string[]): { set: ReadonlySet<string>; n: number } {
  let c = coveredSets.get(ids)
  if (!c) coveredSets.set(ids, (c = { set: new Set(ids), n: ++coveredN }))
  return c
}

/** The household's balances from the operations (`LedgerOptions`). */
export function settleHousehold(transactions: readonly Transaction[], opts: LedgerOptions = {}): HouseholdLedger {
  const { until, from, openings } = opts
  const clearAt = opts.reset && from && opts.reset < from ? opts.reset : null
  const opened = from ? (opts.members ?? []).filter((m) => m.opening && (m.opening.owed > 0 || m.opening.deposit > 0)) : []
  const covered = from && clearAt && opts.covered ? coveredOf(opts.covered) : null
  const key = [
    until ?? '',
    from ?? '',
    clearAt ?? '',
    covered?.n ?? '',
    openings ? [...openings].map(([id, date]) => `${id}:${date}`).sort().join(',') : '',
    opened.map((m) => `${m.id}:${m.opening!.owed}:${m.opening!.deposit}:${m.opening!.since ?? ''}`).join(',')
  ].join('|')
  const cached = memo.get(transactions)?.get(key)
  if (cached) return cached
  const states = new Map<string, State>()
  const stateOf = (id: string) => states.get(id) ?? states.set(id, { owed: 0, deposit: 0, queue: [] }).get(id)!
  // The settlements' start: what was owed or held before it is in the opening balances – the members' own (D81).
  const begin = () => {
    states.clear()
    for (const m of opened) {
      const { owed, deposit, since } = m.opening!
      // Dated by its oldest purchase when known (N41): a debt from June is not „from the settlements' start”.
      const date = since && since < from! ? since : from!
      states.set(m.id, { owed, deposit, queue: owed ? [{ txId: `${OPENING_TX}${m.id}`, date, amount: owed }] : [] })
    }
  }
  const byTx = new Map<string, MemberFlow[]>()
  const budgetFrom = clearAt ?? from
  const insideOpening = (t: Transaction) => budgetFrom != null && t.date >= budgetFrom && t.date < (openings?.get(t.accountId) ?? '')
  const txs = transactions.filter((t) => (until == null || t.date <= until) && settlesHousehold(t) && !insideOpening(t)).sort(ledgerOrder)
  // Dated between the budget's start and the settlements', not taken in by the openings (B14): counted right after them.
  const isLate = (t: Transaction) => covered != null && t.date >= clearAt! && t.date < from! && !covered.set.has(t.id)
  const late = txs.filter(isLate)
  let cleared = !clearAt
  let started = !from
  const start = () => {
    started = true
    begin()
    for (const t of late) run(t)
  }
  const run = (t: Transaction) => {
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
          f.fromDeposit += fromDeposit
          // Their gift (D83): what their advance does not cover the shields pay – nobody owes it.
          if (p.gift) {
            f.gift += -p.amount - fromDeposit
            continue
          }
          const lent = -p.amount - fromDeposit
          if (lent) {
            st.owed += lent
            const last = st.queue.at(-1)
            if (last?.txId === t.id) last.amount += lent
            else st.queue.push({ txId: t.id, date: t.date, amount: lent })
          }
          f.lent += lent
        } else if (p.gift) {
          // A returned gift: back to the shields that paid it (or to me – it was given).
          f.gift -= p.amount
        } else {
          // A product return of a purchase they financed: their money.
          const back = repay(st, p.amount, [])
          st.deposit += p.amount - back
          f.repaid += back
          f.advance += p.amount - back
        }
      }
    } else {
      // Each member's part (D81: one transfer may carry the money of several); a part without a member is income.
      for (const share of incomeShares(t)) {
        if (!share.memberId) continue
        const st = stateOf(share.memberId)
        const f = flow(share.memberId)
        // Before 1.3.0 an income said how much of it repays (`repaid`); the rest was income.
        const back = repay(st, share.limit ?? share.amount, t.covers)
        const rest = share.amount - back
        const advance = share.advance ? rest : 0
        f.repaid += back
        f.advance += advance
        f.income += rest - advance
        st.deposit += advance
      }
    }
    if (flows.size) byTx.set(t.id, [...flows.values()])
  }
  for (const t of txs) {
    if (!cleared && t.date >= clearAt!) {
      cleared = true
      states.clear()
    }
    if (!started && t.date >= from!) start()
    if (!isLate(t)) run(t)
  }
  // No operation since the start (yet): the balances are the openings – a start still to come leaves none.
  if (!started) {
    if (from && (until == null || from <= until)) start()
    else states.clear()
  }
  const members: MemberBalance[] = [...states].map(([memberId, st]) => ({ memberId, owed: st.owed, deposit: st.deposit, open: st.queue.map((i) => ({ ...i })), since: st.queue[0]?.date ?? null }))
  const since = members.map((m) => m.since).filter((d): d is string => d != null).sort()[0] ?? null
  const counted = started ? late : []
  const out: HouseholdLedger = {
    members,
    byTx,
    owed: members.reduce((a, m) => a + m.owed, 0),
    deposit: members.reduce((a, m) => a + m.deposit, 0),
    since,
    late: counted.map((t) => t.id),
    lateDeposit: counted.reduce((a, t) => a + depositMove(byTx.get(t.id)), 0)
  }
  const forList = memo.get(transactions) ?? new Map<string, HouseholdLedger>()
  forList.set(key, out)
  memo.set(transactions, forList)
  return out
}

/** What of an income's money stays with the members (repaid, held as advances): the rest is income – it docks. */
export const heldOf = (flows: readonly MemberFlow[] | undefined): number => sum((flows ?? []).map((f) => f.repaid + f.advance))

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

/**
 * Who pays a purchase, as the lists and exports say it (D80, D83): its members – a gift marked – and „ja” first when a
 * part is mine too (a shared purchase); '' = mine alone.
 */
export function financersText(t: Transaction, members: ReadonlyArray<Pick<HouseholdMember, 'id' | 'name'>> | undefined): string {
  if (t.kind !== 'expense') return ''
  const parts = partsOf(t)
  const theirs = parts.filter((p) => p.refundable)
  if (!theirs.length) return ''
  const names = [...new Set(theirs.map((p) => `${memberName(financerOf(p), members)}${p.gift ? ' (prezent)' : ''}`))]
  return [...(parts.some((p) => !p.refundable && p.amount !== 0) ? ['ja'] : []), ...names].join(', ')
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
