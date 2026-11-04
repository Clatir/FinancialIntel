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

/**
 * The loan a new part repays (D100, T359 – „+ spłata pożyczki”): the first open one the lines do not name yet; none – no
 * such part (przegląd N2 2.11: a second line of one loan, each compared with its whole debt, hid what is beyond it).
 */
export const loanToName = <L extends Pick<LoanChoice, 'id' | 'closed'>>(loans: readonly L[], lines: ReadonlyArray<{ loanId?: string | null }>): L | undefined =>
  loans.find((l) => !l.closed && !lines.some((x) => x.loanId === l.id))

/** A loan's name in a list: „Pożyczka dla Jana (zostało 600,00 zł)”; a closed one – said. */
export const loanChoiceLabel = (l: LoanChoice, money: (grosze: number) => string): string => `${l.name} (${l.closed ? 'zamknięta' : `zostało ${money(l.open)} zł`})`
