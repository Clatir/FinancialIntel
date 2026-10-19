// adapted from ICTTJ tests/unit/format.test.ts @ 84a8339
import { describe, expect, it } from 'vitest'
import {
  countLabel,
  fmtBytes,
  parseAmountInput,
  parseClockInput,
  parseDateInput,
  parseNumberInput,
  plural
} from '../../src/renderer/lib/format'

const NBSP = ' '
const MINUS = '−'

describe('rozmiary plików', () => {
  it('rozmiary plików', () => {
    expect(fmtBytes(512)).toBe('512 B')
    expect(fmtBytes(2048)).toBe('2.0 KB')
    expect(fmtBytes(20 * 1024)).toBe('20 KB')
    expect(fmtBytes(3 * 1024 * 1024)).toBe('3.00 MB')
    expect(fmtBytes(2 * 1024 ** 3)).toBe('2.00 GB')
  })
})

describe('formatowanie i parsowanie pól', () => {
  it('liczby z przecinkiem lub kropką', () => {
    expect(parseNumberInput('1,08535')).toBe(1.08535)
    expect(parseNumberInput(' 1.085 ')).toBe(1.085)
    expect(parseNumberInput(`${MINUS}3`)).toBe(-3)
    expect(parseNumberInput('')).toBeNull()
    expect(parseNumberInput('1.0.8')).toBeUndefined()
    expect(parseNumberInput('abc')).toBeUndefined()
  })
  it('kwoty z separatorem tysięcy, minusem U+2212 i ograniczeniem', () => {
    expect(parseAmountInput(`8${NBSP}640,50`)).toBe(8640.5)
    expect(parseAmountInput('1 223.5')).toBe(1223.5)
    expect(parseAmountInput(`${MINUS}45,99`)).toBe(-45.99)
    expect(parseAmountInput('')).toBeNull()
    expect(parseAmountInput('12zł')).toBeUndefined()
    expect(parseAmountInput('9'.repeat(20))).toBe(1e12)
    expect(parseAmountInput(`-${'9'.repeat(20)}`)).toBe(-1e12)
  })
  it('kwota jako działanie (F7): mnożenie i dzielenie najpierw, wynik do grosza; niepełne działanie – błąd', () => {
    expect(parseAmountInput('12,50+8,30')).toBe(20.8)
    expect(parseAmountInput('3*4,99')).toBe(14.97)
    expect(parseAmountInput('100 - 15')).toBe(85)
    expect(parseAmountInput('2+3*4')).toBe(14)
    expect(parseAmountInput('10/3')).toBe(3.33)
    expect(parseAmountInput('10:4')).toBe(2.5)
    expect(parseAmountInput(`${MINUS}5+2`)).toBe(-3)
    expect(parseAmountInput('12+')).toBeUndefined()
    expect(parseAmountInput('1/0')).toBeUndefined()
    expect(parseAmountInput('2**3')).toBeUndefined()
    expect(parseAmountInput('1.234,56')).toBeUndefined()
  })
  it('data słowem (F7): dziś, wczoraj, przedwczoraj, „-3” – od dziś', () => {
    const today = '2026-10-19'
    expect(parseDateInput('wczoraj', 2026, today, today, today)).toBe('2026-10-18')
    expect(parseDateInput('Wcz', 2026, today, today, today)).toBe('2026-10-18')
    expect(parseDateInput('dziś', 2026, today, today, today)).toBe(today)
    expect(parseDateInput('przedwczoraj', 2026, today, today, today)).toBe('2026-10-17')
    // Never a name of Object's prototype.
    expect(parseDateInput('constructor', 2026, today, today, today)).toBeNull()
    expect(parseDateInput('__proto__', 2026, today, today, today)).toBeNull()
    expect(parseDateInput('-3', 2026, today, today, today)).toBe('2026-10-16')
    expect(parseDateInput('jutro', 2026, today, today, today)).toBeNull()
  })
  it('godziny w skróconych formatach', () => {
    expect(parseClockInput('330')).toBe('03:30')
    expect(parseClockInput('3:30')).toBe('03:30')
    expect(parseClockInput('14.05')).toBe('14:05')
    expect(parseClockInput('7')).toBe('07:00')
    expect(parseClockInput('2460')).toBeNull()
  })
  it('daty ISO i polskie', () => {
    expect(parseDateInput('2026-03-16')).toBe('2026-03-16')
    expect(parseDateInput('16.03.2026')).toBe('2026-03-16')
    expect(parseDateInput('16.3', 2026)).toBe('2026-03-16')
    expect(parseDateInput('31.02.2026')).toBeNull()
  })
})

describe('odmiana liczebników', () => {
  const cel = (n: number) => countLabel(n, 'cel', 'cele', 'celów')
  const miesiac = (n: number) => countLabel(n, 'miesiąc', 'miesiące', 'miesięcy')
  it('1, 2–4, 5+ i wyjątki 12–14', () => {
    expect([0, 1, 2, 3, 4, 5, 11, 12, 13, 14, 21, 22, 24, 25, 101, 102, 112, 122].map(cel)).toEqual([
      '0 celów', '1 cel', '2 cele', '3 cele', '4 cele', '5 celów', '11 celów', '12 celów', '13 celów', '14 celów',
      '21 celów', '22 cele', '24 cele', '25 celów', '101 celów', '102 cele', '112 celów', '122 cele'
    ])
    expect([1, 2, 5, 12, 23].map(miesiac)).toEqual(['1 miesiąc', '2 miesiące', '5 miesięcy', '12 miesięcy', '23 miesiące'])
  })

  it('ułamek: dopełniacz liczby pojedynczej; liczby ujemne jak dodatnie', () => {
    expect(countLabel(2.5, 'dzień', 'dni', 'dni', 'dnia')).toBe('2.5 dnia')
    expect(countLabel(200, 'operacja', 'operacje', 'operacji')).toBe('200 operacji')
    expect(countLabel(-3, 'operacja', 'operacje', 'operacji')).toBe('-3 operacje')
    expect(plural(-1, 'operacja', 'operacje', 'operacji')).toBe('operacja')
    expect(plural(0.5, 'wpłata', 'wpłaty', 'wpłat')).toBe('wpłaty')
    expect(plural(Number.NaN, 'cel', 'cele', 'celów')).toBe('celów')
    expect(countLabel(3, 'wpłata niestandardowa', 'wpłaty niestandardowe', 'wpłat niestandardowych')).toBe('3 wpłaty niestandardowe')
  })
})
