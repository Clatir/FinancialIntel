/**
 * The notifications due now (spec, „Powiadomienia”, D70): pure – the main window asks every minute and on opening, and
 * shows each once (`key`, remembered on this computer). Nothing during the quiet hours; the morning briefing waits for
 * the first opening of the window after them.
 */
import { briefing, dm, type BriefingInput } from './calc/briefing'
import { WATCH_TIME } from './calc/intel'
import { dayOfMonth, daysBetween, inClockWindow, monthOf, warsawNow, weekdayOf } from './calc/dates'
import type { FleetState } from './calc/fleet'
import { ICTJ_POOL_LABEL } from './ictj'
import { plural } from './format'
import type { NotifyPrefs } from './machine'
import type { Transaction } from './schema/records'

export interface Notice {
  /** Shown once per key on this computer. */
  key: string
  title: string
  body: string
  /** Where clicking it leads (App routes it). */
  tag: 'briefing' | 'evening' | 'low' | 'overrun' | 'asteroid' | 'cargo' | 'import' | 'balances' | 'debriefing' | 'dock' | 'radar' | 'reports'
  /** An alarm: its sound. */
  alarm?: boolean
  /** What exactly a click opens (a delivery: `dock:<key>`); else the tag's screen. */
  target?: string
}

/** The evening report (F13): what was written today, whether the day is done, a reminder put off on this computer. */
export interface EveningState {
  /** Today's operations typed with their time (the bank's have none). */
  written: number
  /** Confirmed without expenses, or an expense written from 18:00: no reminder. */
  done: boolean
  /** „Przypomnij za 30 min”: not before `until` (Warsaw 'HH:MM'), the n-th time today. */
  snooze: { until: string; n: number } | null
}

/** Expenses written from this hour on are the evening's report (F13). */
export const EVENING_FROM = '18:00'

/** Today's evening report (F13): the operations typed with a time, and whether the evening's writing is done. */
export function eveningState(transactions: readonly Transaction[], today: string, noSpend: Readonly<Record<string, string>>, snooze: EveningState['snooze'] = null): EveningState {
  let written = 0
  let late = false
  for (const t of transactions) {
    if (t.date !== today || t.bank) continue
    if (t.time != null) written++
    if (late || t.kind !== 'expense' || t.amount >= 0) continue
    const at = warsawNow(t.createdAt)
    late = (t.time != null && t.time >= EVENING_FROM) || (at.date === today && at.time >= EVENING_FROM)
  }
  return { written, done: !!noSpend[today] || late, snooze }
}

/** The evening reminder's text (F13). */
export function eveningText(written: number | null): string {
  if (written == null) return 'Dopisz dzisiejsze wydatki – szybki wpis albo Operacje.'
  if (written === 0) return 'Dziś nic jeszcze nie dopisano – szybki wpis albo „Dziś bez wydatków”, gdy nic nie wydano.'
  return `Dziś dopisano ${written} ${plural(written, 'operację', 'operacje', 'operacji')} z godziną – dopisz resztę albo potwierdź „Dziś bez wydatków”.`
}

export interface NotifyInput extends Omit<BriefingInput, 'fleet'> {
  fleet: FleetState
  prefs: NotifyPrefs
  quietHours: { from: string; to: string }
  /** Warsaw wall time 'HH:MM'. */
  time: string
  /** The window has just been opened (shown from the tray, started): the morning briefing's moment. */
  opened: boolean
  /** Formats an amount (the hidden amounts mask them in notifications too). */
  money: (grosze: number) => string
  /** The evening report (F13): none – the plain reminder. */
  evening?: EveningState
}

export function dueNotices(o: NotifyInput): Notice[] {
  const f = o.fleet
  if (!f.started || inClockWindow(o.time, o.quietHours.from, o.quietHours.to)) return []
  const out: Notice[] = []
  const p = o.prefs
  const today = f.today
  const items = briefing(o)
  const d = f.daily
  if (p.briefing && o.opened) {
    const alarms = items.filter((i) => i.level !== 'info').length
    out.push({
      key: `briefing:${today}`,
      tag: 'briefing',
      title: 'Odprawa poranna',
      body: [d ? `Energia dziś: ${o.money(d.left)}.` : 'Bez planu tego miesiąca.', alarms ? `Alarmy: ${alarms}.` : 'Bez alarmów.'].join(' ')
    })
  }
  // The evening report (F13): not when the day is done; put off – again from its time, under a new key.
  const ev = o.evening
  if (p.evening && o.time >= o.prefs.eveningTime && !ev?.done && (!ev?.snooze || o.time >= ev.snooze.until))
    out.push({ key: `evening:${today}${ev?.snooze ? `:${ev.snooze.n}` : ''}`, tag: 'evening', title: 'Raport wachty dnia', body: eveningText(ev ? ev.written : null) })
  // An overrun is an overrun (its own switch), never „little left”.
  if (d) {
    if (d.left < 0) {
      if (p.overrun) out.push({ key: `overrun:daily:${today}`, tag: 'overrun', alarm: true, title: 'Przydział dnia przekroczony', body: `Ponad przydział o ${o.money(-d.left)} – kolejne dni dostaną mniej.` })
    } else if (p.low && d.allowance > 0 && d.left < d.allowance * 0.2)
      out.push({ key: `low:daily:${today}`, tag: 'low', title: 'Energia dziś na wyczerpaniu', body: `Zostało ${o.money(d.left)} z ${o.money(d.allowance)}.` })
  }
  for (const e of f.envelopes) {
    if (e.limit <= 0) continue
    const name = o.label(e.categoryId)
    if (e.spent > e.limit) {
      if (p.overrun) out.push({ key: `overrun:${e.categoryId}:${f.month}`, tag: 'overrun', alarm: true, title: `Koperta ${name} przekroczona`, body: `Wydane ${o.money(e.spent)} z ${o.money(e.limit)}.` })
    } else if (p.low && e.spent > e.limit * 0.8)
      out.push({ key: `low:${e.categoryId}:${f.month}`, tag: 'low', title: `Koperta ${name} ponad 80%`, body: `Zostało ${o.money(e.limit - e.spent)} z ${o.money(e.limit)}.` })
  }
  // The briefing's asteroid keys: one within 14 days, one within 3 days of the payment.
  for (const i of items) {
    if (i.kind === 'asteroid' && p.asteroid) out.push({ key: i.key, tag: 'asteroid', title: 'Asteroida na kursie', body: i.text })
    // A fixed fee overdue (F1): once per due, its own switch.
    if (i.kind === 'cargo' && p.cargo) out.push({ key: i.key, tag: 'cargo', title: 'Kontener niezaładowany', body: i.text })
    if (i.kind === 'import' && p.importOverdue) out.push({ key: i.key, tag: 'import', title: 'Zaległy import z mBanku', body: i.text })
    // An overdue installment (once per installment), PIT-38 14 and 3 days before 30 April (D72).
    if (i.kind === 'loan' && p.loans) out.push({ key: i.key, tag: 'radar', title: 'Rata pożyczki po terminie', body: i.text })
    if (i.kind === 'pit38' && p.pit38) out.push({ key: i.key, tag: 'radar', title: 'PIT-38 na radarze', body: i.text })
    // A household member's purchases still owed after 30 days (D80 e), once per member and oldest purchase.
    if (i.kind === 'house' && p.house) out.push({ key: i.key, tag: 'radar', title: 'Rozliczenie z domownikiem', body: i.text })
  }
  // Sunday: this week's balances, unless confirmed since Monday already – each account on its own (B28).
  if (p.balances && weekdayOf(today) === 7) {
    if (o.confirmations) {
      const due = o.confirmations.filter((a) => !a.last || daysBetween(a.last, today) >= 7)
      if (due.length) out.push({ key: `balances:${today}`, tag: 'balances', title: 'Potwierdzenie sald', body: `Niedziela: porównaj z bankiem saldo – ${due.map((a) => a.name).join(', ')} (Ustawienia → Konta).` })
    } else {
      const confirmed = o.lastConfirmation ? daysBetween(o.lastConfirmation, today) : null
      if (confirmed == null || confirmed >= 7) out.push({ key: `balances:${today}`, tag: 'balances', title: 'Potwierdzenie sald', body: 'Niedziela: porównaj salda kont z bankiem (Ustawienia → Konta).' })
    }
  }
  // The debriefing of the month just closed: from the 1st, at the first look until the loot's deadline (the 7th).
  if (p.debriefing && dayOfMonth(today) <= 7 && f.start && monthOf(f.start) < f.month)
    out.push({ key: `debriefing:${f.month}`, tag: 'debriefing', title: 'Debriefing miesiąca', body: 'Miesiąc zamknięty – wynik wobec planu i podział łupów (Plan miesiąca).' })
  // The watch report (spec: on Sunday; E8): from 18:00, once a week.
  if (p.watch && weekdayOf(today) === 7 && o.time >= WATCH_TIME)
    out.push({ key: `watch:${today}`, tag: 'reports', title: 'Raport wachty', body: 'Tydzień w liczbach, killzone, koperty na następny tydzień i misja – Raporty.' })
  // A new payout in ICTTJ (spec: at once): each entry once, still to dock.
  if (p.ictj)
    for (const d of o.deliveries ?? []) {
      const e = d.entry
      if (!e || (d.state !== 'pending' && d.state !== 'waiting')) continue
      out.push(
        e.kind === 'withdrawal'
          ? { key: `ictj:${e.id}`, tag: 'dock', target: `dock:${d.key}`, title: 'Nowa wypłata w ICTTJ do zadokowania', body: `${o.money(e.amount)} · pula ${ICTJ_POOL_LABEL[e.pool]} · ${dm(e.date)}` }
          : { key: `ictj:${e.id}`, tag: 'dock', target: `dock:${d.key}`, title: 'Zwrot do masy w ICTTJ', body: `${o.money(e.amount)} – potwierdź w Financial Intel (firewall).` }
      )
    }
  return out
}
