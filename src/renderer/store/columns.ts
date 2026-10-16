// adapted from ICTTJ src/renderer/store/columns.ts @ 84a8339
import { create } from 'zustand'
import { COLUMNS_STORAGE_KEY, parseColumnLayouts } from '@shared/panels'

function load(): Record<string, number[]> {
  try {
    return parseColumnLayouts(localStorage.getItem(COLUMNS_STORAGE_KEY))
  } catch {
    return {}
  }
}

/** Dragged column widths of page grids and widths of side panes on this computer (see `shared/panels.ts`). */
export const useColumns = create<Record<string, number[]>>(() => load())

function persist(): void {
  try {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(useColumns.getState()))
  } catch {
    // Not kept (storage unavailable): the layout lasts for this session.
  }
}

export function setColumns(key: string, widths: number[] | null, keep = true): void {
  useColumns.setState((s) => {
    const next = { ...s }
    if (widths && widths.length) next[key] = widths.map((w) => Math.round(w * 10) / 10)
    else delete next[key]
    return next
  }, true)
  if (keep) persist()
}

/** All widths at once (a preset, the default layout, undo). */
export function replaceColumns(next: Record<string, number[]>): void {
  useColumns.setState(next, true)
  persist()
}
