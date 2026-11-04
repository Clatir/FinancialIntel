import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { advanceRuleKey, auditRules, inAuditView, inconsistentCount } from '@shared/import/audit'
import { classifyRow, type ClassifyContext } from '@shared/import/classify'
import type { MbankRow } from '@shared/import/mbank'
import { importRuleSchema, type HouseholdMember, type ImportRule } from '@shared/schema'

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
let seq = 0
const makeId = () => `01KN2C${String(++seq).padStart(20, '0')}`
const NOW = '2026-11-04T18:00:00.000Z'
const MAREK = '01KN2CMAREK000000000000001'
const IN = 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY'
const row = (amount: number): MbankRow => ({ line: 1, date: '2026-11-02', amount, counterparty: 'MAREK TESTOWY', description: `MAREK TESTOWY, ZWROT  ${IN}`, operation: IN, title: 'ZWROT', accountNo: '', category: '', pending: false, balanceAfter: null })
const marek = (inflow: HouseholdMember['inflow']): HouseholdMember => ({ id: MAREK, name: 'Marek', bankNames: ['MAREK TESTOWY'], inflow, archived: false, via: null, opening: { owed: 0, deposit: 0 } })
const ctx = (rules: ImportRule[], inflow: HouseholdMember['inflow']): ClassifyContext => ({ rules, ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings.categories), members: [...settings.household.members, marek(inflow)] })
const rule = (over: Partial<ImportRule>): ImportRule =>
  importRuleSchema.parse({ id: makeId(), match: 'marektestowy', mode: 'exact', direction: 'in', label: 'MAREK TESTOWY', kind: 'income', household: true, memberId: MAREK, learned: true, hits: 1, updatedAt: NOW, ...over })

describe('AP-4: reguła wpłaty domownika – „spłata” bierze resztę z ustawienia osoby (D80 b)', () => {
  it('reguła „spłata” (od 1.15.3 z każdej decyzji grupy): reszta według osoby – zaliczka albo przychód; jawne rodzaje bez zmian', () => {
    for (const inflowKind of ['repay', undefined] as const) {
      // Before AP-4 a rule of „spłata” gave the rest as income whatever the person's setting.
      expect(classifyRow(row(10000), ctx([rule({ inflowKind })], 'advance')).decision).toMatchObject({ kind: 'income', household: true, memberId: MAREK, inflowKind: 'repay', advance: true, source: 'rule' })
      expect(classifyRow(row(10000), ctx([rule({ inflowKind })], 'income')).decision).toMatchObject({ inflowKind: 'repay', advance: false })
    }
    expect(classifyRow(row(10000), ctx([rule({ inflowKind: 'advance' })], 'income')).decision).toMatchObject({ inflowKind: 'advance', advance: true })
    expect(classifyRow(row(10000), ctx([rule({ inflowKind: 'income' })], 'advance')).decision).toMatchObject({ inflowKind: 'income', advance: false })
  })
})

describe('AP-4: reguły z „zaliczką na przyszłość” do przeglądu (audyt reguł)', () => {
  it('nauczona i wpisana – do przeglądu w „niespójne” (po jednej); słowo kluczowe z Operacji i zostawiona – nie', () => {
    const learned = rule({ inflowKind: 'advance' })
    const typed = rule({ inflowKind: 'advance', match: 'marektestowy2', learned: false })
    const keyword = rule({ inflowKind: 'advance', mode: 'keyword', match: 'bilety' })
    const kept = rule({ inflowKind: 'advance', match: 'marektestowy3' })
    const repay = rule({ inflowKind: 'repay', match: 'marektestowy4' })
    const keys = new Set([advanceRuleKey(kept.id)])
    const audit = auditRules([learned, typed, keyword, kept, repay], [], {}, [], (k) => keys.has(k))
    expect(audit.review.map((r) => r.id)).toEqual([learned.id, typed.id])
    expect([learned, typed, keyword, kept, repay].map((r) => inAuditView(r, audit, 'differ'))).toEqual([true, true, false, false, false])
    expect(inconsistentCount(audit)).toBe(2)
    // Nothing kept given: every rule of an advance but the keyword.
    expect(auditRules([learned, keyword, kept], [], {}).review.map((r) => r.id)).toEqual([learned.id, kept.id])
  })
})
