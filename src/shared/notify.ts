/**
 * The notifications due now (spec, „Powiadomienia”, D70): pure – the main window asks every minute and on opening, and
 * shows each once (`key`, remembered on this computer). Nothing during the quiet hours; the morning briefing waits for
 * the first opening of the window after them.
 */
import { briefing, dm, type BriefingInput } from './calc/briefing'
import { dayOfMonth, daysBetween, inClockWindow, monthOf, weekdayOf } from './calc/dates'
import type { FleetState } from './calc/fleet'
import { ICTJ_POOL_LABEL } from './ictj'
import type { NotifyPrefs } from './machine'

export interface Notice {
  /** Shown once per key on this computer. */
  key: string
  title: string
  body: string
  /** Where clicking it leads (App routes it). */
  tag: 'briefing' | 'evening' | 'low' | 'overrun' | 'asteroid' | 'import' | 'balances' | 'debriefing' | 'dock'
  /** An alarm: its sound. */
  alarm?: boolean
  /** What exactly a click opens (a delivery: `dock:<key>`); else the tag's screen. */
  target?: string
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
  if (p.evening && o.time >= o.prefs.eveningTime)
    out.push({ key: `evening:${today}`, tag: 'evening', title: 'Raport wachty dnia', body: 'Dopisz dzisiejsze wydatki – szybki wpis albo Operacje.' })
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
    if (i.kind === 'import' && p.importOverdue) out.push({ key: i.key, tag: 'import', title: 'Zaległy import z mBanku', body: i.text })
  }
  // Sunday: this week's balances, unless confirmed since Monday already.
  const confirmed = o.lastConfirmation ? daysBetween(o.lastConfirmation, today) : null
  if (p.balances && weekdayOf(today) === 7 && (confirmed == null || confirmed >= 7))
    out.push({ key: `balances:${today}`, tag: 'balances', title: 'Potwierdzenie sald', body: 'Niedziela: porównaj salda kont z bankiem (Ustawienia → Konta).' })
  // The debriefing of the month just closed: from the 1st, at the first look until the loot's deadline (the 7th).
  if (p.debriefing && dayOfMonth(today) <= 7 && f.start && monthOf(f.start) < f.month)
    out.push({ key: `debriefing:${f.month}`, tag: 'debriefing', title: 'Debriefing miesiąca', body: 'Miesiąc zamknięty – wynik wobec planu i podział łupów (Plan miesiąca).' })
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
