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
}

export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)

/**
 * Lines of an operation: its split receipt (a sum that does not match the amount – a file edited by hand – leaves the
 * rest as one more line of the operation's own category), or the operation itself as one line.
 */
export function partsOf(t: Pick<Transaction, 'amount' | 'categoryId' | 'refundable' | 'splits'> & { memberId?: string | null }): Part[] {
  const own = { refundable: t.refundable, memberId: t.refundable ? (t.memberId ?? null) : null }
  if (!t.splits.length) return [{ amount: t.amount, categoryId: t.categoryId, ...own }]
  const parts: Part[] = t.splits.map((s) => ({ amount: s.amount, categoryId: s.categoryId, refundable: s.refundable, memberId: s.refundable ? (s.memberId ?? null) : null }))
  const rest = t.amount - sum(parts.map((p) => p.amount))
  if (rest !== 0) parts.push({ amount: rest, categoryId: t.categoryId, ...own })
  return parts
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
export function splitEvenly(amount: number, n: number): number[] {
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
  return -sum(partsOf(t).filter((p) => !p.refundable).map((p) => p.amount)) || 0
}

// ------------------------------------------------------------------ the captain's log marks

/** A purchase in the quiet hours (D40): only operations with a known time (an import has none). */
export function isNight(t: Pick<Transaction, 'time' | 'kind' | 'amount'>, orders: Pick<Orders, 'quietHours'>): boolean {
  return t.kind === 'expense' && t.amount < 0 && t.time != null && inClockWindow(t.time, orders.quietHours.from, orders.quietHours.to)
}

/** From the threshold the captain's log asks „plan czy impuls?” (D41). */
export function asksImpulse(t: Pick<Transaction, 'kind' | 'amount'>, orders: Pick<Orders, 'impulseThreshold'>): boolean {
  return t.kind === 'expense' && t.amount < 0 && -t.amount >= orders.impulseThreshold
}
