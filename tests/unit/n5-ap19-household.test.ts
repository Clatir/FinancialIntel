/**
 * N5 (1.15.9), AP-19 – domownicy w grze, dzienniku i listach (AF-22, AF-23, AF-58, OP sp. 1, SW sp. 3, SW sp. 9, DM sp. 7,
 * R-17; T439): „plan czy impuls?” of my own unplanned part, the captain's log in my own amounts, a member's night purchase
 * no violation in its note, a member „pytaj” asked, „Pokaż zakupy” of one member, the balance at the settlements' start
 * said apart, the closed month's note at every closed month.
 */
import { describe, expect, it } from 'vitest'
import { openText, repaidMarks, settleHousehold, type MemberBalance } from '@shared/calc/household'
import { inboxItems, type InboxInput } from '@shared/calc/inbox'
import { logAccuracy } from '@shared/calc/intel'
import { asksImpulse, categoryIndex, impulseAmount, nightVerdict, partsOf } from '@shared/calc/operations'
import { restToChoose } from '@shared/calc/quick'
import { purchaseOf } from '@shared/calc/household'
import { waitingForPurchase } from '@shared/calc/repayments'
import { createDefaultSettings } from '@shared/defaults'
import { emptyFilter, matchesFilter, needsLog, refundablesFilter, type OperationsFilter } from '@shared/operationsView'
import { CASH_CATEGORY_ID, defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5A00000000000000000${String(++seq).padStart(4, '0')}`
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, kind: 'expense', amount, ...over })
const settings = createDefaultSettings(AT).settings
const orders = settings.orders
const FOOD = defaultCategoryId(1, 1)
const RENT = defaultCategoryId(2, 1)
const ANNA = `01KMEM${'0'.repeat(19)}1`
const MAREK = `01KMEM${'0'.repeat(19)}2`
const RENT_BOX = '01K5AB00000000000000000C01'
const money = (g: number) => `${(g / 100).toFixed(2).replace('.', ',')} zł`

describe('AF-22, OP sp. 1: „plan czy impuls?” od mojego udziału, bez czynszu, raty, bankomatu i kontenera', () => {
  it('zakup finansowany przez domownika 250 zł (próg 200 zł) – bez pytania; mój zakup 250 zł – pyta', () => {
    const forAnna = tx('2026-10-10', -zl(250), { categoryId: FOOD, refundable: true, memberId: ANNA })
    expect(asksImpulse(forAnna, orders)).toBe(false)
    expect(needsLog(forAnna, orders)).toBe(false)
    expect(asksImpulse(tx('2026-10-10', -zl(250), { categoryId: FOOD }), orders)).toBe(true)
  })

  it('paragon: 300 zł, w tym 200 zł Anny – moje 100 zł pod progiem; wspólnie 400 zł po połowie – moje 200 zł pyta', () => {
    const receipt = tx('2026-10-10', -zl(300), {
      categoryId: FOOD,
      splits: [
        { id: nextId(), amount: -zl(100), categoryId: FOOD, refundable: false, memberId: null, advance: false, note: '' },
        { id: nextId(), amount: -zl(200), categoryId: FOOD, refundable: true, memberId: ANNA, advance: false, note: '' }
      ]
    })
    expect(impulseAmount(partsOf(receipt))).toBe(zl(100))
    expect(asksImpulse(receipt, orders)).toBe(false)
    const shared = tx('2026-10-10', -zl(400), {
      categoryId: FOOD,
      splits: [
        { id: nextId(), amount: -zl(200), categoryId: FOOD, refundable: false, memberId: null, advance: false, note: '' },
        { id: nextId(), amount: -zl(200), categoryId: FOOD, refundable: true, memberId: MAREK, advance: false, note: '' }
      ]
    })
    expect(asksImpulse(shared, orders)).toBe(true)
  })

  it('czynsz i rata z ładowni (kontener), wypłata z bankomatu – z definicji zaplanowane: bez pytania', () => {
    expect(asksImpulse(tx('2026-10-10', -zl(1450), { categoryId: RENT, containerId: RENT_BOX, counterparty: 'WSPÓLNOTA MIESZKANIOWA' }), orders)).toBe(false)
    expect(asksImpulse(tx('2026-10-28', -zl(500), { containerId: RENT_BOX, counterparty: 'ROBERT TESTOWY' }), orders)).toBe(false)
    expect(asksImpulse(tx('2026-10-12', -zl(200), { categoryId: CASH_CATEGORY_ID, counterparty: 'BANKOMAT' }), orders)).toBe(false)
    // The same rent without its container: an ordinary purchase – asked.
    expect(asksImpulse(tx('2026-10-10', -zl(1450), { categoryId: RENT }), orders)).toBe(true)
  })
})

describe('R-17: dziennik kapitański z kwotą własną', () => {
  it('plan 1 060,98 zł z częścią domownika 300 zł – w dzienniku 760,98 zł; impuls zakupu domownika – nie mój', () => {
    const plan = tx('2026-10-05', -zl(1060.98), {
      categoryId: FOOD,
      impulse: 'plan',
      splits: [
        { id: nextId(), amount: -zl(760.98), categoryId: FOOD, refundable: false, memberId: null, advance: false, note: '' },
        { id: nextId(), amount: -zl(300), categoryId: FOOD, refundable: true, memberId: ANNA, advance: false, note: '' }
      ]
    })
    const memberImpulse = tx('2026-10-06', -zl(250), { categoryId: FOOD, refundable: true, memberId: ANNA, impulse: 'impulse' })
    const memberUnmarked = tx('2026-10-07', -zl(400), { categoryId: FOOD, refundable: true, memberId: ANNA })
    const mine = tx('2026-10-08', -zl(220), { categoryId: FOOD, impulse: 'impulse' })
    const [m] = logAccuracy([plan, memberImpulse, memberUnmarked, mine], orders, ['2026-10'])
    expect(m).toEqual({ month: '2026-10', plan: { count: 1, amount: zl(760.98) }, impulse: { count: 1, amount: zl(220) }, unmarked: 0 })
  })
})

describe('AF-23: notka zakupu domownika w ciszy nocnej – bez „naruszenia w grze”', () => {
  it('zakup za Annę o 23:30 z wpisem – „member”; mój – naruszenie; plan albo kontener – uzasadniony', () => {
    const night = { time: '23:30', logNote: 'kupione dla Anny' }
    expect(nightVerdict(tx('2026-10-10', -zl(60), { ...night, refundable: true, memberId: ANNA }))).toBe('member')
    expect(nightVerdict(tx('2026-10-10', -zl(60), night))).toBe('violation')
    expect(nightVerdict(tx('2026-10-10', -zl(60), { ...night, impulse: 'plan' }))).toBe('justified')
    expect(nightVerdict(tx('2026-10-10', -zl(60), { ...night, containerId: RENT_BOX }))).toBe('justified')
  })
})

describe('SW sp. 3: domownik „pytaj” bez wartości domyślnej (szybki wpis)', () => {
  it('reszta ponad dług czeka na wybór; wybrana, zapamiętana albo całość na spłatę – nic do pytania', () => {
    expect(restToChoose(zl(150), { owed: zl(100), inflow: 'ask' }, false)).toBe(zl(50))
    expect(restToChoose(zl(150), { owed: zl(100), inflow: 'ask' }, true)).toBe(0)
    expect(restToChoose(zl(150), { owed: zl(100), inflow: 'income' }, false)).toBe(0)
    expect(restToChoose(zl(80), { owed: zl(100), inflow: 'ask' }, false)).toBe(0)
    expect(restToChoose(zl(80), undefined, false)).toBe(0)
  })
})

describe('AF-58: „Pokaż zakupy” przy „X: do oddania” – zakupy tej osoby do oddania', () => {
  it('filtr osoby: Anna do oddania i częściowo oddane; nie Marek, nie oddane, nie mój zakup', () => {
    const annaOpen = tx('2026-10-02', -zl(80), { categoryId: FOOD, refundable: true, memberId: ANNA, counterparty: 'A-otwarty' })
    const annaPart = tx('2026-10-03', -zl(50), { categoryId: FOOD, refundable: true, memberId: ANNA, counterparty: 'A-częściowo' })
    const annaPaid = tx('2026-10-04', -zl(30), { categoryId: FOOD, refundable: true, memberId: ANNA, counterparty: 'A-oddany' })
    const marek = tx('2026-10-05', -zl(40), { categoryId: FOOD, refundable: true, memberId: MAREK, counterparty: 'Marek' })
    const mine = tx('2026-10-06', -zl(20), { categoryId: FOOD, counterparty: 'mój' })
    const pay = tx('2026-10-08', zl(55), { kind: 'income', memberId: ANNA, covers: [annaPaid.id, annaPart.id] })
    const all = [annaOpen, annaPart, annaPaid, marek, mine, pay]
    const ledger = settleHousehold(all, { assignFrom: null })
    const ctx = { categories: categoryIndex(settings.categories), accounts: settings.accounts, orders, flags: { repaid: repaidMarks(ledger.purchases) } }
    const shown = (f: OperationsFilter) => all.filter((t) => matchesFilter(t, f, ctx)).map((t) => t.counterparty)
    const filter = (memberId?: string) => ({ ...emptyFilter('2026-10'), period: { kind: 'all' as const }, ...refundablesFilter(memberId) })
    expect(shown(filter(ANNA))).toEqual(['A-otwarty', 'A-częściowo'])
    // Without a member (the bridge's and the radar's „wydatki domowników”): every member's purchase, as before.
    expect(shown(filter())).toEqual(['A-otwarty', 'A-częściowo', 'A-oddany', 'Marek'])
  })
})

describe('SW sp. 9: spłata salda na start – Mostek, Radar i Meldunki mówią to samo', () => {
  const opening = (memberId: string, amount: number) => ({ txId: `opening:${memberId}`, date: '2026-10-01', amount })
  const input = (members: MemberBalance[]): InboxInput => ({
    today: '2026-10-20',
    started: true,
    deliveries: [],
    conflicts: 0,
    problems: 0,
    uncategorized: { count: 0, amount: 0, from: null },
    duplicates: 0,
    members,
    memberName: () => 'Tata',
    confirmations: [],
    loot: { month: null, amount: 0 },
    money
  })

  it('saldo na start w słowach, nigdy „1 zakup”', () => {
    expect(openText([opening(ANNA, 1)])).toBe('saldo na start rozliczeń')
    expect(openText([opening(ANNA, 1), { txId: 'x' }, { txId: 'y' }])).toBe('2 zakupy i saldo na start rozliczeń')
    expect(openText([{ txId: 'x' }])).toBe('1 zakup')
    expect(openText([])).toBe('')
  })

  it('Tata wpłacił 180 zł na saldo na start (bez wskazania): rozliczony – Meldunki „wyrównał dług”, bez „wskaż zakupy (1 zakup)”', () => {
    const items = inboxItems(input([{ memberId: MAREK, owed: 0, deposit: 0, open: [opening(MAREK, zl(180))], since: null, unassigned: [{ txId: 'p', date: '2026-10-20', amount: zl(180) }] }]))
    expect(items.map((i) => [i.kind, i.text])).toEqual([['repayments', 'Tata: zwrot 180,00 zł z 20.10 wyrównał dług – wskaż, co spłaca: saldo na start rozliczeń.']])
    // A part paid (100 of 180 zł): still owing – the opening balance named, not a purchase.
    const part = inboxItems(input([{ memberId: MAREK, owed: zl(80), deposit: 0, open: [opening(MAREK, zl(180))], since: '2026-10-01', unassigned: [{ txId: 'p', date: '2026-10-20', amount: zl(100) }] }]))
    expect(part.filter((i) => i.kind === 'repayments').map((i) => i.text)).toEqual(['Tata: zwrot 100,00 zł z 20.10 – wskaż, co spłaca (do oddania: saldo na start rozliczeń).'])
  })
})

describe('DM sp. 7: dopisek „zmieni przychód zamkniętego miesiąca” przy każdej wpłacie z zamkniętego miesiąca', () => {
  it('wpłaty z 20.09 i 05.10 przy zakupie z 10.10, dziś listopad – obie z dopiskiem; w październiku – tylko wrześniowa', () => {
    const sep = tx('2026-09-20', zl(100), { kind: 'income', memberId: ANNA, advance: false })
    const oct = tx('2026-10-05', zl(100), { kind: 'income', memberId: ANNA, advance: false })
    const p = tx('2026-10-10', -zl(80), { categoryId: FOOD, refundable: true, memberId: ANNA })
    const p2 = tx('2026-10-11', -zl(80), { categoryId: FOOD, refundable: true, memberId: ANNA })
    const ledger = settleHousehold([sep, oct, p, p2], { assignFrom: null })
    const byId = new Map([sep, oct, p, p2].map((x) => [x.id, x]))
    const flags = (month?: string) =>
      waitingForPurchase(ledger, p, purchaseOf(ledger, p.id)!, (id) => byId.get(id), month)
        .map((w) => [w.date, !!w.fromPriorIncome])
        .sort()
    expect(flags('2026-11')).toEqual([
      ['2026-09-20', true],
      ['2026-10-05', true]
    ])
    expect(flags('2026-10')).toEqual([
      ['2026-09-20', true],
      ['2026-10-05', false]
    ])
  })
})
