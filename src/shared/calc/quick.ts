/** The quick entry's templates (F7): what „Powtórz ostatni” and the template buttons fill. Pure. */
import type { QuickTemplate } from '../api'
import { counterpartyKey } from '../import/names'
import type { Transaction } from '../schema/records'

/** The templates a pair keeps (F7): the latest ones, newest first. */
export const QUICK_TEMPLATES = 5

type Templates = { last: QuickTemplate | null; templates: QuickTemplate[] }
const recentMemo = new WeakMap<readonly Transaction[], Templates>()

/** Typed later (the id breaks a tie). */
const newer = (a: Transaction, b: Transaction) => a.createdAt > b.createdAt || (a.createdAt === b.createdAt && a.id > b.id)

const templateOf = (t: Transaction): QuickTemplate => ({
  kind: t.kind === 'income' ? 'income' : t.refundable ? 'refundable' : 'expense',
  amount: Math.abs(t.amount),
  counterparty: t.counterparty,
  categoryId: t.kind === 'income' ? null : t.categoryId,
  accountId: t.accountId,
  // Whose money it was, as the quick entry writes it (D80, D83): a member's purchase or gift, a member's income.
  memberId: t.refundable || t.kind === 'income' ? t.memberId : null,
  gift: !!t.refundable && !!t.gift,
  advance: t.kind === 'income' && !!t.memberId && t.advance
})

/**
 * The operations typed by hand (F7): the last one („Powtórz ostatni”) and the latest counterparty + category pairs of
 * purchases (the templates), newest first. One line only – a split receipt or a shared purchase is no template. One pass
 * over the list, without sorting the history (150 tys. operacji): the newest of each pair, then the pairs sorted.
 */
export function quickTemplates(transactions: readonly Transaction[]): Templates {
  let found = recentMemo.get(transactions)
  if (found) return found
  let last: Transaction | null = null
  const pairs = new Map<string, Transaction>()
  for (const t of transactions) {
    if (t.bank || t.splits.length || (t.kind !== 'expense' && t.kind !== 'income') || t.amount === 0) continue
    if (!last || newer(t, last)) last = t
    if (t.kind !== 'expense' || t.refundable || !t.categoryId || !t.counterparty.trim()) continue
    const key = `${counterpartyKey(t.counterparty)}|${t.categoryId}`
    const was = pairs.get(key)
    if (!was || newer(t, was)) pairs.set(key, t)
  }
  const templates = [...pairs.values()]
    .sort((a, b) => (newer(a, b) ? -1 : 1))
    .slice(0, QUICK_TEMPLATES)
    .map(templateOf)
  found = { last: last ? templateOf(last) : null, templates }
  recentMemo.set(transactions, found)
  return found
}
