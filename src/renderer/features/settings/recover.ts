/**
 * Recovery from a backup (F3, D86): the chosen records of a backup written back as new versions – the ones they replace
 * kept in the history (reason 'restore') – with „Cofnij”; or the whole backup unpacked into a new folder beside the
 * data folder (`api.backupToFolder`, through the settings' switching of folders).
 */
import type { BackupDiffItem, BackupPreview } from '@shared/api'
import type { Collection } from '@shared/paths'
import { api, errorMessage } from '../../lib/api'
import { plural } from '../../lib/format'
import { adoptSettings, canWrite, deleteRecords, flushSaves, useData } from '../../store/data'
import { toast } from '../../store/ui'

const UNSAVED = 'Nie udało się zapisać bieżących zmian – spróbuj ponownie za chwilę.'

/** The chosen records (and the settings) of the backup made current; false = nothing written. */
export async function recoverFromBackup(preview: BackupPreview, picks: readonly BackupDiffItem[], settings: boolean): Promise<boolean> {
  if (!canWrite()) return false
  if (!(await flushSaves())) {
    toast(UNSAVED, 'error', 7000)
    return false
  }
  const fiId = useData.getState().fi?.id ?? null
  try {
    const res = await api.backupRecover(
      preview.path,
      picks.map((p) => ({ collection: p.collection, id: p.id })),
      settings
    )
    if (res.fi) adoptSettings(res.fi)
    const done = picks.filter((p) => res.done.includes(p.id))
    const n = done.length
    const what = [n ? `${n} ${plural(n, 'wpis', 'wpisy', 'wpisów')}` : '', res.fi ? 'ustawienia' : ''].filter(Boolean).join(' i ')
    if (what)
      toast(`Odzyskano z kopii: ${what}. Poprzednie wersje są w historii.`, 'success', 12000, {
        label: 'Cofnij',
        run: () => void undoRecover(done, res.fi ? fiId : null)
      })
    if (res.failed.length) toast(`Nie odzyskano ${res.failed.length} ${plural(res.failed.length, 'wpisu', 'wpisów', 'wpisów')}: ${res.failed[0]!.error}`, 'error', 10000)
    return n > 0 || !!res.fi
  } catch (e) {
    toast(errorMessage(e), 'error', 8000)
    return false
  }
}

/**
 * „Cofnij” of a recovery: a record that came back from deletion is deleted again; a changed one, and the settings, take
 * the version the recovery kept in the history.
 */
async function undoRecover(items: readonly BackupDiffItem[], fiId: string | null): Promise<void> {
  if (!(await flushSaves())) return toast(UNSAVED, 'error', 7000)
  let missing = 0
  try {
    for (const i of items) {
      if (i.change !== 'changed') continue
      const kept = (await api.historyList(i.collection, i.id)).find((e) => e.reason === 'restore')
      if (!kept) {
        missing++
        continue
      }
      await api.historyRestore(i.collection, i.id, kept.file)
    }
    const back = new Map<Collection, string[]>()
    for (const i of items) if (i.change === 'deleted') back.set(i.collection, [...(back.get(i.collection) ?? []), i.id])
    for (const [collection, ids] of back) {
      const { error } = await deleteRecords(collection, ids)
      if (error) throw new Error(error)
    }
    if (fiId) {
      const kept = (await api.historyList('fi', fiId)).find((e) => e.reason === 'restore')
      if (kept) {
        const fi = await api.historyRestore('fi', fiId, kept.file)
        if (fi) adoptSettings(fi)
      } else missing++
    }
  } catch (e) {
    return toast(errorMessage(e), 'error', 8000)
  }
  toast(missing ? `Cofnięto odzyskanie z kopii – bez ${missing} (tej wersji nie ma już w historii).` : 'Cofnięto odzyskanie z kopii.', missing ? 'error' : 'success', 6000)
}
