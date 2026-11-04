/**
 * The start wizard's numbers (spec, „Kreator startu”): the opening balance of an account from its balance now, the
 * targets of the layers from the salary and the costs, and the proposed split of the money at the start (the docking
 * order – D70).
 */
import type { Balance, Transaction } from '../schema/records'
import { balanceAt, openingOf } from './balances'
import { addDays, monthOf } from './dates'
import { activeIn, cyclePosition, dockAmount, paidBeforeStart, paySalary, sinkingSchedule, tankWant, type AmountOf, type FeeOf, type SalaryPayment } from './fleet'
import { amountOn, dateOn, sum } from './operations'
import { ENVELOPE_STEP } from './plan'

/**
 * The opening balance at the start of `today` from the balance read in the bank now: the operations of today already in
 * the budget are part of that balance, so they come off. One dated later (a payment planned ahead) is not in the bank's
 * balance yet (B127) – the engine takes it on its day.
 */
export function openingFromNow(accountId: string, balanceNow: number, today: string, transactions: readonly Transaction[]): number {
  // The other side of a transfer in one operation (F10) is in the bank's balance too.
  return balanceNow - sum(transactions.filter((t) => dateOn(t, accountId) === today).map((t) => amountOn(t, accountId)))
}

/**
 * The money the start splits (R-4, T51): every account's balance at the start of the start's day, as „Uruchom budżet”
 * writes it and the engine splits it – a balance typed „now” less today's operations (`openingFromNow`), an empty field
 * of an account with its opening balance – that opening and the operations up to yesterday, else 0. Never the balance
 * now with today's purchases: the engine takes those from the day's energy after the split.
 */
export function startMoney(accountIds: readonly string[], typed: Readonly<Record<string, number | null | undefined>>, today: string, transactions: readonly Transaction[], balances: readonly Balance[]): number {
  return sum(
    accountIds.map((id) => {
      const now = typed[id]
      if (now != null) return openingFromNow(id, now, today, transactions)
      return openingOf(id, balances) ? balanceAt(id, addDays(today, -1), transactions, balances) : 0
    })
  )
}

export interface StartTargets {
  /** The shields' target: salaries × the setting (spec: 3). */
  shields: number | null
  /** The hull's target: months × the average costs (spec: 6). */
  hull: number | null
}

export function startTargets(salary: number | null, costs: number | null, layers: { shieldSalaries: number; hullMonths: number }): StartTargets {
  return {
    shields: salary != null && salary > 0 ? layers.shieldSalaries * salary : null,
    hull: costs != null && costs > 0 ? layers.hullMonths * costs : null
  }
}

/**
 * The money at the start split as a delivery would dock (D13, D70): the shields to their target, the hull to its, the
 * goals by priority (`goals` in that order, N7), the rest stays in the shields as „wolne do decyzji”.
 */
export function startSplit(
  total: number,
  targets: StartTargets,
  goals: ReadonlyArray<{ id: string; target: number }> = []
): { shields: number; hull: number; goals: Record<string, number>; free: number } {
  if (total <= 0) return { shields: total, hull: 0, goals: {}, free: 0 }
  const split = dockAmount(total, { shields: 0, hull: 0, goals: goals.map((g) => ({ id: g.id, amount: 0, target: g.target })) }, targets)
  return { shields: split.shields, hull: split.hull, goals: split.goals, free: split.free }
}

/** A periodic fee the start finds (a container, or a proposal chosen in the wizard) with the days of its payments. */
export type StartTankItem = FeeOf & AmountOf & { key: string; paid: readonly string[] }

/**
 * The tanks of the start's month as the engine fills them (N9, N-PC-7, AP-5): each fee's installment (`tankWant` – with
 * the money set in its tank at the start, `tanks`) and what the plan wants in the tank for the months of its cycle
 * before the start (`planAmount` – „do planu”). A cycle its payments before the start paid (`paidBeforeStart`, T135 –
 * `paid`) wants neither: its tank collects for the next one; a fee out of its life that month neither.
 */
export function startTanks(items: readonly StartTankItem[], start: string, tanks: Readonly<Record<string, number>>): Array<{ key: string; installment: number; planAmount: number; paid: boolean }> {
  const month = monthOf(start)
  return items.map((item) => {
    if (!activeIn(item, month)) return { key: item.key, installment: 0, planAmount: 0, paid: false }
    const paidDues = paidBeforeStart(item, item.paid, start)
    const pos = cyclePosition(item, month)
    const paid = paidDues.has(pos.dueMonth)
    const planAmount = pos.index > 0 && !paid ? sum(sinkingSchedule(item.amount, pos.length).slice(0, pos.index)) : 0
    return { key: item.key, installment: tankWant(item, month, tanks[item.key] ?? 0, paidDues), planAmount, paid }
  })
}

/** What the start does to the layers on its day after the split (AP-25, AF-10): the rows of the wizard's step 6. */
export interface StartEffect {
  /** The shields right after the split (the money at the start of the day less the hull, the goals and the tanks). */
  split: number
  /** The first salary into the energy: its month's salary less what the month spent before the start (T45). */
  salary: SalaryPayment & { due: number }
  /** The household members' opening advances into their deposit (D81): from the shields, short – from the hull. */
  deposit: { amount: number; fromShields: number; fromHull: number }
  /** The shields and the hull after the start's moves – what the bridge shows after „Uruchom budżet”. */
  shields: number
  hull: number
  /** The shields after the start below the orders' minimum (`min`): the briefing's alarm from the first day. */
  belowMin: boolean
}

/**
 * The start's day as the engine runs it (`computeFleet`: the start's event with its salary, then the settlements' start
 * – D81): the money at the start of the day split (`total` – the opening balances, never the balances now with today's
 * operations – R-4), the first salary paid from the shields (short – from the hull, `paySalary`), the members' advances
 * drawn into their deposit (the engine's `drawShields`). `spentBefore` – `startMonthSpentOf`; `deposit` – the members'
 * opening advances.
 */
export function startEffect(o: { total: number; hull: number; goals: number; tanks: number; salary: number | null; spentBefore: number; deposit: number; min?: number | null }): StartEffect {
  const split = o.total - o.hull - o.goals - o.tanks
  const due = o.salary != null && o.salary > 0 ? Math.max(0, o.salary - o.spentBefore) : 0
  const pay = paySalary(due, split, o.hull)
  let shields = split - pay.fromShields
  let hull = o.hull - pay.fromHull
  const amount = Math.max(0, o.deposit)
  const fromShields = Math.min(amount, Math.max(0, shields))
  const fromHull = Math.min(amount - fromShields, Math.max(0, hull))
  hull -= fromHull
  shields -= amount - fromHull
  return { split, salary: { ...pay, due }, deposit: { amount, fromShields, fromHull }, shields, hull, belowMin: o.min != null && o.min > 0 && shields < o.min }
}

/**
 * The shields' minimum of the orders (D11 – as the engine's alarm counts it): `minShieldSalaries` salaries, never more
 * than the shields' target in salaries; null without a salary.
 */
export const shieldsMinimum = (salary: number | null, minShieldSalaries: number, shieldSalaries: number): number | null =>
  salary != null && salary > 0 ? Math.round(Math.min(minShieldSalaries, shieldSalaries) * salary) : null

/**
 * The envelopes' proposals fitted to the salary (AP-25, KR sp. 5): the averages of 3 months (T47) may ask more than the
 * salary of 6 months leaves after the cargo, the tanks and the envelopes typed by hand (`room`) – then each proposal
 * shrinks in proportion, down to whole tens of złoty, so the first month's plan never starts over the salary by itself.
 * What the tens leave stays unplanned (the loot). Proposals that fit come back as they are (`fitted` false).
 */
export function fitEnvelopes(proposals: Readonly<Record<string, number>>, room: number): { envelopes: Record<string, number>; fitted: boolean; asked: number } {
  const asked = sum(Object.values(proposals))
  if (asked <= room) return { envelopes: { ...proposals }, fitted: false, asked }
  const left = Math.max(0, room)
  const envelopes: Record<string, number> = {}
  for (const [id, limit] of Object.entries(proposals)) envelopes[id] = Math.floor((limit * left) / asked / ENVELOPE_STEP) * ENVELOPE_STEP
  return { envelopes, fitted: true, asked }
}
