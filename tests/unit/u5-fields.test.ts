import { describe, expect, it, vi } from 'vitest'

// The fields import the stores, which talk to the main process through window.fi.
vi.stubGlobal('window', { fi: {} })
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
const { readDateDraft, monthFieldText, readMonthDraft } = await import('../../src/renderer/components/fields')

// U5 (c), (b): the date field with an empty value (the period's open ends) and the month field's wording.

describe('readDateDraft: data z pola, także pustego końca okresu', () => {
  const base = { year: 2026, near: '2026-10-05' }

  it('pusty wpis: wolno (null) tylko przy allowEmpty, inaczej odmowa', () => {
    expect(readDateDraft('  ', { ...base, allowEmpty: true })).toBeNull()
    expect(readDateDraft('', base)).toBeUndefined()
  })

  it('formy dat jak dotąd: dd.mm, dd.mm.rrrr, RRRR-MM-DD; rok z wartości pola', () => {
    expect(readDateDraft('16.10', base)).toBe('2026-10-16')
    expect(readDateDraft('16.10.2027', base)).toBe('2027-10-16')
    expect(readDateDraft('2026-10-16', base)).toBe('2026-10-16')
    expect(readDateDraft('16.10', { ...base, year: 2024 })).toBe('2024-10-16')
  })

  it('nieczytelna data – odmowa (undefined), także przy allowEmpty', () => {
    expect(readDateDraft('32.13', { ...base, allowEmpty: true })).toBeUndefined()
    expect(readDateDraft('jutro?', base)).toBeUndefined()
  })
})

describe('monthFieldText: miesiąc słownie', () => {
  it('wartość – nazwa miesiąca i rok, pusta – pusty tekst', () => {
    expect(monthFieldText('2026-11')).toBe('listopad 2026')
    expect(monthFieldText('2027-06')).toBe('czerwiec 2027')
    expect(monthFieldText(null)).toBe('')
  })
})

describe('readMonthDraft: tylko prawdziwa zmiana jest edycją', () => {
  it('draft z fokusu (równy startowi) albo brak draftu – bez edycji, także gdy wartość zmieniła się pod polem', () => {
    expect(readMonthDraft(null, '2026-11')).toEqual({ edited: false })
    expect(readMonthDraft('2026-11', '2026-11')).toEqual({ edited: false })
    expect(readMonthDraft('', '', true)).toEqual({ edited: false })
    // Not even for an empty field that may not stay empty: passing through it says nothing.
    expect(readMonthDraft('', '', false)).toEqual({ edited: false })
  })

  it('wpis: formy miesiąca, opróżnienie tylko przy allowEmpty, nieczytelny – invalid', () => {
    expect(readMonthDraft('3/2027', '2026-11')).toEqual({ edited: true, month: '2027-03', invalid: false })
    expect(readMonthDraft('03.2027', '')).toEqual({ edited: true, month: '2027-03', invalid: false })
    expect(readMonthDraft('', '2026-11', true)).toEqual({ edited: true, month: null, invalid: false })
    expect(readMonthDraft('', '2026-11', false)).toMatchObject({ edited: true, invalid: true })
    expect(readMonthDraft('2027-13', '2026-11', true)).toMatchObject({ edited: true, invalid: true })
  })
})
