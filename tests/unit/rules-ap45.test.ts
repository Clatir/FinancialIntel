import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { auditRules, withRule } from '@shared/import/audit'
import { classifyRow, decidedByTitle, findRule, ruleTargetOf } from '@shared/import/classify'
import { compileRule, inactiveConditions } from '@shared/import/conditions'
import { keywordProposals } from '@shared/import/learn'
import { parseMbank, type MbankFile, type MbankRow } from '@shared/import/mbank'
import { hintChanges, manualRuleHint, ruleHintText } from '@shared/import/officer'
import { buildImport, importGroups, planImport, type ImportChoices, type NewRow } from '@shared/import/reconcile'
import { decodeText } from '@shared/import/text'
import { isAmountPath } from '@shared/merge'
import { defaultCategoryId, householdMemberSchema, importRuleSchema, importSettingsSchema, MBANK_ACCOUNT_ID, type ImportRule, type RuleCondition, type Transaction } from '@shared/schema'
import { loanSchema } from '@shared/schema/records'

// AP-45 (1.16.0, T467–T471): the rules of conditions („wszystkie (I)” / „którykolwiek (LUB)”), their place among the
// rules of one match, the import, the audit and „Zastosuj do historii” with them, the rules for the entries typed by hand.
const FIXTURE = join(__dirname, '..', 'fixtures', 'mbank', 'lista_operacji.csv')
const fixture = (): MbankFile => parseMbank(decodeText(new Uint8Array(readFileSync(FIXTURE))))
const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const categories = categoryIndex(settings.categories)
const usable = (id: string) => !!categories.byId.get(id) && !categories.byId.get(id)!.archived
const NOW = '2026-11-05T09:00:00.000Z'
let seq = 0
const makeId = () => `01K6${String(++seq).padStart(22, '0')}`
const COFFEE = defaultCategoryId(1, 3)
const FUEL = defaultCategoryId(3, 1)
const RENT = defaultCategoryId(2, 1)
const FUN = defaultCategoryId(6, 0)
const OTHER = defaultCategoryId(9, 0)
const TOMEK = '01K6MEMBER0000000000000001'
const SECOND = '01K6ACC0000000000000000002'
const members = [householdMemberSchema.parse({ id: TOMEK, name: 'Tomek', bankNames: ['TOMASZ xxx'], inflow: 'advance' })]
const ctx = (rules: ImportRule[], over: object = {}) => ({ rules, ownNames: ['JAN KAPITAN'], categories, members, ...over })
const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })

const rule = (over: Partial<ImportRule>): ImportRule =>
  importRuleSchema.parse({ id: makeId(), match: 'orlen', mode: 'exact', direction: 'out', label: 'Orlen', kind: 'expense', categoryId: FUEL, learned: true, hits: 1, updatedAt: NOW, ...over })
const when = (conditions: RuleCondition[], over: Partial<ImportRule> = {}): ImportRule =>
  rule({ mode: 'conditions', match: 'reguła', label: 'Reguła', conditions, combine: 'all', learned: false, categoryId: COFFEE, ...over })
const cp = (value: string): RuleCondition => ({ field: 'counterparty', value })
const title = (value: string): RuleCondition => ({ field: 'title', value })
const amount = (min: number | null, max: number | null): RuleCondition => ({ field: 'amount', min, max })
const account = (value: string): RuleCondition => ({ field: 'account', value })
const target = (counterparty: string, t = '') => ruleTargetOf({ counterparty, title: t }).target

/** A row of the fixture with its name, amount and title set by the test. */
function rowOf(f: MbankFile, counterparty: string, over: Partial<MbankRow> = {}): MbankRow {
  const row = f.rows.find((r) => r.counterparty === counterparty)!
  return { ...row, ...over }
}

describe('AP-45: format reguły z warunkami w fi.json – addytywnie, bez SCHEMA_VERSION', () => {
  it('dotychczasowa reguła czytana bez zmian: żadnych nowych pól; reguła z warunkami zachowuje swoje', () => {
    const old = rule({})
    expect(Object.keys(old)).not.toContain('conditions')
    expect(Object.keys(old)).not.toContain('combine')
    expect(Object.keys(old)).not.toContain('manual')
    const r = when([cp('orlen'), amount(null, 4000)], { manual: true, combine: 'any' })
    const back = importRuleSchema.parse(JSON.parse(JSON.stringify(r)))
    expect(back).toEqual(r)
    expect(back.conditions).toEqual([cp('orlen'), amount(null, 4000)])
  })

  it('warunek nowszej wersji: zachowany w fi.json, a reguła nieaktywna (nigdy stosowana do połowy)', () => {
    const r = importRuleSchema.parse({ ...when([cp('orlen'), { field: 'waluta', value: 'EUR' }]), future: 1 })
    expect(r.conditions?.[1]).toEqual({ field: 'waluta', value: 'EUR' })
    expect((r as Record<string, unknown>).future).toBe(1)
    expect(compileRule(r)).toBeNull()
    expect(inactiveConditions(r)).toBe(true)
    expect(findRule([r], target('ORLEN STACJA'), 'out', -1000)).toBeNull()
    // A broken list of conditions (a hand-edited fi.json): the rule stays, none applied – the others are read.
    const parsed = importSettingsSchema.parse({ rules: [{ ...r, conditions: 'zepsute' }, rule({})] })
    expect(parsed.rules).toHaveLength(2)
    expect(parsed.rules[0]!.conditions).toBeUndefined()
    expect(findRule(parsed.rules, target('ORLEN STACJA'), 'out')?.id).toBe(parsed.rules[1]!.id)
  })

  it('starsza wersja: tryb, którego nie zna, pomija – reguła z warunkami nie działa po samym `match` (pole zgodności)', () => {
    // A version before 1.16.0 reads only the four modes of one match (the same `ruleIndexOf`): an unknown mode – none.
    // A rule of conditions whose `match` is a brand key is never applied by it as an exact rule.
    const r = when([cp('nikt'), amount(null, 100)], { match: 'orlen' })
    expect(findRule([r], target('ORLEN'), 'out', -5000)).toBeNull()
    const future = rule({ mode: 'przyszly' })
    expect(findRule([future], target('ORLEN'), 'out')).toBeNull()
  })

  it('kwoty warunku w historii i konfliktach jako kwoty (ukrycie kwot)', () => {
    expect(isAmountPath(['settings', 'import', 'rules', '#x', 'conditions', '[0]', 'min'])).toBe(true)
    expect(isAmountPath(['settings', 'import', 'rules', 'conditions', 'max'])).toBe(true)
  })
})

describe('AP-45: dopasowanie warunków (T467)', () => {
  it('kontrahent zawiera (jak „zawiera”), tytuł zawiera (słowa, końcówka może być dłuższa), kwota od–do bez znaku, konto', () => {
    const t = target('STACJA ORLEN NR 12 TESTOWO', 'Czynszu za listopad')
    const has = (c: RuleCondition, amountOf?: number, accountId?: string) => !!findRule([when([c])], t, 'out', amountOf, accountId)
    expect(has(cp('orlen'))).toBe(true)
    expect(has(cp('Orlen nr'))).toBe(true)
    expect(has(cp('shell'))).toBe(false)
    expect(has(title('czynsz'))).toBe(true)
    expect(has(title('listopad'))).toBe(true)
    expect(has(title('grudzień'))).toBe(false)
    // A word of the name is no title.
    expect(has(title('orlen'))).toBe(false)
    expect(has(amount(1000, 4000), -1000)).toBe(true)
    expect(has(amount(1000, 4000), 4000)).toBe(true)
    expect(has(amount(1000, 4000), -4001)).toBe(false)
    expect(has(amount(null, 4000), -999999)).toBe(false)
    expect(has(amount(5000, null), -999999)).toBe(true)
    // The amount unknown (a rule's key alone): no condition of it holds.
    expect(has(amount(0, null))).toBe(false)
    expect(has(account(SECOND), -100, SECOND)).toBe(true)
    expect(has(account(SECOND), -100, MBANK_ACCOUNT_ID)).toBe(false)
    expect(has(account(SECOND), -100)).toBe(false)
  })

  it('„wszystkie (I)” – każdy warunek; „którykolwiek (LUB)” – jeden wystarczy; kierunek reguły zawsze razem z nimi', () => {
    const t = target('ORLEN', 'kawa')
    const all = when([cp('orlen'), amount(null, 2000)])
    const any = when([cp('shell'), title('kawa')], { combine: 'any' })
    expect(findRule([all], t, 'out', -1500)?.id).toBe(all.id)
    expect(findRule([all], t, 'out', -2500)).toBeNull()
    expect(findRule([any], t, 'out', -2500)?.id).toBe(any.id)
    expect(findRule([any], target('BP', 'paliwo'), 'out', -2500)).toBeNull()
    // The direction: a rule of expenses never takes money in, whichever its conditions.
    expect(findRule([any], t, 'in', 2500)).toBeNull()
    expect(findRule([{ ...any, direction: null }], t, 'in', 2500)?.id).toBe(any.id)
  })

  it('pierwszeństwo: „wszystkie” z ≥ 2 warunkami przed regułami jednego dopasowania (więcej warunków – wcześniej); jeden warunek i „którykolwiek” – po słowach', () => {
    const t = target('ORLEN', 'kawa mała')
    const exact = rule({})
    const upTo = rule({ mode: 'amount', maxAmount: 4000, categoryId: COFFEE })
    const keyword = rule({ mode: 'keyword', match: 'kawa', direction: null, categoryId: FUN })
    const two = when([cp('orlen'), amount(null, 2000)], { categoryId: OTHER })
    const three = when([cp('orlen'), amount(null, 2000), title('mała')], { categoryId: RENT })
    const one = when([cp('orl')], { categoryId: RENT })
    const anyOf = when([cp('orlen'), title('kawa')], { combine: 'any', categoryId: RENT })
    // Two conditions before the brand up to an amount and the brand.
    expect(findRule([exact, upTo, two], t, 'out', -1500)?.id).toBe(two.id)
    // Three before two, whatever the list's order.
    expect(findRule([exact, two, three], t, 'out', -1500)?.id).toBe(three.id)
    // Not holding – the rules of one match as ever.
    expect(findRule([exact, upTo, two], t, 'out', -3000)?.id).toBe(upTo.id)
    // One condition, „którykolwiek”: after the brand and after the keywords – only where none of them decides.
    expect(findRule([one, anyOf, exact], t, 'out', -1500)?.id).toBe(exact.id)
    expect(findRule([one, anyOf, keyword], target('ORLENIK', 'kawa'), 'out', -1500)?.id).toBe(keyword.id)
    expect(findRule([one, anyOf], target('ORLENIK', 'herbata'), 'out', -1500)?.id).toBe(one.id)
    expect(findRule([anyOf, one], target('ORLENIK', 'herbata'), 'out', -1500)?.id).toBe(anyOf.id)
    // Before the keyword with a counterparty of before too (two conditions of its own).
    const named = rule({ mode: 'keyword', match: 'kawa', counterparty: 'ORLEN', categoryId: FUN })
    expect(findRule([named, two], t, 'out', -1500)?.id).toBe(two.id)
  })

  it('decyzja „o tytule” (słowo z tytułu): reguła z warunkiem tytułu, który pasuje – nie ustępuje rozpoznaniu po nazwie (T325)', () => {
    const t = target('PIOTR KOWALSKI', 'zwrot za pizzę')
    const byTitle = when([cp('piotr'), title('pizz')], { direction: 'in', kind: 'income', categoryId: null })
    const anyOf = when([cp('piotr'), title('obiad')], { combine: 'any', direction: 'in', kind: 'income', categoryId: null })
    const byName = when([cp('piotr'), amount(null, 10000)], { direction: 'in', kind: 'income', categoryId: null })
    expect(decidedByTitle(byTitle, t, 'in', 900)).toBe(true)
    // „którykolwiek”: by the title only when its condition of the title holds.
    expect(decidedByTitle(anyOf, t, 'in', 900)).toBe(false)
    expect(decidedByTitle(anyOf, target('PIOTR KOWALSKI', 'za obiad'), 'in', 900)).toBe(true)
    expect(decidedByTitle(byName, t, 'in', 900)).toBe(false)
  })
})

describe('AP-45: import z regułami z warunkami', () => {
  it('reguła na konto: ten sam plik na dwóch kontach – decyduje tylko na swoim; powód „Twoja reguła „…””', () => {
    const f = fixture()
    const bolt = rowOf(f, 'Bolt', { amount: -1261 })
    const r = when([cp('bolt'), account(SECOND)], { label: 'Bolt służbowy', categoryId: OTHER })
    const here = classifyRow(bolt, { ...ctx([r]), accountId: SECOND })
    expect(here.decision).toMatchObject({ source: 'rule', ruleId: r.id, categoryId: OTHER, reason: 'Twoja reguła „Bolt służbowy”' })
    expect(classifyRow(bolt, { ...ctx([r]), accountId: MBANK_ACCOUNT_ID }).decision.ruleId).toBeNull()
    // `planImport` gives its account to the rows (the rule decides the import of that account only).
    const file = { ...f, rows: [bolt] }
    const on = (acc: string) => (planImport(file, acc, [], ctx([r])).rows[0] as NewRow).decision.ruleId
    expect(on(SECOND)).toBe(r.id)
    expect(on(MBANK_ACCOUNT_ID)).toBeNull()
  })

  it('reguła z warunkiem tytułu na nazwisku osoby z pożyczką zostaje regułą; z warunkiem kwoty – ustępuje zwrotowi pożyczki', () => {
    const f = fixture()
    const piotr = f.rows.find((r) => r.counterparty.startsWith('PIOTR'))!
    const loan = loanSchema.parse({ schemaVersion: 1, id: '01K6PAN0000000000000000001', createdAt: NOW, updatedAt: NOW, updatedBy: 'test', name: 'Piotr', direction: 'given', counterparty: 'PIOTR REDACTED', amount: 50000, date: '2025-01-01', closedAt: null })
    const byTitle = when([cp('piotr'), title(piotr.title.split(/\s+/)[0]!)], { direction: 'in', kind: 'income', categoryId: null })
    const byAmount = when([cp('piotr'), amount(null, 100000)], { direction: 'in', kind: 'income', categoryId: null })
    expect(classifyRow(piotr, ctx([byTitle], { loans: [loan] })).decision).toMatchObject({ kind: 'income', ruleId: byTitle.id, byTitle: true })
    expect(classifyRow(piotr, ctx([byAmount], { loans: [loan] })).decision).toMatchObject({ kind: 'loan', loanId: loan.id })
  })

  it('decyzja grupy z reguły z warunkami („zapamiętaj”) zmienia tę regułę – nie dokłada reguły marki, która by za nią stała', () => {
    const f = fixture()
    const file = { ...f, rows: [rowOf(f, 'Bolt', { amount: -1261 }), rowOf(f, 'Bolt', { amount: -1300, description: 'Bolt 2' })] }
    const r = when([cp('bolt'), amount(null, 2000)], { categoryId: OTHER })
    const plan = planImport(file, MBANK_ACCOUNT_ID, [], ctx([r]))
    const g = (plan.rows[0] as NewRow).group
    const choices = emptyChoices()
    choices.groups[g] = { kind: 'expense', categoryId: FUN, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    choices.remember[g] = true
    const rules = buildImport(plan, choices, { now: NOW, makeId, rules: [r] }).rules
    expect(rules).toHaveLength(1)
    expect(rules[0]).toMatchObject({ id: r.id, mode: 'conditions', categoryId: FUN, conditions: r.conditions, hits: r.hits + 2 })
  })

  it('propozycja słowa (uczenie): wiersz reguły z jednym warunkiem albo „którykolwiek” słowo by przejęło – liczony', () => {
    const f = fixture()
    const rows = [rowOf(f, 'Bolt', { amount: -500, title: 'przejazd lotnisko' }), rowOf(f, 'Bolt', { amount: -600, counterparty: 'FREENOW', description: 'FREENOW x', title: 'przejazd lotnisko' })]
    const late = when([cp('freenow')], { categoryId: OTHER })
    const plan = planImport({ ...f, rows }, MBANK_ACCOUNT_ID, [], ctx([late]))
    expect((plan.rows[1] as NewRow).decision.ruleId).toBe(late.id)
    const groups = importGroups(plan)
    const bolt = groups.find((x) => x.rows.some((p) => p.key === plan.rows[0]!.key))!
    const choice = { kind: 'expense' as const, categoryId: FUN, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    const proposals = keywordProposals(groups, bolt, choice, { rules: [late], choices: emptyChoices(), accountId: MBANK_ACCOUNT_ID })
    expect(proposals.find((p) => p.keyword === 'lotnisko')?.rows).toEqual([plan.rows[1]!.key])
  })

  it('propozycja słowa czyta konto pliku: wiersz reguły „wszystkie” z warunkiem konta zostaje przy niej – nie liczony', () => {
    const f = fixture()
    const rows = [rowOf(f, 'Bolt', { amount: -500, title: 'przejazd lotnisko' }), rowOf(f, 'Bolt', { amount: -600, counterparty: 'FREENOW', description: 'FREENOW x', title: 'przejazd lotnisko' })]
    const mine = when([cp('freenow'), account(SECOND)], { categoryId: OTHER })
    const plan = planImport({ ...f, rows }, SECOND, [], ctx([mine]))
    expect((plan.rows[1] as NewRow).decision.ruleId).toBe(mine.id)
    const groups = importGroups(plan)
    const bolt = groups.find((x) => x.rows.some((p) => p.key === plan.rows[0]!.key))!
    const choice = { kind: 'expense' as const, categoryId: FUN, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    const proposals = keywordProposals(groups, bolt, choice, { rules: [mine], choices: emptyChoices(), accountId: SECOND })
    expect(proposals.find((p) => p.keyword === 'lotnisko')).toBeUndefined()
  })

  it('zwrot towaru szuka reguły zakupu z kontem pliku', () => {
    const f = fixture()
    const back = rowOf(f, 'Bolt', { amount: 1261, operation: 'ZWROT ZAKUPU' })
    const r = when([cp('bolt'), account(SECOND)], { categoryId: OTHER })
    expect(classifyRow(back, { ...ctx([r]), accountId: SECOND }).decision).toMatchObject({ kind: 'expense', categoryId: OTHER, ruleId: r.id })
    expect(classifyRow(back, { ...ctx([r]), accountId: MBANK_ACCOUNT_ID }).decision.ruleId).toBeNull()
  })
})

describe('AP-45: audyt reguł i „Zastosuj do historii” z regułami z warunkami (T469)', () => {
  const op = (over: Partial<Transaction>): Transaction => {
    const f = fixture()
    const plan = planImport({ ...f, rows: [rowOf(f, 'Bolt', { amount: -1261 })] }, MBANK_ACCOUNT_ID, [], ctx([]))
    const t = buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] }).create[0]!
    return { ...t, id: makeId(), ...over }
  }

  it('trafienia na swoim koncie, operacje z inną decyzją do „Zastosuj do historii”, reguła bez trafień', () => {
    const r = when([cp('bolt'), account(SECOND)], { categoryId: OTHER })
    const idle = when([cp('nikt'), amount(1, 2)])
    const there = op({ accountId: SECOND, categoryId: FUN })
    const ok = op({ accountId: SECOND, categoryId: OTHER })
    const elsewhere = op({ accountId: MBANK_ACCOUNT_ID, categoryId: FUN })
    const audit = auditRules([r, idle], [there, ok, elsewhere], {})
    expect(audit.hits.get(r.id)).toEqual([there.id, ok.id])
    expect(audit.differ.get(r.id)?.map((x) => x.before.id)).toEqual([there.id])
    expect(audit.differ.get(r.id)?.[0]?.after).toEqual(withRule(there, r))
    expect(audit.differ.get(r.id)?.[0]?.after.categoryId).toBe(OTHER)
    expect(audit.idle.map((x) => x.id)).toEqual([idle.id])
  })

  it('wpływ od osoby z pożyczką zapisany regułą z warunkami innego rodzaju – „do poprawy” (słowo z tytułu – nie)', () => {
    const loan = loanSchema.parse({ schemaVersion: 1, id: '01K6PAN0000000000000000002', createdAt: NOW, updatedAt: NOW, updatedBy: 'test', name: 'Bolt', direction: 'given', counterparty: 'Bolt', amount: 50000, date: '2025-01-01', closedAt: null })
    const money = op({ amount: 1261, kind: 'income', categoryId: null, title: 'zwrot za bilet' })
    const plain = when([cp('bolt'), amount(null, 5000)], { direction: 'in', kind: 'income', categoryId: null })
    const titled = when([cp('bolt'), title('bilet')], { direction: 'in', kind: 'income', categoryId: null })
    expect(auditRules([plain], [money], {}, [loan]).borrower.get(plain.id)).toHaveLength(1)
    expect(auditRules([titled], [money], {}, [loan]).borrower.get(titled.id)).toBeUndefined()
  })
})

describe('AP-45: reguły dla wpisów ręcznych (T470)', () => {
  const hintCtx = (rules: ImportRule[]) => ({ rules, aliases: {}, usable, members: [{ id: TOMEK }, { id: '01KDEFMEM00000000000000001' }] })

  it('tylko reguła „także dla wpisów ręcznych”: kategoria i kto płaci, po nazwie albo po tytule (notatce)', () => {
    const plain = rule({ match: 'netflix', label: 'Netflix', categoryId: FUN })
    const manual = { ...plain, id: makeId(), manual: true, refundable: true, memberId: TOMEK }
    expect(manualRuleHint({ counterparty: 'Netflix', direction: 'out' }, hintCtx([plain]))).toBeNull()
    const h = manualRuleHint({ counterparty: 'Netflix', direction: 'out' }, hintCtx([plain, manual]))
    expect(h).toMatchObject({ rule: { id: manual.id }, categoryId: FUN, pays: true, refundable: true, memberId: TOMEK, gift: false, share: null })
    expect(ruleHintText(h!, { category: () => 'Rozrywka', member: () => 'Tomek' })).toBe('z reguły „Netflix”: Rozrywka · finansuje: Tomek')
    const byTitle = when([title('czynsz')], { manual: true, label: 'Czynsz', categoryId: RENT })
    expect(manualRuleHint({ counterparty: '', title: 'Czynsz za grudzień', direction: 'out' }, hintCtx([byTitle]))?.categoryId).toBe(RENT)
    expect(manualRuleHint({ counterparty: '  ', direction: 'out' }, hintCtx([byTitle]))).toBeNull()
  })

  it('warunki kwoty i konta wpisu; wpływ i rodzaj inny niż wydatek – bez podpowiedzi', () => {
    const r = when([cp('orlen'), amount(null, 4000), account(SECOND)], { manual: true, label: 'Orlen kawa' })
    const e = { counterparty: 'Orlen', direction: 'out' as const, accountId: SECOND }
    expect(manualRuleHint({ ...e, amount: 3000 }, hintCtx([r]))?.categoryId).toBe(COFFEE)
    expect(manualRuleHint({ ...e, amount: 5000 }, hintCtx([r]))).toBeNull()
    expect(manualRuleHint({ ...e, amount: 3000, accountId: MBANK_ACCOUNT_ID }, hintCtx([r]))).toBeNull()
    // The amount not typed yet: a condition of it does not hold.
    expect(manualRuleHint({ ...e, amount: null }, hintCtx([r]))).toBeNull()
    const income = rule({ manual: true, match: 'firma', direction: 'in', kind: 'income', categoryId: null })
    expect(manualRuleHint({ counterparty: 'Firma', direction: 'in' }, hintCtx([income]))).toBeNull()
  })

  it('kategoria zarchiwizowana – tylko kto płaci; domownik usunięty – tylko kategoria; nic do podpowiedzenia – brak', () => {
    const archived = categoryIndex(settings.categories.map((c) => (c.id === FUN ? { ...c, archived: true } : c)))
    const use = (id: string) => !!archived.byId.get(id) && !archived.byId.get(id)!.archived
    const r = rule({ manual: true, match: 'netflix', categoryId: FUN, refundable: true, memberId: TOMEK })
    expect(manualRuleHint({ counterparty: 'Netflix', direction: 'out' }, { ...hintCtx([r]), usable: use })).toMatchObject({ categoryId: null, pays: true, memberId: TOMEK })
    expect(manualRuleHint({ counterparty: 'Netflix', direction: 'out' }, { ...hintCtx([r]), members: [] })).toMatchObject({ categoryId: FUN, pays: false, refundable: false })
    expect(manualRuleHint({ counterparty: 'Netflix', direction: 'out' }, { ...hintCtx([r]), usable: use, members: [] })).toBeNull()
  })

  it('podpowiedź znika, gdy wpis ma już jej decyzję (`hintChanges`)', () => {
    const r = rule({ manual: true, match: 'netflix', categoryId: FUN, refundable: true, memberId: TOMEK, gift: true })
    const h = manualRuleHint({ counterparty: 'Netflix', direction: 'out' }, hintCtx([r]))!
    const now = { categoryId: FUN, refundable: true, memberId: TOMEK, gift: true, share: null }
    expect(hintChanges(now, h)).toBe(false)
    expect(hintChanges({ ...now, gift: false }, h)).toBe(true)
    expect(hintChanges({ ...now, categoryId: OTHER }, h)).toBe(true)
    expect(hintChanges({ ...now, refundable: false, memberId: null }, h)).toBe(true)
    const shared = rule({ manual: true, match: 'amazon', categoryId: FUN, share: { mode: 'equal', lines: [{ memberId: null, value: 0, gift: false }, { memberId: TOMEK, value: 0, gift: false }] } })
    const s = manualRuleHint({ counterparty: 'Amazon', direction: 'out' }, hintCtx([shared]))!
    expect(hintChanges({ categoryId: FUN, refundable: false, memberId: null, gift: false, share: null }, s)).toBe(true)
    expect(hintChanges({ categoryId: FUN, refundable: false, memberId: null, gift: false, share: s.share }, s)).toBe(false)
    expect(ruleHintText(s, { category: () => 'Rozrywka', member: () => 'Tomek' })).toBe('z reguły „Orlen”: Rozrywka · wspólnie: ja, Tomek')
  })
})
