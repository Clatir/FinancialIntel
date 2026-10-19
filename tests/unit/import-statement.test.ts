import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { parseMbank } from '@shared/import/mbank'
import { buildImport, planImport, type ImportChoices } from '@shared/import/reconcile'
import { bookingOrder, statementCheck, statementOf, type Statement } from '@shared/import/statement'
import { balanceSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Balance, type Transaction } from '@shared/schema'

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const categories = categoryIndex(settings.categories)
const NOW = '2026-10-17T09:00:00.000Z'
let seq = 0
const makeId = () => `01K3${String(++seq).padStart(22, '0')}`
const ctx = () => ({ rules: [], ownNames: ['JAN KAPITAN'], categories })
const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })

const opening = (amount: number, date = '2026-09-01'): Balance =>
  balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: NOW, updatedAt: NOW, date, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount })
const op = (date: string, amount: number, counterparty = 'Sklep'): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: NOW, updatedAt: NOW, date, accountId: MBANK_ACCOUNT_ID, amount, counterparty })

const zl = (g: number) => {
  const s = (Math.abs(g) / 100).toFixed(2).replace('.', ',')
  const [int, frac] = s.split(',')
  return `${g < 0 ? '-' : ''}${int!.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${frac}`
}
const plDay = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`

/** An mBank account history (newest first, as mBank writes it): rows in the booking order with their balances. */
function historia(start: number, rows: Array<{ booked: string; date?: string; shop?: string; who?: string; title?: string; amount: number }>, opts: { skipBalanceAt?: number } = {}): string {
  let balance = start
  const lines = rows.map((r, i) => {
    balance += r.amount
    const operation = r.who ? (r.amount > 0 ? 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY' : 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY') : 'ZAKUP PRZY UŻYCIU KARTY'
    const title = r.who ? (r.title ?? 'PRZELEW') : `${r.shop ?? 'SKLEP'} /Testowo`
    return i === opts.skipBalanceAt ? null : `${plDay(r.booked)};${plDay(r.date ?? r.booked)};${operation};"${title}";"${r.who ?? ''}";'';${zl(r.amount)};${zl(balance)};`
  })
  const first = rows[0]!.booked
  const last = rows.at(-1)!.booked
  return [
    'mBank S.A. Bankowość Detaliczna;',
    '#Klient;',
    'JAN KAPITAN;',
    '#Za okres:;',
    `${plDay(first)};${plDay(last)};`,
    '#Data księgowania;#Data operacji;#Opis operacji;#Tytuł;#Nadawca/Odbiorca;#Numer konta;#Kwota;#Saldo po operacji;',
    ...lines.filter((l): l is string => l != null).reverse(),
    ';',
    `#Saldo końcowe;${zl(balance)};`
  ].join('\n')
}

const ROWS = [
  // Paid on 30.09, booked on 01.10 (a card payment of the weekend).
  { booked: '2026-10-01', date: '2026-09-30', shop: 'SKLEP A', amount: -1000 },
  { booked: '2026-10-02', who: 'FIRMA TESTOWA', title: 'WYNAGRODZENIE', amount: 200000 },
  { booked: '2026-10-05', date: '2026-10-03', shop: 'SKLEP B', amount: -5000 },
  { booked: '2026-10-05', shop: 'SKLEP C', amount: -4000 },
  { booked: '2026-10-06', shop: 'SKLEP D', amount: -10000 }
]

/** Import a history into `existing` and its statement: the operations after it. */
function imported(text: string, existing: Transaction[] = [], choices = emptyChoices()) {
  const file = parseMbank(text)
  const plan = planImport(file, MBANK_ACCOUNT_ID, existing, ctx())
  const result = buildImport(plan, choices, { now: NOW, makeId, rules: [] })
  const byKey = new Map(result.create.map((t) => [t.bank!.key, t.id]))
  const rowByKey = new Map(plan.rows.map((p) => [p.key, p]))
  const st = statementOf(plan.rows, MBANK_ACCOUNT_ID, (key) => {
    const p = rowByKey.get(key)!
    return p.status === 'known' || p.status === 'settle' || p.status === 'elsewhere' || p.status === 'merge' ? p.tx.id : (byKey.get(key) ?? null)
  })!
  const after = [...existing.filter((t) => !result.update.some((u) => u.id === t.id)), ...(result.update as Transaction[]), ...result.create]
  return { file, plan, st, after }
}

const check = (st: Statement, transactions: Transaction[], balances: Balance[]) => statementCheck(st, { transactions, balances, tx: (id) => transactions.find((t) => t.id === id) })

describe('saldo z pliku banku (1.5.1, F5)', () => {
  it('historia rachunku: data księgowania z pliku, kolejność księgowania po saldach (mBank pisze od najnowszej), saldo przed i po pliku', () => {
    const { file, st } = imported(historia(100000, ROWS))
    expect(file.rows.map((r) => [r.date, r.booked ?? r.date])[4]).toEqual(['2026-09-30', '2026-10-01'])
    expect(st.rows.map((r) => r.amount)).toEqual(ROWS.map((r) => r.amount))
    expect(st.start).toBe(100000)
    expect(st.end).toEqual({ date: '2026-10-06', balance: 280000 })
    expect(st.gaps).toEqual([])
    // The same rows in the file's order: the same chronology.
    const chrono = st.rows.map((r) => ({ amount: r.amount, balance: r.balance, booked: r.booked }))
    expect(bookingOrder([...chrono].reverse())).toEqual(chrono)
    expect(bookingOrder(chrono)).toEqual(chrono)
  })

  it('zgodne z FI na koniec pliku – także z operacją zapłaconą przed pierwszym księgowaniem (data operacji ≠ księgowania)', () => {
    const { st, after } = imported(historia(100000, ROWS))
    const c = check(st, after, [opening(100000)])
    expect(c).toMatchObject({ diff: 0, before: 0, firstDay: null, other: 0, from: '2026-10-01', fi: 280000 })
    expect([c.missing, c.extra, c.amounts, c.gaps]).toEqual([[], [], [], []])
  })

  it('różnica rozłożona na przyczyny, najwcześniejszy dzień pierwszy: pominięty wiersz, wpis ręczny niezaksięgowany, inna kwota, saldo otwarcia', () => {
    const text = historia(100000, ROWS)
    const plan0 = planImport(parseMbank(text), MBANK_ACCOUNT_ID, [], ctx())
    const skipC = plan0.rows.find((p) => p.row.counterparty.includes('SKLEP C'))!
    const { st, after } = imported(text, [], { ...emptyChoices(), skip: { [skipC.key]: true } })
    // Typed by hand on the last day, not booked yet; one amount changed by hand.
    const manual = op('2026-10-06', -2500, 'Kawiarnia')
    const changed = after.map((t) => (t.counterparty.includes('SKLEP B') ? { ...t, amount: -5100 } : t))
    const c = check(st, [...changed, manual], [opening(100000)])
    expect(c.missing.map((m) => [m.date, m.amount])).toEqual([['2026-10-05', -4000]])
    expect(c.extra.map((e) => [e.date, e.amount, e.name])).toEqual([['2026-10-06', -2500, 'Kawiarnia']])
    expect(c.amounts.map((a) => [a.date, a.fi, a.bank])).toEqual([['2026-10-03', -5100, -5000]])
    expect(c.diff).toBe(4000 - 2500 - 100)
    expect([c.firstDay, c.other, c.before]).toEqual(['2026-10-03', 0, 0])
    // An opening balance off by 1 zł: a difference from before the file, said first.
    const off = check(st, [...changed, manual], [opening(100100)])
    expect([off.before, off.firstDay, off.other]).toEqual([100, '', 0])
  })

  it('luka w łańcuchu sald pliku (lista przefiltrowana): pokazana z kwotą, reszta zgodna', () => {
    // The row of 02.10 missing from the file: its money is a gap between 01.10 and 05.10.
    const { st, after } = imported(historia(100000, ROWS, { skipBalanceAt: 1 }))
    expect(st.gaps).toEqual([{ from: '2026-10-01', to: '2026-10-05', amount: 200000 }])
    const c = check(st, after, [opening(100000)])
    expect([c.diff, c.other, c.firstDay]).toEqual([-200000, 0, '2026-10-01'])
    expect(c.gaps).toHaveLength(1)
  })

  it('saldo otwarcia po początku pliku: porównanie od dnia otwarcia; lista operacji bez sald – brak telemetrii', () => {
    const { st, after } = imported(historia(100000, ROWS))
    // The budget starts on 05.10 with the balance at the end of 04.10 by the days of operations (the payment of 03.10
    // booked on 05.10 is in it).
    const c = check(st, after, [opening(294000, '2026-10-05')])
    expect([c.from, c.before, c.diff]).toEqual(['2026-10-05', 0, 0])
    // The balance the bank showed on 04.10 (that payment not booked yet): a difference from before the opening.
    const booked = check(st, after, [opening(299000, '2026-10-05')])
    expect([booked.before, booked.diff, booked.firstDay]).toEqual([5000, 5000, ''])
    const lista = parseMbank(historia(100000, ROWS).replace('#Saldo po operacji;', '#Saldo;'))
    expect(statementOf(planImport({ ...lista, rows: lista.rows.map((r) => ({ ...r, balanceAfter: null })) }, MBANK_ACCOUNT_ID, [], ctx()).rows, MBANK_ACCOUNT_ID, () => null)).toBeNull()
  })
})
