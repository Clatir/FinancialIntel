import type { CargoWatch } from '@shared/calc/briefing'
import { cargoDays, cargoStatuses, type CargoStatus } from '@shared/calc/cargoStatus'
import { deadContainers, priceChanges } from '@shared/calc/cargoWatch'
import type { FleetState } from '@shared/calc/fleet'
import { recurringPayments, type RecurringPayment } from '@shared/calc/plan'
import { listOf, useData, type RecordMaps } from '../../store/data'
import { fleetNow, useFleet } from '../../store/fleet'
import { sensorTransactions } from '../sensors/inputs'

const NONE: CargoStatus[] = []
const NO_DAYS: ReadonlyMap<string, number> = new Map()
const NO_COVERED: Readonly<Record<string, string>> = {}

/** The fees' state (F1, AP-10): this month's dues, the earlier ones still unpaid, each container's payment day. */
interface CargoState {
  list: CargoStatus[]
  days: ReadonlyMap<string, number>
}

const EMPTY: CargoState = { list: NONE, days: NO_DAYS }

let memo: { today: string; start: string | null; containers: unknown; transactions: unknown; covered: unknown; state: CargoState } | null = null

/**
 * Counted again only when what it reads changes (the screens and the notifier share it) – the engine's day and start, not
 * its every run: the state never reads the tanks (T393 – its own rule, `feeDuesOf`).
 */
function stateOf(fleet: FleetState | null, records: Pick<RecordMaps, 'containers' | 'transactions'>, covered: Readonly<Record<string, string>>): CargoState {
  if (!fleet) return EMPTY
  const m = memo
  if (m && m.today === fleet.today && m.start === fleet.start && m.containers === records.containers && m.transactions === records.transactions && m.covered === covered) return m.state
  const containers = listOf(records.containers)
  const transactions = listOf(records.transactions)
  const state = {
    // The engine's budget start: the dues of the months before this one followed from it (D99 pkt 3).
    list: cargoStatuses({ containers, transactions, today: fleet.today, coveredTo: covered, start: fleet.start }),
    days: cargoDays({ containers, transactions, today: fleet.today })
  }
  memo = { today: fleet.today, start: fleet.start, containers: records.containers, transactions: records.transactions, covered, state }
  return state
}

function useCargoState(): CargoState {
  const fleet = useFleet()
  const containers = useData((s) => s.records.containers)
  const transactions = useData((s) => s.records.transactions)
  const covered = useData((s) => s.fi?.settings.import.coveredTo ?? NO_COVERED)
  return stateOf(fleet, { containers, transactions }, covered)
}

function stateNow(): CargoState {
  const s = useData.getState()
  return stateOf(fleetNow(), s.records, s.fi?.settings.import.coveredTo ?? NO_COVERED)
}

/** The fees' dues (F1, AP-10): this month's and the earlier ones still unpaid (`carried`). */
export const useCargoStatuses = (): CargoStatus[] => useCargoState().list

/** Each container's payment day (T376): the dues ahead on the Radar, in the briefing and in Ładownia. */
export const useCargoDays = (): ReadonlyMap<string, number> => useCargoState().days

/** The same outside React (the notifier). */
export const cargoStatusesNow = (): CargoStatus[] => stateNow().list
export const cargoDaysNow = (): ReadonlyMap<string, number> => stateNow().days

/** The cargo hold's watch (F9, F23): new prices, containers gone quiet, the history's proposals (the new ones apart). */
export interface CargoWatchState extends CargoWatch {
  /** All the history's recurring payments for the hold (D70, F23) – `fresh` the new ones of this month. */
  proposals: RecurringPayment[]
}

const NO_WATCH: CargoWatchState = { prices: [], dead: [], fresh: [], proposals: [] }
const NO_IGNORED: readonly string[] = []

let watchMemo: { today: string; history: string; containers: unknown; transactions: unknown; covered: unknown; ignored: unknown; state: CargoWatchState } | null = null

/**
 * Counted again only when what it reads changes (Ładownia, the bridge, the inbox and the notifier share it): the
 * operations as the sensors see them (a note typed counts nothing – `sensorTransactions`), the engine's months by their
 * content (the engine runs after every change).
 */
function watchOf(fleet: FleetState | null, records: Pick<RecordMaps, 'containers' | 'transactions'>, covered: Readonly<Record<string, string>>, ignored: readonly string[]): CargoWatchState {
  if (!fleet) return NO_WATCH
  const transactions = sensorTransactions(records.transactions)
  const history = fleet.historyMonths.join(',')
  const m = watchMemo
  if (m && m.today === fleet.today && m.history === history && m.containers === records.containers && m.transactions === transactions && m.covered === covered && m.ignored === ignored) return m.state
  const containers = listOf(records.containers)
  const input = { containers, transactions, today: fleet.today, coveredTo: covered }
  // The months the engine's averages read (B23, B25): the same proposals as the wizard's.
  const proposals = recurringPayments(transactions, fleet.month, containers, fleet.historyMonths, new Set(ignored))
  const state = { prices: priceChanges(input), dead: deadContainers(input), fresh: proposals.filter((p) => p.fresh), proposals }
  watchMemo = { today: fleet.today, history, containers: records.containers, transactions, covered, ignored, state }
  return state
}

export function useCargoWatch(): CargoWatchState {
  const fleet = useFleet()
  const containers = useData((s) => s.records.containers)
  const transactions = useData((s) => s.records.transactions)
  const covered = useData((s) => s.fi?.settings.import.coveredTo ?? NO_COVERED)
  const ignored = useData((s) => s.fi?.settings.cargo.ignored ?? NO_IGNORED)
  return watchOf(fleet, { containers, transactions }, covered, ignored)
}

/** The same outside React (the notifier, the inbox's counter). */
export function cargoWatchNow(): CargoWatchState {
  const s = useData.getState()
  return watchOf(fleetNow(), s.records, s.fi?.settings.import.coveredTo ?? NO_COVERED, s.fi?.settings.cargo.ignored ?? NO_IGNORED)
}
