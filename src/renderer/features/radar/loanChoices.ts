/** The loans given an inflow's part may repay (D100, T359) – the editor's and the import's lists. */
import { useMemo } from 'react'
import { loanChoices, type LoanChoice } from '@shared/calc/loans'
import { useFleet } from '../../store/fleet'
import { useRecordList } from '../../store/records'

const NONE: readonly string[] = []

/** The Radar's open loans given, with what is still open – and the ones named already (`keep`, a closed one too). */
export function useLoanChoices(keep: readonly string[] = NONE): LoanChoice[] {
  const loans = useRecordList('loans')
  const states = useFleet()?.loans
  const key = keep.join(',')
  return useMemo(() => loanChoices(loans, states, key ? key.split(',') : NONE), [loans, states, key])
}

/** A loan's name in a list: „Pożyczka dla Jana (zostało 600,00 zł)”; a closed one – said. */
export const loanChoiceLabel = (l: LoanChoice, money: (grosze: number) => string): string => `${l.name} (${l.closed ? 'zamknięta' : `zostało ${money(l.open)} zł`})`
