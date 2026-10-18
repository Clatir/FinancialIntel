/**
 * Operations that are one and the same (1.2.1, D77 – after ICTTJ's „Duplikaty z importu”, 1.19.1):
 * - the same row of the bank twice (one `bank.key` on one account): a file imported on two computers before the folder
 *   synced – the newer version stays (as „Zaakceptuj nowsze”), unless the other has more of the user's own data;
 * - an operation typed by hand and its copy from the bank the import did not join (typed after the import, another
 *   name, an amount off by grosze): the hand-typed one stays and takes the bank's date, amount and row;
 * - one row of the bank from both formats of the file (the list of operations and the account history describe it in
 *   other words – B5, imported before 1.4.2 knew it): the same amount within ±3 days, a similar name; one stays and
 *   keeps the other's key (`bank.altKeys`).
 * The kept one gets what only the copies had. A copy whose own decision (kind, category, container…) differs from the
 * kept one's is a conflict – shown, not ticked by default; both docked = blocked (one docking to undo by hand).
 */
import { addDays } from '../calc/dates'
import type { Docking, Transaction } from '../schema/records'
import { formatsOf, joinable, looseMatch, MATCH_DAYS, similarCounterparty } from './reconcile'

export type DuplicateKind = 'same-row' | 'manual' | 'bank-format'

export interface DuplicateGroup {
  /** Stable key of the group – the bank's row, or the two ids – „to nie duplikat” remembers it. */
  key: string
  kind: DuplicateKind
  keep: string
  remove: string[]
  /** A copy decides otherwise than the kept one (another category, kind…): check before merging. */
  conflict: boolean
  /** Why it cannot be merged here (both docked); null = it can. */
  blocked: string | null
  /** How the copy differs, for the screen: '' the same, 'name', 'amount', 'both'. */
  differs: '' | 'name' | 'amount' | 'both'
}

/** The key of a hand-typed operation and its copy (the two ids, sorted). */
export const duplicateKey = (ids: readonly string[]): string => [...ids].sort().join('|')
/** The key of a row of the bank imported more than once (whatever the number of copies). */
export const rowKey = (accountId: string, bankKey: string): string => `row:${accountId}|${bankKey}`

/** The user's own data of an operation (the kept one: the most of it). */
function userContent(t: Transaction): number {
  return (
    Number(!!t.categoryId) +
    t.splits.length +
    Number(!!t.note.trim()) +
    Number(!!t.logNote.trim()) +
    Number(!!t.impulse) +
    Number(!!t.time) +
    Number(t.refundable) +
    Number(!!t.containerId) +
    Number(!!t.goalId) +
    Number(!!t.loanId)
  )
}

/** What an operation was decided to be: two different decisions of one operation are a conflict. */
function decision(t: Transaction): string | null {
  const decided = t.kind !== 'expense' || !!t.categoryId || t.splits.length > 0 || t.refundable || !!t.containerId || !!t.loanId || !!t.goalId
  if (!decided) return null
  const member = (refundable: boolean, memberId: string | null) => (refundable ? (memberId ?? '-') : '')
  return [
    t.kind,
    t.categoryId ?? '',
    // An income's parts are its members' money (D81): the member and the rest as an advance decide too.
    t.splits.map((s) => `${s.categoryId}:${s.amount}:${member(s.refundable || t.kind === 'income', s.memberId)}:${t.kind === 'income' && s.advance ? 'a' : ''}`).join(','),
    t.refundable,
    member(t.refundable || t.kind === 'income', t.memberId),
    t.counterAccountId ?? '',
    t.containerId ?? '',
    t.loanId ?? '',
    t.goalId ?? ''
  ].join('|')
}

const conflicting = (keep: Transaction, copies: readonly Transaction[]): boolean => {
  const mine = decision(keep)
  return copies.some((c) => {
    const theirs = decision(c)
    return mine != null && theirs != null && theirs !== mine
  })
}

/**
 * The duplicates among the operations (drafts left out by the caller); `dismissed` = groups the user said are none
 * (`settings.import.notDuplicates`).
 */
export function findDuplicates(txs: readonly Transaction[], dockings: readonly Docking[], dismissed: Readonly<Record<string, unknown>> = {}): DuplicateGroup[] {
  const docked = new Set(dockings.map((d) => d.transactionId))
  const out: DuplicateGroup[] = []
  const blockedOf = (keep: Transaction, copies: readonly Transaction[]) =>
    docked.has(keep.id) && copies.some((c) => docked.has(c.id)) ? 'obie zadokowane – usuń jedno dokowanie, potem scal' : null

  // The same row of the bank twice.
  const byRow = new Map<string, Transaction[]>()
  for (const t of txs) {
    if (!t.bank) continue
    const k = `${t.accountId}|${t.bank.key}`
    const list = byRow.get(k)
    if (list) list.push(t)
    else byRow.set(k, [t])
  }
  const inRowGroups = new Set<string>()
  for (const list of byRow.values()) {
    if (list.length < 2) continue
    // Docked first (its docking stays valid), then the user's data, then the newer version.
    const sorted = [...list].sort(
      (a, b) => Number(docked.has(b.id)) - Number(docked.has(a.id)) || userContent(b) - userContent(a) || b.updatedAt.localeCompare(a.updatedAt) || a.createdAt.localeCompare(b.createdAt)
    )
    const [keep, ...copies] = sorted as [Transaction, ...Transaction[]]
    const key = rowKey(keep.accountId, keep.bank!.key)
    for (const t of list) inRowGroups.add(t.id)
    if (dismissed[key]) continue
    out.push({ key, kind: 'same-row', keep: keep.id, remove: copies.map((t) => t.id), conflict: conflicting(keep, copies), blocked: blockedOf(keep, copies), differs: '' })
  }

  // A hand-typed operation and its copy from the bank (`looseMatch`, the import's rule): the closest first, each side
  // once. Bank operations by account and date, so each hand-typed one looks at its ±3 days only (years of history).
  const manual = txs.filter(joinable)
  const banked = new Map<string, Transaction[]>()
  for (const t of txs) {
    if (!t.bank || inRowGroups.has(t.id)) continue
    const k = `${t.accountId}|${t.date}`
    const list = banked.get(k)
    if (list) list.push(t)
    else banked.set(k, [t])
  }
  const candidates: Array<{ own: Transaction; copy: Transaction; days: number; exact: boolean; similar: boolean }> = []
  for (const own of manual)
    for (let d = -MATCH_DAYS; d <= MATCH_DAYS; d++)
      for (const copy of banked.get(`${own.accountId}|${addDays(own.date, d)}`) ?? []) {
        const m = looseMatch(own, { amount: copy.amount, date: copy.date, name: copy.bank!.counterparty || copy.counterparty })
        if (!m || dismissed[duplicateKey([own.id, copy.id])]) continue
        candidates.push({ own, copy, ...m })
      }
  candidates.sort((a, b) => Number(b.exact) - Number(a.exact) || Number(b.similar) - Number(a.similar) || a.days - b.days || a.own.date.localeCompare(b.own.date))
  const used = new Set<string>()
  for (const c of candidates) {
    if (used.has(c.own.id) || used.has(c.copy.id)) continue
    used.add(c.own.id)
    used.add(c.copy.id)
    out.push({
      key: duplicateKey([c.own.id, c.copy.id]),
      kind: 'manual',
      keep: c.own.id,
      remove: [c.copy.id],
      conflict: conflicting(c.own, [c.copy]),
      blocked: blockedOf(c.own, [c.copy]),
      differs: !c.exact && !c.similar ? 'both' : !c.exact ? 'amount' : !c.similar ? 'name' : ''
    })
  }

  // One row from both formats of the file (B5): bank operations of one account, the other format, the same amount
  // within ±3 days, a similar name – the closest first, each once; the docked one stays, then the user's data, the older.
  // Each within the days the other's import covered (its operations' first and last day): a row a day after one file's
  // period is another operation, not that file's.
  const bankFormat: Array<{ a: Transaction; b: Transaction; days: number }> = []
  const formatOf = formatsOf(txs)
  const spans = new Map<string, { from: string; to: string }>()
  for (const t of txs) {
    if (!t.bank) continue
    const k = `${t.accountId}|${t.bank.importedAt}`
    const span = spans.get(k)
    if (!span) spans.set(k, { from: t.date, to: t.date })
    else if (t.date < span.from) span.from = t.date
    else if (t.date > span.to) span.to = t.date
  }
  const within = (t: Transaction, of: Transaction) => {
    const span = spans.get(`${of.accountId}|${of.bank!.importedAt}`)
    return !!span && t.date >= span.from && t.date <= span.to
  }
  for (const a of txs) {
    if (!a.bank || a.bank.pending || used.has(a.id) || inRowGroups.has(a.id) || formatOf(a) !== 'historia') continue
    for (let d = -MATCH_DAYS; d <= MATCH_DAYS; d++)
      for (const b of banked.get(`${a.accountId}|${addDays(a.date, d)}`) ?? []) {
        if (b.amount !== a.amount || b.bank!.pending || used.has(b.id) || formatOf(b) !== 'lista') continue
        if (!similarCounterparty(a.bank.counterparty || a.bank.description, b.bank!.counterparty || b.bank!.description)) continue
        if (!within(a, b) || !within(b, a) || dismissed[duplicateKey([a.id, b.id])]) continue
        bankFormat.push({ a, b, days: Math.abs(d) })
      }
  }
  bankFormat.sort((x, y) => x.days - y.days || x.a.date.localeCompare(y.a.date) || x.a.id.localeCompare(y.a.id))
  for (const c of bankFormat) {
    if (used.has(c.a.id) || used.has(c.b.id)) continue
    used.add(c.a.id)
    used.add(c.b.id)
    const [keep, copy] = [c.a, c.b].sort(
      (x, y) => Number(docked.has(y.id)) - Number(docked.has(x.id)) || userContent(y) - userContent(x) || x.createdAt.localeCompare(y.createdAt) || x.id.localeCompare(y.id)
    ) as [Transaction, Transaction]
    out.push({ key: duplicateKey([keep.id, copy.id]), kind: 'bank-format', keep: keep.id, remove: [copy.id], conflict: conflicting(keep, [copy]), blocked: blockedOf(keep, [copy]), differs: '' })
  }
  return out
}

/**
 * The kept operation with what only the copies had: the bank's data (date, amount, row – a hand-typed one takes
 * them from its copy), the user's fields it lacks (category, notes, log, time, container…).
 */
export function mergeDuplicate(keep: Transaction, copies: readonly Transaction[], kind: DuplicateKind, now: string): Transaction {
  let out: Transaction = { ...keep }
  const bankCopy = copies.find((c) => c.bank)
  if (kind === 'manual' && bankCopy) {
    out = { ...out, date: bankCopy.date, amount: bankCopy.amount, bank: bankCopy.bank, counterparty: out.counterparty || bankCopy.counterparty, title: out.title || bankCopy.title }
  }
  if (kind === 'same-row' && out.bank?.pending && copies.some((c) => c.bank && !c.bank.pending)) out = { ...out, bank: { ...out.bank, pending: false } }
  // The other format's key stays with the kept one: a file of it finds the operation at once.
  if (kind === 'bank-format' && out.bank) {
    const keys = copies.flatMap((c) => (c.bank ? [c.bank.key, ...(c.bank.altKeys ?? [])] : [])).filter((k) => k !== out.bank!.key)
    out = { ...out, bank: { ...out.bank, altKeys: [...new Set([...(out.bank.altKeys ?? []), ...keys])].slice(-20) } }
  }
  for (const c of copies) {
    // Undecided (an expense without a category – a quick entry): the copy's whole decision, whatever its kind (XTB, an
    // own transfer, a loan…), so a docking moved onto it stays right.
    if (decision(out) == null && decision(c) != null)
      out = {
        ...out,
        kind: c.kind,
        categoryId: c.categoryId,
        splits: c.splits,
        refundable: c.refundable,
        memberId: c.memberId,
        advance: c.advance,
        covers: c.covers,
        repaid: c.repaid,
        counterAccountId: c.counterAccountId,
        containerId: c.containerId,
        goalId: c.goalId,
        loanId: c.loanId
      }
    out = {
      ...out,
      note: out.note.trim() ? out.note : c.note,
      logNote: out.logNote.trim() ? out.logNote : c.logNote,
      impulse: out.impulse ?? c.impulse,
      time: out.time ?? c.time,
      containerId: out.containerId ?? c.containerId,
      goalId: out.goalId ?? c.goalId,
      loanId: out.loanId ?? c.loanId
    }
  }
  return { ...out, updatedAt: now }
}
