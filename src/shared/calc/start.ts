/**
 * The start wizard's numbers (spec, „Kreator startu”): the opening balance of an account from its balance now, the
 * targets of the layers from the salary and the costs, and the proposed split of the money at the start (the docking
 * order – D70).
 */
import type { Transaction } from '../schema/records'
import { monthOf } from './dates'
import { activeIn, cyclePosition, dockAmount, paidBeforeStart, sinkingSchedule, tankWant, type AmountOf, type FeeOf } from './fleet'
import { amountOn, dateOn, sum } from './operations'

/**
 * The opening balance at the start of `today` from the balance read in the bank now: the operations of today already in
 * the budget are part of that balance, so they come off. One dated later (a payment planned ahead) is not in the bank's
 * balance yet (B127) – the engine takes it on its day.
 */
export function openingFromNow(accountId: string, balanceNow: number, today: string, transactions: readonly Transaction[]): number {
  // The other side of a transfer in one operation (F10) is in the bank's balance too.
  return balanceNow - sum(transactions.filter((t) => dateOn(t, accountId) === today).map((t) => amountOn(t, accountId)))
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
 * before the start (`planAmount` – „do planu”). A cycle its payments before the start paid (`paidBeforeStart`, T135)
 * wants neither: its tank collects for the next one; a fee out of its life that month neither.
 */
export function startTanks(items: readonly StartTankItem[], start: string, tanks: Readonly<Record<string, number>>): Array<{ key: string; installment: number; planAmount: number }> {
  const month = monthOf(start)
  return items.map((item) => {
    if (!activeIn(item, month)) return { key: item.key, installment: 0, planAmount: 0 }
    const paid = paidBeforeStart(item, item.paid, start)
    const pos = cyclePosition(item, month)
    const planAmount = pos.index > 0 && !paid.has(pos.dueMonth) ? sum(sinkingSchedule(item.amount, pos.length).slice(0, pos.index)) : 0
    return { key: item.key, installment: tankWant(item, month, tanks[item.key] ?? 0, paid), planAmount }
  })
}
