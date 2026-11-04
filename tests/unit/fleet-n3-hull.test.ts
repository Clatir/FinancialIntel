/**
 * N3 (1.15.7), AP-17 (MO sp. 3, DW sp. 4, DW.12, MO.22 b; D99 pkt 6): the hull's target follows the average costs, so
 * the hull ends a few złoty short of it and every top-up of XTB broke the firewall, „wolne do decyzji” never came. The
 * hull counts as full from 99 % of its target (T372); „Dopełnij kadłub z osłon” moves the shields' surplus to what the
 * hull lacks at its moment (T373) – a top-up of XTB entered after it sees the hull full.
 */
import { describe, expect, it } from 'vitest'
import { briefing } from '@shared/calc/briefing'
import { layersEffect } from '@shared/calc/effect'
import { computeFleet, HULL_TOLERANCE_PCT, hullCountsFull, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { createDefaultSettings } from '@shared/defaults'
import { isAmountPath } from '@shared/merge'
import { balanceSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type MonthPlan, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5310000000000000000${String(++seq).padStart(4, '0')}`
const base = (createdAt = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt, updatedAt: createdAt })

/** A top-up of XTB (the bank's operation, no time) that came to FI at `createdAt`. */
const toXtb = (date: string, amount: number, createdAt: string): Transaction =>
  transactionSchema.parse({ ...base(createdAt), date, accountId: MBANK_ACCOUNT_ID, amount: -amount, kind: 'trading', counterparty: 'XTB S.A.' })
const topUp = (amount: number, at: string) => ({ id: nextId(), amount, at })

interface Ship {
  /** The hull at the start (the wizard's split) and the costs assumed (no history): its target = months × costs. */
  hull: number
  costs: number
  hullMonths?: number
  shieldSalaries?: number
  /** The shields after November's salary of 6 500 zł. */
  shields: number
  topUps?: MonthPlan['hullTopUps']
  transactions?: Transaction[]
  firewall?: boolean
  now?: string
}

/** An XTB withdrawal docked by the order (the bank's operation, no pool). */
const fromXtb = (date: string, amount: number, createdAt: string): Transaction =>
  transactionSchema.parse({ ...base(createdAt), date, accountId: MBANK_ACCOUNT_ID, amount, kind: 'trading', counterparty: 'XTB S.A.' })

/** November 2026 from the 1st: the hull and the shields as given, the salary 6 500 zł paid from the shields on the 1st. */
function ship(o: Ship): FleetState {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = {
    ...s0,
    budget: { ...s0.budget, start: '2026-11-01', initial: { shields: 0, hull: o.hull, goals: {} } },
    layers: { ...s0.layers, assumedCosts: o.costs, hullMonths: o.hullMonths ?? 6, shieldSalaries: o.shieldSalaries ?? 3 },
    orders: { ...s0.orders, firewall: o.firewall ?? true }
  }
  const input: FleetInput = {
    settings,
    balances: [balanceSchema.parse({ ...base(), date: '2026-11-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: o.hull + o.shields + zl(6500) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-11', salary: zl(6500), envelopes: {}, ...(o.topUps ? { hullTopUps: o.topUps } : {}) })],
    transactions: o.transactions ?? [],
    now: o.now ?? '2026-11-03T20:00:00+01:00'
  }
  const state = computeFleet(input)
  // The invariant: every złoty on the accounts belongs to exactly one layer.
  expect(layersSum(state)).toBe(state.total)
  return state
}

/** The persona „rok” (DW.12): the hull 39 066,30 / 39 185,22 zł (6 × 6 530,87 zł – 99,70 %), the shields 24 433,70 / 19 500 zł. */
const ROK = { hull: zl(39066.3), costs: zl(6530.87), shields: zl(24433.7) }
const LACK = zl(39185.22) - zl(39066.3)

describe('AP-17: kadłub od 99 % celu pełny dla firewalla i „wolnego do decyzji” (T372)', () => {
  it('DW.12: dopłata 500 zł do XTB przy kadłubie 99,70 % celu – bez alarmu firewall (przedtem czerwony alarm)', () => {
    const s = ship({ ...ROK, transactions: [toXtb('2026-11-03', zl(500), '2026-11-03T12:00:00.000Z')] })
    expect(s.hull).toEqual({ amount: zl(39066.3), target: zl(39185.22) })
    expect(s.alarms.filter((a) => a.kind === 'firewall')).toEqual([])
    // The top-up from „wolne do decyzji”: the shields 24 433,70 − 500 zł, still above their target.
    expect(s.shields).toMatchObject({ amount: zl(23933.7), target: zl(19500), over: zl(4433.7), free: zl(4433.7) })
  })

  it('MO.22 (a): cel osłon 1 pensja, kadłub 5 mies. – 32 555,25 / 32 654,35 zł: „wolne do decyzji” 7 150,01 zł, nie 0', () => {
    const s = ship({ hull: zl(32555.25), costs: zl(6530.87), hullMonths: 5, shieldSalaries: 1, shields: zl(13650.01) })
    expect(s.hull.target).toBe(zl(32654.35))
    expect(s.shields).toMatchObject({ target: zl(6500), over: zl(7150.01), free: zl(7150.01) })
  })

  it('granica 99 %: 38 793,37 zł z 39 185,22 zł – pełny; grosz mniej – niepełny (firewall i „wolne” jak dotąd)', () => {
    const target = zl(39185.22)
    expect(HULL_TOLERANCE_PCT).toBe(1)
    // 99 % of 39 185,22 zł = 38 793,3678 zł.
    expect(hullCountsFull(zl(38793.37), target)).toBe(true)
    expect(hullCountsFull(zl(38793.36), target)).toBe(false)
    expect(hullCountsFull(0, 0)).toBe(true)
    expect(hullCountsFull(zl(100), null)).toBe(false)
    const short = ship({ ...ROK, hull: zl(38793.36), shields: zl(24433.7), transactions: [toXtb('2026-11-03', zl(500), '2026-11-03T12:00:00.000Z')] })
    expect(short.alarms.filter((a) => a.kind === 'firewall').map((a) => a.amount)).toEqual([zl(500)])
    expect(short.shields.free).toBe(0)
    const edge = ship({ ...ROK, hull: zl(38793.37), shields: zl(24433.7), transactions: [toXtb('2026-11-03', zl(500), '2026-11-03T12:00:00.000Z')] })
    expect(edge.alarms.filter((a) => a.kind === 'firewall')).toEqual([])
  })

  it('osłony poniżej celu po dopłacie – firewall dalej łamany mimo pełnego kadłuba', () => {
    const s = ship({ ...ROK, transactions: [toXtb('2026-11-03', zl(5000), '2026-11-03T12:00:00.000Z')] })
    expect(s.alarms.filter((a) => a.kind === 'firewall').map((a) => a.amount)).toEqual([zl(5000)])
  })
})

describe('AP-17: „Dopełnij kadłub z osłon” (T373)', () => {
  it('118,92 zł z nadwyżki osłon do kadłuba – kadłub pełny co do grosza, osłony mniej o tyle', () => {
    const s = ship({ ...ROK, topUps: [topUp(LACK, '2026-11-03T09:00:00.000Z')] })
    expect(s.hull).toEqual({ amount: zl(39185.22), target: zl(39185.22) })
    expect(s.shields).toMatchObject({ amount: zl(24433.7) - LACK, over: zl(4933.7) - LACK, free: zl(4933.7) - LACK })
    expect(s.log.filter((e) => e.kind === 'hull')).toEqual([{ date: '2026-11-03', kind: 'hull', amount: LACK, moves: { hull: LACK, shields: -LACK } }])
  })

  it('kadłub 98 %: dopłata do XTB po dopełnieniu bez alarmu; dopłata wpisana przed dopełnieniem – z alarmem', () => {
    const hull = zl(38400)
    const lack = zl(39185.22) - hull
    const after = ship({ ...ROK, hull, topUps: [topUp(lack, '2026-11-03T09:00:00.000Z')], transactions: [toXtb('2026-11-03', zl(500), '2026-11-03T10:00:00.000Z')] })
    expect(after.alarms.filter((a) => a.kind === 'firewall')).toEqual([])
    expect(after.hull.amount).toBe(zl(39185.22))
    // The top-up of XTB came first (08:00): it saw the hull at 98 % – against the firewall, the top-up of the hull after it.
    const before = ship({ ...ROK, hull, topUps: [topUp(lack, '2026-11-03T09:00:00.000Z')], transactions: [toXtb('2026-11-03', zl(500), '2026-11-03T07:00:00.000Z')] })
    expect(before.alarms.filter((a) => a.kind === 'firewall').map((a) => a.amount)).toEqual([zl(500)])
    expect(before.hull.amount).toBe(zl(39185.22))
    // Without the top-up of the hull: the alarm (the hull at 98 % – below the 1 %).
    const none = ship({ ...ROK, hull, transactions: [toXtb('2026-11-03', zl(500), '2026-11-03T10:00:00.000Z')] })
    expect(none.alarms.filter((a) => a.kind === 'firewall').map((a) => a.amount)).toEqual([zl(500)])
  })

  it('nigdy więcej niż brakuje kadłubowi ani niż nadwyżka osłon; osłony bez nadwyżki – nic', () => {
    // 1 000 zł asked for, 118,92 zł lacking: 118,92 zł moved.
    expect(ship({ ...ROK, topUps: [topUp(zl(1000), '2026-11-03T09:00:00.000Z')] }).hull.amount).toBe(zl(39185.22))
    // The shields 19 600 zł (100 zł above their target), the hull lacking 1 185,22 zł: 100 zł moved.
    const small = ship({ ...ROK, hull: zl(38000), shields: zl(19600), topUps: [topUp(zl(1185.22), '2026-11-03T09:00:00.000Z')] })
    expect(small.hull.amount).toBe(zl(38100))
    expect(small.shields).toMatchObject({ amount: zl(19500), over: 0 })
    // The shields at their target: nothing moves, nothing in the log.
    const none = ship({ ...ROK, hull: zl(38000), shields: zl(19500), topUps: [topUp(zl(500), '2026-11-03T09:00:00.000Z')] })
    expect(none.hull.amount).toBe(zl(38000))
    expect(none.log.some((e) => e.kind === 'hull')).toBe(false)
  })

  it('cel kadłuba znany dopiero później albo zmniejszony – dopełnienie przenosi tylko to, czego brakuje wtedy (deterministycznie)', () => {
    // The hull's target lowered to 5 months (32 654,35 zł) after the top-up: the hull is above it – nothing moves.
    const lower = ship({ ...ROK, hullMonths: 5, topUps: [topUp(LACK, '2026-11-03T09:00:00.000Z')] })
    expect(lower.hull.amount).toBe(zl(39066.3))
    expect(lower.log.some((e) => e.kind === 'hull')).toBe(false)
    // „Cofnij” = the entry gone: the state as before.
    expect(ship({ ...ROK }).hull.amount).toBe(zl(39066.3))
  })

  it('zapis addytywny: plan miesiąca bez pola zostaje bez niego, kwota dopełnienia to grosze dla historii i konfliktów', () => {
    const plain = monthPlanSchema.parse({ ...base(), month: '2026-11', salary: zl(6500), envelopes: {} })
    expect('hullTopUps' in plain).toBe(false)
    // A malformed entry (a hand-edited file) dropped, not the plan.
    const odd = monthPlanSchema.parse({ ...base(), month: '2026-11', salary: zl(6500), envelopes: {}, hullTopUps: [{ id: nextId(), amount: -5, at: 'x' }, topUp(LACK, '2026-11-03T09:00:00.000Z')] })
    expect(odd.hullTopUps?.map((u) => u.amount)).toEqual([LACK])
    expect(isAmountPath(['hullTopUps', '#01K', 'amount'])).toBe(true)
  })

  it('dopełnienie z dnia przyszłego (zegar innego komputera) czeka na swój dzień; sprzed startu – pominięte', () => {
    expect(ship({ ...ROK, topUps: [topUp(LACK, '2026-11-04T09:00:00.000Z')] }).hull.amount).toBe(zl(39066.3))
    expect(ship({ ...ROK, topUps: [topUp(LACK, '2026-10-30T09:00:00.000Z')] }).hull.amount).toBe(zl(39066.3))
    expect(ship({ ...ROK, topUps: [topUp(LACK, '2026-11-04T09:00:00.000Z')], now: '2026-11-04T12:00:00+01:00' }).hull.amount).toBe(zl(39185.22))
  })

  it('firewall wyłączony: dopłata bez alarmu także przy kadłubie 98 % (jak dotąd)', () => {
    const s = ship({ ...ROK, hull: zl(38400), firewall: false, transactions: [toXtb('2026-11-03', zl(500), '2026-11-03T10:00:00.000Z')] })
    expect(s.alarms.filter((a) => a.kind === 'firewall')).toEqual([])
  })
})

describe('AP-17: podgląd zmiany celów warstw i komunikat przy wyłączonym firewallu (T374)', () => {
  it('MO sp. 4: kadłub 6 → 12 mies. przelicza dokowanie od startu – podgląd mówi, co się zmieni', () => {
    // The hull 30 000 / 39 185,22 zł; a delivery of 10 000 zł on 2 November: 9 185,22 zł fills the hull, the rest the shields.
    const delivery = fromXtb('2026-11-02', zl(10000), '2026-11-02T10:00:00.000Z')
    const now = ship({ ...ROK, hull: zl(30000), transactions: [delivery] })
    const twelve = ship({ ...ROK, hull: zl(30000), hullMonths: 12, transactions: [delivery] })
    expect(layersEffect(now, twelve)).toEqual([
      { label: 'Osłony', before: zl(24433.7) + zl(814.78), after: zl(24433.7) },
      { label: 'Kadłub', before: zl(39185.22), after: zl(40000) },
      { label: 'Cel kadłuba', before: zl(39185.22), after: zl(78370.44) },
      // The hull far below its new target: nothing free to decide any more.
      { label: 'Wolne do decyzji', before: zl(5748.48), after: 0 }
    ])
    expect(layersEffect(now, now)).toEqual([])
  })

  it('DW.12: firewall wyłączony – odprawa mówi o dzisiejszej dopłacie do XTB, że nie jest sprawdzana', () => {
    const top = toXtb('2026-11-03', zl(500), '2026-11-03T10:00:00.000Z')
    const s = ship({ ...ROK, hull: zl(38400), firewall: false, transactions: [top] })
    const items = briefing({ fleet: s, containers: [], imports: [], label: () => '', firewallOff: true }).filter((i) => i.key.startsWith('alarm:firewall'))
    expect(items).toEqual([{ level: 'info', kind: 'alarm', key: `alarm:firewall:off:${top.id}:2026-11`, text: 'Firewall wyłączony: dopłata do XTB 500,00 zł bez sprawdzania osłon i kadłuba.' }])
    // The order on: the alarm's line, no note; yesterday's top-up – no note today.
    expect(briefing({ fleet: s, containers: [], imports: [], label: () => '' }).filter((i) => i.key.startsWith('alarm:firewall'))).toEqual([])
    const yesterday = ship({ ...ROK, hull: zl(38400), firewall: false, transactions: [top], now: '2026-11-04T12:00:00+01:00' })
    expect(briefing({ fleet: yesterday, containers: [], imports: [], label: () => '', firewallOff: true }).filter((i) => i.key.startsWith('alarm:firewall'))).toEqual([])
  })
})
