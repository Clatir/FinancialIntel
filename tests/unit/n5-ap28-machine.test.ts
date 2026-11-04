import { describe, expect, it } from 'vitest'
import { accountOfLastEntry, entryAccount } from '@shared/calc/quick'
import { missingForecastText } from '@shared/ictj'
import type { Transaction } from '@shared/schema'

const MBANK = '01KDEFACC00000000000000001'
const XTB = '01KDEFACC00000000000000002'
const CASH = '01KDEFACC00000000000000003'
const tx = (accountId: string, createdAt: string, bank = false, id = createdAt): Transaction =>
  ({ id, accountId, createdAt, ...(bank ? { bank: { format: 'mbank', key: id } } : {}) }) as unknown as Transaction

describe('nowy komputer: konto nowego wpisu z folderu (AP-28, SW sp. 8)', () => {
  const accounts = [{ id: MBANK }, { id: XTB }, { id: CASH }]
  const list = [tx(MBANK, '2026-11-01T10:00:00Z'), tx(XTB, '2026-11-03T18:00:00Z'), tx(MBANK, '2026-11-04T08:00:00Z', true)]

  it('komputer bez własnego wyboru: konto najnowszego wpisu ręcznego w budżecie (nie z banku), nie pierwsze z listy', () => {
    expect(accountOfLastEntry(list, new Set([MBANK, XTB, CASH]))).toBe(XTB)
    expect(entryAccount(accounts, null, list)).toBe(XTB)
  })

  it('wybór tego komputera wygrywa; zamknięte konto – jak brak wyboru; pusty budżet – pierwsze konto', () => {
    expect(entryAccount(accounts, CASH, list)).toBe(CASH)
    expect(entryAccount([{ id: MBANK }, { id: CASH }], XTB, list)).toBe(MBANK)
    expect(entryAccount(accounts, null, [])).toBe(MBANK)
    expect(entryAccount([], null, list)).toBeNull()
  })
})

describe('ICTTJ niewczytany a wybrany scenariusz (AP-28, US.13)', () => {
  it('„nie ma w ICTTJ” tylko, gdy ICTTJ przeczytany', () => {
    expect(missingForecastText('ok')).toBe('(scenariusza nie ma w ICTTJ)')
    expect(missingForecastText('off')).toContain('ICTTJ nie jest czytany na tym komputerze')
    expect(missingForecastText('missing')).toContain('niedostępny')
    expect(missingForecastText('error')).not.toContain('nie ma w ICTTJ')
  })
})
