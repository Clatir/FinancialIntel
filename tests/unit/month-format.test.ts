/**
 * Review of R2 (point 14): a month as the tables write it – mm.rrrr – comes from one helper (`plMonth`, shared/format.ts):
 * the screens (the payoff plan, the forecast, the course, the cargo's price history) and the window of changes never put
 * it together on their own.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { plMonth } from '@shared/format'
import { dateValueText } from '@shared/merge'

const ROOTS = ['src/renderer', 'src/mobile/app', 'src/shared']
/** The source without its comments (as `ui-no-codes.test.ts` reads it): a comment may show the pattern. */
const withoutComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a: string) => a + ' '.repeat(m.length - a.length))
const HELPER = join('src', 'shared', 'format.ts')
// `${m.slice(5, 7)}.${m.slice(0, 4)}` – not the end of a day's dd.mm.rrrr; `${v.slice(5)}.${v.slice(0, 4)}` too.
const MONTH = /(?<!slice\(8, 10\)\}\.)\$\{[\w.()]+\.slice\(5, 7\)\}\.\$\{[\w.()]+\.slice\(0, 4\)\}|\$\{[\w.()]+\.slice\(5\)\}\.\$\{[\w.()]+\.slice\(0, 4\)\}/

function sources(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) sources(p, out)
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

describe('przegląd R2 (14): miesiąc mm.rrrr z jednej funkcji', () => {
  it('plMonth: 2027-03 → 03.2027; okno zmian pisze miesiąc tą samą funkcją', () => {
    expect(plMonth('2027-03')).toBe('03.2027')
    expect(plMonth('2026-12')).toBe('12.2026')
    expect(dateValueText('2027-03')).toBe('03.2027')
  })

  it('żaden plik ekranów ani wspólny nie składa miesiąca mm.rrrr sam', () => {
    expect(MONTH.test('const mm = (m: string) => `${m.slice(5, 7)}.${m.slice(0, 4)}`')).toBe(true)
    expect(MONTH.test('`${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`')).toBe(false)
    const found: string[] = []
    for (const root of ROOTS)
      for (const file of sources(root)) {
        if (file === HELPER) continue
        withoutComments(readFileSync(file, 'utf8'))
          .split('\n')
          .forEach((line, i) => {
            if (MONTH.test(line)) found.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`)
          })
      }
    expect(found).toEqual([])
  })
})
