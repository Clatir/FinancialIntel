/**
 * Which purchases a household member's money pays back (1.12.0, D91): a repayment names them (`covers`), from the day of
 * `settings.household.assignFrom` only them (`calc/household.ts`). Named by itself only when sure – the import, the
 * quick entry and the payer chosen in the editor; else it waits to be assigned and the screens offer the options.
 *
 * Sure for a member's money: the amount of one open purchase of theirs (the only one of it), the sum of all their open
 * purchases, or the sum of the only set of 2–3 of their open purchases of the last `SET_DAYS` days. Sure for a product
 * return: the only open purchase of theirs from the same counterparty (several – the one of the same amount).
 */
import { addDays } from './dates'
import { fold } from '../fold'
import type { Split, Transaction } from '../schema/records'
import { householdBefore, type FleetInput } from './fleet'
import {
  assignsOn,
  balanceOf,
  incomeShares,
  isOpeningItem,
  ledgerOrder,
  OPENING_TX,
  settlesHousehold,
  type HouseholdLedger,
  type OpenPurchase,
  type PurchaseState,
  type Unassigned
} from './household'
import { financerOf, partsOf } from './operations'

/** The days back a set of 2–3 purchases is looked for in. */
export const SET_DAYS = 90
/** The most recent open purchases a set is looked for among (a long debt: the sets would grow too many). */
const SET_ITEMS = 40
/** The options offered when none is sure. */
const MAX_OPTIONS = 5
/** The most purchases one operation names (the record keeps at most 500 – `transactionSchema.covers`). */
export const MAX_COVERS = 500

export { assignsOn }

export interface CoverMatch {
  /** The purchases surely paid back (ids, oldest first); null = none sure. */
  sure: string[] | null
  /** What to offer when none is sure: sets of purchases of exactly the amount (at most a few). */
  options: string[][]
}

const byDate = (a: OpenPurchase, b: OpenPurchase) => a.date.localeCompare(b.date) || a.txId.localeCompare(b.txId)

/** The purchases of `open` an amount of a member's money surely pays back (D91), and the options when none is sure. */
export function matchCovers(open: readonly OpenPurchase[], amount: number, date: string): CoverMatch {
  const items = open.filter((i) => i.amount > 0 && i.date <= date).sort(byDate)
  if (amount <= 0 || !items.length) return { sure: null, options: [] }
  const same = items.filter((i) => i.amount === amount)
  if (same.length === 1) return { sure: [same[0]!.txId], options: [] }
  if (same.length > 1) return { sure: null, options: same.slice(0, MAX_OPTIONS).map((i) => [i.txId]) }
  if (items.length > 1 && items.length <= MAX_COVERS && items.reduce((a, i) => a + i.amount, 0) === amount) return { sure: items.map((i) => i.txId), options: [] }
  // The sets of 2–3 recent purchases of exactly the amount: the only one is sure.
  const from = addDays(date, -SET_DAYS)
  const recent = items.filter((i) => i.date >= from).slice(-SET_ITEMS)
  const sets: string[][] = []
  for (let a = 0; a < recent.length && sets.length <= MAX_OPTIONS; a++)
    for (let b = a + 1; b < recent.length && sets.length <= MAX_OPTIONS; b++) {
      const two = recent[a]!.amount + recent[b]!.amount
      if (two === amount) sets.push([recent[a]!.txId, recent[b]!.txId])
      if (two >= amount) continue
      for (let c = b + 1; c < recent.length && sets.length <= MAX_OPTIONS; c++)
        if (two + recent[c]!.amount === amount) sets.push([recent[a]!.txId, recent[b]!.txId, recent[c]!.txId])
    }
  return sets.length === 1 ? { sure: sets[0]!, options: [] } : { sure: null, options: sets.slice(0, MAX_OPTIONS) }
}

/** The purchase a product return of a member's purchase surely is (D91): the only open one from the same counterparty. */
export function matchReturn(open: readonly OpenPurchase[], amount: number, counterparty: string, purchaseOf: (txId: string) => Pick<Transaction, 'counterparty'> | undefined): CoverMatch {
  const name = fold(counterparty).trim()
  if (!name) return { sure: null, options: [] }
  const items = open.filter((i) => i.amount > 0 && !isOpeningItem(i.txId) && fold(purchaseOf(i.txId)?.counterparty ?? '').trim() === name).sort(byDate)
  if (items.length === 1) return { sure: [items[0]!.txId], options: [] }
  const same = items.filter((i) => i.amount === amount)
  if (same.length === 1) return { sure: [same[0]!.txId], options: [] }
  // The latest first: a return is mostly of the last purchase there.
  return { sure: null, options: items.reverse().slice(0, MAX_OPTIONS).map((i) => [i.txId]) }
}

/** One member's part of an operation's money that pays back their purchases (a member's money, a product return). */
export interface RepaymentShare {
  memberId: string
  amount: number
  /** A product return of a purchase (else a member's money). */
  isReturn: boolean
}

/** The parts of an operation that pay back a member's purchases (D91): an income's members' shares, a return's lines. */
export function repaymentShares(t: Transaction): RepaymentShare[] {
  if (t.kind === 'income') return incomeShares(t).flatMap((s) => (s.memberId && !s.limit ? [{ memberId: s.memberId, amount: s.amount, isReturn: false }] : []))
  if (t.kind !== 'expense' || t.amount <= 0) return []
  return partsOf(t).flatMap((p) => (p.refundable && !p.gift && p.amount > 0 ? [{ memberId: financerOf(p), amount: p.amount, isReturn: true }] : []))
}

/** The fields naming purchases (D91, N-PC-12): the operations' ids, the opening balance's debt apart (per-member in multi-member operations). */
export type CoverFields = Pick<Transaction, 'covers' | 'coversOpening' | 'coversOpeningMembers'>

export function coverFields(ids: readonly string[], multiMember = false): CoverFields {
  const openingMembers = [...new Set(ids.filter(isOpeningItem).map((id) => id.slice(OPENING_TX.length)).filter(Boolean))]
  return {
    covers: ids.filter((id) => !isOpeningItem(id)),
    ...(openingMembers.length ? { coversOpening: true } : {}),
    ...(openingMembers.length && (multiMember || openingMembers.length > 1) ? { coversOpeningMembers: openingMembers } : {})
  }
}

/** Does an operation name a purchase (an operation's id, a member's opening balance)? */
export const names = (t: Pick<Transaction, 'covers' | 'coversOpening' | 'coversOpeningMembers'>, txId: string): boolean =>
  isOpeningItem(txId)
    ? t.coversOpeningMembers?.length
      ? t.coversOpeningMembers.includes(txId.slice(OPENING_TX.length))
      : !!t.coversOpening
    : t.covers.includes(txId)

/** The fields with one purchase named or not (both always – `undefined` takes the opening balance's mark off). */
export function withNamed(
  t: Pick<Transaction, 'covers' | 'coversOpening' | 'coversOpeningMembers'> &
    Partial<Pick<Transaction, 'kind' | 'amount' | 'memberId' | 'repaid' | 'advance'>> & {
      splits?: ReadonlyArray<Partial<Split>>
    },
  txId: string,
  on: boolean
): Required<Pick<Transaction, 'covers'>> & { coversOpening: true | undefined; coversOpeningMembers?: string[] | undefined } {
  const shareMembers =
    t.kind && t.amount != null && t.splits != null
      ? [...new Set(repaymentShares(t as Transaction).map((s) => s.memberId))]
      : [...new Set([t.memberId, ...(t.splits?.map((s) => s.memberId) ?? [])].filter((id): id is string => !!id))]
  const multiMember = shareMembers.length > 1 || !!t.coversOpeningMembers?.length
  if (isOpeningItem(txId)) {
    const memberId = txId.slice(OPENING_TX.length)
    if (multiMember && memberId) {
      const current = t.coversOpeningMembers?.length ? t.coversOpeningMembers : t.coversOpening ? shareMembers : []
      const next = on ? (current.includes(memberId) ? current : [...current, memberId]) : current.filter((id) => id !== memberId)
      return {
        covers: t.covers,
        coversOpening: next.length ? true : undefined,
        coversOpeningMembers: next.length ? next : undefined
      }
    }
    return { covers: t.covers, coversOpening: on ? true : undefined, ...(t.coversOpeningMembers !== undefined ? { coversOpeningMembers: undefined } : {}) }
  }
  // Named last (it takes what the ones named before leave); the record keeps at most `MAX_COVERS`.
  const covers = on ? (t.covers.includes(txId) || t.covers.length >= MAX_COVERS ? t.covers : [...t.covers, txId]) : t.covers.filter((x) => x !== txId)
  return {
    covers,
    coversOpening: t.coversOpening ? true : undefined,
    ...(t.coversOpeningMembers?.length ? { coversOpeningMembers: t.coversOpeningMembers } : {})
  }
}

export interface Proposal {
  /** The purchases surely paid back, all members' together. */
  covers: string[]
  /** The members whose part none was sure for (it waits to be assigned). */
  unsure: string[]
}

/**
 * The purchases an operation surely pays back (D91), from the ledger just before it (`before` – `fleet.ts`
 * `householdBefore`): each member's part separately (a transfer through another member carries several).
 */
export function proposeCovers(t: Transaction, before: HouseholdLedger, purchaseOf: (txId: string) => Pick<Transaction, 'counterparty'> | undefined): Proposal {
  const covers: string[] = []
  const unsure: string[] = []
  for (const share of repaymentShares(t)) {
    const open = balanceOf(before, share.memberId).open
    const m = share.isReturn ? matchReturn(open, share.amount, t.counterparty, purchaseOf) : matchCovers(open, share.amount, t.date)
    if (m.sure) covers.push(...m.sure.filter((id) => !covers.includes(id)))
    else if (open.length) unsure.push(share.memberId)
  }
  return { covers, unsure }
}

/**
 * The purchases new operations surely pay back (D91 – the import, the quick entry): each in the ledger's order, the
 * ledger just before it with the ones linked before it – only operations paid back explicitly (`assignsOn`) and naming
 * nothing yet. The covers of each operation linked (none sure – not in the map).
 */
export function linkRepayments(input: Pick<FleetInput, 'settings' | 'balances' | 'transactions'>, ids: ReadonlySet<string>, today: string): Map<string, CoverFields> {
  const out = new Map<string, CoverFields>()
  const assignFrom = input.settings.household.assignFrom
  const targets = input.transactions.filter((t) => ids.has(t.id) && !t.covers.length && !t.coversOpening && assignsOn(assignFrom, t.date) && repaymentShares(t).length > 0).sort(ledgerOrder)
  if (!targets.length) return out
  // The ledger reads the household's operations only (W27): the rest of the history is filtered out once.
  let transactions = input.transactions.filter(settlesHousehold)
  const byId = new Map(transactions.map((t) => [t.id, t]))
  for (const t of targets) {
    const before = householdBefore({ ...input, transactions }, t, today)
    const { covers } = proposeCovers(t, before, (id) => byId.get(id))
    if (!covers.length) continue
    const multi = new Set(repaymentShares(t).map((s) => s.memberId)).size > 1
    const fields = coverFields(covers, multi)
    out.set(t.id, fields)
    // The next ones see this one's purchases paid back.
    transactions = transactions.map((x) => (x.id === t.id ? { ...x, ...fields } : x))
  }
  return out
}

/**
 * The purchases offered on a member's money in the editor (D91, 1.15.1): the ones open just before it (up to its day),
 * the ones it names already, and any later purchase of the member still open (or covered from an unearmarked advance of
 * this operation) so an earlier inflow can explicitly finance a later purchase.
 */
export function choicesForRepayment(before: HouseholdLedger, ledger: HouseholdLedger | null, t: Transaction, memberId: string): OpenPurchase[] {
  const openBefore = balanceOf(before, memberId).open.filter((o) => o.date <= t.date)
  if (!ledger?.purchases.size) return openBefore
  const flow = ledger.byTx.get(t.id)?.find((f) => f.memberId === memberId)
  const paidForSum = flow ? flow.paidFor.reduce((a, r) => a + r.amount, 0) : 0
  const freeAdvance = flow ? Math.max(0, flow.advance - Math.max(0, paidForSum - flow.repaid)) : 0
  const extra: OpenPurchase[] = []
  for (const list of ledger.purchases.values())
    for (const p of list) {
      if (p.memberId !== memberId || openBefore.some((o) => o.txId === p.txId)) continue
      const openNow = Math.max(0, p.lent - p.paid)
      const byThis = p.by.filter((b) => b.txId === t.id).reduce((a, b) => a + b.amount, 0)
      if (names(t, p.txId)) {
        extra.push({ txId: p.txId, date: p.date, amount: byThis + openNow })
        continue
      }
      const isAfter = !before.purchases.get(p.txId)?.some((x) => x.memberId === memberId)
      if (!isAfter) continue
      const namedDeposit = Math.max(0, p.by.reduce((a, b) => a + b.amount, 0) - p.paid)
      const anonDeposit = Math.max(0, p.fromDeposit - namedDeposit)
      const amount = openNow + (freeAdvance > 0 ? anonDeposit : 0)
      if (amount > 0) extra.push({ txId: p.txId, date: p.date, amount })
    }
  return [...openBefore, ...extra.sort(byDate)]
}

export interface WaitingRepayment extends Unassigned {
  /** True when assigning this payment to the purchase pulls from prior-month booked income (`f.income > 0` and `pay.date.slice(0, 7) < purchase.date.slice(0, 7)`). */
  fromPriorIncome?: boolean
}

/**
 * A member's money available to assign to a financed purchase in the editor („Przypisz zwrot…”, D91, 1.15.1): both later
 * unassigned repayments and earlier inflows with uncommitted money (or unearmarked advance that covered the purchase).
 */
export function waitingForPurchase(
  ledger: HouseholdLedger,
  purchase: Transaction,
  p: PurchaseState,
  txOf: (txId: string) => Transaction | undefined
): WaitingRepayment[] {
  const openNow = Math.max(0, p.lent - p.paid)
  const namedDeposit = Math.max(0, p.by.reduce((a, b) => a + b.amount, 0) - p.paid)
  const anonDeposit = Math.max(0, p.fromDeposit - namedDeposit)
  if (openNow + anonDeposit <= 0) return []
  const unassigned = balanceOf(ledger, p.memberId).unassigned
  const out = new Map<string, WaitingRepayment>()
  if (openNow > 0)
    for (const u of unassigned) {
      const pay = txOf(u.txId)
      if (pay && !names(pay, purchase.id) && u.amount > 0) out.set(u.txId, { txId: u.txId, date: u.date, amount: u.amount })
    }
  for (const [txId, flows] of ledger.byTx) {
    const f = flows.find((x) => x.memberId === p.memberId)
    if (!f) continue
    const pay = txOf(txId)
    if (!pay || ledgerOrder(pay, purchase) >= 0 || names(pay, purchase.id)) continue
    if (!repaymentShares(pay).some((s) => s.memberId === p.memberId)) continue
    const paidForSum = f.paidFor.reduce((a, r) => a + r.amount, 0)
    const freeAdvance = Math.max(0, f.advance - Math.max(0, paidForSum - f.repaid))
    const creditNow = unassigned.find((u) => u.txId === txId)?.amount ?? 0
    const avail = openNow > 0 ? creditNow + f.income + freeAdvance : freeAdvance
    if (avail > 0) {
      const fromPriorIncome = openNow > 0 && f.income > 0 && creditNow + freeAdvance < Math.min(openNow, avail) && pay.date.slice(0, 7) < purchase.date.slice(0, 7)
      out.set(txId, { txId, date: pay.date, amount: avail, ...(fromPriorIncome ? { fromPriorIncome: true } : {}) })
    }
  }
  return [...out.values()].sort((a, b) => Number(!!a.fromPriorIncome) - Number(!!b.fromPriorIncome) || byDate(a, b))
}

/**
 * Operations whose `covers` name any of `deletedIds`, with those ids removed (N-PC-14): deleting a purchase leaves no
 * ghost id in `covers` that would keep a repayment marked as explicitly assigned while covering nothing.
 */
export function stripDeletedCovers(transactions: readonly Transaction[], deletedIds: ReadonlySet<string>): Array<{ before: Transaction; after: Transaction }> {
  if (!deletedIds.size) return []
  const out: Array<{ before: Transaction; after: Transaction }> = []
  for (const t of transactions) {
    if (deletedIds.has(t.id) || !t.covers.some((id) => deletedIds.has(id))) continue
    out.push({ before: t, after: { ...t, covers: t.covers.filter((id) => !deletedIds.has(id)) } })
  }
  return out
}
