// adapted from ICTTJ tests/unit/merge.test.ts @ 84a8339
import { describe, expect, it } from 'vitest'
import { chooser, deepEqual, diffRecords, fieldLabel, formatValue, merge3, pathKey, valueAt } from '@shared/merge'

const base = {
  id: 'T',
  updatedAt: '2026-10-05T08:00:00.000Z',
  updatedBy: 'PC-A',
  note: 'zakupy',
  amount: -5000,
  payee: { name: 'Biedronka', city: null as string | null },
  splits: [{ id: 's1', amount: -2500, categoryId: 'c1' }],
  tags: ['t1']
}

describe('różnice pól', () => {
  it('liście obiektów, listy po id, pola techniczne pominięte', () => {
    const after = {
      ...base,
      updatedAt: 'later',
      note: 'zakupy 2',
      payee: { ...base.payee, city: 'Gdańsk' },
      splits: [{ id: 's1', amount: -3000, categoryId: 'c1' }, { id: 's2', amount: -2000, categoryId: 'c2' }],
      tags: ['t1', 't2']
    }
    expect(diffRecords(base, after).map((c) => [c.path.join('.'), c.before, c.after])).toEqual([
      ['note', 'zakupy', 'zakupy 2'],
      ['payee.city', null, 'Gdańsk'],
      ['splits.#s1.amount', -2500, -3000],
      ['splits.#s2', undefined, { id: 's2', amount: -2000, categoryId: 'c2' }],
      ['tags', ['t1'], ['t1', 't2']]
    ])
    expect(diffRecords(base, structuredClone(base))).toEqual([])
    expect(diffRecords(base, { ...base, updatedAt: 'x', updatedBy: 'PC-B', schemaVersion: 2, computed: { a: 1 } })).toEqual([])
    expect(deepEqual({ a: [1, { b: null }] }, { a: [1, { b: null }] })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true)
    expect(deepEqual([1, 2], [2, 1])).toBe(false)
    expect(deepEqual(null, undefined)).toBe(true)
    expect(deepEqual(0, null)).toBe(false)
  })

  it('etykiety i wartości po polsku', () => {
    expect(fieldLabel(['note'])).toBe('Notatka')
    expect(fieldLabel(['settings', 'shipName'])).toBe('Nazwa okrętu')
    expect(fieldLabel(['settings', 'sync', 'remoteChanges'])).toBe('Zmiany z drugiego komputera')
    expect(fieldLabel(['settings', 'layoutPresets', '#x', 'name'])).toBe('Zapisane układy – name')
    expect(fieldLabel(['settings', 'accounts'])).toBe('Konta')
    expect(fieldLabel(['splits', '#s1', 'amount'])).toBe('Podział – kwota')
    expect(fieldLabel(['settings', 'categories', '#c', 'envelope'])).toBe('Kategorie – koperta')
    expect(fieldLabel(['settings', 'futureThing'])).toBe('Ustawienia – futureThing')
    expect(fieldLabel(['nieznane', 'pole'])).toBe('nieznane.pole')
    expect(fieldLabel([])).toBe('(cały wpis)')
    expect([formatValue(null), formatValue(undefined), formatValue(''), formatValue([]), formatValue([1, 2]), formatValue([1]), formatValue([1, 2, 3, 4, 5]), formatValue(1.5), formatValue(true), formatValue('a'.repeat(100), 10), formatValue({ a: 1 })]).toEqual([
      'puste',
      '—',
      'puste',
      'puste',
      '2 pozycje',
      '1 pozycja',
      '5 pozycji',
      '1.5',
      'true',
      'aaaaaaaaa…',
      '{"a":1}'
    ])
  })
})

describe('scalanie trzech wersji', () => {
  it('zmiany w różnych polach łączą się bez pytania', () => {
    const mine = { ...base, note: 'moja notatka', splits: [{ id: 's1', amount: -2500, categoryId: 'c1' }, { id: 's3', amount: -2500, categoryId: 'c3' }] }
    const theirs = { ...base, updatedAt: 'T2', updatedBy: 'PC-B', amount: -6000, payee: { ...base.payee, city: 'Gdańsk' } }
    const { merged, conflicts } = merge3(base, mine, theirs)
    expect(conflicts).toEqual([])
    expect(merged).toMatchObject({ note: 'moja notatka', amount: -6000, payee: { name: 'Biedronka', city: 'Gdańsk' }, updatedAt: 'T2', updatedBy: 'PC-B' })
    expect(merged.splits.map((x) => x.id)).toEqual(['s1', 's3'])
  })

  it('to samo pole zmienione po obu stronach: konflikt, wybór per pole', () => {
    const mine = { ...base, note: 'A', amount: -7000 }
    const theirs = { ...base, note: 'B', amount: -7000, payee: { ...base.payee, name: 'Lidl' } }
    const r = merge3(base, mine, theirs)
    expect(r.conflicts.map((c) => [c.path.join('.'), c.mine, c.theirs])).toEqual([['note', 'A', 'B']])
    expect(r.merged).toMatchObject({ note: 'A', amount: -7000, payee: { name: 'Lidl' } })
    const r2 = merge3(base, mine, theirs, chooser({ [pathKey(['note'])]: 'theirs' }))
    expect(r2.merged.note).toBe('B')
    expect(merge3(base, mine, theirs, chooser(new Map([[pathKey(['note']), 'theirs' as const]]))).merged.note).toBe('B')
    expect(merge3(base, mine, theirs, chooser({}, 'theirs')).merged.note).toBe('B')
    expect(merge3(base, mine, theirs, () => 'theirs').merged.note).toBe('B')
  })

  it('listy po id: dodane po obu stronach zostają, usunięte bez zmian znikają, usunięte-zmienione to konflikt', () => {
    const b = { splits: [{ id: 'a', p: 1 }, { id: 'b', p: 2 }, { id: 'c', p: 3 }] }
    const mine = { splits: [{ id: 'a', p: 1 }, { id: 'b', p: 20 }, { id: 'm', p: 9 }] } // c removed, b changed, m added
    const theirs = { splits: [{ id: 'a', p: 10 }, { id: 'c', p: 3 }, { id: 't', p: 8 }] } // b removed, a changed, t added
    const r = merge3(b, mine, theirs)
    expect(r.conflicts.map((c) => c.path.join('.'))).toEqual(['splits.#b'])
    expect(r.merged.splits).toEqual([{ id: 'a', p: 10 }, { id: 't', p: 8 }, { id: 'b', p: 20 }, { id: 'm', p: 9 }])
    const takeTheirs = merge3(b, mine, theirs, () => 'theirs')
    expect(takeTheirs.merged.splits.map((x) => x.id)).toEqual(['a', 't', 'm'])
  })

  it('wartość pod ścieżką konfliktu – także element listy po id (N17: podpowiedź strony w „Scal…”)', () => {
    const mine = { ...base, splits: [{ id: 's1', amount: -3000, categoryId: 'c1' }] }
    const theirs = { ...base, note: 'obiad' }
    const all = merge3(undefined, mine, theirs).conflicts
    expect(all.map((c) => pathKey(c.path))).toEqual(expect.arrayContaining([pathKey(['note']), pathKey(['splits', '#s1', 'amount'])]))
    expect(valueAt(base, ['splits', '#s1', 'amount'])).toBe(-2500)
    expect(valueAt(base, ['payee', 'name'])).toBe('Biedronka')
    expect(valueAt(base, ['splits', '#nie-ma', 'amount'])).toBeUndefined()
    expect(valueAt(base, ['note', 'x'])).toBeUndefined()
  })

  it('bez wersji bazowej każda różnica jest konfliktem; identyczne zmiany nie są', () => {
    const r = merge3(undefined, { a: 1, b: 2 }, { a: 1, b: 3 })
    expect(r.conflicts.map((c) => c.path.join('.'))).toEqual(['b'])
    expect(merge3(base, { ...base, note: 'x' }, { ...base, note: 'x' }).conflicts).toEqual([])
  })

  it('usunięcie klucza po jednej stronie bez zmian po drugiej', () => {
    const r = merge3({ a: 1, b: 2 }, { a: 1 }, { a: 5, b: 2 })
    expect(r.merged).toEqual({ a: 5 })
    expect(r.conflicts).toEqual([])
  })

  it('klucz dodany po jednej stronie (nowa koperta) przy zmianie innego tutaj: scalone bez pytania; dwa różne dodania – konflikt (B47)', () => {
    const plan = { envelopes: { A: 10000 } }
    const r = merge3(plan, { envelopes: { A: 15000 } }, { envelopes: { A: 10000, C: 30000 } })
    expect(r.conflicts).toEqual([])
    expect(r.merged).toEqual({ envelopes: { A: 15000, C: 30000 } })
    const both = merge3(plan, { envelopes: { A: 10000, C: 1 } }, { envelopes: { A: 10000, C: 2 } })
    expect(both.conflicts.map((c) => [c.path.join('.'), c.base])).toEqual([['envelopes.C', undefined]])
    // An optional field added there (`bankName`), another changed here.
    expect(merge3({ note: '' }, { note: 'moja' }, { note: '', bankName: 'BANK' }).merged).toEqual({ note: 'moja', bankName: 'BANK' })
  })

  it('pola techniczne nigdy nie są konfliktem: wygrywa przychodząca wersja', () => {
    const r = merge3(base, { ...base, updatedAt: 'mine', updatedBy: 'PC-A', note: 'm' }, { ...base, updatedAt: 'theirs', updatedBy: 'PC-B' })
    expect(r.conflicts).toEqual([])
    expect(r.merged).toMatchObject({ updatedAt: 'theirs', updatedBy: 'PC-B', note: 'm' })
  })
})

describe('nazwy pól w historii i oknach zmian (1.6.5, N92)', () => {
  const CAT = '01K6H3Z0W8Q4M2N5P7R9S1T3V5'
  it('identyfikator w ścieżce zamieniony na nazwę: koperta kategorii, bez nazwy – jak dotąd', () => {
    const names = new Map([[CAT, 'Jedzenie']])
    expect(fieldLabel(['envelopes', CAT], names)).toBe('Koperty – Jedzenie')
    expect(fieldLabel(['envelopes', CAT])).toBe(`Koperty – ${CAT}`)
    // A known field keeps its own label; the name is not doubled.
    expect(fieldLabel(['note'], names)).toBe(fieldLabel(['note']))
  })
})
