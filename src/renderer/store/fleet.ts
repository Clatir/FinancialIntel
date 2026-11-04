import { useEffect, useMemo, useRef } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'
import { warsawNow } from '@shared/calc/dates'
import { deliveries, pendingPairsOf, preStartTaxOf } from '@shared/calc/dock'
import { budgetStartOf, computeFleet, type FleetInput, type FleetState, type PendingPair } from '@shared/calc/fleet'
import type { HouseholdLedger } from '@shared/calc/household'
import type { IctjEntry, IctjSnapshot } from '@shared/ictj'
import { listOf, useData } from './data'
import { useIctj } from './ictj'
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
type Entries = readonly IctjEntry[]

// Of the game's settings only the serious overrun's threshold (N102: it colours the envelopes' alarms) – the day without
// spending and the game's start written in the background never run the engine again.
const partsOf = (fi: Fi, records: Records): unknown[] => [
  ...KEY_SETTINGS.map((k) => fi.settings[k]),
  fi.settings.game.seriousEnvelopePct,
  ...KEY_COLLECTIONS.map((c) => records[c])
]
// The pool „Podatek” paired before the start too (N38) and the pairs not docked yet (AP-12) – their maps, the same objects
// while their content is the same (a new snapshot of ICTTJ with the same payouts runs nothing again).
const keyOf = (fi: Fi, records: Records, date: string, snap: IctjSnapshot): FleetKey => ({
  date,
  parts: [...partsOf(fi, records), preStartTaxFor(fi, records, snap.entries, date), pendingPairsFor(fi, records, snap, date)]
})
const NO_PARTS: unknown[] = []
const sameKey = (a: FleetKey, b: FleetKey) => a.date === b.date && a.parts.every((p, i) => p === b.parts[i])

/** One computation for every screen that asks (the list, the editor…) until what it reads or the day changes. */
let memo: { key: FleetKey; state: FleetState } | null = null

/** The payouts of the pool „Podatek” paired before the start (N38), once per what they read. */
let taxMemo: { parts: readonly unknown[]; map: ReadonlyMap<string, number> } | null = null

function preStartTaxFor(fi: Fi, records: Records, entries: Entries, today: string): ReadonlyMap<string, number> {
  const transactions = listOf(records.transactions)
  const dockings = listOf(records.dockings)
  const start = budgetStartOf(fi.settings, listOf(records.balances), today)
  const parts = [entries, transactions, dockings, start, fi.settings.ictj.skipped]
  if (taxMemo && taxMemo.parts.every((p, i) => p === parts[i])) return taxMemo.map
  const fresh = preStartTaxOf({ entries, transactions, dockings, start, skipped: fi.settings.ictj.skipped })
  const same = !!taxMemo && taxMemo.map.size === fresh.size && [...fresh].every(([id, v]) => taxMemo!.map.get(id) === v)
  const map = same ? taxMemo!.map : fresh
  taxMemo = { parts, map }
  return map
}

const NO_PAIRS: ReadonlyMap<string, PendingPair> = new Map()
/** The pairs of ICTTJ payouts not docked yet (AP-12), once per what they read. */
let pairsMemo: { parts: readonly unknown[]; map: ReadonlyMap<string, PendingPair> } | null = null

/**
 * The ICTTJ payouts paired with an operation and not docked yet (AP-12, T341): the engine counts them by the entry's pool.
 * The pairs of the docking's list (`features/dock/state.ts` – the same ICTTJ snapshot, operations and dockings); ICTTJ
 * not read on this computer – none (the usual order, as before).
 */
function pendingPairsFor(fi: Fi, records: Records, snap: IctjSnapshot, today: string): ReadonlyMap<string, PendingPair> {
  const transactions = listOf(records.transactions)
  const dockings = listOf(records.dockings)
  const start = budgetStartOf(fi.settings, listOf(records.balances), today)
  const parts = [snap, transactions, dockings, start, fi.settings.ictj.skipped, today]
  if (pairsMemo && pairsMemo.parts.every((p, i) => p === parts[i])) return pairsMemo.map
  const fresh =
    snap.status === 'ok' && snap.entries.length && start && start <= today
      ? pendingPairsOf(
          deliveries({
            entries: snap.entries,
            transactions,
            dockings,
            start,
            today,
            skipped: fi.settings.ictj.skipped,
            ictjOn: true,
            entriesComplete: snap.complete !== false,
            unreadEntries: snap.unread,
            // The bank's file decides only for an entry without a pair (Portfel XTB or waiting) – no pair either way.
            coveredTo: null
          })
        )
      : NO_PAIRS
  const prev = pairsMemo?.map
  const same = !!prev && prev.size === fresh.size && [...fresh].every(([id, p]) => prev.get(id)?.pool === p.pool && prev.get(id)?.entryDate === p.entryDate)
  const map = same ? prev : fresh
  pairsMemo = { parts, map }
  return map
}

/** The engine's input; `now` – the moment (its date is what counts; the goals' moments take the time too). */
const inputOf = (fi: Fi, records: Records, now: number, snap: IctjSnapshot = useIctj.getState().snap): FleetInput => {
  const date = warsawNow(new Date(now)).date
  return {
    settings: fi.settings,
    transactions: listOf(records.transactions),
    preStartTax: preStartTaxFor(fi, records, snap.entries, date),
    pendingPairs: pendingPairsFor(fi, records, snap, date),
    containers: listOf(records.containers),
    goals: listOf(records.goals),
    months: listOf(records.months),
    dockings: listOf(records.dockings),
    loans: listOf(records.loans),
    balances: listOf(records.balances),
    now: new Date(now)
  }
}

/** The pairs not docked yet as the engine counts them now (AP-12) – the game rates the days by them too. */
export function pendingPairsNow(): ReadonlyMap<string, PendingPair> {
  const s = useData.getState()
  return s.fi ? pendingPairsFor(s.fi, s.records, useIctj.getState().snap, warsawNow().date) : NO_PAIRS
}

function fleetOf(fi: Fi, records: Records, now: number): FleetState {
  const snap = useIctj.getState().snap
  const key = keyOf(fi, records, warsawNow(new Date(now)).date, snap)
  if (memo && sameKey(memo.key, key)) return memo.state
  const state = timed('silnik budżetu', () => computeFleet(inputOf(fi, records, now, snap)))
  memo = { key, state }
  return state
}

/** The engine's input now (a preview of a change: the docking window). */
export function fleetInputNow(): FleetInput | null {
  const s = useData.getState()
  return s.fi ? inputOf(s.fi, s.records, Date.now()) : null
}

/** The ship's state now (shared/calc/fleet.ts) from the records in memory; recomputed when what it reads or the day changes. */
/**
 * What the engine reads, as one value that changes with it (a memo's key – W10): the records, the map of the pool
 * „Podatek” before the start and the pairs not docked yet (ICTTJ's payouts – the same maps while nothing of them changed).
 */
export function useEngineParts(): readonly unknown[] {
  const parts = useData(useShallow((s) => (s.fi ? partsOf(s.fi, s.records) : NO_PARTS)))
  const snap = useIctj((s) => s.snap)
  const today = useToday()
  const last = useRef<readonly unknown[]>(NO_PARTS)
  const next = useMemo(() => {
    const s = useData.getState()
    return s.fi ? [...parts, preStartTaxFor(s.fi, s.records, snap.entries, today), pendingPairsFor(s.fi, s.records, snap, today)] : NO_PARTS
  }, [parts, snap, today])
  if (next.length !== last.current.length || next.some((p, i) => p !== last.current[i])) last.current = next
  return last.current
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

type LayersTargets = Pick<FleetInput['settings']['layers'], 'shieldSalaries' | 'hullMonths' | 'assumedCosts'>
let layersMemo: { base: FleetState; key: string; state: FleetState } | null = null

/**
 * The ship's state with other layers' targets (AP-17, T374 – the preview in Ustawienia and the toast of the change): the
 * engine's input now, the whole history counted again from the start – once per targets while the records and the day
 * stay (the preview of a typed value and its save on leaving the field share one run).
 */
export function fleetWithLayers(patch: Partial<LayersTargets>): FleetState | null {
  const base = fleetNow()
  const input = base ? fleetInputNow() : null
  if (!base || !input) return null
  const layers = { ...input.settings.layers, ...patch }
  const key = JSON.stringify([layers.shieldSalaries, layers.hullMonths, layers.assumedCosts])
  if (layersMemo && layersMemo.base === base && layersMemo.key === key) return layersMemo.state
  const state = timed('silnik budżetu – podgląd celów warstw', () => computeFleet({ ...input, settings: { ...input.settings, layers } }))
  layersMemo = { base, key, state }
  return state
}

/** The household's ledger as the engine counts it (D80: from the budget's start, up to today) – per operation too. */
export function useHousehold(): HouseholdLedger | null {
  return useFleet()?.household ?? null
}
