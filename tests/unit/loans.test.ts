import { describe, expect, it } from 'vitest'
import { briefing } from '@shared/calc/briefing'
import { computeFleet, layersSum, type FleetInput } from '@shared/calc/fleet'
import { debtOf, loanState, loanStates, monthlySchedule } from '@shared/calc/loans'
import { pit38Deadline, radar } from '@shared/calc/radar'
import { createDefaultSettings } from '@shared/defaults'
import { dueNotices } from '@shared/notify'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import {
  balanceSchema,
  containerSchema,
  HOUSE_MEMBER_ID,
  loanSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  type Container,
  type Loan,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K2000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const loan = (over: Partial<Loan> & Pick<Loan, 'direction' | 'amount'>): Loan => loanSchema.parse({ ...base(), name: 'Pożyczka', date: '2026-09-01', ...over })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`

describe('pożyczki (D72): udzielona z osłon, raty wracają; wzięta – raty w ładowni, zasięg minus dług', () => {
  it('harmonogram miesięczny: grosze z resztą w ostatniej racie, dzień miesiąca zachowany (koniec lutego)', () => {
    let n = 0
    const s = monthlySchedule(zl(1000), 3, '2026-12-31', () => `ID${++n}`)
    expect(s.map((x) => [x.date, x.amount])).toEqual([
      ['2026-12-31', 33333],
      ['2027-01-31', 33333],
      ['2027-02-28', 33334]
    ])
  })

  it('udzielona: spłaty kolejno pokrywają raty; zaległa po 3 dniach, z kwotą wszystkich zaległych', () => {
    const l = loan({ direction: 'given', amount: zl(900), schedule: [{ id: nextId(), date: '2026-10-01', amount: zl(300) }, { id: nextId(), date: '2026-11-01', amount: zl(300) }, { id: nextId(), date: '2026-12-01', amount: zl(300) }] })
    const out = tx('2026-09-01', -zl(900), { kind: 'loan', loanId: l.id })
    const back = tx('2026-10-02', zl(200), { kind: 'loan', loanId: l.id })
    const s = loanState(l, [out, back], [], '2026-10-03')
    expect(s).toMatchObject({ total: zl(900), paid: zl(200), open: zl(700), next: { date: '2026-10-01', amount: zl(100) } })
    // 2 days late: not yet; the 4th of October: 3 days late.
    expect(s.overdue).toBeNull()
    expect(loanState(l, [out, back], [], '2026-10-04').overdue).toEqual({ date: '2026-10-01', last: '2026-10-01', amount: zl(100), days: 3 })
    expect(loanState(l, [out, back], [], '2026-11-10').overdue).toEqual({ date: '2026-10-01', last: '2026-11-01', amount: zl(400), days: 40 })
    expect(loanState({ ...l, closedAt: '2026-10-05T10:00:00.000Z' }, [out, back], [], '2026-11-10')).toMatchObject({ open: 0, overdue: null, next: null })
  })

  it('wzięta: raty płacone kontenerem ładowni (także bez loanId), dług do zasięgu', () => {
    const l = loan({ direction: 'taken', amount: zl(1200), schedule: [{ id: nextId(), date: '2026-10-10', amount: zl(620) }, { id: nextId(), date: '2026-11-10', amount: zl(620) }] })
    const c: Container = containerSchema.parse({ ...base(), name: 'Rata', type: 'installment', amount: zl(620), dueMonth: '2026-10', dueDay: 10, from: '2026-10', until: '2026-11', loanId: l.id })
    const paid = tx('2026-10-10', -zl(620), { categoryId: null, containerId: c.id })
    // An operation of another kind keeping a stale loan id counts nothing.
    const stale = tx('2026-10-11', -zl(50), { kind: 'transfer', loanId: l.id })
    const s = loanState(l, [paid, stale], [c], '2026-10-20')
    expect(s).toMatchObject({ total: zl(1240), paid: zl(620), open: zl(620), overdue: null, next: { date: '2026-11-10', amount: zl(620) } })
    expect(debtOf(loanStates([l], [paid], [c], '2026-10-20'))).toBe(zl(620))
  })

  it('silnik: pożyczka wzięta w osłonach, ale zasięg liczy osłony minus dług; udzielona – należność', () => {
    const s0 = createDefaultSettings(AT).settings
    const settings: Settings = { ...s0, budget: { ...s0.budget, start: '2026-10-01' }, layers: { ...s0.layers, assumedCosts: zl(2000) } }
    const taken = loan({ direction: 'taken', amount: zl(4000), schedule: [{ id: nextId(), date: '2026-11-15', amount: zl(4000) }] })
    const given = loan({ direction: 'given', amount: zl(500) })
    const input: FleetInput = {
      settings,
      balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(10000) })],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(2000) })],
      loans: [taken, given],
      transactions: [tx('2026-10-05', zl(4000), { kind: 'loan', loanId: taken.id }), tx('2026-10-06', -zl(500), { kind: 'loan', loanId: given.id })],
      now: '2026-10-20T12:00:00+02:00'
    }
    const f = computeFleet(input)
    expect(layersSum(f)).toBe(f.total)
    expect(f.debt).toBe(zl(4000))
    expect(f.receivables.loans[given.id]).toBe(zl(500))
    // The start: shields 6 000 (3 salaries), hull 4 000; then − 2 000 (salary) + 4 000 (loan) − 500 (lent) = 7 500 in the
    // shields. The range: (7 500 − 4 000 of debt + 4 000) / 2 000 = 3,75 (without the debt it would be 5,75).
    expect(f.shields.amount).toBe(zl(7500))
    expect(f.hull.amount).toBe(zl(4000))
    expect(f.range).toBeCloseTo(3.75, 5)
  })

  it('należność domu w silniku: najstarszy niespłacony zakup „do zwrotu” (spłaty od najstarszych)', () => {
    const s0 = createDefaultSettings(AT).settings
    const f = computeFleet({
      settings: { ...s0, budget: { ...s0.budget, start: '2026-09-01' } },
      balances: [balanceSchema.parse({ ...base(), date: '2026-09-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })],
      transactions: [
        tx('2026-09-01', -zl(100), { refundable: true }),
        tx('2026-09-10', -zl(50), { refundable: true }),
        tx('2026-09-20', zl(120), { kind: 'income', repaid: zl(120) }),
        // Before the budget's start: in the opening balance, not a receivable.
        tx('2026-08-01', -zl(999), { refundable: true })
      ],
      now: '2026-10-20T12:00:00+02:00'
    })
    expect(f.receivables).toMatchObject({ house: zl(30), houseSince: '2026-09-10' })
    expect(layersSum(f)).toBe(f.total)
  })

  it('udzielona pożyczka bez operacji wypływu (pożyczone przed startem): spłata wraca do osłon, nie jest przychodem; zamknięta – bez należności', () => {
    const s0 = createDefaultSettings(AT).settings
    const l = loan({ direction: 'given', amount: zl(1000), date: '2026-08-15' })
    const input: FleetInput = {
      settings: { ...s0, budget: { ...s0.budget, start: '2026-09-01' } },
      balances: [balanceSchema.parse({ ...base(), date: '2026-09-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })],
      loans: [l],
      transactions: [tx('2026-10-05', zl(600), { kind: 'loan', loanId: l.id })],
      now: '2026-10-20T12:00:00+02:00'
    }
    const f = computeFleet(input)
    expect(f.log.find((e) => e.kind === 'loan')!.moves).toEqual({ loans: { [l.id]: -zl(600) }, shields: zl(600) })
    expect(f.receivables.loans).toEqual({ [l.id]: zl(400) })
    expect(computeFleet({ ...input, loans: [{ ...l, closedAt: '2026-10-10T10:00:00.000Z' }] }).receivables.loans).toEqual({})
  })
})

describe('radar 90 dni i PIT-38 (D58, D72)', () => {
  it('PIT-38 od 1 lutego do 30 kwietnia, bez kwoty', () => {
    expect(pit38Deadline('2027-01-31')).toBeNull()
    expect(pit38Deadline('2027-02-01')).toBe('2027-04-30')
    expect(pit38Deadline('2027-04-30')).toBe('2027-04-30')
    expect(pit38Deadline('2027-05-01')).toBeNull()
  })

  it('pensje 1. dnia, asteroidy w oknie, raty i spłaty (zaległe też), PIT-38 – po kolei', () => {
    const plans = [monthPlanSchema.parse({ ...base(), month: '2027-01', salary: zl(4000) })]
    const oc = containerSchema.parse({ ...base(), name: 'OC auta', amount: zl(1240), cycleMonths: 12, dueMonth: '2027-03', dueDay: 20 })
    const ended = containerSchema.parse({ ...base(), name: 'Stare', amount: zl(100), cycleMonths: 6, dueMonth: '2027-03', dueDay: 1, until: '2027-01' })
    const given = loan({ name: 'Ania', direction: 'given', amount: zl(300), counterparty: 'Anna', schedule: [{ id: nextId(), date: '2027-01-25', amount: zl(150) }, { id: nextId(), date: '2027-02-25', amount: zl(150) }] })
    const lent = tx('2027-01-01', -zl(300), { kind: 'loan', loanId: given.id })
    const items = radar({
      today: '2027-02-01',
      plans,
      containers: [oc, ended],
      tanks: [{ containerId: oc.id, name: 'OC auta', amount: zl(930), dueMonth: '2027-03', paidDue: null, due: zl(1240) }],
      loans: loanStates([given], [lent], [], '2027-02-01'),
      money
    })
    expect(items.map((i) => [i.date, i.kind, i.name, i.amount, i.direction, i.overdue ?? false])).toEqual([
      ['2027-01-25', 'repayment', 'Spłata: Ania', zl(150), 'in', true],
      ['2027-02-25', 'repayment', 'Spłata: Ania', zl(150), 'in', false],
      ['2027-03-01', 'salary', 'Pensja od siebie', zl(4000), 'inside', false],
      ['2027-03-20', 'asteroid', 'OC auta', zl(1240), 'out', false],
      ['2027-04-01', 'salary', 'Pensja od siebie', zl(4000), 'inside', false],
      ['2027-04-30', 'pit38', 'PIT-38', null, null, false],
      // 90 days from 1 February reach 2 May.
      ['2027-05-01', 'salary', 'Pensja od siebie', zl(4000), 'inside', false]
    ])
    expect(items.find((i) => i.kind === 'asteroid')!.note).toBe('w zbiorniku 930.00 zł')
    expect(items.find((i) => i.kind === 'pit38')!.note).toContain('za 2026')
  })

  it('odprawa i powiadomienia: zaległa rata, PIT-38 14 i 3 dni przed, należność domu po 30 dniach', () => {
    const s0 = createDefaultSettings(AT).settings
    const settings: Settings = { ...s0, budget: { ...s0.budget, start: '2027-01-01' } }
    const given = loan({ name: 'Ania', direction: 'given', amount: zl(300), schedule: [{ id: nextId(), date: '2027-04-10', amount: zl(300) }] })
    const fleet = computeFleet({
      settings,
      balances: [balanceSchema.parse({ ...base(), date: '2027-01-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })],
      loans: [given],
      transactions: [tx('2027-03-01', -zl(300), { kind: 'loan', loanId: given.id }), tx('2027-03-10', -zl(80), { refundable: true })],
      now: '2027-04-17T12:00:00+02:00'
    })
    const items = briefing({ fleet, containers: [], imports: [], lastConfirmation: '2027-04-15', label: () => '' })
    expect(items.filter((i) => ['loan', 'pit38', 'house'].includes(i.kind)).map((i) => [i.kind, i.level, i.key])).toEqual([
      ['loan', 'yellow', `loan:${given.id}:2027-04-10`],
      ['pit38', 'info', 'pit38:2027-04-30:14'],
      ['house', 'info', `house:${HOUSE_MEMBER_ID}:2027-03-10`]
    ])
    expect(items.find((i) => i.kind === 'house')!.text).toBe('Dom: do oddania 80,00 zł – najstarszy zakup z 10.03 (38 dni).')
    const notices = dueNotices({ fleet, containers: [], imports: [], lastConfirmation: '2027-04-15', label: () => '', prefs: DEFAULT_MACHINE_PREFS.notify, quietHours: { from: '23:00', to: '05:00' }, time: '12:00', opened: false, money })
    expect(notices.filter((n) => n.tag === 'radar').map((n) => n.title)).toEqual(['Rata pożyczki po terminie', 'PIT-38 na radarze', 'Rozliczenie z domownikiem'])
    const off = dueNotices({ fleet, containers: [], imports: [], lastConfirmation: '2027-04-15', label: () => '', prefs: { ...DEFAULT_MACHINE_PREFS.notify, loans: false, pit38: false, house: false }, quietHours: { from: '23:00', to: '05:00' }, time: '12:00', opened: false, money })
    expect(off.filter((n) => n.tag === 'radar')).toEqual([])
  })
})
