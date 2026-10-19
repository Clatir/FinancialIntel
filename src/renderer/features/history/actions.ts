// adapted from ICTTJ src/renderer/features/history/actions.ts @ 84a8339
import type { HistoryKind } from '@shared/api'
import type { Collection } from '@shared/paths'
import { api, errorMessage } from '../../lib/api'
import { adoptSettings, deleteRecord, deleteRecords, saveFirst } from '../../store/data'
import { toast } from '../../store/ui'

/** Make a kept version current: pending edits are written first, the current version goes to the history. */
export async function restoreVersion(kind: HistoryKind, id: string, file: string, label: string): Promise<boolean> {
  try {
    await saveFirst('odzyskanie wersji')
    const fi = await api.historyRestore(kind, id, file)
    if (fi) adoptSettings(fi)
    toast(`Przywrócono: ${label}. Poprzednia wersja jest w historii.`, 'success', 5000)
    return true
  } catch (e) {
    toast(errorMessage(e), 'error', 7000)
    return false
  }
}

/** Delete a record with "Cofnij" in the toast: the undo restores the version kept by the deletion, like "Usunięte wpisy". */
export async function deleteWithUndo(collection: Collection, id: string, label: string, text: string, beforeUndo?: () => boolean, afterUndo?: () => Promise<void>): Promise<boolean> {
  try {
    await deleteRecord(collection, id)
  } catch (e) {
    toast(errorMessage(e), 'error', 8000)
    return false
  }
  toast(text, 'success', 8000, {
    label: 'Cofnij',
    run: () =>
      void (async () => {
        if (beforeUndo && !beforeUndo()) return
        const kept = (await api.historyList(collection, id)).filter((e) => e.reason === 'delete')
        const last = kept[0]
        if (!last) return toast('Tej wersji nie ma już w historii.', 'error')
        await restoreVersion(collection, id, last.file, label)
        // What went with it (an operation's dockings – B15).
        await afterUndo?.()
      })()
  })
  return true
}

/** Records deleted with another one back from the versions their deletion kept (B15); quietly – the other says it. */
export async function restoreDeleted(collection: Collection, ids: readonly string[]): Promise<void> {
  for (const id of ids) {
    const last = (await api.historyList(collection, id)).find((e) => e.reason === 'delete')
    if (!last) continue
    try {
      const fi = await api.historyRestore(collection, id, last.file)
      if (fi) adoptSettings(fi)
    } catch (e) {
      toast(errorMessage(e), 'error', 7000)
      return
    }
  }
}

/**
 * Delete several records with one "Cofnij" (e.g. duplicates after an import): the undo restores each from the
 * version its deletion kept (after `onUndo` – what the caller changed with them, 1.2.1). Deleted with one call (W1); a
 * record whose file the disk refused stays (the error said after), those deleted still get the undo. The ids deleted:
 * the caller takes back what it changed for the others (1.7.0).
 */
export async function deleteManyWithUndo(collection: Collection, ids: readonly string[], label: string, text: (n: number) => string, onUndo?: () => void): Promise<string[]> {
  const { deleted, error } = await deleteRecords(collection, ids)
  if (deleted.length)
    toast(text(deleted.length), 'success', 10000, {
      label: 'Cofnij',
      run: () =>
        void (async () => {
          // What changed with the deletion (a merged record, a moved link) goes back first.
          onUndo?.()
          try {
            await saveFirst('cofnięcie')
          } catch (e) {
            return toast(errorMessage(e), 'error', 7000)
          }
          let missing = 0
          for (const id of deleted) {
            const last = (await api.historyList(collection, id)).find((e) => e.reason === 'delete')
            if (!last) {
              missing++
              continue
            }
            try {
              const fi = await api.historyRestore(collection, id, last.file)
              if (fi) adoptSettings(fi)
            } catch (e) {
              toast(errorMessage(e), 'error', 7000)
              return
            }
          }
          toast(missing ? `Przywrócono ${deleted.length - missing} z ${deleted.length}: ${label}.` : `Przywrócono: ${label}.`, missing ? 'error' : 'success', 5000)
        })()
    })
  if (error) toast(error, 'error', 8000)
  return deleted
}
