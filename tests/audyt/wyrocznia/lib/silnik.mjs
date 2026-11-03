// Silnik warstw wyroczni (AU-9) – liczony od zera z wymagań (spec „Pieniądze”, „Plan miesiąca”, D11–D23, D80–D94,
// T24–T32, T45–T52, T63–T72, T105–T119, T128–T136, T173–T181, T219–T220, T272, T278–T286, T295, T304).
// Czysta funkcja rekordów: dzień po dniu od startu budżetu do dnia chwili; migawki końca każdego dnia dla gry.
import {
  addDays,
  addMonths,
  dayNum,
  dayOfMonth,
  daysInMonth,
  diffDays,
  fromWarsaw,
  monthDiff,
  monthOf,
  toWarsaw,
  warsawDayStart
} from './daty.mjs'
import { splitEvenly } from './kwoty.mjs'

export const HOUSE_MEMBER_ID = '01KDEFMEM00000000000000001'

// ------------------------------------------------------------------ pomocnicze: kategorie, części, koszty

export function categoryIndex(settings) {
  const cats = settings.categories ?? []
  const byId = new Map(cats.map((c) => [c.id, c]))
  const mainOf = (id) => {
    if (!id) return null
    const c = byId.get(id)
    if (!c) return undefined // nieznana kategoria
    return c.parentId ? c.parentId : c.id
  }
  const kindOf = (mainId) => {
    const c = byId.get(mainId)
    const v = c?.envelope
    return v === 'daily' ? 'daily' : v === 'planned' ? 'planned' : null
  }
  return { byId, mainOf, kindOf, name: (id) => byId.get(id)?.name ?? null }
}

/**
 * Części operacji (T105, T117, T156, T238): wydatek – linie paragonu (reszta bez linii = część bez kategorii);
 * wpływ – części innych osób z `splits`, reszta kwoty jest nadawcy (memberId operacji).
 */
export function partsOf(t) {
  const base = { containerId: null, goalId: null }
  if (t.kind === 'income') {
    // u2 (C11): części ponad kwotę wpływu ucinane po kolei (T117 incomeShares)
    let left = Math.max(0, t.amount)
    const parts = (t.splits ?? []).map((s) => {
      const amount = t.amount > 0 ? Math.max(0, Math.min(s.amount, left)) : s.amount
      if (t.amount > 0) left -= amount
      return { ...base, amount, memberId: s.memberId ?? null, advance: !!s.advance, inflowKind: s.inflowKind, split: true }
    })
    const rest = t.amount - parts.reduce((a, p) => a + p.amount, 0)
    if (rest !== 0 || !parts.length) parts.push({ ...base, amount: rest, memberId: t.memberId ?? null, advance: !!t.advance, inflowKind: t.inflowKind, split: false })
    return parts
  }
  if (t.splits?.length) {
    const parts = t.splits.map((s) => ({
      amount: s.amount,
      categoryId: s.categoryId ?? null,
      refundable: !!s.refundable,
      memberId: s.memberId ?? null,
      gift: !!s.gift,
      containerId: s.containerId ?? null,
      goalId: s.goalId ?? null
    }))
    const rest = t.amount - parts.reduce((a, p) => a + p.amount, 0)
    if (rest !== 0) parts.push({ amount: rest, categoryId: null, refundable: false, memberId: null, gift: false, containerId: null, goalId: null })
    return parts
  }
  return [{ amount: t.amount, categoryId: t.categoryId ?? null, refundable: !!t.refundable, memberId: t.memberId ?? null, gift: !!t.gift, containerId: null, goalId: null }]
}

/** Kolejność silnika (T105, T202): data, godzina (bez godziny pierwsza), utworzenie, id. */
export function opOrder(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  const ta = a.time ?? ''
  const tb = b.time ?? ''
  if (ta !== tb) return ta < tb ? -1 : 1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** Przelew w jednej operacji (T262): strony na swoich kontach i w swoich dniach. */
export function sidesOf(t) {
  const s = [{ accountId: t.accountId, amount: t.amount, date: t.date }]
  if (t.kind === 'transfer' && t.bothSides && t.counterAccountId) s.push({ accountId: t.counterAccountId, amount: -t.amount, date: t.counterDate ?? t.date })
  return s
}

// ------------------------------------------------------------------ historia: koszty netto i przychody (T27, T173, T119)

/**
 * Klasyfikacja własnej części wydatku. Zwraca rodzaj: 'cargo' (płatność kontenera), 'goal' (z pieniędzy celu),
 * 'daily' (koperta codzienna albo bez kategorii – T30), 'planned' (kategoria planowa), 'outside' (kategoria poza
 * kopertami).
 */
export function classifyOwn(t, p, ctx) {
  const contId = p.containerId ?? t.containerId ?? null
  if (contId && ctx.containers.has(contId)) return { kind: 'cargo', containerId: contId }
  const goalId = p.goalId ?? t.goalId ?? null
  if (goalId && ctx.goals.has(goalId)) return { kind: 'goal', goalId }
  const main = ctx.cats.mainOf(p.categoryId)
  if (main === null) return { kind: 'daily', main: null }
  if (main === undefined) return { kind: 'daily', main: null, unknownCategory: p.categoryId }
  const k = ctx.cats.kindOf(main)
  if (k === 'daily') return { kind: 'daily', main }
  if (k === 'planned') return { kind: 'planned', main }
  return { kind: 'outside', main }
}

/** Koszt netto operacji (spec „Koszty netto”, T24): wydatki własne bez części domowników i bez pieniędzy celów. */
export function costOf(t, ctx) {
  if (t.kind !== 'expense') return 0
  let c = 0
  for (const p of partsOf(t)) {
    if (p.refundable) continue
    const k = classifyOwn(t, p, ctx)
    if (k.kind === 'goal') continue
    if (ctx.excludeLoanInstallments && k.kind === 'cargo' && ctx.containers.get(k.containerId)?.loanId) continue
    c += -p.amount
  }
  return c
}

export function historyOf(input, ctx, today) {
  const ops = input.transactions
  const bankOps = ops.filter((t) => t.bank)
  let start
  if (bankOps.length) start = bankOps.reduce((a, t) => (t.date < a ? t.date : a), '9999-12-31')
  else {
    const cands = [
      ...input.balances.filter((b) => b.kind === 'opening').map((b) => b.date),
      ...ops.filter((t) => t.kind === 'expense' || t.kind === 'income').map((t) => t.date)
    ]
    start = cands.length ? cands.reduce((a, d) => (d < a ? d : a)) : null
  }
  const firstFull = start ? (dayOfMonth(start) === 1 ? monthOf(start) : addMonths(monthOf(start), 1)) : null
  const costs = new Map()
  const withOps = new Set()
  for (const t of ops) {
    if (t.date > today) continue
    const m = monthOf(t.date)
    withOps.add(m)
    const c = costOf(t, ctx)
    if (c) costs.set(m, (costs.get(m) ?? 0) + c)
  }
  /** Pełne miesiące przed m (bez luk), ostatnie n. */
  const fullBefore = (m, n = 12) => {
    if (!firstFull) return []
    const out = []
    for (let x = addMonths(m, -1); x >= firstFull && out.length < n; x = addMonths(x, -1)) if (withOps.has(x)) out.push(x)
    return out.reverse()
  }
  const assumed = input.settings.layers?.assumedCosts ?? null
  const avgCosts = (m) => {
    const ms = fullBefore(m)
    if (ms.length < 3) {
      if (assumed != null) return { value: assumed, months: ms, source: 'assumed' }
      if (!ms.length) return { value: null, months: ms, source: 'unknown' }
      // u2 (C7): T27 „przy mniej niż 3 pełnych miesiącach – assumedCosts, jeśli ustawione”; bez nich – średnia z dostępnych
      const s0 = ms.reduce((a, x) => a + (costs.get(x) ?? 0), 0)
      return { value: Math.round(s0 / ms.length), months: ms, sum: s0, source: 'history<3' }
    }
    const s = ms.reduce((a, x) => a + (costs.get(x) ?? 0), 0)
    return { value: Math.round(s / ms.length), months: ms, sum: s, source: 'history' }
  }
  return { start, firstFull, costs, withOps, fullBefore, avgCosts }
}

// ------------------------------------------------------------------ kontenery: masa, cykle, raty zbiorników

export function amountIn(c, m) {
  const past = [...(c.past ?? [])].sort((a, b) => (a.until < b.until ? -1 : 1))
  for (const p of past) if (m <= p.until) return p.amount
  return c.amount
}

/** Miesiąc pierwszy i ostatni, w którym kontener jest w ładowni (T136). */
export function lifeOf(c, budgetStartMonth) {
  const created = monthOf(toWarsaw(c.createdAt).date)
  const from = c.from ?? created
  let until = c.until ?? null
  if (c.archived) {
    if (!c.archivedAt) return { from, until: '0000-00', never: true } // archiwum sprzed 1.4.2 – nigdy (T136)
    const a = monthOf(toWarsaw(c.archivedAt).date)
    until = until && until < a ? until : a
  }
  return { from, until }
}

export const aliveIn = (c, m, bsm) => {
  const l = lifeOf(c, bsm)
  if (l.never) return false
  return m >= l.from && (l.until == null || m <= l.until)
}

/** Miesiące płatności opłaty okresowej w roku (harmonogram T286 albo cykl od dueMonth). */
export function isDueMonth(c, m) {
  if ((c.cycleMonths ?? 1) <= 1) return true
  if (c.schedule?.length) return c.schedule.includes(Number(m.slice(5, 7)))
  const k = monthDiff(c.dueMonth, m)
  return ((k % c.cycleMonths) + c.cycleMonths) % c.cycleMonths === 0
}

/** Cykl zawierający miesiąc m: { due, first, length, pos } (T29, T286). */
export function cycleOf(c, m) {
  let due = m
  let guard = 0
  while (!isDueMonth(c, due) && guard++ < 120) due = addMonths(due, 1)
  let prev = addMonths(due, -1)
  guard = 0
  while (!isDueMonth(c, prev) && guard++ < 120) prev = addMonths(prev, -1)
  const first = addMonths(prev, 1)
  const length = monthDiff(prev, due)
  return { due, first, length, pos: monthDiff(first, m) + 1 }
}

/** Plan raty k-tego miesiąca cyklu: kwota równo, reszta w ostatnim (T29: 11 × 103,33 + 103,37). */
export const planInstallment = (amount, length, pos) => splitEvenly(amount, length)[pos - 1]

/**
 * Rata zbiornika (T29): plan + równa część braku wobec planu (albo minus część nadwyżki), reszta w miesiącu terminu;
 * nigdy poniżej zera (Z5).
 */
export function tankInstallment(c, m, tank) {
  const cyc = cycleOf(c, m)
  const amount = amountIn(c, cyc.due)
  const plan = splitEvenly(amount, cyc.length)
  const plannedBefore = plan.slice(0, cyc.pos - 1).reduce((a, b) => a + b, 0)
  const diff = plannedBefore - tank
  const remaining = cyc.length - cyc.pos + 1
  let share
  if (remaining <= 1) share = diff
  else share = diff >= 0 ? Math.floor(diff / remaining) : -Math.floor(-diff / remaining)
  const nominal = plan[cyc.pos - 1]
  return { installment: Math.max(0, nominal + share), nominal, share, cycle: cyc, amount }
}

/** Waga miesięczna kontenera (masa ładunku, T286): miesięczny = kwota, okresowy = kwota × płatności w roku / 12. */
export function monthlyWeight(c, m) {
  const a = amountIn(c, m)
  const cyc = c.cycleMonths ?? 1
  if (cyc <= 1) return a
  const perYear = c.schedule?.length ? c.schedule.length : 12 / cyc
  return Math.floor((a * perYear) / 12) // u2 (C3): część miesięczna w groszach, w dół (T3)
}

// ------------------------------------------------------------------ cele (T128, T129, T272)

export function goalAt(g, tMs) {
  if (g.activeFrom && tMs < Date.parse(g.activeFrom)) return null
  const past = [...(g.past ?? [])].sort((a, b) => Date.parse(a.until) - Date.parse(b.until))
  for (const p of past) if (tMs < Date.parse(p.until)) return { priority: p.priority, target: p.target, archived: !!p.archived, deadline: p.deadline === undefined ? g.deadline : p.deadline }
  return { priority: g.priority ?? 1, target: g.target, archived: !!g.archived, deadline: g.deadline ?? null }
}

/** Rata celu do terminu (T272): brak po równo na miesiące do terminu (ten włącznie), reszta w miesiącu terminu. */
export function goalInstallment(gap, m, deadline) {
  if (!deadline || gap <= 0) return 0
  const n = monthDiff(m, deadline) + 1
  if (n <= 0) return 0
  return n === 1 ? gap : Math.floor(gap / n)
}

// ------------------------------------------------------------------ domownicy (D80, D81, D83, D91, D94; T105–T117, T157, T304)

/** Część zakupu finansowana przez osobę (kwota dodatnia). */
function memberPartOf(t, memberId) {
  if (t.kind !== 'expense') return 0
  let x = 0
  for (const p of partsOf(t)) if (p.refundable && (p.memberId ?? t.memberId) === memberId && p.amount < 0) x += -p.amount
  return x
}

class Household {
  constructor(settings, variant, startDate, txById = new Map()) {
    const hh = settings.household ?? {}
    this.txById = txById
    this.variant = variant
    this.assignFrom = hh.assignFrom === undefined ? undefined : hh.assignFrom // brak = jak przed 1.12.0
    this.members = new Map()
    for (const m of hh.members ?? []) this.members.set(m.id, this.fresh(m))
    this.firstId = (hh.members ?? [])[0]?.id ?? HOUSE_MEMBER_ID
    this.startDate = startDate
    this.notes = []
  }
  fresh(m) {
    return { id: m.id, name: m.name, deposit: 0, purchases: [], unassigned: 0, giftsFromShields: 0, repaidTotal: 0, inflowIncome: 0, earmarks: {}, events: [] }
  }
  get(id) {
    const key = id ?? this.firstId
    if (!this.members.has(key)) this.members.set(key, this.fresh({ id: key, name: `nieznany ${key}` }))
    return this.members.get(key)
  }
  owedNet(m) {
    return m.purchases.reduce((a, p) => a + p.remaining, 0) - m.unassigned
  }
  /** Zakup finansowany: najpierw zaliczka osoby, resztę pożyczają osłony (prezent – osłony płacą, nikt nie winien). */
  purchase(memberId, amount, gift, t) {
    const m = this.get(memberId)
    // D94 / T312: najpierw zarezerwowana na ten zakup zaliczka, potem wolne zaliczki (rezerwacje innych zakupów chronione)
    const earmarked = Math.min(Math.max(m.earmarks[t.id] ?? 0, 0), amount)
    if (earmarked > 0) {
      m.earmarks[t.id] -= earmarked
      m.deposit -= earmarked
    }
    const reservedOther = Object.values(m.earmarks).reduce((a, x) => a + Math.max(0, x), 0)
    const free = Math.max(0, m.deposit - reservedOther)
    const fromDep0 = Math.min(free, amount - earmarked)
    m.deposit -= fromDep0
    const fromDep = earmarked + fromDep0
    const rest = amount - fromDep
    if (gift) m.giftsFromShields += rest
    else if (rest > 0) m.purchases.push({ txId: t.id, date: t.date, amount: rest, full: amount, remaining: rest })
    m.events.push({ date: t.date, txId: t.id, type: gift ? 'prezent' : 'zakup', amount, fromDep, rest })
    return { fromDep, lent: gift ? 0 : rest, gift: gift ? rest : 0 }
  }
  /** Wpłata części osoby: wariant A (spec, D80 b, D91) – najpierw spłata; B (1.15.3) – wg `inflowKind`. */
  inflow(memberId, amount, advance, inflowKind, covers, t) {
    const m = this.get(memberId)
    let repay = 0
    let toDep = 0
    let income = 0
    const mode = this.variant === 'B' && (inflowKind === 'advance' || inflowKind === 'income') ? inflowKind : 'repay'
    // D94 (u2, C23): wskazane późniejsze zakupy tej osoby – rezerwacja (celowa zaliczka w depozycie, także przy advance: false)
    let reserved = 0
    if (mode === 'repay') {
      for (const id of covers ?? []) {
        const p = this.txById.get(id)
        if (!p || !(p.date > t.date || (p.date === t.date && (p.time ?? '') > (t.time ?? '')))) continue
        if (m.purchases.some((x) => x.txId === id)) continue
        const part = memberPartOf(p, m.id)
        const x = Math.min(amount - reserved, Math.max(0, part - (m.earmarks[id] ?? 0)))
        if (x <= 0) continue
        m.earmarks[id] = (m.earmarks[id] ?? 0) + x
        reserved += x
      }
      amount -= reserved
      m.deposit += reserved
    }
    if (mode === 'advance') toDep = amount
    else if (mode === 'income') income = amount
    else {
      repay = Math.min(amount, Math.max(0, this.owedNet(m)))
      let left = repay
      const coversAll = [...(t.coversOpening && (!t.coversOpeningMembers || t.coversOpeningMembers.includes(m.id)) ? [`opening:${m.id}`] : []), ...(covers ?? [])]
      for (const id of coversAll) {
        if (left <= 0) break
        const p = m.purchases.find((x) => x.txId === id && x.remaining > 0)
        if (!p) continue
        const x = Math.min(left, p.remaining)
        p.remaining -= x
        left -= x
      }
      const fifo = this.assignFrom === undefined || (this.assignFrom !== null && t.date < this.assignFrom)
      if (left > 0 && fifo) {
        for (const p of m.purchases) {
          if (left <= 0) break
          const x = Math.min(left, p.remaining)
          p.remaining -= x
          left -= x
        }
      }
      if (left > 0) m.unassigned += left
      const rest = amount - repay
      if (advance) toDep = rest
      else income = rest
    }
    m.deposit += toDep
    m.repaidTotal += repay
    m.inflowIncome += income
    this.repaidToday = (this.repaidToday ?? 0) + repay
    m.events.push({ date: t.date, txId: t.id, type: 'wpłata', amount: amount + reserved, repay, toDep: toDep + reserved, reserved, income, mode })
    return { repay, toDep: toDep + reserved, income, reserved }
  }
  /**
   * Dzień rozliczeń (T115, T116, T228): rejestr zeruje salda drugi raz – saldo osoby = jej `opening` (należność jako
   * otwarta pozycja `opening:<osoba>` z datą `opening.since`, zaliczka do depozytu). Zwraca zmianę depozytu.
   */
  resetAt(members, since) {
    const before = [...this.members.values()].reduce((a, m) => a + m.deposit, 0)
    for (const m of this.members.values()) {
      m.deposit = 0
      m.purchases = []
      m.unassigned = 0
    }
    for (const mm of members ?? []) {
      const m = this.get(mm.id)
      const o = mm.opening ?? {}
      const owed = Math.max(0, o.owed ?? 0)
      m.deposit = Math.max(0, o.deposit ?? 0)
      if (owed > 0) m.purchases.push({ txId: `opening:${mm.id}`, date: o.since ?? since, amount: owed, full: owed, remaining: owed, opening: true })
      if (owed > 0 || m.deposit > 0) m.events.push({ date: since, type: 'saldo na start rozliczeń', owed, deposit: m.deposit })
    }
    const after = [...this.members.values()].reduce((a, m) => a + m.deposit, 0)
    return after - before
  }
  /** Zwrot towaru z zakupu domownika (T105): jego pieniądze – spłata, reszta zaliczka. */
  productReturn(memberId, amount, t) {
    return this.inflow(memberId, amount, true, 'repay', t.covers ?? [], t)
  }
}

// ------------------------------------------------------------------ silnik

/**
 * @param input { settings, transactions, containers, goals, months, dockings, loans, balances, scheduled, imports }
 * @param opt { today: 'RRRR-MM-DD', household: 'A'|'B' }
 */
export function runFleet(input, opt) {
  const today = opt.today
  const variant = opt.household ?? 'A'
  const S0 = input.settings
  const cats = categoryIndex(S0)
  const containers = new Map(input.containers.map((c) => [c.id, c]))
  const goals = new Map(input.goals.map((g) => [g.id, g]))
  const ctx = { cats, containers, goals, excludeLoanInstallments: !!opt.excludeLoanInstallments }
  const notes = []
  const note = (s) => {
    if (!notes.includes(s)) notes.push(s)
  }

  // plany miesięcy (T46): miesiąc bez planu – ostatni wcześniejszy
  const plans = new Map(input.months.map((p) => [p.month, p]))
  const planMonths = [...plans.keys()].sort()
  const planFor = (m) => {
    if (plans.has(m)) return plans.get(m)
    let best = null
    for (const x of planMonths) if (x <= m) best = x
    return best ? plans.get(best) : null
  }
  const salaryOf = (m) => planFor(m)?.salary ?? null

  const hist = historyOf(input, ctx, today)
  const layers = { shieldSalaries: S0.layers?.shieldSalaries ?? 3, hullMonths: S0.layers?.hullMonths ?? 6 }
  const orders = {
    minShieldSalaries: S0.orders?.minShieldSalaries ?? 1,
    firewall: S0.orders?.firewall ?? true,
    quiet: S0.orders?.quietHours ?? { from: '23:00', to: '05:00' }
  }
  const shieldTarget = (m) => {
    const s = salaryOf(m)
    return s ? layers.shieldSalaries * s : null
  }
  const hullTarget = (m) => {
    const a = hist.avgCosts(m).value
    return a != null ? layers.hullMonths * a : null
  }
  const minShields = (m) => {
    const s = salaryOf(m)
    return s ? Math.min(orders.minShieldSalaries, layers.shieldSalaries) * s : null
  }

  // salda otwarcia (T25, T106): najpóźniejsze do dziś, z jednego dnia ostatnio edytowane
  const openings = new Map()
  for (const b of input.balances) {
    if (b.kind !== 'opening' || b.date > today) continue
    const prev = openings.get(b.accountId)
    if (!prev || b.date > prev.date || (b.date === prev.date && b.updatedAt > prev.updatedAt)) openings.set(b.accountId, b)
  }
  const budgetStart = S0.budget?.start ?? [...openings.values()].reduce((a, b) => (a == null || b.date < a ? b.date : a), null)
  if (!budgetStart) return { error: 'brak startu budżetu i sald otwarcia' }
  const bsm = monthOf(budgetStart)
  // R-12 (u1): konto budżetu bez salda otwarcia = suma operacji (saldo 0 od pierwszej operacji) – inaczej suma warstw ≠ salda
  for (const a of S0.accounts ?? []) {
    if (openings.has(a.id)) continue
    let first = null
    for (const t of input.transactions) for (const sd of sidesOf(t)) if (sd.accountId === a.id && (first == null || sd.date < first)) first = sd.date
    const date = first && first < budgetStart ? first : budgetStart
    openings.set(a.id, { accountId: a.id, date, amount: 0, kind: 'opening', virtual: true })
    if (first) note(`konto ${a.name} bez salda otwarcia – liczone jako suma operacji (saldo 0 od ${date}, u1 / R-12)`)
  }
  // dzień rozliczeń z domownikami (T115): brak = jeszcze nie wybrany (liczone od startu), null = od startu, data ≥ start
  const hhSet = S0.household ?? {}
  const householdSince = hhSet.since == null ? budgetStart : hhSet.since < budgetStart ? budgetStart : hhSet.since
  if (hhSet.since === undefined) note('household.since brak – liczone od startu budżetu (1.4.0 ustawiłaby dzień pierwszego otwarcia – T115)')

  // dokowania (T64): wcześniejsze liczy się
  const dockByTx = new Map()
  for (const d of [...input.dockings].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))) if (!dockByTx.has(d.transactionId)) dockByTx.set(d.transactionId, d)
  const loans = new Map(input.loans.map((l) => [l.id, l]))

  // operacje w biegu silnika: od startu i od salda otwarcia swojego konta, do dziś
  const accIds = new Set((S0.accounts ?? []).map((a) => a.id))
  const ops = [...input.transactions].sort(opOrder)
  const opsByDay = new Map()
  for (const t of ops) {
    const ds = new Set(sidesOf(t).map((s) => s.date))
    for (const x of ds) {
      if (!opsByDay.has(x)) opsByDay.set(x, [])
      opsByDay.get(x).push(t)
    }
  }
  const inRun = (accountId, date) => {
    const o = openings.get(accountId)
    if (!o) return false
    return date >= budgetStart && date >= o.date && date <= today
  }

  // ---------------------------------------------------------------- stan
  const st = {
    S: 0,
    E: 0,
    H: 0,
    X: 0, // rezerwa podatku (pula ICTTJ Podatek)
    L: 0, // łupy czekające na decyzję
    G: new Map([...goals.keys()].map((id) => [id, 0])),
    T: new Map(),
    debtPaid: new Map() // pożyczki
  }
  const hh = new Household(S0, variant, budgetStart, new Map(input.transactions.map((t) => [t.id, t])))
  const depSum = () => [...hh.members.values()].reduce((a, m) => a + m.deposit, 0)
  const sumG = () => [...st.G.values()].reduce((a, b) => a + b, 0)
  const sumT = () => [...st.T.values()].reduce((a, b) => a + b, 0)
  const layersSum = () => st.S + st.E + st.H + st.X + st.L + sumG() + sumT() + depSum()

  const balances = new Map() // saldo kont
  const months = new Map()
  const monthRec = (m) => {
    if (!months.has(m))
      months.set(m, {
        month: m,
        salaryPlan: salaryOf(m),
        salaryPaid: 0,
        salaryFromShields: 0,
        salaryFromHull: 0,
        salaryPartial: false,
        firstMonthReduction: 0,
        tanks: {},
        tankDetails: {},
        goalRates: {},
        lootNextIn: 0,
        energyStart: 0,
        spentEnergy: 0, // wydatki z energii po zwrotach
        overflow: 0, // to, co po wyczerpaniu energii zapłaciły osłony / kadłub
        tankShortFromEnergy: 0,
        dailySpent: 0,
        plannedSpent: {},
        outsideSpent: {},
        cargoSpent: 0,
        costs: 0,
        lootEnd: null,
        alarms: []
      })
    return months.get(m)
  }
  const days = new Map()
  const log = []
  const loot = new Map() // miesiąc → { amount, decided, toShields, at }
  const loansState = new Map(input.loans.map((l) => [l.id, { paid: 0, lent: 0, received: 0, extraIncome: 0, payments: [] }]))
  const deliveries = []
  const hullTargetAt = new Map()

  // ---------------------------------------------------------------- przepływy
  const paidCycles = new Map()
  const trackFrom = (c) => {
    const f = c.from ?? monthOf(toWarsaw(c.createdAt).date)
    return f > bsm ? f : bsm
  }
  const prevDueOf = (c, m) => {
    let x = addMonths(m, -1)
    let guard = 0
    while (!isDueMonth(c, x) && guard++ < 120) x = addMonths(x, -1)
    return x
  }
  const cycleClosed = (c, due) => !!paidCycles.get(c.id)?.has(due) || due < trackFrom(c)
  const closeCycleFor = (c, date) => {
    const X = monthOf(date)
    let due
    if (isDueMonth(c, X)) due = X
    else if ((c.cycleMonths ?? 1) >= 3 && isDueMonth(c, addMonths(X, 1))) due = cycleClosed(c, prevDueOf(c, addMonths(X, 1))) ? addMonths(X, 1) : prevDueOf(c, addMonths(X, 1))
    else due = prevDueOf(c, X)
    if (!paidCycles.has(c.id)) paidCycles.set(c.id, new Set())
    paidCycles.get(c.id).add(due)
    return due
  }
  const takeChain = (x) => {
    const fromS = Math.min(x, Math.max(st.S, 0))
    st.S -= fromS
    let rest = x - fromS
    const fromH = Math.min(rest, Math.max(st.H, 0))
    st.H -= fromH
    rest -= fromH
    if (rest > 0) st.S -= rest // deficyt: osłony poniżej zera (T32)
    return { fromS, fromH, deficit: rest }
  }
  const spendEnergy = (x, rec) => {
    if (x < 0) {
      st.E += -x // zwrot towaru wraca do energii (Z4)
      rec.spentEnergy += x
      return { fromE: x, chain: null }
    }
    const fromE = Math.min(x, Math.max(st.E, 0))
    st.E -= fromE
    rec.spentEnergy += fromE
    const rest = x - fromE
    let chain = null
    if (rest > 0) {
      chain = takeChain(rest)
      rec.overflow += rest
      rec.alarms.push('energia wyczerpana')
    }
    return { fromE, chain }
  }

  const goalsActiveAt = (tMs, poolGoals) => {
    const list = []
    for (const g of goals.values()) {
      const s = goalAt(g, tMs)
      if (!s || s.archived || !(s.target > 0)) continue
      list.push({ g, s })
    }
    list.sort((a, b) => (poolGoals ? (a.g.source === 'ictj' ? 0 : 1) - (b.g.source === 'ictj' ? 0 : 1) : 0) || a.s.priority - b.s.priority || (a.g.id < b.g.id ? -1 : 1))
    return list
  }

  /** Dostawa w kolejności D13 (T26). */
  const dock = (A, date, cameInMs, info) => {
    const m = monthOf(date)
    const sT = shieldTarget(m)
    const hT = hullTarget(m)
    const out = { amount: A, date, toShields: 0, toHull: 0, toGoals: {}, free: 0, shieldTarget: sT, hullTarget: hT, ...info }
    let rest = A
    if (sT == null) {
      st.S += rest
      out.toShields += rest
      out.reason = 'cel osłon nieznany'
      return out
    }
    const toS = Math.min(rest, Math.max(0, sT - st.S))
    st.S += toS
    out.toShields += toS
    rest -= toS
    if (hT == null) {
      st.S += rest
      out.toShields += rest
      out.reason = 'cel kadłuba nieznany (mniej niż 3 pełne miesiące, bez kosztów przyjętych)'
      return out
    }
    const toH = Math.min(rest, Math.max(0, hT - st.H))
    st.H += toH
    out.toHull += toH
    rest -= toH
    for (const { g, s } of goalsActiveAt(cameInMs, false)) {
      if (rest <= 0) break
      const need = Math.max(0, s.target - st.G.get(g.id))
      const x = Math.min(rest, need)
      if (x > 0) {
        st.G.set(g.id, st.G.get(g.id) + x)
        out.toGoals[g.id] = x
        rest -= x
      }
    }
    st.S += rest
    out.toShields += rest
    out.free = rest
    return out
  }
  /** Pula Cele (D72, T65): najpierw cele ICTTJ, potem własne, wg priorytetów; nadmiar do osłon. */
  const dockGoalsPool = (A, date, cameInMs, info) => {
    const out = { amount: A, date, toShields: 0, toHull: 0, toGoals: {}, pool: 'goals', ...info }
    let rest = A
    const entryMonth = info.entryMonth ?? monthOf(date)
    const list = []
    for (const g of goals.values()) {
      const s = goalAt(g, cameInMs)
      if (!s || s.archived) continue
      const noAmount = g.source === 'ictj' && g.ictj && g.ictj.amount == null && (g.ictj.currency ?? 'PLN') === 'PLN'
      if (!(s.target > 0) && !noAmount) continue
      list.push({ g, s, noAmount })
    }
    list.sort((a, b) => (a.g.source === 'ictj' ? 0 : 1) - (b.g.source === 'ictj' ? 0 : 1) || a.s.priority - b.s.priority || (a.g.id < b.g.id ? -1 : 1))
    for (const { g, s, noAmount } of list) {
      if (rest <= 0) break
      if (noAmount) {
        if ((s.deadline ?? g.deadline) !== entryMonth) continue
        st.G.set(g.id, (st.G.get(g.id) ?? 0) + rest)
        out.toGoals[g.id] = rest
        rest = 0
        break
      }
      const need = Math.max(0, s.target - st.G.get(g.id))
      const x = Math.min(rest, need)
      if (x > 0) {
        st.G.set(g.id, st.G.get(g.id) + x)
        out.toGoals[g.id] = x
        rest -= x
      }
    }
    st.S += rest
    out.toShields += rest
    return out
  }
  const cameInOf = (t) => {
    const d = dockByTx.get(t.id)
    const c = Date.parse(d ? d.createdAt : t.createdAt)
    return Math.max(c, warsawDayStart(t.date))
  }

  // ---------------------------------------------------------------- dzień po dniu
  let curMonth = null
  let dayCtx = null
  const newDay = (d) => ({
    date: d,
    dailySpent: 0,
    plannedDay: {},
    decisionsSH: 0,
    firewall: [],
    night: [],
    judas: [],
    turtle: [],
    householdLent: 0,
    costs: 0,
    timed: [],
    events: []
  })
  const dailyBefore = new Map() // miesiąc → wydane codzienne do końca poprzedniego dnia
  const plannedCum = new Map() // miesiąc → kategoria → wydane

  const salaryEvent = (m, d, first) => {
    const rec = monthRec(m)
    const plan = planFor(m)
    let P = plan?.salary ?? 0
    if (!plan) note(`miesiąc ${m} bez planu – bez pensji (T28: wydatki prosto z osłon)`)
    if (first && dayOfMonth(d) !== 1) {
      // T45, T220: pierwszy miesiąc – pensja minus koszty netto dni przed startem (bez opłat okresowych i kontenerów)
      let pre = 0
      for (const t of ops) {
        if (t.date < `${m}-01` || t.date >= d || t.kind !== 'expense') continue
        for (const p of partsOf(t)) {
          if (p.refundable) continue
          const k = classifyOwn(t, p, ctx)
          if (k.kind === 'goal' || k.kind === 'cargo') continue
          pre += -p.amount
        }
      }
      pre = Math.max(0, pre)
      rec.firstMonthReduction = pre
      P = Math.max(0, P - pre)
      // T45 „dzienny przydział liczy cały miesiąc”; koperty planowe też od 1. dnia miesiąca (u1, R-2 / R-3)
      let preDaily = 0
      const pc = plannedCum.get(m) ?? new Map()
      const plan0 = planFor(m)
      for (const t of ops) {
        if (t.date < `${m}-01` || t.date >= d || t.kind !== 'expense') continue
        for (const p of partsOf(t)) {
          if (p.refundable) continue
          const k = classifyOwn(t, p, ctx)
          const cost = -p.amount
          if (k.kind === 'daily') preDaily += cost
          else if (k.kind === 'planned' && plan0 && Object.prototype.hasOwnProperty.call(plan0.envelopes ?? {}, k.main)) {
            pc.set(k.main, (pc.get(k.main) ?? 0) + cost)
            rec.plannedSpent[k.main] = (rec.plannedSpent[k.main] ?? 0) + cost
          }
        }
      }
      plannedCum.set(m, pc)
      dailyBefore.set(m, (dailyBefore.get(m) ?? 0) + preDaily)
      rec.dailySpent += preDaily
      rec.preStartDaily = preDaily
    }
    // osłony – rezerwa przed pensją do warunku rat celów (T272)
    const sT = shieldTarget(m)
    const hT = hullTarget(m)
    const fullBefore = sT != null && hT != null && st.S >= sT && st.H >= hT
    let fromS = Math.min(P, Math.max(st.S, 0))
    st.S -= fromS
    let need = P - fromS
    const fromH = Math.min(need, Math.max(st.H, 0))
    st.H -= fromH
    need -= fromH
    const paid = fromS + fromH
    st.E += paid
    rec.salaryPaid = paid
    rec.salaryFromShields = fromS
    rec.salaryFromHull = fromH
    rec.salaryPartial = need > 0
    if (fromH > 0) rec.alarms.push('pensja z kadłuba (żółty)')
    if (need > 0) rec.alarms.push('pensja częściowa (czerwony)')
    log.push({ date: d, type: 'pensja', amount: paid, fromS, fromH, missing: need })
    // odkładki (T29) – z energii
    let tanks = 0
    for (const c of containers.values()) {
      if ((c.cycleMonths ?? 1) <= 1 || !aliveIn(c, m, bsm)) continue
      const tank = st.T.get(c.id) ?? 0
      const cyc0 = cycleOf(c, m)
      if (paidCycles.get(c.id)?.has(cyc0.due)) {
        // u2 (C2): cykl już zapłacony (T135) – bez rat, zbiornik zbiera na następny
        rec.tanks[c.id] = 0
        rec.tankDetails[c.id] = { nominal: 0, share: 0, installment: 0, due: cyc0.due, pos: cyc0.pos, length: cyc0.length, paidCycle: true }
        continue
      }
      const ti = tankInstallment(c, m, tank)
      const x = Math.min(ti.installment, Math.max(st.E, 0))
      st.E -= x
      st.T.set(c.id, tank + x)
      rec.tanks[c.id] = x
      rec.tankDetails[c.id] = { nominal: ti.nominal, share: ti.share, installment: ti.installment, due: ti.cycle.due, pos: ti.cycle.pos, length: ti.cycle.length }
      tanks += x
      log.push({ date: d, type: 'zbiornik', containerId: c.id, amount: x })
    }
    // raty celów (T272): tylko przy pełnych osłonach i kadłubie przed pensją
    let rates = 0
    if (fullBefore) {
      const nowMs = warsawDayStart(d)
      const cands = goalsActiveAt(nowMs, false).filter(({ g }) => (g.rates ?? []).some((r) => r.from <= m && (r.until == null || m <= r.until)))
      for (const { g, s } of cands) {
        const gap = Math.max(0, s.target - st.G.get(g.id))
        const r = goalInstallment(gap, m, s.deadline)
        const x = Math.min(r, Math.max(st.E, 0))
        if (x <= 0) continue
        st.E -= x
        st.G.set(g.id, st.G.get(g.id) + x)
        rec.goalRates[g.id] = x
        rates += x
        log.push({ date: d, type: 'rata celu', goalId: g.id, amount: x, planned: r })
      }
    }
    rec.ratesCondition = { fullBefore, shieldsBefore: st.S + fromS, hullBefore: st.H + fromH, shieldTarget: sT, hullTarget: hT }
    rec.energyStart = paid - tanks - rates
  }

  const householdEvent = (d) => {
    if (d !== householdSince) return
    const diff = hh.resetAt(hhSet.members, d)
    if (diff > 0) st.S -= diff // T116: brakujące bierze z osłon
    else if (diff < 0) st.S += -diff // to, co depozyt trzymał wcześniej, wraca do osłon
    log.push({ date: d, type: 'saldo na start rozliczeń (T116)', depositChange: diff })
  }
  const monthEnd = (m) => {
    const rec = monthRec(m)
    rec.lootEnd = st.E
    rec.energyLeft = st.E
    loot.set(m, { amount: st.E, decided: false })
    st.L += st.E
    log.push({ date: `${m}-end`, type: 'łupy', amount: st.E })
    st.E = 0
  }

  const applyLootDecision = (m, d) => {
    const l = loot.get(m)
    if (!l || l.decided) return
    const plan = plans.get(m)
    const dec = plan?.loot
    const nm = addMonths(m, 1)
    if (dec) {
      let left = l.amount
      const goalsPart = {}
      for (const [gid, x0] of Object.entries(dec.goals ?? {})) {
        const x = Math.min(x0, left)
        if (x > 0 && st.G.has(gid)) {
          st.G.set(gid, st.G.get(gid) + x)
          goalsPart[gid] = x
          left -= x
        }
      }
      let envX = 0
      for (const [cid, x0] of Object.entries(dec.envelopes ?? {})) {
        const x = Math.min(x0, left)
        envX += x
        left -= x
        const rec = monthRec(nm)
        rec.envelopeExtra = rec.envelopeExtra ?? {}
        rec.envelopeExtra[cid] = (rec.envelopeExtra[cid] ?? 0) + x
      }
      const nx = Math.min(dec.nextMonth ?? 0, left)
      left -= nx
      st.E += envX + nx
      monthRec(nm).lootNextIn += nx
      st.S += left
      st.L -= l.amount
      l.decided = true
      l.split = { goals: goalsPart, envelopes: envX, nextMonth: nx, shields: left, at: d }
      log.push({ date: d, type: 'łupy – decyzja', month: m, ...l.split })
    } else {
      st.S += l.amount
      st.L -= l.amount
      l.decided = true
      l.split = { goals: {}, envelopes: 0, nextMonth: 0, shields: l.amount, at: d, default: true }
      log.push({ date: d, type: 'łupy → osłony (bez decyzji, 8. dnia)', month: m, amount: l.amount })
    }
  }

  // ---------------------------------------------------------------- operacja
  const applyOp = (t, rec, d) => {
    const sides = sidesOf(t).filter((s) => accIds.has(s.accountId))
    if (sides.length < sidesOf(t).length) note(`operacja ${t.id} ma stronę na koncie spoza ustawień – ta strona pominięta`)
    const run = sides.filter((s) => s.date === d && inRun(s.accountId, s.date))
    for (const s of run) balances.set(s.accountId, (balances.get(s.accountId) ?? 0) + s.amount)
    if (!run.length) return
    // przelew: strony się znoszą (T31, T262); strona poza biegiem – ruch osłon
    if (t.kind === 'transfer') {
      // T31, T262: strony w biegu się znoszą; każda strona liczona w swoim dniu jako ruch osłon (suma warstw = salda)
      const amt = run.reduce((a, s) => a + s.amount, 0)
      if (amt > 0) st.S += amt
      else if (amt < 0) takeChain(-amt)
      if (!(t.bothSides && t.counterAccountId)) dayCtx.decisionsSH += amt
      return
    }
    if (t.kind === 'correction') {
      if (t.amount >= 0) st.S += t.amount
      else takeChain(-t.amount)
      return
    }
    if (t.kind === 'tax') {
      if (t.amount < 0) {
        const x = -t.amount
        const fromX = Math.min(x, Math.max(st.X, 0))
        st.X -= fromX
        if (x - fromX > 0) {
          takeChain(x - fromX)
          note(`PIT-38 ${t.date}: brak w rezerwie podatku ${x - fromX} gr – wzięte z osłon (Z)`)
        }
      } else st.X += t.amount
      return
    }
    if (t.kind === 'loan') {
      const loan = t.loanId ? loans.get(t.loanId) : null
      const ls = loan ? loansState.get(loan.id) : null
      if (loan && loan.direction === 'given') {
        if (t.amount < 0) {
          takeChain(-t.amount)
          ls.lent += -t.amount
          dayCtx.decisionsSH += t.amount
        } else {
          const due = Math.max(0, loan.amount - ls.received)
          const back = Math.min(t.amount, due)
          ls.received += back
          ls.payments.push({ date: t.date, amount: t.amount })
          st.S += back
          dayCtx.decisionsSH += back
          if (t.amount - back > 0) {
            ls.extraIncome += t.amount - back
            const o = dock(t.amount - back, t.date, cameInOf(t), { txId: t.id, source: 'nadwyżka spłaty pożyczki' })
            deliveries.push(o)
            dayCtx.decisionsSH += o.toShields + o.toHull
          }
        }
      } else if (loan && loan.direction === 'taken') {
        if (t.amount > 0) {
          st.S += t.amount
          ls.received += t.amount
        }
        else {
          takeChain(-t.amount)
          ls.paid += -t.amount
          ls.payments.push({ date: t.date, amount: -t.amount })
        }
      } else {
        // T174: pożyczka bez rekordu – tylko osłony
        if (t.amount >= 0) st.S += t.amount
        else takeChain(-t.amount)
        dayCtx.decisionsSH += t.amount
      }
      return
    }
    if (t.kind === 'trading') {
      const dk = dockByTx.get(t.id)
      if (t.amount > 0) {
        if (dk?.pool === 'tax' && !dk?.split) {
          st.X += t.amount
          deliveries.push({ amount: t.amount, date: t.date, txId: t.id, pool: 'tax', toTax: t.amount, toShields: 0, toHull: 0, toGoals: {} })
          return
        }
        if (dk?.split) {
          note(`dokowanie z ręcznym podziałem (${t.id}) – liczone według zapisanego podziału dopasowanego do kwoty (T176)`)
          const sp = dk.split
          let rest = t.amount
          const tax = Math.min(sp.taxHold ?? 0, rest)
          st.X += tax
          rest -= tax
          const hullX = Math.min(sp.hull ?? 0, rest)
          st.H += hullX
          rest -= hullX
          const g = {}
          for (const [gid, x0] of Object.entries(sp.goals ?? {})) {
            const x = Math.min(x0, rest)
            if (x > 0 && st.G.has(gid) && !goals.get(gid)?.archived) {
              st.G.set(gid, st.G.get(gid) + x)
              g[gid] = x
              rest -= x
            }
          }
          st.S += rest
          deliveries.push({ amount: t.amount, date: t.date, txId: t.id, pool: dk.pool, split: true, toTax: tax, toHull: hullX, toGoals: g, toShields: rest })
          dayCtx.decisionsSH += rest + hullX
          return
        }
        const o = dk?.pool === 'goals' ? dockGoalsPool(t.amount, t.date, cameInOf(t), { txId: t.id, entryMonth: monthOf(dk.entryDate ?? t.date) }) : dock(t.amount, t.date, cameInOf(t), { txId: t.id, pool: dk?.pool ?? null })
        o.docked = !!dk
        deliveries.push(o)
        dayCtx.decisionsSH += o.toShields + o.toHull
        return
      }
      // dopłata do XTB (zwrot do masy) – z osłon; firewall (D23, T31)
      const x = -t.amount
      if (dk?.pool === 'tax') {
        const fromX = Math.min(x, Math.max(st.X, 0))
        st.X -= fromX
        if (x > fromX) takeChain(x - fromX)
        return
      }
      takeChain(x)
      dayCtx.decisionsSH -= x
      const m = monthOf(t.date)
      const sT = shieldTarget(m)
      const hT = hullTarget(m)
      const alarm = orders.firewall && (sT == null || hT == null || st.S < sT || st.H < hT)
      if (alarm) {
        dayCtx.firewall.push({ txId: t.id, amount: x, shieldsAfter: st.S, shieldTarget: sT, hull: st.H, hullTarget: hT })
        rec.alarms.push(`firewall ${t.date}`)
      }
      return
    }
    if (t.kind === 'income') {
      for (const p of partsOf(t)) {
        if (p.amount === 0) continue
        const isMember = p.memberId != null || (p.split === false && t.memberId != null)
        if (isMember && p.amount > 0) {
          const r = hh.inflow(p.memberId ?? t.memberId, p.amount, p.advance, p.inflowKind, t.covers, t)
          st.S += r.repay
          if (r.income > 0) {
            const o = dock(r.income, t.date, cameInOf(t), { txId: t.id, source: 'przychód od domownika' })
            deliveries.push(o)
            dayCtx.decisionsSH += o.toShields + o.toHull
          }
          // spłata należności domownika nie jest decyzją zabierającą z osłon
          continue
        }
        if (p.amount > 0) {
          const o = dock(p.amount, t.date, cameInOf(t), { txId: t.id })
          deliveries.push(o)
          dayCtx.decisionsSH += o.toShields + o.toHull
        } else {
          takeChain(-p.amount)
          dayCtx.decisionsSH += p.amount
        }
      }
      return
    }
    if (t.kind === 'expense') {
      const m = monthOf(t.date)
      for (const p of partsOf(t)) {
        if (p.amount === 0) continue
        if (p.refundable) {
          const mid = p.memberId ?? t.memberId ?? null
          const gift = p.gift || (!t.splits?.length && t.gift)
          if (p.amount < 0) {
            const r = hh.purchase(mid, -p.amount, gift, t)
            if (r.lent + r.gift > 0) takeChain(r.lent + r.gift)
            dayCtx.householdLent += r.lent + r.gift
          } else {
            // zwrot towaru z zakupu domownika – jego pieniądze (T105)
            const r = hh.productReturn(mid, p.amount, t)
            st.S += r.repay
            if (r.income > 0) st.S += r.income
          }
          continue
        }
        const k = classifyOwn(t, p, ctx)
        if (k.unknownCategory) note(`nieznana kategoria ${k.unknownCategory} – liczona jak bez kategorii (codzienna)`)
        const cost = -p.amount
        rec.costs += cost
        if (k.kind !== 'goal') {
          dayCtx.costs += cost
          if (t.time && cost > 0) dayCtx.timed.push({ time: t.time, amount: cost })
        }
        if (k.kind === 'goal') {
          const gid = k.goalId
          if (cost > 0) {
            const fromG = Math.min(cost, Math.max(st.G.get(gid) ?? 0, 0))
            st.G.set(gid, (st.G.get(gid) ?? 0) - fromG)
            if (cost > fromG) takeChain(cost - fromG)
          } else st.G.set(gid, (st.G.get(gid) ?? 0) - cost)
          continue
        }
        if (k.kind === 'cargo') {
          const c = containers.get(k.containerId)
          rec.cargoSpent += cost
          if ((c.cycleMonths ?? 1) > 1 && cost > 0) {
            const closed = closeCycleFor(c, t.date)
            log.push({ date: t.date, type: 'cykl zamknięty', containerId: c.id, due: closed })
            const tank = st.T.get(c.id) ?? 0
            const fromT = Math.min(cost, Math.max(tank, 0))
            st.T.set(c.id, tank - fromT)
            const rest = cost - fromT
            if (rest > 0) {
              rec.tankShortFromEnergy += rest
              rec.alarms.push(`brak w zbiorniku ${c.name} ${t.date}: ${rest}`)
              const r = spendEnergy(rest, rec)
              if (r.chain) dayCtx.decisionsSH -= r.chain.fromS + r.chain.fromH + r.chain.deficit
            }
            log.push({ date: t.date, type: 'płatność ze zbiornika', containerId: c.id, amount: cost, fromTank: fromT, fromEnergy: rest })
          } else {
            const r = spendEnergy(cost, rec)
            const ownInstallment = !!c.loanId
            if (c.loanId && loansState.has(c.loanId)) {
              const ls = loansState.get(c.loanId)
              ls.paid += cost
              ls.payments.push({ date: t.date, amount: cost, txId: t.id, viaContainer: true })
            }
            if (r.chain && !ownInstallment) dayCtx.decisionsSH -= r.chain.fromS + r.chain.fromH + r.chain.deficit
          }
          continue
        }
        const r = spendEnergy(cost, rec)
        if (r.chain) dayCtx.decisionsSH -= r.chain.fromS + r.chain.fromH + r.chain.deficit
        if (k.kind === 'daily') {
          dayCtx.dailySpent += cost
          rec.dailySpent += cost
        } else if (k.kind === 'planned') {
          const plan = planFor(m)
          const hasEnv = plan && Object.prototype.hasOwnProperty.call(plan.envelopes ?? {}, k.main)
          if (hasEnv) {
            rec.plannedSpent[k.main] = (rec.plannedSpent[k.main] ?? 0) + cost
            dayCtx.plannedDay[k.main] = (dayCtx.plannedDay[k.main] ?? 0) + cost
            const pc = plannedCum.get(m) ?? new Map()
            pc.set(k.main, (pc.get(k.main) ?? 0) + cost)
            plannedCum.set(m, pc)
          } else rec.outsideSpent[k.main] = (rec.outsideSpent[k.main] ?? 0) + cost
        } else rec.outsideSpent[k.main ?? 'brak'] = (rec.outsideSpent[k.main ?? 'brak'] ?? 0) + cost
        // gra: zakup nocny potwierdzony (T187), impuls (Judas), zwrot (Turtle)
        if (cost > 0 && t.time && inQuiet(t.time, orders.quiet) && (t.logNote ?? '').trim()) dayCtx.night.push({ txId: t.id, time: t.time, amount: cost, impulse: t.impulse, container: false, logNote: t.logNote })
        if (cost > 0 && t.impulse === 'impulse') dayCtx.judas.push({ txId: t.id, amount: cost })
        if (cost < 0) dayCtx.turtle.push({ txId: t.id, amount: -cost })
      }
      return
    }
    note(`nieznany rodzaj operacji ${t.kind} (${t.id}) – pominięta w warstwach`)
  }

  // ---------------------------------------------------------------- start
  const startMoney = (() => {
    let total = 0
    for (const [acc, o] of openings) {
      if (o.date > budgetStart) continue
      let b = o.amount
      for (const t of ops) for (const s of sidesOf(t)) if (s.accountId === acc && s.date >= o.date && s.date < budgetStart) b += s.amount
      balances.set(acc, b)
      total += b
    }
    return total
  })()
  const init = S0.budget?.initial ?? null

  const goalTransfers = []
  for (const g of goals.values()) for (const tr of g.transfers ?? []) goalTransfers.push({ g, tr, day: toWarsaw(tr.at).date })

  let snapshot = null
  for (let d = budgetStart; d <= today; d = addDays(d, 1)) {
    const m = monthOf(d)
    dayCtx = newDay(d)
    hh.repaidToday = 0
    const rec = monthRec(m)
    if (d === budgetStart) {
      // podział środków na starcie (kreator, krok 5): kadłub i cele z zapisu, reszta w osłonach
      if (init) {
        st.H = init.hull ?? 0
        for (const [gid, x] of Object.entries(init.goals ?? {})) if (st.G.has(gid)) st.G.set(gid, (st.G.get(gid) ?? 0) + x)
        for (const [cid, x] of Object.entries(init.tanks ?? {})) st.T.set(cid, x)
        st.S = startMoney - st.H - sumG() - sumT()
        log.push({ date: d, type: 'start', money: startMoney, shields: st.S, hull: st.H, goals: Object.fromEntries(st.G), tanks: Object.fromEntries(st.T) })
      } else {
        st.S = startMoney
        log.push({ date: d, type: 'start (bez podziału – wszystko w osłonach, T26)', money: startMoney })
        note('budget.initial = null – środki startu liczone w osłonach (kolejność dokowania przy starcie nieodtworzona)')
      }
      curMonth = m
      householdEvent(d)
      salaryEvent(m, d, true)
    } else {
      // konto otwarte po starcie – do osłon w dniu otwarcia, przed pensją (T25, T177)
      for (const [acc, o] of openings) {
        if (o.date === d && d > budgetStart) {
          st.S += o.amount
          balances.set(acc, o.amount)
          log.push({ date: d, type: 'konto otwarte po starcie', accountId: acc, amount: o.amount })
        }
      }
      householdEvent(d)
      if (m !== curMonth) {
        monthEnd(curMonth)
        curMonth = m
        salaryEvent(m, d, false)
      }
    }
    // łupy: decyzje w swojej chwili, bez decyzji 8. dnia do osłon (T28, T52)
    for (const [lm, l] of loot) {
      if (l.decided) continue
      const dec = plans.get(lm)?.loot
      const decDay = dec ? toWarsaw(dec.decidedAt).date : null
      if (decDay && decDay > `${addMonths(lm, 1)}-07`) note(`łupy ${lm}: decyzja po 7. dniu (${decDay}) – N-PC-16, liczona w dniu decyzji (Z)`)
      if (decDay && decDay <= d) applyLootDecision(lm, d)
      else if (!dec && d >= `${addMonths(lm, 1)}-08`) applyLootDecision(lm, d)
    }
    for (const t of opsByDay.get(d) ?? []) applyOp(t, rec, d)
    // koniec dnia: przeniesienia środków celów (T129) i resztki zbiorników po końcu życia (T136)
    for (const { g, tr, day } of goalTransfers) {
      if (day !== d) continue
      const have = Math.max(0, st.G.get(g.id) ?? 0)
      const x = Math.min(tr.amount, have)
      st.G.set(g.id, have - x)
      if (tr.to === 'shields') st.S += x
      else if (st.G.has(tr.to)) st.G.set(tr.to, st.G.get(tr.to) + x)
      log.push({ date: d, type: 'przeniesienie środków celu', goalId: g.id, to: tr.to, requested: tr.amount, moved: x })
    }
    if (d === addDays(`${addMonths(m, 1)}-01`, -1)) {
      for (const c of containers.values()) {
        if ((c.cycleMonths ?? 1) <= 1) continue
        const l = lifeOf(c, bsm)
        if (l.until === m && (st.T.get(c.id) ?? 0) !== 0) {
          st.S += st.T.get(c.id)
          log.push({ date: d, type: 'resztka zbiornika do osłon', containerId: c.id, amount: st.T.get(c.id) })
          st.T.set(c.id, 0)
        }
      }
    }
    // migawka końca dnia
    const prevDaily = dailyBefore.get(m) ?? 0
    const pool = dailyPool(m, warsawDayStart(d) - 1)
    const remainingDays = daysInMonth(m) - dayOfMonth(d) + 1
    const allowance = Math.floor((pool - prevDaily) / remainingDays)
    dailyBefore.set(m, prevDaily + dayCtx.dailySpent)
    const snap = {
      date: d,
      S: st.S,
      E: st.E,
      H: st.H,
      X: st.X,
      L: st.L,
      G: Object.fromEntries(st.G),
      T: Object.fromEntries(st.T),
      dep: depSum(),
      sum: layersSum(),
      debt: debtAt(d),
      hh: Object.fromEntries([...hh.members.values()].map((x) => [x.id, { owed: hh.owedNet(x), deposit: x.deposit, unassigned: x.unassigned, oldest: hh.owedNet(x) > 0 ? (x.purchases.find((p) => p.remaining > 0)?.date ?? null) : null }])),
      hhRepaid: hh.repaidToday ?? 0,
      costs: dayCtx.costs,
      timed: dayCtx.timed,
      loansGiven: givenAt(d),
      balances: Object.fromEntries(balances),
      allowance,
      dailyPool: pool,
      dailySpentBefore: prevDaily,
      dailySpent: dayCtx.dailySpent,
      energyToday: allowance - dayCtx.dailySpent,
      plannedDay: dayCtx.plannedDay,
      plannedCum: Object.fromEntries(plannedCum.get(m) ?? new Map()),
      decisionsSH: dayCtx.decisionsSH,
      firewall: dayCtx.firewall,
      night: dayCtx.night,
      judas: dayCtx.judas,
      turtle: dayCtx.turtle,
      householdLent: dayCtx.householdLent,
      shieldTarget: shieldTarget(m),
      hullTarget: hullTarget(m),
      minShields: minShields(m)
    }
    days.set(d, snap)
    snapshot = snap
  }

  function debtAt(d) {
    let debt = 0
    for (const l of loans.values()) {
      if (l.direction !== 'taken' || l.date > d) continue
      if (l.closedAt && toWarsaw(l.closedAt).date <= d) continue
      const total = (l.schedule ?? []).reduce((a, x) => a + x.amount, 0) || l.amount
      debt += Math.max(0, total - loansState.get(l.id).paid)
    }
    return debt
  }
  function givenAt(d) {
    // T70: należność = kwota pożyczki − spłaty (od dnia pożyczki; zamknięta – 0)
    let x = 0
    for (const l of loans.values()) {
      if (l.direction !== 'given' || l.date > d) continue
      if (l.closedAt && toWarsaw(l.closedAt).date <= d) continue
      x += Math.max(0, l.amount - loansState.get(l.id).received)
    }
    return x
  }
  /** Limity kopert miesiąca w chwili `cutoffMs` (u2: C4–C6): plan + zapas z łupów (T278) ± pokrycia z chwilą ≤ cutoff (T279). */
  function limitsAt(m, cutoffMs = Infinity) {
    const plan = planFor(m)
    const rec = monthRec(m)
    const lim = {}
    for (const [cid, x] of Object.entries(plan?.envelopes ?? {})) lim[cid] = x
    for (const [cid, x] of Object.entries(rec.envelopeExtra ?? {})) lim[cid] = (lim[cid] ?? 0) + x
    for (const cv of plans.get(m)?.envelopeCovers ?? []) {
      if (!(Date.parse(cv.at) <= cutoffMs)) continue
      lim[cv.from] = (lim[cv.from] ?? 0) - cv.amount
      lim[cv.to] = (lim[cv.to] ?? 0) + cv.amount
    }
    let pool = rec.lootNextIn ?? 0
    for (const [cid, x] of Object.entries(lim)) if (cats.kindOf(cid) === 'daily') pool += x
    return { lim, pool }
  }
  function dailyPool(m, cutoffMs = Infinity) {
    return limitsAt(m, cutoffMs).pool
  }

  // ---------------------------------------------------------------- wynik
  const accountsTotal = [...balances.values()].reduce((a, b) => a + b, 0)
  return {
    today,
    budgetStart,
    variant,
    state: st,
    snapshot,
    days,
    months,
    log,
    loot,
    deliveries,
    household: hh,
    loansState,
    balances,
    accountsTotal,
    layersSum: layersSum(),
    hist,
    planFor,
    salaryOf,
    shieldTarget,
    hullTarget,
    minShields,
    dailyPool,
    ctx,
    openings,
    notes,
    ops,
    inRun,
    containers,
    goals,
    dockByTx,
    inputBalances: input.balances,
    householdSince,
    limitsAt,
    paidCycles,
    dailyBeforeOf: (m) => dailyBefore.get(m) ?? 0
  }
}

export function inQuiet(time, q) {
  const from = q?.from ?? '23:00'
  const to = q?.to ?? '05:00'
  return from <= to ? time >= from && time < to : time >= from || time < to
}

export { hullTargetNote }
const hullTargetNote = 'cel kadłuba = hullMonths × średnie koszty netto z pełnych miesięcy przed miesiącem (T26, T27, T173)'
