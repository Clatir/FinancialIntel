/**
 * The morning briefing (spec, „Rytuały” – odprawa; „Mostek”): the Daily Bias, today's energy and the alerts – the
 * engine's alarms of this month, the asteroids (periodic fees) within 14 days, an overdue import, the balances to
 * confirm, the loot waiting for a decision. Pure; the bridge, the notifications and the spoken briefing use it.
 */
import { DateTime } from 'luxon'
import { formatPln } from '../format'
import { ICTJ_POOL_LABEL } from '../ictj'
import type { HouseholdMember } from '../schema/budget'
import type { Container } from '../schema/records'
import { daysBetween, firstDayOf, warsawNow } from './dates'
import type { Delivery } from './dock'
import { isOpeningItem, memberName } from './household'
import { HOUSE_DAYS } from './loans'
import { pit38Deadline } from './radar'
import { activeIn, nextPaymentOf, nextUnpaidOf, type Alarm, type FleetState } from './fleet'

/** The Daily Bias (spec, „Wywiad”): Bullish – today's energy at least the base allowance and the envelopes on plan;
 * Bearish – the energy under half the base or the shields under their minimum; else Neutral. */
export type DailyBias = 'bullish' | 'bearish' | 'neutral'

export function dailyBias(f: Pick<FleetState, 'daily' | 'envelopes' | 'shields' | 'started'>): DailyBias | null {
  if (!f.daily || !f.started) return null
  const base = f.daily.base
  const belowMin = f.shields.min != null && f.shields.amount < f.shields.min
  if (f.daily.left < base / 2 || belowMin) return 'bearish'
  if (f.daily.left >= base && f.envelopes.every((e) => e.spent <= e.limit)) return 'bullish'
  return 'neutral'
}

export const BIAS_LABEL: Record<DailyBias, string> = { bullish: 'Bullish', bearish: 'Bearish', neutral: 'Neutral' }

export interface BriefingItem {
  level: 'red' | 'yellow' | 'info'
  /** What the item is about (the screen it leads to; 'dock' – the docking window of the delivery in `key`). */
  kind: 'alarm' | 'asteroid' | 'import' | 'balances' | 'loot' | 'start' | 'dock' | 'ictj' | 'loan' | 'pit38' | 'house' | 'mission'
  text: string
  /** Stable key (the notifications send each once). */
  key: string
}

const zlotych = (grosze: number) => `${formatPln(grosze)} zł`

/** One line of an alarm of the engine (`money` formats the amounts – the hidden amounts mask them). */
export function alarmText(a: Alarm, label: (id: string) => string = () => '', zl: (grosze: number) => string = zlotych): string {
  switch (a.kind) {
    case 'salary-from-hull':
      return `Pensja z kadłuba: ${zl(a.amount)} (za mało w osłonach).`
    case 'salary-partial':
      return `Pensja częściowa: brakuje ${zl(a.amount)} – osłony i kadłub puste.`
    case 'energy-exhausted':
      return `Energia wyczerpana: ${zl(a.amount)} ponad pensję poszło z osłon.`
    case 'firewall':
      return `Firewall: dopłata do XTB ${zl(a.amount)} wbrew rozkazowi.`
    case 'sinking-short':
      return `Za mało w zbiorniku ${a.ref ? label(a.ref) : ''}: ${zl(a.amount)} z energii.`.replace('  ', ' ')
    case 'deficit':
      return `Deficyt: osłony poniżej zera o ${zl(a.amount)}.`
    case 'shields-below-min':
      return `Osłony poniżej minimum o ${zl(a.amount)}.`
    case 'correction':
      return `Rozbieżność w ładowni: korekta ${zl(a.amount)} do wyjaśnienia.`
    case 'daily-over':
      return `Przydział dnia przekroczony o ${zl(a.amount)}.`
    case 'envelope-over':
      return `Koperta ${a.ref ? label(a.ref) : ''} ponad limit o ${zl(a.amount)}.`.replace('  ', ' ')
    case 'cargo-over':
      return 'Masa ładunku ponad linią zanurzenia.'
    case 'salary-above-income':
      return `Pensja wyższa niż średnie wpływy z 6 mies. o ${zl(a.amount)} – osłony będą się kurczyć.`
  }
}

export { nextPaymentOf }

export interface BriefingInput {
  fleet: FleetState
  containers: readonly Container[]
  /** Accounts with the mBank import and their last import (ISO time; null = never). */
  imports: ReadonlyArray<{ name: string; last: string | null }>
  /** The last confirmed balance date of the budget's accounts (null = never). */
  lastConfirmation: string | null
  /** Names of categories and containers. */
  label: (id: string) => string
  /** Formats an amount with its currency (default '1 240,00 zł'; the hidden amounts mask them). */
  money?: (grosze: number) => string
  /** Deliveries from the trading account (`calc/dock.ts`, E5). */
  deliveries?: readonly Delivery[]
  /** The ICTTJ folder chosen on this computer cannot be read: why. */
  ictjProblem?: string | null
  /** This week's mission of the command (E7): its title and what to do. */
  mission?: { week: string; title: string; text: string } | null
  /** The household (D80): the members' names, whom their money comes through (D81). */
  members?: ReadonlyArray<Pick<HouseholdMember, 'id' | 'name'> & { via?: string | null }>
}

/** Silver Bullet (D73): the briefing opened between 10:00 and 11:00 New York time comes short. */
export function silverBullet(now: Date | string = new Date()): boolean {
  const dt = (typeof now === 'string' ? DateTime.fromISO(now) : DateTime.fromJSDate(now)).setZone('America/New_York')
  return dt.isValid && dt.hour === 10
}

/** PIT-38 is announced from 14 days before its deadline (like an asteroid). */
export const PIT38_DAYS = 14

/** An XTB inflow without its ICTTJ entry is recalled this long. */
export const MISSING_ENTRY_DAYS = 30

/** '2026-10-16' → '16.10' (the briefing's and the notifications' short date). */
export const dm = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}`

/** The line of a delivery in the briefing (null = nothing to say). */
function deliveryItem(d: Delivery, today: string, zl: (grosze: number) => string): BriefingItem | null {
  const e = d.entry
  if (d.state === 'pending') {
    const text = e
      ? e.kind === 'withdrawal'
        ? d.wallet
          ? `Wypłata z ICTTJ ${zl(d.amount)} (${dm(d.date)}, pula ${ICTJ_POOL_LABEL[e.pool]}) bez pary w mBanku – zadokuj na Portfelu XTB albo poczekaj na import.`
          : `Wypłata z ICTTJ ${zl(d.amount)} (pula ${ICTJ_POOL_LABEL[e.pool]}) do zadokowania.`
        : `Zwrot do masy z ICTTJ ${zl(d.amount)} (${dm(d.date)}) do potwierdzenia – firewall.`
      : `Wpływ z XTB ${zl(d.amount)} (${dm(d.date)}) do zadokowania${d.missingEntry ? ' – dopisz wypłatę w ICTTJ' : ''}.`
    return { level: 'yellow', kind: 'dock', key: `dock:${d.key}`, text }
  }
  const what = e?.kind === 'return' ? 'Zwrot do masy' : 'Wypłata'
  if (d.state === 'waiting' && e) return { level: 'info', kind: 'dock', key: `dock:${d.key}`, text: `${what} z ICTTJ ${zl(d.amount)} (${dm(d.date)}) czeka na import z mBanku.` }
  if (d.state === 'docked' && d.mismatch) return { level: 'yellow', kind: 'dock', key: `dock:${d.key}`, text: `${what} w ICTTJ z ${dm(d.date)} ma inną kwotę niż operacja w banku – sprawdź wpis w ICTTJ.` }
  if (d.state === 'docked' && d.missingEntry && daysBetween(d.date, today) <= MISSING_ENTRY_DAYS)
    return { level: 'info', kind: 'ictj', key: `ictj:${d.key}`, text: `Wpływ z XTB ${zl(d.amount)} z ${dm(d.date)} bez wpisu w ICTTJ – dopisz wypłatę w ICTTJ.` }
  return null
}

/** Days after which an import is overdue, and a balance confirmation is due (spec, „Powiadomienia”). */
export const IMPORT_DUE_DAYS = 3
export const BALANCES_DUE_DAYS = 7
/** The asteroids are announced from 14 days before. */
export const ASTEROID_DAYS = 14

export function briefing(o: BriefingInput): BriefingItem[] {
  const f = o.fleet
  const zl = o.money ?? zlotych
  const items: BriefingItem[] = []
  if (!f.started) {
    items.push({ level: 'info', kind: 'start', key: 'start', text: 'Budżet jeszcze nie wystartował – kreator startu ustawi salda, pensję i warstwy.' })
    return items
  }
  const from = firstDayOf(f.month)
  // The alarms of this month (the state ones are dated today); one line per kind and subject.
  const alarms = [...f.alarms].filter((a) => a.date >= from).sort((a, b) => Number(b.level === 'red') - Number(a.level === 'red'))
  const summed = new Map<string, Alarm>()
  for (const a of alarms) {
    const key = `${a.kind}:${a.ref ?? ''}${a.kind === 'correction' ? `:${a.txId}` : ''}`
    const prev = summed.get(key)
    if (prev && (a.kind === 'energy-exhausted' || a.kind === 'sinking-short')) summed.set(key, { ...prev, amount: prev.amount + a.amount })
    else if (!prev) summed.set(key, a)
  }
  for (const [key, a] of summed) {
    items.push({ level: a.level, kind: 'alarm', key: `alarm:${key}:${f.month}`, text: alarmText(a, o.label, zl) })
  }
  for (const c of o.containers) {
    if (c.cycleMonths <= 1) continue
    const tankOf = f.tanks.find((t) => t.containerId === c.id)
    // The next payment still to make (a cycle paid early has none – B55), of the container's life (`from` – `until`).
    const date = nextUnpaidOf(c, f.today, tankOf?.paidDue)
    if (!activeIn(c, date.slice(0, 7))) continue
    const days = daysBetween(f.today, date)
    if (days < 0 || days > ASTEROID_DAYS) continue
    const tank = tankOf?.amount ?? 0
    items.push({
      level: days <= 3 ? 'yellow' : 'info',
      kind: 'asteroid',
      key: `asteroid:${c.id}:${date}:${days <= 3 ? 3 : 14}`,
      text: `Asteroida: ${c.name} ${days === 0 ? 'dziś' : `za ${days} ${days === 1 ? 'dzień' : 'dni'}`} – ${zl(c.amount)}, w zbiorniku ${zl(tank)}.`
    })
  }
  for (const imp of o.imports) {
    // The import's Warsaw date (stored as an ISO time in UTC).
    const days = imp.last ? daysBetween(warsawNow(imp.last).date, f.today) : null
    if (days != null && days <= IMPORT_DUE_DAYS) continue
    items.push({ level: 'info', kind: 'import', key: `import:${imp.name}:${f.today}`, text: days == null ? `${imp.name}: jeszcze bez importu z banku.` : `${imp.name}: ostatni import ${days} dni temu – zaimportuj nowy plik.` })
  }
  const confirmed = o.lastConfirmation ? daysBetween(o.lastConfirmation, f.today) : null
  if (confirmed == null || confirmed > BALANCES_DUE_DAYS)
    items.push({ level: 'info', kind: 'balances', key: `balances:${f.today}`, text: confirmed == null ? 'Potwierdź salda kont z bankiem (raz w tygodniu).' : `Salda potwierdzone ${confirmed} dni temu – sprawdź z bankiem.` })
  if (f.loot.month && f.loot.amount > 0)
    items.push({ level: 'yellow', kind: 'loot', key: `loot:${f.loot.month}`, text: `Łupy z poprzedniego miesiąca: ${zl(f.loot.amount)} – podział do 7. dnia, potem trafią do osłon.` })
  for (const d of o.deliveries ?? []) {
    const item = deliveryItem(d, f.today, zl)
    if (item) items.push(item)
  }
  if (o.ictjProblem) items.push({ level: 'info', kind: 'ictj', key: `ictj:folder:${f.today}`, text: `ICTTJ: ${o.ictjProblem}` })
  for (const l of f.loans) {
    if (!l.overdue || l.loan.closedAt) continue
    const taken = l.loan.direction === 'taken'
    items.push({
      level: 'yellow',
      kind: 'loan',
      // Each installment going late is a new reminder (the latest late one in the key).
      key: `loan:${l.loan.id}:${l.overdue.last}`,
      text: taken
        ? `Zaległa rata „${l.loan.name}”: ${zl(l.overdue.amount)} od ${dm(l.overdue.date)}.`
        : `Pożyczka „${l.loan.name}”: spłata ${zl(l.overdue.amount)} spóźniona od ${dm(l.overdue.date)} – przypomnij${l.loan.counterparty ? ` (${l.loan.counterparty})` : ''}.`
    })
  }
  const pit = pit38Deadline(f.today)
  const pitDays = pit ? daysBetween(f.today, pit) : null
  if (pit && pitDays != null && pitDays <= PIT38_DAYS)
    items.push({
      level: pitDays <= 3 ? 'yellow' : 'info',
      kind: 'pit38',
      key: `pit38:${pit}:${pitDays <= 3 ? 3 : 14}`,
      text: `PIT-38 za ${Number(pit.slice(0, 4)) - 1}: termin ${pitDays === 0 ? 'dziś' : `za ${pitDays} ${pitDays === 1 ? 'dzień' : 'dni'}`} (30 kwietnia) – kwota w ICTTJ.`
    })
  // What a household member owes for longer than 30 days (D80 e): each member apart; their advance is only shown.
  for (const m of f.receivables.members) {
    const days = m.since ? daysBetween(m.since, f.today) : 0
    if (m.owed > 0 && m.since && days > HOUSE_DAYS) {
      // The oldest still owed: a purchase, or the balance at the settlements' start (D81); their money's way (D81).
      const oldest = m.open[0] && isOpeningItem(m.open[0].txId) ? 'saldo na start rozliczeń' : 'najstarszy zakup'
      const via = o.members?.find((x) => x.id === m.memberId)?.via
      const through = via ? ` – przekazuje przez: ${memberName(via, o.members)}` : ''
      items.push({ level: 'info', kind: 'house', key: `house:${m.memberId}:${m.since}`, text: `${memberName(m.memberId, o.members)}: do oddania ${zl(m.owed)} – ${oldest} z ${dm(m.since)} (${days} dni)${through}.` })
    }
  }
  if (o.mission) items.push({ level: 'info', kind: 'mission', key: `mission:${o.mission.week}`, text: `Misja tygodnia – ${o.mission.title}: ${o.mission.text}` })
  return items
}
