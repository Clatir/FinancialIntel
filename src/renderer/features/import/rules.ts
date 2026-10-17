import { counterpartyKey, matchRule, upsertRule } from '@shared/import/classify'
import { newId } from '@shared/ids'
import type { ImportRule, Transaction } from '@shared/schema'
import { updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'

/** The rule an operation from the bank would get now (its counterparty, its direction). */
export function ruleFor(t: Transaction): ImportRule | null {
  const rules = useData.getState().fi?.settings.import.rules ?? []
  const key = counterpartyKey(t.counterparty)
  return key ? matchRule(rules, key, t.amount < 0 ? 'out' : 'in') : null
}

/** Remember the category of an operation for its counterparty (a decision in Operacje teaches the import too). */
export function rememberCategory(t: Transaction, label: string): void {
  const key = counterpartyKey(t.counterparty)
  if (!key || t.kind !== 'expense') return
  const direction = t.amount < 0 ? 'out' : 'in'
  const rule = { match: key, direction, label: t.counterparty, kind: 'expense', categoryId: t.categoryId, refundable: direction === 'out' && t.refundable, household: false, counterAccountId: null } as const
  updateSettings((f) => ({
    ...f,
    settings: { ...f.settings, import: { ...f.settings.import, rules: upsertRule(f.settings.import.rules, rule, { now: new Date().toISOString(), makeId: newId, hits: 1 }) } }
  }))
  toast(`Zapamiętano: „${t.counterparty}” → ${label}. Kolejne importy skategoryzują go same.`, 'success', 4500)
}

export function deleteRule(id: string): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: f.settings.import.rules.filter((r) => r.id !== id) } } }))
}

export function setOwnNames(names: string[]): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, ownNames: names } } }))
}
