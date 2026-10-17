// adapted from ICTTJ src/renderer/features/history/actions.ts @ 84a8339
import type { HistoryKind } from '@shared/api'
import type { Collection } from '@shared/paths'
import { api, errorMessage } from '../../lib/api'
import { adoptSettings, deleteRecord, flushSaves } from '../../store/data'
import { toast } from '../../store/ui'

/** Make a kept version current: pending edits are written first, the current version goes to the history. */
export async function restoreVersion(kind: HistoryKind, id: string, file: string, label: string): Promise<boolean> {
  try {
    if (!(await flushSaves())) throw new Error('Nie udało się zapisać bieżących zmian – spróbuj ponownie za chwilę.')
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
export async function deleteWithUndo(collection: Collection, id: string, label: string, text: string, beforeUndo?: () => boolean): Promise<void> {
  await deleteRecord(collection, id)
  toast(text, 'success', 8000, {
    label: 'Cofnij',
    run: () =>
      void (async () => {
        if (beforeUndo && !beforeUndo()) return
        const kept = (await api.historyList(collection, id)).filter((e) => e.reason === 'delete')
        const last = kept[0]
        if (!last) return toast('Tej wersji nie ma już w historii.', 'error')
        await restoreVersion(collection, id, last.file, label)
      })()
  })
}

/**
 * Delete several records with one "Cofnij" (e.g. duplicates after an import): the undo restores each from the
 * version its deletion kept (after `onUndo` – what the caller changed with them, 1.2.1). A deletion that fails stops
 * the rest; those already deleted still get the undo.
 */
export async function deleteManyWithUndo(collection: Collection, ids: readonly string[], label: string, text: (n: number) => string, onUndo?: () => void): Promise<void> {
  const deleted: string[] = []
  let error: unknown = null
  for (const id of ids) {
    try {
      await deleteRecord(collection, id)
      deleted.push(id)
    } catch (e) {
      error = e
      break
    }
  }
  if (deleted.length)
    toast(text(deleted.length), 'success', 10000, {
      label: 'Cofnij',
      run: () =>
        void (async () => {
          // What changed with the deletion (a merged record, a moved link) goes back first.
          onUndo?.()
          let missing = 0
          for (const id of deleted) {
            const last = (await api.historyList(collection, id)).find((e) => e.reason === 'delete')
            if (!last) {
              missing++
              continue
            }
            try {
              if (!(await flushSaves())) throw new Error('Nie udało się zapisać bieżących zmian – spróbuj ponownie za chwilę.')
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
  if (error) throw error
}
