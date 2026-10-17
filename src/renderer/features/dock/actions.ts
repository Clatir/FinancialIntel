/**
 * Docking a delivery (E5, D72): the docking record (each ICTTJ entry at most once – T15) and, for a payout without a
 * pair in the bank, its operation on Portfel XTB. Undone with „Cofnij”.
 */
import type { Delivery } from '@shared/calc/dock'
import { ICTJ_POOL_LABEL } from '@shared/ictj'
import { newId } from '@shared/ids'
import { dockingSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Docking, type Transaction } from '@shared/schema'
import { addRecord, deleteRecord, updateRecord, updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'
import { playSound } from '../../lib/sounds'
import { plnText } from '../../components/fields'

/** A split changed in the window (grosze); null = the docking order, as proposed. */
export interface SplitDraft {
  hull: number
  goals: Record<string, number>
  taxHold: number
}

/** The operation of a payout without a pair in the bank: on Portfel XTB (D56 – no export there), on the entry's day. */
export function walletOperation(d: Delivery, now: string): Transaction {
  const pool = d.entry ? ` (pula ${ICTJ_POOL_LABEL[d.entry.pool]})` : ''
  return transactionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    createdAt: now,
    updatedAt: now,
    date: d.date,
    accountId: XTB_WALLET_ACCOUNT_ID,
    kind: 'trading',
    amount: d.direction === 'in' ? d.amount : -d.amount,
    counterparty: 'XTB',
    title: d.direction === 'in' ? `Wypłata z konta tradingowego${pool}` : 'Zwrot do konta tradingowego',
    note: d.entry?.note ?? ''
  })
}

/** The docking record of a delivery with its operation (the pool of its ICTTJ entry, the split of the window). */
export function dockingOf(d: Delivery, tx: Transaction, split: SplitDraft | null, now: string): Docking {
  const others = split ? split.hull + split.taxHold + Object.values(split.goals).reduce((a, b) => a + b, 0) : 0
  return dockingSchema.parse({
    ...(d.docking ?? { schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: now }),
    updatedAt: now,
    date: tx.date,
    transactionId: tx.id,
    ictjEntryId: d.entry?.id ?? d.docking?.ictjEntryId ?? null,
    pool: d.entry?.pool ?? d.docking?.pool ?? null,
    split: split ? { shields: Math.max(0, d.amount - others), hull: split.hull, goals: Object.fromEntries(Object.entries(split.goals).filter(([, v]) => v > 0)), taxHold: split.taxHold } : null
  })
}

export function dockDelivery(d: Delivery, split: SplitDraft | null): boolean {
  if (useData.getState().status?.readOnly) {
    toast('Folder tylko do odczytu – dokowanie niemożliwe.', 'error')
    return false
  }
  // A docked delivery whose operation is not here (not synced yet, deleted): never a second operation for it.
  if (!d.transaction && d.state === 'docked') {
    toast('Operacji tego dokowania nie ma w folderze (może jeszcze się synchronizuje) – podział zostaje bez zmian.', 'error', 6000)
    return false
  }
  const now = new Date().toISOString()
  const created = d.transaction ? null : walletOperation(d, now)
  const tx = d.transaction ?? created!
  const docking = dockingOf(d, tx, split, now)
  const before = d.docking
  if (created) addRecord('transactions', created)
  if (before) updateRecord('dockings', before.id, () => docking)
  else addRecord('dockings', docking)
  playSound('docking')
  toast(`Zadokowano ${plnText(d.amount)} zł${created ? ' na Portfelu XTB' : ''}.`, 'success', 6000, {
    label: 'Cofnij',
    run: () => {
      if (before) updateRecord('dockings', before.id, () => before)
      else void deleteRecord('dockings', docking.id)
      if (created) void deleteRecord('transactions', created.id)
    }
  })
  return true
}

/** An ICTTJ entry that is not the budget's money (it went elsewhere): left out of the docking, until brought back. */
export function skipEntry(id: string, skip: boolean): void {
  updateSettings((f) => {
    const list = f.settings.ictj.skipped.filter((x) => x !== id)
    return { ...f, settings: { ...f.settings, ictj: { ...f.settings.ictj, skipped: skip ? [...list, id] : list } } }
  })
}
