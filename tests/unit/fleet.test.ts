import { describe, expect, it } from 'vitest'
import {
  cargoMass,
  computeFleet,
  cyclePosition,
  dailyAllowance,
  dockAmount,
  layersSum,
  paySalary,
  rangeMonths,
  shipClass,
  sinkingInstallment,
  sinkingSchedule,
  type FleetInput,
  type FleetState
} from '@shared/calc/fleet'
import { costOf, partsOf, splitEvenly } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import {
  balanceSchema,
  containerSchema,
  defaultCategoryId,
  dockingSchema,
  goalSchema,
  HOUSE_MEMBER_ID,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K0000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })

const FOOD = defaultCategoryId(1)
const GROCERIES = defaultCategoryId(1, 1)
const AUTO = defaultCategoryId(3)
const FUN = defaultCategoryId(6)

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const plan = (month: string, salary: number, envelopes: Record<string, number> = {}, over = {}) => monthPlanSchema.parse({ ...base(), month, salary, envelopes, ...over })
const opening = (date: string, amount: number, accountId = MBANK_ACCOUNT_ID) => balanceSchema.parse({ ...base(), date, accountId, kind: 'opening', amount })
const goal = (name: string, target: number, priority: number) => goalSchema.parse({ ...base(), name, target, priority })

function settingsWith(over: { budget?: Partial<Settings['budget']>; layers?: Partial<Settings['layers']>; orders?: Partial<Settings['orders']> } = {}): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, ...over.budget }, layers: { ...s.layers, ...over.layers }, orders: { ...s.orders, ...over.orders } }
}

function fleet(input: Partial<FleetInput> & { now: string }): FleetState {
  const state = computeFleet({ settings: settingsWith(), transactions: [], ...input })
  // The invariant: every złoty on the accounts belongs to exactly one layer.
  if (state.started) expect(layersSum(state)).toBe(state.total)
  return state
}

/**
 * The spec's state before the docking example: shields 8 640 / 12 000 zł (salary 4 000 zł × 3), hull 15 000 / 21 900 zł
 * (6 × 3 650 zł of costs). The budget starts on 1 October with 27 640 zł; the October salary leaves the shields at 8 640.
 */
function dockingExample(extra: Transaction[] = [], now = '2026-10-10T18:00:00+02:00'): FleetState {
  return fleet({
    settings: settingsWith({ budget: { start: '2026-10-01', initial: { shields: zl(12640), hull: zl(15000), goals: {} } }, layers: { assumedCosts: zl(3650) } }),
    balances: [opening('2026-10-01', zl(27640))],
    months: [plan('2026-10', zl(4000))],
    transactions: extra,
    now
  })
}

describe('dokowanie (spec: 5 000 zł przy osłonach 8 640 / 12 000 i kadłubie 15 000 / 21 900)', () => {
  it('kolejność rozładunku: osłony do celu, kadłub do celu, cele, reszta „wolne do decyzji”', () => {
    const split = dockAmount(zl(5000), { shields: zl(8640), hull: zl(15000), goals: [] }, { shields: zl(12000), hull: zl(21900) })
    expect(split).toEqual({ shields: zl(3360), hull: zl(1640), goals: {}, free: 0 })
    // Full shields and hull: goals by priority, the rest stays free in the shields.
    const full = dockAmount(zl(5000), { shields: zl(12000), hull: zl(21900), goals: [{ id: 'A', amount: 0, target: zl(1000) }, { id: 'B', amount: zl(500), target: zl(2500) }] }, { shields: zl(12000), hull: zl(21900) })
    expect(full).toEqual({ shields: zl(2000), hull: 0, goals: { A: zl(1000), B: zl(2000) }, free: zl(2000) })
    // Unknown targets: everything stays in the shields (nothing is „free” without a target).
    expect(dockAmount(zl(100), { shields: 0, hull: 0, goals: [] }, { shields: null, hull: null })).toEqual({ shields: zl(100), hull: 0, goals: {}, free: 0 })
    expect(dockAmount(zl(100), { shields: zl(12000), hull: 0, goals: [] }, { shields: zl(12000), hull: null })).toMatchObject({ shields: zl(100), hull: 0, free: zl(100) })
  })

  it('w silniku: osłony +3 360 (pełne), kadłub +1 640 (16 640 / 21 900), cele 0; zasięg 6,5 → 7,8 mies.', () => {
    const before = dockingExample([], '2026-10-09T12:00:00+02:00')
    expect(before.shields).toMatchObject({ amount: zl(8640), target: zl(12000) })
    expect(before.hull).toEqual({ amount: zl(15000), target: zl(21900) })
    expect(before.costs).toEqual({ average: zl(3650), months: 0, source: 'assumed' })
    expect(before.range?.toFixed(1)).toBe('6.5')

    const delivery = tx('2026-10-10', zl(5000), { kind: 'income', counterparty: 'Domownik' })
    const after = dockingExample([delivery])
    expect(after.shields).toMatchObject({ amount: zl(12000), free: 0 })
    expect(after.hull.amount).toBe(zl(16640))
    expect(after.goals).toEqual([])
    expect(after.range?.toFixed(1)).toBe('7.8')
    expect(after.log.find((e) => e.txId === delivery.id)?.moves).toEqual({ shields: zl(3360), hull: zl(1640) })
    expect(after.shipClass).toBe('destroyer')
  })

  it('zasięg = (osłony + kadłub) / średnie koszty; klasy okrętu wg zasięgu (T10)', () => {
    expect(rangeMonths(zl(8640), zl(15000), zl(3650))).toBeCloseTo(6.4767, 3)
    expect(rangeMonths(zl(1), zl(1), null)).toBeNull()
    expect([0.99, 1, 2.99, 3, 5.99, 6, 8.99, 9, 11.99, 12, 30].map(shipClass)).toEqual([
      'scout',
      'corvette',
      'corvette',
      'frigate',
      'frigate',
      'destroyer',
      'destroyer',
      'cruiser',
      'cruiser',
      'flagship',
      'flagship'
    ])
  })
})

describe('pensja 1. dnia (spec: 4 000 zł przy osłonach 2 500 zł)', () => {
  it('2 500 z osłon + 1 500 z kadłuba i żółty alarm; za mało w kadłubie – pensja częściowa i czerwony', () => {
    expect(paySalary(zl(4000), zl(2500), zl(10000))).toEqual({ fromShields: zl(2500), fromHull: zl(1500), paid: zl(4000), alarm: 'yellow' })
    expect(paySalary(zl(4000), zl(1000), zl(500))).toEqual({ fromShields: zl(1000), fromHull: zl(500), paid: zl(1500), alarm: 'red' })
    expect(paySalary(zl(4000), zl(9000), 0)).toEqual({ fromShields: zl(4000), fromHull: 0, paid: zl(4000), alarm: null })
  })

  it('w silniku: energia = pensja, osłony 0, kadłub −1 500, alarm „salary-from-hull”', () => {
    const s = fleet({
      settings: settingsWith({ budget: { start: '2026-11-01', initial: { shields: zl(2500), hull: zl(10000), goals: {} } } }),
      balances: [opening('2026-11-01', zl(12500))],
      months: [plan('2026-11', zl(4000))],
      now: '2026-11-01T09:00:00+01:00'
    })
    expect(s.energy).toBe(zl(4000))
    expect(s.shields.amount).toBe(0)
    expect(s.hull.amount).toBe(zl(8500))
    expect(s.salary).toEqual({ fromShields: zl(2500), fromHull: zl(1500), paid: zl(4000), alarm: 'yellow' })
    expect(s.alarms).toContainEqual({ kind: 'salary-from-hull', level: 'yellow', date: '2026-11-01', amount: zl(1500), ref: '2026-11' })
    // Not a violation of the minimum shields by the user's decision (T16): the game decides in E7; here only the state.
    expect(s.alarms.find((a) => a.kind === 'shields-below-min')?.amount).toBe(zl(4000))
  })

  it('kolejny miesiąc: niewydana energia to łupy, bez decyzji w 7 dni trafiają do osłon (D18)', () => {
    const input = {
      settings: settingsWith({ budget: { start: '2026-10-01' } }),
      balances: [opening('2026-10-01', zl(20000))],
      months: [plan('2026-10', zl(4000))],
      transactions: [tx('2026-10-05', zl(-1000), { categoryId: FOOD })]
    }
    const first = fleet({ ...input, now: '2026-11-03T12:00:00+01:00' })
    expect(first.loot).toEqual({ month: '2026-10', amount: zl(3000) })
    expect(first.energy).toBe(zl(4000))
    const late = fleet({ ...input, now: '2026-11-08T08:00:00+01:00' })
    expect(late.loot).toEqual({ month: null, amount: 0 })
    expect(late.shields.amount).toBe(first.shields.amount + zl(3000))
  })

  it('podział łupów z decyzją: na cel, na następny miesiąc (dzienne koperty) i do osłon', () => {
    const trip = goal('Wyjazd', zl(5000), 1)
    const s = fleet({
      settings: settingsWith({ budget: { start: '2026-10-01' } }),
      balances: [opening('2026-10-01', zl(20000))],
      goals: [trip],
      months: [
        plan('2026-10', zl(4000), {}, { loot: { decidedAt: '2026-11-02T10:00:00.000Z', shields: zl(1000), nextMonth: zl(900), goals: { [trip.id]: zl(2000) } } }),
        plan('2026-11', zl(4000), { [FOOD]: zl(3000) })
      ],
      transactions: [tx('2026-10-05', zl(-100), { categoryId: FOOD })],
      now: '2026-11-03T12:00:00+01:00'
    })
    expect(s.loot.amount).toBe(0)
    expect(s.goals[0]?.amount).toBe(zl(2000))
    expect(s.energy).toBe(zl(4900))
    // The next month's daily envelopes grow by the loot: (3 000 + 900) / 30 days left of November on the 1st…
    expect(s.daily?.limit).toBe(zl(3900))
  })
})

describe('odkładki (spec: OC 1 240 zł rocznie)', () => {
  it('11 × 103,33 zł + 103,37 zł; podział z resztą w ostatniej części (T3)', () => {
    expect(sinkingSchedule(zl(1240), 12)).toEqual([...Array(11).fill(10333), 10337])
    expect(splitEvenly(zl(100), 3)).toEqual([3333, 3333, 3334])
    expect(splitEvenly(-zl(1240), 12).at(-1)).toBe(-10337)
  })

  const oc = containerSchema.parse({ ...base(), name: 'OC', amount: zl(1240), cycleMonths: 12, dueMonth: '2027-09', dueDay: 15, categoryId: defaultCategoryId(3, 3) })

  it('miejsce w cyklu i rata z nadrabianiem, gdy kontener doszedł późno', () => {
    expect(cyclePosition(oc, '2026-10')).toEqual({ index: 0, dueMonth: '2027-09' })
    expect(cyclePosition(oc, '2027-09')).toEqual({ index: 11, dueMonth: '2027-09' })
    expect(cyclePosition(oc, '2027-10')).toEqual({ index: 0, dueMonth: '2028-09' })
    expect(sinkingInstallment(oc, '2026-10', 0)).toBe(10333)
    expect(sinkingInstallment(oc, '2027-09', 10333 * 11)).toBe(10337)
    // Three months before the payment, an empty tank: the gap spread over the months left, the whole fee in the tank.
    const late = [sinkingInstallment(oc, '2027-07', 0)]
    late.push(sinkingInstallment(oc, '2027-08', late[0]!))
    late.push(sinkingInstallment(oc, '2027-09', late[0]! + late[1]!))
    expect(late).toEqual([41332, 41332, 41336])
    expect(late.reduce((a, b) => a + b, 0)).toBe(zl(1240))
    // A surplus in the tank lowers the installments, never below zero.
    expect(sinkingInstallment(oc, '2026-10', zl(2000))).toBe(0)
  })

  it('w silniku: zbiornik rośnie co miesiąc z energii, opłata w terminie idzie ze zbiornika, nie z energii', () => {
    const months = Array.from({ length: 12 }, (_, i) => plan(`20${26 + Math.floor((9 + i) / 12)}-${String(((9 + i) % 12) + 1).padStart(2, '0')}`, zl(4000)))
    const input = { settings: settingsWith({ budget: { start: '2026-10-01' } }), balances: [opening('2026-10-01', zl(60000))], months, containers: [oc] }
    const s = fleet({ ...input, now: '2027-09-10T12:00:00+02:00' })
    const installments = s.log.filter((e) => e.kind === 'sinking').map((e) => e.amount)
    expect(installments).toEqual([...Array(11).fill(10333), 10337])
    expect(s.tanks).toEqual([{ containerId: oc.id, name: 'OC', amount: zl(1240), dueMonth: '2027-09', due: zl(1240) }])
    expect(s.energy).toBe(zl(4000) - 10337)
    const paid = fleet({ ...input, transactions: [tx('2027-09-15', -zl(1240), { containerId: oc.id, categoryId: oc.categoryId })], now: '2027-09-16T12:00:00+02:00' })
    expect(paid.tanks[0]?.amount).toBe(0)
    expect(paid.energy).toBe(zl(4000) - 10337)
    expect(paid.alarms.filter((a) => a.kind === 'sinking-short')).toEqual([])
  })
})

describe('dzienny przydział (energia dziś)', () => {
  it('niewydana energia przechodzi na kolejne dni, przekroczenie zmniejsza przydział', () => {
    // Daily envelopes 3 100 zł in a 31-day month: 100 zł a day.
    const day1 = dailyAllowance({ limit: zl(3100), spentBefore: 0, spentToday: zl(40), day: 1, daysInMonth: 31 })
    expect(day1).toEqual({ base: zl(100), allowance: zl(100), left: zl(60), daysLeft: 31 })
    const day2 = dailyAllowance({ limit: zl(3100), spentBefore: zl(40), spentToday: zl(300), day: 2, daysInMonth: 31 })
    expect(day2.allowance).toBe(zl(102))
    expect(day2.left).toBe(zl(-198))
    const day3 = dailyAllowance({ limit: zl(3100), spentBefore: zl(340), spentToday: 0, day: 3, daysInMonth: 31 })
    expect(day3.allowance).toBe(Math.floor(zl(2760) / 29))
    expect(day3.allowance).toBeLessThan(zl(100))
    expect(dailyAllowance({ limit: zl(100), spentBefore: zl(500), spentToday: 0, day: 10, daysInMonth: 30 }).allowance).toBe(0)
  })

  it('w silniku: tylko koperty codzienne (Jedzenie, Rozrywka, Osobiste, Gotówka) i wydatki bez kategorii; planowe osobno', () => {
    const input = {
      settings: settingsWith({ budget: { start: '2026-10-01' } }),
      balances: [opening('2026-10-01', zl(20000))],
      months: [plan('2026-10', zl(6000), { [FOOD]: zl(2000), [FUN]: zl(1100), [AUTO]: zl(500) })],
      transactions: [
        tx('2026-10-01', zl(-40), { categoryId: GROCERIES }),
        tx('2026-10-02', zl(-250), { categoryId: FUN }),
        tx('2026-10-02', zl(-50)),
        tx('2026-10-02', zl(-400), { categoryId: AUTO }),
        tx('2026-10-02', zl(-90), { categoryId: FOOD, refundable: true })
      ]
    }
    const day2 = fleet({ ...input, now: '2026-10-02T20:00:00+02:00' })
    expect(day2.daily).toMatchObject({ limit: zl(3100), base: zl(100), spentBefore: zl(40), spentToday: zl(300), allowance: zl(102), left: zl(-198) })
    expect(day2.alarms.find((a) => a.kind === 'daily-over')?.amount).toBe(zl(198))
    const day3 = fleet({ ...input, now: '2026-10-03T08:00:00+02:00' })
    expect(day3.daily?.allowance).toBe(Math.floor(zl(2760) / 29))
    expect(day3.envelopes.find((e) => e.categoryId === AUTO)).toEqual({ categoryId: AUTO, kind: 'planned', limit: zl(500), spent: zl(400), left: zl(100), today: 0 })
    expect(day3.envelopes.find((e) => e.categoryId === FOOD)?.spent).toBe(zl(40))
    // Energy money: 6 000 − 40 − 250 − 50 − 400 (the purchase for the house is not from the energy).
    expect(day3.energy).toBe(zl(5260))
  })
})

describe('zakup „do zwrotu” i wpłata domownika (D20, D21)', () => {
  const input = (extra: Transaction[]) => ({
    settings: settingsWith({ budget: { start: '2026-10-01', initial: { shields: zl(12000), hull: zl(3000), goals: {} } }, layers: { assumedCosts: zl(3000) } }),
    balances: [opening('2026-10-01', zl(19000))],
    months: [plan('2026-10', zl(4000), { [FOOD]: zl(3100) })],
    transactions: extra,
    now: '2026-10-20T12:00:00+02:00'
  })

  it('zakup „do zwrotu” nie zmienia energii: pożycza z osłon, powstaje należność', () => {
    const plain = fleet(input([]))
    const bought = tx('2026-10-05', zl(-150), { categoryId: GROCERIES, refundable: true })
    const s = fleet(input([bought]))
    expect(s.energy).toBe(plain.energy)
    expect(s.daily?.spentBefore).toBe(0)
    expect(s.shields.amount).toBe(plain.shields.amount - zl(150))
    expect(s.receivables).toEqual({
      house: zl(150),
      houseSince: '2026-10-05',
      members: [{ memberId: HOUSE_MEMBER_ID, owed: zl(150), deposit: 0, open: [{ txId: bought.id, date: '2026-10-05', amount: zl(150) }], since: '2026-10-05' }],
      loans: {},
      total: zl(150)
    })
    expect(costOf(bought)).toBe(0)
  })

  it('wpłata zamyka należność (do osłon), nadwyżka dokuje jako przychód', () => {
    const plain = fleet(input([]))
    const bought = tx('2026-10-05', zl(-150), { categoryId: GROCERIES, refundable: true })
    const paid = tx('2026-10-07', zl(200), { kind: 'income', repaid: zl(150), counterparty: 'Domownik' })
    const s = fleet(input([bought, paid]))
    expect(s.receivables.house).toBe(0)
    expect(s.energy).toBe(plain.energy)
    // The repaid 150 zł go back to the shields; the surplus 50 zł docks: the shields are full (12 000), so the hull.
    expect(s.log.find((e) => e.txId === paid.id)?.moves).toEqual({ house: zl(-150), shields: zl(150), hull: zl(50) })
    expect(s.shields.amount).toBe(plain.shields.amount)
    expect(s.hull.amount).toBe(plain.hull.amount + zl(50))
  })

  it('podział paragonu: część swoja z energii, część domowa jako należność', () => {
    const receipt = tx('2026-10-06', zl(-120), {
      splits: [
        { id: nextId(), amount: zl(-80), categoryId: GROCERIES, refundable: false, memberId: null, note: '' },
        { id: nextId(), amount: zl(-40), categoryId: GROCERIES, refundable: true, memberId: null, note: 'dla domu' }
      ]
    })
    expect(partsOf(receipt).map((p) => [p.amount, p.refundable])).toEqual([
      [zl(-80), false],
      [zl(-40), true]
    ])
    const plain = fleet(input([]))
    const s = fleet(input([receipt]))
    expect(s.energy).toBe(plain.energy - zl(80))
    expect(s.receivables.house).toBe(zl(40))
    expect(costOf(receipt)).toBe(zl(80))
  })
})

describe('pule ICTTJ: Cele → cele, Podatek → poza kosztami (D55, D58)', () => {
  const bike = goal('Rower', zl(2000), 1)
  const flat = goal('Mieszkanie', zl(50000), 2)
  const input = (extra: Transaction[], dockings: ReturnType<typeof dockingSchema.parse>[]) => ({
    settings: settingsWith({ budget: { start: '2026-10-01' } }),
    balances: [opening('2026-10-01', zl(1000))],
    goals: [bike, flat],
    transactions: extra,
    dockings,
    now: '2026-10-20T12:00:00+02:00'
  })

  it('wypłata z puli Cele idzie prosto do celów wg priorytetów (osłony i kadłub pomijane)', () => {
    const payout = tx('2026-10-10', zl(3000), { kind: 'trading', counterparty: 'XTB S.A.' })
    const s = fleet(input([payout], [dockingSchema.parse({ ...base(), date: '2026-10-10', transactionId: payout.id, pool: 'goals', ictjEntryId: 'P1' })]))
    expect(s.goals.map((g) => [g.name, g.amount])).toEqual([
      ['Rower', zl(2000)],
      ['Mieszkanie', zl(1000)]
    ])
    expect(s.shields.amount).toBe(zl(1000))
  })

  it('wypłata z puli Podatek czeka poza budżetem; przelew PIT-38 z niej nie jest kosztem', () => {
    const payout = tx('2026-10-10', zl(1900), { kind: 'trading' })
    const pit = tx('2026-10-15', zl(-1900), { kind: 'tax', counterparty: 'Urząd Skarbowy' })
    const held = fleet(input([payout], [dockingSchema.parse({ ...base(), date: '2026-10-10', transactionId: payout.id, pool: 'tax' })]))
    expect(held.taxHold).toBe(zl(1900))
    expect(held.shields.amount).toBe(zl(1000))
    const paid = fleet(input([payout, pit], [dockingSchema.parse({ ...base(), date: '2026-10-10', transactionId: payout.id, pool: 'tax' })]))
    expect(paid.taxHold).toBe(0)
    expect(paid.shields.amount).toBe(zl(1000))
    expect(costOf(pit)).toBe(0)
    // Not an income for the statistics either: only deliveries count (the hold is the tax's money).
    expect(paid.costs.average).toBeNull()
  })

  it('podział wybrany w oknie dokowania: kwoty jak w rekordzie, reszta do osłon', () => {
    const payout = tx('2026-10-10', zl(3000), { kind: 'trading' })
    const s = fleet(input([payout], [dockingSchema.parse({ ...base(), date: '2026-10-10', transactionId: payout.id, split: { shields: 0, hull: zl(500), goals: { [flat.id]: zl(1000) }, taxHold: 0 } })]))
    expect(s.hull.amount).toBe(zl(500))
    expect(s.goals.find((g) => g.id === flat.id)?.amount).toBe(zl(1000))
    expect(s.shields.amount).toBe(zl(1000) + zl(1500))
  })
})

describe('firewall dopłat do XTB (D23)', () => {
  const input = (shields: number, hull: number, topUp: number) => ({
    settings: settingsWith({ budget: { start: '2026-10-01', initial: { shields, hull, goals: {} } }, layers: { assumedCosts: zl(3000) } }),
    balances: [opening('2026-10-01', shields + hull)],
    months: [plan('2026-10', zl(4000))],
    transactions: [tx('2026-10-10', -topUp, { kind: 'trading', counterparty: 'xtb.com' })],
    now: '2026-10-11T12:00:00+02:00'
  })

  it('tylko z „wolnego do decyzji”, gdy osłony i kadłub są pełne; inaczej czerwony alarm', () => {
    // Shields 12 000 after the salary + 2 000 free; hull full (18 000 = 6 × 3 000).
    const ok = fleet(input(zl(18000), zl(18000), zl(1500)))
    expect(ok.alarms.filter((a) => a.kind === 'firewall')).toEqual([])
    expect(ok.shields.free).toBe(zl(500))
    const tooMuch = fleet(input(zl(18000), zl(18000), zl(2500)))
    expect(tooMuch.alarms.find((a) => a.kind === 'firewall')).toMatchObject({ level: 'red', amount: zl(2500) })
    const hullLow = fleet(input(zl(18000), zl(10000), zl(500)))
    expect(hullLow.alarms.some((a) => a.kind === 'firewall')).toBe(true)
    // Not a cost: the average costs are not touched.
    expect(costOf(tx('2026-10-10', zl(-500), { kind: 'trading' }))).toBe(0)
  })
})

describe('salda kont i start budżetu', () => {
  it('saldo = saldo otwarcia na początek dnia + operacje od tego dnia; konto dołączone później wpływa do osłon', () => {
    const s = fleet({
      settings: settingsWith(),
      balances: [opening('2026-08-06', zl(1000)), opening('2026-10-10', zl(300), XTB_WALLET_ACCOUNT_ID)],
      transactions: [
        tx('2026-08-05', zl(-999)),
        tx('2026-08-06', zl(-100)),
        tx('2026-09-01', zl(500), { kind: 'income' }),
        tx('2026-10-09', zl(-50), { accountId: XTB_WALLET_ACCOUNT_ID }),
        tx('2026-10-12', zl(-20), { accountId: XTB_WALLET_ACCOUNT_ID })
      ],
      now: '2026-10-20T12:00:00+02:00'
    })
    expect(s.start).toBe('2026-08-06')
    expect(s.accounts.map((a) => [a.name, a.balance])).toEqual([
      ['mBank', zl(1400)],
      ['Portfel XTB', zl(280)]
    ])
    expect(s.total).toBe(zl(1680))
    // No salary yet: every delivery stays in the shields, expenses come from them.
    expect(s.shields.amount).toBe(zl(1680))
    expect(s.log.find((e) => e.kind === 'account')).toMatchObject({ date: '2026-10-10', amount: zl(300) })
  })

  it('bez salda otwarcia i bez startu: salda z operacji, warstwy nie płyną', () => {
    const s = fleet({ transactions: [tx('2026-10-01', zl(-100))], now: '2026-10-02T12:00:00+02:00' })
    expect(s.started).toBe(false)
    expect(s.total).toBe(zl(-100))
    expect(s.range).toBeNull()
    expect(s.log).toEqual([])
  })

  it('operacje z przyszłą datą nie liczą się do dziś', () => {
    const s = fleet({ balances: [opening('2026-10-01', zl(100))], transactions: [tx('2026-10-30', zl(-50))], now: '2026-10-20T12:00:00+02:00' })
    expect(s.total).toBe(zl(100))
  })
})

describe('koszty netto, średnie i masa ładunku', () => {
  it('koszty netto: wydatki minus zwroty towaru, bez przelewów własnych, XTB, „do zwrotu” i PIT-38; średnia z pełnych miesięcy', () => {
    const txs = [
      tx('2026-08-20', zl(-500)),
      tx('2026-09-02', zl(-3000), { categoryId: FOOD }),
      tx('2026-09-03', zl(200), { categoryId: FOOD }),
      tx('2026-09-04', zl(-1000), { kind: 'transfer' }),
      tx('2026-09-05', zl(-700), { kind: 'trading' }),
      tx('2026-09-06', zl(-80), { refundable: true }),
      tx('2026-10-01', zl(-4000), { categoryId: AUTO }),
      tx('2026-10-05', zl(2500), { kind: 'income' })
    ]
    const s = fleet({ transactions: txs, now: '2026-11-15T12:00:00+01:00' })
    // August is partial (the data start on the 20th): September 2 800 and October 4 000.
    expect(s.costs).toEqual({ average: zl(3400), months: 2, source: 'history' })
    expect(s.income).toEqual({ average: zl(1250), months: 2 })
  })

  it('masa ładunku: stałe koszty miesięcznie (okresowe w części miesięcznej) jako % pensji, linia zanurzenia 40%', () => {
    const rent = containerSchema.parse({ ...base(), name: 'Czynsz', amount: zl(1500), cycleMonths: 1, dueMonth: '2026-10' })
    const oc = containerSchema.parse({ ...base(), name: 'OC', amount: zl(1200), cycleMonths: 12, dueMonth: '2027-03' })
    const old = containerSchema.parse({ ...base(), name: 'Stary', amount: zl(999), cycleMonths: 1, dueMonth: '2026-01', until: '2026-06' })
    expect(cargoMass([rent, oc, old], '2026-10', zl(4000), 40)).toEqual({ monthly: zl(1600), pct: 40, limitPct: 40, over: false })
    expect(cargoMass([rent, oc], '2026-10', zl(3000), 40).over).toBe(true)
    expect(cargoMass([rent], '2026-10', null, 40).pct).toBeNull()
  })
})
