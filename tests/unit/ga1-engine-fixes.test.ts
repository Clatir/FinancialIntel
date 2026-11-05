/**
 * GA-1 (1.17.1): Silnik pieniędzy i wyrocznia (T495–T499):
 * - T495: zaległy termin opłaty zamknięty przesunięciem przez drugą płatność okna wpisaną naprzód – zaplanowany
 *   (`CargoStatus.planned`, `plannedDues`), bez podwójnego odjęcia na Radarze i w saldach naprzód;
 * - T496: `priceChanges` w `cargoWatch.ts` pomija płatności wpisane naprzód (`p.date <= o.today`);
 * - T497: boja roczna (`yearly: true`) przy średniej kosztów z pełnych 12 miesięcy historii nie dubluje się w `extras`
 *   kursu ani `later` prognozy wieloletniej (T276);
 * - T498: cel z terminem (`deadline`) osiągnięty w kursie i prognozie wieloletniej zostaje wydany w miesiącu terminu
 *   (albo osiągnięcia po nim), a cel bez terminu zostaje w pieniądzach;
 * - T499: ukryty `containerId` na operacji innego rodzaju niż wydatek (`operations.ts`) ignorowany; wyrocznia (`silnik.mjs`)
 *   bierze `d.countedFrom ?? d.createdAt` (T363) i rozlicza części domowników oraz pożyczek przed `tradingInflow` dla
 *   wpływu w parze z ICTTJ (T341).
 */
import { describe, expect, it } from 'vitest'
import { accountsAhead } from '@shared/calc/ahead'
import { cargoDays, cargoStatuses, plannedDues } from '@shared/calc/cargoStatus'
import { priceChanges } from '@shared/calc/cargoWatch'
import { course, courseInputOf, type CourseInput } from '@shared/calc/course'
import { addDays } from '@shared/calc/dates'
import { computeFleet, layersSum, type FleetInput, type FleetState, type PendingPair } from '@shared/calc/fleet'
import { forecast, forecastInputOf, type ForecastAssumptions } from '@shared/calc/forecast'
import { isCargoPayment, isConfirmedNight, nightVerdict, partsOf } from '@shared/calc/operations'
import { radar, RADAR_DAYS } from '@shared/calc/radar'
import { createDefaultSettings } from '@shared/defaults'
import {
  balanceSchema,
  containerSchema,
  dockingSchema,
  goalSchema,
  loanSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  scheduledSchema,
  SCHEMA_VERSION,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
  type Container,
  type Settings,
  type Transaction
} from '@shared/schema'
import { normalizeInput } from '../audyt/wyrocznia/lib/dane.mjs'
import { runFleet } from '../audyt/wyrocznia/lib/silnik.mjs'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9GA1000000000000000${String(++seq).padStart(4, '0')}`
const base = (createdAt = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt, updatedAt: createdAt })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2026-01', accountId: MBANK_ACCOUNT_ID, ...over })
const pay = (c: Container, date: string, amount = c.amount): Transaction =>
  transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -amount, containerId: c.id, counterparty: c.name })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`

describe('T495: zaległy termin zamknięty przesunięciem przez 2. płatność okna wpisaną naprzód', () => {
  const START = '2026-08-01'

  function setup(containers: Container[], transactions: Transaction[], today: string) {
    const s0 = createDefaultSettings(AT).settings
    const settings: Settings = { ...s0, budget: { ...s0.budget, start: START } }
    const fleet = computeFleet({
      settings,
      balances: [balanceSchema.parse({ ...base(), date: START, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(30000) })],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-08', salary: zl(5000), envelopes: {} })],
      transactions,
      containers,
      now: `${today}T12:00:00+01:00`
    })
    expect(layersSum(fleet)).toBe(fleet.total)
    const cargo = cargoStatuses({ containers, transactions, today, coveredTo: {}, start: START })
    const payDays = cargoDays({ containers, transactions, today })
    const planned = plannedDues({ containers, transactions, today, start: START })
    const items = radar({ today, plans: [], containers, tanks: fleet.tanks, loans: [], money, cargo, payDays, planned })
    const mbank = accountsAhead({ today, balances: fleet.accounts, accounts: s0.accounts, items, transactions, end: addDays(today, RADAR_DAYS) }).find((a) => a.accountId === MBANK_ACCOUNT_ID)!
    return { fleet, cargo, planned, items, moves: mbank.moves.map((m): [string, number] => [m.date, m.amount]) }
  }

  it('kwartalna: zaległy sierpień zamknięty przesunięciem przez drugą płatność listopada wpisaną naprzód – zaplanowany, raz w saldach', () => {
    const waste = container({ name: 'Wywóz śmieci', amount: zl(240), cycleMonths: 3, dueMonth: '2026-08', dueDay: 10 })
    const second = pay(waste, '2026-11-25')
    const txs = [pay(waste, '2026-11-10'), second]
    const o = setup([waste], txs, '2026-11-14')

    expect(o.cargo.map((s) => [s.due, s.state, s.carried, s.planned?.date ?? null])).toEqual([
      ['2026-08-10', 'overdue', true, '2026-11-25'],
      ['2026-11-10', 'paid', false, null]
    ])
    expect([...(o.planned.get(waste.id) ?? [])]).toEqual(['2026-08'])
    expect(o.items.filter((i) => i.ref === waste.id && i.date < '2027-01-01')).toEqual([])
    expect(o.moves.filter(([d]) => d <= '2026-12-31')).toEqual([['2026-11-25', -zl(240)]])
  })

  it('miesięczna: zaległy październik zamknięty przesunięciem przez drugą płatność listopada wpisaną naprzód – zaplanowany, raz w saldach', () => {
    const rent = container({ name: 'Czynsz', amount: zl(1200), cycleMonths: 1, dueMonth: '2026-09', dueDay: 10, from: '2026-09' })
    const second = pay(rent, '2026-11-25')
    const txs = [pay(rent, '2026-09-10'), pay(rent, '2026-11-10'), second]
    const o = setup([rent], txs, '2026-11-14')

    expect(o.cargo.map((s) => [s.due, s.state, s.carried, s.planned?.date ?? null])).toEqual([
      ['2026-10-10', 'overdue', true, '2026-11-25'],
      ['2026-11-10', 'paid', false, null]
    ])
    expect([...(o.planned.get(rent.id) ?? [])]).toEqual(['2026-10'])
    expect(o.items.filter((i) => i.ref === rent.id && i.date < '2026-12-01')).toEqual([])
    expect(o.moves.filter(([d]) => d < '2026-12-01')).toEqual([['2026-11-25', -zl(1200)]])
  })
})

describe('T496: priceChanges w cargoWatch.ts pomija płatności wpisane naprzód', () => {
  it('przyszłe płatności (> today) nie wywołują przedwczesnej zmiany ceny ani nie przesuwają dnia płatności dziś', () => {
    const net = container({ name: 'Internet', amount: zl(100), cycleMonths: 1, dueMonth: '2026-07', dueDay: 10 })
    const txs = [
      pay(net, '2026-07-10', zl(100)),
      pay(net, '2026-08-10', zl(100)),
      pay(net, '2026-09-10', zl(100)),
      pay(net, '2026-10-10', zl(150)),
      pay(net, '2026-11-10', zl(150))
    ]
    expect(priceChanges({ containers: [net], transactions: txs, today: '2026-09-15', coveredTo: {} })).toEqual([])
    expect(priceChanges({ containers: [net], transactions: txs, today: '2026-11-15', coveredTo: {} })).toMatchObject([
      { containerId: net.id, from: zl(100), to: zl(150) }
    ])
  })
})

describe('T497: boja roczna nie dubluje się ze średnią z pełnych 12 miesięcy w kursie i prognozie (T276)', () => {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = { ...s0, budget: { ...s0.budget, start: '2025-10-01', initial: { shields: zl(12000), hull: zl(18000), goals: {} } } }
  const plans = [monthPlanSchema.parse({ ...base(), month: '2025-10', salary: zl(4000), envelopes: {} })]
  const yearlyBuoy = scheduledSchema.parse({ ...base(), name: 'Ubezpieczenie OC', date: '2026-03-15', amount: -zl(1200), yearly: true })
  const onceBuoy = scheduledSchema.parse({ ...base(), name: 'Przegląd', date: '2027-04-10', amount: -zl(500), yearly: false })
  const onceLater = scheduledSchema.parse({ ...base(), name: 'Remont', date: '2028-05-10', amount: -zl(2000), yearly: false })

  it('przy 12 pełnych miesiącach historii pomija boję roczną w extras i later, zostawiając jednorazowe; przy krótszej historii zostawia obie', () => {
    const fullMonths = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']
    const txs12 = fullMonths.map((m) => transactionSchema.parse({ ...base(), date: `${m}-15`, accountId: MBANK_ACCOUNT_ID, amount: -zl(3000), counterparty: 'Sklep' }))
    const fleet12 = computeFleet({
      settings,
      balances: [balanceSchema.parse({ ...base(), date: '2025-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(66000) })],
      months: plans,
      transactions: txs12,
      now: '2026-10-15T12:00:00+02:00'
    })
    expect(fleet12.costs).toEqual({ average: zl(3000), months: 12, source: 'history' })

    const ci12 = courseInputOf(fleet12, { settings, plans, goals: [], scheduled: [yearlyBuoy, onceBuoy, onceLater], transactions: txs12 })!
    expect(ci12.extras.get('2027-03')).toBeUndefined()
    expect(ci12.extras.get('2027-04')).toBe(-zl(500))

    const fi12 = forecastInputOf(fleet12, ci12, { scheduled: [yearlyBuoy, onceBuoy, onceLater], transactions: txs12 })
    expect(fi12.later.get('2028-03')).toBeUndefined()
    expect(fi12.later.get('2028-05')).toBe(-zl(2000))

    // Krótsza historia (3 miesiące) – boja roczna nadal wchodzi do extras i later.
    const shortSettings: Settings = { ...s0, budget: { ...s0.budget, start: '2026-07-01', initial: { shields: zl(12000), hull: zl(18000), goals: {} } } }
    const txs3 = ['2026-07', '2026-08', '2026-09'].map((m) =>
      transactionSchema.parse({ ...base(), date: `${m}-15`, accountId: MBANK_ACCOUNT_ID, amount: -zl(3000), counterparty: 'Sklep' })
    )
    const fleet3 = computeFleet({
      settings: shortSettings,
      balances: [balanceSchema.parse({ ...base(), date: '2026-07-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(39000) })],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-07', salary: zl(4000), envelopes: {} })],
      transactions: txs3,
      now: '2026-10-15T12:00:00+02:00'
    })
    expect(fleet3.costs.months).toBe(3)
    const ci3 = courseInputOf(fleet3, { settings: shortSettings, plans, goals: [], scheduled: [yearlyBuoy, onceBuoy], transactions: txs3 })!
    expect(ci3.extras.get('2027-03')).toBe(-zl(1200))
  })
})

describe('T498: osiągnięty cel z terminem w kursie i prognozie wieloletniej zostaje wydany w terminie', () => {
  const flat: ForecastAssumptions = { wages: 0, inflation: 0, deliveries: 0, oneOff: 0 }

  it('cel z deadline po osiągnięciu 100% w miesiącu terminu zostaje wydany (nie zostaje w pieniądzach ani nie zbiera ponownie), a cel bez terminu zostaje', () => {
    const baseCourse: CourseInput = {
      month: '2026-10',
      shields: zl(9000),
      hull: zl(15000),
      goals: [
        { id: 'trip', name: 'Wakacje', amount: 0, target: zl(2500), deadline: '2027-02' },
        { id: 'reserve', name: 'Auto', amount: 0, target: zl(2000), deadline: null }
      ],
      salaryOf: () => zl(3000),
      costs: zl(2500),
      layers: { shieldSalaries: 3, hullMonths: 6 },
      minShieldSalaries: 1,
      income: { work: zl(3500), trading: 0 },
      extras: new Map(),
      debt: 0
    }
    const c = course(baseCourse, 'noXtb')
    // W 2026-11 do celów idzie 500 zł, od 2026-12 po 1 000 zł/mies.: trip osiąga 2 500 zł w 2027-01 (przed terminem 2027-02), a w 2027-02 zostaje wydany.
    expect(c.goalEta.trip).toBe('2027-01')
    expect(c.goalEta.reserve).toBe('2027-03')
    expect(c.months.find((m) => m.month === '2027-01')!.goals.trip).toBe(zl(2500))
    expect(c.months.find((m) => m.month === '2027-02')!.goals.trip).toBe(0)
    expect(c.months.at(-1)!.goals).toEqual({ trip: 0, reserve: zl(2000) })

    const fc = forecast(
      {
        course: baseCourse,
        work: zl(3500),
        total: zl(24000),
        tanksNow: 0,
        taxHold: 0,
        household: 0,
        given: { open: 0, repayments: [] },
        later: new Map()
      },
      'base',
      flat,
      2
    )
    expect(fc.goalEta).toEqual({ trip: '2027-01', reserve: '2027-03' })
    expect(fc.years[0]!.goals).toBe(zl(2000))
    expect(fc.years[1]!.goals).toBe(zl(2000))
  })
})

describe('T499: ukryty containerId na operacjach niebędących wydatkiem oraz wyrocznia T363 / T341', () => {
  it('operations.ts ignoruje containerId, gdy kind !== expense', () => {
    const cid = '01K9C0NT000000000000000001'
    const incomeWithContainer = transactionSchema.parse({
      ...base(),
      kind: 'income',
      date: '2026-10-10',
      time: '23:30',
      logNote: 'nocny wpis',
      accountId: MBANK_ACCOUNT_ID,
      amount: zl(500),
      containerId: cid,
      splits: [{ id: nextId(), amount: zl(500), categoryId: null, refundable: false, note: '', containerId: cid }]
    })
    expect(partsOf(incomeWithContainer)[0]!.containerId).toBeUndefined()
    expect(isCargoPayment(incomeWithContainer, new Set([cid]))).toBe(false)

    const transferNight = transactionSchema.parse({
      ...base(),
      kind: 'transfer',
      date: '2026-10-10',
      time: '23:30',
      logNote: 'nocny przelew',
      accountId: MBANK_ACCOUNT_ID,
      amount: -zl(500),
      containerId: cid
    })
    expect(nightVerdict(transferNight)).not.toBe('justified')
    expect(isConfirmedNight(transferNight, { quietHours: { from: '23:00', to: '05:00' } })).toBe(false)
  })

  it('wyrocznia T363 (countedFrom dokowania) i T341 (części domownika i pożyczki przy wpływie w parze z ICTTJ) = silnik', () => {
    const marekId = '01K9MEM0000000000000000001'
    const s0 = createDefaultSettings(AT).settings
    const settings: Settings = {
      ...s0,
      budget: { ...s0.budget, start: '2026-10-01', initial: { shields: zl(16000), hull: zl(18000), goals: {} } },
      layers: { ...s0.layers, assumedCosts: zl(3000) },
      household: {
        ...s0.household,
        since: null,
        assignFrom: null,
        members: [...s0.household.members, { id: marekId, name: 'Marek', bankNames: ['MAREK'], inflow: 'repay', archived: false, via: null, opening: { owed: zl(400), deposit: 0 } }]
      }
    }
    const goal = goalSchema.parse({
      ...base('2026-10-01T00:00:00.000Z'),
      name: 'Laptop',
      target: zl(5000),
      priority: 1,
      past: [{ until: '2026-10-12T12:00:00.000Z', target: zl(1000), priority: 1, archived: false, deadline: null }]
    })
    const givenLoan = loanSchema.parse({
      ...base('2026-10-01T00:00:00.000Z'),
      name: 'Pożyczka dla brata',
      direction: 'given',
      amount: zl(600),
      date: '2026-09-15',
      installments: []
    })

    // (a) T363: dokowanie zapisane 10.10, ale z countedFrom = 15.10 (po podniesieniu celu z 1 000 zł na 5 000 zł dnia 12.10).
    const dockedTx = transactionSchema.parse({
      ...base('2026-10-10T10:00:00.000Z'),
      kind: 'trading',
      date: '2026-10-10',
      accountId: XTB_WALLET_ACCOUNT_ID,
      amount: zl(3000),
      counterparty: 'XTB'
    })
    const docking = dockingSchema.parse({
      ...base('2026-10-10T10:05:00.000Z'),
      date: '2026-10-10',
      transactionId: dockedTx.id,
      pool: 'current',
      countedFrom: '2026-10-15T10:00:00.000Z'
    })

    // (b) T341: wpływ na Portfel XTB w parze z wpisem ICTTJ (pula 'tax'), zawierający część od domownika (400 zł spłaty)
    // i część spłaty pożyczki udzielonej (600 zł), oraz 1 000 zł własnego wpływu.
    const pairedIncome = transactionSchema.parse({
      ...base('2026-10-18T10:00:00.000Z'),
      kind: 'income',
      date: '2026-10-18',
      accountId: XTB_WALLET_ACCOUNT_ID,
      amount: zl(2000),
      counterparty: 'Wypłata',
      splits: [
        { id: nextId(), amount: zl(400), categoryId: null, refundable: false, memberId: marekId, inflowKind: 'repay', note: 'od Marka' },
        { id: nextId(), amount: zl(600), categoryId: null, refundable: false, loanId: givenLoan.id, note: 'zwrot pożyczki' },
        { id: nextId(), amount: zl(1000), categoryId: null, refundable: false, note: 'wypłata własna' }
      ]
    })
    const pendingPairs = new Map<string, PendingPair>([
      [pairedIncome.id, { entryDate: '2026-10-18', pool: 'tax' }]
    ])

    const input: FleetInput = {
      settings,
      balances: [
        balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(34000) }),
        balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: XTB_WALLET_ACCOUNT_ID, kind: 'opening', amount: 0 })
      ],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000), envelopes: {} })],
      transactions: [dockedTx, pairedIncome],
      containers: [],
      goals: [goal],
      loans: [givenLoan],
      dockings: [docking],
      pendingPairs,
      now: '2026-10-20T12:00:00+02:00'
    }

    const app = computeFleet(input)
    expect(layersSum(app)).toBe(app.total)
    const oInput = normalizeInput({ ...input, settings: JSON.parse(JSON.stringify(settings)), scheduled: [], imports: [] })
    const oracle = runFleet(oInput, { today: '2026-10-20', household: 'D99', pendingPairs })
    expect(oracle.layersSum).toBe(oracle.accountsTotal)

    // T363: cel w chwili countedFrom (15.10) ma target 5 000 zł, więc całe 3 000 zł trafia do celu.
    expect(app.goals.find((g) => g.id === goal.id)?.amount).toBe(zl(3000))
    expect(oracle.state.G.get(goal.id)).toBe(zl(3000))

    // T341: tylko 1 000 zł trafia do rezerwy podatkowej ('tax') i do toDock.inflow; 400 zł spłaca dług Marka, 600 zł pożyczkę.
    expect(app.taxHold).toBe(zl(1000))
    expect(oracle.state.X).toBe(zl(1000))
    expect(app.shields.amount).toBe(oracle.state.S)
    expect(app.toDock.inflow).toBe(zl(1000))
    expect(oracle.toDock.inflow).toBe(zl(1000))
  })
})
