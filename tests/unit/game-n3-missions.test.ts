/**
 * N3 (1.15.7), AP-30 – the game's small things: „Inwentaryzacja” counts the day of the confirmation (AF-31), „Dziś bez
 * wydatków” counts toward „Dzień bez wydatków” (AF-65), one „Twoja killzone” (WY sp. 1), the mission of the quiet hours
 * not named as the achievement of 30 such days.
 */
import { describe, expect, it } from 'vitest'
import { ACHIEVEMENT_INFO, chooseMission, costOn, killzoneNote, missionStatus, missionText, MISSION_TITLE, newGameMonth, type GameInput } from '@shared/calc/game'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, CASH_ACCOUNT_ID, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Balance, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K3900000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: FOOD, ...over })
/** A confirmation of the balance of `date`, made at `at` (UTC). */
const confirmation = (accountId: string, date: string, at: string): Balance => balanceSchema.parse({ ...base(), createdAt: at, updatedAt: at, date, accountId, kind: 'confirmation', amount: zl(100) })

/** The budget from 1 September 2026 (the three accounts of a new folder), the game from Monday 7 September. */
function world(o: { settings?: (s: Settings) => Settings; balances?: Balance[]; transactions?: Transaction[] } = {}): GameInput {
  const s0 = createDefaultSettings(AT).settings
  const s1: Settings = { ...s0, budget: { ...s0.budget, start: '2026-09-01' }, layers: { ...s0.layers, assumedCosts: zl(3000) }, game: { ...s0.game, start: '2026-09-07' } }
  return {
    settings: o.settings ? o.settings(s1) : s1,
    balances: [balanceSchema.parse({ ...base(), date: '2026-09-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) }), ...(o.balances ?? [])],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-09', salary: zl(3100), envelopes: { [FOOD]: zl(3100) } })],
    transactions: o.transactions ?? [],
    containers: [],
    dockings: [],
    game: []
  }
}

describe('AP-30: „Inwentaryzacja” liczona po dniu potwierdzenia (AF-31, D84 C11)', () => {
  const W45 = { template: 'balances', week: '2026-W45', params: {} }

  it('saldo z pliku mBanku z ostatniego dnia pliku (niedziela 01.11), zaimportowane we wtorek 03.11 – zalicza mBank', () => {
    const file = confirmation(MBANK_ACCOUNT_ID, '2026-11-01', '2026-11-03T19:39:59.000Z')
    expect(missionStatus(world({ balances: [file] }), W45, '2026-11-04')).toEqual({ ok: false, have: 1, need: 3 })
    // Then Portfel XTB and Gotówka by hand: done.
    const all = [file, confirmation(XTB_WALLET_ACCOUNT_ID, '2026-11-04', '2026-11-04T10:00:00.000Z'), confirmation(CASH_ACCOUNT_ID, '2026-11-04', '2026-11-04T10:05:00.000Z')]
    expect(missionStatus(world({ balances: all }), W45, '2026-11-04')).toEqual({ ok: true, have: 3, need: 3 })
  })

  it('potwierdzenie sprzed tygodnia misji nie liczy się, choć saldo jest z tego tygodnia; ponowne potwierdzenie (zapis) – liczy się', () => {
    // Confirmed on Sunday 01.11 at 23:30 Warsaw time (22:30 UTC) – the week before.
    const sunday = confirmation(MBANK_ACCOUNT_ID, '2026-11-01', '2026-11-01T22:30:00.000Z')
    expect(missionStatus(world({ balances: [sunday] }), W45, '2026-11-04')).toMatchObject({ have: 0 })
    // The same balance confirmed again on Monday (the record's write – `confirmBalance` keeps one record per balance).
    expect(missionStatus(world({ balances: [{ ...sunday, updatedAt: '2026-11-02T08:00:00.000Z' }] }), W45, '2026-11-04')).toMatchObject({ have: 1 })
  })

  it('wybór misji: potwierdzenie zrobione w 4 tygodniach przed poniedziałkiem to nie słaby punkt, choć saldo jest starsze', () => {
    // W44 (Monday 26.10): the rotation would give „Dzień bez wydatków”; the weak point „Inwentaryzacja” comes first.
    const imports = (s: Settings): Settings => ({ ...s, import: { ...s.import, log: { '2026-10-24T09:00:00.000Z': MBANK_ACCOUNT_ID } } })
    const old = confirmation(MBANK_ACCOUNT_ID, '2026-09-20', '2026-09-20T10:00:00.000Z')
    expect(chooseMission(world({ settings: imports, balances: [old] }), '2026-10-26', null).template).toBe('balances')
    const confirmedLately = { ...old, updatedAt: '2026-10-20T10:00:00.000Z' }
    expect(chooseMission(world({ settings: imports, balances: [confirmedLately] }), '2026-10-26', null).template).toBe('nospend')
  })
})

describe('AP-30: „Dziś bez wydatków” zalicza misję „Dzień bez wydatków” (AF-65)', () => {
  const W45 = { template: 'nospend', week: '2026-W45', params: {} }
  const said = (date: string) => (s: Settings): Settings => ({ ...s, game: { ...s.game, noSpend: { [date]: `${date}T19:30:00.000Z` } } })

  it('dziś bez wydatków potwierdzone – liczy się od razu, nie „+1, jeśli dziś bez wydatków”', () => {
    // Monday 02.11 had an expense; Tuesday 03.11 is today.
    const txs = [tx('2026-11-02', -zl(12))]
    expect(missionStatus(world({ transactions: txs }), W45, '2026-11-03')).toEqual({ ok: false, have: 0, need: 2, pending: 1 })
    expect(missionStatus(world({ transactions: txs, settings: said('2026-11-03') }), W45, '2026-11-03')).toEqual({ ok: false, have: 1, need: 2 })
  })

  it('potwierdzone, ale z wydatkiem z dziś – dzień się nie liczy (wydatek wygrywa)', () => {
    const txs = [tx('2026-11-03', -zl(12))]
    expect(missionStatus(world({ transactions: txs, settings: said('2026-11-03') }), W45, '2026-11-03')).toEqual({ ok: false, have: 1, need: 2 })
    expect(costOn(txs, '2026-11-03')).toBe(zl(12))
    expect(costOn(txs, '2026-11-02')).toBe(0)
  })

  it('niedziela zamrożona – liczona jak dotąd, z potwierdzeniem i bez', () => {
    const sunday = { ...newGameMonth('2026-11', AT), days: { '2026-11-08': { status: 'ok' as const, frozenAt: AT, violations: [], cls: null, cargo: null, tags: [] } } }
    expect(missionStatus(world(), W45, '2026-11-08', [sunday])).toEqual({ ok: true, have: 7, need: 2 })
  })
})

describe('AP-30: jedna „Twoja killzone” i nazwa misji inna niż osiągnięcia (WY sp. 1, D73)', () => {
  const mission = { template: 'killzone', params: { weekday: 2, hour: 20, target: zl(19.43) } }
  const money = (g: number) => `${(g / 100).toFixed(2).replace('.', ',')} zł`

  it('misja mówi, z jakiego okresu jest jej killzone; Wywiad – killzone swojego okresu, z godziną misji obok', () => {
    expect(missionText(mission, () => '', money)).toBe('Twoja killzone wydatków z 4 tygodni przed misją – wtorek 20:00–21:00: najwyżej 19,43 zł (połowa średniej).')
    expect(killzoneNote(6, null)).toBe('Najjaśniejsze pole (z obwódką) to killzone wydatków tego okresu (6 mies.).')
    expect(killzoneNote(3, mission)).toBe('Najjaśniejsze pole (z obwódką) to killzone wydatków tego okresu (3 mies.). Misja tygodnia liczy swoją z 4 tygodni przed nią: wtorek 20:00–21:00.')
    // Only the mission says „Twoja killzone”.
    expect(killzoneNote(3, mission)).not.toContain('Twoja')
    expect(killzoneNote(12, { template: 'nospend', params: {} })).not.toContain('Misja')
  })

  it('żadna misja nie nazywa się jak osiągnięcie (misja ciszy nocnej to nie „Cisza w eterze”)', () => {
    const achievements = new Set(Object.values(ACHIEVEMENT_INFO).map((a) => a.name))
    expect(Object.values(MISSION_TITLE).filter((t) => achievements.has(t))).toEqual([])
    expect(MISSION_TITLE.quiet).toBe('Zaciemnienie')
    expect(ACHIEVEMENT_INFO.quiet30.name).toBe('Cisza w eterze')
  })
})
