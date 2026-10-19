/**
 * Amounts as the app writes them (the screens, the briefing, the notifications): 123456 grosze → "1 234,56" –
 * thousands with a no-break space, a decimal comma, the minus U+2212.
 */
export function formatPln(grosze: number, group = true): string {
  const abs = Math.abs(grosze)
  const zl = String(Math.floor(abs / 100))
  const int = group ? zl.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : zl
  return `${grosze < 0 ? '−' : ''}${int},${String(abs % 100).padStart(2, '0')}`
}

/**
 * Polish plural form of the noun after a number: 1 → `one`, 2–4 (except 12–14) → `few`, otherwise `many`;
 * a fractional number takes `fraction` (genitive singular: "2.5 pipsa"), by default the `few` form.
 */
/** '2026-10-16' → '16.10' (a short date of the briefing, the notifications and the sensors). */
export const dm = (date: string): string => `${date.slice(8, 10)}.${date.slice(5, 7)}`

export function plural(n: number, one: string, few: string, many: string, fraction = few): string {
  if (!Number.isFinite(n)) return many
  const abs = Math.abs(n)
  if (!Number.isInteger(abs)) return fraction
  if (abs === 1) return one
  const last = abs % 10
  const lastTwo = abs % 100
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many
}

/**
 * A range in months to one place, cut down (N56): 11,96 shows „11,9” – never the „12,0” of a class the ship has not
 * reached (the class reads the number itself). null = no range.
 */
export function rangeText(months: number | null): string {
  return months == null ? '—' : `${(Math.floor(months * 10) / 10).toFixed(1).replace('.', ',')} mies.`
}

/** What a range lacks to a threshold, cut up and at least 0,1 (N56): never „brakuje 0,0 mies.”. */
export function rangeGapText(months: number): string {
  return `${Math.max(0.1, Math.ceil(Math.round(months * 1e6) / 1e5) / 10).toFixed(1).replace('.', ',')} mies.`
}
