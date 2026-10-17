import { openingOf, planConfirmation, type ConfirmationPlan } from '@shared/calc/balances'
import { newId } from '@shared/ids'
import { balanceSchema, SCHEMA_VERSION, transactionSchema, type Balance, type Transaction } from '@shared/schema'
import { addRecord, updateRecord, useData } from '../../store/data'
import { plnText } from '../../components/fields'
import { toast } from '../../store/ui'

const records = <T,>(map: Record<string, { record: T }>): T[] => Object.values(map).map((e) => e.record)

export const CORRECTION_NOTE = 'Rozbieżność w ładowni – do wyjaśnienia (różnica między saldem w banku a operacjami).'

/** Set the opening balance of an account (at the start of `date`): the existing record changes, else a new one. */
export function setOpening(accountId: string, amount: number, date: string): void {
  const s = useData.getState()
  const current = openingOf(accountId, records(s.records.balances))
  if (current) {
    updateRecord('balances', current.id, (b) => ({ ...b, amount, date }))
    return
  }
  const now = new Date().toISOString()
  addRecord('balances', balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: now, updatedAt: now, date, accountId, kind: 'opening', amount }))
}

/**
 * Confirm the bank's balance at the end of `date`: without an opening it sets one; a difference adds a correction
 * (kind 'correction', to explain) and both are kept as a confirmation record.
 */
export function confirmBalance(accountId: string, amount: number, date: string, accountName: string): ConfirmationPlan {
  const s = useData.getState()
  const plan = planConfirmation(accountId, amount, date, records(s.records.transactions), records(s.records.balances))
  const now = new Date().toISOString()
  const base = { schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now }
  if (plan.kind === 'opening') {
    setOpening(accountId, plan.amount, plan.date)
    toast(`${accountName}: saldo otwarcia ustawione na początek ${plan.date} (${plnText(plan.amount)} zł).`, 'success', 5000)
    return plan
  }
  let correctionId: string | null = null
  if (plan.kind === 'correction') {
    const correction: Transaction = transactionSchema.parse({
      ...base,
      id: newId(),
      date,
      accountId,
      kind: 'correction',
      amount: plan.diff,
      counterparty: 'Korekta salda',
      note: CORRECTION_NOTE
    })
    addRecord('transactions', correction)
    correctionId = correction.id
  }
  const record: Balance = balanceSchema.parse({ ...base, id: newId(), date, accountId, kind: 'confirmation', amount, correctionId })
  addRecord('balances', record)
  if (plan.kind === 'match') toast(`${accountName}: saldo zgodne z operacjami (${plnText(amount)} zł).`, 'success', 4000)
  else toast(`${accountName}: rozbieżność w ładowni ${plnText(plan.diff)} zł – dodano korektę do wyjaśnienia (Operacje).`, 'info', 7000)
  return plan
}
