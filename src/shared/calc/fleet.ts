/**
 * The layers' engine (T4): the state of the ship computed from the records, deterministically, never stored – every
 * computer sees the same. Rules: docs/specyfikacja.md, „Pieniądze: konta, warstwy i przepływy” and „Plan miesiąca i
 * dzienny przydział”.
 *
 * Every złoty on the budget's accounts belongs to exactly one layer, so the layers always sum to the balances:
 * - shields (osłony) – the buffer; every delivery fills them first, the salary is paid from them on the 1st; above
 *   their target = „wolne do decyzji”;
 * - hull (kadłub) – the emergency fund; goals – savings by priority;
 * - energy – this month's salary (envelopes, cargo, tanks); what is left at the month's end is the loot (D18);
 * - tanks (odkładki) – periodic fees filled monthly from the energy;
 * - tax hold – the ICTTJ pool „Podatek”, outside the budget until PIT-38 is paid.
 * Receivables (purchases „do zwrotu”, loans given) are not money on the accounts: they are counted beside.
 *
 * The layers start on the budget's first day (`settings.budget.start`, else the earliest opening balance) with the
 * money on the accounts then; the history before serves the statistics only (average costs and income).
 */
import type { Settings } from '../schema/settings'
import { envelopeKind, type EnvelopeKind } from '../schema/budget'
import type { Balance, Container, Docking, Goal, Loan, MonthPlan, Transaction, TxKind } from '../schema/records'
import { addMonths, dayOfMonth, daysInMonth, firstDayOf, monthOf, monthRange, monthsBetween, warsawNow, warsawStamp } from './dates'
import { categoryIndex, costOf, incomeOf, partsOf, splitEvenly, sum } from './operations'

// ------------------------------------------------------------------ the rules as small pure functions

export interface DockTargets {
  /** null = unknown (no salary yet): everything stays in the shields. */
  shields: number | null
  /** null = unknown (no costs yet): nothing goes on past the shields. */
  hull: number | null
}

export interface DockLayers {
  shields: number
  hull: number
  goals: ReadonlyArray<{ id: string; amount: number; target: number }>
}

export interface DockSplit {
  shields: number
  hull: number
  goals: Record<string, number>
  /** Part of `shields` above their target: „wolne do decyzji”. */
  free: number
}

/**
 * The docking order (D13): shields to their target, hull to its target, goals by priority (`goals` in that order),
 * the rest stays in the shields as „wolne do decyzji”.
 */
export function dockAmount(amount: number, layers: DockLayers, targets: DockTargets): DockSplit {
  let rest = Math.max(0, amount)
  const toShields = targets.shields == null ? rest : Math.min(rest, Math.max(0, targets.shields - layers.shields))
  rest -= toShields
  let hull = 0
  const goals: Record<string, number> = {}
  if (targets.shields != null && targets.hull != null) {
    hull = Math.min(rest, Math.max(0, targets.hull - layers.hull))
    rest -= hull
    for (const g of layers.goals) {
      const take = Math.min(rest, Math.max(0, g.target - g.amount))
      if (take > 0) goals[g.id] = take
      rest -= take
    }
  }
  return { shields: toShields + rest, hull, goals, free: rest }
}

export interface SalaryPayment {
  fromShields: number
  fromHull: number
  paid: number
  /** 'yellow' = part from the hull (D14), 'red' = not enough in the hull either (a partial salary). */
  alarm: 'yellow' | 'red' | null
}

/** The salary on the 1st (D11, D14): from the shields, what is missing from the hull. */
export function paySalary(salary: number, shields: number, hull: number): SalaryPayment {
  const fromShields = Math.min(salary, Math.max(0, shields))
  const fromHull = Math.min(salary - fromShields, Math.max(0, hull))
  const paid = fromShields + fromHull
  return { fromShields, fromHull, paid, alarm: paid < salary ? 'red' : fromHull > 0 ? 'yellow' : null }
}

/** The tank's plan for one cycle of a periodic fee: 1 240 zł a year = 11 × 103,33 zł + 103,37 zł. */
export function sinkingSchedule(amount: number, cycleMonths: number): number[] {
  return splitEvenly(amount, cycleMonths)
}

/** Position of `month` in a container's cycle: 0 = the first month after a payment, cycleMonths − 1 = the payment's month. */
export function cyclePosition(container: Pick<Container, 'cycleMonths' | 'dueMonth'>, month: string): { index: number; dueMonth: string } {
  const n = container.cycleMonths
  const r = ((monthsBetween(container.dueMonth, month) % n) + n) % n
  const dueMonth = addMonths(month, (n - r) % n)
  return { index: n - 1 - monthsBetween(month, dueMonth), dueMonth }
}

/**
 * This month's contribution to a tank: the plan's installment plus an even share of what the tank lacks against
 * the plan (a fee added late, a smaller salary) – or minus an even share of a surplus. Never negative.
 */
export function sinkingInstallment(container: Pick<Container, 'amount' | 'cycleMonths' | 'dueMonth'>, month: string, tank: number): number {
  const n = container.cycleMonths
  const plan = sinkingSchedule(container.amount, n)
  const { index } = cyclePosition(container, month)
  const expected = sum(plan.slice(0, index))
  const left = n - index
  const deficit = expected - tank
  const share = left > 1 ? Math.trunc(deficit / left) : deficit
  return Math.max(0, (plan[index] ?? 0) + share)
}

export interface DailyAllowance {
  /** „Podstawowy przydział”: the daily envelopes over the days of the month. */
  base: number
  /** Today's energy: what is left of the daily envelopes over the days left, today included (never below 0). */
  allowance: number
  /** Today's energy after today's spending (below 0 = over). */
  left: number
  daysLeft: number
}

/** Today's energy (spec, „Dzienny przydział”): unspent energy carries to the next days, an overspent day lowers them. */
export function dailyAllowance(o: { limit: number; spentBefore: number; spentToday: number; day: number; daysInMonth: number }): DailyAllowance {
  const daysLeft = Math.max(1, o.daysInMonth - o.day + 1)
  const allowance = Math.max(0, Math.floor((o.limit - o.spentBefore) / daysLeft))
  return { base: Math.floor(o.limit / o.daysInMonth), allowance, left: allowance - o.spentToday, daysLeft }
}

/** Range (zasięg): how many months the shields and the hull last at the average net costs. */
export function rangeMonths(shields: number, hull: number, monthlyCosts: number | null): number | null {
  if (monthlyCosts == null || monthlyCosts <= 0) return null
  return (shields + hull) / monthlyCosts
}

export const SHIP_CLASSES = ['scout', 'corvette', 'frigate', 'destroyer', 'cruiser', 'flagship'] as const
export type ShipClass = (typeof SHIP_CLASSES)[number]
export const SHIP_CLASS_LABEL: Record<ShipClass, string> = {
  scout: 'Zwiadowca',
  corvette: 'Korweta',
  frigate: 'Fregata',
  destroyer: 'Niszczyciel',
  cruiser: 'Krążownik',
  flagship: 'Flagowiec'
}

/** The ship's class by its range (T10): < 1, 1–3, 3–6, 6–9, 9–12, ≥ 12 months. */
export function shipClass(range: number): ShipClass {
  if (range < 1) return 'scout'
  if (range < 3) return 'corvette'
  if (range < 6) return 'frigate'
  if (range < 9) return 'destroyer'
  if (range < 12) return 'cruiser'
  return 'flagship'
}

const activeIn = (c: Container, month: string) => !c.archived && (c.from == null || c.from <= month) && (c.until == null || month <= c.until)

/** The cargo's mass: fixed costs a month (periodic fees by their monthly share) as a % of the salary; the load line 40%. */
export function cargoMass(containers: readonly Container[], month: string, salary: number | null, limitPct: number): FleetState['cargo'] {
  const monthly = sum(containers.filter((c) => activeIn(c, month)).map((c) => Math.round(c.amount / c.cycleMonths)))
  const pct = salary && salary > 0 ? (monthly / salary) * 100 : null
  return { monthly, pct, limitPct, over: pct != null && pct > limitPct }
}

// ------------------------------------------------------------------ the whole state

export interface FleetInput {
  settings: Pick<Settings, 'accounts' | 'categories' | 'layers' | 'orders' | 'budget'>
  transactions: readonly Transaction[]
  containers?: readonly Container[]
  goals?: readonly Goal[]
  months?: readonly MonthPlan[]
  dockings?: readonly Docking[]
  loans?: readonly Loan[]
  balances?: readonly Balance[]
  /** The moment of the state; the budget's day is its Warsaw date. */
  now: Date | string
}

export type AlarmKind =
  | 'salary-from-hull'
  | 'salary-partial'
  | 'energy-exhausted'
  | 'firewall'
  | 'sinking-short'
  | 'deficit'
  | 'shields-below-min'
  | 'correction'
  | 'daily-over'
  | 'envelope-over'
  | 'cargo-over'
  | 'salary-above-income'

export interface Alarm {
  kind: AlarmKind
  level: 'yellow' | 'red'
  date: string
  amount: number
  txId?: string
  /** A category, container or month the alarm is about. */
  ref?: string
}

/** Layer movements of one event (grosze, + = into the layer). */
export interface Moves {
  shields?: number
  hull?: number
  energy?: number
  taxHold?: number
  loot?: number
  house?: number
  goals?: Record<string, number>
  tanks?: Record<string, number>
  loans?: Record<string, number>
}

export interface FleetEvent {
  date: string
  kind: 'start' | 'account' | 'salary' | 'sinking' | 'month-end' | 'loot' | TxKind
  amount: number
  txId?: string
  moves: Moves
}

export interface EnvelopeState {
  categoryId: string
  kind: EnvelopeKind
  limit: number
  spent: number
  left: number
}

export interface FleetState {
  today: string
  month: string
  /** The layers run (a start day and money known). */
  started: boolean
  start: string | null
  accounts: Array<{ id: string; name: string; balance: number; opening: { date: string; amount: number } | null }>
  /** The money on the budget's accounts = the layers' sum. */
  total: number
  shields: { amount: number; target: number | null; free: number; min: number | null }
  hull: { amount: number; target: number | null }
  goals: Array<{ id: string; name: string; amount: number; target: number; priority: number }>
  energy: number
  tanks: Array<{ containerId: string; name: string; amount: number; dueMonth: string; due: number }>
  taxHold: number
  loot: { month: string | null; amount: number }
  receivables: { house: number; loans: Record<string, number>; total: number }
  costs: { average: number | null; months: number; source: 'history' | 'assumed' | null }
  income: { average: number | null; months: number }
  range: number | null
  shipClass: ShipClass | null
  cargo: { monthly: number; pct: number | null; limitPct: number; over: boolean }
  /** The plan in force this month (its own or the last earlier one). */
  plan: { month: string; salary: number } | null
  /** This month's salary as paid. */
  salary: SalaryPayment | null
  envelopes: EnvelopeState[]
  daily: (DailyAllowance & { limit: number; spentBefore: number; spentToday: number }) | null
  alarms: Alarm[]
  log: FleetEvent[]
}

interface Ev {
  key: string
  run: () => void
}

/** Average of the last `count` full months before `month` (from the first fully covered month). */
function averageOf(byMonth: ReadonlyMap<string, number>, firstFull: string | null, month: string, count: number): { average: number | null; months: number } {
  if (!firstFull) return { average: null, months: 0 }
  const last = addMonths(month, -1)
  if (last < firstFull) return { average: null, months: 0 }
  const months = monthRange(firstFull, last).slice(-count)
  return { average: Math.round(sum(months.map((m) => byMonth.get(m) ?? 0)) / months.length), months: months.length }
}

export function computeFleet(input: FleetInput): FleetState {
  const { date: today, month } = warsawNow(input.now)
  const { settings } = input
  const cats = categoryIndex(settings.categories)
  const containers = input.containers ?? []
  const goalsAll = [...(input.goals ?? [])].sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  const plans = [...(input.months ?? [])].sort((a, b) => a.month.localeCompare(b.month))
  const dockingByTx = new Map((input.dockings ?? []).map((d) => [d.transactionId, d]))
  const loansById = new Map((input.loans ?? []).map((l) => [l.id, l]))
  const txs = input.transactions.filter((t) => t.date <= today)

  // ---------------------------------------------------------------- accounts and balances
  const openings = new Map<string, Balance>()
  for (const b of input.balances ?? []) {
    if (b.kind !== 'opening' || b.date > today) continue
    const prev = openings.get(b.accountId)
    if (!prev || b.date > prev.date || (b.date === prev.date && b.updatedAt > prev.updatedAt)) openings.set(b.accountId, b)
  }
  const accountIds = [...new Set([...settings.accounts.map((a) => a.id), ...txs.map((t) => t.accountId), ...openings.keys()])]
  const counts = (t: Transaction) => {
    const o = openings.get(t.accountId)
    return !o || t.date >= o.date
  }
  const balanceAt = (accountId: string, beforeDate: string | null) => {
    const o = openings.get(accountId)
    return (o?.amount ?? 0) + sum(txs.filter((t) => t.accountId === accountId && counts(t) && (beforeDate == null || t.date < beforeDate)).map((t) => t.amount))
  }
  const accounts = accountIds.map((id) => {
    const o = openings.get(id)
    return { id, name: settings.accounts.find((a) => a.id === id)?.name ?? '(usunięte konto)', balance: balanceAt(id, null), opening: o ? { date: o.date, amount: o.amount } : null }
  })
  const total = sum(accounts.map((a) => a.balance))

  // ---------------------------------------------------------------- statistics from the whole history
  const dataDates = [...txs.map((t) => t.date), ...[...openings.values()].map((o) => o.date)].sort()
  const coverage = dataDates[0] ?? null
  const firstFull = coverage ? (coverage.endsWith('-01') ? monthOf(coverage) : addMonths(monthOf(coverage), 1)) : null
  const costsByMonth = new Map<string, number>()
  const incomeByMonth = new Map<string, number>()
  for (const t of txs) {
    const m = monthOf(t.date)
    const c = costOf(t)
    if (c) costsByMonth.set(m, (costsByMonth.get(m) ?? 0) + c)
    const i = incomeOf(t)
    if (i) incomeByMonth.set(m, (incomeByMonth.get(m) ?? 0) + i)
  }
  const costsFor = (m: string): FleetState['costs'] => {
    const h = averageOf(costsByMonth, firstFull, m, 12)
    const assumed = settings.layers.assumedCosts
    if (h.months >= 3 || (assumed == null && h.average != null)) return { average: h.average, months: h.months, source: 'history' }
    if (assumed != null) return { average: assumed, months: h.months, source: 'assumed' }
    return { average: null, months: 0, source: null }
  }
  const costsCache = new Map<string, FleetState['costs']>()
  const costsAt = (m: string) => costsCache.get(m) ?? costsCache.set(m, costsFor(m)).get(m)!
  const planFor = (m: string): MonthPlan | null => {
    let found: MonthPlan | null = null
    for (const p of plans) if (p.month <= m) found = p
    return found
  }
  const salaryOf = (m: string) => planFor(m)?.salary ?? null
  const targetsAt = (date: string): DockTargets => {
    const m = monthOf(date)
    const salary = salaryOf(m)
    const costs = costsAt(m).average
    return {
      shields: salary != null && salary > 0 ? settings.layers.shieldSalaries * salary : null,
      hull: costs != null ? settings.layers.hullMonths * costs : null
    }
  }

  // ---------------------------------------------------------------- the layers
  const start = settings.budget.start ?? ([...openings.values()].map((o) => o.date).sort()[0] ?? null)
  const started = start != null && start <= today
  let shields = 0
  let hull = 0
  let energy = 0
  let taxHold = 0
  let loot = 0
  let lootMonth: string | null = null
  let house = 0
  const goalAmount = new Map<string, number>()
  const tanks = new Map<string, number>()
  const loanOpen = new Map<string, number>()
  const salaryOfMonth = new Map<string, SalaryPayment>()
  const dailyExtra = new Map<string, number>()
  const alarms: Alarm[] = []
  const log: FleetEvent[] = []

  const activeGoals = () => goalsAll.filter((g) => !g.archived).map((g) => ({ id: g.id, amount: goalAmount.get(g.id) ?? 0, target: g.target }))
  const addGoal = (id: string, v: number, moves: Moves) => {
    goalAmount.set(id, (goalAmount.get(id) ?? 0) + v)
    moves.goals = { ...moves.goals, [id]: (moves.goals?.[id] ?? 0) + v }
  }
  const addShields = (v: number, moves: Moves) => {
    shields += v
    moves.shields = (moves.shields ?? 0) + v
  }
  /** Money out of the shields; what they lack comes from the hull, then the shields go below zero (a deficit). */
  const drawShields = (v: number, moves: Moves) => {
    const fromShields = Math.min(v, Math.max(0, shields))
    const fromHull = Math.min(v - fromShields, Math.max(0, hull))
    hull -= fromHull
    if (fromHull) moves.hull = (moves.hull ?? 0) - fromHull
    addShields(-(v - fromHull), moves)
  }
  const dock = (v: number, date: string, moves: Moves) => {
    const split = dockAmount(v, { shields, hull, goals: activeGoals() }, targetsAt(date))
    addShields(split.shields, moves)
    hull += split.hull
    if (split.hull) moves.hull = (moves.hull ?? 0) + split.hull
    for (const [id, g] of Object.entries(split.goals)) addGoal(id, g, moves)
  }
  /** Straight into the goals by priority (the ICTTJ pool „Cele”); what they do not need stays in the shields. */
  const fillGoals = (v: number, moves: Moves) => {
    let rest = v
    for (const g of activeGoals()) {
      const take = Math.min(rest, Math.max(0, g.target - g.amount))
      if (take > 0) addGoal(g.id, take, moves)
      rest -= take
    }
    if (rest) addShields(rest, moves)
  }
  const knownGoal = (id: string) => goalsAll.some((g) => g.id === id)
  const applySplit = (v: number, split: NonNullable<Docking['split']>, moves: Moves) => {
    let rest = v
    if (split.hull) {
      hull += split.hull
      moves.hull = (moves.hull ?? 0) + split.hull
      rest -= split.hull
    }
    for (const [id, g] of Object.entries(split.goals)) {
      if (!g || !knownGoal(id)) continue
      addGoal(id, g, moves)
      rest -= g
    }
    if (split.taxHold) {
      taxHold += split.taxHold
      moves.taxHold = (moves.taxHold ?? 0) + split.taxHold
      rest -= split.taxHold
    }
    addShields(rest, moves)
  }
  const energyActive = (date: string) => salaryOfMonth.has(monthOf(date))
  const spendEnergy = (v: number, t: Transaction, moves: Moves) => {
    if (!energyActive(t.date)) return drawShields(v, moves)
    const fromEnergy = Math.min(v, Math.max(0, energy))
    energy -= fromEnergy
    if (fromEnergy) moves.energy = (moves.energy ?? 0) - fromEnergy
    if (v > fromEnergy) {
      drawShields(v - fromEnergy, moves)
      alarms.push({ kind: 'energy-exhausted', level: 'red', date: t.date, amount: v - fromEnergy, txId: t.id })
    }
  }
  const refundEnergy = (v: number, t: Transaction, moves: Moves) => {
    if (!energyActive(t.date)) return addShields(v, moves)
    energy += v
    moves.energy = (moves.energy ?? 0) + v
  }
  const record = (ev: FleetEvent) => {
    if (Object.keys(ev.moves).length) log.push(ev)
  }

  const payMonth = (m: string, date: string) => {
    const salary = salaryOf(m)
    if (salary != null && salary > 0) {
      const pay = paySalary(salary, shields, hull)
      shields -= pay.fromShields
      hull -= pay.fromHull
      energy += pay.paid
      salaryOfMonth.set(m, pay)
      record({ date, kind: 'salary', amount: pay.paid, moves: { shields: -pay.fromShields, ...(pay.fromHull ? { hull: -pay.fromHull } : {}), energy: pay.paid } })
      if (pay.alarm === 'yellow') alarms.push({ kind: 'salary-from-hull', level: 'yellow', date, amount: pay.fromHull, ref: m })
      if (pay.alarm === 'red') alarms.push({ kind: 'salary-partial', level: 'red', date, amount: salary - pay.paid, ref: m })
    }
    if (!salaryOfMonth.has(m)) return
    // The tanks of the periodic fees, from this month's energy.
    for (const c of containers) {
      if (c.cycleMonths <= 1 || !activeIn(c, m)) continue
      const tank = tanks.get(c.id) ?? 0
      const want = sinkingInstallment(c, m, tank)
      const take = Math.min(want, Math.max(0, energy))
      if (!take) continue
      energy -= take
      tanks.set(c.id, tank + take)
      record({ date, kind: 'sinking', amount: take, moves: { energy: -take, tanks: { [c.id]: take } } })
    }
  }

  const runTx = (t: Transaction) => {
    const moves: Moves = {}
    const amt = t.amount
    switch (t.kind) {
      case 'expense': {
        const container = t.containerId ? containers.find((c) => c.id === t.containerId) : undefined
        const periodic = container && container.cycleMonths > 1 ? container : undefined
        const goal = t.goalId && knownGoal(t.goalId) ? t.goalId : null
        for (const p of partsOf(t)) {
          if (p.refundable) {
            // Bought for the house: lent from the shields, owed back (D21).
            if (p.amount < 0) {
              drawShields(-p.amount, moves)
              house += -p.amount
              moves.house = (moves.house ?? 0) - p.amount
            } else {
              const back = Math.min(p.amount, house)
              house -= back
              if (back) moves.house = (moves.house ?? 0) - back
              addShields(p.amount, moves)
            }
          } else if (goal) {
            if (p.amount < 0) {
              const have = goalAmount.get(goal) ?? 0
              const fromGoal = Math.min(-p.amount, Math.max(0, have))
              if (fromGoal) addGoal(goal, -fromGoal, moves)
              if (-p.amount > fromGoal) drawShields(-p.amount - fromGoal, moves)
            } else addGoal(goal, p.amount, moves)
          } else if (periodic) {
            if (p.amount < 0) {
              const tank = tanks.get(periodic.id) ?? 0
              const fromTank = Math.min(-p.amount, Math.max(0, tank))
              tanks.set(periodic.id, tank - fromTank)
              if (fromTank) moves.tanks = { ...moves.tanks, [periodic.id]: -fromTank }
              if (-p.amount > fromTank) {
                spendEnergy(-p.amount - fromTank, t, moves)
                alarms.push({ kind: 'sinking-short', level: 'yellow', date: t.date, amount: -p.amount - fromTank, txId: t.id, ref: periodic.id })
              }
            } else {
              tanks.set(periodic.id, (tanks.get(periodic.id) ?? 0) + p.amount)
              moves.tanks = { ...moves.tanks, [periodic.id]: p.amount }
            }
          } else if (p.amount < 0) spendEnergy(-p.amount, t, moves)
          else refundEnergy(p.amount, t, moves)
        }
        break
      }
      case 'income': {
        if (amt < 0) {
          drawShields(-amt, moves)
          break
        }
        // A household member's payment: first it repays the house receivable (back to the shields), the rest docks (D20).
        const repaid = Math.min(t.repaid, house, amt)
        if (repaid) {
          house -= repaid
          moves.house = -repaid
          addShields(repaid, moves)
        }
        const rest = amt - repaid
        const d = dockingByTx.get(t.id)
        if (!rest) break
        if (d?.split) applySplit(rest, d.split, moves)
        else dock(rest, t.date, moves)
        break
      }
      case 'trading': {
        if (amt > 0) {
          // A withdrawal from the trading account (D55): the pool decides – Cele → goals, Podatek → outside the budget.
          const d = dockingByTx.get(t.id)
          if (d?.split) applySplit(amt, d.split, moves)
          else if (d?.pool === 'goals') fillGoals(amt, moves)
          else if (d?.pool === 'tax') {
            taxHold += amt
            moves.taxHold = amt
          } else dock(amt, t.date, moves)
        } else if (amt < 0) {
          // A top-up of the trading account: only from „wolne do decyzji” with full shields and hull (D23, firewall).
          const tg = targetsAt(t.date)
          const allowed = tg.shields != null && tg.hull != null && shields + amt >= tg.shields && hull >= tg.hull
          if (!allowed && settings.orders.firewall) alarms.push({ kind: 'firewall', level: 'red', date: t.date, amount: -amt, txId: t.id })
          drawShields(-amt, moves)
        }
        break
      }
      case 'tax': {
        if (amt < 0) {
          const fromHold = Math.min(-amt, Math.max(0, taxHold))
          taxHold -= fromHold
          if (fromHold) moves.taxHold = -fromHold
          if (-amt > fromHold) drawShields(-amt - fromHold, moves)
        } else addShields(amt, moves)
        break
      }
      case 'loan': {
        const loan = t.loanId ? loansById.get(t.loanId) : undefined
        const key = t.loanId ?? '-'
        if (loan?.direction === 'taken') {
          if (amt < 0) drawShields(-amt, moves)
          else addShields(amt, moves)
          break
        }
        if (amt < 0) {
          drawShields(-amt, moves)
          loanOpen.set(key, (loanOpen.get(key) ?? 0) - amt)
          moves.loans = { [key]: -amt }
        } else {
          const back = Math.min(amt, loanOpen.get(key) ?? 0)
          loanOpen.set(key, (loanOpen.get(key) ?? 0) - back)
          if (back) {
            moves.loans = { [key]: -back }
            addShields(back, moves)
          }
          // More than was lent (interest): income.
          if (amt > back) dock(amt - back, t.date, moves)
        }
        break
      }
      case 'transfer':
      case 'correction':
        addShields(amt, moves)
        break
    }
    record({ date: t.date, kind: t.kind, amount: amt, txId: t.id, moves })
  }

  if (started && start) {
    const events: Ev[] = []
    const at = (date: string, slot: number, rest = '') => `${date} ${slot} ${rest}`
    // The start: the money on the accounts then, split as the wizard said or by the docking order; this month's salary.
    events.push({
      key: at(start, 0, '0'),
      run: () => {
        const moves: Moves = {}
        const startTotal = sum(accountIds.filter((id) => (openings.get(id)?.date ?? start) <= start).map((id) => balanceAt(id, start)))
        const initial = settings.budget.initial
        if (initial) {
          hull += initial.hull
          if (initial.hull) moves.hull = initial.hull
          let rest = startTotal - initial.hull
          for (const [id, g] of Object.entries(initial.goals)) {
            if (!g || !knownGoal(id)) continue
            addGoal(id, g, moves)
            rest -= g
          }
          addShields(rest, moves)
        } else if (startTotal > 0) dock(startTotal, start, moves)
        else addShields(startTotal, moves)
        record({ date: start, kind: 'start', amount: startTotal, moves })
        payMonth(monthOf(start), start)
      }
    })
    // Accounts that join the budget later: their opening balance comes into the shields that day.
    for (const [id, o] of openings) {
      if (o.date <= start) continue
      events.push({
        key: at(o.date, 1),
        run: () => {
          const moves: Moves = {}
          addShields(o.amount, moves)
          record({ date: o.date, kind: 'account', amount: o.amount, moves })
        }
      })
    }
    // Month by month: the energy left becomes the loot, the salary, the tanks; the loot without a decision in 7 days → shields.
    for (const m of monthRange(addMonths(monthOf(start), 1), month)) {
      const prev = addMonths(m, -1)
      events.push({
        key: at(firstDayOf(m), 0, '1'),
        run: () => {
          if (lootMonth && loot) {
            shields += loot
            record({ date: firstDayOf(m), kind: 'loot', amount: loot, moves: { loot: -loot, shields: loot } })
          }
          loot = Math.max(0, energy)
          lootMonth = prev
          if (energy) record({ date: firstDayOf(m), kind: 'month-end', amount: energy, moves: { energy: -energy, loot: energy } })
          shields += Math.min(0, energy)
          energy = 0
          payMonth(m, firstDayOf(m))
        }
      })
      const deadline = `${m}-08`
      if (deadline <= today)
        events.push({
          key: at(deadline, 2),
          run: () => {
            if (lootMonth !== prev || !loot) return
            shields += loot
            record({ date: deadline, kind: 'loot', amount: loot, moves: { loot: -loot, shields: loot } })
            loot = 0
            lootMonth = null
          }
        })
      const decision = plans.find((p) => p.month === prev)?.loot
      if (decision) {
        const stamp = warsawStamp(decision.decidedAt)
        const date = stamp.slice(0, 10)
        if (date >= firstDayOf(m) && date < deadline && date <= today)
          events.push({
            key: at(date, 3, stamp.slice(11)),
            run: () => {
              if (lootMonth !== prev || !loot) return
              const moves: Moves = { loot: -loot }
              let rest = loot
              for (const [id, g] of Object.entries(decision.goals)) {
                const take = Math.min(rest, g)
                if (!take || !knownGoal(id)) continue
                addGoal(id, take, moves)
                rest -= take
              }
              const next = Math.min(rest, decision.nextMonth)
              if (next) {
                energy += next
                moves.energy = next
                dailyExtra.set(m, (dailyExtra.get(m) ?? 0) + next)
                rest -= next
              }
              if (rest) addShields(rest, moves)
              record({ date, kind: 'loot', amount: loot, moves })
              loot = 0
              lootMonth = null
            }
          })
      }
    }
    for (const t of txs) {
      if (t.date < start || !counts(t)) continue
      events.push({ key: at(t.date, 3, `${t.time ?? ''} ${t.createdAt} ${t.id}`), run: () => runTx(t) })
    }
    events.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    for (const e of events) e.run()
  }

  // ---------------------------------------------------------------- now
  const plan = planFor(month)
  const salary = plan?.salary ?? null
  const targets = targetsAt(today)
  const costs = costsAt(month)
  const income = averageOf(incomeByMonth, firstFull, month, 6)
  const range = started ? rangeMonths(shields, hull, costs.average) : null
  const minShields = salary ? Math.round(settings.orders.minShieldSalaries * salary) : null

  // Envelopes and today's energy: the whole month counts (spending before the budget's start too).
  const envelopes: EnvelopeState[] = []
  let daily: FleetState['daily'] = null
  if (plan) {
    const spentBy = new Map<string, { before: number; today: number }>()
    let dailyBefore = 0
    let dailyToday = 0
    for (const t of txs) {
      if (monthOf(t.date) !== month || t.kind !== 'expense' || t.goalId || t.containerId) continue
      for (const p of partsOf(t)) {
        if (p.refundable) continue
        const cost = -p.amount
        const main = cats.mainOf(p.categoryId)
        const kind = main ? envelopeKind(main) : 'daily'
        if (main) {
          const s = spentBy.get(main.id) ?? { before: 0, today: 0 }
          if (t.date === today) s.today += cost
          else s.before += cost
          spentBy.set(main.id, s)
        }
        // Spending without a category counts against today's energy: most likely a daily purchase.
        if (kind === 'daily') {
          if (t.date === today) dailyToday += cost
          else dailyBefore += cost
        }
      }
    }
    let dailyLimit = dailyExtra.get(month) ?? 0
    for (const main of cats.mains) {
      const kind = envelopeKind(main)
      if (!kind) continue
      const limit = plan.envelopes[main.id]
      if (kind === 'daily') dailyLimit += limit ?? 0
      if (limit == null) continue
      const s = spentBy.get(main.id) ?? { before: 0, today: 0 }
      const spent = s.before + s.today
      envelopes.push({ categoryId: main.id, kind, limit, spent, left: limit - spent })
      if (kind === 'planned' && spent > limit) alarms.push({ kind: 'envelope-over', level: spent > limit * 1.2 ? 'red' : 'yellow', date: today, amount: spent - limit, ref: main.id })
    }
    const d = dailyAllowance({ limit: dailyLimit, spentBefore: dailyBefore, spentToday: dailyToday, day: dayOfMonth(today), daysInMonth: daysInMonth(month) })
    daily = { ...d, limit: dailyLimit, spentBefore: dailyBefore, spentToday: dailyToday }
    if (d.left < 0) alarms.push({ kind: 'daily-over', level: 'yellow', date: today, amount: -d.left })
  }

  if (started) {
    if (shields < 0) alarms.push({ kind: 'deficit', level: 'red', date: today, amount: -shields })
    else if (minShields != null && shields < minShields) alarms.push({ kind: 'shields-below-min', level: 'yellow', date: today, amount: minShields - shields })
  }
  for (const t of txs) if (t.kind === 'correction' && counts(t)) alarms.push({ kind: 'correction', level: 'yellow', date: t.date, amount: t.amount, txId: t.id })
  const cargo = cargoMass(containers, month, salary, settings.orders.cargoLimitPct)
  if (cargo.over) alarms.push({ kind: 'cargo-over', level: 'yellow', date: today, amount: cargo.monthly })
  if (salary != null && income.average != null && salary > income.average) alarms.push({ kind: 'salary-above-income', level: 'yellow', date: today, amount: salary - income.average })

  const nextDue = (c: Container) => cyclePosition(c, month).dueMonth
  return {
    today,
    month,
    started,
    start,
    accounts,
    total,
    shields: { amount: shields, target: targets.shields, free: targets.shields != null ? Math.max(0, shields - targets.shields) : 0, min: minShields },
    hull: { amount: hull, target: targets.hull },
    goals: goalsAll.map((g) => ({ id: g.id, name: g.name, amount: goalAmount.get(g.id) ?? 0, target: g.target, priority: g.priority })),
    energy,
    tanks: containers
      .filter((c) => c.cycleMonths > 1 && (activeIn(c, month) || (tanks.get(c.id) ?? 0) !== 0))
      .map((c) => ({ containerId: c.id, name: c.name, amount: tanks.get(c.id) ?? 0, dueMonth: nextDue(c), due: c.amount })),
    taxHold,
    loot: { month: lootMonth, amount: loot },
    receivables: { house, loans: Object.fromEntries(loanOpen), total: house + sum([...loanOpen.values()]) },
    costs,
    income,
    range,
    shipClass: range != null ? shipClass(range) : null,
    cargo,
    plan: plan ? { month: plan.month, salary: plan.salary } : null,
    salary: salaryOfMonth.get(month) ?? null,
    envelopes,
    daily,
    alarms,
    log
  }
}

/** Sum of the layers – equal to `total` (the balances) once the layers run (the invariant the tests check). */
export function layersSum(s: FleetState): number {
  return s.shields.amount + s.hull.amount + sum(s.goals.map((g) => g.amount)) + s.energy + sum(s.tanks.map((t) => t.amount)) + s.taxHold + s.loot.amount
}
