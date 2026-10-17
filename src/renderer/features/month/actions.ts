import { useMemo } from 'react'
import { lootDecision, planFor } from '@shared/calc/plan'
import { newId } from '@shared/ids'
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

/**
 * Change a month's own plan. A month living on an earlier plan gets its own first – a copy of the salary and the
 * envelopes in force (never the earlier month's loot decision), so the change does not reach other months.
 */
export function editPlan(month: string, fn: (p: MonthPlan) => MonthPlan): void {
  if (useData.getState().status?.readOnly) {
    toast('Folder jest tylko do odczytu – planu nie można zmienić.', 'error')
    return
  }
  const plans = allPlans()
  const own = plans.find((p) => p.month === month)
  if (own) {
    updateRecord('months', own.id, fn)
    return
  }
  const from = planFor(plans, month)
  const now = new Date().toISOString()
  const base = monthPlanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: now, updatedAt: now, month, salary: from?.salary ?? 0, envelopes: { ...(from?.envelopes ?? {}) } })
  addRecord('months', fn(base))
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
