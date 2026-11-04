/**
 * The bank's operations the user deleted, as the import and the inbox know them (`shared/import/deleted.ts`): read from
 * the history with every file of the import, on the inbox's screen and a while after a folder opens. The operations
 * that came back after their deletion before 1.15.5 (AF-1) are the inbox's reports: „Usuń” (with „Cofnij”) or
 * „zostaw” – never removed by themselves.
 */
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { deletedBankRows, returnedKey, returnedOf, type Returned } from '@shared/import/deleted'
import type { DeletedRow } from '@shared/import/reconcile'
import type { Transaction } from '@shared/schema'
import { api } from '../../lib/api'
import { listOf, updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'
import { deleteOperation } from '../operations/state'

export interface DeletedBank {
  /** The keys of their rows (`bank.key`, `altKeys`): the rows stay out of an import. */
  keys: ReadonlySet<string>
  /** The ones matched without a key – pending (B96), booked of a format (AF-1). */
  rows: readonly DeletedRow[]
}

/** The deleted operations of the bank last read, and the folder they are of. */
export const useDeletedBank = create<(DeletedBank & { dir: string | null }) | null>(() => null)

const NONE: DeletedBank = { keys: new Set(), rows: [] }

/** The deleted operations of the bank of the folder open now, read from its history (none when it cannot be read). */
export async function readDeletedBank(): Promise<DeletedBank> {
  const dir = useData.getState().status?.dataDir ?? null
  try {
    const deleted = await api.historyDeleted('transactions')
    const s = useData.getState()
    // Removed by an import (its batch keeps them – F4): pending ones gone from the bank, copies on another account (AF-9).
    const byImport = new Set(listOf(s.records.imports).flatMap((b) => b.removed.map((t) => t.id)))
    const out = deletedBankRows(deleted, listOf(s.records.transactions), byImport)
    if ((s.status?.dataDir ?? null) === dir) useDeletedBank.setState({ ...out, dir }, true)
    return out
  } catch {
    return NONE
  }
}

/** One computation for every hook (the side menu's counter, the inbox): the last inputs and result. */
let last: { inputs: readonly unknown[]; out: Returned[] } | null = null
const NO_DISMISSED: Readonly<Record<string, unknown>> = {}

/**
 * The operations that came back after their deletion (AF-1): the deleted ones read a while after the folder opens
 * (`firstAfterMs`; at once on the inbox's screen – `readDeletedBank`), against the operations now.
 */
export function useReturned(firstAfterMs = 10_000): Returned[] {
  const known = useDeletedBank()
  const dir = useData((s) => s.status?.dataDir ?? null)
  const transactions = useData((s) => s.records.transactions)
  const dismissed = useData((s) => s.fi?.settings.import.notDuplicates) ?? NO_DISMISSED
  const fresh = !!known && known.dir === dir
  useEffect(() => {
    if (fresh || !dir) return
    const t = setTimeout(() => void readDeletedBank(), firstAfterMs)
    return () => clearTimeout(t)
  }, [fresh, dir, firstAfterMs])
  return useMemo(() => {
    if (!fresh || !known.rows.length) return []
    const inputs = [transactions, known.rows, dismissed] as const
    if (last && last.inputs.every((x, i) => x === inputs[i])) return last.out
    const out = returnedOf(listOf(transactions), known.rows, dismissed)
    last = { inputs, out }
    return out
  }, [fresh, known, transactions, dismissed])
}

/** „zostaw”: the operation stays – never reported again (with „Cofnij”). */
export function keepReturned(id: string): void {
  const key = returnedKey(id)
  const set = (on: boolean) =>
    updateSettings((f) => {
      const notDuplicates = { ...f.settings.import.notDuplicates }
      if (on) notDuplicates[key] = new Date().toISOString()
      else delete notDuplicates[key]
      return { ...f, settings: { ...f.settings, import: { ...f.settings.import, notDuplicates } } }
    })
  set(true)
  toast('Operacja zostaje – nie będzie zgłaszana.', 'info', 7000, { label: 'Cofnij', run: () => set(false) })
}

/** „Usuń”: the operation deleted again, as in Operacje (its dockings with it, „Cofnij” in the toast). */
export async function removeReturned(id: string): Promise<void> {
  const t: Transaction | undefined = useData.getState().records.transactions[id]?.record
  if (t) await deleteOperation(t, t.counterparty || t.title || 'operacja z banku')
}
