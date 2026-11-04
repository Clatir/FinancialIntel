/**
 * What the reports show (E8): the tab and the watch report's week – kept outside the page, so the Sunday notification
 * opens this week's watch report even when the page is open on another tab or week.
 */
import { create } from 'zustand'
import { warsawNow } from '@shared/calc/dates'
import { defaultWatchMonday } from '@shared/calc/intel'
import { exportPeriodOf, exportPeriodText } from '@shared/export/budget'
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

/** The year's review (the January notification's click – AP-24): in January the year just closed is its default. */
export function openYearReview(): void {
  useReportsUi.setState({ tab: 'year' })
  navigate({ page: 'reports' })
}

/** The watch report of the week due now (the notification's click). */
export function openWatchReport(): void {
  useReportsUi.setState({ tab: 'watch', watch: null })
  navigate({ page: 'reports' })
}

/** The export's period kept on this computer (AP-29, `exportPeriodOf`): a choice of this desk, not of the folder. */
const EXPORT_PERIOD_KEY = 'fi.reports.exportPeriod'

export function readExportPeriod(today: string): { from: string; to: string } {
  try {
    return exportPeriodOf(localStorage.getItem(EXPORT_PERIOD_KEY), today)
  } catch {
    return exportPeriodOf(null, today)
  }
}

export function storeExportPeriod(from: string, to: string, today: string): void {
  try {
    localStorage.setItem(EXPORT_PERIOD_KEY, exportPeriodText(from, to, today))
  } catch {
    /* storage unavailable: the period lives while the panel is open */
  }
}
