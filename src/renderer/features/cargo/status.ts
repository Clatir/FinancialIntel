import { cargoStatuses, type CargoStatus } from '@shared/calc/cargoStatus'
import type { FleetState } from '@shared/calc/fleet'
import { listOf, useData, type RecordMaps } from '../../store/data'
import { fleetNow, useFleet } from '../../store/fleet'

const NONE: CargoStatus[] = []
const NO_COVERED: Readonly<Record<string, string>> = {}

let memo: { today: string; tanks: FleetState['tanks']; containers: unknown; transactions: unknown; covered: unknown; list: CargoStatus[] } | null = null

/** The fixed fees of this month (F1): counted again only when what they read changes (the screens and the notifier share it). */
function statusesOf(fleet: FleetState | null, records: Pick<RecordMaps, 'containers' | 'transactions'>, covered: Readonly<Record<string, string>>): CargoStatus[] {
  if (!fleet) return NONE
  const m = memo
  if (m && m.today === fleet.today && m.tanks === fleet.tanks && m.containers === records.containers && m.transactions === records.transactions && m.covered === covered) return m.list
  const list = cargoStatuses({ containers: listOf(records.containers), transactions: listOf(records.transactions), today: fleet.today, tanks: fleet.tanks, coveredTo: covered })
  memo = { today: fleet.today, tanks: fleet.tanks, containers: records.containers, transactions: records.transactions, covered, list }
  return list
}

export function useCargoStatuses(): CargoStatus[] {
  const fleet = useFleet()
  const containers = useData((s) => s.records.containers)
  const transactions = useData((s) => s.records.transactions)
  const covered = useData((s) => s.fi?.settings.import.coveredTo ?? NO_COVERED)
  return statusesOf(fleet, { containers, transactions }, covered)
}

/** The same outside React (the notifier). */
export function cargoStatusesNow(): CargoStatus[] {
  const s = useData.getState()
  return statusesOf(fleetNow(), s.records, s.fi?.settings.import.coveredTo ?? NO_COVERED)
}
