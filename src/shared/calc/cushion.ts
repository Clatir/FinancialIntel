/**
 * „Osłony + kadłub i zasięg” at each month's end (1.15.7, AP-31 – kryterium 2: does the cushion grow?): the shields (the
 * buffer for the salaries) and the hull (the emergency fund) on a month's last day and the range of that day, with the
 * change against the month before (m/m). Only months that ended: the running one is after its salary's turn and before
 * its loot – against a month's end it would always fall. Computed, never stored (T4):
 * - the layers are the engine's – its log of moves added up to each month's end: one run of the engine for any number of
 *   months (none per month – „Wydajność”); a log that does not add up to the engine's state (a move it does not log)
 *   falls back to the engine run at each month's end (`engineAt`);
 * - the range by the engine's rule (`rangeMonths`) with that day's average costs (the engine's own `averageCosts`: the 12
 *   covered months before the month, the assumed costs under 3) and the debt of that day (`loanStates`, loans of that day
 *   and before) – Mostek's on that day.
 * Pure.
 */
import type { Container, Loan, Transaction } from '../schema/records'
import { addMonths, lastDayOf, monthOf } from './dates'
import { averageCosts, rangeMonths, type FleetEvent, type FleetState } from './fleet'
import { debtOf, loanStates } from './loans'
import { costsByMonth } from './plan'

export interface CushionPoint {
  month: string
  /** The month's last day. */
  date: string
  shields: number
  hull: number
  /** The shields + the hull. */
  cushion: number
  range: number | null
  /** The cushion against the month before's end (null – that one is before the budget's start). */
  delta: number | null
  /** The range's change in tenths of a month, as the screens cut it (T218; null – either range unknown). */
  rangeDelta: number | null
}

/** The engine's state a trend reads. */
export type CushionFleet = Pick<FleetState, 'started' | 'start' | 'month' | 'log' | 'shields' | 'hull' | 'historyMonths'>

export interface CushionInput {
  fleet: CushionFleet
  transactions: readonly Transaction[]
  loans: readonly Loan[]
  containers: readonly Container[]
  /** `settings.layers.assumedCosts` – the engine's average costs under 3 months of history. */
  assumedCosts: number | null
  /**
   * The months to show, consecutive, oldest first (`cushionMonths`; the running one and later ones are left out); the
   * month before the first is read for its change.
   */
  months: readonly string[]
  /** The engine at a day's end – only when its log does not add up to its state. */
  engineAt?: (date: string) => { started: boolean; shields: { amount: number }; hull: { amount: number }; range: number | null }
}

/** The `count` months that ended before `month` (the running one), oldest first: Wywiad's 12 months. */
export const cushionMonths = (month: string, count = 12): string[] => Array.from({ length: count }, (_, i) => addMonths(month, i - count))

type Layers = { shields: number; hull: number }
const movesMemo = new WeakMap<readonly FleetEvent[], { byMonth: Map<string, Layers>; total: Layers }>()

/** The shields' and the hull's moves of the log by month, and all of them (one walk per log). */
function movesOf(log: readonly FleetEvent[]): { byMonth: Map<string, Layers>; total: Layers } {
  let out = movesMemo.get(log)
  if (out) return out
  const byMonth = new Map<string, Layers>()
  const total: Layers = { shields: 0, hull: 0 }
  for (const e of log) {
    const s = e.moves.shields ?? 0
    const h = e.moves.hull ?? 0
    if (!s && !h) continue
    const m = monthOf(e.date)
    const at = byMonth.get(m) ?? { shields: 0, hull: 0 }
    at.shields += s
    at.hull += h
    byMonth.set(m, at)
    total.shields += s
    total.hull += h
  }
  out = { byMonth, total }
  movesMemo.set(log, out)
  return out
}

/**
 * The shields and the hull at each month's end from the engine's log (null – the log does not add up to the state now:
 * the engine moved a layer without logging it, the months are then the engine's own runs).
 */
export function layersAtMonthEnds(fleet: Pick<FleetState, 'log' | 'shields' | 'hull'>, months: readonly string[]): Map<string, Layers> | null {
  const { byMonth, total } = movesOf(fleet.log)
  if (total.shields !== fleet.shields.amount || total.hull !== fleet.hull.amount) return null
  const out = new Map<string, Layers>()
  const keys = [...byMonth.keys()].sort()
  let i = 0
  const acc: Layers = { shields: 0, hull: 0 }
  for (const m of [...months].sort()) {
    while (i < keys.length && keys[i]! <= m) {
      const v = byMonth.get(keys[i++]!)!
      acc.shields += v.shields
      acc.hull += v.hull
    }
    out.set(m, { ...acc })
  }
  return out
}

/** A range in tenths of a month, cut as `rangeText` cuts it (T218). */
const tenths = (range: number) => Math.floor(range * 10)

export function cushionTrend(o: CushionInput): CushionPoint[] {
  const { fleet } = o
  if (!fleet.started || !fleet.start) return []
  const start = fleet.start
  const shown = o.months.filter((m) => m < fleet.month && lastDayOf(m) >= start)
  if (!shown.length) return []
  const all = [addMonths(shown[0]!, -1), ...shown]
  const fromLog = layersAtMonthEnds(fleet, all)
  const costs = costsByMonth(o.transactions)
  const points = new Map<string, Omit<CushionPoint, 'delta' | 'rangeDelta'> | null>()
  for (const month of all) {
    const date = lastDayOf(month)
    if (date < start) {
      points.set(month, null)
      continue
    }
    let layers: Layers
    let range: number | null
    if (fromLog) {
      layers = fromLog.get(month)!
      // A loan of a later day was no debt yet then (its record names its day – D72).
      const loans = o.loans.filter((l) => l.date <= date)
      const debt = loans.length ? debtOf(loanStates(loans, o.transactions, o.containers, date)) : 0
      range = rangeMonths(layers.shields, layers.hull, averageCosts(fleet.historyMonths, costs, o.assumedCosts, month).average, debt)
    } else if (o.engineAt) {
      const f = o.engineAt(date)
      if (!f.started) {
        points.set(month, null)
        continue
      }
      layers = { shields: f.shields.amount, hull: f.hull.amount }
      range = f.range
    } else {
      points.set(month, null)
      continue
    }
    points.set(month, { month, date, ...layers, cushion: layers.shields + layers.hull, range })
  }
  const out: CushionPoint[] = []
  for (let i = 1; i < all.length; i++) {
    const p = points.get(all[i]!)
    if (!p) continue
    const before = points.get(all[i - 1]!) ?? null
    out.push({
      ...p,
      delta: before ? p.cushion - before.cushion : null,
      rangeDelta: before && before.range != null && p.range != null ? tenths(p.range) - tenths(before.range) : null
    })
  }
  return out
}

/** The direction of a change: ↑ more, ↓ less, → the same; nothing without one. */
export const arrowOf = (change: number | null): string => (change == null ? '' : change > 0 ? '↑' : change < 0 ? '↓' : '→')

/** A range's change: „+0,2 mies.”, „−0,3 mies.”, „0,0 mies.”; „—” without one. */
export function rangeDeltaText(change: number | null): string {
  if (change == null) return '—'
  const text = (Math.abs(change) / 10).toFixed(1).replace('.', ',')
  return `${change > 0 ? '+' : change < 0 ? '−' : ''}${text} mies.`
}
