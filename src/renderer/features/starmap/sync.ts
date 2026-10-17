/**
 * The goals of the chosen ICTTJ scenario kept as the ship's records (`shared/calc/goals.ts`): followed on every change
 * of the ICTTJ folder or of the choice, in the main window only, never in a read-only folder.
 */
import { useEffect } from 'react'
import { syncIctjGoals } from '@shared/calc/goals'
import { chosenForecast } from '@shared/ictj'
import { addRecords, replaceRecords, useData } from '../../store/data'
import { useIctj } from '../../store/ictj'

export function useIctjGoalSync(): void {
  const snap = useIctj((s) => s.snap)
  const forecastId = useData((s) => s.fi?.settings.ictj.forecastId ?? null)
  const goals = useData((s) => s.records.goals)
  const ready = useData((s) => s.phase === 'ready' && !s.status?.readOnly)
  useEffect(() => {
    if (!ready || snap.status !== 'ok') return
    const list = Object.values(goals).map((e) => e.record)
    const { add, update } = syncIctjGoals(chosenForecast(snap.forecasts, forecastId), list, new Date().toISOString())
    if (add.length) addRecords('goals', add)
    if (update.length) replaceRecords('goals', update)
  }, [snap, forecastId, goals, ready])
}
