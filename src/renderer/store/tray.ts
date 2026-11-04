import { create } from 'zustand'
import type { TrayPrefs } from '@shared/api'
import { api } from '../lib/api'
import { configSaveFailed } from './machine'

export type TrayView = TrayPrefs & { loginSupported: boolean; loginEntry?: boolean | null }

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

/** Read again now (Ustawienia, the list of a new computer shown – przegląd 3 N5): the system's entry as it is now. */
export function refreshTrayPrefs(): Promise<void> {
  return api.trayPrefs().then(
    (prefs) => useTray.setState({ prefs }),
    () => undefined
  )
}

/**
 * The start with Windows as the switch shows it (przegląd 3 N5, T433): the system's entry of this copy – what really
 * happens at the next login – and, when config.json says otherwise (set aside or gone with the defaults, an entry of an
 * older version, turned off in Task Manager), a short note why; the switch then writes the system's entry as chosen.
 */
export function autostartOf(p: TrayView): { on: boolean; note: string | null } {
  const system = p.loginEntry
  if (system == null || system === p.launchAtLogin) return { on: p.launchAtLogin, note: null }
  return system
    ? { on: true, note: 'Windows uruchamia tę kopię przy starcie (jest jej wpis w systemie), choć zapisane ustawienie mówi „nie” – przełącznik pokazuje stan systemu; wyłącz, żeby usunąć wpis.' }
    : { on: false, note: 'Zapisane ustawienie mówi „tak”, ale Windows nie uruchamia tej kopii przy starcie (brak wpisu albo wyłączony w Menedżerze zadań) – przełącznik pokazuje stan systemu; włącz, żeby go zapisać.' }
}

/**
 * The main process applies the change – the start with Windows too – before config.json's write (AP-28, T433): a write
 * refused (retried by itself) leaves it working, so the screen shows what this computer has now, with the reason.
 */
export async function setTrayPrefs(patch: Parameters<typeof api.setTrayPrefs>[0]): Promise<TrayView> {
  try {
    const prefs = await api.setTrayPrefs(patch)
    useTray.setState({ prefs })
    return prefs
  } catch (e) {
    const prefs = await api.trayPrefs().catch(() => null)
    if (!prefs) throw e
    useTray.setState({ prefs })
    configSaveFailed(e)
    return prefs
  }
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
export const asksAutostart = (prefs: TrayView | null, budgetStarted: boolean): boolean => !!prefs && budgetStarted && prefs.loginSupported && !autostartOf(prefs).on && !prefs.autostartAsked
