/**
 * What the import will do, counted from the plan and the user's choices (the „Podgląd” panel and the bar at the bottom
 * of the screen read the same numbers – UX-39). Pure: no store, no screen.
 */
import { uncategorizedOf } from '@shared/calc/inbox'
import { isUncategorized } from '@shared/operationsView'
import type { Transaction } from '@shared/schema'
import { choiceOf, createsRow, joins, movesHere, removesCopy, type ImportChoices, type ImportGroup, type ImportPlan, type RowPlan } from '@shared/import/reconcile'

export interface PreviewCounts {
  /** New operations (new rows, rows kept apart from a typed entry, brought back – without the ones left out). */
  created: number
  /** Joined with a typed entry (not the other side of a transfer). */
  merged: number
  /** The other sides of transfers between the budget's accounts. */
  sides: number
  /** Pending → settled, the status rows and the known rows that only lose the pending mark. */
  settle: number
  settledFlags: number
  removed: number
  moved: number
  copies: number
  known: number
  restored: number
  excluded: number
  /** Nothing changes: the import only remembers the time and the file's period. */
  nothing: boolean
  /** The number on the import button. */
  total: number
}

export function previewCounts(plan: ImportPlan, choices: ImportChoices): PreviewCounts {
  const n = (status: RowPlan['status']) => plan.rows.filter((p) => p.status === status).length
  const merges = plan.rows.filter((p) => p.status === 'merge')
  const joined = merges.filter((p) => joins(p, choices))
  // The other sides of transfers between the budget's accounts (F10): joined to their transfer, not „wpisy ręczne”.
  const sides = joined.filter((p) => p.side).length
  const merged = joined.length - sides
  const deleted = plan.rows.filter((p) => p.status === 'deleted')
  const restored = deleted.filter((p) => choices.restoreDeleted[p.key]).length
  const excluded = plan.rows.filter((p) => (p.status === 'new' || (p.status === 'deleted' && choices.restoreDeleted[p.key])) && choices.skip[p.key]).length
  const created = n('new') + merges.length - merged - sides + restored - excluded
  const removed = plan.vanished.filter((t) => choices.removeVanished[t.id]).length
  const elsewhere = plan.rows.filter((p): p is Extract<RowPlan, { status: 'elsewhere' }> => p.status === 'elsewhere')
  const moved = elsewhere.filter((p) => movesHere(p, choices)).length
  const known = n('known') + elsewhere.length - moved
  const settledFlags = plan.rows.filter((p) => p.status === 'known' && p.settled).length
  // Copies of the rows on another account (AF-9): removed as duplicates – the import changes them.
  const withCopy = plan.rows.filter((p): p is Extract<RowPlan, { status: 'known' }> => p.status === 'known' && !!p.copy)
  const copies = withCopy.filter((p) => removesCopy(p, choices)).length
  const settle = n('settle') + settledFlags
  const nothing = created + merged + sides + n('settle') + removed + settledFlags + moved + copies === 0
  return { created, merged, sides, settle, settledFlags, removed, moved, copies, known, restored, excluded, nothing, total: created + merged + settle + removed + moved + copies }
}

/**
 * „Skategoryzuj pozostałe” after an import (T553, T558): the button opens Operacje from the earliest day of what the
 * import made and left without a category – and the list there holds every expense without a category from that day
 * (no drafts), not only this import's. The number on the button is what that list holds (its label = its scope).
 * `null` – the import left none.
 */
export function categorizeRest(
  created: readonly string[],
  byId: Readonly<Record<string, { record: Transaction } | undefined>>,
  list?: readonly Transaction[],
  drafts: Readonly<Record<string, true | undefined>> = {}
): { from: string; count: number } | null {
  let from: string | null = null
  for (const id of created) {
    if (drafts[id]) continue
    const t = byId[id]?.record
    if (t && isUncategorized(t) && (from === null || t.date < from)) from = t.date
  }
  if (from === null) return null
  const all = list ?? Object.values(byId).flatMap((r) => (r ? [r.record] : []))
  const saved = Object.keys(drafts).length ? all.filter((t) => !drafts[t.id]) : all
  return { from, count: uncategorizedOf(saved, from).count }
}

/**
 * How many of the operations the import makes will be an expense without a category (UX-39) – the ones „bez kategorii” in
 * Operacje afterwards (`isUncategorized`): an expense that is no member's purchase and no container's payment. A row's
 * decision is its own, its group's, its theme's, else the proposal – as `buildImport` takes it.
 */
export function uncategorizedIn(plan: ImportPlan, choices: ImportChoices, groups: readonly ImportGroup[]): number {
  const themeOf = new Map(groups.map((g) => [g.group, g.theme]))
  let n = 0
  for (const p of plan.rows) {
    if (p.status !== 'new' && p.status !== 'merge' && p.status !== 'deleted') continue
    if (!createsRow(p, choices)) continue
    const planned = p.status === 'merge' ? p.planned : p
    const theme = themeOf.get(planned.group)
    const c = choices.rows[p.key] ?? (planned.group ? choices.groups[planned.group] : undefined) ?? (theme ? choices.themes[theme] : undefined) ?? choiceOf(planned.decision)
    if (c.kind === 'expense' && !c.categoryId && !c.refundable && !planned.decision.containerId) n++
  }
  return n
}
