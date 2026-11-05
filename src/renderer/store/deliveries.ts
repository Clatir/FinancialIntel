/**
 * The deliveries from the trading account (`shared/calc/dock.ts`), counted once per what they read: the docking's list
 * (`features/dock/state.ts` – the bridge's panel, the briefing, the docking window, the notifications) and the engine's
 * pairs not docked yet (`store/fleet.ts` – AP-12, T341) share this memo – one scan of the operations, not two at every
 * edit and every ICTTJ snapshot (przegląd N2). A store module both import: no cycle between them.
 */
import { deliveries, type Delivery } from '@shared/calc/dock'
import type { IctjSnapshot } from '@shared/ictj'
import { MBANK_ACCOUNT_ID, type Docking, type Transaction } from '@shared/schema'
import { listOf, useData } from './data'

type Records = ReturnType<typeof useData.getState>['records']

export const NO_SKIPPED: readonly string[] = []
export const NO_COVERED: Readonly<Record<string, string>> = {}

type Memo = { tx: Records['transactions']; dk: Records['dockings']; skipped: readonly string[]; snap: IctjSnapshot; start: string | null; today: string; covered: Readonly<Record<string, string>>; list: Delivery[] }

/**
 * The last lists by what they read, the latest first (przegląd N2 3.6): the docking's list and the engine's pairs may ask
 * with another day or start for a while (the fleet's day, the game's now past midnight) – each keeps its own, neither
 * evicts the other's (one slot made each count all the deliveries again at every call).
 */
const MEMOS = 2
let memos: Memo[] = []

/**
 * The last day the bank's files cover on the accounts the XTB money comes to (B18): the accounts with trading operations
 * (else mBank), the least covered one – its period's end as imported, or its latest row from the bank (a folder of
 * before 1.5.0). null = none imported: the time alone decides. With the first day of their rows from the bank (AF-47).
 */
function coveredOf(transactions: readonly Transaction[], covered: Readonly<Record<string, string>>): { coveredTo: string | null; bankFrom: string | null } {
  const last = new Map<string, string>()
  const first = new Map<string, string>()
  const trading = new Set<string>()
  for (const t of transactions) {
    if (t.kind === 'trading') trading.add(t.accountId)
    if (t.bank && t.date > (last.get(t.accountId) ?? '')) last.set(t.accountId, t.date)
    if (t.bank && t.date < (first.get(t.accountId) ?? '9999')) first.set(t.accountId, t.date)
  }
  const accounts = [...trading].filter((id) => last.has(id) || covered[id])
  const ids = accounts.length ? accounts : [MBANK_ACCOUNT_ID]
  const ends = ids.map((id) => [covered[id] ?? '', last.get(id) ?? ''].sort().at(-1)!).filter(Boolean)
  // The bank's history from (AF-47, T435): the account whose rows begin latest – none without rows of the bank.
  const starts = ids.map((id) => first.get(id) ?? null)
  return { coveredTo: ends.length ? ends.sort()[0]! : null, bankFrom: starts.some((x) => x == null) ? null : starts.sort().at(-1)! }
}

/**
 * The deliveries now – the same list while the operations, the dockings, the entries skipped, the ICTTJ snapshot, the
 * budget's start (null = not started), the day and the bank files' coverage are the same objects.
 */
export function deliveriesFor(records: Pick<Records, 'transactions' | 'dockings'>, skipped: readonly string[], snap: IctjSnapshot, start: string | null, today: string, covered: Readonly<Record<string, string>>): Delivery[] {
  const hit = memos.find((m) => m.tx === records.transactions && m.dk === records.dockings && m.skipped === skipped && m.snap === snap && m.start === start && m.today === today && m.covered === covered)
  if (hit) return hit.list
  const list = deliveriesOfLists(listOf(records.transactions), listOf(records.dockings), skipped, snap, start, today, covered)
  memos = [{ tx: records.transactions, dk: records.dockings, skipped, snap, start, today, covered, list }, ...memos].slice(0, MEMOS)
  return list
}

/**
 * The deliveries of these operations and dockings (no memo): a change not made yet – the preview of a bulk change
 * (AP-38) – against the deliveries now.
 */
export function deliveriesOfLists(
  transactions: readonly Transaction[],
  dockings: readonly Docking[],
  skipped: readonly string[],
  snap: IctjSnapshot,
  start: string | null,
  today: string,
  covered: Readonly<Record<string, string>>
): Delivery[] {
  return deliveries({
    entries: snap.status === 'ok' ? snap.entries : [],
    transactions,
    dockings,
    start,
    today,
    skipped,
    ictjOn: snap.status === 'ok',
    // A payout of ICTTJ not read (still syncing) is never taken for deleted (B21); a newer format's warning changes nothing.
    entriesComplete: snap.status === 'ok' && snap.complete !== false,
    unreadEntries: snap.unread,
    ...coveredOf(transactions, covered)
  })
}
