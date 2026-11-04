// Przegląd xhigh N5 (1.15.9) – decyzja konfliktu idzie z wersją, którą okno pokazało (uwagi 3 i 7, T431).
import { describe, expect, it } from 'vitest'
import type { ConflictEntry, ConflictSide } from '@shared/api'
import { newestOnShown, seenFor } from '@shared/conflicts'

const ID = '01M6GDM914YEJ2RP70WV1T1NF8'
const ORIGINAL = `transactions/2026/2026-10-14_${ID}.json`
const tx = (amount: number, updatedAt: string, updatedBy = 'DOM') => ({ id: ID, date: '2026-10-14', amount, note: '', updatedAt, updatedBy })
const side = (relPath: string, record: ReturnType<typeof tx>, mtimeMs: number): ConflictSide => ({ relPath, record, error: null, updatedAt: record.updatedAt, mtimeMs })
const conflict = (copyName: string, original: ConflictSide, copy: ReturnType<typeof tx>, mtimeMs: number): ConflictEntry => {
  const relPath = ORIGINAL.replace('.json', copyName)
  return { id: relPath, kind: 'transactions', type: 'copy', source: 'OneDrive', canonical: original, copy: side(relPath, copy, mtimeMs) }
}

describe('„Zachowaj tę wersję” – wersja pokazana na karcie (uwaga 7)', () => {
  const original = side(ORIGINAL, tx(-1200, '2026-10-14T10:00:00.000Z'), 1000)
  const shown = conflict('-LAPTOP.json', original, tx(-1500, '2026-10-14T09:00:00.000Z', 'LAPTOP'), 2000)

  it('kopia zmieniona w trakcie zapisu przed decyzją (watcher przyniósł nowszą) – odmowa w oknie, nie czasy nowej wersji', () => {
    const now = { ...shown, copy: side(shown.copy.relPath, tx(-1900, '2026-10-14T11:00:00.000Z', 'LAPTOP'), 3000) }
    // Before: the times of the version after the flush went to main – it matched them and binned the version unseen.
    expect(seenFor(shown, now)).toBeNull()
  })

  it('zapis tego komputera tylko odświeżył znaczniki oryginału – decyzja idzie z czasami po zapisie', () => {
    const now = { ...shown, canonical: side(ORIGINAL, { ...tx(-1200, '2026-10-14T12:00:00.000Z'), updatedBy: 'TEN-PC' }, 4000) }
    expect(seenFor(shown, now)).toEqual({ canonical: 4000, copy: 2000 })
    expect(seenFor(shown, shown)).toEqual({ canonical: 1000, copy: 2000 })
    // Gone from the window meanwhile: the times shown – the main process says it is gone.
    expect(seenFor(shown, undefined)).toEqual({ canonical: 1000, copy: 2000 })
  })
})

describe('„Zaakceptuj nowsze” – wybór na pokazanych wersjach (uwaga 3)', () => {
  const original = side(ORIGINAL, tx(-1200, '2026-10-14T10:00:00.000Z'), 1000)
  const older = conflict('-LAPTOP.json', original, tx(-1500, '2026-10-14T09:00:00.000Z', 'LAPTOP'), 2000)
  const other = (() => {
    const id = '01M6GDM914YEJ2RP70WV1T1NF9'
    const rel = `transactions/2026/2026-10-15_${id}.json`
    const o = { ...side(rel, { ...tx(-300, '2026-10-15T10:00:00.000Z'), id }, 1100) }
    return { id: rel.replace('.json', '-LAPTOP.json'), kind: 'transactions', type: 'copy', source: 'OneDrive', canonical: o, copy: side(rel.replace('.json', '-LAPTOP.json'), { ...tx(-350, '2026-10-15T12:00:00.000Z', 'LAPTOP'), id }, 2100) } as ConflictEntry
  })()

  it('kopia, która pokazana była starsza, stała się nowsza w trakcie zapisu – jej grupa zostaje dla użytkownika, reszta idzie z czasami po zapisie', () => {
    const changedCopy = { ...older, copy: side(older.copy.relPath, tx(-1900, '2026-10-14T11:00:00.000Z', 'LAPTOP'), 3000) }
    const stamped = { ...other, canonical: { ...other.canonical, mtimeMs: 5000, record: { ...(other.canonical.record as object), updatedBy: 'TEN-PC' } } }
    const plan = newestOnShown([older, other], [changedCopy, stamped], [older.id, other.id])
    // Before: the plan made on the shown versions („keep the original”) went with the new copy's times – binned unseen.
    expect(plan.changed).toEqual([older.id])
    expect(plan.resolutions).toEqual([{ id: other.id, keep: 'copy', group: other.canonical.relPath, seen: { canonical: 5000, copy: 2100 } }])
  })

  it('kilka kopii jednego pliku: zmiana jednej zostawia całą grupę; konflikt zniknięty w trakcie – też', () => {
    const second = conflict(' (1).json', original, tx(-1300, '2026-10-14T08:00:00.000Z', 'LAPTOP'), 2500)
    const moved = { ...second, copy: side(second.copy.relPath, tx(-1350, '2026-10-14T08:30:00.000Z', 'LAPTOP'), 2600) }
    expect(newestOnShown([older, second], [older, moved], [older.id, second.id]).changed.sort()).toEqual([older.id, second.id].sort())
    expect(newestOnShown([older, second], [second], [older.id, second.id]).changed.sort()).toEqual([older.id, second.id].sort())
    expect(newestOnShown([older, second], [older, second], [older.id, second.id]).resolutions.map((r) => r.keep)).toEqual(['canonical', 'canonical'])
  })
})
