import { describe, expect, it, vi } from 'vitest'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, defaultCategoryId, transactionSchema, type Transaction } from '@shared/schema'

// The components import the stores, which talk to window.fi: a stub, nothing is called.
vi.stubGlobal('window', { fi: {} })
const { inOwnList } = await import('../../src/renderer/components/AnchoredList')
const { categorizeRest } = await import('../../src/renderer/features/import/counts')
const { MANEUVER_MONTHS, rebaseManeuverMonths } = await import('../../src/renderer/features/intel/maneuverMonths')

// U4 (1.21.1, T553): the screens' small gaps – the list a popover owns, the maneuver's months after the month turns, the
// count on „Skategoryzuj pozostałe”. (Alt+← in Ustawienia: `shell-z3-store.test.ts`; Tab in „Podziel…”: `u4-nav.spec.ts`.)
let seq = 0
const tx = (date: string, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: `01K7R40000000000000${String(++seq).padStart(7, '0')}`, createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', date, accountId: MBANK_ACCOUNT_ID, amount: -1000, ...over })
const byId = (list: Transaction[]) => Object.fromEntries(list.map((t) => [t.id, { record: t }]))

describe('U4 (c): Popover zamyka się na klik w listę innego elementu, nie własną', () => {
  const field = (controls: string | null) => ({ getAttribute: (n: string) => (n === 'aria-controls' ? controls : null) })
  const box = (...controls: Array<string | null>) => ({ querySelectorAll: () => controls.map(field) })
  const list = (id: string) => ({ closest: () => ({ id }) })

  it('lista, na którą wskazuje pole w panelu – własna; lista z innego miejsca strony – nie', () => {
    expect(inOwnList(box(':r1:'), list(':r1:'))).toBe(true)
    expect(inOwnList(box(':r1:'), list(':r9:'))).toBe(false)
    expect(inOwnList(box(null), list(':r1:'))).toBe(false)
  })

  it('klik poza jakąkolwiek listą albo bez panelu – nie jest własną listą', () => {
    expect(inOwnList(box(':r1:'), { closest: () => null })).toBe(false)
    expect(inOwnList(null, list(':r1:'))).toBe(false)
  })
})

describe('U4 (d): szkic manewru po zmianie miesiąca', () => {
  const draft = { salary: 500000, salaryFrom: '2026-12', purchase: 20000, purchaseMonth: '2026-11', goalName: 'Rower' }

  it('miesiące sprzed zakresu przechodzą na pierwszy dostępny, wpisane kwoty i nazwy zostają', () => {
    const moved = rebaseManeuverMonths(draft, '2026-12')
    expect(moved).toEqual({ ...draft, salaryFrom: '2027-01', purchaseMonth: '2026-12' })
    expect(rebaseManeuverMonths(draft, '2027-03')).toMatchObject({ salaryFrom: '2027-04', purchaseMonth: '2027-03', salary: 500000, goalName: 'Rower' })
  })

  it('miesiące w zakresie zostają, ten sam obiekt – bez nowego szkicu', () => {
    expect(rebaseManeuverMonths(draft, '2026-11')).toBe(draft)
    const later = { ...draft, salaryFrom: '2027-05', purchaseMonth: '2027-02' }
    expect(rebaseManeuverMonths(later, '2026-11')).toBe(later)
  })

  it('miesiąc za końcem zakresu cofa się do jego końca', () => {
    expect(MANEUVER_MONTHS).toBe(12)
    expect(rebaseManeuverMonths({ ...draft, salaryFrom: '2030-01' }, '2026-11').salaryFrom).toBe('2027-11')
  })
})

describe('U4 (e): „Skategoryzuj pozostałe” – liczba jak lista, którą przycisk otwiera', () => {
  const FOOD = defaultCategoryId(1)
  it('liczy wszystkie wydatki bez kategorii od dnia najwcześniejszego z importu, nie tylko z niego – bez szkiców (T558)', () => {
    const a = tx('2026-10-05', { counterparty: 'z importu' })
    const done = tx('2026-10-06', { counterparty: 'z kategorią', categoryId: FOOD })
    const own = tx('2026-10-10', { counterparty: 'wpisany ręcznie' })
    const draft = tx('2026-10-10', { counterparty: 'szkic' })
    const before = tx('2026-09-01', { counterparty: 'sprzed importu' })
    const income = tx('2026-10-11', { kind: 'income', amount: 5000, counterparty: 'wpływ' })
    const all = [a, done, own, draft, before, income]
    expect(categorizeRest([a.id, done.id], byId(all), all, { [draft.id]: true })).toEqual({ from: '2026-10-05', count: 2 })
  })

  it('bez wydatku bez kategorii z importu – brak przycisku', () => {
    const done = tx('2026-10-06', { categoryId: FOOD })
    const other = tx('2026-10-07')
    expect(categorizeRest([done.id], byId([done, other]))).toBeNull()
    expect(categorizeRest(['01K7U4NIEMA'], byId([other]))).toBeNull()
  })
})
