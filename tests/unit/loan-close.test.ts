import { describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { containerSchema, loanSchema, SCHEMA_VERSION, type Container, type Loan } from '@shared/schema'

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
const ui = await import('../../src/renderer/store/ui')
const radar = await import('../../src/renderer/features/radar/actions')

const LOAN = '01K7S000000000000000000A01'
const STAMP = '2026-09-01T10:00:00.000Z'
const base = { schemaVersion: SCHEMA_VERSION, createdAt: STAMP, updatedAt: STAMP }
const loan = loanSchema.parse({ ...base, id: LOAN, name: 'Kredyt na auto', direction: 'taken', amount: 1_200_000, date: '2026-09-01' })
const container = (id: string, over: Partial<Container> = {}): Container =>
  containerSchema.parse({ ...base, id, name: `Rata ${id.slice(-1)}`, amount: 50_000, dueMonth: '2026-09', loanId: LOAN, ...over })

function load(loans: Loan[], containers: Container[]): void {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.loans = loans.map((l) => ({ record: l, relPath: `loans/${l.id}.json`, readOnly: false }))
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
const rec = <C extends 'loans' | 'containers'>(c: C, id: string) => data.useData.getState().records[c][id]!.record

describe('zamknięcie pożyczki z „Cofnij” (1.6.6, N35)', () => {
  it('kontener rat znika z ładowni jak zrzucony (do końca miesiąca), „Cofnij” oddaje dokładnie stan sprzed – wcześniej zarchiwizowany zostaje', () => {
    const active = container('01K7S000000000000000000C01')
    const old = container('01K7S000000000000000000C02', { archived: true, archivedAt: '2026-09-20T08:00:00.000Z' })
    load([loan], [active, old])

    radar.closeLoan(loan, true)
    expect(rec('loans', LOAN).closedAt).toBeTruthy()
    // Dropped as a container is (B56): with the time – the mass counts to this month's end, the game knows the day.
    expect(rec('containers', active.id)).toMatchObject({ archived: true, archivedAt: expect.any(String), amountAt: expect.any(String) })
    // One archived before: untouched.
    expect(rec('containers', old.id)).toEqual(old)
    const toast = ui.useUi.getState().toasts.at(-1)!
    expect(toast.text).toMatch(/Kredyt na auto.*zamknięta – dług znika/)

    toast.action!.run()
    expect(rec('loans', LOAN).closedAt).toBeNull()
    const { updatedAt: _a, ...activeNow } = rec('containers', active.id)
    const { updatedAt: _b, ...activeBefore } = active
    expect(activeNow).toEqual(activeBefore)
    const { updatedAt: _c, ...oldNow } = rec('containers', old.id)
    const { updatedAt: _d, ...oldBefore } = old
    expect(oldNow).toEqual(oldBefore)
  })

  it('otwarcie oddaje do ładowni tylko raty zdjęte przez zamknięcie (i zamknięte przed 1.6.6) – z „Cofnij”', () => {
    const closed = { ...loan, closedAt: '2026-10-01T08:00:00.000Z' }
    // Dropped by the closing (the same time), by a closing before 1.6.6 (no time), and archived on its own in September.
    const byClose = container('01K7S000000000000000000C03', { archived: true, archivedAt: '2026-10-01T08:00:00.000Z' })
    const legacy = container('01K7S000000000000000000C04', { archived: true, archivedAt: null })
    const own = container('01K7S000000000000000000C05', { archived: true, archivedAt: '2026-09-15T08:00:00.000Z' })
    load([closed], [byClose, legacy, own])
    radar.closeLoan(closed, false)
    expect(rec('loans', LOAN).closedAt).toBeNull()
    expect(rec('containers', byClose.id)).toMatchObject({ archived: false, archivedAt: null })
    expect(rec('containers', legacy.id)).toMatchObject({ archived: false, archivedAt: null })
    expect(rec('containers', own.id)).toEqual(own)
    const toast = ui.useUi.getState().toasts.at(-1)!
    expect(toast.text).toMatch(/otwarta ponownie/)
    toast.action!.run()
    expect(rec('loans', LOAN).closedAt).toBe(closed.closedAt)
    expect(rec('containers', byClose.id)).toMatchObject({ archived: true, archivedAt: byClose.archivedAt })
    expect(rec('containers', legacy.id)).toMatchObject({ archived: true, archivedAt: null })
  })

  it('„Cofnij” nie rusza rat, których zamknięcie nie zmieniło – zmiana z tej chwili zostaje', () => {
    const active = container('01K7S000000000000000000C06')
    const old = container('01K7S000000000000000000C07', { archived: true, archivedAt: '2026-09-20T08:00:00.000Z' })
    load([loan], [active, old])
    radar.closeLoan(loan, true)
    // Meanwhile (the other computer, the cargo hold) the archived one's amount changes.
    data.updateRecord('containers', old.id, (c) => ({ ...c, amount: 60_000 }))
    ui.useUi.getState().toasts.at(-1)!.action!.run()
    expect(rec('containers', old.id).amount).toBe(60_000)
    expect(rec('containers', active.id)).toMatchObject({ archived: false, archivedAt: null })
  })
})
