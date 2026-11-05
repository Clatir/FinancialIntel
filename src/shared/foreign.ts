/**
 * The amount in another currency (1.17.0, AP-48, T492, T493) – information for the user alone (a trip): written beside
 * the operation, shown in its editor, on the list and in the exports; the budget counts only its złoty (spec: only PLN).
 */
import { decimalText, formatPln } from './format'
import { CURRENCY_CODE, type ForeignAmount, type Transaction } from './schema/records'

/** The currencies offered first in the field (anything of three letters goes – ISO 4217). */
export const COMMON_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CZK', 'NOK', 'SEK', 'DKK', 'HUF', 'RON', 'BGN', 'TRY', 'UAH', 'JPY', 'CAD', 'AUD', 'THB', 'AED'] as const

/** The currency a new amount starts with when none was used yet. */
export const DEFAULT_CURRENCY = 'EUR'

/** „45,00 EUR” – `amount` writes the hundredths (the screens mask it with the hidden amounts). */
export const foreignText = (f: ForeignAmount, amount: (hundredths: number) => string = formatPln): string => `${amount(f.amount)} ${f.currency}`

/** The rate shown: złoty for one unit of the currency (the operation's złoty ÷ the amount); null – no złoty yet. */
export function exchangeRate(grosze: number, f: ForeignAmount): number | null {
  const pln = Math.abs(grosze)
  return pln && f.amount > 0 ? pln / f.amount : null
}

/** „kurs 4,3000 zł za 1 EUR” (four places – a bank's rate); '' – no złoty yet. */
export function rateText(grosze: number, f: ForeignAmount): string {
  const r = exchangeRate(grosze, f)
  return r == null ? '' : `kurs ${decimalText(r, 4)} zł za 1 ${f.currency}`
}

/** A code typed („eur ”) as the field writes it („EUR”); null – not three letters. */
export function currencyOf(text: string): string | null {
  const code = text.trim().toUpperCase()
  return CURRENCY_CODE.test(code) ? code : null
}

/** Why a typed code is refused (said at the field – AP-15); null – taken. */
export function currencyRefusal(text: string): string | null {
  const code = currencyOf(text)
  if (!code) return 'Kod waluty to trzy litery, np. EUR – zostaje poprzedni.'
  if (code === 'PLN') return 'Kwota w złotych to kwota operacji – wpisz inną walutę.'
  return null
}

/** The amount as written (a value of the field), null – none: an amount above zero and a currency other than PLN. */
export function foreignOf(amount: number | null | undefined, currency: string): ForeignAmount | null {
  const code = currencyOf(currency)
  return amount != null && Number.isInteger(amount) && amount > 0 && amount <= 1e15 && code && code !== 'PLN' ? { amount, currency: code } : null
}

const lastMemo = new WeakMap<readonly Transaction[], string>()

/** The currency of the latest operation with one (a new amount starts with it – the trip goes on); none – EUR. */
export function lastCurrencyOf(transactions: readonly Transaction[]): string {
  const known = lastMemo.get(transactions)
  if (known) return known
  let best: Transaction | null = null
  for (const t of transactions) {
    if (!t.foreign) continue
    if (!best || t.date > best.date || (t.date === best.date && t.createdAt > best.createdAt)) best = t
  }
  const code = best?.foreign?.currency ?? DEFAULT_CURRENCY
  lastMemo.set(transactions, code)
  return code
}
