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

/**
 * A morning moment: the end of the night's quiet hours, not before `earliest` (the default quiet hours end at 5:00 –
 * too early to ring). No quiet hours (from = to) or ones ending after noon (not a night): `earliest`.
 */
export function morningAt(quiet: { from: string; to: string }, earliest: string): string {
  const end = quiet.from !== quiet.to && quiet.to <= '12:00' ? quiet.to : earliest
  return end > earliest ? end : earliest
}

/** The morning briefing's notice; a radar day's reminder a little later. */
export const BRIEFING_FROM = '07:00'
export const RADAR_FROM = '09:00'

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
  const briefingAt = morningAt(quiet, BRIEFING_FROM)
  for (let d = o.today; d <= last; d = addDays(d, 1)) {
    // The morning briefing after the quiet hours (the first opening after them shows it in the app too – one key).
    if (p.briefing) add({ key: `briefing:${d}`, date: d, time: briefingAt, tag: 'briefing', title: 'Odprawa poranna', body: 'Energia dnia, alarmy i odprawa – Mostek.' })
    if (p.evening && !(d === o.today && o.evening?.done))
      add({ key: `evening:${d}`, date: d, time: eveningAt(p.eveningTime, quiet), tag: 'evening', title: 'Raport wachty dnia', body: eveningText(null) })
  }
  const morning = morningAt(quiet, RADAR_FROM)
  for (const it of o.items) {
    if (it.date < o.today || it.date > last || it.overdue || !radarWanted(it.kind, p)) continue
    const amount = it.amount != null ? ` · ${o.money(it.amount)}` : ''
    add({ key: `planned:${it.key}`, date: it.date, time: morning, tag: 'radar', title: RADAR_TITLE[it.kind] ?? 'Radar', body: `${it.name}${amount}${it.note ? ` – ${it.note}` : ''}` })
  }
  return out.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)).slice(0, PLANNED_MAX)
}

/**
 * What the phone planned (key → when), kept between openings: the ones past are iOS's to show (delivered, maybe already
 * cleared from the list), the rest are the new plan's. The planned ones no longer in the plan were cancelled.
 */
export function keepPlanned(kept: Readonly<Record<string, string>>, list: readonly PlannedNotice[], now: number): Record<string, string> {
  const out: Record<string, string> = {}
  // Two days back cover a night and a missed morning; older ones the notifier never asks about.
  const cut = now - 2 * 86_400_000
  for (const [key, at] of Object.entries(kept)) {
    const t = Date.parse(at)
    if (t >= cut && t <= now) out[key] = at
  }
  for (const n of list) out[n.key] = n.at
  return out
}

/** The planned keys iOS shows by `until` (ms) – the notifier of the open app must not show them again. */
export function plannedDue(kept: Readonly<Record<string, string>>, until: number): string[] {
  return Object.entries(kept)
    .filter(([, at]) => Date.parse(at) <= until)
    .map(([key]) => key)
}
