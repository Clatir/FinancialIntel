import type { Choice } from '@shared/import/reconcile'
import { HOUSE_MEMBER_ID, type Account, type HouseholdMember, type Loan, type Share } from '@shared/schema'

/**
 * What a theme, a group or a row becomes, as offered by the direction of the money: 'expense', 'refund', 'income',
 * 'transfer' (an own account outside the budget), `transfer:<account>` (another account of the budget – one operation
 * for both sides, F10), 'trading', 'loan', 'tax', and the household's per member (D80) – `refundable:<member>` (they
 * finance it; money in – a product return of their purchase, B40), `gift:<member>` (their gift, D83), 'share' (several
 * people, D83), `household:<member>:income|advance` (their money; the rest beyond their debt is income or their
 * advance), `loan:<loan>` (a loan of the Radar – B34: its repayment, its money).
 */
export type Option = string

type Member = Pick<HouseholdMember, 'id' | 'name' | 'archived'>
/** An account of the budget a transfer may go to or come from (F10). */
export type AccountPick = Pick<Account, 'id' | 'name' | 'archived'>
/** A loan of the Radar offered for a loan's operation (B34). */
export type LoanPick = Pick<Loan, 'id' | 'name' | 'direction' | 'closedAt'>

const OUT_BEFORE = [{ value: 'expense', label: 'Wydatek' }]
const OUT_AFTER = [
  { value: 'trading', label: 'XTB – dopłata do konta tradingowego' },
  { value: 'loan', label: 'Pożyczka udzielona' },
  { value: 'tax', label: 'Podatek PIT-38' }
]
const IN_BEFORE = [{ value: 'income', label: 'Wpływ (przychód)' }]
const IN_AFTER = [
  { value: 'refund', label: 'Zwrot towaru (ujemny wydatek)' },
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
const gifted = (m: Member) => ({ value: `gift:${m.id}`, label: `Prezent od: ${m.name}` })
const returned = (m: Member) => ({ value: `refundable:${m.id}`, label: `Zwrot towaru – dla: ${m.name}` })
const shared = (direction: 'in' | 'out') => ({ value: 'share', label: direction === 'out' ? 'Wspólnie – kilka osób płaci' : 'Zwrot towaru – wspólnego zakupu' })
const fromMember = (m: Member) => [
  { value: `household:${m.id}:income`, label: `Od domownika: ${m.name} – reszta jako przychód` },
  { value: `household:${m.id}:advance`, label: `Od domownika: ${m.name} – reszta jako zaliczka` }
]

/**
 * The loans of the Radar a loan's operation of this direction may be (B34): a given one – lent more (out) or paid back
 * (in), a taken one – paid back (out) or received (in); the open ones, and the one a decision names.
 */
function loanOptions(direction: 'in' | 'out', loans: readonly LoanPick[], current?: Choice): Array<{ value: Option; label: string }> {
  const keep = current?.kind === 'loan' ? (current.loanId ?? null) : null
  return loans
    .filter((l) => !l.closedAt || l.id === keep)
    .map((l) => ({
      value: `loan:${l.id}`,
      label: `${l.direction === 'given' ? (direction === 'in' ? 'Zwrot pożyczki' : 'Pożyczka udzielona') : direction === 'in' ? 'Pożyczka wzięta' : 'Spłata pożyczki'} – ${l.name} (Radar)`
    }))
}

/**
 * An own transfer (F10): to / from each other account of the budget – the active ones and the one a decision names –,
 * then to / from an own account outside the budget. `own` = the file's account (never its own other side).
 */
export function transferOptions(direction: 'in' | 'out' | 'both', accounts: readonly AccountPick[], own?: string, current?: Choice): Array<{ value: Option; label: string }> {
  const keep = current?.kind === 'transfer' ? current.counterAccountId : null
  const arrow = direction === 'out' ? '→' : direction === 'in' ? '←' : '↔'
  const budget = accounts
    .filter((a) => a.id !== own && (!a.archived || a.id === keep))
    .map((a) => ({ value: `transfer:${a.id}`, label: `Przelew własny ${arrow} ${a.name}` }))
  if (keep && keep !== own && !accounts.some((a) => a.id === keep)) budget.push({ value: `transfer:${keep}`, label: `Przelew własny ${arrow} konto spoza listy` })
  return [...budget, { value: 'transfer', label: budget.length ? 'Przelew własny – konto spoza budżetu' : 'Przelew własny' }]
}

export function optionsFor(
  direction: 'in' | 'out',
  members: readonly Member[],
  current?: Choice,
  loans: readonly LoanPick[] = [],
  accounts: readonly AccountPick[] = [],
  own?: string
): Array<{ value: Option; label: string }> {
  const ms = offered(members, current)
  const share = ms.length ? [shared(direction)] : []
  const radar = loanOptions(direction, loans, current)
  const transfers = transferOptions(direction, accounts, own, current)
  if (direction === 'out') return [...OUT_BEFORE, ...ms.map(financed), ...ms.map(gifted), ...share, ...transfers, ...OUT_AFTER, ...radar]
  const [refund, ...rest] = IN_AFTER
  return [...IN_BEFORE, ...ms.flatMap(fromMember), refund!, ...ms.map(returned), ...share, ...transfers, ...rest, ...radar]
}

/** The bulk decision for selected groups and rows of both directions (each gets what fits its money). */
export function bulkOptions(members: readonly Member[], loans: readonly LoanPick[] = [], accounts: readonly AccountPick[] = [], own?: string): Array<{ value: Option; label: string }> {
  const ms = offered(members)
  return [
    { value: 'expense', label: 'Wydatek / zwrot towaru – kategoria' },
    ...ms.map(financed),
    ...ms.map(gifted),
    ...(ms.length ? [{ value: 'share', label: 'Wspólnie – kilka osób płaci' }] : []),
    { value: 'income', label: 'Wpływ (przychód)' },
    ...ms.flatMap(fromMember),
    ...transferOptions('both', accounts, own),
    { value: 'trading', label: 'XTB – konto tradingowe' },
    { value: 'loan', label: 'Pożyczka' },
    ...loans.filter((l) => !l.closedAt).map((l) => ({ value: `loan:${l.id}`, label: `Pożyczka – ${l.name} (Radar)` })),
    { value: 'tax', label: 'Podatek PIT-38' }
  ]
}

export function optionOf(c: Choice, direction: 'in' | 'out'): Option {
  if (c.kind === 'expense') {
    if (c.refundable) return c.gift && direction === 'out' ? `gift:${memberOfChoice(c)}` : `refundable:${memberOfChoice(c)}`
    if (c.share) return 'share'
    return direction === 'in' ? 'refund' : 'expense'
  }
  if (c.kind === 'income') return c.household ? `household:${memberOfChoice(c)}:${c.advance || c.inflowKind === 'advance' ? 'advance' : 'income'}` : 'income'
  if (c.kind === 'loan') return c.loanId ? `loan:${c.loanId}` : 'loan'
  if (c.kind === 'transfer') return c.counterAccountId ? `transfer:${c.counterAccountId}` : 'transfer'
  if (c.kind === 'trading' || c.kind === 'tax') return c.kind
  return direction === 'in' ? 'income' : 'expense'
}

/** Can money of this direction be it? („Wydatek” in = a product return.) */
export function fits(option: Option, direction: 'in' | 'out'): boolean {
  // A member's purchase and a shared one: money in = its product return (B40, D83).
  if (option === 'expense' || option === 'transfer' || option === 'trading' || option === 'loan' || option === 'share' || option.startsWith('refundable:') || option.startsWith('loan:') || option.startsWith('transfer:'))
    return true
  if (option.startsWith('gift:') || option === 'tax') return direction === 'out'
  return direction === 'in' && (option === 'income' || option === 'refund' || option.startsWith('household:'))
}

/** Does the option need a category (an expense, a purchase a member finances, a product return / reimbursement)? */
export const hasCategory = (option: Option): boolean => option === 'expense' || option === 'refund' || option === 'share' || option.startsWith('refundable:') || option.startsWith('gift:')

/** `share`: the split of 'share' (D83) – the previous one's, else this one (the caller's start: me and the first member). */
export function choiceFor(option: Option, prev: Pick<Choice, 'kind' | 'categoryId'> & { share?: Share | null }, share?: Share | null): Choice {
  const base: Choice = { kind: 'expense', categoryId: null, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
  const category = prev.kind === 'expense' ? prev.categoryId : null
  if (option === 'expense' || option === 'refund') return { ...base, categoryId: category }
  if (option === 'income') return { ...base, kind: 'income' }
  if (option === 'share') return { ...base, categoryId: category, share: prev.share ?? share ?? null }
  if (option.startsWith('refundable:')) return { ...base, refundable: true, memberId: option.slice('refundable:'.length) || null, categoryId: category }
  if (option.startsWith('gift:')) return { ...base, refundable: true, gift: true, memberId: option.slice('gift:'.length) || null, categoryId: category }
  if (option.startsWith('household:')) {
    const [, memberId, rest] = option.split(':')
    const advance = rest === 'advance'
    return { ...base, kind: 'income', household: true, memberId: memberId || null, advance, ...(advance ? { inflowKind: 'advance' } : {}) }
  }
  if (option.startsWith('loan:')) return { ...base, kind: 'loan', loanId: option.slice('loan:'.length) || null }
  if (option.startsWith('transfer:')) return { ...base, kind: 'transfer', counterAccountId: option.slice('transfer:'.length) || null }
  return { ...base, kind: option as Choice['kind'] }
}
