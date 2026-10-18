/**
 * Deliveries from the trading account (E5, D56, D72): the ICTTJ payouts paired with the operations of the bank, and the
 * XTB inflows still to be docked. Pure, from the records and the ICTTJ snapshot:
 * - an ICTTJ withdrawal pairs with an inflow from XTB of the same amount (in grosze) dated from 3 days before its date
 *   to 3 working days after it; a return pairs with an outflow to XTB the same way; each entry and each operation at
 *   most once;
 * - an entry without a pair after 3 working days – with the mBank import done since – went to Portfel XTB (no export):
 *   the docking proposes that account, the user confirms;
 * - an XTB inflow without an ICTTJ entry docks the usual way (the window proposes the order), with a reminder to add the
 *   entry in ICTTJ;
 * - an entry docks at most once (`dockings/*` with its id – T15); entries from before the budget's start are left out
 *   (they are in the opening balances).
 */
import type { IctjEntry } from '../ictj'
import type { Docking, Transaction } from '../schema/records'
import { addDays, weekdayOf } from './dates'
import { computeFleet, dockingsByTx, type FleetInput, type FleetState, type Moves } from './fleet'

/** Working days an inflow may take after the ICTTJ entry (D72: Friday's withdrawal comes on Monday or Tuesday). */
export const PAIR_WORKING_DAYS = 3
/** An entry dated a little after the bank's day (written in ICTTJ later): still its pair. */
export const PAIR_DAYS_BEFORE = 3

/** `n` working days (Monday–Friday) after `date`. */
export function addWorkingDays(date: string, n: number): string {
  let d = date
  for (let left = n; left > 0; ) {
    d = addDays(d, 1)
    if (weekdayOf(d) <= 5) left--
  }
  return d
}

/**
 * - 'pending' – to dock now (an entry with its operation, an entry without a pair past the window – Portfel XTB, an XTB
 *   inflow without a docking);
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
  /** The docked entry and its operation disagree (an amount changed in ICTTJ afterwards). */
  mismatch: boolean
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
  /** Warsaw date of the last import from mBank (null = never: the time alone decides). */
  importedOn: string | null
}

const STATE_ORDER: Record<DeliveryState, number> = { pending: 0, waiting: 1, docked: 2, skipped: 3, 'before-start': 4 }

export function deliveries(o: DeliveriesInput): Delivery[] {
  const dockingByTx = dockingsByTx(o.dockings)
  // Only the operations a delivery can be about (W13): the trading account's and the docked ones – never a map of all.
  const txById = new Map<string, Transaction>()
  for (const t of o.transactions) if (t.kind === 'trading' || dockingByTx.has(t.id)) txById.set(t.id, t)
  // An entry is docked by the docking that counts for its operation (the engine's).
  const dockingByEntry = new Map<string, Docking>()
  for (const d of dockingByTx.values()) if (d.ictjEntryId && !dockingByEntry.has(d.ictjEntryId)) dockingByEntry.set(d.ictjEntryId, d)
  const counted = (date: string) => o.start != null && date >= o.start
  // Operations of the trading account, not docked with an entry yet (a docking without an entry can still get one).
  const free = new Set([...txById.values()].filter((t) => t.kind === 'trading' && t.amount !== 0 && !dockingByTx.get(t.id)?.ictjEntryId).map((t) => t.id))
  const out: Delivery[] = []
  const base = (e: IctjEntry): Omit<Delivery, 'state' | 'transaction' | 'docking' | 'wallet' | 'mismatch'> => ({
    key: `ictj:${e.id}`,
    direction: e.kind === 'withdrawal' ? 'in' : 'out',
    date: e.date,
    amount: e.amount,
    entry: e,
    missingEntry: false
  })

  for (const e of [...o.entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    const docked = dockingByEntry.get(e.id)
    if (docked) {
      const t = txById.get(docked.transactionId) ?? null
      out.push({ ...base(e), state: 'docked', transaction: t, docking: docked, wallet: false, mismatch: !!t && Math.abs(t.amount) !== e.amount })
      continue
    }
    if (o.skipped.includes(e.id)) {
      out.push({ ...base(e), state: 'skipped', transaction: null, docking: null, wallet: false, mismatch: false })
      continue
    }
    if (!counted(e.date)) {
      out.push({ ...base(e), state: 'before-start', transaction: null, docking: null, wallet: false, mismatch: false })
      continue
    }
    const sign = e.kind === 'withdrawal' ? 1 : -1
    const from = addDays(e.date, -PAIR_DAYS_BEFORE)
    const until = addWorkingDays(e.date, PAIR_WORKING_DAYS)
    let pair: Transaction | null = null
    for (const id of free) {
      const t = txById.get(id)!
      if (t.amount !== sign * e.amount || t.date < from || t.date > until || !counted(t.date)) continue
      const dist = (x: Transaction) => Math.abs(Date.parse(x.date) - Date.parse(e.date))
      if (!pair || dist(t) < dist(pair) || (dist(t) === dist(pair) && t.createdAt < pair.createdAt)) pair = t
    }
    if (pair) {
      free.delete(pair.id)
      out.push({ ...base(e), state: 'pending', transaction: pair, docking: dockingByTx.get(pair.id) ?? null, wallet: false, mismatch: false })
    } else {
      // Past the window, and the bank's export reaches past it too: the money is not on mBank – Portfel XTB. An import
      // not done since: still waiting for it (a wallet docking now could count the inflow twice).
      const late = o.today > until && (o.importedOn == null || o.importedOn > until)
      out.push({ ...base(e), state: late ? 'pending' : 'waiting', transaction: null, docking: null, wallet: late, mismatch: false })
    }
  }

  // XTB inflows without an entry: to dock the usual way (a top-up without an entry is the firewall's matter only).
  for (const id of free) {
    const t = txById.get(id)!
    if (t.amount <= 0 || !counted(t.date)) continue
    const d = dockingByTx.get(t.id) ?? null
    out.push({
      key: `tx:${t.id}`,
      state: d ? 'docked' : 'pending',
      direction: 'in',
      date: t.date,
      amount: t.amount,
      entry: null,
      transaction: t,
      docking: d,
      wallet: false,
      missingEntry: o.ictjOn,
      mismatch: false
    })
  }
  return out.sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || (a.state === 'docked' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)) || a.key.localeCompare(b.key))
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
