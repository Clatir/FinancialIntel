import { describe, expect, it } from 'vitest'
import { briefing } from '@shared/calc/briefing'
import { cargoDays, cargoStatuses, nextDueOf, paymentDay } from '@shared/calc/cargoStatus'
import { computeFleet, type FleetState } from '@shared/calc/fleet'
import { radar } from '@shared/calc/radar'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Container, type Settings, type Transaction } from '@shared/schema'

/**
 * AP-10 (AF-15 / MO.11, MO.15, R-20; W2 – pole „Płatność”, LA sp. 8; T376): the briefing's asteroid has the due the
 * fee's state (Ładownia) and the Radar have – this month's on the day of its history, the next ones on that day too; a
 * day set by hand after the payments wins over the history before it.
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2025-08-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N3D000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2025-11', accountId: MBANK_ACCOUNT_ID, ...over })
const pay = (c: Container, date: string): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -c.amount, containerId: c.id })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`
const START = '2025-09-01'

function fleetOf(containers: Container[], transactions: Transaction[], now: string): FleetState {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = { ...s0, budget: { ...s0.budget, start: START } }
  return computeFleet({ settings, balances: [balanceSchema.parse({ ...base(), date: START, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(30000) })], months: [monthPlanSchema.parse({ ...base(), month: '2025-09', salary: zl(5000), envelopes: {} })], transactions, containers, now })
}

/** The asteroids of the briefing and of the Radar, as the bridge and the radar screen get them (`cargo`, `payDays`). */
function asteroids(containers: Container[], transactions: Transaction[], today: string, now: string) {
  const fleet = fleetOf(containers, transactions, now)
  const cargo = cargoStatuses({ containers, transactions, today, tanks: fleet.tanks, coveredTo: {}, start: START })
  const payDays = cargoDays({ containers, transactions, today })
  const brief = briefing({ fleet, containers, imports: [], lastConfirmation: today, label: () => '', cargo, payDays, money }).filter((i) => i.kind === 'asteroid')
  const items = radar({ today, plans: [], containers, tanks: fleet.tanks, loans: [], money, cargo, payDays, days: 60 }).filter((i) => i.kind === 'asteroid')
  return { cargo, brief: brief.map((i) => i.text), radar: items.map((i) => i.date) }
}

describe('AP-10: jeden termin opłaty w odprawie, w Ładowni i na Radarze (AF-15)', () => {
  it('MO.11: OC – pole „Płatność” 06.11, historia płaci 25.: odprawa nie ostrzega „za 3 dni”, Radar i Ładownia 25.11', () => {
    const oc = container({ name: 'OC samochodu', amount: zl(1240), cycleMonths: 12, dueDay: 6, dueMonth: '2025-11' })
    const r = asteroids([oc], [pay(oc, '2025-11-25')], '2026-11-03', '2026-11-03T12:00:00+01:00')
    expect(r.cargo.map((s) => [s.due, s.dayFrom])).toEqual([['2026-11-25', 'history']])
    expect(r.radar).toEqual(['2026-11-25'])
    expect(r.brief).toEqual([])
  })

  it('mo-c3: Podatek – dzień kontenera 18, historia 15.: „Asteroida … za 12 dni” jak Radar (15.11)', () => {
    const tax = container({ name: 'Podatek od nieruchomości', amount: zl(150), cycleMonths: 3, dueDay: 18, dueMonth: '2025-11' })
    const paid = ['2025-11-15', '2026-02-15', '2026-05-15', '2026-08-15'].map((d) => pay(tax, d))
    const r = asteroids([tax], paid, '2026-11-03', '2026-11-03T12:00:00+01:00')
    expect(r.radar[0]).toBe('2026-11-15')
    expect(r.brief).toEqual(['Asteroida: Podatek od nieruchomości za 12 dni – 150.00 zł, w zbiorniku 150.00 zł.'])
  })

  it('termin w następnym miesiącu na dniu z historii: 25.10 odprawa i Radar mówią 25.11 (nie 06.11 z kontenera)', () => {
    const oc = container({ name: 'OC samochodu', amount: zl(1240), cycleMonths: 12, dueDay: 6, dueMonth: '2025-11' })
    const r = asteroids([oc], [pay(oc, '2025-11-25')], '2026-10-25', '2026-10-25T12:00:00+02:00')
    expect(r.radar).toEqual(['2026-11-25'])
    expect(r.brief).toEqual([])
    // Ten days later the same due: 14 days ahead.
    expect(asteroids([oc], [pay(oc, '2025-11-25')], '2026-11-11', '2026-11-11T12:00:00+01:00').brief).toEqual(['Asteroida: OC samochodu za 14 dni – 1240.00 zł, w zbiorniku 1240.00 zł.'])
  })

  it('W2 (T376): dzień ustawiony w polu „Płatność” po płatnościach (dueAt) wygrywa z historią – 06.11 wszędzie', () => {
    const oc = container({ name: 'OC samochodu', amount: zl(1240), cycleMonths: 12, dueDay: 6, dueMonth: '2025-11', dueAt: '2026-11-02T09:00:00.000Z' })
    const r = asteroids([oc], [pay(oc, '2025-11-25')], '2026-11-03', '2026-11-03T12:00:00+01:00')
    expect(r.cargo.map((s) => [s.due, s.dayFrom])).toEqual([['2026-11-06', 'set']])
    expect(r.radar).toEqual(['2026-11-06'])
    expect(r.brief).toEqual(['Asteroida: OC samochodu za 3 dni – 1240.00 zł, w zbiorniku 1240.00 zł.'])
    // The payments from that day on say its day again.
    const linked = [{ id: 'a', date: '2025-11-25', amount: zl(1240), accountId: MBANK_ACCOUNT_ID }, { id: 'b', date: '2026-11-09', amount: zl(1240), accountId: MBANK_ACCOUNT_ID }]
    expect(paymentDay(oc, linked, '2026-12')).toEqual({ day: 9, dayFrom: 'history' })
  })

  it('LA sp. 8: najbliższy niezapłacony termin kontenera miesięcznego – ten miesiąc, po zapłacie następny (nie data sprzed roku)', () => {
    const rent = container({ name: 'Czynsz', amount: zl(1450), dueDay: 10, dueMonth: '2025-09' })
    const paid = ['2026-08-10', '2026-09-10', '2026-10-10'].map((d) => pay(rent, d))
    const now = cargoStatuses({ containers: [rent], transactions: paid, today: '2026-11-03', tanks: [], coveredTo: {}, start: START })
    expect(nextDueOf(rent, '2026-11-03', { day: 10, status: now[0] })).toBe('2026-11-10')
    const after = cargoStatuses({ containers: [rent], transactions: [...paid, pay(rent, '2026-11-09')], today: '2026-11-12', tanks: [], coveredTo: {}, start: START })
    expect(nextDueOf(rent, '2026-11-12', { day: 10, status: after[0] })).toBe('2026-12-10')
  })
})
