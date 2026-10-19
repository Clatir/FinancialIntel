/**
 * The bank's balance from the account history (1.5.1, F5, T167): mBank writes „Saldo po operacji” at every row. The
 * balance after the file's last day against the budget's that day: the same = the balance confirmed by itself
 * („Telemetria z banku – kadłub zgodny z odczytem”); another = where the difference comes from, the earliest day first –
 * a row of the bank missing in the budget, an operation of the budget the bank has not, another amount, a difference
 * from before the file, a gap in the file's own chain of balances (a filtered or incomplete list).
 *
 * The budget dates an operation by the day it was made (the bank's „Data operacji”), the bank's balances follow the
 * booking: the budget's balance at the end of a day = the balance before the file's first booking + the file's rows made
 * up to that day (every operation made before the file's first booking was booked before it).
 */
import { addDays } from '../calc/dates'
import { balanceAt, openingOf } from '../calc/balances'
import { amountOn, dateOn, touchesAccount } from '../calc/operations'
import type { Balance, Transaction } from '../schema'
import type { MbankRow } from './mbank'

export interface StatementRow {
  /** The row's key on the account (`bank.key` of its operation). */
  key: string
  /** The day it was made (the budget's date of its operation). */
  date: string
  /** The day it was booked (its balance's place). */
  booked: string
  amount: number
  /** The bank's balance after it. */
  balance: number
  name: string
  /** Its operation in the budget after the import (null = none: left out, deleted). */
  txId: string | null
}

/** Money of the bank's chain no row of the file has, between two booking days (`from` = `to`: inside one day). */
export interface StatementGap {
  from: string
  to: string
  amount: number
}

export interface Statement {
  accountId: string
  /** By the booking day. */
  rows: StatementRow[]
  /** The balance before the first booking of the file. */
  start: number
  /** The balance at the end of the file's last booking day. */
  end: { date: string; balance: number }
  gaps: StatementGap[]
}

type Chained = Pick<StatementRow, 'amount' | 'balance'>

/** The row a day's chain of balances starts with / ends with (null = not one: the chain does not tell). */
function chainEnd<T extends Chained>(day: readonly T[], first: boolean): T | null {
  const found = day.filter((r) =>
    first ? !day.some((o) => o !== r && o.balance === r.balance - r.amount) : !day.some((o) => o !== r && o.balance - o.amount === r.balance)
  )
  return found.length === 1 ? found[0]! : null
}

/**
 * The rows of an account history in the order the bank booked them: the file's order or the reverse – the one its
 * balances chain in (mBank writes the newest first), else by the booking days –, then by the booking day.
 */
export function bookingOrder<T extends Chained & { booked: string }>(rows: readonly T[]): T[] {
  let asc = 0
  let desc = 0
  for (let i = 1; i < rows.length; i++) {
    if (rows[i - 1]!.balance + rows[i]!.amount === rows[i]!.balance) asc++
    if (rows[i]!.balance + rows[i - 1]!.amount === rows[i - 1]!.balance) desc++
  }
  const reverse = desc > asc || (desc === asc && rows.length > 1 && rows[0]!.booked > rows.at(-1)!.booked)
  const seq = reverse ? [...rows].reverse() : [...rows]
  return seq.map((r, i) => ({ r, i })).sort((a, b) => a.r.booked.localeCompare(b.r.booked) || a.i - b.i).map((x) => x.r)
}

/**
 * The statement of an account history imported to `accountId`: its rows with balances (null = none – the list of
 * operations has no balances), each with its operation (`txIdOf` its key).
 */
export function statementOf(rows: ReadonlyArray<{ row: MbankRow; key: string }>, accountId: string, txIdOf: (key: string) => string | null): Statement | null {
  const withBalance = rows.filter((p) => p.row.balanceAfter != null)
  if (!withBalance.length) return null
  const ordered = bookingOrder(
    withBalance.map((p) => ({
      key: p.key,
      date: p.row.date,
      booked: p.row.booked ?? p.row.date,
      amount: p.row.amount,
      balance: p.row.balanceAfter!,
      name: p.row.counterparty || p.row.title || p.row.operation,
      txId: txIdOf(p.key)
    }))
  )
  const days = new Map<string, StatementRow[]>()
  for (const r of ordered) days.set(r.booked, [...(days.get(r.booked) ?? []), r])
  const gaps: StatementGap[] = []
  let start = 0
  let prev: { day: string; close: number } | null = null
  for (const [day, list] of days) {
    const open = chainEnd(list, true) ?? list[0]!
    const opening = open.balance - open.amount
    const close = (chainEnd(list, false) ?? list.at(-1)!).balance
    if (!prev) start = opening
    else if (opening !== prev.close) gaps.push({ from: prev.day, to: day, amount: opening - prev.close })
    const inside = close - opening - list.reduce((s, r) => s + r.amount, 0)
    if (inside !== 0) gaps.push({ from: day, to: day, amount: inside })
    prev = { day, close }
  }
  return { accountId, rows: ordered, start, end: { date: prev!.day, balance: prev!.close }, gaps }
}

export interface StatementCheck {
  /** The bank's balance at the end of the file's last day. */
  bank: { date: string; balance: number }
  /** The budget's balance that day. */
  fi: number
  /** The budget's − the bank's. */
  diff: number
  /** The first day compared (the file's first booking day, or the account's opening balance when later). */
  from: string
  /** The difference at the end of the day before `from` (an opening balance, operations before the file). */
  before: number
  /** In the bank, not in the budget (a row left out or deleted, its operation on another account or day). */
  missing: Array<{ date: string; name: string; amount: number; key: string }>
  /** In the budget, not in the bank (typed by hand, twice, not booked yet, a correction). */
  extra: Array<{ date: string; name: string; amount: number; id: string }>
  /** In both, with another amount. */
  amounts: Array<{ date: string; name: string; bank: number; fi: number; id: string }>
  /** Gaps of the file's own chain from `from` on. */
  gaps: StatementGap[]
  /** What the above does not explain (an operation moved to another day…). */
  other: number
  /** The earliest day of a difference: '' = before `from`, null = none. */
  firstDay: string | null
}

/** The budget now against the bank's balances of `st`. */
export function statementCheck(st: Statement, input: { transactions: readonly Transaction[]; balances: readonly Balance[]; tx: (id: string) => Transaction | undefined }): StatementCheck {
  const acc = st.accountId
  const opening = openingOf(acc, input.balances)
  const first = st.rows[0]!.booked
  const from = opening && opening.date > first ? opening.date : first
  const last = st.end.date
  const fi = balanceAt(acc, last, input.transactions, input.balances)
  const bankBefore =
    st.start +
    st.rows.filter((r) => r.date < from).reduce((s, r) => s + r.amount, 0) +
    st.gaps.filter((g) => g.to < from).reduce((s, g) => s + g.amount, 0)
  const before = balanceAt(acc, addDays(from, -1), input.transactions, input.balances) - bankBefore
  const missing: StatementCheck['missing'] = []
  const amounts: StatementCheck['amounts'] = []
  const matched = new Set<string>()
  for (const r of st.rows) {
    if (r.date < from) continue
    const t = r.txId ? input.tx(r.txId) : undefined
    // A transfer in one operation (F10): its side on this account – the other account's row joined to it.
    if (!t || !touchesAccount(t, acc) || dateOn(t, acc) < from || dateOn(t, acc) > last) {
      missing.push({ date: r.date, name: r.name, amount: r.amount, key: r.key })
      continue
    }
    matched.add(t.id)
    const own = amountOn(t, acc)
    if (own !== r.amount) amounts.push({ date: r.date, name: r.name, bank: r.amount, fi: own, id: t.id })
  }
  const extra = input.transactions
    .filter((t) => touchesAccount(t, acc) && !matched.has(t.id) && dateOn(t, acc) >= from && dateOn(t, acc) <= last)
    .map((t) => ({ date: dateOn(t, acc), name: t.counterparty || t.note || '', amount: amountOn(t, acc), id: t.id }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const gaps = st.gaps.filter((g) => g.to >= from)
  const sum = <T>(xs: readonly T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0)
  const diff = fi - st.end.balance
  const explained = before + sum(amounts, (a) => a.fi - a.bank) + sum(extra, (e) => e.amount) - sum(missing, (m) => m.amount) - sum(gaps, (g) => g.amount)
  const days = [...missing.map((m) => m.date), ...extra.map((e) => e.date), ...amounts.map((a) => a.date), ...gaps.map((g) => g.from)].sort()
  const firstDay = diff === 0 ? null : before !== 0 ? '' : (days[0] ?? null)
  return { bank: { date: last, balance: st.end.balance }, fi, diff, from, before, missing, extra, amounts, gaps, other: diff - explained, firstDay }
}
