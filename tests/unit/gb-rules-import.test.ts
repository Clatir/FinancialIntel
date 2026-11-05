import { describe, expect, it } from 'vitest'
import {
  importRuleSchema,
  readableRuleFields,
  type ImportRule,
  type Loan,
  type Transaction,
  ulidSchema
} from '@shared/schema'
import { auditRules, inconsistentCount } from '@shared/import/audit'
import { isPit38Row } from '@shared/import/classify'
import { impliedLoanRate } from '@shared/calc/payoff'
import { reorderConditionalRule } from '@shared/import/learn'
import { conditionsFromRow, regexFromRow } from '@shared/import/conditions'

const AT = '2026-10-15T12:00:00.000Z'
const RULE_ID_1 = '01KGB100000000000000000001'
const RULE_ID_2 = '01KGB100000000000000000002'
const RULE_ID_3 = '01KGB100000000000000000003'
const LOAN_ID = '01KGB200000000000000000001'

describe('GB – Reguły, schemat, audyt i import (T504–T511)', () => {
  it('T504 / T505 – pola reguł keptField zachowują nieznane lub rozszerzone wartości bez utraty danych', () => {
    const rawWithFutureField = {
      schemaVersion: 1,
      id: RULE_ID_1,
      match: 'netia',
      mode: 'exact',
      label: 'Netia',
      kind: 'expense',
      categoryId: null,
      household: false,
      learned: true,
      hits: 5,
      createdAt: AT,
      updatedAt: AT,
      // Field extended by newer version (e.g. unknown tags structure or unexpected type)
      tags: ['#internet'],
      inflowKind: 'advance',
      futureField: { custom: 123 }
    }

    const parsed = importRuleSchema.parse(rawWithFutureField)
    expect(parsed.tags).toEqual(['#internet'])
    expect(parsed.inflowKind).toBe('advance')
    expect((parsed as Record<string, unknown>).futureField).toEqual({ custom: 123 })
    expect(readableRuleFields(parsed)).toBe(true)

    // Unreadable mode or bad field values
    const unreadable = {
      ...parsed,
      mode: 'future_mode_xyz'
    }
    expect(readableRuleFields(unreadable as unknown as ImportRule)).toBe(false)
  })

  it('T506 / T507 – audyt reguł oznacza regułę z zamkniętą lub usuniętą pożyczką', () => {
    const closedLoan: Loan = {
      schemaVersion: 1,
      id: LOAN_ID,
      name: 'Pożyczka dla Tomka',
      direction: 'given',
      counterparty: 'Tomek',
      amount: 100000,
      total: 100000,
      installments: 1,
      date: '2026-01-01',
      firstDue: '2026-02-01',
      schedule: [],
      note: '',
      accountId: '01KGB300000000000000000001',
      closedAt: '2026-05-01T00:00:00.000Z',
      createdAt: AT,
      updatedAt: AT
    }

    const ruleClosed: ImportRule = importRuleSchema.parse({
      schemaVersion: 1,
      id: RULE_ID_1,
      match: 'tomek przelew',
      mode: 'exact',
      label: 'Tomek',
      kind: 'loan',
      loanId: LOAN_ID,
      categoryId: null,
      household: false,
      learned: false,
      hits: 0,
      createdAt: AT,
      updatedAt: AT
    })

    const ruleMissing: ImportRule = importRuleSchema.parse({
      schemaVersion: 1,
      id: RULE_ID_2,
      match: 'marek przelew',
      mode: 'exact',
      label: 'Marek',
      kind: 'loan',
      loanId: '01KGB400000000000000000099',
      categoryId: null,
      household: false,
      learned: false,
      hits: 0,
      createdAt: AT,
      updatedAt: AT
    })

    const audit = auditRules([ruleClosed, ruleMissing], [], {}, [closedLoan])
    expect(audit.closedLoan.get(RULE_ID_1)?.status).toBe('closed')
    expect(audit.closedLoan.get(RULE_ID_1)?.loan?.name).toBe('Pożyczka dla Tomka')
    expect(audit.closedLoan.get(RULE_ID_2)?.status).toBe('missing')
    expect(inconsistentCount(audit)).toBe(2)
  })

  it('T508 – PIT-38 rozpoznawany po tytule, kontrahencie lub opisie', () => {
    expect(isPit38Row({ counterparty: 'URZĄD SKARBOWY WARSZAWA', title: 'PODATEK PIT-38 ZA 2025', description: '' })).toBe(true)
    expect(isPit38Row({ counterparty: 'US POZNAŃ', title: 'ZAPŁATA', description: 'ROZLICZENIE PIT 38' })).toBe(true)
    expect(isPit38Row({ counterparty: 'PIT-38 URZĄD SKARBOWY', title: 'PRZELEW', description: '' })).toBe(true)
    expect(isPit38Row({ counterparty: 'ZUS', title: 'SKŁADKA ZDROWOTNA', description: '' })).toBe(false)
  })

  it('T509 – impliedLoanRate oblicza oprocentowanie z harmonogramu lub liczby rat', () => {
    // Loan 10 000 zł with total 11 000 zł across 10 equal installments
    const rate = impliedLoanRate({
      amount: 1000000,
      total: 1100000,
      installments: 10
    })
    expect(rate).not.toBeNull()
    expect(rate!).toBeGreaterThan(15)
    expect(rate!).toBeLessThan(25)

    // Invalid / zero interest
    expect(impliedLoanRate({ amount: 100000, total: 100000, installments: 5 })).toBeNull()
    expect(impliedLoanRate({ amount: 0, total: 100000, installments: 5 })).toBeNull()
  })

  it('T510 – reorderConditionalRule zmienia kolejność reguł warunkowych', () => {
    const r1: ImportRule = importRuleSchema.parse({
      schemaVersion: 1,
      id: RULE_ID_1,
      match: 'r1',
      mode: 'conditions',
      label: 'R1',
      kind: 'expense',
      categoryId: null,
      household: false,
      learned: false,
      hits: 0,
      createdAt: AT,
      updatedAt: AT
    })
    const rExact: ImportRule = importRuleSchema.parse({
      schemaVersion: 1,
      id: RULE_ID_2,
      match: 'rexact',
      mode: 'exact',
      label: 'RExact',
      kind: 'expense',
      categoryId: null,
      household: false,
      learned: false,
      hits: 0,
      createdAt: AT,
      updatedAt: AT
    })
    const r3: ImportRule = importRuleSchema.parse({
      schemaVersion: 1,
      id: RULE_ID_3,
      match: 'r3',
      mode: 'conditions',
      label: 'R3',
      kind: 'expense',
      categoryId: null,
      household: false,
      learned: false,
      hits: 0,
      createdAt: AT,
      updatedAt: AT
    })

    const rules = [r1, rExact, r3]
    // Move r3 up: should swap with r1 while keeping rExact in place
    const reordered = reorderConditionalRule(rules, RULE_ID_3, -1)
    expect(reordered[0]?.id).toBe(RULE_ID_3)
    expect(reordered[1]?.id).toBe(RULE_ID_2)
    expect(reordered[2]?.id).toBe(RULE_ID_1)
  })

  it('T511 – regexFromRow i conditionsFromRow tworzą wzorce z generalizacją liczb do \\d+', () => {
    const rx = regexFromRow('Faktura 12/2026 Netia SA')
    expect(rx).toContain('\\d+')
    expect(rx).toContain('netia')

    const conds = conditionsFromRow({
      counterparty: 'PGE Dystrybucja 123',
      title: 'Opłata 456 za prąd'
    }, { regex: true })

    expect(conds).toHaveLength(2)
    expect(conds[0]?.field).toBe('counterparty')
    expect(conds[0]?.value).toContain('\\d+')
    expect(conds[1]?.field).toBe('title')
    expect(conds[1]?.value).toContain('\\d+')
  })
})
