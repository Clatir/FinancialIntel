import { describe, expect, it } from 'vitest'
import { entryAccount, lastAccountOf } from '@shared/calc/quick'
import { missingForecastText } from '@shared/ictj'
import type { Transaction } from '@shared/schema'

const MBANK = '01KDEFACC00000000000000001'
const XTB = '01KDEFACC00000000000000002'
const CASH = '01KDEFACC00000000000000003'
/** An operation typed by hand (a purchase), or one from the bank. */
const tx = (accountId: string, createdAt: string, bank = false, id = createdAt): Transaction =>
  ({ id, accountId, createdAt, kind: 'expense', amount: -100, title: '', containerId: null, ...(bank ? { bank: { format: 'mbank', key: id } } : {}) }) as unknown as Transaction

describe('konto nowego wpisu z folderu (AP-28 i AP-20, SW sp. 8 – T441, T432)', () => {
  const accounts = [{ id: MBANK }, { id: XTB }, { id: CASH }]
  const list = [tx(MBANK, '2026-11-01T10:00:00Z'), tx(XTB, '2026-11-03T18:00:00Z'), tx(MBANK, '2026-11-04T08:00:00Z', true)]

  it('nowy komputer: konto najnowszego wpisu ręcznego w budżecie (nie z banku), nie pierwsze z listy', () => {
    expect(lastAccountOf(list, [], new Set([MBANK, XTB, CASH]))).toBe(XTB)
    expect(entryAccount(accounts, null, list)).toBe(XTB)
  })

  it('folder przed wyborem tego komputera (T441); zamknięte konto – najnowszy wpis na otwartym; bez wpisów – wybór komputera, potem pierwsze', () => {
    // The budget's last entry was on XTB (the other computer): this one starts there too, not on its own last choice.
    expect(entryAccount(accounts, CASH, list)).toBe(XTB)
    // XTB closed since: the newest entry typed on an account still open.
    expect(entryAccount([{ id: MBANK }, { id: CASH }], XTB, list)).toBe(MBANK)
    // Nothing typed by hand yet: this computer's choice, else the first account.
    expect(entryAccount(accounts, CASH, [tx(MBANK, '2026-11-04T08:00:00Z', true)])).toBe(CASH)
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
