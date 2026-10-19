/**
 * What the reports show (E8): the tab and the watch report's week – kept outside the page, so the Sunday notification
 * opens this week's watch report even when the page is open on another tab or week.
 */
import { create } from 'zustand'
import { warsawNow } from '@shared/calc/dates'
import { defaultWatchMonday } from '@shared/calc/intel'
import { navigate } from '../../store/ui'

export type ReportTab = 'briefing' | 'watch' | 'debrief' | 'year' | 'export'

/** A week chosen with the week due when it was chosen (N71): once another week is due, the choice is old – gone. */
export interface WatchChoice {
  monday: string
  base: string
}

export const useReportsUi = create<{ tab: ReportTab; watch: WatchChoice | null }>(() => ({ tab: 'watch', watch: null }))

export const setReportTab = (tab: ReportTab): void => useReportsUi.setState({ tab })

/** The week due now (the Sunday from 18:00 – T83). */
export const dueWatchMonday = (): string => {
  const { date, time } = warsawNow()
  return defaultWatchMonday(date, time)
}

export const setWatchMonday = (monday: string): void => useReportsUi.setState({ watch: { monday, base: dueWatchMonday() } })

/** The week shown: the one chosen while it is still the same week due, else the week due now. */
export const watchMondayOf = (watch: WatchChoice | null, due: string): string => (watch && watch.base === due ? watch.monday : due)

/** The watch report of the week due now (the notification's click). */
export function openWatchReport(): void {
  useReportsUi.setState({ tab: 'watch', watch: null })
  navigate({ page: 'reports' })
}
