// adapted from ICTTJ src/renderer/lib/format.ts @ 84a8339
const MINUS = '−'

export function fmtNum(v: number | null | undefined, decimals = 2): string {
  return v == null || !Number.isFinite(v) ? '—' : v.toFixed(decimals)
}

export function fmtPercent(v: number | null | undefined, decimals = 0): string {
  return v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(decimals)}%`
}

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

/** "3 cele", "5 miesięcy", "1 dzień". */
export function countLabel(n: number, one: string, few: string, many: string, fraction?: string): string {
  return `${n} ${plural(n, one, few, many, fraction)}`
}

const groupThousands = (int: string) => int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')

/**
 * A plain amount: no plus sign, thousands grouped with U+00A0, minus U+2212, never "−0.00": 1 223.50 PLN.
 * Without `currency` just the number.
 */
export function fmtAmount(v: number | null | undefined, currency?: string, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const abs = Math.abs(v).toFixed(decimals)
  const negative = v < 0 && Number(abs) !== 0
  const [int, dec] = abs.split('.')
  return `${negative ? MINUS : ''}${groupThousands(int ?? '')}${dec != null ? `.${dec}` : ''}${currency ? ` ${currency}` : ''}`
}

/** A percentage value (11 → "11.00%"), minus U+2212, never "−0.00%". */
export function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${fmtAmount(v, undefined, decimals)}%`
}

/** Percentage without trailing zeros: 50 → "50%", 46.5 → "46.5%". */
export function fmtPctShort(v: number): string {
  return `${Number(v.toFixed(2))}%`
}

/**
 * An amount in grosze as Polish złoty (decision T3: all amounts are integer grosze): thousands grouped with U+00A0,
 * a decimal comma, minus U+2212; whole złoty without the grosze part unless `decimals` is 'always' –
 * 864000 → "8 640 zł", 10333 → "103,33 zł".
 */
export function fmtPln(grosze: number | null | undefined, opts: { decimals?: 'auto' | 'always'; sign?: boolean } = {}): string {
  if (grosze == null || !Number.isFinite(grosze)) return '—'
  const g = Math.round(grosze)
  const abs = Math.abs(g)
  const zl = Math.floor(abs / 100)
  const gr = abs % 100
  const showGr = opts.decimals === 'always' || gr !== 0
  const sign = g < 0 ? MINUS : opts.sign && g > 0 ? '+' : ''
  return `${sign}${groupThousands(String(zl))}${showGr ? `,${String(gr).padStart(2, '0')}` : ''}\u00a0zł`
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

/** Tone used for amount coloring: green / red only for amounts on plus / minus. */
export function tone(v: number | null | undefined, beThreshold = 0): 'up' | 'down' | 'flat' {
  if (v == null || !Number.isFinite(v) || Math.abs(v) <= beThreshold) return 'flat'
  return v > 0 ? 'up' : 'down'
}

export const toneClass = { up: 'text-up', down: 'text-down', flat: 'text-muted' } as const

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
 * U+2212; a value beyond ±1e12 is clipped (appendix B); null = empty, undefined = invalid.
 */
export function parseAmountInput(text: string): number | null | undefined {
  const t = text.replace(/\s/g, '').replace(MINUS, '-').replace(',', '.')
  if (t === '') return null
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return undefined
  const v = Number(t)
  return Number.isFinite(v) ? Math.min(1e12, Math.max(-1e12, v)) : undefined
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

/** Parse "2026-03-16", "16.03.2026", "16.03" (current year). */
export function parseDateInput(text: string, fallbackYear = new Date().getFullYear()): string | null {
  const t = text.trim()
  let y: number
  let mo: number
  let d: number
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t)
  if (m) {
    y = Number(m[1])
    mo = Number(m[2])
    d = Number(m[3])
  } else if ((m = /^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{4}))?$/.exec(t))) {
    d = Number(m[1])
    mo = Number(m[2])
    y = m[3] ? Number(m[3]) : fallbackYear
  } else return null
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export const WEEKDAY_PL = ['', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd']

const MONTH_PL = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień']
const MONTH_PL_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']

/** '2026-10' → „październik 2026”. */
export function monthLabel(month: string): string {
  return `${MONTH_PL[Number(month.slice(5, 7)) - 1] ?? month} ${month.slice(0, 4)}`
}

/** '2026-10-17' → „17 października”. */
export function dayLabel(date: string): string {
  return `${Number(date.slice(8, 10))} ${MONTH_PL_GEN[Number(date.slice(5, 7)) - 1] ?? ''}`.trim()
}

/** '2026-10-17' → „17.10.2026”. */
export const plDate = (date: string): string => `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`
