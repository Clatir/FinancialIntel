/**
 * N2 (1.15.6), the second review – the import's pure parts: a rule's loan part of each inflow stays per inflow when its
 * group or theme is decided otherwise (T358), a group's total loan part is never learned as each inflow's (T368),
 * „zapamiętaj” back to its default once the decision repays no loan again (T358), the rules' audit reads only the rules
 * kept as advances of `notDuplicates` (T353).
 */
import { describe, expect, it } from 'vitest'
import { advanceRuleKey, advanceRulesKept } from '@shared/import/audit'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { classifyRow, type ClassifyContext } from '@shared/import/classify'
import type { MbankFile, MbankRow } from '@shared/import/mbank'
import { buildImport, importGroups, importThemes, owedWithFile, planImport, remembersByDefault, rowShares, ruleDecisionOf, type Choice, type ImportChoices, type ImportPlan } from '@shared/import/reconcile'
import { importRuleSchema, loanSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, type HouseholdMember, type ImportRule, type Loan } from '@shared/schema'

const AT = '2026-10-01T00:00:00.000Z'
const NOW = '2026-11-04T18:00:00.000Z'
const zl = (v: number) => Math.round(v * 100)
let seq = 0
const makeId = () => `01KN2R${String(++seq).padStart(20, '0')}`
const settings = createDefaultSettings(AT).settings
const MAMA = '01KN2RMAMA0000000000000001'
const member = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const members = [...settings.household.members, member(MAMA, 'Mama', { bankNames: ['ANNA NOWAK'] })]
const jan: Loan = loanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01KN2RJAN00000000000000001', createdAt: AT, updatedAt: AT, name: 'Pożyczka dla Jana', direction: 'given', counterparty: 'JAN KOWALSKI', amount: zl(1000), date: '2026-10-01' })
const IN = 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY'
const row = (date: string, amount: number, counterparty: string, title = 'PRZELEW'): MbankRow => ({
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
const ctxOf = (rules: ImportRule[] = []): ClassifyContext => ({ rules, ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings.categories), members, loans: [jan] })
const choicesOf = (over: Partial<ImportChoices> = {}): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {}, ...over })
const plan = (rows: MbankRow[], ctx = ctxOf()): ImportPlan => planImport(fileOf(rows), MBANK_ACCOUNT_ID, [], ctx)
const owedOf = (p: ImportPlan, c: ImportChoices, open = zl(1000)) => owedWithFile(p, c, () => ({ owed: 0, deposit: 0 }), members.map((m) => m.id), new Map([[jan.id, open]]))
const rule = (over: Partial<ImportRule>): ImportRule => importRuleSchema.parse({ id: makeId(), match: 'x', direction: 'in', kind: 'income', updatedAt: AT, ...over })
const keyOf = (name: string): string => classifyRow(row('2026-10-25', 1, name), ctxOf()).target.brand
const plain: Choice = { kind: 'income', categoryId: null, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
const mamaMoney: Choice = { ...plain, household: true, memberId: MAMA, inflowKind: 'repay' }
const byDate = (p: ImportPlan, parts: Map<string, ReadonlyArray<{ amount: number }>>) => [...p.rows].sort((a, b) => a.row.date.localeCompare(b.row.date)).map((r) => (parts.get(r.key) ?? []).map((x) => x.amount))
/** `listChoice` of the same member's money (`features/import/options.ts`): „spłata, reszta jako zaliczka” – its lines kept as they are. */
const asAdvanceRest = (prev: Choice): Choice => ({ ...prev, kind: 'income', household: true, memberId: MAMA, advance: true, inflowKind: 'repay', shares: prev.shares })

describe('przegląd N2 2.2: część pożyczki z reguły zostaje częścią każdej wpłaty po zmianie decyzji grupy (T358)', () => {
  const partRule = rule({ match: keyOf('ANNA NOWAK'), label: 'ANNA NOWAK', kind: 'income', household: true, memberId: MAMA, loanId: jan.id, loanAmount: zl(200) })
  const rows = [row('2026-10-05', 500, 'ANNA NOWAK'), row('2026-10-15', 500, 'ANNA NOWAK'), row('2026-10-25', 500, 'ANNA NOWAK')]
  const p = plan(rows, ctxOf([partRule]))
  const g = importGroups(p).find((x) => x.label === 'ANNA NOWAK')!

  it('podgląd: 200 zł z każdej z 3 wpłat; grupa zmieniona na „spłata, reszta jako zaliczka” – dalej 200 zł z każdej (przedtem 200 zł tylko z pierwszej)', () => {
    expect(byDate(p, rowShares(p, choicesOf(), owedOf(p, choicesOf())).parts)).toEqual([[zl(200)], [zl(200)], [zl(200)]])
    const c = choicesOf({ groups: { [g.group]: asAdvanceRest(g.proposed) } })
    const spread = rowShares(p, c, owedOf(p, c))
    expect(byDate(p, spread.parts)).toEqual([[zl(200)], [zl(200)], [zl(200)]])
    // Never beyond the loan's debt (450 zł open): po kolei from the oldest, each inflow at most 200 zł.
    expect(byDate(p, rowShares(p, c, owedOf(p, c, zl(450))).parts)).toEqual([[zl(200)], [zl(200)], [zl(50)]])
    // The records: 600 zł to the loan, the rest Mama's money.
    const { create } = buildImport(p, c, { now: NOW, makeId, rules: [partRule], owed: owedOf(p, c) })
    expect(create.map((t) => [t.memberId, t.advance, t.splits.map((s) => [s.loanId, s.amount])])).toEqual([
      [MAMA, true, [[jan.id, zl(200)]]],
      [MAMA, true, [[jan.id, zl(200)]]],
      [MAMA, true, [[jan.id, zl(200)]]]
    ])
    // The group's note: of each inflow, all of it given.
    expect(spread.spread.get(`g:${g.group}`)).toMatchObject([{ line: 0, typed: zl(600), each: zl(200) }])
  })

  it('temat z propozycji reguły zmieniony tak samo – 200 zł z każdej wpłaty tematu', () => {
    const t = importThemes(importGroups(p)).find((x) => x.groups.some((y) => y.group === g.group))!
    expect(t.basis.kind).toBe('proposal')
    const c = choicesOf({ themes: { [t.theme]: asAdvanceRest(g.proposed) } })
    expect(byDate(p, rowShares(p, c, owedOf(p, c)).parts)).toEqual([[zl(200)], [zl(200)], [zl(200)]])
  })

  it('kwota części zmieniona przy grupie – decyzja grupy: razem dla jej wpłat, po kolei (T358, T328)', () => {
    const typed = { ...g.proposed, shares: g.proposed.shares!.map(({ each: _each, ...x }) => ({ ...x, amount: zl(300) })) }
    const c = choicesOf({ groups: { [g.group]: typed } })
    expect(byDate(p, rowShares(p, c, owedOf(p, c)).parts)).toEqual([[zl(300)], [], []])
  })
})

describe('przegląd N2 2.3: reguła uczy się części pożyczki tylko jako kwoty każdej wpłaty (T368)', () => {
  const rows = [row('2026-10-05', 500, 'ANNA NOWAK'), row('2026-10-15', 500, 'ANNA NOWAK'), row('2026-10-25', 500, 'ANNA NOWAK')]
  const loanTotal = (amount: number) => ({ memberId: '', amount, advance: false, loanId: jan.id })

  it('grupa 3 wpłat „w tym spłata pożyczki 600 zł” (razem) – reguła bez części pożyczki (przedtem 600 zł z każdej wpłaty)', () => {
    const p = plan(rows)
    const g = importGroups(p).find((x) => x.label === 'ANNA NOWAK')!
    const c = choicesOf({ groups: { [g.group]: { ...mamaMoney, shares: [loanTotal(zl(600))] } }, remember: { [g.group]: true } })
    const { rules } = buildImport(p, c, { now: NOW, makeId, rules: [], owed: owedOf(p, c) })
    expect(rules.map((r) => [r.label, r.kind, r.memberId, r.loanId ?? null, r.loanAmount ?? null])).toEqual([['ANNA NOWAK', 'income', MAMA, null, null]])
    // The next import: no loan's part proposed at all – never 600 zł of each inflow.
    const next = plan(rows, ctxOf(rules))
    expect(next.rows.map((x) => (x.status === 'new' ? (x.decision.loanPart ?? null) : 'other'))).toEqual([null, null, null])
  })

  it('część z reguły (każdej wpłaty) zostawiona przy zmianie grupy – reguła dalej 200 zł z każdej; grupa jednej wpłaty – jej kwota', () => {
    const partRule = rule({ match: keyOf('ANNA NOWAK'), label: 'ANNA NOWAK', kind: 'income', household: true, memberId: MAMA, loanId: jan.id, loanAmount: zl(200) })
    const p = plan(rows, ctxOf([partRule]))
    const g = importGroups(p).find((x) => x.label === 'ANNA NOWAK')!
    const c = choicesOf({ groups: { [g.group]: asAdvanceRest(g.proposed) }, remember: { [g.group]: true } })
    const { rules } = buildImport(p, c, { now: NOW, makeId, rules: [partRule], owed: owedOf(p, c) })
    expect(rules.map((r) => [r.id, r.loanId ?? null, r.loanAmount ?? null])).toEqual([[partRule.id, jan.id, zl(200)]])
    const one = plan([row('2026-10-05', 500, 'ANNA NOWAK')])
    const g1 = importGroups(one)[0]!
    const c1 = choicesOf({ groups: { [g1.group]: { ...mamaMoney, shares: [loanTotal(zl(300))] } }, remember: { [g1.group]: true } })
    expect(buildImport(one, c1, { now: NOW, makeId, rules: [], owed: owedOf(one, c1) }).rules.map((r) => [r.loanId, r.loanAmount])).toEqual([[jan.id, zl(300)]])
    // The rule's editor: its part is of each inflow (one).
    expect(ruleDecisionOf({ ...mamaMoney, shares: [loanTotal(zl(250))] })).toMatchObject({ loanId: jan.id, loanAmount: zl(250) })
    expect(ruleDecisionOf({ ...mamaMoney, shares: [loanTotal(zl(250))] }, 3)).toMatchObject({ loanId: undefined, loanAmount: undefined })
  })
})

describe('przegląd N2 2.9: „zapamiętaj” wraca do domyślnego, gdy decyzja przestaje spłacać pożyczkę (T358)', () => {
  it('pożyczka wybrana przez pomyłkę (wyłączone), potem pieniądze Mamy – zapamiętaj znowu włączone (przedtem zostawało wyłączone)', () => {
    const loan: Choice = { ...plain, kind: 'loan', loanId: jan.id }
    const first = remembersByDefault(loan, undefined, undefined)
    expect(first).toBe(false)
    expect(remembersByDefault(mamaMoney, loan, first)).toBe(true)
    // Out of a part of a loan the same way; between two loans' repayments – as it was; the user's own „no” of a decision
    // repaying none – kept.
    const part: Choice = { ...mamaMoney, shares: [{ memberId: '', amount: zl(200), advance: false, loanId: jan.id }] }
    expect(remembersByDefault({ ...mamaMoney, advance: true }, part, false)).toBe(true)
    expect([remembersByDefault(part, loan, true), remembersByDefault(part, loan, false)]).toEqual([true, false])
    expect(remembersByDefault({ ...mamaMoney, advance: true }, mamaMoney, false)).toBe(false)
  })
})

describe('przegląd N2 2.14: audyt reguł czyta z „zostaw” tylko reguły zaliczki (T353)', () => {
  it('„to nie duplikat” i „zostaw” innych meldunków nie zmieniają tego, co czyta audyt – nie liczy się od nowa', () => {
    const keys: Array<Record<string, string>> = [{}]
    const add = (k: string) => keys.push({ ...keys.at(-1)!, [k]: NOW })
    add('01KN2RA000000000000000000A|01KN2RB000000000000000000B')
    add('row:mbank|abc')
    add('advanceKept:01KN2RC000000000000000000C:' + MAMA)
    add(advanceRuleKey('01KN2RD000000000000000000D'))
    add('transfer:x')
    add(advanceRuleKey('01KN2RE000000000000000000E'))
    // Each map a new object – as the store writes it; the audit restarts only when what it reads changed.
    let restarts = 0
    let prev: unknown = undefined
    for (const m of keys) {
      const read = advanceRulesKept(m)
      if (!Object.is(read, prev)) restarts++
      prev = read
    }
    expect(restarts).toBe(3)
    expect(advanceRulesKept(keys.at(-1))).toBe([advanceRuleKey('01KN2RD000000000000000000D'), advanceRuleKey('01KN2RE000000000000000000E')].join('\n'))
    expect(advanceRulesKept(undefined)).toBe('')
  })
})
