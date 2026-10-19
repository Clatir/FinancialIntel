import { describe, expect, it, vi } from 'vitest'
import type { RecordEntry } from '@shared/api'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); the sensors' inputs need none of it.
vi.stubGlobal('window', { fi: {} })
const { sensorTransactions } = await import('../../src/renderer/features/sensors/inputs')

let seq = 0
const nextId = () => `01K7Z00000000000000000${String(++seq).padStart(4, '0')}`
const tx = (over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, amount: -1000, counterparty: 'ALLEGRO', ...over })
const entry = (t: Transaction): RecordEntry<Transaction> => ({ record: t, relPath: `transactions/2026/2026-10-14_${t.id}.json`, readOnly: false })
const mapOf = (...ts: Transaction[]) => Object.fromEntries(ts.map((t) => [t.id, entry(t)]))

describe('czujniki liczone tylko po zmianie tego, co czytają (1.9.0, przegląd grupy U)', () => {
  it('notatka, dziennik, godzina – ta sama lista; kwota, kontrahent, „czekam na zwrot”, nowa i usunięta operacja – nowa', () => {
    const a = tx()
    const b = tx({ counterparty: 'ORLEN' })
    const first = sensorTransactions(mapOf(a, b))
    expect(first.map((t) => t.id)).toEqual([a.id, b.id])
    // The map is new after every autosave; the sensors' list stays while their fields stay.
    expect(sensorTransactions(mapOf({ ...a, note: 'oddany towar' }, b))).toBe(first)
    expect(sensorTransactions(mapOf({ ...a, note: 'oddany towar', time: '12:30', logNote: 'prezent' }, b))).toBe(first)
    const amount = sensorTransactions(mapOf({ ...a, amount: -2000 }, b))
    expect(amount).not.toBe(first)
    expect(amount[0]!.amount).toBe(-2000)
    const awaited = { ...a, amount: -2000, awaitReturn: { amount: 2000, until: '2026-10-28', closedAt: null } }
    expect(sensorTransactions(mapOf(awaited, b))[0]!.awaitReturn?.until).toBe('2026-10-28')
    const renamed = sensorTransactions(mapOf(awaited, { ...b, counterparty: 'BP' }))
    expect(renamed[1]!.counterparty).toBe('BP')
    // One gone, one new: new lists.
    const gone = sensorTransactions(mapOf(awaited))
    expect(gone.map((t) => t.id)).toEqual([a.id])
    const c = tx()
    expect(sensorTransactions(mapOf(awaited, c)).map((t) => t.id)).toEqual([a.id, c.id])
    // One gone and another new at once (the same count): a new list too.
    const d = tx()
    expect(sensorTransactions(mapOf(awaited, d)).map((t) => t.id)).toEqual([a.id, d.id])
  })
})
