/**
 * Plan spłaty pożyczek (1.17.0, AP-41 – T480–T484): the taken loans paid off month by month – the schedule (no
 * overpayment), the avalanche and the snowball; the interest to the grosz, the schedule's last installment the rest.
 * Every number below is counted by hand in the comments (a month's interest = balance × rate ÷ 12, half up).
 */
import { describe, expect, it } from 'vitest'
import { computeFleet, layersSum, type FleetInput } from '@shared/calc/fleet'
import { loanStates } from '@shared/calc/loans'
import { payoff, payoffDebtsOf, payoffOrder, principalOf, rateOf, type PayoffDebt, type PayoffPlan } from '@shared/calc/payoff'
import { createDefaultSettings } from '@shared/defaults'
import { serializeRecord } from '@shared/records'
import { balanceSchema, containerSchema, loanSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Loan, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K3000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })

const debt = (id: string, open: number, installments: Array<[string, number]>, rate: number | null, date = '2026-01-01'): PayoffDebt => ({
  id,
  name: id,
  open,
  installments: installments.map(([d, amount]) => ({ date: d, amount })),
  rate,
  date
})
/** Each loan's paid-off month, by id. */
const offs = (p: PayoffPlan) => Object.fromEntries(p.debts.map((d) => [d.id, d.paidOff]))
/** Each month: [month, per loan [installment, extra, balance], paid, left]. */
const rows = (p: PayoffPlan) => p.months.map((m) => [m.month, m.lines.map((l) => [l.id, l.installment, l.extra, l.balance]), m.paid, m.balance])

describe('AP-41: kapitał, odsetki i reszta w ostatniej racie (T481)', () => {
  it('2 raty po 100,23 zł przy 12 %: kapitał 197,50 zł, odsetki 1,98 (197,5 gr w górę) i 0,99 zł, ostatnia rata płaci resztę 100,24 zł', () => {
    // Backwards at 1 % a month: 100,23 / 1,01 = 99,2376 → 99,24; (99,24 + 100,23) / 1,01 = 197,4950… → 197,50.
    const d = debt('A', zl(200.46), [['2026-11-20', zl(100.23)], ['2026-12-20', zl(100.23)]], 12)
    expect(principalOf(d, '2026-11')).toBe(zl(197.5))
    const p = payoff({ debts: [d], month: '2026-11', extra: 0, once: 0 }).none
    // November: 197,50 × 1 % = 1,975 → 1,98 (half up); 199,48 − 100,23 = 99,25. December: 0,9925 → 0,99; 99,25 + 0,99 = 100,24 – the rest.
    expect(rows(p)).toEqual([
      ['2026-11', [['A', 10023, 0, 9925]], 10023, 9925],
      ['2026-12', [['A', 10024, 0, 0]], 10024, 0]
    ])
    expect(p.months.map((m) => m.lines[0]!.interest)).toEqual([198, 99])
    expect(p).toMatchObject({ end: '2026-12', interest: 297, paid: 20047 })
  })

  it('bez oprocentowania (albo 0 %): kapitał = do spłaty, raty z harmonogramu bez zmian, odsetek brak', () => {
    for (const rate of [null, 0]) {
      const d = debt('B', zl(1000), [['2026-11-05', zl(333.33)], ['2026-12-05', zl(333.33)], ['2027-01-05', zl(333.34)]], rate)
      expect(principalOf(d, '2026-11')).toBe(zl(1000))
      const p = payoff({ debts: [d], month: '2026-11', extra: 0, once: 0 }).none
      expect(p.months.map((m) => m.paid)).toEqual([33333, 33333, 33334])
      expect(p).toMatchObject({ end: '2027-01', interest: 0, paid: zl(1000) })
    }
  })

  it('rata zaległa (sprzed miesiąca planu) – w pierwszym miesiącu; przerwa w harmonogramie – same odsetki', () => {
    // 100 zł overdue from October, 100 zł in January; 12 %: backwards 100 / 1,01 = 99,01; (99,01 + 0) / 1,01 = 98,03;
    // (98,03 + 100) / 1,01 = 196,07.
    const d = debt('C', zl(200), [['2026-10-10', zl(100)], ['2027-01-10', zl(100)]], 12)
    expect(principalOf(d, '2026-11')).toBe(zl(196.07))
    const p = payoff({ debts: [d], month: '2026-11', extra: 0, once: 0 }).none
    // Nov: 1,96 → 198,03 − 100 = 98,03; Dec: 0,98 → 99,01; Jan: 0,99 → 100,00 – the rest.
    expect(rows(p)).toEqual([
      ['2026-11', [['C', 10000, 0, 9803]], 10000, 9803],
      ['2026-12', [['C', 0, 0, 9901]], 0, 9901],
      ['2027-01', [['C', 10000, 0, 0]], 10000, 0]
    ])
    expect(p.interest).toBe(196 + 98 + 99)
  })
})

describe('AP-41: trzy pożyczki – lawina, kula śnieżna i bez nadpłat (T482)', () => {
  // A – from the parents, no rate: 4 × 100 zł; B – 12 %: 3 × 100 zł (principal 294,10 zł); C – 24 %: 2 × 204 zł
  // (principal 396,08 zł). Backwards: B 100 / 1,01 = 99,01; 199,01 / 1,01 = 197,04; 297,04 / 1,01 = 294,10;
  // C 204 / 1,02 = 200,00; 404 / 1,02 = 396,08.
  const A = debt('A', zl(400), [['2026-11-10', zl(100)], ['2026-12-10', zl(100)], ['2027-01-10', zl(100)], ['2027-02-10', zl(100)]], null, '2026-06-01')
  const B = debt('B', zl(300), [['2026-11-15', zl(100)], ['2026-12-15', zl(100)], ['2027-01-15', zl(100)]], 12, '2026-08-01')
  const C = debt('C', zl(408), [['2026-11-20', zl(204)], ['2026-12-20', zl(204)]], 24, '2026-10-01')
  const input = { debts: [A, B, C], month: '2026-11', extra: zl(100), once: 0 }

  it('kapitał na start i kolejność: lawina C (24 %) → B (12 %) → A (bez), kula śnieżna B (300 zł) → A (400 zł) → C (408 zł)', () => {
    expect(payoff(input).principal).toEqual({ A: zl(400), B: zl(294.1), C: zl(396.08) })
    expect(payoffOrder(input.debts, 'avalanche')).toEqual(['C', 'B', 'A'])
    expect(payoffOrder(input.debts, 'snowball')).toEqual(['B', 'A', 'C'])
  })

  it('bez nadpłat: harmonogram – C w grudniu, B w styczniu, A w lutym; odsetki 5,90 + 11,92 zł', () => {
    // B: 2,94 (294,10 × 1 %), 1,97, 0,99 = 5,90; C: 7,92 (396,08 × 2 % = 7,9216), 4,00 = 11,92.
    const p = payoff(input).none
    expect(rows(p)).toEqual([
      ['2026-11', [['A', 10000, 0, 30000], ['B', 10000, 0, 19704], ['C', 20400, 0, 20000]], 40400, 69704],
      ['2026-12', [['A', 10000, 0, 20000], ['B', 10000, 0, 9901], ['C', 20400, 0, 0]], 40400, 29901],
      ['2027-01', [['A', 10000, 0, 10000], ['B', 10000, 0, 0]], 20000, 10000],
      ['2027-02', [['A', 10000, 0, 0]], 10000, 0]
    ])
    expect(offs(p)).toEqual({ A: '2027-02', B: '2027-01', C: '2026-12' })
    expect(p).toMatchObject({ end: '2027-02', interest: 590 + 1192, paid: zl(400) + zl(300) + zl(408) })
  })

  it('lawina, 100 zł nadpłaty co miesiąc: najpierw C, potem B; rata spłaconej C przechodzi dalej – wszystkie w styczniu, odsetki 14,83 zł', () => {
    // Nov: installments 100 + 100 + 204; 100 zł more to C → C 100,00 zł.
    // Dec: A 100 → 200; B 1,97 → 199,01 − 100 = 99,01; C 2,00 → 102,00 – its last installment, the rest (204 − 102 =
    // 102 zł free); 100 + 102 = 202 zł: B 99,01 (paid off), A 102,99 → 97,01.
    // Jan: A 97,01 of its 100 zł – paid off.
    const p = payoff(input).avalanche
    expect(rows(p)).toEqual([
      ['2026-11', [['A', 10000, 0, 30000], ['B', 10000, 0, 19704], ['C', 20400, 10000, 10000]], 50400, 59704],
      ['2026-12', [['A', 10000, 10299, 9701], ['B', 10000, 9901, 0], ['C', 10200, 0, 0]], 50400, 9701],
      ['2027-01', [['A', 9701, 0, 0]], 9701, 0]
    ])
    expect(offs(p)).toEqual({ A: '2027-01', B: '2026-12', C: '2026-12' })
    // B: 2,94 + 1,97; C: 7,92 + 2,00.
    expect(p).toMatchObject({ order: ['C', 'B', 'A'], end: '2027-01', interest: 294 + 197 + 792 + 200, paid: 110501 })
  })

  it('kula śnieżna, 100 zł nadpłaty: najpierw B, potem A; odsetki 15,83 zł – więcej niż lawina, mniej niż bez nadpłat', () => {
    // Nov: 100 zł more to B → 97,04. Dec: B 0,97 → 98,01 of its 100 zł (1,99 free); C 4,00 → 204,00, its last; 100 + 1,99
    // to A → 98,01. Jan: A 98,01 – paid off.
    const p = payoff(input).snowball
    expect(rows(p)).toEqual([
      ['2026-11', [['A', 10000, 0, 30000], ['B', 10000, 10000, 9704], ['C', 20400, 0, 20000]], 50400, 59704],
      ['2026-12', [['A', 10000, 10199, 9801], ['B', 9801, 0, 0], ['C', 20400, 0, 0]], 50400, 9801],
      ['2027-01', [['A', 9801, 0, 0]], 9801, 0]
    ])
    expect(offs(p)).toEqual({ A: '2027-01', B: '2026-12', C: '2026-12' })
    expect(p).toMatchObject({ order: ['B', 'A', 'C'], end: '2027-01', interest: 294 + 97 + 792 + 400, paid: 110601 })
    const all = payoff(input)
    expect(all.avalanche.interest).toBeLessThan(all.snowball.interest)
    expect(all.snowball.interest).toBeLessThan(all.none.interest)
  })

  it('jednorazowo 300 zł teraz (bez nadpłaty co miesiąc): kula spłaca B w listopadzie, rata B z grudnia idzie na A – wszystko w grudniu', () => {
    // Nov: installments, then 300 zł: B 197,04 (paid off), A 102,96 → 197,04. Dec: A 100 → 97,04; B's installment of
    // December (100 zł) free → A 97,04 (paid off); C 4,00 → 204,00, its last.
    const p = payoff({ ...input, extra: 0, once: zl(300) }).snowball
    expect(rows(p)).toEqual([
      ['2026-11', [['A', 10000, 10296, 19704], ['B', 10000, 19704, 0], ['C', 20400, 0, 20000]], 70400, 39704],
      ['2026-12', [['A', 10000, 9704, 0], ['C', 20400, 0, 0]], 40104, 0]
    ])
    expect(offs(p)).toEqual({ A: '2026-12', B: '2026-11', C: '2026-12' })
    expect(p.interest).toBe(294 + 792 + 400)
  })

  it('jednorazowo tylko w pierwszym miesiącu: 50 zł na B, potem już tylko raty – reszta raty B z ostatniego miesiąca idzie na A', () => {
    // Nov: 50 zł to B → 147,04. Dec: B 1,47 → 148,51 − 100 = 48,51 (nothing over it). Jan: B 0,49 → 49,00 – its last,
    // the rest (51,00 zł of its 100 zł free) → A 100,00 − 51,00 = 49,00. Feb: A 49,00 – its last.
    const p = payoff({ ...input, extra: 0, once: zl(50) }).snowball
    expect(rows(p)).toEqual([
      ['2026-11', [['A', 10000, 0, 30000], ['B', 10000, 5000, 14704], ['C', 20400, 0, 20000]], 45400, 64704],
      ['2026-12', [['A', 10000, 0, 20000], ['B', 10000, 0, 4851], ['C', 20400, 0, 0]], 40400, 24851],
      ['2027-01', [['A', 10000, 5100, 4900], ['B', 4900, 0, 0]], 20000, 4900],
      ['2027-02', [['A', 4900, 0, 0]], 4900, 0]
    ])
    expect(p).toMatchObject({ end: '2027-02', interest: 294 + 147 + 49 + 1192 })
  })

  it('bez kwoty ponad raty strategie są harmonogramem – także grosz reszty ostatniej raty nie przechodzi na inną pożyczkę', () => {
    const all = payoff({ ...input, extra: 0, once: 0 })
    expect(rows(all.avalanche)).toEqual(rows(all.none))
    expect(rows(all.snowball)).toEqual(rows(all.none))
    expect(all.avalanche.order).toEqual(['C', 'B', 'A'])
    // X: 2 × 100,08 zł at 9 % – its last installment pays 100,07 zł (1 grosz less), Y goes on: nothing of X's moves to Y.
    const X = debt('X', zl(200.16), [['2026-11-01', zl(100.08)], ['2026-12-01', zl(100.08)]], 9)
    const Y = debt('Y', zl(300), [['2026-11-01', zl(100)], ['2026-12-01', zl(100)], ['2027-01-01', zl(100)]], null)
    const two = payoff({ debts: [X, Y], month: '2026-11', extra: 0, once: 0 })
    expect(two.none.months[1]!.lines.find((l) => l.id === 'X')!.installment).toBe(10007)
    expect(rows(two.snowball)).toEqual(rows(two.none))
    expect(rows(two.avalanche)).toEqual(rows(two.none))
  })

  it('remisy kolejności: lawina – mniejsze do spłaty, kula – wyższe oprocentowanie, potem starsza pożyczka i id', () => {
    const P = debt('P', zl(500), [], 10, '2026-05-01')
    const Q = debt('Q', zl(300), [], 10, '2026-06-01')
    const R = debt('R', zl(300), [], 20, '2026-07-01')
    const S = debt('S', zl(300), [], 20, '2026-04-01')
    const T = debt('T', zl(300), [], 20, '2026-04-01')
    expect(payoffOrder([P, Q, R, T, S], 'avalanche')).toEqual(['S', 'T', 'R', 'Q', 'P'])
    expect(payoffOrder([P, Q, R, T, S], 'snowball')).toEqual(['S', 'T', 'R', 'Q', 'P'])
    expect(payoffOrder([P, Q], 'avalanche')).toEqual(['Q', 'P'])
    // Not known = 0 %: after a known rate in the avalanche, by the open in the snowball.
    const N = debt('N', zl(100), [], null, '2026-01-01')
    expect(payoffOrder([N, P], 'avalanche')).toEqual(['P', 'N'])
    expect(payoffOrder([N, P], 'snowball')).toEqual(['N', 'P'])
  })

  it('deterministyczne: ta sama kolejność i te same wyniki pożyczek przy innej kolejności wejścia; grosze całkowite, zapłacone = kapitał + odsetki', () => {
    const a = payoff(input)
    const b = payoff({ ...input, debts: [C, A, B] })
    for (const v of ['none', 'avalanche', 'snowball'] as const) {
      expect(b[v].order).toEqual(a[v].order)
      expect(Object.fromEntries(b[v].debts.map((d) => [d.id, d]))).toEqual(Object.fromEntries(a[v].debts.map((d) => [d.id, d])))
      for (const m of a[v].months) for (const l of m.lines) for (const x of [l.interest, l.installment, l.extra, l.balance]) expect(Number.isInteger(x)).toBe(true)
      expect(a[v].paid).toBe(zl(400) + zl(294.1) + zl(396.08) + a[v].interest)
    }
    expect(payoff(input)).toEqual(a)
  })
})

describe('AP-41: pożyczka bez harmonogramu i nadpłata, której zjadają odsetki (T482)', () => {
  it('bez harmonogramu: bez nadpłat nigdy (koniec nieznany), z nadpłatą 50 zł – w trzecim miesiącu', () => {
    // 100 zł at 12 %, no schedule: Nov 1,00 → 101 − 50 = 51; Dec 0,51 → 51,51 − 50 = 1,51; Jan 0,0151 → 0,02 → 1,53.
    const d = debt('D', zl(100), [], 12)
    const all = payoff({ debts: [d], month: '2026-11', extra: zl(50), once: 0 })
    expect(all.none).toMatchObject({ end: null, debts: [{ id: 'D', paidOff: null }] })
    expect(all.none.months).toHaveLength(1)
    expect(rows(all.avalanche)).toEqual([
      ['2026-11', [['D', 0, 5000, 5100]], 5000, 5100],
      ['2026-12', [['D', 0, 5000, 151]], 5000, 151],
      ['2027-01', [['D', 0, 153, 0]], 153, 0]
    ])
    expect(all.avalanche).toMatchObject({ end: '2027-01', interest: 100 + 51 + 2 })
  })

  it('odsetki większe niż nadpłata: plan się kończy – nigdy, bez 600 miesięcy liczenia', () => {
    // 100 000 zł at 12 % = 1 000 zł interest a month, 50 zł over it.
    const all = payoff({ debts: [debt('E', zl(100000), [], 12)], month: '2026-11', extra: zl(50), once: 0 })
    expect(all.avalanche.end).toBeNull()
    expect(all.avalanche.months).toHaveLength(1)
  })
})

describe('AP-41: pożyczki z rekordów – tylko wzięte i otwarte (T480)', () => {
  const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
  const loan = (over: Partial<Loan> & Pick<Loan, 'direction' | 'amount'>): Loan => loanSchema.parse({ ...base(), name: 'Pożyczka', date: '2026-09-01', ...over })

  it('udzielona, zamknięta i spłacona – poza planem; wzięta – reszta rat po spłatach, oprocentowanie z rekordu', () => {
    const laptop = loan({ direction: 'taken', name: 'Laptop', amount: zl(3000), rate: 9.5, schedule: [{ id: nextId(), date: '2026-10-10', amount: zl(1100) }, { id: nextId(), date: '2026-11-10', amount: zl(1100) }, { id: nextId(), date: '2026-12-10', amount: zl(1100) }] })
    const given = loan({ direction: 'given', amount: zl(500), schedule: [{ id: nextId(), date: '2026-11-01', amount: zl(500) }] })
    const closed = loan({ direction: 'taken', amount: zl(200), closedAt: '2026-10-01T10:00:00.000Z', schedule: [{ id: nextId(), date: '2026-12-01', amount: zl(200) }] })
    const repaid = loan({ direction: 'taken', amount: zl(100), schedule: [{ id: nextId(), date: '2026-10-01', amount: zl(100) }] })
    const c = containerSchema.parse({ ...base(), name: 'Rata: Laptop', type: 'installment', amount: zl(1100), dueMonth: '2026-10', dueDay: 10, from: '2026-10', until: '2026-12', loanId: laptop.id })
    // 1 100 zł paid by the container, 200 zł over it from the shields (the loan's own operation).
    const txs = [tx('2026-10-10', -zl(1100), { containerId: c.id }), tx('2026-10-20', -zl(200), { kind: 'loan', loanId: laptop.id }), tx('2026-10-02', -zl(100), { kind: 'loan', loanId: repaid.id })]
    // An older one read later: the plan lists the oldest first, whatever the records' order.
    const older = loan({ direction: 'taken', name: 'Starszy', amount: zl(50), date: '2026-03-01', schedule: [{ id: nextId(), date: '2026-12-01', amount: zl(50) }] })
    const states = loanStates([laptop, given, closed, repaid, older], txs, [c], '2026-11-05')
    expect(payoffDebtsOf(states)).toEqual([
      { id: older.id, name: 'Starszy', open: zl(50), installments: [{ date: '2026-12-01', amount: zl(50) }], rate: null, date: '2026-03-01' },
      { id: laptop.id, name: 'Laptop', open: zl(2000), installments: [{ date: '2026-11-10', amount: zl(900) }, { date: '2026-12-10', amount: zl(1100) }], rate: 9.5, date: '2026-09-01' }
    ])
  })

  it('oprocentowanie: liczba 0–100, inaczej nieznane; pole addytywne – bez niego plik bez zmian, silnik go nie czyta', () => {
    expect(rateOf(loan({ direction: 'taken', amount: 1, rate: 7.25 }))).toBe(7.25)
    expect(loan({ direction: 'taken', amount: 1, rate: 150 } as never).rate).toBeUndefined()
    expect(loan({ direction: 'taken', amount: 1, rate: 'dużo' } as never).rate).toBeUndefined()
    expect(rateOf(loan({ direction: 'taken', amount: 1, rate: null }))).toBeNull()
    const plain = loan({ direction: 'taken', amount: zl(4000) })
    expect('rate' in plain).toBe(false)
    expect(serializeRecord('loans', plain)).not.toContain('rate')
    expect(JSON.parse(serializeRecord('loans', { ...plain, rate: 7.5 })).rate).toBe(7.5)

    // The engine with and without the rate: the same state.
    const s0 = createDefaultSettings(AT).settings
    const schedule = [{ id: nextId(), date: '2026-11-15', amount: zl(4400) }]
    const same: Omit<FleetInput, 'loans'> = {
      settings: { ...s0, budget: { ...s0.budget, start: '2026-10-01' }, layers: { ...s0.layers, assumedCosts: zl(2000) } },
      balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(10000) })],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(2000) })],
      transactions: [tx('2026-10-05', zl(4000), { kind: 'loan', loanId: plain.id })],
      now: '2026-10-20T12:00:00+02:00'
    }
    const run = (l: Loan) => computeFleet({ ...same, loans: [l] })
    const without = run({ ...plain, schedule })
    const withRate = run({ ...plain, schedule, rate: 12 })
    expect(layersSum(withRate)).toBe(withRate.total)
    expect({ ...withRate, loans: withRate.loans.map((s) => ({ ...s, loan: { ...s.loan, rate: undefined } })) }).toEqual({ ...without, loans: without.loans.map((s) => ({ ...s, loan: { ...s.loan, rate: undefined } })) })
  })
})
