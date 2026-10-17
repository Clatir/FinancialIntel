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
import { queryAmount } from '../operationsView'
import type { ImportRule } from '../schema/budget'
import { transactionSchema, type BankRow, type Transaction } from '../schema/records'
import { SCHEMA_VERSION } from '../schema/common'
import { classifyRow, counterpartyKey, upsertRule, type ClassifyContext, type DecisionSource, type Direction, type ImportDecision } from './classify'
import { rowKeys, type MbankFile, type MbankRow } from './mbank'

/** Days around the bank's date a manual entry may be (spec: ±3). */
export const MATCH_DAYS = 3

/** An amount a hand-typed operation may be off by (a typo, grosze left out): max(1 zł, 3%), the same direction. */
export const closeAmount = (a: number, b: number): boolean => Math.sign(a) === Math.sign(b) && Math.abs(a - b) <= Math.max(100, Math.round(Math.max(Math.abs(a), Math.abs(b)) * 0.03))

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
  /**
   * An operation typed by hand: it takes the bank's data and keeps the user's category, time and notes. `loose` = a
   * possible duplicate (1.2.1, D77): the same amount under another name, or a close amount (max(1 zł, 3%)) under a
   * similar one – joined too, so nothing comes in twice; the preview shows it to check.
   */
  | { status: 'merge'; row: MbankRow; key: string; tx: Transaction; loose?: 'name' | 'amount' }
  | ({ status: 'new' } & PlannedRow)
  /** An operation the user deleted (its version is in the history): left out unless brought back. */
  | ({ status: 'deleted' } & PlannedRow)

/** A row of the file that gets a decision: its group (brand, direction, proposal) and the proposal. */
interface PlannedRow {
  row: MbankRow
  key: string
  group: string
  /** The brand key (`brandOf`): a decision of the group is remembered by it. */
  brand: string
  /** The chain's name when the dictionary knows it. */
  brandLabel: string | null
  direction: Direction
  decision: ImportDecision
  hint: string | null
}

export type NewRow = Extract<RowPlan, { status: 'new' }>

export interface ImportPlan {
  accountId: string
  rows: RowPlan[]
  /** Pending operations of the file's period the file does not have any more. */
  vanished: Transaction[]
  period: { from: string; to: string } | null
}

/** A proposal as one text: the rows of a brand with another proposal are another group (and theme). */
export function proposalSig(d: ImportDecision): string {
  if (d.source === 'none') return `?${d.kind}`
  return [d.kind, d.categoryId ?? '', d.refundable ? 'z' : '', d.household ? 'd' : '', d.counterAccountId ?? '', d.containerId ?? '', d.byTitle ? 't' : ''].join(':')
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

  // Possible duplicates (D77): a hand-typed operation left over, ±3 days, the same amount under another name or a close
  // amount under a similar name – the same amount first, then the closest date; each side once.
  const loose: Array<{ i: number; tx: Transaction; days: number; exact: boolean }> = []
  file.rows.forEach((row, i) => {
    if (plans[i]) return
    for (const tx of manual) {
      if (used.has(tx.id) || Math.sign(tx.amount) !== Math.sign(row.amount)) continue
      const days = Math.abs(daysBetween(tx.date, row.date))
      if (days > MATCH_DAYS) continue
      const exact = tx.amount === row.amount
      if (exact || (closeAmount(tx.amount, row.amount) && similarCounterparty(tx.counterparty, row.counterparty || row.description))) loose.push({ i, tx, days, exact })
    }
  })
  loose.sort((a, b) => Number(b.exact) - Number(a.exact) || a.days - b.days || a.i - b.i)
  for (const c of loose) {
    if (plans[c.i] || used.has(c.tx.id)) continue
    used.add(c.tx.id)
    plans[c.i] = { status: 'merge', row: file.rows[c.i]!, key: keys[c.i]!, tx: c.tx, loose: c.exact ? 'name' : 'amount' }
  }

  const rows: RowPlan[] = file.rows.map((row, i) => {
    const p = plans[i]
    if (p) return p
    const { decision, hint, brand, direction } = classifyRow(row, ctx)
    return {
      status: deletedKeys.has(keys[i]!) ? 'deleted' : 'new',
      row,
      key: keys[i]!,
      group: groupKey(brand.key, direction, decision),
      brand: brand.key,
      brandLabel: brand.brand?.label ?? null,
      direction,
      decision,
      hint
    }
  })

  const dates = file.rows.map((r) => r.date).sort()
  const period = file.period ?? (dates.length ? { from: dates[0]!, to: dates.at(-1)! } : null)
  // Only a list of operations shows pending rows (the account history has the booked ones only).
  const vanished = period && file.format === 'lista' ? mine.filter((t) => t.bank?.pending && !used.has(t.id) && t.date >= period.from && t.date <= period.to) : []
  return { accountId, rows, vanished, period }
}

// ------------------------------------------------------------------ groups and themes (1.2.1, D75)

/** What kind of operation an undecided group is (its theme when the bank gives no hint). */
export type OpKind = 'card' | 'transfer' | 'fee' | 'other'

export function opKindOf(operation: string): OpKind {
  if (/^(ZAKUP|BLIK ZAKUP|PŁATNOŚĆ|PLATNOSC|TRANSAKCJA)/.test(operation)) return 'card'
  if (/^(PRZELEW|BLIK P2P|ZLECENIE|POLECENIE|WPŁATA|WPLATA|UZNANIE|PRZEKAZ|OBCIĄŻENIE|OBCIAZENIE)/.test(operation)) return 'transfer'
  if (/^(PROWIZJA|OPŁATA|OPLATA|ODSETKI|PODATEK)/.test(operation)) return 'fee'
  return 'other'
}

/** The user's own rules are the surest; nothing is the weakest – a group is as sure as its least sure row. */
const SURENESS: Record<DecisionSource, number> = { none: 0, keyword: 1, brand: 2, builtin: 3, rule: 4 }

export interface ImportGroup {
  group: string
  brand: string
  direction: Direction
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
      theme: source !== 'none' ? `${first.direction}|=${proposalSig(first.decision)}` : hint ? `${first.direction}|hint:${hint}` : `${first.direction}|op:${opKindOf(first.row.operation)}`
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
        g.source !== 'none'
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
  /** Manual entries matched (`RowPlan.key`) that stay separate: the row is imported as a new operation. */
  noMerge: Record<string, boolean>
  /** Vanished pending operations (ids) to delete. */
  removeVanished: Record<string, boolean>
  /** Rows of deleted operations (`RowPlan.key`) to import again. */
  restoreDeleted: Record<string, boolean>
  /** New rows (`RowPlan.key`) the user leaves out of this import (1.2.1): the next file brings them again. */
  skip: Record<string, boolean>
}

export const choiceOf = (d: ImportDecision): Choice => ({ kind: d.kind, categoryId: d.categoryId, refundable: d.refundable, household: d.household, counterAccountId: d.counterAccountId })

export const sameChoice = (a: Choice, b: Choice): boolean =>
  a.kind === b.kind && a.categoryId === b.categoryId && a.refundable === b.refundable && a.household === b.household && a.counterAccountId === b.counterAccountId

export interface ImportResult {
  create: Transaction[]
  update: Transaction[]
  remove: string[]
  rules: ImportRule[]
  /** Counts for the summary; `excluded` = new rows the user left out (`ImportChoices.skip`). */
  counts: { created: number; merged: number; settled: number; known: number; removed: number; skipped: number; excluded: number }
}

/**
 * The records an import writes. `house` = the open house receivable now: money from a household member repays it
 * first, in date order (D20); `makeId` gives new ids (ULIDs), `now` the time of the import.
 */
export function buildImport(
  plan: ImportPlan,
  choices: ImportChoices,
  opts: { now: string; house: number; makeId: () => string; rules: readonly ImportRule[] }
): ImportResult {
  const groups = importGroups(plan)
  const themeOf = new Map(groups.map((g) => [g.group, g.theme]))
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
  const counts = { created: 0, merged: 0, settled: 0, known: 0, removed: 0, skipped: 0, excluded: 0 }
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
    if ((p.status === 'new' || p.status === 'deleted') && choices.skip[p.key]) {
      counts.excluded++
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
    const theme = group ? themeOf.get(group) : undefined
    const base: Choice =
      p.status === 'new' || p.status === 'deleted'
        ? choiceOf(p.decision)
        : { kind: p.row.amount < 0 ? 'expense' : 'income', categoryId: null, refundable: false, household: false, counterAccountId: null }
    // The row's own decision, else its group's, else its theme's, else the proposal.
    const c = choices.rows[p.key] ?? (group ? choices.groups[group] : undefined) ?? (theme ? choices.themes[theme] : undefined) ?? base
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
        counterAccountId: c.kind === 'transfer' ? c.counterAccountId : null
      },
      { now: opts.now, makeId: opts.makeId, hits: total }
    )
  return { create, update, remove, rules, counts }
}
