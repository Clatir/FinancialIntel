/**
 * Operacje: the preview of a bulk change (F11, D105) lives in one small store, so the bar, the right-click menu and the
 * editor's title rule (T535) open the same dialog – one `BulkPreviewHost` on the screen draws it.
 */
import { create } from 'zustand'
import { bulkEffect, bulkPlan, type BulkChange, type BulkEffect, type BulkPlan } from './state'

export interface BulkPreviewData {
  plan: BulkPlan
  effect: BulkEffect | null
  /** The words after the change's name in the title and the toast: „„Czynsz””, „na 02.10.2026”. */
  what: string
  /** A line of the preview about what else the confirmation writes (the title rule: its rule – T535). */
  note?: string
  /** The confirmation's own action (the title rule: its rule, then `applyBulk`); none – `applyBulk(plan, what)`. */
  apply?: () => void
}

export const useBulkPreview = create<{ preview: BulkPreviewData | null }>(() => ({ preview: null }))

export function openBulkPreview(plan: BulkPlan, effect: BulkEffect | null, what: string, more: Pick<BulkPreviewData, 'note' | 'apply'> = {}): void {
  useBulkPreview.setState({ preview: { plan, effect, what, ...more } })
}

export const closeBulkPreview = (): void => useBulkPreview.setState({ preview: null })

/** The preview of a change of the ticked operations the list shows. */
export function previewBulk(visibleIds: readonly string[], change: BulkChange, what: string): void {
  const plan = bulkPlan(visibleIds, change)
  openBulkPreview(plan, bulkEffect(plan), what)
}
