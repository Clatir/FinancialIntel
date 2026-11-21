import { describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import type { CargoStatus } from '@shared/calc/cargoStatus'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { containerSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, type Container } from '@shared/schema'

/**
 * U3 (T552): the toast of „Zapłacone poza budżetem” says how many dues it settled and up to which day – the dues of
 * the container the fees' state calls late, up to the one clicked (the earlier ones go with it).
 */
const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: unknown[]) => rs.map((r) => ({ ok: true, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(),
  deleteRecords: vi.fn(),
  historyKeep: vi.fn()
}
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: api })

const ID = '01K9N3G00000000000000000C1'
const OTHER = '01K9N3G00000000000000000C2'
const late = (containerId: string, due: string, carried = true): CargoStatus => ({ containerId, due, carried }) as CargoStatus
let statuses: CargoStatus[] = []
vi.mock('../../src/renderer/features/cargo/status', () => ({ cargoStatusesNow: () => statuses }))

const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const cargo = await import('../../src/renderer/features/cargo/actions')

const STAMP = '2025-01-01T10:00:00.000Z'
const phone = containerSchema.parse({ schemaVersion: SCHEMA_VERSION, createdAt: STAMP, updatedAt: STAMP, id: ID, name: 'Telefon Play', amount: 5000, dueMonth: '2026-01', dueDay: 20, counterparty: 'PLAY', accountId: MBANK_ACCOUNT_ID })

function load(containers: Container[]): void {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.containers = containers.map((c) => ({ record: c, relPath: `containers/${c.id}.json`, readOnly: false }))
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

describe('U3: toast „Zapłacone poza budżetem”', () => {
  it('jeden termin: nazwa i dzień; kilka: ile terminów i do którego dnia (tylko ten kontener, tylko do klikniętego)', () => {
    load([phone])
    statuses = [late(ID, '2026-10-20')]
    cargo.settleDue(phone, '2026-10-20')
    expect(lastToast().text).toBe('Telefon Play: termin 20.10.2026 zapłacony poza budżetem.')

    load([phone])
    statuses = [late(ID, '2026-08-20'), late(ID, '2026-09-20'), late(ID, '2026-10-20'), late(OTHER, '2026-09-20'), late(ID, '2026-11-20', false)]
    cargo.settleDue(phone, '2026-10-20')
    expect(lastToast().text).toBe('Telefon Play: zapłacono poza budżetem 3 terminy – do 20.10.2026.')

    load([phone])
    statuses = [late(ID, '2026-09-20'), late(ID, '2026-10-20'), late(ID, '2026-11-20')]
    cargo.settleDue(phone, '2026-11-20')
    expect(lastToast().text).toBe('Telefon Play: zapłacono poza budżetem 3 terminy – do 20.11.2026.')
  })

  it('pięć terminów: liczebnik „terminów”', () => {
    load([phone])
    statuses = ['2026-06-20', '2026-07-20', '2026-08-20', '2026-09-20', '2026-10-20'].map((d) => late(ID, d))
    cargo.settleDue(phone, '2026-10-20')
    expect(lastToast().text).toBe('Telefon Play: zapłacono poza budżetem 5 terminów – do 20.10.2026.')
  })
})
