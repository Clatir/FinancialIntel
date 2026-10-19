import { describe, expect, it } from 'vitest'
import { computeFleet, layersSum, openingIdsOf, rebaseOpenings, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { financersText, settleHousehold } from '@shared/calc/household'
import { costOf, ownSpent, partsOf } from '@shared/calc/operations'
import { changeMode, equalPercents, line, percentSum, restIndex, shareAmounts, shareComplete, shareOf, shareSplits, startShare, withAmount, withBankAmount, withShare } from '@shared/calc/share'
import { createDefaultSettings } from '@shared/defaults'
import { derivedId } from '@shared/ids'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, settingsFileSchema, transactionSchema, type HouseholdMember, type Settings, type Share, type Transaction } from '@shared/schema'

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
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const purchase = (date: string, amount: number, over: Partial<Transaction> = {}) => tx(date, -zl(amount), { categoryId: GROCERIES, ...over })
const shared = (date: string, amount: number, share: Share, over: Partial<Transaction> = {}) => withShare(purchase(date, amount, over), share)

function settings(): Settings {
  const s = createDefaultSettings(AT).settings
  return {
    ...s,
    budget: { start: '2026-10-01', initial: { shields: zl(12640), hull: zl(15000), goals: {} } },
    layers: { ...s.layers, assumedCosts: zl(3650) },
    household: { members: [...s.household.members, member(MAMA, 'Mama', { inflow: 'advance' }), member(TATA, 'Tata')] }
  }
}

function fleet(transactions: Transaction[], over: Partial<FleetInput> = {}): FleetState {
  const state = computeFleet({
    settings: settings(),
    balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(27640) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000) })],
    transactions,
    now: NOW,
    ...over
  })
  expect(layersSum(state)).toBe(state.total)
  return state
}

const equal = (...ids: Array<string | null>): Share => ({ mode: 'equal', lines: ids.map((id) => line(id)) })

describe('wspólne finansowanie (D83): podział kwoty na osoby', () => {
  it('równo – reszta groszy w ostatniej części (T3); procenty – zaokrąglone, ostatnia osoba bierze resztę', () => {
    expect(shareAmounts(zl(100), equal(null, MAMA, TATA))).toEqual([3333, 3333, 3334])
    const pct: Share = { mode: 'percent', lines: [line(null, false, 33.33), line(MAMA, false, 33.33), line(TATA, false, 33.34)] }
    expect(shareAmounts(zl(90), pct)).toEqual([3000, 3000, 3000])
    expect(shareAmounts(zl(10.01), pct)).toEqual([334, 334, 333])
    expect(percentSum(pct)).toBe(100)
    expect(shareComplete(pct, null)).toBe(true)
    expect(shareComplete({ ...pct, lines: pct.lines.slice(0, 2) }, null)).toBe(false)
    // Over 100%: never more than the amount.
    expect(shareAmounts(zl(10), { mode: 'percent', lines: [line(MAMA, false, 80), line(TATA, false, 80)] })).toEqual([zl(8), zl(2)])
  })

  it('kwoty – osoby swoje kwoty, ja resztę (bez mnie – ostatnia osoba); kwoty ponad całość ucięte', () => {
    const amounts: Share = { mode: 'amounts', lines: [line(MAMA, false, zl(30)), line(null), line(TATA, false, zl(20))] }
    expect(shareAmounts(zl(90), amounts)).toEqual([zl(30), zl(40), zl(20)])
    expect(shareAmounts(zl(40), amounts)).toEqual([zl(30), 0, zl(10)])
    expect(shareComplete(amounts, zl(40))).toBe(false)
    expect(shareAmounts(zl(90), { mode: 'amounts', lines: [line(MAMA, false, zl(30)), line(TATA, false, zl(5))] })).toEqual([zl(30), zl(60)])
  })

  it('zmiana sposobu zachowuje kwoty: procenty z kwot (dwa miejsca), kwoty z podziału', () => {
    const s = equal(null, MAMA, TATA)
    expect(changeMode(s, 'percent', zl(90)).lines.map((l) => l.value)).toEqual([33.33, 33.33, 33.34])
    expect(changeMode(s, 'amounts', zl(90)).lines.map((l) => l.value)).toEqual([zl(30), zl(30), zl(30)])
    expect(changeMode(s, 'percent', 0).lines.map((l) => l.value)).toEqual([33.33, 33.33, 33.34])
    // Equal percents one way everywhere (the editor's „+ osoba” too): cut, the last one the rest.
    expect(equalPercents(6)).toEqual([16.66, 16.66, 16.66, 16.66, 16.66, 16.7])
    expect(changeMode(equal(null, MAMA, TATA, null, MAMA, TATA), 'percent', 0).lines.map((l) => l.value)).toEqual(equalPercents(6))
    expect(restIndex(equal(MAMA, null, TATA))).toBe(1)
    expect(restIndex(equal(MAMA, TATA))).toBe(1)
  })

  it('części operacji: kategoria operacji, moja bez osoby, domownika „finansuje”, prezent; nowa kwota – części od nowa, id zostają', () => {
    const t = shared('2026-10-10', 90, { mode: 'equal', lines: [line(null), line(MAMA), line(TATA, true)] })
    expect(t.splits.map((s) => [s.amount, s.categoryId, s.refundable, s.memberId, !!s.gift])).toEqual([
      [-zl(30), GROCERIES, false, null, false],
      [-zl(30), GROCERIES, true, MAMA, false],
      [-zl(30), GROCERIES, true, TATA, true]
    ])
    expect(shareOf(t)).toBe(t.share)
    const ids = t.splits.map((s) => s.id)
    const settled = withAmount(t, -zl(93))
    expect(settled.splits.map((s) => s.amount)).toEqual([-zl(31), -zl(31), -zl(31)])
    expect(settled.splits.map((s) => s.id)).toEqual(ids)
    // Lines changed by hand (another version, the receipt editor): no share any more – a split receipt.
    const edited = { ...t, splits: t.splits.map((s, i) => (i === 0 ? { ...s, amount: -zl(50) } : s)) }
    expect(shareOf(edited)).toBeNull()
    expect(withAmount(edited, -zl(100)).splits.map((s) => s.amount)).toEqual([-zl(50), -zl(30), -zl(30)])
    // The bank's new amount: a shared purchase's lines made again; a receipt's in proportion (B99 – a purchase abroad
    // settled at another rate; a line of a deposit back stays +); an income's parts are what each person gave – kept.
    expect(withBankAmount(t, -zl(93)).splits.map((s) => s.amount)).toEqual([-zl(31), -zl(31), -zl(31)])
    const receipt = { ...edited, amount: -zl(100), splits: [{ ...edited.splits[0]!, amount: -zl(120) }, { ...edited.splits[1]!, amount: zl(20) }] }
    expect(withBankAmount(receipt, -zl(110))).toMatchObject({ amount: -zl(110), splits: [{ amount: -zl(132) }, { amount: zl(22) }] })
    // Rounding: what is left goes to the largest line, the lines' sum the new amount.
    const thirds = { ...receipt, splits: [{ ...receipt.splits[0]!, amount: -3333 }, { ...receipt.splits[1]!, amount: -6667 }] }
    expect(withBankAmount(thirds, -10001).splits.map((s) => s.amount)).toEqual([-3333, -6668])
    const income = { ...receipt, kind: 'income' as const, amount: zl(100), splits: [{ ...receipt.splits[1]!, amount: zl(40) }] }
    expect(withBankAmount(income, zl(110))).toMatchObject({ amount: zl(110), splits: income.splits })
    // „bez podziału”: one line, mine.
    expect(withShare(t, null)).toMatchObject({ share: null, splits: [], refundable: false, memberId: null })
    expect(shareSplits({ amount: zl(20), categoryId: null }, equal(null, MAMA)).map((s) => s.amount)).toEqual([zl(10), zl(10)])
  })

  it('zapis bez zbędnych pól: bez `gift`/`share` w zwykłej operacji (starsza wersja czyta części jak paragon)', () => {
    const plain = purchase('2026-10-10', 10)
    expect('gift' in plain).toBe(false)
    expect('share' in plain).toBe(false)
    const parsed = transactionSchema.parse({ ...shared('2026-10-10', 90, equal(null, MAMA)), share: { mode: 'nowy-sposob', lines: [] } })
    expect(parsed.share).toBeUndefined()
    expect(parsed.splits).toHaveLength(2)
  })

  it('silnik: moja część zjada energię, część Mamy z jej zaliczki, reszta – ma oddać; Tata – prezent bez długu, z osłon', () => {
    const plain = fleet([])
    const advance = tx('2026-10-05', zl(20), { kind: 'income', memberId: MAMA, advance: true })
    const t = shared('2026-10-10', 90, { mode: 'equal', lines: [line(null), line(MAMA), line(TATA, true)] })
    const s = fleet([advance, t])
    expect(costOf(t)).toBe(zl(30))
    expect(ownSpent(t)).toBe(zl(30))
    expect(s.energy).toBe(plain.energy - zl(30))
    expect(s.log.find((e) => e.txId === t.id)?.moves).toEqual({ energy: -zl(30), deposit: -zl(20), shields: -zl(40), house: zl(10) })
    expect(s.receivables.members.find((m) => m.memberId === MAMA)).toMatchObject({ owed: zl(10), deposit: 0 })
    expect(s.receivables.members.find((m) => m.memberId === TATA)).toMatchObject({ owed: 0, deposit: 0 })
    expect(s.household.byTx.get(t.id)).toEqual([
      { memberId: MAMA, fromDeposit: zl(20), lent: zl(10), repaid: 0, advance: 0, income: 0, gift: 0 },
      { memberId: TATA, fromDeposit: 0, lent: 0, repaid: 0, advance: 0, income: 0, gift: zl(30) }
    ])
    expect(financersText(t, settings().household.members)).toBe('ja, Mama, Tata (prezent)')
  })

  it('prezent (cała operacja): najpierw zaliczka osoby, resztę pokrywają osłony – nikt nic nie jest winien; zwrot towaru wraca do osłon', () => {
    const advance = tx('2026-10-05', zl(100), { kind: 'income', memberId: MAMA, advance: true })
    const gift = purchase('2026-10-07', 250, { refundable: true, memberId: MAMA, gift: true })
    const plain = fleet([advance])
    const s = fleet([advance, gift])
    expect(partsOf(gift)).toEqual([{ amount: -zl(250), categoryId: GROCERIES, refundable: true, memberId: MAMA, gift: true }])
    expect(costOf(gift)).toBe(0)
    expect(s.energy).toBe(plain.energy)
    expect(s.deposit).toBe(0)
    expect(s.shields.amount).toBe(plain.shields.amount - zl(150))
    expect(s.receivables.house).toBe(0)
    const back = tx('2026-10-08', zl(50), { categoryId: GROCERIES, refundable: true, memberId: MAMA, gift: true })
    const returned = fleet([advance, gift, back])
    expect(returned.shields.amount).toBe(s.shields.amount + zl(50))
    expect(returned.log.find((e) => e.txId === back.id)?.moves).toEqual({ shields: zl(50) })
    expect(settleHousehold([advance, gift, back]).byTx.get(back.id)).toEqual([{ memberId: MAMA, fromDeposit: 0, lent: 0, repaid: 0, advance: 0, income: 0, gift: -zl(50) }])
  })
})

describe('B14: operacje domowników sprzed dnia rozliczeń, których salda na start nie obejmują', () => {
  const since = '2026-10-15'
  const late = (date: string, amount: number, over: Partial<Transaction> = {}) => tx(date, -zl(amount), { categoryId: GROCERIES, refundable: true, memberId: MAMA, ...over })
  const input = (txs: Transaction[], openingIds: string[] | undefined, opening = { owed: 0, deposit: 0 }, from = since): Partial<FleetInput> => {
    const s = settings()
    return {
      settings: { ...s, household: { ...s.household, since: from, openingIds, members: s.household.members.map((m) => (m.id === MAMA ? { ...m, opening } : m)) } },
      transactions: txs
    }
  }
  const owed = (s: FleetState) => s.receivables.members.find((m) => m.memberId === MAMA)?.owed ?? 0

  it('zakup „finansuje: Mama” z 12.10 przyszedł z importem po ustaleniu sald: Mama ma oddać, osłony pożyczyły – nic nie ginie', () => {
    const t = late('2026-10-12', 300)
    const s = fleet([], input([t], []))
    expect(s.household.late).toEqual([t.id])
    expect(s.receivables.members.find((m) => m.memberId === MAMA)).toMatchObject({ owed: zl(300), since: '2026-10-12' })
    // Taken in by the openings: not counted again.
    const known = fleet([], input([t], [t.id]))
    expect(known.household.late).toEqual([])
    expect(known.receivables.house).toBe(0)
    // A folder of before 1.5.0 (no list): as before – the openings hold everything.
    expect(fleet([], input([t], undefined)).household.late).toEqual([])
  })

  it('zaliczka z salda na start i zakup dopisany później: depozyt silnika = rejestru, suma warstw = salda kont', () => {
    const t = late('2026-10-12', 120)
    const s = fleet([], input([t], [], { owed: 0, deposit: zl(200) }))
    expect(s.household.lateDeposit).toBe(-zl(120))
    expect(s.deposit).toBe(zl(80))
    expect(s.receivables.members.find((m) => m.memberId === MAMA)).toMatchObject({ owed: 0, deposit: zl(80) })
  })

  it('data poprawiona na dzień sprzed rozliczeń albo domownik dopisany do starej operacji: liczą się po saldach na start (nie znikają)', () => {
    // Known when the balances were set, dated after the start: counted as usual; its date corrected to 12.10 – still counted.
    const moved = late('2026-10-16', 150)
    const ids = openingIdsOf(input([moved], undefined) as FleetInput, '2026-10-20', since)
    expect(ids).toEqual([])
    expect(owed(fleet([], input([{ ...moved, date: '2026-10-12' }], ids)))).toBe(zl(150))
    // My own purchase of 12.10 (no member when the balances were set), then marked „finansuje: Mama”.
    const mine = purchase('2026-10-12', 80)
    const before = openingIdsOf(input([mine], undefined) as FleetInput, '2026-10-20', since)
    expect(before).toEqual([])
    expect(owed(fleet([], input([{ ...mine, refundable: true, memberId: MAMA }], before)))).toBe(zl(80))
  })

  it('lista operacji salda na start: domowników, od startu budżetu do dnia przed rozliczeniami', () => {
    const a = late('2026-10-03', 10)
    const b = late('2026-10-14', 20)
    const c = late('2026-10-15', 30)
    const own = purchase('2026-10-05', 40)
    expect(openingIdsOf(input([c, own, b, a], undefined) as FleetInput, '2026-10-20', since)).toEqual([a.id, b.id].sort())
    // From the budget's start: nothing before it.
    expect(openingIdsOf(input([a, b], undefined) as FleetInput, '2026-10-20', null)).toEqual([])
  })

  it('wcześniejsza data rozliczeń: zakup dopisany później nie wraca do salda na start – Mama dalej ma oddać (bez zaliczki z niczego)', () => {
    const t = late('2026-10-10', 100)
    const now = input([t], [])
    expect(owed(fleet([], now))).toBe(zl(100))
    const rebased = rebaseOpenings(now as FleetInput, '2026-10-20', '2026-10-05')!
    expect(rebased.get(MAMA)).toEqual({ owed: 0, deposit: 0, since: null })
    const after = fleet([], input([t], openingIdsOf(now as FleetInput, '2026-10-20', '2026-10-05'), rebased.get(MAMA), '2026-10-05'))
    expect(owed(after)).toBe(zl(100))
    expect(after.deposit).toBe(0)
  })
})

describe('Gotówka (D83) i identyfikatory', () => {
  it('folder sprzed 1.5.0 dostaje raz konto „Gotówka”; konto o tej nazwie już jest – drugie nie powstaje', () => {
    const old = settingsFileSchema.parse({ ...base(), settings: { accounts: [{ id: MBANK_ACCOUNT_ID, name: 'mBank' }], seeded: ['category:auto-przejazdy', 'rule:bolt', 'rule:koleo'] } })
    expect(old.settings.accounts.map((a) => [a.name, a.kind])).toEqual([
      ['mBank', 'bank'],
      ['Gotówka', 'cash']
    ])
    const typed = settingsFileSchema.parse({ ...base(), settings: { accounts: [{ id: nextId(), name: 'gotówka', kind: 'other' }], seeded: ['category:auto-przejazdy', 'rule:bolt', 'rule:koleo'] } })
    expect(typed.settings.accounts.map((a) => a.name)).toEqual(['gotówka'])
    expect(typed.settings.seeded).toContain('account:gotowka')
  })

  it('id z tekstu: ten sam na każdym komputerze, poprawny ULID z czasem wpisu, inny dla innego tekstu', () => {
    const entry = '01KP0000000000000000000001'
    const a = derivedId(entry, `wallet:${entry}`)
    expect(a).toBe(derivedId(entry, `wallet:${entry}`))
    expect(a).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    expect(a.slice(0, 10)).toBe(entry.slice(0, 10))
    expect(derivedId(entry, `docking:${entry}`)).not.toBe(a)
    expect(derivedId('nie-ulid', 'x').slice(0, 10)).toBe('0000000000')
  })
})

describe('startShare', () => {
  it('ja i jedna osoba po równo (prezent przeniesiony z „finansuje”)', () => {
    expect(startShare(MAMA, true)).toEqual({ mode: 'equal', lines: [line(null), line(MAMA, true)] })
  })
})
