import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { accountNumberOf } from '@shared/import/mbank'
import { COLLECTIONS } from '@shared/paths'
import { MBANK_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID, type SettingsFile } from '@shared/schema'
import { CSV_NUMBER, historiaCsv, listaCsv, type CsvBuy } from '../e2e/mbank-csv'

// The renderer's stores talk to the main process through window.fi (preload); here it is a mock writing nothing.
const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, records: Array<{ id: string }>) => records.map((record) => ({ id: record.id, entry: { record, relPath: `${record.id}.json`, readOnly: false } }))),
  saveSettings: vi.fn(async (f: SettingsFile) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: readonly string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined),
  historyDeleted: vi.fn(async (): Promise<unknown[]> => []),
  importBackup: vi.fn(async () => 'C:\\dane\\backups\\pre-import\\2026-10-27.zip'),
  folderShown: vi.fn(async () => undefined)
}
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const state = await import('../../src/renderer/features/import/state')

const PERIOD = { from: '2026-10-19', to: '2026-10-26' }
const BUYS: CsvBuy[] = [
  { date: '2026-10-20', amount: 87.91, name: 'SLUSARZ KOWAL' },
  { date: '2026-10-25', amount: 31.95, name: 'ZABKA Z1234' }
]
const bytes = (text: string) => new TextEncoder().encode(text)
const NUMBER = accountNumberOf(CSV_NUMBER)!

let folder = 0
/** A new folder (the import's session goes with the old one – B101). */
function open(patch: (s: SettingsFile['settings']) => SettingsFile['settings'] = (s) => s): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const status: FolderStatus = { dataDir: `/dane-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  data.applySnapshot({ fi: { ...fi, settings: patch(fi.settings) }, records, problems: [], conflicts: [], status, loadMs: 0 })
}
const operations = () => data.listOf(data.useData.getState().records.transactions)
const statuses = () => state.useImport.getState().plan!.rows.map((p) => p.status)

beforeEach(() => vi.clearAllMocks())

describe('ekran importu – AP-2 (N1)', () => {
  it('lista po historii, nic nowego: klucze drugiego formatu zapisane, bez kopii przed importem i bez importu do cofnięcia (AF-63)', async () => {
    open()
    await state.loadImportFile('historia.csv', bytes(historiaCsv(BUYS, PERIOD)))
    expect(statuses()).toEqual(['new', 'new'])
    await state.runImport()
    expect(api.importBackup).toHaveBeenCalledTimes(1)
    expect(data.listOf(data.useData.getState().records.imports)).toHaveLength(1)

    await state.loadImportFile('lista.csv', bytes(listaCsv(BUYS, PERIOD)))
    expect(state.useImport.getState().plan!.rows.map((p) => p.status === 'known' && p.other)).toEqual([true, true])
    await state.runImport()
    expect(api.importBackup).toHaveBeenCalledTimes(1)
    expect(data.listOf(data.useData.getState().records.imports)).toHaveLength(1)
    expect(state.useImport.getState().done).toMatchObject({ backup: '', batchId: null, counts: { known: 2, created: 0 } })
    // The keys are written all the same: the next list knows its rows at once.
    expect(operations().map((t) => t.bank?.altKeys?.length)).toEqual([1, 1])
  })

  it('konto importu po numerze rachunku pliku – nie konto „przyklejone” z poprzedniego pliku; plik bez numeru – konto wybrane wcześniej', async () => {
    open((s) => ({ ...s, import: { ...s.import, accountNumbers: { [MBANK_ACCOUNT_ID]: NUMBER } } }))
    state.setImportAccount(XTB_WALLET_ACCOUNT_ID)
    await state.loadImportFile('lista.csv', bytes(listaCsv(BUYS, PERIOD)))
    expect(state.useImport.getState().accountId).toBe(MBANK_ACCOUNT_ID)
    state.setImportAccount(XTB_WALLET_ACCOUNT_ID)
    await state.loadImportFile('lista-bez-numeru.csv', bytes(listaCsv(BUYS, PERIOD, null)))
    expect(state.useImport.getState().accountId).toBe(XTB_WALLET_ACCOUNT_ID)
  })

  it('usunięta z historii – lista: „usunięta przez Ciebie”; przywrócona świadomie – bez meldunku „wróciła po usunięciu” (AF-1)', async () => {
    open()
    await state.loadImportFile('historia.csv', bytes(historiaCsv(BUYS, PERIOD)))
    await state.runImport()
    const zabka = operations().find((t) => t.counterparty.startsWith('ZABKA'))!
    await data.deleteRecords('transactions', [zabka.id])
    api.historyDeleted.mockImplementation(async () => [{ id: zabka.id, file: 'x', savedAt: new Date().toISOString(), savedBy: 'PC', reason: 'delete', updatedAt: null, updatedBy: null, record: zabka }])
    await state.loadImportFile('lista.csv', bytes(listaCsv(BUYS, PERIOD)))
    const deleted = state.useImport.getState().plan!.rows.find((p) => p.status === 'deleted')!
    expect([statuses(), deleted.status === 'deleted' && deleted.other]).toEqual([['known', 'deleted'], true])
    state.setRestoreDeleted(deleted.key, true)
    await state.runImport()
    const back = operations().find((t) => t.counterparty.startsWith('ZABKA'))!
    expect(back.bank?.source).toBe('lista')
    expect(data.useData.getState().fi!.settings.import.notDuplicates).toHaveProperty(`back:${back.id}`)
  })
})
