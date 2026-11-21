/**
 * Title-based transaction rules and bulk history updates:
 * Allows setting a specific transaction type (expense, refund, income, transfer...) for transactions
 * matching a title keyword, both for future imports and across the history (past and future dates).
 * The history changes as a bulk change of Operacje (T535, D106 pkt 3): the shared preview with its question at the
 * confirmed balances, one „Cofnij” of what is still as it left it – the rule taken back with it.
 */
import { isGenericWord, keywordMatcher, normalizeKeyword, tokens, words } from '@shared/import/brands'
import { counterpartyKey } from '@shared/import/names'
import type { ImportRule, Transaction } from '@shared/schema'
import { canWrite, useData } from '../../store/data'
import { toast } from '../../store/ui'
import { keywordRuleRefusal, saveKeywordRule, undoRules, type KeywordRuleInput } from '../import/rules'
import { titleRuled, type TitleTarget } from './bulkModel'
import { openBulkPreview } from './bulkPreview'
import { applyBulk, bulkEffect, bulkPlanOf, type BulkPlan } from './state'

export interface TitleRuleInput extends TitleTarget {
  keyword: string
  counterparty?: string | null
  /** The matching operations of the history too – through the bulk changes' preview (T535); off unless asked. */
  updateHistory?: boolean
}

export interface TitleRuleResult {
  ok: boolean
  /** The operations the preview shows changed (T535) – none written until it is confirmed. */
  count?: number
  /** The preview opened: the rule and the history are written by its confirmation. */
  preview?: boolean
  /** Shown at the field (UX-2): the keyword, the folder, the rule refused. */
  error?: string
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

/**
 * The keyword the rule starts with (T535, UX-1): the longest word of the title with at least 3 letters – of the words
 * that say what it was, when there is one (a bank's general word – „przelew”, „zakup” – makes a rule refused); as
 * written, lower case. No such word – the whole title.
 */
export function titleKeyword(title: string): string {
  const letters = (w: string) => w.replace(/[^a-z?]/g, '').length
  const fit = tokens(title).filter((t) => letters(t.word) >= 3)
  if (!fit.length) return title
  const own = fit.filter((t) => !isGenericWord(t.word))
  // The first of the longest.
  return (own.length ? own : fit).reduce((best, t) => (t.word.length > best.word.length ? t : best)).text
}

/** Apply target transaction type and configuration to a single transaction (whether it fits – `changedBy`). */
export const applyTargetToTransaction = (before: Transaction, input: TitleRuleInput): Transaction => titleRuled(before, targetOf(input))

/** The rule's decision for the operations (the bulk change's – T535). */
const targetOf = (i: TitleRuleInput): TitleTarget => ({
  kind: i.kind,
  direction: i.direction,
  categoryId: i.categoryId,
  refundable: i.refundable,
  household: i.household,
  memberId: i.memberId,
  gift: i.gift,
  share: i.share,
  counterAccountId: i.counterAccountId,
  inflowKind: i.inflowKind
})

/** The keyword rule for the future imports – as the title rule always saved it. */
const keywordRuleOf = (input: TitleRuleInput): KeywordRuleInput => ({
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

const NO_RULES: readonly ImportRule[] = []
const rulesNow = (): readonly ImportRule[] => useData.getState().fi?.settings.import.rules ?? NO_RULES

/**
 * The bulk change of the history (T535): the operations the keyword fits (and the counterparty, when asked) and the open
 * one – of any date; drafts, those of a newer version and those it does not fit stay (`bulkPlanOf`).
 */
export function titleRulePlan(input: TitleRuleInput, current?: Transaction): BulkPlan {
  const all = useData.getState().records.transactions
  const ids = findMatchingByTitle(all, input.keyword, undefined, input.counterparty).map((t) => t.id)
  if (current && all[current.id] && !ids.includes(current.id)) ids.unshift(current.id)
  return bulkPlanOf(ids, { kind: 'titleRule', rule: targetOf(input) })
}

/**
 * Save a keyword rule for future transactions; with `updateHistory` the matching ones of the history (past and future
 * dates) – first in the bulk changes' preview (T535): nothing is written until it is confirmed, then the rule and the
 * operations, with one „Cofnij”. `applied` – the open operation's own edit in the editor (its question at a confirmed
 * balance – F12): without the history, or when it is a draft (the bulk change takes no draft).
 */
export function applyTitleRule(input: TitleRuleInput, currentTransaction?: Transaction, applied?: () => void): TitleRuleResult {
  if (!canWrite()) return { ok: false, error: 'Folder jest tylko do odczytu.' }

  const norm = normalizeKeyword(input.keyword)
  if (norm.replace(/[^a-z0-9?]/g, '').length < 2) {
    return { ok: false, error: 'Słowo kluczowe musi mieć co najmniej 2 litery.' }
  }
  // Refused before the preview (UX-2): said at the field, never after the history was shown as changing.
  const rule = keywordRuleOf(input)
  const refusal = keywordRuleRefusal(rule)
  if (refusal) return { ok: false, error: refusal }

  const keyword = input.keyword.trim()
  const cp = input.counterparty?.trim()
  const what = `„${cp ? `${cp} · ${keyword}` : keyword}”`
  const draft = !!currentTransaction && !!useData.getState().drafts[currentTransaction.id]
  if (input.updateHistory) {
    const plan = titleRulePlan(input, currentTransaction)
    if (plan.before.length) {
      openBulkPreview(plan, bulkEffect(plan), what, {
        note: 'Razem ze zmianą zapisze się reguła – kolejne importy rozpoznają ten tytuł same.',
        apply: () => void confirmTitleRule(plan, rule, what, draft ? applied : undefined)
      })
      return { ok: true, preview: true, count: plan.before.length }
    }
  }

  const err = saveKeywordRule(rule)
  if (err) return { ok: false, error: err }
  if (!input.updateHistory || draft) applied?.()
  toast(`Reguła dla tytułu „${keyword}” zapamiętana na przyszłość.`, 'success', 5000)
  return { ok: true, count: 0 }
}

/** The preview confirmed (T535): the rule, then the operations – one „Cofnij” takes back both. */
async function confirmTitleRule(plan: BulkPlan, rule: KeywordRuleInput, what: string, applied?: () => void): Promise<void> {
  const before = rulesNow()
  const err = saveKeywordRule(rule)
  // Refused since the preview opened (the folder read-only, another one opening): said, the history left as it is.
  if (err) return toast(err, 'error', 6000)
  const after = rulesNow()
  const undoRule = () => {
    if (undoRules(before, after).kept) toast(`Reguła dla tytułu ${what} zmieniła się od tego czasu – zostaje, jak jest.`, 'info', 6000)
  }
  const written = await applyBulk(plan, what, { keepTicked: true, note: ' · reguła zapamiętana dla kolejnych importów', undoMore: undoRule })
  // Nothing of the history written: neither is the rule kept – never half of what the preview said.
  if (!written) return void undoRules(before, after)
  applied?.()
}
