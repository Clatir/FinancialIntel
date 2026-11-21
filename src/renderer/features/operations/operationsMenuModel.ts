/**
 * Operacje: the right-click menu of the ticked operations (D105) – pure, tested in node. What the groups and their items
 * are, which are marked (✓ / „—”) or off and why, the keys that walk them, where the boxes stand on the screen, the
 * calendar's grid. The marks and the groups' fitting come from `bulkModel.ts` (`bulkProbe` – `opState` and `bulkApplies` in one pass) – no rule of
 * its own; the component only draws what comes out and runs the commands.
 */
import { addDays, daysInMonth, firstDayOf, monthOf, weekdayOf } from '@shared/calc/dates'
import { tagKey } from '@shared/calc/tags'
import { plDate, plural } from '@shared/format'
import { TX_KIND_LABEL, TX_KINDS, type Transaction } from '@shared/schema'
import { bulkProbe, type BulkChange, type OpState } from './bulkModel'
import { financeLabel } from '../household/financeWords'
import { filterChoices } from './pick'

/** What an item does when chosen: the old actions of the bar, a change with its preview, a change at once. */
export type MenuCommand =
  | { type: 'category'; categoryId: string; label: string }
  | { type: 'finance'; memberId: string | null; gift: boolean; label: string }
  | { type: 'preview'; change: BulkChange; what: string }
  | { type: 'apply'; change: BulkChange; what: string }

export interface MenuLeaf {
  type: 'leaf'
  /** The whole `data-testid` after `operations-menu-`: `<group>-<value>`. */
  id: string
  label: string
  command: MenuCommand
  mark?: OpState
  /** A switch: the menu stays open after it (tags, „wyjaśniona”). */
  keepOpen?: boolean
  /** The reason it is off – set means off. */
  disabled?: string
  danger?: boolean
}

export interface MenuSub {
  type: 'sub'
  id: string
  label: string
  items: MenuNode[]
  disabled?: string
}

export interface MenuSep {
  type: 'sep'
  id: string
}

/** A box of its own in a submenu: the month's calendar, the shift by days, the field of a new tag. */
export type MenuWidget =
  | { type: 'calendar'; id: string; month: string; today: string; selected: string | null; disabled?: string }
  | { type: 'shift'; id: string; disabled?: string }
  | { type: 'newtag'; id: string; disabled?: string }
  /** The category list's search field (the fragment typed; `none` – nothing in the tree holds it). */
  | { type: 'search'; id: string; query: string; none: boolean; disabled?: string }

export type MenuNode = MenuLeaf | MenuSub | MenuSep | MenuWidget

export interface MenuInput {
  /** The ticked operations the list shows. */
  count: number
  /** The ones a bulk change may write (`bulkTargets`) and the docked ones. */
  records: readonly Transaction[]
  docked: ReadonlySet<string>
  /** Why the folder cannot be written (null – it can). */
  readOnly: string | null
  today: string
  /** In the order of the tree: `name` as listed, `label` as the toast says it, `sub` – a subcategory. */
  categories: ReadonlyArray<{ id: string; name: string; label: string; sub: boolean }>
  /** The fragment typed in the category list's search field – the list shows only the categories that hold it (as `filterChoices`). */
  categoryQuery?: string
  accounts: ReadonlyArray<{ id: string; name: string; archived: boolean }>
  members: ReadonlyArray<{ id: string; name: string; archived: boolean }>
  tags: readonly string[]
  containers: ReadonlyArray<{ id: string; name: string; archived: boolean; cycleMonths: number }>
  goals: ReadonlyArray<{ id: string; name: string; takes: boolean; amount: number; priority: number }>
  loans: ReadonlyArray<{ id: string; name: string; direction: 'given' | 'taken' }>
}

const NEWER = 'Zaznaczone operacje zapisała nowsza wersja aplikacji – ta ich nie zmienia.'
const noFit = (what: string) => `Żadna z zaznaczonych operacji nie ${what}.`

/** What the toast and the preview's title say after the words of a change: „na 02.10.2026”, „o +3 dni”. */
export function whatOf(c: BulkChange): string {
  if (c.kind === 'day') return `na ${plDate(c.date)}`
  if (c.kind === 'shift') return `o ${c.days > 0 ? '+' : c.days < 0 ? '−' : ''}${Math.abs(c.days)} ${plural(Math.abs(c.days), 'dzień', 'dni', 'dni')}`
  return ''
}

/** Why a change did not fit the operations the preview leaves out – by what kind of change it is. */
export function skipReason(c: BulkChange): string {
  switch (c.kind) {
    case 'container':
      return 'nie wydatek, wpływ albo podział paragonu'
    case 'loan':
      return 'nie operacja pożyczki albo podział'
    case 'goal':
      return 'nie wydatek albo podział'
    case 'impulse':
      return 'nie wydatek'
    case 'explained':
      return 'nie korekta'
    case 'tag':
      return 'rodzaj bez tagów albo pełna lista'
    case 'titleRule':
      // The rule's direction (T549): a refund's rule never takes a purchase, an expense's never an inflow.
      return 'zadokowane, przelew na własne konto, podział albo kwota w drugą stronę niż reguła'
    default:
      return 'zadokowane, przelew na własne konto'
  }
}

const quoted = (s: string) => `„${s}”`

export function buildMenu(input: MenuInput): MenuNode[] {
  const { records, docked } = input
  const off = input.readOnly ?? (records.length ? null : NEWER)
  /** One pass over the operations per item: does the change fit any, and the ✓ / „—” (none – no mark). */
  const probe = (c: BulkChange): { fit: boolean; mark: OpState | undefined; on: boolean } => {
    const p = bulkProbe(records, c, docked)
    return { fit: p.fit > 0, mark: p.state === 'off' ? undefined : p.state, on: p.state === 'on' }
  }
  const fits = (c: BulkChange) => probe(c).fit
  const withOff = <T extends object>(node: T, reason: string | null | undefined): T => (reason ? { ...node, disabled: reason } : node)

  const changeLeafOf = (p: ReturnType<typeof probe>, leaf: MenuLeaf): MenuLeaf => withOff({ ...leaf, ...(p.mark ? { mark: p.mark } : {}) }, off ?? (p.fit ? null : noFit('przyjmie tej zmiany')))

  /** A leaf for a change: the state mark, off when it fits none of the operations. */
  const changeLeaf = (id: string, label: string, change: BulkChange, what: string, mode: 'preview' | 'apply', extra: Partial<MenuLeaf> = {}): MenuLeaf =>
    changeLeafOf(probe(change), { type: 'leaf', id, label, command: { type: mode, change, what }, ...extra })

  const group = (id: string, label: string, items: MenuNode[], reason: string | null): MenuSub => withOff({ type: 'sub', id, label, items } as MenuSub, off ?? reason)

  const usedAccounts = new Set(records.map((t) => t.accountId))
  const accountsShown = input.accounts.filter((a) => !a.archived || usedAccounts.has(a.id))
  const activeMembers = input.members.filter((m) => !m.archived)

  // The search field first, as the editor's category field has it (Z7): a fragment keeps the categories whose whole label
  // holds it – a subcategory then shows its main one („Jedzenie · Zakupy”), as the field's list does.
  const query = input.categoryQuery ?? ''
  const matching = new Set(filterChoices(input.categories.map((c) => ({ id: c.id, label: c.label, main: !c.sub })), query).map((c) => c.id))
  const shownCategories = input.categories.filter((c) => matching.has(c.id))
  const category = group(
    'category',
    'Kategoria',
    [
      { type: 'search', id: 'category-search', query, none: !!query.trim() && !shownCategories.length },
      ...shownCategories.map((c) => ({ type: 'leaf', id: `category-${c.id}`, label: c.sub && !query.trim() ? `· ${c.name}` : c.label, command: { type: 'category', categoryId: c.id, label: c.label } }) as MenuLeaf)
    ],
    null
  )

  const finance = group(
    'finance',
    'Finansujący',
    [
      { type: 'leaf', id: 'finance-me', label: 'ja (mój wydatek)', command: { type: 'finance', memberId: null, gift: false, label: 'Mój wydatek' } },
      ...activeMembers.map((m): MenuLeaf => ({ type: 'leaf', id: `finance-${m.id}`, label: `kupione dla: ${m.name} (odda)`, command: { type: 'finance', memberId: m.id, gift: false, label: financeLabel(false, m.name) } })),
      ...activeMembers.map((m): MenuLeaf => ({ type: 'leaf', id: `finance-gift-${m.id}`, label: `prezent dla: ${m.name}`, command: { type: 'finance', memberId: m.id, gift: true, label: financeLabel(true, m.name) } }))
    ],
    null
  )

  const account = group(
    'account',
    'Konto',
    accountsShown.map((a) => changeLeaf(`account-${a.id}`, a.name, { kind: 'account', accountId: a.id }, quoted(a.name), 'preview')),
    null
  )

  const accountName = (id: string | null) => input.accounts.find((a) => a.id === id)?.name
  const kind = group(
    'kind',
    'Rodzaj',
    TX_KINDS.filter((k) => k !== 'correction').map((k): MenuNode => {
      if (k !== 'transfer') return changeLeaf(`kind-${k}`, TX_KIND_LABEL[k], { kind: 'kind', to: k }, `na ${quoted(TX_KIND_LABEL[k])}`, 'preview')
      const sides: Array<{ id: string | null; label: string }> = [{ id: null, label: 'konto spoza budżetu' }, ...accountsShown.map((a) => ({ id: a.id, label: a.name }))]
      return {
        type: 'sub',
        id: 'kind-transfer',
        label: TX_KIND_LABEL.transfer,
        items: sides.map((s) =>
          changeLeaf(`kind-transfer-${s.id ?? 'none'}`, s.label, { kind: 'kind', to: 'transfer', counterAccountId: s.id }, `na ${quoted(`${TX_KIND_LABEL.transfer}${s.id ? ` – ${accountName(s.id) ?? ''}` : ''}`)}`, 'preview')
        ),
        ...(off ? { disabled: off } : {})
      }
    }),
    null
  )

  // The calendar opens on the operations' common day (or today's month).
  const days = new Set(records.map((t) => t.date))
  const selected = days.size === 1 ? [...days][0]! : null
  const date = group(
    'date',
    'Data',
    [
      { type: 'calendar', id: 'date-calendar', month: monthOf(selected ?? input.today), today: input.today, selected },
      { type: 'shift', id: 'date-shift' }
    ],
    null
  )

  const tagLeaf = (tag: string): MenuLeaf => {
    const p = probe({ kind: 'tag', tag, on: true })
    const change: BulkChange = { kind: 'tag', tag, on: !p.on }
    // „tags-tag-…”: a tag's id never meets „tags-new”, „tags-clear” or „tags-sep” (a tag may be called „Clear”).
    return withOff(
      { type: 'leaf', id: `tags-tag-${tagKey(tag)}`, label: tag, command: { type: 'apply', change, what: `#${tag}` }, keepOpen: true, ...(p.mark ? { mark: p.mark } : {}) } as MenuLeaf,
      off ?? (p.fit ? null : 'Tag nie przyjmie się w żadnej z zaznaczonych operacji (rodzaj bez tagów albo pełna lista).')
    )
  }
  const hasTags = !probe({ kind: 'tagsClear' }).on
  const tags = group(
    'tags',
    'Tagi',
    [
      ...input.tags.map(tagLeaf),
      ...(input.tags.length ? [{ type: 'sep', id: 'tags-sep' } as MenuSep] : []),
      { type: 'newtag', id: 'tags-new', ...(off ? { disabled: off } : {}) },
      withOff(
        { type: 'leaf', id: 'tags-clear', label: 'Wyczyść tagi', command: { type: 'apply', change: { kind: 'tagsClear' }, what: '' } } as MenuLeaf,
        off ?? (hasTags ? null : 'Żadna z zaznaczonych operacji nie ma tagów.')
      )
    ],
    null
  )

  const pick = (id: 'plan' | 'impulse' | 'none', label: string): MenuLeaf => {
    const change: BulkChange = { kind: 'impulse', to: id === 'none' ? null : id }
    return changeLeaf(`impulse-${id}`, label, change, '', 'apply')
  }
  const impulse = group('impulse', 'Plan / impuls', [pick('plan', 'plan'), pick('impulse', 'impuls'), pick('none', 'bez oznaczenia')], fits({ kind: 'impulse', to: null }) ? null : noFit('jest wydatkiem'))

  const explainedProbe = probe({ kind: 'explained', on: true })
  const explained: MenuLeaf = withOff(
    {
      type: 'leaf',
      id: 'explained',
      label: 'Wyjaśniona korekta',
      command: { type: 'apply', change: { kind: 'explained', on: !explainedProbe.on }, what: '' },
      keepOpen: true,
      ...(explainedProbe.mark ? { mark: explainedProbe.mark } : {})
    } as MenuLeaf,
    off ?? (explainedProbe.fit ? null : noFit('jest korektą'))
  )

  const usedContainers = new Set(records.flatMap((t) => (t.containerId ? [t.containerId] : [])))
  const containers = input.containers.filter((c) => !c.archived || usedContainers.has(c.id))
  const container = group(
    'container',
    'Ładownia',
    [
      changeLeaf('container-none', 'nie z ładowni', { kind: 'container', containerId: null }, '', 'preview'),
      ...containers.map((c) => changeLeaf(`container-${c.id}`, `${c.name}${c.cycleMonths > 1 ? ' (ze zbiornika)' : ''}`, { kind: 'container', containerId: c.id }, quoted(c.name), 'preview'))
    ],
    !containers.length ? 'Brak kontenerów ładowni.' : fits({ kind: 'container', containerId: null }) ? null : noFit('przyjmie ładowni (tylko wydatki – wypływ, bez podziału paragonu)')
  )

  const usedGoals = new Set(records.flatMap((t) => (t.goalId ? [t.goalId] : [])))
  const goals = [...input.goals.filter((g) => g.takes || g.amount > 0 || usedGoals.has(g.id))].sort((a, b) => Number(b.takes) - Number(a.takes) || a.priority - b.priority)
  const goal = group(
    'goal',
    'Cel',
    [
      changeLeaf('goal-none', 'nie z pieniędzy celu', { kind: 'goal', goalId: null }, '', 'preview'),
      ...goals.map((g) => changeLeaf(`goal-${g.id}`, `${g.name}${g.takes ? '' : ' (archiwum)'}`, { kind: 'goal', goalId: g.id }, quoted(g.name), 'preview'))
    ],
    !goals.length ? 'Brak celów z pieniędzmi do wydania.' : fits({ kind: 'goal', goalId: null }) ? null : noFit('przyjmie celu (tylko wydatki, bez podziału paragonu)')
  )

  const loan = group(
    'loan',
    'Pożyczka',
    [
      changeLeaf('loan-none', 'bez pożyczki z radaru', { kind: 'loan', loanId: null }, '', 'preview'),
      ...input.loans.map((l) => changeLeaf(`loan-${l.id}`, `${l.name} (${l.direction === 'given' ? 'udzielona' : 'wzięta'})`, { kind: 'loan', loanId: l.id }, quoted(l.name), 'preview'))
    ],
    !input.loans.length ? 'Brak pożyczek na radarze.' : fits({ kind: 'loan', loanId: null }) ? null : noFit('jest operacją pożyczki (bez podziału paragonu)')
  )

  const del: MenuLeaf = withOff({ type: 'leaf', id: 'delete', label: 'Usuń zaznaczone', command: { type: 'preview', change: { kind: 'delete' }, what: '' }, danger: true } as MenuLeaf, off)

  return [category, finance, account, kind, date, tags, impulse, explained, container, goal, loan, { type: 'sep', id: 'sep' }, del]
}

// ------------------------------------------------------------------ the calendar

/** The weeks of a month from Monday, with the days of the neighbouring months that fill the first and last row. */
export function monthGrid(month: string): Array<Array<{ date: string; inMonth: boolean }>> {
  const first = firstDayOf(month)
  const start = addDays(first, 1 - weekdayOf(first))
  const rows = Math.ceil((weekdayOf(first) - 1 + daysInMonth(month)) / 7)
  return Array.from({ length: rows }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d)
      return { date, inMonth: monthOf(date) === month }
    })
  )
}

// ------------------------------------------------------------------ keys

/** The open submenus (their ids from the root) and the item in focus on the deepest level (null – none). */
export interface MenuNav {
  path: string[]
  focus: string | null
}

export type MenuKey = 'ArrowDown' | 'ArrowUp' | 'ArrowLeft' | 'ArrowRight' | 'Enter' | 'Home' | 'End'

export const initialNav = (): MenuNav => ({ path: [], focus: null })

/** The items of the level the path leads to (null – no such level). */
export function findLevel(root: MenuNode[], path: readonly string[]): MenuNode[] | null {
  let level = root
  for (const id of path) {
    const next = level.find((n) => n.id === id)
    if (!next || next.type !== 'sub') return null
    level = next.items
  }
  return level
}

/** The items the arrows stop on: not a separator, not an off one. */
const focusable = (items: readonly MenuNode[]): MenuNode[] => items.filter((n) => n.type !== 'sep' && !n.disabled)

function openSub(root: MenuNode[], nav: MenuNav, id: string): MenuNav {
  const level = findLevel(root, nav.path)
  const node = level?.find((n) => n.id === id)
  if (!node || node.type !== 'sub' || node.disabled) return nav
  const path = [...nav.path, id]
  return { path, focus: focusable(node.items)[0]?.id ?? null }
}

/** The mouse over an item of the level `depth` (0 – the root): the deeper submenus close, its own opens. */
export function hoverItem(root: MenuNode[], nav: MenuNav, depth: number, id: string): MenuNav {
  const cut: MenuNav = { path: nav.path.slice(0, depth), focus: id }
  const node = findLevel(root, cut.path)?.find((n) => n.id === id)
  if (node?.type === 'sub' && !node.disabled) return { path: [...cut.path, id], focus: focusable(node.items)[0]?.id ?? null }
  return cut
}

/** One key: the new place and, for Enter on an item, the item to run. */
export function navigate(root: MenuNode[], nav: MenuNav, key: MenuKey): { nav: MenuNav; run?: MenuLeaf } {
  const level = findLevel(root, nav.path)
  if (!level) return { nav }
  const stops = focusable(level)
  const at = stops.findIndex((n) => n.id === nav.focus)
  const to = (i: number): { nav: MenuNav } => ({ nav: { path: nav.path, focus: stops[i]?.id ?? nav.focus } })
  switch (key) {
    case 'ArrowDown':
      return stops.length ? to(at < 0 ? 0 : (at + 1) % stops.length) : { nav }
    case 'ArrowUp':
      return stops.length ? to(at < 0 ? stops.length - 1 : (at - 1 + stops.length) % stops.length) : { nav }
    case 'Home':
      return to(0)
    case 'End':
      return to(stops.length - 1)
    case 'ArrowLeft':
      return nav.path.length ? { nav: { path: nav.path.slice(0, -1), focus: nav.path.at(-1) ?? null } } : { nav }
    case 'ArrowRight':
      return { nav: nav.focus ? openSub(root, nav, nav.focus) : nav }
    case 'Enter': {
      const node = stops[at]
      if (!node) return { nav }
      if (node.type === 'sub') return { nav: openSub(root, nav, node.id) }
      return node.type === 'leaf' ? { nav, run: node } : { nav }
    }
  }
}

// ------------------------------------------------------------------ place on the screen

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface Place {
  left: number
  top: number
  /** The box scrolls past this height (the window less its margins). */
  maxHeight: number
}

const MARGIN = 8

/** The menu at the mouse: kept inside the window – over the pointer when there is no room below, never off the edge. */
export function placeAt(at: { x: number; y: number }, size: { w: number; h: number }, win: { w: number; h: number }, margin = MARGIN): Place {
  const maxHeight = win.h - 2 * margin
  const h = Math.min(size.h, maxHeight)
  const left = Math.max(margin, Math.min(at.x, win.w - margin - size.w))
  let top = at.y
  if (top + h > win.h - margin) top = at.y - h >= margin ? at.y - h : win.h - margin - h
  return { left, top: Math.max(margin, top), maxHeight }
}

/** A submenu beside its parent item: to the right, to the left when there is no room, never off the window. */
export function placeSub(parent: Rect, size: { w: number; h: number }, win: { w: number; h: number }, margin = MARGIN, overlap = 2): Place & { side: 'right' | 'left' } {
  const maxHeight = win.h - 2 * margin
  const h = Math.min(size.h, maxHeight)
  const right = parent.left + parent.width - overlap
  const leftOf = parent.left - size.w + overlap
  let side: 'right' | 'left' = 'right'
  let left = right
  if (right + size.w > win.w - margin) {
    if (leftOf >= margin) {
      side = 'left'
      left = leftOf
    } else {
      left = Math.max(margin, win.w - margin - size.w)
    }
  }
  let top = parent.top - 4
  if (top + h > win.h - margin) top = win.h - margin - h
  return { left, top: Math.max(margin, top), maxHeight, side }
}
