/**
 * The officer's category for a counterparty (1.5.1, F8, T168): what the budget knows of its brand – a chain in every
 * town and shop is one key („Biedronka” typed = „BIEDRONKA 1234 WARSZAWA” of the bank), the user's merged names too:
 * 1. the category used last with the brand (operations typed or imported),
 * 2. the user's rule of the import for it (exact, contains, keyword),
 * 3. the chain dictionary's category.
 */
import type { BrandAliases } from './aliases'
import { findRule, ruleTargetOf } from './classify'
import { defaultCategoryId, type ImportRule, type Transaction } from '../schema'

export interface OfficerData {
  /** The category used last with each brand key (and each name's key), expenses only. */
  lastByBrand: Record<string, string>
  /** The counterparties used most of late, one per brand: the chain's name, else the latest one used. */
  counterparties: string[]
}

/** The latest operations the officer reads (W15: a cap, the newest first). */
const READ = 2000

type Target = ReturnType<typeof ruleTargetOf>
/** Each operation's brand, read once per version of it and of the merged names (records are never changed in place). */
const targets = new WeakMap<object, { aliases: BrandAliases; value: Target }>()

/** What an operation's brand is looked up by: the bank's name of it (the import reads its rows so), else its own. */
export function officerTarget(t: Pick<Transaction, 'bank' | 'counterparty' | 'title'>, aliases: BrandAliases): Target {
  const hit = targets.get(t)
  if (hit?.aliases === aliases) return hit.value
  const value = ruleTargetOf({ counterparty: t.bank ? t.bank.counterparty : t.counterparty, title: t.title, operation: t.bank?.operation, bankName: t.bank?.bankName }, aliases)
  targets.set(t, { aliases, value })
  return value
}

/** The newest `n` of `xs` by day, then creation – one pass for the day they start from, a sort of those only (150k folders). */
function newest(xs: readonly Transaction[], n: number): Transaction[] {
  const perDay = new Map<string, number>()
  for (const t of xs) perDay.set(t.date, (perDay.get(t.date) ?? 0) + 1)
  let from = ''
  let count = 0
  for (const day of [...perDay.keys()].sort().reverse()) {
    from = day
    count += perDay.get(day)!
    if (count >= n) break
  }
  return xs
    .filter((t) => t.date >= from)
    .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, n)
}

export function officerData(transactions: readonly Transaction[], aliases: BrandAliases): OfficerData {
  const txs = newest(
    transactions.filter((t) => t.kind === 'expense' && (t.counterparty.trim() || t.bank?.counterparty)),
    READ
  )
  const lastByBrand: Record<string, string> = {}
  const uses = new Map<string, { name: string; n: number }>()
  for (const t of txs) {
    const { target, brand } = officerTarget(t, aliases)
    if (!target.brand && !target.key) continue
    if (t.categoryId) for (const k of [target.brand, target.key]) if (k && !lastByBrand[k]) lastByBrand[k] = t.categoryId
    const key = target.brand || target.key
    const u = uses.get(key)
    if (u) u.n++
    else uses.set(key, { name: brand.brand?.label ?? t.counterparty.trim(), n: 1 })
  }
  return {
    lastByBrand,
    counterparties: [...uses.values()]
      .filter((u) => u.name)
      .sort((a, b) => b.n - a.n)
      .slice(0, 40)
      .map((u) => u.name)
  }
}

export type OfficerSource = 'history' | 'rule' | 'chain'
export const OFFICER_SOURCE_LABEL: Record<OfficerSource, string> = { history: 'ostatnio u tej marki', rule: 'reguła importu', chain: 'sieć ze słownika' }

/**
 * The category for an expense of `o` (a name typed, or an operation's bank data); `usable` = a category the screen
 * offers (not archived). null = the officer knows nothing.
 */
export function officerHint(
  o: { counterparty: string; title?: string; operation?: string; bankName?: string },
  data: Pick<OfficerData, 'lastByBrand'>,
  ctx: { rules: readonly ImportRule[]; aliases: BrandAliases; usable: (categoryId: string) => boolean }
): { categoryId: string; source: OfficerSource } | null {
  if (!o.counterparty.trim() && !o.operation) return null
  const { target, brand } = ruleTargetOf({ counterparty: o.counterparty.trim(), title: o.title ?? '', operation: o.operation, bankName: o.bankName }, ctx.aliases)
  for (const k of [target.brand, target.key]) {
    const last = k ? data.lastByBrand[k] : undefined
    if (last && ctx.usable(last)) return { categoryId: last, source: 'history' }
  }
  const rule = findRule(ctx.rules, target, 'out')
  if (rule?.kind === 'expense' && rule.categoryId && ctx.usable(rule.categoryId)) return { categoryId: rule.categoryId, source: 'rule' }
  const place = brand.brand?.category
  const chain = place ? defaultCategoryId(place[0], place[1]) : null
  if (chain && ctx.usable(chain)) return { categoryId: chain, source: 'chain' }
  return null
}
