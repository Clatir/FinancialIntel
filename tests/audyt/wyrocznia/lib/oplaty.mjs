// Terminy opłaty i ich płatności (T208, T135, T375, T376, T393, T394) – jedna reguła stanu w Ładowni i cykli
// zapłaconych silnika (rata zbiornika na przełomie miesiąca, „zapłacone” na Radarze). Z tekstu decyzji, bez kodu aplikacji.
import { addDays, addMonths, dayOfMonth, daysInMonth, monthOf, toWarsaw } from './daty.mjs'
import { amountIn, cycleOf, isDueMonth } from './silnik.mjs'

const naDzien = (m, dzien) => `${m}-${String(Math.min(dzien, daysInMonth(m))).padStart(2, '0')}`

/** Tolerancja ceny (T375, F9): 5 %, co najmniej 2 zł. */
const tolerancja = (kwota) => Math.max(Math.round(kwota * 0.05), 200)

/** Termin cyklu zawierającego miesiąc m (opłata miesięczna – ten miesiąc). */
const terminCyklu = (c, m) => {
  let x = m
  for (let g = 0; g < 120 && !isDueMonth(c, x); g++) x = addMonths(x, 1)
  return x
}

/** Życie opłaty w miesiącu m (T136): od `from` do `until`; zarchiwizowana – do końca miesiąca archiwizacji (bez daty – nigdy). */
function wZyciu(c, m) {
  if (c.archived && (!c.archivedAt || monthOf(toWarsaw(c.archivedAt).date) < m)) return false
  return (c.from == null || c.from <= m) && (c.until == null || m <= c.until)
}

/**
 * Dzień płatności dla terminów miesiąca m (T208, T376): środkowy (dolny) z ostatnich 6 płatności przed miesiącem – od dnia
 * ustawionego ręcznie (`dueAt`); bez nich dzień kontenera.
 */
export function dzienPlatnosci(c, platnosci, m) {
  const od = c.dueAt ? toWarsaw(c.dueAt).date : ''
  const dni = platnosci
    .filter((p) => p.date < `${m}-01` && p.date >= od)
    .slice(-6)
    .map((p) => dayOfMonth(p.date))
    .sort((a, b) => a - b)
  return dni.length ? dni[Math.floor((dni.length - 1) / 2)] : (c.dueDay ?? 1)
}

/**
 * Okno terminu w miesiącu m (T208, T135, T375): opłata miesięczna i co 2 miesiące – od 14 dni przed dniem płatności do
 * 14 dni przed następnym; opłata okresowa ≥ 3 mies. – od 1. dnia miesiąca przed miesiącem terminu. Płatność przed dniem
 * terminu (≥ 3 mies.: przed miesiącem terminu) – `wczesna`.
 */
export function oknoTerminu(c, m, dzien) {
  const termin = naDzien(m, dzien)
  if ((c.cycleMonths ?? 1) > 1 && cycleOf(c, m).length >= 3) return { m, termin, od: `${addMonths(m, -1)}-01`, wczesna: `${m}-01`, platnosci: [] }
  return { m, termin, od: addDays(termin, -14), wczesna: termin, platnosci: [] }
}

/**
 * Terminy opłaty z ich płatnościami (T375, T393, T394). `platnosci` – po dniu ({ id, date, amount }, kwota dodatnia);
 * `o` – { start (dzień startu budżetu albo null), miesiac (stan miesiąca), dzien (dzień płatności) }.
 *
 * Terminy budżetu: od dnia startu, od miesiąca dodania kontenera, w życiu opłaty, nie sprzed „Zapłacone poza budżetem” /
 * „Nadal płacę” (`aliveAt`; termin tego miesiąca zawsze). Płatność sprzed startu – terminy opłaty śledzonej od jej
 * pierwszej płatności (okno zaczęte po niej; T345, przegląd N2 4). Płatności po kolei: termin okna; przed dniem terminu,
 * gdy poprzedni niezapłacony – najstarszy niezapłacony (zaległa najpierw); poprzedni zapłacony – wcześniejsza następnego
 * (T135). Druga płatność okna: ostatnie płatności, które same dają kwotę terminu (minus tolerancja ceny), są jego –
 * wcześniejsze płacą najstarszy niezapłacony termin przed nim. Lista od startu (albo cyklu przed pierwszą płatnością
 * sprzed startu) do terminu po tym miesiącu; bez startu – tylko od tego miesiąca.
 */
export function terminyOplaty(c, platnosci, o) {
  const { start, miesiac, dzien } = o
  const pierwsza = platnosci[0]?.date ?? null
  const przedStartem = start && pierwsza && pierwsza < start ? pierwsza : null
  let od = start ? [monthOf(start), c.from ?? ''].sort().at(-1) : miesiac
  if (od > miesiac) od = miesiac
  if (przedStartem) {
    const cykl = cycleOf(c, monthOf(przedStartem))
    const wczesniej = addMonths(cykl.due, -cykl.length)
    if (wczesniej < od) od = wczesniej
  }
  const ostatni = terminCyklu(c, addMonths(miesiac, 1))
  const terminy = []
  for (let m = terminCyklu(c, od), n = 0; n < 1200; m = terminCyklu(c, addMonths(m, 1)), n++) {
    terminy.push(oknoTerminu(c, m, dzien))
    if (m > ostatni) break
  }
  const utworzony = c.createdAt ? monthOf(toWarsaw(c.createdAt).date) : ''
  const rozliczony = c.aliveAt ?? ''
  const sledzony = (t, kiedy) => {
    if (!wZyciu(c, t.m)) return false
    if (start && kiedy < start) return przedStartem != null && t.od > przedStartem
    if (start && t.termin < start) return false
    return t.m >= miesiac || (t.m >= utworzony && t.termin >= rozliczony)
  }
  const otwarty = (t, kiedy) => !t.platnosci.length && sledzony(t, kiedy)
  const potrzeba = (t) => (c.variable ? 1 : Math.max(1, amountIn(c, t.m) - tolerancja(amountIn(c, t.m))))
  const nadwyzka = (j) => {
    const t = terminy[j]
    if (t.platnosci.length < 2) return
    let k = t.platnosci.length
    let suma = 0
    do suma += t.platnosci[--k].amount
    while (k > 0 && suma < potrzeba(t))
    if (suma < potrzeba(t) || k === 0) return
    let reszta = t.platnosci.slice(0, k)
    for (let i = 0; i < j && reszta.length; i++) {
      const x = terminy[i]
      if (!otwarty(x, reszta[0].date)) continue
      let s = 0
      let n = 0
      while (n < reszta.length && s < potrzeba(x)) s += reszta[n++].amount
      if (s < potrzeba(x)) break
      x.platnosci.push(...reszta.slice(0, n))
      reszta = reszta.slice(n)
    }
    t.platnosci = [...reszta, ...t.platnosci.slice(k)]
  }
  const ile = terminy.length - 1
  let i = 0
  for (const p of platnosci) {
    if (p.date < terminy[0].od) continue
    while (i < ile && p.date >= terminy[i + 1].od) i++
    if (i >= ile) break
    let j = i
    if (i > 0 && p.date < terminy[i].wczesna && otwarty(terminy[i - 1], p.date)) {
      j = 0
      while (!otwarty(terminy[j], p.date)) j++
    }
    terminy[j].platnosci.push(p)
    nadwyzka(j)
  }
  return terminy.slice(0, ile)
}

/**
 * Cykle (miesiące terminów) opłaty zapłacone płatnościami sprzed dnia `przed` (T393): terminy zapłacone w stanie Ładowni
 * miesiąca m – na przełomie miesiąca (i w dniu startu) płatności sprzed niego, dziś – do dziś.
 */
export function cykleZaplacone(c, platnosci, przed, m, start) {
  const znane = platnosci.filter((p) => p.date < przed)
  if (!znane.length) return new Set()
  return new Set(terminyOplaty(c, znane, { start, miesiac: m, dzien: dzienPlatnosci(c, znane, m) }).filter((t) => t.platnosci.length).map((t) => t.m))
}
