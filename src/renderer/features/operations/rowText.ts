import { incomeShares, memberName } from '@shared/calc/household'
import { amountOn, isTwoSided, touchesAccount, type CategoryIndex } from '@shared/calc/operations'
import { shareOf } from '@shared/calc/share'
import { TX_KIND_LABEL, type Account, type HouseholdMember, type Transaction } from '@shared/schema'
import { plural } from '../../lib/format'
import { shareNames } from '../household/ShareEditor'

export interface RowText {
  /** The counterparty, the title, else the kind. */
  name: string
  /** The category's whole text (a member's money, a shared purchase, the parts of a receipt). */
  category: string
  /** What the category's place shows: the category, or why an expense has none („domownik”, „ładownia”, „z celu”). */
  shown: string
  /** An expense without a category (its place says why – shown dim on a computer). */
  none: boolean
  /** …and without a member, a container or a goal: „bez kategorii” (in the accent on a phone). */
  uncategorized: boolean
  /** From the account the money left to the one it came to (a transfer in one operation – F10). */
  account: string
  /** The money on the list's account (a transfer's side), else the operation's amount. */
  amount: number
}

export interface RowContext {
  categories: CategoryIndex
  accounts: readonly Account[]
  members: readonly HouseholdMember[]
  /** The one account the list shows (a filter of one account), else null. */
  view: string | null
}

/** What a list's row says of an operation – the computer's list and the phone's cards alike. */
export function operationRowText(t: Transaction, o: RowContext): RowText {
  // A member's money says whose (D80, D81: the parts of a split income – the sender's rest last).
  const whose = t.kind === 'income' ? [...new Set(incomeShares(t).map((x) => x.memberId))].filter((x): x is string => !!x) : []
  // A purchase financed by several people (D83): its category and who.
  const share = t.kind === 'expense' ? shareOf(t) : null
  const category = whose.length
    ? `od: ${whose.map((id) => memberName(id, o.members)).join(', ')}`
    : share
      ? `${o.categories.label(t.categoryId) || 'bez kategorii'} · wspólnie: ${shareNames(share, o.members)}`
      : t.splits.length
        ? `${t.splits.length} ${plural(t.splits.length, 'część', 'części', 'części')}`
        : t.kind === 'expense'
          ? o.categories.label(t.categoryId)
          : TX_KIND_LABEL[t.kind]
  const none = t.kind === 'expense' && !t.categoryId && !t.splits.length
  const shown = none ? (t.refundable ? 'domownik' : t.containerId ? 'ładownia' : t.goalId ? 'z celu' : 'bez kategorii') : category
  const nameOf = (id: string | null) => o.accounts.find((a) => a.id === id)?.name ?? '?'
  const account = isTwoSided(t) ? (t.amount < 0 ? `${nameOf(t.accountId)} → ${nameOf(t.counterAccountId)}` : `${nameOf(t.counterAccountId)} → ${nameOf(t.accountId)}`) : nameOf(t.accountId)
  return {
    name: t.counterparty || t.title || TX_KIND_LABEL[t.kind],
    category,
    shown,
    none,
    uncategorized: none && shown === 'bez kategorii',
    account,
    amount: o.view && touchesAccount(t, o.view) ? amountOn(t, o.view) : t.amount
  }
}
