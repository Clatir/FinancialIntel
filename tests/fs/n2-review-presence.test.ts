// The N2 review (1.15.6): the presence's removal at a quit waited for within the quit's drain – the process ends right
// after, so a removal left to go on in the background never ran and the presence stayed (the log said it went on);
// another folder opened waits as before and the removal goes on in its turn (przegląd N1 5, T316).
import { promises as fsp } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSettings } from '@shared/defaults'
import { PresenceKeeper } from '../../src/main/datastore/presence'
import { DataStore } from '../../src/main/datastore/store'
import { CREATED, exists, tempDir } from './helpers'

type Log = (level: 'info' | 'warn' | 'error', message: string, detail?: unknown) => void

async function folder(): Promise<string> {
  const root = join(tempDir(), 'dane')
  await DataStore.initialize(root, createDefaultSettings(CREATED))
  return root
}

const sameDir = (a: string, b: string) => resolve(a).toLowerCase() === resolve(b).toLowerCase()
const presenceFile = (root: string) => resolve(root, '.presence', 'TEST-PC.json')
const CONTENT = () => ({ appVersion: '9.9.9', activeAt: null })
const warns = (log: ReturnType<typeof vi.fn<Log>>) => log.mock.calls.filter(([level]) => level === 'warn').map(([, message]) => message)

/** The heartbeat's write of the presence in `root` held at its replacement until `open` (a slow OneDrive, a file held). */
function heldWrite(root: string): { open: () => void; reached: Promise<void> } {
  let open!: () => void
  let reach!: () => void
  const opened = new Promise<void>((r) => (open = r))
  const reached = new Promise<void>((r) => (reach = r))
  const real = fsp.rename.bind(fsp)
  vi.spyOn(fsp, 'rename').mockImplementation((async (from: string, to: string) => {
    if (resolve(to) === presenceFile(root)) {
      reach()
      await opened
    }
    return real(from, to)
  }) as never)
  return { open, reached }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usunięcie obecności przy wyjściu z aplikacji czeka w limicie wyjścia (przegląd N2, T316)', () => {
  it('wyjście: zapis obecności stoi dłużej niż 5 s zamiany folderu – zamknięcie czeka, plik usunięty, zanim proces się kończy', async () => {
    const root = await folder()
    const log = vi.fn<Log>()
    const keeper = new PresenceKeeper('TEST-PC', sameDir, CONTENT, log)
    const held = heldWrite(root)
    const beating = keeper.beat(root)
    await held.reached
    // The write stands longer than the switch's limit (here 40 ms); the quit's drain has 5 s.
    setTimeout(held.open, 150)
    const t0 = Date.now()
    await expect(keeper.clearAtClose(root, { ms: 40, quitBy: Date.now() + 5000 })).resolves.toBe(true)
    expect(Date.now() - t0).toBeGreaterThanOrEqual(100)
    // Done before the process would end: no presence left for the other computer.
    expect(await exists(presenceFile(root))).toBe(false)
    expect(warns(log)).toEqual([])
    await beating
  })

  it('zamiana folderu: czeka najwyżej limit, usunięcie idzie dalej w tle – i rzeczywiście idzie', async () => {
    const root = await folder()
    const log = vi.fn<Log>()
    const keeper = new PresenceKeeper('TEST-PC', sameDir, CONTENT, log)
    const held = heldWrite(root)
    const beating = keeper.beat(root)
    await held.reached
    await expect(keeper.clearAtClose(root, { ms: 40 })).resolves.toBe(false)
    expect(warns(log)).toEqual([expect.stringContaining('– idzie dalej w tle')])
    held.open()
    await beating
    await vi.waitFor(async () => expect(await exists(presenceFile(root))).toBe(false))
  })

  it('wyjście po limicie wyjścia: log mówi, że plik obecności zostaje (nie „idzie dalej w tle”)', async () => {
    const root = await folder()
    const log = vi.fn<Log>()
    const keeper = new PresenceKeeper('TEST-PC', sameDir, CONTENT, log)
    const held = heldWrite(root)
    const beating = keeper.beat(root)
    await held.reached
    // The drain spent on the writes: the switch's limit at least.
    await expect(keeper.clearAtClose(root, { ms: 40, quitBy: Date.now() - 1000 })).resolves.toBe(false)
    const said = warns(log)
    expect(said).toHaveLength(1)
    expect(said[0]).toContain('plik obecności zostaje')
    expect(said[0]).not.toContain('w tle')
    held.open()
    await beating
  })

  it('wyjście w trakcie otwierania tego samego folderu: usunięcie w swojej kolejce sprawdza trzymanie – obecność zostaje (T316)', async () => {
    const root = await folder()
    const keeper = new PresenceKeeper('TEST-PC', sameDir, CONTENT)
    await keeper.write(root)
    const release = keeper.keep(root)
    await expect(keeper.clearAtClose(root, { ms: 40, quitBy: Date.now() + 5000 })).resolves.toBe(true)
    expect(await exists(presenceFile(root))).toBe(true)
    release()
  })
})
