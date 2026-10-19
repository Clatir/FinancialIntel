import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataStore, NewerFileError } from '../../src/main/datastore/store'
import { SCHEMA_VERSION, type SettingsFile } from '@shared/schema'
import { CREATED, exists, freshStore, readJson, readZip, sampleGame, sampleTransaction, tempDir } from './helpers'
import { createDefaultSettings } from '@shared/defaults'

afterEach(() => vi.restoreAllMocks())

const named = (fi: SettingsFile, shipName: string): SettingsFile => ({ ...fi, settings: { ...fi.settings, shipName } })

/** The file of a record rewritten as a newer version of the app would: the same content, a higher schemaVersion. */
async function newerOnDisk(store: DataStore, relPath: string, patch: Record<string, unknown> = {}): Promise<void> {
  const p = join(store.root, relPath)
  await fs.writeFile(p, JSON.stringify({ ...(await readJson(p)), ...patch, schemaVersion: SCHEMA_VERSION + 1 }, null, 2))
}

describe('folder danych: wpisy nowszej wersji, ustawienia, konflikty, eksport (1.6.5)', () => {
  it('wpis zapisany przez nowszą wersję: zapis i usunięcie – NewerFileError, w paczce `newer`; plik nietknięty (B67)', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    const { entry } = await store.saveRecord('transactions', t)
    await newerOnDisk(store, entry.relPath)
    const before = await fs.readFile(join(store.root, entry.relPath), 'utf8')
    const s2 = new DataStore(store.root, { machineName: 'X' })
    await s2.open()
    await expect(s2.saveRecord('transactions', { ...t, note: 'tutaj' })).rejects.toBeInstanceOf(NewerFileError)
    await expect(s2.deleteRecord('transactions', t.id)).rejects.toBeInstanceOf(NewerFileError)
    // Many at once (an import, a bulk change): the newer one says so – the window keeps it without retrying for ever.
    const other = sampleTransaction({ date: '2026-03-18' })
    const { results } = await s2.saveRecords('transactions', [{ ...t, note: 'tutaj' }, other])
    expect(results.find((r) => r.id === t.id)).toMatchObject({ newer: true, error: expect.stringMatching(/nowsza wersja/) })
    expect(results.find((r) => r.id === other.id)?.entry).toBeTruthy()
    expect(await fs.readFile(join(store.root, entry.relPath), 'utf8')).toBe(before)
    // The error's name reaches the window through IPC („NewerFileError: …”) – the window's test of it.
    expect(String(new NewerFileError())).toMatch(/^NewerFileError: /)
  })

  it('plik miesiąca gry w formacie, którego ta wersja nie odczyta (problem „nowszy format”): nic nie powstaje na jego miejscu (B67)', async () => {
    const store = await freshStore()
    const rel = 'game/2026-03.json'
    await fs.mkdir(join(store.root, 'game'), { recursive: true })
    await fs.writeFile(join(store.root, rel), JSON.stringify({ ...sampleGame('2026-03'), schemaVersion: SCHEMA_VERSION + 1, days: 'nowy-format' }, null, 2))
    const s2 = new DataStore(store.root, { machineName: 'X' })
    const snap = await s2.open()
    expect(snap.problems.find((p) => p.relPath === rel)?.kind).toBe('too-new')
    await expect(s2.saveRecord('game', sampleGame('2026-03'))).rejects.toBeInstanceOf(NewerFileError)
    // The app's own records (the frozen days) pass over it quietly.
    expect(await s2.saveGenerated('game', [sampleGame('2026-03')])).toBeNull()
    expect((await readJson(join(store.root, rel))).days).toBe('nowy-format')
  })

  it('zapis ustawień mówi, co zmienił w folderze obok: fi.json z drugiego komputera zostaje kopią widoczną od razu (B107)', async () => {
    const store = await freshStore()
    const snap = await store.snapshot()
    // The other computer's fi.json came in before the watcher said so.
    const p = join(store.root, 'fi.json')
    const disk = await readJson(p)
    await fs.writeFile(p, JSON.stringify({ ...disk, settings: { ...(disk.settings as object), shipName: 'Z laptopa' }, updatedBy: 'LAPTOP', updatedAt: '2026-10-19T08:00:00.000Z' }, null, 2))
    const { fi, change } = await store.writeSettings(named(snap.fi, 'Tutaj'))
    expect(fi.settings.shipName).toBe('Tutaj')
    expect(change?.conflicts.some((c) => c.kind === 'fi' && /-zewnetrzna-/.test(c.copy.relPath))).toBe(true)
    // The settings themselves come with the answer (`fi`), the change set carries only what changed beside them.
    expect(change?.fi).toBeNull()
  })

  it('uszkodzony fi.json: najnowsza czytelna wersja z historii staje się fi.json, uszkodzony odsunięty (B109)', async () => {
    // Saves far enough apart for the history to keep each version of this computer (once in 10 minutes).
    let clock = Date.parse('2026-10-19T08:00:00.000Z')
    const root = join(tempDir(), 'dane')
    await DataStore.initialize(root, createDefaultSettings(CREATED))
    const store = new DataStore(root, { machineName: 'TU', now: () => new Date(clock).toISOString() })
    const snap = await store.open()
    for (const name of ['Pierwsza', 'Druga', 'Trzecia']) {
      await store.saveSettings(named(snap.fi, name))
      clock += 11 * 60_000
    }
    await fs.writeFile(join(store.root, 'fi.json'), '{ "shipName": "Trz')
    await expect(new DataStore(store.root, { machineName: 'X' }).open()).rejects.toThrow(/fi\.json/)
    const kept = await DataStore.repairSettings(store.root, 'X', '2026-10-19T10:00:00.000Z')
    expect(kept).toBeTruthy()
    const names = await fs.readdir(store.root)
    expect(names.some((n) => /^fi-uszkodzona-.*\.json$/.test(n))).toBe(true)
    const repaired = new DataStore(store.root, { machineName: 'X' })
    const after = await repaired.open()
    // The newest version kept by the history (the one before the last save), stamped by this computer.
    expect(after.fi.settings.shipName).toBe('Druga')
    expect(after.fi.updatedBy).toBe('X')
    // The broken file waits in Synchronizacja.
    expect(after.conflicts.some((c) => c.kind === 'fi' && /fi-uszkodzona-/.test(c.copy.relPath))).toBe(true)
    // No history: nothing to take.
    const empty = await freshStore()
    await fs.writeFile(join(empty.root, 'fi.json'), '{')
    expect(await DataStore.repairSettings(empty.root, 'X')).toBeNull()
  })

  it('usunięcie wpisu, który ma drugą kopię z innego komputera (ten sam id) – odmowa do rozstrzygnięcia w Synchronizacji (B111)', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    const { entry } = await store.saveRecord('transactions', t)
    // The same record under another date (two computers before the sync): a duplicate id.
    const twin = join(store.root, 'transactions', '2026', `2026-03-20_${t.id}.json`)
    await fs.writeFile(twin, JSON.stringify({ ...(await readJson(join(store.root, entry.relPath))), date: '2026-03-20', updatedBy: 'LAPTOP' }, null, 2))
    await store.refresh()
    await expect(store.deleteRecord('transactions', t.id)).rejects.toThrow(/drugą kopię z innego komputera/)
    expect(await exists(join(store.root, entry.relPath))).toBe(true)
    expect(await exists(twin)).toBe(true)
  })

  it('zachowana kopia konfliktu dostaje czas i komputer rozstrzygnięcia (N91)', async () => {
    const store = await freshStore(undefined, 'TU')
    const t = sampleTransaction({ note: 'oryginał' })
    const { entry } = await store.saveRecord('transactions', t)
    const copyRel = entry.relPath.replace(/\.json$/, '-LAPTOP.json')
    await fs.writeFile(join(store.root, copyRel), JSON.stringify({ ...(await readJson(join(store.root, entry.relPath))), note: 'z laptopa', updatedBy: 'LAPTOP', updatedAt: '2026-01-02T00:00:00.000Z' }, null, 2))
    const snap = await store.refresh()
    const conflict = (snap?.conflicts ?? (await store.snapshot()).conflicts).find((c) => c.copy.relPath === copyRel)!
    await store.resolveConflict(conflict.id, 'copy')
    const kept = await readJson(join(store.root, entry.relPath))
    expect(kept).toMatchObject({ note: 'z laptopa', updatedBy: 'TU' })
    expect(String(kept.updatedAt) > '2026-01-02T00:00:00.000Z').toBe(true)
  })

  it('eksport całego folderu niesie historię zmian; kopia dzienna – bez niej (N96)', async () => {
    const store = await freshStore()
    const t = sampleTransaction({ note: 'pierwsza' })
    await store.saveRecord('transactions', t)
    await store.saveRecord('transactions', { ...t, note: 'druga' })
    await store.deleteRecord('transactions', t.id)
    const out = join(store.root, '..', 'eksport.zip')
    await store.zipData(out, { history: true })
    const names = [...(await readZip(out)).keys()]
    expect(names).toContain('fi.json')
    expect(names.some((n) => n.startsWith(`.history/transactions/${t.id}/`))).toBe(true)
    const daily = join(store.root, '..', 'dzienna.zip')
    await store.zipData(daily)
    expect([...(await readZip(daily)).keys()].some((n) => n.startsWith('.history/'))).toBe(false)
  })

  it('folder, do którego można wejść, ale nie można go wylistować (udział sieciowy): „niedostępny”, nie „inne pliki” (B120)', async () => {
    const store = await freshStore()
    const dir = join(store.root, '..', 'udzial')
    await fs.mkdir(dir)
    const real = fs.readdir
    vi.spyOn(fs, 'readdir').mockImplementation(((path: Parameters<typeof fs.readdir>[0], ...rest: unknown[]) =>
      String(path) === dir ? Promise.reject(Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })) : (real as (...a: unknown[]) => Promise<unknown>).call(fs, path, ...rest)) as typeof fs.readdir)
    expect(await DataStore.inspect(dir)).toBe('unavailable')
  })
})
