/**
 * Transfers between two accounts of the budget (1.7.0, F10, D87): those of before 1.7.0 made one operation for both
 * sides – two of one move joined, a side counted twice taken off, a missing side added –, each with „Cofnij”.
 */
import { openingOf, type OperationEdit } from '@shared/calc/balances'
import { addDays } from '@shared/calc/dates'
import { joinTransfer, transferIssues, withBothSides, type TransferIssue } from '@shared/calc/transfers'
import type { Transaction } from '@shared/schema'
import { plural } from '../../lib/format'
import { canWrite, listOf, replaceRecords, updateRecord, updateSettings, useData } from '../../store/data'
import { errorMessage } from '../../lib/api'
import { toast } from '../../store/ui'
import { deleteManyWithUndo } from '../history/actions'

export type JoinIssue = Extract<TransferIssue, { kind: 'pair' | 'double' }>

/** The key a report of a transfer is said „zostaw tak” under (the import's list of „no duplicates”). */
export const transferKey = (issue: TransferIssue): string => (issue.kind === 'lone' ? `transfer-lone:${issue.tx.id}` : `transfer:${issue.keep.id}:${issue.drop.id}`)

/**
 * The transfers to report now: from the day a missing side would change a confirmed balance on (the day after the
 * account's last confirmation, else its opening's day) – a correction made up for one before; „zostaw tak” ones aside.
 */
export function transferIssuesOf(transactions: readonly Transaction[], s: ReturnType<typeof useData.getState>): TransferIssue[] {
  const settings = s.fi?.settings
  if (!settings) return []
  const balances = listOf(s.records.balances)
  const confirmed = new Map<string, string>()
  for (const b of balances) if (b.kind === 'confirmation' && (confirmed.get(b.accountId) ?? '') < b.date) confirmed.set(b.accountId, b.date)
  const reportFrom = (accountId: string) => {
    const last = confirmed.get(accountId)
    return last ? addDays(last, 1) : (openingOf(accountId, balances)?.date ?? null)
  }
  const dismissed = settings.import.notDuplicates
  return transferIssues(transactions, new Set(settings.accounts.map((a) => a.id)), reportFrom).filter((i) => !dismissed[transferKey(i)])
}

/** One-operation edits a report's decision makes (F12 – the editor asks before one changing a confirmed balance). */
export function transferEdits(issue: TransferIssue): OperationEdit[] {
  if (issue.kind === 'lone') return [[issue.tx, withBothSides(issue.tx)]]
  return [
    [issue.keep, joinTransfer(issue.keep, issue.drop, issue.kind === 'double' ? issue.date : undefined)],
    [issue.drop, null]
  ]
}

/** The reports of transfers now (the inbox's action finds them again – the list may have changed meanwhile). */
export const transferIssuesNow = (): TransferIssue[] => transferIssuesOf(listOf(useData.getState().records.transactions), useData.getState())

/**
 * Each transfer made one operation for both sides (F10): the one-sided transfer of its other side goes, its bank row
 * joins – one „Cofnij” for all. A side the disk does not take off (written by a newer version, a file held): its
 * operation as it was – the money never counted twice on the other account.
 */
export async function joinTransfers(issues: readonly JoinIssue[]): Promise<void> {
  if (!issues.length || !canWrite()) return
  if (!replaceRecords('transactions', issues.map((i) => joinTransfer(i.keep, i.drop, i.kind === 'double' ? i.date : undefined)))) return
  let gone: ReadonlySet<string> = new Set()
  try {
    gone = new Set(
      await deleteManyWithUndo(
        'transactions',
        issues.map((i) => i.drop.id),
        'przelewy między kontami',
        (n) => `${n === 1 ? 'Przelew połączony' : `Połączono ${n} ${plural(n, 'przelew', 'przelewy', 'przelewów')}`} w jedną operację dla obu kont.`,
        () => replaceRecords('transactions', issues.filter((i) => gone.has(i.drop.id)).map((i) => i.keep))
      )
    )
  } catch (e) {
    toast(errorMessage(e), 'error', 8000)
  }
  const left = issues.filter((i) => !gone.has(i.drop.id))
  if (left.length) replaceRecords('transactions', left.map((i) => i.keep))
}

/** A one-sided transfer naming an account of the budget gets its other side (F10): that account gets the money. */
export function addOtherSide(t: Transaction): void {
  const before = t.bothSides
  if (!updateRecord('transactions', t.id, withBothSides)) return
  toast('Przelew jest teraz jedną operacją dla obu kont – drugie konto dostało jego kwotę.', 'success', 8000, {
    label: 'Cofnij',
    run: () => void updateRecord('transactions', t.id, (x) => ({ ...x, bothSides: before }))
  })
}

/** „Zostaw tak”: the transfer is not reported again (the pair is two moves, the side is outside the budget). */
export function dismissTransfer(issue: TransferIssue): void {
  const key = transferKey(issue)
  const at = new Date().toISOString()
  const set = (on: boolean) =>
    updateSettings((f) => {
      const notDuplicates = { ...f.settings.import.notDuplicates }
      if (on) notDuplicates[key] = at
      else delete notDuplicates[key]
      return { ...f, settings: { ...f.settings, import: { ...f.settings.import, notDuplicates } } }
    })
  set(true)
  toast('Przelew nie będzie już zgłaszany.', 'info', 7000, { label: 'Cofnij', run: () => set(false) })
}
