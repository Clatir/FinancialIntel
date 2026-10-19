/**
 * What the sensors read of the operations (1.9.0 – F9, F23, F31, F34): the list changes for them only when a field they
 * read changes. A note typed, a log, the time of an operation – the store's map is new, the sensors' list stays, so the
 * hold's watch, the history's proposals, the anomalies and the returns (≈ 0,3 s at 150 tys. operacji) are not counted
 * again after every autosave; the side menu's counter keeps them mounted on every screen.
 */
import type { RecordEntry } from '@shared/api'
import type { Transaction } from '@shared/schema'
import { listOf } from '../../store/data'

type TxMap = Record<string, RecordEntry<Transaction>>

/** The fields of an operation any sensor reads (its brand, day, amount, links and marks). */
const SENSOR_FIELDS = [
  'date',
  'amount',
  'kind',
  'accountId',
  'counterparty',
  'title',
  'categoryId',
  'containerId',
  'goalId',
  'memberId',
  'loanId',
  'bank',
  'splits',
  'share',
  'awaitReturn',
  'bothSides',
  'counterBank',
  'counterDate',
  'createdAt'
] as const satisfies ReadonlyArray<keyof Transaction>

let last: { map: TxMap; list: Transaction[]; size: number } | null = null

/** A change of the map the sensors would see: an operation added or gone, or one of their fields changed. */
function changedForSensors(prev: TxMap, next: TxMap, prevSize: number): boolean {
  let size = 0
  for (const id in next) {
    size++
    const a = prev[id]
    const b = next[id]!
    if (a === b) continue
    if (!a) return true
    const x = a.record as unknown as Record<string, unknown>
    const y = b.record as unknown as Record<string, unknown>
    if (x === y) continue
    for (const k of SENSOR_FIELDS) if (x[k] !== y[k]) return true
  }
  return size !== prevSize
}

/**
 * The operations as the sensors see them: the same list (its identity – the sensors' memos and the payments' index key
 * on it) until an operation changes for them.
 */
export function sensorTransactions(map: TxMap): Transaction[] {
  if (last?.map === map) return last.list
  if (last && !changedForSensors(last.map, map, last.size)) {
    last = { ...last, map }
    return last.list
  }
  const list = listOf(map)
  last = { map, list, size: list.length }
  return list
}
