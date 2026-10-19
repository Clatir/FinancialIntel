import { describe, expect, it } from 'vitest'
import { anomalies, anomalousIds, anomalyText, type AnomalyInput } from '@shared/calc/anomalies'
import { briefing } from '@shared/calc/briefing'
import { addDays } from '@shared/calc/dates'
import { computeFleet } from '@shared/calc/fleet'
import { withKind } from '@shared/calc/kinds'
import { categoryIndex } from '@shared/calc/operations'
import { radar } from '@shared/calc/radar'
import { awaitedReturns, defaultReturn, lateReturnText, onTheWay } from '@shared/calc/returns'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { dueNotices } from '@shared/notify'
import { marksOf, matchesFilter, emptyFilter } from '@shared/operationsView'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9S000000000000000000${String(++seq).padStart(3, '0')}`
const money = (g: number) => `${(g / 100).toFixed(2)} zł`
const FUEL = defaultCategoryId(3)
const FOOD = defaultCategoryId(1)
const settings = createDefaultSettings(AT).settings
const cats = categoryIndex(settings.categories)

const bank = (key: string, counterparty: string, pending = false) => ({ format: 'mbank' as const, key, description: counterparty, counterparty, operation: '', category: '', pending, importedAt: AT })
const tx = (date: string, amount: number, counterparty: string, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, counterparty, categoryId: FUEL, ...over })
const input = (transactions: Transaction[], over: Partial<AnomalyInput> = {}): AnomalyInput => ({ transactions, today: '2026-10-20', categories: cats, orders: { impulseThreshold: zl(200) }, ...over })

/** A brand's purchases once a month for a year before, the amounts given. */
const history = (name: string, amounts: number[], category = FUEL) => amounts.map((a, i) => tx(addDays('2025-10-10', i * 30), -zl(a), name, { categoryId: category }))

describe('radar anomalii (1.9.0, F31)', () => {
  it('kwota ponad 1,5 × 90. percentyl roku u tej marki – z tym, co zwykle; mniej niż 5 zakupów wcześniej – bez oceny', () => {
    const before = history('ORLEN', [150, 160, 170, 180, 140, 150, 165, 175, 160, 170, 180, 150])
    const big = tx('2026-10-15', -zl(450), 'ORLEN')
    const list = anomalies(input([...before, big]))
    expect(list.filter((a) => a.kind === 'brand').map((a) => [a.txIds, a.amount, a.usual])).toEqual([[[big.id], zl(450), zl(180)]])
    expect(anomalyText(list.find((a) => a.kind === 'brand')!, money)).toBe('ORLEN 450.00 zł (15.10) – zwykle do 180.00 zł.')
    // 1,5 × 180 = 270: 260 is usual enough.
    expect(anomalies(input([...before, tx('2026-10-15', -zl(260), 'ORLEN')])).filter((a) => a.kind === 'brand')).toEqual([])
    expect(anomalies(input([...before.slice(-4), big])).filter((a) => a.kind === 'brand')).toEqual([])
    // A container's payment (the hold watches its price) and a member's whole purchase: no shop's.
    const fee = { ...big, containerId: nextId() }
    expect(anomalies(input([...before, fee])).filter((a) => a.kind === 'brand')).toHaveLength(1)
    expect(anomalies(input([...before, fee], { containerIds: new Set([fee.containerId!]) })).filter((a) => a.kind === 'brand')).toEqual([])
    expect(anomalies(input([...before, { ...big, memberId: nextId() }])).filter((a) => a.kind === 'brand')).toEqual([])
    // Older than 60 days: seen already.
    expect(anomalies(input([...before, big], { today: '2026-12-20' })).filter((a) => a.kind === 'brand')).toEqual([])
  })

  it('nowy kontrahent od progu dziennika – z 90 dniami historii przed nim; „to w porządku” go zdejmuje', () => {
    const old = history('ORLEN', [150, 150])
    const first = tx('2026-10-12', -zl(350), 'SKLEP ROWEROWY', { categoryId: FOOD })
    const list = anomalies(input([...old, first]))
    expect(list.filter((a) => a.kind === 'new').map((a) => [a.key, a.name])).toEqual([[`new:${first.id}`, 'SKLEP ROWEROWY']])
    expect(anomalies(input([...old, tx('2026-10-12', -zl(150), 'SKLEP ROWEROWY')])).filter((a) => a.kind === 'new')).toEqual([])
    // The second purchase there is not new; a history shorter than 90 days says nothing.
    expect(anomalies(input([...old, tx('2026-09-01', -zl(80), 'SKLEP ROWEROWY'), first])).filter((a) => a.kind === 'new')).toEqual([])
    expect(anomalies(input([tx('2026-09-01', -zl(10), 'ORLEN'), first])).filter((a) => a.kind === 'new')).toEqual([])
    expect(anomalies(input([...old, first], { ok: new Set([`new:${first.id}`]) })).filter((a) => a.kind === 'new')).toEqual([])
  })

  it('dwa obciążenia z banku tej samej marki i kwoty tego samego albo następnego dnia – do sprawdzenia; ręczny wpis i oczekujące nie', () => {
    const a = tx('2026-10-12', -zl(249), 'ALLEGRO', { bank: bank('k1', 'ALLEGRO'), categoryId: FOOD })
    const b = tx('2026-10-13', -zl(249), 'ALLEGRO', { bank: bank('k2', 'ALLEGRO'), categoryId: FOOD })
    const c = tx('2026-10-15', -zl(249), 'ALLEGRO', { bank: bank('k3', 'ALLEGRO'), categoryId: FOOD })
    const doubles = anomalies(input([a, b, c])).filter((x) => x.kind === 'double')
    expect(doubles.map((x) => x.txIds)).toEqual([[a.id, b.id]])
    expect(anomalyText(doubles[0]!, money)).toBe('Dwa obciążenia z banku: ALLEGRO 249.00 zł – możliwe podwójne pobranie (sprawdź; nie są łączone).')
    expect(anomalies(input([a, { ...b, bank: null }])).filter((x) => x.kind === 'double')).toEqual([])
    expect(anomalies(input([a, { ...b, bank: bank('k2', 'ALLEGRO', true) }])).filter((x) => x.kind === 'double')).toEqual([])
    expect(anomalies(input([a, { ...b, amount: -zl(248) }])).filter((x) => x.kind === 'double')).toEqual([])
    expect([...anomalousIds(doubles)]).toEqual([a.id, b.id])
  })

  it('kategoria ponad 2 × średnią z 3 miesięcy – raz w miesiącu; mała średnia albo krótka historia – nie', () => {
    const months = ['2026-07', '2026-08', '2026-09']
    const before = months.map((m) => tx(`${m}-10`, -zl(300), `STACJA ${m}`))
    const now = [tx('2026-10-05', -zl(400), 'STACJA A'), tx('2026-10-14', -zl(300), 'STACJA B')]
    const start = tx('2026-06-01', -zl(5), 'KIOSK', { categoryId: FOOD })
    const list = anomalies(input([start, ...before, ...now])).filter((a) => a.kind === 'category')
    expect(list.map((a) => [a.key, a.amount, a.usual])).toEqual([[`category:${FUEL}:2026-10`, zl(700), zl(300)]])
    expect(anomalyText(list[0]!, money)).toBe('Auto: 700.00 zł w tym miesiącu – 2,3× średniej z 3 miesięcy (300.00 zł).')
    expect(anomalies(input([...before, ...now])).filter((a) => a.kind === 'category')).toEqual([])
    // An average under 50 zł: 3 × 30 zł before, 100 zł now – no signal.
    const small = months.map((m) => tx(`${m}-10`, -zl(30), `STACJA ${m}`))
    expect(anomalies(input([start, ...small, tx('2026-10-05', -zl(100), 'STACJA A')])).filter((a) => a.kind === 'category')).toEqual([])
  })

  it('znacznik „nietypowa” w Operacjach (filtr) i odprawa z kluczem; powiadomienie z własnym przełącznikiem', () => {
    const a = tx('2026-10-12', -zl(249), 'ALLEGRO', { bank: bank('k1', 'ALLEGRO'), categoryId: FOOD })
    const b = tx('2026-10-13', -zl(249), 'ALLEGRO', { bank: bank('k2', 'ALLEGRO'), categoryId: FOOD })
    const list = anomalies(input([a, b]))
    const flags = { anomalies: anomalousIds(list) }
    expect(marksOf(a, settings.orders, flags)).toContain('anomaly')
    const filter = { ...emptyFilter('2026-10'), period: { kind: 'all' as const }, marks: ['anomaly' as const] }
    const ctx = { categories: cats, accounts: settings.accounts, orders: settings.orders, flags }
    expect([a, b, tx('2026-10-14', -zl(5), 'KIOSK')].filter((t) => matchesFilter(t, filter, ctx)).map((t) => t.id)).toEqual([a.id, b.id])
    const fleet = computeFleet({
      settings: { ...settings, budget: { ...settings.budget, start: '2026-10-01' } },
      balances: [balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(1000) })],
      transactions: [],
      now: '2026-10-20T12:00:00+02:00'
    })
    const brief = { fleet, containers: [], imports: [], label: () => '', money, anomalies: list }
    expect(briefing(brief).filter((i) => i.kind === 'anomaly').map((i) => [i.level, i.key])).toEqual([['yellow', `anomaly:double:${[a.id, b.id].sort().join(':')}`]])
    const notices = (on: boolean) => dueNotices({ ...brief, prefs: { ...DEFAULT_MACHINE_PREFS.notify, anomalies: on }, quietHours: { from: '23:00', to: '05:00' }, time: '12:00', opened: false }).filter((n) => n.tag === 'operations')
    expect(notices(true).map((n) => n.title)).toEqual(['Nieznany sygnał na radarze'])
    expect(notices(false)).toEqual([])
  })
})

describe('zwroty w drodze (1.9.0, F34)', () => {
  const purchase = (over: Partial<Transaction> = {}) => tx('2026-10-01', -zl(249), 'ALLEGRO', { categoryId: FOOD, awaitReturn: { amount: zl(249), until: '2026-10-15', closedAt: null }, ...over })

  it('domyślnie cała kwota za 14 dni; wpływ tej marki ±10% po zakupie zamyka zwrot sam', () => {
    expect(defaultReturn({ amount: -zl(249), date: '2026-10-01' })).toEqual({ amount: zl(249), until: '2026-10-15', closedAt: null })
    const p = purchase()
    const refund = tx('2026-10-09', zl(240), 'ALLEGRO', { categoryId: FOOD, bank: bank('z1', 'ALLEGRO') })
    const [r] = awaitedReturns([p, refund], '2026-10-10')
    expect(r).toMatchObject({ state: 'arrived', amount: zl(249) })
    expect(r!.refund?.id).toBe(refund.id)
    // Another brand, an amount off by more than 10%, a day before the purchase: not this return.
    expect(awaitedReturns([p, { ...refund, counterparty: 'AMAZON', bank: bank('z1', 'AMAZON') }], '2026-10-10')[0]!.state).toBe('waiting')
    expect(awaitedReturns([p, { ...refund, amount: zl(200) }], '2026-10-10')[0]!.state).toBe('waiting')
    expect(awaitedReturns([p, { ...refund, date: '2026-09-30' }], '2026-10-10')[0]!.state).toBe('waiting')
  })

  it('jeden wpływ – jeden zwrot (najwcześniejszy zakup); po terminie – spóźniony, z liczbą dni; zamknięty ręcznie', () => {
    const a = purchase()
    const b = purchase({ date: '2026-10-03' })
    const refund = tx('2026-10-09', zl(249), 'ALLEGRO', { categoryId: FOOD })
    const list = awaitedReturns([b, a, refund], '2026-10-20')
    expect(list.map((r) => [r.tx.id, r.state, r.days])).toEqual([
      [a.id, 'arrived', 0],
      [b.id, 'late', 5]
    ])
    expect(lateReturnText(list[1]!, money)).toBe('ALLEGRO: 249.00 zł zwrotu nie dotarło od 5 dni (termin 15.10, zakup 03.10).')
    expect(onTheWay(list).map((r) => r.tx.id)).toEqual([b.id])
    expect(awaitedReturns([purchase({ awaitReturn: { amount: zl(249), until: '2026-10-15', closedAt: AT } })], '2026-10-20')[0]!.state).toBe('closed')
    // Waiting: the days left; its own day – still on the way.
    expect(awaitedReturns([a], '2026-10-10')[0]).toMatchObject({ state: 'waiting', days: 5 })
    expect(awaitedReturns([a], '2026-10-15')[0]).toMatchObject({ state: 'waiting', days: 0 })
    // Closed, and its money came after all: arrived.
    const closed = purchase({ awaitReturn: { amount: zl(249), until: '2026-10-15', closedAt: AT } })
    expect(awaitedReturns([closed, refund], '2026-10-20')[0]!.state).toBe('arrived')
    // Turned into money coming in: no return awaited – never its own.
    expect(awaitedReturns([{ ...a, amount: zl(249) }], '2026-10-10')).toEqual([])
  })

  it('Radar: oczekiwany wpływ bez konta (salda kont na nim nie liczą); odprawa i powiadomienie przy spóźnionym; znacznik i inny rodzaj', () => {
    const late = purchase()
    const waiting = purchase({ date: '2026-10-18', awaitReturn: { amount: zl(99), until: '2026-11-01', closedAt: null } })
    const list = awaitedReturns([late, waiting], '2026-10-20')
    const items = radar({ today: '2026-10-20', plans: [], containers: [], tanks: [], loans: [], money, returns: list }).filter((i) => i.kind === 'return')
    expect(items.map((i) => [i.date, i.amount, i.direction, i.overdue ?? false, i.accountId])).toEqual([
      ['2026-10-20', zl(249), 'in', true, undefined],
      ['2026-11-01', zl(99), 'in', false, undefined]
    ])
    const fleet = computeFleet({
      settings: { ...settings, budget: { ...settings.budget, start: '2026-10-01' } },
      balances: [balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(1000) })],
      transactions: [late, waiting],
      now: '2026-10-20T12:00:00+02:00'
    })
    const brief = { fleet, containers: [], imports: [], label: () => '', money, returns: list }
    expect(briefing(brief).filter((i) => i.kind === 'return').map((i) => [i.level, i.key])).toEqual([['yellow', `return:${late.id}:2026-10-15`]])
    const notices = dueNotices({ ...brief, prefs: DEFAULT_MACHINE_PREFS.notify, quietHours: { from: '23:00', to: '05:00' }, time: '12:00', opened: false }).filter((n) => n.tag === 'operations')
    expect(notices.map((n) => [n.title, n.target])).toEqual([['Zwrot nie dotarł', `return:${late.id}`]])
    expect(marksOf(late, settings.orders, { awaiting: new Set(onTheWay(list).map((r) => r.tx.id)) })).toContain('awaiting')
    // Another kind: no return awaited.
    expect(withKind(late, 'income').awaitReturn).toBeUndefined()
  })
})
