/**
 * The phone's notifications planned ahead (IP0.4, T306): iOS runs no app in the background, so at every opening (and
 * after a change of the data) the next days' reminders are given to the system – the morning briefing, the evening
 * report and the radar's days (payments, installments, buoys, PIT-38). What is due while the app is open comes as on
 * a computer (`notify.ts`). Nothing in the quiet hours; the keys are the notifier's (one is never shown twice).
 */
import { DateTime } from 'luxon'
import { addDays, inClockWindow, WARSAW } from './calc/dates'
import type { RadarItem } from './calc/radar'
import type { NotifyPrefs } from './machine'
import { eveningAt, eveningText, type EveningState } from './notify'

export interface PlannedNotice {
  key: string
  /** When (UTC ISO). */
  at: string
  title: string
  body: string
  /** Where its tap leads (the notifier's tags). */
  tag: string
}

export interface PlanInput {
  /** Warsaw now. */
  today: string
  time: string
  /** Days ahead planned (today counts). */
  days: number
  prefs: NotifyPrefs
  quietHours: { from: string; to: string }
  /** The radar's items (90 days). */
  items: readonly RadarItem[]
  money: (grosze: number) => string
  /** Today's evening report (done today – no reminder today). */
  evening: EveningState | null
  /** The budget started (no plan, nothing to brief about). */
  started: boolean
}

/** iOS keeps 64 planned notifications of an app: a margin for the ones due at once. */
export const PLANNED_MAX = 60

/** The moment of a Warsaw date and wall time. */
export function warsawAt(date: string, time: string): string {
  return DateTime.fromISO(`${date}T${time}`, { zone: WARSAW }).toUTC().toISO({ suppressMilliseconds: true }) as string
}

/** A radar day's reminder in the morning – after the quiet hours, not before 9:00. */
function morningOf(quiet: { to: string }): string {
  return quiet.to > '09:00' ? quiet.to : '09:00'
}

const RADAR_TITLE: Partial<Record<RadarItem['kind'], string>> = {
  asteroid: 'Asteroida dziś',
  fixed: 'Opłata stała dziś',
  installment: 'Rata pożyczki dziś',
  repayment: 'Spłata pożyczki dziś',
  pit38: 'PIT-38 – termin',
  plan: 'Boja na kursie dziś',
  end: 'Koniec kontenera',
  return: 'Zwrot w drodze – termin'
}

function radarWanted(kind: RadarItem['kind'], p: NotifyPrefs): boolean {
  switch (kind) {
    case 'asteroid':
    case 'fixed':
      return p.asteroid || p.cargo
    case 'installment':
    case 'repayment':
      return p.loans
    case 'pit38':
      return p.pit38
    case 'plan':
    case 'end':
      return p.plans
    case 'return':
      return p.returns
    default:
      return false
  }
}

export function plannedNotices(o: PlanInput): PlannedNotice[] {
  const out: PlannedNotice[] = []
  if (!o.started) return out
  const p = o.prefs
  const quiet = o.quietHours
  const add = (n: Omit<PlannedNotice, 'at'> & { date: string; time: string }) => {
    // Never in the quiet hours, never in the past.
    if (inClockWindow(n.time, quiet.from, quiet.to)) return
    if (n.date === o.today && n.time <= o.time) return
    out.push({ key: n.key, at: warsawAt(n.date, n.time), title: n.title, body: n.body, tag: n.tag })
  }
  const last = addDays(o.today, o.days - 1)
  for (let d = o.today; d <= last; d = addDays(d, 1)) {
    // The morning briefing at the end of the quiet hours (the first opening after them shows it in the app too).
    if (p.briefing) add({ key: `briefing:${d}`, date: d, time: quiet.to, tag: 'briefing', title: 'Odprawa poranna', body: 'Energia dnia, alarmy i odprawa – Mostek.' })
    if (p.evening && !(d === o.today && o.evening?.done))
      add({ key: `evening:${d}`, date: d, time: eveningAt(p.eveningTime, quiet), tag: 'evening', title: 'Raport wachty dnia', body: eveningText(null) })
  }
  const morning = morningOf(quiet)
  for (const it of o.items) {
    if (it.date < o.today || it.date > last || it.overdue || !radarWanted(it.kind, p)) continue
    const amount = it.amount != null ? ` · ${o.money(it.amount)}` : ''
    add({ key: `planned:${it.key}`, date: it.date, time: morning, tag: 'radar', title: RADAR_TITLE[it.kind] ?? 'Radar', body: `${it.name}${amount}${it.note ? ` – ${it.note}` : ''}` })
  }
  return out.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)).slice(0, PLANNED_MAX)
}
