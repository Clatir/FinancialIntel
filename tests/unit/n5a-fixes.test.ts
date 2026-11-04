/**
 * Group N5 (1.15.9) – AP-21 tags, AP-36 the month's costs up to today, AP-33 the cash on the account „Gotówka” (D100):
 * each fix with a test that fails without it.
 */
import { describe, expect, it } from 'vitest'
import { fuelMonths, fuelSummary } from '@shared/calc/fuel'
import { plainIncomeContext } from '@shared/calc/income'
import { yearNumbers } from '@shared/calc/intel'
import { categoryIndex, upToDay } from '@shared/calc/operations'
import { debriefing } from '@shared/calc/plan'
import { hasTag, knownTags, tagGoalMatch, tagGoalOf, tagKey, tagSummaries, withTags } from '@shared/calc/tags'
import { createDefaultSettings } from '@shared/defaults'
import { filterOf, matchesFilter } from '@shared/operationsView'
import { defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

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
