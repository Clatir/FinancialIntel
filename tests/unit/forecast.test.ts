/**
 * R2 (1.17.0), AP-44: the forecast for years (T485–T489) – three scenarios, the first year the course for 12 months, the
 * later ones by their assumptions; the net worth at each year's end as the year's review counts it. The examples are
 * counted by hand in their comments.
 */
import { describe, expect, it } from 'vitest'
import { course, courseIncome, courseInputOf, feesDue, restNeeds, type CourseInput } from '@shared/calc/course'
import { computeFleet, layersSum, type FleetInput } from '@shared/calc/fleet'
import {
  assumptionsOf,
  forecast,
  forecastInputOf,
  forecasts,
  FORECAST_DEFAULTS,
  otherFieldsOf,
  readScenario,
  sameAssumptions,
  unreadableScenarios,
  type ForecastAssumptions,
  type ForecastInput
} from '@shared/calc/forecast'
import { containerCostsByMonth } from '@shared/calc/plan'
import { netAdjustments } from '@shared/calc/netWorth'
import { createDefaultSettings } from '@shared/defaults'
import { isAmountPath } from '@shared/merge'
import {
  balanceSchema,
  containerSchema,
  defaultCategoryId,
  FORECAST_MAX_AMOUNT,
  FORECAST_PCT_RANGE,
  loanSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  scheduledSchema,
  SCHEMA_VERSION,
  settingsSchema,
  transactionSchema,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K7R200000000000000000${String(++seq).padStart(3, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })

/** 9 000 zł of shields (3 salaries – full), 12 000 zł of hull (its target 6 × 2 500 = 15 000), the salary 3 000, the costs 2 500. */
const courseInput = (over: Partial<CourseInput> = {}): CourseInput => ({
  month: '2026-11',
  shields: zl(9000),
  hull: zl(12000),
  goals: [],
  salaryOf: () => zl(3000),
  costs: zl(2500),
  layers: { shieldSalaries: 3, hullMonths: 6 },
  minShieldSalaries: 1,
  income: { work: 0, trading: 0 },
  extras: new Map(),
  debt: 0,
  ...over
})

const input = (over: Partial<ForecastInput> = {}, c: Partial<CourseInput> = {}): ForecastInput => {
  const ci = courseInput(c)
  return {
    course: ci,
    work: zl(3000),
    total: ci.shields + ci.hull + ci.goals.reduce((a, g) => a + g.amount, 0),
    tanksNow: 0,
    taxHold: 0,
    household: 0,
    given: { open: 0, repayments: [] },
    later: new Map(),
    ...over
  }
}

const flat: ForecastAssumptions = { wages: 0, inflation: 0, deliveries: 0, oneOff: 0 }
const nets = (f: ReturnType<typeof forecast>) => f.years.map((y) => y.net)

describe('AP-44: prognoza wieloletnia (1.17.0)', () => {
  it('T485: rok 1 to kurs na 12 miesięcy – te same miesiące co kurs „bez wypłat z XTB” (z dostawami: z ich miesięczną częścią)', () => {
    const fi = input()
    const f = forecast(fi, 'base', FORECAST_DEFAULTS.base, 3)
    const c = course({ ...fi.course, income: { work: zl(3000), trading: 0 } }, 'noXtb')
    expect(f.months.slice(0, 12)).toEqual(c.months)
    expect(f.months).toHaveLength(36)
    // 12 000 zł of deliveries a year – 1 000 zł a month in the course's income.
    const d = forecast(fi, 'base', { ...flat, deliveries: zl(12000) }, 1)
    expect(d.months).toEqual(course({ ...fi.course, income: { work: zl(3000), trading: zl(1000) } }, 'noXtb').months)
  })

  it('T485: od roku 2 wpływy z pracy × wzrost (10 %/rok) – siła floty: 21 000 → 27 000 → 36 600 → 50 160 zł', () => {
    const f = forecast(input(), 'optimistic', { ...flat, wages: 10 }, 3)
    // Year 1: 3 000 in, 2 500 out a month – +6 000. Year 2: 3 300 in – +9 600. Year 3: 3 630 in – +13 560.
    expect(f.now).toBe(zl(21000))
    expect(nets(f)).toEqual([zl(27000), zl(36600), zl(50160)])
    expect(f.years.map((y) => y.income)).toEqual([zl(36000), zl(39600), zl(43560)])
    expect(f.years.map((y) => y.month)).toEqual(['2027-11', '2028-11', '2029-11'])
    expect(f.years[2]).toMatchObject({ money: zl(50160), receivables: 0, debt: 0, short: 0 })
    expect(f.years[2]!.shields + f.years[2]!.hull).toBe(zl(50160))
  })

  it('T485: koszty i pensja planu × inflacja (5 %/rok): rok 2 – koszty 2 625, pensja 3 150; rok 3 – koszty 2 756,25', () => {
    const f = forecast(input(), 'cautious', { ...flat, inflation: 5 }, 3)
    // +500 a month, then +375, then +243,75.
    expect(nets(f)).toEqual([zl(27000), zl(31500), zl(34425)])
    expect(f.years.map((y) => y.costs)).toEqual([zl(30000), zl(31500), zl(33075)])
    expect(f.months[12]).toMatchObject({ month: '2027-12', salary: zl(3150) })
    expect(f.months[24]).toMatchObject({ month: '2028-12', salary: zl(3307.5) })
  })

  it('T485: wydatek jednorazowy w ostatnim miesiącu roku, z osłon, w cenach dziś (× inflacja)', () => {
    const f = forecast(input(), 'cautious', { ...flat, inflation: 10, oneOff: zl(6000) }, 2)
    // Year 1: 27 000 − 6 000. Year 2: the costs 2 750 – +250 a month, the one-off 6 600.
    expect(nets(f)).toEqual([zl(21000), zl(17400)])
    expect(f.years.map((y) => y.oneOff)).toEqual([zl(6000), zl(6600)])
    // In the year's last month: November's low point is the shields after it.
    expect(f.months[11]!.low).toBeLessThan(f.months[10]!.low)
  })

  it('T489: dostawy z ICTTJ rocznie ÷ 12, zaokrąglone do grosza raz', () => {
    const f = forecast(input(), 'base', { ...flat, deliveries: zl(1000) }, 1)
    // 1 000 zł a year = 83,33 zł a month (99 996 gr a year).
    expect(f.years[0]!.income).toBe(12 * (zl(3000) + 8333))
    // A growth rounded once from today's: year 4 – 3 333,33 zł × 1,035³ = 3 695,7155… = 3 695,72 zł; each year's amount
    // rounded and grown again would give 3 450,00 → 3 570,75 → 3 695,73 zł.
    const g = forecast(input({ work: 333333 }), 'base', { ...flat, wages: 3.5 }, 4)
    expect(g.years.map((y) => y.income / 12)).toEqual([333333, 345000, 357075, 369572])
  })

  it('T487: braki w siłę floty – osłony do zera w pierwszym miesiącu, brakuje od drugiego, siła floty pod zero', () => {
    // 1 000 zł of shields, no hull, the salary 2 000, the costs 2 000, 1 000 zł in a month: December pays 1 000 of the
    // salary, its costs drain the shields, its income brings them back to zero; then 1 000 zł lacking each month.
    const f = forecast(input({ work: zl(1000), total: zl(1000) }, { shields: zl(1000), hull: 0, salaryOf: () => zl(2000), costs: zl(2000) }), 'cautious', flat, 2)
    expect(f.now).toBe(zl(1000))
    expect(f.years.map((y) => y.short)).toEqual([zl(11000), zl(12000)])
    expect(nets(f)).toEqual([-zl(11000), -zl(23000)])
    expect(f.years[0]!.money).toBe(0)
    expect(f.shieldsEmpty).toBe('2026-12')
    expect(f.shortFrom).toBe('2027-01')
    // Healthy: never.
    const ok = forecast(input(), 'base', flat, 3)
    expect([ok.shieldsEmpty, ok.shortFrom]).toEqual([null, null])
  })

  it('R2 przegląd: „Osłony do zera” – teraz, gdy resztka tego miesiąca je opróżnia (jak „Brakuje na koszty od”)', () => {
    // 1 000 zł of shields, no hull; this month's plan still spends 1 500 over its energy left (0): the shields empty now,
    // 500 lacking.
    const f = forecast(input({ total: zl(1000) }, { shields: zl(1000), hull: 0, energy: { left: 0, needs: zl(1500) } }), 'base', flat, 1)
    expect([f.shieldsEmpty, f.shortFrom]).toEqual(['2026-11', '2026-11'])
    // A buoy of this month taking them whole (the hull pays nothing of it) – zero, nothing lacking.
    const b = forecast(input({ total: zl(13000) }, { shields: zl(1000), extras: new Map([['2026-11', -zl(1000)]]) }), 'base', flat, 1)
    expect([b.shieldsEmpty, b.shortFrom]).toEqual(['2026-11', null])
    // The rest leaving them above zero: not now.
    expect(forecast(input(), 'base', flat, 1).shieldsEmpty).toBeNull()
  })

  it('T485: rok osiągnięcia celu – w roku 2 szybciej przy wyższych wpływach', () => {
    // The shields and the hull full: from January 500 zł a month to the goal (5 500 by November); December of year 2 –
    // 500 more (no growth) or 700 (3 300 in: 800 over the shields' refill).
    const goal = { id: 'g1', name: 'Auto', amount: 0, target: zl(6200), deadline: null }
    const fi = input({ total: zl(24000) }, { hull: zl(15000), goals: [goal] })
    expect(forecast(fi, 'cautious', flat, 3).goalEta).toEqual({ g1: '2028-01' })
    expect(forecast(fi, 'optimistic', { ...flat, wages: 10 }, 3).goalEta).toEqual({ g1: '2027-12' })
    // Not in a forecast of one year; a goal full now – this month.
    expect(forecast(fi, 'cautious', flat, 1).goalEta).toEqual({ g1: null })
    expect(forecast(input({ total: zl(30200) }, { hull: zl(15000), goals: [{ ...goal, amount: zl(6200) }] }), 'base', flat, 2).goalEta).toEqual({ g1: '2026-11' })
  })

  it('T486: rata pożyczki wziętej w swoich miesiącach każdego roku, koszty bez niej: siła floty +12 000 co rok', () => {
    // The costs 2 500 hold the installment of 500 (consumption 2 000): the net worth grows 1 000 a month whether the loan
    // is paid or not. The debt 9 000 – 18 installments from December: 12 in year 1 (the course's extras), 6 in year 2.
    const installments = Array.from({ length: 18 }, (_, i) => ({ month: `${2026 + Math.floor((11 + i) / 12)}-${String(((11 + i) % 12) + 1).padStart(2, '0')}`, amount: zl(500) }))
    expect(installments[0]!.month).toBe('2026-12')
    expect(installments.at(-1)!.month).toBe('2028-05')
    const extras = new Map(installments.filter((i) => i.month <= '2027-11').map((i) => [i.month, -i.amount]))
    const later = new Map(installments.filter((i) => i.month > '2027-11').map((i) => [i.month, -i.amount]))
    const f = forecast(input({ later }, { debt: zl(9000), installments, extras, loanCosts: zl(500) }), 'base', flat, 3)
    expect(f.now).toBe(zl(12000))
    expect(nets(f)).toEqual([zl(24000), zl(36000), zl(48000)])
    expect(f.years.map((y) => y.debt)).toEqual([zl(3000), 0, 0])
    expect(f.years.map((y) => y.costs)).toEqual([zl(24000), zl(24000), zl(24000)])
    // The course spends the average without the installments; its range reads the average whole (Mostek's).
    const c = course({ ...courseInput({ debt: zl(9000), installments, extras, loanCosts: zl(500) }), income: { work: zl(3000), trading: 0 } }, 'noXtb')
    expect(c.months[0]!.shields + c.months[0]!.hull).toBe(zl(21000) + zl(3000) - zl(2000) - zl(500))
    expect(c.months[0]!.range).toBeCloseTo((c.months[0]!.shields + c.months[0]!.hull - zl(8500)) / zl(2500))
  })

  it('T487: spłaty pożyczki udzielonej – pieniądze rosną, należność maleje, siła floty bez zmian; gospodarstwo i podatek', () => {
    // 5 000 zł lent, 1 000 back each month from December 2027 (year 2).
    const repayments = ['2027-12', '2028-01', '2028-02', '2028-03', '2028-04'].map((month) => ({ month, amount: zl(1000) }))
    const later = new Map(repayments.map((r) => [r.month, r.amount]))
    const f = forecast(input({ given: { open: zl(5000), repayments }, later }), 'base', flat, 2)
    const plain = forecast(input(), 'base', flat, 2)
    expect(nets(f)).toEqual(nets(plain).map((v) => v + zl(5000)))
    expect(f.years.map((y) => y.receivables)).toEqual([zl(5000), 0])
    expect(f.years[1]!.money).toBe(plain.years[1]!.money + zl(5000))
    // The household's balance as now; the tax reserve paid within the year – not at a year's end; this month's rest
    // spends what the energy pays of it (600 of 1 000 left) and the tanks' fees due (1 200).
    const g = forecast(input({ total: zl(21000 + 1000 + 1200 + 300), household: zl(250), tanksNow: zl(1200), taxHold: zl(300) }, { energy: { left: zl(1000), needs: zl(600) } }), 'base', flat, 1)
    expect(g.now).toBe(zl(21000 + 1000 + 1200 + 300 + 250))
    expect(g.years[0]!.net).toBe(zl(27000 + 400 + 250))
  })

  it('założenia: zapisane scenariusze z fi.json, brak albo zły – domyślne; kwoty w groszach w historii i konfliktach', () => {
    const s0 = createDefaultSettings(AT).settings
    expect(s0.intel.forecast).toBeUndefined()
    expect(assumptionsOf(s0.intel.forecast)).toEqual(FORECAST_DEFAULTS)
    const parsed = settingsSchema.parse({
      ...s0,
      intel: { ...s0.intel, forecast: { base: { wages: 5, inflation: 2, deliveries: zl(6000), oneOff: zl(1000), later: 'x' }, cautious: { wages: 500, inflation: 2, deliveries: 0, oneOff: 0 } } }
    })
    const a = assumptionsOf(parsed.intel.forecast)
    expect(a.base).toEqual({ wages: 5, inflation: 2, deliveries: zl(6000), oneOff: zl(1000) })
    // A newer version's field kept in the file (a loose object).
    expect((parsed.intel.forecast?.base as Record<string, unknown>).later).toBe('x')
    // 500 % – out of range: the scenario's defaults.
    expect(a.cautious).toEqual(FORECAST_DEFAULTS.cautious)
    expect(a.optimistic).toEqual(FORECAST_DEFAULTS.optimistic)
    // …said, never silently (R2 review – AP-15): unreadable, and kept in the file as it is (the next save writes it back).
    expect(unreadableScenarios(parsed.intel.forecast)).toEqual(['cautious'])
    expect(parsed.intel.forecast?.cautious).toEqual({ wages: 500, inflation: 2, deliveries: 0, oneOff: 0 })
    expect(settingsSchema.parse(JSON.parse(JSON.stringify(parsed))).intel.forecast?.cautious).toEqual({ wages: 500, inflation: 2, deliveries: 0, oneOff: 0 })
    expect(unreadableScenarios(settingsSchema.parse({ ...s0, intel: { ...s0.intel, forecast: { base: 'zły', optimistic: { ...FORECAST_DEFAULTS.optimistic, deliveries: FORECAST_MAX_AMOUNT } } } }).intel.forecast)).toEqual(['base'])
    // The fields' bound is the file's: one grosz more – unreadable.
    expect(readScenario({ ...FORECAST_DEFAULTS.base, oneOff: FORECAST_MAX_AMOUNT })).not.toBeNull()
    expect(readScenario({ ...FORECAST_DEFAULTS.base, oneOff: FORECAST_MAX_AMOUNT + 1 })).toBeNull()
    expect(readScenario({ ...FORECAST_DEFAULTS.base, wages: FORECAST_PCT_RANGE[1] + 0.5 })).toBeNull()
    // A newer version's fields beside the four – kept by an edit and by „domyślne”.
    expect(otherFieldsOf(parsed.intel.forecast?.base)).toEqual({ later: 'x' })
    expect(otherFieldsOf('zły')).toEqual({})
    expect(sameAssumptions(a.optimistic, FORECAST_DEFAULTS.optimistic)).toBe(true)
    expect(sameAssumptions(a.base, FORECAST_DEFAULTS.base)).toBe(false)
    expect(isAmountPath(['settings', 'intel', 'forecast', 'base', 'deliveries'])).toBe(true)
    expect(isAmountPath(['settings', 'intel', 'forecast', 'cautious', 'oneOff'])).toBe(true)
    expect(isAmountPath(['settings', 'intel', 'forecast', 'base', 'wages'])).toBe(false)
    // Each scenario its own; the years 1 … 10.
    const all = forecasts(input(), FORECAST_DEFAULTS, 20)
    expect(all.map((f) => [f.scenario, f.years.length])).toEqual([
      ['cautious', 10],
      ['base', 10],
      ['optimistic', 10]
    ])
  })

  it('T486: opłaty tego miesiąca – zbiornik płaci, co ma, energia resztę (resztka kursu bez zmian)', () => {
    const tanks = [{ containerId: 'oc', name: 'OC', amount: zl(800), dueMonth: '2026-11', paidDue: null, due: zl(1200) }]
    const cargo = [
      { containerId: 'oc', cycleMonths: 12, amount: zl(1200), state: 'waiting' as const },
      { containerId: 'net', cycleMonths: 1, amount: zl(60), state: 'waiting' as const },
      { containerId: 'gym', cycleMonths: 1, amount: zl(100), state: 'paid' as const }
    ]
    expect(feesDue(tanks, cargo)).toEqual({ energy: zl(460), tanks: zl(800) })
    expect(restNeeds({ daily: null, envelopes: [], tanks }, cargo)).toBe(zl(460))
  })
})

describe('AP-44: wejście prognozy ze stanu silnika', () => {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = { ...s0, budget: { ...s0.budget, start: '2026-08-01', initial: { shields: 0, hull: zl(10000), goals: {} } } }
  const given = loanSchema.parse({ ...base(), name: 'Pożyczka dla Tomka', direction: 'given', amount: zl(1000), date: '2026-08-20', schedule: [{ id: nextId(), date: '2026-09-04', amount: zl(500) }, { id: nextId(), date: '2027-12-05', amount: zl(500) }] })
  const taken = loanSchema.parse({
    ...base(),
    name: 'Kredyt',
    direction: 'taken',
    amount: zl(9000),
    date: '2026-08-02',
    schedule: Array.from({ length: 18 }, (_, i) => ({ id: nextId(), date: `${2026 + Math.floor((7 + i) / 12)}-${String(((7 + i) % 12) + 1).padStart(2, '0')}-10`, amount: zl(500) }))
  })
  const rata = containerSchema.parse({ ...base(), name: 'Rata', type: 'installment', amount: zl(500), dueMonth: '2026-08', dueDay: 10, from: '2026-08', until: '2028-01', loanId: taken.id })
  const transactions = [
    ...['2026-08', '2026-09', '2026-10'].map((m) => tx(`${m}-15`, -zl(3500), { categoryId: FOOD })),
    ...['2026-08', '2026-09', '2026-10'].map((m) => tx(`${m}-10`, -zl(500), { categoryId: null, containerId: rata.id })),
    ...['2026-08', '2026-09', '2026-10'].map((m) => tx(`${m}-25`, zl(5000), { kind: 'income', counterparty: 'Pracodawca', categoryId: null })),
    tx('2026-08-02', zl(9000), { kind: 'loan', loanId: taken.id, categoryId: null }),
    tx('2026-08-20', -zl(1000), { kind: 'loan', loanId: given.id, categoryId: null }),
    tx('2026-09-04', zl(500), { kind: 'loan', loanId: given.id, categoryId: null, counterparty: 'Tomek' })
  ]
  // A yearly buoy: −1 200 zł every 15 March; a one-time one in 2029.
  const scheduled = [
    scheduledSchema.parse({ ...base(), name: 'Ubezpieczenie', date: '2027-03-15', amount: -zl(1200), yearly: true }),
    scheduledSchema.parse({ ...base(), name: 'Wesele', date: '2029-06-20', amount: -zl(3000) })
  ]
  const plans = [monthPlanSchema.parse({ ...base(), month: '2026-08', salary: zl(4000), envelopes: {} })]
  const fleetInput: FleetInput = {
    settings,
    transactions,
    loans: [given, taken],
    containers: [rata],
    months: plans,
    balances: [balanceSchema.parse({ ...base(), date: '2026-08-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(30000) })],
    now: '2026-11-04T12:00:00+01:00'
  }

  it('rok 1 = kurs z ekranu; siła floty teraz = przegląd roczny; boje, pożyczki i rata w średniej na kolejne lata', () => {
    const f = computeFleet(fleetInput)
    expect(layersSum(f)).toBe(f.total)
    const ci = courseInputOf(f, { settings, plans, goals: [], scheduled, transactions, containers: [rata] })!
    const fi = forecastInputOf(f, ci, { scheduled, transactions })
    expect(fi.work).toBe(courseIncome(f.incomeStats, 'noXtb').work)
    expect(fi.work).toBe(zl(5000))
    // The average costs (3 500 + 500) hold the installment: 500 a month - the course spends without it, the installments
    // leave in their months – paid by the container in the hold (`cargo`, from the month's energy, as the engine's);
    // November's too (R2 review 2: the fees' state leaves the loans' containers out – it is not `restNeeds`).
    expect(f.costs.average).toBe(zl(4000))
    expect(ci.loanCosts).toBe(zl(500))
    expect(ci.extras.get('2026-11') ?? 0).toBe(0)
    expect(ci.extras.get('2027-03')).toBe(-zl(1200))
    const flow = (m: string) => ci.loanFlows?.get(m)
    expect([flow('2026-11'), flow('2026-12'), flow('2027-11')]).toEqual([0, 0, 0].map(() => ({ out: 0, cargo: zl(500), back: 0 })))
    // Tomek's 500 back and an installment out in one month – apart, never netted (R2 review 2).
    expect(flow('2027-12')).toEqual({ out: 0, cargo: zl(500), back: zl(500) })
    expect(flow('2028-01')).toEqual({ out: 0, cargo: zl(500), back: 0 })
    expect(flow('2028-02')).toBeUndefined()
    // The later years' buoys (from December 2027): every March, the wedding.
    const expected = new Map<string, number>([['2029-06', -zl(3000)], ...['2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035', '2036'].map((y): [string, number] => [`${y}-03`, -zl(1200)])])
    expect(new Map([...fi.later].sort())).toEqual(new Map([...expected].sort()))
    expect(fi.given).toEqual({ open: zl(500), repayments: [{ month: '2027-12', amount: zl(500) }] })
    const fc = forecast(fi, 'base', FORECAST_DEFAULTS.base, 3)
    expect(fc.months.slice(0, 12)).toEqual(course({ ...ci, income: courseIncome(f.incomeStats, 'noXtb') }, 'noXtb').months)
    // „Teraz” as the year's review: the accounts plus the receivables less the debt.
    const [adj] = netAdjustments([f.today], { loans: [given, taken], transactions, containers: [rata], household: f.household, today: f.today })
    expect(fc.now).toBe(f.total + adj!)
    expect(fc.now).toBe(f.total + zl(500) - zl(7500))
  })

  it('R2 przegląd: indeks płatności kontenerów po miesiącu – raz na listę operacji', () => {
    const by = containerCostsByMonth(transactions)
    expect(containerCostsByMonth(transactions)).toBe(by)
    expect([...by.get(rata.id)!]).toEqual([
      ['2026-08', zl(500)],
      ['2026-09', zl(500)],
      ['2026-10', zl(500)]
    ])
    expect(by.size).toBe(1)
  })
})

describe('R2 przegląd: pożyczka wzięta w kursie i prognozie liczy się jak w silniku', () => {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = { ...s0, budget: { ...s0.budget, start: '2026-08-01', initial: { shields: 0, hull: zl(4000), goals: {} } } }
  // 12 000 zł borrowed, 12 installments of 1 000 from December; 3 000 in and 3 000 of costs a month.
  const loanOf = () =>
    loanSchema.parse({
      ...base(),
      name: 'Pożyczka od brata',
      direction: 'taken',
      amount: zl(12000),
      date: '2026-08-02',
      schedule: Array.from({ length: 12 }, (_, i) => ({ id: nextId(), date: `${2026 + Math.floor((11 + i) / 12)}-${String(((11 + i) % 12) + 1).padStart(2, '0')}-10`, amount: zl(1000) }))
    })
  const history = (loanId: string) => [
    ...['2026-08', '2026-09', '2026-10'].flatMap((m) => [tx(`${m}-15`, -zl(3000), { categoryId: FOOD }), tx(`${m}-25`, zl(3000), { kind: 'income', counterparty: 'Pracodawca', categoryId: null })]),
    tx('2026-08-02', zl(12000), { kind: 'loan', loanId, categoryId: null })
  ]
  const plans = [monthPlanSchema.parse({ ...base(), month: '2026-08', salary: zl(3000), envelopes: {} })]
  const balances = [balanceSchema.parse({ ...base(), date: '2026-08-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(8000) })]

  it('scenariusz recenzji: pożyczka bez kontenera – raty wychodzą w roku 1, siła floty bez wzrostu (8 000, nie 20 000)', () => {
    const loan = loanOf()
    const transactions = history(loan.id)
    const f = computeFleet({ settings, transactions, loans: [loan], months: plans, balances, now: '2026-11-04T12:00:00+01:00' })
    expect([f.total, f.debt]).toEqual([zl(20000), zl(12000)])
    const ci = courseInputOf(f, { settings, plans, goals: [], scheduled: [], transactions, containers: [] })!
    const fc = forecast(forecastInputOf(f, ci, { scheduled: [], transactions }), 'base', { ...flat, inflation: 0 }, 2)
    expect(fc.now).toBe(zl(8000))
    expect(fc.years[0]).toMatchObject({ money: zl(8000), debt: 0, net: zl(8000), short: 0 })
    expect(fc.years[1]!.net).toBe(zl(8000))
  })

  it('kurs = silnik w miesiącu z ratą – spłata z osłon (bez kontenera) i rata z kontenera ładowni', () => {
    for (const withContainer of [false, true]) {
      const loan = loanOf()
      const rata = containerSchema.parse({ ...base(), name: 'Rata', type: 'installment', amount: zl(1000), dueMonth: '2026-12', dueDay: 10, from: '2026-12', until: '2027-11', loanId: loan.id })
      const containers = withContainer ? [rata] : []
      const before = history(loan.id)
      // Now: the last evening of November. Then December as the course assumes it: the salary on the 1st, the installment
      // on the 10th, the costs on the 15th, the income on the 28th.
      const a = computeFleet({ settings, transactions: before, loans: [loan], containers, months: plans, balances, now: '2026-11-30T20:00:00+01:00' })
      const december = [
        withContainer ? tx('2026-12-10', -zl(1000), { categoryId: null, containerId: rata.id }) : tx('2026-12-10', -zl(1000), { kind: 'loan', loanId: loan.id, categoryId: null }),
        tx('2026-12-15', -zl(3000), { categoryId: FOOD }),
        tx('2026-12-28', zl(3000), { kind: 'income', counterparty: 'Pracodawca', categoryId: null })
      ]
      const b = computeFleet({ settings, transactions: [...before, ...december], loans: [loan], containers, months: plans, balances, now: '2026-12-31T20:00:00+01:00' })
      const ci = courseInputOf(a, { settings, plans, goals: [], scheduled: [], transactions: before, containers })!
      const m = course({ ...ci, income: courseIncome(a.incomeStats, 'noXtb') }, 'noXtb').months[0]!
      // The money outside the course's layers (November's energy left - the loot) as it was; the rest as the engine's.
      const outside = a.total - a.shields.amount - a.hull.amount
      expect(b.total).toBe(a.total - zl(1000))
      expect(m.shields + m.hull + outside).toBe(b.total)
      expect(b.debt).toBe(zl(11000))
    }
  })
})
