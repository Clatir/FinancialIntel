import { describe, expect, it } from 'vitest'
import { asksImpulse, categoryIndex } from '@shared/calc/operations'
import { uncategorizedOf } from '@shared/calc/inbox'
import { createDefaultSettings } from '@shared/defaults'
import { eveningAt } from '@shared/notify'
import { emptyFilter, isUncategorized, marksOf, matchesFilter, uncategorizedAmount, type OperationsFilter } from '@shared/operationsView'
import { defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'
import { parseAmountInput } from '../../src/renderer/lib/format'

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const ctx = { categories: categoryIndex(settings.categories), accounts: settings.accounts, orders: settings.orders }
let seq = 0
const nextId = () => `01K7R00000000000000000${String(++seq).padStart(4, '0')}`
const tx = (amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, amount, ...over })
const line = (amount: number, over: Partial<Transaction['splits'][number]> = {}) => ({ id: nextId(), amount, categoryId: null, refundable: false, memberId: null, advance: false, note: '', ...over })
const filter = (over: Partial<OperationsFilter> = {}): OperationsFilter => ({ ...emptyFilter('2026-10'), ...over })
const shown = (rows: Transaction[], f: OperationsFilter) => rows.filter((t) => matchesFilter(t, f, ctx)).map((t) => t.counterparty)

const FOOD = defaultCategoryId(1)
const GROCERIES = defaultCategoryId(1, 1)
const FUN = defaultCategoryId(6)

describe('„bez kategorii” – jedno znaczenie (1.6.4, N50)', () => {
  const plain = tx(-1000, { counterparty: 'bez kategorii' })
  const income = tx(5000, { kind: 'income', counterparty: 'wpływ' })
  const transfer = tx(-2000, { kind: 'transfer', counterparty: 'przelew' })
  const member = tx(-3000, { counterparty: 'domownik', refundable: true, memberId: HOUSE_MEMBER_ID })
  const receipt = tx(-10000, { counterparty: 'paragon', splits: [line(-6000, { categoryId: GROCERIES }), line(-4000)] })
  const done = tx(-10000, { counterparty: 'paragon gotowy', splits: [line(-6000, { categoryId: GROCERIES }), line(-4000, { categoryId: FUN })] })
  const rows = [plain, income, transfer, member, receipt, done]

  it('oznaczenie i filtr: wydatek albo część paragonu bez kategorii, własne – nie wpływy, przelewy ani zakupy domowników', () => {
    expect(rows.filter(isUncategorized).map((t) => t.counterparty)).toEqual(['bez kategorii', 'paragon'])
    expect(marksOf(receipt, ctx.orders)).toContain('uncategorized')
    expect(shown(rows, filter({ categories: [''] }))).toEqual(['bez kategorii', 'paragon'])
    expect(shown(rows, filter({ marks: ['uncategorized'] }))).toEqual(['bez kategorii', 'paragon'])
  })

  it('kwota do skategoryzowania: tylko części bez kategorii (meldunki)', () => {
    expect(uncategorizedAmount(receipt)).toBe(-4000)
    expect(uncategorizedAmount(done)).toBe(0)
    expect(uncategorizedOf(rows, null)).toEqual({ count: 2, amount: 5000, from: null })
  })

  it('pusta część 0 zł po „Podziel paragon” niczego nie czeka – paragon z kategorią nie jest „bez kategorii”', () => {
    const empty = tx(-10000, { counterparty: 'pusta część', splits: [line(-10000, { categoryId: GROCERIES }), line(0)] })
    expect(isUncategorized(empty)).toBe(false)
    expect(marksOf(empty, ctx.orders)).not.toContain('uncategorized')
    expect(uncategorizedOf([...rows, empty], null)).toEqual({ count: 2, amount: 5000, from: null })
    // An operation of 0 zł without a category (no receipt) is still one to categorize, as before.
    expect(isUncategorized(tx(0, { counterparty: 'zero' }))).toBe(true)
  })
})

describe('podział paragonu: reszta, domownik, filtr kategorii (1.6.4, B76, B78)', () => {
  it('filtr kategorii widzi resztę paragonu w kategorii operacji (zapis sprzed 1.6.4)', () => {
    const old = tx(-10000, { counterparty: 'stary podział', categoryId: FOOD, splits: [line(-6000, { categoryId: FUN })] })
    expect(shown([old], filter({ categories: [FOOD] }))).toEqual(['stary podział'])
    expect(shown([old], filter({ categories: [FUN] }))).toEqual(['stary podział'])
  })

  it('znak „domownik” jak pieniądze: z części, nie z flagi operacji, której części są moje', () => {
    const mine = tx(-10000, { counterparty: 'moje części', refundable: true, memberId: HOUSE_MEMBER_ID, splits: [line(-5000, { categoryId: FOOD }), line(-5000, { categoryId: FUN })] })
    expect(marksOf(mine, ctx.orders)).not.toContain('refundable')
    const part = tx(-10000, { counterparty: 'część domownika', splits: [line(-5000, { categoryId: FOOD }), line(-5000, { categoryId: FOOD, refundable: true, memberId: HOUSE_MEMBER_ID })] })
    expect(marksOf(part, ctx.orders)).toContain('refundable')
    // The rest of an old receipt whose operation a member financed: theirs, as the money counts it.
    const rest = tx(-10000, { counterparty: 'reszta domownika', refundable: true, memberId: HOUSE_MEMBER_ID, splits: [line(-6000, { categoryId: FOOD })] })
    expect(marksOf(rest, ctx.orders)).toContain('refundable')
  })
})

describe('oznaczenia: w grupie dowolne, między grupami wszystkie (1.6.4, N51)', () => {
  const bank = (pending: boolean, name: string) => tx(-500, { counterparty: name, bank: { format: 'mbank', key: `k:${name}`, description: name, counterparty: name, operation: '', category: '', pending, importedAt: '2026-10-15T08:00:00.000Z' } })
  const booked = bank(false, 'z banku')
  const pending = bank(true, 'nierozliczona')
  const manual = tx(-500, { counterparty: 'ręczna', impulse: 'plan' })
  const impulse = tx(-500, { counterparty: 'impuls', impulse: 'impulse' })
  it('„z banku” + „nierozliczona” – obie; „plan” + „wpisana ręcznie” – razem', () => {
    expect(shown([booked, pending, manual, impulse], filter({ marks: ['bank', 'pending'] }))).toEqual(['z banku', 'nierozliczona'])
    expect(shown([booked, pending, manual, impulse], filter({ marks: ['plan', 'impulse'] }))).toEqual(['ręczna', 'impuls'])
    expect(shown([booked, pending, manual, impulse], filter({ marks: ['plan', 'manual'] }))).toEqual(['ręczna'])
    expect(shown([booked, pending, manual, impulse], filter({ marks: ['plan', 'bank'] }))).toEqual([])
  })
})

describe('dziennik kapitański, wieczór, kwota (1.6.4)', () => {
  it('próg 0 – dziennik nie pyta nigdzie (N32)', () => {
    const t = tx(-10000)
    expect(asksImpulse(t, { impulseThreshold: 0 })).toBe(false)
    expect(asksImpulse(t, { impulseThreshold: 5000 })).toBe(true)
    expect(asksImpulse(tx(-4999), { impulseThreshold: 5000 })).toBe(false)
  })

  it('przypomnienie w ciszy nocnej przychodzi minutę przed nią (N104)', () => {
    expect(eveningAt('21:00', { from: '23:00', to: '05:00' })).toBe('21:00')
    expect(eveningAt('23:30', { from: '23:00', to: '05:00' })).toBe('22:59')
    expect(eveningAt('01:00', { from: '00:00', to: '06:00' })).toBe('23:59')
    expect(eveningAt('22:00', { from: '20:00', to: '23:00' })).toBe('19:59')
  })

  it('kwota z więcej niż dwiema cyframi po przecinku jest odrzucana – „1.200” to nie 1,20 zł (B68)', () => {
    expect(parseAmountInput('1.200')).toBeUndefined()
    expect(parseAmountInput('1,234')).toBeUndefined()
    expect(parseAmountInput('12,5+1,255')).toBeUndefined()
    expect(parseAmountInput('1.20')).toBe(1.2)
    expect(parseAmountInput('1 200')).toBe(1200)
    expect(parseAmountInput('3*4,99')).toBe(14.97)
    expect(parseAmountInput('.5')).toBe(0.5)
  })
})
