/**
 * The bank's operations the user deleted, as the import and the inbox know them (`shared/import/deleted.ts`): read from
 * the history with every file of the import, on the inbox's screen and – when there may be something to report (T332) –
 * a while after a folder opens. The operations that came back after their deletion before 1.15.5 (AF-1) are the inbox's
 * reports: „Usuń” (with „Cofnij”) or „zostaw” – never removed by themselves.
 */
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { deletedBankRows, madeByItsImport, returnedKey, returnedOf, type Returned } from '@shared/import/deleted'
import type { DeletedRow } from '@shared/import/reconcile'
import type { SettingsFile, Transaction } from '@shared/schema'
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

/** One computation for every hook (the side menu's counter, the inbox): the last inputs and result. */
let last: { inputs: readonly unknown[]; out: Returned[] } | null = null
const NO_DISMISSED: Readonly<Record<string, unknown>> = {}

/** The newest import of the folder (any account, any computer – `settings.import.lastImport`); '' – none yet. */
const newestImport = (fi: SettingsFile | null | undefined): string => Object.values(fi?.settings.import.lastImport ?? {}).reduce((m, at) => (at > m ? at : m), '')

/** This computer's last check of a folder (T332): the newest import then, when nothing was to report. */
const CHECKED = 'fi.returned.checked:'

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** The folder checked with the imports up to `through`; null – a report waits, or the history was not read. */
function remember(dir: string, through: string | null): void {
  try {
    if (through == null) storage()?.removeItem(CHECKED + dir)
    else storage()?.setItem(CHECKED + dir, through)
  } catch {
    // No storage of the computer: read at every opening, as before.
  }
}

function checkedThrough(dir: string): string | null {
  try {
    return storage()?.getItem(CHECKED + dir) ?? null
  } catch {
    return null
  }
}

/**
 * Whether the deleted operations are read a while after the folder opens (T332): an operation comes back only with an
 * import after its deletion – not read when this computer's last check found nothing to report and no import of the
 * folder (`latest` – the newest one, another computer's too) came since.
 */
export function deletedReadDue(dir: string, latest: string): boolean {
  const seen = checkedThrough(dir)
  return seen == null || latest > seen
}

/** The deleted operations of the bank of the folder open now, read from its history (none when it cannot be read). */
export async function readDeletedBank(): Promise<DeletedBank> {
  const before = useData.getState()
  const dir = before.status?.dataDir ?? null
  const through = newestImport(before.fi)
  try {
    const deleted = await api.historyDeleted('transactions')
    const s = useData.getState()
    // Removed by an import before 1.15.5 (its batch keeps them – F4; the later ones are marked in the history – T331).
    const byImport = new Set(listOf(s.records.imports).flatMap((b) => b.removed.map((t) => t.id)))
    const transactions = listOf(s.records.transactions)
    const out = deletedBankRows(deleted, transactions, byImport)
    if (dir && (s.status?.dataDir ?? null) === dir) {
      useDeletedBank.setState({ ...out, dir }, true)
      // Counted here once for the hooks too (their inputs): nothing to report – the folder checked (T332).
      const dismissed = s.fi?.settings.import.notDuplicates ?? NO_DISMISSED
      const back = out.rows.length ? returnedOf(transactions, out.rows, dismissed) : []
      last = { inputs: [s.records.transactions, out.rows, dismissed], out: back }
      remember(dir, back.length ? null : through)
    }
    return out
  } catch {
    if (dir) remember(dir, null)
    return NONE
  }
}

/**
 * An import of this computer done with the deleted ones just read (`runImport`, T332): nothing came back with it – a
 * check that found nothing to report holds through its time.
 */
export function checkedWithImport(at: string): void {
  const dir = useData.getState().status?.dataDir ?? null
  if (dir && checkedThrough(dir) != null) remember(dir, at)
}

/**
 * The operations that came back after their deletion (AF-1): the deleted ones read a while after the folder opens when
 * there may be some (`firstAfterMs`, `deletedReadDue`; at once on the inbox's screen and with an import –
 * `readDeletedBank`), against the operations now.
 */
export function useReturned(firstAfterMs = 10_000): Returned[] {
  const known = useDeletedBank()
  const dir = useData((s) => s.status?.dataDir ?? null)
  const transactions = useData((s) => s.records.transactions)
  const dismissed = useData((s) => s.fi?.settings.import.notDuplicates) ?? NO_DISMISSED
  const latest = useData((s) => newestImport(s.fi))
  const fresh = !!known && known.dir === dir
  useEffect(() => {
    if (fresh || !dir || !deletedReadDue(dir, latest)) return
    const t = setTimeout(() => void readDeletedBank(), firstAfterMs)
    return () => clearTimeout(t)
  }, [fresh, dir, latest, firstAfterMs])
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
  // Refused (the folder read only – the store says so): nothing kept, nothing to take back.
  if (!set(true)) return
  toast('Operacja zostaje – nie będzie zgłaszana.', 'info', 7000, { label: 'Cofnij', run: () => set(false) })
}

/**
 * „Usuń”: the operation deleted again, as in Operacje (its dockings with it, „Cofnij” in the toast) – only one the import
 * made from its row (T330): one joined or settled since is the user's operation and stays.
 */
export async function removeReturned(id: string): Promise<void> {
  const t: Transaction | undefined = useData.getState().records.transactions[id]?.record
  if (!t) return
  if (!madeByItsImport(t)) {
    toast('Ta operacja ma już inny wiersz z banku (połączona albo rozliczona) – zostaje.', 'info', 7000)
    return
  }
  await deleteOperation(t, t.counterparty || t.title || 'operacja z banku')
}
