/**
 * The start wizard's numbers (spec, „Kreator startu”): the opening balance of an account from its balance now, the
 * targets of the layers from the salary and the costs, and the proposed split of the money at the start (the docking
 * order – D70).
 */
import type { Container, Transaction } from '../schema/records'
import { paymentsIndex, type FeeDuesOf, type Linked } from './cargoStatus'
import { monthOf } from './dates'
import { activeIn, cyclePosition, dockAmount, paidBeforeStart, sinkingSchedule, tankWant } from './fleet'
import { amountOn, dateOn, sum } from './operations'
import { linkFromOf, unlinkedPayments, type RecurringPayment } from './plan'

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

/**
 * A periodic fee the start finds (a container, or a proposal chosen in the wizard) with its payments – their days (each
 * the fee's amount then) or the payments – and its payment day (none: its latest payment's, T376); counted as the fees'
 * state counts it (`FeeDuesOf` – a variable bill too, F23).
 */
export type StartTankItem = FeeDuesOf & { key: string; paid: ReadonlyArray<string | { date: string; amount: number }> }

/** A proposal of the wizard's step 4 (D70, F23) as the start makes it a container. */
export type StartProposal = Pick<RecurringPayment, 'key' | 'label' | 'amount' | 'cycleMonths' | 'dueMonth' | 'dueDay' | 'schedule' | 'variable'>

/**
 * The periodic fees of the start (N-PC-7): the hold's containers (not archived) and the proposals chosen in step 4 – each
 * as the engine counts it after the start (AP-5, T393, przegląd 2 N3): a container whole – its amounts, calendar and life,
 * a bill of a varying amount (F23: any second payment of a window pays an older due), the month it came into the hold,
 * the dues settled outside the budget; a proposal as the container the start makes of it.
 */
export function startTankItems(containers: readonly Container[], chosen: readonly StartProposal[]): Array<Omit<StartTankItem, 'paid'> & { name: string }> {
  return [
    ...containers.filter((c) => !c.archived && c.cycleMonths > 1).map((c) => ({ ...c, key: c.id })),
    ...chosen
      .filter((p) => p.cycleMonths > 1)
      .map((p) => ({ key: p.key, name: p.label, amount: p.amount, cycleMonths: p.cycleMonths, dueMonth: p.dueMonth, dueDay: p.dueDay, schedule: p.schedule, variable: p.variable, archived: false, from: null, until: null }))
  ]
}

/**
 * The payments of each periodic fee before the start, as the engine and Ładownia will count them (AP-5, T345, T393 – the
 * one rule, `paymentsIndex`): a container's; a chosen proposal's – its payee's payments not linked yet from the 1st of the
 * month before the start's (T379), which the start links to it (`linkPayments`). Container id or proposal key → payments
 * by day.
 */
export function startPaidDays(
  transactions: readonly Transaction[],
  start: string,
  containers: ReadonlyArray<Pick<Container, 'id' | 'cycleMonths'>>,
  proposals: ReadonlyArray<{ key: string; label: string; cycleMonths: number }>
): Map<string, Linked[]> {
  const before = (list: readonly Linked[] | undefined): Linked[] => (list ?? []).filter((p) => p.date < start)
  const linked = paymentsIndex(transactions).byContainer
  const out = new Map<string, Linked[]>(containers.filter((c) => c.cycleMonths > 1).map((c) => [c.id, before(linked.get(c.id))] as const))
  const ids = new Set(containers.map((c) => c.id))
  for (const p of proposals) {
    if (p.cycleMonths <= 1) continue
    const found = unlinkedPayments(transactions, p.label, linkFromOf(start), ids).map((t) => ({ ...t, containerId: p.key }))
    out.set(p.key, before(paymentsIndex(found).byContainer.get(p.key)))
  }
  return out
}

/**
 * The tanks of the start's month as the engine fills them (N9, N-PC-7, AP-5): each fee's installment (`tankWant` – with
 * the money set in its tank at the start, `tanks`) and what the plan wants in the tank for the months of its cycle
 * before the start (`planAmount` – „do planu”). A cycle its payments before the start paid (`paidBeforeStart` – the
 * hold's rule, T135, T393 – `paid`) wants neither: its tank collects for the next one; a fee out of its life that month
 * neither.
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
