/**
 * N3 (1.15.7), AP-14 and AP-30 in the window: the freezing goes in portions, each in its own task (AF-6 – a backlog of
 * 100+ days passed React's limit of nested updates, #185); the days without the bank's data wait for the question and
 * freeze after „Zamroź bez danych” or a week; „Nowa klasa” is not played for a class that came with data; „Dziś bez
 * wydatków” over an expense of today says so.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Snapshot } from '@shared/api'
import { addDays, warsawNow } from '@shared/calc/dates'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { newGameMonth } from '@shared/calc/game'
import { balanceSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type GameDay, type GameMonth, type Settings } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here a mock writing nothing.
const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, list: Array<{ id: string }>) => list.map((record) => ({ record, relPath: `${record.id}.json`, readOnly: false }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async () => []),
  historyKeep: vi.fn(async () => undefined)
}
vi.stubGlobal('window', { fi: api })
// Now: Wednesday 4 November 2026, noon in Warsaw – the timers too (the portions' tasks).
vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
vi.setSystemTime(new Date('2026-11-04T11:00:00.000Z'))
afterAll(() => vi.useRealTimers())
const data = await import('../../src/renderer/store/data')
const game = await import('../../src/renderer/store/game')
const evening = await import('../../src/renderer/features/evening/state')
const { useUi } = await import('../../src/renderer/store/ui')

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
const TODAY = warsawNow().date
let seq = 0
const nextId = () => `01K3A00000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })

/** A budget from 1 June with its plan; the game from `gameStart`; `settings` changes the rest. */
function open(gameStart: string, o: { settings?: (s: Settings) => Settings; game?: GameMonth[]; transactions?: ReturnType<typeof transactionSchema.parse>[] } = {}): void {
  const fi = createDefaultSettings(AT)
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const entry = <T extends { id: string }>(dir: string, record: T) => ({ record, relPath: `${dir}/${record.id}.json`, readOnly: false })
  records.balances = [entry('balances', balanceSchema.parse({ ...base(), date: '2026-06-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) }))]
  records.months = [entry('months', monthPlanSchema.parse({ ...base(), month: '2026-06', salary: zl(4000), envelopes: {} }))]
  records.game = (o.game ?? []).map((g) => entry('game', g))
  records.transactions = (o.transactions ?? []).map((t) => entry('transactions', t))
  const s0 = fi.settings
  const s1: Settings = { ...s0, budget: { ...s0.budget, start: '2026-06-01' }, layers: { ...s0.layers, assumedCosts: zl(3000) }, game: { ...s0.game, start: gameStart } }
  data.applySnapshot({
    fi: { ...fi, settings: o.settings ? o.settings(s1) : s1 },
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane-n3', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
}

const frozen = (): string[] => data.listOf(data.useData.getState().records.game).flatMap((g) => Object.keys(g.days)).sort()
/** Portions until nothing is left (each at most `DAYS_PER_PASS` days). */
function advanceAll(now = new Date()): void {
  for (let i = 0; i < 200 && game.advancePortion(null, now); i++);
}
const newGameMonthFor = (month: string, days: Record<string, GameDay>): GameMonth => ({ ...newGameMonth(month, AT), days })
const imported = (at: string, covered: string) => (s: Settings): Settings => ({ ...s, import: { ...s.import, lastImport: { [MBANK_ACCOUNT_ID]: at }, coveredTo: { [MBANK_ACCOUNT_ID]: covered } } })

beforeEach(() => {
  game.useFreezeAsk.setState({ ask: null, dismissed: null })
})

describe('AF-6: zamrażanie porcjami, każda w osobnym zadaniu', () => {
  it('zaległość 119 dni: nic od razu, każde zadanie najwyżej 2 dni, bez zagnieżdżonych przebiegów – na końcu wszystkie zamrożone', async () => {
    open(addDays(TODAY, -120))
    // The effect, as React runs it (`useGameAdvance`): again after every change of what the game reads – here of the store.
    let cancel = () => {}
    let depth = 0
    let deepest = 0
    const effect = () => {
      depth++
      deepest = Math.max(deepest, depth)
      cancel()
      cancel = game.schedulePortion(null)
      depth--
    }
    const stop = data.useData.subscribe(effect)
    try {
      effect()
      // The first portion waits for its own task: called at once, the whole backlog went in one task, nested.
      expect(frozen()).toEqual([])
      for (let steps = 0; frozen().length < 119 && steps < 400; steps++) await vi.advanceTimersToNextTimerAsync()
      expect(frozen().length).toBe(119)
      expect(frozen().at(-1)).toBe(addDays(TODAY, -2))
      // Every portion ran from its timer, none inside the effect's run (React counts those as nested updates – #185).
      expect(deepest).toBe(1)
    } finally {
      stop()
      cancel()
    }
  })

  it('jedna porcja to najwyżej 2 dni', () => {
    open(addDays(TODAY, -120))
    expect(game.advancePortion(null)).toBe(true)
    expect(frozen()).toEqual([addDays(TODAY, -120), addDays(TODAY, -119)])
  })
})

describe('AP-14: pytanie przed zamrożeniem dni bez danych z banku', () => {
  it('import sprzed 6 dni: dni sprzed luki zamarzają, od niej czekają z pytaniem; „Zamroź bez danych” – zamarzają', () => {
    open(addDays(TODAY, -10), { settings: imported(`${addDays(TODAY, -6)}T08:00:00.000Z`, addDays(TODAY, -7)) })
    advanceAll()
    expect(frozen()).toEqual([-10, -9, -8, -7].map((d) => addDays(TODAY, d)))
    expect(game.useFreezeAsk.getState().ask).toMatchObject({ from: addDays(TODAY, -6), first: addDays(TODAY, -6), last: addDays(TODAY, -2), until: addDays(TODAY, 6), late: [{ name: 'mBank', days: 6 }] })
    // The week's mission waits too: chosen from the 4 weeks before Monday, the bank's data missing there.
    expect(data.listOf(data.useData.getState().records.game).flatMap((g) => g.missions)).toEqual([])
    const before = game.useFreezeAsk.getState().answered
    game.freezeWithoutImport()
    expect(game.useFreezeAsk.getState()).toMatchObject({ ask: null, answered: before + 1 })
    advanceAll()
    expect(frozen().at(-1)).toBe(addDays(TODAY, -2))
    expect(game.useFreezeAsk.getState().ask).toBeNull()
    expect(data.listOf(data.useData.getState().records.game).flatMap((g) => g.missions).length).toBe(1)
  })

  it('nowy import kończy czekanie; bez odpowiedzi – najwyżej 7 dni, potem dni zamarzają', () => {
    const at = `${addDays(TODAY, -5)}T09:00:00.000Z`
    open(addDays(TODAY, -8), { settings: imported(at, addDays(TODAY, -6)) })
    advanceAll()
    expect(game.useFreezeAsk.getState().ask?.until).toBe(addDays(TODAY, 6))
    const waiting = frozen().length
    // Six days on, the question still stands (the same late import).
    const later = (days: number) => new Date(Date.parse('2026-11-04T11:00:00.000Z') + days * 86_400_000)
    expect(game.advancePortion(null, later(6))).toBe(false)
    expect(game.useFreezeAsk.getState().ask).not.toBeNull()
    expect(frozen().length).toBe(waiting)
    // The seventh: the days freeze as they stand (as T163).
    advanceAll(later(7))
    expect(game.useFreezeAsk.getState().ask).toBeNull()
    expect(frozen().at(-1)).toBe(addDays(TODAY, 5))
    // An import today: nothing to wait for.
    open(addDays(TODAY, -8), { settings: imported(`${TODAY}T07:00:00.000Z`, addDays(TODAY, -1)) })
    advanceAll()
    expect(game.useFreezeAsk.getState().ask).toBeNull()
    expect(frozen().at(-1)).toBe(addDays(TODAY, -2))
  })

  it('„Zaimportuj najpierw” zamyka pytanie na czas okna – dni dalej czekają', () => {
    open(addDays(TODAY, -8), { settings: imported(`${addDays(TODAY, -5)}T10:00:00.000Z`, addDays(TODAY, -6)) })
    advanceAll()
    const ask = game.useFreezeAsk.getState().ask!
    game.dismissFreezeAsk()
    expect(game.useFreezeAsk.getState().dismissed).toBe(ask.key)
    advanceAll()
    expect(frozen().includes(ask.first)).toBe(false)
  })
})

describe('AP-14: „Nowa klasa” – nie dla skutku importu (DW sp. 6)', () => {
  it('klasa z nowych danych zostaje w dzienniku, bez ekranu; prawdziwa zmiana klasy – z ekranem', () => {
    const day = (cls: string, over: Partial<GameDay> = {}): GameDay => ({ status: 'ok', frozenAt: AT, violations: [], cls, cargo: null, tags: [], ...over })
    const month = newGameMonthFor('2026-11', { '2026-11-01': day('scout'), '2026-11-02': day('destroyer', { clsBefore: 'destroyer' }) })
    const gs = createDefaultSettings(AT).settings.game
    expect(game.celebrationsOf([month], gs, TODAY).filter((c) => c.kind === 'class')).toEqual([])
    const own = newGameMonthFor('2026-11', { '2026-11-01': day('scout'), '2026-11-02': day('destroyer') })
    expect(game.celebrationsOf([own], gs, TODAY)).toContainEqual(expect.objectContaining({ kind: 'class', cls: 'destroyer', from: 'scout' }))
  })
})

describe('AP-30: „Dziś bez wydatków” przy wydatku z dziś ostrzega (RY sp. 1)', () => {
  const lastToast = () => useUi.getState().toasts.at(-1)

  it('wydatek z dziś: zapisane (raport zamknięty), ale toast mówi, że dzień się nie liczy', () => {
    open(addDays(TODAY, -3), { transactions: [transactionSchema.parse({ ...base(), date: TODAY, accountId: MBANK_ACCOUNT_ID, amount: -zl(12), counterparty: 'Mokka' })] })
    expect(evening.confirmNoSpend()).toBe(true)
    expect(data.useData.getState().fi!.settings.game.noSpend[TODAY]).toBeTruthy()
    expect(lastToast()).toMatchObject({ kind: 'info', text: 'Raport wachty zamknięty, ale dziś jest już wydatek 12,00 zł – dzień nie liczy się jako bez wydatków (misja, dziennik wachty).' })
    expect(evening.noSpendWarning()).toBe(lastToast()!.text)
  })

  it('bez wydatku z dziś (wczorajszy się nie liczy): jak dotąd', () => {
    open(addDays(TODAY, -3), { transactions: [transactionSchema.parse({ ...base(), date: addDays(TODAY, -1), accountId: MBANK_ACCOUNT_ID, amount: -zl(12), counterparty: 'Mokka' })] })
    expect(evening.confirmNoSpend()).toBe(true)
    expect(lastToast()).toMatchObject({ kind: 'success', text: 'Dziś bez wydatków – zapisane w dzienniku wachty.' })
    expect(evening.noSpendWarning()).toBeNull()
  })
})
