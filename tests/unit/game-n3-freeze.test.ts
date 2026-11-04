/**
 * N3 (1.15.7), AP-14 – the game after a break: the days without the bank's data wait for the question (D99 pkt 5) and the
 * week's mission with them; a class that came with an import of history is no „Nowa klasa”; the missions' panel never
 * names a Monday of the past; the way to the next rank never counts „from tomorrow to the day before”.
 */
import { describe, expect, it } from 'vitest'
import { advanceGame, gameView, importWait, missionAhead, newGameMonth, rateDay, type GameInput } from '@shared/calc/game'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type GameDay, type GameMonth, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K3800000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const SAVINGS = '01K38SAV000000000000000001'
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: FOOD, ...over })

/** October 2026 as in `game.test.ts`: the budget from the 1st (20 000 zł), the game from Monday 5 October. */
function world(o: { settings?: (s: Settings) => Settings; game?: GameMonth[]; transactions?: Transaction[] } = {}): GameInput {
  const s0 = createDefaultSettings(AT).settings
  const s1: Settings = { ...s0, budget: { ...s0.budget, start: '2026-10-01' }, layers: { ...s0.layers, assumedCosts: zl(3000) }, game: { ...s0.game, start: '2026-10-05' } }
  return {
    settings: o.settings ? o.settings(s1) : s1,
    balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(3100), envelopes: { [FOOD]: zl(3100) } })],
    transactions: o.transactions ?? [],
    containers: [],
    dockings: [],
    game: o.game ?? []
  }
}

/** mBank imported at `at` (UTC), its files covering up to `covered`. */
const imported =
  (at: string, covered?: string, account = MBANK_ACCOUNT_ID) =>
  (s: Settings): Settings => ({
    ...s,
    import: { ...s.import, lastImport: { ...s.import.lastImport, [account]: at }, coveredTo: covered ? { ...s.import.coveredTo, [account]: covered } : s.import.coveredTo }
  })

const day = (over: Partial<GameDay> = {}): GameDay => ({ status: 'ok', frozenAt: AT, violations: [], cls: null, cargo: null, tags: [], ...over })
const monthWith = (days: Record<string, GameDay>): GameMonth => ({ ...newGameMonth('2026-10', AT), days })
const frozenDays = (c: ReturnType<typeof advanceGame>) => c.months.flatMap((m) => Object.keys(m.days)).sort()

describe('AP-14: dni bez danych z banku czekają na pytanie (D99 pkt 5)', () => {
  it('import zaległy ponad 3 dni: dni od dnia po tym, co obejmują pliki, do przedwczoraj', () => {
    // Imported on Saturday 10.10 (its file up to Friday 9.10); today Tuesday 20.10 – 10 days later.
    const w = world({ settings: imported('2026-10-10T08:00:00.000Z', '2026-10-09') })
    expect(importWait(w, '2026-10-20')).toEqual({
      key: `${MBANK_ACCOUNT_ID}@2026-10-10T08:00:00.000Z`,
      from: '2026-10-10',
      first: '2026-10-10',
      last: '2026-10-18',
      late: [{ name: 'mBank', days: 10 }]
    })
    // 3 days after the import – the briefing does not ask for one yet: nothing waits.
    expect(importWait(w, '2026-10-13')).toBeNull()
    // Without `coveredTo` (an import before 1.5.0): from the day after the import.
    expect(importWait(world({ settings: imported('2026-10-10T08:00:00.000Z') }), '2026-10-20')?.from).toBe('2026-10-11')
  })

  it('nic nie czeka: konto bez żadnego importu, zarchiwizowane, dni z luki już zamrożone; z luki – pierwszy niezamrożony', () => {
    expect(importWait(world(), '2026-10-20')).toBeNull()
    const archived = (s: Settings): Settings => ({ ...imported('2026-10-10T08:00:00.000Z', '2026-10-09')(s), accounts: s.accounts.map((a) => (a.id === MBANK_ACCOUNT_ID ? { ...a, archived: true } : a)) })
    expect(importWait(world({ settings: archived }), '2026-10-20')).toBeNull()
    const days = (from: number, to: number) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [`2026-10-${String(from + i).padStart(2, '0')}`, day()]))
    const all = world({ settings: imported('2026-10-10T08:00:00.000Z', '2026-10-09'), game: [monthWith(days(5, 18))] })
    expect(importWait(all, '2026-10-20')).toBeNull()
    const some = world({ settings: imported('2026-10-10T08:00:00.000Z', '2026-10-09'), game: [monthWith(days(5, 12))] })
    expect(importWait(some, '2026-10-20')).toMatchObject({ from: '2026-10-10', first: '2026-10-13', last: '2026-10-18' })
    // A month this version may not write (a newer one's): its days are not this one's to ask about.
    expect(importWait(world({ settings: imported('2026-10-10T08:00:00.000Z', '2026-10-09') }), '2026-10-20', new Set(['2026-10']))).toBeNull()
  })

  it('dwa konta mBanku: czeka od najwcześniejszej luki, nowy import to nowy klucz', () => {
    const two = (s: Settings): Settings => ({ ...s, accounts: [...s.accounts, { id: SAVINGS, name: 'mBank Oszczędności', kind: 'bank', importFormat: 'mbank', archived: false }] })
    const w = world({ settings: (s) => imported('2026-10-14T08:00:00.000Z', '2026-10-13')(imported('2026-10-08T08:00:00.000Z', '2026-10-07', SAVINGS)(two(s))) })
    const wait = importWait(w, '2026-10-20')!
    expect(wait).toMatchObject({ from: '2026-10-08', late: [{ name: 'mBank', days: 6 }, { name: 'mBank Oszczędności', days: 12 }] })
    const after = importWait(world({ settings: (s) => imported('2026-10-15T08:00:00.000Z', '2026-10-14')(imported('2026-10-08T08:00:00.000Z', '2026-10-07', SAVINGS)(two(s))) }), '2026-10-20')!
    expect(after.key).not.toBe(wait.key)
  })

  it('advanceGame z `waitImport`: dni sprzed luki zamarzają, od niej czekają – i misja tygodnia z nimi', () => {
    const w = world({ settings: imported('2026-10-10T08:00:00.000Z', '2026-10-09') })
    const now = '2026-10-20T10:00:00.000Z'
    const all = advanceGame(w, now)
    expect(frozenDays(all).at(-1)).toBe('2026-10-18')
    expect(all.months[0]!.missions.map((m) => m.week)).toContain('2026-W43')
    const held = advanceGame(w, now, { waitImport: '2026-10-10' })
    expect(frozenDays(held)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'])
    // The mission of W43 (from Monday 19.10) is chosen from the 4 weeks before it – the bank's data is missing there.
    expect(held.months[0]!.missions.map((m) => m.week)).not.toContain('2026-W43')
    // A gap only in this week: the choice reads complete weeks – the mission comes.
    const late = advanceGame(world({ settings: imported('2026-10-19T08:00:00.000Z', '2026-10-18') }), '2026-10-23T10:00:00.000Z', { waitImport: '2026-10-19' })
    expect(late.months[0]!.missions.map((m) => m.week)).toContain('2026-W43')
    // The earlier of the two waits (B20's pair and the import) stops the days.
    expect(frozenDays(advanceGame(w, now, { waitImport: '2026-10-10', hold: '2026-10-07' }))).toEqual(['2026-10-05', '2026-10-06'])
  })
})

describe('AP-14: „Nowa klasa” nie świętuje skutku importu (DW sp. 6)', () => {
  const today = '2026-10-10'
  const now = '2026-10-10T10:00:00.000Z'

  it('dni zamrożone przed importem historii z niższą klasą: zmiana z danych w dzienniku, bez ekranu „Nowa klasa”', () => {
    const w0 = world()
    const real = rateDay(w0, '2026-10-07').cls!
    expect(real).not.toBe('scout')
    // The days before were frozen when the budget knew less (here: scout); the data now gives the class `real` to them.
    const before = monthWith({ '2026-10-05': day({ cls: 'scout' }), '2026-10-06': day({ cls: 'scout' }), '2026-10-07': day({ cls: 'scout' }) })
    const change = advanceGame(world({ game: [before] }), now)
    const oct = change.months[0]!
    expect(oct.days['2026-10-08']).toMatchObject({ cls: real, clsBefore: real })
    // Only the day of the change carries it.
    expect(oct.days['2026-10-07']).not.toHaveProperty('clsBefore')
    expect(oct.days['2026-10-08']!.clsBefore).toBe(real)
    expect(Object.values(oct.days).filter((d) => d.clsBefore).length).toBe(1)
    const entry = gameView(change.months, w0.settings.game, today).log.find((e) => e.kind === 'class')
    // Not a peak: the celebrations take only a higher class at its peak (`celebrationsOf` – the store's test).
    expect(entry).toMatchObject({ kind: 'class', from: 'scout', cls: real, up: true, peak: false, data: true })
  })

  it('prawdziwy wzrost zasięgu tego dnia: „Nowa klasa” jak dotąd', () => {
    // A payout of 30 000 zł on the 8th – the range grows that day; the days before frozen with the class the data gives.
    const income = tx('2026-10-08', zl(30000), { kind: 'income', categoryId: null })
    const w = world({ transactions: [income] })
    const cls = rateDay(w, '2026-10-07').cls!
    const before = monthWith({ '2026-10-05': day({ cls }), '2026-10-06': day({ cls }), '2026-10-07': day({ cls }) })
    const change = advanceGame(world({ transactions: [income], game: [before] }), now)
    const oct = change.months[0]!
    expect(oct.days['2026-10-08']!.cls).not.toBe(cls)
    expect(oct.days['2026-10-08']).not.toHaveProperty('clsBefore')
    const entry = gameView(change.months, w.settings.game, today).log.find((e) => e.kind === 'class')
    expect(entry).toMatchObject({ kind: 'class', from: cls, cls: oct.days['2026-10-08']!.cls, up: true, peak: true })
    expect(entry).not.toHaveProperty('data')
  })
})

describe('AP-14: panel misji bez daty z przeszłości (DW sp. 2)', () => {
  it('misja jeszcze nie wybrana: data pierwszego pełnego tygodnia tylko, gdy jest przed nami', () => {
    // The game from Wednesday 7.10: the first full week from Monday 12.10.
    expect(missionAhead('2026-10-07', '2026-10-08')).toBe('2026-10-12')
    expect(missionAhead('2026-10-07', '2026-10-12')).toBeNull()
    // Two months on (DW sp. 2: „Pierwsza misja w tygodniu od 07.09.2026”) – no date of the past.
    expect(missionAhead('2026-09-04', '2026-11-02')).toBeNull()
  })
})
