import { describe, expect, it } from 'vitest'
import { asksImpulse, categoryIndex, isNight } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { amountTone, compareOperations, emptyFilter, fold, marksOf, matchesFilter, needsLog, sumOperations, type OperationsFilter } from '@shared/operationsView'
import { defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Transaction } from '@shared/schema'

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const ctx = { categories: categoryIndex(settings.categories), accounts: settings.accounts, orders: settings.orders }
let seq = 0
const tx = (date: string, amount: number, over: Partial<Transaction> = {}) =>
  transactionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: `01K00000000000000000000${String(++seq).padStart(3, '0')}`,
    createdAt: `2026-10-0${(seq % 9) + 1}T10:00:00.000Z`,
    updatedAt: '2026-10-01T10:00:00.000Z',
    date,
    accountId: MBANK_ACCOUNT_ID,
    amount,
    ...over
  })
const filter = (over: Partial<OperationsFilter> = {}): OperationsFilter => ({ ...emptyFilter('2026-10'), ...over })

const FOOD = defaultCategoryId(1)
const GROCERIES = defaultCategoryId(1, 1)

describe('lista operacji', () => {
  const zabka = tx('2026-10-14', -1189, { counterparty: 'Żabka', categoryId: GROCERIES, time: '23:40' })
  const bolt = tx('2026-10-15', -1249, { counterparty: 'Bolt', bank: { format: 'mbank', key: 'k1', description: 'Bolt ZAKUP PRZY UŻYCIU KARTY - INTERNET', counterparty: 'Bolt', operation: '', category: 'Przejazdy', pending: true, importedAt: '2026-10-16T08:00:00.000Z' } })
  const salary = tx('2026-10-10', 500000, { kind: 'income', counterparty: 'Domownik' })
  const wallet = tx('2026-09-30', -2500, { accountId: XTB_WALLET_ACCOUNT_ID, counterparty: 'Allegro', categoryId: FOOD, refundable: true })
  const all = [zabka, bolt, salary, wallet]

  it('okres, konto, rodzaj, kategoria (z podkategoriami), oznaczenia', () => {
    expect(all.filter((t) => matchesFilter(t, filter(), ctx))).toEqual([zabka, bolt, salary])
    expect(all.filter((t) => matchesFilter(t, filter({ period: { kind: 'all' } }), ctx))).toHaveLength(4)
    expect(all.filter((t) => matchesFilter(t, filter({ period: { kind: 'range', from: '2026-09-30', to: '2026-10-10' } }), ctx))).toEqual([salary, wallet])
    expect(all.filter((t) => matchesFilter(t, filter({ period: { kind: 'all' }, accounts: [XTB_WALLET_ACCOUNT_ID] }), ctx))).toEqual([wallet])
    expect(all.filter((t) => matchesFilter(t, filter({ kinds: ['income'] }), ctx))).toEqual([salary])
    expect(all.filter((t) => matchesFilter(t, filter({ categories: [FOOD] }), ctx))).toEqual([zabka])
    expect(all.filter((t) => matchesFilter(t, filter({ categories: [''] }), ctx))).toEqual([bolt, salary])
    expect(all.filter((t) => matchesFilter(t, filter({ marks: ['pending'] }), ctx))).toEqual([bolt])
    expect(all.filter((t) => matchesFilter(t, filter({ marks: ['night'] }), ctx))).toEqual([zabka])
    expect(all.filter((t) => matchesFilter(t, filter({ period: { kind: 'all' }, marks: ['refundable'] }), ctx))).toEqual([wallet])
  })

  it('wyszukiwanie bez polskich znaków, w opisie z banku, kategorii i po kwocie', () => {
    expect(fold('Żabka ŁÓDŹ')).toBe('zabka lodz')
    expect(all.filter((t) => matchesFilter(t, filter({ query: 'zabka' }), ctx))).toEqual([zabka])
    expect(all.filter((t) => matchesFilter(t, filter({ query: 'karty internet' }), ctx))).toEqual([bolt])
    expect(all.filter((t) => matchesFilter(t, filter({ query: 'spożywcze' }), ctx))).toEqual([zabka])
    expect(all.filter((t) => matchesFilter(t, filter({ query: '12,49' }), ctx))).toEqual([bolt])
    expect(all.filter((t) => matchesFilter(t, filter({ query: '5000' }), ctx))).toEqual([salary])
  })

  it('oznaczenia: noc tylko z godziną w ciszy nocnej, impuls od progu 200 zł', () => {
    expect(marksOf(zabka, settings.orders)).toEqual(['night', 'manual'])
    expect(marksOf(bolt, settings.orders)).toEqual(['uncategorized', 'pending'])
    // A container's payment and one from a goal have their place in the budget – no „bez kategorii” (F6).
    expect(marksOf({ ...bolt, containerId: '01K30000000000000000000C01' }, settings.orders)).toEqual(['pending'])
    expect(marksOf({ ...bolt, goalId: '01K30000000000000000000G01' }, settings.orders)).toEqual(['pending'])
    expect(isNight({ kind: 'expense', amount: -100, time: '04:59' }, settings.orders)).toBe(true)
    expect(isNight({ kind: 'expense', amount: -100, time: '05:00' }, settings.orders)).toBe(false)
    expect(isNight({ kind: 'expense', amount: -100, time: null }, settings.orders)).toBe(false)
    expect(asksImpulse({ kind: 'expense', amount: -20000 }, settings.orders)).toBe(true)
    expect(asksImpulse({ kind: 'expense', amount: -19999 }, settings.orders)).toBe(false)
    expect(needsLog(tx('2026-10-01', -25000, { impulse: 'plan' }), settings.orders)).toBe(false)
  })

  it('kolejność: najnowsze, w dniu z godziną przed importem bez godziny', () => {
    const a = tx('2026-10-14', -1, { time: '09:00' })
    const b = tx('2026-10-14', -1)
    const c = tx('2026-10-15', -1)
    expect([b, a, c].sort(compareOperations)).toEqual([c, a, b])
  })

  it('sumy: wpływy, wydatki, koszty (bez przelewów własnych i korekt); kolory kwot (D68)', () => {
    const ret = tx('2026-10-15', 775, { counterparty: 'KOLEO' })
    const own = tx('2026-10-15', -5000, { kind: 'transfer' })
    expect(sumOperations([zabka, bolt, salary, ret, own])).toEqual({ count: 5, inflow: 500775, outflow: 2438, costs: 2438 - 775 })
    // Purchases for the house are money out, not costs.
    expect(sumOperations([wallet])).toEqual({ count: 1, inflow: 0, outflow: 2500, costs: 0 })
    expect(amountTone(zabka)).toBe('plain')
    expect(amountTone(salary)).toBe('up')
    expect(amountTone(ret)).toBe('up')
    expect(amountTone(own)).toBe('muted')
    expect(amountTone({ kind: 'correction', amount: -1 })).toBe('accent')
  })
})
