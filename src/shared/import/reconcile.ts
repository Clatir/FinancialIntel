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
import { addDays, daysBetween } from '../calc/dates'
import { shareSplits, withBankAmount } from '../calc/share'
import { fold } from '../fold'
import { queryAmount } from '../operationsView'
import { HOUSE_MEMBER_ID, type ImportRule } from '../schema/budget'
import { transactionSchema, type BankRow, type Share, type Transaction } from '../schema/records'
import { SCHEMA_VERSION } from '../schema/common'
import { classifyRow, counterpartyKey, isFeeOperation, PER_OPERATION_KINDS, upsertRule, type ClassifyContext, type Classified, type DecisionSource, type Direction, type ImportDecision, type RuleTarget } from './classify'
import { accountNumberOf, keyOccurrence, keyOnAccount, otherBankAccount, rowIdentity, rowKeys, type MbankFile, type MbankRow } from './mbank'

/** Days around the bank's date a manual entry may be (spec: ±3). */
export const MATCH_DAYS = 3

/** An amount a hand-typed operation may be off by (a typo, grosze left out): max(1 zł, 3%), the same direction. */
export const closeAmount = (a: number, b: number): boolean => Math.sign(a) === Math.sign(b) && Math.abs(a - b) <= Math.max(100, Math.round(Math.max(Math.abs(a), Math.abs(b)) * 0.03))

/** A hand-typed operation that may be joined with the bank's (a correction of a balance never is). */
export const joinable = (t: Pick<Transaction, 'bank' | 'kind' | 'amount'>): boolean => !t.bank && t.kind !== 'correction' && t.amount !== 0

/**
 * One rule for the import and the duplicates panel (D77): a hand-typed operation and the bank's are the same one when
 * on the same side, ±3 days apart, of the same amount (`exact`) or a close one under a similar name. Null = not.
 */
export function looseMatch(own: { amount: number; date: string; counterparty: string }, bank: { amount: number; date: string; name: string }): { days: number; exact: boolean; similar: boolean } | null {
  if (Math.sign(own.amount) !== Math.sign(bank.amount)) return null
  // The cheap checks first: the names are compared only for an amount that may match (W4).
  const exact = own.amount === bank.amount
  if (!exact && !closeAmount(own.amount, bank.amount)) return null
  const days = Math.abs(daysBetween(own.date, bank.date))
  if (days > MATCH_DAYS) return null
  const similar = similarCounterparty(own.counterparty, bank.name)
  return exact || similar ? { days, exact, similar } : null
}

/**
 * The file format of each bank's operation (B5): its own (`bank.source`, 1.4.2), else the format of the import it came
 * with – the account history's descriptions start with the type of operation, so most of them in one import = the history.
 */
export function formatsOf(txs: readonly Transaction[]): (t: Transaction) => MbankFile['format'] {
  const votes = new Map<string, number>()
  for (const t of txs) {
    if (!t.bank || t.bank.source) continue
    const op = t.bank.operation.trim().toUpperCase()
    const history = !!op && t.bank.description.trim().toUpperCase().startsWith(op)
    votes.set(t.bank.importedAt, (votes.get(t.bank.importedAt) ?? 0) + (history ? 1 : -1))
  }
  return (t) => t.bank?.source ?? ((votes.get(t.bank?.importedAt ?? '') ?? 0) > 0 ? 'historia' : 'lista')
}

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

/** The same counterparty in other words: an empty one (a quick entry without it), one key in the other, a common word. */
export function similarCounterparty(a: string, b: string): boolean {
  const ka = counterpartyKey(a)
  const kb = counterpartyKey(b)
  if (!ka || !kb) return true
  if ((ka.length >= 3 && kb.includes(ka)) || (kb.length >= 3 && ka.includes(kb))) return true
  const wa = nameWords(a)
  for (const w of nameWords(b)) if (wa.has(w)) return true
  return false
}

/** A name's words of 4 letters and more, once per name (W4). */
function nameWords(s: string): ReadonlySet<string> {
  let words = wordSets.get(s)
  if (!words) {
    words = new Set(fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4))
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
   * account from the one it was imported to (B35) – it takes this account's key.
   */
  | { status: 'known'; row: MbankRow; key: string; tx: Transaction; settled: boolean; other?: boolean; moved?: boolean }
  /**
   * Imported before onto another account of the budget (B35: the file of this account imported there by mistake, or the
   * operation moved there): never a second operation – moved here when the user says so (`ImportChoices.moveHere`;
   * by default when it was imported there, not moved there by the user).
   */
  | { status: 'elsewhere'; row: MbankRow; key: string; tx: Transaction; move: boolean }
  /** A pending operation that came back changed: it takes the row's amount, date and description. */
  | { status: 'settle'; row: MbankRow; key: string; tx: Transaction }
  /**
   * An operation typed by hand: it takes the bank's data and keeps the user's category, time and notes. `loose` = a
   * possible duplicate (1.2.1, D77): the same amount under another name, or a close amount (max(1 zł, 3%)) under a
   * similar one – joined too, so nothing comes in twice; the preview shows it to check.
   */
  | { status: 'merge'; row: MbankRow; key: string; tx: Transaction; loose?: 'name' | 'amount'; ask?: boolean; planned: Planned }
  | ({ status: 'new' } & PlannedRow)
  /** An operation the user deleted (its version is in the history): left out unless brought back. */
  | ({ status: 'deleted' } & PlannedRow)

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
}

/**
 * A proposal as one text: the rows of a brand with another proposal are another group (and theme). A household
 * member asked about (inflow „pytaj”) is a theme of their own (T110, B4): never one with another member's money.
 */
export function proposalSig(d: ImportDecision): string {
  if (d.source === 'none') return d.household ? `?${d.kind}:d:${d.memberId ?? '-'}` : `?${d.kind}`
  const member = d.refundable || d.household ? (d.memberId ?? '-') : ''
  return [d.kind, d.categoryId ?? '', d.refundable ? 'z' : '', d.household ? 'd' : '', member, d.household && d.advance ? 'a' : '', d.counterAccountId ?? '', d.containerId ?? '', d.byTitle ? 't' : '', d.refundable && d.gift ? 'g' : '', shareKey(d.share), d.kind === 'loan' ? (d.loanId ?? '') : ''].join(':')
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
  /** The account's operations. */
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
}

const budgetedMemo = new WeakMap<readonly Transaction[], Map<string, Budgeted>>()

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

function budgetedOf(existing: readonly Transaction[], accountId: string): Budgeted {
  let byAccount = budgetedMemo.get(existing)
  if (!byAccount) budgetedMemo.set(existing, (byAccount = new Map()))
  const known = byAccount.get(accountId)
  if (known) return known
  const mine = existing.filter((t) => t.accountId === accountId)
  const byKey = new Map<string, Transaction>()
  for (const t of mine) if (t.bank) byKey.set(t.bank.key, t)
  // The keys of the same rows in the other format (B5), never over an operation's own key.
  for (const t of mine) for (const k of t.bank?.altKeys ?? []) if (!byKey.has(k)) byKey.set(k, t)
  const described = new Map<string, Transaction[]>()
  for (const t of existing) if (t.bank?.description) push(described, t.date, t)
  const booked = new Map<string, Transaction[]>()
  for (const t of mine) if (t.bank && !t.bank.pending) push(booked, t.date, t)
  const manual = new Map<string, Array<{ tx: Transaction; at: number }>>()
  mine.filter(joinable).forEach((tx, at) => push(manual, tx.date, { tx, at }))
  const out: Budgeted = { mine, byKey, described, pending: mine.filter((t) => t.bank?.pending), booked, formatOf: formatsOf(mine), manual }
  byAccount.set(accountId, out)
  return out
}

/** The keys of a file's rows on an account (`rowKeys`), once per file and account (W18). */
const keysMemo = new WeakMap<readonly MbankRow[], Map<string, string[]>>()
function keysOf(rows: readonly MbankRow[], accountId: string): string[] {
  let byAccount = keysMemo.get(rows)
  if (!byAccount) keysMemo.set(rows, (byAccount = new Map()))
  let keys = byAccount.get(accountId)
  if (!keys) byAccount.set(accountId, (keys = rowKeys(rows, accountId)))
  return keys
}

/** `deletedKeys` = `bank.key` of the operations the user deleted (`.history/`): their rows do not come back by themselves. */
export function planImport(file: MbankFile, accountId: string, existing: readonly Transaction[], ctx: ClassifyContext, deletedKeys: ReadonlySet<string> = new Set()): ImportPlan {
  const keys = keysOf(file.rows, accountId)
  const budget = budgetedOf(existing, accountId)
  const { byKey, formatOf } = budget
  const used = new Set<string>()
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
  const keyOn = (account: string, t: Transaction) => keyOnAccount(account, rowIdentity({ date: t.date, description: t.bank!.description, amount: t.amount }), keyOccurrence(t.bank!.key))
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
  const pending = budget.pending.filter((t) => !used.has(t.id))
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

  // The same row of the other format (B5): the account history and the list of operations describe a row in other
  // words, so its key differs – a booked operation of the bank from the other format, the same amount within ±3 days
  // (a card's date may differ), a similar name. The closest first, each side once. Only operations of the days this
  // file covers: one outside its period is not in it – a row of the same amount and name next to it is another one.
  const other = new Map<string, Transaction[]>()
  const covers = coverageOf(file)
  for (const [date, list] of budget.booked) {
    if (!covers(date)) continue
    for (const t of list) if (!used.has(t.id) && formatOf(t) !== file.format) push(other, `${t.date}|${t.amount}`, t)
  }
  if (other.size) {
    const pairs: Array<{ i: number; tx: Transaction; days: number }> = []
    file.rows.forEach((row, i) => {
      if (plans[i]) return
      for (let d = -MATCH_DAYS; d <= MATCH_DAYS; d++)
        for (const tx of other.get(`${addDays(row.date, d)}|${row.amount}`) ?? [])
          if (similarCounterparty(tx.bank!.counterparty || tx.bank!.description, row.counterparty || row.description)) pairs.push({ i, tx, days: Math.abs(d) })
    })
    pairs.sort((a, b) => a.days - b.days || a.i - b.i)
    for (const c of pairs) {
      if (plans[c.i] || used.has(c.tx.id)) continue
      used.add(c.tx.id)
      plans[c.i] = { status: 'known', row: file.rows[c.i]!, key: keys[c.i]!, tx: c.tx, settled: false, other: true }
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
    if (plans[i]) return
    for (const tx of manualNear(row.date)) {
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

  // Possible duplicates (D77): a hand-typed operation left over, the same amount under another name or a close amount
  // under a similar name – the same amount first, then the closest date; each side once. Joined by default when
  // surely the same (a similar name; or a card purchase a day apart at most), else only when ticked (ICTTJ: a possible
  // duplicate is never taken by itself) – one not joined is still found later by the duplicates panel.
  const loose: Array<{ i: number; tx: Transaction; days: number; exact: boolean; similar: boolean }> = []
  file.rows.forEach((row, i) => {
    if (plans[i]) return
    const bank = { amount: row.amount, date: row.date, name: row.counterparty || row.description }
    for (const tx of manualNear(row.date)) {
      if (used.has(tx.id)) continue
      const m = looseMatch(tx, bank)
      if (m) loose.push({ i, tx, ...m })
    }
  })
  loose.sort((a, b) => Number(b.exact) - Number(a.exact) || Number(b.similar) - Number(a.similar) || a.days - b.days || a.i - b.i)
  for (const c of loose) {
    if (plans[c.i] || used.has(c.tx.id)) continue
    used.add(c.tx.id)
    const row = file.rows[c.i]!
    const sure = c.similar || (c.days <= 1 && /^(ZAKUP|BLIK ZAKUP|PŁATNOŚĆ|PLATNOSC)/.test(row.operation))
    plans[c.i] = { status: 'merge', row, key: keys[c.i]!, tx: c.tx, loose: c.exact ? 'name' : 'amount', ask: !sure }
  }

  // The new rows – and the matched hand-typed ones (B36: imported apart, each is decided as the file's row is).
  const classified = file.rows.map((row, i) => (plans[i] && plans[i]!.status !== 'merge' ? null : classifyRow(row, ctx)))
  shareMerged(classified, file.rows)
  const plannedOf = (i: number): Planned => {
    const { decision, hint, brand, direction, target } = classified[i]!
    return { group: groupKey(brand.key, direction, decision), brand: brand.key, brandLabel: brand.brand?.label ?? null, words: brand.words, target, direction, decision, hint }
  }
  const rows: RowPlan[] = file.rows.map((row, i) => {
    const p = plans[i]
    if (p?.status === 'merge') return { ...p, planned: plannedOf(i) }
    if (p) return p
    return { status: deletedKeys.has(keys[i]!) ? 'deleted' : 'new', row, key: keys[i]!, ...plannedOf(i) }
  })

  const period = file.period ?? (days.length ? { from: days[0]!, to: days.at(-1)! } : null)
  // Only a list of operations shows pending rows (the account history has the booked ones only).
  const vanished = period && file.format === 'lista' ? budget.pending.filter((t) => !used.has(t.id) && t.date >= period.from && t.date <= period.to) : []
  return { accountId, format: file.format, rows, vanished, period }
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

/** Groups of the new rows, the biggest first; each knows its theme. */
export function importGroups(plan: ImportPlan | null): ImportGroup[] {
  if (!plan) return []
  const byGroup = new Map<string, NewRow[]>()
  for (const p of plan.rows) {
    if (p.status !== 'new') continue
    const list = byGroup.get(p.group)
    if (list) list.push(p)
    else byGroup.set(p.group, [p])
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
    const [hint, bankCategory] = (most(hints)?.split('|') ?? [null, '']) as [string | null, string]
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
      theme: byProposal(source, first.decision) ? `${first.direction}|=${proposalSig(first.decision)}` : hint ? `${first.direction}|hint:${hint}` : `${first.direction}|op:${opKindOf(first.row.operation)}`
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
 * The import's search (1.2.1): every word in the group's names and categories – the whole group – or in a row's
 * description, title and date (dd.mm.rrrr) – only those rows; an amount („12,49”) also finds the rows of that amount.
 * Groups not found are left out of the map.
 */
export function searchGroups(groups: readonly ImportGroup[], query: string, labelOf: (categoryId: string | null) => string = () => ''): Map<string, NewRow[] | 'all'> {
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
    const groupText = fold([g.label, ...g.names, g.bankCategory, g.reason, labelOf(g.proposed.categoryId)].join(' \u0001 '))
    if (has(groupText)) {
      out.set(g.group, 'all')
      continue
    }
    const rows = g.rows.filter((p) => {
      if (amount != null && Math.abs(p.row.amount) === amount) return true
      const d = p.row.date
      return has(`${groupText} \u0001 ${fold([p.row.description, p.row.title, p.row.category, `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`].join(' \u0001 '))}`)
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
  /** A purchase the member gives (D83, with `refundable`): nobody owes it. */
  gift?: boolean
  /** A purchase financed by several people (D83): each row's amount split so. */
  share?: Share | null
  counterAccountId: string | null
  /** The loan of the Radar a loan's operation belongs to (B34); none = a loan without its record. */
  loanId?: string | null
}

/**
 * Does a decision teach the import a rule of its brand? Never a loan, the tax, XTB (decided operation by operation –
 * N14), nor an expense of no category nobody else pays (B37: it says nothing of the brand, and would hide its chain).
 */
export const learnable = (c: Choice): boolean => !PER_OPERATION_KINDS.includes(c.kind) && !(c.kind === 'expense' && !c.categoryId && !c.refundable && !c.share)

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
}

/** Is an operation imported onto another account moved here (B35)? */
export const movesHere = (p: Extract<RowPlan, { status: 'elsewhere' }>, choices: Pick<ImportChoices, 'moveHere'>): boolean => choices.moveHere[p.key] ?? p.move

/** Is a matched hand-typed operation joined? `noMerge` false = ticked by the user (a possible duplicate that asks). */
export const joins = (p: Extract<RowPlan, { status: 'merge' }>, choices: Pick<ImportChoices, 'noMerge'>): boolean => (p.ask ? choices.noMerge[p.key] === false : !choices.noMerge[p.key])

export const choiceOf = (d: ImportDecision): Choice => ({
  kind: d.kind,
  categoryId: d.categoryId,
  refundable: d.refundable,
  household: d.household,
  memberId: d.refundable || d.household ? d.memberId : null,
  advance: d.household && d.advance,
  gift: d.refundable && d.gift,
  share: d.kind === 'expense' && !d.refundable ? d.share : null,
  counterAccountId: d.counterAccountId,
  loanId: d.kind === 'loan' ? d.loanId : null
})

/** The member of a choice that has one (null = the first; '' = none). */
const memberKey = (c: Choice) => (c.refundable || c.household ? (c.memberId ?? HOUSE_MEMBER_ID) : '')

export const sameChoice = (a: Choice, b: Choice): boolean =>
  a.kind === b.kind &&
  a.categoryId === b.categoryId &&
  a.refundable === b.refundable &&
  a.household === b.household &&
  memberKey(a) === memberKey(b) &&
  (a.household && a.advance) === (b.household && b.advance) &&
  (a.refundable && !!a.gift) === (b.refundable && !!b.gift) &&
  shareKey(a.share) === shareKey(b.share) &&
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

/** `moved` = operations of this file found on another account and moved here (B35). */
export type ImportCounts = { created: number; merged: number; settled: number; known: number; removed: number; skipped: number; excluded: number; moved: number }

/**
 * The records an import writes; `makeId` gives new ids (ULIDs), `now` the time of the import. A household member's money
 * says whose it is: what it repays and what is their advance the ledger counts (`calc/household.ts`, D80).
 */
/** What a rule says, from a decision (the import's learning, a rule edited in the settings – F22). */
export function ruleDecisionOf(c: Choice): Pick<ImportRule, 'kind' | 'categoryId' | 'refundable' | 'household' | 'memberId' | 'gift' | 'share' | 'counterAccountId'> {
  return {
    kind: c.kind,
    categoryId: c.kind === 'expense' ? c.categoryId : null,
    refundable: c.kind === 'expense' && c.refundable,
    household: c.kind === 'income' && c.household,
    memberId: (c.kind === 'expense' && c.refundable) || (c.kind === 'income' && c.household) ? (c.memberId ?? HOUSE_MEMBER_ID) : null,
    gift: c.kind === 'expense' && c.refundable && c.gift ? true : undefined,
    share: c.kind === 'expense' && !c.refundable && c.share ? c.share : undefined,
    counterAccountId: c.kind === 'transfer' ? c.counterAccountId : null
  }
}

export function buildImport(plan: ImportPlan, choices: ImportChoices, opts: { now: string; makeId: () => string; rules: readonly ImportRule[] }): ImportResult {
  const groups = importGroups(plan)
  const themeOf = new Map(groups.map((g) => [g.group, g.theme]))
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
    source: plan.format
  })
  const create: Transaction[] = []
  const update: Transaction[] = []
  const counts: ImportCounts = { created: 0, merged: 0, settled: 0, known: 0, removed: 0, skipped: 0, excluded: 0, moved: 0 }
  const keyed = (t: Transaction, key: string, settled = false): Transaction => ({
    ...t,
    bank: { ...t.bank!, key, altKeys: [...(t.bank!.altKeys ?? []), t.bank!.key].slice(-20), pending: settled ? false : t.bank!.pending }
  })
  const fresh = [...plan.rows].sort((a, b) => (a.row.date < b.row.date ? -1 : a.row.date > b.row.date ? 1 : 0))
  for (const p of fresh) {
    if (p.status === 'known') {
      counts.known++
      // The row of the other format: its key remembered, so the next file of it is known at once.
      if (p.other) update.push({ ...p.tx, bank: { ...p.tx.bank!, altKeys: [...(p.tx.bank!.altKeys ?? []), p.key].slice(-20) } })
      // Moved here from the account it was imported to (B35): this account's key, the old one kept.
      else if (p.moved) update.push(keyed(p.tx, p.key, p.settled))
      else if (p.settled) update.push({ ...p.tx, bank: { ...p.tx.bank!, pending: false } })
      continue
    }
    if (p.status === 'elsewhere') {
      if (movesHere(p, choices)) {
        counts.moved++
        update.push({ ...keyed(p.tx, p.key, !!p.tx.bank?.pending && !p.row.pending), accountId: plan.accountId })
      } else counts.known++
      continue
    }
    if (p.status === 'settle') {
      counts.settled++
      // The counterparty as the bank wrote it then (not changed by the user) takes the bank's new one.
      const bankCounterparty = p.tx.counterparty === '' || p.tx.counterparty === (p.tx.bank?.counterparty ?? '')
      // A shared purchase's lines made again for the new amount (D83).
      update.push(withBankAmount({ ...p.tx, date: p.row.date, counterparty: bankCounterparty ? p.row.counterparty : p.tx.counterparty, bank: bankOf(p) }, p.row.amount))
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
        ...(refundable && c.gift ? { gift: true } : {}),
        ...(share ? { share, splits: shareSplits({ amount: p.row.amount, categoryId: c.categoryId }, share) } : {}),
        counterparty: p.row.counterparty,
        title: p.row.title,
        counterAccountId: c.kind === 'transfer' ? c.counterAccountId : null,
        loanId: c.kind === 'loan' ? (c.loanId ?? null) : null,
        containerId: c.kind === 'expense' && out ? planned.decision.containerId : null,
        bank: bankOf(p)
      })
    )
  }
  const remove = plan.vanished.filter((t) => choices.removeVanished[t.id]).map((t) => t.id)
  counts.removed = remove.length

  // Rules learned from the groups the user decided (spec: the rules learn from the user's decisions), by the brand: a
  // decision of a theme teaches every brand in it. Nothing new to learn when the group's own rule or the app's own
  // recognition says the same; a keyword of a title is about that payment, not the counterparty. One brand split
  // into groups with other decisions: the decision of the most operations is the rule.
  // A group decided by a rule up to an amount (F22): its decision changes that rule, never the brand's plain one.
  const amountRuleOf = (g: ImportGroup): ImportRule | null => {
    const ids = new Set(g.rows.map((p) => p.decision.ruleId))
    const id = ids.size === 1 ? [...ids][0] : null
    const r = id ? opts.rules.find((x) => x.id === id) : undefined
    return r?.mode === 'amount' ? r : null
  }
  const learned = new Map<string, { g: ImportGroup; c: Choice; rows: number; total: number; rule: ImportRule | null }>()
  for (const g of groups) {
    const own = choices.groups[g.group]
    const c = own ?? choices.themes[g.theme]
    const imported = g.rows.filter((p) => !choices.skip[p.key]).length
    if (!c || !g.brand || g.byTitle || !imported || !learnable(c)) continue
    if (!(own ? choices.remember[g.group] : choices.rememberThemes[g.theme])) continue
    if ((g.source === 'rule' || g.source === 'builtin') && sameChoice(c, g.proposed)) continue
    const rule = amountRuleOf(g)
    const key = rule ? `amount|${rule.id}` : `${g.brand}|${g.direction}`
    const prev = learned.get(key)
    const total = (prev?.total ?? 0) + imported
    learned.set(key, !prev || imported > prev.rows ? { g, c, rows: imported, total, rule } : { ...prev, total })
  }
  // The same list when nothing is learned (N13: an import of nothing new changes nothing).
  let rules = opts.rules as ImportRule[]
  for (const { g, c, total, rule } of learned.values()) {
    const decided = ruleDecisionOf(c)
    rules = rule
      ? rules.map((r) => (r.id === rule.id ? { ...r, ...decided, hits: r.hits + total, updatedAt: opts.now } : r))
      : upsertRule(rules, { match: g.brand, direction: g.direction, label: g.label, ...decided }, { now: opts.now, makeId: opts.makeId, hits: total })
  }
  return { create, update, remove, rules, counts }
}
