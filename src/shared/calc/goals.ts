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

// ------------------------------------------------------------------ changes from their moment on (1.4.2, D84 C1)

type Dated = Pick<Goal, 'priority' | 'target' | 'archived'> & { past?: Goal['past']; activeFrom?: string | null; deadline?: string | null }

/**
 * The goal's priority, target, archiving and deadline at a moment (ms): the state before the first change after it, else
 * the current one. A state from before 1.8.0 has no deadline – the next one known (a later state's, else the current).
 */
export function goalAt(g: Dated, at: number): { priority: number; target: number; archived: boolean; deadline: string | null } {
  const past = g.past ?? []
  for (const [i, p] of past.entries())
    if (at < Date.parse(p.until)) {
      const known = past.slice(i).find((x) => x.deadline !== undefined)
      return { priority: p.priority, target: p.target, archived: p.archived, deadline: known ? (known.deadline ?? null) : (g.deadline ?? null) }
    }
  return { priority: g.priority, target: g.target, archived: g.archived, deadline: g.deadline ?? null }
}

/** The goal takes money that came in at a moment (ms): it was there by then (from 1.4.2 – before, always) and not archived. */
export const goalTakes = (g: Dated, at: number): boolean => (g.activeFrom == null || Date.parse(g.activeFrom) <= at) && !goalAt(g, at).archived

/**
 * A choice made by hand (the loot's split) may put money in the goal at that moment: it takes money then (B13) – a goal
 * from before 1.4.2 with no change since keeps the old rule (any goal), as when it was archived is not known.
 */
export const goalDecided = (g: Dated, at: number): boolean => goalTakes(g, at) || (g.activeFrom == null && !g.past?.length)

/**
 * A change of a goal counting from now on, never back (C1): when its priority, target or archiving changes, the state
 * before is kept in `past` – money that came in before keeps going where it went. Not in the moment the goal was
 * added (nothing came in before). Every change is kept, however close to the one before: the order is the goals'
 * together – a state dropped from one goal's history would tie or swap it with another in the money of that moment.
 */
export function changeGoal(g: Goal, patch: Partial<Omit<Goal, 'past' | 'id'>>, now: string): Goal {
  const next: Goal = { ...g, ...patch, updatedAt: now }
  // The deadline too (1.8.0): the installments from the salary of the months before keep theirs (F15).
  if (next.priority === g.priority && next.target === g.target && next.archived === g.archived && next.deadline === g.deadline) return next
  if (g.activeFrom != null && Date.parse(g.activeFrom) >= Date.parse(now)) return next
  return { ...next, past: [...(g.past ?? []), { until: now, priority: g.priority, target: g.target, archived: g.archived, deadline: g.deadline }] }
}

/** The goal's money moved out now (C2, B30): `amount` (what it holds now) to the shields or another goal. */
export function transferGoal(g: Goal, to: string, amount: number, now: string): Goal {
  return { ...g, transfers: [...(g.transfers ?? []), { at: now, to, amount }], updatedAt: now }
}

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
        note: '',
        // It takes money from the moment it comes (C1): what came in before belonged elsewhere.
        activeFrom: now,
        past: [],
        transfers: [],
        rates: []
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
    if (!same) update.push(changeGoal(cur, { name, target, deadline: fg.month, archived: false, ictj: { ...cur.ictj, ...ictj } }, now))
  }
  for (const cur of goals) {
    if (cur.source !== 'ictj' || cur.archived || wanted.has(cur.id)) continue
    // Gone from the scenario this copy shows – unless this copy is older than the record.
    const same = !!forecast && cur.ictj?.forecastId === forecast.id
    if (same && older(cur)) continue
    // The version that dropped it, so an older copy (with the goal still in) does not bring it back.
    update.push(changeGoal(cur, { archived: true, ictj: same && cur.ictj ? { ...cur.ictj, version } : cur.ictj }, now))
  }
  return { add, update }
}

/** The list's order: priority, then the older first (the engine's order, `computeFleet`). */
export function byPriority<T extends Pick<Goal, 'priority' | 'createdAt' | 'id'>>(goals: readonly T[]): T[] {
  return [...goals].sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

/** Priorities 1…n in the given order (only the goals whose priority changes), counting from now on (C1). */
export function renumber(goals: readonly Goal[], now: string): Goal[] {
  return goals.flatMap((g, i) => (g.priority === i + 1 ? [] : [changeGoal(g, { priority: i + 1 }, now)]))
}

/** Events moving money into the goals that are no monthly pace (B128). */
const NOT_PACE: ReadonlySet<FleetEvent['kind']> = new Set(['start', 'account', 'household'])

/** What came into the goals over the last full months (at most `count`): the pool Cele's part apart (N42). */
function inflowSums(log: readonly FleetEvent[], start: string | null, month: string, poolTx: ReadonlySet<string>, count: number): { pool: number; rest: number; months: number } | null {
  if (!start) return null
  const first = start.endsWith('-01') ? monthOf(start) : addMonths(monthOf(start), 1)
  const months: string[] = []
  for (let m = addMonths(month, -1); m >= first && months.length < count; m = addMonths(m, -1)) months.push(m)
  if (!months.length) return null
  const inMonths = new Set(months)
  let pool = 0
  let rest = 0
  for (const e of log) {
    // The pace is what came in month by month (B128): the money given out at the start, an account joining it later and
    // the household's advances at the start are no pace – only deliveries, the loot and what else flows month by month.
    if (!inMonths.has(monthOf(e.date)) || !e.moves.goals || e.kind === 'goal' || NOT_PACE.has(e.kind)) continue
    for (const v of Object.values(e.moves.goals))
      if (v > 0) {
        if (e.txId && poolTx.has(e.txId)) pool += v
        else rest += v
      }
  }
  return { pool, rest, months: months.length }
}

/**
 * The money that went into the goals a month, on average over the last full months of the budget (at most `count`):
 * the deliveries and the loot – what a goal paid out does not count, nor money moved between goals. null = no full
 * month yet.
 */
export function goalInflow(log: readonly FleetEvent[], start: string | null, month: string, count = 6): number | null {
  const s = inflowSums(log, start, month, new Set(), count)
  return s ? Math.round((s.pool + s.rest) / s.months) : null
}

/** The goals' pace a month in two parts (N42): payouts of the ICTTJ pool Cele (`poolTx` – their operations) and the rest. */
export interface GoalPace {
  pool: number
  rest: number
  /** Both together, rounded once – what `goalInflow` says (the screen's „Tempo”). */
  total: number
}

export function goalPace(log: readonly FleetEvent[], start: string | null, month: string, poolTx: ReadonlySet<string>, count = 6): GoalPace | null {
  const s = inflowSums(log, start, month, poolTx, count)
  return s ? { pool: Math.round(s.pool / s.months), rest: Math.round(s.rest / s.months), total: Math.round((s.pool + s.rest) / s.months) } : null
}

/**
 * A goal past its deadline (B87): not reached, with a target and a deadline – at this pace later than the deadline (never
 * at this pace too), or without a pace with the deadline gone already.
 */
export function goalLate(g: { amount: number; target: number; deadline: string | null }, eta: string | null, pace: number | null, month: string): boolean {
  if (g.target <= 0 || g.amount >= g.target || !g.deadline) return false
  return eta ? eta > g.deadline : (pace ?? 0) > 0 || g.deadline < month
}

/** Months simulated at most (50 years): a goal further away has no date. */
const ETA_HORIZON = 600

/**
 * The month each goal is full at `monthly` a month, the goals in the list's order filling one after another (what the
 * first does not need goes on to the next). A pace in two parts (N42): the pool Cele fills the goals of the ICTTJ forecast
 * first (as the engine's `fillGoals` – D72, T65), then the own ones; the rest goes in the list's order. Full already =
 * this month; null = never at this pace (or no pace known).
 */
export function goalEtas(
  goals: ReadonlyArray<{ id: string; amount: number; target: number; ictj?: boolean }>,
  monthly: number | Pick<GoalPace, 'pool' | 'rest'> | null,
  month: string
): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  const left = goals.map((g) => ({ id: g.id, need: Math.max(0, g.target - g.amount), ictj: !!g.ictj }))
  for (const g of left) out[g.id] = g.need === 0 ? month : null
  const pace = typeof monthly === 'number' ? { pool: 0, rest: monthly } : monthly
  if (!pace || pace.pool + pace.rest <= 0) return out
  const poolOrder = [...left.filter((g) => g.ictj), ...left.filter((g) => !g.ictj)]
  const fill = (order: typeof left, amount: number, i: number) => {
    let rest = amount
    for (const g of order) {
      if (!g.need || rest <= 0) continue
      const take = Math.min(rest, g.need)
      g.need -= take
      rest -= take
      if (!g.need) out[g.id] = addMonths(month, i)
    }
  }
  for (let i = 1; i <= ETA_HORIZON && left.some((g) => g.need > 0); i++) {
    fill(poolOrder, pace.pool, i)
    fill(left, pace.rest, i)
  }
  return out
}
