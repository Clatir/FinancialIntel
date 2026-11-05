/**
 * The forecast for years (1.17.0, AP-44 – „Prognoza wieloletnia”; D99: without IKE / IKZE / PPK – F32 rejected, D88):
 * the budget's money year by year in three scenarios – the cautious, the base and the optimistic one –, deterministic.
 * Nothing is stored but the scenarios' assumptions (`settings.intel.forecast`, T488); the trading is not FI's – the
 * ICTTJ deliveries are only the captain's assumption, never read from ICTTJ (CLAUDE.md, the ICTTJ boundary).
 *
 * T485: its first year IS the course for 12 months (`calc/course.ts` – one input, `courseInputOf`: the engine's state
 * now, this month's rest from its energy, the buoys, the loans given), the income from work at its median (the course
 * „bez wypłat z XTB”) and the deliveries the scenario assumes; each later year runs the same months' rules from where the
 * year before ended, with that year's assumptions: the income from work × the wages' growth, the costs and the plan's
 * salary (it pays them) × the inflation, the deliveries a year ÷ 12 a month, the one-off expenses in the year's last
 * month from the shields (in today's prices – × the inflation), the buoys in their months (a yearly one every year).
 *
 * T486: the loans by their schedules – a given loan's installments come back in their months (the receivable falls by
 * them), a taken loan's leave the money in their months every year, the first one too (the course's – `courseInputOf`:
 * a loan op from the shields or its cargo container, „własna rata”), the costs without the share the average holds of
 * the loans' containers (`CourseInput.loanCosts`) – never paid twice, nor after the last installment, nor never.
 *
 * T487: the net worth at each year's end – as the year's review counts it (F24): the money on the accounts (the course's
 * shields, hull and goals, the rest of the layers as they are now, less what this month still spends from the energy and
 * the tanks, less the tax reserve – PIT-38 is paid within the year), the receivables (the household's balance as now,
 * the loans given still open), less the debt (the taken loans after their installments) and less what the money lacked
 * so far (the course's `short`: its months end the shields at zero, the lack is the captain's anyway). Pure.
 */
import type { Scheduled, Transaction } from '../schema/records'
import { FORECAST_SCENARIOS, forecastAssumptionsSchema, type ForecastAssumptions, type ForecastScenario, type ForecastSettings } from '../schema/budget'
import type { CargoStatus } from './cargoStatus'
import { COURSE_MONTHS, course, courseIncome, feesDue, type Course, type CourseInput, type CourseMonth } from './course'
import { addMonths, lastDayOf, monthOf } from './dates'
import type { FleetState } from './fleet'
import { sum } from './operations'
import { openDays, scheduledDays } from './scheduled'

export { FORECAST_SCENARIOS, type ForecastAssumptions, type ForecastScenario }

/** The longest forecast, in years. */
export const FORECAST_YEARS = 10

export const SCENARIO_LABEL: Record<ForecastScenario, string> = { cautious: 'ostrożny', base: 'bazowy', optimistic: 'optymistyczny' }

/**
 * Each scenario's assumptions until the captain changes them (T488): the wages' growth and the inflation in % a year
 * (nominal), no deliveries from ICTTJ, no one-off expenses.
 */
export const FORECAST_DEFAULTS: Readonly<Record<ForecastScenario, ForecastAssumptions>> = {
  cautious: { wages: 0, inflation: 5, deliveries: 0, oneOff: 0 },
  base: { wages: 4, inflation: 3, deliveries: 0, oneOff: 0 },
  optimistic: { wages: 7, inflation: 2.5, deliveries: 0, oneOff: 0 }
}

/** The four assumptions' keys: a scenario's other fields are a newer version's – kept as they are (T488). */
export const ASSUMPTION_KEYS = ['wages', 'inflation', 'deliveries', 'oneOff'] as const

/** A scenario as the file holds it: its four assumptions, or null – absent, or unreadable (a field out of its range). */
export function readScenario(v: unknown): ForecastAssumptions | null {
  if (v === undefined) return null
  const p = forecastAssumptionsSchema.safeParse(v)
  return p.success ? { wages: p.data.wages, inflation: p.data.inflation, deliveries: p.data.deliveries, oneOff: p.data.oneOff } : null
}

/** The assumptions in force: the saved scenario's four, else its defaults (an unreadable one – said, `unreadableScenarios`). */
export function assumptionsOf(saved: ForecastSettings | null | undefined): Record<ForecastScenario, ForecastAssumptions> {
  const out = {} as Record<ForecastScenario, ForecastAssumptions>
  for (const s of FORECAST_SCENARIOS) out[s] = readScenario(saved?.[s]) ?? FORECAST_DEFAULTS[s]
  return out
}

/**
 * The scenarios saved but unreadable (R2 review – AP-15, T488): kept in the file as they are, counted by their defaults –
 * the screen says so, never silently.
 */
export function unreadableScenarios(saved: ForecastSettings | null | undefined): ForecastScenario[] {
  return FORECAST_SCENARIOS.filter((s) => saved?.[s] !== undefined && readScenario(saved[s]) == null)
}

/** A scenario's fields beside the four (a newer version's): kept by an edit and by „domyślne” (T488). */
export function otherFieldsOf(v: unknown): Record<string, unknown> {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return {}
  return Object.fromEntries(Object.entries(v).filter(([k]) => !(ASSUMPTION_KEYS as readonly string[]).includes(k)))
}

/** The same assumptions (the screen's „domyślne” shown only when they differ). */
export const sameAssumptions = (a: ForecastAssumptions, b: ForecastAssumptions): boolean =>
  a.wages === b.wages && a.inflation === b.inflation && a.deliveries === b.deliveries && a.oneOff === b.oneOff

export interface ForecastInput {
  /** The course's input (`courseInputOf`): its first year is the course. */
  course: CourseInput
  /** The income from work a month now – the course's median of 12 months (`courseIncome`, „bez wypłat z XTB”). */
  work: number
  /** The money on the budget's accounts now (the engine's `total` – the layers' sum). */
  total: number
  /** What the tanks pay of this month's fees still due (`feesDue`) – it leaves the budget this month. */
  tanksNow: number
  /** The tax reserve (the pool „Podatek”): PIT-38's, paid within the year – not the captain's money at a year's end. */
  taxHold: number
  /** The household's balance now: what the members owe less their money held (the net worth's – F24). */
  household: number
  /** The loans given still open, and their installments not covered yet by month (a late one – this month). */
  given: { open: number; repayments: ReadonlyArray<{ month: string; amount: number }> }
  /**
   * Money of the months after the course's year (signed): the buoys (a yearly one every year), the loans given coming
   * back, the taken loans' installments going out (T486).
   */
  later: ReadonlyMap<string, number>
}

/**
 * The forecast's input from the engine's state now, the course's input and the records (Wywiad): the money of the later
 * years (the buoys over the whole horizon, the loans' schedules), the loans given, the household, the tanks' part of
 * this month's fees (`cargo` – AP-10's state). The taken loans' share of the average costs is the course's (`loanCosts`).
 */
export function forecastInputOf(
  fleet: FleetState,
  input: CourseInput,
  r: { scheduled: readonly Scheduled[]; transactions: readonly Transaction[]; cargo?: readonly CargoStatus[] }
): ForecastInput {
  const yearEnd = addMonths(input.month, COURSE_MONTHS)
  const end = addMonths(input.month, COURSE_MONTHS * FORECAST_YEARS)
  const later = new Map<string, number>()
  const add = (month: string, v: number) => {
    if (month > yearEnd && month <= end && v) later.set(month, (later.get(month) ?? 0) + v)
  }
  // The buoys after the course's year (its own come from `courseInputOf`): their open days, a yearly one each year.
  for (const d of openDays(scheduledDays(r.scheduled, r.transactions, fleet.today, `${addMonths(yearEnd, 1)}-01`, lastDayOf(end))))
    if (d.scheduled.amount != null) add(monthOf(d.date), d.scheduled.amount)
  const repayments: Array<{ month: string; amount: number }> = []
  let open = 0
  for (const l of fleet.loans) {
    if (l.loan.closedAt) continue
    if (l.loan.direction === 'given') {
      open += l.open
      // As the course: a late installment this month (`courseInputOf`).
      for (const i of l.left) {
        const month = i.date < fleet.today ? fleet.month : monthOf(i.date)
        repayments.push({ month, amount: i.amount })
        add(month, i.amount)
      }
    } else for (const i of l.left) add(monthOf(i.date), -i.amount)
  }
  return {
    course: input,
    work: courseIncome(fleet.incomeStats, 'noXtb').work,
    total: fleet.total,
    tanksNow: feesDue(fleet.tanks, r.cargo).tanks,
    taxHold: fleet.taxHold,
    household: fleet.household.owed - fleet.household.deposit,
    given: { open, repayments },
    later
  }
}

export interface ForecastYear {
  /** 1 … N: the year's months are the 12 after the year before (the first – the course's). */
  year: number
  /** Its last month. */
  month: string
  /** The income from work and the deliveries assumed in the year. */
  income: number
  /** The year's costs at its average (null – not known: the months spend their salary). */
  costs: number | null
  /** The one-off expenses of the year (its last month). */
  oneOff: number
  shields: number
  hull: number
  goals: number
  /** The money on the accounts at its end. */
  money: number
  /** The household's balance and the loans given still open at its end. */
  receivables: number
  /** What the taken loans still want back at its end. */
  debt: number
  /** What the money lacked in the year (the first – with this month's rest). */
  short: number
  /** The net worth at its end (T487): money + receivables − debt − every lack so far. */
  net: number
  /** The range at its end (the year's costs). */
  range: number | null
}

export interface Forecast {
  scenario: ForecastScenario
  assumptions: ForecastAssumptions
  /** The net worth now – as the year's review counts it (F24): the accounts, the receivables, less the debt. */
  now: number
  years: ForecastYear[]
  /** Every month of the forecast: the first 12 are the course's. */
  months: CourseMonth[]
  /** Each goal's month (null – not in the forecast; full now – this month). */
  goalEta: Record<string, string | null>
  /**
   * The first month the shields fall to zero (the hull, or nothing, pays the rest of it) – this month when its rest
   * empties them (R2 review, as `shortFrom`); null – never.
   */
  shieldsEmpty: string | null
  /** The first month the money lacks (this month – its rest); null – never. */
  shortFrom: string | null
}

/** The money of the months after `from` up to `to`. */
function between(map: ReadonlyMap<string, number>, from: string, to: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const [m, v] of map) if (m > from && m <= to) out.set(m, v)
  return out
}

/** The forecast of one scenario for `years` years (1 … `FORECAST_YEARS`). */
export function forecast(input: ForecastInput, scenario: ForecastScenario, a: ForecastAssumptions, years = 5): Forecast {
  const c = input.course
  const count = Math.max(1, Math.min(FORECAST_YEARS, Math.floor(years) || 1))
  // T489: each amount rounded once to the grosz from today's (a year's factor as a float, never a rounded one compounded).
  const trading = Math.round(a.deliveries / 12)
  // The money outside the course's layers stays as it is now (the tanks at a year's end where their cycle is now – the
  // fees' payments are in the average costs), less what this month still spends from the energy and the tanks, less the
  // tax reserve.
  const layers = c.shields + c.hull + sum(c.goals.map((g) => g.amount))
  const spentNow = c.energy ? Math.min(c.energy.needs, Math.max(0, c.energy.left)) : 0
  const other = input.total - layers - spentNow - input.tanksNow - input.taxHold
  const installments = c.installments ?? []
  // As the course's range: the debt less the installments up to the month.
  const debtAt = (month: string) => Math.max(0, c.debt - sum(installments.filter((i) => i.month <= month).map((i) => i.amount)))
  const repaidBy = (month: string) => sum(input.given.repayments.filter((x) => x.month <= month).map((x) => x.amount))
  const months: CourseMonth[] = []
  const out: ForecastYear[] = []
  const goalEta: Record<string, string | null> = {}
  let deficit = 0
  let shortFrom: string | null = null
  let shieldsEmpty: string | null = null
  let prev: CourseMonth | null = null
  for (let y = 1; y <= count; y++) {
    const inflation = (1 + a.inflation / 100) ** (y - 1)
    const growth = (1 + a.wages / 100) ** (y - 1)
    const start = addMonths(c.month, COURSE_MONTHS * (y - 1))
    const last = addMonths(start, COURSE_MONTHS)
    const oneOff = Math.round(a.oneOff * inflation)
    const purchases = oneOff > 0 ? [{ month: last, goalId: null, amount: oneOff }] : []
    const work = Math.round(input.work * growth)
    // What the months spend (T486): the average without the taken loans' installments – those leave in their months.
    const costs = c.costs == null ? null : Math.max(0, Math.round((c.costs - (c.loanCosts ?? 0)) * inflation))
    const from: CourseMonth | null = prev
    const run: Course = !from
      ? course({ ...c, income: { work, trading }, purchases: [...(c.purchases ?? []), ...purchases], horizon: COURSE_MONTHS }, 'noXtb')
      : course(
          {
            ...c,
            month: start,
            shields: from.shields,
            hull: from.hull,
            goals: c.goals.map((g) => ({ ...g, amount: from.goals[g.id] ?? g.amount })),
            salaryOf: (m: string) => {
              const s = c.salaryOf(m)
              return s == null ? null : Math.round(s * inflation)
            },
            costs,
            // The installments are in `later` – the costs above are without them already.
            loanCosts: 0,
            income: { work, trading },
            extras: between(input.later, start, last),
            purchases,
            // The year before ended its months whole: no rest, no maneuver.
            energy: undefined,
            noTradingMonths: undefined,
            horizon: COURSE_MONTHS
          },
          'noXtb'
        )
    // A goal's first month (a later year's „now” is the year before's last month – named by it already).
    for (const [id, m] of Object.entries(run.goalEta)) if (goalEta[id] == null) goalEta[id] = m
    if (y === 1 && run.rest.short > 0) shortFrom = c.month
    // This month's rest empties the shields (R2 review): „teraz”, as the lack.
    if (y === 1 && run.restLow <= 0) shieldsEmpty = c.month
    if (!shieldsEmpty) shieldsEmpty = run.months.find((m) => m.low <= 0)?.month ?? null
    if (!shortFrom) shortFrom = run.months.find((m) => m.short > 0)?.month ?? null
    months.push(...run.months)
    const end: CourseMonth = run.months.at(-1)!
    prev = end
    const short = sum(run.months.map((m) => m.short)) + (y === 1 ? run.rest.short : 0)
    deficit += short
    const goals = sum(Object.values(end.goals))
    const money = end.shields + end.hull + goals + other
    const receivables = input.household + Math.max(0, input.given.open - repaidBy(end.month))
    const debt = debtAt(end.month)
    out.push({
      year: y,
      month: end.month,
      income: COURSE_MONTHS * (work + trading),
      costs: costs == null ? null : COURSE_MONTHS * costs,
      oneOff,
      shields: end.shields,
      hull: end.hull,
      goals,
      money,
      receivables,
      debt,
      short,
      net: money + receivables - debt - deficit,
      range: end.range
    })
  }
  return {
    scenario,
    assumptions: a,
    now: input.total + input.household + input.given.open - c.debt,
    years: out,
    months,
    goalEta,
    shieldsEmpty,
    shortFrom
  }
}

/** The three scenarios side by side. */
export function forecasts(input: ForecastInput, assumptions: Readonly<Record<ForecastScenario, ForecastAssumptions>>, years: number): Forecast[] {
  return FORECAST_SCENARIOS.map((s) => forecast(input, s, assumptions[s], years))
}
