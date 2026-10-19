/**
 * The operations list (stage E1): filters, search, order, sums and how an amount is shown. Pure – the screen and the
 * tests share it.
 */
import type { Account, Orders } from './schema/budget'
import type { Transaction, TxKind } from './schema/records'
import { asksImpulse, costOf, isNight, type CategoryIndex } from './calc/operations'
import { fold } from './fold'

/** Marks of an operation (spec, „Ekrany”: finansuje domownik – D80, plan lub impuls, noc) and of its origin. */
export const OPERATION_MARKS = ['refundable', 'impulse', 'plan', 'night', 'split', 'uncategorized', 'bank', 'pending', 'manual'] as const
export type OperationMark = (typeof OPERATION_MARKS)[number]

export const MARK_LABEL: Record<OperationMark, string> = {
  refundable: 'domownik',
  impulse: 'impuls',
  plan: 'plan',
  night: 'noc',
  split: 'podział',
  uncategorized: 'bez kategorii',
  bank: 'z banku',
  pending: 'nierozliczona',
  manual: 'wpisana ręcznie'
}

/**
 * An expense without a category (the mark „bez kategorii”, F6's inbox): a receipt's parts and a member's purchase have
 * theirs, and a payment of a container or one paid from a goal has its place in the budget (no energy, no envelope).
 */
export const isUncategorized = (t: Transaction): boolean => t.kind === 'expense' && !t.categoryId && !t.splits.length && !t.refundable && !t.containerId && !t.goalId

export function marksOf(t: Transaction, orders: Pick<Orders, 'quietHours'>): OperationMark[] {
  const out: OperationMark[] = []
  if (t.refundable || t.splits.some((s) => s.refundable)) out.push('refundable')
  if (t.impulse) out.push(t.impulse)
  if (isNight(t, orders)) out.push('night')
  if (t.splits.length) out.push('split')
  if (isUncategorized(t)) out.push('uncategorized')
  if (t.bank) out.push(t.bank.pending ? 'pending' : 'bank')
  else out.push('manual')
  return out
}

/** The captain's log still waits for an answer: a purchase from the threshold without „plan / impuls”. */
export const needsLog = (t: Transaction, orders: Pick<Orders, 'impulseThreshold'>) => asksImpulse(t, orders) && !t.impulse

export type PeriodFilter = { kind: 'month'; month: string } | { kind: 'all' } | { kind: 'range'; from: string | null; to: string | null }

export interface OperationsFilter {
  period: PeriodFilter
  accounts: string[]
  kinds: TxKind[]
  /** Main category ids; '' = without a category. */
  categories: string[]
  marks: OperationMark[]
  query: string
}

export const emptyFilter = (month: string): OperationsFilter => ({ period: { kind: 'month', month }, accounts: [], kinds: [], categories: [], marks: [], query: '' })

export function inPeriod(date: string, p: PeriodFilter): boolean {
  if (p.kind === 'all') return true
  if (p.kind === 'month') return date.startsWith(p.month)
  return (p.from == null || date >= p.from) && (p.to == null || date <= p.to)
}

export { fold }

/** The amount typed in the search („12,49”, „1 234.5”) as grosze, or null. */
export function queryAmount(q: string): number | null {
  const t = q.replace(/\s/g, '').replace(',', '.').replace(/^[-−+]/, '')
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null
  return Math.round(Number(t) * 100)
}

export interface FilterContext {
  categories: CategoryIndex
  accounts: readonly Account[]
  orders: Pick<Orders, 'quietHours'>
}

/**
 * The search's texts, once per record object while the categories and accounts stay (W14: built and folded at every
 * key of the query before); a record changes as a new object, so its text is built anew.
 */
let texts: { categories: CategoryIndex; accounts: readonly Account[]; names: Map<string, string>; byTx: WeakMap<Transaction, string> } | null = null

/** Text the search looks in: counterparty, title, notes, the bank's description, category, account. */
export function searchTextOf(t: Transaction, ctx: FilterContext): string {
  if (!texts || texts.categories !== ctx.categories || texts.accounts !== ctx.accounts)
    texts = { categories: ctx.categories, accounts: ctx.accounts, names: new Map(ctx.accounts.map((a) => [a.id, a.name])), byTx: new WeakMap() }
  let text = texts.byTx.get(t)
  if (text === undefined) {
    const cats = [t.categoryId, ...t.splits.map((s) => s.categoryId)].filter(Boolean).map((id) => ctx.categories.label(id))
    text = fold([t.counterparty, t.title, t.note, t.logNote, t.bank?.description ?? '', ...cats, texts.names.get(t.accountId) ?? ''].join(' \u0001 '))
    texts.byTx.set(t, text)
  }
  return text
}

/** The query as the search uses it – its words and the amount typed, once per query (not per operation). */
let parsed: { q: string; amount: number | null; words: string[] } = { q: '', amount: null, words: [] }
function parsedQuery(q: string) {
  if (parsed.q !== q) parsed = { q, amount: queryAmount(q), words: fold(q).split(/\s+/).filter(Boolean) }
  return parsed
}

export function matchesFilter(t: Transaction, f: OperationsFilter, ctx: FilterContext): boolean {
  if (!inPeriod(t.date, f.period)) return false
  if (f.accounts.length && !f.accounts.includes(t.accountId)) return false
  if (f.kinds.length && !f.kinds.includes(t.kind)) return false
  if (f.categories.length) {
    const ids = t.splits.length ? t.splits.map((s) => s.categoryId) : [t.categoryId]
    const mains = ids.map((id) => ctx.categories.mainOf(id)?.id ?? '')
    if (!mains.some((m) => f.categories.includes(m))) return false
  }
  if (f.marks.length) {
    const marks = marksOf(t, ctx.orders)
    if (!f.marks.every((m) => marks.includes(m))) return false
  }
  const q = f.query.trim()
  if (q) {
    const { amount, words } = parsedQuery(q)
    if (amount != null && Math.abs(t.amount) === amount) return true
    const text = searchTextOf(t, ctx)
    if (!words.every((w) => text.includes(w))) return false
  }
  return true
}

/** Newest first: date, then time (operations without a time – imports – after the timed ones of the day), then entry order. */
export function compareOperations(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  const ta = a.time ?? ''
  const tb = b.time ?? ''
  if (ta !== tb) return ta < tb ? 1 : -1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
  return a.id < b.id ? 1 : -1
}

export interface OperationsSums {
  count: number
  /** Money in: income, withdrawals from XTB, product returns (without own transfers and corrections). */
  inflow: number
  /** Money out: expenses, top-ups of XTB, PIT-38, loans given (without own transfers and corrections). */
  outflow: number
  /** Net costs of the list as the layers count them (`costOf`: without what household members finance and goal spending). */
  costs: number
}

export function sumOperations(rows: readonly Transaction[]): OperationsSums {
  let inflow = 0
  let outflow = 0
  let costs = 0
  for (const t of rows) {
    if (t.kind === 'transfer' || t.kind === 'correction') continue
    if (t.amount > 0) inflow += t.amount
    else outflow += -t.amount
    costs += costOf(t)
  }
  return { count: rows.length, inflow, outflow, costs }
}

/**
 * How an amount is shown (D68): money in green with „+”, expenses neutral with „−”, a product return green; own
 * transfers and loans muted, a correction in the accent (to explain). Red stays for overruns and alarms.
 */
export function amountTone(t: Pick<Transaction, 'kind' | 'amount'>): 'up' | 'plain' | 'muted' | 'accent' {
  if (t.kind === 'correction') return 'accent'
  if (t.kind === 'transfer' || t.kind === 'loan') return 'muted'
  return t.amount > 0 ? 'up' : 'plain'
}
