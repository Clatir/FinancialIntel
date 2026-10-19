/**
 * „Cofnij import” (1.5.1, F4): the imports' batches and taking the latest one back – with „Cofnij” in the toast, which
 * brings it again as it was.
 */
import { useMemo } from 'react'
import { latestImport, settingsRedone, settingsUndone, undoPlan, type UndoPlan } from '@shared/import/batch'
import type { Balance, ImportBatch, Transaction } from '@shared/schema'
import { api, errorMessage } from '../../lib/api'
import { countLabel } from '../../lib/format'
import { addRecords, deleteRecords, flushSaves, listOf, replaceRecords, saveFirst, unsavedNote, updateRecord, updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'

const byTime = (a: ImportBatch, b: ImportBatch) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)

/** The imports kept (the last ten), newest first. */
export function useImportBatches(): ImportBatch[] {
  const map = useData((s) => s.records.imports)
  return useMemo(() => [...listOf(map)].sort(byTime), [map])
}

/** The import that can be taken back now (the latest one that stands). */
export function useLatestImport(): ImportBatch | null {
  const map = useData((s) => s.records.imports)
  return useMemo(() => latestImport(listOf(map)), [map])
}

/** What taking `batch` back does now (the dialog's numbers). */
export function undoPreview(batch: ImportBatch): UndoPlan {
  const s = useData.getState()
  const docked = new Set(listOf(s.records.dockings).map((d) => d.transactionId))
  return undoPlan(batch, { tx: (id) => s.records.transactions[id]?.record, docked, rules: s.fi?.settings.import.rules ?? [], balance: (id) => s.records.balances[id] })
}

/** What taking an import back changed, as it was before (its „Cofnij”). */
interface Undone {
  batch: ImportBatch
  /** The operations it deleted, as they were. */
  deleted: Transaction[]
  /** The operations it set back, as they were. */
  restored: Transaction[]
  /** The operations it brought back. */
  readded: string[]
  /** The balances confirmed by the file it deleted, as they were. */
  confirmations: Balance[]
}

/**
 * The import's operations not on this computer that never were here (no version in the history): still on their way
 * from the other computer (OneDrive) – the undo waits for them, else they would come later and stay for good.
 */
async function notArrived(batch: ImportBatch, has: (id: string) => boolean): Promise<number> {
  let n = 0
  for (const id of batch.created) if (!has(id) && !(await api.historyList('transactions', id)).length) n++
  return n
}

/**
 * Take the latest import back (F4); false = not done (said in a toast). `force`: without waiting for operations not on
 * this computer (deleted outside the app – they never come).
 */
export async function undoImport(batchId: string, force = false): Promise<boolean> {
  try {
    const s0 = useData.getState()
    if (s0.switching) throw new Error('Trwa otwieranie innego folderu – spróbuj za chwilę.')
    if (s0.status?.readOnly || !s0.fi) throw new Error('Folder jest tylko do odczytu – import nie może być cofnięty.')
    const batch = s0.records.imports[batchId]?.record
    if (!batch || batch.undoneAt) throw new Error('Ten import jest już cofnięty.')
    if (latestImport(listOf(s0.records.imports))?.id !== batch.id) throw new Error('Najpierw cofnij późniejszy import – importy cofa się od ostatniego.')
    await saveFirst('cofnięcie importu')
    const waiting = force ? 0 : await notArrived(batch, (id) => !!useData.getState().records.transactions[id])
    if (waiting) {
      toast(
        `${countLabel(waiting, 'operacja', 'operacje', 'operacji')} tego importu nie ma na tym komputerze i nigdy tu nie ${waiting === 1 ? 'była' : 'były'} – pewnie jeszcze się synchronizują (OneDrive): cofnij import za chwilę. Usunięte poza aplikacją już nie dotrą – wtedy „Cofnij mimo to”.`,
        'error',
        15000,
        { label: 'Cofnij mimo to', run: () => void undoImport(batchId, true) }
      )
      return false
    }
    const s = useData.getState()
    const plan = undoPreview(batch)
    const tx = (id: string) => s.records.transactions[id]?.record
    // Deleted as the undo's (history 'undo'): the next import brings their rows (T39).
    const removal = plan.remove.length ? await deleteRecords('transactions', plan.remove, { reason: 'undo' }) : null
    if (removal?.error) {
      // Files held by another program: the import stands – „Cofnij import” again deletes the rest and finishes.
      toast(`Nie udało się usunąć części operacji importu (${plan.remove.length - removal.deleted.length} z ${plan.remove.length}): ${removal.error} Kliknij „Cofnij import” jeszcze raz za chwilę.`, 'error', 12000)
      return false
    }
    const undone: Undone = {
      batch,
      deleted: (removal?.deleted ?? []).map(tx).filter((t): t is Transaction => !!t),
      restored: plan.restore.map((t) => tx(t.id)).filter((t): t is Transaction => !!t),
      readded: plan.readd.map((t) => t.id),
      confirmations: plan.confirmations.map((id) => s.records.balances[id]!.record)
    }
    replaceRecords('transactions', plan.restore)
    addRecords('transactions', plan.readd)
    if (plan.confirmations.length) await deleteRecords('balances', plan.confirmations)
    updateSettings((f) => ({ ...f, settings: settingsUndone(f.settings, batch) }))
    const at = new Date().toISOString()
    updateRecord('imports', batch.id, (b) => ({ ...b, undoneAt: at }))
    const note = await unsavedNote()
    const parts = [
      `usunięte operacje: ${undone.deleted.length}`,
      ...(undone.restored.length ? [`wpisy sprzed importu: ${undone.restored.length}`] : []),
      ...(plan.readd.length ? [`odzyskane nierozliczone: ${plan.readd.length}`] : []),
      ...(plan.rulesBack ? [`reguły cofnięte: ${plan.rulesBack}`] : [])
    ]
    if (note) toast(`Import cofnięty – ${note}.`, 'error', 9000)
    else toast(`Import cofnięty: ${parts.join(', ')}.`, 'success', 10000, { label: 'Cofnij', run: () => void redoImport(undone) })
    return true
  } catch (e) {
    toast(errorMessage(e), 'error', 8000)
    return false
  }
}

/** „Cofnij” of taking an import back: the import as it was – the settings only where the undo changed them. */
async function redoImport(u: Undone): Promise<void> {
  const s = useData.getState()
  if (s.status?.readOnly || s.switching || !s.fi) return
  const has = (id: string) => !!s.records.transactions[id]
  addRecords(
    'transactions',
    u.deleted.filter((t) => !has(t.id))
  )
  replaceRecords(
    'transactions',
    u.restored.filter((t) => has(t.id))
  )
  addRecords(
    'balances',
    u.confirmations.filter((b) => !s.records.balances[b.id])
  )
  const again = u.readded.filter(has)
  const removal = again.length ? await deleteRecords('transactions', again) : null
  updateSettings((f) => ({ ...f, settings: settingsRedone(f.settings, u.batch) }))
  updateRecord('imports', u.batch.id, (b) => ({ ...b, undoneAt: null }))
  await flushSaves()
  if (removal?.error) toast(`Import znowu w budżecie, ale części plików nie dało się usunąć: ${removal.error}`, 'error', 8000)
  else toast('Import znowu w budżecie.', 'success')
}
