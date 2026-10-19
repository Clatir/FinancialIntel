import { describe, expect, it, vi } from 'vitest'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema } from '@shared/schema'

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: {} })
const { wealthOf } = await import('../../src/renderer/features/intel/wealth')

const STAMP = '2026-09-01T10:00:00.000Z'
const base = { schemaVersion: SCHEMA_VERSION, createdAt: STAMP, updatedAt: STAMP }
const accounts = createDefaultSettings(STAMP).settings.accounts
const balances = [balanceSchema.parse({ ...base, id: '01K7S000000000000000000B01', date: '2026-08-03', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: 500_000 })]
const tx = (id: string, date: string, amount: number) => transactionSchema.parse({ ...base, id, date, accountId: MBANK_ACCOUNT_ID, amount })
const transactions = [tx('01K7S000000000000000000T01', '2026-08-10', -10_000), tx('01K7S000000000000000000T02', '2026-09-14', 30_000)]

describe('krzywa majątku raz na stan danych – Mostek i Wywiad (1.6.6, N58)', () => {
  it('te same listy – ta sama krzywa bez liczenia od nowa; nowa lista (zapis) – liczona od nowa', () => {
    const a = wealthOf(transactions, balances, accounts, '2026-10-19')
    expect(a.points.at(-1)?.value).toBe(520_000)
    expect(wealthOf(transactions, balances, accounts, '2026-10-19')).toBe(a)
    const b = wealthOf([...transactions, tx('01K7S000000000000000000T03', '2026-10-01', -5_000)], balances, accounts, '2026-10-19')
    expect(b).not.toBe(a)
    expect(b.points.at(-1)?.value).toBe(515_000)
    // Another day: the last point is today.
    expect(wealthOf(transactions, balances, accounts, '2026-10-20').points.at(-1)?.date).toBe('2026-10-20')
  })
})
