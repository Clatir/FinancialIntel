import { describe, expect, it } from 'vitest'
import { computeFleet, type FleetEvent } from '@shared/calc/fleet'
import { goalsReachedIn, weekCovers, yearSpan } from '@shared/calc/intel'
import { lootChange, lootDecision } from '@shared/calc/plan'
import { yearPlan } from '@shared/calc/yearPlan'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS, machinePrefsFrom } from '@shared/machine'
import { dueNotices } from '@shared/notify'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Settings } from '@shared/schema'

/**
 * AP-24 (1.15.9, N5 – AF-34, AF-68, R-19, RY sp. 2, 3, 5, RY.25, PM sp. 12): the reports at the turn of a month and of
 * a year – the year's review only over its history, its start by the data's first day, every goal reached; the loot
 * changed after its decision said; the covers of the week; the year's review in January.
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: `01K9N5R000000000000000${String(++seq).padStart(4, '0')}`, createdAt: AT, updatedAt: AT })
const day = (iso: string) => iso.slice(0, 10)

describe('AP-24: przegląd roczny tylko z historią (R-19, AF-34, RY.24)', () => {
  it('pierwszy rok (historia od 01.09.2025): styczeń–sierpień „brak historii”, saldo na początku z dnia otwarcia, nie 31.12', () => {
    const span = yearSpan([{ date: '2025-09-03' }, { date: '2026-02-01' }], [{ date: '2025-09-01', kind: 'opening' }], '2025', '2026-11-04')
    expect(span.before).toEqual(['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08'])
    expect(span.months).toEqual(['2025-09', '2025-10', '2025-11', '2025-12'])
    expect(span.startsOn).toEqual({ date: '2025-09-01', opening: true })
    // The imported history before the first opening: its first day, „początek historii”.
    expect(yearSpan([{ date: '2025-08-28' }], [{ date: '2026-11-03', kind: 'opening' }], '2025', '2026-11-04').startsOn).toEqual({ date: '2025-08-28', opening: false })
  })

  it('budżet od 03.11.2026 bez historii: styczeń–październik „brak historii”, grudzień (przyszły) nie w tabeli; rok po pierwszym – cały', () => {
    const span = yearSpan([], [{ date: '2026-11-03', kind: 'opening' }], '2026', '2026-11-04')
    expect(span.before).toHaveLength(10)
    expect(span.months).toEqual(['2026-11'])
    expect(span.startsOn).toEqual({ date: '2026-11-03', opening: true })
    const next = yearSpan([{ date: '2025-09-03' }], [{ date: '2025-09-01', kind: 'opening' }], '2026', '2026-11-04')
    expect([next.before, next.months.length, next.startsOn]).toEqual([[], 11, null])
  })

  it('cele osiągnięte w roku – także zarchiwizowane i oznaczone jako osiągnięte (RY sp. 5: „Rower” 20.03.2026), w kolejności dojścia', () => {
    const log = [
      { date: '2026-02-10', moves: { goals: { laptop: zl(3000) } } },
      { date: '2026-06-01', moves: { goals: { laptop: zl(3000) } } },
      { date: '2025-12-01', moves: { goals: { tv: zl(2000) } } }
    ] as unknown as FleetEvent[]
    const goals = [
      { id: 'laptop', name: 'Nowy laptop', target: zl(6000), achievedAt: null },
      { id: 'bike', name: 'Rower', target: zl(4000), achievedAt: '2026-03-20T09:00:00.000Z' },
      { id: 'tv', name: 'Telewizor', target: zl(2000), achievedAt: null }
    ]
    expect(goalsReachedIn(log, goals, '2026', day)).toEqual(['Rower', 'Nowy laptop'])
    expect(goalsReachedIn(log, goals, '2025', day)).toEqual(['Telewizor'])
  })
})

describe('AP-24: łupy przeliczone późnym importem (RY sp. 3, B10)', () => {
  it('decyzja z 1 900 zł, silnik po imporcie 4 000 zł – „było / jest”; ta sama kwota albo brak decyzji – nic', () => {
    const decision = lootDecision(zl(1900), { nextMonth: zl(900), goals: {} }, '2026-10-02T10:00:00.000Z')
    expect(lootChange(decision, { amount: zl(4000) })).toEqual({ decided: zl(1900), now: zl(4000) })
    expect(lootChange(decision, { amount: zl(1900) })).toBeNull()
    expect(lootChange(null, { amount: zl(4000) })).toBeNull()
    expect(lootChange(decision, null)).toBeNull()
  })
})

describe('AP-24: raport wachty – pokrycia kopert tygodnia (PM sp. 12, F28)', () => {
  it('tylko pokrycia z dni tygodnia (dzień warszawski), w kolejności chwil', () => {
    const plans = [
      { envelopeCovers: [{ id: 'c1', from: 'food', to: 'auto', amount: zl(120), at: '2026-11-03T09:00:00.000Z' }] },
      {
        envelopeCovers: [
          { id: 'c0', from: 'fun', to: 'auto', amount: zl(50), at: '2026-10-26T23:30:00.000Z' },
          { id: 'c2', from: 'fun', to: 'food', amount: zl(30), at: '2026-11-01T22:59:00.000Z' }
        ]
      }
    ]
    // Warsaw: 26.10 23:30 UTC is the 27th; 1.11 22:59 UTC – 1.11 23:59.
    const warsaw = (iso: string) => new Date(Date.parse(iso) + 3_600_000).toISOString().slice(0, 10)
    expect(weekCovers(plans, '2026-10-26', warsaw)).toEqual([
      { date: '2026-10-27', from: 'fun', to: 'auto', amount: zl(50) },
      { date: '2026-11-01', from: 'fun', to: 'food', amount: zl(30) }
    ])
    expect(weekCovers(plans, '2026-11-02', warsaw)).toEqual([{ date: '2026-11-03', from: 'food', to: 'auto', amount: zl(120) }])
  })
})

describe('AP-24: przypomnienie o przeglądzie rocznym w styczniu (RY.25, spec „Rytuały”)', () => {
  const fleetAt = (start: string, now: string) => {
    const s = createDefaultSettings(AT).settings
    const settings: Settings = { ...s, budget: { ...s.budget, start } }
    const balances = [balanceSchema.parse({ ...base(), date: start, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })]
    const months = [monthPlanSchema.parse({ ...base(), month: start.slice(0, 7), salary: zl(3100), envelopes: {} })]
    return computeFleet({ settings, transactions: [], months, balances, now })
  }
  const input = (fleet: ReturnType<typeof fleetAt>, prefs = DEFAULT_MACHINE_PREFS.notify) => ({
    fleet,
    containers: [],
    imports: [{ name: 'mBank', last: `${fleet.today}T08:00:00.000Z` }],
    lastConfirmation: fleet.today,
    label: () => '',
    prefs,
    quietHours: { from: '23:00', to: '05:00' },
    time: '12:00',
    opened: false,
    briefingShown: true,
    money: (g: number) => `${(g / 100).toFixed(2)} zł`
  })
  const year = (n: ReturnType<typeof dueNotices>) => n.filter((x) => x.tag === 'year').map((x) => [x.key, x.title])

  it('w styczniu raz za rok zamknięty – klucz roku; nie w lutym, nie bez budżetu w tamtym roku, nie przy wyłączonym', () => {
    expect(year(dueNotices(input(fleetAt('2026-09-01', '2027-01-04T12:00:00+01:00'))))).toEqual([['year:2026', 'Przegląd roczny']])
    expect(year(dueNotices(input(fleetAt('2026-09-01', '2027-02-02T12:00:00+01:00'))))).toEqual([])
    expect(year(dueNotices(input(fleetAt('2027-01-02', '2027-01-04T12:00:00+01:00'))))).toEqual([])
    expect(year(dueNotices(input(fleetAt('2026-09-01', '2027-01-04T12:00:00+01:00'), { ...DEFAULT_MACHINE_PREFS.notify, yearReview: false })))).toEqual([])
    // Its own switch, on by default; a config.json of before keeps it on.
    expect(machinePrefsFrom({ notify: {} }).notify.yearReview).toBe(true)
    expect(machinePrefsFrom({ notify: { yearReview: false } }).notify.yearReview).toBe(false)
  })
})

describe('AP-24: plan kampanii – „rok wcześniej” przed historią (PM sp. 10)', () => {
  it('miesiąc rok wcześniej sprzed pierwszej operacji – brak faktu (null), nie 0,00 zł; po niej – wydatki tamtego miesiąca', () => {
    const FOOD = defaultCategoryId(1)
    const spend = (date: string, v: number) => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -zl(v), categoryId: defaultCategoryId(1, 1) })
    const plans = [monthPlanSchema.parse({ ...base(), month: '2025-09', salary: zl(3000), envelopes: { [FOOD]: zl(1000) } })]
    const y = yearPlan('2026', { plans, categories: createDefaultSettings(AT).settings.categories, transactions: [spend('2025-09-03', 400), spend('2025-10-03', 300)], containers: [], today: '2026-11-04' })
    const food = y.rows.find((r) => r.id === FOOD)!
    expect(food.cells.find((c) => c.month === '2026-08')!.yearAgo).toBeNull()
    expect(food.cells.find((c) => c.month === '2026-09')!.yearAgo).toBe(zl(400))
    expect(food.cells.find((c) => c.month === '2026-11')!.yearAgo).toBe(0)
  })
})
