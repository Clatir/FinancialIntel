import { describe, expect, it } from 'vitest'
import { briefing } from '@shared/calc/briefing'
import { cargoStatuses, type CargoInput } from '@shared/calc/cargoStatus'
import { computeFleet } from '@shared/calc/fleet'
import { radar } from '@shared/calc/radar'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { dueNotices } from '@shared/notify'
import { balanceSchema, containerSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Container, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K3000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const container = (over: Partial<Container> = {}): Container => containerSchema.parse({ ...base(), name: 'Czynsz', amount: zl(2000), dueMonth: '2026-01', dueDay: 1, ...over })
const pay = (c: Container, date: string, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ ...base(), date, accountId: XTB_WALLET_ACCOUNT_ID, amount: -c.amount, containerId: c.id, ...over })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`
const input = (over: Partial<CargoInput>): CargoInput => ({ containers: [], transactions: [], today: '2026-10-15', tanks: [], coveredTo: {}, ...over })
/** A rent paid on the 10th of each month April – September. */
const rentHistory = (c: Container) => ['04', '05', '06', '07', '08', '09'].map((m) => pay(c, `2026-${m}-10`))

describe('opłaty stałe w miesiącu (F1, D86)', () => {
  it('termin z dnia płatności w historii; przed terminem i 2 dni po nim – czeka, 3 dni po nim – po terminie; płatność – zapłacone', () => {
    const c = container({ dueDay: 1 })
    const history = rentHistory(c)
    const at = (today: string, transactions = history) => cargoStatuses(input({ containers: [c], transactions, today }))[0]!
    expect(at('2026-10-05')).toMatchObject({ day: 10, dayFrom: 'history', due: '2026-10-10', state: 'waiting', importPending: false, paid: 0 })
    expect(at('2026-10-12').state).toBe('waiting')
    expect(at('2026-10-13').state).toBe('overdue')
    const paid = at('2026-10-13', [...history, pay(c, '2026-10-11')])
    expect(paid).toMatchObject({ state: 'paid', paid: zl(2000) })
    expect(paid.payments.map((p) => p.date)).toEqual(['2026-10-11'])
  })

  it('bez historii – dzień płatności kontenera (ucięty do miesiąca); zapłacone przed terminem z końca poprzedniego miesiąca', () => {
    const c = container({ dueDay: 31 })
    expect(cargoStatuses(input({ containers: [c], today: '2026-11-03' }))[0]).toMatchObject({ day: 31, dayFrom: 'set', due: '2026-11-30', state: 'waiting' })
    // Due on the 1st (its history), paid on 29 September: October's.
    const first = container({ dueDay: 1 })
    const history = ['05', '06', '07', '08', '09'].map((m) => pay(first, `2026-${m}-01`))
    const s = cargoStatuses(input({ containers: [first], transactions: [...history, pay(first, '2026-09-29')], today: '2026-10-05' }))[0]!
    expect(s).toMatchObject({ day: 1, dayFrom: 'history', due: '2026-10-01', state: 'paid' })
    expect(s.payments.map((p) => p.date)).toEqual(['2026-09-29'])
    // This month's payment is no history of its own: the container's day.
    const set = container({ dueDay: 1 })
    expect(cargoStatuses(input({ containers: [set], transactions: [pay(set, '2026-11-01')], today: '2026-11-05' }))[0]).toMatchObject({ dayFrom: 'set', due: '2026-11-01', state: 'paid' })
  })

  it('konto z importem: dopóki pliki banku nie obejmą 3 dni po terminie – czeka na import, potem po terminie', () => {
    const c = container({ accountId: MBANK_ACCOUNT_ID, dueDay: 10 })
    const bankRow = transactionSchema.parse({ ...base(), date: '2026-10-11', accountId: MBANK_ACCOUNT_ID, amount: -zl(10), bank: { format: 'mbank', key: 'k1', description: 'x', counterparty: 'x', operation: '', category: '', pending: false, importedAt: AT } })
    const at = (coveredTo: Record<string, string>) => cargoStatuses(input({ containers: [c], transactions: [bankRow], today: '2026-10-20', coveredTo }))[0]!
    expect(at({})).toMatchObject({ state: 'waiting', importPending: true })
    expect(at({ [MBANK_ACCOUNT_ID]: '2026-10-11' })).toMatchObject({ state: 'waiting', importPending: true })
    expect(at({ [MBANK_ACCOUNT_ID]: '2026-10-12' })).toMatchObject({ state: 'overdue', importPending: false })
  })

  it('opłata okresowa tylko w miesiącu terminu, zapłacona według zbiornika silnika; zarchiwizowany, rata pożyczki i spoza życia – bez stanu', () => {
    const oc = container({ name: 'OC', amount: zl(1200), cycleMonths: 12, dueMonth: '2026-10', dueDay: 5 })
    const later = container({ name: 'Przegląd', cycleMonths: 12, dueMonth: '2026-12', dueDay: 5 })
    const archived = container({ name: 'Stary', archived: true })
    const loanRate = container({ name: 'Rata', loanId: nextId() })
    const future = container({ name: 'Od grudnia', from: '2026-12' })
    const all = [oc, later, archived, loanRate, future]
    expect(cargoStatuses(input({ containers: all, today: '2026-10-15' })).map((s) => [s.name, s.state])).toEqual([['OC', 'overdue']])
    const tanks = [{ containerId: oc.id, name: 'OC', amount: 0, dueMonth: '2027-10', paidDue: '2026-10', due: zl(1200) }]
    expect(cargoStatuses(input({ containers: all, today: '2026-10-15', tanks }))[0]!.state).toBe('paid')
  })

  it('odprawa i powiadomienie tylko przy „po terminie” (raz na termin), wyłączane; Radar – opłaty miesięczne w każdym miesiącu, ta zaległa też', () => {
    const rent = container({ name: 'Czynsz', dueDay: 1 })
    const netflix = container({ name: 'Netflix', amount: zl(60), dueDay: 25 })
    const oc = container({ name: 'OC', amount: zl(1200), cycleMonths: 12, dueMonth: '2026-10', dueDay: 5 })
    const transactions = rentHistory(rent)
    const today = '2026-10-15'
    const cargo = cargoStatuses(input({ containers: [rent, netflix, oc], transactions, today }))
    expect(cargo.map((s) => [s.name, s.state])).toEqual([
      ['OC', 'overdue'],
      ['Czynsz', 'overdue'],
      ['Netflix', 'waiting']
    ])
    const s0 = createDefaultSettings(AT).settings
    const settings: Settings = { ...s0, budget: { ...s0.budget, start: '2026-01-01' } }
    const fleet = computeFleet({ settings, balances: [balanceSchema.parse({ ...base(), date: '2026-01-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(9000) })], transactions, containers: [rent, netflix, oc], now: '2026-10-15T12:00:00+02:00' })
    const items = briefing({ fleet, containers: [rent, netflix, oc], imports: [], lastConfirmation: today, label: () => '', cargo, money })
    const alerts = items.filter((i) => i.kind === 'cargo')
    expect(alerts.map((i) => [i.key, i.level])).toEqual([
      [`cargo:${oc.id}:2026-10-05`, 'yellow'],
      [`cargo:${rent.id}:2026-10-10`, 'yellow']
    ])
    expect(alerts[1]!.text).toBe('Kontener niezaładowany: Czynsz 2000.00 zł – termin 10.10 minął, brak płatności.')
    const notices = (cargoOn: boolean) =>
      dueNotices({ fleet, containers: [rent, netflix, oc], imports: [], lastConfirmation: today, label: () => '', prefs: { ...DEFAULT_MACHINE_PREFS.notify, cargo: cargoOn }, quietHours: { from: '23:00', to: '06:00' }, time: '12:00', opened: false, money, cargo }).filter((n) => n.tag === 'cargo')
    expect(notices(true).map((n) => [n.key, n.title])).toEqual(alerts.map((i) => [i.key, 'Kontener niezaładowany']))
    expect(notices(false)).toEqual([])

    const r = radar({ today, plans: [], containers: [rent, netflix, oc], tanks: fleet.tanks, loans: [], money, cargo, days: 50 })
    expect(r.filter((i) => i.kind === 'fixed' || i.kind === 'asteroid').map((i) => [i.date, i.kind, i.name, i.overdue ?? false])).toEqual([
      ['2026-10-05', 'asteroid', 'OC', true],
      ['2026-10-10', 'fixed', 'Czynsz', true],
      ['2026-10-25', 'fixed', 'Netflix', false],
      ['2026-11-10', 'fixed', 'Czynsz', false],
      ['2026-11-25', 'fixed', 'Netflix', false]
    ])
    // Paid this month: only the months ahead.
    const paid = cargoStatuses(input({ containers: [rent], transactions: [...transactions, pay(rent, '2026-10-10')], today }))
    expect(radar({ today, plans: [], containers: [rent], tanks: [], loans: [], money, cargo: paid, days: 50 }).map((i) => i.date)).toEqual(['2026-11-10'])
  })
})
