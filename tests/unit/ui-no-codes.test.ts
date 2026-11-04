import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * AP-23: no decision code (D81, T294, B12, N47, AF-55…) and no working text („spec”) in anything the user reads. The
 * code's comments are the place for them; a string literal, a JSX text, a title or a hint is not. The scan strips the
 * comments of every source file of the screens, the phone and the shared texts, then looks at what is left.
 */
const ROOTS = ['src/renderer', 'src/mobile/app', 'src/shared', 'src/main']
// Ids and key names that look like a code but are not one.
const ALLOWED_FILES = [join('src', 'shared', 'ids.ts')]
const CODE = /\b[TDBNW]\d{1,3}\b|\bF(?!1\b|11\b|12\b)\d{1,3}\b|\bAF-\d+|\(spec[,)]/

function sources(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) sources(p, out)
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

/** The source without its comments (line breaks kept, so the line numbers stay). */
export function withoutComments(text: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ')
  return text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a: string) => a + ' '.repeat(m.length - a.length))
}

describe('AP-23: kody decyzji i teksty robocze nie trafiają do interfejsu', () => {
  it('skaner wyłapuje kod w tekście, a komentarz przepuszcza', () => {
    expect(CODE.test('title="Przychód (D81): praca"')).toBe(true)
    expect(CODE.test('title="Daily Bias (spec, Wywiad)"')).toBe(true)
    expect(CODE.test('hint="Fundusz awaryjny (D12)."')).toBe(true)
    expect(CODE.test('toast("AF-55 nie działa")')).toBe(true)
    expect(CODE.test('title="Skróty klawiszowe (? / F1)"')).toBe(false)
    expect(CODE.test(withoutComments('const a = 1 // (D81) – ordering\n/* T294 */'))).toBe(false)
  })

  it('żaden plik źródłowy nie ma kodu decyzji poza komentarzem', () => {
    const found: string[] = []
    for (const root of ROOTS) {
      for (const file of sources(root)) {
        if (ALLOWED_FILES.includes(file)) continue
        withoutComments(readFileSync(file, 'utf8'))
          .split('\n')
          .forEach((line, i) => {
            if (CODE.test(line)) found.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`)
          })
      }
    }
    expect(found).toEqual([])
  })
})
