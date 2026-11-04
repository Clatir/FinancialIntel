import { describe, expect, it } from 'vitest'
import { briefing } from '@shared/calc/briefing'
import { cargoStatuses, type CargoStatus } from '@shared/calc/cargoStatus'
import { computeFleet, layersSum, paidBeforeStart, type FleetState } from '@shared/calc/fleet'
import { sinkingOf } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Container, type Settings, type Transaction } from '@shared/schema'

/**
 * Przegląd N3 (1, 2, 3, 4, 5, 10, 13 – T393, T394): which due a payment pays is one rule – `feeDuesOf` (T375) – for
 * Ładownia, the Radar, the briefing and the engine's paid cycles: the engine never collects a cycle Ładownia shows paid,
 * never skips one it shows unpaid. A late payment closes the late due, the early one of the next cycle that one; a
 * 2-month fee's payment before its day pays the late due first; „Zapłacone poza budżetem” and a container added later
 * settle the dues before; a due before the budget's first day is not the budget's; a payment before the day pays the
 * oldest late due.
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2025-08-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N3R000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2025-11', accountId: MBANK_ACCOUNT_ID, ...over })
const pay = (c: Container, date: string, amount = c.amount): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -amount, containerId: c.id })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`

/** The ship from `start`: 30 000 zł on mBank, a salary of 5 000 zł every month. */
function fleetOf(start: string, containers: Container[], transactions: Transaction[], now: string): FleetState {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = { ...s0, budget: { ...s0.budget, start } }
  const state = computeFleet({
    settings,
    balances: [balanceSchema.parse({ ...base(), date: start, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(30000) })],
    months: [monthPlanSchema.parse({ ...base(), month: start.slice(0, 7), salary: zl(5000), envelopes: {} })],
    transactions,
    containers,
    now
  })
  expect(layersSum(state)).toBe(state.total)
  return state
}
const cargoOf = (containers: Container[], transactions: Transaction[], today: string, start: string | null) =>
  cargoStatuses({ containers, transactions, today, coveredTo: {}, start })
const states = (list: CargoStatus[]) => list.map((s) => [s.due, s.state, s.carried])
const paidWith = (list: CargoStatus[]) => list.map((s) => [s.due, s.state, s.payments.map((p) => p.date)])

describe('przegląd N3 1: spóźniona zapłata poprzedniego cyklu, potem wcześniejsza następnego – silnik jak Ładownia', () => {
  // Woda 180 zł a quarter on the 15th (November, February, May, August); the budget from 1 September 2025.
  const water = container({ name: 'Woda', amount: zl(180), cycleMonths: 3, dueMonth: '2025-11', dueDay: 15 })
  const paid = [pay(water, '2025-08-15'), pay(water, '2025-12-10'), pay(water, '2026-01-20')]

  it('listopad zapłacony 10.12, luty 20.01: luty zapłacony – 1.02 bez raty, energia lutego cała', () => {
    const f = fleetOf('2025-09-01', [water], paid, '2026-02-05T12:00:00+01:00')
    // Before: paidDue null, want 180 zł – the „sinking” of 1.02 took the fee again from February's energy.
    expect(f.tanks[0]).toMatchObject({ paidDue: '2026-02', dueMonth: '2026-05', want: 0 })
    expect(sinkingOf(f.log, '2026-02').get(water.id)).toBeUndefined()
    expect(f.energy).toBe(zl(5000))
    // Ładownia: February paid with the payment of 20.01, November closed by the one of 10.12.
    expect(paidWith(cargoOf([water], paid, '2026-02-05', f.start))).toEqual([['2026-02-15', 'paid', ['2026-01-20']]])
  })

  it('przed startem (T345, przegląd N2 4): luty zapłacony 28.04, start 5.05 – maj nie jest zapłacony, odkłada 300 zł', () => {
    const w = container({ name: 'Wodociągi', amount: zl(300), cycleMonths: 3, dueMonth: '2026-02', dueDay: 10 })
    // Before: the late payment of February closed May (the month before it) – nothing set aside, May's payment from the energy.
    expect([...paidBeforeStart(w, ['2025-11-10', '2026-04-28'], '2026-05-05')].sort()).toEqual(['2025-11', '2026-02'])
    const txs = [pay(w, '2025-11-10'), pay(w, '2026-04-28'), pay(w, '2026-05-10')]
    const f = fleetOf('2026-05-05', [w], txs, '2026-05-12T12:00:00+02:00')
    expect(sinkingOf(f.log, '2026-05').get(w.id)).toBe(zl(300))
    expect(f.alarms.filter((a) => a.kind === 'sinking-short')).toEqual([])
    expect(f.tanks[0]).toMatchObject({ amount: 0, paidDue: '2026-05', dueMonth: '2026-08' })
    // Ładownia: May paid with its own payment of 10.05 – the one of 28.04 is February's.
    expect(paidWith(cargoOf([w], txs, '2026-05-12', f.start))).toEqual([['2026-05-10', 'paid', ['2026-05-10']]])
  })
})

describe('przegląd N3 2: opłata co 2 miesiące – płatność przed dniem terminu najpierw na zaległy, jedna płatność to jeden termin', () => {
  // Kablówka 100 zł every 2 months on the 10th (October, December, February…): October paid, December not.
  const tv = container({ name: 'Kablówka', amount: zl(100), cycleMonths: 2, dueMonth: '2025-10', dueDay: 10 })
  const txs = [pay(tv, '2025-10-10'), pay(tv, '2026-02-05')]

  it('05.02 zamyka grudzień: luty czeka, 3 dni po 10.02 – po terminie; silnik bez cyklu zapłaconego', () => {
    // Before: February „paid” with no payment (the engine's paidDue), December paid by 05.02 – one payment, two dues.
    const f = fleetOf('2025-09-01', [tv], txs, '2026-02-06T12:00:00+01:00')
    expect(f.tanks[0]).toMatchObject({ paidDue: null, dueMonth: '2026-02' })
    expect(paidWith(cargoOf([tv], txs, '2026-02-06', f.start))).toEqual([['2026-02-10', 'waiting', []]])
    const late = fleetOf('2025-09-01', [tv], txs, '2026-02-14T12:00:00+01:00')
    expect(late.tanks[0]).toMatchObject({ paidDue: null })
    expect(states(cargoOf([tv], txs, '2026-02-14', late.start))).toEqual([['2026-02-10', 'overdue', false]])
  })

  it('„Zapłacone (dziś)” przy zaległym grudniu 05.02 płaci grudzień – nie luty', () => {
    const before = cargoOf([tv], txs.slice(0, 1), '2026-02-05', '2025-09-01')
    expect(before.map((s) => [s.due, s.carried, s.payToday])).toEqual([
      ['2025-12-10', true, true],
      ['2026-02-10', false, false]
    ])
    const f = fleetOf('2025-09-01', [tv], txs, '2026-02-05T12:00:00+01:00')
    expect(f.tanks[0]).toMatchObject({ paidDue: null })
  })
})

describe('przegląd N3 3: „Zapłacone poza budżetem” zamyka zaległy termin także dla silnika', () => {
  // Woda 180 zł a quarter on the 15th: November unpaid, settled outside the budget (aliveAt 16.11), February paid 20.01.
  const water = container({ name: 'Woda', amount: zl(180), cycleMonths: 3, dueMonth: '2025-11', dueDay: 15, aliveAt: '2025-11-16' })
  const txs = [pay(water, '2025-08-15'), pay(water, '2026-01-20')]

  it('20.01 to luty, wcześniej: 1.02 bez raty, paidDue luty', () => {
    const f = fleetOf('2025-09-01', [water], txs, '2026-02-05T12:00:00+01:00')
    // Before: November still open for the engine – the payment of 20.01 its late one, February collected again (180 zł).
    expect(f.tanks[0]).toMatchObject({ paidDue: '2026-02', want: 0 })
    expect(sinkingOf(f.log, '2026-02').get(water.id)).toBeUndefined()
    expect(paidWith(cargoOf([water], txs, '2026-02-05', f.start))).toEqual([['2026-02-15', 'paid', ['2026-01-20']]])
  })
})

describe('przegląd N3 4: kontener dodany po starcie – termin sprzed dodania nie bierze zaległej zapłaty', () => {
  // The budget from 1 September 2025; Wywóz 180 zł a quarter (November, February…) added on 10 January 2026.
  const waste = container({ name: 'Wywóz', amount: zl(180), cycleMonths: 3, dueMonth: '2025-11', dueDay: 15, createdAt: '2026-01-10T10:00:00.000Z' })
  const txs = [pay(waste, '2026-01-20')]

  it('20.01 to luty (listopad sprzed dodania): 1.02 bez raty, paidDue luty – jak Ładownia', () => {
    const f = fleetOf('2025-09-01', [waste], txs, '2026-02-05T12:00:00+01:00')
    // Before: November open for the engine – at the turn of February the tank took the whole fee again from the energy.
    expect(f.tanks[0]).toMatchObject({ paidDue: '2026-02', want: 0 })
    expect(sinkingOf(f.log, '2026-02').get(waste.id)).toBeUndefined()
    expect(paidWith(cargoOf([waste], txs, '2026-02-05', f.start))).toEqual([['2026-02-20', 'paid', ['2026-01-20']]])
  })
})

describe('przegląd N3 5: termin sprzed dnia startu budżetu nie jest zaległy', () => {
  // Internet 100 zł a month on the 3rd; the budget starts on 20 September 2025, the container added then.
  const START = '2025-09-20'
  const net = container({ name: 'Internet', amount: zl(100), dueMonth: '2025-09', dueDay: 3, createdAt: '2025-09-20T10:00:00.000Z' })

  it('10.10: tylko październik (zapłacony 03.10) – 03.09 sprzed startu bez „po terminie”, bez alertu odprawy', () => {
    const txs = [pay(net, '2025-10-03')]
    const cargo = cargoOf([net], txs, '2025-10-10', START)
    // Before: [['2025-09-03', 'overdue', true], ['2025-10-03', 'paid', false]] – every day, until „Zapłacone poza budżetem”.
    expect(states(cargo)).toEqual([['2025-10-03', 'paid', false]])
    const fleet = fleetOf(START, [net], txs, '2025-10-10T12:00:00+02:00')
    expect(briefing({ fleet, containers: [net], imports: [], lastConfirmation: '2025-10-10', label: () => '', cargo, money }).filter((i) => i.kind === 'cargo')).toEqual([])
  })

  it('w miesiącu startu termin sprzed startu – bez stanu; płatność przed dniem 01.10 jest październikowa', () => {
    expect(cargoOf([net], [], '2025-09-25', START)).toEqual([])
    expect(paidWith(cargoOf([net], [pay(net, '2025-10-01')], '2025-10-10', START))).toEqual([['2025-10-03', 'paid', ['2025-10-01']]])
  })

  it('termin sprzed startu zapłacony przed startem (T379) – „zapłacone”', () => {
    // Telefon 50 zł on the 3rd (its history), the November one paid on 28 October; the budget from 4 November.
    const fee = container({ name: 'Telefon', amount: zl(50), dueMonth: '2025-09', dueDay: 3, createdAt: '2025-11-04T10:00:00.000Z' })
    const txs = ['2025-09-03', '2025-10-03', '2025-10-28'].map((d) => pay(fee, d))
    expect(paidWith(cargoOf([fee], txs, '2025-11-10', '2025-11-04'))).toEqual([['2025-11-03', 'paid', ['2025-10-28']]])
  })
})

describe('przegląd N3 10: płatność przed dniem terminu zamyka najstarszy zaległy termin', () => {
  // Siłownia 60 zł a month on the 5th: August paid, September and October not.
  const START = '2025-08-01'
  const gym = container({ name: 'Siłownia', amount: zl(60), dueMonth: '2025-08', dueDay: 5 })
  const aug = pay(gym, '2025-08-05')

  it('01.11 zamyka wrzesień (najstarszy) – październik dalej po terminie', () => {
    // Before: 01.11 closed October, September stayed overdue for ever.
    const s = cargoOf([gym], [aug, pay(gym, '2025-11-01')], '2025-11-03', START)
    expect(states(s)).toEqual([
      ['2025-10-05', 'overdue', true],
      ['2025-11-05', 'waiting', false]
    ])
  })

  it('„Zapłacone (dziś)” przy najstarszym zaległym; po nim – przy następnym', () => {
    expect(cargoOf([gym], [aug], '2025-10-30', START).map((s) => [s.due, s.payToday])).toEqual([
      ['2025-09-05', true],
      ['2025-10-05', false]
    ])
    expect(cargoOf([gym], [aug, pay(gym, '2025-10-30')], '2025-10-31', START).map((s) => [s.due, s.payToday])).toEqual([['2025-10-05', true]])
  })

  it('poprzedni termin zapłacony: wcześniejsza płatność jest swoja (T135), choć starszy zaległy', () => {
    // Woda 180 zł a quarter on the 15th: August unpaid, November paid – 20.01 is February's early one.
    const water = container({ name: 'Woda', amount: zl(180), cycleMonths: 3, dueMonth: '2025-08', dueDay: 15 })
    const txs = [pay(water, '2025-05-15'), pay(water, '2025-11-15'), pay(water, '2026-01-20')]
    const f = fleetOf('2025-06-01', [water], txs, '2026-02-05T12:00:00+01:00')
    expect(f.tanks[0]).toMatchObject({ paidDue: '2026-02' })
    expect(states(cargoOf([water], txs, '2026-02-05', f.start))).toEqual([
      ['2025-08-15', 'overdue', true],
      ['2026-02-15', 'paid', false]
    ])
  })
})
