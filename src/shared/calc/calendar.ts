/**
 * The month's calendar on Radar (AP-42, T472–T474): a grid of the days (Monday to Sunday) with each day's energy and the
 * radar's items of that day. Nothing counted of its own – the energy is the engine's (`FleetState.daily`: the days past
 * as the game rated them, today as Mostek, the days ahead of this month as the engine would count tomorrow if nothing
 * more is spent today), the items are the radar's list (`calc/radar.ts`) put on their days. Pure.
 */
import { addDays, addMonths, dayOfMonth, daysInMonth, firstDayOf, lastDayOf, monthOf, weekdayOf } from './dates'
import { cappedEnergy, dailyAllowance, type FleetState } from './fleet'
import { RADAR_DAYS, type RadarItem } from './radar'

/** A day's energy in its cell: past – the allowance and the spending; today – Mostek's (with the energy shown); ahead – the forecast. */
export type CellEnergy = { state: 'past'; allowance: number; spent: number } | { state: 'today'; allowance: number; spent: number; energy: number } | { state: 'ahead'; allowance: number }

export interface CalendarDay {
  date: string
  /** The radar's items of the day, in the radar's order (the same objects). */
  items: RadarItem[]
  /** The money out of the budget and into it that day (grosze, both ≥ 0); a move inside (the salary) and no amount – neither. */
  out: number
  in: number
  /** null – not known: a day of a month ahead (its plan is not there), before the engine's days, no plan. */
  energy: CellEnergy | null
  /** After the radar's window (90 days): no items are looked for there. */
  beyond: boolean
}

export interface CalendarMonth {
  month: string
  /** Weeks from Monday: null – a day of the month before or after. */
  cells: Array<CalendarDay | null>
  /** The radar's items before the month's first day (a due of an earlier month still unpaid – D99 pkt 3): the first month only. */
  earlier: RadarItem[]
}

/** The months of the grid: from today's to the one the radar's window ends in. */
export function calendarMonths(today: string, days = RADAR_DAYS): string[] {
  const out: string[] = []
  const last = monthOf(addDays(today, days))
  for (let m = monthOf(today); m <= last; m = addMonths(m, 1)) out.push(m)
  return out
}

/**
 * Each day ahead of this month (T473): the allowance the engine counts tomorrow if nothing more is spent today – the
 * daily pool left over the days from tomorrow (today's refunds beyond its purchases in it, T370), never more than the
 * month's energy left (T371). null – no plan, or today is the month's last day.
 */
export function dayAhead(f: Pick<FleetState, 'today' | 'daily' | 'energy' | 'started'>): number | null {
  const d = f.daily
  if (!d) return null
  const month = monthOf(f.today)
  const day = dayOfMonth(f.today)
  if (day >= daysInMonth(month)) return null
  const a = dailyAllowance({ limit: d.limit, spentBefore: d.spentBefore + d.spentToday - d.returned, spentToday: 0, day: day + 1, daysInMonth: daysInMonth(month) }).allowance
  return f.started ? cappedEnergy(a, f.energy) : a
}

/** The grid of a month: its days with their energy and the radar's items (`items` – the radar's whole list). */
export function calendarMonth(month: string, f: Pick<FleetState, 'today' | 'daily' | 'energy' | 'started'>, items: readonly RadarItem[], days = RADAR_DAYS): CalendarMonth {
  const byDay = new Map<string, RadarItem[]>()
  const first = firstDayOf(month)
  const earlier: RadarItem[] = []
  for (const i of items) {
    if (i.date < first) {
      if (month === monthOf(f.today)) earlier.push(i)
      continue
    }
    const list = byDay.get(i.date)
    if (list) list.push(i)
    else byDay.set(i.date, [i])
  }
  const past = new Map((f.daily?.days ?? []).map((d) => [d.date, d]))
  const ahead = monthOf(f.today) === month ? dayAhead(f) : null
  const end = addDays(f.today, days)
  const cells: Array<CalendarDay | null> = Array.from({ length: weekdayOf(first) - 1 }, () => null)
  for (let date = first; date <= lastDayOf(month); date = addDays(date, 1)) {
    const list = byDay.get(date) ?? []
    let out = 0
    let inflow = 0
    for (const i of list) {
      if (i.amount == null) continue
      if (i.direction === 'out') out += i.amount
      else if (i.direction === 'in') inflow += i.amount
    }
    let energy: CellEnergy | null = null
    const d = past.get(date)
    if (date === f.today && f.daily) energy = { state: 'today', allowance: f.daily.allowance, spent: f.daily.spentToday, energy: f.daily.energy }
    else if (d && date < f.today) energy = { state: 'past', allowance: d.allowance, spent: d.spent }
    else if (date > f.today && ahead != null) energy = { state: 'ahead', allowance: ahead }
    cells.push({ date, items: list, out, in: inflow, energy, beyond: date > end })
  }
  while (cells.length % 7) cells.push(null)
  return { month, cells, earlier }
}
