/**
 * Drilling down the intelligence (1.10.0, F20): the brands one spends at („Namierzone cele” – the money, the visits, the
 * average receipt, the trend, the share of its category, the last visit), a month against its averages and the year
 * before, and a counterparty's year in the operation's editor („Rozpoznanie celu”). Pure.
 */
import type { BrandAliases } from '../import/aliases'
import type { Category } from '../schema/budget'
import type { Transaction } from '../schema/records'
import { brandKeyOf } from '../operationsView'
import { addDays, addMonths, daysBetween } from './dates'
import { spendingByMonth } from './intel'
import { categoryIndex, costOf, sum } from './operations'

/** A purchase of mine at a shop: its own cost (no member's lines, no goal's money), never a fee of the cargo. */
const purchaseCost = (t: Transaction): number => (t.kind === 'expense' && !t.containerId ? costOf(t) : 0)

export interface BrandStat {
  key: string
  /** As its latest operation names it. */
  name: string
  /** Its money in the period (net of refunds), its purchases, the average receipt. */
  total: number
  count: number
  average: number
  /** Its main category (the most of its money); its share of that category's money in the period (%). */
  categoryId: string | null
  share: number | null
  /** Against the period before of the same length (%); null – nothing then. */
  trend: number | null
  last: string
}

/**
 * The brands of the period `from`–`to` (F20 – „Namierzone cele”), the most money first: each brand key (the names merged
 * in the import as one – 1.2.2) with its purchases.
 */
export function brandStats(transactions: readonly Transaction[], categories: readonly Category[], from: string, to: string, aliases?: BrandAliases): BrandStat[] {
  const cats = categoryIndex(categories)
  const days = daysBetween(from, to) + 1
  const prevFrom = addDays(from, -days)
  const stats = new Map<string, { name: string; nameDate: string; total: number; count: number; last: string; byCat: Map<string, number>; before: number }>()
  const catTotals = new Map<string, number>()
  for (const t of transactions) {
    if (t.date < prevFrom || t.date > to) continue
    const cost = purchaseCost(t)
    if (!cost) continue
    // The category's money – every purchase of the period, a brand's or none (cash, a hand-typed one without a name).
    const main = cats.mainOf(t.categoryId)?.id ?? '-'
    if (t.date >= from) catTotals.set(main, (catTotals.get(main) ?? 0) + cost)
    const key = brandKeyOf(t, aliases)
    if (!key) continue
    let s = stats.get(key)
    if (!s) stats.set(key, (s = { name: '', nameDate: '', total: 0, count: 0, last: '', byCat: new Map(), before: 0 }))
    if (t.date < from) {
      s.before += cost
      continue
    }
    s.total += cost
    if (cost > 0) s.count++
    if (t.date >= s.nameDate) {
      s.name = t.counterparty || t.title || key
      s.nameDate = t.date
    }
    if (t.date > s.last) s.last = t.date
    s.byCat.set(main, (s.byCat.get(main) ?? 0) + cost)
  }
  const out: BrandStat[] = []
  for (const [key, s] of stats) {
    if (!s.count || s.total <= 0) continue
    const [categoryId] = [...s.byCat.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null]
    const catTotal = categoryId ? (catTotals.get(categoryId) ?? 0) : 0
    out.push({
      key,
      name: s.name,
      total: s.total,
      count: s.count,
      average: Math.round(s.total / s.count),
      categoryId: categoryId === '-' ? null : (categoryId ?? null),
      share: catTotal > 0 ? Math.round((s.total / catTotal) * 1000) / 10 : null,
      trend: s.before > 0 ? Math.round(((s.total - s.before) / s.before) * 1000) / 10 : null,
      last: s.last
    })
  }
  return out.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}

export interface MonthComparison {
  /** The main category ('-' – none); 'cargo' – the containers' payments. */
  id: string
  value: number
  /** The averages of the 3 and the 12 months before, the same month a year before (null – no history then). */
  avg3: number | null
  avg12: number | null
  yearAgo: number | null
}

/**
 * A month against its averages (F20): each main category's money in `month` beside the average of the 3 and the 12
 * months before it (the months the history covers – `covered`) and the same month a year before.
 */
export function monthComparison(transactions: readonly Transaction[], categories: readonly Category[], month: string, covered: readonly string[]): MonthComparison[] {
  const months = Array.from({ length: 13 }, (_, i) => addMonths(month, i - 12))
  const s = spendingByMonth(transactions, categories, months)
  const have = new Set(covered)
  const avg = (values: number[], n: number): number | null => {
    const picked = months.slice(12 - n, 12).map((m, i) => (have.has(m) ? values[12 - n + i]! : null)).filter((v): v is number => v != null)
    return picked.length ? Math.round(sum(picked) / picked.length) : null
  }
  const yearAgo = (values: number[]) => (have.has(months[0]!) ? values[0]! : null)
  const rows = s.rows.map((r) => ({ id: r.id, value: r.values[12]!, avg3: avg(r.values, 3), avg12: avg(r.values, 12), yearAgo: yearAgo(r.values) }))
  rows.push({ id: 'cargo', value: s.cargo[12]!, avg3: avg(s.cargo, 3), avg12: avg(s.cargo, 12), yearAgo: yearAgo(s.cargo) })
  return rows.filter((r) => r.value || r.avg3 || r.avg12 || r.yearAgo).sort((a, b) => b.value - a.value)
}

/** Over the average by this share counts as over (the comparison's accent – F20: colour only for the overruns). */
export const OVER_SHARE = 0.1

/** Above the average (or the year before) by more than 10%. */
export const isOver = (value: number, base: number | null): boolean => base != null && base > 0 && value > base * (1 + OVER_SHARE)

export interface BrandYear {
  year: string
  count: number
  total: number
  average: number
}

/** Each brand's purchases by year: the editor's line counted once per list of operations, not per operation shown. */
export type BrandYears = Map<string, Map<string, { count: number; total: number }>>

export function brandYears(transactions: readonly Transaction[], aliases?: BrandAliases): BrandYears {
  const out: BrandYears = new Map()
  for (const x of transactions) {
    const cost = purchaseCost(x)
    if (!cost) continue
    const key = brandKeyOf(x, aliases)
    if (!key) continue
    let years = out.get(key)
    if (!years) out.set(key, (years = new Map()))
    const year = x.date.slice(0, 4)
    let y = years.get(year)
    if (!y) years.set(year, (y = { count: 0, total: 0 }))
    y.total += cost
    if (cost > 0) y.count++
  }
  return out
}

/**
 * The counterparty's year in the operation's editor (F20): „u tego kontrahenta w 2026: 34 operacje, 1 240 zł, średnio
 * 36 zł” – its brand's purchases of the operation's year; null – none but this one.
 */
export function brandYearOf(index: BrandYears, t: Transaction, aliases?: BrandAliases): BrandYear | null {
  const key = brandKeyOf(t, aliases)
  if (!key) return null
  const year = t.date.slice(0, 4)
  const y = index.get(key)?.get(year)
  if (!y || y.count < 2) return null
  return { year, count: y.count, total: y.total, average: Math.round(y.total / y.count) }
}
