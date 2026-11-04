// Przegląd xhigh N5 (1.15.9) – granica ustawień komputera i konfliktów: nic nie ginie ani nie zostaje zastąpione bez
// wiedzy użytkownika, a ekran mówi to, co jest w config.json, w systemie i na dysku (uwagi 1, 3, 4, 6, 7).
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it, vi } from 'vitest'

// config.json readable but refused for writing (an antivirus holds it – AP-28, US.33): its writes refused while `on`.
const refuse = vi.hoisted(() => ({ on: false }))
vi.mock('../../src/main/datastore/atomic', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/main/datastore/atomic')>()
  return {
    ...mod,
    writeFileAtomic: (...args: Parameters<typeof mod.writeFileAtomic>) =>
      refuse.on && args[0].endsWith('config.json')
        ? Promise.reject(Object.assign(new Error(`EPERM: operation not permitted, rename '${args[0]}.tmp'`), { code: 'EPERM' }))
        : mod.writeFileAtomic(...args)
  }
})

const { ConfigStore, changeTray } = await import('../../src/main/config')
const { loginItemWrites } = await import('../../src/main/loginItem')
const { CONFLICT_CHANGED_TEXT, newestOnShown } = await import('@shared/conflicts')
const { serializeRecord } = await import('@shared/records')
const { exists, freshStore, sampleTransaction } = await import('./helpers')
type LaunchItem = import('../../src/main/loginItem').LaunchItem
type LoginWrite = import('../../src/main/loginItem').LoginWrite
type DataStore = import('../../src/main/datastore/store').DataStore
type Transaction = import('@shared/schema').Transaction

const dirs: string[] = []
async function configDir(): Promise<string> {
  const dir = await fs.mkdtemp(join(tmpdir(), 'fi-config-n5b-'))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  refuse.on = false
  for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
})

const until = async (check: () => Promise<boolean>, ms = 5000) => {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (await check()) return true
    await new Promise((r) => setTimeout(r, 25))
  }
  return false
}
const onDisk = async (dir: string) => JSON.parse(await fs.readFile(join(dir, 'config.json'), 'utf8').catch(() => '{}')) as Record<string, unknown> & { tray?: { launchAtLogin?: boolean }; prefs?: { zoom?: number } }

describe('start z Windows przy zajętym config.json (uwaga 1, T433)', () => {
  const INSTALLED = 'C:\\Users\\Kapitan\\AppData\\Local\\Programs\\Financial Intel\\Financial Intel.exe'
  const PORTABLE = 'D:\\Programy\\Financial-Intel-portable.exe'
  const own: LaunchItem = { name: 'Financial Intel', path: INSTALLED, args: ['--hidden'] }
  const other: LaunchItem = { name: 'Financial Intel (portable)', path: PORTABLE, args: ['--hidden'] }

  it('wyłączenie działa w systemie od razu, choć zapis się nie udał; zapis ponawia się sam; start przy „wyłączone” usuwa tylko własny wpis', async () => {
    const dir = await configDir()
    const config = new ConfigStore(dir, 0, 40)
    await config.load()
    await config.update({ tray: { ...config.get().tray, launchAtLogin: true, autostartAsked: true } })
    // The Run key (an atrapa of Electron's setLoginItemSettings – removing by the entry's name): this exe's and the portable's.
    let runKey: LaunchItem[] = [own, other]
    const setLoginItemSettings = vi.fn((w: LoginWrite) => {
      runKey = runKey.filter((i) => i.name !== w.name)
      if (w.openAtLogin) runKey.push({ name: w.name, path: w.path, args: w.args })
    })
    // As `applyLoginItem` of the installed copy: `launchItems` are this exe's entries.
    const apply = (want: boolean, changed: boolean) => {
      const items = runKey.filter((i) => i.path === INSTALLED)
      for (const w of loginItemWrites({ want, changed, ownProfile: true, windows: true, name: own.name, path: INSTALLED, args: ['--hidden'], items })) setLoginItemSettings(w)
    }
    refuse.on = true
    await expect(changeTray(config, { launchAtLogin: false }, (tray, login) => login && apply(tray.launchAtLogin, true))).rejects.toThrow(/EPERM/)
    // Before: the write's failure threw before the system was told – the app kept starting with Windows.
    expect(setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: false, ...own })
    expect(runKey).toEqual([other])
    expect(config.get().tray.launchAtLogin).toBe(false)
    refuse.on = false
    expect(await until(async () => (await onDisk(dir)).tray?.launchAtLogin === false)).toBe(true)
    // A start with the setting off while the system still has this exe's entry (a switch-off lost by an older version):
    // the entry goes – only this exe's own, the portable copy's (another name) stays.
    runKey = [own, other]
    const next = new ConfigStore(dir)
    expect((await next.load()).tray.launchAtLogin).toBe(false)
    apply(next.get().tray.launchAtLogin, false)
    expect(runKey).toEqual([other])
    // The tray's switch alone never touches the entry.
    setLoginItemSettings.mockClear()
    runKey = [own]
    await changeTray(next, { closeToTray: false }, (tray, login) => login && apply(tray.launchAtLogin, true))
    expect(setLoginItemSettings).not.toHaveBeenCalled()
  })
})

describe('folder kopii przy zajętym config.json (uwaga 4, T434)', () => {
  it('nieudany zapis cofa folder kopii także w pamięci ustawień – ponowiony zapis go nie przywraca; inna zmiana z tej chwili zostaje', async () => {
    const dir = await configDir()
    const config = new ConfigStore(dir, 0, 40)
    await config.load()
    await config.update({ backupDirOverride: 'D:/Kopie' })
    refuse.on = true
    await expect(config.updateOrUndo({ backupDirOverride: 'E:/Nowe', backupDirsBefore: [{ dataDir: 'C:/Dane', dir: 'D:/Kopie' }] })).rejects.toThrow(/EPERM/)
    expect(config.get().backupDirOverride).toBe('D:/Kopie')
    expect(config.get().backupDirsBefore ?? []).toEqual([])
    // Another change meanwhile works and is written later (US.33) – the retry writes it, never the folder taken back.
    await expect(config.update({ importDir: 'C:/Pobrane' })).rejects.toThrow()
    refuse.on = false
    expect(await until(async () => (await onDisk(dir)).importDir === 'C:/Pobrane')).toBe(true)
    const disk = await onDisk(dir)
    expect(disk.backupDirOverride).toBe('D:/Kopie')
    expect(disk.backupDirsBefore ?? []).toEqual([])
    expect((await new ConfigStore(dir).load()).backupDirOverride).toBe('D:/Kopie')
  })

  it('pole zmienione ponownie w trakcie nieudanego zapisu zostaje przy nowszej wartości', async () => {
    const dir = await configDir()
    const config = new ConfigStore(dir, 30, 40)
    await config.load()
    refuse.on = true
    const first = config.updateOrUndo({ backupDirOverride: 'E:/Nowe' })
    // Set again before the first write answered (a slow disk): the newer choice is not taken back with the first.
    const second = config.update({ backupDirOverride: 'F:/Najnowsze' })
    await expect(first).rejects.toThrow()
    await expect(second).rejects.toThrow()
    expect(config.get().backupDirOverride).toBe('F:/Najnowsze')
    refuse.on = false
    expect(await until(async () => (await onDisk(dir)).backupDirOverride === 'F:/Najnowsze')).toBe(true)
  })
})

describe('zmiany czekające na odczyt config.json (uwaga 6, B114)', () => {
  it('odczyt się udał, zapis odrzucony: zmiany z chwili nieczytelnego pliku działają i zostają do zapisu – także przy kolejnym odczycie', async () => {
    const dir = await configDir()
    // Unreadable at the start (a folder stands for a file held by an antivirus).
    await fs.mkdir(join(dir, 'config.json'))
    await fs.writeFile(join(dir, 'config.json', 'blokada'), 'x')
    const config = new ConfigStore(dir, 0, 40)
    await config.load()
    expect(config.loadFailed).toBeTruthy()
    await config.update({ importDir: 'C:/Pobrane' })
    await config.update({ tray: { ...config.get().tray, launchAtLogin: true } })
    // Readable again – but its writes still refused.
    await fs.rm(join(dir, 'config.json'), { recursive: true })
    await fs.writeFile(join(dir, 'config.json'), JSON.stringify({ dataDir: 'D:/OneDrive/FinancialIntel', importDir: null }))
    refuse.on = true
    // Read: done (the settings take effect, the retry of the read stops) – before, it threw and the changes were gone.
    const read = await config.load()
    expect(config.loadFailed).toBeNull()
    expect(read).toMatchObject({ dataDir: 'D:/OneDrive/FinancialIntel', importDir: 'C:/Pobrane', tray: { launchAtLogin: true } })
    // Read once more (as the retry of the read did): the held changes are put on the file's settings again.
    expect(await config.load()).toMatchObject({ dataDir: 'D:/OneDrive/FinancialIntel', importDir: 'C:/Pobrane', tray: { launchAtLogin: true } })
    // A change after the read, its write refused too: it joins them.
    await expect(config.update({ prefs: { ...config.get().prefs, zoom: 1.2 } })).rejects.toThrow()
    expect(await config.load()).toMatchObject({ importDir: 'C:/Pobrane', prefs: { zoom: 1.2 } })
    refuse.on = false
    expect(await until(async () => (await onDisk(dir)).importDir === 'C:/Pobrane')).toBe(true)
    expect(await onDisk(dir)).toMatchObject({ dataDir: 'D:/OneDrive/FinancialIntel', importDir: 'C:/Pobrane', tray: { launchAtLogin: true }, prefs: { zoom: 1.2 } })
    // Written: nothing held any more – a read gives the file's settings as they are.
    await fs.writeFile(join(dir, 'config.json'), JSON.stringify({ dataDir: 'E:/Inny', importDir: null }))
    expect(await config.load()).toMatchObject({ dataDir: 'E:/Inny', importDir: null })
  })
})

/** An operation with sync copies written by another computer (`at` – the copy's stamp and file time). */
async function withCopies(store: DataStore, date: string, copies: Array<{ suffix: string; amount: number; at: string }>) {
  const { entry } = await store.saveRecord('transactions', sampleTransaction({ date, note: 'z domu', amount: -1200 }))
  const copy = async (suffix: string, amount: number, at: string) => {
    const rel = entry.relPath.replace('.json', suffix)
    const abs = join(store.root, ...rel.split('/'))
    await fs.writeFile(abs, serializeRecord('transactions', { ...entry.record, amount, note: `kopia ${suffix} ${amount}`, updatedAt: at, updatedBy: 'LAPTOP' }))
    await fs.utimes(abs, new Date(at), new Date(at))
    return { rel, abs }
  }
  const made = []
  for (const c of copies) made.push(await copy(c.suffix, c.amount, c.at))
  return { entry, copies: made, copy }
}
const amountAt = async (abs: string) => (JSON.parse(await fs.readFile(abs, 'utf8')) as Transaction).amount
const discardedOf = async (store: DataStore, id: string) => {
  const list = (await store.historyList('transactions', id)).filter((e) => e.reason === 'discarded')
  return Promise.all(list.map(async (e) => ((await store.historyRead('transactions', id, e.file)) as Transaction).amount))
}
/** „Zaakceptuj nowsze” as the window sends it: chosen on the versions shown, with the file times known now. */
const bulk = (store: DataStore, plan: ReturnType<typeof newestOnShown>) => store.resolveConflicts(plan.resolutions.map((r) => ({ id: r.id, keep: r.keep, group: r.group, asOf: r.seen })))

describe('„Zaakceptuj nowsze” na wersjach, które okno pokazało (uwaga 3, T431)', () => {
  it('kopia zmieniona na dysku po pokazaniu (watcher jeszcze nie zdążył) – odmowa: nowsza kopia nie idzie do Kosza, okno dostaje ją od razu', async () => {
    const store = await freshStore()
    // The copy older than the original: „keep the original” chosen on it.
    const { entry, copies, copy } = await withCopies(store, '2026-03-16', [{ suffix: '-LAPTOP.json', amount: -1500, at: '2026-03-01T10:00:00.000Z' }])
    const shown = (await store.refresh())!.conflicts
    const plan = newestOnShown(shown, shown, [copies[0]!.rel])
    expect(plan.resolutions.map((r) => r.keep)).toEqual(['canonical'])
    // OneDrive brings a copy newer than everything; no refresh.
    await copy('-LAPTOP.json', -1900, '2099-01-01T10:00:00.000Z')
    const { results, changes } = await bulk(store, plan)
    expect(results).toEqual([{ id: copies[0]!.rel, error: CONFLICT_CHANGED_TEXT }])
    expect(await exists(copies[0]!.abs)).toBe(true)
    expect(await amountAt(copies[0]!.abs)).toBe(-1900)
    expect(await discardedOf(store, entry.record.id)).toEqual([])
    // The window learns the new copy as a change from outside – the card shows it, „Zaakceptuj nowsze” again chooses on it.
    const outside = changes.find((c) => c.origin === 'external')
    expect((outside?.conflicts.find((c) => c.id === copies[0]!.rel)?.copy.record as Transaction).amount).toBe(-1900)
  })

  it('kilka kopii jednego pliku: oryginał przepisany zachowaną kopią nie odmawia dalszych decyzji grupy; zmiana w grupie zostawia całą grupę', async () => {
    const store = await freshStore()
    const newer = { suffix: '-LAPTOP.json', amount: -1500, at: '2099-01-01T10:00:00.000Z' }
    const older = { suffix: ' (1).json', amount: -1300, at: '2026-03-01T10:00:00.000Z' }
    const a = await withCopies(store, '2026-03-16', [newer, older])
    const shown = (await store.refresh())!.conflicts
    const plan = newestOnShown(shown, shown, shown.map((c) => c.id))
    expect(plan.resolutions.map((r) => r.keep)).toEqual(['copy', 'canonical'])
    const { results } = await bulk(store, plan)
    // Before: the second decision of the group saw the original rewritten by the first and was refused.
    expect(results.filter((r) => r.error || r.skipped)).toEqual([])
    expect(await amountAt(join(store.root, ...a.entry.relPath.split('/')))).toBe(-1500)
    expect(await discardedOf(store, a.entry.record.id)).toEqual(expect.arrayContaining([-1300]))
    expect((await store.snapshot()).conflicts).toEqual([])

    // A group whose first decision is refused (its copy changed): the rest of it is left for the user too.
    const b = await withCopies(store, '2026-03-18', [
      { suffix: '-LAPTOP.json', amount: -1400, at: '2026-03-01T10:00:00.000Z' },
      { suffix: ' (1).json', amount: -1350, at: '2026-03-02T10:00:00.000Z' }
    ])
    const shownB = (await store.refresh())!.conflicts
    const planB = newestOnShown(shownB, shownB, shownB.map((c) => c.id))
    expect(planB.resolutions.map((r) => r.keep)).toEqual(['canonical', 'canonical'])
    await b.copy(planB.resolutions[0]!.id.endsWith(' (1).json') ? ' (1).json' : '-LAPTOP.json', -2000, '2099-02-01T10:00:00.000Z')
    const second = await bulk(store, planB)
    expect(second.results.map((r) => [!!r.error, !!r.skipped])).toEqual([
      [true, false],
      [false, true]
    ])
    expect(await discardedOf(store, b.entry.record.id)).toEqual([])
    for (const c of b.copies) expect(await exists(c.abs)).toBe(true)
  })

  it('odmowa w trakcie paczki: zapisy tej paczki idą do okna jako zmiana tego komputera, nie jako zmiana z zewnątrz', async () => {
    const store = await freshStore()
    // First group: the copy newer – kept (the original rewritten). Second: its copy changes after it was shown.
    const x = await withCopies(store, '2026-03-16', [{ suffix: '-LAPTOP.json', amount: -1500, at: '2099-01-01T10:00:00.000Z' }])
    const y = await withCopies(store, '2026-03-20', [{ suffix: '-LAPTOP.json', amount: -1700, at: '2026-03-01T10:00:00.000Z' }])
    const shown = (await store.refresh())!.conflicts
    const plan = newestOnShown(shown, shown, shown.map((c) => c.id))
    expect(plan.resolutions.map((r) => [r.id, r.keep])).toEqual([
      [x.copies[0]!.rel, 'copy'],
      [y.copies[0]!.rel, 'canonical']
    ])
    await y.copy('-LAPTOP.json', -2100, '2099-03-01T10:00:00.000Z')
    const { results, changes } = await bulk(store, plan)
    expect(results.map((r) => !!r.error)).toEqual([false, true])
    const outside = changes.filter((c) => c.origin === 'external')
    expect(outside).toHaveLength(1)
    // The kept copy of the first group is this computer's own write: never in the change from outside (the window would
    // take it as another computer's record – „ostatnio zapisał” and the questions about remote changes).
    expect(outside[0]!.upserts.map((u) => u.entry.record.id)).not.toContain(x.entry.record.id)
    const own = changes.filter((c) => c.origin !== 'external').flatMap((c) => c.upserts.map((u) => u.entry.record))
    expect(own.find((r) => r.id === x.entry.record.id)).toMatchObject({ amount: -1500 })
    expect(changes.indexOf(outside[0]!)).toBeGreaterThan(changes.findIndex((c) => c.upserts.some((u) => u.entry.record.id === x.entry.record.id)))
  })
})
