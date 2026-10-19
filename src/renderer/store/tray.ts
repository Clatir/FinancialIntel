import { create } from 'zustand'
import type { TrayPrefs } from '@shared/api'
import { api } from '../lib/api'

export type TrayView = TrayPrefs & { loginSupported: boolean }

/** This computer's tray and start with Windows (config.json) – for every screen that words something by them. */
export const useTray = create<{ prefs: TrayView | null }>(() => ({ prefs: null }))

let loading: Promise<void> | null = null

/** Read once (again after a failure); later changes come through `setTrayPrefs`. */
export function loadTrayPrefs(): Promise<void> {
  loading ??= api.trayPrefs().then(
    (prefs) => useTray.setState({ prefs }),
    () => {
      loading = null
    }
  )
  return loading
}

export async function setTrayPrefs(patch: Parameters<typeof api.setTrayPrefs>[0]): Promise<TrayView> {
  const prefs = await api.setTrayPrefs(patch)
  useTray.setState({ prefs })
  return prefs
}

/**
 * When a downloaded update gets installed (N98): closing the window to the tray quits nothing – only „Zakończ” in the
 * icon's menu or „Uruchom ponownie teraz” do.
 */
export const installWhen = (closeToTray: boolean | undefined): string =>
  closeToTray === false ? 'po zamknięciu aplikacji' : 'po „Zakończ” w menu ikony przy zegarze albo po „Uruchom ponownie teraz”'

/**
 * The start with Windows asked once on a computer that never chose it (N100, D64): the start wizard asks on the first
 * computer only – another one with the running budget is asked by a banner.
 */
export const asksAutostart = (prefs: TrayView | null, budgetStarted: boolean): boolean => !!prefs && budgetStarted && prefs.loginSupported && !prefs.launchAtLogin && !prefs.autostartAsked
