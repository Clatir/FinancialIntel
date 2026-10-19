/**
 * The command (E7, D73; spec „Gra: Dowództwo”). Every day from the game's start is rated – a day without a broken order
 * is compliant – and frozen 24 h after its end (T9): a later correction of the data changes the budget, never a rating
 * or a promotion. From the frozen days come the streak, the rank (30 compliant days in the last 35 since the last
 * change, a mission done = 3 days; the 3rd serious violation of a calendar month demotes), the weekly mission, the
 * hidden achievements and the watch log. Pure: the renderer writes what `advanceGame` returns.
 */
import type { GameSettings } from '../schema/budget'
import { SCHEMA_VERSION } from '../schema/common'
import type { Settings } from '../schema/settings'
import type { GameDay, GameMission, GameMonth, Transaction } from '../schema/records'
import { addDays, addMonths, daysBetween, daysInMonth, firstDayOf, isoWeekOf, mondayOf, mondayOfWeek, monthOf, warsawEndOf, warsawNow, warsawStamp, weekdayOf } from './dates'
import { activeIn, cargoMass, computeFleet, envelopeOverrun, householdOf, type FleetInput, type FleetState, type ShipClass, SHIP_CLASSES } from './fleet'
import { categoryIndex, costOf, isCargoPayment, isConfirmedNight, ownSpent, partsOf, sum } from './operations'
import { debriefing } from './plan'

// ------------------------------------------------------------------ names

export const RANKS = ['cadet', 'ensign', 'lieutenant', 'commander', 'captain', 'admiral'] as const
export type Rank = (typeof RANKS)[number]
export const RANK_LABEL: Record<Rank, string> = {
  cadet: 'Kadet',
  ensign: 'Chorąży',
  lieutenant: 'Porucznik',
  commander: 'Komandor',
  captain: 'Kapitan',
  admiral: 'Admirał'
}

/** The orders a day can break (D73): the ordinary ones break the streak, the serious ones count to a demotion too. */
export const VIOLATIONS = ['daily', 'envelope', 'cargo', 'envelope-serious', 'shields', 'firewall', 'quiet'] as const
export type ViolationKind = (typeof VIOLATIONS)[number]
export const VIOLATION_LABEL: Record<ViolationKind, string> = {
  daily: 'Przydział dnia przekroczony',
  envelope: 'Koperta przekroczona',
  cargo: 'Ładunek ponad linią zanurzenia',
  'envelope-serious': 'Koperta przekroczona ponad próg',
  shields: 'Osłony poniżej minimum',
  firewall: 'Dopłata do XTB wbrew firewallowi',
  quiet: 'Zakup w ciszy nocnej'
}
const SERIOUS: ReadonlySet<string> = new Set<ViolationKind>(['envelope-serious', 'shields', 'firewall', 'quiet'])

/** The ICT flavour of a day (D73): a mark in the watch log, never a violation. */
export const TAG_LABEL: Record<string, string> = {
  judas: 'Judas Swing – zakup oznaczony jako impuls',
  turtle: 'Turtle Soup – zwrot towaru',
  sweep: 'Liquidity sweep – energia dnia zebrana co do grosza',
  nospend: 'Dzień bez wydatków – potwierdzony w raporcie wachty'
}

export const MISSIONS = ['quiet', 'envelope', 'energy', 'impulse', 'killzone', 'house', 'import', 'balances', 'nospend'] as const
export type MissionTemplate = (typeof MISSIONS)[number]
export const MISSION_TITLE: Record<MissionTemplate, string> = {
  quiet: 'Cisza w eterze',
  envelope: 'Koperta pod kontrolą',
  energy: 'Pełna energia',
  impulse: 'Zero impulsów',
  killzone: 'Killzone',
  house: 'Rozliczenie z domem',
  import: 'Łączność z bazą',
  balances: 'Inwentaryzacja',
  nospend: 'Dzień bez wydatków'
}
/** Missions any week can have, in turn when the last weeks show no weak point. */
const ROTATION: readonly MissionTemplate[] = ['nospend', 'impulse', 'energy', 'balances']

export const ACHIEVEMENTS = ['quiet30', 'shields', 'hull', 'asteroid', 'dock', 'goal', 'streak7', 'streak30', 'streak100', 'hattrick', 'sniper', 'clean', 'flagship'] as const
export type AchievementId = (typeof ACHIEVEMENTS)[number]
export const ACHIEVEMENT_INFO: Record<AchievementId, { name: string; text: string }> = {
  quiet30: { name: 'Cisza w eterze', text: '30 dni bez zakupów w ciszy nocnej.' },
  shields: { name: 'Pełne osłony', text: 'Osłony doszły do swojego celu.' },
  hull: { name: 'Pancerny kadłub', text: 'Kadłub doszedł do swojego celu.' },
  asteroid: { name: 'Asteroida rozbita', text: 'Opłata okresowa zapłacona w całości ze zbiornika.' },
  dock: { name: 'Pierwsze dokowanie', text: 'Wypłata z ICTTJ zadokowana.' },
  goal: { name: 'Cel osiągnięty', text: 'Cel z Mapy gwiezdnej osiągnięty.' },
  streak7: { name: 'Seria 7', text: '7 dni zgodnych z rzędu.' },
  streak30: { name: 'Seria 30', text: '30 dni zgodnych z rzędu.' },
  streak100: { name: 'Seria 100', text: '100 dni zgodnych z rzędu.' },
  hattrick: { name: 'Hat-trick', text: 'Trzy miesiące z rzędu zamknięte na plus.' },
  sniper: { name: 'Snajper', text: 'Miesiąc, w którym każda koperta zamknęła się w 90–100% limitu.' },
  clean: { name: 'Czyste konto', text: 'Pożyczka wzięta spłacona w całości.' },
  flagship: { name: 'Flagowiec', text: 'Zasięg 12 miesięcy – klasa Flagowiec.' }
}

export const WEEKDAY_NAME = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'] as const

/** What a mission asks for (`label` names an envelope's category, `money` formats – the hidden amounts mask them). */
export function missionText(m: Pick<GameMission, 'template' | 'params'>, label: (categoryId: string) => string, money: (grosze: number) => string): string {
  const p = m.params
  const hour = Number(p.hour ?? 0)
  switch (m.template) {
    case 'quiet':
      return 'cały tydzień bez zakupów w ciszy nocnej.'
    case 'envelope':
      return `koperta ${label(String(p.categoryId ?? ''))} najwyżej ${money(Number(p.target ?? 0))} w tym tygodniu (80% jej części tygodnia).`
    case 'energy':
      return '7 dni bez przekroczenia przydziału dnia.'
    case 'impulse':
      return 'żaden zakup oznaczony jako impuls.'
    case 'killzone':
      return `Twoja killzone wydatków – ${WEEKDAY_NAME[Number(p.weekday ?? 1) - 1] ?? ''} ${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00: najwyżej ${money(Number(p.target ?? 0))} (połowa średniej).`
    case 'house':
      return 'zmniejsz to, co domownicy mają oddać – rozlicz się z nimi.'
    case 'import':
      return 'co najmniej 2 importy z mBanku w tym tygodniu.'
    case 'balances':
      return 'potwierdź salda wszystkich kont.'
    case 'nospend':
      return 'co najmniej 2 dni bez żadnego wydatku.'
    default:
      return m.template
  }
}

export const missionTitle = (template: string): string => MISSION_TITLE[template as MissionTemplate] ?? template

// ------------------------------------------------------------------ the data

export type GameInput = Omit<FleetInput, 'now' | 'settings'> & {
  settings: FleetInput['settings'] & Pick<Settings, 'game' | 'import'>
  game: readonly GameMonth[]
}

/** Fixed ids (valid ULIDs): two computers writing the same month, mission or change of rank write the same record. */
const fixedId = (kind: string, digits: string) => `01K${kind}${digits.padStart(23 - kind.length, '0')}`
export const gameMonthId = (month: string): string => fixedId('GAME', month.replace('-', ''))
export const missionId = (week: string): string => fixedId('MSN', week.replace('-W', ''))
export const rankChangeId = (day: string): string => fixedId('RANK', day.replaceAll('-', ''))

export function newGameMonth(month: string, stamp: string): GameMonth {
  return { schemaVersion: SCHEMA_VERSION, id: gameMonthId(month), createdAt: stamp, updatedAt: stamp, month, days: {}, missions: [], promotions: [], achievements: [] }
}

/** Sunday of an ISO week. */
export const sundayOf = (week: string): string => addDays(mondayOfWeek(week), 6)

/** The first Monday of the missions: the game's first full week. */
export const firstMissionMonday = (start: string): string => (weekdayOf(start) === 1 ? start : addDays(mondayOf(start), 7))

const allDays = (game: Iterable<GameMonth>): Map<string, GameDay> => {
  const out = new Map<string, GameDay>()
  for (const g of game) for (const [d, day] of Object.entries(g.days)) out.set(d, day)
  return out
}
const allMissions = (game: Iterable<GameMonth>): Array<{ month: string; mission: GameMission }> => [...game].flatMap((g) => g.missions.map((mission) => ({ month: g.month, mission })))
const allChanges = (game: readonly GameMonth[]) =>
  [...game].flatMap((g) => g.promotions.map((p) => ({ ...p, day: p.day ?? warsawStamp(p.at).slice(0, 10) }))).sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id))

const isRank = (x: string): x is Rank => (RANKS as readonly string[]).includes(x)

/** The rank now and the day of its last change (null = none since the start). */
export function rankOf(game: readonly GameMonth[]): { rank: Rank; since: string | null } {
  const last = allChanges(game).at(-1)
  return last && isRank(last.rank) ? { rank: last.rank, since: last.day } : { rank: 'cadet', since: null }
}

/** Compliant days in a row ending at `date` (a broken or missing day ends the streak). */
function streakAt(days: ReadonlyMap<string, GameDay>, date: string): number {
  let n = 0
  for (let d = date; days.get(d)?.status === 'ok'; d = addDays(d, -1)) n++
  return n
}

const seriousIn = (days: ReadonlyMap<string, GameDay>, from: string, to: string): number => {
  let n = 0
  for (let d = from; d <= to; d = addDays(d, 1)) n += days.get(d)?.violations.filter((v) => v.serious).length ?? 0
  return n
}

const later = (a: string, b: string) => (a > b ? a : b)

// ------------------------------------------------------------------ one day

export interface DayRating {
  date: string
  status: 'ok' | 'broken'
  violations: GameDay['violations']
  cls: ShipClass | null
  /** The cargo's monthly mass at the day's end. */
  cargo: number | null
  tags: string[]
  /** The state at the day's end (the achievements read it). */
  fleet: FleetState
}

/** Operations a decision moves the shields with (a salary, a correction, PIT-38 and own installments are not decisions). */
const DECISIONS: ReadonlySet<string> = new Set(['expense', 'income', 'trading', 'loan', 'transfer'])

const dateOf = (iso: string) => warsawStamp(iso).slice(0, 10)

/**
 * A day as its end saw it (D73): the allowance and the planned envelopes over, a container added or changed above the
 * load line (ordinary); an envelope over by more than the threshold, the shields below their minimum by a decision, a
 * top-up of the trading account against the firewall, a purchase in the quiet hours (serious).
 */
/** Names in a violation's note: the first three and how many more (B32 – a note stays short whatever the day added). */
export function namesNote(names: readonly string[]): string {
  const shown = names.slice(0, 3).join(', ')
  return names.length > 3 ? `${shown} i ${names.length - 3} innych` : shown
}

export function rateDay(input: GameInput, date: string, prev: GameDay | null = null): DayRating {
  const f = computeFleet({ ...input, now: warsawEndOf(date) })
  const { settings } = input
  const violations: GameDay['violations'] = []
  const add = (order: ViolationKind, amount: number | null, ref: string | null = null, note = '') => violations.push({ order, serious: SERIOUS.has(order), note: note.slice(0, 500), ref, amount })
  const txs = input.transactions.filter((t) => t.date === date)
  const tags: string[] = []
  let cargo: number | null = null
  if (f.started) {
    if (f.daily && f.daily.left < 0) add('daily', -f.daily.left)
    // A planned envelope going over its limit today; over by more than the threshold – serious (once each).
    for (const e of f.envelopes) {
      if (e.kind !== 'planned') continue
      // As the engine's alarm (N102): the same rule, the step crossed today.
      const now = envelopeOverrun(e, settings.game.seriousEnvelopePct)
      const before = envelopeOverrun({ limit: e.limit, spent: e.spent - e.today }, settings.game.seriousEnvelopePct)
      if (now.serious && !before.serious) add('envelope-serious', e.spent - e.limit, e.categoryId)
      else if (now.over && !before.over) add('envelope', e.spent - e.limit, e.categoryId)
    }
    // The cargo above the load line after a container was added or raised: the mass grew against the day before (as
    // that day was frozen), else a container added today – the containers known at the day's end.
    const containers = input.containers ?? []
    const known = containers.filter((c) => dateOf(c.createdAt) <= date)
    const mass = cargoMass(known, monthOf(date), f.plan?.salary ?? null, settings.orders.cargoLimitPct)
    cargo = mass.monthly
    const added = known.filter((c) => dateOf(c.createdAt) === date && activeIn(c, monthOf(date)))
    const grew = prev?.cargo != null && monthOf(addDays(date, -1)) === monthOf(date) ? mass.monthly > prev.cargo : added.length > 0
    if (mass.over && grew) add('cargo', mass.monthly, added[0]?.id ?? null, namesNote(added.map((c) => c.name)))
    // The shields below their minimum at the day's end after the day's decisions took money out of them – what they lent
    // for a household member's purchase or paid of their gift is no decision of mine (D80 f, D83, N5).
    const min = f.shields.min
    if (min != null && f.shields.amount < min) {
      const byId = new Map(txs.map((t) => [t.id, t]))
      const taken = new Set((input.loans ?? []).filter((l) => l.direction === 'taken').map((l) => l.id))
      const forMembers = (txId: string | undefined) => sum((f.household.byTx.get(txId ?? '') ?? []).map((x) => x.lent + Math.max(0, x.gift)))
      const moved = sum(
        f.log
          .filter((e) => e.date === date && DECISIONS.has(e.kind))
          .filter((e) => !(e.kind === 'loan' && taken.has(byId.get(e.txId ?? '')?.loanId ?? '')))
          .map((e) => (e.moves.shields ?? 0) + (e.moves.hull ?? 0) + (e.kind === 'expense' ? forMembers(e.txId) : 0))
      )
      if (moved < 0) add('shields', min - f.shields.amount)
    }
    for (const a of f.alarms) if (a.kind === 'firewall' && a.date === date) add('firewall', a.amount, a.txId ?? null)
    // A purchase in the quiet hours: my own part of it (a household member's part is theirs – N5).
    // A confirmed purchase in the quiet hours (D40, N10): its time in the window and its entry in the log.
    for (const t of txs) if (isConfirmedNight(t, settings.orders) && ownSpent(t) > 0) add('quiet', ownSpent(t), t.id, t.counterparty)
    if (txs.some((t) => t.kind === 'expense' && t.impulse === 'impulse' && ownSpent(t) > 0)) tags.push('judas')
    if (txs.some((t) => t.kind === 'expense' && t.amount > 0 && !t.refundable && !t.goalId && !t.splits.length)) tags.push('turtle')
    if (f.daily && f.daily.left === 0 && f.daily.spentToday > 0) tags.push('sweep')
    // Confirmed in the evening report (F13), and a day without expenses as the „nospend” mission counts it.
    if (settings.game.noSpend[date] && dayCost(txs) <= 0) tags.push('nospend')
  }
  return { date, status: violations.length ? 'broken' : 'ok', violations, cls: f.shipClass, cargo, tags, fleet: f }
}

// ------------------------------------------------------------------ the missions

export interface MissionPick {
  template: MissionTemplate
  params: Record<string, string | number>
}

const dayCost = (txs: readonly Transaction[]) => sum(txs.map(costOf))

/** Costs of the envelopes' main categories in [from, to] as the envelopes count them (no cargo, goals, house), in one pass. */
function envelopesSpent(input: GameInput, from: string, to: string): Map<string, number> {
  const cats = categoryIndex(input.settings.categories)
  const ids = new Set((input.containers ?? []).map((c) => c.id))
  const out = new Map<string, number>()
  for (const t of input.transactions) {
    if (t.date < from || t.date > to || t.kind !== 'expense' || t.goalId || isCargoPayment(t, ids)) continue
    for (const p of partsOf(t)) {
      const main = p.refundable ? null : cats.mainOf(p.categoryId)?.id
      if (main) out.set(main, (out.get(main) ?? 0) - p.amount)
    }
  }
  return out
}

interface Slot {
  weekday: number
  hour: number
  cost: number
}

/** The killzone of spending: the weekday × hour with the most costs among the operations with a time. */
export function killzoneOf(transactions: readonly Transaction[]): { top: Slot | null; total: number; count: number } {
  const slots = new Map<string, Slot>()
  let total = 0
  let count = 0
  for (const t of transactions) {
    const cost = costOf(t)
    if (t.time == null || cost <= 0) continue
    const weekday = weekdayOf(t.date)
    const hour = Number(t.time.slice(0, 2))
    const s = slots.get(`${weekday} ${hour}`) ?? { weekday, hour, cost: 0 }
    s.cost += cost
    slots.set(`${weekday} ${hour}`, s)
    total += cost
    count++
  }
  const top = [...slots.values()].sort((a, b) => b.cost - a.cost || a.weekday - b.weekday || a.hour - b.hour)[0] ?? null
  return { top, total, count }
}

const KILLZONE_MIN_COUNT = 8
const KILLZONE_SHARE = 0.25

/**
 * The week's mission (D73): the first weak point of the 4 weeks before its Monday – in this order – other than last
 * week's mission; without one, the next of the missions every week can have.
 */
export function chooseMission(input: GameInput, monday: string, lastTemplate: string | null, game: readonly GameMonth[] = input.game): MissionPick {
  const from = addDays(monday, -28)
  const to = addDays(monday, -1)
  const txs = input.transactions.filter((t) => t.date >= from && t.date <= to)
  const days = allDays(game)
  const month = monthOf(monday)
  const weak: Partial<Record<MissionTemplate, () => MissionPick | null>> = {
    quiet: () => (txs.some((t) => isConfirmedNight(t, input.settings.orders) && ownSpent(t) > 0) ? { template: 'quiet', params: {} } : null),
    envelope: () => {
      // The planned envelope most over its limit: last month and this month's pace so far.
      const cats = categoryIndex(input.settings.categories)
      let best: { id: string; ratio: number } | null = null
      const thisMonth = envelopesSpent(input, firstDayOf(monthOf(to)), to)
      for (const m of [monthOf(to), addMonths(monthOf(to), -1)]) {
        const d = debriefing(m, { transactions: input.transactions, categories: input.settings.categories, plans: input.months ?? [], containers: input.containers ?? [], today: to })
        const elapsed = m === monthOf(to) ? Number(to.slice(8, 10)) / daysInMonth(m) : 1
        for (const e of d.envelopes) {
          if (e.kind !== 'planned' || e.limit <= 0) continue
          const spent = m === monthOf(to) ? (thisMonth.get(e.categoryId) ?? 0) : e.spent
          const ratio = spent / (e.limit * elapsed)
          if (ratio > 1 && (!best || ratio > best.ratio) && cats.byId.has(e.categoryId)) best = { id: e.categoryId, ratio }
        }
      }
      if (!best) return null
      const plan = (input.months ?? []).filter((p) => p.month <= month).sort((a, b) => b.month.localeCompare(a.month))[0]
      const limit = plan?.envelopes[best.id] ?? 0
      return limit > 0 ? { template: 'envelope', params: { categoryId: best.id, target: Math.floor((limit * 7 * 0.8) / daysInMonth(month)) } } : null
    },
    energy: () => {
      let over = 0
      for (let d = from; d <= to; d = addDays(d, 1)) if (days.get(d)?.violations.some((v) => v.order === 'daily')) over++
      return over >= 2 ? { template: 'energy', params: {} } : null
    },
    impulse: () => (txs.filter((t) => t.kind === 'expense' && t.impulse === 'impulse' && ownSpent(t) > 0).length >= 2 ? { template: 'impulse', params: {} } : null),
    killzone: () => {
      const k = killzoneOf(txs)
      if (!k.top || k.count < KILLZONE_MIN_COUNT || k.top.cost < k.total * KILLZONE_SHARE) return null
      return { template: 'killzone', params: { weekday: k.top.weekday, hour: k.top.hour, target: Math.floor(k.top.cost / 4 / 2) } }
    },
    house: () => {
      const f = computeFleet({ ...input, now: warsawEndOf(to) })
      return f.receivables.house > 0 && f.receivables.houseSince && daysBetween(f.receivables.houseSince, monday) > 14 ? { template: 'house', params: {} } : null
    },
    import: () => {
      const banks = input.settings.accounts.filter((a) => !a.archived && a.importFormat === 'mbank')
      if (!banks.length) return null
      // As the Monday saw it: the imports before it only.
      const seen = [...Object.keys(input.settings.import.log), ...Object.values(input.settings.import.lastImport)].filter((x) => dateOf(x) < monday).sort()
      const last = seen.at(-1)
      return !last || daysBetween(dateOf(last), monday) > 4 ? { template: 'import', params: {} } : null
    },
    balances: () => ((input.balances ?? []).some((b) => b.kind === 'confirmation' && b.date >= from && b.date <= to) ? null : { template: 'balances', params: {} }),
    nospend: () => {
      let free = 0
      for (let d = from; d <= to; d = addDays(d, 1)) if (dayCost(txs.filter((t) => t.date === d)) <= 0) free++
      return free < 4 ? { template: 'nospend', params: {} } : null
    }
  }
  for (const t of MISSIONS) {
    if (t === lastTemplate) continue
    const pick = weak[t]?.()
    if (pick) return pick
  }
  const n = Number(isoWeekOf(monday).slice(6, 8))
  const order = [...ROTATION.slice(n % ROTATION.length), ...ROTATION.slice(0, n % ROTATION.length)]
  return { template: order.find((t) => t !== lastTemplate) ?? order[0]!, params: {} }
}

export interface MissionStatus {
  /** Done so far (a „none of” mission) or done already (an „at least” one). */
  ok: boolean
  have?: number
  need?: number
  /** An amount the target counts (spent in the envelope, in the killzone). */
  amount?: number
}

/** A mission over its week up to `upTo` (the Sunday when judged; today while it runs). */
export function missionStatus(input: GameInput, mission: Pick<GameMission, 'template' | 'week' | 'params'>, upTo: string, game: readonly GameMonth[] = input.game): MissionStatus {
  const monday = mondayOfWeek(mission.week)
  const to = upTo < sundayOf(mission.week) ? upTo : sundayOf(mission.week)
  const txs = input.transactions.filter((t) => t.date >= monday && t.date <= to)
  const num = (k: string) => Number(mission.params[k] ?? 0)
  switch (mission.template) {
    case 'quiet':
      return { ok: !txs.some((t) => isConfirmedNight(t, input.settings.orders) && ownSpent(t) > 0) }
    case 'impulse':
      return { ok: !txs.some((t) => t.kind === 'expense' && t.impulse === 'impulse' && ownSpent(t) > 0) }
    case 'energy': {
      const days = allDays(game)
      let over = 0
      for (let d = monday; d <= to; d = addDays(d, 1)) if (days.get(d)?.violations.some((v) => v.order === 'daily')) over++
      return { ok: over === 0 }
    }
    case 'envelope': {
      const spent = envelopesSpent(input, monday, to).get(String(mission.params.categoryId ?? '')) ?? 0
      return { ok: spent <= num('target'), amount: spent }
    }
    case 'killzone': {
      const cost = sum(txs.filter((t) => t.time != null && weekdayOf(t.date) === num('weekday') && Number(t.time.slice(0, 2)) === num('hour')).map(costOf))
      return { ok: cost <= num('target'), amount: cost }
    }
    case 'house': {
      // What the household members paid back this week (D80: the engine's ledger as it was on `upTo`).
      const ledger = householdOf(input, upTo, to)
      const back = sum(txs.flatMap((t) => (ledger.byTx.get(t.id) ?? []).map((f) => f.repaid)))
      return { ok: back > 0, amount: back }
    }
    case 'import': {
      const have = Object.keys(input.settings.import.log).filter((x) => dateOf(x) >= monday && dateOf(x) <= to).length
      return { ok: have >= 2, have, need: 2 }
    }
    case 'balances': {
      const accounts = input.settings.accounts.filter((a) => !a.archived)
      const have = accounts.filter((a) => (input.balances ?? []).some((b) => b.kind === 'confirmation' && b.accountId === a.id && b.date >= monday && b.date <= to)).length
      return { ok: accounts.length > 0 && have >= accounts.length, have, need: accounts.length }
    }
    case 'nospend': {
      let have = 0
      for (let d = monday; d <= to; d = addDays(d, 1)) if (dayCost(txs.filter((t) => t.date === d)) <= 0) have++
      return { ok: have >= 2, have, need: 2 }
    }
    default:
      return { ok: false }
  }
}

// ------------------------------------------------------------------ the rank and the achievements

/**
 * The day's change of rank (D73): a serious violation that brings the month's count (since the last change) to the
 * threshold demotes – also when the threshold was lowered meanwhile; else 30 of 35 promotes.
 */
function rankStep(game: readonly GameMonth[], date: string, gs: GameSettings, start: string): { rank: Rank; change: 'up' | 'down' } | null {
  const { rank, since } = rankOf(game)
  const idx = RANKS.indexOf(rank)
  const days = allDays(game)
  const after = since ? addDays(since, 1) : start
  const from = later(firstDayOf(monthOf(date)), after)
  if (idx > 0 && seriousIn(days, date, date) > 0 && seriousIn(days, from, date) >= gs.demoteSerious) return { rank: RANKS[idx - 1]!, change: 'down' }
  if (idx >= RANKS.length - 1) return null
  const p = promotionProgress(game, date, gs, start)
  return p.ok + p.bonus >= gs.promoteDays ? { rank: RANKS[idx + 1]!, change: 'up' } : null
}

/** The way to the next rank at `date`: compliant days and done missions in the window since the last change. */
export function promotionProgress(game: readonly GameMonth[], date: string, gs: GameSettings, start: string): { ok: number; bonus: number; need: number; from: string; to: string } {
  const { since } = rankOf(game)
  const days = allDays(game)
  const from = later(addDays(date, -(gs.windowDays - 1)), since ? addDays(since, 1) : start)
  let ok = 0
  for (let d = from; d <= date; d = addDays(d, 1)) if (days.get(d)?.status === 'ok') ok++
  const missions = allMissions(game).filter(({ mission: m }) => m.done && m.evaluatedAt && sundayOf(m.week) >= from && sundayOf(m.week) <= date).length
  return { ok, bonus: missions * gs.missionDays, need: gs.promoteDays, from, to: date }
}

function newAchievements(input: GameInput, game: readonly GameMonth[], date: string, r: DayRating, start: string): AchievementId[] {
  const have = new Set([...game].flatMap((g) => g.achievements.map((a) => a.id)))
  const days = allDays(game)
  const f = r.fleet
  const out: AchievementId[] = []
  const want = (id: AchievementId, test: () => boolean) => {
    if (!have.has(id) && test()) out.push(id)
  }
  want('quiet30', () => {
    if (daysBetween(start, date) < 29) return false
    for (let d = addDays(date, -29); d <= date; d = addDays(d, 1)) {
      const day = days.get(d)
      if (!day || day.violations.some((v) => v.order === 'quiet')) return false
    }
    return true
  })
  want('shields', () => f.shields.target != null && f.shields.target > 0 && f.shields.amount >= f.shields.target)
  want('hull', () => f.hull.target != null && f.hull.target > 0 && f.hull.amount >= f.hull.target)
  want('asteroid', () => f.log.some((e) => e.date === date && e.kind === 'expense' && Object.values(e.moves.tanks ?? {}).some((v) => v < 0)) && !f.alarms.some((a) => a.kind === 'sinking-short' && a.date === date))
  want('dock', () => (input.dockings ?? []).some((d) => d.ictjEntryId != null && d.date >= start && d.date <= date))
  want('goal', () => f.goals.some((g) => g.target > 0 && g.amount >= g.target))
  const streak = streakAt(days, date)
  want('streak7', () => streak >= 7)
  want('streak30', () => streak >= 30)
  want('streak100', () => streak >= 100)
  if (date.endsWith('-01')) {
    // The month just closed – during the game (a partial first month counts).
    const prev = addMonths(monthOf(date), -1)
    // As the debriefing on the screen: the engine's month (N6) – the fleet at this day's end knows every month before.
    const brief = (m: string) => debriefing(m, { transactions: input.transactions, categories: input.settings.categories, plans: input.months ?? [], log: f.log, alarms: f.alarms, containers: input.containers ?? [], today: date })
    want('hattrick', () => [0, 1, 2].every((i) => addMonths(prev, -i) >= monthOf(start) && brief(addMonths(prev, -i)).plus === true))
    want('sniper', () => {
      if (prev < monthOf(start)) return false
      const env = brief(prev).envelopes.filter((e) => e.limit > 0)
      return env.length >= 2 && env.every((e) => e.spent * 10 >= e.limit * 9 && e.spent <= e.limit)
    })
  }
  want('clean', () => f.loans.some((l) => l.loan.direction === 'taken' && l.total > 0 && l.paid >= l.total))
  want('flagship', () => f.shipClass === 'flagship')
  return out
}

// ------------------------------------------------------------------ advancing the game

export type GameEvent =
  | { kind: 'rank'; change: 'up' | 'down'; rank: Rank; day: string }
  | { kind: 'achievement'; id: AchievementId; day: string }
  | { kind: 'mission'; template: MissionTemplate; week: string; done: boolean }

export interface GameChange {
  /** The month records to write (new or changed), whole. */
  months: GameMonth[]
  events: GameEvent[]
  /** Days still to freeze after this pass (`maxDays` reached): the next pass goes on. */
  more?: boolean
}

/** The game's first day for a computer starting the game now: the next full day (D73). */
export const gameStartFor = (now: Date | string): string => addDays(warsawNow(now).date, 1)

/**
 * Freeze the days that ended 24 h ago and more (T9), judge the missions of their Sundays, change the rank, award the
 * achievements, and give the week its mission. Deterministic: two computers advancing the same data write the same.
 */
/**
 * `hold`: the first day not to freeze yet (B20 – a paired ICTTJ payout still to dock: its pool decides where the money
 * goes); it and the days after it wait.
 */
export function advanceGame(input: GameInput, now: Date | string, opts: { maxDays?: number; locked?: ReadonlySet<string>; hold?: string | null } = {}): GameChange {
  const gs = input.settings.game
  const start = gs.start
  if (!start) return { months: [], events: [] }
  const today = warsawNow(now).date
  const stamp = typeof now === 'string' ? now : now.toISOString()
  const months = new Map<string, GameMonth>()
  for (const g of input.game) months.set(g.month, g)
  const changed = new Set<string>()
  const events: GameEvent[] = []
  const update = (m: string, fn: (g: GameMonth) => GameMonth) => {
    months.set(m, fn(months.get(m) ?? newGameMonth(m, stamp)))
    changed.add(m)
  }
  const missionOf = (week: string) => allMissions([...months.values()]).find((x) => x.mission.week === week) ?? null

  const lastFreezable = addDays(today, -2)
  const frozen = allDays([...months.values()])
  // Each day is a whole run of the engine (W16): at most `maxDays` a pass – the same days in the same order, in parts.
  let rated = 0
  let more = false
  for (let d = start; d <= lastFreezable; d = addDays(d, 1)) {
    // A month this version may not write (a newer one wrote it): its days are that version's to freeze – passed over,
    // never a portion stuck on them.
    if (frozen.has(d) || opts.locked?.has(monthOf(d))) continue
    if (opts.hold && d >= opts.hold) break
    if (opts.maxDays != null && rated >= opts.maxDays) {
      more = true
      break
    }
    rated++
    const r = rateDay(input, d, frozen.get(addDays(d, -1)) ?? null)
    const day: GameDay = { status: r.status, frozenAt: stamp, violations: r.violations, cls: r.cls, cargo: r.cargo, tags: r.tags }
    frozen.set(d, day)
    update(monthOf(d), (g) => ({ ...g, days: { ...g.days, [d]: day } }))
    // The week's mission is judged when its Sunday freezes – before the rank, so a mission done counts at once.
    const found = weekdayOf(d) === 7 ? missionOf(isoWeekOf(d)) : null
    if (found && !found.mission.evaluatedAt) {
      const done = missionStatus(input, found.mission, d, [...months.values()]).ok
      update(found.month, (g) => ({ ...g, missions: g.missions.map((m) => (m.id === found.mission.id ? { ...m, done, evaluatedAt: stamp } : m)) }))
      if ((MISSIONS as readonly string[]).includes(found.mission.template)) events.push({ kind: 'mission', template: found.mission.template as MissionTemplate, week: found.mission.week, done })
    }
    const change = rankStep([...months.values()], d, gs, start)
    if (change) {
      update(monthOf(d), (g) => ({ ...g, promotions: [...g.promotions, { id: rankChangeId(d), at: stamp, rank: change.rank, change: change.change, day: d }] }))
      events.push({ kind: 'rank', change: change.change, rank: change.rank, day: d })
    }
    const won = newAchievements(input, [...months.values()], d, r, start)
    if (won.length) {
      update(monthOf(d), (g) => ({ ...g, achievements: [...g.achievements, ...won.map((id) => ({ id, at: stamp, day: d }))] }))
      for (const id of won) events.push({ kind: 'achievement', id, day: d })
    }
  }

  // This week's mission, from the game's first full week – once no day is left to freeze (it reads the frozen ones).
  const monday = mondayOf(today)
  if (!more && monday >= firstMissionMonday(start)) {
    const week = isoWeekOf(today)
    if (!missionOf(week)) {
      const last = missionOf(isoWeekOf(addDays(monday, -7)))?.mission.template ?? null
      const pick = chooseMission(input, monday, last, [...months.values()])
      update(monthOf(monday), (g) => ({ ...g, missions: [...g.missions, { id: missionId(week), template: pick.template, week, done: false, evaluatedAt: null, params: pick.params }] }))
    }
  }
  return { months: [...changed].sort().map((m) => ({ ...months.get(m)!, updatedAt: stamp })), events, ...(more ? { more } : {}) }
}

// ------------------------------------------------------------------ what the screens show

export type WatchEntry =
  | { kind: 'violation'; date: string; order: string; serious: boolean; amount: number | null; ref: string | null; note: string }
  | { kind: 'tag'; date: string; tag: string }
  | { kind: 'class'; date: string; cls: ShipClass; from: ShipClass; up: boolean }
  | { kind: 'rank'; date: string; rank: Rank; change: 'up' | 'down' }
  | { kind: 'mission'; date: string; template: string; week: string; done: boolean | null; params: GameMission['params'] }
  | { kind: 'achievement'; date: string; id: AchievementId }

export interface GameView {
  start: string | null
  /** The game starts on a later day. */
  waiting: boolean
  rank: Rank
  /** The day of the last change of rank; null = none since the start. */
  rankSince: string | null
  /** The way to the next rank (null at the top). */
  progress: ReturnType<typeof promotionProgress> | null
  /** Serious violations this month since the last change of rank, against the demotion's threshold. */
  serious: { count: number; limit: number }
  streak: number
  record: number
  lastFrozen: string | null
  /** The last `windowDays` days to today. */
  strip: Array<{ date: string; state: 'ok' | 'broken' | 'open' | 'before' }>
  /** This week's mission. */
  mission: GameMission | null
  missions: GameMission[]
  achievements: Array<{ id: AchievementId; day: string | null }>
  hidden: number
  /** Newest first. */
  log: WatchEntry[]
}

const SHIP_ORDER = (c: string) => (SHIP_CLASSES as readonly string[]).indexOf(c)

export function gameView(game: readonly GameMonth[], gs: GameSettings, today: string): GameView {
  const start = gs.start
  const days = allDays(game)
  const dates = [...days.keys()].sort()
  const lastFrozen = dates.at(-1) ?? null
  const { rank, since } = rankOf(game)
  let record = 0
  let run = 0
  let prev: string | null = null
  for (const d of dates) {
    run = days.get(d)!.status !== 'ok' ? 0 : prev != null && addDays(prev, 1) === d ? run + 1 : 1
    prev = d
    record = Math.max(record, run)
  }
  const streak = lastFrozen ? streakAt(days, lastFrozen) : 0
  const strip: GameView['strip'] = []
  for (let d = addDays(today, -(gs.windowDays - 1)); d <= today; d = addDays(d, 1)) {
    const day = days.get(d)
    strip.push({ date: d, state: day ? day.status : !start || d < start ? 'before' : 'open' })
  }
  const missions = allMissions(game)
    .map((x) => x.mission)
    .sort((a, b) => b.week.localeCompare(a.week))
  const earned = game
    .flatMap((g) => g.achievements)
    .filter((a): a is typeof a & { id: AchievementId } => (ACHIEVEMENTS as readonly string[]).includes(a.id))
    .sort((a, b) => (a.day ?? '').localeCompare(b.day ?? ''))
  const log: WatchEntry[] = []
  let prevCls: string | null = null
  for (const d of dates) {
    const day = days.get(d)!
    for (const v of day.violations) log.push({ kind: 'violation', date: d, order: v.order, serious: v.serious, amount: v.amount, ref: v.ref, note: v.note })
    for (const tag of day.tags) log.push({ kind: 'tag', date: d, tag })
    if (day.cls && prevCls && day.cls !== prevCls && SHIP_ORDER(day.cls) >= 0 && SHIP_ORDER(prevCls) >= 0)
      log.push({ kind: 'class', date: d, cls: day.cls as ShipClass, from: prevCls as ShipClass, up: SHIP_ORDER(day.cls) > SHIP_ORDER(prevCls) })
    if (day.cls) prevCls = day.cls
  }
  for (const c of allChanges(game)) if (isRank(c.rank)) log.push({ kind: 'rank', date: c.day, rank: c.rank, change: c.change })
  for (const m of missions) {
    log.push({ kind: 'mission', date: mondayOfWeek(m.week), template: m.template, week: m.week, done: null, params: m.params })
    if (m.evaluatedAt) log.push({ kind: 'mission', date: sundayOf(m.week), template: m.template, week: m.week, done: m.done, params: m.params })
  }
  for (const a of earned) log.push({ kind: 'achievement', date: a.day ?? warsawStamp(a.at).slice(0, 10), id: a.id })
  const rankOrder: Record<WatchEntry['kind'], number> = { rank: 0, achievement: 1, mission: 2, class: 3, violation: 4, tag: 5 }
  log.sort((a, b) => b.date.localeCompare(a.date) || rankOrder[a.kind] - rankOrder[b.kind])
  const month = monthOf(today)
  const from = later(firstDayOf(month), since ? addDays(since, 1) : (start ?? firstDayOf(month)))
  return {
    start,
    waiting: !start || start > today,
    rank,
    rankSince: since,
    progress: start && rank !== 'admiral' && lastFrozen ? promotionProgress(game, lastFrozen, gs, start) : null,
    serious: { count: seriousIn(days, from, today), limit: gs.demoteSerious },
    streak,
    record,
    lastFrozen,
    strip,
    mission: missions.find((m) => m.week === isoWeekOf(today)) ?? null,
    missions,
    achievements: earned.map((a) => ({ id: a.id, day: a.day })),
    hidden: ACHIEVEMENTS.length - new Set(earned.map((a) => a.id)).size,
    log
  }
}
