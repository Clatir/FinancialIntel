/**
 * Where a category is used (AP-9, N-PC-7): „Usuń” in Ustawienia → Kategorie takes only a category nothing refers to –
 * one in use is archived instead (its old records keep it). Pure, from the records and the settings:
 * - operations (their own category) and the lines of split receipts – a draft too; the quick entry's templates are
 *   made of the operations, so they are in;
 * - month plans: an envelope's limit, the loot kept in an envelope (F28), a cover from or to it;
 * - import rules, containers of the cargo, buoys (scheduled), saved views of Operacje (their category filter);
 * - the game's frozen days (a violation of an envelope names its category).
 * A main category is checked with its subcategories (they go with it).
 */
import type { ImportRule, OperationView } from '../schema/budget'
import type { Container, GameMonth, MonthPlan, Scheduled, Transaction } from '../schema/records'

export type CategoryUseKind = 'operations' | 'parts' | 'plans' | 'rules' | 'containers' | 'scheduled' | 'views' | 'game'

export interface CategoryUse {
  kind: CategoryUseKind
  /** How many records (operations, plans, rules…) refer to the category. */
  count: number
}

export interface CategoryUseInput {
  transactions: readonly Transaction[]
  months: readonly MonthPlan[]
  containers: readonly Container[]
  scheduled: readonly Scheduled[]
  game: readonly GameMonth[]
  rules: readonly ImportRule[]
  views: readonly OperationView[]
}

/** The order the uses are told in. */
export const CATEGORY_USE_ORDER: readonly CategoryUseKind[] = ['operations', 'parts', 'plans', 'rules', 'containers', 'scheduled', 'views', 'game']

const inPlan = (p: MonthPlan, ids: ReadonlySet<string>): boolean =>
  Object.keys(p.envelopes).some((k) => ids.has(k)) ||
  Object.keys(p.loot?.envelopes ?? {}).some((k) => ids.has(k)) ||
  (p.envelopeCovers ?? []).some((c) => ids.has(c.from) || ids.has(c.to))

const inView = (v: OperationView, ids: ReadonlySet<string>): boolean => {
  const list = (v.filter as { categories?: unknown }).categories
  return Array.isArray(list) && list.some((x) => typeof x === 'string' && ids.has(x))
}

const inGame = (g: GameMonth, ids: ReadonlySet<string>): boolean => Object.values(g.days).some((d) => d.violations.some((v) => v.ref != null && ids.has(v.ref)))

/** The uses of the categories `ids` (a main one with its subcategories), in `CATEGORY_USE_ORDER`; [] = none – it can go. */
export function categoryUses(ids: ReadonlySet<string>, o: CategoryUseInput): CategoryUse[] {
  const counts = new Map<CategoryUseKind, number>()
  const add = (kind: CategoryUseKind) => counts.set(kind, (counts.get(kind) ?? 0) + 1)
  for (const t of o.transactions) {
    if (t.categoryId && ids.has(t.categoryId)) add('operations')
    else if (t.splits.some((s) => s.categoryId != null && ids.has(s.categoryId))) add('parts')
  }
  for (const p of o.months) if (inPlan(p, ids)) add('plans')
  for (const r of o.rules) if (r.categoryId && ids.has(r.categoryId)) add('rules')
  for (const c of o.containers) if (c.categoryId && ids.has(c.categoryId)) add('containers')
  for (const s of o.scheduled) if (s.categoryId && ids.has(s.categoryId)) add('scheduled')
  for (const v of o.views) if (inView(v, ids)) add('views')
  for (const g of o.game) if (inGame(g, ids)) add('game')
  return CATEGORY_USE_ORDER.flatMap((kind) => {
    const count = counts.get(kind)
    return count ? [{ kind, count }] : []
  })
}
