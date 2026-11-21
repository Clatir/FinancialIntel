/**
 * Wywiad in tabs (D106 pt 6, T539): Struktura / Wydatki / Prognozy / Dziennik, the last one kept on this computer. The
 * 3 / 6 / 12 months switch belongs only to the tabs whose panels read it.
 */
import { addMonths, monthRange } from '@shared/calc/dates'

export type IntelTab = 'structure' | 'spending' | 'forecasts' | 'log'

export const INTEL_TABS: ReadonlyArray<{
  id: IntelTab
  label: string
  title: string
}> = [
  {
    id: 'structure',
    label: 'Struktura',
    title: 'Krzywa majątku, bilans paliwa, osłony i kadłub'
  },
  {
    id: 'spending',
    label: 'Wydatki',
    title: 'FVG kopert, porównanie miesiąca, wydatki w czasie, namierzone cele, Killzones, wyprawy, osobista inflacja'
  },
  {
    id: 'forecasts',
    label: 'Prognozy',
    title: 'Prognoza zasięgu, kurs na 12 miesięcy, prognoza wieloletnia, symulator manewrów'
  },
  {
    id: 'log',
    label: 'Dziennik',
    title: 'Dziennik kapitański: trafność planów i wpisy'
  }
]

export const TAB_KEY = 'fi.intel.tab'

/** Whether the panels of the tab read the page's period (3 / 6 / 12 months). */
export const tabReadsPeriod = (tab: IntelTab): boolean => tab === 'spending' || tab === 'log'

/** The page's period: 3 / 6 / 12 months. */
export type Period = '3' | '6' | '12'
export const PERIODS: ReadonlyArray<{ value: Period; label: string }> = [
  { value: '3', label: '3 mies.' },
  { value: '6', label: '6 mies.' },
  { value: '12', label: '12 mies.' }
]

/** The months of the period, ending with the current one. */
export const periodMonths = (month: string, period: Period): string[] => monthRange(addMonths(month, -(Number(period) - 1)), month)

export function readIntelTab(): IntelTab {
  try {
    const v = localStorage.getItem(TAB_KEY)
    return INTEL_TABS.some((t) => t.id === v) ? (v as IntelTab) : 'structure'
  } catch {
    return 'structure'
  }
}

export function storeIntelTab(tab: IntelTab): void {
  try {
    localStorage.setItem(TAB_KEY, tab)
  } catch {
    /* storage unavailable: the choice lives for the session */
  }
}
