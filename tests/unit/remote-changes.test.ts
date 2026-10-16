// adapted from ICTTJ tests/unit/remote-changes.test.ts @ 84a8339
import { describe, expect, it } from 'vitest'
import { changedPaths, decideRemote, decideRemoteRemoval, isoMs, newerChoice, newerFields, relatedPaths, sameContent } from '@shared/remoteChanges'
import { diffRecords } from '@shared/merge'
import { compareSides, newerSide, newestResolutions } from '@shared/conflicts'
import type { ConflictEntry, ConflictSide } from '@shared/api'

const base = { id: 'T', updatedAt: '1', note: 'a', amount: 500 }

describe('zmiany z drugiego komputera – decyzja', () => {
  it('bez lokalnych zmian: tryb „scalaj” przyjmuje, tryb „pytaj” pyta; ta sama treść – przyjmij bez pytania', () => {
    const theirs = { ...base, updatedAt: '2', amount: 700 }
    expect(decideRemote({ mode: 'merge', dirty: false, base, mine: base, theirs })).toEqual({ action: 'take' })
    expect(decideRemote({ mode: 'ask', dirty: false, base, mine: base, theirs })).toEqual({ action: 'ask', conflicts: [] })
    expect(decideRemote({ mode: 'ask', dirty: false, base, mine: base, theirs: { ...base, updatedAt: '3' } })).toEqual({ action: 'take' })
    // A record this computer does not have yet.
    expect(decideRemote({ mode: 'ask', dirty: false, base: undefined, mine: null, theirs })).toEqual({ action: 'take' })
  })

  it('z lokalnymi zmianami: różne pola – scal; to samo pole – pytaj; identyczna zmiana – nic do zrobienia', () => {
    const mine = { ...base, note: 'moja' }
    expect(decideRemote({ mode: 'merge', dirty: true, base, mine, theirs: { ...base, updatedAt: '2', amount: 700 } })).toEqual({
      action: 'merge',
      merged: { id: 'T', updatedAt: '2', note: 'moja', amount: 700 }
    })
    const conflict = decideRemote({ mode: 'merge', dirty: true, base, mine, theirs: { ...base, note: 'z B' } })
    expect(conflict.action).toBe('ask')
    expect(conflict.action === 'ask' && conflict.conflicts.map((c) => c.path)).toEqual([['note']])
    expect(decideRemote({ mode: 'ask', dirty: true, base, mine, theirs: { ...base, amount: 700 } }).action).toBe('ask')
    expect(decideRemote({ mode: 'merge', dirty: true, base, mine, theirs: { ...mine, updatedAt: '9' } })).toEqual({ action: 'ignore' })
  })

  it('usunięcie na drugim komputerze', () => {
    expect(decideRemoteRemoval({ mode: 'merge', dirty: false })).toBe('remove')
    expect(decideRemoteRemoval({ mode: 'merge', dirty: true })).toBe('ask')
    expect(decideRemoteRemoval({ mode: 'ask', dirty: false })).toBe('ask')
  })
})

describe('„Zaakceptuj nowsze”', () => {
  const T = (h: number) => `2026-10-15T${String(h).padStart(2, '0')}:00:00.000Z`
  it('zmiana bez lokalnych edycji: nowsza wersja w całości; równe czasy – przychodząca', () => {
    expect(newerChoice({ type: 'update', hadLocalEdits: false, mineAt: T(8), theirsAt: T(9), receivedAt: T(10) })).toEqual({ choice: 'theirs', newer: 'theirs' })
    expect(newerChoice({ type: 'update', hadLocalEdits: false, mineAt: T(9), theirsAt: T(8), receivedAt: T(10) })).toEqual({ choice: 'mine', newer: 'mine' })
    expect(newerChoice({ type: 'update', hadLocalEdits: false, mineAt: T(9), theirsAt: T(9), receivedAt: T(10) })).toEqual({ choice: 'theirs', newer: 'theirs' })
  })

  it('z lokalnymi edycjami: scalenie, pola zmienione po obu stronach z nowszej strony; brak czasu – bez decyzji', () => {
    expect(newerChoice({ type: 'update', hadLocalEdits: true, mineAt: T(11), theirsAt: T(9), receivedAt: T(10) })).toEqual({ choice: 'merge', newer: 'mine' })
    expect(newerChoice({ type: 'update', hadLocalEdits: true, mineAt: T(8), theirsAt: T(9), receivedAt: T(10) })).toEqual({ choice: 'merge', newer: 'theirs' })
    expect(newerChoice({ type: 'update', hadLocalEdits: true, mineAt: null, theirsAt: T(9), receivedAt: T(10) })).toBeNull()
  })

  it('usunięcie: bez edycji – usuń; edycja po przyjściu usunięcia – zachowaj; edycja przed nim – zostaje do decyzji', () => {
    expect(newerChoice({ type: 'removal', hadLocalEdits: false, mineAt: T(8), theirsAt: null, receivedAt: T(10) })).toEqual({ choice: 'theirs', newer: 'theirs' })
    expect(newerChoice({ type: 'removal', hadLocalEdits: true, mineAt: T(11), theirsAt: null, receivedAt: T(10) })).toEqual({ choice: 'mine', newer: 'mine' })
    expect(newerChoice({ type: 'removal', hadLocalEdits: true, mineAt: T(9), theirsAt: null, receivedAt: T(10) })).toBeNull()
  })

  const side = (relPath: string, updatedAt: string | null, record: unknown = {}, mtimeMs = 0): ConflictSide => ({ relPath, record, error: null, updatedAt, mtimeMs })
  const conflict = (copy: ConflictSide, canonical: ConflictSide): ConflictEntry => ({ id: copy.relPath, kind: 'transactions', type: 'copy', source: 'OneDrive', canonical, copy })

  it('kopie z chmury: nowsza strona; remis bez wskazania; nieczytelna kopia nigdy nie wygrywa; czas pliku tylko, gdy obie strony nie mają czasu zapisu', () => {
    const orig = side('transactions/2026/a.json', T(9), {}, Date.parse(T(1)))
    expect(newerSide(conflict(side('transactions/2026/a-PC.json', T(10)), orig))).toBe('copy')
    expect(newerSide(conflict(side('transactions/2026/a-PC.json', T(8)), orig))).toBe('canonical')
    expect(newerSide(conflict(side('transactions/2026/a-PC.json', T(9)), orig))).toBeNull()
    expect(newerSide(conflict(side('transactions/2026/a-PC.json', T(12), null), orig))).toBe('canonical')
    // A copy without a stamp, written by the sync tool just now: not weighed against the original's stamp.
    expect(newerSide(conflict(side('transactions/2026/a-PC.json', null, {}, Date.parse(T(12))), orig))).toBeNull()
    expect(newerSide(conflict(side('transactions/2026/a-PC.json', null, {}, Date.parse(T(12))), side('transactions/2026/a.json', null, {}, Date.parse(T(11)))))).toBe('copy')
  })

  it('kilka kopii jednego pliku: najnowsza wygrywa raz (jej konflikt pierwszy), reszta zaznaczonych odrzucona; niezaznaczone bez zmian', () => {
    const orig = side('transactions/2026/a.json', T(9))
    const c1 = conflict(side('transactions/2026/a-PC1.json', T(10)), orig)
    const c2 = conflict(side('transactions/2026/a-PC2.json', T(11)), orig)
    const c3 = conflict(side('transactions/2026/a (1).json', T(12)), orig)
    const other = conflict(side('transactions/2026/b-PC.json', T(5)), side('transactions/2026/b.json', T(6)))
    expect(newestResolutions([c1, c2, c3, other], [c1.id, c2.id, other.id]).resolutions).toEqual([
      { id: c2.id, keep: 'copy', group: 'transactions/2026/a.json' },
      { id: c1.id, keep: 'canonical', group: 'transactions/2026/a.json' },
      { id: other.id, keep: 'canonical', group: 'transactions/2026/b.json' }
    ])
    expect(newestResolutions([c1], ['nieistniejący'])).toEqual({ resolutions: [], skipped: [] })
  })

  it('nieczytelna strona (brak oryginału, uszkodzona albo nowsza kopia): nigdy nie rozstrzygana zbiorczo', () => {
    const broken = conflict(side('transactions/2026/c-PC.json', null, null), side('transactions/2026/c.json', T(9)))
    const orphan = conflict(side('transactions/2026/d-PC.json', T(9)), side('transactions/2026/d.json', null, null))
    expect(newestResolutions([broken, orphan], [broken.id, orphan.id])).toEqual({ resolutions: [], skipped: [broken.id, orphan.id] })
  })

  it('pola zmienione po obu stronach – każde z nowszej strony (czas mojej zmiany tego pola); brak czasu – bez decyzji', () => {
    const conflicts = [
      { path: ['note'], base: 'a', mine: 'moja', theirs: 'z B' },
      { path: ['splits', '#X', 'amount'], base: 1, mine: 2, theirs: 3 }
    ]
    const mineAt = (p: string[]) => (p[0] === 'note' ? T(8) : T(11))
    expect(newerFields(conflicts, T(10), mineAt)).toEqual({ note: 'theirs', ['splits\u0001#X\u0001amount']: 'mine' })
    expect(newerFields(conflicts, null, mineAt)).toBeNull()
    // A field not changed here (unknown base, a value merged in earlier): the other computer's change.
    expect(newerFields(conflicts, T(10), () => null)).toEqual({ note: 'theirs', ['splits\u0001#X\u0001amount']: 'theirs' })
    expect(newerFields([], null, mineAt)).toEqual({})
  })

  it('zmienione pola edycji – jak diffRecords, bez porównywania nietkniętych gałęzi', () => {
    const settings = { sync: { remoteChanges: 'merge' }, layoutPresets: [1, 2] }
    const before = { id: 'F', updatedAt: '1', settings, categories: { a: [{ id: 'x', name: 'A' }] } }
    const after = { ...before, updatedAt: '2', settings: { ...settings, sync: { remoteChanges: 'ask' } }, categories: { a: [{ id: 'x', name: 'B' }] } }
    expect(changedPaths(before, after)).toEqual(diffRecords(before, after))
    expect(changedPaths(before, after).map((c) => c.path)).toEqual([
      ['settings', 'sync', 'remoteChanges'],
      ['categories', 'a', '#x', 'name']
    ])
    expect(changedPaths(before, before)).toEqual([])
  })
})

describe('pomocnicze', () => {
  it('ta sama treść mimo innych pól technicznych; ścieżki na jednej linii; czas ISO', () => {
    expect(sameContent(base, { ...base, updatedAt: '9', updatedBy: 'PC-B' })).toBe(true)
    expect(sameContent(base, { ...base, note: 'b' })).toBe(false)
    expect(relatedPaths(['settings'], ['settings', 'sync'])).toBe(true)
    expect(relatedPaths(['settings', 'sync'], ['settings'])).toBe(true)
    expect(relatedPaths([], ['note'])).toBe(true)
    expect(relatedPaths(['settings', 'sync'], ['settings', 'shipName'])).toBe(false)
    expect(isoMs('2026-10-15T08:00:00.000Z')).toBe(Date.parse('2026-10-15T08:00:00.000Z'))
    expect(isoMs('nie data')).toBeNull()
    expect(isoMs(null)).toBeNull()
    expect(isoMs(undefined)).toBeNull()
  })

  it('porównanie stron konfliktu: czytelna wygrywa z nieczytelną, dwie nieczytelne – remis', () => {
    const s = (record: unknown, updatedAt: string | null, mtimeMs = 0): ConflictSide => ({ relPath: 'x', record, error: null, updatedAt, mtimeMs })
    expect(compareSides(s({}, null), s(null, null))).toBe(1)
    expect(compareSides(s(null, null), s({}, null))).toBe(-1)
    expect(compareSides(s(null, null), s(null, null))).toBe(0)
    expect(compareSides(s({}, null, 5), s({}, null, 5))).toBe(0)
    expect(compareSides(s({}, 'zły czas', 9), s({}, null, 1))).toBe(1)
  })
})
