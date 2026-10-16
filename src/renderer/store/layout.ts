// adapted from ICTTJ src/renderer/store/layout.ts @ 84a8339
import { newId } from '@shared/ids'
import { isEmptyPageLayout, pageLayoutOf, withPageLayout, type PageLayout, type PanelLayout } from '@shared/panels'
import type { LayoutPreset } from '@shared/schema'
import { replaceColumns, useColumns } from './columns'
import { updateSettings, useData } from './data'
import { replacePanelLayouts, setPanelLayout, usePanels } from './panels'
import { toast } from './ui'

/**
 * Layout of a page as a whole: presets saved in fi.json (both computers), the default layout (nothing
 * stored for the page) and undo of both. The layout in use stays per computer (localStorage).
 */

export const currentPageLayout = (page: string): PageLayout => pageLayoutOf(page, usePanels.getState(), useColumns.getState())

interface Snapshot {
  panels: Record<string, PanelLayout>
  columns: Record<string, number[]>
}
const snapshot = (): Snapshot => ({ panels: usePanels.getState(), columns: useColumns.getState() })
function restore(s: Snapshot): void {
  replacePanelLayouts(s.panels)
  replaceColumns(s.columns)
}

const UNDO_MS = 7000

/** Use a preset (or, with null, the default layout) on a page; the toast can undo it. */
export function applyPageLayout(page: string, layout: PageLayout | null, message: string): void {
  const prev = snapshot()
  const next = withPageLayout(page, prev.panels, prev.columns, layout)
  restore(next)
  toast(message, 'success', UNDO_MS, { label: 'Cofnij', run: () => restore(prev) })
}

/** The default layout of every page. */
export function resetAllLayouts(): void {
  const prev = snapshot()
  restore({ panels: {}, columns: {} })
  toast('Przywrócono domyślny układ wszystkich stron.', 'success', UNDO_MS, { label: 'Cofnij', run: () => restore(prev) })
}

export function hidePanel(key: string, name: string): void {
  setPanelLayout(key, { hidden: true })
  const paste = /^Screeny/i.test(name) ? ' Wklejanie screenów (Ctrl+V) działa tylko przy widocznym panelu.' : ''
  toast(`Ukryto panel „${name}” – pokażesz go w menu Układ nad stroną.${paste}`, 'info', UNDO_MS, {
    label: 'Cofnij',
    run: () => setPanelLayout(key, { hidden: false })
  })
}

export function showPanel(key: string, shown: boolean): void {
  setPanelLayout(key, { hidden: !shown })
}

export function showAllPanels(page: string): void {
  for (const [key, v] of Object.entries(usePanels.getState())) if (v.hidden && key.startsWith(`${page}:`)) setPanelLayout(key, { hidden: false })
}

const NO_PRESETS: readonly LayoutPreset[] = []
export const useLayoutPresets = () => useData((s) => s.fi?.settings.layoutPresets ?? NO_PRESETS)

function setPresets(fn: (xs: LayoutPreset[]) => LayoutPreset[]): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, layoutPresets: fn(f.settings.layoutPresets) } }))
}

/** Save the page's current layout under a name (an existing name of the page is overwritten). */
export function savePreset(page: string, name: string): boolean {
  const n = name.trim().slice(0, 40)
  if (!n) return false
  const layout = currentPageLayout(page)
  if (isEmptyPageLayout(layout)) {
    toast('Układ tej strony jest domyślny – zmień coś (ukryj, zwiń, przeciągnij), zanim go zapiszesz.', 'info', 5000)
    return false
  }
  const existing = useData.getState().fi?.settings.layoutPresets.find((p) => p.page === page && p.name === n)
  setPresets((xs) =>
    existing ? xs.map((p) => (p.id === existing.id ? { ...p, ...layout } : p)) : [...xs, { id: newId(), name: n, page, ...layout }]
  )
  toast(existing ? `Nadpisano układ „${n}”.` : `Zapisano układ „${n}”.`, 'success')
  return true
}

export function overwritePreset(preset: LayoutPreset): void {
  const layout = currentPageLayout(preset.page)
  setPresets((xs) => xs.map((p) => (p.id === preset.id ? { ...p, ...layout } : p)))
  toast(`Nadpisano układ „${preset.name}” bieżącym.`, 'success')
}

export function renamePreset(preset: LayoutPreset, name: string): boolean {
  const n = name.trim().slice(0, 40)
  if (!n || n === preset.name) return false
  const presets = useData.getState().fi?.settings.layoutPresets ?? []
  if (presets.some((p) => p.page === preset.page && p.name === n && p.id !== preset.id)) {
    toast(`Układ „${n}” już jest na tej stronie.`, 'error')
    return false
  }
  setPresets((xs) => xs.map((p) => (p.id === preset.id ? { ...p, name: n } : p)))
  return true
}

export function deletePreset(preset: LayoutPreset): void {
  setPresets((xs) => xs.filter((p) => p.id !== preset.id))
  toast(`Usunięto układ „${preset.name}”.`, 'info', UNDO_MS, {
    label: 'Cofnij',
    run: () => setPresets((xs) => (xs.some((p) => p.id === preset.id) ? xs : [...xs, preset]))
  })
}
