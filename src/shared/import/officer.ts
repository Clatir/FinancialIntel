/**
 * The officer's category for a counterparty (1.5.1, F8, T168): what the budget knows of its brand – a chain in every
 * town and shop is one key („Biedronka” typed = „BIEDRONKA 1234 WARSZAWA” of the bank), the user's merged names too:
 * 1. the category used last with the brand (operations typed or imported),
 * 2. the user's rule of the import for it (exact, contains, keyword),
 * 3. the chain dictionary's category.
 */
import type { BrandAliases } from './aliases'
import { findRule, ruleTargetOf } from './classify'
import { operationName, readableName } from './names'
import { defaultCategoryId, HOUSE_MEMBER_ID, type ImportRule, type Share, type Transaction } from '../schema'

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
  // The chain's name, else the latest name typed by hand, else the bank's latest one as a person writes it (AP-20).
  const uses = new Map<string, { name: string; typed: boolean; n: number }>()
  for (const t of txs) {
    const { target, brand } = officerTarget(t, aliases)
    if (!target.brand && !target.key) continue
    if (t.categoryId) for (const k of [target.brand, target.key]) if (k && !lastByBrand[k]) lastByBrand[k] = t.categoryId
    const key = target.brand || target.key
    const typed = !t.bank && !!t.counterparty.trim()
    const u = uses.get(key)
    if (u) {
      u.n++
      if (typed && !u.typed && !brand.brand) Object.assign(u, { name: t.counterparty.trim(), typed: true })
    } else uses.set(key, { name: brand.brand?.label ?? (typed ? t.counterparty.trim() : readableName(operationName(t))), typed, n: 1 })
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

// ------------------------------------------------------------------ rules for the entries typed by hand (AP-45)

const manualMemo = new WeakMap<readonly ImportRule[], ImportRule[]>()
/** The rules „także dla wpisów ręcznych” (`manual`), in their order – once per list. */
export function manualRules(rules: readonly ImportRule[]): readonly ImportRule[] {
  let out = manualMemo.get(rules)
  if (!out) manualMemo.set(rules, (out = rules.filter((r) => r.manual === true)))
  return out
}

/** An expense typed by hand as a rule reads it (the quick entry, the operation's editor). */
export interface ManualEntry {
  counterparty: string
  /** The title (the quick entry's note). */
  title?: string
  /** 'out' – a purchase, 'in' – its product return. */
  direction: 'in' | 'out'
  /** Grosze, with or without the sign; absent – a rule's condition of the amount does not hold. */
  amount?: number | null
  accountId?: string | null
}

/**
 * What a rule for the entries typed by hand proposes to an expense (AP-45, T470): its category (one the screen offers)
 * and who pays – me, a household member (their gift), several people. Accepted by the user, never written by itself.
 */
export interface RuleHint {
  rule: ImportRule
  /** null – the rule's category is not offered (archived since): the entry keeps its own. */
  categoryId: string | null
  /** false – the rule's „who pays” names a member gone since: the entry keeps its own. */
  pays: boolean
  refundable: boolean
  memberId: string | null
  gift: boolean
  share: Share | null
}

/**
 * The rule „także dla wpisów ręcznych” of an expense – once its name or title is typed, the first in the order of the
 * import (`findRule`) – and what it proposes; null = none, or nothing to propose (a rule of another kind; its category
 * archived and its member gone).
 */
export function manualRuleHint(
  e: ManualEntry,
  ctx: { rules: readonly ImportRule[]; aliases: BrandAliases; usable: (categoryId: string) => boolean; members: ReadonlyArray<{ id: string }> }
): RuleHint | null {
  const rules = manualRules(ctx.rules)
  if (!rules.length || (!e.counterparty.trim() && !e.title?.trim())) return null
  const { target } = ruleTargetOf({ counterparty: e.counterparty.trim(), title: e.title ?? '' }, ctx.aliases)
  const rule = findRule(rules, target, e.direction, e.amount ?? undefined, e.accountId)
  if (rule?.kind !== 'expense') return null
  const active = (id: string | null) => ctx.members.some((x) => x.id === (id ?? HOUSE_MEMBER_ID))
  const categoryId = rule.categoryId && ctx.usable(rule.categoryId) ? rule.categoryId : null
  const share = !rule.refundable && rule.share ? rule.share : null
  const pays = rule.refundable ? active(rule.memberId) : !share || share.lines.every((l) => !l.memberId || active(l.memberId))
  if (!categoryId && !pays) return null
  return pays
    ? { rule, categoryId, pays, refundable: rule.refundable, memberId: rule.refundable ? (rule.memberId ?? HOUSE_MEMBER_ID) : null, gift: rule.refundable && !!rule.gift, share }
    : { rule, categoryId, pays, refundable: false, memberId: null, gift: false, share: null }
}

/** An expense's decision as a hint reads it: its category, who pays. */
export interface HintedDecision {
  categoryId: string | null
  refundable: boolean
  memberId: string | null
  gift: boolean
  share: Share | null
}

/** The same split of a shared purchase: its mode and its people's lines, whatever else a record keeps. */
const sameShare = (a: Share | null, b: Share | null): boolean =>
  !a || !b
    ? a === b
    : a.mode === b.mode && a.lines.length === b.lines.length && a.lines.every((l, i) => l.memberId === b.lines[i]!.memberId && l.value === b.lines[i]!.value && !!l.gift === !!b.lines[i]!.gift)

/** Does the hint propose anything the entry does not have yet (else it is not shown)? */
export function hintChanges(now: HintedDecision, h: RuleHint): boolean {
  if (h.categoryId && h.categoryId !== now.categoryId) return true
  if (!h.pays) return false
  if (h.share || now.share) return !sameShare(now.share, h.share)
  return h.refundable !== now.refundable || (h.refundable && (h.memberId !== now.memberId || h.gift !== now.gift))
}

/** The hint in words („z reguły „…”: kategoria · finansuje: …”). */
export function ruleHintText(h: RuleHint, names: { category: (id: string) => string; member: (id: string) => string }): string {
  const parts: string[] = []
  if (h.categoryId) parts.push(names.category(h.categoryId))
  if (h.pays) {
    if (h.refundable && h.memberId) parts.push(`${h.gift ? 'prezent od' : 'finansuje'}: ${names.member(h.memberId)}`)
    else if (h.share) parts.push(`wspólnie: ${h.share.lines.map((l) => (l.memberId ? names.member(l.memberId) : 'ja')).join(', ')}`)
    else parts.push('płacę ja')
  }
  return `z reguły „${h.rule.label || h.rule.match}”: ${parts.join(' · ')}`
}
