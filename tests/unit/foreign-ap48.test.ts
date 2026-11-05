import { describe, expect, it } from 'vitest'
import { computeFleet } from '@shared/calc/fleet'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { operationRowsOf, operationsCsv, operationsSheet } from '@shared/export/budget'
import { currencyOf, currencyRefusal, exchangeRate, foreignOf, foreignText, lastCurrencyOf, rateText } from '@shared/foreign'
import { takeUserData } from '@shared/import/copies'
import { fieldLabel, formatValue, isAmountPath, isForeignAmountPath } from '@shared/merge'
import { matchesQuery } from '@shared/operationsView'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

/**
 * AP-48 (1.17.0, R2 – T492, T493): the amount in another currency – information only: kept by the schema (a value that
 * is not one dropped, never the operation), shown with its rate, exported in its own columns, found by its code and its
 * amount; the engine and the złoty of the exports unchanged.
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2026-10-01T10:00:00.000Z'
let seq = 0
const nextId = () => `01K9R2W000000000000000${String(++seq).padStart(4, '0')}`
const FOOD = defaultCategoryId(1, 2)
const tx = (over: Record<string, unknown> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, amount: -zl(193.5), categoryId: FOOD, counterparty: 'TRATTORIA', ...over })
const settings = createDefaultSettings(AT).settings

describe('AP-48: kwota w walucie w schemacie (T492)', () => {
  it('zapisana addytywnie: kwota w setnych częściach, kod ISO; wartość, która nią nie jest – pominięta, operacja zostaje', () => {
    expect(tx({ foreign: { amount: 4500, currency: 'EUR' } }).foreign).toEqual({ amount: 4500, currency: 'EUR' })
    // Absent – none (an older file); null – none written.
    expect('foreign' in tx()).toBe(false)
    expect(tx({ foreign: null }).foreign).toBeNull()
    // Not a currency's amount: dropped, the operation read (a hand-edited file).
    for (const bad of [{ amount: 0, currency: 'EUR' }, { amount: -10, currency: 'EUR' }, { amount: 12.5, currency: 'EUR' }, { amount: 100, currency: 'eur' }, { amount: 100, currency: 'EURO' }, 'EUR']) {
      const t = tx({ foreign: bad })
      expect(t.foreign, JSON.stringify(bad)).toBeUndefined()
      expect(t.amount).toBe(-zl(193.5))
    }
    // A newer version's field beside them stays (looseObject).
    expect(tx({ foreign: { amount: 4500, currency: 'EUR', rateAt: 'x' } }).foreign).toMatchObject({ rateAt: 'x' })
  })

  it('pole kodu: wielkie litery, trzy litery, PLN – odmowa; kwota tylko powyżej zera', () => {
    expect(currencyOf(' eur ')).toBe('EUR')
    expect(currencyOf('EU')).toBeNull()
    expect(currencyOf('E1R')).toBeNull()
    expect(currencyRefusal('usd')).toBeNull()
    expect(currencyRefusal('PLN')).toMatch(/kwota operacji/)
    expect(currencyRefusal('eu')).toMatch(/trzy litery/)
    expect(foreignOf(4500, 'eur')).toEqual({ amount: 4500, currency: 'EUR' })
    expect([foreignOf(0, 'EUR'), foreignOf(null, 'EUR'), foreignOf(4500, 'PLN'), foreignOf(4500, 'xx'), foreignOf(12.5, 'EUR')]).toEqual([null, null, null, null, null])
  })

  it('kurs = złote ÷ kwota w walucie (tylko pokazywany), tekst „45,00 EUR”, ostatnia waluta', () => {
    const f = { amount: 4500, currency: 'EUR' }
    expect(exchangeRate(-zl(193.5), f)).toBeCloseTo(4.3, 10)
    expect(rateText(-zl(193.5), f)).toBe('kurs 4,3000 zł za 1 EUR')
    expect(rateText(0, f)).toBe('')
    expect(foreignText({ amount: 150000, currency: 'JPY' })).toBe('1 500,00 JPY')
    expect(foreignText(f, () => '•••')).toBe('••• EUR')
    // The latest operation's currency – the trip goes on; none – EUR.
    const list = [tx({ date: '2026-10-10', foreign: { amount: 100, currency: 'CZK' } }), tx({ date: '2026-10-12', foreign: { amount: 100, currency: 'HUF' } }), tx({ date: '2026-10-13' })]
    expect(lastCurrencyOf(list)).toBe('HUF')
    expect(lastCurrencyOf([tx()])).toBe('EUR')
  })
})

describe('AP-48: kwota w walucie – eksport, wyszukiwanie, historia, import (T493)', () => {
  it('eksport CSV i Excel: dwie kolumny na końcu, kwota ze znakiem operacji; złote bez zmian', () => {
    const rows = operationRowsOf([tx({ foreign: { amount: 4500, currency: 'EUR' } }), tx({ amount: zl(20), kind: 'income', categoryId: null, foreign: { amount: 500, currency: 'USD' } }), tx()], settings.categories, settings.accounts)
    expect(rows.map((r) => [r.amount, r.foreign, r.currency])).toEqual([
      [-zl(193.5), -4500, 'EUR'],
      [zl(20), 500, 'USD'],
      [-zl(193.5), null, '']
    ])
    const [head, first, , third] = operationsCsv(rows).split('\r\n')
    expect(head!.split(';').slice(-4)).toEqual(['Notatka', 'Tagi', 'Kwota w walucie', 'Waluta'])
    expect(first!.split(';').slice(4, 5)).toEqual(['-193,50'])
    expect(first!.split(';').slice(-2)).toEqual(['-45,00', 'EUR'])
    expect(third!.split(';').slice(-2)).toEqual(['', ''])
    const sheet = operationsSheet(rows)
    expect(sheet.columns.slice(-2).map((c) => [c.header, c.kind])).toEqual([
      ['Kwota w walucie', 'money'],
      ['Waluta', 'text']
    ])
    expect(sheet.rows.map((r) => r.slice(-2))).toEqual([
      [-45, 'EUR'],
      [5, 'USD'],
      [null, '']
    ])
  })

  it('wyszukiwanie: po kodzie waluty i po kwocie w walucie', () => {
    const ctx = { categories: categoryIndex(settings.categories), accounts: settings.accounts, orders: settings.orders }
    const eur = tx({ counterparty: 'BAR', foreign: { amount: 4500, currency: 'EUR' } })
    const plain = tx({ counterparty: 'BAR' })
    expect([eur, plain].filter((t) => matchesQuery(t, 'eur', ctx))).toEqual([eur])
    expect([eur, plain].filter((t) => matchesQuery(t, '45,00', ctx))).toEqual([eur])
    // The złoty still found as before.
    expect([eur, plain].filter((t) => matchesQuery(t, '193,50', ctx))).toEqual([eur, plain])
  })

  it('historia i konflikty: polskie nazwy, kwota w walucie jak pole ją pisze (ukryta z kwotami), nigdy setne ani złote', () => {
    expect(fieldLabel(['foreign'])).toBe('Kwota w walucie')
    expect(fieldLabel(['foreign', 'amount'])).toBe('Kwota w walucie – kwota')
    expect(isForeignAmountPath(['foreign', 'amount'])).toBe(true)
    expect(isAmountPath(['foreign', 'amount'])).toBe(false)
    expect(formatValue(4500, 80, { path: ['foreign', 'amount'] })).toBe('45,00')
    expect(formatValue(4500, 80, { path: ['foreign', 'amount'], amount: () => '••• zł', foreign: () => '•••' })).toBe('•••')
    expect(formatValue({ amount: 4500, currency: 'EUR' }, 80, { path: ['foreign'] })).toBe('kwota: 45,00, waluta: EUR')
  })

  it('duplikat usunięty przy imporcie oddaje kwotę w walucie zostającej operacji z banku', () => {
    const bank = tx({ bank: { format: 'mbank', key: 'k1', importedAt: AT } })
    const quick = tx({ foreign: { amount: 4500, currency: 'EUR' } })
    expect(takeUserData(bank, [quick], AT).foreign).toEqual({ amount: 4500, currency: 'EUR' })
    // Its own stays.
    expect(takeUserData({ ...bank, foreign: { amount: 100, currency: 'CHF' } }, [quick], AT).foreign).toEqual({ amount: 100, currency: 'CHF' })
    expect('foreign' in takeUserData(bank, [tx()], AT)).toBe(false)
  })

  it('silnik bez zmian: te same warstwy, energia i log z kwotą w walucie i bez niej', () => {
    const opening = balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })
    const plain = [tx({ id: '01K9R2W0000000000000000AAA' }), tx({ id: '01K9R2W0000000000000000AAB', amount: zl(300), kind: 'income', categoryId: null })]
    const withForeign = plain.map((t, i) => ({ ...t, foreign: { amount: 4500 + i, currency: 'EUR' } }))
    const run = (transactions: Transaction[]) => computeFleet({ settings, transactions, balances: [opening], now: '2026-10-20T12:00:00+02:00' })
    const a = run(plain)
    const b = run(withForeign)
    expect([b.total, b.shields, b.hull, b.energy, b.log]).toEqual([a.total, a.shields, a.hull, a.energy, a.log])
  })
})
