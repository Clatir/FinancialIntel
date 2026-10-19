/**
 * Imports of the bank's files as batches (1.5.1, F4 „Cofnij import”, T166): what an import wrote, kept as one record
 * (`imports/`), and taking it back – pure, so the screen only applies what it says.
 *
 * Taking an import back:
 * - only the latest one that stands (a stack: a later import may have settled or merged what an earlier one created);
 * - the operations it created are deleted – those changed since too (their number is said before; „Cofnij” brings them
 *   back) – as the undo's deletion (history 'undo'), not the user's: the next import brings their rows (T39);
 * - the operations it changed get their versions before it, with what changed since kept (three-way: the base is the
 *   version the import wrote, the user's later change wins);
 * - the operations it deleted come back (unless they are there again);
 * - its rules: a new one goes, a changed one is as before – a rule changed since stays as it is;
 * - the settings it set (the account's last import, the day its files cover, the account's number, the members' inflows,
 *   the holder's name) go back each only while still as it set them; its entry of the log goes.
 */
import { deepEqual, merge3 } from '../merge'
export { accountNumberOf, accountNumberText } from './mbank'
import {
  SCHEMA_VERSION,
  importBatchSchema,
  importRuleSchema,
  transactionSchema,
  type ImportBatch,
  type ImportBatchSettings,
  type ImportRule,
  type Settings,
  type Transaction
} from '../schema'

/** The batches kept: the last ten imports. */
export const KEEP_IMPORTS = 10

export interface BatchFacts {
  id: string
  /** The import's time (`bank.importedAt` of its operations). */
  at: string
  /** When its records were written (after it): an operation changed later is the user's work. */
  savedAt: string
  machine: string | null
  accountId: string
  fileName: string
  period: { from: string; to: string } | null
  counts: Record<string, number>
  created: readonly Transaction[]
  updated: ReadonlyArray<{ before: Transaction; after: Transaction }>
  removed: readonly Transaction[]
  rulesBefore: readonly ImportRule[]
  rulesAfter: readonly ImportRule[]
  before: ImportBatchSettings
  after: ImportBatchSettings
  ownName: string | null
  /** Balances confirmed by the file (F5). */
  confirmations?: readonly string[]
}

const parseRule = (r: unknown): ImportRule | null => {
  const p = importRuleSchema.safeParse(r)
  return p.success ? p.data : null
}
/** One rule, as the settings keep it (defaults filled – a rule read from the disk equals the one learned). */
const sameRule = (a: unknown, b: unknown): boolean => deepEqual(parseRule(a), parseRule(b))

/** The rules an import learned or changed: each one before (null = new) and after it. */
export function rulesChanged(before: readonly ImportRule[], after: readonly ImportRule[]): ImportBatch['rules'] {
  if (before === after) return []
  const old = new Map(before.map((r) => [r.id, r]))
  return after.filter((r) => old.get(r.id) !== r && !sameRule(old.get(r.id), r)).map((r) => ({ id: r.id, before: old.get(r.id) ?? null, after: r }))
}

/** The record of an import (its operations as the schema keeps them: the base of taking it back). */
export function importBatch(f: BatchFacts): ImportBatch {
  return importBatchSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: f.id,
    createdAt: f.savedAt,
    updatedAt: f.savedAt,
    updatedBy: f.machine,
    at: f.at,
    savedAt: f.savedAt,
    accountId: f.accountId,
    fileName: f.fileName.slice(0, 300),
    period: f.period,
    counts: f.counts,
    created: f.created.map((t) => t.id),
    updated: f.updated.map((u) => ({ before: transactionSchema.parse(u.before), after: transactionSchema.parse(u.after) })),
    removed: f.removed.map((t) => transactionSchema.parse(t)),
    rules: rulesChanged(f.rulesBefore, f.rulesAfter),
    before: f.before,
    after: f.after,
    ownName: f.ownName,
    confirmations: f.confirmations ?? []
  })
}

const newer = (a: ImportBatch, b: ImportBatch) => a.at > b.at || (a.at === b.at && a.id > b.id)

/** The latest import that stands (null = none): the only one that can be taken back. */
export function latestImport(batches: readonly ImportBatch[]): ImportBatch | null {
  let out: ImportBatch | null = null
  for (const b of batches) if (!b.undoneAt && (!out || newer(b, out))) out = b
  return out
}

/** The batches beyond the last `keep` (by the import's time): deleted when a new one is written. */
export function batchesToDrop(batches: readonly ImportBatch[], keep = KEEP_IMPORTS): string[] {
  return [...batches]
    .sort((a, b) => (newer(a, b) ? -1 : newer(b, a) ? 1 : 0))
    .slice(keep)
    .map((b) => b.id)
}

export interface UndoPlan {
  /** The operations it created, still there: deleted. */
  remove: string[]
  /** …of them changed after the import (the user's work goes with them – said before, „Cofnij” brings it back). */
  changed: number
  /** …of them docked with ICTTJ's payouts (the docking waits for its operation again). */
  docked: number
  /** The operations it created that are not there any more (deleted, or not on this computer yet). */
  missing: number
  /** The operations it changed, with its changes taken back (what changed since stays). */
  restore: Transaction[]
  /** The operations it deleted, back. */
  readd: Transaction[]
  /** Its rules taken back: a new one out, a changed one as before. */
  rulesBack: number
  /** Its rules changed or deleted since: left as they are. */
  rulesKept: number
  /** The balances it confirmed (F5), still there: deleted. */
  confirmations: string[]
}

/**
 * What taking `batch` back does now. `tx` = the operation now (undefined = none); `docked` = operations with a docking.
 */
export function undoPlan(
  batch: ImportBatch,
  now: { tx: (id: string) => Transaction | undefined; docked?: ReadonlySet<string>; rules: readonly ImportRule[]; balance?: (id: string) => unknown }
): UndoPlan {
  const remove: string[] = []
  let changed = 0
  let docked = 0
  let missing = 0
  for (const id of batch.created) {
    const t = now.tx(id)
    if (!t) {
      missing++
      continue
    }
    remove.push(id)
    if (t.updatedAt > batch.savedAt) changed++
    if (now.docked?.has(id)) docked++
  }
  const restore: Transaction[] = []
  for (const { before, after } of batch.updated) {
    const cur = now.tx(after.id)
    if (!cur) continue
    // Three-way: the import's change goes back (base = as it wrote it), a change made since stays (a clash – the user's).
    const { merged } = merge3<Transaction>(after, cur, before, () => 'mine')
    const back = { ...merged, id: cur.id, createdAt: cur.createdAt }
    if (!deepEqual(stripped(back), stripped(cur))) restore.push(back)
  }
  const readd = batch.removed.filter((t) => !now.tx(t.id))
  const { back: rulesBack, kept: rulesKept } = rulesUndone(now.rules, batch)
  const confirmations = batch.confirmations.filter((id) => now.balance?.(id))
  return { remove, changed, docked, missing, restore, readd, rulesBack, rulesKept, confirmations }
}

/** A record without the save's stamps (compared by content). */
function stripped(t: Transaction): Omit<Transaction, 'updatedAt' | 'updatedBy' | 'schemaVersion'> {
  const { updatedAt: _u, updatedBy: _b, schemaVersion: _s, ...rest } = t
  return rest
}

/** The rules with an import's taken back (the same array when nothing goes back). */
export function rulesUndone(rules: readonly ImportRule[], batch: ImportBatch): { rules: readonly ImportRule[]; back: number; kept: number } {
  const out = [...rules]
  let back = 0
  let kept = 0
  for (const e of batch.rules) {
    const at = out.findIndex((r) => r.id === e.id)
    if (at < 0) {
      // Absent as it should be after (an undo's „Cofnij”: a rule the undo removed) – there again.
      const again = !e.after && e.before ? parseRule(e.before) : null
      if (again) {
        out.push(again)
        back++
      }
      // Deleted since: it stays deleted (one the import added is gone anyway).
      else if (e.before) kept++
      continue
    }
    if (!sameRule(out[at], e.after)) {
      kept++
      continue
    }
    if (!e.before) {
      out.splice(at, 1)
      back++
      continue
    }
    const prev = parseRule(e.before)
    if (!prev) {
      kept++
      continue
    }
    out[at] = prev
    back++
  }
  return { rules: back ? out : rules, back, kept }
}

/** `map` with `key` back at `before` while it is still `after` (null = absent) as the import set it (null = nothing to change). */
function backAt<T extends string>(map: Readonly<Record<string, T>>, key: string, before: T | null, after: T | null): Record<string, T> | null {
  if (before === after || (map[key] ?? null) !== after) return null
  const out = { ...map }
  if (before == null) delete out[key]
  else out[key] = before
  return out
}

/** The settings with what the import set taken back – each one only while still as it set it. */
export function settingsUndone(s: Settings, batch: ImportBatch): Settings {
  const imp = s.import
  const acc = batch.accountId
  const lastImport = backAt(imp.lastImport, acc, batch.before.lastImport, batch.after.lastImport)
  const coveredTo = backAt(imp.coveredTo, acc, batch.before.coveredTo, batch.after.coveredTo)
  const accountNumbers = backAt(imp.accountNumbers, acc, batch.before.accountNumber, batch.after.accountNumber)
  const log = imp.log[batch.at] === acc ? Object.fromEntries(Object.entries(imp.log).filter(([k]) => k !== batch.at)) : null
  const own = batch.ownName ? imp.ownNames.indexOf(batch.ownName) : -1
  const { rules, back } = rulesUndone(imp.rules, batch)
  const inflows = Object.entries(batch.after.inflows).filter(([id, v]) => s.household.members.some((m) => m.id === id && m.inflow === v && batch.before.inflows[id] !== v))
  const changed = lastImport || coveredTo || accountNumbers || log || own >= 0 || back || inflows.length
  if (!changed) return s
  return {
    ...s,
    import: {
      ...imp,
      rules: rules as ImportRule[],
      lastImport: lastImport ?? imp.lastImport,
      coveredTo: coveredTo ?? imp.coveredTo,
      accountNumbers: accountNumbers ?? imp.accountNumbers,
      log: log ?? imp.log,
      ownNames: own >= 0 ? imp.ownNames.filter((_, i) => i !== own) : imp.ownNames
    },
    household: inflows.length
      ? {
          ...s.household,
          members: s.household.members.map((m) => {
            const hit = inflows.find(([id]) => id === m.id)
            return hit ? { ...m, inflow: (batch.before.inflows[m.id] ?? 'ask') as typeof m.inflow } : m
          })
        }
      : s.household
  }
}

/**
 * The settings with what taking an import back changed set again (its „Cofnij”): the import's values – each one only
 * while it is still as the undo left it –, its rules, its entry of the log and the holder's name.
 */
export function settingsRedone(s: Settings, batch: ImportBatch): Settings {
  const swapped: ImportBatch = {
    ...batch,
    at: '',
    ownName: null,
    before: batch.after,
    after: batch.before,
    rules: batch.rules.map((e) => ({ id: e.id, before: e.after, after: e.before }))
  }
  const out = settingsUndone(s, swapped)
  const imp = out.import
  const log = imp.log[batch.at] ? imp.log : { ...imp.log, [batch.at]: batch.accountId }
  const ownNames = batch.ownName && !imp.ownNames.includes(batch.ownName) ? [...imp.ownNames, batch.ownName] : imp.ownNames
  return log === imp.log && ownNames === imp.ownNames ? out : { ...out, import: { ...imp, log, ownNames } }
}
