/**
 * N3 (1.15.7), AP-31 – kryterium 2: „osłony + kadłub i zasięg” at each month's end with the change m/m (WY.3, RY.23).
 * The states are the engine's (T4): its log added up to each month's end equals its own run at that day.
 */
import { describe, expect, it, vi } from 'vitest'
import { arrowOf, cushionMonths, cushionTrend, layersAtMonthEnds, rangeDeltaText, type CushionInput } from '@shared/calc/cushion'
import { lastDayOf, warsawEndOf } from '@shared/calc/dates'
import { computeFleet, layersSum, rangeMonths, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, defaultCategoryId, goalSchema, loanSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K7N310000000000000000${String(++seq).padStart(3, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const AUTO = defaultCategoryId(3)
const NOW = '2026-11-04T12:00:00+01:00'
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const opening = (date: string, amount: number, accountId = MBANK_ACCOUNT_ID) => balanceSchema.parse({ ...base(), date, accountId, kind: 'opening', amount })
const plan = (month: string, salary: number) => monthPlanSchema.parse({ ...base(), month, salary, envelopes: {} })

function settingsWith(budget: Partial<Settings['budget']>, layers: Partial<Settings['layers']> = {}): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, ...budget }, layers: { ...s.layers, ...layers } }
}

function run(input: FleetInput): FleetState {
  const f = computeFleet(input)
  expect(layersSum(f)).toBe(f.total)
  return f
}

const trendOf = (f: FleetState, input: FleetInput, months: string[], over: Partial<CushionInput> = {}) =>
  cushionTrend({ fleet: f, transactions: input.transactions, loans: input.loans ?? [], containers: input.containers ?? [], assumedCosts: input.settings.layers.assumedCosts, months, ...over })

describe('AP-31: osłony + kadłub i zasięg na koniec każdego miesiąca (1.15.7)', () => {
  // From 1 August: 10 000 zł, the hull 2 000 zł at the start, the salary 3 000 zł, 4 000 zł in on the 10th, 2 500 zł of
  // costs on the 15th – the shields fill to 9 000 (3 salaries), the rest of the income goes to the hull.
  const simple: FleetInput = {
    settings: settingsWith({ start: '2026-08-01', initial: { shields: 0, hull: zl(2000), goals: {} } }),
    balances: [opening('2026-08-01', zl(10000))],
    months: [plan('2026-08', zl(3000))],
    transactions: ['2026-08', '2026-09', '2026-10'].flatMap((m) => [tx(`${m}-10`, zl(4000), { kind: 'income', categoryId: null }), tx(`${m}-15`, -zl(2500), { categoryId: FOOD })]),
    now: NOW
  }

  it('przykład w groszach: miesiące od startu budżetu, bieżący pominięty, zmiana m/m kwoty i zasięgu', () => {
    const f = run(simple)
    const t = trendOf(f, simple, cushionMonths(f.month))
    expect(t.map((p) => [p.month, p.date, p.shields, p.hull, p.cushion, p.delta, p.rangeDelta])).toEqual([
      // August: no month before in the budget – no change; no full month before it – no average costs, no range.
      ['2026-08', '2026-08-31', zl(9000), zl(2000), zl(11000), null, null],
      // September: the loot of August (500 zł) back in the shields, 1 500 zł of the income to the hull.
      ['2026-09', '2026-09-30', zl(9000), zl(3500), zl(12500), zl(1500), null],
      ['2026-10', '2026-10-31', zl(9000), zl(5000), zl(14000), zl(1500), 6]
    ])
    expect(t[0]!.range).toBeNull()
    // The range of that day: the average costs of the full months before it (2 500 zł).
    expect(t[1]!.range).toBe(5)
    expect(t[2]!.range).toBe(5.6)
    // The month running (November: after its salary's turn) never compared with a month's end.
    expect(t.some((p) => p.month === '2026-11')).toBe(false)
    expect(cushionMonths('2026-11')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
  })

  it('każdy koniec miesiąca = silnik uruchomiony tego dnia (log silnika, nie zapisany stan): dostawy, łupy, wydatek ponad energię, pensja z kadłuba, pożyczki, konto dołączone później', () => {
    const wakacje = goalSchema.parse({ ...base(), name: 'Wakacje', target: zl(3000), priority: 1 })
    const taken = loanSchema.parse({ ...base(), name: 'Kredyt', direction: 'taken', amount: zl(6000), date: '2026-01-05', schedule: ['2026-06-05', '2026-07-05', '2026-08-05'].map((date) => ({ id: nextId(), date, amount: zl(2000) })) })
    const given = loanSchema.parse({ ...base(), name: 'Tomek', direction: 'given', amount: zl(1000), date: '2026-04-20', schedule: [{ id: nextId(), date: '2026-06-01', amount: zl(1000) }] })
    const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']
    const input: FleetInput = {
      settings: settingsWith({ start: '2026-01-01' }, { assumedCosts: zl(3000) }),
      balances: [opening('2026-01-01', zl(25000)), opening('2026-03-01', zl(1000), XTB_WALLET_ACCOUNT_ID)],
      months: [plan('2026-01', zl(4000)), plan('2026-06', zl(4500))],
      goals: [wakacje],
      loans: [taken, given],
      transactions: [
        ...months.flatMap((m, i) => [tx(`${m}-10`, zl(i === 6 ? 1000 : 5000), { kind: 'income', categoryId: null }), tx(`${m}-12`, -zl(2800), { categoryId: FOOD })]),
        // Over the month's energy: the rest from the shields.
        tx('2026-03-20', -zl(9000), { categoryId: AUTO }),
        // The shields almost empty: July's salary partly from the hull.
        tx('2026-06-25', -zl(12000), { categoryId: AUTO }),
        tx('2026-01-05', zl(6000), { kind: 'loan', loanId: taken.id, categoryId: null }),
        tx('2026-06-05', -zl(2000), { kind: 'loan', loanId: taken.id, categoryId: null }),
        tx('2026-07-05', -zl(2000), { kind: 'loan', loanId: taken.id, categoryId: null }),
        tx('2026-04-20', -zl(1000), { kind: 'loan', loanId: given.id, categoryId: null }),
        tx('2026-06-01', zl(500), { kind: 'loan', loanId: given.id, categoryId: null })
      ],
      now: NOW
    }
    const f = run(input)
    const t = trendOf(f, input, cushionMonths(f.month))
    expect(t.map((p) => p.month)).toEqual(months)
    for (const p of t) {
      const then = run({ ...input, now: warsawEndOf(lastDayOf(p.month)) })
      expect([p.month, p.shields, p.hull]).toEqual([p.month, then.shields.amount, then.hull.amount])
      expect(p.range).toBeCloseTo(then.range!, 10)
    }
    // The course of the year has its dents: some month falls; July's salary took the hull.
    expect(t.some((p) => p.delta != null && p.delta < 0)).toBe(true)
    expect(f.alarms.some((a) => a.kind === 'salary-from-hull' && a.date === '2026-07-01')).toBe(true)
  })

  it('pożyczka wzięta później: przed jej dniem nie jest długiem; log niezgodny ze stanem – silnik w dniu końca miesiąca', () => {
    const later = loanSchema.parse({ ...base(), name: 'Kredyt', direction: 'taken', amount: zl(5000), date: '2026-10-05', schedule: [{ id: nextId(), date: '2026-12-05', amount: zl(5000) }] })
    const input: FleetInput = { ...simple, loans: [later], transactions: [...simple.transactions, tx('2026-10-05', zl(5000), { kind: 'loan', loanId: later.id, categoryId: null })] }
    const f = run(input)
    const t = trendOf(f, input, cushionMonths(f.month))
    // September: 12 500 zł, no debt yet; October: 5 000 zł borrowed in the shields, the debt off the range.
    expect(t[1]!.range).toBe(rangeMonths(zl(9000), zl(3500), zl(2500), 0))
    expect(t[2]!.cushion).toBe(zl(19000))
    expect(t[2]!.range).toBe(rangeMonths(t[2]!.shields, t[2]!.hull, zl(2500), zl(5000)))
    // A layer moved without a log entry: the months are the engine's own runs at each month's end.
    const odd = { ...f, shields: { ...f.shields, amount: f.shields.amount + 1 } }
    expect(layersAtMonthEnds(odd, ['2026-09'])).toBeNull()
    const engineAt = vi.fn((date: string) => ({ started: true, shields: { amount: zl(100) }, hull: { amount: zl(200) }, range: 1.25 }) as unknown as FleetState)
    const viaEngine = trendOf(odd, input, ['2026-09', '2026-10'], { engineAt })
    expect(engineAt.mock.calls.map((c) => c[0])).toEqual(['2026-08-31', '2026-09-30', '2026-10-31'])
    expect(viaEngine.map((p) => [p.month, p.cushion, p.delta, p.rangeDelta])).toEqual([
      ['2026-09', zl(300), 0, 0],
      ['2026-10', zl(300), 0, 0]
    ])
  })

  it('przed startem i bez startu – nic; strzałki i zmiana zasięgu w dziesiątych (jak T218)', () => {
    const f = run(simple)
    expect(trendOf(f, simple, ['2026-06', '2026-07'])).toEqual([])
    expect(cushionTrend({ fleet: { ...f, started: false, start: null }, transactions: [], loans: [], containers: [], assumedCosts: null, months: ['2026-09'] })).toEqual([])
    expect([arrowOf(zl(1)), arrowOf(-1), arrowOf(0), arrowOf(null)]).toEqual(['↑', '↓', '→', ''])
    expect([rangeDeltaText(6), rangeDeltaText(-12), rangeDeltaText(0), rangeDeltaText(null)]).toEqual(['+0,6 mies.', '−1,2 mies.', '0,0 mies.', '—'])
  })
})
