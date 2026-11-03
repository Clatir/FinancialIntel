/**
 * Audit area KR: the bank files of its special states (C:\FI-audyt\pliki\kr) – no app is started.
 * - kr-dzis.csv: the persona's history (as rok-historia.csv) + two card purchases of today (−45,90 Biedronka, −12,00 Żabka).
 * - kr-krotka.csv: the persona's rows from 01.09 of this year to yesterday – two full months and the current one.
 * - kr-miesiac.csv: a synthetic history of 24 months (from the 1st of the month 24 months ago to yesterday): salary,
 *   rent, internet, Netflix, CityFit, a monthly power bill of a varying amount, a quarterly garage fee, a yearly car OC
 *   (paid this month before today), a yearly motorcycle OC (due in 2 months), groceries, fuel, a pet shop, a florist
 *   (no category), a clothes purchase and its return of 40 zł this month.
 * Run: `npx playwright test -c playwright.audyt.config.ts kr-pliki`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, daysInMonth, warsawNow } from '../../src/shared/calc/dates'
import { FILES, KR_FILES } from './kr-pomoc'
import { buildPersona, cp1250, historiaCsv, type BankEvent } from './persona'

const zl = (v: number) => Math.round(v * 100)
const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay()
const weekday = (d: string) => (dow(d) === 6 ? addDays(d, 2) : dow(d) === 0 ? addDays(d, 1) : d)
const dayIn = (m: string, day: number) => `${m}-${String(Math.min(day, daysInMonth(m))).padStart(2, '0')}`

const card = (date: string, merchant: string, amount: number): BankEvent => ({
  ref: `kr-${date}-${merchant}`,
  date,
  op: amount < 0 ? 'ZAKUP PRZY UŻYCIU KARTY' : 'ZWROT ZAKUPU KARTĄ',
  title: `${merchant.padEnd(19)}/TESTOWO                                           DATA TRANSAKCJI: ${date}`,
  who: '  ',
  acct: "''",
  amount
})
const out = (date: string, who: string, title: string, amount: number): BankEvent => ({
  ref: `kr-${date}-${who}`,
  date,
  op: 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY',
  title,
  who,
  acct: "'21105000000000000000000002'",
  amount: -Math.abs(amount)
})
const inc = (date: string, who: string, title: string, amount: number): BankEvent => ({
  ref: `kr-${date}-${who}-in`,
  date,
  op: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY',
  title,
  who,
  acct: "'21105000000000000000000003'",
  amount: Math.abs(amount)
})

test('KR: pliki z banku do stanów szczególnych', () => {
  const today = warsawNow().date
  const P = buildPersona(today)
  mkdirSync(KR_FILES, { recursive: true })
  const lines: string[] = [`dziś ${today}`]

  // The persona's history regenerated must be the very file of the lab (rok-historia.csv).
  const hist = historiaCsv(P.history, P.start, P.historyEnd, P.openingMbank)
  const same = Buffer.compare(cp1250(hist.text), readFileSync(join(FILES, 'rok-historia.csv'))) === 0
  lines.push(`rok-historia.csv odtworzona bajt w bajt: ${same}; saldo końcowe ${hist.end / 100}`)
  expect(same).toBe(true)
  // The bank's balance now (booked rows of the recent file on top of the history's end) – the typical wizard's mBank.
  const booked = P.recent.filter((e) => !e.pending)
  const nowBalance = hist.end + booked.reduce((s, e) => s + e.amount, 0)
  lines.push(`rok-nowe-historia: ${booked.length} wierszy zaksięgowanych, saldo po nich ${nowBalance / 100}; nierozliczone: ${P.recent.filter((e) => e.pending).map((e) => `${e.date} ${e.amount / 100}`).join(', ')}`)

  // kr-dzis.csv
  const todays = [card(today, 'BIEDRONKA 1234', -zl(45.9)), card(today, 'ZABKA Z1234', -zl(12))]
  const dzis = historiaCsv([...P.history, ...todays], P.start, today, P.openingMbank)
  writeFileSync(join(KR_FILES, 'kr-dzis.csv'), cp1250(dzis.text))
  lines.push(`kr-dzis.csv: ${P.history.length + 2} wierszy, saldo końcowe ${dzis.end / 100}, saldo przed dziś ${hist.end / 100}`)

  // kr-krotka.csv
  const from = `${today.slice(0, 4)}-09-01`
  const yesterday = addDays(today, -1)
  const shortRows = [...P.history.filter((e) => e.date >= from), ...booked.filter((e) => e.date <= yesterday)].sort((a, b) => a.date.localeCompare(b.date))
  const openShort = P.openingMbank + P.history.filter((e) => e.date < from).reduce((s, e) => s + e.amount, 0)
  const krotka = historiaCsv(shortRows, from, yesterday, openShort)
  writeFileSync(join(KR_FILES, 'kr-krotka.csv'), cp1250(krotka.text))
  lines.push(`kr-krotka.csv: ${shortRows.length} wierszy ${shortRows[0]?.date}…${shortRows.at(-1)?.date}, saldo końcowe ${krotka.end / 100}`)

  // kr-miesiac.csv (synthetic, deterministic)
  const M = today.slice(0, 7)
  const first = addMonths(M, -24)
  const ev: BankEvent[] = []
  let seed = 20261103
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
  const between = (a: number, b: number) => Math.round((a + (b - a) * rnd()) * 100)
  for (let m = first; m < M; m = addMonths(m, 1)) {
    ev.push(card(dayIn(m, 1), 'CITYFIT', -zl(129)))
    ev.push(card(dayIn(m, 5), 'NETFLIX.COM', -zl(49)))
    ev.push(inc(weekday(dayIn(m, 10)), 'FIRMA TESTOWA SP. Z O.O.', 'WYNAGRODZENIE', zl(7500)))
    ev.push(out(weekday(dayIn(m, 10)), 'WSPÓLNOTA MIESZKANIOWA TESTOWA 1', `CZYNSZ ${m}`, zl(1450)))
    ev.push(out(weekday(dayIn(m, 15)), 'NETIA SA', `FAKTURA ${m}`, zl(60)))
    ev.push(out(weekday(dayIn(m, 20)), 'TAURON SPRZEDAŻ SP. Z O.O.', `ENERGIA ${m}`, between(180, 260)))
    if ([1, 4, 7, 10].includes(Number(m.slice(5)))) ev.push(out(weekday(dayIn(m, 15)), 'SPÓŁDZIELNIA GARAŻOWA TESTOWO', `OPLATA ZA GARAZ ${m}`, zl(300)))
    if (m.slice(5) === '01') ev.push(out(weekday(dayIn(m, 20)), 'WARTA SA', 'OC MOTOCYKLA', zl(480)))
    if (m.slice(5) === '11' && m !== M) ev.push(out(weekday(dayIn(m, 2)), 'PZU SA', 'OC POJAZDU', zl(1240)))
    for (const d of [3, 7, 11, 14, 18, 22, 26]) ev.push(card(dayIn(m, d), 'BIEDRONKA 1234', -between(55, 140)))
    for (const d of [8, 23]) ev.push(card(dayIn(m, d), 'ORLEN STACJA 4123', -between(170, 240)))
    ev.push(card(dayIn(m, 12), 'ZOOPLUS', -between(120, 180)))
    ev.push(card(dayIn(m, 17), 'KWIACIARNIA ROZA', -between(40, 90)))
  }
  // This month before today: the gym, groceries, fuel, a return of clothes (40 zł of a purchase of 199,99 zł last month)
  // and the yearly car OC paid on the 2nd.
  const prev = addMonths(M, -1)
  ev.push(card(dayIn(prev, 28), 'ZARA POLSKA', -zl(199.99)))
  ev.push(card(`${M}-01`, 'CITYFIT', -zl(129)))
  ev.push(card(`${M}-01`, 'BIEDRONKA 1234', -zl(85.4)))
  ev.push(card(`${M}-02`, 'ORLEN STACJA 4123', -zl(210)))
  ev.push(card(`${M}-02`, 'ZARA POLSKA', zl(40)))
  ev.push(out(`${M}-02`, 'PZU SA', 'OC POJAZDU', zl(1240)))
  ev.sort((a, b) => a.date.localeCompare(b.date))
  const miesiac = historiaCsv(
    ev.filter((e) => e.date < today),
    `${first}-01`,
    yesterday,
    zl(12000)
  )
  writeFileSync(join(KR_FILES, 'kr-miesiac.csv'), cp1250(miesiac.text))
  const thisMonth = ev.filter((e) => e.date >= `${M}-01` && e.date < today)
  lines.push(`kr-miesiac.csv: ${ev.length} wierszy ${ev[0]?.date}…${ev.at(-1)?.date}, saldo końcowe ${miesiac.end / 100}`)
  lines.push(`  ten miesiąc przed dziś: ${thisMonth.map((e) => `${e.date} ${e.who.trim() || e.title.split('/')[0]!.trim()} ${e.amount / 100}`).join('; ')}`)
  const tauron = ev.filter((e) => e.who.startsWith('TAURON')).slice(-12).map((e) => -e.amount / 100)
  lines.push(`  TAURON ostatnie 12: ${tauron.join(', ')}`)
  // Averages of the full months the wizard will read (for the report): costs per category of the last 3 and 6 months.
  const byCat = (m: string, f: (e: BankEvent) => boolean) => -ev.filter((e) => e.date.startsWith(m) && f(e)).reduce((s, e) => s + e.amount, 0) / 100
  for (const k of [1, 2, 3, 4, 5, 6]) {
    const m = addMonths(M, -k)
    lines.push(
      `  ${m}: Biedronka ${byCat(m, (e) => e.title.startsWith('BIEDRONKA')).toFixed(2)}, Orlen ${byCat(m, (e) => e.title.startsWith('ORLEN')).toFixed(2)}, Zooplus ${byCat(m, (e) => e.title.startsWith('ZOOPLUS')).toFixed(2)}, Kwiaciarnia ${byCat(m, (e) => e.title.startsWith('KWIACIARNIA')).toFixed(2)}, Zara ${byCat(m, (e) => e.title.startsWith('ZARA')).toFixed(2)}, Tauron ${byCat(m, (e) => e.who.startsWith('TAURON')).toFixed(2)}, wszystkie wydatki ${byCat(m, (e) => e.amount < 0).toFixed(2)}`
    )
  }
  writeFileSync(join(KR_FILES, 'pliki.log'), `${lines.join('\n')}\n`)
  console.log(lines.join('\n'))
})
