/**
 * An mBank file against what is already in the budget (spec: „Import z mBanku”, step 2), before anything is saved:
 * - rows imported before (overlapping periods – the import runs every 2–3 days) are known: nothing changes, a
 *   pending row now settled only loses the mark;
 * - a pending row that came back changed (another amount after the currency conversion, another date) updates its
 *   operation;
 * - a row matching an operation typed by hand (amount, date ±3 days, counterparty) is merged: the operation keeps the
 *   user's category and time and takes the bank's data;
 * - a row of the other side of a transfer between two accounts of the budget (F10) joins its operation – one operation
 *   for both sides (a one-sided transfer of before 1.7.0 becomes one too);
 * - a row of an operation the user deleted stays out (unless they bring it back) – also a row of the other format of
 *   the file (AF-1);
 * - the rest is new and gets a decision (`classify.ts`);
 * - pending operations of the period a list of operations no longer has (a cancelled card authorization) are offered
 *   for removal – never ticked by themselves: a filtered list lacks rows too.
 */
import { addDays, daysBetween } from '../calc/dates'
import { debtShares, evenShares, surplusView } from '../calc/household'
import { isTwoSided } from '../calc/operations'
import { shareAmounts, shareSplits, withBankAmount } from '../calc/share'
import { fold } from '../fold'
import { deepEqual } from '../merge'
import { queryAmount } from '../operationsView'
import { HOUSE_MEMBER_ID, type ImportRule } from '../schema/budget'
import { transactionSchema, type BankRow, type Share, type Split, type Transaction } from '../schema/records'
import { SCHEMA_VERSION } from '../schema/common'
import { classifyRow, counterpartyKey, isAtmOperation, isCashExpenseRule, isFeeOperation, isOwnTransferRow, PER_OPERATION_KINDS, upsertRules, type ClassifyContext, type Classified, type DecisionSource, type Direction, type ImportDecision, type LearnedRule, type RuleTarget } from './classify'
import { conflicting, coversOtherwise, dropsCovers, takeUserData } from './copies'
import { accountNumberOf, keyKindOf, keyKindOfFile, keyOccurrence, keyOnAccount, otherBankAccount, PROGRESS_EVERY, rowIdentity, rowKeys, type MbankFile, type MbankRow, type Progress } from './mbank'
import { brandOf, isCityWord, isGenericWord, isKeywordWord, isKindWord } from './brands'

/** Days around the bank's date a manual entry may be (spec: ±3). */
export const MATCH_DAYS = 3

/** An amount a hand-typed operation may be off by (a typo, grosze left out): max(1 zł, 3%), the same direction. */
export const closeAmount = (a: number, b: number): boolean => Math.sign(a) === Math.sign(b) && Math.abs(a - b) <= Math.max(100, Math.round(Math.max(Math.abs(a), Math.abs(b)) * 0.03))

/**
 * A transfer in one operation seen from its other account (F10): that account's side as an operation of the account –
 * its amount and day, the bank's row joined to it –, so a plan's passes take it as one of the account's own. Never
 * saved: the import writes back only that side's row and day (`withOtherSide`).
 */
const sideViews = new WeakMap<Transaction, Transaction>()
const realOfView = new WeakMap<Transaction, Transaction>()
function sideOf(t: Transaction): Transaction {
  let view = sideViews.get(t)
  if (!view) {
    view = { ...t, accountId: t.counterAccountId!, counterAccountId: t.accountId, amount: -t.amount, date: t.counterDate ?? t.date, bank: t.counterBank ?? null, counterBank: t.bank }
    sideViews.set(t, view)
    realOfView.set(view, t)
  }
  return view
}

/** A one-sided transfer of before 1.7.0 seen from the account it names (F10): its side there, were it in one operation. */
const legacyViews = new WeakMap<Transaction, Map<string, Transaction>>()
function legacySideOf(t: Transaction, accountId: string): Transaction {
  let views = legacyViews.get(t)
  if (!views) legacyViews.set(t, (views = new Map()))
  let view = views.get(accountId)
  if (!view) {
    view = { ...t, accountId, counterAccountId: t.accountId, amount: -t.amount, bank: null, counterBank: t.bank }
    views.set(accountId, view)
    realOfView.set(view, t)
  }
  return view
}

/** The operation a plan's row is about (`sideOf` gives back its operation). */
export const realOf = (t: Transaction): Transaction => realOfView.get(t) ?? t

/**
 * A plan's operation as it crosses to another thread (AP-35, T464): the record's id and the view of it the plan took –
 * its other side (`sideOf`) or a one-sided transfer's side (`legacySideOf`, on `account`). A view is known by its object
 * only (`isSideView`): a copy made by the message would be the other account's side taken for the operation itself.
 */
export type TxRef = { id: string; view?: 'side' | 'legacy'; account?: string }

export function txRef(t: Transaction): TxRef {
  const real = realOfView.get(t)
  if (!real) return { id: t.id }
  return sideViews.get(real) === t ? { id: real.id, view: 'side' } : { id: real.id, view: 'legacy', account: t.accountId }
}

/** The plan's operation of a reference (`txRef`) among the budget's (`byId`): the same object a plan here would take; null – none. */
export function txOfRef(ref: TxRef, byId: ReadonlyMap<string, Transaction>): Transaction | null {
  const t = byId.get(ref.id)
  if (!t) return null
  return ref.view === 'side' ? sideOf(t) : ref.view === 'legacy' ? legacySideOf(t, ref.account ?? '') : t
}

/** Is a plan's operation the other side of a transfer in one operation (F10)? */
export const isSideView = (t: Transaction): boolean => realOfView.has(t)

/**
 * The transfer in one operation with its other side's row from the bank (F10): one of before 1.7.0 becomes one; the
 * other side's day kept when the bank booked it on another one.
 */
export function withOtherSide(t: Transaction, accountId: string, bank: BankRow, date: string): Transaction {
  const { counterDate: _day, ...rest } = t
  return { ...rest, bothSides: true, counterAccountId: accountId, counterBank: bank, ...(date !== t.date ? { counterDate: date } : {}) }
}

/** A hand-typed operation that may be joined with the bank's (a correction of a balance never is). */
export const joinable = (t: Pick<Transaction, 'bank' | 'kind' | 'amount'>): boolean => !t.bank && t.kind !== 'correction' && t.amount !== 0

/** How a hand-typed operation and the bank's may be one (`looseMatch`): `strong` = a similar name beyond one common word. */
export interface LooseMatch {
  days: number
  exact: boolean
  similar: boolean
  strong: boolean
}

/**
 * One rule for the import and the duplicates panel (D77): a hand-typed operation and the bank's are the same one when
 * on the same side, ±3 days apart, of the same amount (`exact`) or a close one under a similar name. Null = not.
 */
export function looseMatch(own: { amount: number; date: string; counterparty: string }, bank: { amount: number; date: string; name: string }): LooseMatch | null {
  if (Math.sign(own.amount) !== Math.sign(bank.amount)) return null
  // The cheap checks first: the names are compared only for an amount that may match (W4).
  const exact = own.amount === bank.amount
  if (!exact && !closeAmount(own.amount, bank.amount)) return null
  const days = Math.abs(daysBetween(own.date, bank.date))
  if (days > MATCH_DAYS) return null
  const how = counterpartySimilarity(own.counterparty, bank.name)
  return exact || how ? { days, exact, similar: !!how, strong: !!how && how !== 'word' } : null
}

/**
 * A possible duplicate surely the same – joined by default by the import, ticked by default in the duplicates panel (T92,
 * N88, B102): a similar name beyond one common word, or a card purchase a day apart at most. Else asked.
 */
export const looseSure = (m: Pick<LooseMatch, 'similar' | 'strong' | 'days'>, operation: string): boolean =>
  (m.similar && m.strong) || (m.days <= 1 && /^(ZAKUP|BLIK ZAKUP|PŁATNOŚĆ|PLATNOSC)/.test(operation))

/** What a bank's row tells of the file it came from (`formatOfBanks`); `key` – another bank's CSV (`csv:`, T461). */
export type FormatBank = Pick<BankRow, 'source' | 'operation' | 'description' | 'importedAt'> & { key?: string }

/**
 * The file format of bank's rows (B5): a row's own (`bank.source`, 1.4.2), else the format of the import it came with –
 * the account history's descriptions start with the type of operation, so most of them in one import = the history.
 * `banks` – all the rows the import's votes are counted from (an operation deleted since votes too – AF-1).
 */
export function formatOfBanks(banks: Iterable<FormatBank | null | undefined>): (bank: FormatBank | null | undefined) => MbankFile['format'] {
  const votes = new Map<string, number>()
  const csv = (b: FormatBank) => !!b.key && keyKindOf(b.key) === 'csv'
  for (const b of banks) {
    if (!b || b.source || csv(b)) continue
    const op = b.operation.trim().toUpperCase()
    const history = !!op && b.description.trim().toUpperCase().startsWith(op)
    votes.set(b.importedAt, (votes.get(b.importedAt) ?? 0) + (history ? 1 : -1))
  }
  // Another bank's CSV (AP-43) by its row's key – written by every version, `source` of it is none (T461).
  return (b) => (b && csv(b) ? 'csv' : (b?.source ?? ((votes.get(b?.importedAt ?? '') ?? 0) > 0 ? 'historia' : 'lista')))
}

/** The file format of each bank's operation (B5, `formatOfBanks`). */
export function formatsOf(txs: readonly Transaction[]): (t: Transaction) => MbankFile['format'] {
  const of = formatOfBanks(txs.map((t) => t.bank))
  return (t) => of(t.bank)
}

/**
 * The bank's operations a file's rows are matched to by the B5 measure (the same row in other words – the amount, ±3
 * days, a similar name) when no key finds them: of mBank's other format; of another bank's CSV any – its own too (T461,
 * przegląd R1 1): a bank that rewrote a row's cells (a pending one booked – its balance, its state) gives it another
 * key, the measure finds it still – never a second operation. A deleted one of the CSV's own format only when the file
 * has not its row by its key (`DeletedRow.keys`): by the measure a new purchase like it (the same shop and amount a day
 * later) would stay out with it.
 */
export const byMeasure = (operation: MbankFile['format'], file: MbankFile['format']): boolean => operation !== file || file === 'csv'

/** The days a file covers: its period, else its rows' first and last day. */
export function coverageOf(file: Pick<MbankFile, 'period' | 'rows'>): (date: string) => boolean {
  let from = file.period?.from ?? ''
  let to = file.period?.to ?? ''
  if (!from || !to)
    for (const r of file.rows) {
      if (!from || r.date < from) from = r.date
      if (!to || r.date > to) to = r.date
    }
  return (date) => date >= from && date <= to
}

/**
 * How close a row of the bank is to a pending operation it may settle (another amount after a currency conversion,
 * another day): the same side, ±3 days, ±max(5 zł, 10%), the bank's names alike; lower = closer, null = not it.
 */
function settleScore(name: string, tx: { date: string; amount: number }, row: MbankRow): number | null {
  if (Math.sign(tx.amount) !== Math.sign(row.amount)) return null
  const days = Math.abs(daysBetween(tx.date, row.date))
  const diff = Math.abs(tx.amount - row.amount)
  if (days > MATCH_DAYS || diff > Math.max(500, Math.round(Math.abs(tx.amount) * 0.1))) return null
  // The bank's own name of the operation: the user may have renamed it.
  if (!similarCounterparty(name, row.counterparty || row.description)) return null
  return diff * 10 + days
}

/** The same counterparty in other words: an empty one (a quick entry without it), one key in the other, a common word. */
export const similarCounterparty = (a: string, b: string): boolean => counterpartySimilarity(a, b) != null

/**
 * How two counterparties are one (T36, B102): 'empty' – one without a name (a quick entry); 'key' – the same key or
 * brand („KFC” – „KFC 1234 WARSZAWA”), or one key in the other when it tells who (5 letters at least, no word of what a
 * place is); 'words' / 'word' – common words of 4 letters and more that tell who (not a word every other name has –
 * „polska”, „sklep”, „spółka” –, a kind of place or a town). 'word' is a maybe – asked, never joined by itself: also a
 * short key or one of what in the other („bar” – „BARBERSHOP”, „Sklep” – „SKLEP OLA”). Null – not one.
 */
export function counterpartySimilarity(a: string, b: string): 'empty' | 'key' | 'words' | 'word' | null {
  const ka = counterpartyKey(a)
  const kb = counterpartyKey(b)
  if (!ka || !kb) return 'empty'
  if (ka === kb) return 'key'
  const ba = brandOf(a).key
  if (ba && ba === brandOf(b).key) return 'key'
  const [short, long] = ka.length <= kb.length ? [ka, kb] : [kb, ka]
  const inOther = short.length >= 3 && long.includes(short)
  if (inOther && short.length >= 5 && telling(short)) return 'key'
  const wa = nameWords(a)
  let common = 0
  for (const w of nameWords(b)) if (wa.has(w)) common++
  return common > 1 ? 'words' : common || inOther ? 'word' : null
}

/** A word of a name that tells who (B102): no generic word, kind of place, keyword's word or town. */
const telling = (w: string) => !isGenericWord(w) && !isKindWord(w) && !isKeywordWord(w) && !isCityWord(w)

/** A name's telling words of 4 letters and more, once per name (W4). */
function nameWords(s: string): ReadonlySet<string> {
  let words = wordSets.get(s)
  if (!words) {
    words = new Set(
      fold(s)
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && telling(w))
    )
    if (wordSets.size >= 50_000) wordSets.clear()
    wordSets.set(s, words)
  }
  return words
}
const wordSets = new Map<string, Set<string>>()

export type RowPlan =
  /**
   * Imported before; `settled` = it was pending and is settled now (the mark goes); `other` = from the other format of
   * the file (the list of operations ↔ the account history, B5) – its key joins the operation's; `moved` = moved to this
   * account from the one it was imported to (B35) – it takes this account's key; `copy` – see `RowCopy`.
   */
  | { status: 'known'; row: MbankRow; key: string; tx: Transaction; settled: boolean; other?: boolean; moved?: boolean; copy?: RowCopy }
  /**
   * Imported before onto another account of the budget (B35: the file of this account imported there by mistake, or the
   * operation moved there): never a second operation – moved here when the user says so (`ImportChoices.moveHere`;
   * by default when it was imported there, not moved there by the user). `other` = there in the other format of the
   * file, found by the B5 measure on an account of the same bank account (AF-9) – moved only when the user ticks it.
   */
  | { status: 'elsewhere'; row: MbankRow; key: string; tx: Transaction; move: boolean; other?: boolean }
  /** A pending operation that came back changed: it takes the row's amount, date and description. */
  | { status: 'settle'; row: MbankRow; key: string; tx: Transaction }
  /**
   * An operation typed by hand: it takes the bank's data and keeps the user's category, time and notes. `loose` = a
   * possible duplicate (1.2.1, D77): the same amount under another name, or a close amount (max(1 zł, 3%)) under a
   * similar one – joined too, so nothing comes in twice; the preview shows it to check.
   */
  | {
      status: 'merge'
      row: MbankRow
      key: string
      tx: Transaction
      loose?: 'name' | 'amount'
      ask?: boolean
      /**
       * The other side of a transfer between two accounts of the budget (F10): 'other' – of a transfer in one operation
       * (`tx` = its side here, `sideOf`), 'legacy' – of a one-sided transfer of before 1.7.0 naming this account, which
       * becomes one operation for both sides.
       */
      side?: 'other' | 'legacy'
      planned: Planned
    }
  | ({ status: 'new' } & PlannedRow)
  /**
   * An operation the user deleted (its version is in the history): left out unless brought back. `other` = deleted in
   * the other format of the file, found by the B5 measure (AF-1).
   */
  | ({ status: 'deleted'; other?: boolean } & PlannedRow)

/**
 * The copy of a row on another account (AF-9): this account's file imported there by mistake before (B35), while the row
 * is here already in the other format (B5) – a duplicate, never moved here beside its original. Removed when the user
 * says so (`ImportChoices.removeCopies`; by default when it was imported there and decides nothing else than the
 * operation here), what only it had (category, notes, the purchases a member's money pays back) going to the operation
 * here. `otherCovers` – it pays back other purchases than the operation here, which names its own: not ticked (removed,
 * the operation here keeps its own). `dropsCovers` – removed, the purchases it pays back would be paid back no more (the
 * operation here names others, or its money repays no member of theirs – `copies.ts`): not ticked, said (review N1 2).
 * `blocked` – never removed: docked, paid back by a member's money (`covers`) or written by a newer version (read only).
 */
export interface RowCopy {
  tx: Transaction
  remove: boolean
  conflict: boolean
  otherCovers: boolean
  dropsCovers: boolean
  blocked: 'docked' | 'covered' | 'locked' | null
}

/** A row of the file that gets a decision: its group (brand, direction, proposal) and the proposal. */
interface PlannedRow extends Planned {
  row: MbankRow
  key: string
}

/** What a row of the file is recognized as (a matched hand-typed one too – B36: imported apart, it is decided so). */
interface Planned {
  group: string
  /** The brand key (`brandOf`, with the user's merges): a decision of the group is remembered by it. */
  brand: string
  /** The chain's name when the dictionary knows it. */
  brandLabel: string | null
  /** The words of the name's own brand key (1.2.2: similar names compare them). */
  words: string[]
  /** What its rule is looked up by (1.2.2: a proposed keyword is tried on it). */
  target: RuleTarget
  direction: Direction
  decision: ImportDecision
  hint: string | null
}

export type NewRow = Extract<RowPlan, { status: 'new' }>

/** A row's plan before the matched hand-typed ones get their decision (`planImport`). */
type Draft = Exclude<RowPlan, { status: 'merge' }> | Omit<Extract<RowPlan, { status: 'merge' }>, 'planned'>

export interface ImportPlan {
  accountId: string
  /** The file's format: the operations remember it (`bank.source`). */
  format: MbankFile['format']
  rows: RowPlan[]
  /** Pending operations of the file's period the file does not have any more. */
  vanished: Transaction[]
  period: { from: string; to: string } | null
  /** The cash account an ATM withdrawal went onto (AP-33, `ClassifyContext.cash`); none – an expense „Gotówka”. */
  cash?: string | null
}

/**
 * A proposal as one text: the rows of a brand with another proposal are another group (and theme). A household
 * member asked about (inflow „pytaj”) is a theme of their own (T110, B4): never one with another member's money.
 */
export function proposalSig(d: ImportDecision): string {
  if (d.source === 'none') return d.household ? `?${d.kind}:d:${d.memberId ?? '-'}` : `?${d.kind}`
  const member = d.refundable || d.household ? (d.memberId ?? '-') : ''
  return [
    d.kind,
    d.categoryId ?? '',
    d.refundable ? 'z' : '',
    d.household ? 'd' : '',
    member,
    d.household && d.advance ? 'a' : '',
    d.counterAccountId ?? '',
    d.containerId ?? '',
    d.byTitle ? 't' : '',
    d.refundable && d.gift ? 'g' : '',
    shareKey(d.share),
    d.kind === 'loan' ? (d.loanId ?? '') : '',
    // A rule's part repaying a loan (D100): the rows of a loan not open yet have none – another group.
    ...(d.loanPart ? [`${d.loanPart.loanId}=${d.loanPart.amount}`] : []),
    ...(d.alsoFor?.length ? [`also:${d.alsoFor.map((x) => `${x.memberId}:${x.ask ? '?' : x.advance ? 'a' : 'i'}`).join(',')}/${d.surplusSplit ?? ''}`] : [])
  ].join(':')
}

/** A shared purchase's split as one text (D83): '' = none. */
export const shareKey = (s: Share | null | undefined): string =>
  s ? `${s.mode}/${s.lines.map((l) => `${l.memberId ?? 'me'}=${s.mode === 'equal' ? '' : l.value}${l.gift ? 'g' : ''}`).join(',')}` : ''

/**
 * Group of new rows (spec: history categorized in groups): one brand – a chain whatever its city or shop, else the
 * counterparty (1.2.1) –, one direction, one proposal.
 */
export const groupKey = (brand: string, direction: Direction, d: ImportDecision) => `${brand}|${direction}|${proposalSig(d)}`

/**
 * What a plan reads of the budget's operations, built once per list of operations and account (W18): a plan again after
 * a keyword, a merge of names or a member (the same operations) reads it as it is. All lists in the operations' order.
 */
interface Budgeted {
  /** The account's operations (the other sides of transfers in one operation as `sideOf` – F10). */
  mine: Transaction[]
  /** The bank's keys of the account's operations (and their keys of the other format – B5) → the operation. */
  byKey: Map<string, Transaction>
  /** Operations of any account with the bank's description, by day. */
  described: Map<string, Transaction[]>
  /** The account's pending operations of the bank. */
  pending: Transaction[]
  /** The account's booked operations of the bank, by day. */
  booked: Map<string, Transaction[]>
  formatOf: (t: Transaction) => MbankFile['format']
  /** The account's operations typed by hand (`joinable`), by day, with their place among them. */
  manual: Map<string, Array<{ tx: Transaction; at: number }>>
  /**
   * Transfers waiting for this account's row (F10), by the day of their side here: the other sides of transfers in one
   * operation without the bank's row (`sideOf`); one-sided transfers of other accounts (before 1.7.0) naming this one –
   * or no account (`named` false: the import offered none before 1.7.0) –, seen as their side here, when this account
   * has no side of its own for them.
   */
  waiting: Map<string, Array<{ tx: Transaction; side: 'other' | 'legacy'; named: boolean }>>
}

const budgetedMemo = new WeakMap<readonly Transaction[], Map<string, Budgeted>>()

function push<K, T>(map: Map<K, T[]>, key: K, value: T): void {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

function budgetedOf(existing: readonly Transaction[], accountId: string): Budgeted {
  let byAccount = budgetedMemo.get(existing)
  if (!byAccount) budgetedMemo.set(existing, (byAccount = new Map()))
  const known = byAccount.get(accountId)
  if (known) return known
  // The account's operations – and the other sides of transfers in one operation (F10), in the operations' order.
  const mine: Transaction[] = []
  for (const t of existing)
    if (t.accountId === accountId) mine.push(t)
    else if (t.counterAccountId === accountId && isTwoSided(t)) mine.push(sideOf(t))
  const byKey = new Map<string, Transaction>()
  for (const t of mine) if (t.bank) byKey.set(t.bank.key, t)
  // The keys of the same rows in the other format (B5), never over an operation's own key.
  for (const t of mine) for (const k of t.bank?.altKeys ?? []) if (!byKey.has(k)) byKey.set(k, t)
  const described = new Map<string, Transaction[]>()
  for (const t of existing) if (t.bank?.description) push(described, t.date, t)
  const booked = new Map<string, Transaction[]>()
  for (const t of mine) if (t.bank && !t.bank.pending) push(booked, t.date, t)
  const manual = new Map<string, Array<{ tx: Transaction; at: number }>>()
  // A transfer's other side waiting for its row is the transfers' pass's (its counterparty is the other account's).
  mine.filter((t) => joinable(t) && !isSideView(t)).forEach((tx, at) => push(manual, tx.date, { tx, at }))
  const waiting = new Map<string, Array<{ tx: Transaction; side: 'other' | 'legacy'; named: boolean }>>()
  for (const t of mine) if (isSideView(t) && !t.bank) push(waiting, t.date, { tx: t, side: 'other', named: true })
  // A one-sided transfer of before 1.7.0 whose side here is an operation of its own already (the pair, T31): not a side.
  const ownSides = new Map<number, Transaction[]>()
  for (const t of mine) if (t.kind === 'transfer' && !isSideView(t) && !isTwoSided(t)) push(ownSides, t.amount, t)
  const hasOwnSide = (t: Transaction) =>
    (ownSides.get(-t.amount) ?? []).some((o) => (o.counterAccountId === t.accountId || !o.counterAccountId) && Math.abs(daysBetween(o.date, t.date)) <= MATCH_DAYS)
  for (const t of existing)
    if (t.kind === 'transfer' && t.accountId !== accountId && (t.counterAccountId === accountId || !t.counterAccountId) && !isTwoSided(t) && t.amount && !hasOwnSide(t)) {
      const view = legacySideOf(t, accountId)
      push(waiting, view.date, { tx: view, side: 'legacy', named: t.counterAccountId === accountId })
    }
  const out: Budgeted = { mine, byKey, described, pending: mine.filter((t) => t.bank?.pending), booked, formatOf: formatsOf(mine), manual, waiting }
  byAccount.set(accountId, out)
  return out
}

/** The keys of a file's rows on an account (`rowKeys` – of mBank's or another bank's CSV), once per file and account (W18). */
const keysMemo = new WeakMap<readonly MbankRow[], Map<string, string[]>>()
function keysOf(rows: readonly MbankRow[], accountId: string, format: MbankFile['format']): string[] {
  let byAccount = keysMemo.get(rows)
  if (!byAccount) keysMemo.set(rows, (byAccount = new Map()))
  const kind = keyKindOfFile(format)
  let keys = byAccount.get(`${kind}|${accountId}`)
  if (!keys) byAccount.set(`${kind}|${accountId}`, (keys = rowKeys(rows, accountId, kind)))
  return keys
}

/**
 * An operation of the bank the user deleted, as its row is matched without its key (`shared/import/deleted.ts`): a
 * pending one (B96 – the bank settles it with another amount or day), a booked one of a format (AF-1 – the other format
 * of the file describes its row in other words). `name` – the bank's name of it ('' none).
 */
export interface DeletedRow {
  accountId: string
  date: string
  amount: number
  name: string
  /** When it was deleted (the history's time): an operation of the budget imported later may be its row brought back. */
  deletedAt: string
  /** A booked one: the format of the file it came from (none = a pending one). */
  format?: MbankFile['format']
  /**
   * Its row's keys (`bank.key`, `altKeys`): a file holding one of them has its row by the key – another bank's CSV
   * matches by the measure only the deleted ones it does not (drugi przegląd R1, 1).
   */
  keys?: readonly string[]
}

/** The key a bank's operation has on an account (B35): its date, the bank's description and amount, its occurrence – of its kind (T461). */
const keyOnFor = (account: string, t: Transaction): string =>
  keyOnAccount(account, rowIdentity({ date: t.date, description: t.bank!.description, amount: t.amount }), keyOccurrence(t.bank!.key), keyKindOf(t.bank!.key))

/** Every account's operations' formats, once per list of operations (AF-9: the other format on another account). */
const allFormatsMemo = new WeakMap<readonly Transaction[], (t: Transaction) => MbankFile['format']>()
function allFormatsOf(existing: readonly Transaction[]): (t: Transaction) => MbankFile['format'] {
  let of = allFormatsMemo.get(existing)
  if (!of) allFormatsMemo.set(existing, (of = formatsOf(existing)))
  return of
}

/** Operations a member's money pays back (`covers`), once per list of operations (AF-9: such a copy stays). */
const coveredMemo = new WeakMap<readonly Transaction[], ReadonlySet<string>>()
function coveredOf(existing: readonly Transaction[]): ReadonlySet<string> {
  let ids = coveredMemo.get(existing)
  if (!ids) coveredMemo.set(existing, (ids = new Set(existing.flatMap((t) => t.covers))))
  return ids
}

/**
 * `deletedKeys` = the keys of the rows of the operations the user deleted (`.history/` – `bank.key` and `altKeys`):
 * their rows do not come back by themselves; `deletedRows` = those of them a row is matched to without its key – the
 * pending ones (B96) and the booked ones of the other format (AF-1).
 */
export function planImport(
  file: MbankFile,
  accountId: string,
  existing: readonly Transaction[],
  ctx: ClassifyContext,
  deletedKeys: ReadonlySet<string> = new Set(),
  deletedRows: readonly DeletedRow[] = [],
  /** The rows recognized of the file's (AP-35: the import's progress bar). */
  progress?: Progress
): ImportPlan {
  const keys = keysOf(file.rows, accountId, file.format)
  const budget = budgetedOf(existing, accountId)
  const { byKey, formatOf } = budget
  const used = new Set<string>()
  // Operations a newer version wrote (B95: read only here) are never joined with a row nor settled by it: the row comes
  // in as the bank's own.
  const locked = (t: Transaction) => !!ctx.locked?.has(t.id)
  const plans: Array<Draft | null> = file.rows.map((row, i) => {
    const tx = byKey.get(keys[i]!)
    if (!tx) return null
    used.add(tx.id)
    return { status: 'known', row, key: keys[i]!, tx, settled: !!tx.bank?.pending && !row.pending }
  })

  // The same row imported before onto another account, or moved here from the one it was imported to (B35): the key
  // its row has on this account – its date, the bank's description and amount, its occurrence. Only operations of the
  // file's days (years of history otherwise).
  const days = file.rows.map((r) => r.date).sort()
  const lo = days.length ? addDays(days[0]!, -MATCH_DAYS) : ''
  const hi = days.length ? addDays(days.at(-1)!, MATCH_DAYS) : ''
  const keyOn = keyOnFor
  // An account whose files come from another bank account (both numbers known): its operations are its own (T166).
  const fileNumber = accountNumberOf(file.account)
  const numbers = fileNumber ? { ...ctx.accountNumbers, [accountId]: fileNumber } : ctx.accountNumbers
  const here = new Map<string, Transaction>()
  // By day (a key holds its day: the first operation of a key is still the first in the operations' order).
  for (const [date, list] of budget.described) {
    if (date < lo || date > hi) continue
    for (const t of list) {
      if (used.has(t.id) || otherBankAccount(numbers, accountId, t.accountId)) continue
      const k = keyOn(accountId, t)
      // One of this account with its own key is the first pass's.
      if ((t.accountId !== accountId || k !== t.bank!.key) && !here.has(k)) here.set(k, t)
    }
  }
  if (here.size)
    file.rows.forEach((row, i) => {
      if (plans[i]) return
      const tx = here.get(keys[i]!)
      if (!tx || used.has(tx.id)) return
      used.add(tx.id)
      if (tx.accountId === accountId) plans[i] = { status: 'known', row, key: keys[i]!, tx, settled: !!tx.bank?.pending && !row.pending, moved: true }
      // Imported there (the key of that account): this account's file went there by mistake – moved here by default;
      // moved there by the user – it stays where they put it.
      else plans[i] = { status: 'elsewhere', row, key: keys[i]!, tx, move: tx.bank!.key === keyOn(tx.accountId, tx) }
    })

  // Pending operations that changed when settled: same counterparty, close date, close amount (a currency conversion).
  const pending = budget.pending.filter((t) => !used.has(t.id) && !locked(t))
  file.rows.forEach((row, i) => {
    if (plans[i]) return
    let best: { tx: Transaction; score: number } | null = null
    for (const tx of pending) {
      if (used.has(tx.id)) continue
      // A transfer's other side (F10): the bank moves the same amount on both accounts.
      if (isSideView(tx) && tx.amount !== row.amount) continue
      const score = settleScore(tx.bank!.counterparty || tx.bank!.description, tx, row)
      if (score != null && (!best || score < best.score)) best = { tx, score }
    }
    if (best) {
      used.add(best.tx.id)
      plans[i] = { status: 'settle', row, key: keys[i]!, tx: best.tx }
    }
  })

  // The same row of the other format (B5): the account history and the list of operations describe a row in other
  // words, so its key differs – a booked operation of the bank from the other format, the same amount within ±3 days
  // (a card's date may differ), a similar name. The closest first, each side once. Only operations of the days this
  // file covers: one outside its period is not in it – a row of the same amount and name next to it is another one.
  // A row found on another account by its key (B35) is taken too (AF-9): its operation here in the other format is the
  // row – the one there is a copy (`RowCopy`), never moved here beside it.
  const covers = coverageOf(file)
  const nameOf = (t: Transaction) => t.bank!.counterparty || t.bank!.description
  const rowName = (row: MbankRow) => row.counterparty || row.description
  /** The B5 pairs of the rows `open` lets in with the operations of `byDay` (`${date}|${amount}`), the closest first. */
  const formatPairs = (byDay: ReadonlyMap<string, Transaction[]>, open: (i: number) => boolean) => {
    const pairs: Array<{ i: number; tx: Transaction; days: number }> = []
    file.rows.forEach((row, i) => {
      if (!open(i)) return
      for (let d = -MATCH_DAYS; d <= MATCH_DAYS; d++)
        for (const tx of byDay.get(`${addDays(row.date, d)}|${row.amount}`) ?? []) if (similarCounterparty(nameOf(tx), rowName(row))) pairs.push({ i, tx, days: Math.abs(d) })
    })
    return pairs.sort((a, b) => a.days - b.days || a.i - b.i)
  }
  const copyOf = (copy: Transaction, here: Transaction, imported: boolean): RowCopy => {
    const real = realOf(here)
    const blocked = locked(copy) || locked(real) ? 'locked' : ctx.docked?.has(copy.id) ? 'docked' : coveredOf(existing).has(copy.id) ? 'covered' : null
    const conflict = conflicting(real, [copy])
    const otherCovers = coversOtherwise(real, copy)
    const drops = dropsCovers(real, copy)
    return { tx: copy, remove: imported && !blocked && !conflict && !otherCovers && !drops, conflict, otherCovers, dropsCovers: drops, blocked }
  }
  const other = new Map<string, Transaction[]>()
  for (const [date, list] of budget.booked) {
    if (!covers(date)) continue
    for (const t of list) if (!used.has(t.id) && byMeasure(formatOf(t), file.format)) push(other, `${t.date}|${t.amount}`, t)
  }
  const openHere = (i: number) => {
    const p = plans[i]
    return !p || (p.status === 'elsewhere' && !p.other)
  }
  if (other.size)
    for (const c of formatPairs(other, openHere)) {
      if (!openHere(c.i) || used.has(c.tx.id)) continue
      used.add(c.tx.id)
      const there = plans[c.i]
      plans[c.i] = { status: 'known', row: file.rows[c.i]!, key: keys[c.i]!, tx: c.tx, settled: false, other: true, ...(there?.status === 'elsewhere' ? { copy: copyOf(there.tx, c.tx, there.move) } : {}) }
    }

  // The same row of the other format on another account of this bank account (AF-9: this account's file imported there
  // by mistake, its other format here now – or the other way round): in the budget already, never a second operation.
  // Only accounts the file's number was imported to (the measure is no row's key: two bank accounts are never mixed);
  // moved here only when the user ticks it.
  const sameNumber = fileNumber ? new Set(Object.entries(numbers ?? {}).flatMap(([id, n]) => (id !== accountId && n === fileNumber ? [id] : []))) : null
  if (sameNumber?.size) {
    const formatAll = allFormatsOf(existing)
    const there = new Map<string, Transaction[]>()
    for (const [date, list] of budget.described) {
      if (!covers(date)) continue
      for (const t of list) if (sameNumber.has(t.accountId) && !used.has(t.id) && !t.bank!.pending && byMeasure(formatAll(t), file.format)) push(there, `${t.date}|${t.amount}`, t)
    }
    if (there.size)
      for (const c of formatPairs(there, (i) => !plans[i])) {
        if (plans[c.i] || used.has(c.tx.id)) continue
        used.add(c.tx.id)
        plans[c.i] = { status: 'elsewhere', row: file.rows[c.i]!, key: keys[c.i]!, tx: c.tx, move: false, other: true }
      }
  }

  // An operation the user deleted (T39): its row stays out – by its key (below); without it, the closest pairs first,
  // each deleted one and each row once, only the bank's booked rows (a later purchase of the same shop comes in):
  // - a pending one the bank settled with another amount or day (B96) – by the settling measure; a row of the budget
  //   imported after the deletion – the row brought back („importuj mimo to”) – takes its deleted one as well: it hides
  //   no other purchase then;
  // - a booked one of the other format (AF-1: the list of operations ↔ the account history describe a row in other words)
  //   – by the B5 measure: the same amount ±3 days, a similar name, a day the file covers; a row of the budget in this
  //   format (by its key) takes its deleted one as well – the row is there, its deleted copy hides no other purchase.
  const deletedOut = new Set<number>()
  const deletedOther = new Set<number>()
  // Of another bank's CSV also of its own format (drugi przegląd R1, 1 – a row whose cells the bank changed, another key):
  // only a deleted one whose row the file has not by its key – else a new purchase like it would stay out with it.
  const fileKeys = file.format === 'csv' ? new Set(keys) : null
  const byKeyHere = (d: DeletedRow) => !!fileKeys && !!d.keys?.some((k) => fileKeys.has(k))
  const gone = deletedRows.filter((d) => d.accountId === accountId && (!d.format || (byMeasure(d.format, file.format) && !byKeyHere(d) && covers(d.date))))
  if (gone.length) {
    const goneOn = new Map<string, number[]>()
    gone.forEach((d, at) => push(goneOn, d.date, at))
    const pairs: Array<{ i: number; at: number; score: number }> = []
    file.rows.forEach((row, i) => {
      const p = plans[i]
      if (row.pending || deletedKeys.has(keys[i]!) || (p && p.status !== 'known')) return
      const since = p ? (p.tx.bank?.importedAt ?? p.tx.createdAt) : null
      const thisFormat = p?.status === 'known' && !p.other && formatOf(p.tx) === file.format
      for (let d = -MATCH_DAYS; d <= MATCH_DAYS; d++)
        for (const at of goneOn.get(addDays(row.date, d)) ?? []) {
          const del = gone[at]!
          const score = del.format
            ? (p && !thisFormat) || del.amount !== row.amount || !similarCounterparty(del.name, rowName(row))
              ? null
              : Math.abs(d)
            : since != null && since <= del.deletedAt
              ? null
              : settleScore(del.name, del, row)
          if (score != null) pairs.push({ i, at, score })
        }
    })
    pairs.sort((a, b) => a.score - b.score || a.i - b.i || a.at - b.at)
    const rowTaken = new Set<number>()
    const goneTaken = new Set<number>()
    for (const c of pairs) {
      if (rowTaken.has(c.i) || goneTaken.has(c.at)) continue
      rowTaken.add(c.i)
      goneTaken.add(c.at)
      if (plans[c.i]) continue
      deletedOut.add(c.i)
      if (gone[c.at]!.format) deletedOther.add(c.i)
    }
  }

  // The other side of a transfer between two accounts of the budget (F10, D87): a row of the transfer's amount here, ±3
  // days from its side here, joins the transfer – one operation for both sides (a one-sided one of before 1.7.0 becomes
  // one). No name to compare: the other account's bank names the transfer its own way. The closest days first, a
  // transfer in one operation before a one-sided one; each side and row once; a row of an operation the user deleted
  // never.
  if (budget.waiting.size) {
    const pairs: Array<{ i: number; tx: Transaction; days: number; side: 'other' | 'legacy' }> = []
    file.rows.forEach((row, i) => {
      if (plans[i] || deletedOut.has(i) || deletedKeys.has(keys[i]!)) return
      // A transfer naming no account (an import before 1.7.0 offered none): only a row the bank calls an own transfer.
      const own = isOwnTransferRow(row, ctx.ownNames)
      for (let d = -MATCH_DAYS; d <= MATCH_DAYS; d++)
        for (const w of budget.waiting.get(addDays(row.date, d)) ?? []) if (w.tx.amount === row.amount && (w.named || own)) pairs.push({ i, tx: w.tx, days: Math.abs(d), side: w.side })
    })
    pairs.sort((a, b) => a.days - b.days || Number(a.side === 'legacy') - Number(b.side === 'legacy') || a.i - b.i)
    for (const c of pairs) {
      if (plans[c.i] || used.has(c.tx.id) || locked(c.tx)) continue
      used.add(c.tx.id)
      plans[c.i] = { status: 'merge', row: file.rows[c.i]!, key: keys[c.i]!, tx: c.tx, side: c.side }
    }
  }

  // Operations typed by hand (the evening entries, D26): the same amount within ±3 days, a similar counterparty. A row
  // looks at the hand-typed ones of ±3 days (W18), in their order still.
  const nearOf = new Map<string, Transaction[]>()
  const manualNear = (date: string): Transaction[] => {
    if (!budget.manual.size) return []
    let near = nearOf.get(date)
    if (!near) {
      const found: Array<{ tx: Transaction; at: number }> = []
      for (let d = -MATCH_DAYS; d <= MATCH_DAYS; d++) for (const x of budget.manual.get(addDays(date, d)) ?? []) found.push(x)
      nearOf.set(date, (near = found.sort((a, b) => a.at - b.at).map((x) => x.tx)))
    }
    return near
  }
  const candidates: Array<{ i: number; tx: Transaction; days: number; named: boolean }> = []
  file.rows.forEach((row, i) => {
    if (plans[i] || deletedOut.has(i)) return
    for (const tx of manualNear(row.date)) {
      if (tx.amount !== row.amount || locked(tx)) continue
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

  // Possible duplicates (D77): a hand-typed operation left over, the same amount under another name or a close amount
  // under a similar name – the same amount first, then the closest date; each side once. Joined by default when
  // surely the same (a similar name; or a card purchase a day apart at most), else only when ticked (ICTTJ: a possible
  // duplicate is never taken by itself) – one not joined is still found later by the duplicates panel.
  const loose: Array<{ i: number; tx: Transaction } & LooseMatch> = []
  file.rows.forEach((row, i) => {
    if (plans[i] || deletedOut.has(i)) return
    const bank = { amount: row.amount, date: row.date, name: row.counterparty || row.description }
    for (const tx of manualNear(row.date)) {
      if (used.has(tx.id) || locked(tx)) continue
      const m = looseMatch(tx, bank)
      if (m) loose.push({ i, tx, ...m })
    }
  })
  loose.sort((a, b) => Number(b.exact) - Number(a.exact) || Number(b.strong) - Number(a.strong) || Number(b.similar) - Number(a.similar) || a.days - b.days || a.i - b.i)
  for (const c of loose) {
    if (plans[c.i] || used.has(c.tx.id)) continue
    used.add(c.tx.id)
    const row = file.rows[c.i]!
    plans[c.i] = { status: 'merge', row, key: keys[c.i]!, tx: c.tx, loose: c.exact ? 'name' : 'amount', ask: !looseSure(c, row.operation) }
  }

  // The new rows – and the matched hand-typed ones (B36: imported apart, each is decided as the file's row is). The cash
  // is another account than the file's (AP-33): never a transfer onto itself.
  // The file's account: a rule's condition of it (AP-45).
  const classifyCtx: ClassifyContext = { ...ctx, accountId, ...(ctx.cash && ctx.cash.id === accountId ? { cash: null } : {}) }
  const classified = file.rows.map((row, i) => {
    if (progress && i % PROGRESS_EVERY === 0) progress(i, file.rows.length)
    return plans[i] && plans[i]!.status !== 'merge' ? null : classifyRow(row, classifyCtx)
  })
  shareMerged(classified, file.rows)
  const plannedOf = (i: number): Planned => {
    const { decision, hint, brand, direction, target } = classified[i]!
    return { group: groupKey(brand.key, direction, decision), brand: brand.key, brandLabel: brand.brand?.label ?? null, words: brand.words, target, direction, decision, hint }
  }
  const rows: RowPlan[] = file.rows.map((row, i) => {
    const p = plans[i]
    if (p?.status === 'merge') return { ...p, planned: plannedOf(i) }
    if (p) return p
    if (deletedKeys.has(keys[i]!) || deletedOut.has(i)) return { status: 'deleted', row, key: keys[i]!, ...(deletedOther.has(i) && !deletedKeys.has(keys[i]!) ? { other: true } : {}), ...plannedOf(i) }
    return { status: 'new', row, key: keys[i]!, ...plannedOf(i) }
  })

  const period = file.period ?? (days.length ? { from: days[0]!, to: days.at(-1)! } : null)
  // Only a list of operations shows pending rows (the account history has the booked ones only).
  // A pending operation of a newer version (B95) is read only here: never offered for removal.
  // A transfer's other side gone from the list (F10) is not offered: removing it would take the transfer's other side too.
  const vanished =
    period && file.format === 'lista' ? budget.pending.filter((t) => !used.has(t.id) && !locked(t) && !isSideView(t) && t.date >= period.from && t.date <= period.to) : []
  return { accountId, format: file.format, rows, vanished, period, cash: classifyCtx.cash?.id ?? null }
}

/** Keys of a row (`altKeys`) with more of them, each once, the last 20. */
const withKeys = (keys: readonly string[] | undefined, more: ReadonlyArray<string | undefined>): string[] => [...new Set([...(keys ?? []), ...more.filter((k): k is string => !!k)])].slice(-20)

/**
 * A change of the import's that only remembers keys of an operation's rows (`altKeys` – the other format's, B5): nothing
 * the user sees (AF-63) – no backup and no import to take back for it.
 */
export function keysOnly(before: Transaction | undefined, after: Transaction): boolean {
  if (!before) return false
  const bare = (t: Transaction) => ({ ...t, bank: t.bank ? { ...t.bank, altKeys: undefined } : t.bank, counterBank: t.counterBank ? { ...t.counterBank, altKeys: undefined } : t.counterBank })
  return deepEqual(bare(before), bare(after))
}

/**
 * Names the user merged (1.2.2) are one counterparty, so one group: a row of one name nothing recognized takes what
 * another name of it is recognized as most often – its rule, its chain, a keyword of its name („MOKKA” as „KAWIARNIA
 * MOKKA”). The app's own recognition (an ATM, an own transfer), a keyword of a title and a container's payment are
 * about their own operation: never passed on.
 */
function shareMerged(list: Array<Classified | null>, rows: readonly MbankRow[]): void {
  const byBrand = new Map<string, number[]>()
  list.forEach((c, i) => {
    if (!c) return
    const k = `${c.brand.key}|${c.direction}`
    const at = byBrand.get(k)
    if (at) at.push(i)
    else byBrand.set(k, [i])
  })
  for (const at of byBrand.values()) {
    if (new Set(at.map((i) => list[i]!.target.raw)).size < 2) continue
    const donors = new Map<string, { i: number; n: number }>()
    for (const i of at) {
      const d = list[i]!.decision
      if (d.source === 'none' || d.source === 'builtin' || d.byTitle || d.containerId) continue
      const sig = proposalSig(d)
      const prev = donors.get(sig)
      donors.set(sig, { i: prev?.i ?? i, n: (prev?.n ?? 0) + 1 })
    }
    const best = [...donors.values()].sort((a, b) => b.n - a.n || a.i - b.i)[0]
    if (!best) continue
    const donor = list[best.i]!
    const name = rows[best.i]!.counterparty || rows[best.i]!.description
    for (const i of at) {
      const c = list[i]!
      // A household member's money asked about (inflow „pytaj”) stays their question (B41): only a decision about the
      // same member's money passes on – never a plain income that would not pay their debt back.
      if (c.decision.household && !(donor.decision.household && donor.decision.memberId === c.decision.memberId)) continue
      // A container is linked by its exact payee (`classifyRow`), not passed on.
      if (c.decision.source === 'none') list[i] = { ...c, decision: { ...donor.decision, containerId: null, ruleId: null, reason: `jak „${name}” (połączone nazwy)` } }
    }
  }
}

// ------------------------------------------------------------------ groups and themes (1.2.1, D75)

/** What kind of operation an undecided group is (its theme when the bank gives no hint). */
export type OpKind = 'card' | 'transfer' | 'fee' | 'other'

export function opKindOf(operation: string): OpKind {
  if (/^(ZAKUP|BLIK ZAKUP|PŁATNOŚĆ|PLATNOSC|TRANSAKCJA)/.test(operation)) return 'card'
  if (/^(PRZELEW|BLIK P2P|ZLECENIE|POLECENIE|WPŁATA|WPLATA|UZNANIE|PRZEKAZ|OBCIĄŻENIE|OBCIAZENIE)/.test(operation)) return 'transfer'
  if (isFeeOperation(operation)) return 'fee'
  return 'other'
}

/**
 * The words the import's search finds a type of operation by (AP-34, IM sp. 9): the bank writes it inflected
 * („WYPŁATA W BANKOMACIE” – no „bankomat” in it), one searches by its name.
 */
function kindWords(operation: string): string {
  if (isAtmOperation(operation)) return 'bankomat wypłata gotówka gotówki'
  const kind = opKindOf(operation)
  return kind === 'card' ? 'karta kartą zakup' : kind === 'transfer' ? 'przelew' : kind === 'fee' ? 'opłata opłaty banku prowizja' : ''
}

/**
 * Is a group's theme its proposal: a recognized one – or a household member's money still to be asked about (D80 b):
 * never in one theme with strangers' money, whose decision would take the member away.
 */
const byProposal = (source: DecisionSource, d: Pick<ImportDecision, 'household'>): boolean => source !== 'none' || d.household

/** The user's own rules are the surest; nothing is the weakest – a group is as sure as its least sure row. */
const SURENESS: Record<DecisionSource, number> = { none: 0, keyword: 1, brand: 2, builtin: 3, rule: 4 }

export interface ImportGroup {
  group: string
  brand: string
  direction: Direction
  /** A chain of the dictionary (never offered as a similar name – 1.2.2). */
  chain: boolean
  /** The chain's name, else the name the bank writes most often. */
  label: string
  /** The names the bank wrote (more than one = merged by the brand). */
  names: string[]
  rows: NewRow[]
  sum: number
  from: string
  to: string
  /** The decision as proposed (a rule, the app's recognition, a chain, a keyword, or nothing). */
  proposed: Choice
  containerId: string | null
  /** The least sure source of its rows. */
  source: DecisionSource
  reason: string
  /** From a keyword of the title: never remembered as a rule of the counterparty. */
  byTitle: boolean
  /** The bank's category's hint (a category id), the most frequent in the group. */
  hint: string | null
  bankCategory: string
  theme: string
}

export type ThemeBasis =
  /** Groups with the same proposal: one category, kind, container… */
  | { kind: 'proposal'; choice: Choice; containerId: string | null }
  /** Undecided groups the bank's category hints the same way (D68: a hint, not applied by itself). */
  | { kind: 'hint'; categoryId: string; bankCategories: string[] }
  /** Undecided groups without a hint: by the kind of operation. */
  | { kind: 'op'; op: OpKind }

export interface ImportTheme {
  theme: string
  direction: Direction
  basis: ThemeBasis
  groups: ImportGroup[]
  /** Operations in it. */
  count: number
  sum: number
  /** The least sure source of its groups ('rule' = all of them the user's rules). */
  source: DecisionSource
}

/**
 * Groups of the new rows, the biggest first; each knows its theme. `restored` = rows of deleted operations brought back
 * (`ImportChoices.restoreDeleted`, N90): decided as new ones – in their groups and themes.
 */
export function importGroups(plan: ImportPlan | null, restored: Readonly<Record<string, boolean>> = {}): ImportGroup[] {
  if (!plan) return []
  const byGroup = new Map<string, NewRow[]>()
  for (const p of plan.rows) {
    const row: NewRow | null = p.status === 'new' ? p : p.status === 'deleted' && restored[p.key] ? { ...p, status: 'new' } : null
    if (!row) continue
    const list = byGroup.get(row.group)
    if (list) list.push(row)
    else byGroup.set(row.group, [row])
  }
  const out: ImportGroup[] = []
  for (const [group, rows] of byGroup) {
    const first = rows[0]!
    const weakest = rows.reduce((a, b) => (SURENESS[b.decision.source] < SURENESS[a.decision.source] ? b : a))
    const names = new Map<string, number>()
    const hints = new Map<string, number>()
    for (const p of rows) {
      const name = p.row.counterparty || p.row.operation || '(bez nazwy)'
      names.set(name, (names.get(name) ?? 0) + 1)
      if (p.hint) hints.set(`${p.hint}|${p.row.category}`, (hints.get(`${p.hint}|${p.row.category}`) ?? 0) + 1)
    }
    const most = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null
    // A bank's fee is never a hint's (AP-34, IM.19): mBank names its category („Opłaty i odsetki”), the theme is „Opłaty
    // banku” – the fee waits there without a category, never with the courses of one bank's category.
    const fee = opKindOf(first.row.operation) === 'fee'
    const [hint, bankCategory] = (fee ? [null, ''] : (most(hints)?.split('|') ?? [null, ''])) as [string | null, string]
    const source = weakest.decision.source
    const dates = rows.map((p) => p.row.date).sort()
    out.push({
      group,
      brand: first.brand,
      direction: first.direction,
      chain: first.brandLabel != null,
      label: first.brandLabel ?? most(names)!,
      names: [...names.keys()],
      rows,
      sum: rows.reduce((s, p) => s + p.row.amount, 0),
      from: dates[0]!,
      to: dates.at(-1)!,
      proposed: choiceOf(first.decision),
      containerId: first.decision.containerId,
      source,
      reason: weakest.decision.reason,
      byTitle: first.decision.byTitle,
      hint,
      bankCategory,
      // A hint's theme is one category of the bank (AP-34, IM sp. 5): „Edukacja” and „Opłaty i odsetki” hinting the same
      // category are two themes – „Przyjmij podpowiedzi” never gives one category to what the bank tells apart.
      theme: byProposal(source, first.decision)
        ? `${first.direction}|=${proposalSig(first.decision)}`
        : hint
          ? `${first.direction}|hint:${hint}|${bankCategory}`
          : `${first.direction}|op:${opKindOf(first.row.operation)}`
    })
  }
  return out.sort((a, b) => b.rows.length - a.rows.length || a.label.localeCompare(b.label))
}

/** Themes of the groups (spec of D75: grouped by category – one decision for many brands), the biggest first. */
export function importThemes(groups: readonly ImportGroup[]): ImportTheme[] {
  const map = new Map<string, ImportTheme>()
  for (const g of groups) {
    let t = map.get(g.theme)
    if (!t) {
      const basis: ThemeBasis =
        byProposal(g.source, g.proposed)
          ? { kind: 'proposal', choice: g.proposed, containerId: g.containerId }
          : g.hint
            ? { kind: 'hint', categoryId: g.hint, bankCategories: [] }
            : { kind: 'op', op: opKindOf(g.rows[0]!.row.operation) }
      t = { theme: g.theme, direction: g.direction, basis, groups: [], count: 0, sum: 0, source: g.source }
      map.set(g.theme, t)
    }
    t.groups.push(g)
    t.count += g.rows.length
    t.sum += g.sum
    if (SURENESS[g.source] < SURENESS[t.source]) t.source = g.source
    if (t.basis.kind === 'hint' && g.bankCategory && !t.basis.bankCategories.includes(g.bankCategory)) t.basis.bankCategories.push(g.bankCategory)
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme))
}

/**
 * The import's search (1.2.1): every word in the group's names, the bank's category and the category it gets – the whole group – or in a row's
 * description, title and date (dd.mm.rrrr) – only those rows; an amount („12,49”) also finds the rows of that amount.
 * Groups not found are left out of the map.
 */
export function searchGroups(groups: readonly ImportGroup[], query: string, labelOf: (group: ImportGroup) => string = () => ''): Map<string, NewRow[] | 'all'> {
  const out = new Map<string, NewRow[] | 'all'>()
  const q = query.trim()
  if (!q) {
    for (const g of groups) out.set(g.group, 'all')
    return out
  }
  const amount = queryAmount(q)
  const ws = fold(q).split(/\s+/).filter(Boolean)
  const has = (text: string) => ws.every((w) => text.includes(w))
  for (const g of groups) {
    // The category the group gets (`labelOf` – its decision, N82); the reason of a proposal is no name nor category.
    const groupText = fold([g.label, ...g.names, g.bankCategory, labelOf(g)].join(' \u0001 '))
    if (has(groupText)) {
      out.set(g.group, 'all')
      continue
    }
    const rows = g.rows.filter((p) => {
      if (amount != null && Math.abs(p.row.amount) === amount) return true
      const d = p.row.date
      // The type of operation too (AP-34, IM sp. 9): as written and by its name – „bankomat” finds „WYPŁATA W BANKOMACIE”.
      return has(`${groupText} \u0001 ${fold([p.row.description, p.row.title, p.row.category, p.row.operation, kindWords(p.row.operation), `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`].join(' \u0001 '))}`)
    })
    if (rows.length) out.set(g.group, rows.length === g.rows.length ? 'all' : rows)
  }
  return out
}

// ------------------------------------------------------------------ the user's choices → records

/** A group's or a row's decision as the user left it. */
export interface Choice {
  kind: ImportDecision['kind']
  categoryId: string | null
  refundable: boolean
  household: boolean
  /** The household member (D80): who finances (`refundable`), whose money it is (`household`); null = the first one. */
  memberId: string | null
  /** A household member's money: the rest beyond their debt is their advance (else income). */
  advance: boolean
  /** Purpose of an incoming transfer: 'repay' (repay purchases), 'income' (independent income), 'advance' (deposit). */
  inflowKind?: 'repay' | 'income' | 'advance'
  /** A purchase the member gives (D83, with `refundable`): nobody owes it. */
  gift?: boolean
  /** A purchase financed by several people (D83): each row's amount split so. */
  share?: Share | null
  /**
   * A household member's money carrying others' (D81, N-PC-10 – „w tym za…”): their parts, the rest the sender's. A part
   * repaying a loan given (D100, T357 – „w tym spłata pożyczki”, of any inflow: a member's money or plain income): its
   * `loanId`, no member (`memberId` ''). `each` – a rule's loan part (T358) or „w tym za” member (D102: debts first, no
   * fixed PLN amount). `surplus` – a surplus part whose `'ask'` member has not answered yet; `advanceChosen` – answered on
   * a repaying line.
   */
  shares?: ReadonlyArray<{
    memberId: string
    amount: number
    advance: boolean
    inflowKind?: 'repay' | 'income' | 'advance'
    loanId?: string
    each?: true
    ask?: true
    surplus?: true
    advanceChosen?: boolean
  }>
  /** How to split the surplus beyond all debts of `memberId` and the other members in `shares` (D102). */
  surplusSplit?: 'even' | 'debts'
  counterAccountId: string | null
  /** The loan of the Radar a loan's operation belongs to (B34); none = a loan without its record. */
  loanId?: string | null
}

/**
 * Does a decision teach the import a rule of its brand? Never the tax, XTB, a loan without its record (decided operation
 * by operation – N14), nor an expense of no category nobody else pays (B37: it says nothing of the brand, and would hide
 * its chain). Money in repaying a loan of the Radar may (D100, T358 – the rule names it, valid while it is open) – asked
 * only, „zapamiętaj” starts off for it (`remembersByDefault`).
 */
export const learnable = (c: Choice, direction?: Direction): boolean =>
  (c.kind === 'loan' ? !!c.loanId && direction === 'in' : !PER_OPERATION_KINDS.includes(c.kind)) && !(c.kind === 'expense' && !c.categoryId && !c.refundable && !c.share)

/** Does a decision repay a loan (D100): the loan's whole repayment of the Radar or a part of an inflow? */
export const repaysLoan = (c: Pick<Choice, 'kind' | 'loanId' | 'shares'> | undefined): boolean => !!c && ((c.kind === 'loan' && !!c.loanId) || !!c.shares?.some((x) => x.loanId))

/**
 * Is a decision remembered as a rule unless the user says no (the import's „zapamiętaj”)? Yes – except a loan's
 * repayment (D100, T358: a rule of it only when asked – N14 stays the default) chosen over a decision that did not repay one;
 * a decision repaying none chosen over one that did – back to what the user had before the loan's (`kept` – przegląd N2
 * 3.1: their own „no” stays), none kept – the default (przegląd N2 2.9: the „no” was the loan's).
 */
export const remembersByDefault = (c: Choice, before: Choice | undefined, was: boolean | undefined, kept?: boolean): boolean =>
  repaysLoan(c) !== repaysLoan(before) ? (repaysLoan(c) ? false : (kept ?? true)) : (was ?? true)

/**
 * The user's „zapamiętaj” kept while a decision repays a loan (przegląd N2 3.1 – `remembersByDefault`'s `kept`): as it was
 * before the loan's repayment was chosen; undefined – none (a decision repaying none, or nothing the user had).
 */
export const rememberKept = (c: Choice, before: Choice | undefined, was: boolean | undefined, kept: boolean | undefined): boolean | undefined =>
  !repaysLoan(c) ? undefined : repaysLoan(before) ? kept : was

export interface ImportChoices {
  /** Per theme (`ImportGroup.theme`): the decision for all its groups… */
  themes: Record<string, Choice>
  /** Themes whose decision becomes rules of their brands. */
  rememberThemes: Record<string, boolean>
  /** …per group (`RowPlan.group`): the decision for all its rows… */
  groups: Record<string, Choice>
  /** …and per row (`RowPlan.key`) where the user changed one row. */
  rows: Record<string, Choice>
  /** Groups whose decision becomes a rule (`ImportRule`). */
  remember: Record<string, boolean>
  /**
   * Groups' and themes' „zapamiętaj” as the user had it before a loan's repayment was chosen for them (`rememberKept`,
   * przegląd N2 3.1): back with a decision repaying none.
   */
  rememberBeforeLoan?: Record<string, boolean>
  rememberThemesBeforeLoan?: Record<string, boolean>
  /**
   * Manual entries matched (`RowPlan.key`): true = stay separate (the row is imported as a new operation); false =
   * joined though the match asks (`ask`, a possible duplicate); missing = as proposed.
   */
  noMerge: Record<string, boolean>
  /** Vanished pending operations (ids) to delete. */
  removeVanished: Record<string, boolean>
  /** Rows of deleted operations (`RowPlan.key`) to import again. */
  restoreDeleted: Record<string, boolean>
  /** New rows (`RowPlan.key`) the user leaves out of this import (1.2.1): the next file brings them again. */
  skip: Record<string, boolean>
  /** Rows imported before onto another account (`RowPlan.key`, B35): moved here (true) or left there (false); missing = as proposed. */
  moveHere: Record<string, boolean>
  /** Rows with a copy on another account (`RowPlan.key`, `RowCopy` – AF-9): removed (true) or left (false); missing = as proposed. */
  removeCopies?: Record<string, boolean>
  /**
   * Groups decided by the app for the user (N85: „+ domownik” – the new member's money, the rest as income for now): no
   * answer of the user – the theme still asks, the person's „zaliczka / przychód” is not remembered from it.
   */
  implicit?: Record<string, true>
}

/** Is an operation imported onto another account moved here (B35)? */
export const movesHere = (p: Extract<RowPlan, { status: 'elsewhere' }>, choices: Pick<ImportChoices, 'moveHere'>): boolean => choices.moveHere[p.key] ?? p.move

/** Is the copy of a row on another account removed (AF-9, `RowCopy`)? A blocked one never. */
export const removesCopy = (p: Extract<RowPlan, { status: 'known' }>, choices: Pick<ImportChoices, 'removeCopies'>): boolean =>
  !!p.copy && !p.copy.blocked && (choices.removeCopies?.[p.key] ?? p.copy.remove)

/** Is a matched hand-typed operation joined? `noMerge` false = ticked by the user (a possible duplicate that asks). */
export const joins = (p: Extract<RowPlan, { status: 'merge' }>, choices: Pick<ImportChoices, 'noMerge'>): boolean => (p.ask ? choices.noMerge[p.key] === false : !choices.noMerge[p.key])

export const choiceOf = (d: ImportDecision): Choice => {
  const shares =
    d.kind === 'income'
      ? [
          ...(d.alsoFor?.map((x) => ({ memberId: x.memberId, amount: 0, advance: x.advance, each: true as const, ...(x.ask ? { ask: true as const } : {}) })) ?? []),
          ...(d.loanPart ? [{ memberId: '', amount: d.loanPart.amount, advance: false, loanId: d.loanPart.loanId, each: true as const }] : [])
        ]
      : []
  return {
    kind: d.kind,
    categoryId: d.categoryId,
    refundable: d.refundable,
    household: d.household,
    memberId: d.refundable || d.household ? d.memberId : null,
    advance: d.household && d.advance,
    inflowKind: d.household ? (d.inflowKind ?? 'repay') : undefined,
    gift: d.refundable && d.gift,
    share: d.kind === 'expense' && !d.refundable ? d.share : null,
    // A rule's part repaying a loan (D100) or other members' debts („w tym za”, D102): of each inflow, at most what they owe (`rowShares`).
    ...(shares.length ? { shares } : {}),
    ...(d.household && d.alsoFor?.length && d.surplusSplit ? { surplusSplit: d.surplusSplit } : {}),
    counterAccountId: d.counterAccountId,
    loanId: d.kind === 'loan' ? d.loanId : null
  }
}

/** The member of a choice that has one (null = the first; '' = none). */
const memberKey = (c: Choice) => (c.refundable || c.household ? (c.memberId ?? HOUSE_MEMBER_ID) : '')

const sharesKey = (xs: Choice['shares']): string =>
  xs
    ?.filter((x) => x.amount > 0 || (x.each && !x.loanId))
    .map((x) => `${shareWho(x)}=${x.each && !x.loanId ? '*' : x.amount}:${x.surplus ? '?' : (x.inflowKind ?? (x.advance ? 'a' : 'i'))}${x.advanceChosen ? '!' : ''}`)
    .join(',') ?? ''

export const sameChoice = (a: Choice, b: Choice): boolean =>
  a.kind === b.kind &&
  a.categoryId === b.categoryId &&
  a.refundable === b.refundable &&
  a.household === b.household &&
  memberKey(a) === memberKey(b) &&
  (a.household ? (a.inflowKind ?? 'repay') : '') === (b.household ? (b.inflowKind ?? 'repay') : '') &&
  (a.household && a.advance) === (b.household && b.advance) &&
  (a.household ? (a.surplusSplit ?? '') : '') === (b.household ? (b.surplusSplit ?? '') : '') &&
  (a.refundable && !!a.gift) === (b.refundable && !!b.gift) &&
  shareKey(a.share) === shareKey(b.share) &&
  sharesKey(a.shares) === sharesKey(b.shares) &&
  a.counterAccountId === b.counterAccountId &&
  (a.kind === 'loan' ? (a.loanId ?? null) : null) === (b.kind === 'loan' ? (b.loanId ?? null) : null)

export interface ImportResult {
  create: Transaction[]
  update: Transaction[]
  remove: string[]
  rules: ImportRule[]
  /** Counts for the summary; `excluded` = new rows the user left out (`ImportChoices.skip`). */
  counts: ImportCounts
}

/** `moved` = operations of this file found on another account and moved here (B35); `sides` – see the type. */
export type ImportCounts = {
  created: number
  merged: number
  settled: number
  known: number
  removed: number
  skipped: number
  excluded: number
  moved: number
  /** Rows joined as the other side of a transfer between two accounts of the budget (F10). */
  sides: number
  /** Copies of the file's rows on another account removed (AF-9, `RowCopy`). */
  copies: number
}

/**
 * What a rule says, from a decision (the import's learning, a rule edited in the settings – F22). `rows` – how many inflows
 * the decision's lines are for together (a group's or a theme's, T328; the rule's editor – one).
 */
export function ruleDecisionOf(
  c: Choice,
  rows = 1
): Pick<
  ImportRule,
  'kind' | 'categoryId' | 'refundable' | 'household' | 'memberId' | 'gift' | 'share' | 'counterAccountId' | 'inflowKind' | 'loanId' | 'loanAmount' | 'alsoFor' | 'surplusSplit'
> {
  // A loan of the Radar it repays (D100, T358): the whole inflow (kind 'loan'), or a part of an income – its first – of
  // each inflow (T368): a rule's own (`each`) or of one inflow; a total of more inflows is no amount of each – none.
  const part = c.kind === 'income' ? c.shares?.find((x) => x.loanId && x.amount > 0 && (x.each || rows <= 1)) : undefined
  const senderId = c.memberId ?? HOUSE_MEMBER_ID
  const repay = c.kind === 'income' && c.household && (c.inflowKind ?? 'repay') === 'repay'
  // Other members whose debts the inflow also settles (D102 – debts first, without fixed PLN amounts).
  const alsoFor = repay
    ? [...new Set((c.shares ?? []).filter((x) => !x.loanId && x.memberId && x.memberId !== senderId && (x.amount > 0 || x.each)).map((x) => x.memberId))]
    : []
  const surplusSplit = alsoFor.length > 0 && (c.surplusSplit === 'even' || c.surplusSplit === 'debts') ? c.surplusSplit : undefined
  return {
    loanId: c.kind === 'loan' ? (c.loanId ?? undefined) : (part?.loanId ?? undefined),
    loanAmount: part?.amount ?? undefined,
    alsoFor: alsoFor.length ? alsoFor : undefined,
    surplusSplit,
    kind: c.kind,
    categoryId: c.kind === 'expense' ? c.categoryId : null,
    refundable: c.kind === 'expense' && c.refundable,
    household: c.kind === 'income' && c.household,
    memberId: (c.kind === 'expense' && c.refundable) || (c.kind === 'income' && c.household) ? (c.memberId ?? HOUSE_MEMBER_ID) : null,
    gift: c.kind === 'expense' && c.refundable && c.gift ? true : undefined,
    share: c.kind === 'expense' && !c.refundable && c.share ? c.share : undefined,
    counterAccountId: c.kind === 'transfer' ? c.counterAccountId : null,
    inflowKind: c.kind === 'income' && c.household ? c.inflowKind : undefined
  }
}

// ------------------------------------------------------------------ other members' parts of a member's money (D81, AF-27)

/** A household member's part of a row's money („w tym za…”) – or a loan's (D100, `loanId`). */
export type SharePart = NonNullable<Choice['shares']>[number]

/** The key of a loan among the members' keys of the parts' spread (D100, T357): its debt caps its parts like a member's. */
export const loanKey = (loanId: string): string => `loan:${loanId}`

/** Whose a part is: its member, or its loan's key (`loanKey`). */
export const shareWho = (x: Pick<SharePart, 'memberId' | 'loanId'>): string => (x.loanId ? loanKey(x.loanId) : x.memberId)

/** Does the import make a new operation of the row (as `buildImport`): new, brought back, kept apart from a typed entry – not left out. */
export const createsRow = (p: RowPlan, choices: ImportChoices): boolean =>
  p.status === 'merge' ? !joins(p, choices) : p.status === 'new' ? !choices.skip[p.key] : p.status === 'deleted' && !!choices.restoreDeleted[p.key] && !choices.skip[p.key]

/** A row's decision: its own, its group's (`from` `g:<group>`), its theme's (`t:<theme>`), else the proposal. */
function rowDecision(p: RowPlan, choices: ImportChoices, themeOf: ReadonlyMap<string, string>): { c: Choice; from: string | null; own: boolean; group: string; theme: string | undefined } {
  const planned = p.status === 'merge' ? p.planned : (p as PlannedRow)
  const group = planned.group
  const theme = themeOf.get(group)
  const own = choices.rows[p.key]
  if (own) return { c: own, from: null, own: true, group, theme }
  const byGroup = group ? choices.groups[group] : undefined
  if (byGroup) return { c: byGroup, from: `g:${group}`, own: false, group, theme }
  const byTheme = theme ? choices.themes[theme] : undefined
  if (byTheme) return { c: byTheme, from: `t:${theme}`, own: false, group, theme }
  return { c: choiceOf(planned.decision), from: null, own: false, group, theme }
}

/**
 * Money coming in decided as income: a member's money (D80 – others' parts, a loan's part) or plain income (a loan's
 * part only – D100); the only decisions with parts.
 */
const incomeIn = (c: Choice, p: RowPlan): boolean => c.kind === 'income' && p.row.amount > 0

/** The parts a decision gives (D81, D100): a member's money – all its lines; plain income – its loans' only. */
const partsOfChoice = (c: Choice): readonly SharePart[] => (c.household ? (c.shares ?? []) : (c.shares ?? []).filter((x) => x.loanId))

/** A part – or a sender's own money – that repays what the member owes first (not their income, advance or unanswered surplus – `inflowKind`, `surplus`). */
const repaysPart = (x: Pick<SharePart, 'inflowKind' | 'surplus'>): boolean => !x.surplus && (!x.inflowKind || x.inflowKind === 'repay')

/** Where a group's or a theme's „w tym za” went: each line's amount typed and the rows it was given from (in their order). */
export interface SpreadLine {
  line: number
  memberId: string
  /** What the line gives at most: its amount – of a rule's part of each inflow (`each`), that amount for each row. */
  typed: number
  given: Array<{ key: string; date: string; amount: number }>
  /** A rule's loan part (T358): its amount of each inflow. */
  each?: number
}

export interface SharesSpread {
  /** Each row's parts as the import writes them (none – no key). */
  parts: Map<string, SharePart[]>
  /** By the decision (`g:<group>`, `t:<theme>`): its lines spread over its rows. */
  spread: Map<string, SpreadLine[]>
  /**
   * The member's money a decision of each group and theme (`g:…`, `t:…`) takes: the rows without their own decision (of a
   * theme – also not of a group deciding them), and their sum.
   */
  rows: Map<string, { keys: string[]; sum: number }>
  /** All the repayments of each member in the file: their own money that repays and their parts (at most each row's money). */
  total: Map<string, number>
}

/**
 * The other members' parts each row of a member's money carries (D81, AF-27 – „w tym za X”) and the loans' parts of any
 * money in decided as income (D100, T357 – a loan's key `loanKey` stands for a member: its debt is the loan's open
 * amount, the file's whole repayments of it its own money): a row's own decision as typed; a group's or a theme's spread
 * over its rows in their order (the oldest first – „po kolei”): each row at most what is left of its money, the line at
 * most its amount, and all the repayments of a member – at most what they owe (`owed`, `owedWithFile`: with the file's
 * purchases) less their own money of the file that repays (D80: it pays what they owe first, whatever its day) and what
 * the rows' own decisions give them. A transfer of theirs whose group or theme gives others parts counts whole until its
 * parts are known (in the rows' order): never more for them than they owe. No `owed` – no debt known: the amount typed
 * only. A part beyond the debt only by a row's own decision (the user's, typed for that transfer); a rule's part (a
 * proposal, D100) – of its row only, never beyond the loan's debt.
 */
export function rowShares(plan: ImportPlan, choices: ImportChoices, owed?: ReadonlyMap<string, number>): SharesSpread {
  const groups = importGroups(plan, choices.restoreDeleted)
  const themeOf = new Map(groups.map((g) => [g.group, g.theme]))
  const out: SharesSpread = { parts: new Map(), spread: new Map(), rows: new Map(), total: new Map() }
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v)
  const sender = (c: Choice) => c.memberId ?? HOUSE_MEMBER_ID
  // The sender's own money repays their debt first: a member's money of „spłata” only (plain income is nobody's).
  const repaysOwn = (c: Choice) => c.household && repaysPart(c)
  // A line the decision gives: of a member's money – another member's or a loan's; of plain income – a loan's only.
  const givesLine = (c: Choice, x: SharePart) => (x.loanId ? true : c.household && x.memberId !== sender(c))
  const fresh = plan.rows.filter((p) => createsRow(p, choices)).sort((a, b) => (a.row.date < b.row.date ? -1 : a.row.date > b.row.date ? 1 : 0))
  const shared: Array<{ p: RowPlan; c: Choice; from: string }> = []
  const explicit = new Map<string, number>()
  // Each member's own money of the file that repays (the sender's, beyond the parts of others in it) – and each loan's
  // whole repayments of the file (D100).
  const paid = new Map<string, number>()
  for (const p of fresh) {
    const d = rowDecision(p, choices, themeOf)
    if (d.c.kind === 'loan' && d.c.loanId && p.row.amount > 0) {
      add(paid, loanKey(d.c.loanId), p.row.amount)
      add(out.total, loanKey(d.c.loanId), p.row.amount)
      continue
    }
    if (!incomeIn(d.c, p)) continue
    // The rows a decision of the group – and of the theme, for a group without its own – would take.
    if (!d.own)
      for (const k of [`g:${d.group}`, ...(d.theme && d.from !== `g:${d.group}` ? [`t:${d.theme}`] : [])]) {
        const r = out.rows.get(k) ?? out.rows.set(k, { keys: [], sum: 0 }).get(k)!
        r.keys.push(p.key)
        r.sum += p.row.amount
      }
    const own = repaysOwn(d.c)
    if (!partsOfChoice(d.c).length) {
      if (own) {
        add(paid, sender(d.c), p.row.amount)
        add(out.total, sender(d.c), p.row.amount)
      }
      continue
    }
    // A group's, a theme's – or a rule's for its row alone (a proposal: never beyond the loan's or member's debt).
    const from = d.from ?? (d.own && !d.c.shares?.some((x) => x.each && !x.loanId) ? null : `r:${p.key}`)
    if (from) {
      // Its parts come below: the sender's money counted whole until then.
      if (own) add(paid, sender(d.c), p.row.amount)
      shared.push({ p, c: d.c, from })
      continue
    }
    // The row's own: as typed (the ledger reads at most the row's money – `incomeShares`); its repayments count.
    const parts = d.c.shares!.filter((x) => x.amount > 0 && givesLine(d.c, x))
    let money = p.row.amount
    for (const x of parts) {
      const counted = Math.min(x.amount, money)
      money -= counted
      if (repaysPart(x)) {
        add(explicit, shareWho(x), counted)
        add(out.total, shareWho(x), counted)
      }
    }
    if (parts.length) out.parts.set(p.key, parts.map((x) => ({ ...x })))
    if (own && money > 0) {
      add(paid, sender(d.c), money)
      add(out.total, sender(d.c), money)
    }
  }
  const left = new Map<string, number>()
  // The groups' and themes' repayments given each member so far.
  const given = new Map<string, number>()
  const rowMoneyLeft = new Map<string, number>()
  for (const { p, c, from } of shared) {
    let money = p.row.amount
    const parts: SharePart[] = []
    const lines = out.spread.get(from) ?? out.spread.set(from, []).get(from)!
    c.shares!.forEach((x, line) => {
      if (!givesLine(c, x)) return
      const id = shareWho(x)
      const ruleMember = !!x.each && !x.loanId
      let spread = lines.find((l) => l.line === line)
      if (!spread)
        lines.push(
          (spread = {
            line,
            memberId: id,
            typed: ruleMember ? (owed?.get(id) ?? 0) : x.each ? 0 : Math.max(0, x.amount),
            given: [],
            ...(x.each && x.loanId ? { each: Math.max(0, x.amount) } : {})
          })
        )
      // A rule's part of each inflow (T358, przegląd N2 2.2): its amount for this row – never one total of the decision's.
      if (x.each && x.loanId) spread.typed += Math.max(0, x.amount)
      const k = x.each ? `${p.key}|${from}|${line}` : `${from}|${line}`
      const typed = ruleMember ? (owed ? Infinity : Math.max(0, x.amount)) : (left.get(k) ?? Math.max(0, x.amount))
      // A repayment never beyond the debt; a member's income or advance part (no repayment) – as typed.
      const repays = repaysPart(x)
      const cap = owed && repays ? Math.max(0, (owed.get(id) ?? 0) - (explicit.get(id) ?? 0) - (paid.get(id) ?? 0) - (given.get(id) ?? 0)) : Infinity
      const amount = Math.max(0, Math.min(typed, cap, money))
      if (!ruleMember) left.set(k, typed - amount)
      if (amount <= 0) return
      money -= amount
      parts.push({ ...x, amount })
      spread.given.push({ key: p.key, date: p.row.date, amount })
      if (repays) {
        add(given, id, amount)
        add(out.total, id, amount)
      }
    })
    if (parts.length) out.parts.set(p.key, parts)
    rowMoneyLeft.set(p.key, money)
    // The sender's own money is what the parts left of it: the rest of what was counted whole is theirs no more.
    if (repaysOwn(c)) {
      add(paid, sender(c), money - p.row.amount)
      if (money > 0) add(out.total, sender(c), money)
    }
  }
  // A decision with `surplusSplit` and no manual surplus lines (e.g. a rule of „w tym za” with „po równo” / „proporcjonalnie do długów”,
  // D102): once every debt is repaid in full (the sender's too), the remaining surplus is split among the people and spread over its rows.
  if (owed) {
    const byFrom = new Map<string, Array<{ p: RowPlan; c: Choice }>>()
    for (const item of shared) {
      const list = byFrom.get(item.from) ?? byFrom.set(item.from, []).get(item.from)!
      list.push(item)
    }
    for (const items of byFrom.values()) {
      const c = items[0]!.c
      if (!c.household || (c.surplusSplit !== 'even' && c.surplusSplit !== 'debts') || c.shares?.some((x) => !x.loanId && !repaysPart(x))) continue
      const senderId = sender(c)
      const seen = new Set<string>()
      const others = (c.shares ?? []).filter((x) => {
        if (x.loanId || !x.memberId || x.memberId === senderId || (x.amount <= 0 && !x.each) || seen.has(x.memberId)) return false
        seen.add(x.memberId)
        return true
      })
      if (!others.length) continue
      const fromSenderMoney = items.reduce((s, { p }) => s + (rowMoneyLeft.get(p.key) ?? 0), 0)
      const otherSenderRepaid = (out.total.get(senderId) ?? 0) - (repaysOwn(c) ? fromSenderMoney : 0)
      let senderNeed = repaysOwn(c) ? Math.max(0, (owed.get(senderId) ?? 0) - otherSenderRepaid) : 0
      const freeByRow = items.map(({ p }) => {
        const m = rowMoneyLeft.get(p.key) ?? 0
        const sRepay = Math.min(m, senderNeed)
        senderNeed -= sRepay
        return { p, free: m - sRepay }
      })
      const totalFree = freeByRow.reduce((s, r) => s + r.free, 0)
      if (totalFree <= 0) continue
      const senderOwed = Math.max(0, owed.get(senderId) ?? 0)
      const othersOwed = others.reduce((s, x) => s + Math.max(0, owed.get(x.memberId) ?? 0), 0)
      const sv = surplusView({
        amount: totalFree + senderOwed + othersOwed,
        payerId: senderId,
        payerAdvance: c.advance,
        splits: others.map((x) => ({
          id: '',
          amount: Math.max(0, owed.get(x.memberId) ?? 0),
          categoryId: null,
          refundable: false,
          memberId: x.memberId,
          advance: x.advance,
          note: ''
        })),
        owed: (id) => Math.max(0, owed.get(id) ?? 0),
        defaultAs: () => 'income'
      })
      const targetShares = sv ? (c.surplusSplit === 'even' ? evenShares(sv) : debtShares(sv)) : null
      for (const other of others) {
        let need = targetShares?.get(other.memberId)?.amount ?? 0
        if (need <= 0) continue
        for (const r of freeByRow) {
          if (need <= 0 || r.free <= 0) continue
          const take = Math.min(need, r.free)
          r.free -= take
          need -= take
          const parts = out.parts.get(r.p.key) ?? out.parts.set(r.p.key, []).get(r.p.key)!
          parts.push({
            memberId: other.memberId,
            amount: take,
            advance: other.advance,
            ...(other.ask && !other.advanceChosen ? { surplus: true as const } : { inflowKind: other.advance ? ('advance' as const) : ('income' as const) })
          })
          if (repaysOwn(c)) {
            add(paid, senderId, -take)
            add(out.total, senderId, -take)
          }
        }
      }
    }
  }
  return out
}

/**
 * What each member owes once the file is in, before its transfers (AF-27, D81 – the most a group's or a theme's
 * „w tym za” gives them): their debt now (`balance` – the ledger's) and their parts of the purchases the import creates
 * (a product return of theirs takes off), less the advance they hold (it pays the purchases first). Each loan given
 * open now (`loans` – its id → what it owes, D100) by its key (`loanKey`): the most its parts of the file may repay.
 */
export function owedWithFile(
  plan: ImportPlan,
  choices: ImportChoices,
  balance: (memberId: string) => { owed: number; deposit: number },
  members: readonly string[],
  loans?: ReadonlyMap<string, number>
): Map<string, number> {
  const groups = importGroups(plan, choices.restoreDeleted)
  const themeOf = new Map(groups.map((g) => [g.group, g.theme]))
  const bought = new Map<string, number>()
  const add = (id: string, v: number) => bought.set(id, (bought.get(id) ?? 0) + v)
  for (const p of plan.rows) {
    if (!createsRow(p, choices)) continue
    const { c } = rowDecision(p, choices, themeOf)
    if (c.kind !== 'expense') continue
    // A purchase (out) adds to what they owe, its return (in) takes off – a gift is nobody's debt.
    if (c.refundable) {
      if (!c.gift) add(c.memberId ?? HOUSE_MEMBER_ID, -p.row.amount)
    } else if (c.share) {
      const sign = p.row.amount < 0 ? 1 : -1
      const amounts = shareAmounts(Math.abs(p.row.amount), c.share)
      c.share.lines.forEach((l, i) => {
        if (l.memberId && !l.gift) add(l.memberId, sign * (amounts[i] ?? 0))
      })
    }
  }
  const out = new Map<string, number>()
  for (const id of new Set([...members, ...bought.keys()])) {
    const b = balance(id)
    const more = bought.get(id) ?? 0
    out.set(id, more >= 0 ? b.owed + Math.max(0, more - b.deposit) : Math.max(0, b.owed + more))
  }
  for (const [id, open] of loans ?? []) out.set(loanKey(id), open)
  return out
}

/**
 * The records an import writes; `makeId` gives new ids (ULIDs), `now` the time of the import. A household member's money
 * says whose it is: what it repays and what is their advance the ledger counts (`calc/household.ts`, D80); the other
 * members' parts of it – `rowShares` (`owed`: what each member owes with the file's purchases, `owedWithFile`).
 */
export function buildImport(
  plan: ImportPlan,
  choices: ImportChoices,
  opts: {
    now: string
    makeId: () => string
    rules: readonly ImportRule[]
    /** The budget's accounts (F10): a transfer to one of them is one operation for both sides; none given – any. */
    accounts?: readonly string[]
    /** What each household member owes with the file's purchases (AF-27): a group's „w tym za” never beyond it. */
    owed?: ReadonlyMap<string, number>
  }
): ImportResult {
  const groups = importGroups(plan, choices.restoreDeleted)
  const themeOf = new Map(groups.map((g) => [g.group, g.theme]))
  const spread = rowShares(plan, choices, opts.owed)
  const shares = spread.parts
  const ruleById = new Map(opts.rules.map((r) => [r.id, r]))
  const bankOf = (p: RowPlan): BankRow => ({
    format: 'mbank',
    key: p.key,
    description: p.row.description,
    counterparty: p.row.counterparty,
    ...(p.row.bankName !== undefined ? { bankName: p.row.bankName } : {}),
    operation: p.row.operation,
    category: p.row.category,
    pending: p.row.pending,
    importedAt: opts.now,
    // Another bank's CSV: told by its key (`csv:`, T461) – no value of `source` an older version would drop.
    ...(plan.format === 'csv' ? {} : { source: plan.format })
  })
  const create: Transaction[] = []
  const update: Transaction[] = []
  const remove: string[] = []
  const counts: ImportCounts = { created: 0, merged: 0, settled: 0, known: 0, removed: 0, skipped: 0, excluded: 0, moved: 0, sides: 0, copies: 0 }
  const keyed = (t: Transaction, key: string, settled = false): Transaction => ({
    ...t,
    bank: { ...t.bank!, key, altKeys: [...(t.bank!.altKeys ?? []), t.bank!.key].slice(-20), pending: settled ? false : t.bank!.pending }
  })
  // A settled row's operation keeps its pending row's key (AF-28): an older file still showing it pending knows it.
  const settledBank = (p: Extract<RowPlan, { status: 'settle' }>): BankRow => ({ ...bankOf(p), altKeys: withKeys(p.tx.bank?.altKeys, [p.tx.bank?.key]) })
  // The copy of the row on another account removed (AF-9): what only it had goes to the operation here.
  const withoutCopy = (p: Extract<RowPlan, { status: 'known' }>, kept: Transaction | null, real: Transaction): Transaction | null => {
    if (!p.copy || !removesCopy(p, choices)) return kept
    counts.copies++
    remove.push(p.copy.tx.id)
    return takeUserData(kept ?? real, [p.copy.tx], opts.now)
  }
  const fresh = [...plan.rows].sort((a, b) => (a.row.date < b.row.date ? -1 : a.row.date > b.row.date ? 1 : 0))
  for (const p of fresh) {
    // The other side of a transfer in one operation (F10): only its row and day change – on the operation itself.
    if ((p.status === 'known' || p.status === 'settle') && isSideView(p.tx)) {
      const real = realOf(p.tx)
      const bank = real.counterBank!
      if (p.status === 'settle') {
        counts.settled++
        update.push(withOtherSide(real, plan.accountId, settledBank(p), p.row.date))
      } else {
        if (p.settled) counts.settled++
        else counts.known++
        const kept = p.other ? { ...real, counterBank: { ...bank, altKeys: [...(bank.altKeys ?? []), p.key].slice(-20) } } : p.settled ? { ...real, counterBank: { ...bank, pending: false } } : null
        const out = withoutCopy(p, kept, real)
        if (out) update.push(out)
      }
      continue
    }
    if (p.status === 'known') {
      // A pending one settled with the same content (N77): „rozliczone”, as the preview counts it.
      if (p.settled) counts.settled++
      else counts.known++
      const kept = p.other
        ? // The row of the other format: its key remembered, so the next file of it is known at once.
          { ...p.tx, bank: { ...p.tx.bank!, altKeys: [...(p.tx.bank!.altKeys ?? []), p.key].slice(-20) } }
        : p.moved
          ? // Moved here from the account it was imported to (B35): this account's key, the old one kept.
            keyed(p.tx, p.key, p.settled)
          : p.settled
            ? { ...p.tx, bank: { ...p.tx.bank!, pending: false } }
            : null
      const out = withoutCopy(p, kept, p.tx)
      if (out) update.push(out)
      continue
    }
    if (p.status === 'elsewhere') {
      if (movesHere(p, choices)) {
        counts.moved++
        update.push(
          p.other
            ? // Found there in the other format (AF-9): its own format's key on this account, the file's row's key beside it.
              { ...p.tx, accountId: plan.accountId, bank: { ...p.tx.bank!, key: keyOnFor(plan.accountId, p.tx), altKeys: withKeys(p.tx.bank!.altKeys, [p.tx.bank!.key, p.key]) } }
            : { ...keyed(p.tx, p.key, !!p.tx.bank?.pending && !p.row.pending), accountId: plan.accountId }
        )
      } else counts.known++
      continue
    }
    if (p.status === 'settle') {
      counts.settled++
      // The counterparty as the bank wrote it then (not changed by the user) takes the bank's new one.
      const bankCounterparty = p.tx.counterparty === '' || p.tx.counterparty === (p.tx.bank?.counterparty ?? '')
      // A shared purchase's lines made again for the new amount (D83).
      update.push(withBankAmount({ ...p.tx, date: p.row.date, counterparty: bankCounterparty ? p.row.counterparty : p.tx.counterparty, bank: settledBank(p) }, p.row.amount))
      continue
    }
    if (p.status === 'deleted' && !choices.restoreDeleted[p.key]) {
      counts.skipped++
      continue
    }
    if ((p.status === 'new' || p.status === 'deleted') && choices.skip[p.key]) {
      counts.excluded++
      continue
    }
    if (p.status === 'merge' && joins(p, choices) && p.side) {
      counts.sides++
      update.push(withOtherSide(realOf(p.tx), plan.accountId, bankOf(p), p.row.date))
      continue
    }
    if (p.status === 'merge' && joins(p, choices)) {
      counts.merged++
      update.push(
        withBankAmount(
          {
            ...p.tx,
            date: p.row.date,
            counterparty: p.tx.counterparty || p.row.counterparty,
            title: p.tx.title || p.row.title,
            bank: bankOf(p)
          },
          p.row.amount
        )
      )
      continue
    }
    // A matched hand-typed operation left apart (B36): its row decided as the file's (its group, theme, proposal).
    const planned = p.status === 'merge' ? p.planned : p
    const group = planned.group
    const theme = themeOf.get(group)
    const base: Choice = choiceOf(planned.decision)
    // The row's own decision, else its group's, else its theme's, else the proposal.
    const c = choices.rows[p.key] ?? (group ? choices.groups[group] : undefined) ?? (theme ? choices.themes[theme] : undefined) ?? base
    const out = p.row.amount < 0
    // A member's purchase – and its product return, their money (B40); a shared purchase's lines (D83).
    const refundable = c.kind === 'expense' && c.refundable
    const household = c.kind === 'income' && !out && c.household
    const share = c.kind === 'expense' && !refundable && c.share ? c.share : null
    // Other members' parts (D81): a group's or a theme's spread over its rows, never beyond what they owe (AF-27); a
    // loan's part (D100) of any income – no member's money.
    const incomeSplits =
      c.kind === 'income' && !out
        ? (shares.get(p.key) ?? []).flatMap((x): Array<Pick<Split, 'id' | 'amount' | 'categoryId' | 'refundable' | 'memberId' | 'advance' | 'inflowKind' | 'loanId' | 'note'>> =>
            x.loanId
              ? [{ id: opts.makeId(), amount: x.amount, categoryId: null, refundable: false, memberId: null, advance: false, loanId: x.loanId, note: '' }]
              : household
                ? [{ id: opts.makeId(), amount: x.amount, categoryId: null, refundable: false, memberId: x.memberId, advance: x.advance, ...(x.inflowKind ? { inflowKind: x.inflowKind } : {}), note: '' }]
                : []
          )
        : []
    // The rule's tags (F17 – „Netia → #ulga-internet”): when its decision stands.
    const ruleTags = planned.decision.ruleId && sameChoice(c, base) ? ruleById.get(planned.decision.ruleId)?.tags : undefined
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
        refundable,
        // A household member's purchase or money (D80): whose; their money beyond their debt is their advance or income.
        memberId: refundable || household ? (c.memberId ?? HOUSE_MEMBER_ID) : null,
        advance: household && c.advance,
        ...(household && c.inflowKind ? { inflowKind: c.inflowKind } : {}),
        ...(refundable && c.gift ? { gift: true } : {}),
        ...(share ? { share, splits: shareSplits({ amount: p.row.amount, categoryId: c.categoryId }, share) } : incomeSplits.length ? { splits: incomeSplits } : {}),
        counterparty: p.row.counterparty,
        title: p.row.title,
        counterAccountId: c.kind === 'transfer' ? c.counterAccountId : null,
        // An own transfer to another account of the budget (F10, D87): one operation for both sides.
        ...(c.kind === 'transfer' && c.counterAccountId && c.counterAccountId !== plan.accountId && (!opts.accounts || opts.accounts.includes(c.counterAccountId)) ? { bothSides: true } : {}),
        loanId: c.kind === 'loan' ? (c.loanId ?? null) : null,
        containerId: c.kind === 'expense' && out ? planned.decision.containerId : null,
        ...(ruleTags?.length ? { tags: [...ruleTags] } : {}),
        bank: bankOf(p)
      })
    )
  }
  const vanished = plan.vanished.filter((t) => choices.removeVanished[t.id]).map((t) => t.id)
  remove.push(...vanished)
  counts.removed = vanished.length

  // Rules learned from the groups the user decided (spec: the rules learn from the user's decisions), by the brand: a
  // decision of a theme teaches every brand in it. Nothing new to learn when the group's own rule or the app's own
  // recognition says the same; a keyword of a title is about that payment, not the counterparty. One brand split
  // into groups with other decisions: the decision of the most operations is the rule.
  // A group decided by a rule up to an amount (F22) or a rule of conditions (AP-45, T469): its decision changes that
  // rule, never the brand's plain one (it would stay behind the rule – the next import deciding as before).
  const amountRuleOf = (g: ImportGroup): ImportRule | null => {
    const ids = new Set(g.rows.map((p) => p.decision.ruleId))
    const id = ids.size === 1 ? [...ids][0] : null
    const r = id ? opts.rules.find((x) => x.id === id) : undefined
    return r?.mode === 'amount' || r?.mode === 'conditions' ? r : null
  }
  const learned = new Map<string, { g: ImportGroup; c: Choice; rows: number; total: number; rule: ImportRule | null; together: number }>()
  for (const g of groups) {
    const own = choices.groups[g.group]
    const c = own ?? choices.themes[g.theme]
    const imported = g.rows.filter((p) => !choices.skip[p.key]).length
    if (!c || !g.brand || g.byTitle || !imported || !learnable(c, g.direction)) continue
    // An ATM withdrawal as the expense „Gotówka” while the budget has its cash account (AP-33, T422): the rule would give
    // way to the own transfer at the next import – none learned.
    if (plan.cash && isCashExpenseRule(c) && g.rows.every((p) => isAtmOperation(p.row.operation))) continue
    if (!(own ? choices.remember[g.group] : choices.rememberThemes[g.theme])) continue
    if ((g.source === 'rule' || g.source === 'builtin') && sameChoice(c, g.proposed)) continue
    const rule = amountRuleOf(g)
    const key = rule ? `amount|${rule.id}` : `${g.brand}|${g.direction}`
    const prev = learned.get(key)
    const total = (prev?.total ?? 0) + imported
    // The inflows its lines are for together (T328): a loan's part of more of them is no amount of each (T368).
    const together = spread.rows.get(own ? `g:${g.group}` : `t:${g.theme}`)?.keys.length ?? imported
    learned.set(key, !prev || imported > prev.rows ? { g, c, rows: imported, total, rule, together } : { ...prev, total })
  }
  // The same list when nothing is learned (N13: an import of nothing new changes nothing); one copy for all (W35).
  const amounts = new Map<string, { decided: ReturnType<typeof ruleDecisionOf>; total: number }>()
  const brands: Array<{ rule: LearnedRule; hits: number }> = []
  for (const { g, c, total, rule, together } of learned.values()) {
    const decided = ruleDecisionOf(c, together)
    if (rule) amounts.set(rule.id, { decided, total })
    else brands.push({ rule: { match: g.brand, direction: g.direction, label: g.label, ...decided }, hits: total })
  }
  let rules = opts.rules as ImportRule[]
  if (amounts.size)
    rules = rules.map((r) => {
      const a = amounts.get(r.id)
      return a ? { ...r, ...a.decided, hits: r.hits + a.total, updatedAt: opts.now } : r
    })
  if (brands.length) rules = upsertRules(rules, brands, { now: opts.now, makeId: opts.makeId })
  return { create, update, remove, rules, counts }
}
