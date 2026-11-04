import { describe, expect, it } from 'vitest'
import { computeFleet, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { balanceOf, balanceText, inflowPlanOf, purchaseOf, purchaseStatus, repayingAdvance, settleHousehold, skippedDebtsOf, skippedKey, type LedgerOptions } from '@shared/calc/household'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01KN2A00000000000000000${String(++seq).padStart(3, '0')}`
const GROCERIES = defaultCategoryId(1, 1)
const RTV = GROCERIES
const MAREK = `01KMEM${'0'.repeat(19)}3`
const TATA = `01KMEM${'0'.repeat(19)}2`
const member = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const bought = (date: string, amount: number, memberId: string, over: Partial<Transaction> = {}) => tx(date, -zl(amount), { categoryId: GROCERIES, refundable: true, memberId, counterparty: 'Sklep', ...over })
const paid = (date: string, amount: number, memberId: string, over: Partial<Transaction> = {}) => tx(date, zl(amount), { kind: 'income', memberId, counterparty: 'Marek', ...over })
/** An explicit advance for the future (1.15.3 – `inflowKind: 'advance'`, `advance: true` for an older version). */
const ahead = (date: string, amount: number, memberId: string, over: Partial<Transaction> = {}) => paid(date, amount, memberId, { inflowKind: 'advance', advance: true, ...over })
const EXPLICIT: LedgerOptions = { assignFrom: null }

function settings(assignFrom?: string | null): Settings {
  const s = createDefaultSettings(AT).settings
  return {
    ...s,
    budget: { start: '2026-10-01', initial: { shields: zl(12640), hull: zl(15000), goals: {} } },
    layers: { ...s.layers, assumedCosts: zl(3650) },
    household: { members: [...s.household.members, member(MAREK, 'Marek'), member(TATA, 'Tata', { inflow: 'income' })], ...(assignFrom !== undefined ? { assignFrom } : {}) }
  }
}

function fleet(transactions: Transaction[], assignFrom?: string | null): FleetState {
  const input: FleetInput = {
    settings: settings(assignFrom),
    balances: [balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(27640) })],
    months: [monthPlanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, month: '2026-10', salary: zl(4000) })],
    transactions,
    now: '2026-10-20T12:00:00+02:00'
  }
  const state = computeFleet(input)
  // Every złoty in one layer; the deposit is what the members hold – the sum at the persons (AF-16).
  expect(layersSum(state)).toBe(state.total)
  expect(state.deposit).toBe(state.receivables.members.reduce((a, m) => a + m.deposit, 0))
  return state
}

describe('AP-4 (AF-8): zapisana „zaliczka” ze wskazanym zakupem spłaca go – naprawa liczona przy odczycie', () => {
  // The persona's Marek (P.3, IM.23, MG sp. 6): tickets for 360 zł on his money, then his 360 zł saved by the option
  // „reszta jako zaliczka” of 1.15.3–1.15.5 as `inflowKind: 'advance'` though it names the tickets, then his part of a
  // shared purchase, 300 zł.
  const tickets = () => bought('2026-10-02', 360, MAREK, { counterparty: 'EVENTIM' })
  const shared = () => tx('2026-10-08', -zl(900), { counterparty: 'MEDIA EXPERT', splits: [{ id: nextId(), amount: -zl(600), categoryId: RTV, refundable: false, memberId: null, advance: false, note: '' }, { id: nextId(), amount: -zl(300), categoryId: RTV, refundable: true, memberId: MAREK, advance: false, note: '' }] })

  it('Marek 300 czy 360 zł: wpłata 360 zł wskazująca bilety spłaca je; jego część Media Expert 300 zł to dług od 08.10, depozyt 0', () => {
    for (const assignFrom of [null, undefined] as const) {
      const eventim = tickets()
      const money = ahead('2026-10-05', 360, MAREK, { covers: [eventim.id] })
      const media = shared()
      const s = fleet([eventim, money, media], assignFrom)
      // Before AP-4: „do oddania 360,00 zł – najstarszy zakup z 02.10”, 60 zł in the deposit seen nowhere.
      expect(balanceOf(s.household, MAREK)).toMatchObject({ owed: zl(300), deposit: 0, since: '2026-10-08', unassigned: [] })
      expect(s.deposit).toBe(0)
      expect(s.household.byTx.get(money.id)).toMatchObject([{ memberId: MAREK, repaid: zl(360), advance: 0, income: 0, unassigned: 0 }])
      expect(purchaseStatus(purchaseOf(s.household, eventim.id, MAREK)!)).toBe('paid')
      expect(s.household.skipped).toEqual([])
      // The same money as „spłata, reszta jako zaliczka” naming the tickets: the same ship.
      const asRepay = fleet([eventim, { ...money, inflowKind: 'repay' }, media], assignFrom)
      expect([s.shields.amount, s.hull.amount, s.deposit, s.receivables.house]).toEqual([asRepay.shields.amount, asRepay.hull.amount, asRepay.deposit, asRepay.receivables.house])
    }
  })

  it('pod wskazanym zakupem tylko on – nie najstarsze; nadwyżka to zaliczka, nic nie czeka na przypisanie', () => {
    const a = bought('2026-10-02', 100, MAREK)
    const b = bought('2026-10-03', 200, MAREK)
    const money = ahead('2026-10-06', 250, MAREK, { covers: [b.id] })
    // Before 1.12.0's day too (`assignFrom` absent): a plain repayment would take the oldest after the named one.
    for (const opts of [{}, EXPLICIT]) {
      const ledger = settleHousehold([a, b, money], opts)
      expect(balanceOf(ledger, MAREK)).toMatchObject({ owed: zl(100), deposit: zl(50), open: [{ txId: a.id, amount: zl(100) }], unassigned: [] })
      expect(ledger.byTx.get(money.id)).toMatchObject([{ repaid: zl(200), advance: zl(50), paidFor: [{ txId: b.id, amount: zl(200) }], unassigned: 0 }])
    }
  })

  it('zakup spłacony już wcześniejszą wpłatą „do przypisania”: wskazany spłaca go teraz ta zaliczka, wcześniejsza nie czeka', () => {
    const p = bought('2026-10-02', 100, MAREK)
    const repaidBlind = paid('2026-10-03', 100, MAREK)
    const money = ahead('2026-10-05', 100, MAREK, { covers: [p.id] })
    const ledger = settleHousehold([p, repaidBlind, money], EXPLICIT)
    // Before: the tickets open with the first transfer's 100 zł waiting to be assigned.
    expect(balanceOf(ledger, MAREK)).toMatchObject({ owed: 0, deposit: zl(100), open: [], unassigned: [] })
    expect(purchaseOf(ledger, p.id, MAREK)).toMatchObject({ paid: zl(100), by: [{ txId: money.id, amount: zl(100) }] })
    expect(ledger.byTx.get(money.id)).toMatchObject([{ repaid: 0, advance: zl(100) }])
  })

  it('wskazany późniejszy zakup (D94): zaliczka zarezerwowana na niego – zakup „oddany” tą wpłatą', () => {
    const money = ahead('2026-10-02', 300, MAREK)
    const later = bought('2026-10-06', 300, MAREK)
    const named = { ...money, covers: [later.id] }
    const ledger = settleHousehold([named, later], EXPLICIT)
    // Before: the purchase took the advance as any (status „z zaliczki”), its money named nowhere.
    expect(purchaseOf(ledger, later.id, MAREK)).toMatchObject({ lent: 0, fromDeposit: zl(300), by: [{ txId: money.id, amount: zl(300) }] })
    expect(purchaseStatus(purchaseOf(ledger, later.id, MAREK)!)).toBe('paid')
    expect(balanceOf(ledger, MAREK)).toMatchObject({ owed: 0, deposit: 0 })
  })

  it('niezależny przychód wskazujący zakup (wpis starszej wersji) też go spłaca; reszta – przychód', () => {
    const p = bought('2026-10-02', 100, TATA)
    const money = paid('2026-10-05', 150, TATA, { inflowKind: 'income', covers: [p.id] })
    const ledger = settleHousehold([p, money], EXPLICIT)
    expect(balanceOf(ledger, TATA)).toMatchObject({ owed: 0, deposit: 0, unassigned: [] })
    expect(ledger.byTx.get(money.id)).toMatchObject([{ repaid: zl(100), advance: 0, income: zl(50) }])
  })
})

describe('AP-4: jawna „zaliczka na przyszłość” bez wskazanego zakupu omija dług (D99 S4) – meldunek pyta', () => {
  it('Marek ma oddać 360 zł: 100 zł zaliczki do depozytu, dług bez zmian, wpłata na liście „nie spłaciła długu”', () => {
    const eventim = bought('2026-10-02', 360, MAREK, { counterparty: 'EVENTIM' })
    const money = ahead('2026-10-12', 100, MAREK)
    const s = fleet([eventim, money], null)
    expect(balanceOf(s.household, MAREK)).toMatchObject({ owed: zl(360), deposit: zl(100), since: '2026-10-02' })
    expect(s.household.skipped).toEqual([{ txId: money.id, memberId: MAREK, date: '2026-10-12', amount: zl(100), owed: zl(360) }])
  })

  it('bez długu w dniu wpłaty – nic do zgłoszenia; niezależny przychód nigdy', () => {
    const money = ahead('2026-10-02', 100, MAREK)
    const later = bought('2026-10-06', 300, MAREK)
    const income = paid('2026-10-07', 50, MAREK, { inflowKind: 'income' })
    expect(settleHousehold([money, later, income], EXPLICIT).skipped).toEqual([])
  })

  it('część „w tym za” jako zaliczka: osoba bez wskazanego zakupu na liście, nadawca spłaca swój wskazany', () => {
    const forMarek = bought('2026-10-02', 200, MAREK)
    const forTata = bought('2026-10-03', 100, TATA)
    const line = { id: nextId(), amount: zl(300), categoryId: null, refundable: false, memberId: TATA, advance: true, inflowKind: 'advance' as const, note: '' }
    const money = paid('2026-10-05', 500, MAREK, { advance: true, splits: [line], covers: [forMarek.id] })
    const ledger = settleHousehold([forMarek, forTata, money], EXPLICIT)
    expect(balanceOf(ledger, MAREK)).toMatchObject({ owed: 0, deposit: 0 })
    expect(balanceOf(ledger, TATA)).toMatchObject({ owed: zl(100), deposit: zl(300) })
    expect(ledger.skipped).toEqual([{ txId: money.id, memberId: TATA, date: '2026-10-05', amount: zl(300), owed: zl(100) }])
  })

  it('lista od startu rozliczeń: zaliczka sprzed dnia startu (saldo na start) nie wraca', () => {
    const eventim = bought('2026-10-02', 360, MAREK)
    const money = ahead('2026-10-03', 100, MAREK)
    const ledger = settleHousehold([eventim, money], { ...EXPLICIT, from: '2026-10-10', members: [{ id: MAREK, opening: { owed: zl(360), deposit: zl(100) } }] })
    expect(ledger.skipped).toEqual([])
    expect(settleHousehold([eventim, money], EXPLICIT).skipped).toHaveLength(1)
  })

  it('plan części: spłata najpierw, jawne rodzaje bez spłaty – chyba że wskazują zakupy', () => {
    expect(inflowPlanOf({ advance: true }, false)).toEqual({ repays: 'debt', rest: 'advance' })
    expect(inflowPlanOf({ advance: false, inflowKind: 'repay' }, true)).toEqual({ repays: 'debt', rest: 'income' })
    expect(inflowPlanOf({ advance: true, inflowKind: 'advance' }, false)).toEqual({ repays: 'none', rest: 'advance' })
    expect(inflowPlanOf({ advance: true, inflowKind: 'advance' }, true)).toEqual({ repays: 'named', rest: 'advance' })
    expect(inflowPlanOf({ advance: false, inflowKind: 'income' }, true)).toEqual({ repays: 'named', rest: 'income' })
  })
})

describe('AP-4: pomocnicze – meldunek, „Spłać”, saldo osoby (AF-16)', () => {
  it('przy osobie naraz dług i zaliczka; sama zaliczka, sam dług, nic', () => {
    const zl2 = (g: number) => (g / 100).toFixed(2)
    expect(balanceText({ owed: zl(360), deposit: zl(60) }, zl2)).toBe('ma oddać 360.00 zł · zaliczka 60.00 zł')
    expect(balanceText({ owed: 0, deposit: zl(60) }, zl2)).toBe('zaliczka 60.00 zł')
    expect(balanceText({ owed: zl(360), deposit: 0 }, zl2)).toBe('ma oddać 360.00 zł')
    expect(balanceText({ owed: 0, deposit: 0 }, zl2)).toBe('rozliczony')
  })

  it('meldunek: osoba, która ma oddać teraz – jej wpłaty po kolei (dwie części jednej operacji razem), bez zostawionych', () => {
    const skipped = [
      { txId: 'A', memberId: MAREK, date: '2026-10-05', amount: zl(100), owed: zl(360) },
      { txId: 'A', memberId: MAREK, date: '2026-10-05', amount: zl(20), owed: zl(360) },
      { txId: 'B', memberId: MAREK, date: '2026-10-09', amount: zl(50), owed: zl(360) },
      { txId: 'C', memberId: TATA, date: '2026-10-06', amount: zl(30), owed: zl(10) }
    ]
    const members = [{ memberId: MAREK, owed: zl(360) }, { memberId: TATA, owed: 0 }]
    expect(skippedDebtsOf({ skipped }, members, {})).toEqual([{ memberId: MAREK, owed: zl(360), items: [{ txId: 'A', date: '2026-10-05', amount: zl(120) }, { txId: 'B', date: '2026-10-09', amount: zl(50) }] }])
    expect(skippedDebtsOf({ skipped }, members, { [skippedKey({ txId: 'B', memberId: MAREK })]: AT })[0]!.items.map((i) => i.txId)).toEqual(['A'])
  })

  it('„Spłać”: część osoby (własna i linia podziału) jako „spłata, reszta jako zaliczka”; inne osoby i rodzaje bez zmian', () => {
    const own = ahead('2026-10-05', 100, MAREK)
    expect(repayingAdvance(own, MAREK)).toMatchObject({ inflowKind: 'repay', advance: true })
    expect(repayingAdvance(own, TATA)).toBe(own)
    const line = (memberId: string, inflowKind: 'advance' | 'income') => ({ id: nextId(), amount: zl(50), categoryId: null, refundable: false, memberId, advance: inflowKind === 'advance', inflowKind, note: '' })
    const split = paid('2026-10-05', 300, TATA, { inflowKind: 'income', splits: [line(MAREK, 'advance'), line(TATA, 'advance'), line(MAREK, 'income')] })
    const out = repayingAdvance(split, MAREK)
    expect(out.inflowKind).toBe('income')
    expect(out.splits.map((s) => [s.memberId, s.inflowKind, s.advance])).toEqual([
      [MAREK, 'repay', true],
      [TATA, 'advance', true],
      [MAREK, 'income', false]
    ])
  })
})
