import type { SetupProblem } from '../../store/data'

/**
 * The setup screen tries the folder again by itself every 30 s (B109, AF-41): fi.json not readable yet, a folder there but
 * unread, FI's data without fi.json yet (OneDrive still bringing it) – and the remembered folder missing (a drive not
 * plugged in, OneDrive not there yet): once back, it opens without a click. A folder never remembered is the user's
 * choice of now – no retry.
 */
export function retriesBySelf(why: SetupProblem | null): boolean {
  const p = why?.problem
  return p === 'settings-unreadable' || p === 'unavailable' || p === 'partial' || (p === 'missing' && !!why?.remembered)
}
