/**
 * Operacje: the preview of a bulk change (F11, D105) lives in one small store, so the bar and the right-click menu open
 * the same dialog – one `BulkPreviewHost` on the screen draws it.
 */
import { create } from 'zustand'
import { bulkEffect, bulkPlan, type BulkChange, type BulkEffect, type BulkPlan } from './state'

export interface BulkPreviewData {
  plan: BulkPlan
  effect: BulkEffect | null
  /** The words after the change's name in the title and the toast: „„Czynsz””, „na 02.10.2026”. */
  what: string
}

export const useBulkPreview = create<{ preview: BulkPreviewData | null }>(() => ({ preview: null }))

export function openBulkPreview(plan: BulkPlan, effect: BulkEffect | null, what: string): void {
  useBulkPreview.setState({ preview: { plan, effect, what } })
}

export const closeBulkPreview = (): void => useBulkPreview.setState({ preview: null })

/** The preview of a change of the ticked operations the list shows. */
export function previewBulk(visibleIds: readonly string[], change: BulkChange, what: string): void {
  const plan = bulkPlan(visibleIds, change)
  openBulkPreview(plan, bulkEffect(plan), what)
}
