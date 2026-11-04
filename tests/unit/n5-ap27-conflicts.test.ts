import { describe, expect, it } from 'vitest'
import type { ConflictEntry, ConflictSide } from '@shared/api'
import { conflictSubject } from '@shared/conflicts'
import { dateValueText, diffRecords, fieldLabel, formatValue, readableChanges } from '@shared/merge'
import { formatPln } from '@shared/format'

const ACC = '01KDEFACC00000000000000001'
const CAT = '01KDEFCAT00000000000000001'
const names = new Map([
  [ACC, 'mBank'],
  [CAT, 'Jedzenie']
])
const amount = (g: number) => `${formatPln(g)} zł`
const side = (record: unknown, relPath = 'transactions/2026/2026-10-14_01M6GDM914YEJ2RP70WV1T1NF8.json'): ConflictSide => ({ relPath, record, error: null, updatedAt: null, mtimeMs: 1 }) as ConflictSide
const conflict = (kind: ConflictEntry['kind'], canonical: unknown, copy: unknown = canonical): Pick<ConflictEntry, 'kind' | 'canonical' | 'copy'> => ({ kind, canonical: side(canonical), copy: side(copy) })

describe('karta konfliktu (AP-27, DA sp. 3): kontrahent, data i kwota zamiast nazwy pliku', () => {
  it('operacja – kontrahent, data dd.mm.rrrr, kwota i konto; bez ULID', () => {
    const tx = { id: '01M6GDM914YEJ2RP70WV1T1NF8', date: '2026-10-14', amount: -2550, counterparty: 'BOLT.EU', accountId: ACC, categoryId: CAT }
    const text = conflictSubject(conflict('transactions', tx), { amount, names })
    expect(text).toBe('BOLT.EU · 14.10.2026 · −25,50 zł · mBank')
    expect(text).not.toMatch(/[0-9A-HJKMNP-TV-Z]{26}/)
    // Without a counterparty: the title, else the category.
    expect(conflictSubject(conflict('transactions', { ...tx, counterparty: '', title: 'Przelew za prąd' }), { amount, names })).toBe('Przelew za prąd · 14.10.2026 · −25,50 zł · mBank')
    expect(conflictSubject(conflict('transactions', { ...tx, counterparty: '' }), { amount, names })).toBe('Jedzenie · 14.10.2026 · −25,50 zł · mBank')
  })

  it('oryginał nieczytelny – z kopii; obie nieczytelne – pusto', () => {
    const c = { kind: 'transactions' as const, canonical: side(null), copy: side({ date: '2026-10-14', amount: -100, counterparty: 'Mokka', accountId: ACC }) }
    expect(conflictSubject(c, { amount })).toBe('Mokka · 14.10.2026 · −1,00 zł')
    expect(conflictSubject({ ...c, copy: side(null) }, { amount })).toBe('')
  })

  it('plan miesiąca, kontener, cel, pożyczka, saldo, boja, ustawienia', () => {
    expect(conflictSubject(conflict('months', { month: '2026-11' }), { amount })).toBe('listopad 2026')
    expect(conflictSubject(conflict('containers', { name: 'Netflix', amount: 6000 }), { amount })).toBe('Netflix · 60,00 zł')
    expect(conflictSubject(conflict('goals', { name: 'Wakacje', target: 500000 }), { amount })).toBe(`Wakacje · ${amount(500000)}`)
    expect(conflictSubject(conflict('loans', { name: 'Dla Ani', counterparty: 'Ania', amount: 100000 }), { amount })).toBe(`Dla Ani · Ania · ${amount(100000)}`)
    expect(conflictSubject(conflict('balances', { kind: 'opening', accountId: ACC, date: '2026-10-01', amount: 500000 }), { amount, names })).toBe(`saldo otwarcia · mBank · 01.10.2026 · ${amount(500000)}`)
    expect(conflictSubject(conflict('scheduled', { name: 'OC auta', date: '2026-12-01', amount: null }), { amount })).toBe('OC auta · 01.12.2026')
    expect(conflictSubject(conflict('fi', { settings: { shipName: 'Jastrząb' } }), { amount })).toBe('ustawienia budżetu · okręt Jastrząb')
  })
})

describe('różnice nazwami pól po polsku, bez JSON (AP-27, DA.22, DA.23, DA.28, DA.30)', () => {
  it('tagi – nazwa pola i słowa zamiast „tags” / „1 pozycja”', () => {
    const [change] = diffRecords({ tags: [] }, { tags: ['laptop'] })
    expect(fieldLabel(change!.path)).toBe('Tagi')
    expect(formatValue(change!.after)).toBe('laptop')
  })

  it('dane z banku dodane po jednej stronie – pola po polsku, nigdy {"format":…}', () => {
    const bank = { format: 'mbank', key: 'k1', description: 'BOLT.EU Tallinn', pending: false }
    const rows = readableChanges(diffRecords({ amount: -100 }, { amount: -100, bank }))
    expect(rows.map((r) => fieldLabel(r.path))).toEqual(['Dane z banku – format pliku', 'Dane z banku – klucz wiersza', 'Opis z banku', 'Transakcja nierozliczona'])
    expect(rows.map((r) => [formatValue(r.before), formatValue(r.after)])).toEqual([
      ['—', 'mbank'],
      ['—', 'k1'],
      ['—', 'BOLT.EU Tallinn'],
      ['—', 'nie']
    ])
    // An object as one value (a choice of „Scal…”) – its fields by name, never JSON.
    const whole = formatValue(bank, 200, { path: ['bank'] })
    expect(whole).not.toMatch(/[{}"]/)
    expect(whole).toContain('format pliku: mbank')
  })

  it('identyfikator wpisu nie jest różnicą (dwa plany jednego miesiąca)', () => {
    const rows = readableChanges(diffRecords({ id: '01KAAAAAAAAAAAAAAAAAAAAAAA', month: '2026-11', salary: 1 }, { id: '01KBBBBBBBBBBBBBBBBBBBBBBB', month: '2026-11', salary: 2 }))
    expect(rows.map((r) => r.path)).toEqual([['salary']])
  })

  it('czas zapisu i daty po polsku, w czasie warszawskim', () => {
    expect(formatValue('2026-11-03T11:24:23.355Z')).toBe('03.11.2026, 12:24')
    expect(formatValue('2026-10-14')).toBe('14.10.2026')
    expect(dateValueText('2026-11')).toBe('11.2026')
    // A text that only looks like a date stays as it is.
    expect(formatValue('2026-10-14 zakupy')).toBe('2026-10-14 zakupy')
  })

  it('kwota wewnątrz obiektu przez formater okna (maskowanie Ctrl+$)', () => {
    expect(formatValue({ amount: -1200, categoryId: CAT }, 80, { path: ['splits', '#s1'], names, amount: () => '••• zł' })).toBe('kwota: ••• zł, kategoria: Jedzenie')
  })
})
