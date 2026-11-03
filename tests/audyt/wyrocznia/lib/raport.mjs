// Złożenie wszystkich wielkości wyroczni (P1–P4) z przebiegu silnika i gry. Kwoty: { gr, zl }.
import { addDays, addMonths, addWorkingDays, dayNum, dayOfMonth, daysInMonth, diffDays, fromWarsaw, monthDiff, monthOf, toWarsaw, weekday } from './daty.mjs'
import { kw, median, round1, sum, trunc1, zl } from './kwoty.mjs'
import { aliveIn, amountIn, classifyOwn, cycleOf, goalAt, isDueMonth, monthlyWeight, partsOf, runFleet, tankInstallment } from './silnik.mjs'
import { missionsModel, playGame, rangeOf, shipClass, MISSION_NAMES } from './gra.mjs'
import { radarOf, payDayOf, duePaid } from './radar.mjs'

export const WERSJA = '2026-11-03 u2'

const pctTxt = (x) => (x == null ? null : `${(Math.floor(x * 1000 + 1e-9) / 10).toFixed(1).replace('.', ',')}%`)

// ------------------------------------------------------------------ ICTTJ: pary i stany dostaw (T63, T162, T164, T224)
export function ictjDeliveries(r, input, ictj, today) {
  if (!ictj) return { entries: [], withoutEntry: [], note: 'folder ICTTJ nie podany (--ictj)' }
  const S = input.settings
  const skipped = new Set(S.ictj?.skipped ?? [])
  const covered = S.import?.coveredTo ?? {}
  const mbankId = (S.accounts ?? []).find((a) => a.importFormat === 'mbank')?.id
  const used = new Set()
  const ops = r.ops
  const dockByEntry = new Map()
  for (const d of input.dockings) if (d.ictjEntryId && !dockByEntry.has(d.ictjEntryId) && ops.some((t) => t.id === d.transactionId)) dockByEntry.set(d.ictjEntryId, d)
  for (const d of dockByEntry.values()) used.add(d.transactionId)
  const entries = []
  for (const e of ictj.payouts) {
    const sign = e.kind === 'return' ? -1 : 1
    const amount = sign * e.amountGr
    const winFrom = addDays(e.date, -3)
    const winTo = addWorkingDays(e.date, 3)
    const out = { id: e.id, date: e.date, kind: e.kind, pool: e.pool, amount: kw(e.amountGr), window: { od: winFrom, do: winTo } }
    const dk = dockByEntry.get(e.id)
    let pair = dk ? ops.find((t) => t.id === dk.transactionId) : null
    if (!pair) {
      const cands = ops
        .filter((t) => !used.has(t.id) && t.amount === amount && t.date >= winFrom && t.date <= winTo && (t.kind === 'trading' || (e.kind === 'withdrawal' && t.kind === 'income' && !t.memberId && !t.splits?.length && t.accountId !== mbankId)))
        .sort((a, b) => Math.abs(diffDays(e.date, a.date)) - Math.abs(diffDays(e.date, b.date)) || (a.accountId === mbankId ? -1 : 1))
      pair = cands[0] ?? null
      if (pair) used.add(pair.id)
    }
    if (pair) out.para = { txId: pair.id, data: pair.date, konto: (S.accounts ?? []).find((a) => a.id === pair.accountId)?.name ?? pair.accountId }
    if (pair) out.txId = pair.id
    if (skipped.has(e.id)) out.stan = 'pominięty'
    else if (e.date < r.budgetStart && ((pair && pair.date < r.budgetStart) || (!pair && winTo < r.budgetStart))) out.stan = 'sprzed startu (w saldach otwarcia)'
    else if (e.date < r.budgetStart && !pair) {
      // u1 (R-6): D72 – wpis sprzed startu pomijany („sprzed startu”), póki para po starcie (T162) go nie zadokuje
      out.stan = 'sprzed startu (w saldach otwarcia)'
      out.stanZ11 = 'czeka na import (okno sięga za start – Z11)'
      out.uwaga = `okno pary do ${winTo}`
    }
    else if (dk) out.stan = 'zadokowany'
    else if (pair) out.stan = e.kind === 'return' ? 'do zadokowania – zwrot do masy (firewall do potwierdzenia)' : 'do zadokowania (para w banku)'
    else {
      const cov = covered[mbankId] ?? null
      out.stan = today > winTo && cov && cov > winTo ? 'propozycja Portfela XTB (do potwierdzenia)' : 'czeka na import'
      // u2 (C14): wariant – zasięg plików = coveredTo albo ostatni wiersz z banku (jak T208, T285)
      const lastRow = ops.filter((t) => t.bank && t.accountId === mbankId).reduce((a, t) => (t.date > a ? t.date : a), '')
      const cov2 = cov && cov > lastRow ? cov : lastRow || cov
      out.stanOstatniWiersz = today > winTo && cov2 && cov2 > winTo ? 'propozycja Portfela XTB (do potwierdzenia)' : 'czeka na import'
      out.uwaga = `okno pary do ${winTo}; pliki mBanku do ${cov ?? '—'}`
    }
    const del = pair ? r.deliveries.find((x) => x.txId === pair.id) : null
    if (del)
      out.podzial = {
        oslony: kw(del.toShields ?? 0),
        kadlub: kw(del.toHull ?? 0),
        cele: Object.fromEntries(Object.entries(del.toGoals ?? {}).map(([g, x]) => [r.goals.get(g)?.name ?? g, kw(x)])),
        rezerwaPodatku: kw(del.toTax ?? 0),
        pula: del.pool ?? null
      }
    entries.push(out)
  }
  const withoutEntry = ops
    .filter((t) => t.kind === 'trading' && t.amount > 0 && !used.has(t.id) && t.date >= r.budgetStart && t.date <= today)
    .map((t) => ({ txId: t.id, data: t.date, kwota: kw(t.amount), przypomnienie: diffDays(t.date, today) <= 30 ? `tak (do ${addDays(t.date, 30)})` : 'nie (ponad 30 dni)' }))
  return { entries, withoutEntry }
}

// ------------------------------------------------------------------ przychody (D81, T119, T120, T186)
function incomeMonths(r, input, taxTx = new Set()) {
  const hhIncome = new Map()
  for (const m of r.household.members.values()) for (const e of m.events) if (e.type === 'wpłata' && e.income && e.date >= (r.householdSince ?? '')) hhIncome.set(e.txId, (hhIncome.get(e.txId) ?? 0) + e.income)
  const praca = new Map()
  const trading = new Map()
  for (const t of r.ops) {
    const m = monthOf(t.date)
    if (t.kind === 'income') {
      let x = 0
      for (const p of partsOf(t)) if (p.memberId == null && p.amount > 0) x += p.amount
      x += hhIncome.get(t.id) ?? 0
      if (x) praca.set(m, (praca.get(m) ?? 0) + x)
    } else if (t.kind === 'trading') {
      const dk = r.dockByTx.get(t.id)
      // u2 (C1): pula Podatek z podziałem – podatkiem jest tylko część z podziału (T224, taxHold)
      if ((dk?.pool === 'tax' && !dk?.split) || taxTx.has(t.id)) continue
      let x = t.amount
      if (dk?.split?.taxHold) x -= Math.sign(t.amount) * Math.min(Math.abs(t.amount), dk.split.taxHold)
      trading.set(m, (trading.get(m) ?? 0) + x)
    } else if (t.kind === 'loan' && t.loanId) {
      // nadwyżka spłaty pożyczki udzielonej = przychód (T70)
    }
  }
  return { praca, trading }
}

export function incomeStats(r, input, curMonth, taxTx) {
  const { praca, trading } = incomeMonths(r, input, taxTx)
  const months = r.hist.fullBefore(curMonth, 12)
  const rows = months.map((m) => {
    const p = praca.get(m) ?? 0
    const tr = Math.max(0, trading.get(m) ?? 0)
    return { miesiac: m, praca: p, trading: tr, tradingNetto: trading.get(m) ?? 0, razem: p + tr }
  })
  const win = (n) => {
    const w = rows.slice(-n)
    if (!w.length) return null
    const pr = sum(w.map((x) => x.praca)) / w.length
    const trNet = Math.max(0, sum(w.map((x) => x.tradingNetto))) / w.length
    const trFloor = sum(w.map((x) => x.trading)) / w.length
    return { miesiecy: w.length, praca: Math.round(pr), tradingOknoNetto: Math.round(trNet), tradingSumaMiesiecy: Math.round(trFloor), razem: Math.round(pr + trNet), razemZCzesci: Math.round(pr) + Math.round(trNet), razemSumaMiesiecy: Math.round(pr + trFloor) }
  }
  return {
    rows,
    s3: win(3),
    s6: win(6),
    s12: win(12),
    mediana12: { praca: median(rows.map((x) => x.praca)), trading: median(rows.map((x) => x.trading)), razem: median(rows.map((x) => x.razem)) }
  }
}

// ------------------------------------------------------------------ złożenie
export function buildReport(input, ictj, chwila, opt = {}) {
  const S = input.settings
  const today = chwila.date
  const nowTime = chwila.time
  const curMonth = monthOf(today)
  if (chwila.ms == null) chwila.ms = fromWarsaw(chwila.date, chwila.time ?? '12:00') + 59_999
  const rA = runFleet(input, { today, household: 'A' })
  if (rA.error) return { blad: rA.error }
  const rB = runFleet(input, { today, household: 'B' })
  const rZ6 = runFleet(input, { today, household: 'A', excludeLoanInstallments: true })
  const r = rA
  const st = r.state
  const accName = (id) => (S.accounts ?? []).find((a) => a.id === id)?.name ?? id
  const goalName = (id) => r.goals.get(id)?.name ?? id
  const contName = (id) => r.containers.get(id)?.name ?? id
  const catName = (id) => r.ctx.cats.name(id) ?? id
  const uwagi = [...r.notes, ...(input.problems ?? []).slice(0, 20)]

  // ---------------- P1: salda kont
  const later = new Map()
  for (const t of r.ops) if (t.date === today && t.time && t.time > nowTime) later.set(t.accountId, (later.get(t.accountId) ?? 0) + t.amount)
  const konta = (S.accounts ?? []).map((a) => {
    const end = r.balances.get(a.id) ?? null
    return { id: a.id, nazwa: a.name, rodzaj: a.kind, archiwalne: !!a.archived, teraz: kw(end == null ? null : end - (later.get(a.id) ?? 0)), koniecDnia: kw(end) }
  })
  const sumaKont = sum(konta.map((k) => k.koniecDnia.gr ?? 0))
  const potwierdzenia = input.balances
    .filter((b) => b.kind === 'confirmation')
    .map((b) => {
      const snap = r.days.get(b.date)
      const calc = snap?.balances?.[b.accountId] ?? null
      return { konto: accName(b.accountId), dzien: b.date, potwierdzone: kw(b.amount), wyliczone: kw(calc), roznica: kw(calc == null ? null : calc - b.amount) }
    })

  // ---------------- P1: warstwy
  const goalsList = [...r.goals.values()]
    .map((g) => ({ id: g.id, nazwa: g.name, zrodlo: g.source, priorytet: g.priority, cel: kw(g.target), stan: kw(st.G.get(g.id) ?? 0), archiwalny: !!g.archived, termin: g.deadline, aktywnyOd: g.activeFrom }))
    .sort((a, b) => a.priorytet - b.priorytet)
  const zbiorniki = [...st.T.entries()].map(([id, x]) => ({ id, nazwa: contName(id), stan: kw(x) }))
  const depozyt = [...r.household.members.values()].map((m) => ({ osoba: m.name, zaliczka: kw(m.deposit) }))
  const depSumA = sum([...r.household.members.values()].map((m) => m.deposit))
  const pendingLoot = [...r.loot.entries()].filter(([, l]) => !l.decided).map(([m, l]) => ({ miesiac: m, kwota: kw(l.amount) }))
  const startInfo = r.log.find((l) => l.type.startsWith('start'))
  const warstwy = {
    srodkiNaPoczatekDniaStartu: kw(startInfo?.money ?? null),
    oslony: kw(st.S),
    oslonyZLupami: kw(st.S + st.L),
    energia: kw(st.E),
    kadlub: kw(st.H),
    cele: goalsList,
    celeRazem: kw(sum([...st.G.values()])),
    zbiorniki,
    zbiornikiRazem: kw(sum([...st.T.values()])),
    rezerwaPodatku: kw(st.X),
    depozytDomownikow: depozyt,
    depozytRazem: kw(depSumA),
    lupyCzekajace: pendingLoot,
    lupyRazem: kw(st.L),
    suma: kw(r.layersSum),
    sumaKont: kw(sumaKont),
    roznica: kw(r.layersSum - sumaKont),
    wariantB_1153: {
      opis: 'domownicy wg inflowKind 1.15.3 (zaliczka / niezależny przychód bez spłaty)',
      oslony: kw(rB.state.S),
      kadlub: kw(rB.state.H),
      energia: kw(rB.state.E),
      cele: Object.fromEntries([...rB.state.G].map(([g, x]) => [goalName(g), kw(x)])),
      depozyt: Object.fromEntries([...rB.household.members.values()].map((m) => [m.name, kw(m.deposit)])),
      suma: kw(rB.layersSum)
    }
  }

  // ---------------- cele warstw
  const sT = r.shieldTarget(curMonth)
  const hT = r.hullTarget(curMonth)
  const minS = r.minShields(curMonth)
  const hullFull = hT != null && st.H >= hT
  const celeWarstw = {
    celOslon: kw(sT),
    celOslonOpis: `${S.layers?.shieldSalaries ?? 3} × pensja ${zl(r.salaryOf(curMonth))}`,
    minimumOslon: kw(minS),
    celKadluba: kw(hT),
    celKadlubaOpis: `${S.layers?.hullMonths ?? 6} × średnie koszty netto ${zl(r.hist.avgCosts(curMonth).value)}`,
    kadlubPelny: hullFull,
    brakDoCeluKadluba: kw(hT == null ? null : Math.max(0, hT - st.H)),
    brakDoCeluOslon: kw(sT == null ? null : Math.max(0, sT - st.S)),
    wolneDoDecyzji: kw(hullFull && sT != null ? Math.max(0, st.S - sT) : 0),
    wolnePowod: hullFull ? (st.S > sT ? 'osłony ponad cel przy pełnym kadłubie' : 'osłony nie ponad cel') : hT == null ? 'cel kadłuba nieznany' : 'kadłub niepełny (T181)'
  }

  // ---------------- koszty netto i propozycje
  const avg = r.hist.avgCosts(curMonth)
  const fm = r.hist.fullBefore(curMonth, 12)
  const kosztyMiesiecy = fm.map((m) => ({ miesiac: m, koszt: kw(r.hist.costs.get(m) ?? 0) }))
  const avgN = (n) => {
    const w = fm.slice(-n)
    if (!w.length) return null
    return Math.round(sum(w.map((m) => r.hist.costs.get(m) ?? 0)) / w.length)
  }
  const koszty = {
    poczatekHistorii: r.hist.start,
    pierwszyPelny: r.hist.firstFull,
    miesiace: kosztyMiesiecy,
    srednia12: kw(avgN(12)),
    srednia6: kw(avgN(6)),
    srednia3: kw(avgN(3)),
    przyjete: kw(S.layers?.assumedCosts ?? null),
    uzyte: kw(avg.value),
    zrodlo: avg.source,
    zaokraglenie: 'średnia zaokrąglona do grosza (Z3)'
  }
  const avg6 = avgN(6)
  const proposals = { pensja: kw(avg6 == null ? null : Math.ceil(avg6 / 10000) * 10000) }
  // koperty: średnie wydatki kategorii głównej z 3 pełnych miesięcy, bez płatności kontenerów, do 10 zł (D70, T47)
  const m3 = fm.slice(-3)
  const catSpend = new Map()
  for (const t of r.ops) {
    if (t.kind !== 'expense' || !m3.includes(monthOf(t.date))) continue
    for (const p of partsOf(t)) {
      if (p.refundable) continue
      const k = classifyOwn(t, p, r.ctx)
      if (k.kind === 'cargo' || k.kind === 'goal') continue
      const key = k.main ?? 'bez kategorii'
      catSpend.set(key, (catSpend.get(key) ?? 0) + -p.amount)
    }
  }
  proposals.koperty = [...catSpend.entries()].map(([c, x]) => {
    const a = x / m3.length
    return { kategoria: c === 'bez kategorii' ? c : catName(c), rodzaj: r.ctx.cats.kindOf(c), srednia3: kw(Math.round(a)), doGory10zl: kw(Math.ceil(a / 1000) * 1000), najblizsze10zl: kw(Math.round(a / 1000) * 1000) }
  })

  // ---------------- przychody
  const dokowanie = ictjDeliveries(r, input, ictj, today)
  // T224: wypłaty z puli Podatek sparowane z bankiem (także przed startem) nie są przychodem z tradingu
  const taxTx = new Set((dokowanie.entries ?? []).filter((e) => e.pool === 'tax' && e.txId && e.para && e.para.data < r.budgetStart).map((e) => e.txId))
  const inc = incomeStats(r, input, curMonth, taxTx)
  const salaryNow = r.salaryOf(curMonth)
  const przychody = {
    miesiace: inc.rows.map((x) => ({ miesiac: x.miesiac, praca: kw(x.praca), trading: kw(x.trading), tradingNetto: kw(x.tradingNetto), razem: kw(x.razem) })),
    srednie: Object.fromEntries(
      ['s3', 's6', 's12'].map((k) => [k, inc[k] && { miesiecy: inc[k].miesiecy, praca: kw(inc[k].praca), trading: kw(inc[k].tradingOknoNetto), tradingSumaMiesiecy: kw(inc[k].tradingSumaMiesiecy), razem: kw(inc[k].razem), razemZCzesci: kw(inc[k].razemZCzesci) }])
    ),
    mediana12: { praca: kw(inc.mediana12.praca), trading: kw(inc.mediana12.trading), razem: kw(inc.mediana12.razem) },
    ostrzezeniePensji: inc.s6 ? salaryNow > inc.s6.razem : null,
    ostrzezenieOpis: inc.s6 ? `pensja ${zl(salaryNow)} wobec średniej „Razem” z ${inc.s6.miesiecy} mies. ${zl(inc.s6.razem)}` : null
  }

  // ---------------- plan bieżącego miesiąca
  const rec = r.months.get(curMonth)
  const plan = r.planFor(curMonth)
  const envDaily = []
  const envPlanned = []
  const nowLim = r.limitsAt(curMonth, chwila.ms)
  for (const [cid, lim] of Object.entries(nowLim.lim)) {
    const kind = r.ctx.cats.kindOf(cid)
    const row = { kategoria: catName(cid), limit: kw(lim), planu: kw(plan?.envelopes?.[cid] ?? 0) }
    if (kind === 'daily') envDaily.push(row)
    else envPlanned.push({ ...row, id: cid })
  }
  const planMiesiaca = {
    miesiac: curMonth,
    pensja: kw(plan?.salary ?? null),
    wyplacono: kw(rec?.salaryPaid ?? null),
    zOslon: kw(rec?.salaryFromShields ?? null),
    zKadluba: kw(rec?.salaryFromHull ?? null),
    brakuje: kw(rec ? (plan?.salary ?? 0) - (rec.firstMonthReduction ?? 0) - rec.salaryPaid : null),
    alarm: rec?.salaryPartial ? 'czerwony – pensja częściowa' : rec?.salaryFromHull > 0 ? 'żółty – pensja z kadłuba' : 'brak',
    pierwszyMiesiacPomniejszenie: kw(rec?.firstMonthReduction ?? 0),
    ratyOdkladek: Object.entries(rec?.tanks ?? {}).map(([id, x]) => ({ kontener: contName(id), rata: kw(x), planowana: kw(rec.tankDetails[id].installment), nominalna: kw(rec.tankDetails[id].nominal), wyrownanie: kw(rec.tankDetails[id].share), termin: rec.tankDetails[id].due, cyklZaplacony: !!rec.tankDetails[id].paidCycle })),
    ratyOdkladekPlanRazem: kw(sum(Object.values(rec?.tankDetails ?? {}).map((x) => x.installment))),
    ratyOdkladekRazem: kw(sum(Object.values(rec?.tanks ?? {}))),
    ratyCelow: Object.entries(rec?.goalRates ?? {}).map(([id, x]) => ({ cel: goalName(id), rata: kw(x) })),
    ratyCelowWarunek: rec?.ratesCondition ? { pelneOslonyIKadlubPrzedPensja: rec.ratesCondition.fullBefore, oslony: kw(rec.ratesCondition.shieldsBefore), celOslon: kw(rec.ratesCondition.shieldTarget), kadlub: kw(rec.ratesCondition.hullBefore), celKadluba: kw(rec.ratesCondition.hullTarget) } : null,
    kopertyCodzienne: envDaily,
    kopertyCodzienneRazem: kw(sum(envDaily.map((x) => x.limit.gr))),
    kopertyPlanowe: envPlanned.map(({ id, ...x }) => x),
    kopertyPlanoweRazem: kw(sum(envPlanned.map((x) => x.limit.gr))),
    energiaNaStart: kw(rec?.energyStart ?? null),
    energiaTeraz: kw(st.E)
  }

  // ---------------- przydział dziś
  const snapT = r.days.get(today)
  const pool = r.dailyPool(curMonth, chwila.ms)
  const remDays = daysInMonth(curMonth) - dayOfMonth(today) + 1
  const spentToday = snapT?.dailySpent ?? 0
  const allowance = snapT ? Math.floor((pool - snapT.dailySpentBefore) / remDays) : null
  const basic = pool / daysInMonth(curMonth)
  const przydzial = {
    kopertyCodzienne: kw(pool - (rec?.lootNextIn ?? 0)),
    lupyNaNastepnyMiesiac: kw(rec?.lootNextIn ?? 0),
    wydaneCodzienneDoWczoraj: kw(snapT?.dailySpentBefore ?? null),
    dniDoKoncaZDzis: remDays,
    przydzialDzis: kw(allowance),
    wydaneDzis: kw(spentToday),
    energiaDzis_T295: kw(allowance == null ? null : allowance - spentToday),
    energiaDzis_spec: kw(allowance),
    podstawowyPrzydzial: kw(Math.floor(basic)),
    podstawowyDokladnie: Math.round(basic * 100) / 100,
    zaoszczedzoneNaDzien: kw(allowance == null ? null : allowance - Math.floor(basic))
  }

  // ---------------- koperty planowe (bieżący miesiąc)
  const pct = S.game?.seriousEnvelopePct ?? 20
  const kopertyPlanowe = envPlanned.map((e) => {
    const lim = e.limit.gr
    const spent = rec?.plannedSpent?.[e.id] ?? 0
    return {
      kategoria: e.kategoria,
      limit: e.limit,
      wydane: kw(spent),
      procent: lim > 0 ? pctTxt(spent / lim) : null,
      przekroczenie: spent > lim ? (lim > 0 && spent > lim * (1 + pct / 100) ? 'poważne' : 'zwykłe') : 'brak',
      ponad80: lim > 0 && spent > 0.8 * lim
    }
  })

  // ---------------- łupy poprzedniego miesiąca
  const prevM = addMonths(curMonth, -1)
  const prevRec = r.months.get(prevM)
  const prevPlan = r.planFor(prevM)
  let lupy = null
  if (prevRec && r.loot.has(prevM)) {
    const l = r.loot.get(prevM)
    // wariant B: niewydane z kopert (spec) – pula dzienna jako jedna koperta + koperty planowe
    const dailyLim = sum(Object.entries(prevPlan?.envelopes ?? {}).filter(([c]) => r.ctx.cats.kindOf(c) === 'daily').map(([, x]) => x))
    let unspentPos = Math.max(0, dailyLim + (prevRec.lootNextIn ?? 0) - prevRec.dailySpent)
    let unspentNet = dailyLim + (prevRec.lootNextIn ?? 0) - prevRec.dailySpent
    for (const [c, lim] of Object.entries(prevPlan?.envelopes ?? {})) {
      if (r.ctx.cats.kindOf(c) !== 'planned') continue
      const sp = prevRec.plannedSpent?.[c] ?? 0
      unspentPos += Math.max(0, lim - sp)
      unspentNet += lim - sp
    }
    lupy = {
      miesiac: prevM,
      wariantA_niewydanaEnergia: kw(l.amount),
      wariantB_niewydaneZKopert_dodatnie: kw(unspentPos),
      wariantB_niewydaneZKopert_netto: kw(unspentNet),
      terminDecyzji: `${curMonth}-07`,
      bezDecyzji: `${curMonth}-08 do osłon`,
      stan: l.decided ? `rozdzielone ${l.split?.at}${l.split?.default ? ' (domyślnie do osłon)' : ''}` : 'czeka na decyzję',
      decyzja: prevPlan?.loot ?? null
    }
  }

  // ---------------- zasięg i klasa
  const debt = snapT?.debt ?? 0
  const rng = rangeOf(st.S, st.H, debt, avg.value)
  const rngL = rangeOf(st.S + st.L, st.H, debt, avg.value)
  const zasieg = {
    oslonyPlusKadlubMinusDlug: kw(Math.max(0, st.S + st.H - debt)),
    dlug: kw(debt),
    koszty: kw(avg.value),
    dokladnie: rng,
    obciecie: trunc1(rng),
    zaokraglenie: round1(rng),
    klasa: shipClass(trunc1(rng)),
    klasaZaokraglenie: shipClass(round1(rng)),
    zLupamiWOslonach: { dokladnie: rngL, obciecie: trunc1(rngL), zaokraglenie: round1(rngL), klasa: shipClass(trunc1(rngL)) },
    wariantB_1153: rangeOf(rB.state.S, rB.state.H, debt, avg.value)
  }
  const avgZ6 = rZ6.hist.avgCosts(curMonth).value
  const wariantZ6 = {
    opis: 'Z6-B: raty pożyczki wziętej (wydatki kontenera z loanId) poza kosztami netto – cały przebieg silnika od nowa',
    sredniaKosztow: kw(avgZ6),
    celKadluba: kw(rZ6.hullTarget(curMonth)),
    oslony: kw(rZ6.state.S),
    kadlub: kw(rZ6.state.H),
    energia: kw(rZ6.state.E),
    lupy: kw(rZ6.state.L),
    cele: Object.fromEntries([...rZ6.state.G].map(([g, x]) => [goalName(g), kw(x)])),
    zasieg: rangeOf(rZ6.state.S, rZ6.state.H, debt, avgZ6)
  }

  // ---------------- domownicy
  const domownicy = (hh, label) =>
    [...hh.members.values()].map((m) => {
      const owed = hh.owedNet(m)
      const oldest = owed > 0 ? m.purchases.find((p) => p.remaining > 0) : null
      return {
        osoba: m.name,
        wariant: label,
        maOddac: kw(owed),
        najstarszyOtwartyZakup: oldest ? { dzien: oldest.date, dni: diffDays(oldest.date, today), przypomnienie30dni: diffDays(oldest.date, today) > 30 } : null,
        zaliczka: kw(m.deposit),
        doPrzypisania: kw(m.unassigned),
        sumaSplatDoDzis: kw(m.repaidTotal),
        prezentyZOslon: kw(m.giftsFromShields)
      }
    })

  // ---------------- pożyczki (T70, T72)
  const pozyczki = input.loans.map((l) => {
    const ls = r.loansState.get(l.id)
    const paid = l.direction === 'given' ? ls.received : ls.paid
    const total = l.direction === 'given' ? l.amount : sum((l.schedule ?? []).map((x) => x.amount)) || l.amount
    let left = paid
    const raty = (l.schedule ?? []).map((x) => {
      const p = Math.min(left, x.amount)
      left -= p
      const overdueFrom = addDays(x.date, 3)
      const status = p >= x.amount ? 'zapłacona' : today >= overdueFrom ? 'zaległa' : x.date < today ? 'po terminie (do 3 dni)' : 'przyszła'
      return { dzien: x.date, kwota: kw(x.amount), zaplacono: kw(p), stan: status, zaleglaOd: status === 'zaległa' ? overdueFrom : null }
    })
    const zalegle = raty.filter((x) => x.stan === 'zaległa')
    return {
      nazwa: l.name,
      kierunek: l.direction === 'given' ? 'udzielona' : 'wzięta',
      kwota: kw(l.amount),
      doSplatyRazem: kw(total),
      splacono: kw(paid),
      zostalo: kw(Math.max(0, total - paid)),
      raty,
      zalegle: { liczba: zalegle.length, kwota: kw(sum(zalegle.map((x) => x.kwota.gr - x.zaplacono.gr))), od: zalegle[0]?.zaleglaOd ?? null, terminNajstarszej: zalegle[0]?.dzien ?? null }
    }
  })

  // ---------------- ładownia
  const bsm = monthOf(r.budgetStart)
  const kontenery = [...r.containers.values()].map((c) => {
    const alive = aliveIn(c, curMonth, bsm)
    const cyc = c.cycleMonths ?? 1
    const tank = st.T.get(c.id) ?? null
    let nextDue = null
    for (let m = curMonth, i = 0; i < 36; m = addMonths(m, 1), i++) {
      if (!aliveIn(c, m, bsm)) {
        if (m > curMonth) break
        continue
      }
      if (isDueMonth(c, m)) {
        const d = payDayOf(r, c, m) // u1 (R-10): dzień z historii płatności (T208), jak Radar (T221)
        if (!duePaid(r, c, d)) {
          nextDue = d
          break
        }
      }
    }
    const paidNow = r.ops.filter((t) => t.containerId === c.id && monthOf(t.date) === curMonth)
    const covered = S.import?.coveredTo?.[c.accountId] ?? null
    let stanZaplaty = null
    if (alive && isDueMonth(c, curMonth)) {
      const due = payDayOf(r, c, curMonth)
      if (paidNow.length) stanZaplaty = 'zapłacone'
      else if (today >= addDays(due, 3)) stanZaplaty = covered && covered >= addDays(due, 3) ? 'po terminie' : 'czeka na import'
      else stanZaplaty = covered && covered >= due ? 'czeka' : today >= due ? 'czeka na import' : 'czeka (termin przed nami)'
    }
    const rec2 = r.months.get(curMonth)
    return {
      nazwa: c.name,
      kwota: kw(amountIn(c, curMonth)),
      cyklMiesiecy: cyc,
      harmonogram: c.schedule?.length ? c.schedule : null,
      wLadowni: alive,
      wagaMiesieczna: kw(Math.round(monthlyWeight(c, curMonth))),
      rataZbiornikaWMiesiacu: cyc > 1 ? kw(rec2?.tanks?.[c.id] ?? 0) : null,
      rataNominalna: cyc > 1 && rec2?.tankDetails?.[c.id] ? kw(rec2.tankDetails[c.id].nominal) : null,
      stanZbiornika: tank == null ? null : kw(tank),
      najblizszaPlatnosc: nextDue,
      stanZaplatyWMiesiacu: stanZaplaty,
      platnosciWMiesiacu: paidNow.map((t) => ({ dzien: t.date, kwota: kw(-t.amount) }))
    }
  })
  const masa = sum([...r.containers.values()].filter((c) => aliveIn(c, curMonth, bsm)).map((c) => monthlyWeight(c, curMonth)))
  // sygnały ładowni: cichy kontener (T285) i nowa cena (T284) – kontener pożyczki pomijany
  const sygnaly = []
  for (const c of r.containers.values()) {
    if (c.loanId || !aliveIn(c, curMonth, bsm) || (c.cycleMonths ?? 1) !== 1) continue
    const pays = r.ops.filter((t) => t.containerId === c.id).sort((a, b) => (a.date < b.date ? -1 : 1))
    if (!pays.length) continue
    const covered = S.import?.coveredTo?.[c.accountId] ?? today
    const days = pays.slice(-6).map((t) => dayOfMonth(t.date)).sort((a, b) => a - b)
    const payDay = days[Math.floor((days.length - 1) / 2)]
    const dues = []
    for (let m = monthOf(pays[0].date); m <= curMonth; m = addMonths(m, 1)) {
      const due = `${m}-${String(Math.min(payDay, daysInMonth(m))).padStart(2, '0')}`
      if (addDays(due, 3) <= today && addDays(due, 3) <= covered) dues.push(due)
    }
    const last2 = dues.slice(-2)
    const paidFor = (due) => pays.some((t) => t.date >= addDays(due, -14) && t.date < addDays(due, 17))
    if (last2.length === 2 && last2.every((d) => !paidFor(d))) sygnaly.push({ kontener: c.name, sygnal: 'cichy kontener – brak płatności w dwóch ostatnich terminach (T285)', terminy: last2, ostatniaPlatnosc: pays[pays.length - 1].date })
    const cyc = {}
    for (const t of pays) cyc[monthOf(t.date)] = (cyc[monthOf(t.date)] ?? 0) - t.amount
    const months2 = Object.keys(cyc).sort().filter((m) => m < curMonth).slice(-2)
    if (months2.length === 2) {
      const [a1, a2] = months2.map((m) => cyc[m])
      const amt = amountIn(c, curMonth)
      const far = (x) => Math.abs(x - amt) > Math.max(0.05 * amt, 200)
      if (a1 === a2 && far(a1)) sygnaly.push({ kontener: c.name, sygnal: `nowa cena: ${zl(a1)} zamiast ${zl(amt)} (T284, dwa ostatnie cykle)`, cykle: months2 })
    }
  }
  const ladownia = {
    sygnaly,
    kontenery,
    masaMiesieczna: kw(Math.round(masa)),
    masaProcentPensji: salaryNow ? pctTxt(masa / salaryNow) : null,
    masaDokladnie: salaryNow ? masa / salaryNow : null,
    masaProcentPensjiZaokraglone: salaryNow ? `${(Math.round((masa / salaryNow) * 1000) / 10).toFixed(1).replace('.', ',')}%` : null,
    liniaZanurzenia: `${S.orders?.cargoLimitPct ?? 40}%`,
    ponadLinie: salaryNow ? masa / salaryNow > (S.orders?.cargoLimitPct ?? 40) / 100 : null
  }


  // ---------------- bieżący miesiąc w toku (u2, C16): koszty netto do dziś i z operacjami zapisanymi z przyszłą datą
  let costFuture = 0
  for (const t of r.ops) if (monthOf(t.date) === curMonth && t.date > today) for (const p of partsOf(t)) {
    if (t.kind !== 'expense' || p.refundable) continue
    if (classifyOwn(t, p, r.ctx).kind === 'goal') continue
    costFuture += -p.amount
  }
  const biezacyMiesiac = { miesiac: curMonth, kosztyNetto: kw(r.hist.costs.get(curMonth) ?? 0), kosztyNettoZPrzyszlymi: kw((r.hist.costs.get(curMonth) ?? 0) + costFuture) }

  // ---------------- debriefing poprzedniego miesiąca (T178, T52, T215, T180)
  // u2 (C5): debriefing każdego zakończonego miesiąca budżetu tą samą funkcją
  const debriefOf = (m) => {
    const mr = r.months.get(m)
    if (!mr) return null
    const mp = r.planFor(m)
    const extraSum = sum(Object.values(mr.envelopeExtra ?? {}))
    const energy = mr.salaryPaid - sum(Object.values(mr.tanks)) - sum(Object.values(mr.goalRates)) + (mr.lootNextIn ?? 0) + extraSum
    const used = mr.spentEnergy + mr.overflow
    const costsM = r.hist.costs.get(m) ?? 0
    const lim = r.limitsAt(m)
    const fvg = Object.entries(lim.lim).map(([c, l]) => {
      const kind = r.ctx.cats.kindOf(c)
      const sp = kind === 'planned' ? mr.plannedSpent?.[c] ?? 0 : null
      return { kategoria: catName(c), rodzaj: kind, limit: kw(l), wydane: kw(sp), fvg: kw(sp == null ? null : l - sp) }
    })
    const dailyLim = lim.pool - (mr.lootNextIn ?? 0)
    const hhParts = {}
    for (const mm of r.household.members.values()) for (const e of mm.events) if ((e.type === 'zakup' || e.type === 'prezent') && monthOf(e.date) === m) hhParts[mm.name] = (hhParts[mm.name] ?? 0) + e.amount
    return {
      miesiac: m,
      pensja: kw(mr.salaryPaid),
      ratyOdkladek: kw(sum(Object.values(mr.tanks))),
      ratyCelow: kw(sum(Object.values(mr.goalRates))),
      lupyDaneTemu: kw((mr.lootNextIn ?? 0) + extraSum),
      energia: kw(energy),
      wydaneZEnergii: kw(used),
      wynik: kw(energy - used),
      energiaWyczerpana: kw(mr.overflow),
      kosztyNetto: kw(costsM),
      naPlus_T178: energy - used >= 0,
      naPlus_spec: costsM <= (mp?.salary ?? 0),
      pulaDzienna: { limit: kw(dailyLim + (mr.lootNextIn ?? 0)), wydane: kw(mr.dailySpent), fvg: kw(dailyLim + (mr.lootNextIn ?? 0) - mr.dailySpent) },
      fvgKopert: fvg.filter((x) => x.rodzaj === 'planned'),
      bezKoperty: Object.entries(mr.outsideSpent ?? {}).map(([c, x]) => ({ kategoria: c === 'brak' ? 'bez kategorii' : catName(c), wydane: kw(x) })),
      ladownia: kw(mr.cargoSpent),
      sfinansowanePrzezDomownikow: Object.fromEntries(Object.entries(hhParts).map(([k, v]) => [k, kw(v)]))
    }
  }
  let debriefing = null
  if (prevRec) debriefing = { ...debriefOf(prevM), lupy }
  const debriefingiMiesiecy = [...r.months.keys()].filter((m) => m < curMonth).sort().map(debriefOf)

  // ---------------- gra
  const holdDays = (dokowanie.entries ?? []).filter((e) => e.kind === 'withdrawal' && e.para && e.stan.startsWith('do zadokowania')).map((e) => (e.date < e.para.data ? e.date : e.para.data))
  const gameOptA = { allowanceNegNoSpend: 'T227', envelopeMode: 'kazdy', night: 'NPC19', holdDays }
  const gameOptB = { allowanceNegNoSpend: 'D73', envelopeMode: 'przekroczenie', night: 'NPC19', holdDays }
  let gra = null
  if (S.game?.start && S.game.start <= addDays(today, -2)) {
    const missions = missionsModel(r, S, today, gameOptA)
    const gA = playGame(r, S, today, gameOptA)
    const gA_m = playGame(r, S, today, { ...gameOptA, missionsDone: missions.filter((w) => w.evaluated).map((w) => ({ sunday: w.sunday, done: w.done })) })
    const missionsB = missionsModel(r, S, today, gameOptB)
    const gB = playGame(r, S, today, gameOptB)
    const gB_m = playGame(r, S, today, { ...gameOptB, missionsDone: missionsB.filter((w) => w.evaluated).map((w) => ({ sunday: w.sunday, done: w.done })) })
    const fmtDay = (x) => ({ dzien: x.date, stan: x.status === 'ok' ? 'zgodny' : x.violations.some((v) => v.serious) ? 'poważne' : 'zwykłe', naruszenia: x.violations.map((v) => `${v.order}${v.serious ? ' (poważne)' : ''}${v.ref ? ' ' + (catName(v.ref) ?? v.ref) : ''}: ${zl(v.amount)}${v.note ? ' – ' + v.note : ''}`), smaczki: x.tags, klasa: x.cls, zasieg: x.range == null ? null : Math.floor(x.range * 1000) / 1000 })
    const curWeek = missions[missions.length - 1]
    gra = {
      start: S.game.start,
      ostatniZamrozony: gA.lastFrozen,
      wstrzymaneDniT163: gA.held,
      dni: gA.rated.map(fmtDay),
      dniZgodne: gA.rated.filter((x) => x.status === 'ok').length,
      dniZNaruszeniem: gA.rated.filter((x) => x.status !== 'ok').length,
      dniZPowaznym: gA.rated.filter((x) => x.violations.some((v) => v.serious)).length,
      seria: gA.streak,
      rekord: gA.record,
      rekordKoniec: gA.recordEnd,
      stopien_A_bezMisjiWMinionychTygodniach: gA.rank,
      zmianyStopnia_A: gA.changes,
      oknoDoAwansu_A: gA.window,
      stopien_A_zMisjami: gA_m.rank,
      zmianyStopnia_A_zMisjami: gA_m.changes,
      oknoDoAwansu_A_zMisjami: gA_m.window,
      wariantB: { opis: 'D73: ujemny przydział jak 0 (dzień bez wydatków zgodny, przekroczenie od 0); koperta – tylko dzień przekroczenia', dni: gB.rated.map(fmtDay), dniZgodne: gB.rated.filter((x) => x.status === 'ok').length, seria: gB.streak, rekord: gB.record, stopienBezMisji: gB.rank, stopienZMisjami: gB_m.rank, zmianyZMisjami: gB_m.changes, okno: gB.window },
      powazneWBiezacymMiesiacu: gA.seriousThisMonth,
      powazneWMiesiacach: Object.fromEntries([...new Set(gA.rated.map((x) => monthOf(x.date)))].map((m) => [m, sum(gA.rated.filter((x) => monthOf(x.date) === m).map((x) => x.violations.filter((v) => v.serious).length))])),
      klasaTeraz: zasieg.klasa,
      misje: missions.map((w) => ({ tydzien: w.week, poniedzialek: w.monday, slabePunkty: w.weakPoints.map((x) => MISSION_NAMES[x]), misja: w.name, ocena: w.evaluated ? (w.done ? 'wykonana' : 'niewykonana') : 'w toku', uwaga: w.why })),
      misjaBiezacegoTygodnia: curWeek ? { tydzien: curWeek.week, kandydaciWKolejnosci: curWeek.weakPoints.map((x) => MISSION_NAMES[x]), wybrana: curWeek.name, uwaga: 'inna niż w zeszłym tygodniu – zeszłotygodniowa znana tylko wtedy, gdy aplikacja ją wybrała (A: brak misji przed bieżącym tygodniem → pierwszy kandydat)' } : null,
      misjaBiezacegoTygodnia_A: curWeek ? MISSION_NAMES[curWeek.weakPoints[0]] ?? null : null,
      osiagniecia: achievements(r, S, gA, today, goalName)
    }
  } else gra = { uwaga: S.game?.start ? `gra od ${S.game.start} – brak zamrożonych dni (ostatni zamrożony ${addDays(today, -2)})` : 'gra nie wystartowała' }

  // ---------------- Daily Bias (spec, T57, T216)
  const plannedOk = kopertyPlanowe.every((x) => x.przekroczenie === 'brak')
  const bias = (energyToday) => {
    const b = Math.floor(basic)
    const bear = energyToday < b / 2 || (minS != null && st.S < minS)
    const bull = energyToday >= b && plannedOk
    return { bullishPierwszy: bull ? 'Bullish' : bear ? 'Bearish' : 'Neutral', bearishPierwszy: bear ? 'Bearish' : bull ? 'Bullish' : 'Neutral' }
  }
  const dailyBias = { energiaDzis_T295: bias(allowance - spentToday), energiaDzis_spec_przydzial: bias(allowance) }

  // ---------------- P4: radar, majątek, bilans paliwa, dziennik
  const radar = radarOf(r, input, today, st, chwila.ms)
  const hhNet = sum([...r.household.members.values()].map((m) => r.household.owedNet(m) - m.deposit))
  const loansGiven = snapT?.loansGiven ?? 0
  const majatek = { naKontach: kw(sumaKont), naleznosciPozyczek: kw(loansGiven), domownicyNetto: kw(hhNet), dlug: kw(debt), silaFlotyNetto: kw(sumaKont + loansGiven + hhNet - debt) }
  const fuel = inc.rows.map((x) => {
    const c = r.hist.costs.get(x.miesiac) ?? 0
    const bal = x.razem - c
    return { miesiac: x.miesiac, przychod: kw(x.razem), koszty: kw(c), bilans: kw(bal), stopa: x.razem ? `${(Math.round((bal / x.razem) * 1000) / 10).toFixed(1).replace('.', ',')}%` : '—', bezTradingu: kw(x.praca - c) }
  })
  // R-16 (u1): mediany stopy oszczędności – z dokładnych stóp i ze stóp zaokrąglonych do 0,1 (kolejność nieopisana – T294)
  const rates = inc.rows.map((x) => ({ m: x.miesiac, all: x.razem ? (x.razem - (r.hist.costs.get(x.miesiac) ?? 0)) / x.razem : null, work: x.praca ? (x.praca - (r.hist.costs.get(x.miesiac) ?? 0)) / x.praca : null }))
  const medRate = (key, n, rounded) => {
    const xs = rates.slice(-n).map((x) => x[key]).filter((x) => x != null).map((x) => (rounded ? Math.round(x * 1000) / 10 : x * 100))
    const md = median(xs)
    return md == null ? null : `${(Math.round(md * 10) / 10).toFixed(1).replace('.', ',')}%`
  }
  const bilansMediany = {
    mediana6: { zDokladnych: medRate('all', 6, false), zZaokraglonych: medRate('all', 6, true) },
    mediana12: { zDokladnych: medRate('all', 12, false), zZaokraglonych: medRate('all', 12, true) },
    bezTradingu6: { zDokladnych: medRate('work', 6, false), zZaokraglonych: medRate('work', 6, true) }
  }
  const impulses = r.ops.filter((t) => t.kind === 'expense' && t.impulse)
  const ownCost = (t) => partsOf(t).filter((p) => !p.refundable).reduce((a, p) => a - p.amount, 0)
  // R-17 (u1): dziennik miesiąc po miesiącu – kwota własna (bez części domowników, T161) i pełna kwota operacji
  const dzMies = {}
  for (const t of impulses) {
    const m = monthOf(t.date)
    const x = (dzMies[m] = dzMies[m] ?? { plan: 0, impuls: 0, planWlasne: 0, planPelne: 0, impulsWlasne: 0, impulsPelne: 0 })
    if (t.impulse === 'plan') {
      x.plan++
      x.planWlasne += ownCost(t)
      x.planPelne += -t.amount
    } else {
      x.impuls++
      x.impulsWlasne += ownCost(t)
      x.impulsPelne += -t.amount
    }
  }
  const dziennik = {
    miesiace: Object.entries(dzMies)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([m, x]) => ({ miesiac: m, plan: x.plan, planKwotaWlasna: kw(x.planWlasne), planKwotaPelna: kw(x.planPelne), impuls: x.impuls, impulsKwotaWlasna: kw(x.impulsWlasne), impulsKwotaPelna: kw(x.impulsPelne) })),
    plan: impulses.filter((t) => t.impulse === 'plan').length,
    impuls: impulses.filter((t) => t.impulse === 'impulse').length,
    kwotaImpulsow: kw(sum(impulses.filter((t) => t.impulse === 'impulse').map(ownCost))),
    trafnosc: impulses.length ? pctTxt(impulses.filter((t) => t.impulse === 'plan').length / impulses.length) : null
  }
  const krzywa = { miesiace: [], niedziele: [] }
  for (const [d, sn] of r.days) {
    const total = Object.values(sn.balances).reduce((a2, b2) => a2 + b2, 0)
    const nextDay = addDays(d, 1)
    if (nextDay.endsWith('-01') || d === today) krzywa.miesiace.push({ dzien: d, naKontach: kw(total) })
    if (weekday(d) === 7 || d === today) krzywa.niedziele.push({ dzien: d, naKontach: kw(total) })
  }
  const balanceAt = (day) => {
    // T81: saldo z salda otwarcia w obie strony (historia z importu wstecz)
    let total = 0
    for (const [acc, o] of r.openings) {
      let b = o.amount
      for (const t of r.ops) {
        const sides = [{ accountId: t.accountId, amount: t.amount, date: t.date }]
        if (t.kind === 'transfer' && t.bothSides && t.counterAccountId) sides.push({ accountId: t.counterAccountId, amount: -t.amount, date: t.counterDate ?? t.date })
        for (const sd of sides) {
          if (sd.accountId !== acc || sd.date > today) continue
          if (day >= o.date && sd.date >= o.date && sd.date <= day) b += sd.amount
          if (day < o.date && sd.date > day && sd.date < o.date) b -= sd.amount
        }
      }
      total += b
    }
    return total
  }
  const yNow = Number(today.slice(0, 4))
  const przegladRoczny = [yNow - 1, yNow].map((y) => ({
    rok: y,
    naKontachNaPoczatku_3112RokuWczesniej: kw(balanceAt(`${y - 1}-12-31`)),
    naKontachNaKoncu: kw(balanceAt(y === yNow ? today : `${y}-12-31`)),
    miesiaceZHistoria: [...r.hist.withOps].filter((m) => m.startsWith(String(y))).sort(),
    uwaga: 'u1 (R-19): przed początkiem historii saldo = saldo otwarcia liczone wstecz (T81); miesiące bez historii – brak danych, nie 0'
  }))
  const tempoCelow = { wariantA: goalsPace(r, today, chwila.ms), wariantB_1153: goalsPace(rB, today, chwila.ms) }
  const prognozaZasiegu = avg.value ? { paliwo: kw(Math.max(0, st.S + st.H - debt)), miesiecyBezWyplat: rng, koniecPaliwa: addMonthsFrac(today, rng) } : null

  return {
    wersja: WERSJA,
    meta: {
      dane: input.dir,
      ictj: ictj?.dir ?? null,
      chwila: `${today} ${nowTime}`,
      startBudzetu: r.budgetStart,
      wariantGlowny: 'A (spec, D80 b, D91 – wpłata domownika najpierw spłaca; łupy = niewydana energia T28; energia dziś T295)',
      zrodlo: 'wyrocznia AU-9 – liczona z wymagań i danych, bez kodu aplikacji',
      wersja: WERSJA
    },
    konta,
    sumaKont: kw(sumaKont),
    kontrolaSald: { potwierdzenia, plikMbanku: { dzien: '2026-10-26', saldo: kw(6979678), uwaga: 'saldo końcowe historii mBanku z zadania (rok-historia.csv)' } },
    warstwy,
    celeWarstw,
    koszty,
    propozycje: proposals,
    przychody,
    planMiesiaca,
    przydzial,
    kopertyPlanowe,
    lupy,
    zasieg,
    wariantZ6,
    domownicy: { wariantA: domownicy(r.household, 'A'), wariantB_1153: domownicy(rB.household, 'B') },
    pozyczki,
    ladownia,
    dokowanie,
    debriefing,
    debriefingiMiesiecy,
    gra,
    dailyBias,
    biezacyMiesiac,
    p4: { radar, tempoCelow, majatek, krzywaMajatku: krzywa, bilansPaliwa: fuel, bilansPaliwaMediany: bilansMediany, dziennikKapitanski: dziennik, prognozaZasiegu, przegladRoczny },
    uwagi
  }
}

function addMonthsFrac(day, months) {
  if (months == null) return null
  const whole = Math.floor(months)
  const frac = months - whole
  const m = addMonths(monthOf(day), whole)
  const d = Math.min(dayOfMonth(day), daysInMonth(m))
  return addDays(`${m}-${String(d).padStart(2, '0')}`, Math.round(frac * 30.44))
}

// ------------------------------------------------------------------ osiągnięcia (D73, T79) – stanowe i z historii gry
function achievements(r, S, g, today, goalName) {
  const out = []
  const start = S.game.start
  const days = [...r.days.values()].filter((x) => x.date >= start && x.date <= g.lastFrozen)
  const first = (pred) => days.find(pred)?.date ?? null
  out.push({ nazwa: 'Pełne osłony', dzien: first((x) => x.shieldTarget != null && x.S >= x.shieldTarget), warunek: 'osłony na celu' })
  out.push({ nazwa: 'Pancerny kadłub', dzien: first((x) => x.hullTarget != null && x.H >= x.hullTarget), warunek: 'kadłub na celu' })
  const goalDone = first((x) => Object.entries(x.G).some(([id, v]) => {
    const t = r.goals.get(id)?.target
    return t > 0 && v >= t
  }))
  out.push({ nazwa: 'Cel osiągnięty', dzien: goalDone, warunek: 'pierwszy cel z Mapy gwiezdnej pełny' })
  const dock = [...r.dockByTx.values()].filter((d) => d.ictjEntryId && d.date >= start).sort((a, b) => (a.date < b.date ? -1 : 1))[0]
  out.push({ nazwa: 'Pierwsze dokowanie', dzien: dock?.date ?? null, warunek: 'wypłata z ICTTJ zadokowana od startu gry' })
  // Cisza w eterze: 30 dni bez nocnych zakupów (od startu gry)
  let quiet = 0
  let quietDay = null
  for (const x of days) {
    if (x.night.some((n) => n.impulse !== 'plan')) quiet = 0
    else quiet++
    if (quiet >= 30 && !quietDay) quietDay = x.date
  }
  out.push({ nazwa: 'Cisza w eterze', dzien: quietDay, warunek: '30 dni bez potwierdzonych zakupów nocnych' })
  const streakDay = (n) => {
    let run = 0
    for (const x of g.rated) {
      run = x.status === 'ok' ? run + 1 : 0
      if (run >= n) return x.date
    }
    return null
  }
  out.push({ nazwa: 'Seria 7', dzien: streakDay(7) })
  out.push({ nazwa: 'Seria 30', dzien: streakDay(30) })
  out.push({ nazwa: 'Flagowiec', dzien: g.rated.find((x) => x.range != null && x.range >= 12)?.date ?? null, warunek: 'zasięg ≥ 12 mies.' })
  const taken = r.ops.find(() => false)
  out.push({ nazwa: 'Czyste konto', dzien: null, warunek: 'pożyczka wzięta spłacona – nie (zostało do spłaty)' })
  // Asteroida rozbita: opłata okresowa w całości z odkładki (od startu gry)
  const ast = r.log.find((l) => l.type === 'płatność ze zbiornika' && l.date >= start && l.date <= g.lastFrozen && l.fromEnergy === 0)
  out.push({ nazwa: 'Asteroida rozbita', dzien: ast?.date ?? null, warunek: `opłata okresowa w całości ze zbiornika${ast ? ' – ' + r.containers.get(ast.containerId)?.name : ''} (Z: każda opłata okresowa; „roczna” dosłownie – tylko cykl 12)` })
  out.push({ nazwa: 'Hat-trick', dzien: null, warunek: '3 miesiące z rzędu na plus od startu gry – za mało miesięcy' })
  void taken
  return out
}


// ------------------------------------------------------------------ tempo i ETA celów (T67, T226, T220) – u2 (C22)
/**
 * Tempo = średnia wpłat do celów z ostatnich pełnych miesięcy budżetu (do 6), w dwóch częściach: pula Cele i reszta
 * (bez środków na start – T220). ETA: co miesiąc pula Cele najpierw do celów ICTTJ, potem własnych; reszta wg listy
 * priorytetów (jak silnik, T65); ETA = miesiąc (od bieżącego + 1), w którym cel dochodzi do kwoty; > 50 lat – brak.
 */
export function goalsPace(r, today, nowMs) {
  const curMonth = monthOf(today)
  const bs = r.budgetStart
  const firstFull = dayOfMonth(bs) === 1 ? monthOf(bs) : addMonths(monthOf(bs), 1)
  const months = []
  for (let m = addMonths(curMonth, -1); m >= firstFull && months.length < 6; m = addMonths(m, -1)) months.push(m)
  months.reverse()
  if (!months.length) return { tempo: null, uwaga: 'brak pełnych miesięcy budżetu – tempo „—”' }
  let pool = 0
  let rest = 0
  for (const dl of r.deliveries) {
    if (!months.includes(monthOf(dl.date))) continue
    const x = sum(Object.values(dl.toGoals ?? {}))
    if (dl.pool === 'goals') pool += x
    else rest += x
  }
  for (const l of r.log) {
    if (!months.includes(monthOf(String(l.date).slice(0, 7)))) continue
    if (l.type === 'rata celu') rest += l.amount
    if (l.type === 'łupy – decyzja') rest += sum(Object.values(l.goals ?? {}))
  }
  const n = months.length
  const P = pool / n
  const R = rest / n
  const list = [...r.goals.values()].map((g) => ({ g, s: goalAt(g, nowMs) })).filter((x) => x.s && !x.s.archived && x.s.target > 0)
  const state = new Map(list.map(({ g }) => [g.id, r.state.G.get(g.id) ?? 0]))
  const eta = new Map()
  for (const { g, s } of list) if (state.get(g.id) >= s.target) eta.set(g.id, 'osiągnięty')
  const byPool = [...list].sort((a, b) => (a.g.source === 'ictj' ? 0 : 1) - (b.g.source === 'ictj' ? 0 : 1) || a.s.priority - b.s.priority)
  const byList = [...list].sort((a, b) => a.s.priority - b.s.priority)
  if (P + R > 0) {
    for (let k = 1; k <= 600 && eta.size < list.length; k++) {
      for (const [flow, order] of [
        [P, byPool],
        [R, byList]
      ]) {
        let left = flow
        for (const { g, s } of order) {
          if (left <= 0) break
          if (eta.has(g.id)) continue
          const need = s.target - state.get(g.id)
          const x = Math.min(left, need)
          state.set(g.id, state.get(g.id) + x)
          left -= x
          if (state.get(g.id) >= s.target - 1e-6) eta.set(g.id, addMonths(curMonth, k))
        }
      }
    }
  }
  const cele = list.map(({ g, s }) => {
    const e = eta.get(g.id) ?? null
    const late = e && e !== 'osiągnięty' ? s.deadline && e > s.deadline : !e && s.deadline ? P + R > 0 || s.deadline < curMonth : false
    return { cel: g.name, zrodlo: g.source, priorytet: s.priority, stan: kw(r.state.G.get(g.id) ?? 0), kwota: kw(s.target), eta: e ?? (P + R > 0 ? 'ponad 50 lat' : null), termin: s.deadline ?? null, poTerminie: !!late }
  })
  return { miesiace: months, tempo: kw(Math.round(P + R)), tempoPulaCele: kw(Math.round(P)), tempoReszta: kw(Math.round(R)), cele }
}
