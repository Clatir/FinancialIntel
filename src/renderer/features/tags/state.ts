/**
 * Tags in the window (1.10.0, F17): the tags of the history (the editor's and the quick entry's suggestions), the
 * expeditions' money and the tag used last – once per list of operations –, a tag's goal of the star map, a tag's
 * operations in Operacje.
 */
import { knownTags, lastTag, tagKey, tagLabel, tagsOf, tagSummaries, type TagSummary } from '@shared/calc/tags'
import { categoryIndex, type CategoryIndex } from '@shared/calc/operations'
import { noNarrowing } from '@shared/operationsView'
import { plural } from '@shared/format'
import type { Category, Transaction } from '@shared/schema'
import { canWrite, listOf, replaceRecords, updateSettings, useData } from '../../store/data'
import { navigate, toast } from '../../store/ui'
import { showFilter } from '../operations/state'

const knownMemo = new WeakMap<readonly Transaction[], string[]>()

/** The tags written in the history, each once (one count per list of operations). */
export function knownTagsOf(list: readonly Transaction[]): string[] {
  let tags = knownMemo.get(list)
  if (!tags) knownMemo.set(list, (tags = knownTags(list)))
  return tags
}

const lastMemo = new WeakMap<readonly Transaction[], { today: string; tag: string | null }>()

/** The tag used last (the quick entry's „+ #tag”): once per list of operations and day – the quick window asks often. */
export function lastTagOf(list: readonly Transaction[], today: string): string | null {
  let memo = lastMemo.get(list)
  if (!memo || memo.today !== today) lastMemo.set(list, (memo = { today, tag: lastTag(list, today) }))
  return memo.tag
}

/** The tags of the history (the fields' suggestions). */
export function useKnownTags(): string[] {
  const map = useData((s) => s.records.transactions)
  return knownTagsOf(listOf(map))
}

const summaryMemo = new WeakMap<readonly Transaction[], { categories: readonly Category[]; cats: CategoryIndex; summaries: TagSummary[] }>()

/** Every tag's money (Wywiad → „Wyprawy”): once per list of operations and categories. */
export function useTagSummaries(): { summaries: TagSummary[]; cats: CategoryIndex } | null {
  const map = useData((s) => s.records.transactions)
  const categories = useData((s) => s.fi?.settings.categories)
  if (!categories) return null
  const list = listOf(map)
  let memo = summaryMemo.get(list)
  if (!memo || memo.categories !== categories) {
    const cats = categoryIndex(categories)
    summaryMemo.set(list, (memo = { categories, cats, summaries: tagSummaries(list, cats) }))
  }
  return memo
}

/** A tag's goal of the star map (F17 – „Ekspedycja: wydano … z … celu”); null – none. */
export function setTagGoal(tag: string, goalId: string | null): void {
  const key = tagKey(tag)
  if (!key) return
  updateSettings((f) => {
    const tagGoals = { ...f.settings.intel.tagGoals }
    if (goalId) tagGoals[key] = goalId
    else delete tagGoals[key]
    return { ...f, settings: { ...f.settings, intel: { ...f.settings.intel, tagGoals } } }
  })
}

/** Every operation of a tag, the whole history (a view: the stored filter stays – B88). */
export function showTag(tag: string): void {
  showFilter({ period: { kind: 'all' }, ...noNarrowing(), tags: [tagKey(tag)] })
  navigate({ page: 'operations' })
}

/** Whole-operation expenses carrying `tag` that have neither a goal nor a container yet (N-PC-5). */
export function unlinkedTagExpenses(tag: string, transactions: readonly Transaction[]): Transaction[] {
  const key = tagKey(tag)
  if (!key) return []
  return transactions.filter((t) => t.kind === 'expense' && !t.goalId && !t.containerId && tagsOf(t).some((x) => tagKey(x) === key))
}

/**
 * Assigns `goalId` to the unlinked expense operations carrying `tag` (N-PC-5) so their cost comes out of the goal's
 * money instead of the month's energy and envelopes; „Cofnij” restores their previous state.
 */
export function linkTagOperationsToGoal(tag: string, goalId: string, goalName: string): number {
  if (!canWrite()) return 0
  const targets = unlinkedTagExpenses(tag, listOf(useData.getState().records.transactions))
  if (!targets.length) return 0
  const ids = targets.map((t) => t.id)
  replaceRecords(
    'transactions',
    targets.map((t) => ({ ...t, goalId }))
  )
  toast(`Rozliczono z celu „${goalName}”: ${targets.length} ${plural(targets.length, 'operacja', 'operacje', 'operacji')} wyprawy #${tagLabel(tag)}.`, 'success', 8000, {
    label: 'Cofnij',
    run: () => {
      const map = useData.getState().records.transactions
      const back = ids.map((id) => map[id]?.record).filter((r): r is Transaction => !!r && r.goalId === goalId)
      if (back.length) replaceRecords('transactions', back.map((r) => ({ ...r, goalId: null })))
    }
  })
  return targets.length
}
