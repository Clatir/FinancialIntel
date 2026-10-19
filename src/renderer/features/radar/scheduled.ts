/**
 * The buoys (1.8.0, F16 – „Boje nawigacyjne”): planned operations and terms – added, changed, deleted with „Cofnij”;
 * a day done by hand („Odhacz”), by an operation made from it („Wykonaj teraz” – saved and opened in Operacje), or by
 * the bank's operation the radar matched (and „to nie ta” when it is not).
 */
import { warsawNow } from '@shared/calc/dates'
import { newId } from '@shared/ids'
import { MBANK_ACCOUNT_ID, scheduledSchema, SCHEMA_VERSION, transactionSchema, type Scheduled } from '@shared/schema'
import { addRecord, canWrite, deleteOrSay, updateRecord, useData } from '../../store/data'
import { toast } from '../../store/ui'
import { playSound } from '../../lib/sounds'
import { deleteWithUndo } from '../history/actions'
import { openOperation } from '../operations/state'

export interface NewScheduled {
  name: string
  date: string
  /** Grosze, ≥ 0; with `direction` – null = a term only. */
  amount: number | null
  direction: 'out' | 'in'
  yearly: boolean
  accountId: string | null
  categoryId: string | null
  counterparty: string
  remind: number[]
  note: string
}

/** The signed amount of a form (null = a term). */
export const signedOf = (o: Pick<NewScheduled, 'amount' | 'direction'>): number | null => (o.amount == null || o.amount <= 0 ? null : o.direction === 'out' ? -o.amount : o.amount)

export function addScheduled(o: NewScheduled): Scheduled | null {
  if (!canWrite()) return null
  const now = new Date().toISOString()
  const record = scheduledSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name: o.name.trim().slice(0, 80),
    date: o.date,
    amount: signedOf(o),
    yearly: o.yearly,
    accountId: o.accountId,
    categoryId: o.categoryId,
    counterparty: o.counterparty.trim().slice(0, 300),
    remind: [...new Set(o.remind.filter((d) => Number.isInteger(d) && d >= 0 && d <= 365))].sort((a, b) => b - a).slice(0, 5),
    note: o.note
  })
  addRecord('scheduled', record)
  playSound('entry')
  toast(`Boja „${record.name}” na radarze.`, 'success', 5000, { label: 'Cofnij', run: () => deleteOrSay('scheduled', record.id) })
  return record
}

export function patchScheduled(id: string, patch: Partial<Scheduled>): void {
  if (!canWrite()) return
  updateRecord('scheduled', id, (s) => ({ ...s, ...patch, updatedAt: new Date().toISOString() }))
}

export function deleteScheduled(s: Scheduled): Promise<boolean> {
  return deleteWithUndo('scheduled', s.id, `boja „${s.name}”`, `Boja „${s.name}” usunięta.`)
}

/** A day done without an operation (a term met, a payment the bank will not show): its mark with „Cofnij”. */
export function tickDay(s: Scheduled, date: string): void {
  if (!canWrite()) return
  const before = s.done
  patchScheduled(s.id, { done: { ...s.done, [date]: '' } })
  toast(`„${s.name}” odhaczone.`, 'success', 5000, { label: 'Cofnij', run: () => patchScheduled(s.id, { done: before }) })
}

/** The bank's operation matched to a day is not it: never matched to this buoy again. */
export function notThis(s: Scheduled, txId: string): void {
  if (!canWrite()) return
  patchScheduled(s.id, { notMatched: [...s.notMatched, txId].slice(-200) })
}

/**
 * „Wykonaj teraz”: the operation of the day written now – its amount, category, account and payee, today (the editor
 * changes what differs) – saved, opened in Operacje, and the day done by it. „Cofnij” takes both back.
 */
export function executeDay(s: Scheduled, date: string): void {
  if (!canWrite() || s.amount == null) return
  const fi = useData.getState().fi
  const accounts = fi?.settings.accounts.filter((a) => !a.archived) ?? []
  const accountId = s.accountId && accounts.some((a) => a.id === s.accountId) ? s.accountId : (accounts[0]?.id ?? MBANK_ACCOUNT_ID)
  const now = new Date().toISOString()
  const t = transactionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    createdAt: now,
    updatedAt: now,
    date: warsawNow().date,
    accountId,
    kind: s.amount < 0 ? 'expense' : 'income',
    amount: s.amount,
    categoryId: s.amount < 0 ? s.categoryId : null,
    counterparty: s.counterparty || s.name,
    title: s.name,
    note: s.note
  })
  const before = s.done
  addRecord('transactions', t)
  patchScheduled(s.id, { done: { ...s.done, [date]: t.id } })
  playSound('entry')
  openOperation(t)
  toast(`Operacja z boi „${s.name}” zapisana.`, 'success', 6000, {
    label: 'Cofnij',
    run: () => {
      void deleteOrSay('transactions', t.id)
      patchScheduled(s.id, { done: before })
    }
  })
}
