/**
 * N3 (1.15.7) – the group's review, the smaller seams:
 * - 6: a buoy of this month with a planned envelope's category is spent from that envelope – the course's rest counts it
 *   once (the envelope's rest), only what it is over that rest is drawn again (T390);
 * - 7: a return of the pool „Podatek” with an empty tax hold is no top-up of XTB for the firewall's note (T374);
 * - 9: „Inwentaryzacja” dates a confirmation by its own moment (`confirmedAt`), never by a later write of the record (T383);
 * - 11: a one-off past says „zrobiona” only by an operation that is its own – not one of another buoy (T378);
 * - 12: „Skąd ta liczba?” of today's energy adds up – today's refund of an earlier purchase is a note beside it (T370);
 * - 14: the cushion's range reads the engine's average costs through one function (`averageCosts`, T388).
 */
import { describe, expect, it } from 'vitest'
import { briefing } from '@shared/calc/briefing'
import { course, courseInputOf } from '@shared/calc/course'
import { cushionTrend } from '@shared/calc/cushion'
import { warsawEndOf } from '@shared/calc/dates'
import { averageCosts, computeFleet, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { chooseMission, missionStatus, type GameInput } from '@shared/calc/game'
import { costsByMonth } from '@shared/calc/plan'
import { pastStateOf } from '@shared/calc/scheduled'
import { energyWhy } from '@shared/calc/why'
import { createDefaultSettings } from '@shared/defaults'
import {
  balanceSchema,
  CASH_ACCOUNT_ID,
  defaultCategoryId,
  dockingSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  scheduledSchema,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
  type Balance,
  type Scheduled,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N3R000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const buoy = (over: Partial<Scheduled> & { name: string; date: string }): Scheduled => scheduledSchema.parse({ ...base(), ...over })
const opening = (date: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount })

// Prezenty and Dom – planned envelopes (the default categories).
const HOME = defaultCategoryId(2)
const GIFTS = defaultCategoryId(9)
const NOW = '2026-11-04T12:00:00+01:00'

function settingsOf(start: string, over: (s: Settings) => Settings = (s) => s): Settings {
  const s = createDefaultSettings(AT).settings
  return over({ ...s, budget: { ...s.budget, start }, layers: { ...s.layers, assumedCosts: zl(3000) } })
}

function run(input: FleetInput): FleetState {
  const f = computeFleet(input)
  expect(layersSum(f)).toBe(f.total)
  return f
}

describe('6: boja z kategorią koperty planowej liczona raz w resztce miesiąca (T390)', () => {
  /**
   * November from the 1st: 20 000 zł, the salary 4 000 zł, Prezenty 500 zł unspent; Dom (no envelope this month) took the
   * whole salary – the month's energy 0 zł, the plan still spends Prezenty's 500 zł over it.
   */
  function november(scheduled: Scheduled[]) {
    const settings = settingsOf('2026-11-01')
    const months = [monthPlanSchema.parse({ ...base(), month: '2026-11', salary: zl(4000), envelopes: { [GIFTS]: zl(500) } })]
    const transactions = [tx('2026-11-02', -zl(4000), { categoryId: HOME })]
    const f = run({ settings, balances: [opening('2026-11-01', zl(20000))], months, transactions, now: NOW })
    const ci = courseInputOf(f, { settings, plans: months, goals: [], scheduled, transactions })!
    return { f, ci, c: course(ci, 'median') }
  }

  it('„Prezent dla mamy” −300 zł (Prezenty) przy 500 zł koperty: z osłon 500 zł, nie 800 zł', () => {
    const { f, ci, c } = november([buoy({ name: 'Prezent dla mamy', date: '2026-11-20', amount: -zl(300), categoryId: GIFTS })])
    expect(f.energy).toBe(0)
    expect(ci.energy).toEqual({ left: 0, needs: zl(500) })
    // The buoy is spent from the envelope: nothing of it apart from its rest.
    expect(ci.extras.get('2026-11') ?? 0).toBe(0)
    expect(c.rest).toEqual({ overEnergy: zl(500), short: 0 })
    expect(c.rangeRest).toBeCloseTo((f.shields.amount - zl(500) + f.hull.amount - f.debt) / f.costs.average!)
  })

  it('boja ponad resztę koperty – tylko nadwyżka; dwie boje dzielą resztę; bez kategorii albo przyszły miesiąc – cała', () => {
    expect(november([buoy({ name: 'Prezent', date: '2026-11-20', amount: -zl(800), categoryId: GIFTS })]).ci.extras.get('2026-11')).toBe(-zl(300))
    const two = [buoy({ name: 'Prezent dla mamy', date: '2026-11-20', amount: -zl(300), categoryId: GIFTS }), buoy({ name: 'Prezent dla taty', date: '2026-11-25', amount: -zl(400), categoryId: GIFTS })]
    expect(november(two).ci.extras.get('2026-11')).toBe(-zl(200))
    expect(november([buoy({ name: 'Wesele', date: '2026-11-21', amount: -zl(300) })]).ci.extras.get('2026-11')).toBe(-zl(300))
    // December's envelope is not this month's rest: the buoy of December whole, as before.
    expect(november([buoy({ name: 'Prezent', date: '2026-12-10', amount: -zl(300), categoryId: GIFTS })]).ci.extras.get('2026-12')).toBe(-zl(300))
  })
})

describe('7: zwrot puli „Podatek” przy pustej rezerwie to nie dopłata do XTB bez firewalla (T374)', () => {
  it('odprawa przy wyłączonym firewallu: zwrot puli Podatek – bez notatki; zwykła dopłata – z notatką', () => {
    const settings = settingsOf('2026-11-01', (s) => ({ ...s, orders: { ...s.orders, firewall: false } }))
    const months = [monthPlanSchema.parse({ ...base(), month: '2026-11', salary: zl(4000), envelopes: {} })]
    const back = tx('2026-11-04', -zl(200), { kind: 'trading', counterparty: 'XTB S.A.' })
    const top = tx('2026-11-04', -zl(300), { kind: 'trading', counterparty: 'XTB S.A.' })
    const dockings = [dockingSchema.parse({ ...base(), date: back.date, transactionId: back.id, pool: 'tax' })]
    const f = run({ settings, balances: [opening('2026-11-01', zl(20000))], months, transactions: [back, top], dockings, now: NOW })
    // The tax hold was empty: the return came from the shields, the engine's move has no tax hold.
    expect(f.taxHold).toBe(0)
    const notes = briefing({ fleet: f, containers: [], imports: [], label: () => '', firewallOff: true }).filter((i) => i.key.startsWith('alarm:firewall:off'))
    expect(notes.map((i) => i.key)).toEqual([`alarm:firewall:off:${top.id}:2026-11`])
  })
})

describe('9: „Inwentaryzacja” po chwili potwierdzenia, nie po późniejszym zapisie rekordu (T383)', () => {
  const W45 = { template: 'balances', week: '2026-W45', params: {} }
  const confirmation = (accountId: string, at: string, over: Partial<Balance> = {}): Balance =>
    balanceSchema.parse({ ...base(), createdAt: at, updatedAt: at, date: at.slice(0, 10), accountId, kind: 'confirmation', amount: zl(100), ...over })
  function world(balances: Balance[], settings: (s: Settings) => Settings = (s) => s): GameInput {
    const s0 = settingsOf('2026-09-01', (s) => ({ ...s, game: { ...s.game, start: '2026-09-07' } }))
    return {
      settings: settings(s0),
      balances: [opening('2026-09-01', zl(20000)), ...balances],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-09', salary: zl(3100), envelopes: {} })],
      transactions: [],
      containers: [],
      dockings: [],
      game: []
    }
  }

  it('potwierdzenie z października przepisane we wtorek 03.11 (edycja, scalanie, konflikt) – nie liczy się w tygodniu', () => {
    const old = confirmation(MBANK_ACCOUNT_ID, '2026-10-01T10:00:00.000Z', { updatedAt: '2026-11-03T10:00:00.000Z' })
    expect(missionStatus(world([old]), W45, '2026-11-04')).toMatchObject({ have: 0 })
    // Confirmed again on Tuesday (`confirmBalance` stamps the moment) – it counts.
    expect(missionStatus(world([{ ...old, confirmedAt: '2026-11-03T10:00:00.000Z' }]), W45, '2026-11-04')).toMatchObject({ have: 1 })
    // All three accounts confirmed this week by their own moments.
    const all = [XTB_WALLET_ACCOUNT_ID, CASH_ACCOUNT_ID, MBANK_ACCOUNT_ID].map((a) => confirmation(a, '2026-11-02T09:00:00.000Z'))
    expect(missionStatus(world(all), W45, '2026-11-04')).toEqual({ ok: true, have: 3, need: 3 })
  })

  it('wybór misji: stare potwierdzenie przepisane przed poniedziałkiem to dalej słaby punkt', () => {
    const imports = (s: Settings): Settings => ({ ...s, import: { ...s.import, log: { '2026-10-24T09:00:00.000Z': MBANK_ACCOUNT_ID } } })
    const rewritten = confirmation(MBANK_ACCOUNT_ID, '2026-09-20T10:00:00.000Z', { updatedAt: '2026-10-20T10:00:00.000Z' })
    expect(chooseMission(world([rewritten], imports), '2026-10-26', null).template).toBe('balances')
  })
})

describe('11: boja jednorazowa po dniu – „zrobiona” tylko własną operacją (T378)', () => {
  const TODAY = '2026-11-10'
  const pay = tx('2026-10-04', -zl(80), { counterparty: 'MANDAT STRAZ MIEJSKA' })

  it('operacja zrobiona z innej boi (jej `done`) nie zamyka tej', () => {
    const mine = buoy({ name: 'Mandat', date: '2026-10-03', amount: -zl(80) })
    const theirs = buoy({ name: 'Mandat za parkowanie', date: '2026-10-04', amount: -zl(80), done: { '2026-10-04': pay.id } })
    expect(pastStateOf(mine, [pay], TODAY, [mine, theirs])).toBe('lapsed')
    expect(pastStateOf(theirs, [pay], TODAY, [mine, theirs])).toBe('done')
  })

  it('operacja dopasowana do wcześniejszej boi (jak na radarze: dzień po dniu) nie zamyka późniejszej', () => {
    const earlier = buoy({ name: 'Mandat', date: '2026-10-02', amount: -zl(80) })
    const later = buoy({ name: 'Mandat drugi', date: '2026-10-05', amount: -zl(80) })
    expect(pastStateOf(later, [pay], TODAY, [earlier, later])).toBe('lapsed')
    expect(pastStateOf(earlier, [pay], TODAY, [earlier, later])).toBe('done')
    // Alone, as before: the operation is its.
    expect(pastStateOf(later, [pay], TODAY, [later])).toBe('done')
  })
})

describe('12: „Skąd ta liczba?” energii dziś sumuje się przy zwrocie dawnego zakupu (T370)', () => {
  it('przydział 100, wydane dziś 30, zwrot 50 – wiersze dodawane dają 70, zwrot obok sumy', () => {
    const lines = energyWhy({ limit: zl(3100), spentBefore: zl(1000), spentToday: zl(30), base: zl(100), allowance: zl(100), left: zl(70), daysLeft: 21, returned: zl(50), returnedBy: { '': zl(50) }, energy: zl(70), cap: null }, '2026-11')
    const from = lines.findIndex((l) => l.label === 'Przydział na dziś')
    const total = lines.at(-1)!
    expect(total).toEqual({ label: 'Energia dziś', amount: zl(70), total: true })
    const added = lines.slice(from, -1).filter((l) => !l.aside)
    expect(added.reduce((a, l) => a + (l.amount ?? 0), 0)).toBe(total.amount)
    expect(lines.find((l) => l.label.startsWith('Zwroty dziś'))).toMatchObject({ amount: zl(50), aside: true })
  })
})

describe('14: zasięg na koniec miesiąca ze średnich kosztów silnika – jedna funkcja (T388)', () => {
  it('`averageCosts` silnika: stan teraz i zasięg końca miesiąca w trendzie osłon i kadłuba', () => {
    const settings = settingsOf('2026-08-01')
    const months = [monthPlanSchema.parse({ ...base(), month: '2026-08', salary: zl(4000), envelopes: {} })]
    const transactions = ['2026-08', '2026-09', '2026-10'].map((m, i) => tx(`${m}-15`, -zl(3000 + 500 * i), { categoryId: HOME }))
    const f = run({ settings, balances: [opening('2026-08-01', zl(30000))], months, transactions, now: NOW })
    // Now: three covered months – their average (3 000, 3 500, 4 000 zł).
    expect(f.costs).toEqual({ average: zl(3500), months: 3, source: 'history' })
    expect(averageCosts(f.historyMonths, costsByMonth(transactions), zl(3000), f.month)).toEqual(f.costs)
    // At September's end: one covered month – the assumed costs (under 3), as Mostek had them then.
    expect(averageCosts(f.historyMonths, costsByMonth(transactions), zl(3000), '2026-09')).toEqual({ average: zl(3000), months: 1, source: 'assumed' })
    const [sept, oct] = cushionTrend({ fleet: f, transactions, loans: [], containers: [], assumedCosts: zl(3000), months: ['2026-09', '2026-10'] })
    const atEnd = (date: string) => computeFleet({ settings, balances: [opening('2026-08-01', zl(30000))], months, transactions, now: warsawEndOf(date) })
    expect(sept!.range).toBe(atEnd('2026-09-30').range)
    expect(oct!.range).toBe(atEnd('2026-10-31').range)
  })
})
