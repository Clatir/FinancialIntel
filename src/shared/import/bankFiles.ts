/**
 * The files of mBank found in the downloads (1.9.0, F14): which of them are new – not imported yet – and how they are
 * announced. Pure; the main process finds them (`src/main/bankFiles.ts`), the window announces them and opens one in
 * Import with one click.
 */
import type { BankFile } from '../api'
import type { ImportBatch } from '../schema/records'
import { dm } from '../format'

export interface BankFilesContext {
  /** The imports done (`imports/`): a file of the same name and period imported (not taken back) is done. */
  batches: readonly Pick<ImportBatch, 'fileName' | 'period' | 'undoneAt' | 'accountId'>[]
  /** The bank's account number of each account (`settings.import.accountNumbers`): the file's account. */
  accountNumbers: Readonly<Record<string, string>>
  /** The last day the files imported to each account cover, and the last import's time (`settings.import`). */
  coveredTo: Readonly<Record<string, string>>
  lastImport: Readonly<Record<string, string>>
  /** The account of a file whose number is not known (the mBank account). */
  fallbackAccount: string
}

/** The account a file is of: by its number, else the mBank account. */
export function accountOfFile(f: Pick<BankFile, 'account'>, o: Pick<BankFilesContext, 'accountNumbers' | 'fallbackAccount'>): string {
  const digits = (s: string) => s.replace(/\D/g, '')
  const number = f.account ? digits(f.account) : ''
  const found = number ? Object.entries(o.accountNumbers).find(([, n]) => digits(n) === number)?.[0] : undefined
  return found ?? o.fallbackAccount
}

/**
 * The files not imported yet, the newest first: a file is done when an import of its name and period stands, or when
 * its account's imports cover its period already and the last of them came after the file was saved (a file downloaded
 * again, imported from elsewhere).
 */
export function newBankFiles(files: readonly BankFile[], o: BankFilesContext): BankFile[] {
  const samePeriod = (a: BankFile['period'], b: ImportBatch['period']) => (a?.from ?? null) === (b?.from ?? null) && (a?.to ?? null) === (b?.to ?? null)
  return files
    .filter((f) => {
      if (o.batches.some((b) => !b.undoneAt && b.fileName === f.name && samePeriod(f.period, b.period))) return false
      const account = accountOfFile(f, o)
      const covered = o.coveredTo[account]
      const last = o.lastImport[account]
      return !(f.period && covered && f.period.to <= covered && last && Date.parse(last) >= f.mtime)
    })
    .sort((a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name))
}


/** „12.10–18.10” – the period a file covers; '' without one. */
export function filePeriodText(f: Pick<BankFile, 'period'>): string {
  return f.period ? `${dm(f.period.from)}–${dm(f.period.to)}` : ''
}

/** „Nowy meldunek z mBanku (12.10–18.10): lista_operacji.csv w folderze Pobrane.” */
export function bankFileText(f: Pick<BankFile, 'name' | 'where' | 'period'>): string {
  const period = filePeriodText(f)
  return `Nowy meldunek z mBanku${period ? ` (${period})` : ''}: ${f.name} w folderze ${f.where}`
}

/** How the file of the import is taken in mBank (F14 – the reminder of an import overdue says it). */
export const MBANK_EXPORT_HINT = 'w mBanku: Historia → lista operacji → „Eksportuj” CSV'
