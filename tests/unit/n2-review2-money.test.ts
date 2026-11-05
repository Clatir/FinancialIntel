/**
 * Review 2 of N2 (1.15.6, the money engine): what „Spłać” repays (1), the income statistics against the engine – a part
 * of a loan unknown or taken, the excess of a loan's repayment (4, AF-5), a repayment inside an account's opening balance
 * (5), the borrower of a loan without a name (6), a copy's repayers (7), „Do zadokowania” without a loan's part (8) – each
 * failing before its fix, on concrete grosze.
 */
import { describe, expect, it } from 'vitest'
import { computeFleet, layersSum, type FleetInput, type FleetState, type PendingPair } from '@shared/calc/fleet'
import { balanceOf, settleHousehold, skippedDebtsOf, type HouseholdLedger, type LedgerOptions } from '@shared/calc/household'
import { incomeByMonth, incomeParts } from '@shared/calc/income'
import { loanPayers, loanState } from '@shared/calc/loans'
import { repayingAdvancesOf } from '@shared/calc/repayments'
import { deliveryWhy } from '@shared/calc/why'
import { createDefaultSettings } from '@shared/defaults'
import { dropsCovers, takeUserData } from '@shared/import/copies'
import {
  balanceSchema,
  CASH_ACCOUNT_ID,
  defaultCategoryId,
  loanSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
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
const nextId = () => `01KN2R2${String(++seq).padStart(19, '0')}`
const GROCERIES = defaultCategoryId(1, 1)
const MAREK = `01KMEM${'0'.repeat(19)}3`
const MAMA = `01KMEM${'0'.repeat(19)}4`
const member = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const MEMBERS = [member(MAREK, 'Marek', { bankNames: ['MAREK TESTOWY'] }), member(MAMA, 'Mama', { bankNames: ['ANNA NOWAK'] })]
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const bought = (date: string, amount: number, memberId = MAREK) => tx(date, -zl(amount), { categoryId: GROCERIES, refundable: true, memberId, counterparty: 'Sklep' })
/** A member's money: „spłata, reszta jako przychód” unless said otherwise. */
const paid = (date: string, amount: number, over: Partial<Transaction> = {}) => tx(date, zl(amount), { kind: 'income', memberId: MAREK, counterparty: 'MAREK TESTOWY', inflowKind: 'repay', ...over })
/** An explicit advance for the future (1.15.3 – saved by „reszta jako zaliczka” of 1.15.3–1.15.5 too). */
const ahead = (date: string, amount: number) => tx(date, zl(amount), { kind: 'income', memberId: MAREK, counterparty: 'MAREK TESTOWY', inflowKind: 'advance', advance: true })
const loan = (over: Partial<Loan> = {}): Loan =>
  loanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, name: 'Pożyczka dla Jana', direction: 'given', counterparty: 'JAN KOWALSKI', amount: zl(1000), date: '2026-09-01', ...over })
const loanLine = (amount: number, loanId: string): Split => ({ id: nextId(), amount: zl(amount), categoryId: null, refundable: false, memberId: null, advance: false, loanId, note: '' })
const opening = (date: string, amount: number, accountId = MBANK_ACCOUNT_ID) => balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId, kind: 'opening', amount })

function settings(): Settings {
  const s = createDefaultSettings(AT).settings
  // The shields full from the start (3 salaries of 1 000 zł < 12 640 zł): income docks into the hull, a loan's money back
  // goes to the shields – the two told apart. Purchases paid back as named (D91) from the start.
  return {
    ...s,
    budget: { start: '2026-10-01', initial: { shields: zl(12640), hull: zl(15000), goals: {} } },
    layers: { ...s.layers, assumedCosts: zl(3650) },
    household: { ...s.household, since: null, assignFrom: null, members: [...s.household.members, ...MEMBERS] }
  }
}

function inputOf(transactions: Transaction[], o: { loans?: Loan[]; balances?: FleetInput['balances']; pendingPairs?: Map<string, PendingPair> } = {}): FleetInput {
  return {
    settings: settings(),
    balances: o.balances ?? [opening('2026-10-01', zl(27640))],
    months: [monthPlanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, month: '2026-10', salary: zl(1000) })],
    loans: o.loans ?? [],
    transactions,
    pendingPairs: o.pendingPairs,
    now: `${TODAY}T12:00:00+02:00`
  }
}

function fleet(transactions: Transaction[], o: Parameters<typeof inputOf>[1] = {}): FleetState {
  const state = computeFleet(inputOf(transactions, o))
  expect(layersSum(state)).toBe(state.total)
  expect(state.deposit).toBe(state.receivables.members.reduce((a, m) => a + m.deposit, 0))
  return state
}
const movesOf = (f: FleetState, t: Transaction) => f.log.find((e) => e.txId === t.id)!.moves
const EXPLICIT: LedgerOptions = { assignFrom: null }
const ledgerOf = (transactions: Transaction[]): HouseholdLedger => settleHousehold(transactions, EXPLICIT)
const reportOf = (l: HouseholdLedger) => skippedDebtsOf(l, l.members, {})
const flowOf = (l: HouseholdLedger, t: Transaction) => l.byTx.get(t.id)!.find((f) => f.memberId === MAREK)!

describe('1: „Spłać” spłaca tylko to, co z długu jest nadal do oddania przez tę zaliczkę – nigdy nie rozlicza historii od nowa', () => {
  it('dług spłacony później inną wpłatą, zaliczka zużyta na późniejszy zakup: bez meldunku i bez zmiany (dług zostaje 50 zł)', () => {
    // Marek owes 100 zł; his 100 zł as an advance for the future skips it; his 100 zł repayment pays it back; a purchase of
    // 150 zł takes the advance's 100 zł, 50 zł is lent – he owes 50 zł for that purchase, not because of the advance.
    const p0 = bought('2026-10-02', 100)
    const a = ahead('2026-10-03', 100)
    const r = paid('2026-10-05', 100, { covers: [p0.id] })
    const p1 = bought('2026-10-10', 150)
    const txs = [p0, a, r, p1]
    const l = ledgerOf(txs)
    expect(balanceOf(l, MAREK)).toMatchObject({ owed: zl(50), deposit: 0 })
    expect(l.skipped.map((s) => s.txId)).toEqual([a.id])
    // Before: „wpłata … nie spłaciła długu (03.10 100 zł) – ma oddać 50 zł. Spłacić?” – and „Spłać” made the advance pay
    // the debt of 03.10, the repayment found nothing owed (100 zł income), the purchase all lent: debt 50 → 150 zł.
    expect(reportOf(l)).toEqual([])
    expect(repayingAdvancesOf(inputOf(txs), MAREK, {}, TODAY)).toEqual([])
  })

  it('zaliczka zużyta na późniejszy zakup (bez późniejszej spłaty): bez meldunku – „Spłać” nic by nie obniżyło', () => {
    const p0 = bought('2026-10-02', 100)
    const a = ahead('2026-10-03', 100)
    const p1 = bought('2026-10-10', 150)
    const l = ledgerOf([p0, a, p1])
    expect(balanceOf(l, MAREK)).toMatchObject({ owed: zl(150), deposit: 0 })
    expect(reportOf(l)).toEqual([])
  })

  it('część długu spłacona później (60 z 100 zł): meldunek i „Spłać” na 40 zł – linia „spłata” 40 zł, reszta zaliczką; późniejsza spłata bez zmian', () => {
    const p0 = bought('2026-10-02', 100)
    const a = ahead('2026-10-03', 100)
    const r = paid('2026-10-05', 60, { covers: [p0.id] })
    const txs = [p0, a, r]
    const l = ledgerOf(txs)
    expect(balanceOf(l, MAREK)).toMatchObject({ owed: zl(40), deposit: zl(100) })
    expect(reportOf(l)).toMatchObject([{ memberId: MAREK, owed: zl(40), repays: zl(40), items: [{ txId: a.id, date: '2026-10-03', amount: zl(100), repays: zl(40) }] }])
    const changed = repayingAdvancesOf(inputOf(txs), MAREK, {}, TODAY)
    expect(changed.map((t) => t.id)).toEqual([a.id])
    const after = changed[0]!
    // A part of the advance: a line „spłata” of 40 zł, the rest still its advance; nothing named (a later repayment paid
    // that debt too – its money waits to be assigned, D91 a).
    expect(after).toMatchObject({ inflowKind: 'advance', advance: true, covers: [] })
    expect(after.splits.map((s) => [s.memberId, s.amount, s.inflowKind, s.advance])).toEqual([[MAREK, zl(40), 'repay', true]])
    const now = ledgerOf([p0, after, r])
    expect(balanceOf(now, MAREK)).toMatchObject({ owed: 0, deposit: zl(60) })
    // The later repayment as it was (before: it found nothing owed – 60 zł income, the deposit 0).
    expect(flowOf(now, r)).toMatchObject({ repaid: zl(60), income: 0, advance: 0 })
    expect(reportOf(now)).toEqual([])
    // Assigned later (the inbox's „Przypisz”): the purchase named is the part „spłata”'s – the rest stays the advance.
    const assigned = ledgerOf([p0, { ...after, covers: [p0.id] }, r])
    expect(balanceOf(assigned, MAREK)).toMatchObject({ owed: 0, deposit: zl(60), unassigned: [] })
    expect(flowOf(assigned, r)).toMatchObject({ repaid: zl(60), income: 0 })
  })

  it('dwie zaliczki przy jednym długu: po kolei – druga nie spłaca tego, co spłaci pierwsza', () => {
    const p0 = bought('2026-10-02', 100)
    const a1 = ahead('2026-10-03', 100)
    const a2 = ahead('2026-10-04', 100)
    const r = paid('2026-10-05', 50, { covers: [p0.id] })
    const txs = [p0, a1, a2, r]
    expect(reportOf(ledgerOf(txs))).toMatchObject([{ memberId: MAREK, owed: zl(50), repays: zl(50), items: [{ txId: a1.id, repays: zl(50) }] }])
    const changed = repayingAdvancesOf(inputOf(txs), MAREK, {}, TODAY)
    expect(changed.map((t) => t.id)).toEqual([a1.id])
    const now = ledgerOf(txs.map((t) => changed.find((c) => c.id === t.id) ?? t))
    expect(balanceOf(now, MAREK)).toMatchObject({ owed: 0, deposit: zl(150) })
    expect(flowOf(now, r)).toMatchObject({ repaid: zl(50), income: 0 })
  })

  it('część „w tym za Marek” jako zaliczka i własna zaliczka obok części innej osoby: rozbite tylko o kwotę do spłaty', () => {
    const p0 = bought('2026-10-02', 100)
    const line = (memberId: string, amount: number, inflowKind: 'advance' | 'repay'): Split => ({ id: nextId(), amount: zl(amount), categoryId: null, refundable: false, memberId, advance: true, inflowKind, note: '' })
    // Mama's transfer carrying Marek's 300 zł as his advance for the future.
    const viaMama = tx('2026-10-03', zl(500), { kind: 'income', memberId: MAMA, counterparty: 'ANNA NOWAK', inflowKind: 'repay', splits: [line(MAREK, 300, 'advance')] })
    const r = paid('2026-10-05', 50, { covers: [p0.id] })
    const changed = repayingAdvancesOf(inputOf([p0, viaMama, r]), MAREK, {}, TODAY)
    expect(changed[0]!.splits.map((s) => [s.memberId, s.amount, s.inflowKind])).toEqual([
      [MAREK, zl(50), 'repay'],
      [MAREK, zl(250), 'advance']
    ])
    const now = ledgerOf([p0, changed[0]!, r])
    expect(balanceOf(now, MAREK)).toMatchObject({ owed: 0, deposit: zl(250) })
    expect(flowOf(now, r)).toMatchObject({ repaid: zl(50), income: 0 })
    // His own advance beside Mama's part: a line „spłata” of what is left to repay, after hers; the rest still his advance.
    const own = tx('2026-10-03', zl(300), { kind: 'income', memberId: MAREK, counterparty: 'MAREK TESTOWY', inflowKind: 'advance', advance: true, splits: [line(MAMA, 100, 'repay')] })
    const mine = repayingAdvancesOf(inputOf([p0, own, r]), MAREK, {}, TODAY)[0]!
    expect([mine.inflowKind, mine.splits.map((s) => [s.memberId, s.amount, s.inflowKind])]).toEqual([
      'advance',
      [
        [MAMA, zl(100), 'repay'],
        [MAREK, zl(50), 'repay']
      ]
    ])
    expect(balanceOf(ledgerOf([p0, mine, r]), MAREK)).toMatchObject({ owed: 0, deposit: zl(150) })
  })

  it('warstwy: „Spłać” zmienia tylko depozyt i osłony o spłaconą kwotę – nic nie dokuje jako przychód', () => {
    const p0 = bought('2026-10-02', 100)
    const a = ahead('2026-10-03', 100)
    const r = paid('2026-10-05', 60, { covers: [p0.id] })
    const before = fleet([p0, a, r])
    const after = fleet([p0, repayingAdvancesOf(inputOf([p0, a, r]), MAREK, {}, TODAY)[0]!, r])
    expect([after.deposit - before.deposit, after.shields.amount - before.shields.amount, after.hull.amount - before.hull.amount]).toEqual([-zl(40), zl(40), 0])
  })
})

describe('4 / AF-5: statystyki przychodów = silnik – część pożyczki nieznanej lub wziętej i nadwyżka spłaty ponad dług to przychód (T70)', () => {
  it('linia 300 zł pożyczki, której nie ma (usunięta, zabrana przez scalenie): silnik dokuje 1 000 zł – przychody też 1 000 zł', () => {
    const money = tx('2026-10-10', zl(1000), { kind: 'income', counterparty: 'PRACA', splits: [loanLine(300, nextId())] })
    const f = fleet([money])
    expect(movesOf(f, money)).toEqual({ shields: 0, hull: zl(1000) })
    // Before: 700 zł – the statistics took off every loan's part.
    expect(incomeParts(money, f.incomeContext).work).toBe(zl(1000))
  })

  it('linia pożyczki wziętej – przychód (jak w silniku)', () => {
    const taken = loan({ direction: 'taken', amount: zl(5000) })
    const money = tx('2026-10-10', zl(300), { kind: 'income', counterparty: 'BANK', splits: [loanLine(300, taken.id)] })
    const f = fleet([money], { loans: [taken] })
    expect(incomeParts(money, f.incomeContext).work).toBe(zl(300))
  })

  it('spłata ponad dług (odsetki) całą wpłatą i częścią wpłaty: nadwyżka 200 zł to przychód – w statystykach jak w warstwach', () => {
    const jan = loan()
    const first = tx('2026-10-05', zl(900), { kind: 'loan', loanId: jan.id, counterparty: 'JAN KOWALSKI' })
    for (const more of [
      tx('2026-10-10', zl(300), { kind: 'loan', loanId: jan.id, counterparty: 'JAN KOWALSKI' }),
      tx('2026-10-10', zl(500), { kind: 'income', counterparty: 'EWA KOWALSKA', splits: [loanLine(300, jan.id)] })
    ]) {
      const f = fleet([first, more], { loans: [jan] })
      const rest = more.kind === 'income' ? zl(200) : 0
      // 100 zł back to the shields, the excess 200 zł docked (the hull) with the inflow's rest.
      expect(movesOf(f, more)).toEqual({ loans: { [jan.id]: -zl(100) }, shields: zl(100), hull: zl(200) + rest })
      // Before: 0 zł / 200 zł – a loan's repayment never income, its excess neither.
      expect(incomeParts(more, f.incomeContext).work).toBe(zl(200) + rest)
      expect(incomeParts(first, f.incomeContext).work).toBe(0)
      expect(incomeByMonth([first, more], f.incomeContext).get('2026-10')?.work).toBe(zl(200) + rest)
    }
  })

  it('nadwyżka spłaty sprzed startu budżetu też jest przychodem w statystykach (historia)', () => {
    const jan = loan({ date: '2026-08-01' })
    const before = tx('2026-09-10', zl(1200), { kind: 'loan', loanId: jan.id, counterparty: 'JAN KOWALSKI' })
    const f = fleet([before], { loans: [jan] })
    expect(incomeParts(before, f.incomeContext).work).toBe(zl(200))
  })
})

describe('5: spłata pożyczki w saldzie otwarcia konta (po starcie budżetu) liczy się do długu – jak na Radarze', () => {
  it('pożyczka 1 000 zł; część 600 zł na koncie, którego saldo otwarcia jest późniejsze, potem 600 zł: 400 zł do osłon, 200 zł nadwyżki dokuje', () => {
    const jan = loan()
    const inside = tx('2026-10-05', zl(600), { kind: 'income', accountId: CASH_ACCOUNT_ID, counterparty: 'JAN KOWALSKI', splits: [loanLine(600, jan.id)] })
    const later = tx('2026-10-12', zl(600), { kind: 'income', counterparty: 'JAN KOWALSKI', splits: [loanLine(600, jan.id)] })
    const balances = [opening('2026-10-01', zl(27640)), opening('2026-10-08', zl(600), CASH_ACCOUNT_ID)]
    const f = fleet([inside, later], { loans: [jan], balances })
    expect(f.loans.find((l) => l.loan.id === jan.id)).toMatchObject({ paid: zl(1200), open: 0 })
    // Before: the part inside the cash's opening balance was missing – all 600 zł back to the shields, nothing docked.
    expect(movesOf(f, later)).toEqual({ loans: { [jan.id]: -zl(400) }, shields: zl(400), hull: zl(200) })
    expect(f.receivables.loans).toEqual({})
  })

  it('kolejność dni: spłata w biegu przed tą w saldzie otwarcia wraca do osłon cała, nadwyżka jest tej późniejszej', () => {
    const jan = loan()
    const counted = tx('2026-10-04', zl(600), { kind: 'loan', loanId: jan.id, counterparty: 'JAN KOWALSKI' })
    const inside = tx('2026-10-05', zl(600), { kind: 'loan', loanId: jan.id, accountId: CASH_ACCOUNT_ID, counterparty: 'JAN KOWALSKI' })
    const balances = [opening('2026-10-01', zl(27640)), opening('2026-10-08', zl(600), CASH_ACCOUNT_ID)]
    const f = fleet([counted, inside], { loans: [jan], balances })
    expect(movesOf(f, counted)).toEqual({ loans: { [jan.id]: -zl(600) }, shields: zl(600) })
    // Not run (the cash's opening balance holds it), but its excess is income of the history.
    expect(f.log.some((e) => e.txId === inside.id)).toBe(false)
    expect(incomeParts(inside, f.incomeContext).work).toBe(zl(200))
  })
})

describe('6: pożyczkobiorca pożyczki bez kontrahenta – jej własne spłaty są jego („kto zapłacił” tylko przy kimś innym)', () => {
  const jan = loan({ counterparty: '' })
  const lent = tx('2026-09-01', -zl(1000), { kind: 'loan', loanId: jan.id })
  // The Radar's „Spłata otrzymana” (`recordPayment`) copies the loan's counterparty – none here.
  const radar = tx('2026-10-05', zl(300), { kind: 'loan', loanId: jan.id, counterparty: '', title: 'Spłata: Pożyczka dla Jana' })
  const bank = tx('2026-10-08', zl(200), { kind: 'loan', loanId: jan.id, counterparty: 'JAN KOWALSKI' })

  it('spłata z Radaru i „Zwrot pożyczki” z banku – pożyczkobiorca; bez linii „kto zapłacił”', () => {
    const payers = loanPayers(loanState(jan, [lent, radar, bank], [], TODAY), MEMBERS)
    // Before: {bez nazwy, borrower: false}, {JAN KOWALSKI, borrower: false} – „kto zapłacił: bez nazwy 300 zł · …”.
    expect(payers.map((p) => [p.name, p.amount, p.borrower])).toEqual([
      ['pożyczkobiorca', zl(300), true],
      ['JAN KOWALSKI', zl(200), true]
    ])
  })

  it('część wpłaty innej osoby (D100) – ktoś inny niż pożyczkobiorca', () => {
    const mama = tx('2026-10-10', zl(500), { kind: 'income', memberId: MAMA, counterparty: 'ANNA NOWAK', splits: [loanLine(150, jan.id)] })
    const payers = loanPayers(loanState(jan, [lent, radar, mama], [], TODAY), MEMBERS)
    expect(payers.map((p) => [p.name, p.amount, p.borrower])).toEqual([
      ['pożyczkobiorca', zl(300), true],
      ['Mama', zl(150), false]
    ])
  })

  it('pożyczka z kontrahentem: spłata z Radaru bez zmian (jego nazwa), obca nazwa – ktoś inny', () => {
    const named = loan()
    const own = tx('2026-10-05', zl(300), { kind: 'loan', loanId: named.id, counterparty: 'JAN KOWALSKI' })
    const other = tx('2026-10-06', zl(100), { kind: 'loan', loanId: named.id, counterparty: 'EWA KOWALSKA' })
    expect(loanPayers(loanState(named, [own, other], [], TODAY), MEMBERS).map((p) => p.borrower)).toEqual([true, false])
  })
})

describe('7: kopia z jawną zaliczką, która wskazuje zakup, spłaca go (AP-4) – jej usunięcie nie może po cichu zabrać spłaty', () => {
  it('kopia 1.15.3–1.15.5 „zaliczka” + wskazany zakup; operacja tutaj – zwykły wpływ: usunięcie gubi spłatę (zaznaczone)', () => {
    const p = bought('2026-10-02', 100)
    const copy = { ...ahead('2026-10-03', 100), covers: [p.id] }
    // The ledger: the copy pays the purchase back (AP-4 – `named`).
    expect(flowOf(ledgerOf([p, copy]), copy)).toMatchObject({ repaid: zl(100) })
    const keep = tx('2026-10-03', zl(100), { kind: 'income', counterparty: 'MAREK TESTOWY', accountId: CASH_ACCOUNT_ID })
    // Before: false – the copy's explicit advance „repaid nobody”, the removal not flagged, the purchase owed again.
    expect(dropsCovers(keep, copy)).toBe(true)
  })

  it('ta sama zaliczka tutaj przejmuje wskazany zakup kopii – nic nie ginie; spłata kopii nie przechodzi na jawny przychód tutaj', () => {
    const p = bought('2026-10-02', 100)
    const copy = { ...ahead('2026-10-03', 100), covers: [p.id] }
    const same = { ...ahead('2026-10-03', 100), accountId: CASH_ACCOUNT_ID }
    expect([dropsCovers(same, copy), takeUserData(same, [copy], AT).covers]).toEqual([false, [p.id]])
    // The copy's money a repayment, the kept one's an explicit independent income: removed, it would repay them only against
    // what it says – flagged, the user decides (T333).
    const repaying = { ...paid('2026-10-03', 100), covers: [p.id] }
    const income = { ...paid('2026-10-03', 100), inflowKind: 'income' as const, accountId: CASH_ACCOUNT_ID }
    expect(dropsCovers(income, repaying)).toBe(true)
  })
})

describe('8: „Do zadokowania” – wpływ bez części, która spłaca pożyczkę (silnik dokuje tylko resztę)', () => {
  it('wpływ 1 000 zł na Portfelu XTB w parze z wpisem ICTTJ, w tym 200 zł spłaty pożyczki: do zadokowania 800 zł', () => {
    const jan = loan()
    const t = tx('2026-10-10', zl(1000), { kind: 'income', accountId: XTB_WALLET_ACCOUNT_ID, counterparty: 'XTB', splits: [loanLine(200, jan.id)] })
    const f = fleet([t], { loans: [jan], pendingPairs: new Map([[t.id, { pool: 'current', entryDate: '2026-10-09' }]]) })
    expect(movesOf(f, t)).toMatchObject({ loans: { [jan.id]: -zl(200) } })
    // Before: 1 000 zł – the loan's 200 zł back to the shields counted as the pool's too.
    expect(f.toDock).toMatchObject({ count: 1, inflow: zl(800) })
    // The pool's 800 zł – the hull (full shields); the loan's 200 zł back to the shields.
    expect(movesOf(f, t)).toMatchObject({ hull: zl(800), shields: zl(200) })
    // A pair waiting is no „ostatnia dostawa – dokąd poszła?” (AP-26, T437 – only after the docking): „Do zadokowania” above.
    expect(deliveryWhy(f.log, () => 'cel')).toBeNull()
  })
})
