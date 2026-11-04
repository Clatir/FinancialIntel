/**
 * N2 (1.15.6), the code review of the money engine (findings 1, 3, 4, 5, 12): „Zadokuj” without changes confirms the split
 * a pair already has (T363), the start wizard reads a fee's payments as the engine (T345), a late payment before the start
 * pays the cycle before (T135), „w tym do zadokowania” – what is still in the goals (T342), an inflow typed on Portfel XTB
 * paired with its ICTTJ entry (B69) – the last delivery, its member's part apart.
 */
import { describe, expect, it } from 'vitest'
import { paymentsIndex } from '@shared/calc/cargoStatus'
import { deliveries, pendingPairsOf, previewDocking, type DeliveriesInput } from '@shared/calc/dock'
import { computeFleet, layersSum, paidBeforeStart, type FleetInput, type FleetState, type PendingPair } from '@shared/calc/fleet'
import { transferGoal } from '@shared/calc/goals'
import { sinkingOf } from '@shared/calc/plan'
import { startPaidDays, startTanks } from '@shared/calc/start'
import { deliveryWhy } from '@shared/calc/why'
import { createDefaultSettings } from '@shared/defaults'
import type { IctjEntry } from '@shared/ictj'
import {
  balanceSchema,
  containerSchema,
  defaultCategoryId,
  dockingSchema,
  goalSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
  type Container,
  type Docking,
  type Goal,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9R2V000000000000000${String(++seq).padStart(4, '0')}`
const base = (createdAt = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt, updatedAt: createdAt })
const FOOD = defaultCategoryId(1)
const FUN = defaultCategoryId(6)

const tx = (date: string, amount: number, createdAt: string, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ ...base(createdAt), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
/** An XTB inflow of the bank (no time). */
const delivery = (date: string, amount: number, createdAt: string) => tx(date, amount, createdAt, { kind: 'trading', counterparty: 'XTB S.A.' })
const entry = (date: string, amount: number, over: Partial<IctjEntry> = {}): IctjEntry => ({ id: nextId(), kind: 'withdrawal', date, amount, pool: 'current', note: '', updatedAt: null, ...over })
const goal = (name: string, target: number, priority: number, over: Partial<Goal> = {}) => goalSchema.parse({ ...base(), name, target, priority, ...over })
/** The docking of a payout with its ICTTJ entry, made at `createdAt`, without a changed split (the pool's). */
const docking = (t: Transaction, e: IctjEntry, createdAt: string, over: Partial<Docking> = {}): Docking =>
  dockingSchema.parse({ ...base(createdAt), date: t.date, transactionId: t.id, ictjEntryId: e.id, entryDate: e.date, pool: e.pool, ...over })
const list = (over: Partial<DeliveriesInput>) => deliveries({ entries: [], transactions: [], dockings: [], start: '2026-11-01', today: '2026-11-03', skipped: [], ictjOn: true, coveredTo: null, ...over })
/** The pairs as the renderer gives them to the engine: from the deliveries' list. */
const pairsOf = (o: Partial<DeliveriesInput>): Map<string, PendingPair> => pendingPairsOf(list(o))

type Ship = Partial<FleetInput> & { goals: Goal[]; initial?: Record<string, number> }

/**
 * November 2026, the budget from the 1st with 34 000 zł: the hull 12 000 zł (6 × 2 000 zł of costs – full), the goals'
 * money at the start as given, the rest in the shields less the salary of 4 000 zł (their target 12 000 zł).
 */
function input({ initial, ...o }: Ship): FleetInput {
  const s0 = createDefaultSettings(AT).settings
  return {
    settings: { ...s0, budget: { ...s0.budget, start: '2026-11-01', initial: { shields: 0, hull: zl(12000), goals: initial ?? {} } }, layers: { ...s0.layers, assumedCosts: zl(2000) } },
    balances: [balanceSchema.parse({ ...base(), date: '2026-11-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(34000) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-11', salary: zl(4000), envelopes: {} })],
    transactions: [],
    now: '2026-11-03T20:00:00+01:00',
    ...o
  }
}
function ship(o: Ship): FleetState {
  const state = computeFleet(input(o))
  // The invariant: every złoty on the accounts belongs to exactly one layer.
  expect(layersSum(state)).toBe(state.total)
  return state
}
const layers = (s: FleetState) => [s.shields.amount, s.hull.amount, s.goals.map((g) => [g.name, g.amount])]

describe('przegląd N2 1: „Zadokuj” bez zmian potwierdza podział pary do zadokowania (T363)', () => {
  // A payout of the pool Cele, 1 000 zł, imported at 09:00 (Rower 500 / 1 000 zł): pending – Rower +500, the shields +500.
  const e = entry('2026-11-03', zl(1000), { pool: 'goals' })
  const t = delivery('2026-11-03', zl(1000), '2026-11-03T08:00:00.000Z')
  const pendingPairs = pairsOf({ entries: [e], transactions: [t] })
  /** „Zadokuj” at 11:00 as the window writes it for a pair: counted from its operation's arrival (`countedFrom`). */
  const confirmed = docking(t, e, '2026-11-03T10:00:00.000Z', { countedFrom: t.createdAt })
  /** A docking from before 1.15.6 (no `countedFrom`): counted from its creation (T128) – as it was. */
  const old = docking(t, e, '2026-11-03T10:00:00.000Z')

  it('po przeniesieniu środków celu o 10:00 (T340): nic się nie przesuwa – Rower 0 zł, osłony 19 000 zł', () => {
    // 10:00 – all 1 000 zł of Rower to the shields (the screen: Rower 0 zł).
    const rower = transferGoal(goal('Rower', zl(1000), 1), 'shields', zl(1000), '2026-11-03T09:00:00.000Z')
    const o = { goals: [rower], initial: { [rower.id]: zl(500) }, transactions: [t] }
    const pending = ship({ ...o, pendingPairs })
    expect(layers(pending)).toEqual([zl(19000), zl(12000), [['Rower', 0]]])
    expect(layers(ship({ ...o, dockings: [confirmed] }))).toEqual(layers(pending))
    // Counted from the docking's 11:00 (a docking without the field – every one before T363): the transfer ran before the
    // payout – Rower 500 zł, the shields 500 zł lower than the bridge showed.
    expect(layers(ship({ ...o, dockings: [old] }))).toEqual([zl(18500), zl(12000), [['Rower', zl(500)]]])
    // The window's proposal (`previewDocking` – the docking of now) is the split the layers have.
    const preview = previewDocking(input({ ...o, pendingPairs }), t, docking(t, e, '2026-11-03T18:00:00.000Z', { countedFrom: t.createdAt }))
    expect(preview).toEqual(pending.log.find((x) => x.txId === t.id)!.moves)
    expect(preview).toEqual({ goals: { [rower.id]: zl(500) }, shields: zl(500) })
  })

  it('po zmianie kwoty celu o 10:00 (C1): nic się nie przesuwa – Rower 1 000 / 2 000 zł; dawne dokowanie bez zmian', () => {
    // 10:00 – Rower's target raised from 1 000 to 2 000 zł (its state before kept in `past`).
    const rower = goal('Rower', zl(2000), 1, { past: [{ until: '2026-11-03T09:00:00.000Z', priority: 1, target: zl(1000), archived: false }] })
    const o = { goals: [rower], initial: { [rower.id]: zl(500) }, transactions: [t] }
    const pending = ship({ ...o, pendingPairs })
    expect(layers(pending)).toEqual([zl(18000), zl(12000), [['Rower', zl(1000)]]])
    expect(layers(ship({ ...o, dockings: [confirmed] }))).toEqual(layers(pending))
    // A docking from before 1.15.6 keeps its split: the goals at its creation, as its window showed them then.
    expect(layers(ship({ ...o, dockings: [old] }))).toEqual([zl(17500), zl(12000), [['Rower', zl(1500)]]])
  })
})

describe('przegląd N2 5: „w tym do zadokowania” – to, co z par jest jeszcze w celach (T342)', () => {
  const e = entry('2026-11-03', zl(1000), { pool: 'goals' })
  const t = delivery('2026-11-03', zl(1000), '2026-11-03T08:00:00.000Z')
  const pendingPairs = pairsOf({ entries: [e], transactions: [t] })

  it('para Cele 1 000 zł do Wakacji, potem wydatek 600 zł z Wakacji – w celach 400 zł, w tym do zadokowania 400 zł', () => {
    const trip = goal('Wakacje', zl(1000), 1)
    const spent = tx('2026-11-03', -zl(600), '2026-11-03T15:00:00.000Z', { kind: 'expense', categoryId: FUN, goalId: trip.id, time: '16:00' })
    const s = ship({ goals: [trip], transactions: [t, spent], pendingPairs })
    expect(s.goals.map((g) => g.amount)).toEqual([zl(400)])
    // Before: 1 000 zł – all the pair put in, more than the goals hold.
    expect(s.toDock).toEqual({ count: 1, inflow: zl(1000), outflow: 0, goals: zl(400) })
  })

  it('przeniesienie do innego celu zabiera część pary ze sobą; do osłon – wychodzi z celów', () => {
    const trip = goal('Wakacje', zl(1000), 1)
    const car = goal('Auto', zl(5000), 2)
    // 16:00 – 700 zł of the pair's 1 000 zł from Wakacje to Auto; 16:05 – 200 zł of Wakacje to the shields.
    const moved = transferGoal(transferGoal(trip, car.id, zl(700), '2026-11-03T15:00:00.000Z'), 'shields', zl(200), '2026-11-03T15:05:00.000Z')
    const s = ship({ goals: [moved, car], transactions: [t], pendingPairs })
    expect(s.goals.map((g) => [g.name, g.amount])).toEqual([
      ['Wakacje', zl(100)],
      ['Auto', zl(700)]
    ])
    expect(s.toDock.goals).toBe(zl(800))
  })
})

describe('przegląd N2 12: wpływ wpisany na Portfelu XTB sparowany z wpisem ICTTJ (B69)', () => {
  it('ostatnia dostawa – para do zadokowania, nie wcześniejsza zadokowana', () => {
    const trip = goal('Wakacje', zl(3000), 1)
    // 2 November: a payout docked; 3 November: 700 zł typed on Portfel XTB, paired with its ICTTJ entry (pool Cele).
    const before = entry('2026-11-02', zl(500), { pool: 'current' })
    const bank = delivery('2026-11-02', zl(500), '2026-11-02T08:00:00.000Z')
    const e = entry('2026-11-03', zl(700), { pool: 'goals' })
    const typed = tx('2026-11-03', zl(700), '2026-11-03T08:00:00.000Z', { accountId: XTB_WALLET_ACCOUNT_ID, kind: 'income', counterparty: 'XTB' })
    const dockings = [docking(bank, before, '2026-11-02T09:00:00.000Z')]
    const pendingPairs = pairsOf({ entries: [before, e], transactions: [bank, typed], dockings })
    expect([...pendingPairs.keys()]).toEqual([typed.id])
    const s = ship({ goals: [trip], transactions: [bank, typed], dockings, pendingPairs })
    // Before: the docked one of 2 November (only the trading account's operations were read).
    expect(deliveryWhy(s.log, (id) => s.goals.find((g) => g.id === id)!.name)).toEqual({
      date: '2026-11-03',
      pending: true,
      lines: [
        { label: 'Dostawa do zadokowania (według puli wpisu ICTTJ)', amount: zl(700) },
        { label: 'Cel: Wakacje', amount: zl(700) }
      ]
    })
  })

  it('część domownika (dawne „spłaca” sprzed 1.3.0): „do zadokowania” tylko to, co liczy się według puli wpisu', () => {
    const trip = goal('Wakacje', zl(3000), 1)
    // 2 November: 200 zł bought for the household; 3 November: 1 000 zł typed on Portfel XTB, 200 zł of it marked as their
    // repayment the old way (`repaid`).
    const bought = tx('2026-11-02', -zl(200), '2026-11-02T08:00:00.000Z', { kind: 'expense', categoryId: FOOD, refundable: true })
    const e = entry('2026-11-03', zl(1000), { pool: 'goals' })
    const typed = tx('2026-11-03', zl(1000), '2026-11-03T08:00:00.000Z', { accountId: XTB_WALLET_ACCOUNT_ID, kind: 'income', counterparty: 'XTB', repaid: zl(200) })
    const pendingPairs = pairsOf({ entries: [e], transactions: [typed] })
    const s = ship({ goals: [trip], transactions: [bought, typed], pendingPairs })
    expect(s.goals.map((g) => g.amount)).toEqual([zl(800)])
    // Before: 1 000 zł – the household's 200 zł too.
    expect(s.toDock).toEqual({ count: 1, inflow: zl(800), outflow: 0, goals: zl(800) })
    expect(deliveryWhy(s.log, (id) => s.goals.find((g) => g.id === id)!.name)?.lines).toEqual([
      { label: 'Dostawa do zadokowania (według puli wpisu ICTTJ)', amount: zl(1000) },
      { label: 'Domownicy – spłata i zaliczka', amount: zl(200) },
      { label: 'Cel: Wakacje', amount: zl(800) }
    ])
  })
})

// ------------------------------------------------------------------ the fees paid before the start

const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2026-01', ...over })
const plan = (month: string, salary: number) => monthPlanSchema.parse({ ...base(), month, salary, envelopes: {} })
const opening = (date: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount })
function feeShip(o: { start: string; now: string; containers: Container[]; transactions: Transaction[]; goals?: Goal[]; months?: ReturnType<typeof plan>[] }): FleetState {
  const s0 = createDefaultSettings(AT).settings
  const state = computeFleet({
    settings: { ...s0, budget: { ...s0.budget, start: o.start, initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening(o.start, zl(50000))],
    months: o.months ?? [plan(o.start.slice(0, 7), zl(5000))],
    containers: o.containers,
    goals: o.goals ?? [],
    transactions: o.transactions,
    now: o.now
  })
  expect(layersSum(state)).toBe(state.total)
  return state
}

describe('przegląd N2 3 i scalenie z N3: kreator, silnik i Ładownia czytają płatności opłaty jedną regułą (T345, T393)', () => {
  // Quarterly fees of 300 zł due on the 5th of November, each paid on 5 November; the budget starts on the 10th.
  const fee = (name: string) => container({ name, amount: zl(300), cycleMonths: 3, dueMonth: '2026-11', dueDay: 5, counterparty: name })
  const water = fee('Wodociągi')
  const waste = fee('Odpady')
  const gas = fee('Gazownia')
  const power = fee('Energa')
  const savings = goal('Remont', zl(5000), 1)
  const paid = (c: Container, over: Partial<Transaction>) => tx('2026-11-05', -zl(300), '2026-11-05T10:00:00.000Z', { kind: 'expense', categoryId: FOOD, containerId: c.id, counterparty: c.name, ...over })
  const transactions = [
    // From a goal's money (T131: a goal and a container exclude each other – data from elsewhere): the goal's, not the
    // tank's – the bill is paid all the same (T393).
    paid(water, { goalId: savings.id }),
    // A transfer still linked from before T362 (`withKind` kept it): no fee's payment.
    paid(waste, { kind: 'transfer', categoryId: null }),
    // A purchase for the household (to be refunded): the household's money – the bill paid (T393).
    paid(gas, { refundable: true }),
    paid(power, {})
  ]
  const containers = [water, waste, gas, power]

  it('wydatek z celu i zakup do zwrotu zamykają cykl, dawny przelew z kontenerem nie – w silniku, kreatorze i Ładowni', () => {
    const s = feeShip({ start: '2026-11-10', now: '2026-11-10T12:00:00+01:00', containers, goals: [savings], transactions })
    const sinking = sinkingOf(s.log, '2026-11')
    expect(containers.map((c) => sinking.get(c.id) ?? 0)).toEqual([0, zl(300), 0, 0])
    expect(containers.map((c) => s.tanks.find((t) => t.containerId === c.id)?.paidDue)).toEqual(['2026-11', null, '2026-11', '2026-11'])
    // The wizard: the payments of the same rule (`paymentsIndex`) – the first month's installments the engine's.
    const days = startPaidDays(transactions, '2026-11-10', containers, [])
    expect(containers.map((c) => days.get(c.id)?.map((p) => p.date))).toEqual([['2026-11-05'], [], ['2026-11-05'], ['2026-11-05']])
    const life = { archived: false, from: null, until: null }
    const items = containers.map((c) => ({ key: c.id, amount: c.amount, cycleMonths: c.cycleMonths, dueMonth: c.dueMonth, schedule: c.schedule, ...life, paid: days.get(c.id) ?? [] }))
    expect(startTanks(items, '2026-11-10', {}).map((x) => x.installment)).toEqual([0, zl(300), 0, 0])
    // Ładownia – the same payments: the old transfer pays nothing there either (before: each kind with a container).
    expect(containers.map((c) => paymentsIndex(transactions).byContainer.get(c.id)?.map((p) => p.date))).toEqual([['2026-11-05'], undefined, ['2026-11-05'], ['2026-11-05']])
  })

  it('propozycja z kroku 4: płatności odbiorcy od 1. dnia miesiąca przed startem, które start połączy – tą samą regułą', () => {
    // A proposal (not a container yet): its payee's payment of 5 November from a goal's money, another of 6 November.
    const fromGoal = tx('2026-11-05', -zl(300), '2026-11-05T10:00:00.000Z', { kind: 'expense', categoryId: FOOD, counterparty: 'PGNiG', goalId: savings.id })
    const own = tx('2026-11-06', -zl(300), '2026-11-06T10:00:00.000Z', { kind: 'expense', categoryId: FOOD, counterparty: 'PGNiG' })
    // Of the month before the start's (T379): linked at the start too.
    const october = tx('2026-10-28', -zl(300), '2026-10-28T10:00:00.000Z', { kind: 'expense', categoryId: FOOD, counterparty: 'PGNiG' })
    const proposal = { key: 'pgnig', label: 'PGNiG', cycleMonths: 3 }
    expect(startPaidDays([fromGoal], '2026-11-10', [], [proposal]).get('pgnig')?.map((p) => p.date)).toEqual(['2026-11-05'])
    expect(startPaidDays([october, fromGoal, own], '2026-11-10', [], [proposal]).get('pgnig')?.map((p) => p.date)).toEqual(['2026-10-28', '2026-11-05', '2026-11-06'])
  })
})

describe('przegląd N2 4: spóźniona zapłata sprzed startu zamyka poprzedni cykl, nie następny (T135, T345)', () => {
  // Every 3 months, due on the 10th of February, May, August and November; 300 zł.
  const water = container({ name: 'Wodociągi', amount: zl(300), cycleMonths: 3, dueMonth: '2026-02', dueDay: 10, counterparty: 'Wodociągi' })
  const pay = (date: string) => tx(date, -zl(300), `${date}T10:00:00.000Z`, { kind: 'expense', categoryId: FOOD, containerId: water.id, counterparty: 'Wodociągi' })

  it('luty zapłacony 28.04 (listopad – w terminie), start 5.05: maj odkłada 300 zł, płatność 10.05 ze zbiornika, bez alarmu', () => {
    expect([...paidBeforeStart(water, ['2025-11-10', '2026-04-28'], '2026-05-05')].sort()).toEqual(['2025-11', '2026-02'])
    const transactions = [pay('2025-11-10'), pay('2026-04-28'), pay('2026-05-10')]
    const s = feeShip({ start: '2026-05-05', now: '2026-05-12T12:00:00+02:00', containers: [water], transactions })
    // Before: May taken for paid on 28 April – nothing set aside, the payment of 10 May from the energy with an alarm.
    expect(sinkingOf(s.log, '2026-05').get(water.id)).toBe(zl(300))
    expect(s.alarms.filter((a) => a.kind === 'sinking-short')).toEqual([])
    expect([s.energy, s.tanks[0]]).toEqual([zl(4700), expect.objectContaining({ amount: 0, paidDue: '2026-05', dueMonth: '2026-08' })])
  })

  it('bez wcześniejszych płatności opłaty – zapłata w miesiącu przed terminem jest wcześniejszą (cykl przed nią nie śledzony)', () => {
    expect([...paidBeforeStart(water, ['2026-04-28'], '2026-05-05')]).toEqual(['2026-05'])
  })

  it('zaległa zapłata, potem wcześniejsza w tym samym miesiącu przed terminem – zamykają luty i maj', () => {
    expect([...paidBeforeStart(water, ['2025-11-10', '2026-04-10', '2026-04-28'], '2026-05-05')].sort()).toEqual(['2025-11', '2026-02', '2026-05'])
    // Paid in February on time: the April payment is May's, early.
    expect([...paidBeforeStart(water, ['2025-11-10', '2026-02-10', '2026-04-28'], '2026-05-05')].sort()).toEqual(['2025-11', '2026-02', '2026-05'])
  })
})
