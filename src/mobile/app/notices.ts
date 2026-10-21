/**
 * The phone's notifications planned ahead (IP0.4): the next week's morning briefings, evening reports and the radar's
 * days given to iOS at every opening and after each change of the data (a moment later); the ones iOS delivered
 * while the app was closed are not shown again by the notifier (`fi.notify.sent`).
 */
import { useEffect } from 'react'
import { warsawNow } from '@shared/calc/dates'
import { plannedNotices } from '@shared/notifyPlan'
import { useData } from '@renderer/store/data'
import { useFleet } from '@renderer/store/fleet'
import { useMachine } from '@renderer/store/machine'
import { useFuture } from '@renderer/features/radar/future'
import { eveningNow } from '@renderer/features/evening/state'
import { plnText } from '@renderer/components/fields'
import { deliveredNotices, planNotifications } from '../phone'

/** Days planned ahead (today counts). */
const PLAN_DAYS = 7
const SENT_KEY = 'fi.notify.sent'

/** The keys iOS delivered: shown – the notifier keeps them as sent (its own list, by day). */
async function markDelivered(): Promise<void> {
  const keys = await deliveredNotices().catch(() => [] as string[])
  if (!keys.length) return
  try {
    const all = JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}') as Record<string, string>
    const today = warsawNow().date
    for (const k of keys) all[k] ??= today
    localStorage.setItem(SENT_KEY, JSON.stringify(all))
  } catch {
    /* storage unavailable: a notice may repeat */
  }
}

export function NoticePlanner(): null {
  const fleet = useFleet()
  const future = useFuture()
  const prefs = useMachine((s) => s.prefs.notify)
  const hidden = useMachine((s) => s.prefs.hideAmounts)
  const quiet = useData((s) => s.fi?.settings.orders.quietHours)
  const transactions = useData((s) => s.records.transactions)
  useEffect(() => {
    void markDelivered()
  }, [])
  useEffect(() => {
    if (!fleet || !quiet) return
    const timer = setTimeout(() => {
      const now = warsawNow()
      const list = plannedNotices({
        today: now.date,
        time: now.time,
        days: PLAN_DAYS,
        prefs,
        quietHours: quiet,
        items: future.items,
        // The hidden amounts stay hidden in the notifications too.
        money: (g) => `${plnText(g)} zł`,
        evening: eveningNow() ?? null,
        started: fleet.started
      })
      void planNotifications(list).catch((e: unknown) => console.warn('plan notifications', e))
    }, 1500)
    return () => clearTimeout(timer)
  }, [fleet, future, prefs, hidden, quiet, transactions])
  return null
}
