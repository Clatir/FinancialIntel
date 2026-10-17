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
  /** Built in the 1.0 release (E0–E4); later screens are dimmed in the menu until their stage. */
  mvp: boolean
}

/** Screens of the side menu in their order (docs/specyfikacja.md, „Ekrany”). */
export const PAGES: readonly PageDef[] = [
  { page: 'bridge', label: 'Mostek', sub: 'stan okrętu', icon: (s) => <IconHelm size={s} />, stage: 'E4', key: '1', mvp: true },
  { page: 'operations', label: 'Operacje', sub: 'wydatki i wpływy', icon: (s) => <IconList size={s} />, stage: 'E1', key: '2', mvp: true },
  { page: 'import', label: 'Import', sub: 'CSV z mBanku', icon: (s) => <IconImport size={s} />, stage: 'E2', key: '3', mvp: true },
  { page: 'month', label: 'Plan miesiąca', sub: 'pensja i koperty', icon: (s) => <IconCalendar size={s} />, stage: 'E3', key: '4', mvp: true },
  { page: 'cargo', label: 'Ładownia', sub: 'stałe koszty', icon: (s) => <IconBox size={s} />, stage: 'E3', key: '5', mvp: true },
  { page: 'starmap', label: 'Mapa gwiezdna', sub: 'cele', icon: (s) => <IconStar size={s} />, stage: 'E5', key: '6', mvp: false },
  { page: 'radar', label: 'Radar', sub: '90 dni', icon: (s) => <IconRadar size={s} />, stage: 'E6', key: '7', mvp: false },
  { page: 'command', label: 'Dowództwo', sub: 'rozkazy i stopnie', icon: (s) => <IconRank size={s} />, stage: 'E7', key: '8', mvp: false },
  { page: 'intel', label: 'Wywiad', sub: 'analizy ICT', icon: (s) => <IconChart size={s} />, stage: 'E8', key: '9', mvp: false },
  { page: 'reports', label: 'Raporty', sub: 'odprawy i eksport', icon: (s) => <IconReport size={s} />, stage: 'E8', key: '0', mvp: false }
]

export const pageDef = (page: Page): PageDef | undefined => PAGES.find((p) => p.page === page)
