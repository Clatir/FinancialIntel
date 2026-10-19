import { describe, expect, it } from 'vitest'
import { doubleCorrections } from '@shared/calc/balances'
import { asPayout, deliveries, preStartTaxOf, type DeliveriesInput } from '@shared/calc/dock'
import { computeFleet, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { advanceGame, chooseMission, gameView, missionId, missionStatus, newGameMonth, rankChangeId, rateDay, type GameInput } from '@shared/calc/game'
import { goalEtas, goalInflow, goalLate, goalPace } from '@shared/calc/goals'
import { incomeParts, taxOfDockings } from '@shared/calc/income'
import type { FleetEvent } from '@shared/calc/fleet'
import { createDefaultSettings } from '@shared/defaults'
import type { IctjEntry } from '@shared/ictj'
import {
  balanceSchema,
  containerSchema,
  defaultCategoryId,
  dockingSchema,
  goalSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
  type Docking,
  type GameDay,
  type GameMonth,
  type Goal,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K6N00000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const AUTO = defaultCategoryId(3)

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const entry = (date: string, amount: number, pool: IctjEntry['pool'], kind: IctjEntry['kind'] = 'withdrawal'): IctjEntry => ({ id: nextId(), kind, date, amount, pool, note: '', updatedAt: null })
const docking = (t: Transaction, over: Partial<Docking> = {}): Docking => dockingSchema.parse({ ...base(), date: t.date, transactionId: t.id, ...over })
const goal = (name: string, target: number, priority: number, over: Partial<Goal> = {}): Goal => goalSchema.parse({ ...base(), name, target, priority, ...over })
const day = (over: Partial<GameDay> = {}): GameDay => ({ status: 'ok', frozenAt: AT, violations: [], cls: null, cargo: null, tags: [], ...over })
const monthWith = (month: string, days: Record<string, GameDay>, over: Partial<GameMonth> = {}): GameMonth => ({ ...newGameMonth(month, AT), days, ...over })

const deliveriesOf = (o: Partial<DeliveriesInput> & Pick<DeliveriesInput, 'entries' | 'transactions'>) =>
  deliveries({ dockings: [], start: '2026-10-01', today: '2026-10-20', skipped: [], ictjOn: true, coveredTo: '2026-10-19', ...o })

function settingsWith(over: { budget?: Partial<Settings['budget']>; game?: Partial<Settings['game']> } = {}): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, ...over.budget }, game: { ...s.game, ...over.game } }
}

function fleet(input: Partial<FleetInput> & { now: string }): FleetState {
  const state = computeFleet({ settings: settingsWith(), transactions: [], ...input })
  if (state.started) expect(layersSum(state)).toBe(state.total)
  return state
}

/** October 2026 as in the game's tests: the budget from the 1st, a salary of 3 100 zł, the game from Monday the 5th. */
function world(o: { transactions?: Transaction[]; game?: GameMonth[]; containers?: GameInput['containers'] } = {}): GameInput {
  const s = settingsWith({ budget: { start: '2026-10-01' }, game: { start: '2026-10-05' } })
  return {
    settings: { ...s, layers: { ...s.layers, assumedCosts: zl(3000) } },
    balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(3100), envelopes: { [FOOD]: zl(3100), [AUTO]: zl(500) } })],
    transactions: o.transactions ?? [],
    containers: o.containers ?? [],
    dockings: [],
    game: o.game ?? []
  }
}

describe('ICTTJ i dokowanie (1.6.2, grupa N)', () => {
  it('pula Podatek z podziałem zmienionym w oknie: podatkiem jest tylko część z podziału (B70)', () => {
    const t = tx('2026-10-10', zl(1000), { kind: 'trading' })
    const split = { shields: zl(600), hull: 0, goals: {}, taxHold: zl(400) }
    expect(taxOfDockings(new Map([[t.id, { pool: 'tax', split }]]), [t]).get(t.id)).toBe(zl(400))
    expect(taxOfDockings(new Map([[t.id, { pool: 'tax', split: null }]]), [t]).get(t.id)).toBe(zl(1000))
  })

  it('wypłata z puli Podatek sprzed startu budżetu nie jest przychodem z tradingu (N38)', () => {
    const before = tx('2026-08-11', zl(9000), { kind: 'trading', counterparty: 'XTB' })
    const other = tx('2026-08-20', zl(500), { kind: 'trading', counterparty: 'XTB' })
    const map = preStartTaxOf({ entries: [entry('2026-08-10', zl(9000), 'tax'), entry('2026-08-20', zl(500), 'current')], transactions: [before, other], dockings: [], start: '2026-10-01', skipped: [] })
    expect([...map]).toEqual([[before.id, zl(9000)]])
    const input = { settings: settingsWith({ budget: { start: '2026-10-01' } }), balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })], transactions: [before, other], now: '2026-10-20T12:00:00+02:00' }
    const plain = fleet(input)
    const told = fleet({ ...input, preStartTax: map })
    expect(incomeParts(before, plain.incomeContext).trading).toBe(zl(9000))
    expect(incomeParts(before, told.incomeContext).trading).toBe(0)
    expect(incomeParts(other, told.incomeContext).trading).toBe(zl(500))
  })

  it('wpływ wpisany na Portfelu XTB szybkim wpisem jest parą wypłaty – bez drugiej operacji; operacja z banku pierwsza (B69)', () => {
    const e = entry('2026-10-10', zl(800), 'tax')
    const typed = tx('2026-10-10', zl(800), { kind: 'income', accountId: XTB_WALLET_ACCOUNT_ID, counterparty: 'XTB', categoryId: null })
    const [d] = deliveriesOf({ entries: [e], transactions: [typed] })
    expect(d).toMatchObject({ key: `ictj:${e.id}`, state: 'pending', walletTyped: true, wallet: false })
    expect(d!.transaction?.id).toBe(typed.id)
    expect(asPayout(typed)).toMatchObject({ id: typed.id, kind: 'trading', categoryId: null, counterparty: 'XTB' })
    // Without its entry it stays an ordinary income – nothing to dock, never „without an entry in ICTTJ”.
    expect(deliveriesOf({ entries: [], transactions: [typed] })).toEqual([])
    // The bank's operation of the same amount pairs first.
    const bank = tx('2026-10-11', zl(800), { kind: 'trading', counterparty: 'XTB' })
    const both = deliveriesOf({ entries: [e], transactions: [typed, bank] })
    expect(both.find((x) => x.entry)!.transaction?.id).toBe(bank.id)
    // A member's money on the wallet is no payout.
    expect(asPayout({ ...typed, memberId: nextId() }).kind).toBe('income')
  })

  it('pominięty wpis nie zabiera pary wpisowi do zadokowania tej samej kwoty (N45)', () => {
    const skipped = entry('2026-10-10', zl(1200), 'current')
    const other = entry('2026-10-12', zl(1200), 'current')
    const bank = tx('2026-10-12', zl(1200), { kind: 'trading', counterparty: 'XTB' })
    const list = deliveriesOf({ entries: [skipped, other], transactions: [bank], skipped: [skipped.id] })
    expect(Object.fromEntries(list.map((d) => [d.key, [d.state, d.transaction?.id ?? null]]))).toEqual({
      [`ictj:${skipped.id}`]: ['skipped', null],
      [`ictj:${other.id}`]: ['pending', bank.id]
    })
  })

  it('pominięty wpis z parą w banku trzyma swoją operację – wpływ nie wraca jako „bez wpisu w ICTTJ” (N45)', () => {
    const e = entry('2026-10-10', zl(1200), 'current')
    const bank = tx('2026-10-12', zl(1200), { kind: 'trading', counterparty: 'XTB' })
    const list = deliveriesOf({ entries: [e], transactions: [bank], skipped: [e.id] })
    expect(list.map((d) => [d.key, d.state, d.transaction?.id ?? null])).toEqual([[`ictj:${e.id}`, 'skipped', bank.id]])
    expect(list.some((d) => d.missingEntry)).toBe(false)
  })
})

describe('cele (1.6.2, grupa N)', () => {
  it('ETA: wypłaty z puli Cele najpierw do celów ICTTJ, reszta w kolejności listy (N42)', () => {
    const goals = [
      { id: 'A', amount: 0, target: zl(2000), ictj: false },
      { id: 'B', amount: 0, target: zl(5000), ictj: true }
    ]
    // All the pace from the pool Cele: the ICTTJ goal fills first, whatever the list's order.
    expect(goalEtas(goals, { pool: zl(1000), rest: 0 }, '2026-10')).toEqual({ A: '2027-05', B: '2027-03' })
    // The ordinary pace keeps the list's order.
    expect(goalEtas(goals, zl(1000), '2026-10')).toEqual({ A: '2026-12', B: '2027-05' })
    // The pace's parts from the engine's log: the operations docked with the pool Cele apart.
    const ev = (date: string, v: number, txId: string): FleetEvent => ({ kind: 'trading', date, amount: v, txId, moves: { goals: { G: v } } })
    const log = [ev('2026-08-05', zl(600), 'P1'), ev('2026-09-05', zl(400), 'X1')]
    expect(goalPace(log, '2026-08-01', '2026-10', new Set(['P1']))).toEqual({ pool: zl(300), rest: zl(200), total: zl(500) })
    // „Tempo” on the screen is the same walk's total – what `goalInflow` says.
    expect(goalInflow(log, '2026-08-01', '2026-10')).toBe(zl(500))
  })

  it('po terminie: ETA po terminie, przy tym tempie nigdy (ponad 50 lat) albo bez tempa termin minął (B87)', () => {
    const g = { amount: zl(100), target: zl(1000), deadline: '2026-12' }
    expect(goalLate(g, '2027-01', zl(50), '2026-10')).toBe(true)
    expect(goalLate(g, '2026-11', zl(500), '2026-10')).toBe(false)
    // No ETA at a pace above zero: never at this pace – past its deadline.
    expect(goalLate(g, null, zl(1), '2026-10')).toBe(true)
    // No pace: only once the deadline is gone.
    expect(goalLate(g, null, null, '2026-10')).toBe(false)
    expect(goalLate(g, null, 0, '2027-01')).toBe(true)
    // Reached, without a target or a deadline: never.
    expect(goalLate({ ...g, amount: zl(1000) }, null, zl(1), '2027-01')).toBe(false)
    expect(goalLate({ ...g, target: 0 }, null, zl(1), '2027-01')).toBe(false)
    expect(goalLate({ ...g, deadline: null }, null, zl(1), '2027-01')).toBe(false)
  })

  it('cel ICTTJ bez kwoty bierze w swoim miesiącu wszystko z puli Cele; poza nim – nic (N46)', () => {
    const open = goal('Wakacje', 0, 1, {
      source: 'ictj',
      ictj: { forecastId: nextId(), goalId: nextId(), currency: 'PLN', amount: null, version: '' },
      deadline: '2026-10',
      activeFrom: '2026-09-01T00:00:00.000Z'
    })
    const own = goal('Rower', zl(5000), 2, { activeFrom: '2026-09-01T00:00:00.000Z' })
    const inMonth = tx('2026-10-10', zl(1000), { kind: 'trading', counterparty: 'XTB' })
    const after = tx('2026-11-10', zl(700), { kind: 'trading', counterparty: 'XTB' })
    const f = fleet({
      settings: settingsWith({ budget: { start: '2026-10-01' } }),
      balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })],
      goals: [open, own],
      transactions: [inMonth, after],
      dockings: [docking(inMonth, { pool: 'goals', createdAt: '2026-10-10T12:00:00.000Z' }), docking(after, { pool: 'goals', createdAt: '2026-11-10T12:00:00.000Z' })],
      now: '2026-11-12T12:00:00+01:00'
    })
    const amount = (id: string) => f.goals.find((g) => g.id === id)?.amount ?? 0
    expect(amount(open.id)).toBe(zl(1000))
    expect(amount(own.id)).toBe(zl(700))
  })

  it('cel ICTTJ bez kwoty: liczy się miesiąc wpisu ICTTJ, nie dzień wpływu w banku (N46)', () => {
    const open = goal('Wakacje', 0, 1, {
      source: 'ictj',
      ictj: { forecastId: nextId(), goalId: nextId(), currency: 'PLN', amount: null, version: '' },
      deadline: '2026-10',
      activeFrom: '2026-09-01T00:00:00.000Z'
    })
    const own = goal('Rower', zl(5000), 2, { activeFrom: '2026-09-01T00:00:00.000Z' })
    // Set aside on 30.10 in ICTTJ, in the bank on 2.11.
    const late = tx('2026-11-02', zl(1000), { kind: 'trading', counterparty: 'XTB' })
    const run = (d: Docking) =>
      fleet({
        settings: settingsWith({ budget: { start: '2026-10-01' } }),
        balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })],
        goals: [open, own],
        transactions: [late],
        dockings: [d],
        now: '2026-11-05T12:00:00+01:00'
      }).goals
    const amounts = (list: FleetState['goals']) => [open.id, own.id].map((id) => list.find((g) => g.id === id)?.amount ?? 0)
    expect(amounts(run(docking(late, { pool: 'goals', entryDate: '2026-10-30', createdAt: '2026-11-02T12:00:00.000Z' })))).toEqual([zl(1000), 0])
    // A docking from before 1.6.2 (no entry's day): the operation's day decides.
    expect(amounts(run(docking(late, { pool: 'goals', createdAt: '2026-11-02T12:00:00.000Z' })))).toEqual([0, zl(1000)])
  })
})

describe('gra (1.6.2, grupa N)', () => {
  const container = (amount: number, updatedAt: string) => containerSchema.parse({ ...base(), createdAt: '2026-09-01T10:00:00.000Z', updatedAt, name: 'Kredyt', amount, cycleMonths: 1, dueMonth: '2026-09', dueDay: 10 })

  it('kontener podniesiony ponad linię: naruszenie w dniu zmiany, nie w dniu zamrożonym po niej (B89)', () => {
    const raised = container(zl(2000), '2026-10-20T10:00:00.000Z')
    const input = world({ containers: [raised] })
    const prev = day({ cargo: zl(1000) })
    const d19 = rateDay(input, '2026-10-19', prev)
    expect(d19.violations.map((v) => v.order)).not.toContain('cargo')
    expect(d19.cargo).toBe(zl(1000))
    const d20 = rateDay(input, '2026-10-20', day({ cargo: d19.cargo }))
    expect(d20.violations.filter((v) => v.order === 'cargo')).toEqual([expect.objectContaining({ ref: raised.id })])
    // The 1st of a month (no day before to compare): a container changed that day over the line counts.
    const first = container(zl(2000), '2026-11-01T10:00:00.000Z')
    expect(rateDay(world({ containers: [first] }), '2026-11-01').violations.map((v) => v.order)).toContain('cargo')
  })

  it('ładunek bez dnia do porównania i zmieniony później: masa dnia nieznana; zmiana nazwy nie jest zmianą masy (B89)', () => {
    const raised = containerSchema.parse({ ...container(zl(2000), '2026-11-05T10:00:00.000Z'), amountAt: '2026-11-05T10:00:00.000Z' })
    const first = rateDay(world({ containers: [raised] }), '2026-11-01')
    expect([first.cargo, first.violations.map((v) => v.order).includes('cargo')]).toEqual([null, false])
    // Its own day judges the change against the unknown day before.
    expect(rateDay(world({ containers: [raised] }), '2026-11-05', day({ cargo: null })).violations.map((v) => v.order)).toContain('cargo')
    // Raised in October, renamed on 1.11: the 1st sees no change of the mass.
    const renamed = containerSchema.parse({ ...container(zl(2000), '2026-11-01T10:00:00.000Z'), amountAt: '2026-10-15T10:00:00.000Z' })
    expect(rateDay(world({ containers: [renamed] }), '2026-11-01').violations.map((v) => v.order)).not.toContain('cargo')
  })

  it('misja i stopień nowszej wersji: misja nieoceniana, stopień bez awansu i degradacji, pokazany po nazwie (B90)', () => {
    const week = '2026-W41'
    const game = [monthWith('2026-10', {}, { missions: [{ id: missionId(week), template: 'future-mission', week, done: false, evaluatedAt: null, params: {} }] })]
    const change = advanceGame(world({ game }), '2026-10-13T10:00:00Z')
    const months = change.months.length ? change.months : game
    const mission = months.flatMap((m) => m.missions).find((m) => m.week === week)
    expect(mission?.evaluatedAt).toBeNull()
    const promoted = [monthWith('2026-10', {}, { promotions: [{ id: rankChangeId('2026-10-10'), at: AT, rank: 'vice-admiral', change: 'up', day: '2026-10-10' }] })]
    const view = gameView(promoted, world().settings.game, '2026-10-20')
    expect([view.rankNewer, view.progress]).toEqual(['vice-admiral', null])
    // No step from it: the freezing writes no rank change.
    const after = advanceGame(world({ game: promoted }), '2026-11-20T10:00:00Z')
    expect(after.months.flatMap((m) => m.promotions).filter((p) => p.day !== '2026-10-10')).toEqual([])
  })

  it('misja „Pełna energia”: wybór i stan widzą też dni jeszcze niezamrożone (B91, N68)', () => {
    // 14.10 frozen with the daily order broken; Sunday 25.10 not frozen yet on Monday – overspent.
    const game = [monthWith('2026-10', { '2026-10-14': day({ status: 'broken', violations: [{ order: 'daily', serious: false, note: '', ref: null, amount: zl(50) }] }) })]
    const input = world({ game, transactions: [tx('2026-10-25', -zl(900), { categoryId: FOOD })] })
    expect(chooseMission(input, '2026-10-26', null).template).toBe('energy')
    // Mid-week: today's overspend is seen at once (as „Dziś na razie: naruszenie”).
    const mid = world({ transactions: [tx('2026-10-21', -zl(900), { categoryId: FOOD })] })
    expect(missionStatus(mid, { template: 'energy', week: '2026-W43', params: {} }, '2026-10-21')).toEqual({ ok: false })
    expect(missionStatus(world(), { template: 'energy', week: '2026-W43', params: {} }, '2026-10-21')).toEqual({ ok: true })
    // The days not frozen are remembered per what the engine reads: the same operations with another plan – judged again.
    const plan = (salary: number) => [monthPlanSchema.parse({ ...base(), month: '2026-10', salary, envelopes: { [FOOD]: salary } })]
    const richer = { ...mid, months: plan(zl(40000)) }
    expect(missionStatus(richer, { template: 'energy', week: '2026-W43', params: {} }, '2026-10-21')).toEqual({ ok: true })
    expect(missionStatus({ ...richer, months: plan(zl(3100)) }, { template: 'energy', week: '2026-W43', params: {} }, '2026-10-21')).toEqual({ ok: false })
  })

  it('klasa świętowana tylko ponad szczyt z 30 dni – powrót do klasy to wpis w dzienniku (N64)', () => {
    const days: Record<string, GameDay> = {
      '2026-10-05': day({ cls: 'corvette' }),
      '2026-10-06': day({ cls: 'frigate' }),
      '2026-10-07': day({ cls: 'corvette' }),
      '2026-10-08': day({ cls: 'frigate' })
    }
    const ups = gameView([monthWith('2026-10', days)], world().settings.game, '2026-10-09').log.filter((e) => e.kind === 'class' && e.up)
    expect(ups.map((e) => (e.kind === 'class' ? [e.date, e.peak] : null))).toEqual([
      ['2026-10-08', false],
      ['2026-10-06', true]
    ])
  })

  it('poważne naruszenia od zmiany stopnia w tym miesiącu – dzień, od którego liczone (N70)', () => {
    const promoted = [monthWith('2026-10', {}, { promotions: [{ id: rankChangeId('2026-10-15'), at: AT, rank: 'ensign', change: 'up', day: '2026-10-15' }] })]
    expect(gameView(promoted, world().settings.game, '2026-10-20').serious.from).toBe('2026-10-16')
    expect(gameView([], world().settings.game, '2026-11-20').serious.from).toBe('2026-11-01')
  })
})

describe('domownicy i salda (1.6.2, grupa N)', () => {
  it('saldo na start z datą najstarszego zakupu: przypomnienie liczy od niej (N41)', () => {
    const s = settingsWith({ budget: { start: '2026-10-01' } })
    const member = s.household.members[0]!
    const settings: Settings = { ...s, household: { ...s.household, since: '2026-10-15', members: [{ ...member, opening: { owed: zl(150), deposit: 0, since: '2026-06-03' } }] } }
    const f = fleet({ settings, balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })], now: '2026-10-20T12:00:00+02:00' })
    expect(f.receivables.members.find((m) => m.memberId === member.id)).toMatchObject({ owed: zl(150), since: '2026-06-03' })
    // Typed by hand (no day): the settlements' start dates it, as before.
    const typed: Settings = { ...settings, household: { ...settings.household, members: [{ ...member, opening: { owed: zl(150), deposit: 0, since: null } }] } }
    expect(fleet({ settings: typed, balances: f.start ? [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })] : [], now: '2026-10-20T12:00:00+02:00' }).receivables.members[0]).toMatchObject({ since: '2026-10-15' })
  })

  it('saldo potwierdzone dwa razy na dwóch komputerach: ta sama korekta w kilka dni – do sprawdzenia (B129)', () => {
    const a = tx('2026-10-11', zl(50), { kind: 'correction', updatedBy: 'LAPTOP' })
    const b = tx('2026-10-12', zl(50), { kind: 'correction', updatedBy: 'PC' })
    const same = tx('2026-10-13', zl(50), { kind: 'correction', updatedBy: 'PC' })
    const far = tx('2026-10-30', zl(50), { kind: 'correction', updatedBy: 'LAPTOP' })
    const other = tx('2026-10-12', zl(70), { kind: 'correction', updatedBy: 'PC' })
    expect(doubleCorrections([a, b, other]).map((x) => [x.later.id, x.earlier.id])).toEqual([[b.id, a.id]])
    // One computer correcting twice, or weeks apart: no report.
    expect(doubleCorrections([b, same])).toEqual([])
    expect(doubleCorrections([a, far])).toEqual([])
  })
})
