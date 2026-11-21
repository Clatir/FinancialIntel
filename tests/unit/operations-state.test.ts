import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { warsawNow } from '@shared/calc/dates'
import { withAmount } from '@shared/calc/share'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type ImportRule, type Transaction } from '@shared/schema'
import type { BulkChange } from '../../src/renderer/features/operations/state'

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
    ops.financeTicked([a.id], { memberId: HOUSE_MEMBER_ID }, 'Kupione dla: Dom')
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

  it('N-PC-11 & N-PC-14: repayInCash tworzy wpłatę na konto Gotówka z covers, a usunięcie zakupu czyści covers we wpłacie', async () => {
    const { repayInCash } = await import('../../src/renderer/features/household/actions')
    const { CASH_ACCOUNT_ID } = await import('@shared/schema')
    const purchase = tx({ kind: 'expense', amount: -5000, refundable: true, memberId: HOUSE_MEMBER_ID, counterparty: 'Apteka' })
    load([purchase])
    const cashTxId = repayInCash(purchase, HOUSE_MEMBER_ID, 5000)
    expect(cashTxId).toBeTruthy()
    expect(current(cashTxId!)).toMatchObject({
      accountId: CASH_ACCOUNT_ID,
      kind: 'income',
      amount: 5000,
      memberId: HOUSE_MEMBER_ID,
      covers: [purchase.id]
    })

    // Deleting the purchase cleans its id from covers of the repayment
    api.deleteRecord.mockResolvedValue({ ok: true })
    await ops.deleteOperation(purchase, 'Apteka')
    expect(current(cashTxId!).covers).toEqual([])
  })
})

describe('zmiany grupowe – nowe pola z „Cofnij” (1.20.0, D105)', () => {
  const C1 = nextId()
  const C2 = nextId()
  const G1 = nextId()
  const G2 = nextId()
  const L1 = nextId()
  const L2 = nextId()
  const CORRECTION: Partial<Transaction> = { kind: 'correction', amount: -300, categoryId: null }
  const LOAN: Partial<Transaction> = { kind: 'loan', amount: 50000, categoryId: null }
  /** Each new change: the operation, the change, the fields it sets (and their values before), the toast, a change of them made since. */
  const cases: Array<{ name: string; over: Partial<Transaction>; change: BulkChange; set: Partial<Transaction>; was: Partial<Transaction>; toast: string; since: Partial<Transaction> }> = [
    { name: 'dzień', over: {}, change: { kind: 'day', date: '2026-10-02' }, set: { date: '2026-10-02' }, was: { date: '2026-10-14' }, toast: 'Zmieniono datę', since: { date: '2026-10-20' } },
    { name: 'tag – dołóż', over: { tags: ['A'] }, change: { kind: 'tag', tag: 'B', on: true }, set: { tags: ['A', 'B'] }, was: { tags: ['A'] }, toast: 'Dodano tag', since: { tags: ['Z'] } },
    { name: 'tag – zdejmij', over: { tags: ['A', 'B'] }, change: { kind: 'tag', tag: '#a', on: false }, set: { tags: ['B'] }, was: { tags: ['A', 'B'] }, toast: 'Zdjęto tag', since: { tags: ['A', 'Z'] } },
    { name: 'wyczyść tagi', over: { tags: ['A'] }, change: { kind: 'tagsClear' }, set: { tags: undefined }, was: { tags: ['A'] }, toast: 'Wyczyszczono tagi', since: { tags: ['Z'] } },
    { name: 'impuls', over: {}, change: { kind: 'impulse', to: 'impulse' }, set: { impulse: 'impulse' }, was: { impulse: null }, toast: 'Oznaczono jako impuls', since: { impulse: 'plan' } },
    { name: 'wyjaśniona', over: CORRECTION, change: { kind: 'explained', on: true }, set: { explained: true }, was: { explained: undefined }, toast: 'Oznaczono korekty jako wyjaśnione', since: { explained: false } },
    { name: 'ładownia', over: { goalId: G1 }, change: { kind: 'container', containerId: C1 }, set: { containerId: C1, goalId: null }, was: { containerId: null, goalId: G1 }, toast: 'Przypisano do ładowni', since: { containerId: C2 } },
    { name: 'cel', over: { containerId: C1 }, change: { kind: 'goal', goalId: G1 }, set: { goalId: G1, containerId: null }, was: { goalId: null, containerId: C1 }, toast: 'Rozliczono z celu', since: { goalId: G2 } },
    { name: 'pożyczka', over: LOAN, change: { kind: 'loan', loanId: L1 }, set: { loanId: L1 }, was: { loanId: null }, toast: 'Przypisano do pożyczki', since: { loanId: L2 } }
  ]
  const fields = (t: Transaction, of: Partial<Transaction>) => Object.fromEntries(Object.keys(of).map((k) => [k, (t as Record<string, unknown>)[k]]))

  for (const c of cases) {
    it(`${c.name}: zapis, „Cofnij” tylko swoich pól, póki są takie, jak ustawiła; zmienione w międzyczasie zostaje`, async () => {
      const a = tx({ counterparty: 'A', ...c.over })
      const b = tx({ counterparty: 'B', ...c.over })
      load([a, b])
      ops.tickOperations([a.id, b.id], true)
      const plan = ops.bulkPlan([a.id, b.id], c.change)
      expect(plan).toMatchObject({ skipped: 0, newer: 0 })
      expect(plan.before.map((t) => t.id)).toEqual([a.id, b.id])
      await ops.applyBulk(plan)
      expect(fields(current(a.id), c.set)).toEqual(c.set)
      expect(fields(current(b.id), c.set)).toEqual(c.set)
      expect(ui.useUi.getState().toasts.at(-1)!.text).toBe(`${c.toast}: 2 operacje.`)
      expect(ops.useOperationsUi.getState().ticked).toEqual({})
      data.updateRecord('transactions', a.id, (r) => ({ ...r, note: 'później' }))
      data.updateRecord('transactions', b.id, (r) => ({ ...r, ...c.since }))
      lastUndo()()
      expect(fields(current(a.id), c.was)).toEqual(c.was)
      expect(current(a.id).note).toBe('później')
      expect(fields(current(b.id), c.since)).toEqual(c.since)
      expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Cofnięto 1 z 2 – jedna zmieniła się w międzyczasie i zostaje bez zmian.')
    })
  }

  it('wpis nowszej wersji – bez zmian przy każdej nowej zmianie', () => {
    for (const c of cases) {
      const newer = tx({ counterparty: 'N', ...c.over })
      load([newer])
      data.useData.setState((s) => ({ records: { ...s.records, transactions: { [newer.id]: { ...s.records.transactions[newer.id]!, readOnly: true } } } }))
      ops.tickOperations([newer.id], true)
      expect(ops.bulkPlan([newer.id], c.change), c.name).toMatchObject({ before: [], after: [], newer: 1, skipped: 0 })
    }
  })

  it('podział paragonu przy ładowni, celu i pożyczce – pominięty i policzony; wspólny zakup przyjmuje zmianę', async () => {
    const receipt = tx({ counterparty: 'Paragon', categoryId: null, splits: [{ id: nextId(), amount: -600, categoryId: FOOD }, { id: nextId(), amount: -400, categoryId: FUN }] as Transaction['splits'] })
    const plain = tx({ counterparty: 'Zwykły' })
    const loanReceipt = tx({ counterparty: 'Pożyczka w częściach', kind: 'loan', categoryId: null, splits: [{ id: nextId(), amount: -600 }, { id: nextId(), amount: -400 }] as Transaction['splits'] })
    load([receipt, plain, loanReceipt])
    ops.tickOperations([plain.id], true)
    ops.financeTicked([plain.id], { share: { mode: 'equal', lines: [{ memberId: null, value: 0, gift: false }, { memberId: HOUSE_MEMBER_ID, value: 0, gift: false }] } }, 'Wspólnie')
    ops.tickOperations([receipt.id, plain.id, loanReceipt.id], true)
    for (const change of [{ kind: 'container', containerId: C1 }, { kind: 'goal', goalId: G1 }] as BulkChange[]) {
      const plan = ops.bulkPlan([receipt.id, plain.id], change)
      expect(plan.before.map((t) => t.id)).toEqual([plain.id])
      expect(plan.skipped).toBe(1)
    }
    expect(ops.bulkPlan([loanReceipt.id], { kind: 'loan', loanId: L1 })).toMatchObject({ before: [], skipped: 1 })
    await ops.applyBulk(ops.bulkPlan([receipt.id, plain.id], { kind: 'container', containerId: C1 }), '„Czynsz”')
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Przypisano do ładowni „Czynsz”: 1 operacja, pominięte (zmiana do nich nie pasuje): 1.')
    expect(current(plain.id)).toMatchObject({ containerId: C1, share: expect.objectContaining({ mode: 'equal' }) })
    expect(current(plain.id).splits.map((x) => x.amount)).toEqual([-500, -500])
    expect(current(receipt.id).containerId).toBeNull()
    // Tags, plan / impulse and „wyjaśniona” are the whole operation's: a split receipt takes them.
    ops.tickOperations([receipt.id], true)
    expect(ops.bulkPlan([receipt.id], { kind: 'impulse', to: 'plan' }).after).toEqual([{ ...current(receipt.id), impulse: 'plan' }])
    expect(ops.bulkPlan([receipt.id], { kind: 'tag', tag: 'Remont', on: true }).after).toEqual([{ ...current(receipt.id), tags: ['Remont'] }])
  })

  it('operacje dla menu: zaznaczone i widoczne, bez szkiców i wpisów nowszej wersji; zadokowane osobno', () => {
    const a = tx({ counterparty: 'A' })
    const docked = tx({ kind: 'trading', amount: 30000, categoryId: null })
    const newer = tx({ counterparty: 'N' })
    const hidden = tx({ counterparty: 'ukryta' })
    load([a, docked, newer, hidden])
    const dockings = { D1: { record: { id: 'D1', transactionId: docked.id } as never, relPath: 'dockings/x.json', readOnly: false } }
    data.useData.setState((s) => ({ records: { ...s.records, dockings, transactions: { ...s.records.transactions, [newer.id]: { ...s.records.transactions[newer.id]!, readOnly: true } } } }))
    const draft = ops.newOperation()
    ops.tickOperations([a.id, docked.id, newer.id, hidden.id, draft], true)
    const { records, docked: dockedIds } = ops.bulkTargets([a.id, docked.id, newer.id, draft])
    expect(records.map((t) => t.id)).toEqual([a.id, docked.id])
    expect([...dockedIds]).toEqual([docked.id])
  })
})

describe('poprawki po przeglądzie 1.20.0: „Cofnij” tagu po jednym tagu, zaznaczenie przy przełącznikach menu', () => {
  const undoOf = (text: string) => ui.useUi.getState().toasts.find((t) => t.text.startsWith(text))!.action!.run
  const tags = (id: string) => current(id).tags

  it('dwa przełączenia po sobie: „Cofnij” pierwszego zdejmuje tylko jego tag, drugi zostaje; potem drugi', async () => {
    const a = tx({ counterparty: 'A', tags: ['A'] })
    const b = tx({ counterparty: 'B', tags: ['A'] })
    load([a, b])
    const ids = [a.id, b.id]
    ops.tickOperations(ids, true)
    await ops.applyBulk(ops.bulkPlan(ids, { kind: 'tag', tag: 'X', on: true }), '#X', { keepTicked: true })
    await ops.applyBulk(ops.bulkPlan(ids, { kind: 'tag', tag: 'Y', on: true }), '#Y', { keepTicked: true })
    expect([tags(a.id), tags(b.id)]).toEqual([
      ['A', 'X', 'Y'],
      ['A', 'X', 'Y']
    ])
    const toasts = ui.useUi.getState().toasts.length
    undoOf('Dodano tag #X')()
    expect([tags(a.id), tags(b.id)]).toEqual([
      ['A', 'Y'],
      ['A', 'Y']
    ])
    // All taken back: no word of operations changed since.
    expect(ui.useUi.getState().toasts.length).toBe(toasts)
    undoOf('Dodano tag #Y')()
    expect([tags(a.id), tags(b.id)]).toEqual([['A'], ['A']])
  })

  it('tag zdjęty w międzyczasie – pominięty ze słowem; zdjęty zbiorczo wraca na swoje miejsce, dołożone później zostają', async () => {
    const a = tx({ counterparty: 'A', tags: ['A'] })
    const b = tx({ counterparty: 'B', tags: ['A'] })
    load([a, b])
    ops.tickOperations([a.id, b.id], true)
    await ops.applyBulk(ops.bulkPlan([a.id, b.id], { kind: 'tag', tag: 'X', on: true }), '#X')
    data.updateRecord('transactions', a.id, (r) => ({ ...r, tags: ['A'] }))
    undoOf('Dodano tag #X')()
    expect([tags(a.id), tags(b.id)]).toEqual([['A'], ['A']])
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Cofnięto 1 z 2 – jedna zmieniła się w międzyczasie i zostaje bez zmian.')

    const c = tx({ counterparty: 'C', tags: ['A', 'Wakacje', 'B'] })
    const d = tx({ counterparty: 'D', tags: ['Wakacje'] })
    load([c, d])
    ops.tickOperations([c.id, d.id], true)
    await ops.applyBulk(ops.bulkPlan([c.id, d.id], { kind: 'tag', tag: '#wakacje', on: false }), '#wakacje')
    expect([tags(c.id), tags(d.id)]).toEqual([['A', 'B'], undefined])
    data.updateRecord('transactions', c.id, (r) => ({ ...r, tags: ['A', 'B', 'C'] }))
    undoOf('Zdjęto tag #wakacje')()
    expect([tags(c.id), tags(d.id)]).toEqual([['A', 'Wakacje', 'B', 'C'], ['Wakacje']])
  })

  it('wyczyść tagi: „Cofnij” nadal całą listę – tylko póki jest pusta', async () => {
    const a = tx({ counterparty: 'A', tags: ['A', 'B'] })
    const b = tx({ counterparty: 'B', tags: ['A'] })
    load([a, b])
    ops.tickOperations([a.id, b.id], true)
    await ops.applyBulk(ops.bulkPlan([a.id, b.id], { kind: 'tagsClear' }))
    data.updateRecord('transactions', b.id, (r) => ({ ...r, tags: ['Nowy'] }))
    lastUndo()()
    expect([tags(a.id), tags(b.id)]).toEqual([['A', 'B'], ['Nowy']])
  })

  it('„Cofnij” tagu: wpis innego rodzaju niż po zmianie albo nowszej wersji – pominięty ze słowem', async () => {
    const a = tx({ counterparty: 'A', tags: ['X'] })
    const b = tx({ counterparty: 'B', tags: ['X'] })
    load([a, b])
    ops.tickOperations([a.id, b.id], true)
    await ops.applyBulk(ops.bulkPlan([a.id, b.id], { kind: 'tag', tag: 'X', on: false }), '#X')
    // Another kind since (one that takes tags – the tag alone would let it back).
    data.updateRecord('transactions', b.id, (r) => ({ ...r, kind: 'income', amount: 1000 }))
    undoOf('Zdjęto tag #X')()
    expect([tags(a.id), tags(b.id)]).toEqual([['X'], undefined])
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Cofnięto 1 z 2 – jedna zmieniła się w międzyczasie i zostaje bez zmian.')

    const c = tx({ counterparty: 'C' })
    const d = tx({ counterparty: 'D' })
    load([c, d])
    ops.tickOperations([c.id, d.id], true)
    await ops.applyBulk(ops.bulkPlan([c.id, d.id], { kind: 'tag', tag: 'Y', on: true }), '#Y')
    // Written by a newer version since (B67): never written by this one – said, not counted as taken back.
    data.useData.setState((s) => ({ records: { ...s.records, transactions: { ...s.records.transactions, [d.id]: { ...s.records.transactions[d.id]!, readOnly: true } } } }))
    undoOf('Dodano tag #Y')()
    expect([tags(c.id), tags(d.id)]).toEqual([undefined, ['Y']])
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Cofnięto 1 z 2 – jedna zmieniła się w międzyczasie i zostaje bez zmian.')
  })

  it('„Cofnij” zdjęcia jedynego tagu z przelewu (nic nie zmieniło się w międzyczasie) – tag wraca, bez słowa o zmianie', async () => {
    const t = tx({ counterparty: 'T', kind: 'transfer', tags: ['X'] })
    load([t])
    ops.tickOperations([t.id], true)
    await ops.applyBulk(ops.bulkPlan([t.id], { kind: 'tag', tag: 'X', on: false }), '#X')
    expect(tags(t.id)).toBeUndefined()
    const toasts = ui.useUi.getState().toasts.length
    undoOf('Zdjęto tag #X')()
    expect(tags(t.id)).toEqual(['X'])
    expect(ui.useUi.getState().toasts.length).toBe(toasts)
  })

  it('„Cofnij” innej zmiany: wpis nowszej wersji – pominięty ze słowem, nie liczony jako cofnięty', async () => {
    const a = tx({ counterparty: 'A' })
    const b = tx({ counterparty: 'B' })
    load([a, b])
    ops.tickOperations([a.id, b.id], true)
    await ops.applyBulk(ops.bulkPlan([a.id, b.id], { kind: 'impulse', to: 'plan' }))
    data.useData.setState((s) => ({ records: { ...s.records, transactions: { ...s.records.transactions, [b.id]: { ...s.records.transactions[b.id]!, readOnly: true } } } }))
    lastUndo()()
    expect([current(a.id).impulse, current(b.id).impulse]).toEqual([null, 'plan'])
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Cofnięto 1 z 2 – jedna zmieniła się w międzyczasie i zostaje bez zmian.')
  })

  it('keepTicked zostawia zaznaczenie i kotwicę; domyślnie i przy usuwaniu – czyści jak dotąd', async () => {
    const a = tx({ counterparty: 'A' })
    const b = tx({ counterparty: 'B' })
    load([a, b])
    const ids = [a.id, b.id]
    ops.tickOperations(ids, true)
    ops.useOperationsUi.setState({ tickAnchor: b.id })
    await ops.applyBulk(ops.bulkPlan(ids, { kind: 'impulse', to: 'plan' }), '', { keepTicked: true })
    expect(ops.useOperationsUi.getState()).toMatchObject({ ticked: { [a.id]: true, [b.id]: true }, tickAnchor: b.id })
    await ops.applyBulk(ops.bulkPlan(ids, { kind: 'impulse', to: 'impulse' }))
    expect(ops.useOperationsUi.getState()).toMatchObject({ ticked: {}, tickAnchor: null })
    api.deleteRecords.mockImplementation(async (_c: string, del: string[]) => del.map((id) => ({ id })))
    ops.tickOperations(ids, true)
    await ops.applyBulk(ops.bulkPlan(ids, { kind: 'delete' }), '', { keepTicked: true })
    expect(ops.useOperationsUi.getState().ticked).toEqual({})
    api.deleteRecords.mockReset()
  })
})

// Review of 1.21.0 (T549): the preview's plan is read when it opens – an operation changed before its confirmation (a
// sync, the autosave, another window) is never written over with what the preview showed; it stays, said in the toast.
describe('podgląd zmiany zbiorczej: operacje zmienione od jego otwarcia zostają (przegląd 1.21.0)', () => {
  it('zmiana pól: zmieniona od podglądu zostaje, jak jest – reszta zapisana, toast mówi ile', async () => {
    const a = tx({ counterparty: 'A' })
    const b = tx({ counterparty: 'B' })
    load([a, b])
    ops.tickOperations([a.id, b.id], true)
    const plan = ops.bulkPlan([a.id, b.id], { kind: 'account', accountId: XTB_WALLET_ACCOUNT_ID })
    data.updateRecord('transactions', b.id, (r) => ({ ...r, note: 'z synchronizacji' }))
    expect(await ops.applyBulk(plan)).toBe(true)
    expect(current(a.id).accountId).toBe(XTB_WALLET_ACCOUNT_ID)
    expect(current(b.id)).toMatchObject({ accountId: MBANK_ACCOUNT_ID, note: 'z synchronizacji' })
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Przeniesiono na konto: 1 operacja, zmienione od podglądu zostają, jak są: 1.')
    // „Cofnij” – of the one written only.
    lastUndo()()
    expect(current(a.id).accountId).toBe(MBANK_ACCOUNT_ID)
    expect(current(b.id).note).toBe('z synchronizacji')
  })

  it('zapis tylko znaczników (ta sama treść) nie jest zmianą – operacja zapisana', async () => {
    const a = tx({ counterparty: 'A' })
    load([a])
    ops.tickOperations([a.id], true)
    const plan = ops.bulkPlan([a.id], { kind: 'impulse', to: 'plan' })
    data.useData.setState((s) => ({ records: { ...s.records, transactions: { [a.id]: { ...s.records.transactions[a.id]!, record: { ...a, updatedAt: '2026-10-02T10:00:00.000Z' } } } } }))
    expect(await ops.applyBulk(plan)).toBe(true)
    expect(current(a.id).impulse).toBe('plan')
  })

  it('wszystkie zmienione albo usunięte od podglądu: nic nie zapisane – ze słowem', async () => {
    const a = tx({ counterparty: 'A' })
    const b = tx({ counterparty: 'B' })
    load([a, b])
    ops.tickOperations([a.id, b.id], true)
    const plan = ops.bulkPlan([a.id, b.id], { kind: 'impulse', to: 'plan' })
    data.updateRecord('transactions', a.id, (r) => ({ ...r, impulse: 'impulse' }))
    data.useData.setState((s) => ({ records: { ...s.records, transactions: { [a.id]: s.records.transactions[a.id]! } } }))
    expect(await ops.applyBulk(plan)).toBe(false)
    expect(current(a.id).impulse).toBe('impulse')
    expect(data.useData.getState().records.transactions[b.id]).toBeUndefined()
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Nic nie zapisano – operacje zmieniły się od podglądu i zostają, jak są (2).')
  })

  // U1 (1.21.1, T550): one a newer version of the app wrote since the preview is counted as such (as `SaveResult.newer`) –
  // not as „zmienione od podglądu”.
  const newerSince = (id: string) =>
    data.useData.setState((s) => ({ records: { ...s.records, transactions: { ...s.records.transactions, [id]: { ...s.records.transactions[id]!, readOnly: true } } } }))

  it('zapisana od podglądu przez nowszą wersję: zostaje, liczona jako nowsza wersja – nie „zmienione od podglądu”', async () => {
    const a = tx({ counterparty: 'A' })
    const b = tx({ counterparty: 'B' })
    load([a, b])
    ops.tickOperations([a.id, b.id], true)
    const plan = ops.bulkPlan([a.id, b.id], { kind: 'impulse', to: 'plan' })
    newerSince(b.id)
    expect(await ops.applyBulk(plan)).toBe(true)
    expect([current(a.id).impulse, current(b.id).impulse]).toEqual(['plan', null])
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Oznaczono jako plan: 1 operacja, bez zmian (zapisane przez nowszą wersję aplikacji): 1.')
  })

  it('nowsza wersja już przy podglądzie i od podglądu – jedna liczba; obok zmienionej od podglądu', async () => {
    const a = tx({ counterparty: 'A' })
    const b = tx({ counterparty: 'B' })
    const c = tx({ counterparty: 'C' })
    const d = tx({ counterparty: 'D' })
    load([a, b, c, d])
    newerSince(d.id)
    ops.tickOperations([a.id, b.id, c.id, d.id], true)
    const plan = ops.bulkPlan([a.id, b.id, c.id, d.id], { kind: 'impulse', to: 'plan' })
    expect(plan.newer).toBe(1)
    newerSince(b.id)
    data.updateRecord('transactions', c.id, (r) => ({ ...r, note: 'z synchronizacji' }))
    expect(await ops.applyBulk(plan)).toBe(true)
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Oznaczono jako plan: 1 operacja, zmienione od podglądu zostają, jak są: 1, bez zmian (zapisane przez nowszą wersję aplikacji): 2.')
  })

  it('wszystkie zapisane od podglądu przez nowszą wersję: nic nie zapisane – mówi, że nowsza wersja', async () => {
    const a = tx({ counterparty: 'A' })
    const b = tx({ counterparty: 'B' })
    load([a, b])
    ops.tickOperations([a.id, b.id], true)
    const plan = ops.bulkPlan([a.id], { kind: 'impulse', to: 'plan' })
    newerSince(a.id)
    expect(await ops.applyBulk(plan)).toBe(false)
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Nic nie zapisano – operację od podglądu zapisała nowsza wersja aplikacji; zostaje, jak jest.')

    load([a, b])
    ops.tickOperations([a.id, b.id], true)
    const two = ops.bulkPlan([a.id, b.id], { kind: 'impulse', to: 'plan' })
    newerSince(a.id)
    newerSince(b.id)
    expect(await ops.applyBulk(two)).toBe(false)
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Nic nie zapisano – operacje od podglądu zapisała nowsza wersja aplikacji; zostają, jak są (2).')

    const c = tx({ counterparty: 'C' })
    load([a, b, c])
    ops.tickOperations([a.id, b.id, c.id], true)
    const three = ops.bulkPlan([a.id, b.id, c.id], { kind: 'impulse', to: 'plan' })
    newerSince(a.id)
    newerSince(b.id)
    data.updateRecord('transactions', c.id, (r) => ({ ...r, note: 'z synchronizacji' }))
    expect(await ops.applyBulk(three)).toBe(false)
    expect([current(a.id).impulse, current(b.id).impulse, current(c.id).impulse]).toEqual([null, null, null])
    expect(ui.useUi.getState().toasts.at(-1)!.text).toBe('Nic nie zapisano – zmienione od podglądu zostają, jak są: 1, zapisane przez nowszą wersję aplikacji: 2.')
  })

  it('usunięcie: zmieniona od podglądu nie jest usunięta – zostaje ze słowem', async () => {
    const a = tx({ counterparty: 'A' })
    const b = tx({ counterparty: 'B' })
    load([a, b])
    api.deleteRecords.mockImplementation(async (_c: string, ids: string[]) => ids.map((id) => ({ id })))
    ops.tickOperations([a.id, b.id], true)
    const plan = ops.bulkPlan([a.id, b.id], { kind: 'delete' })
    data.updateRecord('transactions', b.id, (r) => ({ ...r, note: 'ważne' }))
    expect(await ops.applyBulk(plan)).toBe(true)
    expect(Object.keys(data.useData.getState().records.transactions)).toEqual([b.id])
    expect(ui.useUi.getState().toasts.map((t) => t.text)).toContain('Usunięto 1 operację, zmienione od podglądu zostają, jak są: 1.')
    api.deleteRecords.mockReset()
  })
})
