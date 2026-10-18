import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DataStore } from '../../src/main/datastore/store'
import { mapLimit, walkFiles } from '../../src/main/datastore/fsutil'
import { ReadTracker, SLOWEST_KEPT, describeProgress, untilAborted, type LoadProgress } from '../../src/main/datastore/progress'
import { exists, freshStore, sampleTransaction } from './helpers'

/** A folder with `n` operations, closed (a new DataStore opens it). */
async function folderWith(n: number): Promise<string> {
  const store = await freshStore()
  for (let i = 0; i < n; i++) await store.saveRecord('transactions', sampleTransaction({ amount: -100 - i }))
  return store.root
}

/** A temp file of a write that never finished, older than the clean-up's hour. */
async function staleTemp(root: string): Promise<string> {
  const file = join(root, 'transactions', '.x.json.tmp-dead')
  await fs.writeFile(file, '{')
  const old = new Date(Date.now() - 2 * 60 * 60 * 1000)
  await fs.utimes(file, old, old)
  return file
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('wczytywanie folderu krok po kroku (1.4.1)', () => {
  it('postęp: lista plików, odczyt x z N, wolne pliki, statystyki po otwarciu', async () => {
    const root = await folderWith(6)
    const store = new DataStore(root, { machineName: 'DRUGI-PC' })
    const seen: LoadProgress[] = []
    const timer = setInterval(() => {
      const p = store.progress()
      if (p) seen.push(p)
    }, 5)
    const snap = await store.open({ readDelayMs: 40, slowMs: 30 })
    clearInterval(timer)
    expect(snap.records.transactions).toHaveLength(6)
    expect(store.progress()).toBeNull()
    const reading = seen.filter((p) => p.step === 'read')
    expect(reading.length).toBeGreaterThan(0)
    // fi.json and the six operations.
    expect(reading[0]!.total).toBe(7)
    expect(reading.some((p) => p.waiting && p.waiting.relPath.length > 0)).toBe(true)
    expect(Math.max(...reading.map((p) => p.done))).toBeLessThanOrEqual(7)
    const st = store.loadStats!
    expect(st.files).toBe(7)
    expect(st.slow).toBe(7)
    expect(st.slowest).toHaveLength(SLOWEST_KEPT)
    expect(st.slowest[0]!.ms).toBeGreaterThanOrEqual(st.slowest[SLOWEST_KEPT - 1]!.ms)
    expect(st.readMs).toBeGreaterThan(0)
  })

  it('przerwanie: wynik od razu, a folder nietknięty – bez sprzątania i migracji', async () => {
    const root = await folderWith(4)
    const temp = await staleTemp(root)
    const store = new DataStore(root, { machineName: 'DRUGI-PC' })
    const controller = new AbortController()
    const open = store.open({ signal: controller.signal, readDelayMs: 300 })
    while (store.progress()?.step !== 'read') await sleep(5)
    const t0 = Date.now()
    controller.abort()
    await expect(untilAborted(open, controller.signal)).rejects.toThrow()
    // The caller is free at once; the reads in flight finish on their own and change nothing.
    expect(Date.now() - t0).toBeLessThan(150)
    await expect(open).rejects.toThrow()
    expect(await exists(temp)).toBe(true)
    // A normal open cleans the stale temp file up.
    await new DataStore(root, { machineName: 'DRUGI-PC' }).open()
    expect(await exists(temp)).toBe(false)
  })

  it('po wczytaniu (od migracji) otwarcie już się nie przerywa – kończy się i sprząta folder', async () => {
    const root = await folderWith(2)
    const temp = await staleTemp(root)
    const controller = new AbortController()
    let committed = 0
    const snap = await new DataStore(root, { machineName: 'DRUGI-PC' }).open({
      signal: controller.signal,
      onCommit: () => {
        committed++
        controller.abort()
      }
    })
    expect(committed).toBe(1)
    expect(snap.records.transactions).toHaveLength(2)
    expect(await exists(temp)).toBe(false)
  })

  it('przerwanie w trakcie listy plików i odczytu partiami', async () => {
    const root = await folderWith(3)
    const controller = new AbortController()
    controller.abort()
    await expect(walkFiles(root, join(root, 'transactions'), undefined, { signal: controller.signal })).rejects.toThrow()
    const found: string[] = []
    const all = await walkFiles(root, join(root, 'transactions'), undefined, { onFile: (rel) => found.push(rel) })
    expect(found).toEqual(all)
    // An aborted batch starts nothing new.
    const c2 = new AbortController()
    const started: number[] = []
    const run = mapLimit(
      [1, 2, 3, 4, 5, 6],
      2,
      async (n) => {
        started.push(n)
        if (n === 2) c2.abort()
        await sleep(5)
        return n
      },
      c2.signal
    )
    await expect(run).rejects.toThrow()
    expect(started).toEqual([1, 2])
  })

  it('śledzenie odczytu: najdłużej czekający plik, wolne pliki, opis do logu', () => {
    let now = 0
    const t = new ReadTracker(3000, () => now)
    t.total = 3
    t.step = 'read'
    t.start('transactions/2026/a.json')
    now = 1000
    t.start('transactions/2026/b.json')
    now = 5000
    expect(t.waiting()).toEqual({ relPath: 'transactions/2026/a.json', ms: 5000 })
    t.end('transactions/2026/a.json')
    expect(t.waiting()).toEqual({ relPath: 'transactions/2026/b.json', ms: 4000 })
    t.end('transactions/2026/b.json')
    expect(t.progress()).toEqual({ step: 'read', done: 2, total: 3, waiting: null, slow: 2 })
    expect(t.slowest().map((f) => f.ms)).toEqual([5000, 4000])
    expect(describeProgress({ ...t.progress(), waiting: { relPath: 'fi.json', ms: 7400 } }, 61_000)).toBe('step read, 2/3 files, 2 slow, 61 s, waiting fi.json 7 s')
  })
})
