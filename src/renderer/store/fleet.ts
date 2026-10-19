import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'
import { warsawNow } from '@shared/calc/dates'
import { computeFleet, type FleetInput, type FleetState } from '@shared/calc/fleet'
import type { HouseholdLedger } from '@shared/calc/household'
import { listOf, useData } from './data'
import { timed } from '../lib/timing'

/** A clock shared by the screens: the day changes the budget's engine, the minute what shows the time. */
const useClockStore = create<{ now: number }>(() => ({ now: Date.now() }))
let ticking = 0
let timer: ReturnType<typeof setInterval> | null = null

/** The shared clock runs while some screen uses it. */
function useTicking(): void {
  useEffect(() => {
    ticking++
    if (!timer) {
      // The clock stood still while no screen used it (the app in the tray overnight): the time of now first.
      useClockStore.setState({ now: Date.now() })
      timer = setInterval(() => useClockStore.setState({ now: Date.now() }), 60_000)
    }
    return () => {
      ticking--
      if (!ticking && timer) {
        clearInterval(timer)
        timer = null
      }
    }
  }, [])
}

/** Current time, refreshed every minute while some screen uses it (what needs the minute: an hour's window, a countdown). */
export function useMinute(): number {
  useTicking()
  return useClockStore((s) => Math.floor(s.now / 60_000) * 60_000)
}

/** Today in Warsaw: what the budget's engine and the game depend on – it changes once a day, never every minute (W9). */
export function useToday(): string {
  useTicking()
  return useClockStore((s) => warsawNow(new Date(s.now)).date)
}

type DataState = ReturnType<typeof useData.getState>
type Records = DataState['records']
type Fi = NonNullable<DataState['fi']>

/** What the engine reads (W10): the settings' parts and the collections it takes – a change of anything else is not its. */
const KEY_SETTINGS = ['accounts', 'budget', 'categories', 'household', 'layers', 'orders'] as const
const KEY_COLLECTIONS = ['transactions', 'containers', 'goals', 'months', 'dockings', 'loans', 'balances'] as const
type FleetKey = { date: string; parts: readonly unknown[] }

// Of the game's settings only the serious overrun's threshold (N102: it colours the envelopes' alarms) – the day without
// spending and the game's start written in the background never run the engine again.
const partsOf = (fi: Fi, records: Records): unknown[] => [
  ...KEY_SETTINGS.map((k) => fi.settings[k]),
  fi.settings.game.seriousEnvelopePct,
  ...KEY_COLLECTIONS.map((c) => records[c])
]
const keyOf = (fi: Fi, records: Records, date: string): FleetKey => ({ date, parts: partsOf(fi, records) })
const NO_PARTS: unknown[] = []
const sameKey = (a: FleetKey, b: FleetKey) => a.date === b.date && a.parts.every((p, i) => p === b.parts[i])

/** One computation for every screen that asks (the list, the editor…) until what it reads or the day changes. */
let memo: { key: FleetKey; state: FleetState } | null = null

/** The engine's input; `now` – the moment (its date is what counts; the goals' moments take the time too). */
const inputOf = (fi: Fi, records: Records, now: number): FleetInput => ({
  settings: fi.settings,
  transactions: listOf(records.transactions),
  containers: listOf(records.containers),
  goals: listOf(records.goals),
  months: listOf(records.months),
  dockings: listOf(records.dockings),
  loans: listOf(records.loans),
  balances: listOf(records.balances),
  now: new Date(now)
})

function fleetOf(fi: Fi, records: Records, now: number): FleetState {
  const key = keyOf(fi, records, warsawNow(new Date(now)).date)
  if (memo && sameKey(memo.key, key)) return memo.state
  const state = timed('silnik budżetu', () => computeFleet(inputOf(fi, records, now)))
  memo = { key, state }
  return state
}

/** The engine's input now (a preview of a change: the docking window). */
export function fleetInputNow(): FleetInput | null {
  const s = useData.getState()
  return s.fi ? inputOf(s.fi, s.records, Date.now()) : null
}

/** The ship's state now (shared/calc/fleet.ts) from the records in memory; recomputed when what it reads or the day changes. */
/** What the engine reads, as one value that changes with it (a memo's key – W10). */
export function useEngineParts(): readonly unknown[] {
  return useData(useShallow((s) => (s.fi ? partsOf(s.fi, s.records) : NO_PARTS)))
}

export function useFleet(): FleetState | null {
  const today = useToday()
  // Subscribed to what the engine reads only: a change of anything else renders nothing here.
  const parts = useEngineParts()
  return useMemo(() => {
    const s = useData.getState()
    return s.fi ? fleetOf(s.fi, s.records, Date.now()) : null
    // `parts` and `today` are the engine's key (read inside from the store's state of now).
  }, [parts, today])
}

/** The ship's state now outside React (the quick entry, the tray's tooltip, the notifications). */
export function fleetNow(): FleetState | null {
  const s = useData.getState()
  return s.fi ? fleetOf(s.fi, s.records, Date.now()) : null
}

/** The household's ledger as the engine counts it (D80: from the budget's start, up to today) – per operation too. */
export function useHousehold(): HouseholdLedger | null {
  return useFleet()?.household ?? null
}
