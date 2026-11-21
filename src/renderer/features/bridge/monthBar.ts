/**
 * The month's bar over the briefing (UX-32): how this month goes – the daily envelopes spent of their limit, the day of
 * the month, today's spending against today's allowance. Only the engine's numbers (`FleetState.daily` – the same
 * „Energia dziś” and „skąd ta liczba?” read); pure, so tested in node.
 */
import { dayOfMonth, daysInMonth } from '@shared/calc/dates'
import type { FleetState } from '@shared/calc/fleet'

export interface MonthBar {
  /** Spent from the daily envelopes this month (before today and today). */
  spent: number
  /** The daily envelopes' limit this month (the plan and the loot kept in them). */
  limit: number
  /** The day of the month and its number of days. */
  day: number
  days: number
  /** Spent today, and today's allowance (before today's spending). */
  today: number
  allowance: number
}

/** The bar's numbers; null – the budget not started or no plan this month (no daily envelopes to count). */
export function monthBarOf(f: Pick<FleetState, 'started' | 'today' | 'month' | 'daily'>): MonthBar | null {
  const d = f.daily
  if (!f.started || !d) return null
  return { spent: d.spentBefore + d.spentToday, limit: d.limit, day: dayOfMonth(f.today), days: daysInMonth(f.month), today: d.spentToday, allowance: d.allowance }
}
