import { describe, expect, it } from 'vitest'
import { computeFleet, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { balanceOf, incomeShares, settleHousehold } from '@shared/calc/household'
import { incomeParts, plainIncomeContext } from '@shared/calc/income'
import { loanIdsOf, loanParts, loanPayers, loanState, loanStates } from '@shared/calc/loans'
import { netAdjustments } from '@shared/calc/netWorth'
import { repaymentShares } from '@shared/calc/repayments'
import { tagSummaries } from '@shared/calc/tags'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import {
  balanceSchema,
  defaultCategoryId,
  loanSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  type HouseholdMember,
  type Loan,
  type Settings,
  type Split,
  type Transaction
} from '@shared/schema'

// D100 (2), T355–T356: any inflow – also from a person other than the borrower – may repay a loan given, whole or a part.
const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01KN2P00000000000000000${String(++seq).padStart(3, '0')}`
const GROCERIES = defaultCategoryId(1, 1)
const MAMA = `01KMEM${'0'.repeat(19)}4`
const member = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const MEMBERS = [member(MAMA, 'Mama', { bankNames: ['ANNA NOWAK'] })]
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const loan = (over: Partial<Loan> = {}): Loan =>
  loanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, name: 'Pożyczka dla Jana', direction: 'given', counterparty: 'JAN KOWALSKI', amount: zl(1000), date: '2026-10-01', ...over })
/** A line of an inflow repaying a loan (D100): no member's money. */
const loanLine = (amount: number, loanId: string): Split => ({ id: nextId(), amount: zl(amount), categoryId: null, refundable: false, memberId: null, advance: false, loanId, note: '' })

function settings(): Settings {
  const s = createDefaultSettings(AT).settings
  // The shields full from the start (3 salaries of 1 000 zł < 12 640 zł): income docks into the hull, a loan's money
  // back goes to the shields – the two told apart.
  return {
    ...s,
    budget: { start: '2026-10-01', initial: { shields: zl(12640), hull: zl(15000), goals: {} } },
    layers: { ...s.layers, assumedCosts: zl(3650) },
    household: { since: '2026-10-01', members: [...s.household.members, ...MEMBERS] }
  }
}

function fleet(transactions: Transaction[], loans: Loan[]): FleetState {
  const input: FleetInput = {
    settings: settings(),
    balances: [balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(27640) })],
    months: [monthPlanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, month: '2026-10', salary: zl(1000) })],
    loans,
    transactions,
    now: '2026-10-20T12:00:00+02:00'
  }
  const state = computeFleet(input)
  expect(layersSum(state)).toBe(state.total)
  return state
}
const movesOf = (f: FleetState, t: Transaction) => f.log.find((e) => e.txId === t.id)!.moves

describe('D100: wpłata od innej osoby niż pożyczkobiorca spłaca pożyczkę udzieloną', () => {
  it('pożyczka Janowi 1 000 zł; mama Jana przelewa 400 zł „spłata pożyczki Jana” – pożyczka 600 zł, w wierszu „kto zapłacił: …”', () => {
    const jan = loan()
    const lent = tx('2026-10-01', -zl(1000), { kind: 'loan', loanId: jan.id, counterparty: 'JAN KOWALSKI' })
    // A whole inflow as its part (the quick entry, the editor) and as the loan's own operation (the import's „Zwrot pożyczki”).
    const asPart = tx('2026-10-10', zl(400), { kind: 'income', counterparty: 'EWA KOWALSKA', title: 'SPLATA POZYCZKI JANA', splits: [loanLine(400, jan.id)] })
    const asWhole = { ...asPart, kind: 'loan' as const, splits: [], loanId: jan.id }
    for (const back of [asPart, asWhole]) {
      const s = loanState(jan, [lent, back], [], '2026-10-20')
      expect(s).toMatchObject({ total: zl(1000), paid: zl(400), open: zl(600) })
      expect(s.payments).toEqual([{ txId: back.id, date: '2026-10-10', amount: zl(400), memberId: null, counterparty: 'EWA KOWALSKA', part: back.kind === 'income' }])
      expect(loanPayers(s, MEMBERS)).toEqual([{ name: 'EWA KOWALSKA', amount: zl(400), borrower: false }])
      const f = fleet([lent, back], [jan])
      expect(f.receivables.loans).toEqual({ [jan.id]: zl(600) })
      // Back to the shields – never docked as income (the shields full: income would go to the hull).
      expect(movesOf(f, back)).toEqual({ loans: { [jan.id]: -zl(400) }, shields: zl(400) })
      expect(incomeParts(back, f.incomeContext).work).toBe(0)
      expect(incomeParts(back, plainIncomeContext([lent, back], [jan])).work).toBe(0)
    }
    // The borrower's own repayment stays his: the row says „kto zapłacił” only when someone else paid too.
    const own = tx('2026-10-12', zl(100), { kind: 'loan', loanId: jan.id, counterparty: 'KOWALSKI JAN UL. LIPOWA 5' })
    expect(loanPayers(loanState(jan, [lent, asPart, own], [], '2026-10-20'), MEMBERS)).toEqual([
      { name: 'EWA KOWALSKA', amount: zl(400), borrower: false },
      { name: 'KOWALSKI JAN UL. LIPOWA 5', amount: zl(100), borrower: true }
    ])
  })

  it('wpłata domownika 500 zł: 200 zł spłaca pożyczkę, reszta 300 zł – jej zakupy (ma oddać 350 → 50); kto zapłacił: Mama', () => {
    const jan = loan()
    const bought = tx('2026-10-03', -zl(350), { categoryId: GROCERIES, refundable: true, memberId: MAMA, counterparty: 'Sklep' })
    const money = tx('2026-10-10', zl(500), { kind: 'income', memberId: MAMA, counterparty: 'ANNA NOWAK', splits: [loanLine(200, jan.id)] })
    expect(incomeShares(money)).toEqual([
      { memberId: null, amount: zl(200), advance: false, line: 0, loanId: jan.id },
      { memberId: MAMA, amount: zl(300), advance: false, inflowKind: undefined }
    ])
    expect(loanParts(money)).toEqual([{ loanId: jan.id, amount: zl(200) }])
    // Her purchases are paid back by her 300 zł only – never by the loan's 200 zł (D91 – the sure purchase, the editor).
    expect(repaymentShares(money)).toEqual([{ memberId: MAMA, amount: zl(300), isReturn: false }])
    const ledger = settleHousehold([bought, money])
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: zl(50), deposit: 0 })
    expect(ledger.byTx.get(money.id)).toMatchObject([{ memberId: MAMA, repaid: zl(300), advance: 0, income: 0 }])
    const f = fleet([bought, money], [jan])
    expect(balanceOf(f.household, MAMA)).toMatchObject({ owed: zl(50) })
    expect(f.receivables.loans).toEqual({ [jan.id]: zl(800) })
    // Her repayment and the loan's both back to the shields; nothing of it docks.
    expect(movesOf(f, money)).toEqual({ house: -zl(300), loans: { [jan.id]: -zl(200) }, shields: zl(500) })
    const s = f.loans.find((l) => l.loan.id === jan.id)!
    expect(s.payments).toMatchObject([{ txId: money.id, amount: zl(200), memberId: MAMA, part: true }])
    expect(loanPayers(s, MEMBERS)).toEqual([{ name: 'Mama', amount: zl(200), borrower: false }])
  })

  it('wpłata ponad dług pożyczki: do osłon tyle, ile zostało (100 zł), nadwyżka 200 zł dokuje jako przychód (T70)', () => {
    const jan = loan()
    const lent = tx('2026-10-01', -zl(1000), { kind: 'loan', loanId: jan.id })
    const first = tx('2026-10-05', zl(900), { kind: 'loan', loanId: jan.id, counterparty: 'JAN KOWALSKI' })
    const more = tx('2026-10-10', zl(300), { kind: 'income', counterparty: 'EWA KOWALSKA', splits: [loanLine(300, jan.id)] })
    const f = fleet([lent, first, more], [jan])
    expect(movesOf(f, more)).toEqual({ loans: { [jan.id]: -zl(100) }, shields: zl(100), hull: zl(200) })
    expect(f.receivables.loans).toEqual({})
    expect(f.loans.find((l) => l.loan.id === jan.id)).toMatchObject({ paid: zl(1200), open: 0 })
    // The same as a whole repayment of before D100 (kind 'loan'): the same ship.
    const whole = fleet([lent, first, { ...more, kind: 'loan', splits: [], loanId: jan.id }], [jan])
    expect([whole.shields.amount, whole.hull.amount]).toEqual([f.shields.amount, f.hull.amount])
  })

  it('część wpłaty przed startem budżetu liczy się jak spłata (pożyczka sprzed startu): po starcie wraca tylko reszta długu', () => {
    const old = loan({ date: '2026-08-01' })
    const before = tx('2026-09-10', zl(700), { kind: 'income', counterparty: 'EWA KOWALSKA', splits: [loanLine(700, old.id)] })
    const after = tx('2026-10-10', zl(500), { kind: 'income', counterparty: 'EWA KOWALSKA', splits: [loanLine(500, old.id)] })
    const f = fleet([before, after], [old])
    // 1 000 − 700 before the start = 300 owed: back to the shields, 200 zł beyond the debt is income (the hull).
    expect(movesOf(f, after)).toEqual({ loans: { [old.id]: -zl(300) }, shields: zl(300), hull: zl(200) })
  })

  it('część innej pożyczki niż udzielona z Radaru (wzięta, nieznana) to przychód – jak w starszej wersji', () => {
    const taken = loan({ direction: 'taken', amount: zl(5000) })
    const unknown = nextId()
    const a = tx('2026-10-10', zl(300), { kind: 'income', counterparty: 'BANK', splits: [loanLine(300, taken.id)] })
    const b = tx('2026-10-11', zl(200), { kind: 'income', counterparty: 'KTOŚ', splits: [loanLine(200, unknown)] })
    const f = fleet([a, b], [taken])
    // Docked whole (the shields full – their 0 zł is the docking's split), no loan's move.
    expect(movesOf(f, a)).toEqual({ shields: 0, hull: zl(300) })
    expect(movesOf(f, b)).toEqual({ shields: 0, hull: zl(200) })
    expect(loanStates([taken], [a, b], [], '2026-10-20')[0]).toMatchObject({ paid: 0, payments: [] })
  })

  it('statystyki przychodów, tagi i wartość netto: część pożyczki nie jest przychodem ani zwrotem na wyprawie, pożyczka maleje od dnia wpłaty', () => {
    const jan = loan()
    const lent = tx('2026-10-01', -zl(1000), { kind: 'loan', loanId: jan.id })
    const mixed = tx('2026-10-10', zl(500), { kind: 'income', counterparty: 'EWA KOWALSKA', tags: ['wyjazd'], splits: [loanLine(200, jan.id)] })
    expect(incomeParts(mixed, plainIncomeContext([lent, mixed], [jan])).work).toBe(zl(300))
    // A trip's money back is mine only (F17): 300 zł, not 500 zł.
    const trip = tagSummaries([mixed], categoryIndex(createDefaultSettings(AT).settings.categories)).find((x) => x.key === 'wyjazd')!
    expect(trip.spent).toBe(-zl(300))
    const adj = netAdjustments(['2026-10-05', '2026-10-15'], { loans: [jan], transactions: [lent, mixed], containers: [], household: { owed: 0, deposit: 0, byTx: new Map() }, today: '2026-10-20' })
    expect(adj).toEqual([zl(1000), zl(800)])
    expect(loanIdsOf(mixed)).toEqual([jan.id])
    expect(loanIdsOf(lent)).toEqual([jan.id])
  })

  it('stara spłata całą wpłatą (rodzaj „Pożyczka”) bez zmian; linie ponad kwotę wpłaty ucięte jak części domowników', () => {
    const jan = loan()
    const whole = tx('2026-10-10', zl(250), { kind: 'loan', loanId: jan.id, counterparty: 'JAN KOWALSKI' })
    expect(loanState(jan, [whole], [], '2026-10-20')).toMatchObject({ paid: zl(250), open: zl(750), payments: [{ txId: whole.id, part: false, memberId: null }] })
    // A file edited by hand: the line beyond the inflow's money counts at most its amount.
    const cut = tx('2026-10-11', zl(100), { kind: 'income', counterparty: 'EWA KOWALSKA', splits: [loanLine(300, jan.id)] })
    expect(loanParts(cut)).toEqual([{ loanId: jan.id, amount: zl(100) }])
    expect(loanState(jan, [cut], [], '2026-10-20')).toMatchObject({ paid: zl(100), open: zl(900) })
  })
})
