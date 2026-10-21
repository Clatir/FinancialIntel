// The phone's sync with OneDrive (T304, IP0.1, IP0.5): the first copy of the folder, the computers' changes in, the
// phone's changes out with the version they replace, conflicts kept as copies, folders, links and failures.
import { beforeEach, describe, expect, it } from 'vitest'
import { DataStore } from '../../src/main/datastore/store'
import { useVfs } from '../../src/mobile/node/fs'
import { MemoryPersistence, Vfs } from '../../src/mobile/vfs/vfs'
import { MemorySyncPersistence } from '../../src/mobile/sync/state'
import { GraphClient } from '../../src/mobile/sync/graph'
import { NetworkError } from '../../src/mobile/sync/http'
import { MIRROR, SyncEngine, mirrored } from '../../src/mobile/sync/engine'
import type { ChangeSet } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { newId } from '@shared/ids'
import { recordRelPath } from '@shared/paths'
import { serializeRecord } from '@shared/records'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, goalSchema, transactionSchema, type Goal, type Transaction } from '@shared/schema'
import { FakeDrive } from './fakeGraph'

const CREATED = '2026-01-01T00:00:00.000Z'
const FOLDER = 'FinancialIntel'
const dec = new TextDecoder()

function tx(over: Partial<Transaction> = {}): Transaction {
  return transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: CREATED, updatedAt: CREATED, updatedBy: 'DOM-PC', date: '2026-03-16', accountId: MBANK_ACCOUNT_ID, amount: -4599, note: '', ...over })
}

function goal(over: Partial<Goal> = {}): Goal {
  return goalSchema.parse({ schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: CREATED, updatedAt: CREATED, name: 'Wakacje', target: 500000, ...over })
}

interface Setup {
  drive: FakeDrive
  vfs: Vfs
  persistence: MemoryPersistence
  state: MemorySyncPersistence
  engine: SyncEngine
  rootId: string
  t: Transaction
  slept: number[]
  renewals: number
}

let s: Setup

async function engineFor(o: Pick<Setup, 'drive' | 'vfs' | 'state' | 'rootId'>, apply?: (rels: string[], write: () => Promise<void>) => Promise<void>, hooks: { slept: number[]; renew?: () => Promise<boolean> } = { slept: [] }) {
  const graph = new GraphClient({ http: o.drive.http, token: async () => o.drive.token, renew: hooks.renew ?? (async () => false), base: o.drive.base, sleep: async (ms) => void hooks.slept.push(ms) })
  const engine = new SyncEngine({ vfs: o.vfs, graph, state: o.state, rootId: o.rootId, apply, now: () => new Date('2026-10-21T10:15:00.000Z') })
  await engine.init()
  return engine
}

beforeEach(async () => {
  const drive = new FakeDrive()
  const t = tx()
  drive.put(`${FOLDER}/fi.json`, serializeRecord('fi', createDefaultSettings(CREATED)))
  drive.put(`${FOLDER}/${recordRelPath('transactions', t)}`, serializeRecord('transactions', t))
  drive.put(`${FOLDER}/.history/transactions/${t.id}/20260101T000000Z_edit_ab.json`, '{}')
  drive.put(`${FOLDER}/backups/daily/2026-10-20.zip`, 'zip')
  drive.put(`${FOLDER}/.presence/DOM-PC.json`, JSON.stringify({ machine: 'DOM-PC', lastSeen: '2026-10-21T10:00:00.000Z', activeAt: '2026-10-21T10:00:00.000Z' }))
  drive.put(`${FOLDER}/transactions/2026/.2026-03-16_X.json.tmp-1a2b`, 'half')
  drive.put('Inne/plik.json', '{}')
  const persistence = new MemoryPersistence()
  const vfs = new Vfs(persistence, { synced: (p) => p.startsWith(`${MIRROR}/`) })
  await vfs.load()
  useVfs(vfs)
  const state = new MemorySyncPersistence()
  const rootId = drive.find(FOLDER)!.id
  const slept: number[] = []
  s = { drive, vfs, persistence, state, rootId, t, slept, renewals: 0, engine: undefined as unknown as SyncEngine }
  s.engine = await engineFor(s, undefined, { slept, renew: async () => (s.renewals++, true) })
})

const local = (rel: string) => {
  const e = s.vfs.get(`${MIRROR}/${rel}`)
  return e?.data ? dec.decode(e.data) : null
}
const mirrorFiles = () =>
  s.vfs
    .files()
    .map((p) => p.slice(MIRROR.length + 1))
    .sort()

describe('telefon: pierwsza kopia folderu z OneDrive', () => {
  it('tylko dane folderu i obecność komputerów – bez historii wersji, kopii zapasowych i plików tymczasowych', async () => {
    const progress: Array<[number, number]> = []
    const res = await s.engine.pull((done, total) => progress.push([done, total]))
    expect(mirrorFiles()).toEqual(['.presence/DOM-PC.json', 'fi.json', recordRelPath('transactions', s.t)])
    expect(res.changed.sort()).toEqual(mirrorFiles())
    expect(progress.at(-1)).toEqual([3, 3])
    expect(local(recordRelPath('transactions', s.t))).toBe(s.drive.read(`${FOLDER}/${recordRelPath('transactions', s.t)}`))
    expect(s.vfs.dirtyEntries()).toEqual([])
    // The data store of the computers opens it as it is.
    const snap = await new DataStore(MIRROR, { machineName: 'iPhone' }).open()
    expect(snap.records.transactions.map((e) => e.record.id)).toEqual([s.t.id])
    expect(snap.fi.settings.shipName).toBe('Flagowiec')
  })

  it('wybór plików: dane, ustawienia i obecność tak; historia, kopie, ukryte i nie-JSON nie', () => {
    expect(mirrored('fi.json')).toBe(true)
    expect(mirrored('transactions/2026/2026-03-16_X.json')).toBe(true)
    expect(mirrored('.presence/DOM-PC.json')).toBe(true)
    expect(mirrored('.history/transactions/X/a.json')).toBe(false)
    expect(mirrored('backups/daily/a.json')).toBe(false)
    expect(mirrored('transactions/2026/.a.json.tmp-12')).toBe(false)
    expect(mirrored('transactions/.ukryty/a.json')).toBe(false)
    expect(mirrored('notatki.txt')).toBe(false)
  })

  it('strony delty i kolejność (dziecko przed nowym rodzicem) nie mają znaczenia', async () => {
    s.drive.pageSize = 2
    await s.engine.pull()
    s.drive.reverseDelta = true
    const later = tx({ date: '2027-01-05' })
    s.drive.put(`${FOLDER}/${recordRelPath('transactions', later)}`, serializeRecord('transactions', later))
    const res = await s.engine.pull()
    expect(res.changed).toEqual([recordRelPath('transactions', later)])
    expect(local(recordRelPath('transactions', later))).not.toBeNull()
  })
})

describe('telefon: zmiany z komputera', () => {
  it('nowy, zmieniony i usunięty plik; bez zmian nic się nie pobiera', async () => {
    await s.engine.pull()
    const g = goal()
    s.drive.put(`${FOLDER}/goals/${g.id}.json`, serializeRecord('goals', g))
    const changed = { ...s.t, amount: -100, updatedAt: '2026-10-21T09:00:00.000Z' }
    s.drive.put(`${FOLDER}/${recordRelPath('transactions', s.t)}`, serializeRecord('transactions', changed))
    s.drive.remove(`${FOLDER}/.presence/DOM-PC.json`)
    const res = await s.engine.pull()
    expect(res.changed.sort()).toEqual(['.presence/DOM-PC.json', `goals/${g.id}.json`, recordRelPath('transactions', s.t)].sort())
    expect(JSON.parse(local(recordRelPath('transactions', s.t))!)).toMatchObject({ amount: -100 })
    expect(local('.presence/DOM-PC.json')).toBeNull()
    s.drive.log.length = 0
    expect((await s.engine.pull()).changed).toEqual([])
    expect(s.drive.log.filter((l) => l.includes('__download'))).toEqual([])
  })

  it('przeniesiony plik i przemianowany folder idą za swoim id', async () => {
    const g = goal()
    s.drive.put(`${FOLDER}/goals/${g.id}.json`, serializeRecord('goals', g))
    await s.engine.pull()
    s.drive.rename(`${FOLDER}/goals/${g.id}.json`, `${FOLDER}/goals/${g.id}-DOM-PC.json`)
    await s.engine.pull()
    expect(local(`goals/${g.id}.json`)).toBeNull()
    expect(local(`goals/${g.id}-DOM-PC.json`)).not.toBeNull()
    s.drive.rename(`${FOLDER}/transactions/2026`, `${FOLDER}/transactions/2025`)
    await s.engine.pull()
    const rel = recordRelPath('transactions', s.t)
    expect(local(rel)).toBeNull()
    expect(local(rel.replace('/2026/', '/2025/'))).not.toBeNull()
  })

  it('usunięty cały folder usuwa jego pliki (delta zgłasza tylko folder)', async () => {
    const g = goal()
    s.drive.put(`${FOLDER}/goals/${g.id}.json`, serializeRecord('goals', g))
    await s.engine.pull()
    s.drive.remove(`${FOLDER}/goals`)
    await s.engine.pull()
    expect(local(`goals/${g.id}.json`)).toBeNull()
  })

  it('przeterminowany link delty (410) – cały folder porównany od nowa, usunięte w międzyczasie znikają', async () => {
    await s.engine.pull()
    s.drive.remove(`${FOLDER}/${recordRelPath('transactions', s.t)}`)
    s.drive.expireBefore = Number.MAX_SAFE_INTEGER
    const res = await s.engine.pull()
    expect(res.changed).toContain(recordRelPath('transactions', s.t))
    expect(local(recordRelPath('transactions', s.t))).toBeNull()
    expect(local('fi.json')).not.toBeNull()
  })

  it('zmiany idą do magazynu danych w jego kolejce – okno dostaje zmianę z zewnątrz', async () => {
    await s.engine.pull()
    const store = new DataStore(MIRROR, { machineName: 'iPhone' })
    await store.open()
    const changes: ChangeSet[] = []
    const engine = await engineFor(s, async (rels, write) => {
      const c = await store.applyExternal(rels, write)
      if (c) changes.push(c)
    })
    const other = tx({ amount: -777 })
    s.drive.put(`${FOLDER}/${recordRelPath('transactions', other)}`, serializeRecord('transactions', other))
    await engine.pull()
    expect(changes.flatMap((c) => c.upserts.map((u) => u.entry.record.id))).toEqual([other.id])
    expect(changes[0]!.origin).toBe('external')
  })
})

describe('telefon: zmiany z telefonu na OneDrive', () => {
  it('nowa operacja idzie w całości, bez ponownego pobrania przy następnej delcie', async () => {
    await s.engine.pull()
    const store = new DataStore(MIRROR, { machineName: 'iPhone' })
    await store.open()
    const t = tx({ amount: -1234 })
    const { entry } = await store.saveRecord('transactions', t)
    expect(s.engine.pending()).toBe(1)
    const res = await s.engine.push()
    expect(res.sent).toBe(1)
    expect(s.drive.read(`${FOLDER}/${entry.relPath}`)).toBe(local(entry.relPath))
    expect(s.engine.pending()).toBe(0)
    s.drive.log.length = 0
    expect((await s.engine.pull()).changed).toEqual([])
    expect(s.drive.log.some((l) => l.includes('__download'))).toBe(false)
  })

  it('zmiana pliku zastępuje dokładnie wersję wczytaną (If-Match)', async () => {
    await s.engine.pull()
    const store = new DataStore(MIRROR, { machineName: 'iPhone' })
    await store.open()
    await store.saveRecord('transactions', { ...s.t, amount: -1 })
    await s.engine.push()
    expect(JSON.parse(s.drive.read(`${FOLDER}/${recordRelPath('transactions', s.t)}`)!)).toMatchObject({ amount: -1, updatedBy: 'iPhone' })
  })

  it('ta sama operacja zmieniona na komputerze i na telefonie: komputer zostaje, telefon obok jako kopia', async () => {
    await s.engine.pull()
    const store = new DataStore(MIRROR, { machineName: 'iPhone' })
    await store.open()
    const engine = await engineFor(s, async (rels, write) => void (await store.applyExternal(rels, write)))
    const rel = recordRelPath('transactions', s.t)
    await store.saveRecord('transactions', { ...s.t, amount: -2 })
    s.drive.put(`${FOLDER}/${rel}`, serializeRecord('transactions', { ...s.t, amount: -3, updatedAt: '2026-10-21T09:00:00.000Z' }))
    const first = await engine.push()
    expect(first.copies).toEqual([rel.replace(/\.json$/, '-telefon-20261021T101500Z.json')])
    expect(JSON.parse(local(rel)!)).toMatchObject({ amount: -3 })
    expect(JSON.parse(local(first.copies[0]!)!)).toMatchObject({ amount: -2 })
    await engine.push()
    expect(JSON.parse(s.drive.read(`${FOLDER}/${first.copies[0]!}`)!)).toMatchObject({ amount: -2 })
    expect(JSON.parse(s.drive.read(`${FOLDER}/${rel}`)!)).toMatchObject({ amount: -3 })
    // The data store shows the conflict: Synchronizacja on a computer decides.
    const snap = await store.snapshot()
    expect(snap.conflicts.map((c) => [c.canonical.relPath, c.source])).toEqual([[rel, 'zmiana z telefonu w tym samym czasie co na komputerze']])
  })

  it('zmiana na telefonie bez sieci, w tym czasie inna na komputerze: delta robi kopię, a ta sama treść kopii nie robi', async () => {
    await s.engine.pull()
    const store = new DataStore(MIRROR, { machineName: 'iPhone' })
    await store.open()
    const rel = recordRelPath('transactions', s.t)
    await store.saveRecord('transactions', { ...s.t, amount: -5 })
    s.drive.put(`${FOLDER}/${rel}`, serializeRecord('transactions', { ...s.t, amount: -6, updatedAt: '2026-10-21T09:00:00.000Z' }))
    const res = await s.engine.pull()
    expect(res.copies).toHaveLength(1)
    expect(JSON.parse(local(rel)!)).toMatchObject({ amount: -6 })
    // The same bytes on both sides: no copy, the mark goes.
    const g = goal()
    const text = serializeRecord('goals', g)
    await s.vfs.writeFile(`${MIRROR}/goals/${g.id}.json`, text).catch(async () => {
      await s.vfs.mkdir(`${MIRROR}/goals`, { recursive: true })
      await s.vfs.writeFile(`${MIRROR}/goals/${g.id}.json`, text)
    })
    s.drive.put(`${FOLDER}/goals/${g.id}.json`, text)
    const again = await s.engine.pull()
    expect(again.copies).toEqual([])
    expect(s.vfs.get(`${MIRROR}/goals/${g.id}.json`)!.dirty).toBe(0)
  })

  it('nowy plik o nazwie, którą w tym czasie zapisał komputer (plan miesiąca z dwóch miejsc) – kopia, nie nadpisanie', async () => {
    await s.engine.pull()
    await s.vfs.mkdir(`${MIRROR}/months`, { recursive: true })
    await s.vfs.writeFile(`${MIRROR}/months/2026-10.json`, '{"z":"telefon"}\n')
    s.drive.put(`${FOLDER}/months/2026-10.json`, '{"z":"komputer"}\n')
    const res = await s.engine.push()
    expect(res.copies).toHaveLength(1)
    expect(s.drive.read(`${FOLDER}/months/2026-10.json`)).toBe('{"z":"komputer"}\n')
    await s.engine.push()
    expect(s.drive.files(FOLDER).filter((f) => f.startsWith('months/'))).toEqual(['months/2026-10-telefon-20261021T101500Z.json', 'months/2026-10.json'])
  })

  it('usunięcie z telefonu trafia do Kosza OneDrive; zmienione w tym czasie na komputerze wraca', async () => {
    await s.engine.pull()
    const store = new DataStore(MIRROR, { machineName: 'iPhone' })
    await store.open()
    const engine = await engineFor(s, async (rels, write) => void (await store.applyExternal(rels, write)))
    const g = goal()
    const { entry } = await store.saveRecord('goals', g)
    await engine.push()
    await store.deleteRecord('goals', g.id)
    await engine.push()
    expect(s.drive.read(`${FOLDER}/${entry.relPath}`)).toBeNull()
    // Removed here, changed on a computer before the removal went: the computer's version comes back.
    const rel = recordRelPath('transactions', s.t)
    await store.deleteRecord('transactions', s.t.id)
    s.drive.put(`${FOLDER}/${rel}`, serializeRecord('transactions', { ...s.t, amount: -9, updatedAt: '2026-10-21T09:00:00.000Z' }))
    await engine.push()
    expect(JSON.parse(local(rel)!)).toMatchObject({ amount: -9 })
    expect((await store.snapshot()).records.transactions.map((e) => e.record.id)).toEqual([s.t.id])
  })

  it('usunięty na komputerze, zmieniony na telefonie: zostaje i wraca na OneDrive jako nowy plik', async () => {
    await s.engine.pull()
    const store = new DataStore(MIRROR, { machineName: 'iPhone' })
    await store.open()
    const rel = recordRelPath('transactions', s.t)
    await store.saveRecord('transactions', { ...s.t, amount: -11 })
    s.drive.remove(`${FOLDER}/${rel}`)
    await s.engine.pull()
    expect(JSON.parse(local(rel)!)).toMatchObject({ amount: -11 })
    await s.engine.push()
    expect(JSON.parse(s.drive.read(`${FOLDER}/${rel}`)!)).toMatchObject({ amount: -11 })
  })

  it('obecność telefonu zawsze nadpisuje swój plik; folder nowego roku powstaje, gdy go brak', async () => {
    await s.engine.pull()
    await s.vfs.mkdir(`${MIRROR}/.presence`, { recursive: true })
    s.drive.put(`${FOLDER}/.presence/iPhone.json`, '{"stary":true}')
    await s.vfs.writeFile(`${MIRROR}/.presence/iPhone.json`, '{"machine":"iPhone"}')
    await s.engine.push()
    expect(s.drive.read(`${FOLDER}/.presence/iPhone.json`)).toBe('{"machine":"iPhone"}')
    s.drive.autoFolders = false
    const store = new DataStore(MIRROR, { machineName: 'iPhone' })
    await store.open()
    const t = tx({ date: '2028-02-02' })
    const { entry } = await store.saveRecord('transactions', t)
    await s.engine.push()
    expect(s.drive.read(`${FOLDER}/${entry.relPath}`)).not.toBeNull()
  })

  it('usunięty na telefonie w trakcie wysyłania – usunięty i na OneDrive', async () => {
    await s.engine.pull()
    await s.vfs.mkdir(`${MIRROR}/goals`, { recursive: true })
    const g = goal()
    await s.vfs.writeFile(`${MIRROR}/goals/${g.id}.json`, serializeRecord('goals', g))
    const http = s.drive.http
    const graph = new GraphClient({
      http: async (req) => {
        const res = await http(req)
        if (req.method === 'PUT' && req.url.includes(g.id)) await s.vfs.rm(`${MIRROR}/goals/${g.id}.json`)
        return res
      },
      token: async () => s.drive.token,
      renew: async () => false,
      base: s.drive.base,
      sleep: async () => undefined
    })
    const engine = new SyncEngine({ vfs: s.vfs, graph, state: s.state, rootId: s.rootId })
    await engine.init()
    await engine.push()
    expect(s.drive.read(`${FOLDER}/goals/${g.id}.json`)).toBeNull()
    expect(s.vfs.get(`${MIRROR}/goals/${g.id}.json`)).toBeUndefined()
  })
})

describe('telefon: sieć i Graph', () => {
  it('ograniczenie (429) czeka tyle, ile każe Retry-After, i próbuje ponownie', async () => {
    s.drive.throttleNext(2, 7)
    await s.engine.pull()
    expect(s.slept).toEqual([7000, 7000])
    expect(local('fi.json')).not.toBeNull()
  })

  it('wygasły token odnowiony raz, potem żądanie jeszcze raz', async () => {
    s.drive.token = 'token-2'
    const graph = new GraphClient({
      http: s.drive.http,
      token: async () => (s.renewals ? 'token-2' : 'token-1'),
      renew: async () => (s.renewals++, true),
      base: s.drive.base,
      sleep: async () => undefined
    })
    const engine = new SyncEngine({ vfs: s.vfs, graph, state: s.state, rootId: s.rootId })
    await engine.init()
    await engine.pull()
    expect(s.renewals).toBe(1)
    expect(local('fi.json')).not.toBeNull()
  })

  it('bez sieci – błąd sieci, nic nie zmienione; z siecią dokończone', async () => {
    s.drive.offline = true
    await expect(s.engine.pull()).rejects.toBeInstanceOf(NetworkError)
    expect(mirrorFiles()).toEqual([])
    s.drive.offline = false
    await s.engine.pull()
    expect(mirrorFiles()).toHaveLength(3)
  })

  it('stan synchronizacji zostaje między uruchomieniami: następna delta tylko od ostatniej', async () => {
    await s.engine.pull()
    const again = new Vfs(s.persistence, { synced: (p) => p.startsWith(`${MIRROR}/`) })
    await again.load()
    useVfs(again)
    const engine = await engineFor({ ...s, vfs: again })
    s.drive.log.length = 0
    expect((await engine.pull()).changed).toEqual([])
    expect(s.drive.log.filter((l) => l.includes('__download'))).toEqual([])
  })
})
