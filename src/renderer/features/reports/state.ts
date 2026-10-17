/**
 * What the reports show (E8): the tab and the watch report's week – kept outside the page, so the Sunday notification
 * opens this week's watch report even when the page is open on another tab or week.
 */
import { create } from 'zustand'
import { warsawNow } from '@shared/calc/dates'
import { defaultWatchMonday } from '@shared/calc/intel'
import { navigate } from '../../store/ui'

export type ReportTab = 'briefing' | 'watch' | 'debrief' | 'year' | 'export'

export const useReportsUi = create<{ tab: ReportTab; watchMonday: string | null }>(() => ({ tab: 'watch', watchMonday: null }))

export const setReportTab = (tab: ReportTab): void => useReportsUi.setState({ tab })
export const setWatchMonday = (watchMonday: string): void => useReportsUi.setState({ watchMonday })

/** The watch report of the week due now (the notification's click). */
export function openWatchReport(): void {
  const { date, time } = warsawNow()
  useReportsUi.setState({ tab: 'watch', watchMonday: defaultWatchMonday(date, time) })
  navigate({ page: 'reports' })
}
