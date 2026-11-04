/**
 * N2 (1.15.6), the review's findings – the pure parts: a loan container's amount changed in Ładownia (T347), the
 * „Cofnij” of a kind change (T362), the duplicates panel's pairs among the other reports' „zostaw” keys, a category used
 * by an import in progress (T361).
 */
import { describe, expect, it } from 'vitest'
import { pastAfterChange } from '@shared/calc/cargoWatch'
import { categoryUses, type CategoryUseInput } from '@shared/calc/categoryUse'
import { addMonths } from '@shared/calc/dates'
import { amountIn } from '@shared/calc/fleet'
import { kindUndone, withKind } from '@shared/calc/kinds'
import { installmentAmounts, monthlySchedule } from '@shared/calc/loans'
import { returnedKey } from '@shared/import/deleted'
import { duplicateKey, isDuplicatePairKey, REPORT_KEY_PREFIXES, rowKey } from '@shared/import/duplicates'
import { containerSchema, defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9R2M000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const CONTAINER = '01K9R2MC00000000000000000C'
const GOAL = '01K9R2MG00000000000000000G'

describe('przegląd N2: „Kwota” kontenera raty pożyczki zmieniona w Ładowni liczy się od tego miesiąca (T347)', () => {
  // 4 000 zł in 12: 333,33 zł × 11 and 333,37 zł – the months before the last in the amount history, up to month 11.
  let n = 0
  const schedule = monthlySchedule(zl(4000), 12, '2026-09-10', () => `s${++n}`)
  const loan = containerSchema.parse({ ...base(), name: 'Rata: Kredyt', type: 'installment', cycleMonths: 1, dueMonth: '2026-09', dueDay: 10, from: '2026-09', until: '2027-08', createdAt: '2026-09-01T08:00:00.000Z', ...installmentAmounts(schedule) })

  it('w trzecim miesiącu spłaty 400 zł: miesiące przed nim zostają przy racie, ten i kolejne – 400 zł (przedtem dopiero ostatni)', () => {
    expect(loan.past).toEqual([{ until: '2027-07', amount: 33333 }])
    const month = '2026-11'
    const past = pastAfterChange(loan, month)
    expect(past).toEqual([{ until: '2026-10', amount: 33333 }])
    const changed = { ...loan, amount: zl(400), past }
    expect(['2026-09', '2026-10', '2026-11', '2027-03', '2027-08'].map((m) => amountIn(changed, m))).toEqual([33333, 33333, zl(400), zl(400), zl(400)])
    // A second change the same month only sets the new amount.
    expect(pastAfterChange(changed, month)).toEqual(past)
  })

  it('kontener od tego miesiąca: dalsza historia ustępuje nowej kwocie; historia przed miesiącem zmiany zostaje', () => {
    expect(pastAfterChange({ ...loan, from: '2026-11' }, '2026-11')).toEqual([])
    const kept = { ...loan, past: [{ until: '2026-09', amount: zl(300) }, { until: '2027-07', amount: 33333 }] }
    expect(pastAfterChange(kept, '2026-11')).toEqual([{ until: '2026-09', amount: zl(300) }, { until: '2026-10', amount: 33333 }])
    // The same month a month before the history ends: the entry ending there stays as it is.
    const ending = { ...loan, past: [{ until: '2026-10', amount: zl(300) }, { until: '2027-07', amount: 33333 }] }
    expect(pastAfterChange(ending, '2026-11')).toEqual([{ until: '2026-10', amount: zl(300) }])
    expect(addMonths('2026-11', -1)).toBe('2026-10')
  })
})

describe('przegląd N2: „Cofnij” zmiany rodzaju cofa tylko to, co zmiana ustawiła (T362)', () => {
  const tx = (over: Partial<Transaction> = {}): Transaction =>
    transactionSchema.parse({ ...base(), date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, kind: 'expense', amount: -zl(120), counterparty: 'TAURON', containerId: CONTAINER, ...over })

  it('kwota i kontrahent zmienione w ciągu 8 s zostają; rodzaj, kontener i znak kwoty wracają', () => {
    const before = tx()
    const after = withKind(before, 'income')
    expect([after.amount, after.containerId]).toEqual([zl(120), null])
    const edited = { ...after, counterparty: 'TAURON SPRZEDAŻ' }
    expect(kindUndone(edited, before, after)).toEqual({ ...before, counterparty: 'TAURON SPRZEDAŻ' })
    // The amount typed since stays (its sign too – the user's).
    const typed = { ...after, amount: zl(150) }
    expect(kindUndone(typed, before, after)).toMatchObject({ kind: 'expense', containerId: CONTAINER, amount: zl(150) })
  })

  it('cel paragonu i rodzaj zmieniony znowu: część paragonu wraca z celem; inny rodzaj teraz – nic', () => {
    const receipt = tx({ containerId: null, splits: [{ id: nextId(), amount: -zl(120), categoryId: defaultCategoryId(1), goalId: GOAL, note: '', refundable: false, memberId: null, advance: false }] })
    const after = withKind(receipt, 'transfer')
    expect(after.splits).toEqual([])
    expect(kindUndone(after, receipt, after)).toEqual(receipt)
    const again = withKind(after, 'loan')
    expect(kindUndone(again, receipt, after)).toBe(again)
  })
})

describe('przegląd N2: pary panelu duplikatów po tym, co panel zapisuje – nie po braku przestrzeni nazw', () => {
  it('klucze panelu (także zapisane dotąd) – pary; klucze innych meldunków i goły identyfikator – nie', () => {
    const [a, b] = [nextId(), nextId()]
    expect(isDuplicatePairKey(duplicateKey([b, a]))).toBe(true)
    expect(isDuplicatePairKey(`${a}|${b}`)).toBe(true)
    expect(isDuplicatePairKey(rowKey(MBANK_ACCOUNT_ID, 'k1|2026-10-14'))).toBe(true)
    expect(isDuplicatePairKey(rowKey('*', 'x|y'))).toBe(true)
    for (const key of [returnedKey(a), `correction:${a}`, `transfer:${a}:${b}`, `transfer-lone:${a}`]) expect(isDuplicatePairKey(key)).toBe(false)
    // Before: a key without a colon was a pair – a future report's bare id forgotten with „zapomnij «to nie duplikat»”.
    expect(isDuplicatePairKey(a)).toBe(false)
    expect(isDuplicatePairKey('')).toBe(false)
  })

  it('klucz „zostaw” powracającej operacji ma zarejestrowany przedrostek', () => {
    expect(REPORT_KEY_PREFIXES.some((p) => returnedKey('X').startsWith(p))).toBe(true)
  })
})

describe('przegląd N2: kategoria w decyzjach trwającego importu jest w użyciu (T361)', () => {
  const none: CategoryUseInput = { transactions: [], months: [], containers: [], scheduled: [], game: [], rules: [], views: [] }
  const SUB = defaultCategoryId(1, 1)

  it('decyzje grup i wierszy otwartego pliku liczą się osobno, po regułach importu; bez importu – nic', () => {
    const ids = new Set([defaultCategoryId(1), SUB])
    expect(categoryUses(ids, none)).toEqual([])
    expect(categoryUses(ids, { ...none, importing: [{ categoryId: SUB }, { categoryId: null }, { categoryId: defaultCategoryId(2) }, { categoryId: defaultCategoryId(1) }] })).toEqual([{ kind: 'import', count: 2 }])
  })
})
