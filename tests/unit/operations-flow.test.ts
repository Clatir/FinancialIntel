import { describe, expect, it } from 'vitest'
import { emptyFilter } from '../../src/shared/operationsView'
import { emptyChoices, nextAfterLeave, worksUncategorized } from '../../src/renderer/features/operations/listFlow'

describe('nextAfterLeave – gdzie przechodzi wybór, gdy wiersz zniknął z listy', () => {
  const prev = ['a', 'b', 'c', 'd']
  it('na następny wiersz', () => {
    expect(nextAfterLeave(prev, 'b', ['a', 'c', 'd'])).toBe('c')
  })
  it('na ostatni, gdy zniknął ostatni', () => {
    expect(nextAfterLeave(prev, 'd', ['a', 'b', 'c'])).toBe('c')
  })
  it('pomija następne wiersze, które też zniknęły', () => {
    expect(nextAfterLeave(prev, 'b', ['a', 'd'])).toBe('d')
    expect(nextAfterLeave(prev, 'c', ['a', 'b'])).toBe('b')
  })
  it('null, gdy lista jest pusta', () => {
    expect(nextAfterLeave(['a'], 'a', [])).toBeNull()
  })
  it('null, gdy wiersza nie było na liście', () => {
    expect(nextAfterLeave(prev, 'x', ['a'])).toBeNull()
  })
})

describe('worksUncategorized – filtr „bez kategorii”', () => {
  it('oznaczenie albo pusta kategoria w filtrze kategorii', () => {
    const f = emptyFilter('2026-11')
    expect(worksUncategorized(f)).toBe(false)
    expect(worksUncategorized({ ...f, marks: ['uncategorized'] })).toBe(true)
    expect(worksUncategorized({ ...f, categories: [''] })).toBe(true)
    expect(worksUncategorized({ ...f, categories: ['jedzenie'] })).toBe(false)
  })
})

describe('emptyChoices – wyjścia z pustej listy', () => {
  const base = emptyFilter('2026-11')
  it('pusty miesiąc bez filtrów: poprzedni miesiąc i cała historia', () => {
    expect(emptyChoices(base)).toEqual(['prev', 'all'])
  })
  it('filtry: także „Wyczyść filtry”', () => {
    expect(emptyChoices({ ...base, query: 'xyz' })).toEqual(['prev', 'all', 'clear'])
  })
  it('cała historia z filtrem: tylko „Wyczyść filtry”', () => {
    expect(emptyChoices({ ...base, period: { kind: 'all' }, kinds: ['income'] })).toEqual(['clear'])
  })
  it('zakres dat: cała historia i wyczyść, bez poprzedniego miesiąca', () => {
    expect(emptyChoices({ ...base, period: { kind: 'range', from: '2026-01-01', to: null } })).toEqual(['all', 'clear'])
  })
})
