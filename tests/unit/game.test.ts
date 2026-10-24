import { describe, expect, it } from 'vitest'
import {
  advanceGame,
  chooseMission,
  gameMonthId,
  gameStartFor,
  gameView,
  killzoneOf,
  missionId,
  missionStatus,
  namesNote,
  newGameMonth,
  promotionProgress,
  rankChangeId,
  rankOf,
  rateDay,
  sundayOf,
  type GameInput
} from '@shared/calc/game'
import { isoWeekOf, mondayOfWeek } from '@shared/calc/dates'
import { createDefaultSettings } from '@shared/defaults'
import {
  balanceSchema,
  containerSchema,
  defaultCategoryId,
  dockingSchema,
  gameDaySchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  ulidSchema,
  type Container,
  type GameMonth,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K3000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const AUTO = defaultCategoryId(3)
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: FOOD, ...over })

/**
 * October 2026: the budget from the 1st with 20 000 zł (shields 9 300 to their target, hull 10 700), a salary of 3 100 zł
 * (the shields' minimum = one salary), the daily envelope 3 100 zł (100 zł a day), the planned envelope Auto 500 zł; the
 * game from Monday 5 October.
 */
function world(o: { transactions?: Transaction[]; containers?: Container[]; game?: GameMonth[]; opening?: number; settings?: (s: Settings) => Settings; dockings?: GameInput['dockings'] } = {}): GameInput {
  const s0 = createDefaultSettings(AT).settings
  const s1: Settings = { ...s0, budget: { ...s0.budget, start: '2026-10-01' }, layers: { ...s0.layers, assumedCosts: zl(3000) }, game: { ...s0.game, start: '2026-10-05' } }
  return {
    settings: o.settings ? o.settings(s1) : s1,
    balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: o.opening ?? zl(20000) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(3100), envelopes: { [FOOD]: zl(3100), [AUTO]: zl(500) } })],
    transactions: o.transactions ?? [],
    containers: o.containers ?? [],
    dockings: o.dockings ?? [],
    game: o.game ?? []
  }
}

const orders = (r: ReturnType<typeof rateDay>) => r.violations.map((v) => [v.order, v.serious, v.amount])

describe('ocena dnia (D73): naruszenia zwykłe i poważne', () => {
  it('dzień potwierdzony „Dziś bez wydatków” (F13) – znak w dzienniku wachty, tylko gdy naprawdę bez wydatków', () => {
    const confirmed = (s: Settings): Settings => ({ ...s, game: { ...s.game, noSpend: { '2026-10-06': '2026-10-06T19:30:00.000Z', '2026-10-07': '2026-10-07T19:30:00.000Z' } } })
    expect(rateDay(world({ settings: confirmed }), '2026-10-06').tags).toEqual(['nospend'])
    expect(rateDay(world({ settings: confirmed, transactions: [tx('2026-10-07', -zl(20))] }), '2026-10-07').tags).toEqual([])
    expect(rateDay(world(), '2026-10-06').tags).toEqual([])
  })

  it('dzień bez wpisów jest zgodny; przydział dnia przekroczony – zwykłe', () => {
    expect(rateDay(world(), '2026-10-06')).toMatchObject({ status: 'ok', violations: [], tags: [] })
    // The 7th: 3 100 zł over 25 days = 124 zł; 200 zł spent – 76 zł over.
    const r = rateDay(world({ transactions: [tx('2026-10-07', -zl(200))] }), '2026-10-07')
    expect(r.status).toBe('broken')
    expect(orders(r)).toEqual([['daily', false, zl(76)]])
  })

  it('koperta planowa: przekroczona do 20% – zwykłe, ponad 20% – poważne (każde raz, w dniu przekroczenia)', () => {
    const w = world({ transactions: [tx('2026-10-08', -zl(550), { categoryId: AUTO }), tx('2026-10-09', -zl(100), { categoryId: AUTO }), tx('2026-10-10', -zl(10), { categoryId: AUTO })] })
    expect(orders(rateDay(w, '2026-10-08'))).toEqual([['envelope', false, zl(50)]])
    expect(orders(rateDay(w, '2026-10-09'))).toEqual([['envelope-serious', true, zl(150)]])
    expect(rateDay(w, '2026-10-10').violations).toEqual([])
    expect(rateDay(w, '2026-10-08').violations[0]!.ref).toBe(AUTO)
  })

  it('zakup w ciszy nocnej i dopłata do XTB wbrew firewallowi – poważne', () => {
    const night = rateDay(world({ transactions: [tx('2026-10-10', -zl(30), { time: '23:30', counterparty: 'Żabka', logNote: 'głodny' })] }), '2026-10-10')
    expect(night.violations).toEqual([{ order: 'quiet', serious: true, amount: zl(30), ref: expect.any(String), note: 'Żabka' }])
    // A night time without its entry in the log (N10, D40): a purchase of the day written down at night – no violation.
    expect(rateDay(world({ transactions: [tx('2026-10-10', -zl(30), { time: '23:30', counterparty: 'Żabka' })] }), '2026-10-10').violations).toEqual([])
    // N-PC-19: a night expense with a log entry that is explicitly marked as planned (impulse: 'plan') is excused.
    expect(rateDay(world({ transactions: [tx('2026-10-10', -zl(30), { time: '23:30', counterparty: 'Apteka', logNote: 'leki na dyżurze', impulse: 'plan' })] }), '2026-10-10').violations).toEqual([])
    // Shields 6 200 zł against their target 9 300 zł: a top-up of the trading account breaks the firewall (the shields stay
    // above their minimum of 3 100 zł).
    const top = rateDay(world({ transactions: [tx('2026-10-11', -zl(1000), { kind: 'trading', categoryId: null })] }), '2026-10-11')
    expect(orders(top)).toEqual([['firewall', true, zl(1000)]])
  })

  it('osłony poniżej minimum: z decyzji – poważne; przez wypłatę pensji – nie', () => {
    const lent = rateDay(world({ transactions: [tx('2026-10-12', -zl(3500), { kind: 'loan' })] }), '2026-10-12')
    expect(orders(lent)).toEqual([['shields', true, zl(400)]])
    // 5 000 zł at the start: the salary leaves 1 900 zł in the shields – below the minimum, but not by a decision; a
    // purchase from the energy does not touch them either.
    const poor = world({ opening: zl(5000), transactions: [tx('2026-10-02', -zl(50))] })
    expect(rateDay(poor, '2026-10-01').violations).toEqual([])
    expect(rateDay(poor, '2026-10-02').violations).toEqual([])
  })

  it('kontener dodany ponad linię zanurzenia – zwykłe, tylko w dniu zmiany', () => {
    const rent = containerSchema.parse({ ...base(), createdAt: '2026-10-13T10:00:00.000Z', updatedAt: '2026-10-13T10:00:00.000Z', name: 'Czynsz', amount: zl(1500), dueMonth: '2026-10', dueDay: 10 })
    const w = world({ containers: [rent] })
    expect(rateDay(w, '2026-10-13').violations).toEqual([{ order: 'cargo', serious: false, amount: zl(1500), ref: rent.id, note: 'Czynsz' }])
    expect(rateDay(w, '2026-10-14').violations).toEqual([])
    expect(rateDay(w, '2026-10-12').violations).toEqual([])
    // Many containers with long names the same day: the note stays short and the month always valid (B32).
    const many = Array.from({ length: 9 }, (_, i) =>
      containerSchema.parse({ ...base(), createdAt: '2026-10-13T10:00:00.000Z', updatedAt: '2026-10-13T10:00:00.000Z', name: `${'Bardzo długa nazwa dostawcy '.repeat(3).slice(0, 78)}${i}`, amount: zl(200), dueMonth: '2026-10', dueDay: 10 })
    )
    const note = rateDay(world({ containers: many }), '2026-10-13').violations[0]!.note
    expect(note.endsWith('i 6 innych')).toBe(true)
    expect(note.length).toBeLessThanOrEqual(500)
    expect(namesNote(['A', 'B'])).toBe('A, B')
    expect(gameDaySchema.parse({ status: 'broken', frozenAt: AT, violations: [{ order: 'cargo', note: 'x'.repeat(900) }] }).violations[0]!.note).toHaveLength(500)
  })

  it('smaczki ICT: Judas Swing (impuls), Turtle Soup (zwrot towaru), Liquidity sweep (energia dokładnie 0 zł)', () => {
    const w = world({ transactions: [tx('2026-10-14', -zl(20), { impulse: 'impulse' }), tx('2026-10-14', zl(15)), tx('2026-10-01', -zl(100))] })
    expect(rateDay(w, '2026-10-14').tags).toEqual(['judas', 'turtle'])
    // The 1st: 3 100 zł over 31 days = 100 zł – spent to the grosz.
    expect(rateDay(w, '2026-10-01')).toMatchObject({ status: 'ok', tags: ['sweep'] })
  })
})

describe('zamrażanie (T9), seria, stopnie (D73)', () => {
  it('stałe identyfikatory są poprawnymi ULID-ami; tydzień ISO', () => {
    for (const id of [gameMonthId('2026-10'), missionId('2026-W41'), rankChangeId('2026-10-31')]) expect(ulidSchema.safeParse(id).success).toBe(true)
    expect(isoWeekOf('2026-10-05')).toBe('2026-W41')
    expect(mondayOfWeek('2026-W41')).toBe('2026-10-05')
    expect(sundayOf('2026-W41')).toBe('2026-10-11')
    expect(isoWeekOf('2027-01-01')).toBe('2026-W53')
    expect(gameStartFor('2026-10-17T21:00:00Z')).toBe('2026-10-18')
  })

  it('dzień zamraża się 24 h po końcu; zamrożony nie zmienia się po korekcie danych; misja tygodnia', () => {
    // Thursday the 8th at noon: the 5th and the 6th are frozen, the 7th not yet.
    const a = advanceGame(world(), '2026-10-08T10:00:00Z')
    const oct = a.months.find((m) => m.month === '2026-10')!
    expect(Object.keys(oct.days)).toEqual(['2026-10-05', '2026-10-06'])
    expect(oct.id).toBe(gameMonthId('2026-10'))
    expect(oct.missions).toEqual([expect.objectContaining({ id: missionId('2026-W41'), week: '2026-W41', done: false, evaluatedAt: null })])
    // Advanced again – nothing new; a purchase entered later for the 6th does not change its rating.
    const late = world({ game: a.months, transactions: [tx('2026-10-06', -zl(900))] })
    expect(advanceGame(late, '2026-10-08T11:00:00Z').months).toEqual([])
    expect(advanceGame(late, '2026-10-09T10:00:00Z').months[0]!.days['2026-10-06']!.status).toBe('ok')
    expect(advanceGame(late, '2026-10-09T10:00:00Z').months[0]!.days['2026-10-07']!.status).toBe('ok')
  })

  it('porcjami (W16): najwyżej maxDays dni na raz, misja tygodnia po nadrobieniu; miesiąc innej wersji pominięty', () => {
    // 1 November at noon: 5 October – 30 October to freeze, in portions of 2.
    const first = advanceGame(world(), '2026-11-01T10:00:00Z', { maxDays: 2 })
    expect(first.more).toBe(true)
    expect(Object.keys(first.months[0]!.days)).toEqual(['2026-10-05', '2026-10-06'])
    expect(first.months[0]!.missions).toEqual([])
    // October written by a newer version (this one may not write it): November's days go on, the mission comes.
    const locked = advanceGame(world({ game: first.months }), '2026-11-04T10:00:00Z', { maxDays: 2, locked: new Set(['2026-10']) })
    expect(locked.months.map((m) => m.month)).toEqual(['2026-11'])
    expect(Object.keys(locked.months[0]!.days)).toEqual(['2026-11-01', '2026-11-02'])
    expect(locked.more).toBeUndefined()
    expect(locked.months[0]!.missions.map((m) => m.week)).toEqual(['2026-W45'])
  })

  it('awans po 30 dniach zgodnych w ostatnich 35; wykonana misja = 3 dni', () => {
    // 30 compliant days from the 5th: the promotion on 3 November.
    const a = advanceGame(world(), '2026-11-05T10:00:00Z')
    expect(a.events.filter((e) => e.kind === 'rank')).toEqual([{ kind: 'rank', change: 'up', rank: 'ensign', day: '2026-11-03' }])
    expect(rankOf(a.months)).toEqual({ rank: 'ensign', since: '2026-11-03' })
    expect(a.months.find((m) => m.month === '2026-11')!.promotions).toEqual([{ id: rankChangeId('2026-11-03'), at: '2026-11-05T10:00:00Z', rank: 'ensign', change: 'up', day: '2026-11-03' }])
    // A mission done in the first week: 27 days are enough (27 + 3).
    const done = { ...newGameMonth('2026-10', AT), missions: [{ id: missionId('2026-W41'), template: 'nospend', week: '2026-W41', done: true, evaluatedAt: '2026-10-13T00:00:00Z', params: {} }] }
    const b = advanceGame(world({ game: [done] }), '2026-11-05T10:00:00Z')
    expect(b.events.find((e) => e.kind === 'rank')).toEqual({ kind: 'rank', change: 'up', rank: 'ensign', day: '2026-10-31' })
    // The window restarts after a promotion.
    expect(promotionProgress(a.months, '2026-11-03', world().settings.game, '2026-10-05')).toMatchObject({ ok: 0, bonus: 0, need: 30, from: '2026-11-04' })
  })

  it('degradacja przy 3. poważnym naruszeniu w miesiącu; Kadet nie spada niżej', () => {
    const night = (date: string) => tx(date, -zl(10), { time: '23:30', logNote: 'nocny zakup' })
    const promoted = { ...newGameMonth('2026-10', AT), promotions: [{ id: rankChangeId('2026-10-04'), at: AT, rank: 'ensign', change: 'up' as const, day: '2026-10-04' }] }
    const a = advanceGame(world({ game: [promoted], transactions: [night('2026-10-07'), night('2026-10-12'), night('2026-10-20')] }), '2026-10-25T10:00:00Z')
    expect(a.events.filter((e) => e.kind === 'rank')).toEqual([{ kind: 'rank', change: 'down', rank: 'cadet', day: '2026-10-20' }])
    const cadet = advanceGame(world({ transactions: [night('2026-10-07'), night('2026-10-12'), night('2026-10-20')] }), '2026-10-25T10:00:00Z')
    expect(cadet.events.filter((e) => e.kind === 'rank')).toEqual([])
    // The threshold lowered to 2 after the 2nd serious violation: the next one demotes (the count is past it).
    const two = (n: number) => world({ game: [promoted], transactions: [night('2026-10-07'), night('2026-10-12'), night('2026-10-20')], settings: (s) => ({ ...s, game: { ...s.game, demoteSerious: n } }) })
    const before = advanceGame(two(3), '2026-10-15T10:00:00Z')
    const after = advanceGame({ ...two(2), game: before.months }, '2026-10-25T10:00:00Z')
    expect(after.events.filter((e) => e.kind === 'rank')).toEqual([{ kind: 'rank', change: 'down', rank: 'cadet', day: '2026-10-20' }])
  })

  it('kontener podniesiony ponad linię zanurzenia: dzień, który widzi większą masę niż poprzedni zamrożony', () => {
    const tv = (amount: number) => containerSchema.parse({ ...base(), id: '01K3000000000000000000TV01', createdAt: '2026-09-20T10:00:00.000Z', updatedAt: '2026-09-20T10:00:00.000Z', name: 'Abonament', amount, dueMonth: '2026-10', dueDay: 5 })
    const a = advanceGame(world({ containers: [tv(zl(1000))] }), '2026-10-08T10:00:00Z')
    expect(a.months[0]!.days['2026-10-06']).toMatchObject({ status: 'ok', cargo: zl(1000) })
    // Raised to 1 500 zł (48% of the salary): the next frozen day is broken, the one after is not.
    const b = advanceGame(world({ containers: [tv(zl(1500))], game: a.months }), '2026-10-10T10:00:00Z')
    expect(b.months[0]!.days['2026-10-07']!.violations).toEqual([expect.objectContaining({ order: 'cargo', serious: false, amount: zl(1500) })])
    expect(b.months[0]!.days['2026-10-08']!.violations).toEqual([])
  })

  it('widok: seria, rekord, pasek dni, dziennik wachty (naruszenia, smaczki, misje, stopnie)', () => {
    const a = advanceGame(world({ transactions: [tx('2026-10-07', -zl(200)), tx('2026-10-08', -zl(20), { impulse: 'impulse' })] }), '2026-10-12T10:00:00Z')
    const v = gameView(a.months, world().settings.game, '2026-10-12')
    // Frozen: the 5th–10th; the 7th broken – the streak runs from the 8th.
    expect(v.lastFrozen).toBe('2026-10-10')
    expect(v.streak).toBe(3)
    expect(v.record).toBe(3)
    expect(v.strip.slice(-9).map((d) => d.state)).toEqual(['before', 'ok', 'ok', 'broken', 'ok', 'ok', 'ok', 'open', 'open'])
    expect(v.log.filter((e) => e.kind === 'violation')).toEqual([expect.objectContaining({ date: '2026-10-07', order: 'daily', serious: false })])
    expect(v.log.some((e) => e.kind === 'tag' && e.tag === 'judas' && e.date === '2026-10-08')).toBe(true)
    // Advanced first on Monday the 12th: this week gets its mission (a week that passed unseen gets none).
    expect(v.mission?.week).toBe('2026-W42')
    expect(v.missions.map((m) => m.week)).toEqual(['2026-W42'])
    expect(v.progress).toMatchObject({ ok: 5, bonus: 0, need: 30 })
    expect(v.hidden).toBe(13 - v.achievements.length)
  })
})

describe('misje tygodniowe (D73)', () => {
  it('słaby punkt z 4 tygodni: cisza nocna, potem kolejny; bez słabych punktów – po kolei', () => {
    const w = world({ transactions: [tx('2026-10-20', -zl(15), { time: '01:10', logNote: 'nocny zakup' })] })
    expect(chooseMission(w, '2026-10-26', null).template).toBe('quiet')
    expect(chooseMission(w, '2026-10-26', 'quiet').template).not.toBe('quiet')
  })

  it('Killzone: dzień × godzina z największymi wydatkami (z godziną), cel = połowa średniej tygodniowej', () => {
    const fridays = ['2026-10-02', '2026-10-09', '2026-10-16', '2026-10-23'].map((d) => tx(d, -zl(120), { time: '19:15' }))
    const other = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-13'].map((d) => tx(d, -zl(10), { time: '08:00' }))
    expect(killzoneOf([...fridays, ...other]).top).toEqual({ weekday: 5, hour: 19, cost: zl(480) })
    const pick = chooseMission(world({ transactions: [...fridays, ...other], settings: (s) => ({ ...s, import: { ...s.import, lastImport: { [MBANK_ACCOUNT_ID]: '2026-10-25T10:00:00Z' } } }) }), '2026-10-26', null)
    // No quiet hours, no envelope over, no impulses; the killzone has 480 of 520 zł.
    expect(pick).toEqual({ template: 'killzone', params: { weekday: 5, hour: 19, target: zl(60) } })
  })

  it('rozliczenie: importy, salda, dni bez wydatków, koperta', () => {
    const week = '2026-W43'
    const w = world({
      transactions: [tx('2026-10-19', -zl(30)), tx('2026-10-21', -zl(30)), tx('2026-10-22', -zl(80), { categoryId: AUTO })],
      settings: (s) => ({ ...s, import: { ...s.import, log: { '2026-10-19T09:00:00Z': MBANK_ACCOUNT_ID, '2026-10-23T18:00:00Z': MBANK_ACCOUNT_ID } } })
    })
    expect(missionStatus(w, { template: 'import', week, params: {} }, '2026-10-25')).toEqual({ ok: true, have: 2, need: 2 })
    // Sunday still running (N69): apart until it is over; judged with it frozen – counted.
    expect(missionStatus(w, { template: 'nospend', week, params: {} }, '2026-10-25')).toEqual({ ok: true, have: 3, need: 2, pending: 1 })
    const sunday = { ...newGameMonth('2026-10', AT), days: { '2026-10-25': { status: 'ok' as const, frozenAt: AT, violations: [], cls: null, cargo: null, tags: [] } } }
    expect(missionStatus(w, { template: 'nospend', week, params: {} }, '2026-10-25', [sunday])).toEqual({ ok: true, have: 4, need: 2 })
    // Mid-week: today apart, the days before counted.
    expect(missionStatus(w, { template: 'nospend', week, params: {} }, '2026-10-20')).toEqual({ ok: false, have: 0, need: 2, pending: 1 })
    expect(missionStatus(w, { template: 'envelope', week, params: { categoryId: AUTO, target: zl(70) } }, '2026-10-25')).toEqual({ ok: false, amount: zl(80) })
    expect(missionStatus(w, { template: 'balances', week, params: {} }, '2026-10-25')).toMatchObject({ ok: false, have: 0 })
  })

  it('misja rozliczana po zamrożeniu niedzieli', () => {
    const a = advanceGame(world(), '2026-10-08T10:00:00Z')
    const mission = a.months[0]!.missions[0]!
    const b = advanceGame(world({ game: a.months }), '2026-10-13T10:00:00Z')
    const judged = b.months.find((m) => m.month === '2026-10')!.missions.find((m) => m.id === mission.id)!
    expect(judged.evaluatedAt).toBe('2026-10-13T10:00:00Z')
    expect(b.events).toContainEqual({ kind: 'mission', template: mission.template, week: '2026-W41', done: judged.done })
    // The next week got its own mission, not last week's.
    expect(b.months.find((m) => m.month === '2026-10')!.missions.find((m) => m.week === '2026-W42')!.template).not.toBe(mission.template)
  })
})

describe('osiągnięcia (D73)', () => {
  it('Pełne osłony, Seria 7, Pierwsze dokowanie – raz, z dniem zdobycia', () => {
    const income = tx('2026-10-06', zl(4000), { kind: 'trading', categoryId: null })
    const dock = dockingSchema.parse({ ...base(), date: '2026-10-06', transactionId: income.id, ictjEntryId: 'X1', pool: 'current' })
    const a = advanceGame(world({ opening: zl(40000), transactions: [income], dockings: [dock] }), '2026-10-14T10:00:00Z')
    const won = a.events.filter((e) => e.kind === 'achievement')
    expect(won).toContainEqual({ kind: 'achievement', id: 'shields', day: '2026-10-05' })
    expect(won).toContainEqual({ kind: 'achievement', id: 'dock', day: '2026-10-06' })
    expect(won).toContainEqual({ kind: 'achievement', id: 'streak7', day: '2026-10-11' })
    expect(advanceGame(world({ opening: zl(40000), transactions: [income], dockings: [dock], game: a.months }), '2026-10-15T10:00:00Z').events.filter((e) => e.kind === 'achievement')).toEqual([])
  })
})

describe('N5: zakup sfinansowany przez domownika nie jest naruszeniem gry (D80 f, T107)', () => {
  it('cisza nocna: liczy się tylko moja część – zakup „finansuje” albo prezent bez naruszenia, wspólny – moja część', () => {
    const night = (over: Partial<Transaction>) => rateDay(world({ transactions: [tx('2026-10-12', -zl(30), { time: '23:30', counterparty: 'Żabka', logNote: 'nocny zakup', ...over })] }), '2026-10-12')
    expect(night({ refundable: true }).violations).toEqual([])
    expect(night({ refundable: true, gift: true }).violations).toEqual([])
    const half = night({
      splits: [
        { id: nextId(), amount: -zl(10), categoryId: FOOD, refundable: false, memberId: null, advance: false, note: '' },
        { id: nextId(), amount: -zl(20), categoryId: FOOD, refundable: true, memberId: null, advance: false, note: '' }
      ]
    })
    expect(half.violations).toEqual([{ order: 'quiet', serious: true, amount: zl(10), ref: expect.any(String), note: 'Żabka' }])
  })

  it('osłony poniżej minimum przez zakup domownika (osłony pożyczyły) albo jego prezent – bez naruszenia; misja ciszy nocnej go nie widzi', () => {
    expect(rateDay(world({ transactions: [tx('2026-10-12', -zl(3500), { refundable: true })] }), '2026-10-12').violations).toEqual([])
    expect(rateDay(world({ transactions: [tx('2026-10-12', -zl(3500), { refundable: true, gift: true })] }), '2026-10-12').violations).toEqual([])
    const w = world({ transactions: [tx('2026-10-14', -zl(30), { time: '23:30', refundable: true })] })
    expect(chooseMission(w, '2026-10-26', null).template).not.toBe('quiet')
  })

  it('B20: dzień z niezadokowaną parą wypłaty ICTTJ czeka – ani on, ani późniejsze nie zamarzają', () => {
    const w = world()
    const all = advanceGame(w, '2026-10-12T12:00:00+02:00')
    const held = advanceGame(w, '2026-10-12T12:00:00+02:00', { hold: '2026-10-08' })
    const days = (c: typeof all) => c.months.flatMap((m) => Object.keys(m.days)).sort()
    expect(days(all).at(-1)).toBe('2026-10-10')
    expect(days(held)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07'])
  })
})
