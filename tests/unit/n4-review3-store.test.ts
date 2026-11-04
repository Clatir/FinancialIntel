import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { bankNamesClash, memberOf, skippedDebtsOf } from '@shared/calc/household'
import { latestImport, redoRefusal } from '@shared/import/batch'
import { COLLECTIONS } from '@shared/paths'
import { defaultCategoryId, importBatchSchema, importRuleSchema, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type ImportRule, type SettingsFile, type Transaction } from '@shared/schema'
import { listaCsv, type CsvBuy } from '../e2e/mbank-csv'

// The third code review of N4 (1.15.8): its findings in the window's stores, each with the scenario that failed before the
// fix. The stores talk to the main process through window.fi (preload): a mock stamping every write with its time, as the
// main process does, a few milliseconds after the call.
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
const fleet = await import('../../src/renderer/store/fleet')
const state = await import('../../src/renderer/features/import/state')
const batches = await import('../../src/renderer/features/import/batches')
const household = await import('../../src/renderer/features/household/actions')
const rules = await import('../../src/renderer/features/import/rules')
const options = await import('../../src/renderer/features/import/options')
const { fieldWords } = await import('../../src/renderer/features/quick/fieldWords')

const AT = '2026-09-01T10:00:00.000Z'
const ANNA = '01KN4RANNA0000000000000001'
const OLA = '01KN4ROLA00000000000000002'
const MAREK = '01KN4MMAREK000000000000001'
const EVENTIM = '01KN4MEVENT000000000000002'
const ADVANCE = '01KN4MADVAN000000000000003'
const person = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
let folder = 0
function open(over: { members?: HouseholdMember[]; transactions?: Transaction[]; rules?: ImportRule[]; start?: string } = {}): string {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = (over.transactions ?? []).map((record) => ({ record, relPath: `transactions/2026/${record.date}_${record.id}.json`, readOnly: false }))
  const status: FolderStatus = { dataDir: `/dane-n4r3-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  const members = [...fi.settings.household.members, ...(over.members ?? [])]
  const settings = {
    ...fi.settings,
    ...(over.start ? { budget: { ...fi.settings.budget, start: over.start } } : {}),
    household: { ...fi.settings.household, since: null, assignFrom: null, members },
    import: { ...fi.settings.import, rules: over.rules ?? fi.settings.import.rules }
  }
  data.applySnapshot({ fi: { ...fi, settings }, records, problems: [], conflicts: [], status, loadMs: 0 })
  return fi.settings.accounts[0]!.id
}
const bytes = (text: string) => new TextEncoder().encode(text)
const operations = () => data.listOf(data.useData.getState().records.transactions)
const later = () => new Promise((r) => setTimeout(r, 5))
const toasts = () => ui.useUi.getState().toasts.map((t) => t.text)
const lastToast = () => ui.useUi.getState().toasts.at(-1)!
const undoAction = (start: string) => ui.useUi.getState().toasts.find((t) => t.action?.label === 'Cofnij' && t.text.startsWith(start))!.action!.run
const members = () => data.useData.getState().fi!.settings.household.members
const names = (id: string) => members().find((m) => m.id === id)!.bankNames
async function runFile(name: string, buys: CsvBuy[], period: { from: string; to: string }): Promise<string> {
  await later()
  await state.loadImportFile(name, bytes(listaCsv(buys, period)))
  await state.runImport()
  await later()
  return latestImport(data.listOf(data.useData.getState().records.imports))!.id
}

beforeEach(() => {
  vi.clearAllMocks()
  ui.useUi.setState({ toasts: [] })
})

describe('przegląd N4 3, 1 i 3: „Cofnij” cofnięcia importu nigdy nie dubluje operacji i nigdy po cichu', () => {
  const PERIOD = { from: '2026-10-19', to: '2026-10-26' }
  const BUYS: CsvBuy[] = [
    { date: '2026-10-20', amount: 87.91, name: 'SLUSARZ KOWAL' },
    { date: '2026-10-25', amount: 31.95, name: 'ZABKA Z1234' }
  ]

  it('cofnięty import A, ten sam plik wczytany znowu (B), „Cofnij” cofnięcia A: odmowa ze słowem, bez dubli (dawniej: 4 operacje)', async () => {
    open()
    const a = await runFile('lista.csv', BUYS, PERIOD)
    expect(await batches.undoImport(a)).toBe(true)
    const redo = undoAction('Import cofnięty')
    await runFile('lista.csv', BUYS, PERIOD)
    expect(operations()).toHaveLength(2)
    redo()
    await vi.waitFor(() => expect(toasts().some((t) => t.startsWith('Po cofnięciu był kolejny import'))).toBe(true))
    await later()
    expect(operations()).toHaveLength(2)
    expect(data.useData.getState().records.imports[a]!.record.undoneAt).not.toBeNull()
  })

  it('wiersze banku wróciły inną drogą (bez paczki): odmowa; nic nie wróciło – można', () => {
    const acc = '01KDEFACC00000000000000001'
    const row = (id: string, key: string) => transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id, createdAt: AT, updatedAt: AT, date: '2026-10-20', accountId: acc, amount: -100, bank: { key, importedAt: AT, source: 'lista' } })
    const batch = importBatchSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01K7B0000000000000000000BA', createdAt: AT, updatedAt: AT, at: AT, savedAt: AT, accountId: acc, created: ['01K7T00000000000000000000X'], undoneAt: AT })
    const gone = [row('01K7T00000000000000000000X', 'k1')]
    expect(redoRefusal(batch, [batch], gone, [row('01K7T00000000000000000000Y', 'k1')])).toBe('rows')
    expect(redoRefusal(batch, [batch], gone, [row('01K7T00000000000000000000Y', 'k2')])).toBeNull()
    expect(redoRefusal(batch, [batch], gone, [])).toBeNull()
  })

  it('folder tylko do odczytu albo import już z powrotem: „Cofnij” mówi, dlaczego nic się nie stało (dawniej: cisza)', async () => {
    open()
    const a = await runFile('lista.csv', BUYS, PERIOD)
    expect(await batches.undoImport(a)).toBe(true)
    const redo = undoAction('Import cofnięty')
    const status = data.useData.getState().status!
    data.useData.setState({ status: { ...status, readOnly: true } })
    ui.useUi.setState({ toasts: [] })
    redo()
    await vi.waitFor(() => expect(toasts().join(' ')).toContain('Import nie wrócił do budżetu.'))
    expect(operations()).toHaveLength(0)
    data.useData.setState({ status })
    redo()
    await vi.waitFor(() => expect(toasts()).toContain('Import znowu w budżecie.'))
    ui.useUi.setState({ toasts: [] })
    redo()
    await vi.waitFor(() => expect(toasts()).toContain('Ten import jest już w budżecie.'))
    expect(operations()).toHaveLength(2)
  })
})

describe('przegląd N4 3, 2: słowa pól szybkiego wpisu zostają z zapisem, gdy w trakcie pisze się dalej', () => {
  it('Ctrl+Enter, zaraz kolejna kwota: odpowiedź zapisu mówi o skróconym tagu', () => {
    const w = fieldWords()
    w.action()
    w.word('Tag dłuższy niż 40 znaków został skrócony.')
    w.send()
    // The next amount typed before the answer came: a new action.
    w.action()
    expect(w.now()).toEqual([])
    expect(w.answer()).toEqual(['Tag dłuższy niż 40 znaków został skrócony.'])
    expect(w.answer()).toEqual([])
  })
})

describe('przegląd N4 3, 4, 5 i 11: jedna reguła „ta sama osoba” – ta, którą czyta import (memberOf)', () => {
  it('nazwa zawierająca nazwę innego domownika (i odwrotnie) – odmówiona; import dałby jej przelewy tamtemu', () => {
    open({ members: [person(ANNA, 'Anna', { bankNames: ['JAN KOWALSKI', 'JAN JAN'] }), person(OLA, 'Ola')] })
    for (const typed of ['JAN KOWALSKI SENIOR', 'jan', 'KOWALSKI JAN']) {
      ui.useUi.setState({ toasts: [] })
      expect(household.addBankName(OLA, typed)).toBe(false)
      expect(lastToast()).toMatchObject({ kind: 'error', text: expect.stringContaining('od nazwy, którą ma Anna') })
      // The import's own reading: one of the two would take the other's transfer.
      const both = [members().find((m) => m.id === ANNA)!, { ...person(OLA, 'Ola'), bankNames: [typed] }]
      expect(memberOf(typed, both)?.id === ANNA || memberOf('JAN KOWALSKI', [both[1]!])?.id === OLA || memberOf('JAN JAN', [both[1]!])?.id === OLA).toBe(true)
    }
    expect(names(OLA)).toEqual([])
    expect(household.addBankName(OLA, 'OLA NOWAK')).toBe(true)
    expect(names(OLA)).toEqual(['OLA NOWAK'])
    expect(bankNamesClash('ANNA NOWAK', 'JAN KOWALSKI')).toBe(false)
  })

  it('ta sama nazwa domownika w innej pisowni: słowo, nic nie dopisane; „Cofnij” usunięcia, gdy wróciła – też słowo (dawniej: cisza)', () => {
    open({ members: [person(ANNA, 'Anna', { bankNames: ['JAN ŻÓŁW'] })] })
    expect(household.addBankName(ANNA, 'zolw jan')).toBe(true)
    expect(lastToast()).toMatchObject({ kind: 'info', text: 'Anna ma już nazwę „JAN ŻÓŁW” – „zolw jan” to dla importu ta sama.' })
    expect(names(ANNA)).toEqual(['JAN ŻÓŁW'])
    household.removeBankName(ANNA, 'JAN ŻÓŁW')
    const back = undoAction('Nazwa „JAN ŻÓŁW”')
    household.addBankName(ANNA, 'Jan Zolw')
    back()
    expect(lastToast().text).toBe('Anna ma już nazwę „Jan Zolw” – nic do przywrócenia.')
  })

  it('„+ domownik” w imporcie: nie dla nazwy, którą import przypisze domownikowi (dawniej: tylko dokładnie ta sama)', () => {
    open({ members: [person(ANNA, 'Anna', { bankNames: ['JAN KOWALSKI'] })] })
    const group = (name: string) => ({ direction: 'in' as const, names: [name], label: name, rows: [{ row: { operation: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY' } }] }) as unknown as Parameters<typeof options.offersNewMember>[0]
    const choice = { kind: 'income', household: false } as Parameters<typeof options.offersNewMember>[1]
    expect(options.offersNewMember(group('JAN KOWALSKI SENIOR'), choice, members(), [])).toBe(false)
    expect(options.offersNewMember(group('KOWALSKI JAN'), choice, members(), [])).toBe(false)
    expect(options.offersNewMember(group('PIOTR NOWAK'), choice, members(), [])).toBe(true)
    expect(household.addMemberFromBank('JAN KOWALSKI SENIOR')).toBe(ANNA)
  })
})

describe('przegląd N4 3, 6, 7 i 8: „Cofnij” nigdy nie nadpisuje zmian zrobionych po działaniu i mówi, co zostaje', () => {
  /** Marek owes 360 zł for the tickets; his 100 zł of 25.10 as an advance for the future skipped it (AP-4). */
  function openMarek(start?: string): void {
    const acc = createDefaultSettings(AT).settings.accounts[0]!.id
    const tx = (over: Partial<Transaction>) => transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, createdAt: AT, updatedAt: AT, accountId: acc, ...over })
    open({
      ...(start ? { start } : {}),
      members: [person(MAREK, 'Marek', { bankNames: ['MAREK TESTOWY'] })],
      transactions: [
        tx({ id: EVENTIM, date: '2026-10-20', amount: -36000, categoryId: defaultCategoryId(6, 1), refundable: true, memberId: MAREK, counterparty: 'EVENTIM' }),
        tx({ id: ADVANCE, date: '2026-10-25', kind: 'income', amount: 10000, memberId: MAREK, counterparty: 'MAREK TESTOWY', inflowKind: 'advance', advance: true })
      ]
    })
  }
  const advances = () => skippedDebtsOf(fleet.fleetNow()!.household, fleet.fleetNow()!.receivables.members, data.useData.getState().fi!.settings.import.notDuplicates)

  it('„Spłać”, potem zmiana tej wpłaty, „Cofnij”: wpłata zostaje i to jest powiedziane (dawniej: cisza)', () => {
    openMarek()
    expect(household.repayAdvances(MAREK)).toBe(true)
    const undo = undoAction('Marek:')
    data.updateRecord('transactions', ADVANCE, (t) => ({ ...t, note: 'moja' }))
    undo()
    expect(data.useData.getState().records.transactions[ADVANCE]!.record.note).toBe('moja')
    expect(lastToast().text).toBe('Nic nie cofnięto – zmieniło się od tego czasu i zostaje, jak jest.')
  })

  it('„zostaw” na meldunku, który inny komputer już zostawił: „nic do zmiany”, bez pustego „Cofnij” (dawniej: „Zaliczki zostają”)', () => {
    openMarek()
    household.keepAdvances(MAREK)
    expect(advances()).toEqual([])
    ui.useUi.setState({ toasts: [] })
    household.keepAdvances(MAREK)
    expect(toasts()).toEqual(['Marek: nic do zmiany – zaliczki na przyszłość nie zostawiają już długu.'])
  })

  const rule = (over: Partial<ImportRule> = {}): ImportRule =>
    importRuleSchema.parse({ id: '01KN4R3R0000000000000000A1', match: 'orlen', mode: 'contains', direction: 'out', label: 'Orlen', kind: 'expense', categoryId: defaultCategoryId(3, 1), learned: true, hits: 3, updatedAt: AT, ...over })
  const ruleNow = () => data.useData.getState().fi!.settings.import.rules.find((r) => r.id === rule().id)

  it('zmiana reguły, potem kolejna zmiana, „Cofnij” pierwszej: druga zostaje (dawniej: nadpisana starą regułą)', () => {
    open({ rules: [rule()] })
    rules.editRule(rule().id, { direction: 'out', choice: { ...rules.choiceOfRule(rule()), categoryId: defaultCategoryId(3, 2) } })
    const undo = undoAction('Reguła „Orlen” zmieniona')
    rules.editRule(rule().id, { direction: 'out', choice: { ...rules.choiceOfRule(rule()), categoryId: defaultCategoryId(3, 3) } })
    undo()
    expect(ruleNow()!.categoryId).toBe(defaultCategoryId(3, 3))
    expect(lastToast().text).toBe('Reguła „Orlen” zmieniła się od tego czasu – zostaje, jak jest.')
    // Untouched since: back as it was.
    rules.editRule(rule().id, { direction: 'in', choice: rules.choiceOfRule(ruleNow()!) })
    ui.useUi.getState().toasts.at(-1)!.action!.run()
    expect(ruleNow()!.direction).toBe('out')
  })

  it('nowa reguła kwotowa zmieniona po dodaniu: „Cofnij” jej nie usuwa', () => {
    open()
    rules.addAmountRule({ brand: 'orlen', label: 'Orlen', maxAmount: 4000, categoryId: defaultCategoryId(3, 1) })
    const undo = undoAction('Nowa reguła')
    const id = data.useData.getState().fi!.settings.import.rules.at(-1)!.id
    rules.editRule(id, { direction: 'out', choice: { kind: 'expense', categoryId: defaultCategoryId(3, 2) } as Parameters<typeof rules.editRule>[1]['choice'], maxAmount: 4000 })
    undo()
    expect(data.useData.getState().fi!.settings.import.rules.some((r) => r.id === id)).toBe(true)
    expect(lastToast().text).toContain('zmieniła się od dodania')
  })

  it('„Cofnij” dnia zwrotów, gdy zmieniono go znowu: zostaje; „Cofnij” startu rozliczeń nie gubi domownika dodanego potem', () => {
    openMarek('2026-09-01')
    household.setAssignFrom('2026-10-01')
    const undo = undoAction('Zwroty od')
    household.setAssignFrom('2026-10-15')
    undo()
    expect(data.useData.getState().fi!.settings.household.assignFrom).toBe('2026-10-15')
    expect(lastToast().text).toBe('Nic nie cofnięto – zmieniło się od tego czasu i zostaje, jak jest.')
    // The start of the settlements moved (Marek's balance on it recounted), then a member added: „Cofnij” keeps them.
    ui.useUi.setState({ toasts: [] })
    household.setHouseholdSince('2026-11-01')
    const back = ui.useUi.getState().toasts.find((t) => t.action?.label === 'Cofnij')
    expect(back).toBeDefined()
    const added = household.addMember('Kasia')!
    back!.action!.run()
    expect(members().some((m) => m.id === added)).toBe(true)
    expect(data.useData.getState().fi!.settings.household.since).toBeNull()
  })

  it('zwrot gotówką zmieniony po zapisaniu: „Cofnij” go nie usuwa; „Zastosuj do historii” – cofa nietknięte, mówi o reszcie', () => {
    openMarek()
    const id = household.repayInCash({ id: EVENTIM, date: '2026-10-20', counterparty: 'EVENTIM' }, MAREK, 5000)!
    const undo = undoAction('Oddane gotówką')
    data.updateRecord('transactions', id, (t) => ({ ...t, note: 'w kopercie' }))
    undo()
    expect(data.useData.getState().records.transactions[id]?.record.note).toBe('w kopercie')
    expect(lastToast().text).toBe('Nic nie cofnięto – zmieniło się od tego czasu i zostaje, jak jest.')
    const tx = (key: string) => data.useData.getState().records.transactions[key]!.record
    const items = [EVENTIM, ADVANCE].map((key) => ({ before: tx(key), after: { ...tx(key), note: 'z reguły' } }))
    rules.applyRuleToHistory(items, 'Eventim')
    const back = undoAction('Reguła „Eventim” zastosowana')
    data.updateRecord('transactions', ADVANCE, (t) => ({ ...t, note: 'moja' }))
    back()
    expect([tx(EVENTIM).note, tx(ADVANCE).note]).toEqual(['', 'moja'])
    expect(lastToast().text).toBe('Cofnięte operacje: 1; zmienione od tego czasu zostają, jak są: 1.')
  })

  it('rozłączona nazwa połączona znowu inaczej: „Cofnij” rozłączenia zostawia nowe połączenie i to mówi', () => {
    open()
    rules.mergeNames([{ into: { key: 'kawiarnia mokka', label: 'KAWIARNIA MOKKA' }, from: [{ key: 'mokka', label: 'MOKKA' }] }] as Parameters<typeof rules.mergeNames>[0])
    rules.unmergeName('mokka')
    const undo = undoAction('Rozłączono')
    rules.mergeNames([{ into: { key: 'mokka bar', label: 'MOKKA BAR' }, from: [{ key: 'mokka', label: 'MOKKA' }] }] as Parameters<typeof rules.mergeNames>[0])
    undo()
    expect(data.useData.getState().fi!.settings.import.aliases.mokka?.to).toBe('mokka bar')
    expect(lastToast().text).toBe('Nic nie cofnięto – zmieniło się od tego czasu i zostaje, jak jest.')
  })
})
