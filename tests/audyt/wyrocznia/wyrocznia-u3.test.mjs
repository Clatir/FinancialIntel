// Testy wyroczni u3 (AP-32, 04.11.2026): poprawki z przeglądu jej kodu (W1, S1–S4, N1, PR sp. 9) i reguły grupy N2
// (T340, T341, T345, T346, T350, T352, T355) – na przykładach z decyzji.
//   node --test tests/audyt/wyrocznia/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runFleet } from './lib/silnik.mjs'
import { cargoMassAt, rateDay } from './lib/gra.mjs'
import { monthsAhead } from './lib/raport.mjs'
import { fromWarsaw } from './lib/daty.mjs'
import { normalizeInput } from './lib/dane.mjs'

const MB = '01KDEFACC00000000000000001'
const XTB = '01KDEFACC00000000000000002'
const JEDZ = '01KDEFCAT00000000000000100'
const AUTO = '01KDEFCAT00000000000000300'
const T0 = '2026-01-01T00:00:00.000Z'
let n = 0
const id = (p = 'T') => `01UTRZ${p}${String(++n).padStart(26 - 6 - p.length, '0')}`

const settings = (over = {}) => ({
  accounts: [
    { id: MB, name: 'mBank', kind: 'bank', importFormat: 'mbank', archived: false },
    { id: XTB, name: 'Portfel XTB', kind: 'wallet', importFormat: null, archived: false }
  ],
  categories: [
    { id: JEDZ, name: 'Jedzenie', parentId: null, envelope: 'daily' },
    { id: AUTO, name: 'Auto', parentId: null, envelope: 'planned' }
  ],
  layers: { shieldSalaries: 3, hullMonths: 6, assumedCosts: null },
  household: { members: [], since: null },
  game: { start: null },
  ...over
})
const tx = (o) => ({ id: id(), createdAt: T0, updatedAt: T0, accountId: MB, kind: 'expense', ...o })
const plan = (month, salary, envelopes = {}) => ({ id: id('M'), createdAt: T0, updatedAt: T0, month, salary, envelopes })
const opening = (date, accountId, amount) => ({ id: id('B'), createdAt: T0, updatedAt: T0, date, accountId, kind: 'opening', amount })
// rekordy przez kopię schematów (wartości domyślne jak po odczycie folderu)
const input = (o) => normalizeInput({ transactions: [], containers: [], goals: [], months: [], dockings: [], loans: [], balances: [], scheduled: [], imports: [], ...o, settings: settings(o.settings) })
const goal = (gid, name, target, priority, over = {}) => ({ id: gid, name, target, priority, createdAt: T0, updatedAt: T0, ...over })

test('u3 W1 / C24 (T128, T176): podział dokowania do celu zarchiwizowanego później zostaje w celu', () => {
  const G = id('G')
  const t1 = tx({ date: '2026-04-10', kind: 'trading', amount: 100000, createdAt: '2026-04-10T10:00:00.000Z' })
  const inp = input({
    settings: { budget: { start: '2026-04-01', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-04-01', MB, 2000000)],
    months: [plan('2026-04', 400000)],
    goals: [goal(G, 'Wakacje', 500000, 1, { archived: true, archivedAt: '2026-04-20T10:00:00.000Z', past: [{ until: '2026-04-20T10:00:00.000Z', priority: 1, target: 500000, archived: false }] })],
    dockings: [{ id: id('D'), createdAt: '2026-04-10T11:00:00.000Z', updatedAt: T0, date: '2026-04-10', transactionId: t1.id, ictjEntryId: 'E1', pool: 'tax', split: { shields: 0, hull: 0, goals: { [G]: 25000 }, taxHold: 0 } }],
    transactions: [t1]
  })
  const r = runFleet(inp, { today: '2026-04-30' })
  assert.equal(r.state.G.get(G), 25000)
  assert.equal(r.layersSum, r.accountsTotal)
})

test('u3 S2 / T161: osłony poniżej minimum oddają to, co tego dnia pożyczyły domownikom', () => {
  const snap = { date: '2026-11-02', S: 85000, minShields: 100000, decisionsSH: -1000, householdLent: 20000, energyToday: 0, dailySpent: 0, allowance: 0, plannedDay: {}, plannedCum: {}, firewall: [], night: [], judas: [], turtle: [] }
  const r = { planFor: () => null, months: new Map(), limitsAt: () => ({ lim: {} }) }
  const minimum = (s) => rateDay(r, s, { game: {} }, {}).violations.filter((v) => v.order === 'osłony').length
  assert.equal(minimum(snap), 0)
  assert.equal(minimum({ ...snap, householdLent: 0 }), 1)
})

test('u3 S3 / T161, T187: paragon z dwóch własnych linii w ciszy nocnej i impulsem – jeden zakup nocny, jeden impuls', () => {
  const t = tx({ date: '2026-04-05', time: '23:30', amount: -6000, impulse: 'impulse', logNote: 'nocny', splits: [{ id: id('S'), amount: -3000, categoryId: JEDZ }, { id: id('S'), amount: -3000, categoryId: AUTO }] })
  const inp = input({ settings: { budget: { start: '2026-04-01', initial: { shields: 0, hull: 0, goals: {} } } }, balances: [opening('2026-04-01', MB, 2000000)], months: [plan('2026-04', 400000, { [JEDZ]: 300000, [AUTO]: 50000 })], transactions: [t] })
  const d = runFleet(inp, { today: '2026-04-05' }).days.get('2026-04-05')
  assert.deepEqual([d.night.length, d.night[0].amount, d.judas.length, d.timed.length], [1, 6000, 1, 1])
})

test('u3 S4 / T159: operacja domownika sprzed rozliczeń spoza openingIds liczy się zaraz po saldach na start', () => {
  const A = id('A')
  const buy = tx({ date: '2026-09-20', amount: -15000, categoryId: JEDZ, refundable: true, memberId: A })
  const mk = (openingIds) =>
    input({
      settings: { budget: { start: '2026-09-01', initial: { shields: 0, hull: 0, goals: {} } }, household: { since: '2026-10-01', openingIds, members: [{ id: A, name: 'Ania', opening: { owed: 0, deposit: 0 } }] } },
      balances: [opening('2026-09-01', MB, 2000000)],
      months: [plan('2026-09', 400000), plan('2026-10', 400000)],
      transactions: [buy]
    })
  const late = runFleet(mk([]), { today: '2026-10-05' })
  assert.equal(late.household.owedNet(late.household.get(A)), 15000)
  assert.equal(late.layersSum, late.accountsTotal)
  const covered = runFleet(mk([buy.id]), { today: '2026-10-05' })
  assert.equal(covered.household.owedNet(covered.household.get(A)), 0)
  const absent = runFleet(mk(undefined), { today: '2026-10-05' }) // brak listy = salda obejmują wszystkie
  assert.equal(absent.household.owedNet(absent.household.get(A)), 0)
})

test('u3 S1 / T227: kontener dodany 03.11 (from null) liczy się w masie od chwili dodania, nie od 1. dnia miesiąca', () => {
  const C = id('C')
  const c = { id: C, name: 'Rata', createdAt: '2026-11-03T13:00:00.000Z', amount: 300000, cycleMonths: 1, dueMonth: '2026-11', dueDay: 5, accountId: MB, from: null, until: null, archived: false, past: [], schedule: [] }
  const r = { containers: new Map([[C, c]]), budgetStart: '2025-09-01' }
  assert.equal(cargoMassAt(r, '2026-11', fromWarsaw('2026-11-02', '23:59')), 0)
  assert.equal(cargoMassAt(r, '2026-11', fromWarsaw('2026-11-03', '23:59')), 300000)
})

test('u3 T340 (AP-3, MG.8): przeniesienie środków celu w swojej chwili – dostawa przyjęta później widzi cel po nim', () => {
  const R = id('G')
  const L = id('G')
  const t1 = tx({ date: '2026-04-10', kind: 'income', amount: 300000, createdAt: '2026-04-10T12:00:00.000Z' })
  const inp = input({
    settings: { layers: { shieldSalaries: 3, hullMonths: 6, assumedCosts: 100000 }, budget: { start: '2026-04-01', initial: { shields: 1200000, hull: 600000, goals: { [R]: 200000 } } } },
    balances: [opening('2026-04-01', MB, 1200000 + 600000 + 200000 + 400000)],
    months: [plan('2026-04', 400000)],
    goals: [goal(R, 'Rower', 250000, 1, { transfers: [{ at: '2026-04-10T09:00:00.000Z', to: L, amount: 200000 }] }), goal(L, 'Laptop', 100000, 2)],
    transactions: [t1]
  })
  const r = runFleet(inp, { today: '2026-04-10' })
  // przeniesienie 09:00 przed dostawą z 12:00: Rower 200 000 → Laptop; dostawa dopełnia Rower do jego kwoty (D13)
  assert.equal(r.state.G.get(L), 200000)
  assert.equal(r.state.G.get(R), 250000)
  assert.equal(r.layersSum, r.accountsTotal)
  // ta sama dostawa przyjęta przed przeniesieniem: Rower pełny 250 000 → przenosi 200 000, zostaje 50 000
  const early = runFleet(input({ ...inp, transactions: [{ ...t1, createdAt: '2026-04-10T08:00:00.000Z' }] }), { today: '2026-04-10' })
  assert.equal(early.state.G.get(R), 50000)
})

test('u3 T341 (AP-12): para do zadokowania z puli Cele – od razu do celów; zwrot z puli Podatek – z rezerwy, bez firewalla', () => {
  const G = id('G')
  const inflow = tx({ date: '2026-04-10', kind: 'trading', amount: 100000, accountId: XTB })
  const back = tx({ date: '2026-04-12', kind: 'trading', amount: -30000 })
  const inp = input({
    settings: { budget: { start: '2026-04-01', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-04-01', MB, 2000000), opening('2026-04-01', XTB, 0)],
    months: [plan('2026-04', 400000)],
    goals: [goal(G, 'Cel', 500000, 1)],
    transactions: [inflow, back]
  })
  const pendingPairs = new Map([
    [inflow.id, { pool: 'goals', entryDate: '2026-04-09' }],
    [back.id, { pool: 'tax', entryDate: '2026-04-12' }]
  ])
  const r = runFleet(inp, { today: '2026-04-12', pendingPairs })
  assert.equal(r.state.G.get(G), 100000)
  assert.equal(r.days.get('2026-04-12').firewall.length, 0)
  assert.deepEqual([r.toDock.count, r.toDock.inflow, r.toDock.outflow, r.toDock.inGoals], [2, 100000, 30000, 100000])
  assert.equal(r.layersSum, r.accountsTotal)
})

test('u3 T345 (AP-5, KR.16): płatność opłaty okresowej sprzed startu zamyka cykl – miesiąc startu bez raty', () => {
  const C = id('C')
  const inp = input({
    settings: { budget: { start: '2026-11-03', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-11-03', MB, 2000000)],
    months: [plan('2026-11', 400000)],
    containers: [{ id: C, name: 'PZU', createdAt: T0, updatedAt: T0, amount: 120000, cycleMonths: 12, dueMonth: '2026-11', dueDay: 2, accountId: MB, from: '2026-11' }],
    transactions: [tx({ date: '2026-11-02', amount: -120000, containerId: C })]
  })
  const r = runFleet(inp, { today: '2026-11-03' })
  assert.equal(r.months.get('2026-11').tanks[C], 0)
  assert.ok(r.paidCycles.get(C).has('2026-11'))
})

test('u3 T346 (AP-11, C20): plan następnego miesiąca bez pensji – nic pobrane, wymagana rata obok', () => {
  const C = id('C')
  const inp = input({
    settings: { budget: { start: '2026-10-01', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-10-01', MB, 2000000)],
    months: [plan('2026-10', 400000), plan('2026-12', 0)],
    containers: [{ id: C, name: 'OC', createdAt: T0, updatedAt: T0, amount: 120000, cycleMonths: 12, dueMonth: '2027-09', dueDay: 2, accountId: MB, from: '2026-10' }]
  })
  const r = runFleet(inp, { today: '2026-11-03' })
  const a = monthsAhead(r, '2026-11-03', Date.parse('2026-11-03T12:00:00Z'), 2)
  assert.equal(a[0].miesiac, '2026-12')
  assert.equal(a[0].odkladki[0].pobrane.gr, 0)
  assert.ok(a[0].odkladki[0].wymagana.gr > 0)
  assert.ok(a[1].odkladki[0].wymagana.gr > a[0].odkladki[0].wymagana.gr) // następny miesiąc nadrabia (T29)
})

test('u3 T350 / T352 (AP-4, D99 pkt 1): jawna zaliczka wskazująca zakup osoby spłaca tylko go; bez wskazania omija dług', () => {
  const M = id('M')
  const buy1 = tx({ date: '2026-09-10', amount: -6000, categoryId: JEDZ, refundable: true, memberId: M })
  const buy2 = tx({ date: '2026-09-20', amount: -30000, categoryId: JEDZ, refundable: true, memberId: M })
  const pay = tx({ date: '2026-09-25', kind: 'income', amount: 36000, memberId: M, inflowKind: 'advance', advance: true, covers: [buy1.id] })
  const free = tx({ date: '2026-09-26', kind: 'income', amount: 5000, memberId: M, inflowKind: 'advance', advance: true })
  const inp = input({
    settings: { budget: { start: '2026-09-01', initial: { shields: 0, hull: 0, goals: {} } }, household: { since: null, assignFrom: null, members: [{ id: M, name: 'Marek', inflow: 'advance' }] } },
    balances: [opening('2026-09-01', MB, 2000000)],
    months: [plan('2026-09', 400000)],
    transactions: [buy1, buy2, pay, free]
  })
  const r = runFleet(inp, { today: '2026-09-30' })
  const m = r.household.get(M)
  assert.equal(r.household.owedNet(m), 30000) // spłacony tylko wskazany zakup, nic nie czeka na przypisanie
  assert.equal(m.unassigned, 0)
  assert.equal(m.deposit, 30000 + 5000)
  assert.deepEqual(m.skipped, [free.id])
  assert.equal(r.layersSum, r.accountsTotal)
  // spec (A): każda wpłata najpierw spłaca; 1.15.3 (B): jawna zaliczka zawsze omija dług
  const rA = runFleet(inp, { today: '2026-09-30', household: 'A' })
  assert.equal(rA.household.owedNet(rA.household.get(M)), 0)
  const rB = runFleet(inp, { today: '2026-09-30', household: 'B' })
  assert.equal(rB.household.owedNet(rB.household.get(M)), 36000)
})

test('u3 T355 / T356 (D100): część wpływu spłacająca pożyczkę udzieloną – do osłon do długu, nadwyżka dokuje, płacący zapisany', () => {
  const LOAN = id('L')
  const pay = tx({ date: '2026-04-10', kind: 'income', amount: 50000, counterparty: 'EWA KOWALSKA', splits: [{ id: id('S'), amount: 30000, memberId: null, loanId: LOAN }] })
  const inp = input({
    settings: { budget: { start: '2026-04-01', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-04-01', MB, 2000000)],
    months: [plan('2026-04', 400000)],
    loans: [{ id: LOAN, name: 'Tomek', direction: 'given', counterparty: 'TOMEK', amount: 20000, date: '2026-03-01', accountId: MB, createdAt: T0, updatedAt: T0 }],
    transactions: [pay]
  })
  const r = runFleet(inp, { today: '2026-04-10' })
  const ls = r.loansState.get(LOAN)
  assert.deepEqual([ls.received, ls.extraIncome, ls.payments[0].payer], [20000, 10000, 'EWA KOWALSKA'])
  assert.equal(r.layersSum, r.accountsTotal)
})

test('u3 N1 / T31: przelew własny przy pustych osłonach schodzi z osłon poniżej zera – kadłub bez zmian', () => {
  const inp = input({
    settings: { budget: { start: '2026-04-01', initial: { shields: 0, hull: 500000, goals: {} } } },
    balances: [opening('2026-04-01', MB, 500000)],
    months: [plan('2026-04', 0)],
    transactions: [tx({ date: '2026-04-05', kind: 'transfer', amount: -50000, counterAccountId: null })]
  })
  const r = runFleet(inp, { today: '2026-04-05' })
  assert.deepEqual([r.state.H, r.state.S], [500000, -50000])
})

test('u3 PR sp. 9 / T28, T32 (D99 pkt 9): wydatek ponad energię – najpierw osłony, kadłub dopiero po nich', () => {
  const inp = input({
    settings: { budget: { start: '2026-04-01', initial: { shields: 0, hull: 1000000, goals: {} } } },
    balances: [opening('2026-04-01', MB, 1000000 + 800000)],
    months: [plan('2026-04', 400000)],
    transactions: [tx({ date: '2026-04-05', amount: -600000, categoryId: JEDZ })]
  })
  const r = runFleet(inp, { today: '2026-04-05' })
  // osłony 800 000 − pensja 400 000 = 400 000; wydatek 600 000 = energia 400 000 + osłony 200 000; kadłub nietknięty
  assert.deepEqual([r.state.E, r.state.S, r.state.H], [0, 200000, 1000000])
})
