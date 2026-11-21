import { describe, expect, it, vi } from 'vitest'

// The fields import the stores, which talk to the main process through window.fi.
vi.stubGlobal('window', { fi: {} })
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
const { readDateDraft, monthFieldText } = await import('../../src/renderer/components/fields')

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
