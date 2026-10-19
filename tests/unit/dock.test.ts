import { describe, expect, it } from 'vitest'
import { addWorkingDays, deliveries, pendingPairDays, previewDocking, type DeliveriesInput } from '@shared/calc/dock'
import { isPolishHoliday } from '@shared/calc/dates'
import { computeFleet, layersSum, type FleetEvent, type FleetInput } from '@shared/calc/fleet'
import { goalEtas, goalInflow, renumber, syncIctjGoals, byPriority } from '@shared/calc/goals'
import { createDefaultSettings } from '@shared/defaults'
import { chosenForecast, parseIctjForecast, parseIctjPayout, type IctjEntry, type IctjForecast } from '@shared/ictj'
import {
  balanceSchema,
  dockingSchema,
  goalSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
  type Docking,
  type Goal,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K1000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'trading', amount, counterparty: 'XTB S.A.', ...over })
const entry = (date: string, amount: number, over: Partial<IctjEntry> = {}): IctjEntry => ({ id: nextId(), kind: 'withdrawal', date, amount, pool: 'current', note: '', updatedAt: null, ...over })
const docking = (t: Transaction, over: Partial<Docking> = {}): Docking => dockingSchema.parse({ ...base(), date: t.date, transactionId: t.id, ...over })
const goal = (name: string, target: number, priority: number, over: Partial<Goal> = {}) => goalSchema.parse({ ...base(), name, target, priority, ...over })

const input = (over: Partial<DeliveriesInput>): DeliveriesInput => ({ entries: [], transactions: [], dockings: [], start: '2026-10-01', today: '2026-10-20', skipped: [], ictjOn: true, coveredTo: null, ...over })

describe('ICTTJ: odczyt wpisów i scenariuszy (tylko używane pola, nowszy format czytany)', () => {
  it('wypłata i zwrot w groszach, wydatek pominięty, nieznana pula = zwykłe dokowanie', () => {
    const w = parseIctjPayout({ schemaVersion: 1, id: '01KPAY00000000000000000001', kind: 'withdrawal', date: '2026-10-16', amount: 1234.56, pool: 'goals', note: 'na wakacje', extra: true })
    expect(w).toEqual({ entry: { id: '01KPAY00000000000000000001', kind: 'withdrawal', date: '2026-10-16', amount: 123456, pool: 'goals', note: 'na wakacje', updatedAt: null }, schemaVersion: 1, problem: null })
    expect(parseIctjPayout({ schemaVersion: 1, id: '01KPAY00000000000000000002', kind: 'expense', date: '2026-10-16', amount: 50, pool: 'current' })).toEqual({ entry: null, schemaVersion: 1, problem: null })
    const newer = parseIctjPayout({ schemaVersion: 2, id: '01KPAY00000000000000000003', kind: 'return', date: '2026-10-16', amount: 10, pool: 'savings' })
    expect(newer.entry).toMatchObject({ kind: 'return', pool: 'current', amount: 1000 })
    expect(newer.schemaVersion).toBe(2)
    expect(newer.problem).toContain('savings')
    expect(parseIctjPayout({ id: 'zły', kind: 'withdrawal' }).problem).toBe('nieczytelny wpis')
    expect(parseIctjPayout({ schemaVersion: 1, id: '01KPAY00000000000000000004', kind: 'transfer', date: '2026-10-16', amount: 10, pool: 'current' }).problem).toContain('transfer')
  })

  it('cele scenariusza: miesiąc od startu prognozy, kwota × 100, wyłączone zostają z flagą, zły cel pominięty', () => {
    const { forecast } = parseIctjForecast({
      schemaVersion: 1,
      id: '01KPRGN0000000000000000001',
      name: 'Plan 2027',
      currency: 'PLN',
      firstMonth: '2026-11',
      goals: [
        { id: '01KG0000000000000000000001', name: 'Wakacje', month: 3, amount: 8000, enabled: true },
        { id: '01KG0000000000000000000002', name: '', month: null, amount: null, enabled: false },
        { id: 'zły', name: 'X' }
      ],
      draws: { rate: [0.5] }
    })
    expect(forecast).toEqual({
      id: '01KPRGN0000000000000000001',
      name: 'Plan 2027',
      currency: 'PLN',
      updatedAt: null,
      goals: [
        { id: '01KG0000000000000000000001', name: 'Wakacje', month: '2027-01', amount: 800000, enabled: true },
        { id: '01KG0000000000000000000002', name: 'Cel', month: null, amount: null, enabled: false }
      ]
    })
    expect(parseIctjForecast({ id: '01KPRGN0000000000000000002', name: 'bez startu' }).forecast).toBeNull()
  })

  it('scenariusz celów: wybrany w ustawieniach, inaczej zmieniony ostatnio w ICTTJ', () => {
    const a = { id: 'A', name: 'A', currency: 'PLN', goals: [], updatedAt: '2026-10-01T10:00:00.000Z' }
    const b = { id: 'B', name: 'B', currency: 'PLN', goals: [], updatedAt: '2026-10-05T10:00:00.000Z' }
    expect(chosenForecast([a, b], null)?.id).toBe('B')
    expect(chosenForecast([a, b], 'A')?.id).toBe('A')
    expect(chosenForecast([a, b], 'C')).toBeNull()
    expect(chosenForecast([], null)).toBeNull()
  })
})

describe('dopasowanie wypłat z ICTTJ do wpływów z XTB (D56, D72: 3 dni robocze)', () => {
  it('dni robocze: piątek + 3 = środa', () => {
    expect(addWorkingDays('2026-10-16', 3)).toBe('2026-10-21')
    expect(addWorkingDays('2026-10-19', 3)).toBe('2026-10-22')
  })

  it('wypłata z piątku paruje z wpływem w poniedziałek; ta sama kwota w groszach, każdy raz', () => {
    const e = entry('2026-10-16', zl(1200))
    const other = entry('2026-10-16', zl(1200))
    const monday = tx('2026-10-19', zl(1200))
    const list = deliveries(input({ entries: [e, other], transactions: [monday], today: '2026-10-19' }))
    expect(list.map((d) => [d.entry?.id, d.state, d.transaction?.id ?? null, d.wallet])).toEqual([
      [e.id, 'pending', monday.id, false],
      // The second entry of the same amount waits for its own inflow.
      [other.id, 'waiting', null, false]
    ])
  })

  it('bez pary po 3 dniach roboczych → Portfel XTB do potwierdzenia; wcześniej czeka na import', () => {
    const e = entry('2026-10-16', zl(500))
    const different = tx('2026-10-19', zl(450))
    expect(deliveries(input({ entries: [e], transactions: [different], today: '2026-10-21' })).find((d) => d.entry)).toMatchObject({ state: 'waiting', wallet: false })
    const late = deliveries(input({ entries: [e], transactions: [different], today: '2026-10-22' }))
    expect(late[0]).toMatchObject({ key: `ictj:${e.id}`, state: 'pending', wallet: true, transaction: null })
    // The inflow of another amount is an XTB inflow without an entry (a reminder to add it in ICTTJ).
    expect(late[1]).toMatchObject({ key: `tx:${different.id}`, state: 'pending', missingEntry: true })
  })

  it('Portfel XTB dopiero, gdy import z mBanku sięga za okno – bez nowego importu wypłata dalej czeka (bez podwójnego liczenia)', () => {
    const e = entry('2026-10-16', zl(500))
    expect(deliveries(input({ entries: [e], today: '2026-10-23', coveredTo: '2026-10-19' }))[0]).toMatchObject({ state: 'waiting', wallet: false })
    expect(deliveries(input({ entries: [e], today: '2026-10-23', coveredTo: '2026-10-22' }))[0]).toMatchObject({ state: 'pending', wallet: true })
  })

  it('dwa dokowania jednej operacji (dwa komputery naraz): liczy się wcześniejsze – w silniku i w oknie', () => {
    const t = tx('2026-10-12', zl(1000))
    const later = dockingSchema.parse({ ...base(), createdAt: '2026-10-12T12:00:00.000Z', date: t.date, transactionId: t.id, split: { hull: zl(1000) } })
    const earlier = dockingSchema.parse({ ...base(), createdAt: '2026-10-12T11:00:00.000Z', date: t.date, transactionId: t.id, pool: 'tax' })
    expect(deliveries(input({ transactions: [t], dockings: [later, earlier] }))[0]!.docking?.id).toBe(earlier.id)
    expect(computeFleet(ship({ transactions: [t], dockings: [later, earlier] })).taxHold).toBe(zl(1000))
    expect(computeFleet(ship({ transactions: [t], dockings: [earlier, later] })).taxHold).toBe(zl(1000))
  })

  it('wpływ za późno (po 3 dniach roboczych) nie jest parą; wpis zapisany w ICTTJ dzień po wpływie – jest', () => {
    const e = entry('2026-10-16', zl(700))
    const wedLate = tx('2026-10-22', zl(700))
    expect(deliveries(input({ entries: [e], transactions: [wedLate], today: '2026-10-22' }))[0]).toMatchObject({ state: 'pending', wallet: true })
    const e2 = entry('2026-10-20', zl(300))
    const before = tx('2026-10-19', zl(300))
    expect(deliveries(input({ entries: [e2], transactions: [before] }))[0]).toMatchObject({ state: 'pending', transaction: { id: before.id } })
  })

  it('zwrot do masy paruje z wypływem do XTB; zadokowany wpis już nie wraca; sprzed startu i pominięte osobno', () => {
    const ret = entry('2026-10-10', zl(2000), { kind: 'return' })
    const out = tx('2026-10-12', -zl(2000))
    const done = entry('2026-10-05', zl(900))
    const doneTx = tx('2026-10-06', zl(900))
    const old = entry('2026-09-20', zl(100))
    const skip = entry('2026-10-08', zl(50))
    const list = deliveries(input({ entries: [ret, done, old, skip], transactions: [out, doneTx], dockings: [docking(doneTx, { ictjEntryId: done.id, pool: 'current' })], skipped: [skip.id] }))
    expect(list.map((d) => [d.entry?.id ?? d.transaction?.id, d.state, d.direction])).toEqual([
      [ret.id, 'pending', 'out'],
      [done.id, 'docked', 'in'],
      [skip.id, 'skipped', 'in'],
      [old.id, 'before-start', 'in']
    ])
    expect(list[0]!.transaction?.id).toBe(out.id)
  })

  it('wpływ z XTB zadokowany bez wpisu dostaje wpis później (do ponownego zadokowania z pulą); bez ICTTJ na komputerze – bez przypomnienia', () => {
    const t = tx('2026-10-12', zl(1500))
    const d = docking(t)
    expect(deliveries(input({ transactions: [t], dockings: [d], ictjOn: false }))).toMatchObject([{ key: `tx:${t.id}`, state: 'docked', missingEntry: false }])
    const e = entry('2026-10-12', zl(1500), { pool: 'goals' })
    expect(deliveries(input({ entries: [e], transactions: [t], dockings: [d] }))).toMatchObject([{ key: `ictj:${e.id}`, state: 'pending', docking: { id: d.id } }])
  })

  it('zmieniona kwota w ICTTJ po zadokowaniu = rozbieżność', () => {
    const e = entry('2026-10-12', zl(1000))
    const t = tx('2026-10-12', zl(1100))
    expect(deliveries(input({ entries: [e], transactions: [t], dockings: [docking(t, { ictjEntryId: e.id })] }))[0]).toMatchObject({ state: 'docked', mismatch: true })
  })
})

function settingsWith(over: { budget?: Partial<Settings['budget']>; layers?: Partial<Settings['layers']>; orders?: Partial<Settings['orders']> } = {}): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, ...over.budget }, layers: { ...s.layers, ...over.layers }, orders: { ...s.orders, ...over.orders } }
}

/** The spec's ship: shields 8 640 / 12 000 zł, hull 15 000 / 21 900 zł (October, salary 4 000 zł, costs 3 650 zł). */
function ship(extra: Partial<FleetInput> = {}): FleetInput {
  return {
    settings: settingsWith({ budget: { start: '2026-10-01', initial: { shields: zl(12640), hull: zl(15000), goals: {} } }, layers: { assumedCosts: zl(3650) } }),
    balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(27640) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000) })],
    transactions: [],
    now: '2026-10-20T12:00:00+02:00',
    ...extra
  }
}

describe('dokowanie (1.5.0): święta, zasięg pliku, granica startu, osierocone i podwójne dokowania, inna kwota (B15–B22, F42)', () => {
  it('F42: polskie święta nie są dniami roboczymi – Wielkanoc 2027, Wigilia od 2025, Boże Ciało', () => {
    expect(isPolishHoliday('2027-03-29')).toBe(true)
    expect(isPolishHoliday('2027-03-28')).toBe(true)
    expect(isPolishHoliday('2026-06-04')).toBe(true)
    expect(isPolishHoliday('2025-12-24')).toBe(true)
    expect(isPolishHoliday('2024-12-24')).toBe(false)
    expect(isPolishHoliday('2026-11-11')).toBe(true)
    expect(isPolishHoliday('2026-11-12')).toBe(false)
    // Thursday + 3 working days: Friday, (weekend, Easter Monday) Tuesday, Wednesday.
    expect(addWorkingDays('2027-03-25', 3)).toBe('2027-03-31')
    expect(addWorkingDays('2026-12-23', 2)).toBe('2026-12-29')
  })

  it('B18: „Portfel XTB?” liczy się od zasięgu pliku z banku, nie od chwili importu', () => {
    const e = entry('2026-10-16', zl(500))
    expect(deliveries(input({ entries: [e], today: '2026-10-25', coveredTo: '2026-10-10' }))[0]).toMatchObject({ state: 'waiting', wallet: false })
    expect(deliveries(input({ entries: [e], today: '2026-10-25', coveredTo: '2026-10-22' }))[0]).toMatchObject({ state: 'pending', wallet: true })
  })

  it('B19: o starcie budżetu decyduje data pieniędzy – para sprzed startu „sprzed startu”, wpis sprzed startu z parą po nim dokuje', () => {
    const start = '2026-10-01'
    // (a) The inflow on 30.09 (in the opening balance), the entry on 01.10: both before the start – nothing to dock.
    const before = tx('2026-09-30', zl(1200))
    const a = deliveries(input({ start, entries: [entry('2026-10-01', zl(1200))], transactions: [before], today: '2026-10-20', coveredTo: '2026-10-19' }))
    expect(a.map((d) => [d.state, d.wallet, d.transaction?.id ?? null])).toEqual([['before-start', false, before.id]])
    // (b) The entry of the pool Podatek on 29.09, the money on 02.10: it docks with its pool, no „bez wpisu”.
    const after = tx('2026-10-02', zl(800))
    const b = deliveries(input({ start, entries: [entry('2026-09-29', zl(800), { pool: 'tax' })], transactions: [after], today: '2026-10-20' }))
    expect(b.map((d) => [d.key.split(':')[0], d.state, d.transaction?.id])).toEqual([['ictj', 'pending', after.id]])
    // (c) No pair, the window beginning before the start: in the opening balances – never Portfel XTB.
    expect(deliveries(input({ start, entries: [entry('2026-10-02', zl(300))], today: '2026-10-20', coveredTo: '2026-10-19' }))[0]).toMatchObject({ state: 'before-start', wallet: false })
  })

  it('B22: kwota w banku inna o grosze – możliwa para, bez „Portfel XTB?” i bez „wpływ bez wpisu”; dokładna para ma pierwszeństwo', () => {
    const e = entry('2026-10-16', zl(1000))
    const near = tx('2026-10-19', zl(999.5))
    const list = deliveries(input({ entries: [e], transactions: [near], today: '2026-10-28', coveredTo: '2026-10-27' }))
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ key: `ictj:${e.id}`, state: 'pending', near: true, mismatch: true, wallet: false, transaction: near })
    // A transfer after the holidays: past the window, within the days after it.
    const late = tx('2026-10-24', zl(995))
    expect(deliveries(input({ entries: [e], transactions: [late], today: '2026-10-28' }))[0]).toMatchObject({ near: true, transaction: late })
    // Far off (> max(5 zł, 1%)): no pair.
    expect(deliveries(input({ entries: [e], transactions: [tx('2026-10-19', zl(980))], today: '2026-10-28' }))[0]).toMatchObject({ near: false, transaction: null })
    // Two entries: the exact one takes its operation, the other the near one.
    const e2 = entry('2026-10-16', zl(999.5))
    const both = deliveries(input({ entries: [e, e2], transactions: [near, tx('2026-10-19', zl(1000))], today: '2026-10-28' }))
    expect(both.find((d) => d.key === `ictj:${e2.id}`)).toMatchObject({ near: false, transaction: near })
  })

  it('B15: dokowanie operacji, której nie ma (usunięta) – wpis znów do zadokowania, z innym wpływem albo Portfelem', () => {
    const e = entry('2026-10-16', zl(800), { pool: 'tax' })
    const gone = tx('2026-10-16', zl(800), { accountId: XTB_WALLET_ACCOUNT_ID })
    const orphan = docking(gone, { ictjEntryId: e.id, pool: 'tax' })
    const real = tx('2026-10-17', zl(800))
    const list = deliveries(input({ entries: [e], transactions: [real], dockings: [orphan], today: '2026-10-25' }))
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ key: `ictj:${e.id}`, state: 'pending', transaction: real, orphans: [orphan] })
  })

  it('B16: pula zmieniona w ICTTJ po dokowaniu – oznaczona; B17: dwa dokowania jednego wpisu (dwa komputery) – drugie do usunięcia', () => {
    const e = entry('2026-10-16', zl(800), { pool: 'tax' })
    const t = tx('2026-10-17', zl(800))
    const d = docking(t, { ictjEntryId: e.id, pool: 'current' })
    expect(deliveries(input({ entries: [e], transactions: [t], dockings: [d] }))[0]).toMatchObject({ state: 'docked', poolChanged: true, mismatch: false })
    const w1 = tx('2026-10-16', zl(800), { accountId: XTB_WALLET_ACCOUNT_ID, createdAt: '2026-10-20T10:00:00.000Z' })
    const w2 = tx('2026-10-16', zl(800), { accountId: XTB_WALLET_ACCOUNT_ID, createdAt: '2026-10-20T10:05:00.000Z' })
    const d1 = docking(w1, { ictjEntryId: e.id, pool: 'tax', createdAt: '2026-10-20T10:00:00.000Z' })
    const d2 = docking(w2, { ictjEntryId: e.id, pool: 'tax', createdAt: '2026-10-20T10:05:00.000Z' })
    const twice = deliveries(input({ entries: [e], transactions: [w1, w2], dockings: [d2, d1] }))
    expect(twice).toHaveLength(1)
    expect(twice[0]).toMatchObject({ docking: d1, transaction: w1, extra: [{ docking: d2, transaction: w2 }] })
    // One computer on Portfel XTB (earlier), the other with the bank's inflow: the bank's counts, the made-up one goes.
    const bank = tx('2026-10-17', zl(800), { bank: { key: 'k1', importedAt: AT } as Transaction['bank'] })
    const db = docking(bank, { ictjEntryId: e.id, pool: 'tax', createdAt: '2026-10-20T10:07:00.000Z' })
    const mixed = deliveries(input({ entries: [e], transactions: [w1, bank], dockings: [d1, db] }))
    expect(mixed).toHaveLength(1)
    expect(mixed[0]).toMatchObject({ docking: db, transaction: bank, extra: [{ docking: d1, transaction: w1 }] })
  })

  it('B21: wpis usunięty w ICTTJ i wpisany od nowa – operacja banku paruje z nowym; bez nowego – do zadokowania z dopiskiem', () => {
    const old = entry('2026-10-16', zl(800), { pool: 'tax' })
    const fresh = entry('2026-10-16', zl(800), { pool: 'current' })
    const t = tx('2026-10-17', zl(800))
    const d = docking(t, { ictjEntryId: old.id, pool: 'tax' })
    const list = deliveries(input({ entries: [fresh], transactions: [t], dockings: [d], entriesComplete: true, today: '2026-10-25', coveredTo: '2026-10-24' }))
    expect(list.map((x) => [x.key, x.state, x.transaction?.id, x.docking?.id, x.wallet])).toEqual([[`ictj:${fresh.id}`, 'pending', t.id, d.id, false]])
    const alone = deliveries(input({ entries: [], transactions: [t], dockings: [d], entriesComplete: true }))
    expect(alone[0]).toMatchObject({ key: `tx:${t.id}`, state: 'pending', entryGone: true })
    // ICTTJ not read whole (a file syncing): the docking stands – nothing to dock again.
    expect(deliveries(input({ entries: [], transactions: [t], dockings: [d], entriesComplete: false }))).toEqual([])
    // The payouts listed whole, its own file not read (a broken one): not deleted either.
    expect(deliveries(input({ entries: [], transactions: [t], dockings: [d], entriesComplete: true, unreadEntries: [old.id] }))).toEqual([])
  })

  it('B20: dni do wstrzymania gry – para wypłaty bez dokowania', () => {
    const e = entry('2026-10-16', zl(800), { pool: 'tax' })
    const t = tx('2026-10-17', zl(800))
    expect(pendingPairDays(deliveries(input({ entries: [e], transactions: [t] })))).toEqual(['2026-10-17'])
    expect(pendingPairDays(deliveries(input({ entries: [e], transactions: [t], dockings: [docking(t, { ictjEntryId: e.id, pool: 'tax' })] })))).toEqual([])
  })
})

describe('silnik: pule ICTTJ', () => {
  it('pula Cele: najpierw cele z prognozy ICTTJ (wg listy), potem własne; nadmiar do osłon', () => {
    const own = goal('Rower', zl(1000), 1)
    const trip = goal('Wakacje', zl(3000), 2, { source: 'ictj' })
    const t = tx('2026-10-12', zl(5000))
    const s = computeFleet(ship({ transactions: [t], goals: [own, trip], dockings: [docking(t, { pool: 'goals' })] }))
    expect(s.goals.map((g) => [g.name, g.amount])).toEqual([
      ['Rower', zl(1000)],
      ['Wakacje', zl(3000)]
    ])
    expect(s.log.find((e) => e.txId === t.id)!.moves).toEqual({ goals: { [trip.id]: zl(3000), [own.id]: zl(1000) }, shields: zl(1000) })
    expect(layersSum(s)).toBe(s.total)
  })

  it('zwrot z puli Podatek wraca z rezerwy podatkowej, bez alarmu firewalla; zwykły zwrot bez pełnych osłon – firewall', () => {
    const tax = tx('2026-10-05', zl(800))
    const back = tx('2026-10-15', -zl(300))
    const s = computeFleet(ship({ transactions: [tax, back], dockings: [docking(tax, { pool: 'tax' }), docking(back, { pool: 'tax' })] }))
    expect(s.taxHold).toBe(zl(500))
    expect(s.alarms.filter((a) => a.kind === 'firewall')).toEqual([])
    const top = tx('2026-10-15', -zl(300))
    expect(computeFleet(ship({ transactions: [top] })).alarms.map((a) => a.kind)).toContain('firewall')
  })

  it('podgląd dokowania: te same ruchy co silnik (5 000 zł → osłony +3 360, kadłub +1 640)', () => {
    const t = tx('2026-10-10', zl(5000))
    expect(previewDocking(ship(), t, null)).toEqual({ shields: zl(3360), hull: zl(1640) })
    // Portfel XTB, pula Podatek: poza budżetem.
    const w = tx('2026-10-10', zl(700), { accountId: XTB_WALLET_ACCOUNT_ID })
    expect(previewDocking(ship(), w, docking(w, { pool: 'tax' }))).toEqual({ taxHold: zl(700) })
  })
})

describe('cele: scenariusz ICTTJ, lista priorytetów, ETA', () => {
  const forecast = (over: Partial<IctjForecast> = {}): IctjForecast => ({
    id: '01KPRGN0000000000000000001',
    name: 'Plan',
    currency: 'PLN',
    updatedAt: '2026-10-10T10:00:00.000Z',
    goals: [
      { id: '01KG0000000000000000000001', name: 'Wakacje', month: '2027-01', amount: zl(8000), enabled: true },
      { id: '01KG0000000000000000000002', name: 'Laptop', month: null, amount: zl(6000), enabled: true },
      { id: '01KG0000000000000000000003', name: 'Wyłączony', month: null, amount: zl(1), enabled: false }
    ],
    ...over
  })
  const NOW = '2026-10-17T10:00:00.000Z'

  it('nowe cele z id ICTTJ na końcu listy, zmiany nazwy i kwoty, zniknięte zarchiwizowane; scenariusz w USD bez kwoty', () => {
    const own = goal('Rower', zl(1000), 4)
    const first = syncIctjGoals(forecast(), [own], NOW)
    expect(first.update).toEqual([])
    expect(first.add.map((g) => [g.id, g.name, g.target, g.priority, g.deadline, g.source])).toEqual([
      ['01KG0000000000000000000001', 'Wakacje', zl(8000), 5, '2027-01', 'ictj'],
      ['01KG0000000000000000000002', 'Laptop', zl(6000), 6, null, 'ictj']
    ])
    const goals = [own, ...first.add]
    expect(syncIctjGoals(forecast(), goals, NOW)).toEqual({ add: [], update: [] })
    const changed = syncIctjGoals(forecast({ updatedAt: '2026-10-12T10:00:00.000Z', goals: [{ id: '01KG0000000000000000000001', name: 'Wakacje w Grecji', month: '2027-02', amount: zl(9000), enabled: true }] }), goals, NOW)
    expect(changed.add).toEqual([])
    expect(changed.update.map((g) => [g.name, g.target, g.deadline, g.archived])).toEqual([
      ['Wakacje w Grecji', zl(9000), '2027-02', false],
      ['Laptop', zl(6000), null, true]
    ])
    // An older copy of the scenario (OneDrive still syncing) changes nothing.
    const synced = goals.map((g) => changed.update.find((u) => u.id === g.id) ?? g)
    expect(syncIctjGoals(forecast(), synced, NOW)).toEqual({ add: [], update: [] })
    const usd = syncIctjGoals(forecast({ currency: 'USD' }), [], NOW)
    expect(usd.add.map((g) => [g.target, g.ictj?.currency, g.ictj?.amount])).toEqual([
      [0, 'USD', zl(8000)],
      [0, 'USD', zl(6000)]
    ])
  })

  it('kolejność listy i nowe priorytety 1…n', () => {
    const a = goal('A', 1, 3)
    const b = goal('B', 1, 1)
    const c = goal('C', 1, 3)
    expect(byPriority([a, b, c]).map((g) => g.name)).toEqual(['B', 'A', 'C'])
    expect(renumber([c, a, b], NOW).map((g) => [g.name, g.priority])).toEqual([
      ['C', 1],
      ['A', 2],
      ['B', 3]
    ])
  })

  it('ETA: średnia wpłat do celów z pełnych miesięcy, cele po kolei', () => {
    const log: FleetEvent[] = [
      { date: '2026-08-10', kind: 'income' as const, amount: 0, moves: { goals: { a: zl(600) } } },
      { date: '2026-09-10', kind: 'income' as const, amount: 0, moves: { goals: { a: zl(1200), b: -zl(500) } } },
      { date: '2026-10-02', kind: 'income' as const, amount: 0, moves: { goals: { a: zl(5000) } } }
    ]
    // Full months since the start on 15 July: August and September → (600 + 1 200) / 2.
    expect(goalInflow(log, '2026-07-15', '2026-10')).toBe(zl(900))
    expect(goalInflow(log, '2026-10-01', '2026-10')).toBeNull()
    const etas = goalEtas(
      [
        { id: 'a', amount: zl(100), target: zl(1000) },
        { id: 'b', amount: zl(500), target: zl(500) },
        { id: 'c', amount: 0, target: zl(1700) }
      ],
      zl(900),
      '2026-10'
    )
    expect(etas).toEqual({ a: '2026-11', b: '2026-10', c: '2027-01' })
    expect(goalEtas([{ id: 'a', amount: 0, target: zl(1) }], null, '2026-10')).toEqual({ a: null })
  })
})
