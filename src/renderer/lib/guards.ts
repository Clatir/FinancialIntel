/**
 * Small checks whose refusal or correction is always said (AP-15: nothing changes silently). Pure.
 */

/** The two ends of a range, in order: a „from” after the „to” (or the other way round) swaps them. */
export function orderRange<T extends number | string>(from: T | null, to: T | null): { from: T | null; to: T | null; swapped: boolean } {
  if (from != null && to != null && from > to) return { from: to, to: from, swapped: true }
  return { from, to, swapped: false }
}

/** The message of a swapped range („od” after „do”), `shown` formats an end. */
export function swappedText(what: string, from: string, to: string): string {
  return `„Od” było po „do” – ${what} zamienione: ${from} – ${to}.`
}
