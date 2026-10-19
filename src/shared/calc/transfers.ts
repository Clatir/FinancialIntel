/**
 * Transfers between two accounts of the budget (1.7.0, F10, D87): one operation for both sides. Those of before 1.7.0
 * are one side each (T31): two of them are one transfer written twice – joined into one operation, the balances stay as
 * they are; one naming an account whose side is nowhere misses that side (the account's balance lacks it); one next to
 * a transfer in one operation counts its side twice. Found here for the reports („Meldunki”), joined by the caller.
 */
import type { Transaction } from '../schema/records'
import { daysBetween } from './dates'
import { isTwoSided } from './operations'

/** Days apart the two sides of one transfer may be (the import's ±3). */
export const TRANSFER_DAYS = 3

export type TransferIssue =
  /** Two one-sided transfers of one move (before 1.7.0): `keep` takes `drop` as its other side – the balances stay. */
  | { kind: 'pair'; keep: Transaction; drop: Transaction }
  /**
   * A transfer in one operation and a one-sided one of its other side: that side counted twice – `drop` goes, the side
   * keeps `date` (`joinedDay`); `settled` – both before the account's last confirmation (its correction made up for it).
   */
  | { kind: 'double'; keep: Transaction; drop: Transaction; date: string; settled: boolean }
  /** A one-sided transfer naming an account of the budget whose side is nowhere: that account's balance lacks it. */
  | { kind: 'lone'; tx: Transaction }

/** A one-sided transfer (before 1.7.0, or to an account outside the budget). */
const oneSided = (t: Transaction): boolean => t.kind === 'transfer' && !isTwoSided(t) && t.amount !== 0

/**
 * The transfers to report. `accounts` – the budget's accounts; `reportFrom(account)` – the first day a missing side of the
 * account matters (the day after its last confirmed balance – a correction made up for it –, else its opening balance's
 * day; null = all). Each operation in one report at most; the closest days first.
 */
export function transferIssues(txs: readonly Transaction[], accounts: ReadonlySet<string>, reportFrom: (accountId: string) => string | null = () => null): TransferIssue[] {
  const out: TransferIssue[] = []
  const taken = new Set<string>()
  // One-sided transfers by account and amount, and by amount.
  const legs = new Map<string, Transaction[]>()
  const byAmount = new Map<number, Transaction[]>()
  const push = <K,>(map: Map<K, Transaction[]>, k: K, t: Transaction) => {
    const list = map.get(k)
    if (list) list.push(t)
    else map.set(k, [t])
  }
  for (const t of txs) {
    if (!oneSided(t)) continue
    push(legs, `${t.accountId}|${t.amount}`, t)
    push(byAmount, t.amount, t)
  }
  const at = (accountId: string, amount: number) => legs.get(`${accountId}|${amount}`) ?? []
  const near = (a: string, b: string) => Math.abs(daysBetween(a, b)) <= TRANSFER_DAYS
  // The other side of a transfer in one operation written again as a one-sided one (it names the transfer's account, or
  // none – an import before 1.7.0 offered none).
  const doubles: Array<{ keep: Transaction; drop: Transaction; days: number; date: string; settled: boolean }> = []
  for (const t of txs) {
    if (!isTwoSided(t)) continue
    const side = t.counterDate ?? t.date
    const from = reportFrom(t.counterAccountId!)
    for (const l of at(t.counterAccountId!, -t.amount))
      if ((l.counterAccountId === t.accountId || !l.counterAccountId) && near(l.date, side))
        doubles.push({ keep: t, drop: l, days: Math.abs(daysBetween(l.date, side)), date: joinedDay(t, l, from), settled: !!from && side < from && l.date < from })
  }
  doubles.sort((a, b) => a.days - b.days)
  for (const d of doubles) {
    if (taken.has(d.keep.id) || taken.has(d.drop.id)) continue
    taken.add(d.keep.id).add(d.drop.id)
    out.push({ kind: 'double', keep: d.keep, drop: d.drop, date: d.date, settled: d.settled })
  }
  // Two one-sided transfers of one move: the opposite amounts on two accounts, each naming the other or none.
  const pairs: Array<{ a: Transaction; b: Transaction; days: number; named: boolean }> = []
  for (const [amount, outs] of byAmount) {
    if (amount >= 0) continue
    for (const a of outs)
      for (const b of byAmount.get(-amount) ?? []) {
        if (b.accountId === a.accountId || !near(a.date, b.date)) continue
        // A side naming a third account is not this one's.
        if ((a.counterAccountId && a.counterAccountId !== b.accountId) || (b.counterAccountId && b.counterAccountId !== a.accountId)) continue
        pairs.push({ a, b, days: Math.abs(daysBetween(a.date, b.date)), named: !!a.counterAccountId || !!b.counterAccountId })
      }
  }
  pairs.sort((x, y) => x.days - y.days || Number(y.named) - Number(x.named))
  for (const p of pairs) {
    if (taken.has(p.a.id) || taken.has(p.b.id)) continue
    taken.add(p.a.id).add(p.b.id)
    // The money's way from the account it left: the outgoing side keeps its bank row, the other's joins it.
    out.push({ kind: 'pair', keep: p.a, drop: p.b })
  }
  // One naming an account of the budget whose side is nowhere – from the day that account's balance would miss it.
  for (const list of legs.values())
    for (const t of list) {
      const other = t.counterAccountId
      if (taken.has(t.id) || !other || other === t.accountId || !accounts.has(other)) continue
      const from = reportFrom(other)
      if (from && t.date < from) continue
      out.push({ kind: 'lone', tx: t })
    }
  return out
}

/**
 * The other side's day once a double is joined: the one-sided transfer's (its bank's day) when the operation takes its
 * bank row, else its own – never moving a side across the account's last confirmation (`from` – the day after it): a side
 * the confirmed balance counted stays counted, one it did not count stays out.
 */
function joinedDay(t: Transaction, leg: Transaction, from: string | null): string {
  const side = t.counterDate ?? t.date
  if (from && side < from) return side
  if (from && leg.date < from) return leg.date
  return !t.counterBank && leg.bank ? leg.date : side
}

/** A text of the notes of two operations made one: each once. */
const joined = (a: string, b: string): string => (!a.trim() ? b : !b.trim() || a.trim() === b.trim() ? a : `${a} · ${b}`)

/**
 * One operation for both sides of a transfer (F10): `keep` with `drop` as its other side – its account, its bank row and
 * day –, the notes of both. A pair's sides stay as they were; a double's other side (`keep` two-sided) takes the bank's
 * row of the one-sided transfer when it has none, on `day` (the issue's – `joinedDay`; else the bank row's day).
 */
export function joinTransfer(keep: Transaction, drop: Transaction, day?: string): Transaction {
  const base: Transaction = { ...keep, note: joined(keep.note, drop.note), logNote: joined(keep.logNote, drop.logNote), title: keep.title || drop.title, counterparty: keep.counterparty || drop.counterparty }
  const { counterDate: _day, ...rest } = base
  if (isTwoSided(keep)) {
    const takes = !keep.counterBank && !!drop.bank
    const side = day ?? (takes ? drop.date : (keep.counterDate ?? keep.date))
    return { ...rest, ...(takes ? { counterBank: drop.bank } : {}), ...(side !== keep.date ? { counterDate: side } : {}) }
  }
  return { ...rest, bothSides: true, counterAccountId: drop.accountId, counterBank: drop.bank ?? null, ...(drop.date !== keep.date ? { counterDate: drop.date } : {}) }
}

/** A one-sided transfer naming an account of the budget with its other side added (F10): that account gets the money. */
export const withBothSides = (t: Transaction): Transaction => ({ ...t, bothSides: true })
