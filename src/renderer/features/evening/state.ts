/**
 * The evening report (F13): „Dziś bez wydatków” (a day confirmed without expenses – the folder's, every computer knows
 * it) and „Przypomnij za 30 min” (this computer's). The notifier, the tray's menu and Operacje use them.
 */
import { addDays, warsawNow } from '@shared/calc/dates'
import { eveningState, type EveningState } from '@shared/notify'
import { listOf, updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'

const SNOOZE_KEY = 'fi.evening.snooze'
/** „Przypomnij za 30 min”. */
export const SNOOZE_MINUTES = 30
/** Confirmed days kept this long (the watch log has frozen them long before). */
const KEEP_DAYS = 400

/** The reminder put off today on this computer (null = not put off, or another day's). */
export function eveningSnooze(today: string): EveningState['snooze'] {
  try {
    const s = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? 'null') as { date?: string; until?: string; n?: number } | null
    return s && s.date === today && typeof s.until === 'string' && typeof s.n === 'number' ? { until: s.until, n: s.n } : null
  } catch {
    return null
  }
}

/** Put the reminder off for 30 minutes (at most until the day's end); returns the time it comes again. */
export function snoozeEvening(): string {
  const now = new Date(Date.now() + SNOOZE_MINUTES * 60_000)
  const { date: today } = warsawNow()
  const later = warsawNow(now)
  const until = later.date === today ? later.time : '23:59'
  const n = (eveningSnooze(today)?.n ?? 0) + 1
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify({ date: today, until, n }))
  } catch {
    /* storage unavailable: it comes again with the next check */
  }
  toast(`Przypomnę o ${until}.`, 'info', 3000)
  return until
}

/** „Dziś bez wydatków”: today confirmed (the watch log marks it, no evening reminder); „Cofnij” takes it back. */
export function confirmNoSpend(): boolean {
  const { date: today } = warsawNow()
  const cut = addDays(today, -KEEP_DAYS)
  const ok = updateSettings((f) => {
    const kept = Object.fromEntries(Object.entries(f.settings.game.noSpend).filter(([d]) => d >= cut))
    return { ...f, settings: { ...f.settings, game: { ...f.settings.game, noSpend: { ...kept, [today]: new Date().toISOString() } } } }
  })
  if (ok)
    toast('Dziś bez wydatków – zapisane w dzienniku wachty.', 'success', 6000, {
      label: 'Cofnij',
      run: () =>
        void updateSettings((f) => {
          const { [today]: _, ...rest } = f.settings.game.noSpend
          return { ...f, settings: { ...f.settings, game: { ...f.settings.game, noSpend: rest } } }
        })
    })
  return ok
}

/** Today's evening report as it is now (the notifier, outside React). */
export function eveningNow(): EveningState | undefined {
  const s = useData.getState()
  if (!s.fi) return undefined
  const { date: today } = warsawNow()
  return eveningState(listOf(s.records.transactions), today, s.fi.settings.game.noSpend, eveningSnooze(today))
}
