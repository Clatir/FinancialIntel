/**
 * The files of mBank found in the downloads (1.9.0, F14): the main process watches Pobrane and the import's last folder,
 * the window keeps the list – the new ones (not imported yet) are announced and open in Import with one click.
 */
import { useMemo } from 'react'
import { create } from 'zustand'
import type { BankFile } from '@shared/api'
import { newBankFiles } from '@shared/import/bankFiles'
import { MBANK_ACCOUNT_ID } from '@shared/schema'
import { api, errorMessage } from '../lib/api'
import { listOf, useData } from './data'
import { navigate, toast } from './ui'

export const useBankFiles = create<{ files: BankFile[] }>(() => ({ files: [] }))

let started = false

export function initBankFiles(): void {
  if (started) return
  started = true
  api.onBankFiles((files) => useBankFiles.setState({ files }))
  void api.bankFiles().then(
    (files) => useBankFiles.setState({ files }),
    () => undefined
  )
}

const NONE: BankFile[] = []

type Data = ReturnType<typeof useData.getState>

/** The files not imported yet, the newest first (`newBankFiles`). */
function newOf(files: readonly BankFile[], fi: Data['fi'], imports: Data['records']['imports']): BankFile[] {
  const imp = fi?.settings.import
  if (!files.length || !imp) return NONE
  return newBankFiles(files, {
    batches: listOf(imports),
    accountNumbers: imp.accountNumbers,
    coveredTo: imp.coveredTo,
    lastImport: imp.lastImport,
    fallbackAccount: fi.settings.accounts.find((a) => a.importFormat === 'mbank' && !a.archived)?.id ?? MBANK_ACCOUNT_ID
  })
}

export function useNewBankFiles(): BankFile[] {
  const files = useBankFiles((s) => s.files)
  const fi = useData((s) => s.fi)
  const imports = useData((s) => s.records.imports)
  return useMemo(() => newOf(files, fi, imports), [files, fi, imports])
}

/** The same outside React (the notifier). */
export function newBankFilesNow(): BankFile[] {
  const s = useData.getState()
  return newOf(useBankFiles.getState().files, s.fi, s.records.imports)
}

/**
 * „Importuj” (F14): the file opened in Import – its id goes with the session, so the import's end may offer moving it
 * to the Recycle Bin.
 */
export async function openBankFile(id: string): Promise<void> {
  navigate({ page: 'import' })
  try {
    const { loadImportFile, useImport } = await import('../features/import/state')
    // An import being written (B93): its file stays until it is done – from a notification or the briefing too.
    if (useImport.getState().busy) return void toast('Trwa import – poczekaj, aż się skończy.', 'info', 4000)
    const file = await api.readBankFile(id)
    if (!file) return void toast('Tego pliku już nie ma w folderze – może został przeniesiony albo usunięty.', 'error', 6000)
    if (useImport.getState().busy) return void toast('Trwa import – poczekaj, aż się skończy.', 'info', 4000)
    await loadImportFile(file.name, file.bytes, id)
  } catch (e) {
    toast(`Nie udało się otworzyć pliku: ${errorMessage(e)}`, 'error', 7000)
  }
}
