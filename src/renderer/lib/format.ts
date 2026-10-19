// adapted from ICTTJ src/renderer/lib/format.ts @ 84a8339
import { addDays, warsawNow } from '@shared/calc/dates'
import { plural } from '@shared/format'
const MINUS = '−'

/** Polish plural form of the noun after a number (in `shared/format.ts` – the notifications and the inbox use it too). */
export { plural }

/** "3 cele", "5 miesięcy", "1 dzień". */
export function countLabel(n: number, one: string, few: string, many: string, fraction?: string): string {
  return `${n} ${plural(n, one, few, many, fraction)}`
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

/** Parse user-typed numbers: accepts comma or dot, spaces. Returns undefined when invalid. */
export function parseNumberInput(text: string): number | null | undefined {
  // Minus "-" or U+2212 (shown by the forecast fields).
  const t = text.trim().replace(/\s/g, '').replace(MINUS, '-').replace(',', '.')
  if (t === '') return null
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

/**
 * An amount typed or shown with grouped thousands: spaces (also U+00A0) ignored, comma or dot, minus "-" or
 * U+2212; a value beyond ±1e12 is clipped (appendix B); null = empty, undefined = invalid. Counted when typed as a sum
 * (F7): „12,50+8,30”, „3*4,99”, „100-15” – multiplying and dividing first, the result to the grosz. Two decimals at
 * most (B68): „1.200” is no 1,20 zł – a dot of thousands is never guessed, the amount is refused.
 */
export function parseAmountInput(text: string): number | null | undefined {
  const t = text.replace(/\s/g, '').replaceAll(MINUS, '-')
  if (t === '') return null
  const plain = t.replace(',', '.')
  if (/^[-+]?(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(plain)) {
    const v = Number(plain)
    return Number.isFinite(v) ? Math.min(1e12, Math.max(-1e12, v)) : undefined
  }
  const v = sumOf(t.replaceAll(',', '.'))
  return v === undefined || !Number.isFinite(v) ? undefined : Math.min(1e12, Math.max(-1e12, Math.round(v * 100) / 100))
}

/** „12.5+8*2-1” (no brackets): multiplying and dividing first, left to right; undefined = not such a sum. */
function sumOf(t: string): number | undefined {
  const parts = /^[-+]?(\d+(\.\d{0,2})?|\.\d{1,2})([-+*/:](\d+(\.\d{0,2})?|\.\d{1,2}))*$/.exec(t)
  if (!parts) return undefined
  const tokens = t.match(/^[-+]|\d+(?:\.\d{0,2})?|\.\d{1,2}|[-+*/:]/g) ?? []
  let i = 0
  let sign = 1
  if (tokens[0] === '-' || tokens[0] === '+') sign = tokens[i++] === '-' ? -1 : 1
  let total = 0
  let term = sign * Number(tokens[i++])
  while (i < tokens.length) {
    const op = tokens[i++]!
    const v = Number(tokens[i++])
    if (op === '*') term *= v
    else if (op === '/' || op === ':') {
      if (v === 0) return undefined
      term /= v
    } else {
      total += term
      term = op === '-' ? -v : v
    }
  }
  return total + term
}

/** Parse "330", "3:30", "03.30", "0330" → "03:30". */
export function parseClockInput(text: string): string | null {
  const t = text.trim().replace(/[.,;h ]/g, ':')
  let h: number
  let m: number
  const colon = /^(\d{1,2}):(\d{1,2})$/.exec(t)
  if (colon) {
    h = Number(colon[1])
    m = Number(colon[2])
  } else if (/^\d{3,4}$/.test(t)) {
    h = Number(t.slice(0, t.length - 2))
    m = Number(t.slice(-2))
  } else if (/^\d{1,2}$/.test(t)) {
    h = Number(t)
    m = 0
  } else return null
  if (h > 23 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 'RRRR-MM-DD' of a real day; null = no such day (31.02, 29.02 of a common year). */
function isoDay(y: number, mo: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const dayMs = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))

/** Days typed by word (F7): today, yesterday, the day before. */
const DAY_WORDS: Record<string, number> = { dziś: 0, dzis: 0, dzisiaj: 0, wczoraj: -1, wcz: -1, przedwczoraj: -2 }

/**
 * Parse "2026-03-16", "16.03.2026", "16.03" (the fallback year). `notAfter` (an operation's date – B12): "16.03" without
 * a year is the day nearest to `near` (the field's date: 02.01 typed on an operation of 30.12 is the January after) and
 * never more than a week after `notAfter` – 28.12 typed on 3 January is the December gone by. A later day needs its year.
 * Also by word (F7): „dziś”, „wczoraj” („wcz”), „przedwczoraj”, „-3” (days before `today`).
 */
export function parseDateInput(text: string, fallbackYear = new Date().getFullYear(), notAfter?: string, near?: string, today = warsawNow().date): string | null {
  const t = text.trim()
  const key = t.toLowerCase()
  if (Object.hasOwn(DAY_WORDS, key)) return addDays(today, DAY_WORDS[key]!)
  const back = /^-(\d{1,3})$/.exec(t)
  if (back) return addDays(today, -Number(back[1]))
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t)
  if (m) return isoDay(Number(m[1]), Number(m[2]), Number(m[3]))
  if (!(m = /^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{4}))?$/.exec(t))) return null
  const d = Number(m[1])
  const mo = Number(m[2])
  if (m[3] || !notAfter) return isoDay(m[3] ? Number(m[3]) : fallbackYear, mo, d)
  const ref = near && /^\d{4}-\d{2}-\d{2}$/.test(near) ? near : notAfter
  const base = Number(ref.slice(0, 4))
  const days = [base - 1, base, base + 1].map((y) => isoDay(y, mo, d)).filter((x): x is string => x != null)
  if (!days.length) return null
  const limit = addDays(notAfter, 7)
  const allowed = days.filter((x) => x <= limit)
  // Nearest first; a tie goes to the earlier day. Only a day that exists nowhere before the limit (29.02) stays later.
  const pool = allowed.length ? allowed : days
  return pool.reduce((best, x) => (Math.abs(dayMs(x) - dayMs(ref)) < Math.abs(dayMs(best) - dayMs(ref)) ? x : best))
}

/** Parse a month: "2027-03", "2027-3", "03.2027", "3/2027"; '' = none (null); undefined = not a month. */
export function parseMonthInput(text: string): string | null | undefined {
  const t = text.trim()
  if (!t) return null
  let y: number
  let mo: number
  let m = /^(\d{4})[-./](\d{1,2})$/.exec(t)
  if (m) {
    y = Number(m[1])
    mo = Number(m[2])
  } else if ((m = /^(\d{1,2})[-./](\d{4})$/.exec(t))) {
    mo = Number(m[1])
    y = Number(m[2])
  } else return undefined
  if (mo < 1 || mo > 12 || y < 1900 || y > 2999) return undefined
  return `${y}-${String(mo).padStart(2, '0')}`
}

export const WEEKDAY_PL = ['', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd']

const MONTH_PL = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień']
const MONTH_PL_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']

/** '2026-10' → „październik 2026”. */
export function monthLabel(month: string): string {
  return `${MONTH_PL[Number(month.slice(5, 7)) - 1] ?? month} ${month.slice(0, 4)}`
}

/** '2026-10' → „października 2026” (after „od”, „do”). */
export function monthGenLabel(month: string): string {
  return `${MONTH_PL_GEN[Number(month.slice(5, 7)) - 1] ?? month} ${month.slice(0, 4)}`
}

/** '2026-10-17' → „17 października”. */
export function dayLabel(date: string): string {
  return `${Number(date.slice(8, 10))} ${MONTH_PL_GEN[Number(date.slice(5, 7)) - 1] ?? ''}`.trim()
}

/** '2026-10-17' → „17.10.2026”. */
export const plDate = (date: string): string => `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`
