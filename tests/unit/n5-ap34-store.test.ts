import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Transaction } from '@shared/schema'

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
const ops = await import('../../src/renderer/features/operations/state')
const { pairTickedFirst } = await import('../../src/renderer/features/operations/transfers')

let seq = 0
const tx = (over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: `01K9N5S0000000000000${String(++seq).padStart(6, '0')}`, createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, amount: -1000, ...over })

function load(txs: Transaction[]): void {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = txs.map((t) => ({ record: t, relPath: `transactions/2026/2026-10-14_${t.id}.json`, readOnly: false }))
  data.applySnapshot({
    fi,
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
}
const stored = () => JSON.parse(storage.get('fi.operations.filter') ?? '{}') as Record<string, unknown>
const ui = () => ops.useOperationsUi.getState()

beforeEach(() => {
  storage.clear()
  ops.showStoredFilter()
  ops.resetFilter()
})

describe('AP-34: Ctrl+N nie zeruje wyszukiwania (IN.3)', () => {
  it('szukanie zostaje, nowa operacja zostaje na liście, dopóki filtr się nie zmieni', () => {
    load([])
    ops.setFilter({ query: 'Biedronka' })
    const id = ops.newOperation()
    expect(ui()).toMatchObject({ keptId: id, filter: { query: 'Biedronka' } })
    // Another filter lets it go.
    ops.setFilter({ query: 'Lidl' })
    expect(ui().keptId).toBeNull()
  })
})

describe('AP-34: okres listy zapamiętany, „mój filtr” z okresem (OP sp. 9, AF-56)', () => {
  it('„cała historia” i „od – do” zapisane na tym komputerze; miesiąc – nie (lista startuje na bieżącym)', () => {
    ops.setFilter({ period: { kind: 'all' } })
    expect(stored().period).toEqual({ kind: 'all' })
    ops.setFilter({ period: { kind: 'range', from: '2026-01-01', to: null } })
    expect(stored().period).toEqual({ kind: 'range', from: '2026-01-01', to: null })
    ops.setFilter({ period: { kind: 'month', month: '2026-09' } })
    expect(stored().period).toBeUndefined()
  })

  it('po ponownym uruchomieniu lista otwiera się na zapamiętanym okresie', async () => {
    ops.setFilter({ period: { kind: 'all' }, accounts: [MBANK_ACCOUNT_ID] })
    vi.resetModules()
    const fresh = await import('../../src/renderer/features/operations/state')
    expect(fresh.useOperationsUi.getState().filter).toMatchObject({ period: { kind: 'all' }, accounts: [MBANK_ACCOUNT_ID] })
  })

  it('„mój filtr” po widoku z innego ekranu wraca też do swojego okresu, nie zostaje przy okresie widoku', () => {
    ops.setFilter({ accounts: [MBANK_ACCOUNT_ID] })
    ops.showFilter({ period: { kind: 'range', from: '2025-09-01', to: null }, accounts: [], marks: ['uncategorized'] })
    expect(ui().shown).toBe(true)
    ops.showStoredFilter()
    expect(ui().filter).toMatchObject({ accounts: [MBANK_ACCOUNT_ID], marks: [], period: { kind: 'month' } })
    ops.setFilter({ period: { kind: 'all' } })
    ops.showFilter({ period: { kind: 'month', month: '2025-09' }, marks: ['refundable'] })
    ops.showStoredFilter()
    expect(ui().filter.period).toEqual({ kind: 'all' })
  })
})

describe('AP-20: nowa operacja na koncie ostatnio użytym w folderze (SW sp. 8)', () => {
  it('konto ostatniej operacji wpisanej ręcznie (inny komputer) przed kontem zapamiętanym na tym komputerze', () => {
    storage.set('fi.operations.account', MBANK_ACCOUNT_ID)
    load([tx({ accountId: XTB_WALLET_ACCOUNT_ID, createdAt: '2026-10-20T10:00:00.000Z' }), tx({ accountId: MBANK_ACCOUNT_ID, createdAt: '2026-10-02T10:00:00.000Z' })])
    const id = ops.newOperation()
    expect(data.useData.getState().records.transactions[id]!.record.accountId).toBe(XTB_WALLET_ACCOUNT_ID)
  })
})

describe('AP-34: para przelewów po samej kwocie niezaznaczona (ME sp. 2)', () => {
  it('zaznaczona, gdy któraś strona wskazuje konto; po samej kwocie i dniu – nie', () => {
    expect(pairTickedFirst({ keep: { counterAccountId: XTB_WALLET_ACCOUNT_ID }, drop: { counterAccountId: null } })).toBe(true)
    expect(pairTickedFirst({ keep: { counterAccountId: null }, drop: { counterAccountId: MBANK_ACCOUNT_ID } })).toBe(true)
    expect(pairTickedFirst({ keep: { counterAccountId: null }, drop: { counterAccountId: null } })).toBe(false)
  })
})
