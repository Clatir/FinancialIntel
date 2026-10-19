/**
 * What is ahead (1.8.0): the buoys' days (F16), the radar's items with the shields after each (F27) and the accounts'
 * balances ahead (F26) – counted again only when what they read changes; the radar, the bridge's briefing and the
 * notifier share them.
 */
import { accountsAhead, type AccountAhead } from '@shared/calc/ahead'
import type { CargoStatus } from '@shared/calc/cargoStatus'
import { addDays } from '@shared/calc/dates'
import type { FleetState } from '@shared/calc/fleet'
import { radar, RADAR_DAYS, type RadarItem } from '@shared/calc/radar'
import { remindReach, scheduledWindow, type ScheduledDay } from '@shared/calc/scheduled'
import type { Settings } from '@shared/schema'
import { plnText } from '../../components/fields'
import { listOf, useData, type RecordMaps } from '../../store/data'
import { fleetNow, useFleet } from '../../store/fleet'
import { useMachine } from '../../store/machine'
import { cargoStatusesNow, useCargoStatuses } from '../cargo/status'
import { returnsNow, useReturns } from '../sensors/state'
import type { AwaitedReturn } from '@shared/calc/returns'

export interface Future {
  /** The buoys' days of the radar's window (90 days ahead). */
  days: ScheduledDay[]
  /** The same, as far as the longest reminder reaches (up to a year): the briefing and the notifications. */
  reminders: ScheduledDay[]
  items: RadarItem[]
  accounts: AccountAhead[]
}

const NONE: Future = { days: [], reminders: [], items: [], accounts: [] }
const zl = (g: number) => `${plnText(g)} zł`

type Parts = Pick<RecordMaps, 'scheduled' | 'transactions' | 'containers' | 'months'>
let memo: { fleet: FleetState; parts: Parts; accounts: Settings['accounts']; cargo: readonly CargoStatus[]; returns: readonly AwaitedReturn[]; hidden: boolean; out: Future } | null = null

function futureOf(fleet: FleetState | null, parts: Parts, accounts: Settings['accounts'] | undefined, cargo: readonly CargoStatus[], returns: readonly AwaitedReturn[], hidden: boolean): Future {
  if (!fleet || !accounts) return NONE
  const m = memo
  if (m && m.fleet === fleet && m.parts.scheduled === parts.scheduled && m.parts.transactions === parts.transactions && m.parts.containers === parts.containers && m.parts.months === parts.months && m.accounts === accounts && m.cargo === cargo && m.returns === returns && m.hidden === hidden) return m.out
  const transactions = listOf(parts.transactions)
  const list = listOf(parts.scheduled)
  // A reminder of more than 90 days (a passport: half a year) – its day looked at that far; the radar keeps its 90 days.
  const reach = remindReach(list, RADAR_DAYS)
  const reminders = scheduledWindow(list, transactions, fleet.today, reach)
  const edge = addDays(fleet.today, RADAR_DAYS)
  const days = reach > RADAR_DAYS ? reminders.filter((d) => d.date <= edge) : reminders
  const items = radar({
    today: fleet.today,
    plans: listOf(parts.months),
    containers: listOf(parts.containers),
    tanks: fleet.tanks,
    loans: fleet.loans,
    money: zl,
    cargo,
    scheduled: days,
    // The returns on the way (F34): expected money, never counted in the balances ahead.
    returns,
    layers: fleet.started
      ? { shields: fleet.shields.amount, hull: fleet.hull.amount, goals: fleet.goals.filter((g) => g.takes), targets: { shields: fleet.shields.target, hull: fleet.hull.target } }
      : undefined
  })
  const ahead = accountsAhead({ today: fleet.today, balances: fleet.accounts, accounts, items, transactions, end: edge })
  const out = { days, reminders, items, accounts: ahead }
  memo = { fleet, parts, accounts, cargo, returns, hidden, out }
  return out
}

export function useFuture(): Future {
  const fleet = useFleet()
  const scheduled = useData((s) => s.records.scheduled)
  const transactions = useData((s) => s.records.transactions)
  const containers = useData((s) => s.records.containers)
  const months = useData((s) => s.records.months)
  const accounts = useData((s) => s.fi?.settings.accounts)
  const cargo = useCargoStatuses()
  const returns = useReturns()
  // The notes carry amounts: masked or shown at once with Ctrl+$.
  const hidden = useMachine((s) => s.prefs.hideAmounts)
  return futureOf(fleet, { scheduled, transactions, containers, months }, accounts, cargo, returns, hidden)
}

/** The same outside React (the notifier). */
export function futureNow(): Future {
  const s = useData.getState()
  return futureOf(fleetNow(), s.records, s.fi?.settings.accounts, cargoStatusesNow(), returnsNow(), useMachine.getState().prefs.hideAmounts)
}
