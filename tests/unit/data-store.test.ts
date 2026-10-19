// adapted from ICTTJ tests/unit/journal-store.test.ts @ 84a8339
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChangeSet, FolderStatus, RecordEntry, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type SettingsFile, type Transaction } from '@shared/schema'

// The renderer store talks to the main process through window.fi (preload); here it is a mock.
const api = {
  saveRecord: vi.fn(),
  saveRecords: vi.fn(),
  saveSettings: vi.fn(),
  deleteRecord: vi.fn(),
  deleteRecords: vi.fn(),
  historyKeep: vi.fn()
}
vi.stubGlobal('window', { fi: api })
const store = await import('../../src/renderer/store/data')
const { useRemote } = await import('../../src/renderer/store/remote')
const { useUi } = await import('../../src/renderer/store/ui')
type PendingRemote = import('../../src/renderer/store/remote').PendingRemote
type RemoteDecision = import('../../src/renderer/store/data').RemoteDecision

const ID = '01K6H3Z0W8Q4M2N5P7R9S1T3V5'
const ID2 = '01K6H3Z0W8Q4M2N5P7R9S1T3V6'

const status = (readOnly = false): FolderStatus => ({
  dataDir: '/dane',
  available: true,
  readOnly,
  readOnlyReason: readOnly ? 'tylko odczyt' : null,
  folderSchemaVersion: 1,
  appSchemaVersion: 1,
  otherMachines: [],
  migratedFrom: null,
  backupPath: null
})

const settings = (remoteChanges: 'merge' | 'ask' = 'merge'): SettingsFile => {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  return { ...fi, settings: { ...fi.settings, sync: { ...fi.settings.sync, remoteChanges } } }
}

function load(tx: Transaction, opts: { readOnly?: boolean; remoteChanges?: 'merge' | 'ask' } = {}): void {
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = [{ record: tx, relPath: `transactions/2026/2026-03-16_${tx.id}.json`, readOnly: false }]
  const snapshot: Snapshot = {
    fi: settings(opts.remoteChanges),
    records,
    problems: [],
    conflicts: [],
    status: status(opts.readOnly),
    loadMs: 0
  }
  store.applySnapshot(snapshot)
}

const transaction = (id = ID): Transaction =>
  transactionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id,
    createdAt: '2026-03-16T07:00:00.000Z',
    updatedAt: '2026-03-16T07:00:00.000Z',
    date: '2026-03-16',
    accountId: MBANK_ACCOUNT_ID,
    amount: -4599,
    note: ''
  })
const saved = (t: Transaction): RecordEntry<Transaction> => ({
  record: { ...t, updatedAt: '2026-03-16T08:00:00.000Z' },
  relPath: `transactions/${t.date.slice(0, 4)}/${t.date}_${t.id}.json`,
  readOnly: false
})
const current = (id = ID) => store.useData.getState().records.transactions[id]?.record
const change = (over: Partial<ChangeSet>) =>
  store.applyChange({ upserts: [], removals: [], fi: null, problems: [], conflicts: [], status: status(), origin: 'external', ...over })
const incoming = (t: Transaction): ChangeSet['upserts'][number] => ({
  collection: 'transactions',
  entry: { record: t, relPath: `transactions/${t.date.slice(0, 4)}/${t.date}_${t.id}.json`, readOnly: false }
})

beforeEach(() => {
  vi.useFakeTimers()
  api.saveRecord.mockReset()
  api.saveSettings.mockReset()
  api.saveRecords.mockReset()
  api.deleteRecord.mockReset()
  api.deleteRecords.mockReset()
  api.historyKeep.mockReset().mockResolvedValue(undefined)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('autozapis w rendererze', () => {
  it('nieudany zapis jest ponawiany sam, a zmiana nie przepada', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockRejectedValueOnce(new Error('EBUSY: plik zablokowany')).mockImplementation(async (_c: string, r: Transaction) => saved(r))
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'ważna notatka' }))
    await vi.advanceTimersByTimeAsync(450)
    expect(api.saveRecord).toHaveBeenCalledTimes(1)
    expect(store.useData.getState().save.error).toContain('EBUSY')
    expect(store.hasUnsaved()).toBe(true)

    await vi.advanceTimersByTimeAsync(2100)
    expect(api.saveRecord).toHaveBeenCalledTimes(2)
    expect(api.saveRecord.mock.calls[1]?.[1].note).toBe('ważna notatka')
    expect(store.hasUnsaved()).toBe(false)
    expect(store.useData.getState().save.error).toBeNull()
  })

  it('szybkie edycje: jeden zapis po chwili, najwyżej 2 s od pierwszej zmiany', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    for (let i = 0; i < 8; i++) {
      store.updateRecord('transactions', t.id, (r) => ({ ...r, note: `wersja ${i}` }))
      await vi.advanceTimersByTimeAsync(300)
    }
    // 8 × 300 ms of typing: written once at the 2 s limit, then the last edit.
    expect(api.saveRecord).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(450)
    expect(api.saveRecord).toHaveBeenCalledTimes(2)
    expect(api.saveRecord.mock.calls[1]?.[1].note).toBe('wersja 7')
    expect(store.hasUnsaved()).toBe(false)
  })

  it('„ponów” / zamknięcie okna (flushSaves) zapisuje też zmiany po nieudanym zapisie', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockRejectedValueOnce(new Error('dysk niedostępny')).mockImplementation(async (_c: string, r: Transaction) => saved(r))
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'x' }))
    await vi.advanceTimersByTimeAsync(450)
    expect(store.hasUnsaved()).toBe(true)
    await expect(store.flushSaves()).resolves.toBe(true)
    expect(api.saveRecord).toHaveBeenCalledTimes(2)
    expect(store.hasUnsaved()).toBe(false)
  })

  it('flushSaves zwraca false, gdy zapis wciąż się nie udaje (okno pyta przed zamknięciem)', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockRejectedValue(new Error('brak dostępu'))
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'x' }))
    await expect(store.flushSaves()).resolves.toBe(false)
    expect(store.hasUnsaved()).toBe(true)
  })

  it('w folderze tylko do odczytu edycje nie są przyjmowane (nie da się ich zapisać)', async () => {
    const t = transaction()
    load(t, { readOnly: true })
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'x' }))
    store.updateSettings((f) => ({ ...f, settings: { ...f.settings, shipName: 'Sokół' } }))
    store.addRecord('transactions', transaction(ID2))
    await vi.advanceTimersByTimeAsync(3000)
    expect(api.saveRecord).not.toHaveBeenCalled()
    expect(api.saveSettings).not.toHaveBeenCalled()
    expect(current()?.note).toBe('')
    expect(current(ID2)).toBeUndefined()
    expect(store.useData.getState().fi?.settings.shipName).not.toBe('Sokół')
  })

  it('wpis usunięty w trakcie zapisu nie wraca na listę', async () => {
    const t = transaction()
    load(t)
    let finish: (v: RecordEntry<Transaction>) => void = () => undefined
    api.saveRecord.mockImplementation((_c: string, r: Transaction) => new Promise((resolve) => (finish = () => resolve(saved(r)))))
    api.deleteRecord.mockResolvedValue(undefined)
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'x' }))
    await vi.advanceTimersByTimeAsync(450)
    const deleting = store.deleteRecord('transactions', t.id)
    finish(saved(t))
    await deleting
    expect(current()).toBeUndefined()
    expect(api.deleteRecord).toHaveBeenCalledWith('transactions', t.id)
  })

  it('nowa ścieżka po zmianie daty: nowsza lokalna edycja zostaje, ścieżka z zapisu', async () => {
    const t = transaction()
    load(t)
    let finish: () => void = () => undefined
    api.saveRecord.mockImplementation((_c: string, r: Transaction) => new Promise((resolve) => (finish = () => resolve(saved(r)))))
    store.updateRecord('transactions', t.id, (r) => ({ ...r, date: '2026-03-17' }))
    await vi.advanceTimersByTimeAsync(450)
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'później' }))
    finish()
    await vi.advanceTimersByTimeAsync(0)
    const entry = store.useData.getState().records.transactions[t.id]
    expect(entry?.relPath).toBe(`transactions/2026/2026-03-17_${t.id}.json`)
    expect(entry?.record.note).toBe('później')
    expect(store.hasUnsaved()).toBe(true)
    await vi.advanceTimersByTimeAsync(450)
    expect(api.saveRecord).toHaveBeenCalledTimes(2)
    finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(store.hasUnsaved()).toBe(false)
  })
})

describe('szkice i ustawienia', () => {
  it('szkic nie jest zapisywany do pierwszej edycji; nietknięty szkic znika bez zapisu', async () => {
    load(transaction())
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    api.deleteRecord.mockResolvedValue(undefined)
    store.addRecord('transactions', transaction(ID2), { draft: true })
    await vi.advanceTimersByTimeAsync(3000)
    expect(api.saveRecord).not.toHaveBeenCalled()
    expect(store.useData.getState().drafts[ID2]).toBe(true)
    store.discardDraft('transactions', ID2)
    expect(current(ID2)).toBeUndefined()

    store.addRecord('transactions', transaction(ID2), { draft: true })
    store.updateRecord('transactions', ID2, (r) => ({ ...r, note: 'pierwsza zmiana' }))
    expect(store.useData.getState().drafts[ID2]).toBeUndefined()
    await vi.advanceTimersByTimeAsync(450)
    expect(api.saveRecord).toHaveBeenCalledTimes(1)
    expect(current(ID2)?.note).toBe('pierwsza zmiana')
    // A draft deleted before its first edit was never on disk.
    const third = '01K6H3Z0W8Q4M2N5P7R9S1T3V7'
    store.addRecord('transactions', transaction(third), { draft: true })
    await store.deleteRecord('transactions', third)
    expect(api.deleteRecord).not.toHaveBeenCalled()
  })

  it('nowy wpis (nie szkic) jest zapisywany od razu', async () => {
    load(transaction())
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    store.addRecord('transactions', transaction(ID2))
    await vi.advanceTimersByTimeAsync(0)
    expect(api.saveRecord).toHaveBeenCalledWith('transactions', expect.objectContaining({ id: ID2 }))
    expect(store.useData.getState().records.transactions[ID2]?.relPath).toBe(`transactions/2026/2026-03-16_${ID2}.json`)
  })

  it('ustawienia (fi.json): zapis przez saveSettings, wynik z dysku przyjęty', async () => {
    load(transaction())
    api.saveSettings.mockImplementation(async (f: SettingsFile) => ({ ...f, updatedAt: '2026-03-16T09:00:00.000Z', updatedBy: 'PC-A' }))
    store.updateSettings((f) => ({ ...f, settings: { ...f.settings, shipName: 'Sokół' } }))
    expect(store.useData.getState().fi?.settings.shipName).toBe('Sokół')
    await vi.advanceTimersByTimeAsync(450)
    expect(api.saveSettings).toHaveBeenCalledTimes(1)
    expect(store.useData.getState().fi).toMatchObject({ updatedBy: 'PC-A', settings: { shipName: 'Sokół' } })
    expect(store.hasUnsaved()).toBe(false)
  })
})

describe('zmiany z drugiego komputera', () => {
  it('bez lokalnych edycji: przyjęte; usunięcie: usunięte', () => {
    const t = transaction()
    load(t)
    change({ upserts: [incoming({ ...t, amount: -5000, updatedAt: '2026-03-16T09:00:00.000Z' })] })
    expect(current()?.amount).toBe(-5000)
    change({ removals: [{ collection: 'transactions', id: t.id }] })
    expect(current()).toBeUndefined()
    expect(useRemote.getState().pending).toEqual([])
  })

  it('lokalna edycja innego pola: scalone i zapisane; to samo pole: pytanie, „ich” odkłada moją wersję do historii', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'moja' }))
    change({ upserts: [incoming({ ...t, amount: -5000, updatedAt: '2026-03-16T09:00:00.000Z', updatedBy: 'PC-B' })] })
    expect(current()).toMatchObject({ note: 'moja', amount: -5000 })
    await vi.advanceTimersByTimeAsync(450)
    expect(api.saveRecord).toHaveBeenCalledWith('transactions', expect.objectContaining({ note: 'moja', amount: -5000 }))

    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'moja 2' }))
    change({ upserts: [incoming({ ...t, note: 'z B', amount: -5000, updatedAt: '2026-03-16T10:00:00.000Z' })] })
    const pending = useRemote.getState().pending
    expect(pending.map((p) => [p.type, p.hadLocalEdits])).toEqual([['update', true]])
    // Waiting for a decision: not saved over the other computer's version.
    await vi.advanceTimersByTimeAsync(3000)
    expect(api.saveRecord).toHaveBeenCalledTimes(1)
    store.resolveRemote(pending[0]!.key, 'theirs')
    expect(current()?.note).toBe('z B')
    expect(api.historyKeep).toHaveBeenCalledWith('transactions', expect.objectContaining({ note: 'moja 2' }), 'discarded')
    expect(useRemote.getState().pending).toEqual([])
    expect(store.hasUnsaved()).toBe(false)
  })

  it('scalenie z wyborem pól: wybrane z ich strony, reszta moja, zapis od razu', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'moja', amount: -1 }))
    change({ upserts: [incoming({ ...t, note: 'z B', amount: -2, updatedAt: '2026-03-16T10:00:00.000Z' })] })
    const [item] = useRemote.getState().pending
    expect(item?.type).toBe('update')
    store.resolveRemote(item!.key, 'merge', { amount: 'theirs' })
    expect(current()).toMatchObject({ note: 'moja', amount: -2 })
    await vi.advanceTimersByTimeAsync(0)
    expect(api.saveRecord).toHaveBeenLastCalledWith('transactions', expect.objectContaining({ note: 'moja', amount: -2 }))
  })

  it('tryb „pytaj” i „Zaakceptuj nowsze”: bez lokalnych edycji wersja zapisana później', () => {
    const t = transaction()
    load(t, { remoteChanges: 'ask' })
    change({ upserts: [incoming({ ...t, amount: -5000, updatedAt: '2026-03-16T09:00:00.000Z' })] })
    const [item] = useRemote.getState().pending
    expect(item).toMatchObject({ type: 'update', hadLocalEdits: false })
    expect(current()?.amount).toBe(-4599)
    expect(store.newerOf(item!)).toEqual({ choice: 'theirs', fields: {}, newer: 'theirs' })
    expect(store.acceptNewer([item!.key, 'nieistniejący'])).toEqual({ decided: 1, left: 0 })
    expect(current()?.amount).toBe(-5000)
    expect(useRemote.getState().pending).toEqual([])
  })

  it('„Zaakceptuj nowsze”: usunięcie przy edycji sprzed jego przyjścia zostaje do decyzji', () => {
    const t = transaction()
    load(t)
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'moja' }))
    vi.advanceTimersByTime(10)
    change({ removals: [{ collection: 'transactions', id: t.id }] })
    const [item] = useRemote.getState().pending
    expect(item?.type).toBe('removal')
    expect(store.newerOf(item!)).toEqual({ choice: null, reason: 'removal' })
    expect(store.acceptNewer([item!.key])).toEqual({ decided: 0, left: 1 })
    expect(current()?.note).toBe('moja')
  })

  it('fi.json zmieniony na drugim komputerze przy lokalnej edycji innego pola: scalony', async () => {
    load(transaction())
    api.saveSettings.mockImplementation(async (f: SettingsFile) => f)
    store.updateSettings((f) => ({ ...f, settings: { ...f.settings, shipName: 'Sokół' } }))
    const theirs = settings()
    change({ fi: { ...theirs, updatedAt: '2026-03-16T09:00:00.000Z', settings: { ...theirs.settings, sync: { remoteChanges: 'ask' } } } })
    expect(store.useData.getState().fi?.settings).toMatchObject({ shipName: 'Sokół', sync: { remoteChanges: 'ask' } })
    await vi.advanceTimersByTimeAsync(450)
    expect(api.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ settings: expect.objectContaining({ shipName: 'Sokół' }) }))
  })

  it('własne zmiany (origin local) nie nadpisują niezapisanych edycji', () => {
    const t = transaction()
    load(t)
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'moja' }))
    change({ origin: 'local', upserts: [incoming({ ...t, note: 'z dysku' })] })
    expect(current()?.note).toBe('moja')
    expect(useRemote.getState().pending).toEqual([])
  })
})

describe('wpis przeniesiony na innym komputerze (W8-33)', () => {
  it('oczekujące „usunięty na innym komputerze” znika, gdy ten sam wpis wraca pod nową ścieżką', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    // A local edit not saved yet: the removal waits for a decision.
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'moja notatka' }))
    change({ removals: [{ collection: 'transactions', id: t.id }] })
    expect(useRemote.getState().pending.map((p) => p.type)).toEqual(['removal'])
    // The other computer changed the date: the record arrives under another path, with another field changed.
    const moved = { ...t, date: '2026-03-17', amount: -5000, updatedAt: '2026-03-17T08:00:00.000Z', updatedBy: 'PC-A' }
    change({ upserts: [incoming(moved)] })
    expect(useRemote.getState().pending).toEqual([])
    const now = current()
    expect(now?.note).toBe('moja notatka')
    expect(now?.amount).toBe(-5000)
    expect(now?.date).toBe('2026-03-17')
    expect(store.useData.getState().records.transactions[t.id]?.relPath).toBe(`transactions/2026/2026-03-17_${t.id}.json`)
  })
})

describe('zapis i usuwanie paczkami (1.4.3, przegląd grupy F)', () => {
  it('odpowiedź paczki, której nie da się przyjąć: zapisy ponawiane po jednym, flushSaves odpowiada', async () => {
    load(transaction())
    api.saveRecords.mockResolvedValueOnce(null)
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    store.addRecords('transactions', [transaction(ID2)])
    await vi.advanceTimersByTimeAsync(10)
    expect(api.saveRecords).toHaveBeenCalledTimes(1)
    expect(store.hasUnsaved()).toBe(true)
    // Not „saving” for ever, and the failure on screen; the retry by itself.
    expect(store.useData.getState().save).toMatchObject({ pending: 0, error: expect.any(String) })
    await expect(store.flushSaves()).resolves.toBe(true)
    expect(api.saveRecord.mock.calls.map((c) => c[1].id)).toEqual([ID2])
  })

  it('paczka zapisu, z której wpis zniknął z pamięci przed wysłaniem: nic nie zostaje „niezapisane” (przegląd 1.5.4)', async () => {
    load(transaction())
    api.saveRecords.mockImplementation(async (_c: string, rs: Transaction[]) => rs.map((r) => ({ id: r.id, entry: saved(r) })))
    const ID3 = '01K6H3Z0W8Q4M2N5P7R9S1T3V7'
    store.addRecords('transactions', [transaction(ID2), transaction(ID3)])
    // Gone from memory before the batch goes, its key not forgotten.
    store.useData.setState((s) => {
      const map = { ...s.records.transactions }
      delete map[ID2]
      return { records: { ...s.records, transactions: map } }
    })
    await vi.advanceTimersByTimeAsync(10)
    expect((api.saveRecords.mock.calls[0]?.[1] as Transaction[]).map((r) => r.id)).toEqual([ID3])
    expect(store.hasUnsaved()).toBe(false)
  })

  it('usunięcie, którego dysk nie przyjął: wpis wraca razem ze swoją niezapisaną zmianą i ją zapisuje', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    api.deleteRecords.mockResolvedValue([{ id: t.id, error: 'EBUSY: plik zajęty' }])
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'zmiana przed usunięciem' }))
    const res = await store.deleteRecords('transactions', [t.id])
    expect(res).toEqual({ deleted: [], error: 'EBUSY: plik zajęty' })
    expect(current()?.note).toBe('zmiana przed usunięciem')
    await vi.advanceTimersByTimeAsync(2100)
    expect(api.saveRecord.mock.calls.at(-1)?.[1].note).toBe('zmiana przed usunięciem')
    expect(store.hasUnsaved()).toBe(false)
    // One record, the same way.
    api.deleteRecord.mockRejectedValue(new Error('EBUSY: plik zajęty'))
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'druga zmiana' }))
    await expect(store.deleteRecord('transactions', t.id)).rejects.toThrow('EBUSY')
    await vi.advanceTimersByTimeAsync(2100)
    expect(api.saveRecord.mock.calls.at(-1)?.[1].note).toBe('druga zmiana')
    expect(store.hasUnsaved()).toBe(false)
  })
})

describe('wiele zmian z drugiego komputera naraz (1.5.4, W25)', () => {
  const N = 200
  const idOf = (i: number) => `01K6H3Z0W8Q4M2N5P7R9S1${String(i).padStart(4, '0')}`
  const savesAnswered = () => {
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    api.saveRecords.mockImplementation(async (_c: string, rs: Transaction[]) => rs.map((r) => ({ id: r.id, entry: saved(r) })))
  }
  const clearCalls = () => {
    for (const m of Object.values(api)) m.mockClear()
  }
  /** 200 records in „ask” mode, some edited here, then one change from the other computer: 180 updates, 20 deletions. */
  function arrive(): readonly PendingRemote[] {
    const txs = Array.from({ length: N }, (_, i) => transaction(idOf(i)))
    const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
    records.transactions = txs.map((t) => ({ record: t, relPath: `transactions/2026/2026-03-16_${t.id}.json`, readOnly: false }))
    store.applySnapshot({ fi: settings('ask'), records, problems: [], conflicts: [], status: status(), loadMs: 0 })
    for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 180, 181, 182]) store.updateRecord('transactions', idOf(i), (r) => ({ ...r, note: `moja ${i}` }))
    vi.advanceTimersByTime(10)
    change({
      upserts: txs.slice(0, 180).map((t, i) => incoming({ ...t, amount: -5000 - i, note: i < 5 ? `z B ${i}` : t.note, updatedAt: '2026-03-16T09:00:00.000Z', updatedBy: 'PC-B' })),
      removals: txs.slice(180).map((t) => ({ collection: 'transactions' as const, id: t.id }))
    })
    return useRemote.getState().pending
  }
  const decide = (p: PendingRemote, i: number): RemoteDecision => ({ key: p.key, choice: (['theirs', 'mine', 'merge'] as const)[i % 3]!, fields: i % 2 ? { note: 'theirs' } : {} })
  /** What the decisions left: records in memory, what was written, what went to the history. */
  async function outcome() {
    await vi.advanceTimersByTimeAsync(3000)
    const written = new Map<string, Transaction>()
    for (const [, r] of api.saveRecord.mock.calls as Array<[string, Transaction]>) written.set(r.id, r)
    for (const [, rs] of api.saveRecords.mock.calls as Array<[string, Transaction[]]>) for (const r of rs) written.set(r.id, r)
    return {
      records: Object.fromEntries(Object.entries(store.useData.getState().records.transactions).map(([id, e]) => [id, e!.record])),
      written: Object.fromEntries([...written].sort(([a], [b]) => (a < b ? -1 : 1))),
      kept: (api.historyKeep.mock.calls as Array<[string, Transaction, string]>).map(([c, r, why]) => `${c} ${r.id} ${r.note} ${why}`).sort(),
      waiting: useRemote.getState().pending.length,
      unsaved: store.hasUnsaved()
    }
  }

  it('„Zastosuj” dla wszystkich: to samo co po kolei – jedna zmiana stanu i jeden zapis paczką', async () => {
    savesAnswered()
    const first = arrive()
    expect(first).toHaveLength(N)
    first.forEach((p, i) => {
      const d = decide(p, i)
      store.resolveRemote(d.key, d.choice, d.fields)
    })
    const oneByOne = await outcome()

    clearCalls()
    const again = arrive()
    let updates = 0
    let waitingUpdates = 0
    const stop = store.useData.subscribe((s, prev) => {
      if (s.records !== prev.records) updates++
    })
    const stopWaiting = useRemote.subscribe(() => waitingUpdates++)
    store.resolveRemoteMany(again.map(decide))
    stop()
    stopWaiting()
    expect([updates, waitingUpdates]).toEqual([1, 1])
    const together = await outcome()
    expect(together).toEqual(oneByOne)
    expect(api.saveRecord).not.toHaveBeenCalled()
    expect(api.saveRecords).toHaveBeenCalledTimes(1)
    // Theirs over an edit here (the edit in the history), mine kept, merged; deletions taken and kept.
    expect(together.records[idOf(0)]).toMatchObject({ note: 'z B 0', amount: -5000 })
    expect(together.records[idOf(1)]).toMatchObject({ note: 'moja 1', amount: -4599 })
    expect(together.records[idOf(2)]).toMatchObject({ note: 'moja 2', amount: -5002 })
    expect(together.records[idOf(180)]).toBeUndefined()
    expect(together.records[idOf(181)]?.note).toBe('moja 181')
    expect(together.records[idOf(183)]).toBeUndefined()
    expect(together.kept).toContain(`transactions ${idOf(0)} moja 0 discarded`)
    expect(together.kept).toContain(`transactions ${idOf(180)} moja 180 discarded`)
    expect([together.waiting, together.unsaved]).toEqual([0, false])
  })

  it('„Zaakceptuj nowsze: wszystkie”: to samo co po kolei, jedna zmiana stanu; usunięcia po edycji sprzed ich przyjścia czekają', async () => {
    savesAnswered()
    const first = arrive()
    let decided = 0
    let left = 0
    for (const p of first) {
      const n = store.newerOf(useRemote.getState().pending.find((x) => x.key === p.key)!)
      if (n.choice == null) left++
      else {
        store.resolveRemote(p.key, n.choice, n.fields)
        decided++
      }
    }
    const oneByOne = await outcome()

    clearCalls()
    const again = arrive()
    let updates = 0
    const stop = store.useData.subscribe((s, prev) => {
      if (s.records !== prev.records) updates++
    })
    expect(store.acceptNewer(again.map((p) => p.key))).toEqual({ decided, left })
    stop()
    expect(updates).toBe(1)
    expect(await outcome()).toEqual(oneByOne)
    expect(left).toBe(3)
    expect(useRemote.getState().pending.map((p) => p.id)).toEqual([idOf(180), idOf(181), idOf(182)])
  })

  it('ta sama zmiana dwa razy w jednej paczce: rozstrzygnięta raz', () => {
    const [p] = arrive()
    store.resolveRemoteMany([
      { key: p!.key, choice: 'theirs' },
      { key: p!.key, choice: 'mine' }
    ])
    expect(current(idOf(0))?.note).toBe('z B 0')
    expect(api.historyKeep).toHaveBeenCalledTimes(1)
  })
})

describe('przyczyna niezapisanych zmian (1.6.5, B108, B67, N62)', () => {
  const toasts = () => useUi.getState().toasts.map((t) => t.text)
  const newerError = () => new Error("Error invoking remote method 'fi:saveRecord': NewerFileError: Ten wpis zapisała nowsza wersja aplikacji (na drugim komputerze) – ta wersja go nie zmieni.")
  beforeEach(() => {
    useUi.setState({ toasts: [] })
    useRemote.setState({ pending: [], open: false })
  })

  /** My unsaved note and the other computer's other note: a decision waits (only it saves the record). */
  function waitingDecision(t: Transaction): void {
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'moja' }))
    change({ upserts: [incoming({ ...t, note: 'z laptopa', updatedAt: '2026-03-16T10:00:00.000Z', updatedBy: 'LAPTOP' })] })
    expect(useRemote.getState().pending).toHaveLength(1)
  }

  it('decyzja o zmianie z drugiego komputera: zamknięcie i „zapisz przed…” mówią prawdę i otwierają okno decyzji', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    waitingDecision(t)
    // „Później” in the decisions' dialog.
    useRemote.setState({ open: false })
    // The window closing: the reason travels to main's question, the decisions' dialog opens behind it.
    await expect(store.flushForClose()).resolves.toEqual({ saved: false, waiting: 1, newer: 0, error: null })
    expect(useRemote.getState().open).toBe(true)
    useRemote.setState({ open: false })
    // A backup, an import, an update…: never „file locked, try again” – the decision is asked for.
    await expect(store.saveFirst('kopia')).rejects.toThrow('Czekają zmiany z drugiego komputera (1) – kopia czeka na Twoją decyzję w otwartym oknie.')
    expect(useRemote.getState().open).toBe(true)
    // Another folder: not opened, said why.
    const open = vi.fn()
    expect(await store.switchFolder(open)).toEqual({ unsaved: expect.stringMatching(/^Czekają zmiany z drugiego komputera \(1\) – zmiana folderu czeka/) })
    expect(open).not.toHaveBeenCalled()
    expect(api.saveRecord).not.toHaveBeenCalled()
  })

  it('nieudany zapis: „zapisz przed…” podaje błąd i to, że aplikacja ponawia; zapisane wszystko – przechodzi', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockRejectedValue(new Error('EBUSY: plik zablokowany'))
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'x' }))
    await expect(store.saveFirst('eksport')).rejects.toThrow(/^Nie udało się zapisać bieżących zmian \(EBUSY: plik zablokowany\), więc eksport czeka – aplikacja ponawia zapis/)
    expect(useRemote.getState().open).toBe(false)
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    await expect(store.saveFirst('eksport')).resolves.toBeUndefined()
    await expect(store.flushForClose()).resolves.toEqual({ saved: true, waiting: 0, newer: 0, error: null })
  })

  it('wpis zapisany przez nowszą wersję: komunikat raz, bez pętli ponowień; „zapisz przed…” go nie wstrzymuje (B67)', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockRejectedValue(newerError())
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'tutaj' }))
    await vi.advanceTimersByTimeAsync(450)
    expect(api.saveRecord).toHaveBeenCalledTimes(1)
    expect(toasts().filter((x) => /ta wersja jej nie zapisze – zaktualizuj aplikację/.test(x))).toHaveLength(1)
    // Minutes later: no attempt more – trying again changes nothing until the app is updated.
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(api.saveRecord).toHaveBeenCalledTimes(1)
    expect(store.hasUnsaved()).toBe(true)
    expect(store.unsavedReport()).toEqual({ saved: false, waiting: 0, newer: 1, error: null })
    // Not on the disk for anybody: a backup or an import goes on; closing asks with its own words (main).
    await expect(store.saveFirst('kopia')).resolves.toBeUndefined()
    await expect(store.flushForClose()).resolves.toMatchObject({ saved: false, newer: 1, error: null })
    // Saved after all (the app updated meanwhile – „ponów”): nothing left.
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    await expect(store.flushSaves()).resolves.toBe(true)
    expect(store.unsavedReport()).toEqual({ saved: true, waiting: 0, newer: 0, error: null })
  })

  it('paczka: wpis nowszej wersji (`newer`) nie wraca do ponawiania, reszta zapisana (B67)', async () => {
    const t = transaction()
    const u = transaction(ID2)
    load(t)
    store.addRecords('transactions', [u])
    api.saveRecords.mockResolvedValueOnce([{ id: u.id, entry: saved(u) }])
    await vi.advanceTimersByTimeAsync(10)
    api.saveRecords.mockResolvedValueOnce([
      { id: t.id, error: 'Ten wpis zapisała nowsza wersja aplikacji.', newer: true },
      { id: u.id, entry: saved({ ...u, note: 'b' }) }
    ])
    store.replaceRecords('transactions', [
      { ...t, note: 'a' },
      { ...u, note: 'b' }
    ])
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(api.saveRecords).toHaveBeenCalledTimes(2)
    expect(api.saveRecord).not.toHaveBeenCalled()
    expect(store.unsavedReport()).toEqual({ saved: false, waiting: 0, newer: 1, error: null })
  })

  it('wpis nowszej wersji w pamięci: zmiana odrzucona z komunikatem, usunięcie – odmowa, wpis zostaje (B67)', async () => {
    const t = transaction()
    load(t)
    store.useData.setState((s) => ({ records: { ...s.records, transactions: { [t.id]: { ...s.records.transactions[t.id]!, readOnly: true } } } }))
    // The notice is said once in a few seconds: none of an earlier test holds it back.
    vi.setSystemTime(Date.now() + 60_000)
    expect(store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'x' }))).toBe(false)
    expect(toasts()).toContain(store.NEWER_RECORD_MESSAGE)
    // A fill of the app: quietly nothing.
    useUi.setState({ toasts: [] })
    expect(store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'x' }), { background: true })).toBe(false)
    expect(toasts()).toEqual([])
    await expect(store.deleteRecord('transactions', t.id)).rejects.toThrow(store.NEWER_RECORD_MESSAGE)
    expect(current()?.note).toBe('')
    expect(api.deleteRecord).not.toHaveBeenCalled()
    // A deletion nobody waits for says the refusal (never an unhandled error).
    store.deleteOrSay('transactions', t.id)
    await vi.advanceTimersByTimeAsync(0)
    expect(toasts()).toContain(store.NEWER_RECORD_MESSAGE)
  })

  it('miesiące, których plik zapisała nowsza wersja i ta go nie odczyta: gra i plan miesiąca nic na nich nie tworzą (B67)', () => {
    const problems = [
      { relPath: 'game/2026-03.json', kind: 'too-new' as const, message: 'nowszy format' },
      { relPath: 'months/2026-04.json', kind: 'too-new' as const, message: 'nowszy format' },
      { relPath: 'game/2026-05.json', kind: 'corrupt' as const, message: 'uszkodzony' },
      { relPath: 'transactions/2026/2026-03-16_X.json', kind: 'too-new' as const, message: 'nowszy format' }
    ]
    expect([...store.tooNewMonths(problems, 'game')]).toEqual(['2026-03'])
    expect([...store.tooNewMonths(problems, 'months')]).toEqual(['2026-04'])
  })

  it('po kroku zrobionym w pamięci (import, kreator): co jeszcze nie jest na dysku i dlaczego (B108)', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'zapisz' }))
    await expect(store.unsavedNote()).resolves.toBeNull()
    api.saveRecord.mockRejectedValue(new Error('EBUSY: plik zablokowany'))
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'jeszcze raz' }))
    await expect(store.unsavedNote()).resolves.toBe('część zmian nie zapisała się jeszcze w folderze (EBUSY: plik zablokowany) – aplikacja ponawia zapis automatycznie')
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    await store.flushSaves()
    waitingDecision(t)
    useRemote.setState({ open: false })
    await expect(store.unsavedNote()).resolves.toBe('część zmian zapisze się po Twojej decyzji o zmianach z drugiego komputera (1)')
    expect(useRemote.getState().open).toBe(true)
  })

  it('Ctrl+S i „Zapisz teraz” z palety – jedna droga: czekające decyzje otwierają okno, inaczej „Zapisano.” (N62)', async () => {
    const t = transaction()
    load(t)
    api.saveRecord.mockImplementation(async (_c: string, r: Transaction) => saved(r))
    store.updateRecord('transactions', t.id, (r) => ({ ...r, note: 'zapisz' }))
    await store.saveNow()
    expect(toasts()).toContain('Zapisano. (Zapis jest automatyczny – Ctrl+S nie jest potrzebne.)')
    expect(useRemote.getState().open).toBe(false)
    useUi.setState({ toasts: [] })
    waitingDecision(t)
    useRemote.setState({ open: false })
    await store.saveNow()
    expect(useRemote.getState().open).toBe(true)
    expect(toasts()).toContain('Czekają zmiany z drugiego komputera (1) – te wpisy zapiszą się po Twojej decyzji.')
  })

  it('Ctrl+S: czeka decyzja o wpisie nie zmienianym tutaj, a zapis innego się nie udał – bez „Zapisano.” (przegląd grupy Q)', async () => {
    const t = transaction()
    load(t, { remoteChanges: 'ask' })
    // Another computer changed this record; nothing edited here – the „ask” mode waits for a decision anyway.
    change({ upserts: [incoming({ ...t, note: 'z laptopa', updatedAt: '2026-03-16T10:00:00.000Z', updatedBy: 'LAPTOP' })] })
    expect(useRemote.getState().pending).toHaveLength(1)
    const u = transaction(ID2)
    api.saveRecords.mockResolvedValue([{ id: u.id, error: 'EBUSY: plik zablokowany' }])
    api.saveRecord.mockRejectedValue(new Error('EBUSY: plik zablokowany'))
    store.addRecords('transactions', [u])
    useUi.setState({ toasts: [] })
    await store.saveNow()
    expect(toasts()).toContain('Czekają zmiany z drugiego komputera – zdecyduj o nich w oknie.')
    expect(toasts().some((x) => x.startsWith('Zapisano.'))).toBe(false)
    expect(toasts()).toContain('Nie udało się zapisać: EBUSY: plik zablokowany. Aplikacja ponowi zapis automatycznie.')
  })
})


describe('zasobnik i start z Windows w oknie (1.6.5, N98, N100)', () => {
  it('kiedy zainstaluje się pobrana aktualizacja; pytanie o start z Windows tylko raz, na komputerze z działającym budżetem', async () => {
    const tray = await import('../../src/renderer/store/tray')
    expect(tray.installWhen(false)).toBe('po zamknięciu aplikacji')
    expect(tray.installWhen(true)).toMatch(/„Zakończ” w menu ikony/)
    const prefs = { closeToTray: true, launchAtLogin: false, notified: false, autostartAsked: false, loginSupported: true }
    expect(tray.asksAutostart(prefs, true)).toBe(true)
    // Not before the budget runs (the start wizard asks), never again once answered, not where it cannot be set.
    expect(tray.asksAutostart(prefs, false)).toBe(false)
    expect(tray.asksAutostart({ ...prefs, autostartAsked: true }, true)).toBe(false)
    expect(tray.asksAutostart({ ...prefs, launchAtLogin: true }, true)).toBe(false)
    expect(tray.asksAutostart({ ...prefs, loginSupported: false }, true)).toBe(false)
    expect(tray.asksAutostart(null, true)).toBe(false)
  })
})
