/**
 * Goals – the star systems (E5, D72): the goals of the chosen ICTTJ scenario kept as the ship's records (read only:
 * name and amount follow ICTTJ), the own goals, one priority list for both, and the month each is reached at the
 * pace of the last months.
 */
import type { IctjForecast } from '../ictj'
import { SCHEMA_VERSION } from '../schema/common'
import type { Goal } from '../schema/records'
import { addMonths, monthOf } from './dates'
import type { FleetEvent } from './fleet'

export interface GoalSync {
  add: Goal[]
  update: Goal[]
}

/**
 * What the goal records need to follow the chosen scenario: a new goal at the end of the list (its id = the ICTTJ
 * goal's, so two computers write the same file), name, target and month of ICTTJ, a goal gone from the scenario (or
 * disabled there) archived – it keeps its money but takes no more. A computer whose copy of the scenario is older than
 * what the record follows changes nothing (OneDrive still bringing the file).
 */
export function syncIctjGoals(forecast: IctjForecast | null, goals: readonly Goal[], now: string): GoalSync {
  // No scenario to follow (the chosen one is gone, none at all, the folder still syncing): nothing changes – a goal
  // keeps its state until another scenario is chosen.
  if (!forecast) return { add: [], update: [] }
  const add: Goal[] = []
  const update: Goal[] = []
  const byId = new Map(goals.map((g) => [g.id, g]))
  let next = Math.max(0, ...goals.map((g) => g.priority)) + 1
  const version = forecast?.updatedAt ?? ''
  const older = (g: Goal) => !!forecast && version < (g.ictj?.version ?? '')
  const wanted = new Set<string>()
  for (const fg of forecast?.goals ?? []) {
    if (!fg.enabled) continue
    wanted.add(fg.id)
    const target = forecast!.currency === 'PLN' && fg.amount != null ? fg.amount : 0
    const ictj = { forecastId: forecast!.id, goalId: fg.id, currency: forecast!.currency, amount: fg.amount, version }
    const name = fg.name.slice(0, 80)
    const cur = byId.get(fg.id)
    if (!cur) {
      add.push({
        schemaVersion: SCHEMA_VERSION,
        id: fg.id,
        createdAt: now,
        updatedAt: now,
        name,
        target,
        priority: Math.min(999, next++),
        source: 'ictj',
        ictj,
        deadline: fg.month,
        archived: false,
        achievedAt: null,
        note: ''
      })
      continue
    }
    if (cur.source !== 'ictj' || (cur.ictj?.forecastId === forecast!.id && older(cur))) continue
    const same =
      cur.name === name &&
      cur.target === target &&
      cur.deadline === fg.month &&
      !cur.archived &&
      cur.ictj?.forecastId === ictj.forecastId &&
      cur.ictj?.currency === ictj.currency &&
      cur.ictj?.amount === ictj.amount
    if (!same) update.push({ ...cur, name, target, deadline: fg.month, archived: false, ictj: { ...cur.ictj, ...ictj }, updatedAt: now })
  }
  for (const cur of goals) {
    if (cur.source !== 'ictj' || cur.archived || wanted.has(cur.id)) continue
    // Gone from the scenario this copy shows – unless this copy is older than the record.
    const same = !!forecast && cur.ictj?.forecastId === forecast.id
    if (same && older(cur)) continue
    // The version that dropped it, so an older copy (with the goal still in) does not bring it back.
    update.push({ ...cur, archived: true, ictj: same && cur.ictj ? { ...cur.ictj, version } : cur.ictj, updatedAt: now })
  }
  return { add, update }
}

/** The list's order: priority, then the older first (the engine's order, `computeFleet`). */
export function byPriority<T extends Pick<Goal, 'priority' | 'createdAt' | 'id'>>(goals: readonly T[]): T[] {
  return [...goals].sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

/** Priorities 1…n in the given order (only the goals whose priority changes). */
export function renumber(goals: readonly Goal[], now: string): Goal[] {
  return goals.flatMap((g, i) => (g.priority === i + 1 ? [] : [{ ...g, priority: i + 1, updatedAt: now }]))
}

/**
 * The money that went into the goals a month, on average over the last full months of the budget (at most `count`):
 * the deliveries and the loot – what a goal paid out does not count. null = no full month yet.
 */
export function goalInflow(log: readonly FleetEvent[], start: string | null, month: string, count = 6): number | null {
  if (!start) return null
  const first = start.endsWith('-01') ? monthOf(start) : addMonths(monthOf(start), 1)
  const months: string[] = []
  for (let m = addMonths(month, -1); m >= first && months.length < count; m = addMonths(m, -1)) months.push(m)
  if (!months.length) return null
  const inMonths = new Set(months)
  let total = 0
  for (const e of log) {
    if (!inMonths.has(monthOf(e.date)) || !e.moves.goals) continue
    for (const v of Object.values(e.moves.goals)) if (v > 0) total += v
  }
  return Math.round(total / months.length)
}

/** Months simulated at most (50 years): a goal further away has no date. */
const ETA_HORIZON = 600

/**
 * The month each goal is full at `monthly` a month, the goals in the list's order filling one after another (what the
 * first does not need goes on to the next). Full already = this month; null = never at this pace (or no pace known).
 */
export function goalEtas(goals: ReadonlyArray<{ id: string; amount: number; target: number }>, monthly: number | null, month: string): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  const left = goals.map((g) => ({ id: g.id, need: Math.max(0, g.target - g.amount) }))
  for (const g of left) out[g.id] = g.need === 0 ? month : null
  if (!monthly || monthly <= 0) return out
  for (let i = 1; i <= ETA_HORIZON && left.some((g) => g.need > 0); i++) {
    let rest = monthly
    for (const g of left) {
      if (!g.need || !rest) continue
      const take = Math.min(rest, g.need)
      g.need -= take
      rest -= take
      if (!g.need) out[g.id] = addMonths(month, i)
    }
  }
  return out
}
