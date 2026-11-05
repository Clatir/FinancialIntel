import { describe, expect, it } from 'vitest'
import { AHEAD_DAYS, cargoStatuses, dueIn, feeDuesOf, paymentDay, paymentsIndex, plannedDues, type CargoStatus } from '@shared/calc/cargoStatus'
import { addDays, addMonths, firstDayOf, monthOf } from '@shared/calc/dates'
import { activeIn, amountIn, computeFleet, cyclePosition, layersSum, sinkingInstallment, type FleetState } from '@shared/calc/fleet'
import { startPaidDays, startTankItems, startTanks } from '@shared/calc/start'
import { briefing } from '@shared/calc/briefing'
import { radar } from '@shared/calc/radar'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, defaultCategoryId, goalSchema, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Container, type Settings, type Transaction } from '@shared/schema'

/**
 * Przegląd N3 13 (T393) as a property: over generated payment histories of a fee – every month, every 2 months, a quarter,
 * a year, a schedule; paid on time, early, late, twice, in halves, not at all; settled outside the budget, added to the
 * hold after the start, due before the start's day – the engine and Ładownia agree. The engine's cycle paid today is the
 * due Ładownia shows paid (`paidDue`); at the month's turn the tank wants nothing for a cycle Ładownia showed paid then and
 * its installment for one it showed unpaid; „Zapłacone (dziś)” is the due a payment today pays. After the merge of N2
 * with N3 (T393) the same with the payments made every way: from a goal's money, to be refunded (the whole purchase or a
 * line of a receipt), an old transfer with a hidden container (T362) – one rule of which payment pays (`paymentsIndex`).
 * Przegląd 2 N3: the same for a bill of a varying amount (F23) and with payments written ahead (T398: a due paid only from
 * the payment's day, shown planned before it), and the start wizard's installment = the engine's at the start.
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2025-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N3P0000000000000${String(++seq).padStart(6, '0')}`
const base = (at = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: at, updatedAt: at })
const pay = (c: Container, date: string, amount: number): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -amount, containerId: c.id })

/** A goal the payments from a goal's money take (T131) – known to the engine. */
const GOAL = goalSchema.parse({ ...base(), name: 'Remont', target: zl(100000), priority: 1 })
const FOOD = defaultCategoryId(1)
/** How a payment was made (T393 after N2): mine, from a goal, to be refunded (whole, a line of a receipt), an old transfer. */
const WAYS = ['own', 'goal', 'refund', 'line', 'transfer'] as const
type Way = (typeof WAYS)[number]
function payBy(c: Container, date: string, amount: number, way: Way): Transaction {
  if (way === 'own') return pay(c, date, amount)
  const t = { ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -amount }
  if (way === 'goal') return transactionSchema.parse({ ...t, containerId: c.id, goalId: GOAL.id })
  if (way === 'refund') return transactionSchema.parse({ ...t, containerId: c.id, refundable: true, memberId: HOUSE_MEMBER_ID })
  if (way === 'line') {
    // A receipt: the fee's line to be refunded, a line of mine beside it (not the fee's).
    const splits = [
      { id: nextId(), amount: -amount, categoryId: FOOD, refundable: true, memberId: HOUSE_MEMBER_ID, containerId: c.id },
      { id: nextId(), amount: -zl(10), categoryId: FOOD }
    ]
    return transactionSchema.parse({ ...t, amount: -amount - zl(10), categoryId: FOOD, splits })
  }
  return transactionSchema.parse({ ...t, kind: 'transfer', containerId: c.id })
}
const wayOf = (t: Transaction): Way => (t.kind === 'transfer' ? 'transfer' : t.goalId ? 'goal' : t.splits.length ? 'line' : t.refundable ? 'refund' : 'own')

/** A small PRNG (mulberry32): the same histories on every run. */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Case {
  c: Container
  payments: Transaction[]
  start: string
  todays: string[]
  name: string
}

/**
 * A fee's history from a seed. `ways` – every way of paying (T393 after N2); `variable` – a bill of a varying amount
 * (F23: any second payment of a window pays an older due), each payment's amount ±40 % (przegląd 2 N3) – drawn apart, the
 * other cases stay as they were.
 */
function caseOf(seed: number, o: { ways?: boolean; variable?: boolean } = {}): Case {
  const { ways = false } = o
  const r = rng(seed)
  const rv = rng(seed * 7919 + 17)
  const variable = !!o.variable && rv() < 0.7
  const vary = (amount: number) => (variable ? Math.max(100, Math.round(amount * (0.6 + rv() * 0.8))) : amount)
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))
  const kind = ['1', '2', '3', '12', 'schedule'][int(0, 4)]!
  const cycleMonths = kind === 'schedule' ? 12 : Number(kind)
  const schedule = kind === 'schedule' ? [[3, 5, 9, 11], [1, 2, 7], [2, 8], [4, 6, 12]][int(0, 3)]! : []
  const dueDay = r() < 0.1 ? int(29, 31) : int(1, 28)
  const start = addDays('2025-03-01', int(0, 300))
  const dueMonth = addMonths(monthOf(start), -int(0, 11))
  // Added at the start, after it (`from` its month as the hold sets it for a periodic fee – or none), before it.
  const roll = r()
  const created = roll < 0.55 ? start : roll < 0.85 ? addDays(start, int(1, 200)) : addDays(start, -int(1, 120))
  const from = created > start && cycleMonths > 1 && r() < 0.5 ? monthOf(created) : null
  const amount = zl(int(20, 1500))
  const draft = containerSchema.parse({ ...base(`${created}T10:00:00.000Z`), name: `Opłata ${seed}`, amount, cycleMonths, schedule, dueMonth, dueDay, from, accountId: MBANK_ACCOUNT_ID, variable })
  // The payments: from 8 months before the start (history linked from before it) to 20 months after – every way of paying
  // drawn too (`ways`): half mine, the rest from a goal, to be refunded (whole, a line) or an old transfer.
  const payments: Transaction[] = []
  const pay = (c: Container, date: string, amount: number): Transaction => (ways ? payBy(c, date, vary(amount), r() < 0.5 ? 'own' : WAYS[int(1, 4)]!) : payBy(c, date, vary(amount), 'own'))
  const end = addMonths(monthOf(start), 20)
  const dues: string[] = []
  for (let due = cyclePosition(draft, addMonths(monthOf(start), -8)).dueMonth; due <= end; due = cycleMonths > 1 ? cyclePosition(draft, addMonths(due, 1)).dueMonth : addMonths(due, 1)) {
    const date = dueIn(due, dueDay)
    dues.push(date)
    const x = r()
    const long = cycleMonths > 1 && cyclePosition(draft, due).length >= 3
    if (x < 0.15) continue
    if (x < 0.3) payments.push(pay(draft, long ? `${addMonths(due, -1)}-${String(int(1, 28)).padStart(2, '0')}` : addDays(date, -int(1, 13)), amount))
    else if (x < 0.45) payments.push(pay(draft, addDays(date, int(4, 50)), amount))
    else if (x < 0.55) payments.push(pay(draft, addDays(date, -1), amount), pay(draft, addDays(date, 2), amount))
    else if (x < 0.62) payments.push(pay(draft, date, Math.floor(amount / 2)), pay(draft, addDays(date, 3), amount - Math.floor(amount / 2)))
    else payments.push(pay(draft, addDays(date, int(-2, 2)), amount))
  }
  // „Zapłacone poza budżetem” of a due of the budget: the day after it.
  const settledDue = r() < 0.2 ? dues.filter((d) => d >= start)[int(0, 5)] : undefined
  const c = settledDue ? { ...draft, aliveAt: addDays(settledDue, 1) } : draft
  const first = created > start ? created : start
  const todays = Array.from({ length: 4 }, () => addDays(first, int(0, 560))).filter((d) => d < `${end}-01`)
  return { c, payments: payments.sort((a, b) => a.date.localeCompare(b.date)), start, todays, name: `#${seed} ${kind}${variable ? ' zmienna' : ''} dzień ${dueDay} start ${start} dodany ${created}${from ? ` od ${from}` : ''}${c.aliveAt ? ` aliveAt ${c.aliveAt}` : ''}` }
}

function fleetOf(k: Case, transactions: Transaction[], today: string): FleetState {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = { ...s0, budget: { ...s0.budget, start: k.start } }
  const state = computeFleet({
    settings,
    balances: [balanceSchema.parse({ ...base(), date: k.start, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(50000) })],
    months: [monthPlanSchema.parse({ ...base(), month: monthOf(k.start), salary: zl(9000), envelopes: {} })],
    goals: [GOAL],
    transactions,
    containers: [k.c],
    now: `${today}T12:00:00+01:00`
  })
  expect(layersSum(state)).toBe(state.total)
  return state
}

const cargoAt = (k: Case, transactions: Transaction[], today: string) => cargoStatuses({ containers: [k.c], transactions, today, coveredTo: {}, start: k.start })
/** This month's due of the state (not a late one). */
const ownDue = (list: CargoStatus[], month: string) => list.find((s) => !s.carried && monthOf(s.due) === month)
/** The fee's payment day for the dues of `month` – the state's and the engine's day. */
const dayFor = (k: Case, transactions: Transaction[], month: string) => paymentDay(k.c, paymentsIndex(transactions).byContainer.get(k.c.id) ?? [], month).day

interface Tally {
  today: number
  turns: number
  early: number
  payToday: number
}

/** The engine's paid cycle today and Ładownia's due (`paidDue` – this cycle's due month, B55). */
function checkToday(k: Case, f: FleetState, transactions: Transaction[], today: string, tally: Tally, why: string) {
  const month = monthOf(today)
  const tank = f.tanks.find((t) => t.containerId === k.c.id)
  if (k.c.cycleMonths <= 1 || !tank || !activeIn(k.c, month)) return
  const due = cyclePosition(k.c, month).dueMonth
  if (due === month) {
    tally.today++
    expect(tank.paidDue === due, `${why}: paidDue ${tank.paidDue}, Ładownia ${ownDue(cargoAt(k, transactions, today), month)?.state}`).toBe(ownDue(cargoAt(k, transactions, today), month)?.state === 'paid')
  } else if (cyclePosition(k.c, due).length >= 3 && dayFor(k, transactions, month) === dayFor(k, transactions, due)) {
    // Paid early (T135): on the 1st of its due month Ładownia shows it paid by the same payments – the ones up to today
    // (one written ahead pays from its day – T398).
    tally.early++
    const s = ownDue(cargoAt(k, transactions.filter((t) => t.date <= today), firstDayOf(due)), due)
    expect(tank.paidDue === due, `${why}: paidDue ${tank.paidDue}, Ładownia 1.${due.slice(5)} ${s?.state}`).toBe(s?.state === 'paid')
  } else expect(tank.paidDue === null || tank.paidDue === due).toBe(true)
}

/** This month's turn: no installment for a cycle Ładownia showed paid then, the installment for one it showed unpaid. */
function checkTurn(k: Case, f: FleetState, transactions: Transaction[], today: string, tally: Tally, why: string) {
  const month = monthOf(today)
  const tank = f.tanks.find((t) => t.containerId === k.c.id)
  if (k.c.cycleMonths <= 1 || tank?.want == null) return
  const turn = monthOf(k.start) === month ? k.start : firstDayOf(month)
  const before = transactions.filter((t) => t.date < turn)
  let inTank = 0
  for (const e of f.log) if (e.date < turn || e.kind === 'start') inTank += e.moves.tanks?.[k.c.id] ?? 0
  const due = cyclePosition(k.c, month).dueMonth
  const shownOn = due === month ? turn : firstDayOf(due)
  if (due !== month && (cyclePosition(k.c, due).length < 3 || dayFor(k, before, month) !== dayFor(k, before, due))) return
  tally.turns++
  const s = ownDue(cargoAt(k, before, shownOn), due)
  expect(tank.want, `${why}: turn ${turn}, Ładownia ${shownOn} ${s?.state}, tank ${inTank}`).toBe(s?.state === 'paid' ? 0 : sinkingInstallment(k.c, month, inTank))
}

/** Paid, or paid by a payment written ahead (T398): closed once the payments of the folder come – the outlook's. */
const closed = (s: CargoStatus | undefined) => !!s && (s.state === 'paid' || !!s.planned)

/**
 * „Zapłacone (dziś)” (T375, T398): a payment today closes the due it is shown at (the oldest one neither paid nor planned
 * it leaves closed – the payments written ahead in, przegląd 3 N3); none shown – it closes no due shown open. The engine
 * follows the state after it.
 */
function checkPayToday(k: Case, transactions: Transaction[], today: string, tally: Tally, why: string) {
  const shown = cargoAt(k, transactions, today)
  const target = shown.find((s) => s.payToday)
  const after = [...transactions, pay(k.c, today, target?.amount ?? amountIn(k.c, monthOf(today)))]
  const now = cargoAt(k, after, today)
  const open = (s: CargoStatus) => !closed(s)
  if (target) {
    tally.payToday++
    expect(open(target), `${why}: „Zapłacone” at a due closed`).toBe(true)
    const then = now.find((s) => s.due === target.due)
    // A late one paid by it is no longer shown; this month's is – paid, or paid by the payment written ahead it frees.
    expect(target.carried ? !then || closed(then) : closed(then), `${why}: „Zapłacone” ${target.due}`).toBe(true)
    // The open ones before it stay as they were.
    for (const s of shown) if (s.due < target.due && open(s)) expect(now.some((x) => x.due === s.due && open(x)), `${why}: ${s.due} before ${target.due}`).toBe(true)
  } else for (const s of shown) if (open(s)) {
    // Under T495 an open due may become planned by a forward payment shifting an earlier payment (without payToday under T398).
    expect(now.some((x) => x.due === s.due && (open(x) || (x.state !== 'paid' && !!x.planned))), `${why}: ${s.due} closed, no „Zapłacone” shown`).toBe(true)
  }
  const f = fleetOf(k, after, today)
  checkToday(k, f, after, today, tally, `${why} + zapłata dziś`)
}

/**
 * „Zapłacone (dziś)” as the full count gives it (przegląd 2 N3 3 – counted now only for a fee with a due still to pay;
 * przegląd 3 N3 – the payments written ahead counted in, up to the Radar's window): the oldest due neither paid (up to
 * today) nor planned (holding a payment dated after today) that a payment of today leaves paid or planned.
 */
function checkPayTodayRef(k: Case, transactions: Transaction[], today: string, why: string) {
  const month = monthOf(today)
  const start = k.start <= today ? k.start : null
  const all = paymentsIndex(transactions).byContainer.get(k.c.id) ?? []
  const upTo = all.filter((p) => p.date <= today)
  const ahead = all.filter((p) => p.date > today)
  const day = paymentDay(k.c, upTo, month).day
  const follow = { start, month }
  const view = { start, month, until: monthOf(addDays(today, AHEAD_DAYS)) }
  const payment = { id: '', date: today, amount: amountIn(k.c, month), accountId: '' }
  const planBefore: ReadonlySet<string> = ahead.length ? (plannedDues({ containers: [k.c], transactions, today, start: k.start }).get(k.c.id) ?? new Set<string>()) : new Set<string>()
  const dues = feeDuesOf(k.c, upTo, day, follow).dues
  const before = new Set<string>()
  for (const d of dues.slice(0, -1)) if (d.payments.length) before.add(d.month)
  for (const m of planBefore) before.add(m)

  const stateAfter = feeDuesOf(k.c, [...upTo, payment], day, follow).dues
  const after = new Set<string>()
  for (const d of stateAfter.slice(0, -1)) if (d.payments.length) after.add(d.month)
  if (ahead.length) {
    for (const d of feeDuesOf(k.c, [...upTo, payment, ...ahead], day, view).dues.slice(0, -1)) {
      if (d.payments.some((p) => p.date > today)) after.add(d.month)
    }
  }
  const ref = dues.slice(0, -1).find((d) => !before.has(d.month) && after.has(d.month))?.month ?? null
  for (const s of cargoAt(k, transactions, today)) expect(s.payToday, `${why}: „Zapłacone (dziś)” ${s.due}`).toBe(ref === monthOf(s.due))
}

/** Ładownia's own rules: paid with payments, a late due unpaid and the budget's (T375, przegląd N3 3, 4, 5). */
function checkShown(k: Case, shown: CargoStatus[], why: string) {
  const created = monthOf(k.c.createdAt)
  for (const s of shown) {
    expect(s.state === 'paid', `${why}: ${s.due}`).toBe(s.payments.length > 0)
    if (!s.carried) continue
    expect(s.state, `${why}: late ${s.due}`).not.toBe('paid')
    expect(s.due >= k.start && monthOf(s.due) >= created && s.due >= (k.c.aliveAt ?? ''), `${why}: late ${s.due} not the budget's`).toBe(true)
  }
  const ids = shown.flatMap((s) => s.payments.map((p) => p.id))
  expect(new Set(ids).size, `${why}: a payment of two dues`).toBe(ids.length)
}

describe('przegląd N3 13: silnik i Ładownia liczą cykle opłat jedną regułą (T393) – właściwość na historiach płatności', () => {
  it('400 historii opłat (co miesiąc, co 2 miesiące, kwartał, rok, harmonogram): paidDue, rata na przełomie, „Zapłacone (dziś)”', () => {
    const tally: Tally = { today: 0, turns: 0, early: 0, payToday: 0 }
    for (let seed = 1; seed <= 400; seed++) {
      const k = caseOf(seed)
      for (const today of k.todays) {
        const why = `${k.name}, dziś ${today}`
        const known = k.payments.filter((t) => t.date <= today)
        const f = fleetOf(k, known, today)
        checkShown(k, cargoAt(k, known, today), why)
        checkToday(k, f, known, today, tally, why)
        checkTurn(k, f, known, today, tally, why)
        checkPayToday(k, known, today, tally, why)
        checkPayTodayRef(k, known, today, why)
      }
    }
    // The checks ran on many histories, not a few.
    expect(tally.today).toBeGreaterThan(500)
    expect(tally.turns).toBeGreaterThan(800)
    expect(tally.early).toBeGreaterThan(700)
    expect(tally.payToday).toBeGreaterThan(400)
  })

  it('po scaleniu z N2 (T393): płatność z celu, do zwrotu (cała, linia paragonu), dawny przelew z kontenerem – 250 historii, silnik = Ładownia', () => {
    const tally: Tally = { today: 0, turns: 0, early: 0, payToday: 0 }
    const seen = new Map<Way, number>()
    for (let seed = 1001; seed <= 1250; seed++) {
      const k = caseOf(seed, { ways: true })
      for (const t of k.payments) seen.set(wayOf(t), (seen.get(wayOf(t)) ?? 0) + 1)
      for (const today of k.todays) {
        const why = `${k.name} (sposoby zapłaty), dziś ${today}`
        const known = k.payments.filter((t) => t.date <= today)
        const f = fleetOf(k, known, today)
        checkShown(k, cargoAt(k, known, today), why)
        checkToday(k, f, known, today, tally, why)
        checkTurn(k, f, known, today, tally, why)
        checkPayToday(k, known, today, tally, why)
        // A bill paid from a goal or by the household (and an old transfer) never draws the fee's tank (T131, D80, T393).
        for (const t of known) if (wayOf(t) !== 'own') expect(f.log.some((e) => e.txId === t.id && (e.moves.tanks?.[k.c.id] ?? 0) < 0), `${why}: ${wayOf(t)} ${t.date} z zbiornika`).toBe(false)
      }
    }
    expect(Math.min(...WAYS.map((w) => seen.get(w) ?? 0))).toBeGreaterThan(300)
    expect(tally.today).toBeGreaterThan(250)
    expect(tally.turns).toBeGreaterThan(400)
    expect(tally.early).toBeGreaterThan(350)
    expect(tally.payToday).toBeGreaterThan(200)
  })

  it('przegląd 2 N3: rachunek zmienny (F23) i płatności wpisane z wyprzedzeniem (T398) – 300 historii, silnik = Ładownia = kreator', () => {
    const tally: Tally = { today: 0, turns: 0, early: 0, payToday: 0 }
    let variable = 0
    let planned = 0
    let aheadDues = 0
    let wizard = 0
    for (let seed = 2001; seed <= 2300; seed++) {
      const k = caseOf(seed, { variable: true })
      if (k.c.variable) variable++
      const r = rng(seed + 5)
      for (const today of k.todays) {
        // The payments written ahead (B127): those of the next 0–45 days are in the folder already.
        const known = k.payments.filter((t) => t.date <= addDays(today, Math.floor(r() * 46)))
        const why = `${k.name} (z wyprzedzeniem), dziś ${today}`
        const f = fleetOf(k, known, today)
        const shown = cargoAt(k, known, today)
        checkShown(k, shown, why)
        checkToday(k, f, known, today, tally, why)
        checkTurn(k, f, known, today, tally, why)
        checkPayToday(k, known, today, tally, why)
        checkPayTodayRef(k, known, today, why)
        // A due a payment written ahead pays (T398): not paid before its day; once all of them came (this month's last
        // one), paid – as the engine has it then.
        const last = known.at(-1)
        for (const s of shown) {
          if (!s.planned) continue
          planned++
          expect(s.state, `${why}: zaplanowane ${s.due}`).not.toBe('paid')
          expect(s.planned.date > today, `${why}: zaplanowane ${s.due} na ${s.planned.date}`).toBe(true)
          if (!last || monthOf(last.date) !== monthOf(today)) continue
          const then = cargoAt(k, known, last.date)
          expect(then.some((x) => x.due === s.due && x.state !== 'paid'), `${why}: ${s.due} w dniu ${last.date}`).toBe(false)
          checkToday(k, fleetOf(k, known, last.date), known, last.date, tally, `${why} → ${last.date}`)
        }
        // The Radar and the briefing (T398, przegląd 3 N3 2): a due a payment written ahead pays – of any month of the
        // window – is no item (the balances ahead count that payment, once); the briefing's asteroid is the Radar's.
        const plannedNow = plannedDues({ containers: [k.c], transactions: known, today, start: k.start }).get(k.c.id)
        const payDays = new Map([[k.c.id, dayFor(k, known.filter((t) => t.date <= today), monthOf(today))]])
        const items = radar({ today, plans: [], containers: [k.c], tanks: f.tanks, loans: [], money: String, cargo: shown, payDays, planned: plannedNow ? new Map([[k.c.id, plannedNow]]) : undefined })
        for (const i of items) if (i.ref === k.c.id && (i.kind === 'fixed' || i.kind === 'asteroid')) expect(plannedNow?.has(monthOf(i.date)) ?? false, `${why}: Radar ${i.key}`).toBe(false)
        const brief = briefing({ fleet: f, containers: [k.c], imports: [], label: () => '', cargo: shown, payDays, planned: plannedNow ? new Map([[k.c.id, plannedNow]]) : undefined })
        for (const b of brief.filter((x) => x.kind === 'asteroid')) expect(b.key.split(':')[2], `${why}: odprawa = Radar`).toBe(items.filter((i) => i.kind === 'asteroid' && i.date >= today).map((i) => i.date).sort()[0])
        if (plannedNow) aheadDues += plannedNow.size
      }
      // The start wizard (T393, przegląd 2 N3 1): a fee of the hold at the start wants the installment the engine takes then.
      if (k.c.cycleMonths <= 1 || monthOf(k.c.createdAt) > monthOf(k.start) || k.c.from || !activeIn(k.c, monthOf(k.start))) continue
      const before = k.payments.filter((t) => t.date < k.start)
      const tank = fleetOf(k, before, k.start).tanks.find((t) => t.containerId === k.c.id)
      if (tank?.want == null) continue
      wizard++
      const days = startPaidDays(before, k.start, [k.c], [])
      const items = startTankItems([k.c], []).map((item) => ({ ...item, paid: days.get(item.key) ?? [] }))
      expect(startTanks(items, k.start, {})[0]!.installment, `${k.name}: kreator na starcie`).toBe(tank.want)
    }
    expect(variable).toBeGreaterThan(180)
    expect(planned).toBeGreaterThan(60)
    expect(aheadDues).toBeGreaterThan(planned)
    expect(wizard).toBeGreaterThan(120)
    expect(tally.today).toBeGreaterThan(350)
    expect(tally.turns).toBeGreaterThan(550)
    expect(tally.payToday).toBeGreaterThan(250)
  })
})

describe('integracja 2 N5: kreator (AP-25) = silnik na starcie – folder z płatnościami wpisanymi z wyprzedzeniem (T398)', () => {
  it('300 historii: rata zbiornika kreatora z operacjami całego folderu (jak WizardPage) = `want` silnika w dniu startu', () => {
    let wizard = 0
    let ahead = 0
    for (let seed = 3001; seed <= 3300; seed++) {
      const k = caseOf(seed, { variable: true })
      if (k.c.cycleMonths <= 1 || monthOf(k.c.createdAt) > monthOf(k.start) || k.c.from || !activeIn(k.c, monthOf(k.start))) continue
      // The folder at the start: the payments of the next 0–45 days are in it already (written ahead – B127, T398).
      const r = rng(seed + 11)
      const known = k.payments.filter((t) => t.date <= addDays(k.start, Math.floor(r() * 46)))
      const tank = fleetOf(k, known, k.start).tanks.find((t) => t.containerId === k.c.id)
      if (tank?.want == null) continue
      wizard++
      if (known.some((t) => t.date >= k.start)) ahead++
      // WizardPage gives the start all the folder's operations (`startPaidDays` reads the ones before its day).
      const days = startPaidDays(known, k.start, [k.c], [])
      const items = startTankItems([k.c], []).map((item) => ({ ...item, paid: days.get(item.key) ?? [] }))
      expect(startTanks(items, k.start, {})[0]!.installment, `${k.name}: kreator z płatnościami po starcie`).toBe(tank.want)
    }
    expect(wizard).toBeGreaterThan(120)
    expect(ahead).toBeGreaterThan(25)
  })
})
