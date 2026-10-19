import { describe, expect, it } from 'vitest'
import { computeFleet, layersSum, type FleetEvent, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { changeGoal, goalAt, goalDecided, goalInflow, goalTakes, renumber, syncIctjGoals, transferGoal } from '@shared/calc/goals'
import { createDefaultSettings } from '@shared/defaults'
import type { IctjForecast } from '@shared/ictj'
import { balanceSchema, dockingSchema, goalSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Goal, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K2000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const ms = (iso: string) => Date.parse(iso)

const goal = (name: string, target: number, priority: number, over: Partial<Goal> = {}): Goal => goalSchema.parse({ ...base(), name, target, priority, ...over })
/** A goal added in 1.4.2 or later: it takes money from the moment it was added (here: the budget's first morning). */
const fresh = (name: string, target: number, priority: number, over: Partial<Goal> = {}) => goal(name, target, priority, { activeFrom: '2026-10-01T00:00:00.000Z', ...over })
/** Noon in Warsaw that day: a change made on the screen. */
const noon = (date: string) => `${date}T10:00:00.000Z`

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'trading', amount, counterparty: 'XTB S.A.', ...over })
/** A withdrawal from ICTTJ's pool „Cele” (straight to the goals), docked at `docked` (by default on its own day). */
const toGoals = (date: string, amount: number, docked = AT) => {
  const t = tx(date, amount)
  return { t, d: dockingSchema.parse({ ...base(), createdAt: docked, updatedAt: docked, date, transactionId: t.id, pool: 'goals' }) }
}

function settingsWith(over: { layers?: Partial<Settings['layers']> } = {}): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, start: '2026-10-01' }, layers: { ...s.layers, ...over.layers } }
}

function fleet(goals: Goal[], deliveries: Array<{ t: Transaction; d: ReturnType<typeof dockingSchema.parse> }>, over: Partial<FleetInput> = {}): FleetState {
  const state = computeFleet({
    settings: settingsWith(),
    balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(1000) })],
    goals,
    transactions: deliveries.map((x) => x.t),
    dockings: deliveries.map((x) => x.d),
    now: '2026-10-20T12:00:00+02:00',
    ...over
  })
  // The invariant: every złoty on the accounts belongs to exactly one layer.
  expect(layersSum(state)).toBe(state.total)
  return state
}
const amounts = (s: FleetState) => Object.fromEntries(s.goals.map((g) => [g.name, g.amount]))

describe('cele: zmiana liczy się od chwili zmiany (1.4.2, D84 C1, B2)', () => {
  it('zarchiwizowany cel zachowuje to, co dostał wcześniej; nowe dostawy idą do następnego', () => {
    const a = fresh('Rower', zl(2000), 1)
    const b = fresh('Laptop', zl(5000), 2)
    const archived = changeGoal(a, { archived: true }, noon('2026-10-10'))
    expect(archived.past).toEqual([{ until: noon('2026-10-10'), priority: 1, target: zl(2000), archived: false, deadline: null }])
    const s = fleet([archived, b], [toGoals('2026-10-05', zl(1500)), toGoals('2026-10-12', zl(1000))])
    expect(amounts(s)).toEqual({ Rower: zl(1500), Laptop: zl(1000) })
    expect(s.goals.map((g) => [g.name, g.takes])).toEqual([
      ['Rower', false],
      ['Laptop', true]
    ])
  })

  it('ta sama doba: dostawa rano zostaje w celu zarchiwizowanym po południu, wieczorna idzie dalej', () => {
    const a = fresh('Rower', zl(2000), 1)
    const b = fresh('Laptop', zl(5000), 2)
    const archived = changeGoal(a, { archived: true }, '2026-10-10T11:00:00.000Z')
    const morning = toGoals('2026-10-10', zl(500), '2026-10-10T07:00:00.000Z')
    const evening = toGoals('2026-10-10', zl(300), '2026-10-10T16:00:00.000Z')
    expect(amounts(fleet([archived, b], [morning, evening]))).toEqual({ Rower: zl(500), Laptop: zl(300) })
  })

  it('cel sprzed 1.4.2 (bez historii zmian) liczy się jak dotąd – liczby nie skaczą po aktualizacji', () => {
    const legacy = goal('Rower', zl(2000), 1, { archived: true })
    const b = goal('Laptop', zl(5000), 2)
    expect(amounts(fleet([legacy, b], [toGoals('2026-10-05', zl(1500)), toGoals('2026-10-12', zl(1000))]))).toEqual({ Rower: 0, Laptop: zl(2500) })
    expect(goalTakes(legacy, ms(noon('2026-10-05')))).toBe(false)
    // A choice made by hand (the loot) still reaches it, as before 1.4.2.
    expect(goalDecided(legacy, ms(noon('2026-10-05')))).toBe(true)
    // Its first change from 1.4.2 on starts its history: before it, as it was.
    const back = changeGoal(legacy, { archived: false }, noon('2026-10-10'))
    expect(amounts(fleet([back, b], [toGoals('2026-10-05', zl(1500)), toGoals('2026-10-12', zl(1000))]))).toEqual({ Rower: zl(1000), Laptop: zl(1500) })
  })

  it('zmiana kolejności nie przestawia wcześniejszych dostaw', () => {
    const a = fresh('A', zl(1000), 1)
    const b = fresh('B', zl(1000), 2)
    const moved = renumber([b, a], noon('2026-10-10'))
    expect(moved.map((g) => [g.name, g.priority, g.past])).toEqual([
      ['B', 1, [{ until: noon('2026-10-10'), priority: 2, target: zl(1000), archived: false, deadline: null }]],
      ['A', 2, [{ until: noon('2026-10-10'), priority: 1, target: zl(1000), archived: false, deadline: null }]]
    ])
    // 5.10: A first (500 zł); 12.10: B first (700 zł).
    expect(amounts(fleet(moved, [toGoals('2026-10-05', zl(500)), toGoals('2026-10-12', zl(700))]))).toEqual({ A: zl(500), B: zl(700) })
  })

  it('nowa kwota celu obowiązuje od chwili zmiany', () => {
    const a = fresh('A', zl(500), 1)
    const b = fresh('B', zl(5000), 2)
    const raised = changeGoal(a, { target: zl(2000) }, noon('2026-10-10'))
    // 5.10 A had 500 zł to fill (the rest to B); 12.10 it wants 1 500 zł more.
    expect(amounts(fleet([raised, b], [toGoals('2026-10-05', zl(1000)), toGoals('2026-10-12', zl(1000))]))).toEqual({ A: zl(1500), B: zl(500) })
  })

  it('nowy cel nie bierze dostaw sprzed chwili dodania', () => {
    const later = fresh('Nowy', zl(1000), 1, { activeFrom: noon('2026-10-15') })
    const b = goal('Stary', zl(5000), 2)
    expect(amounts(fleet([later, b], [toGoals('2026-10-12', zl(800)), toGoals('2026-10-16', zl(500))]))).toEqual({ Nowy: zl(500), Stary: zl(800) })
    expect(goalTakes(later, ms('2026-10-15T09:59:00.000Z'))).toBe(false)
    expect(goalTakes(later, ms(noon('2026-10-15')))).toBe(true)
  })

  it('dostawa zadokowana później: cele z chwili dokowania (cel scenariusza ICTTJ bierze starszą wypłatę z puli Cele)', () => {
    const trip = fresh('Wakacje', zl(3000), 1, { source: 'ictj', activeFrom: '2026-10-18T08:00:00.000Z' })
    const t = tx('2026-10-08', zl(500))
    const docked = (at: string, saved = at) => dockingSchema.parse({ ...base(), createdAt: at, updatedAt: saved, date: t.date, transactionId: t.id, pool: 'goals' })
    expect(amounts(fleet([trip], [{ t, d: docked('2026-10-18T09:00:00.000Z') }]))).toEqual({ Wakacje: zl(500) })
    // Docked on its own day, before the goal came: the shields.
    expect(amounts(fleet([trip], [{ t, d: docked('2026-10-08T09:00:00.000Z') }]))).toEqual({ Wakacje: 0 })
    // Saved again later (a merge of duplicates, a sync): docked when it was docked – the money does not move.
    expect(amounts(fleet([trip], [{ t, d: docked('2026-10-08T09:00:00.000Z', '2026-10-19T09:00:00.000Z') }]))).toEqual({ Wakacje: 0 })
  })

  it('operacja dopisana po zmianie (późny import): cele z chwili, gdy przyszła do FI', () => {
    // Full shields (3 × 1 000 zł) and hull (6 × 100 zł): an income goes on to the goals.
    const over = (income: Transaction): Partial<FleetInput> => ({
      settings: settingsWith({ layers: { assumedCosts: zl(100) } }),
      balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(1000), envelopes: {} })],
      transactions: [income]
    })
    const a = changeGoal(fresh('A', zl(5000), 1, { activeFrom: '2026-10-03T00:00:00.000Z' }), { archived: true }, noon('2026-10-10'))
    const b = fresh('B', zl(5000), 2, { activeFrom: '2026-10-03T00:00:00.000Z' })
    const income = (createdAt: string) => tx('2026-10-05', zl(800), { kind: 'income', counterparty: 'Klient', createdAt })
    expect(amounts(fleet([a, b], [], over(income('2026-10-12T08:00:00.000Z'))))).toEqual({ A: 0, B: zl(800) })
    expect(amounts(fleet([a, b], [], over(income('2026-10-05T08:00:00.000Z'))))).toEqual({ A: zl(800), B: 0 })
  })

  it('historia zmian: każda zmiana kolejności, kwoty i archiwizacji osobno, nie w chwili dodania i nie przy samej nazwie', () => {
    const a = fresh('A', zl(1000), 3)
    expect(changeGoal(a, { name: 'B' }, noon('2026-10-10')).past).toEqual([])
    expect(changeGoal(a, { target: 1 }, '2026-10-01T00:00:00.000Z').past).toEqual([])
    const once = changeGoal(a, { priority: 1 }, '2026-10-10T08:00:00.000Z')
    const twice = changeGoal(once, { target: zl(3000) }, '2026-10-10T09:00:00.000Z')
    expect(twice.past).toEqual([
      { until: '2026-10-10T08:00:00.000Z', priority: 3, target: zl(1000), archived: false, deadline: null },
      { until: '2026-10-10T09:00:00.000Z', priority: 1, target: zl(1000), archived: false, deadline: null }
    ])
    expect(['2026-10-10T07:59:59.000Z', '2026-10-10T08:00:00.000Z', '2026-10-10T09:30:00.000Z'].map((t) => goalAt(twice, ms(t)))).toEqual([
      { priority: 3, target: zl(1000), archived: false, deadline: null },
      { priority: 1, target: zl(1000), archived: false, deadline: null },
      { priority: 1, target: zl(3000), archived: false, deadline: null }
    ])
    // A malformed entry (a hand-edited file) is dropped, not the whole history; the entries kept in time order.
    const parsed = goalSchema.parse({ ...twice, past: [twice.past[1], { until: 'zła data' }, twice.past[0]] })
    expect(parsed.past).toEqual(twice.past)
  })
})

describe('cele: przeniesienie środków (D84 C2, B30)', () => {
  it('środki zarchiwizowanego celu wracają do osłon na koniec dnia; nowe dostawy już do niego nie trafiają', () => {
    const a = fresh('Rower', zl(2000), 1)
    const out = transferGoal(changeGoal(a, { archived: true }, noon('2026-10-10')), 'shields', zl(1500), noon('2026-10-10'))
    const s = fleet([out], [toGoals('2026-10-05', zl(1500)), toGoals('2026-10-12', zl(300))])
    expect(amounts(s)).toEqual({ Rower: 0 })
    expect(s.shields.amount).toBe(zl(1000) + zl(1500) + zl(300))
    expect(s.log.filter((e) => e.kind === 'goal')).toEqual([{ date: '2026-10-10', kind: 'goal', amount: zl(1500), moves: { goals: { [a.id]: -zl(1500) }, shields: zl(1500) } }])
  })

  it('do innego celu; nieznany cel = osłony; nigdy więcej, niż cel ma; przyszła data jeszcze nie działa', () => {
    const a = fresh('A', zl(2000), 1)
    const b = fresh('B', zl(5000), 2)
    const deliveries = [toGoals('2026-10-05', zl(1500))]
    expect(amounts(fleet([transferGoal(a, b.id, zl(1500), noon('2026-10-10')), b], deliveries))).toEqual({ A: 0, B: zl(1500) })
    expect(amounts(fleet([transferGoal(a, b.id, zl(1000), noon('2026-10-10')), b], deliveries))).toEqual({ A: zl(500), B: zl(1000) })
    const gone = fleet([transferGoal(a, '01K2ZZZZZZZZZZZZZZZZZZZZZZ', zl(9000), noon('2026-10-10')), b], deliveries)
    expect(amounts(gone)).toEqual({ A: 0, B: 0 })
    expect(gone.shields.amount).toBe(zl(2500))
    expect(amounts(fleet([transferGoal(a, 'shields', zl(1500), noon('2026-10-25')), b], deliveries))).toEqual({ A: zl(1500), B: 0 })
  })

  it('tempo wpłat do celów (ETA) nie liczy przeniesień między celami', () => {
    const log: FleetEvent[] = [
      { date: '2026-09-10', kind: 'goal', amount: zl(500), moves: { goals: { a: -zl(500), b: zl(500) } } },
      { date: '2026-09-11', kind: 'trading', amount: zl(300), moves: { goals: { a: zl(300) } } }
    ]
    expect(goalInflow(log, '2026-09-01', '2026-10')).toBe(zl(300))
  })
})

describe('cele: łupy i wydatek z celu (B13, N1)', () => {
  const lootInput = (trip: Goal): Partial<FleetInput> => ({
    balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })],
    months: [
      monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000), envelopes: {}, loot: { decidedAt: '2026-11-02T10:00:00.000Z', shields: zl(1000), nextMonth: zl(900), goals: { [trip.id]: zl(2000) } } }),
      monthPlanSchema.parse({ ...base(), month: '2026-11', salary: zl(4000), envelopes: {} })
    ],
    transactions: [tx('2026-10-05', -zl(100), { kind: 'expense', counterparty: 'Sklep' })],
    dockings: [],
    now: '2026-11-03T12:00:00+01:00'
  })

  it('cel zarchiwizowany przed decyzją o łupach nic z nich nie dostaje – jego część idzie do osłon', () => {
    const trip = fresh('Wyjazd', zl(5000), 1)
    const active = fleet([trip], [], lootInput(trip))
    expect(amounts(active)).toEqual({ Wyjazd: zl(2000) })
    const archived = changeGoal(trip, { archived: true }, noon('2026-10-20'))
    const s = fleet([archived], [], lootInput(archived))
    expect(amounts(s)).toEqual({ Wyjazd: 0 })
    expect(s.shields.amount).toBe(active.shields.amount + zl(2000))
    expect(s.energy).toBe(active.energy)
    // A goal from before 1.4.2 archived since: the loot decided for it still reaches it (as before the update).
    const legacy = goal('Wyjazd', zl(5000), 1, { archived: true })
    expect(amounts(fleet([legacy], [], lootInput(legacy)))).toEqual({ Wyjazd: zl(2000) })
  })

  it('wydatek z pieniędzy celu schodzi z celu (brak – z osłon), zwrot towaru wraca do celu; energia bez zmian', () => {
    const a = fresh('Wakacje', zl(2000), 1)
    const spend = (date: string, amount: number) => tx(date, amount, { kind: 'expense', counterparty: 'Biuro podróży', goalId: a.id })
    const delivery = toGoals('2026-10-05', zl(1500))
    const s = fleet([a], [delivery], { transactions: [delivery.t, spend('2026-10-10', -zl(1000)), spend('2026-10-11', -zl(800)), spend('2026-10-12', zl(200))] })
    expect(amounts(s)).toEqual({ Wakacje: zl(200) })
    expect(s.shields.amount + s.hull.amount).toBe(zl(1000) - zl(300))
    expect(s.energy).toBe(0)
    expect(s.alarms).toEqual([])
  })
})

describe('cele ze scenariusza ICTTJ (C1)', () => {
  const NOW = '2026-10-17T10:00:00.000Z'
  const forecast: IctjForecast = {
    id: '01KPRGN0000000000000000001',
    name: 'Plan',
    currency: 'PLN',
    updatedAt: '2026-10-10T10:00:00.000Z',
    goals: [{ id: '01KG0000000000000000000001', name: 'Wakacje', month: '2027-01', amount: zl(8000), enabled: true }]
  }

  it('nowy cel bierze środki od chwili, w której przyszedł; cel, który zniknął ze scenariusza, zachowuje stan sprzed archiwizacji', () => {
    const first = syncIctjGoals(forecast, [], NOW)
    expect(first.add.map((g) => [g.activeFrom, g.past, g.transfers])).toEqual([[NOW, [], []]])
    const old = goal('Laptop', zl(6000), 2, { source: 'ictj', activeFrom: '2026-10-01T00:00:00.000Z', ictj: { forecastId: forecast.id, goalId: 'X', currency: 'PLN', amount: zl(6000), version: '2026-10-01T10:00:00.000Z' } })
    const sync = syncIctjGoals(forecast, [...first.add, old], NOW)
    expect(sync.update.map((g) => [g.name, g.archived, g.past])).toEqual([['Laptop', true, [{ until: NOW, priority: 2, target: zl(6000), archived: false, deadline: null }]]])
  })
})
