import { describe, expect, it } from 'vitest'
import { cargoStatuses } from '@shared/calc/cargoStatus'
import { deadContainers, priceChanges } from '@shared/calc/cargoWatch'
import { computeFleet } from '@shared/calc/fleet'
import { radar } from '@shared/calc/radar'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Container, type Settings, type Transaction } from '@shared/schema'

/**
 * AP-10 (AF-45 / LA.10, LA sp. 1; T135, T375): a periodic fee of 3 months and more paid in the month before its due
 * month – the cycle before paid – is this due's payment in the fee's state, the hold's watch and the Radar, as the engine
 * counts it: no false „nowa cena” (240 → 480 zł, +100%), „zapłacone 22.10”, no false „bez płatności”. A late payment
 * of the cycle before (Woda, August unpaid) stays that cycle's and does not close the next one.
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2025-08-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N3C000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2025-11', accountId: MBANK_ACCOUNT_ID, ...over })
const pay = (c: Container, date: string): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -c.amount, containerId: c.id })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`
const START = '2025-09-01'
const covered = { [MBANK_ACCOUNT_ID]: '2026-10-26' }

// LA.10: Wywóz śmieci 240 zł a quarter on the 20th (Nov, Feb, May, Aug), the November one paid on 22 October.
const waste = container({ name: 'Wywóz śmieci', amount: zl(240), cycleMonths: 3, dueDay: 20 })
const wastePaid = ['2025-11-20', '2026-02-20', '2026-05-20', '2026-08-20', '2026-10-22'].map((d) => pay(waste, d))
// Woda 180 zł a quarter on the 15th: August not paid – paid late on 14 October.
const water = container({ name: 'Woda', amount: zl(180), cycleMonths: 3, dueDay: 15 })
const waterPaid = ['2025-11-14', '2026-02-16', '2026-05-15', '2026-10-14'].map((d) => pay(water, d))

function fleetOf(containers: Container[], transactions: Transaction[], now: string) {
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

describe('AP-10: płatność ponad 14 dni przed terminem zamyka bieżący cykl (T135, AF-45)', () => {
  it('Wywóz 22.10 na termin 20.11: listopad zapłacony tą płatnością („zapłacone 22.10”), jak w silniku', () => {
    const fleet = fleetOf([waste], wastePaid, '2026-11-03T12:00:00+01:00')
    // The engine (T135): November's cycle paid, the tank collects for February.
    expect(fleet.tanks.find((t) => t.containerId === waste.id)).toMatchObject({ paidDue: '2026-11', dueMonth: '2027-02' })
    const s = cargoStatuses({ containers: [waste], transactions: wastePaid, today: '2026-11-03', tanks: fleet.tanks, coveredTo: covered, start: START })
    expect(s.map((x) => [x.due, x.state, x.carried])).toEqual([['2026-11-20', 'paid', false]])
    expect(s[0]!.payments).toEqual([{ id: wastePaid[4]!.id, date: '2026-10-22', amount: zl(240) }])
    // Without the engine's tanks the same: its payments say it.
    expect(cargoStatuses({ containers: [waste], transactions: wastePaid, today: '2026-11-03', tanks: [], coveredTo: covered, start: START })[0]).toMatchObject({ state: 'paid', paid: zl(240) })
    // The Radar: no asteroid on 20.11, the next one on 20.02.
    const items = radar({ today: '2026-11-03', plans: [], containers: [waste], tanks: fleet.tanks, loans: [], money, cargo: s, days: 120 }).filter((i) => i.kind === 'asteroid')
    expect(items.map((i) => i.date)).toEqual(['2027-02-20'])
  })

  it('bez fałszywej „nowej ceny” (240 → 480 zł, +100%) i bez „brak płatności” przy następnym terminie', () => {
    expect(priceChanges({ containers: [waste], transactions: wastePaid, today: '2026-11-03' })).toEqual([])
    // On 1 March 2027 February's due has no payment – one due, not two: not gone quiet.
    expect(deadContainers({ containers: [waste], transactions: wastePaid, today: '2027-03-01', coveredTo: { [MBANK_ACCOUNT_ID]: '2027-02-28' } })).toEqual([])
    // Two dues missed (February and May) – it is.
    expect(deadContainers({ containers: [waste], transactions: wastePaid, today: '2027-06-01', coveredTo: { [MBANK_ACCOUNT_ID]: '2027-05-31' } }).map((d) => d.missed)).toEqual([['2027-02-20', '2027-05-20']])
  })

  it('płatność w miesiącu terminu ponad 14 dni przed jego dniem (02.11 na 25.11) – listopadowa, nie poprzedniego cyklu', () => {
    const oc = container({ name: 'OC', amount: zl(1240), cycleMonths: 12, dueDay: 25 })
    const paid = ['2025-11-25', '2026-11-02'].map((d) => pay(oc, d))
    const s = cargoStatuses({ containers: [oc], transactions: paid, today: '2026-11-03', tanks: [], coveredTo: covered, start: START })
    expect(s.map((x) => [x.due, x.state, x.paid])).toEqual([['2026-11-25', 'paid', zl(1240)]])
    expect(priceChanges({ containers: [oc], transactions: paid, today: '2026-11-03' })).toEqual([])
  })

  it('Woda: zapłata 14.10 zaległego sierpnia zamyka sierpień, nie listopad; przed nią sierpień „po terminie” (D99 pkt 3)', () => {
    // 10 September: the August due (its history day: 15) unpaid – still „po terminie”.
    const sep = cargoStatuses({ containers: [water], transactions: waterPaid.slice(0, 3), today: '2026-09-10', tanks: [], coveredTo: { [MBANK_ACCOUNT_ID]: '2026-09-09' }, start: START })
    expect(sep.map((x) => [x.due, x.state, x.carried])).toEqual([['2026-08-15', 'overdue', true]])
    // The Radar shows it as an asteroid past its day.
    const items = radar({ today: '2026-09-10', plans: [], containers: [water], tanks: [], loans: [], money, cargo: sep, days: 30 }).filter((i) => i.kind === 'asteroid')
    expect(items.map((i) => [i.date, i.overdue ?? false])).toEqual([['2026-08-15', true]])
    // 3 November, after the late payment: August closed, November (14.11) still to pay – the payment of 14.10 is not its.
    const nov = cargoStatuses({ containers: [water], transactions: waterPaid, today: '2026-11-03', tanks: [], coveredTo: covered, start: START })
    expect(nov.map((x) => [x.due, x.state, x.paid])).toEqual([['2026-11-14', 'waiting', 0]])
    expect(priceChanges({ containers: [water], transactions: waterPaid, today: '2026-11-03' })).toEqual([])
  })
})
