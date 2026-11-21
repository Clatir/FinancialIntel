// adapted from ICTTJ src/renderer/store/ui.ts @ 84a8339
import { create } from 'zustand'
import { readSettingsTab } from '../features/settings/settingsNav'

/** Screens of the side menu (docs/specyfikacja.md, „Ekrany”). */
export type Page = 'bridge' | 'operations' | 'import' | 'month' | 'cargo' | 'starmap' | 'radar' | 'command' | 'intel' | 'reports' | 'settings' | 'sync' | 'wizard' | 'inbox'

export type Route = { page: Exclude<Page, 'settings'> } | { page: 'settings'; tab?: SettingsTab }

export type SettingsTab = 'general' | 'accounts' | 'categories' | 'layers' | 'household' | 'import' | 'ictj' | 'notify' | 'view' | 'folder' | 'system' | 'updates'

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  text: string
  /** A button in the toast (e.g. "Cofnij"); it closes the toast. */
  action?: { label: string; run: () => void }
}

/** Records the palette opens on their screens (F19); 'settlements' – a member's block in Radar (UX-82), 'all' – the panel. */
export type FocusKind = 'container' | 'goal' | 'loan' | 'member' | 'buoy' | 'settlements'

interface UiState {
  route: Route
  /** The routes „wstecz” goes back through (the last is the previous screen). */
  history: Route[]
  /** The routes „dalej” goes forward through – filled by „wstecz”, emptied by a new screen (UX-12). */
  forward: Route[]
  paletteOpen: boolean
  toasts: Toast[]
  /** A record to show on its screen (F19): `components/focus.ts` `useFocusRecord`. */
  focus: { kind: FocusKind; id: string } | null
}

export const useUi = create<UiState>(() => ({
  route: { page: 'bridge' },
  history: [],
  forward: [],
  paletteOpen: false,
  toasts: [],
  focus: null
}))

/** A record opened on its screen (F19): the screen shows it – selected, scrolled to, marked for a moment. */
export function focusRecord(kind: FocusKind, id: string, route: Route): void {
  navigate(route)
  useUi.setState({ focus: { kind, id } })
}

/**
 * Apply what the focused field holds: the budget's fields (amount, date, names) keep a draft until they are left, so
 * a change of screen or record leaves the field first – its value is saved, never dropped.
 */
export function commitActiveField(): void {
  if (typeof document === 'undefined') return
  const el = document.activeElement as HTMLElement | null
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) el.blur()
}

/**
 * Ustawienia without a named tab show the one remembered on this computer (`fi.settings.tab`): the route gets that tab
 * by name, so „wstecz” returns to the tab that was shown, not to whichever is remembered by then (T553).
 */
function resolveRoute(route: Route): Route {
  return route.page === 'settings' && !route.tab ? { page: 'settings', tab: readSettingsTab() } : route
}

/** The same screen (and the same Ustawienia tab) – not a place „wstecz” should stop at (UX-12). */
export function sameRoute(a: Route, b: Route): boolean {
  if (a.page !== b.page) return false
  if (a.page !== 'settings' || b.page !== 'settings') return true
  return (a.tab ?? readSettingsTab()) === (b.tab ?? readSettingsTab())
}

export function navigate(route: Route): void {
  commitActiveField()
  const to = resolveRoute(route)
  useUi.setState((s) => (sameRoute(s.route, to) ? { route: to } : { route: to, history: [...s.history.slice(-20), resolveRoute(s.route)], forward: [] }))
}

export function goBack(): void {
  commitActiveField()
  useUi.setState((s) => {
    const prev = s.history.at(-1)
    return prev ? { route: prev, history: s.history.slice(0, -1), forward: [...s.forward.slice(-20), s.route] } : { route: { page: 'bridge' } }
  })
}

/** „Dalej” (Alt+→, the mouse's forward button): back to the screen „wstecz” left (UX-12). */
export function goForward(): void {
  commitActiveField()
  useUi.setState((s) => {
    const next = s.forward.at(-1)
    return next ? { route: next, history: [...s.history.slice(-20), s.route], forward: s.forward.slice(0, -1) } : {}
  })
}

let toastSeq = 0
/** A toast with „Cofnij” stays at least this long (AP-22, AF-7): 6 s was too short to notice and decide. */
export const UNDO_MIN_MS = 8000

/** How long a toast stays by default (UX-10): an error 8 s, the rest 4 s – 40 ms more for each character over 60, 12 s at most. */
export function toastMs(text: string, kind: Toast['kind']): number {
  const base = kind === 'error' ? 8000 : 4000
  return Math.min(12000, base + Math.max(0, text.length - 60) * 40)
}

/** A toast's running timer: the mouse over it stops it (`pauseToast`) and it goes on with what was left (`resumeToast`). */
const toastTimers = new Map<number, { timer: ReturnType<typeof setTimeout>; left: number; since: number }>()
/** The least a toast stays after the mouse leaves it – enough to see where the pointer went. */
const TOAST_RESUME_MIN_MS = 1500

function startToastTimer(id: number, ms: number): void {
  toastTimers.set(id, { timer: setTimeout(() => closeToast(id), ms), left: ms, since: Date.now() })
}

/**
 * `ms` – a longer time than the default of the kind and length (never a shorter one: a long error stays long enough to
 * read, UX-10); with an `action` at least `UNDO_MIN_MS`.
 */
export function toast(text: string, kind: Toast['kind'] = 'info', ms?: number, action?: Toast['action']): void {
  const id = ++toastSeq
  let time = Math.max(ms ?? 0, toastMs(text, kind))
  if (action) time = Math.max(time, UNDO_MIN_MS)
  // The same text again replaces the one shown (its timer goes with it).
  for (const t of useUi.getState().toasts) if (t.text === text) closeToast(t.id)
  useUi.setState((s) => ({ toasts: [...s.toasts.slice(-2), { id, kind, text, ...(action ? { action } : {}) }] }))
  startToastTimer(id, time)
}

/** The mouse is over a toast (UX-10): it stays. */
export function pauseToast(id: number): void {
  const t = toastTimers.get(id)
  if (!t) return
  clearTimeout(t.timer)
  toastTimers.set(id, { ...t, left: Math.max(0, t.left - (Date.now() - t.since)), since: Date.now() })
}

/** The mouse left a toast (UX-10): it goes on with the time it had left (at least a moment). */
export function resumeToast(id: number): void {
  const t = toastTimers.get(id)
  if (!t) return
  clearTimeout(t.timer)
  startToastTimer(id, Math.max(TOAST_RESUME_MIN_MS, t.left))
}

/**
 * What a „Cofnij” left as it is (AP-22, AP-15 – review 3 of N4): it takes back only what is still as its action left it –
 * what changed since stays, and that is said. `back` – taken back, `kept` – changed since, `what` – their name in the
 * plural („operacje”).
 */
export function undoKept(back: number, kept: number, what = 'operacje'): void {
  if (!kept) return
  const text = back
    ? `Cofnięte ${what}: ${back}; zmienione od tego czasu zostają, jak są: ${kept}.`
    : kept === 1
      ? 'Nic nie cofnięto – zmieniło się od tego czasu i zostaje, jak jest.'
      : `Nic nie cofnięto – ${what} zmienione od tego czasu zostają, jak są (${kept}).`
  toast(text, 'info', 7000)
}

export function closeToast(id: number): void {
  const t = toastTimers.get(id)
  if (t) clearTimeout(t.timer)
  toastTimers.delete(id)
  useUi.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}

export function setPalette(open: boolean): void {
  useUi.setState({ paletteOpen: open })
}
