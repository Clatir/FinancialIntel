/**
 * The radar of anomalies (1.9.0, F31 – „Nieznany sygnał na radarze”): after each import and entry, the recent expenses
 * looked at against the history – an amount well above the usual at that brand, a category far above its average in the
 * month, a new payee from the log's threshold, two charges from the bank of one brand and amount on one day or the next
 * (a possible double charge – only to check, never merged). „To w porządku” is remembered (`settings.anomalies.ok`).
 * Pure; the briefing, the inbox and Operacje (the mark „nietypowa”) read it.
 */
import type { Orders } from '../schema/budget'
import type { Transaction } from '../schema/records'
import type { BrandAliases } from '../import/aliases'
import { brandKeyOf } from '../operationsView'
import { addDays, addMonths, daysBetween, firstDayOf, monthOf } from './dates'
import type { CategoryIndex } from './operations'
import { monthSpending, percentile, transactionsOfMonth } from './plan'
import { dm } from '../format'

/** The days of operations looked at (older ones were seen already). */
export const ANOMALY_DAYS = 60
/** An expense this many times over the brand's 90th percentile of the year before is unusual (F31 a). */
export const BRAND_FACTOR = 1.5
/** The brand's purchases a year before needed for its usual amount. */
export const BRAND_MIN_HISTORY = 5
/** A category this many times over its average of the 3 months before (F31 b), from this average on. */
export const CATEGORY_FACTOR = 2
export const CATEGORY_MIN_AVERAGE = 50_00
/** A new payee counts only with this much history before it (the first import has only new ones). */
export const NEW_PAYEE_HISTORY_DAYS = 90

export type AnomalyKind = 'brand' | 'category' | 'new' | 'double'

export interface Anomaly {
  kind: AnomalyKind
  /** The key „to w porządku” remembers. */
  key: string
  /** The operations it is about: one, two for a double charge, none for a category. */
  txIds: string[]
  /** Its day: the operation's (the later of two), a category's – the month's latest of it. */
  date: string
  /** The amount (grosze, positive): the purchase, a category's spending in the month. */
  amount: number
  /** What is usual: the brand's 90th percentile, the category's average; null – none (a new payee, a double charge). */
  usual: number | null
  /** Who or what: the counterparty, the category's id. */
  name: string
  categoryId?: string
}

export interface AnomalyInput {
  transactions: readonly Transaction[]
  today: string
  categories: CategoryIndex
  orders: Pick<Orders, 'impulseThreshold'>
  /** Anomalies said „w porządku” to (`settings.anomalies.ok`). */
  ok?: ReadonlySet<string>
  /** Names merged in the import (1.2.2): one brand. */
  aliases?: BrandAliases
  /** The containers' ids: their payments are the cargo's (watched by the hold – F9), no shop's. */
  containerIds?: ReadonlySet<string>
}

/** An expense of mine to look at: a purchase (no member's whole purchase, no payment of a goal), its cost positive. */
const isPurchase = (t: Transaction) => t.kind === 'expense' && t.amount < 0 && !t.goalId && !t.memberId


const pairKey = (a: Transaction, b: Transaction) => (a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`)

export function anomalies(o: AnomalyInput): Anomaly[] {
  const from = addDays(o.today, -ANOMALY_DAYS)
  const ok = o.ok ?? new Set<string>()
  const cargo = o.containerIds ?? new Set<string>()
  const out: Anomaly[] = []
  // The brands: their purchases and their first day ever (any expense).
  const byBrand = new Map<string, Transaction[]>()
  const firstSeen = new Map<string, string>()
  let historyFrom: string | null = null
  for (const t of o.transactions) {
    if (!historyFrom || t.date < historyFrom) historyFrom = t.date
    if (t.kind !== 'expense' || t.date > o.today) continue
    const key = brandKeyOf(t, o.aliases)
    if (!key) continue
    const seen = firstSeen.get(key)
    if (!seen || t.date < seen) firstSeen.set(key, t.date)
    if (!isPurchase(t)) continue
    const list = byBrand.get(key)
    if (list) list.push(t)
    else byBrand.set(key, [t])
  }
  const name = (t: Transaction) => t.counterparty || t.title || 'operacja'
  for (const [key, list] of byBrand) {
    list.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    for (let i = 0; i < list.length; i++) {
      const t = list[i]!
      if (t.date < from) continue
      const cost = -t.amount
      // (a) Well above the usual at the brand: its purchases of the year before.
      if (!cargo.has(t.containerId ?? '')) {
        const yearFrom = addDays(t.date, -365)
        const before = list.slice(0, i).filter((x) => x.date >= yearFrom && x.date < t.date).map((x) => -x.amount)
        const usual = before.length >= BRAND_MIN_HISTORY ? percentile(before, 0.9) : null
        if (usual != null && cost > usual * BRAND_FACTOR) out.push({ kind: 'brand', key: `brand:${t.id}`, txIds: [t.id], date: t.date, amount: cost, usual, name: name(t) })
        // (c) A new payee from the log's threshold – with a history of 90 days before it (not the first import's).
        const threshold = o.orders.impulseThreshold
        if (threshold > 0 && cost >= threshold && firstSeen.get(key) === t.date && historyFrom != null && historyFrom <= addDays(t.date, -NEW_PAYEE_HISTORY_DAYS) && list.findIndex((x) => x.date === t.date) === i)
          out.push({ kind: 'new', key: `new:${t.id}`, txIds: [t.id], date: t.date, amount: cost, usual: null, name: name(t) })
      }
      // (d) Two charges from the bank of one brand and amount, the same day or the next: a possible double charge.
      if (!t.bank || t.bank.pending) continue
      for (let j = i + 1; j < list.length; j++) {
        const u = list[j]!
        if (daysBetween(t.date, u.date) > 1) break
        if (!u.bank || u.bank.pending || u.amount !== t.amount) continue
        out.push({ kind: 'double', key: `double:${pairKey(t, u)}`, txIds: [t.id, u.id], date: u.date, amount: cost, usual: null, name: name(t) })
      }
    }
  }
  // (b) A category far above its average of the 3 months before – this month's spending (the cargo's aside).
  const month = monthOf(o.today)
  const now = monthSpending(transactionsOfMonth(o.transactions, month), o.categories, cargo).spent
  const before = [1, 2, 3].map((n) => monthSpending(transactionsOfMonth(o.transactions, addMonths(month, -n)), o.categories, cargo).spent)
  // Only with the 3 months seen (the history starting before them).
  if (historyFrom && historyFrom <= firstDayOf(addMonths(month, -3)))
    for (const [categoryId, spent] of now) {
      const average = Math.round(before.reduce((s, m) => s + (m.get(categoryId) ?? 0), 0) / 3)
      if (average < CATEGORY_MIN_AVERAGE || spent <= average * CATEGORY_FACTOR) continue
      out.push({ kind: 'category', key: `category:${categoryId}:${month}`, txIds: [], date: o.today, amount: spent, usual: average, name: o.categories.label(categoryId), categoryId })
    }
  return out.filter((a) => !ok.has(a.key)).sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key))
}

/** The operations an anomaly is about (the mark „nietypowa” in Operacje). */
export const anomalousIds = (list: readonly Anomaly[]): Set<string> => new Set(list.flatMap((a) => a.txIds))


/** An anomaly in words (F31). */
export function anomalyText(a: Anomaly, zl: (grosze: number) => string): string {
  switch (a.kind) {
    case 'brand':
      return `${a.name} ${zl(a.amount)} (${dm(a.date)}) – zwykle do ${zl(a.usual ?? 0)}.`
    case 'new':
      return `Nowy kontrahent: ${a.name} ${zl(a.amount)} (${dm(a.date)}).`
    case 'double':
      return `Dwa obciążenia z banku: ${a.name} ${zl(a.amount)} – możliwe podwójne pobranie (sprawdź; nie są łączone).`
    case 'category': {
      const ratio = a.usual ? (a.amount / a.usual).toFixed(1).replace('.', ',') : '—'
      return `${a.name}: ${zl(a.amount)} w tym miesiącu – ${ratio}× średniej z 3 miesięcy (${zl(a.usual ?? 0)}).`
    }
  }
}
