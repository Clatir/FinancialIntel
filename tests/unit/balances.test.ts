import { describe, expect, it } from 'vitest'
import { balanceAt, lastConfirmation, openingOf, planConfirmation } from '@shared/calc/balances'
import { balanceSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID } from '@shared/schema'

const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: `01K00000000000000000000${String(++seq).padStart(3, '0')}`, createdAt: AT, updatedAt: AT })
const tx = (date: string, amount: number, accountId = MBANK_ACCOUNT_ID) => transactionSchema.parse({ ...base(), date, accountId, amount })
const bal = (kind: 'opening' | 'confirmation', date: string, amount: number, accountId = MBANK_ACCOUNT_ID) => balanceSchema.parse({ ...base(), date, accountId, kind, amount })

describe('salda kont', () => {
  const txs = [tx('2026-08-05', -999), tx('2026-08-06', -100), tx('2026-09-01', 500), tx('2026-09-01', -50, XTB_WALLET_ACCOUNT_ID)]

  it('saldo otwarcia na początek dnia, potwierdzenie na koniec dnia', () => {
    const balances = [bal('opening', '2026-08-06', 1000)]
    expect(openingOf(MBANK_ACCOUNT_ID, balances)?.amount).toBe(1000)
    expect(balanceAt(MBANK_ACCOUNT_ID, '2026-08-06', txs, balances)).toBe(900)
    expect(balanceAt(MBANK_ACCOUNT_ID, '2026-09-30', txs, balances)).toBe(1400)
    // Without an opening: the sum of the operations.
    expect(balanceAt(XTB_WALLET_ACCOUNT_ID, '2026-09-30', txs, balances)).toBe(-50)
    // The latest opening restarts the account.
    expect(openingOf(MBANK_ACCOUNT_ID, [...balances, bal('opening', '2026-09-01', 7)])?.amount).toBe(7)
  })

  it('potwierdzenie bez salda otwarcia ustawia je na pierwszą operację konta', () => {
    expect(planConfirmation(MBANK_ACCOUNT_ID, 5000, '2026-09-30', txs, [])).toEqual({ kind: 'opening', date: '2026-08-05', amount: 5000 - (-999 - 100 + 500) })
    expect(planConfirmation(XTB_WALLET_ACCOUNT_ID, 300, '2026-08-31', txs, [])).toEqual({ kind: 'opening', date: '2026-08-31', amount: 300 })
  })

  it('zgodne saldo albo korekta różnicy (rozbieżność w ładowni)', () => {
    const balances = [bal('opening', '2026-08-06', 1000)]
    expect(planConfirmation(MBANK_ACCOUNT_ID, 1400, '2026-09-30', txs, balances)).toEqual({ kind: 'match', computed: 1400 })
    expect(planConfirmation(MBANK_ACCOUNT_ID, 1350, '2026-09-30', txs, balances)).toEqual({ kind: 'correction', computed: 1400, diff: -50 })
    const confirmed = [...balances, bal('confirmation', '2026-09-30', 1350), bal('confirmation', '2026-09-15', 1)]
    expect(lastConfirmation(MBANK_ACCOUNT_ID, confirmed)?.date).toBe('2026-09-30')
  })
})
