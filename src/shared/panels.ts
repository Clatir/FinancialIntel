// adapted from ICTTJ src/shared/panels.ts @ 84a8339
/**
 * Layout of panels, kept per computer (localStorage): collapsed, the body's height set by dragging its
 * bottom edge, hidden. A panel is known by its page and title (numbers and parentheses with numbers left out,
 * so "Screeny (3)" stays the same panel when a screen is added, "Krzywa equity (R)" keeps its "(R)").
 */

export interface PanelLayout {
  collapsed?: boolean
  /** Body height in px set by dragging; none = natural height. */
  height?: number
  /** Not shown at all: the other panels take its place. */
  hidden?: boolean
}

export const PANEL_MIN_HEIGHT = 60
export const PANEL_MAX_HEIGHT = 4000
export const PANELS_STORAGE_KEY = 'fi.panels'

/** Stable name of a panel from its title; null when the title is not plain text. */
export function panelName(title: unknown): string | null {
  if (typeof title !== 'string') return null
  const name = title
    .replace(/\([^)]*\d[^)]*\)/g, ' ')
    .replace(/\d[\d.,:\-–]*/g, ' ')
    .replace(/[–—-]\s*$/, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return name ? name.slice(0, 80) : null
}

export const panelKey = (page: string, name: string): string => `${page}:${name}`

export const clampPanelHeight = (h: number): number => Math.round(Math.min(PANEL_MAX_HEIGHT, Math.max(PANEL_MIN_HEIGHT, h)))

/** The stored layouts; anything malformed is dropped. */
export function parsePanelLayouts(raw: string | null): Record<string, PanelLayout> {
  let data: unknown
  try {
    data = JSON.parse(raw ?? 'null')
  } catch {
    return {}
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  const out: Record<string, PanelLayout> = {}
  for (const [key, v] of Object.entries(data as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue
    const layout = panelLayoutOf(v)
    if (layout) out[key] = layout
  }
  return out
}

/** A valid layout from stored data; null when nothing in it is kept. */
function panelLayoutOf(v: unknown): PanelLayout | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const { collapsed, height, hidden } = v as Record<string, unknown>
  const layout: PanelLayout = {}
  if (collapsed === true) layout.collapsed = true
  if (typeof height === 'number' && Number.isFinite(height)) layout.height = clampPanelHeight(height)
  if (hidden === true) layout.hidden = true
  return layout.collapsed || layout.height != null || layout.hidden ? layout : null
}

/** A layout with a change applied; null when nothing is left to keep. */
export function mergePanelLayout(cur: PanelLayout | undefined, patch: PanelLayout): PanelLayout | null {
  const next: PanelLayout = { ...cur, ...patch }
  if (!next.collapsed) delete next.collapsed
  if (!next.hidden) delete next.hidden
  if (next.height == null) delete next.height
  else next.height = clampPanelHeight(next.height)
  return next.collapsed || next.height != null || next.hidden ? next : null
}

/**
 * Columns of a page: the boundary between two columns of a layout grid dragged by the right edge of a panel.
 * Kept as the columns' widths in px at the time of the drag and used as fr weights, so the proportions survive a
 * different window size. Side panes (a list's detail pane…) keep a width in px.
 */
export const COLUMN_MIN = 200
export const COLUMNS_STORAGE_KEY = 'fi.columns'

/** Track widths (px) from the computed `grid-template-columns` of a grid. */
export function parseTrackWidths(computed: string): number[] {
  return computed
    .trim()
    .split(/\s+/)
    .map((t) => parseFloat(t))
    .filter((w) => Number.isFinite(w) && w >= 0)
}

/** Widths after moving the boundary right of column `i` by `dx` px; both columns keep at least `min` (when they had it). */
export function dragColumns(widths: readonly number[], i: number, dx: number, min = COLUMN_MIN): number[] {
  const out = [...widths]
  if (i < 0 || i >= widths.length - 1) return out
  const a = widths[i]!
  const b = widths[i + 1]!
  const lo = -(a - Math.min(min, a))
  const hi = b - Math.min(min, b)
  const d = Math.min(hi, Math.max(lo, dx))
  out[i] = a + d
  out[i + 1] = b - d
  return out
}

/** The template for stored widths: proportional (fr), each column at least `COLUMN_MIN` (or its own smaller width). */
export function columnsTemplate(widths: readonly number[]): string {
  return widths.map((w) => `minmax(${Math.round(Math.min(COLUMN_MIN, w))}px, ${Math.round(w * 10) / 10}fr)`).join(' ')
}

/** Width of a side pane after dragging its inner edge by `dx` px (pane on the right: dragging left widens it). */
export function dragPane(start: number, dx: number, side: 'left' | 'right', min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, start + (side === 'right' ? -dx : dx))))
}

/** The stored columns and pane widths; anything malformed is dropped. */
export function parseColumnLayouts(raw: string | null): Record<string, number[]> {
  let data: unknown
  try {
    data = JSON.parse(raw ?? 'null')
  } catch {
    return {}
  }
  return columnLayoutsOf(data)
}

function columnLayoutsOf(data: unknown): Record<string, number[]> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  const out: Record<string, number[]> = {}
  for (const [key, v] of Object.entries(data as Record<string, unknown>)) {
    if (!Array.isArray(v) || !v.length || v.length > 12) continue
    if (v.every((w) => typeof w === 'number' && Number.isFinite(w) && w > 0 && w < 20000)) out[key] = v as number[]
  }
  return out
}

/**
 * Columns of a grid with hidden panels: a column whose panels are all hidden drops out and the others share
 * its place. Widths dragged with some columns hidden are kept apart (`key|0,2` = only columns 0 and 2 shown), so
 * showing the panel again brings back the widths it had.
 */
export function visibleColumnsKey(key: string, visible: readonly number[], total: number): string {
  return visible.length === total ? key : `${key}|${visible.join(',')}`
}

/** The template of the shown columns: dragged widths of this set of columns, else the default tracks of the shown ones. */
export function visibleTemplate(tracks: readonly string[], visible: readonly number[], stored: readonly number[] | undefined): string {
  if (stored && stored.length === visible.length && visible.length > 0) return columnsTemplate(stored)
  const shown = visible.map((i) => tracks[i]).filter((t): t is string => !!t)
  return shown.length ? shown.join(' ') : 'minmax(0, 1fr)'
}

/**
 * The layout of one page – its panels (collapsed, height, hidden), column widths and side panes – with keys
 * relative to the page: what a layout preset keeps and "default layout" clears. Panel keys are `page:name`, columns
 * `page:id[|shown]`, side panes `pane:page:id`.
 */
export interface PageLayout {
  panels: Record<string, PanelLayout>
  columns: Record<string, number[]>
}

const relativeColumnKey = (page: string, key: string): string | null =>
  key.startsWith(`${page}:`) ? key.slice(page.length + 1) : key.startsWith(`pane:${page}:`) ? `pane:${key.slice(page.length + 6)}` : null
const absoluteColumnKey = (page: string, rel: string): string => (rel.startsWith('pane:') ? `pane:${page}:${rel.slice(5)}` : `${page}:${rel}`)

export function pageLayoutOf(page: string, panels: Record<string, PanelLayout>, columns: Record<string, number[]>): PageLayout {
  const out: PageLayout = { panels: {}, columns: {} }
  for (const [key, v] of Object.entries(panels)) if (key.startsWith(`${page}:`)) out.panels[key.slice(page.length + 1)] = { ...v }
  for (const [key, v] of Object.entries(columns)) {
    const rel = relativeColumnKey(page, key)
    if (rel) out.columns[rel] = [...v]
  }
  return out
}

/** Both stores with the page's layout replaced by `layout` (null = the default layout: nothing stored for the page). */
export function withPageLayout(
  page: string,
  panels: Record<string, PanelLayout>,
  columns: Record<string, number[]>,
  layout: PageLayout | null
): { panels: Record<string, PanelLayout>; columns: Record<string, number[]> } {
  const p = Object.fromEntries(Object.entries(panels).filter(([key]) => !key.startsWith(`${page}:`)))
  const c = Object.fromEntries(Object.entries(columns).filter(([key]) => relativeColumnKey(page, key) == null))
  if (layout) {
    for (const [name, v] of Object.entries(layout.panels)) {
      const l = panelLayoutOf(v)
      if (l) p[`${page}:${name}`] = l
    }
    for (const [rel, v] of Object.entries(columnLayoutsOf(layout.columns))) c[absoluteColumnKey(page, rel)] = v
  }
  return { panels: p, columns: c }
}

/** Names of the hidden panels of a page. */
export function hiddenPanels(page: string, panels: Record<string, PanelLayout>): string[] {
  return Object.entries(panels)
    .filter(([key, v]) => v.hidden && key.startsWith(`${page}:`))
    .map(([key]) => key.slice(page.length + 1))
}

export const isEmptyPageLayout = (l: PageLayout): boolean => !Object.keys(l.panels).length && !Object.keys(l.columns).length

/** The same layout regardless of key order (to mark the preset in use). */
export function samePageLayout(a: PageLayout, b: PageLayout): boolean {
  const canon = (l: PageLayout) =>
    JSON.stringify([
      Object.entries(l.panels)
        .map(([k, v]) => [k, v.collapsed ?? false, v.height ?? null, v.hidden ?? false] as const)
        .sort((x, y) => (x[0] < y[0] ? -1 : 1)),
      Object.entries(l.columns)
        .map(([k, v]) => [k, v.map((w) => Math.round(w * 10) / 10)] as const)
        .sort((x, y) => (x[0] < y[0] ? -1 : 1))
    ])
  return canon(a) === canon(b)
}

/** Names of the pages outside the screens' list (the screens: `PAGES` in renderer/features/screens/pages.tsx). */
export const PAGE_LABELS: Record<string, string> = {
  settings: 'Ustawienia',
  sync: 'Synchronizacja',
  inbox: 'Meldunki',
  wizard: 'Kreator startu'
}
