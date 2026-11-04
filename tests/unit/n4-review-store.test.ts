import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { latestImport } from '@shared/import/batch'
import { COLLECTIONS } from '@shared/paths'
import type { HouseholdMember, SettingsFile } from '@shared/schema'
import { listaCsv, type CsvBuy } from '../e2e/mbank-csv'

// The first code review of N4 (1.15.8): its findings in the window's stores, each with the scenario that failed before
// the fix. The stores talk to the main process through window.fi (preload): a mock stamping every write with its time,
// as the main process does (`updatedAt` = the moment of the write), a few milliseconds after the call (the IPC's way).
const ipc = () => new Promise((r) => setTimeout(r, 3))
const stamped = <T extends { id: string }>(record: T) => ({ ...record, updatedAt: new Date().toISOString() })
const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => (await ipc(), { record: stamped(record), relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, records: Array<{ id: string }>) => (await ipc(), records.map((record) => ({ id: record.id, entry: { record: stamped(record), relPath: `${record.id}.json`, readOnly: false } })))),
  saveSettings: vi.fn(async (f: SettingsFile) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: readonly string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined),
  historyList: vi.fn(async (): Promise<unknown[]> => [{}]),
  historyDeleted: vi.fn(async (): Promise<unknown[]> => []),
  importBackup: vi.fn(async () => 'C:\\dane\\backups\\pre-import\\2026-11-04.zip'),
  folderShown: vi.fn(async () => undefined)
}
vi.stubGlobal('window', { fi: api })
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const state = await import('../../src/renderer/features/import/state')
const batches = await import('../../src/renderer/features/import/batches')
const household = await import('../../src/renderer/features/household/actions')

let folder = 0
function open(patch: (s: SettingsFile['settings']) => SettingsFile['settings'] = (s) => s): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const status: FolderStatus = { dataDir: `/dane-n4r-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  data.applySnapshot({ fi: { ...fi, settings: patch(fi.settings) }, records, problems: [], conflicts: [], status, loadMs: 0 })
}
const bytes = (text: string) => new TextEncoder().encode(text)
const operations = () => data.listOf(data.useData.getState().records.transactions)
const latest = () => latestImport(data.listOf(data.useData.getState().records.imports))!
const batchOf = (id: string) => data.useData.getState().records.imports[id]!.record
/** A moment later: the stamps of the next step are later (ISO to the millisecond). */
const later = () => new Promise((r) => setTimeout(r, 5))
/** The user's own change of an operation, saved. */
async function edit(id: string, note: string): Promise<void> {
  await later()
  data.updateRecord('transactions', id, (t) => ({ ...t, note }))
  await data.flushSaves()
  await later()
}
async function undo(id: string): Promise<void> {
  await later()
  expect(await batches.undoImport(id)).toBe(true)
  await later()
}
async function redo(): Promise<void> {
  ui.useUi.getState().toasts.find((t) => t.action?.label === 'Cofnij' && t.text.startsWith('Import cofnięty'))!.action!.run()
  await vi.waitFor(() => expect(ui.useUi.getState().toasts.map((t) => t.text)).toContain('Import znowu w budżecie.'))
  await later()
}
async function runFile(name: string, buys: CsvBuy[], period: { from: string; to: string }): Promise<string> {
  await later()
  await state.loadImportFile(name, bytes(listaCsv(buys, period)))
  await state.runImport()
  await later()
  return latest().id
}
const changed = (id: string) => batches.undoPreview(batchOf(id)).changed

beforeEach(() => {
  vi.clearAllMocks()
  ui.useUi.setState({ toasts: [] })
})

describe('przegląd N4 1, 2 i 3: „Cofnij import” ostrzega o zmianach użytkownika po cofnięciach i późniejszych importach (T410)', () => {
  const PERIOD = { from: '2026-10-19', to: '2026-10-26' }
  const BUYS: CsvBuy[] = [
    { date: '2026-10-20', amount: 87.91, name: 'SLUSARZ KOWAL' },
    { date: '2026-10-25', amount: 31.95, name: 'ZABKA Z1234' }
  ]
  const KIOSK: CsvBuy = { date: '2026-10-26', amount: 5, name: 'KIOSK RUCH', pending: true }
  const kiosk = () => operations().find((t) => t.counterparty === 'KIOSK RUCH')!

  it('import, zmiana jednej operacji, cofnij → „Cofnij” → cofnij: okno dalej liczy tę jedną (dawniej 0 – nowe savedAt ukrywało zmianę)', async () => {
    open()
    const a = await runFile('lista.csv', BUYS, PERIOD)
    expect(changed(a)).toBe(0)
    await edit(operations()[0]!.id, 'moja zmiana')
    expect(changed(a)).toBe(1)
    await undo(a)
    await redo()
    // IM.30: the import's own writes back are no change of the user's – the one change still is.
    expect(operations()).toHaveLength(2)
    expect(changed(a)).toBe(1)
    await undo(a)
    await redo()
    expect(changed(a)).toBe(1)
  })

  it('import, cofnij → „Cofnij” bez zmian użytkownika: nic „zmienionego później przez Ciebie” (IM.30)', async () => {
    open()
    const a = await runFile('lista.csv', BUYS, PERIOD)
    await undo(a)
    await redo()
    expect(changed(a)).toBe(0)
  })

  it('B rozliczył operację A, B cofnięty, potem zmiana użytkownika: okno cofania A ostrzega (dawniej: wykluczona na zawsze)', async () => {
    open()
    const a = await runFile('lista.csv', [...BUYS, KIOSK], PERIOD)
    const b = await runFile('lista-2.csv', [...BUYS, { ...KIOSK, pending: false }], { from: '2026-10-19', to: '2026-10-27' })
    expect(batchOf(b).updated.map((u) => u.after.id)).toContain(kiosk().id)
    await undo(b)
    // IM.31: B's settling and its undo are no change of the user's.
    expect(changed(a)).toBe(0)
    await edit(kiosk().id, 'po cofnięciu B')
    expect(changed(a)).toBe(1)
  })

  it('zmiana użytkownika przed importem B, który ją nadpisał stemplem: po cofnięciu B okno cofania A ostrzega', async () => {
    open()
    const a = await runFile('lista.csv', [...BUYS, KIOSK], PERIOD)
    await edit(kiosk().id, 'przed B')
    const b = await runFile('lista-2.csv', [...BUYS, { ...KIOSK, pending: false }], { from: '2026-10-19', to: '2026-10-27' })
    expect(batchOf(b).edited).toEqual([kiosk().id])
    expect(changed(a)).toBe(1)
    await undo(b)
    expect(kiosk().note).toBe('przed B')
    expect(changed(a)).toBe(1)
    // B's „Cofnij” and its undo again: the change is still the user's.
    await redo()
    await undo(b)
    expect(changed(a)).toBe(1)
  })
})

describe('przegląd N4 1, 4: „Cofnij” usunięcia nazwy w banku przywraca tylko tę nazwę', () => {
  const ANNA = '01KN4RANNA0000000000000001'
  const OLA = '01KN4ROLA00000000000000002'
  const member = (id: string, name: string, bankNames: string[]): HouseholdMember => ({ id, name, bankNames, inflow: 'ask', archived: false, via: null, opening: { owed: 0, deposit: 0 } })
  const openHouse = (anna: string[], ola: string[] = []) => open((s) => ({ ...s, household: { ...s.household, members: [...s.household.members, member(ANNA, 'Anna', anna), member(OLA, 'Ola', ola)] } }))
  const names = (id: string) => data.useData.getState().fi!.settings.household.members.find((m) => m.id === id)!.bankNames
  const undoToast = () => ui.useUi.getState().toasts.find((t) => t.action?.label === 'Cofnij')!

  it('nazwa dopisana w międzyczasie zostaje; usunięta wraca na swoje miejsce (dawniej: cała lista z chwili kliknięcia)', () => {
    openHouse(['ANNA KOWALSKA', 'A KOWALSKA'])
    household.removeBankName(ANNA, 'ANNA KOWALSKA')
    const back = undoToast()
    household.addBankName(ANNA, 'KOWALSKA ANNA')
    expect(names(ANNA)).toEqual(['A KOWALSKA', 'KOWALSKA ANNA'])
    back.action!.run()
    expect(names(ANNA)).toEqual(['ANNA KOWALSKA', 'A KOWALSKA', 'KOWALSKA ANNA'])
    back.action!.run()
    expect(names(ANNA)).toEqual(['ANNA KOWALSKA', 'A KOWALSKA', 'KOWALSKA ANNA'])
  })

  it('dwa usunięcia, „Cofnij” pierwszego: druga nazwa nie wraca razem z nim', () => {
    openHouse(['ANNA KOWALSKA', 'A KOWALSKA'])
    household.removeBankName(ANNA, 'ANNA KOWALSKA')
    const first = undoToast()
    household.removeBankName(ANNA, 'A KOWALSKA')
    first.action!.run()
    expect(names(ANNA)).toEqual(['ANNA KOWALSKA'])
  })

  it('nazwa, którą ma teraz inny domownik, nie wraca – z komunikatem (jedna nazwa nie wskazuje dwóch osób)', () => {
    openHouse(['ANNA KOWALSKA'])
    household.removeBankName(ANNA, 'ANNA KOWALSKA')
    const back = undoToast()
    household.addBankName(OLA, 'anna kowalska')
    back.action!.run()
    expect(names(ANNA)).toEqual([])
    expect(names(OLA)).toEqual(['anna kowalska'])
    expect(ui.useUi.getState().toasts.at(-1)!.text).toContain('wskazuje teraz Ola')
  })

  it('najwyżej 20 nazw: 21. odmówiona z komunikatem – lista się nie zeruje przy zapisie', () => {
    const full = Array.from({ length: household.MAX_BANK_NAMES }, (_, i) => `NAZWA ${i}`)
    openHouse(full)
    expect(household.addBankName(ANNA, 'NAZWA EXTRA')).toBe(false)
    expect(names(ANNA)).toEqual(full)
    expect(ui.useUi.getState().toasts.at(-1)).toMatchObject({ kind: 'error', text: expect.stringContaining('Najwyżej 20 nazw') })
  })
})
