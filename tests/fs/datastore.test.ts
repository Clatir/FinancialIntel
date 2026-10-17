// adapted from ICTTJ tests/fs/datastore.test.ts @ 84a8339
import { promises as fs } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DataStore, ReadOnlyError } from '../../src/main/datastore/store'
import { writeFileAtomic } from '../../src/main/datastore/atomic'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, type Transaction } from '@shared/schema'
import { COLLECTIONS, recordRelPath } from '@shared/paths'
import { createDefaultSettings } from '@shared/defaults'
import { exists, freshStore, readJson, readZip, sampleGame, sampleGoal, sampleMonth, sampleTransaction, tempDir } from './helpers'

const txPath = (t: Transaction) => recordRelPath('transactions', t)

describe('folder danych: tworzenie, zapis, odczyt', () => {
  it('nowy folder ma fi.json i katalogi kolekcji, a wszystkie kolekcje są puste', async () => {
    const store = await freshStore()
    for (const d of [...COLLECTIONS, 'backups']) expect(await exists(join(store.root, d))).toBe(true)
    const snap = await store.snapshot()
    for (const c of COLLECTIONS) expect(snap.records[c]).toEqual([])
    expect(snap.fi.settings.shipName).toBe('Flagowiec')
    expect(snap.status.readOnly).toBe(false)
    expect(await DataStore.inspect(store.root)).toBe('data')
  })

  it('rodzaj folderu: pusty, inny, brak; drugi initialize w folderze z danymi odrzucony', async () => {
    const dir = tempDir()
    expect(await DataStore.inspect(join(dir, 'nie-ma'))).toBe('missing')
    await fs.mkdir(join(dir, 'pusty'))
    // Hidden files and Windows thumbnails do not count.
    await fs.writeFile(join(dir, 'pusty', 'desktop.ini'), '')
    await fs.writeFile(join(dir, 'pusty', '.DS_Store'), '')
    expect(await DataStore.inspect(join(dir, 'pusty'))).toBe('empty')
    await fs.mkdir(join(dir, 'inny'))
    await fs.writeFile(join(dir, 'inny', 'zakupy.txt'), 'mleko')
    expect(await DataStore.inspect(join(dir, 'inny'))).toBe('other')
    const store = await freshStore()
    await expect(DataStore.initialize(store.root, createDefaultSettings())).rejects.toThrow(/fi\.json/)
    await expect(new DataStore(join(dir, 'inny'), { machineName: 'X' }).open()).rejects.toThrow(/fi\.json/)
  })

  it('rodzaj folderu: dane FI bez fi.json (OneDrive jeszcze synchronizuje) i folder ICTTJ', async () => {
    const dir = tempDir()
    await fs.mkdir(join(dir, 'w-trakcie', 'transactions', '2026'), { recursive: true })
    expect(await DataStore.inspect(join(dir, 'w-trakcie'))).toBe('partial')
    await fs.mkdir(join(dir, 'ictj'))
    await fs.writeFile(join(dir, 'ictj', 'journal.json'), '{}')
    expect(await DataStore.inspect(join(dir, 'ictj'))).toBe('ictj')
  })

  it('plik bez id: id z nazwy pliku, to samo przy każdym odczycie', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    const rel = recordRelPath('transactions', t as unknown as Record<string, unknown>)
    const { id: _id, ...noId } = t as unknown as Record<string, unknown>
    await writeFileAtomic(join(store.root, ...rel.split('/')), JSON.stringify(noId))
    const again = new DataStore(store.root, { machineName: 'INNY' })
    const snap = await again.open()
    expect(snap.records.transactions.map((e) => e.record.id)).toEqual([t.id])
    expect(snap.conflicts).toEqual([])
  })

  it('zapis operacji: czytelny JSON z wcięciami pod ścieżką z datą, odczyt w nowej instancji', async () => {
    const store = await freshStore()
    const t = sampleTransaction({ note: 'zażółć gęślą jaźń' })
    const { entry } = await store.saveRecord('transactions', t)
    expect(entry.relPath).toBe(`transactions/2026/2026-03-16_${t.id}.json`)
    expect(entry.record).toMatchObject({ updatedBy: 'TEST-PC', schemaVersion: SCHEMA_VERSION })
    const text = await fs.readFile(join(store.root, entry.relPath), 'utf8')
    expect(text).toContain('\n  "id": ')
    expect(text.endsWith('\n')).toBe(true)
    const json = JSON.parse(text)
    expect(json.schemaVersion).toBe(SCHEMA_VERSION)
    // Unknown fields are kept (loose schemas).
    expect(json.amount).toBe(-4599)

    const reopened = new DataStore(store.root, { machineName: 'OTHER' })
    const snap = await reopened.open()
    expect(snap.records.transactions).toHaveLength(1)
    expect(snap.records.transactions[0]?.record.note).toBe('zażółć gęślą jaźń')
  })

  it('układy plików: miesiąc pod months/RRRR-MM.json, cel pod goals/<id>.json', async () => {
    const store = await freshStore()
    const m = await store.saveRecord('months', sampleMonth('2026-04'))
    expect(m.entry.relPath).toBe('months/2026-04.json')
    const g = sampleGoal()
    const saved = await store.saveRecord('goals', g)
    expect(saved.entry.relPath).toBe(`goals/${g.id}.json`)
    const snap = await new DataStore(store.root, { machineName: 'X' }).open()
    expect(snap.records.months.map((e) => e.record.month)).toEqual(['2026-04'])
    expect(snap.records.goals.map((e) => e.record.name)).toEqual(['Wakacje'])
  })

  it('zmiana daty przenosi plik pod nową nazwę i usuwa stary', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    const first = await store.saveRecord('transactions', t)
    const second = await store.saveRecord('transactions', { ...first.entry.record, date: '2027-01-02' })
    expect(second.entry.relPath).toBe(`transactions/2027/2027-01-02_${t.id}.json`)
    expect(await exists(join(store.root, first.entry.relPath))).toBe(false)
    expect((await store.snapshot()).records.transactions).toHaveLength(1)
  })

  it('zmiana miesiąca planu przenosi plik; plan tego miesiąca o innym id nie jest nadpisywany', async () => {
    const store = await freshStore()
    const march = await store.saveRecord('months', sampleMonth('2026-03'))
    const moved = await store.saveRecord('months', { ...march.entry.record, month: '2026-05' })
    expect(moved.entry.relPath).toBe('months/2026-05.json')
    expect(await exists(join(store.root, 'months', '2026-03.json'))).toBe(false)
    const other = sampleMonth('2026-05', { note: 'inny' })
    await expect(store.saveRecord('months', other)).rejects.toThrow(/należy do innego wpisu/)
    expect((await readJson(join(store.root, 'months', '2026-05.json'))).id).toBe(march.entry.record.id)
  })

  it('niepoprawne dane nie są zapisywane', async () => {
    const store = await freshStore()
    await expect(store.saveRecord('transactions', sampleTransaction({ date: '16.03.2026' }))).rejects.toThrow(/date/)
    await expect(store.saveRecord('months', sampleMonth('2026-13'))).rejects.toThrow(/month/)
    expect((await store.snapshot()).records.transactions).toEqual([])
  })

  it('usunięcie wpisu przenosi plik do kosza (shell.trashItem)', async () => {
    const root = join(tempDir(), 'dane')
    await DataStore.initialize(root)
    const trashed: string[] = []
    const store = new DataStore(root, {
      machineName: 'X',
      trash: async (p) => {
        trashed.push(p)
        await fs.rm(p)
      }
    })
    await store.open()
    const t = sampleTransaction()
    const { entry } = await store.saveRecord('transactions', t)
    const change = await store.deleteRecord('transactions', t.id)
    expect(change?.removals).toEqual([{ collection: 'transactions', id: t.id }])
    expect(trashed).toEqual([store.abs(entry.relPath)])
    expect(await exists(join(store.root, entry.relPath))).toBe(false)
    expect(await store.deleteRecord('transactions', t.id)).toBeNull()
  })

  it('ścieżki poza folderem danych są odrzucane', async () => {
    const store = await freshStore()
    expect(() => store.abs('../poza.json')).toThrow(/Niedozwolona/)
    expect(() => store.abs('/etc/passwd')).toThrow(/Niedozwolona/)
    expect(() => store.abs('C:/Windows/x.json')).toThrow(/Niedozwolona/)
  })
})

describe('zapis atomowy', () => {
  it('nie zostawia plików tymczasowych i zastępuje istniejący plik', async () => {
    const dir = tempDir()
    const target = join(dir, 'a', 'b.json')
    await writeFileAtomic(target, '{"v":1}')
    await writeFileAtomic(target, '{"v":2}')
    expect(await fs.readFile(target, 'utf8')).toBe('{"v":2}')
    expect((await fs.readdir(join(dir, 'a'))).filter((f) => f.includes('.tmp-'))).toEqual([])
  })

  it('pozostałość po przerwanym zapisie (.tmp) jest ignorowana, oryginał nienaruszony', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    const { entry } = await store.saveRecord('transactions', t)
    const dir = join(store.root, 'transactions', '2026')
    // Simulated crash: temp file written halfway, never renamed.
    await fs.writeFile(join(dir, `.${entry.relPath.split('/').pop()}.tmp-dead`), '{"id": "01K', 'utf8')
    const snap = await new DataStore(store.root, { machineName: 'X' }).open()
    expect(snap.records.transactions).toHaveLength(1)
    expect(snap.problems).toEqual([])
  })

  it('stare pliki tymczasowe (> 1 h) są sprzątane przy otwarciu, świeże zostają', async () => {
    const store = await freshStore()
    const dir = join(store.root, 'transactions', '2026')
    await fs.mkdir(dir, { recursive: true })
    const old = join(dir, '.a.json.tmp-old1')
    const fresh = join(dir, '.b.json.tmp-new1')
    await fs.writeFile(old, 'x')
    await fs.writeFile(fresh, 'x')
    const hourAgo = new Date(Date.now() - 2 * 3600_000)
    await fs.utimes(old, hourAgo, hourAgo)
    await new DataStore(store.root, { machineName: 'X' }).open()
    expect(await exists(old)).toBe(false)
    expect(await exists(fresh)).toBe(true)
  })
})

describe('uszkodzone pliki', () => {
  it('uszkodzony JSON jest pomijany i zgłaszany, reszta działa', async () => {
    const store = await freshStore()
    await store.saveRecord('transactions', sampleTransaction())
    const bad = sampleTransaction()
    const badPath = join(store.root, txPath(bad))
    await fs.mkdir(join(store.root, 'transactions', '2026'), { recursive: true })
    await fs.writeFile(badPath, '{ "id": "zepsuty", "date": ', 'utf8')
    await fs.writeFile(join(store.root, 'months', 'notatki.json'), '{}', 'utf8')

    const snap = await new DataStore(store.root, { machineName: 'X' }).open()
    expect(snap.records.transactions).toHaveLength(1)
    const kinds = Object.fromEntries(snap.problems.map((p) => [p.relPath.split('/').pop(), p.kind]))
    expect(kinds[basename(badPath)]).toBe('corrupt')
    expect(kinds['notatki.json']).toBe('unknown-file')
    // The broken file is never overwritten.
    expect(await fs.readFile(badPath, 'utf8')).toBe('{ "id": "zepsuty", "date": ')
  })

  it('poprawny JSON z błędną strukturą → problem "invalid"', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    await fs.mkdir(join(store.root, 'transactions', '2026'), { recursive: true })
    await fs.writeFile(join(store.root, txPath(t)), JSON.stringify({ ...t, date: 'wczoraj' }), 'utf8')
    const snap = await new DataStore(store.root, { machineName: 'X' }).open()
    expect(snap.records.transactions).toHaveLength(0)
    expect(snap.problems[0]?.kind).toBe('invalid')
    expect(snap.problems[0]?.message).toMatch(/date/)
  })

  it('JSON z BOM (zapisany np. w Notatniku) jest czytany', async () => {
    const store = await freshStore()
    const t = sampleTransaction({ note: 'z BOM' })
    await fs.mkdir(join(store.root, 'transactions', '2026'), { recursive: true })
    await fs.writeFile(join(store.root, txPath(t)), `\ufeff${JSON.stringify(t)}`, 'utf8')
    const snap = await new DataStore(store.root, { machineName: 'X' }).open()
    expect(snap.problems).toEqual([])
    expect(snap.records.transactions[0]?.record.note).toBe('z BOM')
  })
})

describe('migracje i wersje schematu', () => {
  it('folder w starym formacie (v0) jest migrowany po pełnym backupie ZIP', async () => {
    const root = join(tempDir(), 'stary')
    await fs.mkdir(join(root, 'transactions', '2026'), { recursive: true })
    const legacyFi = JSON.stringify({ settings: { shipName: 'Stary okręt' } }, null, 2)
    await fs.writeFile(join(root, 'fi.json'), legacyFi)
    const legacy = { id: '01K6H3Z0W8Q4M2N5P7R9S1T3V5', date: '2026-03-16', accountId: MBANK_ACCOUNT_ID, amount: -1200, note: 'stara' }
    const rel = `transactions/2026/2026-03-16_${legacy.id}.json`
    await fs.writeFile(join(root, rel), JSON.stringify(legacy, null, 2))

    const store = new DataStore(root, { machineName: 'X', now: () => '2026-04-01T10:00:00.000Z' })
    const snap = await store.open()
    expect(snap.status.migratedFrom).toBe(0)
    expect(snap.status.backupPath).toMatch(/pre-migration[\\/]20260401T100000Z_v0-v1\.zip$/)
    expect(await exists(snap.status.backupPath!)).toBe(true)
    // The backup holds the files as they were before the migration.
    const zipped = await readZip(snap.status.backupPath!)
    expect(zipped.get('fi.json')).toBe(legacyFi)
    expect(JSON.parse(zipped.get(rel)!)).toEqual(legacy)
    const fi = await readJson(join(root, 'fi.json'))
    expect(fi.schemaVersion).toBe(SCHEMA_VERSION)
    expect(fi.id).toMatch(/^[0-9A-Z]{26}$/)
    expect((fi.settings as { shipName: string }).shipName).toBe('Stary okręt')
    const tx = await readJson(join(root, rel))
    expect(tx).toMatchObject({ schemaVersion: SCHEMA_VERSION, id: legacy.id, amount: -1200, note: 'stara' })
    expect(typeof tx.createdAt).toBe('string')
    expect(snap.records.transactions[0]?.record.note).toBe('stara')
  })

  it('folder w nowszym formacie: tylko odczyt, zapis odrzucony, pliki nietknięte', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    await store.saveRecord('transactions', t)
    const fPath = join(store.root, 'fi.json')
    const f = await readJson(fPath)
    await fs.writeFile(fPath, JSON.stringify({ ...f, schemaVersion: SCHEMA_VERSION + 1 }, null, 2))
    const before = await fs.readFile(fPath, 'utf8')

    const newer = new DataStore(store.root, { machineName: 'OLD-APP' })
    const snap = await newer.open()
    expect(snap.status.readOnly).toBe(true)
    expect(snap.status.readOnlyReason).toMatch(/Zaktualizuj aplikację/)
    expect(snap.status.folderSchemaVersion).toBe(SCHEMA_VERSION + 1)
    expect(snap.records.transactions).toHaveLength(1)
    await expect(newer.saveRecord('transactions', { ...t, note: 'x' })).rejects.toBeInstanceOf(ReadOnlyError)
    await expect(newer.saveSettings(snap.fi)).rejects.toBeInstanceOf(ReadOnlyError)
    await expect(newer.deleteRecord('transactions', t.id)).rejects.toBeInstanceOf(ReadOnlyError)
    expect(await fs.readFile(fPath, 'utf8')).toBe(before)
  })

  it('pojedynczy rekord w nowszym formacie jest tylko do odczytu', async () => {
    const store = await freshStore()
    const t = sampleTransaction()
    const { entry } = await store.saveRecord('transactions', t)
    const p = join(store.root, entry.relPath)
    await fs.writeFile(p, JSON.stringify({ ...(await readJson(p)), schemaVersion: SCHEMA_VERSION + 1 }, null, 2))
    const s2 = new DataStore(store.root, { machineName: 'X' })
    const snap = await s2.open()
    expect(snap.records.transactions[0]?.readOnly).toBe(true)
    await expect(s2.saveRecord('transactions', { ...t, note: 'nadpis' })).rejects.toBeInstanceOf(ReadOnlyError)
    await expect(s2.deleteRecord('transactions', t.id)).rejects.toBeInstanceOf(ReadOnlyError)
  })

  it('pojedynczy stary plik zsynchronizowany później jest migrowany, a oryginał zachowany w backups/', async () => {
    const store = await freshStore()
    const legacy = { id: '01K6H3Z0W8Q4M2N5P7R9S1T3V6', date: '2026-03-18', accountId: MBANK_ACCOUNT_ID, amount: 5000 }
    const rel = `transactions/2026/2026-03-18_${legacy.id}.json`
    await fs.mkdir(join(store.root, 'transactions', '2026'), { recursive: true })
    await fs.writeFile(join(store.root, rel), JSON.stringify(legacy))
    const change = await store.refresh([rel])
    expect(change?.upserts).toHaveLength(1)
    expect((await readJson(join(store.root, rel))).schemaVersion).toBe(SCHEMA_VERSION)
    const backups = await fs.readdir(join(store.root, 'backups', 'pre-migration'))
    expect(backups.length).toBe(1)
    expect(await readJson(join(store.root, 'backups', 'pre-migration', backups[0]!, rel))).toEqual(legacy)
  })
})

describe('przeniesienie folderu danych', () => {
  it('cały folder skopiowany w inne miejsce działa, ścieżki są względne', async () => {
    const store = await freshStore()
    await store.saveRecord('transactions', sampleTransaction({ note: 'na pendrive' }))
    await store.saveRecord('months', sampleMonth('2026-03'))
    const moved = join(tempDir(), 'pendrive', 'FinancialIntel')
    await fs.cp(store.root, moved, { recursive: true })
    await fs.rm(store.root, { recursive: true, force: true })

    const s2 = new DataStore(moved, { machineName: 'LAPTOP' })
    const snap = await s2.open()
    expect(snap.records.transactions[0]?.record.note).toBe('na pendrive')
    expect(snap.records.months[0]?.relPath).toBe('months/2026-03.json')
    expect(JSON.stringify({ ...snap, status: null })).not.toContain(store.root)
  })
})

describe('konflikty synchronizacji', () => {
  it('kopia OneDrive jest pokazana do rozstrzygnięcia; wybór kopii nadpisuje oryginał', async () => {
    const store = await freshStore()
    const t = sampleTransaction({ note: 'wersja A' })
    const { entry } = await store.saveRecord('transactions', t)
    const copyRel = entry.relPath.replace('.json', '-DESKTOP-K3LM9.json')
    await fs.writeFile(join(store.root, copyRel), JSON.stringify({ ...entry.record, note: 'wersja B' }, null, 2))

    const change = await store.refresh([copyRel])
    expect(change?.conflicts).toHaveLength(1)
    const c = change!.conflicts[0]!
    expect(c).toMatchObject({ type: 'copy', source: 'OneDrive', kind: 'transactions' })
    expect((c.copy.record as { note: string }).note).toBe('wersja B')

    const after = await store.resolveConflict(c.id, 'copy')
    expect(after?.conflicts ?? []).toHaveLength(0)
    expect((await readJson(join(store.root, entry.relPath))).note).toBe('wersja B')
    expect(await exists(join(store.root, copyRel))).toBe(false)
  })

  it('zachowanie oryginału usuwa kopię', async () => {
    const store = await freshStore()
    const { entry } = await store.saveRecord('transactions', sampleTransaction({ note: 'A' }))
    const copyRel = entry.relPath.replace('.json', ' (1).json')
    await fs.writeFile(join(store.root, copyRel), '{ uszkodzona kopia')
    const change = await store.refresh()
    expect(change?.conflicts[0]?.copy.error).toMatch(/Uszkodzony JSON/)
    await expect(store.resolveConflict(copyRel, 'copy')).rejects.toThrow(/Kopii nie da się odczytać/)
    await store.resolveConflict(copyRel, 'canonical')
    expect(await exists(join(store.root, copyRel))).toBe(false)
    expect((await readJson(join(store.root, entry.relPath))).note).toBe('A')
  })

  it('kopie planu miesiąca i fi.json (Dropbox, OneDrive) są rozpoznane; wybór kopii fi.json zmienia ustawienia', async () => {
    const store = await freshStore()
    await store.saveRecord('months', sampleMonth('2026-03', { note: 'A' }))
    const monthCopy = 'months/2026-03 (kopia powodująca konflikt użytkownika LAPTOP).json'
    await fs.writeFile(join(store.root, monthCopy), JSON.stringify({ ...(await readJson(join(store.root, 'months', '2026-03.json'))), note: 'B' }))
    const fiCopy = 'fi-LAPTOP.json'
    await fs.writeFile(join(store.root, fiCopy), JSON.stringify({ ...store.fi, settings: { ...store.fi.settings, shipName: 'Kopia' } }))
    const change = await store.refresh()
    expect(change?.conflicts.map((c) => [c.id, c.kind, c.source, c.canonical.relPath])).toEqual([
      [fiCopy, 'fi', 'OneDrive', 'fi.json'],
      [monthCopy, 'months', 'Dropbox', 'months/2026-03.json']
    ])
    await store.resolveConflict(fiCopy, 'copy')
    expect(store.fi.settings.shipName).toBe('Kopia')
    expect(((await readJson(join(store.root, 'fi.json'))).settings as { shipName: string }).shipName).toBe('Kopia')
    expect(await exists(join(store.root, fiCopy))).toBe(false)
  })

  it('ten sam identyfikator w dwóch plikach → konflikt "duplicate", nowsza wersja na liście', async () => {
    const store = await freshStore()
    const t = sampleTransaction({ note: 'stara' })
    const { entry } = await store.saveRecord('transactions', t)
    const other = { ...entry.record, date: '2026-03-17', note: 'nowa', updatedAt: '2030-01-01T00:00:00.000Z' }
    await fs.writeFile(join(store.root, txPath(other)), JSON.stringify(other, null, 2))
    const change = await store.refresh()
    const snap = await store.snapshot()
    expect(snap.records.transactions).toHaveLength(1)
    expect(snap.records.transactions[0]?.record.note).toBe('nowa')
    expect(change?.conflicts[0]?.type).toBe('duplicate')
    expect(change?.conflicts[0]?.copy.relPath).toBe(entry.relPath)
  })

  it('pliki z problemami i kopie można przenieść do kosza, rekordów nie', async () => {
    const store = await freshStore()
    const { entry } = await store.saveRecord('transactions', sampleTransaction())
    await fs.writeFile(join(store.root, 'goals', 'smieci.json'), '{}')
    await store.refresh()
    await expect(store.trashFile(entry.relPath)).rejects.toThrow(/Można usuwać tylko/)
    const change = await store.trashFile('goals/smieci.json')
    expect(change?.problems).toEqual([])
    expect(await exists(join(store.root, 'goals', 'smieci.json'))).toBe(false)
  })
})

describe('zmiany z zewnątrz (synchronizacja)', () => {
  it('zmiana pliku przez inny komputer trafia do widoku; własny zapis nie wraca jako zmiana', async () => {
    const store = await freshStore()
    const { entry } = await store.saveRecord('transactions', sampleTransaction({ note: 'A' }))
    expect(await store.refresh([entry.relPath])).toBeNull()

    const p = join(store.root, entry.relPath)
    await fs.writeFile(p, JSON.stringify({ ...(await readJson(p)), note: 'z laptopa' }, null, 2))
    const change = await store.refresh([entry.relPath])
    expect(change?.origin).toBe('external')
    expect(change?.upserts[0]?.entry.record).toMatchObject({ note: 'z laptopa' })

    await fs.rm(p)
    const removed = await store.refresh([entry.relPath])
    expect(removed?.removals).toEqual([{ collection: 'transactions', id: entry.record.id }])
  })

  it('fi.json zmieniony na innym komputerze: nowe ustawienia w zmianie i w magazynie', async () => {
    const store = await freshStore()
    const p = join(store.root, 'fi.json')
    const raw = await readJson(p)
    await fs.writeFile(p, JSON.stringify({ ...raw, settings: { ...(raw.settings as object), shipName: 'Z laptopa' } }, null, 2))
    const change = await store.refresh(['fi.json'])
    expect(change?.fi?.settings.shipName).toBe('Z laptopa')
    expect(store.fi.settings.shipName).toBe('Z laptopa')
  })

  it('jeśli plik zmienił się w tle tuż przed zapisem, wersja z zewnątrz zostaje zachowana jako konflikt', async () => {
    const store = await freshStore()
    const { entry } = await store.saveRecord('transactions', sampleTransaction({ note: 'A' }))
    const p = join(store.root, entry.relPath)
    await fs.writeFile(p, JSON.stringify({ ...(await readJson(p)), note: 'zewnętrzna' }, null, 2))
    const saved = await store.saveRecord('transactions', { ...entry.record, note: 'moja' })
    expect(saved.change?.conflicts[0]?.source).toBe('zmiana z zewnątrz podczas edycji')
    expect((saved.change?.conflicts[0]?.copy.record as { note: string }).note).toBe('zewnętrzna')
    expect((await readJson(p)).note).toBe('moja')
  })

  it('zmiana w tle z tą samą treścią (inny komputer zrobił to samo) – bez kopii konfliktu', async () => {
    const store = await freshStore()
    const { entry } = await store.saveRecord('transactions', sampleTransaction({ note: 'A' }))
    const p = join(store.root, entry.relPath)
    await fs.writeFile(p, JSON.stringify({ ...(await readJson(p)), note: 'B', updatedBy: 'LAPTOP', updatedAt: '2030-01-01T00:00:00.000Z' }, null, 2))
    const saved = await store.saveRecord('transactions', { ...entry.record, note: 'B' })
    expect(saved.change?.conflicts ?? []).toEqual([])
    expect((await fs.readdir(join(store.root, 'transactions', '2026'))).filter((n) => n.includes('zewnetrzna'))).toEqual([])
  })

  it('niedostępny folder (odłączony pendrive) → tylko odczyt, dane zostają w pamięci', async () => {
    const store = await freshStore()
    await store.saveRecord('transactions', sampleTransaction())
    const away = `${store.root}-odlaczony`
    await fs.rename(store.root, away)
    const change = await store.refresh()
    expect(change?.status.available).toBe(false)
    expect(change?.status.readOnly).toBe(true)
    expect(change?.removals).toEqual([])
    await expect(store.saveRecord('transactions', sampleTransaction())).rejects.toBeInstanceOf(ReadOnlyError)
    await fs.rename(away, store.root)
    const back = await store.refresh()
    expect(back?.status.available).toBe(true)
    expect((await store.snapshot()).records.transactions).toHaveLength(1)
  })
})

describe('rekordy zapisywane przez aplikację i import', () => {
  it('saveGenerated: wiele naraz, bez wersji w .history/, pola użytkownika (keep) zostają przy przepisaniu', async () => {
    const store = await freshStore()
    const a = sampleGame('2026-03', { '2026-03-02': 'ok' })
    const b = sampleGame('2026-04')
    const change = await store.saveGenerated('game', [a, b])
    expect(change?.upserts.map((u) => u.entry.record.id).sort()).toEqual([a.id, b.id].sort())
    expect(change?.upserts.map((u) => u.entry.relPath).sort()).toEqual(['game/2026-03.json', 'game/2026-04.json'])
    // The user writes a note – a normal save.
    await store.saveRecord('game', { ...a, userNote: 'moja' })
    // The app rewrites the month: the note stays, nothing goes to the history by the app's write.
    const broken = sampleGame('2026-03', { '2026-03-02': 'broken' }).days
    await store.saveGenerated('game', [{ ...a, days: broken }], ['userNote'])
    const snap = await new DataStore(store.root, { machineName: 'X' }).open()
    const saved = snap.records.game.find((e) => e.record.id === a.id)!.record
    expect(saved).toMatchObject({ days: { '2026-03-02': { status: 'broken' } }, userNote: 'moja' })
    expect(snap.records.game).toHaveLength(2)
    // Only the user's own save may have kept a version.
    expect((await store.historyList('game', a.id)).length).toBeLessThanOrEqual(1)
  })

  it('importRecords: zachowuje updatedAt, plan tego samego miesiąca o innym id zastąpiony, przeniesienie daty', async () => {
    const store = await freshStore()
    const mine = await store.saveRecord('months', sampleMonth('2026-03', { note: 'mój' }))
    const t = await store.saveRecord('transactions', sampleTransaction())
    const imported = sampleMonth('2026-03', { note: 'z importu', updatedAt: '2025-12-31T10:00:00.000Z' })
    const change = await store.importRecords([
      { kind: 'months', record: imported },
      { kind: 'transactions', record: { ...t.entry.record, date: '2026-03-20' } }
    ])
    expect(change?.removals).toEqual([{ collection: 'months', id: mine.entry.record.id }])
    const file = await readJson(join(store.root, 'months', '2026-03.json'))
    expect(file).toMatchObject({ id: imported.id, note: 'z importu', updatedAt: '2025-12-31T10:00:00.000Z' })
    expect(await exists(join(store.root, t.entry.relPath))).toBe(false)
    expect((await store.snapshot()).records.transactions[0]?.relPath).toBe(`transactions/2026/2026-03-20_${t.entry.record.id}.json`)
    expect((await store.historyList('transactions', t.entry.record.id))[0]?.reason).toBe('import')
  })
})

describe('wydajność', () => {
  it('wczytanie 5000 operacji', async () => {
    const store = await freshStore()
    const base = Date.UTC(2025, 0, 2)
    const writes: Promise<void>[] = []
    await Promise.all(['2025', '2026', '2027', '2028', '2029'].map((y) => fs.mkdir(join(store.root, 'transactions', y), { recursive: true })))
    for (let i = 0; i < 5000; i++) {
      const t = sampleTransaction({
        date: new Date(base + Math.floor(i / 4) * 86400_000).toISOString().slice(0, 10),
        amount: -((i * 7919) % 100000),
        note: `Operacja ${i}: zakupy spożywcze, Biedronka, karta. `.repeat(3)
      })
      writes.push(fs.writeFile(join(store.root, txPath(t)), `${JSON.stringify(t, null, 2)}\n`))
    }
    await Promise.all(writes)
    // The disk of this machine: every file read and parsed directly (a busy Windows CI runner is several times
    // slower than usual – the limit follows it instead of failing a fixed 5 s).
    const r0 = performance.now()
    const files = (await fs.readdir(join(store.root, 'transactions'), { recursive: true })).filter((f) => f.endsWith('.json'))
    await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(join(store.root, 'transactions', f), 'utf8')) as unknown))
    const raw = performance.now() - r0
    const s2 = new DataStore(store.root, { machineName: 'X' })
    const t0 = performance.now()
    const snap = await s2.open()
    const ms = performance.now() - t0
    console.log(`5000 operacji wczytane w ${Math.round(ms)} ms (sam odczyt plików: ${Math.round(raw)} ms)`)
    expect(snap.records.transactions).toHaveLength(5000)
    expect(snap.problems).toEqual([])
    expect(ms).toBeLessThan(Math.max(5000, raw * 8))
    const t1 = performance.now()
    expect(await s2.refresh()).toBeNull()
    console.log(`pełny reskan bez zmian: ${Math.round(performance.now() - t1)} ms`)
  })
})
