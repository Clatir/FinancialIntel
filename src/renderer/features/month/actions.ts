import { useMemo } from 'react'
import { addMonths, warsawNow } from '@shared/calc/dates'
import { lootDecision, monthPlanId, planFor } from '@shared/calc/plan'
import { copyOnMonths } from '@shared/calc/yearPlan'
import { deepEqual, sameContentAs } from '@shared/merge'
import { monthPlanSchema, SCHEMA_VERSION, type MonthPlan } from '@shared/schema'
import { addRecord, canWrite, deleteOrSay, monthTooNew, tooNewMonths, updateRecord, useData } from '../../store/data'
import { useRemote } from '../../store/remote'
import { commitActiveField, toast, undoKept } from '../../store/ui'
import { newId } from '@shared/ids'
import { plnText } from '../../components/fields'
import { monthGenLabel } from '../../lib/format'

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

/** A month's own plan as `editPlan` makes it, checked by the schema (the start wizard's – built before fi.json, T446). */
export function plannedOf(month: string, fn: (p: MonthPlan) => MonthPlan, now = new Date().toISOString()): MonthPlan {
  const plans = allPlans()
  return monthPlanSchema.parse(fn(plans.find((p) => p.month === month) ?? ownPlan(month, planFor(plans, month), now)))
}

/**
 * Change a month's own plan. A month living on an earlier plan gets its own first – a copy of the salary and the
 * envelopes in force – so the change does not reach other months (T46); a month gone by changed, the next month living
 * on the plan in force keeps it as its own first (B11): the current month and those after never change with it.
 * false = nothing written (a read-only folder, the month's file or plan of a newer version – said by the store).
 */
export function editPlan(month: string, fn: (p: MonthPlan) => MonthPlan): boolean {
  if (!canWrite()) return false
  const plans = allPlans()
  // The month's file a newer version of the app wrote, unreadable here (B67): no plan of this version made over it.
  if (!plans.some((p) => p.month === month) && monthTooNew('months', month)) return false
  const now = new Date().toISOString()
  const own = plans.find((p) => p.month === month)
  const base = own ?? ownPlan(month, planFor(plans, month), now)
  const changed = fn(base)
  const next = addMonths(month, 1)
  if ((changed.salary !== base.salary || !sameEnvelopes(changed.envelopes, base.envelopes)) && month < warsawNow().month && !plans.some((p) => p.month === next)) {
    const inForce = planFor(plans, next)
    if (inForce && !tooNewMonths(useData.getState().problems, 'months').has(next)) addRecord('months', ownPlan(next, inForce, now))
  }
  return own ? updateRecord('months', own.id, fn) : addRecord('months', changed)
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

/**
 * The month's own plan while it is still just what an action wrote (`wrote`), to the last field – none changed it here,
 * on another computer (kept by `looseObject`), by a newer version, nor waits a change of another computer for a decision
 * (as `decideLoot`, `topUpHull`). Only such a plan goes back as a whole.
 */
function asWritten(month: string, wrote: MonthPlan | undefined): MonthPlan | null {
  const own = allPlans().find((p) => p.month === month)
  if (!wrote || !own || own.id !== wrote.id) return null
  const entry = useData.getState().records.months[own.id]
  const untouched = !!entry && !entry.readOnly && sameContentAs(own, wrote) && !useRemote.getState().pending.some((p) => p.collection === 'months' && p.id === own.id)
  return untouched ? own : null
}

/**
 * „Koperty ze średnich” (UX-7): the proposed limits set in the month's plan – only those that differ (as `copyOnward`:
 * nothing to change, nothing written); the toast's `text` with „Cofnij” setting back each envelope's limit from before
 * (none – no envelope). A limit changed since stays, said (`undoKept`). A plan of its own the proposal made (a copy of the
 * plan in force – T46) goes while it is still just that, as `decideLoot`'s; changed since – it stays, with the limits from
 * before; gone meanwhile – never made anew; its deletion refused by the folder – said, and the limits from before set
 * back in it (T550). In a month gone by `editPlan` gave the next month its own copy of the plan in force (B11): it goes
 * too while it is just that and the next month, without it, follows the same salary and envelopes again (T550).
 * false = nothing written (said by the store).
 */
export function setProposedEnvelopes(month: string, limits: Record<string, number>, text: string): boolean {
  if (!canWrite()) return false
  const plans = allPlans()
  const before = planFor(plans, month)?.envelopes ?? {}
  const changed = Object.keys(limits).filter((id) => before[id] !== limits[id])
  if (!changed.length) {
    toast(`${text.replace(/\.$/, '')} – limity bez zmian.`, 'info', 4000)
    return true
  }
  const made = !plans.some((p) => p.month === month)
  const next = addMonths(month, 1)
  const nextMade = !plans.some((p) => p.month === next)
  if (!setEnvelopes(month, Object.fromEntries(changed.map((id) => [id, limits[id]!])))) return false
  // The plan as the proposal made it (its own copy of the plan in force): the whole file goes back only while it is that.
  const wrote = made ? allPlans().find((p) => p.month === month) : undefined
  // The next month's copy the same `editPlan` made (a month gone by – B11).
  const wroteNext = nextMade ? allPlans().find((p) => p.month === next) : undefined
  const limitsBack = (back: readonly string[]) =>
    back.length > 0 &&
    editPlan(month, (p) => {
      const envelopes = { ...p.envelopes }
      for (const id of back) {
        const was = before[id]
        if (was == null) delete envelopes[id]
        else envelopes[id] = was
      }
      return { ...p, envelopes }
    })
  // The next month's copy goes only when, without it, the month follows the same salary and envelopes (the month gone by
  // changed since – its new salary would reach the next month, B11): never a change of the next month by „Cofnij”.
  const nextBack = () => {
    const copy = asWritten(next, wroteNext)
    if (!copy) return
    const inForce = planFor(allPlans().filter((p) => p.month !== next), next)
    if (inForce && inForce.salary === copy.salary && sameEnvelopes(inForce.envelopes, copy.envelopes)) void deleteOrSay('months', copy.id)
  }
  toast(text, 'success', 8000, {
    label: 'Cofnij',
    run: () => {
      if (!canWrite()) return
      const own = allPlans().find((p) => p.month === month)
      // The plan it made gone meanwhile (another computer): nothing to take back – never a plan made anew (T46 would pin
      // the month to a copy).
      if (made && !own) return
      const now = planFor(allPlans(), month)?.envelopes ?? {}
      const back = changed.filter((id) => now[id] === limits[id])
      // Gone, as it came – only when nothing changed it since, to the last field.
      const untouched = asWritten(month, wrote)
      if (untouched)
        void deleteOrSay('months', untouched.id).then((gone) => {
          // Refused (the file held by another program – said by `deleteOrSay`): the plan is back – its limits from before.
          if (!gone) limitsBack(back)
          nextBack()
        })
      else {
        limitsBack(back)
        nextBack()
      }
      undoKept(back.length, changed.length - back.length, 'koperty')
    }
  })
  return true
}

/**
 * A category archived (N8): its envelope leaves the plan of this month and of the months after – it would still count
 * in the plan's sums and today's energy, unseen on the form. The months gone by keep it (their debriefing). Returns the
 * envelopes taken off (month → limit), to give back with „Cofnij”.
 */
export function dropEnvelope(categoryId: string): Map<string, number> {
  const taken = new Map<string, number>()
  if (!canWrite()) return taken
  const current = warsawNow().month
  const plans = allPlans()
  const inForce = planFor(plans, current)
  const limit = inForce?.envelopes[categoryId]
  if (limit != null) {
    taken.set(current, limit)
    setEnvelope(current, categoryId, null)
  }
  for (const p of plans)
    if (p.month > current && p.envelopes[categoryId] != null) {
      taken.set(p.month, p.envelopes[categoryId]!)
      setEnvelope(p.month, categoryId, null)
    }
  return taken
}

/** The envelopes `dropEnvelope` took off, back in their months (a month that has it again meanwhile keeps its own). */
export function restoreEnvelope(categoryId: string, taken: ReadonlyMap<string, number>): void {
  const plans = allPlans()
  for (const [month, limit] of taken) if (planFor(plans, month)?.envelopes[categoryId] == null) setEnvelope(month, categoryId, limit)
}

/**
 * The loot's split in one line (UX-8): in the engine's order – the goals, the planned envelopes kept, the next month –
 * each only when it takes something; the rest to the shields always.
 */
export function lootSplitText(split: { goals: number; envelopes: number; nextMonth: number; shields: number }): string {
  const parts: Array<[number, string]> = [
    [split.goals, 'cele'],
    [split.envelopes, 'zapas kopert'],
    [split.nextMonth, 'następny miesiąc']
  ]
  return [...parts.filter(([v]) => v > 0), [split.shields, 'osłony'] as [number, string]].map(([v, what]) => `${plnText(v)} zł → ${what}`).join(' · ')
}

const sum = (r: Record<string, number> | undefined) => Object.values(r ?? {}).reduce((a, b) => a + b, 0)

/**
 * The loot split of `month` (D18): next month's daily envelopes and goals; the rest to the shields. „Cofnij” (UX-8) gives
 * the month's plan back as it was before – its decision from before (none, or the one changed); a plan of its own the
 * decision made (a copy of the plan in force – T46) goes while it is still just that (as „Dopełnij kadłub”). A decision
 * changed since stays, said (`undoKept`). `onUndo` – after a decision taken back (the screen's draft of the split back).
 * false = nothing written (no toast).
 */
export function decideLoot(month: string, loot: number, choice: { nextMonth: number; goals: Record<string, number>; envelopes?: Record<string, number> }, onUndo?: () => void): boolean {
  if (!canWrite()) return false
  const decision = lootDecision(loot, choice, new Date().toISOString())
  const before = allPlans().find((p) => p.month === month)
  const was = before?.loot ?? null
  if (!editPlan(month, (p) => ({ ...p, loot: decision }))) return false
  // The plan as the decision made it (its own copy of the plan in force): the whole file goes back only while it is that.
  const wrote = before ? undefined : allPlans().find((p) => p.month === month)
  const text = lootSplitText({ goals: sum(decision.goals), envelopes: sum(decision.envelopes), nextMonth: decision.nextMonth, shields: decision.shields })
  toast(`Podział łupów zatwierdzony: ${text}.`, 'success', 8000, {
    label: 'Cofnij',
    run: () => {
      if (!canWrite()) return
      const own = allPlans().find((p) => p.month === month)
      // The plan gone meanwhile (another computer): nothing to take back – never a plan made anew (T46 would pin the
      // month to a copy). Its decision as before already (taken back there) – nothing either; another one – it stays.
      if (!own) return
      if (!deepEqual(own.loot, decision)) return deepEqual(own.loot, was) ? undefined : undoKept(0, 1)
      const back = () => editPlan(month, (p) => ({ ...p, loot: was }))
      // Gone, as it came – only when nothing changed it since, to the last field (as `topUpHull`, przegląd 2 N3). Its
      // deletion refused (said by `deleteOrSay`): the decision taken back in the plan that stays (T550). The screen's draft
      // back only once the decision is gone.
      const untouched = asWritten(month, wrote)
      if (untouched)
        return void deleteOrSay('months', untouched.id).then((gone) => {
          if (gone || back()) onUndo?.()
        })
      if (back()) onUndo?.()
    }
  })
  return true
}

/**
 * „Pokryj z koperty…” (F28, D73): `amount` of this month's limit moved from the envelope `from` to the overrun `to` –
 * two changes of the plan at once, in the watch's log; the game rates the day by the limits before it. „Cofnij” takes
 * the cover back.
 */
export function coverEnvelope(month: string, from: string, to: string, amount: number, names: { from: string; to: string }): void {
  if (!canWrite() || amount <= 0 || from === to) return
  const id = newId()
  editPlan(month, (p) => ({ ...p, envelopeCovers: [...(p.envelopeCovers ?? []), { id, from, to, amount, at: new Date().toISOString() }] }))
  toast(`Koperta ${names.to} pokryta z ${names.from}: ${plnText(amount)} zł limitu.`, 'success', 6000, {
    label: 'Cofnij',
    run: () => editPlan(month, (p) => ({ ...p, envelopeCovers: (p.envelopeCovers ?? []).filter((c) => c.id !== id) }))
  })
}

/**
 * „Dopełnij kadłub z osłon” (AP-17, D99 pkt 6 – T373): `amount` (what the hull lacks, at most the shields' surplus over
 * their target) moved now – an entry of this month's plan the engine counts at its moment; „Cofnij” takes it back, and
 * the month's own plan it made (a copy of the plan in force – T46) while that plan is still just what the top-up wrote:
 * the month follows the earlier plan again. false = nothing written (no toast of success).
 */
export function topUpHull(amount: number): boolean {
  if (!canWrite() || amount <= 0) return false
  const id = newId()
  const month = warsawNow().month
  const made = !allPlans().some((p) => p.month === month)
  if (!editPlan(month, (p) => ({ ...p, hullTopUps: [...(p.hullTopUps ?? []), { id, amount, at: new Date().toISOString() }] }))) return false
  // The plan as the top-up made it (its own copy of the plan in force): the whole file goes back only while it is that.
  const wrote = made ? allPlans().find((p) => p.month === month) : undefined
  toast(`Kadłub dopełniony z osłon: ${plnText(amount)} zł.`, 'success', 8000, {
    label: 'Cofnij',
    run: () => {
      if (!canWrite()) return
      const own = allPlans().find((p) => p.month === month)
      // Nothing to take back – the month's plan gone meanwhile (another computer, the month back on the plan in force) or
      // the entry no longer in it: never a plan made anew (przegląd 3 N3 – T46 would pin the month to a copy).
      if (!own || !(own.hullTopUps ?? []).some((u) => u.id === id)) return
      const back = () => editPlan(month, (p) => ({ ...p, hullTopUps: (p.hullTopUps ?? []).filter((u) => u.id !== id) }))
      // Gone, as it came – only when nothing changed it since, to the last field (przegląd 2 N3): one from another
      // computer or a newer version (kept by `looseObject`), an edit here, a change of another computer waiting for a
      // decision. Anything else – the entry only, the file stays; so too when the folder refused the deletion (said by
      // `deleteOrSay`, T550).
      const untouched = asWritten(month, wrote)
      if (untouched)
        void deleteOrSay('months', untouched.id).then((gone) => {
          if (!gone) back()
        })
      else back()
    }
  })
  return true
}

/**
 * „Kopiuj dalej” in the year's plan (F37): the row's value of `month` set in it and in each later month of the year with
 * its own plan – the months without one take it from the last earlier plan anyway. „Cofnij” sets back each month's value
 * from before (a month that got its own plan keeps it, with the old value).
 */
export function copyOnward(month: string, rowId: string, label: string): void {
  // The value typed in the cell and not left yet (on the iPhone a tap on „»” keeps the field's focus – T311): saved first,
  // the month's value read after it.
  commitActiveField()
  if (!canWrite()) return
  const plans = allPlans()
  const months = copyOnMonths(month.slice(0, 4), month, plans).filter((m) => m >= warsawNow().month && !monthTooNew('months', m))
  const valueOf = (p: MonthPlan | null) => (rowId === 'salary' ? (p?.salary ?? 0) : (p?.envelopes[rowId] ?? null))
  const value = valueOf(planFor(plans, month))
  const before = new Map(months.map((m) => [m, valueOf(planFor(plans, m))]))
  const set = (m: string, v: number | null) => (rowId === 'salary' ? setSalary(m, v ?? 0) : setEnvelope(m, rowId, v))
  for (const m of months) if (before.get(m) !== value) set(m, value)
  const changed = months.filter((m) => before.get(m) !== value)
  if (!changed.length) return
  toast(`${label}: ${value == null ? 'bez koperty' : `${plnText(value)} zł`} od ${monthGenLabel(month)} do końca roku.`, 'success', 6000, {
    label: 'Cofnij',
    run: () => {
      for (const m of changed) set(m, before.get(m) ?? null)
    }
  })
}
