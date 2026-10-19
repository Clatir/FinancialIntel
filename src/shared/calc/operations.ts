/**
 * Operations as the budget sees them: the lines of a (split) receipt, categories and their envelopes, what counts as a
 * net cost and as income, the captain's log marks. Pure; used by the layers' engine (fleet.ts) and the screens.
 */
import { envelopeKind, HOUSE_MEMBER_ID, type Category, type EnvelopeKind, type Orders } from '../schema/budget'
import type { Transaction } from '../schema/records'
import { inClockWindow } from './dates'

export interface Part {
  amount: number
  categoryId: string | null
  /** Financed by a household member (D80): not a cost of mine. */
  refundable: boolean
  /** Who finances it (a refundable part; null = the first member). */
  memberId: string | null
  /** A refundable part as the member's gift (D83): nobody owes it. */
  gift: boolean
}

export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)

/**
 * A transfer between two accounts of the budget in one operation (1.7.0, F10, D87): its other account gets the
 * opposite amount and the layers do not change.
 */
export const isTwoSided = (t: Pick<Transaction, 'kind' | 'accountId' | 'counterAccountId' | 'bothSides'>): boolean =>
  t.kind === 'transfer' && t.bothSides === true && !!t.counterAccountId && t.counterAccountId !== t.accountId

/** Is this account the other side of a two-sided transfer (F10)? */
const isOtherSide = (t: Transaction, accountId: string): boolean => t.accountId !== accountId && isTwoSided(t) && t.counterAccountId === accountId

/** The operation's money on this account (F10): its own account – `amount`, a two-sided transfer's other one – the opposite, else 0. */
export function amountOn(t: Transaction, accountId: string): number {
  if (t.accountId === accountId) return t.amount
  return isOtherSide(t, accountId) ? -t.amount : 0
}

/** The operation's day on this account (F10): the bank may book a transfer's other side a day or two later. */
export const dateOn = (t: Transaction, accountId: string): string => (isOtherSide(t, accountId) ? (t.counterDate ?? t.date) : t.date)

/** Does the operation move money on this account (its own, or the other one of a two-sided transfer)? */
export const touchesAccount = (t: Transaction, accountId: string): boolean => t.accountId === accountId || isOtherSide(t, accountId)

/** One account's side of an operation: the account, the money on it and its day. */
export type AccountSide = readonly [accountId: string, amount: number, date: string]

/** Each account the operation moves money on, with the amount and the day (F10): one, or two for a two-sided transfer. */
export function accountAmounts(t: Transaction): readonly AccountSide[] {
  return isTwoSided(t) ? [[t.accountId, t.amount, t.date], [t.counterAccountId!, -t.amount, t.counterDate ?? t.date]] : [[t.accountId, t.amount, t.date]]
}

type PartsSource = Pick<Transaction, 'amount' | 'categoryId' | 'refundable' | 'splits'> & { memberId?: string | null; gift?: boolean }

/** The lines of each operation object (W27): records are never changed in place – a change is a new object. */
const partsMemo = new WeakMap<PartsSource, readonly Part[]>()

/**
 * Lines of an operation: its split receipt (a sum that does not match the amount – a file edited by hand – leaves the
 * rest as one more line of the operation's own category), or the operation itself as one line. Read only: the same
 * lines for the same object.
 */
export function partsOf(t: PartsSource): readonly Part[] {
  const known = partsMemo.get(t)
  if (known) return known
  const own = { refundable: t.refundable, memberId: t.refundable ? (t.memberId ?? null) : null, gift: t.refundable && !!t.gift }
  let parts: Part[]
  if (!t.splits.length) parts = [{ amount: t.amount, categoryId: t.categoryId, ...own }]
  else {
    parts = t.splits.map((s) => ({ amount: s.amount, categoryId: s.categoryId, refundable: s.refundable, memberId: s.refundable ? (s.memberId ?? null) : null, gift: s.refundable && !!s.gift }))
    const rest = t.amount - sum(parts.map((p) => p.amount))
    if (rest !== 0) parts.push({ amount: rest, categoryId: t.categoryId, ...own })
  }
  partsMemo.set(t, parts)
  return parts
}

/** The sum of an operation's own lines – not a household member's (D80, D83). */
function ownLines(t: PartsSource): number {
  if (!t.splits.length) return t.refundable ? 0 : t.amount
  let mine = 0
  for (const p of partsOf(t)) if (!p.refundable) mine += p.amount
  return mine
}

/** The household member of a part financed by one (D80): its own, else the first member („Dom”, D21). */
export const financerOf = (p: Pick<Part, 'memberId'>): string => p.memberId ?? HOUSE_MEMBER_ID

/**
 * What household members financed in an operation (D80), by member: money out of the purchases they finance less what
 * comes back of them (a product return). Not a cost of mine – the reports show it apart.
 */
export function financedOf(t: Transaction): Map<string, number> {
  const out = new Map<string, number>()
  if (t.kind !== 'expense') return out
  for (const p of partsOf(t)) if (p.refundable) out.set(financerOf(p), (out.get(financerOf(p)) ?? 0) - p.amount)
  return out
}

/** Split `amount` grosze into `n` parts: equal parts rounded down, the rest in the last one (T3). */
export function splitEvenly(amount: number, parts: number): number[] {
  // Whole parts only (B26): 2,5 parts would lose a half of the amount.
  const n = Math.floor(parts)
  if (n <= 0) return []
  const base = Math.trunc(amount / n)
  return Array.from({ length: n }, (_, i) => (i < n - 1 ? base : amount - base * (n - 1)))
}

// ------------------------------------------------------------------ categories

export interface CategoryIndex {
  byId: ReadonlyMap<string, Category>
  /** Main categories in their order (archived too). */
  mains: Category[]
  /** The main category of a (sub)category; null for an unknown id. */
  mainOf(id: string | null | undefined): Category | null
  /** Whose envelope a category's spending counts against (its main category's setting). */
  envelopeOf(id: string | null | undefined): EnvelopeKind | null
  childrenOf(id: string): Category[]
  /** „Jedzenie · zakupy spożywcze”; an unknown id = „(usunięta kategoria)”. */
  label(id: string | null | undefined): string
}

export function categoryIndex(categories: readonly Category[]): CategoryIndex {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const mainOf = (id: string | null | undefined): Category | null => {
    const c = id ? byId.get(id) : undefined
    if (!c) return null
    return c.parentId ? (byId.get(c.parentId) ?? c) : c
  }
  return {
    byId,
    mains: categories.filter((c) => !c.parentId || !byId.has(c.parentId)),
    mainOf,
    envelopeOf: (id) => envelopeKind(mainOf(id)),
    childrenOf: (id) => categories.filter((c) => c.parentId === id),
    label: (id) => {
      if (!id) return ''
      const c = byId.get(id)
      if (!c) return '(usunięta kategoria)'
      const parent = c.parentId ? byId.get(c.parentId) : undefined
      return parent ? `${parent.name} · ${c.name}` : c.name
    }
  }
}

// ------------------------------------------------------------------ costs and income

/**
 * Net cost of an operation (grosze, > 0 = a cost, < 0 = a product return): expenses minus product returns, without
 * own transfers, XTB top-ups, purchases a household member finances (D80) and PIT-38 (spec). An expense paid from a
 * goal's money is not a monthly cost either (T24).
 */
export function costOf(t: Transaction): number {
  if (t.kind !== 'expense' || t.goalId) return 0
  return -ownLines(t) || 0
}

/**
 * Money out of my own lines (grosze ≥ 0): what of a purchase is mine – not a household member's, financed or given
 * (D80, D83). Unlike `costOf` a purchase paid from a goal's money counts: it is still my decision (N5).
 */
export function ownSpent(t: Transaction): number {
  if (t.kind !== 'expense') return 0
  return Math.max(0, -ownLines(t))
}

/**
 * A payment of the cargo (B58): linked to a container that exists. A payment of a container deleted (on another
 * computer, or before 1.5.2) is an ordinary expense – the engine takes it from the energy, so the envelopes count it.
 */
export const isCargoPayment = (t: Pick<Transaction, 'containerId'>, containerIds: ReadonlySet<string>): boolean => t.containerId != null && containerIds.has(t.containerId)

// ------------------------------------------------------------------ the captain's log marks

/** A purchase in the quiet hours (D40): only operations with a known time (an import has none). */
export function isNight(t: Pick<Transaction, 'time' | 'kind' | 'amount'>, orders: Pick<Orders, 'quietHours'>): boolean {
  return t.kind === 'expense' && t.amount < 0 && t.time != null && inClockWindow(t.time, orders.quietHours.from, orders.quietHours.to)
}

/**
 * A purchase in the quiet hours confirmed (D40, spec: „potwierdzony zakup w ciszy nocnej” – N10): its time in the
 * window and its short entry in the captain's log. The quick entry asks for both; an operation typed later in Operacje
 * with a night time and no entry is a purchase of the day written down at night – not the game's serious violation.
 */
export function isConfirmedNight(t: Pick<Transaction, 'time' | 'kind' | 'amount' | 'logNote'>, orders: Pick<Orders, 'quietHours'>): boolean {
  return isNight(t, orders) && t.logNote.trim() !== ''
}

/** From the threshold the captain's log asks „plan czy impuls?” (D41); 0 = the log never asks (N32 – everywhere alike). */
export function asksImpulse(t: Pick<Transaction, 'kind' | 'amount'>, orders: Pick<Orders, 'impulseThreshold'>): boolean {
  return orders.impulseThreshold > 0 && t.kind === 'expense' && t.amount < 0 && -t.amount >= orders.impulseThreshold
}
