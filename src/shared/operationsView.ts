/**
 * The operations list (stage E1): filters, search, order, sums and how an amount is shown. Pure – the screen and the
 * tests share it.
 */
import type { Account, OperationView, Orders } from './schema/budget'
import { TX_KINDS, type Transaction, type TxKind } from './schema/records'
import { asksImpulse, costOf, financedOf, isNight, isTwoSided, partsOf, touchesAccount, type CategoryIndex, type Part } from './calc/operations'
import { incomeShares } from './calc/household'
import type { BrandAliases } from './import/aliases'
import { ruleTargetOf } from './import/classify'
import { fold } from './fold'
import { hasTag, tagsOf } from './calc/tags'

/** Marks of an operation (spec, „Ekrany”: finansuje domownik – D80, plan lub impuls, noc) and of its origin. */
export const OPERATION_MARKS = ['refundable', 'impulse', 'plan', 'night', 'split', 'uncategorized', 'bank', 'pending', 'manual', 'anomaly', 'awaiting'] as const
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
  manual: 'wpisana ręcznie',
  anomaly: 'nietypowa',
  awaiting: 'czeka na zwrot'
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
  manual: 'origin',
  anomaly: 'anomaly',
  awaiting: 'awaiting'
}

/** What the marks read beyond the operation (1.9.0): the radar of anomalies (F31), the returns on the way (F34). */
export interface MarkFlags {
  anomalies?: ReadonlySet<string>
  awaiting?: ReadonlySet<string>
}

export function marksOf(t: Transaction, orders: Pick<Orders, 'quietHours'>, flags: MarkFlags = {}): OperationMark[] {
  const out: OperationMark[] = []
  // As the money counts it (B78): a line a member finances – a receipt's part, its rest, or the operation itself.
  if (partsOf(t).some((p) => p.refundable)) out.push('refundable')
  if (t.impulse) out.push(t.impulse)
  if (isNight(t, orders)) out.push('night')
  if (t.splits.length) out.push('split')
  if (isUncategorized(t)) out.push('uncategorized')
  if (t.bank) out.push(t.bank.pending ? 'pending' : 'bank')
  else out.push('manual')
  if (flags.anomalies?.has(t.id)) out.push('anomaly')
  if (flags.awaiting?.has(t.id)) out.push('awaiting')
  return out
}

/** The captain's log still waits for an answer: a purchase from the threshold without „plan / impuls”. */
export const needsLog = (t: Transaction, orders: Pick<Orders, 'impulseThreshold'>) => asksImpulse(t, orders) && !t.impulse

export type PeriodFilter = { kind: 'month'; month: string } | { kind: 'all' } | { kind: 'range'; from: string | null; to: string | null }

/** The list's order (F18): newest first, the biggest amounts first, the counterparties A–Z. */
export const OPERATION_SORTS = ['date', 'amount', 'counterparty'] as const
export type OperationSort = (typeof OPERATION_SORTS)[number]
export const SORT_LABEL: Record<OperationSort, string> = { date: 'data – najnowsze', amount: 'kwota – największe', counterparty: 'kontrahent A–Z' }

export interface OperationsFilter {
  period: PeriodFilter
  accounts: string[]
  kinds: TxKind[]
  /** Category ids – a main one takes its subcategories (F18: a subcategory alone); '' = without a category. */
  categories: string[]
  marks: OperationMark[]
  query: string
  /** The amount (either sign) from / to, grosze (F18); null – no bound. */
  amountMin: number | null
  amountMax: number | null
  /** Household members (F18): who finances a purchase, whose money an income is. */
  members: string[]
  /** Counterparties by their brand – the key the import remembers them by (F18, `brandKeyOf`). */
  brands: string[]
  containers: string[]
  goals: string[]
  loans: string[]
  /** The other account of a transfer (F18); '' – an account outside the budget. */
  transferAccounts: string[]
  /** Tags (F17), by their key (`tagKey`): the operation's own or a line's of its receipt. */
  tags: string[]
  sort: OperationSort
}

export const emptyFilter = (month: string): OperationsFilter => ({
  period: { kind: 'month', month },
  accounts: [],
  kinds: [],
  categories: [],
  marks: [],
  query: '',
  amountMin: null,
  amountMax: null,
  members: [],
  brands: [],
  containers: [],
  goals: [],
  loans: [],
  transferAccounts: [],
  tags: [],
  sort: 'date'
})

/** The lists of the filter a choice narrows (the period, the search, the amounts and the order apart). */
export const LIST_KEYS = ['accounts', 'kinds', 'categories', 'marks', 'members', 'brands', 'containers', 'goals', 'loans', 'transferAccounts', 'tags'] as const satisfies ReadonlyArray<keyof OperationsFilter>

type Narrowing = Pick<OperationsFilter, (typeof LIST_KEYS)[number] | 'query' | 'amountMin' | 'amountMax'>

/**
 * Every part of the filter that can hide an operation – F18's too (the amounts, the brands, the members…): a view that
 * must show one (a jump to an operation, a new entry, the inbox – B77, B88) clears them; the period and the order are
 * the caller's.
 */
export const noNarrowing = (): Narrowing => ({
  accounts: [],
  kinds: [],
  categories: [],
  marks: [],
  members: [],
  brands: [],
  containers: [],
  goals: [],
  loans: [],
  transferAccounts: [],
  tags: [],
  query: '',
  amountMin: null,
  amountMax: null
})

/** Does the filter hide anything beyond its period (`noNarrowing`)? */
export const narrows = (f: OperationsFilter): boolean => LIST_KEYS.some((k) => f[k].length > 0) || !!f.query.trim() || f.amountMin != null || f.amountMax != null

const isMonth = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const strings = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length <= 200))] : [])
const grosze = (v: unknown): number | null => (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null)

/** A period as written (a saved view, this computer's storage), or null when it is none. */
export function periodOf(v: unknown): PeriodFilter | null {
  if (!v || typeof v !== 'object') return null
  const p = v as Record<string, unknown>
  if (p.kind === 'all') return { kind: 'all' }
  if (p.kind === 'month' && isMonth(p.month)) return { kind: 'month', month: p.month }
  if (p.kind === 'range') return { kind: 'range', from: isDay(p.from) ? p.from : null, to: isDay(p.to) ? p.to : null }
  return null
}

/**
 * A filter as written (F18: a saved view in fi.json – another computer, a newer version, a hand edit –, this computer's
 * storage): every known field checked, a value this version does not know left out (a mark, a kind, an order).
 */
export function filterOf(raw: unknown, month: string): OperationsFilter {
  const f = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const min = grosze(f.amountMin)
  const max = grosze(f.amountMax)
  return {
    period: periodOf(f.period) ?? { kind: 'month', month },
    accounts: strings(f.accounts),
    kinds: strings(f.kinds).filter((k): k is TxKind => (TX_KINDS as readonly string[]).includes(k)),
    categories: strings(f.categories),
    marks: strings(f.marks).filter((m): m is OperationMark => (OPERATION_MARKS as readonly string[]).includes(m)),
    query: typeof f.query === 'string' ? f.query.slice(0, 200) : '',
    amountMin: min,
    // An upper bound below the lower one would hide everything: none then.
    amountMax: max != null && min != null && max < min ? null : max,
    members: strings(f.members),
    brands: strings(f.brands),
    containers: strings(f.containers),
    goals: strings(f.goals),
    loans: strings(f.loans),
    transferAccounts: strings(f.transferAccounts),
    tags: strings(f.tags),
    sort: (OPERATION_SORTS as readonly unknown[]).includes(f.sort) ? (f.sort as OperationSort) : 'date'
  }
}

/** What a saved view keeps of the list's filter (F18): all of it – the period with it only when asked. */
export function viewFilter(f: OperationsFilter, withPeriod: boolean): Record<string, unknown> {
  const { period, ...rest } = f
  return withPeriod ? { ...rest, period } : rest
}

/** Is the list showing this view now (its chip marked): the same filter, the period too when the view keeps one. */
export function showsView(f: OperationsFilter, view: Pick<OperationView, 'filter' | 'withPeriod'>, month: string): boolean {
  const v = filterOf(view.filter, month)
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const set = (xs: readonly string[]) => [...xs].sort()
  if (view.withPeriod && !same(v.period, f.period)) return false
  return (
    LIST_KEYS.every((k) => same(set(v[k]), set(f[k]))) &&
    v.query.trim() === f.query.trim() &&
    v.amountMin === f.amountMin &&
    v.amountMax === f.amountMax &&
    v.sort === f.sort
  )
}

/** Household members in an operation (F18): who finances a purchase (its lines too), whose money an income is (D80, D81). */
export function membersIn(t: Transaction): string[] {
  if (t.kind === 'income') return [...new Set(incomeShares(t).flatMap((x) => (x.memberId ? [x.memberId] : [])))]
  if (t.kind === 'expense') return [...financedOf(t).keys()]
  return t.memberId ? [t.memberId] : []
}

/** The counterparty as the import reads it (its brand – merged names, 1.2.2, too). */
export const brandTargetOf = (t: Transaction, aliases?: BrandAliases) =>
  ruleTargetOf({ counterparty: t.bank ? t.bank.counterparty : t.counterparty, title: t.title, operation: t.bank?.operation, bankName: t.bank?.bankName }, aliases)

/** The counterparty's brand – the key the import remembers it by. */
export const brandKeyOf = (t: Transaction, aliases?: BrandAliases): string => brandTargetOf(t, aliases).brand.key

/** The accounts of the budget a transfer goes to or comes from (F18: „konto przelewu”); '' – one outside the budget. */
function transferAccountsOf(t: Transaction): string[] {
  if (t.kind !== 'transfer') return []
  if (!t.counterAccountId) return ['']
  return isTwoSided(t) ? [t.counterAccountId, t.accountId] : [t.counterAccountId]
}

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
  /** Names merged in the import (1.2.2): the brands of the filter by them. */
  aliases?: BrandAliases
  /** The marks „nietypowa” and „czeka na zwrot” (F31, F34). */
  flags?: MarkFlags
}

/**
 * The search's texts, once per record object while the categories and accounts stay (W14: built and folded at every
 * key of the query before); a record changes as a new object, so its text is built anew.
 */
let texts: { categories: CategoryIndex; accounts: readonly Account[]; names: Map<string, string>; byTx: WeakMap<Transaction, string> } | null = null

/** Text the search looks in: counterparty, title, notes, the bank's description, category, account, tags (F17). */
export function searchTextOf(t: Transaction, ctx: FilterContext): string {
  if (!texts || texts.categories !== ctx.categories || texts.accounts !== ctx.accounts)
    texts = { categories: ctx.categories, accounts: ctx.accounts, names: new Map(ctx.accounts.map((a) => [a.id, a.name])), byTx: new WeakMap() }
  let text = texts.byTx.get(t)
  if (text === undefined) {
    const cats = [t.categoryId, ...t.splits.map((s) => s.categoryId)].filter(Boolean).map((id) => ctx.categories.label(id))
    const other = isTwoSided(t) ? (texts.names.get(t.counterAccountId!) ?? '') : ''
    const tags = [...tagsOf(t), ...t.splits.flatMap((x) => x.tags ?? [])].map((x) => `#${x}`)
    text = fold([t.counterparty, t.title, t.note, t.logNote, t.bank?.description ?? '', ...cats, texts.names.get(t.accountId) ?? '', other, ...tags].join(' \u0001 '))
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
  // A transfer in one operation (F10): on both of its accounts.
  if (f.accounts.length && !f.accounts.some((a) => touchesAccount(t, a))) return false
  if (f.kinds.length && !f.kinds.includes(t.kind)) return false
  if (f.categories.length) {
    // The lines as the budget counts them (B76: a receipt's rest in the operation's category); „bez kategorii” = an
    // expense to categorize, as its mark (N50). A main category takes its subcategories, a subcategory itself (F18).
    const ids = partsOf(t).flatMap((p) => (p.categoryId ? [p.categoryId, ctx.categories.mainOf(p.categoryId)?.id ?? p.categoryId] : []))
    if (!f.categories.some((c) => (c === '' ? isUncategorized(t) : ids.includes(c)))) return false
  }
  // F18: the amount, the members, the counterparty's brand, what the operation is linked to.
  const abs = Math.abs(t.amount)
  if ((f.amountMin != null && abs < f.amountMin) || (f.amountMax != null && abs > f.amountMax)) return false
  if (f.members.length && !membersIn(t).some((m) => f.members.includes(m))) return false
  if (f.containers.length && !(t.containerId && f.containers.includes(t.containerId))) return false
  if (f.goals.length && !(t.goalId && f.goals.includes(t.goalId))) return false
  if (f.loans.length && !(t.loanId && f.loans.includes(t.loanId))) return false
  if (f.transferAccounts.length && !transferAccountsOf(t).some((a) => f.transferAccounts.includes(a))) return false
  if (f.brands.length && !f.brands.includes(brandKeyOf(t, ctx.aliases))) return false
  if (f.tags.length && !f.tags.some((k) => hasTag(t, k))) return false
  if (f.marks.length) {
    const marks = marksOf(t, ctx.orders, ctx.flags)
    const groups = new Set(f.marks.map((m) => MARK_GROUP[m]))
    for (const g of groups) if (!f.marks.some((m) => MARK_GROUP[m] === g && marks.includes(m))) return false
  }
  return matchesQuery(t, f.query, ctx)
}

/** The search of Operacje (and of the palette – F19): every word in the texts (no Polish letters), or the amount typed. */
export function matchesQuery(t: Transaction, query: string, ctx: FilterContext): boolean {
  const q = query.trim()
  if (!q) return true
  const { amount, words } = parsedQuery(q)
  if (amount != null && Math.abs(t.amount) === amount) return true
  const text = searchTextOf(t, ctx)
  return words.every((w) => text.includes(w))
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

const nameOf = (t: Transaction): string => (t.counterparty || t.title).trim()

/**
 * The list in its order (F18): newest first (`compareOperations`), the biggest amounts first (either sign – the biggest
 * expenses of a month), the counterparties A–Z (without one – last); ties newest first.
 */
export function sortOperations(rows: Transaction[], sort: OperationSort): Transaction[] {
  if (sort === 'amount') return rows.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || compareOperations(a, b))
  if (sort === 'counterparty') {
    const names = new Map(rows.map((t) => [t, nameOf(t)]))
    return rows.sort((a, b) => {
      const x = names.get(a)!
      const y = names.get(b)!
      if (!x !== !y) return x ? -1 : 1
      return x.localeCompare(y, 'pl', { sensitivity: 'base' }) || compareOperations(a, b)
    })
  }
  return rows.sort(compareOperations)
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
