// adapted from ICTTJ tests/fs/transfer.test.ts @ 84a8339 (section "kopie zapasowe")
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DAILY_KEEP, IMPORT_KEEP, MANUAL_KEEP, importBackup, listBackups, manualBackup, runBackups } from '../../src/main/datastore/backup'
import { DataStore } from '../../src/main/datastore/store'
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
    const file = await manualBackup(store.root, store.backupsDir)
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
    const file = await runBackups(store.root, backups, now)
    expect(file).toBe(join(backups, 'daily', '2026-10-16.zip'))
    // The second start the same day: no new backup.
    expect(await runBackups(store.root, backups, new Date(now.getTime() + 3600_000))).toBeNull()
    expect(await fs.readdir(join(backups, 'daily'))).toEqual(['2026-10-16.zip'])

    const names = [...(await readZip(file!)).keys()].sort()
    expect(names).toEqual(['fi.json', 'months/2026-03.json', `transactions/2026/2026-03-16_${t.id}.json`])
    // A backup of a backup never: the next day's ZIP does not hold the first one.
    const next = await runBackups(store.root, backups, new Date(now.getTime() + DAY))
    expect([...(await readZip(next!)).keys()].some((k) => k.startsWith('backups/'))).toBe(false)
  })

  it(`zostaje ${DAILY_KEEP} najnowszych kopii dziennych`, async () => {
    const store = await freshStore()
    const backups = join(store.root, 'backups')
    const start = Date.parse('2026-01-01T09:00:00Z')
    for (let d = 0; d < DAILY_KEEP + 5; d++) await runBackups(store.root, backups, new Date(start + d * DAY))
    const daily = (await fs.readdir(join(backups, 'daily'))).sort()
    expect(DAILY_KEEP).toBe(30)
    expect(daily).toHaveLength(DAILY_KEEP)
    expect(daily[0]).toBe('2026-01-06.zip')
    expect(daily.at(-1)).toBe('2026-02-04.zip')
  })

  it(`kopia ręczna: backups/manual, zostaje ${MANUAL_KEEP}; folder kopii poza folderem danych`, async () => {
    const store = await freshStore()
    await store.saveRecord('transactions', sampleTransaction())
    const backups = join(store.root, '..', 'kopie-tego-komputera')
    store.setBackupDir(backups)
    expect(store.backupsDir).toBe(backups)
    const files: string[] = []
    for (let i = 0; i < MANUAL_KEEP + 2; i++) files.push(await manualBackup(store.root, backups, new Date(Date.parse('2026-10-16T10:00:00Z') + i * 60_000)))
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
    await new DataStore(root, { machineName: 'X', now: () => '2026-10-15T08:00:00.000Z' }).open()
    await runBackups(root, backups, new Date('2026-10-16T09:00:00Z'))
    await new Promise((r) => setTimeout(r, 20))
    await manualBackup(root, backups, new Date('2026-10-16T10:00:00Z'))
    // Not a backup: stray files are left out.
    await fs.writeFile(join(backups, 'daily', 'notatka.txt'), 'x')
    await fs.writeFile(join(backups, 'daily', '.2026-10-17.zip.tmp-1'), 'x')
    const list = await listBackups(backups)
    expect(list.map((b) => b.kind).sort()).toEqual(['daily', 'manual', 'pre-migration'])
    expect(list[0]?.kind).toBe('manual')
    expect(list.find((b) => b.kind === 'pre-migration')?.name).toBe('20261015T080000Z_v0-v1.zip')
    for (const b of list) expect(b.bytes).toBeGreaterThan(0)
    expect(await listBackups(join(root, 'nie-ma'))).toEqual([])
  })

  it('kopia przed importem: ZIP danych w backups/pre-import, 10 ostatnich (spec, „Kopie zapasowe”)', async () => {
    const store = await freshStore()
    await store.saveRecord('transactions', sampleTransaction({ note: 'przed importem' }))
    const files: string[] = []
    for (let i = 0; i < IMPORT_KEEP + 2; i++) files.push(await importBackup(store.root, store.backupsDir, new Date(Date.UTC(2026, 9, 17, 8, 0, i))))
    const left = (await fs.readdir(join(store.backupsDir, 'pre-import'))).sort()
    expect(left).toHaveLength(IMPORT_KEEP)
    expect(files.at(-1)!.endsWith(left.at(-1)!)).toBe(true)
    const zipped = await readZip(files.at(-1)!)
    expect([...zipped.keys()].some((k) => k.startsWith('transactions/'))).toBe(true)
    expect((await listBackups(store.backupsDir)).filter((b) => b.kind === 'pre-import')).toHaveLength(IMPORT_KEEP)
  })
})
