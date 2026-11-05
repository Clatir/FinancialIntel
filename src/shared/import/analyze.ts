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
import { accountMapping, decodeAs, mappingFits, parseMappedCsv } from './csv'
import { accountForNumber, accountNumberOf, MbankFormatError, parseMbank, type MbankFile, type MbankRow } from './mbank'
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
 * by the first of them (AP-43, T460). Only an account with an import (CSV, or mBank's with a mapping added): one set to
 * „bez importu” reads no files (przegląd R1 7); a mapping this version cannot read is none (`accountMapping`).
 */
export function csvAccountsFor(bytes: Uint8Array, accounts: readonly Account[], chosen: string): Array<{ accountId: string; mapping: CsvMapping }> {
  const out = accounts.flatMap((a) => {
    const mapping = !a.archived && (a.importFormat === 'csv' || a.importFormat === 'mbank') ? accountMapping(a) : null
    return mapping && mappingFits(bytes, mapping) ? [{ accountId: a.id, mapping }] : []
  })
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

/** A plan of a file read already (przegląd R1 15) – in the Worker of its kept file and operations, in the window of its own. */
export interface PlanInput {
  file: MbankFile
  accountId: string
  source: PlanSource
  deletedKeys: ReadonlySet<string>
  deletedRows: readonly DeletedRow[]
}

export const planFor = (input: PlanInput): ImportPlan =>
  planImport(input.file, input.accountId, input.source.transactions, contextFor(input.source, input.file), input.deletedKeys, input.deletedRows)

/**
 * The budget's operations as the Worker gets them again (drugi przegląd R1, 10): their order and only the ones changed
 * since the last message (a record of the store is never changed in place – a changed one is another object).
 */
export interface OperationsDelta {
  ids: string[]
  changed: Transaction[]
}

/**
 * A plan again of the open file in the Worker (przegląd R1 15, drugi przegląd R1 10): the file stays there from its
 * analysis (`session` – that request's id) and its operations from the last message – only what changed comes.
 */
export interface ReplanInput {
  session: number
  accountId: string
  source: Omit<PlanSource, 'transactions'>
  operations: OperationsDelta
  deletedKeys: ReadonlySet<string>
  deletedRows: readonly DeletedRow[]
}

/** The operations the window sends the Worker now: their order and the ones not as `sent` (by object) – `sent` updated. */
export function operationsDelta(transactions: readonly Transaction[], sent: Map<string, Transaction>): OperationsDelta {
  const changed = transactions.filter((t) => sent.get(t.id) !== t)
  sent.clear()
  for (const t of transactions) sent.set(t.id, t)
  return { ids: transactions.map((t) => t.id), changed }
}

// ------------------------------------------------------------------ across the Worker's messages (T464)

/** A plan's row with its operations as references (`txRef`). */
type WireRow = Record<string, unknown> & { tx?: TxRef; copy?: Record<string, unknown> & { tx: TxRef } }
export type WirePlan = Omit<ImportPlan, 'rows' | 'vanished'> & { rows: WireRow[]; vanished: TxRef[] }
export type WireAnalysis = Exclude<Analysis, { kind: 'plan' }> | (Omit<Extract<Analysis, { kind: 'plan' }>, 'plan'> & { plan: WirePlan })

/**
 * A plan as a message carries it: its operations as references – the window takes them back from its own store;
 * `withRows` false – without the file's rows (a plan again: the window has them – `planFromWire`'s `rows`).
 */
export function planToWire(plan: ImportPlan, withRows = true): WirePlan {
  const rows = plan.rows.map((p): WireRow => {
    const { row: _row, ...rest } = p
    const own = (withRows ? p : rest) as unknown as Record<string, unknown>
    if (!('tx' in p)) return own as WireRow
    const copy = p.status === 'known' && p.copy ? { copy: { ...p.copy, tx: txRef(p.copy.tx) } } : {}
    return { ...own, tx: txRef(p.tx), ...copy }
  })
  return { ...plan, rows, vanished: plan.vanished.map(txRef) }
}

/**
 * The plan of a message with the budget's own operations (`transactions` – the list it was made of): each the same object
 * the plan made here would hold, its views of other sides too (`isSideView`, `realOf`); `rows` – the window's own rows of
 * the file (a plan again – one per row, in the file's order). Throws when one is not there.
 */
export function planFromWire(wire: WirePlan, transactions: readonly Transaction[], rows?: readonly MbankRow[]): ImportPlan {
  if (rows && rows.length !== wire.rows.length) throw new Error('plan nie z tego pliku')
  const byId = new Map(transactions.map((t) => [t.id, t]))
  const tx = (ref: TxRef): Transaction => {
    const t = txOfRef(ref, byId)
    if (!t) throw new Error(`plan bez operacji ${ref.id}`)
    return t
  }
  const planned = wire.rows.map((w, i): RowPlan => {
    const p = rows ? { ...w, row: rows[i] } : w
    if (!w.tx) return p as unknown as RowPlan
    const copy = w.copy ? { copy: { ...(w.copy as unknown as RowCopy), tx: tx(w.copy.tx) } } : {}
    return { ...p, tx: tx(w.tx), ...copy } as unknown as RowPlan
  })
  return { ...wire, rows: planned, vanished: wire.vanished.map(tx) }
}

export const analysisToWire = (a: Analysis): WireAnalysis => (a.kind === 'plan' ? { ...a, plan: planToWire(a.plan) } : a)
export const analysisFromWire = (a: WireAnalysis, transactions: readonly Transaction[]): Analysis => (a.kind === 'plan' ? { ...a, plan: planFromWire(a.plan, transactions) } : a)

/** A file to analyze, or the open file (kept in the Worker) to plan again. */
export type AnalyzeRequest = { id: number; input: AnalyzeInput } | { id: number; replan: ReplanInput }

export type AnalyzeMessage =
  | { id: number; type: 'progress'; phase: AnalyzePhase; done: number; total: number }
  | { id: number; type: 'done'; analysis: WireAnalysis }
  | { id: number; type: 'planned'; plan: WirePlan }
  | { id: number; type: 'fail'; message: string }

/** How often the Worker says how far it is (ms): the bar moves, the window is not flooded with messages. */
export const PROGRESS_MS = 60

export type Answer = (req: AnalyzeRequest, post: (m: AnalyzeMessage) => void, now?: () => number) => void

/**
 * A Worker's answers (`worker.ts`): of a file – its progress, then the analysis; of a plan again – the plan of the file and
 * the operations it keeps (the last file analyzed, by its request's id), or why it failed (another session – the window
 * plans it). One per Worker: what it keeps is its own.
 */
export function answerer(): Answer {
  let kept: { session: number; file: MbankFile; operations: Map<string, Transaction> } | null = null
  return (req, post, now = Date.now) => {
    const fail = (e: unknown) => post({ id: req.id, type: 'fail', message: e instanceof Error ? e.message : String(e) })
    if ('replan' in req) {
      try {
        const r = req.replan
        if (!kept || kept.session !== r.session) throw new Error('Worker nie ma tego pliku')
        for (const t of r.operations.changed) kept.operations.set(t.id, t)
        const transactions: Transaction[] = []
        for (const id of r.operations.ids) {
          const t = kept.operations.get(id)
          if (!t) throw new Error(`Worker nie ma operacji ${id}`)
          transactions.push(t)
        }
        // The ones gone from the budget forgotten too.
        kept.operations = new Map(transactions.map((t) => [t.id, t]))
        const plan = planFor({ file: kept.file, accountId: r.accountId, source: { ...r.source, transactions }, deletedKeys: r.deletedKeys, deletedRows: r.deletedRows })
        post({ id: req.id, type: 'planned', plan: planToWire(plan, false) })
      } catch (e) {
        fail(e)
      }
      return
    }
    let last = -Infinity
    const progress: AnalyzeProgress = (phase, done, total) => {
      const t = now()
      if (t - last < PROGRESS_MS) return
      last = t
      post({ id: req.id, type: 'progress', phase, done, total })
    }
    try {
      const analysis = analyzeImport(req.input, progress)
      kept = analysis.kind === 'plan' ? { session: req.id, file: analysis.file, operations: new Map(req.input.source.transactions.map((t) => [t.id, t])) } : kept
      post({ id: req.id, type: 'done', analysis: analysisToWire(analysis) })
    } catch (e) {
      fail(e)
    }
  }
}

/** The answers of one Worker (`worker.ts`; the tests make their own – `answerer`). */
export const answer: Answer = answerer()
