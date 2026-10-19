/**
 * The officer's knowledge of the budget's brands (F8): computed once per change of the operations or the merged names
 * (W15), for the quick entry and the operation's editor.
 */
import { officerData, type OfficerData } from '@shared/import/officer'
import { listOf, useData } from './data'

let memo: { map: object; aliases: object | undefined; data: OfficerData } | null = null

export function officerNow(): OfficerData {
  const s = useData.getState()
  const map = s.records.transactions
  const aliases = s.fi?.settings.import.aliases
  if (memo?.map === map && memo.aliases === aliases) return memo.data
  memo = { map, aliases, data: officerData(listOf(map), aliases ?? {}) }
  return memo.data
}
