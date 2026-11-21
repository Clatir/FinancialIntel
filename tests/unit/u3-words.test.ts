import { describe, expect, it, vi } from 'vitest'
import { financeLabel } from '../../src/renderer/features/household/financeWords'
import { bulkOptions, optionsFor } from '../../src/renderer/features/import/options'

/**
 * U3 (T552): a purchase a household member finances is said in one way – „Kupione dla: X” / „Prezent dla: X” – by the
 * import's lists, the keyword rules and the words the toasts and the quick entry's preview take from them.
 */
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: {} })
const { keywordOptions } = await import('../../src/renderer/features/import/KeywordRules')

const members = [
  { id: 'm1', name: 'Tata', archived: false },
  { id: 'm2', name: 'Stara', archived: true }
]
const labelOf = (list: Array<{ value: string; label: string }>, value: string) => list.find((o) => o.value === value)?.label

describe('U3: słowa finansowania domownika', () => {
  it('financeLabel: kupione dla / prezent dla', () => {
    expect(financeLabel(false, 'Tata')).toBe('Kupione dla: Tata')
    expect(financeLabel(true, 'Tata')).toBe('Prezent dla: Tata')
  })

  it('lista importu (wydatek) i decyzja zbiorcza: „Kupione dla” / „Prezent dla”, bez „Finansuje” i „Prezent od”', () => {
    for (const list of [optionsFor('out', members), bulkOptions(members)]) {
      expect(labelOf(list, 'refundable:m1')).toBe('Kupione dla: Tata')
      expect(labelOf(list, 'gift:m1')).toBe('Prezent dla: Tata')
      expect(list.some((o) => /Finansuje|Prezent od/.test(o.label))).toBe(false)
    }
  })

  it('słowa kluczowe: „Kupione dla: X – kategoria” tylko dla aktywnych domowników', () => {
    const list = keywordOptions(members)
    expect(labelOf(list, 'refundable:m1')).toBe('Kupione dla: Tata – kategoria')
    expect(list.some((o) => o.value === 'refundable:m2')).toBe(false)
  })
})
