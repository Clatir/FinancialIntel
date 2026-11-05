/**
 * A synthetic CSV of another bank than mBank (AP-43; no user's data – T44), in the layout of
 * `tests/fixtures/csv/inny_bank.csv`: the bank's lines, a header, money in and out in two columns, a balance, the newest
 * first. UTF-8 with BOM (the fixture is Windows-1250). Dates given by the caller (E2E: from `warsawNow()` – testy.md).
 */
export interface BankCsvRow {
  /** RRRR-MM-DD */
  date: string
  name: string
  title: string
  /** Złote, positive = money in. */
  amount: number
}

const day = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`
const pln = (grosze: number) => {
  const [zl, gr] = [Math.trunc(Math.abs(grosze) / 100), Math.abs(grosze) % 100]
  return `${grosze < 0 ? '-' : ''}${String(zl).replace(/\B(?=(\d{3})+$)/g, ' ')},${String(gr).padStart(2, '0')}`
}

export const BANK_CSV_HEADER = 'Data operacji;Data księgowania;Rodzaj operacji;Kontrahent;Tytuł;Rachunek kontrahenta;Uznania;Obciążenia;Saldo po operacji;Waluta'

export function bankCsv(rows: readonly BankCsvRow[], start = 100000): string {
  let balance = start
  const lines = [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => {
      const g = Math.round(r.amount * 100)
      balance += g
      const op = g > 0 ? 'PRZELEW PRZYCHODZĄCY' : 'PŁATNOŚĆ KARTĄ'
      return `${day(r.date)};${day(r.date)};${op};${r.name};${r.title};;${g > 0 ? pln(g) : ''};${g < 0 ? pln(-g) : ''};${pln(balance)};PLN`
    })
    .reverse()
  return '﻿' + ['Bank Przykładowy S.A. – historia rachunku;;;;;;;;;', 'Rachunek: PL00 0000 0000 0000 0000 0000 0000;;;;;;;;;', ';;;;;;;;;', ';;;;;;;;;', BANK_CSV_HEADER, ...lines, ''].join('\r\n')
}
