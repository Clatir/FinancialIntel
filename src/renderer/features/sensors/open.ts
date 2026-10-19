/**
 * Where a sensor's report leads (1.9.0): an unknown signal (F31) – its operation (two of a double charge together in
 * Operacje, a category's month with its category), a return late (F34) – its purchase.
 */
import { noNarrowing } from '@shared/operationsView'
import { useData } from '../../store/data'
import { navigate } from '../../store/ui'
import { openOperation, showFilter } from '../operations/state'

/** `anomaly:<its key>` (the briefing's, a notification's) or the anomaly's key itself; `return:<id>[:<day>]`. */
export function openSensor(key: string | undefined): void {
  const parts = (key ?? '').split(':')
  const [head] = parts
  const rest = head === 'anomaly' ? parts.slice(1) : parts
  const tx = (id: string | undefined) => (id ? useData.getState().records.transactions[id]?.record : undefined)
  if (head === 'return') {
    const t = tx(parts[1])
    return t ? openOperation(t) : navigate({ page: 'radar' })
  }
  const [kind, a, b] = rest
  if (kind === 'brand' || kind === 'new') {
    const t = tx(a)
    if (t) return openOperation(t)
  } else if (kind === 'double') {
    const pair = [tx(a), tx(b)].filter((t): t is NonNullable<typeof t> => !!t)
    if (pair.length) {
      const dates = pair.map((t) => t.date).sort()
      showFilter({ period: { kind: 'range', from: dates[0]!, to: dates[dates.length - 1]! }, ...noNarrowing(), marks: ['anomaly'] })
      return navigate({ page: 'operations' })
    }
  } else if (kind === 'category' && a && b) {
    showFilter({ period: { kind: 'month', month: b }, ...noNarrowing(), categories: [a] })
    return navigate({ page: 'operations' })
  }
  navigate({ page: 'inbox' })
}
