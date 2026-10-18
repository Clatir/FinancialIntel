import { useMemo } from 'react'
import { addMonths, warsawNow } from '@shared/calc/dates'
import { lootDecision, monthPlanId, planFor } from '@shared/calc/plan'
import { monthPlanSchema, SCHEMA_VERSION, type MonthPlan } from '@shared/schema'
import { addRecord, updateRecord, useData } from '../../store/data'
import { toast } from '../../store/ui'

const NO_PLANS = {}

const plansOf = (map: Record<string, { record: MonthPlan }>): MonthPlan[] => Object.values(map).map((e) => e.record)

/** The month plans in memory (stable while they do not change). */
export function usePlans(): MonthPlan[] {
  const map = useData((s) => s.records.months ?? NO_PLANS)
  return useMemo(() => plansOf(map), [map])
}

const allPlans = () => plansOf(useData.getState().records.months ?? NO_PLANS)

/** A month's own plan from the plan in force (its salary and envelopes – never another month's loot decision). */
const ownPlan = (month: string, from: MonthPlan | null, now: string): MonthPlan =>
  monthPlanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: monthPlanId(month), createdAt: now, updatedAt: now, month, salary: from?.salary ?? 0, envelopes: { ...(from?.envelopes ?? {}) } })

const sameEnvelopes = (a: Record<string, number>, b: Record<string, number>) => Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v)

/**
 * Change a month's own plan. A month living on an earlier plan gets its own first – a copy of the salary and the
 * envelopes in force – so the change does not reach other months (T46); a month gone by changed, the next month living
 * on the plan in force keeps it as its own first (B11): the current month and those after never change with it.
 */
export function editPlan(month: string, fn: (p: MonthPlan) => MonthPlan): void {
  if (useData.getState().status?.readOnly) {
    toast('Folder jest tylko do odczytu – planu nie można zmienić.', 'error')
    return
  }
  const plans = allPlans()
  const now = new Date().toISOString()
  const own = plans.find((p) => p.month === month)
  const base = own ?? ownPlan(month, planFor(plans, month), now)
  const changed = fn(base)
  const next = addMonths(month, 1)
  if ((changed.salary !== base.salary || !sameEnvelopes(changed.envelopes, base.envelopes)) && month < warsawNow().month && !plans.some((p) => p.month === next)) {
    const inForce = planFor(plans, next)
    if (inForce) addRecord('months', ownPlan(next, inForce, now))
  }
  if (own) updateRecord('months', own.id, fn)
  else addRecord('months', changed)
}

export const setSalary = (month: string, salary: number) => editPlan(month, (p) => ({ ...p, salary }))

/** An envelope's monthly limit; null = the category has no envelope this month. */
export function setEnvelope(month: string, categoryId: string, limit: number | null): void {
  editPlan(month, (p) => {
    const envelopes = { ...p.envelopes }
    if (limit == null) delete envelopes[categoryId]
    else envelopes[categoryId] = limit
    return { ...p, envelopes }
  })
}

export const setEnvelopes = (month: string, envelopes: Record<string, number>) => editPlan(month, (p) => ({ ...p, envelopes: { ...p.envelopes, ...envelopes } }))

/** The loot split of `month` (D18): next month's daily envelopes and goals; the rest to the shields. */
export function decideLoot(month: string, loot: number, choice: { nextMonth: number; goals: Record<string, number> }): void {
  const decision = lootDecision(loot, choice, new Date().toISOString())
  editPlan(month, (p) => ({ ...p, loot: decision }))
}
