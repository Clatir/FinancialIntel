import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { SEARCH_LIMITS, searchRecords, type SearchInput } from '@shared/search'
import { containerSchema, goalSchema, loanSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const AT = '2026-10-01T10:00:00.000Z'
const base = (id: string) => ({ schemaVersion: SCHEMA_VERSION, id, createdAt: AT, updatedAt: AT })
let seq = 0
const tx = (date: string, amount: number, over: Partial<Transaction> = {}) =>
  transactionSchema.parse({ ...base(`01K7W00000000000000000${String(++seq).padStart(4, '0')}`), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })

const coffee = tx('2026-10-14', -1240, { counterparty: 'Kawiarnia Mokka' })
const older = tx('2026-09-01', -1890, { counterparty: 'MOKKA BAR' })
const rent = tx('2026-10-10', -240000, { counterparty: 'Spółdzielnia', title: 'czynsz październik' })
const input = (over: Partial<SearchInput> = {}): SearchInput => ({
  transactions: [older, rent, coffee],
  containers: [containerSchema.parse({ ...base('01K7W000000000000000000C01'), name: 'Czynsz', amount: 240000, dueMonth: '2026-10', counterparty: 'Spółdzielnia Mieszkaniowa' })],
  goals: [goalSchema.parse({ ...base('01K7W000000000000000000G01'), name: 'Wakacje w Grecji', target: 800000 })],
  loans: [loanSchema.parse({ ...base('01K7W000000000000000000P01'), name: 'Pożyczka dla Ani', direction: 'given', amount: 50000, date: '2026-09-01', counterparty: 'Anna Nowak' })],
  members: settings.household.members,
  settings: [
    { id: 'quiet', label: 'Cisza nocna', tab: 'layers', words: 'noc rozkazy' },
    { id: 'zoom', label: 'Rozmiar interfejsu', tab: 'view' },
    { id: 'pit', label: 'PIT-38 na Radarze', tab: 'notify', words: 'termin 30 kwietnia' }
  ],
  ctx: { categories: categoryIndex(settings.categories), accounts: settings.accounts, orders: settings.orders },
  ...over
})

describe('paleta szuka wpisów (1.7.0, F19)', () => {
  it('operacje jak wyszukiwanie Operacji: bez polskich znaków, najnowsze najpierw; po kwocie', () => {
    expect(searchRecords('mokka', input()).operations).toEqual([coffee, older])
    expect(searchRecords('12,40', input()).operations).toEqual([coffee])
    expect(searchRecords('spoldzielnia', input()).operations).toEqual([rent])
  })

  it('kontener, cel, pożyczka, domownik i pozycja ustawień – po nazwie, kontrahencie albo kwocie', () => {
    const czynsz = searchRecords('czynsz', input())
    expect(czynsz.containers.map((c) => c.name)).toEqual(['Czynsz'])
    expect(czynsz.operations).toEqual([rent])
    expect(searchRecords('2400', input()).containers.map((c) => c.name)).toEqual(['Czynsz'])
    expect(searchRecords('grecji', input()).goals.map((g) => g.name)).toEqual(['Wakacje w Grecji'])
    expect(searchRecords('nowak', input()).loans.map((l) => l.name)).toEqual(['Pożyczka dla Ani'])
    expect(searchRecords('dom', input()).members.map((m) => m.name)).toEqual(['Dom'])
    expect(searchRecords('cisza nocna', input()).settings.map((s) => s.id)).toEqual(['quiet'])
    expect(searchRecords('noc', input()).settings.map((s) => s.id)).toEqual(['quiet'])
    // An amount finds no setting – a number with words does.
    expect(searchRecords('12,40', input()).settings).toEqual([])
    expect(searchRecords('30', input()).settings).toEqual([])
    expect(searchRecords('pit 38', input()).settings.map((s) => s.id)).toEqual(['pit'])
    // A container by its counterparty.
    expect(searchRecords('mieszkaniowa', input()).containers.map((c) => c.name)).toEqual(['Czynsz'])
  })

  it('puste zapytanie – nic; operacji najwyżej 30', () => {
    expect(searchRecords('  ', input())).toEqual({ operations: [], containers: [], goals: [], loans: [], members: [], settings: [] })
    const many = Array.from({ length: 40 }, (_, i) => tx(`2026-08-${String((i % 28) + 1).padStart(2, '0')}`, -100, { counterparty: 'Żabka' }))
    expect(searchRecords('zabka', input({ transactions: many })).operations).toHaveLength(SEARCH_LIMITS.operations)
  })
})
