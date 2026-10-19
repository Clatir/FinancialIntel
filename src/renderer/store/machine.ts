import { create } from 'zustand'
import { DEFAULT_MACHINE_PREFS, patchMachinePrefs, shortcutLabel, zoomFromKey, type MachinePrefs } from '@shared/machine'
import { api } from '../lib/api'
import { toast } from './ui'

/** Preferences of this computer (config.json): the shortcut, notifications, sounds, hidden amounts. */
export const useMachine = create<{ prefs: MachinePrefs }>(() => ({ prefs: DEFAULT_MACHINE_PREFS }))

let listening = false
/**
 * This window's changes on their way to config.json: while any is, the answers of the earlier ones (and their echo to
 * every window) are not shown – they would take back a later change made meanwhile (two Ctrl+Plus in a row: one step).
 */
let pending = 0

/** The preferences from config.json, then every change (from this or another window of the app). */
export async function loadMachinePrefs(): Promise<void> {
  if (!listening) {
    listening = true
    api.onMachinePrefs((prefs) => {
      if (!pending) useMachine.setState({ prefs })
    })
  }
  try {
    const c = await api.getConfig()
    // A change made meanwhile (Ctrl+Plus at the start) is newer than this answer.
    if (c.prefs && !pending) useMachine.setState({ prefs: c.prefs })
  } catch {
    /* defaults */
  }
}

export async function setMachinePrefs(patch: Partial<MachinePrefs>): Promise<void> {
  // At once on the screen; config.json and the other windows follow.
  pending++
  useMachine.setState((s) => ({ prefs: patchMachinePrefs(s.prefs, patch) }))
  try {
    const prefs = await api.setMachinePrefs(patch)
    // The last answer carries all of them (the main process applies them in turn).
    if (pending === 1) useMachine.setState({ prefs })
  } catch (e) {
    toast(`Nie udało się zapisać ustawień tego komputera: ${e instanceof Error ? e.message : String(e)}`, 'error', 6000)
  } finally {
    pending--
  }
}

let shortcutNoticed = false

/** Once per run, with the window ready: the start replaced a shortcut that took a Polish letter (AltGr – B29). */
export function noticeReplacedShortcut(): void {
  if (shortcutNoticed) return
  shortcutNoticed = true
  void api.quickShortcutState().then(
    (s) => {
      if (s.replaced)
        toast(
          `Skrót szybkiego wpisu ${shortcutLabel(s.replaced)} zabierał polską literę (AltGr) w innych programach – teraz jest ${s.accelerator ? shortcutLabel(s.accelerator) : 'bez skrótu'}. Inny ustawisz w Ustawienia → Powiadomienia i dźwięki.`,
          'info',
          15000
        )
    },
    () => undefined
  )
}

/** The look of this computer (F30): the higher contrast as an attribute of the page – the styles do the rest. */
export function installLook(): void {
  const apply = (on: boolean) => {
    if (on) document.documentElement.dataset.contrast = 'high'
    else delete document.documentElement.dataset.contrast
  }
  apply(useMachine.getState().prefs.highContrast)
  useMachine.subscribe((s, prev) => {
    if (s.prefs.highContrast !== prev.prefs.highContrast) apply(s.prefs.highContrast)
  })
}

/**
 * Ctrl+Plus / Ctrl+Minus / Ctrl+Shift+0 in every window (F30): the size of this computer – the main process gives it to
 * all the windows. Caught before the page's own keys (Ctrl+0 is Raporty).
 */
export function installZoomKeys(): void {
  window.addEventListener(
    'keydown',
    (e) => {
      const zoom = useMachine.getState().prefs.zoom
      const next = zoomFromKey({ key: e.key, code: e.code, control: e.ctrlKey, meta: e.metaKey, alt: e.altKey, shift: e.shiftKey }, zoom)
      if (next == null) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (next !== zoom) void setMachinePrefs({ zoom: next })
    },
    true
  )
}

/** „Pokaż na 5 minut” / „Pokaż do końca sesji” (F40): the hidden amounts shown – the idleness hides them again only later. */
export async function revealAmounts(minutes: number | null): Promise<void> {
  try {
    useMachine.setState({ prefs: await api.revealAmounts(minutes) })
    toast(minutes ? `Kwoty widoczne przez ${minutes} min.` : 'Kwoty widoczne do zamknięcia aplikacji.', 'info', 2500)
  } catch (e) {
    toast(`Nie udało się pokazać kwot: ${e instanceof Error ? e.message : String(e)}`, 'error', 6000)
  }
}

/** Ctrl+$: amounts masked or shown (also in the tray's tooltip). */
export function toggleHideAmounts(): void {
  const hidden = !useMachine.getState().prefs.hideAmounts
  void setMachinePrefs({ hideAmounts: hidden })
  toast(hidden ? 'Kwoty ukryte (Ctrl+$ pokazuje).' : 'Kwoty widoczne.', 'info', 2000)
}
