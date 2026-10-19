/**
 * The audit of the import's rules (1.5.1, F22, T169): what each rule catches of the operations from the bank now, the
 * operations of a rule decided otherwise (to apply the rule to the history – with „Cofnij”), the brands with operations
 * of two and more categories (a limit of the amount offered when one splits them cleanly), the rules catching nothing.
 */
import { HOUSE_MEMBER_ID, type ImportRule, type Transaction } from '../schema'
import { shareOf, withShare } from '../calc/share'
import { deepEqual } from '../merge'
import type { BrandAliases } from './aliases'
import { findRule, PER_OPERATION_KINDS } from './classify'
import { officerTarget } from './officer'

export interface MixedBrand {
  brand: string
  label: string
  /** Its categories, the most used first: the number of operations and their amounts (grosze, without the sign). */
  categories: Array<{ categoryId: string; n: number; min: number; max: number }>
  /** Two categories split by the amount (all of one up to it, all of the other above it): a rule up to it is offered. */
  limit: { maxAmount: number; categoryId: string } | null
}

export interface RuleAudit {
  /** The operations from the bank each rule catches now (the rule's id → their ids). */
  hits: Map<string, string[]>
  /** Expenses a rule of an expense catches whose category or financing is another: the rule applied to each. */
  differ: Map<string, Array<{ before: Transaction; after: Transaction }>>
  /** Operations a rule catches of another kind than the rule's (changed by hand – not applied, said). */
  otherKind: Map<string, Transaction[]>
  /** Brands with expenses of two and more categories. */
  mixed: MixedBrand[]
  /** Rules that catch nothing (a rule of a loan, the tax or XTB is a proposal only – left out). */
  idle: ImportRule[]
}

/** An expense with what its rule of an expense says: category and financing (D80, D83). */
export function withRule(t: Transaction, rule: ImportRule): Transaction {
  const refundable = rule.refundable
  const share = !refundable && rule.share ? rule.share : null
  // A shared purchase's lines take the category with them (D83).
  if (share) return withShare({ ...t, categoryId: rule.categoryId }, share)
  const plain = shareOf(t) ? withShare(t, null) : t
  return { ...plain, categoryId: rule.categoryId, refundable, memberId: refundable ? (rule.memberId ?? HOUSE_MEMBER_ID) : null, gift: refundable && rule.gift ? true : undefined }
}

const decisionOf = (t: Transaction) => ({ categoryId: t.categoryId, refundable: t.refundable, memberId: t.refundable ? t.memberId : null, gift: !!t.gift, share: shareOf(t) ?? null })

/** An audit being counted: the operations go in by portions (a large folder – the screen stays responsive). */
export interface AuditRun {
  rules: readonly ImportRule[]
  aliases: BrandAliases
  hits: RuleAudit['hits']
  differ: RuleAudit['differ']
  otherKind: RuleAudit['otherKind']
  brands: Map<string, { label: string; byCategory: Map<string, number[]> }>
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

export const startAudit = (rules: readonly ImportRule[], aliases: BrandAliases): AuditRun => ({ rules, aliases, hits: new Map(), differ: new Map(), otherKind: new Map(), brands: new Map() })

/** A portion of the operations: those from the bank (`bank`) against the rules. */
export function feedAudit(run: AuditRun, transactions: readonly Transaction[]): void {
  for (const t of transactions) {
    if (!t.bank || !t.amount) continue
    const direction = t.amount < 0 ? 'out' : 'in'
    const { target, brand } = officerTarget(t, run.aliases)
    const rule = findRule(run.rules, target, direction, t.amount)
    // Lines of a receipt split by hand: no one category to compare.
    const split = t.splits.length > 0 && !shareOf(t)
    if (rule) {
      push(run.hits, rule.id, t.id)
      if (!(PER_OPERATION_KINDS as readonly string[]).includes(rule.kind) && !split) {
        if (rule.kind !== t.kind) push(run.otherKind, rule.id, t)
        else if (rule.kind === 'expense' && direction === 'out') {
          const after = withRule(t, rule)
          if (!deepEqual(decisionOf(after), decisionOf(t))) push(run.differ, rule.id, { before: t, after })
        }
      }
    }
    if (t.kind === 'expense' && direction === 'out' && t.categoryId && !split && target.brand) {
      let b = run.brands.get(target.brand)
      if (!b) run.brands.set(target.brand, (b = { label: brand.brand?.label ?? t.counterparty, byCategory: new Map<string, number[]>() }))
      push(b.byCategory, t.categoryId, -t.amount)
    }
  }
}

export function finishAudit(run: AuditRun): RuleAudit {
  const mixed: MixedBrand[] = []
  for (const [key, b] of run.brands) {
    if (b.byCategory.size < 2) continue
    const categories = [...b.byCategory].map(([categoryId, xs]) => ({ categoryId, n: xs.length, min: Math.min(...xs), max: Math.max(...xs) })).sort((x, y) => y.n - x.n || x.min - y.min)
    mixed.push({ brand: key, label: b.label, categories, limit: limitOf(categories) })
  }
  mixed.sort((a, b) => sumN(b) - sumN(a) || a.label.localeCompare(b.label))
  const idle = run.rules.filter((r) => !run.hits.has(r.id) && !(PER_OPERATION_KINDS as readonly string[]).includes(r.kind))
  return { hits: run.hits, differ: run.differ, otherKind: run.otherKind, mixed, idle }
}

/** The operations from the bank (`bank`) against the rules (`aliases` – the user's merged names), at once. */
export function auditRules(rules: readonly ImportRule[], transactions: readonly Transaction[], aliases: BrandAliases): RuleAudit {
  const run = startAudit(rules, aliases)
  feedAudit(run, transactions)
  return finishAudit(run)
}

const sumN = (m: MixedBrand) => m.categories.reduce((s, c) => s + c.n, 0)

/** Two categories whose amounts do not overlap: the smaller ones' category up to the whole złoty above their largest. */
function limitOf(categories: MixedBrand['categories']): MixedBrand['limit'] {
  if (categories.length !== 2) return null
  const [a, b] = [...categories].sort((x, y) => x.max - y.max) as [MixedBrand['categories'][number], MixedBrand['categories'][number]]
  if (a.max >= b.min) return null
  const whole = Math.ceil(a.max / 100) * 100
  return { maxAmount: whole < b.min ? whole : a.max, categoryId: a.categoryId }
}
