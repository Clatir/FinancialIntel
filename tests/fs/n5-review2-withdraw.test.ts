/**
 * N5 (1.15.9), przegląd 2 – uwaga 3 (KR.29, T446): a record of a refused start is taken back only when its file on the
 * disk is exactly what the start wrote – `deleteRecords` with `expected` (the content's mark) reads the file again in
 * the main process at the deletion. A version another computer wrote a moment ago (the watcher not there yet) is never
 * deleted unseen nor kept in the history as an older read saw it.
 */
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contentMark } from '@shared/merge'
import { SCHEMA_VERSION } from '@shared/schema'
import { exists, freshStore, readJson, sampleMonth } from './helpers'

/** Another computer's write of the file, the watcher not there yet: new content, a later file time. */
async function writeBehind(path: string, patch: Record<string, unknown>): Promise<void> {
  await fs.writeFile(path, `${JSON.stringify({ ...(await readJson(path)), ...patch }, null, 2)}\n`)
  const later = new Date(Date.now() + 5000)
  await fs.utimes(path, later, later)
}

describe('przegląd 2 N5 3: wycofanie rekordu startu tylko wersji z dysku, którą start zapisał', () => {
  it('plik taki, jak start go zapisał: usunięty, w historii jako cofnięty', async () => {
    const store = await freshStore()
    const { entry } = await store.saveRecord('months', sampleMonth('2026-11', { salary: 500_000 }))
    const { results } = await store.deleteRecords('months', [entry.record.id], 'undo', { [entry.record.id]: contentMark(entry.record) })
    expect(results).toEqual([{ id: entry.record.id }])
    expect(await exists(join(store.root, entry.relPath))).toBe(false)
    expect((await store.historyList('months', entry.record.id)).map((e) => e.reason)).toEqual(['undo'])
  })

  it('plik zmieniony na innym komputerze (watcher jeszcze go nie przyniósł): nic nie usunięte, „changed”, plik nietknięty', async () => {
    const store = await freshStore()
    const { entry } = await store.saveRecord('months', sampleMonth('2026-11', { salary: 500_000 }))
    const path = join(store.root, entry.relPath)
    await writeBehind(path, { salary: 600_000, updatedBy: 'LAPTOP' })
    const { results } = await store.deleteRecords('months', [entry.record.id], 'undo', { [entry.record.id]: contentMark(entry.record) })
    // Before: deleted from the scan's view – the other computer's 6 000 zł gone, the history with the older 5 000 zł.
    expect(results).toEqual([{ id: entry.record.id, error: expect.stringContaining('zmienił się'), changed: true }])
    expect(await readJson(path)).toMatchObject({ salary: 600_000, updatedBy: 'LAPTOP' })
    expect(await store.historyList('months', entry.record.id)).toEqual([])
  })

  it('plik zapisany przez nowszą wersję albo zniknął z dysku: nie „changed” – odmowa nowszej wersji, a brak pliku to brak pliku', async () => {
    const store = await freshStore()
    const { entry } = await store.saveRecord('months', sampleMonth('2026-11', { salary: 500_000 }))
    const path = join(store.root, entry.relPath)
    await writeBehind(path, { schemaVersion: SCHEMA_VERSION + 1 })
    const newer = await store.deleteRecords('months', [entry.record.id], 'undo', { [entry.record.id]: contentMark(entry.record) })
    expect(newer.results[0]).toMatchObject({ id: entry.record.id, error: expect.stringContaining('nowsza wersja') })
    expect(newer.results[0]!.changed).toBeUndefined()
    expect(await exists(path)).toBe(true)

    const { entry: other } = await store.saveRecord('months', sampleMonth('2026-12', { salary: 500_000 }))
    await fs.rm(join(store.root, other.relPath))
    const gone = await store.deleteRecords('months', [other.record.id], 'undo', { [other.record.id]: contentMark(other.record) })
    expect(gone.results).toEqual([{ id: other.record.id }])
    expect(await store.historyList('months', other.record.id)).toEqual([])
  })

  it('bez `expected` jak dotąd (usunięcie użytkownika nie czyta pliku od nowa)', async () => {
    const store = await freshStore()
    const { entry } = await store.saveRecord('months', sampleMonth('2026-11', { salary: 500_000 }))
    const { results } = await store.deleteRecords('months', [entry.record.id])
    expect(results).toEqual([{ id: entry.record.id }])
  })
})
