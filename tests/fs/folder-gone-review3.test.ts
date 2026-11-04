// The third review of AP-1 (1.15.5, grupa N1): the presence part of the write probe – a brief lock on making the temp file,
// this computer's one presence file that cannot be replaced, no long waits in the idle probe (T316, T335).
import { promises as fsp } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSettings } from '@shared/defaults'
import { PresenceKeeper, writePresence } from '../../src/main/datastore/presence'
import { DataStore, FOLDER_NOT_WRITABLE_MESSAGE } from '../../src/main/datastore/store'
import { CREATED, exists, tempDir } from './helpers'

/** An error as Node's fs gives it: its code, the call that failed (`syscall`) and the path. */
const failure = (code: string, syscall: string, path: unknown) => Object.assign(new Error(`${code}: operation not permitted, ${syscall} '${String(path)}'`), { code, syscall, path: String(path) })

async function folder(): Promise<string> {
  const root = join(tempDir(), 'dane')
  await DataStore.initialize(root, createDefaultSettings(CREATED))
  return root
}

type Flags = string | number | undefined
type Log = (level: 'info' | 'warn' | 'error', message: string, detail?: unknown) => void

/** The presence the main process writes (`writeOwnPresence`) with the probe's tries: its check that new files can be made. */
const CONTENT = () => ({ appVersion: '0.0.0', activeAt: null })
const withPresence = (root: string, log?: Log) => ({ machineName: 'TEST-PC', log, presence: (attempts?: number) => writePresence(root, 'TEST-PC', '0.0.0', null, attempts) })

const presenceFile = (root: string) => resolve(root, '.presence', 'TEST-PC.json')
const inPresence = (root: string, p: unknown) => typeof p === 'string' && resolve(p).startsWith(resolve(root, '.presence'))

/** fi.json refused for writing ('r+', EPERM) while `blocked()` – the folder read-only at the open. */
function fiRefused(root: string, blocked: () => boolean): void {
  const fi = resolve(root, 'fi.json')
  const real = fsp.open.bind(fsp)
  vi.spyOn(fsp, 'open').mockImplementation(((p: string, flags?: Flags, mode?: number) =>
    blocked() && resolve(p) === fi && flags === 'r+' ? Promise.reject(failure('EPERM', 'open', p)) : real(p, flags as never, mode)) as never)
}

/** This computer's presence file not replaced (its attribute „tylko do odczytu”, a lock held long): every rename onto it EPERM. */
function presenceNotReplaced(root: string): { renames: () => number } {
  const target = presenceFile(root)
  const real = fsp.rename.bind(fsp)
  let renames = 0
  vi.spyOn(fsp, 'rename').mockImplementation(((from: string, to: string) => {
    if (resolve(to) !== target) return real(from, to)
    renames++
    return Promise.reject(failure('EPERM', 'rename', from))
  }) as never)
  return { renames: () => renames }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('chwilowa blokada przy zakładaniu pliku obecności (przegląd 3 AP-1, T316)', () => {
  it('jeden EPERM przy zakładaniu pliku tymczasowego w .presence/: folder przyjmuje zapisy – próba ponawia krótko jak fi.json', async () => {
    const root = await folder()
    await fsp.mkdir(join(root, '.presence'))
    const real = fsp.open.bind(fsp)
    let refused = 0
    vi.spyOn(fsp, 'open').mockImplementation(((p: string, flags?: Flags, mode?: number) => {
      // An antivirus or OneDrive holding `.presence/` for a moment: the first temp file refused.
      if (inPresence(root, p) && flags === 'w' && refused === 0) {
        refused++
        return Promise.reject(failure('EPERM', 'open', p))
      }
      return real(p, flags as never, mode)
    }) as never)
    const snap = await new DataStore(root, withPresence(root)).open()
    expect(refused).toBe(1)
    expect(snap.status).toMatchObject({ readOnly: false, readOnlyReason: null })
    expect(await exists(presenceFile(root))).toBe(true)
  })
})

describe('jeden plik obecności, którego nie da się zastąpić (przegląd 3 AP-1, T316)', () => {
  it('zamiana .presence/TEST-PC.json ciągle odmawia: folder przyjmuje zapisy (to ten jeden plik, nie folder), powód w logu, zapisy idą', async () => {
    const root = await folder()
    await writePresence(root, 'TEST-PC', '0.0.0')
    const { renames } = presenceNotReplaced(root)
    const log = vi.fn<Log>()
    const store = new DataStore(root, withPresence(root, log))
    const snap = await store.open()
    expect(snap.status).toMatchObject({ readOnly: false, readOnlyReason: null })
    // A lock for a moment waited out at the open – not for 1.4 s of eight tries.
    expect(renames()).toBeGreaterThan(0)
    expect(renames()).toBeLessThanOrEqual(4)
    expect(log).toHaveBeenCalledWith('warn', expect.stringContaining('presence'), expect.anything())
    const saved = await store.saveSettings({ ...store.fi, settings: { ...store.fi.settings, shipName: 'Zapisuje mimo obecności' } })
    expect(saved.settings.shipName).toBe('Zapisuje mimo obecności')
    expect(await store.stale()).toBe(false)
  })

  it.runIf(process.platform === 'win32')('Windows: plik obecności z atrybutem „tylko do odczytu” (po przywróceniu kopii): folder przyjmuje zapisy', async () => {
    const root = await folder()
    await writePresence(root, 'TEST-PC', '0.0.0')
    // On Windows a mode without write sets the attribute „tylko do odczytu” – a rename onto the file is refused (EPERM).
    await fsp.chmod(presenceFile(root), 0o444)
    try {
      const snap = await new DataStore(root, withPresence(root)).open()
      expect(snap.status).toMatchObject({ readOnly: false, readOnlyReason: null })
    } finally {
      await fsp.chmod(presenceFile(root), 0o666)
    }
  })
})

describe('próba w spoczynku bez długiego czekania (przegląd 3 AP-1, T335)', () => {
  it('folder tylko do odczytu przy otwarciu, potem fi.json przyjmuje zapis, a plik obecności nie: sprawdzanie w spoczynku próbuje zamiany raz i widzi folder przyjmujący zapisy', async () => {
    const root = await folder()
    await writePresence(root, 'TEST-PC', '0.0.0')
    let blocked = true
    fiRefused(root, () => blocked)
    const { renames } = presenceNotReplaced(root)
    const store = new DataStore(root, withPresence(root))
    expect((await store.open()).status.readOnlyReason).toBe(FOLDER_NOT_WRITABLE_MESSAGE)
    expect(renames()).toBe(0)

    blocked = false
    const t0 = performance.now()
    expect(await store.stale()).toBe(true)
    // One try of the replacement, no sleeping between tries (before: eight, ~1.4 s every 5 s).
    expect(renames()).toBe(1)
    expect(performance.now() - t0).toBeLessThan(500)
    expect((await store.refresh())?.status).toMatchObject({ readOnly: false, readOnlyReason: null })
  })

  it('folder naprawdę bez zakładania plików: dalej tylko do odczytu, w spoczynku jedna próba bez czekania', async () => {
    const root = await folder()
    await fsp.mkdir(join(root, '.presence'))
    const real = fsp.open.bind(fsp)
    let creates = 0
    vi.spyOn(fsp, 'open').mockImplementation(((p: string, flags?: Flags, mode?: number) => {
      if (inPresence(root, p) && flags === 'w') {
        creates++
        return Promise.reject(failure('EPERM', 'open', p))
      }
      return real(p, flags as never, mode)
    }) as never)
    const store = new DataStore(root, withPresence(root))
    expect((await store.open()).status.readOnlyReason).toBe(FOLDER_NOT_WRITABLE_MESSAGE)
    expect(creates).toBeGreaterThan(1)
    expect(creates).toBeLessThanOrEqual(4)
    creates = 0
    expect(await store.stale()).toBe(false)
    expect(creates).toBe(1)
  })
})

describe('obecność otwarcia, które ustąpiło nowszemu (przegląd 3 AP-1, T316)', () => {
  it('otwarcie X ustępuje nowszemu otwarciu X, którego próba zapisała już obecność: zostaje; usuwa ją dopiero zamknięcie X, gdy nikt go nie trzyma', async () => {
    const root = await folder()
    // As `openFolder` and `closeStore` in the main process use it.
    const kept = new PresenceKeeper('TEST-PC', (a, b) => resolve(a).toLowerCase() === resolve(b).toLowerCase(), CONTENT)
    const firstOpen = kept.keep(root)
    await new DataStore(root, withPresence(root)).open()
    // Opened again (a forced retry) before the first finished: its write probe writes the presence too.
    const secondOpen = kept.keep(root)
    await new DataStore(root, withPresence(root)).open()
    // The first gives way (another folder still open): its clearing leaves the newer open's presence.
    firstOpen()
    await kept.clear(root)
    expect(await exists(presenceFile(root))).toBe(true)

    // The second opened it: the store keeps it once the open's own hold is gone; the heartbeat of the store before (or a
    // closing one of the same folder) leaves it too.
    const storeHolds = kept.keep(root)
    secondOpen()
    secondOpen()
    // The same folder spelled otherwise (a trailing separator) is the same folder.
    await kept.clear(`${root}${sep}`)
    expect(await exists(presenceFile(root))).toBe(true)

    // Closed (another folder opened): no presence of this computer left in a folder it has not open.
    storeHolds()
    await kept.clear(root)
    expect(await exists(presenceFile(root))).toBe(false)
  })

  it('otwarcie innego folderu nie trzyma obecności w tym: nieudane otwarcie X usuwa swoją, choć Y się otwiera', async () => {
    const x = await folder()
    const y = await folder()
    const kept = new PresenceKeeper('TEST-PC', (a, b) => resolve(a) === resolve(b), CONTENT)
    const openX = kept.keep(x)
    await new DataStore(x, withPresence(x)).open()
    const openY = kept.keep(y)
    openX()
    await kept.clear(x)
    expect(await exists(presenceFile(x))).toBe(false)
    openY()
  })
})
