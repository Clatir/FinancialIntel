import { withMerged, type BrandAliases, type BrandName } from '@shared/import/aliases'
import { isGenericWord, normalizeKeyword } from '@shared/import/brands'
import { findRule, ruleTargetOf, upsertRule } from '@shared/import/classify'
import { cleanBankName } from '@shared/import/names'
import { newId } from '@shared/ids'
import { TX_KIND_LABEL, type BrandAlias, type HouseholdMember, type ImportRule, type Transaction, type TxKind } from '@shared/schema'
import { memberName } from '@shared/calc/household'
import { membersNow } from '../household/actions'
import { updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'

const NO_ALIASES: BrandAliases = {}
/** The names the user merged (1.2.2): an operation's brand is looked up and remembered through them. */
const aliasesNow = (): BrandAliases => useData.getState().fi?.settings.import.aliases ?? NO_ALIASES
const targetOf = (t: Transaction) => ruleTargetOf({ counterparty: t.counterparty, title: t.title, operation: t.bank?.operation, bankName: t.bank?.bankName }, aliasesNow())

/** The rule an operation from the bank would get now (its brand, its name, its words, its direction). */
export function ruleFor(t: Transaction): ImportRule | null {
  const rules = useData.getState().fi?.settings.import.rules ?? []
  const { target } = targetOf(t)
  return target.key ? findRule(rules, target, t.amount < 0 ? 'out' : 'in') : null
}

/** Remember the category of an operation for its brand (a decision in Operacje teaches the import too). */
export function rememberCategory(t: Transaction, label: string): void {
  const { brand } = targetOf(t)
  if (!brand.key || t.kind !== 'expense') return
  const direction = t.amount < 0 ? 'out' : 'in'
  const refundable = direction === 'out' && t.refundable
  const rule = { match: brand.key, direction, label: brand.brand?.label ?? t.counterparty, kind: 'expense', categoryId: t.categoryId, refundable, household: false, memberId: refundable ? t.memberId : null, counterAccountId: null } as const
  updateSettings((f) => ({
    ...f,
    settings: { ...f.settings, import: { ...f.settings.import, rules: upsertRule(f.settings.import.rules, rule, { now: new Date().toISOString(), makeId: newId, hits: 1 }) } }
  }))
  toast(`Zapamiętano: „${t.counterparty}” → ${label}. Kolejne importy skategoryzują go same.`, 'success', 4500)
}

/**
 * The category of operations remembered for their brands at once (D76: a bulk decision in Operacje teaches the
 * import too); returns how many rules. Money in = a product return of that brand.
 */
export function rememberBrands(ops: readonly Transaction[], categoryId: string): number {
  const rules = new Map<string, Parameters<typeof upsertRule>[1] & { hits: number }>()
  for (const t of ops) {
    const { brand } = targetOf(t)
    if (!brand.key || t.kind !== 'expense') continue
    const direction = t.amount < 0 ? 'out' : 'in'
    const key = `${brand.key}|${direction}`
    const prev = rules.get(key)
    if (prev) prev.hits++
    else {
      const refundable = direction === 'out' && t.refundable
      rules.set(key, { match: brand.key, direction, label: brand.brand?.label ?? t.counterparty, kind: 'expense', categoryId, refundable, household: false, memberId: refundable ? t.memberId : null, counterAccountId: null, hits: 1 })
    }
  }
  if (!rules.size) return 0
  const now = new Date().toISOString()
  updateSettings((f) => {
    let next = f.settings.import.rules
    for (const { hits, ...r } of rules.values()) next = upsertRule(next, r, { now, makeId: newId, hits })
    return { ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: next } } }
  })
  return rules.size
}

/** A search usable as a keyword: at least 3 letters, not an amount. */
export const keywordOfSearch = (query: string): string | null => {
  const q = query.trim()
  return /^[-−+]?\d[\d\s.,]*$/.test(q) || normalizeKeyword(q).replace(/[^a-z?]/g, '').length < 3 ? null : q
}

/** What a rule decides, in a few words (the user's keywords, a brand of a rule among similar names). */
export function ruleDecisionText(r: ImportRule, catLabel: (id: string | null) => string, members: ReadonlyArray<Pick<HouseholdMember, 'id' | 'name'>> = membersNow()): string {
  if (r.kind === 'expense') return `${r.refundable ? `finansuje: ${memberName(r.memberId, members)} · ` : ''}${catLabel(r.categoryId) || 'bez kategorii'}`
  if (r.kind === 'income') return r.household ? `od domownika: ${memberName(r.memberId, members)}` : 'wpływ (przychód)'
  return r.kind === 'transfer' ? 'przelew własny' : (TX_KIND_LABEL[r.kind as TxKind] ?? r.kind)
}

export function deleteRule(id: string): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: f.settings.import.rules.filter((r) => r.id !== id) } } }))
}

/**
 * A keyword of the user (D75): these words in the name or the title of an operation → the decision. The same keyword
 * and direction again changes it. Returns an error to show, or null.
 */
export function saveKeywordRule(input: {
  keyword: string
  direction: 'in' | 'out' | null
  kind: TxKind
  categoryId: string | null
  /** A decision of the import taken as a keyword (1.2.2): a member's purchase or money (D80), an account. */
  refundable?: boolean
  household?: boolean
  memberId?: string | null
  counterAccountId?: string | null
}): string | null {
  const match = normalizeKeyword(input.keyword)
  if (match.replace(/[^a-z?]/g, '').length < 3) return 'Słowo kluczowe musi mieć co najmniej 3 litery.'
  if (match.split(' ').every(isGenericWord)) return `„${input.keyword.trim()}” jest za ogólne – bank pisze je przy wielu operacjach. Wybierz słowo, które mówi, co to było.`
  if (input.kind === 'expense' && !input.categoryId) return 'Wybierz kategorię.'
  const now = new Date().toISOString()
  updateSettings((f) => {
    const rules = f.settings.import.rules
    const at = rules.findIndex((r) => r.mode === 'keyword' && r.match === match && r.direction === input.direction)
    const rule: ImportRule = {
      ...(at >= 0 ? rules[at] : {}),
      id: at >= 0 ? rules[at]!.id : newId(),
      match,
      mode: 'keyword',
      direction: input.direction,
      label: input.keyword.trim().replace(/\s+/g, ' '),
      kind: input.kind,
      categoryId: input.kind === 'expense' ? input.categoryId : null,
      refundable: input.kind === 'expense' && input.direction === 'out' && !!input.refundable,
      household: input.kind === 'income' && !!input.household,
      memberId: (input.kind === 'expense' && input.direction === 'out' && input.refundable) || (input.kind === 'income' && input.household) ? (input.memberId ?? null) : null,
      counterAccountId: input.kind === 'transfer' ? (input.counterAccountId ?? null) : null,
      learned: false,
      hits: at >= 0 ? rules[at]!.hits : 0,
      updatedAt: now
    }
    const next = [...rules]
    if (at >= 0) next[at] = rule
    else next.push(rule)
    return { ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: next } } }
  })
  return null
}

// ------------------------------------------------------------------ names merged by the user (1.2.2, D78)

/**
 * Change the merged names; returns an undo of just these keys (whatever else changed meanwhile stays), null = nothing
 * changed (merged already – here or on another computer).
 */
function changeAliases(fn: (a: BrandAliases) => Record<string, BrandAlias>): (() => void) | null {
  const before = aliasesNow()
  const after = fn(before)
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => before[k] !== after[k])
  if (!keys.length) return null
  const write = (from: BrandAliases) =>
    updateSettings((f) => {
      const next: Record<string, BrandAlias> = { ...f.settings.import.aliases }
      for (const k of keys)
        if (from[k]) next[k] = from[k]!
        else delete next[k]
      return { ...f, settings: { ...f.settings, import: { ...f.settings.import, aliases: next } } }
    })
  write(after)
  return () => write(before)
}

/**
 * Names that are one counterparty (D78): each `from` is grouped and ruled as `into` from now on – an open file is
 * planned again, the next imports too; Operacje remember by it. Returns an undo, null = merged already.
 */
export function mergeNames(merges: ReadonlyArray<{ into: BrandName; from: readonly BrandName[] }>): (() => void) | null {
  const now = new Date().toISOString()
  return changeAliases((a) => merges.reduce<Record<string, BrandAlias>>((acc, m) => withMerged(acc, m.into, m.from, now), { ...a }))
}

/** A merged name back on its own (Ustawienia → Import z banku). */
export const unmergeName = (key: string): void => {
  changeAliases((a) => {
    const next = { ...a }
    delete next[key]
    return next
  })
}

/** Every merged name back on its own; returns an undo. */
export const unmergeAll = (): (() => void) | null => changeAliases(() => ({}))

/**
 * A merge made in 1.2.2 on names with the bank's additions („… DATA TRANSAKCJI: …”): no name is read so any more, so it
 * merges nothing – shown as inactive, removed in one click (`removeInactive`).
 */
export const inactiveAlias = (a: BrandAlias): boolean => [a.label, a.toLabel].some((l) => !!l && cleanBankName(l, { town: true }) !== l.trim())

export const removeInactive = (): (() => void) | null =>
  changeAliases((a) => Object.fromEntries(Object.entries(a).filter(([, x]) => !inactiveAlias(x))))

/** „To nie to samo”: the pair is not offered again. */
export function dismissSimilar(key: string): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, notSimilar: { ...f.settings.import.notSimilar, [key]: new Date().toISOString() } } } }))
}

/** The pairs said to be two offered again. */
export function clearDismissedSimilar(): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, notSimilar: {} } } }))
}

export function setOwnNames(names: string[]): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, ownNames: names } } }))
}
