// adapted from ICTTJ src/renderer/store/panels.ts @ 84a8339
import { create } from 'zustand'
import { PANELS_STORAGE_KEY, mergePanelLayout, parsePanelLayouts, type PanelLayout } from '@shared/panels'

function load(): Record<string, PanelLayout> {
  try {
    return parsePanelLayouts(localStorage.getItem(PANELS_STORAGE_KEY))
  } catch {
    return {}
  }
}

/** Collapsed, hidden panels and dragged heights on this computer (see `shared/panels.ts`). */
export const usePanels = create<Record<string, PanelLayout>>(() => load())

function persist(): void {
  try {
    localStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify(usePanels.getState()))
  } catch {
    // Not kept (storage unavailable): the layout lasts for this session.
  }
}

export function setPanelLayout(key: string, patch: PanelLayout, keep = true): void {
  usePanels.setState((s) => {
    const next = { ...s }
    const layout = mergePanelLayout(s[key], patch)
    if (layout) next[key] = layout
    else delete next[key]
    return next
  }, true)
  if (keep) persist()
}

/** All panel layouts at once (a preset, the default layout, undo). */
export function replacePanelLayouts(next: Record<string, PanelLayout>): void {
  usePanels.setState(next, true)
  persist()
}

/** Keys of the hidden panels of a page as one string: a selector that changes only when they do. */
export const hiddenSignature = (s: Record<string, PanelLayout>, page: string): string =>
  Object.keys(s)
    .filter((k) => s[k]!.hidden && k.startsWith(`${page}:`))
    .join('\n')
