/**
 * What „Uruchom budżet” still needs (AF-14) and which step of the wizard each missing thing belongs to (UX-49): pure, so
 * the step list can mark a step with „!” without the window's store.
 */

export interface FinishInput {
  missing: readonly string[]
  salary: number | null
  overSplit: boolean
}

/** What „Uruchom budżet” still needs: only what is missing – never the whole list when the steps are filled in. */
export function finishBlockers(o: FinishInput): string[] {
  return [
    ...(o.missing.length ? [`saldo teraz (krok 1): ${o.missing.join(', ')}`] : []),
    ...(o.salary == null || o.salary <= 0 ? ['pensja (krok 3)'] : []),
    ...(o.overSplit ? ['kadłub, cele i zbiorniki w granicach środków (krok 6)'] : [])
  ]
}

/** The steps (0-based) that still miss something, each with its reason – a tick of a step means „passed”, not „correct”. */
export function blockedSteps(o: FinishInput): Map<number, string> {
  const blocked = new Map<number, string>()
  if (o.missing.length) blocked.set(0, `brak salda teraz: ${o.missing.join(', ')}`)
  if (o.salary == null || o.salary <= 0) blocked.set(2, 'brak pensji')
  if (o.overSplit) blocked.set(5, 'kadłub, cele i zbiorniki przekraczają środki')
  return blocked
}
