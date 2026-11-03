// Daty wyroczni (AU-9): kalendarz warszawski, polskie święta (T164), dni robocze, tygodnie ISO.
// Napisane od zera z wymagań – bez kodu aplikacji.

export const DAY_MS = 86_400_000

/** 'RRRR-MM-DD' → liczba dni od epoki (dzień kalendarzowy, bez strefy). */
export function dayNum(s) {
  const [y, m, d] = s.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

export function fromDayNum(n) {
  return new Date(n * DAY_MS).toISOString().slice(0, 10)
}

export const addDays = (s, n) => fromDayNum(dayNum(s) + n)
/** b − a w dniach. */
export const diffDays = (a, b) => dayNum(b) - dayNum(a)
export const monthOf = (s) => s.slice(0, 7)
export const dayOfMonth = (s) => Number(s.slice(8, 10))

export function addMonths(m, n) {
  let [y, mo] = m.split('-').map(Number)
  const t = y * 12 + (mo - 1) + n
  y = Math.floor(t / 12)
  mo = (t % 12) + 1
  return `${y}-${String(mo).padStart(2, '0')}`
}

/** b − a w miesiącach. */
export function monthDiff(a, b) {
  const [ya, ma] = a.split('-').map(Number)
  const [yb, mb] = b.split('-').map(Number)
  return (yb - ya) * 12 + (mb - ma)
}

export function daysInMonth(m) {
  const [y, mo] = m.split('-').map(Number)
  return new Date(Date.UTC(y, mo, 0)).getUTCDate()
}

export const firstOfMonth = (m) => `${m}-01`
export const lastOfMonth = (m) => `${m}-${String(daysInMonth(m)).padStart(2, '0')}`

/** 1 = poniedziałek … 7 = niedziela. */
export function weekday(s) {
  const w = new Date(dayNum(s) * DAY_MS).getUTCDay()
  return w === 0 ? 7 : w
}

/** Tydzień ISO 'RRRR-Www'. */
export function isoWeek(s) {
  const n = dayNum(s)
  const wd = weekday(s)
  const thursday = n - wd + 4
  const y = new Date(thursday * DAY_MS).getUTCFullYear()
  const jan1 = dayNum(`${y}-01-01`)
  const week = Math.floor((thursday - jan1) / 7) + 1
  return `${y}-W${String(week).padStart(2, '0')}`
}

export const mondayOf = (s) => addDays(s, 1 - weekday(s))

// ------------------------------------------------------------------ Warszawa

const WARSAW = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Warsaw',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
})

/** Chwila UTC (ms albo ISO) → data i godzina w Warszawie. */
export function toWarsaw(t) {
  const ms = typeof t === 'number' ? t : Date.parse(t)
  const p = Object.fromEntries(WARSAW.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, second: p.second }
}

/** Data i godzina w Warszawie → chwila UTC w ms (DST rozwiązywany przez Intl). */
export function fromWarsaw(date, time = '00:00') {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const naive = Date.UTC(y, mo - 1, d, h, mi)
  let guess = naive - 60 * 60_000
  for (let i = 0; i < 3; i++) {
    const w = toWarsaw(guess)
    const [wy, wmo, wd] = w.date.split('-').map(Number)
    const [wh, wmi] = w.time.split(':').map(Number)
    const local = Date.UTC(wy, wmo - 1, wd, wh, wmi)
    guess += naive - local
  }
  return guess
}

export const warsawDayStart = (date) => fromWarsaw(date, '00:00')

// ------------------------------------------------------------------ święta i dni robocze (T164)

function easter(y) {
  // Anonimowy algorytm gregoriański
  const a = y % 19
  const b = Math.floor(y / 100)
  const c = y % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const holidayCache = new Map()
export function polishHolidays(y) {
  if (holidayCache.has(y)) return holidayCache.get(y)
  const fixed = ['01-01', '01-06', '05-01', '05-03', '08-15', '11-01', '11-11', '12-25', '12-26']
  if (y >= 2025) fixed.push('12-24')
  const set = new Set(fixed.map((md) => `${y}-${md}`))
  const e = easter(y)
  set.add(e) // Wielkanoc
  set.add(addDays(e, 1)) // poniedziałek wielkanocny
  set.add(addDays(e, 49)) // Zielone Świątki
  set.add(addDays(e, 60)) // Boże Ciało
  holidayCache.set(y, set)
  return set
}

export const isPolishHoliday = (s) => polishHolidays(Number(s.slice(0, 4))).has(s)
export const isWorkingDay = (s) => weekday(s) <= 5 && !isPolishHoliday(s)

/** N-ty dzień roboczy po dniu s (s nie wliczany). */
export function addWorkingDays(s, n) {
  let d = s
  let left = n
  while (left > 0) {
    d = addDays(d, 1)
    if (isWorkingDay(d)) left--
  }
  return d
}
