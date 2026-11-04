/**
 * N3 (1.15.7) – the group's third review (`/code-review` high of 2cf22ba), the pure parts:
 * - 1, 3, 9 (T398): a due is planned only when a payment written ahead is its own by the same rule (`feeDuesOf` with all
 *   the payments, up to the Radar's window); „Zapłacone (dziś)” names the due a payment today closes beside them;
 * - 2, 3: a due of a later month paid by a payment written ahead is no Radar item, no asteroid of the briefing, not
 *   Ładownia's next due – the balances ahead count that payment once (`plannedDues`);
 * - 5 (T383): a confirmation counts on the later of its moment and its balance's day – never earlier than a computer still
 *   on 1.15.6 counts it; a confirmation again under 1.15.6 (only `updatedAt`) – as there.
 */
import { describe, expect, it } from 'vitest'
import { accountsAhead } from '@shared/calc/ahead'
import { briefing } from '@shared/calc/briefing'
import { AHEAD_DAYS, cargoDays, cargoStatuses, nextDueOf, plannedDues, type CargoStatus } from '@shared/calc/cargoStatus'
import { addDays } from '@shared/calc/dates'
import { computeFleet, layersSum, type FleetState } from '@shared/calc/fleet'
import { missionStatus, type GameInput } from '@shared/calc/game'
import { radar, RADAR_DAYS } from '@shared/calc/radar'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Balance, type Container, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2025-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N3X000000000000000${String(++seq).padStart(4, '0')}`
const base = (at = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: at, updatedAt: at })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2026-01', accountId: MBANK_ACCOUNT_ID, ...over })
const pay = (c: Container, date: string, amount = c.amount): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -amount, containerId: c.id, counterparty: c.name })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`
const START = '2026-09-01'

function fleetOf(containers: Container[], transactions: Transaction[], now: string): FleetState {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = { ...s0, budget: { ...s0.budget, start: START } }
  const state = computeFleet({
    settings,
    balances: [balanceSchema.parse({ ...base(), date: START, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(30000) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-09', salary: zl(5000), envelopes: {} })],
    transactions,
    containers,
    now
  })
  expect(layersSum(state)).toBe(state.total)
  return state
}
const cargoOf = (containers: Container[], transactions: Transaction[], today: string) => cargoStatuses({ containers, transactions, today, coveredTo: {}, start: START })
const shown = (list: CargoStatus[]) => list.map((s) => [s.due, s.state, s.planned?.date ?? null, s.payToday])

/** The Radar, the accounts ahead and the briefing as the window gives them (`features/cargo/status.ts`, `future.ts`). */
function ahead(containers: Container[], transactions: Transaction[], today: string) {
  const f = fleetOf(containers, transactions, `${today}T12:00:00+01:00`)
  const cargo = cargoOf(containers, transactions, today)
  const payDays = cargoDays({ containers, transactions, today })
  const planned = plannedDues({ containers, transactions, today, start: START })
  const items = radar({ today, plans: [], containers, tanks: f.tanks, loans: [], money, cargo, payDays, planned })
  const s0 = createDefaultSettings(AT).settings
  const mbank = accountsAhead({ today, balances: f.accounts, accounts: s0.accounts, items, transactions, end: addDays(today, RADAR_DAYS) }).find((a) => a.accountId === MBANK_ACCOUNT_ID)!
  const brief = briefing({ fleet: f, containers, imports: [], label: () => '', cargo, payDays, planned })
  return { f, cargo, planned, items, moves: mbank.moves.map((m) => [m.date, m.amount]), brief }
}

describe('1: „Zapłacone (dziś)” przy terminie, który płatność dziś naprawdę zamknie obok zaplanowanej (T398)', () => {
  // Telefon 100 zł on the 20th: September paid, October unpaid; today 10.11 – the payment written for 13.11 falls in
  // November's window before its day, so it pays October (late) – October planned.
  const phone = container({ name: 'Telefon', amount: zl(100), cycleMonths: 1, dueMonth: '2026-09', dueDay: 20 })
  const ahead13 = pay(phone, '2026-11-13')
  const txs = [pay(phone, '2026-09-20'), ahead13]

  it('październik zaplanowany (13.11), „Zapłacone (dziś)” przy listopadzie – dziś zamyka październik, 13.11 listopad', () => {
    // Before: „Zapłacone (dziś)” at October (the oldest unpaid – the planned one, its button hidden): none for November.
    expect(shown(cargoOf([phone], txs, '2026-11-10'))).toEqual([
      ['2026-10-20', 'overdue', '2026-11-13', false],
      ['2026-11-20', 'waiting', null, true]
    ])
    // Paid today: October paid now, November planned by the payment of 13.11 – both closed.
    const paid = [...txs, pay(phone, '2026-11-10')]
    expect(shown(cargoOf([phone], paid, '2026-11-10'))).toEqual([['2026-11-20', 'waiting', '2026-11-13', false]])
    expect(shown(cargoOf([phone], paid, '2026-11-13'))).toEqual([['2026-11-20', 'paid', null, false]])
  })

  it('płatność dziś, która zamknęłaby termin dopiero przesunięciem przez płatność wpisaną naprzód – bez „Zapłacone (dziś)”', () => {
    // A bill of a varying amount (F23) on the 9th: June paid 21.06, May unpaid; written ahead 04.07 (July's, before its
    // day). Today's payment (29.06) is July's early one – May only when 04.07 moves it there: nothing closes today.
    const bill = container({ name: 'Prąd', amount: zl(470), cycleMonths: 1, dueMonth: '2026-04', dueDay: 9, variable: true })
    const list = [pay(bill, '2026-04-09'), pay(bill, '2026-06-21'), pay(bill, '2026-07-04')]
    const s = cargoStatuses({ containers: [bill], transactions: list, today: '2026-06-29', coveredTo: {}, start: '2026-04-01' })
    expect(shown(s)).toEqual([
      ['2026-05-09', 'overdue', null, false],
      ['2026-06-09', 'paid', null, false]
    ])
  })
})

describe('2, 3: termin kolejnego miesiąca zapłacony płatnością wpisaną naprzód – raz w saldach naprzód (T398)', () => {
  it('czynsz grudnia wpisany na 10.12: bez pozycji Radaru 10.12 – salda naprzód liczą go raz', () => {
    const rent = container({ name: 'Czynsz', amount: zl(1200), cycleMonths: 1, dueMonth: '2026-09', dueDay: 10 })
    const december = pay(rent, '2026-12-10')
    const txs = [pay(rent, '2026-09-10'), pay(rent, '2026-10-10'), december]
    const o = ahead([rent], txs, '2026-11-04')
    expect([...(o.planned.get(rent.id) ?? [])]).toEqual(['2026-12'])
    // Before: `fixed:…:2026-12-10` on the Radar and the operation of 10.12 – the forecast lower by twice the rent.
    expect(o.items.filter((i) => i.ref === rent.id).map((i) => i.date)).toEqual(['2026-11-10', '2027-01-10'])
    expect(o.moves.filter(([date]) => date === '2026-12-10')).toEqual([['2026-12-10', -zl(1200)]])
    // Ładownia's next due after November's – January's, not December's.
    expect(nextDueOf(rent, '2026-11-11', { day: 10, planned: o.planned.get(rent.id) })).toBe('2027-01-10')
  })

  it('opłata 28. dnia: listopad zapłacony, grudzień wpisany na 15.12 – zaplanowany (wcześniej żaden termin), raz', () => {
    const fee = container({ name: 'Internet', amount: zl(80), cycleMonths: 1, dueMonth: '2026-09', dueDay: 28 })
    const txs = [pay(fee, '2026-09-28'), pay(fee, '2026-10-28'), pay(fee, '2026-11-28'), pay(fee, '2026-12-15')]
    const o = ahead([fee], txs, '2026-11-30')
    expect([...(o.planned.get(fee.id) ?? [])]).toEqual(['2026-12'])
    // Before: none planned (only this month's and late dues looked at) – 28.12 on the Radar beside the operation of 15.12.
    expect(o.items.filter((i) => i.ref === fee.id).map((i) => i.date)).toEqual(['2027-01-28', '2027-02-28'])
    expect(o.moves.filter(([, amount]) => amount === -zl(80)).map(([date]) => date)).toEqual(['2026-12-15', '2027-01-28', '2027-02-28'])
  })

  it('ta sama opłata z niezapłaconym listopadem: 15.12 przed dniem grudnia płaci zaległy listopad (T394) – grudzień zostaje', () => {
    const fee = container({ name: 'Internet', amount: zl(80), cycleMonths: 1, dueMonth: '2026-09', dueDay: 28 })
    const txs = [pay(fee, '2026-09-28'), pay(fee, '2026-10-28'), pay(fee, '2026-12-15')]
    const o = ahead([fee], txs, '2026-11-04')
    expect([...(o.planned.get(fee.id) ?? [])]).toEqual(['2026-11'])
    expect(o.items.filter((i) => i.ref === fee.id).map((i) => i.date)).toEqual(['2026-12-28', '2027-01-28'])
  })

  it('kwartalna – następny cykl wpisany naprzód: bez asteroidy na Radarze i w odprawie, następny termin – kolejny cykl', () => {
    const waste = container({ name: 'Wywóz śmieci', amount: zl(240), cycleMonths: 3, dueMonth: '2026-11', dueDay: 3 })
    // November paid on time; February's written ahead for 02.02 – today 25.01 (the cycle's month before its due month).
    const txs = [pay(waste, '2026-08-03'), pay(waste, '2026-11-03'), pay(waste, '2027-02-02')]
    const o = ahead([waste], txs, '2027-01-25')
    expect([...(o.planned.get(waste.id) ?? [])]).toEqual(['2027-02'])
    // Before: the asteroid of 03.02 on the Radar and in the briefing („za 9 dni”) beside the operation of 02.02.
    expect(o.items.filter((i) => i.ref === waste.id && i.kind === 'asteroid')).toEqual([])
    expect(o.brief.filter((b) => b.kind === 'asteroid')).toEqual([])
    expect(o.moves.filter(([, amount]) => amount === -zl(240)).map(([date]) => date)).toEqual(['2027-02-02'])
    expect(nextDueOf(waste, '2027-01-25', { day: 3, planned: o.planned.get(waste.id) })).toBe('2027-05-03')
  })

  it('okno dopasowania = okno Radaru', () => {
    expect(RADAR_DAYS).toBe(AHEAD_DAYS)
  })
})

describe('5: „Inwentaryzacja” – późniejsza z chwili potwierdzenia i dnia salda (T383, mieszane wersje)', () => {
  const W45 = { template: 'balances', week: '2026-W45', params: {} }
  const confirmation = (date: string, at: string, over: Partial<Balance> = {}): Balance =>
    balanceSchema.parse({ ...base(at), date, accountId: MBANK_ACCOUNT_ID, kind: 'confirmation', amount: zl(100), confirmedAt: at, ...over })
  function world(balances: Balance[]): GameInput {
    const s0 = createDefaultSettings(AT).settings
    const settings: Settings = { ...s0, budget: { ...s0.budget, start: '2026-09-01' }, layers: { ...s0.layers, assumedCosts: zl(3000) }, game: { ...s0.game, start: '2026-09-07' } }
    return {
      settings,
      balances: [balanceSchema.parse({ ...base(), date: '2026-09-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) }), ...balances],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-09', salary: zl(3100), envelopes: {} })],
      transactions: [],
      containers: [],
      dockings: [],
      game: []
    }
  }

  it('potwierdzone pod 1.15.7 w tygodniu 44, ponownie pod 1.15.6 w tygodniu 45 (tylko updatedAt) – tydzień 45 bez niego na obu komputerach', () => {
    // 1.15.6 counts the balance's day (31.10 – week 44) and writes only `updatedAt` confirming again: not week 45 there
    // either. `updatedAt` never counts (a merge, a conflict resolved write it too – T383).
    const again = confirmation('2026-10-31', '2026-10-31T18:00:00.000Z', { updatedAt: '2026-11-03T09:00:00.000Z' })
    expect(missionStatus(world([again]), W45, '2026-11-04')).toMatchObject({ have: 0 })
    expect(again.date < '2026-11-02').toBe(true)
  })

  it('saldo z poniedziałku 02.11 potwierdzone w niedzielę 01.11 – liczy się w tygodniu salda, jak na komputerze z 1.15.6', () => {
    // Before: the moment alone (Sunday – week 44) while a computer still on 1.15.6 counted it in week 45.
    const ahead = confirmation('2026-11-02', '2026-11-01T18:00:00.000Z')
    expect(missionStatus(world([ahead]), W45, '2026-11-04')).toMatchObject({ have: 1 })
    // The moment later than the balance's day (a file's Sunday balance confirmed on Tuesday): the moment, as before.
    expect(missionStatus(world([confirmation('2026-11-01', '2026-11-03T10:00:00.000Z')]), W45, '2026-11-04')).toMatchObject({ have: 1 })
  })
})
