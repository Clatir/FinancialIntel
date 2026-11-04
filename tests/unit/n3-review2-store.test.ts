/**
 * N3 (1.15.7) – the group's second review in the window's store:
 * - 7: „Cofnij” of „Dopełnij kadłub z osłon” takes the month's plan file the top-up made only while it is still just that
 *   – a field another computer or a newer version wrote in it meanwhile (kept by `looseObject`), a change of another
 *   computer waiting for a decision: only the top-up's entry goes, the file stays (T373).
 */
import { afterAll, describe, expect, it, vi } from 'vitest'
import type { Snapshot } from '@shared/api'
import { addMonths, warsawNow } from '@shared/calc/dates'
import { monthPlanId } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { balanceSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, type MonthPlan, type Settings } from '@shared/schema'

const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, list: Array<{ id: string }>) => list.map((record) => ({ record, relPath: `${record.id}.json`, readOnly: false }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async () => []),
  historyKeep: vi.fn(async () => undefined)
}
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: api })
// Now: Wednesday 4 November 2026, noon in Warsaw.
vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
vi.setSystemTime(new Date('2026-11-04T11:00:00.000Z'))
afterAll(() => vi.useRealTimers())
const data = await import('../../src/renderer/store/data')
const month = await import('../../src/renderer/features/month/actions')
const { useRemote } = await import('../../src/renderer/store/remote')
const { useUi } = await import('../../src/renderer/store/ui')

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
const NOW = warsawNow()
const BEFORE = addMonths(NOW.month, -1)
const PLAN = monthPlanId(NOW.month)
let seq = 0
const nextId = () => `01K9N3T000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })

/** A budget from last month's 1st with its plan (20 000 zł) – this month lives on it; `settings` – the folder's. */
function open(settings: (s: Settings) => Settings = (s) => s): void {
  const fi = createDefaultSettings(AT)
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const entry = <T extends { id: string }>(dir: string, record: T) => ({ record, relPath: `${dir}/${record.id}.json`, readOnly: false })
  records.balances = [entry('balances', balanceSchema.parse({ ...base(), date: `${BEFORE}-01`, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) }))]
  records.months = [entry('months', monthPlanSchema.parse({ ...base(), id: monthPlanId(BEFORE), month: BEFORE, salary: zl(4000), envelopes: {} }))]
  const s0 = fi.settings
  data.applySnapshot({
    fi: { ...fi, settings: settings({ ...s0, budget: { ...s0.budget, start: `${BEFORE}-01` }, layers: { ...s0.layers, assumedCosts: zl(3000) } }) },
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane-n3r2', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
  useUi.setState({ toasts: [] })
  useRemote.setState({ pending: [] })
  api.deleteRecord.mockClear()
}
const own = () => data.useData.getState().records.months[PLAN]?.record as (MonthPlan & Record<string, unknown>) | undefined
const undo = () => useUi.getState().toasts.find((t) => t.text.startsWith('Kadłub dopełniony z osłon'))!.action!.run()

/** This month's plan written by another computer: `record` – as it arrives (the folder's watcher, OneDrive). */
function arrives(record: Record<string, unknown>): void {
  data.applyChange({
    upserts: [{ collection: 'months', entry: { record: record as MonthPlan, relPath: `months/${NOW.month}.json`, readOnly: false } }],
    removals: [],
    fi: null,
    problems: [],
    conflicts: [],
    status: data.useData.getState().status!,
    origin: 'external'
  })
}

describe('7: „Cofnij” dopełnienia kadłuba usuwa założony plan miesiąca tylko, gdy nic poza dopełnieniem w nim nie ma (T373)', () => {
  it('pole nowszej wersji z drugiego komputera (looseObject) przyszło przed „Cofnij” – plik zostaje z nim, znika tylko wpis', async () => {
    open()
    expect(month.topUpHull(zl(150))).toBe(true)
    expect(await data.writeNow('months', PLAN)).toBe(true)
    arrives({ ...own()!, updatedAt: '2026-11-04T11:00:05.000Z', updatedBy: 'LAPTOP', fleetPlanV2: { mode: 'auto' } })
    expect(own()).toMatchObject({ fleetPlanV2: { mode: 'auto' } })
    // Before: the plan looked bare by its known fields – the file deleted, the other computer's field lost.
    undo()
    expect(own()).toMatchObject({ month: NOW.month, hullTopUps: [], fleetPlanV2: { mode: 'auto' } })
    expect(api.deleteRecord).not.toHaveBeenCalled()
  })

  it('notatka dopisana na drugim komputerze – zostaje; ten sam plan zapisany tam bez zmian (tylko znaczniki) – plik znika', async () => {
    open()
    month.topUpHull(zl(150))
    await data.writeNow('months', PLAN)
    arrives({ ...own()!, updatedAt: '2026-11-04T11:00:05.000Z', updatedBy: 'LAPTOP', note: 'Premia w grudniu' })
    undo()
    expect(own()).toMatchObject({ note: 'Premia w grudniu', hullTopUps: [] })
    open()
    month.topUpHull(zl(150))
    await data.writeNow('months', PLAN)
    arrives({ ...own()!, updatedAt: '2026-11-04T11:00:05.000Z', updatedBy: 'LAPTOP' })
    undo()
    expect(own()).toBeUndefined()
    await vi.waitFor(() => expect(api.deleteRecord).toHaveBeenCalledWith('months', PLAN))
  })

  it('zmiana planu z drugiego komputera czeka na decyzję (tryb „pytaj”) – „Cofnij” zabiera tylko wpis, decyzja zostaje', async () => {
    open((s) => ({ ...s, sync: { ...s.sync, remoteChanges: 'ask' } }))
    month.topUpHull(zl(150))
    await data.writeNow('months', PLAN)
    arrives({ ...own()!, updatedAt: '2026-11-04T11:00:05.000Z', updatedBy: 'LAPTOP', salary: zl(4500) })
    expect(useRemote.getState().pending.map((p) => p.id)).toEqual([PLAN])
    // Before: the file deleted – and the change waiting for the decision dropped with it.
    undo()
    expect(own()).toMatchObject({ salary: zl(4000), hullTopUps: [] })
    expect(useRemote.getState().pending.map((p) => p.id)).toEqual([PLAN])
    expect(api.deleteRecord).not.toHaveBeenCalled()
  })
})
