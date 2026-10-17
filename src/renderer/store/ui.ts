// adapted from ICTTJ src/renderer/store/ui.ts @ 84a8339
import { create } from 'zustand'

/** Screens of the side menu (docs/specyfikacja.md, „Ekrany”). */
export type Page = 'bridge' | 'operations' | 'import' | 'month' | 'cargo' | 'starmap' | 'radar' | 'command' | 'intel' | 'reports' | 'settings' | 'sync'

export type Route = { page: Exclude<Page, 'settings'> } | { page: 'settings'; tab?: SettingsTab }

export type SettingsTab = 'general' | 'accounts' | 'categories' | 'folder' | 'system' | 'updates'

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  text: string
  /** A button in the toast (e.g. "Cofnij"); it closes the toast. */
  action?: { label: string; run: () => void }
}

interface UiState {
  route: Route
  history: Route[]
  paletteOpen: boolean
  toasts: Toast[]
}

export const useUi = create<UiState>(() => ({
  route: { page: 'bridge' },
  history: [],
  paletteOpen: false,
  toasts: []
}))

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
export function toast(text: string, kind: Toast['kind'] = 'info', ms = 3200, action?: Toast['action']): void {
  const id = ++toastSeq
  useUi.setState((s) => ({ toasts: [...s.toasts.filter((t) => t.text !== text).slice(-2), { id, kind, text, ...(action ? { action } : {}) }] }))
  setTimeout(() => closeToast(id), ms)
}

export function closeToast(id: number): void {
  useUi.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}

export function setPalette(open: boolean): void {
  useUi.setState({ paletteOpen: open })
}
