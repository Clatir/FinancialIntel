/** The goals' records (E5, D72): an own goal added at the end of the list, edited, archived; the list's order. */
import { byPriority, changeGoal, renumber, transferGoal } from '@shared/calc/goals'
import { newId } from '@shared/ids'
import { goalSchema, SCHEMA_VERSION, type Goal } from '@shared/schema'
import { addRecord, replaceRecords, updateRecord, useData } from '../../store/data'
import { toast } from '../../store/ui'

const goalsNow = (): Goal[] => Object.values(useData.getState().records.goals).map((e) => e.record)

export function addGoal(o: { name: string; target: number; deadline: string | null }): Goal {
  const now = new Date().toISOString()
  const goal = goalSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name: o.name.trim().slice(0, 80),
    target: o.target,
    // A new goal at the end of the list (D72).
    priority: Math.min(999, Math.max(0, ...goalsNow().map((g) => g.priority)) + 1),
    source: 'own',
    deadline: o.deadline,
    // It takes money from now on (D84 C1): what came in before stays where it went.
    activeFrom: now
  })
  addRecord('goals', goal)
  return goal
}

/** An own goal changed (ICTTJ's goals follow ICTTJ – read only); a new target counts from now on (C1). */
export function patchGoal(id: string, patch: Partial<Pick<Goal, 'name' | 'target' | 'deadline' | 'note'>>): void {
  const now = new Date().toISOString()
  updateRecord('goals', id, (g) => (g.source === 'own' ? changeGoal(g, patch, now) : g))
}

/** Where a goal's money may go: the shields or another goal (by id). */
export type GoalMoneyTarget = 'shields' | string

/**
 * Archive a goal (or bring it back): from now on it takes no more money (C1). Its money stays in it, or moves today to
 * the shields or another goal (`to` – `amount`, what it holds now, C2); „Cofnij” brings the record back as it was.
 */
export function archiveGoal(g: Goal, archived: boolean, to: { to: GoalMoneyTarget; amount: number } | null = null): void {
  const before = useData.getState().records.goals[g.id]?.record ?? g
  const now = new Date().toISOString()
  updateRecord('goals', g.id, (r) => {
    const changed = changeGoal(r, { archived }, now)
    return archived && to && to.amount > 0 ? transferGoal(changed, to.to, to.amount, now) : changed
  })
  if (archived) {
    const where = to?.to === 'shields' ? ' – jego środki wracają do osłon' : to ? ` – jego środki przechodzą do celu „${goalName(to.to)}”` : ' – jego środki zostają w nim'
    toast(`Cel „${g.name}” zarchiwizowany${where}, nowe już nie trafiają.`, 'info', 6000, { label: 'Cofnij', run: () => updateRecord('goals', g.id, () => ({ ...before, updatedAt: new Date().toISOString() })) })
  }
}

/** The money of a goal (an archived one – B30) moved out now: `amount` (what it holds) to the shields or another goal. */
export function moveGoalMoney(g: Goal, to: GoalMoneyTarget, amount: number): void {
  if (amount <= 0) return
  const before = useData.getState().records.goals[g.id]?.record ?? g
  const now = new Date().toISOString()
  updateRecord('goals', g.id, (r) => transferGoal(r, to, amount, now))
  toast(`Środki celu „${g.name}” ${to === 'shields' ? 'wracają do osłon' : `przechodzą do celu „${goalName(to)}”`}.`, 'info', 6000, {
    label: 'Cofnij',
    run: () => updateRecord('goals', g.id, () => ({ ...before, updatedAt: new Date().toISOString() }))
  })
}

const goalName = (id: string) => useData.getState().records.goals[id]?.record.name ?? 'cel'

/** One list of priorities (D72): the goal moved before `beforeId` (null = to the end); every goal numbered 1…n. */
export function moveGoal(id: string, beforeId: string | null): void {
  const list = byPriority(goalsNow().filter((g) => !g.archived))
  const moved = list.find((g) => g.id === id)
  if (!moved || id === beforeId) return
  const rest = list.filter((g) => g.id !== id)
  const at = beforeId ? rest.findIndex((g) => g.id === beforeId) : rest.length
  rest.splice(at < 0 ? rest.length : at, 0, moved)
  const changed = renumber(rest, new Date().toISOString())
  if (changed.length) replaceRecords('goals', changed)
}
