import type { Choice } from '@shared/import/reconcile'
import { HOUSE_MEMBER_ID, type HouseholdMember } from '@shared/schema'

/**
 * What a theme, a group or a row becomes, as offered by the direction of the money: 'expense', 'refund', 'income',
 * 'transfer', 'trading', 'loan', 'tax', and the household's per member (D80) – `refundable:<member>` (they finance it),
 * `household:<member>:income|advance` (their money; the rest beyond their debt is income or their advance).
 */
export type Option = string

type Member = Pick<HouseholdMember, 'id' | 'name' | 'archived'>

const OUT_BEFORE = [{ value: 'expense', label: 'Wydatek' }]
const OUT_AFTER = [
  { value: 'transfer', label: 'Przelew własny' },
  { value: 'trading', label: 'XTB – dopłata do konta tradingowego' },
  { value: 'loan', label: 'Pożyczka udzielona' },
  { value: 'tax', label: 'Podatek PIT-38' }
]
const IN_BEFORE = [{ value: 'income', label: 'Wpływ (przychód)' }]
const IN_AFTER = [
  { value: 'refund', label: 'Zwrot towaru (ujemny wydatek)' },
  { value: 'transfer', label: 'Przelew własny' },
  { value: 'trading', label: 'XTB – wypłata z konta tradingowego' },
  { value: 'loan', label: 'Zwrot pożyczki' }
]

/** The member of a choice that has one (the first member when none is named). */
export const memberOfChoice = (c: Choice): string | null => (c.refundable || c.household ? (c.memberId ?? HOUSE_MEMBER_ID) : null)

/** The members offered: the active ones, and the one a decision names (archived or unknown) – it stays as it was. */
function offered(members: readonly Member[], current?: Choice): Member[] {
  const keep = current ? memberOfChoice(current) : null
  const out = members.filter((m) => !m.archived || m.id === keep)
  if (keep && !out.some((m) => m.id === keep)) out.push({ id: keep, name: keep === HOUSE_MEMBER_ID ? 'Dom' : 'domownik spoza listy', archived: true })
  return out
}

const financed = (m: Member) => ({ value: `refundable:${m.id}`, label: `Finansuje: ${m.name}` })
const fromMember = (m: Member) => [
  { value: `household:${m.id}:income`, label: `Od domownika: ${m.name} – reszta jako przychód` },
  { value: `household:${m.id}:advance`, label: `Od domownika: ${m.name} – reszta jako zaliczka` }
]

export function optionsFor(direction: 'in' | 'out', members: readonly Member[], current?: Choice): Array<{ value: Option; label: string }> {
  const ms = offered(members, current)
  return direction === 'out' ? [...OUT_BEFORE, ...ms.map(financed), ...OUT_AFTER] : [...IN_BEFORE, ...ms.flatMap(fromMember), ...IN_AFTER]
}

/** The bulk decision for selected groups and rows of both directions (each gets what fits its money). */
export function bulkOptions(members: readonly Member[]): Array<{ value: Option; label: string }> {
  const ms = offered(members)
  return [
    { value: 'expense', label: 'Wydatek / zwrot towaru – kategoria' },
    ...ms.map(financed),
    { value: 'income', label: 'Wpływ (przychód)' },
    ...ms.flatMap(fromMember),
    { value: 'transfer', label: 'Przelew własny' },
    { value: 'trading', label: 'XTB – konto tradingowe' },
    { value: 'loan', label: 'Pożyczka' },
    { value: 'tax', label: 'Podatek PIT-38' }
  ]
}

export function optionOf(c: Choice, direction: 'in' | 'out'): Option {
  if (c.kind === 'expense') return direction === 'in' ? 'refund' : c.refundable ? `refundable:${memberOfChoice(c)}` : 'expense'
  if (c.kind === 'income') return c.household ? `household:${memberOfChoice(c)}:${c.advance ? 'advance' : 'income'}` : 'income'
  if (c.kind === 'transfer' || c.kind === 'trading' || c.kind === 'loan' || c.kind === 'tax') return c.kind
  return direction === 'in' ? 'income' : 'expense'
}

/** Can money of this direction be it? („Wydatek” in = a product return.) */
export function fits(option: Option, direction: 'in' | 'out'): boolean {
  if (option === 'expense' || option === 'transfer' || option === 'trading' || option === 'loan') return true
  if (option.startsWith('refundable:') || option === 'tax') return direction === 'out'
  return direction === 'in' && (option === 'income' || option === 'refund' || option.startsWith('household:'))
}

/** Does the option need a category (an expense, a purchase a member finances)? */
export const hasCategory = (option: Option): boolean => option === 'expense' || option.startsWith('refundable:')

export function choiceFor(option: Option, prev: Pick<Choice, 'kind' | 'categoryId'>): Choice {
  const base: Choice = { kind: 'expense', categoryId: null, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
  const category = prev.kind === 'expense' ? prev.categoryId : null
  if (option === 'expense' || option === 'refund') return { ...base, categoryId: category }
  if (option === 'income') return { ...base, kind: 'income' }
  if (option.startsWith('refundable:')) return { ...base, refundable: true, memberId: option.slice('refundable:'.length) || null, categoryId: category }
  if (option.startsWith('household:')) {
    const [, memberId, rest] = option.split(':')
    return { ...base, kind: 'income', household: true, memberId: memberId || null, advance: rest === 'advance' }
  }
  return { ...base, kind: option as Choice['kind'] }
}
