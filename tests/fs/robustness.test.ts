// adapted from ICTTJ tests/fs/robustness.test.ts @ 84a8339
import { promises as fs, rmSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ReadOnlyError } from '../../src/main/datastore/store'
import { zipFolder } from '../../src/main/datastore/zip'
import { runBackups } from '../../src/main/datastore/backup'
import { writeFileAtomic } from '../../src/main/datastore/atomic'
import { isIgnoredPath } from '@shared/paths'
import { exists, freshStore, readJson, readZip, sampleMonth, tempDir } from './helpers'

describe('uszkodzony plik pod ścieżką zapisu nie jest nadpisywany', () => {
  it('uszkodzony plan miesiąca zostaje odsunięty jako kopia konfliktu, nowy plan zapisany', async () => {
    const store = await freshStore()
    const rel = 'months/2026-03.json'
    await fs.writeFile(join(store.root, rel), '{"schemaVersion": 1, "month": "2026-03", "envelopes": [', 'utf8')
    const before = await store.refresh()
    expect(before?.problems.some((p) => p.relPath === rel)).toBe(true)

    const { change } = await store.saveRecord('months', sampleMonth('2026-03'))
    expect((await readJson(join(store.root, rel))).month).toBe('2026-03')
    const copy = change?.conflicts.find((c) => c.id.startsWith('months/2026-03-uszkodzona-'))
    expect(copy?.source).toBe('uszkodzony plik odsunięty przy zapisie')
    expect(await fs.readFile(join(store.root, copy!.id), 'utf8')).toContain('"envelopes": [')
  })

  it('plik w nowszym formacie (niepasujący do schematu) blokuje zapis zamiast zniknąć', async () => {
    const store = await freshStore()
    const rel = 'months/2026-04.json'
    const text = '{"schemaVersion": 99, "month": "2026-04", "envelopes": "nowy-format"}\n'
    await fs.writeFile(join(store.root, rel), text, 'utf8')
    await store.refresh()
    await expect(store.saveRecord('months', sampleMonth('2026-04'))).rejects.toBeInstanceOf(ReadOnlyError)
    // The app's own writes skip it too.
    await store.saveGenerated('months', [sampleMonth('2026-04')])
    expect(await fs.readFile(join(store.root, rel), 'utf8')).toBe(text)
  })
})

describe('fi.json uszkodzony w trakcie pracy', () => {
  it('odświeżenie nie rzuca wyjątku: ustawienia zostają, plik jest na liście problemów, zapis go odsuwa', async () => {
    const store = await freshStore()
    const fiBefore = store.fi
    const broken = '{"schemaVersion": 1, "settings": {'
    await fs.writeFile(join(store.root, 'fi.json'), broken, 'utf8')
    const change = await store.refresh()
    expect(change?.problems.some((p) => p.relPath === 'fi.json')).toBe(true)
    expect(store.fi).toBe(fiBefore)
    expect(change?.status.readOnly).toBe(false)

    await store.saveSettings({ ...fiBefore, settings: { ...fiBefore.settings, shipName: 'Po awarii' } })
    expect(((await readJson(join(store.root, 'fi.json'))).settings as { shipName: string }).shipName).toBe('Po awarii')
    const names = await fs.readdir(store.root)
    const copy = names.find((n) => n.startsWith('fi-uszkodzona-'))
    expect(copy).toBeTruthy()
    expect(await fs.readFile(join(store.root, copy!), 'utf8')).toBe(broken)
  })

  it('fi.json w nowszym formacie przełącza folder w tryb tylko do odczytu', async () => {
    const store = await freshStore()
    await fs.writeFile(join(store.root, 'fi.json'), '{"schemaVersion": 99, "settings": "inaczej"}\n', 'utf8')
    const change = await store.refresh()
    expect(change?.status.readOnly).toBe(true)
    await expect(store.saveSettings(store.fi)).rejects.toBeInstanceOf(ReadOnlyError)
  })
})

describe('ZIP odporny na zmiany w trakcie pakowania', () => {
  it('plik znikający w trakcie pakowania nie wywraca procesu – druga próba się udaje', async () => {
    const root = tempDir()
    await fs.mkdir(join(root, 'transactions'), { recursive: true })
    await fs.writeFile(join(root, 'transactions', 'a.json'), '{}', 'utf8')
    await fs.writeFile(join(root, 'transactions', 'b.json'), '{}', 'utf8')
    let removed = false
    const out = join(tempDir(), 'kopia.zip')
    // The include callback runs after listing and before zipping: deleting here reproduces the race.
    const res = await zipFolder(root, out, (rel) => {
      if (rel === 'transactions/b.json' && !removed) {
        removed = true
        rmSync(join(root, ...rel.split('/')))
      }
      return true
    })
    expect(res.files).toBe(1)
    expect(await exists(out)).toBe(true)
    expect((await fs.readdir(join(out, '..'))).filter((n) => n.includes('.tmp-'))).toEqual([])
  })
})

describe('kopia ZIP przy plikach zapisywanych w trakcie (ICTTJ 1.17.2)', () => {
  it('rekord nadpisywany co chwilę podczas pakowania nie przerywa kopii', async () => {
    const root = tempDir()
    await fs.mkdir(join(root, 'game'), { recursive: true })
    await fs.mkdir(join(root, 'transactions'), { recursive: true })
    // A big record first: the rewritten one is packed well after the listing.
    const big = Array.from({ length: 250_000 }, (_, i) => `{"i":${i},"v":"${(i * 7919) % 104729}"}`).join(',\n')
    await fs.writeFile(join(root, 'game', 'a-duzy.json'), `[${big}]`, 'utf8')
    const rec = join(root, 'transactions', 'z-rekord.json')
    await fs.writeFile(rec, '{"n":0}\n', 'utf8')
    let n = 0
    let stop = false
    const churn = (async () => {
      while (!stop) {
        n++
        await writeFileAtomic(rec, `{"n":${n},"pad":"${'x'.repeat(n % 50)}"}\n`)
        await new Promise((r) => setTimeout(r, 2))
      }
    })()
    // The packing starts once the rewrites run (a fast machine packs in fewer rewrites than a slow one).
    while (n < 3) await new Promise((r) => setTimeout(r, 2))
    const out = join(tempDir(), 'kopia.zip')
    try {
      const res = await zipFolder(root, out, (rel) => !isIgnoredPath(rel))
      expect(res.files).toBe(2)
    } finally {
      stop = true
      await churn
    }
    expect(n).toBeGreaterThanOrEqual(3)
    // The rewritten record went in whole (one of its versions).
    const packed = JSON.parse((await readZip(out)).get('transactions/z-rekord.json')!) as { n: number }
    expect(packed.n).toBeGreaterThanOrEqual(0)
  })

  it('kopia dzienna przy otwarciu: rekord zapisywany w trakcie trafia w całości', async () => {
    const store = await freshStore()
    const backups = join(store.root, 'backups')
    const m = sampleMonth('2026-03')
    let stop = false
    let n = 0
    const churn = (async () => {
      while (!stop) {
        await store.saveRecord('months', { ...m, note: `v${++n}` })
        await new Promise((r) => setTimeout(r, 1))
      }
    })()
    while (n < 2) await new Promise((r) => setTimeout(r, 2))
    let file: string | null
    try {
      file = await runBackups(store, backups, new Date('2026-10-16T09:00:00Z'))
    } finally {
      stop = true
      await churn
    }
    expect(file).toBeTruthy()
    const zipped = await readZip(file!)
    expect(JSON.parse(zipped.get('months/2026-03.json')!).note).toMatch(/^v\d+$/)
    expect([...zipped.keys()].some((k) => k.startsWith('backups/') || k.startsWith('.history/'))).toBe(false)
  })
})

describe('zapis atomowy sprząta po błędzie', () => {
  it('nieudany zapis nie zostawia pliku tymczasowego', async () => {
    const dir = tempDir()
    // A directory in place of the target makes the final rename fail.
    await fs.mkdir(join(dir, 'cel.json'))
    await fs.writeFile(join(dir, 'cel.json', 'x'), 'x')
    await expect(writeFileAtomic(join(dir, 'cel.json'), '{}')).rejects.toBeTruthy()
    expect((await fs.readdir(dir)).filter((n) => n.includes('.tmp-'))).toEqual([])
  })
})
