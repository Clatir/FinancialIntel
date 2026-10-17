/**
 * An mBank file against what is already in the budget (spec: „Import z mBanku”, step 2), before anything is saved:
 * - rows imported before (overlapping periods – the import runs every 2–3 days) are known: nothing changes, a
 *   pending row now settled only loses the mark;
 * - a pending row that came back changed (another amount after the currency conversion, another date) updates its
 *   operation;
 * - a row matching an operation typed by hand (amount, date ±3 days, counterparty) is merged: the operation keeps the
 *   user's category and time and takes the bank's data;
 * - a row of an operation the user deleted stays out (unless they bring it back);
 * - the rest is new and gets a decision (`classify.ts`);
 * - pending operations of the period a list of operations no longer has (a cancelled card authorization) are offered
 *   for removal – never ticked by themselves: a filtered list lacks rows too.
 */
import { daysBetween } from '../calc/dates'
import { fold } from '../fold'
import type { ImportRule } from '../schema/budget'
import { transactionSchema, type BankRow, type Transaction } from '../schema/records'
import { SCHEMA_VERSION } from '../schema/common'
import { classifyRow, counterpartyKey, upsertRule, type ClassifyContext, type Direction, type ImportDecision } from './classify'
import { rowKeys, type MbankFile, type MbankRow } from './mbank'

/** Days around the bank's date a manual entry may be (spec: ±3). */
export const MATCH_DAYS = 3

/** The same counterparty in other words: an empty one (a quick entry without it), one key in the other, a common word. */
export function similarCounterparty(a: string, b: string): boolean {
  const ka = counterpartyKey(a)
  const kb = counterpartyKey(b)
  if (!ka || !kb) return true
  if ((ka.length >= 3 && kb.includes(ka)) || (kb.length >= 3 && ka.includes(kb))) return true
  const words = (s: string) => new Set(fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4))
  const wa = words(a)
  return [...words(b)].some((w) => wa.has(w))
}

export type RowPlan =
  /** Imported before; `settled` = it was pending and is settled now (the mark goes). */
  | { status: 'known'; row: MbankRow; key: string; tx: Transaction; settled: boolean }
  /** A pending operation that came back changed: it takes the row's amount, date and description. */
  | { status: 'settle'; row: MbankRow; key: string; tx: Transaction }
  /** An operation typed by hand: it takes the bank's data and keeps the user's category, time and notes. */
  | { status: 'merge'; row: MbankRow; key: string; tx: Transaction }
  | { status: 'new'; row: MbankRow; key: string; group: string; decision: ImportDecision; hint: string | null }
  /** An operation the user deleted (its version is in the history): left out unless brought back. */
  | { status: 'deleted'; row: MbankRow; key: string; group: string; decision: ImportDecision; hint: string | null }

export interface ImportPlan {
  accountId: string
  rows: RowPlan[]
  /** Pending operations of the file's period the file does not have any more. */
  vanished: Transaction[]
  period: { from: string; to: string } | null
}

/** Group of new rows: one counterparty, one direction (spec: history categorized in groups by counterparty). */
export const groupKey = (key: string, direction: Direction) => `${key}|${direction}`

/** `deletedKeys` = `bank.key` of the operations the user deleted (`.history/`): their rows do not come back by themselves. */
export function planImport(file: MbankFile, accountId: string, existing: readonly Transaction[], ctx: ClassifyContext, deletedKeys: ReadonlySet<string> = new Set()): ImportPlan {
  const keys = rowKeys(file.rows, accountId)
  const mine = existing.filter((t) => t.accountId === accountId)
  const byKey = new Map(mine.filter((t) => t.bank).map((t) => [t.bank!.key, t]))
  const used = new Set<string>()
  const plans: Array<RowPlan | null> = file.rows.map((row, i) => {
    const tx = byKey.get(keys[i]!)
    if (!tx) return null
    used.add(tx.id)
    return { status: 'known', row, key: keys[i]!, tx, settled: !!tx.bank?.pending && !row.pending }
  })

  // Pending operations that changed when settled: same counterparty, close date, close amount (a currency conversion).
  const pending = mine.filter((t) => t.bank?.pending && !used.has(t.id))
  file.rows.forEach((row, i) => {
    if (plans[i]) return
    let best: { tx: Transaction; score: number } | null = null
    for (const tx of pending) {
      if (used.has(tx.id) || Math.sign(tx.amount) !== Math.sign(row.amount)) continue
      const days = Math.abs(daysBetween(tx.date, row.date))
      const diff = Math.abs(tx.amount - row.amount)
      if (days > MATCH_DAYS || diff > Math.max(500, Math.round(Math.abs(tx.amount) * 0.1))) continue
      // The bank's own name of the operation: the user may have renamed it.
      if (!similarCounterparty(tx.bank!.counterparty || tx.bank!.description, row.counterparty || row.description)) continue
      const score = diff * 10 + days
      if (!best || score < best.score) best = { tx, score }
    }
    if (best) {
      used.add(best.tx.id)
      plans[i] = { status: 'settle', row, key: keys[i]!, tx: best.tx }
    }
  })

  // Operations typed by hand (the evening entries, D26): the same amount within ±3 days, a similar counterparty.
  const manual = mine.filter((t) => !t.bank)
  const candidates: Array<{ i: number; tx: Transaction; days: number; named: boolean }> = []
  file.rows.forEach((row, i) => {
    if (plans[i]) return
    for (const tx of manual) {
      if (tx.amount !== row.amount) continue
      const days = Math.abs(daysBetween(tx.date, row.date))
      if (days > MATCH_DAYS || !similarCounterparty(tx.counterparty, row.counterparty || row.description)) continue
      candidates.push({ i, tx, days, named: !!counterpartyKey(tx.counterparty) })
    }
  })
  // Closest dates first, a named counterparty before an empty one; each side at most once.
  candidates.sort((a, b) => a.days - b.days || Number(b.named) - Number(a.named) || a.i - b.i)
  for (const c of candidates) {
    if (plans[c.i] || used.has(c.tx.id)) continue
    used.add(c.tx.id)
    plans[c.i] = { status: 'merge', row: file.rows[c.i]!, key: keys[c.i]!, tx: c.tx }
  }

  const rows: RowPlan[] = file.rows.map((row, i) => {
    const p = plans[i]
    if (p) return p
    const { decision, hint, key, direction } = classifyRow(row, ctx)
    return { status: deletedKeys.has(keys[i]!) ? 'deleted' : 'new', row, key: keys[i]!, group: groupKey(key, direction), decision, hint }
  })

  const dates = file.rows.map((r) => r.date).sort()
  const period = file.period ?? (dates.length ? { from: dates[0]!, to: dates.at(-1)! } : null)
  // Only a list of operations shows pending rows (the account history has the booked ones only).
  const vanished = period && file.format === 'lista' ? mine.filter((t) => t.bank?.pending && !used.has(t.id) && t.date >= period.from && t.date <= period.to) : []
  return { accountId, rows, vanished, period }
}

// ------------------------------------------------------------------ the user's choices → records

/** A group's or a row's decision as the user left it. */
export interface Choice {
  kind: ImportDecision['kind']
  categoryId: string | null
  refundable: boolean
  household: boolean
  counterAccountId: string | null
}

export interface ImportChoices {
  /** Per group (`RowPlan.group`): the decision for all its rows… */
  groups: Record<string, Choice>
  /** …and per row (`RowPlan.key`) where the user changed one row. */
  rows: Record<string, Choice>
  /** Groups whose decision becomes a rule (`ImportRule`). */
  remember: Record<string, boolean>
  /** Manual entries matched (`RowPlan.key`) that stay separate: the row is imported as a new operation. */
  noMerge: Record<string, boolean>
  /** Vanished pending operations (ids) to delete. */
  removeVanished: Record<string, boolean>
  /** Rows of deleted operations (`RowPlan.key`) to import again. */
  restoreDeleted: Record<string, boolean>
}

export const choiceOf = (d: ImportDecision): Choice => ({ kind: d.kind, categoryId: d.categoryId, refundable: d.refundable, household: d.household, counterAccountId: d.counterAccountId })

export interface ImportResult {
  create: Transaction[]
  update: Transaction[]
  remove: string[]
  rules: ImportRule[]
  /** Counts for the summary. */
  counts: { created: number; merged: number; settled: number; known: number; removed: number; skipped: number }
}

/**
 * The records an import writes. `house` = the open house receivable now: money from a household member repays it
 * first, in date order (D20); `makeId` gives new ids (ULIDs), `now` the time of the import.
 */
export function buildImport(
  plan: ImportPlan,
  choices: ImportChoices,
  opts: { now: string; house: number; makeId: () => string; rules: readonly ImportRule[]; labels?: Record<string, string> }
): ImportResult {
  const bankOf = (p: RowPlan): BankRow => ({
    format: 'mbank',
    key: p.key,
    description: p.row.description,
    counterparty: p.row.counterparty,
    operation: p.row.operation,
    category: p.row.category,
    pending: p.row.pending,
    importedAt: opts.now
  })
  const create: Transaction[] = []
  const update: Transaction[] = []
  const counts = { created: 0, merged: 0, settled: 0, known: 0, removed: 0, skipped: 0 }
  // The house receivable as the file goes, by date: purchases „do zwrotu” of the file add to it, a household member's
  // money repays it (D20) – the same order the layers' engine uses.
  let open = Math.max(0, opts.house)
  const fresh = [...plan.rows].sort((a, b) => (a.row.date < b.row.date ? -1 : a.row.date > b.row.date ? 1 : 0))
  for (const p of fresh) {
    if (p.status === 'known') {
      counts.known++
      if (p.settled) update.push({ ...p.tx, bank: { ...p.tx.bank!, pending: false } })
      continue
    }
    if (p.status === 'settle') {
      counts.settled++
      // The counterparty as the bank wrote it then (not changed by the user) takes the bank's new one.
      const bankCounterparty = p.tx.counterparty === '' || p.tx.counterparty === (p.tx.bank?.counterparty ?? '')
      update.push({ ...p.tx, date: p.row.date, amount: p.row.amount, counterparty: bankCounterparty ? p.row.counterparty : p.tx.counterparty, bank: bankOf(p) })
      continue
    }
    if (p.status === 'deleted' && !choices.restoreDeleted[p.key]) {
      counts.skipped++
      continue
    }
    if (p.status === 'merge' && !choices.noMerge[p.key]) {
      counts.merged++
      update.push({
        ...p.tx,
        date: p.row.date,
        amount: p.row.amount,
        counterparty: p.tx.counterparty || p.row.counterparty,
        title: p.tx.title || p.row.title,
        bank: bankOf(p)
      })
      continue
    }
    const group = p.status === 'new' || p.status === 'deleted' ? p.group : null
    const base =
      p.status === 'new' || p.status === 'deleted'
        ? choiceOf(p.decision)
        : choiceOf({ kind: p.row.amount < 0 ? 'expense' : 'income', categoryId: null, refundable: false, household: false, counterAccountId: null, source: 'none', ruleId: null, reason: '' })
    const c = choices.rows[p.key] ?? (group ? choices.groups[group] : undefined) ?? base
    const out = p.row.amount < 0
    let repaid = 0
    if (c.kind === 'expense' && c.refundable && out) open += -p.row.amount
    if (c.kind === 'income' && c.household && !out) {
      repaid = Math.min(p.row.amount, open)
      open -= repaid
    }
    counts.created++
    create.push(
      transactionSchema.parse({
        schemaVersion: SCHEMA_VERSION,
        id: opts.makeId(),
        createdAt: opts.now,
        updatedAt: opts.now,
        date: p.row.date,
        time: null,
        accountId: plan.accountId,
        kind: c.kind,
        amount: p.row.amount,
        categoryId: c.kind === 'expense' ? c.categoryId : null,
        refundable: c.kind === 'expense' && out && c.refundable,
        counterparty: p.row.counterparty,
        title: p.row.title,
        repaid,
        counterAccountId: c.kind === 'transfer' ? c.counterAccountId : null,
        bank: bankOf(p)
      })
    )
  }
  const remove = plan.vanished.filter((t) => choices.removeVanished[t.id]).map((t) => t.id)
  counts.removed = remove.length

  // Rules learned from the groups the user decided (spec: the rules learn from the user's decisions).
  let rules: ImportRule[] = [...opts.rules]
  const groups = new Map<string, RowPlan[]>()
  for (const p of plan.rows) if (p.status === 'new') groups.set(p.group, [...(groups.get(p.group) ?? []), p])
  for (const [group, members] of groups) {
    const c = choices.groups[group]
    if (!c || !choices.remember[group]) continue
    const [key, direction] = group.split('|') as [string, Direction]
    if (!key) continue
    rules = upsertRule(
      rules,
      {
        match: key,
        direction,
        label: opts.labels?.[group] ?? members[0]!.row.counterparty,
        kind: c.kind,
        categoryId: c.kind === 'expense' ? c.categoryId : null,
        refundable: c.kind === 'expense' && direction === 'out' && c.refundable,
        household: c.kind === 'income' && c.household,
        counterAccountId: c.kind === 'transfer' ? c.counterAccountId : null
      },
      { now: opts.now, makeId: opts.makeId, hits: members.length }
    )
  }
  return { create, update, remove, rules, counts }
}
