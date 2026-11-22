import { describe, expect, it, vi } from 'vitest'
import { financeLabel, financerOptionLabel } from '../../src/renderer/features/household/financeWords'
import { bulkOptions, optionsFor } from '../../src/renderer/features/import/options'
import { ruleHintText } from '../../src/shared/import/officer'
import type { Choice } from '../../src/shared/import/reconcile'

/**
 * U3 (T552): a purchase a household member finances is said in one way – „Kupione dla: X” / „Prezent dla: X” – by the
 * import's lists, the keyword rules and the words the toasts and the quick entry's preview take from them.
 */
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: {} })
const { keywordOptions } = await import('../../src/renderer/features/import/KeywordRules')
const { choiceText } = await import('../../src/renderer/features/import/ImportPage')
const { ruleDecisionText } = await import('../../src/renderer/features/import/rules')

const members = [
  { id: 'm1', name: 'Tata', archived: false },
  { id: 'm2', name: 'Stara', archived: true }
]
const labelOf = (list: Array<{ value: string; label: string }>, value: string) => list.find((o) => o.value === value)?.label

describe('U3: słowa finansowania domownika', () => {
  it('financeLabel: kupione dla / prezent dla', () => {
    expect(financeLabel(false, 'Tata')).toBe('Kupione dla: Tata')
    expect(financeLabel(true, 'Tata')).toBe('Prezent dla: Tata')
    expect(financerOptionLabel('Tata', { gift: false })).toBe('kupione dla: Tata (odda)')
    expect(financerOptionLabel('Tata', { gift: true })).toBe('prezent dla: Tata')
    expect(financerOptionLabel('Tata', { gift: false, back: true })).toBe('zakup: Tata')
    expect(financerOptionLabel('Tata', { gift: true, back: true })).toBe('prezent dla: Tata (zwrot do osłon)')
    expect(financerOptionLabel('Tata', { gift: true, compact: true })).toBe('Tata – prezent')
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

describe('U3: reszta miejsc ze starymi słowami (przegląd)', () => {
  const names = [{ id: 'm1', name: 'Tata' }]
  const cat = () => 'Jedzenie'

  it('podgląd tematu / wiersza w imporcie: „kupione dla” / „prezent dla”; zwrot towaru zostaje „dla”', () => {
    const base = { kind: 'expense', categoryId: null, refundable: true, memberId: 'm1' } as unknown as Choice
    expect(choiceText(base, 'out', cat, names, [])).toBe('kupione dla: Tata · Jedzenie')
    expect(choiceText({ ...base, gift: true }, 'out', cat, names, [])).toBe('prezent dla: Tata · Jedzenie')
    expect(choiceText({ ...base, gift: true }, 'out', cat, names, [], true)).toBe('Prezent dla: Tata · Jedzenie')
    expect(choiceText(base, 'in', cat, names, [])).toBe('zwrot towaru dla: Tata · Jedzenie')
  })

  it('lista reguł słów kluczowych: „kupione dla” / „prezent dla”', () => {
    const rule = { kind: 'expense', categoryId: null, refundable: true, memberId: 'm1' } as unknown as Parameters<typeof ruleDecisionText>[0]
    expect(ruleDecisionText(rule, cat, names)).toBe('kupione dla: Tata · Jedzenie')
    expect(ruleDecisionText({ ...rule, gift: true }, cat, names)).toBe('prezent dla: Tata · Jedzenie')
  })

  it('podpowiedź oficera: „kupione dla” / „prezent dla”', () => {
    const hint = { rule: { label: 'Netflix', match: 'netflix' }, categoryId: null, pays: true, refundable: true, memberId: 'm1', gift: false, share: null } as unknown as Parameters<typeof ruleHintText>[0]
    const who = { category: () => 'Rozrywka', member: () => 'Tomek' }
    expect(ruleHintText(hint, who)).toBe('z reguły „Netflix”: kupione dla: Tomek')
    expect(ruleHintText({ ...hint, gift: true }, who)).toBe('z reguły „Netflix”: prezent dla: Tomek')
  })
})
