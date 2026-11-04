import { describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { containerSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Container, type Transaction } from '@shared/schema'

/**
 * AP-10 in the window's store (T376, T375, T379): a payment day set by hand is stamped (`dueAt` – the history before it
 * no longer says the day), „Zapłacone poza budżetem” settles a late due (`aliveAt`), „Zapłacone” of a late due writes
 * its amount, and linking a payee's payments starts at the month before the budget's first one.
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
const data = await import('../../src/renderer/store/data')
const cargo = await import('../../src/renderer/features/cargo/actions')

const ID = '01K9N3G00000000000000000C1'
const STAMP = '2025-01-01T10:00:00.000Z'
const phone = containerSchema.parse({ schemaVersion: SCHEMA_VERSION, createdAt: STAMP, updatedAt: STAMP, id: ID, name: 'Telefon Play', amount: 5000, dueMonth: '2026-01', dueDay: 20, counterparty: 'PLAY', accountId: MBANK_ACCOUNT_ID })
const tx = (id: string, date: string): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, createdAt: STAMP, updatedAt: STAMP, id, date, accountId: MBANK_ACCOUNT_ID, amount: -5000, kind: 'expense', counterparty: 'PLAY' })

function load(containers: Container[], transactions: Transaction[] = [], start: string | null = null): void {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  fi.settings.budget.start = start
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.containers = containers.map((c) => ({ record: c, relPath: `containers/${c.id}.json`, readOnly: false }))
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
const current = () => data.useData.getState().records.containers[ID]!.record

describe('AP-10 w oknie: dzień płatności, zaległość, łączenie płatności', () => {
  it('„Płatność” zmieniona w edytorze zapisuje chwilę ustawienia dnia (dueAt, T376); inna zmiana – nie', () => {
    load([phone])
    cargo.patchContainer(ID, { note: 'abonament' })
    expect(current().dueAt).toBeUndefined()
    cargo.patchContainer(ID, { dueMonth: '2026-11', dueDay: 6 })
    expect(current()).toMatchObject({ dueMonth: '2026-11', dueDay: 6 })
    expect(current().dueAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('„Zapłacone poza budżetem” 20.10: aliveAt 21.10 (późniejszy zostaje); „Zapłacone” zaległej – jej kwota', () => {
    load([phone])
    cargo.settleDue(current(), '2026-10-20')
    expect(current().aliveAt).toBe('2026-10-21')
    load([{ ...phone, aliveAt: '2026-11-02' }])
    cargo.settleDue(current(), '2026-10-20')
    expect(current().aliveAt).toBe('2026-11-02')
    const id = cargo.payContainer(current(), 4500)!
    expect(data.useData.getState().records.transactions[id]!.record).toMatchObject({ amount: -4500, containerId: ID })
  })

  it('łączenie płatności odbiorcy od 1. dnia miesiąca przed startem (T379): start 04.11 – 28.10 tak, 28.09 nie', () => {
    load([phone], [tx('01K9N3G00000000000000000T1', '2026-09-28'), tx('01K9N3G00000000000000000T2', '2026-10-28')], '2026-11-04')
    expect(cargo.linkPayments(ID, 'PLAY', true)).toBe(1)
    const txs = data.useData.getState().records.transactions
    expect([txs['01K9N3G00000000000000000T1']!.record.containerId, txs['01K9N3G00000000000000000T2']!.record.containerId]).toEqual([null, ID])
  })
})
