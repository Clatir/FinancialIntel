/**
 * The notifications due now (spec, „Powiadomienia”, D70): pure – the main window asks every minute and on opening, and
 * shows each once (`key`, remembered on this computer). Nothing during the quiet hours; the morning briefing waits for
 * the first opening of the window after them – or its hour, when one is set (D99 pkt 7) – and comes before the others
 * (AP-16): until then the day's other notices wait, at most to `BRIEFING_HOLD_UNTIL`.
 */
import { briefing, dm, type BriefingInput } from './calc/briefing'
import { WATCH_TIME } from './calc/intel'
import { addDays, dayOfMonth, daysBetween, inClockWindow, monthOf, WARSAW, warsawNow, weekdayOf } from './calc/dates'
import { envelopeOverrun, SERIOUS_ENVELOPE_PCT, type FleetState } from './calc/fleet'
import { DateTime } from 'luxon'
import { CAP_REASON } from './calc/why'
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
  tag: 'briefing' | 'evening' | 'low' | 'overrun' | 'asteroid' | 'cargo' | 'import' | 'balances' | 'debriefing' | 'dock' | 'radar' | 'reports' | 'year' | 'operations'
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

/**
 * When the evening reminder comes (N104): its hour – or, when that falls in the quiet hours (nothing is shown then, and
 * after them it is another day), the minute before they start.
 */
export function eveningAt(eveningTime: string, quietHours: { from: string; to: string }): string {
  if (!inClockWindow(eveningTime, quietHours.from, quietHours.to)) return eveningTime
  const [h, m] = quietHours.from.split(':').map(Number) as [number, number]
  const before = (h * 60 + m + 24 * 60 - 1) % (24 * 60)
  return `${String(Math.floor(before / 60)).padStart(2, '0')}:${String(before % 60).padStart(2, '0')}`
}

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
  /** The game's serious overrun threshold (N102, `settings.game.seriousEnvelopePct`); none – the default 20%. */
  seriousPct?: number
  /** Today's briefing shown already on this computer (its key remembered): the other notices no longer wait for it. */
  briefingShown?: boolean
}

/**
 * The day's other notices wait for the morning briefing (AP-16, RY sp. 4) at most until this hour – a window never opened
 * all morning gets them then, the briefing still at its opening.
 */
export const BRIEFING_HOLD_UNTIL = '09:00'
/** With its hour set (D99 pkt 7) they wait for it – never past noon (a briefing set for the evening holds nothing back). */
export const BRIEFING_HOLD_MAX = '12:00'

/**
 * When the morning briefing comes on its own (D99 pkt 7): its hour – or the end of the quiet hours, when the hour falls in
 * them; null – at the first opening of the window after the quiet hours (the default, T56).
 */
export function briefingAt(briefingTime: string | null, quietHours: { from: string; to: string }): string | null {
  if (!briefingTime) return null
  return inClockWindow(briefingTime, quietHours.from, quietHours.to) ? quietHours.to : briefingTime
}

export function dueNotices(o: NotifyInput): Notice[] {
  const f = o.fleet
  if (!f.started || inClockWindow(o.time, o.quietHours.from, o.quietHours.to)) return []
  const out: Notice[] = []
  const p = o.prefs
  const today = f.today
  const items = briefing(o)
  const d = f.daily
  // The briefing at its hour, when one is set (D99 pkt 7) – else at the first opening after the quiet hours (T56).
  const at = briefingAt(p.briefingTime, o.quietHours)
  const briefingDue = p.briefing && (at ? o.time >= at : o.opened)
  if (briefingDue) {
    const alarms = items.filter((i) => i.level !== 'info').length
    out.push({
      key: `briefing:${today}`,
      tag: 'briefing',
      title: 'Odprawa poranna',
      body: [d ? `Energia dziś: ${o.money(d.energy)}.` : 'Bez planu tego miesiąca.', alarms ? `Alarmy: ${alarms}.` : 'Bez alarmów.'].join(' ')
    })
  }
  // The briefing first (AP-16, RY sp. 4): not shown yet today and not due now – the others wait for it (to its hour, at
  // most noon; to `BRIEFING_HOLD_UNTIL` when it waits for the window's opening).
  const hold = at ? (at < BRIEFING_HOLD_MAX ? at : BRIEFING_HOLD_MAX) : BRIEFING_HOLD_UNTIL
  if (p.briefing && !briefingDue && !o.briefingShown && o.time < hold) return []
  // The evening report (F13): not when the day is done; put off – again from its time, under a new key.
  const ev = o.evening
  if (p.evening && o.time >= eveningAt(o.prefs.eveningTime, o.quietHours) && !ev?.done && (!ev?.snooze || o.time >= ev.snooze.until))
    out.push({ key: `evening:${today}${ev?.snooze ? `:${ev.snooze.n}` : ''}`, tag: 'evening', title: 'Raport wachty dnia', body: eveningText(ev ? ev.written : null) })
  // An overrun is an overrun (its own switch), never „little left”.
  if (d) {
    if (d.left < 0) {
      if (p.overrun) out.push({ key: `overrun:daily:${today}`, tag: 'overrun', alarm: true, title: 'Przydział dnia przekroczony', body: `Ponad przydział o ${o.money(-d.left)} – kolejne dni dostaną mniej.` })
    } else if (p.low && d.allowance > 0 && d.energy < d.allowance * 0.2)
      // Low because the month's energy is (AP-13, T371): its reason beside.
      out.push({ key: `low:daily:${today}`, tag: 'low', title: 'Energia dziś na wyczerpaniu', body: `Zostało ${o.money(d.energy)} z ${o.money(d.allowance)}${d.cap ? ` – ${CAP_REASON[d.cap.why]}` : ''}.` })
  }
  for (const e of f.envelopes) {
    const name = o.label(e.categoryId)
    // The engine's and the game's rule (N102): a limit of 0 too.
    const overrun = envelopeOverrun(e, o.seriousPct ?? SERIOUS_ENVELOPE_PCT)
    if (overrun.over) {
      // A daily envelope gently – its overrun is no alarm, the daily pool decides (D16).
      if (p.overrun)
        out.push(
          e.kind === 'daily'
            ? { key: `overrun:${e.categoryId}:${f.month}`, tag: 'overrun', title: `Koperta ${name} ponad podział`, body: `Wydane ${o.money(e.spent)} z ${o.money(e.limit)} – liczy się pula dzienna (energia dziś).` }
            : {
                key: `overrun:${e.categoryId}:${f.month}`,
                tag: 'overrun',
                alarm: true,
                title: `Koperta ${name} przekroczona`,
                body: `Wydane ${o.money(e.spent)} z ${o.money(e.limit)}${overrun.serious ? ' – ponad próg poważnego naruszenia' : ''}.`
              }
        )
    } else if (p.low && e.limit > 0 && e.spent > e.limit * 0.8)
      out.push({ key: `low:${e.categoryId}:${f.month}`, tag: 'low', title: `Koperta ${name} ponad 80%`, body: `Zostało ${o.money(e.limit - e.spent)} z ${o.money(e.limit)}.` })
  }
  // The briefing's asteroid keys: one within 14 days, one within 3 days of the payment.
  for (const i of items) {
    if (i.kind === 'asteroid' && p.asteroid) out.push({ key: i.key, tag: 'asteroid', title: 'Asteroida na kursie', body: i.text })
    // A fixed fee overdue (F1): once per due, its own switch.
    if (i.kind === 'cargo' && p.cargo) out.push({ key: i.key, tag: 'cargo', title: 'Kontener niezaładowany', body: i.text })
    // A new file of mBank (F14): its click opens it in Import – the watching has its own switch.
    if (i.kind === 'import' && i.key.startsWith('bankfile:')) out.push({ key: i.key, tag: 'import', title: 'Nowy meldunek z mBanku', body: i.text, target: `bankfile:${i.key.split(':')[1]}` })
    else if (i.kind === 'import' && p.importOverdue) out.push({ key: i.key, tag: 'import', title: 'Zaległy import z mBanku', body: i.text })
    // An overdue installment (once per installment), PIT-38 14 and 3 days before 30 April (D72).
    if (i.kind === 'loan' && p.loans) out.push({ key: i.key, tag: 'radar', title: 'Rata pożyczki po terminie', body: i.text })
    if (i.kind === 'pit38' && p.pit38) out.push({ key: i.key, tag: 'radar', title: 'PIT-38 na radarze', body: i.text })
    // A household member's purchases still owed after 30 days (D80 e), once per member and oldest purchase.
    if (i.kind === 'house' && p.house) out.push({ key: i.key, tag: 'radar', title: 'Rozliczenie z domownikiem', body: i.text })
    // A planned operation's reminders and a late one, a container's end (F16); an account short before a payment (F26).
    if (i.kind === 'plan' && p.plans) out.push({ key: i.key, tag: 'radar', title: i.text.startsWith('Termin') ? 'Termin na radarze' : 'Boja na kursie', body: i.text })
    if (i.kind === 'end' && p.plans) out.push({ key: i.key, tag: 'radar', title: 'Koniec kontenera', body: i.text })
    if (i.kind === 'account' && p.accounts) out.push({ key: i.key, tag: 'radar', alarm: true, title: 'Za mało na koncie przed płatnością', body: i.text })
    // An unknown signal (F31) – its operation; a return late (F34) – once per its day.
    if (i.kind === 'anomaly' && p.anomalies) out.push({ key: i.key, tag: 'operations', title: 'Nieznany sygnał na radarze', body: i.text, target: i.key })
    if (i.kind === 'return' && p.returns) out.push({ key: i.key, tag: 'operations', title: 'Zwrot nie dotarł', body: i.text, target: `return:${i.key.split(':')[1]}` })
    // The cargo hold's watch (F9, F23): a new price, a container gone quiet, a fee new in the history – each once.
    if (p.cargoWatch && (i.kind === 'price' || i.kind === 'dead' || i.kind === 'recurring'))
      out.push({ key: i.key, tag: 'cargo', title: i.kind === 'price' ? (i.text.startsWith('Kontener cięższy') ? 'Kontener cięższy niż w manifeście' : 'Kontener lżejszy niż w manifeście') : i.kind === 'dead' ? 'Kontener bez płatności' : 'Nowa opłata w historii', body: i.text })
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
  // The year's review (spec „Rytuały”: in January – AP-24, RY.25): once, for the year just closed, when the budget ran in it.
  const year = Number(today.slice(0, 4)) - 1
  if (p.yearReview && today.slice(5, 7) === '01' && f.start && f.start <= `${year}-12-31`)
    out.push({ key: `year:${year}`, tag: 'year', title: 'Przegląd roczny', body: `Rok ${year} zamknięty – koszty, przychody, bilans paliwa, cele i osiągnięcia roku (Raporty → Przegląd roczny).` })
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
          : {
              key: `ictj:${e.id}`,
              tag: 'dock',
              target: `dock:${d.key}`,
              title: 'Zwrot do masy w ICTTJ',
              // The pool „Podatek” comes back from the reserve – no firewall there (T65, N43).
              body: e.pool === 'tax' ? `${o.money(e.amount)} z puli Podatek – wraca z rezerwy na PIT-38; potwierdź w Financial Intel.` : `${o.money(e.amount)} – potwierdź w Financial Intel (firewall).`
            }
      )
    }
  return out
}

/** This many notices at once come as one (AP-16, US sp. 1): at the start there were 10 of them. */
export const BUNDLE_FROM = 3

/**
 * The notices due at once, as shown (AP-16): the briefing first; from `BUNDLE_FROM` of them one notification – the
 * briefing with the others named in its body, or „Powiadomienia (N)” – its click leads to the bridge, an alarm's sound
 * if any of them has one. Each key stays its own (remembered once – never shown again apart).
 */
export function bundleNotices(fresh: readonly Notice[]): Notice[] {
  const ordered = [...fresh].sort((a, b) => Number(b.tag === 'briefing') - Number(a.tag === 'briefing'))
  if (ordered.length < BUNDLE_FROM) return ordered
  const head = ordered[0]!.tag === 'briefing' ? ordered[0]! : null
  const others = head ? ordered.slice(1) : ordered
  // The same title once, with its count: „Nowa wypłata w ICTTJ do zadokowania (5)”.
  const titles = new Map<string, number>()
  for (const n of others) titles.set(n.title, (titles.get(n.title) ?? 0) + 1)
  const named = [...titles].map(([t, n]) => (n > 1 ? `${t} (${n})` : t)).join(', ')
  const alarm = ordered.some((n) => n.alarm)
  const more = `${others.length} ${plural(others.length, 'inne powiadomienie', 'inne powiadomienia', 'innych powiadomień')}`
  return [
    head
      ? { key: head.key, tag: 'briefing', title: head.title, body: `${head.body} Do tego ${more}: ${named} – Mostek.`, ...(alarm ? { alarm } : {}) }
      : { key: 'bundle', tag: 'briefing', title: `Powiadomienia (${others.length})`, body: `${named} – Mostek.`, ...(alarm ? { alarm } : {}) }
  ]
}

/**
 * A touch of the window is the morning's opening (AF-67, T56): its touch before was before today's quiet hours ended
 * (yesterday's, before their end today) – the window left on screen through the night goes to the bridge. Without quiet
 * hours – never.
 */
export function morningTouch(prevTouch: number, now: { date: string; time: string }, quiet: { from: string; to: string }): boolean {
  if (quiet.from === quiet.to) return false
  const day = now.time >= quiet.to ? now.date : addDays(now.date, -1)
  return prevTouch < DateTime.fromISO(`${day}T${quiet.to}`, { zone: WARSAW }).toMillis()
}
