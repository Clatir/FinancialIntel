/**
 * The bank's operations the user deleted (T39), read from the deleted versions of the history
 * (`api.historyDeleted('transactions')`) – for the import and for the inbox:
 * - the keys of their rows (`bank.key` and the other format's `altKeys` – AF-1): a row of one of them stays out;
 * - the rows matched without a key (`DeletedRow`): the pending ones (B96) and the booked ones with the format of the file
 *   they came from (AF-1: the other format describes the row in other words – another key);
 * - the operations that came back before 1.15.5 (AF-1): the row of a deleted one imported again from the other format,
 *   as a new operation – reported to the user (`returnedOf`), never removed by itself.
 */
import { addDays } from '../calc/dates'
import type { BankRow, Transaction } from '../schema/records'
import { formatOfBanks, MATCH_DAYS, similarCounterparty, type DeletedRow, type FormatBank } from './reconcile'

/** A deleted version of the history (`HistoryEntry` with its record). */
export interface DeletedVersion {
  id: string
  savedAt: string
  reason?: string
  /** Deleted by the import itself (T334): a pending row the bank dropped, a copy on another account (AF-9). */
  byImport?: boolean
  record: unknown
}

type Row = { key?: unknown; altKeys?: unknown; pending?: unknown; counterparty?: unknown; description?: unknown; operation?: unknown; importedAt?: unknown; source?: unknown }
type Deleted = { accountId?: unknown; date?: unknown; amount?: unknown; bank?: Row | null; counterAccountId?: unknown; counterDate?: unknown; counterBank?: Row | null }

const text = (x: unknown): string => (typeof x === 'string' ? x : '')

/** A deleted row as it votes for the format of its import. */
const formatBank = (b: Row): FormatBank => ({
  source: b.source === 'lista' || b.source === 'historia' ? b.source : undefined,
  operation: text(b.operation),
  description: text(b.description),
  importedAt: text(b.importedAt)
})

/**
 * The deleted operations of the bank: not the ones taken back with their import (F4 – `reason` 'undo'). The ones an
 * import removed (pending ones gone from the bank, copies on another account – AF-9) – no deletion of the user's, only
 * their keys stay out: marked so in the history (`byImport`, from 1.15.5 – T334) or, removed before, in `byImport` (the
 * ids its batches keep – the last ten). A transfer in one operation (F10): the other account's row is the user's
 * deletion too – on that account's day.
 */
export function deletedBankRows(deleted: readonly DeletedVersion[], existing: readonly Transaction[], byImport: ReadonlySet<string>): { keys: Set<string>; rows: DeletedRow[] } {
  const keys = new Set<string>()
  const sides: Array<{ bank: Row; accountId: string; date: string; amount: number; deletedAt: string }> = []
  for (const d of deleted) {
    if (d.reason === 'undo') continue
    const r = d.record as Deleted | null
    if (!r || typeof r !== 'object') continue
    const list: Array<[Row | null | undefined, unknown, unknown, unknown]> = [[r.bank, r.accountId, r.date, r.amount]]
    if (r.counterBank) list.push([r.counterBank, r.counterAccountId, r.counterDate ?? r.date, typeof r.amount === 'number' ? -r.amount : null])
    for (const [bank, accountId, date, amount] of list) {
      if (!bank || typeof bank.key !== 'string') continue
      keys.add(bank.key)
      // Its row's key in the other format too (B5): a file of that format brings the same row (AF-1).
      if (Array.isArray(bank.altKeys)) for (const k of bank.altKeys) if (typeof k === 'string' && k) keys.add(k)
      if (d.byImport === true || byImport.has(d.id) || typeof accountId !== 'string' || typeof date !== 'string' || typeof amount !== 'number') continue
      sides.push({ bank, accountId, date, amount, deletedAt: d.savedAt })
    }
  }
  if (!sides.length) return { keys, rows: [] }
  // The format of an import before 1.4.2 told by all its rows – the ones still in the budget and the deleted ones.
  const formatOf = formatOfBanks([...existing.flatMap((t) => [t.bank, t.counterBank]), ...sides.map((s) => formatBank(s.bank))])
  const rows = sides.map(({ bank, accountId, date, amount, deletedAt }): DeletedRow => {
    const row = { accountId, date, amount, name: text(bank.counterparty) || text(bank.description), deletedAt }
    return bank.pending === true ? row : { ...row, format: formatOf(formatBank(bank)) }
  })
  return { keys, rows }
}

/** An operation of the bank that came back after the user deleted it (AF-1): the deleted one it is the row of. */
export interface Returned {
  tx: Transaction
  deleted: DeletedRow
}

/** The key of „zostaw” for an operation that came back (`settings.import.notDuplicates`). */
export const returnedKey = (id: string): string => `back:${id}`

/**
 * An operation the import made from its bank's row, as it is still (T333): booked, created with that row and never given
 * another one – not a hand-typed one joined with its row (the import's „połącz”, the duplicates panel), not a pending one
 * a later file settled (both rewrite `bank` with that file's `importedAt` and format). Only such an operation can be
 * a deleted one's row come back; the others are the user's operations.
 */
export const madeByItsImport = (t: Transaction): boolean => !!t.bank && !t.bank.pending && t.createdAt === t.bank.importedAt

/**
 * Operations of the bank that came back after the user deleted them (AF-1, before 1.15.5): an operation the import made
 * from its row (`madeByItsImport`, T333) of the other format than a deleted one, the same account and amount, ±3 days,
 * a similar name, imported after the deletion by an import whose days (its operations' first and last day) hold the
 * deleted one's. The closest first, each once; `dismissed` – „zostaw” (`returnedKey`) and the rows brought back on purpose
 * („importuj mimo to”). Counted at every change of the operations (the inbox, T335): only the operations of a deleted
 * one's amount are looked at, the days and the format only of their imports.
 */
export function returnedOf(txs: readonly Transaction[], rows: readonly DeletedRow[], dismissed: Readonly<Record<string, unknown>> = {}): Returned[] {
  const gone = rows.filter((d) => d.format)
  if (!gone.length) return []
  const amounts = new Set(gone.map((d) => d.amount))
  const near = (accountId: string, date: string, amount: number) => `${accountId}|${date}|${amount}`
  const wanted = new Set<string>()
  for (const d of gone) for (let i = -MATCH_DAYS; i <= MATCH_DAYS; i++) wanted.add(near(d.accountId, addDays(d.date, i), d.amount))
  const found = new Map<string, Transaction[]>()
  for (const t of txs) {
    if (!amounts.has(t.amount) || !madeByItsImport(t) || dismissed[returnedKey(t.id)]) continue
    const at = near(t.accountId, t.date, t.amount)
    if (!wanted.has(at)) continue
    const list = found.get(at)
    if (list) list.push(t)
    else found.set(at, [t])
  }
  if (!found.size) return []
  // The imports the candidates came with: their days (on the account) and their rows' format (B5 – all their rows vote).
  const imports = new Set<string>()
  for (const list of found.values()) for (const t of list) imports.add(t.bank!.importedAt)
  const spans = new Map<string, { from: string; to: string }>()
  const banks: BankRow[] = []
  for (const t of txs) {
    if (!t.bank || !imports.has(t.bank.importedAt)) continue
    banks.push(t.bank)
    const k = `${t.accountId}|${t.bank.importedAt}`
    const span = spans.get(k)
    if (!span) spans.set(k, { from: t.date, to: t.date })
    else if (t.date < span.from) span.from = t.date
    else if (t.date > span.to) span.to = t.date
  }
  const formatOf = formatOfBanks(banks)
  const pairs: Array<{ tx: Transaction; at: number; days: number }> = []
  gone.forEach((d, at) => {
    for (let i = -MATCH_DAYS; i <= MATCH_DAYS; i++)
      for (const t of found.get(near(d.accountId, addDays(d.date, i), d.amount)) ?? []) {
        if (t.bank!.importedAt <= d.deletedAt || formatOf(t.bank) === d.format) continue
        const span = spans.get(`${t.accountId}|${t.bank!.importedAt}`)
        if (!span || d.date < span.from || d.date > span.to) continue
        if (similarCounterparty(t.bank!.counterparty || t.bank!.description, d.name)) pairs.push({ tx: t, at, days: Math.abs(i) })
      }
  })
  pairs.sort((a, b) => a.days - b.days || a.tx.date.localeCompare(b.tx.date) || a.tx.id.localeCompare(b.tx.id) || a.at - b.at)
  const out: Returned[] = []
  const txTaken = new Set<string>()
  const goneTaken = new Set<number>()
  for (const c of pairs) {
    if (txTaken.has(c.tx.id) || goneTaken.has(c.at)) continue
    txTaken.add(c.tx.id)
    goneTaken.add(c.at)
    out.push({ tx: c.tx, deleted: gone[c.at]! })
  }
  return out.sort((a, b) => a.tx.date.localeCompare(b.tx.date) || a.tx.id.localeCompare(b.tx.id))
}
