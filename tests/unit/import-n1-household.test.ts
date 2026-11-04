import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { auditRules, inAuditView, inconsistentCount } from '@shared/import/audit'
import { classifyRow, ruleGivesWay, type ClassifyContext } from '@shared/import/classify'
import type { MbankFile, MbankRow } from '@shared/import/mbank'
import { buildImport, choiceOf, importGroups, planImport, type ImportChoices, type ImportPlan, type NewRow } from '@shared/import/reconcile'
import { defaultCategoryId, importRuleSchema, MBANK_ACCOUNT_ID, type ImportRule, type Transaction } from '@shared/schema'

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const FUEL = defaultCategoryId(3, 1)
const FUN = defaultCategoryId(6, 1)
let seq = 0
const makeId = () => `01KN1H${String(++seq).padStart(20, '0')}`
const zl = (v: number) => Math.round(v * 100)
const NOW = '2026-11-04T18:00:00.000Z'

const IN = 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY'
/** An incoming transfer (or another row) as mBank's list of operations writes it. */
const row = (o: Partial<MbankRow> & Pick<MbankRow, 'date' | 'amount' | 'counterparty'>): MbankRow => {
  const operation = o.operation ?? IN
  return { line: 1, description: `${o.counterparty}, ${o.title ?? ''}  ${operation}`, operation, title: '', accountNo: '', category: '', pending: false, balanceAfter: null, ...o }
}
const fileOf = (rows: MbankRow[]): MbankFile => ({ format: 'lista', client: 'JAN KAPITAN', account: null, period: null, rows, skipped: [] })
const choicesOf = (over: Partial<ImportChoices> = {}): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {}, ...over })
const rule = (over: Partial<ImportRule>): ImportRule =>
  importRuleSchema.parse({ id: makeId(), match: 'tomaszkolega', mode: 'exact', direction: 'in', label: 'TOMASZ KOLEGA', kind: 'expense', categoryId: FUEL, learned: true, hits: 1, updatedAt: NOW, ...over })

const LOAN = '01KN1HPZYCZKA0000000000001'
const ANNA = '01KN1HANNA0000000000000002'
const loan = { id: LOAN, name: 'Pożyczka dla Tomka', direction: 'given' as const, counterparty: 'Tomasz Kolega', date: '2026-09-01', closedAt: null }
const anna = { id: ANNA, name: 'Anna', bankNames: ['ANNA TESTOWA'], inflow: 'income' as const, archived: false }
const ctx = (rules: ImportRule[] = [], over: Partial<ClassifyContext> = {}): ClassifyContext => ({
  rules,
  ownNames: ['JAN KAPITAN'],
  categories: categoryIndex(settings.categories),
  loans: [loan],
  members: [...settings.household.members, anna],
  ...over
})
const tomasz = (amount: number, title = 'ZWROT POZYCZKI', date = '2026-10-30') => row({ date, amount: zl(amount), counterparty: 'TOMASZ KOLEGA', title })
const newRows = (plan: ImportPlan) => plan.rows.filter((p): p is NewRow => p.status === 'new')

describe('AP-6 (AF-26): pożyczka z Radaru, domownik i XTB przed regułą innego rodzaju tej samej nazwy', () => {
  it('decyzja zbiorcza z regułą „zwrot towaru” na nazwisko pożyczkobiorcy – kolejny plik i tak daje zwrot pożyczki', () => {
    // File L1: Tomasz pays back – recognized; the one-click mistake makes it a product return of fuel, remembered.
    const l1 = planImport(fileOf([tomasz(500)]), MBANK_ACCOUNT_ID, [], ctx())
    const [first] = newRows(l1)
    expect(first!.decision).toMatchObject({ kind: 'loan', loanId: LOAN, source: 'builtin' })
    const mistake = choicesOf({ groups: { [first!.group]: { ...choiceOf(first!.decision), kind: 'expense', categoryId: FUEL, loanId: null } }, remember: { [first!.group]: true } })
    const learned = buildImport(l1, mistake, { now: NOW, makeId, rules: [] }).rules
    expect(learned.map((r) => [r.match, r.direction, r.kind, r.categoryId])).toEqual([['tomaszkolega', 'in', 'expense', FUEL]])
    // File L2 with that rule: the loan of the Radar comes first – the repayment is the loan's, never a negative cost.
    const l2 = planImport(fileOf([tomasz(300, 'ZWROT POZYCZKI 2', '2026-11-03')]), MBANK_ACCOUNT_ID, [], ctx(learned))
    expect(newRows(l2)[0]!.decision).toMatchObject({ kind: 'loan', loanId: LOAN, source: 'builtin', ruleId: null })
    expect(buildImport(l2, choicesOf(), { now: NOW, makeId, rules: learned }).create).toMatchObject([{ kind: 'loan', loanId: LOAN, amount: zl(300), categoryId: null }])
    // The loan closed: the user's rule decides again.
    expect(classifyRow(tomasz(300), ctx(learned, { loans: [{ ...loan, closedAt: NOW }] })).decision).toMatchObject({ kind: 'expense', categoryId: FUEL, source: 'rule' })
  })

  it('pożyczka przed regułą wpływu, przelewu własnego i podatku; słowo z tytułu i dawna reguła pożyczki – reguła', () => {
    for (const over of [{ kind: 'income', categoryId: null }, { kind: 'transfer', categoryId: null }, { kind: 'tax', categoryId: null }, { kind: 'income', categoryId: null, household: true, memberId: ANNA }] as const)
      expect(classifyRow(tomasz(200), ctx([rule(over)])).decision).toMatchObject({ kind: 'loan', loanId: LOAN, source: 'builtin' })
    // A keyword of the title is about that payment: the pizza money is no repayment.
    const pizza = rule({ mode: 'keyword', match: 'pizz', label: 'pizza', categoryId: FUN })
    expect(classifyRow(tomasz(40, 'ZA PIZZE'), ctx([pizza])).decision).toMatchObject({ kind: 'expense', categoryId: FUN, source: 'rule', ruleId: pizza.id })
    // A keyword of the name is about the person: the loan first.
    expect(classifyRow(tomasz(40, 'ZA PIZZE'), ctx([rule({ mode: 'keyword', match: 'kolega', categoryId: FUN })])).decision).toMatchObject({ kind: 'loan', loanId: LOAN })
    // A loan's rule of before 1.5.1 (N14): its proposal with the loan of the Radar, as before.
    const old = rule({ kind: 'loan', categoryId: null })
    expect(classifyRow(tomasz(200), ctx([old])).decision).toMatchObject({ kind: 'loan', loanId: LOAN, ruleId: old.id })
  })

  it('domownik przed regułą zwrotu towaru i dawną regułą podatku; reguła z osobą i przelew własny – reguła (jak dotąd)', () => {
    const fromAnna = row({ date: '2026-10-30', amount: zl(120), counterparty: 'ANNA TESTOWA', title: 'ZWROT' })
    const asMember = { kind: 'income', household: true, memberId: ANNA, source: 'builtin' }
    expect(classifyRow(fromAnna, ctx([rule({ match: 'annatestowa' })])).decision).toMatchObject(asMember)
    expect(classifyRow(fromAnna, ctx([rule({ match: 'annatestowa', kind: 'tax', categoryId: null })])).decision).toMatchObject(asMember)
    const named = rule({ match: 'annatestowa', kind: 'income', categoryId: null, household: true, memberId: settings.household.members[0]!.id })
    expect(classifyRow(fromAnna, ctx([named])).decision).toMatchObject({ kind: 'income', household: true, memberId: named.memberId, source: 'rule' })
    expect(classifyRow(fromAnna, ctx([rule({ match: 'annatestowa', kind: 'transfer', categoryId: null })])).decision).toMatchObject({ kind: 'transfer', source: 'rule' })
  })

  it('XTB przed regułą wydatku i wpływu; przelew własny „na portfel XTB” i reguła przelewu własnego – reguła', () => {
    const xtb = row({ date: '2026-10-30', amount: zl(900), counterparty: 'XTB SPÓŁKA AKCYJNA', title: 'WITHDRAWAL' })
    const brand = planImport(fileOf([xtb]), MBANK_ACCOUNT_ID, [], ctx()).rows.find((p): p is NewRow => p.status === 'new')!.brand
    expect(classifyRow(xtb, ctx([rule({ match: brand })])).decision).toMatchObject({ kind: 'trading', source: 'builtin' })
    expect(classifyRow(xtb, ctx([rule({ match: brand, kind: 'income', categoryId: null })])).decision).toMatchObject({ kind: 'trading', source: 'builtin' })
    expect(classifyRow(xtb, ctx([rule({ match: brand, kind: 'transfer', categoryId: null })])).decision).toMatchObject({ kind: 'transfer', source: 'rule' })
    // The holder's own transfer naming XTB in its description is no XTB: the rule decides it, as before.
    const own = row({ date: '2026-10-30', amount: -zl(500), operation: 'PRZELEW WŁASNY', counterparty: '', description: 'NA PORTFEL XTB PRZELEW WŁASNY' })
    const ownBrand = planImport(fileOf([own]), MBANK_ACCOUNT_ID, [], ctx()).rows.find((p): p is NewRow => p.status === 'new')!.brand
    expect(classifyRow(own, ctx([rule({ match: ownBrand, direction: 'out' })])).decision).toMatchObject({ kind: 'expense', source: 'rule' })
  })

  it('ruleGivesWay – tabela rodzajów', () => {
    const r = (kind: ImportRule['kind'], memberId: string | null = null) => ({ kind, memberId })
    expect(ruleGivesWay(r('expense'), null, false)).toBe(false)
    expect(ruleGivesWay(r('expense'), { kind: 'loan', loanId: LOAN }, true)).toBe(false)
    expect(['expense', 'income', 'transfer', 'tax', 'trading'].map((k) => ruleGivesWay(r(k as ImportRule['kind']), { kind: 'loan', loanId: LOAN }, false))).toEqual([true, true, true, true, true])
    expect(ruleGivesWay(r('loan'), { kind: 'loan', loanId: LOAN }, false)).toBe(false)
    expect(['expense', 'income', 'transfer', 'tax', 'loan', 'trading'].map((k) => ruleGivesWay(r(k as ImportRule['kind']), { kind: 'trading' }, false))).toEqual([true, true, false, true, true, false])
    expect(['expense', 'transfer', 'tax', 'loan', 'trading'].map((k) => ruleGivesWay(r(k as ImportRule['kind']), { kind: 'member', memberId: ANNA }, false))).toEqual([true, false, true, true, true])
    expect(ruleGivesWay(r('income', ANNA), { kind: 'member', memberId: ANNA }, false)).toBe(false)
  })

  it('grupa zwrotu pożyczki ma własną propozycję – nie wpada do tematu zwrotów towaru', () => {
    const plan = planImport(fileOf([tomasz(300)]), MBANK_ACCOUNT_ID, [] as Transaction[], ctx([rule({})]))
    expect(importGroups(plan).map((g) => [g.proposed.kind, g.proposed.loanId, g.source])).toEqual([['loan', LOAN, 'builtin']])
  })
})

describe('AP-6 (AF-26, AF-64): Reguły importu – reguła na nazwisko pożyczkobiorcy, „bez trafień”', () => {
  /** Operations of a file imported with these rules (as the import writes them). */
  const imported = (rows: MbankRow[], rules: ImportRule[], loans = [loan]) => buildImport(planImport(fileOf(rows), MBANK_ACCOUNT_ID, [], ctx(rules, { loans })), choicesOf(), { now: NOW, makeId, rules }).create

  it('„niespójne”: wpływy od pożyczkobiorcy zapisane regułą innego rodzaju, gdy pożyczka była otwarta – do poprawy; wpływ sprzed pożyczki i poprawiony ręcznie – nie', () => {
    const fuel = rule({})
    // Imported before the fix (the rule decided them): no loan at the time of the import.
    const ops = imported([tomasz(500, 'ZWROT POZYCZKI', '2026-10-30'), tomasz(300, 'ZWROT POZYCZKI 2', '2026-11-03'), tomasz(80, 'ZA BILETY', '2026-08-20')], [fuel], [])
    expect(ops.map((t) => t.kind)).toEqual(['expense', 'expense', 'expense'])
    // One fixed by hand: of another kind than the rule – the „inny rodzaj” list, not this one.
    const fixed = ops.map((t) => (t.amount === zl(300) ? { ...t, kind: 'loan' as const, categoryId: null, loanId: LOAN } : t))
    const audit = auditRules([fuel], fixed, {}, [loan])
    expect(audit.borrower.get(fuel.id)?.map(({ t, loan: l }) => [t.date, t.amount, l.id])).toEqual([['2026-10-30', zl(500), LOAN]])
    expect(audit.otherKind.get(fuel.id)?.map((t) => t.amount)).toEqual([zl(300)])
    expect(inAuditView(fuel, audit, 'differ')).toBe(true)
    expect(inconsistentCount(audit)).toBe(1)
    // The loan closed before the transfer: no repayment to fix.
    expect(auditRules([fuel], fixed, {}, [{ ...loan, closedAt: '2026-10-15T10:00:00.000Z' }]).borrower.size).toBe(0)
    // Without the Radar's loans (as before 1.15.5): nothing said.
    expect(auditRules([fuel], fixed, {}).borrower.size).toBe(0)
  })

  it('„bez trafień” = licznik: bez reguł pożyczki, PIT-38 i XTB (AF-64)', () => {
    const idle = rule({ match: 'nikt', label: 'Nikt' })
    const rules = [idle, rule({ match: 'pozyczkastara', kind: 'loan', categoryId: null }), rule({ match: 'urzad', kind: 'tax', categoryId: null }), rule({ match: 'xtb', kind: 'trading', categoryId: null })]
    const audit = auditRules(rules, [], {})
    expect(rules.filter((r) => inAuditView(r, audit, 'idle')).map((r) => r.id)).toEqual(audit.idle.map((r) => r.id))
    expect(audit.idle.map((r) => r.id)).toEqual([idle.id])
    expect(rules.filter((r) => inAuditView(r, audit, 'all'))).toHaveLength(4)
    expect(inAuditView(idle, null, 'idle')).toBe(false)
  })
})
