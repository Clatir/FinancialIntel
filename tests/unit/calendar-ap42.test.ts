/**
 * R1 (1.16.0), AP-42: the month's calendar on Radar – each day's energy from the engine (T472: the numbers of Mostek
 * today and of the game's day for the days past), the forecast of the days ahead (T473) and the radar's items by day
 * (T474) – one list of items, no counting of its own.
 */
import { describe, expect, it } from 'vitest'
import { calendarMonth, calendarMonths, dayAhead } from '@shared/calc/calendar'
import { computeFleet, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { addDays, warsawEndOf, warsawStartOf } from '@shared/calc/dates'
import type { RadarItem } from '@shared/calc/radar'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, CASH_CATEGORY_ID, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type MonthPlan, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5400000000000000000${String(++seq).padStart(4, '0')}`
const base = (createdAt = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt, updatedAt: createdAt })

const FOOD = defaultCategoryId(1)
const GROCERIES = defaultCategoryId(1, 1)
const COFFEE = defaultCategoryId(1, 3)
const FUN = defaultCategoryId(6)
const GIFTS = defaultCategoryId(9)

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(over.createdAt), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const plan = (month: string, salary: number, envelopes: Record<string, number>, over: Partial<MonthPlan> = {}) => monthPlanSchema.parse({ ...base(), month, salary, envelopes, ...over })
const opening = (date: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount })

function settingsFrom(start: string): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, start } }
}

/**
 * October 2026 from the 1st with 20 000 zł, its loot decided on 5 November (300 zł to November's daily envelopes, 100 zł
 * kept in Prezenty); November's plan with a cover of 100 zł from Prezenty to Jedzenie made on 10 November; purchases,
 * a refund of an earlier purchase beyond the day's own (T370), one without a category, one of a planned envelope.
 */
function input(): Omit<FleetInput, 'now'> {
  return {
    settings: settingsFrom('2026-10-01'),
    balances: [opening('2026-10-01', zl(20000))],
    months: [
      plan('2026-10', zl(4000), { [FOOD]: zl(1600), [FUN]: zl(450), [GIFTS]: zl(1000) }, { loot: { decidedAt: '2026-11-05T09:00:00.000Z', shields: 0, nextMonth: zl(300), goals: {}, envelopes: { [GIFTS]: zl(100) } } }),
      plan('2026-11', zl(4000), { [FOOD]: zl(1600), [FUN]: zl(450), [CASH_CATEGORY_ID]: zl(100), [GIFTS]: zl(1000) }, {
        envelopeCovers: [{ id: nextId(), from: GIFTS, to: FOOD, amount: zl(100), at: '2026-11-10T11:00:00.000Z' }]
      })
    ],
    transactions: [
      tx('2026-10-12', -zl(900), { categoryId: GROCERIES }),
      tx('2026-11-02', -zl(50), { categoryId: GROCERIES }),
      tx('2026-11-04', -zl(120), { categoryId: FUN }),
      tx('2026-11-06', -zl(30), { categoryId: COFFEE }),
      tx('2026-11-06', zl(40), { categoryId: GROCERIES }),
      tx('2026-11-06', -zl(20), { categoryId: FUN }),
      tx('2026-11-07', -zl(300), { categoryId: GIFTS }),
      tx('2026-11-08', -zl(15)),
      tx('2026-11-10', -zl(400), { categoryId: GROCERIES }),
      tx('2026-11-12', -zl(25), { categoryId: COFFEE })
    ]
  }
}

function fleetAt(now: string, extra: Partial<FleetInput> = {}): FleetState {
  const state = computeFleet({ ...input(), now, ...extra })
  if (state.started) expect(layersSum(state)).toBe(state.total)
  return state
}

const NOW = '2026-11-12T20:00:00+01:00'

describe('AP-42: energia dnia z silnika (T472)', () => {
  it('dni minione – te same liczby co ocena dnia w grze (silnik na koniec dnia, pokrycia sprzed dnia); dziś – Mostek', () => {
    const f = fleetAt(NOW)
    const days = f.daily!.days
    expect(days.map((d) => d.date)).toEqual(Array.from({ length: 12 }, (_, i) => addDays('2026-11-01', i)))
    for (const d of days.slice(0, -1)) {
      // As `rateDay` counts the day (D73): at its end, the covers made that day not yet.
      const then = computeFleet({ ...input(), now: warsawEndOf(d.date).toISOString(), coversBefore: warsawStartOf(d.date).toISOString() }).daily!
      expect({ date: d.date, limit: d.limit, allowance: d.allowance, spent: d.spent }).toEqual({ date: d.date, limit: then.limit, allowance: then.allowance, spent: then.spentToday })
    }
    // Today – the engine's own numbers (Mostek).
    expect(days.at(-1)).toEqual({ date: '2026-11-12', limit: f.daily!.limit, allowance: f.daily!.allowance, spent: f.daily!.spentToday })
  })

  it('scenariusz naprawdę zmienia limit: łupy od dnia decyzji, pokrycie od następnego dnia, zwrot ponad zakupy dnia', () => {
    const days = fleetAt(NOW).daily!.days
    const day = (date: string) => days.find((d) => d.date === date)!
    // 2 150 zł of daily envelopes; from 5 November + 300 zł of the loot; from 11 November + 100 zł of the cover.
    expect(day('2026-11-04').limit).toBe(zl(2150))
    expect(day('2026-11-05').limit).toBe(zl(2450))
    expect(day('2026-11-10').limit).toBe(zl(2450))
    expect(day('2026-11-11').limit).toBe(zl(2550))
    // 6 November: coffee 30 zł and a refund of 40 zł in Jedzenie net to 0 – the fun's 20 zł is the day's spending.
    expect(day('2026-11-06').spent).toBe(zl(20))
    // A planned envelope's purchase is not the daily pool's; one without a category is.
    expect(day('2026-11-07').spent).toBe(0)
    expect(day('2026-11-08').spent).toBe(zl(15))
    // 1 November: 2 150 zł / 30 days.
    expect(day('2026-11-01').allowance).toBe(Math.floor(zl(2150) / 30))
  })
})

describe('AP-42: prognoza dni naprzód (T473)', () => {
  it('przydział od jutra, gdy dziś nic więcej – jak policzy silnik jutro (zwrot ponad dzisiejsze zakupy wchodzi od jutra)', () => {
    const f = fleetAt(NOW)
    const tomorrow = computeFleet({ ...input(), now: '2026-11-13T08:00:00+01:00' }).daily!
    expect(dayAhead(f)).toBe(Math.min(tomorrow.allowance, f.energy))
  })

  it('ostatni dzień miesiąca – brak prognozy; bez planu – brak', () => {
    expect(dayAhead(fleetAt('2026-11-30T20:00:00+01:00'))).toBeNull()
    expect(dayAhead({ ...fleetAt(NOW), daily: null })).toBeNull()
  })

  it('prognoza nie więcej niż energia miesiąca, która została (jak energia dziś – T371)', () => {
    const f = fleetAt(NOW)
    expect(dayAhead({ ...f, energy: zl(10) })).toBe(zl(10))
  })
})

const item = (date: string, kind: RadarItem['kind'], amount: number | null, direction: RadarItem['direction'] = 'out'): RadarItem => ({ key: `${kind}:${date}:${amount}`, date, kind, name: kind, amount, direction, note: '' })

describe('AP-42: siatka miesiąca (T474)', () => {
  it('tydzień od poniedziałku, dni spoza miesiąca puste; dzień – jego pozycje Radaru i energia', () => {
    const f = fleetAt(NOW)
    const items = [item('2026-11-15', 'fixed', zl(60)), item('2026-11-15', 'repayment', zl(200), 'in'), item('2026-12-01', 'salary', zl(4000), 'inside')]
    const m = calendarMonth('2026-11', f, items)
    // 1 November 2026 is a Sunday: six empty cells before it, 30 days, the last week filled up to Sunday.
    expect(m.cells.slice(0, 6).every((c) => c === null)).toBe(true)
    expect(m.cells[6]?.date).toBe('2026-11-01')
    expect(m.cells.length % 7).toBe(0)
    expect(m.cells.filter(Boolean)).toHaveLength(30)
    const day = (date: string) => m.cells.find((c) => c?.date === date)!
    expect(day('2026-11-06').energy).toEqual({ state: 'past', allowance: f.daily!.days[5]!.allowance, spent: zl(20) })
    expect(day('2026-11-12').energy).toEqual({ state: 'today', allowance: f.daily!.allowance, spent: f.daily!.spentToday, energy: f.daily!.energy })
    expect(day('2026-11-13').energy).toEqual({ state: 'ahead', allowance: dayAhead(f) })
    // The radar's items on their day only – the same objects; out and in summed apart.
    expect(day('2026-11-15').items).toEqual(items.slice(0, 2))
    expect(day('2026-11-15').out).toBe(zl(60))
    expect(day('2026-11-15').in).toBe(zl(200))
    expect(day('2026-11-14').items).toEqual([])
    // December: the salary on the 1st, no energy known (its plan is not there yet).
    const dec = calendarMonth('2026-12', f, items)
    const first = dec.cells.find((c) => c?.date === '2026-12-01')!
    expect(first.items).toEqual([items[2]])
    expect(first.energy).toBeNull()
    expect(first.out).toBe(0)
    expect(first.in).toBe(0)
  })

  it('miesiące siatki – od bieżącego do ostatniego w oknie Radaru (90 dni)', () => {
    expect(calendarMonths('2026-11-12')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
    expect(calendarMonths('2026-11-01')).toEqual(['2026-11', '2026-12', '2027-01'])
  })

  it('dzień przed startem budżetu i poza dniami silnika – bez energii', () => {
    const f = fleetAt(NOW)
    const oct = calendarMonth('2026-10', f, [])
    expect(oct.cells.find((c) => c?.date === '2026-10-20')?.energy).toBeNull()
  })
})
