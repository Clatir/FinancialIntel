/**
 * Reading a bank's file for the import (AP-35, T463): its bytes → the file's rows (mBank's, or another bank's CSV by an
 * account's mapping – AP-43) → the account it goes to → the plan. One function for both ways it runs – in the window's
 * Web Worker (`renderer/features/import/worker.ts`) and, without one, in the window itself: the same plan either way
 * (`tests/unit/import-worker-ap35.test.ts`). Pure: what it reads of the budget comes in `PlanSource` – plain data a
 * message can carry (no functions, no indexes).
 */
import { categoryIndex } from '../calc/operations'
import { plainError } from '../plainError'
import { cashAccountOf, type Account, type Category, type Container, type CsvMapping, type HouseholdMember, type ImportRule, type Loan, type Transaction } from '../schema'
import type { BrandAliases } from './aliases'
import type { ClassifyContext } from './classify'
import { decodeAs, mappingFits, parseMappedCsv } from './csv'
import { accountForNumber, accountNumberOf, MbankFormatError, parseMbank, type MbankFile } from './mbank'
import { planImport, txOfRef, txRef, type DeletedRow, type ImportPlan, type RowCopy, type RowPlan, type TxRef } from './reconcile'
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

/** What is done: reading the file's rows, recognizing them (the plan). */
export type AnalyzePhase = 'read' | 'plan'
export type AnalyzeProgress = (phase: AnalyzePhase, done: number, total: number) => void

/** Read a bank's file and plan its import (T463). A file of neither kind – the wizard (`csv`); a broken one – the reason. */
export function analyzeImport(input: AnalyzeInput, progress?: AnalyzeProgress): Analysis {
  const read = (done: number, total: number) => progress?.('read', done, total)
  const planOf = (file: MbankFile, accountId: string, mapping: CsvMapping | null): Analysis => {
    const plan = planImport(file, accountId, input.source.transactions, contextFor(input.source, file), input.deletedKeys, input.deletedRows, (done, total) => progress?.('plan', done, total))
    return { kind: 'plan', file, accountId, mapping, plan }
  }
  if (input.mapping) return planOf(parseMappedCsv(decodeAs(input.bytes, input.mapping.mapping.encoding), input.mapping.mapping, read), input.mapping.accountId, input.mapping.mapping)
  try {
    const file = parseMbank(decodeText(input.bytes), read)
    return planOf(file, importAccountOf(file, input.chosen, input.source, input.fallback), null)
  } catch (e) {
    if (!(e instanceof MbankFormatError)) return { kind: 'error', message: `Nie udało się odczytać pliku: ${plainError(e instanceof Error ? e.message : String(e))}` }
  }
  const fits = csvAccountsFor(input.bytes, input.source.accounts, input.chosen)[0]
  if (fits) return planOf(parseMappedCsv(decodeAs(input.bytes, fits.mapping.encoding), fits.mapping, read), fits.accountId, fits.mapping)
  return { kind: 'csv' }
}

// ------------------------------------------------------------------ across the Worker's messages (T464)

/** A plan's row with its operations as references (`txRef`). */
type WireRow = Record<string, unknown> & { tx?: TxRef; copy?: Record<string, unknown> & { tx: TxRef } }
export type WirePlan = Omit<ImportPlan, 'rows' | 'vanished'> & { rows: WireRow[]; vanished: TxRef[] }
export type WireAnalysis = Exclude<Analysis, { kind: 'plan' }> | (Omit<Extract<Analysis, { kind: 'plan' }>, 'plan'> & { plan: WirePlan })

/** A plan as a message carries it: its operations as references – the window takes them back from its own store. */
export function planToWire(plan: ImportPlan): WirePlan {
  const rows = plan.rows.map((p): WireRow => {
    if (!('tx' in p)) return p as unknown as WireRow
    const copy = p.status === 'known' && p.copy ? { copy: { ...p.copy, tx: txRef(p.copy.tx) } } : {}
    return { ...(p as unknown as Record<string, unknown>), tx: txRef(p.tx), ...copy }
  })
  return { ...plan, rows, vanished: plan.vanished.map(txRef) }
}

/**
 * The plan of a message with the budget's own operations (`transactions` – the list it was made of): each the same object
 * the plan made here would hold, its views of other sides too (`isSideView`, `realOf`). Throws when one is not there.
 */
export function planFromWire(wire: WirePlan, transactions: readonly Transaction[]): ImportPlan {
  const byId = new Map(transactions.map((t) => [t.id, t]))
  const tx = (ref: TxRef): Transaction => {
    const t = txOfRef(ref, byId)
    if (!t) throw new Error(`plan bez operacji ${ref.id}`)
    return t
  }
  const rows = wire.rows.map((p): RowPlan => {
    if (!p.tx) return p as unknown as RowPlan
    const copy = p.copy ? { copy: { ...(p.copy as unknown as RowCopy), tx: tx(p.copy.tx) } } : {}
    return { ...p, tx: tx(p.tx), ...copy } as unknown as RowPlan
  })
  return { ...wire, rows, vanished: wire.vanished.map(tx) }
}

export const analysisToWire = (a: Analysis): WireAnalysis => (a.kind === 'plan' ? { ...a, plan: planToWire(a.plan) } : a)
export const analysisFromWire = (a: WireAnalysis, transactions: readonly Transaction[]): Analysis => (a.kind === 'plan' ? { ...a, plan: planFromWire(a.plan, transactions) } : a)

export interface AnalyzeRequest {
  id: number
  input: AnalyzeInput
}

export type AnalyzeMessage =
  | { id: number; type: 'progress'; phase: AnalyzePhase; done: number; total: number }
  | { id: number; type: 'done'; analysis: WireAnalysis }
  | { id: number; type: 'fail'; message: string }

/** How often the Worker says how far it is (ms): the bar moves, the window is not flooded with messages. */
export const PROGRESS_MS = 60

/** The Worker's answer to a request (`worker.ts`): its progress, then the analysis – or why it failed. */
export function answer(req: AnalyzeRequest, post: (m: AnalyzeMessage) => void, now: () => number = Date.now): void {
  let last = -Infinity
  const progress: AnalyzeProgress = (phase, done, total) => {
    const t = now()
    if (t - last < PROGRESS_MS) return
    last = t
    post({ id: req.id, type: 'progress', phase, done, total })
  }
  try {
    post({ id: req.id, type: 'done', analysis: analysisToWire(analyzeImport(req.input, progress)) })
  } catch (e) {
    post({ id: req.id, type: 'fail', message: e instanceof Error ? e.message : String(e) })
  }
}
