import { useMemo, useState } from 'react'
import { warsawNow } from '@shared/calc/dates'
import { eveningState, eveningText } from '@shared/notify'
import { listOf, useData, useFolderLocked } from '../../store/data'
import { useMinute } from '../../store/fleet'
import { useMachine } from '../../store/machine'
import { api } from '../../lib/api'
import { confirmNoSpend, eveningSnooze, snoozeEvening } from './state'

const NO_DAYS: Record<string, string> = {}

/**
 * The evening report in Operacje (F13): from the evening reminder's hour until the day is done – „Dopisz” (the quick
 * entry), „Dziś bez wydatków”, „Przypomnij za 30 min” (hidden here until then too).
 */
export function EveningReport() {
  const minute = useMinute()
  const eveningTime = useMachine((s) => s.prefs.notify.eveningTime)
  const transactions = useData((s) => s.records.transactions)
  const noSpend = useData((s) => s.fi?.settings.game.noSpend ?? NO_DAYS)
  const locked = useFolderLocked()
  // A snooze taken here shows at once (the storage is not reactive).
  const [snoozed, setSnoozed] = useState(0)
  const { date: today, time } = warsawNow(new Date(minute))
  const state = useMemo(() => eveningState(listOf(transactions), today, noSpend, eveningSnooze(today)), [transactions, today, noSpend, snoozed, minute])
  if (time < eveningTime || state.done || (state.snooze && time < state.snooze.until)) return null
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-accent/40 bg-accent-soft px-3 py-1.5 text-[12px]" data-testid="evening-report">
      <span className="text-fg-strong">Raport wachty dnia</span>
      <span className="text-muted">{eveningText(state.written)}</span>
      <span className="flex-1" />
      <button className="btn h-[22px]" onClick={() => void api.quickOpen()} data-testid="evening-quick">
        Dopisz
      </button>
      <button className="btn h-[22px]" disabled={locked} onClick={() => confirmNoSpend()} data-testid="evening-nospend">
        Dziś bez wydatków
      </button>
      <button
        className="btn btn-ghost h-[22px]"
        onClick={() => {
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
