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

/** '2026-10-16' → '16.10' (a short date of the briefing, the notifications and the sensors). */
export const dm = (date: string): string => `${date.slice(8, 10)}.${date.slice(5, 7)}`

/** '2026-10-16' → '16.10.2026': the one way the app writes a date (AP-23) – never the ISO form. */
export const plDate = (date: string): string => `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`

const two = (n: number) => String(n).padStart(2, '0')

/** The day of a moment in the computer's time as 'RRRR-MM-DD' ('' – none): the same day `plDateTime` writes. */
export function localDay(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

/**
 * A moment (an ISO timestamp, epoch ms or a Date) as '16.10.2026, 09:05' in the computer's time – the date always with two
 * digits for the day and the month (the platform's short style writes '1.09.2025'); `seconds` adds ':28'. '—' for none.
 */
export function plDateTime(value: string | number | Date | null | undefined, seconds = false): string {
  if (value == null || value === '') return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()}, ${two(d.getHours())}:${two(d.getMinutes())}${seconds ? `:${two(d.getSeconds())}` : ''}`
}

/**
 * A number with a decimal comma and the typographic minus U+2212 (AP-23): `decimals` places (1 by default – '1,0', '52,9');
 * a value that rounds to zero has no sign ('−0,0' never shows).
 */
export function decimalText(n: number, decimals = 1): string {
  const text = Math.abs(n).toFixed(decimals)
  const negative = n < 0 && Number(text) !== 0
  return `${negative ? '−' : ''}${text.replace('.', ',')}`
}

/** '−6,2%', '52,9%', '0,0%' – a percentage with one place after the comma (T294) and the typographic minus. */
export const percentText = (n: number, decimals = 1): string => `${decimalText(n, decimals)}%`

/** '3 cele', '5 miesięcy', '1 dzień' – the number with its Polish plural form (the one helper of all texts). */
export function countLabel(n: number, one: string, few: string, many: string, fraction?: string): string {
  return `${n} ${plural(n, one, few, many, fraction)}`
}

/** „1 pensja”, „1,5 pensji”, „3 pensje” – a count of salaries (a half is allowed: the minimum of the shields). */
export const salariesText = (n: number): string => `${String(n).replace('.', ',')} ${plural(n, 'pensja', 'pensje', 'pensji', 'pensji')}`

/**
 * Polish plural form of the noun after a number: 1 → `one`, 2–4 (except 12–14) → `few`, otherwise `many`;
 * a fractional number takes `fraction` (genitive singular: "2.5 pipsa"), by default the `few` form.
 */
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
