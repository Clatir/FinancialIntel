/**
 * The start wizard's numbers (spec, „Kreator startu”): the opening balance of an account from its balance now, the
 * targets of the layers from the salary and the costs, and the proposed split of the money at the start (the docking
 * order – D70).
 */
import type { Transaction } from '../schema/records'
import { dockAmount } from './fleet'
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
