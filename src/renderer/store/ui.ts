// adapted from ICTTJ src/renderer/store/ui.ts @ 84a8339
import { create } from 'zustand'

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

/** Records the palette opens on their screens (F19). */
export type FocusKind = 'container' | 'goal' | 'loan' | 'member'

interface UiState {
  route: Route
  history: Route[]
  paletteOpen: boolean
  toasts: Toast[]
  /** A record to show on its screen (F19): `components/focus.ts` `useFocusRecord`. */
  focus: { kind: FocusKind; id: string } | null
}

export const useUi = create<UiState>(() => ({
  route: { page: 'bridge' },
  history: [],
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

export function navigate(route: Route): void {
  commitActiveField()
  useUi.setState((s) => ({ route, history: [...s.history.slice(-20), s.route] }))
}

export function goBack(): void {
  commitActiveField()
  useUi.setState((s) => {
    const prev = s.history.at(-1)
    return prev ? { route: prev, history: s.history.slice(0, -1) } : { route: { page: 'bridge' } }
  })
}

let toastSeq = 0
/** A toast with „Cofnij” stays at least this long (AP-22, AF-7): 6 s was too short to notice and decide. */
export const UNDO_MIN_MS = 8000

export function toast(text: string, kind: Toast['kind'] = 'info', ms = 3200, action?: Toast['action']): void {
  const id = ++toastSeq
  if (action) ms = Math.max(ms, UNDO_MIN_MS)
  useUi.setState((s) => ({ toasts: [...s.toasts.filter((t) => t.text !== text).slice(-2), { id, kind, text, ...(action ? { action } : {}) }] }))
  setTimeout(() => closeToast(id), ms)
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
  useUi.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}

export function setPalette(open: boolean): void {
  useUi.setState({ paletteOpen: open })
}
