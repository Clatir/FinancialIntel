/**
 * „Kapitan Testowy” – the functional audit's synthetic persona (docs/audyt/plan.md, AU-2, D97: synthetic data only).
 * Fourteen months of a budget made relative to the day it is generated (`anchor`, a Warsaw date), deterministic for a
 * given anchor (a seeded generator): what the captain typed by hand (Portfel XTB, cash, some mBank purchases with their
 * hour), the mBank account history as the bank's CSV (Windows-1250, imported through the released app – its import
 * decides the records), the decisions a user makes afterwards (household financing, impulses, trips, loans, returns),
 * and ICT Trade Journal's folder (payouts of every pool, forecasts).
 */
import { addDays, addMonths, daysInMonth } from '../../src/shared/calc/dates'
import { CASH_ACCOUNT_ID, CASH_CATEGORY_ID, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID, defaultCategoryId } from '../../src/shared/schema/budget'
import type { Settings } from '../../src/shared/schema/settings'

// ------------------------------------------------------------------ ids, money, dates

/** A fixed ULID of the persona: `01KAZ` + two digits of the kind + a counter. */
export const fid = (kind: number, n: number): string => `01KAZ${String(kind).padStart(2, '0')}${String(n).padStart(19, '0')}`
export const zl = (v: number): number => Math.round(v * 100)
export const cat = defaultCategoryId

export const MBANK = MBANK_ACCOUNT_ID
export const WALLET = XTB_WALLET_ACCOUNT_ID
export const CASH = CASH_ACCOUNT_ID

export const ANNA = HOUSE_MEMBER_ID
export const KASIA = fid(20, 2)
export const MAREK = fid(20, 3)

export const LOAN_TOMEK = fid(50, 1)
export const LOAN_PARENTS = fid(50, 2)

export const GOAL_LAPTOP = fid(30, 1)
export const GOAL_TRIP = fid(30, 2)
export const GOAL_BIKE = fid(30, 3)

export const C = {
  rent: fid(40, 1),
  internet: fid(40, 2),
  phone: fid(40, 3),
  netflix: fid(40, 4),
  gym: fid(40, 5),
  spotify: fid(40, 6),
  insurance: fid(40, 7),
  propertyTax: fid(40, 8),
  power: fid(40, 9),
  parents: fid(40, 10)
} as const

/** Day of the week of a date: 0 = Sunday … 6 = Saturday. */
export const dow = (date: string): number => new Date(`${date}T12:00:00Z`).getUTCDay()
const monthOf = (date: string) => date.slice(0, 7)
const dayIn = (month: string, day: number) => `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, '0')}`
/** The working day on or after `date` (weekends only – the bank books transfers so). */
const weekdayOnOrAfter = (date: string) => (dow(date) === 6 ? addDays(date, 2) : dow(date) === 0 ? addDays(date, 1) : date)

/** A seeded generator (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    chance: (p: number) => next() < p,
    /** Grosze between two amounts in zł. */
    amount: (min: number, max: number) => Math.round((min + (max - min) * next()) * 100),
    pick: <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)]!,
    time: (fromH: number, toH: number) => {
      const m = Math.floor((fromH * 60 + (toH - fromH) * 60 * next()) / 5) * 5
      return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    }
  }
}

// ------------------------------------------------------------------ the model

/** What a user decides about a row after the import (applied to the operation the import made of it). */
export interface After {
  /** Split with Anna: her part (grosze, positive), financed by her. */
  annaPart?: number
  /** Financed by a member: the whole purchase, or `part` of it (the rest mine). */
  financedBy?: { member: string; part?: number; gift?: boolean }
  /** Shared equally with Anna (D83). */
  sharedWithAnna?: boolean
  /** An inflow of Anna with a part for Kasia (D81 „+ także za Kasia”). */
  kasiaPart?: number
  /** An inflow that pays back these purchases (their row ids, `BankEvent.ref`); `opening` – none. */
  covers?: string[]
  impulse?: 'plan' | 'impulse'
  logNote?: string
  tags?: string[]
  awaitReturn?: { amount: number; until: string }
  container?: string
  /** An ICTTJ entry this inflow is the money of (a docking record). */
  ictj?: { id: string; pool: 'current' | 'surplus' | 'goals' | 'tax'; date: string }
}

/** A row of the bank's account history (mBank). */
export interface BankEvent {
  /** Reference for the decisions after the import. */
  ref: string
  date: string
  /** „ZAKUP PRZY UŻYCIU KARTY”, „PRZELEW ZEWNĘTRZNY WYCHODZĄCY”… */
  op: string
  title: string
  who: string
  acct: string
  amount: number
  /** The purchase typed by hand before the import (merged by it): its hour and name. */
  typed?: { time: string; name: string; categoryId: string }
  after?: After
  /** For the lista format (the recent file): the bank's category and a pending flag. */
  bankCategory?: string
  pending?: boolean
}

/** An operation typed by hand (Portfel XTB, cash, a purchase on mBank the bank books later). */
export interface ManualOp {
  date: string
  time: string | null
  accountId: string
  kind: 'expense' | 'income' | 'trading' | 'transfer' | 'loan'
  amount: number
  categoryId: string | null
  counterparty: string
  note?: string
  impulse?: 'plan' | 'impulse' | null
  logNote?: string
  tags?: string[]
  memberId?: string | null
  refundable?: boolean
  counterAccountId?: string | null
  bothSides?: boolean
  ictj?: { id: string; pool: 'current' | 'surplus' | 'goals' | 'tax'; date: string }
}

export interface IctjPayout {
  id: string
  kind: 'withdrawal' | 'return'
  date: string
  /** zł, as ICTTJ keeps it. */
  amount: number
  pool: 'current' | 'surplus' | 'goals' | 'tax'
  /** Where the money came: mBank (the CSV has its row), Portfel XTB (typed), none (no pair yet), or a return from mBank. */
  to: 'mbank' | 'wallet' | 'none'
}

/** A decision of the import for a group of rows: a search token, the money's direction, the option and the category. */
export interface GroupDecision {
  token: string
  dir: 'in' | 'out'
  option: string
  categoryId?: string | null
}

export interface Persona {
  anchor: string
  start: string
  /** Last day of the history file (the import of the persona). */
  historyEnd: string
  settings: (s: Settings) => Settings
  records: Record<string, Array<Record<string, unknown>>>
  manual: ManualOp[]
  history: BankEvent[]
  recent: BankEvent[]
  ictj: IctjPayout[]
  decisions: GroupDecision[]
  openingMbank: number
}

const CITY = 'TESTOWO'

/** A card purchase as mBank's history writes it. */
const card = (ref: string, date: string, merchant: string, amount: number, after?: After, city = CITY): BankEvent => ({
  ref,
  date,
  op: amount < 0 ? 'ZAKUP PRZY UŻYCIU KARTY' : 'ZWROT ZAKUPU KARTĄ',
  title: `${merchant.padEnd(19)}/${city}                                           DATA TRANSAKCJI: ${date}`,
  who: '  ',
  acct: "''",
  amount,
  after
})

const transferOut = (ref: string, date: string, who: string, title: string, amount: number, after?: After): BankEvent => ({
  ref,
  date,
  op: 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY',
  title,
  who,
  acct: "'21105000000000000000000002'",
  amount: -Math.abs(amount),
  after
})

const transferIn = (ref: string, date: string, who: string, title: string, amount: number, after?: After, internal = false): BankEvent => ({
  ref,
  date,
  op: internal ? 'PRZELEW WEWNĘTRZNY PRZYCHODZĄCY' : 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY',
  title,
  who,
  acct: "'21105000000000000000000003'",
  amount: Math.abs(amount),
  after
})

/** Everyday merchants: name, chance a day, amount range in zł, category, typed by hand sometimes. */
const MERCHANTS: ReadonlyArray<{ name: string; short: string; p: number; min: number; max: number; categoryId: string; anna?: number }> = [
  { name: 'BIEDRONKA 1234', short: 'Biedronka', p: 2 / 7, min: 30, max: 140, categoryId: cat(1, 1), anna: 0.35 },
  { name: 'LIDL SP Z O O', short: 'Lidl', p: 1 / 14, min: 80, max: 220, categoryId: cat(1, 1), anna: 0.35 },
  { name: 'ZABKA Z1234', short: 'Żabka', p: 1 / 7, min: 8, max: 35, categoryId: cat(1, 1) },
  { name: 'PIZZERIA NAPOLI', short: 'Pizzeria Napoli', p: 2 / 30, min: 45, max: 95, categoryId: cat(1, 2) },
  { name: 'KEBAB ROMA', short: 'Kebab Roma', p: 3 / 30, min: 25, max: 40, categoryId: cat(1, 2) },
  { name: 'BAR POD LIPA', short: 'Bar pod Lipą', p: 2 / 30, min: 23, max: 60, categoryId: cat(1, 2) },
  { name: 'KAWIARNIA MOKKA', short: 'Mokka', p: 1 / 7, min: 9, max: 18, categoryId: cat(1, 3) },
  { name: 'CINEMA CITY', short: 'Cinema City', p: 2 / 30, min: 28, max: 70, categoryId: cat(6, 1) },
  { name: 'BOLT.EU', short: 'Bolt', p: 3 / 30, min: 15, max: 45, categoryId: cat(6, 1) },
  { name: 'EMPIK', short: 'Empik', p: 1 / 30, min: 30, max: 120, categoryId: cat(6, 2) },
  { name: 'ZARA POLSKA', short: 'Zara', p: 1 / 30, min: 80, max: 300, categoryId: cat(8, 1) },
  { name: 'ROSSMANN 112', short: 'Rossmann', p: 2 / 30, min: 20, max: 80, categoryId: cat(8, 2) },
  { name: 'FRYZJER STYL', short: 'Fryzjer Styl', p: 1 / 35, min: 60, max: 90, categoryId: cat(8, 3) },
  { name: 'ORLEN STACJA 4123', short: 'Orlen', p: 3 / 30, min: 150, max: 280, categoryId: cat(3, 1) },
  { name: 'SKYCASH PARKING', short: 'Parking', p: 4 / 30, min: 6, max: 20, categoryId: cat(3, 4) },
  { name: 'KOLEO', short: 'KOLEO', p: 1 / 30, min: 30, max: 60, categoryId: cat(3, 5) },
  { name: 'ZOOPLUS', short: 'Zooplus', p: 1 / 30, min: 120, max: 180, categoryId: cat(4, 1) },
  { name: 'WETERYNARZ AZOR', short: 'Weterynarz Azor', p: 1 / 90, min: 90, max: 250, categoryId: cat(4, 2) },
  { name: 'APTEKA DBAM O ZDROWIE', short: 'Apteka', p: 2 / 30, min: 15, max: 80, categoryId: cat(5, 1) },
  { name: 'IKEA', short: 'IKEA', p: 1 / 60, min: 50, max: 400, categoryId: cat(2, 3) },
  { name: 'DROGERIA NATURA', short: 'Natura', p: 1 / 30, min: 20, max: 60, categoryId: cat(2, 4) },
  { name: 'ALLEGRO', short: 'Allegro', p: 1 / 30, min: 50, max: 250, categoryId: cat(9, 2) }
]

const FOOD = new Set([cat(1), cat(1, 1), cat(1, 2), cat(1, 3)])

/** The name a row is known by: the shop of a card payment or a refund, the other side of a transfer, else the title. */
export function rowName(e: Pick<BankEvent, 'op' | 'title' | 'who'>): string {
  if (e.op.startsWith('ZAKUP') || e.op.startsWith('ZWROT') || !e.who.trim()) return e.title.split('/')[0]!.trim()
  return e.who.trim()
}

/** The decisions of the persona's import, group by group (the user's categorization of a year of history). */
const DECISIONS: GroupDecision[] = [
  ...MERCHANTS.map((m) => ({ token: m.name.split(' ')[0]!.toLowerCase().replace('.eu', ''), dir: 'out' as const, option: 'expense', categoryId: m.categoryId })),
  { token: 'zara', dir: 'in', option: 'refund', categoryId: cat(8, 1) },
  { token: 'auto serwis', dir: 'out', option: 'expense', categoryId: cat(3, 2) },
  { token: 'eventim', dir: 'out', option: 'expense', categoryId: cat(6, 1) },
  { token: 'media expert', dir: 'out', option: 'expense', categoryId: cat(9, 2) },
  { token: 'papierniczy', dir: 'out', option: 'expense', categoryId: cat(9, 2) },
  { token: 'douglas', dir: 'out', option: 'expense', categoryId: cat(8, 2) },
  { token: 'booking', dir: 'out', option: 'expense', categoryId: cat(6, 3) },
  { token: 'tawerna', dir: 'out', option: 'expense', categoryId: cat(1, 2) },
  { token: 'kajak', dir: 'out', option: 'expense', categoryId: cat(6, 3) },
  { token: 'netflix', dir: 'out', option: 'expense', categoryId: cat(7, 3) },
  { token: 'spotify', dir: 'out', option: 'expense', categoryId: cat(7, 3) },
  { token: 'cityfit', dir: 'out', option: 'expense', categoryId: cat(5, 3) },
  { token: 'wspólnota', dir: 'out', option: 'expense', categoryId: cat(2, 1) },
  { token: 'netia', dir: 'out', option: 'expense', categoryId: cat(7, 2) },
  { token: 'p4', dir: 'out', option: 'expense', categoryId: cat(7, 1) },
  { token: 'pzu', dir: 'out', option: 'expense', categoryId: cat(3, 3) },
  { token: 'urząd miasta', dir: 'out', option: 'expense', categoryId: cat(2, 1) },
  { token: 'tauron', dir: 'out', option: 'expense', categoryId: cat(2, 2) },
  { token: 'robert', dir: 'out', option: 'expense', categoryId: null },
  { token: 'robert', dir: 'in', option: `loan:${LOAN_PARENTS}` },
  { token: 'tomasz kolega', dir: 'out', option: `loan:${LOAN_TOMEK}` },
  { token: 'tomasz kolega', dir: 'in', option: `loan:${LOAN_TOMEK}` },
  { token: 'firma testowa', dir: 'in', option: 'income' },
  { token: 'anna testowa', dir: 'in', option: `household:${ANNA}:advance` },
  { token: 'marek testowy', dir: 'in', option: `household:${MAREK}:advance` },
  { token: 'xtb', dir: 'in', option: 'trading' },
  { token: 'xtb', dir: 'out', option: 'trading' },
  { token: 'urząd skarbowy', dir: 'out', option: 'tax' },
  { token: 'bankomat', dir: 'out', option: 'expense', categoryId: CASH_CATEGORY_ID }
]

/** The month plan of every month: salary and envelopes (daily: Jedzenie, Rozrywka, Osobiste, Gotówka). */
function envelopes(month: string, last: string): Record<string, number> {
  const late = month >= addMonths(last, -3)
  return {
    [cat(1)]: zl(late ? 1600 : 1500),
    [cat(6)]: zl(450),
    [cat(8)]: zl(350),
    [CASH_CATEGORY_ID]: zl(100),
    [cat(2)]: zl(300),
    [cat(3)]: zl(650),
    [cat(4)]: zl(200),
    [cat(5)]: zl(150),
    [cat(9)]: zl(200)
  }
}

// ------------------------------------------------------------------ the persona

export function buildPersona(anchor: string): Persona {
  const r = rng(Number(anchor.replace(/-/g, '')))
  const M = monthOf(anchor)
  const startMonth = addMonths(M, -14)
  const start = `${startMonth}-01`
  const historyEnd = addDays(anchor, -8)
  const recentFrom = addDays(anchor, -7)
  const assignFrom = addDays(anchor, -60)
  const history: BankEvent[] = []
  const recent: BankEvent[] = []
  const manual: ManualOp[] = []
  let n = 0
  const ref = (p: string) => `${p}${++n}`
  const push = (e: BankEvent) => (e.date <= historyEnd ? history : e.date < anchor ? recent : null)?.push(e)

  // ---- everyday purchases on mBank (some typed by hand first, with the hour), Portfel XTB and cash
  for (let d = start; d < anchor; d = addDays(d, 1)) {
    const weekend = dow(d) === 0 || dow(d) === 6
    for (const m of MERCHANTS) {
      // More food at the weekends (Jedzenie and its subcategories only).
      const p = weekend && FOOD.has(m.categoryId) ? m.p * 1.3 : m.p
      if (!r.chance(p)) continue
      const amount = -r.amount(m.min, m.max)
      const after: After = {}
      if (m.anna && r.chance(m.anna)) after.annaPart = Math.round(-amount / 2)
      if (-amount >= zl(200) && !after.annaPart) {
        after.impulse = r.chance(0.3) ? 'impulse' : 'plan'
        if (after.impulse === 'impulse') after.logNote = r.pick(['promocja, nie planowałem', 'zachcianka po pracy', 'zły dzień'])
      }
      const e = card(ref('card'), d, m.name, amount, after)
      if (r.chance(0.15)) e.typed = { time: r.time(7, 22), name: m.short, categoryId: m.categoryId }
      push(e)
    }
    // Portfel XTB: about once a week, now and then at night (the quiet hours, D40).
    if (r.chance(1 / 7)) {
      const night = r.chance(0.12)
      const what = r.pick([
        { cp: 'Żabka', c: cat(1, 3), min: 10, max: 40 },
        { cp: 'Lody Grycan', c: cat(1, 3), min: 15, max: 30 },
        { cp: 'Shell', c: cat(3, 1), min: 150, max: 250 },
        { cp: 'Bar Mleczny', c: cat(1, 2), min: 20, max: 45 }
      ])
      manual.push({
        date: d,
        time: night ? r.pick(['23:20', '23:45', '00:40', '01:15']) : r.time(8, 22),
        accountId: WALLET,
        kind: 'expense',
        amount: -r.amount(what.min, what.max),
        categoryId: what.c,
        counterparty: what.cp,
        ...(night ? { impulse: 'impulse' as const, logNote: r.pick(['głód po nocnej sesji', 'nie mogłem zasnąć', 'powrót z miasta']) } : {})
      })
    }
    // Cash: the bazaar, twice a month, while the opening cash lasts.
    if (d < addDays(start, 150) && r.chance(2 / 30)) manual.push({ date: d, time: r.time(9, 13), accountId: CASH, kind: 'expense', amount: -r.amount(15, 45), categoryId: cat(1, 1), counterparty: 'Bazar' })
    // An ATM every six weeks: cash spent as „Gotówka” (spec, „Przypadki szczególne”).
    if (r.chance(1 / 42))
      push({ ref: ref('atm'), date: d, op: 'WYPŁATA W BANKOMACIE', title: `BANKOMAT EURONET 0412 /${CITY} DATA TRANSAKCJI: ${d}`, who: '  ', acct: "''", amount: -zl(200) })
  }

  // ---- months: salary, Anna, the containers' payments
  const months: string[] = []
  for (let m = startMonth; m <= M; m = addMonths(m, 1)) months.push(m)
  const insuranceDue = addDays(anchor, 22)
  const insuranceMonth = addMonths(monthOf(insuranceDue), -12)
  const parentsFrom = addMonths(startMonth, 2)
  const parentsUntil = addMonths(parentsFrom, 11)
  for (const m of months) {
    const i = months.indexOf(m)
    push(transferIn(ref('salary'), weekdayOnOrAfter(dayIn(m, 10)), 'FIRMA TESTOWA SP. Z O.O.', `WYNAGRODZENIE ZA ${addMonths(m, -1).slice(5)}/${addMonths(m, -1).slice(0, 4)}`, zl(7500)))
    const annaDate = weekdayOnOrAfter(dayIn(m, 12))
    const withKasia = i % 3 === 2
    push(transferIn(ref('anna'), annaDate, 'ANNA TESTOWA', withKasia ? 'NA DOM + ZA KASIE' : 'NA DOM', zl(withKasia ? 720 : 600), withKasia ? { kasiaPart: zl(120) } : {}, true))
    push(transferOut(ref('rent'), weekdayOnOrAfter(dayIn(m, 10)), 'WSPÓLNOTA MIESZKANIOWA TESTOWA 1', `CZYNSZ ${m}`, zl(1450), { container: C.rent }))
    push(transferOut(ref('net'), weekdayOnOrAfter(dayIn(m, 15)), 'NETIA SA', `FAKTURA ${m}`, zl(60), { container: C.internet }))
    push(transferOut(ref('phone'), weekdayOnOrAfter(dayIn(m, 20)), 'P4 SP. Z O.O.', `ABONAMENT ${m}`, zl(50), { container: C.phone }))
    push(card(ref('netflix'), dayIn(m, 5), 'NETFLIX.COM', -(m >= addMonths(M, -3) ? zl(49) : zl(43)), { container: C.netflix }))
    push(card(ref('gym'), dayIn(m, 1), 'CITYFIT', -zl(129), { container: C.gym }))
    if (m <= addMonths(M, -4)) push(card(ref('spotify'), dayIn(m, 8), 'SPOTIFY', -zl(23.99), { container: C.spotify }))
    if (m === insuranceMonth) push(transferOut(ref('oc'), weekdayOnOrAfter(dayIn(m, 25)), 'PZU SA', 'OC POJAZDU', zl(1240), { container: C.insurance }))
    if ([3, 5, 9, 11].includes(Number(m.slice(5)))) push(transferOut(ref('tax'), weekdayOnOrAfter(dayIn(m, 15)), 'URZĄD MIASTA TESTOWO', `PODATEK OD NIERUCHOMOSCI RATA`, zl(150), { container: C.propertyTax }))
    if (Number(m.slice(5)) % 2 === 1) push(transferOut(ref('power'), weekdayOnOrAfter(dayIn(m, 20)), 'TAURON SPRZEDAŻ SP. Z O.O.', `ENERGIA ${m}`, r.amount(150, 230), { container: C.power }))
    if (m >= parentsFrom && m <= parentsUntil) push(transferOut(ref('parents'), weekdayOnOrAfter(dayIn(m, 28)), 'ROBERT TESTOWY', 'RATA POZYCZKI', zl(500), { container: C.parents }))
  }

  // ---- the loans: from the parents (into the shields), to a friend (a receivable, two installments paid, two overdue)
  push(transferIn(ref('loan'), weekdayOnOrAfter(addDays(start, 30)), 'ROBERT TESTOWY', 'POZYCZKA OD RODZICOW', zl(6000)))
  push(transferOut(ref('loan'), weekdayOnOrAfter(addDays(anchor, -150)), 'TOMASZ KOLEGA', 'POZYCZKA', zl(2000)))
  for (const k of [120, 90]) push(transferIn(ref('loan'), weekdayOnOrAfter(addDays(anchor, -k)), 'TOMASZ KOLEGA', 'ZWROT POZYCZKI', zl(500)))

  // ---- the household: Marek's tickets (paid back), his electronics part (not yet), Kasia's school things, Anna's gift
  const tickets = card(ref('marek'), addDays(anchor, -75), 'EVENTIM', -zl(360), { financedBy: { member: MAREK } })
  push(tickets)
  push(transferIn(ref('marek'), weekdayOnOrAfter(addDays(anchor, -50)), 'MAREK TESTOWY', 'ZWROT ZA BILETY', zl(360), { covers: [tickets.ref] }))
  push(card(ref('marek'), addDays(anchor, -40), 'MEDIA EXPERT', -zl(450), { financedBy: { member: MAREK, part: zl(300) }, impulse: 'plan' }))
  push(card(ref('kasia'), addDays(anchor, -35), 'SKLEP PAPIERNICZY', -zl(120), { financedBy: { member: KASIA } }))
  push(card(ref('gift'), addDays(anchor, -100), 'DOUGLAS', -zl(260), { financedBy: { member: ANNA, gift: true }, impulse: 'plan' }))

  // ---- a trip (tags, F17) with a shared booking (D83)
  const trip = addDays(anchor, -110)
  const tripTag = `Mazury ${trip.slice(0, 4)}`
  push(card(ref('trip'), addDays(trip, -30), 'BOOKING.COM', -zl(1200), { sharedWithAnna: true, tags: [tripTag], impulse: 'plan' }, 'AMSTERDAM'))
  push(card(ref('trip'), trip, 'ORLEN STACJA 7781', -zl(240), { tags: [tripTag], impulse: 'plan' }, 'GIZYCKO'))
  push(card(ref('trip'), addDays(trip, 1), 'BIEDRONKA 4410', -zl(180), { tags: [tripTag] }, 'GIZYCKO'))
  push(card(ref('trip'), addDays(trip, 2), 'TAWERNA NAD JEZIOREM', -zl(210), { tags: [tripTag], impulse: 'impulse', logNote: 'wakacje' }, 'GIZYCKO'))
  push(card(ref('trip'), addDays(trip, 3), 'WYPOZYCZALNIA KAJAKOW', -zl(120), { tags: [tripTag] }, 'GIZYCKO'))

  // ---- the car's service (a planned envelope far over its limit – a serious violation) and a return of clothes
  push(card(ref('car'), addDays(start, 95), 'AUTO SERWIS KOWALSKI', -zl(1150), { impulse: 'plan' }))
  push(card(ref('car'), addDays(anchor, -45), 'AUTO SERWIS KOWALSKI', -zl(380), { impulse: 'plan' }))
  push(card(ref('ret'), addDays(anchor, -66), 'ZARA POLSKA', -zl(299.99), { impulse: 'impulse', logNote: 'promocja' }))
  push(card(ref('ret'), addDays(anchor, -52), 'ZARA POLSKA', zl(149.99)))
  // An awaited return (F34): a parcel sent back, the money not here yet.
  push(card(ref('await'), addDays(anchor, -12), 'ALLEGRO', -zl(320), { awaitReturn: { amount: zl(320), until: addDays(anchor, 18) }, impulse: 'plan' }))

  // ---- XTB and ICTTJ (E5): payouts of every pool, a top-up, a payout without its entry, PIT-38
  const ictj: IctjPayout[] = []
  let p = 0
  const payout = (date: string, amount: number, pool: IctjPayout['pool'], to: IctjPayout['to'], kind: IctjPayout['kind'] = 'withdrawal') => {
    const id = fid(70, ++p)
    ictj.push({ id, kind, date, amount, pool, to })
    return id
  }
  const withdrawals: Array<[number, number, IctjPayout['pool'], 'mbank' | 'wallet']> = [
    [1, 4000, 'current', 'mbank'],
    [3, 3500, 'current', 'mbank'],
    [5, 5000, 'surplus', 'mbank'],
    [7, 3000, 'current', 'mbank'],
    [9, 2500, 'goals', 'wallet'],
    [10, 4500, 'current', 'mbank'],
    [12, 2000, 'goals', 'wallet'],
    [13, 3000, 'surplus', 'mbank']
  ]
  for (const [k, amount, pool, to] of withdrawals) {
    const date = weekdayOnOrAfter(dayIn(addMonths(startMonth, k), 18))
    if (date > historyEnd) continue
    const id = payout(date, amount, pool, to)
    const bookedOn = addDays(date, 1)
    if (to === 'mbank') push(transferIn(ref('xtb'), weekdayOnOrAfter(bookedOn), 'XTB S.A.', 'WYPLATA SRODKOW 4421987', zl(amount), { ictj: { id, pool, date } }))
    else manual.push({ date: bookedOn, time: '10:05', accountId: WALLET, kind: 'trading', amount: zl(amount), categoryId: null, counterparty: 'XTB S.A.', ictj: { id, pool, date } })
  }
  // The pool „Podatek” (a flow outside the budget) in February, PIT-38 paid from it by 30 April.
  const taxYear = Number(anchor.slice(0, 4)) - (anchor.slice(5, 7) <= '04' ? 1 : 0)
  const taxIn = weekdayOnOrAfter(`${taxYear}-02-16`)
  if (taxIn >= start && taxIn <= historyEnd) {
    const id = payout(addDays(taxIn, -1), 1800, 'tax', 'mbank')
    push(transferIn(ref('xtb'), taxIn, 'XTB S.A.', 'WYPLATA SRODKOW 4421987', zl(1800), { ictj: { id, pool: 'tax', date: addDays(taxIn, -1) } }))
    push(transferOut(ref('pit'), weekdayOnOrAfter(`${taxYear}-04-27`), 'URZĄD SKARBOWY W TESTOWIE', `PIT-38 ZA ${taxYear - 1}`, zl(1800)))
  }
  // A top-up of the trading account (a return to the mass): checked by the firewall (D23).
  const topUp = weekdayOnOrAfter(dayIn(addMonths(startMonth, 6), 5))
  payout(topUp, 1000, 'current', 'mbank', 'return')
  push(transferOut(ref('xtb'), topUp, 'XTB S.A.', 'ZASILENIE RACHUNKU 4421987', zl(1000)))
  // An XTB payout in mBank without its ICTTJ entry (a reminder to write it in ICTTJ).
  push(transferIn(ref('xtb'), weekdayOnOrAfter(addDays(anchor, -20)), 'XTB S.A.', 'WYPLATA SRODKOW 4421987', zl(1000)))
  // Recent, not docked yet: a payout with its mBank row in the recent file; a payout of the pool Cele without a pair
  // (Portfel XTB after 3 working days, D72).
  const fresh = addDays(anchor, -3)
  const freshId = payout(fresh, 3200, 'current', 'mbank')
  recent.push({ ...transferIn(ref('xtb'), addDays(anchor, -2), 'XTB S.A.', 'WYPLATA SRODKOW 4421987', zl(3200)), after: { ictj: { id: freshId, pool: 'current', date: fresh } } })
  payout(addDays(anchor, -9), 1500, 'goals', 'none')

  // ---- the recent file (lista operacji, not imported yet): a pending purchase, a typed one to merge
  const typed = recent.find((e) => e.typed) ?? null
  if (!typed) {
    const d = addDays(anchor, -3)
    recent.push({ ...card(ref('card'), d, 'BIEDRONKA 1234', -zl(87.45)), typed: { time: '19:10', name: 'Biedronka', categoryId: cat(1, 1) } })
  }
  const last = addDays(anchor, -1)
  recent.push({ ...card(ref('pend'), last, 'ZABKA Z1234', -zl(23.5)), pending: true })
  recent.push({ ...card(ref('pend'), last, 'ORLEN STACJA 4123', -zl(212.3)), pending: true })

  // ---- today: a coffee on Portfel XTB in the morning
  manual.push({ date: anchor, time: '08:10', accountId: WALLET, kind: 'expense', amount: -zl(12), categoryId: cat(1, 3), counterparty: 'Mokka' })

  // ---- typed by hand before the import (merged by it): from the history and the recent file
  for (const e of [...history, ...recent]) {
    if (!e.typed) continue
    manual.push({ date: e.date, time: e.typed.time, accountId: MBANK, kind: 'expense', amount: e.amount, categoryId: e.typed.categoryId, counterparty: e.typed.name, impulse: e.after?.impulse ?? null, logNote: e.after?.logNote })
  }

  history.sort((a, b) => a.date.localeCompare(b.date))
  recent.sort((a, b) => a.date.localeCompare(b.date))

  // ---- records seeded before the import
  const at = `${start}T08:00:00.000Z`
  const containers = [
    { id: C.rent, name: 'Czynsz', type: 'fixed', amount: zl(1450), cycleMonths: 1, dueMonth: startMonth, dueDay: 10, accountId: MBANK, categoryId: cat(2, 1), counterparty: 'WSPÓLNOTA MIESZKANIOWA TESTOWA 1', from: startMonth },
    { id: C.internet, name: 'Internet Netia', type: 'subscription', amount: zl(60), cycleMonths: 1, dueMonth: startMonth, dueDay: 15, accountId: MBANK, categoryId: cat(7, 2), counterparty: 'NETIA SA', from: startMonth },
    { id: C.phone, name: 'Telefon Play', type: 'subscription', amount: zl(50), cycleMonths: 1, dueMonth: startMonth, dueDay: 20, accountId: MBANK, categoryId: cat(7, 1), counterparty: 'P4 SP. Z O.O.', from: startMonth },
    { id: C.netflix, name: 'Netflix', type: 'subscription', amount: zl(43), cycleMonths: 1, dueMonth: startMonth, dueDay: 5, accountId: MBANK, categoryId: cat(7, 3), counterparty: 'NETFLIX.COM', from: startMonth },
    { id: C.gym, name: 'CityFit', type: 'subscription', amount: zl(129), cycleMonths: 1, dueMonth: startMonth, dueDay: 1, accountId: MBANK, categoryId: cat(5, 3), counterparty: 'CITYFIT', from: startMonth },
    { id: C.spotify, name: 'Spotify', type: 'subscription', amount: zl(23.99), cycleMonths: 1, dueMonth: startMonth, dueDay: 8, accountId: MBANK, categoryId: cat(7, 3), counterparty: 'SPOTIFY', from: startMonth },
    { id: C.insurance, name: 'OC samochodu', type: 'fixed', amount: zl(1240), cycleMonths: 12, dueMonth: insuranceMonth, dueDay: 25, accountId: MBANK, categoryId: cat(3, 3), counterparty: 'PZU SA', from: startMonth },
    { id: C.propertyTax, name: 'Podatek od nieruchomości', type: 'fixed', amount: zl(150), cycleMonths: 12, dueMonth: `${startMonth.slice(0, 4)}-03`, dueDay: 15, accountId: MBANK, categoryId: cat(2, 1), counterparty: 'URZĄD MIASTA TESTOWO', from: startMonth, schedule: [3, 5, 9, 11] },
    { id: C.power, name: 'Prąd', type: 'fixed', amount: zl(210), cycleMonths: 2, dueMonth: Number(startMonth.slice(5)) % 2 === 1 ? startMonth : addMonths(startMonth, 1), dueDay: 20, accountId: MBANK, categoryId: cat(2, 2), counterparty: 'TAURON SPRZEDAŻ SP. Z O.O.', from: startMonth, variable: true },
    { id: C.parents, name: 'Rata – rodzice', type: 'installment', amount: zl(500), cycleMonths: 1, dueMonth: parentsFrom, dueDay: 28, accountId: MBANK, categoryId: null, counterparty: 'ROBERT TESTOWY', from: parentsFrom, until: parentsUntil, loanId: LOAN_PARENTS }
  ].map((c) => ({ createdAt: at, updatedAt: at, ...c }))

  const sched = (from: string, months: number, day: number, amount: number, ids: number) =>
    Array.from({ length: months }, (_, i) => ({ id: fid(51, ids + i), date: weekdayOnOrAfter(dayIn(addMonths(monthOf(from), i), day)), amount }))
  const loans = [
    {
      id: LOAN_TOMEK,
      name: 'Pożyczka dla Tomka',
      direction: 'given',
      counterparty: 'TOMASZ KOLEGA',
      amount: zl(2000),
      date: weekdayOnOrAfter(addDays(anchor, -150)),
      accountId: MBANK,
      schedule: [120, 90, 60, 30].map((k, i) => ({ id: fid(51, 1 + i), date: weekdayOnOrAfter(addDays(anchor, -k)), amount: zl(500) })),
      createdAt: `${addDays(anchor, -150)}T18:00:00.000Z`,
      updatedAt: `${addDays(anchor, -150)}T18:00:00.000Z`
    },
    {
      id: LOAN_PARENTS,
      name: 'Pożyczka od rodziców',
      direction: 'taken',
      counterparty: 'ROBERT TESTOWY',
      amount: zl(6000),
      date: weekdayOnOrAfter(addDays(start, 30)),
      accountId: MBANK,
      schedule: sched(`${parentsFrom}-01`, 12, 28, zl(500), 10),
      createdAt: at,
      updatedAt: at
    }
  ]

  const goals = [
    { id: GOAL_LAPTOP, name: 'Nowy laptop', target: zl(6000), priority: 1, deadline: addMonths(M, 6), activeFrom: `${addDays(start, 60)}T09:00:00.000Z`, rates: [{ from: addMonths(M, -2), until: null }] },
    { id: GOAL_TRIP, name: 'Wakacje 2027', target: zl(8000), priority: 2, deadline: null, activeFrom: `${addDays(start, 100)}T09:00:00.000Z` },
    {
      id: GOAL_BIKE,
      name: 'Rower',
      target: zl(2500),
      priority: 3,
      deadline: null,
      archived: true,
      achievedAt: `${addDays(start, 200)}T09:00:00.000Z`,
      activeFrom: `${addDays(start, 20)}T09:00:00.000Z`,
      transfers: [{ at: `${addDays(start, 220)}T09:00:00.000Z`, to: 'shields', amount: zl(2500) }]
    }
  ].map((g) => ({ createdAt: at, updatedAt: at, source: 'own', ...g }))

  const monthsRecords = months.map((m) => ({ month: m, salary: zl(6500), envelopes: envelopes(m, M), createdAt: at, updatedAt: at }))

  const balances = [
    { date: start, accountId: MBANK, kind: 'opening', amount: zl(18000) },
    { date: start, accountId: WALLET, kind: 'opening', amount: zl(2500) },
    { date: start, accountId: CASH, kind: 'opening', amount: zl(300) }
  ].map((b) => ({ createdAt: at, updatedAt: at, ...b }))

  const scheduled = [
    { name: 'Wesele Oli – prezent', date: addDays(anchor, 18), amount: -zl(800), categoryId: cat(9, 1), accountId: MBANK },
    { name: 'Zwrot PIT-37', date: addDays(anchor, 45), amount: zl(1450), categoryId: null, accountId: MBANK, counterparty: 'URZĄD SKARBOWY W TESTOWIE' },
    { name: 'Wymiana dowodu osobistego', date: addDays(anchor, 55), amount: null, yearly: false }
  ].map((s) => ({ createdAt: at, updatedAt: at, ...s }))

  const settings = (s: Settings): Settings => ({
    ...s,
    budget: { ...s.budget, start, initial: { shields: zl(15000), hull: zl(5800), goals: {} } },
    import: { ...s.import, ownNames: ['JAN KAPITAN'] },
    household: {
      ...s.household,
      members: [
        { id: ANNA, name: 'Anna', bankNames: ['ANNA TESTOWA'], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 } },
        { id: KASIA, name: 'Kasia', bankNames: [], inflow: 'advance', archived: false, via: ANNA, opening: { owed: 0, deposit: 0 } },
        { id: MAREK, name: 'Marek', bankNames: ['MAREK TESTOWY'], inflow: 'ask', archived: false, via: null, opening: { owed: 0, deposit: 0 } }
      ],
      since: null,
      assignFrom
    },
    // The game came later than the budget (as with the user: the budget from 0.x, the game from 1.2.0) – 60 days of it.
    // Over ~105 days Operacje loops in 1.15.4 (React #185, found in AU-2) – a state of its own shows that.
    game: { ...s.game, start: addDays(anchor, -60) }
  })

  return {
    anchor,
    start,
    historyEnd,
    settings,
    records: { containers, loans, goals, months: monthsRecords, balances, scheduled },
    manual,
    history,
    recent: recent.filter((e) => e.date >= recentFrom),
    ictj,
    decisions: DECISIONS,
    openingMbank: zl(18000)
  }
}

// ------------------------------------------------------------------ the bank's files

/** Windows-1250 bytes of a text (ASCII and the Polish letters – all the files have). */
export function cp1250(text: string): Buffer {
  const map: Record<string, number> = { ą: 0xb9, ć: 0xe6, ę: 0xea, ł: 0xb3, ń: 0xf1, ó: 0xf3, ś: 0x9c, ź: 0x9f, ż: 0xbf, Ą: 0xa5, Ć: 0xc6, Ę: 0xca, Ł: 0xa3, Ń: 0xd1, Ó: 0xd3, Ś: 0x8c, Ź: 0x8f, Ż: 0xaf }
  const out: number[] = []
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (code < 0x80) out.push(code)
    else if (map[ch] != null) out.push(map[ch]!)
    else throw new Error(`cp1250: znak spoza tabeli „${ch}”`)
  }
  return Buffer.from(out)
}

const plDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`
/** „1 450,00”, „-850,00” as mBank writes amounts. */
export function plAmount(g: number): string {
  const sign = g < 0 ? '-' : ''
  const abs = Math.abs(g)
  const zlPart = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}${zlPart},${String(abs % 100).padStart(2, '0')}`
}

/** The account history (`historia rachunku`): running balances from `opening`; returns the text and the end balance. */
export function historiaCsv(events: readonly BankEvent[], from: string, to: string, opening: number): { text: string; end: number } {
  let balance = opening
  const lines = [
    'mBank S.A. Bankowość Detaliczna;',
    '#Klient;',
    'JAN KAPITAN;',
    '#Numer rachunku;',
    '12 1140 2004 0000 3102 0000 0001;',
    '#Za okres:;',
    `${plDate(from)};${plDate(to)};`,
    '#Data księgowania;#Data operacji;#Opis operacji;#Tytuł;#Nadawca/Odbiorca;#Numer konta;#Kwota;#Saldo po operacji;'
  ]
  for (const e of events) {
    balance += e.amount
    lines.push(`${plDate(e.date)};${plDate(e.date)};${e.op};"${e.title}";"${e.who}";${e.acct};${plAmount(e.amount)};${plAmount(balance)};`)
  }
  lines.push(';', `#Saldo końcowe;${plAmount(balance)};`)
  return { text: `${lines.join('\r\n')}\r\n`, end: balance }
}

/** The list of operations (`lista operacji`): the newest first, pending rows marked as the bank does. */
export function listaCsv(events: readonly BankEvent[], from: string, to: string): string {
  const lines = [
    'mBank S.A. Bankowość Detaliczna;;;',
    '#Klient;;;',
    'JAN KAPITAN;;;',
    ';;;',
    'Lista operacji;;;',
    ';;;',
    '#Za okres:;;;',
    `${plDate(from)};${plDate(to)};;`,
    ';;;',
    '#dla rachunków:;;;',
    'eKonto - 12 1140 2004 0000 3102 0000 0001;;;',
    ';;;',
    '#Data operacji;#Opis operacji;#Kategoria;#Kwota'
  ]
  for (const e of [...events].sort((a, b) => b.date.localeCompare(a.date))) {
    const name = rowName(e)
    const what = e.op.startsWith('ZAKUP') ? 'ZAKUP PRZY UŻYCIU KARTY W KRAJU' : e.op
    const desc = `${name}  ${what}${' '.repeat(40)}${e.pending ? 'transakcja nierozliczona' : ''}`
    lines.push(`${plDate(e.date)};${desc};${e.bankCategory ?? ''};${plAmount(e.amount)} PLN`)
  }
  return `${lines.join('\r\n')}\r\n`
}
