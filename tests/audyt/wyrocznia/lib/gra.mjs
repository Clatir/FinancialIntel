// Gra „Dowództwo” wyroczni (AU-9): ocena dni, seria, stopnie, klasa (spec „Gra”, D73, T9, T75–T79, T161, T163,
// T187, T216, T219, T227, T279, N-PC-19). Liczona z migawek końca dnia silnika (dane z folderu w chwili liczenia).
import { addDays, dayNum, monthOf, isoWeek, weekday, toWarsaw, warsawDayStart } from './daty.mjs'
import { monthlyWeight, aliveIn } from './silnik.mjs'

export const RANKS = ['Kadet', 'Chorąży', 'Porucznik', 'Komandor', 'Kapitan', 'Admirał']
export const CLASSES = [
  { name: 'Zwiadowca', min: 0 },
  { name: 'Korweta', min: 1 },
  { name: 'Fregata', min: 3 },
  { name: 'Niszczyciel', min: 6 },
  { name: 'Krążownik', min: 9 },
  { name: 'Flagowiec', min: 12 }
]

/** Klasa okrętu z zasięgu (T10): wartość na progu należy do wyższej klasy. */
export function shipClass(range) {
  if (range == null) return null
  let c = CLASSES[0].name
  for (const k of CLASSES) if (range >= k.min) c = k.name
  return c
}

/** Masa ładunku dnia (suma wag miesięcznych kontenerów w ładowni) – do porównania z dniem poprzednim (T75, T227). */
export function cargoMass(r, m) {
  let w = 0
  for (const c of r.containers.values()) if (aliveIn(c, m, monthOf(r.budgetStart))) w += monthlyWeight(c, m)
  return w
}

/**
 * Ocena jednego dnia.
 * opt.allowanceNegNoSpend: 'T227' (dzień z ujemnym przydziałem jest naruszeniem także bez wydatków) albo 'D73'
 * (dzień bez własnych wydatków codziennych zgodny).
 * opt.envelopeMode: 'kazdy' (każdy dzień z wydatkiem w przekroczonej kopercie) albo 'przekroczenie' (tylko dzień, w którym
 * koperta przekroczyła limit albo próg poważnego).
 * opt.night: 'NPC19' (bez zakupów „plan” i kontenerów) albo 'spec' (każdy potwierdzony).
 */
export function rateDay(r, snap, settings, opt = {}) {
  const v = []
  const pct = settings.game?.seriousEnvelopePct ?? 20
  // 1. dzienny przydział: wydatki dnia ≤ energia dziś (T75, T227)
  if (snap.energyToday < 0) {
    const noSpend = snap.dailySpent <= 0
    const clamped = snap.dailySpent - Math.max(0, snap.allowance)
    if (!(noSpend && opt.allowanceNegNoSpend === 'D73')) {
      // u1 (R-13): wariant D73 traktuje ujemny przydział jak 0 – także w kwocie przekroczenia
      const amount = opt.allowanceNegNoSpend === 'D73' ? clamped : -snap.energyToday
      if (amount > 0) v.push({ order: 'przydział', serious: false, amount, amountT227: -snap.energyToday, amountPrzydzial0: clamped, note: `przydział ${snap.allowance}, wydane ${snap.dailySpent}` })
    }
  }
  // 2. koperty planowe (T75, T216): przekroczenie tego dnia; poważne ponad limit × (1 + próg); limit 0 – tylko zwykłe
  const m = monthOf(snap.date)
  const plan = r.planFor(m)
  for (const [cat, spentDay] of Object.entries(snap.plannedDay)) {
    if (!(spentDay > 0)) continue
    const limit = r.limitsAt ? r.limitsAt(m, warsawDayStart(snap.date) - 1).lim[cat] ?? 0 : (plan?.envelopes?.[cat] ?? 0) + (r.months.get(m)?.envelopeExtra?.[cat] ?? 0)
    const cum = snap.plannedCum[cat] ?? 0
    const before = cum - spentDay
    if (cum <= limit) continue
    const seriousLine = limit * (1 + pct / 100)
    const serious = limit > 0 && cum > seriousLine
    if (opt.envelopeMode === 'przekroczenie') {
      const crossedLimit = before <= limit
      const crossedSerious = serious && before <= seriousLine
      if (!crossedLimit && !crossedSerious) continue
    }
    v.push({ order: 'koperta', serious, ref: cat, amount: cum - limit, note: `limit ${limit}, wydane ${cum}` })
  }
  // 3. osłony poniżej minimum przez decyzje dnia (T16, T75, T161, T219)
  if (snap.minShields != null && snap.S < snap.minShields && snap.decisionsSH < 0) v.push({ order: 'osłony', serious: true, amount: snap.minShields - snap.S })
  // 4. firewall (D23, T31)
  for (const f of snap.firewall) v.push({ order: 'firewall', serious: true, ref: f.txId, amount: f.amount })
  // 5. potwierdzony zakup w ciszy nocnej (T187; N-PC-19 bez „plan” i kontenerów)
  for (const n of snap.night) {
    if (opt.night !== 'spec' && (n.impulse === 'plan' || n.container)) continue
    v.push({ order: 'cisza nocna', serious: true, ref: n.txId, amount: n.amount, note: `${n.time} – ${n.logNote}` })
  }
  const tags = []
  if (snap.judas.length) tags.push('judas')
  if (snap.turtle.length) tags.push('turtle')
  if (snap.energyToday === 0) tags.push('sweep')
  if (settings.game?.noSpend?.[snap.date]) tags.push('nospend')
  return { date: snap.date, status: v.length ? 'broken' : 'ok', violations: v, tags }
}

/** Zasięg (T71, T218): max(0, osłony + kadłub − dług) / średnie koszty netto. */
export function rangeOf(S, H, debt, avg) {
  if (!avg) return null
  return Math.max(0, S + H - debt) / avg
}

/**
 * Przebieg gry od settings.game.start do dnia ostatniego zamrożonego (dziś − 2, T9, T76), z wstrzymaniem dni z parą
 * ICTTJ czekającą na dokowanie (T163, najwyżej 7 dni).
 */
export function playGame(r, settings, today, opt = {}) {
  const g = settings.game ?? {}
  const start = g.start
  if (!start) return { error: 'gra nie wystartowała (settings.game.start = null)' }
  let lastFrozen = addDays(today, -2)
  const holds = (opt.holdDays ?? []).filter((h) => h >= start && h <= lastFrozen && dayNum(today) <= dayNum(h) + 2 + 7).sort()
  if (holds.length) lastFrozen = addDays(holds[0], -1)
  const promoteDays = g.promoteDays ?? 30
  const windowDays = g.windowDays ?? 35
  const demoteSerious = g.demoteSerious ?? 3
  const missionDays = g.missionDays ?? 3
  const missionsDone = opt.missionsDone ?? [] // [{ sunday, template }]
  const rated = []
  let rank = 0
  let lastChange = addDays(start, -1)
  const changes = []
  let serMonth = null
  let serCount = 0
  let prevCargo = null
  for (let d = start; d <= lastFrozen; d = addDays(d, 1)) {
    const snap = r.days.get(d)
    if (!snap) break
    const res = rateDay(r, snap, settings, opt)
    // ładunek ponad linią po wzroście masy (T75, T227)
    const m = monthOf(d)
    const mass = cargoMass(r, m)
    const salary = r.salaryOf(m)
    const line = salary ? ((settings.orders?.cargoLimitPct ?? 40) / 100) * salary : null
    if (prevCargo != null && line != null && mass > prevCargo + 0.5 && mass > line) {
      res.violations.push({ order: 'ładunek', serious: false, amount: Math.round(mass - line) })
      res.status = 'broken'
    }
    prevCargo = d.endsWith('-01') ? null : mass
    // klasa dnia
    const avg = r.hist.avgCosts(m).value
    res.range = rangeOf(snap.S, snap.H, snap.debt, avg)
    res.cls = shipClass(res.range == null ? null : Math.floor(res.range * 10 + 1e-9) / 10)
    rated.push(res)
    // degradacja (D36, T77)
    const serious = res.violations.filter((x) => x.serious).length
    if (m !== serMonth) {
      serMonth = m
      serCount = 0
    }
    if (serious) {
      const before = serCount
      serCount += serious
      if (before < demoteSerious && serCount >= demoteSerious && rank > 0) {
        rank -= 1
        changes.push({ day: d, change: 'down', rank: RANKS[rank] })
        lastChange = d
        serCount = 0
      }
    }
    // awans (D73, T77)
    const from = dayNum(d) - windowDays + 1 > dayNum(lastChange) + 1 ? addDays(d, -windowDays + 1) : addDays(lastChange, 1)
    const okDays = rated.filter((x) => x.date >= from && x.date <= d && x.status === 'ok').length
    const mDone = missionsDone.filter((x) => x.done && x.sunday >= from && x.sunday <= d).length
    res.window = { from, okDays, missions: mDone, score: okDays + mDone * missionDays }
    if (okDays + mDone * missionDays >= promoteDays && rank < RANKS.length - 1) {
      rank += 1
      changes.push({ day: d, change: 'up', rank: RANKS[rank] })
      lastChange = d
      serCount = 0
    }
  }
  // seria i rekord (spec „Seria”)
  let streak = 0
  let record = 0
  let run = 0
  let recordEnd = null
  for (const x of rated) {
    if (x.status === 'ok') {
      run++
      if (run > record) {
        record = run
        recordEnd = x.date
      }
    } else run = 0
  }
  streak = run
  // okno do następnego stopnia
  const last = rated[rated.length - 1]
  const seriousThisMonth = rated.filter((x) => monthOf(x.date) === monthOf(today) && x.date > lastChange).reduce((a, x) => a + x.violations.filter((y) => y.serious).length, 0)
  return {
    start,
    lastFrozen,
    held: holds,
    rated,
    streak,
    record,
    recordEnd,
    rank: RANKS[rank],
    changes,
    lastChange,
    window: last?.window ?? null,
    seriousThisMonth,
    params: { promoteDays, windowDays, demoteSerious, missionDays }
  }
}

export { isoWeek, weekday }

// ------------------------------------------------------------------ misje (D73, T78, T111, T227; warunki z „Przed etapem E7”)

export const MISSION_POOL = ['killzone', 'pelna-energia', 'cisza', 'koperta', 'zero-impulsow', 'bez-wydatkow', 'lacznosc', 'inwentaryzacja', 'dom']
export const MISSION_NAMES = {
  killzone: 'Killzone',
  'pelna-energia': 'Pełna energia',
  cisza: 'Cisza w eterze',
  koperta: 'Koperta pod kontrolą',
  'zero-impulsow': 'Zero impulsów',
  'bez-wydatkow': 'Dzień bez wydatków',
  lacznosc: 'Łączność z bazą',
  inwentaryzacja: 'Inwentaryzacja',
  dom: 'Rozliczenie z domem'
}

function daysRange(from, to) {
  const out = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

/**
 * Model misji: dla każdego tygodnia ISO od pierwszego pełnego tygodnia gry – słabe punkty z 4 tygodni przed
 * poniedziałkiem (kolejność T78), wybór (inny niż w zeszłym tygodniu) i ocena po zamrożeniu niedzieli.
 * Interpretacje warunków – założenia Z (wyrocznia.md).
 */
export function missionsModel(r, settings, today, gameOpt = {}) {
  const start = settings.game?.start
  if (!start) return []
  const firstMonday = weekday(start) === 1 ? start : addDays(start, 8 - weekday(start))
  const lastFrozen = addDays(today, -2)
  const accounts = (settings.accounts ?? []).filter((a) => !a.archived && a.kind !== 'cash')
  const importTimes = Object.keys(settings.import?.log ?? {}).map((t) => toWarsawDate(t)).sort()
  const confirmations = r.inputBalances.filter((b) => b.kind === 'confirmation')
  const pct = settings.game?.seriousEnvelopePct ?? 20
  const snap = (d) => r.days.get(d)
  const allowanceOver = (d) => {
    const s = snap(d)
    if (!s) return false
    return s.energyToday < 0 && !(gameOpt.allowanceNegNoSpend === 'D73' && s.dailySpent <= 0)
  }
  const overPace = (d) => {
    const s = snap(d)
    if (!s) return []
    const m = monthOf(d)
    const plan = r.planFor(m)
    const dim = Number(lastDayOf(m).slice(8))
    const out = []
    for (const [cat, lim] of Object.entries(plan?.envelopes ?? {})) {
      if (r.ctx.cats.kindOf(cat) !== 'planned') continue
      const cum = s.plannedCum[cat] ?? 0
      if (cum > (lim * Number(d.slice(8))) / dim) out.push(cat)
    }
    return out
  }
  const weeks = []
  let last = null
  for (let mon = firstMonday; mon <= today; mon = addDays(mon, 7)) {
    const sun = addDays(mon, 6)
    const win = daysRange(addDays(mon, -28), addDays(mon, -1))
    const wp = []
    // 1. cisza nocna
    if (win.some((d) => (snap(d)?.night ?? []).some((n) => n.impulse !== 'plan' && !n.container))) wp.push('cisza')
    // 2. koperta planowa ponad tempo (Z15: dzień, w którym wydane > limit × dzień/dni miesiąca)
    const paceCount = {}
    for (const d of win) for (const c of overPace(d)) paceCount[c] = (paceCount[c] ?? 0) + 1
    if (Object.keys(paceCount).length) wp.push('koperta')
    // 3. ≥ 2 przekroczenia przydziału
    if (win.filter(allowanceOver).length >= 2) wp.push('pelna-energia')
    // 4. ≥ 2 impulsy
    if (win.reduce((a, d) => a + (snap(d)?.judas.length ?? 0), 0) >= 2) wp.push('zero-impulsow')
    // 5. killzone: ≥ 8 wydatków z godziną, ≥ 25 % kosztów (z godziną) w jednej godzinie dnia tygodnia
    const slots = {}
    let timedN = 0
    let timedSum = 0
    for (const d of win) for (const x of snap(d)?.timed ?? []) {
      timedN++
      timedSum += x.amount
      const k = `${weekday(d)}-${x.time.slice(0, 2)}`
      slots[k] = (slots[k] ?? 0) + x.amount
    }
    const topSlot = Object.entries(slots).sort((a, b) => b[1] - a[1])[0] ?? null
    if (timedN >= 8 && topSlot && topSlot[1] >= 0.25 * timedSum) wp.push('killzone')
    // 6. należność domu starsza niż 14 dni (stan na koniec niedzieli przed poniedziałkiem)
    const sPrev = snap(addDays(mon, -1))
    const oldHouse = sPrev && Object.values(sPrev.hh ?? {}).some((x) => x.owed > 0 && x.oldest && diffDaysSafe(x.oldest, mon) > 14)
    if (oldHouse) wp.push('dom')
    // 7. import starszy niż 4 dni
    const lastImp = importTimes.filter((t) => t < mon).pop()
    if (!lastImp || diffDaysSafe(lastImp, mon) > 4) wp.push('lacznosc')
    // 8. brak potwierdzeń sald (Z: któreś aktywne konto bez potwierdzenia w 4 tygodniach)
    const confirmedAll = accounts.every((a) => confirmations.some((b) => b.accountId === a.id && b.date >= win[0] && b.date <= win[win.length - 1]))
    if (!confirmedAll) wp.push('inwentaryzacja')
    // 9. < 4 dni bez wydatków
    if (win.filter((d) => (snap(d)?.costs ?? 0) <= 0).length < 4) wp.push('bez-wydatkow')
    const pick = wp.find((x) => x !== last) ?? MISSION_POOL[(MISSION_POOL.indexOf(last) + 1) % MISSION_POOL.length]
    // ocena po zamrożeniu niedzieli
    const evaluated = sun <= lastFrozen
    let done = null
    let why = ''
    if (evaluated) {
      const wk = daysRange(mon, sun)
      if (pick === 'cisza') {
        done = !wk.some((d) => (snap(d)?.night ?? []).some((n) => n.impulse !== 'plan' && !n.container))
      } else if (pick === 'pelna-energia') {
        done = !wk.some(allowanceOver)
      } else if (pick === 'zero-impulsow') {
        done = !wk.some((d) => (snap(d)?.judas.length ?? 0) > 0)
      } else if (pick === 'bez-wydatkow') {
        const n = wk.filter((d) => (snap(d)?.costs ?? 0) <= 0).length
        done = n >= 2
        why = `${n} dni bez wydatków`
      } else if (pick === 'lacznosc') {
        const n = importTimes.filter((t) => t >= mon && t <= sun).length
        done = n >= 2
        why = `${n} importów`
      } else if (pick === 'inwentaryzacja') {
        done = accounts.every((a) => confirmations.some((b) => b.accountId === a.id && b.date >= mon && b.date <= sun))
      } else if (pick === 'koperta') {
        const target = Object.entries(paceCount).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0]
        let spent = 0
        let share = 0
        for (const d of wk) {
          const m = monthOf(d)
          const lim = r.planFor(m)?.envelopes?.[target] ?? 0
          share += lim / Number(lastDayOf(m).slice(8))
          spent += snap(d)?.plannedDay?.[target] ?? 0
        }
        done = spent <= 0.8 * share
        why = `koperta ${target}: wydane ${spent}, 80% części tygodnia ${Math.round(0.8 * share)}`
      } else if (pick === 'killzone') {
        const [slot, total] = topSlot ?? [null, 0]
        let x = 0
        for (const d of wk) for (const e of snap(d)?.timed ?? []) if (`${weekday(d)}-${e.time.slice(0, 2)}` === slot) x += e.amount
        done = x <= 0.5 * (total / 4)
        why = `slot ${slot}: ${x} wobec połowy średniej ${Math.round(total / 8)}`
      } else if (pick === 'dom') {
        done = wk.reduce((a, d) => a + (snap(d)?.hhRepaid ?? 0), 0) > 0
      }
    }
    weeks.push({ week: isoWeek(mon), monday: mon, sunday: sun, weakPoints: wp, template: pick, name: MISSION_NAMES[pick], evaluated, done, why, paceCount, topSlot })
    last = pick
  }
  return weeks
}

function toWarsawDate(iso) {
  return toWarsaw(iso).date
}
function diffDaysSafe(a, b) {
  return dayNum(b) - dayNum(a)
}
function lastDayOf(m) {
  const [y, mo] = m.split('-').map(Number)
  return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10)
}
