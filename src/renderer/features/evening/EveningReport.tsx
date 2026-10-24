import { useMemo, useState } from 'react'
import { warsawNow } from '@shared/calc/dates'
import { eveningAt, eveningState, eveningText } from '@shared/notify'
import { listOf, useData, useFolderLocked } from '../../store/data'
import { useMinute } from '../../store/fleet'
import { useMachine } from '../../store/machine'
import { api } from '../../lib/api'
import { confirmNoSpend, eveningSnooze, reopenEvening, snoozeEvening } from './state'

const NO_DAYS: Record<string, string> = {}

/**
 * The evening report in Operacje (F13): from the evening reminder's hour until the day is done – „Dopisz” (the quick
 * entry), „Dziś bez wydatków”, „Przypomnij za 30 min” (hidden here until then too), plus „Wznów raport wachty” (N-PC-20).
 */
export function EveningReport() {
  const minute = useMinute()
  const eveningTime = useMachine((s) => s.prefs.notify.eveningTime)
  const quietFrom = useData((s) => s.fi?.settings.orders.quietHours.from)
  const quietTo = useData((s) => s.fi?.settings.orders.quietHours.to)
  const transactions = useData((s) => s.records.transactions)
  const noSpend = useData((s) => s.fi?.settings.game.noSpend ?? NO_DAYS)
  const locked = useFolderLocked()
  // A snooze taken here shows at once (the storage is not reactive).
  const [snoozed, setSnoozed] = useState(0)
  const [forceOpen, setForceOpen] = useState(false)
  const { date: today, time } = warsawNow(new Date(minute))
  const state = useMemo(() => eveningState(listOf(transactions), today, noSpend, eveningSnooze(today)), [transactions, today, noSpend, snoozed, minute])
  // Its hour in the quiet hours: the minute before them, as the notification (N104).
  const from = quietFrom && quietTo ? eveningAt(eveningTime, { from: quietFrom, to: quietTo }) : eveningTime
  if (time < from) return null
  const isSnoozed = !!(state.snooze && time < state.snooze.until)
  const isNoSpend = !!noSpend[today]
  if ((state.done || isSnoozed) && !forceOpen) {
    if (!isNoSpend && !isSnoozed) return null
    return (
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-bg-elevated/40 px-3 py-1 text-[11px] text-muted" data-testid="evening-closed">
        <span>
          {isNoSpend
            ? 'Raport wachty zamknięty („Dziś bez wydatków”)'
            : `Raport wachty odłożony do ${state.snooze?.until}`}
        </span>
        <span className="flex-1" />
        <button
          className="btn btn-ghost h-[20px] px-2 text-[11px]"
          disabled={locked}
          onClick={() => {
            reopenEvening()
            setForceOpen(true)
            setSnoozed((n) => n + 1)
          }}
          data-testid="watch-reopen"
        >
          Wznów raport wachty
        </button>
      </div>
    )
  }
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-accent/40 bg-accent-soft px-3 py-1.5 text-[12px]" data-testid="evening-report">
      <span className="text-fg-strong">Raport wachty dnia</span>
      <span className="text-muted">{eveningText(state.written)}</span>
      <span className="flex-1" />
      <button className="btn h-[22px]" onClick={() => void api.quickOpen()} data-testid="evening-quick">
        Dopisz
      </button>
      <button
        className="btn h-[22px]"
        disabled={locked}
        onClick={() => {
          setForceOpen(false)
          confirmNoSpend()
        }}
        data-testid="evening-nospend"
      >
        Dziś bez wydatków
      </button>
      <button
        className="btn btn-ghost h-[22px]"
        onClick={() => {
          setForceOpen(false)
          snoozeEvening()
          setSnoozed((n) => n + 1)
        }}
        data-testid="evening-snooze"
      >
        Przypomnij za 30 min
      </button>
    </div>
  )
}
