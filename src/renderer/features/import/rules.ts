import { normalizeKeyword } from '@shared/import/brands'
import { findRule, ruleTargetOf, upsertRule } from '@shared/import/classify'
import { newId } from '@shared/ids'
import type { ImportRule, Transaction, TxKind } from '@shared/schema'
import { updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'

/** The rule an operation from the bank would get now (its brand, its name, its words, its direction). */
export function ruleFor(t: Transaction): ImportRule | null {
  const rules = useData.getState().fi?.settings.import.rules ?? []
  const { target } = ruleTargetOf({ counterparty: t.counterparty, title: t.title, operation: t.bank?.operation })
  return target.key ? findRule(rules, target, t.amount < 0 ? 'out' : 'in') : null
}

/** Remember the category of an operation for its brand (a decision in Operacje teaches the import too). */
export function rememberCategory(t: Transaction, label: string): void {
  const { brand } = ruleTargetOf({ counterparty: t.counterparty, title: t.title, operation: t.bank?.operation })
  if (!brand.key || t.kind !== 'expense') return
  const direction = t.amount < 0 ? 'out' : 'in'
  const rule = { match: brand.key, direction, label: brand.brand?.label ?? t.counterparty, kind: 'expense', categoryId: t.categoryId, refundable: direction === 'out' && t.refundable, household: false, counterAccountId: null } as const
  updateSettings((f) => ({
    ...f,
    settings: { ...f.settings, import: { ...f.settings.import, rules: upsertRule(f.settings.import.rules, rule, { now: new Date().toISOString(), makeId: newId, hits: 1 }) } }
  }))
  toast(`Zapamiętano: „${t.counterparty}” → ${label}. Kolejne importy skategoryzują go same.`, 'success', 4500)
}

export function deleteRule(id: string): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: f.settings.import.rules.filter((r) => r.id !== id) } } }))
}

/**
 * A keyword of the user (D75): these words in the name or the title of an operation → the decision. The same keyword
 * and direction again changes it. Returns an error to show, or null.
 */
export function saveKeywordRule(input: { keyword: string; direction: 'in' | 'out' | null; kind: TxKind; categoryId: string | null }): string | null {
  const match = normalizeKeyword(input.keyword)
  if (match.replace(/[^a-z?]/g, '').length < 3) return 'Słowo kluczowe musi mieć co najmniej 3 litery.'
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
      refundable: false,
      household: false,
      counterAccountId: null,
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

export function setOwnNames(names: string[]): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, ownNames: names } } }))
}
