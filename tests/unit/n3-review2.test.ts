/**
 * N3 (1.15.7) – the group's second review (`/code-review` high of its fixes), the pure parts:
 * - 1: the start wizard counts a fee's cycles paid before the start as the engine does – a bill of a varying amount too
 *   (`startTankItems`: the container whole; T393);
 * - 2: a payment written ahead (dated after today) pays its due only on its day – the state as the engine (T398); the due
 *   shows it planned, the Radar, the balances ahead and the briefing count it once, on its day;
 * - 3: „Zapłacone (dziś)” is never counted for a fee whose dues shown are paid (the whole history again);
 * - 4: „Pozostałe boje” – what became of the one-offs long past once per list, the same as each one counted alone;
 * - 5: „Inwentaryzacja” – a confirmation written before 1.15.7 (no `confirmedAt`) counts on its balance's day, as then;
 * - 9: one order of a fee's payments of one day (`byPaymentDay`).
 */
import { describe, expect, it } from 'vitest'
import { accountsAhead } from '@shared/calc/ahead'
import { briefing } from '@shared/calc/briefing'
import { byPaymentDay, cargoDays, cargoStatuses, dueIn, feeDuesOf, paymentDay, paymentsIndex, type CargoStatus, type Linked } from '@shared/calc/cargoStatus'
import { addDays, monthOf } from '@shared/calc/dates'
import { amountIn, computeFleet, layersSum, paidBeforeStart, type FleetState } from '@shared/calc/fleet'
import { chooseMission, missionStatus, type GameInput } from '@shared/calc/game'
import { radar } from '@shared/calc/radar'
import { pastStateOf, pastStates, scheduledDays } from '@shared/calc/scheduled'
import { startPaidDays, startTankItems, startTanks } from '@shared/calc/start'
import { createDefaultSettings } from '@shared/defaults'
import {
  balanceSchema,
  CASH_ACCOUNT_ID,
  containerSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  scheduledSchema,
  SCHEMA_VERSION,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
  type Balance,
  type Container,
  type Scheduled,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2025-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N3W000000000000000${String(++seq).padStart(4, '0')}`
const base = (at = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: at, updatedAt: at })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2026-01', accountId: MBANK_ACCOUNT_ID, ...over })
const pay = (c: Container, date: string, amount = c.amount): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -amount, containerId: c.id, counterparty: c.name })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`

/** The ship from `start`: 30 000 zł on mBank, a salary of 5 000 zł every month. */
function fleetOf(start: string, containers: Container[], transactions: Transaction[], now: string): FleetState {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = { ...s0, budget: { ...s0.budget, start } }
  const state = computeFleet({
    settings,
    balances: [balanceSchema.parse({ ...base(), date: start, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(30000) })],
    months: [monthPlanSchema.parse({ ...base(), month: start.slice(0, 7), salary: zl(5000), envelopes: {} })],
    transactions,
    containers,
    now
  })
  expect(layersSum(state)).toBe(state.total)
  return state
}
const cargoOf = (containers: Container[], transactions: Transaction[], today: string, start: string | null) => cargoStatuses({ containers, transactions, today, coveredTo: {}, start })
const shown = (list: CargoStatus[]) => list.map((s) => [s.due, s.state, s.carried, s.planned?.date ?? null])

describe('1: kreator liczy cykle zapłacone przed startem jak silnik – także rachunek o zmiennej kwocie (T393)', () => {
  // Woda every 2 months on the 5th (July, September, …), a bill of a varying amount (F23): paid once in two transfers
  // (November), then each time a few days before its day, September and January late. The budget starts on 4 July 2026.
  const water = container({ name: 'Wodociągi', amount: zl(300), cycleMonths: 2, dueMonth: '2025-07', dueDay: 5, variable: true })
  const txs = [
    pay(water, '2025-07-05'),
    pay(water, '2025-11-05', zl(180)),
    pay(water, '2025-11-12', zl(120)),
    pay(water, '2026-02-25'),
    pay(water, '2026-03-03'),
    pay(water, '2026-05-03'),
    pay(water, '2026-07-03')
  ]
  const START = '2026-07-04'

  it('lipiec zapłacony 03.07: silnik, Ładownia i kreator – bez raty, bez „do planu”', () => {
    // The engine (F23: the second transfer of November pays September – the late ones each catch up a cycle): July paid.
    const f = fleetOf(START, [water], txs, `${START}T12:00:00+02:00`)
    expect(f.tanks[0]).toMatchObject({ paidDue: '2026-07', want: 0 })
    expect(shown(cargoOf([water], txs, START, START))).toEqual([['2026-07-05', 'paid', false, null]])
    // The wizard – the container as it is (before: without `variable` – September never closed, every later payment one
    // cycle behind: July unpaid, 300 zł to set aside and 150 zł „do planu”).
    const days = startPaidDays(txs, START, [water], [])
    const items = startTankItems([water], []).map((item) => ({ ...item, paid: days.get(item.key) ?? [] }))
    expect(items[0]).toMatchObject({ key: water.id, name: 'Wodociągi', variable: true })
    expect(startTanks(items, START, {})).toEqual([{ key: water.id, installment: 0, planAmount: 0, paid: true }])
    expect([...paidBeforeStart(items[0]!, items[0]!.paid, START)].sort()).toEqual(['2025-07', '2025-09', '2025-11', '2026-01', '2026-03', '2026-05', '2026-07'])
  })

  it('propozycja z kroku 4 – kontener, który start z niej zrobi (z oznaczeniem zmiennej kwoty)', () => {
    const proposal = { key: 'woda', label: 'WODOCIAGI', amount: zl(300), cycleMonths: 2, dueMonth: '2026-05', dueDay: 5, schedule: [], variable: true }
    expect(startTankItems([], [proposal, { ...proposal, key: 'tv', cycleMonths: 1 }])).toEqual([
      { key: 'woda', name: 'WODOCIAGI', amount: zl(300), cycleMonths: 2, dueMonth: '2026-05', dueDay: 5, schedule: [], variable: true, archived: false, from: null, until: null }
    ])
    // An archived container or a monthly one has no tank.
    expect(startTankItems([{ ...water, archived: true }, { ...water, cycleMonths: 1 }], [])).toEqual([])
  })
})

describe('2: płatność wpisana z wyprzedzeniem płaci termin dopiero w swoim dniu – stan jak silnik (T398)', () => {
  const START = '2026-09-01'
  // Wywóz 240 zł a quarter on the 20th (November, February, …): August paid; November's written ahead for 19.11.
  const waste = container({ name: 'Wywóz śmieci', amount: zl(240), cycleMonths: 3, dueMonth: '2026-11', dueDay: 20 })
  const ahead = pay(waste, '2026-11-19')
  const txs = [pay(waste, '2026-08-20'), ahead]

  it('kwartalna: dziś 12.11 – termin 20.11 czeka (zaplanowany 19.11), silnik bez paidDue; 19.11 – zapłacony w obu', () => {
    const f = fleetOf(START, [waste], txs, '2026-11-12T12:00:00+01:00')
    expect(f.tanks[0]).toMatchObject({ paidDue: null, dueMonth: '2026-11' })
    // Before: „zapłacone 19.11” in Ładownia, on the Radar and in the briefing while the engine still wanted the cycle.
    const now = cargoOf([waste], txs, '2026-11-12', START)
    expect(shown(now)).toEqual([['2026-11-20', 'waiting', false, '2026-11-19']])
    expect(now[0]).toMatchObject({ payments: [], paid: 0, planned: { id: ahead.id, date: '2026-11-19', amount: zl(240) } })
    const then = fleetOf(START, [waste], txs, '2026-11-19T12:00:00+01:00')
    expect(then.tanks[0]).toMatchObject({ paidDue: '2026-11', dueMonth: '2027-02' })
    expect(shown(cargoOf([waste], txs, '2026-11-19', START))).toEqual([['2026-11-20', 'paid', false, null]])
  })

  it('Radar i salda naprzód: termin zaplanowany nie jest pozycją – operacja liczy się raz, w swoim dniu; odprawa bez asteroidy', () => {
    const today = '2026-11-12'
    const f = fleetOf(START, [waste], txs, `${today}T12:00:00+01:00`)
    const cargo = cargoOf([waste], txs, today, START)
    const payDays = cargoDays({ containers: [waste], transactions: txs, today })
    const items = radar({ today, plans: [], containers: [waste], tanks: f.tanks, loans: [], money, cargo, payDays })
    expect(items.filter((i) => i.ref === waste.id && i.kind === 'asteroid')).toEqual([])
    const s0 = createDefaultSettings(AT).settings
    const mbank = accountsAhead({ today, balances: f.accounts, accounts: s0.accounts, items, transactions: txs, end: addDays(today, 90) }).find((a) => a.accountId === MBANK_ACCOUNT_ID)!
    expect(mbank.moves.map((m) => [m.date, m.amount])).toEqual([['2026-11-19', -zl(240)]])
    // The briefing: its next due to pay is February's – no asteroid of November.
    const brief = briefing({ fleet: f, containers: [waste], imports: [], label: () => '', cargo, payDays })
    expect(brief.filter((b) => b.kind === 'asteroid' || b.kind === 'cargo')).toEqual([])
  })

  it('miesięczna wpisana na dzień po terminie: po terminie z zaplanowaną płatnością – bez alertu odprawy, Ładownia ją pokazuje', () => {
    const rent = container({ name: 'Czynsz', amount: zl(1200), cycleMonths: 1, dueMonth: '2026-09', dueDay: 10 })
    const paid = [pay(rent, '2026-09-10'), pay(rent, '2026-10-10'), pay(rent, '2026-11-16')]
    const f = fleetOf(START, [rent], paid, '2026-11-14T12:00:00+01:00')
    const cargo = cargoOf([rent], paid, '2026-11-14', START)
    // Before: „zapłacone 16.11” on the 14th.
    expect(shown(cargo)).toEqual([['2026-11-10', 'overdue', false, '2026-11-16']])
    const brief = briefing({ fleet: f, containers: [rent], imports: [], label: () => '', cargo, payDays: cargoDays({ containers: [rent], transactions: paid, today: '2026-11-14' }) })
    expect(brief.filter((b) => b.kind === 'cargo')).toEqual([])
    // Without it the same due is an alert.
    const unplanned = cargoOf([rent], paid.slice(0, 2), '2026-11-14', START)
    expect(briefing({ fleet: f, containers: [rent], imports: [], label: () => '', cargo: unplanned }).filter((b) => b.kind === 'cargo').map((b) => b.key)).toEqual([`cargo:${rent.id}:2026-11-10`])
    // The Radar: November's due not again – December's on its day.
    const items = radar({ today: '2026-11-14', plans: [], containers: [rent], tanks: [], loans: [], money, cargo, days: 40 }).filter((i) => i.ref === rent.id)
    expect(items.map((i) => i.date)).toEqual(['2026-12-10'])
  })

  it('druga płatność okna wpisana z wyprzedzeniem: zaległy październik zamknie dopiero ona (zaplanowany na jej dzień)', () => {
    const rent = container({ name: 'Czynsz', amount: zl(1200), cycleMonths: 1, dueMonth: '2026-09', dueDay: 10 })
    const second = pay(rent, '2026-11-25')
    const paid = [pay(rent, '2026-09-10'), pay(rent, '2026-11-10'), second]
    // Before: on the 14th October already paid (the payment of 10.11 moved to it by the one of 25.11).
    expect(shown(cargoOf([rent], paid, '2026-11-14', START))).toEqual([
      ['2026-10-10', 'overdue', true, '2026-11-25'],
      ['2026-11-10', 'paid', false, null]
    ])
    expect(cargoOf([rent], paid, '2026-11-14', START)[0]!.planned).toEqual({ id: second.id, date: '2026-11-25', amount: zl(1200) })
    expect(shown(cargoOf([rent], paid, '2026-11-25', START))).toEqual([['2026-11-10', 'paid', false, null]])
  })

  it('płatność daleko naprzód (poza oknami terminów) nie jest zaplanowaną żadnego z nich', () => {
    const rent = container({ name: 'Czynsz', amount: zl(1200), cycleMonths: 1, dueMonth: '2026-09', dueDay: 10 })
    const paid = [pay(rent, '2026-09-10'), pay(rent, '2026-10-10'), pay(rent, '2027-03-10')]
    expect(shown(cargoOf([rent], paid, '2026-11-14', START))).toEqual([['2026-11-10', 'overdue', false, null]])
  })
})

describe('3: „Zapłacone (dziś)” nie liczy całej historii opłaty zapłaconej (wydajność)', () => {
  // Rent paid every month on the 10th for ten years: November paid on the 10th.
  const rent = container({ name: 'Czynsz', amount: zl(1500), cycleMonths: 1, dueMonth: '2016-11', dueDay: 10 })
  const START = '2016-11-01'
  const history: Transaction[] = []
  for (let m = '2016-11'; m <= '2026-11'; m = monthOf(addDays(`${m}-28`, 7))) history.push(pay(rent, dueIn(m, 10)))

  /** How many times the fee's payments are gone through (the rule's pass over them) in one state. */
  function passes(transactions: Transaction[], today: string): number {
    const list = paymentsIndex(transactions).byContainer.get(rent.id)!
    let n = 0
    Object.defineProperty(list, Symbol.iterator, {
      configurable: true,
      value(this: Linked[]) {
        n++
        return Array.prototype[Symbol.iterator].call(this)
      }
    })
    cargoOf([rent], transactions, today, START)
    return n
  }

  it('termin tego miesiąca zapłacony – jedno przejście; niezapłacony – drugie dla „Zapłacone (dziś)”', () => {
    // Before: two passes every time (the payment of today simulated for every fee).
    expect(passes(history, '2026-11-12')).toBe(1)
    expect(passes(history.slice(0, -1), '2026-11-12')).toBe(2)
    expect(cargoOf([rent], history.slice(0, -1), '2026-11-12', START).map((s) => [s.due, s.state, s.payToday])).toEqual([['2026-11-10', 'waiting', true]])
  })

  it('ten sam wynik co pełne liczenie: „Zapłacone (dziś)” przy terminie, który płatność dziś zostawia zapłaconym', () => {
    const fee = container({ name: 'Telefon', amount: zl(60), cycleMonths: 1, dueMonth: '2026-01', dueDay: 20 })
    // Some months paid, some late, some twice; the state on many days.
    const pays = [pay(fee, '2026-01-20'), pay(fee, '2026-03-02'), pay(fee, '2026-03-21'), pay(fee, '2026-05-19'), pay(fee, '2026-05-20'), pay(fee, '2026-07-25')]
    for (let today = '2026-01-15'; today <= '2026-08-30'; today = addDays(today, 3)) {
      const known = pays.filter((t) => t.date <= today)
      const list = cargoOf([fee], known, today, '2026-01-01')
      // The full count (as before the change): the payment of today after the ones up to today, its due the oldest left paid.
      const linked = paymentsIndex(known).byContainer.get(fee.id) ?? []
      const month = monthOf(today)
      const day = paymentDay(fee, linked, month).day
      const f = { start: '2026-01-01', month }
      const now = feeDuesOf(fee, linked, day, f).dues
      const after = feeDuesOf(fee, [...linked, { id: '', date: today, amount: amountIn(fee, month), accountId: '' }], day, f).dues
      const paidAfter = new Set(after.slice(0, -1).filter((d) => d.payments.length).map((d) => d.month))
      const ref = now.slice(0, -1).find((d) => !d.payments.length && paidAfter.has(d.month))?.month ?? null
      for (const s of list) expect(s.payToday, `${today}: ${s.due}`).toBe(ref === monthOf(s.due))
    }
  })
})

describe('4: „Pozostałe boje” – stan boi po dniu raz na listę, ten sam co liczony dla każdej osobno (T378)', () => {
  /** The state of a one-off past as it was counted for each alone (before: the panel's every row, every render). */
  function alone(s: Scheduled, transactions: readonly Transaction[], today: string, list: readonly Scheduled[]): string | null {
    if (s.yearly || s.date >= today) return null
    const all = [...list.filter((x) => x.id !== s.id), s]
    const state = scheduledDays(all, transactions, today, addDays(s.date, -6), addDays(s.date, 6)).find((d) => d.scheduled.id === s.id)?.state
    return state === 'done' || state === 'late' || state === 'lapsed' ? state : null
  }
  /** A small PRNG (mulberry32): the same buoys on every run. */
  function rng(seed: number): () => number {
    let x = seed >>> 0
    return () => {
      x = (x + 0x6d2b79f5) >>> 0
      let t = x
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  it('200 list boi (te same kwoty blisko siebie, zrobione z boi, odhaczone, co roku) – wynik jak dla każdej osobno', () => {
    const today = '2026-11-10'
    let compared = 0
    for (let seed = 1; seed <= 200; seed++) {
      const r = rng(seed)
      const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))
      const amounts = [-zl(80), -zl(120), zl(500)]
      const spread = seed % 2 ? 40 : 95
      const transactions: Transaction[] = []
      for (let i = int(3, 14); i > 0; i--) transactions.push(transactionSchema.parse({ ...base(), date: addDays(today, -int(5, spread)), accountId: MBANK_ACCOUNT_ID, amount: amounts[int(0, 2)]!, counterparty: r() < 0.5 ? 'MANDAT STRAZ MIEJSKA' : '' }))
      const list: Scheduled[] = []
      for (let i = int(3, 16); i > 0; i--) {
        const yearly = r() < 0.25
        // A yearly one since a year or two (its day this year among the others), a one-off of this autumn.
        const date = addDays(today, -int(-10, spread) - (yearly ? 365 * int(1, 2) : 0))
        const made = r() < 0.2 && transactions.length ? transactions[int(0, transactions.length - 1)]!.id : r() < 0.1 ? '' : null
        list.push(scheduledSchema.parse({ ...base(), name: r() < 0.6 ? 'Mandat' : 'Przegląd', date, amount: r() < 0.15 ? null : amounts[int(0, 2)]!, yearly, counterparty: r() < 0.3 ? 'MANDAT' : '', done: made == null ? {} : { [date]: made } }))
      }
      const states = pastStates(list, transactions, today)
      // Once per list, operations and day.
      expect(pastStates(list, transactions, today)).toBe(states)
      for (const s of list) {
        compared++
        expect(states.get(s.id) ?? null, `#${seed} ${s.name} ${s.date}`).toBe(alone(s, transactions, today, list))
        expect(pastStateOf(s, transactions, today, list)).toBe(alone(s, transactions, today, list))
      }
    }
    expect(compared).toBeGreaterThan(1500)
  })

  it('boja co roku dzień wcześniej bierze operację pierwsza (kolejność radaru) – jednorazowa obok minęła bez operacji', () => {
    const pay80 = transactionSchema.parse({ ...base(), date: '2026-10-04', accountId: MBANK_ACCOUNT_ID, amount: -zl(80), counterparty: 'MANDAT STRAZ MIEJSKA' })
    const yearly = scheduledSchema.parse({ ...base(), name: 'Mandat roczny', date: '2024-10-03', amount: -zl(80), yearly: true })
    const once = scheduledSchema.parse({ ...base(), name: 'Mandat', date: '2026-10-04', amount: -zl(80) })
    const list = [once, yearly]
    expect(pastStates(list, [pay80], '2026-11-10').get(once.id)).toBe('lapsed')
    expect(pastStateOf(once, [pay80], '2026-11-10', list)).toBe('lapsed')
    expect(pastStates([once], [pay80], '2026-11-10').get(once.id)).toBe('done')
  })

  it('boja spoza listy (zmieniona, jeszcze nie zapisana) liczy się jak dotąd – z listą bez swojej wersji', () => {
    const pay80 = transactionSchema.parse({ ...base(), date: '2026-10-04', accountId: MBANK_ACCOUNT_ID, amount: -zl(80), counterparty: 'MANDAT STRAZ MIEJSKA' })
    const mine = scheduledSchema.parse({ ...base(), name: 'Mandat', date: '2026-10-03', amount: -zl(80) })
    const edited = { ...mine, date: '2026-10-05' }
    expect(pastStateOf(edited, [pay80], '2026-11-10', [mine])).toBe('done')
    expect(pastStateOf(mine, [pay80], '2026-11-10', [mine])).toBe('done')
  })
})

describe('5: „Inwentaryzacja” – potwierdzenie sprzed 1.15.7 (bez chwili potwierdzenia) liczy się jak wtedy (T383)', () => {
  const W45 = { template: 'balances', week: '2026-W45', params: {} }
  /** A confirmation of the balance of `date` written at `at` – by 1.15.6 (no `confirmedAt`) or by 1.15.7 (`confirmedAt`). */
  const old = (accountId: string, date: string, at: string, over: Partial<Balance> = {}): Balance =>
    balanceSchema.parse({ ...base(at), date, accountId, kind: 'confirmation', amount: zl(100), ...over })
  function world(balances: Balance[], settings: (s: Settings) => Settings = (s) => s): GameInput {
    const s0 = createDefaultSettings(AT).settings
    const s1: Settings = { ...s0, budget: { ...s0.budget, start: '2026-09-01' }, layers: { ...s0.layers, assumedCosts: zl(3000) }, game: { ...s0.game, start: '2026-09-07' } }
    return {
      settings: settings(s1),
      balances: [balanceSchema.parse({ ...base(), date: '2026-09-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) }), ...balances],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-09', salary: zl(3100), envelopes: {} })],
      transactions: [],
      containers: [],
      dockings: [],
      game: []
    }
  }

  it('import w poniedziałek 02.11 pod 1.15.6 (saldo z niedzieli 01.11) – tydzień niezamrożony bez zmiany po aktualizacji', () => {
    // 1.15.6 counted the balance's day: not this week. Before: its creation (Monday) – done by the update alone.
    const file = old(MBANK_ACCOUNT_ID, '2026-11-01', '2026-11-02T07:00:00.000Z')
    expect(missionStatus(world([file]), W45, '2026-11-04')).toMatchObject({ have: 0 })
    // Confirmed again under 1.15.7 (the moment stamped): it counts.
    expect(missionStatus(world([{ ...file, confirmedAt: '2026-11-03T10:00:00.000Z' }]), W45, '2026-11-04')).toMatchObject({ have: 1 })
  })

  it('ponowne potwierdzenie pod 1.15.6 (lipcowe saldo, zapis w poniedziałek) – jak wtedy: nie w tym tygodniu', () => {
    const july = old(MBANK_ACCOUNT_ID, '2026-07-31', '2026-07-31T18:00:00.000Z', { updatedAt: '2026-11-02T08:00:00.000Z' })
    expect(missionStatus(world([july]), W45, '2026-11-04')).toMatchObject({ have: 0 })
  })

  it('saldo z tego tygodnia potwierdzone pod 1.15.6 – liczy się (jak wtedy), wszystkie konta – misja zaliczona', () => {
    const all = [MBANK_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID, CASH_ACCOUNT_ID].map((a) => old(a, '2026-11-03', '2026-11-03T19:00:00.000Z'))
    expect(missionStatus(world(all), W45, '2026-11-04')).toEqual({ ok: true, have: 3, need: 3 })
  })

  it('wybór misji: stare potwierdzenie (bez chwili) z saldem sprzed 4 tygodni – słaby punkt, jak wtedy', () => {
    const imports = (s: Settings): Settings => ({ ...s, import: { ...s.import, log: { '2026-10-24T09:00:00.000Z': MBANK_ACCOUNT_ID } } })
    // Written on 20.10 (within the 4 weeks), its balance of 20.09: 1.15.6 – a weak point; before the fix: not (creation).
    const rewritten = old(MBANK_ACCOUNT_ID, '2026-09-20', '2026-10-20T10:00:00.000Z')
    expect(chooseMission(world([rewritten], imports), '2026-10-26', null).template).toBe('balances')
  })
})

describe('9: jedna kolejność płatności jednego dnia (T393)', () => {
  it('po dniu, potem po operacji; ta sama – równe', () => {
    const p = (date: string, id: string) => ({ date, id })
    expect([p('2026-11-02', 'b'), p('2026-11-01', 'c'), p('2026-11-02', 'a')].sort(byPaymentDay)).toEqual([p('2026-11-01', 'c'), p('2026-11-02', 'a'), p('2026-11-02', 'b')])
    expect(byPaymentDay(p('2026-11-02', 'a'), p('2026-11-02', 'a'))).toBe(0)
  })
})
