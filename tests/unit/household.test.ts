import { describe, expect, it } from 'vitest'
import { computeFleet, householdOf, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { balanceOf, settleHousehold } from '@shared/calc/household'
import { costOf, financedOf, incomeOf } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K1000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const GROCERIES = defaultCategoryId(1, 1)
const MAMA = `01KMEM${'0'.repeat(19)}1`
const TATA = `01KMEM${'0'.repeat(19)}2`
const NOW = '2026-10-20T12:00:00+02:00'

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const bought = (date: string, amount: number, memberId: string | null, over: Partial<Transaction> = {}) => tx(date, -zl(amount), { categoryId: GROCERIES, refundable: true, memberId, ...over })
const paid = (date: string, amount: number, memberId: string, advance = false, over: Partial<Transaction> = {}) => tx(date, zl(amount), { kind: 'income', memberId, advance, counterparty: 'Domownik', ...over })

function settings(): Settings {
  const s = createDefaultSettings(AT).settings
  return {
    ...s,
    budget: { start: '2026-10-01', initial: { shields: zl(12640), hull: zl(15000), goals: {} } },
    layers: { ...s.layers, assumedCosts: zl(3650) },
    household: { members: [...s.household.members, { id: MAMA, name: 'Mama', bankNames: ['ANNA TESTOWA'], inflow: 'advance', archived: false }, { id: TATA, name: 'Tata', bankNames: [], inflow: 'ask', archived: false }] }
  }
}

/** The spec's ship (shields 8 640 after the October salary, hull 15 000), the household's operations on it. */
function fleet(transactions: Transaction[], over: Partial<FleetInput> = {}): FleetState {
  const state = computeFleet({
    settings: settings(),
    balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(27640) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000) })],
    transactions,
    now: NOW,
    ...over
  })
  // Every złoty on the accounts in one layer – the household's advances (the deposit) too.
  expect(layersSum(state)).toBe(state.total)
  return state
}

describe('rozliczenia z domownikami (D80)', () => {
  it('zaliczka z góry, potem wydatek „finansuje: Mama”: depozyt, osłony i energia bez zmian, nie mój koszt ani przychód', () => {
    const plain = fleet([])
    const advance = paid('2026-10-05', 500, MAMA, true)
    const purchase = bought('2026-10-07', 300, MAMA)
    const s = fleet([advance, purchase])
    expect(s.deposit).toBe(zl(200))
    expect(s.shields.amount).toBe(plain.shields.amount)
    expect(s.hull.amount).toBe(plain.hull.amount)
    expect(s.energy).toBe(plain.energy)
    expect(s.daily?.spentBefore).toBe(0)
    expect(s.receivables.house).toBe(0)
    expect(s.receivables.members).toEqual([{ memberId: MAMA, owed: 0, deposit: zl(200), open: [], since: null }])
    expect(s.log.find((e) => e.txId === advance.id)?.moves).toEqual({ deposit: zl(500) })
    expect(s.log.find((e) => e.txId === purchase.id)?.moves).toEqual({ deposit: -zl(300) })
    const ledger = settleHousehold([advance, purchase])
    expect(costOf(purchase)).toBe(0)
    expect(incomeOf(advance, ledger)).toBe(0)
    expect(financedOf(purchase)).toEqual(new Map([[MAMA, zl(300)]]))
  })

  it('najpierw płacę ja (osłony pożyczają), wpłata wyrównuje należność, nadwyżka – zaliczka albo przychód', () => {
    const plain = fleet([])
    const purchase = bought('2026-10-03', 150, MAMA)
    const lent = fleet([purchase])
    expect(lent.shields.amount).toBe(plain.shields.amount - zl(150))
    expect(lent.receivables).toMatchObject({ house: zl(150), houseSince: '2026-10-03', total: zl(150) })
    expect(lent.log.find((e) => e.txId === purchase.id)?.moves).toEqual({ shields: -zl(150), house: zl(150) })

    // The rest as an advance: kept for her, not the ship's.
    const ahead = paid('2026-10-08', 200, MAMA, true)
    const s = fleet([purchase, ahead])
    expect(s.log.find((e) => e.txId === ahead.id)?.moves).toEqual({ shields: zl(150), house: -zl(150), deposit: zl(50) })
    expect(s.receivables.house).toBe(0)
    expect(s.deposit).toBe(zl(50))
    expect(s.shields.amount).toBe(plain.shields.amount)

    // The rest as income: it docks (the shields are below their target – into the shields).
    const income = paid('2026-10-08', 200, MAMA, false)
    const t = fleet([purchase, income])
    expect(t.log.find((e) => e.txId === income.id)?.moves).toEqual({ shields: zl(200), house: -zl(150) })
    expect(t.deposit).toBe(0)
    expect(incomeOf(income, settleHousehold([purchase, income]))).toBe(zl(50))
  })

  it('wpłata pokrywa wskazane wydatki, inaczej od najstarszych; przypomnienie liczy od najstarszego otwartego', () => {
    const old = bought('2026-10-02', 100, TATA)
    const fresh = bought('2026-10-06', 50, TATA)
    const fifo = settleHousehold([old, fresh, paid('2026-10-09', 50, TATA)])
    expect(balanceOf(fifo, TATA)).toMatchObject({ owed: zl(100), since: '2026-10-02', open: [{ txId: old.id, date: '2026-10-02', amount: zl(50) }, { txId: fresh.id, date: '2026-10-06', amount: zl(50) }] })
    const covered = settleHousehold([old, fresh, paid('2026-10-09', 50, TATA, false, { covers: [fresh.id] })])
    expect(balanceOf(covered, TATA)).toMatchObject({ owed: zl(100), since: '2026-10-02', open: [{ txId: old.id, date: '2026-10-02', amount: zl(100) }] })
  })

  it('paragon podzielony: część moja z energii, części Mamy i Taty – każda w swoim saldzie', () => {
    const plain = fleet([])
    const receipt = tx('2026-10-06', -zl(120), {
      splits: [
        { id: nextId(), amount: -zl(40), categoryId: GROCERIES, refundable: false, memberId: null, note: '' },
        { id: nextId(), amount: -zl(50), categoryId: GROCERIES, refundable: true, memberId: MAMA, note: '' },
        { id: nextId(), amount: -zl(30), categoryId: GROCERIES, refundable: true, memberId: TATA, note: '' }
      ]
    })
    const s = fleet([receipt])
    expect(s.energy).toBe(plain.energy - zl(40))
    expect(s.receivables.members.map((m) => [m.memberId, m.owed])).toEqual([
      [MAMA, zl(50)],
      [TATA, zl(30)]
    ])
    expect(costOf(receipt)).toBe(zl(40))
    expect(financedOf(receipt)).toEqual(
      new Map([
        [MAMA, zl(50)],
        [TATA, zl(30)]
      ])
    )
  })

  it('zwrot towaru z zakupu domownika jest jego: spłaca należność, reszta to jego zaliczka', () => {
    const purchase = bought('2026-10-03', 100, MAMA)
    const back = tx('2026-10-05', zl(30), { categoryId: GROCERIES, refundable: true, memberId: MAMA })
    const s = fleet([purchase, back])
    expect(s.receivables.house).toBe(zl(70))
    const more = tx('2026-10-06', zl(90), { categoryId: GROCERIES, refundable: true, memberId: MAMA })
    const t = fleet([purchase, back, more])
    expect(t.receivables.house).toBe(0)
    expect(t.deposit).toBe(zl(20))
  })

  it('zapisy sprzed 1.3.0: zakup „do zwrotu” bez osoby i wpłata z `repaid` – pierwszy domownik („Dom”), spłata najwyżej `repaid`', () => {
    const purchase = bought('2026-10-03', 150, null)
    const legacy = tx('2026-10-07', zl(200), { kind: 'income', repaid: zl(100), counterparty: 'Domownik' })
    const ledger = settleHousehold([purchase, legacy])
    expect(balanceOf(ledger, HOUSE_MEMBER_ID)).toMatchObject({ owed: zl(50), since: '2026-10-03' })
    expect(ledger.byTx.get(legacy.id)).toEqual([{ memberId: HOUSE_MEMBER_ID, fromDeposit: 0, lent: 0, repaid: zl(100), advance: 0, income: zl(100) }])
    expect(fleet([purchase, legacy]).receivables).toMatchObject({ house: zl(50), houseSince: '2026-10-03' })
  })

  it('przed startem budżetu wszystko rozliczone w saldzie otwarcia; oznaczony później zakup zmienia przychód w zwrot', () => {
    const before = bought('2026-09-20', 999, MAMA)
    expect(fleet([before]).receivables.house).toBe(0)
    expect(settleHousehold([before], { from: '2026-10-01' }).owed).toBe(0)
    expect(settleHousehold([before]).owed).toBe(zl(999))

    // A payment of hers was income; the purchase marked later (dated before it) makes it a repayment.
    const payment = paid('2026-10-10', 80, MAMA)
    expect(incomeOf(payment, settleHousehold([payment]))).toBe(zl(80))
    const marked = bought('2026-10-04', 80, MAMA)
    expect(incomeOf(payment, settleHousehold([marked, payment]))).toBe(0)
  })

  it('konto dołączone po starcie: operacje sprzed jego salda otwarcia są w tym saldzie – rozliczeń nie zmieniają', () => {
    const opening = (date: string, accountId: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId, kind: 'opening', amount })
    const balances = [opening('2026-10-01', MBANK_ACCOUNT_ID, zl(27640)), opening('2026-10-10', XTB_WALLET_ACCOUNT_ID, zl(100))]
    // Mama's advance into the wallet before it joined the budget: inside its opening balance (the shields' money).
    const early = paid('2026-10-05', 100, MAMA, true, { accountId: XTB_WALLET_ACCOUNT_ID })
    const purchase = bought('2026-10-12', 100, MAMA)
    const s = fleet([early, purchase], { balances })
    expect(s.deposit).toBe(0)
    expect(s.receivables.members).toEqual([{ memberId: MAMA, owed: zl(100), deposit: 0, open: [{ txId: purchase.id, date: '2026-10-12', amount: zl(100) }], since: '2026-10-12' }])
    expect(s.household.byTx.has(early.id)).toBe(false)
    // The game's missions read the same ledger.
    expect(householdOf({ settings: settings(), balances, transactions: [early, purchase] }, '2026-10-20')).toEqual(s.household)
  })

  it('jeden rejestr dla tych samych operacji (bez liczenia od nowa); kolejność silnika: data, godzina, zapis', () => {
    const list = [paid('2026-10-05', 10, MAMA, true), bought('2026-10-05', 10, MAMA, { time: '08:00' })]
    expect(settleHousehold(list)).toBe(settleHousehold(list))
    // The purchase at 8:00, the money (no time) first: the advance pays it.
    expect(settleHousehold(list).owed).toBe(0)
    expect(settleHousehold(list).deposit).toBe(0)
  })
})
