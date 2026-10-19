import { describe, expect, it } from 'vitest'
import { computeFleet, layersSum } from '@shared/calc/fleet'
import { debriefing, firstFullMonth, lootDeadline, lootDecision, proposeEnvelopes, proposeSalary, recurringPayments, salarySplit, sinkingOf } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import {
  balanceSchema,
  containerSchema,
  defaultCategoryId,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  type Container,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K1000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })

const FOOD = defaultCategoryId(1)
const GROCERIES = defaultCategoryId(1, 1)
const HOME = defaultCategoryId(2)
const RENT = defaultCategoryId(2, 1)
const AUTO = defaultCategoryId(3)
const INSURANCE = defaultCategoryId(3, 3)
const FUN = defaultCategoryId(6)
const STREAMING = defaultCategoryId(7, 3)

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const spend = (date: string, v: number, categoryId: string | null, counterparty = '') => tx(date, -zl(v), { categoryId, counterparty })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2026-01', ...over })
const settings = (budget: Partial<Settings['budget']> = {}): Settings => {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, ...budget } }
}
const categories = settings().categories

describe('propozycje kreatora i planu (D70)', () => {
  // Costs April–September (the history starts mid-March: March is not a full month).
  const monthly: Array<[string, number]> = [
    ['2026-04', 3000],
    ['2026-05', 3200],
    ['2026-06', 2800],
    ['2026-07', 3100],
    ['2026-08', 3300],
    ['2026-09', 3060]
  ]
  const history = [
    spend('2026-03-12', 999, GROCERIES),
    ...monthly.map(([m, v]) => spend(`${m}-10`, v, GROCERIES)),
    // Not costs: an own transfer, an XTB top-up, a purchase for the house.
    tx('2026-05-02', -zl(5000), { kind: 'transfer' }),
    tx('2026-06-02', -zl(1000), { kind: 'trading' }),
    tx('2026-07-02', -zl(400), { categoryId: GROCERIES, refundable: true }),
    // October (this month) does not count either.
    spend('2026-10-03', 5000, GROCERIES)
  ]

  it('pensja = średnie koszty netto z 6 pełnych miesięcy w górę do 100 zł', () => {
    expect(firstFullMonth(history)).toBe('2026-04')
    const p = proposeSalary(history, '2026-10')!
    expect(p.months).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'])
    // (3000 + 3200 + 2800 + 3100 + 3300 + 3060) / 6 = 3076,67 → 3100 zł.
    expect(p.average).toBe(307667)
    expect(p.amount).toBe(zl(3100))
    // A shorter history: the full months there are; none – no proposal.
    expect(proposeSalary(history, '2026-06')).toMatchObject({ months: ['2026-04', '2026-05'], amount: zl(3100) })
    expect(proposeSalary(history, '2026-04')).toBeNull()
  })

  it('koperty = średnie wydatki kategorii z 3 pełnych miesięcy do 10 zł, bez opłat z ładowni', () => {
    const rent = container({ name: 'Czynsz', amount: zl(2000), categoryId: RENT, counterparty: 'WSPOLNOTA MIESZKANIOWA 12' })
    const txs = [
      ...['07', '08', '09'].flatMap((m, i) => [
        spend(`2026-${m}-05`, 900 + i * 100, GROCERIES),
        spend(`2026-${m}-12`, i === 0 ? 1000 : 0, FUN),
        spend(`2026-${m}-15`, 2000, RENT, 'Wspólnota Mieszkaniowa'),
        spend(`2026-${m}-20`, 50, null)
      ]),
      spend('2026-06-05', 5000, GROCERIES)
    ].filter((t) => t.amount !== 0)
    const p = proposeEnvelopes(txs, categories, '2026-10', [rent])
    expect(p.months).toEqual(['2026-07', '2026-08', '2026-09'])
    const limit = (id: string) => p.envelopes.find((e) => e.categoryId === id)?.limit
    expect(limit(FOOD)).toBe(zl(1000))
    // 1000 / 3 = 333,33 → 330 zł.
    expect(limit(FUN)).toBe(zl(330))
    // The rent is the cargo's (a container of that counterparty), not the envelope's.
    expect(limit(HOME)).toBe(0)
    expect(p.uncategorized).toBe(zl(50))
    expect(p.envelopes.find((e) => e.categoryId === FOOD)?.kind).toBe('daily')
    expect(p.envelopes.find((e) => e.categoryId === AUTO)?.kind).toBe('planned')
  })

  it('stałe opłaty z historii: abonament co miesiąc i OC raz w roku; sklep i paliwo nie', () => {
    const txs = [
      ...['04', '05', '06', '07', '08', '09'].map((m) => spend(`2026-${m}-07`, m === '09' ? 52.99 : 49.99, STREAMING, 'NETFLIX.COM')),
      ...['04', '05', '06', '07', '08', '09'].flatMap((m) => [spend(`2026-${m}-03`, 80, GROCERIES, 'Biedronka'), spend(`2026-${m}-18`, 95, GROCERIES, 'Biedronka')]),
      ...['04', '05', '06', '07', '08', '09'].map((m, i) => spend(`2026-${m}-11`, [150, 420, 90, 300, 260, 180][i]!, AUTO, 'Orlen')),
      spend('2025-03-12', 1180, INSURANCE, 'PZU SA'),
      spend('2026-03-15', 1240, INSURANCE, 'PZU SA'),
      ...['04', '05', '06', '07', '08', '09'].map((m) => spend(`2026-${m}-01`, 2000, RENT, 'WSPOLNOTA'))
    ]
    const known = container({ name: 'Czynsz', amount: zl(2000), counterparty: 'Wspólnota' })
    const found = recurringPayments(txs, '2026-10', [known])
    expect(found.map((r) => [r.label, r.cycleMonths, r.amount, r.dueMonth, r.dueDay, r.categoryId])).toEqual([
      ['PZU SA', 12, zl(1240), '2026-03', 15, INSURANCE],
      ['NETFLIX.COM', 1, zl(52.99), '2026-09', 7, STREAMING]
    ])
  })
})

describe('podział pensji (spec: ładownia, odkładki, koperty planowe i codzienne)', () => {
  const plan = { salary: zl(5000), envelopes: { [FOOD]: zl(1000), [FUN]: zl(400), [AUTO]: zl(300) } }
  const rent = container({ name: 'Czynsz', amount: zl(2000), cycleMonths: 1, dueMonth: '2026-01' })
  const oc = container({ name: 'OC', amount: zl(1240), cycleMonths: 12, dueMonth: '2027-03' })
  const old = container({ name: 'Siłownia', amount: zl(120), until: '2026-08' })

  it('plan: kontenery, rata odkładki z planu, koperty i reszta niezaplanowana', () => {
    const s = salarySplit(plan, '2026-10', [rent, oc, old], categories)
    expect(s.cargo).toEqual({ items: [{ containerId: rent.id, name: 'Czynsz', amount: zl(2000) }], total: zl(2000) })
    // OC 1 240 zł a year = 11 × 103,33 + 103,37; October 2026 is the 7th month of the cycle ending in March 2027.
    expect(s.tanks.items).toEqual([{ containerId: oc.id, name: 'OC', amount: 10333, dueMonth: '2027-03', due: zl(1240) }])
    expect(s.envelopes.daily).toEqual({ items: [{ categoryId: FOOD, limit: zl(1000) }, { categoryId: FUN, limit: zl(400) }], total: zl(1400) })
    expect(s.envelopes.planned.total).toBe(zl(300))
    expect(s.allocated).toBe(zl(2000) + 10333 + zl(300) + zl(1400))
    expect(s.unallocated).toBe(zl(5000) - s.allocated)
    // „Podstawowy przydział”: 1 400 zł over 31 days.
    expect(s.dailyBase).toBe(4516)
  })

  it('miesiąc policzony przez silnik: raty odkładek z jego dziennika', () => {
    const s = salarySplit(plan, '2026-10', [rent, oc], categories, new Map([[oc.id, zl(250)]]))
    expect(s.tanks.items[0]?.amount).toBe(zl(250))
  })
})

describe('debriefing i łupy (D18)', () => {
  it('miesiąc na plus, FVG kopert, łupy z silnika i decyzja do 7. dnia', () => {
    const s = settings({ start: '2026-09-01' })
    const balances = [balanceSchema.parse({ ...base(), date: '2026-09-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(10000) })]
    const months = [monthPlanSchema.parse({ ...base(), month: '2026-09', salary: zl(3000), envelopes: { [FOOD]: zl(2000), [AUTO]: zl(300) } })]
    const rent = container({ name: 'Czynsz', amount: zl(800), counterparty: 'WSPOLNOTA' })
    // The rent paid as the cargo's (linked to its container): no envelope's spending.
    const transactions = [spend('2026-09-04', 700, GROCERIES), spend('2026-09-20', 500, GROCERIES), spend('2026-09-21', 400, AUTO), { ...spend('2026-09-10', 800, RENT, 'Wspólnota'), containerId: rent.id }]
    const fleet = computeFleet({ settings: s, transactions, months, balances, containers: [rent], now: '2026-10-03T10:00:00.000Z' })
    expect(layersSum(fleet)).toBe(fleet.total)
    const d = debriefing('2026-09', { transactions, categories, plans: months, log: fleet.log, today: fleet.today })
    expect(d).toMatchObject({ salary: zl(3000), paid: zl(3000), costs: zl(2400), plus: true, cargo: zl(800), uncategorized: 0 })
    expect(d.envelopes).toEqual([
      { categoryId: FOOD, kind: 'daily', limit: zl(2000), spent: zl(1200), gap: zl(800) },
      { categoryId: AUTO, kind: 'planned', limit: zl(300), spent: zl(400), gap: -zl(100) }
    ])
    // The energy left on 1 October: 3 000 − 2 400 = 600 zł – the loot, waiting for a decision (fleet.loot).
    expect(d.loot).toBe(zl(600))
    expect(fleet.loot).toEqual({ month: '2026-09', amount: zl(600) })
    expect(lootDeadline('2026-09')).toBe('2026-10-07')
    // Before the month ends nothing is known yet; a month over the salary is not „na plus”.
    expect(debriefing('2026-09', { transactions, categories, plans: months, log: fleet.log, today: '2026-09-30' }).loot).toBeNull()
    expect(debriefing('2026-09', { transactions: [...transactions, spend('2026-09-29', 700, FUN)], categories, plans: months, today: '2026-10-03' }).plus).toBe(false)
  })

  it('podział łupów: na następny miesiąc i cele, reszta do osłon; za dużo – przycięte', () => {
    expect(lootDecision(zl(600), { nextMonth: zl(200), goals: { G1: zl(100) } }, AT)).toEqual({ decidedAt: AT, shields: zl(300), nextMonth: zl(200), goals: { G1: zl(100) } })
    expect(lootDecision(zl(600), { nextMonth: zl(5000), goals: {} }, AT)).toEqual({ decidedAt: AT, shields: 0, nextMonth: zl(600), goals: {} })
  })
})

describe('pierwszy miesiąc budżetu (T45)', () => {
  it('start w połowie miesiąca: pensja pomniejszona o to, co miesiąc wydał przed startem', () => {
    const s = settings({ start: '2026-10-17' })
    const balances = [balanceSchema.parse({ ...base(), date: '2026-10-17', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(10000) })]
    const months = [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000), envelopes: { [FOOD]: zl(3100) } })]
    const transactions = [spend('2026-10-05', 1500, GROCERIES), spend('2026-10-17', 100, GROCERIES), tx('2026-09-28', -zl(900), { categoryId: GROCERIES })]
    const fleet = computeFleet({ settings: s, transactions, months, balances, now: '2026-10-17T12:00:00.000Z' })
    expect(fleet.salary).toMatchObject({ paid: zl(2500), alarm: null })
    // 2 500 zł of energy, 100 zł spent today.
    expect(fleet.energy).toBe(zl(2400))
    expect(fleet.shields.amount).toBe(zl(10000) - zl(2500))
    expect(layersSum(fleet)).toBe(fleet.total)
    // Today's energy counts the whole month: (3 100 − 1 500) / 15 days.
    expect(fleet.daily).toMatchObject({ spentBefore: zl(1500), allowance: Math.floor(zl(1600) / 15) })
    expect(sinkingOf(fleet.log, '2026-10').size).toBe(0)
  })
})

describe('ładownia: linia zanurzenia i symulacja (spec)', () => {
  it('nowy kontener ponad limit: masa ładunku i zasięg przed zapisem; zrzut kontenera', async () => {
    const { simulateCargo, monthlyShare } = await import('@shared/calc/plan')
    const rent = container({ name: 'Czynsz', amount: zl(1500), dueMonth: '2026-01' })
    const oc = container({ name: 'OC', amount: zl(1240), cycleMonths: 12, dueMonth: '2027-03' })
    expect(monthlyShare(oc)).toBe(10333)
    const base = { shields: zl(12000), hull: zl(21900), costs: zl(3650), salary: zl(4000), limitPct: 40, month: '2026-10', containers: [rent, oc] }
    const add = simulateCargo(base, { add: { amount: zl(150), cycleMonths: 1 } })
    // 1 500 + 103,33 = 1 603,33 zł = 40,1% of the salary: over the 40% line already; +150 zł → 43,8%.
    expect(add.before).toEqual({ monthly: zl(1500) + 10333, pct: ((zl(1500) + 10333) / zl(4000)) * 100, over: true })
    expect(add.after.monthly).toBe(zl(1650) + 10333)
    // The range: 33 900 / 3 650 = 9,29 → 33 900 / 3 800 = 8,92 months.
    expect(add.rangeBefore).toBeCloseTo(9.288, 3)
    expect(add.rangeAfter).toBeCloseTo(8.921, 3)
    const drop = simulateCargo(base, { drop: rent.id })
    expect(drop.after).toMatchObject({ monthly: 10333, over: false })
    expect(drop.rangeAfter).toBeCloseTo(zl(33900) / (zl(3650) - zl(1500)), 6)
  })
})

describe('kreator startu (spec: „Kreator startu”, D70)', () => {
  it('saldo otwarcia z salda teraz, cele warstw i podział obecnych środków według dokowania', async () => {
    const { openingFromNow, startSplit, startTargets } = await import('@shared/calc/start')
    const txs = [spend('2026-10-17', 40, GROCERIES), spend('2026-10-16', 100, GROCERIES), tx('2026-10-17', zl(500), { kind: 'income' })]
    // The bank shows 9 960 zł now: today's −40 and +500 are in it already.
    expect(openingFromNow(MBANK_ACCOUNT_ID, zl(9960), '2026-10-17', txs)).toBe(zl(9500))
    const targets = startTargets(zl(4000), zl(3650), { shieldSalaries: 3, hullMonths: 6 })
    expect(targets).toEqual({ shields: zl(12000), hull: zl(21900) })
    // 30 000 zł: shields full (12 000), the hull takes 18 000 – not full yet, nothing free.
    expect(startSplit(zl(30000), targets)).toEqual({ shields: zl(12000), hull: zl(18000), goals: {}, free: 0 })
    // 40 000 zł: both full, 6 100 zł free in the shields.
    expect(startSplit(zl(40000), targets)).toEqual({ shields: zl(18100), hull: zl(21900), goals: {}, free: zl(6100) })
    // A goal (N7): after the hull, by priority – what it does not need stays free.
    expect(startSplit(zl(40000), targets, [{ id: 'g', target: zl(5000) }])).toEqual({ shields: zl(13100), hull: zl(21900), goals: { g: zl(5000) }, free: zl(1100) })
    // No costs known: everything in the shields.
    expect(startSplit(zl(5000), startTargets(zl(4000), null, { shieldSalaries: 3, hullMonths: 6 }))).toEqual({ shields: zl(5000), hull: 0, goals: {}, free: 0 })
  })
})

describe('poprawki z przeglądu E3', () => {
  it('opłata okresowa sprzed startu (ze zbiornika) nie zmniejsza pierwszej pensji', () => {
    const s = settings({ start: '2026-10-15' })
    const oc = container({ name: 'OC', amount: zl(1200), cycleMonths: 12, dueMonth: '2026-10', dueDay: 3 })
    const balances = [balanceSchema.parse({ ...base(), date: '2026-10-15', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(10000) })]
    const months = [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000) })]
    const transactions = [{ ...spend('2026-10-03', 1200, INSURANCE, 'PZU SA'), containerId: oc.id }, spend('2026-10-05', 500, GROCERIES)]
    const fleet = computeFleet({ settings: s, transactions, months, balances, containers: [oc], now: '2026-10-15T12:00:00.000Z' })
    // 4 000 − 500 (groceries); the insurance was the tank's.
    expect(fleet.salary?.paid).toBe(zl(3500))
  })

  it('płatność bez kontrahenta (tylko tytuł): ten sam odbiorca w propozycjach i przy łączeniu z kontenerem', async () => {
    const { payeeKey, unlinkedPayments } = await import('@shared/calc/plan')
    const t = tx('2026-09-07', -zl(49.99), { counterparty: '', title: 'NETFLIX.COM', categoryId: STREAMING })
    expect(payeeKey(t)).toBe('netflixcom')
    const months = ['04', '05', '06', '07', '08', '09'].map((m) => tx(`2026-${m}-07`, -zl(49.99), { counterparty: '', title: 'NETFLIX.COM', categoryId: STREAMING }))
    expect(recurringPayments(months, '2026-10').map((r) => [r.label, r.cycleMonths])).toEqual([['NETFLIX.COM', 1]])
    expect(unlinkedPayments(months, 'NETFLIX.COM', '2026-09-01')).toHaveLength(1)
  })
})
