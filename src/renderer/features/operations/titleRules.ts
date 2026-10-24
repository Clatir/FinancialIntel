/**
 * Title-based transaction rules and bulk history updates:
 * Allows setting a specific transaction type (expense, refund, income, transfer...) for transactions
 * matching a title keyword, both for future imports and across the history (past and future dates).
 */
import { normalizeKeyword, keywordMatcher, words } from '@shared/import/brands'
import { counterpartyKey } from '@shared/import/names'
import { sameContentAs } from '@shared/merge'
import { HOUSE_MEMBER_ID, type ImportRule, type Share, type Transaction, type TxKind } from '@shared/schema'
import { newId } from '@shared/ids'
import { countLabel } from '../../lib/format'
import { canWrite, replaceRecords, updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'
import { saveKeywordRule } from '../import/rules'

export interface TitleRuleInput {
  keyword: string
  kind: TxKind
  direction: 'in' | 'out' | null
  categoryId?: string | null
  counterparty?: string | null
  refundable?: boolean
  household?: boolean
  memberId?: string | null
  gift?: boolean
  share?: Share | null
  counterAccountId?: string | null
  inflowKind?: 'repay' | 'income' | 'advance'
  updateHistory?: boolean
}

/** Check if a transaction's title matches the keyword matcher. */
export function matchesTitle(
  t: { title?: string | null; bank?: { description?: string | null } | null },
  matcher: (ws: readonly string[]) => boolean
): boolean {
  if (t.title && matcher(words(t.title))) return true
  if (t.bank?.description && matcher(words(t.bank.description))) return true
  return false
}

/** Find all transactions whose title matches `keyword`, optionally constrained to `counterparty`. */
export function findMatchingByTitle(
  transactions: Record<string, { record: Transaction } | undefined>,
  keyword: string,
  excludeId?: string,
  counterparty?: string | null
): Transaction[] {
  const norm = normalizeKeyword(keyword)
  if (norm.replace(/[^a-z0-9?]/g, '').length < 2) return []
  const matcher = keywordMatcher(norm)
  const cpKey = counterparty?.trim() ? counterpartyKey(counterparty) : null
  const out: Transaction[] = []
  for (const entry of Object.values(transactions)) {
    if (!entry?.record) continue
    const t = entry.record
    if (excludeId && t.id === excludeId) continue
    if (cpKey && counterpartyKey(t.counterparty) !== cpKey) continue
    if (matchesTitle(t, matcher)) out.push(t)
  }
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

/** Apply target transaction type and configuration to a single transaction. */
export function applyTargetToTransaction(before: Transaction, input: TitleRuleInput): Transaction {
  const isRefund = input.kind === 'expense' && input.direction === 'in'
  const amount = input.kind === 'expense'
    ? (isRefund ? Math.abs(before.amount) : -Math.abs(before.amount))
    : input.kind === 'income'
      ? Math.abs(before.amount)
      : before.amount

  const refundable = input.kind === 'expense' && !!input.refundable
  const household = input.kind === 'income' && (input.household ?? !!input.memberId)
  const memberId = refundable || household ? (input.memberId ?? HOUSE_MEMBER_ID) : null

  return {
    ...before,
    kind: input.kind,
    amount,
    categoryId: input.kind === 'expense' ? (input.categoryId ?? null) : null,
    refundable,
    memberId,
    gift: refundable && input.gift ? true : undefined,
    share: input.kind === 'expense' && !refundable && input.share ? input.share : undefined,
    counterAccountId: input.kind === 'transfer' ? (input.counterAccountId ?? null) : null,
    advance: household && input.inflowKind === 'advance',
    inflowKind: household ? input.inflowKind : undefined,
    // Clear splits or covers if transaction kind has changed
    ...(input.kind !== before.kind ? { splits: [], covers: [], coversOpening: undefined, coversOpeningMembers: undefined } : {})
  }
}

/**
 * Save a keyword rule for future transactions and update all matching transactions in history (both past and future).
 */
export function applyTitleRule(
  input: TitleRuleInput,
  currentTransaction?: Transaction
): { ok: boolean; count?: number; error?: string } {
  if (!canWrite()) return { ok: false, error: 'Folder jest tylko do odczytu.' }

  const norm = normalizeKeyword(input.keyword)
  if (norm.replace(/[^a-z0-9?]/g, '').length < 2) {
    return { ok: false, error: 'Słowo kluczowe musi mieć co najmniej 2 litery.' }
  }

  const rulesBefore = useData.getState().fi?.settings.import.rules ?? []

  // 1. Save keyword rule for future imports
  const ruleErr = saveKeywordRule({
    keyword: input.keyword,
    direction: input.direction,
    kind: input.kind,
    categoryId: input.kind === 'expense' ? (input.categoryId ?? null) : null,
    counterparty: input.counterparty ?? null,
    refundable: input.kind === 'expense' && !!input.refundable,
    household: input.kind === 'income' && !!input.household,
    memberId: (input.kind === 'expense' && input.refundable) || (input.kind === 'income' && input.household) ? (input.memberId ?? null) : null,
    gift: input.kind === 'expense' && input.refundable && input.gift ? true : undefined,
    share: input.kind === 'expense' && !input.refundable && input.share ? input.share : undefined,
    counterAccountId: input.kind === 'transfer' ? (input.counterAccountId ?? null) : null,
    inflowKind: input.kind === 'income' && input.household ? input.inflowKind : undefined
  })
  if (ruleErr) return { ok: false, error: ruleErr }

  // 2. Apply to history (past and future dates) if requested
  let updatedCount = 0
  if (input.updateHistory !== false) {
    const allRecords = useData.getState().records.transactions
    const matching = findMatchingByTitle(allRecords, input.keyword, undefined, input.counterparty)
    if (currentTransaction && allRecords[currentTransaction.id]) {
      if (!matching.some((t) => t.id === currentTransaction.id)) matching.unshift(currentTransaction)
    }

    const diff = matching
      .map((before) => ({ before, after: applyTargetToTransaction(before, input) }))
      .filter((d) => !sameContentAs(d.before, d.after))

    if (diff.length > 0) {
      replaceRecords(
        'transactions',
        diff.map((x) => x.after)
      )
      updatedCount = diff.length

      const undo = () => {
        replaceRecords(
          'transactions',
          diff.map((x) => x.before)
        )
        updateSettings((f) => ({
          ...f,
          settings: { ...f.settings, import: { ...f.settings.import, rules: rulesBefore } }
        }))
      }

      toast(
        `Reguła dla tytułu „${input.keyword.trim()}” zapamiętana. Zaktualizowano ${countLabel(diff.length, 'operację', 'operacje', 'operacji')} w historii.`,
        'success',
        8000,
        { label: 'Cofnij', run: undo }
      )
    } else {
      toast(`Reguła dla tytułu „${input.keyword.trim()}” zapamiętana na przyszłość.`, 'success', 5000)
    }
  } else {
    toast(`Reguła dla tytułu „${input.keyword.trim()}” zapamiętana na przyszłość.`, 'success', 5000)
  }

  return { ok: true, count: updatedCount }
}
