import { describe, expect, it } from 'vitest'
import { accountsAhead, coverAmount } from '@shared/calc/ahead'
import { briefing, planItem } from '@shared/calc/briefing'
import { course, courseIncome, maneuver, MANEUVER_GOAL, type CourseInput } from '@shared/calc/course'
import { computeFleet, coverMoves, goalInstallment, layersSum, ratedIn, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { changeGoal, goalAt } from '@shared/calc/goals'
import { coversOf, gameView, rateDay } from '@shared/calc/game'
import { debriefing, envelopeExtraOf, keptOf, lootApplied, lootDecision, lootExtraOf, ratesOf, salarySplit } from '@shared/calc/plan'
import { lastPaymentOf, radar } from '@shared/calc/radar'
import { dayInYear, nextDayOf, occurrences, remindReach, remindStep, scheduledDays, scheduledWindow } from '@shared/calc/scheduled'
import { copyOnMonths, yearPlan } from '@shared/calc/yearPlan'
import { dueNotices } from '@shared/notify'
import { createDefaultSettings } from '@shared/defaults'
import { machinePrefsFrom } from '@shared/machine'
import {
  balanceSchema,
  CASH_ACCOUNT_ID,
  containerSchema,
  defaultCategoryId,
  goalSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  scheduledSchema,
  SCHEMA_VERSION,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
  type Scheduled,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K7F000000000000000000${String(++seq).padStart(3, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })

const FOOD = defaultCategoryId(1)
const AUTO = defaultCategoryId(3)
const FUN = defaultCategoryId(6)

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const plan = (month: string, salary: number, envelopes: Record<string, number> = {}, over = {}) => monthPlanSchema.parse({ ...base(), month, salary, envelopes, ...over })
const opening = (date: string, amount: number, accountId = MBANK_ACCOUNT_ID) => balanceSchema.parse({ ...base(), date, accountId, kind: 'opening', amount })
const sched = (over: Partial<Scheduled> & { name: string; date: string }): Scheduled => scheduledSchema.parse({ ...base(), ...over })

function settingsWith(over: { budget?: Partial<Settings['budget']>; layers?: Partial<Settings['layers']> } = {}): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, ...over.budget }, layers: { ...s.layers, ...over.layers } }
}

function fleet(input: Partial<FleetInput> & { now: string }): FleetState {
  const state = computeFleet({ settings: settingsWith(), transactions: [], ...input })
  if (state.started) expect(layersSum(state)).toBe(state.total)
  return state
}

// ------------------------------------------------------------------ F15

describe('cel z terminem: rata z pensji (1.8.0, F15, D87)', () => {
  it('rata = brak / miesiące do terminu (z tym), reszta w miesiącu terminu; po terminie i bez braku – nic', () => {
    expect(goalInstallment(zl(6000), '2026-09', '2027-02')).toBe(zl(1000))
    expect(goalInstallment(100_01, '2026-12', '2027-01')).toBe(50_00)
    expect(goalInstallment(501, '2027-01', '2027-01')).toBe(501)
    expect(goalInstallment(zl(100), '2027-02', '2027-01')).toBe(0)
    expect(goalInstallment(0, '2026-09', '2027-01')).toBe(0)
    expect(ratedIn([{ from: '2026-10', until: '2026-12' }], '2026-09')).toBe(false)
    expect(ratedIn([{ from: '2026-10', until: '2026-12' }], '2026-12')).toBe(true)
    expect(ratedIn([{ from: '2026-10', until: null }], '2030-01')).toBe(true)
  })

  // Shields 3 × 3 000 = 9 000 zł, hull 6 × 2 000 = 12 000 zł; the budget starts on 1 September with both full.
  const goal = (over = {}) => goalSchema.parse({ ...base(), name: 'Wakacje', target: zl(6000), priority: 1, deadline: '2027-02', rates: [{ from: '2026-09', until: null }], ...over })
  const settings = settingsWith({ budget: { start: '2026-09-01', initial: { shields: zl(12000), hull: zl(12000), goals: {} } }, layers: { assumedCosts: zl(2000) } })
  const input = (goals: FleetInput['goals'], over: Partial<FleetInput> = {}) => ({ settings, balances: [opening('2026-09-01', zl(24000))], months: [plan('2026-09', zl(3000))], goals, ...over })

  it('osłony i kadłub pełne na przełomie: rata z energii po zbiornikach, co miesiąc od nowa', () => {
    const g = goal()
    const sep = fleet({ ...input([g]), now: '2026-09-15T12:00:00+02:00' })
    expect(sep.goals.find((x) => x.id === g.id)!.amount).toBe(zl(1000))
    expect(sep.energy).toBe(zl(2000))
    expect(ratesOf(sep.log, '2026-09')).toEqual(new Map([[g.id, zl(1000)]]))
    // October: the loot of September waits (the shields 9 000 at the turn – full); 5 000 over 5 months.
    const oct = fleet({ ...input([g]), now: '2026-10-02T12:00:00+02:00' })
    expect(oct.goals.find((x) => x.id === g.id)!.amount).toBe(zl(2000))
    expect(ratesOf(oct.log, '2026-10')).toEqual(new Map([[g.id, zl(1000)]]))
  })

  it('osłony niepełne na przełomie – bez raty (kolejność D13); okres raty i opcja wyłączona – bez raty', () => {
    const low = settingsWith({ budget: { start: '2026-09-01', initial: { shields: zl(8000), hull: zl(16000), goals: {} } }, layers: { assumedCosts: zl(2000) } })
    const g = goal()
    const sep = fleet({ ...input([g]), settings: low, now: '2026-09-15T12:00:00+02:00' })
    expect(sep.goals[0]!.amount).toBe(0)
    expect(sep.log.some((e) => e.kind === 'rate')).toBe(false)
    expect(fleet({ ...input([goal({ rates: [] })]), now: '2026-09-15T12:00:00+02:00' }).goals[0]!.amount).toBe(0)
    expect(fleet({ ...input([goal({ rates: [{ from: '2026-10', until: null }] })]), now: '2026-09-15T12:00:00+02:00' }).goals[0]!.amount).toBe(0)
    // No deadline – nothing to count to.
    expect(fleet({ ...input([goal({ deadline: null })]), now: '2026-09-15T12:00:00+02:00' }).goals[0]!.amount).toBe(0)
  })

  it('kilka celów: po priorytecie, najwyżej tyle, ile energii', () => {
    const a = goal({ name: 'A', priority: 1, target: zl(12000), deadline: '2026-10' })
    const b = goal({ name: 'B', priority: 2, target: zl(6000) })
    const s = fleet({ ...input([b, a]), now: '2026-09-15T12:00:00+02:00' })
    // A wants 6 000 (12 000 over 2 months) – takes all the 3 000 of the salary; B gets nothing.
    expect(s.goals.map((x) => [x.name, x.amount])).toEqual([
      ['A', zl(3000)],
      ['B', 0]
    ])
    expect(s.energy).toBe(0)
  })

  it('zmiana terminu liczy się od chwili zmiany: wcześniejsze raty bez zmian', () => {
    const g = goal()
    const moved = changeGoal(g, { deadline: '2026-11' }, '2026-10-15T10:00:00.000Z')
    expect(moved.past.at(-1)).toMatchObject({ deadline: '2027-02' })
    expect(goalAt(moved, Date.parse('2026-10-01T00:00:00.000Z')).deadline).toBe('2027-02')
    expect(goalAt(moved, Date.parse('2026-11-01T00:00:00.000Z')).deadline).toBe('2026-11')
    // A state from before 1.8.0 (no deadline in it): the next one known.
    expect(goalAt({ ...moved, past: [{ until: '2026-10-15T10:00:00.000Z', priority: 1, target: zl(6000), archived: false }] }, Date.parse('2026-10-01T00:00:00.000Z')).deadline).toBe('2026-11')
    // An income on 20 October fills the shields to their target (the loot of September came back on the 8th) and gives
    // the rest to the goal: 2 000 + 2 000.
    const nov = fleet({ ...input([moved], { transactions: [tx('2026-10-20', zl(3000), { kind: 'income' })] }), now: '2026-11-02T12:00:00+01:00' })
    // September 1 000, October 1 000 (deadline 02.2027 then); November – its deadline month – the rest: 2 000.
    expect(['2026-09', '2026-10', '2026-11'].map((m) => ratesOf(nov.log, m).get(g.id))).toEqual([zl(1000), zl(1000), zl(2000)])
    expect(nov.goals[0]!.amount).toBe(zl(6000))
  })

  it('podział pensji: raty z dziennika silnika; plan – z dopiskiem', () => {
    const split = salarySplit(plan('2026-09', zl(3000)), '2026-09', [], settings.categories, undefined, 0, { rates: { items: [{ goalId: 'G', name: 'Wakacje', amount: zl(1000), deadline: '2027-02' }], planned: false } })
    expect(split.rates).toEqual({ items: [{ goalId: 'G', name: 'Wakacje', amount: zl(1000), deadline: '2027-02' }], total: zl(1000), planned: false })
    expect(split.allocated).toBe(zl(1000))
    expect(split.unallocated).toBe(zl(2000))
  })

  it('debriefing: raty z pensji pomniejszają energię miesiąca jak zbiorniki', () => {
    const g = goal()
    const s = fleet({ ...input([g]), now: '2026-10-02T12:00:00+02:00' })
    const d = debriefing('2026-09', { transactions: [], categories: settings.categories, plans: [plan('2026-09', zl(3000))], log: s.log, today: s.today })
    expect(d.energy).toMatchObject({ salary: zl(3000), sinking: 0, rates: zl(1000), budget: zl(2000), used: 0, result: zl(2000) })
  })
})

// ------------------------------------------------------------------ F28

describe('zapas koperty planowej i pokrycie przekroczenia (1.8.0, F28, D73)', () => {
  const settings = settingsWith({ budget: { start: '2026-09-01' }, layers: { assumedCosts: zl(2000) } })
  const spend = (date: string, amount: number, categoryId: string) => tx(date, -zl(amount), { categoryId })

  it('łupy: zapas koperty planowej na następny miesiąc – jej limit rośnie, reszta jak dotąd', () => {
    const decided = lootDecision(zl(2000), { goals: {}, envelopes: { [AUTO]: zl(200) }, nextMonth: zl(300) }, '2026-10-02T10:00:00.000Z')
    expect(decided).toEqual({ decidedAt: '2026-10-02T10:00:00.000Z', shields: zl(1500), nextMonth: zl(300), goals: {}, envelopes: { [AUTO]: zl(200) } })
    // Too much: the goals first, then the envelopes, then the next month.
    expect(lootDecision(zl(250), { goals: { G: zl(100) }, envelopes: { [AUTO]: zl(200) }, nextMonth: zl(300) }, AT)).toMatchObject({ goals: { G: zl(100) }, envelopes: { [AUTO]: zl(150) }, nextMonth: 0, shields: 0 })
    const months = [plan('2026-09', zl(3000), { [AUTO]: zl(300), [FOOD]: zl(1000) }, { loot: decided })]
    const s = fleet({ settings, balances: [opening('2026-09-01', zl(20000))], months, transactions: [spend('2026-09-05', 100, AUTO)], now: '2026-10-05T12:00:00+02:00' })
    // The loot of September: 3 000 − 100 = 2 900; 200 kept in Auto, 300 to the daily envelopes, the rest to the shields.
    expect(lootApplied(s.log, '2026-09')).toEqual({ date: '2026-10-02', amount: zl(2900), goals: 0, envelopes: zl(200), nextMonth: zl(300), shields: zl(2400) })
    expect(s.envelopes.find((e) => e.categoryId === AUTO)).toMatchObject({ limit: zl(500) })
    expect(keptOf(s.log, '2026-10')).toEqual(new Map([[AUTO, zl(200)]]))
    expect(lootExtraOf(s.log, '2026-10')).toBe(zl(300))
    // The daily pool: 1 000 + the 300 of the loot; Auto's kept part is not the daily pool's.
    expect(s.daily?.limit).toBe(zl(1300))
    const d = debriefing('2026-10', { transactions: [], categories: settings.categories, plans: months, log: s.log, today: s.today })
    expect(d.envelopes.find((e) => e.categoryId === AUTO)).toMatchObject({ limit: zl(500), extra: zl(200) })
    expect(d.energy).toMatchObject({ loot: zl(500) })
    expect(d.daily).toMatchObject({ extra: zl(300) })
  })

  it('pokrycie z innej koperty: limity przesunięte w miesiącu; gra – według stanu sprzed pokrycia tego dnia', () => {
    const cover = { id: nextId(), from: FUN, to: AUTO, amount: zl(150), at: '2026-10-10T10:00:00.000Z' }
    const months = [plan('2026-09', zl(3000), { [AUTO]: zl(300), [FUN]: zl(400) }), plan('2026-10', zl(3000), { [AUTO]: zl(300), [FUN]: zl(400) }, { envelopeCovers: [cover] })]
    const transactions = [spend('2026-10-10', 420, AUTO)]
    const s = fleet({ settings, balances: [opening('2026-09-01', zl(20000))], months, transactions, now: '2026-10-11T12:00:00+02:00' })
    expect(s.envelopes.find((e) => e.categoryId === AUTO)).toMatchObject({ limit: zl(450), spent: zl(420) })
    expect(s.envelopes.find((e) => e.categoryId === FUN)).toMatchObject({ limit: zl(250) })
    expect(s.alarms.some((a) => a.kind === 'envelope-over')).toBe(false)
    expect(coverMoves(months[1], Date.parse('2026-10-10T09:00:00.000Z'))).toEqual(new Map())
    expect(envelopeExtraOf(s.log, '2026-10', months)).toEqual(new Map([[FUN, -zl(150)], [AUTO, zl(150)]]))
    // The game: 10 October still broken (the cover made that day), 11 October sees the limit raised.
    const game = { settings: { ...settings, game: { ...settings.game, start: '2026-09-01' } }, transactions, months, balances: [opening('2026-09-01', zl(20000))], containers: [], goals: [], dockings: [], loans: [], game: [] }
    // Over by 120 of 300 (40%): serious that day.
    expect(rateDay(game, '2026-10-10').violations.map((v) => v.order)).toEqual(['envelope-serious'])
    expect(rateDay(game, '2026-10-11').violations).toEqual([])
    // The watch log: the cover on its day.
    expect(coversOf(months)).toEqual([{ kind: 'cover', date: '2026-10-10', from: FUN, to: AUTO, amount: zl(150) }])
    const view = gameView([], { ...settings.game, start: '2026-09-01' }, '2026-10-12', coversOf(months))
    expect(view.log.filter((e) => e.kind === 'cover')).toHaveLength(1)
  })
})

// ------------------------------------------------------------------ F16

describe('boje: zaplanowane operacje i terminy (1.8.0, F16)', () => {
  const TODAY = '2026-10-19'

  it('dni: raz albo co roku (29 lutego – 28. w innych latach); następny dzień', () => {
    expect(dayInYear('2024-02-29', 2025)).toBe('2025-02-28')
    expect(dayInYear('2024-02-29', 2028)).toBe('2028-02-29')
    expect(occurrences({ date: '2026-12-24', yearly: false }, '2026-01-01', '2027-12-31')).toEqual(['2026-12-24'])
    expect(occurrences({ date: '2024-02-29', yearly: true }, '2025-01-01', '2028-12-31')).toEqual(['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29'])
    expect(occurrences({ date: '2026-12-24', yearly: true }, '2026-01-01', '2026-12-01')).toEqual([])
    expect(nextDayOf({ date: '2025-06-01', yearly: true }, TODAY)).toBe('2027-06-01')
    expect(nextDayOf({ date: '2026-10-01', yearly: false }, TODAY)).toBeNull()
    expect(remindStep({ remind: [14, 3] }, 20)).toBeNull()
    expect(remindStep({ remind: [14, 3] }, 14)).toBe(14)
    expect(remindStep({ remind: [14, 3] }, 4)).toBe(14)
    expect(remindStep({ remind: [14, 3] }, 3)).toBe(3)
    expect(remindStep({ remind: [14, 3] }, 0)).toBe(3)
    expect(remindStep({ remind: [14, 3] }, -1)).toBeNull()
  })

  it('stany dni: przed, dziś, po terminie, przepadły; odhaczony; zrobiony z niego – a gdy operacji nie ma, znów otwarty', () => {
    const made = tx('2026-10-10', -zl(80), { counterparty: 'Urząd' })
    const list = [
      sched({ name: 'Wesele', date: '2026-10-25', amount: -zl(1500) }),
      sched({ name: 'Dowód', date: TODAY }),
      sched({ name: 'Przegląd', date: '2026-10-14', amount: -zl(300) }),
      sched({ name: 'Stary', date: '2026-08-01', amount: -zl(300) }),
      sched({ name: 'Paszport', date: '2026-10-10', amount: -zl(80), done: { '2026-10-10': made.id } }),
      sched({ name: 'Domena', date: '2026-10-12', done: { '2026-10-12': '' } })
    ]
    const days = scheduledDays(list, [made], TODAY, '2026-07-01', '2027-01-01')
    const state = (name: string) => days.find((d) => d.scheduled.name === name)
    expect(state('Wesele')).toMatchObject({ state: 'ahead', days: 6 })
    expect(state('Dowód')).toMatchObject({ state: 'today', days: 0 })
    expect(state('Przegląd')).toMatchObject({ state: 'late', days: -5 })
    expect(state('Stary')).toMatchObject({ state: 'lapsed' })
    expect(state('Paszport')).toMatchObject({ state: 'done', txId: made.id, matched: false })
    expect(state('Domena')).toMatchObject({ state: 'done', txId: null })
    // The operation it was made from deleted: open again (late).
    expect(scheduledDays(list, [], TODAY, '2026-07-01', '2027-01-01').find((d) => d.scheduled.name === 'Paszport')).toMatchObject({ state: 'late' })
  })

  it('operacja z banku dopasowana: kwota i ±3 dni (inna kwota tylko z podobną nazwą), konto, „to nie ta”, jedna operacja – jeden dzień', () => {
    const wesele = sched({ name: 'Wesele Kasi', date: '2026-10-16', amount: -zl(1500) })
    const exact = tx('2026-10-14', -zl(1500), { counterparty: 'Restauracja' })
    expect(scheduledDays([wesele], [exact], TODAY, '2026-10-01', '2026-11-01')[0]).toMatchObject({ state: 'done', txId: exact.id, matched: true })
    // 5 days off – no.
    expect(scheduledDays([wesele], [tx('2026-10-11', -zl(1500))], TODAY, '2026-10-01', '2026-11-01')[0]!.state).toBe('late')
    // A close amount: with a similar name only.
    expect(scheduledDays([wesele], [tx('2026-10-16', -zl(1530), { counterparty: 'Sklep' })], TODAY, '2026-10-01', '2026-11-01')[0]!.state).toBe('late')
    expect(scheduledDays([wesele], [tx('2026-10-16', -zl(1530), { counterparty: 'WESELE KASI SALA' })], TODAY, '2026-10-01', '2026-11-01')[0]!.state).toBe('done')
    // Money the other way, a transfer between own accounts – never.
    expect(scheduledDays([wesele], [tx('2026-10-16', zl(1500))], TODAY, '2026-10-01', '2026-11-01')[0]!.state).toBe('late')
    expect(scheduledDays([wesele], [tx('2026-10-16', -zl(1500), { kind: 'transfer' })], TODAY, '2026-10-01', '2026-11-01')[0]!.state).toBe('late')
    // Its account only.
    expect(scheduledDays([{ ...wesele, accountId: XTB_WALLET_ACCOUNT_ID }], [exact], TODAY, '2026-10-01', '2026-11-01')[0]!.state).toBe('late')
    // „To nie ta”.
    expect(scheduledDays([{ ...wesele, notMatched: [exact.id] }], [exact], TODAY, '2026-10-01', '2026-11-01')[0]!.state).toBe('late')
    // Two planned days of one amount, one operation: the first takes it.
    const second = sched({ name: 'Wesele Kasi', date: '2026-10-17', amount: -zl(1500) })
    const two = scheduledDays([wesele, second], [exact], TODAY, '2026-10-01', '2026-11-01')
    expect(two.map((d) => [d.date, d.state])).toEqual([
      ['2026-10-16', 'done'],
      ['2026-10-17', 'late']
    ])
    // An operation made from another one is never matched to this one.
    const madeFor = sched({ name: 'Inne', date: '2026-10-14', amount: -zl(1500), done: { '2026-10-14': exact.id } })
    expect(scheduledDays([wesele, madeFor], [exact], TODAY, '2026-10-01', '2026-11-01').find((d) => d.scheduled.id === wesele.id)!.state).toBe('late')
    // A term without an amount – never matched.
    expect(scheduledDays([sched({ name: 'Termin', date: '2026-10-16' })], [exact], TODAY, '2026-10-01', '2026-11-01')[0]!.state).toBe('late')
    // An operation written ahead does the day too (the accounts' forecast counts it – never the buoy as well).
    expect(scheduledDays([sched({ name: 'Rata', date: '2026-10-21', amount: -zl(100) })], [tx('2026-10-21', -zl(100))], TODAY, '2026-10-01', '2026-11-01')[0]).toMatchObject({ state: 'done', matched: true })
  })

  it('co roku: każdy rok osobno', () => {
    const s = sched({ name: 'OC', date: '2025-10-01', amount: -zl(900), yearly: true, done: { '2025-10-01': '' } })
    const days = scheduledDays([s], [], TODAY, '2025-01-01', '2027-12-31')
    expect(days.map((d) => [d.date, d.state])).toEqual([
      ['2025-10-01', 'done'],
      ['2026-10-01', 'late'],
      ['2027-10-01', 'ahead']
    ])
  })

  it('radar: boje i terminy, koniec kontenera, konta płatności, osłony po zdarzeniu', () => {
    const list = [sched({ name: 'Wesele', date: '2026-11-05', amount: -zl(1500), accountId: MBANK_ACCOUNT_ID }), sched({ name: 'Premia', date: '2026-12-10', amount: zl(2000) }), sched({ name: 'Dowód', date: '2026-10-25' }), sched({ name: 'Przegląd', date: '2026-10-14', amount: -zl(300) })]
    const containers = [
      containerSchema.parse({ ...base(), name: 'Internet', amount: zl(89), dueMonth: '2026-01', dueDay: 15, until: '2026-12', accountId: MBANK_ACCOUNT_ID }),
      containerSchema.parse({ ...base(), name: 'OC', amount: zl(1200), cycleMonths: 12, dueMonth: '2026-11', dueDay: 3, until: '2027-03' })
    ]
    expect(lastPaymentOf(containers[0]!, TODAY)).toBe('2026-12-15')
    expect(lastPaymentOf(containers[1]!, TODAY)).toBe('2026-11-03')
    expect(lastPaymentOf(containers[1]!, '2026-11-04')).toBeNull()
    const items = radar({
      today: TODAY,
      plans: [plan('2026-10', zl(3000))],
      containers,
      tanks: [],
      loans: [],
      money: (g) => `${g / 100} zł`,
      scheduled: scheduledWindow(list, [], TODAY, 90),
      layers: { shields: zl(9000), hull: zl(12000), goals: [], targets: { shields: zl(9000), hull: zl(12000) } }
    })
    const of = (kind: string) => items.filter((i) => i.kind === kind).map((i) => [i.date, i.name, i.amount, i.direction, i.note, i.accountId ?? null, i.shieldsAfter ?? null])
    expect(of('plan')).toEqual([
      ['2026-10-14', 'Przegląd', zl(300), 'out', 'po terminie 5 dni', null, zl(8700)],
      ['2026-10-25', 'Dowód', null, null, 'termin', null, null],
      ['2026-11-05', 'Wesele', zl(1500), 'out', '', MBANK_ACCOUNT_ID, zl(4200)],
      ['2026-12-10', 'Premia', zl(2000), 'in', '', null, zl(3200)]
    ])
    expect(items.find((i) => i.kind === 'plan' && i.name === 'Przegląd')?.overdue).toBe(true)
    // The salaries take 3 000 each from the shields; the bonus docks into them (below their target).
    expect(of('salary').map((x) => x[6])).toEqual([zl(5700), zl(1200), zl(200)])
    expect(of('end')).toEqual([
      ['2026-11-03', 'OC', null, null, 'ostatnia płatność – potem ładownia lżejsza o 100 zł/mies.', null, null],
      ['2026-12-15', 'Internet', null, null, 'ostatnia płatność – potem ładownia lżejsza o 89 zł/mies.', null, null]
    ])
    expect(items.find((i) => i.kind === 'fixed' && i.name === 'Internet')?.accountId).toBe(MBANK_ACCOUNT_ID)
  })

  it('odprawa i powiadomienia: przypomnienia 14 i 3 dni przed, po terminie, koniec kontenera', () => {
    const f = fleet({ settings: settingsWith({ budget: { start: '2026-09-01' } }), balances: [opening('2026-09-01', zl(9000))], months: [plan('2026-09', zl(3000))], now: '2026-10-19T09:00:00+02:00' })
    const list = [sched({ name: 'Wesele', date: '2026-11-02', amount: -zl(1500) }), sched({ name: 'Dowód', date: '2026-10-21' }), sched({ name: 'Przegląd', date: '2026-10-14', amount: -zl(300) }), sched({ name: 'Daleko', date: '2026-12-24', amount: -zl(100) })]
    const days = scheduledWindow(list, [], f.today, 90)
    const zlText = (g: number) => `${g / 100} zł`
    expect(days.map((d) => planItem(d, zlText)?.key ?? null)).toEqual([`plan:${list[2]!.id}:2026-10-14:late`, `plan:${list[1]!.id}:2026-10-21:3`, `plan:${list[0]!.id}:2026-11-02:14`, null])
    expect(planItem(days[2]!, zlText)?.text).toBe('Boja: Wesele za 14 dni – 1500 zł (wydatek).')
    expect(planItem(days[1]!, zlText)).toMatchObject({ level: 'yellow', text: 'Termin: Dowód za 2 dni.' })
    const internet = containerSchema.parse({ ...base(), name: 'Internet', amount: zl(89), dueMonth: '2026-01', dueDay: 25, until: '2026-10' })
    const items = briefing({ fleet: f, containers: [internet], imports: [], label: () => '', money: zlText, scheduled: days })
    expect(items.filter((i) => i.kind === 'end').map((i) => i.text)).toEqual(['Koniec kontenera: Internet – ostatnia płatność 25.10, potem ładownia lżejsza o 89 zł/mies.'])
    const prefs = machinePrefsFrom({})
    const notices = dueNotices({ fleet: f, containers: [internet], imports: [], label: () => '', money: zlText, scheduled: days, prefs: prefs.notify, quietHours: { from: '23:00', to: '06:00' }, time: '12:00', opened: false })
    expect(notices.filter((n) => n.tag === 'radar').map((n) => n.title)).toEqual(['Boja na kursie', 'Termin na radarze', 'Boja na kursie', 'Koniec kontenera'])
    const off = dueNotices({ fleet: f, containers: [internet], imports: [], label: () => '', money: zlText, scheduled: days, prefs: { ...prefs.notify, plans: false }, quietHours: { from: '23:00', to: '06:00' }, time: '12:00', opened: false })
    expect(off.filter((n) => n.tag === 'radar')).toEqual([])
  })
})

// ------------------------------------------------------------------ F26

describe('salda kont za 90 dni (1.8.0, F26)', () => {
  const accounts = createDefaultSettings(AT).settings.accounts
  const TODAY = '2026-10-19'
  const item = (date: string, amount: number, accountId: string, name = 'Czynsz') => ({ key: `${name}:${date}`, date, kind: 'fixed' as const, name, amount, direction: 'out' as const, note: '', accountId })

  it('płatność, na którą na koncie zabraknie: kiedy, ile, czym i skąd przelać', () => {
    const out = accountsAhead({
      today: TODAY,
      balances: [
        { id: MBANK_ACCOUNT_ID, balance: zl(1000) },
        { id: XTB_WALLET_ACCOUNT_ID, balance: zl(2000) },
        { id: CASH_ACCOUNT_ID, balance: zl(5000) }
      ],
      accounts,
      items: [item('2026-11-10', zl(1500), MBANK_ACCOUNT_ID), item('2026-11-20', zl(100), MBANK_ACCOUNT_ID, 'Internet')],
      transactions: [],
      end: '2027-01-17'
    })
    const mbank = out.find((a) => a.accountId === MBANK_ACCOUNT_ID)!
    expect(mbank).toMatchObject({ balance: zl(1000), low: { date: '2026-11-20', amount: -zl(600) }, short: { date: '2026-11-10', amount: zl(500), cause: 'Czynsz' } })
    // The cash is never the source of a transfer.
    expect(mbank.source).toEqual({ accountId: XTB_WALLET_ACCOUNT_ID, name: accounts.find((a) => a.id === XTB_WALLET_ACCOUNT_ID)!.name })
    expect(coverAmount(zl(500) + 1)).toBe(zl(501))
  })

  it('przelew własny zapisany z późniejszą datą liczy się po obu stronach; konto pod zerem już dziś – bez prognozy', () => {
    const planned = tx('2026-11-05', -zl(600), { accountId: XTB_WALLET_ACCOUNT_ID, kind: 'transfer', counterAccountId: MBANK_ACCOUNT_ID, bothSides: true })
    const out = accountsAhead({ today: TODAY, balances: [{ id: MBANK_ACCOUNT_ID, balance: zl(1000) }, { id: XTB_WALLET_ACCOUNT_ID, balance: zl(2000) }], accounts, items: [item('2026-11-10', zl(1500), MBANK_ACCOUNT_ID)], transactions: [planned], end: '2027-01-17' })
    expect(out.find((a) => a.accountId === MBANK_ACCOUNT_ID)!.short).toBeNull()
    expect(out.find((a) => a.accountId === XTB_WALLET_ACCOUNT_ID)!.low).toEqual({ date: '2026-11-05', amount: zl(1400) })
    const negative = accountsAhead({ today: TODAY, balances: [{ id: MBANK_ACCOUNT_ID, balance: -zl(10) }], accounts, items: [item('2026-11-10', zl(1500), MBANK_ACCOUNT_ID)], transactions: [], end: '2027-01-17' })
    expect(negative.find((a) => a.accountId === MBANK_ACCOUNT_ID)!.short).toBeNull()
  })

  it('odprawa: „Na koncie … zabraknie”', () => {
    const f = fleet({ settings: settingsWith({ budget: { start: '2026-09-01' } }), balances: [opening('2026-09-01', zl(9000))], months: [plan('2026-09', zl(3000))], now: '2026-10-19T09:00:00+02:00' })
    const ahead = accountsAhead({ today: TODAY, balances: [{ id: MBANK_ACCOUNT_ID, balance: zl(1000) }, { id: XTB_WALLET_ACCOUNT_ID, balance: zl(2000) }], accounts, items: [item('2026-11-10', zl(1500), MBANK_ACCOUNT_ID)], transactions: [], end: '2027-01-17' })
    const items = briefing({ fleet: f, containers: [], imports: [], label: () => '', money: (g) => `${g / 100} zł`, accounts: ahead })
    expect(items.filter((i) => i.kind === 'account').map((i) => [i.key, i.text])).toEqual([
      [`account:${MBANK_ACCOUNT_ID}:2026-11-10`, `Na koncie mBank zabraknie 500 zł na płatność 10.11 (Czynsz) – przelej z konta ${accounts.find((a) => a.id === XTB_WALLET_ACCOUNT_ID)!.name}.`]
    ])
  })
})

// ------------------------------------------------------------------ F27 / F35

describe('kurs na 12 miesięcy i symulator manewrów (1.8.0, F27, F35)', () => {
  const input = (over: Partial<CourseInput> = {}): CourseInput => ({
    month: '2026-10',
    shields: zl(9000),
    hull: zl(12000),
    goals: [{ id: 'G', name: 'Wakacje', amount: 0, target: zl(6000), deadline: '2027-08' }],
    salaryOf: () => zl(3000),
    costs: zl(2500),
    layers: { shieldSalaries: 3, hullMonths: 6 },
    minShieldSalaries: 1,
    income: { work: zl(3500), trading: zl(500) },
    extras: new Map(),
    debt: 0,
    ...over
  })

  it('miesiąc po miesiącu: pensja z osłon, koszty, wpływy dokowane (osłony → kadłub → cele), reszta pensji do osłon', () => {
    const c = course(input(), 'median')
    expect(c.months.slice(0, 4).map((m) => [m.month, m.low, m.shields, m.hull, m.goals.G])).toEqual([
      ['2026-11', zl(6000), zl(9500), zl(13000), 0],
      ['2026-12', zl(6500), zl(9500), zl(14500), 0],
      ['2027-01', zl(6500), zl(9500), zl(15000), zl(1000)],
      ['2027-02', zl(6500), zl(9500), zl(15000), zl(2500)]
    ])
    expect(c.shieldsFull).toBe('2026-11')
    expect(c.hullFull).toBe('2027-01')
    expect(c.goalEta.G).toBe('2027-05')
    expect(c.belowMin).toEqual([])
    expect(c.months[0]!.range).toBeCloseTo((zl(9500) + zl(13000)) / zl(2500))
  })

  it('kursy: bez XTB, mediana, średnia z panelu Przychody', () => {
    const stats = { months: [], windows: { 3: { months: 3, work: 1, trading: 1, total: 2 }, 6: { months: 6, work: 2, trading: 2, total: 4 }, 12: { months: 12, work: zl(3400), trading: zl(800), total: zl(4200) } }, median: { months: 12, work: zl(3500), trading: zl(500), total: zl(4000) } }
    expect(courseIncome(stats, 'noXtb')).toEqual({ work: zl(3500), trading: 0 })
    expect(courseIncome(stats, 'median')).toEqual({ work: zl(3500), trading: zl(500) })
    expect(courseIncome(stats, 'average')).toEqual({ work: zl(3400), trading: zl(800) })
  })

  it('raty z pensji (F15) w kursie: od miesiąca, gdy osłony i kadłub pełne na przełomie', () => {
    const c = course(input({ goals: [{ id: 'G', name: 'Wakacje', amount: 0, target: zl(6000), deadline: '2027-03', rates: [{ from: '2026-11', until: null }] }] }), 'median')
    // February: full at the turn – 5 000 over 2 months; the costs take the shields then (the salary went to the goal), so
    // March is not full at its turn.
    expect(c.months.map((m) => m.rates).slice(0, 5)).toEqual([0, 0, 0, zl(2500), 0])
    expect(c.months[3]!.low).toBe(zl(4500))
  })

  it('manewry: zakup z osłon pod minimum, pensja od miesiąca, bez XTB, koszty +%, nowy cel, nowy kontener – nic się nie zapisuje', () => {
    const base = input()
    const buy = course(maneuver(base, { purchase: { amount: zl(5000), month: '2026-12', from: 'shields' } }), 'median')
    expect(buy.months[1]!.low).toBe(zl(1500))
    expect(buy.belowMin).toEqual(['2026-12'])
    const now = course(maneuver(base, { purchase: { amount: zl(3000), month: '2026-10', from: 'shields' } }), 'median')
    expect(now.rangeNow).toBeCloseTo((zl(6000) + zl(12000)) / zl(2500))
    expect(course(maneuver(base, { salary: { amount: zl(3500), from: '2027-01' } }), 'median').months.map((m) => m.salary).slice(1, 3)).toEqual([zl(3000), zl(3500)])
    expect(course(maneuver(base, { noXtbMonths: 2 }), 'median').months.map((m) => m.income).slice(0, 3)).toEqual([zl(3500), zl(3500), zl(4000)])
    expect(maneuver(base, { costsPct: 10, container: { amount: zl(1200), cycleMonths: 12 } }).costs).toBe(zl(2850))
    const goal = course(maneuver(base, { goal: { name: 'Laptop', target: zl(4000), deadline: null, rate: false } }), 'median')
    expect(goal.goalEta[MANEUVER_GOAL]).not.toBeUndefined()
    // From a goal's money: the goal pays what it holds, the rest the shields.
    const fromGoal = course(maneuver(input({ goals: [{ id: 'G', name: 'Wakacje', amount: zl(1000), target: zl(6000), deadline: null }] }), { purchase: { amount: zl(1500), month: '2026-11', from: 'G' } }), 'median')
    expect(fromGoal.months[0]!.low).toBe(zl(5500))
    expect(base.extras.size).toBe(0)
  })
})

// ------------------------------------------------------------------ F37

describe('plan roczny (1.8.0, F37)', () => {
  const categories = createDefaultSettings(AT).settings.categories
  it('pensja i koperty miesiąc po miesiącu: limit w mocy, własny plan, fakt, rok wcześniej, przekroczenie; edycja od bieżącego', () => {
    const plans = [plan('2026-01', zl(3000), { [FOOD]: zl(1000), [AUTO]: zl(300) }), plan('2026-06', zl(3200), { [FOOD]: zl(1100), [AUTO]: zl(300) })]
    const transactions = [tx('2026-03-05', -zl(350), { categoryId: AUTO }), tx('2025-12-10', -zl(800), { categoryId: FOOD }), tx('2026-12-01', -zl(5), { categoryId: FOOD })]
    const y = yearPlan('2026', { plans, categories, transactions, containers: [], today: '2026-10-19' })
    expect(y.months).toHaveLength(12)
    const salary = y.rows[0]!
    expect(salary.cells.map((c) => c.limit)).toEqual([...Array(5).fill(zl(3000)), ...Array(7).fill(zl(3200))])
    expect(salary.cells.filter((c) => c.own).map((c) => c.month)).toEqual(['2026-01', '2026-06'])
    expect(salary.cells.filter((c) => c.editable).map((c) => c.month)).toEqual(['2026-10', '2026-11', '2026-12'])
    expect(salary.total).toBe(5 * zl(3000) + 7 * zl(3200))
    const auto = y.rows.find((r) => r.id === AUTO)!
    expect(auto.cells[2]).toMatchObject({ month: '2026-03', limit: zl(300), spent: zl(350), over: true })
    // A month ahead: no fact yet (a purchase written ahead does not count).
    expect(y.rows.find((r) => r.id === FOOD)!.cells[11]).toMatchObject({ spent: null, yearAgo: zl(800) })
    expect(copyOnMonths('2026', '2026-03', plans)).toEqual(['2026-03', '2026-06'])
    expect(copyOnMonths('2026', '2026-07', plans)).toEqual(['2026-07'])
  })
})

// ------------------------------------------------------------------ the rules' edges (mutations of 1.8.0)

describe('granice i reguły 1.8.0', () => {
  const categories = createDefaultSettings(AT).settings.categories
  const accounts = createDefaultSettings(AT).settings.accounts
  const TODAY = '2026-10-19'
  const goal = (over = {}) => goalSchema.parse({ ...base(), name: 'Wakacje', target: zl(6000), priority: 1, deadline: '2027-02', rates: [{ from: '2026-09', until: null }], ...over })
  const settingsOf = (hull: number) => settingsWith({ budget: { start: '2026-09-01', initial: { shields: 0, hull, goals: {} } }, layers: { assumedCosts: zl(2000) } })

  it('rata z pensji: kadłub niepełny na przełomie – bez raty; cel zarchiwizowany – bez raty', () => {
    // Shields 16 000 (full), the hull 8 000 of 12 000.
    const s = fleet({ settings: settingsOf(zl(8000)), balances: [opening('2026-09-01', zl(24000))], months: [plan('2026-09', zl(3000))], goals: [goal()], now: '2026-09-15T12:00:00+02:00' })
    expect(ratesOf(s.log, '2026-09')).toEqual(new Map())
    const archived = goal({ archived: true })
    const a = fleet({ settings: settingsOf(zl(12000)), balances: [opening('2026-09-01', zl(24000))], months: [plan('2026-09', zl(3000))], goals: [archived], now: '2026-09-15T12:00:00+02:00' })
    expect(ratesOf(a.log, '2026-09')).toEqual(new Map())
  })

  it('zapas koperty: najwyżej łupy; koperta bez limitu w planie miesiąca – limit z samego zapasu', () => {
    const settings = settingsWith({ budget: { start: '2026-09-01' }, layers: { assumedCosts: zl(2000) } })
    // The decision kept 5 000 in Auto, the loot was 2 900: Auto gets the 2 900.
    const big = lootDecision(zl(9000), { goals: {}, envelopes: { [AUTO]: zl(5000) }, nextMonth: 0 }, '2026-10-02T10:00:00.000Z')
    const months = [plan('2026-09', zl(3000), { [AUTO]: zl(300) }, { loot: big }), plan('2026-10', zl(3000), {})]
    const s = fleet({ settings, balances: [opening('2026-09-01', zl(20000))], months, transactions: [tx('2026-09-05', -zl(100), { categoryId: AUTO })], now: '2026-10-05T12:00:00+02:00' })
    expect(keptOf(s.log, '2026-10')).toEqual(new Map([[AUTO, zl(2900)]]))
    // October's own plan has no Auto envelope: its limit is the kept part alone.
    expect(s.envelopes.find((e) => e.categoryId === AUTO)).toMatchObject({ limit: zl(2900), spent: 0 })
  })

  it('podział pensji: zapas i pokrycia w puli codziennej; koperta bez limitu z samym zapasem', () => {
    const daily = salarySplit(plan('2026-10', zl(3000), { [FOOD]: zl(1000) }), '2026-10', [], categories, undefined, 0, { extra: new Map([[FOOD, -zl(100)]]) })
    expect(daily.dailyBase).toBe(Math.floor(zl(900) / 31))
    expect(daily.envelopes.daily).toMatchObject({ total: zl(1000), extra: -zl(100) })
    const kept = salarySplit(plan('2026-10', zl(3000), {}), '2026-10', [], categories, undefined, 0, { extra: new Map([[AUTO, zl(200)]]) })
    expect(kept.envelopes.planned.items).toEqual([{ categoryId: AUTO, limit: 0, extra: zl(200) }])
  })

  it('boje: dzień 30 dni po terminie – jeszcze po terminie, 31 – przepadł; podobna nazwa przed bliższym dniem; pierwszy rok co roku', () => {
    const late = (date: string) => scheduledDays([sched({ name: 'X', date, amount: -zl(10) })], [], TODAY, '2026-01-01', '2027-01-01')[0]!.state
    expect(late('2026-09-19')).toBe('late')
    expect(late('2026-09-18')).toBe('lapsed')
    const wesele = sched({ name: 'Wesele Kasi', date: '2026-10-16', amount: -zl(1500) })
    const sameDay = tx('2026-10-16', -zl(1500), { counterparty: 'Sklep' })
    const similar = tx('2026-10-14', -zl(1500), { counterparty: 'Wesele Kasi Sala' })
    expect(scheduledDays([wesele], [sameDay, similar], TODAY, '2026-10-01', '2026-11-01')[0]!.txId).toBe(similar.id)
    // A yearly one set up for a later year: never a day before its first.
    expect(nextDayOf({ date: '2027-12-01', yearly: true }, TODAY)).toBe('2027-12-01')
  })

  it('salda kont: zaległa płatność dziś; operacja z dziś już w saldzie; źródło – tylko z całą kwotą do dnia braku', () => {
    const item = (date: string, amount: number, accountId: string, name = 'Czynsz') => ({ key: `${name}:${date}`, date, kind: 'fixed' as const, name, amount, direction: 'out' as const, note: '', accountId })
    const ahead = (balances: Array<{ id: string; balance: number }>, items: ReturnType<typeof item>[], transactions: Transaction[] = []) => accountsAhead({ today: TODAY, balances, accounts, items, transactions, end: '2027-01-17' })
    const late = ahead([{ id: MBANK_ACCOUNT_ID, balance: zl(100) }], [item('2026-10-15', zl(300), MBANK_ACCOUNT_ID)])
    expect(late.find((a) => a.accountId === MBANK_ACCOUNT_ID)!.short).toEqual({ date: TODAY, amount: zl(200), cause: 'Czynsz' })
    const todays = ahead([{ id: MBANK_ACCOUNT_ID, balance: zl(100) }], [], [tx(TODAY, -zl(50))])
    expect(todays.find((a) => a.accountId === MBANK_ACCOUNT_ID)!.moves).toEqual([])
    const tooLittle = ahead([{ id: MBANK_ACCOUNT_ID, balance: zl(1000) }, { id: XTB_WALLET_ACCOUNT_ID, balance: zl(300) }], [item('2026-11-10', zl(1500), MBANK_ACCOUNT_ID)])
    expect(tooLittle.find((a) => a.accountId === MBANK_ACCOUNT_ID)!.source).toBeNull()
    // Portfel XTB pays 1 800 after mBank's short – it keeps the 500 to that day.
    const later = ahead([{ id: MBANK_ACCOUNT_ID, balance: zl(1000) }, { id: XTB_WALLET_ACCOUNT_ID, balance: zl(2000) }], [item('2026-11-10', zl(1500), MBANK_ACCOUNT_ID), item('2026-12-01', zl(1800), XTB_WALLET_ACCOUNT_ID, 'Rata')])
    expect(later.find((a) => a.accountId === MBANK_ACCOUNT_ID)!.source?.accountId).toBe(XTB_WALLET_ACCOUNT_ID)
  })

  it('kurs: rata najwyżej z energii miesiąca', () => {
    const c = course(
      {
        month: '2026-10',
        shields: zl(9000),
        hull: zl(15000),
        goals: [{ id: 'G', name: 'Laptop', amount: 0, target: zl(10000), deadline: '2026-12', rates: [{ from: '2026-11', until: null }] }],
        salaryOf: () => zl(3000),
        costs: zl(2500),
        layers: { shieldSalaries: 3, hullMonths: 6 },
        minShieldSalaries: 1,
        income: { work: 0, trading: 0 },
        extras: new Map(),
        debt: 0
      },
      'median'
    )
    // 10 000 over November and December = 5 000 a month; the salary is 3 000.
    expect(c.months[0]!.rates).toBe(zl(3000))
    expect(c.months[0]!.goals.G).toBe(zl(3000))
  })

  it('plan roczny: bez zakupów do zwrotu i płatności kontenerów; kategoria zarchiwizowana tylko z limitem; „kopiuj dalej” w swoim roku', () => {
    const container = containerSchema.parse({ ...base(), name: 'Ubezpieczenie', amount: zl(200), dueMonth: '2026-01', dueDay: 10 })
    const transactions = [
      tx('2026-03-05', -zl(100), { categoryId: AUTO }),
      tx('2026-03-06', -zl(40), { categoryId: AUTO, refundable: true }),
      tx('2026-03-10', -zl(200), { categoryId: AUTO, containerId: container.id })
    ]
    const archived = categories.map((c) => (c.id === FUN || c.id === FOOD ? { ...c, archived: true } : c))
    const plans = [plan('2026-01', zl(3000), { [AUTO]: zl(300), [FOOD]: zl(900) }), plan('2027-02', zl(3000))]
    const y = yearPlan('2026', { plans, categories: archived, transactions, containers: [container], today: TODAY })
    expect(y.rows.find((r) => r.id === AUTO)!.cells[2]!.spent).toBe(zl(100))
    expect(y.rows.some((r) => r.id === FUN)).toBe(false)
    expect(y.rows.some((r) => r.id === FOOD)).toBe(true)
    expect(copyOnMonths('2026', '2026-07', plans)).toEqual(['2026-07'])
  })

  it('radar: boja-wydatek ponad osłony – reszta z kadłuba, osłony 0', () => {
    const items = radar({
      today: TODAY,
      plans: [plan('2026-10', zl(3000))],
      containers: [],
      tanks: [],
      loans: [],
      money: (g) => `${g / 100} zł`,
      scheduled: scheduledWindow([sched({ name: 'Auto', date: '2026-10-25', amount: -zl(10000) })], [], TODAY, 90),
      layers: { shields: zl(9000), hull: zl(12000), goals: [], targets: { shields: zl(9000), hull: zl(12000) } }
    })
    expect(items.find((i) => i.kind === 'plan')?.shieldsAfter).toBe(0)
  })

  it('odprawa i powiadomienia: 3 dni przed – żółte; koniec kontenera za 14 dni – jest; konta – z ustawieniem komputera; pokrycie z jutra – nie w dzienniku', () => {
    const [d] = scheduledWindow([sched({ name: 'Rata', date: '2026-10-22', amount: -zl(10) })], [], TODAY, 90)
    expect(planItem(d!, (g) => `${g / 100} zł`)).toMatchObject({ level: 'yellow' })
    const f = fleet({ settings: settingsWith({ budget: { start: '2026-09-01' } }), balances: [opening('2026-09-01', zl(9000))], months: [plan('2026-09', zl(3000))], now: '2026-10-19T09:00:00+02:00' })
    const ending = containerSchema.parse({ ...base(), name: 'Internet', amount: zl(89), dueMonth: '2026-01', dueDay: 2, until: '2026-11' })
    expect(lastPaymentOf(ending, TODAY)).toBe('2026-11-02')
    expect(briefing({ fleet: f, containers: [ending], imports: [], label: () => '', money: (g) => `${g / 100} zł` }).some((i) => i.kind === 'end')).toBe(true)
    const ahead = accountsAhead({ today: TODAY, balances: [{ id: MBANK_ACCOUNT_ID, balance: zl(100) }], accounts, items: [{ key: 'k', date: '2026-10-25', kind: 'fixed', name: 'Czynsz', amount: zl(300), direction: 'out', note: '', accountId: MBANK_ACCOUNT_ID }], transactions: [], end: '2027-01-17' })
    const prefs = machinePrefsFrom({}).notify
    const notices = (accountsOn: boolean) => dueNotices({ fleet: f, containers: [], imports: [], label: () => '', money: (g) => `${g / 100} zł`, accounts: ahead, prefs: { ...prefs, accounts: accountsOn }, quietHours: { from: '23:00', to: '06:00' }, time: '12:00', opened: false }).filter((n) => n.title === 'Za mało na koncie przed płatnością')
    expect(notices(true)).toHaveLength(1)
    expect(notices(false)).toHaveLength(0)
    const view = gameView([], { ...settingsWith().game, start: '2026-09-01' }, TODAY, [{ kind: 'cover', date: '2026-10-20', from: FUN, to: AUTO, amount: zl(10) }])
    expect(view.log.some((e) => e.kind === 'cover')).toBe(false)
  })
})

// ------------------------------------------------------------------ the review of group T (1.8.0)

describe('przegląd grupy T (1.8.0)', () => {
  const TODAY = '2026-10-19'
  const accounts = createDefaultSettings(AT).settings.accounts
  const categories = createDefaultSettings(AT).settings.categories

  it('operacja zapisana z wyprzedzeniem zamyka boję – saldo konta liczy ją raz', () => {
    const wesele = sched({ name: 'Wesele', date: '2026-11-15', amount: -zl(2000), accountId: MBANK_ACCOUNT_ID })
    const ahead = tx('2026-11-15', -zl(2000), { counterparty: 'Wesele' })
    const days = scheduledWindow([wesele], [ahead], TODAY, 90)
    expect(days[0]).toMatchObject({ state: 'done', txId: ahead.id })
    const items = radar({ today: TODAY, plans: [], containers: [], tanks: [], loans: [], money: (g) => `${g}`, scheduled: days })
    expect(items.some((i) => i.kind === 'plan')).toBe(false)
    const out = accountsAhead({ today: TODAY, balances: [{ id: MBANK_ACCOUNT_ID, balance: zl(3000) }], accounts, items, transactions: [ahead], end: '2027-01-17' })
    expect(out.find((a) => a.accountId === MBANK_ACCOUNT_ID)!.low).toEqual({ date: '2026-11-15', amount: zl(1000) })
  })

  it('przypomnienie dalej niż 90 dni: dzień czytany tak daleko, jak sięga najdłuższe', () => {
    const dowod = sched({ name: 'Dowód', date: '2027-04-10', remind: [180, 30] })
    expect(remindReach([dowod], 90)).toBe(180)
    expect(remindReach([sched({ name: 'X', date: TODAY })], 90)).toBe(90)
    const days = scheduledWindow([dowod], [], TODAY, remindReach([dowod], 90))
    expect(planItem(days[0]!, (g) => `${g}`)).toMatchObject({ key: `plan:${dowod.id}:2027-04-10:180` })
  })

  const input = (over: Partial<CourseInput> = {}): CourseInput => ({
    month: '2026-10',
    shields: zl(9000),
    hull: zl(12000),
    goals: [],
    salaryOf: (m) => (m >= '2027-03' ? zl(4000) : zl(3000)),
    planMonths: ['2026-01', '2027-03'],
    costs: zl(2500),
    layers: { shieldSalaries: 3, hullMonths: 6 },
    minShieldSalaries: 1,
    income: { work: zl(3000), trading: 0 },
    extras: new Map(),
    debt: 0,
    ...over
  })

  it('manewr pensji do następnego miesiąca z własnym planem; koszty nieznane zostają nieznane', () => {
    const m = maneuver(input(), { salary: { amount: zl(3500), from: '2026-12' } })
    expect(['2026-11', '2026-12', '2027-02', '2027-03', '2027-05'].map((x) => m.salaryOf(x))).toEqual([zl(3000), zl(3500), zl(3500), zl(4000), zl(4000)])
    expect(maneuver(input({ costs: null }), { costsPct: 10 }).costs).toBeNull()
    expect(maneuver(input({ costs: null }), { container: { amount: zl(1200), cycleMonths: 12 } }).costs).toBeNull()
    expect(maneuver(input(), { costsPct: 10 }).costs).toBe(zl(2750))
  })

  it('zasięg teraz z całym długiem – rata tego miesiąca i zaległa jeszcze niezapłacone', () => {
    const c = course(input({ debt: zl(3000), installments: [{ month: '2026-09', amount: zl(1000) }, { month: '2026-10', amount: zl(1000) }, { month: '2026-11', amount: zl(1000) }] }), 'median')
    expect(c.rangeNow).toBeCloseTo((zl(9000) + zl(12000) - zl(3000)) / zl(2500))
  })

  it('plan roczny: przekroczenie według limitu silnika – z zapasem i pokryciami miesiąca', () => {
    const plans = [plan('2026-01', zl(3000), { [AUTO]: zl(800) })]
    const transactions = [tx('2026-10-05', -zl(900), { categoryId: AUTO })]
    const extraOf = (m: string) => (m === '2026-10' ? new Map([[AUTO, zl(200)]]) : new Map<string, number>())
    const y = yearPlan('2026', { plans, categories, transactions, containers: [], today: TODAY, extraOf })
    expect(y.rows.find((r) => r.id === AUTO)!.cells[9]).toMatchObject({ limit: zl(800), extra: zl(200), spent: zl(900), over: false })
    expect(yearPlan('2026', { plans, categories, transactions, containers: [], today: TODAY }).rows.find((r) => r.id === AUTO)!.cells[9]).toMatchObject({ extra: 0, over: true })
  })
})
