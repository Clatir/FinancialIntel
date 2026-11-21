import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { defaultCategories, defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Category, type Transaction } from '@shared/schema'
import { categoryChoices, counterpartyHistory, filterChoices, recentCategoryIds, suggestCounterparties } from '../../src/renderer/features/operations/pick'

// Z7 (UX-70, UX-72): the category field's choices and search, the „Ostatnie” section, the counterparty's suggestions.

let seq = 0
const nextId = () => `01K7Z7000000000000000000${String(++seq).padStart(2, '0')}`
const tx = (over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, amount: -1000, ...over })

const cats = defaultCategories()
const index = categoryIndex(cats)
const FOOD = defaultCategoryId(1)

describe('categoryChoices – drzewo kategorii do pola', () => {
  it('główne z podkategoriami, etykieta „Główna · Pod”', () => {
    const choices = categoryChoices(index, null)
    const main = choices.find((c) => c.id === FOOD)!
    expect(main).toMatchObject({ label: index.label(FOOD), main: true })
    const sub = choices.find((c) => c.label === 'Jedzenie · zakupy spożywcze')!
    expect(sub.main).toBe(false)
    expect(choices.findIndex((c) => c.id === FOOD)).toBeLessThan(choices.indexOf(sub))
  })

  it('zarchiwizowana kategoria tylko jako bieżąca wartość', () => {
    const archived: Category[] = cats.map((c) => (c.id === FOOD ? { ...c, archived: true } : c))
    const idx = categoryIndex(archived)
    expect(categoryChoices(idx, null).some((c) => c.id === FOOD)).toBe(false)
    expect(categoryChoices(idx, FOOD).some((c) => c.id === FOOD)).toBe(true)
  })
})

describe('filterChoices – szukanie po fragmencie', () => {
  const choices = categoryChoices(index, null)
  it('bez polskich znaków i wielkości liter', () => {
    expect(filterChoices(choices, 'SPOZYW').map((c) => c.label)).toContain('Jedzenie · zakupy spożywcze')
    expect(filterChoices(choices, 'na miescie').map((c) => c.label)).toContain('Jedzenie · na mieście')
  })
  it('słowa w dowolnej kolejności, wszystkie muszą pasować', () => {
    const found = filterChoices(choices, 'zakupy jedz').map((c) => c.label)
    expect(found).toContain('Jedzenie · zakupy spożywcze')
    expect(filterChoices(choices, 'jedz zzzzz')).toEqual([])
  })
  it('puste szukanie – wszystko', () => {
    expect(filterChoices(choices, '  ')).toBe(choices)
  })
})

describe('recentCategoryIds – ostatnie kategorie z najnowszych operacji', () => {
  const A = defaultCategoryId(1)
  const B = defaultCategoryId(2)
  const C = defaultCategoryId(3)
  it('najnowsze pierwsze, bez powtórzeń; linie paragonu też; tylko wydatki', () => {
    const list = [
      tx({ date: '2026-10-01', categoryId: A }),
      tx({ date: '2026-10-05', categoryId: B }),
      tx({ date: '2026-10-03', categoryId: A }),
      tx({ date: '2026-10-09', categoryId: null, splits: [{ id: nextId(), amount: -500, categoryId: C }, { id: nextId(), amount: -500, categoryId: null }] as Transaction['splits'] }),
      tx({ date: '2026-10-20', kind: 'income', amount: 1000, categoryId: null })
    ]
    expect(recentCategoryIds(list)).toEqual([C, B, A])
  })
  it('ta sama lista – ta sama referencja', () => {
    const list = [tx({ categoryId: A })]
    expect(recentCategoryIds(list)).toBe(recentCategoryIds(list))
  })
})

describe('podpowiedzi kontrahenta z historii', () => {
  const mk = (name: string, date: string, categoryId: string | null) => tx({ counterparty: name, date, categoryId })
  const list = [
    mk('Biedronka', '2026-10-01', defaultCategoryId(1)),
    mk('Biedronka', '2026-10-08', defaultCategoryId(1, 1)),
    mk('biedronka', '2026-10-09', defaultCategoryId(1, 1)),
    mk('Żabka', '2026-10-07', defaultCategoryId(1)),
    mk('Bistro Łódź', '2026-10-02', null),
    mk('', '2026-10-10', defaultCategoryId(1))
  ]
  const history = counterpartyHistory(list)

  it('jedna pozycja na nazwę (bez wielkości liter), najczęstsze pierwsze, z ostatnią kategorią', () => {
    expect(history.map((h) => h.name)).toEqual(['biedronka', 'Żabka', 'Bistro Łódź'])
    expect(history[0]).toMatchObject({ n: 3, categoryId: defaultCategoryId(1, 1) })
    expect(history[2]!.categoryId).toBeNull()
  })

  it('po fragmencie, bez polskich znaków; nigdy więcej niż 8', () => {
    expect(suggestCounterparties(history, 'zab').map((h) => h.name)).toEqual(['Żabka'])
    expect(suggestCounterparties(history, 'lodz').map((h) => h.name)).toEqual(['Bistro Łódź'])
    expect(suggestCounterparties(history, 'b').map((h) => h.name)).toEqual(['biedronka', 'Żabka', 'Bistro Łódź'])
    const many = Array.from({ length: 20 }, (_, i) => ({ name: `Sklep ${i}`, n: 20 - i, categoryId: null }))
    expect(suggestCounterparties(many, 'sklep')).toHaveLength(8)
  })

  it('pomija dokładnie to, co wpisano (nie ma czego podpowiadać)', () => {
    expect(suggestCounterparties(history, 'żabka')).toEqual([])
    expect(suggestCounterparties(history, 'ŻABKA ')).toEqual([])
    expect(suggestCounterparties(history, 'zabk').map((h) => h.name)).toEqual(['Żabka'])
  })

  it('puste pole – nic', () => {
    expect(suggestCounterparties(history, '')).toEqual([])
  })
})
