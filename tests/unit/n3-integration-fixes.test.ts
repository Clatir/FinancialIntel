/**
 * N3 (1.15.7) – the seams between AP-10, AP-13, AP-17, AP-18 and AP-31 (T390, T391):
 * - the course's rest of this month pays what the month's plan still spends from the month's energy left – today's energy
 *   is never more (AP-13, T371) – and over it from the shields (T390);
 * - the course's „Kadłub pełny” counts the hull full from 99 % of its target, as the firewall and „wolne do decyzji”
 *   (AP-17, T372); the goals' installments at the turn still want 100 % (T391);
 * - „Dopełnij kadłub z osłon” (AP-17, T373) is a move of the engine's log, so the cushion at each month's end (AP-31,
 *   T389) adds it up from the log – never the slow run of the engine per month.
 */
import { describe, expect, it, vi } from 'vitest'
import { cargoStatuses } from '@shared/calc/cargoStatus'
import { course, courseIncome, courseInputOf, restNeeds, type CourseInput } from '@shared/calc/course'
import { cushionMonths, cushionTrend, layersAtMonthEnds } from '@shared/calc/cushion'
import { lastDayOf, warsawEndOf } from '@shared/calc/dates'
import { computeFleet, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Container, type MonthPlan, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N3J000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })

// Jedzenie and Rozrywka – daily envelopes, Dom and Prezenty – planned (the default categories).
const FOOD = defaultCategoryId(1)
const GROCERIES = defaultCategoryId(1, 1)
const HOME = defaultCategoryId(2)
const FUN = defaultCategoryId(6)
const GIFTS = defaultCategoryId(9)

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const plan = (month: string, salary: number, envelopes: Record<string, number>, over: Partial<MonthPlan> = {}) => monthPlanSchema.parse({ ...base(), month, salary, envelopes, ...over })
const opening = (date: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'Czynsz', amount: zl(800), dueMonth: '2026-01', dueDay: 10, accountId: MBANK_ACCOUNT_ID, ...over })

function settingsOf(start: string, layers: Partial<Settings['layers']> = {}, initial?: Settings['budget']['initial']): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, start, ...(initial ? { initial } : {}) }, layers: { ...s.layers, ...layers } }
}

function run(input: FleetInput): FleetState {
  const f = computeFleet(input)
  // The invariant: every złoty on the accounts belongs to exactly one layer.
  expect(layersSum(f)).toBe(f.total)
  return f
}

const NOW = '2026-11-04T12:00:00+01:00'
const ENVELOPES = { [FOOD]: zl(1500), [FUN]: zl(500), [HOME]: zl(500), [GIFTS]: zl(1000) }

/**
 * PM.3 w2 with a pay-in: the budget from 1 October with 4 000 zł, October's plan 4 000 zł (daily 2 000, planned 1 500)
 * spent whole – on 1 November the shields and the hull are empty, the salary 0 zł of 4 000 zł; 2 000 zł in on the 2nd
 * (the shields). The rent of 800 zł on the 10th: October's unpaid (AP-10 – still due), November's still to come.
 */
function partialMonth() {
  const rent = container({})
  const input: FleetInput = {
    settings: settingsOf('2026-10-01'),
    balances: [opening('2026-10-01', zl(4000))],
    months: [plan('2026-10', zl(4000), ENVELOPES)],
    containers: [rent],
    transactions: [
      tx('2026-10-05', -zl(1500), { categoryId: GROCERIES }),
      tx('2026-10-10', -zl(500), { categoryId: FUN }),
      tx('2026-10-15', -zl(1000), { categoryId: GIFTS }),
      tx('2026-10-20', -zl(1000), { categoryId: HOME }),
      tx('2026-11-02', zl(2000), { kind: 'income', categoryId: null, counterparty: 'Pracodawca' })
    ],
    now: NOW
  }
  const f = run(input)
  const cargo = cargoStatuses({ containers: [rent], transactions: input.transactions, today: f.today, coveredTo: {}, start: f.start })
  const ci = courseInputOf(f, { settings: input.settings, plans: input.months ?? [], goals: [], scheduled: [], transactions: input.transactions, cargo })!
  return { f, cargo, ci, input }
}

describe('N3 integracja: resztka miesiąca w kursie z energii miesiąca, nie więcej (AP-13 × AP-18, T390)', () => {
  it('pensja częściowa: koperty i opłaty miesiąca ponad energię miesiąca (0 zł) z osłon – „teraz” = Mostek, „po resztce” 0', () => {
    const { f, cargo, ci } = partialMonth()
    // Mostek (AP-13): the month's energy 0 zł – today's capped, „pensja częściowa”.
    expect(f.energy).toBe(0)
    expect(f.daily?.cap).toEqual({ month: 0, why: 'partial' })
    expect(f.shields.amount).toBe(zl(2000))
    // AP-10's one state: October's rent still due (carried), November's ahead.
    expect(cargo.map((s) => [s.due, s.state, s.carried])).toEqual([
      ['2026-10-10', 'overdue', true],
      ['2026-11-10', 'waiting', false]
    ])
    // The plan still spends: the daily pool 2 000, the planned envelopes 1 500, the two rents 1 600 zł.
    expect(ci.energy).toEqual({ left: 0, needs: zl(2000) + zl(1500) + zl(1600) })
    const c = course({ ...ci, income: courseIncome(f.incomeStats, 'median') }, 'median')
    // „Teraz” stays Mostek's (AF-33): 2 000 zł over October's 4 000 zł of costs.
    expect(f.costs.average).toBe(zl(4000))
    expect(c.rangeNow).toBe(f.range)
    expect(c.rangeNow).toBe(0.5)
    // The rest: 5 100 zł over the month's energy from the shields (2 000 zł) – 3 100 zł lacking, the shields at zero.
    // Before: the month's energy „paid” it – the course started from 2 000 zł of shields.
    expect(c.rest).toEqual({ overEnergy: zl(5100), short: zl(3100) })
    expect(c.rangeRest).toBe(0)
    expect(c.short).toBe(zl(3100) + c.months.reduce((a, m) => a + m.short, 0))
    // December starts from what is: nothing to pay the salary from.
    expect(c.months[0]).toMatchObject({ month: '2026-12', partial: zl(4000), fromHull: 0 })
  })

  it('energia miesiąca wydana na kopertę planową (powód „spent”): pula dzienna ponad nią z osłon; zwykły miesiąc – nic', () => {
    const input: FleetInput = {
      settings: settingsOf('2026-11-01', { assumedCosts: zl(3000) }),
      balances: [opening('2026-11-01', zl(20000))],
      months: [plan('2026-11', zl(4000), ENVELOPES)],
      transactions: [],
      now: NOW
    }
    const plain = run(input)
    const ciPlain = courseInputOf(plain, { settings: input.settings, plans: input.months ?? [], goals: [], scheduled: [], transactions: [] })!
    // The plan within the salary (500 zł unplanned): the month's energy pays its rest – nothing drawn (as before).
    expect(ciPlain.energy).toEqual({ left: zl(4000), needs: zl(3500) })
    const cPlain = course(ciPlain, 'median')
    expect(cPlain.rest).toEqual({ overEnergy: 0, short: 0 })
    expect(cPlain.rangeRest).toBe(cPlain.rangeNow)

    // Prezenty 3 950 zł over its 1 000 zł: the month's energy 50 zł – today's 74,07 zł of the pool capped by it (T371
    // „spent”); the plan still spends 2 000 zł of the pool and Dom 500 zł – 2 450 zł over the month's energy.
    const transactions = [tx('2026-11-02', -zl(3950), { categoryId: GIFTS })]
    const spent = run({ ...input, transactions })
    expect(spent.energy).toBe(zl(50))
    expect(spent.daily).toMatchObject({ allowance: zl(74.07), energy: zl(50), cap: { month: zl(50), why: 'spent' } })
    const ci = courseInputOf(spent, { settings: input.settings, plans: input.months ?? [], goals: [], scheduled: [], transactions })!
    expect(ci.energy).toEqual({ left: zl(50), needs: zl(2500) })
    const c = course(ci, 'median')
    expect(c.rest).toEqual({ overEnergy: zl(2450), short: 0 })
    expect(c.rangeNow).toBe(spent.range)
    expect(c.rangeRest).toBeCloseTo((spent.shields.amount - zl(2450) + spent.hull.amount) / spent.costs.average!)
  })

  it('opłata okresowa: zbiornik płaci, energia tylko brak w nim; dwa terminy jednego zbiornika dzielą to, co ma', () => {
    const daily = { limit: 0, spentBefore: 0, spentToday: 0, returned: 0 } as FleetState['daily']
    const fleet = { daily, envelopes: [], tanks: [{ containerId: 'T', name: 'OC', amount: zl(900), dueMonth: '2026-11', paidDue: null, due: zl(1200) }] }
    const due = (amount: number) => ({ containerId: 'T', cycleMonths: 12, amount, state: 'overdue' as const })
    expect(restNeeds(fleet, [due(zl(1200))])).toBe(zl(300))
    expect(restNeeds(fleet, [due(zl(600)), due(zl(600))])).toBe(zl(300))
    expect(restNeeds(fleet, [{ ...due(zl(1200)), state: 'paid' }])).toBe(0)
  })
})

describe('N3 integracja: „Kadłub pełny” w kursie od 99 % celu jak firewall, raty celów przy 100 % (AP-17 × AP-18, T391)', () => {
  const input = (hull: number): CourseInput => ({
    month: '2026-11',
    shields: zl(15000),
    hull,
    goals: [{ id: 'G', name: 'Wakacje', amount: 0, target: zl(6000), deadline: '2027-06', rates: [{ from: '2026-12', until: null }] }],
    salaryOf: () => zl(5000),
    costs: zl(5000),
    layers: { shieldSalaries: 3, hullMonths: 6 },
    minShieldSalaries: 1,
    income: { work: 0, trading: 0 },
    extras: new Map(),
    debt: 0
  })

  it('kadłub 29 850 / 30 000 zł (99,5 %): pełny „teraz”; rata celu z grudniowej pensji – nie (kadłub poniżej 100 %)', () => {
    const c = course(input(zl(29850)), 'median')
    // Before: „Kadłub pełny —” (no income fills it to 100 %), while Mostek says „liczy się jako pełny”.
    expect(c.hullFull).toBe('2026-11')
    expect(c.shieldsFull).toBe('2026-11')
    expect(c.months[0]!.rates).toBe(0)
    // 98,9 % – not full.
    expect(course(input(zl(29670)), 'median').hullFull).toBeNull()
    // Exactly full – the installment comes (T272: 100 % at the turn).
    expect(course(input(zl(30000)), 'median').months[0]!.rates).toBeGreaterThan(0)
  })
})

describe('N3 integracja: „Dopełnij kadłub z osłon” w logu silnika – osłony + kadłub na koniec miesiąca bez przebiegu na miesiąc (AP-17 × AP-31)', () => {
  it('dopełnienie 15.09 (1 000 zł): koniec każdego miesiąca = silnik tego dnia, log sumuje się do stanu (bez `engineAt`)', () => {
    // From 1 August: 60 000 zł, the hull 17 000 zł at the start of its 18 000 zł (6 × 3 000 zł assumed), the salary
    // 4 000 zł, 2 000 zł of costs a month; on 15 September 1 000 zł from the shields' surplus to the hull.
    const months = [plan('2026-08', zl(4000), {}), plan('2026-09', zl(4000), {}, { hullTopUps: [{ id: nextId(), amount: zl(1000), at: '2026-09-15T08:00:00.000Z' }] })]
    const input: FleetInput = {
      settings: settingsOf('2026-08-01', { assumedCosts: zl(3000) }, { shields: 0, hull: zl(17000), goals: {} }),
      balances: [opening('2026-08-01', zl(60000))],
      months,
      transactions: ['2026-08', '2026-09', '2026-10'].map((m) => tx(`${m}-12`, -zl(2000), { categoryId: GROCERIES })),
      now: NOW
    }
    const f = run(input)
    const moved = f.log.filter((e) => e.kind === 'hull')
    expect(moved.map((e) => [e.date, e.amount, e.moves])).toEqual([['2026-09-15', zl(1000), { hull: zl(1000), shields: -zl(1000) }]])
    expect(layersAtMonthEnds(f, ['2026-08', '2026-09', '2026-10'])).not.toBeNull()
    const engineAt = vi.fn((date: string) => computeFleet({ ...input, now: warsawEndOf(date) }))
    const t = cushionTrend({ fleet: f, transactions: input.transactions, loans: [], containers: [], assumedCosts: zl(3000), months: cushionMonths(f.month), engineAt })
    // The log adds up to the state: no run of the engine per month.
    expect(engineAt).not.toHaveBeenCalled()
    expect(t.map((p) => p.month)).toEqual(['2026-08', '2026-09', '2026-10'])
    for (const p of t) {
      const then = run({ ...input, now: warsawEndOf(lastDayOf(p.month)) })
      expect([p.month, p.shields, p.hull]).toEqual([p.month, then.shields.amount, then.hull.amount])
      expect(p.range).toBeCloseTo(then.range!, 10)
    }
    // September's end: the hull topped up to its target.
    expect(t[1]!.hull).toBe(zl(18000))
  })
})
