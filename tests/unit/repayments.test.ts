import { describe, expect, it } from 'vitest'
import { computeFleet, householdBefore, type FleetInput } from '@shared/calc/fleet'
import { balanceOf, purchaseOf, purchaseStatus, repaidMarks, settleHousehold, type LedgerOptions } from '@shared/calc/household'
import { assignsOn, choicesForRepayment, coverFields, linkRepayments, matchCovers, matchReturn, names, proposeCovers, waitingForPurchase, withNamed } from '@shared/calc/repayments'
import { withKind } from '@shared/calc/kinds'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9R000000000000000000${String(++seq).padStart(3, '0')}`
const GROCERIES = defaultCategoryId(1, 1)
const MAMA = `01KMEM${'0'.repeat(19)}1`
const TATA = `01KMEM${'0'.repeat(19)}2`
const member = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'ask', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const bought = (date: string, amount: number, memberId: string, over: Partial<Transaction> = {}) => tx(date, -zl(amount), { categoryId: GROCERIES, refundable: true, memberId, counterparty: 'Biedronka', ...over })
const paid = (date: string, amount: number, memberId: string, over: Partial<Transaction> = {}) => tx(date, zl(amount), { kind: 'income', memberId, counterparty: 'Mama', ...over })
const EXPLICIT: LedgerOptions = { assignFrom: null }

function settings(assignFrom?: string | null): Settings {
  const s = createDefaultSettings(AT).settings
  return {
    ...s,
    budget: { start: '2026-10-01', initial: { shields: zl(12640), hull: zl(15000), goals: {} } },
    household: { members: [...s.household.members, member(MAMA, 'Mama', { inflow: 'advance' }), member(TATA, 'Tata', { inflow: 'income' })], ...(assignFrom !== undefined ? { assignFrom } : {}) }
  }
}
const input = (transactions: Transaction[], assignFrom?: string | null): FleetInput => ({
  settings: settings(assignFrom),
  balances: [balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(27640) })],
  months: [monthPlanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, month: '2026-10', salary: zl(4000) })],
  transactions,
  now: '2026-10-20T12:00:00+02:00'
})

describe('zwrot domownika przypisany do wydatku (1.12.0, D91)', () => {
  const a = bought('2026-10-02', 80, MAMA)
  const b = bought('2026-10-05', 50, MAMA)

  it('wpłata spłaca tylko wskazany zakup; reszta zakupów czeka, stan każdego zakupu z wpłatą', () => {
    const pay = paid('2026-10-10', 80, MAMA, { covers: [a.id] })
    const ledger = settleHousehold([a, b, pay], EXPLICIT)
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: zl(50), open: [{ txId: b.id, amount: zl(50) }], unassigned: [] })
    expect(ledger.byTx.get(pay.id)).toMatchObject([{ repaid: zl(80), paidFor: [{ txId: a.id, amount: zl(80) }], unassigned: 0 }])
    expect(purchaseOf(ledger, a.id)).toMatchObject({ lent: zl(80), paid: zl(80), by: [{ txId: pay.id, date: '2026-10-10', amount: zl(80) }] })
    expect(purchaseStatus(purchaseOf(ledger, a.id)!)).toBe('paid')
    expect(purchaseStatus(purchaseOf(ledger, b.id)!)).toBe('open')
  })

  it('bez wskazania: saldo maleje, żaden zakup nie jest oddany – pieniądze czekają na przypisanie (nie od najstarszego)', () => {
    const pay = paid('2026-10-10', 50, MAMA)
    const ledger = settleHousehold([a, b, pay], EXPLICIT)
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: zl(80), open: [{ txId: a.id, amount: zl(80) }, { txId: b.id, amount: zl(50) }], unassigned: [{ txId: pay.id, amount: zl(50) }] })
    expect(ledger.byTx.get(pay.id)).toMatchObject([{ repaid: zl(50), paidFor: [], unassigned: zl(50) }])
    // Before 1.12.0 (no day set) – the oldest first, as ever.
    expect(balanceOf(settleHousehold([a, b, pay]), MAMA)).toMatchObject({ owed: zl(80), open: [{ txId: a.id, amount: zl(30) }, { txId: b.id, amount: zl(50) }], unassigned: [] })
  })

  it('nadwyżka ponad wskazane: przy innych zakupach czeka na przypisanie, ponad całą należność – zaliczka (jak dotąd)', () => {
    const more = paid('2026-10-10', 100, MAMA, { covers: [a.id], advance: true })
    expect(balanceOf(settleHousehold([a, b, more], EXPLICIT), MAMA)).toMatchObject({ owed: zl(30), open: [{ txId: b.id, amount: zl(50) }], unassigned: [{ txId: more.id, amount: zl(20) }] })
    const all = paid('2026-10-10', 150, MAMA, { covers: [a.id, b.id], advance: true })
    const ledger = settleHousehold([a, b, all], EXPLICIT)
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: 0, deposit: zl(20), open: [], unassigned: [] })
    expect(ledger.byTx.get(all.id)).toMatchObject([{ repaid: zl(130), advance: zl(20) }])
  })

  it('zwrot czekający na przypisanie, potem wpłata za zakup już spłacony tą kwotą – przypisany, nadwyżka to zaliczka', () => {
    const first = paid('2026-10-08', 50, MAMA)
    const second = paid('2026-10-09', 80, MAMA, { covers: [a.id] })
    const third = paid('2026-10-12', 50, MAMA, { covers: [b.id], advance: true })
    const mid = settleHousehold([a, b, first, second], EXPLICIT)
    expect(balanceOf(mid, MAMA)).toMatchObject({ owed: 0, open: [{ txId: b.id, amount: zl(50) }], unassigned: [{ txId: first.id, amount: zl(50) }] })
    const end = settleHousehold([a, b, first, second, third], EXPLICIT)
    // The money as before 1.12.0: Mama owed nothing – her advance; the purchase is paid by the payment that names it.
    expect(balanceOf(end, MAMA)).toMatchObject({ owed: 0, deposit: zl(50), open: [], unassigned: [] })
    expect(end.byTx.get(third.id)).toMatchObject([{ repaid: 0, advance: zl(50), paidFor: [{ txId: b.id, amount: zl(50) }] }])
    expect(purchaseOf(end, b.id)).toMatchObject({ paid: zl(50), by: [{ txId: third.id }] })
  })

  it('dzień przejścia: wcześniejsze wpłaty od najstarszego, od niego tylko wskazane', () => {
    const old = paid('2026-10-06', 30, MAMA)
    const fresh = paid('2026-10-12', 20, MAMA)
    const ledger = settleHousehold([a, b, old, fresh], { assignFrom: '2026-10-10' })
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: zl(80), open: [{ txId: a.id, amount: zl(50) }, { txId: b.id, amount: zl(50) }], unassigned: [{ txId: fresh.id, amount: zl(20) }] })
    expect(assignsOn(undefined, '2026-10-12')).toBe(false)
    expect(assignsOn(null, '2020-01-01')).toBe(true)
    expect(assignsOn('2026-10-10', '2026-10-09')).toBe(false)
  })

  it('pośrednik: przelew Taty z częścią Mamy – każda część spłaca zakupy swojej osoby', () => {
    const tata = bought('2026-10-03', 40, TATA)
    const transfer = paid('2026-10-11', 120, TATA, {
      counterparty: 'Tata',
      covers: [a.id, tata.id],
      splits: [{ id: nextId(), amount: zl(80), categoryId: null, refundable: false, memberId: MAMA, advance: false, note: '' }]
    })
    const ledger = settleHousehold([a, b, tata, transfer], EXPLICIT)
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: zl(50), open: [{ txId: b.id }], unassigned: [] })
    expect(balanceOf(ledger, TATA)).toMatchObject({ owed: 0, open: [], unassigned: [] })
    expect(ledger.byTx.get(transfer.id)).toMatchObject([
      { memberId: MAMA, repaid: zl(80), paidFor: [{ txId: a.id }] },
      { memberId: TATA, repaid: zl(40), paidFor: [{ txId: tata.id }] }
    ])
  })

  it('zwrot towaru zakupu domownika spłaca wskazany zakup; zakup z zaliczki nie ma czego oddawać', () => {
    const back = tx('2026-10-08', zl(30), { categoryId: GROCERIES, refundable: true, memberId: MAMA, counterparty: 'Biedronka', covers: [b.id] })
    const ledger = settleHousehold([a, b, back], EXPLICIT)
    expect(purchaseOf(ledger, b.id)).toMatchObject({ paid: zl(30), by: [{ txId: back.id }] })
    expect(purchaseStatus(purchaseOf(ledger, b.id)!)).toBe('partial')
    expect(purchaseOf(ledger, a.id)?.paid).toBe(0)
    const advance = paid('2026-10-01', 100, MAMA, { advance: true })
    const fromDeposit = settleHousehold([advance, a], EXPLICIT)
    expect(purchaseOf(fromDeposit, a.id)).toMatchObject({ lent: 0, fromDeposit: zl(80) })
    expect(purchaseStatus(purchaseOf(fromDeposit, a.id)!)).toBe('deposit')
  })

  it('saldo na start rozliczeń to też „zakup” do wskazania', () => {
    const pay = paid('2026-10-12', 150, MAMA, { coversOpening: true })
    const ledger = settleHousehold([pay], { from: '2026-10-10', members: [{ id: MAMA, opening: { owed: zl(150), deposit: 0, since: '2026-09-20' } }], assignFrom: null })
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: 0, open: [], unassigned: [] })
    expect(purchaseOf(ledger, `opening:${MAMA}`)).toMatchObject({ lent: zl(150), paid: zl(150), date: '2026-09-20' })
  })

  it('pieniądze floty bez zmian: osłony, depozyt, energia i należności jak przy „od najstarszego”', () => {
    const txs = [a, b, paid('2026-10-08', 50, MAMA), paid('2026-10-09', 100, MAMA, { covers: [b.id] }), paid('2026-10-12', 40, TATA)]
    const fifo = computeFleet(input(txs))
    const named = computeFleet(input(txs, null))
    expect([named.shields.amount, named.deposit, named.energy, named.receivables.house, named.total]).toEqual([fifo.shields.amount, fifo.deposit, fifo.energy, fifo.receivables.house, fifo.total])
    expect(named.receivables.members.map((m) => [m.memberId, m.owed, m.deposit])).toEqual(fifo.receivables.members.map((m) => [m.memberId, m.owed, m.deposit]))
  })
})

describe('dopasowanie zwrotu do zakupów (1.12.0, D91)', () => {
  const item = (txId: string, date: string, amount: number) => ({ txId, date, amount: zl(amount) })

  it('kwota jednego zakupu, suma wszystkich, jedyny zestaw 2–3 z 90 dni; kilka możliwości – bez pewności', () => {
    const open = [item('A', '2026-10-02', 80), item('B', '2026-10-05', 50), item('C', '2026-10-06', 25)]
    expect(matchCovers(open, zl(80), '2026-10-10')).toEqual({ sure: ['A'], options: [] })
    expect(matchCovers(open, zl(155), '2026-10-10')).toEqual({ sure: ['A', 'B', 'C'], options: [] })
    expect(matchCovers(open, zl(75), '2026-10-10')).toEqual({ sure: ['B', 'C'], options: [] })
    expect(matchCovers(open, zl(130), '2026-10-10')).toEqual({ sure: ['A', 'B'], options: [] })
    expect(matchCovers(open, zl(10), '2026-10-10')).toEqual({ sure: null, options: [] })
    expect(matchCovers([...open, item('D', '2026-10-07', 80)], zl(80), '2026-10-10')).toEqual({ sure: null, options: [['A'], ['D']] })
    expect(matchCovers([item('A', '2026-10-02', 30), item('B', '2026-10-03', 20), item('C', '2026-10-04', 10), item('D', '2026-10-05', 40)], zl(50), '2026-10-10')).toEqual({
      sure: null,
      options: [
        ['A', 'B'],
        ['C', 'D']
      ]
    })
    // A set of purchases from beyond 90 days is never sure; a purchase after the payment is not taken.
    expect(matchCovers([item('A', '2026-05-01', 30), item('B', '2026-10-03', 20), item('C', '2026-10-04', 70)], zl(50), '2026-10-10')).toEqual({ sure: null, options: [] })
    expect(matchCovers([item('A', '2026-10-12', 80)], zl(80), '2026-10-10')).toEqual({ sure: null, options: [] })
  })

  it('zwrot towaru: jedyny otwarty zakup u tego kontrahenta, kilku – ten o tej kwocie', () => {
    const names: Record<string, string> = { A: 'Biedronka', B: 'Lidl', C: 'Biedronka', D: 'BIEDRONKA' }
    const of = (id: string) => ({ counterparty: names[id] ?? '' })
    expect(matchReturn([item('A', '2026-10-02', 80), item('B', '2026-10-05', 50)], zl(20), 'biedronka', of).sure).toEqual(['A'])
    expect(matchReturn([item('A', '2026-10-02', 80), item('C', '2026-10-05', 20)], zl(20), 'Biedronka', of).sure).toEqual(['C'])
    expect(matchReturn([item('A', '2026-10-02', 80), item('D', '2026-10-05', 50)], zl(20), 'Biedronka', of)).toEqual({ sure: null, options: [['D'], ['A']] })
    expect(matchReturn([item('B', '2026-10-05', 50)], zl(20), 'Biedronka', of).sure).toBeNull()
  })

  it('propozycja dla przelewu pośrednika i nowych operacji po kolei (import, szybki wpis)', () => {
    const a = bought('2026-10-02', 50, MAMA)
    const b = bought('2026-10-03', 30, MAMA)
    const tata = bought('2026-10-04', 40, TATA)
    const transfer = paid('2026-10-11', 120, TATA, { splits: [{ id: nextId(), amount: zl(80), categoryId: null, refundable: false, memberId: MAMA, advance: false, note: '' }] })
    const all = input([a, b, tata, transfer], null)
    expect(proposeCovers(transfer, householdBefore(all, transfer, '2026-10-20'), () => undefined)).toEqual({ covers: [a.id, b.id, tata.id], unsure: [] })

    // The second payment sees the first one's purchases paid: 30 finds nothing open any more.
    const p1 = paid('2026-10-08', 80, MAMA)
    const p2 = paid('2026-10-09', 30, MAMA)
    const linked = linkRepayments(input([a, b, p1, p2], null), new Set([p1.id, p2.id]), '2026-10-20')
    expect([...linked]).toEqual([[p1.id, { covers: [a.id, b.id] }]])
    // Before the day of `assignFrom`, or naming purchases already – nothing linked.
    expect(linkRepayments(input([a, b, p1], '2026-10-09'), new Set([p1.id]), '2026-10-20').size).toBe(0)
    expect(linkRepayments(input([a, b, { ...p1, covers: [b.id] }], null), new Set([p1.id]), '2026-10-20').size).toBe(0)
  })
})

describe('pola wskazania (D91)', () => {
  it('saldo na start osobno od id operacji', () => {
    const id = '01K9R00000000000000000ZZZZ'
    expect(coverFields([`opening:${MAMA}`, id])).toEqual({ covers: [id], coversOpening: true })
    expect(coverFields([id])).toEqual({ covers: [id] })
    expect(names({ covers: [id], coversOpening: true }, `opening:${TATA}`)).toBe(true)
    expect(names({ covers: [] }, `opening:${TATA}`)).toBe(false)
  })
})

describe('poprawki z przeglądu 1.12.0', () => {
  it('zakup przypisany później („Przypisz zwrot…”) bierze to, co zostało – nie odbiera wcześniej wskazanym', () => {
    const p = bought('2026-10-01', 100, MAMA)
    const q = bought('2026-10-05', 70, MAMA)
    const u = paid('2026-10-10', 100, MAMA, { covers: [q.id, p.id] })
    const ledger = settleHousehold([p, q, u], EXPLICIT)
    expect(purchaseOf(ledger, q.id)?.paid).toBe(zl(70))
    expect(purchaseOf(ledger, p.id)?.paid).toBe(zl(30))
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: zl(70), unassigned: [] })
  })

  it('„Wydatek” kliknięty jeszcze raz przy zwrocie towaru zostawia wskazany zakup', () => {
    const back = tx('2026-10-08', zl(30), { categoryId: GROCERIES, refundable: true, memberId: MAMA, covers: [nextId()], coversOpening: true })
    expect(withKind(back, 'expense')).toMatchObject({ covers: back.covers, coversOpening: true })
    expect(withKind(back, 'transfer')).toMatchObject({ covers: [], coversOpening: undefined })
  })

  it('najwyżej 500 wskazanych zakupów (więcej plik nie przechowa)', () => {
    const many = Array.from({ length: 501 }, (_, i) => ({ txId: `T${i}`, date: '2026-10-01', amount: 1 }))
    expect(matchCovers(many, 501, '2026-10-10').sure).toBeNull()
    expect(matchCovers(many.slice(0, 500), 500, '2026-10-10').sure).toHaveLength(500)
    const full = { covers: many.slice(0, 500).map((m) => m.txId) }
    expect(withNamed(full, 'X', true).covers).toHaveLength(500)
  })

  it('najstarszy zakup („since”) tylko przy długu: wszystko oddane bez wskazania – brak przypomnienia', () => {
    const a = bought('2026-09-01', 80, MAMA)
    const ledger = settleHousehold([a, paid('2026-10-10', 80, MAMA)], EXPLICIT)
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: 0, since: null, open: [{ txId: a.id }], unassigned: [{ amount: zl(80) }] })
    expect(ledger.since).toBeNull()
  })
})

describe('oznaczenia listy i pamięć rozliczeń (D91)', () => {
  it('oznaczenie zakupu: z jego osób najmniej oddane; z zaliczki – oddane; saldo na start bez oznaczenia', () => {
    const a = bought('2026-10-02', 80, MAMA)
    const both = tx('2026-10-03', -zl(60), {
      splits: [
        { id: nextId(), amount: -zl(30), categoryId: GROCERIES, refundable: true, memberId: MAMA, advance: false, note: '' },
        { id: nextId(), amount: -zl(30), categoryId: GROCERIES, refundable: true, memberId: TATA, advance: false, note: '' }
      ]
    })
    const pay = paid('2026-10-10', 110, MAMA, { covers: [a.id, both.id] })
    const ledger = settleHousehold([a, both, pay], { assignFrom: null, from: '2026-10-01', members: [{ id: TATA, opening: { owed: zl(10), deposit: 0 } }] })
    const marks = repaidMarks(ledger.purchases)
    expect(marks.get(a.id)).toBe('repaid')
    // Mama's line paid, Tata's not – the purchase is still owed.
    expect(marks.get(both.id)).toBe('owed')
    expect([...marks.keys()].some((k) => k.startsWith('opening:'))).toBe(false)
    expect(repaidMarks(ledger.purchases)).toBe(marks)
    expect(repaidMarks(settleHousehold([paid('2026-10-01', 100, MAMA, { advance: true }), a], EXPLICIT).purchases).get(a.id)).toBe('repaid')
    const half = paid('2026-10-10', 40, MAMA, { covers: [a.id] })
    expect(repaidMarks(settleHousehold([a, half], EXPLICIT).purchases).get(a.id)).toBe('partlyRepaid')
  })

  it('ta sama lista operacji, inny dzień przejścia – inne rozliczenie (pamięć po nim)', () => {
    const a = bought('2026-10-02', 80, MAMA)
    const list = [a, paid('2026-10-10', 30, MAMA)]
    expect(balanceOf(settleHousehold(list, EXPLICIT), MAMA).unassigned).toHaveLength(1)
    expect(balanceOf(settleHousehold(list), MAMA).unassigned).toHaveLength(0)
    expect(balanceOf(settleHousehold(list, { assignFrom: '2026-10-11' }), MAMA).unassigned).toHaveLength(0)
  })
})

describe('wcześniejsza wpłata finansuje późniejszy zakup (1.15.1)', () => {
  it('wpłata wskazująca późniejszy zakup rezerwuje zaliczkę, zakup z niej korzysta i ma stan oddany', () => {
    const p = bought('2026-10-10', 80, MAMA)
    const pay = paid('2026-10-05', 100, MAMA, { covers: [p.id] })
    const ledger = settleHousehold([pay, p], EXPLICIT)
    expect(ledger.byTx.get(pay.id)).toMatchObject([{ repaid: 0, advance: zl(80), income: zl(20), paidFor: [{ txId: p.id, amount: zl(80) }] }])
    expect(purchaseOf(ledger, p.id)).toMatchObject({ lent: 0, fromDeposit: zl(80), paid: 0, by: [{ txId: pay.id, amount: zl(80) }] })
    expect(purchaseStatus(purchaseOf(ledger, p.id)!)).toBe('paid')
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: 0, deposit: 0, open: [], unassigned: [] })
  })

  it('częściowe sfinansowanie wcześniejszą wpłatą: resztę pożyczają osłony, status partial', () => {
    const p = bought('2026-10-10', 80, MAMA)
    const pay = paid('2026-10-05', 50, MAMA, { covers: [p.id] })
    const ledger = settleHousehold([pay, p], EXPLICIT)
    expect(ledger.byTx.get(pay.id)).toMatchObject([{ repaid: 0, advance: zl(50), income: 0, paidFor: [{ txId: p.id, amount: zl(50) }] }])
    expect(purchaseOf(ledger, p.id)).toMatchObject({ lent: zl(30), fromDeposit: zl(50), paid: 0, by: [{ txId: pay.id, amount: zl(50) }] })
    expect(purchaseStatus(purchaseOf(ledger, p.id)!)).toBe('partial')
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: zl(30), deposit: 0, open: [{ txId: p.id, amount: zl(30) }] })

    const later = paid('2026-10-12', 30, MAMA, { covers: [p.id] })
    const full = settleHousehold([pay, p, later], EXPLICIT)
    expect(purchaseOf(full, p.id)).toMatchObject({ lent: zl(30), fromDeposit: zl(50), paid: zl(30), by: [{ txId: pay.id, amount: zl(50) }, { txId: later.id, amount: zl(30) }] })
    expect(purchaseStatus(purchaseOf(full, p.id)!)).toBe('paid')
    expect(balanceOf(full, MAMA)).toMatchObject({ owed: 0, deposit: 0, open: [] })
  })

  it('niepowiązany zakup pośredni nie podkrada celowej zaliczki', () => {
    const target = bought('2026-10-10', 80, MAMA)
    const intermediate = bought('2026-10-07', 50, MAMA)
    const pay = paid('2026-10-05', 80, MAMA, { covers: [target.id] })
    const ledger = settleHousehold([pay, intermediate, target], EXPLICIT)
    expect(purchaseOf(ledger, intermediate.id)).toMatchObject({ lent: zl(50), fromDeposit: 0 })
    expect(purchaseStatus(purchaseOf(ledger, intermediate.id)!)).toBe('open')
    expect(purchaseOf(ledger, target.id)).toMatchObject({ lent: 0, fromDeposit: zl(80), by: [{ txId: pay.id, amount: zl(80) }] })
    expect(purchaseStatus(purchaseOf(ledger, target.id)!)).toBe('paid')
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: zl(50), deposit: 0, open: [{ txId: intermediate.id, amount: zl(50) }] })
  })

  it('choicesForRepayment oferuje późniejsze zakupy domownika w edytorze wcześniejszej wpłaty', () => {
    const p1 = bought('2026-10-10', 80, MAMA)
    const p2 = bought('2026-10-12', 40, TATA)
    const pay = paid('2026-10-05', 100, MAMA)
    const all = input([pay, p1, p2], null)
    const before = householdBefore(all, pay, '2026-10-20')
    const full = settleHousehold([pay, p1, p2], EXPLICIT)
    const choices = choicesForRepayment(before, full, pay, MAMA)
    expect(choices).toEqual([{ txId: p1.id, date: '2026-10-10', amount: zl(80) }])
  })

  it('waitingForPurchase oferuje wcześniejszą wpłatę w edytorze późniejszego zakupu („Przypisz zwrot…”)', () => {
    const p = bought('2026-10-10', 80, MAMA)
    const pay = paid('2026-10-05', 100, MAMA)
    const full = settleHousehold([pay, p], EXPLICIT)
    const ps = purchaseOf(full, p.id)!
    const txOf = (id: string) => (id === pay.id ? pay : id === p.id ? p : undefined)
    const waiting = waitingForPurchase(full, p, ps, txOf)
    expect(waiting).toEqual([{ txId: pay.id, date: '2026-10-05', amount: zl(100) }])
  })
})
