import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { answer, type AnalyzeMessage, type AnalyzeRequest } from '@shared/import/analyze'
import { accountMapping, completeMapping, guessCsv } from '@shared/import/csv'
import { COLLECTIONS } from '@shared/paths'
import { SCHEMA_VERSION, transactionSchema, type Account, type CsvMapping, type SettingsFile } from '@shared/schema'
import { bankCsv } from '../e2e/bank-csv'

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

/**
 * The window's Web Worker as a test has it: every message copied as `postMessage` copies it, the shared `answer` on its
 * own turn of the event loop (T463). `during` – what happens while it works (a save, a change from another computer).
 */
class FakeWorker {
  static requests: AnalyzeRequest[] = []
  static during: ((req: AnalyzeRequest) => void) | null = null
  private dead = false
  private readonly listeners = new Map<string, Set<(e: unknown) => void>>()
  addEventListener(type: string, fn: (e: unknown) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(fn)
  }
  removeEventListener(type: string, fn: (e: unknown) => void): void {
    this.listeners.get(type)?.delete(fn)
  }
  terminate(): void {
    this.dead = true
  }
  postMessage(message: AnalyzeRequest): void {
    const req = structuredClone(message)
    FakeWorker.requests.push(req)
    setTimeout(() => {
      if (this.dead) return
      FakeWorker.during?.(req)
      answer(req, (m: AnalyzeMessage) => {
        const data = structuredClone(m)
        setTimeout(() => !this.dead && this.listeners.get('message')?.forEach((fn) => fn({ data })))
      })
    })
  }
}
vi.stubGlobal('window', { fi: api })
vi.stubGlobal('Worker', FakeWorker)
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const state = await import('../../src/renderer/features/import/state')

const BANK_B = '01K4BANKB00000000000000001'
const BANK_C = '01K4BANKC00000000000000001'
const rowsB = [
  { date: '2026-10-20', name: 'PIEKARNIA TESTOWA', title: 'Płatność kartą', amount: -12.5 },
  { date: '2026-10-21', name: 'KIOSK RUCH', title: 'Płatność kartą', amount: -7.2 },
  { date: '2026-10-22', name: 'FIRMA TESTOWA SP. Z O.O.', title: 'Wynagrodzenie', amount: 1500 }
]
const CSV = new TextEncoder().encode(bankCsv(rowsB))
/** Another bank's layout (other columns) – its mapping fits no file of Bank B. */
const OTHER = new TextEncoder().encode(['Data;Opis;Kwota', '2026-10-20;KAWIARNIA;-9,50', '2026-10-21;KINO;-30,00', ''].join('\r\n'))
function mappingOf(bytes: Uint8Array): CsvMapping {
  const done = completeMapping(guessCsv(bytes)!.draft)
  if (!('mapping' in done)) throw new Error(done.missing)
  return done.mapping
}
const account = (id: string, name: string, mapping: CsvMapping | undefined, importFormat: Account['importFormat'] = 'csv'): Account => ({ id, name, kind: 'bank', importFormat, ...(mapping ? { csvMapping: mapping } : {}), archived: false })

let folder = 0
function open(accounts: Account[] = []): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const status: FolderStatus = { dataDir: `/dane-r1-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  data.applySnapshot({ fi: { ...fi, settings: { ...fi.settings, accounts: [...fi.settings.accounts, ...accounts] } }, records, problems: [], conflicts: [], status, loadMs: 0 })
}
const s = () => state.useImport.getState()
const accounts = () => data.useData.getState().fi!.settings.accounts
const byId = (id: string) => accounts().find((a) => a.id === id)!

beforeEach(() => {
  vi.clearAllMocks()
  FakeWorker.requests = []
  FakeWorker.during = null
})

describe('przegląd R1 – ekran importu CSV innego banku', () => {
  it('2: „Cofnij” po otwarciu drugiego pliku przywraca też odnośnik pliku – „Przenieś do Kosza” dotyczy pliku przywróconego', async () => {
    open([account(BANK_B, 'Bank B', mappingOf(CSV))])
    await state.loadImportFile('a.csv', CSV, 'ref-A')
    expect(s()).toMatchObject({ fileRef: 'ref-A', via: 'worker' })
    state.setSkip([s().plan!.rows[0]!.key], true)
    await state.loadImportFile('b.csv', CSV, 'ref-B')
    expect(s().fileRef).toBe('ref-B')
    const back = ui.useUi.getState().toasts.find((t) => t.action?.label === 'Cofnij')!
    back.action!.run()
    expect(s()).toMatchObject({ fileName: 'a.csv', fileRef: 'ref-A' })
  })

  it('3: plik, do którego nie pasuje żadne mapowanie – kreator proponuje nowe konto; konto z innymi kolumnami – tylko po pytaniu „Zastąp kolumny”', async () => {
    const other = mappingOf(OTHER)
    open([account(BANK_B, 'Bank B', other)])
    await state.loadImportFile('bank_b.csv', CSV)
    expect(s().csvSetup).toMatchObject({ accountId: '', editing: null })
    state.setCsvAccount(BANK_B)
    expect(state.csvReplaces(s().csvSetup)).toEqual({ name: 'Bank B' })
    expect(await state.saveCsvSetup()).toBe(false)
    expect(byId(BANK_B).csvMapping).toEqual(other)
    expect(s().file).toBeNull()
    expect(await state.saveCsvSetup({ replace: true })).toBe(true)
    expect(byId(BANK_B).csvMapping).toEqual(mappingOf(CSV))
    expect(s()).toMatchObject({ accountId: BANK_B, mappingAccountId: BANK_B, file: { format: 'csv' } })
  })

  it('10: „Zmień kolumny” po zmianie konta pliku – zmienia mapowanie konta, którym plik był czytany; drugie konto bez zmian', async () => {
    open([account(BANK_B, 'Bank B', mappingOf(CSV)), account(BANK_C, 'Bank C', undefined, 'csv')])
    await state.loadImportFile('bank_b.csv', CSV)
    expect(s()).toMatchObject({ accountId: BANK_B, mappingAccountId: BANK_B })
    state.setImportAccount(BANK_C)
    state.editCsvMapping()
    expect(s().csvSetup).toMatchObject({ accountId: BANK_B, editing: BANK_B })
    state.setCsvColumn('accountNo', null)
    // Its own columns: no question.
    expect(state.csvReplaces(s().csvSetup)).toBeNull()
    expect(await state.saveCsvSetup()).toBe(true)
    expect(accountMapping(byId(BANK_B))!.columns.accountNo).toBeNull()
    expect(byId(BANK_C).csvMapping).toBeUndefined()
  })

  it('5: nowe konto o nazwie zajętej i długiej – nazwa w limicie 40 znaków z numerem, powiedziane w komunikacie', async () => {
    const long = 'Bank Przykładowy Oddział Śródmieście 123'
    expect(long).toHaveLength(40)
    open([account(BANK_C, long, undefined, null)])
    await state.loadImportFile('bank_b.csv', CSV)
    state.setCsvNewName(long)
    expect(await state.saveCsvSetup()).toBe(true)
    const made = accounts().find((a) => a.importFormat === 'csv' && a.id !== BANK_C)!
    expect(made.name.length).toBeLessThanOrEqual(40)
    expect(made.name).toBe('Bank Przykładowy Oddział Śródmieście 1 2')
    expect(ui.useUi.getState().toasts.some((t) => t.text.includes(`Konto nazwane „${made.name}”`))).toBe(true)
    expect(s().accountId).toBe(made.id)
  })

  it('11: inny separator w kreatorze – role spoza kolumn pliku znikają, „Zapisz” mówi, czego brakuje', async () => {
    open()
    await state.loadImportFile('bank_b.csv', CSV)
    state.setCsvDraft({ separator: ',' })
    const { columns } = s().csvSetup!.draft
    const width = Math.max(...s().csvSetup!.rows.slice(4, 24).map((r) => r.length))
    expect(Object.values(columns).every((c) => c == null || c < width)).toBe(true)
    expect(await state.saveCsvSetup()).toBe(false)
    expect(accounts().some((a) => a.importFormat === 'csv')).toBe(false)
  })

  it('15: zmiana operacji w trakcie analizy – ponowny plan w Workerze, nie w oknie; decyzje zostają', async () => {
    open([account(BANK_B, 'Bank B', mappingOf(CSV))])
    // A quick entry saved while the Worker reads the file: KIOSK RUCH typed by hand – the plan joins it after.
    FakeWorker.during = (req) => {
      if (!('input' in req)) return
      data.addRecord('transactions', transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01K9KQSK00000000000000000Q', createdAt: '2026-10-21T10:00:00.000Z', updatedAt: '2026-10-21T10:00:00.000Z', date: '2026-10-21', accountId: BANK_B, amount: -720, counterparty: 'KIOSK RUCH' }))
    }
    await state.loadImportFile('bank_b.csv', CSV)
    const kiosk = () => s().plan!.rows.find((p) => p.row.counterparty === 'KIOSK RUCH')!
    expect(kiosk().status).toBe('new')
    const first = s().file!
    state.setSkip([s().plan!.rows[0]!.key], true)
    await vi.waitFor(() => expect(FakeWorker.requests.filter((r) => 'replan' in r)).toHaveLength(1))
    await vi.waitFor(() => expect(kiosk().status).toBe('merge'))
    // The window's own rows of the file in the new plan, the decision made meanwhile kept.
    expect(s().plan!.rows.every((p, i) => p.row === first.rows[i])).toBe(true)
    expect(s().choices.skip[s().plan!.rows[0]!.key]).toBe(true)
    expect(s().planInputs!.transactions).toBe(data.useData.getState().records.transactions)
  })
})
