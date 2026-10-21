/**
 * The sensors (1.9.0): the radar of anomalies (F31 – unusual expenses, a possible double charge) and the returns on the
 * way (F34). Counted once per change of what they read – the bridge, the inbox, Operacje, the Radar and the notifier
 * share them; „to w porządku” and „czekam na zwrot” are written here.
 */
import { useMemo } from 'react'
import { anomalies, anomalousIds, type Anomaly } from '@shared/calc/anomalies'
import { warsawNow } from '@shared/calc/dates'
import { categoryIndex } from '@shared/calc/operations'
import { awaitedReturns, defaultReturn, onTheWay, type AwaitedReturn } from '@shared/calc/returns'
import type { MarkFlags } from '@shared/operationsView'
import { repaidMarks } from '@shared/calc/household'
import type { AwaitReturn, Transaction } from '@shared/schema'
import { canWrite, updateRecord, updateSettings, useData } from '../../store/data'
import { useHousehold, useToday } from '../../store/fleet'
import { toast } from '../../store/ui'
import { sensorTransactions } from './inputs'

type Data = ReturnType<typeof useData.getState>

/** „To w porządku” remembered (`settings.anomalies.ok`): the last ones of a long history are enough. */
export const OK_KEEP = 1000

const NO_OK: readonly string[] = []

let anomalyMemo: { today: string; transactions: unknown; parts: unknown[]; containers: string; list: Anomaly[] } | null = null

/**
 * Counted again only when what they read changes: the operations as the sensors see them (`sensorTransactions` – a note
 * typed counts nothing), the settings they read (not the whole fi.json), the containers' ids.
 */
function anomaliesOf(today: string, s: Pick<Data, 'fi' | 'records'>): Anomaly[] {
  const fi = s.fi
  if (!fi) return []
  const transactions = sensorTransactions(s.records.transactions)
  const parts = [fi.settings.categories, fi.settings.orders.impulseThreshold, fi.settings.anomalies.ok, fi.settings.import.aliases]
  const containers = Object.keys(s.records.containers).join(',')
  const m = anomalyMemo
  if (m && m.today === today && m.transactions === transactions && m.containers === containers && m.parts.every((p, i) => p === parts[i])) return m.list
  const list = anomalies({
    transactions,
    today,
    categories: categoryIndex(fi.settings.categories),
    orders: fi.settings.orders,
    ok: new Set(fi.settings.anomalies.ok ?? NO_OK),
    aliases: fi.settings.import.aliases,
    containerIds: new Set(Object.keys(s.records.containers))
  })
  anomalyMemo = { today, transactions, parts, containers, list }
  return list
}

let returnMemo: { today: string; transactions: unknown; aliases: unknown; list: AwaitedReturn[] } | null = null

function returnsOf(today: string, s: Pick<Data, 'fi' | 'records'>): AwaitedReturn[] {
  const aliases = s.fi?.settings.import.aliases
  const transactions = sensorTransactions(s.records.transactions)
  const m = returnMemo
  if (m && m.today === today && m.transactions === transactions && m.aliases === aliases) return m.list
  const list = awaitedReturns(transactions, today, aliases)
  returnMemo = { today, transactions, aliases, list }
  return list
}

export function useAnomalies(): Anomaly[] {
  const today = useToday()
  const transactions = useData((s) => s.records.transactions)
  const containers = useData((s) => s.records.containers)
  const fi = useData((s) => s.fi)
  return useMemo(() => anomaliesOf(today, { fi, records: { ...useData.getState().records, transactions, containers } }), [today, transactions, containers, fi])
}

export function useReturns(): AwaitedReturn[] {
  const today = useToday()
  const transactions = useData((s) => s.records.transactions)
  const aliases = useData((s) => s.fi?.settings.import.aliases)
  return useMemo(() => returnsOf(today, useData.getState()), [today, transactions, aliases])
}

/** The same outside React (the notifier). */
export const anomaliesNow = (): Anomaly[] => anomaliesOf(warsawNow().date, useData.getState())
export const returnsNow = (): AwaitedReturn[] => returnsOf(warsawNow().date, useData.getState())

let flagsMemo: { list: unknown; returns: unknown; purchases: unknown; flags: MarkFlags } | null = null
const NO_PURCHASES = new Map()

/**
 * The marks „nietypowa”, „czeka na zwrot” (F31, F34) and a member's purchase paid back or not (D91) of Operacje – one
 * set for the list and its rows.
 */
export function useMarkFlags(): MarkFlags {
  const list = useAnomalies()
  const returns = useReturns()
  const purchases = useHousehold()?.purchases ?? NO_PURCHASES
  if (!flagsMemo || flagsMemo.list !== list || flagsMemo.returns !== returns || flagsMemo.purchases !== purchases)
    flagsMemo = { list, returns, purchases, flags: { anomalies: anomalousIds(list), awaiting: new Set(onTheWay(returns).map((r) => r.tx.id)), repaid: repaidMarks(purchases) } }
  return flagsMemo.flags
}

/** „To w porządku” (F31): the anomaly is not reported again – „Cofnij” brings it back to the list. */
export function dismissAnomaly(a: Pick<Anomaly, 'key'>): void {
  if (!canWrite()) return
  const set = (on: boolean) =>
    updateSettings((f) => {
      const list = (f.settings.anomalies.ok ?? []).filter((k) => k !== a.key)
      return { ...f, settings: { ...f.settings, anomalies: { ...f.settings.anomalies, ok: on ? [...list, a.key].slice(-OK_KEEP) : list } } }
    })
  set(true)
  toast('Zapamiętane: to w porządku.', 'info', 5000, { label: 'Cofnij', run: () => set(false) })
}

/** „Czekam na zwrot” (F34) on a purchase: the whole amount in 14 days by default; null – not awaited any more. */
export function setAwaitReturn(t: Transaction, value: AwaitReturn | null): void {
  if (!canWrite()) return
  updateRecord('transactions', t.id, (x) => ({ ...x, awaitReturn: value }))
}

export const startAwaitReturn = (t: Transaction) => setAwaitReturn(t, defaultReturn(t))

/** „Zamknij” (F34): the money came another way, or it will not – the return is not awaited any more (kept for its history). */
export function closeReturn(t: Transaction): void {
  if (!canWrite() || !t.awaitReturn) return
  const before = t.awaitReturn
  setAwaitReturn(t, { ...before, closedAt: new Date().toISOString() })
  toast('Zwrot zamknięty – nie jest już oczekiwany.', 'info', 5000, { label: 'Cofnij', run: () => setAwaitReturn(t, before) })
}
