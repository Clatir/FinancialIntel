/**
 * Docking a delivery (E5, D72): the docking record (each ICTTJ entry at most once – T15) and, for a payout without a
 * pair in the bank, its operation on Portfel XTB. Undone with „Cofnij”.
 */
import { asPayout, type Delivery } from '@shared/calc/dock'
import { ICTJ_POOL_LABEL } from '@shared/ictj'
import { derivedId, newId } from '@shared/ids'
import { dockingSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Docking, type Transaction } from '@shared/schema'
import { addRecord, canWrite, deleteOrSay, updateRecord, updateSettings, useData } from '../../store/data'
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
    // One id per payout (B17): docked on two computers before the sync, it is one file – never twice the money.
    id: d.entry ? derivedId(d.entry.id, `wallet:${d.entry.id}`) : newId(),
    createdAt: now,
    updatedAt: now,
    date: d.date,
    accountId: XTB_WALLET_ACCOUNT_ID,
    kind: 'trading',
    amount: d.direction === 'in' ? d.amount : -d.amount,
    counterparty: 'XTB',
    // The names of the docking window and the bridge (N43).
    title: d.direction === 'in' ? `Wypłata z ICTTJ${pool}` : `Zwrot do masy z ICTTJ${pool}`,
    note: d.entry?.note ?? ''
  })
}

/** The docking record of a delivery with its operation (the pool of its ICTTJ entry, the split of the window). */
export function dockingOf(d: Delivery, tx: Transaction, split: SplitDraft | null, now: string): Docking {
  const others = split ? split.hull + split.taxHold + Object.values(split.goals).reduce((a, b) => a + b, 0) : 0
  // A payout's docking has one id too (B17); one whose entry was deleted in ICTTJ leaves its pool behind (B21).
  const kept = d.entryGone ? null : d.docking
  return dockingSchema.parse({
    ...(d.docking ?? { schemaVersion: SCHEMA_VERSION, id: d.entry ? derivedId(d.entry.id, `docking:${d.entry.id}`) : newId(), createdAt: now }),
    updatedAt: now,
    date: tx.date,
    transactionId: tx.id,
    ictjEntryId: d.entry?.id ?? kept?.ictjEntryId ?? null,
    entryDate: d.entry?.date ?? kept?.entryDate ?? null,
    pool: d.entry?.pool ?? kept?.pool ?? null,
    // The engine splits the operation's amount – the bank's when it differs from the entry's (B22, B59).
    split: split ? { shields: Math.max(0, Math.abs(tx.amount) - others), hull: split.hull, goals: Object.fromEntries(Object.entries(split.goals).filter(([, v]) => v > 0)), taxHold: split.taxHold } : null
  })
}

export function dockDelivery(d: Delivery, split: SplitDraft | null): boolean {
  if (!canWrite()) return false
  // A docked delivery whose operation is not here (not synced yet, deleted): never a second operation for it.
  if (!d.transaction && d.state === 'docked') {
    toast('Operacji tego dokowania nie ma w folderze (może jeszcze się synchronizuje) – podział zostaje bez zmian.', 'error', 6000)
    return false
  }
  const now = new Date().toISOString()
  const records = useData.getState().records
  // The payout's wallet operation already here (written on another computer – B17): docked with it, not again.
  const wallet = d.transaction ? null : walletOperation(d, now)
  const existing = wallet ? (records.transactions[wallet.id]?.record ?? null) : null
  const created = existing ? null : wallet
  // An inflow typed on Portfel XTB (B69): it becomes the payout – never a second operation for the same money. The
  // record as it is now (an edit since the window opened stays); „Cofnij” gives back only what the docking changed.
  const typed = d.walletTyped && d.transaction ? (records.transactions[d.transaction.id]?.record ?? d.transaction) : null
  const payout = typed ? { ...asPayout(typed), updatedAt: now } : null
  const tx = payout ?? d.transaction ?? existing ?? created!
  const stored = records.dockings?.[dockingOf(d, tx, split, now).id]?.record
  const docking = dockingOf(stored && !d.docking ? { ...d, docking: stored } : d, tx, split, now)
  const before = d.docking ?? stored ?? null
  if (created) addRecord('transactions', created)
  if (payout) updateRecord('transactions', payout.id, (cur) => ({ ...asPayout(cur), updatedAt: now }))
  if (before) updateRecord('dockings', before.id, () => docking)
  else addRecord('dockings', docking)
  // Dockings of this payout whose operation is gone (B15): they dock nothing – out of the folder.
  const orphans = d.orphans.filter((o) => o.id !== docking.id)
  for (const o of orphans) deleteOrSay('dockings', o.id)
  playSound('docking')
  toast(`Zadokowano ${plnText(d.amount)} zł${created ? ' na Portfelu XTB' : ''}.`, 'success', 6000, {
    label: 'Cofnij',
    run: () => {
      if (before) updateRecord('dockings', before.id, () => before)
      else deleteOrSay('dockings', docking.id)
      if (created) deleteOrSay('transactions', created.id)
      if (typed) updateRecord('transactions', typed.id, (cur) => ({ ...cur, kind: typed.kind, categoryId: typed.categoryId, counterparty: typed.counterparty, repaid: typed.repaid }))
      for (const o of orphans) addRecord('dockings', o)
    }
  })
  return true
}

/**
 * The extra dockings of one payout (two computers before the sync – B17): each goes, and its operation too when it is
 * one on Portfel XTB made by the docking (a bank's operation stays – an inflow to dock again). „Cofnij” brings them back.
 */
export function removeExtraDockings(d: Delivery): void {
  if (!d.extra.length || !canWrite()) return
  const ops = d.extra.filter((x) => x.transaction.accountId === XTB_WALLET_ACCOUNT_ID && !x.transaction.bank).map((x) => x.transaction)
  for (const x of d.extra) deleteOrSay('dockings', x.docking.id)
  for (const t of ops) deleteOrSay('transactions', t.id)
  toast(`Usunięto podwójne dokowanie${ops.length ? ` i ${ops.length === 1 ? 'jego operację' : 'ich operacje'} na Portfelu XTB` : ''}.`, 'success', 8000, {
    label: 'Cofnij',
    run: () => {
      for (const t of ops) addRecord('transactions', t)
      for (const x of d.extra) addRecord('dockings', x.docking)
    }
  })
}

/** An ICTTJ entry that is not the budget's money (it went elsewhere): left out of the docking, until brought back. */
export function skipEntry(id: string, skip: boolean): void {
  updateSettings((f) => {
    const list = f.settings.ictj.skipped.filter((x) => x !== id)
    return { ...f, settings: { ...f.settings, ictj: { ...f.settings.ictj, skipped: skip ? [...list, id] : list } } }
  })
}
