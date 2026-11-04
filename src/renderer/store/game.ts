/**
 * The command in the main window (E7, D73): the game's start set once – the first full day after this version ran, by
 * the first computer –, the days frozen in the background (every minute and on a change of the records) and written to
 * `game/RRRR-MM.json`; what the screens read; the celebrations of this computer (each promotion, higher class,
 * achievement and judged mission once, also when another computer froze it).
 */
import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'
import { advanceGame, coversOf, gameStartFor, gameView, importWait, IMPORT_WAIT_DAYS, rateDay, type DayRating, type GameInput, type GameView, type ImportWait } from '@shared/calc/game'
import { addDays, daysBetween, warsawNow } from '@shared/calc/dates'
import { pendingPairDays } from '@shared/calc/dock'
import { useDeliveries } from '../features/dock/state'
import type { RecordEntry } from '@shared/api'
import type { GameMonth, GameSettings } from '@shared/schema'
import { addRecords, listOf, tooNewMonths, updateRecord, updateSettings, useData, writesInBackground } from './data'
import { fleetNow, pendingPairsNow, useEngineParts, useToday } from './fleet'
import { usePresence } from './presence'
import { timed } from '../lib/timing'

type DataState = ReturnType<typeof useData.getState>
type Records = DataState['records']
type Fi = NonNullable<DataState['fi']>

/** The game's input: the engine's – the pairs of ICTTJ payouts not docked yet by their pool too (AP-12). */
export function gameInputOf(fi: Fi, records: Records): GameInput {
  return {
    settings: fi.settings,
    pendingPairs: pendingPairsNow(),
    transactions: listOf(records.transactions),
    containers: listOf(records.containers),
    goals: listOf(records.goals),
    months: listOf(records.months),
    dockings: listOf(records.dockings),
    loans: listOf(records.loans),
    balances: listOf(records.balances),
    game: listOf(records.game)
  }
}

/** What the game reads (W10): the engine's parts, its settings and its records – a change of anything else is not its. */
const GAME_SETTINGS = ['accounts', 'budget', 'categories', 'household', 'layers', 'orders', 'game'] as const
const GAME_COLLECTIONS = ['transactions', 'containers', 'goals', 'months', 'dockings', 'loans', 'balances', 'game'] as const
/** Months whose file a newer version wrote and this one cannot read (B67) – as text: every change brings a new list. */
const lockedKey = (s: DataState): string => [...tooNewMonths(s.problems, 'game')].join(',')
const gameParts = (s: DataState): unknown[] => (s.fi ? [...GAME_SETTINGS.map((k) => s.fi!.settings[k]), ...GAME_COLLECTIONS.map((c) => s.records[c]), lockedKey(s)] : [])

/**
 * Days rated in one pass (W16): each is a whole run of the engine – a long backlog goes in portions, each in its own task
 * (AF-6), the window painted between them.
 */
export const DAYS_PER_PASS = 2
/** A day of a payout still to dock waits this long (B20). */
const HOLD_DAYS = 7

/**
 * The first freeze after the folder opened waits (B33, T199): a few minutes from the opening and a minute without a
 * change from another computer – OneDrive brings what the other computer wrote first; never with a copy of a game
 * month waiting in Synchronizacja.
 */
function useFreezeSettled(): boolean {
  const openedAt = useData((s) => s.openedAt)
  const externalAt = useData((s) => s.externalAt)
  const conflict = useData((s) => s.conflicts.some((c) => c.kind === 'game'))
  const freeze = useData((s) => s.appInfo?.freeze)
  const due = Math.max(openedAt + (freeze?.afterOpenMs ?? 3 * 60_000), externalAt + (freeze?.quietMs ?? 60_000))
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const left = due - Date.now()
    if (left <= 0) {
      setNow(Date.now())
      return
    }
    const t = setTimeout(() => setNow(Date.now()), left + 50)
    return () => clearTimeout(t)
  }, [due])
  return !!openedAt && !conflict && now >= due
}

/**
 * Freeze what is due and give the week its mission; the game starts once the budget runs (main window only). Only on a
 * computer in use (D86): one only in the tray leaves it to the one in use.
 */
export function useGameAdvance(): void {
  const inUse = usePresence((s) => s.inUse)
  const settled = useFreezeSettled()
  const ready = useData(writesInBackground) && inUse && settled
  const parts = useData(useShallow(gameParts))
  const today = useToday()
  // A paired ICTTJ payout not docked yet (B20): its day waits – for a week at most (then it is frozen as it stands). The
  // deliveries' own inputs (a skipped entry, ICTTJ read again, the bank's file) count too.
  const deliveries = useDeliveries()
  const hold = useMemo(() => pendingPairDays(deliveries).find((d) => daysBetween(d, today) <= HOLD_DAYS) ?? null, [deliveries, today])
  // The answer to the question about the days without the bank's data (AP-14) runs the next portion.
  const answered = useFreezeAsk((s) => s.answered)
  useEffect(() => (ready ? schedulePortion(hold) : undefined), [parts, ready, today, hold, answered])
  // Another folder shown: its own question – none of the folder before (the first portion comes once it settled).
  const openedAt = useData((s) => s.openedAt)
  useEffect(() => useFreezeAsk.setState({ ask: null, dismissed: null }), [openedAt])
}

/**
 * The next portion in a task of its own (AF-6): its months saved change the records and the effect runs again – called
 * from the effect at once, the next portion's write came in the same task (zustand's update renders synchronously), and
 * a backlog of more than 100 days (50 portions) passed React's limit of nested updates (#185) on any screen.
 */
export function schedulePortion(hold: string | null): () => void {
  const t = setTimeout(() => advancePortion(hold), 0)
  return () => clearTimeout(t)
}

/** One portion of the game's advance (at most `DAYS_PER_PASS` days); true – months written. */
export function advancePortion(hold: string | null, now: Date = new Date()): boolean {
  const state = useData.getState()
  const { fi, records } = state
  // Checked again as it runs (T301): changes being written since the render hold it – it runs once they are written.
  if (!fi || !writesInBackground(state)) return false
  if (!fi.settings.game.start) {
    // The game starts from zero (spec): the first full day after the budget runs with this version – once the start
    // wizard ran (N23): a budget the engine counts from an opening balance alone has no salary and no plan to judge by.
    if (fi.settings.budget.start && fleetNow()?.started)
      updateSettings((f) => (f.settings.game.start ? f : { ...f, settings: { ...f.settings, game: { ...f.settings.game, start: gameStartFor(now) } } }), { background: true })
    return false
  }
  // Months a newer version wrote are not this one's to write: passed over (a portion would never get past them) – those
  // whose file this version cannot even read too (B67): never made again here over that file.
  const locked = new Set([...Object.values(records.game ?? {}).flatMap((e) => (e.readOnly ? [e.record.month] : [])), ...tooNewMonths(state.problems, 'game')])
  const input = gameInputOf(fi, records)
  const waitImport = importWaitNow(input, now, locked)
  const change = timed('gra: ocena dni', () => advanceGame(input, now, { maxDays: DAYS_PER_PASS, locked, hold, waitImport }))
  if (!change.months.length) return false
  const fresh = change.months.filter((m) => !records.game[m.id])
  if (fresh.length) addRecords('game', fresh)
  for (const m of change.months) if (records.game[m.id]) updateRecord('game', m.id, () => m, { background: true })
  return true
}

// ------------------------------------------------------------------ the days without the bank's data (AP-14)

/** The question before freezing days without the bank's data, as the window shows it (`until` – the wait's last day). */
export type FreezeAsk = ImportWait & { until: string }

export const useFreezeAsk = create<{ ask: FreezeAsk | null; dismissed: string | null; answered: number }>(() => ({ ask: null, dismissed: null, answered: 0 }))

const WAIT_KEY = 'fi.game.importWait'
/** This computer's answers (D86: the computer in use asks): wait key → since when it waits, „Zamroź bez danych”. */
type WaitMemo = Record<string, { since: string; freeze?: boolean }>
/** Without the storage the answers live as long as the window. */
let memoInMemory: WaitMemo = {}

function readWaits(): WaitMemo {
  try {
    const raw = localStorage.getItem(WAIT_KEY)
    return raw ? (JSON.parse(raw) as WaitMemo) : memoInMemory
  } catch {
    return memoInMemory
  }
}

function writeWaits(memo: WaitMemo): void {
  // The newest few: a wait ends with an import, an old key never comes back.
  memoInMemory = Object.fromEntries(Object.entries(memo).slice(-20))
  try {
    localStorage.setItem(WAIT_KEY, JSON.stringify(memoInMemory))
  } catch {
    /* storage unavailable: the answers live as long as the window */
  }
}

const sameAsk = (a: FreezeAsk | null, b: FreezeAsk | null): boolean =>
  a === b || (!!a && !!b && a.key === b.key && a.first === b.first && a.last === b.last && a.until === b.until && JSON.stringify(a.late) === JSON.stringify(b.late))

/**
 * The first day the freezing waits for the bank's data (AP-14, D99 pkt 5) – the question shown meanwhile; null: nothing
 * to wait for, answered „Zamroź bez danych” for these imports, or waited `IMPORT_WAIT_DAYS` already (then the days
 * freeze as they stand, as T163).
 */
function importWaitNow(input: GameInput, now: Date, locked: ReadonlySet<string>): string | null {
  const today = warsawNow(now).date
  const wait = importWait(input, today, locked)
  let ask: FreezeAsk | null = null
  if (wait) {
    const memo = readWaits()
    let mine = memo[wait.key]
    if (!mine) writeWaits({ ...memo, [wait.key]: (mine = { since: today }) })
    const until = addDays(mine.since, IMPORT_WAIT_DAYS - 1)
    if (!mine.freeze && today <= until) ask = { ...wait, until }
  }
  if (!sameAsk(useFreezeAsk.getState().ask, ask)) useFreezeAsk.setState({ ask })
  return ask ? ask.from : null
}

/** „Zamroź bez danych”: the days of these late imports freeze now (this computer; a new import is a new question). */
export function freezeWithoutImport(): void {
  const ask = useFreezeAsk.getState().ask
  if (!ask) return
  const memo = readWaits()
  writeWaits({ ...memo, [ask.key]: { since: memo[ask.key]?.since ?? warsawNow().date, freeze: true } })
  useFreezeAsk.setState((s) => ({ ask: null, answered: s.answered + 1 }))
}

/** „Zaimportuj najpierw” (or the dialog closed): no question again while the window lives – the days keep waiting. */
export function dismissFreezeAsk(): void {
  const ask = useFreezeAsk.getState().ask
  if (ask) useFreezeAsk.setState({ dismissed: ask.key })
}

const NO_GAME: Record<string, RecordEntry<GameMonth>> = {}

/** The game's view and its records (the reports – W11): no rating of today, recomputed when what the game reads or the day changes. */
export function useGameView(): { view: GameView; input: GameInput } | null {
  const today = useToday()
  const parts = useData(useShallow(gameParts))
  // The engine's parts (AP-12): an ICTTJ payout read later pairs an operation – today's rating changes with the engine.
  const engine = useEngineParts()
  return useMemo(() => {
    const { fi, records } = useData.getState()
    if (!fi) return null
    const input = gameInputOf(fi, records)
    // The covers of an overrun (F28) in the watch's log: the month plans are among what the game reads.
    return { view: timed('gra: widok', () => gameView(input.game, fi.settings.game, today, coversOf(input.months))), input }
    // `parts`, `engine` and `today` are the key (read inside from the store's state of now).
  }, [parts, engine, today])
}

/** The game's view and today's rating so far (the command's screen). */
export function useGame(): { view: GameView; today: DayRating | null; input: GameInput } | null {
  const base = useGameView()
  const today = useToday()
  return useMemo(() => {
    if (!base) return null
    const start = base.input.settings.game.start
    return { ...base, today: start && start <= today ? timed('gra: dziś', () => rateDay(base.input, today)) : null }
  }, [base, today])
}

/** The game's records alone (the briefing's mission). */
export function useGameRecords(): GameMonth[] {
  const map = useData((s) => s.records.game ?? NO_GAME)
  return useMemo(() => listOf(map), [map])
}

// ------------------------------------------------------------------ celebrations

export type Celebration =
  | { key: string; kind: 'rank'; change: 'up' | 'down'; rank: string; day: string }
  | { key: string; kind: 'class'; cls: string; from: string; day: string }
  | { key: string; kind: 'achievement'; id: string; day: string }
  | { key: string; kind: 'mission'; template: string; done: boolean; week: string }

export const useCelebrations = create<{ queue: Celebration[] }>(() => ({ queue: [] }))

const SEEN_KEY = 'fi.game.seen'

function readSeen(): Set<string> | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

function writeSeen(seen: Set<string>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-5000)))
  } catch {
    // Without the storage every event would come again: nothing better to do.
  }
}

/** Only what happened lately is news (an event older than this never plays – also when the memory lost its key). */
const RECENT_DAYS = 14

/**
 * The news of the watch log (`gameView`), oldest first, with stable keys: a change of rank, a higher class (a lower one
 * stays in the log – D73), an achievement, a judged mission.
 */
export function celebrationsOf(game: readonly GameMonth[], gs: GameSettings, today: string): Celebration[] {
  const out: Celebration[] = []
  for (const e of gameView(game, gs, today).log) {
    if (daysBetween(e.date, today) > RECENT_DAYS) continue
    if (e.kind === 'rank') out.push({ key: `rank:${e.date}:${e.change}`, kind: 'rank', change: e.change, rank: e.rank, day: e.date })
    // A new class only (N64): a return to one held within 30 days stays in the watch's log.
    else if (e.kind === 'class' && e.up && e.peak) out.push({ key: `class:${e.date}`, kind: 'class', cls: e.cls, from: e.from, day: e.date })
    else if (e.kind === 'achievement') out.push({ key: `achievement:${e.id}`, kind: 'achievement', id: e.id, day: e.date })
    else if (e.kind === 'mission' && e.done != null) out.push({ key: `mission:${e.week}`, kind: 'mission', template: e.template, done: e.done, week: e.week })
  }
  return out.reverse()
}

/**
 * New events of the game go to the queue once per computer; the first run here only remembers what already happened
 * (the history is no news).
 */
export function useGameCelebrations(): void {
  const game = useGameRecords()
  const gs = useData((s) => s.fi?.settings.game ?? null)
  // Before the folder is read the records are empty: the history would come as news.
  const ready = useData((s) => s.phase === 'ready')
  useEffect(() => {
    if (!ready || !gs) return
    const all = celebrationsOf(game, gs, warsawNow().date)
    const seen = readSeen()
    if (!seen) {
      writeSeen(new Set(all.map((c) => c.key)))
      return
    }
    const fresh = all.filter((c) => !seen.has(c.key))
    if (!fresh.length) return
    for (const c of fresh) seen.add(c.key)
    writeSeen(seen)
    useCelebrations.setState((s) => ({ queue: [...s.queue, ...fresh] }))
  }, [game, gs, ready])
}
