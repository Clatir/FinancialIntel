import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import yauzl from 'yauzl'
import { DataStore } from '../../src/main/datastore/store'
import { RefreshQueue } from '../../src/main/datastore/watch'
import { writeZipFile, type ZipSource } from '../../src/main/datastore/zip'
import { writeFileAtomic } from '../../src/main/datastore/atomic'
import { recordRelPath } from '@shared/paths'
import { serializeRecord } from '@shared/records'
import { freshStore, readZip, sampleTransaction, tempDir } from './helpers'

afterEach(() => vi.restoreAllMocks())

type Spied = { loadFile(rel: string): Promise<unknown>; listDataFiles(): Promise<string[]> }
const spyOn = (name: keyof Spied) => vi.spyOn(DataStore.prototype as unknown as Spied, name)
const write = (store: DataStore, rel: string, data: unknown) => writeFileAtomic(join(store.root, ...rel.split('/')), serializeRecord('transactions', data as never))

describe('kolejka odświeżeń folderu (1.4.3, W21)', () => {
  it('jedno odświeżenie naraz; zaległe łączą się w jedno, pełne zastępuje ścieżki', async () => {
    const runs: Array<string[] | undefined> = []
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const q = new RefreshQueue(async (paths) => {
      runs.push(paths)
      if (runs.length === 1) await gate
    })
    const waits = [q.request(['a.json']), q.request(['b.json']), q.request(['c.json', 'b.json'])]
    await new Promise((r) => setTimeout(r, 5))
    expect(runs).toEqual([['a.json']])
    release()
    await Promise.all(waits)
    expect(runs).toEqual([['a.json'], ['b.json', 'c.json']])
    runs.length = 0
    let again!: () => void
    const held = new Promise<void>((r) => (again = r))
    const q2 = new RefreshQueue(async (paths) => {
      runs.push(paths)
      if (runs.length === 1) await held
    })
    const more = [q2.request(['a.json']), q2.request(['b.json']), q2.request(), q2.request(['c.json'])]
    again()
    await Promise.all(more)
    expect(runs).toEqual([['a.json'], undefined])
  })

  it('nieudane odświeżenie zgłasza błąd czekającym, kolejne i tak się wykonują', async () => {
    const runs: string[][] = []
    const q = new RefreshQueue(async (paths) => {
      runs.push(paths ?? [])
      if (paths?.includes('zly.json')) throw new Error('dysk')
    })
    await expect(q.request(['zly.json'])).rejects.toThrow('dysk')
    await q.request(['dobry.json'])
    expect(runs).toEqual([['zly.json'], ['dobry.json']])
  })
})

describe('pełna kontrola folderu poza kolejką zapisów (1.4.3, W21)', () => {
  it('zapis w trakcie listowania nie czeka; zmiana z zewnątrz w zmianie, własny zapis nie wraca jako obcy', async () => {
    const store = await freshStore()
    for (let i = 0; i < 30; i++) await store.saveRecord('transactions', sampleTransaction({ date: `2026-04-${String(i + 1).padStart(2, '0')}` }))
    const external = sampleTransaction({ date: '2026-05-01', note: 'z zewnątrz' })
    await write(store, recordRelPath('transactions', external), external)
    const order: string[] = []
    const full = store.refresh().then((c) => (order.push('kontrola'), c))
    await store.saveRecord('transactions', sampleTransaction({ date: '2026-05-02', note: 'moja' })).then(() => order.push('zapis'))
    const change = await full
    expect(order).toEqual(['zapis', 'kontrola'])
    expect(change?.upserts.map((u) => (u.entry.record as { note: string }).note)).toEqual(['z zewnątrz'])
    const notes = (await store.snapshot()).records.transactions.map((e) => e.record.note)
    expect(notes).toContain('moja')
    expect(notes).toContain('z zewnątrz')
    // Nothing changed since: nothing read again, no change.
    const loads = spyOn('loadFile')
    expect(await store.refresh()).toBeNull()
    expect(loads).not.toHaveBeenCalled()
  })
})

describe('zdarzenie katalogu odświeża tylko ten katalog (1.4.3, W22)', () => {
  it('nowy i usunięty plik w katalogu roku: czytany tylko nowy, nie cały folder', async () => {
    const store = await freshStore()
    for (let i = 0; i < 20; i++) await store.saveRecord('transactions', sampleTransaction({ date: `2026-03-${String(i + 1).padStart(2, '0')}` }))
    const added = sampleTransaction({ date: '2026-03-25', note: 'z laptopa' })
    await write(store, recordRelPath('transactions', added), added)
    const loads = spyOn('loadFile')
    const listing = spyOn('listDataFiles')
    const change = await store.refresh(['transactions/2026'])
    expect(change?.upserts.map((u) => (u.entry.record as { note: string }).note)).toEqual(['z laptopa'])
    expect(loads).toHaveBeenCalledTimes(1)
    expect(listing).not.toHaveBeenCalled()
    // Removed outside: only the directory reported (Windows reports the file too – either is enough).
    await fs.rm(join(store.root, ...recordRelPath('transactions', added).split('/')))
    const removal = await store.refresh(['transactions/2026'])
    expect(removal?.removals).toEqual([{ collection: 'transactions', id: added.id }])
    expect(listing).not.toHaveBeenCalled()
  })

  it('nowy katalog roku (z plikami) i usunięty katalog: rekordy przybywają i znikają', async () => {
    const store = await freshStore()
    await store.saveRecord('transactions', sampleTransaction())
    const next = [sampleTransaction({ date: '2027-01-02' }), sampleTransaction({ date: '2027-02-03' })]
    for (const t of next) await write(store, recordRelPath('transactions', t), t)
    const change = await store.refresh(['transactions'])
    expect(change?.upserts.map((u) => u.entry.record.id).sort()).toEqual(next.map((t) => t.id).sort())
    await fs.rm(join(store.root, 'transactions', '2027'), { recursive: true })
    const gone = await store.refresh(['transactions/2027'])
    expect(gone?.removals.map((r) => r.id).sort()).toEqual(next.map((t) => t.id).sort())
    expect((await store.snapshot()).records.transactions).toHaveLength(1)
  })

  it('ścieżka poza kolekcjami i plik niebędący JSON-em: bez pełnego przeskanowania', async () => {
    const store = await freshStore()
    await fs.mkdir(join(store.root, 'kopie'), { recursive: true })
    await fs.writeFile(join(store.root, 'kopie', 'x.json'), '{}')
    await fs.writeFile(join(store.root, 'transactions', 'notatka.txt'), 'x')
    const listing = spyOn('listDataFiles')
    const loads = spyOn('loadFile')
    expect(await store.refresh(['kopie', 'transactions/notatka.txt'])).toBeNull()
    expect(listing).not.toHaveBeenCalled()
    expect(loads).not.toHaveBeenCalled()
  })
})

describe('konflikty bez przeskanowania folderu (1.4.3, W23)', () => {
  it('„Zachowaj nowsze” dla wielu: jedna zmiana, grupa z nieudaną kopią zostaje', async () => {
    const store = await freshStore()
    const a = (await store.saveRecord('transactions', sampleTransaction({ note: 'A' }))).entry
    const b = (await store.saveRecord('transactions', sampleTransaction({ date: '2026-03-17', note: 'B' }))).entry
    const copyA = a.relPath.replace('.json', '-LAPTOP.json')
    const copyB1 = b.relPath.replace('.json', '-LAPTOP.json')
    const copyB2 = b.relPath.replace('.json', ' (1).json')
    await fs.writeFile(join(store.root, copyA), JSON.stringify({ ...a.record, note: 'A z laptopa' }, null, 2))
    await fs.writeFile(join(store.root, copyB1), '{ uszkodzona')
    await fs.writeFile(join(store.root, copyB2), JSON.stringify({ ...b.record, note: 'B stara' }, null, 2))
    await store.refresh()
    const listing = spyOn('listDataFiles')
    const { results, change } = await store.resolveConflicts([
      { id: copyA, keep: 'copy', group: a.relPath },
      { id: copyB1, keep: 'copy', group: b.relPath },
      { id: copyB2, keep: 'canonical', group: b.relPath }
    ])
    expect(results.map((r) => [r.id, !!r.error, !!r.skipped])).toEqual([
      [copyA, false, false],
      [copyB1, true, false],
      [copyB2, false, true]
    ])
    expect(listing).not.toHaveBeenCalled()
    expect(change?.upserts.map((u) => (u.entry.record as { note: string }).note)).toEqual(['A z laptopa'])
    expect(change?.conflicts.map((c) => c.id).sort()).toEqual([copyB2, copyB1].sort())
    // One conflict, as the buttons do it: the copy to the bin, no rescan either.
    const one = await store.resolveConflict(copyB2, 'canonical')
    expect(one?.conflicts.map((c) => c.id)).toEqual([copyB1])
    expect(listing).not.toHaveBeenCalled()
  })
})

describe('otwarcie folderu bez osobnego stat (1.4.3, W24)', () => {
  it('każdy plik czytany jednym otwarciem; pliki tymczasowe z pierwszego przejścia', async () => {
    const store = await freshStore()
    for (let i = 0; i < 10; i++) await store.saveRecord('transactions', sampleTransaction({ date: `2026-04-${String(i + 1).padStart(2, '0')}` }))
    const stats = vi.spyOn(fs, 'stat')
    const again = new DataStore(store.root, { machineName: 'DRUGI' })
    await again.open()
    expect(stats.mock.calls.filter(([p]) => String(p).includes('transactions'))).toEqual([])
    expect((await again.snapshot()).records.transactions).toHaveLength(10)
  })
})

/** The number of entries a ZIP reader sees, and the content of one entry. */
async function zipEntries(file: string, name: string): Promise<{ count: number; content: string | null }> {
  const zip = await new Promise<yauzl.ZipFile>((resolve, reject) => yauzl.open(file, { lazyEntries: true }, (e, z) => (e || !z ? reject(e) : resolve(z))))
  let content: string | null = null
  await new Promise<void>((resolve, reject) => {
    zip.on('error', reject)
    zip.on('end', () => resolve())
    zip.on('entry', (entry: yauzl.Entry) => {
      if (entry.fileName !== name) return zip.readEntry()
      zip.openReadStream(entry, (err, stream) => {
        if (err || !stream) return reject(err)
        const chunks: Buffer[] = []
        stream.on('data', (c: Buffer) => chunks.push(c))
        stream.on('end', () => {
          content = Buffer.concat(chunks).toString('utf8')
          zip.readEntry()
        })
      })
    })
    zip.readEntry()
  })
  return { count: zip.entryCount, content }
}

describe('kopie ZIP w jednym przejściu (1.4.3, W7)', () => {
  it('ponad 65 535 plików: ZIP64, czytelny dla czytnika ZIP, treść i kompresja się zgadzają', async () => {
    const out = join(tempDir(), 'duza.zip')
    const long = JSON.stringify({ note: 'x'.repeat(2000) })
    const items: ZipSource[] = Array.from({ length: 70_000 }, (_, i) => ({
      name: `transactions/${String(i).padStart(6, '0')}.json`,
      read: () => ({ data: Buffer.from(i % 1000 === 0 ? long : `{"n":${i}}`), mtime: new Date('2026-10-18T10:00:00Z') })
    }))
    const res = await writeZipFile(out, items)
    expect(res.files).toBe(70_000)
    expect(await zipEntries(out, 'transactions/069999.json')).toEqual({ count: 70_000, content: '{"n":69999}' })
    expect((await zipEntries(out, 'transactions/001000.json')).content).toBe(long)
  }, 60_000)

  it('kopia danych z pamięci magazynu: rekordy jak na dysku, kopia konfliktu i plik z błędem z dysku', async () => {
    const store = await freshStore()
    const { entry } = await store.saveRecord('transactions', sampleTransaction({ note: 'zł' }))
    const copyRel = entry.relPath.replace('.json', '-LAPTOP.json')
    await fs.writeFile(join(store.root, copyRel), JSON.stringify({ ...entry.record, note: 'kopia' }))
    await fs.writeFile(join(store.root, 'goals', 'zepsuty.json'), '{ nie json')
    await store.refresh()
    const reads = vi.spyOn(fs, 'open')
    const out = join(tempDir(), 'dane.zip')
    const res = await store.zipData(out)
    const zipped = await readZip(out)
    expect([...zipped.keys()].sort()).toEqual([copyRel, entry.relPath, 'fi.json', 'goals/zepsuty.json'].sort())
    expect(res.files).toBe(4)
    expect(zipped.get(entry.relPath)).toBe(await fs.readFile(join(store.root, ...entry.relPath.split('/')), 'utf8'))
    expect(zipped.get('fi.json')).toBe(await fs.readFile(join(store.root, 'fi.json'), 'utf8'))
    expect(zipped.get('goals/zepsuty.json')).toBe('{ nie json')
    // Only the copy and the broken file were read from the disk (and the ZIP's own temp file written).
    const opened = reads.mock.calls.map(([p]) => String(p)).filter((p) => p.startsWith(store.root))
    expect(opened.sort()).toEqual([join(store.root, ...copyRel.split('/')), join(store.root, 'goals', 'zepsuty.json')].sort())
  })
})
