// adapted from ICTTJ tests/unit/journal-store.test.ts @ 84a8339
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChangeSet, FolderStatus, RecordEntry, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type SettingsFile, type Transaction } from '@shared/schema'

// The renderer store talks to the main process through window.fi (preload); here it is a mock.
const api = {
  saveRecord: vi.fn(),
  saveSettings: vi.fn(),
  deleteRecord: vi.fn(),
  historyKeep: vi.fn()
}
vi.stubGlobal('window', { fi: api })
const store = await import('../../src/renderer/store/data')
const { useRemote } = await import('../../src/renderer/store/remote')

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
  api.deleteRecord.mockReset()
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
