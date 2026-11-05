/**
 * Reading a bank's file for the import (AP-43, T460): its bytes → the file's rows (mBank's, or another bank's CSV by an
 * account's mapping) → the account it goes to → the plan. Pure: what it reads of the budget comes in `PlanSource` –
 * plain data (no functions, no indexes).
 */
import { categoryIndex } from '../calc/operations'
import { plainError } from '../plainError'
import { cashAccountOf, type Account, type Category, type Container, type CsvMapping, type HouseholdMember, type ImportRule, type Loan, type Transaction } from '../schema'
import type { BrandAliases } from './aliases'
import type { ClassifyContext } from './classify'
import { decodeAs, mappingFits, parseMappedCsv } from './csv'
import { accountForNumber, accountNumberOf, MbankFormatError, parseMbank, type MbankFile } from './mbank'
import { planImport, type DeletedRow, type ImportPlan } from './reconcile'
import { decodeText } from './text'

/** What a plan reads of the budget (as the store keeps it; lists of records, the settings' parts). */
export interface PlanSource {
  transactions: readonly Transaction[]
  containers: readonly Container[]
  loans: readonly Loan[]
  accounts: readonly Account[]
  categories: readonly Category[]
  rules: readonly ImportRule[]
  aliases: BrandAliases
  members: readonly HouseholdMember[]
  /** The holder's names of the settings (the file's `#Klient` is added – `ownNamesWith`). */
  ownNames: readonly string[]
  accountNumbers: Readonly<Record<string, string>>
  /** Operations a newer version wrote (B95). */
  locked: ReadonlySet<string>
  /** Docked operations (AF-9). */
  docked: ReadonlySet<string>
}

/** The account holder's names: the settings' and the file's `#Klient`. */
export const ownNamesWith = (names: readonly string[], file: MbankFile | null): string[] => [...names, ...(file?.client ? [file.client] : [])]

/** The classification's context of a plan of `file` (`planImport`). */
export function contextFor(source: PlanSource, file: MbankFile): ClassifyContext {
  return {
    rules: source.rules,
    ownNames: ownNamesWith(source.ownNames, file),
    categories: categoryIndex(source.categories),
    containers: source.containers,
    aliases: source.aliases,
    members: source.members,
    loans: source.loans,
    accountNumbers: source.accountNumbers,
    // The cash kept on its account (D100 (1), AP-33): an ATM withdrawal is an own transfer onto it.
    cash: cashAccountOf(source.accounts),
    locked: source.locked,
    docked: source.docked
  }
}

/**
 * The account an mBank file goes to (AP-2): the one its bank account's number was imported to (`accountForNumber`), else
 * the one chosen before, else the one with the mBank import (the first), else `fallback` (mBank).
 */
export function importAccountOf(file: MbankFile, chosen: string, source: Pick<PlanSource, 'accounts' | 'accountNumbers'>, fallback: string): string {
  return (
    accountForNumber(source.accounts, source.accountNumbers, accountNumberOf(file.account), chosen) ||
    chosen ||
    (source.accounts.find((a) => !a.archived && a.importFormat === 'mbank')?.id ?? fallback)
  )
}

/**
 * The accounts whose mapping a file of another bank fits (`mappingFits`), the one chosen before first – the file is read
 * by the first of them (AP-43, T460).
 */
export function csvAccountsFor(bytes: Uint8Array, accounts: readonly Account[], chosen: string): Array<{ accountId: string; mapping: CsvMapping }> {
  const out = accounts.flatMap((a) => (!a.archived && a.csvMapping && mappingFits(bytes, a.csvMapping) ? [{ accountId: a.id, mapping: a.csvMapping }] : []))
  return out.sort((a, b) => Number(b.accountId === chosen) - Number(a.accountId === chosen))
}

export interface AnalyzeInput {
  bytes: Uint8Array
  /** The account chosen before ('' – none). */
  chosen: string
  /** The account mBank's file goes to when nothing tells another (`MBANK_ACCOUNT_ID`). */
  fallback: string
  /** Read by this mapping onto this account (the wizard's „Zapisz i wczytaj”); none – mBank's file, else an account's mapping. */
  mapping?: { accountId: string; mapping: CsvMapping } | null
  source: PlanSource
  deletedKeys: ReadonlySet<string>
  deletedRows: readonly DeletedRow[]
}

export type Analysis =
  | { kind: 'plan'; file: MbankFile; accountId: string; mapping: CsvMapping | null; plan: ImportPlan }
  /** Not mBank's and no account's mapping fits: the wizard asks for the columns (`guessCsv`). */
  | { kind: 'csv' }
  | { kind: 'error'; message: string }

/** Read a bank's file and plan its import (T463). A file of neither kind – the wizard (`csv`); a broken one – the reason. */
export function analyzeImport(input: AnalyzeInput): Analysis {
  const planOf = (file: MbankFile, accountId: string, mapping: CsvMapping | null): Analysis => {
    const plan = planImport(file, accountId, input.source.transactions, contextFor(input.source, file), input.deletedKeys, input.deletedRows)
    return { kind: 'plan', file, accountId, mapping, plan }
  }
  if (input.mapping) return planOf(parseMappedCsv(decodeAs(input.bytes, input.mapping.mapping.encoding), input.mapping.mapping), input.mapping.accountId, input.mapping.mapping)
  try {
    const file = parseMbank(decodeText(input.bytes))
    return planOf(file, importAccountOf(file, input.chosen, input.source, input.fallback), null)
  } catch (e) {
    if (!(e instanceof MbankFormatError)) return { kind: 'error', message: `Nie udało się odczytać pliku: ${plainError(e instanceof Error ? e.message : String(e))}` }
  }
  const fits = csvAccountsFor(input.bytes, input.source.accounts, input.chosen)[0]
  if (fits) return planOf(parseMappedCsv(decodeAs(input.bytes, fits.mapping.encoding), fits.mapping), fits.accountId, fits.mapping)
  return { kind: 'csv' }
}
