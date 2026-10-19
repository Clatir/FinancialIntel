/**
 * The ICTTJ folder of this computer as the main process reads it (D60, D72): the payouts and the forecast scenarios,
 * sent again on every change. Only the main window uses it (it owns the budget).
 */
import { create } from 'zustand'
import { EMPTY_ICTJ, type IctjSnapshot } from '@shared/ictj'
import { api, errorMessage } from '../lib/api'
import { countLabel } from '../lib/format'
import { toast } from './ui'

export const useIctj = create<{ snap: IctjSnapshot }>(() => ({ snap: EMPTY_ICTJ }))

let started = false

export function initIctj(): void {
  if (started) return
  started = true
  api.onIctj((snap) => useIctj.setState({ snap }))
  void api.ictjState().then(
    (snap) => useIctj.setState({ snap }),
    () => undefined
  )
}

/** The choices of a folder in order (B72): only the last one's answer counts. */
let choice = 0

/** Use a folder on this computer (null = none); false = refused (not ICTTJ's data) with the reason shown. */
export async function setIctjDir(dir: string | null): Promise<boolean> {
  const my = ++choice
  try {
    const snap = await api.ictjSetDir(dir)
    // Another folder chosen meanwhile: its snapshot comes with its own answer (and the main process's event).
    if (my !== choice) return true
    useIctj.setState({ snap })
    if (dir && snap.status === 'ok') toast(`ICTTJ: ${countLabel(snap.entries.length, 'wpis', 'wpisy', 'wpisów')} wypłat i zwrotów, ${countLabel(snap.forecasts.length, 'scenariusz', 'scenariusze', 'scenariuszy')} prognozy.`, 'success')
    return true
  } catch (e) {
    if (my !== choice) return true
    toast(errorMessage(e), 'error', 6000)
    return false
  }
}

/** „Otwórz ICTTJ”: the program of this computer; not found = the reason with the way to the settings. */
export async function openIctj(goSettings: () => void): Promise<void> {
  try {
    const r = await api.ictjOpen()
    if (!r.ok) toast(r.message, 'error', 7000, { label: 'Ustawienia', run: goSettings })
  } catch (e) {
    toast(errorMessage(e), 'error', 6000)
  }
}
