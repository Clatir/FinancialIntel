import type { RadarItem } from '@shared/calc/radar'

/** What a radar item is, in a word (the list and the calendar). */
export const KIND_LABEL: Record<RadarItem['kind'], string> = { salary: 'pensja', asteroid: 'asteroida', fixed: 'opłata', installment: 'rata', repayment: 'spłata', pit38: 'termin', plan: 'boja', end: 'koniec', return: 'zwrot' }
