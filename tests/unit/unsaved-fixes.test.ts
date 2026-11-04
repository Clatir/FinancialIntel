// AP-1 (1.15.5, grupa N1) in the window: the data folder gone – what waited goes once it is back, nothing says
// „Zapisano.” before it is on the disk.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FOLDER_UNAVAILABLE_MESSAGE, type FolderStatus, type QuickResult, type RecordEntry, type Snapshot } from '@shared/api'
import { warsawNow } from '@shared/calc/dates'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'
import { unsavedQuestion } from '@shared/unsaved'
import { inboxItems } from '@shared/calc/inbox'

const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'transactions/2026/x.json', readOnly: false })
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: Array<{ id: string }>) => rs.map((r) => ({ id: r.id, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(),
  deleteRecords: vi.fn(),
  historyKeep: vi.fn(),
  quickResult: vi.fn(async (_r: QuickResult) => undefined),
  trayPrefs: vi.fn(async () => ({ closeToTray: false, launchAtLogin: false, autostartAsked: true, notified: false, loginSupported: false }))
}
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) })
vi.stubGlobal('window', { fi: api })
const store = await import('../../src/renderer/store/data')
const { useUi } = await import('../../src/renderer/store/ui')
const { quickAdd, quickData } = await import('../../src/renderer/store/quickHost')
const { retriesBySelf } = await import('../../src/renderer/features/setup/retry')

const ID = '01K6H3Z0W8Q4M2N5P7R9S1T3V5'
const GONE = new Error(`Error invoking remote method 'fi:saveRecord': FolderUnavailableError: ${FOLDER_UNAVAILABLE_MESSAGE}`)

const status = (over: Partial<FolderStatus> = {}): FolderStatus => ({
  dataDir: '/dane',
  available: true,
  readOnly: false,
  readOnlyReason: null,
  folderSchemaVersion: 1,
  appSchemaVersion: 1,
  otherMachines: [],
  migratedFrom: null,
  backupPath: null,
  ...over
})
const GONE_STATUS = status({ available: false, readOnly: true, readOnlyReason: FOLDER_UNAVAILABLE_MESSAGE })

const transaction = (): Transaction =>
  transactionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: ID,
    createdAt: '2026-03-16T07:00:00.000Z',
    updatedAt: '2026-03-16T07:00:00.000Z',
    date: '2026-03-16',
    accountId: MBANK_ACCOUNT_ID,
    amount: -4599,
    note: ''
  })

function load(over: Partial<FolderStatus> = {}): void {
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = [{ record: transaction(), relPath: `transactions/2026/2026-03-16_${ID}.json`, readOnly: false }]
  store.applySnapshot({ fi: createDefaultSettings('2026-01-01T00:00:00.000Z'), records, problems: [], conflicts: [], status: status(over), loadMs: 0 })
}
const change = (s: FolderStatus) => store.applyChange({ upserts: [], removals: [], fi: null, problems: [], conflicts: [], status: s, origin: 'external' })
const toasts = () => useUi.getState().toasts.map((t) => t.text)

beforeEach(() => {
  for (const f of Object.values(api)) f.mockClear()
  useUi.setState({ toasts: [] })
  storage.clear()
})
afterEach(() => {
  vi.useRealTimers()
  api.saveRecord.mockImplementation(async (_c: string, r: unknown) => saved(r))
})

describe('folder danych niedostępny w oknie (AP-1)', () => {
  it('Ctrl+S w folderze tylko do odczytu: bez „Zapisano.”, z powodem (AF-39)', async () => {
    load({ readOnly: true, readOnlyReason: 'Folder danych ma format v2 – tylko do odczytu.' })
    await store.saveNow()
    expect(toasts().some((t) => t.includes('Zapisano.'))).toBe(false)
    expect(toasts()).toContain('Folder danych ma format v2 – tylko do odczytu.')
  })

  it('zapis, który czekał na folder, idzie od razu po jego powrocie – nie po kolejnym ponowieniu', async () => {
    vi.useFakeTimers()
    load()
    api.saveRecord.mockRejectedValue(GONE)
    store.updateRecord('transactions', ID, (r) => ({ ...r, note: 'bez folderu' }))
    await vi.advanceTimersByTimeAsync(500)
    expect(api.saveRecord).toHaveBeenCalledTimes(1)
    change(GONE_STATUS)
    // The change waits with the folder's reason – the question at the window's close says it, not „another computer”.
    const r = store.unsavedReport()
    expect(r).toMatchObject({ saved: false, waiting: 0, error: FOLDER_UNAVAILABLE_MESSAGE })
    expect(unsavedQuestion(r).message).toMatch(/Folder danych jest niedostępny/)
    expect(unsavedQuestion(r).title).not.toMatch(/drugiego komputera/)
    // A new edit while away: refused with the reason, never taken as if it could be written.
    expect(store.updateRecord('transactions', ID, (r) => ({ ...r, note: 'później' }))).toBe(false)
    expect(toasts()).toContain(store.UNAVAILABLE_NOTICE)
    api.saveRecord.mockImplementation(async (_c: string, rec: unknown) => saved(rec))
    change(status())
    // Well before the first retry (2 s): written now, with one call.
    await vi.advanceTimersByTimeAsync(50)
    expect(api.saveRecords).toHaveBeenCalledTimes(1)
    expect((api.saveRecords.mock.calls[0]![1] as Transaction[])[0]!.note).toBe('bez folderu')
    expect(store.hasUnsaved()).toBe(false)
  })

  it('szybki wpis: „Zapisano.” dopiero po zapisie – zapis, który nie poszedł, mówi, że wpis czeka (AF-2)', async () => {
    load()
    const draft = {
      id: '01K6H3Z0W8Q4M2N5P7R9S1T3W1',
      folder: '/dane',
      kind: 'expense' as const,
      amount: 700,
      categoryId: null,
      accountId: MBANK_ACCOUNT_ID,
      date: warsawNow().date,
      time: null,
      counterparty: 'W1 wpis bez folderu',
      note: '',
      impulse: null,
      logNote: '',
      household: false,
      memberId: null,
      advance: false,
      splits: []
    }
    api.saveRecord.mockRejectedValue(GONE)
    await quickAdd(draft)
    const answer = api.quickResult.mock.calls.at(-1)![0]
    expect(answer).toMatchObject({ ok: true, pending: true })
    expect(answer.message).not.toMatch(/Zapisano/)
    expect(answer.message).toMatch(/jeszcze niezapisany/)
    // The same draft sent again (a second Enter, B51): still not „Zapisano.” while it is not on the disk.
    await quickAdd(draft)
    expect(api.quickResult.mock.calls.at(-1)![0]).toMatchObject({ pending: true })
    api.saveRecord.mockImplementation(async (_c: string, rec: unknown) => saved(rec))
    await quickAdd(draft)
    expect(api.quickResult.mock.calls.at(-1)![0]).toMatchObject({ ok: true, message: 'Zapisano.' })
    expect(api.quickResult.mock.calls.at(-1)![0].pending).toBeUndefined()
  })

  it('szybki wpis w trakcie otwierania innego folderu odmawia, a wpis z listami innego folderu nie trafia do tego (AF-75)', async () => {
    load()
    store.useData.setState({ switching: true })
    expect(quickData()).toMatchObject({ readOnly: true, readOnlyReason: expect.stringMatching(/innego folderu/) })
    store.useData.setState({ switching: false })
    expect(quickData()).toMatchObject({ readOnly: false, folder: '/dane' })
    await quickAdd({
      folder: '/poprzedni',
      kind: 'expense',
      amount: 666,
      categoryId: null,
      accountId: MBANK_ACCOUNT_ID,
      date: warsawNow().date,
      time: null,
      counterparty: 'Z innego folderu',
      note: '',
      impulse: null,
      logNote: '',
      household: false,
      memberId: null,
      advance: false,
      splits: []
    })
    expect(api.quickResult.mock.calls.at(-1)![0]).toMatchObject({ ok: false, message: expect.stringMatching(/inny folder danych/) })
    expect(api.saveRecord).not.toHaveBeenCalled()
  })

  it('meldunek o folderze-widmie starszej wersji: gdzie i ile plików wpisów – także przed startem budżetu', () => {
    const items = inboxItems({
      today: '2026-11-04',
      started: false,
      deliveries: [],
      conflicts: 0,
      problems: 0,
      uncategorized: { count: 0, amount: 0, from: null },
      duplicates: 0,
      members: [],
      memberName: () => '',
      confirmations: [],
      loot: { month: null, amount: 0 },
      ghosts: [{ dir: 'C:\\Users\\X\\OneDrive\\FinancialIntel', files: 3 }]
    })
    expect(items).toEqual([
      expect.objectContaining({ kind: 'folder', key: 'ghost:C:\\Users\\X\\OneDrive\\FinancialIntel', ref: 'C:\\Users\\X\\OneDrive\\FinancialIntel', action: 'Pokaż folder' })
    ])
    expect(items[0]!.text).toMatch(/Folder-widmo .*: 3 pliki wpisów bez fi\.json/)
  })

  it('ekran brakującego zapamiętanego folderu ponawia sam (AF-41); folder nigdy nie zapamiętany – nie', () => {
    expect(retriesBySelf({ reason: 'not-data', problem: 'missing', remembered: true })).toBe(true)
    expect(retriesBySelf({ reason: 'not-data', problem: 'missing', remembered: false })).toBe(false)
    expect(retriesBySelf({ reason: 'not-data', problem: 'unavailable', remembered: true })).toBe(true)
    expect(retriesBySelf({ reason: 'not-data', problem: 'empty', remembered: true })).toBe(false)
  })
})
