/**
 * N2 (1.15.6), AP-12 (AF-46, AF-48; DO.5, DO sp. 1, MG sp. 1, PR sp. 2): an ICTTJ payout paired with the bank's operation
 * and not docked yet counts at once by its entry's pool (T341, D99 pkt 2 – instead of T163's „the usual order until the
 * docking”): Podatek – the tax reserve (a return of it without the firewall), Cele – the goals; the docking confirms it.
 */
import { describe, expect, it } from 'vitest'
import { deliveries, pendingPairsOf, previewDocking, type DeliveriesInput } from '@shared/calc/dock'
import { computeFleet, layersSum, type FleetInput, type FleetState, type PendingPair } from '@shared/calc/fleet'
import { rateDay, type GameInput } from '@shared/calc/game'
import { incomeOfPeriod } from '@shared/calc/income'
import { deliveryWhy } from '@shared/calc/why'
import { createDefaultSettings } from '@shared/defaults'
import type { IctjEntry } from '@shared/ictj'
import {
  balanceSchema,
  defaultCategoryId,
  dockingSchema,
  goalSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
  type Docking,
  type Goal,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5300000000000000000${String(++seq).padStart(4, '0')}`
const base = (createdAt = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt, updatedAt: createdAt })

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ ...base(`${date}T09:00:00.000Z`), date, accountId: MBANK_ACCOUNT_ID, kind: 'trading', amount, counterparty: 'XTB S.A.', ...over })
const entry = (date: string, amount: number, over: Partial<IctjEntry> = {}): IctjEntry => ({ id: nextId(), kind: 'withdrawal', date, amount, pool: 'current', note: '', updatedAt: null, ...over })
const docking = (t: Transaction, over: Partial<Docking> = {}): Docking => dockingSchema.parse({ ...base(), date: t.date, transactionId: t.id, ...over })
const goal = (name: string, target: number, priority: number, over: Partial<Goal> = {}) => goalSchema.parse({ ...base(), name, target, priority, ...over })
const list = (over: Partial<DeliveriesInput>) => deliveries({ entries: [], transactions: [], dockings: [], start: '2026-10-01', today: '2026-10-20', skipped: [], ictjOn: true, coveredTo: null, ...over })

/**
 * The spec's ship (the docking example): October 2026 from the 1st with 27 640 zł – the hull 15 000 / 21 900 zł
 * (6 × 3 650 zł), the shields 8 640 / 12 000 zł after the salary of 4 000 zł (below their target: a top-up breaks the
 * firewall).
 */
function ship(extra: Partial<FleetInput> = {}): FleetState {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = { ...s0, budget: { ...s0.budget, start: '2026-10-01', initial: { shields: 0, hull: zl(15000), goals: {} } }, layers: { ...s0.layers, assumedCosts: zl(3650) } }
  const s = computeFleet({
    settings,
    balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(27640) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000), envelopes: {} })],
    transactions: [],
    now: '2026-10-20T12:00:00+02:00',
    ...extra
  })
  expect(layersSum(s)).toBe(s.total)
  return s
}

/** The pairs as the renderer gives them to the engine: from the deliveries' list. */
const pairsOf = (o: Partial<DeliveriesInput>): Map<string, PendingPair> => pendingPairsOf(list(o))

describe('AP-12: para do zadokowania liczona od razu według puli wpisu (T341)', () => {
  it('DO.5: zwrot do masy 300 zł z puli Podatek przed „Zadokuj” – z rezerwy, bez alarmu firewalla, osłony bez zmian', () => {
    const w = entry('2026-10-05', zl(800), { pool: 'tax' })
    const taxIn = tx('2026-10-05', zl(800))
    const ret = entry('2026-10-15', zl(300), { kind: 'return', pool: 'tax' })
    const back = tx('2026-10-15', -zl(300))
    const records = { transactions: [taxIn, back], dockings: [docking(taxIn, { ictjEntryId: w.id, pool: 'tax' })] }
    const pendingPairs = pairsOf({ entries: [w, ret], ...records })
    expect([...pendingPairs]).toEqual([[back.id, { pool: 'tax', entryDate: '2026-10-15' }]])
    const s = ship({ ...records, pendingPairs })
    expect([s.taxHold, s.shields.amount]).toEqual([zl(500), zl(8640)])
    expect(s.alarms.filter((a) => a.kind === 'firewall')).toEqual([])
    expect(s.toDock).toEqual({ count: 1, inflow: 0, outflow: zl(300), goals: 0 })
    // Before (T163): the usual order until the docking – the firewall's red alarm and −300 zł from the shields.
    const before = ship(records)
    expect([before.taxHold, before.shields.amount]).toEqual([zl(800), zl(8340)])
    expect(before.alarms.filter((a) => a.kind === 'firewall').map((a) => [a.date, a.amount])).toEqual([['2026-10-15', zl(300)]])
  })

  it('DO sp. 1: wypłata 1 500 zł z puli Cele – od razu do celu z prognozy ICTTJ, osłony bez zmian; Mostek i Mapa widzą „do zadokowania”', () => {
    const own = goal('Rower', zl(1000), 1)
    const trip = goal('Wakacje', zl(3000), 2, { source: 'ictj' })
    const e = entry('2026-10-12', zl(1500), { pool: 'goals' })
    const t = tx('2026-10-12', zl(1500))
    const pendingPairs = pairsOf({ entries: [e], transactions: [t] })
    const s = ship({ transactions: [t], goals: [own, trip], pendingPairs })
    expect(s.goals.map((g) => [g.name, g.amount])).toEqual([
      ['Rower', 0],
      ['Wakacje', zl(1500)]
    ])
    expect(s.shields.amount).toBe(zl(8640))
    expect(s.toDock).toEqual({ count: 1, inflow: zl(1500), outflow: 0, goals: zl(1500) })
    const ev = s.log.find((x) => x.txId === t.id)!
    expect([ev.pending, ev.moves]).toEqual([true, { goals: { [trip.id]: zl(1500) } }])
    // „Ostatnia dostawa – dokąd poszła?” (PR sp. 2): said to be one to dock.
    expect(deliveryWhy(s.log, (id) => s.goals.find((g) => g.id === id)!.name)).toEqual({
      date: '2026-10-12',
      pending: true,
      lines: [
        { label: 'Dostawa do zadokowania (według puli wpisu ICTTJ)', amount: zl(1500) },
        { label: 'Cel: Wakacje', amount: zl(1500) }
      ]
    })
    // Before: the docking order – all of it to the shields below their target (14 500 → 13 000 after „Zadokuj”).
    const before = ship({ transactions: [t], goals: [own, trip] })
    expect([before.shields.amount, before.goals.map((g) => g.amount)]).toEqual([zl(10140), [0, 0]])
    expect(before.toDock.count).toBe(0)
  })

  it('DO sp. 1: wypłata 2 000 zł z puli Podatek – rezerwa na PIT-38, nie osłony i nie przychód', () => {
    const e = entry('2026-10-12', zl(2000), { pool: 'tax' })
    const t = tx('2026-10-12', zl(2000))
    const s = ship({ transactions: [t], pendingPairs: pairsOf({ entries: [e], transactions: [t] }) })
    expect([s.taxHold, s.shields.amount]).toEqual([zl(2000), zl(8640)])
    expect(incomeOfPeriod([t], s.incomeContext).total).toBe(0)
    const before = ship({ transactions: [t] })
    expect([before.taxHold, before.shields.amount, incomeOfPeriod([t], before.incomeContext).total]).toEqual([0, zl(10640), zl(2000)])
  })

  it('wpływ wpisany na Portfelu XTB (B69) sparowany z wypłatą z puli Podatek – rezerwa, nie przychód z pracy', () => {
    const e = entry('2026-10-12', zl(700), { pool: 'tax' })
    const typed = tx('2026-10-12', zl(700), { accountId: XTB_WALLET_ACCOUNT_ID, kind: 'income', counterparty: 'XTB' })
    const pendingPairs = pairsOf({ entries: [e], transactions: [typed] })
    expect([...pendingPairs.keys()]).toEqual([typed.id])
    const s = ship({ transactions: [typed], pendingPairs })
    expect([s.taxHold, s.shields.amount, incomeOfPeriod([typed], s.incomeContext).work]).toEqual([zl(700), zl(8640), 0])
  })

  it('bez skoku przy „Zadokuj”: para liczy się jak jej dokowanie z pulą (bez zmienionego podziału), a okno proponuje to samo', () => {
    const own = goal('Rower', zl(1000), 1)
    const trip = goal('Wakacje', zl(3000), 2, { source: 'ictj' })
    const e = entry('2026-10-12', zl(3500), { pool: 'goals' })
    const t = tx('2026-10-12', zl(3500))
    const pending = ship({ transactions: [t], goals: [own, trip], pendingPairs: pairsOf({ entries: [e], transactions: [t] }) })
    const docked = ship({ transactions: [t], goals: [own, trip], dockings: [docking(t, { ictjEntryId: e.id, entryDate: e.date, pool: 'goals', createdAt: t.createdAt })] })
    const layers = (s: FleetState) => [s.shields.amount, s.hull.amount, s.taxHold, s.goals.map((g) => g.amount)]
    expect(layers(pending)).toEqual(layers(docked))
    expect(layers(pending)).toEqual([zl(8640), zl(15000), 0, [zl(500), zl(3000)]])
    // The window's proposal (`withDocking` – the engine with the docking of now).
    const input: FleetInput = {
      settings: { ...createDefaultSettings(AT).settings, budget: { ...createDefaultSettings(AT).settings.budget, start: '2026-10-01', initial: { shields: 0, hull: zl(15000), goals: {} } }, layers: { ...createDefaultSettings(AT).settings.layers, assumedCosts: zl(3650) } },
      balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(27640) })],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000), envelopes: {} })],
      goals: [own, trip],
      transactions: [t],
      pendingPairs: pairsOf({ entries: [e], transactions: [t] }),
      now: '2026-10-20T12:00:00+02:00'
    }
    expect(previewDocking(input, t, docking(t, { ictjEntryId: e.id, entryDate: e.date, pool: 'goals', createdAt: '2026-10-20T10:00:00.000Z' }))).toEqual(pending.log.find((x) => x.txId === t.id)!.moves)
  })

  it('dokowanie operacji decyduje nad parą: podział z okna, nie pula wpisu', () => {
    const e = entry('2026-10-12', zl(2000), { pool: 'goals' })
    const t = tx('2026-10-12', zl(2000))
    const split = docking(t, { ictjEntryId: e.id, pool: 'goals', split: { shields: zl(1500), hull: zl(500), goals: {}, taxHold: 0 } })
    const s = ship({ transactions: [t], dockings: [split], pendingPairs: new Map([[t.id, { pool: 'goals', entryDate: e.date }]]) })
    expect(s.log.find((x) => x.txId === t.id)!.moves).toEqual({ hull: zl(500), shields: zl(1500) })
    expect(s.toDock.count).toBe(0)
  })

  it('pary do silnika: dokładna, prawie tej samej kwoty i wpisana na Portfelu XTB; bez pominiętych, sprzed startu, czekających, zadokowanych i wpływów bez wpisu', () => {
    const exact = entry('2026-10-12', zl(1200), { pool: 'surplus' })
    const exactTx = tx('2026-10-13', zl(1200))
    const near = entry('2026-10-14', zl(1000), { pool: 'goals' })
    const nearTx = tx('2026-10-15', zl(1003))
    const wallet = entry('2026-10-16', zl(700), { pool: 'tax' })
    const walletTx = tx('2026-10-16', zl(700), { accountId: XTB_WALLET_ACCOUNT_ID, kind: 'income', counterparty: 'XTB' })
    const skipped = entry('2026-10-08', zl(400), { pool: 'tax' })
    const skippedTx = tx('2026-10-08', zl(400))
    const early = entry('2026-09-28', zl(900), { pool: 'tax' })
    const earlyTx = tx('2026-09-29', zl(900))
    const waiting = entry('2026-10-19', zl(600), { pool: 'tax' })
    const docked = entry('2026-10-06', zl(500), { pool: 'tax' })
    const dockedTx = tx('2026-10-06', zl(500))
    const alone = tx('2026-10-02', zl(250))
    const pairs = pairsOf({
      entries: [exact, near, wallet, skipped, early, waiting, docked],
      transactions: [exactTx, nearTx, walletTx, skippedTx, earlyTx, dockedTx, alone],
      dockings: [docking(dockedTx, { ictjEntryId: docked.id, pool: 'tax' })],
      skipped: [skipped.id]
    })
    expect(pairs).toEqual(
      new Map([
        [exactTx.id, { pool: 'surplus', entryDate: '2026-10-12' }],
        [nearTx.id, { pool: 'goals', entryDate: '2026-10-14' }],
        [walletTx.id, { pool: 'tax', entryDate: '2026-10-16' }]
      ])
    )
  })
})

describe('AP-12: gra bez fałszywego naruszenia (AF-46 – zamarza po 7 dniach)', () => {
  const FOOD = defaultCategoryId(1)
  const AUTO = defaultCategoryId(3)
  /** October 2026 as `game.test.ts`: the shields 6 200 / 9 300 zł after the salary – a top-up breaks the firewall. */
  const world = (o: { transactions: Transaction[]; dockings: Docking[]; pendingPairs?: Map<string, PendingPair> }): GameInput => {
    const s0 = createDefaultSettings(AT).settings
    return {
      settings: { ...s0, budget: { ...s0.budget, start: '2026-10-01' }, layers: { ...s0.layers, assumedCosts: zl(3000) }, game: { ...s0.game, start: '2026-10-05' } },
      balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(3100), envelopes: { [FOOD]: zl(3100), [AUTO]: zl(500) } })],
      containers: [],
      game: [],
      ...o
    }
  }

  it('dzień zwrotu 300 zł z puli Podatek przed dokowaniem – bez naruszenia „dopłata wbrew firewallowi”', () => {
    const w = entry('2026-10-05', zl(1000), { pool: 'tax' })
    const taxIn = tx('2026-10-05', zl(1000))
    const ret = entry('2026-10-11', zl(300), { kind: 'return', pool: 'tax' })
    const back = tx('2026-10-11', -zl(300))
    const records = { transactions: [taxIn, back], dockings: [docking(taxIn, { ictjEntryId: w.id, pool: 'tax' })] }
    const pendingPairs = pairsOf({ entries: [w, ret], ...records, today: '2026-10-12' })
    expect(rateDay(world({ ...records, pendingPairs }), '2026-10-11').violations).toEqual([])
    // Before: a serious violation, frozen after the 7 days of B20 (T163).
    expect(rateDay(world(records), '2026-10-11').violations.map((v) => [v.order, v.serious, v.amount])).toEqual([['firewall', true, zl(300)]])
  })
})
