// Kwoty w groszach (T3): podział w dół z resztą w ostatniej części, zapis „1 234,56 zł”.

/** Kwota w groszach → „1 234,56 zł” (spacja jako separator tysięcy, minus ASCII). */
export function zl(g) {
  if (g == null || Number.isNaN(g)) return null
  const neg = g < 0
  const a = Math.abs(Math.round(g))
  const zlote = Math.floor(a / 100)
  const gr = String(a % 100).padStart(2, '0')
  const txt = String(zlote).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${neg ? '-' : ''}${txt},${gr} zł`
}

/** { gr, zl } – para do JSON. */
export const kw = (g) => (g == null ? { gr: null, zl: null } : { gr: g, zl: zl(g) })

/** Podział kwoty na n części: części w dół, reszta w ostatniej (T3). */
export function splitEvenly(total, n) {
  if (n <= 0) return []
  const base = Math.floor(total / n)
  const parts = Array(n).fill(base)
  parts[n - 1] = total - base * (n - 1)
  return parts
}

/** Liczba z jednym miejscem po przecinku, obcięta w dół (T218). */
export const trunc1 = (x) => (x == null ? null : Math.floor(x * 10 + 1e-9) / 10)
/** Liczba z jednym miejscem po przecinku, zaokrąglona (wariant przykładu ze specyfikacji). */
export const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10)

export const sum = (xs) => xs.reduce((a, b) => a + b, 0)

export function median(xs) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
