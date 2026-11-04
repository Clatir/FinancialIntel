import { describe, expect, it } from 'vitest'
import { amountIn, computeFleet, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { installmentAmounts, monthlySchedule } from '@shared/calc/loans'
import { monthAhead, salarySplit, sinkingOf } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, goalSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, type Container, type Goal, type Settings } from '@shared/schema'

/**
 * AP-11 (AF-44 / LA.8 = C17, AF-52 / C20, AF-51 / PR.9; W5 – „Kurs przechwycenia”): the plan of a month ahead says what
 * the engine will take – the tanks' installments by the engine's rule from its state now (catching up within the cycle),
 * nothing without a salary with the installment wanted beside it, the goals' installments after the ones before them;
 * a loan's installment container carries its schedule's amounts (the rest in the last).
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N2B000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2026-01', ...over })
const plan = (month: string, salary: number) => monthPlanSchema.parse({ ...base(), month, salary, envelopes: {} })
const opening = (date: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount })
const settings = (initial: NonNullable<Settings['budget']['initial']> = { shields: 0, hull: 0, goals: {} }): Settings => {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, start: '2026-10-01', initial } }
}
const categories = createDefaultSettings(AT).settings.categories
function fleet(input: Partial<FleetInput> & { now: string }): FleetState {
  const state = computeFleet({ settings: settings(), transactions: [], ...input })
  if (state.started) expect(layersSum(state)).toBe(state.total)
  return state
}
/** The split of `month` as the Plan shows a month ahead: from the engine's state now (`monthAhead`). */
const ahead = (f: FleetState, month: string, containers: Container[], plans: ReturnType<typeof plan>[], goals: Goal[] = []) => {
  const a = monthAhead({ month, fleet: f, containers, plans, goals })
  const p = plans.filter((x) => x.month <= month).at(-1)!
  return {
    a,
    split: salarySplit(p, month, containers, categories, new Map([...a.tanks].map(([id, t]) => [id, t.amount])), 0, { required: new Map([...a.tanks].map(([id, t]) => [id, t.want])) })
  }
}

describe('AP-11: plan przyszłych miesięcy = silnik', () => {
  it('opłata dodana w trakcie cyklu: plan grudnia–lutego 225,00 zł jak silnik, marzec 75,00 zł (LA.8, C17)', () => {
    // 900 zł a year due in February 2027, added in November 2026: 4 months to collect 900 (T29 – the gap over them).
    const home = container({ name: 'Ubezpieczenie domu', amount: zl(900), cycleMonths: 12, dueMonth: '2027-02', dueDay: 10, from: '2026-11' })
    const plans = [plan('2026-10', zl(4000))]
    const input = { balances: [opening('2026-10-01', zl(60000))], months: plans, containers: [home] }
    const nov = fleet({ ...input, now: '2026-11-05T12:00:00+01:00' })
    expect(sinkingOf(nov.log, '2026-11').get(home.id)).toBe(zl(225))
    const months = ['2026-12', '2027-01', '2027-02', '2027-03'].map((m) => ahead(nov, m, [home], plans).split.tanks.items[0]?.amount)
    expect(months).toEqual([zl(225), zl(225), zl(225), zl(75)])
    // The engine, when the month comes, takes what the plan said.
    const jan = fleet({ ...input, now: '2027-01-05T12:00:00+01:00' })
    expect(sinkingOf(jan.log, '2027-01').get(home.id)).toBe(zl(225))
  })

  it('pensja 0: pobrane 0,00 zł, rata wymagana 103,33 zł obok; miesiąc po nim nadrabia – plan i silnik to samo (C20, AF-52)', () => {
    // OC 1 240 zł due in March 2027, its tank at the plan from the start (6 × 103,33): October and November – 103,33.
    const oc = container({ name: 'OC', amount: zl(1240), cycleMonths: 12, dueMonth: '2027-03', dueDay: 15 })
    const plans = [plan('2026-10', zl(4000)), plan('2026-12', 0), plan('2027-01', zl(4000))]
    const input = { settings: settings({ shields: 0, hull: 0, goals: {}, tanks: { [oc.id]: 6 * 10333 } }), balances: [opening('2026-10-01', zl(60000))], months: plans, containers: [oc] }
    const nov = fleet({ ...input, now: '2026-11-05T12:00:00+01:00' })
    const dec = ahead(nov, '2026-12', [oc], plans)
    expect(dec.a.tanks.get(oc.id)).toEqual({ amount: 0, want: 10333 })
    expect(dec.split.tanks).toMatchObject({ total: 0, required: 10333 })
    expect(dec.split.tanks.items[0]).toMatchObject({ amount: 0, required: 10333 })
    // January catches up the month without a salary over the cycle's 3 months left: 103,33 + 34,44.
    expect(ahead(nov, '2027-01', [oc], plans).split.tanks.items[0]).toMatchObject({ amount: 13777, required: 13777 })
    // The engine in December: nothing taken, what it wanted kept for this month's plan; in January – the same catch-up.
    const decNow = fleet({ ...input, now: '2026-12-05T12:00:00+01:00' })
    expect(sinkingOf(decNow.log, '2026-12').size).toBe(0)
    expect(decNow.tanks[0]).toMatchObject({ amount: 8 * 10333, want: 10333 })
    expect(sinkingOf(fleet({ ...input, now: '2027-01-05T12:00:00+01:00' }).log, '2027-01').get(oc.id)).toBe(13777)
  })

  it('pensja mniejsza niż odkładki: pobrane do pensji, reszta wymagana obok', () => {
    const a = container({ name: 'A', amount: zl(1200), cycleMonths: 12, dueMonth: '2027-09' })
    const b = container({ name: 'B', amount: zl(600), cycleMonths: 12, dueMonth: '2027-09' })
    const plans = [plan('2026-10', zl(4000)), plan('2026-12', zl(120))]
    const nov = fleet({ balances: [opening('2026-10-01', zl(60000))], months: plans, containers: [a, b], now: '2026-11-05T12:00:00+01:00' })
    // December: A wants 100, B 50 – the salary of 120 zł gives A its 100, B the 20 left (the engine's order).
    const dec = ahead(nov, '2026-12', [a, b], plans).a.tanks
    expect([dec.get(a.id), dec.get(b.id)]).toEqual([
      { amount: zl(100), want: zl(100) },
      { amount: zl(20), want: zl(50) }
    ])
  })

  it('„Kurs przechwycenia” w kolejnych miesiącach: 250 zł co miesiąc, nie 250 / 300 / 375 / 500 (W5)', () => {
    const laptop = goalSchema.parse({ ...base(), name: 'Nowy laptop', target: zl(1500), priority: 1, deadline: '2027-05', rates: [{ from: '2026-12', until: null }] })
    const plans = [plan('2026-10', zl(4000))]
    const nov = fleet({ balances: [opening('2026-10-01', zl(60000))], months: plans, goals: [laptop], now: '2026-11-05T12:00:00+01:00' })
    const rates = ['2026-12', '2027-01', '2027-02', '2027-03'].map((m) => monthAhead({ month: m, fleet: nov, containers: [], plans, goals: [laptop] }).rates.get(laptop.id))
    expect(rates).toEqual([zl(250), zl(250), zl(250), zl(250)])
    // Without a salary the engine takes no goal's installment either.
    expect(monthAhead({ month: '2026-12', fleet: nov, containers: [], plans: [...plans, plan('2026-12', 0)], goals: [laptop] }).rates.size).toBe(0)
  })

  it('kontener raty pożyczki z kwotą z harmonogramu: 100 zł w 3 ratach – 33,33 / 33,33 / 33,34 zł w Ładowni i Planie (AF-51)', () => {
    let n = 0
    const schedule = monthlySchedule(zl(100), 3, '2026-11-10', () => `id${++n}`)
    expect(installmentAmounts(schedule)).toEqual({ amount: 3334, past: [{ until: '2026-12', amount: 3333 }] })
    const rate = container({ name: 'Rata: Kredyt R2', type: 'installment', cycleMonths: 1, dueMonth: '2026-11', dueDay: 10, from: '2026-11', until: '2027-01', ...installmentAmounts(schedule) })
    const months = ['2026-11', '2026-12', '2027-01']
    expect(months.map((m) => amountIn(rate, m))).toEqual([3333, 3333, 3334])
    expect(months.map((m) => salarySplit(plan('2026-10', zl(4000)), m, [rate], categories).cargo.total).reduce((x, y) => x + y, 0)).toBe(zl(100))
    // Equal installments: one amount, no history.
    expect(installmentAmounts(monthlySchedule(zl(90), 3, '2026-11-10', () => `id${++n}`))).toEqual({ amount: 3000, past: [] })
  })
})
