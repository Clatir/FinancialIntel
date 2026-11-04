import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { changelogSections, notesOf } from '@shared/releaseNotes'

const CHANGELOG = `# Financial Intel – zmiany

## 1.15.9

- **Konflikty** czytelne.

## 1.15.8

- Ósma.

## 1.15.7

## 1.15.6

- Szósta.
`

describe('„Co nowego” z CHANGELOG offline (AP-28, AF-40)', () => {
  it('sekcje od najnowszej, puste też', () => {
    expect(changelogSections(CHANGELOG).map((s) => s.version)).toEqual(['1.15.9', '1.15.8', '1.15.7', '1.15.6'])
  })

  it('notatki tej wersji; po aktualizacji z 1.15.6 – też pominiętych wersji, bez pustych i bez wersji sprzed', () => {
    expect(notesOf(CHANGELOG, '1.15.9')).toBe('- **Konflikty** czytelne.')
    expect(notesOf(CHANGELOG, '1.15.9', '1.15.6')).toBe('- **Konflikty** czytelne.\n\n### 1.15.8\n\n- Ósma.')
    expect(notesOf(CHANGELOG, '1.15.9', '1.15.9')).toBe('- **Konflikty** czytelne.')
  })

  it('wersja bez sekcji albo z pustą – nic (panel się nie pokazuje)', () => {
    expect(notesOf(CHANGELOG, '1.16.0')).toBe('')
    expect(notesOf(CHANGELOG, '1.15.7')).toBe('')
  })

  it('prawdziwy CHANGELOG ma notatki wersji z package.json', () => {
    const version = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version
    expect(notesOf(readFileSync('CHANGELOG.md', 'utf8'), version).length).toBeGreaterThan(20)
  })
})
