/**
 * AP-45 (T467): the rules written before the rules of conditions (one match each – a brand, a fragment, a word, a brand
 * up to an amount, a word with a counterparty) decide the whole import of the fixtures exactly as before – the same
 * decisions, the same rules, the same order of precedence, the same audit. The expected result was written by the code
 * of 1.15.9 (before AP-45): `FI_GOLDEN_WRITE=1 npx vitest run tests/unit/rules-ap45-golden.test.ts` writes it again –
 * only ever with the code before a change of the rules' matching.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { auditRules } from '@shared/import/audit'
import { ruleTargetOf } from '@shared/import/classify'
import { parseMbank, type MbankFile } from '@shared/import/mbank'
import { buildImport, planImport, type ImportChoices } from '@shared/import/reconcile'
import { decodeText } from '@shared/import/text'
import { defaultCategoryId, householdMemberSchema, importRuleSchema, MBANK_ACCOUNT_ID, type ImportRule, type Transaction } from '@shared/schema'
import { loanSchema, type Loan } from '@shared/schema/records'

const FIXTURES = join(__dirname, '..', 'fixtures', 'mbank')
const GOLDEN = join(__dirname, '..', 'fixtures', 'rules', 'ap45-before.json')
const file = (name: string): MbankFile => parseMbank(decodeText(new Uint8Array(readFileSync(join(FIXTURES, name)))))
const NOW = '2026-10-17T09:00:00.000Z'

const base = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const ARCHIVED = defaultCategoryId(6, 3)
const categories = categoryIndex(base.categories.map((c) => (c.id === ARCHIVED ? { ...c, archived: true } : c)))
const TOMEK = '01K5MEMBER0000000000000001'
const members = [householdMemberSchema.parse({ id: TOMEK, name: 'Tomek', bankNames: ['TOMASZ xxx'], inflow: 'advance' })]
const PIOTR_LOAN = '01K5PAN0000000000000000001'
const loans: Loan[] = [
  loanSchema.parse({ schemaVersion: 1, id: PIOTR_LOAN, createdAt: NOW, updatedAt: NOW, updatedBy: 'test', name: 'Piotr', direction: 'given', counterparty: 'PIOTR REDACTED', amount: 50000, date: '2025-01-01', accountId: null, schedule: [], closedAt: null, note: '' })
]
const CASH = '01K5CASH000000000000000001'

/** The brand key of a name as the import reads it (`ruleTargetOf`). */
const brandOf = (counterparty: string) => ruleTargetOf({ counterparty, title: '' }).target.brand

/** Rules of every kind of match before AP-45 – deterministic ids, in the order the user's list would have them. */
function rulesBefore(): ImportRule[] {
  let n = 0
  const r = (over: Partial<ImportRule>): ImportRule =>
    importRuleSchema.parse({ id: `01K5RXXE${String(++n).padStart(18, '0')}`, mode: 'exact', direction: 'out', kind: 'expense', categoryId: null, learned: true, hits: 1, updatedAt: NOW, ...over })
  return [
    r({ match: brandOf('Bolt'), label: 'Bolt', categoryId: defaultCategoryId(3, 5) }),
    r({ match: brandOf('Bolt'), mode: 'amount', maxAmount: 1000, label: 'Bolt do 10 zł', categoryId: defaultCategoryId(1, 3) }),
    r({ match: brandOf('ANTHROPIC* CLAUDE SUB'), label: 'Anthropic', categoryId: defaultCategoryId(6, 2), tags: ['ai'] }),
    r({ match: brandOf('Allegro'), direction: null, label: 'Allegro', categoryId: defaultCategoryId(8, 0) }),
    r({ match: 'apteka', mode: 'contains', label: 'apteka', categoryId: defaultCategoryId(5, 0) }),
    r({ match: 'kurs', mode: 'keyword', direction: null, label: 'kurs', learned: false, categoryId: defaultCategoryId(9, 2) }),
    r({ match: 'przelew', mode: 'keyword', direction: 'in', counterparty: 'TOMASZ xxx', label: 'TOMASZ xxx · przelew', learned: false, kind: 'income', categoryId: null }),
    r({ match: brandOf('TOMASZ xxx'), direction: 'in', label: 'TOMASZ', kind: 'income', categoryId: null }),
    r({ match: brandOf('PIOTR [REDACTED]'), direction: 'in', label: 'PIOTR', kind: 'expense', categoryId: defaultCategoryId(9, 0) }),
    r({ match: brandOf('HBO Max'), label: 'HBO', refundable: true, memberId: TOMEK, categoryId: defaultCategoryId(6, 0) }),
    r({ match: brandOf('Amazon'), label: 'Amazon', share: { mode: 'equal', lines: [{ memberId: null, value: 0, gift: false }, { memberId: TOMEK, value: 0, gift: false }] }, categoryId: defaultCategoryId(1, 1) }),
    r({ match: 'czynsz', mode: 'keyword', direction: 'out', label: 'czynsz', learned: false, categoryId: defaultCategoryId(2, 1) }),
    r({ match: 'wynagrodzenie', mode: 'keyword', direction: 'in', label: 'wynagrodzenie', learned: false, kind: 'income' }),
    r({ match: brandOf('xtb.com'), label: 'XTB', categoryId: defaultCategoryId(9, 2) }),
    r({ match: brandOf('KOLEO'), label: 'Koleo', categoryId: ARCHIVED }),
    r({ match: brandOf('DINO TESTOWO 4'), direction: 'in', label: 'Dino zwroty', categoryId: defaultCategoryId(1, 1) }),
    r({ match: brandOf('BIEDRONKA 1234'), label: 'Biedronka', categoryId: defaultCategoryId(1, 1), refundable: true, memberId: TOMEK, gift: true }),
    r({ match: 'zegar', mode: 'keyword', direction: 'out', label: 'zegar', learned: false, categoryId: defaultCategoryId(8, 0) }),
    r({ match: 'roman', mode: 'contains', label: 'roman', categoryId: defaultCategoryId(9, 0) }),
    r({ match: brandOf('FIRMA TESTOWA SP. Z O.O.'), direction: 'in', label: 'Firma', kind: 'income', loanId: PIOTR_LOAN, loanAmount: 10000 })
  ]
}

const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })

/** Everything the rules decide of a file: each row's plan, the operations made of it, the audit of the rules over them. */
function resultOf(name: string, rules: readonly ImportRule[]) {
  const labelOf = (id: string | null | undefined) => (id ? (rules.find((r) => r.id === id)?.label ?? id) : null)
  let seq = 0
  const makeId = () => `01K5MADE${String(++seq).padStart(18, '0')}`
  const ctx = { rules, ownNames: ['JAN KAPITAN'], categories, members, loans, cash: { id: CASH, name: 'Gotówka' } }
  const plan = planImport(file(name), MBANK_ACCOUNT_ID, [], ctx)
  const rows = plan.rows.map((p) =>
    p.status === 'new' ? [p.key, p.group, p.decision.source, labelOf(p.decision.ruleId), p.decision.reason, p.decision.byTitle, p.decision.loanId, p.decision.loanPart ?? null] : [p.key, p.status]
  )
  const built = buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [...rules] })
  const made = built.create.map((t: Transaction) => [
    t.kind,
    t.amount,
    t.categoryId,
    t.refundable,
    t.memberId,
    t.advance,
    t.inflowKind ?? null,
    t.counterAccountId,
    t.loanId,
    t.containerId,
    t.tags ?? null,
    t.gift ?? null,
    t.share ?? null,
    t.splits.map((s) => [s.amount, s.categoryId, s.refundable, s.memberId, s.loanId ?? null])
  ])
  // The audit over the operations made, a part of them decided otherwise by hand.
  const mine = built.create.map((t, i) => (t.kind === 'expense' && i % 3 === 0 ? { ...t, categoryId: defaultCategoryId(9, 0) } : t))
  const audit = auditRules(rules, mine, {}, loans)
  const byLabel = <V>(m: Map<string, V[]>) => Object.fromEntries([...m].map(([id, xs]) => [labelOf(id), xs.length]).sort())
  return {
    rows,
    made,
    rules: built.rules.map((r) => [r.label, r.mode, r.categoryId, r.hits]),
    audit: { hits: byLabel(audit.hits), differ: byLabel(audit.differ), otherKind: byLabel(audit.otherKind), borrower: byLabel(audit.borrower), idle: audit.idle.map((r) => r.label), mixed: audit.mixed.map((m) => [m.brand, m.categories.length, m.limit]) }
  }
}

describe('AP-45: dotychczasowe reguły – cały import na fixture’ach jak przed regułami z warunkami', () => {
  it('lista operacji i historia rachunku: te same decyzje, operacje, reguły i audyt', () => {
    const now = { lista: resultOf('lista_operacji.csv', rulesBefore()), historia: resultOf('historia_rachunku.csv', rulesBefore()) }
    if (process.env.FI_GOLDEN_WRITE === '1') writeFileSync(GOLDEN, `${JSON.stringify(now)}\n`)
    expect(existsSync(GOLDEN)).toBe(true)
    const before = JSON.parse(readFileSync(GOLDEN, 'utf8')) as typeof now
    // A sanity check of the fixture: the rules do decide its rows (a result of nothing would prove nothing).
    expect(before.lista.rows.filter((r) => r[2] === 'rule').length).toBeGreaterThan(50)
    expect(now.lista.rows).toEqual(before.lista.rows)
    expect(now.lista.made).toEqual(before.lista.made)
    expect(now.lista.rules).toEqual(before.lista.rules)
    expect(now.lista.audit).toEqual(before.lista.audit)
    expect(now.historia).toEqual(before.historia)
  })
})
