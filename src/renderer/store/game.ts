/**
 * The command in the main window (E7, D73): the game's start set once – the first full day after this version ran, by
 * the first computer –, the days frozen in the background (every minute and on a change of the records) and written to
 * `game/RRRR-MM.json`; what the screens read; the celebrations of this computer (each promotion, higher class,
 * achievement and judged mission once, also when another computer froze it).
 */
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { advanceGame, gameStartFor, gameView, rateDay, type DayRating, type GameInput, type GameView } from '@shared/calc/game'
import { daysBetween, warsawNow } from '@shared/calc/dates'
import type { RecordEntry } from '@shared/api'
import type { GameMonth, GameSettings } from '@shared/schema'
import { addRecords, updateRecord, updateSettings, useData } from './data'
import { fleetNow, useMinute } from './fleet'

const recordsOf = <T,>(map: Record<string, RecordEntry<T>>): T[] => Object.values(map).map((e) => e.record)

type Records = ReturnType<typeof useData.getState>['records']
type Fi = NonNullable<ReturnType<typeof useData.getState>['fi']>

export function gameInputOf(fi: Fi, records: Records): GameInput {
  return {
    settings: fi.settings,
    transactions: recordsOf(records.transactions),
    containers: recordsOf(records.containers),
    goals: recordsOf(records.goals),
    months: recordsOf(records.months),
    dockings: recordsOf(records.dockings),
    loans: recordsOf(records.loans),
    balances: recordsOf(records.balances),
    game: recordsOf(records.game)
  }
}

/** Freeze what is due and give the week its mission; the game starts once the budget runs (main window only). */
export function useGameAdvance(): void {
  const fi = useData((s) => s.fi)
  const records = useData((s) => s.records)
  const ready = useData((s) => s.phase === 'ready' && !s.status?.readOnly)
  const minute = useMinute()
  useEffect(() => {
    if (!ready || !fi) return
    if (!fi.settings.game.start) {
      // The game starts from zero (spec): the first full day after the budget runs with this version.
      if (fleetNow()?.started)
        updateSettings((f) => (f.settings.game.start ? f : { ...f, settings: { ...f.settings, game: { ...f.settings.game, start: gameStartFor(new Date()) } } }), { background: true })
      return
    }
    const change = advanceGame(gameInputOf(fi, records), new Date())
    if (!change.months.length) return
    const fresh = change.months.filter((m) => !records.game[m.id])
    if (fresh.length) addRecords('game', fresh)
    for (const m of change.months) if (records.game[m.id]) updateRecord('game', m.id, () => m, { background: true })
  }, [fi, records, ready, minute])
}

const NO_GAME: Record<string, RecordEntry<GameMonth>> = {}

/** The game's view and today's rating so far (the screens of the command). */
export function useGame(): { view: GameView; today: DayRating | null; input: GameInput } | null {
  const fi = useData((s) => s.fi)
  const records = useData((s) => s.records)
  const minute = useMinute()
  return useMemo(() => {
    if (!fi) return null
    const input = gameInputOf(fi, records)
    const today = warsawNow(new Date(minute)).date
    const view = gameView(input.game, fi.settings.game, today)
    const start = fi.settings.game.start
    return { view, today: start && start <= today ? rateDay(input, today) : null, input }
  }, [fi, records, minute])
}

/** The game's records alone (the briefing's mission). */
export function useGameRecords(): GameMonth[] {
  const map = useData((s) => s.records.game ?? NO_GAME)
  return useMemo(() => recordsOf(map), [map])
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
    else if (e.kind === 'class' && e.up) out.push({ key: `class:${e.date}`, kind: 'class', cls: e.cls, from: e.from, day: e.date })
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
