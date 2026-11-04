/**
 * The planned operations and terms ahead (1.8.0, F16 – „Boje nawigacyjne”): each one's days (once, or every year), and
 * what is still ahead of the budget – an operation of the bank matched to a day (the amount and ±3 days, as the import
 * joins a hand entry: `looseMatch` – and a similar name, T378), or one made from it („Wykonaj teraz”), or a day ticked
 * off closes it. A day past for more than `LAPSE_DAYS` without either lapses: a yearly one waits for its next year. Pure.
 */
import type { Scheduled, Transaction } from '../schema/records'
import { fold } from '../fold'
import { counterpartyKey } from '../import/names'
import { looseMatch, MATCH_DAYS } from '../import/reconcile'
import { addDays, daysBetween, daysInMonth } from './dates'

/** A day past this long without an operation drops off the radar (a yearly one comes again a year later). */
export const LAPSE_DAYS = 30

/** The kinds an operation of a planned one can be: never a transfer between own accounts or a correction. */
const MATCHABLE = new Set<Transaction['kind']>(['expense', 'income', 'loan', 'trading', 'tax'])

/** The day of a yearly one in `year` (29 February – the 28th in the other years). */
export function dayInYear(date: string, year: number): string {
  const y = String(year).padStart(4, '0')
  const month = `${y}-${date.slice(5, 7)}`
  return `${month}-${String(Math.min(Number(date.slice(8, 10)), daysInMonth(month))).padStart(2, '0')}`
}

/** Its days from `from` to `to` (both included), in order: the one day, or each year's from its first. */
export function occurrences(s: Pick<Scheduled, 'date' | 'yearly'>, from: string, to: string): string[] {
  if (!s.yearly) return s.date >= from && s.date <= to ? [s.date] : []
  const out: string[] = []
  for (let y = Math.max(Number(s.date.slice(0, 4)), Number(from.slice(0, 4))); y <= Number(to.slice(0, 4)); y++) {
    const d = dayInYear(s.date, y)
    if (d >= from && d <= to) out.push(d)
  }
  return out
}

export type DayState = 'ahead' | 'today' | 'late' | 'done' | 'lapsed'

export interface ScheduledDay {
  scheduled: Scheduled
  date: string
  state: DayState
  /** The operation that did it: made from it, or the bank's matched to it (`matched`); null = none (ticked off, open). */
  txId: string | null
  /** Done by an operation found by its amount and day – not made from it (the user may say „to nie ta”). */
  matched: boolean
  /** Days from today to it (< 0 – past). */
  days: number
}

/** Words of the bank's rows that tell no payee (a payment, a transfer, a month of its title) – no match by them. */
const OPERATION_WORDS = new Set(
  (
    'zakup zakupy platnosc platnosci przelew przelewu przelewy oplata oplaty wplata wyplata faktura faktury rachunek rachunku ' +
    'zamowienie zamowienia transakcja karta karty blik polska sklep spolka styczen stycznia luty lutego marzec marca kwiecien ' +
    'kwietnia czerwiec czerwca lipiec lipca sierpien sierpnia wrzesien wrzesnia pazdziernik pazdziernika listopad listopada ' +
    'grudzien grudnia'
  ).split(' ')
)
const wordsOf = (s: string): string[] => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !OPERATION_WORDS.has(w) && !/^\d+$/.test(w))
/** One word the same, or its first 5 letters („komina” – KOMINIARZ): a buoy's name told in the operation's (T378). */
const sameWord = (a: string, b: string) => a === b || (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5))
function sharesWord(own: readonly string[], theirs: readonly string[]): boolean {
  const ours = own.flatMap(wordsOf)
  return theirs.flatMap(wordsOf).some((w) => ours.some((o) => sameWord(o, w)))
}

/**
 * Each list of operations by day and its ids, once per list (the radar, the briefing and the course read the same one):
 * a match looks at 7 days, never the whole history.
 */
const indexMemo = new WeakMap<readonly Transaction[], { byDay: Map<string, Transaction[]>; ids: Set<string> }>()
function indexOf(transactions: readonly Transaction[]): { byDay: Map<string, Transaction[]>; ids: Set<string> } {
  let out = indexMemo.get(transactions)
  if (out) return out
  out = { byDay: new Map(), ids: new Set() }
  for (const t of transactions) {
    out.ids.add(t.id)
    const list = out.byDay.get(t.date)
    if (list) list.push(t)
    else out.byDay.set(t.date, [t])
  }
  indexMemo.set(transactions, out)
  return out
}

/**
 * The days of the planned ones from `from` to `to` with their state on `today`: done – an operation made from it (that
 * still exists) or ticked off (''), or an operation matched to it (once each – a day's operation never does two days;
 * one written ahead too – the accounts' forecast counts it, never the buoy again); else ahead, today, late (past, up to
 * `LAPSE_DAYS`) or lapsed. A term without an amount is never matched.
 */
export function scheduledDays(list: readonly Scheduled[], transactions: readonly Transaction[], today: string, from: string, to: string): ScheduledDay[] {
  return daysOf(list, usedOf(list), transactions, today, from, to)
}

/** The operations the buoys' days were made from or ticked with: never matched to another one. */
function usedOf(list: readonly Scheduled[]): Set<string> {
  const used = new Set<string>()
  for (const s of list) for (const v of Object.values(s.done)) if (v) used.add(v)
  return used
}

/**
 * `scheduledDays` of the buoys `list` with the operations `made` of all of them (`usedOf` – a buoy without a day in the
 * window still keeps its operation from the others): the days in [from, to] come only from those in `list`.
 */
function daysOf(list: readonly Scheduled[], made: ReadonlySet<string>, transactions: readonly Transaction[], today: string, from: string, to: string): ScheduledDay[] {
  const { byDay: index, ids } = indexOf(transactions)
  const used = new Set(made)
  const out: ScheduledDay[] = []
  // A one-off is done by any of its days (its day moved after it was done still is).
  const doneOf = (s: Scheduled, date: string): string | null | undefined => {
    if (!s.yearly) {
      const v = Object.values(s.done)
      const made = v.find((x) => x && ids.has(x))
      return made ?? (v.includes('') ? null : undefined)
    }
    const v = s.done[date]
    return v === undefined ? undefined : v === '' ? null : ids.has(v) ? v : undefined
  }
  const pending: ScheduledDay[] = []
  for (const s of list)
    for (const date of occurrences(s, from, to)) {
      const days = daysBetween(today, date)
      const done = doneOf(s, date)
      if (done !== undefined) {
        out.push({ scheduled: s, date, state: 'done', txId: done, matched: false, days })
        continue
      }
      const day: ScheduledDay = { scheduled: s, date, state: days > 0 ? 'ahead' : days === 0 ? 'today' : -days > LAPSE_DAYS ? 'lapsed' : 'late', txId: null, matched: false, days }
      out.push(day)
      // Every day with an amount: its operation within ±3 days – the bank's, or one written ahead.
      if (s.amount != null) pending.push(day)
    }
  // The bank's operations by the amount and the day (±3), the closest first: one operation – one day.
  for (const day of pending.sort((a, b) => a.date.localeCompare(b.date) || a.scheduled.id.localeCompare(b.scheduled.id))) {
    const s = day.scheduled
    const own = { amount: s.amount!, date: day.date, counterparty: s.counterparty || s.name }
    let best: { t: Transaction; rank: number } | null = null
    for (let d = -MATCH_DAYS; d <= MATCH_DAYS; d++)
      for (const t of index.get(addDays(day.date, d)) ?? []) {
        if (used.has(t.id) || !MATCHABLE.has(t.kind) || s.notMatched.includes(t.id) || (s.accountId && t.accountId !== s.accountId)) continue
        const name = t.counterparty || t.title
        const m = looseMatch(own, { amount: t.amount, date: t.date, name })
        // Its name too (RA sp. 1, T378): the amount alone never closes a buoy with an operation of another name (ZALANDO
        // is no „Przegląd komina”) – a similar name, or a word of the buoy's in the operation's („Serwis auta” – AUTO
        // SERWIS KOWALSKI); one without a name (written by hand, ahead: the forecast counts it once – T282) by its amount.
        const named = !!counterpartyKey(name) && !!counterpartyKey(own.counterparty)
        if (!m || (named ? !m.similar && !(m.exact && sharesWord([s.name, s.counterparty], [t.counterparty, t.title])) : !m.exact)) continue
        // A similar name before the exact amount alone, then the closer day.
        const rank = (m.strong ? 0 : named ? 10 : 20) + m.days
        if (!best || rank < best.rank || (rank === best.rank && t.id < best.t.id)) best = { t, rank }
      }
    if (!best) continue
    used.add(best.t.id)
    day.state = 'done'
    day.txId = best.t.id
    day.matched = true
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.scheduled.name.localeCompare(b.scheduled.name) || a.scheduled.id.localeCompare(b.scheduled.id))
}

/** How far ahead the days are looked at for the reminders: the radar's window, or the longest reminder (up to a year). */
export const remindReach = (list: readonly Pick<Scheduled, 'remind'>[], base: number): number => Math.max(base, ...list.flatMap((s) => s.remind))

/** The days still to happen or late (not done, not lapsed) – what the radar, the briefing and the forecasts read. */
export const openDays = (days: readonly ScheduledDay[]): ScheduledDay[] => days.filter((d) => d.state === 'ahead' || d.state === 'today' || d.state === 'late')

/** The window the screens look at: the late days (`LAPSE_DAYS` back) and `ahead` days on. */
export function scheduledWindow(list: readonly Scheduled[], transactions: readonly Transaction[], today: string, ahead: number): ScheduledDay[] {
  return scheduledDays(list, transactions, today, addDays(today, -LAPSE_DAYS - MATCH_DAYS), addDays(today, ahead))
}

/**
 * The reminder a day is in (its `remind` days before it): the smallest number of days before its day that today is
 * within – 14 and 3 make two reminders, the second within 3 days; null = not yet (or no reminders).
 */
export function remindStep(s: Pick<Scheduled, 'remind'>, days: number): number | null {
  if (days < 0) return null
  const fit = s.remind.filter((r) => days <= r).sort((a, b) => a - b)
  return fit.length ? fit[0]! : null
}

export type PastState = 'done' | 'late' | 'lapsed'

/** The state of `s` among the days of `near` around its own day (`pastStateOf`); `made` – the operations of all buoys. */
function pastAmong(s: Scheduled, near: readonly Scheduled[], made: ReadonlySet<string>, transactions: readonly Transaction[], today: string): PastState | null {
  const state = daysOf(near, made, transactions, today, addDays(s.date, -2 * MATCH_DAYS), addDays(s.date, 2 * MATCH_DAYS)).find((d) => d.scheduled.id === s.id)?.state
  return state === 'done' || state === 'late' || state === 'lapsed' ? state : null
}

/**
 * A one-off whose day is past (RA sp. 4 – „Pozostałe boje”, T378): done (an operation made from it or matched, ticked
 * off) or lapsed – its day more than `LAPSE_DAYS` past without one, off the radar; null – not past (or a yearly one).
 * `list` – all the buoys: an operation made from another one, or matched to another one's day around it first (the
 * radar's order – one operation, one day), is never its. One of `list` – from `pastStates` (once per list).
 */
export function pastStateOf(s: Scheduled, transactions: readonly Transaction[], today: string, list: readonly Scheduled[]): PastState | null {
  if (s.yearly || s.date >= today) return null
  if (list.includes(s)) return pastStates(list, transactions, today).get(s.id) ?? null
  // The days that compete for its operations (±3 days of them): within twice the match's days of its own.
  const all = [...list.filter((x) => x.id !== s.id), s]
  return pastAmong(s, all, usedOf(all), transactions, today)
}

const pastMemo = new WeakMap<readonly Scheduled[], { transactions: readonly Transaction[]; today: string; states: Map<string, PastState> }>()

/**
 * Each one-off of `list` whose day is past with its state (`pastStateOf`) – once per list of the buoys, of the operations
 * and the day (the panel „Pozostałe boje” asks for each at every render – przegląd 2 N3). The same days as each one's
 * own count: the buoys with a day within twice the match's days of its day (found by their days, not all of them each
 * time), the operations made from any buoy kept from them all.
 */
export function pastStates(list: readonly Scheduled[], transactions: readonly Transaction[], today: string): ReadonlyMap<string, PastState> {
  const known = pastMemo.get(list)
  if (known && known.transactions === transactions && known.today === today) return known.states
  const made = usedOf(list)
  const once = list.filter((s) => !s.yearly).sort((a, b) => a.date.localeCompare(b.date))
  const yearly = list.filter((s) => s.yearly)
  const states = new Map<string, PastState>()
  // The first one-off on or after `date` (binary search over their days).
  const firstFrom = (date: string) => {
    let lo = 0
    let hi = once.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (once[mid]!.date < date) lo = mid + 1
      else hi = mid
    }
    return lo
  }
  for (const s of once) {
    if (s.date >= today) break
    const from = addDays(s.date, -2 * MATCH_DAYS)
    const to = addDays(s.date, 2 * MATCH_DAYS)
    const near: Scheduled[] = []
    for (let i = firstFrom(from); i < once.length && once[i]!.date <= to; i++) near.push(once[i]!)
    for (const y of yearly) if (occurrences(y, from, to).length) near.push(y)
    const state = pastAmong(s, near, made, transactions, today)
    if (state) states.set(s.id, state)
  }
  pastMemo.set(list, { transactions, today, states })
  return states
}

/** The next day of a planned one from `today` on (its next year's for a yearly one); null = a one-off past. */
export function nextDayOf(s: Pick<Scheduled, 'date' | 'yearly'>, today: string): string | null {
  if (!s.yearly) return s.date >= today ? s.date : null
  for (let y = Number(today.slice(0, 4)); ; y++) {
    const d = dayInYear(s.date, y)
    if (d >= today && d >= s.date) return d
  }
}
