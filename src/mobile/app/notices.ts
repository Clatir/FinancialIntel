/**
 * The phone's notifications planned ahead (IP0.4, T308): the next week's morning briefings, evening reports and the
 * radar's days given to iOS at every opening and after each change of the data (a moment later). What iOS shows by
 * the plan the notifier of the open app does not show again: the planned keys due are kept as sent (`fi.notify.sent`)
 * a moment before their time – also the ones shown while the app was closed.
 */
import { useEffect, useState } from 'react'
import { warsawNow } from '@shared/calc/dates'
import { keepPlanned, plannedDue, plannedNotices } from '@shared/notifyPlan'
import type { PlannedNotice } from '@shared/notifyPlan'
import { useData } from '@renderer/store/data'
import { useFleet } from '@renderer/store/fleet'
import { useMachine } from '@renderer/store/machine'
import { useFuture } from '@renderer/features/radar/future'
import { eveningNow } from '@renderer/features/evening/state'
import { plnText } from '@renderer/components/fields'
import { planNotifications } from '../phone'
import { phoneHost } from '../hostRef'

/** Days planned ahead (today counts). */
const PLAN_DAYS = 7
const SENT_KEY = 'fi.notify.sent'
const PLANNED_KEY = 'fi.phone.planned'
/** The notifier checks every minute: the keys due within two are its as sent already. */
const DUE_AHEAD_MS = 120_000
const DUE_EVERY_MS = 30_000
/** Planned again this often while the app is open (a new day, a day confirmed without expenses). */
const REPLAN_EVERY_MS = 10 * 60_000

function readJson(key: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function writeJson(key: string, value: Record<string, string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: a notice may repeat */
  }
}

/** The new plan kept (with the ones iOS showed). */
function rememberPlan(list: readonly PlannedNotice[]): void {
  writeJson(PLANNED_KEY, keepPlanned(readJson(PLANNED_KEY), list, Date.now()))
}

/** The planned keys due soon: sent, for the notifier. */
export function markPlannedDue(now = Date.now()): void {
  const keys = plannedDue(readJson(PLANNED_KEY), now + DUE_AHEAD_MS)
  if (!keys.length) return
  const sent = readJson(SENT_KEY)
  const today = warsawNow().date
  let changed = false
  for (const k of keys) {
    if (sent[k]) continue
    sent[k] = today
    changed = true
  }
  if (changed) writeJson(SENT_KEY, sent)
}

let installed = false

/**
 * The planned keys due marked now, every half a minute and at each return to the app – before the notifier looks
 * (installed before `initNotifier`: the listeners of an event run in their order).
 */
export function installPlannedDue(): void {
  if (installed) return
  installed = true
  markPlannedDue()
  setInterval(() => markPlannedDue(), DUE_EVERY_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') markPlannedDue()
  })
}

export function NoticePlanner(): null {
  const fleet = useFleet()
  const future = useFuture()
  const prefs = useMachine((s) => s.prefs.notify)
  const hidden = useMachine((s) => s.prefs.hideAmounts)
  const quiet = useData((s) => s.fi?.settings.orders.quietHours)
  const transactions = useData((s) => s.records.transactions)
  const noSpend = useData((s) => s.fi?.settings.game.noSpend)
  // Again at a return to the app and every 10 minutes.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const again = () => setTick((n) => n + 1)
    const timer = setInterval(again, REPLAN_EVERY_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') again()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
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
        // Shown in the app already (an early opening's briefing): not again from iOS.
      }).filter((n) => !phoneHost().wasShown(n.key))
      planNotifications(list)
        .then(() => rememberPlan(list))
        .catch((e: unknown) => {
          // The old plan may be cancelled already: none of it is counted on.
          rememberPlan([])
          console.warn('plan notifications', e)
        })
    }, 1500)
    return () => clearTimeout(timer)
  }, [fleet, future, prefs, hidden, quiet, transactions, noSpend, tick])
  return null
}
