/**
 * Calendar arithmetic on plain dates ('RRRR-MM-DD') and months ('RRRR-MM') – the budget lives in Warsaw dates, so
 * the math is on the calendar (UTC midnights, no DST) and only "now" goes through the Warsaw zone.
 */
import { DateTime } from 'luxon'

export const WARSAW = 'Europe/Warsaw'

/** Warsaw date, wall time and month of a moment. */
export function warsawNow(now: Date | string = new Date()): { date: string; time: string; month: string } {
  const dt = (typeof now === 'string' ? DateTime.fromISO(now) : DateTime.fromJSDate(now)).setZone(WARSAW)
  const date = dt.toISODate() as string
  return { date, time: dt.toFormat('HH:mm'), month: date.slice(0, 7) }
}

/** Warsaw date and time ('RRRR-MM-DD HH:MM') of an ISO timestamp: orders it among operations. */
export function warsawStamp(iso: string): string {
  const dt = DateTime.fromISO(iso).setZone(WARSAW)
  return dt.isValid ? dt.toFormat('yyyy-LL-dd HH:mm') : iso
}

const utc = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)))
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export const monthOf = (date: string): string => date.slice(0, 7)
export const firstDayOf = (month: string): string => `${month}-01`
export const dayOfMonth = (date: string): number => Number(date.slice(8, 10))

export function daysInMonth(month: string): number {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
}

export function lastDayOf(month: string): string {
  return `${month}-${String(daysInMonth(month)).padStart(2, '0')}`
}

export function addDays(date: string, n: number): string {
  return iso(utc(date) + n * 86_400_000)
}

/** Whole days from `a` to `b` (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000)
}

export function addMonths(month: string, n: number): string {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + n
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** Months from `a` to `b` (b − a). */
export function monthsBetween(a: string, b: string): number {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7))
}

/** Months from `from` to `to`, both included (empty when `to` is earlier). */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m)
  return out
}

/** ISO weekday 1 (Monday) … 7 (Sunday) of a date. */
export function weekdayOf(date: string): number {
  const d = new Date(utc(date)).getUTCDay()
  return d === 0 ? 7 : d
}

/** The first moment of a Warsaw day. */
export function warsawStartOf(date: string): Date {
  return DateTime.fromISO(date, { zone: WARSAW }).startOf('day').toJSDate()
}

/** The last moment of a Warsaw day (the state of the day's end – the game rates it, E7). */
export function warsawEndOf(date: string): Date {
  return DateTime.fromISO(date, { zone: WARSAW }).endOf('day').toJSDate()
}

/** ISO week 'RRRR-Www' of a date (weeks from Monday; the week of 4 January is the first). */
export function isoWeekOf(date: string): string {
  const dt = DateTime.fromISO(date, { zone: 'utc' })
  return `${dt.weekYear}-W${String(dt.weekNumber).padStart(2, '0')}`
}

/** Monday of the week of `date`. */
export const mondayOf = (date: string): string => addDays(date, 1 - weekdayOf(date))

/** Monday of an ISO week 'RRRR-Www'. */
export function mondayOfWeek(week: string): string {
  return DateTime.fromObject({ weekYear: Number(week.slice(0, 4)), weekNumber: Number(week.slice(6, 8)), weekday: 1 }, { zone: 'utc' }).toISODate() as string
}

/** Is the wall time `time` ('HH:MM') inside [from, to) – a window may cross midnight (23:00–05:00). */
export function inClockWindow(time: string, from: string, to: string): boolean {
  if (from === to) return false
  return from < to ? time >= from && time < to : time >= from || time < to
}
