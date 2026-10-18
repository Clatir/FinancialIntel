import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConflictCopyError, DataStore, RemovedOutsideError } from '../../src/main/datastore/store'
import { writeFileAtomic } from '../../src/main/datastore/atomic'
import { createDefaultSettings } from '@shared/defaults'
import { recordRelPath } from '@shared/paths'
import { serializeRecord } from '@shared/records'
import { CREATED, exists, freshStore, sampleMonth, sampleTransaction, tempDir } from './helpers'
import { CONFLICT_COPY_MESSAGE } from '@shared/api'

const realReadFile = fs.readFile
const realOpen = fs.open
/**
 * Reads of files whose path ends with `suffix` fail like a file OneDrive has not brought yet – a file known before is
 * read by `readFile`, a new one through `open` (W24).
 */
const failReads = (suffix: string) => {
  const fail = () => Promise.reject(Object.assign(new Error('EIO: i/o error, read'), { code: 'EIO' }))
  const read = vi.spyOn(fs, 'readFile').mockImplementation(((path: Parameters<typeof fs.readFile>[0], ...rest: unknown[]) =>
    String(path).endsWith(suffix) ? fail() : (realReadFile as (...a: unknown[]) => Promise<unknown>).call(fs, path, ...rest)) as typeof fs.readFile)
  const open = vi.spyOn(fs, 'open').mockImplementation(((path: Parameters<typeof fs.open>[0], ...rest: unknown[]) =>
    String(path).endsWith(suffix) ? fail() : (realOpen as (...a: unknown[]) => Promise<unknown>).call(fs, path, ...rest)) as typeof fs.open)
  return { mockRestore: () => (read.mockRestore(), open.mockRestore()) }
}

afterEach(() => vi.restoreAllMocks())

describe('folder danych: odporność (1.4.2)', () => {
  it('nieudane usunięcie (plik zajęty): plik i wpis zostają, w historii nie ma wersji „usunięty” (B9)', async () => {
    const root = join(tempDir(), 'dane')
    await DataStore.initialize(root, createDefaultSettings(CREATED))
    let busy = true
    const store = new DataStore(root, {
      machineName: 'TEST-PC',
      trash: async (p) => {
        if (busy) throw Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' })
        await fs.rm(p)
      }
    })
    await store.open()
    const t = sampleTransaction()
    await store.saveRecord('transactions', t)
    await expect(store.deleteRecord('transactions', t.id)).rejects.toThrow(/Nie udało się usunąć/)
    expect(await exists(join(root, ...recordRelPath('transactions', t).split('/')))).toBe(true)
    expect((await store.snapshot()).records.transactions.map((e) => e.record.id)).toEqual([t.id])
    expect((await store.historyList('transactions', t.id)).filter((e) => e.reason === 'delete')).toEqual([])
    busy = false
    await store.deleteRecord('transactions', t.id)
    expect((await store.historyList('transactions', t.id)).filter((e) => e.reason === 'delete')).toHaveLength(1)
  })

  it('błąd odczytu nie jest zapamiętany jak treść pliku: następne odświeżenie czyta go znowu, a zapis go nie odsuwa (B42)', async () => {
    const store = await freshStore()
    const other = sampleTransaction({ date: '2026-03-17' })
    const rel = recordRelPath('transactions', other)
    await writeFileAtomic(join(store.root, ...rel.split('/')), serializeRecord('transactions', other))
    const spy = failReads(`${other.id}.json`)
    await store.refresh([rel])
    let snap = await store.snapshot()
    expect(snap.records.transactions).toEqual([])
    expect(snap.problems.map((p) => p.relPath)).toEqual([rel])
    // A write on it while it is still unreadable: refused, the file never moved aside as „uszkodzona”.
    await expect(store.saveRecord('transactions', { ...other, note: 'tu' })).rejects.toThrow(/niedostępny/)
    expect((await fs.readdir(join(store.root, 'transactions', '2026'))).filter((n) => n.includes('uszkodzona'))).toEqual([])
    // OneDrive brought it: read again, the same stamps notwithstanding.
    spy.mockRestore()
    await store.refresh([rel])
    snap = await store.snapshot()
    expect(snap.records.transactions.map((e) => e.record.id)).toEqual([other.id])
    expect(snap.problems).toEqual([])
  })

  it('zapis wpisu, którego plik właśnie usunięto na innym komputerze, nie przywraca go po cichu; przeniesiony zmianą daty – trafia w nowe miejsce (B49)', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    await store.saveRecord('transactions', t)
    const abs = join(store.root, ...recordRelPath('transactions', t).split('/'))
    await fs.rm(abs)
    const removed = await store.saveRecord('transactions', { ...t, note: 'moja zmiana' }).catch((e: unknown) => e)
    expect(removed).toBeInstanceOf(RemovedOutsideError)
    // The window learns it with the error, as a change from outside (its question about the edits).
    expect((removed as RemovedOutsideError).change).toMatchObject({ origin: 'external', removals: [{ collection: 'transactions', id: t.id }] })
    expect(await exists(abs)).toBe(false)
    // Kept in the dialog („Zachowaj”): the next write brings it back.
    await store.saveRecord('transactions', { ...t, note: 'moja zmiana' })
    expect(await exists(abs)).toBe(true)

    // Moved by a changed date on the other computer: my version goes to its path, theirs is kept as a copy.
    const moved = sampleTransaction({ date: '2026-03-18' })
    await store.saveRecord('transactions', moved)
    const from = join(store.root, ...recordRelPath('transactions', moved).split('/'))
    const theirs = { ...moved, date: '2026-03-25', note: 'z laptopa', updatedAt: '2026-03-20T10:00:00.000Z' }
    await fs.rm(from)
    await writeFileAtomic(join(store.root, ...recordRelPath('transactions', theirs).split('/')), serializeRecord('transactions', theirs))
    await store.saveRecord('transactions', { ...moved, note: 'tu' })
    const names = (await fs.readdir(join(store.root, 'transactions', '2026'))).filter((n) => n.includes(moved.id)).sort()
    expect(names).toHaveLength(2)
    expect(names[1]).toBe(`2026-03-18_${moved.id}.json`)
    expect(names[0]).toMatch(new RegExp(`^2026-03-18_${moved.id}-zewnetrzna-.+\\.json$`))
  })

  it('rekord przeczytany wcześniej zostaje w budżecie, gdy jego nowej wersji nie da się chwilowo odczytać (B42)', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    await store.saveRecord('transactions', t)
    const rel = recordRelPath('transactions', t)
    // Another computer's version comes (new stamps), its read fails for a moment.
    await writeFileAtomic(join(store.root, ...rel.split('/')), serializeRecord('transactions', { ...t, note: 'z laptopa', updatedAt: '2026-03-20T10:00:00.000Z' }))
    const spy = failReads(`${t.id}.json`)
    await store.refresh([rel])
    expect((await store.snapshot()).records.transactions.map((e) => e.record.note)).toEqual([''])
    spy.mockRestore()
    await store.refresh([rel])
    expect((await store.snapshot()).records.transactions.map((e) => e.record.note)).toEqual(['z laptopa'])
  })

  it('rozstrzygnięcie konfliktu: odrzucona wersja w historii wpisu, oryginału bez rekordu nie da się „zachować”, nowszy format nienadpisany (B44, B45)', async () => {
    const store = await freshStore()
    const { entry } = await store.saveRecord('transactions', sampleTransaction({ note: 'A' }))
    const write = (rel: string, data: unknown) => fs.writeFile(join(store.root, ...rel.split('/')), typeof data === 'string' ? data : JSON.stringify(data, null, 2))
    // Keep the copy: the original's version kept in the history (B44).
    const copyRel = entry.relPath.replace('.json', '-LAPTOP.json')
    await write(copyRel, { ...entry.record, note: 'B' })
    await store.refresh()
    await store.resolveConflict(copyRel, 'copy')
    const discarded = (await store.historyList('transactions', entry.record.id)).filter((e) => e.reason === 'discarded')
    expect(discarded).toHaveLength(1)
    expect(((await store.historyRead('transactions', entry.record.id, discarded[0]!.file)) as { note: string }).note).toBe('A')
    // Keep the original: the copy's version kept too.
    await write(copyRel, { ...entry.record, note: 'C' })
    await store.refresh()
    await store.resolveConflict(copyRel, 'canonical')
    expect((await store.historyList('transactions', entry.record.id)).filter((e) => e.reason === 'discarded')).toHaveLength(2)

    // The original gone, only the copy left: keeping the original would throw the only version away (B45).
    const lone = sampleTransaction({ date: '2026-03-20', note: 'jedyna' })
    const loneRel = recordRelPath('transactions', lone).replace('.json', '-LAPTOP.json')
    await write(loneRel, lone)
    const change = await store.refresh()
    const conflict = change!.conflicts.find((c) => c.copy.relPath === loneRel)!
    await expect(store.resolveConflict(conflict.id, 'canonical')).rejects.toThrow(/Oryginału nie ma/)
    expect(await exists(join(store.root, ...loneRel.split('/')))).toBe(true)

    // An original in a newer format is never written over by an older copy (B45).
    const newer = sampleTransaction({ date: '2026-03-22', note: 'nowsza' })
    const newerRel = recordRelPath('transactions', newer)
    await write(newerRel, { ...newer, schemaVersion: 99, extra: 1 })
    await write(newerRel.replace('.json', '-PC.json'), { ...newer, note: 'starsza kopia' })
    await store.refresh()
    await expect(store.resolveConflict(newerRel.replace('.json', '-PC.json'), 'copy')).rejects.toThrow(/nowsza wersja/)
    expect(((await fs.readFile(join(store.root, ...newerRel.split('/')), 'utf8')).includes('"extra": 1'))).toBe(true)
  })

  it('plan miesiąca zrobiony na dwóch komputerach (inne id): moja wersja czeka jako kopia w Synchronizacji, bez ponawiania (B46)', async () => {
    const store = await freshStore()
    const theirs = sampleMonth('2026-11', { salary: 400000 })
    await fs.writeFile(join(store.root, 'months', '2026-11.json'), serializeRecord('months', theirs))
    await store.refresh()
    const mine = sampleMonth('2026-11', { salary: 300000 })
    const error = await store.saveRecord('months', mine).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ConflictCopyError)
    expect((error as Error).message.startsWith(CONFLICT_COPY_MESSAGE)).toBe(true)
    const snap = await store.snapshot()
    expect(snap.records.months.map((e) => [e.record.id, e.record.salary])).toEqual([[theirs.id, 400000]])
    // The copy reaches the window with the error.
    const conflict = (error as ConflictCopyError).change!.conflicts.find((c) => c.kind === 'months')!
    expect(conflict.copy.relPath).toBe('months/2026-11-TEST-PC.json')
    // Picked in Synchronizacja: mine becomes the month's plan, theirs kept in its history – a version of the month's
    // plan, never a „deleted” record of its own (restored, it would stand on the month again).
    await store.resolveConflict(conflict.id, 'copy')
    expect((await store.snapshot()).records.months.map((e) => [e.record.id, e.record.salary])).toEqual([[mine.id, 300000]])
    const kept = await store.historyList('months', mine.id)
    expect(kept.map((e) => e.reason)).toEqual(['discarded'])
    expect(await store.historyRead('months', mine.id, kept[0]!.file)).toMatchObject({ id: mine.id, salary: 400000 })
    expect(await store.historyList('months', theirs.id)).toEqual([])
    expect(await store.historyDeleted('months')).toEqual([])
    // Restored: the month's plan as theirs was, no conflict.
    await store.historyRestore('months', mine.id, kept[0]!.file)
    expect((await store.snapshot()).records.months.map((e) => [e.record.id, e.record.salary])).toEqual([[mine.id, 400000]])
    expect((await store.snapshot()).conflicts).toEqual([])
  })
})

describe('folder danych: zapis i usuwanie paczkami (1.4.3, W1, W8)', () => {
  it('wiele rekordów jednym wywołaniem: jeden zestaw zmian, błędny rekord nie zatrzymuje reszty', async () => {
    const store = await freshStore()
    const a = sampleTransaction({ note: 'a' })
    const b = sampleTransaction({ date: '2026-03-17', note: 'b' })
    const bad = { ...sampleTransaction(), amount: 1.5 }
    const { results, changes } = await store.saveRecords('transactions', [a, bad, b])
    expect(results.map((r) => [r.id, !!r.entry, !!r.error])).toEqual([
      [a.id, true, false],
      [bad.id, false, true],
      [b.id, true, false]
    ])
    expect(changes).toHaveLength(1)
    expect(changes[0]!.upserts.map((u) => u.entry.record.id).sort()).toEqual([a.id, b.id].sort())
    // Deleted with one call: a record that is not there is no error.
    const missing = sampleTransaction().id
    const del = await store.deleteRecords('transactions', [a.id, missing])
    expect(del.results).toEqual([{ id: a.id }, { id: missing }])
    expect(del.change!.removals).toEqual([{ collection: 'transactions', id: a.id }])
    expect((await store.snapshot()).records.transactions.map((e) => e.record.id)).toEqual([b.id])
  })

  it('rekord usunięty właśnie na innym komputerze: jego usunięcie idzie do okna osobno, „z zewnątrz” (B49)', async () => {
    const store = await freshStore()
    const a = sampleTransaction({ note: 'a' })
    await store.saveRecord('transactions', a)
    await fs.rm(join(store.root, ...recordRelPath('transactions', a).split('/')))
    const c = sampleTransaction({ date: '2026-03-18', note: 'c' })
    const { results, changes } = await store.saveRecords('transactions', [{ ...a, note: 'moja' }, c])
    expect(results[0]!.error).toMatch(/usunięty na innym komputerze/)
    expect(changes.map((ch) => [ch.origin, ch.removals.map((r) => r.id), ch.upserts.map((u) => u.entry.record.id)])).toEqual([
      ['external', [a.id], []],
      ['local', [], [c.id]]
    ])
  })
})
