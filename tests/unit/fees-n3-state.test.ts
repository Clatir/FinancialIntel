import { describe, expect, it } from 'vitest'
import { accountsAhead } from '@shared/calc/ahead'
import { briefing } from '@shared/calc/briefing'
import { cargoStatuses, type CargoInput } from '@shared/calc/cargoStatus'
import { computeFleet } from '@shared/calc/fleet'
import { radar } from '@shared/calc/radar'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Container, type Settings, type Transaction } from '@shared/schema'

/**
 * AP-10 (AF-50 / RA.4, AF-80; D99 pkt 3, T375): a fee's due still unpaid stays „po terminie” in the months after it,
 * until a payment pays it – in Ładownia, on the Radar (the accounts ahead count it today) and in the briefing alike; a
 * due on the 28th–31st gets its „po terminie” too. A late payment before the next due's day pays the late due first, a
 * second payment of a window pays it too; „Zapłacone poza budżetem” settles it.
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N3B000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: zl(50), dueMonth: '2026-01', dueDay: 20, accountId: MBANK_ACCOUNT_ID, ...over })
const pay = (c: Container, date: string, amount = c.amount, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ ...base(), date, accountId: c.accountId ?? MBANK_ACCOUNT_ID, amount: -amount, containerId: c.id, ...over })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`
const input = (over: Partial<CargoInput>): CargoInput => ({ containers: [], transactions: [], today: '2026-11-03', coveredTo: {}, ...over })
const states = (list: ReturnType<typeof cargoStatuses>) => list.map((s) => [s.due, s.state, s.carried])

// RA.4: Telefon Play 50 zł on the 20th (its history), the payment of 20 October missing; the bank imported to 26.10.
const phone = container({ name: 'Telefon Play' })
const history = ['2026-05-20', '2026-06-22', '2026-07-20', '2026-08-20', '2026-09-21'].map((d) => pay(phone, d))
const covered = { [MBANK_ACCOUNT_ID]: '2026-10-26' }
const START = '2026-05-01'

describe('AP-10: niezapłacony termin zostaje „po terminie” do zapłaty (D99 pkt 3, AF-50)', () => {
  it('20.10 bez płatności: 03.11 nadal po terminie obok terminu 20.11; bez startu budżetu – jak dotąd tylko ten miesiąc', () => {
    const list = cargoStatuses(input({ containers: [phone], transactions: history, coveredTo: covered, start: START }))
    expect(states(list)).toEqual([
      ['2026-10-20', 'overdue', true],
      ['2026-11-20', 'waiting', false]
    ])
    expect(list[0]).toMatchObject({ amount: zl(50), day: 20, payments: [], importPending: false })
    // No budget start: this month's due only (as before 1.15.7).
    expect(states(cargoStatuses(input({ containers: [phone], transactions: history, coveredTo: covered })))).toEqual([['2026-11-20', 'waiting', false]])
  })

  it('odprawa: „Kontener niezaładowany” 20.10 raz na termin; Radar: 20.10 po terminie 14 dni, salda naprzód liczą ją dziś', () => {
    const cargo = cargoStatuses(input({ containers: [phone], transactions: history, coveredTo: covered, start: START }))
    const s0 = createDefaultSettings(AT).settings
    const settings: Settings = { ...s0, budget: { ...s0.budget, start: START } }
    const fleet = computeFleet({
      settings,
      balances: [balanceSchema.parse({ ...base(), date: START, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(1000) })],
      transactions: history,
      containers: [phone],
      now: '2026-11-03T12:00:00+01:00'
    })
    const alerts = briefing({ fleet, containers: [phone], imports: [], lastConfirmation: '2026-11-03', label: () => '', cargo, money }).filter((i) => i.kind === 'cargo')
    expect(alerts.map((i) => [i.key, i.text])).toEqual([[`cargo:${phone.id}:2026-10-20`, 'Kontener niezaładowany: Telefon Play 50.00 zł – termin 20.10 minął, brak płatności.']])
    const items = radar({ today: '2026-11-03', plans: [], containers: [phone], tanks: [], loans: [], money, cargo, days: 40 }).filter((i) => i.kind === 'fixed')
    expect(items.map((i) => [i.date, i.note, i.overdue ?? false])).toEqual([
      ['2026-10-20', 'po terminie 14 dni', true],
      ['2026-11-20', '', false]
    ])
    // The accounts ahead (F26): 30 zł on mBank – the late 50 zł lacks 20 zł today.
    const ahead = accountsAhead({
      today: '2026-11-03',
      balances: [{ id: MBANK_ACCOUNT_ID, balance: zl(30) }],
      accounts: settings.accounts,
      items,
      transactions: [],
      end: '2026-12-12'
    }).find((a) => a.accountId === MBANK_ACCOUNT_ID)!
    expect(ahead.moves[0]).toMatchObject({ date: '2026-11-03', amount: -zl(50), name: 'Telefon Play' })
  })

  it('termin 30.11 (i 29.10 w miesiącu 31-dniowym) dostaje „po terminie” w następnym miesiącu (AF-80)', () => {
    const rent = container({ name: 'Czynsz', amount: zl(1450), dueDay: 30 })
    const paid = ['2026-05-30', '2026-06-30', '2026-07-30', '2026-08-31', '2026-09-30', '2026-10-30'].map((d) => pay(rent, d))
    const at = (today: string, coveredTo: Record<string, string>) => states(cargoStatuses(input({ containers: [rent], transactions: paid, today, coveredTo, start: START })))
    // 1 December: within its 3 days, the bank's file not past them – waiting for the import.
    expect(at('2026-12-01', { [MBANK_ACCOUNT_ID]: '2026-11-30' })).toEqual([
      ['2026-11-30', 'waiting', true],
      ['2026-12-30', 'waiting', false]
    ])
    expect(cargoStatuses(input({ containers: [rent], transactions: paid, today: '2026-12-01', coveredTo: { [MBANK_ACCOUNT_ID]: '2026-11-30' }, start: START }))[0]!.importPending).toBe(true)
    // 3 December, the file reaching 2 December: overdue.
    expect(at('2026-12-03', { [MBANK_ACCOUNT_ID]: '2026-12-02' })[0]).toEqual(['2026-11-30', 'overdue', true])
    // A due on the 29th of October (31 days): overdue from 1 November.
    const gym = container({ name: 'Siłownia', amount: zl(120), dueDay: 29 })
    const gymPaid = ['2026-05-29', '2026-06-29', '2026-07-29', '2026-08-29', '2026-09-29'].map((d) => pay(gym, d))
    expect(states(cargoStatuses(input({ containers: [gym], transactions: gymPaid, today: '2026-11-01', coveredTo: { [MBANK_ACCOUNT_ID]: '2026-10-31' }, start: START })))).toEqual([
      ['2026-10-29', 'overdue', true],
      ['2026-11-29', 'waiting', false]
    ])
  })

  it('zaległa zapłacona 10.11 (przed dniem terminu 20.11) zamyka 20.10, nie listopad; „Zapłacone” dziś trafia do zaległej', () => {
    const late = cargoStatuses(input({ containers: [phone], transactions: [...history, pay(phone, '2026-11-10')], today: '2026-11-12', coveredTo: covered, start: START }))
    expect(states(late)).toEqual([['2026-11-20', 'waiting', false]])
    expect(late[0]!.payments).toEqual([])
    // Before the payment: on 10.11 a payment today pays the late one (its window is the next due's, before its day).
    const before = cargoStatuses(input({ containers: [phone], transactions: history, today: '2026-11-10', coveredTo: covered, start: START }))
    expect(before.map((s) => [s.due, s.payToday])).toEqual([
      ['2026-10-20', true],
      ['2026-11-20', false]
    ])
    // On 21.11 (after this month's day) it pays November's; the late one waits for a second payment.
    const after = cargoStatuses(input({ containers: [phone], transactions: history, today: '2026-11-21', coveredTo: covered, start: START }))
    expect(after.map((s) => [s.due, s.payToday])).toEqual([
      ['2026-10-20', false],
      ['2026-11-20', true]
    ])
  })

  it('dwie płatności w oknie listopada (20.11 i 22.11): druga zamyka zaległy 20.10; 25 zł dopłaty – nie', () => {
    const two = cargoStatuses(input({ containers: [phone], transactions: [...history, pay(phone, '2026-11-20'), pay(phone, '2026-11-22')], today: '2026-11-25', coveredTo: covered, start: START }))
    expect(states(two)).toEqual([['2026-11-20', 'paid', false]])
    expect(two[0]!.payments.map((p) => p.date)).toEqual(['2026-11-22'])
    // A second payment of 25 zł does not make a whole due: 20.10 stays.
    const small = cargoStatuses(input({ containers: [phone], transactions: [...history, pay(phone, '2026-11-20'), pay(phone, '2026-11-22', zl(25))], today: '2026-11-25', coveredTo: covered, start: START }))
    expect(states(small)).toEqual([
      ['2026-10-20', 'overdue', true],
      ['2026-11-20', 'paid', false]
    ])
  })

  it('zaległość liczy się od startu budżetu, od miesiąca dodania kontenera i po „Zapłacone poza budżetem” (aliveAt)', () => {
    // Added to the hold on 2 November: the October due is from before it.
    const added = { ...phone, createdAt: '2026-11-02T10:00:00.000Z' }
    expect(states(cargoStatuses(input({ containers: [added], transactions: history, coveredTo: covered, start: START })))).toEqual([['2026-11-20', 'waiting', false]])
    // The budget started on 1 November.
    expect(states(cargoStatuses(input({ containers: [phone], transactions: history, coveredTo: covered, start: '2026-11-01' })))).toEqual([['2026-11-20', 'waiting', false]])
    // Its life ended with October (`until`): its last due still stays; archived (out of the hold) – no.
    expect(states(cargoStatuses(input({ containers: [{ ...phone, until: '2026-10' }], transactions: history, coveredTo: covered, start: START })))).toEqual([['2026-10-20', 'overdue', true]])
    expect(cargoStatuses(input({ containers: [{ ...phone, archived: true, archivedAt: '2026-11-01T10:00:00.000Z' }], transactions: history, coveredTo: covered, start: START }))).toEqual([])
    // Settled outside the budget: the day after the due.
    expect(states(cargoStatuses(input({ containers: [{ ...phone, aliveAt: '2026-10-21' }], transactions: history, coveredTo: covered, start: START })))).toEqual([['2026-11-20', 'waiting', false]])
  })

  it('Radar (RA sp. 2): termin 01.11 bez płatności, plik banku do 26.10 – „czeka na import”; konto bez importu – „po terminie 2 dni”', () => {
    const gym = container({ name: 'CityFit', amount: zl(129), dueDay: 1 })
    const gymPaid = ['2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01'].map((d) => pay(gym, d))
    const cargo = cargoStatuses(input({ containers: [gym], transactions: gymPaid, today: '2026-11-03', coveredTo: covered, start: START }))
    expect(cargo.map((s) => [s.due, s.state, s.importPending])).toEqual([['2026-11-01', 'waiting', true]])
    const note = (list: typeof cargo) => radar({ today: '2026-11-03', plans: [], containers: [gym], tanks: [], loans: [], money, cargo: list, days: 20 }).find((i) => i.date === '2026-11-01')!.note
    expect(note(cargo)).toBe('czeka na import')
    // Cash (no file of the bank): the days past it.
    const cash = { ...gym, accountId: XTB_WALLET_ACCOUNT_ID }
    const cashPaid = gymPaid.map((t) => ({ ...t, accountId: XTB_WALLET_ACCOUNT_ID }))
    expect(note(cargoStatuses(input({ containers: [cash], transactions: cashPaid, today: '2026-11-03', start: START })))).toBe('po terminie 2 dni')
  })
})
