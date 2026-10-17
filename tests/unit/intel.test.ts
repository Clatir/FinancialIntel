import { describe, expect, it } from 'vitest'
import { balancesAt, goalsReachedIn, yearWealth, killzoneGrid, logAccuracy, nextWeekEnvelopes, rangeForecast, spendingByMonth, structureOf, wealthCurve, weekNumbers, yearNumbers } from '@shared/calc/intel'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K4000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const AUTO = defaultCategoryId(3)
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: FOOD, ...over })
const categories = createDefaultSettings(AT).settings.categories

describe('krzywa majątku (D73)', () => {
  it('saldo przed i po saldzie otwarcia (historia z importu liczona wstecz)', () => {
    const opening = balanceSchema.parse({ ...base(), date: '2026-10-10', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(1000) })
    const txs = [tx('2026-10-05', -zl(100)), tx('2026-10-08', zl(300)), tx('2026-10-10', -zl(50)), tx('2026-10-12', -zl(20))]
    // The 7th: 1 000 − 300 (the 8th, before the opening); the 10th: 1 000 − 50; the 12th: − 20 more.
    expect(balancesAt(['2026-10-07', '2026-10-09', '2026-10-10', '2026-10-12'], txs, [opening], [MBANK_ACCOUNT_ID], '2026-10-20')).toEqual([zl(700), zl(1000), zl(950), zl(930)])
  })

  it('punkty co tydzień (niedziela, na końcu dziś) i drawdown od szczytu', () => {
    const opening = balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(1000) })
    const w = wealthCurve([tx('2026-10-06', -zl(200)), tx('2026-10-13', zl(500))], [opening], [MBANK_ACCOUNT_ID], '2026-10-15')
    expect(w).toEqual([
      { date: '2026-10-04', value: zl(1000), drawdown: 0 },
      { date: '2026-10-11', value: zl(800), drawdown: -zl(200) },
      { date: '2026-10-15', value: zl(1300), drawdown: 0 }
    ])
  })

  it('BOS w kierunku trendu, CHoCH przy zmianie', () => {
    const pts = [10, 12, 11, 13, 9, 8, 10, 14].map((value, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, value }))
    // Swing high 12 (2nd) broken by 13 – BOS up; swing low 11 (3rd) broken by 9 – CHoCH down; swing high 13 broken by 14
    // after the low 8 – CHoCH up.
    expect(structureOf(pts).marks).toEqual([
      { date: '2026-01-04', kind: 'bos', direction: 'up', level: 12 },
      { date: '2026-01-05', kind: 'choch', direction: 'down', level: 11 },
      { date: '2026-01-08', kind: 'choch', direction: 'up', level: 13 }
    ])
    expect(structureOf(pts).trend).toBe('up')
  })
})

describe('przegląd roczny', () => {
  it('majątek na koniec 31.12 roku wcześniej i roku (dziś w bieżącym); cele osiągnięte w danym roku', () => {
    const opening = balanceSchema.parse({ ...base(), date: '2025-12-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(1000) })
    const txs = [tx('2025-12-31', -zl(100)), tx('2026-01-02', -zl(50)), tx('2026-12-31', zl(300))]
    expect(yearWealth(txs, [opening], [MBANK_ACCOUNT_ID], '2026', '2027-02-01')).toEqual({ start: zl(900), end: zl(1150) })
    expect(yearWealth(txs, [opening], [MBANK_ACCOUNT_ID], '2026', '2026-06-01')).toEqual({ start: zl(900), end: zl(850) })
    const log = [
      { date: '2025-11-03', kind: 'income' as const, amount: 0, moves: { goals: { G1: zl(600) } } },
      { date: '2026-03-03', kind: 'income' as const, amount: 0, moves: { goals: { G1: zl(500), G2: zl(100) } } }
    ]
    const goals = [{ id: 'G1', name: 'Laptop', target: zl(1000) }, { id: 'G2', name: 'Wakacje', target: zl(5000) }]
    expect(goalsReachedIn(log, goals, '2026')).toEqual(['Laptop'])
    expect(goalsReachedIn(log, goals, '2025')).toEqual([])
  })
})

describe('analizy wywiadu', () => {
  it('Killzones: dzień tygodnia × godzina, tylko wpisy z godziną', () => {
    const g = killzoneGrid([tx('2026-10-16', -zl(40), { time: '19:05' }), tx('2026-10-16', -zl(10), { time: '19:59' }), tx('2026-10-17', -zl(5)), tx('2026-10-18', zl(5), { time: '10:00' })], '2026-10-01', '2026-10-31')
    expect([...g.cells.values()]).toEqual([{ weekday: 5, hour: 19, cost: zl(50), count: 2 }])
    expect(g).toMatchObject({ total: zl(50), withTime: 2, withoutTime: 1 })
  })

  it('wydatki w czasie: kategorie główne miesiąc po miesiącu, ładownia osobno', () => {
    const s = spendingByMonth([tx('2026-09-10', -zl(30)), tx('2026-10-02', -zl(70), { categoryId: AUTO }), tx('2026-10-03', -zl(500), { containerId: nextId() }), tx('2026-10-04', -zl(20), { refundable: true })], categories, ['2026-09', '2026-10'])
    expect(s.rows).toEqual([
      { id: AUTO, values: [0, zl(70)], total: zl(70) },
      { id: FOOD, values: [zl(30), 0], total: zl(30) }
    ])
    expect(s.cargo).toEqual([0, zl(500)])
    expect(s.totals).toEqual([zl(30), zl(570)])
  })

  it('prognoza zasięgu bez wypłat: osłony + kadłub − dług, miesiąc po miesiącu', () => {
    const r = rangeForecast({ shields: zl(5000), hull: zl(4000), debt: zl(1500), costs: zl(3000), month: '2026-10' })
    expect(r.emptyIn).toBe(2.5)
    expect(r.points).toEqual([
      { month: '2026-10', fuel: zl(7500) },
      { month: '2026-11', fuel: zl(4500) },
      { month: '2026-12', fuel: zl(1500) },
      { month: '2027-01', fuel: 0 }
    ])
  })

  it('dziennik kapitański: plan, impuls, bez oznaczenia od progu', () => {
    const l = logAccuracy([tx('2026-10-02', -zl(250), { impulse: 'plan' }), tx('2026-10-03', -zl(90), { impulse: 'impulse' }), tx('2026-10-04', -zl(300)), tx('2026-10-05', -zl(50))], { impulseThreshold: zl(200) }, ['2026-10'])
    expect(l).toEqual([{ month: '2026-10', plan: { count: 1, amount: zl(250) }, impulse: { count: 1, amount: zl(90) }, unmarked: 1 }])
  })

  it('raport wachty: tydzień w liczbach, koperty na następny tydzień; rok w liczbach', () => {
    const w = weekNumbers([tx('2026-10-12', -zl(30)), tx('2026-10-14', -zl(70), { categoryId: AUTO }), tx('2026-10-15', zl(1000), { kind: 'income', categoryId: null })], categories, '2026-10-12')
    expect(w).toMatchObject({ from: '2026-10-12', to: '2026-10-18', costs: zl(100), income: zl(1000), categories: [{ id: AUTO, cost: zl(70) }, { id: FOOD, cost: zl(30) }] })
    expect(w.days.map((d) => d.costs)).toEqual([zl(30), 0, zl(70), 0, 0, 0, 0])
    // 14 days left in October from the 17th: 700 zł left → 350 zł for a week.
    expect(nextWeekEnvelopes([{ categoryId: FOOD, limit: zl(1000), spent: zl(300) }], '2026-10-17')).toEqual([{ categoryId: FOOD, left: zl(700), week: zl(350), days: 7 }])
    // At the month's end only its last days: the envelopes start again on the 1st.
    expect(nextWeekEnvelopes([{ categoryId: FOOD, limit: zl(1000), spent: zl(600) }], '2026-10-29')).toEqual([{ categoryId: FOOD, left: zl(400), week: zl(400), days: 2 }])
    const y = yearNumbers([tx('2026-02-01', -zl(10)), tx('2026-03-01', -zl(5), { containerId: nextId() })], categories, '2026')
    expect(y).toMatchObject({ costs: zl(15), categories: [{ id: FOOD, cost: zl(10) }, { id: 'cargo', cost: zl(5) }] })
    expect(y.months).toHaveLength(12)
  })
})
