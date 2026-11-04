// Radar 90 dni wyroczni (T73, T135, T208, T273, T274, T275, T289) – P4. u1: R-5, R-10; u2: C8, C9, C10.
import { addDays, addMonths, dayOfMonth, daysInMonth, diffDays, monthOf } from './daty.mjs'
import { kw } from './kwoty.mjs'
import { aliveIn, amountIn, goalAt, isDueMonth, lifeOf, monthlyWeight } from './silnik.mjs'

/**
 * Płatności kontenera (T393 po scaleniu N2 z N3): części wydatku z kontenerem, jedna na operację, także z celu i „do
 * zwrotu”; inny rodzaj nigdy – te same co silnika ({ id, date, amount > 0 }, po dniu).
 */
export const platnosciKontenera = (r, c) => r.feePays?.get(c.id) ?? []

/** Dzień płatności kontenera w miesiącu m (T208): środkowy (dolny) z ostatnich 6 płatności przed miesiącem, bez nich dueDay. */
export function payDayOf(r, c, m) {
  const pays = platnosciKontenera(r, c)
    .filter((t) => t.date < `${m}-01`)
    .slice(-6)
  let day = c.dueDay ?? 1
  if (pays.length) {
    const days = pays.map((t) => dayOfMonth(t.date)).sort((a, b) => a - b)
    day = days[Math.floor((days.length - 1) / 2)]
  }
  return `${m}-${String(Math.min(day, daysInMonth(m))).padStart(2, '0')}`
}

/**
 * Czy termin `due` kontenera jest zapłacony: miesięczny – okno T208 [termin − 14 dni, następny termin − 14 dni);
 * okresowy – cykl zamknięty według T135 w silniku (płatność w miesiącu terminu albo, przy cyklu ≥ 3, w miesiącu przed
 * nim przy zamkniętym poprzednim cyklu) – u2 (C8).
 */
export function duePaid(r, c, due) {
  const m = monthOf(due)
  if ((c.cycleMonths ?? 1) > 1) return !!r.paidCycles?.get(c.id)?.has(m)
  const from = addDays(due, -14)
  const to = addDays(payDayOf(r, c, addMonths(m, 1)), -14)
  return platnosciKontenera(r, c).some((t) => t.date >= from && t.date < to)
}

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')

/** Dni boi w oknie [od, do] (T273: co roku – 29.02 w innych latach 28.02). */
function buoyDays(s, from, to) {
  if (!s.yearly) return s.date >= from && s.date <= to ? [s.date] : []
  const out = []
  for (let y = Number(from.slice(0, 4)) - 1; y <= Number(to.slice(0, 4)); y++) {
    if (y < Number(s.date.slice(0, 4))) continue
    let md = s.date.slice(5)
    if (md === '02-29' && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) md = '02-28'
    const d = `${y}-${md}`
    if (d >= from && d <= to) out.push(d)
  }
  return out
}

/** Dzień boi zrobiony (T273): odhaczony / zrobiony z boi albo operacja tej samej kwoty ±3 dni (konto boi, bez przelewu i korekty). */
function buoyDone(r, s, d, used) {
  if (s.done && Object.prototype.hasOwnProperty.call(s.done, d)) return true
  if (s.amount == null) return false
  const like = (t) => (norm(s.counterparty) && norm(t.counterparty).includes(norm(s.counterparty)) ? 1 : 0)
  const cand = r.ops
    .filter(
      (t) =>
        !used.has(t.id) &&
        t.kind !== 'transfer' &&
        t.kind !== 'correction' &&
        !(s.notMatched ?? []).includes(t.id) &&
        (!s.accountId || t.accountId === s.accountId) &&
        t.amount === s.amount &&
        Math.abs(diffDays(d, t.date)) <= 3
    )
    .sort((a, b) => like(b) - like(a) || Math.abs(diffDays(d, a.date)) - Math.abs(diffDays(d, b.date)))
  if (cand[0]) {
    used.add(cand[0].id)
    return true
  }
  return false
}

/** Zwrot w drodze zamknięty wpływem tej samej marki ±10 % w dniu zakupu albo później (T289; marka uproszczona – Z). */
function returnArrived(r, t) {
  const a = t.awaitReturn.amount
  const brand = norm(t.counterparty).slice(0, 8)
  return r.ops.some((x) => x.id !== t.id && x.date >= t.date && x.amount > 0 && (x.kind === 'income' || x.kind === 'expense') && Math.abs(x.amount - a) <= 0.1 * a && brand.length >= 3 && norm(x.counterparty).startsWith(brand))
}

export function radarOf(r, input, today, st, nowMs = Date.parse(`${today}T12:00:00Z`)) {
  const end = addDays(today, 90)
  const ev = []
  const bsm = monthOf(r.budgetStart)
  const curMonth = monthOf(today)
  for (let m = addMonths(curMonth, 1); `${m}-01` <= end; m = addMonths(m, 1)) ev.push({ dzien: `${m}-01`, rodzaj: 'pensja', kwota: r.salaryOf(m), opis: 'z osłon do energii' })
  for (const c of r.containers.values()) {
    if (!c.loanId) {
      for (let m = curMonth; `${m}-01` <= end; m = addMonths(m, 1)) {
        if (!aliveIn(c, m, bsm) || !isDueMonth(c, m)) continue
        const due = payDayOf(r, c, m) // T208: dzień z historii (opłata okresowa raz – w dniu z historii)
        if (due > end || duePaid(r, c, due)) continue
        const overdue = due < today
        if (overdue && m !== curMonth) continue
        ev.push({
          dzien: due,
          dzienSaldo: overdue ? today : due,
          termin: due,
          rodzaj: (c.cycleMonths ?? 1) > 1 ? 'asteroida' : 'kontener',
          kwota: -amountIn(c, m),
          opis: c.name + (overdue ? ` (termin ${due} – niezapłacona, liczona dziś – T274)` : ''),
          konto: c.accountId,
          zbiornik: (c.cycleMonths ?? 1) > 1 ? st.T.get(c.id) ?? 0 : null
        })
      }
    }
    // u2 (C10): koniec kontenera z `until` – ostatnia płatność (T273 „Radar end”: potem ładownia lżejsza o X/mies.)
    const life = lifeOf(c, bsm)
    if (c.until && !life.never) {
      const last = payDayOf(r, c, c.until)
      if (last >= today && last <= end) ev.push({ dzien: last, rodzaj: 'koniec', kwota: null, opis: `${c.name} – ostatnia płatność, potem ładownia lżejsza o ${kw(monthlyWeight(c, c.until)).zl}/mies.`, konto: null })
    }
  }
  // u2 (C10): boje – także dni po terminie (do 30 dni, T273); zrobione albo dopasowane do operacji pomijane
  const used = new Set()
  for (const s of input.scheduled) {
    for (const d of buoyDays(s, addDays(today, -30), end)) {
      if (buoyDone(r, s, d, used)) continue
      const late = d < today
      ev.push({ dzien: d, dzienSaldo: late ? today : d, termin: d, rodzaj: 'boja', kwota: s.amount, opis: s.name + (late ? ` · po terminie ${diffDays(d, today)} dni` : ''), konto: s.accountId })
    }
  }
  for (const l of input.loans) {
    if (l.closedAt) continue
    const ls = r.loansState.get(l.id)
    let paid = l.direction === 'given' ? ls.received : ls.paid
    for (const x of l.schedule ?? []) {
      const p = Math.min(paid, x.amount)
      paid -= p
      if (p >= x.amount || x.date > end) continue
      ev.push({
        dzien: x.date,
        dzienSaldo: x.date < today ? today : x.date,
        termin: x.date,
        rodzaj: l.direction === 'given' ? 'spodziewana spłata' : 'rata własna',
        kwota: (l.direction === 'given' ? 1 : -1) * (x.amount - p),
        opis: `${l.name}${x.date < today ? ` (termin ${x.date}, zaległa od ${addDays(x.date, 3)})` : ''}`,
        konto: l.accountId
      })
    }
  }
  // zwroty w drodze (T289): po terminie – dziś (u2, C10); bez konta – salda kont naprzód na nich nie polegają
  for (const t of r.ops) {
    const a = t.awaitReturn
    if (!a || a.closedAt || returnArrived(r, t)) continue
    if (a.until > end) continue
    const late = a.until < today
    ev.push({ dzien: late ? today : a.until, termin: a.until, rodzaj: 'zwrot w drodze', kwota: a.amount, opis: `${t.counterparty}${late ? ` (nie dotarł – po terminie ${diffDays(a.until, today)} dni)` : ''}`, konto: null })
  }
  const pitYear = Number(today.slice(0, 4)) + (today.slice(5) > '04-30' ? 1 : 0)
  if (today >= `${pitYear}-02-01` && today <= `${pitYear}-04-30`) ev.push({ dzien: `${pitYear}-04-30`, rodzaj: 'PIT-38', kwota: null, opis: `termin PIT-38 (widoczny od ${pitYear}-02-01, bez kwoty)` })
  // pozycje po terminie w swoim dniu (lista i osłony po zdarzeniu), w saldach naprzód – dziś (T274); w jednym dniu spłaty
  // przed bojami i pensją (Z)
  const rank = (e) => (e.rodzaj === 'spodziewana spłata' ? 0 : e.rodzaj === 'pensja' ? 2 : 1)
  ev.sort((a, b) => (a.dzien < b.dzien ? -1 : a.dzien > b.dzien ? 1 : rank(a) - rank(b)))

  // osłony po zdarzeniach (T275): od dzisiejszych warstw; pensja z osłon, brak – z kadłuba (D14), dalej częściowa;
  // boja-wydatek z osłon (kadłub, gdy brakuje); boja-wpływ w kolejności D13 (cele aktywne w chwili liczenia – u2, C9)
  let S = st.S
  let H = st.H
  const G = new Map(st.G)
  const sT = r.shieldTarget(curMonth)
  const hT = r.hullTarget(curMonth)
  const take = (x) => {
    const a = Math.min(x, Math.max(S, 0))
    S -= a
    const b = Math.min(x - a, Math.max(H, 0))
    H -= b
    return x - a - b
  }
  for (const e of ev) {
    let shown = false
    if (e.rodzaj === 'pensja') {
      e.niewyplacono = take(e.kwota)
      shown = true
    } else if (e.rodzaj === 'boja' && e.kwota != null) {
      if (e.kwota < 0) {
        const left = take(-e.kwota)
        if (left > 0) S -= left
      } else {
        let rest = e.kwota
        const toS = sT == null ? rest : Math.min(rest, Math.max(0, sT - S))
        S += toS
        rest -= toS
        if (rest > 0 && hT != null) {
          const toH = Math.min(rest, Math.max(0, hT - H))
          H += toH
          rest -= toH
          const list = [...r.goals.values()]
            .map((g) => ({ g, s: goalAt(g, nowMs) }))
            .filter((x) => x.s && !x.s.archived && x.s.target > 0)
            .sort((a, b) => a.s.priority - b.s.priority || (a.g.id < b.g.id ? -1 : 1))
          for (const { g, s } of list) {
            const x = Math.min(rest, Math.max(0, s.target - (G.get(g.id) ?? 0)))
            G.set(g.id, (G.get(g.id) ?? 0) + x)
            rest -= x
          }
        }
        S += rest
      }
      shown = true
    } else if (e.rodzaj === 'spodziewana spłata') {
      S += e.kwota
      shown = true
    }
    e.oslonyPo = shown ? kw(S) : null
    e.kadlubPo = shown ? kw(H) : null
  }

  // salda kont naprzód (T274): dzisiejsze saldo + płatności Radaru z kontem (zaległe – dziś) + operacje z późniejszą datą
  const naprzod = []
  for (const a of input.settings.accounts ?? []) {
    if (a.archived) continue
    let bal = r.balances.get(a.id) ?? 0
    const start = bal
    let min = bal
    let minDay = today
    let brak = null
    const flows = ev.filter((e) => e.konto === a.id && e.kwota != null && e.rodzaj !== 'pensja' && e.rodzaj !== 'zwrot w drodze').map((e) => [e.dzienSaldo ?? e.dzien, e.kwota, e.opis])
    for (const t of r.ops) if (t.accountId === a.id && t.date > today && t.date <= end) flows.push([t.date, t.amount, t.counterparty])
    flows.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))
    for (const [d, x, opis] of flows) {
      bal += x
      if (bal < min) {
        min = bal
        minDay = d
      }
      if (bal < 0 && start >= 0 && !brak) brak = { dzien: d, brakuje: kw(-bal), przyczyna: opis }
    }
    naprzod.push({ konto: a.name, dzis: kw(start), za90dni: kw(bal), minimum: kw(min), minimumDzien: minDay, brak })
  }
  for (const e of ev) {
    e.kwota = kw(e.kwota)
    if (e.zbiornik != null) e.zbiornik = kw(e.zbiornik)
    if (e.niewyplacono != null) e.niewyplacono = kw(e.niewyplacono)
  }
  return {
    okno: { od: today, do: end },
    zdarzenia: ev,
    saldaKontNaprzod: naprzod,
    uwaga: 'u2: osłony i kadłub po zdarzeniach od dzisiejszych warstw (T275, bez łupów; cele aktywne w chwili liczenia); dzień płatności z historii (T208); okresowe – cykl wg T135; płatności i boje po terminie liczone dziś (T273, T274); koniec kontenera (T273); salda kont naprzód bez wydatków codziennych'
  }
}
