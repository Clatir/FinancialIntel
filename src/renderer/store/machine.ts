import { create } from 'zustand'
import { DEFAULT_MACHINE_PREFS, patchMachinePrefs, shortcutLabel, type MachinePrefs } from '@shared/machine'
import { api } from '../lib/api'
import { toast } from './ui'

/** Preferences of this computer (config.json): the shortcut, notifications, sounds, hidden amounts. */
export const useMachine = create<{ prefs: MachinePrefs }>(() => ({ prefs: DEFAULT_MACHINE_PREFS }))

let listening = false

/** The preferences from config.json, then every change (from this or another window of the app). */
export async function loadMachinePrefs(): Promise<void> {
  if (!listening) {
    listening = true
    api.onMachinePrefs((prefs) => useMachine.setState({ prefs }))
  }
  try {
    const c = await api.getConfig()
    if (c.prefs) useMachine.setState({ prefs: c.prefs })
  } catch {
    /* defaults */
  }
}

export async function setMachinePrefs(patch: Partial<MachinePrefs>): Promise<void> {
  // At once on the screen; config.json and the other windows follow.
  useMachine.setState((s) => ({ prefs: patchMachinePrefs(s.prefs, patch) }))
  try {
    useMachine.setState({ prefs: await api.setMachinePrefs(patch) })
  } catch (e) {
    toast(`Nie udało się zapisać ustawień tego komputera: ${e instanceof Error ? e.message : String(e)}`, 'error', 6000)
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

/** Ctrl+$: amounts masked or shown (also in the tray's tooltip). */
export function toggleHideAmounts(): void {
  const hidden = !useMachine.getState().prefs.hideAmounts
  void setMachinePrefs({ hideAmounts: hidden })
  toast(hidden ? 'Kwoty ukryte (Ctrl+$ pokazuje).' : 'Kwoty widoczne.', 'info', 2000)
}
