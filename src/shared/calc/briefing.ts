/**
 * The morning briefing (spec, „Rytuały” – odprawa; „Mostek”): the Daily Bias, today's energy and the alerts – the
 * engine's alarms of this month, the asteroids (periodic fees) within 14 days, a fixed fee overdue (F1), an overdue
 * import, the balances to confirm, the loot waiting for a decision. Pure; the bridge, the notifications and the spoken
 * briefing use it.
 */
import { DateTime } from 'luxon'
import { dm, formatPln } from '../format'
import { ICTJ_POOL_LABEL } from '../ictj'
import type { Account, HouseholdMember } from '../schema/budget'
import type { Balance, Container } from '../schema/records'
import { lastConfirmation } from './balances'
import type { CargoStatus } from './cargoStatus'
import { daysBetween, firstDayOf, warsawNow } from './dates'
import type { Delivery } from './dock'
import { isOpeningItem, memberName } from './household'
import { HOUSE_DAYS } from './loans'
import { lastPaymentOf, pit38Deadline } from './radar'
import { activeIn, amountIn, monthlyWeight, nextPaymentOf, nextUnpaidOf, type Alarm, type FleetState } from './fleet'
import type { AccountAhead } from './ahead'
import { remindStep, type ScheduledDay } from './scheduled'
import { cycleText, deadText, priceText, type DeadContainer, type PriceChange } from './cargoWatch'
import { anomalyText, type Anomaly } from './anomalies'
import { lateReturnText, type AwaitedReturn } from './returns'
import type { RecurringPayment } from './plan'
import type { BankFile } from '../api'
import { bankFileText, MBANK_EXPORT_HINT } from '../import/bankFiles'

/** The Daily Bias (spec, „Wywiad”): Bullish – today's energy at least the base allowance and the envelopes on plan;
 * Bearish – the energy under half the base or the shields under their minimum; else Neutral. */
export type DailyBias = 'bullish' | 'bearish' | 'neutral'

export function dailyBias(f: Pick<FleetState, 'daily' | 'envelopes' | 'shields' | 'started'>): DailyBias | null {
  if (!f.daily || !f.started) return null
  const base = f.daily.base
  const belowMin = f.shields.min != null && f.shields.amount < f.shields.min
  if (f.daily.left < base / 2 || belowMin) return 'bearish'
  // The planned envelopes on plan; the daily ones are the energy itself (N102 – D16: their pool decides).
  if (f.daily.left >= base && f.envelopes.every((e) => e.kind !== 'planned' || e.spent <= e.limit)) return 'bullish'
  return 'neutral'
}

export const BIAS_LABEL: Record<DailyBias, string> = { bullish: 'Bullish', bearish: 'Bearish', neutral: 'Neutral' }

export interface BriefingItem {
  level: 'red' | 'yellow' | 'info'
  /** What the item is about (the screen it leads to; 'dock' – the docking window of the delivery in `key`). */
  kind:
    | 'alarm'
    | 'asteroid'
    | 'cargo'
    | 'import'
    | 'balances'
    | 'loot'
    | 'start'
    | 'dock'
    | 'ictj'
    | 'loan'
    | 'pit38'
    | 'house'
    | 'mission'
    | 'plan'
    | 'end'
    | 'account'
    | 'price'
    | 'dead'
    | 'recurring'
    | 'anomaly'
    | 'return'
  text: string
  /** Stable key (the notifications send each once). */
  key: string
}

const zlotych = (grosze: number) => `${formatPln(grosze)} zł`

/** One line of an alarm of the engine (`money` formats the amounts – the hidden amounts mask them). */
export function alarmText(a: Alarm, label: (id: string) => string = () => '', zl: (grosze: number) => string = zlotych): string {
  switch (a.kind) {
    case 'salary-from-hull':
      return `Pensja z kadłuba (funduszu awaryjnego): ${zl(a.amount)} – za mało w osłonach (buforze na pensje).`
    case 'salary-partial':
      return `Pensja częściowa: brakuje ${zl(a.amount)} – osłony (bufor na pensje) i kadłub (fundusz awaryjny) puste.`
    case 'energy-exhausted':
      return `Energia wyczerpana: ${zl(a.amount)} ponad energię miesiąca (pensja po ratach odkładek) poszło z osłon (bufora na pensje).`
    case 'firewall':
      return `Firewall: dopłata do XTB ${zl(a.amount)} wbrew rozkazowi.`
    case 'sinking-short':
      return `Za mało w zbiorniku (odkładce) ${a.ref ? label(a.ref) : ''}: ${zl(a.amount)} z energii (pensji miesiąca).`.replace('  ', ' ')
    case 'deficit':
      return `Deficyt: osłony (bufor na pensje) poniżej zera o ${zl(a.amount)}.`
    case 'shields-below-min':
      return `Osłony (bufor na pensje) poniżej minimum o ${zl(a.amount)}.`
    case 'correction':
      return `Rozbieżność salda: korekta ${zl(a.amount)} do wyjaśnienia.`
    case 'daily-over':
      return `Przydział dnia przekroczony o ${zl(a.amount)}.`
    case 'envelope-over':
      return `Koperta ${a.ref ? label(a.ref) : ''} ponad limit o ${zl(a.amount)}.`.replace('  ', ' ')
    case 'cargo-over':
      return `Masa ładunku (stałe koszty ${zl(a.amount)}/mies.) ponad linią zanurzenia.`
    case 'salary-above-income':
      return `Pensja wyższa niż średni przychód (do 6 ostatnich mies.) o ${zl(a.amount)} – osłony (bufor na pensje) będą się kurczyć.`
  }
}

export { nextPaymentOf }

export interface BriefingInput {
  fleet: FleetState
  containers: readonly Container[]
  /** Accounts with the mBank import and their last import (ISO time; null = never). */
  imports: ReadonlyArray<{ name: string; last: string | null }>
  /** The last confirmed balance date of the budget's accounts (null = never) – when `confirmations` are not given. */
  lastConfirmation?: string | null
  /** Each account to confirm with its last confirmed balance (B28, `confirmationsOf`): a reminder per account. */
  confirmations?: ReadonlyArray<AccountConfirmation>
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
  /** The fixed fees of this month (F1, `cargoStatuses`): an overdue one is an alert. */
  cargo?: readonly CargoStatus[]
  /** The planned operations' days (F16, `scheduledWindow`): each one's reminders, a late one. */
  scheduled?: readonly ScheduledDay[]
  /** The accounts ahead (F26, `accountsAhead`): a payment taking one below zero. */
  accounts?: readonly AccountAhead[]
  /** The cargo hold's watch (F9, F23): new prices, containers gone quiet, fees new in the history. */
  watch?: CargoWatch
  /** The new files of mBank in the downloads (F14, `newBankFiles`). */
  bankFiles?: readonly BankFile[]
  /** The radar of anomalies (F31, `anomalies` – those said „w porządku” to left out). */
  anomalies?: readonly Anomaly[]
  /** The purchases awaiting a return (F34, `awaitedReturns`): a late one is said. */
  returns?: readonly AwaitedReturn[]
}

/** An anomaly is said in the briefing this many days after its day (it stays in the inbox and Operacje). */
export const ANOMALY_BRIEFING_DAYS = 14

/** What the cargo hold's watch reports (F9, F23). */
export interface CargoWatch {
  prices: readonly PriceChange[]
  dead: readonly DeadContainer[]
  /** The history's recurring payments new this month (`RecurringPayment.fresh`). */
  fresh: readonly RecurringPayment[]
}

export interface AccountConfirmation {
  accountId: string
  name: string
  /** The last confirmed balance's day; null = never. */
  last: string | null
}

/**
 * The accounts whose balances the weekly confirmation asks for (B28): every budget account in use – not archived, not
 * the cash (counted when it matters, D83) – with its own last confirmation: a confirmed mBank never hides Portfel XTB.
 */
export function confirmationsOf(accounts: readonly Pick<Account, 'id' | 'name' | 'archived' | 'kind'>[], balances: readonly Balance[]): AccountConfirmation[] {
  return accounts.filter((a) => !a.archived && a.kind !== 'cash').map((a) => ({ accountId: a.id, name: a.name, last: lastConfirmation(a.id, balances)?.date ?? null }))
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

/** '2026-10-16' → '16.10' (the briefing's and the notifications' short date – one for the app, `format.ts`). */
export { dm }

/** The line of a delivery in the briefing (null = nothing to say); the inbox says the same of one to dock (F6). */
export function deliveryItem(d: Delivery, today: string, zl: (grosze: number) => string): BriefingItem | null {
  const e = d.entry
  if (d.state === 'pending') {
    const text = e
      ? e.kind === 'withdrawal'
        ? d.wallet
          ? `Wypłata z ICTTJ ${zl(d.amount)} (${dm(d.date)}, pula ${ICTJ_POOL_LABEL[e.pool]}) bez pary w mBanku – zadokuj na Portfelu XTB albo poczekaj na import.`
          : `Wypłata z ICTTJ ${zl(d.amount)} (pula ${ICTJ_POOL_LABEL[e.pool]}) do zadokowania.`
        : e.pool === 'tax'
          ? `Zwrot do masy z ICTTJ ${zl(d.amount)} (${dm(d.date)}, pula Podatek) do potwierdzenia – wraca z rezerwy na PIT-38.`
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
/** A container's end (its last payment – F16) is announced from 14 days before. */
export const END_DAYS = 14

const inDays = (days: number) => (days === 0 ? 'dziś' : `za ${days} ${days === 1 ? 'dzień' : 'dni'}`)

/** The line of a planned operation's day (F16) – null when it is not to be recalled today. */
export function planItem(d: ScheduledDay, zl: (grosze: number) => string): BriefingItem | null {
  const s = d.scheduled
  const what = s.amount == null ? '' : ` – ${zl(Math.abs(s.amount))} (${s.amount < 0 ? 'wydatek' : 'wpływ'})`
  if (d.state === 'late')
    return {
      level: 'yellow',
      kind: 'plan',
      key: `plan:${s.id}:${d.date}:late`,
      text: `Boja po terminie: ${s.name} (${dm(d.date)})${what} – ${s.amount == null ? 'odhacz, gdy zrobione' : 'bez operacji w banku: wykonaj albo odhacz'}.`
    }
  if (d.state !== 'ahead' && d.state !== 'today') return null
  const step = remindStep(s, d.days)
  if (step == null) return null
  return { level: d.days <= 3 ? 'yellow' : 'info', kind: 'plan', key: `plan:${s.id}:${d.date}:${step}`, text: `${s.amount == null ? 'Termin' : 'Boja'}: ${s.name} ${inDays(d.days)}${what}.` }
}

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
    // A correction and a top-up of XTB against the firewall: one line each (N103) – the game counts each of them.
    const key = `${a.kind}:${a.ref ?? ''}${a.kind === 'correction' || a.kind === 'firewall' ? `:${a.txId}` : ''}`
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
      text: `Asteroida: ${c.name} ${days === 0 ? 'dziś' : `za ${days} ${days === 1 ? 'dzień' : 'dni'}`} – ${zl(amountIn(c, date.slice(0, 7)))}, w zbiorniku ${zl(tank)}.`
    })
  }
  // A fixed fee 3 days after its due without a payment (F1, D86) – once per due.
  for (const s of o.cargo ?? []) {
    if (s.state !== 'overdue') continue
    items.push({ level: 'yellow', kind: 'cargo', key: `cargo:${s.containerId}:${s.due}`, text: `Kontener niezaładowany: ${s.name} ${zl(s.amount)} – termin ${dm(s.due)} minął, brak płatności.` })
  }
  for (const imp of o.imports) {
    // The import's Warsaw date (stored as an ISO time in UTC).
    const days = imp.last ? daysBetween(warsawNow(imp.last).date, f.today) : null
    if (days != null && days <= IMPORT_DUE_DAYS) continue
    // How the file is taken in mBank (F14): said with the reminder.
    items.push({
      level: 'info',
      kind: 'import',
      key: `import:${imp.name}:${f.today}`,
      text: days == null ? `${imp.name}: jeszcze bez importu z banku (${MBANK_EXPORT_HINT}).` : `${imp.name}: ostatni import ${days} dni temu – zaimportuj nowy plik (${MBANK_EXPORT_HINT}).`
    })
  }
  // A new file of mBank in the downloads (F14): imported with one click.
  for (const file of o.bankFiles ?? []) items.push({ level: 'info', kind: 'import', key: `bankfile:${file.id}:${file.mtime}`, text: `${bankFileText(file)} – importuj.` })
  if (o.confirmations)
    for (const a of o.confirmations) {
      const days = a.last ? daysBetween(a.last, f.today) : null
      if (days != null && days <= BALANCES_DUE_DAYS) continue
      items.push({
        level: 'info',
        kind: 'balances',
        key: `balances:${a.accountId}:${f.today}`,
        text: days == null ? `${a.name}: potwierdź saldo z bankiem (raz w tygodniu).` : `${a.name}: saldo potwierdzone ${days} dni temu – sprawdź z bankiem.`
      })
    }
  else {
    const confirmed = o.lastConfirmation ? daysBetween(o.lastConfirmation, f.today) : null
    if (confirmed == null || confirmed > BALANCES_DUE_DAYS)
      items.push({ level: 'info', kind: 'balances', key: `balances:${f.today}`, text: confirmed == null ? 'Potwierdź salda kont z bankiem (raz w tygodniu).' : `Salda potwierdzone ${confirmed} dni temu – sprawdź z bankiem.` })
  }
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
      // Their money waiting to be assigned to a purchase (D91): the purchases still say „do oddania”.
      const waiting = m.unassigned.reduce((a, u) => a + u.amount, 0)
      const assign = waiting ? `; zwrot ${zl(waiting)} czeka na przypisanie do zakupów` : ''
      items.push({ level: 'info', kind: 'house', key: `house:${m.memberId}:${m.since}`, text: `${memberName(m.memberId, o.members)}: do oddania ${zl(m.owed)} – ${oldest} z ${dm(m.since)} (${days} dni)${through}${assign}.` })
    }
  }
  if (o.mission) items.push({ level: 'info', kind: 'mission', key: `mission:${o.mission.week}`, text: `Misja tygodnia – ${o.mission.title}: ${o.mission.text}` })
  // The planned operations (F16): each reminder of a day once, a late one until it is done.
  for (const d of o.scheduled ?? []) {
    const item = planItem(d, zl)
    if (item) items.push(item)
  }
  // A container's end (F16): its last payment within 14 days – the hold lighter after it.
  for (const c of o.containers) {
    if (c.archived) continue
    const date = lastPaymentOf(c, f.today)
    const days = date ? daysBetween(f.today, date) : null
    if (!date || days == null || days > END_DAYS) continue
    const monthly = monthlyWeight(c)
    items.push({ level: 'info', kind: 'end', key: `end:${c.id}:${date}`, text: `Koniec kontenera: ${c.name} – ostatnia płatność ${dm(date)}, potem ładownia lżejsza o ${zl(monthly)}/mies.` })
  }
  // The cargo hold's watch (F9, F23): a new price, a container gone quiet, a fee new in the history.
  for (const p of o.watch?.prices ?? []) {
    const c = o.containers.find((x) => x.id === p.containerId)
    if (!c) continue
    items.push({ level: 'info', kind: 'price', key: p.key, text: `Kontener ${p.to > p.from ? 'cięższy' : 'lżejszy'} niż w manifeście – ${priceText(p, c, zl)}. Zaktualizować?` })
  }
  for (const d of o.watch?.dead ?? []) items.push({ level: 'info', kind: 'dead', key: d.key, text: `Kontener bez płatności – ${deadText(d)} Zrzucić z ładowni?` })
  for (const r of o.watch?.fresh ?? [])
    items.push({
      level: 'info',
      kind: 'recurring',
      key: `recurring:${r.key}:${f.month}`,
      text: `Nowa opłata w historii: ${r.label} ${cycleText(r)} – ${zl(r.amount)}${r.variable ? ' (kwota zmienna – szacunek z roku)' : ''}. Do ładowni?`
    })
  // The radar of anomalies (F31): a recent unknown signal – a possible double charge first.
  for (const a of o.anomalies ?? []) {
    if (daysBetween(a.date, f.today) > ANOMALY_BRIEFING_DAYS) continue
    items.push({ level: a.kind === 'double' ? 'yellow' : 'info', kind: 'anomaly', key: `anomaly:${a.key}`, text: `Nieznany sygnał na radarze – ${anomalyText(a, zl)}` })
  }
  // A return not come by its day (F34): said every day until it comes or is closed.
  for (const r of o.returns ?? []) if (r.state === 'late') items.push({ level: 'yellow', kind: 'return', key: `return:${r.tx.id}:${r.until}`, text: lateReturnText(r, zl) })
  // An account short before a payment (F26): the money is on another account.
  for (const a of o.accounts ?? []) {
    if (!a.short) continue
    const from = a.source ? ` – przelej z konta ${a.source.name}` : ''
    items.push({ level: 'yellow', kind: 'account', key: `account:${a.accountId}:${a.short.date}`, text: `Na koncie ${a.name} zabraknie ${zl(a.short.amount)} na płatność ${dm(a.short.date)} (${a.short.cause})${from}.` })
  }
  return items
}
