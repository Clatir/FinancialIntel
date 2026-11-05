import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { MBANK_ACCOUNT_ID, type SettingsFile } from '@shared/schema'
import { bankCsv } from '../e2e/bank-csv'
import { listaCsv } from '../e2e/mbank-csv'

// The renderer's stores talk to the main process through window.fi (preload); here it is a mock writing nothing. No
// Worker here (Node): the window analyzes – as in a WebKit without one (T463).
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

// Another bank's file in the layout of `tests/fixtures/csv/inny_bank.csv` (UTF-8 here – the window's tests read no files).
const CSV = new TextEncoder().encode(
  bankCsv([
    { date: '2026-10-20', name: 'PIEKARNIA TESTOWA', title: 'Płatność kartą', amount: -12.5 },
    { date: '2026-10-21', name: 'KIOSK RUCH', title: 'Płatność kartą', amount: -7.2 },
    { date: '2026-10-22', name: 'FIRMA TESTOWA SP. Z O.O.', title: 'Wynagrodzenie', amount: 1500 },
    { date: '2026-10-24', name: 'ZABKA Z1234', title: 'Płatność kartą', amount: -31.95 },
    { date: '2026-10-24', name: 'ZABKA Z1234', title: 'Płatność kartą', amount: -31.95 }
  ])
)
let folder = 0
function open(patch: (s: SettingsFile['settings']) => SettingsFile['settings'] = (s) => s): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const status: FolderStatus = { dataDir: `/dane-csv-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  data.applySnapshot({ fi: { ...fi, settings: patch(fi.settings) }, records, problems: [], conflicts: [], status, loadMs: 0 })
}
const s = () => state.useImport.getState()
const operations = () => data.listOf(data.useData.getState().records.transactions)
const accounts = () => data.useData.getState().fi!.settings.accounts

beforeEach(() => vi.clearAllMocks())

describe('AP-43 – ekran importu: kreator CSV innego banku', () => {
  it('plik bez mapowania → kreator (nowe konto) → zapis mapowania przy koncie → plan → import → ten sam plik bez kreatora: nic nowego', async () => {
    open()
    await state.loadImportFile('inny_bank.csv', CSV, 'ref-1')
    expect(s().file).toBeNull()
    expect(s().error).toBeNull()
    const setup = s().csvSetup!
    expect(setup).toMatchObject({ name: 'inny_bank.csv', ref: 'ref-1', accountId: '', newName: 'Drugi bank', draft: { skipRows: 4, header: true, separator: ';' } })
    expect(s().loading).toBeNull()

    state.setCsvNewName('Bank B')
    expect(await state.saveCsvSetup()).toBe(true)
    const bankB = accounts().find((a) => a.name === 'Bank B')!
    expect(bankB).toMatchObject({ kind: 'bank', importFormat: 'csv', csvMapping: { skipRows: 4, columns: { date: 0, credit: 6, debit: 7 } } })
    expect(s()).toMatchObject({ csvSetup: null, accountId: bankB.id, fileName: 'inny_bank.csv', fileRef: 'ref-1', via: 'window', file: { format: 'csv' }, plan: { format: 'csv', accountId: bankB.id } })
    expect(s().plan!.rows).toHaveLength(5)
    expect(s().bytes).toBe(CSV)

    await state.runImport()
    expect(s().done).toMatchObject({ accountId: bankB.id, counts: { created: 5 } })
    expect(operations()).toHaveLength(5)
    expect(operations().every((t) => t.accountId === bankB.id && t.bank!.key.startsWith('csv:'))).toBe(true)
    // The bank's balances of the file (a balance column): the statement as of mBank's account history.
    expect(s().done!.statement).toMatchObject({ accountId: bankB.id, end: { date: '2026-10-24', balance: 241640 } })
    expect(data.listOf(data.useData.getState().records.imports)).toHaveLength(1)

    // The next file of the bank: read by the account's mapping – no wizard, its rows known.
    await state.loadImportFile('inny_bank (1).csv', CSV)
    expect(s().csvSetup).toBeNull()
    expect(s().accountId).toBe(bankB.id)
    expect(s().plan!.rows.every((p) => p.status === 'known')).toBe(true)
    await state.runImport()
    expect(operations()).toHaveLength(5)
  })

  it('„Zmień kolumny”: kreator z mapowaniem pliku; konto z importem mBanku zostaje przy mBanku (mapowanie dopisane)', async () => {
    open()
    await state.loadImportFile('inny_bank.csv', CSV)
    state.setCsvAccount(MBANK_ACCOUNT_ID)
    expect(await state.saveCsvSetup()).toBe(true)
    const mbank = accounts().find((a) => a.id === MBANK_ACCOUNT_ID)!
    expect(mbank.importFormat).toBe('mbank')
    expect(mbank.csvMapping).toBeTruthy()
    expect(s().accountId).toBe(MBANK_ACCOUNT_ID)
    state.editCsvMapping()
    expect(s().csvSetup).toMatchObject({ accountId: MBANK_ACCOUNT_ID, draft: { skipRows: 4, columns: { date: 0, booked: 1, description: 4 } } })
    // A column given another role: the role it had is given up; the preview read again with another separator.
    state.setCsvColumn('description', 0)
    expect(s().csvSetup!.draft.columns).toMatchObject({ date: null, description: 0 })
    state.setCsvDraft({ separator: ',' })
    expect(s().csvSetup!.rows[4]).toHaveLength(1)
    state.cancelCsvSetup()
    expect(s().csvSetup).toBeNull()
    expect(s().file).toMatchObject({ format: 'csv' })
  })

  it('kreator mówi, czego brakuje, i nic nie zapisuje; plik, który nie jest tabelą – błąd przy otwartym pliku (N12)', async () => {
    open()
    await state.loadImportFile('inny_bank.csv', CSV)
    state.setCsvColumn('date', null)
    expect(await state.saveCsvSetup()).toBe(false)
    expect(accounts().some((a) => a.importFormat === 'csv')).toBe(false)
    state.cancelCsvSetup()
    const now = new Date()
    const day = now.toISOString().slice(0, 10)
    await state.loadImportFile('lista.csv', new TextEncoder().encode(listaCsv([{ date: day, amount: 10, name: 'SKLEP' }], { from: day, to: day })))
    expect(s().file).toMatchObject({ format: 'lista' })
    await state.loadImportFile('obraz.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0x0d]))
    expect(s()).toMatchObject({ errorName: 'obraz.png', error: expect.stringContaining('To nie jest plik CSV z banku'), file: { format: 'lista' }, csvSetup: null })
  })

  it('dwa pliki naraz: wygrywa późniejszy; „Zamknij plik” w trakcie wczytywania – nic się nie otwiera (AP-35)', async () => {
    open((st) => ({ ...st, accounts: [...st.accounts] }))
    const day = new Date().toISOString().slice(0, 10)
    const lista = (name: string) => new TextEncoder().encode(listaCsv([{ date: day, amount: 10, name }], { from: day, to: day }))
    const first = state.loadImportFile('a.csv', lista('SKLEP A'))
    const second = state.loadImportFile('b.csv', lista('SKLEP B'))
    await Promise.all([first, second])
    expect(s().fileName).toBe('b.csv')
    expect(s().loading).toBeNull()
    const third = state.loadImportFile('c.csv', lista('SKLEP C'))
    expect(s().loading).toMatchObject({ name: 'c.csv' })
    state.closeImport()
    await third
    expect(s()).toMatchObject({ file: null, fileName: null, loading: null })
  })
})
