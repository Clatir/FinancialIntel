import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { operationRowsOf } from '@shared/export/budget'
import { brandKeyOf, emptyFilter, filterOf, matchesFilter, membersIn, showsView, sortOperations, viewFilter, type OperationsFilter } from '@shared/operationsView'
import { defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, SCHEMA_VERSION, settingsSchema, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Transaction } from '@shared/schema'

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const ctx = { categories: categoryIndex(settings.categories), accounts: settings.accounts, orders: settings.orders }
let seq = 0
const tx = (date: string, amount: number, over: Partial<Transaction> = {}) =>
  transactionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: `01K7V00000000000000000${String(++seq).padStart(4, '0')}`,
    createdAt: `2026-10-0${(seq % 9) + 1}T10:00:00.000Z`,
    updatedAt: '2026-10-01T10:00:00.000Z',
    date,
    accountId: MBANK_ACCOUNT_ID,
    amount,
    ...over
  })
const filter = (over: Partial<OperationsFilter> = {}): OperationsFilter => ({ ...emptyFilter('2026-10'), period: { kind: 'all' }, ...over })
const shown = (list: Transaction[], f: OperationsFilter) => list.filter((t) => matchesFilter(t, f, ctx))

const FOOD = defaultCategoryId(1)
const GROCERIES = defaultCategoryId(1, 1)
const MUM = '01K7V0000000000000000MVM01'
const CONTAINER = '01K7V000000000000000000C01'
const GOAL = '01K7V000000000000000000G01'
const LOAN = '01K7V000000000000000000P01'
const SAVINGS = '01K7V0000000000000000SAV01'

describe('filtry zaawansowane listy operacji (1.7.0, F18)', () => {
  it('kwota od–do bez znaku (wydatki i wpływy), granice włącznie', () => {
    const coffee = tx('2026-10-14', -1450)
    const dinner = tx('2026-10-14', -8900)
    const refund = tx('2026-10-14', 5000, { kind: 'income' })
    const all = [coffee, dinner, refund]
    expect(shown(all, filter({ amountMin: 5000 }))).toEqual([dinner, refund])
    expect(shown(all, filter({ amountMax: 5000 }))).toEqual([coffee, refund])
    expect(shown(all, filter({ amountMin: 1450, amountMax: 1450 }))).toEqual([coffee])
  })

  it('podkategoria sama; kategoria główna – razem z podkategoriami; część paragonu też', () => {
    const groceries = tx('2026-10-14', -3000, { categoryId: GROCERIES })
    const food = tx('2026-10-14', -2000, { categoryId: FOOD })
    const receipt = tx('2026-10-14', -5000, { splits: [{ id: '01K7V0000000000000000SPK01', amount: -1000, categoryId: GROCERIES, refundable: false, memberId: null, advance: false, note: '' }] })
    const all = [groceries, food, receipt]
    expect(shown(all, filter({ categories: [GROCERIES] }))).toEqual([groceries, receipt])
    expect(shown(all, filter({ categories: [FOOD] }))).toEqual([groceries, food, receipt])
  })

  it('domownik: finansuje zakup (także część), wpłata od niego; zakup własny – nie', () => {
    const forMum = tx('2026-10-14', -3000, { refundable: true, memberId: MUM })
    const house = tx('2026-10-14', -3000, { refundable: true, memberId: null })
    const part = tx('2026-10-14', -5000, { splits: [{ id: '01K7V0000000000000000SPK02', amount: -2000, categoryId: null, refundable: true, memberId: MUM, advance: false, note: '' }] })
    const fromMum = tx('2026-10-14', 20000, { kind: 'income', memberId: MUM, advance: true })
    const mine = tx('2026-10-14', -1000)
    const all = [forMum, house, part, fromMum, mine]
    expect(membersIn(forMum)).toEqual([MUM])
    expect(membersIn(house)).toEqual([HOUSE_MEMBER_ID])
    expect(shown(all, filter({ members: [MUM] }))).toEqual([forMum, part, fromMum])
    expect(shown(all, filter({ members: [HOUSE_MEMBER_ID] }))).toEqual([house])
  })

  it('kontrahent po marce: różne zapisy jednej sieci razem, inna sieć osobno', () => {
    const a = tx('2026-10-14', -1000, { counterparty: 'BIEDRONKA 1234 WARSZAWA' })
    const b = tx('2026-10-15', -2000, { counterparty: 'JMP S.A. BIEDRONKA 4321' })
    const c = tx('2026-10-15', -2000, { counterparty: 'LIDL ZLOTA' })
    expect(brandKeyOf(a)).toBe(brandKeyOf(b))
    expect(brandKeyOf(a)).not.toBe(brandKeyOf(c))
    expect(shown([a, b, c], filter({ brands: [brandKeyOf(a)] }))).toEqual([a, b])
  })

  it('kontener, cel, pożyczka; konto przelewu – też przelew w jednej operacji i konto spoza budżetu', () => {
    const fee = tx('2026-10-14', -4000, { containerId: CONTAINER })
    const fromGoal = tx('2026-10-14', -9000, { goalId: GOAL })
    const loan = tx('2026-10-14', -50000, { kind: 'loan', loanId: LOAN })
    const both = tx('2026-10-14', -10000, { kind: 'transfer', counterAccountId: SAVINGS, bothSides: true })
    const toWallet = tx('2026-10-14', -10000, { kind: 'transfer', accountId: SAVINGS, counterAccountId: XTB_WALLET_ACCOUNT_ID })
    const outside = tx('2026-10-14', -10000, { kind: 'transfer' })
    const all = [fee, fromGoal, loan, both, toWallet, outside]
    expect(shown(all, filter({ containers: [CONTAINER] }))).toEqual([fee])
    expect(shown(all, filter({ goals: [GOAL] }))).toEqual([fromGoal])
    expect(shown(all, filter({ loans: [LOAN] }))).toEqual([loan])
    // Both accounts of a transfer in one operation; a side of before 1.7.0 – its other account.
    expect(shown(all, filter({ transferAccounts: [SAVINGS] }))).toEqual([both])
    expect(shown(all, filter({ transferAccounts: [MBANK_ACCOUNT_ID] }))).toEqual([both])
    expect(shown(all, filter({ transferAccounts: [XTB_WALLET_ACCOUNT_ID] }))).toEqual([toWallet])
    expect(shown(all, filter({ transferAccounts: [''] }))).toEqual([outside])
  })
})

describe('kolejność listy (F18)', () => {
  const small = tx('2026-10-15', -1000, { counterparty: 'Żabka' })
  const big = tx('2026-10-10', -50000, { counterparty: 'Allegro' })
  const income = tx('2026-10-12', 30000, { kind: 'income', counterparty: 'Łucja' })
  const unnamed = tx('2026-10-14', -2000)
  const list = () => [small, big, income, unnamed]

  it('kwota bez znaku od największej; kontrahenci A–Z po polsku, bez nazwy na końcu; data – najnowsze', () => {
    expect(sortOperations(list(), 'amount')).toEqual([big, income, unnamed, small])
    expect(sortOperations(list(), 'counterparty')).toEqual([big, income, small, unnamed])
    expect(sortOperations(list(), 'date')).toEqual([small, unnamed, income, big])
  })
})

describe('zapisane widoki (F18)', () => {
  it('filtr z fi.json sprawdzony: nieznany rodzaj, oznaczenie i kolejność pominięte, kwota „do” poniżej „od” – bez górnej granicy', () => {
    const f = filterOf({ kinds: ['expense', 'nowy-rodzaj'], marks: ['night', 'x'], sort: 'random', amountMin: 5000, amountMax: 100, members: [MUM, 7], period: { kind: 'range', from: '2026-01-01', to: 'zła' }, extra: true }, '2026-10')
    expect(f).toMatchObject({ kinds: ['expense'], marks: ['night'], sort: 'date', amountMin: 5000, amountMax: null, members: [MUM], period: { kind: 'range', from: '2026-01-01', to: null } })
    expect(filterOf(null, '2026-10')).toEqual(emptyFilter('2026-10'))
    expect(filterOf({ period: { kind: 'month', month: '2026-13' } }, '2026-10').period).toEqual({ kind: 'month', month: '2026-10' })
  })

  it('widok bez okresu: okres listy się nie liczy; z okresem – musi się zgadzać; kolejność wyborów bez znaczenia', () => {
    const f = filter({ categories: [FOOD, GROCERIES], amountMin: 5000, sort: 'amount' })
    const view = { filter: viewFilter({ ...f, categories: [GROCERIES, FOOD] }, false), withPeriod: false }
    expect(view.filter).not.toHaveProperty('period')
    expect(showsView(f, view, '2026-10')).toBe(true)
    expect(showsView({ ...f, period: { kind: 'month', month: '2026-09' } }, view, '2026-10')).toBe(true)
    expect(showsView({ ...f, amountMin: null }, view, '2026-10')).toBe(false)
    const dated = { filter: viewFilter(f, true), withPeriod: true }
    expect(showsView(f, dated, '2026-10')).toBe(true)
    expect(showsView({ ...f, period: { kind: 'month', month: '2026-09' } }, dated, '2026-10')).toBe(false)
  })

  it('widoki w fi.json: zły wpis pominięty, reszta zostaje; brak listy – pusta', () => {
    const base = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
    const parsed = settingsSchema.parse({ ...base, operationViews: [{ id: 'v1', name: 'Mama – ten rok', filter: { members: [MUM] }, withPeriod: true }, { id: 'v2' }, 'zły'] })
    expect(parsed.operationViews).toEqual([{ id: 'v1', name: 'Mama – ten rok', filter: { members: [MUM] }, withPeriod: true }])
    const { operationViews: _gone, ...without } = base
    expect(settingsSchema.parse(without).operationViews).toEqual([])
  })
})

describe('eksport widocznej listy (F18)', () => {
  it('wiersze w kolejności listy, bez filtra dat', () => {
    const a = tx('2026-10-01', -1000, { counterparty: 'A' })
    const b = tx('2025-01-01', -3000, { counterparty: 'B' })
    expect(operationRowsOf([b, a], settings.categories, settings.accounts).map((r) => r.counterparty)).toEqual(['B', 'A'])
  })

  it('lista jednego konta: przelew w jednej operacji z kwotą na tym koncie – jak na liście (przegląd S)', () => {
    const t = tx('2026-10-05', -50000, { kind: 'transfer', counterAccountId: XTB_WALLET_ACCOUNT_ID, bothSides: true })
    const amounts = (view: string | null) => operationRowsOf([t], settings.categories, settings.accounts, [], view).map((r) => r.amount)
    expect(amounts(XTB_WALLET_ACCOUNT_ID)).toEqual([50000])
    expect(amounts(MBANK_ACCOUNT_ID)).toEqual([-50000])
    expect(amounts(null)).toEqual([-50000])
  })
})
