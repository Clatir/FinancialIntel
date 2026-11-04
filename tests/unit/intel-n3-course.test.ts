/**
 * N3 (1.15.7), AP-18: the course and the simulator count as Mostek does (AF-32, AF-33, PR sp. 8, WY sp. 3, WY.15).
 */
import { describe, expect, it } from 'vitest'
import { course, courseIncome, courseInputOf, maneuver, type CourseInput } from '@shared/calc/course'
import { computeFleet, layersSum, type FleetInput } from '@shared/calc/fleet'
import { rangeForecast } from '@shared/calc/intel'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, defaultCategoryId, loanSchema, MBANK_ACCOUNT_ID, monthPlanSchema, scheduledSchema, SCHEMA_VERSION, transactionSchema, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K7N300000000000000000${String(++seq).padStart(3, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })

const input = (over: Partial<CourseInput> = {}): CourseInput => ({
  month: '2026-11',
  shields: zl(300),
  hull: 0,
  goals: [],
  salaryOf: () => zl(4000),
  costs: zl(4800),
  layers: { shieldSalaries: 3, hullMonths: 6 },
  minShieldSalaries: 1,
  income: { work: zl(3000), trading: 0 },
  extras: new Map(),
  debt: 0,
  ...over
})

describe('AP-18: kurs i symulator liczą jak Mostek (1.15.7)', () => {
  it('AF-32: puste osłony i kadłub, wpływy poniżej kosztów – pensja częściowa, „brakuje” w miesiącu, osłony nigdy poniżej zera', () => {
    // WY.19 („brzegi”): 300 zł w osłonach, kadłub 0, pensja 4 000, koszty 4 800, wpływ 3 000 zł miesięcznie.
    const c = course(input(), 'median')
    // December: 300 zł of the salary paid (3 700 lacking), 4 500 zł of the costs over it, 3 000 zł in – 1 500 zł lacking.
    expect(c.months[0]).toMatchObject({ month: '2026-12', salary: zl(4000), partial: zl(3700), fromHull: 0, low: 0, short: zl(1500), shields: 0, hull: 0 })
    // Then nothing to pay the salary from: 4 000 zł lacking, 4 800 − 3 000 = 1 800 zł of the costs lacking each month.
    expect(c.months[1]).toMatchObject({ month: '2027-01', partial: zl(4000), short: zl(1800), shields: 0, hull: 0 })
    expect(c.months.every((m) => m.shields >= 0 && m.low >= 0)).toBe(true)
    expect(c.partial).toEqual(c.months.map((m) => m.month))
    expect(c.short).toBe(zl(1500) + 11 * zl(1800))
    expect(c.fromHull).toEqual([])
    expect(c.belowMin).toHaveLength(12)
  })

  it('AF-32: dołek w miesiącu pokryty jego wpływem – bez „brakuje”, osłony na koniec jak saldo; kadłub dopłaca pensję', () => {
    const c = course(input({ shields: zl(1000), hull: zl(500), income: { work: zl(5000), trading: 0 } }), 'median')
    // 1 500 zł of the salary (1 000 shields + 500 hull), 3 300 zł of the costs over it, then 5 000 zł in: 1 700 zł.
    expect(c.months[0]).toMatchObject({ partial: zl(2500), fromHull: zl(500), low: 0, short: 0, shields: zl(1700), hull: 0 })
    expect(c.months[1]).toMatchObject({ partial: zl(2300), fromHull: 0, short: 0, shields: zl(1900) })
    expect(c.short).toBe(0)
    expect(c.fromHull).toEqual(['2026-12'])
  })

  it('AF-33: „teraz” = zasięg silnika (Mostek) przy zaległej spłacie pożyczki udzielonej i boi w tym miesiącu; resztka miesiąca osobno', () => {
    const s0 = createDefaultSettings(AT).settings
    const settings: Settings = { ...s0, budget: { ...s0.budget, start: '2026-08-01', initial: { shields: 0, hull: zl(10000), goals: {} } } }
    const given = loanSchema.parse({ ...base(), name: 'Pożyczka dla Tomka', direction: 'given', amount: zl(1000), date: '2026-08-20', schedule: [{ id: nextId(), date: '2026-09-04', amount: zl(500) }, { id: nextId(), date: '2026-10-05', amount: zl(500) }] })
    const transactions = [
      ...['2026-08', '2026-09', '2026-10'].map((m) => tx(`${m}-15`, -zl(3500), { categoryId: FOOD })),
      tx('2026-08-20', -zl(1000), { kind: 'loan', loanId: given.id, categoryId: null })
    ]
    const scheduled = [scheduledSchema.parse({ ...base(), name: 'Wesele', date: '2026-11-21', amount: -zl(800) })]
    const plans = [monthPlanSchema.parse({ ...base(), month: '2026-08', salary: zl(4000), envelopes: {} })]
    const fleetInput: FleetInput = {
      settings,
      transactions,
      loans: [given],
      months: plans,
      balances: [balanceSchema.parse({ ...base(), date: '2026-08-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(30000) })],
      now: '2026-11-04T12:00:00+01:00'
    }
    const f = computeFleet(fleetInput)
    expect(layersSum(f)).toBe(f.total)
    expect(f.range).not.toBeNull()
    const ci = courseInputOf(f, { settings, plans, goals: [], scheduled, transactions })!
    const c = course({ ...ci, income: courseIncome(f.incomeStats, 'median') }, 'median')
    // The same number as Mostek – nothing of the month's rest in it.
    expect(c.rangeNow).toBe(f.range)
    // The rest: the late repayments of Tomek (+1 000 zł) and the buoy (−800 zł) this month.
    expect(c.rangeRest).toBeCloseTo((f.shields.amount + f.hull.amount + zl(1000) - zl(800) - f.debt) / f.costs.average!)
    expect(c.rangeRest).not.toBe(c.rangeNow)
    // A maneuver's purchase this month is in its „teraz”; the month's buoys are not.
    const after = course(maneuver({ ...ci, income: courseIncome(f.incomeStats, 'median') }, { purchase: { amount: zl(2000), month: '2026-11', from: 'shields' } }), 'median')
    expect(after.rangeNow).toBeCloseTo((f.shields.amount + f.hull.amount - zl(2000) - f.debt) / f.costs.average!)
  })

  it('PR sp. 8: warstwa już pełna (także dokładnie) – pełna „teraz”, nie w następnym miesiącu; zakup z osłon teraz – już nie', () => {
    const over = course(input({ shields: zl(20000), hull: zl(8960), salaryOf: () => zl(5000), costs: zl(1000), income: { work: zl(4000), trading: 0 } }), 'median')
    expect([over.shieldsFull, over.hullFull]).toEqual(['2026-11', '2026-11'])
    const exact = course(input({ shields: zl(15000), hull: zl(6000), salaryOf: () => zl(5000), costs: zl(1000), income: { work: zl(4000), trading: 0 } }), 'median')
    expect([exact.shieldsFull, exact.hullFull]).toEqual(['2026-11', '2026-11'])
    const bought = course(maneuver(input({ shields: zl(15000), hull: zl(6000), salaryOf: () => zl(5000), costs: zl(1000), income: { work: zl(4000), trading: 0 } }), { purchase: { amount: zl(10000), month: '2026-11', from: 'shields' } }), 'median')
    expect(bought.shieldsFull).not.toBe('2026-11')
    // Not full now: the first month it ends full, as before (9 000 → 12 000 → 15 000 zł).
    expect(course(input({ shields: zl(9000), hull: 0, salaryOf: () => zl(5000), costs: zl(1000), income: { work: zl(4000), trading: 0 } }), 'median').shieldsFull).toBe('2027-01')
  })

  it('WY.15: prognoza zasięgu – miesiąc wyczerpania liczony tak samo bez boi i z bojami', () => {
    // The audit's „rok”: 51 566,30 zł of fuel, 6 530,87 zł of costs; the buoys −800 zł now and +1 450 zł in March.
    const r = rangeForecast({ shields: zl(13000), hull: zl(39066.3), debt: zl(500), costs: zl(6530.87), month: '2026-11', plans: new Map([['2026-11', -zl(800)], ['2027-03', zl(1450)]]) })
    expect(r.emptyMonth).toBe('2027-06')
    // June starts with 6 500,21 zł of fuel with the buoys – it runs out in June too (before: „do lipca”).
    expect(r.points.find((p) => p.month === '2027-06')!.withPlans).toBe(zl(6500.21))
    expect(r.plansEmpty).toBe('2027-06')
    // A whole number of months: gone at the next month's start – its last month is the one before.
    expect(rangeForecast({ shields: zl(8000), hull: 0, debt: 0, costs: zl(1000), month: '2026-11' }).emptyMonth).toBe('2027-06')
    expect(rangeForecast({ shields: 0, hull: 0, debt: 0, costs: zl(1000), month: '2026-11' }).emptyMonth).toBe('2026-11')
  })
})
