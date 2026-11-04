/**
 * The deliveries from the trading account (`shared/calc/dock.ts`), counted once per what they read: the docking's list
 * (`features/dock/state.ts` – the bridge's panel, the briefing, the docking window, the notifications) and the engine's
 * pairs not docked yet (`store/fleet.ts` – AP-12, T341) share this memo – one scan of the operations, not two at every
 * edit and every ICTTJ snapshot (przegląd N2). A store module both import: no cycle between them.
 */
import { deliveries, type Delivery } from '@shared/calc/dock'
import type { IctjSnapshot } from '@shared/ictj'
import { MBANK_ACCOUNT_ID, type Transaction } from '@shared/schema'
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
 * before 1.5.0). null = none imported: the time alone decides.
 */
function coveredToOf(transactions: readonly Transaction[], covered: Readonly<Record<string, string>>): string | null {
  const last = new Map<string, string>()
  const trading = new Set<string>()
  for (const t of transactions) {
    if (t.kind === 'trading') trading.add(t.accountId)
    if (t.bank && t.date > (last.get(t.accountId) ?? '')) last.set(t.accountId, t.date)
  }
  const accounts = [...trading].filter((id) => last.has(id) || covered[id])
  const ends = (accounts.length ? accounts : [MBANK_ACCOUNT_ID]).map((id) => [covered[id] ?? '', last.get(id) ?? ''].sort().at(-1)!).filter(Boolean)
  return ends.length ? ends.sort()[0]! : null
}

/**
 * The deliveries now – the same list while the operations, the dockings, the entries skipped, the ICTTJ snapshot, the
 * budget's start (null = not started), the day and the bank files' coverage are the same objects.
 */
export function deliveriesFor(records: Pick<Records, 'transactions' | 'dockings'>, skipped: readonly string[], snap: IctjSnapshot, start: string | null, today: string, covered: Readonly<Record<string, string>>): Delivery[] {
  const hit = memos.find((m) => m.tx === records.transactions && m.dk === records.dockings && m.skipped === skipped && m.snap === snap && m.start === start && m.today === today && m.covered === covered)
  if (hit) return hit.list
  const transactions = listOf(records.transactions)
  const list = deliveries({
    entries: snap.status === 'ok' ? snap.entries : [],
    transactions,
    dockings: listOf(records.dockings),
    start,
    today,
    skipped,
    ictjOn: snap.status === 'ok',
    // A payout of ICTTJ not read (still syncing) is never taken for deleted (B21); a newer format's warning changes nothing.
    entriesComplete: snap.status === 'ok' && snap.complete !== false,
    unreadEntries: snap.unread,
    coveredTo: coveredToOf(transactions, covered)
  })
  memos = [{ tx: records.transactions, dk: records.dockings, skipped, snap, start, today, covered, list }, ...memos].slice(0, MEMOS)
  return list
}
