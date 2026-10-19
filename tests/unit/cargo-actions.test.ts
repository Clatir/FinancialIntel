import { describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { warsawNow, addMonths } from '@shared/calc/dates'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { containerSchema, SCHEMA_VERSION, type Container } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here a mock that takes every write.
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
const data = await import('../../src/renderer/store/data')
const cargo = await import('../../src/renderer/features/cargo/actions')

const ID = '01K7S000000000000000000D01'
const STAMP = '2025-01-01T10:00:00.000Z'
const tax = containerSchema.parse({ schemaVersion: SCHEMA_VERSION, createdAt: STAMP, updatedAt: STAMP, id: ID, name: 'Podatek od nieruchomości', amount: 40_000, cycleMonths: 12, dueMonth: '2026-03', amountAt: STAMP })

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
const current = () => data.useData.getState().records.containers[ID]!.record

describe('zmiana masy kontenera zapisuje swoją chwilę (1.9.0, przegląd grupy U)', () => {
  it('harmonogram miesięcy i historia kwot zmieniają masę – nowa chwila zmiany; notatka i ta sama lista – nie', () => {
    load([tax])
    cargo.patchContainer(ID, { note: 'płatne w gminie' })
    expect(current().amountAt).toBe(STAMP)
    cargo.patchContainer(ID, { schedule: [] })
    expect(current().amountAt).toBe(STAMP)
    cargo.patchContainer(ID, { schedule: [3, 5, 9, 11] })
    const scheduled = current().amountAt
    expect(scheduled).not.toBe(STAMP)
    expect(current().schedule).toEqual([3, 5, 9, 11])
    // A new amount: the months before keep the old one – the change stamped.
    cargo.patchContainer(ID, { amount: 45_000 })
    expect(current().past).toEqual([{ until: addMonths(warsawNow().month, -1), amount: 40_000 }])
    // „Jedna kwota we wszystkich miesiącach”: the history gone – the mass of months before changed, stamped.
    load([{ ...current(), amountAt: STAMP }])
    cargo.clearPast(current())
    expect(current().past).toEqual([])
    expect(current().amountAt).not.toBe(STAMP)
  })
})
