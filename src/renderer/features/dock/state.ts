/**
 * The deliveries from the trading account now (`shared/calc/dock.ts`): the bridge's panel, the briefing, the docking
 * window and the notifications see the same list. The window of one delivery is open at a time (`openDocking`).
 */
import { useMemo } from 'react'
import { create } from 'zustand'
import { deliveries, type Delivery } from '@shared/calc/dock'
import { MBANK_ACCOUNT_ID, type Transaction } from '@shared/schema'
import type { IctjSnapshot } from '@shared/ictj'
import { listOf, useData } from '../../store/data'
import { fleetNow, useFleet } from '../../store/fleet'
import { useIctj } from '../../store/ictj'

type Records = ReturnType<typeof useData.getState>['records']

const NO_SKIPPED: string[] = []

let memo: { tx: Records['transactions']; dk: Records['dockings']; skipped: readonly string[]; snap: IctjSnapshot; start: string | null; today: string; covered: Readonly<Record<string, string>>; list: Delivery[] } | null = null

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

function deliveriesOf(records: Pick<Records, 'transactions' | 'dockings'>, skipped: readonly string[], snap: IctjSnapshot, start: string | null, today: string, covered: Readonly<Record<string, string>>): Delivery[] {
  if (memo && memo.tx === records.transactions && memo.dk === records.dockings && memo.skipped === skipped && memo.snap === snap && memo.start === start && memo.today === today && memo.covered === covered)
    return memo.list
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
  memo = { tx: records.transactions, dk: records.dockings, skipped, snap, start, today, covered, list }
  return list
}

const NO_COVERED: Record<string, string> = {}

export function useDeliveries(): Delivery[] {
  const fleet = useFleet()
  // The operations and dockings only (W13): a change of anything else counts nothing again.
  const transactions = useData((s) => s.records.transactions)
  const dockings = useData((s) => s.records.dockings)
  const skipped = useData((s) => s.fi?.settings.ictj.skipped ?? NO_SKIPPED)
  const covered = useData((s) => s.fi?.settings.import.coveredTo ?? NO_COVERED)
  const snap = useIctj((s) => s.snap)
  const ready = !!fleet
  const start = fleet?.started ? fleet.start : null
  const today = fleet?.today ?? ''
  return useMemo(() => (ready ? deliveriesOf({ transactions, dockings }, skipped, snap, start, today, covered) : []), [ready, transactions, dockings, skipped, snap, start, today, covered])
}

/** The same list outside React (the notifications). */
export function deliveriesNow(): Delivery[] {
  const s = useData.getState()
  const fleet = fleetNow()
  if (!s.fi || !fleet) return []
  return deliveriesOf(s.records, s.fi.settings.ictj.skipped, useIctj.getState().snap, fleet.started ? fleet.start : null, fleet.today, s.fi.settings.import.coveredTo)
}

/** The docking window: the delivery's key, or null. */
export const useDocking = create<{ key: string | null }>(() => ({ key: null }))
export const openDocking = (key: string) => useDocking.setState({ key })
export const closeDocking = () => useDocking.setState({ key: null })

/** The first delivery to dock (the palette, a notification for several). */
export function openFirstDocking(): boolean {
  const d = deliveriesNow().find((x) => x.state === 'pending' || x.state === 'waiting')
  if (d) openDocking(d.key)
  return !!d
}

/** A notification's delivery (`dock:<key>`), else the first to dock. */
export function openDockingTag(tag: string): void {
  const key = tag.startsWith('dock:') ? tag.slice('dock:'.length) : null
  if (key && deliveriesNow().some((d) => d.key === key)) openDocking(key)
  else openFirstDocking()
}
