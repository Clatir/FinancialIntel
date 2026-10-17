import { create } from 'zustand'
import { DEFAULT_MACHINE_PREFS, patchMachinePrefs, type MachinePrefs } from '@shared/machine'
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

/** Ctrl+$: amounts masked or shown (also in the tray's tooltip). */
export function toggleHideAmounts(): void {
  const hidden = !useMachine.getState().prefs.hideAmounts
  void setMachinePrefs({ hideAmounts: hidden })
  toast(hidden ? 'Kwoty ukryte (Ctrl+$ pokazuje).' : 'Kwoty widoczne.', 'info', 2000)
}
