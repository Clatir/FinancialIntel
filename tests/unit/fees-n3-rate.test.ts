import { describe, expect, it } from 'vitest'
import { computeFleet, monthlyWeight, sinkingInstallment, type FleetState } from '@shared/calc/fleet'
import { sinkingOf, tankRate } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Container, type Settings, type Transaction } from '@shared/schema'

/**
 * AP-10 (AF-43 / LA.3, PR sp. 7, LA sp. 2; T377): the rate hint of Ładownia (the editor's „w tym cyklu z wyrównaniem
 * do terminu”, the row's „(…)”) is the engine's installment of this month – from the tank before it (`want`, T29) –
 * never one counted as for an empty tank; a cycle paid has none; the schedule's installment of this month (the last
 * one with the rest of the grosze, a schedule's gap) is no catch-up.
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2025-08-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N3E000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2025-11', accountId: MBANK_ACCOUNT_ID, ...over })
const pay = (c: Container, date: string): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -c.amount, containerId: c.id })
const START = '2025-09-01'

function fleetOf(containers: Container[], transactions: Transaction[], now: string): FleetState {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = { ...s0, budget: { ...s0.budget, start: START } }
  return computeFleet({
    settings,
    balances: [balanceSchema.parse({ ...base(), date: START, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(30000) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2025-09', salary: zl(5000), envelopes: {} })],
    transactions,
    containers,
    now
  })
}

/** The row's and the editor's rate of a saved fee as Ładownia asks it (the engine's tank, its installment taken). */
function rateOf(c: Container, fleet: FleetState) {
  const tank = fleet.tanks.find((t) => t.containerId === c.id)!
  return tankRate(c, fleet.month, { want: tank.want, tank: tank.amount, taken: sinkingOf(fleet.log, fleet.month).get(c.id), paidDue: tank.paidDue })
}

describe('AP-10: podpowiedź raty uwzględnia stan zbiornika (AF-43)', () => {
  it('OC samochodu 1 240 zł, zbiornik pełny w miesiącu terminu: rata 103,37 zł – ostatnia z resztą groszy, bez „wyrównania”', () => {
    const oc = container({ name: 'OC samochodu', amount: zl(1240), cycleMonths: 12, dueDay: 25 })
    const fleet = fleetOf([oc], [pay(oc, '2025-11-25')], '2026-11-03T12:00:00+01:00')
    expect(fleet.tanks.find((t) => t.containerId === oc.id)).toMatchObject({ amount: zl(1240), want: zl(103.37) })
    expect(rateOf(oc, fleet)).toEqual({ rate: zl(103.37), nominal: zl(103.37), catchUp: false, paid: false })
    // What the hint said before (an empty tank): the whole fee in one month.
    expect(sinkingInstallment(oc, '2026-11', 0)).toBe(zl(1240))
  })

  it('OC motocykla 600 zł zapłacone 12.10: pierwszy miesiąc nowego cyklu – 50,00 zł, nie 45,84 zł', () => {
    const moto = container({ name: 'OC motocykla', amount: zl(600), cycleMonths: 12, dueMonth: '2025-10', dueDay: 12 })
    const fleet = fleetOf([moto], [pay(moto, '2025-10-13'), pay(moto, '2026-10-12')], '2026-11-03T12:00:00+01:00')
    expect(fleet.tanks.find((t) => t.containerId === moto.id)).toMatchObject({ amount: zl(50), want: zl(50) })
    expect(rateOf(moto, fleet)).toMatchObject({ rate: zl(50), catchUp: false })
    // The row's old count: the tank after this month's installment taken for the one before it.
    expect(sinkingInstallment(moto, '2026-11', zl(50))).toBe(zl(45.84))
  })

  it('cykl zapłacony (Wywóz 22.10 na 20.11): bez raty i bez wyrównania', () => {
    const waste = container({ name: 'Wywóz śmieci', amount: zl(240), cycleMonths: 3, dueDay: 20 })
    const paid = ['2025-11-20', '2026-02-20', '2026-05-20', '2026-08-20', '2026-10-22'].map((d) => pay(waste, d))
    const fleet = fleetOf([waste], paid, '2026-11-03T12:00:00+01:00')
    expect(rateOf(waste, fleet)).toEqual({ rate: 0, nominal: zl(80), catchUp: false, paid: true })
  })

  it('opłata dodana w trakcie cyklu (Ubezpieczenie domu 900 zł, termin 10.02.2027, pusty zbiornik): wyrównanie 225,00 zł', () => {
    const house = container({ name: 'Ubezpieczenie domu', amount: zl(900), cycleMonths: 12, dueMonth: '2027-02', dueDay: 10, from: '2026-11' })
    expect(tankRate(house, '2026-11')).toEqual({ rate: zl(225), nominal: zl(75), catchUp: true, paid: false })
  })

  it('harmonogram (Podatek 150 zł: mar, maj, wrz, lis): rata 75,00 zł to jego rata, nie wyrównanie (LA sp. 2)', () => {
    const tax = container({ name: 'Podatek od nieruchomości', amount: zl(150), cycleMonths: 12, schedule: [3, 5, 9, 11], dueMonth: '2026-03', dueDay: 15 })
    expect(monthlyWeight(tax)).toBe(zl(50))
    expect(tankRate(tax, '2026-11', { want: zl(75), tank: zl(150), taken: zl(75) })).toEqual({ rate: zl(75), nominal: zl(75), catchUp: false, paid: false })
  })
})
