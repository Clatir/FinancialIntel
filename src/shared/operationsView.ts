/**
 * The operations list (stage E1): filters, search, order, sums and how an amount is shown. Pure – the screen and the
 * tests share it.
 */
import type { Account, Orders } from './schema/budget'
import type { Transaction, TxKind } from './schema/records'
import { asksImpulse, costOf, isNight, partsOf, type CategoryIndex, type Part } from './calc/operations'
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

const waitsForCategory = (t: Transaction, p: Part): boolean => !p.categoryId && !p.refundable && (p.amount !== 0 || !t.splits.length)

/**
 * An expense to categorize (the mark „bez kategorii”, the filter „bez kategorii”, F6's inbox – one meaning, N50): a line
 * of mine without a category – the operation's own or a receipt's part (`partsOf`); a member's purchase is theirs, and a
 * payment of a container or one paid from a goal has its place in the budget (no energy, no envelope). A receipt's line
 * of 0 zł (one „Podziel paragon” adds, left empty) has nothing to categorize.
 */
export const isUncategorized = (t: Transaction): boolean => t.kind === 'expense' && !t.containerId && !t.goalId && partsOf(t).some((p) => waitsForCategory(t, p))

/** What of an expense waits for a category (grosze, as the operation's sign): its lines of mine without one. */
export function uncategorizedAmount(t: Transaction): number {
  if (!isUncategorized(t)) return 0
  let out = 0
  for (const p of partsOf(t)) if (waitsForCategory(t, p)) out += p.amount
  return out
}

/**
 * Marks that exclude one another (N51): where an operation comes from, the captain's log's answer. A filter of several
 * marks of one group shows any of them; of several groups – all the groups at once.
 */
const MARK_GROUP: Record<OperationMark, string> = {
  refundable: 'refundable',
  impulse: 'log',
  plan: 'log',
  night: 'night',
  split: 'split',
  uncategorized: 'uncategorized',
  bank: 'origin',
  pending: 'origin',
  manual: 'origin'
}

export function marksOf(t: Transaction, orders: Pick<Orders, 'quietHours'>): OperationMark[] {
  const out: OperationMark[] = []
  // As the money counts it (B78): a line a member finances – a receipt's part, its rest, or the operation itself.
  if (partsOf(t).some((p) => p.refundable)) out.push('refundable')
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
    // The lines as the budget counts them (B76: a receipt's rest in the operation's category); „bez kategorii” = an
    // expense to categorize, as its mark (N50).
    const mains = partsOf(t).map((p) => (p.categoryId ? (ctx.categories.mainOf(p.categoryId)?.id ?? p.categoryId) : null))
    if (!f.categories.some((c) => (c === '' ? isUncategorized(t) : mains.includes(c)))) return false
  }
  if (f.marks.length) {
    const marks = marksOf(t, ctx.orders)
    const groups = new Set(f.marks.map((m) => MARK_GROUP[m]))
    for (const g of groups) if (!f.marks.some((m) => MARK_GROUP[m] === g && marks.includes(m))) return false
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
 * The `n` newest operations – the latest date first, then the latest entry – in one pass (W29): the bridge's list of
 * 10 without a sort of the whole history every minute. Ties keep the list's order, as a stable sort would.
 */
export function newestOperations<T extends Pick<Transaction, 'date' | 'createdAt'>>(list: readonly T[], n: number): T[] {
  if (n <= 0) return []
  const top: T[] = []
  const newer = (a: T, b: T) => a.date > b.date || (a.date === b.date && a.createdAt > b.createdAt)
  for (const t of list) {
    if (top.length === n && !newer(t, top[n - 1]!)) continue
    let i = top.length
    while (i > 0 && newer(t, top[i - 1]!)) i--
    top.splice(i, 0, t)
    if (top.length > n) top.pop()
  }
  return top
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
