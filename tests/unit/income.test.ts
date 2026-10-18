import { describe, expect, it } from 'vitest'
import { computeFleet } from '@shared/calc/fleet'
import { settleHousehold } from '@shared/calc/household'
import { incomeByMonth, incomeOfPeriod, incomeParts, incomeStats, taxOfDockings, type IncomeContext } from '@shared/calc/income'
import { yearNumbers } from '@shared/calc/intel'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, dockingSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K2000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const MAMA = `01KMEM${'0'.repeat(19)}1`
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const salary = (date: string, v: number) => tx(date, zl(v), { kind: 'income', counterparty: 'Pracodawca' })
const xtb = (date: string, v: number) => tx(date, zl(v), { kind: 'trading', counterparty: 'XTB' })
const ctx = (transactions: Transaction[], over: Partial<IncomeContext> = {}): IncomeContext => ({ ledger: settleHousehold(transactions), since: null, members: [], tax: new Map(), ...over })

describe('przychody (D81): praca i trading XTB netto, bez pieniędzy domowników i puli Podatek', () => {
  it('wypłata z XTB to przychód, dopłata go zmniejsza, pula Podatek się nie liczy', () => {
    const out = xtb('2026-09-05', 5000)
    const back = xtb('2026-09-20', -2000)
    const tax = xtb('2026-09-21', 900)
    const taxBack = xtb('2026-09-22', -400)
    const list = [salary('2026-09-10', 4000), out, back, tax, taxBack]
    const c = ctx(list, { tax: new Map([[tax.id, zl(900)], [taxBack.id, zl(400)]]) })
    expect(incomeParts(out, c)).toEqual({ work: 0, trading: zl(5000) })
    expect(incomeParts(back, c)).toEqual({ work: 0, trading: -zl(2000) })
    expect(incomeParts(tax, c)).toEqual({ work: 0, trading: 0 })
    expect(incomeParts(taxBack, c)).toEqual({ work: 0, trading: 0 })
    expect(incomeOfPeriod(list, c)).toEqual({ work: zl(4000), trading: zl(3000), total: zl(7000) })
    // More top-ups than withdrawals: no trading income (never below zero).
    expect(incomeOfPeriod([back], c)).toEqual({ work: 0, trading: 0, total: 0 })
  })

  it('rok w liczbach: trading netto w całym roku, każdy miesiąc osobno', () => {
    const list = [xtb('2026-01-10', 3000), xtb('2026-03-10', -3000), salary('2026-02-10', 4000)]
    const y = yearNumbers(list, createDefaultSettings(AT).settings.categories, '2026', ctx(list))
    expect(y.income).toBe(zl(4000))
    expect(y.months.slice(0, 3).map((m) => m.income)).toEqual([zl(3000), zl(4000), 0])
  })

  it('pula Podatek z dokowania: cała wypłata albo jej część z podziału', () => {
    const whole = xtb('2026-09-05', 1000)
    const part = xtb('2026-09-06', 1000)
    const dock = (transactionId: string, over: Record<string, unknown>) => dockingSchema.parse({ ...base(), date: '2026-09-07', transactionId, accountId: MBANK_ACCOUNT_ID, amount: zl(1000), ...over })
    const byTx = new Map([
      [whole.id, dock(whole.id, { pool: 'tax' })],
      [part.id, dock(part.id, { pool: 'current', split: { shields: zl(700), hull: 0, goals: {}, taxHold: zl(300) } })]
    ])
    expect(taxOfDockings(byTx, [whole, part])).toEqual(new Map([[whole.id, zl(1000)], [part.id, zl(300)]]))
  })

  it('pieniądze domowników sprzed daty rozliczeń nie są przychodem: oznaczone i po nazwie w banku', () => {
    const marked = tx('2026-09-03', zl(300), { kind: 'income', memberId: MAMA, counterparty: 'Ktoś' })
    const byName = tx('2026-09-04', zl(200), { kind: 'income', counterparty: 'ANNA TESTOWA' })
    const after = tx('2026-10-12', zl(250), { kind: 'income', counterparty: 'ANNA TESTOWA' })
    const work = salary('2026-09-10', 4000)
    const list = [marked, byName, after, work]
    const c = ctx(list, { since: '2026-10-10', members: [{ bankNames: ['ANNA TESTOWA'] }] })
    expect([marked, byName, after, work].map((t) => incomeParts(t, c).work)).toEqual([0, 0, zl(250), zl(4000)])
    // Without a date (1.3.0): all of it the ledger's – her marked money is income beyond what she owed.
    expect(incomeParts(byName, ctx(list)).work).toBe(zl(200))
  })

  it('średnie z 3, 6 i 12 pełnych miesięcy i mediana – jedna premia nie rusza mediany', () => {
    const months = new Map<string, { work: number; trading: number }>()
    for (let i = 1; i <= 12; i++) months.set(`2025-${String(i).padStart(2, '0')}`, { work: zl(4000), trading: 0 })
    months.set('2025-12', { work: zl(16000), trading: zl(-1000) })
    months.set('2025-11', { work: zl(4000), trading: zl(3000) })
    const s = incomeStats(months, '2025-01', '2026-01')
    expect(s.months).toHaveLength(12)
    expect(s.windows[3]).toEqual({ months: 3, work: zl(8000), trading: zl(666.67), total: zl(8666.67) })
    expect(s.windows[12]).toMatchObject({ months: 12, work: zl(5000), trading: zl(166.67) })
    expect(s.median).toEqual({ months: 12, work: zl(4000), trading: 0, total: zl(4000) })
    // A short history: every window has the months there are.
    const short = incomeStats(new Map([['2025-12', { work: zl(3000), trading: 0 }]]), '2025-12', '2026-01')
    expect(short.windows[12]).toEqual({ months: 1, work: zl(3000), trading: 0, total: zl(3000) })
    expect(incomeStats(new Map(), null, '2026-01').windows[6]).toEqual({ months: 0, work: null, trading: null, total: null })
  })

  it('silnik: średnia 6 miesięcy z pracy i tradingu netto – ta sama w ostrzeżeniu o pensji', () => {
    const s = createDefaultSettings(AT).settings
    const transactions = [salary('2026-08-10', 3000), xtb('2026-08-15', 2000), xtb('2026-08-20', -1500), salary('2026-09-10', 3000)]
    const state = computeFleet({
      settings: { ...s, budget: { start: '2026-08-01', initial: null } },
      balances: [balanceSchema.parse({ ...base(), date: '2026-08-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(10000) })],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-08', salary: zl(3500) })],
      transactions,
      now: '2026-10-05T12:00:00+02:00'
    })
    expect(state.incomeStats.months.map((m) => [m.month, m.total])).toEqual([
      ['2026-08', zl(3500)],
      ['2026-09', zl(3000)]
    ])
    expect(state.income).toEqual({ average: zl(3250), months: 2 })
    expect(state.alarms.find((a) => a.kind === 'salary-above-income')?.amount).toBe(zl(250))
    expect(incomeByMonth(transactions, state.incomeContext).get('2026-08')).toEqual({ work: zl(3000), trading: zl(500) })
  })
})
