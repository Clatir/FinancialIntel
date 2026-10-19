import { describe, expect, it } from 'vitest'
import { briefing, dailyBias } from '@shared/calc/briefing'
import { computeFleet, envelopeOverrun, layersSum, startMonthSpentOf, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { goalInflow } from '@shared/calc/goals'
import { nextWeekEnvelopes } from '@shared/calc/intel'
import { loanStates } from '@shared/calc/loans'
import { costsByMonth, debriefing, transactionsOfMonth } from '@shared/calc/plan'
import { radar } from '@shared/calc/radar'
import { openingFromNow } from '@shared/calc/start'
import type { FleetEvent } from '@shared/calc/fleet'
import { createDefaultSettings } from '@shared/defaults'
import { monthRows, monthsCsv } from '@shared/export/budget'
import { rangeGapText, rangeText } from '@shared/format'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { dueNotices } from '@shared/notify'
import { newestOperations } from '@shared/operationsView'
import {
  balanceSchema,
  defaultCategoryId,
  loanSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  type Loan,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5M00000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })

// Daily: Jedzenie (1), Rozrywka (6); planned: Dom (2), Auto (3), Prezenty (9).
const FOOD = defaultCategoryId(1)
const HOME = defaultCategoryId(2)
const AUTO = defaultCategoryId(3)
const FUN = defaultCategoryId(6)
const GIFTS = defaultCategoryId(9)
const sub = (main: number) => defaultCategoryId(main, 1)

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const spend = (date: string, v: number, categoryId: string | null, over: Partial<Transaction> = {}) => tx(date, -zl(v), { categoryId, ...over })
const plan = (month: string, salary: number, envelopes: Record<string, number> = {}) => monthPlanSchema.parse({ ...base(), month, salary, envelopes })
const opening = (date: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount })
const loan = (over: Partial<Loan> & Pick<Loan, 'direction' | 'amount'>): Loan => loanSchema.parse({ ...base(), name: 'Pożyczka', date: '2026-09-01', ...over })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`

function settingsWith(over: { budget?: Partial<Settings['budget']>; layers?: Partial<Settings['layers']>; orders?: Partial<Settings['orders']>; game?: Partial<Settings['game']> } = {}): Settings {
  const s = createDefaultSettings(AT).settings
  return {
    ...s,
    budget: { ...s.budget, ...over.budget },
    layers: { ...s.layers, ...over.layers },
    orders: { ...s.orders, ...over.orders },
    game: { ...s.game, ...over.game }
  }
}

function fleet(input: Partial<FleetInput> & { now: string }): FleetState {
  const state = computeFleet({ settings: settingsWith(), transactions: [], ...input })
  if (state.started) expect(layersSum(state)).toBe(state.total)
  return state
}

const categories = settingsWith().categories

describe('liczby, plan, raporty (1.6.1, grupa M)', () => {
  it('debriefing: koperty tylko z planu (także 0 zł), wydatki bez koperty osobno, pula dzienna jak energia; „na plus” dopiero po końcu miesiąca', () => {
    const plans = [plan('2026-10', zl(3000), { [FOOD]: zl(1500), [AUTO]: zl(300), [GIFTS]: 0 })]
    const transactions = [
      spend('2026-10-05', 1000, sub(1)),
      spend('2026-10-06', 200, sub(6)),
      spend('2026-10-07', 400, sub(2)),
      spend('2026-10-08', 50, sub(9)),
      spend('2026-10-09', 30, null)
    ]
    const running = debriefing('2026-10', { transactions, categories, plans, today: '2026-10-20' })
    expect(running.ended).toBe(false)
    // Never „na plus” before the month's end (N65): the rest of it may still take the energy.
    expect(running.plus).toBeNull()
    expect(running.envelopes.map((e) => [e.categoryId, e.kind, e.limit, e.spent, e.gap])).toEqual([
      [FOOD, 'daily', zl(1500), zl(1000), zl(500)],
      [AUTO, 'planned', zl(300), 0, zl(300)],
      // 0 zł is a limit too (N102: „nic na prezenty”).
      [GIFTS, 'planned', 0, zl(50), -zl(50)]
    ])
    // No envelope = no limit to be over (N25, N54, N101): apart, the most first.
    expect(running.outside).toEqual([
      { categoryId: HOME, spent: zl(400) },
      { categoryId: FUN, spent: zl(200) }
    ])
    // The daily pool as the engine's daily energy: Rozrywka without an envelope and the operations without a category too.
    expect(running.daily).toEqual({ limit: zl(1500), extra: 0, spent: zl(1230), gap: zl(270) })
    const ended = debriefing('2026-10', { transactions, categories, plans, today: '2026-11-02' })
    expect([ended.ended, ended.plus, ended.costs]).toEqual([true, true, zl(1680)])
    // The export says the month still runs (N65).
    const rows = monthRows({ transactions, categories, plans, log: [], today: '2026-10-20' }, ['2026-10'])
    expect(rows[0]).toMatchObject({ plus: null, inProgress: true })
    expect(monthsCsv(rows).split('\r\n')[1]).toBe('2026-10;3000,00;1680,00;0,00;w toku;')
  })

  it('łupy tylko z miesiąca, który silnik przeszedł do końca (B92); indeksy po miesiącach (W30, W38)', () => {
    const plans = [plan('2026-10', zl(3000), { [FOOD]: zl(1500) })]
    const transactions = [spend('2026-10-05', 1000, sub(1)), spend('2026-11-05', 100, sub(1))]
    const settings = settingsWith({ budget: { start: '2026-10-01' } })
    const balances = [opening('2026-10-01', zl(20000))]
    const run = fleet({ settings, balances, months: plans, transactions, now: '2026-11-03T12:00:00+01:00' })
    const october = debriefing('2026-10', { transactions, categories, plans, log: run.log, alarms: run.alarms, today: '2026-11-03' })
    expect(october.loot).not.toBeNull()
    expect(october.loot).toBe(run.log.find((e) => e.kind === 'month-end' && e.date === '2026-11-01')!.amount)
    // A budget started in November: its log never saw October's end – no loot of a month before the start.
    const later = fleet({ settings: settingsWith({ budget: { start: '2026-11-01' } }), balances: [opening('2026-11-01', zl(20000))], months: plans, transactions, now: '2026-11-03T12:00:00+01:00' })
    expect(debriefing('2026-10', { transactions, categories, plans, log: later.log, alarms: later.alarms, today: '2026-11-03' }).loot).toBeNull()
    // Without a log (the game) as before: the month's end decides.
    expect(debriefing('2026-10', { transactions, categories, plans, today: '2026-11-03' }).loot).toBe(0)
    // One index per list: the same array of a month every time, a new list – a new index.
    expect(transactionsOfMonth(transactions, '2026-10')).toBe(transactionsOfMonth(transactions, '2026-10'))
    expect(transactionsOfMonth(transactions, '2026-10').map((t) => t.date)).toEqual(['2026-10-05'])
    expect(transactionsOfMonth(transactions, '2026-12')).toEqual([])
    expect(costsByMonth(transactions)).toBe(costsByMonth(transactions))
    expect([...costsByMonth([...transactions])]).toEqual([['2026-10', zl(1000)], ['2026-11', zl(100)]])
  })

  it('przekroczenie koperty: jedna reguła silnika, gry i powiadomień – próg Dowództwa, limit 0 bez „poważnego” (N102)', () => {
    expect(envelopeOverrun({ limit: zl(100), spent: zl(100) }, 20)).toEqual({ over: false, serious: false })
    expect(envelopeOverrun({ limit: zl(100), spent: zl(120) }, 20)).toEqual({ over: true, serious: false })
    expect(envelopeOverrun({ limit: zl(100), spent: zl(120) + 1 }, 20)).toEqual({ over: true, serious: true })
    expect(envelopeOverrun({ limit: 0, spent: zl(50) }, 20)).toEqual({ over: true, serious: false })
    // The engine's alarm by the game's threshold: 130 of 100 is yellow at 50%, red at 10%.
    const at = (pct: number) =>
      fleet({
        settings: settingsWith({ budget: { start: '2026-10-01' }, game: { seriousEnvelopePct: pct } }),
        balances: [opening('2026-10-01', zl(20000))],
        months: [plan('2026-10', zl(3000), { [FOOD]: zl(1500), [AUTO]: zl(100) })],
        transactions: [spend('2026-10-05', 130, sub(3))],
        now: '2026-10-14T12:00:00+02:00'
      }).alarms.find((a) => a.kind === 'envelope-over')?.level
    expect(at(50)).toBe('yellow')
    expect(at(10)).toBe('red')
    // The notification by the same rule: „ponad próg” only above the game's threshold.
    const f = fleet({
      settings: settingsWith({ budget: { start: '2026-10-01' } }),
      balances: [opening('2026-10-01', zl(20000))],
      months: [plan('2026-10', zl(3000), { [FOOD]: zl(1500), [AUTO]: zl(100) })],
      transactions: [spend('2026-10-05', 130, sub(3))],
      now: '2026-10-14T12:00:00+02:00'
    })
    const body = (seriousPct: number) =>
      dueNotices({
        fleet: f,
        containers: [],
        imports: [{ name: 'mBank', last: `${f.today}T08:00:00.000Z` }],
        lastConfirmation: f.today,
        label: () => 'Auto',
        prefs: DEFAULT_MACHINE_PREFS.notify,
        quietHours: { from: '23:00', to: '05:00' },
        time: '12:00',
        opened: false,
        money,
        seriousPct
      }).find((x) => x.key === `overrun:${AUTO}:2026-10`)?.body
    expect(body(10)).toBe('Wydane 130.00 zł z 100.00 zł – ponad próg poważnego naruszenia.')
    expect(body(50)).toBe('Wydane 130.00 zł z 100.00 zł.')
  })

  it('koperta codzienna ponad podział: łagodne powiadomienie bez alarmu, Daily Bias patrzy tylko na planowe; limit 0 powiadamia (N102)', () => {
    const f = fleet({
      settings: settingsWith({ budget: { start: '2026-10-01' } }),
      balances: [opening('2026-10-01', zl(20000))],
      months: [plan('2026-10', zl(3100), { [FOOD]: zl(100), [FUN]: zl(3000), [GIFTS]: 0 })],
      transactions: [spend('2026-10-05', 150, sub(1)), spend('2026-10-06', 20, sub(9))],
      now: '2026-10-14T12:00:00+02:00'
    })
    const n = dueNotices({
      fleet: f,
      containers: [],
      imports: [{ name: 'mBank', last: `${f.today}T08:00:00.000Z` }],
      lastConfirmation: f.today,
      label: (id: string) => (id === FOOD ? 'Jedzenie' : id === GIFTS ? 'Prezenty' : 'Inne'),
      prefs: DEFAULT_MACHINE_PREFS.notify,
      quietHours: { from: '23:00', to: '05:00' },
      time: '12:00',
      opened: false,
      money
    }).filter((x) => x.tag === 'overrun')
    expect(n.map((x) => [x.key, x.title, x.alarm ?? false])).toEqual([
      [`overrun:${FOOD}:2026-10`, 'Koperta Jedzenie ponad podział', false],
      [`overrun:${GIFTS}:2026-10`, 'Koperta Prezenty przekroczona', true]
    ])
    // Daily Bias: the daily envelope over its part is no reason against Bullish; a planned one is.
    const bias = (envelopes: FleetState['envelopes']) => dailyBias({ ...f, envelopes, daily: { ...f.daily!, left: f.daily!.base } })
    expect(bias(f.envelopes.filter((e) => e.kind === 'daily'))).toBe('bullish')
    expect(bias(f.envelopes)).toBe('neutral')
  })

  it('minimalne osłony nigdy ponad cel osłon (B84)', () => {
    const f = fleet({
      settings: settingsWith({ budget: { start: '2026-10-01' }, layers: { shieldSalaries: 2 }, orders: { minShieldSalaries: 3 } }),
      balances: [opening('2026-10-01', zl(20000))],
      months: [plan('2026-10', zl(3000))],
      now: '2026-10-14T12:00:00+02:00'
    })
    expect(f.shields.min).toBe(zl(6000))
  })

  it('wydane w miesiącu startu przed startem: zwrot pomniejsza zakup, opłata okresowa nie, nigdy poniżej zera (B126)', () => {
    const fee = nextId()
    const periodic = new Set([fee])
    const isPeriodic = (t: Transaction) => !!t.containerId && periodic.has(t.containerId)
    const txs = [
      spend('2026-10-02', 300, sub(1)),
      tx('2026-10-03', zl(100), { categoryId: sub(1) }),
      spend('2026-10-04', 500, sub(2), { containerId: fee }),
      spend('2026-10-10', 999, sub(1)),
      spend('2026-09-30', 70, sub(1))
    ]
    expect(startMonthSpentOf(txs, '2026-10-05', isPeriodic)).toBe(zl(200))
    expect(startMonthSpentOf([tx('2026-10-03', zl(100), { categoryId: sub(1) })], '2026-10-05', isPeriodic)).toBe(0)
  })

  it('saldo otwarcia z salda teraz: operacja z datą w przyszłości nie jest w saldzie banku (B127)', () => {
    const txs = [tx('2026-10-19', -zl(50)), tx('2026-10-25', -zl(800)), tx('2026-10-18', -zl(10))]
    expect(openingFromNow(MBANK_ACCOUNT_ID, zl(1000), '2026-10-19', txs)).toBe(zl(1050))
  })

  it('tempo celów: bez środków na start, konta dołączonego później i depozytu domowników (B128)', () => {
    const ev = (kind: FleetEvent['kind'], date: string, goals: number): FleetEvent => ({ kind, date, amount: goals, moves: { goals: { G: goals } } }) as FleetEvent
    const log = [ev('start', '2026-07-01', zl(5000)), ev('account', '2026-08-03', zl(900)), ev('household', '2026-08-05', zl(300)), ev('trading', '2026-08-10', zl(600)), ev('loot', '2026-09-02', zl(300))]
    expect(goalInflow(log, '2026-07-01', '2026-10')).toBe(zl(300))
  })

  it('plan na tydzień w ostatnim dniu miesiąca: nic – jutro koperty od nowa (B65)', () => {
    const envelopes = [{ categoryId: AUTO, limit: zl(300), spent: zl(100) }]
    expect(nextWeekEnvelopes(envelopes, '2026-10-31')).toEqual([])
    expect(nextWeekEnvelopes(envelopes, '2026-10-30')).toEqual([{ categoryId: AUTO, week: zl(200), left: zl(200), days: 1 }])
  })

  it('zasięg obcięty w dół, „brakuje” w górę i co najmniej 0,1 (N56)', () => {
    expect(rangeText(11.96)).toBe('11,9 mies.')
    expect(rangeText(2.96)).toBe('2,9 mies.')
    expect(rangeText(3)).toBe('3,0 mies.')
    expect(rangeText(null)).toBe('—')
    expect(rangeGapText(12 - 11.96)).toBe('0,1 mies.')
    expect(rangeGapText(0.12)).toBe('0,2 mies.')
    expect(rangeGapText(0.1)).toBe('0,1 mies.')
    expect(rangeGapText(2)).toBe('2,0 mies.')
  })

  it('ostatnie operacje Mostka: najnowsze n w jednym przejściu, jak sortowanie stabilne (W29)', () => {
    let r = 7
    const rand = () => (r = (r * 48271) % 2147483647) / 2147483647
    const list = Array.from({ length: 300 }, (_, i) => ({ i, date: `2026-10-${String(1 + Math.floor(rand() * 20)).padStart(2, '0')}`, createdAt: `2026-10-01T0${Math.floor(rand() * 3)}:00:00.000Z` }))
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    expect(newestOperations(list, 10)).toEqual(sorted.slice(0, 10))
    expect(newestOperations(list.slice(0, 4), 10)).toEqual(sorted.filter((x) => x.i < 4))
    expect(newestOperations(list, 0)).toEqual([])
  })

  it('odprawa: każda dopłata do XTB wbrew firewallowi osobno (N103)', () => {
    const f = fleet({
      settings: settingsWith({ budget: { start: '2026-10-01', initial: { shields: zl(1000), hull: 0, goals: {} } }, layers: { assumedCosts: zl(3000) } }),
      balances: [opening('2026-10-01', zl(1000))],
      months: [plan('2026-10', zl(3000))],
      transactions: [tx('2026-10-10', -zl(500), { kind: 'trading', counterparty: 'xtb.com' }), tx('2026-10-11', -zl(1000), { kind: 'trading', counterparty: 'xtb.com' })],
      now: '2026-10-12T12:00:00+02:00'
    })
    expect(f.alarms.filter((a) => a.kind === 'firewall')).toHaveLength(2)
    const lines = briefing({ fleet: f, containers: [], imports: [], lastConfirmation: f.today, label: () => '' }).filter((i) => i.key.startsWith('alarm:firewall'))
    expect(lines).toHaveLength(2)
  })

  it('Radar: rata po terminie – dni po terminie, „zaległa” od 3 dni jak w odprawie (N59)', () => {
    const taken = loan({ name: 'Bank', direction: 'taken', amount: zl(900), counterparty: 'Bank', schedule: [{ id: nextId(), date: '2027-01-10', amount: zl(300) }, { id: nextId(), date: '2027-01-12', amount: zl(300) }, { id: nextId(), date: '2027-01-14', amount: zl(300) }] })
    const got = tx('2027-01-01', zl(900), { kind: 'loan', loanId: taken.id })
    const items = radar({ today: '2027-01-13', plans: [], containers: [], tanks: [], loans: loanStates([taken], [got], [], '2027-01-13'), money, days: 10 }).filter((i) => i.ref === taken.id)
    expect(items.map((i) => [i.date, i.note, i.overdue ?? false])).toEqual([
      ['2027-01-10', 'zaległa rata', true],
      ['2027-01-12', 'po terminie 1 dzień', false],
      ['2027-01-14', 'Bank', false]
    ])
  })
})
