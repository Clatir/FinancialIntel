/**
 * Title-based transaction rules and bulk history updates:
 * Allows setting a specific transaction type (expense, refund, income, transfer...) for transactions
 * matching a title keyword, both for future imports and across the history (past and future dates).
 * The history changes as a bulk change of Operacje (T535, D106 pkt 3): the shared preview with its question at the
 * confirmed balances, one „Cofnij” of what is still as it left it – the rule taken back with it.
 */
import { isGenericWord, keywordMatcher, normalizeKeyword, tokens, words } from '@shared/import/brands'
import { counterpartyKey } from '@shared/import/names'
import { deepEqual } from '@shared/merge'
import type { ImportRule, Transaction } from '@shared/schema'
import { canWrite, useData } from '../../store/data'
import { answerGuard, useGuard } from '../../store/guard'
import { toast, undoKept } from '../../store/ui'
import { keywordRuleRefusal, saveKeywordRule, undoRules, type KeywordRuleInput } from '../import/rules'
import { titleRuled, type TitleTarget } from './bulkModel'
import { openBulkPreview } from './bulkPreview'
import { applyBulk, bulkEffect, bulkPlanOf, updateOperation, type BulkPlan } from './state'

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
 * one – of any date; drafts, those of a newer version and those it does not fit (another direction – T549) stay
 * (`bulkPlanOf`). `done` – those already as the rule leaves them (said when nothing changes – AP-15).
 */
export function titleRulePlan(input: TitleRuleInput, current?: Transaction): { plan: BulkPlan; done: number } {
  const { records, drafts } = useData.getState()
  const all = records.transactions
  const ids = findMatchingByTitle(all, input.keyword, undefined, input.counterparty).map((t) => t.id)
  if (current && all[current.id] && !ids.includes(current.id)) ids.unshift(current.id)
  const plan = bulkPlanOf(ids, { kind: 'titleRule', rule: targetOf(input), ...(current ? { openId: current.id } : {}) })
  const taken = ids.filter((id) => !drafts[id]).length
  return { plan, done: taken - plan.before.length - plan.skipped - plan.newer }
}

/** The history the rule leaves as it is (AP-15): how many are so already, skipped, of a newer version. */
function unchangedText(plan: BulkPlan, done: number): string {
  const parts = [
    done ? `już takie: ${done}` : '',
    plan.skipped ? `pominięte (zmiana do nich nie pasuje): ${plan.skipped}` : '',
    plan.newer ? `zapisane przez nowszą wersję aplikacji: ${plan.newer}` : ''
  ].filter(Boolean)
  return parts.length ? ` Operacje w historii bez zmian – ${parts.join(', ')}.` : ''
}

/** An operation's fields by name – of the editor's edit and of its „Cofnij”. */
type Fields = Record<string, unknown>

/** The open operation's edit by the editor – its id and the edit (`applied` returns the fields it set). */
type EditorEdit = { id: string; applied: () => Partial<Transaction> | void }

/**
 * The open operation's own edit in the editor (`applied`, T550) run, and its „Cofnij”: the fields it set (`applied` returns
 * them) back as they were – while they are still as it left them (T418); changed since, it stays, said. null – nothing to
 * take back (no edit, nothing it changed). Read when it runs: an edit asked first at a confirmed balance (F12) and written
 * after „Zmień mimo to” is taken back too; one still waiting at that question – the question goes (its „Zmień mimo to”
 * would write the rule's edit with the rule taken back). Taken back as an edit in the editor is made (`updateOperation`:
 * the same question at a confirmed balance or the bank's amount). A draft the edit wrote stays written – the window keeps
 * no draft of a file on the disk (a deletion would leave a deleted operation in the folder's history) – said.
 */
function editorEdit(id: string | undefined, applied: EditorEdit['applied'] | undefined): (() => void) | null {
  if (!applied) return null
  const was = id ? (useData.getState().records.transactions[id]?.record as Fields | undefined) : undefined
  const wasDraft = !!id && !!useData.getState().drafts[id]
  const prevAsk = id ? useGuard.getState().asks.find((a) => a.id === id) : undefined
  const waiting = new Set(useGuard.getState().asks.map((a) => a.seq))
  const set = applied() as Fields | undefined
  if (!id || !was || !set) return null
  const fields = Object.keys(set).filter((k) => !deepEqual(was[k], set[k]))
  if (!fields.length) return null
  // The edit's own question (F12), when it asked one; a later typing of the operation replaces it (`askGuard`).
  const question = useGuard.getState().asks.find((a) => a.id === id && !waiting.has(a.seq))?.seq
  return () => {
    if (question != null && useGuard.getState().asks.some((a) => a.seq === question)) {
      if (prevAsk) useGuard.setState((s) => ({ asks: s.asks.map((a) => (a.seq === question ? prevAsk : a)) }))
      else answerGuard(question, false)
      return
    }
    const written = wasDraft && !useData.getState().drafts[id]
    const cur = useData.getState().records.transactions[id]?.record as Fields | undefined
    // Already as before (taken back by hand, or the edit dropped at its question): nothing to do.
    if (cur && fields.every((k) => deepEqual(cur[k], was[k]))) return
    if (!cur || !fields.every((k) => deepEqual(cur[k], set[k]))) return void toast('Otwarta operacja zmieniła się od tego czasu – zostaje, jak jest.', 'info', 6000)
    updateOperation(
      id,
      (r) => {
        const out: Fields = { ...r }
        for (const k of fields) {
          if (was[k] === undefined) delete out[k]
          else out[k] = was[k]
        }
        return out as Transaction
      },
      false,
      () => {
        if (written) toast('Nowy wpis zostaje zapisany, z polami sprzed reguły.', 'info', 6000)
      }
    )
  }
}

/**
 * Save a keyword rule for future transactions; with `updateHistory` the matching ones of the history (past and future
 * dates) – first in the bulk changes' preview (T535): nothing is written until it is confirmed, then the rule and the
 * operations, with one „Cofnij”. `applied` – the open operation's own edit in the editor (its question at a confirmed
 * balance – F12): without the history, or when it is a draft (the bulk change takes no draft); it returns the fields it
 * set – the rule's „Cofnij” takes them back with the rule (T550).
 */
export function applyTitleRule(input: TitleRuleInput, currentTransaction?: Transaction, applied?: () => Partial<Transaction> | void): TitleRuleResult {
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
  const history = input.updateHistory ? titleRulePlan(input, currentTransaction) : null
  if (history?.plan.before.length) {
    const { plan } = history
    openBulkPreview(plan, bulkEffect(plan), what, {
      note: 'Razem ze zmianą zapisze się reguła – kolejne importy rozpoznają ten tytuł same.',
      apply: () => void confirmTitleRule(plan, rule, what, draft && currentTransaction && applied ? { id: currentTransaction.id, applied } : undefined)
    })
    return { ok: true, preview: true, count: plan.before.length }
  }

  const before = rulesNow()
  const err = saveKeywordRule(rule)
  if (err) return { ok: false, error: err }
  const editBack = !input.updateHistory || draft ? editorEdit(currentTransaction?.id, applied) : null
  // The history asked for and nothing of it to change: said how many and why (AP-15) – never a bare „na przyszłość”.
  const unchanged = history ? unchangedText(history.plan, history.done) : ''
  // „Cofnij” of the rule (T535, as „Zapamiętaj”): while it is as this left it – changed since, it stays, said; the open
  // operation's edit with it, only when the rule went back (T550 – never half of it). At least `UNDO_MIN_MS` – the
  // action's own time, no other given.
  const after = rulesNow()
  toast(`Reguła dla tytułu „${keyword}” zapamiętana na przyszłość.${unchanged}`, 'success', undefined, {
    label: 'Cofnij',
    run: () => {
      const { back, kept } = undoRules(before, after)
      undoKept(back, kept, 'reguły')
      if (!kept) editBack?.()
    }
  })
  return { ok: true, count: 0 }
}

/**
 * The preview confirmed (T535): the rule, then the operations – one „Cofnij” takes back both; the open draft's edit in the
 * editor (`edit` – the bulk change takes no draft) with the operations, as one of them (T550).
 */
async function confirmTitleRule(plan: BulkPlan, rule: KeywordRuleInput, what: string, edit?: EditorEdit): Promise<void> {
  const before = rulesNow()
  const err = saveKeywordRule(rule)
  // Refused since the preview opened (the folder read-only, another one opening): said, the history left as it is.
  if (err) return toast(err, 'error', 6000)
  const after = rulesNow()
  let editBack: (() => void) | null = null
  const undoRule = () => {
    const { kept } = undoRules(before, after)
    if (kept) toast(`Reguła dla tytułu ${what} zmieniła się od tego czasu – zostaje, jak jest.`, 'info', 6000)
    else editBack?.()
  }
  const written = await applyBulk(plan, what, { keepTicked: true, note: ' · reguła zapamiętana dla kolejnych importów', undoMore: undoRule })
  // Nothing of the history written: neither is the rule kept – never half of what the preview said.
  if (!written) return void undoRules(before, after)
  editBack = editorEdit(edit?.id, edit?.applied)
}
