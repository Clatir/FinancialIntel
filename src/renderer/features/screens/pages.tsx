import type { ReactNode } from 'react'
import { IconBox, IconCalendar, IconChart, IconHelm, IconImport, IconList, IconRadar, IconRank, IconReport, IconStar } from '../../components/icons'
import type { Page } from '../../store/ui'

export interface PageDef {
  page: Exclude<Page, 'settings' | 'sync' | 'wizard' | 'inbox'>
  label: string
  /** The metaphor's subtitle in the menu (decision D34: the metaphor with the real name). */
  sub: string
  icon: (size: number) => ReactNode
  /** Ctrl + this key opens the screen (Ctrl+1…0 in the menu's order). */
  key: string
}

/** Screens of the side menu in their order (docs/specyfikacja.md, „Ekrany”). */
export const PAGES: readonly PageDef[] = [
  { page: 'bridge', label: 'Mostek', sub: 'stan okrętu', icon: (s) => <IconHelm size={s} />, key: '1' },
  { page: 'operations', label: 'Operacje', sub: 'wydatki i wpływy', icon: (s) => <IconList size={s} />, key: '2' },
  { page: 'import', label: 'Import', sub: 'CSV z mBanku', icon: (s) => <IconImport size={s} />, key: '3' },
  { page: 'month', label: 'Plan miesiąca', sub: 'pensja i koperty', icon: (s) => <IconCalendar size={s} />, key: '4' },
  { page: 'cargo', label: 'Ładownia', sub: 'stałe koszty', icon: (s) => <IconBox size={s} />, key: '5' },
  { page: 'starmap', label: 'Mapa gwiezdna', sub: 'cele', icon: (s) => <IconStar size={s} />, key: '6' },
  { page: 'radar', label: 'Radar', sub: '90 dni', icon: (s) => <IconRadar size={s} />, key: '7' },
  { page: 'command', label: 'Dowództwo', sub: 'rozkazy i stopnie', icon: (s) => <IconRank size={s} />, key: '8' },
  { page: 'intel', label: 'Wywiad', sub: 'analizy ICT', icon: (s) => <IconChart size={s} />, key: '9' },
  { page: 'reports', label: 'Raporty', sub: 'odprawy i eksport', icon: (s) => <IconReport size={s} />, key: '0' }
]

export const pageDef = (page: Page): PageDef | undefined => PAGES.find((p) => p.page === page)
