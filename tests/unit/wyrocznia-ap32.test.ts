/**
 * AP-32 (N2): the blind oracle (`tests/audyt/wyrocznia`, written from the requirements only) against the engine on the
 * rules of N2 – the same records, the same moment, the same money (fast, in `npm test`; the audit's snapshots:
 * `npm run test:wyrocznia`) – and „ten sam stan – ta sama liczba na każdym ekranie”: the deposit at the persons, the
 * asteroid's due, the range, the export against the bar of Operacje.
 */
import { describe, expect, it } from 'vitest'
import { briefing } from '@shared/calc/briefing'
import { cargoStatuses } from '@shared/calc/cargoStatus'
import { computeFleet, layersSum, rangeMonths, type FleetInput, type FleetState, type PendingPair } from '@shared/calc/fleet'
import { radar } from '@shared/calc/radar'
import { createDefaultSettings } from '@shared/defaults'
import { operationRows } from '@shared/export/budget'
import { sumOperations } from '@shared/operationsView'
import {
  balanceSchema,
  containerSchema,
  defaultCategoryId,
  dockingSchema,
  goalSchema,
  loanSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  TX_KIND_LABEL,
  XTB_WALLET_ACCOUNT_ID,
  type Settings,
  type Transaction
} from '@shared/schema'
import { normalizeInput } from '../audyt/wyrocznia/lib/dane.mjs'
import { runFleet } from '../audyt/wyrocznia/lib/silnik.mjs'

const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9W${String(++seq).padStart(21, '0')}`
const base = (createdAt = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt, updatedAt: createdAt })
const FOOD = defaultCategoryId(1)
const AUTO = defaultCategoryId(3)
const zl = (v: number) => Math.round(v * 100)

const tx = (date: string, amount: number, over: Record<string, unknown> = {}): Transaction => transactionSchema.parse({ ...base(over.createdAt as string | undefined), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const plan = (month: string, salary: number, envelopes: Record<string, number> = {}) => monthPlanSchema.parse({ ...base(), month, salary, envelopes })
const opening = (date: string, amount: number, accountId = MBANK_ACCOUNT_ID) => balanceSchema.parse({ ...base(), date, accountId, kind: 'opening', amount })

interface Scenario {
  settings?: { budget?: Partial<Settings['budget']>; layers?: Partial<Settings['layers']>; household?: Partial<Settings['household']> }
  transactions?: Transaction[]
  containers?: ReturnType<typeof containerSchema.parse>[]
  goals?: ReturnType<typeof goalSchema.parse>[]
  months?: ReturnType<typeof monthPlanSchema.parse>[]
  dockings?: ReturnType<typeof dockingSchema.parse>[]
  loans?: ReturnType<typeof loanSchema.parse>[]
  balances?: ReturnType<typeof balanceSchema.parse>[]
  pendingPairs?: Map<string, PendingPair>
  now: string
}

function settingsOf(o: Scenario['settings'] = {}): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, ...o.budget }, layers: { ...s.layers, ...o.layers }, household: { ...s.household, since: null, ...o.household } }
}

/** The same records to both: the app's (parsed) and the oracle's (through its copy of the schemas). */
function both(sc: Scenario): { app: FleetState; oracle: any; input: FleetInput } {
  const settings = settingsOf(sc.settings)
  const input: FleetInput = {
    settings,
    transactions: sc.transactions ?? [],
    containers: sc.containers ?? [],
    goals: sc.goals ?? [],
    months: sc.months ?? [],
    dockings: sc.dockings ?? [],
    loans: sc.loans ?? [],
    balances: sc.balances ?? [],
    pendingPairs: sc.pendingPairs,
    now: sc.now
  }
  const app = computeFleet(input)
  expect(app.started).toBe(true)
  expect(layersSum(app)).toBe(app.total)
  const today = new Date(sc.now).toISOString().slice(0, 10)
  const oInput = normalizeInput({ ...input, settings: JSON.parse(JSON.stringify(settings)), scheduled: [], imports: [] })
  const oracle = runFleet(oInput, { today, household: 'D99', pendingPairs: sc.pendingPairs ?? new Map() })
  expect(oracle.layersSum).toBe(oracle.accountsTotal)
  return { app, oracle, input }
}

/** Every layer, goal, tank and the household of the oracle = the engine's. */
function expectSame({ app, oracle }: { app: FleetState; oracle: any }) {
  const st = oracle.state
  expect({ shields: app.shields.amount, energy: app.energy, hull: app.hull.amount, taxHold: app.taxHold, deposit: app.deposit, total: app.total }).toEqual({
    shields: st.S,
    energy: st.E,
    hull: st.H,
    taxHold: st.X,
    deposit: [...oracle.household.members.values()].reduce((a: number, m: any) => a + m.deposit, 0),
    total: oracle.accountsTotal
  })
  for (const g of app.goals) expect([g.id, g.amount]).toEqual([g.id, st.G.get(g.id) ?? 0])
  for (const t of app.tanks) expect([t.containerId, t.amount]).toEqual([t.containerId, st.T.get(t.containerId) ?? 0])
  for (const m of oracle.household.members.values()) {
    const a = app.receivables.members.find((x) => x.memberId === m.id)
    expect([m.name, a?.owed ?? 0, a?.deposit ?? 0]).toEqual([m.name, oracle.household.owedNet(m), m.deposit])
  }
  for (const l of app.loans) {
    const ls = oracle.loansState.get(l.loan.id)
    const paid = l.loan.direction === 'given' ? ls.received : ls.paid
    expect([l.loan.name, l.open]).toEqual([l.loan.name, Math.max(0, l.total - paid)])
  }
}

const start = (date: string, money: number, hull = 0, goals: Record<string, number> = {}) => ({
  settings: { budget: { start: date, initial: { shields: 0, hull, goals } } },
  balances: [opening(date, money)]
})

describe('wyrocznia a silnik na regułach N2 (AP-32)', () => {
  it('T340 (AP-3): przeniesienie środków celu w swojej chwili – dostawa przyjęta później dopełnia cel tylko do kwoty', () => {
    const bike = goalSchema.parse({ ...base(), name: 'Rower', target: zl(2500), priority: 1, transfers: [] })
    const laptop = goalSchema.parse({ ...base(), name: 'Laptop', target: zl(1000), priority: 2 })
    bike.transfers = [{ at: '2026-04-10T09:00:00.000Z', to: laptop.id, amount: zl(2000) }]
    for (const createdAt of ['2026-04-10T12:00:00.000Z', '2026-04-10T08:00:00.000Z']) {
      const sc = { ...start('2026-04-01', zl(24000), zl(6000), { [bike.id]: zl(2000) }), now: '2026-04-10T20:00:00.000Z' }
      const r = both({
        ...sc,
        settings: { ...sc.settings, layers: { assumedCosts: zl(1000) } },
        months: [plan('2026-04', zl(4000))],
        goals: [bike, laptop],
        transactions: [tx('2026-04-10', zl(3000), { kind: 'income', createdAt })]
      })
      expectSame(r)
    }
  })

  it('T341 (AP-12): para do zadokowania liczona według puli wpisu – Cele, zwrot z puli Podatek bez firewalla', () => {
    const goal = goalSchema.parse({ ...base(), name: 'Cel', target: zl(5000), priority: 1 })
    const inflow = tx('2026-04-10', zl(1000), { kind: 'trading', accountId: XTB_WALLET_ACCOUNT_ID })
    const back = tx('2026-04-12', -zl(300), { kind: 'trading' })
    const r = both({
      ...start('2026-04-01', zl(20000)),
      balances: [opening('2026-04-01', zl(20000)), opening('2026-04-01', 0, XTB_WALLET_ACCOUNT_ID)],
      months: [plan('2026-04', zl(4000))],
      goals: [goal],
      transactions: [inflow, back],
      pendingPairs: new Map<string, PendingPair>([
        [inflow.id, { pool: 'goals', entryDate: '2026-04-09' }],
        [back.id, { pool: 'tax', entryDate: '2026-04-12' }]
      ]),
      now: '2026-04-12T20:00:00.000Z'
    })
    expectSame(r)
    expect(r.app.toDock).toEqual({ count: r.oracle.toDock.count, inflow: r.oracle.toDock.inflow, outflow: r.oracle.toDock.outflow, goals: r.oracle.toDock.inGoals })
  })

  it('T345 (AP-5): płatność opłaty okresowej sprzed startu zamyka cykl – miesiąc startu bez raty', () => {
    const fee = containerSchema.parse({ ...base(), name: 'PZU', amount: zl(1200), cycleMonths: 12, dueMonth: '2026-11', dueDay: 2, accountId: MBANK_ACCOUNT_ID, from: '2026-11' })
    const r = both({
      ...start('2026-11-03', zl(20000)),
      months: [plan('2026-11', zl(4000))],
      containers: [fee],
      transactions: [tx('2026-11-02', -zl(1200), { containerId: fee.id })],
      now: '2026-11-03T20:00:00.000Z'
    })
    expectSame(r)
    expect(r.app.tanks[0]?.want ?? 0).toBe(r.oracle.months.get('2026-11').tankDetails[fee.id]?.installment ?? 0)
  })

  it('T350 / D99 pkt 1 (AP-4): „spłata, reszta jako zaliczka”, jawna zaliczka ze wskazanym zakupem i bez – dług i depozyt jak w wymaganiach', () => {
    const marek = { id: nextId(), name: 'Marek', bankNames: [], inflow: 'advance' as const, archived: false, via: null, opening: { owed: 0, deposit: 0 } }
    const buy1 = tx('2026-09-10', -zl(60), { categoryId: FOOD, refundable: true, memberId: marek.id })
    const buy2 = tx('2026-09-20', -zl(300), { categoryId: FOOD, refundable: true, memberId: marek.id })
    const r = both({
      ...start('2026-09-01', zl(20000)),
      settings: { budget: { start: '2026-09-01', initial: { shields: 0, hull: 0, goals: {} } }, household: { members: [marek], assignFrom: null } },
      months: [plan('2026-09', zl(4000))],
      transactions: [
        buy1,
        buy2,
        tx('2026-09-25', zl(360), { kind: 'income', memberId: marek.id, inflowKind: 'advance', advance: true, covers: [buy1.id] }),
        tx('2026-09-26', zl(50), { kind: 'income', memberId: marek.id, inflowKind: 'advance', advance: true }),
        tx('2026-09-27', zl(100), { kind: 'income', memberId: marek.id, inflowKind: 'repay', advance: true, covers: [buy2.id] })
      ],
      now: '2026-09-30T20:00:00.000Z'
    })
    expectSame(r)
    expect(r.app.household.skipped.map((s) => s.txId)).toEqual([...r.oracle.household.get(marek.id).skipped])
  })

  it('T355 (D100): część wpływu spłacająca pożyczkę udzieloną – stan pożyczki, osłony i nadwyżka jako przychód', () => {
    const loan = loanSchema.parse({ ...base(), name: 'Tomek', direction: 'given', counterparty: 'TOMEK', amount: zl(200), date: '2026-03-01', accountId: MBANK_ACCOUNT_ID })
    const r = both({
      ...start('2026-04-01', zl(20000)),
      months: [plan('2026-04', zl(4000))],
      loans: [loan],
      transactions: [tx('2026-04-10', zl(500), { kind: 'income', counterparty: 'EWA KOWALSKA', splits: [{ id: nextId(), amount: zl(300), loanId: loan.id }] })],
      now: '2026-04-10T20:00:00.000Z'
    })
    expectSame(r)
  })

  it('PR sp. 9 / T28, T32 (D99 pkt 9): wydatek ponad energię najpierw z osłon, kadłub dopiero po nich (zwykła kwota)', () => {
    const r = both({ ...start('2026-04-01', zl(18000), zl(10000)), months: [plan('2026-04', zl(4000))], transactions: [tx('2026-04-05', -zl(6000), { categoryId: FOOD })], now: '2026-04-05T20:00:00.000Z' })
    expectSame(r)
    expect([r.app.shields.amount, r.app.hull.amount]).toEqual([zl(2000), zl(10000)])
  })
})

describe('ten sam stan – ta sama liczba na każdym ekranie (AP-32)', () => {
  const marek = { id: nextId(), name: 'Marek', bankNames: [], inflow: 'advance' as const, archived: false, via: null, opening: { owed: 0, deposit: 0 } }
  const fee = containerSchema.parse({ ...base(), name: 'OC', amount: zl(1240), cycleMonths: 12, dueMonth: '2026-11', dueDay: 10, accountId: MBANK_ACCOUNT_ID })
  const sc: Scenario = {
    settings: { budget: { start: '2025-11-01', initial: { shields: 0, hull: 0, goals: {} } }, household: { members: [marek], assignFrom: null } },
    balances: [opening('2025-11-01', zl(30000))],
    months: [plan('2025-11', zl(4000), { [FOOD]: zl(1500), [AUTO]: zl(500) })],
    containers: [fee],
    transactions: [
      tx('2025-11-25', -zl(1240), { containerId: fee.id }),
      tx('2026-11-01', -zl(80), { categoryId: FOOD, refundable: true, memberId: marek.id }),
      tx('2026-11-02', zl(60), { kind: 'income', memberId: marek.id, inflowKind: 'advance', advance: true }),
      tx('2026-11-02', -zl(45.5), { categoryId: FOOD }),
      tx('2026-11-03', -zl(200), { kind: 'transfer', counterAccountId: null }),
      tx('2026-11-03', zl(120), { kind: 'income', counterparty: 'PRACA' })
    ],
    now: '2026-11-04T09:00:00.000Z'
  }

  it('depozyt domowników = suma zaliczek przy osobach, „mają oddać” = suma przy osobach – także dług i zaliczka naraz (T354, AF-16)', () => {
    const { app, oracle } = both(sc)
    expect(app.deposit).toBe(app.receivables.members.reduce((a, m) => a + m.deposit, 0))
    expect(app.receivables.house).toBe(app.receivables.members.reduce((a, m) => a + m.owed, 0))
    const m = app.receivables.members.find((x) => x.memberId === marek.id)
    expect([m?.owed, m?.deposit]).toEqual([zl(80), zl(60)])
    expectSame({ app, oracle })
  })

  it('zasięg i klasa: Mostek (silnik) = wyrocznia = ta sama funkcja zasięgu (T71, T218)', () => {
    const { app, oracle } = both(sc)
    expect(app.range).toBe(rangeMonths(app.shields.amount, app.hull.amount, app.costs.average, app.debt))
    const avg = oracle.hist.avgCosts(app.month).value
    expect(app.range).toBe(avg ? Math.max(0, oracle.state.S + oracle.state.H - app.debt) / avg : null)
  })

  it('eksport miesiąca = pasek Operacji: liczba, wpływy i wypływy bez przelewów własnych i korekt', () => {
    const { input } = both(sc)
    const settings = input.settings as Settings
    const month = input.transactions.filter((t) => t.date >= '2026-11-01' && t.date <= '2026-11-30')
    const bar = sumOperations(month)
    const rows = operationRows(input.transactions, settings.categories, settings.accounts, '2026-11-01', '2026-11-30', settings.household.members)
    const moving = rows.filter((r) => r.kind !== TX_KIND_LABEL.transfer && r.kind !== TX_KIND_LABEL.correction)
    expect({ count: rows.length, inflow: moving.filter((r) => r.amount > 0).reduce((a, r) => a + r.amount, 0), outflow: moving.filter((r) => r.amount < 0).reduce((a, r) => a - r.amount, 0) }).toEqual({ count: bar.count, inflow: bar.inflow, outflow: bar.outflow })
  })

  // AF-15 (S, N3 – AP-10): odprawa liczy termin z dnia kontenera (`nextUnpaidOf`, dueDay 10), Ładownia i Radar z dnia
  // płatności z historii (T208 – 25.); gdy N3 to naprawi, ten test zacznie przechodzić – zdejmij `fails`.
  it.fails('termin asteroidy: odprawa = Radar = Ładownia (AF-15 – otwarte, N3 AP-10)', () => {
    const { app, input } = both(sc)
    const containers = input.containers ?? []
    const settings = input.settings as Settings
    const cargo = cargoStatuses({ containers, transactions: input.transactions, today: app.today, tanks: app.tanks, coveredTo: settings.import.coveredTo })
    const onRadar = radar({ today: app.today, plans: input.months ?? [], containers, tanks: app.tanks, loans: app.loans, money: (g) => String(g), cargo }).find((x) => x.kind === 'asteroid' && x.ref === fee.id)
    const inBriefing = briefing({ fleet: app, containers, imports: [], label: () => '', cargo }).find((x) => x.kind === 'asteroid')
    expect(onRadar?.date).toBe(cargo.find((x) => x.containerId === fee.id)?.due)
    expect(inBriefing?.key.split(':')[2]).toBe(onRadar?.date)
  })
})
