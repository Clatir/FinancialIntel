/** The goals' records (E5, D72): an own goal added at the end of the list, edited, archived; the list's order. */
import { byPriority, renumber } from '@shared/calc/goals'
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
    deadline: o.deadline
  })
  addRecord('goals', goal)
  return goal
}

/** An own goal changed (ICTTJ's goals follow ICTTJ – read only). */
export function patchGoal(id: string, patch: Partial<Pick<Goal, 'name' | 'target' | 'deadline' | 'note'>>): void {
  updateRecord('goals', id, (g) => (g.source === 'own' ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g))
}

export function archiveGoal(g: Goal, archived: boolean): void {
  updateRecord('goals', g.id, (r) => ({ ...r, archived, updatedAt: new Date().toISOString() }))
  if (archived)
    toast(`Cel „${g.name}” zarchiwizowany – jego środki zostają w nim, nowe już nie trafiają.`, 'info', 6000, { label: 'Cofnij', run: () => archiveGoal(g, false) })
}

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
