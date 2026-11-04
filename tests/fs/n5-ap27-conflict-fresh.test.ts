import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ConflictChangedError, type DataStore } from '../../src/main/datastore/store'
import { serializeRecord } from '@shared/records'
import type { Transaction } from '@shared/schema'
import { exists, freshStore, sampleTransaction } from './helpers'

/**
 * A conflict decided while OneDrive brings a newer copy (AP-27, T431, AF-76): the files are read again before the
 * decision – the watcher may not have seen the new copy yet – and a side changed since the window showed it refuses the
 * decision; nothing is written over, nothing of the new copy goes to the bin alone.
 */
async function conflictOf(store: DataStore) {
  const { entry } = await store.saveRecord('transactions', sampleTransaction({ note: 'z domu', amount: -1200 }))
  const copyRel = entry.relPath.replace('.json', '-LAPTOP.json')
  const copyAbs = join(store.root, ...copyRel.split('/'))
  const writeCopy = async (amount: number, note: string, at: number) => {
    await fs.writeFile(copyAbs, serializeRecord('transactions', { ...entry.record, amount, note, updatedAt: new Date(at).toISOString(), updatedBy: 'LAPTOP' }))
    // A time of its own (two writes in one tick have one time on some disks): OneDrive's copy is another version.
    await fs.utimes(copyAbs, new Date(at), new Date(at))
  }
  await writeCopy(-1500, 'z laptopa', Date.parse('2026-03-21T10:00:00.000Z'))
  const found = await store.refresh()
  const shown = found!.conflicts.find((c) => c.id === copyRel)!
  return { entry, copyRel, copyAbs, writeCopy, shown, seen: { canonical: shown.canonical.mtimeMs, copy: shown.copy.mtimeMs } }
}

const onDisk = async (abs: string) => JSON.parse(await fs.readFile(abs, 'utf8')) as Transaction

describe('konflikt rozstrzygany, gdy kopia zmienia się w trakcie (AP-27, T431)', () => {
  it('„Scal…”: kopia zmieniona na dysku przed odświeżeniem – odmowa, oryginał i nowa kopia bez zmian, okno dostaje nową wersję', async () => {
    const store = await freshStore()
    const { entry, copyRel, copyAbs, writeCopy, shown, seen } = await conflictOf(store)
    // OneDrive brings a newer copy; the watcher has not told the store yet (no refresh).
    await writeCopy(-1600, 'zmiana w trakcie', Date.parse('2026-03-21T10:05:00.000Z'))
    const merged = { ...(shown.canonical.record as Transaction), amount: -1500 }
    const refused = await store.mergeConflict(copyRel, merged, seen).then(
      () => null,
      (e: unknown) => e
    )
    expect(refused).toBeInstanceOf(ConflictChangedError)
    // The window gets the copy as it is now – „Scal od nowa” works on it.
    const now = (refused as ConflictChangedError).change!.conflicts.find((c) => c.id === copyRel)!
    expect(now.copy.mtimeMs).not.toBe(seen.copy)
    expect((now.copy.record as Transaction).amount).toBe(-1600)
    // Nothing written, nothing moved: the original as it was, the new copy where it was, no merge in the history.
    expect((await onDisk(join(store.root, ...entry.relPath.split('/')))).amount).toBe(-1200)
    expect(await exists(copyAbs)).toBe(true)
    expect((await onDisk(copyAbs)).note).toBe('zmiana w trakcie')
    expect((await store.historyList('transactions', entry.record.id)).filter((e) => e.reason === 'merge')).toEqual([])
    // Merged again on the versions as they are now: written.
    await store.mergeConflict(copyRel, { ...merged, amount: -1600 }, { canonical: now.canonical.mtimeMs, copy: now.copy.mtimeMs })
    expect((await store.snapshot()).records.transactions.map((e) => e.record.amount)).toEqual([-1600])
    expect(await exists(copyAbs)).toBe(false)
  })

  it('„Zachowaj tę wersję”: kopia zmieniona w trakcie – odmowa; bez wersji okna (zbiorczo) odrzucona kopia trafia do historii taka, jaka jest teraz', async () => {
    const store = await freshStore()
    const { entry, copyRel, copyAbs, writeCopy, seen } = await conflictOf(store)
    await writeCopy(-1700, 'najnowsza z laptopa', Date.parse('2026-03-21T10:07:00.000Z'))
    await expect(store.resolveConflict(copyRel, 'copy', seen)).rejects.toBeInstanceOf(ConflictChangedError)
    expect((await onDisk(join(store.root, ...entry.relPath.split('/')))).amount).toBe(-1200)
    expect(await exists(copyAbs)).toBe(true)
    // The bulk „Zaakceptuj nowsze” (no versions of the window): the original kept, the copy let go – into the history
    // as it is on the disk now, never as the last read saw it (it would be only in the bin).
    await writeCopy(-1800, 'jeszcze nowsza', Date.parse('2026-03-21T10:09:00.000Z'))
    const { results } = await store.resolveConflicts([{ id: copyRel, keep: 'canonical' }])
    expect(results).toEqual([{ id: copyRel }])
    const discarded = (await store.historyList('transactions', entry.record.id)).filter((e) => e.reason === 'discarded')
    expect(discarded).toHaveLength(1)
    expect(((await store.historyRead('transactions', entry.record.id, discarded[0]!.file)) as Transaction).note).toBe('jeszcze nowsza')
  })
})
