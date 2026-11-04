/**
 * Synthetic files of mBank (no user's data – T44): the same card purchases as the list of operations and as the
 * account history writes them (B5 – their descriptions differ, so their rows' keys), in the layout of
 * `tests/fixtures/mbank/` (CRLF); transfers between people in the list of operations. Dates given by the caller (E2E:
 * from `warsawNow()` – testy.md).
 */
export interface CsvBuy {
  /** RRRR-MM-DD */
  date: string
  /** Złote, positive = spent. */
  amount: number
  name: string
  pending?: boolean
}

export const CSV_NUMBER = '11 1111 1111 1111 1111 1111 1111'

/** A transfer between people (D80, B34): the other side's name and the title; złote, positive = money in. */
export interface CsvTransfer {
  /** RRRR-MM-DD */
  date: string
  amount: number
  name: string
  title: string
}

const day = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`
const pln = (spent: number) => (-spent).toFixed(2).replace('.', ',')
const transferRow = (t: CsvTransfer) =>
  `${day(t.date)};${t.name}, ${t.title}  PRZELEW ZEWNĘTRZNY ${t.amount > 0 ? 'PRZYCHODZĄCY' : 'WYCHODZĄCY'}  22 2222 2222 2222 2222 2222 2222;Wpływy - inne;${t.amount.toFixed(2).replace('.', ',')} PLN`

/** „Lista operacji”: the period, the account's number (`null` – none), one row per purchase, then the transfers. */
export function listaCsv(buys: readonly CsvBuy[], period: { from: string; to: string }, account: string | null = CSV_NUMBER, transfers: readonly CsvTransfer[] = []): string {
  return [
    'mBank S.A. Bankowość Detaliczna;;;',
    ';;;',
    '#Klient;;;',
    'JAN KAPITAN;;;',
    ';;;',
    'Lista operacji;;;',
    ';;;',
    '#Za okres:;;;',
    `${day(period.from)};${day(period.to)};;`,
    ';;;',
    ...(account ? ['#dla rachunków:;;;', `eKonto - ${account};;;`, ';;;'] : []),
    '#Data operacji;#Opis operacji;#Kategoria;#Kwota',
    ...buys.map((b) => `${day(b.date)};${b.name}  ZAKUP PRZY UŻYCIU KARTY W KRAJU${' '.repeat(40)}${b.pending ? 'transakcja nierozliczona' : ''};Żywność i chemia domowa;${pln(b.amount)} PLN`),
    ...transfers.map(transferRow),
    ''
  ].join('\r\n')
}

/** „Historia rachunku” of the same purchases (booked only): the type of operation in its column, the shop in the title. */
export function historiaCsv(buys: readonly CsvBuy[], period: { from: string; to: string }, account: string | null = CSV_NUMBER): string {
  return [
    'mBank S.A. Bankowość Detaliczna;',
    '#Klient;',
    'JAN KAPITAN;',
    ...(account ? ['#Numer rachunku;', `${account};`] : []),
    '#Za okres:;',
    `${day(period.from)};${day(period.to)};`,
    '#Data księgowania;#Data operacji;#Opis operacji;#Tytuł;#Nadawca/Odbiorca;#Numer konta;#Kwota;#Saldo po operacji;',
    ...buys
      .filter((b) => !b.pending)
      .map((b) => `${day(b.date)};${day(b.date)};ZAKUP PRZY UŻYCIU KARTY;"${b.name}    /Testowo${' '.repeat(20)}DATA TRANSAKCJI: ${b.date}";"  ";'';${pln(b.amount)};1 000,00;`),
    ''
  ].join('\r\n')
}
