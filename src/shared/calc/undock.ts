/**
 * „Wycofaj dokowanie” (AP-9, N-PC-2): what taking a docked delivery back removes. Pure, from the delivery
 * (`calc/dock.ts` `deliveries`):
 * - its docking, and the extra dockings of the same ICTTJ entry (two computers before the sync – B17): the delivery is
 *   to dock again, never still docked by a second record;
 * - the operation on Portfel XTB a docking made for a payout without a pair in the bank (`walletOperation`); an
 *   operation of the bank, an XTB inflow typed by hand on Portfel XTB (B69) or a trading operation typed in the editor
 *   stays – it waits to be docked again (T360).
 * Nothing of ICTTJ's folder: FI only reads it.
 */
import { derivedId } from '../ids'
import { XTB_WALLET_ACCOUNT_ID } from '../schema/budget'
import type { Docking, Transaction } from '../schema/records'
import type { Delivery } from './dock'

/** The id of the Portfel XTB operation of an ICTTJ payout (B17): one per entry – docked on two computers, one file. */
export const walletOperationId = (entryId: string): string => derivedId(entryId, `wallet:${entryId}`)

/** The id of an ICTTJ entry's docking (B17). */
export const dockingIdOf = (entryId: string): string => derivedId(entryId, `docking:${entryId}`)

/**
 * The operation a docking made on Portfel XTB: a trading operation outside the bank's files with the entry's wallet id
 * (B17), or – made before it – written in the same moment as its docking (`dockDelivery` stamps both with one `now`).
 */
export function madeByDocking(t: Transaction, d: Docking): boolean {
  if (t.accountId !== XTB_WALLET_ACCOUNT_ID || t.bank || t.kind !== 'trading') return false
  return (d.ictjEntryId != null && t.id === walletOperationId(d.ictjEntryId)) || t.createdAt === d.createdAt
}

export interface Undocking {
  dockings: Docking[]
  /** The Portfel XTB operations the dockings made: removed with them. */
  transactions: Transaction[]
}

/** What „Wycofaj dokowanie” removes; null = the delivery is not docked (nothing to take back). */
export function undockingOf(d: Pick<Delivery, 'state' | 'docking' | 'transaction' | 'extra'>): Undocking | null {
  if (d.state !== 'docked' || !d.docking || !d.transaction) return null
  const pairs = [{ docking: d.docking, transaction: d.transaction }, ...d.extra]
  return {
    dockings: pairs.map((p) => p.docking),
    transactions: pairs.filter((p) => madeByDocking(p.transaction, p.docking)).map((p) => p.transaction)
  }
}
