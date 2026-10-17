import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { computeFleet, type FleetState } from '@shared/calc/fleet'
import type { RecordEntry } from '@shared/api'
import { useData } from './data'

/** A clock shared by the screens: the minute changes the budget's day and today's energy. */
const useClockStore = create<{ now: number }>(() => ({ now: Date.now() }))
let ticking = 0
let timer: ReturnType<typeof setInterval> | null = null

/** Current time, refreshed every minute while some screen uses it. */
export function useMinute(): number {
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
  return useClockStore((s) => Math.floor(s.now / 60_000) * 60_000)
}

const recordsOf = <T,>(map: Record<string, RecordEntry<T>>): T[] => Object.values(map).map((e) => e.record)

type Records = ReturnType<typeof useData.getState>['records']
type Fi = NonNullable<ReturnType<typeof useData.getState>['fi']>

/** One computation for every screen that asks (the list, the editor…) until the records, settings or minute change. */
let memo: { fi: Fi; records: Records; now: number; state: FleetState } | null = null

function fleetOf(fi: Fi, records: Records, now: number): FleetState {
  if (memo && memo.fi === fi && memo.records === records && memo.now === now) return memo.state
  const state = computeFleet({
    settings: fi.settings,
    transactions: recordsOf(records.transactions),
    containers: recordsOf(records.containers),
    goals: recordsOf(records.goals),
    months: recordsOf(records.months),
    dockings: recordsOf(records.dockings),
    loans: recordsOf(records.loans),
    balances: recordsOf(records.balances),
    now: new Date(now)
  })
  memo = { fi, records, now, state }
  return state
}

/** The ship's state now (shared/calc/fleet.ts) from the records in memory; recomputed when they change. */
export function useFleet(): FleetState | null {
  const fi = useData((s) => s.fi)
  const records = useData((s) => s.records)
  const now = useMinute()
  return useMemo(() => (fi ? fleetOf(fi, records, now) : null), [fi, records, now])
}
