// The fourth review of AP-1 (1.15.5, grupa N1): this computer's presence file that cannot be replaced is repaired and its
// failure never swallowed, presence writes and clears of a folder one at a time, the write probe classified by the step
// of our own write that failed (T316, T335, T337).
import { constants as fsConstants, promises as fsp } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSettings } from '@shared/defaults'
import { PresenceKeeper, writePresence } from '../../src/main/datastore/presence'
import { DataStore, FOLDER_NOT_WRITABLE_MESSAGE } from '../../src/main/datastore/store'
import { CREATED, exists, readJson, tempDir } from './helpers'

async function folder(): Promise<string> {
  const root = join(tempDir(), 'dane')
  await DataStore.initialize(root, createDefaultSettings(CREATED))
  return root
}

type Flags = string | number | undefined
type Log = (level: 'info' | 'warn' | 'error', message: string, detail?: unknown) => void

const sameDir = (a: string, b: string) => resolve(a).toLowerCase() === resolve(b).toLowerCase()
const presenceFile = (root: string) => resolve(root, '.presence', 'TEST-PC.json')
const inPresence = (root: string, p: unknown) => typeof p === 'string' && resolve(p).startsWith(resolve(root, '.presence'))
/** The presence the main process writes (`writeOwnPresence`) – through the keeper, as the main process does. */
const withPresence = (root: string, keeper: PresenceKeeper, log?: Log) => ({
  machineName: 'TEST-PC',
  log,
  presence: (attempts?: number) => keeper.write(root, () => writePresence(root, 'TEST-PC', '9.9.9', null, attempts))
})
const refusal = (code: string, extra: Record<string, unknown> = {}) => Object.assign(new Error(`${code}: operation not permitted`), { code, ...extra })

/** A gate a mocked call waits at until it is opened; `reached` once the call came to it. */
function gate(): { open: () => void; wait: () => Promise<void>; reached: Promise<void> } {
  let open!: () => void
  let reach!: () => void
  const opened = new Promise<void>((r) => (open = r))
  const reached = new Promise<void>((r) => (reach = r))
  return {
    open,
    reached,
    wait: () => {
      reach()
      return opened
    }
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('plik obecności z atrybutem „tylko do odczytu” naprawiany (przegląd 4 AP-1, T337)', () => {
  it('zamiana odmawia, bo plik jest tylko do odczytu: atrybut zdjęty i obecność zapisana – drugi komputer widzi ten', async () => {
    const root = await folder()
    await writePresence(root, 'TEST-PC', '0.0.1-stara')
    // The attribute „tylko do odczytu” as Windows has it (a restored backup): the file not writable, no rename onto it –
    // until its write right is given back.
    let readOnly = true
    const target = presenceFile(root)
    const realRename = fsp.rename.bind(fsp)
    const realAccess = fsp.access.bind(fsp)
    const realChmod = fsp.chmod.bind(fsp)
    vi.spyOn(fsp, 'rename').mockImplementation(((from: string, to: string) =>
      readOnly && resolve(to) === target ? Promise.reject(refusal('EPERM', { syscall: 'rename' })) : realRename(from, to)) as never)
    vi.spyOn(fsp, 'access').mockImplementation(((p: string, mode?: number) =>
      readOnly && resolve(p) === target && mode === fsConstants.W_OK ? Promise.reject(refusal('EPERM', { syscall: 'access' })) : realAccess(p, mode)) as never)
    vi.spyOn(fsp, 'chmod').mockImplementation(((p: string, mode: number) => {
      if (resolve(p) === target && mode & 0o200) readOnly = false
      return realChmod(p, mode)
    }) as never)
    const keeper = new PresenceKeeper('TEST-PC', sameDir)
    const snap = await new DataStore(root, withPresence(root, keeper)).open()
    expect(snap.status).toMatchObject({ readOnly: false, readOnlyReason: null })
    // Before: only logged – the file kept the old heartbeat for good, the other computer took this one for stopped.
    expect(readOnly).toBe(false)
    expect((await readJson(target)).appVersion).toBe('9.9.9')
  })

  it.runIf(process.platform === 'win32')('Windows: prawdziwy atrybut „tylko do odczytu” – próba przy otwarciu i heartbeat zapisują obecność', async () => {
    const root = await folder()
    await writePresence(root, 'TEST-PC', '0.0.1-stara')
    await fsp.chmod(presenceFile(root), 0o444)
    try {
      const keeper = new PresenceKeeper('TEST-PC', sameDir)
      const snap = await new DataStore(root, withPresence(root, keeper)).open()
      expect(snap.status).toMatchObject({ readOnly: false, readOnlyReason: null })
      expect((await readJson(presenceFile(root))).appVersion).toBe('9.9.9')
      await expect(fsp.access(presenceFile(root), fsConstants.W_OK)).resolves.toBeUndefined()
    } finally {
      await fsp.chmod(presenceFile(root), 0o666).catch(() => undefined)
    }
  })

  it('plik trzymany (zamiana odmawia, plik zapisywalny): bez naprawy i bez drugiego zapisu – błąd idzie dalej', async () => {
    const root = await folder()
    await writePresence(root, 'TEST-PC', '0.0.1-stara')
    const target = presenceFile(root)
    const realRename = fsp.rename.bind(fsp)
    let renames = 0
    vi.spyOn(fsp, 'rename').mockImplementation(((from: string, to: string) => {
      if (resolve(to) !== target) return realRename(from, to)
      renames++
      return Promise.reject(refusal('EPERM', { syscall: 'rename' }))
    }) as never)
    const chmod = vi.spyOn(fsp, 'chmod')
    await expect(writePresence(root, 'TEST-PC', '9.9.9', null, 1)).rejects.toMatchObject({ code: 'EPERM' })
    expect(renames).toBe(1)
    expect(chmod).not.toHaveBeenCalled()
  })

  it('heartbeat nie połyka błędu obecności: wpis w logu, gdy zaczyna się nie udawać, i gdy znów się udaje – nie przy każdej próbie', async () => {
    const root = await folder()
    const log = vi.fn<Log>()
    const keeper = new PresenceKeeper('TEST-PC', sameDir, log)
    let fail = true
    const write = () => (fail ? Promise.reject(refusal('EBUSY')) : writePresence(root, 'TEST-PC', '9.9.9'))
    // Never rejects – the heartbeat goes on to read the other computers.
    await expect(keeper.beat(root, write)).resolves.toBeUndefined()
    await keeper.beat(root, write)
    await keeper.beat(root, write)
    expect(log.mock.calls.filter(([level]) => level === 'warn')).toHaveLength(1)
    expect(log).toHaveBeenCalledWith('warn', expect.stringContaining(root), expect.objectContaining({ code: 'EBUSY' }))
    fail = false
    await keeper.beat(root, write)
    await keeper.beat(root, write)
    expect(log.mock.calls.filter(([level]) => level === 'info')).toHaveLength(1)
    expect(await exists(presenceFile(root))).toBe(true)
    fail = true
    await keeper.beat(root, write)
    expect(log.mock.calls.filter(([level]) => level === 'warn')).toHaveLength(2)
  })
})

describe('zapisy i usunięcia obecności w folderze po kolei (przegląd 4 AP-1, T316)', () => {
  it('usunięcie po ustępującym otwarciu w drodze, nowsze otwarcie tego folderu zapisuje obecność: zapis po usunięciu – obecność zostaje', async () => {
    const root = await folder()
    await writePresence(root, 'TEST-PC', '0.0.1-stara')
    const order: string[] = []
    const slowRm = gate()
    const realRm = fsp.rm.bind(fsp)
    vi.spyOn(fsp, 'rm').mockImplementation((async (p: string, opts?: object) => {
      if (resolve(p) !== presenceFile(root)) return realRm(p, opts as never)
      order.push('rm')
      // A slow OneDrive: the removal lands late.
      await slowRm.wait()
      await realRm(p, opts as never)
      order.push('rm done')
    }) as never)
    const keeper = new PresenceKeeper('TEST-PC', sameDir)
    // The open that gave way clears (fire-and-forget) – no open of the folder keeps it yet.
    const clearing = keeper.clear(root)
    await slowRm.reached
    // The newer open of the same folder: kept, its write probe writes the presence.
    const release = keeper.keep(root)
    const writing = keeper.write(root, async () => {
      order.push('write')
      await writePresence(root, 'TEST-PC', '9.9.9')
    })
    // Before: the write ran at once, the late removal took its file.
    await new Promise((r) => setImmediate(r))
    slowRm.open()
    await Promise.all([clearing, writing])
    expect(order).toEqual(['rm', 'rm done', 'write'])
    expect((await readJson(presenceFile(root))).appVersion).toBe('9.9.9')
    release()
  })

  it('usunięcie sprawdza trzymanie, gdy przychodzi jego kolej: folder otwierany od nowa w międzyczasie – obecność zostaje', async () => {
    const root = await folder()
    await writePresence(root, 'TEST-PC', '0.0.1-stara')
    const keeper = new PresenceKeeper('TEST-PC', sameDir)
    const realRm = fsp.rm.bind(fsp)
    let removals = 0
    vi.spyOn(fsp, 'rm').mockImplementation(((p: string, opts?: object) => {
      if (resolve(p) === presenceFile(root)) removals++
      return realRm(p, opts as never)
    }) as never)
    const slowWrite = gate()
    // A heartbeat's write of the folder in flight.
    const beating = keeper.write(root, async () => {
      await slowWrite.wait()
      await writePresence(root, 'TEST-PC', '9.9.9')
    })
    await slowWrite.reached
    // Asked while nothing keeps the folder (the closed store)…
    const clearing = keeper.clear(root)
    // …and kept before its turn (the same folder opened again).
    const release = keeper.keep(root)
    slowWrite.open()
    await Promise.all([beating, clearing])
    // Checked when its turn came – not when asked: no removal of a folder kept by then (before: removed at once).
    expect(removals).toBe(0)
    expect(await exists(presenceFile(root))).toBe(true)
    release()
    await keeper.clear(root)
    expect(await exists(presenceFile(root))).toBe(false)
  })

  it('inny folder nie czeka: zapis w Y idzie, choć usunięcie w X stoi', async () => {
    const x = await folder()
    const y = await folder()
    const keeper = new PresenceKeeper('TEST-PC', sameDir)
    const stuck = gate()
    const clearing = keeper.clear(x).then(() => undefined)
    void keeper.write(x, () => stuck.wait())
    await keeper.write(y, () => writePresence(y, 'TEST-PC', '9.9.9'))
    expect(await exists(presenceFile(y))).toBe(true)
    stuck.open()
    await clearing
  })
})

describe('tryb tylko do odczytu z kroku naszego zapisu, nie z pola błędu (przegląd 4 AP-1, T316)', () => {
  it('plik tymczasowy w .presence/ odmówiony błędem bez `syscall`: folder tylko do odczytu', async () => {
    const root = await folder()
    await fsp.mkdir(join(root, '.presence'))
    const real = fsp.open.bind(fsp)
    vi.spyOn(fsp, 'open').mockImplementation(((p: string, flags?: Flags, mode?: number) =>
      inPresence(root, p) && flags === 'w' ? Promise.reject(refusal('EPERM')) : real(p, flags as never, mode)) as never)
    const keeper = new PresenceKeeper('TEST-PC', sameDir)
    expect((await new DataStore(root, withPresence(root, keeper)).open()).status.readOnlyReason).toBe(FOLDER_NOT_WRITABLE_MESSAGE)
  })

  it('katalog .presence/ odmówiony błędem z innym `syscall`: folder tylko do odczytu', async () => {
    const root = await folder()
    const real = fsp.mkdir.bind(fsp)
    vi.spyOn(fsp, 'mkdir').mockImplementation(((p: string, opts?: object) =>
      inPresence(root, p) ? Promise.reject(refusal('EACCES', { syscall: 'CreateDirectoryW' })) : real(p, opts as never)) as never)
    const keeper = new PresenceKeeper('TEST-PC', sameDir)
    expect((await new DataStore(root, withPresence(root, keeper)).open()).status.readOnlyReason).toBe(FOLDER_NOT_WRITABLE_MESSAGE)
  })

  it('zamiana odmówiona błędem z `syscall` „open”: to ten jeden plik – folder przyjmuje zapisy, krok w logu', async () => {
    const root = await folder()
    await writePresence(root, 'TEST-PC', '0.0.1-stara')
    const target = presenceFile(root)
    const real = fsp.rename.bind(fsp)
    vi.spyOn(fsp, 'rename').mockImplementation(((from: string, to: string) =>
      resolve(to) === target ? Promise.reject(refusal('EPERM', { syscall: 'open' })) : real(from, to)) as never)
    const log = vi.fn<Log>()
    const keeper = new PresenceKeeper('TEST-PC', sameDir)
    const snap = await new DataStore(root, withPresence(root, keeper, log)).open()
    expect(snap.status).toMatchObject({ readOnly: false, readOnlyReason: null })
    expect(log).toHaveBeenCalledWith('warn', expect.stringContaining('replace'), expect.objectContaining({ code: 'EPERM' }))
  })
})
