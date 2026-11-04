/**
 * N2 (1.15.6), the code review's finding 1 in the window: „Zadokuj” on a pair counted by its entry's pool (T341) writes
 * its docking counted from the pair's operation (`countedFrom`, T363) – the layers stay as the bridge showed them, also
 * after a goal's money moved in between (T340).
 */
import { afterAll, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { deliveries, type Delivery } from '@shared/calc/dock'
import type { FleetState } from '@shared/calc/fleet'
import { transferGoal } from '@shared/calc/goals'
import { createDefaultSettings } from '@shared/defaults'
import { EMPTY_ICTJ, type IctjEntry, type IctjSnapshot } from '@shared/ictj'
import { COLLECTIONS } from '@shared/paths'
import { balanceSchema, dockingSchema, goalSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here a mock that takes every write.
const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: unknown[]) => rs.map((r) => ({ ok: true, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined)
}
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: api })
// The engine's day: 3 November 2026, 20:00 in Warsaw.
vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date('2026-11-03T19:00:00.000Z'))
afterAll(() => vi.useRealTimers())
const data = await import('../../src/renderer/store/data')
const fleet = await import('../../src/renderer/store/fleet')
const { useIctj } = await import('../../src/renderer/store/ictj')
const dock = await import('../../src/renderer/features/dock/actions')

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9R2W000000000000000${String(++seq).padStart(4, '0')}`
const base = (createdAt = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt, updatedAt: createdAt })

// A payout of the pool Cele, 1 000 zł, imported at 09:00; Rower 500 / 1 000 zł – all its 1 000 zł to the shields at 10:00.
const E: IctjEntry = { id: nextId(), kind: 'withdrawal', date: '2026-11-03', amount: zl(1000), pool: 'goals', note: '', updatedAt: null }
const T: Transaction = transactionSchema.parse({ ...base('2026-11-03T08:00:00.000Z'), date: '2026-11-03', accountId: MBANK_ACCOUNT_ID, kind: 'trading', amount: zl(1000), counterparty: 'XTB S.A.' })
const ROWER = transferGoal(goalSchema.parse({ ...base(), name: 'Rower', target: zl(1000), priority: 1 }), 'shields', zl(1000), '2026-11-03T09:00:00.000Z')

/** November 2026 from the 1st with 34 000 zł: the hull 12 000 zł (full), Rower 500 zł, the salary 4 000 zł. */
function open(): void {
  const fi = createDefaultSettings(AT)
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const entry = <R extends { id: string }>(dir: string, record: R) => ({ record, relPath: `${dir}/${record.id}.json`, readOnly: false })
  records.balances = [entry('balances', balanceSchema.parse({ ...base(), date: '2026-11-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(34000) }))]
  records.months = [entry('months', monthPlanSchema.parse({ ...base(), month: '2026-11', salary: zl(4000), envelopes: {} }))]
  records.goals = [entry('goals', ROWER)]
  records.transactions = [entry('transactions', T)]
  data.applySnapshot({
    fi: {
      ...fi,
      settings: {
        ...fi.settings,
        budget: { ...fi.settings.budget, start: '2026-11-01', initial: { shields: 0, hull: zl(12000), goals: { [ROWER.id]: zl(500) } } },
        layers: { ...fi.settings.layers, assumedCosts: zl(2000) }
      }
    },
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane-n2r', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
  useIctj.setState({ snap: { ...EMPTY_ICTJ, dir: 'C:\\ICTJ', status: 'ok', entries: [E], readAt: '2026-11-03T18:59:00.000Z' } satisfies IctjSnapshot })
}
/** The docking panel's list now (the store's records). */
const list = (): Delivery[] => {
  const { records } = data.useData.getState()
  return deliveries({
    entries: [E],
    transactions: Object.values(records.transactions).map((e) => e.record),
    dockings: Object.values(records.dockings ?? {}).map((e) => e.record),
    start: '2026-11-01',
    today: '2026-11-03',
    skipped: [],
    ictjOn: true,
    coveredTo: null
  })
}
const layers = (s: FleetState) => [s.shields.amount, s.goals.map((g) => [g.name, g.amount])]

describe('przegląd N2 1: „Zadokuj” na parze do zadokowania (T363)', () => {
  it('zapisuje dokowanie liczone od wpływu pary – warstwy po „Zadokuj” takie jak przed nim', () => {
    open()
    const before = fleet.fleetNow()!
    expect([before.toDock.count, ...layers(before)]).toEqual([1, zl(19000), [['Rower', 0]]])
    const d = list().find((x) => x.key === `ictj:${E.id}`)!
    expect(d.state).toBe('pending')
    expect(dock.dockingOf(d, T, null, new Date().toISOString()).countedFrom).toBe(T.createdAt)
    expect(dock.dockDelivery(d, null)).toBe(true)
    const written = Object.values(data.useData.getState().records.dockings).map((e) => e.record)
    expect(written.map((x) => [x.ictjEntryId, x.countedFrom, x.createdAt])).toEqual([[E.id, T.createdAt, '2026-11-03T19:00:00.000Z']])
    const after = fleet.fleetNow()!
    // Before: counted from the docking (20:00) – the transfer of 10:00 first: Rower 500 zł, the shields 18 500 zł.
    expect([after.toDock.count, ...layers(after)]).toEqual([0, ...layers(before)])
  })

  it('ponowne dokowanie zostawia chwilę dokowania; wpływ z XTB bez wpisu ICTTJ – zwykłe dokowanie, od jego utworzenia', () => {
    open()
    const old = dockingSchema.parse({ ...base('2026-11-03T10:00:00.000Z'), date: T.date, transactionId: T.id, ictjEntryId: E.id, entryDate: E.date, pool: 'goals' })
    const docked: Delivery = { ...list().find((x) => x.key === `ictj:${E.id}`)!, state: 'docked', docking: old }
    expect(dock.dockingOf(docked, T, null, new Date().toISOString()).countedFrom).toBeUndefined()
    const kept = { ...old, countedFrom: T.createdAt }
    expect(dock.dockingOf({ ...docked, docking: kept }, T, null, new Date().toISOString()).countedFrom).toBe(T.createdAt)
    const alone = deliveries({ entries: [], transactions: [T], dockings: [], start: '2026-11-01', today: '2026-11-03', skipped: [], ictjOn: true, coveredTo: null })[0]!
    expect([alone.key, alone.state]).toEqual([`tx:${T.id}`, 'pending'])
    expect(dock.dockingOf(alone, T, null, new Date().toISOString()).countedFrom).toBeUndefined()
  })
})
