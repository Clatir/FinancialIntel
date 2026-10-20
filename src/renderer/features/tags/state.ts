/**
 * Tags in the window (1.10.0, F17): the tags of the history (the editor's and the quick entry's suggestions), the
 * expeditions' money and the tag used last – once per list of operations –, a tag's goal of the star map, a tag's
 * operations in Operacje.
 */
import { knownTags, lastTag, tagKey, tagSummaries, type TagSummary } from '@shared/calc/tags'
import { categoryIndex, type CategoryIndex } from '@shared/calc/operations'
import { noNarrowing } from '@shared/operationsView'
import type { Category, Transaction } from '@shared/schema'
import { listOf, updateSettings, useData } from '../../store/data'
import { navigate } from '../../store/ui'
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
