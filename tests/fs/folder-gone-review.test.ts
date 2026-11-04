// The review of AP-1 (1.15.5, grupa N1): the write probe on OneDrive (a lock for a moment is no read-only folder, no
// probe file in the folder), the backup before a migration never making the data folder anew.
import { promises as fsp, renameSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSettings } from '@shared/defaults'
import { MBANK_ACCOUNT_ID } from '@shared/schema'
import { DataStore, FOLDER_NOT_WRITABLE_MESSAGE } from '../../src/main/datastore/store'
import { CREATED, exists, tempDir } from './helpers'

const eperm = (path: unknown) => Object.assign(new Error(`EPERM: operation not permitted, '${String(path)}'`), { code: 'EPERM' })

async function folder(): Promise<string> {
  const root = join(tempDir(), 'dane')
  await DataStore.initialize(root, createDefaultSettings(CREATED))
  return root
}

type Flags = string | number | undefined
const flagOf = (opts: unknown): Flags => (typeof opts === 'object' && opts && 'flag' in opts ? (opts as { flag?: Flags }).flag : undefined)
/** A file opened to be written (made, replaced or changed in place). */
const forWrite = (flags: Flags) => flags != null && flags !== 'r'
/** A file opened so that it is made if missing ('w', 'wx', 'a'), not only changed in place ('r+'). */
const makes = (flags: Flags) => typeof flags === 'string' && /[wa]/.test(flags)

/**
 * The probe's writes failed as `fail` says: every file made, opened for writing or removed directly in `root` – a
 * record's or a backup's write goes below it. The files made there listed (`made`).
 */
function lockRoot(root: string, fail: { write?: (n: number) => boolean; rm?: (n: number) => boolean }) {
  const real = { open: fsp.open.bind(fsp), writeFile: fsp.writeFile.bind(fsp), rm: fsp.rm.bind(fsp) }
  const inRoot = (p: unknown) => typeof p === 'string' && resolve(dirname(p)) === resolve(root)
  const made: string[] = []
  let writes = 0
  let rms = 0
  vi.spyOn(fsp, 'open').mockImplementation(((p: string, flags?: Flags, mode?: number) => {
    if (inRoot(p) && forWrite(flags)) {
      if (makes(flags)) made.push(String(p))
      if (fail.write?.(writes++)) return Promise.reject(eperm(p))
    }
    return real.open(p, flags as never, mode)
  }) as never)
  vi.spyOn(fsp, 'writeFile').mockImplementation(((p: string, data: never, opts?: never) => {
    if (inRoot(p)) {
      made.push(String(p))
      if (fail.write?.(writes++)) return Promise.reject(eperm(p))
    }
    return real.writeFile(p, data, opts)
  }) as never)
  vi.spyOn(fsp, 'rm').mockImplementation(((p: string, opts?: never) => {
    if (inRoot(p) && fail.rm?.(rms++)) return Promise.reject(eperm(p))
    return real.rm(p, opts)
  }) as never)
  return { made }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('próba zapisu przy otwarciu na OneDrive (przegląd AP-1, T316)', () => {
  it('chwilowa blokada (antywirus, OneDrive) przy próbie zapisu to nie folder tylko do odczytu – ponowiona jak każdy zapis', async () => {
    const root = await folder()
    lockRoot(root, { write: (n) => n === 0 })
    const snap = await new DataStore(root, { machineName: 'TEST-PC' }).open()
    expect(snap.status).toMatchObject({ readOnly: false, readOnlyReason: null })
  })

  it('próba nie zakłada pliku w korzeniu (kosz online OneDrive przy każdym otwarciu) – a usuwanie nigdy nie decyduje o trybie', async () => {
    const root = await folder()
    const { made } = lockRoot(root, { rm: () => true })
    const store = new DataStore(root, { machineName: 'TEST-PC' })
    const snap = await store.open()
    expect(snap.status.readOnly).toBe(false)
    expect(made).toEqual([])
    expect((await fsp.readdir(root)).filter((n) => n.includes('.tmp-'))).toEqual([])
    // The writes of the folder go as before.
    vi.restoreAllMocks()
    await store.saveSettings({ ...store.fi, settings: { ...store.fi.settings, shipName: 'Po próbie' } })
  })

  it('brak prawa zapisu do fi.json bez atrybutu (uprawnienia, udział sieciowy tylko do odczytu): tylko do odczytu z powodem', async () => {
    const root = await folder()
    lockRoot(root, { write: () => true })
    const snap = await new DataStore(root, { machineName: 'TEST-PC' }).open()
    expect(snap.status).toMatchObject({ readOnly: true, available: true, readOnlyReason: FOLDER_NOT_WRITABLE_MESSAGE })
  })
})

describe('kopia przed migracją nie zakłada folderu danych (przegląd AP-1, T314)', () => {
  it('folder przeniesiony w trakcie otwarcia (przed migracją): ZIP w backups/ nie robi go na nowo, nic nie trafia do folderu-widma', async () => {
    const root = join(tempDir(), 'stary')
    await fsp.mkdir(join(root, 'transactions', '2026'), { recursive: true })
    const legacyFi = JSON.stringify({ settings: { shipName: 'Stary okręt' } }, null, 2)
    await fsp.writeFile(join(root, 'fi.json'), legacyFi)
    const id = '01K6H3Z0W8Q4M2N5P7R9S1T3V5'
    await fsp.writeFile(join(root, 'transactions', '2026', `2026-03-16_${id}.json`), JSON.stringify({ id, date: '2026-03-16', accountId: MBANK_ACCOUNT_ID, amount: -1200, note: 'stara' }, null, 2))
    const away = `${root}-przeniesiony`
    const store = new DataStore(root, { machineName: 'TEST-PC' })
    // Read, not yet migrated: the folder moved away (OneDrive, another window) – the migration's backup comes next.
    await expect(store.open({ onCommit: () => renameSync(root, away) })).rejects.toThrow()
    expect(await exists(root)).toBe(false)
    // The folder as it was: no migrated file written anywhere.
    expect(await fsp.readFile(join(away, 'fi.json'), 'utf8')).toBe(legacyFi)
    expect(await exists(join(away, 'backups', 'pre-migration'))).toBe(false)
  })
})
