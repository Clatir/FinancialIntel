import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { resolveBrand } from '@shared/import/aliases'
import { classifyRow, upsertRule, upsertRules, type LearnedRule } from '@shared/import/classify'
import { findDuplicates, mergeDuplicate } from '@shared/import/duplicates'
import { splitDescription, type MbankFile, type MbankRow } from '@shared/import/mbank'
import { buildImport, counterpartySimilarity, importGroups, planImport, similarCounterparty, type ImportChoices, type NewRow } from '@shared/import/reconcile'
import { defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type ImportRule, type Settings, type Transaction } from '@shared/schema'

const AT = '2026-10-01T00:00:00.000Z'
const NOW = '2026-10-17T09:00:00.000Z'
const base = createDefaultSettings(AT).settings
const GROCERIES = defaultCategoryId(1, 1)
const COSMETICS = defaultCategoryId(5, 0)
let seq = 0
const nextId = () => `01K7Q00000000000000000${String(++seq).padStart(4, '0')}`
const zl = (v: number) => Math.round(v * 100)

const CARD = 'ZAKUP PRZY UŻYCIU KARTY W KRAJU'
const row = (o: Partial<MbankRow> & Pick<MbankRow, 'date' | 'amount'>): MbankRow => {
  const operation = o.operation ?? CARD
  const counterparty = o.counterparty ?? ''
  return { line: 1, description: o.description ?? `${counterparty} ${o.title ?? ''} ${operation}`.replace(/\s+/g, ' ').trim(), operation, counterparty, title: '', accountNo: '', category: '', pending: false, balanceAfter: null, ...o }
}
const file = (rows: MbankRow[]): MbankFile => ({ format: 'lista', client: null, account: null, period: null, rows, skipped: [] })
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const banked = (date: string, amount: number, name: string, over: Partial<Transaction> = {}, bank: Record<string, unknown> = {}): Transaction =>
  tx(date, amount, { counterparty: name, bank: { format: 'mbank', key: `mbank:${nextId()}:0`, description: `${name} ${CARD}`, counterparty: name, operation: CARD, category: '', pending: false, importedAt: AT, source: 'lista', ...bank }, ...over })

const choicesOf = (over: Partial<ImportChoices> = {}): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {}, ...over })
function ctxOf(o: { rules?: ImportRule[]; settings?: Settings; locked?: ReadonlySet<string> } = {}) {
  const s = o.settings ?? base
  return { rules: o.rules ?? [], ownNames: ['JAN KAPITAN'], categories: categoryIndex(s.categories), members: s.household.members, ...(o.locked ? { locked: o.locked } : {}) }
}
const rule = (over: Partial<ImportRule>): ImportRule => ({ id: nextId(), match: '', mode: 'exact', direction: 'out', label: '', kind: 'expense', categoryId: null, refundable: false, household: false, memberId: null, counterAccountId: null, learned: true, hits: 1, updatedAt: AT, ...over }) as ImportRule

describe('opis operacji mBanku (1.6.3, grupa O)', () => {
  it('rodzaj operacji kończący się polską literą: „PŁATNOŚĆ …”, „SPRZEDAŻ …” (B105)', () => {
    expect(splitDescription('SKLEP X  PŁATNOŚĆ WEB - KOD MOBILNY')).toMatchObject({ operation: 'PŁATNOŚĆ WEB - KOD MOBILNY', counterparty: 'SKLEP X', title: '' })
    expect(splitDescription('KANTOR  SPRZEDAŻ WALUTY')).toMatchObject({ operation: 'SPRZEDAŻ WALUTY', counterparty: 'KANTOR' })
    // A word going on after the type's start is no type („PRZELEWOWY” is not „PRZELEW”).
    expect(splitDescription('FIRMA PRZELEWOWY  SKLEP').operation).toBe('')
  })

  it('tytuł przelewu z podwójną spacją zostaje tytułem; nazwa w drugiej części tylko gdy bank ją tak pisze (B103)', () => {
    const acc = '12345678901234567890123456'
    expect(splitDescription(`TOMASZ NOWAK, ZA  OBIAD  UL. TESTOWA 1  PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY  ${acc}`)).toMatchObject({ counterparty: 'TOMASZ NOWAK', title: 'ZA OBIAD' })
    expect(splitDescription('ANNA X ., KINO  I POPCORN  BLIK P2P-PRZYCHODZĄCY')).toMatchObject({ counterparty: 'ANNA X', title: 'KINO I POPCORN' })
    // As before: mTransfer („title | name”) and XTB („name, title | name”).
    expect(splitDescription(`Doładowanie telefonu  BLUE MEDIA SPÓŁKA AKCYJNA  PRZELEW ZEWNĘTRZNY WYCHODZĄCY  ${acc}`)).toMatchObject({ counterparty: 'BLUE MEDIA SPÓŁKA AKCYJNA', title: 'Doładowanie telefonu' })
    expect(splitDescription(`XTB SPÓŁKA AKCYJNA PROSTA 67, Withdrawal  XTB SPÓŁKA AKCYJNA  PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY  ${acc}`)).toMatchObject({ counterparty: 'XTB SPÓŁKA AKCYJNA', title: 'Withdrawal' })
    // mTransfer with a comma in its title: the company after it is the name.
    expect(splitDescription(`Zamówienie 123, sklep X  PAYU SPÓŁKA AKCYJNA  PRZELEW ZEWNĘTRZNY WYCHODZĄCY  ${acc}`)).toMatchObject({ counterparty: 'PAYU SPÓŁKA AKCYJNA', title: 'Zamówienie 123, sklep X' })
  })
})

describe('rozpoznanie (1.6.3, grupa O)', () => {
  it('marka „constructor” to marka, nie pole obiektu: reguła „zawiera” nie wywraca planu, decyzja ma klucz (B104)', () => {
    expect(resolveBrand({}, 'constructor')).toBe('constructor')
    expect(resolveBrand({}, 'toString')).toBe('toString')
    const r = row({ date: '2026-10-10', amount: -zl(80), counterparty: 'CONSTRUCTOR POLSKA' })
    const c = classifyRow(r, ctxOf({ rules: [rule({ mode: 'contains', match: 'orlen', categoryId: GROCERIES })] }))
    expect(c.brand.key).toBe('constructor')
    expect(c.target.brand).toBe('constructor')
  })

  it('XTB po kontrahencie; przelew własny i pieniądze domownika z „XTB” w tytule – nie trading (B106)', () => {
    const member = { ...base.household.members[0]!, bankNames: ['ANNA TESTOWA'], inflow: 'income' as const }
    const settings: Settings = { ...base, household: { ...base.household, members: [member] } }
    const decide = (r: MbankRow) => classifyRow(r, ctxOf({ settings })).decision
    expect(decide(row({ date: '2026-10-10', amount: -zl(500), operation: 'PRZELEW WŁASNY', counterparty: 'JAN KAPITAN', title: 'NA PORTFEL XTB' }))).toMatchObject({ kind: 'transfer' })
    expect(decide(row({ date: '2026-10-10', amount: -zl(500), operation: 'PRZELEW WŁASNY', counterparty: '', description: 'NA PORTFEL XTB PRZELEW WŁASNY' }))).toMatchObject({ kind: 'transfer' })
    // Anyone else's money with „XTB” in its title only: not trading.
    expect(decide(row({ date: '2026-10-10', amount: zl(80), operation: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY', counterparty: 'TOMASZ NOWAK', title: 'ZWROT ZA KURS XTB' })).kind).not.toBe('trading')
    expect(decide(row({ date: '2026-10-10', amount: zl(120), operation: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY', counterparty: 'ANNA TESTOWA', title: 'ZWROT ZA KURS XTB' }))).toMatchObject({ kind: 'income', household: true, memberId: member.id })
    expect(decide(row({ date: '2026-10-10', amount: -zl(900), operation: 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY', counterparty: 'XTB SPÓŁKA AKCYJNA', title: 'DEPOSIT' }))).toMatchObject({ kind: 'trading' })
    expect(decide(row({ date: '2026-10-10', amount: -zl(50), counterparty: 'PAYU*XTB' }))).toMatchObject({ kind: 'trading' })
    // A payment operator alone as the counterparty: its title says whose.
    expect(decide(row({ date: '2026-10-10', amount: -zl(60), operation: 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY', counterparty: 'PAYU S.A.', title: 'XTB DEPOSIT 123' }))).toMatchObject({ kind: 'trading' })
    // No counterparty of its own: the description says it.
    expect(decide(row({ date: '2026-10-10', amount: zl(300), operation: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY', counterparty: '', description: 'X-TRADE BROKERS WYPŁATA PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY' }))).toMatchObject({ kind: 'trading' })
  })

  it('reguła do kategorii zarchiwizowanej: bez kategorii, do decyzji (N86)', () => {
    const settings: Settings = { ...base, categories: base.categories.map((c) => (c.id === COSMETICS ? { ...c, archived: true } : c)) }
    const r = row({ date: '2026-10-10', amount: -zl(30), counterparty: 'SKLEPALFA' })
    const decision = classifyRow(r, ctxOf({ settings, rules: [rule({ match: 'sklepalfa', categoryId: COSMETICS })] })).decision
    expect(decision).toMatchObject({ kind: 'expense', categoryId: null, source: 'none', reason: 'kategoria reguły zarchiwizowana – wybierz nową' })
    // Not archived: the rule as before.
    expect(classifyRow(r, ctxOf({ rules: [rule({ match: 'sklepalfa', categoryId: COSMETICS })] })).decision).toMatchObject({ categoryId: COSMETICS, source: 'rule' })
    // A return of goods of the shop waits for the user's category too.
    const back = row({ date: '2026-10-12', amount: zl(30), operation: 'POS ZWROT TOWARU', counterparty: 'SKLEPALFA' })
    expect(classifyRow(back, ctxOf({ settings, rules: [rule({ match: 'sklepalfa', categoryId: COSMETICS })] })).decision).toMatchObject({ kind: 'expense', categoryId: null, source: 'none' })
    expect(classifyRow(back, ctxOf({ rules: [rule({ match: 'sklepalfa', categoryId: COSMETICS })] })).decision).toMatchObject({ kind: 'expense', categoryId: COSMETICS, source: 'rule' })
  })
})

describe('łączenie z wpisami ręcznymi (1.6.3, grupa O)', () => {
  it('podobna nazwa bez słów ogólnych, miast i rodzajów miejsc; jedno wspólne słowo przy innej kwocie – pytaj (B102)', () => {
    expect(similarCounterparty('Poczta Polska', 'ORLEN POLSKA')).toBe(false)
    expect(similarCounterparty('Sklep Ala', 'SKLEP OLA')).toBe(false)
    // A short key or a word of what in the other: only maybe (asked) – never nothing at all.
    expect(counterpartySimilarity('bar', 'BARBERSHOP')).toBe('word')
    expect(counterpartySimilarity('Sklep', 'SKLEP OLA')).toBe('word')
    expect(counterpartySimilarity('Kino', 'KINO MURANOW')).toBe('word')
    // One brand, however short its name („KFC” – the bank's „KFC 1234 WARSZAWA”).
    expect(counterpartySimilarity('KFC', 'KFC 1234 WARSZAWA')).toBe('key')
    expect(counterpartySimilarity('H&M', 'H&M HENNES MAURITZ 123')).toBe('key')
    expect(counterpartySimilarity('Mokka', 'MOKKA KAWIARNIA')).toBe('key')
    expect(counterpartySimilarity('Jan Kowalski', 'KOWALSKI SERWIS')).toBe('word')
    expect(counterpartySimilarity('zara', 'ZARA')).toBe('key')
    // A hand entry of the post office and the bank's Orlen of nearly the amount: not joined.
    const own = tx('2026-10-10', -zl(15), { counterparty: 'Poczta Polska', categoryId: GROCERIES })
    const orlen = row({ date: '2026-10-12', amount: -zl(15.4), counterparty: 'ORLEN POLSKA' })
    expect(planImport(file([orlen]), MBANK_ACCOUNT_ID, [own], ctxOf()).rows[0]!.status).toBe('new')
    // One telling word in common at another amount: joined only when the user ticks it.
    const named = tx('2026-10-10', -zl(100), { counterparty: 'Jan Kowalski' })
    const serwis = row({ date: '2026-10-11', amount: -zl(101), counterparty: 'KOWALSKI SERWIS', operation: 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY' })
    expect(planImport(file([serwis]), MBANK_ACCOUNT_ID, [named], ctxOf()).rows[0]).toMatchObject({ status: 'merge', loose: 'amount', ask: true })
    // A key in the other, one brand: sure.
    const cafe = tx('2026-10-10', -zl(20), { counterparty: 'Mokka' })
    const mokka = row({ date: '2026-10-11', amount: -zl(20.3), counterparty: 'MOKKA KAWIARNIA', operation: 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY' })
    expect(planImport(file([mokka]), MBANK_ACCOUNT_ID, [cafe], ctxOf()).rows[0]).toMatchObject({ status: 'merge', loose: 'amount', ask: false })
    const kfc = tx('2026-10-10', -zl(32), { counterparty: 'KFC' })
    const kfcBank = row({ date: '2026-10-12', amount: -zl(32.8), counterparty: 'KFC 1234 WARSZAWA' })
    expect(planImport(file([kfcBank]), MBANK_ACCOUNT_ID, [kfc], ctxOf()).rows[0]).toMatchObject({ status: 'merge', loose: 'amount', ask: false })
    // A short name in another: asked.
    const bar = tx('2026-10-10', -zl(50), { counterparty: 'bar' })
    const barber = row({ date: '2026-10-12', amount: -zl(51), counterparty: 'BARBERSHOP' })
    expect(planImport(file([barber]), MBANK_ACCOUNT_ID, [bar], ctxOf()).rows[0]).toMatchObject({ status: 'merge', loose: 'amount', ask: true })
  })

  it('operacja zapisana przez nowszą wersję (tylko do odczytu) nie jest łączona ani rozliczana (B95)', () => {
    const own = tx('2026-10-10', -zl(42), { counterparty: 'Lidl' })
    const r = row({ date: '2026-10-10', amount: -zl(42), counterparty: 'LIDL' })
    expect(planImport(file([r]), MBANK_ACCOUNT_ID, [own], ctxOf()).rows[0]!.status).toBe('merge')
    expect(planImport(file([r]), MBANK_ACCOUNT_ID, [own], ctxOf({ locked: new Set([own.id]) })).rows[0]!.status).toBe('new')
    const pending = banked('2026-10-08', -zl(46), 'SHOP ABROAD', {}, { pending: true })
    const settled = row({ date: '2026-10-10', amount: -zl(47.2), counterparty: 'SHOP ABROAD' })
    const plan = planImport({ ...file([settled]), period: { from: '2026-10-01', to: '2026-10-15' } }, MBANK_ACCOUNT_ID, [pending], ctxOf({ locked: new Set([pending.id]) }))
    expect(plan.rows[0]!.status).toBe('new')
    // Never offered for removal as gone from the bank either (it cannot be removed).
    expect(plan.vanished).toEqual([])
    expect(planImport({ ...file([]), period: { from: '2026-10-01', to: '2026-10-15' } }, MBANK_ACCOUNT_ID, [pending], ctxOf()).vanished.map((t) => t.id)).toEqual([pending.id])
  })

  it('usunięta nierozliczona, rozliczona przez bank inną kwotą i dniem, nie wraca (B96)', () => {
    const settled = row({ date: '2026-10-12', amount: -zl(46.12), counterparty: 'HOTEL ROMA' })
    const gone = [{ accountId: MBANK_ACCOUNT_ID, date: '2026-10-10', amount: -zl(45.99), name: 'HOTEL ROMA', deletedAt: '2026-10-11T10:00:00.000Z' }]
    expect(planImport(file([settled]), MBANK_ACCOUNT_ID, [], ctxOf(), new Set(), gone).rows[0]!.status).toBe('deleted')
    // Another account's, another shop's, or the deleted one taken already: in.
    expect(planImport(file([settled]), MBANK_ACCOUNT_ID, [], ctxOf(), new Set(), [{ ...gone[0]!, accountId: 'X' }]).rows[0]!.status).toBe('new')
    expect(planImport(file([settled]), MBANK_ACCOUNT_ID, [], ctxOf(), new Set(), [{ ...gone[0]!, name: 'APTEKA' }]).rows[0]!.status).toBe('new')
    const twice = [settled, { ...settled, line: 2, date: '2026-10-13' }]
    expect(planImport(file(twice), MBANK_ACCOUNT_ID, [], ctxOf(), new Set(), gone).rows.map((p) => p.status)).toEqual(['deleted', 'new'])
    // The closest pair, not the first row: a purchase of the same shop before the settled row in the file comes in.
    const before = row({ date: '2026-10-09', amount: -zl(49), counterparty: 'HOTEL ROMA' })
    expect(planImport(file([before, settled]), MBANK_ACCOUNT_ID, [], ctxOf(), new Set(), gone).rows.map((p) => p.status)).toEqual(['new', 'deleted'])
  })

  it('wiersz usuniętej nierozliczonej wpuszczony wcześniej („importuj mimo to”) zabiera ją – inny zakup tego sklepu wchodzi (B96)', () => {
    const gone = [{ accountId: MBANK_ACCOUNT_ID, date: '2026-10-10', amount: -zl(12.5), name: 'ZABKA' }]
    const settled = row({ date: '2026-10-11', amount: -zl(12.5), counterparty: 'ZABKA' })
    const other = row({ date: '2026-10-12', amount: -zl(12), counterparty: 'ZABKA' })
    // The settled row brought back in an import after the deletion: known now – the next purchase is no deleted one.
    const first = buildImport(planImport(file([settled]), MBANK_ACCOUNT_ID, [], ctxOf()), choicesOf(), { now: '2026-10-12T08:00:00.000Z', makeId: nextId, rules: [] }).create
    const later = planImport(file([settled, other]), MBANK_ACCOUNT_ID, first, ctxOf(), new Set(), [{ ...gone[0]!, deletedAt: '2026-10-11T20:00:00.000Z' }])
    expect(later.rows.map((p) => p.status)).toEqual(['known', 'new'])
    // An operation of the budget from before the deletion is no row brought back: it takes nothing.
    const older = planImport(file([settled, other]), MBANK_ACCOUNT_ID, first, ctxOf(), new Set(), [{ ...gone[0]!, deletedAt: '2026-10-12T20:00:00.000Z' }])
    expect(older.rows.map((p) => p.status)).toEqual(['known', 'deleted'])
  })

  it('rozliczenie i scalenie z inną kwotą przeskalowują podział paragonu – udział domownika zostaje jego (B99)', () => {
    const lines = (t: Transaction) => t.splits.map((x) => [x.amount, x.refundable])
    const split = (amount: number) => [
      { id: nextId(), amount: amount / 2, categoryId: GROCERIES, refundable: false, memberId: null, advance: false, note: '' },
      { id: nextId(), amount: amount / 2, categoryId: GROCERIES, refundable: true, memberId: HOUSE_MEMBER_ID, advance: false, note: '' }
    ]
    const pending = banked('2026-10-08', -zl(100), 'SHOP ABROAD', { kind: 'expense', splits: split(-zl(100)) }, { pending: true })
    const settled = row({ date: '2026-10-10', amount: -zl(105), counterparty: 'SHOP ABROAD' })
    const plan = planImport(file([settled]), MBANK_ACCOUNT_ID, [pending], ctxOf())
    expect(plan.rows[0]!.status).toBe('settle')
    const after = buildImport(plan, choicesOf(), { now: NOW, makeId: nextId, rules: [] }).update[0]!
    expect([after.amount, lines(after)]).toEqual([-zl(105), [[-zl(52.5), false], [-zl(52.5), true]]])
    // A duplicate merged: the hand entry's lines follow the bank's amount.
    const own = tx('2026-10-10', -zl(100), { counterparty: 'Shop', splits: split(-zl(100)) })
    const copy = banked('2026-10-10', -zl(101), 'SHOP')
    expect(lines(mergeDuplicate(own, [copy], 'manual', NOW))).toEqual([[-zl(50.5), false], [-zl(50.5), true]])
  })

  it('panel duplikatów: możliwy duplikat jak w imporcie – jedno słowo przy innej kwocie pyta; operacja banku bez nazwy porównana opisem (N88, N89)', () => {
    const own = tx('2026-10-10', -zl(100), { counterparty: 'Jan Kowalski' })
    const copy = banked('2026-10-11', -zl(101), 'KOWALSKI SERWIS', {}, { operation: 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY', description: 'KOWALSKI SERWIS PRZELEW ZEWNĘTRZNY WYCHODZĄCY' })
    expect(findDuplicates([own, copy], [])).toEqual([expect.objectContaining({ kind: 'manual', differs: 'amount', ask: true })])
    // The same amount under a similar name: the import's sure join – ticked.
    const exact = banked('2026-10-11', -zl(100), 'KOWALSKI SERWIS')
    expect(findDuplicates([own, exact], [])[0]!.ask).toBeUndefined()
    // A bank's fee without a name is no copy of a coffee typed by hand.
    const coffee = tx('2026-10-10', -zl(5.1), { counterparty: 'Kawa na stacji' })
    const fee = banked('2026-10-11', -zl(5), '', { counterparty: '' }, { counterparty: '', operation: 'PROWIZJA ZA PRZELEW NATYCHMIASTOWY', description: 'PROWIZJA ZA PRZELEW NATYCHMIASTOWY' })
    expect(findDuplicates([coffee, fee], [])).toEqual([])
  })
})

describe('liczniki i usunięte wiersze (1.6.3, grupa O)', () => {
  it('nierozliczona rozliczona z tą samą treścią liczy się jako rozliczona, jak w podglądzie (N77)', () => {
    const r = row({ date: '2026-10-10', amount: -zl(30), counterparty: 'ZABKA' })
    const first = buildImport(planImport(file([{ ...r, pending: true }]), MBANK_ACCOUNT_ID, [], ctxOf()), choicesOf(), { now: NOW, makeId: nextId, rules: [] }).create
    const plan = planImport(file([r]), MBANK_ACCOUNT_ID, first, ctxOf())
    expect(plan.rows[0]).toMatchObject({ status: 'known', settled: true })
    expect(buildImport(plan, choicesOf(), { now: NOW, makeId: nextId, rules: [] }).counts).toMatchObject({ settled: 1, known: 0 })
  })

  it('wiersz usuniętej operacji „importuj mimo to” trafia do grup i tematów – z decyzją grupy i tematu (N90)', () => {
    const r = row({ date: '2026-10-10', amount: -zl(12), counterparty: 'KIOSK RUCH' })
    const plan = planImport(file([r]), MBANK_ACCOUNT_ID, [], ctxOf(), new Set(planImport(file([r]), MBANK_ACCOUNT_ID, [], ctxOf()).rows.map((p) => p.key)))
    expect(plan.rows[0]!.status).toBe('deleted')
    expect(importGroups(plan)).toEqual([])
    const key = plan.rows[0]!.key
    const groups = importGroups(plan, { [key]: true })
    expect(groups.map((g) => g.rows.map((p: NewRow) => p.key))).toEqual([[key]])
    const choice = { kind: 'expense' as const, categoryId: GROCERIES, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    const created = (over: Partial<ImportChoices>) => buildImport(plan, choicesOf({ restoreDeleted: { [key]: true }, ...over }), { now: NOW, makeId: nextId, rules: [] }).create.map((t) => [t.amount, t.categoryId])
    expect(created({ groups: { [groups[0]!.group]: choice } })).toEqual([[-zl(12), GROCERIES]])
    // Decided by its theme as every new row of it.
    expect(created({ themes: { [groups[0]!.theme]: choice } })).toEqual([[-zl(12), GROCERIES]])
  })
})

describe('reguły (1.6.3, grupa O)', () => {
  it('wiele marek naraz jak po kolei: jedna kopia listy, te same id, trafienia i decyzje (W35)', () => {
    const rules = [rule({ match: 'alfa', categoryId: GROCERIES, hits: 2 }), rule({ match: 'beta', mode: 'contains', categoryId: GROCERIES }), rule({ match: 'beta', direction: 'in', kind: 'income' })]
    const learned = (match: string, categoryId: string): LearnedRule => ({ match, direction: 'out', label: match, kind: 'expense', categoryId, refundable: false, household: false, memberId: null, counterAccountId: null })
    const items = [
      { rule: learned('alfa', COSMETICS), hits: 3 },
      { rule: learned('beta', COSMETICS), hits: 1 },
      { rule: learned('beta', GROCERIES), hits: 4 }
    ]
    const maker = () => {
      let n = 0
      return () => `01K7Q0000000000000000RUL${String(++n).padStart(2, '0')}`
    }
    const one = maker()
    const sequential = items.reduce((rs, it) => upsertRule(rs, it.rule, { now: NOW, makeId: one, hits: it.hits }), rules)
    const batched = upsertRules(rules, items, { now: NOW, makeId: maker() })
    expect(batched).toEqual(sequential)
    expect(batched.map((r) => [r.match, r.mode, r.direction, r.categoryId, r.hits])).toEqual([
      ['alfa', 'exact', 'out', COSMETICS, 5],
      ['beta', 'contains', 'out', GROCERIES, 1],
      ['beta', 'exact', 'in', null, 1],
      ['beta', 'exact', 'out', GROCERIES, 5]
    ])
  })
})
