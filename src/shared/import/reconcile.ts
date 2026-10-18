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
import { fold } from '../fold'
import { queryAmount } from '../operationsView'
import { HOUSE_MEMBER_ID, type ImportRule } from '../schema/budget'
import { transactionSchema, type BankRow, type Transaction } from '../schema/records'
import { SCHEMA_VERSION } from '../schema/common'
import { classifyRow, counterpartyKey, isFeeOperation, upsertRule, type ClassifyContext, type Classified, type DecisionSource, type Direction, type ImportDecision, type RuleTarget } from './classify'
import { rowKeys, type MbankFile, type MbankRow } from './mbank'

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
  const days = Math.abs(daysBetween(own.date, bank.date))
  if (days > MATCH_DAYS) return null
  const exact = own.amount === bank.amount
  const similar = similarCounterparty(own.counterparty, bank.name)
  return exact || (similar && closeAmount(own.amount, bank.amount)) ? { days, exact, similar } : null
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
  /**
   * Imported before; `settled` = it was pending and is settled now (the mark goes); `other` = from the other format of
   * the file (the list of operations ↔ the account history, B5) – its key joins the operation's.
   */
  | { status: 'known'; row: MbankRow; key: string; tx: Transaction; settled: boolean; other?: boolean }
  /** A pending operation that came back changed: it takes the row's amount, date and description. */
  | { status: 'settle'; row: MbankRow; key: string; tx: Transaction }
  /**
   * An operation typed by hand: it takes the bank's data and keeps the user's category, time and notes. `loose` = a
   * possible duplicate (1.2.1, D77): the same amount under another name, or a close amount (max(1 zł, 3%)) under a
   * similar one – joined too, so nothing comes in twice; the preview shows it to check.
   */
  | { status: 'merge'; row: MbankRow; key: string; tx: Transaction; loose?: 'name' | 'amount'; ask?: boolean }
  | ({ status: 'new' } & PlannedRow)
  /** An operation the user deleted (its version is in the history): left out unless brought back. */
  | ({ status: 'deleted' } & PlannedRow)

/** A row of the file that gets a decision: its group (brand, direction, proposal) and the proposal. */
interface PlannedRow {
  row: MbankRow
  key: string
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
  return [d.kind, d.categoryId ?? '', d.refundable ? 'z' : '', d.household ? 'd' : '', member, d.household && d.advance ? 'a' : '', d.counterAccountId ?? '', d.containerId ?? '', d.byTitle ? 't' : ''].join(':')
}

/**
 * Group of new rows (spec: history categorized in groups): one brand – a chain whatever its city or shop, else the
 * counterparty (1.2.1) –, one direction, one proposal.
 */
export const groupKey = (brand: string, direction: Direction, d: ImportDecision) => `${brand}|${direction}|${proposalSig(d)}`

/** `deletedKeys` = `bank.key` of the operations the user deleted (`.history/`): their rows do not come back by themselves. */
export function planImport(file: MbankFile, accountId: string, existing: readonly Transaction[], ctx: ClassifyContext, deletedKeys: ReadonlySet<string> = new Set()): ImportPlan {
  const keys = rowKeys(file.rows, accountId)
  const mine = existing.filter((t) => t.accountId === accountId)
  const byKey = new Map(mine.filter((t) => t.bank).map((t) => [t.bank!.key, t]))
  // The keys of the same rows in the other format (B5), never over an operation's own key.
  for (const t of mine) for (const k of t.bank?.altKeys ?? []) if (!byKey.has(k)) byKey.set(k, t)
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

  // The same row of the other format (B5): the account history and the list of operations describe a row in other
  // words, so its key differs – a booked operation of the bank from the other format, the same amount within ±3 days
  // (a card's date may differ), a similar name. The closest first, each side once.
  const other = new Map<string, Transaction[]>()
  const formatOf = formatsOf(mine)
  for (const t of mine) {
    if (!t.bank || t.bank.pending || used.has(t.id) || formatOf(t) === file.format) continue
    const k = `${t.date}|${t.amount}`
    const list = other.get(k)
    if (list) list.push(t)
    else other.set(k, [t])
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

  // Operations typed by hand (the evening entries, D26): the same amount within ±3 days, a similar counterparty.
  const manual = mine.filter(joinable)
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

  // Possible duplicates (D77): a hand-typed operation left over, the same amount under another name or a close amount
  // under a similar name – the same amount first, then the closest date; each side once. Joined by default when
  // surely the same (a similar name; or a card purchase a day apart at most), else only when ticked (ICTTJ: a possible
  // duplicate is never taken by itself) – one not joined is still found later by the duplicates panel.
  const loose: Array<{ i: number; tx: Transaction; days: number; exact: boolean; similar: boolean }> = []
  file.rows.forEach((row, i) => {
    if (plans[i]) return
    for (const tx of manual) {
      if (used.has(tx.id)) continue
      const m = looseMatch(tx, { amount: row.amount, date: row.date, name: row.counterparty || row.description })
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

  const classified = file.rows.map((row, i) => (plans[i] ? null : classifyRow(row, ctx)))
  shareMerged(classified, file.rows)
  const rows: RowPlan[] = file.rows.map((row, i) => {
    const p = plans[i]
    if (p) return p
    const { decision, hint, brand, direction, target } = classified[i]!
    return {
      status: deletedKeys.has(keys[i]!) ? 'deleted' : 'new',
      row,
      key: keys[i]!,
      group: groupKey(brand.key, direction, decision),
      brand: brand.key,
      brandLabel: brand.brand?.label ?? null,
      words: brand.words,
      target,
      direction,
      decision,
      hint
    }
  })

  const dates = file.rows.map((r) => r.date).sort()
  const period = file.period ?? (dates.length ? { from: dates[0]!, to: dates.at(-1)! } : null)
  // Only a list of operations shows pending rows (the account history has the booked ones only).
  const vanished = period && file.format === 'lista' ? mine.filter((t) => t.bank?.pending && !used.has(t.id) && t.date >= period.from && t.date <= period.to) : []
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
  counterAccountId: string | null
}

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
}

/** Is a matched hand-typed operation joined? `noMerge` false = ticked by the user (a possible duplicate that asks). */
export const joins = (p: Extract<RowPlan, { status: 'merge' }>, choices: Pick<ImportChoices, 'noMerge'>): boolean => (p.ask ? choices.noMerge[p.key] === false : !choices.noMerge[p.key])

export const choiceOf = (d: ImportDecision): Choice => ({
  kind: d.kind,
  categoryId: d.categoryId,
  refundable: d.refundable,
  household: d.household,
  memberId: d.refundable || d.household ? d.memberId : null,
  advance: d.household && d.advance,
  counterAccountId: d.counterAccountId
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
  a.counterAccountId === b.counterAccountId

export interface ImportResult {
  create: Transaction[]
  update: Transaction[]
  remove: string[]
  rules: ImportRule[]
  /** Counts for the summary; `excluded` = new rows the user left out (`ImportChoices.skip`). */
  counts: { created: number; merged: number; settled: number; known: number; removed: number; skipped: number; excluded: number }
}

/**
 * The records an import writes; `makeId` gives new ids (ULIDs), `now` the time of the import. A household member's money
 * says whose it is: what it repays and what is their advance the ledger counts (`calc/household.ts`, D80).
 */
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
  const counts = { created: 0, merged: 0, settled: 0, known: 0, removed: 0, skipped: 0, excluded: 0 }
  const fresh = [...plan.rows].sort((a, b) => (a.row.date < b.row.date ? -1 : a.row.date > b.row.date ? 1 : 0))
  for (const p of fresh) {
    if (p.status === 'known') {
      counts.known++
      // The row of the other format: its key remembered, so the next file of it is known at once.
      if (p.other) update.push({ ...p.tx, bank: { ...p.tx.bank!, altKeys: [...(p.tx.bank!.altKeys ?? []), p.key].slice(-20) } })
      else if (p.settled) update.push({ ...p.tx, bank: { ...p.tx.bank!, pending: false } })
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
    if ((p.status === 'new' || p.status === 'deleted') && choices.skip[p.key]) {
      counts.excluded++
      continue
    }
    if (p.status === 'merge' && joins(p, choices)) {
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
    const theme = group ? themeOf.get(group) : undefined
    const base: Choice =
      p.status === 'new' || p.status === 'deleted'
        ? choiceOf(p.decision)
        : { kind: p.row.amount < 0 ? 'expense' : 'income', categoryId: null, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    // The row's own decision, else its group's, else its theme's, else the proposal.
    const c = choices.rows[p.key] ?? (group ? choices.groups[group] : undefined) ?? (theme ? choices.themes[theme] : undefined) ?? base
    const out = p.row.amount < 0
    const refundable = c.kind === 'expense' && out && c.refundable
    const household = c.kind === 'income' && !out && c.household
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
        counterparty: p.row.counterparty,
        title: p.row.title,
        counterAccountId: c.kind === 'transfer' ? c.counterAccountId : null,
        containerId: c.kind === 'expense' && out && (p.status === 'new' || p.status === 'deleted') ? p.decision.containerId : null,
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
  const learned = new Map<string, { g: ImportGroup; c: Choice; rows: number; total: number }>()
  for (const g of groups) {
    const own = choices.groups[g.group]
    const c = own ?? choices.themes[g.theme]
    const imported = g.rows.filter((p) => !choices.skip[p.key]).length
    if (!c || !g.brand || g.byTitle || !imported) continue
    if (!(own ? choices.remember[g.group] : choices.rememberThemes[g.theme])) continue
    if ((g.source === 'rule' || g.source === 'builtin') && sameChoice(c, g.proposed)) continue
    const key = `${g.brand}|${g.direction}`
    const prev = learned.get(key)
    const total = (prev?.total ?? 0) + imported
    learned.set(key, !prev || imported > prev.rows ? { g, c, rows: imported, total } : { ...prev, total })
  }
  let rules: ImportRule[] = [...opts.rules]
  for (const { g, c, total } of learned.values())
    rules = upsertRule(
      rules,
      {
        match: g.brand,
        direction: g.direction,
        label: g.label,
        kind: c.kind,
        categoryId: c.kind === 'expense' ? c.categoryId : null,
        refundable: c.kind === 'expense' && g.direction === 'out' && c.refundable,
        household: c.kind === 'income' && c.household,
        memberId: (c.kind === 'expense' && g.direction === 'out' && c.refundable) || (c.kind === 'income' && c.household) ? (c.memberId ?? HOUSE_MEMBER_ID) : null,
        counterAccountId: c.kind === 'transfer' ? c.counterAccountId : null
      },
      { now: opts.now, makeId: opts.makeId, hits: total }
    )
  return { create, update, remove, rules, counts }
}
