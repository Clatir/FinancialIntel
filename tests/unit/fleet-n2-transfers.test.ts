/**
 * N2 (1.15.6), AP-3 (AF-4 K – MG.8, MG.10, MG.4): a goal's money moved („przenieś środki”) counts at its moment `at`
 * among the operations of its day (T340 instead of T129's „at the end of the day”) – a goal pays as much as the screen
 * shows (T131) and a delivery of the same day fills it only to its target (D13, „każdy do swojej kwoty”).
 */
import { describe, expect, it } from 'vitest'
import { computeFleet, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { overTarget, transferGoal } from '@shared/calc/goals'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, defaultCategoryId, dockingSchema, goalSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Goal, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5200000000000000000${String(++seq).padStart(4, '0')}`
const base = (createdAt = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt, updatedAt: createdAt })
const FUN = defaultCategoryId(6)
const FOOD = defaultCategoryId(1)

/** A goal of always (no `activeFrom`): it takes money whenever it came. */
const goal = (name: string, target: number, priority: number) => goalSchema.parse({ ...base(), name, target, priority })
const tx = (date: string, amount: number, createdAt: string, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ ...base(createdAt), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
/** An XTB inflow (the bank's operation, no time). */
const delivery = (date: string, amount: number, createdAt: string) => tx(date, amount, createdAt, { kind: 'trading', counterparty: 'XTB S.A.' })

/**
 * November 2026, the budget from the 1st with 34 000 zł: the hull 12 000 zł (6 × 2 000 zł of costs – full), Laptop
 * 6 000 zł (full), the rest in the shields – 12 000 zł after the salary of 4 000 zł (3 × 4 000 – full). Goals in this
 * order: Rower 2 500 zł, Laptop 6 000 zł, Wakacje 8 000 zł.
 */
function ship(goals: { rower: Goal; laptop: Goal; wakacje: Goal }, over: Partial<FleetInput> = {}): FleetState {
  const s0 = createDefaultSettings(AT).settings
  const state = computeFleet({
    settings: { ...s0, budget: { ...s0.budget, start: '2026-11-01', initial: { shields: 0, hull: zl(12000), goals: { [goals.laptop.id]: zl(6000) } } }, layers: { ...s0.layers, assumedCosts: zl(2000) } },
    balances: [balanceSchema.parse({ ...base(), date: '2026-11-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(34000) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-11', salary: zl(4000), envelopes: {} })],
    goals: [goals.rower, goals.laptop, goals.wakacje],
    transactions: [],
    now: '2026-11-03T20:00:00+01:00',
    ...over
  })
  // The invariant: every złoty on the accounts belongs to exactly one layer.
  expect(layersSum(state)).toBe(state.total)
  return state
}
const amounts = (s: FleetState) => Object.fromEntries(s.goals.map((g) => [g.name, g.amount]))
const fresh = () => ({ rower: goal('Rower', zl(2500), 1), laptop: goal('Laptop', zl(6000), 2), wakacje: goal('Wakacje', zl(8000), 3) })

describe('AP-3: przeniesienie środków celu w chwili zapisu (T340)', () => {
  it('MG.10: przeniesienie 700 zł na Rower, potem wydatek 900 zł z celu Rower – cel płaci 700 zł, osłony 200 zł', () => {
    const g = fresh()
    // 16:00 – „przenieś środki” 700 zł z Laptopa do Rowera; 16:03 – „Sklep rowerowy” 900 zł z celu Rower (Ctrl+N).
    const laptop = transferGoal(g.laptop, g.rower.id, zl(700), '2026-11-03T15:00:00.000Z')
    const bike = tx('2026-11-03', -zl(900), '2026-11-03T15:03:00.000Z', { kind: 'expense', categoryId: FUN, goalId: g.rower.id, time: '16:03', counterparty: 'Sklep rowerowy' })
    const s = ship({ ...g, laptop }, { transactions: [bike] })
    // Before (T129, the day's end): Rower 700 zł untouched, the shields −900 zł.
    expect(amounts(s)).toEqual({ Rower: 0, Laptop: zl(5300), Wakacje: 0 })
    expect(s.shields.amount).toBe(zl(12000) - zl(200))
    expect(s.log.find((e) => e.txId === bike.id)!.moves).toEqual({ goals: { [g.rower.id]: -zl(700) }, shields: -zl(200) })
  })

  it('MG.8: przeniesienia tego dnia, potem dostawa 9 000 zł – Rower tylko do swoich 2 500 zł, reszta do następnych celów', () => {
    const g = fresh()
    // 2 500 zł z Laptopa na Rower, z Rowera 500 zł do osłon i 300 zł do Wakacji – Rower 1 700 / 2 500 zł na ekranie.
    const laptop = transferGoal(g.laptop, g.rower.id, zl(2500), '2026-11-03T10:00:00.000Z')
    const rower = transferGoal(transferGoal(g.rower, 'shields', zl(500), '2026-11-03T10:05:00.000Z'), g.wakacje.id, zl(300), '2026-11-03T10:06:00.000Z')
    // The inflow of the same day imported after them.
    const xtb = delivery('2026-11-03', zl(9000), '2026-11-03T12:00:00.000Z')
    const s = ship({ ...g, rower, laptop }, { transactions: [xtb] })
    // Before (T129): Rower 4 200 / 2 500 zł, Laptop 3 500 zł – the delivery saw the goals as before the transfers.
    expect(amounts(s)).toEqual({ Rower: zl(2500), Laptop: zl(6000), Wakacje: zl(6000) })
    expect(s.log.find((e) => e.txId === xtb.id)!.moves).toEqual({ shields: 0, goals: { [g.rower.id]: zl(800), [g.laptop.id]: zl(2500), [g.wakacje.id]: zl(5700) } })
    expect(s.shields.amount).toBe(zl(12500))
  })

  it('dostawa zaimportowana przed przeniesieniem, zadokowana po nim – liczy się chwila dokowania (cameIn, T128)', () => {
    const g = fresh()
    const laptop = transferGoal(g.laptop, g.rower.id, zl(2500), '2026-11-03T10:00:00.000Z')
    const rower = transferGoal(g.rower, 'shields', zl(800), '2026-11-03T10:05:00.000Z')
    const xtb = delivery('2026-11-03', zl(9000), '2026-11-03T09:00:00.000Z')
    const docked = dockingSchema.parse({ ...base('2026-11-03T12:00:00.000Z'), date: xtb.date, transactionId: xtb.id, pool: 'current' })
    const s = ship({ ...g, rower, laptop }, { transactions: [xtb], dockings: [docked] })
    expect(amounts(s)).toEqual({ Rower: zl(2500), Laptop: zl(6000), Wakacje: zl(5700) })
    // Not docked yet: the operation came before the transfers – it filled Rower first (what the screen showed then).
    expect(amounts(ship({ ...g, rower, laptop }, { transactions: [xtb] }))).toEqual({ Rower: zl(2500) - zl(800) + zl(2500), Laptop: zl(3500), Wakacje: zl(6500) })
  })

  it('pieniądze, które przyszły przed przeniesieniem, przenosi ono całe (dostawa zadokowana wcześniej tego dnia)', () => {
    const g = fresh()
    const xtb = delivery('2026-11-03', zl(9000), '2026-11-03T08:00:00.000Z')
    const docked = dockingSchema.parse({ ...base('2026-11-03T09:00:00.000Z'), date: xtb.date, transactionId: xtb.id, pool: 'current' })
    // The screen: Rower 2 500 zł from the delivery – all of it moved to Wakacje at 10:00.
    const rower = transferGoal(g.rower, g.wakacje.id, zl(2500), '2026-11-03T10:00:00.000Z')
    // A purchase typed later that day (16:00) – after the transfer.
    const later = tx('2026-11-03', -zl(40), '2026-11-03T15:00:00.000Z', { kind: 'expense', categoryId: FOOD, time: '16:00' })
    const s = ship({ ...g, rower }, { transactions: [xtb, later], dockings: [docked] })
    expect(amounts(s)).toEqual({ Rower: 0, Laptop: zl(6000), Wakacje: zl(6500) + zl(2500) })
  })

  it('czego cel w chwili przeniesienia jeszcze nie ma (wpływ sprzed niego liczony dalej w kolejności dnia), przechodzi na koniec dnia', () => {
    const g = fresh()
    // 09:00 – a hand-typed income of 700 zł (shields and hull full: it fills Rower); 10:00 – all of Rower's 700 zł back to
    // the shields; 12:00 – the bank's file brings a purchase of today (no time: first in the day's order).
    const income = tx('2026-11-03', zl(700), '2026-11-03T08:00:00.000Z', { kind: 'income', time: '09:00', counterparty: 'Zlecenie' })
    const rower = transferGoal(g.rower, 'shields', zl(700), '2026-11-03T09:00:00.000Z')
    const bank = tx('2026-11-03', -zl(50), '2026-11-03T11:00:00.000Z', { kind: 'expense', categoryId: FOOD, counterparty: 'Biedronka' })
    const s = ship({ ...g, rower }, { transactions: [income, bank] })
    expect(amounts(s)).toEqual({ Rower: 0, Laptop: zl(6000), Wakacje: 0 })
    expect(s.shields.amount).toBe(zl(12700))
    expect(s.log.filter((e) => e.kind === 'goal')).toEqual([{ date: '2026-11-03', kind: 'goal', amount: zl(700), moves: { goals: { [g.rower.id]: -zl(700) }, shields: zl(700) } }])
  })

  it('wydatek z celu wpisany przed przeniesieniem do niego – płacą osłony, jak pokazał wtedy ekran', () => {
    const g = fresh()
    const bike = tx('2026-11-03', -zl(500), '2026-11-03T08:00:00.000Z', { kind: 'expense', categoryId: FUN, goalId: g.rower.id, time: '09:00' })
    const laptop = transferGoal(g.laptop, g.rower.id, zl(700), '2026-11-03T09:00:00.000Z')
    const s = ship({ ...g, laptop }, { transactions: [bike] })
    expect(amounts(s)).toEqual({ Rower: zl(700), Laptop: zl(5300), Wakacje: 0 })
    expect(s.shields.amount).toBe(zl(11500))
  })

  it('dzień bez operacji: przeniesienie na jego koniec, przed przełomem miesiąca (pensja z osłon, nie z kadłuba)', () => {
    const g = fresh()
    // October with the salary of 4 000 zł; on 31 October evening 3 000 zł of Laptop back to the shields – the 1 November
    // salary is paid from the shields then.
    const s0 = createDefaultSettings(AT).settings
    const laptop = transferGoal(g.laptop, 'shields', zl(3000), '2026-10-31T19:00:00.000Z')
    const s = computeFleet({
      settings: { ...s0, budget: { ...s0.budget, start: '2026-10-01', initial: { shields: 0, hull: zl(12000), goals: { [g.laptop.id]: zl(6000) } } }, layers: { ...s0.layers, assumedCosts: zl(2000) } },
      balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(24000) })],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000), envelopes: {} })],
      goals: [g.rower, laptop, g.wakacje],
      // October's energy spent: the shields 2 000 zł before the turn.
      transactions: [tx('2026-10-20', -zl(4000), '2026-10-20T10:00:00.000Z', { kind: 'expense', categoryId: FOOD })],
      now: '2026-11-02T12:00:00+01:00'
    })
    expect(layersSum(s)).toBe(s.total)
    expect(s.alarms.filter((a) => a.kind === 'salary-from-hull')).toEqual([])
    expect([s.shields.amount, s.hull.amount, amounts(s).Laptop]).toEqual([zl(2000) + zl(3000) - zl(4000), zl(12000), zl(3000)])
  })

  it('przeniesienie z przyszłą datą jeszcze nie działa; nigdy więcej, niż cel ma', () => {
    const g = fresh()
    expect(amounts(ship({ ...g, laptop: transferGoal(g.laptop, g.rower.id, zl(700), '2026-11-04T10:00:00.000Z') }))).toEqual({ Rower: 0, Laptop: zl(6000), Wakacje: 0 })
    expect(amounts(ship({ ...g, laptop: transferGoal(g.laptop, g.rower.id, zl(9000), '2026-11-03T10:00:00.000Z') }))).toEqual({ Rower: zl(6000), Laptop: 0, Wakacje: 0 })
  })
})

describe('AP-3: ostrzeżenie przy przeniesieniu do celu pełnego (MG.4)', () => {
  it('cel pełny albo ponad kwotę – wszystko ponad; niepełny – reszta ponad brakujące; cel bez kwoty – bez ostrzeżenia', () => {
    // MG.4: Wakacje 2027 „9 500,00 zł / 8 000,00”.
    expect(overTarget({ amount: zl(9500), target: zl(8000) }, zl(1500))).toEqual({ lacks: 0, over: zl(1500) })
    expect(overTarget({ amount: zl(8000), target: zl(8000) }, zl(1))).toEqual({ lacks: 0, over: zl(1) })
    // MG.8: Rower 1 700 / 2 500 zł, 2 381,08 zł more – 1 581,08 zł over.
    expect(overTarget({ amount: zl(1700), target: zl(2500) }, zl(2381.08))).toEqual({ lacks: zl(800), over: zl(1581.08) })
    expect(overTarget({ amount: zl(1700), target: zl(2500) }, zl(800))).toBeNull()
    expect(overTarget({ amount: 0, target: 0 }, zl(500))).toBeNull()
    expect(overTarget({ amount: zl(100), target: zl(500) }, 0)).toBeNull()
  })
})
