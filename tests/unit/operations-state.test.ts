import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { warsawNow } from '@shared/calc/dates'
import { withAmount } from '@shared/calc/share'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type ImportRule, type Transaction } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here a mock that takes every write.
const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: unknown[]) => rs.map((r) => ({ ok: true, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(),
  deleteRecords: vi.fn(),
  historyKeep: vi.fn(),
  historyList: vi.fn(async () => [] as unknown[])
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

describe('zmiana zaznaczonych operacji naraz (1.7.0, F11)', () => {
  const WALLET = XTB_WALLET_ACCOUNT_ID

  it('na inne konto: tylko zaznaczone i widoczne; przelew na konto swojej drugiej strony – pominięty; już na nim – bez zmiany', () => {
    const a = tx({ counterparty: 'A' })
    const toWallet = tx({ kind: 'transfer', counterAccountId: WALLET, bothSides: true })
    const there = tx({ accountId: WALLET })
    const hidden = tx({ counterparty: 'ukryta' })
    load([a, toWallet, there, hidden])
    ops.tickOperations([a.id, toWallet.id, there.id, hidden.id], true)
    const plan = ops.bulkPlan([a.id, toWallet.id, there.id], { kind: 'account', accountId: WALLET })
    expect(plan.before.map((t) => t.id)).toEqual([a.id])
    expect(plan.after).toEqual([{ ...a, accountId: WALLET }])
    expect(plan.skipped).toBe(1)
  })

  it('na przelew na konto budżetu: jedna operacja dla obu kont; zadokowana zostaje swoim rodzajem; przesunięcie daty – też dzień drugiej strony', () => {
    const a = tx({ counterparty: 'A', amount: 5000, kind: 'income' })
    const docked = tx({ kind: 'trading', amount: 30000 })
    load([a, docked])
    const dockings = { D1: { record: { id: 'D1', transactionId: docked.id } as never, relPath: 'dockings/x.json', readOnly: false } }
    data.useData.setState((s) => ({ records: { ...s.records, dockings } }))
    ops.tickOperations([a.id, docked.id], true)
    const plan = ops.bulkPlan([a.id, docked.id], { kind: 'kind', to: 'transfer', counterAccountId: WALLET })
    expect(plan.after).toEqual([expect.objectContaining({ id: a.id, kind: 'transfer', amount: -5000, counterAccountId: WALLET, bothSides: true })])
    expect(plan.skipped).toBe(1)
    const t = tx({ kind: 'transfer', counterAccountId: WALLET, bothSides: true, counterDate: '2026-10-15' })
    load([t])
    ops.tickOperations([t.id], true)
    expect(ops.bulkPlan([t.id], { kind: 'shift', days: -2 }).after).toEqual([{ ...t, date: '2026-10-12', counterDate: '2026-10-13' }])
  })

  it('„Cofnij” zmienia tylko pola zmiany, póki są takie, jak ustawiła (B66); wpis nowszej wersji – bez zmian', async () => {
    const a = tx({ counterparty: 'A' })
    const b = tx({ counterparty: 'B' })
    load([a, b])
    ops.tickOperations([a.id, b.id], true)
    await ops.applyBulk(ops.bulkPlan([a.id, b.id], { kind: 'account', accountId: XTB_WALLET_ACCOUNT_ID }))
    expect([current(a.id).accountId, current(b.id).accountId]).toEqual([XTB_WALLET_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID])
    expect(ops.useOperationsUi.getState().ticked).toEqual({})
    data.updateRecord('transactions', a.id, (r) => ({ ...r, note: 'później' }))
    data.updateRecord('transactions', b.id, (r) => ({ ...r, accountId: MBANK_ACCOUNT_ID, note: 'ręcznie' }))
    lastUndo()()
    expect(current(a.id)).toMatchObject({ accountId: MBANK_ACCOUNT_ID, note: 'później' })
    expect(current(b.id)).toMatchObject({ accountId: MBANK_ACCOUNT_ID, note: 'ręcznie' })
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Cofnięto 1 z 2 – jedna zmieniła się w międzyczasie i zostaje bez zmian.')
    const newer = tx({ counterparty: 'N' })
    load([newer])
    data.useData.setState((s) => ({ records: { ...s.records, transactions: { [newer.id]: { ...s.records.transactions[newer.id]!, readOnly: true } } } }))
    ops.tickOperations([newer.id], true)
    expect(ops.bulkPlan([newer.id], { kind: 'shift', days: 1 })).toMatchObject({ before: [], newer: 1 })
  })

  it('przelew sprzed 1.7.0 (jedna strona) zmieniony na inne konto budżetu zostaje jedną stroną – jego druga strona może być osobną operacją (przegląd S)', () => {
    const legacy = tx({ kind: 'transfer', amount: -5000 })
    load([legacy])
    ops.tickOperations([legacy.id], true)
    const [after] = ops.bulkPlan([legacy.id], { kind: 'kind', to: 'transfer', counterAccountId: WALLET }).after
    expect(after).toMatchObject({ counterAccountId: WALLET })
    expect(after!.bothSides).toBeUndefined()
  })

  it('usunięcie: dysk odmawia jednej – ona i jej dokowanie zostają, reszta znika (przegląd S)', async () => {
    const a = tx({ counterparty: 'A' })
    const docked = tx({ kind: 'trading', amount: 30000 })
    load([a, docked])
    const dockings = { D1: { record: { id: 'D1', transactionId: docked.id } as never, relPath: 'dockings/x.json', readOnly: false } }
    data.useData.setState((s) => ({ records: { ...s.records, dockings } }))
    api.deleteRecords.mockImplementation(async (_c: string, ids: string[]) => ids.map((id) => (id === docked.id ? { id, error: 'Plik zajęty.' } : { id })))
    ops.tickOperations([a.id, docked.id], true)
    await ops.applyBulk(ops.bulkPlan([a.id, docked.id], { kind: 'delete' }))
    expect(Object.keys(data.useData.getState().records.transactions)).toEqual([docked.id])
    expect(api.deleteRecords).not.toHaveBeenCalledWith('dockings', expect.anything(), undefined)
    expect(ui.useUi.getState().toasts.map((t) => t.text)).toContain('Plik zajęty.')
    api.deleteRecords.mockReset()
  })

  it('usunięcie: zaznaczone znikają razem z dokowaniami', async () => {
    const a = tx({ counterparty: 'A' })
    const docked = tx({ kind: 'trading', amount: 30000 })
    load([a, docked])
    const dockings = { D1: { record: { id: 'D1', transactionId: docked.id } as never, relPath: 'dockings/x.json', readOnly: false } }
    data.useData.setState((s) => ({ records: { ...s.records, dockings } }))
    api.deleteRecords.mockImplementation(async (_c: string, ids: string[]) => ids.map((id) => ({ id })))
    ops.tickOperations([a.id, docked.id], true)
    await ops.applyBulk(ops.bulkPlan([a.id, docked.id], { kind: 'delete' }))
    expect(Object.keys(data.useData.getState().records.transactions)).toEqual([])
    expect(api.deleteRecords).toHaveBeenCalledWith('dockings', ['D1'], undefined)
    api.deleteRecords.mockReset()
  })
})

describe('przegląd S: przejście do operacji zdejmuje też filtry 1.7.0 (F18), przelewy łączone bez liczenia dwa razy (F10)', () => {
  it('operacja z palety, meldunków, Mostka: kwota, kontrahent, domownik… nie chowają jej; zapisany filtr zostaje', () => {
    const t = tx({ counterparty: 'Mała Kawa', amount: -1200 })
    load([t])
    ops.setFilter({ amountMin: 10000, brands: ['inna'], members: [HOUSE_MEMBER_ID] })
    const stored = storage.get('fi.operations.filter')
    ops.openOperation(t)
    expect(ops.useOperationsUi.getState()).toMatchObject({ shown: true, selectedId: t.id, filter: { amountMin: null, amountMax: null, brands: [], members: [], containers: [], goals: [], loans: [], transferAccounts: [] } })
    expect(storage.get('fi.operations.filter')).toBe(stored)
    // A new entry (Ctrl+N) is shown too.
    ops.showStoredFilter()
    ops.newOperation()
    expect(ops.useOperationsUi.getState().filter).toMatchObject({ amountMin: null, brands: [], members: [] })
    expect(storage.get('fi.operations.filter')).toBe(stored)
  })

  it('„wszystkie” w edytorze: cała historia tego kontrahenta jako widok – zapisany filtr zostaje, inne filtry go nie chowają', () => {
    const t = tx({ counterparty: 'BIEDRONKA 1234' })
    load([t])
    ops.setFilter({ kinds: ['income'], accounts: [XTB_WALLET_ACCOUNT_ID] })
    const stored = storage.get('fi.operations.filter')
    ops.showBrand(t)
    expect(ops.useOperationsUi.getState()).toMatchObject({ shown: true, filter: { period: { kind: 'all' }, kinds: [], accounts: [] } })
    expect(ops.useOperationsUi.getState().filter.brands).toHaveLength(1)
    expect(storage.get('fi.operations.filter')).toBe(stored)
  })

  it('połączenie pary: druga strona, której dysk nie usunął – pierwsza wraca do jednej strony (nigdy dwa razy na drugim koncie); „Cofnij” – tylko połączone', async () => {
    const tr = await import('../../src/renderer/features/operations/transfers')
    const out1 = tx({ kind: 'transfer', amount: -5000, counterAccountId: XTB_WALLET_ACCOUNT_ID, date: '2026-10-10' })
    const in1 = tx({ kind: 'transfer', amount: 5000, accountId: XTB_WALLET_ACCOUNT_ID, date: '2026-10-10' })
    const out2 = tx({ kind: 'transfer', amount: -7000, counterAccountId: XTB_WALLET_ACCOUNT_ID, date: '2026-10-12' })
    const in2 = tx({ kind: 'transfer', amount: 7000, accountId: XTB_WALLET_ACCOUNT_ID, date: '2026-10-12' })
    load([out1, in1, out2, in2])
    const pairs = tr.transferIssuesNow().filter((i): i is Extract<typeof i, { kind: 'pair' }> => i.kind === 'pair')
    expect(pairs.map((p) => [p.keep.id, p.drop.id])).toEqual([
      [out1.id, in1.id],
      [out2.id, in2.id]
    ])
    api.deleteRecords.mockImplementation(async (_c: string, ids: string[]) => ids.map((id) => (id === in2.id ? { id, error: 'Zapisany przez nowszą wersję.' } : { id })))
    await tr.joinTransfers(pairs)
    expect(current(out1.id)).toMatchObject({ bothSides: true, counterAccountId: XTB_WALLET_ACCOUNT_ID })
    expect(current(out2.id)).toEqual(out2)
    expect(Object.keys(data.useData.getState().records.transactions).sort()).toEqual([out1.id, out2.id, in2.id].sort())
    const undo = ui.useUi.getState().toasts.find((t) => t.text.startsWith('Przelew połączony'))!.action!.run
    data.updateRecord('transactions', out2.id, (r) => ({ ...r, note: 'później' }))
    undo()
    await vi.waitFor(() => expect(current(out1.id)).toEqual(out1))
    expect(current(out2.id).note).toBe('później')
    api.deleteRecords.mockReset()
  })
})
