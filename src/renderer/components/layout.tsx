// adapted from ICTTJ src/renderer/components/layout.tsx @ 84a8339
import { useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react'
import { create } from 'zustand'
import { dragPane, dragColumns, parseTrackWidths, visibleColumnsKey, visibleTemplate } from '@shared/panels'
import { setColumns, useColumns } from '../store/columns'
import { showAllPanels } from '../store/layout'
import { hiddenSignature, usePanels } from '../store/panels'
import { useUi } from '../store/ui'
import { CompactContext } from './compact'

/**
 * Drag with the pointer captured by the handle: `move` gets the distance from the start, `end` the last one.
 * Returns false for anything but the main button.
 */
export function startDrag(e: ReactPointerEvent<HTMLElement>, move: (dx: number, dy: number) => void, end: (dx: number, dy: number) => void): boolean {
  if (e.button !== 0) return false
  e.preventDefault()
  e.stopPropagation()
  const handle = e.currentTarget
  const x0 = e.clientX
  const y0 = e.clientY
  let last = { dx: 0, dy: 0 }
  handle.setPointerCapture(e.pointerId)
  document.body.classList.add('select-none')
  const onMove = (ev: PointerEvent) => {
    last = { dx: ev.clientX - x0, dy: ev.clientY - y0 }
    move(last.dx, last.dy)
  }
  const onUp = (ev: PointerEvent) => {
    handle.removeEventListener('pointermove', onMove)
    handle.removeEventListener('pointerup', onUp)
    handle.removeEventListener('pointercancel', onUp)
    document.body.classList.remove('select-none')
    // The release point ends the drag: the last moves can be coalesced away on a busy machine (Windows CI ended a corner
    // drag 20 px short), so a pointer up elsewhere is one more move. A cancel keeps the last move.
    if (ev.type === 'pointerup' && (ev.clientX - x0 !== last.dx || ev.clientY - y0 !== last.dy)) onMove(ev)
    end(last.dx, last.dy)
  }
  handle.addEventListener('pointermove', onMove)
  handle.addEventListener('pointerup', onUp)
  handle.addEventListener('pointercancel', onUp)
  return true
}

/** Bumped when a page grid shows a different set of columns: panels look again whether they have a column to their right. */
export const useColumnsEpoch = create<number>(() => 0)

/** Cells of a page grid (the note shown when all panels are hidden is not one). */
const gridCells = (grid: Element): Element[] => [...grid.children].filter((c) => !(c as HTMLElement).dataset?.columnsNote)
const shown = (c: Element) => getComputedStyle(c).display !== 'none'

export interface ColumnLayoutProps {
  ref: RefObject<(HTMLDivElement & HTMLFieldSetElement) | null>
  'data-columns': string
  'data-sep'?: string
  style: CSSProperties
}

/**
 * A page grid of panels in one row: `tracks` = the default width of each column (one per child).
 * A column whose panels are all hidden drops out and the others share its place; the boundary between two shown
 * columns can be dragged by the right edge of a panel in it (widths remembered per page and set of shown columns).
 * `sep` = 1 px lines between the columns. Spread the result on the grid element; with no column shown it is hidden
 * (unless `keepEmpty`, see `Columns`).
 */
export function useColumnLayout(id: string, tracks: readonly string[], opts: { sep?: boolean; style?: CSSProperties } = {}): ColumnLayoutProps {
  return useColumnGrid(id, tracks, opts).props
}

function useColumnGrid(
  id: string,
  tracks: readonly string[],
  opts: { sep?: boolean; style?: CSSProperties; keepEmpty?: boolean }
): { props: ColumnLayoutProps; empty: boolean } {
  const page = useUi((s) => s.route.page)
  const ref = useRef<(HTMLDivElement & HTMLFieldSetElement) | null>(null)
  const total = tracks.length
  const [visible, setVisible] = useState<number[]>(() => tracks.map((_, i) => i))
  // Hiding or showing a panel of the page re-renders the grid, so the shown columns are measured in the same pass.
  usePanels((s) => hiddenSignature(s, page))
  const key = visibleColumnsKey(`${page}:${id}`, visible, total)
  const stored = useColumns((s) => s[key])

  const measureRef = useRef(() => {})
  measureRef.current = () => {
    const grid = ref.current
    if (!grid) return
    const next = gridCells(grid).flatMap((c, i) => (i < total && shown(c) ? [i] : []))
    setVisible((cur) => (cur.length === next.length && cur.every((v, i) => v === next[i]) ? cur : next))
  }
  useLayoutEffect(() => measureRef.current())
  // Panels that hide or appear without this grid rendering (their own state); the grid element may come later.
  const observed = useRef<{ el: Element; mo: MutationObserver } | null>(null)
  useEffect(() => {
    const grid = ref.current
    if (observed.current?.el === grid) return
    observed.current?.mo.disconnect()
    observed.current = null
    if (!grid) return
    const mo = new MutationObserver(() => measureRef.current())
    mo.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] })
    observed.current = { el: grid, mo }
  })
  useEffect(() => () => observed.current?.mo.disconnect(), [])
  const prevKey = useRef(key)
  useLayoutEffect(() => {
    if (prevKey.current === key) return
    prevKey.current = key
    useColumnsEpoch.setState((n) => n + 1, true)
  }, [key])

  const empty = visible.length === 0
  return {
    props: {
      ref,
      'data-columns': key,
      'data-sep': opts.sep ? '' : undefined,
      style: { ...opts.style, gridTemplateColumns: visibleTemplate(tracks, visible, stored), ...(empty && !opts.keepEmpty ? { display: 'none' } : {}) }
    },
    empty
  }
}

/** The grid column holding `el` (a grid with `data-columns`): its key, index, the widths now; null when none or last. */
export function columnOf(el: HTMLElement): { grid: HTMLElement; key: string; index: number; widths: number[] } | null {
  const grid = el.parentElement?.closest<HTMLElement>('[data-columns]')
  if (!grid?.dataset.columns) return null
  const widths = trackWidths(grid)
  if (widths.length < 2) return null
  const cell = [...grid.children].find((c) => c.contains(el))
  if (!cell) return null
  // The column whose right boundary is the cell's right edge (works for spans, rows and gaps); none at the grid's edge.
  const cs = getComputedStyle(grid)
  const gap = parseFloat(cs.columnGap) || 0
  const right = cell.getBoundingClientRect().right
  let x = grid.getBoundingClientRect().left + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.paddingLeft) || 0)
  for (let index = 0; index < widths.length - 1; index++) {
    x += widths[index]!
    if (Math.abs(right - x) < 3) return { grid, key: grid.dataset.columns, index, widths }
    x += gap
  }
  return null
}

/**
 * Column widths of a grid in px: the computed template, or – where it is not resolved (a `fieldset` grid lays out an
 * anonymous box and answers the declared template) – from where its cells start.
 */
function trackWidths(grid: HTMLElement): number[] {
  const cs = getComputedStyle(grid)
  if (!/[(a-z]/i.test(cs.gridTemplateColumns.replace(/px/g, ''))) return parseTrackWidths(cs.gridTemplateColumns)
  const gap = parseFloat(cs.columnGap) || 0
  const box = grid.getBoundingClientRect()
  const right = box.right - (parseFloat(cs.borderRightWidth) || 0) - (parseFloat(cs.paddingRight) || 0)
  const lefts = [...new Set(gridCells(grid).filter(shown).map((c) => Math.round(c.getBoundingClientRect().left)))].sort((x, y) => x - y)
  return lefts.map((l, i) => (i < lefts.length - 1 ? lefts[i + 1]! - l - gap : right - l)).filter((w) => w > 0)
}

/** Drag the boundary right of the column holding `el` (pointer down on its handle). */
export function dragColumnBoundary(e: ReactPointerEvent<HTMLElement>, el: HTMLElement): void {
  const col = columnOf(el)
  if (!col) return
  let last = col.widths
  startDrag(
    e,
    (dx) => {
      last = dragColumns(col.widths, col.index, dx)
      setColumns(col.key, last, false)
    },
    () => setColumns(col.key, last)
  )
}

export const resetColumns = (el: HTMLElement) => {
  const col = columnOf(el)
  if (col) setColumns(col.key, null)
}

/** Width of a side pane (a list's detail pane…), remembered; `edge` = its draggable inner edge. */
export function usePaneWidth(id: string, def: number, min: number, max: number) {
  const page = useUi((s) => s.route.page)
  const key = `pane:${page}:${id}`
  const stored = useColumns((s) => s[key]?.[0])
  const width = Math.min(max, Math.max(min, stored ?? def))
  return { width, key, min, max }
}

/**
 * The inner edge of a side pane: drag to resize it, double click = default size. `side` = where the pane is. Put it
 * next to the pane in the same flex row (before a pane on the right, after one on the left) or column (before a pane
 * at the bottom – its height is the stored value): a zero-size positioned box holds the handle, so the pane itself
 * stays unpositioned and paints in the normal order.
 */
export function PaneEdge({ pane, side, testId = 'pane-edge' }: { pane: { width: number; key: string; min: number; max: number }; side: 'left' | 'right' | 'top' | 'bottom'; testId?: string }) {
  const vertical = side === 'top' || side === 'bottom'
  // A pane on the right or at the bottom grows when its edge moves towards the start (left / up).
  const grow: 'left' | 'right' = side === 'right' || side === 'bottom' ? 'right' : 'left'
  const resize = (delta: number) => dragPane(pane.width, delta, grow, pane.min, pane.max)
  const what = vertical ? 'wysokość' : 'szerokość'
  return (
    <div className={vertical ? 'relative z-20 h-0 w-full shrink-0' : 'relative z-20 w-0 shrink-0 self-stretch'}>
      <div
        role="separator"
        aria-orientation={vertical ? 'horizontal' : 'vertical'}
        aria-label={`${what[0]!.toUpperCase()}${what.slice(1)} panelu (przeciągnij; dwuklik – domyślna)`}
        title={`Przeciągnij, by zmienić ${what}; dwuklik – domyślna`}
        tabIndex={0}
        className={`absolute outline-none transition-colors duration-100 hover:bg-accent/50 focus-visible:bg-accent/50 ${vertical ? 'inset-x-0 -top-[3px] h-[6px] cursor-ns-resize' : 'inset-y-0 -left-[3px] w-[6px] cursor-ew-resize'}`}
        onPointerDown={(e) => {
          let last = pane.width
          startDrag(
            e,
            (dx, dy) => {
              last = resize(vertical ? dy : dx)
              setColumns(pane.key, [last], false)
            },
            () => setColumns(pane.key, [last])
          )
        }}
        onDoubleClick={() => setColumns(pane.key, null)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 80 : 20
          if (e.key === (vertical ? 'ArrowDown' : 'ArrowRight')) setColumns(pane.key, [resize(step)])
          else if (e.key === (vertical ? 'ArrowUp' : 'ArrowLeft')) setColumns(pane.key, [resize(-step)])
          else return
          e.preventDefault()
        }}
        data-testid={testId}
      />
    </div>
  )
}

/**
 * A page grid of columns (`useColumnLayout`); `fieldset` keeps the read-only `disabled`. With every panel hidden it
 * says so and offers to show them again.
 */
export function Columns({
  id,
  tracks,
  as = 'div',
  className,
  style,
  sep = true,
  emptyNote = true,
  disabled,
  children,
  testId
}: {
  id: string
  tracks: readonly string[]
  as?: 'div' | 'fieldset'
  className?: string
  style?: CSSProperties
  sep?: boolean
  /** With every panel hidden: a note (a page's main grid) or nothing at all (a row among others). */
  emptyNote?: boolean
  disabled?: boolean
  children: ReactNode
  testId?: string
}) {
  const page = useUi((s) => s.route.page)
  const { props: layout, empty } = useColumnGrid(id, tracks, { sep, style, keepEmpty: emptyNote })
  // The phone: the columns one under another, full width.
  if (useContext(CompactContext)) {
    const Tag = as
    return (
      <Tag disabled={as === 'fieldset' ? disabled : undefined} className="flex min-w-0 flex-col" data-testid={testId}>
        {children}
      </Tag>
    )
  }
  const note = empty && emptyNote && (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-[12px] text-muted" data-columns-note="1" data-testid="all-panels-hidden">
      Wszystkie panele tej strony są ukryte.
      <button type="button" className="btn" onClick={() => showAllPanels(page)}>
        Pokaż wszystkie
      </button>
    </div>
  )
  return as === 'fieldset' ? (
    <fieldset disabled={disabled} className={className} {...layout} data-testid={testId}>
      {children}
      {note}
    </fieldset>
  ) : (
    <div className={className} {...layout} data-testid={testId}>
      {children}
      {note}
    </div>
  )
}
