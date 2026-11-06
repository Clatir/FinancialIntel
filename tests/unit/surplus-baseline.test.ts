/**
 * 1.19.0, step 0 (D102): the surplus of one transfer repaying several household members – how the ledger and the engine
 * read the records the „Nadwyżka” panel will write (the editor, the quick entry, the import). No change of the format:
 * a member's part = their debt + their share of the surplus (a repayment, the rest as their advance or income), the
 * sender's share – the rest of the amount as the sender's choice says, a share repaying a loan given – a `loanId` line
 * (D100). These pass already: the contract steps 2, 4, 1 and 3 stand on.
 */
import { describe, expect, it } from 'vitest'
import { computeFleet, layersSum, type FleetState } from '@shared/calc/fleet'
import { balanceOf, heldOf, settleHousehold, skippedDebtsOf } from '@shared/calc/household'
import { loanState } from '@shared/calc/loans'
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

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
const TODAY = '2026-10-20'
let seq = 0
const nextId = () => `01KN9S0${String(++seq).padStart(19, '0')}`
const GROCERIES = defaultCategoryId(1, 1)
const MAMA = `01KMEM${'0'.repeat(19)}4`
const TATA = `01KMEM${'0'.repeat(19)}5`
const member = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const MEMBERS = [member(TATA, 'Tata'), member(MAMA, 'Mama', { inflow: 'ask', via: TATA })]
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const bought = (amount: number, memberId: string) => tx('2026-10-05', -zl(amount), { categoryId: GROCERIES, refundable: true, memberId, counterparty: 'Sklep' })
const line = (memberId: string | null, amount: number, over: Partial<Split> = {}): Split => ({ id: nextId(), amount: zl(amount), categoryId: null, refundable: false, memberId, advance: false, note: '', ...over })
const loanLine = (amount: number, loanId: string): Split => ({ id: nextId(), amount: zl(amount), categoryId: null, refundable: false, memberId: null, advance: false, loanId, note: '' })
/** Tata's 400 zł: „spłata”, his rest as `advance` says; the parts of others – `splits`. */
const money = (splits: Split[], over: Partial<Transaction> = {}) => tx('2026-10-10', zl(400), { kind: 'income', memberId: TATA, counterparty: 'PIOTR TESTOWY', inflowKind: 'repay', splits, ...over })
const flows = (ledger: ReturnType<typeof settleHousehold>, t: Transaction) =>
  Object.fromEntries((ledger.byTx.get(t.id) ?? []).map((f) => [f.memberId === MAMA ? 'Mama' : 'Tata', { repaid: f.repaid, advance: f.advance, income: f.income }]))

function settings(): Settings {
  const s = createDefaultSettings(AT).settings
  return {
    ...s,
    budget: { start: '2026-10-01', initial: { shields: zl(12640), hull: zl(15000), goals: {} } },
    layers: { ...s.layers, assumedCosts: zl(3650) },
    household: { ...s.household, since: null, members: [...s.household.members, ...MEMBERS] }
  }
}

function fleet(transactions: Transaction[], loans: Loan[] = []): FleetState {
  const state = computeFleet({
    settings: settings(),
    balances: [balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(27640) })],
    months: [monthPlanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, month: '2026-10', salary: zl(1000) })],
    loans,
    transactions,
    now: `${TODAY}T12:00:00+02:00`
  })
  // Every złoty in one layer; the deposit is the sum at the persons (AF-16).
  expect(layersSum(state)).toBe(state.total)
  expect(state.deposit).toBe(state.receivables.members.reduce((a, m) => a + m.deposit, 0))
  return state
}


describe('D102 krok 0: nadwyżka przelewu za dwie osoby – zapis panelu „Nadwyżka” czytany bez zmiany formatu', () => {
  // Mama owes 100 zł, Tata 150 zł; Tata sends 400 zł repaying both – a surplus of 150 zł.
  const mamaBuy = bought(100, MAMA)
  const tataBuy = bought(150, TATA)

  it('część Mamy = jej dług + jej część nadwyżki (75 zł zaliczką), reszta nadawcy jako przychód', () => {
    const t = money([line(MAMA, 175, { advance: true })])
    const ledger = settleHousehold([mamaBuy, tataBuy, t])
    expect(flows(ledger, t)).toEqual({ Mama: { repaid: zl(100), advance: zl(75), income: 0 }, Tata: { repaid: zl(150), advance: 0, income: zl(75) } })
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: 0, deposit: zl(75) })
    expect(balanceOf(ledger, TATA)).toMatchObject({ owed: 0, deposit: 0 })
    // Held by the members: both repayments and Mama's advance; Tata's 75 zł docks as income.
    expect(heldOf(ledger.byTx.get(t.id))).toBe(zl(325))
  })

  it('nadwyżka nadawcy jako zaliczka (jego wybór reszty) – Mama tylko swój dług', () => {
    const t = money([line(MAMA, 100)], { advance: true })
    const ledger = settleHousehold([mamaBuy, tataBuy, t])
    expect(flows(ledger, t)).toEqual({ Mama: { repaid: zl(100), advance: 0, income: 0 }, Tata: { repaid: zl(150), advance: zl(150), income: 0 } })
  })

  it('dwie linie Mamy (spłata i jawna zaliczka) w dowolnej kolejności – te same przepływy, bez meldunku „zaliczka przy długu”', () => {
    const repay = line(MAMA, 100)
    const ahead = line(MAMA, 75, { inflowKind: 'advance', advance: true })
    for (const splits of [[repay, ahead], [ahead, repay]]) {
      const t = money(splits)
      const ledger = settleHousehold([mamaBuy, tataBuy, t])
      expect(flows(ledger, t)).toEqual({ Mama: { repaid: zl(100), advance: zl(75), income: 0 }, Tata: { repaid: zl(150), advance: 0, income: zl(75) } })
      expect(skippedDebtsOf(ledger, ledger.members, {})).toEqual([])
    }
  })

  it('nadwyżka Taty spłaca pożyczkę udzieloną z Radaru (D100) – linia pożyczki, Tata bez przychodu; okręt się zgadza', () => {
    const loan = loanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, name: 'Pożyczka dla Mamy', direction: 'given', counterparty: 'MAMA', amount: zl(200), date: '2026-10-02' })
    const lent = tx('2026-10-02', -zl(200), { kind: 'loan', loanId: loan.id, counterparty: 'MAMA' })
    const t = money([line(MAMA, 175, { advance: true }), loanLine(75, loan.id)])
    const txs = [lent, mamaBuy, tataBuy, t]
    const ledger = settleHousehold(txs)
    expect(flows(ledger, t)).toEqual({ Mama: { repaid: zl(100), advance: zl(75), income: 0 }, Tata: { repaid: zl(150), advance: 0, income: 0 } })
    expect(loanState(loan, txs, [], TODAY)).toMatchObject({ paid: zl(75), open: zl(125) })
    const f = fleet(txs, [loan])
    expect(f.deposit).toBe(zl(75))
    expect(f.receivables.members.find((m) => m.memberId === MAMA)).toMatchObject({ owed: 0, deposit: zl(75) })
  })

  it('w okręcie: depozyt to zaliczka Mamy, oboje bez długu', () => {
    const f = fleet([mamaBuy, tataBuy, money([line(MAMA, 175, { advance: true })])])
    expect(f.deposit).toBe(zl(75))
    const at = (id: string) => f.receivables.members.find((m) => m.memberId === id)
    expect([at(MAMA)?.owed, at(MAMA)?.deposit, at(TATA)?.owed ?? 0, at(TATA)?.deposit ?? 0]).toEqual([0, zl(75), 0, 0])
  })
})
