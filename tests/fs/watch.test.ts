// adapted from ICTTJ tests/fs/watch.test.ts @ 84a8339
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FolderWatcher } from '../../src/main/datastore/watch'
import { writeFileAtomic } from '../../src/main/datastore/atomic'
import { clearPresence, readOtherMachines, safeMachineName, writePresence } from '../../src/main/datastore/presence'
import { tempDir } from './helpers'

describe('watcher folderu danych', () => {
  it('zgłasza zmienione pliki po debounce, pomija pliki tymczasowe i ukryte', async () => {
    const root = tempDir()
    await fs.mkdir(join(root, 'transactions', '2026'), { recursive: true })
    const batches: Array<string[] | null> = []
    const w = new FolderWatcher(root, (p) => batches.push(p), { debounceMs: 80, pollMs: 60_000 })
    w.start()
    await w.ready()
    await new Promise((r) => setTimeout(r, 100))
    await fs.writeFile(join(root, 'transactions', '2026', '.a.json.tmp-1'), 'x')
    await fs.writeFile(join(root, 'transactions', '2026', 'a.json'), '{}')
    await new Promise((r) => setTimeout(r, 400))
    w.stop()
    const all = batches.flatMap((b) => b ?? ['<full>'])
    expect(all).toContain('transactions/2026/a.json')
    expect(all.some((p) => p.includes('.tmp-'))).toBe(false)
  })

  it('pliki w backups/, .history/ i .presence/ nie są zgłaszane', async () => {
    const root = tempDir()
    for (const d of ['backups/daily', '.history/transactions', '.presence', 'goals']) await fs.mkdir(join(root, d), { recursive: true })
    const batches: Array<string[] | null> = []
    const w = new FolderWatcher(root, (p) => batches.push(p), { debounceMs: 60, pollMs: 60_000 })
    w.start()
    await w.ready()
    await new Promise((r) => setTimeout(r, 100))
    await fs.writeFile(join(root, 'backups', 'daily', '2026-10-16.zip'), 'x')
    await fs.writeFile(join(root, '.history', 'transactions', 'v.json'), '{}')
    await fs.writeFile(join(root, '.presence', 'PC.json'), '{}')
    await fs.writeFile(join(root, 'goals', 'g.json'), '{}')
    await new Promise((r) => setTimeout(r, 400))
    w.stop()
    const all = batches.flatMap((b) => b ?? [])
    expect(all).toContain('goals/g.json')
    expect(all.filter((p) => p !== 'goals/g.json')).toEqual([])
  })
})

describe('watcher: folder, którego długo nie ma (1.6.5, B113)', () => {
  afterEach(() => vi.useRealTimers())

  it('ponowne podłączenie po 5 s, potem coraz rzadziej do 5 min; w logu pierwszy błąd, potem najwyżej raz na godzinę', async () => {
    const root = tempDir()
    vi.useFakeTimers()
    const errors: number[] = []
    const w = new FolderWatcher(root, () => undefined, { mode: 'native', pollMs: 24 * 60 * 60_000, onError: (_e, repeated) => errors.push(repeated) })
    // The failures of a watcher on a folder gone (a drive unplugged), straight from its event.
    const fail = () => (w as unknown as { failed(e: unknown): void }).failed(new Error('ENOENT: folder zniknął'))
    const waits: number[] = []
    for (let i = 0; i < 9; i++) {
      const wait = w.nextRestartMs
      waits.push(wait)
      fail()
      // The restart attaches again after its wait – and fails at once, the folder still away.
      await vi.advanceTimersByTimeAsync(wait)
    }
    expect(waits).toEqual([5000, 10_000, 20_000, 40_000, 80_000, 160_000, 300_000, 300_000, 300_000])
    // Nine failures in under half an hour: one line in the log.
    expect(errors).toEqual([0])
    await vi.advanceTimersByTimeAsync(60 * 60_000)
    fail()
    // An hour later: one more, with the number of those not reported since (the other eight).
    expect(errors).toEqual([0, 8])
    w.stop()
  })

  it('nowa awaria po minucie spokojnego działania: w logu od razu, ponowienia znów od 5 s (B113)', async () => {
    const root = tempDir()
    vi.useFakeTimers()
    const errors: number[] = []
    const w = new FolderWatcher(root, () => undefined, { mode: 'native', pollMs: 24 * 60 * 60_000, onError: (_e, repeated) => errors.push(repeated) })
    const fail = () => (w as unknown as { failed(e: unknown): void }).failed(new Error('ENOENT: folder zniknął'))
    fail()
    await vi.advanceTimersByTimeAsync(5000)
    // Attached again – and away again at once: one outage, not logged twice.
    fail()
    expect(errors).toEqual([0])
    await vi.advanceTimersByTimeAsync(10_000)
    // The folder back: two quiet minutes, then a new outage.
    await vi.advanceTimersByTimeAsync(2 * 60_000)
    fail()
    expect(errors).toEqual([0, 1])
    // Its waits from the first again: this one 5 s, the next 10 s.
    expect(w.nextRestartMs).toBe(10_000)
    w.stop()
  })
})

describe('watcher: katalog, który się pojawił (1.4.3, W22)', () => {
  it('nowy katalog roku zgłaszany jako „katalog/” – do sprawdzenia całości', async () => {
    const root = tempDir()
    await fs.mkdir(join(root, 'transactions'), { recursive: true })
    const batches: Array<string[] | null> = []
    const w = new FolderWatcher(root, (p) => batches.push(p), { debounceMs: 60, pollMs: 60_000 })
    w.start()
    await w.ready()
    await new Promise((r) => setTimeout(r, 100))
    const away = join(tempDir(), '2027')
    await fs.mkdir(away)
    await fs.writeFile(join(away, 'a.json'), '{}')
    await fs.rename(away, join(root, 'transactions', '2027')).catch(() => fs.cp(away, join(root, 'transactions', '2027'), { recursive: true }))
    await new Promise((r) => setTimeout(r, 400))
    w.stop()
    expect(batches.flatMap((b) => b ?? [])).toContain('transactions/2027/')
  })
})

describe('watcher po zapisach atomowych', () => {
  it('zmiana pliku z zewnątrz jest wykryta także po wcześniejszych zapisach przez rename (nowy inode)', async () => {
    const root = tempDir()
    const batches: Array<string[] | null> = []
    const w = new FolderWatcher(root, (p) => batches.push(p), { debounceMs: 60, pollMs: 60_000 })
    w.start()
    await w.ready()
    const target = join(root, 'transactions', '2026', 'a.json')
    for (let i = 0; i < 3; i++) {
      await writeFileAtomic(target, `{"v":${i}}`)
      await new Promise((r) => setTimeout(r, 120))
    }
    await new Promise((r) => setTimeout(r, 250))
    batches.length = 0
    await fs.writeFile(target, '{"external":true}')
    await new Promise((r) => setTimeout(r, 600))
    w.stop()
    expect(batches.flatMap((b) => b ?? ['transactions/2026/a.json'])).toContain('transactions/2026/a.json')
  })
})

describe('obecność innych komputerów', () => {
  it('heartbeat innego komputera z ostatnich minut jest widoczny, własny nie', async () => {
    const root = tempDir()
    await writePresence(root, 'LAPTOP', '0.1.0')
    await writePresence(root, 'DESKTOP', '0.1.0')
    const others = await readOtherMachines(root, 'DESKTOP')
    expect(others.map((o) => o.machine)).toEqual(['LAPTOP'])
    // In the tray the heartbeat comes every 5 minutes (N20): seen for 11 minutes after it.
    expect((await readOtherMachines(root, 'DESKTOP', Date.now() + 10 * 60_000)).map((o) => o.machine)).toEqual(['LAPTOP'])
    expect(await readOtherMachines(root, 'DESKTOP', Date.now() + 12 * 60_000)).toEqual([])
    await clearPresence(root, 'LAPTOP')
    expect(await readOtherMachines(root, 'DESKTOP')).toEqual([])
  })

  it('w użyciu = ruch w oknie w ostatnich 10 min (D86); plik wersji sprzed 1.5.3 – w użyciu, póki bije co minutę', async () => {
    const root = tempDir()
    const now = Date.now()
    await writePresence(root, 'LAPTOP', '1.5.3', new Date(now - 60_000).toISOString())
    await writePresence(root, 'TRAY', '1.5.3', new Date(now - 20 * 60_000).toISOString())
    await fs.writeFile(join(root, '.presence', 'OLD.json'), JSON.stringify({ machine: 'OLD', lastSeen: new Date(now).toISOString(), appVersion: '1.5.2' }))
    const seen = async (at: number) => Object.fromEntries((await readOtherMachines(root, 'DESKTOP', at)).map((o) => [o.machine, o.inUse]))
    expect(await seen(now)).toEqual({ LAPTOP: true, TRAY: false, OLD: true })
    // Ten minutes after the laptop's last move: in the tray now; the old version's heartbeat older than 3 min – too.
    expect(await seen(now + 10 * 60_000)).toEqual({ LAPTOP: false, TRAY: false, OLD: false })
  })

  it('nazwa komputera bezpieczna jako nazwa pliku', () => {
    expect(safeMachineName('PC Kapitana/1')).toBe('PC_Kapitana_1')
    expect(safeMachineName('')).toBe('KOMPUTER')
  })
})
