// The second review of AP-1 (1.15.5, grupa N1): the return of a folder whose refresh failed, the write probe in a folder
// read-only for real (no 8 tries every few seconds), the probe's check that new files can be made.
import { promises as fsp, renameSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSettings } from '@shared/defaults'
import { MBANK_ACCOUNT_ID } from '@shared/schema'
import { writePresence } from '../../src/main/datastore/presence'
import { DataStore, FOLDER_NOT_WRITABLE_MESSAGE } from '../../src/main/datastore/store'
import { CREATED, exists, tempDir } from './helpers'

/** An error as Node's fs gives it: its code and the call that failed (`syscall` – the write probe tells making a file from replacing one). */
const failure = (code: string, path: unknown, syscall = 'open') => Object.assign(new Error(`${code}: ${syscall} '${String(path)}'`), { code, syscall })

async function folder(): Promise<string> {
  const root = join(tempDir(), 'dane')
  await DataStore.initialize(root, createDefaultSettings(CREATED))
  return root
}

/** The presence the main process writes (`writeOwnPresence`): the probe's check that new files can be made. */
const withPresence = (root: string) => ({ machineName: 'TEST-PC', presence: () => writePresence(root, 'TEST-PC', '0.0.0') })

type Flags = string | number | undefined
const flagOf = (opts: unknown): Flags => (typeof opts === 'object' && opts && 'flag' in opts ? (opts as { flag?: Flags }).flag : undefined)

/**
 * Rights that let the files of `root` be changed, but no new one made in it (an ACL without „Tworzenie plików”): every
 * file made or directory created below it refused (EPERM); an existing file opened in place ('r+') or read goes.
 */
function noCreate(root: string): void {
  const below = (p: unknown) => typeof p === 'string' && resolve(p).startsWith(resolve(root) + sep)
  const real = { open: fsp.open.bind(fsp), writeFile: fsp.writeFile.bind(fsp), mkdir: fsp.mkdir.bind(fsp) }
  vi.spyOn(fsp, 'open').mockImplementation(((p: string, flags?: Flags, mode?: number) =>
    below(p) && typeof flags === 'string' && /[wa]/.test(flags) ? Promise.reject(failure('EPERM', p)) : real.open(p, flags as never, mode)) as never)
  vi.spyOn(fsp, 'writeFile').mockImplementation(((p: string, data: never, opts?: never) =>
    below(p) && flagOf(opts) !== 'r+' ? Promise.reject(failure('EPERM', p)) : real.writeFile(p, data, opts)) as never)
  vi.spyOn(fsp, 'mkdir').mockImplementation(((p: string, opts?: never) => (below(p) ? Promise.reject(failure('EPERM', p, 'mkdir')) : real.mkdir(p, opts))) as never)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('powrót folderu, którego odświeżenie padło (przegląd 2 AP-1, T334)', () => {
  it('odświeżenie znalazło fi.json, ale folderu nie przeczytało: dalej niedostępny – sprawdzanie w spoczynku próbuje znowu, powrót liczy dopiero odświeżenie, które go przeczytało', async () => {
    const root = await folder()
    const store = new DataStore(root, { machineName: 'TEST-PC' })
    await store.open()
    const away = `${root}-odlaczony`
    renameSync(root, away)
    expect((await store.refresh())?.status.available).toBe(false)

    renameSync(away, root)
    // OneDrive still bringing the files back: the folder listed, its reading failed.
    const proto = DataStore.prototype as unknown as { rescanAll(): Promise<void> }
    vi.spyOn(proto, 'rescanAll').mockRejectedValueOnce(failure('EBUSY', root))
    await expect(store.refresh()).rejects.toThrow('EBUSY')
    // Not back: the window was told nothing, so no return is counted (the main process's watcher waits for it) and the
    // idle check sees a difference – it tries again in a few seconds.
    expect(store.status().available).toBe(false)
    expect(store.regained).toBe(0)
    expect(await store.stale()).toBe(true)

    const change = await store.refresh()
    expect(change?.status).toMatchObject({ available: true, readOnly: false })
    expect(store.regained).toBe(1)
    expect(await store.stale()).toBe(false)
  })
})

describe('próba zapisu w folderze naprawdę tylko do odczytu (przegląd 2 AP-1, T335)', () => {
  it('fi.json bez prawa zapisu: przy otwarciu kilka krótkich prób, w spoczynku i przy odświeżeniu w kolejce – jedna', async () => {
    const root = await folder()
    const fi = resolve(root, 'fi.json')
    const real = fsp.open.bind(fsp)
    let tries = 0
    vi.spyOn(fsp, 'open').mockImplementation(((p: string, flags?: Flags, mode?: number) => {
      if (resolve(p) === fi && flags === 'r+') {
        tries++
        return Promise.reject(failure('EPERM', p))
      }
      return real(p, flags as never, mode)
    }) as never)
    const store = new DataStore(root, withPresence(root))
    const snap = await store.open()
    expect(snap.status).toMatchObject({ readOnly: true, readOnlyReason: FOLDER_NOT_WRITABLE_MESSAGE })
    // A lock for a moment is waited out at the open – but not for 1.4 s of eight tries.
    expect(tries).toBeGreaterThan(1)
    expect(tries).toBeLessThanOrEqual(4)

    // Every few seconds while so: one try, outside and inside the queue of the store.
    tries = 0
    expect(await store.stale()).toBe(false)
    expect(tries).toBe(1)
    tries = 0
    await store.refresh([])
    expect(tries).toBe(1)
    // Nothing of this computer in the folder while it takes no writes.
    expect(await exists(join(root, '.presence'))).toBe(false)
  })
})

describe('próba zapisu sprawdza zakładanie plików – zapisem obecności (przegląd 2 AP-1, T316)', () => {
  it('wolno zmienić pliki, nie wolno zakładać nowych: tylko do odczytu z powodem (nie błąd każdego zapisu); gdy znów wolno – sprawdzanie w spoczynku to widzi', async () => {
    const root = await folder()
    await fsp.mkdir(join(root, '.presence'))
    noCreate(root)
    const store = new DataStore(root, withPresence(root))
    const snap = await store.open()
    expect(snap.status).toMatchObject({ readOnly: true, available: true, readOnlyReason: FOLDER_NOT_WRITABLE_MESSAGE })

    vi.restoreAllMocks()
    expect(await store.stale()).toBe(true)
    expect((await store.refresh())?.status).toMatchObject({ readOnly: false, readOnlyReason: null })
    await store.saveSettings({ ...store.fi, settings: { ...store.fi.settings, shipName: 'Znów zapisuje' } })
  })

  it('bez folderu .presence (nowy folder): katalog obecności też się nie założy – tylko do odczytu', async () => {
    const root = await folder()
    noCreate(root)
    const snap = await new DataStore(root, withPresence(root)).open()
    expect(snap.status.readOnlyReason).toBe(FOLDER_NOT_WRITABLE_MESSAGE)
  })

  it('folder starszej wersji w takim folderze: otwarty tylko do odczytu, bez migracji, której nie da się dokończyć', async () => {
    const root = join(tempDir(), 'stary')
    await fsp.mkdir(join(root, 'transactions', '2026'), { recursive: true })
    const legacyFi = JSON.stringify({ settings: { shipName: 'Stary okręt' } }, null, 2)
    await fsp.writeFile(join(root, 'fi.json'), legacyFi)
    const id = '01K6H3Z0W8Q4M2N5P7R9S1T3V5'
    await fsp.writeFile(join(root, 'transactions', '2026', `2026-03-16_${id}.json`), JSON.stringify({ id, date: '2026-03-16', accountId: MBANK_ACCOUNT_ID, amount: -1200, note: 'stara' }, null, 2))
    noCreate(root)
    const snap = await new DataStore(root, withPresence(root)).open()
    expect(snap.status).toMatchObject({ readOnly: true, readOnlyReason: FOLDER_NOT_WRITABLE_MESSAGE })
    vi.restoreAllMocks()
    expect(await fsp.readFile(join(root, 'fi.json'), 'utf8')).toBe(legacyFi)
    expect(await exists(join(root, 'backups', 'pre-migration'))).toBe(false)
  })

  it('folder, który przyjmuje zapisy: próba nie robi żadnego pliku poza obecnością tego komputera (zapis, który i tak by był)', async () => {
    const root = await folder()
    const before = (await fsp.readdir(root)).sort()
    const snap = await new DataStore(root, withPresence(root)).open()
    expect(snap.status).toMatchObject({ readOnly: false, readOnlyReason: null })
    expect((await fsp.readdir(root)).sort()).toEqual([...before, '.presence'].sort())
    expect(await fsp.readdir(join(root, '.presence'))).toEqual(['TEST-PC.json'])
  })
})
