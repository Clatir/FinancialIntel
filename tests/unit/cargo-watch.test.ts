import { describe, expect, it } from 'vitest'
import { briefing } from '@shared/calc/briefing'
import { addMonths } from '@shared/calc/dates'
import { cargoStatuses } from '@shared/calc/cargoStatus'
import { cycleText, deadContainers, pastAfterChange, priceChanges, priceText, deadText } from '@shared/calc/cargoWatch'
import { amountIn, computeFleet, cyclePosition, layersSum, monthlyWeight, nextPaymentOf, paidCycleOf, paymentsPerYear, scheduleOf, sinkingInstallment, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { recurringPayments, salarySplit, simulateCargo, sinkingOf } from '@shared/calc/plan'
import { lastPaymentOf, radar } from '@shared/calc/radar'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { dueNotices } from '@shared/notify'
import { balanceSchema, containerSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Container, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9C000000000000000000${String(++seq).padStart(3, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`

const FOOD = defaultCategoryId(1)
const HOME = defaultCategoryId(2)

const container = (over: Partial<Container> = {}): Container => containerSchema.parse({ ...base(), name: 'Netflix', amount: zl(43), dueMonth: '2026-01', dueDay: 12, ...over })
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const pay = (c: Container, date: string, amount = c.amount, over: Partial<Transaction> = {}): Transaction => tx(date, -amount, { accountId: XTB_WALLET_ACCOUNT_ID, containerId: c.id, ...over })
const spend = (date: string, amount: number, counterparty: string, categoryId: string | null = HOME) => tx(date, -zl(amount), { counterparty, categoryId })
const plan = (month: string, salary: number) => monthPlanSchema.parse({ ...base(), month, salary, envelopes: {} })
const opening = (date: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount })

function settingsWith(over: Partial<Settings['budget']> = {}): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, ...over }, layers: { ...s.layers, assumedCosts: zl(2000) } }
}

function fleet(input: Partial<FleetInput> & { now: string }): FleetState {
  const state = computeFleet({ settings: settingsWith(), transactions: [], ...input })
  if (state.started) expect(layersSum(state)).toBe(state.total)
  return state
}

/** One operation in each month from–to (a history the averages and the proposals read as whole months). */
const filler = (from: string, to: string): Transaction[] => {
  const out: Transaction[] = []
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(spend(`${m}-03`, 10 + out.length, `Sklep ${String.fromCharCode(65 + out.length)}`, FOOD))
  return out
}

// ------------------------------------------------------------------ F23: the schedule's cycle

describe('harmonogram płatności (1.9.0, F23)', () => {
  const tax = container({ name: 'Podatek od nieruchomości', amount: zl(400), cycleMonths: 12, schedule: [11, 3, 9, 5], dueMonth: '2026-03', dueDay: 15 })

  it('cykl od płatności do płatności: długość zmienna, termin – najbliższy miesiąc harmonogramu', () => {
    expect(scheduleOf(tax)).toEqual([3, 5, 9, 11])
    expect(cyclePosition(tax, '2026-04')).toEqual({ index: 0, dueMonth: '2026-05', length: 2 })
    expect(cyclePosition(tax, '2026-05')).toEqual({ index: 1, dueMonth: '2026-05', length: 2 })
    expect(cyclePosition(tax, '2026-06')).toEqual({ index: 0, dueMonth: '2026-09', length: 4 })
    expect(cyclePosition(tax, '2026-12')).toEqual({ index: 0, dueMonth: '2027-03', length: 4 })
    expect(cyclePosition(tax, '2027-03')).toEqual({ index: 3, dueMonth: '2027-03', length: 4 })
    expect(nextPaymentOf(tax, '2026-05-15')).toBe('2026-05-15')
    expect(nextPaymentOf(tax, '2026-05-16')).toBe('2026-09-15')
    expect(nextPaymentOf(tax, '2026-11-20')).toBe('2027-03-15')
    // A payment early (the month before its due) closes a cycle of 3 months and more only.
    expect(paidCycleOf(tax, '2026-08')).toBe('2026-09')
    expect(paidCycleOf(tax, '2026-04')).toBeNull()
    expect(paidCycleOf(tax, '2026-05')).toBe('2026-05')
  })

  it('harmonogram tylko opłaty okresowej, 2–11 miesięcy; inaczej liczy się jej cykl', () => {
    expect(scheduleOf({ ...tax, schedule: [3] })).toBeNull()
    expect(scheduleOf({ ...tax, schedule: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] })).toBeNull()
    expect(scheduleOf({ ...tax, cycleMonths: 1 })).toBeNull()
    expect(scheduleOf({ ...tax, schedule: [3, 3, 13, 9] })).toEqual([3, 9])
    expect(cyclePosition({ ...tax, schedule: [3] }, '2026-04')).toEqual({ index: 0, dueMonth: '2027-03', length: 12 })
  })

  it('miesięczna masa i płatności w roku z harmonogramu; zbiornik zbiera do każdej płatności z jej odstępu', () => {
    expect(paymentsPerYear(tax)).toBe(4)
    expect(monthlyWeight(tax)).toBe(13333)
    expect(cycleText(tax)).toBe('w miesiącach: mar, maj, wrz, lis')
    expect(cycleText(container({ cycleMonths: 3 }))).toBe('co kwartał')
    expect(cycleText(container({ cycleMonths: 5 }))).toBe('co 5 mies.')
    // December → March: 4 × 100 zł; April → May: 2 × 200 zł.
    let tank = 0
    const got: number[] = []
    for (const m of ['2026-12', '2027-01', '2027-02', '2027-03']) {
      const i = sinkingInstallment(tax, m, tank)
      got.push(i)
      tank += i
    }
    expect(got).toEqual([zl(100), zl(100), zl(100), zl(100)])
    expect(sinkingInstallment(tax, '2027-04', 0)).toBe(zl(200))
    expect(sinkingInstallment(tax, '2027-05', zl(200))).toBe(zl(200))
  })

  it('silnik: zbiornik pełny na każdą płatność, płatności ze zbiornika bez alarmu; Radar i odprawa z terminami harmonogramu', () => {
    const c = { ...tax, id: nextId() }
    const payments = [pay(c, '2026-09-15'), pay(c, '2026-11-16')]
    const f = fleet({
      settings: settingsWith({ start: '2026-09-01' }),
      balances: [opening('2026-09-01', zl(20000))],
      months: [plan('2026-09', zl(3000))],
      containers: [c],
      transactions: payments,
      now: '2026-11-20T12:00:00+01:00'
    })
    expect(f.alarms.filter((a) => a.kind === 'sinking-short')).toEqual([])
    // September caught up the whole payment (its cycle June – September), October and November 200 zł each.
    expect([...['2026-09', '2026-10', '2026-11'].map((m) => sinkingOf(f.log, m).get(c.id) ?? 0)]).toEqual([zl(400), zl(200), zl(200)])
    expect(f.tanks.find((t) => t.containerId === c.id)).toMatchObject({ amount: 0, dueMonth: '2027-03', due: zl(400) })
    const items = radar({ today: '2026-11-20', days: 150, plans: [], containers: [c], tanks: f.tanks, loans: [], money, cargo: [] })
    expect(items.filter((i) => i.kind === 'asteroid').map((i) => [i.date, i.amount])).toEqual([['2027-03-15', zl(400)]])
    // Its end: the last payment of its life.
    expect(lastPaymentOf({ ...c, until: '2027-08' }, '2026-11-20')).toBe('2027-05-15')
    // Due in its schedule's month only (F1).
    expect(cargoStatuses({ containers: [c], transactions: payments, today: '2027-03-10', tanks: [], coveredTo: {} }).map((s) => [s.due, s.state])).toEqual([['2027-03-15', 'waiting']])
    expect(cargoStatuses({ containers: [c], transactions: payments, today: '2027-04-10', tanks: [], coveredTo: {} })).toEqual([])
  })
})

// ------------------------------------------------------------------ F9: the amounts' history

describe('historia kwot kontenera (1.9.0, F9)', () => {
  const c = container({ amount: zl(49), past: [{ until: '2026-09', amount: zl(43) }, { until: '2026-03', amount: zl(39) }] })

  it('kwota w miesiącu: wcześniejsza do swojego miesiąca, potem obecna', () => {
    expect(amountIn(c, '2026-02')).toBe(zl(39))
    expect(amountIn(c, '2026-03')).toBe(zl(39))
    expect(amountIn(c, '2026-04')).toBe(zl(43))
    expect(amountIn(c, '2026-09')).toBe(zl(43))
    expect(amountIn(c, '2026-10')).toBe(zl(49))
    expect(monthlyWeight(c, '2026-05')).toBe(zl(43))
    expect(monthlyWeight(c)).toBe(zl(49))
    // The history in any order: the earliest change after the month decides.
    const ordered = { ...c, past: [...c.past].reverse() }
    expect(amountIn(ordered, '2026-02')).toBe(zl(39))
    expect(amountIn(ordered, '2026-06')).toBe(zl(43))
  })

  it('zmiana kwoty: stara do poprzedniego miesiąca – nie dla kontenera z tego miesiąca i nie drugi raz w tym samym miesiącu', () => {
    const old = container({ amount: zl(43) })
    expect(pastAfterChange(old, '2026-10')).toEqual([{ until: '2026-09', amount: zl(43) }])
    expect(pastAfterChange({ ...old, amount: zl(49), past: [{ until: '2026-09', amount: zl(43) }] }, '2026-10')).toEqual([{ until: '2026-09', amount: zl(43) }])
    expect(pastAfterChange(container({ createdAt: '2026-10-05T10:00:00.000Z' }), '2026-10')).toEqual([])
    expect(pastAfterChange(container({ from: '2026-11' }), '2026-10')).toEqual([])
    // Counted from an earlier month than its creation (`from`): those months keep the old amount.
    expect(pastAfterChange(container({ createdAt: '2026-10-05T10:00:00.000Z', from: '2026-08' }), '2026-10')).toEqual([{ until: '2026-09', amount: zl(43) }])
  })

  it('silnik: podwyżka opłaty okresowej od listopada – raty września i października bez zmian, dalej nadrabia', () => {
    const oc = container({ name: 'OC', amount: zl(2400), cycleMonths: 12, dueMonth: '2027-08', dueDay: 1, past: [{ until: '2026-10', amount: zl(1200) }] })
    const f = fleet({ settings: settingsWith({ start: '2026-09-01' }), balances: [opening('2026-09-01', zl(20000))], months: [plan('2026-09', zl(3000))], containers: [oc], now: '2026-11-20T12:00:00+01:00' })
    expect(['2026-09', '2026-10', '2026-11'].map((m) => sinkingOf(f.log, m).get(oc.id) ?? 0)).toEqual([zl(100), zl(100), zl(220)])
    expect(f.tanks[0]!.due).toBe(zl(2400))
    // The split of a month before the raise shows its amount then.
    const rent = container({ name: 'Czynsz', amount: zl(2100), past: [{ until: '2026-09', amount: zl(2000) }] })
    expect(salarySplit({ salary: zl(5000), envelopes: {} }, '2026-09', [rent, oc], []).cargo.items[0]!.amount).toBe(zl(2000))
    expect(salarySplit({ salary: zl(5000), envelopes: {} }, '2026-10', [rent, oc], []).tanks.items[0]).toMatchObject({ amount: zl(100), due: zl(2400) })
    expect(salarySplit({ salary: zl(5000), envelopes: {} }, '2026-11', [rent, oc], []).cargo.items[0]!.amount).toBe(zl(2100))
  })

  it('symulacja nowej ceny: masa ładunku i zasięg z nową kwotą', () => {
    const n = container({ amount: zl(43) })
    const sim = simulateCargo({ shields: zl(6000), hull: zl(6000), costs: zl(3000), salary: zl(5000), limitPct: 40, month: '2026-10', containers: [n] }, { amount: { id: n.id, to: zl(49) } })
    expect(sim.before.monthly).toBe(zl(43))
    expect(sim.after.monthly).toBe(zl(49))
    expect(sim.rangeAfter).toBeCloseTo(zl(12000) / zl(3006), 6)
  })
})

// ------------------------------------------------------------------ F9: the watch

describe('ładownia pilnuje cen i martwych kontenerów (1.9.0, F9)', () => {
  const today = '2026-10-20'

  it('dwie ostatnie płatności miesięcznej opłaty w nowej, zgodnej cenie – zmiana z procentem i kwotą rocznie', () => {
    const c = container()
    const [p] = priceChanges({ containers: [c], transactions: [pay(c, '2026-08-12'), pay(c, '2026-09-12', zl(49)), pay(c, '2026-10-12', zl(49))], today })
    expect(p).toMatchObject({ containerId: c.id, from: zl(43), to: zl(49), pct: 14, yearly: zl(72), basis: 'payments', key: `price:${c.id}:4900` })
    expect(p!.payments.map((x) => x.date)).toEqual(['2026-09-12', '2026-10-12'])
    expect(priceText(p!, c, money)).toBe('Netflix: 43.00 zł → 49.00 zł co miesiąc (+14%, +72.00 zł rocznie)')
  })

  it('bez zmiany: jedna płatność w nowej cenie, dwie różne, w granicy tolerancji, po zmianie kwoty, odrzucona cena, zarchiwizowany i rata pożyczki', () => {
    const c = container()
    const at = (payments: number[], over: Partial<Container> = {}, dates = ['2026-09-12', '2026-10-12']) => {
      const k = { ...c, ...over }
      return priceChanges({ containers: [k], transactions: payments.map((a, i) => pay(k, dates[i]!, a)), today })
    }
    expect(at([zl(43), zl(49)])).toEqual([])
    expect(at([zl(49), zl(55)])).toEqual([])
    // 5% of 43 zł (2,15 zł); of 30 zł 1,50 zł – under 2 zł, so 2 zł counts.
    expect(at([zl(45.1), zl(45.1)])).toEqual([])
    expect(at([zl(45.2), zl(45.2)])).toHaveLength(1)
    expect(at([zl(31.9), zl(31.9)], { amount: zl(30) })).toEqual([])
    expect(at([zl(32.1), zl(32.1)], { amount: zl(30) })).toHaveLength(1)
    expect(at([zl(49), zl(49)], { amountAt: '2026-10-15T08:00:00.000Z' })).toEqual([])
    expect(at([zl(49), zl(49)], { amountAt: '2026-09-01T08:00:00.000Z' })).toHaveLength(1)
    expect(at([zl(49), zl(49)], { priceIgnored: zl(49) })).toEqual([])
    expect(at([zl(52), zl(52)], { priceIgnored: zl(49) })).toHaveLength(1)
    expect(at([zl(49), zl(49)], { archived: true })).toEqual([])
    expect(at([zl(49), zl(49)], { loanId: nextId() })).toEqual([])
  })

  it('opłata płacona kilkoma przelewami: suma cyklu – czynsz w dwóch przelewach to nie „lżejszy”; drugi przelew jeszcze nie przyszedł – cykl czeka', () => {
    const rent = container({ name: 'Czynsz', amount: zl(2000), dueDay: 10 })
    const halves = (months: string[], half: number) => months.flatMap((m) => [pay(rent, `2026-${m}-10`, zl(half)), pay(rent, `2026-${m}-11`, zl(half))])
    expect(priceChanges({ containers: [rent], transactions: halves(['06', '07', '08', '09'], 1000), today })).toEqual([])
    // A raise to 2 200 zł in August; October's second transfer not come yet (its cycle runs until 27.10).
    const raised = [...halves(['06', '07'], 1000), ...halves(['08', '09'], 1100), pay(rent, '2026-10-10', zl(1100))]
    const [p] = priceChanges({ containers: [rent], transactions: raised, today })
    expect(p).toMatchObject({ from: zl(2000), to: zl(2200), pct: 10 })
    expect(p!.payments.map((x) => x.date)).toEqual(['2026-08-10', '2026-08-11', '2026-09-10', '2026-09-11'])
    // Its days over without the second transfer: the cycle counts as it is.
    expect(priceChanges({ containers: [rent], transactions: raised, today: '2026-10-28' })).toEqual([])
  })

  it('opłata okresowa – jedna płatność; rachunek zmienny – 75. percentyl roku, gdy różni się o ponad 10%', () => {
    const oc = container({ name: 'OC', amount: zl(1200), cycleMonths: 12, dueMonth: '2026-10' })
    expect(priceChanges({ containers: [oc], transactions: [pay(oc, '2026-10-05', zl(1380))], today })[0]).toMatchObject({ to: zl(1380), pct: 15, yearly: zl(180) })
    const power = container({ name: 'PGE', amount: zl(200), variable: true })
    const year = [150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260].map((a, i) => pay(power, `${i < 2 ? '2025' : '2026'}-${String(((i + 10) % 12) + 1).padStart(2, '0')}-08`, zl(a)))
    expect(priceChanges({ containers: [power], transactions: year, today })[0]).toMatchObject({ to: zl(230), basis: 'variable', yearly: zl(360) })
    expect(priceChanges({ containers: [{ ...power, amount: zl(225) }], transactions: year, today })).toEqual([])
    // 212 zł: 8% below the year – within the bill's 10%.
    expect(priceChanges({ containers: [{ ...power, amount: zl(212) }], transactions: year, today })).toEqual([])
    // Fewer than 3 payments a year: nothing to read.
    expect(priceChanges({ containers: [power], transactions: year.slice(-2), today })).toEqual([])
  })

  it('kontener bez płatności przez 2 terminy (plik z banku je obejmuje) – anulowany?; „Nadal płacę” liczy się jak płatność', () => {
    const c = container({ dueDay: 12 })
    const history = ['04', '05', '06', '07'].map((m) => pay(c, `2026-${m}-12`))
    const [d] = deadContainers({ containers: [c], transactions: history, today })
    expect(d).toMatchObject({ containerId: c.id, last: '2026-07-12', missed: ['2026-08-12', '2026-09-12', '2026-10-12'], key: `dead:${c.id}:2026-09-12` })
    expect(deadText(d!)).toBe('Netflix: brak płatności od 12.07 (3 terminy bez płatności) – subskrypcja anulowana?')
    // One due missed only; the grace of the second not over.
    expect(deadContainers({ containers: [c], transactions: history, today: '2026-09-13' })).toEqual([])
    // An account with files from the bank: only the dues they reach.
    const bank = container({ dueDay: 12, accountId: MBANK_ACCOUNT_ID })
    const bankHistory = ['04', '05', '06', '07'].map((m) => pay(bank, `2026-${m}-12`, bank.amount, { accountId: MBANK_ACCOUNT_ID }))
    expect(deadContainers({ containers: [bank], transactions: bankHistory, today, coveredTo: { [MBANK_ACCOUNT_ID]: '2026-08-20' } })).toEqual([])
    expect(deadContainers({ containers: [bank], transactions: bankHistory, today, coveredTo: { [MBANK_ACCOUNT_ID]: '2026-09-20' } })).toHaveLength(1)
    expect(deadContainers({ containers: [{ ...c, aliveAt: '2026-09-01' }], transactions: history, today })).toEqual([])
    // Never paid, archived: nothing.
    expect(deadContainers({ containers: [c], transactions: [], today })).toEqual([])
    expect(deadContainers({ containers: [{ ...c, archived: true }], transactions: history, today })).toEqual([])
  })

  it('odprawa i powiadomienia: nowa cena, kontener bez płatności, nowa opłata – raz na klucz, z własnym wyłącznikiem', () => {
    const c = container()
    const f = fleet({ settings: settingsWith({ start: '2026-09-01' }), balances: [opening('2026-09-01', zl(20000))], months: [plan('2026-09', zl(3000))], now: '2026-10-20T12:00:00+02:00' })
    const watch = {
      prices: priceChanges({ containers: [c], transactions: [pay(c, '2026-09-12', zl(49)), pay(c, '2026-10-12', zl(49))], today }),
      dead: [],
      fresh: [{ key: 'pge', label: 'PGE', amount: zl(240), cycleMonths: 1, schedule: [], variable: true, dueMonth: '2026-09', dueDay: 8, categoryId: null, accountId: MBANK_ACCOUNT_ID, payments: 6, last: '2026-09-08', fresh: true }]
    }
    const items = briefing({ fleet: f, containers: [c], imports: [], label: () => '', money, watch }).filter((i) => i.kind === 'price' || i.kind === 'recurring')
    expect(items.map((i) => [i.kind, i.key, i.text])).toEqual([
      ['price', `price:${c.id}:4900`, 'Kontener cięższy niż w manifeście – Netflix: 43.00 zł → 49.00 zł co miesiąc (+14%, +72.00 zł rocznie). Zaktualizować?'],
      ['recurring', 'recurring:pge:2026-10', 'Nowa opłata w historii: PGE co miesiąc – 240.00 zł (kwota zmienna – szacunek z roku). Do ładowni?']
    ])
    const notices = (cargoWatch: boolean) =>
      dueNotices({ fleet: f, containers: [c], imports: [], label: () => '', money, watch, prefs: { ...DEFAULT_MACHINE_PREFS.notify, cargoWatch }, quietHours: { from: '23:00', to: '05:00' }, time: '12:00', opened: false })
        .filter((n) => n.tag === 'cargo')
        .map((n) => n.title)
    expect(notices(true)).toEqual(['Kontener cięższy niż w manifeście', 'Nowa opłata w historii'])
    expect(notices(false)).toEqual([])
  })
})

// ------------------------------------------------------------------ F23: the history's fees

describe('opłaty cykliczne z historii (1.9.0, F23)', () => {
  const month = '2026-10'
  const history = filler('2025-09', '2026-09')
  const found = (txs: Transaction[], ignored?: Set<string>) =>
    recurringPayments([...history, ...txs], month, [], undefined, ignored).map((p) => ({ label: p.label, cycle: p.cycleMonths, amount: p.amount, schedule: p.schedule, variable: p.variable, day: p.dueDay, fresh: p.fresh }))

  it('co 2, 3 i 6 miesięcy – ostatnie płatności w odstępie cyklu (±12 dni), co najmniej trzy, następna nie przepadła', () => {
    expect(found(['2026-03-05', '2026-05-05', '2026-07-05', '2026-09-05'].map((d) => spend(d, 180, 'PGNIG')))).toEqual([{ label: 'PGNIG', cycle: 2, amount: zl(180), schedule: [], variable: false, day: 5, fresh: false }])
    expect(found(['2026-01-10', '2026-04-10', '2026-07-10'].map((d) => spend(d, 300, 'WODOCIAGI')))).toEqual([{ label: 'WODOCIAGI', cycle: 3, amount: zl(300), schedule: [], variable: false, day: 10, fresh: false }])
    expect(found(['2025-04-20', '2025-10-20', '2026-04-20'].map((d) => spend(d, 600, 'LINK4')))).toEqual([{ label: 'LINK4', cycle: 6, amount: zl(600), schedule: [], variable: false, day: 20, fresh: false }])
    // Two payments only; a cycle broken off (the next one missed).
    expect(found(['2026-05-10', '2026-08-10'].map((d) => spend(d, 300, 'WODOCIAGI')))).toEqual([])
    expect(found(['2025-09-10', '2025-12-10', '2026-03-10'].map((d) => spend(d, 300, 'WODOCIAGI')))).toEqual([])
  })

  it('rachunek o zmiennej kwocie co miesiąc w swoim dniu – kwota z 75. percentyla roku; paliwo i sklep nie', () => {
    const power = ['04', '05', '06', '07', '08', '09'].map((m, i) => spend(`2026-${m}-${['08', '10', '09', '12', '11', '08'][i]}`, [150, 260, 180, 200, 240, 170][i]!, 'PGE OBROT'))
    expect(found(power)).toEqual([{ label: 'PGE OBROT', cycle: 1, amount: zl(240), schedule: [], variable: true, day: 9, fresh: false }])
    // Up to 60% of the median (120 zł against 200); the amount up to whole złoty.
    const wide = ['04', '05', '06', '07', '08', '09'].map((m, i) => spend(`2026-${m}-${['08', '10', '09', '12', '11', '08'][i]}`, [120, 260.3, 180.2, 200.1, 240.45, 170][i]!, 'ENERGA'))
    expect(found(wide)).toEqual([{ label: 'ENERGA', cycle: 1, amount: zl(241), schedule: [], variable: true, day: 9, fresh: false }])
    // Fuel on any day of the month, a shop's amounts – no bill.
    const fuel = ['04', '05', '06', '07', '08', '09'].map((m, i) => spend(`2026-${m}-${['02', '27', '14', '05', '21', '09'][i]}`, [150, 260, 180, 200, 240, 170][i]!, 'ORLEN'))
    expect(found(fuel)).toEqual([])
  })

  it('harmonogram: 3–11 płatności roku, każda w swoim miesiącu w podobnym dniu; rok historii za nimi', () => {
    const tax = ['2025-11-15', '2026-03-16', '2026-05-15', '2026-09-14'].map((d) => spend(d, 250, 'URZAD GMINY'))
    expect(found(tax)).toEqual([{ label: 'URZAD GMINY', cycle: 12, amount: zl(250), schedule: [3, 5, 9, 11], variable: false, day: 15, fresh: true }])
    // Less than a year of history: no schedule yet.
    expect(recurringPayments([...filler('2026-01', '2026-09'), ...tax.slice(1)], month).length).toBe(0)
    // Two payments in one month: no schedule.
    expect(found(['2025-11-15', '2026-03-14', '2026-03-16', '2026-09-14'].map((d) => spend(d, 250, 'URZAD GMINY')))).toEqual([])
    // On different days of the month (a hairdresser): no.
    expect(found(['2025-11-03', '2026-03-22', '2026-05-15', '2026-09-28'].map((d) => spend(d, 80, 'FRYZJER')))).toEqual([])
  })

  it('co rok – tylko z płatnością w ostatnich 13 miesiącach; „Nie proponuj” i nowa opłata ostatniego miesiąca', () => {
    expect(found(['2024-03-12', '2025-03-15'].map((d) => spend(d, 1240, 'PZU SA')))).toEqual([])
    expect(found(['2025-03-12', '2026-03-15'].map((d) => spend(d, 1240, 'PZU SA')))).toEqual([{ label: 'PZU SA', cycle: 12, amount: zl(1240), schedule: [], variable: false, day: 15, fresh: false }])
    const quarterly = ['2026-03-10', '2026-06-10', '2026-09-10'].map((d) => spend(d, 300, 'WODOCIAGI'))
    expect(found(quarterly)[0]!.fresh).toBe(true)
    expect(found([spend('2025-12-10', 300, 'WODOCIAGI'), ...quarterly])[0]!.fresh).toBe(false)
    expect(found(quarterly, new Set(['wodociagi']))).toEqual([])
  })
})
