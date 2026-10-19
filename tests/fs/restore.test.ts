import { promises as fs } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import yazl from 'yazl'
import { describe, expect, it } from 'vitest'
import { manualBackup } from '../../src/main/datastore/backup'
import { extractZip, readBackupZip, unpackBackup } from '../../src/main/datastore/restore'
import type { DataStore } from '../../src/main/datastore/store'
import type { Collection } from '../../src/shared/paths'
import { exists, freshStore, sampleMonth, sampleTransaction, tempDir } from './helpers'

const recordOf = async (store: DataStore, c: Collection, id: string) => (await store.snapshot()).records[c].find((e) => e.record.id === id)?.record as Record<string, unknown> | undefined

/** A ZIP of these entries (text); `renames` swap a name's prefix in the bytes – a name yazl would refuse. */
async function zipOf(file: string, entries: Record<string, string>, renames: Array<[string, string]> = []): Promise<string> {
  const zip = new yazl.ZipFile()
  for (const [name, text] of Object.entries(entries)) zip.addBuffer(Buffer.from(text, 'utf8'), name)
  zip.end()
  const chunks: Buffer[] = []
  for await (const c of zip.outputStream) chunks.push(c as Buffer)
  let bytes = Buffer.concat(chunks)
  for (const [from, to] of renames) bytes = Buffer.from(bytes.toString('latin1').split(from).join(to), 'latin1')
  await fs.writeFile(file, bytes)
  return file
}

describe('odzyskanie z kopii (1.6.0, F3)', () => {
  it('podgląd: zmienione i usunięte od kopii, dodane po niej tylko policzone, ustawienia; wybrane wpisy i ustawienia wracają jako nowa wersja z historią', async () => {
    const store = await freshStore()
    const a = sampleTransaction({ counterparty: 'Biedronka' })
    const b = sampleTransaction({ counterparty: 'Orlen', date: '2026-03-17' })
    await store.saveRecord('transactions', a)
    await store.saveRecord('transactions', b)
    await store.saveRecord('months', sampleMonth('2026-03', { salary: 300000 }))
    const zip = await manualBackup(store, store.backupsDir)
    // After the backup: a changed, b deleted, c added, the plan untouched, the settings changed.
    await store.saveRecord('transactions', { ...((await recordOf(store, 'transactions', a.id)) as typeof a), counterparty: 'Lidl', amount: -999 })
    await store.deleteRecord('transactions', b.id)
    const c = sampleTransaction({ counterparty: 'Po kopii' })
    await store.saveRecord('transactions', c)
    const fi = (await store.snapshot()).fi
    await store.saveSettings({ ...fi, settings: { ...fi.settings, shipName: 'Inny okręt' } })

    const data = await readBackupZip(zip)
    expect([data.invalid, data.tooNew, data.fi?.settings.shipName]).toEqual([[], false, fi.settings.shipName])
    const preview = await store.compareBackup(data)
    expect(preview.items.map((i) => [i.collection, i.id, i.change])).toEqual([
      ['transactions', a.id, 'changed'],
      ['transactions', b.id, 'deleted']
    ])
    expect(preview).toMatchObject({ added: { transactions: 1 }, settings: { changed: true }, total: 3, invalid: 0, tooNew: false })

    const picks = preview.items.map((i) => ({ kind: i.collection, record: data.records[i.collection].find((r) => r.id === i.id)! }))
    const res = await store.restoreVersions(picks, data.fi)
    expect(res.done).toEqual([a.id, b.id])
    expect(res.failed).toEqual([])
    expect(res.fi?.settings.shipName).toBe(fi.settings.shipName)
    expect(res.change?.upserts.map((u) => u.entry.record.id).sort()).toEqual([a.id, b.id].sort())
    expect(await recordOf(store, 'transactions', a.id)).toMatchObject({ counterparty: 'Biedronka', amount: -4599 })
    expect(await recordOf(store, 'transactions', b.id)).toMatchObject({ counterparty: 'Orlen' })
    // What it replaced is in the history ('restore'); what was added after the backup stays.
    const kept = (await store.historyList('transactions', a.id)).filter((e) => e.reason === 'restore')
    expect(kept).toHaveLength(1)
    expect(await store.historyRead('transactions', a.id, kept[0]!.file)).toMatchObject({ counterparty: 'Lidl' })
    expect((await store.historyList('fi', fi.id)).some((e) => e.reason === 'restore')).toBe(true)
    expect(await recordOf(store, 'transactions', c.id)).toMatchObject({ counterparty: 'Po kopii' })
    // Compared again: nothing to take back but what was added.
    const again = await store.compareBackup(data)
    expect([again.items, again.added, again.settings.changed]).toEqual([[], { transactions: 1 }, false])
  })

  it('wpis, którego plik zajmuje inny wpis (plan tego miesiąca), mówi dlaczego – reszta się zapisuje', async () => {
    const store = await freshStore()
    const plan = sampleMonth('2026-03', { salary: 300000 })
    const t = sampleTransaction()
    await store.saveRecord('months', plan)
    await store.saveRecord('transactions', t)
    const data = await readBackupZip(await manualBackup(store, store.backupsDir))
    await store.deleteRecord('months', plan.id)
    await store.saveRecord('months', sampleMonth('2026-03', { salary: 100000 }))
    await store.deleteRecord('transactions', t.id)
    const preview = await store.compareBackup(data)
    expect(preview.items.map((i) => [i.collection, i.change])).toEqual([
      ['transactions', 'deleted'],
      ['months', 'deleted']
    ])
    const res = await store.restoreVersions(
      preview.items.map((i) => ({ kind: i.collection, record: data.records[i.collection].find((r) => r.id === i.id)! })),
      null
    )
    expect(res.done).toEqual([t.id])
    expect(res.failed).toEqual([{ id: plan.id, error: expect.stringContaining('należy do innego wpisu') }])
    expect(res.fi).toBeNull()
  })

  it('ustawienia, których nie da się zapisać, mówią dlaczego – odzyskane wpisy zostają i idą do okna', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    await store.saveRecord('transactions', t)
    const data = await readBackupZip(await manualBackup(store, store.backupsDir))
    await store.deleteRecord('transactions', t.id)
    const broken = { ...data.fi!, settings: 'zepsute' } as unknown as typeof data.fi
    const res = await store.restoreVersions([{ kind: 'transactions', record: data.records.transactions[0]! }], broken)
    expect(res.done).toEqual([t.id])
    expect(res.fi).toBeNull()
    expect(res.failed).toEqual([{ id: 'fi.json', error: expect.any(String) }])
    expect(res.change?.upserts.map((u) => u.entry.record.id)).toEqual([t.id])
  })

  it('rozpakowanie bezpieczne: tylko pliki danych, ścieżka z ../ odrzuca całą kopię', async () => {
    const dir = tempDir()
    const fiText = JSON.stringify({ x: 1 })
    const good = await zipOf(join(dir, 'ok.zip'), { 'fi.json': fiText, 'transactions/2026/2026-03-16_A.json': '{}', 'notatka.txt': 'x', 'backups/stara.zip': 'zip' })
    const out = join(dir, 'out')
    expect(await extractZip(good, out)).toBe(2)
    expect(await exists(join(out, 'fi.json'))).toBe(true)
    expect(await exists(join(out, 'notatka.txt'))).toBe(false)
    expect(await exists(join(out, 'backups'))).toBe(false)
    const evil = await zipOf(join(dir, 'zly.zip'), { 'fi.json': fiText, 'aa/zly.json': '{}' }, [['aa/zly.json', '../zly.json']])
    await expect(extractZip(evil, join(dir, 'out2'))).rejects.toThrow('niedozwolone ścieżki')
    expect(await exists(join(dir, 'zly.json'))).toBe(false)
  })

  it('cały folder: kopia rozpakowana do nowego folderu obok („… – kopia z …”, kolejny z numerem), bieżący nietknięty; kopia bez fi.json – nic nie zostaje', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    await store.saveRecord('transactions', t)
    const zip = await manualBackup(store, store.backupsDir)
    await store.saveRecord('transactions', sampleTransaction({ counterparty: 'Po kopii' }))
    const before = (await fs.readdir(join(store.root, 'transactions', '2026'))).sort()
    const at = Date.parse('2026-10-18T06:30:00Z')
    const first = await unpackBackup(zip, store.root, at)
    expect(first).toBe(join(dirname(store.root), `${basename(store.root)} – kopia z 2026-10-18 08.30`))
    expect(await fs.readdir(join(first, 'transactions', '2026'))).toEqual([`2026-03-16_${t.id}.json`])
    expect(await exists(join(first, 'fi.json'))).toBe(true)
    expect((await fs.readdir(join(store.root, 'transactions', '2026'))).sort()).toEqual(before)
    expect(await unpackBackup(zip, store.root, at)).toBe(`${first} (2)`)

    const parent = dirname(store.root)
    const noSettings = await zipOf(join(tempDir(), 'bez.zip'), { 'transactions/2026/2026-03-16_A.json': '{}' })
    await expect(unpackBackup(noSettings, store.root, at + 60_000)).rejects.toThrow('nie ma ustawień')
    expect((await fs.readdir(parent)).filter((n) => n.includes('08.31') || n.includes('.tmp-'))).toEqual([])
  })
})
