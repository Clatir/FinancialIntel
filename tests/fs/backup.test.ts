// adapted from ICTTJ tests/fs/transfer.test.ts @ 84a8339 (section "kopie zapasowe")
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DAILY_KEEP, IMPORT_KEEP, MANUAL_KEEP, WEEKLY_KEEP, importBackup, listBackups, manualBackup, runBackups } from '../../src/main/datastore/backup'
import { DataStore, backupFolderName } from '../../src/main/datastore/store'
import { freshStore, readZip, sampleMonth, sampleTransaction } from './helpers'

const DAY = 86400_000

describe('kopie zapasowe', () => {
  it('kopia zawiera tylko dane (fi.json i rekordy), nie inne pliki w folderze', async () => {
    const store = await freshStore()
    await store.saveRecord('transactions', sampleTransaction())
    await fs.mkdir(join(store.root, 'kopie'), { recursive: true })
    await fs.writeFile(join(store.root, 'kopie', 'stara.zip'), 'zip')
    await fs.writeFile(join(store.root, 'Financial-Intel-2026-10-01.zip'), 'zip')
    await fs.writeFile(join(store.root, 'transactions', 'notatka.txt'), 'x')
    const file = await manualBackup(store, store.backupsDir)
    const names = [...(await readZip(file)).keys()].sort()
    expect(names.length).toBe(2)
    expect(names[0]).toBe('fi.json')
    expect(names[1]).toMatch(/^transactions\/\d{4}\/.+\.json$/)
  })

  it('kopia dzienna: backups/daily/RRRR-MM-DD.zip raz na dzień, z danymi bez backups/, .history/ i .presence/', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    await store.saveRecord('transactions', t)
    await store.saveRecord('transactions', { ...t, note: 'zmiana' }) // a version in .history/
    await store.saveRecord('months', sampleMonth('2026-03'))
    await fs.mkdir(join(store.root, '.presence'), { recursive: true })
    await fs.writeFile(join(store.root, '.presence', 'PC.json'), '{}')
    const backups = store.backupsDir
    const now = new Date('2026-10-16T09:00:00Z')
    const file = await runBackups(store, backups, now)
    expect(file).toBe(join(backups, 'daily', '2026-10-16.zip'))
    // The second start the same day: no new backup.
    expect(await runBackups(store, backups, new Date(now.getTime() + 3600_000))).toBeNull()
    expect(await fs.readdir(join(backups, 'daily'))).toEqual(['2026-10-16.zip'])

    const names = [...(await readZip(file!)).keys()].sort()
    expect(names).toEqual(['fi.json', 'months/2026-03.json', `transactions/2026/2026-03-16_${t.id}.json`])
    // A backup of a backup never: the next day's ZIP does not hold the first one.
    const next = await runBackups(store, backups, new Date(now.getTime() + DAY))
    expect([...(await readZip(next!)).keys()].some((k) => k.startsWith('backups/'))).toBe(false)
  })

  it(`zostaje ${DAILY_KEEP} najnowszych kopii dziennych i ${WEEKLY_KEEP} tygodniowych (D84 C4)`, async () => {
    const store = await freshStore()
    const backups = join(store.root, 'backups')
    const start = Date.parse('2026-01-01T09:00:00Z')
    for (let d = 0; d < 70; d++) await runBackups(store, backups, new Date(start + d * DAY))
    const daily = (await fs.readdir(join(backups, 'daily'))).sort()
    expect([DAILY_KEEP, WEEKLY_KEEP]).toEqual([14, 8])
    expect(daily).toHaveLength(DAILY_KEEP)
    expect(daily[0]).toBe('2026-02-26.zip')
    expect(daily.at(-1)).toBe('2026-03-11.zip')
    // One a week (ISO), the last 8: 1 January 2026 is a Thursday of week 1, 11 March in week 11.
    expect((await fs.readdir(join(backups, 'weekly'))).sort()).toEqual(['2026-W04.zip', '2026-W05.zip', '2026-W06.zip', '2026-W07.zip', '2026-W08.zip', '2026-W09.zip', '2026-W10.zip', '2026-W11.zip'])
  })

  it('pierwsza kopia tygodniowa z dziennych sprzed 1.4.3: najnowsza dzienna każdego tygodnia, 30 dziennych przycięte do 14', async () => {
    const store = await freshStore()
    const backups = join(store.root, 'backups')
    await fs.mkdir(join(backups, 'daily'), { recursive: true })
    // 30 daily ones of 1.4.2 (16 September – 15 October 2026), each with its date inside.
    for (let d = 0; d < 30; d++) {
      const day = new Date(Date.parse('2026-09-16T09:00:00Z') + d * DAY).toISOString().slice(0, 10)
      await fs.writeFile(join(backups, 'daily', `${day}.zip`), day)
    }
    await runBackups(store, backups, new Date('2026-10-16T09:00:00Z'))
    const weekly = (await fs.readdir(join(backups, 'weekly'))).sort()
    // 16 September (Wednesday, W38) … 15 October (Thursday, W42); 16 October is in W42 – that week from today's backup.
    expect(weekly).toEqual(['2026-W38.zip', '2026-W39.zip', '2026-W40.zip', '2026-W41.zip', '2026-W42.zip'])
    expect(await fs.readFile(join(backups, 'weekly', '2026-W38.zip'), 'utf8')).toBe('2026-09-20')
    expect(await fs.readFile(join(backups, 'weekly', '2026-W41.zip'), 'utf8')).toBe('2026-10-11')
    expect((await readZip(join(backups, 'weekly', '2026-W42.zip'))).has('fi.json')).toBe(true)
    const daily = (await fs.readdir(join(backups, 'daily'))).sort()
    expect(daily).toHaveLength(DAILY_KEEP)
    expect(daily.at(-1)).toBe('2026-10-16.zip')
  })

  it(`kopia ręczna: backups/manual, zostaje ${MANUAL_KEEP}; folder kopii poza folderem danych – osobny podfolder na folder danych (B115)`, async () => {
    const store = await freshStore()
    await store.saveRecord('transactions', sampleTransaction())
    const chosen = join(store.root, '..', 'kopie-tego-komputera')
    store.setBackupDir(chosen)
    // Two data folders with one backup folder of this computer: each its own subfolder – never each other's rotation.
    const backups = join(chosen, backupFolderName(store.root))
    expect(store.backupsDir).toBe(backups)
    expect(backupFolderName(store.root)).toMatch(/^dane-[0-9a-f]{8}$/)
    expect(backupFolderName(join(store.root, '..', 'inne', 'dane'))).not.toBe(backupFolderName(store.root))
    const files: string[] = []
    for (let i = 0; i < MANUAL_KEEP + 2; i++) files.push(await manualBackup(store, backups, new Date(Date.parse('2026-10-16T10:00:00Z') + i * 60_000)))
    const left = (await fs.readdir(join(backups, 'manual'))).sort()
    expect(left).toHaveLength(MANUAL_KEEP)
    expect(left.at(-1)).toMatch(/^2026-10-16_\d{6}\.zip$/)
    expect(files.at(-1)!.endsWith(left.at(-1)!)).toBe(true)
    expect([...(await readZip(files.at(-1)!)).keys()]).toContain('fi.json')
    store.setBackupDir(null)
    expect(store.backupsDir).toBe(join(store.root, 'backups'))
  })

  it('listBackups: kopie dzienne, ręczne i sprzed migracji, najnowsze najpierw', async () => {
    const root = (await freshStore()).root
    const backups = join(root, 'backups')
    // A folder in the old format: the migration makes the pre-migration backup.
    const fiPath = join(root, 'fi.json')
    const raw = JSON.parse(await fs.readFile(fiPath, 'utf8')) as Record<string, unknown>
    delete raw.schemaVersion
    await fs.writeFile(fiPath, JSON.stringify(raw))
    const store = new DataStore(root, { machineName: 'X', now: () => '2026-10-15T08:00:00.000Z' })
    await store.open()
    await runBackups(store, backups, new Date('2026-10-16T09:00:00Z'))
    await new Promise((r) => setTimeout(r, 20))
    await manualBackup(store, backups, new Date('2026-10-16T10:00:00Z'))
    // Not a backup: stray files are left out – a ZIP of the user's own under another name too, never rotated (B121).
    await fs.writeFile(join(backups, 'daily', 'notatka.txt'), 'x')
    await fs.writeFile(join(backups, 'daily', '.2026-10-17.zip.tmp-1'), 'x')
    await fs.writeFile(join(backups, 'daily', 'moja-kopia.zip'), 'x')
    const list = await listBackups(backups)
    expect(list.map((b) => b.kind).sort()).toEqual(['daily', 'manual', 'pre-migration', 'weekly'])
    expect(list[0]?.kind).toBe('manual')
    expect(list.find((b) => b.kind === 'pre-migration')?.name).toBe('20261015T080000Z_v0-v1.zip')
    for (const b of list) expect(b.bytes).toBeGreaterThan(0)
    expect(await listBackups(join(root, 'nie-ma'))).toEqual([])
  })

  it('kopia przed importem: ZIP danych w backups/pre-import, 10 ostatnich (spec, „Kopie zapasowe”)', async () => {
    const store = await freshStore()
    await store.saveRecord('transactions', sampleTransaction({ note: 'przed importem' }))
    const files: string[] = []
    for (let i = 0; i < IMPORT_KEEP + 2; i++) files.push(await importBackup(store, store.backupsDir, new Date(Date.UTC(2026, 9, 17, 8, 0, i))))
    const left = (await fs.readdir(join(store.backupsDir, 'pre-import'))).sort()
    expect(left).toHaveLength(IMPORT_KEEP)
    expect(files.at(-1)!.endsWith(left.at(-1)!)).toBe(true)
    const zipped = await readZip(files.at(-1)!)
    expect([...zipped.keys()].some((k) => k.startsWith('transactions/'))).toBe(true)
    expect((await listBackups(store.backupsDir)).filter((b) => b.kind === 'pre-import')).toHaveLength(IMPORT_KEEP)
  })
})
