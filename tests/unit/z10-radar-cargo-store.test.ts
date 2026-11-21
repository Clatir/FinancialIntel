import { describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import type { RecurringPayment } from '@shared/calc/plan'
import { warsawNow } from '@shared/calc/dates'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

// Z10 (1.21.0, UX-81, UX-74): the history's proposals added together with one „Cofnij”; the Radar's row opens its record.
const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: unknown[]) => rs.map((r) => ({ ok: true, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(async () => ({ ok: true as const })),
  deleteRecords: vi.fn(),
  historyKeep: vi.fn()
}
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const cargo = await import('../../src/renderer/features/cargo/actions')
const { radarTarget } = await import('../../src/renderer/features/radar/labels')

const STAMP = '2026-09-01T10:00:00.000Z'
const payment = (key: string, label: string, amount: number): RecurringPayment => ({
  key,
  label,
  amount,
  cycleMonths: 1,
  schedule: [],
  variable: false,
  dueMonth: warsawNow().month,
  dueDay: 5,
  categoryId: null,
  accountId: MBANK_ACCOUNT_ID,
  payments: 4,
  last: warsawNow().date,
  fresh: false
})
const tx = (id: string, counterparty: string): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id, createdAt: STAMP, updatedAt: STAMP, date: warsawNow().date, accountId: MBANK_ACCOUNT_ID, amount: -4_999, kind: 'expense', counterparty })

function load(transactions: Transaction[]): void {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  fi.settings.budget.start = '2026-01-01'
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = transactions.map((t) => ({ record: t, relPath: `transactions/${t.id}.json`, readOnly: false }))
  data.applySnapshot({
    fi,
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
}
const containers = () => Object.values(data.useData.getState().records.containers).map((e) => e.record)
const toasts = () => ui.useUi.getState().toasts
const undo = () => toasts().find((t) => t.action?.label === 'Cofnij')!

describe('UX-81: zbiorcze dodanie propozycji Ładowni', () => {
  it('dodaje kontener z każdej propozycji (to samo co „Do ładowni”) i jeden toast „Cofnij”', () => {
    load([tx('01KZ10000000000000000000A1', 'Netflix')])
    ui.useUi.setState({ toasts: [] })
    const ids = cargo.addProposals([payment('netflix', 'Netflix', 4_999), payment('spotify', 'Spotify', 2_399)])
    expect(ids).toHaveLength(2)
    expect(containers().map((c) => c.name).sort()).toEqual(['Netflix', 'Spotify'])
    expect(containers().find((c) => c.name === 'Netflix')).toMatchObject({ type: 'subscription', amount: 4_999, counterparty: 'Netflix' })
    // The payment of the counterparty is linked, as by the single add.
    expect(data.useData.getState().records.transactions['01KZ10000000000000000000A1']!.record.containerId).toBe(ids[0])
    expect(toasts().filter((t) => t.action?.label === 'Cofnij')).toHaveLength(1)
  })

  it('„Cofnij” usuwa dodane i rozłącza ich płatności; zmieniony od tego czasu zostaje ze słowem', async () => {
    load([tx('01KZ10000000000000000000B1', 'Netflix')])
    ui.useUi.setState({ toasts: [] })
    const [a, b] = cargo.addProposals([payment('netflix', 'Netflix', 4_999), payment('spotify', 'Spotify', 2_399)])
    cargo.patchContainer(b!, { note: 'zmienione ręcznie' })
    undo().action!.run()
    await vi.waitFor(() => expect(containers().map((c) => c.id)).toEqual([b]))
    expect(data.useData.getState().records.containers[a!]).toBeUndefined()
    expect(data.useData.getState().records.transactions['01KZ10000000000000000000B1']!.record.containerId ?? null).toBeNull()
    expect(toasts().some((t) => t.text.includes('zmienione od tego czasu zostają'))).toBe(true)
  })

  it('bez propozycji nic nie zapisuje', () => {
    load([])
    ui.useUi.setState({ toasts: [] })
    expect(cargo.addProposals([])).toEqual([])
    expect(toasts()).toHaveLength(0)
  })
})

describe('UX-74: wiersz osi Radaru otwiera swój rekord', () => {
  const base = { key: 'k', date: '2026-12-01', name: 'x', amount: 100, direction: 'out' as const, note: '' }
  it('kontener, pożyczka, boja, zwrot – po rodzaju pozycji; pensja i PIT-38 bez celu', () => {
    expect(radarTarget({ ...base, kind: 'asteroid', ref: 'c1' })).toEqual({ focus: 'container', id: 'c1' })
    expect(radarTarget({ ...base, kind: 'fixed', ref: 'c1' })).toEqual({ focus: 'container', id: 'c1' })
    expect(radarTarget({ ...base, kind: 'end', ref: 'c1' })).toEqual({ focus: 'container', id: 'c1' })
    expect(radarTarget({ ...base, kind: 'installment', ref: 'l1' })).toEqual({ focus: 'loan', id: 'l1' })
    expect(radarTarget({ ...base, kind: 'repayment', ref: 'l1' })).toEqual({ focus: 'loan', id: 'l1' })
    expect(radarTarget({ ...base, kind: 'plan', ref: 's1' })).toEqual({ focus: 'buoy', id: 's1' })
    expect(radarTarget({ ...base, kind: 'return', ref: 't1' })).toEqual({ focus: 'operation', id: 't1' })
    expect(radarTarget({ ...base, kind: 'salary' })).toBeNull()
    expect(radarTarget({ ...base, kind: 'pit38' })).toBeNull()
    expect(radarTarget({ ...base, kind: 'asteroid' })).toBeNull()
  })
})
