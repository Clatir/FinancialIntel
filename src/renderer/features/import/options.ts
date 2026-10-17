import type { Choice } from '@shared/import/reconcile'

/** What a theme, a group or a row becomes, as offered by the direction of the money. */
export type Option = 'expense' | 'refundable' | 'refund' | 'income' | 'household' | 'transfer' | 'trading' | 'loan' | 'tax'

export const OPTIONS: Record<'in' | 'out', Array<{ value: Option; label: string }>> = {
  out: [
    { value: 'expense', label: 'Wydatek' },
    { value: 'refundable', label: 'Do zwrotu (zakup dla domu)' },
    { value: 'transfer', label: 'Przelew własny' },
    { value: 'trading', label: 'XTB – dopłata do konta tradingowego' },
    { value: 'loan', label: 'Pożyczka udzielona' },
    { value: 'tax', label: 'Podatek PIT-38' }
  ],
  in: [
    { value: 'income', label: 'Wpływ (przychód)' },
    { value: 'household', label: 'Od domownika (najpierw zwrot należności)' },
    { value: 'refund', label: 'Zwrot towaru (ujemny wydatek)' },
    { value: 'transfer', label: 'Przelew własny' },
    { value: 'trading', label: 'XTB – wypłata z konta tradingowego' },
    { value: 'loan', label: 'Zwrot pożyczki' }
  ]
}

/** The bulk decision for selected groups and rows of both directions (each gets what fits its money). */
export const BULK_OPTIONS: Array<{ value: Option; label: string }> = [
  { value: 'expense', label: 'Wydatek / zwrot towaru – kategoria' },
  { value: 'refundable', label: 'Do zwrotu (zakup dla domu)' },
  { value: 'income', label: 'Wpływ (przychód)' },
  { value: 'household', label: 'Od domownika' },
  { value: 'transfer', label: 'Przelew własny' },
  { value: 'trading', label: 'XTB – konto tradingowe' },
  { value: 'loan', label: 'Pożyczka' },
  { value: 'tax', label: 'Podatek PIT-38' }
]

export function optionOf(c: Choice, direction: 'in' | 'out'): Option {
  if (c.kind === 'expense') return direction === 'in' ? 'refund' : c.refundable ? 'refundable' : 'expense'
  if (c.kind === 'income') return c.household ? 'household' : 'income'
  if (c.kind === 'transfer' || c.kind === 'trading' || c.kind === 'loan' || c.kind === 'tax') return c.kind
  return direction === 'in' ? 'income' : 'expense'
}

/** Can money of this direction be it? („Wydatek” in = a product return.) */
export function fits(option: Option, direction: 'in' | 'out'): boolean {
  if (option === 'expense') return true
  return OPTIONS[direction].some((o) => o.value === option)
}

export function choiceFor(option: Option, prev: Pick<Choice, 'kind' | 'categoryId'>): Choice {
  const base: Choice = { kind: 'expense', categoryId: null, refundable: false, household: false, counterAccountId: null }
  switch (option) {
    case 'expense':
    case 'refund':
      return { ...base, categoryId: prev.kind === 'expense' ? prev.categoryId : null }
    case 'refundable':
      return { ...base, refundable: true, categoryId: prev.kind === 'expense' ? prev.categoryId : null }
    case 'income':
      return { ...base, kind: 'income' }
    case 'household':
      return { ...base, kind: 'income', household: true }
    default:
      return { ...base, kind: option }
  }
}
