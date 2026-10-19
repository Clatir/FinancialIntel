import { openingOf, planConfirmation, type ConfirmationPlan } from '@shared/calc/balances'
import { derivedId, newId } from '@shared/ids'
import { balanceSchema, SCHEMA_VERSION, transactionSchema, type Balance, type Transaction } from '@shared/schema'
import { addRecord, canWrite, updateRecord, useData } from '../../store/data'
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
export function confirmBalance(accountId: string, amount: number, date: string, accountName: string): ConfirmationPlan | null {
  // A read-only folder writes no correction and no confirmation: no „saldo zgodne” either (N2).
  if (!canWrite()) return null
  const s = useData.getState()
  const plan = planConfirmation(accountId, amount, date, records(s.records.transactions), records(s.records.balances))
  const now = new Date().toISOString()
  const base = { schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now }
  if (plan.kind === 'before-opening') {
    toast(`${accountName}: saldo otwarcia jest na ${plan.opening} – później niż ${date}. Popraw datę salda otwarcia.`, 'error', 7000)
    return plan
  }
  if (plan.kind === 'opening') {
    setOpening(accountId, plan.amount, plan.date)
    toast(`${accountName}: saldo otwarcia ustawione na początek ${plan.date} (${plnText(plan.amount)} zł).`, 'success', 5000)
    return plan
  }
  let correctionId: string | null = null
  // One confirmation of one balance on one day is one record on every computer (B129): two computers confirming it
  // before OneDrive brings the other's write the same files – never a second correction of the same difference.
  const key = `${accountId}:${date}:${amount}`
  if (plan.kind === 'correction') {
    const id = derivedId(accountId, `correction:${key}:${plan.diff}`)
    const known = s.records.transactions[id]?.record
    const correction: Transaction = known ?? transactionSchema.parse({
      ...base,
      id,
      date,
      accountId,
      kind: 'correction',
      amount: plan.diff,
      counterparty: 'Korekta salda',
      note: CORRECTION_NOTE
    })
    if (!known) addRecord('transactions', correction)
    correctionId = correction.id
  }
  const recordId = derivedId(accountId, `confirmation:${key}`)
  const knownRecord = s.records.balances[recordId]?.record
  const record: Balance = balanceSchema.parse({ ...(knownRecord ?? base), id: recordId, updatedAt: now, date, accountId, kind: 'confirmation', amount, correctionId: correctionId ?? knownRecord?.correctionId ?? null })
  if (knownRecord) updateRecord('balances', recordId, () => record)
  else addRecord('balances', record)
  if (plan.kind === 'match') toast(`${accountName}: saldo zgodne z operacjami (${plnText(amount)} zł).`, 'success', 4000)
  else toast(`${accountName}: rozbieżność w ładowni ${plnText(plan.diff)} zł – dodano korektę do wyjaśnienia (Operacje).`, 'info', 7000)
  return plan
}
