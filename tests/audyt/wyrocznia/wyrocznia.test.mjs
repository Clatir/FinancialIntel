// Testy wyroczni AU-9 na przykładach liczbowych ze specyfikacji i planu (docs/specyfikacja.md, docs/plan.md „E1”).
//   node --test tests/audyt/wyrocznia/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { runFleet, planInstallment, tankInstallment, goalInstallment, costOf, categoryIndex } from './lib/silnik.mjs'
import { rangeOf, shipClass } from './lib/gra.mjs'
import { addWorkingDays, isPolishHoliday, isWorkingDay, isoWeek, fromWarsaw, toWarsaw } from './lib/daty.mjs'
import { splitEvenly, trunc1, round1, zl } from './lib/kwoty.mjs'
import { loadFolder } from './lib/dane.mjs'

const MB = '01KDEFACC00000000000000001'
const XTB = '01KDEFACC00000000000000002'
const JEDZ = '01KDEFCAT00000000000000100'
const AUTO = '01KDEFCAT00000000000000300'
const T0 = '2026-01-01T00:00:00.000Z'
let n = 0
const id = (p = 'T') => `01TEST${p}${String(++n).padStart(26 - 6 - p.length, '0')}`

function settings(over = {}) {
  return {
    accounts: [
      { id: MB, name: 'mBank', kind: 'bank', importFormat: 'mbank', archived: false },
      { id: XTB, name: 'Portfel XTB', kind: 'wallet', importFormat: null, archived: false }
    ],
    categories: [
      { id: JEDZ, name: 'Jedzenie', parentId: null, envelope: 'daily' },
      { id: AUTO, name: 'Auto', parentId: null, envelope: 'planned' }
    ],
    layers: { shieldSalaries: 3, hullMonths: 6, assumedCosts: null },
    orders: { minShieldSalaries: 1, cargoLimitPct: 40, quietHours: { from: '23:00', to: '05:00' }, impulseThreshold: 20000, firewall: true },
    household: { members: [], since: null },
    game: { start: null },
    ...over
  }
}
const tx = (o) => ({ id: id(), createdAt: T0, updatedAt: T0, time: null, accountId: MB, kind: 'expense', categoryId: null, refundable: false, memberId: null, advance: false, covers: [], splits: [], counterparty: '', title: '', note: '', impulse: null, logNote: '', repaid: 0, counterAccountId: null, containerId: null, goalId: null, loanId: null, bank: null, ...o })
const plan = (month, salary, envelopes = {}) => ({ id: id('M'), createdAt: T0, updatedAt: T0, month, salary, envelopes, loot: null, envelopeCovers: [] })
const opening = (date, accountId, amount) => ({ id: id('B'), createdAt: T0, updatedAt: T0, date, accountId, kind: 'opening', amount })
const input = (o) => ({ settings: settings(o.settings), transactions: [], containers: [], goals: [], months: [], dockings: [], loans: [], balances: [], scheduled: [], imports: [], ...o, settings: settings(o.settings) })

test('T3 / spec: odkładka OC 1 240 zł rocznie = 11 × 103,33 zł + 103,37 zł', () => {
  const parts = splitEvenly(124000, 12)
  assert.deepEqual(parts.slice(0, 11), Array(11).fill(10333))
  assert.equal(parts[11], 10337)
  assert.equal(planInstallment(124000, 12, 12), 10337)
})

test('T29: opłata dodana późno – rata = plan + równa część braku zbiornika (OC od 09.2025, termin 11.2025)', () => {
  const c = { id: 'C', amount: 124000, cycleMonths: 12, dueMonth: '2025-11', schedule: [], past: [] }
  const a = tankInstallment(c, '2025-09', 0)
  assert.equal(a.installment, 10333 + 30999)
  const b = tankInstallment(c, '2025-10', a.installment)
  const d = tankInstallment(c, '2025-11', a.installment + b.installment)
  assert.equal(a.installment + b.installment + d.installment, 124000)
  assert.equal(d.installment, 10337 + 30999)
})

test('spec „Dokowanie” (plan E1): osłony 8 640 / 12 000, kadłub 15 000 / 21 900, dostawa 5 000 → +3 360 / +1 640, cele 0', () => {
  // pensja 4 000 zł (cel osłon 12 000), koszty przyjęte 3 650 zł (cel kadłuba 21 900); start 1.03, pensja z osłon
  const inp = input({
    settings: { layers: { shieldSalaries: 3, hullMonths: 6, assumedCosts: 365000 }, budget: { start: '2026-03-01', initial: { shields: 0, hull: 1500000, goals: {} } } },
    balances: [opening('2026-03-01', MB, 864000 + 1500000 + 400000)],
    months: [plan('2026-03', 400000, {})],
    transactions: [tx({ date: '2026-03-10', kind: 'income', amount: 500000, counterparty: 'XTB' })]
  })
  const before = runFleet(inp, { today: '2026-03-09' })
  assert.equal(before.state.S, 864000)
  assert.equal(before.state.H, 1500000)
  const r = runFleet(inp, { today: '2026-03-10' })
  const d = r.deliveries[0]
  assert.equal(d.toShields, 336000)
  assert.equal(d.toHull, 164000)
  assert.deepEqual(d.toGoals, {})
  assert.equal(r.state.S, 1200000)
  assert.equal(r.state.H, 1664000)
  // zasięg 6,5 → 7,8 (spec) – przed dostawą 6,476…: zaokrąglenie 6,5, obcięcie (T218) 6,4
  const z0 = rangeOf(864000, 1500000, 0, 365000)
  const z1 = rangeOf(1200000, 1664000, 0, 365000)
  assert.equal(round1(z0), 6.5)
  assert.equal(trunc1(z0), 6.4)
  assert.equal(round1(z1), 7.8)
  assert.equal(trunc1(z1), 7.8)
})

test('plan E1: pensja 4 000 zł przy osłonach 2 500 zł → 2 500 z osłon + 1 500 z kadłuba, żółty alarm', () => {
  const inp = input({
    settings: { budget: { start: '2026-03-01', initial: { shields: 0, hull: 1000000, goals: {} } } },
    balances: [opening('2026-03-01', MB, 1250000)],
    months: [plan('2026-03', 400000)]
  })
  const r = runFleet(inp, { today: '2026-03-01' })
  const m = r.months.get('2026-03')
  assert.equal(m.salaryFromShields, 250000)
  assert.equal(m.salaryFromHull, 150000)
  assert.equal(m.salaryPartial, false)
  assert.ok(m.alarms.some((a) => a.includes('żółty')))
  assert.equal(r.state.E, 400000)
})

test('plan E1 / T30: dzienny przydział – niewydana energia przechodzi, przekroczenie zmniejsza kolejne dni', () => {
  const inp = input({
    settings: { budget: { start: '2026-04-01', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-04-01', MB, 2000000)],
    months: [plan('2026-04', 400000, { [JEDZ]: 300000 })],
    transactions: [tx({ date: '2026-04-02', amount: -20000, categoryId: JEDZ })]
  })
  const r = runFleet(inp, { today: '2026-04-03' })
  assert.equal(r.days.get('2026-04-01').allowance, 10000) // 3 000 zł / 30 dni
  assert.equal(r.days.get('2026-04-02').allowance, 10344) // nic nie wydane 1.04 → 3 000 / 29, w dół do grosza
  assert.equal(r.days.get('2026-04-02').energyToday, 10344 - 20000) // przekroczenie
  assert.equal(r.days.get('2026-04-03').allowance, 10000) // (3 000 − 200) / 28
})

test('plan E1 / D80: zakup „do zwrotu” nie zmienia energii; zwrot zamyka należność, nadwyżka dokuje jako przychód', () => {
  const MEM = '01KDEFMEM00000000000000001'
  const buy = tx({ date: '2026-04-05', amount: -10000, categoryId: JEDZ, refundable: true, memberId: MEM })
  const inp = input({
    settings: { budget: { start: '2026-04-01', initial: { shields: 0, hull: 0, goals: {} } }, household: { members: [{ id: MEM, name: 'Dom', inflow: 'income' }], since: null } },
    balances: [opening('2026-04-01', MB, 2000000)],
    months: [plan('2026-04', 400000, { [JEDZ]: 300000 })],
    transactions: [buy, tx({ date: '2026-04-10', kind: 'income', amount: 15000, memberId: MEM, advance: false })]
  })
  const r = runFleet(inp, { today: '2026-04-10' })
  assert.equal(r.days.get('2026-04-05').E, 400000) // energia bez zmian
  assert.equal(r.days.get('2026-04-05').dailySpent, 0)
  const m = r.household.get(MEM)
  assert.equal(r.household.owedNet(m), 0)
  assert.equal(m.repaidTotal, 10000)
  assert.equal(r.deliveries.find((d) => d.source === 'przychód od domownika').amount, 5000)
  assert.equal(r.layersSum, r.accountsTotal)
})

test('plan E1 / D55: wypłata z puli Cele → cele; z puli Podatek → poza kosztami (rezerwa)', () => {
  const G = '01TESTGOAL0000000000000001'
  const t1 = tx({ date: '2026-04-10', kind: 'trading', amount: 200000, accountId: XTB })
  const t2 = tx({ date: '2026-04-11', kind: 'trading', amount: 100000 })
  const inp = input({
    settings: { budget: { start: '2026-04-01', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-04-01', MB, 2000000), opening('2026-04-01', XTB, 0)],
    months: [plan('2026-04', 400000)],
    goals: [{ id: G, name: 'Cel', target: 500000, priority: 1, source: 'own', archived: false, activeFrom: null, past: [], transfers: [], rates: [] }],
    dockings: [
      { id: id('D'), createdAt: T0, updatedAt: T0, date: '2026-04-10', transactionId: t1.id, ictjEntryId: 'E1', pool: 'goals', split: null },
      { id: id('D'), createdAt: T0, updatedAt: T0, date: '2026-04-11', transactionId: t2.id, ictjEntryId: 'E2', pool: 'tax', split: null }
    ],
    transactions: [t1, t2]
  })
  const r = runFleet(inp, { today: '2026-04-11' })
  assert.equal(r.state.G.get(G), 200000)
  assert.equal(r.state.X, 100000)
  assert.equal(costOf(t2, r.ctx), 0)
  assert.equal(r.layersSum, r.accountsTotal)
})

test('T10 / T218: klasy okrętu – próg należy do wyższej klasy, napis obcięty do 0,1', () => {
  assert.equal(shipClass(0.99), 'Zwiadowca')
  assert.equal(shipClass(1), 'Korweta')
  assert.equal(shipClass(5.99), 'Fregata')
  assert.equal(shipClass(6), 'Niszczyciel')
  assert.equal(shipClass(12), 'Flagowiec')
  assert.equal(trunc1(5.99), 5.9)
})

test('T272: rata celu do terminu – brak po równo, w dół, reszta w miesiącu terminu', () => {
  assert.equal(goalInstallment(600000, '2026-09', '2027-05'), 66666)
  assert.equal(goalInstallment(12345, '2027-05', '2027-05'), 12345)
  assert.equal(goalInstallment(100, '2027-06', '2027-05'), 0)
})

test('T164: polskie święta i dni robocze (okno pary ICTTJ)', () => {
  assert.ok(isPolishHoliday('2026-11-01'))
  assert.ok(isPolishHoliday('2026-04-06')) // poniedziałek wielkanocny 2026
  assert.ok(isPolishHoliday('2026-06-04')) // Boże Ciało 2026
  assert.ok(isPolishHoliday('2025-12-24')) // od 2025
  assert.ok(!isWorkingDay('2026-10-31'))
  assert.equal(addWorkingDays('2026-10-31', 3), '2026-11-04')
  assert.equal(addWorkingDays('2026-10-25', 3), '2026-10-28')
  assert.equal(addWorkingDays('2026-12-23', 1), '2026-12-28')
})

test('daty: Warszawa (DST) i tydzień ISO', () => {
  assert.deepEqual(toWarsaw('2026-11-03T14:17:02.077Z').time, '15:17')
  assert.equal(toWarsaw('2026-07-01T22:30:00Z').date, '2026-07-02')
  assert.equal(new Date(fromWarsaw('2026-11-03', '12:00')).toISOString(), '2026-11-03T11:00:00.000Z')
  assert.equal(isoWeek('2026-11-03'), '2026-W45')
  assert.equal(zl(-123456), '-1 234,56 zł')
})

test('persona „rok” (jeśli jest): suma warstw = salda kont każdego dnia, saldo mBanku 26.10.2026 = 69 796,78 zł', { skip: !fs.existsSync('C:/FI-audyt/wyrocznia/wejscie/rok/fi.json') }, () => {
  const inp = loadFolder('C:/FI-audyt/wyrocznia/wejscie/rok')
  const r = runFleet(inp, { today: '2026-11-03' })
  for (const [d, s] of r.days) assert.equal(Object.values(s.balances).reduce((a, b) => a + b, 0), s.sum, d)
  assert.equal(r.days.get('2026-10-26').balances[MB], 6979678)
})

// ------------------------------------------------------------------ u1: poprawki po uzgodnieniu bloków A–B

test('u1 R-1 / T115, T116: saldo na start rozliczeń – depozyt z osłon, należność jako otwarta pozycja', () => {
  const A = '01TESTMEMA0000000000000001'
  const L = '01TESTMEML0000000000000001'
  const inp = input({
    settings: {
      budget: { start: '2026-11-03', initial: { shields: 0, hull: 0, goals: {} } },
      household: { since: '2026-11-03', members: [{ id: A, name: 'Ania', opening: { owed: 24000, deposit: 0 } }, { id: L, name: 'Łukasz', opening: { owed: 0, deposit: 30000 } }] }
    },
    balances: [opening('2026-11-03', MB, 1000000)],
    months: [plan('2026-11', 400000)]
  })
  const r = runFleet(inp, { today: '2026-11-03' })
  assert.equal(r.household.owedNet(r.household.get(A)), 24000)
  assert.equal(r.household.get(L).deposit, 30000)
  assert.equal(r.state.S, 1000000 - 400000 - 30000)
  assert.equal(r.layersSum, r.accountsTotal)
})

test('u1 R-2 / R-3 / T45: miesiąc startu – przydział i koperty planowe liczą wydatki od 1. dnia miesiąca', () => {
  const inp = input({
    settings: { budget: { start: '2026-11-03', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-11-03', MB, 1000000)],
    months: [plan('2026-11', 400000, { [JEDZ]: 157000, [AUTO]: 52000 })],
    transactions: [tx({ date: '2026-11-01', amount: -8540, categoryId: JEDZ }), tx({ date: '2026-11-02', amount: -21000, categoryId: AUTO })]
  })
  const r = runFleet(inp, { today: '2026-11-03' })
  assert.equal(r.days.get('2026-11-03').allowance, Math.floor((157000 - 8540) / 28))
  assert.equal(r.months.get('2026-11').plannedSpent[AUTO], 21000)
  assert.equal(r.months.get('2026-11').salaryPaid, 400000 - 8540 - 21000)
})

test('u1 R-12: konto budżetu bez salda otwarcia = suma operacji (przelew własny między kontami nie zmienia osłon)', () => {
  const SAV = '01TESTACCSAV0000000000001'
  const inp = input({
    settings: {
      accounts: [
        { id: MB, name: 'mBank', kind: 'bank', archived: false },
        { id: SAV, name: 'Oszczędności', kind: 'bank', archived: false }
      ],
      budget: { start: '2026-04-01', initial: { shields: 0, hull: 0, goals: {} } }
    },
    balances: [opening('2026-04-01', MB, 2000000)],
    months: [plan('2026-04', 400000)],
    transactions: [tx({ date: '2026-04-05', kind: 'transfer', amount: -100000, counterAccountId: SAV, bothSides: true })]
  })
  const r = runFleet(inp, { today: '2026-04-05' })
  assert.equal(r.balances.get(SAV), 100000)
  assert.equal(r.state.S, 1600000)
  assert.equal(r.layersSum, r.accountsTotal)
})

test('u1 R-14 / T163: dzień z parą ICTTJ czekającą na dokowanie nie zamarza (najwyżej 7 dni po zamrożeniu)', async () => {
  const { playGame } = await import('./lib/gra.mjs')
  const inp = input({
    settings: { budget: { start: '2026-10-01', initial: { shields: 0, hull: 0, goals: {} } }, game: { start: '2026-10-20' } },
    balances: [opening('2026-10-01', MB, 2000000)],
    months: [plan('2026-10', 400000), plan('2026-11', 400000)]
  })
  const r = runFleet(inp, { today: '2026-11-03' })
  assert.equal(playGame(r, inp.settings, '2026-11-03', {}).lastFrozen, '2026-11-01')
  assert.equal(playGame(r, inp.settings, '2026-11-03', { holdDays: ['2026-10-31'] }).lastFrozen, '2026-10-30')
  assert.equal(playGame(r, inp.settings, '2026-11-12', { holdDays: ['2026-10-31'] }).lastFrozen, '2026-11-10')
})

test('u1 R-5 / R-10: Radar – pensja z osłon, brak z kadłuba (T275); dzień płatności z historii (T208)', async () => {
  const { radarOf, payDayOf } = await import('./lib/radar.mjs')
  const C = '01TESTCONT0000000000000001'
  const pay = tx({ date: '2025-11-25', amount: -124000, containerId: C })
  const inp = input({
    settings: { budget: { start: '2025-11-01', initial: { shields: 0, hull: 500000, goals: {} } } },
    balances: [opening('2025-11-01', MB, 1124000 + 400000)],
    months: [plan('2025-11', 400000)],
    containers: [{ id: C, name: 'OC', createdAt: T0, amount: 124000, cycleMonths: 12, dueMonth: '2025-11', dueDay: 6, accountId: MB, from: '2025-11', until: null, archived: false, past: [], schedule: [] }],
    transactions: [pay]
  })
  const r = runFleet(inp, { today: '2025-11-30' })
  assert.equal(payDayOf(r, r.containers.get(C), '2026-11'), '2026-11-25')
  const rad = radarOf(r, inp, '2025-11-30', r.state)
  const p = rad.zdarzenia.filter((e) => e.rodzaj === 'pensja')
  assert.ok(p.every((e) => e.oslonyPo.gr >= 0))
  assert.equal(p[0].oslonyPo.gr, Math.max(0, r.state.S - 400000))
})

// ------------------------------------------------------------------ u2: poprawki po uzgodnieniu bloku C

test('u2 C1 / T224, T176: dokowanie z podziałem przy puli Podatek – podatkiem tylko część z podziału', () => {
  const G = '01TESTGOAL0000000000000002'
  const t1 = tx({ date: '2026-04-10', kind: 'trading', amount: 100000 })
  const inp = input({
    settings: { budget: { start: '2026-04-01', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-04-01', MB, 2000000)],
    months: [plan('2026-04', 400000)],
    goals: [{ id: G, name: 'Cel', target: 500000, priority: 1, source: 'own', archived: false, activeFrom: null, past: [], transfers: [], rates: [] }],
    dockings: [{ id: id('D'), createdAt: T0, updatedAt: T0, date: '2026-04-10', transactionId: t1.id, ictjEntryId: 'E9', pool: 'tax', split: { shields: 5000, hull: 10000, goals: { [G]: 25000 }, taxHold: 60000 } }],
    transactions: [t1]
  })
  const before = runFleet(inp, { today: '2026-04-09' })
  const r = runFleet(inp, { today: '2026-04-10' })
  assert.equal(r.state.X, 60000)
  assert.equal(r.state.H - before.state.H, 10000)
  assert.equal(r.state.G.get(G), 25000)
  assert.equal(r.state.S - before.state.S, 5000)
})

test('u2 C2 / T135: opłata co 3 mies. zapłacona miesiąc przed terminem (poprzedni cykl zamknięty) – w miesiącu terminu bez raty', () => {
  const C = '01TESTCONTW000000000000001'
  const inp = input({
    settings: { budget: { start: '2026-08-01', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-08-01', MB, 2000000)],
    months: [plan('2026-08', 400000)],
    containers: [{ id: C, name: 'Wywóz', createdAt: T0, amount: 24000, cycleMonths: 3, dueMonth: '2026-08', dueDay: 20, accountId: MB, from: '2026-08', until: null, archived: false, past: [], schedule: [] }],
    transactions: [tx({ date: '2026-08-20', amount: -24000, containerId: C }), tx({ date: '2026-10-22', amount: -24000, containerId: C })]
  })
  const r = runFleet(inp, { today: '2026-11-03' })
  assert.equal(r.months.get('2026-11').tanks[C], 0)
  assert.ok(r.paidCycles.get(C).has('2026-11'))
})

test('u2 C7 / T27: mniej niż 3 pełne miesiące bez kosztów przyjętych – średnia z dostępnych pełnych miesięcy', () => {
  const inp = input({
    settings: { budget: { start: '2026-09-01', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-09-01', MB, 2000000)],
    months: [plan('2026-09', 400000)],
    transactions: [tx({ date: '2026-09-01', amount: -400000, categoryId: JEDZ, bank: { key: 'k1' } })]
  })
  const r = runFleet(inp, { today: '2026-10-03' })
  assert.equal(r.hist.avgCosts('2026-10').value, 400000)
  assert.equal(r.hullTarget('2026-10'), 2400000)
})

test('u2 C11 / T117: części wpłaty ponad kwotę ucinane', async () => {
  const { partsOf } = await import('./lib/silnik.mjs')
  const p = partsOf({ kind: 'income', amount: 5000, memberId: 'A', splits: [{ amount: 8000, memberId: 'B' }] })
  assert.deepEqual(p.map((x) => x.amount), [5000])
})

test('u2 C12 / T226: cel ICTTJ bez kwoty w swoim miesiącu bierze całą resztę puli Cele', () => {
  const L = '01TESTGOALL000000000000001'
  const R = '01TESTGOALR000000000000001'
  const W = '01TESTGOALW000000000000001'
  const t1 = tx({ date: '2026-11-02', kind: 'trading', amount: 600000 })
  const inp = input({
    settings: { budget: { start: '2026-10-01', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-10-01', MB, 2000000)],
    months: [plan('2026-10', 400000)],
    goals: [
      { id: L, name: 'Laptop', target: 500000, priority: 1, source: 'ictj', ictj: { currency: 'PLN', amount: 500000 }, archived: false, activeFrom: null, past: [], transfers: [], rates: [] },
      { id: R, name: 'Rezerwa', target: 0, priority: 2, source: 'ictj', ictj: { currency: 'PLN', amount: null }, deadline: '2026-11', archived: false, activeFrom: null, past: [], transfers: [], rates: [] },
      { id: W, name: 'Wakacje', target: 800000, priority: 3, source: 'own', archived: false, activeFrom: null, past: [], transfers: [], rates: [] }
    ],
    dockings: [{ id: id('D'), createdAt: T0, updatedAt: T0, date: '2026-11-02', transactionId: t1.id, ictjEntryId: 'E7', entryDate: '2026-11-01', pool: 'goals', split: null }],
    transactions: [t1]
  })
  const r = runFleet(inp, { today: '2026-11-03' })
  assert.equal(r.state.G.get(L), 500000)
  assert.equal(r.state.G.get(R), 100000)
  assert.equal(r.state.G.get(W), 0)
})

test('u2 C23 / D94: wcześniejsza wpłata na wskazany późniejszy zakup – rezerwacja chroniona przed zakupem pośrednim', () => {
  const T = '01TESTMEMT0000000000000001'
  const later = tx({ date: '2026-11-03', amount: -5000, categoryId: JEDZ, refundable: true, memberId: T })
  const mid = tx({ date: '2026-11-01', amount: -3000, categoryId: JEDZ, refundable: true, memberId: T })
  const pay = tx({ date: '2026-10-31', kind: 'income', amount: 5000, memberId: T, advance: false, covers: [later.id] })
  const inp = input({
    settings: { budget: { start: '2026-10-01', initial: { shields: 0, hull: 0, goals: {} } }, household: { members: [{ id: T, name: 'Tata', inflow: 'income' }], since: null } },
    balances: [opening('2026-10-01', MB, 2000000)],
    months: [plan('2026-10', 400000), plan('2026-11', 400000)],
    transactions: [pay, mid, later]
  })
  const r = runFleet(inp, { today: '2026-11-03' })
  const m = r.household.get(T)
  assert.equal(r.household.owedNet(m), 3000)
  assert.equal(m.purchases.find((p) => p.remaining > 0).date, '2026-11-01')
  assert.equal(m.deposit, 0)
  assert.equal(r.layersSum, r.accountsTotal)
})

test('u2 C6 / T279: pokrycie z koperty codziennej zmniejsza pulę dzienną od chwili pokrycia', () => {
  const ROZ = '01KDEFCAT00000000000000600'
  const p = plan('2026-11', 400000, { [JEDZ]: 240000, [AUTO]: 15000 })
  p.envelopeCovers = [{ id: id('V'), from: JEDZ, to: AUTO, amount: 1500, at: '2026-11-03T14:49:12.601Z' }]
  const inp = input({
    settings: { budget: { start: '2026-11-01', initial: { shields: 0, hull: 0, goals: {} } } },
    balances: [opening('2026-11-01', MB, 2000000)],
    months: [p]
  })
  const r = runFleet(inp, { today: '2026-11-03' })
  assert.equal(r.limitsAt('2026-11', Date.parse('2026-11-03T14:49:59Z')).pool, 238500)
  assert.equal(r.limitsAt('2026-11', Date.parse('2026-11-03T14:49:00Z')).pool, 240000)
  assert.equal(r.limitsAt('2026-11').lim[AUTO], 16500)
  void ROZ
})
