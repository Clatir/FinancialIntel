/**
 * Operacje: the list's flow as pure functions (UX-14, UX-15) – where the cursor goes when a row leaves the list, what an
 * empty list offers.
 */
import { narrows, type OperationsFilter } from '@shared/operationsView'

/**
 * The row the cursor moves to when the row it stood on (`id`) left the list: the next one still shown, else the nearest
 * before it; null when none is left (or `id` was not on the list). `prev` / `now` = the rows shown, before and after.
 */
export function nextAfterLeave(prev: readonly string[], id: string, now: readonly string[]): string | null {
  const at = prev.indexOf(id)
  if (at < 0) return null
  const shown = new Set(now)
  for (let i = at + 1; i < prev.length; i++) if (shown.has(prev[i]!)) return prev[i]!
  for (let i = at - 1; i >= 0; i--) if (shown.has(prev[i]!)) return prev[i]!
  return null
}

/** The list is a queue of operations without a category (the inbox's view or the category filter „bez kategorii”). */
export const worksUncategorized = (f: OperationsFilter): boolean => f.marks.includes('uncategorized') || f.categories.includes('')

export type EmptyChoice = 'prev' | 'all' | 'clear'

/** The ways out of a list that shows nothing: the month before, the whole history, no filters. */
export function emptyChoices(f: OperationsFilter): EmptyChoice[] {
  const out: EmptyChoice[] = []
  if (f.period.kind === 'month') out.push('prev')
  if (f.period.kind !== 'all') out.push('all')
  if (narrows(f) || f.period.kind === 'range') out.push('clear')
  return out
}
