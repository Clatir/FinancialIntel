// adapted from ICTTJ tests/unit/paths.test.ts @ 84a8339
import { describe, expect, it } from 'vitest'
import { classifyCanonical, COLLECTIONS, detectConflictName, isIgnoredPath, kindOfDir, LAYOUTS, recordRelPath, sanitizeRelPath, SETTINGS_FILE } from '@shared/paths'

const ID = '01K6H3Z0W8Q4M2N5P7R9S1T3V5'

describe('nazwy plików', () => {
  it('ścieżki rekordów wg układu kolekcji: data, miesiąc, id', () => {
    expect(recordRelPath('transactions', { id: ID, date: '2026-10-01' })).toBe(`transactions/2026/2026-10-01_${ID}.json`)
    expect(recordRelPath('dockings', { id: ID, date: '2026-01-31' })).toBe(`dockings/2026/2026-01-31_${ID}.json`)
    expect(recordRelPath('balances', { id: ID, date: '2025-12-31' })).toBe(`balances/2025/2025-12-31_${ID}.json`)
    expect(recordRelPath('months', { id: ID, month: '2026-10' })).toBe('months/2026-10.json')
    expect(recordRelPath('game', { id: ID, month: '2026-10' })).toBe('game/2026-10.json')
    expect(recordRelPath('containers', { id: ID, name: 'Ubezpieczenie' })).toBe(`containers/${ID}.json`)
    expect(recordRelPath('goals', { id: ID })).toBe(`goals/${ID}.json`)
    expect(recordRelPath('loans', { id: ID })).toBe(`loans/${ID}.json`)
  })

  it('każda kolekcja ma układ, a ścieżka z recordRelPath jest kanoniczna', () => {
    expect(SETTINGS_FILE).toBe('fi.json')
    for (const c of COLLECTIONS) {
      expect(LAYOUTS[c]).toMatch(/^(dated|id|month)$/)
      const rel = recordRelPath(c, { id: ID, date: '2026-10-01', month: '2026-10' })
      expect(classifyCanonical(rel)).toBe(c)
      expect(kindOfDir(rel)).toBe(c)
      expect(detectConflictName(rel)).toBeNull()
    }
  })

  it('rozpoznawanie plików kanonicznych', () => {
    expect(classifyCanonical('fi.json')).toBe('fi')
    expect(classifyCanonical(`transactions/2026/2026-10-01_${ID}.json`)).toBe('transactions')
    expect(classifyCanonical('months/2026-10.json')).toBe('months')
    expect(classifyCanonical(`goals/${ID}.json`)).toBe('goals')
    expect(classifyCanonical(`dockings/2026/2026-10-01_${ID}.json`)).toBe('dockings')
    // Wrong place or name: not a record.
    expect(classifyCanonical('transactions/2026/notes.json')).toBeNull()
    expect(classifyCanonical(`transactions/2026-10-01_${ID}.json`)).toBeNull()
    expect(classifyCanonical('months/2026/2026-10.json')).toBeNull()
    expect(classifyCanonical('goals/cel.json')).toBeNull()
    expect(classifyCanonical(`goals/2026/${ID}.json`)).toBeNull()
    expect(classifyCanonical(`containers/${ID.toLowerCase()}.json`)).toBeNull()
    expect(classifyCanonical('journal.json')).toBeNull()
    expect(classifyCanonical(`trades/2026/2026-10-01_EURUSD_${ID}.json`)).toBeNull()
  })

  it('rodzaj pliku wg folderu', () => {
    expect(kindOfDir('fi.json')).toBe('fi')
    expect(kindOfDir(`loans/${ID}.json`)).toBe('loans')
    expect(kindOfDir('game\\2026-10.json')).toBe('game')
    expect(kindOfDir('trades/2026/a.json')).toBeNull()
    expect(kindOfDir('readme.txt')).toBeNull()
    expect(isIgnoredPath(`goals/.${ID}.json.tmp-abc`)).toBe(true)
  })

  it('pomijane ścieżki', () => {
    expect(isIgnoredPath('backups/daily/x.zip')).toBe(true)
    expect(isIgnoredPath('backups')).toBe(true)
    expect(isIgnoredPath('.presence/PC.json')).toBe(true)
    expect(isIgnoredPath('.history/transactions/x/1.json')).toBe(true)
    expect(isIgnoredPath('transactions/2026/.x.json.tmp-abc')).toBe(true)
    expect(isIgnoredPath('transactions\\2026\\a.json')).toBe(false)
    expect(isIgnoredPath('transactions/2026/a.json')).toBe(false)
  })

  it('ochrona przed path traversal', () => {
    expect(sanitizeRelPath('../etc/passwd')).toBeNull()
    expect(sanitizeRelPath('a/../../b')).toBeNull()
    expect(sanitizeRelPath('/abs')).toBeNull()
    expect(sanitizeRelPath('C:/Windows')).toBeNull()
    expect(sanitizeRelPath('')).toBeNull()
    expect(sanitizeRelPath('a//b')).toBeNull()
    expect(sanitizeRelPath('./goals/a.json')).toBe('goals/a.json')
    expect(sanitizeRelPath('transactions\\2026\\a.json')).toBe('transactions/2026/a.json')
  })
})

describe('pliki konfliktów synchronizacji', () => {
  const canonical = `transactions/2026/2026-10-01_${ID}.json`
  const cases: Array<[string, string]> = [
    [`transactions/2026/2026-10-01_${ID}-DESKTOP-K3LM9.json`, 'OneDrive'],
    [`transactions/2026/2026-10-01_${ID}-LAPTOP-2.json`, 'OneDrive'],
    [`transactions/2026/2026-10-01_${ID} (conflicted copy 2026-10-02).json`, 'Dropbox'],
    [`transactions/2026/2026-10-01_${ID} (kopia powodująca konflikt użytkownika Jan 2026-10-02).json`, 'Dropbox'],
    [`transactions/2026/2026-10-01_${ID} (1).json`, 'Google Drive / kopia'],
    [`transactions/2026/2026-10-01_${ID}.sync-conflict-20261002-101010-ABCDEFG.json`, 'Syncthing'],
    [`transactions/2026/2026-10-01_${ID}-zewnetrzna-2026-10-02T10-00-00.json`, 'zmiana z zewnątrz podczas edycji'],
    [`transactions/2026/2026-10-01_${ID}-uszkodzona-2026-10-02T10-00-00.json`, 'uszkodzony plik odsunięty przy zapisie']
  ]
  for (const [file, source] of cases) {
    it(`${source}: ${file.split('/').pop()}`, () => {
      expect(detectConflictName(file)).toEqual({ kind: 'transactions', canonicalPath: canonical, source })
    })
  }

  it('miesiąc, rekord po id, fi.json', () => {
    expect(detectConflictName('months/2026-10-PC.json')).toEqual({ kind: 'months', canonicalPath: 'months/2026-10.json', source: 'OneDrive' })
    expect(detectConflictName('game/2026-10 (1).json')?.canonicalPath).toBe('game/2026-10.json')
    expect(detectConflictName(`containers/${ID}-PC.json`)?.canonicalPath).toBe(`containers/${ID}.json`)
    expect(detectConflictName(`goals/${ID}-LAPTOP.json`)).toEqual({ kind: 'goals', canonicalPath: `goals/${ID}.json`, source: 'OneDrive' })
    expect(detectConflictName(`loans/${ID} (1).json`)?.canonicalPath).toBe(`loans/${ID}.json`)
    expect(detectConflictName(`balances/2026/2026-10-01_${ID}-PC.json`)?.canonicalPath).toBe(`balances/2026/2026-10-01_${ID}.json`)
    expect(detectConflictName('fi-DESKTOP-1.json')).toEqual({ kind: 'fi', canonicalPath: 'fi.json', source: 'OneDrive' })
    expect(detectConflictName('fi (1).json')?.canonicalPath).toBe('fi.json')
    expect(detectConflictName('fi.sync-conflict-20261002-101010-ABCDEFG.json')?.source).toBe('Syncthing')
  })

  it('inny plik w głównym folderze zaczynający się od „fi” nie jest kopią fi.json', () => {
    for (const name of ['firma.json', 'file.json', 'fixme.json', 'final (1).json']) expect(detectConflictName(name)).toBeNull()
  })

  it('pliki kanoniczne i obce nie są konfliktami', () => {
    expect(detectConflictName(canonical)).toBeNull()
    expect(detectConflictName('fi.json')).toBeNull()
    expect(detectConflictName('transactions/2026/readme.json')).toBeNull()
    expect(detectConflictName(`transactions/2026/2026-10-01_${ID}-PC.txt`)).toBeNull()
    expect(detectConflictName('notatki.json')).toBeNull()
    expect(detectConflictName(`trades/2026/2026-10-01_EURUSD_${ID}-PC.json`)).toBeNull()
    // A copy whose stem would point at a wrong place (dated file outside its year folder).
    expect(detectConflictName(`transactions/2026-10-01_${ID}-PC.json`)).toBeNull()
  })
})
