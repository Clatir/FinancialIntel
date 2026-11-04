/**
 * N3 (1.15.7) – the group's review in the window's store:
 * - 8: „Dopełnij kadłub z osłon” says „dopełniony” only after a write, and its „Cofnij” takes away the month's own plan
 *   the top-up made – the month follows the earlier plan again (T373);
 * - 9: a confirmation of a balance stamps its moment (`confirmedAt`) – again too; „Inwentaryzacja” reads it (T383);
 * - 15: the preview of the layers' targets runs the engine once per targets – its save on leaving the field reuses that
 *   run (T374).
 */
import { afterAll, describe, expect, it, vi } from 'vitest'
import type { Problem, Snapshot } from '@shared/api'
import { addMonths, warsawNow } from '@shared/calc/dates'
import { monthPlanId } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import { derivedId } from '@shared/ids'
import { COLLECTIONS } from '@shared/paths'
import { balanceSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, type Balance, type MonthPlan } from '@shared/schema'

// The engine's runs counted (15): the window's stores call it through the module.
vi.mock('@shared/calc/fleet', async (importOriginal) => {
  const m = await importOriginal<typeof import('@shared/calc/fleet')>()
  return { ...m, computeFleet: vi.fn(m.computeFleet) }
})
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
const engine = await import('@shared/calc/fleet')
const data = await import('../../src/renderer/store/data')
const fleet = await import('../../src/renderer/store/fleet')
const month = await import('../../src/renderer/features/month/actions')
const balances = await import('../../src/renderer/features/balances/actions')
const { useUi } = await import('../../src/renderer/store/ui')

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
const NOW = warsawNow()
const BEFORE = addMonths(NOW.month, -1)
let seq = 0
const nextId = () => `01K9N3S000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const plan = (m: string, over: Partial<MonthPlan> = {}): MonthPlan => monthPlanSchema.parse({ ...base(), id: monthPlanId(m), month: m, salary: zl(4000), envelopes: {}, ...over })

/** A budget from last month's 1st with its plan (20 000 zł); `own` – this month's plans, `problems` – the folder's. */
function open(o: { months?: Array<{ record: MonthPlan; readOnly?: boolean }>; problems?: Problem[]; balances?: Balance[] } = {}): void {
  const fi = createDefaultSettings(AT)
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const entry = <T extends { id: string }>(dir: string, record: T, readOnly = false) => ({ record, relPath: `${dir}/${record.id}.json`, readOnly })
  records.balances = [entry('balances', balanceSchema.parse({ ...base(), date: `${BEFORE}-01`, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })), ...(o.balances ?? []).map((b) => entry('balances', b))]
  records.months = [entry('months', plan(BEFORE)), ...(o.months ?? []).map((m) => entry('months', m.record, m.readOnly))]
  const s0 = fi.settings
  data.applySnapshot({
    fi: { ...fi, settings: { ...s0, budget: { ...s0.budget, start: `${BEFORE}-01` }, layers: { ...s0.layers, assumedCosts: zl(3000) } } },
    records,
    problems: o.problems ?? [],
    conflicts: [],
    status: { dataDir: '/dane-n3r', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
  useUi.setState({ toasts: [] })
}
const own = () => data.useData.getState().records.months[monthPlanId(NOW.month)]?.record
const toastOf = (text: string) => useUi.getState().toasts.find((t) => t.text.startsWith(text))

describe('8: „Dopełnij kadłub z osłon” – toast po zapisie, „Cofnij” zabiera też założony plan miesiąca (T373)', () => {
  it('miesiąc bez własnego planu: wpis w kopii planu w mocy, „Cofnij” – kopia znika (miesiąc znowu żyje planem poprzednim)', async () => {
    open()
    expect(month.topUpHull(zl(150))).toBe(true)
    expect(own()).toMatchObject({ month: NOW.month, salary: zl(4000), hullTopUps: [{ amount: zl(150) }] })
    toastOf('Kadłub dopełniony z osłon')!.action!.run()
    expect(own()).toBeUndefined()
    await vi.waitFor(() => expect(api.deleteRecord).toHaveBeenCalledWith('months', monthPlanId(NOW.month)))
  })

  it('własny plan miesiąca sprzed dopełnienia zostaje – „Cofnij” zabiera tylko wpis; zmieniony w międzyczasie też', () => {
    open({ months: [{ record: plan(NOW.month, { salary: zl(5000) }) }] })
    month.topUpHull(zl(150))
    toastOf('Kadłub dopełniony z osłon')!.action!.run()
    expect(own()).toMatchObject({ salary: zl(5000), hullTopUps: [] })
    open()
    month.topUpHull(zl(150))
    month.setSalary(NOW.month, zl(4500))
    toastOf('Kadłub dopełniony z osłon')!.action!.run()
    expect(own()).toMatchObject({ salary: zl(4500), hullTopUps: [] })
  })

  it('plik miesiąca z nowszej wersji albo plan tylko do odczytu: nic nie zapisane – bez toastu „dopełniony”', () => {
    open({ problems: [{ relPath: `months/${NOW.month}.json`, kind: 'too-new', message: 'nowszy' }] })
    expect(month.topUpHull(zl(150))).toBe(false)
    expect(own()).toBeUndefined()
    expect(toastOf('Kadłub dopełniony z osłon')).toBeUndefined()
    open({ months: [{ record: plan(NOW.month), readOnly: true }] })
    expect(month.topUpHull(zl(150))).toBe(false)
    expect(own()!.hullTopUps).toBeUndefined()
    expect(toastOf('Kadłub dopełniony z osłon')).toBeUndefined()
  })
})

describe('9: potwierdzenie salda zapisuje swoją chwilę (confirmedAt, T383)', () => {
  it('pierwsze i ponowne potwierdzenie tego samego salda – chwila potwierdzenia, nie tylko zapis', () => {
    open()
    const key = `${MBANK_ACCOUNT_ID}:${NOW.date}:${zl(20000)}`
    const id = derivedId(MBANK_ACCOUNT_ID, `confirmation:${key}`)
    expect(balances.confirmBalance(MBANK_ACCOUNT_ID, zl(20000), NOW.date, 'mBank')?.kind).toBe('match')
    const first = data.useData.getState().records.balances[id]!.record
    expect(first.confirmedAt).toBe(new Date().toISOString())
    vi.setSystemTime(new Date('2026-11-04T15:00:00.000Z'))
    balances.confirmBalance(MBANK_ACCOUNT_ID, zl(20000), NOW.date, 'mBank')
    expect(data.useData.getState().records.balances[id]!.record).toMatchObject({ createdAt: first.createdAt, confirmedAt: '2026-11-04T15:00:00.000Z' })
    vi.setSystemTime(new Date('2026-11-04T11:00:00.000Z'))
  })
})

describe('15: podgląd celów warstw – silnik raz na cele (T374)', () => {
  it('ta sama wartość w podglądzie i przy zapisie po wyjściu z pola – jeden przebieg; inna wartość – nowy', () => {
    open()
    const runs = vi.mocked(engine.computeFleet)
    const now = fleet.fleetNow()!
    expect(now.started).toBe(true)
    runs.mockClear()
    const preview = fleet.fleetWithLayers({ shieldSalaries: 5, hullMonths: 12 })
    expect(runs).toHaveBeenCalledTimes(1)
    // The preview rendered again, then the save's toast („Cele warstw zmienione”) with the field's patch only.
    expect(fleet.fleetWithLayers({ shieldSalaries: 5, hullMonths: 12 })).toBe(preview)
    const s = data.useData.getState().fi!.settings.layers
    expect(fleet.fleetWithLayers({ hullMonths: 12, shieldSalaries: 5, assumedCosts: s.assumedCosts })).toBe(preview)
    expect(runs).toHaveBeenCalledTimes(1)
    expect(preview!.hull.target).toBe(12 * zl(3000))
    fleet.fleetWithLayers({ shieldSalaries: 5, hullMonths: 13 })
    expect(runs).toHaveBeenCalledTimes(2)
    // The records changed under it: counted again.
    open()
    fleet.fleetWithLayers({ shieldSalaries: 5, hullMonths: 13 })
    expect(runs).toHaveBeenCalledTimes(4)
  })
})
