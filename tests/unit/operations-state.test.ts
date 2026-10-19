import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { warsawNow } from '@shared/calc/dates'
import { withAmount } from '@shared/calc/share'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type ImportRule, type Transaction } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here a mock that takes every write.
const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: unknown[]) => rs.map((r) => ({ ok: true, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(),
  deleteRecords: vi.fn(),
  historyKeep: vi.fn()
}
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) })
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const ops = await import('../../src/renderer/features/operations/state')

const FOOD = defaultCategoryId(1)
const FUN = defaultCategoryId(6)
let seq = 0
const nextId = () => `01K7S00000000000000000${String(++seq).padStart(4, '0')}`
const tx = (over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, amount: -1000, ...over })

function load(txs: Transaction[], rules: ImportRule[] = []): void {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = txs.map((t) => ({ record: t, relPath: `transactions/2026/2026-10-14_${t.id}.json`, readOnly: false }))
  data.applySnapshot({
    fi: { ...fi, settings: { ...fi.settings, import: { ...fi.settings.import, rules } } },
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
}
const current = (id: string) => data.useData.getState().records.transactions[id]!.record
const lastUndo = () => ui.useUi.getState().toasts.at(-1)!.action!.run

beforeEach(() => {
  storage.clear()
  ops.showStoredFilter()
  ops.resetFilter()
})

describe('widok listy z innego ekranu nie zapisuje się na filtr tego komputera (1.6.4, B88)', () => {
  it('Mostek, powiadomienie, nowa operacja: zapisany filtr zostaje – „mój filtr” go pokazuje', () => {
    ops.setFilter({ accounts: [MBANK_ACCOUNT_ID], categories: [FOOD] })
    const stored = storage.get('fi.operations.filter')
    ops.showFilter({ period: { kind: 'all' }, accounts: [], categories: [], marks: ['refundable'] })
    expect(ops.useOperationsUi.getState()).toMatchObject({ shown: true, filter: { accounts: [], marks: ['refundable'] } })
    expect(storage.get('fi.operations.filter')).toBe(stored)
    // A search or a period in that view is no filter of the user's.
    ops.setFilter({ query: 'żabka' })
    expect(storage.get('fi.operations.filter')).toBe(stored)
    // Accounts, a category ticked or „wyczyść filtry” in the view: still the view's – the stored filter stays.
    ops.setFilter({ accounts: ['X'], categories: [FUN] })
    ops.resetFilter()
    expect(storage.get('fi.operations.filter')).toBe(stored)
    expect(ops.useOperationsUi.getState()).toMatchObject({ shown: true, filter: { accounts: [], categories: [], marks: [] } })
    ops.showStoredFilter()
    expect(ops.useOperationsUi.getState()).toMatchObject({ shown: false, filter: { accounts: [MBANK_ACCOUNT_ID], categories: [FOOD], marks: [] } })
    // After „mój filtr” the changes are the user's again.
    ops.setFilter({ accounts: ['X'] })
    expect(JSON.parse(storage.get('fi.operations.filter')!)).toMatchObject({ accounts: ['X'], categories: [FOOD] })
  })

  it('widok, który nie chowa zapisanego filtra (tylko okres, wyszukiwanie), nie jest widokiem – zmiany zapisują się dalej', () => {
    ops.showFilter({ period: { kind: 'all' }, query: '' })
    expect(ops.useOperationsUi.getState().shown).toBe(false)
    // The same values as stored: nothing hidden either.
    ops.showFilter({ accounts: [], marks: [] })
    expect(ops.useOperationsUi.getState().shown).toBe(false)
    ops.setFilter({ categories: [FOOD] })
    expect(JSON.parse(storage.get('fi.operations.filter')!)).toMatchObject({ categories: [FOOD] })
  })
})

describe('bieżący miesiąc listy idzie z kalendarzem (1.6.4, B81)', () => {
  it('lista na dawnym bieżącym miesiącu przechodzi na nowy; wybrany przez użytkownika zostaje', () => {
    const now = warsawNow().month
    expect(ops.useOperationsUi.getState().filter.period).toEqual({ kind: 'month', month: now })
    ops.followCurrentMonth('2099-01')
    expect(ops.useOperationsUi.getState().filter.period).toEqual({ kind: 'month', month: '2099-01' })
    ops.setFilter({ period: { kind: 'month', month: '2098-05' } })
    ops.followCurrentMonth('2099-02')
    expect(ops.useOperationsUi.getState().filter.period).toEqual({ kind: 'month', month: '2098-05' })
  })
})

describe('nowa operacja zawsze widoczna (1.6.4, B77)', () => {
  it('okres „od–do” bez dzisiejszego dnia: lista przechodzi na miesiąc nowej operacji', () => {
    load([])
    ops.setFilter({ period: { kind: 'range', from: '2020-01-01', to: '2020-03-31' } })
    const id = ops.newOperation()
    const date = current(id).date
    expect(ops.useOperationsUi.getState().filter.period).toEqual({ kind: 'month', month: date.slice(0, 7) })
    // Only the period moved: nothing of the stored filter hidden – no „mój filtr”.
    expect(ops.useOperationsUi.getState().shown).toBe(false)
  })

  it('filtr kategorii, który ukryłby nową operację: zdjęty w widoku, zapisany zostaje', () => {
    load([])
    ops.setFilter({ categories: [FOOD] })
    const stored = storage.get('fi.operations.filter')
    ops.newOperation()
    expect(ops.useOperationsUi.getState()).toMatchObject({ shown: true, filter: { categories: [] } })
    expect(storage.get('fi.operations.filter')).toBe(stored)
  })
})

describe('„Cofnij” zbiorczej zmiany cofa tylko swoje pola (1.6.4, B66)', () => {
  it('kategoria: późniejsza notatka zostaje; kategoria zmieniona w międzyczasie zostaje', () => {
    const a = tx({ counterparty: 'A', categoryId: FUN })
    const b = tx({ counterparty: 'B' })
    load([a, b])
    ops.tickOperations([a.id, b.id], true)
    ops.categorizeTicked([a.id, b.id], FOOD, 'none', 'Kategoria')
    expect([current(a.id).categoryId, current(b.id).categoryId]).toEqual([FOOD, FOOD])
    data.updateRecord('transactions', a.id, (r) => ({ ...r, note: 'później' }))
    data.updateRecord('transactions', b.id, (r) => ({ ...r, categoryId: FUN }))
    lastUndo()()
    expect([current(a.id).categoryId, current(a.id).note]).toEqual([FUN, 'później'])
    expect(current(b.id).categoryId).toBe(FUN)
  })

  it('finansujący: kwota zmieniona później zostaje, finansowanie wraca', () => {
    const a = tx({ counterparty: 'A' })
    load([a])
    ops.tickOperations([a.id], true)
    ops.financeTicked([a.id], { memberId: HOUSE_MEMBER_ID }, 'Finansuje Dom')
    expect(current(a.id)).toMatchObject({ refundable: true, memberId: HOUSE_MEMBER_ID })
    data.updateRecord('transactions', a.id, (r) => ({ ...r, amount: -2500 }))
    lastUndo()()
    expect(current(a.id)).toMatchObject({ refundable: false, memberId: null, amount: -2500 })
  })

  it('wspólny zakup: nowa kwota przelicza linie, „Cofnij” i tak zdejmuje wspólne finansowanie', () => {
    const a = tx({ counterparty: 'A', amount: -10000 })
    load([a])
    ops.tickOperations([a.id], true)
    ops.financeTicked([a.id], { share: { mode: 'equal', lines: [{ memberId: null, value: 0, gift: false }, { memberId: HOUSE_MEMBER_ID, value: 0, gift: false }] } }, 'Wspólnie')
    expect(current(a.id).splits.map((x) => x.amount)).toEqual([-5000, -5000])
    data.updateRecord('transactions', a.id, (r) => withAmount(r, -12000))
    expect(current(a.id).splits.map((x) => x.amount)).toEqual([-6000, -6000])
    lastUndo()()
    expect(current(a.id)).toMatchObject({ amount: -12000, share: null, splits: [] })
  })

  it('operacja zmieniona w międzyczasie zostaje – „Cofnij” mówi, ile cofnął', () => {
    const a = tx({ counterparty: 'A' })
    const b = tx({ counterparty: 'B' })
    load([a, b])
    ops.tickOperations([a.id, b.id], true)
    ops.categorizeTicked([a.id, b.id], FOOD, 'none', 'Kategoria')
    data.updateRecord('transactions', b.id, (r) => ({ ...r, categoryId: FUN }))
    lastUndo()()
    expect(current(a.id).categoryId).toBeNull()
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Cofnięto 1 z 2 – jedna zmieniła się w międzyczasie i zostaje bez zmian.')
  })

  it('reguły: tylko te zapisane akcją – reguła dodana w międzyczasie zostaje', () => {
    const a = tx({ counterparty: 'SKLEP ALFA', bank: { format: 'mbank', key: 'k:a', description: 'SKLEP ALFA', counterparty: 'SKLEP ALFA', operation: '', category: '', pending: false, importedAt: '2026-10-15T08:00:00.000Z' } })
    load([a])
    ops.tickOperations([a.id], true)
    ops.categorizeTicked([a.id], FOOD, 'brands', 'Kategoria')
    const rules = () => data.useData.getState().fi!.settings.import.rules
    expect(rules().map((r) => r.match)).toEqual(['sklepalfa'])
    const other: ImportRule = { ...rules()[0]!, id: nextId(), match: 'innasprawa' }
    data.updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: [...f.settings.import.rules, other] } } }))
    lastUndo()()
    expect(rules().map((r) => r.match)).toEqual(['innasprawa'])
  })

  it('reguły przeczytane ponownie po zapisie (nowe obiekty): „Cofnij” je i tak zdejmuje', () => {
    const a = tx({ counterparty: 'SKLEP BETA', bank: { format: 'mbank', key: 'k:b', description: 'SKLEP BETA', counterparty: 'SKLEP BETA', operation: '', category: '', pending: false, importedAt: '2026-10-15T08:00:00.000Z' } })
    load([a])
    ops.tickOperations([a.id], true)
    ops.categorizeTicked([a.id], FOOD, 'brands', 'Kategoria')
    const rules = () => data.useData.getState().fi!.settings.import.rules
    expect(rules().map((r) => r.match)).toEqual(['sklepbeta'])
    // The settings as the folder gives them back: the same content, other objects (keys in another order).
    data.updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: f.settings.import.rules.map((r) => Object.fromEntries(Object.entries(r).reverse()) as ImportRule) } } }))
    lastUndo()()
    expect(rules()).toEqual([])
  })
})
