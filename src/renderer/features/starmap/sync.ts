/**
 * The goals of the chosen ICTTJ scenario kept as the ship's records (`shared/calc/goals.ts`): followed on every change
 * of the ICTTJ folder or of the choice, in the main window only, never in a read-only folder. With no scenario chosen
 * yet, the one changed last in ICTTJ is chosen once and kept (D84 C3).
 */
import { useEffect } from 'react'
import { syncIctjGoals } from '@shared/calc/goals'
import { chosenForecast } from '@shared/ictj'
import { addRecords, replaceRecords, updateSettings, useData, writesInBackground } from '../../store/data'
import { useIctj } from '../../store/ictj'
import { usePresence } from '../../store/presence'

export function useIctjGoalSync(): void {
  const snap = useIctj((s) => s.snap)
  const forecastId = useData((s) => s.fi?.settings.ictj.forecastId ?? null)
  const goals = useData((s) => s.records.goals)
  // A computer only in the tray writes nothing in the background (D86).
  const inUse = usePresence((s) => s.inUse)
  const ready = useData(writesInBackground) && inUse
  useEffect(() => {
    // Checked again as it runs (T301): changes being written since the render hold it.
    if (!ready || snap.status !== 'ok' || !writesInBackground(useData.getState())) return
    const chosen = chosenForecast(snap.forecasts, forecastId)
    // The scenario is remembered the first time (D84 C3): editing another one in ICTTJ never switches the goals.
    if (!forecastId && chosen)
      updateSettings((f) => (f.settings.ictj.forecastId ? f : { ...f, settings: { ...f.settings, ictj: { ...f.settings.ictj, forecastId: chosen.id } } }), { background: true })
    const list = Object.values(goals).map((e) => e.record)
    const { add, update } = syncIctjGoals(chosen, list, new Date().toISOString())
    if (add.length) addRecords('goals', add)
    if (update.length) replaceRecords('goals', update)
  }, [snap, forecastId, goals, ready])
}
