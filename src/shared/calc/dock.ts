/**
 * Deliveries from the trading account (E5, D56, D72): the ICTTJ payouts paired with the operations of the bank, and the
 * XTB inflows still to be docked. Pure, from the records and the ICTTJ snapshot:
 * - an ICTTJ withdrawal pairs with an inflow from XTB of the same amount (in grosze) dated from 3 days before its date
 *   to 3 working days after it (Polish holidays are no working days – F42); a return pairs with an outflow to XTB the
 *   same way; each entry and each operation at most once;
 * - an entry without such a pair takes an operation of nearly its amount (≤ max(5 zł, 1%)) a few days further on as its
 *   possible pair (B22): never Portfel XTB then – the window offers it, the bank's amount counts;
 * - an entry without a pair after 3 working days – the bank's file of the account the money comes to reaching past them
 *   (B18) – went to Portfel XTB (no export): the docking proposes that account, the user confirms;
 * - an XTB inflow without an ICTTJ entry docks the usual way (the window proposes the order), with a reminder to add the
 *   entry in ICTTJ;
 * - a withdrawal typed on Portfel XTB as an ordinary inflow (the quick entry – B69) is its pair too, after the bank's
 *   operations: the docking makes it the payout it is (`asPayout`), never a second operation;
 * - the budget's start is decided by the date of the money in the bank (B19): an entry whose pair came before the start
 *   is in the opening balances (and so is its pair); an entry from before the start with its pair after it docks; no
 *   Portfel XTB for an entry whose window begins before the start;
 * - an entry docks at most once (`dockings/*` with its id – T15); a docking whose operation is gone (B15) docks nothing,
 *   one whose entry was deleted in ICTTJ (read whole – B21) leaves its operation free to pair again; two dockings of one
 *   entry (two computers – B17) are shown, the extra one to remove.
 */
import type { IctjEntry } from '../ictj'
import { XTB_WALLET_ACCOUNT_ID } from '../schema/budget'
import type { Docking, Transaction } from '../schema/records'
import { addDays, isWorkingDay } from './dates'
import { computeFleet, dockingsByTx, type FleetInput, type FleetState, type Moves } from './fleet'

/** Working days an inflow may take after the ICTTJ entry (D72: Friday's withdrawal comes on Monday or Tuesday). */
export const PAIR_WORKING_DAYS = 3
/** An entry dated a little after the bank's day (written in ICTTJ later): still its pair. */
export const PAIR_DAYS_BEFORE = 3
/** Days after the window a possible pair of another amount may come (B22: a transfer after the holidays). */
export const NEAR_EXTRA_DAYS = 4

/** `n` working days (Monday–Friday, no public holidays – F42) after `date`. */
export function addWorkingDays(date: string, n: number): string {
  let d = date
  for (let left = n; left > 0; ) {
    d = addDays(d, 1)
    if (isWorkingDay(d)) left--
  }
  return d
}

/** An amount of the bank close to the entry's (B22): a conversion, a fee, a typo – max(5 zł, 1%). */
export const nearAmount = (bank: number, entry: number): boolean => bank !== entry && Math.abs(bank - entry) <= Math.max(500, Math.round(entry / 100))

/**
 * - 'pending' – to dock now (an entry with its operation, an entry without a pair past the window – Portfel XTB, an XTB
 *   inflow without a docking, one docked with an entry deleted in ICTTJ);
 * - 'waiting' – an entry waiting for the import from mBank (the window has not passed; Portfel XTB can be chosen anyway);
 * - 'docked', 'before-start' (left out), 'skipped' (the user said it is not the budget's).
 */
export type DeliveryState = 'pending' | 'waiting' | 'docked' | 'before-start' | 'skipped'

export interface Delivery {
  /** `ictj:<entry id>` or `tx:<operation id>`. */
  key: string
  state: DeliveryState
  /** Money into the budget (a withdrawal, an XTB inflow) or out of it (a return to the trading capital). */
  direction: 'in' | 'out'
  date: string
  /** Grosze, positive. */
  amount: number
  entry: IctjEntry | null
  /** The operation of the bank (paired or docked); null = none yet. */
  transaction: Transaction | null
  docking: Docking | null
  /** No pair in the bank past the window: the money went to (came from) Portfel XTB – to confirm. */
  wallet: boolean
  /** An XTB inflow without an entry in ICTTJ (the reminder, D56) – only when ICTTJ is read on this computer. */
  missingEntry: boolean
  /** The entry and its operation disagree: an amount changed in ICTTJ afterwards, or a possible pair of another amount. */
  mismatch: boolean
  /** The pair is one of nearly the amount (B22): to confirm in the window. */
  near: boolean
  /** The entry's pool changed in ICTTJ after the docking (B16): dock again to take the new one. */
  poolChanged: boolean
  /** More dockings of this entry with operations of their own (two computers before the sync – B17): to remove. */
  extra: Array<{ docking: Docking; transaction: Transaction }>
  /** Dockings of this entry whose operation is gone (B15): removed when it docks again. */
  orphans: Docking[]
  /** Docked with an ICTTJ entry deleted since (B21): its pool no longer holds – dock again. */
  entryGone: boolean
  /** The pair is an inflow typed on Portfel XTB (B69): the docking makes it the payout (`asPayout`). */
  walletTyped: boolean
}

export interface DeliveriesInput {
  entries: readonly IctjEntry[]
  transactions: readonly Transaction[]
  dockings: readonly Docking[]
  /** The budget's first day (null = not started: nothing docks). */
  start: string | null
  today: string
  /** `settings.ictj.skipped`. */
  skipped: readonly string[]
  /** ICTTJ is read on this computer (else an inflow cannot be told to have no entry). */
  ictjOn: boolean
  /** ICTTJ's payouts listed whole: an entry missing from them was deleted there (B21). */
  entriesComplete?: boolean
  /** Payouts of ICTTJ not read (a file still syncing, a broken one): never taken for deleted. */
  unreadEntries?: readonly string[]
  /**
   * The last day the bank's files cover on the account the XTB money comes to (B18: the file's period, not the moment
   * of the import); null = never imported – the time alone decides.
   */
  coveredTo: string | null
}

const STATE_ORDER: Record<DeliveryState, number> = { pending: 0, waiting: 1, docked: 2, skipped: 3, 'before-start': 4 }

type Flags = Pick<Delivery, 'wallet' | 'missingEntry' | 'mismatch' | 'near' | 'poolChanged' | 'extra' | 'orphans' | 'entryGone' | 'walletTyped'>
const nothing = (): Flags => ({ wallet: false, missingEntry: false, mismatch: false, near: false, poolChanged: false, extra: [], orphans: [], entryGone: false, walletTyped: false })

/**
 * An inflow typed on Portfel XTB by hand (B69): no member's money, no parts – what a payout from the trading account
 * typed in the quick entry is. Not docked yet.
 */
const isWalletTyped = (t: Transaction): boolean =>
  t.kind === 'income' && t.accountId === XTB_WALLET_ACCOUNT_ID && t.amount > 0 && !t.memberId && !t.advance && !t.splits.length && !t.covers.length

/** The payout an inflow typed on Portfel XTB is (B69): the trading account's operation, as the docking keeps it. */
export function asPayout(t: Transaction): Transaction {
  if (!isWalletTyped(t)) return t
  return { ...t, kind: 'trading', categoryId: null, counterparty: t.counterparty || 'XTB', repaid: 0 }
}

export function deliveries(o: DeliveriesInput): Delivery[] {
  const dockingByTx = dockingsByTx(o.dockings)
  // Only the operations a delivery can be about (W13): the trading account's and the docked ones – never a map of all.
  const txById = new Map<string, Transaction>()
  const typed = (t: Transaction) => isWalletTyped(t) && !dockingByTx.has(t.id)
  for (const t of o.transactions) if (t.kind === 'trading' || dockingByTx.has(t.id) || typed(t)) txById.set(t.id, t)
  const counted = (date: string) => o.start != null && date >= o.start
  // An entry deleted in ICTTJ (its payouts listed whole; a file still syncing or unreadable deletes nothing – B21).
  const entryIds = new Set(o.entries.map((e) => e.id))
  const unread = new Set(o.unreadEntries ?? [])
  const gone = (d: Docking) => !!d.ictjEntryId && !!o.entriesComplete && o.ictjOn && !entryIds.has(d.ictjEntryId) && !unread.has(d.ictjEntryId)
  // An entry is docked by the dockings that count for their operations (the engine's) – an operation still there (B15).
  const dockedByEntry = new Map<string, Docking[]>()
  const orphansByEntry = new Map<string, Docking[]>()
  for (const d of o.dockings) {
    if (!d.ictjEntryId) continue
    if (!txById.has(d.transactionId)) orphansByEntry.set(d.ictjEntryId, [...(orphansByEntry.get(d.ictjEntryId) ?? []), d])
    else if (dockingByTx.get(d.transactionId)?.id === d.id) dockedByEntry.set(d.ictjEntryId, [...(dockedByEntry.get(d.ictjEntryId) ?? []), d])
  }
  // Operations of the trading account not docked with an entry yet (a docking without an entry, or with one deleted in
  // ICTTJ, can still get one).
  const free = new Set(
    [...txById.values()]
      .filter((t) => {
        const d = dockingByTx.get(t.id)
        return (t.kind === 'trading' && t.amount !== 0 && (!d?.ictjEntryId || gone(d))) || typed(t)
      })
      .map((t) => t.id)
  )
  const out: Delivery[] = []
  const base = (e: IctjEntry) => ({
    ...nothing(),
    key: `ictj:${e.id}`,
    direction: e.kind === 'withdrawal' ? ('in' as const) : ('out' as const),
    date: e.date,
    amount: e.amount,
    entry: e,
    orphans: orphansByEntry.get(e.id) ?? []
  })
  const dist = (t: Transaction, e: IctjEntry) => Math.abs(Date.parse(t.date) - Date.parse(e.date))
  const closest = (e: IctjEntry, fits: (t: Transaction) => boolean, better: (a: Transaction, b: Transaction) => boolean): Transaction | null => {
    let pair: Transaction | null = null
    for (const id of free) {
      const t = txById.get(id)!
      if (fits(t) && (!pair || better(t, pair))) pair = t
    }
    return pair
  }
  const paired = (e: IctjEntry, pair: Transaction, near: boolean): Delivery => {
    free.delete(pair.id)
    // The money came before the budget's start: in the opening balances – and the pair with it (B19).
    if (!counted(pair.date)) return { ...base(e), state: 'before-start', transaction: pair, docking: null }
    return { ...base(e), state: 'pending', transaction: pair, docking: dockingByTx.get(pair.id) ?? null, mismatch: near, near, walletTyped: pair.kind !== 'trading' }
  }

  const entries = [...o.entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  const unpaired: IctjEntry[] = []
  const placed = new Map<string, Delivery>()
  // The bank's operation first; an inflow typed on Portfel XTB only when the bank has none (B69).
  const typedLast = (t: Transaction) => (t.kind === 'trading' ? 0 : 1)
  const exact = (e: IctjEntry, only?: (t: Transaction) => boolean) => {
    const sign = e.kind === 'withdrawal' ? 1 : -1
    const from = addDays(e.date, -PAIR_DAYS_BEFORE)
    const until = addWorkingDays(e.date, PAIR_WORKING_DAYS)
    return closest(
      e,
      (t) => t.amount === sign * e.amount && t.date >= from && t.date <= until && (!only || only(t)),
      (a, b) => typedLast(a) < typedLast(b) || (typedLast(a) === typedLast(b) && (dist(a, e) < dist(b, e) || (dist(a, e) === dist(b, e) && a.createdAt < b.createdAt)))
    )
  }
  const skippedEntries: IctjEntry[] = []
  for (const e of entries) {
    // Two computers docked it (B17): the operation of the bank counts before one made up on Portfel XTB, then the older.
    const made = (d: Docking) => (txById.get(d.transactionId)?.bank ? 0 : 1)
    const docked = [...(dockedByEntry.get(e.id) ?? [])].sort((a, b) => made(a) - made(b) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    const first = docked[0]
    if (first) {
      const t = txById.get(first.transactionId)!
      placed.set(e.id, {
        ...base(e),
        state: 'docked',
        transaction: t,
        docking: first,
        mismatch: Math.abs(t.amount) !== e.amount,
        poolChanged: first.pool !== e.pool,
        extra: docked.slice(1).map((d) => ({ docking: d, transaction: txById.get(d.transactionId)! }))
      })
      continue
    }
    // A skipped entry looks for its operation once every other entry has its own (N45, review).
    if (o.skipped.includes(e.id)) {
      skippedEntries.push(e)
      continue
    }
    const pair = exact(e)
    if (pair) placed.set(e.id, paired(e, pair, false))
    else unpaired.push(e)
  }
  // The rest: a possible pair of nearly the amount (B22) – after every exact pair is taken.
  for (const e of unpaired) {
    const sign = e.kind === 'withdrawal' ? 1 : -1
    const from = addDays(e.date, -PAIR_DAYS_BEFORE)
    const until = addWorkingDays(e.date, PAIR_WORKING_DAYS)
    const diff = (t: Transaction) => Math.abs(Math.abs(t.amount) - e.amount)
    const near = closest(
      e,
      (t) => t.kind === 'trading' && Math.sign(t.amount) === sign && nearAmount(Math.abs(t.amount), e.amount) && t.date >= from && t.date <= addDays(until, NEAR_EXTRA_DAYS),
      (a, b) => diff(a) < diff(b) || (diff(a) === diff(b) && (dist(a, e) < dist(b, e) || (dist(a, e) === dist(b, e) && a.createdAt < b.createdAt)))
    )
    if (near) {
      placed.set(e.id, paired(e, near, true))
      continue
    }
    // An entry, or its window, before the budget's start: its money is in the opening balances, not on Portfel XTB (B19).
    if (!counted(from)) {
      placed.set(e.id, { ...base(e), state: 'before-start', transaction: null, docking: null })
      continue
    }
    // Past the window, and the bank's file reaches past it too: the money is not on mBank – Portfel XTB. A file not
    // reaching it: still waiting for it (a wallet docking now could count the inflow twice).
    const late = o.today > until && (o.coveredTo == null || o.coveredTo > until)
    placed.set(e.id, { ...base(e), state: late ? 'pending' : 'waiting', transaction: null, docking: null, wallet: late })
  }
  // A skipped entry keeps the bank's operation left for it (N45): never an inflow „without an entry in ICTTJ” to add again –
  // the money counts in the usual order; brought back, the entry docks it with its pool. Only what no other entry took.
  for (const e of skippedEntries) {
    const pair = exact(e, (t) => t.kind === 'trading')
    if (pair) free.delete(pair.id)
    placed.set(e.id, { ...base(e), state: 'skipped', transaction: pair, docking: null })
  }
  for (const e of entries) out.push(placed.get(e.id)!)

  // XTB inflows without an entry: to dock the usual way (a top-up without an entry is the firewall's matter only); one
  // docked with an entry deleted in ICTTJ – to dock again (B21).
  for (const id of free) {
    const t = txById.get(id)!
    // An inflow typed on Portfel XTB without its entry is an ordinary income (B69): nothing to dock.
    if (t.kind !== 'trading' || t.amount <= 0 || !counted(t.date)) continue
    const d = dockingByTx.get(t.id) ?? null
    const entryGone = !!d && gone(d)
    out.push({
      ...nothing(),
      key: `tx:${t.id}`,
      state: d && !entryGone ? 'docked' : 'pending',
      direction: 'in',
      date: t.date,
      amount: t.amount,
      entry: null,
      transaction: t,
      docking: d,
      missingEntry: o.ictjOn,
      entryGone
    })
  }
  return out.sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || (a.state === 'docked' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)) || a.key.localeCompare(b.key))
}

/**
 * The operations before the budget's start paired with a payout of the pool „Podatek” (N38): in the opening balances,
 * never docked – their money is no income (D81), as a docked one's is not. Operation id → its amount (grosze).
 */
export function preStartTaxOf(o: Pick<DeliveriesInput, 'entries' | 'transactions' | 'dockings' | 'start' | 'skipped'>): Map<string, number> {
  const out = new Map<string, number>()
  if (!o.start || !o.entries.some((e) => e.pool === 'tax')) return out
  for (const d of deliveries({ ...o, today: o.start, ictjOn: true, coveredTo: null }))
    if (d.state === 'before-start' && d.transaction && d.entry?.pool === 'tax') out.set(d.transaction.id, Math.abs(d.transaction.amount))
  return out
}

/** The days the game must not freeze yet (B20): a paired payout not docked – its pool decides where the money goes. */
export function pendingPairDays(list: readonly Delivery[]): string[] {
  return [...new Set(list.filter((d) => d.state === 'pending' && d.entry && d.transaction).map((d) => d.transaction!.date))].sort()
}

/** The ship computed with this operation (and its docking) in – what a docking would do. */
export function withDocking(input: FleetInput, tx: Transaction, docking: Docking | null): FleetState {
  const dockings = (input.dockings ?? []).filter((d) => d.transactionId !== tx.id && (!docking?.ictjEntryId || d.ictjEntryId !== docking.ictjEntryId))
  return computeFleet({
    ...input,
    transactions: [...input.transactions.filter((t) => t.id !== tx.id), tx],
    dockings: docking ? [...dockings, docking] : dockings
  })
}

/** The operation's moves in the layers after such a docking. */
export function previewDocking(input: FleetInput, tx: Transaction, docking: Docking | null): Moves {
  return withDocking(input, tx, docking).log.find((e) => e.txId === tx.id)?.moves ?? {}
}
