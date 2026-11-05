/**
 * Group N5 (1.15.9) – AP-21 tags, AP-36 the month's costs up to today, AP-33 the cash on the account „Gotówka” (D100):
 * each fix with a test that fails without it.
 */
import { describe, expect, it } from 'vitest'
import { fuelMonths, fuelSummary } from '@shared/calc/fuel'
import { plainIncomeContext } from '@shared/calc/income'
import { balancesAt, yearNumbers } from '@shared/calc/intel'
import { categoryIndex, upToDay } from '@shared/calc/operations'
import { debriefing } from '@shared/calc/plan'
import { hasTag, knownTags, tagGoalMatch, tagGoalOf, tagKey, tagSummaries, withTags } from '@shared/calc/tags'
import { createDefaultSettings } from '@shared/defaults'
import { classifyRow, isAtmOperation, type ClassifyContext } from '@shared/import/classify'
import { parseMbank, type MbankFile } from '@shared/import/mbank'
import { buildImport, choiceOf, planImport, type ImportChoices, type NewRow } from '@shared/import/reconcile'
import { decodeText } from '@shared/import/text'
import { filterOf, matchesFilter } from '@shared/operationsView'
import { CASH_ACCOUNT_ID, CASH_CATEGORY_ID, cashAccountOf, cashAccountOffer, defaultAccounts, defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type ImportRule, type Transaction } from '@shared/schema'
import { listaCsv } from '../e2e/mbank-csv'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01KN5A0000000000000000${String(++seq).padStart(4, '0')}`
const FOOD = defaultCategoryId(1)
const AUTO = defaultCategoryId(3)
const settings = createDefaultSettings(AT).settings
const categories = settings.categories
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: FOOD, ...over })

// ------------------------------------------------------------------ AP-21

describe('AP-21: „-” i „_” w tagu jak spacja (T291, AF-18)', () => {
  it('„#wakacje-chorwacja” w nazwie i tag „Wakacje Chorwacja” to jedna wyprawa – pierwsza pisownia zostaje', () => {
    expect(tagKey('#wakacje-chorwacja')).toBe('wakacje chorwacja')
    expect(tagKey('Wakacje_Chorwacja')).toBe(tagKey('Wakacje Chorwacja'))
    expect(tagKey('wakacje - chorwacja')).toBe('wakacje chorwacja')
    // A tag of dashes alone is none.
    expect(withTags([], ['-', '#__'])).toEqual([])
    expect(withTags(['wakacje-chorwacja'], ['Wakacje Chorwacja', 'wakacje_chorwacja'])).toEqual(['wakacje-chorwacja'])
    const fromName = tx('2026-07-01', -zl(300), { categoryId: AUTO, tags: ['wakacje-chorwacja'] })
    const typed = tx('2026-07-05', -zl(120), { tags: ['Wakacje Chorwacja'] })
    const list = tagSummaries([fromName, typed], categoryIndex(categories))
    expect(list.map((s) => [s.key, s.label, s.spent, s.count])).toEqual([['wakacje chorwacja', 'wakacje-chorwacja', zl(420), 2]])
    expect(knownTags([fromName, typed])).toEqual(['wakacje-chorwacja'])
    expect(hasTag(typed, tagKey('#wakacje-chorwacja'))).toBe(true)
  })

  it('klucze zapisane przed 1.15.9 – cel wyprawy i filtr zapisanego widoku – pasują same', () => {
    const goal = '01KN5AGOAL0000000000000001'
    // A goal set on „#wakacje-chorwacja” before: its key had the dash.
    const stored = { 'wakacje-chorwacja': goal }
    expect(tagGoalOf(stored, 'Wakacje Chorwacja')).toBe(goal)
    expect(tagGoalMatch(['Wakacje Chorwacja'], stored)).toEqual({ tag: 'Wakacje Chorwacja', goalId: goal })
    expect(tagGoalOf({}, 'Wakacje Chorwacja')).toBe('')
    // A saved view's filter of before: the key with the dash finds both spellings.
    const f = filterOf({ tags: ['wakacje-chorwacja', 'wakacje chorwacja'] }, '2026-07')
    expect(f.tags).toEqual(['wakacje chorwacja'])
    const ctx = { categories: categoryIndex(categories), accounts: settings.accounts, orders: settings.orders }
    const ops = [tx('2026-07-01', -zl(10), { tags: ['wakacje-chorwacja'] }), tx('2026-07-02', -zl(20), { tags: ['Wakacje Chorwacja'] }), tx('2026-07-03', -zl(30), { tags: ['remont'] })]
    expect(ops.filter((t) => matchesFilter(t, f, ctx)).map((t) => t.amount)).toEqual([-zl(10), -zl(20)])
  })
})

// ------------------------------------------------------------------ AP-36

describe('AP-36: koszty miesiąca w toku do dziś, operacje z przyszłą datą osobno – „zaplanowane” (C16)', () => {
  const today = '2026-11-04'
  const ops = () => [
    tx('2026-11-02', -zl(60)),
    tx('2026-11-03', -zl(42)),
    // Dated after today: planned – a bill typed ahead, a product return expected.
    tx('2026-11-10', -zl(50)),
    tx('2026-11-12', zl(10)),
    tx('2026-12-15', -zl(10)),
    tx('2026-11-20', zl(3000), { kind: 'income', categoryId: null })
  ]

  it('debriefing miesiąca w toku: koszty 102,00 (nie 142,00), zaplanowane 40,00; koperty i bez koperty też do dziś', () => {
    const d = debriefing('2026-11', { transactions: ops(), categories, plans: [], today })
    expect(d.costs).toBe(zl(102))
    expect(d.planned).toBe(zl(40))
    expect(d.outside).toEqual([{ categoryId: FOOD, spent: zl(102) }])
    // A month after today: nothing of it counted yet.
    expect(debriefing('2026-12', { transactions: ops(), categories, plans: [], today })).toMatchObject({ costs: 0, planned: zl(10) })
    // The month ended: as before – everything of it.
    expect(debriefing('2026-11', { transactions: ops(), categories, plans: [], today: '2026-12-01' })).toMatchObject({ costs: zl(142), planned: 0 })
  })

  it('przegląd roczny: grudzień bez 10,00 zł w kosztach, zaplanowane osobno; przychód z przyszłą datą też nie wchodzi', () => {
    const y = yearNumbers(ops(), categories, '2026', undefined, today)
    expect(y.costs).toBe(zl(102))
    expect(y.planned).toBe(zl(50))
    expect(y.months.find((m) => m.month === '2026-12')).toEqual({ month: '2026-12', costs: 0, income: 0, planned: zl(10) })
    expect(y.months.find((m) => m.month === '2026-11')).toMatchObject({ costs: zl(102), income: 0, planned: zl(40) })
    expect(y.income).toBe(0)
    // Without the day (an older caller): as before.
    expect(yearNumbers(ops(), categories, '2026').costs).toBe(zl(152))
  })

  it('bilans paliwa miesiąca w toku – te same koszty co debriefing', () => {
    const list = ops()
    const [nov] = fuelMonths(list, plainIncomeContext(list), ['2026-11'], today)
    expect(nov).toMatchObject({ costs: zl(102), income: 0, balance: -zl(102) })
    expect(fuelSummary(list, plainIncomeContext(list), '2026-11', [], today).month?.costs).toBe(zl(102))
    expect(upToDay(list, today).map((t) => t.date)).toEqual(['2026-11-02', '2026-11-03'])
    // None later: the same list (the memos by list keep working).
    const past = list.slice(0, 2)
    expect(upToDay(past, today)).toBe(past)
  })
})

// ------------------------------------------------------------------ AP-33

describe('AP-33: gotówka na koncie „Gotówka” – wypłata z bankomatu to przelew mBank → Gotówka (D100 (1))', () => {
  const today = '2026-11-04'
  const file = (): MbankFile =>
    parseMbank(
      decodeText(
        new TextEncoder().encode(
          listaCsv([{ date: '2026-11-02', amount: 42, name: 'LIDL' }], { from: '2026-11-01', to: '2026-11-03' }, null, [], [
            { date: '2026-11-02', amount: 200, name: 'EURONET TESTOWO' },
            { date: '2026-11-03', amount: 100, name: 'PLANET CASH 22', blik: true }
          ])
        )
      )
    )
  const cats = categoryIndex(categories)
  const cash = { id: CASH_ACCOUNT_ID, name: 'Gotówka' }
  const ctx = (over: Partial<ClassifyContext> = {}): ClassifyContext => ({ rules: [], ownNames: ['JAN KAPITAN'], categories: cats, ...over })
  const atm = (f: MbankFile) => f.rows.filter((r) => isAtmOperation(r.operation))
  const choices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })

  it('bankomat i BLIK – przelew własny na konto gotówki; bez konta – wydatek „Gotówka” jak dawniej', () => {
    const rows = atm(file())
    expect(rows.map((r) => r.operation)).toEqual(['WYPŁATA W BANKOMACIE', 'BLIK WYPŁATA GOTÓWKI'])
    for (const r of rows) {
      expect(classifyRow(r, ctx({ cash })).decision).toMatchObject({ kind: 'transfer', counterAccountId: CASH_ACCOUNT_ID, categoryId: null, source: 'builtin', reason: 'wypłata z bankomatu – przelew własny → Gotówka' })
      expect(classifyRow(r, ctx()).decision).toMatchObject({ kind: 'expense', categoryId: CASH_CATEGORY_ID, counterAccountId: null })
    }
    // A purchase is no withdrawal.
    expect(classifyRow(file().rows.find((r) => r.counterparty === 'LIDL')!, ctx({ cash })).decision.kind).toBe('expense')
  })

  it('reguła starego modelu (wydatek „Gotówka”, także słowo użytkownika) ustępuje przelewowi; inna reguła – nie', () => {
    const rule = (over: Partial<ImportRule>): ImportRule => ({
      id: nextId(),
      match: 'bankomat',
      mode: 'keyword',
      direction: 'out',
      label: 'bankomat',
      kind: 'expense',
      categoryId: CASH_CATEGORY_ID,
      refundable: false,
      household: false,
      memberId: null,
      counterAccountId: null,
      learned: true,
      hits: 1,
      updatedAt: AT,
      ...over
    })
    const [euronet] = atm(file())
    const exact = rule({ match: 'euronettestowo', mode: 'exact' })
    expect(classifyRow(euronet!, ctx({ cash, rules: [exact] })).decision).toMatchObject({ kind: 'transfer', counterAccountId: CASH_ACCOUNT_ID })
    // Without the cash account the rule stays.
    expect(classifyRow(euronet!, ctx({ rules: [exact] })).decision).toMatchObject({ kind: 'expense', source: 'rule', ruleId: exact.id })
    // A rule of another category (the user said so – a gift's cash) stays.
    const gift = rule({ match: 'euronettestowo', mode: 'exact', categoryId: defaultCategoryId(9, 1) })
    expect(classifyRow(euronet!, ctx({ cash, rules: [gift] })).decision).toMatchObject({ kind: 'expense', categoryId: defaultCategoryId(9, 1), source: 'rule' })
  })

  it('„zapamiętaj” wypłaty jako wydatku „Gotówka” przy koncie gotówki nie uczy reguły (następny import i tak by jej nie posłuchał)', () => {
    const learnedOf = (withCash: boolean) => {
      const plan = planImport(file(), MBANK_ACCOUNT_ID, [], ctx(withCash ? { cash } : {}))
      const row = plan.rows.find((p): p is NewRow => p.status === 'new' && p.row.operation === 'WYPŁATA W BANKOMACIE')!
      const c = { ...choiceOf(row.decision), kind: 'expense' as const, categoryId: CASH_CATEGORY_ID, counterAccountId: null }
      const ch = { ...choices(), groups: { [row.group]: c }, remember: { [row.group]: true } }
      return buildImport(plan, ch, { now: AT, makeId: nextId, rules: [], accounts: [MBANK_ACCOUNT_ID, CASH_ACCOUNT_ID] }).rules.map((r) => [r.match, r.kind, r.categoryId])
    }
    expect(learnedOf(true)).toEqual([])
    // Without the cash account the expense „Gotówka” is the app's own proposal – nothing new to learn, as before.
    expect(learnedOf(false)).toEqual([])
    // Another category chosen for the withdrawal is the user's decision – learned.
    const plan = planImport(file(), MBANK_ACCOUNT_ID, [], ctx({ cash }))
    const row = plan.rows.find((p): p is NewRow => p.status === 'new' && p.row.operation === 'WYPŁATA W BANKOMACIE')!
    const ch = { ...choices(), groups: { [row.group]: { ...choiceOf(row.decision), kind: 'expense' as const, categoryId: defaultCategoryId(9, 1), counterAccountId: null } }, remember: { [row.group]: true } }
    expect(buildImport(plan, ch, { now: AT, makeId: nextId, rules: [], accounts: [MBANK_ACCOUNT_ID] }).rules.map((r) => [r.kind, r.categoryId])).toEqual([['expense', defaultCategoryId(9, 1)]])
  })

  it('import: jedna operacja dla obu kont, konto Gotówka rośnie o wypłatę i maleje o zakup gotówką – koszt tylko raz', () => {
    const f = file()
    const plan = planImport(f, MBANK_ACCOUNT_ID, [], ctx({ cash }))
    const built = buildImport(plan, choices(), { now: AT, makeId: nextId, rules: [], accounts: [MBANK_ACCOUNT_ID, CASH_ACCOUNT_ID] })
    const atms = built.create.filter((t) => t.kind === 'transfer')
    expect(atms.map((t) => [t.accountId, t.counterAccountId, t.amount, t.bothSides])).toEqual([
      [MBANK_ACCOUNT_ID, CASH_ACCOUNT_ID, -zl(200), true],
      [MBANK_ACCOUNT_ID, CASH_ACCOUNT_ID, -zl(100), true]
    ])
    // A purchase paid with the cash, typed from the account „Gotówka”.
    const cashBuy = tx('2026-11-03', -zl(55.36), { accountId: CASH_ACCOUNT_ID })
    const all = [...built.create, cashBuy]
    expect(balancesAt([today], all, [], [CASH_ACCOUNT_ID], today)).toEqual([zl(300) - zl(55.36)])
    expect(balancesAt([today], all, [], [MBANK_ACCOUNT_ID], today)).toEqual([-zl(342)])
    // The month's costs: the purchases – never the withdrawal and what was bought with it (OP sp. 7).
    expect(debriefing('2026-11', { transactions: all, categories, plans: [], today }).costs).toBe(zl(42) + zl(55.36))
    // The file's account is the cash itself: no transfer onto itself.
    const self = planImport(f, CASH_ACCOUNT_ID, [], ctx({ cash }))
    expect(self.rows.filter((p): p is NewRow => p.status === 'new' && isAtmOperation(p.row.operation)).map((p) => p.decision.kind)).toEqual(['expense', 'expense'])
  })

  it('konto gotówki: aktywne „cash” (domyślne najpierw); propozycja – przywróć z archiwum, oznacz „Gotówka”, załóż', () => {
    const base = defaultAccounts()
    expect(cashAccountOf(base)?.id).toBe(CASH_ACCOUNT_ID)
    expect(cashAccountOffer(base, nextId)).toBeNull()
    const archived = base.map((a) => (a.id === CASH_ACCOUNT_ID ? { ...a, archived: true } : a))
    expect(cashAccountOf(archived)).toBeNull()
    expect(cashAccountOffer(archived, nextId)).toEqual({ kind: 'restore', account: { ...base[2]!, archived: false } })
    // An account named so by hand (the seed kept out – D69): made the cash.
    const typed = [base[0]!, { id: '01KN5AACC00000000000000001', name: 'gotówka', kind: 'other' as const, importFormat: null, archived: false }]
    expect(cashAccountOffer(typed, nextId)).toMatchObject({ kind: 'mark', account: { id: '01KN5AACC00000000000000001', kind: 'cash', archived: false } })
    // None: a new one, the default id when it is free.
    expect(cashAccountOffer([base[0]!], nextId)).toEqual({ kind: 'create', account: { id: CASH_ACCOUNT_ID, name: 'Gotówka', kind: 'cash', importFormat: null, archived: false } })
    const taken = [base[0]!, { ...base[2]!, name: 'Skarbonka', kind: 'other' as const }]
    expect(cashAccountOffer(taken, () => 'NEW')?.account).toMatchObject({ id: 'NEW', name: 'Gotówka', kind: 'cash' })
  })
})
