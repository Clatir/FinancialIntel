import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { computeFleet, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { settleHousehold, type HouseholdLedger } from '@shared/calc/household'
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

const inputOf = (fi: Fi, records: Records, now: number): FleetInput => ({
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

function fleetOf(fi: Fi, records: Records, now: number): FleetState {
  if (memo && memo.fi === fi && memo.records === records && memo.now === now) return memo.state
  const state = computeFleet(inputOf(fi, records, now))
  memo = { fi, records, now, state }
  return state
}

/** The engine's input now (a preview of a change: the docking window). */
export function fleetInputNow(): FleetInput | null {
  const s = useData.getState()
  return s.fi ? inputOf(s.fi, s.records, Date.now()) : null
}

/** The ship's state now (shared/calc/fleet.ts) from the records in memory; recomputed when they change. */
export function useFleet(): FleetState | null {
  const fi = useData((s) => s.fi)
  const records = useData((s) => s.records)
  const now = useMinute()
  return useMemo(() => (fi ? fleetOf(fi, records, now) : null), [fi, records, now])
}

/** The ship's state now outside React (the quick entry, the tray's tooltip, the notifications). */
export function fleetNow(): FleetState | null {
  const s = useData.getState()
  return s.fi ? fleetOf(s.fi, s.records, Math.floor(Date.now() / 60_000) * 60_000) : null
}

/** The household's ledger as the engine counts it (D80: from the budget's start, up to today) – per operation too. */
let ledgerMemo: { records: Records['transactions']; start: string | null; today: string; ledger: HouseholdLedger } | null = null

function ledgerOf(records: Records['transactions'], start: string | null, today: string): HouseholdLedger {
  if (ledgerMemo && ledgerMemo.records === records && ledgerMemo.start === start && ledgerMemo.today === today) return ledgerMemo.ledger
  const ledger = settleHousehold(recordsOf(records), { until: today, from: start })
  ledgerMemo = { records, start, today, ledger }
  return ledger
}

export function useHousehold(): HouseholdLedger | null {
  const fleet = useFleet()
  const records = useData((s) => s.records.transactions)
  return useMemo(() => (fleet ? ledgerOf(records, fleet.start, fleet.today) : null), [fleet, records])
}
