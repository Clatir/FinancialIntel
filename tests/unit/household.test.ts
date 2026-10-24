import { describe, expect, it } from 'vitest'
import { briefing } from '@shared/calc/briefing'
import { computeFleet, householdOf, layersSum, rebaseOpenings, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { balanceOf, incomeShares, settleHousehold, type HouseholdLedger } from '@shared/calc/household'
import { incomeParts } from '@shared/calc/income'
import { costOf, financedOf } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type HouseholdMember, type MemberOpening, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K1000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const GROCERIES = defaultCategoryId(1, 1)
const MAMA = `01KMEM${'0'.repeat(19)}1`
const TATA = `01KMEM${'0'.repeat(19)}2`
const NOW = '2026-10-20T12:00:00+02:00'

const member = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'ask', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const work = (t: Transaction, ledger: HouseholdLedger) => incomeParts(t, { ledger, since: null, members: [], tax: new Map() }).work

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const bought = (date: string, amount: number, memberId: string | null, over: Partial<Transaction> = {}) => tx(date, -zl(amount), { categoryId: GROCERIES, refundable: true, memberId, ...over })
const paid = (date: string, amount: number, memberId: string, advance = false, over: Partial<Transaction> = {}) => tx(date, zl(amount), { kind: 'income', memberId, advance, counterparty: 'Domownik', ...over })

function settings(): Settings {
  const s = createDefaultSettings(AT).settings
  return {
    ...s,
    budget: { start: '2026-10-01', initial: { shields: zl(12640), hull: zl(15000), goals: {} } },
    layers: { ...s.layers, assumedCosts: zl(3650) },
    household: { members: [...s.household.members, member(MAMA, 'Mama', { bankNames: ['ANNA TESTOWA'], inflow: 'advance' }), member(TATA, 'Tata')] }
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
    expect(s.receivables.members).toMatchObject([{ memberId: MAMA, owed: 0, deposit: zl(200), open: [], since: null }])
    expect(s.log.find((e) => e.txId === advance.id)?.moves).toEqual({ deposit: zl(500) })
    expect(s.log.find((e) => e.txId === purchase.id)?.moves).toEqual({ deposit: -zl(300) })
    const ledger = settleHousehold([advance, purchase])
    expect(costOf(purchase)).toBe(0)
    expect(work(advance, ledger)).toBe(0)
    expect(financedOf(purchase)).toEqual(new Map([[MAMA, zl(300)]]))
  })

  it('wcześniejsza wpłata wskazująca późniejszy zakup trzyma zaliczkę w warstwie depozytu (1.15.1)', () => {
    const plain = fleet([])
    const target = bought('2026-10-07', 300, MAMA)
    // Payer has advance: false (default income), but names target in covers
    const payment = paid('2026-10-05', 300, MAMA, false, { covers: [target.id] })
    const s = fleet([payment, target])
    expect(s.deposit).toBe(0)
    expect(s.shields.amount).toBe(plain.shields.amount)
    expect(s.energy).toBe(plain.energy)
    expect(s.receivables.house).toBe(0)
    expect(s.receivables.members).toMatchObject([{ memberId: MAMA, owed: 0, deposit: 0, open: [] }])
    expect(s.log.find((e) => e.txId === payment.id)?.moves).toEqual({ deposit: zl(300) })
    expect(s.log.find((e) => e.txId === target.id)?.moves).toEqual({ deposit: -zl(300) })
    expect(layersSum(s)).toBe(s.total)
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
    expect(work(income, settleHousehold([purchase, income]))).toBe(zl(50))
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
        { id: nextId(), amount: -zl(40), categoryId: GROCERIES, refundable: false, memberId: null, advance: false, note: '' },
        { id: nextId(), amount: -zl(50), categoryId: GROCERIES, refundable: true, memberId: MAMA, advance: false, note: '' },
        { id: nextId(), amount: -zl(30), categoryId: GROCERIES, refundable: true, memberId: TATA, advance: false, note: '' }
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
    expect(ledger.byTx.get(legacy.id)).toMatchObject([{ memberId: HOUSE_MEMBER_ID, fromDeposit: 0, lent: 0, repaid: zl(100), advance: 0, income: zl(100), gift: 0 }])
    expect(fleet([purchase, legacy]).receivables).toMatchObject({ house: zl(50), houseSince: '2026-10-03' })
  })

  it('przed startem budżetu wszystko rozliczone w saldzie otwarcia; oznaczony później zakup zmienia przychód w zwrot', () => {
    const before = bought('2026-09-20', 999, MAMA)
    expect(fleet([before]).receivables.house).toBe(0)
    expect(settleHousehold([before], { from: '2026-10-01' }).owed).toBe(0)
    expect(settleHousehold([before]).owed).toBe(zl(999))

    // A payment of hers was income; the purchase marked later (dated before it) makes it a repayment.
    const payment = paid('2026-10-10', 80, MAMA)
    expect(work(payment, settleHousehold([payment]))).toBe(zl(80))
    const marked = bought('2026-10-04', 80, MAMA)
    expect(work(payment, settleHousehold([marked, payment]))).toBe(0)
  })

  it('konto dołączone po starcie: operacje sprzed jego salda otwarcia są w tym saldzie – rozliczeń nie zmieniają', () => {
    const opening = (date: string, accountId: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId, kind: 'opening', amount })
    const balances = [opening('2026-10-01', MBANK_ACCOUNT_ID, zl(27640)), opening('2026-10-10', XTB_WALLET_ACCOUNT_ID, zl(100))]
    // Mama's advance into the wallet before it joined the budget: inside its opening balance (the shields' money).
    const early = paid('2026-10-05', 100, MAMA, true, { accountId: XTB_WALLET_ACCOUNT_ID })
    const purchase = bought('2026-10-12', 100, MAMA)
    const s = fleet([early, purchase], { balances })
    expect(s.deposit).toBe(0)
    expect(s.receivables.members).toMatchObject([{ memberId: MAMA, owed: zl(100), deposit: 0, open: [{ txId: purchase.id, date: '2026-10-12', amount: zl(100) }], since: '2026-10-12' }])
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

describe('domownicy bez bankowości, rozliczenia od dnia (D81)', () => {
  const SINCE = '2026-10-10'
  const withHousehold = (over: Partial<Settings['household']>, members?: (s: Settings) => HouseholdMember[]): Partial<FleetInput> => {
    const s = settings()
    return { settings: { ...s, household: { ...s.household, ...over, members: members ? members(s) : s.household.members } } }
  }
  const setMember = (id: string, over: Partial<HouseholdMember>) => (s: Settings) => s.household.members.map((m) => (m.id === id ? { ...m, ...over } : m))

  it('rozliczenia od dnia: to, co przed nim, zapomniane; saldo początkowe osoby to jej należność od tego dnia', () => {
    const before = bought('2026-10-03', 120, MAMA)
    const plain = fleet([before], withHousehold({ since: SINCE }))
    expect(plain.receivables.house).toBe(0)
    expect(plain.settleFrom).toBe(SINCE)
    const s = fleet([before], withHousehold({ since: SINCE }, setMember(MAMA, { opening: { owed: zl(150), deposit: 0 } })))
    expect(s.receivables.members).toMatchObject([{ memberId: MAMA, owed: zl(150), deposit: 0, open: [{ txId: `opening:${MAMA}`, date: SINCE, amount: zl(150) }], since: SINCE }])
    // Her money after the start pays the opening balance back.
    const t = fleet([before, paid('2026-10-12', 100, MAMA)], withHousehold({ since: SINCE }, setMember(MAMA, { opening: { owed: zl(150), deposit: 0 } })))
    expect(t.receivables.members.find((m) => m.memberId === MAMA)).toMatchObject({ owed: zl(50) })
    // No date chosen: from the budget's start, as in 1.3.0.
    expect(fleet([before]).receivables.house).toBe(zl(120))
  })

  it('zmiana daty rozliczeń przelicza saldo na start – w obie strony, bez liczenia operacji drugi raz; wpisana ręcznie część zostaje (B3)', () => {
    const ops = [bought('2026-10-03', 120, MAMA), paid('2026-10-05', 500, MAMA, true)]
    const balances = [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(27640) })]
    const at = (since: string | null, opening: MemberOpening) => ({ settings: withHousehold({ since }, setMember(MAMA, { opening })).settings!, balances, transactions: ops })
    const moved = (from: ReturnType<typeof at>, since: string | null) => {
      const openings = rebaseOpenings(from, '2026-10-20', since)
      return at(since, openings?.get(MAMA) ?? from.settings.household.members.find((m) => m.id === MAMA)!.opening)
    }
    const mama = (input: ReturnType<typeof at>) => fleet(ops, input).receivables.members.find((m) => m.memberId === MAMA)
    // The seed of 1.4.0: from today on, her advance until yesterday (500 − 120) as her opening.
    const seeded = at('2026-10-20', { owed: 0, deposit: zl(380) })
    expect(mama(seeded)).toMatchObject({ owed: 0, deposit: zl(380) })
    // „Od startu budżetu”: as 1.3.0 – no opening, the operations count (not 760 zł).
    const fromStart = moved(seeded, null)
    expect(fromStart.settings.household.members.find((m) => m.id === MAMA)!.opening).toEqual({ owed: 0, deposit: 0, since: null })
    expect(mama(fromStart)).toMatchObject({ owed: 0, deposit: zl(380) })
    expect(fleet(ops, fromStart).deposit).toBe(zl(380))
    // Earlier: what she owed then (the purchase of 3.10), her advance after it counts once.
    const early = moved(seeded, '2026-10-04')
    // The debt dated by its purchase (N41): the reminder counts from 3.10, not from the settlements' start.
    expect(early.settings.household.members.find((m) => m.id === MAMA)!.opening).toEqual({ owed: zl(120), deposit: 0, since: '2026-10-03' })
    expect(mama(early)).toMatchObject({ owed: 0, deposit: zl(380) })
    // Later: the operations between the two starts go into the opening, none lost.
    const later = moved(early, '2026-10-10')
    expect(later.settings.household.members.find((m) => m.id === MAMA)!.opening).toEqual({ owed: 0, deposit: zl(380), since: null })
    expect(mama(later)).toMatchObject({ owed: 0, deposit: zl(380) })
    // A hand-typed part (100 zł more than the operations) stays when the start moves back.
    const typed = moved(at('2026-10-20', { owed: 0, deposit: zl(480) }), '2026-10-04')
    expect(mama(typed)).toMatchObject({ owed: 0, deposit: zl(480) })
    // The same start (the budget's day = from the budget's start): nothing to change.
    expect(rebaseOpenings(at('2026-10-01', { owed: 0, deposit: 0 }), '2026-10-20', null)).toBeNull()
  })

  it('rozliczenia od późniejszego dnia: przy starcie budżetu salda i tak zerowane (jak w 1.3.0)', () => {
    // A purchase of before the budget (September): her transfer between the budget's start and the date is income.
    const old = bought('2026-09-20', 200, MAMA)
    const transfer = paid('2026-10-05', 200, MAMA)
    const s = fleet([old, transfer], withHousehold({ since: SINCE }))
    expect(s.household.byTx.get(transfer.id)).toMatchObject([{ memberId: MAMA, fromDeposit: 0, lent: 0, repaid: 0, advance: 0, income: zl(200), gift: 0 }])
    expect(s.log.find((e) => e.txId === transfer.id)?.moves.house).toBeUndefined()
  })

  it('zaliczka na start jest w depozycie (z osłon), a zaliczka sprzed daty wraca do osłon', () => {
    const plain = fleet([])
    const opening = fleet([], withHousehold({ since: SINCE }, setMember(TATA, { opening: { owed: 0, deposit: zl(200) } })))
    expect(opening.deposit).toBe(zl(200))
    expect(opening.shields.amount).toBe(plain.shields.amount - zl(200))
    expect(opening.log.find((e) => e.kind === 'household')).toMatchObject({ date: SINCE, amount: zl(200), moves: { deposit: zl(200), shields: -zl(200) } })
    // A purchase Tata finances after the start takes his opening advance.
    const spent = fleet([bought('2026-10-12', 50, TATA)], withHousehold({ since: SINCE }, setMember(TATA, { opening: { owed: 0, deposit: zl(200) } })))
    expect(spent.deposit).toBe(zl(150))
    expect(spent.receivables.members).toMatchObject([{ memberId: TATA, owed: 0, deposit: zl(150), open: [], since: null }])
    // Mama's advance of before the start: forgotten – the money is the shields' now.
    const early = fleet([paid('2026-10-05', 300, MAMA, true)], withHousehold({ since: SINCE }))
    expect(early.deposit).toBe(0)
    expect(early.shields.amount).toBe(plain.shields.amount + zl(300))
  })

  it('wpłata podzielona na osoby: każda część spłaca swoją osobę, reszta kwoty jest nadawcy, część bez osoby to przychód', () => {
    const forMama = bought('2026-10-03', 200, MAMA)
    const transfer = tx('2026-10-12', zl(500), {
      kind: 'income',
      memberId: TATA,
      advance: true,
      counterparty: 'PIOTR TESTOWY',
      splits: [{ id: nextId(), amount: zl(300), categoryId: null, refundable: false, memberId: MAMA, advance: false, note: '' }]
    })
    // Each part with its line of the split (1.10.0: a tag's money back reads its own lines); the rest – none.
    expect(incomeShares(transfer)).toEqual([
      { memberId: MAMA, amount: zl(300), advance: false, line: 0 },
      { memberId: TATA, amount: zl(200), advance: true }
    ])
    const ledger = settleHousehold([forMama, transfer])
    expect(ledger.byTx.get(transfer.id)).toMatchObject([
      { memberId: MAMA, fromDeposit: 0, lent: 0, repaid: zl(200), advance: 0, income: zl(100), gift: 0 },
      { memberId: TATA, fromDeposit: 0, lent: 0, repaid: 0, advance: zl(200), income: 0, gift: 0 }
    ])
    const s = fleet([forMama, transfer])
    expect(s.receivables.house).toBe(0)
    expect(s.deposit).toBe(zl(200))
    expect(s.log.find((e) => e.txId === transfer.id)?.moves).toMatchObject({ house: -zl(200), deposit: zl(200) })
    expect(work(transfer, ledger)).toBe(zl(100))
    // A part without a member is mine (income); parts over the amount are cut at it.
    const mine = tx('2026-10-12', zl(100), {
      kind: 'income',
      memberId: TATA,
      splits: [
        { id: nextId(), amount: zl(70), categoryId: null, refundable: false, memberId: null, advance: false, note: '' },
        { id: nextId(), amount: zl(70), categoryId: null, refundable: false, memberId: MAMA, advance: false, note: '' }
      ]
    })
    expect(incomeShares(mine)).toEqual([
      { memberId: null, amount: zl(70), advance: false, line: 0 },
      { memberId: MAMA, amount: zl(30), advance: false, line: 1 }
    ])
  })

  it('przypomnienie po 30 dniach: saldo na start albo najstarszy zakup, przez kogo osoba przekazuje pieniądze', () => {
    const members = (s: Settings) => s.household.members.map((m) => (m.id === MAMA ? { ...m, via: TATA, opening: { owed: zl(150), deposit: 0 } } : m))
    const over = withHousehold({ since: '2026-09-01' }, members)
    const late = fleet([], { ...over, settings: { ...over.settings!, budget: { start: '2026-09-01', initial: null } } })
    const items = briefing({ fleet: late, containers: [], imports: [], lastConfirmation: '2026-10-19', label: () => '', members: members(settings()) })
    expect(items.find((i) => i.kind === 'house')!.text).toBe('Mama: do oddania 150,00 zł – saldo na start rozliczeń z 01.09 (49 dni) – przekazuje przez: Tata.')
  })

  it('pośrednik to tylko podpowiedź: przelew Taty jest Taty, choć Mama przekazuje przez niego', () => {
    const forMama = bought('2026-10-03', 200, MAMA)
    const transfer = paid('2026-10-12', 1000, TATA)
    const s = fleet([forMama, transfer], withHousehold({}, setMember(MAMA, { via: TATA })))
    expect(s.receivables.members.find((m) => m.memberId === MAMA)).toMatchObject({ owed: zl(200) })
    expect(s.household.byTx.get(transfer.id)).toMatchObject([{ memberId: TATA, fromDeposit: 0, lent: 0, repaid: 0, advance: 0, income: zl(1000), gift: 0 }])
  })

  it('niezależny przekaz od domownika: nie spłaca zakupu do oddania – jako przychód lub niezależna zaliczka', () => {
    const purchase = bought('2026-10-03', 200, MAMA)
    // 1) Niezależny przychód: trafia do przychodu statystyk i budżetu, Mama nadal ma do oddania 200 zł
    const independentIncome = paid('2026-10-05', 100, MAMA, false, { inflowKind: 'income' })
    const ledgerIncome = settleHousehold([purchase, independentIncome], { assignFrom: null })
    expect(balanceOf(ledgerIncome, MAMA)).toMatchObject({ owed: zl(200), deposit: 0, unassigned: [] })
    expect(ledgerIncome.byTx.get(independentIncome.id)).toMatchObject([{ repaid: 0, advance: 0, income: zl(100), unassigned: 0, paidFor: [] }])

    // 2) Niezależna zaliczka: trafia do depozytu, Mama nadal ma do oddania 200 zł
    const independentAdvance = paid('2026-10-06', 150, MAMA, true, { inflowKind: 'advance' })
    const ledgerAdvance = settleHousehold([purchase, independentAdvance], { assignFrom: null })
    expect(balanceOf(ledgerAdvance, MAMA)).toMatchObject({ owed: zl(200), deposit: zl(150), unassigned: [] })
    expect(ledgerAdvance.byTx.get(independentAdvance.id)).toMatchObject([{ repaid: 0, advance: zl(150), income: 0, unassigned: 0, paidFor: [] }])
  })
})

