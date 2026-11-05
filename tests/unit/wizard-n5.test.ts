import { describe, expect, it } from 'vitest'
import { computeFleet, layersSum, type FleetInput } from '@shared/calc/fleet'
import { syncIctjGoals } from '@shared/calc/goals'
import { inboxStarted } from '@shared/calc/inbox'
import { recurringPayments } from '@shared/calc/plan'
import { fitEnvelopes, openingFromNow, shieldsMinimum, startEffect, startMoney, startSplit, startTargets } from '@shared/calc/start'
import { createDefaultSettings } from '@shared/defaults'
import type { IctjForecast } from '@shared/ictj'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Settings, type Transaction } from '@shared/schema'

/**
 * AP-25 (1.15.9, N5 – AF-10, AF-13, KR sp. 3, 5, 9, ME sp. 3): the start wizard's numbers. Step 6 splits the money at
 * the start of the start's day (R-4) and says what the start's day takes from the shields (the first salary, the members'
 * deposit) – the bridge's shields after „Uruchom budżet”; the envelopes' proposals fit the salary; the history's fees –
 * a bill every 2 months of a varying amount, never a schedule of a cancelled subscription; the goals of ICTTJ by their
 * deadlines; the reports wait for the wizard's start.
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N5W000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const GROCERIES = defaultCategoryId(1, 1)
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const opening = (accountId: string, date: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId, kind: 'opening', amount })
const plan = (month: string, salary: number) => monthPlanSchema.parse({ ...base(), month, salary, envelopes: {} })

describe('AP-25: krok 6 kreatora = start silnika (AF-10, KR.12, KR.23, R-4)', () => {
  // KR.12 (W2): mBank 8 432,17 zł „teraz” with today's purchases (45,90 + 12,00), Portfel XTB 1 250,00; Ania owes
  // 240,00, Łukasz has an advance of 300,00; the first salary 6 700,00.
  const today = '2026-11-03'
  const purchases = [tx(today, -zl(45.9), { categoryId: GROCERIES }), tx(today, -zl(12), { categoryId: GROCERIES })]
  const typed = { [MBANK_ACCOUNT_ID]: zl(8432.17), [XTB_WALLET_ACCOUNT_ID]: zl(1250) }

  it('podział od środków na początek dnia startu: wpisane saldo „teraz” bez dzisiejszych zakupów (9 740,07 zł, nie 9 682,17)', () => {
    expect(startMoney([MBANK_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID], typed, today, purchases, [])).toBe(zl(9740.07))
    // The same as „Uruchom budżet” writes (`openingFromNow`).
    expect(startMoney([MBANK_ACCOUNT_ID], typed, today, purchases, [])).toBe(openingFromNow(MBANK_ACCOUNT_ID, zl(8432.17), today, purchases))
    // An empty field of an account with its opening balance: the opening and the operations up to yesterday – today's
    // purchases never; an empty field without one: 0.
    const balances = [opening(MBANK_ACCOUNT_ID, '2026-11-01', zl(8600))]
    const before = [tx('2026-11-02', -zl(109.93), { categoryId: GROCERIES }), ...purchases]
    expect(startMoney([MBANK_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID], {}, today, before, balances)).toBe(zl(8490.07))
  })

  it('pierwsza pensja i depozyt domowników schodzą z osłon w dniu startu – osłony po starcie = osłony silnika (2 740,07 zł)', () => {
    const total = startMoney([MBANK_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID], typed, today, purchases, [])
    const e = startEffect({ total, hull: 0, goals: 0, tanks: 0, salary: zl(6700), spentBefore: 0, deposit: zl(300) })
    expect(e.split).toBe(zl(9740.07))
    expect(e.salary).toEqual({ due: zl(6700), fromShields: zl(6700), fromHull: 0, paid: zl(6700), alarm: null })
    expect(e.deposit).toEqual({ amount: zl(300), fromShields: zl(300), fromHull: 0 })
    expect(e.shields).toBe(zl(2740.07))
    // The engine, run on what „Uruchom budżet” writes: the same shields at the end of the day (today's purchases are the
    // energy's), the deposit 300, the energy 6 700 − 57,90.
    const s0 = createDefaultSettings(AT).settings
    const settings: Settings = {
      ...s0,
      budget: { start: today, initial: { shields: 0, hull: 0, goals: {} } },
      household: {
        ...s0.household,
        since: today,
        members: [
          { ...s0.household.members[0]!, name: 'Ania', opening: { owed: zl(240), deposit: 0 } },
          { ...s0.household.members[0]!, id: '01K9N5WMEM0000000000000002', name: 'Łukasz', opening: { owed: 0, deposit: zl(300) } }
        ]
      }
    }
    const input: FleetInput = {
      settings,
      transactions: purchases,
      balances: [opening(MBANK_ACCOUNT_ID, today, openingFromNow(MBANK_ACCOUNT_ID, zl(8432.17), today, purchases)), opening(XTB_WALLET_ACCOUNT_ID, today, zl(1250))],
      months: [plan('2026-11', zl(6700))],
      now: '2026-11-03T12:00:00+01:00'
    }
    const f = computeFleet(input)
    expect(layersSum(f)).toBe(f.total)
    expect(f.shields.amount).toBe(e.shields)
    expect(f.energy).toBe(zl(6700) - zl(57.9))
    // Below the orders' minimum (1 salary – 6 700 zł): said in step 6, as the briefing will.
    expect(startEffect({ total, hull: 0, goals: 0, tanks: 0, salary: zl(6700), spentBefore: 0, deposit: zl(300), min: shieldsMinimum(zl(6700), 1, 3) }).belowMin).toBe(true)
  })

  it('KR.23: 40 000 zł – kadłub 21 900, cele 6 100, osłony 12 000 → po pensji 4 000 zł osłony 8 000 zł; brak w osłonach – z kadłuba, dalej pensja częściowa', () => {
    const targets = startTargets(zl(4000), zl(3650), { shieldSalaries: 3, hullMonths: 6 })
    const split = startSplit(zl(40000), targets, [
      { id: 'a', target: zl(5000) },
      { id: 'b', target: zl(1100) }
    ])
    expect(split).toEqual({ shields: zl(12000), hull: zl(21900), goals: { a: zl(5000), b: zl(1100) }, free: 0 })
    const e = startEffect({ total: zl(40000), hull: split.hull, goals: zl(6100), tanks: 0, salary: zl(4000), spentBefore: 0, deposit: 0 })
    expect([e.split, e.shields, e.hull, e.salary.alarm]).toEqual([zl(12000), zl(8000), zl(21900), null])
    // What this month spent before the start came out of the salary (T45).
    expect(startEffect({ total: zl(40000), hull: split.hull, goals: zl(6100), tanks: 0, salary: zl(4000), spentBefore: zl(384.4), deposit: 0 }).salary.paid).toBe(zl(3615.6))
    // Shields 1 000 zł: the rest of the salary from the hull (yellow); the hull 2 000 zł too short – a partial salary.
    expect(startEffect({ total: zl(3000), hull: zl(2000), goals: 0, tanks: 0, salary: zl(2500), spentBefore: 0, deposit: 0 })).toMatchObject({
      salary: { fromShields: zl(1000), fromHull: zl(1500), paid: zl(2500), alarm: 'yellow' },
      shields: 0,
      hull: zl(500)
    })
    expect(startEffect({ total: zl(3000), hull: zl(2000), goals: 0, tanks: 0, salary: zl(4000), spentBefore: 0, deposit: zl(100) })).toMatchObject({
      salary: { paid: zl(3000), alarm: 'red' },
      // The deposit with nothing left: the shields below zero (the engine's `drawShields`).
      deposit: { fromShields: 0, fromHull: 0 },
      shields: -zl(100),
      hull: 0
    })
    expect(shieldsMinimum(null, 1, 3)).toBeNull()
    expect(shieldsMinimum(zl(4000), 4, 3)).toBe(zl(12000))
  })
})

describe('AP-25: propozycje kopert dopasowane do pensji (KR sp. 5, KR.21)', () => {
  it('średnie 3 mies. ponad to, co zostawia pensja: proporcjonalnie w dół, do pełnych 10 zł; mieszczące się – bez zmian', () => {
    const asked = { food: zl(3000), fun: zl(2530) }
    // 7 000 zł salary − 1 500 zł cargo = 5 500 zł for 5 530 zł asked.
    expect(fitEnvelopes(asked, zl(5500))).toEqual({ envelopes: { food: zl(2980), fun: zl(2510) }, fitted: true, asked: zl(5530) })
    expect(fitEnvelopes(asked, zl(5530))).toEqual({ envelopes: asked, fitted: false, asked: zl(5530) })
    // Nothing left after the cargo: no envelope proposed.
    expect(fitEnvelopes(asked, -zl(100)).envelopes).toEqual({ food: 0, fun: 0 })
  })
})

describe('AP-25: propozycje ładowni z historii (AF-13, KR.19, T286)', () => {
  const month = '2026-11'
  const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']
  // Rent every month (the months of the history are full).
  const rent = months.map((m) => tx(`${m}-10`, -zl(1500), { counterparty: 'WSPOLNOTA', categoryId: GROCERIES }))
  const found = (txs: Transaction[]) => recurringPayments([...rent, ...txs], month).filter((p) => p.label !== 'WSPOLNOTA').map((p) => ({ label: p.label, cycle: p.cycleMonths, amount: p.amount, schedule: p.schedule, variable: p.variable, day: p.dueDay }))

  it('prąd co 2 miesiące o zmiennej kwocie (150–230 zł) – propozycja „co 2 mies. · zmienna”, kwota z 75. percentyla roku', () => {
    // The year from 1.11.2025: 160, 175, 180, 199,99, 212,40, 230 – the 75th percentile 212,40 up to 213 zł.
    const power = ['2025-09-22', '2025-11-20', '2026-01-20', '2026-03-20', '2026-05-20', '2026-07-21', '2026-09-21'].map((d, i) => tx(d, -zl([150, 230, 212.4, 180, 160, 199.99, 175][i]!), { counterparty: 'TAURON' }))
    expect(found(power)).toEqual([{ label: 'TAURON', cycle: 2, amount: zl(213), schedule: [], variable: true, day: 20 }])
    // The same amounts every 2 months, but on any day of the month (the 1st, the 27th…) – a shop, no bill.
    const shop = ['2026-01-03', '2026-03-01', '2026-04-28', '2026-06-27', '2026-08-29', '2026-10-27'].map((d, i) => tx(d, -zl([150, 230, 212.4, 180, 160, 199.99][i]!), { counterparty: 'ZOOPLUS' }))
    expect(found(shop)).toEqual([])
  })

  it('subskrypcja płacona co miesiąc i anulowana w lipcu – nie „w miesiącach: sty…lip, lis, gru”; podatek w 4 miesiącach – harmonogram', () => {
    const spotify = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'].map((m) => tx(`${m}-08`, -zl(23.99), { counterparty: 'SPOTIFY' }))
    expect(found(spotify)).toEqual([])
    const tax = ['2025-11-15', '2026-03-16', '2026-05-15', '2026-09-14'].map((d) => tx(d, -zl(250), { counterparty: 'URZAD GMINY' }))
    expect(found(tax)).toEqual([{ label: 'URZAD GMINY', cycle: 12, amount: zl(250), schedule: [3, 5, 9, 11], variable: false, day: 15 }])
  })
})

describe('AP-25: cele prognozy ICTTJ według terminów (KR sp. 9, KR.22)', () => {
  it('nowe cele dostają priorytety od najbliższego terminu; bez terminu – na końcu, między równymi – kolejność scenariusza', () => {
    const forecast: IctjForecast = {
      id: '01KPRGN0000000000000000001',
      name: 'Plan A',
      currency: 'PLN',
      updatedAt: '2026-10-10T10:00:00.000Z',
      goals: [
        { id: '01KG0000000000000000000001', name: 'Wkład własny', month: '2029-04', amount: zl(80000), enabled: true },
        { id: '01KG0000000000000000000002', name: 'Rezerwa', month: null, amount: zl(1000), enabled: true },
        { id: '01KG0000000000000000000003', name: 'Nowe stanowisko tradingowe', month: '2026-12', amount: zl(3000), enabled: true },
        { id: '01KG0000000000000000000004', name: 'Kurs', month: '2026-12', amount: zl(500), enabled: true }
      ]
    }
    const added = syncIctjGoals(forecast, [], '2026-11-03T10:00:00.000Z').add
    expect(added.map((g) => [g.name, g.priority])).toEqual([
      ['Nowe stanowisko tradingowe', 1],
      ['Kurs', 2],
      ['Wkład własny', 3],
      ['Rezerwa', 4]
    ])
  })
})

describe('AP-25: meldunki z historii dopiero po starcie (ME sp. 3, ME.1)', () => {
  it('saldo otwarcia przed kreatorem uruchamia silnik, ale meldunki budżetu czekają na start kreatora', () => {
    expect(inboxStarted(true, null)).toBe(false)
    expect(inboxStarted(true, '2026-11-03')).toBe(true)
    expect(inboxStarted(false, '2026-11-30')).toBe(false)
  })
})
