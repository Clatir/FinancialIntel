/**
 * Operations that are one and the same (1.2.1, D77 – after ICTTJ's „Duplikaty z importu”, 1.19.1):
 * - the same row of the bank twice (one `bank.key` on one account): a file imported on two computers before the folder
 *   synced – the newer version stays (as „Zaakceptuj nowsze”), unless the other has more of the user's own data; also
 *   one row on two accounts (B35: a file imported onto the wrong account and then the right one);
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
import { conflicting, userContent, type DuplicateKind } from './copies'
import { keyOccurrence, keyOnAccount, rowIdentity } from './mbank'
import { formatsOf, joinable, looseMatch, looseSure, MATCH_DAYS, similarCounterparty, type LooseMatch } from './reconcile'

export { mergeDuplicate } from './copies'
export type { DuplicateKind } from './copies'

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
  /**
   * A possible duplicate the import would ask about (N88, `looseSure`: one common word, another amount – not a card
   * purchase a day apart): shown, not ticked by default.
   */
  ask?: boolean
}

/** The key of a hand-typed operation and its copy (the two ids, sorted). */
export const duplicateKey = (ids: readonly string[]): string => [...ids].sort().join('|')
/** The key of a row of the bank imported more than once (whatever the number of copies). */
export const rowKey = (accountId: string, bankKey: string): string => `row:${accountId}|${bankKey}`

/**
 * Is a key of `settings.import.notDuplicates` a pair of the duplicates panel – „to nie duplikat” (`duplicateKey`,
 * `rowKey`)? The map keeps the other reports' „zostaw” too, none of them such a pair (przegląd N1 5): a correction said to
 * be no repeat (`correction:<id>` – B129), a transfer left as it is (`transfer:…`, `transfer-lone:<id>` – F10), an
 * operation back after its deletion and one brought back on purpose (`back:<id>` – T324), a rule and a member's money kept
 * as an advance for the future (`advanceRule:<id>`, `advanceKept:<tx>:<member>` – AP-4, T352).
 */
export const isDuplicatePairKey = (key: string): boolean => key.startsWith('row:') || !key.includes(':')

/**
 * The duplicates among the operations (drafts left out by the caller); `dismissed` = groups the user said are none
 * (`settings.import.notDuplicates`).
 */
export function findDuplicates(
  txs: readonly Transaction[],
  dockings: readonly Docking[],
  dismissed: Readonly<Record<string, unknown>> = {},
  /** The bank's account numbers of the accounts (F4): the same payment on two bank accounts is two operations. */
  accountNumbers?: Readonly<Record<string, string>>
): DuplicateGroup[] {
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

  // The same row of the bank on two accounts (B35: one account's file imported onto another too – before 1.5.1 the next
  // file of the right one brought it again): the row as the bank wrote it – date, description, amount, its occurrence.
  const byIdentity = new Map<string, Transaction[]>()
  for (const t of txs) {
    if (!t.bank?.description || inRowGroups.has(t.id)) continue
    const k = keyOnAccount('*', rowIdentity({ date: t.date, description: t.bank.description, amount: t.amount }), keyOccurrence(t.bank.key))
    const list = byIdentity.get(k)
    if (list) list.push(t)
    else byIdentity.set(k, [t])
  }
  for (const [k, all] of byIdentity) {
    if (all.length < 2) continue
    // Accounts of two bank accounts (their numbers known and different): each one's operations apart; the ones of
    // accounts without a number known stay together.
    const byNumber = new Map<string, Transaction[]>()
    for (const t of all) {
      const n = accountNumbers?.[t.accountId] ?? ''
      byNumber.set(n, [...(byNumber.get(n) ?? []), t])
    }
    const known = [...byNumber.keys()].filter(Boolean)
    const parts: Array<[string, Transaction[]]> = known.length > 1 ? [...byNumber] : [['', all]]
    for (const [n, list] of parts) {
      if (list.length < 2) continue
      const [keep, ...copies] = [...list].sort(
        (a, b) => Number(docked.has(b.id)) - Number(docked.has(a.id)) || userContent(b) - userContent(a) || b.updatedAt.localeCompare(a.updatedAt) || a.createdAt.localeCompare(b.createdAt)
      ) as [Transaction, ...Transaction[]]
      const key = rowKey('*', n ? `${k}|${n}` : k)
      for (const t of list) inRowGroups.add(t.id)
      if (dismissed[key]) continue
      out.push({ key, kind: 'same-row', keep: keep.id, remove: copies.map((t) => t.id), conflict: conflicting(keep, copies), blocked: blockedOf(keep, copies), differs: '' })
    }
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
  // The days around each date, once per date (W4: years of history, the same days again and again).
  const near = new Map<string, string[]>()
  const around = (date: string) => {
    let days = near.get(date)
    if (!days) near.set(date, (days = Array.from({ length: 2 * MATCH_DAYS + 1 }, (_, i) => addDays(date, i - MATCH_DAYS))))
    return days
  }
  const candidates: Array<{ own: Transaction; copy: Transaction } & LooseMatch> = []
  for (const own of manual)
    for (const day of around(own.date))
      for (const copy of banked.get(`${own.accountId}|${day}`) ?? []) {
        // The bank's name as the import compares it (N89): its counterparty, else its description – never „” (alike to all).
        const m = looseMatch(own, { amount: copy.amount, date: copy.date, name: copy.bank!.counterparty || copy.bank!.description })
        if (!m || dismissed[duplicateKey([own.id, copy.id])]) continue
        candidates.push({ own, copy, ...m })
      }
  candidates.sort((a, b) => Number(b.exact) - Number(a.exact) || Number(b.strong) - Number(a.strong) || Number(b.similar) - Number(a.similar) || a.days - b.days || a.own.date.localeCompare(b.own.date))
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
      differs: !c.exact && !c.similar ? 'both' : !c.exact ? 'amount' : !c.similar ? 'name' : '',
      // The same amount under a similar name is the import's sure join; else as the import asks.
      ...(c.exact && c.similar ? {} : looseSure(c, c.copy.bank!.operation) ? {} : { ask: true })
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
    around(a.date).forEach((day, i) => {
      for (const b of banked.get(`${a.accountId}|${day}`) ?? []) {
        if (b.amount !== a.amount || b.bank!.pending || used.has(b.id) || formatOf(b) !== 'lista') continue
        if (!similarCounterparty(a.bank!.counterparty || a.bank!.description, b.bank!.counterparty || b.bank!.description)) continue
        if (!within(a, b) || !within(b, a) || dismissed[duplicateKey([a.id, b.id])]) continue
        bankFormat.push({ a, b, days: Math.abs(i - MATCH_DAYS) })
      }
    })
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
