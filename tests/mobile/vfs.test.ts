// The phone's mirror of the data folder (T303): the file system of `vfs/vfs.ts` behind `node:fs`, and the data store of
// the computers running over it unchanged.
import { createHash as nodeHash } from 'crypto'
import nodePath from 'path'
import { beforeEach, describe, expect, it } from 'vitest'
import { DataStore } from '../../src/main/datastore/store'
import { useVfs } from '../../src/mobile/node/fs'
import { sha1Hex } from '../../src/mobile/node/crypto'
import * as path from '../../src/mobile/node/path'
import { MemoryPersistence, Vfs } from '../../src/mobile/vfs/vfs'
import { createDefaultSettings } from '@shared/defaults'
import { newId } from '@shared/ids'
import { recordRelPath } from '@shared/paths'
import { serializeRecord } from '@shared/records'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

const ROOT = '/fi'
const CREATED = '2026-01-01T00:00:00.000Z'
const text = (b: Uint8Array | null | undefined) => (b ? new TextDecoder().decode(b) : null)
const bytes = (s: string) => new TextEncoder().encode(s)

function tx(over: Partial<Transaction> = {}): Transaction {
  return transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: CREATED, updatedAt: CREATED, date: '2026-03-16', accountId: MBANK_ACCOUNT_ID, amount: -4599, note: '', ...over })
}

let persistence: MemoryPersistence
let vfs: Vfs

beforeEach(async () => {
  persistence = new MemoryPersistence()
  vfs = new Vfs(persistence, { synced: (p) => p.startsWith(`${ROOT}/`) })
  await vfs.load()
  useVfs(vfs)
})

async function freshFolder(): Promise<DataStore> {
  await DataStore.initialize(ROOT, createDefaultSettings(CREATED))
  const store = new DataStore(ROOT, { machineName: 'iPhone' })
  await store.open()
  return store
}

describe('lustro folderu na telefonie: system plików', () => {
  it('katalogi, zapis, odczyt, lista i błędy jak w systemie', async () => {
    await expect(vfs.stat('/fi')).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(vfs.writeFile('/fi/a.json', '{}')).rejects.toMatchObject({ code: 'ENOENT' })
    await vfs.mkdir('/fi/transactions/2026', { recursive: true })
    await vfs.writeFile('/fi/fi.json', '{"a":1}')
    await vfs.writeFile('/fi/transactions/2026/x.json', 'ą')
    expect((await vfs.stat('/fi')).isDirectory()).toBe(true)
    const st = await vfs.stat('/fi/transactions/2026/x.json')
    expect(st.isFile()).toBe(true)
    expect(st.size).toBe(2)
    expect(await vfs.readdir('/fi')).toEqual(['fi.json', 'transactions'])
    const entries = await vfs.readdirEntries('/fi')
    expect(entries.map((e) => [e.name, e.isFile()])).toEqual([
      ['fi.json', true],
      ['transactions', false]
    ])
    await expect(vfs.readdir('/fi/fi.json')).rejects.toMatchObject({ code: 'ENOTDIR' })
    await expect(vfs.readdir('/fi/nie-ma')).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(vfs.mkdir('/fi/transactions')).rejects.toMatchObject({ code: 'EEXIST' })
    await expect(vfs.rm('/fi/transactions')).rejects.toMatchObject({ code: 'EISDIR' })
    await expect(vfs.rm('/fi/nie-ma.json')).rejects.toMatchObject({ code: 'ENOENT' })
    await vfs.rm('/fi/nie-ma.json', { force: true })
    expect(text(await vfs.readFile('/fi/transactions/2026/x.json'))).toBe('ą')
  })

  it('czas pliku rośnie przy każdym zapisie, nawet w tej samej milisekundzie', async () => {
    await vfs.mkdir('/fi', { recursive: true })
    const times = new Set<number>()
    for (let i = 0; i < 20; i++) {
      await vfs.writeFile('/fi/a.json', 'x')
      times.add((await vfs.stat('/fi/a.json')).mtimeMs)
    }
    expect(times.size).toBe(20)
  })

  it('zmiana tutaj czeka na wysłanie; usunięcie pliku z OneDrive zostawia nagrobek, plik tymczasowy nigdy nie trafia do bazy', async () => {
    await vfs.mkdir('/fi', { recursive: true })
    const changes: string[] = []
    vfs.onLocalChange((c) => changes.push(`${c.removed ? '-' : '+'}${c.path}`))
    await vfs.writeFile('/fi/.a.json.tmp-1234', 'x')
    await vfs.rename('/fi/.a.json.tmp-1234', '/fi/a.json')
    await vfs.flushed()
    expect(changes).toEqual(['+/fi/a.json'])
    expect([...persistence.entries.keys()]).toEqual(['/fi/a.json'])
    expect(vfs.dirtyEntries().map((e) => e.path)).toEqual(['/fi/a.json'])
    // Never on OneDrive: removed here, nothing to send.
    await vfs.rm('/fi/a.json')
    expect(vfs.dirtyEntries()).toEqual([])
    // On OneDrive: a tombstone until the removal is sent.
    await vfs.applyRemote('/fi/b.json', bytes('b'), { id: 'B', eTag: 'e1', cTag: 'c1' })
    expect(vfs.dirtyEntries()).toEqual([])
    await vfs.rm('/fi/b.json')
    const [tomb] = vfs.dirtyEntries()
    expect(tomb).toMatchObject({ path: '/fi/b.json', data: null, meta: { id: 'B' } })
    await expect(vfs.stat('/fi/b.json')).rejects.toMatchObject({ code: 'ENOENT' })
    await vfs.markSynced('/fi/b.json', tomb!.dirty, null)
    expect(vfs.get('/fi/b.json')).toBeUndefined()
  })

  it('wysłana zmiana traci znak, chyba że plik zmienił się w trakcie wysyłania', async () => {
    await vfs.mkdir('/fi', { recursive: true })
    await vfs.writeFile('/fi/a.json', '1')
    const first = vfs.get('/fi/a.json')!.dirty
    await vfs.writeFile('/fi/a.json', '2')
    await vfs.markSynced('/fi/a.json', first, { id: 'A', eTag: 'e1', cTag: 'c1' })
    expect(vfs.get('/fi/a.json')).toMatchObject({ meta: { eTag: 'e1' } })
    expect(vfs.get('/fi/a.json')!.dirty).toBeGreaterThan(first)
    await vfs.markSynced('/fi/a.json', vfs.get('/fi/a.json')!.dirty, { id: 'A', eTag: 'e2', cTag: 'c2' })
    expect(vfs.dirtyEntries()).toEqual([])
  })

  it('stan zostaje między uruchomieniami (IndexedDB), razem ze znakami do wysłania', async () => {
    await vfs.mkdir('/fi/goals', { recursive: true })
    await vfs.writeFile('/fi/goals/g.json', 'g')
    await vfs.applyRemote('/fi/fi.json', bytes('{}'), { id: 'F', eTag: 'e', cTag: 'c' })
    await vfs.flushed()
    const again = new Vfs(persistence, { synced: (p) => p.startsWith(`${ROOT}/`) })
    await again.load()
    expect(again.files().sort()).toEqual(['/fi/fi.json', '/fi/goals/g.json'])
    expect(again.dirtyEntries().map((e) => e.path)).toEqual(['/fi/goals/g.json'])
    expect(await again.readdir('/fi')).toEqual(['fi.json', 'goals'])
    // The order of the changes goes on from where it was.
    await again.writeFile('/fi/goals/h.json', 'h')
    expect(again.get('/fi/goals/h.json')!.dirty).toBeGreaterThan(again.get('/fi/goals/g.json')!.dirty)
  })

  it('nieudany zapis w bazie mówi o błędzie temu, kto zapisywał – kolejne zapisy działają', async () => {
    await vfs.mkdir('/fi', { recursive: true })
    persistence.failNext = new Error('QuotaExceededError')
    await expect(vfs.writeFile('/fi/a.json', '1')).rejects.toThrow('QuotaExceededError')
    await vfs.writeFile('/fi/b.json', '2')
    await vfs.flushed()
    expect(persistence.entries.has('/fi/b.json')).toBe(true)
  })
})

describe('lustro folderu na telefonie: magazyn danych komputerów bez zmian', () => {
  it('nowy folder, zapis operacji i plik jak na Windows', async () => {
    const store = await freshFolder()
    const t = tx()
    const { entry } = await store.saveRecord('transactions', t)
    expect(entry.relPath).toBe(recordRelPath('transactions', t))
    const saved = JSON.parse(text(await vfs.readFile(`${ROOT}/${entry.relPath}`))!) as Transaction
    expect(saved).toMatchObject({ id: t.id, amount: -4599, updatedBy: 'iPhone' })
    expect(vfs.dirtyEntries().map((e) => e.path)).toContain(`${ROOT}/${entry.relPath}`)
  })

  it('zmiana z drugiego komputera wchodzi przez odświeżenie wskazanych plików', async () => {
    const store = await freshFolder()
    const t = tx()
    const { entry } = await store.saveRecord('transactions', t)
    const theirs = { ...t, amount: -1000, updatedAt: '2026-03-17T10:00:00.000Z', updatedBy: 'DOM-PC' }
    await vfs.applyRemote(`${ROOT}/${entry.relPath}`, bytes(serializeRecord('transactions', theirs)), { id: 'T', eTag: 'e2', cTag: 'c2' })
    const change = await store.refresh([entry.relPath])
    expect(change?.origin).toBe('external')
    expect(change?.upserts.map((u) => (u.entry.record as Transaction).amount)).toEqual([-1000])
    // Another computer's new file and its removal of a file.
    const other = tx({ amount: -250 })
    const rel = recordRelPath('transactions', other)
    await vfs.applyRemote(`${ROOT}/${rel}`, bytes(serializeRecord('transactions', other)), { id: 'O', eTag: 'e', cTag: 'c' })
    expect((await store.refresh([rel]))?.upserts.map((u) => u.entry.record.id)).toEqual([other.id])
    await vfs.applyRemote(`${ROOT}/${rel}`, null, null)
    expect((await store.refresh([rel]))?.removals).toEqual([{ collection: 'transactions', id: other.id }])
  })

  it('kopia konfliktu z telefonu („-iPhone”) to konflikt do rozstrzygnięcia w Synchronizacji', async () => {
    const store = await freshFolder()
    const t = tx()
    const { entry } = await store.saveRecord('transactions', t)
    const copy = entry.relPath.replace(/\.json$/, '-iPhone.json')
    await vfs.applyRemote(`${ROOT}/${copy}`, bytes(serializeRecord('transactions', { ...t, amount: -1 })), { id: 'C', eTag: 'e', cTag: 'c' })
    const change = await store.refresh([copy])
    expect(change?.conflicts.map((c) => [c.id, c.canonical.relPath])).toEqual([[copy, entry.relPath]])
  })

  it('folder otwarty po ponownym uruchomieniu z IndexedDB ma te same wpisy', async () => {
    const store = await freshFolder()
    const t = tx()
    await store.saveRecord('transactions', t)
    await vfs.flushed()
    const again = new Vfs(persistence, { synced: (p) => p.startsWith(`${ROOT}/`) })
    await again.load()
    useVfs(again)
    const reopened = new DataStore(ROOT, { machineName: 'iPhone' })
    const snap = await reopened.open()
    expect(snap.records.transactions.map((e) => e.record.id)).toEqual([t.id])
  })
})

describe('telefon: skrót SHA-1 i ścieżki jak w Node', () => {
  it('SHA-1 jak node:crypto', () => {
    const samples = ['', 'a', 'abc', 'ą ę ó ł', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'y'.repeat(1000)]
    for (const s of samples) expect(sha1Hex(bytes(s))).toBe(nodeHash('sha1').update(s).digest('hex'))
    const big = new Uint8Array(100_000).map((_, i) => (i * 31) % 256)
    expect(sha1Hex(big)).toBe(nodeHash('sha1').update(big).digest('hex'))
  })

  it('ścieżki POSIX jak node:path', () => {
    const cases: string[][] = [['/fi', 'transactions', '2026'], ['/fi/', '../x'], ['a', 'b/../c'], ['/a/b/', ''], ['/']]
    for (const c of cases) expect(path.join(...c)).toBe(nodePath.posix.join(...c))
    for (const p of ['/fi/a.json', '/fi/', 'a', '/', 'a/b/c.json', '/a//b']) {
      expect(path.dirname(p)).toBe(nodePath.posix.dirname(p))
      expect(path.basename(p)).toBe(nodePath.posix.basename(p))
      expect(path.extname(p)).toBe(nodePath.posix.extname(p))
      expect(path.normalize(p)).toBe(nodePath.posix.normalize(p))
    }
    expect(path.resolve('/fi', 'a/../b')).toBe(nodePath.posix.resolve('/fi', 'a/../b'))
    expect(path.relative('/fi', '/fi/transactions/2026/x.json')).toBe('transactions/2026/x.json')
    expect(path.relative('/fi/a', '/fi/b/c')).toBe(nodePath.posix.relative('/fi/a', '/fi/b/c'))
  })
})
