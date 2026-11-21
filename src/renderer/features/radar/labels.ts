import type { RadarItem } from '@shared/calc/radar'

/** What a radar item is, in a word (the list and the calendar). */
export const KIND_LABEL: Record<RadarItem['kind'], string> = { salary: 'pensja', asteroid: 'asteroida', fixed: 'opłata', installment: 'rata', repayment: 'spłata', pit38: 'termin', plan: 'boja', end: 'koniec', return: 'zwrot' }

/** The record a radar row opens (UX-74): its container, loan, buoy or the purchase awaiting its return; none for the salary and PIT-38. */
export function radarTarget(i: Pick<RadarItem, 'kind' | 'ref'>): { focus: 'container' | 'loan' | 'buoy' | 'operation'; id: string } | null {
  if (!i.ref) return null
  switch (i.kind) {
    case 'asteroid':
    case 'fixed':
    case 'end':
      return { focus: 'container', id: i.ref }
    case 'installment':
    case 'repayment':
      return { focus: 'loan', id: i.ref }
    case 'plan':
      return { focus: 'buoy', id: i.ref }
    case 'return':
      return { focus: 'operation', id: i.ref }
    default:
      return null
  }
}

/** Where the row leads, in words (its tooltip). */
export const TARGET_TITLE: Record<NonNullable<ReturnType<typeof radarTarget>>['focus'], string> = {
  container: 'Pokaż kontener w Ładowni',
  loan: 'Pokaż pożyczkę',
  buoy: 'Pokaż boję',
  operation: 'Pokaż zakup w Operacjach'
}
