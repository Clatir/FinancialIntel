// adapted from ICTTJ src/renderer/components/Panel.tsx @ 84a8339
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties, type ReactNode
} from 'react'
import { clampPanelHeight, dragColumns, mergePanelLayout, panelKey, panelName, type PanelLayout } from '@shared/panels'
import { setColumns } from '../store/columns'
import { columnOf, dragColumnBoundary, resetColumns, startDrag, useColumnsEpoch } from './layout'
import { useDetachedPanel, type DetachSpec } from '../store/detach'
import { hidePanel } from '../store/layout'
import { hiddenSignature, setPanelLayout, usePanels } from '../store/panels'
import { useUi } from '../store/ui'
import { IconChevronDown, IconChevronRight, IconDetach, IconEyeOff, IconMaximize, IconRestore } from './icons'

const join = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

/** True inside a detached window: panels fill it and have no layout controls. */
export const DetachedContext = createContext(false)
/** The phone (T307): panels keep their title and collapse – no window of their own, no maximize, no edges to drag. */
export const CompactContext = createContext(false)
/** The panel's body has a set size (dragged, maximized, detached): charts fill it instead of their default height. */
const FillContext = createContext(false)
export function usePanelFill(): boolean {
  return useContext(FillContext) || useContext(DetachedContext)
}

/**
 * A panel with a header: collapse (▾, double click on the title), maximize to the whole window (Esc back),
 * drag the bottom edge to set the height (double click: natural height again), and in a page grid with
 * `data-columns` the right edge moves the boundary to the next column, the corner both; hide it – an empty
 * `hidden` placeholder stays, the grid gives its place to the others, the Układ menu (the bar over the page) shows it again.
 * Collapsed, hidden, height and columns are remembered on this computer per page. With `detach` (charts drawn by the
 * app) it can also open in its own window.
 */
export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
  id,
  name,
  detach,
  testId,
  style,
  hint
}: {
  title?: ReactNode
  /** The metaphor's meaning (F29, the glossary): a „?” beside the title, the text on hover. */
  hint?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  id?: string
  /** Stable name for the remembered layout (default: from a text title). */
  name?: string
  detach?: DetachSpec
  testId?: string
  /** Outer size set by the page (a side pane with a dragged width). */
  style?: CSSProperties
}) {
  const detachedMode = useContext(DetachedContext)
  const compact = useContext(CompactContext)
  const page = useUi((s) => s.route.page)
  const n = name ?? panelName(title)
  const key = n ? panelKey(page, n) : null
  const stored = usePanels((s) => (key ? s[key] : undefined))
  const [local, setLocal] = useState<PanelLayout | undefined>(undefined)
  const layout = key ? stored : local
  const [maximized, setMaximized] = useState(false)
  const controls = !detachedMode && (title != null || actions != null)
  const det = useDetachedPanel(controls && detach && !compact ? key : null, detach, typeof title === 'string' ? title : (n ?? 'Wykres'))
  const hidden = controls && !!key && !!layout?.hidden
  const collapsed = controls && !maximized && !!layout?.collapsed
  const height = controls && !maximized && !collapsed ? (layout?.height ?? null) : null
  const fill = detachedMode || maximized || height != null
  const bodyRef = useRef<HTMLDivElement>(null)

  const update = (patch: PanelLayout, persist = true) => {
    if (key) setPanelLayout(key, patch, persist)
    else setLocal((cur) => mergePanelLayout(cur, patch) ?? undefined)
  }

  useEffect(() => {
    if (hidden) setMaximized(false)
  }, [hidden])

  useEffect(() => {
    if (!maximized) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      // An open dialog or popover closes first.
      if (document.querySelector('[role="dialog"], [aria-expanded="true"]')) return
      // Before the page's own Esc (the editor goes back to the list): this one only restores the panel.
      e.preventDefault()
      e.stopImmediatePropagation()
      setMaximized(false)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [maximized])

  // The right edge moves the boundary to the next column of the page grid (when there is one).
  const sectionRef = useRef<HTMLElement>(null)
  const [widthEdge, setWidthEdge] = useState(false)
  // Again when panels of the page are hidden or shown and when a grid drops or brings back a column.
  const hiddenOnPage = usePanels((s) => hiddenSignature(s, page))
  const columnsEpoch = useColumnsEpoch()
  useLayoutEffect(() => {
    setWidthEdge(!!sectionRef.current && !maximized && !detachedMode && !compact && !!columnOf(sectionRef.current))
  }, [maximized, detachedMode, compact, collapsed, hidden, hiddenOnPage, columnsEpoch])

  const startResize = (e: ReactPointerEvent<HTMLDivElement>, axes: 'y' | 'xy') => {
    const start = bodyRef.current?.getBoundingClientRect().height ?? 120
    const col = axes === 'xy' && sectionRef.current ? columnOf(sectionRef.current) : null
    let height = start
    let widths = col?.widths ?? null
    startDrag(
      e,
      (dx, dy) => {
        height = clampPanelHeight(start + dy)
        update({ height }, false)
        if (col) {
          widths = dragColumns(col.widths, col.index, dx)
          setColumns(col.key, widths, false)
        }
      },
      () => {
        update({ height })
        if (col && widths) setColumns(col.key, widths)
      }
    )
  }
  const resizeKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 100 : 20
    const cur = height ?? bodyRef.current?.getBoundingClientRect().height ?? 120
    if (e.key === 'ArrowDown') update({ height: cur + step })
    else if (e.key === 'ArrowUp') update({ height: cur - step })
    else if (e.key === 'Home' || e.key === 'Escape') update({ height: undefined })
    else return
    e.preventDefault()
  }

  // Hidden: an empty placeholder keeps the panel's place in the page (the Układ menu lists it, grids skip it).
  if (hidden) return <section hidden data-panel={key ?? undefined} data-hidden="1" />

  const body = det.detached ? (
    <div className="flex flex-col items-start gap-2 text-[12px] text-muted" data-testid="panel-detached-note">
      <span>Otwarte w osobnym oknie.</span>
      <span className="flex gap-2">
        <button className="btn" onClick={det.focus}>
          Pokaż okno
        </button>
        <button className="btn" onClick={det.close} data-testid="panel-attach">
          Przywróć tutaj
        </button>
      </span>
    </div>
  ) : (
    children
  )

  return (
    <section
      ref={sectionRef}
      id={id}
      className={join(
        'relative flex min-w-0 flex-col border border-line bg-panel',
        className,
        // A set height must also shrink a panel standing next to a taller one in the same grid row.
        height != null && 'h-fit',
        maximized && 'fixed! inset-0 z-40 m-0! border! border-line-strong',
        detachedMode && 'min-h-0 flex-1 border-0'
      )}
      data-panel={key ?? undefined}
      data-collapsed={collapsed ? '1' : undefined}
      data-maximized={maximized ? '1' : undefined}
      data-testid={testId}
      style={style}
    >
      {(title || actions) && (
        <header className="flex h-[28px] shrink-0 items-center gap-2 border-b border-line px-2.5">
          <h2
            className="label flex-1 truncate font-medium"
            onDoubleClick={controls && !maximized ? () => update({ collapsed: !collapsed }) : undefined}
            title={controls && !maximized ? 'Dwuklik – zwiń / rozwiń' : undefined}
          >
            {title}
          </h2>
          {/* Beside the title, not in it: the heading stays the panel's name (layouts, the „Układ” menu, tests). */}
          {hint && (
            <span className="cursor-help text-[11px] text-dim" title={hint} data-testid="panel-hint">
              ?
            </span>
          )}
          {!collapsed && actions}
          {controls && (
            <span className="-mr-1 flex shrink-0 items-center">
              {det.available && !det.detached && !compact && (
                <PanelButton title="Otwórz w osobnym oknie (pełny ekran)" onClick={det.open} testId="panel-detach">
                  <IconDetach size={13} />
                </PanelButton>
              )}
              {!collapsed && !compact && (
                <PanelButton title={maximized ? 'Przywróć rozmiar (Esc)' : 'Powiększ na całe okno'} onClick={() => setMaximized(!maximized)} testId="panel-maximize">
                  {maximized ? <IconRestore size={13} /> : <IconMaximize size={13} />}
                </PanelButton>
              )}
              {!maximized && (
                <PanelButton title={collapsed ? 'Rozwiń panel' : 'Zwiń panel'} onClick={() => update({ collapsed: !collapsed })} testId="panel-collapse">
                  {collapsed ? <IconChevronRight size={13} /> : <IconChevronDown size={13} />}
                </PanelButton>
              )}
              {!maximized && key && n && !compact && (
                <PanelButton title="Ukryj panel (pokażesz go w menu Układ nad stroną)" onClick={() => hidePanel(key, n)} testId="panel-hide">
                  <IconEyeOff size={13} />
                </PanelButton>
              )}
            </span>
          )}
        </header>
      )}
      {!collapsed && (
        <FillContext.Provider value={fill}>
          <div
            ref={bodyRef}
            className={join(height != null ? 'min-h-0 flex-none overflow-auto' : 'min-h-0 flex-1', fill && 'flex flex-col', maximized && 'overflow-auto', bodyClassName ?? 'p-2.5')}
            style={height != null ? { height } : undefined}
          >
            {body}
          </div>
        </FillContext.Provider>
      )}
      {controls && !collapsed && !maximized && !compact && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Wysokość panelu (przeciągnij; dwuklik – naturalna)"
          title="Przeciągnij, by zmienić wysokość; dwuklik – naturalna wysokość"
          tabIndex={0}
          className={EDGE + ' inset-x-0 bottom-0 h-[6px] cursor-ns-resize'}
          onPointerDown={(e) => startResize(e, 'y')}
          onDoubleClick={() => update({ height: undefined })}
          onKeyDown={resizeKey}
          data-testid="panel-resize"
        />
      )}
      {widthEdge && controls && !collapsed && (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Szerokość kolumny (przeciągnij; dwuklik – domyślne kolumny)"
            title="Przeciągnij, by zmienić szerokość (sąsiednia kolumna się dopasuje); dwuklik – domyślne kolumny"
            className={EDGE + ' inset-y-0 right-0 w-[6px] cursor-ew-resize'}
            onPointerDown={(e) => sectionRef.current && dragColumnBoundary(e, sectionRef.current)}
            onDoubleClick={() => sectionRef.current && resetColumns(sectionRef.current)}
            data-testid="panel-resize-width"
          />
          <div
            aria-hidden
            title="Przeciągnij, by zmienić szerokość i wysokość"
            className={EDGE + ' right-0 bottom-0 z-20 h-[12px] w-[12px] cursor-nwse-resize'}
            onPointerDown={(e) => startResize(e, 'xy')}
            data-testid="panel-resize-corner"
          />
        </>
      )}
    </section>
  )
}

/** Edges to drag: invisible until the pointer is over them, then an accent line. */
const EDGE = 'absolute z-10 outline-none transition-colors duration-100 hover:bg-accent/50 focus-visible:bg-accent/50 active:bg-accent/70'

function PanelButton({ title, onClick, children, testId }: { title: string; onClick: () => void; children: ReactNode; testId: string }) {
  return (
    <button
      type="button"
      className="flex h-[22px] w-[22px] items-center justify-center text-dim transition-colors duration-100 hover:bg-hover hover:text-fg-strong"
      title={title}
      aria-label={title}
      onClick={onClick}
      data-testid={testId}
    >
      {children}
    </button>
  )
}
