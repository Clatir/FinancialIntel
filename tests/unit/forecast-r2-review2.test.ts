/**
 * R2 (1.17.0), the review 2 of the course and the forecast (T486): the taken loans' installments as the engine pays them –
 * a container's in the hold this month too, from the month's energy (pkt 1); the assumed costs hold the installment as
 * the history's average does (pkt 2); the hull's target and the range of the later years read the average whole (pkt 3);
 * an installment out and a repayment back in one month never cancel (pkt 4). The examples are counted by hand in their
 * comments; „= silnik” – the course's month against `computeFleet` at that month's end.
 */
import { describe, expect, it } from 'vitest'
import { course, courseIncome, courseInputOf, type CourseInput } from '@shared/calc/course'
import { computeFleet, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { forecast, forecastInputOf, type ForecastAssumptions, type ForecastInput } from '@shared/calc/forecast'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, defaultCategoryId, loanSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Loan, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K7R2R2000000000000000${String(++seq).padStart(3, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const flat: ForecastAssumptions = { wages: 0, inflation: 0, deliveries: 0, oneOff: 0 }
/** `count` installments of `amount` on the `day` of each month from `from` (yyyy-mm). */
const monthly = (from: string, count: number, day: number, amount: number) =>
  Array.from({ length: count }, (_, i) => {
    const n = Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7)) - 1 + i
    return { id: nextId(), date: `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, amount }
  })
const s0 = createDefaultSettings(AT).settings
const settingsFrom = (start: string, initial: { shields: number; hull: number }, layers: Partial<Settings['layers']> = {}): Settings => ({
  ...s0,
  budget: { ...s0.budget, start, initial: { ...initial, goals: {} } },
  layers: { ...s0.layers, ...layers }
})
const opening = (date: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount })
const salaryPlan = (month: string, salary: number) => monthPlanSchema.parse({ ...base(), month, salary, envelopes: {} })
const income = (date: string, amount: number) => tx(date, amount, { kind: 'income', counterparty: 'Pracodawca', categoryId: null })

function run(input: FleetInput): FleetState {
  const f = computeFleet(input)
  expect(layersSum(f)).toBe(f.total)
  return f
}

describe('pkt 1: rata pożyczki z kontenerem w ładowni w tym miesiącu – z energii miesiąca, jak silnik', () => {
  const settings = settingsFrom('2026-08-01', { shields: 0, hull: zl(4000) })
  // 12 000 zł borrowed, 12 installments of 1 000 on the 10th from November (today 4 November – its first still to pay);
  // 3 000 in and 3 000 of costs a month.
  const loanOf = (): Loan => loanSchema.parse({ ...base(), name: 'Pożyczka od brata', direction: 'taken', amount: zl(12000), date: '2026-08-02', schedule: monthly('2026-11', 12, 10, zl(1000)) })
  const plans = [salaryPlan('2026-08', zl(3000))]
  const balances = [opening('2026-08-01', zl(8000))]
  const setup = (withContainer: boolean) => {
    const loan = loanOf()
    const rata = containerSchema.parse({ ...base(), name: 'Rata', type: 'installment', amount: zl(1000), dueMonth: '2026-11', dueDay: 10, from: '2026-11', until: '2027-10', loanId: loan.id })
    const containers = withContainer ? [rata] : []
    const before = [
      ...['2026-08', '2026-09', '2026-10'].flatMap((m) => [tx(`${m}-15`, -zl(3000), { categoryId: FOOD }), income(`${m}-25`, zl(3000))]),
      tx('2026-08-02', zl(12000), { kind: 'loan', loanId: loan.id, categoryId: null })
    ]
    const pay = (date: string) => (withContainer ? tx(date, -zl(1000), { categoryId: null, containerId: rata.id }) : tx(date, -zl(1000), { kind: 'loan', loanId: loan.id, categoryId: null }))
    const fleet = (transactions: Transaction[], now: string) => run({ settings, transactions, loans: [loan], containers, months: plans, balances, now })
    return { containers, before, pay, fleet }
  }

  it('scenariusz recenzji: rata 1 000 zł 10.11, dziś 4.11 – wychodzi w resztce miesiąca; siła floty jak bez kontenera', () => {
    const nets = [true, false].map((withContainer) => {
      const { containers, before, fleet } = setup(withContainer)
      const f = fleet(before, '2026-11-04T12:00:00+01:00')
      const ci = courseInputOf(f, { settings, plans, goals: [], scheduled: [], transactions: before, containers })!
      const fc = forecast(forecastInputOf(f, ci, { scheduled: [], transactions: before }), 'base', flat, 1)
      // 20 000 zł on the accounts, 12 000 of debt: the installments pay the debt with the budget's money – 8 000 a year on
      // (with the container's November installment dropped: 9 000).
      expect(fc.now).toBe(zl(8000))
      expect(fc.years[0]).toMatchObject({ debt: 0, net: zl(8000), short: 0 })
      // The container's installment of this month: the hold's, from the month's energy – not dropped.
      expect(ci.loanFlows?.get('2026-11')).toEqual(withContainer ? { out: 0, cargo: zl(1000), back: 0 } : { out: zl(1000), cargo: 0, back: 0 })
      return fc.years[0]!.net
    })
    expect(nets[0]).toBe(nets[1])
  })

  it('= silnik: listopad (rata z kontenera z energii) i grudzień – osłony, kadłub i pieniądze poza nimi', () => {
    const { containers, before, pay, fleet } = setup(true)
    const a = fleet(before, '2026-11-04T12:00:00+01:00')
    expect(a.energy).toBe(zl(3000))
    // November's installment on the 10th (the month's energy pays it), then December as the course assumes it: the salary
    // on the 1st, the installment on the 10th, the costs on the 15th, the income on the 28th.
    const after = [pay('2026-11-10'), pay('2026-12-10'), tx('2026-12-15', -zl(3000), { categoryId: FOOD }), income('2026-12-28', zl(3000))]
    const b = fleet([...before, ...after], '2026-12-31T20:00:00+01:00')
    const ci = courseInputOf(a, { settings, plans, goals: [], scheduled: [], transactions: before, containers })!
    const m = course({ ...ci, income: courseIncome(a.incomeStats, 'noXtb') }, 'noXtb').months[0]!
    expect(b.total).toBe(a.total - zl(2000))
    // Outside the course's layers: November's energy left less what the rest spends of it (the installment) – the loot
    // (the engine gives it back to the shields at the turn, the course leaves it the month's – D18).
    expect(m.shields + m.hull + (a.energy - zl(1000))).toBe(b.total)
    expect(m.hull).toBe(b.hull.amount)
    expect(b.debt).toBe(zl(10000))
  })

  it('zaległa rata z kontenera (termin minął) – też w tym miesiącu; energia pusta – z osłon', () => {
    const { containers, before, fleet } = setup(true)
    // 20 November: the installment of the 10th unpaid; the month's energy spent whole (3 000 zł on the 12th).
    const spent = [...before, tx('2026-11-12', -zl(3000), { categoryId: FOOD })]
    const f = fleet(spent, '2026-11-20T12:00:00+01:00')
    expect(f.energy).toBe(0)
    const ci = courseInputOf(f, { settings, plans, goals: [], scheduled: [], transactions: spent, containers })!
    const c = course(ci, 'noXtb')
    // Over the month's energy (0) – from the shields, as the engine's „energy-exhausted”.
    expect(c.rest.overEnergy).toBe(zl(1000))
    expect(c.restLow).toBe(Math.max(0, f.shields.amount - zl(1000)))
    expect(ci.loanFlows?.get('2026-11')?.cargo).toBe(zl(1000))
  })
})


describe('pkt 2: przyjęte koszty – rata pożyczki z kontenerem nie płaci się drugi raz', () => {
  // The budget from 1 October – one month of history: the assumed costs 4 000 zł count (`costs.source` 'assumed'); a loan
  // of 6 000 zł, 12 installments of 500 zł from November paid by its container in the hold.
  const settings = settingsFrom('2026-10-01', { shields: zl(12000), hull: zl(8000) }, { assumedCosts: zl(4000) })
  const loan = loanSchema.parse({ ...base(), name: 'Kredyt', direction: 'taken', amount: zl(6000), date: '2026-09-20', schedule: monthly('2026-11', 12, 10, zl(500)) })
  const plans = [salaryPlan('2026-10', zl(4000))]
  const balances = [opening('2026-10-01', zl(20000))]
  const transactions = [tx('2026-10-15', -zl(4000), { categoryId: FOOD }), income('2026-10-25', zl(4000))]
  const rataOf = (over: object = {}) => containerSchema.parse({ ...base(), name: 'Rata', type: 'installment', amount: zl(500), dueMonth: '2026-11', dueDay: 10, from: '2026-11', until: '2027-10', loanId: loan.id, ...over })
  const f = run({ settings, transactions, loans: [loan], containers: [rataOf()], months: plans, balances, now: '2026-11-04T12:00:00+01:00' })
  const inputOf = (containers = [rataOf()]) => courseInputOf(f, { settings, plans, goals: [], scheduled: [], transactions, containers })!

  it('przyjęte 4 000 zł (z ratą 500 zł): miesiąc wydaje 3 500 + rata 500, nie 4 000 + 500; siła floty rośnie o raty', () => {
    expect(f.costs).toMatchObject({ average: zl(4000), source: 'assumed' })
    const ci = inputOf()
    // The assumed costs stand for the average: they hold the container's installment of 500 zł.
    expect(ci.loanCosts).toBe(zl(500))
    const c = course({ ...ci, income: { work: zl(4000), trading: 0 } }, 'noXtb')
    // A month: the salary 4 000 out of the shields, 3 500 + 500 from it, 4 000 in – the money stays (not 500 lower).
    const money = (i: number) => c.months[i]!.shields + c.months[i]!.hull
    expect(money(1)).toBe(money(0))
    expect(money(10)).toBe(money(0))
    // The forecast: the money flat, the debt down by the installments – 6 000 zł a year on.
    const fc = forecast(forecastInputOf(f, ci, { scheduled: [], transactions }), 'base', flat, 1)
    expect(fc.years[0]!.net - fc.now).toBe(zl(6000))
    expect(fc.years[0]!.debt).toBe(0)
  })

  it('kontener pożyczki zarchiwizowany albo po swoim końcu – bez części w przyjętych kosztach; od późniejszego miesiąca – z nią', () => {
    const of = (over: object) => inputOf([rataOf(over)]).loanCosts ?? 0
    expect(of({})).toBe(zl(500))
    expect(of({ archived: true, archivedAt: '2026-11-02T10:00:00.000Z' })).toBe(0)
    expect(of({ from: '2026-01', dueMonth: '2026-01', until: '2026-10' })).toBe(0)
    expect(of({ from: '2027-01', dueMonth: '2027-01' })).toBe(zl(500))
  })
})


describe('pkt 3: od roku 2 cel kadłuba i zasięg z całej średniej × inflacja – bez skoku na granicy roku', () => {
  /** 9 000 zł of shields (full), the salary 3 000, the costs 2 500 holding a loan's 500 a month (its installments – none ahead). */
  const input = (c: Partial<CourseInput> = {}): ForecastInput => {
    const ci: CourseInput = {
      month: '2026-11',
      shields: zl(9000),
      hull: zl(12000),
      goals: [],
      salaryOf: () => zl(3000),
      costs: zl(2500),
      loanCosts: zl(500),
      layers: { shieldSalaries: 3, hullMonths: 6 },
      minShieldSalaries: 1,
      income: { work: 0, trading: 0 },
      extras: new Map(),
      debt: 0,
      ...c
    }
    return { course: ci, work: zl(3000), total: ci.shields + ci.hull + ci.goals.reduce((a, g) => a + g.amount, 0), tanksNow: 0, taxHold: 0, household: 0, given: { open: 0, repayments: [] }, later: new Map() }
  }

  it('zasięg na koniec każdego roku – (osłony + kadłub) ÷ koszty całe (2 500 zł, nie 2 000); wydatki bez rat', () => {
    const f = forecast(input(), 'base', flat, 3)
    for (const y of f.years) expect(y.range).toBeCloseTo((y.shields + y.hull) / zl(2500))
    expect(f.years.map((y) => y.costs)).toEqual([zl(24000), zl(24000), zl(24000)])
    // +1 000 a month every year (3 000 in, 2 000 out): nothing paid twice.
    expect(f.years.map((y) => y.money)).toEqual([zl(33000), zl(45000), zl(57000)])
    // With the inflation (5 %): year 2's range by 2 625 (the whole × 1,05), its spending 2 100 a month.
    const g = forecast(input(), 'cautious', { ...flat, inflation: 5 }, 2)
    expect(g.years[1]!.range).toBeCloseTo((g.years[1]!.shields + g.years[1]!.hull) / zl(2625))
    expect(g.years[1]!.costs).toBe(12 * zl(2100))
  })

  it('kadłub 13 000 zł na początku roku 2: grudzień i styczeń roku 2 – do kadłuba (cel 15 000), nie do celu (cel 12 000 bez rat)', () => {
    // A month: the salary 3 000 out of the shields (9 000 → 6 000), 2 000 spent, 3 000 in – the shields back to their
    // target, what the salary left (1 000) to the shields (the loot – D18); from the second month the income over the
    // costs (1 000) docks into the hull. The hull from 2 000 zł: 13 000 at year 1's end (11 months × 1 000). Year 2's
    // first months dock their 1 000 into the hull (its target 15 000 – the whole average × 6), not into the goal (the
    // docking order – D13); with the costs without the installments as its target (12 000) the goal would take them.
    const goal = { id: 'g1', name: 'Wakacje', amount: 0, target: zl(50000), deadline: null }
    const f = forecast(input({ hull: zl(2000), goals: [goal] }), 'base', flat, 2)
    expect(f.months[11]).toMatchObject({ month: '2027-11', hull: zl(13000), goals: { g1: 0 } })
    expect(f.months[12]).toMatchObject({ month: '2027-12', hull: zl(14000), goals: { g1: 0 } })
    expect(f.months[13]).toMatchObject({ month: '2028-01', hull: zl(15000), goals: { g1: 0 } })
    expect(f.months[14]).toMatchObject({ month: '2028-02', hull: zl(15000), goals: { g1: zl(1000) } })
  })
})


describe('pkt 4: rata wzięta i spłata udzielona w jednym miesiącu – osobno, jak silnik', () => {
  /** 3 000 zł in a month, the costs 3 000, the salary 3 000; December: the installment 1 000 out, 1 000 back of a loan given. */
  const december = (shields: number, hull: number) =>
    course(
      {
        month: '2026-11',
        shields,
        hull,
        goals: [],
        salaryOf: () => zl(3000),
        costs: zl(3000),
        layers: { shieldSalaries: 3, hullMonths: 6 },
        minShieldSalaries: 1,
        income: { work: zl(3000), trading: 0 },
        extras: new Map(),
        loanFlows: new Map([['2026-12', { out: zl(1000), cargo: 0, back: zl(1000) }]]),
        debt: zl(1000),
        installments: [{ month: '2026-12', amount: zl(1000) }]
      },
      'noXtb'
    ).months[0]!

  it('ręcznie: osłony puste po pensji – ratę płaci kadłub, spłata wraca do osłon (nie znoszą się)', () => {
    // 3 000 zł of shields – empty after the salary; 6 000 of hull. The payments first: the hull pays the installment
    // (5 000), the low point 0; then the repayment to the shields (1 000) and the income docked (shields to 4 000).
    expect(december(zl(3000), zl(6000))).toMatchObject({ shields: zl(4000), hull: zl(5000), low: 0, extras: 0 })
  })

  it('ręcznie: osłony pełne – najniższy punkt po racie (8 000 zł), spłata go nie ukrywa', () => {
    // 12 000 zł of shields (their target 9 000): after the salary 9 000, the installment takes them to 8 000.
    expect(december(zl(12000), zl(6000)).low).toBe(zl(8000))
  })

  it('= silnik: rata 4.12 z osłon (puste – z kadłuba), spłata 12.12 do osłon, koszty i przychód', () => {
    // From 1 November: 6 000 zł of shields, 6 000 of hull; the salary 3 000 – November's spent whole, the shields 3 000.
    const settings = settingsFrom('2026-11-01', { shields: zl(6000), hull: zl(6000) })
    const taken = loanSchema.parse({ ...base(), name: 'Od brata', direction: 'taken', amount: zl(5000), date: '2026-10-01', schedule: [{ id: nextId(), date: '2026-12-04', amount: zl(1000) }] })
    const given = loanSchema.parse({ ...base(), name: 'Dla Tomka', direction: 'given', amount: zl(1000), date: '2026-10-02', schedule: [{ id: nextId(), date: '2026-12-12', amount: zl(1000) }] })
    const plans = [salaryPlan('2026-11', zl(3000))]
    const balances = [opening('2026-11-01', zl(12000))]
    const before = [tx('2026-11-15', -zl(3000), { categoryId: FOOD })]
    const fleet = (transactions: Transaction[], now: string) => run({ settings, transactions, loans: [taken, given], months: plans, balances, now })
    const a = fleet(before, '2026-11-30T20:00:00+01:00')
    expect([a.shields.amount, a.hull.amount, a.energy]).toEqual([zl(3000), zl(6000), 0])
    const after = [
      tx('2026-12-04', -zl(1000), { kind: 'loan', loanId: taken.id, categoryId: null }),
      tx('2026-12-12', zl(1000), { kind: 'loan', loanId: given.id, categoryId: null }),
      tx('2026-12-15', -zl(3000), { categoryId: FOOD }),
      income('2026-12-28', zl(3000))
    ]
    const b = fleet([...before, ...after], '2026-12-31T20:00:00+01:00')
    const ci = courseInputOf(a, { settings, plans, goals: [], scheduled: [], transactions: before })!
    const m = course({ ...ci, income: { work: zl(3000), trading: 0 } }, 'noXtb').months[0]!
    expect([m.shields, m.hull]).toEqual([b.shields.amount, b.hull.amount])
    expect([m.shields, m.hull]).toEqual([zl(4000), zl(5000)])
    expect(ci.loanFlows?.get('2026-12')).toEqual({ out: zl(1000), cargo: 0, back: zl(1000) })
  })
})

