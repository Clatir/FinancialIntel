/**
 * What a change of operations does (F11: before a bulk change of Operacje is applied): today's energy, the envelopes,
 * the accounts' balances and the shields, the goals – the engine's state now against the one with the change; the loot
 * and the envelopes of the months the operations leave or come to (AP-38) – the debriefing of the engine's log before and
 * after; the ICTTJ payouts losing their pair in the bank – the deliveries before and after. Read only: no money rule here.
 */
import type { Category } from '../schema/budget'
import type { Container, MonthPlan, Transaction } from '../schema/records'
import { addMonths, firstDayOf, monthOf } from './dates'
import type { Delivery } from './dock'
import type { FleetEvent, FleetState } from './fleet'
import { debriefing } from './plan'

export interface Change {
  before: number
  after: number
}

export interface Effect {
  /** Today's energy as shown (`daily.energy` – AP-13); null – no plan of the month, or no change. */
  energy: Change | null
  shields: Change | null
  /** The envelopes of this month whose rest changes. */
  envelopes: Array<Change & { categoryId: string }>
  /** The accounts whose balance changes. */
  accounts: Array<Change & { id: string; name: string }>
  /** The goals whose money changes (AP-38: a docked payout deleted takes what it gave them). */
  goals: Array<Change & { id: string; name: string }>
}

const change = (before: number, after: number): Change | null => (before === after ? null : { before, after })

export function effectOf(before: FleetState, after: FleetState): Effect {
  const envelopes: Effect['envelopes'] = []
  const afterEnvelopes = new Map(after.envelopes.map((e) => [e.categoryId, e.left]))
  for (const e of before.envelopes) {
    const left = afterEnvelopes.get(e.categoryId)
    if (left != null && left !== e.left) envelopes.push({ categoryId: e.categoryId, before: e.left, after: left })
  }
  const accounts: Effect['accounts'] = []
  const afterAccounts = new Map(after.accounts.map((a) => [a.id, a.balance]))
  for (const a of before.accounts) {
    const balance = afterAccounts.get(a.id) ?? 0
    if (balance !== a.balance) accounts.push({ id: a.id, name: a.name, before: a.balance, after: balance })
  }
  // An account the change brings in (an operation moved onto one without any yet).
  for (const a of after.accounts) if (!before.accounts.some((b) => b.id === a.id) && a.balance) accounts.push({ id: a.id, name: a.name, before: 0, after: a.balance })
  return {
    energy: before.daily && after.daily ? change(before.daily.energy, after.daily.energy) : null,
    shields: before.started && after.started ? change(before.shields.amount, after.shields.amount) : null,
    envelopes,
    accounts,
    goals: after.goals.flatMap((g) => {
      const was = before.goals.find((b) => b.id === g.id)
      return was && was.amount !== g.amount ? [{ id: g.id, name: g.name, before: was.amount, after: g.amount }] : []
    })
  }
}

/** Does the change move nothing the captain sees? */
export const noEffect = (e: Effect): boolean => !e.energy && !e.shields && !e.envelopes.length && !e.accounts.length && !e.goals.length

/** A line of `layersEffect`: an amount before and after (null – unknown, a target without its salary or costs). */
export interface LayersLine {
  label: string
  before: number | null
  after: number | null
}

/**
 * What a change of the layers' targets does (AP-17, MO sp. 4 – the history counts again from the start with them): the
 * shields and the hull with their targets, the goals, the month's energy and „wolne do decyzji” – the lines that change.
 */
export function layersEffect(before: FleetState, after: FleetState): LayersLine[] {
  const goals = (f: FleetState) => f.goals.reduce((a, g) => a + g.amount, 0)
  const lines: LayersLine[] = [
    { label: 'Osłony', before: before.shields.amount, after: after.shields.amount },
    { label: 'Cel osłon', before: before.shields.target, after: after.shields.target },
    { label: 'Kadłub', before: before.hull.amount, after: after.hull.amount },
    { label: 'Cel kadłuba', before: before.hull.target, after: after.hull.target },
    { label: 'Cele (razem)', before: goals(before), after: goals(after) },
    { label: 'Energia miesiąca', before: before.energy, after: after.energy },
    { label: 'Wolne do decyzji', before: before.shields.free, after: after.shields.free }
  ]
  return lines.filter((l) => l.before !== l.after)
}

/** A month gone by whose result the change moves (AP-38, AF-24). */
export interface MonthEffect {
  month: string
  /** The loot – the energy left at its end (as the debriefing tells it). */
  loot: Change | null
  /** Its envelopes' rest (limit − spent, the debriefing's FVG). */
  envelopes: Array<Change & { categoryId: string }>
}

export interface MonthsEffectInput {
  categories: readonly Category[]
  plans: readonly MonthPlan[]
  containers?: readonly Pick<Container, 'id'>[]
  transactionsBefore: readonly Transaction[]
  transactionsAfter: readonly Transaction[]
  /** The operations the change takes, before and after it: their months are the ones they leave and come to. */
  changed: ReadonlyArray<Pick<Transaction, 'date' | 'counterDate'>>
}

/** The month-end loot of each month in the engine's log (`month-end` on the next month's first day). */
function endsOf(log: readonly FleetEvent[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const e of log) if (e.kind === 'month-end') out.set(addMonths(monthOf(e.date), -1), e.amount)
  return out
}

/**
 * The months gone by (before this one – its envelopes are the effect's) whose loot or envelopes the change moves: the
 * months the changed operations leave or come to, and any whose loot the engine ends otherwise. Oldest first.
 */
export function monthsEffectOf(before: FleetState, after: FleetState, input: MonthsEffectInput): MonthEffect[] {
  const months = new Set<string>()
  for (const t of input.changed) {
    months.add(monthOf(t.date))
    if (t.counterDate) months.add(monthOf(t.counterDate))
  }
  const endsBefore = endsOf(before.log)
  const endsAfter = endsOf(after.log)
  for (const m of new Set([...endsBefore.keys(), ...endsAfter.keys()])) if (endsBefore.get(m) !== endsAfter.get(m)) months.add(m)
  const base = { categories: input.categories, plans: input.plans, containers: input.containers, today: before.today }
  const out: MonthEffect[] = []
  for (const month of [...months].filter((m) => firstDayOf(addMonths(m, 1)) <= before.today).sort()) {
    const was = debriefing(month, { ...base, transactions: input.transactionsBefore, log: before.log, alarms: before.alarms })
    const is = debriefing(month, { ...base, transactions: input.transactionsAfter, log: after.log, alarms: after.alarms })
    const loot = was.loot != null && is.loot != null ? change(was.loot, is.loot) : null
    const gaps = new Map(is.envelopes.map((e) => [e.categoryId, e.gap]))
    const envelopes = was.envelopes.flatMap((e) => {
      const gap = gaps.get(e.categoryId)
      return gap != null && gap !== e.gap ? [{ categoryId: e.categoryId, before: e.gap, after: gap }] : []
    })
    if (loot || envelopes.length) out.push({ month, loot, envelopes })
  }
  return out
}

/** An ICTTJ payout that loses its pair in the bank (AP-38, OP sp. 2): it shows again in „Do zadokowania” without one. */
export interface LostPair {
  date: string
  amount: number
  direction: Delivery['direction']
}

/** The ICTTJ entries paired (or docked) with an operation before the change and with none after it. */
export function pairsLost(before: readonly Delivery[], after: readonly Delivery[]): LostPair[] {
  const next = new Map(after.map((d) => [d.key, d]))
  return before.flatMap((d) => (d.entry && d.transaction && !next.get(d.key)?.transaction ? [{ date: d.entry.date, amount: d.amount, direction: d.direction }] : []))
}
