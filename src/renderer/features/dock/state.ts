/**
 * The deliveries from the trading account now (`shared/calc/dock.ts`): the bridge's panel, the briefing, the docking
 * window and the notifications see the same list. The window of one delivery is open at a time (`openDocking`).
 */
import { useMemo } from 'react'
import { create } from 'zustand'
import { warsawNow } from '@shared/calc/dates'
import { deliveries, type Delivery } from '@shared/calc/dock'
import type { IctjSnapshot } from '@shared/ictj'
import type { RecordEntry } from '@shared/api'
import { useData } from '../../store/data'
import { fleetNow, useFleet } from '../../store/fleet'
import { useIctj } from '../../store/ictj'

type Records = ReturnType<typeof useData.getState>['records']
const recordsOf = <T,>(map: Record<string, RecordEntry<T>>): T[] => Object.values(map).map((e) => e.record)

const NO_SKIPPED: string[] = []

let memo: { tx: Records['transactions']; dk: Records['dockings']; skipped: readonly string[]; snap: IctjSnapshot; start: string | null; today: string; importedOn: string | null; list: Delivery[] } | null = null

function listOf(records: Records, skipped: readonly string[], snap: IctjSnapshot, start: string | null, today: string, importedOn: string | null): Delivery[] {
  if (memo && memo.tx === records.transactions && memo.dk === records.dockings && memo.skipped === skipped && memo.snap === snap && memo.start === start && memo.today === today && memo.importedOn === importedOn)
    return memo.list
  const list = deliveries({
    entries: snap.status === 'ok' ? snap.entries : [],
    transactions: recordsOf(records.transactions),
    dockings: recordsOf(records.dockings),
    start,
    today,
    skipped,
    ictjOn: snap.status === 'ok',
    importedOn
  })
  memo = { tx: records.transactions, dk: records.dockings, skipped, snap, start, today, importedOn, list }
  return list
}

type Fi = NonNullable<ReturnType<typeof useData.getState>['fi']>

/** Warsaw date of the last import from mBank (the latest of the accounts it is imported to). */
function importedOnOf(fi: Fi | null): string | null {
  if (!fi) return null
  const stamps = fi.settings.accounts.filter((a) => a.importFormat === 'mbank').map((a) => fi.settings.import.lastImport[a.id]).filter((x): x is string => !!x)
  return stamps.length ? warsawNow(stamps.sort().at(-1)!).date : null
}

export function useDeliveries(): Delivery[] {
  const fleet = useFleet()
  const records = useData((s) => s.records)
  const skipped = useData((s) => s.fi?.settings.ictj.skipped ?? NO_SKIPPED)
  const importedOn = useData((s) => importedOnOf(s.fi))
  const snap = useIctj((s) => s.snap)
  const start = fleet?.started ? fleet.start : null
  const today = fleet?.today ?? ''
  return useMemo(() => (fleet ? listOf(records, skipped, snap, start, today, importedOn) : []), [fleet, records, skipped, snap, start, today, importedOn])
}

/** The same list outside React (the notifications). */
export function deliveriesNow(): Delivery[] {
  const s = useData.getState()
  const fleet = fleetNow()
  if (!s.fi || !fleet) return []
  return listOf(s.records, s.fi.settings.ictj.skipped, useIctj.getState().snap, fleet.started ? fleet.start : null, fleet.today, importedOnOf(s.fi))
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
