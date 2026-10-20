/**
 * The personal inflation of the basket (1.10.0, F36, D87 – the CPI of GUS typed by hand, no network): with a salary
 * set by oneself (D11) the energy loses its worth as prices rise – are the costs growing by the prices or by the habits?
 * The categories year on year (the same months), the average receipt at the same brands, the prices of the cargo
 * (its amounts' history – F9) and „Twoja inflacja” weighted by the money of the year before; beside it the hull's
 * target, which grows with the average costs. Pure.
 */
import type { BrandAliases } from '../import/aliases'
import type { Category } from '../schema/budget'
import type { Container, Transaction } from '../schema/records'
import { brandKeyOf } from '../operationsView'
import { addMonths, monthOf } from './dates'
import { activeIn, amountIn, monthlyWeight } from './fleet'
import { monthsBefore } from './history'
import { spendingByMonth } from './intel'
import { costOf, sum } from './operations'
import { costsByMonth } from './plan'

/** A brand's average receipt counts with this many purchases in both years. */
export const INFLATION_MIN_PURCHASES = 3

export interface PriceItem {
  kind: 'brand' | 'container'
  key: string
  name: string
  /** The year before and now: a brand's average receipt, a container's amount. */
  before: number
  now: number
  /** The change in % (one decimal). */
  change: number
  /** Its money in the compared months of the year before (the weight of „Twoja inflacja”). */
  weight: number
}

export interface InflationReport {
  /** The months compared: each month of the last 12 with the same month a year before, both seen by the history. */
  months: string[]
  categories: Array<{ id: string; before: number; now: number; change: number | null }>
  /** The brands' average receipts and the containers' prices, the largest change first. */
  brands: PriceItem[]
  containers: PriceItem[]
  /** „Twoja inflacja”: the changes weighted by the money of the year before; null – nothing to compare. */
  personal: number | null
  /** The latest CPI typed (F36): its month and value. */
  cpi: { month: string; value: number } | null
  /** The hull's target from the average costs a year ago and now (`hullMonths` × the 12 months' average). */
  hull: { before: number | null; now: number | null; change: number | null }
}

const change = (before: number, now: number): number | null => (before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null)

export interface InflationInput {
  transactions: readonly Transaction[]
  categories: readonly Category[]
  containers: readonly Container[]
  /** The month running: the 12 full months before it against the 12 before them. */
  month: string
  /** The months the history covers (`calc/history.ts`). */
  covered: readonly string[]
  cpi?: Readonly<Record<string, number>>
  hullMonths: number
  aliases?: BrandAliases
}

export function personalInflation(o: InflationInput): InflationReport {
  const have = new Set(o.covered)
  // Each of the last 12 full months with its month a year before – both seen by the history.
  const months = Array.from({ length: 12 }, (_, i) => addMonths(o.month, i - 12)).filter((m) => have.has(m) && have.has(addMonths(m, -12)))
  const now = new Set(months)
  const before = new Set(months.map((m) => addMonths(m, -12)))

  // The categories, the same months.
  const spendNow = spendingByMonth(o.transactions, o.categories, months)
  const spendBefore = spendingByMonth(
    o.transactions,
    o.categories,
    months.map((m) => addMonths(m, -12))
  )
  const ids = new Set([...spendNow.rows, ...spendBefore.rows].map((r) => r.id))
  const totalOf = (rows: ReadonlyArray<{ id: string; total: number }>, id: string) => rows.find((r) => r.id === id)?.total ?? 0
  const categories = [...ids]
    .map((id) => {
      const b = totalOf(spendBefore.rows, id)
      const n = totalOf(spendNow.rows, id)
      return { id, before: b, now: n, change: change(b, n) }
    })
    .filter((c) => c.before > 0 || c.now > 0)
    .sort((a, b) => b.now - a.now)

  // The brands: the average receipt of the same brands in both years.
  const byBrand = new Map<string, { name: string; nb: number; cb: number; nn: number; cn: number }>()
  for (const t of o.transactions) {
    if (t.kind !== 'expense' || t.containerId) continue
    const m = monthOf(t.date)
    const inNow = now.has(m)
    if (!inNow && !before.has(m)) continue
    const cost = costOf(t)
    if (cost <= 0) continue
    const key = brandKeyOf(t, o.aliases)
    if (!key) continue
    const b = byBrand.get(key) ?? { name: t.counterparty || t.title || key, nb: 0, cb: 0, nn: 0, cn: 0 }
    if (inNow) {
      b.nn += cost
      b.cn++
      b.name = t.counterparty || t.title || b.name
    } else {
      b.nb += cost
      b.cb++
    }
    byBrand.set(key, b)
  }
  const brands: PriceItem[] = []
  for (const [key, b] of byBrand) {
    if (b.cb < INFLATION_MIN_PURCHASES || b.cn < INFLATION_MIN_PURCHASES) continue
    const avgBefore = Math.round(b.nb / b.cb)
    const avgNow = Math.round(b.nn / b.cn)
    const c = change(avgBefore, avgNow)
    if (c == null) continue
    brands.push({ kind: 'brand', key, name: b.name, before: avgBefore, now: avgNow, change: c, weight: b.nb })
  }
  brands.sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || b.weight - a.weight)

  // The cargo: each container's price a year ago and now (its amounts' history – F9).
  const last = addMonths(o.month, -1)
  const yearAgo = addMonths(last, -12)
  const containers: PriceItem[] = []
  for (const c of o.containers) {
    if (c.archived || c.loanId || !activeIn(c, last) || !activeIn(c, yearAgo)) continue
    const b = amountIn(c, yearAgo)
    const n = amountIn(c, last)
    const ch = change(b, n)
    if (ch == null) continue
    // Its money of the year before over the compared months – the brands' weights are of those months too.
    containers.push({ kind: 'container', key: c.id, name: c.name, before: b, now: n, change: ch, weight: monthlyWeight(c, yearAgo) * months.length })
  }
  containers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || b.weight - a.weight)

  // „Twoja inflacja”: the prices' changes weighted by the money of the year before.
  const items = [...brands, ...containers]
  const weight = sum(items.map((i) => i.weight))
  const personal = weight > 0 ? Math.round((sum(items.map((i) => i.change * i.weight)) / weight) * 10) / 10 : null

  const cpiMonths = Object.keys(o.cpi ?? {}).sort()
  const cpiMonth = cpiMonths[cpiMonths.length - 1]
  const cpi = cpiMonth ? { month: cpiMonth, value: o.cpi![cpiMonth]! } : null

  // The hull's target: the average costs of the 12 covered months before the month, a year ago and now.
  const costs = costsByMonth(o.transactions)
  const targetAt = (m: string): number | null => {
    const window = monthsBefore(o.covered, m, 12)
    if (window.length < 3) return null
    return o.hullMonths * Math.round(sum(window.map((x) => costs.get(x) ?? 0)) / window.length)
  }
  const hullNow = targetAt(o.month)
  const hullBefore = targetAt(addMonths(o.month, -12))
  return {
    months,
    categories,
    brands,
    containers,
    personal,
    cpi,
    hull: { before: hullBefore, now: hullNow, change: hullBefore != null && hullNow != null ? change(hullBefore, hullNow) : null }
  }
}

/** The CPI as typed (F36): „4,9” → 4.9, „-0,5 %” → −0.5; '' → null (taken off); anything else (or beyond −50…200) → undefined. */
export function parseCpi(text: string): number | null | undefined {
  const t = text.trim().replace(',', '.').replace(/\s*%$/, '')
  if (!t) return null
  if (!/^-?\d{1,3}(\.\d{1,2})?$/.test(t)) return undefined
  const v = Number(t)
  return v >= -50 && v <= 200 ? v : undefined
}
