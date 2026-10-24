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
 * - A member's money (an income with `memberId`) repays what they owe; the rest is their advance (`advance`) or income
 *   (docks as any delivery). Which purchases it pays back (1.12.0, D91): from the day of `assignFrom` only the ones it
 *   `covers` – what it repays beyond them waits to be assigned (`unassigned`: what they owe is lower, no purchase is
 *   marked paid); before that day (and with no day set) the covered ones first, then the oldest. The money's flows are
 *   the same either way – only the purchases' state differs.
 * - A product return of a financed purchase is the member's money: it repays what they owe (the purchases it `covers`,
 *   as a member's money), the rest is their advance.
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
  /** Money in (D91): the purchases it paid back (of `repaid`). */
  paidFor: Repayment[]
  /** …and what of `repaid` waits to be assigned to a purchase (when it was settled). */
  unassigned: number
}

/** A purchase they still owe (its open part). */
export interface OpenPurchase {
  txId: string
  date: string
  amount: number
}

/** A purchase's part paid back by an operation (1.12.0, D91): a member's money, a product return. */
export interface Repayment {
  txId: string
  date: string
  amount: number
}

/** A member's money repaid but not assigned to a purchase yet (D91): its operation and how much of it waits. */
export type Unassigned = Repayment

/** Is an operation's money paid back explicitly (D91): its day from `assignFrom` on (null = always; none set = never). */
export const assignsOn = (assignFrom: string | null | undefined, date: string): boolean => assignFrom !== undefined && (assignFrom === null || date >= assignFrom)

/**
 * What a member owes for a purchase and what of it is paid back (1.12.0, D91): the part the shields lent (their advance
 * paid the rest when bought – `fromDeposit`) and the operations that paid it back. The opening balance's debt is one
 * too (`OPENING_TX`).
 */
export interface PurchaseState {
  txId: string
  memberId: string
  date: string
  lent: number
  fromDeposit: number
  paid: number
  by: Repayment[]
}

/** A financed purchase's state for the screens: nothing to pay back (their advance paid it), open, partly or all paid. */
export type PurchaseStatus = 'deposit' | 'open' | 'partial' | 'paid'

export function purchaseStatus(p: Pick<PurchaseState, 'lent' | 'paid'> & { by?: readonly Repayment[] }): PurchaseStatus {
  if (p.lent <= 0) return p.by?.length ? 'paid' : 'deposit'
  if (p.paid >= p.lent) return 'paid'
  return p.paid > 0 || (p.by?.length ?? 0) > 0 ? 'partial' : 'open'
}

/** The list's mark of a purchase paid back (D91): of all its members the least paid back; once per ledger. */
export type RepaidMark = 'owed' | 'partlyRepaid' | 'repaid'
const MARK_OF: Record<PurchaseStatus, RepaidMark> = { open: 'owed', partial: 'partlyRepaid', paid: 'repaid', deposit: 'repaid' }
const MARK_RANK: Record<RepaidMark, number> = { owed: 0, partlyRepaid: 1, repaid: 2 }
const marksMemo = new WeakMap<ReadonlyMap<string, readonly PurchaseState[]>, Map<string, RepaidMark>>()
export function repaidMarks(purchases: ReadonlyMap<string, readonly PurchaseState[]>): ReadonlyMap<string, RepaidMark> {
  let out = marksMemo.get(purchases)
  if (out) return out
  out = new Map()
  for (const [txId, list] of purchases) {
    if (isOpeningItem(txId) || !list.length) continue
    out.set(txId, list.map((p) => MARK_OF[purchaseStatus(p)]).reduce((a, b) => (MARK_RANK[b] < MARK_RANK[a] ? b : a)))
  }
  marksMemo.set(purchases, out)
  return out
}

/** One state for an operation's purchases of one member (an expense with two lines of one member: both together). */
export function purchaseOf(ledger: Pick<HouseholdLedger, 'purchases'>, txId: string, memberId?: string): PurchaseState | null {
  const list = ledger.purchases.get(txId)
  if (!list?.length) return null
  return (memberId ? list.find((p) => p.memberId === memberId) : list[0]) ?? null
}

export interface MemberBalance {
  memberId: string
  /** What they owe: purchases financed with the shields' money, not paid back yet. */
  owed: number
  /** Their advance held on the accounts. */
  deposit: number
  /** The purchases they owe, oldest first (D91: their money waiting to be assigned is not taken off them). */
  open: OpenPurchase[]
  /** The oldest open purchase's date. */
  since: string | null
  /** Their money repaid but not assigned to a purchase yet (D91), oldest first; `owed` = the open purchases − this. */
  unassigned: Unassigned[]
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
  /** Each financed purchase's state (D91), by its operation (an expense of two members' lines has two). */
  purchases: Map<string, PurchaseState[]>
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
  /** The line of the split it is (its index); none – the rest of the amount. */
  line?: number
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
  for (const [line, s] of t.splits.entries()) {
    const amount = Math.min(s.amount, left)
    if (amount <= 0) continue
    out.push({ memberId: s.memberId ?? null, amount, advance: !!s.memberId && !!s.advance, line })
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
  /** The part of `deposit` earmarked for future purchases named in `covers` (1.15.1). */
  earmarked: number
  queue: OpenPurchase[]
  /** Repaid, not assigned (D91): `owed` = the queue's sum − this list's. */
  credit: Unassigned[]
}

const flowOf = (memberId: string): MemberFlow => ({ memberId, fromDeposit: 0, lent: 0, repaid: 0, advance: 0, income: 0, gift: 0, paidFor: [], unassigned: 0 })

/**
 * Pay back up to `v` of what is owed – the money's part is the same as before 1.12.0 (at most what they owe), except
 * what it reserves for future purchases named in `covers` (1.15.1: held as their advance until the purchase). Which
 * purchases: `explicit` (D91) – only the covered ones, in the order they were named (the opening balance's debt first:
 * one named later – „Przypisz zwrot…” – takes what is left, never from the ones named before), with all of `v` (money
 * waiting to be assigned from before pays what it lacks), the rest of the repaid waits to be assigned; else the
 * covered ones first, then the oldest.
 */
function repay(
  st: State,
  v: number,
  t: Pick<Transaction, 'id' | 'date' | 'covers' | 'coversOpening'>,
  explicit: boolean,
  f: MemberFlow,
  purchase: (txId: string) => PurchaseState | undefined,
  takeFuture: (txId: string, max: number) => { amount: number; date: string } | null
): { paid: number; reserved: number } {
  let rest = explicit ? v : Math.min(v, st.owed)
  let assigned = 0
  let reserved = 0
  const addPaidFor = (txId: string, date: string, amount: number) => {
    const prev = f.paidFor.find((x) => x.txId === txId)
    if (prev) prev.amount += amount
    else f.paidFor.push({ txId, date, amount })
  }
  const take = (item: OpenPurchase) => {
    const x = Math.min(rest, item.amount)
    if (x <= 0) return
    item.amount -= x
    rest -= x
    assigned += x
    addPaidFor(item.txId, item.date, x)
    const p = purchase(item.txId)
    if (p) {
      p.paid += x
      const prev = p.by.find((b) => b.txId === t.id)
      if (prev) prev.amount += x
      else p.by.push({ txId: t.id, date: t.date, amount: x })
    }
  }
  let futureBudget = v
  if (t.coversOpening)
    for (const item of st.queue)
      if (rest > 0 && isOpeningItem(item.txId)) {
        const before = rest
        take(item)
        futureBudget -= before - rest
      }
  for (const id of t.covers) {
    const item = st.queue.find((i) => i.txId === id)
    if (item) {
      if (rest > 0) {
        const before = rest
        take(item)
        futureBudget -= before - rest
      }
      continue
    }
    if (futureBudget <= 0) continue
    const fut = takeFuture(id, futureBudget)
    if (fut) {
      futureBudget -= fut.amount
      reserved += fut.amount
      rest = explicit ? v - assigned - reserved : Math.max(0, Math.min(v - reserved, st.owed) - assigned)
      addPaidFor(id, fut.date, fut.amount)
    }
  }
  const paid = Math.min(v - reserved, st.owed)
  if (!explicit) {
    rest = Math.max(0, paid - assigned)
    for (const item of st.queue) if (rest > 0) take(item)
  }
  st.queue = st.queue.filter((i) => i.amount > 0)
  st.owed -= paid
  if (assigned < paid) {
    // Repaid beyond the purchases it names: waits to be assigned (what they owe is lower all the same).
    st.credit.push({ txId: t.id, date: t.date, amount: paid - assigned })
    f.unassigned += paid - assigned
  } else if (assigned > paid) {
    // It paid purchases their earlier money (waiting to be assigned) had repaid already: that money is assigned now.
    let over = assigned - paid
    for (const c of st.credit) {
      const x = Math.min(over, c.amount)
      c.amount -= x
      over -= x
    }
    st.credit = st.credit.filter((c) => c.amount > 0)
  }
  return { paid, reserved }
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
  /**
   * From this day a member's money pays back only the purchases it names (1.12.0, D91 – `settings.household.assignFrom`);
   * before it the oldest too. null = from the start; none (not set yet) = the oldest everywhere, as before 1.12.0.
   */
  assignFrom?: string | null
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
  const { until, from, openings, assignFrom } = opts
  const clearAt = opts.reset && from && opts.reset < from ? opts.reset : null
  const opened = from ? (opts.members ?? []).filter((m) => m.opening && (m.opening.owed > 0 || m.opening.deposit > 0)) : []
  const covered = from && clearAt && opts.covered ? coveredOf(opts.covered) : null
  const key = [
    until ?? '',
    from ?? '',
    clearAt ?? '',
    covered?.n ?? '',
    assignFrom === undefined ? '-' : (assignFrom ?? '*'),
    openings ? [...openings].map(([id, date]) => `${id}:${date}`).sort().join(',') : '',
    opened.map((m) => `${m.id}:${m.opening!.owed}:${m.opening!.deposit}:${m.opening!.since ?? ''}`).join(',')
  ].join('|')
  const cached = memo.get(transactions)?.get(key)
  if (cached) return cached
  const states = new Map<string, State>()
  const stateOf = (id: string) => states.get(id) ?? states.set(id, { owed: 0, deposit: 0, earmarked: 0, queue: [], credit: [] }).get(id)!
  const purchases = new Map<string, PurchaseState[]>()
  const purchaseState = (txId: string, memberId: string, date: string): PurchaseState => {
    const list = purchases.get(txId) ?? purchases.set(txId, []).get(txId)!
    let p = list.find((x) => x.memberId === memberId)
    if (!p) list.push((p = { txId, memberId, date, lent: 0, fromDeposit: 0, paid: 0, by: [] }))
    return p
  }
  // Explicit (D91): the operation's day from `assignFrom` on.
  const explicitOn = (date: string) => assignsOn(assignFrom, date)
  // The settlements' start: what was owed or held before it is in the opening balances – the members' own (D81).
  const begin = () => {
    states.clear()
    purchases.clear()
    for (const m of opened) {
      const { owed, deposit, since } = m.opening!
      // Dated by its oldest purchase when known (N41): a debt from June is not „from the settlements' start”.
      const date = since && since < from! ? since : from!
      states.set(m.id, { owed, deposit, earmarked: 0, queue: owed ? [{ txId: `${OPENING_TX}${m.id}`, date, amount: owed }] : [], credit: [] })
      if (owed) purchaseState(`${OPENING_TX}${m.id}`, m.id, date).lent = owed
    }
  }
  const byTx = new Map<string, MemberFlow[]>()
  const budgetFrom = clearAt ?? from
  const insideOpening = (t: Transaction) => budgetFrom != null && t.date >= budgetFrom && t.date < (openings?.get(t.accountId) ?? '')
  const allTxs = transactions.filter((t) => settlesHousehold(t) && !insideOpening(t)).sort(ledgerOrder)
  const txs = until == null ? allTxs : allTxs.filter((t) => t.date <= until)
  // Dated between the budget's start and the settlements', not taken in by the openings (B14): counted right after them.
  const isLate = (t: Transaction) => covered != null && t.date >= clearAt! && t.date < from! && !covered.set.has(t.id)
  const late = txs.filter(isLate)
  // Purchases that come after an inflow in the same settlement epoch (1.15.1): an inflow naming one in `covers` reserves
  // its advance for that purchase, so an earlier transfer can explicitly finance a later purchase.
  const futureLeft = new Map<string, number>()
  const futureDate = new Map<string, string>()
  const txEpoch = new Map<string, number>()
  const txRank = new Map<string, number>()
  const reservedBy = new Map<string, Repayment[]>()
  for (const [idx, t] of allTxs.entries()) {
    const ep = clearAt != null && t.date < clearAt ? 0 : from != null && t.date < from && !isLate(t) ? 1 : 2
    txEpoch.set(t.id, ep)
    txRank.set(t.id, ep === 2 && isLate(t) ? idx - allTxs.length : idx)
    if (t.kind === 'expense')
      for (const p of partsOf(t))
        if (p.refundable && !p.gift && p.amount < 0) {
          const k = `${t.id}:${financerOf(p)}`
          futureLeft.set(k, (futureLeft.get(k) ?? 0) - p.amount)
          futureDate.set(t.id, t.date)
        }
  }
  const reserveFuture = (t: Transaction, memberId: string, purchaseId: string, max: number): { amount: number; date: string } | null => {
    if (txEpoch.get(purchaseId) !== txEpoch.get(t.id) || (txRank.get(purchaseId) ?? -Infinity) <= txRank.get(t.id)!) return null
    const k = `${purchaseId}:${memberId}`
    const rem = futureLeft.get(k) ?? 0
    const x = Math.min(max, rem)
    if (x <= 0) return null
    futureLeft.set(k, rem - x)
    const list = reservedBy.get(k) ?? []
    const prev = list.find((r) => r.txId === t.id)
    if (prev) prev.amount += x
    else list.push({ txId: t.id, date: t.date, amount: x })
    reservedBy.set(k, list)
    return { amount: x, date: futureDate.get(purchaseId)! }
  }
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
          const k = `${t.id}:${id}`
          const resList = reservedBy.get(k)
          let usedReserved = 0
          const takenBy: Repayment[] = []
          if (resList?.length && !p.gift) {
            let need = -p.amount
            for (const r of resList) {
              const x = Math.min(need, r.amount)
              if (x <= 0) continue
              r.amount -= x
              need -= x
              usedReserved += x
              takenBy.push({ txId: r.txId, date: r.date, amount: x })
            }
          }
          st.earmarked -= usedReserved
          const availDeposit = Math.max(0, st.deposit - usedReserved - st.earmarked)
          const fromGeneral = Math.min(-p.amount - usedReserved, availDeposit)
          const fromDeposit = usedReserved + fromGeneral
          st.deposit -= fromDeposit
          f.fromDeposit += fromDeposit
          // Their gift (D83): what their advance does not cover the shields pay – nobody owes it.
          if (p.gift) {
            f.gift += -p.amount - fromDeposit
            continue
          }
          const lent = -p.amount - fromDeposit
          const ps = purchaseState(t.id, id, t.date)
          ps.lent += lent
          ps.fromDeposit += fromDeposit
          for (const r of takenBy) {
            const prev = ps.by.find((b) => b.txId === r.txId)
            if (prev) prev.amount += r.amount
            else ps.by.push(r)
          }
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
          // A product return of a purchase they financed: their money – the purchase it names (D91).
          const { paid: back, reserved } = repay(
            st,
            p.amount,
            t,
            explicitOn(t.date),
            f,
            (x) => purchases.get(x)?.find((y) => y.memberId === id),
            (txId, max) => reserveFuture(t, id, txId, max)
          )
          st.deposit += p.amount - back
          st.earmarked += reserved
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
        const { paid: back, reserved } = repay(
          st,
          share.limit ?? share.amount,
          t,
          explicitOn(t.date),
          f,
          (x) => purchases.get(x)?.find((y) => y.memberId === share.memberId),
          (txId, max) => reserveFuture(t, share.memberId!, txId, max)
        )
        const rest = share.amount - back
        const advance = share.advance ? rest : reserved
        f.repaid += back
        f.advance += advance
        f.income += rest - advance
        st.deposit += advance
        st.earmarked += reserved
      }
    }
    if (flows.size) byTx.set(t.id, [...flows.values()])
  }
  for (const t of txs) {
    if (!cleared && t.date >= clearAt!) {
      cleared = true
      states.clear()
      purchases.clear()
    }
    if (!started && t.date >= from!) start()
    if (!isLate(t)) run(t)
  }
  // No operation since the start (yet): the balances are the openings – a start still to come leaves none.
  if (!started) {
    if (from && (until == null || from <= until)) start()
    else {
      states.clear()
      purchases.clear()
    }
  }
  const members: MemberBalance[] = [...states].map(([memberId, st]) => ({
    memberId,
    owed: st.owed,
    deposit: st.deposit,
    open: st.queue.map((i) => ({ ...i })),
    // Only with a debt (D91): paid back without naming purchases, the purchases stay open – they owe nothing all the same.
    since: st.owed > 0 ? (st.queue[0]?.date ?? null) : null,
    unassigned: st.credit.map((c) => ({ ...c }))
  }))
  const since = members.map((m) => m.since).filter((d): d is string => d != null).sort()[0] ?? null
  const counted = started ? late : []
  const out: HouseholdLedger = {
    members,
    byTx,
    owed: members.reduce((a, m) => a + m.owed, 0),
    deposit: members.reduce((a, m) => a + m.deposit, 0),
    since,
    late: counted.map((t) => t.id),
    lateDeposit: counted.reduce((a, t) => a + depositMove(byTx.get(t.id)), 0),
    purchases
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
  return ledger.members.find((m) => m.memberId === memberId) ?? { memberId, owed: 0, deposit: 0, open: [], since: null, unassigned: [] }
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
