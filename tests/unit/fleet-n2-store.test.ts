/**
 * N2 (1.15.6), AP-12 in the window: the engine store gives the engine the pairs of ICTTJ payouts not docked yet from
 * this computer's ICTTJ snapshot (T341) – the bridge, the docking window and the game's ratings see the same numbers.
 */
import { afterAll, describe, expect, it, vi } from 'vitest'
import type { Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { EMPTY_ICTJ, type IctjEntry, type IctjSnapshot } from '@shared/ictj'
import { COLLECTIONS } from '@shared/paths'
import { balanceSchema, dockingSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here a mock writing nothing.
const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async () => []),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async () => []),
  historyKeep: vi.fn(async () => undefined)
}
vi.stubGlobal('window', { fi: api })
// The engine's day is now's: 20 October 2026, noon in Warsaw.
vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date('2026-10-20T10:00:00.000Z'))
afterAll(() => vi.useRealTimers())
const data = await import('../../src/renderer/store/data')
const fleet = await import('../../src/renderer/store/fleet')
const { useIctj } = await import('../../src/renderer/store/ictj')
const { gameInputOf } = await import('../../src/renderer/store/game')

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5400000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const tx = (date: string, amount: number): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'trading', amount, counterparty: 'XTB S.A.' })
const entry = (date: string, amount: number, over: Partial<IctjEntry>): IctjEntry => ({ id: nextId(), kind: 'withdrawal', date, amount, pool: 'current', note: '', updatedAt: null, ...over })

const W = entry('2026-10-05', zl(800), { pool: 'tax' })
const RET = entry('2026-10-15', zl(300), { kind: 'return', pool: 'tax' })
const TAX_IN = tx('2026-10-05', zl(800))
const BACK = tx('2026-10-15', -zl(300))

/** The spec's ship (shields 8 640 / 12 000 zł): a payout of the pool Podatek docked, its return in the bank not docked yet. */
function open(): void {
  const fi = createDefaultSettings(AT)
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const entry = <T extends { id: string }>(dir: string, record: T) => ({ record, relPath: `${dir}/${record.id}.json`, readOnly: false })
  records.balances = [entry('balances', balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(27640) }))]
  records.months = [entry('months', monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000), envelopes: {} }))]
  records.transactions = [entry('transactions', TAX_IN), entry('transactions', BACK)]
  records.dockings = [entry('dockings', dockingSchema.parse({ ...base(), date: TAX_IN.date, transactionId: TAX_IN.id, ictjEntryId: W.id, pool: 'tax' }))]
  data.applySnapshot({
    fi: { ...fi, settings: { ...fi.settings, budget: { ...fi.settings.budget, start: '2026-10-01', initial: { shields: 0, hull: zl(15000), goals: {} } }, layers: { ...fi.settings.layers, assumedCosts: zl(3650) } } },
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane-n2', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
}
const snapshot = (entries: IctjEntry[]): IctjSnapshot => ({ ...EMPTY_ICTJ, dir: 'C:\\ICTJ', status: 'ok', entries, readAt: '2026-10-20T09:59:00.000Z' })

describe('AP-12: magazyn silnika podaje pary do zadokowania', () => {
  it('ICTTJ czytany: zwrot z puli Podatek przed „Zadokuj” z rezerwy, bez alarmu; gra ocenia dzień tym samym silnikiem', () => {
    open()
    useIctj.setState({ snap: snapshot([W, RET]) })
    const now = fleet.fleetNow()!
    expect([now.taxHold, now.shields.amount, now.toDock.outflow]).toEqual([zl(500), zl(8640), zl(300)])
    expect(now.alarms.filter((a) => a.kind === 'firewall')).toEqual([])
    expect([...fleet.pendingPairsNow()]).toEqual([[BACK.id, { pool: 'tax', entryDate: '2026-10-15' }]])
    // The docking window's preview and the game read the same input.
    expect(fleet.fleetInputNow()!.pendingPairs).toBe(fleet.pendingPairsNow())
    const { fi, records } = data.useData.getState()
    expect(gameInputOf(fi!, records).pendingPairs).toBe(fleet.pendingPairsNow())
  })

  it('ICTTJ nie czytany na tym komputerze: para liczy się zwykłą kolejnością, jak dotąd (pula nieznana)', () => {
    open()
    useIctj.setState({ snap: EMPTY_ICTJ })
    const now = fleet.fleetNow()!
    expect([now.taxHold, now.shields.amount, now.toDock.count]).toEqual([zl(800), zl(8340), 0])
    expect(now.alarms.map((a) => a.kind)).toContain('firewall')
    expect(fleet.pendingPairsNow().size).toBe(0)
  })

  it('nowy odczyt ICTTJ z tymi samymi wpisami – ta sama mapa par (silnik nie liczy się od nowa)', () => {
    open()
    useIctj.setState({ snap: snapshot([W, RET]) })
    const first = fleet.pendingPairsNow()
    const state = fleet.fleetNow()
    useIctj.setState({ snap: snapshot([{ ...W }, { ...RET }]) })
    expect(fleet.pendingPairsNow()).toBe(first)
    expect(fleet.fleetNow()).toBe(state)
  })
})
