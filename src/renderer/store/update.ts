// adapted from ICTTJ src/renderer/store/update.ts @ 84a8339
import { create } from 'zustand'
import type { UpdatePrefs, UpdateState } from '@shared/update'
import { api, errorMessage } from '../lib/api'
import { saveFirst } from './data'
import { toast } from './ui'

/** Update status pushed by the main process (null until the first answer). */
export const useUpdate = create<{ state: UpdateState | null }>(() => ({ state: null }))

const setState = (state: UpdateState) => useUpdate.setState({ state })

let started = false
export function initUpdates(): void {
  if (started) return
  started = true
  api.onUpdateState(setState)
  void api.updateState().then(setState, () => undefined)
}

export async function checkForUpdates(): Promise<void> {
  try {
    setState(await api.checkForUpdates())
  } catch (e) {
    toast(errorMessage(e), 'error')
  }
}

export async function downloadUpdate(): Promise<void> {
  try {
    setState(await api.downloadUpdate())
  } catch (e) {
    toast(errorMessage(e), 'error')
  }
}

export async function setUpdatePrefs(prefs: Partial<UpdatePrefs>): Promise<void> {
  try {
    setState(await api.setUpdatePrefs(prefs))
  } catch (e) {
    toast(errorMessage(e), 'error')
  }
}

/** Saves (or with null removes) the GitHub token of this computer; the main process checks for updates with it. */
export async function setUpdateToken(token: string | null): Promise<boolean> {
  try {
    setState(await api.setUpdateToken(token))
    return true
  } catch (e) {
    toast(errorMessage(e), 'error')
    return false
  }
}

export async function dismissUpdateNotice(): Promise<void> {
  setState(await api.dismissUpdateNotice())
}

/** Save everything, then quit, install and start the new version. */
export async function restartToUpdate(): Promise<void> {
  try {
    await saveFirst('aktualizacja')
    await api.installUpdateNow()
  } catch (e) {
    toast(errorMessage(e), 'error')
  }
}
