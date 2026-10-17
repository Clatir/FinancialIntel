import type { ReactNode } from 'react'
import { IconBox, IconCalendar, IconChart, IconHelm, IconImport, IconList, IconRadar, IconRank, IconReport, IconStar } from '../../components/icons'
import type { Page } from '../../store/ui'

export interface PageDef {
  page: Exclude<Page, 'settings' | 'sync' | 'wizard'>
  label: string
  /** The metaphor's subtitle in the menu (decision D34: the metaphor with the real name). */
  sub: string
  icon: (size: number) => ReactNode
  /** The stage that builds the screen (docs/plan.md). */
  stage: string
  /** Ctrl + this key opens the screen (Ctrl+1…0 in the menu's order). */
  key: string
  /** The screen is built; a screen of a later stage is dimmed in the menu until then. */
  ready: boolean
}

/** Screens of the side menu in their order (docs/specyfikacja.md, „Ekrany”). */
export const PAGES: readonly PageDef[] = [
  { page: 'bridge', label: 'Mostek', sub: 'stan okrętu', icon: (s) => <IconHelm size={s} />, stage: 'E4', key: '1', ready: true },
  { page: 'operations', label: 'Operacje', sub: 'wydatki i wpływy', icon: (s) => <IconList size={s} />, stage: 'E1', key: '2', ready: true },
  { page: 'import', label: 'Import', sub: 'CSV z mBanku', icon: (s) => <IconImport size={s} />, stage: 'E2', key: '3', ready: true },
  { page: 'month', label: 'Plan miesiąca', sub: 'pensja i koperty', icon: (s) => <IconCalendar size={s} />, stage: 'E3', key: '4', ready: true },
  { page: 'cargo', label: 'Ładownia', sub: 'stałe koszty', icon: (s) => <IconBox size={s} />, stage: 'E3', key: '5', ready: true },
  { page: 'starmap', label: 'Mapa gwiezdna', sub: 'cele', icon: (s) => <IconStar size={s} />, stage: 'E5', key: '6', ready: true },
  { page: 'radar', label: 'Radar', sub: '90 dni', icon: (s) => <IconRadar size={s} />, stage: 'E6', key: '7', ready: true },
  { page: 'command', label: 'Dowództwo', sub: 'rozkazy i stopnie', icon: (s) => <IconRank size={s} />, stage: 'E7', key: '8', ready: false },
  { page: 'intel', label: 'Wywiad', sub: 'analizy ICT', icon: (s) => <IconChart size={s} />, stage: 'E8', key: '9', ready: false },
  { page: 'reports', label: 'Raporty', sub: 'odprawy i eksport', icon: (s) => <IconReport size={s} />, stage: 'E8', key: '0', ready: false }
]

export const pageDef = (page: Page): PageDef | undefined => PAGES.find((p) => p.page === page)
