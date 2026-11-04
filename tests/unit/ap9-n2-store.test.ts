import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { deliveries } from '@shared/calc/dock'
import { dockingIdOf, walletOperationId } from '@shared/calc/undock'
import { createDefaultSettings } from '@shared/defaults'
import type { IctjEntry } from '@shared/ictj'
import { COLLECTIONS } from '@shared/paths'
import { CASH_CATEGORY_ID, defaultCategoryId, dockingSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Docking, type Transaction } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here a mock that takes every write.
const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: unknown[]) => rs.map((r) => ({ ok: true, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(),
  historyList: vi.fn(async () => [] as unknown[])
}
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const dock = await import('../../src/renderer/features/dock/actions')
const cats = await import('../../src/renderer/features/settings/categories')

const AT = '2026-10-21T08:00:00.000Z'
let seq = 0
const nextId = () => `01K9S00000000000000000${String(++seq).padStart(4, '0')}`
const tx = (over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, kind: 'expense', amount: -1000, ...over })

function load(o: { transactions?: Transaction[]; dockings?: Docking[] } = {}): void {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = (o.transactions ?? []).map((t) => ({ record: t, relPath: `transactions/2026/2026-10-14_${t.id}.json`, readOnly: false }))
  records.dockings = (o.dockings ?? []).map((d) => ({ record: d, relPath: `dockings/2026/2026-10-14_${d.id}.json`, readOnly: false }))
  data.applySnapshot({
    fi,
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
}
const lastToast = () => ui.useUi.getState().toasts.at(-1)!
const ids = (collection: 'transactions' | 'dockings') => Object.keys(data.useData.getState().records[collection]).sort()

beforeEach(() => {
  ui.useUi.setState({ toasts: [] })
  api.deleteRecord.mockClear()
})

describe('AP-9: „Wycofaj dokowanie” w sklepie – usuwa dokowanie i operację Portfela, „Cofnij” je przywraca', () => {
  const e: IctjEntry = { id: '01K9PAY0000000000000000001', kind: 'withdrawal', date: '2026-10-14', amount: 50_000, pool: 'current', note: '', updatedAt: null }
  const op = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: walletOperationId(e.id), createdAt: AT, updatedAt: AT, date: e.date, accountId: XTB_WALLET_ACCOUNT_ID, kind: 'trading', amount: e.amount, counterparty: 'XTB' })
  const dk = dockingSchema.parse({ schemaVersion: SCHEMA_VERSION, id: dockingIdOf(e.id), createdAt: AT, updatedAt: AT, date: e.date, transactionId: op.id, ictjEntryId: e.id, pool: 'current' })
  const other = tx({ amount: -2500 })
  const delivery = () => {
    const s = data.useData.getState()
    return deliveries({ entries: [e], transactions: data.listOf(s.records.transactions), dockings: data.listOf(s.records.dockings), start: '2026-10-01', today: '2026-10-28', skipped: [], ictjOn: true, entriesComplete: true, coveredTo: '2026-10-27' }).find((d) => d.key === `ictj:${e.id}`)!
  }

  it('Portfel XTB: oba rekordy znikają (z dysku też), inne operacje zostają; „Cofnij” – z powrotem, dostawa znowu zadokowana', async () => {
    load({ transactions: [op, other], dockings: [dk] })
    expect(delivery().state).toBe('docked')
    expect(dock.undockDelivery(delivery())).toBe(true)
    expect(ids('dockings')).toEqual([])
    expect(ids('transactions')).toEqual([other.id])
    await vi.waitFor(() => expect(api.deleteRecord.mock.calls.map((c) => c.slice(0, 2))).toEqual(expect.arrayContaining([['dockings', dk.id], ['transactions', op.id]])))
    expect(delivery()).toMatchObject({ state: 'pending', wallet: true })
    const t = lastToast()
    expect(t.text).toBe('Wycofano dokowanie 500,00 zł i jego operację na Portfelu XTB – dostawa znowu czeka na dokowanie.')
    expect(t.action?.label).toBe('Cofnij')
    t.action!.run()
    expect(ids('dockings')).toEqual([dk.id])
    expect(ids('transactions')).toEqual([op.id, other.id].sort())
    expect(delivery().state).toBe('docked')
  })

  it('para w mBanku: operacja banku zostaje; niezadokowanej nie ma czego wycofać', () => {
    const bank = transactionSchema.parse({ ...op, id: nextId(), accountId: MBANK_ACCOUNT_ID, bank: { format: 'mbank', key: 'k', importedAt: AT } })
    load({ transactions: [bank], dockings: [{ ...dk, transactionId: bank.id }] })
    expect(dock.undockDelivery(delivery())).toBe(true)
    expect(ids('transactions')).toEqual([bank.id])
    expect(lastToast().text).toContain('operacja z banku zostaje i czeka na ponowne dokowanie')
    expect(delivery()).toMatchObject({ state: 'pending', transaction: { id: bank.id } })
    expect(dock.undockDelivery(delivery())).toBe(false)
  })
})

describe('AP-9: „Usuń” kategorię w sklepie (AF-37, N-PC-7)', () => {
  const categories = () => data.useData.getState().fi!.settings.categories
  const FOOD = defaultCategoryId(1)
  const FOOD_SUB = defaultCategoryId(1, 1)

  it('nieużywana kategoria główna znika razem z podkategoriami; „Cofnij” wstawia je na swoje miejsca', () => {
    load()
    const before = categories()
    const subs = before.filter((c) => c.parentId === FOOD).length
    expect(subs).toBeGreaterThan(0)
    expect(cats.deleteCategory(FOOD)).toBe(true)
    expect(categories().some((c) => c.id === FOOD || c.parentId === FOOD)).toBe(false)
    expect(lastToast().text).toContain('Usunięto: kategoria „')
    lastToast().action!.run()
    expect(categories()).toEqual(before)
  })

  it('w użyciu: zostaje, toast mówi gdzie i proponuje archiwizację; „Gotówka” (systemowa) nigdy', () => {
    load({ transactions: [tx({ categoryId: FOOD_SUB }), tx({ categoryId: FOOD_SUB })] })
    const before = categories()
    expect(cats.deleteCategory(FOOD)).toBe(false)
    expect(cats.deleteCategory(FOOD_SUB)).toBe(false)
    expect(categories()).toEqual(before)
    const t = lastToast()
    expect(t.text).toContain('jest w użyciu (2 operacje)')
    expect(t.action?.label).toBe('Archiwizuj')
    t.action!.run()
    expect(categories().find((c) => c.id === FOOD_SUB)?.archived).toBe(true)
    expect(cats.deleteCategory(CASH_CATEGORY_ID)).toBe(false)
    expect(categories().some((c) => c.id === CASH_CATEGORY_ID)).toBe(true)
  })

  it('podkategoria nieużywana: tylko ona; reguła importu z kategorią blokuje usunięcie', () => {
    load()
    expect(cats.deleteCategory(FOOD_SUB)).toBe(true)
    expect(categories().some((c) => c.id === FOOD_SUB)).toBe(false)
    expect(categories().some((c) => c.id === FOOD)).toBe(true)
    lastToast().action!.run()
    // A starter rule's category (rule:bolt → the main category 6): in use.
    const ruled = data.useData.getState().fi!.settings.import.rules[0]!.categoryId!
    expect(cats.deleteCategory(ruled)).toBe(false)
    expect(lastToast().text).toContain('reguła importu')
  })
})
