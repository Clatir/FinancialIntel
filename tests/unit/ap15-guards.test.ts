import { describe, expect, it, vi } from 'vitest'
import { MAX_TAGS, MAX_TAG_LENGTH, tagsLost } from '@shared/calc/tags'
import { orderRange, swappedText } from '../../src/renderer/lib/guards'

// The fields import the stores, which talk to the main process through window.fi.
vi.stubGlobal('window', { fi: {} })
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
const { amountRefusal } = await import('../../src/renderer/components/fields')
const { refusal } = await import('../../src/renderer/components/ui')

describe('AP-15: nic nie zmienia się po cichu', () => {
  it('„od” po „do” – zamiana z komunikatem (AF-21, AF-36)', () => {
    expect(orderRange(100, 20)).toEqual({ from: 20, to: 100, swapped: true })
    expect(orderRange('2026-10-20', '2026-10-01')).toEqual({ from: '2026-10-01', to: '2026-10-20', swapped: true })
    expect(orderRange(20, 100).swapped).toBe(false)
    expect(orderRange(20, null)).toEqual({ from: 20, to: null, swapped: false })
    expect(orderRange(5, 5).swapped).toBe(false)
    expect(swappedText('kwoty', '20,00 zł', '100,00 zł')).toBe('„Od” było po „do” – kwoty zamienione: 20,00 zł – 100,00 zł.')
  })

  it('odmowa kwoty mówi dlaczego i co zostaje (AF-17, PR sp. 6)', () => {
    expect(amountRefusal('1.200')).toContain('Nieprawidłowa kwota – zostaje poprzednia')
    expect(amountRefusal('12,345')).toContain('najwyżej 2 miejsca po przecinku')
    expect(amountRefusal('-5')).toBe('Kwota nie może być ujemna – zostaje poprzednia.')
    expect(amountRefusal('  ')).toBe('Kwota nie może być pusta – zostaje poprzednia.')
  })

  it('odmowa liczby: zakres, całkowita, pusta (US sp. 8, PR sp. 6)', () => {
    expect(refusal(30, 0, [1, 24])).toBe('Dozwolone: od 1 do 24 – zostaje poprzednia.')
    expect(refusal(2.5, 0, [1, 120])).toBe('Tu tylko liczby całkowite – zostaje poprzednia.')
    expect(refusal(null, 0)).toBe('Pole nie może być puste – zostaje poprzednia.')
    expect(refusal(undefined, 0)).toBe('To nie jest liczba – zostaje poprzednia.')
    expect(refusal(99, 1)).toBe('Wartość spoza dozwolonego zakresu – zostaje poprzednia.')
  })

  it('tagi: co zostanie skrócone albo pominięte (OP.27)', () => {
    expect(tagsLost([], 'wakacje, remont')).toEqual({ cut: 0, over: 0 })
    expect(tagsLost([], 'a'.repeat(MAX_TAG_LENGTH + 1))).toEqual({ cut: 1, over: 0 })
    expect(tagsLost([], 'a'.repeat(MAX_TAG_LENGTH))).toEqual({ cut: 0, over: 0 })
    const full = Array.from({ length: MAX_TAGS }, (_, i) => `tag${i}`)
    expect(tagsLost(full, 'nowy, tag3')).toEqual({ cut: 0, over: 1 })
    expect(tagsLost(full, 'Tag3')).toEqual({ cut: 0, over: 0 })
    expect(tagsLost(full.slice(0, 19), '#a #b #c')).toEqual({ cut: 0, over: 2 })
  })
})
