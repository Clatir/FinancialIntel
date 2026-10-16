// adapted from ICTTJ tests/unit/format.test.ts @ 84a8339
import { describe, expect, it } from 'vitest'
import {
  countLabel,
  fmtAmount,
  fmtBytes,
  fmtNum,
  fmtPct,
  fmtPctShort,
  fmtPercent,
  fmtPln,
  parseAmountInput,
  parseClockInput,
  parseDateInput,
  parseNumberInput,
  plural,
  tone
} from '../../src/renderer/lib/format'

const NBSP = ' '
const MINUS = '−'

describe('kwoty w groszach (fmtPln)', () => {
  it('pełne złote bez groszy, grosze po przecinku, tysiące ze spacją niełamiącą', () => {
    expect(fmtPln(864000)).toBe(`8${NBSP}640${NBSP}zł`)
    expect(fmtPln(10333)).toBe(`103,33${NBSP}zł`)
    expect(fmtPln(0)).toBe(`0${NBSP}zł`)
    expect(fmtPln(5)).toBe(`0,05${NBSP}zł`)
    expect(fmtPln(123456789)).toBe(`1${NBSP}234${NBSP}567,89${NBSP}zł`)
    expect(fmtPln(100000000)).toBe(`1${NBSP}000${NBSP}000${NBSP}zł`)
  })

  it('minus U+2212, plus tylko na życzenie; brak wartości = kreska', () => {
    expect(fmtPln(-5)).toBe(`${MINUS}0,05${NBSP}zł`)
    expect(fmtPln(-864000)).toBe(`${MINUS}8${NBSP}640${NBSP}zł`)
    expect(fmtPln(100, { sign: true })).toBe(`+1${NBSP}zł`)
    expect(fmtPln(-100, { sign: true })).toBe(`${MINUS}1${NBSP}zł`)
    expect(fmtPln(0, { sign: true })).toBe(`0${NBSP}zł`)
    expect(fmtPln(null)).toBe('—')
    expect(fmtPln(undefined)).toBe('—')
    expect(fmtPln(Number.NaN)).toBe('—')
    expect(fmtPln(Number.POSITIVE_INFINITY)).toBe('—')
  })

  it('grosze zawsze, gdy decimals: always', () => {
    expect(fmtPln(100, { decimals: 'always' })).toBe(`1,00${NBSP}zł`)
    expect(fmtPln(864000, { decimals: 'always' })).toBe(`8${NBSP}640,00${NBSP}zł`)
    expect(fmtPln(10333, { decimals: 'auto' })).toBe(`103,33${NBSP}zł`)
    expect(fmtPln(-100, { decimals: 'always', sign: true })).toBe(`${MINUS}1,00${NBSP}zł`)
  })

  it('ułamek grosza zaokrąglony; nigdy „−0 zł”', () => {
    expect(fmtPln(10333.4)).toBe(`103,33${NBSP}zł`)
    expect(fmtPln(-0.4)).toBe(`0${NBSP}zł`)
  })
})

describe('liczby i procenty', () => {
  it('kwota z separatorem tysięcy, bez „−0.00”', () => {
    expect(fmtAmount(1223.5, 'PLN')).toBe(`1${NBSP}223.50 PLN`)
    expect(fmtAmount(-1223.5)).toBe(`${MINUS}1${NBSP}223.50`)
    expect(fmtAmount(-0.001)).toBe('0.00')
    expect(fmtAmount(12, undefined, 0)).toBe('12')
    expect(fmtAmount(null)).toBe('—')
    expect(fmtPct(11)).toBe('11.00%')
    expect(fmtPct(-2.5, 1)).toBe(`${MINUS}2.5%`)
    expect(fmtPctShort(50)).toBe('50%')
    expect(fmtPctShort(46.5)).toBe('46.5%')
    expect(fmtPercent(0.125, 1)).toBe('12.5%')
    expect(fmtPercent(null)).toBe('—')
    expect(fmtNum(1.23456, 3)).toBe('1.235')
    expect(fmtNum(Number.NaN)).toBe('—')
  })

  it('rozmiary plików i kolor kwoty', () => {
    expect(fmtBytes(512)).toBe('512 B')
    expect(fmtBytes(2048)).toBe('2.0 KB')
    expect(fmtBytes(20 * 1024)).toBe('20 KB')
    expect(fmtBytes(3 * 1024 * 1024)).toBe('3.00 MB')
    expect(fmtBytes(2 * 1024 ** 3)).toBe('2.00 GB')
    expect(tone(100)).toBe('up')
    expect(tone(-1)).toBe('down')
    expect(tone(0)).toBe('flat')
    expect(tone(0.05, 0.1)).toBe('flat')
    expect(tone(null)).toBe('flat')
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
