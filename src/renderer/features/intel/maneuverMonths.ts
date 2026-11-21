import { addMonths } from '@shared/calc/dates'

/** The months the simulator's selects offer: this month and 12 after it (the salary starts from the next one). */
export const MANEUVER_MONTHS = 12

/**
 * The maneuver's draft keeps months by name, so after the month changes (the app kept in the tray, or open over the turn
 * of the month) a stored month may fall before the first one the selects offer – a select with a value it has no option
 * for shows another month than the simulator uses (T553). Such a month moves to the nearest one offered; what was typed
 * (amounts, names) stays – a draft is never dropped by the clock. Returns the same object when nothing moves.
 */
export function rebaseManeuverMonths<T extends { salaryFrom: string; purchaseMonth: string }>(f: T, month: string): T {
  const clamp = (m: string, min: string) => {
    const max = addMonths(month, MANEUVER_MONTHS)
    return m < min ? min : m > max ? max : m
  }
  const salaryFrom = clamp(f.salaryFrom, addMonths(month, 1))
  const purchaseMonth = clamp(f.purchaseMonth, month)
  return salaryFrom === f.salaryFrom && purchaseMonth === f.purchaseMonth ? f : { ...f, salaryFrom, purchaseMonth }
}
