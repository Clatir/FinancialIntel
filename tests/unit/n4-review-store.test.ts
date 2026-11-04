import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { memberOf } from '@shared/calc/household'
import { latestImport } from '@shared/import/batch'
import { COLLECTIONS } from '@shared/paths'
import { householdMemberSchema, MAX_BANK_NAMES, type HouseholdMember, type SettingsFile } from '@shared/schema'
import { historiaCsv, listaCsv, type CsvBuy } from '../e2e/mbank-csv'

// The first and second code reviews of N4 (1.15.8): their findings in the window's stores, each with the scenario that
// failed before the fix. The stores talk to the main process through window.fi (preload): a mock stamping every write with its time,
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
async function redo(): Promise<string> {
  const run = ui.useUi.getState().toasts.find((t) => t.action?.label === 'Cofnij' && t.text.startsWith('Import cofnięty'))!.action!.run
  ui.useUi.setState({ toasts: [] })
  run()
  let said = ''
  await vi.waitFor(() => expect((said = ui.useUi.getState().toasts.map((t) => t.text).find((t) => t.startsWith('Import znowu w budżecie.')) ?? '')).not.toBe(''))
  await later()
  return said
}
async function runFile(name: string, buys: CsvBuy[], period: { from: string; to: string }, csv = listaCsv): Promise<string> {
  await later()
  await state.loadImportFile(name, bytes(csv(buys, period)))
  await state.runImport()
  await later()
  return latest().id
}
const changed = (id: string) => batches.undoPreview(batchOf(id)).changed

beforeEach(() => {
  vi.clearAllMocks()
  ui.useUi.setState({ toasts: [] })
})

describe('przegląd N4 1, 2 i 3 oraz 2, 1 i 5: „Cofnij import” i jego „Cofnij” nie gubią zmian użytkownika (T415)', () => {
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
    expect(changed(a)).toBe(1)
    await undo(b)
    expect(kiosk().note).toBe('przed B')
    expect(changed(a)).toBe(1)
    // B's „Cofnij” and its undo again: the change is still the user's.
    await redo()
    await undo(b)
    expect(changed(a)).toBe(1)
  })

  it('import tego samego okresu w drugim formacie (same klucze, bez paczki): nic „zmienionego przez Ciebie” (2, 5)', async () => {
    open()
    const a = await runFile('lista.csv', BUYS, PERIOD)
    await state.loadImportFile('historia.csv', bytes(historiaCsv(BUYS, PERIOD)))
    await state.runImport()
    await later()
    // The other format's keys written into A's operations – no batch of its own.
    expect(operations().every((t) => (t.bank?.altKeys ?? []).length > 0)).toBe(true)
    expect(latest().id).toBe(a)
    expect(changed(a)).toBe(0)
  })

  it('B usunął nierozliczoną operację A; cofnięcie B ją przywraca, użytkownik ją zmienia, „Cofnij” – zostaje (2, 1)', async () => {
    open()
    await runFile('lista.csv', [...BUYS, KIOSK], PERIOD)
    const id = kiosk().id
    await state.loadImportFile('lista-2.csv', bytes(listaCsv(BUYS, { from: '2026-10-19', to: '2026-10-27' })))
    state.setRemoveVanished(id, true)
    await state.runImport()
    const b = latest().id
    expect(operations().some((t) => t.id === id)).toBe(false)
    await undo(b)
    await edit(id, 'po cofnięciu')
    const said = await redo()
    // Before: deleted again as the import's own, the user's note gone with it.
    expect(operations().find((t) => t.id === id)?.note).toBe('po cofnięciu')
    expect(said).toContain('Zmiany wprowadzone po cofnięciu zostają (1 operacja)')
  })

  it('B rozliczył operację A; cofnięcie B, zmiana użytkownika, „Cofnij”: rozliczenie wraca, zmiana zostaje (2, 1)', async () => {
    open()
    const a = await runFile('lista.csv', [...BUYS, KIOSK], PERIOD)
    const b = await runFile('lista-2.csv', [...BUYS, { ...KIOSK, pending: false }], { from: '2026-10-19', to: '2026-10-27' })
    expect(kiosk().bank?.pending).toBe(false)
    await undo(b)
    expect(kiosk().bank?.pending).toBe(true)
    await edit(kiosk().id, 'po cofnięciu B')
    const said = await redo()
    expect(kiosk()).toMatchObject({ note: 'po cofnięciu B' })
    expect(kiosk().bank?.pending).toBe(false)
    expect(said).toContain('(1 operacja)')
    // Untouched after its undo: its „Cofnij” sets it back as it was, and says nothing more.
    await undo(b)
    expect(await redo()).toBe('Import znowu w budżecie.')
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
    household.addBankName(ANNA, 'ANNA NOWAK')
    expect(names(ANNA)).toEqual(['A KOWALSKA', 'ANNA NOWAK'])
    back.action!.run()
    expect(names(ANNA)).toEqual(['ANNA KOWALSKA', 'A KOWALSKA', 'ANNA NOWAK'])
    back.action!.run()
    expect(names(ANNA)).toEqual(['ANNA KOWALSKA', 'A KOWALSKA', 'ANNA NOWAK'])
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

  it('nazwa, którą ma inny domownik – także bez polskich znaków albo w innej kolejności słów – odmówiona (2, 2 i 3)', () => {
    openHouse(['JAN ŻÓŁW'])
    for (const typed of ['jan zolw', 'ŻÓŁW  JAN']) {
      expect(household.addBankName(OLA, typed)).toBe(false)
      expect(ui.useUi.getState().toasts.at(-1)).toMatchObject({ kind: 'error', text: expect.stringContaining('ma już Anna') })
    }
    expect(names(OLA)).toEqual([])
    // The same comparison as the import's: these are the names it would give Anna.
    const members = data.useData.getState().fi!.settings.household.members
    expect(memberOf('ZOLW JAN', members)?.id).toBe(ANNA)
    // The same member again („Jan Żółw” for Anna): nothing added twice.
    expect(household.addBankName(ANNA, 'jan żółw')).toBe(true)
    expect(names(ANNA)).toEqual(['JAN ŻÓŁW'])
  })

  it('domownik z importu o nazwie, którą ktoś już ma: ten sam domownik, nie drugi (2, 2)', () => {
    openHouse(['ANNA KOWALSKA'])
    const before = data.useData.getState().fi!.settings.household.members.length
    expect(household.addMemberFromBank('KOWALSKA ANNA')).toBe(ANNA)
    expect(data.useData.getState().fi!.settings.household.members).toHaveLength(before)
    expect(household.addMemberFromBank('PIOTR NOWAK')).not.toBe(ANNA)
    expect(data.useData.getState().fi!.settings.household.members).toHaveLength(before + 1)
  })

  it('granica nazw jedna ze schematem: tyle przechodzi, o jedną więcej – lista znika (2, 8)', () => {
    const base = { id: ANNA, name: 'Anna' }
    const list = (n: number) => Array.from({ length: n }, (_, i) => `NAZWA ${i}`)
    expect(householdMemberSchema.parse({ ...base, bankNames: list(MAX_BANK_NAMES) }).bankNames).toHaveLength(MAX_BANK_NAMES)
    expect(householdMemberSchema.parse({ ...base, bankNames: list(MAX_BANK_NAMES + 1) }).bankNames).toEqual([])
    expect(household.MAX_BANK_NAMES).toBe(MAX_BANK_NAMES)
  })

  it('najwyżej 20 nazw: 21. odmówiona z komunikatem – lista się nie zeruje przy zapisie', () => {
    const full = Array.from({ length: household.MAX_BANK_NAMES }, (_, i) => `NAZWA ${i}`)
    openHouse(full)
    expect(household.addBankName(ANNA, 'NAZWA EXTRA')).toBe(false)
    expect(names(ANNA)).toEqual(full)
    expect(ui.useUi.getState().toasts.at(-1)).toMatchObject({ kind: 'error', text: expect.stringContaining('Najwyżej 20 nazw') })
  })
})
