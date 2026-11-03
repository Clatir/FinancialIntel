/**
 * The audit's area IM / SA (import from mBank, balances): synthetic bank files built on the persona „rok” and the helpers
 * of its runs. Files: C:\FI-audyt\pliki\im (never in C:\FI-audyt\pliki itself – the persona's last import folder, watched
 * by the app). Nothing here changes lab.ts or persona.ts.
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, type ElectronApplication, type Page } from '@playwright/test'
import { recordRelPath, type Collection } from '../../src/shared/paths'
import { SCHEMAS, serializeRecord } from '../../src/shared/records'
import { records } from '../e2e/files'
import { LAB, answerDialogs, shot, text } from './lab'
import { cp1250, plAmount, rowName, type BankEvent } from './persona'

export const PLIKI = join(LAB, 'pliki', 'im')
export const MBANK = '01KDEFACC00000000000000001'
export const WALLET = '01KDEFACC00000000000000002'
export const CASH = '01KDEFACC00000000000000003'
export const SAVINGS = '01KAZ900000000000000000001'
export const ANNA = '01KDEFMEM00000000000000001'
export const MAREK = '01KAZ200000000000000000003'
export const TATA = '01KAZ910000000000000000001'
export const BABCIA = '01KAZ910000000000000000002'
export const MAMA = '01KAZ910000000000000000003'
export const ARCH_CAT = '01KAZ920000000000000000001'

const P = JSON.parse(readFileSync(join(LAB, 'stany', 'rok.persona.json'), 'utf8')) as { history: BankEvent[]; recent: BankEvent[]; historyEnd: string }
export const HISTORY_END_BALANCE = 6979678
export const ACCT = '12 1140 2004 0000 3102 0000 0001'

// ------------------------------------------------------------------ bank rows

/** A row of the list of operations: the description as mBank writes it. */
export interface LRow {
  date: string
  desc: string
  cat?: string
  amount: number
  pending?: boolean
  /** Currency other than PLN (a row FI must leave out). */
  currency?: string
  /** A date as written (a broken one). */
  rawDate?: string
}

const sp = (n: number) => ' '.repeat(n)
export const cardL = (date: string, name: string, amount: number, o: { cat?: string; pending?: boolean; web?: boolean; op?: string } = {}): LRow => ({
  date,
  desc: `${name}  ${o.op ?? (o.web ? 'ZAKUP PRZY UŻYCIU KARTY - INTERNET' : 'ZAKUP PRZY UŻYCIU KARTY W KRAJU')}${sp(40)}${o.pending ? 'transakcja nierozliczona' : ''}`,
  cat: o.cat,
  amount,
  pending: o.pending
})
export const transferL = (date: string, who: string, title: string, op: string, amount: number, cat?: string): LRow => ({
  date,
  desc: `${who}, ${title}${sp(30)}${op}${sp(30)}21 1050 0000 0000 0000 0000 0002  `,
  cat,
  amount
})
export const rawL = (date: string, desc: string, amount: number, cat?: string): LRow => ({ date, desc, amount, cat })

/** A persona's history event written as the list of operations writes it (as rok-nowe-lista.csv). */
export function personaL(e: BankEvent, pending = false): LRow {
  const what = e.op.startsWith('ZAKUP') ? 'ZAKUP PRZY UŻYCIU KARTY W KRAJU' : e.op
  return { date: e.date, desc: `${rowName(e)}  ${what}${sp(40)}${pending ? 'transakcja nierozliczona' : ''}`, cat: e.bankCategory, amount: e.amount, pending }
}

const plDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`

export function listaText(rows: readonly LRow[], from: string, to: string, o: { acct?: string; client?: string } = {}): string {
  const lines = [
    'mBank S.A. Bankowość Detaliczna;;;',
    '#Klient;;;',
    `${o.client ?? 'JAN KAPITAN'};;;`,
    ';;;',
    'Lista operacji;;;',
    ';;;',
    '#Za okres:;;;',
    `${plDate(from)};${plDate(to)};;`,
    ';;;',
    '#dla rachunków:;;;',
    `eKonto - ${o.acct ?? ACCT};;;`,
    ';;;',
    '#Data operacji;#Opis operacji;#Kategoria;#Kwota'
  ]
  for (const r of [...rows].sort((a, b) => b.date.localeCompare(a.date)))
    lines.push(`${r.rawDate ?? plDate(r.date)};${r.desc};${r.cat ?? ''};${plAmount(r.amount)} ${r.currency ?? 'PLN'}`)
  return `${lines.join('\r\n')}\r\n`
}

/** A row of the account history. */
export interface HRow {
  date: string
  booked?: string
  op: string
  title: string
  who: string
  acct?: string
  amount: number
  /** The row is left out of the file but its balance moves (a gap in the chain). */
  gap?: boolean
}

export const cardH = (date: string, merchant: string, amount: number, city = 'TESTOWO', txDate = date): HRow => ({
  date,
  op: amount < 0 ? 'ZAKUP PRZY UŻYCIU KARTY' : 'POS ZWROT TOWARU',
  title: `${merchant.padEnd(19)}/${city}                                           DATA TRANSAKCJI: ${txDate}`,
  who: '  ',
  acct: "''",
  amount
})
export const fromPersonaH = (e: BankEvent): HRow => ({ date: e.date, op: e.op, title: e.title, who: e.who, acct: e.acct, amount: e.amount })

export function historiaText(rows: readonly HRow[], from: string, to: string, opening: number, o: { acct?: string } = {}): { text: string; end: number } {
  let balance = opening
  const lines = [
    'mBank S.A. Bankowość Detaliczna;',
    '#Klient;',
    'JAN KAPITAN;',
    '#Numer rachunku;',
    `${o.acct ?? ACCT};`,
    '#Za okres:;',
    `${plDate(from)};${plDate(to)};`,
    '#Data księgowania;#Data operacji;#Opis operacji;#Tytuł;#Nadawca/Odbiorca;#Numer konta;#Kwota;#Saldo po operacji;'
  ]
  for (const e of rows) {
    balance += e.amount
    if (e.gap) continue
    lines.push(`${plDate(e.booked ?? e.date)};${plDate(e.date)};${e.op};"${e.title}";"${e.who}";${e.acct ?? "''"};${plAmount(e.amount)};${plAmount(balance)};`)
  }
  lines.push(';', `#Saldo końcowe;${plAmount(balance)};`)
  return { text: `${lines.join('\r\n')}\r\n`, end: balance }
}

/** The persona's mBank balance at the end of a day (from the end of its history). */
export function personaBalanceAt(date: string): number {
  return HISTORY_END_BALANCE - P.history.filter((e) => e.date > date).reduce((s, e) => s + e.amount, 0)
}
export const personaHistory = (from: string, to: string): BankEvent[] => P.history.filter((e) => e.date >= from && e.date <= to)
export const personaRecent = (): BankEvent[] => P.recent

// ------------------------------------------------------------------ the files of the area

const OWN = 'PRZELEW WŁASNY'
const OUT = 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY'
const IN = 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY'

/** L1: the list of 19.10–01.11 – the persona's rows (history and the new week up to 01.11) and the area's own rows. */
export function l1Rows(): LRow[] {
  const persona = [...personaHistory('2026-10-19', '2026-10-26'), ...personaRecent().filter((e) => e.date <= '2026-11-01')].map((e) => personaL(e))
  const own: LRow[] = [
    // IM.7 – chains in two towns, Allegro three ways, SumUp, a station, names out of the dictionary
    cardL('2026-10-27', 'BIEDRONKA 1234 TESTOWO', -4560, { cat: 'Żywność i chemia domowa' }),
    cardL('2026-10-29', 'BIEDRONKA 4321 WARSZAWA', -3820, { cat: 'Żywność i chemia domowa' }),
    cardL('2026-10-27', 'PAYPRO SA *ALLEGRO', -5999, { web: true, cat: 'Osobiste - inne' }),
    cardL('2026-10-30', 'ALLEGRO.PL', -12000, { web: true, cat: 'Osobiste - inne' }),
    cardL('2026-10-29', 'SumUp *KAWIARNIA MOKKA', -1450, { cat: 'Jedzenie poza domem' }),
    cardL('2026-10-31', 'KAWIARNIA MOKKA', -1200, { cat: 'Jedzenie poza domem' }),
    cardL('2026-11-01', 'MOKKA KAWIARNIA', -1100, { cat: 'Jedzenie poza domem' }),
    cardL('2026-10-31', 'ORLEN STACJA 7777', -18000, { cat: 'Paliwo' }),
    // IM.4 – Polish letters
    cardL('2026-10-28', 'ŚLUSARZ ŁĘCKI', -8500, { cat: 'Remont i ogród' }),
    cardL('2026-10-29', 'Księgarnia Żaczek', -4290, { cat: 'Multimedia, książki i prasa' }),
    // IM.11 – keywords
    cardL('2026-10-27', 'CUKIERNIA SŁODKA', -1800, { cat: 'Jedzenie poza domem' }),
    cardL('2026-10-30', 'CUKIERNIA POD RÓŻĄ', -2400),
    cardL('2026-11-01', 'CUKIERNIA MAJA', -950),
    transferL('2026-10-30', 'MARIA KOWALSKA', 'CUKIERNIA - TORT URODZINOWY', OUT, -15000),
    cardL('2026-10-31', 'WETERYNARZ ZDROWY PIES', -9000, { cat: 'Zwierzęta' }),
    // IM.12 – a word for a rule; IM.13 – similar names
    cardL('2026-10-28', 'KURS JEZYKOWY ABC', -12000, { web: true, cat: 'Edukacja' }),
    cardL('2026-11-01', 'KURSY ONLINE XYZ', -3000, { web: true, cat: 'Edukacja' }),
    cardL('2026-10-30', 'AUTOMATSPEC', -450),
    cardL('2026-10-31', 'ZEGARMISTRZ ROMAN', -4000),
    cardL('2026-10-31', 'BAR MLECZNY', -2100),
    cardL('2026-11-01', 'PIZERIA NAPOLI', -4500, { cat: 'Jedzenie poza domem' }),
    cardL('2026-10-28', 'LIDL TESTOWO', -6610, { cat: 'Żywność i chemia domowa' }),
    cardL('2026-11-01', 'KAUFLAND 01', -7340, { cat: 'Żywność i chemia domowa' }),
    // IM.40 – two identical purchases of one day
    cardL('2026-10-30', 'ZABKA Z5555', -1234),
    cardL('2026-10-30', 'ZABKA Z5555', -1234),
    // IM.16 / IM.17 / IM.42 – pending rows
    cardL('2026-10-31', 'ZABKA Z1234', -2350, { pending: true }),
    cardL('2026-10-31', 'ORLEN STACJA 4123', -20000, { pending: true, cat: 'Paliwo' }),
    cardL('2026-10-30', 'KIOSK RUCH 12', -999, { pending: true }),
    cardL('2026-11-01', 'APTEKA GEMINI', -5000, { pending: true, cat: 'Zdrowie i uroda' }),
    // IM.19 – cash, fees, a return, types of operations, titles
    rawL('2026-10-29', `EURONET TESTOWO  WYPŁATA W BANKOMACIE${sp(40)}`, -20000, 'Wypłata gotówki'),
    rawL('2026-10-31', `PLANET CASH 22  BLIK WYPŁATA GOTÓWKI${sp(40)}`, -10000, 'Wypłata gotówki'),
    rawL('2026-11-01', `OPŁATA ZA KARTĘ${sp(40)}`, -700, 'Opłaty i odsetki'),
    rawL('2026-10-28', `PROWIZJA ZA ZAKUP  KEBAB ROMA${sp(40)}`, -150, 'Opłaty i odsetki'),
    cardL('2026-10-28', 'KEBAB ROMA', -3200, { cat: 'Jedzenie poza domem' }),
    cardL('2026-10-31', 'ROSSMANN 112', 2500, { op: 'ZWROT ZAKUPU KARTĄ', cat: 'Zdrowie i uroda' }),
    rawL('2026-10-29', `ZALANDO  PŁATNOŚĆ WEB - KOD MOBILNY${sp(40)}`, -19900, 'Odzież i obuwie'),
    rawL('2026-10-30', `MBANK KANTOR  SPRZEDAŻ WALUTY${sp(40)}`, 21540, 'Wpływy - inne'),
    transferL('2026-10-28', 'PIOTR SĄSIAD', 'ZA  OBIAD I KAWĘ', OUT, -6000),
    rawL('2026-10-29', `Zamówienie 12345, sklep Zabawki${sp(30)}PAYU SPÓŁKA AKCYJNA${sp(20)}PRZELEW MTRANSFER WYCHODZĄCY${sp(20)}21 1050 0000 0000 0000 0000 0009  `, -8900, 'Zakupy - inne'),
    // IM.18 / IM.21 – own transfers, a namesake
    transferL('2026-10-28', 'JAN KAPITAN', 'PRZELEW ŚRODKÓW', OWN, -30000),
    transferL('2026-10-29', 'JAN KAPITAN', 'NA PORTFEL XTB', OUT, -50000),
    transferL('2026-10-30', 'JAN KAPITAN', 'NA OSZCZĘDNOŚCI', OUT, -100000),
    transferL('2026-10-31', 'JAN KAPITAN', 'ZWROT Z OSZCZĘDNOŚCI', IN, 40000),
    transferL('2026-10-28', 'JAN NOWAK', 'ZA BILETY', OUT, -8000),
    transferL('2026-10-31', 'JAN NOWAK', 'ZWROT ZA PIZZĘ', IN, 4500),
    // IM.20 – XTB
    rawL('2026-10-27', `XTB SPÓŁKA AKCYJNA, XTB 4421987 Withdrawal${sp(20)}XTB SPÓŁKA AKCYJNA${sp(20)}${IN}${sp(20)}21 1050 0000 0000 0000 0000 0003  `, 150000, 'Wpływy - inne'),
    transferL('2026-10-30', 'XTB SPÓŁKA AKCYJNA', '4421987 DEPOSIT', OUT, -100000, 'Ubezpieczenia'),
    rawL('2026-10-31', `xtb.com  XTB.COM${sp(40)}BLIK ZAKUP E-COMMERCE${sp(20)}`, -31500, 'Ubezpieczenia'),
    // IM.23 / IM.25 – household
    transferL('2026-10-28', 'HALINA TESTOWA', 'ZWROT ZA ZAKUPY', IN, 7000, 'Wpływy - inne'),
    transferL('2026-10-31', 'HALINA TESTOWA', 'ZA ZAKUPY I NA PRZYSZŁOŚĆ', IN, 30000, 'Wpływy - inne'),
    transferL('2026-10-29', 'PIOTR TESTOWY', 'ZWROT ZA KURS XTB', IN, 20000, 'Wpływy - inne'),
    transferL('2026-11-01', 'PIOTR TESTOWY', 'OD TATY I BABCI', IN, 30000, 'Wpływy - inne'),
    cardL('2026-10-30', 'CASTORAMA TESTOWO', -30000, { cat: 'Remont i ogród' }),
    // IM.24 – a person out of the household: JAN NOWAK above
    // IM.26 – a loan repaid, the tax
    transferL('2026-10-30', 'TOMASZ KOLEGA', 'ZWROT POŻYCZKI', IN, 50000, 'Wpływy - inne'),
    transferL('2026-10-29', 'URZĄD SKARBOWY W TESTOWIE', 'PIT-38 2025', OUT, -123400, 'Podatki'),
    // IM.27 – a rule onto an archived category
    cardL('2026-10-29', 'MULTIKINO TESTOWO', -3800, { cat: 'Kultura' }),
    // IM.14 / IM.15 – rows of the entries typed by hand
    cardL('2026-11-01', 'ROSSMANN 112', -3333, { cat: 'Zdrowie i uroda' }),
    cardL('2026-11-01', 'HEBE 15', -4444, { cat: 'Zdrowie i uroda' }),
    cardL('2026-10-31', 'DINO TESTOWO 4', -2727, { cat: 'Żywność i chemia domowa' }),
    transferL('2026-10-30', 'STUDIO URODY ANETA', 'ZA STRZYŻENIE', OUT, -10000),
    cardL('2026-10-31', 'PIEKARNIA GROSZEK', -1580),
    cardL('2026-11-01', 'SKLEP OLA', -2300),
    cardL('2026-11-01', 'KFC 1234 WARSZAWA', -3290, { cat: 'Jedzenie poza domem' })
  ]
  return [...persona, ...own]
}

/** L2: the list of 26.10–03.11 – the L1 rows of 26.10–01.11 (the pending ones settled or gone) and new days. */
export function l2Rows(): LRow[] {
  const overlap = l1Rows().filter((r) => r.date >= '2026-10-26' && !r.pending)
  const settled: LRow[] = [
    cardL('2026-11-02', 'ZABKA Z1234', -2491), // +6 %, +2 days
    cardL('2026-11-02', 'ORLEN STACJA 4123', -21200, { cat: 'Paliwo' }), // +6 %, +2 days
    cardL('2026-11-03', 'APTEKA GEMINI', -5400, { cat: 'Zdrowie i uroda' }) // +8 %, deleted before
    // KIOSK RUCH 12 – gone (an authorisation cancelled)
  ]
  const fresh: LRow[] = [
    transferL('2026-11-02', 'NETIA SA', 'FAKTURA 11/2026', OUT, -6900, 'Internet i telefon'),
    cardL('2026-11-02', 'ORLEN STACJA 4123', -4000, { cat: 'Paliwo' }),
    cardL('2026-11-03', 'ORLEN STACJA 4123', -3500, { cat: 'Paliwo' }),
    cardL('2026-11-03', 'ORLEN STACJA 7777', -15000, { cat: 'Paliwo' }),
    cardL('2026-11-02', 'CASTORAMA TESTOWO', -15000, { cat: 'Remont i ogród' }),
    transferL('2026-11-03', 'TOMASZ KOLEGA', 'ZWROT POŻYCZKI 2', IN, 30000, 'Wpływy - inne'),
    transferL('2026-11-03', 'URZĄD SKARBOWY W TESTOWIE', 'PIT-38 2025 KOREKTA', OUT, -10000, 'Podatki'),
    cardL('2026-11-02', 'Księgarnia Żaczek', -2990, { cat: 'Multimedia, książki i prasa' }),
    cardL('2026-11-02', 'ŚLUSARZ ŁĘCKI', -3000, { cat: 'Remont i ogród' }),
    cardL('2026-11-03', 'KAUFLAND 01', -5120, { cat: 'Żywność i chemia domowa' }),
    cardL('2026-11-02', 'CUKIERNIA SŁODKA', -1600),
    cardL('2026-11-03', 'KURS JEZYKOWY ABC', -12000, { web: true, cat: 'Edukacja' }),
    cardL('2026-11-02', 'WETERYNARZ ZDROWY PIES', -4500, { cat: 'Zwierzęta' }),
    cardL('2026-11-03', 'BIEDRONKA 1234 TESTOWO', -5210, { cat: 'Żywność i chemia domowa' }),
    cardL('2026-11-03', 'ZEGARMISTRZ ROMAN', -2000)
  ]
  return [...overlap, ...settled, ...fresh]
}

/** H1: the account history of 27.10–02.11, its balances on from the persona's history (as FI has it). */
export function h1Rows(): HRow[] {
  const recent = personaRecent().map((e) => ({ ...fromPersonaH(e) }))
  return [
    ...recent,
    // IM.3 – one café on several days, two ways of writing the town; a return of goods; a transfer with a title
    cardH('2026-10-28', 'KAWIARNIA MOKKA', -1250, 'Testowo', '2026-10-27'),
    cardH('2026-10-30', 'KAWIARNIA MOKKA', -1400, 'TESTOWO', '2026-10-29'),
    cardH('2026-11-01', 'KAWIARNIA MOKKA', -990, 'testowo', '2026-11-01'),
    cardH('2026-11-01', 'ROSSMANN 112', 2000),
    { date: '2026-10-31', op: IN, title: 'ZWROT ZA BILETY DO KINA', who: 'JAN NOWAK', acct: "'21105000000000000000000004'", amount: 4500 },
    cardH('2026-10-29', 'CUKIERNIA SŁODKA', -1800)
  ].sort((a, b) => a.date.localeCompare(b.date))
}

/** The rows of a pending purchase list before H1 (IM.31 – H1 settles them). */
export function l0pRows(): LRow[] {
  return personaRecent()
    .filter((e) => e.pending)
    .map((e) => personaL(e, true))
}

export function writeFiles(): Record<string, string> {
  mkdirSync(PLIKI, { recursive: true })
  const out: Record<string, string> = {}
  const put = (name: string, data: Buffer | string) => {
    const p = join(PLIKI, name)
    writeFileSync(p, data)
    out[name] = p
  }
  const l1 = listaText(l1Rows(), '2026-10-19', '2026-11-01')
  put('L1.csv', cp1250(l1))
  put('L1-utf8.csv', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(l1, 'utf8')]))
  put('L1-utf8-bez-bom.csv', Buffer.from(l1, 'utf8'))
  put('L1-utf16.csv', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(l1, 'utf16le')]))
  put('L2.csv', cp1250(listaText(l2Rows(), '2026-10-26', '2026-11-03')))
  // H1 from the balance at the end of 26.10
  const h1 = historiaText(h1Rows(), '2026-10-27', '2026-11-02', personaBalanceAt('2026-10-26'))
  put('H1.csv', cp1250(h1.text))
  out['H1.end'] = plAmount(h1.end)
  put('L0p.csv', cp1250(listaText(l0pRows(), '2026-11-02', '2026-11-02')))
  // H2: history of 20.10–26.10 as the persona has it (FI changed before the import: one row deleted, one amount +1 zł,
  // one entry typed by hand without a row)
  const h2rows = personaHistory('2026-10-20', '2026-10-26').map(fromPersonaH)
  const h2 = historiaText(h2rows, '2026-10-20', '2026-10-26', personaBalanceAt('2026-10-19'))
  put('H2.csv', cp1250(h2.text))
  out['H2.end'] = plAmount(h2.end)
  // H3: the same with a gap in the chain of balances (one row of the middle left out)
  const h3rows = h2rows.map((r, i) => (i === Math.floor(h2rows.length / 2) ? { ...r, gap: true } : r))
  put('H3.csv', cp1250(historiaText(h3rows, '2026-10-20', '2026-10-26', personaBalanceAt('2026-10-19')).text))
  // HL: the history of the L1 period's new days (the same operations as L1, another description)
  const hlRows: HRow[] = [
    ...personaRecent()
      .filter((e) => e.date <= '2026-11-01')
      .map(fromPersonaH),
    cardH('2026-10-28', 'KURS JEZYKOWY ABC', -12000),
    cardH('2026-10-31', 'BAR MLECZNY', -2100),
    cardH('2026-10-30', 'ZABKA Z5555', -1234),
    cardH('2026-10-30', 'ZABKA Z5555', -1234),
    { date: '2026-10-28', op: OUT, title: 'ZA BILETY', who: 'JAN NOWAK', acct: "'21105000000000000000000002'", amount: -8000 }
  ].sort((a, b) => a.date.localeCompare(b.date))
  put('HL.csv', cp1250(historiaText(hlRows, '2026-10-27', '2026-11-01', personaBalanceAt('2026-10-26')).text))
  // R: another account number; K2: the savings account with the other side of the transfer (a day later)
  put('R.csv', cp1250(listaText([cardL('2026-11-02', 'BIEDRONKA 1234 TESTOWO', -3999), cardL('2026-11-02', 'ZABKA Z9876', -1299)], '2026-11-01', '2026-11-03', { acct: '12 1140 2004 0000 3102 0000 9876' })))
  put('K5555.csv', cp1250(listaText([cardL('2026-11-02', 'BIEDRONKA 1234 TESTOWO', -2999)], '2026-11-01', '2026-11-03', { acct: '12 1140 2004 0000 3102 0000 5555' })))
  put('K2.csv', cp1250(listaText([rawL('2026-10-31', `JAN KAPITAN, PRZELEW OSZCZĘDNOŚCI${sp(30)}PRZELEW WEWNĘTRZNY PRZYCHODZĄCY${sp(30)}12 1140 2004 0000 3102 0000 0001  `, 100000), cardL('2026-11-02', 'KAWIARNIA MOKKA', -1300)], '2026-10-29', '2026-11-03', { acct: '12 1140 2004 0000 3102 0000 5555' })))
  // X: another bank; Z: a plain CSV; U: broken; E: empty; W: a row in EUR and one with a broken date
  put('X.csv', cp1250('Data transakcji;Data księgowania;Dane kontrahenta;Tytuł;Nr rachunku;Kwota transakcji (waluta rachunku);Waluta\r\n2026-10-30;2026-10-30;"SKLEP";"ZAKUP";"";-12,00;PLN\r\n'))
  put('Z.csv', 'imie;nazwisko;miasto\r\nJan;Kowalski;Testowo\r\nAnna;Nowak;Testowo\r\n')
  put('U.csv', Buffer.concat([cp1250('mBank S.A. Bankowość Detaliczna;;;\r\n#Klient;;;\r\nJAN KAPITAN;;;\r\n#Za okres:;;;\r\n'), Buffer.from([0x00, 0xff, 0x00, 0x13, 0x88, 0x00, 0x00, 0x1b, 0x7f]), cp1250(';#Data oper\r\n')]))
  put('E.csv', '')
  const w = listaText(
    [cardL('2026-10-30', 'BIEDRONKA 1234 TESTOWO', -2210), { ...cardL('2026-10-31', 'BOOKING.COM', -12000), currency: 'EUR' }, { ...cardL('2026-10-31', 'ZABKA Z1234', -999), rawDate: '31.13.2026' }, cardL('2026-11-01', 'LIDL TESTOWO', -4410)],
    '2026-10-30',
    '2026-11-01'
  )
  put('W.csv', cp1250(w))
  // S: similar names (IM.13): a typo, a cut name, the same words, two bars, two chains
  put(
    'S.csv',
    cp1250(
      listaText(
        [
          cardL('2026-11-01', 'PIZERIA NAPOLI', -4500),
          cardL('2026-11-02', 'PIZZERIA NAPOLI', -5200),
          cardL('2026-11-01', 'ZEGARMISTRZ ROMAN', -4000),
          cardL('2026-11-02', 'ZEGARMISTRZ ROMAN KOWAL', -3000),
          cardL('2026-11-01', 'KAWIARNIA MOKKA', -1200),
          cardL('2026-11-02', 'MOKKA KAWIARNIA', -1100),
          cardL('2026-11-01', 'BAR POD LIPA', -3100),
          cardL('2026-11-02', 'BAR MLECZNY', -2100),
          cardL('2026-11-01', 'LIDL TESTOWO', -6610),
          cardL('2026-11-02', 'KAUFLAND 01', -7340),
          cardL('2026-11-02', 'PRACOWNIA SZEWSKA TESTOWO', -2500),
          cardL('2026-11-01', 'PRACOWNIA SZEWSKA', -1500)
        ],
        '2026-11-01',
        '2026-11-02'
      )
    )
  )
  // L0-znane: the persona's history rows of 20.10–26.10 as a list – nothing new
  put('L0-znane.csv', cp1250(listaText(personaHistory('2026-10-20', '2026-10-26').map((e) => personaL(e)), '2026-10-20', '2026-10-26')))
  return out
}

/** G: a file over 20 MB (written only when a run needs it). */
export function writeBig(): string {
  const p = join(PLIKI, 'G.csv')
  const head = listaText([], '2026-01-01', '2026-11-01')
  const row = `${cardL('2026-10-30', 'BIEDRONKA 1234 TESTOWO', -2210).desc}`
  const lines: string[] = [head]
  let size = head.length
  while (size < 21 * 1024 * 1024) {
    const l = `30.10.2026;${row};;-22,10 PLN\r\n`
    lines.push(l)
    size += l.length
  }
  writeFileSync(p, cp1250(lines.join('')))
  return p
}

// ------------------------------------------------------------------ states

export function writeRecord(dir: string, collection: Collection, raw: Record<string, unknown>): Record<string, unknown> {
  const rec = SCHEMAS[collection].parse(raw) as unknown as Record<string, unknown>
  const file = join(dir, recordRelPath(collection, rec as never))
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, serializeRecord(collection, rec as never))
  return rec
}

const stamp = '2026-11-02T18:00:00.000Z'
export function tx(id: string, o: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id,
    createdAt: stamp,
    updatedAt: stamp,
    updatedBy: 'LAPTOP-KAPITANA',
    time: null,
    accountId: MBANK,
    kind: 'expense',
    categoryId: null,
    counterparty: '',
    note: '',
    ...o
  }
}

export function readFi(dataDir: string): { settings: Record<string, any> } & Record<string, unknown> {
  return JSON.parse(readFileSync(join(dataDir, 'fi.json'), 'utf8'))
}
export function writeFi(dataDir: string, fi: unknown): void {
  writeFileSync(join(dataDir, 'fi.json'), `${JSON.stringify(fi, null, 2)}\n`)
}

/**
 * The state of the area's main import run: on top of „rok” – a savings account of mBank (its number …5555), Mama / Tata
 * (asks) / Babcia (through Tata) with purchases they owe, a rule onto an archived category, a keyword „kebab”, entries
 * typed by hand for the rows of L1 (A–H and one by an own transfer).
 */
export function prepareImportState(dataDir: string): string[] {
  const done: string[] = []
  const fi = readFi(dataDir)
  const s = fi.settings
  s.accounts.push({ id: SAVINGS, name: 'mBank oszczędności', kind: 'bank', importFormat: 'mbank', archived: false })
  s.import.accountNumbers[SAVINGS] = '12114020040000310200005555'
  s.household.members.push(
    { id: MAMA, name: 'Mama', bankNames: ['HALINA TESTOWA'], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 } },
    { id: TATA, name: 'Tata', bankNames: ['PIOTR TESTOWY'], inflow: 'ask', archived: false, via: null, opening: { owed: 0, deposit: 0 } },
    { id: BABCIA, name: 'Babcia', bankNames: [], inflow: 'advance', archived: false, via: TATA, opening: { owed: 0, deposit: 0 } }
  )
  s.categories.push({ id: ARCH_CAT, name: 'kino (stare)', parentId: '01KDEFCAT00000000000000600', envelope: null, system: null, archived: true })
  s.import.rules.push(
    { id: '01KAZ930000000000000000001', match: 'multikino', mode: 'exact', direction: 'out', label: 'MULTIKINO', kind: 'expense', categoryId: ARCH_CAT, refundable: false, household: false, memberId: null, counterAccountId: null, learned: true, hits: 3, updatedAt: '2026-05-01T10:00:00.000Z' },
    { id: '01KAZ930000000000000000002', match: 'kebab', mode: 'keyword', direction: 'out', label: 'kebab', kind: 'expense', categoryId: '01KDEFCAT00000000000000102', refundable: false, household: false, memberId: null, counterAccountId: null, learned: false, hits: 0, updatedAt: '2026-05-01T10:00:00.000Z' }
  )
  writeFi(dataDir, fi)
  done.push('fi.json: konto „mBank oszczędności” (…5555), Mama (HALINA TESTOWA, reszta jako zaliczka), Tata (PIOTR TESTOWY, pytaj), Babcia (przez Tatę), kategoria zarchiwizowana „kino (stare)” z regułą MULTIKINO, słowo kluczowe „kebab” → na mieście')
  // Purchases the household owes: Mama 50 + 70 zł, Babcia 100 zł (Portfel XTB – not the mBank balance)
  const owe = (n: number, date: string, amount: number, who: string, name: string) =>
    writeRecord(dataDir, 'transactions', tx(`01KAZ94${String(n).padStart(19, '0')}`, { date, time: '12:00', accountId: WALLET, amount, categoryId: '01KDEFCAT00000000000000101', counterparty: name, refundable: true, memberId: who }))
  owe(1, '2026-10-20', -5000, MAMA, 'Zakupy dla Mamy 1')
  owe(2, '2026-10-22', -7000, MAMA, 'Zakupy dla Mamy 2')
  owe(3, '2026-10-21', -10000, BABCIA, 'Leki dla Babci')
  done.push('operacje (Portfel XTB) finansowane przez domowników: Mama 50,00 (20.10) i 70,00 (22.10), Babcia 100,00 (21.10)')
  // Entries typed by hand on mBank for the rows of L1
  const typed: Array<[string, Record<string, unknown>]> = [
    ['A', { date: '2026-10-27', time: '18:40', amount: -4560, counterparty: 'Biedronka', categoryId: '01KDEFCAT00000000000000101', note: 'notatka A – zakupy na weekend' }],
    ['B', { date: '2026-10-29', time: '10:15', amount: -3333, counterparty: 'Rossmann', categoryId: '01KDEFCAT00000000000000802', note: 'notatka B' }],
    ['C', { date: '2026-10-28', time: '11:00', amount: -4444, counterparty: 'Hebe', categoryId: '01KDEFCAT00000000000000802', note: 'notatka C' }],
    ['D', { date: '2026-10-31', time: '16:20', amount: -2727, counterparty: '', categoryId: '01KDEFCAT00000000000000101', note: '' }],
    ['E', { date: '2026-10-30', time: '13:00', amount: -10000, counterparty: 'Fryzjer', categoryId: '01KDEFCAT00000000000000803', note: '' }],
    ['F', { date: '2026-10-31', time: '07:30', amount: -1550, counterparty: 'Piekarnia Groszek', categoryId: '01KDEFCAT00000000000000101', note: '' }],
    ['G', { date: '2026-11-01', time: '12:10', amount: -2000, counterparty: 'Sklep', categoryId: '01KDEFCAT00000000000000101', note: '' }],
    ['H', { date: '2026-11-01', time: '19:05', amount: -3290, counterparty: 'KFC', categoryId: '01KDEFCAT00000000000000102', note: '' }],
    ['P', { date: '2026-10-28', time: '09:00', amount: -30000, counterparty: 'Przelew na lokatę', categoryId: null, note: '' }]
  ]
  typed.forEach(([k, o], i) => writeRecord(dataDir, 'transactions', tx(`01KAZ95${String(i + 1).padStart(19, '0')}`, o)))
  done.push(`wpisy ręczne mBank: ${typed.map(([k, o]) => `${k} ${o.counterparty || '(bez nazwy)'} ${o.amount} ${o.date}`).join('; ')}`)
  return done
}

// ------------------------------------------------------------------ observing

export class Obs {
  readonly file: string
  constructor(readonly run: string) {
    const dir = join(LAB, 'przebiegi', run)
    mkdirSync(dir, { recursive: true })
    this.file = join(dir, 'obs.txt')
    writeFileSync(this.file, `# ${run} ${new Date().toISOString()}\n`)
  }
  log(label: string, value: unknown): void {
    const v = typeof value === 'string' ? value : JSON.stringify(value, null, 1)
    appendFileSync(this.file, `\n## ${label}\n${v}\n`)
    console.log(`## ${label}\n${v.slice(0, 3000)}`)
  }
  async screen(page: Page, label: string, selector = 'body'): Promise<string> {
    const t = await text(page, selector).catch((e: Error) => `(brak: ${e.message.split('\n')[0]})`)
    this.log(label, t)
    return t
  }
  async shot(page: Page, id: string): Promise<void> {
    const f = await shot(page, id)
    this.log(`zrzut ${id}`, f)
  }
}

/** Opens a file in the Import screen through the file dialog; waits for the preview or the error. */
export async function openFile(app: ElectronApplication, page: Page, path: string): Promise<'file' | 'error'> {
  await page.keyboard.press('Control+3')
  await expect(page.getByTestId('page-import')).toBeVisible({ timeout: 60_000 })
  await answerDialogs(app, { paths: [path] })
  await page.getByTestId('import-pick').click()
  const res = await Promise.race([
    page
      .getByTestId('import-file')
      .waitFor({ timeout: 60_000 })
      .then(() => 'file' as const),
    page
      .getByTestId('import-error')
      .waitFor({ timeout: 60_000 })
      .then(() => 'error' as const)
  ])
  await page.waitForTimeout(800)
  return res
}

/** Drops bytes as a file on the panel „Plik z mBanku” (a File made in the window, as a drop gives it). */
export async function dropBytes(page: Page, name: string, data: Buffer | { size: number }): Promise<void> {
  const bytes = Buffer.isBuffer(data) ? Array.from(data) : null
  const size = Buffer.isBuffer(data) ? data.length : data.size
  await page.evaluate(
    ({ name, bytes, size }) => {
      const el = document.querySelector('[data-testid="import-file-panel"]')!
      const content = bytes ? new Uint8Array(bytes) : new Uint8Array(size)
      const file = new File([content], name, { type: 'text/csv' })
      const dt = new DataTransfer()
      dt.items.add(file)
      el.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }))
      el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
    },
    { name, bytes, size }
  )
}

export const counters = async (page: Page): Promise<Record<string, string>> => {
  const out: Record<string, string> = {}
  for (const k of ['new', 'merge', 'settle', 'known', 'deleted', 'excluded', 'moved', 'sides', 'other-format']) {
    const c = page.getByTestId(`import-count-${k}`)
    if (await c.count()) out[k] = (await c.first().innerText()).trim()
  }
  const run = page.getByTestId('import-run')
  if (await run.count()) out.run = (await run.innerText()).trim()
  return out
}

export const txs = (dataDir: string) => records(dataDir, 'transactions')

/** The visible toasts / status messages. */
export async function statuses(page: Page): Promise<string[]> {
  return page.getByRole('status').allInnerTexts().catch(() => [])
}

export const short = (t: Record<string, unknown>) =>
  `${t.date} ${t.time ?? '--:--'} ${t.accountId === MBANK ? 'mBank' : t.accountId === WALLET ? 'Portfel' : t.accountId === SAVINGS ? 'Oszcz' : String(t.accountId).slice(-3)} ${t.kind} ${t.amount} „${t.counterparty}” cat=${String(t.categoryId ?? '-').slice(-3)} mem=${String(t.memberId ?? '-').slice(-4)} note=${JSON.stringify(t.note ?? '')} bank=${t.bank ? `${(t.bank as Record<string, unknown>).pending ? 'P' : 'B'}:${(t.bank as Record<string, unknown>).source ?? ''}` : '-'}${t.counterAccountId ? ` →${String(t.counterAccountId).slice(-4)}` : ''}${t.inflowKind ? ` inflow=${t.inflowKind}` : ''}${(t.splits as unknown[])?.length ? ` splits=${JSON.stringify((t.splits as Array<Record<string, unknown>>).map((s) => [s.amount, String(s.memberId ?? '-').slice(-4), String(s.categoryId ?? '-').slice(-3)]))}` : ''}`

/**
 * The visible text of an element with the state of its fields: a select as „[chosen option]”, a checkbox „[x]” / „[ ]”,
 * an input „[value]”, a button „‹text›” – innerText would list every option of every select.
 */
export async function readable(page: Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel)
    if (!root) return `(brak ${sel})`
    const out: string[] = []
    const walk = (n: Node) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = (n.textContent ?? '').replace(/\s+/g, ' ')
        if (t.trim()) out.push(t)
        return
      }
      if (!(n instanceof HTMLElement)) return
      const cs = getComputedStyle(n)
      if (cs.display === 'none' || cs.visibility === 'hidden') return
      const block = /^(block|flex|grid|list-item|table|table-row)$/.test(cs.display)
      if (block) out.push('\n')
      if (n instanceof HTMLSelectElement) out.push(` [${n.options[n.selectedIndex]?.text ?? ''}${n.disabled ? ' (wył.)' : ''}] `)
      else if (n instanceof HTMLInputElement) out.push(n.type === 'checkbox' || n.type === 'radio' ? (n.checked ? ' [x] ' : ' [ ] ') : ` [${n.value || n.placeholder}${n.disabled ? ' (wył.)' : ''}] `)
      else if (n instanceof HTMLButtonElement) {
        const t = (n.innerText || n.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()
        out.push(` ‹${t}${n.disabled ? ' (wył.)' : ''}${n.title ? ` | ${n.title}` : ''}› `)
      } else n.childNodes.forEach(walk)
      if (block) out.push('\n')
    }
    walk(root)
    return out
      .join('')
      .replace(/[ \t]+/g, ' ')
      .replace(/ ?\n ?/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim()
  }, selector)
}

/** Opens every closed theme (and, with `groups`, every group) of the categorization. */
export async function expandAll(page: Page, groups = false): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const closed = page.locator('[data-testid="import-theme-toggle"][aria-label="Pokaż marki"]')
    const n = await closed.count()
    if (!n) break
    for (let k = n - 1; k >= 0; k--) await closed.nth(k).click()
  }
  if (groups) {
    const closed = page.locator('[data-testid="import-group-toggle"][aria-label="Pokaż operacje"]')
    const n = await closed.count()
    for (let k = n - 1; k >= 0; k--) await closed.nth(k).click()
  }
}

export const group = (page: Page, label: string) => page.locator(`[data-testid="import-group"][data-label="${label}"]`).first()
export const theme = (page: Page, label: string) => page.locator(`[data-testid="import-theme"][data-label="${label}"]`).first()

/** One point of a run: an error is the point's result (logged with a screenshot), the run goes on. */
export async function step(o: Obs, page: Page, id: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (e) {
    o.log(`${id} BŁĄD KROKU`, (e as Error).message.split('\n').slice(0, 6).join('\n'))
    await o.shot(page, `${id}-blad`).catch(() => undefined)
    await page.keyboard.press('Escape').catch(() => undefined)
  }
}

/** The categorization panel as text (themes opened). */
export async function catText(page: Page): Promise<string> {
  return readable(page, '[data-testid="import-groups"]')
}

/** Opens a file and imports it as it is (the decisions the app proposes); the result panel's text. */
export async function importAs(app: ElectronApplication, page: Page, userData: string, path: string): Promise<string> {
  await page.keyboard.press('Control+3')
  await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
  await openFile(app, page, path)
  await page.getByTestId('import-run').click()
  await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(800)
  void userData
  return readable(page, '[data-testid="import-done"]')
}
