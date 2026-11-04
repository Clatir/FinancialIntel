// AP-1 (1.15.5, grupa N1): the data folder gone while open – no write makes it anew in its old place („folder-widmo”),
// a missing folder is never „removed on another computer”, a folder that takes no writes is read-only from the open.
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ChangeSet } from '@shared/api'
import { FOLDER_UNAVAILABLE_MESSAGE } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { mkdirWithin, writeFileAtomic } from '../../src/main/datastore/atomic'
import { runBackups } from '../../src/main/datastore/backup'
import { writePresence } from '../../src/main/datastore/presence'
import { DataStore, FOLDER_NOT_WRITABLE_MESSAGE, FolderUnavailableError, ReadOnlyError, RemovedOutsideError } from '../../src/main/datastore/store'
import { CREATED, exists, readJson, sampleTransaction, tempDir } from './helpers'

/** A store of a new folder that tells what `onStatus` says (the change sets a write sends at once). */
async function watchedStore(): Promise<{ store: DataStore; told: ChangeSet[] }> {
  const root = join(tempDir(), 'dane')
  await DataStore.initialize(root, createDefaultSettings(CREATED))
  const told: ChangeSet[] = []
  const store = new DataStore(root, { machineName: 'TEST-PC', onStatus: (c) => told.push(c) })
  await store.open()
  return { store, told }
}

describe('folder danych znika w trakcie pracy (AP-1, AF-2)', () => {
  it('zapis przy przemianowanym folderze: błąd „niedostępny”, folder nie powstaje na nowo, okno wie od razu; po powrocie zapis przechodzi', async () => {
    const { store, told } = await watchedStore()
    const away = `${store.root}-odlaczony`
    await fs.rename(store.root, away)
    const t = sampleTransaction({ note: 'bez folderu' })
    const err = await store.saveRecord('transactions', t).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(FolderUnavailableError)
    expect((err as Error).message).toBe(FOLDER_UNAVAILABLE_MESSAGE)
    // Never the old place made anew – the records written there would be in no budget.
    expect(await exists(store.root)).toBe(false)
    expect(store.status()).toMatchObject({ available: false, readOnly: true, readOnlyReason: FOLDER_UNAVAILABLE_MESSAGE })
    expect(told.map((c) => c.status.available)).toEqual([false])
    // Every next write waits, without a new change set each time.
    await expect(store.saveRecords('transactions', [t])).rejects.toBeInstanceOf(FolderUnavailableError)
    await expect(store.saveSettings(store.fi)).rejects.toBeInstanceOf(FolderUnavailableError)
    expect(told).toHaveLength(1)
    expect(await exists(store.root)).toBe(false)

    await fs.rename(away, store.root)
    expect(await store.stale()).toBe(true)
    const back = await store.refresh()
    expect(back?.status.available).toBe(true)
    expect(await store.stale()).toBe(false)
    const { entry } = await store.saveRecord('transactions', t)
    expect((await readJson(join(store.root, entry.relPath))).note).toBe('bez folderu')
  })

  it('edycja wpisu, gdy folder zniknął: nie „usunięty na innym komputerze” (AF-42) – wpis zostaje, po powrocie zapis przechodzi', async () => {
    const { store } = await watchedStore()
    const { entry } = await store.saveRecord('transactions', sampleTransaction({ note: 'A' }))
    const away = `${store.root}-odlaczony`
    await fs.rename(store.root, away)
    const err = await store.saveRecord('transactions', { ...entry.record, note: 'B' }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(FolderUnavailableError)
    expect(err).not.toBeInstanceOf(RemovedOutsideError)
    expect((await store.snapshot()).records.transactions.map((e) => e.record.id)).toEqual([entry.record.id])
    await fs.rename(away, store.root)
    await store.refresh()
    const saved = await store.saveRecord('transactions', { ...entry.record, note: 'B' })
    expect(saved.change?.removals ?? []).toEqual([])
    expect((await readJson(join(store.root, entry.relPath))).note).toBe('B')
  })

  it('pusty folder założony w starym miejscu (bez fi.json) to nadal brak folderu – nic do niego nie trafia', async () => {
    const { store } = await watchedStore()
    await fs.rename(store.root, `${store.root}-odlaczony`)
    await fs.mkdir(join(store.root, 'transactions'), { recursive: true })
    await expect(store.saveRecord('transactions', sampleTransaction())).rejects.toBeInstanceOf(FolderUnavailableError)
    expect(await fs.readdir(join(store.root, 'transactions'))).toEqual([])
    expect(await store.rootPresent()).toBe(false)
  })

  it('paczka zapisów i usunięcia przy zniknięciu: każdy wpis czeka z powodem, okno dostaje stan folderu', async () => {
    const { store } = await watchedStore()
    const a = (await store.saveRecord('transactions', sampleTransaction())).entry.record
    await fs.rename(store.root, `${store.root}-odlaczony`)
    await expect(store.deleteRecords('transactions', [a.id])).rejects.toBeInstanceOf(FolderUnavailableError)
    expect((await store.snapshot()).records.transactions).toHaveLength(1)
    expect(await exists(store.root)).toBe(false)
  })

  it('obecność, wersja w historii i kopia dzienna nie zakładają folderu danych na nowo', async () => {
    const { store } = await watchedStore()
    const root = store.root
    await fs.rename(root, `${root}-odlaczony`)
    await expect(writePresence(root, 'TEST-PC', '1.15.5')).rejects.toThrow()
    expect(await store.history.snapshot('transactions', sampleTransaction(), 'edit')).toBeNull()
    await expect(runBackups({ zipData: (out) => store.zipData(out) }, store.backupsDir)).rejects.toBeInstanceOf(FolderUnavailableError)
    expect(await exists(root)).toBe(false)
  })

  it('mkdirWithin: podfoldery tylko pod istniejącym korzeniem, sam korzeń nigdy', async () => {
    const root = join(tempDir(), 'dane')
    await expect(mkdirWithin(root, join(root, 'transactions', '2026'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(writeFileAtomic(join(root, 'fi.json'), '{}\n', root)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await exists(root)).toBe(false)
    await fs.mkdir(root)
    await mkdirWithin(root, join(root, 'transactions', '2026'))
    await mkdirWithin(root, join(root, 'transactions', '2026'))
    expect(await exists(join(root, 'transactions', '2026'))).toBe(true)
    await expect(mkdirWithin(root, join(root, '..', 'obok'))).rejects.toThrow(/poza folderem/)
  })
})

describe('folder tylko do odczytu rozpoznany przy otwarciu (AP-1, AF-14)', () => {
  // A process of root writes anywhere: no read-only folder to make there.
  it.skipIf(process.getuid?.() === 0)('fi.json bez prawa zapisu (atrybut „tylko do odczytu”): tryb tylko do odczytu z powodem, nic nie zapisane; zdjęty – zapis wraca', async () => {
    const root = join(tempDir(), 'dane')
    await DataStore.initialize(root, createDefaultSettings(CREATED))
    const fi = join(root, 'fi.json')
    // On Windows chmod sets the attribute „tylko do odczytu”, elsewhere it takes the right to write.
    await fs.chmod(fi, 0o444)
    try {
      const store = new DataStore(root, { machineName: 'TEST-PC' })
      const snap = await store.open()
      expect(snap.status).toMatchObject({ readOnly: true, available: true, readOnlyReason: FOLDER_NOT_WRITABLE_MESSAGE })
      // No half-start (KR.29): not one record written beside the fi.json that cannot be replaced.
      await expect(store.saveRecord('transactions', sampleTransaction())).rejects.toBeInstanceOf(ReadOnlyError)
      expect(await fs.readdir(join(root, 'transactions'))).toEqual([])
      // No probe file left behind.
      expect((await fs.readdir(root)).filter((n) => n.includes('.tmp-'))).toEqual([])
      expect(await store.stale()).toBe(false)
      await fs.chmod(fi, 0o644)
      expect(await store.stale()).toBe(true)
      expect((await store.refresh())?.status.readOnly).toBe(false)
      await store.saveSettings({ ...store.fi, settings: { ...store.fi.settings, shipName: 'Zapisany' } })
      expect(((await readJson(fi)).settings as { shipName: string }).shipName).toBe('Zapisany')
    } finally {
      await fs.chmod(fi, 0o644).catch(() => undefined)
    }
  })
})

describe('folder-widmo starszej wersji (AP-1)', () => {
  it('liczba plików wpisów w folderze FI bez fi.json', async () => {
    const dir = tempDir()
    await fs.mkdir(join(dir, 'transactions', '2026'), { recursive: true })
    await fs.writeFile(join(dir, 'transactions', '2026', '2026-11-03_01M6HGJE7WG87GV93ZDW48FPK6.json'), '{}')
    await fs.mkdir(join(dir, '.presence'))
    await fs.writeFile(join(dir, '.presence', 'PC.json'), '{}')
    expect(await DataStore.inspect(dir)).toBe('partial')
    expect(await DataStore.recordFiles(dir)).toBe(1)
  })
})
