/**
 * Operacje: the menu under the right button on a row (D105) – the changes of the ticked operations beside the bar's: the
 * category, who finances, the account, the kind, the date (a month's calendar or a shift by days), the tags, plan /
 * impulse, a correction explained, the cargo, the goal, the loan, delete. What each item is and which are marked or off
 * comes from `operationsMenuModel.ts`; a change goes through the same preview and the same „Cofnij” as the bar's. Desktop
 * only – the phone has no right button (the bar stays).
 */
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import { addDays, addMonths, monthOf, warsawNow } from '@shared/calc/dates'
import { MAX_TAG_LENGTH, tagKey, tagLabel } from '@shared/calc/tags'
import { CompactContext } from '../../components/compact'
import { IconBack, IconNext } from '../../components/icons'
import { LimitHint, cx } from '../../components/ui'
import { WEEKDAY_PL, monthLabel, plural } from '../../lib/format'
import { useData, useFolderLocked } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { useRecordList } from '../../store/records'
import { toast } from '../../store/ui'
import { useMembers } from '../household/actions'
import { useKnownTags } from '../tags/state'
import { previewBulk } from './bulkPreview'
import { bulkApplies } from './bulkModel'
import {
  buildMenu,
  findLevel,
  hoverItem,
  initialNav,
  monthGrid,
  navigate,
  placeAt,
  placeSub,
  realHover,
  whatOf,
  type MenuCommand,
  type MenuInput,
  type MenuKey,
  type MenuLeaf,
  type MenuNav,
  type MenuNode,
  type MenuWidget,
  type Place
} from './operationsMenuModel'
import { useAccounts, useCategories } from './pickers'
import { pruneDue, tickedIn, type PruneArm } from './rangeSelect'
import { applyBulk, bulkPlan, bulkTargets, categorizeTicked, financeTicked, pruneTickedTo, useOperationsUi } from './state'

// ------------------------------------------------------------------ the store: where the menu stands

const useMenuAt = create<{ at: { x: number; y: number } | null }>(() => ({ at: null }))

export const closeOperationsMenu = (): void => useMenuAt.setState({ at: null })

/**
 * The right button on a row: a row outside the ticked ones becomes the only one ticked (and the anchor of a range), then
 * the menu opens at the mouse.
 */
export function openOperationsMenu(id: string, x: number, y: number): void {
  if (!useOperationsUi.getState().ticked[id]) useOperationsUi.setState({ ticked: { [id]: true }, tickAnchor: id })
  useMenuAt.setState({ at: { x, y } })
}

// ------------------------------------------------------------------ the menu

const ROOT_WIDTH = 232
const SUB_WIDTH = 236
const CALENDAR_WIDTH = 262
const MARK_GLYPH = { on: '✓', mixed: '—' } as const

/** `order` = the rows the list shows (no drafts): the ticked among them are what the menu changes. */
export function OperationsMenu({ order }: { order: readonly string[] }) {
  const at = useMenuAt((s) => s.at)
  const compact = useContext(CompactContext)
  if (!at || compact) return null
  return <MenuBody key={`${at.x}:${at.y}`} at={at} order={order} />
}

function MenuBody({ at, order }: { at: { x: number; y: number }; order: readonly string[] }) {
  const ticked = useOperationsUi((s) => s.ticked)
  const transactions = useData((s) => s.records.transactions)
  const folderLocked = useFolderLocked()
  const lockedReason = useData((s) => s.status?.readOnlyReason ?? null)
  const cats = useCategories()
  const accounts = useAccounts()
  const members = useMembers()
  const tags = useKnownTags()
  const containers = useRecordList('containers')
  const loans = useRecordList('loans')
  const fleet = useFleet()
  // What the menu changes: the ticked rows of this very render that the list shows – never a hidden one (D76), also in the
  // frame between a change of the data and the list following it.
  const ids = useMemo(() => tickedIn(order, ticked), [order, ticked])
  const count = ids.length
  const [nav, setNav] = useState<MenuNav>(initialNav)
  // The fragment typed in the category list's search field.
  const [categoryQuery, setCategoryQuery] = useState('')
  const box = useRef<HTMLDivElement>(null)

  const input = useMemo<MenuInput>(() => {
    // `bulkTargets` reads the operations and the docking from the data (`transactions` is a dependency for that: the menu follows
    // a change made in it) of the ticked rows shown (`ids`).
    const { records, docked } = bulkTargets(ids)
    const categories = cats.mains
      .filter((c) => !c.archived)
      .flatMap((c) => [
        { id: c.id, name: c.name, label: cats.label(c.id), sub: false },
        ...cats
          .childrenOf(c.id)
          .filter((x) => !x.archived)
          .map((x) => ({ id: x.id, name: x.name, label: cats.label(x.id), sub: true }))
      ])
    return {
      count: ids.length,
      records,
      docked,
      readOnly: folderLocked ? (lockedReason ?? 'Folder jest tylko do odczytu – zmiany nie są zapisywane.') : null,
      today: warsawNow().date,
      categories,
      categoryQuery,
      accounts,
      members,
      tags,
      containers,
      goals: fleet?.goals ?? [],
      loans
    }
  }, [transactions, ids, cats, categoryQuery, accounts, members, tags, containers, loans, fleet, folderLocked, lockedReason])
  const root = useMemo(() => buildMenu(input), [input])

  // A switch of the menu has written (`afterSwitch`: the operations before it and the ones it touched): of these, the ones it
  // hid from the list are no longer ticked (D76) – once, when the list has followed the data. Nothing else prunes: not an edit
  // elsewhere, not a list empty for want of data, not a switch that wrote nothing, not what was hidden before by something else.
  const afterSwitch = useRef<PruneArm | null>(null)
  useEffect(() => {
    const due = pruneDue(afterSwitch.current, transactions)
    if (!due) return
    afterSwitch.current = null
    pruneTickedTo(order, due)
  }, [order, transactions])

  // Nothing ticked is left to change: the menu goes.
  useEffect(() => {
    if (!count) closeOperationsMenu()
  }, [count])

  // The calendar's month is the menu's (it survives the submenu closing).
  const dateNode = root.find((n) => n.id === 'date')
  const startMonth = dateNode?.type === 'sub' && dateNode.items[0]?.type === 'calendar' ? dateNode.items[0].month : monthOf(warsawNow().date)
  const [month, setMonth] = useState(startMonth)

  const run = async (leaf: MenuLeaf): Promise<void> => {
    const c: MenuCommand = leaf.command
    if (c.type === 'category') {
      closeOperationsMenu()
      categorizeTicked(ids, c.categoryId, 'none', c.label)
    } else if (c.type === 'finance') {
      closeOperationsMenu()
      financeTicked(ids, { memberId: c.memberId, gift: c.gift }, c.label)
    } else if (c.type === 'preview') {
      closeOperationsMenu()
      previewBulk(ids, c.change, c.what)
    } else {
      const plan = bulkPlan(ids, c.change)
      if (!plan.before.length) {
        toast('Bez zmian – zaznaczone operacje są już takie.', 'info')
        return
      }
      if (!leaf.keepOpen) closeOperationsMenu()
      // A switch leaves the menu open and the ticks as they were: the next one works on the same operations – the ones
      // the change hid from the list are unticked once the list has followed the data (the effect above).
      // Armed before the write (the list may render at once), disarmed when it wrote nothing (`canWrite()` false).
      const from = useData.getState().records.transactions
      if (leaf.keepOpen) afterSwitch.current = { from, ids: new Set(plan.before.map((t) => t.id)) }
      await applyBulk(plan, c.what, { keepTicked: !!leaf.keepOpen })
      if (useData.getState().records.transactions === from) afterSwitch.current = null
    }
  }
  const runRef = useRef(run)
  runRef.current = run
  const navRef = useRef(nav)
  navRef.current = nav
  // Where the mouse last moved (the menu opens at it): what `realHover` compares an entry with.
  const lastMouse = useRef<{ x: number; y: number } | null>({ x: at.x, y: at.y })
  const rootRef = useRef(root)
  rootRef.current = root

  useEffect(() => {
    const inMenu = (t: EventTarget | null) => t instanceof Element && !!t.closest('[data-operations-menu]')
    const onDown = (e: MouseEvent) => {
      if (!inMenu(e.target)) closeOperationsMenu()
    }
    const onScroll = (e: Event) => {
      if (!inMenu(e.target)) closeOperationsMenu()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Only the menu goes: the ticks stay and the window or the list never hears it.
        e.preventDefault()
        e.stopImmediatePropagation()
        closeOperationsMenu()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target instanceof Element ? e.target : null
      const field = target instanceof HTMLInputElement && target.type !== 'checkbox' && target.type !== 'button'
      // The calendar's grid walks its days itself.
      if (target?.closest('[data-menu-grid]')) return
      // Enter on a button of a widget (the month's arrows, „Podgląd…” of the shift) presses it – only an item of the menu is run by the keys.
      if (e.key === 'Enter' && target instanceof HTMLButtonElement && target.getAttribute('role') !== 'menuitem') return
      const keys: readonly string[] = field ? ['ArrowDown', 'ArrowUp'] : ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Home', 'End']
      if (!keys.includes(e.key)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      const r = navigate(rootRef.current, navRef.current, e.key as MenuKey)
      setNav(r.nav)
      if (r.run) void runRef.current(r.run)
    }
    const onMove = (e: MouseEvent) => {
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove, true)
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', closeOperationsMenu)
    window.addEventListener('blur', closeOperationsMenu)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('wheel', onScroll, true)
    return () => {
      window.removeEventListener('mousemove', onMove, true)
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', closeOperationsMenu)
      window.removeEventListener('blur', closeOperationsMenu)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('wheel', onScroll, true)
    }
  }, [])

  // The focus follows the item the keys or the mouse are on.
  useEffect(() => {
    if (!nav.focus) return
    const el = box.current?.querySelector(`[data-menu-item="${CSS.escape(nav.focus)}"]`)
    const target = el?.querySelector<HTMLElement>('[data-menu-focus]') ?? (el as HTMLElement | null)
    target?.focus({ preventScroll: true })
  }, [nav])

  const levels = [root, ...nav.path.map((_, i) => findLevel(root, nav.path.slice(0, i + 1)) ?? [])]
  const render = (items: MenuNode[], depth: number): ReactNode =>
    items.map((node) => {
      if (node.type === 'sep') return <div key={node.id} className="my-1 border-t border-line" role="separator" />
      if (node.type === 'calendar') return <MenuCalendar key={node.id} node={node} month={month} setMonth={setMonth} onPick={(date) => void run(dayLeaf(date))} />
      if (node.type === 'shift') return <MenuShift key={node.id} node={node} onApply={(days) => void run(shiftLeaf(days))} />
      if (node.type === 'newtag') return <MenuNewTag key={node.id} node={node} records={input.records} docked={input.docked} onAdd={(tag) => void run(tagLeaf(tag))} />
      if (node.type === 'search') {
        // Enter takes the first category the fragment leaves (the field's own Enter – the keys of the menu skip a field).
        const first = items.find((n): n is MenuLeaf => n.type === 'leaf')
        return <MenuCategorySearch key={node.id} node={node} onQuery={setCategoryQuery} onFirst={first ? () => void run(first) : undefined} />
      }
      const open = node.type === 'sub' && nav.path[depth] === node.id
      const mark = node.type === 'leaf' ? node.mark : undefined
      return (
        <button
          key={node.id}
          type="button"
          role="menuitem"
          disabled={!!node.disabled}
          title={node.disabled}
          data-menu-item={node.id}
          data-testid={`operations-menu-${node.id}`}
          data-state={mark ?? 'off'}
          data-open={open ? '1' : undefined}
          className={cx(
            'flex h-[26px] w-full shrink-0 items-center gap-2 px-2 text-left text-[12px] text-fg outline-none enabled:hover:bg-hover disabled:cursor-default disabled:text-dim',
            (open || nav.focus === node.id) && !node.disabled && 'bg-hover',
            node.type === 'leaf' && node.danger && 'text-down'
          )}
          // Once on entering an item, and only when the mouse itself moved there (`realHover`): a list that changes under a
          // resting pointer enters its items too, and one must not take the focus (nor the Enter) from the field typed in.
          onMouseEnter={(e) => {
            if (!realHover(lastMouse.current, e.clientX, e.clientY)) return
            setNav((n) => hoverItem(root, n, depth, node.id))
          }}
          onClick={() => {
            if (node.type === 'sub') setNav((n) => hoverItem(root, n, depth, node.id))
            else void run(node)
          }}
        >
          <span className="w-3 shrink-0 text-center text-accent" aria-hidden>
            {mark === 'on' || mark === 'mixed' ? MARK_GLYPH[mark] : ''}
          </span>
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          {node.type === 'sub' && (
            <span className="text-[10px] text-dim" aria-hidden>
              ▸
            </span>
          )}
        </button>
      )
    })

  return createPortal(
    <div ref={box} data-operations-menu onContextMenu={(e) => e.preventDefault()}>
      {levels.map((items, depth) => {
        const parent = depth ? nav.path[depth - 1]! : null
        const wide = items.some((n) => n.type === 'calendar')
        return (
          <MenuBox
            key={parent ?? 'root'}
            anchor={parent ? { item: parent } : { at }}
            width={depth === 0 ? ROOT_WIDTH : wide ? CALENDAR_WIDTH : SUB_WIDTH}
            testId={parent ? `operations-menu-panel-${parent}` : 'operations-menu'}
          >
            {depth === 0 && (
              <div className="mb-1 border-b border-line px-2 pb-1.5 text-[11px] text-muted" data-testid="operations-menu-header">
                Zmień {count} {plural(count, 'operację', 'operacje', 'operacji')}
              </div>
            )}
            {render(items, depth)}
          </MenuBox>
        )
      })}
    </div>,
    document.body
  )
}

const dayLeaf = (date: string): MenuLeaf => {
  const change = { kind: 'day', date } as const
  return { type: 'leaf', id: 'date-day', label: '', command: { type: 'preview', change, what: whatOf(change) } }
}
const shiftLeaf = (days: number): MenuLeaf => {
  const change = { kind: 'shift', days } as const
  return { type: 'leaf', id: 'date-shift-apply', label: '', command: { type: 'preview', change, what: whatOf(change) } }
}
const tagLeaf = (tag: string): MenuLeaf => ({ type: 'leaf', id: 'tags-new', label: tag, keepOpen: true, command: { type: 'apply', change: { kind: 'tag', tag, on: true }, what: `#${tag}` } })

/** One box of the menu: at the mouse or beside its parent item, kept inside the window, scrolling when taller. */
function MenuBox({ anchor, width, testId, children }: { anchor: { at: { x: number; y: number } } | { item: string }; width: number; testId: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<Place | null>(null)
  // Measured from the layout before it is painted; again after every render (a switch can change what is inside).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const win = { w: document.documentElement.clientWidth, h: document.documentElement.clientHeight }
    const size = { w: width, h: el.scrollHeight + 2 }
    let next: Place
    if ('at' in anchor) next = placeAt(anchor.at, size, win)
    else {
      const parent = document.querySelector(`[data-menu-item="${CSS.escape(anchor.item)}"]`)
      if (!parent) return
      const r = parent.getBoundingClientRect()
      next = placeSub({ left: r.left, top: r.top, width: r.width, height: r.height }, size, win)
    }
    setPlace((p) => (p && p.left === next.left && p.top === next.top && p.maxHeight === next.maxHeight ? p : { left: next.left, top: next.top, maxHeight: next.maxHeight }))
  })
  return (
    <div
      ref={ref}
      role="menu"
      data-testid={testId}
      className="fixed z-40 flex flex-col overflow-y-auto border border-line-strong bg-raised py-1"
      // Not `visibility: hidden` until it is placed: a hidden element takes no focus, and the focus is asked for at once.
      style={{ width, left: place?.left ?? 0, top: place?.top ?? 0, maxHeight: place?.maxHeight, opacity: place ? 1 : 0, pointerEvents: place ? undefined : 'none' }}
    >
      {children}
    </div>
  )
}

// ------------------------------------------------------------------ the widgets

function MenuCalendar({ node, month, setMonth, onPick }: { node: Extract<MenuWidget, { type: 'calendar' }>; month: string; setMonth: (m: string) => void; onPick: (date: string) => void }) {
  const weeks = useMemo(() => monthGrid(month), [month])
  const grid = useRef<HTMLDivElement>(null)
  const refocus = useRef(false)
  const inMonth = (d: string | null) => (d && monthOf(d) === month ? d : null)
  const [focusDate, setFocusDate] = useState<string>(() => inMonth(node.selected) ?? inMonth(node.today) ?? `${month}-01`)
  // The day to land on: the one moved to by the keys, else the chosen one, today, the month's first.
  const landing = inMonth(focusDate) ?? inMonth(node.selected) ?? inMonth(node.today) ?? `${month}-01`
  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    grid.current?.querySelector<HTMLElement>('[data-menu-focus]')?.focus({ preventScroll: true })
  }, [focusDate, month])
  const go = (date: string) => {
    refocus.current = true
    setFocusDate(date)
    if (monthOf(date) !== month) setMonth(monthOf(date))
  }
  const step = (n: number) => {
    const next = addMonths(month, n)
    setMonth(next)
    setFocusDate(`${next}-01`)
  }
  const onKeyDown = (e: ReactKeyboardEvent) => {
    const by: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    const n = by[e.key]
    if (n === undefined) return
    e.preventDefault()
    e.stopPropagation()
    go(addDays(landing, n))
  }
  return (
    <div className="flex flex-col gap-1 px-2 py-1" data-menu-item={node.id} data-testid="operations-menu-date-calendar">
      <div className="flex items-center justify-between">
        <button type="button" className="btn btn-ghost h-[22px] px-1" aria-label="Poprzedni miesiąc" onClick={() => step(-1)} data-testid="operations-menu-date-prev-month">
          <IconBack size={12} />
        </button>
        <span className="text-[12px] text-fg-strong" data-testid="operations-menu-date-month">
          {monthLabel(month)}
        </span>
        <button type="button" className="btn btn-ghost h-[22px] px-1" aria-label="Następny miesiąc" onClick={() => step(1)} data-testid="operations-menu-date-next-month">
          <IconNext size={12} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] text-dim">
        {WEEKDAY_PL.slice(1).map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div ref={grid} className="flex flex-col" data-menu-grid onKeyDown={onKeyDown}>
        {weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7">
            {week.map((d) => (
              <button
                key={d.date}
                type="button"
                tabIndex={d.date === landing ? 0 : -1}
                data-menu-focus={d.date === landing ? '' : undefined}
                data-today={d.date === node.today ? '1' : undefined}
                data-selected={d.date === node.selected ? '1' : undefined}
                aria-label={d.date}
                className={cx(
                  'num h-[24px] border text-[11.5px] outline-none hover:bg-hover focus-visible:border-accent',
                  d.date === node.today ? 'border-accent/70' : 'border-transparent',
                  d.date === node.selected ? 'bg-accent-soft text-accent' : d.inMonth ? 'text-fg' : 'text-dim'
                )}
                onClick={() => onPick(d.date)}
                data-testid={`operations-menu-date-day-${d.date}`}
              >
                {Number(d.date.slice(8, 10))}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MenuShift({ node, onApply }: { node: Extract<MenuWidget, { type: 'shift' }>; onApply: (days: number) => void }) {
  const [days, setDays] = useState(1)
  return (
    <div className="flex items-center gap-1.5 border-t border-line px-2 pt-1.5 pb-1 text-[12px]" data-menu-item={node.id}>
      <span className="text-muted">Przesuń o</span>
      <input
        type="number"
        className="input num h-[24px] w-[60px] py-0"
        value={days}
        min={-366}
        max={366}
        data-menu-focus=""
        onChange={(e) => setDays(Math.max(-366, Math.min(366, Math.trunc(Number(e.currentTarget.value) || 0))))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && days) {
            e.preventDefault()
            onApply(days)
          }
        }}
        aria-label="Dni (minus – wcześniej)"
        title="Dni: na plus – później, na minus – wcześniej"
        data-testid="operations-menu-date-shift-days"
      />
      <span className="text-muted">{plural(Math.abs(days), 'dzień', 'dni', 'dni')}</span>
      <button type="button" className="btn ml-auto h-[24px]" disabled={!days} title={days ? undefined : 'Podaj liczbę dni inną niż 0.'} onClick={() => onApply(days)} data-testid="operations-menu-date-shift-apply">
        Podgląd…
      </button>
    </div>
  )
}

function MenuCategorySearch({ node, onQuery, onFirst }: { node: Extract<MenuWidget, { type: 'search' }>; onQuery: (query: string) => void; onFirst?: () => void }) {
  return (
    <div className="flex flex-col gap-1 px-2 py-1" data-menu-item={node.id}>
      <input
        className="input h-[24px] py-0"
        placeholder="szukaj kategorii…"
        value={node.query}
        spellCheck={false}
        data-menu-focus=""
        onChange={(e) => onQuery(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onFirst) {
            e.preventDefault()
            onFirst()
          }
        }}
        aria-label="Szukaj kategorii"
        data-testid="operations-menu-category-search"
      />
      {node.none && (
        <span className="text-[11px] text-muted" data-testid="operations-menu-category-none">
          Żadna kategoria nie zawiera „{node.query.trim()}”.
        </span>
      )}
    </div>
  )
}

function MenuNewTag({ node, records, docked, onAdd }: { node: Extract<MenuWidget, { type: 'newtag' }>; records: MenuInput['records']; docked: MenuInput['docked']; onAdd: (tag: string) => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const add = () => {
    const tag = tagLabel(text)
    if (!tagKey(tag)) {
      setError('Wpisz nazwę tagu.')
      return
    }
    if (!bulkApplies(records, { kind: 'tag', tag, on: true }, docked)) {
      setError('Tag nie przyjmie się w żadnej z zaznaczonych operacji (rodzaj bez tagów albo pełna lista).')
      return
    }
    setError('')
    setText('')
    onAdd(tag)
  }
  return (
    <div className="flex flex-col gap-1 px-2 py-1" data-menu-item={node.id}>
      <input
        className="input h-[24px] py-0"
        placeholder="nowy tag…  (Enter)"
        value={text}
        disabled={!!node.disabled}
        maxLength={MAX_TAG_LENGTH}
        data-menu-focus=""
        onChange={(e) => {
          setText(e.currentTarget.value)
          setError('')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        aria-label="Nowy tag dla zaznaczonych"
        data-testid="operations-menu-tags-new"
      />
      <LimitHint length={text.length} max={MAX_TAG_LENGTH} />
      {error && (
        <span className="text-[11px] text-accent" data-testid="operations-menu-tags-error">
          {error}
        </span>
      )}
    </div>
  )
}
