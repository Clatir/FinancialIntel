import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * AP-23: no decision code (D81, T294, B12, N47, AF-55, AP-4…) and no working text („spec”) in anything the user reads. The
 * code's comments are the place for them; a string literal, a JSX text, a title or a hint is not. The scan strips the
 * comments of every source file of the screens, the phone and the shared texts, then looks at what is left.
 */
const ROOTS = ['src/renderer', 'src/mobile/app', 'src/shared', 'src/main']
// Ids and key names that look like a code but are not one.
const ALLOWED_FILES = [join('src', 'shared', 'ids.ts')]
const CODE = /\b[TDBNW]\d{1,3}\b|\bF(?!1\b|11\b|12\b)\d{1,3}\b|\bA[FP]-\d+|\(spec[,)]/

/**
 * UX-67: a version number („1.2.3”, „przed 1.3.0”) says nothing to the user – the text says what changed instead. SVG
 * paths (their numbers look alike) are not texts.
 */
const VERSION = /(?<![\w.\-/])v?\d+\.\d+\.\d+(?![\w.])/
const isSvgLine = (line: string) => /<path\b|\bd="/.test(line)
// Texts of screens other than Ustawienia and Synchronizacja that still name a version – each to be rewritten with its
// screen's own step (Operacje, Meldunki, Import); the list only shrinks.
const VERSION_PENDING = [
  join('src', 'renderer', 'features', 'import', 'ImportPage.tsx'),
  join('src', 'renderer', 'features', 'import', 'RulesAudit.tsx'),
  join('src', 'renderer', 'features', 'inbox', 'InboxPage.tsx'),
  join('src', 'renderer', 'features', 'inbox', 'TransferPairs.tsx'),
  join('src', 'renderer', 'features', 'operations', 'OperationEditor.tsx'),
  join('src', 'shared', 'calc', 'inbox.ts'),
  join('src', 'shared', 'merge.ts'),
  // An example of the format in an error about a release tag (not a version of this app).
  join('src', 'shared', 'update.ts')
]

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
    // The audit's items too: a title of N2 said „(AP-4)” (the merge of N3 into N4).
    expect(CODE.test('title="Zaliczka na przyszłość – wpłaty nie spłacają długu (AP-4)"')).toBe(true)
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

  it('skaner numerów wersji wyłapuje „1.2.3” w tekście, a ścieżkę SVG i zwykłe liczby przepuszcza', () => {
    expect(VERSION.test('title="Połączenia z 1.2.2 zrobione na nazwach"')).toBe(true)
    expect(VERSION.test('Zakupy oznaczone przed 1.3.0 („do zwrotu”)')).toBe(true)
    expect(VERSION.test('Wydanie v1.15.5 nie ma')).toBe(true)
    expect(VERSION.test('Stopa 12,5 % i 3.5 punktu')).toBe(false)
    expect(isSvgLine('<path d="M2.5 3.2c2-.8 3.8-.6 5.5.6" />')).toBe(true)
    expect(VERSION.test(withoutComments('const v = 1 // przed 1.3.0'))).toBe(false)
  })

  it('żaden tekst dla użytkownika nie zawiera numeru wersji (poza listą ekranów, które dopiero je opiszą)', () => {
    const found: string[] = []
    for (const root of ROOTS) {
      for (const file of sources(root)) {
        if (VERSION_PENDING.includes(file) || ALLOWED_FILES.includes(file)) continue
        withoutComments(readFileSync(file, 'utf8'))
          .split('\n')
          .forEach((line, i) => {
            if (!isSvgLine(line) && VERSION.test(line)) found.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`)
          })
      }
    }
    expect(found).toEqual([])
  })
})
