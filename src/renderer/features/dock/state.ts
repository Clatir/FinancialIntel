/**
 * The deliveries from the trading account now (`shared/calc/dock.ts`): the bridge's panel, the briefing, the docking
 * window and the notifications see the same list – the engine's pairs not docked yet too (`store/deliveries.ts`, one
 * memo). The window of one delivery is open at a time (`openDocking`).
 */
import { useMemo } from 'react'
import { create } from 'zustand'
import type { Delivery } from '@shared/calc/dock'
import { useData } from '../../store/data'
import { deliveriesFor, NO_COVERED, NO_SKIPPED } from '../../store/deliveries'
import { fleetNow, useFleet } from '../../store/fleet'
import { useIctj } from '../../store/ictj'

export function useDeliveries(): Delivery[] {
  const fleet = useFleet()
  // The operations and dockings only (W13): a change of anything else counts nothing again.
  const transactions = useData((s) => s.records.transactions)
  const dockings = useData((s) => s.records.dockings)
  const skipped = useData((s) => s.fi?.settings.ictj.skipped ?? NO_SKIPPED)
  const covered = useData((s) => s.fi?.settings.import.coveredTo ?? NO_COVERED)
  const snap = useIctj((s) => s.snap)
  const ready = !!fleet
  const start = fleet?.started ? fleet.start : null
  const today = fleet?.today ?? ''
  return useMemo(() => (ready ? deliveriesFor({ transactions, dockings }, skipped, snap, start, today, covered) : []), [ready, transactions, dockings, skipped, snap, start, today, covered])
}

/** The same list outside React (the notifications). */
export function deliveriesNow(): Delivery[] {
  const s = useData.getState()
  const fleet = fleetNow()
  if (!s.fi || !fleet) return []
  return deliveriesFor(s.records, s.fi.settings.ictj.skipped, useIctj.getState().snap, fleet.started ? fleet.start : null, fleet.today, s.fi.settings.import.coveredTo)
}

/** The docking window: the delivery's key, or null. */
export const useDocking = create<{ key: string | null }>(() => ({ key: null }))
export const openDocking = (key: string) => useDocking.setState({ key })
export const closeDocking = () => useDocking.setState({ key: null })

/** The first delivery to dock (the palette, a notification for several). */
export function openFirstDocking(): boolean {
  const d = deliveriesNow().find((x) => x.state === 'pending' || x.state === 'waiting')
  if (d) openDocking(d.key)
  return !!d
}

/** A notification's delivery (`dock:<key>`), else the first to dock. */
export function openDockingTag(tag: string): void {
  const key = tag.startsWith('dock:') ? tag.slice('dock:'.length) : null
  if (key && deliveriesNow().some((d) => d.key === key)) openDocking(key)
  else openFirstDocking()
}
