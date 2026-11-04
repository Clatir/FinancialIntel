import { describe, expect, it } from 'vitest'
import { balanceOf, settleHousehold } from '@shared/calc/household'
import { loanParts, loanState } from '@shared/calc/loans'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { classifyRow, ruleGivesWay, type ClassifyContext } from '@shared/import/classify'
import type { MbankFile, MbankRow } from '@shared/import/mbank'
import { conflicting, takeUserData } from '@shared/import/copies'
import { keywordProposals } from '@shared/import/learn'
import { buildImport, importGroups, learnable, loanKey, owedWithFile, planImport, remembersByDefault, rowShares, sameChoice, type Choice, type ImportChoices, type ImportPlan } from '@shared/import/reconcile'
import { importRuleSchema, loanSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type ImportRule, type Loan, type Transaction } from '@shared/schema'

// D100 (2), T357–T358: the import – a row's and a group's part repaying a loan given, of any inflow, and a rule naming it.
const AT = '2026-10-01T00:00:00.000Z'
const NOW = '2026-11-04T18:00:00.000Z'
const zl = (v: number) => Math.round(v * 100)
let seq = 0
const makeId = () => `01KN2Q${String(++seq).padStart(20, '0')}`
const settings = createDefaultSettings(AT).settings
const MAMA = '01KN2QMAMA0000000000000001'
const member = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const members = [...settings.household.members, member(MAMA, 'Mama', { bankNames: ['ANNA NOWAK'] })]
const jan: Loan = loanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01KN2QJAN00000000000000001', createdAt: AT, updatedAt: AT, name: 'Pożyczka dla Jana', direction: 'given', counterparty: 'JAN KOWALSKI', amount: zl(1000), date: '2026-10-01' })
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const IN = 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY'
const row = (date: string, amount: number, counterparty: string, title: string): MbankRow => ({
  line: 1,
  date,
  description: `${counterparty}, ${title}  ${IN}`,
  operation: IN,
  counterparty,
  title,
  accountNo: '',
  category: '',
  amount: zl(amount),
  pending: false,
  balanceAfter: null
})
const fileOf = (rows: MbankRow[]): MbankFile => ({ format: 'lista', client: 'JAN KAPITAN', account: null, period: null, rows, skipped: [] })
const ctxOf = (rules: ImportRule[] = [], loans: Loan[] = [jan]): ClassifyContext => ({ rules, ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings.categories), members, loans })
const choicesOf = (over: Partial<ImportChoices> = {}): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {}, ...over })
const plan = (rows: MbankRow[], ctx = ctxOf()): ImportPlan => planImport(fileOf(rows), MBANK_ACCOUNT_ID, [], ctx)
const groupOf = (p: ImportPlan, label: string) => importGroups(p).find((g) => g.label === label)!
const loanLine = (amount: number) => ({ memberId: '', amount: zl(amount), advance: false, loanId: jan.id })
const plain: Choice = { kind: 'income', categoryId: null, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
const mamaMoney: Choice = { ...plain, household: true, memberId: MAMA, inflowKind: 'repay' }
/** The loan's debt now (`owedWithFile` – the engine's open amounts): what its parts of the file may take. */
const owedOf = (p: ImportPlan, c: ImportChoices, open = zl(1000)) => owedWithFile(p, c, () => ({ owed: 0, deposit: 0 }), members.map((m) => m.id), new Map([[jan.id, open]]))
const rule = (over: Partial<ImportRule>): ImportRule => importRuleSchema.parse({ id: makeId(), match: 'x', direction: 'in', kind: 'income', updatedAt: AT, ...over })
/** The key a rule of a sender's name is found by (the brand of a transfer – as the import learns it). */
const keyOf = (name: string): string => classifyRow(row('2026-10-25', 1, name, 'X'), ctxOf()).target.brand

describe('D100 w imporcie: część wpłaty spłaca pożyczkę – wiersz, grupa, reguła', () => {
  it('wiersz: mama Jana 400 zł – cała jako spłata pożyczki (opcja „Zwrot pożyczki”) albo jako część wpływu; pożyczka 600 zł', () => {
    const rows = [row('2026-10-25', 400, 'EWA KOWALSKA', 'SPLATA POZYCZKI JANA')]
    const p = plan(rows)
    const g = groupOf(p, 'EWA KOWALSKA')
    // Not recognized by her name (not the borrower): a plain inflow until the user says.
    expect(g.proposed.kind).toBe('income')
    const whole = buildImport(p, choicesOf({ groups: { [g.group]: { ...plain, kind: 'loan', loanId: jan.id } } }), { now: NOW, makeId, rules: [] }).create
    expect(whole.map((t) => [t.kind, t.loanId, t.splits.length])).toEqual([['loan', jan.id, 0]])
    const key = p.rows[0]!.key
    const part = buildImport(p, choicesOf({ rows: { [key]: { ...plain, shares: [loanLine(400)] } } }), { now: NOW, makeId, rules: [] }).create
    expect(part.map((t) => [t.kind, t.memberId, t.splits.map((s) => [s.memberId, s.loanId, s.amount])])).toEqual([['income', null, [[null, jan.id, zl(400)]]]])
    for (const t of [...whole, ...part]) expect(loanState(jan, [t], [], '2026-11-04')).toMatchObject({ paid: zl(400), open: zl(600) })
  })

  it('grupa domownika: 500 zł Mamy, w tym 200 zł spłaty pożyczki – reszta 300 zł to jej pieniądze (spłata jej zakupów)', () => {
    const p = plan([row('2026-10-28', 500, 'ANNA NOWAK', 'PRZELEW')])
    const g = groupOf(p, 'ANNA NOWAK')
    expect(g.proposed).toMatchObject({ kind: 'income', household: true, memberId: MAMA })
    const c = choicesOf({ groups: { [g.group]: { ...g.proposed, shares: [loanLine(200)] } } })
    const { create } = buildImport(p, c, { now: NOW, makeId, rules: [], owed: owedOf(p, c) })
    expect(create.map((t) => [t.memberId, t.amount, t.splits.map((s) => [s.memberId, s.loanId ?? null, s.amount])])).toEqual([[MAMA, zl(500), [[null, jan.id, zl(200)]]]])
    const bought = tx('2026-10-20', -zl(350), { refundable: true, memberId: MAMA, counterparty: 'Sklep' })
    expect(balanceOf(settleHousehold([bought, ...create]), MAMA)).toMatchObject({ owed: zl(50) })
    expect(loanParts(create[0]!)).toEqual([{ loanId: jan.id, amount: zl(200) }])
  })

  it('grupa: kwota części to razem dla pożyczki, po kolei od najstarszej, nigdy ponad dług (także po spłatach całością z pliku)', () => {
    const rows = [row('2026-10-25', 400, 'EWA KOWALSKA', 'SPLATA'), row('2026-10-27', 800, 'EWA KOWALSKA', 'SPLATA'), row('2026-10-26', 300, 'JAN KOWALSKI', 'ZWROT')]
    const p = plan(rows)
    const ewa = groupOf(p, 'EWA KOWALSKA')
    // The borrower's own transfer: his loan by his name (B34) – a whole repayment of the file, 300 zł of the debt.
    expect(groupOf(p, 'JAN KOWALSKI').proposed).toMatchObject({ kind: 'loan', loanId: jan.id })
    const c = choicesOf({ groups: { [ewa.group]: { ...plain, shares: [loanLine(1500)] } } })
    const spread = rowShares(p, c, owedOf(p, c))
    const byDate = [...p.rows].sort((a, b) => a.row.date.localeCompare(b.row.date)).map((r) => (spread.parts.get(r.key) ?? []).map((x) => x.amount))
    // 1 000 − 300 (Jan's own) = 700: 400 from the first, 300 from the second; the second's 500 zł left is income.
    expect(byDate).toEqual([[zl(400)], [], [zl(300)]])
    expect(spread.total.get(loanKey(jan.id))).toBe(zl(1000))
    expect(spread.spread.get(`g:${ewa.group}`)).toMatchObject([{ line: 0, memberId: loanKey(jan.id), typed: zl(1500) }])
    // A row's own part as typed (T327: beyond the debt the excess is income – T70).
    const own = rowShares(p, choicesOf({ rows: { [p.rows[0]!.key]: { ...plain, shares: [loanLine(400)] } } }), owedOf(p, choicesOf(), 0))
    expect(own.parts.get(p.rows[0]!.key)?.map((x) => x.amount)).toEqual([zl(400)])
    // A closed loan (not among the open ones): no part of a group's decision.
    expect(rowShares(p, c, owedWithFile(p, c, () => ({ owed: 0, deposit: 0 }), [], new Map())).parts.size).toBe(0)
  })

  it('reguła: zwrot pożyczki całością – tylko gdy pożyczka otwarta i od dnia jej udzielenia; nie ustępuje domownikowi', () => {
    const loanRule = rule({ match: keyOf('EWA KOWALSKA'), label: 'EWA KOWALSKA', kind: 'loan', loanId: jan.id })
    const r = row('2026-10-25', 400, 'EWA KOWALSKA', 'SPLATA')
    expect(classifyRow(r, ctxOf([loanRule])).decision).toMatchObject({ kind: 'loan', loanId: jan.id, source: 'rule', ruleId: loanRule.id })
    // Closed since, or not given yet that day: the rule gives way – the row is a plain inflow again.
    expect(classifyRow(r, ctxOf([loanRule], [{ ...jan, closedAt: '2026-10-20T10:00:00.000Z' }])).decision).toMatchObject({ kind: 'income', loanId: null })
    expect(classifyRow(row('2026-09-25', 400, 'EWA KOWALSKA', 'SPLATA'), ctxOf([loanRule])).decision).toMatchObject({ kind: 'income', loanId: null })
    // A household member's money repaying the loan whole: the rule says so (before: a member's money always won).
    const mamaRule = rule({ match: keyOf('ANNA NOWAK'), label: 'ANNA NOWAK', kind: 'loan', loanId: jan.id })
    expect(classifyRow(row('2026-10-28', 500, 'ANNA NOWAK', 'PRZELEW'), ctxOf([mamaRule])).decision).toMatchObject({ kind: 'loan', loanId: jan.id })
    expect(ruleGivesWay(mamaRule, { kind: 'member', memberId: MAMA }, false)).toBe(false)
    // A loan's rule of before 1.5.1 (no loan named) gives way to the member as before.
    expect(ruleGivesWay({ ...mamaRule, loanId: undefined }, { kind: 'member', memberId: MAMA }, false)).toBe(true)
  })

  it('reguła: część każdej wpłaty (200 zł) – w wierszu najwyżej dług pożyczki, reszta jak mówi reguła; reguła pożyczkobiorcy z jego pożyczką nie ustępuje', () => {
    const partRule = rule({ match: keyOf('ANNA NOWAK'), label: 'ANNA NOWAK', kind: 'income', household: true, memberId: MAMA, loanId: jan.id, loanAmount: zl(200) })
    const rows = [row('2026-10-28', 500, 'ANNA NOWAK', 'PRZELEW'), row('2026-10-30', 500, 'ANNA NOWAK', 'PRZELEW')]
    const p = plan(rows, ctxOf([partRule]))
    expect(p.rows.map((x) => (x.status === 'new' ? x.decision.loanPart : null))).toEqual([
      { loanId: jan.id, amount: zl(200) },
      { loanId: jan.id, amount: zl(200) }
    ])
    // Each transfer its own part (a rule's – per row, not the group's together), never beyond the debt (150 zł open).
    const parts = (open: number) => {
      const s = rowShares(p, choicesOf(), owedOf(p, choicesOf(), open))
      return [...p.rows].sort((a, b) => a.row.date.localeCompare(b.row.date)).map((r) => (s.parts.get(r.key) ?? []).map((x) => x.amount))
    }
    expect(parts(zl(1000))).toEqual([[zl(200)], [zl(200)]])
    expect(parts(zl(150))).toEqual([[zl(150)], []])
    const { create } = buildImport(p, choicesOf(), { now: NOW, makeId, rules: [partRule], owed: owedOf(p, choicesOf(), zl(150)) })
    expect(create.map((t) => [t.memberId, t.splits.map((s) => [s.loanId, s.amount])])).toEqual([
      [MAMA, [[jan.id, zl(150)]]],
      [MAMA, []]
    ])
    // A closed loan: the rule's part is left out, the rest of the rule stands.
    expect(classifyRow(rows[0]!, ctxOf([partRule], [{ ...jan, closedAt: '2026-10-20T10:00:00.000Z' }])).decision).toMatchObject({ kind: 'income', household: true, memberId: MAMA })
    expect(classifyRow(rows[0]!, ctxOf([partRule], [{ ...jan, closedAt: '2026-10-20T10:00:00.000Z' }])).decision.loanPart).toBeUndefined()
    // The borrower's rent and installment in one transfer: a rule of his loan's part is his loan's – not given way to.
    const rent = rule({ match: keyOf('JAN KOWALSKI'), label: 'JAN KOWALSKI', kind: 'income', loanId: jan.id, loanAmount: zl(200) })
    expect(classifyRow(row('2026-10-26', 1200, 'JAN KOWALSKI', 'CZYNSZ I RATA'), ctxOf([rent])).decision).toMatchObject({ kind: 'income', source: 'rule', loanPart: { loanId: jan.id, amount: zl(200) } })
    expect(ruleGivesWay({ ...rent, loanId: null }, { kind: 'loan', loanId: jan.id }, false)).toBe(true)
  })

  it('nauka reguły: spłata pożyczki tylko na życzenie („zapamiętaj” domyślnie wyłączone), reguła nazywa pożyczkę; decyzja zbiorcza jej nie zmienia', () => {
    const rows = [row('2026-10-25', 400, 'EWA KOWALSKA', 'SPLATA'), row('2026-10-28', 500, 'ANNA NOWAK', 'PRZELEW')]
    const p = plan(rows)
    const ewa = groupOf(p, 'EWA KOWALSKA')
    const mama = groupOf(p, 'ANNA NOWAK')
    const whole: Choice = { ...plain, kind: 'loan', loanId: jan.id }
    const part: Choice = { ...mamaMoney, shares: [loanLine(200)] }
    expect([learnable(whole, 'in'), learnable(whole, 'out'), learnable({ ...whole, loanId: null }, 'in'), learnable(part, 'in')]).toEqual([true, false, false, true])
    // „zapamiętaj” starts off for a loan's repayment chosen over another decision; kept as it was when it stays one.
    expect([remembersByDefault(whole, ewa.proposed, undefined), remembersByDefault(part, mama.proposed, true), remembersByDefault(mamaMoney, undefined, undefined), remembersByDefault(whole, whole, true)]).toEqual([false, false, true, true])
    const c = choicesOf({ groups: { [ewa.group]: whole, [mama.group]: part }, remember: { [ewa.group]: true, [mama.group]: true } })
    const { rules } = buildImport(p, c, { now: NOW, makeId, rules: [], owed: owedOf(p, c) })
    expect(rules.map((r) => [r.label, r.kind, r.loanId, r.loanAmount ?? null, r.memberId]).sort()).toEqual([
      ['ANNA NOWAK', 'income', jan.id, zl(200), MAMA],
      ['EWA KOWALSKA', 'loan', jan.id, null, null]
    ])
    // Not ticked: nothing learned (N14 the default).
    expect(buildImport(p, { ...c, remember: {} }, { now: NOW, makeId, rules: [] }).rules).toEqual([])
    // Another loan's part is another decision.
    expect(sameChoice(part, { ...part, shares: [{ ...loanLine(200), loanId: '01KN2QOTHER000000000000001' }] })).toBe(false)
  })

  it('kopia z innego konta z częścią pożyczki: inna decyzja niż bez niej – operacja tutaj bez decyzji przejmuje jej część', () => {
    const copy = tx('2026-10-25', zl(400), { kind: 'income', counterparty: 'EWA KOWALSKA', splits: [{ id: makeId(), amount: zl(400), categoryId: null, refundable: false, memberId: null, advance: false, loanId: jan.id, note: '' }] })
    const here = tx('2026-10-25', zl(400), { kind: 'expense', counterparty: 'EWA KOWALSKA' })
    const out = takeUserData(here, [copy], NOW)
    expect(out.splits.map((s) => [s.loanId, s.amount])).toEqual([[jan.id, zl(400)]])
    expect(loanParts(out)).toEqual([{ loanId: jan.id, amount: zl(400) }])
    // Decided as plain income without the part: another decision – the user checks the copy (never removed unseen).
    const plainHere = tx('2026-10-25', zl(400), { kind: 'income', counterparty: 'EWA KOWALSKA' })
    const asLine = tx('2026-10-25', zl(400), { kind: 'income', counterparty: 'EWA KOWALSKA', splits: [{ ...copy.splits[0]!, loanId: undefined }] })
    expect([conflicting(plainHere, [copy]), conflicting(asLine, [copy]), conflicting(copy, [{ ...copy, id: makeId() }])]).toEqual([true, true, false])
  })

  it('reguła z częścią pożyczki: wiersze sprzed udzielenia pożyczki to inna grupa (bez części); słowo kluczowe z decyzji z częścią się nie uczy', () => {
    const partRule = rule({ match: keyOf('ANNA NOWAK'), label: 'ANNA NOWAK', kind: 'income', household: true, memberId: MAMA, loanId: jan.id, loanAmount: zl(200) })
    const p = plan([row('2026-09-28', 500, 'ANNA NOWAK', 'PRZELEW'), row('2026-10-28', 500, 'ANNA NOWAK', 'PRZELEW')], ctxOf([partRule]))
    const mamas = importGroups(p).filter((g) => g.label === 'ANNA NOWAK')
    expect(mamas.map((g) => [g.rows.map((r) => r.row.date), g.proposed.shares?.map((x) => [x.loanId, x.amount]) ?? []])).toEqual([
      [['2026-09-28'], []],
      [['2026-10-28'], [[jan.id, zl(200)]]]
    ])
    // A plain inflow with a loan's part decided for one group: no keyword of its title for the others (N16).
    const q = plan([row('2026-10-25', 400, 'EWA KOWALSKA', 'SPLATA POZYCZKI JANA'), row('2026-10-26', 400, 'PIOTR ZIELINSKI', 'SPLATA POZYCZKI JANA')])
    const ewa = groupOf(q, 'EWA KOWALSKA')
    const withPart: Choice = { ...plain, shares: [loanLine(400)] }
    const own: Choice = { ...plain, kind: 'transfer' }
    expect(keywordProposals(importGroups(q), ewa, own, { rules: [], choices: choicesOf({ groups: { [ewa.group]: own } }) }).length).toBeGreaterThan(0)
    expect(keywordProposals(importGroups(q), ewa, withPart, { rules: [], choices: choicesOf({ groups: { [ewa.group]: withPart } }) })).toEqual([])
  })
})
