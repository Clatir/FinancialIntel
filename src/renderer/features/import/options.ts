import { isOwnName } from '@shared/import/classify'
import { opKindOf, sameChoice, shareWho, type Choice, type ImportGroup } from '@shared/import/reconcile'
import { HOUSE_MEMBER_ID, inflowOf, type Account, type HouseholdMember, type Loan, type Share } from '@shared/schema'

/**
 * What a theme, a group or a row becomes, as offered by the direction of the money: 'expense', 'refund', 'income',
 * 'transfer' (an own account outside the budget), `transfer:<account>` (another account of the budget – one operation
 * for both sides, F10), 'trading', 'loan', 'tax', and the household's per member (D80) – `refundable:<member>` (they
 * finance it; money in – a product return of their purchase, B40), `gift:<member>` (their gift, D83), 'share' (several
 * people, D83), `household:<member>:<MemberMoney>` (their money: it repays their debt, the rest income or their advance –
 * or, chosen so, all of it independent income or an advance for the future – AP-4), `loan:<loan>` (a loan of the Radar
 * – B34: its repayment, its money).
 */
export type Option = string

/**
 * What a member's money is, as the import's list offers it (AP-4): `income` / `advance` – it repays what they owe first,
 * the rest income or their advance (D80 b); `all-income` / `all-advance` – all of it independent income or an advance for
 * the future, the debt skipped (1.15.3, D99 S4).
 */
export type MemberMoney = 'income' | 'advance' | 'all-income' | 'all-advance'
export const MEMBER_MONEY: readonly MemberMoney[] = ['income', 'advance', 'all-income', 'all-advance']

/**
 * One name for each choice everywhere in the import (AP-4, IM sp. 4: the list said „reszta jako zaliczka”, the switch
 * beside it „zaliczka”, and it worked as „całość jako zaliczka” – AF-8): the list, the theme, the preview.
 */
export const MEMBER_MONEY_TEXT: Record<MemberMoney, string> = {
  income: 'spłata, reszta jako przychód',
  advance: 'spłata, reszta jako zaliczka',
  'all-income': 'niezależny przychód (bez spłaty)',
  'all-advance': 'zaliczka na przyszłość (bez spłaty)'
}

/** The choice of a member's money a decision is (`inflowKind` first: 'repay' or none – by `advance`). */
export const memberMoneyOf = (c: Pick<Choice, 'advance' | 'inflowKind'>): MemberMoney =>
  c.inflowKind === 'income' ? 'all-income' : c.inflowKind === 'advance' ? 'all-advance' : c.advance ? 'advance' : 'income'

/**
 * An option a rule's editor leaves out (AP-4): a member's money of „spłata” with the rest other than the person's
 * setting – a rule keeps no rest, the setting says it at each import (D80 b), so the label would not be what it does.
 */
export function restNotOfRule(option: Option, members: ReadonlyArray<Pick<HouseholdMember, 'id' | 'inflow'>>): boolean {
  if (!option.startsWith('household:')) return false
  const [, memberId, how] = option.split(':')
  if (how !== 'income' && how !== 'advance') return false
  return (how === 'advance') !== (inflowOf(members.find((m) => m.id === memberId)) === 'advance')
}

/**
 * The note at a member's money of an explicit kind while they owe (D99 S4: it may skip the debt – said, AP-4); null –
 * nothing to say.
 */
export function skipsDebtText(c: Choice, owed: number, name: string, money: (grosze: number) => string): string | null {
  if (c.kind !== 'income' || !c.household || owed <= 0) return null
  const kind = memberMoneyOf(c)
  if (kind !== 'all-income' && kind !== 'all-advance') return null
  return `${name} ma oddać ${money(owed)} zł – ${kind === 'all-advance' ? 'zaliczka na przyszłość' : 'niezależny przychód'} tego nie spłaci`
}

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
const fromMember = (m: Member) => MEMBER_MONEY.map((k) => ({ value: `household:${m.id}:${k}`, label: `Od domownika: ${m.name} – ${MEMBER_MONEY_TEXT[k]}` }))

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
  // A member's money: „reszta jako zaliczka” and „zaliczka na przyszłość” apart (AP-4 – they were one option).
  if (c.kind === 'income') return c.household ? `household:${memberOfChoice(c)}:${memberMoneyOf(c)}` : 'income'
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

/**
 * Does a bulk decision leave a decision of its own kind (AP-6, AF-26 – one click of „Wydatek / zwrot towaru” turned the
 * loan's repayments into negative costs, and the rule it taught took the next ones)? A loan, PIT-38, XTB and a household
 * member's money are changed in their own group only: the bulk decision takes them only within their kind – the same
 * loan (one without its record – any loan of the Radar), the same member. Anything else it changes as before.
 */
export function bulkKeeps(option: Option, current: Choice): boolean {
  // A part repaying a loan (D100): any other decision would drop it – only the whole repayment of its loan takes it.
  const loans = (current.shares ?? []).filter((x) => x.loanId && x.amount > 0)
  if (current.kind === 'income' && loans.length) return !loans.some((x) => option === `loan:${x.loanId}`)
  if (current.kind === 'tax' || current.kind === 'trading') return option !== current.kind
  if (current.kind === 'loan') return current.loanId ? option !== `loan:${current.loanId}` : !(option === 'loan' || option.startsWith('loan:'))
  if (current.kind === 'income' && current.household) return !option.startsWith(`household:${memberOfChoice(current)}:`)
  return false
}

/**
 * „+ domownik” (D80 a, AF-62): only at a transfer coming in from a person outside the household decided as plain income
 * – never an own transfer (the holder's names), XTB, a loan's repayment or a member's money; a name already a member's
 * – no.
 */
export function offersNewMember(
  g: Pick<ImportGroup, 'direction' | 'rows' | 'names' | 'label'>,
  choice: Choice,
  members: ReadonlyArray<Pick<HouseholdMember, 'bankNames'>>,
  ownNames: readonly string[]
): boolean {
  const name = (g.names[0] ?? g.label).trim()
  if (g.direction !== 'in' || !name || !g.rows.length || opKindOf(g.rows[0]!.row.operation) !== 'transfer') return false
  if (choice.kind !== 'income' || choice.household || isOwnName(name, ownNames)) return false
  // Their money repaying a loan (D100): a loan's repayment – no new member of it.
  if (choice.shares?.some((x) => x.loanId)) return false
  return !members.some((m) => m.bankNames.some((b) => b.trim().toUpperCase() === name.toUpperCase()))
}

/** The lines of „w tym za” as one text – of 0 zł too (`sameChoice` leaves those out); a loan's part by its loan (D100). */
export const linesKey = (xs: Choice['shares']): string => (xs ?? []).map((x) => `${shareWho(x)}=${x.amount}:${x.inflowKind ?? (x.advance ? 'a' : 'i')}`).join(',')

/**
 * A row's decision after its „w tym za” changed (AF-27 – a new line of 0 zł was „the same as the group's”, so the row's
 * decision was dropped at once): `shown` – what the row showed (`own` – its own decision, else its group's with the
 * row's part of the group's spread). A row without its own decision gets one unless nothing changed; its own decision
 * stays while it has lines, even of 0 zł being typed – back to the group's (null) only with no lines where the group
 * has none either.
 */
export function rowSharesChoice(next: Choice, group: Choice, shown: Choice, own: boolean): Choice | null {
  if (!own) return sameChoice(next, shown) && linesKey(next.shares) === linesKey(shown.shares) ? null : next
  return !next.shares?.length && !group.shares?.length && sameChoice(next, group) ? null : next
}

/** What a bulk decision did (`chooseSelected`): why some were left as they were – the money's direction, or AP-6. */
export function bulkResultText(applied: number, unfit: number, kept: number): string {
  if (!unfit) return `Ustawiono dla ${applied}.`
  const held = 'zwrot pożyczki, XTB, PIT-38 i wpłatę domownika zmienisz tylko w ich grupie'
  if (!kept) return `Ustawiono dla ${applied}; ${unfit} nie pasuje do kierunku pieniędzy (wpływ / wydatek) – bez zmian.`
  if (kept === unfit) return `Ustawiono dla ${applied}; ${unfit} nie pasuje (${held}) – bez zmian.`
  return `Ustawiono dla ${applied}; ${unfit} nie pasuje (kierunek pieniędzy; ${held}) – bez zmian.`
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
    const [, memberId, how] = option.split(':')
    // „spłata, reszta jako zaliczka” repays first (AP-4, AF-8: it was saved as an advance for the future – the debt
    // skipped, the rule learned so); only the explicit kinds skip it (D99 S4). `advance` for an older version too: it
    // reads the rest by it.
    const inflowKind = how === 'all-income' ? 'income' : how === 'all-advance' ? 'advance' : 'repay'
    return { ...base, kind: 'income', household: true, memberId: memberId || null, advance: how === 'advance' || how === 'all-advance', inflowKind }
  }
  if (option.startsWith('loan:')) return { ...base, kind: 'loan', loanId: option.slice('loan:'.length) || null }
  if (option.startsWith('transfer:')) return { ...base, kind: 'transfer', counterAccountId: option.slice('transfer:'.length) || null }
  return { ...base, kind: option as Choice['kind'] }
}

/**
 * A decision's list changed (`DecisionFields`): as `choiceFor` – but another of the same member's money (AP-4, T351: what
 * their money is – „cel wpłaty” – is chosen in the list since the switch beside it went) keeps its „w tym za” and loan
 * parts as typed, as the switch did (T336: a change of it on a theme's row of brands – every brand's lines stay). Another
 * kind or member – none of them, as `choiceFor`.
 */
export function listChoice(option: Option, prev: Choice, share?: Share | null): Choice {
  const next = choiceFor(option, prev, share)
  const sameMoney = prev.kind === 'income' && prev.household && next.kind === 'income' && next.household && memberOfChoice(prev) === memberOfChoice(next)
  return sameMoney && prev.shares?.length ? { ...next, shares: prev.shares } : next
}

/**
 * What a theme's row says of its brands' lines (`themeShows` 'brands', T336 – edited at each brand): of other members
 * („w tym za”), of loans (D100 – „w tym spłata pożyczki”) or both.
 */
export function linesInBrands(shares: Choice['shares']): { text: string; title: string } {
  const lines = (shares ?? []).filter((x) => x.amount > 0)
  const loans = lines.some((x) => x.loanId)
  const only = loans && !lines.some((x) => !x.loanId)
  return {
    text: only ? 'w tym spłata pożyczki – ustawiona w markach' : `${loans ? 'w tym za i spłata pożyczki' : 'w tym za'} – ustawione w markach`,
    title: `Każda marka ma ${only ? 'swoją spłatę pożyczki' : loans ? 'swoje „w tym za” i spłatę pożyczki' : 'swoje „w tym za”'} – kwotę i rozkład zmienisz przy marce`
  }
}
