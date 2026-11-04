import { describe, expect, it } from 'vitest'
import { cargoStatuses, dueIn, feeDuesOf, paymentDay, paymentsIndex, type CargoStatus } from '@shared/calc/cargoStatus'
import { addDays, addMonths, firstDayOf, monthOf } from '@shared/calc/dates'
import { activeIn, amountIn, computeFleet, cyclePosition, layersSum, sinkingInstallment, type FleetState } from '@shared/calc/fleet'
import { startPaidDays, startTankItems, startTanks } from '@shared/calc/start'
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

/**
 * „Zapłacone (dziś)” (T375): a payment today pays the due it is shown at (the oldest one it leaves paid); none shown – it
 * pays no due shown unpaid. The engine follows the state after it.
 */
function checkPayToday(k: Case, transactions: Transaction[], today: string, tally: Tally, why: string) {
  const shown = cargoAt(k, transactions, today)
  const target = shown.find((s) => s.payToday)
  const after = [...transactions, pay(k.c, today, target?.amount ?? amountIn(k.c, monthOf(today)))]
  const now = cargoAt(k, after, today)
  if (target) {
    tally.payToday++
    expect(target.state, `${why}: „Zapłacone” at a due paid`).not.toBe('paid')
    const paid = now.find((s) => s.due === target.due)
    expect(target.carried ? paid : paid?.state, `${why}: „Zapłacone” ${target.due}`).toBe(target.carried ? undefined : 'paid')
    // The late ones before it stay as they were.
    for (const s of shown) if (s.due < target.due && s.state !== 'paid') expect(now.some((x) => x.due === s.due && x.state !== 'paid'), `${why}: ${s.due} before ${target.due}`).toBe(true)
  } else for (const s of shown) if (s.state !== 'paid') expect(now.some((x) => x.due === s.due && x.state !== 'paid'), `${why}: ${s.due} paid, no „Zapłacone” shown`).toBe(true)
  const f = fleetOf(k, after, today)
  checkToday(k, f, after, today, tally, `${why} + zapłata dziś`)
}

/**
 * „Zapłacone (dziś)” as the full count gives it (przegląd 2 N3 3 – counted now only for a fee with a due still to pay):
 * the payment of today after the ones up to today, its due the oldest one it leaves paid.
 */
function checkPayTodayRef(k: Case, transactions: Transaction[], today: string, why: string) {
  const month = monthOf(today)
  const start = k.start <= today ? k.start : null
  const linked = (paymentsIndex(transactions).byContainer.get(k.c.id) ?? []).filter((p) => p.date <= today)
  const day = paymentDay(k.c, linked, month).day
  const f = { start, month }
  const now = feeDuesOf(k.c, linked, day, f).dues
  const after = feeDuesOf(k.c, [...linked, { id: '', date: today, amount: amountIn(k.c, month), accountId: '' }], day, f).dues
  const paidAfter = new Set(after.slice(0, -1).filter((d) => d.payments.length).map((d) => d.month))
  const ref = now.slice(0, -1).find((d) => !d.payments.length && paidAfter.has(d.month))?.month ?? null
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
        // A due a payment written ahead pays (T398): not paid before that day – on it paid, as the engine has it then.
        for (const s of shown) {
          if (!s.planned) continue
          planned++
          expect(s.state, `${why}: zaplanowane ${s.due}`).not.toBe('paid')
          expect(s.planned.date > today, `${why}: zaplanowane ${s.due} na ${s.planned.date}`).toBe(true)
          if (monthOf(s.planned.date) !== monthOf(today)) continue
          const then = cargoAt(k, known, s.planned.date)
          expect(then.some((x) => x.due === s.due && x.state !== 'paid'), `${why}: ${s.due} w dniu ${s.planned.date}`).toBe(false)
          checkToday(k, fleetOf(k, known, s.planned.date), known, s.planned.date, tally, `${why} → ${s.planned.date}`)
        }
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
    expect(wizard).toBeGreaterThan(120)
    expect(tally.today).toBeGreaterThan(350)
    expect(tally.turns).toBeGreaterThan(550)
    expect(tally.payToday).toBeGreaterThan(250)
  })
})
