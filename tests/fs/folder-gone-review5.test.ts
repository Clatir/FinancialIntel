// The fifth review of AP-1 (1.15.5 → N2, 1.15.6): the heartbeat's failure said again in a folder after another, the
// presence's removal at a close bounded, the presence keeper's queue running only its own writes, the failed step of a
// write carried by its error (T316, T337).
import { promises as fsp } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSettings } from '@shared/defaults'
import { atomicFailure, atomicStep, AtomicWriteError, writeFileAtomic } from '../../src/main/datastore/atomic'
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
const CONTENT = () => ({ appVersion: '9.9.9', activeAt: null })
const refusal = (code: string, extra: Record<string, unknown> = {}) => Object.assign(new Error(`${code}: operation not permitted`), { code, ...extra })
const warns = (log: ReturnType<typeof vi.fn<Log>>) => log.mock.calls.filter(([level]) => level === 'warn')
const infos = (log: ReturnType<typeof vi.fn<Log>>) => log.mock.calls.filter(([level]) => level === 'info')

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

/** The presence file's replacement failing in the folders of the returned set (an error no retry waits for). */
function failingPresence(...roots: string[]): Set<string> {
  const failing = new Set(roots)
  const real = fsp.rename.bind(fsp)
  vi.spyOn(fsp, 'rename').mockImplementation(((from: string, to: string) =>
    [...failing].some((r) => resolve(to) === presenceFile(r)) ? Promise.reject(refusal('EIO')) : real(from, to)) as never)
  return failing
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('błąd heartbeatu w logu od nowa po innym folderze (przegląd N1 5, T337)', () => {
  it('A nie zapisuje obecności, B otwarty i zapisuje, z powrotem A i znów błąd: nowa seria w logu', async () => {
    const a = await folder()
    const b = await folder()
    const log = vi.fn<Log>()
    const keeper = new PresenceKeeper('TEST-PC', sameDir, CONTENT, log)
    failingPresence(a)
    await keeper.beat(a)
    expect(warns(log)).toHaveLength(1)
    await keeper.beat(b)
    await keeper.beat(a)
    // Before: the failure in A still taken for the old series – not in the log (against T337).
    expect(warns(log)).toHaveLength(2)
    expect(warns(log)[1]![1]).toContain(a)
  })

  it('A nie zapisuje obecności, B otwarty, z powrotem A i zapis się udaje: bez mylącego „presence written again”', async () => {
    const a = await folder()
    const b = await folder()
    const log = vi.fn<Log>()
    const keeper = new PresenceKeeper('TEST-PC', sameDir, CONTENT, log)
    const failing = failingPresence(a)
    await keeper.beat(a)
    await keeper.beat(b)
    failing.clear()
    await keeper.beat(a)
    expect(infos(log)).toHaveLength(0)
    expect(await exists(presenceFile(a))).toBe(true)
  })

  it('A nie zapisuje obecności, A zamknięty (obecność usunięta), otwarty znów i znów błąd: nowa seria w logu', async () => {
    const a = await folder()
    const log = vi.fn<Log>()
    const keeper = new PresenceKeeper('TEST-PC', sameDir, CONTENT, log)
    failingPresence(a)
    await keeper.beat(a)
    await keeper.clear(a)
    await keeper.beat(a)
    expect(warns(log)).toHaveLength(2)
  })

  it('usunięcie pominięte, bo folder trzymany (otwierany od nowa): seria trwa – bez drugiego wpisu przy każdej próbie', async () => {
    const a = await folder()
    const log = vi.fn<Log>()
    const keeper = new PresenceKeeper('TEST-PC', sameDir, CONTENT, log)
    failingPresence(a)
    await keeper.beat(a)
    const release = keeper.keep(a)
    await keeper.clear(a)
    await keeper.beat(a)
    expect(warns(log)).toHaveLength(1)
    release()
  })
})

describe('usunięcie obecności przy zamknięciu z limitem czasu, bez wyścigu T316 (przegląd N1 5)', () => {
  it('zapis obecności w folderze stoi (wolny OneDrive): zamknięcie czeka najwyżej limit; usunięcie idzie potem w swojej kolejce', async () => {
    const root = await folder()
    const keeper = new PresenceKeeper('TEST-PC', sameDir, CONTENT)
    const stuck = gate()
    const real = fsp.rename.bind(fsp)
    vi.spyOn(fsp, 'rename').mockImplementation((async (from: string, to: string) => {
      if (resolve(to) === presenceFile(root)) await stuck.wait()
      return real(from, to)
    }) as never)
    // The heartbeat's write in flight, held.
    const beating = keeper.beat(root)
    await stuck.reached
    const t0 = Date.now()
    // Before: `closeStore` waited for the clear behind it – as long as the write stood.
    await expect(keeper.clearWithin(root, 50)).resolves.toBe(false)
    expect(Date.now() - t0).toBeLessThan(2000)
    stuck.open()
    await beating
    // Not waited for, the removal still went in its turn – after the write.
    await vi.waitFor(async () => expect(await exists(presenceFile(root))).toBe(false))
  })

  it('nowsze otwarcie tego folderu zaczyna się po limicie: usunięcie w swojej kolejce sprawdza trzymanie – obecność nowszego otwarcia zostaje', async () => {
    const root = await folder()
    const keeper = new PresenceKeeper('TEST-PC', sameDir, CONTENT)
    const stuck = gate()
    const real = fsp.rename.bind(fsp)
    let held = true
    vi.spyOn(fsp, 'rename').mockImplementation((async (from: string, to: string) => {
      if (held && resolve(to) === presenceFile(root)) await stuck.wait()
      return real(from, to)
    }) as never)
    const realRm = fsp.rm.bind(fsp)
    let removals = 0
    vi.spyOn(fsp, 'rm').mockImplementation(((p: string, opts?: object) => {
      if (resolve(p) === presenceFile(root)) removals++
      return realRm(p, opts as never)
    }) as never)
    const beating = keeper.beat(root)
    await stuck.reached
    await expect(keeper.clearWithin(root, 20)).resolves.toBe(false)
    // The same folder opened again: kept, its write probe writes the presence – queued after the removal.
    const release = keeper.keep(root)
    held = false
    const probing = keeper.write(root, 4)
    stuck.open()
    await Promise.all([beating, probing])
    // The removal no longer waited for checked the keeping in its turn: none – never one outside the queue either.
    expect(removals).toBe(0)
    expect((await readJson(presenceFile(root))).appVersion).toBe('9.9.9')
    release()
  })

  it('nic nie stoi: usunięcie w limicie – true, obecność usunięta', async () => {
    const root = await folder()
    await writePresence(root, 'TEST-PC', '0.0.1')
    const keeper = new PresenceKeeper('TEST-PC', sameDir, CONTENT)
    await expect(keeper.clearWithin(root, 5000)).resolves.toBe(true)
    expect(await exists(presenceFile(root))).toBe(false)
  })
})

describe('kolejka obecności uruchamia tylko własne zapisy i usunięcia (przegląd N1 5, T316)', () => {
  it('write() zapisuje obecność sam – treść z chwili swojej kolejki; wywołujący nie podaje operacji, więc nic w kolejce nie czeka na siebie', async () => {
    const root = await folder()
    let activeAt: string | null = null
    const keeper = new PresenceKeeper('TEST-PC', sameDir, () => ({ appVersion: '9.9.9', activeAt }))
    const stuck = gate()
    const real = fsp.rename.bind(fsp)
    let first = true
    vi.spyOn(fsp, 'rename').mockImplementation((async (from: string, to: string) => {
      if (first && resolve(to) === presenceFile(root)) {
        first = false
        await stuck.wait()
      }
      return real(from, to)
    }) as never)
    const writing = keeper.write(root)
    await stuck.reached
    // Asked while the first stands; what it says read when its turn comes.
    const next = keeper.write(root)
    activeAt = '2026-11-04T08:00:00.000Z'
    stuck.open()
    await Promise.all([writing, next])
    expect(await readJson(presenceFile(root))).toMatchObject({ machine: 'TEST-PC', appVersion: '9.9.9', activeAt })
    // By construction (typecheck): no op of a caller can be queued – one calling the keeper would wait for itself.
    const never = () => {
      // @ts-expect-error – `write` takes the write probe's attempts, never an op
      void keeper.write(root, () => keeper.write(root))
    }
    expect(typeof never).toBe('function')
  })
})

describe('krok zapisu niesiony przez błąd, nie szukany po obiekcie błędu (przegląd N1 5, T316)', () => {
  it('writeFileAtomic odrzuca AtomicWriteError z krokiem i błędem fs jako przyczyną – kod i komunikat jak dotąd', async () => {
    const root = await folder()
    const real = fsp.open.bind(fsp)
    const cause = refusal('EPERM', { syscall: 'open' })
    vi.spyOn(fsp, 'open').mockImplementation(((p: string, flags?: Flags, mode?: number) =>
      inPresence(root, p) && flags === 'w' ? Promise.reject(cause) : real(p, flags as never, mode)) as never)
    const failed = await writeFileAtomic(join(root, '.presence', 'X.json'), '{}\n', root).then(
      () => null,
      (e: unknown) => e
    )
    expect(failed).toBeInstanceOf(AtomicWriteError)
    expect(failed).toMatchObject({ step: 'create', cause, code: 'EPERM', syscall: 'open', message: cause.message })
    expect(atomicStep(failed)).toBe('create')
  })

  it('błąd opakowany (`cause`): krok i kod dalej znane; inny błąd – żaden', () => {
    const own = new AtomicWriteError('dir', refusal('EACCES'))
    const wrapped = new Error('presence', { cause: new Error('again', { cause: own }) })
    expect(atomicStep(wrapped)).toBe('dir')
    expect(atomicFailure(wrapped)?.code).toBe('EACCES')
    expect(atomicStep(refusal('EPERM'))).toBeUndefined()
    // A cycle of causes ends.
    const loop: Error & { cause?: unknown } = new Error('loop')
    loop.cause = loop
    expect(atomicStep(loop)).toBeUndefined()
  })

  it('próba zapisu: odmowa pliku tymczasowego w .presence/ opakowana przez wywołującego – folder dalej tylko do odczytu', async () => {
    const root = await folder()
    await fsp.mkdir(join(root, '.presence'))
    const real = fsp.open.bind(fsp)
    vi.spyOn(fsp, 'open').mockImplementation(((p: string, flags?: Flags, mode?: number) =>
      inPresence(root, p) && flags === 'w' ? Promise.reject(refusal('EPERM')) : real(p, flags as never, mode)) as never)
    const keeper = new PresenceKeeper('TEST-PC', sameDir, CONTENT)
    const presence = async (attempts?: number) => {
      try {
        await keeper.write(root, attempts)
      } catch (e) {
        throw new Error('obecność nie zapisana', { cause: e })
      }
    }
    // Before: the step kept by the inner error object – the wrapper had none, only a line in the log.
    const snap = await new DataStore(root, { machineName: 'TEST-PC', presence }).open()
    expect(snap.status.readOnlyReason).toBe(FOLDER_NOT_WRITABLE_MESSAGE)
  })
})
