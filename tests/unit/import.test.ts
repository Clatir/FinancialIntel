import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { computeFleet } from '@shared/calc/fleet'
import { createDefaultSettings } from '@shared/defaults'
import { classifyRow, counterpartyKey, hintFor, isOwnName, matchRule, upsertRule } from '@shared/import/classify'
import { accountNumberOf, parseMbank, type MbankFile, type MbankRow } from '@shared/import/mbank'
import { findDuplicates, mergeDuplicate } from '@shared/import/duplicates'
import { addDays } from '@shared/calc/dates'
import { buildImport, choiceOf, importGroups, importThemes, planImport, similarCounterparty, type ImportChoices, type ImportPlan, type NewRow } from '@shared/import/reconcile'
import { decodeText } from '@shared/import/text'
import { CASH_CATEGORY_ID, defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type ImportRule, type Transaction } from '@shared/schema'
import { settleHousehold } from '@shared/calc/household'

const FIXTURE = join(__dirname, '..', 'fixtures', 'mbank', 'lista_operacji.csv')
const fixture = (): MbankFile => parseMbank(decodeText(new Uint8Array(readFileSync(FIXTURE))))
const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const categories = categoryIndex(settings.categories)
const NOW = '2026-10-17T09:00:00.000Z'
let seq = 0
const makeId = () => `01K1${String(++seq).padStart(22, '0')}`
const ctx = (rules: ImportRule[] = [], ownNames: string[] = ['JAN KAPITAN']) => ({ rules, ownNames, categories })
const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })
/** The group of a brand's new rows in the plan (one proposal in the file). */
const groupOf = (plan: ImportPlan, brand: string, direction: 'in' | 'out') => plan.rows.find((p): p is NewRow => p.status === 'new' && p.brand === brand && p.direction === direction)!.group

const AUTO = defaultCategoryId(3)
const GROCERIES = defaultCategoryId(1, 1)

/** Import a file into `existing` with the decisions as proposed (plus `choices`): the operations after it. */
function runImport(file: MbankFile, existing: Transaction[], choices: ImportChoices = emptyChoices(), rules: ImportRule[] = [], house = 0) {
  const plan = planImport(file, MBANK_ACCOUNT_ID, existing, ctx(rules))
  const result = buildImport(plan, choices, { now: NOW, makeId, rules })
  const byId = new Map(existing.map((t) => [t.id, t]))
  for (const t of result.update) byId.set(t.id, t)
  for (const id of result.remove) byId.delete(id)
  for (const t of result.create) byId.set(t.id, t)
  return { plan, result, after: [...byId.values()] }
}

const withRows = (file: MbankFile, rows: MbankRow[]): MbankFile => ({ ...file, rows })
const counts = (plan: ImportPlan) => plan.rows.reduce<Record<string, number>>((m, p) => ({ ...m, [p.status]: (m[p.status] ?? 0) + 1 }), {})

describe('rozpoznawanie wierszy', () => {
  it('klucz kontrahenta: bez form prawnych, numerów sklepów i znaków', () => {
    expect(counterpartyKey('AUTOMATSPEC Sp. z o.o.')).toBe('automatspec')
    expect(counterpartyKey('AUTOMAT SPEC')).toBe('automatspec')
    expect(counterpartyKey('DINO TESTOWO 4')).toBe('dinotestowo')
    expect(counterpartyKey('KURS JEZYKOWY SPOLKA Z O')).toBe('kursjezykowy')
    expect(counterpartyKey('XTB SPÓŁKA AKCYJNA')).toBe('xtb')
    expect(counterpartyKey('Chess.com 800-318-2827')).toBe('chesscom')
    expect(counterpartyKey('SCHRONISKO TESTOWE12345')).toBe('schroniskotestowe')
    expect(counterpartyKey('Żabka')).toBe('zabka')
    expect(similarCounterparty('Biedronka', 'BIEDRONKA 1234')).toBe(true)
    expect(similarCounterparty('', 'Bolt')).toBe(true)
    expect(similarCounterparty('Lidl', 'Żabka')).toBe(false)
  })

  it('XTB, przelew własny (imię i nazwisko z pliku), zwrot towaru, bankomat; kategoria mBanku tylko jako podpowiedź', () => {
    const f = fixture()
    const kinds = (text: string) => classifyRow(f.rows.find((r) => r.description.includes(text))!, ctx()).decision
    expect(kinds('xtb.com')).toMatchObject({ kind: 'trading', source: 'builtin' })
    expect(kinds('Withdrawal from')).toMatchObject({ kind: 'trading' })
    expect(kinds('JAN KAPITAN, PRZELEW')).toMatchObject({ kind: 'transfer', reason: 'przelew własny' })
    expect(kinds('Wyjście na paintball')).toMatchObject({ kind: 'income', source: 'none' })
    // A return without a rule of the purchases: the chain's category (KOLEO → Auto · przejazdy).
    expect(kinds('ZWROT ZAKUPU')).toMatchObject({ kind: 'expense', reason: 'zwrot towaru – sieć KOLEO', categoryId: defaultCategoryId(3, 5), source: 'brand' })
    expect(kinds('TOMASZ xxx, PRZELEW')).toMatchObject({ kind: 'income', source: 'none' })
    // A chain of the dictionary (1.2.1): Bolt – going out as the starter rule says (D69), even without the rule.
    expect(kinds('Bolt')).toMatchObject({ kind: 'expense', categoryId: defaultCategoryId(6), source: 'brand', reason: 'sieć Bolt' })
    // mBank calls XTB „Ubezpieczenia”: no hint; its categories only hint, never applied by themselves (Allegro sells
    // everything – no category of the dictionary either).
    expect(hintFor('Ubezpieczenia', categories)).toBeNull()
    const lidl = classifyRow(f.rows.find((r) => r.counterparty === 'LIDL')!, ctx())
    expect(lidl.hint).toBe(GROCERIES)
    expect(lidl.decision).toMatchObject({ categoryId: GROCERIES, source: 'brand' })
    const allegro = classifyRow(f.rows.find((r) => r.counterparty === 'Allegro')!, ctx())
    expect(allegro.hint).toBe(defaultCategoryId(8))
    expect(allegro.decision).toMatchObject({ categoryId: null, source: 'none' })
    expect(allegro.brand.key).toBe('allegro')
    expect(hintFor('Wypłata gotówki', categories)).toBe(CASH_CATEGORY_ID)
    expect(isOwnName('KAPITAN JAN', ['Jan Kapitan'])).toBe(true)
    expect(isOwnName('JAN NOWAK', ['Jan Kapitan'])).toBe(false)
  })

  it('reguła zapamiętana drugi raz: to samo id, licznik trafień, nowa decyzja', () => {
    const one = upsertRule([], { match: 'bolt', direction: 'out', label: 'Bolt', kind: 'expense', categoryId: AUTO, refundable: false, household: false, memberId: null, counterAccountId: null }, { now: NOW, makeId, hits: 3 })
    const two = upsertRule(one, { match: 'bolt', direction: 'out', label: 'Bolt', kind: 'expense', categoryId: GROCERIES, refundable: false, household: false, memberId: null, counterAccountId: null }, { now: NOW, makeId, hits: 2 })
    expect(two).toHaveLength(1)
    expect(two[0]).toMatchObject({ id: one[0]!.id, categoryId: GROCERIES, hits: 5, learned: true, mode: 'exact' })
    expect(upsertRule(two, { ...two[0]!, direction: 'in' }, { now: NOW, makeId, hits: 1 })).toHaveLength(2)
    // The decision is the new one whole (D83): a rule learned as shared or as a gift and remembered again without – none.
    const shared = upsertRule(two, { ...two[0]!, share: { mode: 'equal', lines: [{ memberId: null, value: 0, gift: false }, { memberId: makeId(), value: 0, gift: true }] } }, { now: NOW, makeId, hits: 1 })
    expect(shared[0]!.share).toBeTruthy()
    const plain = upsertRule(shared, { match: 'bolt', direction: 'out', label: 'Bolt', kind: 'expense', categoryId: AUTO, refundable: false, household: false, memberId: null, counterAccountId: null }, { now: NOW, makeId, hits: 1 })
    expect(plain[0]!.share).toBeUndefined()
    const gift = upsertRule(plain, { ...plain[0]!, refundable: true, memberId: makeId(), gift: true }, { now: NOW, makeId, hits: 1 })
    expect(upsertRule(gift, { ...gift[0]!, gift: undefined }, { now: NOW, makeId, hits: 1 })[0]!.gift).toBeUndefined()
  })

  it('reguły: dokładny klucz przed „zawiera”, kierunek, zwrot towaru z kategorią zakupów', () => {
    const rule = (over: Partial<ImportRule>): ImportRule => ({ id: makeId(), match: 'bolt', mode: 'exact', direction: 'out', label: 'Bolt', kind: 'expense', categoryId: AUTO, refundable: false, household: false, memberId: null, counterAccountId: null, learned: true, hits: 1, updatedAt: NOW, ...over })
    const rules = [rule({}), rule({ match: 'koleo', categoryId: defaultCategoryId(6, 3) }), rule({ match: 'klinika', mode: 'contains', categoryId: defaultCategoryId(5, 2) })]
    expect(matchRule(rules, 'bolt', 'out')?.categoryId).toBe(AUTO)
    expect(matchRule(rules, 'bolt', 'in')).toBeNull()
    expect(matchRule(rules, 'klinikaonline', 'out')?.categoryId).toBe(defaultCategoryId(5, 2))
    const f = fixture()
    const refund = classifyRow(f.rows.find((r) => r.operation === 'ZWROT ZAKUPU')!, ctx(rules)).decision
    expect(refund).toMatchObject({ kind: 'expense', categoryId: defaultCategoryId(6, 3), source: 'rule' })
  })
})

describe('ładownia w imporcie', () => {
  it('płatność kontrahenta kontenera należy do ładowni: kontener i jego kategoria, reguła wygrywa z kategorią', () => {
    const file = fixture()
    const containers = [{ id: '01K6H3Z0W8Q4M2N5P7R9S1T3V1', name: 'Spotify', counterparty: 'SPOTIFY', categoryId: defaultCategoryId(7, 3), archived: false }]
    const spotify = file.rows.find((r) => r.counterparty === 'Spotify' && r.amount < 0)!
    expect(classifyRow(spotify, { ...ctx(), containers }).decision).toMatchObject({ containerId: containers[0]!.id, categoryId: defaultCategoryId(7, 3), reason: 'opłata z ładowni: Spotify' })
    const rule: ImportRule = { id: '01K6H3Z0W8Q4M2N5P7R9S1T3V2', match: 'spotify', mode: 'exact', direction: 'out', label: 'Spotify', kind: 'expense', categoryId: defaultCategoryId(6, 2), refundable: false, household: false, memberId: null, counterAccountId: null, learned: true, hits: 1, updatedAt: NOW }
    expect(classifyRow(spotify, { ...ctx([rule]), containers }).decision).toMatchObject({ containerId: containers[0]!.id, categoryId: defaultCategoryId(6, 2), source: 'rule' })
    // An archived container, or money in from that counterparty: no link.
    expect(classifyRow(spotify, { ...ctx(), containers: [{ ...containers[0]!, archived: true }] }).decision.containerId).toBeNull()
    const plan = planImport(withRows(file, [spotify]), MBANK_ACCOUNT_ID, [], { ...ctx(), containers })
    expect(buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] }).create[0]).toMatchObject({ containerId: containers[0]!.id, kind: 'expense' })
  })
})

describe('import: plan, zapis, kolejne importy', () => {
  it('pierwszy import pliku użytkownika: 269 nowych operacji w grupach marek i tematach; drugi import tego samego – nic nowego', () => {
    const f = fixture()
    const { plan, result, after } = runImport(f, [])
    expect(counts(plan)).toEqual({ new: 269 })
    expect(result.counts).toMatchObject({ created: 269, merged: 0, settled: 0, known: 0 })
    const groups = importGroups(plan)
    expect(groups.find((g) => g.brand === 'bolt')?.rows).toHaveLength(26)
    // One chain, one group: Allegro under three names.
    expect(groups.find((g) => g.brand === 'allegro')?.names).toEqual(expect.arrayContaining(['Allegro', 'ALLEGRO.PL', 'PAYPRO SA *ALLEGRO']))
    expect(groups.length).toBeLessThan(80)
    expect(importThemes(groups).length).toBeLessThan(40)
    // Every operation: mBank, no time (an import has none), the bank's row kept.
    for (const t of after) {
      expect(t.time).toBeNull()
      expect(t.bank?.key).toMatch(/^mbank:[0-9a-f]{16}:\d+$/)
    }
    expect(after.filter((t) => t.bank?.pending)).toHaveLength(5)
    expect(after.filter((t) => t.kind === 'trading').length).toBe(26)
    const again = runImport(f, after)
    expect(counts(again.plan)).toEqual({ known: 269 })
    expect(again.result.create).toEqual([])
    expect(again.result.update).toEqual([])
    // Balances: the sum of the file.
    const total = f.rows.reduce((s, r) => s + r.amount, 0)
    expect(computeFleet({ settings, transactions: after, now: NOW }).accounts.find((a) => a.id === MBANK_ACCOUNT_ID)?.balance).toBe(total)
  })

  it('kolejny import po 2–3 dniach: nierozliczone już rozliczone, zmiana kwoty po przewalutowaniu, zniknięta autoryzacja', () => {
    const f = fixture()
    const first = runImport(f, []).after
    const rows = f.rows.map((r) => ({ ...r }))
    // The first row (SKLEP REMONTOWY, pending) settled as it was.
    rows[0]!.pending = false
    // A pending Bolt settled with another amount (a card payment converted later).
    const bolt = rows.findIndex((r) => r.pending && r.counterparty === 'Bolt' && r.amount === -3938)
    rows[bolt] = { ...rows[bolt]!, pending: false, amount: -3961 }
    // A pending AUTOMATSPEC is gone (a cancelled authorization).
    const gone = rows.findIndex((r) => r.pending && r.description.startsWith('AUTOMATSPEC Sp.'))
    rows.splice(gone, 1)
    const next = runImport(withRows(f, rows), first, { ...emptyChoices(), removeVanished: {} })
    expect(counts(next.plan)).toEqual({ known: 267, settle: 1 })
    expect(next.plan.vanished.map((t) => t.counterparty)).toEqual(['AUTOMATSPEC Sp. z o.o.'])
    const settledFirst = next.after.find((t) => t.counterparty === 'SKLEP REMONTOWY')!
    expect(settledFirst.bank?.pending).toBe(false)
    const settledBolt = next.after.filter((t) => t.counterparty === 'Bolt' && t.date === '2025-10-16')
    expect(settledBolt.map((t) => [t.amount, t.bank?.pending]).sort()).toEqual([
      [-3961, false],
      [-58, true]
    ])
    // Removing the vanished one on the user's choice.
    const removed = runImport(withRows(f, rows), first, { ...emptyChoices(), removeVanished: { [next.plan.vanished[0]!.id]: true } })
    expect(removed.result.remove).toEqual([next.plan.vanished[0]!.id])
  })

  it('łączenie z wpisem ręcznym (kwota, data ±3 dni, kontrahent): zostaje kategoria i godzina użytkownika, dane z banku', () => {
    const f = fixture()
    const manual = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: NOW, updatedAt: NOW, date: '2025-10-02', time: '18:40', accountId: MBANK_ACCOUNT_ID, amount: -1616, counterparty: 'Biedronka', categoryId: GROCERIES, note: 'chleb' })
    // Another manual entry: a different shop with the same amount and date – stays apart.
    const other = transactionSchema.parse({ ...manual, id: makeId(), counterparty: 'Lidl', note: '' })
    const { plan, after } = runImport(f, [manual, other])
    expect(counts(plan)).toEqual({ new: 268, merge: 1 })
    const merged = after.find((t) => t.id === manual.id)!
    expect(merged).toMatchObject({ date: '2025-10-03', time: '18:40', amount: -1616, categoryId: GROCERIES, note: 'chleb', counterparty: 'Biedronka' })
    expect(merged.bank?.description).toContain('Biedronka')
    expect(after.find((t) => t.id === other.id)?.bank).toBeNull()
    // „Nie łącz”: the row comes in as a new operation, the manual one stays.
    const apart = runImport(f, [manual], { ...emptyChoices(), noMerge: { [plan.rows.find((p) => p.status === 'merge')!.key]: true } })
    expect(apart.after).toHaveLength(270)
  })

  it('decyzje grupowe uczą reguły; następny import kategoryzuje sam; domownik spłaca należność domu', () => {
    const f = fixture()
    const plan = planImport(f, MBANK_ACCOUNT_ID, [], ctx())
    const choices = emptyChoices()
    const boltGroup = groupOf(plan, 'bolt', 'out')
    choices.groups[boltGroup] = { kind: 'expense', categoryId: AUTO, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    choices.remember[boltGroup] = true
    const tomasz = groupOf(plan, 'tomaszxxx', 'in')
    choices.groups[tomasz] = { kind: 'income', categoryId: null, refundable: false, household: true, memberId: null, advance: false, counterAccountId: null }
    choices.remember[tomasz] = true
    // One row of the group decided apart (a row override wins over the group).
    const oneBolt = plan.rows.find((p) => p.status === 'new' && p.group === boltGroup)!
    choices.rows[oneBolt.key] = { kind: 'expense', categoryId: defaultCategoryId(6, 3), refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    const result = buildImport(plan, choices, { now: NOW, makeId, rules: [] })
    expect(result.rules.map((r) => [r.match, r.direction, r.kind, r.categoryId, r.household]).sort()).toEqual([
      ['bolt', 'out', 'expense', AUTO, false],
      ['tomaszxxx', 'in', 'income', null, true]
    ])
    const bolts = result.create.filter((t) => t.counterparty === 'Bolt')
    expect(bolts.filter((t) => t.categoryId === AUTO)).toHaveLength(bolts.length - 1)
    // The household member's money says whose it is (D80); with 100 zł owed before the file (a purchase for the house)
    // the ledger has the earliest payments repay it (D20), the rest is income.
    const payments = result.create.filter((t) => t.counterparty === 'TOMASZ xxx' && t.memberId)
    expect(payments.length).toBeGreaterThan(0)
    expect(payments.every((t) => t.memberId === HOUSE_MEMBER_ID && !t.advance && t.repaid === 0)).toBe(true)
    const owed = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: NOW, updatedAt: NOW, date: '2025-08-01', accountId: MBANK_ACCOUNT_ID, kind: 'expense', amount: -10000, refundable: true })
    const ledger = settleHousehold([owed, ...result.create])
    const first = payments.map((t) => t.date).sort()[0]
    expect(first).toBe('2025-08-08')
    const repaid = payments.map((t) => ({ date: t.date, repaid: ledger.byTx.get(t.id)![0]!.repaid })).filter((p) => p.repaid > 0)
    expect(repaid.every((p) => p.date === first)).toBe(true)
    expect(repaid.reduce((s, p) => s + p.repaid, 0)).toBe(10000)
    expect(ledger.owed).toBe(0)
    // The rule decides the next file by itself.
    const next = planImport(f, MBANK_ACCOUNT_ID, [], ctx(result.rules))
    const bolt = next.rows.find((p) => p.status === 'new' && p.row.counterparty === 'Bolt')
    expect(bolt?.status === 'new' && bolt.decision).toMatchObject({ kind: 'expense', categoryId: AUTO, source: 'rule' })
    expect(choiceOf(bolt!.status === 'new' ? bolt!.decision : (undefined as never)).categoryId).toBe(AUTO)
  })

  it('usunięta operacja z banku nie wraca przy kolejnym imporcie (chyba że „importuj mimo to”)', () => {
    const f = fixture()
    const first = runImport(f, []).after
    const gone = first.find((t) => t.counterparty === 'SKLEP REMONTOWY')!
    const left = first.filter((t) => t.id !== gone.id)
    const plan = planImport(f, MBANK_ACCOUNT_ID, left, ctx(), new Set([gone.bank!.key]))
    expect(counts(plan)).toEqual({ known: 268, deleted: 1 })
    expect(buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] }).counts).toMatchObject({ created: 0, skipped: 1 })
    const back = buildImport(plan, { ...emptyChoices(), restoreDeleted: { [gone.bank!.key]: true } }, { now: NOW, makeId, rules: [] })
    expect(back.create.map((t) => t.counterparty)).toEqual(['SKLEP REMONTOWY'])
  })

  it('zakup „do zwrotu” i wpłata domownika w jednym pliku: wpłata spłaca należność w kolejności dat', () => {
    const f = fixture()
    const plan = planImport(f, MBANK_ACCOUNT_ID, [], ctx())
    const choices = emptyChoices()
    // Allegro (out) for the house, Tomasz (in) a household member: nothing open before the file.
    choices.groups[groupOf(plan, 'allegro', 'out')] = { kind: 'expense', categoryId: null, refundable: true, household: false, memberId: null, advance: false, counterAccountId: null }
    choices.groups[groupOf(plan, 'tomaszxxx', 'in')] = { kind: 'income', categoryId: null, refundable: false, household: true, memberId: null, advance: false, counterAccountId: null }
    const result = buildImport(plan, choices, { now: NOW, makeId, rules: [] })
    const bought = result.create.filter((t) => /allegro/i.test(t.counterparty)).reduce((s, t) => s - t.amount, 0)
    const ledger = settleHousehold(result.create)
    const repaid = result.create.filter((t) => t.counterparty === 'TOMASZ xxx').reduce((s, t) => s + (ledger.byTx.get(t.id)?.[0]?.repaid ?? 0), 0)
    expect(bought).toBeGreaterThan(0)
    expect(repaid).toBe(bought)
    // The engine agrees: nothing stays owed.
    expect(computeFleet({ settings: { ...settings, budget: { start: '2025-08-01', initial: null } }, transactions: result.create, now: NOW }).receivables.house).toBe(0)
  })

  it('historia rachunku nie pokazuje nierozliczonych: nic nie „znika”; nazwa z banku po rozliczeniu zmienia się tylko, gdy jej nie poprawiłeś', () => {
    const f = fixture()
    const first = runImport(f, []).after
    const historia: MbankFile = { ...f, format: 'historia', rows: f.rows.filter((r) => !r.pending) }
    expect(planImport(historia, MBANK_ACCOUNT_ID, first, ctx()).vanished).toEqual([])
    const rows = f.rows.map((r) => (r.pending && r.counterparty === 'SKLEP REMONTOWY' ? { ...r, pending: false, amount: r.amount - 10, counterparty: 'SKLEP REMONTOWY SP Z O O' } : r))
    const settled = runImport(withRows(f, rows), first)
    expect(settled.after.find((t) => t.bank?.counterparty === 'SKLEP REMONTOWY SP Z O O')?.counterparty).toBe('SKLEP REMONTOWY SP Z O O')
    const renamed = first.map((t) => (t.counterparty === 'SKLEP REMONTOWY' ? { ...t, counterparty: 'Remont łazienki' } : t))
    const kept = runImport(withRows(f, rows), renamed)
    expect(kept.after.find((t) => t.bank?.counterparty === 'SKLEP REMONTOWY SP Z O O')?.counterparty).toBe('Remont łazienki')
  })
})

describe('lista operacji i historia rachunku: ta sama operacja z dwóch formatów (B5)', () => {
  /** The account history of the same operations: the type of operation first, then the name and the title; booked rows only. */
  const asHistoria = (f: MbankFile): MbankFile => ({
    ...f,
    format: 'historia',
    rows: f.rows.filter((r) => !r.pending).map((r) => ({ ...r, description: [r.operation, r.counterparty, r.title].filter(Boolean).join(' ') }))
  })
  const booked = (f: MbankFile) => withRows(f, f.rows.filter((r) => !r.pending))
  /** As before 1.4.2: the file's format not written; `importedAt` – the import's moment (each file its own). */
  const legacy = (txs: Transaction[], importedAt = NOW) => txs.map((t) => ({ ...t, bank: { ...t.bank!, source: undefined, importedAt } }))

  it('historia po liście: te same operacje rozpoznane, nic drugi raz; klucz drugiego formatu zapamiętany', () => {
    const lista = fixture()
    const first = runImport(lista, []).after
    expect(new Set(first.map((t) => t.bank?.source))).toEqual(new Set(['lista']))
    const historia = asHistoria(lista)
    const second = runImport(historia, first)
    expect(counts(second.plan)).toEqual({ known: historia.rows.length })
    expect(second.plan.rows.every((p) => p.status === 'known' && p.other)).toBe(true)
    expect(second.result.create).toEqual([])
    expect(second.result.update).toHaveLength(historia.rows.length)
    // The next history knows them by key at once.
    const third = planImport(historia, MBANK_ACCOUNT_ID, second.after, ctx())
    expect(third.rows.every((p) => p.status === 'known' && !p.other)).toBe(true)
  })

  it('lista po historii także dla wpisów sprzed 1.4.2 (format rozpoznany po imporcie); dzień różnicy daty karty', () => {
    const historia = asHistoria(fixture())
    const first = legacy(runImport(historia, []).after)
    const lista = booked(fixture())
    expect(runImport(lista, first).result.create).toEqual([])
    const shifted = withRows(lista, lista.rows.map((r) => ({ ...r, date: addDays(r.date, 1) })))
    expect(runImport(shifted, first).result.create).toEqual([])
    // Another operation of the same amount a week later is a new one.
    const row = lista.rows[0]!
    expect(runImport(withRows(lista, [{ ...row, date: addDays(row.date, 7) }]), first).result.create).toHaveLength(1)
  })

  it('zaimportowane dwa razy przed 1.4.2: panel duplikatów łączy wiersz z obu formatów, klucz drugiego zostaje', () => {
    const lista = booked(fixture())
    const both = [...legacy(runImport(asHistoria(lista), []).after), ...legacy(runImport(lista, []).after, '2026-10-18T09:00:00.000Z')]
    const groups = findDuplicates(both, []).filter((g) => g.kind === 'bank-format')
    expect(groups).toHaveLength(lista.rows.length)
    const byId = new Map(both.map((t) => [t.id, t]))
    const g = groups[0]!
    const kept = mergeDuplicate(byId.get(g.keep)!, g.remove.map((id) => byId.get(id)!), g.kind, NOW)
    expect(kept.bank!.altKeys).toEqual([byId.get(g.remove[0]!)!.bank!.key])
    // A row of one format only stays alone.
    expect(findDuplicates(legacy(runImport(lista, []).after), []).filter((x) => x.kind === 'bank-format')).toEqual([])
  })

  it('wiersz dzień po okresie wcześniejszego pliku to inna operacja – nigdy „ta sama z drugiego formatu”', () => {
    const row = booked(fixture()).rows[0]!
    const next = addDays(row.date, 1)
    // The list up to the row's day, then the history from the next day: the same amount and name a day later.
    const lista = { ...withRows(fixture(), [row]), period: { from: addDays(row.date, -9), to: row.date } }
    const historia = { ...asHistoria(withRows(fixture(), [{ ...row, date: next }])), period: { from: next, to: addDays(next, 20) } }
    const first = runImport(lista, []).after
    const second = runImport(historia, first)
    expect(counts(second.plan)).toEqual({ new: 1 })
    expect(second.result.create.map((t) => t.date)).toEqual([next])
    // Both imported (before 1.4.2): the duplicates panel does not offer them as one row either.
    const both = [...legacy(runImport(lista, []).after), ...legacy(runImport(historia, []).after, '2026-10-18T09:00:00.000Z')]
    expect(findDuplicates(both, []).filter((g) => g.kind === 'bank-format')).toEqual([])
  })
})

describe('domownicy w imporcie (D80)', () => {
  const TOMASZ = `01KMEM${'0'.repeat(19)}7`
  const withMembers = (rules: ImportRule[], inflow: 'ask' | 'advance' | 'income') => ({
    ...ctx(rules),
    members: [...settings.household.members, { id: TOMASZ, name: 'Tomasz', bankNames: ['TOMASZ xxx'], inflow, archived: false }]
  })
  const tomaszRow = () => fixture().rows.find((r) => r.counterparty === 'TOMASZ xxx' && r.amount > 0)!
  const rule = (over: Partial<ImportRule>): ImportRule => ({
    id: makeId(),
    match: 'tomaszxxx',
    mode: 'exact',
    direction: 'in',
    label: 'TOMASZ xxx',
    kind: 'income',
    categoryId: null,
    refundable: false,
    household: false,
    memberId: null,
    counterAccountId: null,
    learned: true,
    hits: 3,
    updatedAt: NOW,
    ...over
  })

  it('wpłata osoby z listy po nazwie w banku: „pytaj” czeka na decyzję, „zaliczka” od razu', () => {
    expect(classifyRow(tomaszRow(), withMembers([], 'ask')).decision).toMatchObject({ kind: 'income', household: true, memberId: TOMASZ, advance: false, source: 'none' })
    expect(classifyRow(tomaszRow(), withMembers([], 'advance')).decision).toMatchObject({ kind: 'income', household: true, memberId: TOMASZ, advance: true, source: 'builtin' })
  })

  it('reguła zwykłego wpływu bez osoby (sprzed dopisania domownika) ustępuje domownikowi; reguła z osobą i przelew własny – nie', () => {
    expect(classifyRow(tomaszRow(), withMembers([rule({})], 'income')).decision).toMatchObject({ household: true, memberId: TOMASZ, source: 'builtin' })
    // Before 1.3.0 „od domownika” named no one: the member by the bank's name now (and asked about the rest).
    expect(classifyRow(tomaszRow(), withMembers([rule({ household: true })], 'ask')).decision).toMatchObject({ household: true, memberId: TOMASZ, source: 'none' })
    const named = rule({ household: true, memberId: TOMASZ })
    expect(classifyRow(tomaszRow(), withMembers([named], 'ask')).decision).toMatchObject({ household: true, memberId: TOMASZ, source: 'rule', ruleId: named.id })
    expect(classifyRow(tomaszRow(), withMembers([rule({ kind: 'transfer' })], 'ask')).decision).toMatchObject({ kind: 'transfer', source: 'rule' })
    // Without the member the rule decides as before.
    expect(classifyRow(tomaszRow(), ctx([rule({})])).decision).toMatchObject({ kind: 'income', household: false, source: 'rule' })
  })

  it('grupy domownika „pytaj” mają własny temat – decyzja tematu przelewów obcych osób go nie zabiera', () => {
    const plan = planImport(fixture(), MBANK_ACCOUNT_ID, [], withMembers([], 'ask'))
    const groups = importGroups(plan)
    const own = groups.filter((g) => g.brand === 'tomaszxxx' && g.direction === 'in')
    expect(own.length).toBeGreaterThan(0)
    const themes = importThemes(groups)
    const theme = themes.find((t) => t.theme === own[0]!.theme)!
    expect(theme.basis).toMatchObject({ kind: 'proposal', choice: { kind: 'income', household: true, memberId: TOMASZ } })
    expect(theme.groups.every((g) => g.brand === 'tomaszxxx')).toBe(true)
    // A decision of the strangers' transfers' theme leaves Tomasz's money his.
    const strangers = themes.filter((t) => t.direction === 'in' && t.basis.kind !== 'proposal')
    expect(strangers.length).toBeGreaterThan(0)
    const choices = emptyChoices()
    for (const t of strangers) choices.themes[t.theme] = { kind: 'income', categoryId: null, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    const result = buildImport(plan, choices, { now: NOW, makeId, rules: [] })
    const fromTomasz = result.create.filter((t) => t.counterparty === 'TOMASZ xxx' && t.amount > 0)
    expect(fromTomasz.length).toBeGreaterThan(10)
    expect(new Set(fromTomasz.map((t) => `${t.kind}|${t.memberId}`))).toEqual(new Set([`income|${TOMASZ}`]))
  })

  it('dwóch domowników „pytaj” w jednym pliku = dwa tematy; decyzja jednego nie oddaje mu pieniędzy drugiego ani reguły (B4)', () => {
    const ANNA = `01KMEM${'0'.repeat(19)}8`
    const f = fixture()
    const tomasz = f.rows.filter((r) => r.counterparty === 'TOMASZ xxx' && r.amount > 0)
    const anna = tomasz.map((r) => ({ ...r, counterparty: 'ANNA xxx', description: r.description.replace('TOMASZ xxx', 'ANNA xxx') }))
    const both = withMembers([], 'ask')
    const c = { ...both, members: [...both.members, { id: ANNA, name: 'Anna', bankNames: ['ANNA xxx'], inflow: 'ask' as const, archived: false }] }
    const plan = planImport(withRows(f, [...tomasz, ...anna]), MBANK_ACCOUNT_ID, [], c)
    const themes = importThemes(importGroups(plan))
    const of = (memberId: string) => themes.filter((t) => t.basis.kind === 'proposal' && t.basis.choice.memberId === memberId)
    expect(of(TOMASZ)).toHaveLength(1)
    expect(of(ANNA)).toHaveLength(1)
    const choices = emptyChoices()
    choices.themes[of(TOMASZ)[0]!.theme] = { kind: 'income', categoryId: null, refundable: false, household: true, memberId: TOMASZ, advance: true, counterAccountId: null }
    const result = buildImport(plan, choices, { now: NOW, makeId, rules: [] })
    expect(new Set(result.create.filter((t) => t.counterparty === 'ANNA xxx').map((t) => t.memberId))).toEqual(new Set([ANNA]))
    expect(new Set(result.create.filter((t) => t.counterparty === 'TOMASZ xxx').map((t) => `${t.memberId}|${t.advance}`))).toEqual(new Set([`${TOMASZ}|true`]))
    expect(result.rules.filter((r) => r.memberId === TOMASZ).map((r) => r.match)).not.toContain('annaxxx')
  })
})

describe('grupa G (1.5.0): zwrot zakupu domownika, połączone nazwy, wspólne finansowanie i prezent w regule', () => {
  const MAMA = `01KMEM${'0'.repeat(19)}5`
  const TOMASZ = `01KMEM${'0'.repeat(19)}7`
  const koleo = (over: Partial<ImportRule> = {}): ImportRule => ({
    id: makeId(),
    match: 'koleo',
    mode: 'exact',
    direction: 'out',
    label: 'KOLEO',
    kind: 'expense',
    categoryId: AUTO,
    refundable: false,
    household: false,
    memberId: null,
    counterAccountId: null,
    learned: true,
    hits: 3,
    updatedAt: NOW,
    ...over
  })
  const members = [...settings.household.members, { id: MAMA, name: 'Mama', bankNames: [], inflow: 'advance' as const, archived: false }]

  it('B40: zwrot towaru z zakupu, który finansuje Mama – jej pieniądze (zakup z reguły „finansuje”), nie mój ujemny wydatek', () => {
    const f = fixture()
    const back = f.rows.find((r) => r.description.includes('ZWROT ZAKUPU'))!
    const rules = [koleo({ refundable: true, memberId: MAMA })]
    expect(classifyRow(back, { ...ctx(rules), members }).decision).toMatchObject({ kind: 'expense', refundable: true, memberId: MAMA, categoryId: AUTO, source: 'rule' })
    const { result } = runImport(withRows(f, [back]), [], emptyChoices(), rules)
    const created = result.create[0]!
    expect(created).toMatchObject({ kind: 'expense', refundable: true, memberId: MAMA })
    expect(created.amount).toBeGreaterThan(0)
    const bought = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: NOW, updatedAt: NOW, date: addDays(created.date, -1), accountId: MBANK_ACCOUNT_ID, amount: -created.amount - 1000, categoryId: AUTO, refundable: true, memberId: MAMA })
    // The return repays what she owes for the purchase.
    expect(settleHousehold([bought, created]).byTx.get(created.id)).toMatchObject([{ memberId: MAMA, fromDeposit: 0, lent: 0, repaid: created.amount, advance: 0, income: 0, gift: 0 }])
  })

  it('reguła „wspólnie: ja i Mama po połowie” i „prezent od Mamy”: nowe operacje z częściami osób; zwrot – tak samo', () => {
    const f = fixture()
    const bought = f.rows.filter((r) => r.counterparty.startsWith('KOLEO') && r.amount < 0).slice(0, 1)
    const share = { mode: 'percent' as const, lines: [{ memberId: null, value: 50, gift: false }, { memberId: MAMA, value: 50, gift: false }] }
    const shared = runImport(withRows(f, bought), [], emptyChoices(), [koleo({ share })]).result.create[0]!
    expect(shared.share).toEqual(share)
    expect(shared.splits.map((s) => [s.memberId, s.refundable, s.categoryId])).toEqual([
      [null, false, AUTO],
      [MAMA, true, AUTO]
    ])
    expect(shared.splits[0]!.amount + shared.splits[1]!.amount).toBe(shared.amount)
    const gift = runImport(withRows(f, bought), [], emptyChoices(), [koleo({ refundable: true, memberId: MAMA, gift: true })]).result.create[0]!
    expect(gift).toMatchObject({ refundable: true, memberId: MAMA, gift: true })
    // A decision of the group teaches the rule with its share; the group with another share is another group.
    const plan = planImport(withRows(f, bought), MBANK_ACCOUNT_ID, [], ctx())
    const group = groupOf(plan, 'koleo', 'out')
    const choices = emptyChoices()
    choices.groups[group] = { ...choiceOf(plan.rows.find((p): p is NewRow => p.status === 'new')!.decision), categoryId: AUTO, share }
    choices.remember[group] = true
    const learned = buildImport(plan, choices, { now: NOW, makeId, rules: [] }).rules.find((r) => r.match === 'koleo')!
    expect(learned).toMatchObject({ kind: 'expense', categoryId: AUTO, refundable: false, share })
  })

  it('B41: połączone nazwy – wpłata domownika „pytaj” nie dostaje decyzji zwykłego wpływu z reguły drugiej nazwy', () => {
    const f = fixture()
    const tomasz = f.rows.filter((r) => r.counterparty === 'TOMASZ xxx' && r.amount > 0).slice(0, 3)
    // „TOMASZ X” – not his name in the bank (no „xxx”), merged with it by the user; a plain income rule learned for it.
    const other = tomasz.slice(0, 2).map((r) => ({ ...r, counterparty: 'TOMASZ X', description: r.description.replace('TOMASZ xxx', 'TOMASZ X'), amount: r.amount + 1 }))
    const otherKey = planImport(withRows(f, other), MBANK_ACCOUNT_ID, [], ctx()).rows.find((p): p is NewRow => p.status === 'new')!.brand
    const plain: ImportRule = { ...koleo(), match: otherKey, direction: 'in', label: 'TOMASZ X', kind: 'income', categoryId: null }
    const c = {
      ...ctx([plain]),
      aliases: { [otherKey]: { to: 'tomaszxxx', label: 'TOMASZ X', toLabel: 'TOMASZ xxx', at: NOW } },
      members: [...settings.household.members, { id: TOMASZ, name: 'Tomasz', bankNames: ['TOMASZ xxx'], inflow: 'ask' as const, archived: false }]
    }
    const plan = planImport(withRows(f, [...tomasz, ...other]), MBANK_ACCOUNT_ID, [], c)
    const decisions = plan.rows.filter((p): p is NewRow => p.status === 'new')
    expect(decisions.filter((p) => p.row.counterparty === 'TOMASZ X').every((p) => p.decision.kind === 'income' && !p.decision.household && p.decision.source === 'rule')).toBe(true)
    // His money keeps its question (it repays what he owes) – not „jak TOMASZ X (połączone nazwy)”.
    expect(decisions.filter((p) => p.row.counterparty === 'TOMASZ xxx').map((p) => [p.decision.household, p.decision.memberId, p.decision.source])).toEqual([
      [true, TOMASZ, 'none'],
      [true, TOMASZ, 'none'],
      [true, TOMASZ, 'none']
    ])
  })
})

describe('grupa H (1.5.1): pożyczka z Radaru, operacja na innym koncie, niepołączone dopasowanie, reguły bez wiedzy', () => {
  const LOAN = `01KRADAR${'0'.repeat(17)}1`
  const loan = (over: Partial<{ closedAt: string | null; counterparty: string }> = {}) => ({ id: LOAN, name: 'Tomek – laptop', direction: 'given' as const, counterparty: 'Tomasz xxx', date: '2025-09-01', closedAt: null, ...over })
  const tomasz = () => fixture().rows.filter((r) => r.counterparty === 'TOMASZ xxx' && r.amount > 0).slice(0, 1)

  it('B34: przelew od osoby z otwartą pożyczką z Radaru – zwrot tej pożyczki (do sprawdzenia), operacja z jej id; zamknięta – nie', () => {
    const f = fixture()
    const rows = tomasz()
    const d = classifyRow(rows[0]!, { ...ctx(), loans: [loan()] }).decision
    expect(d).toMatchObject({ kind: 'loan', loanId: LOAN, source: 'builtin' })
    expect(classifyRow(rows[0]!, { ...ctx(), loans: [loan({ closedAt: NOW })] }).decision.kind).toBe('income')
    const plan = planImport(withRows(f, rows), MBANK_ACCOUNT_ID, [], { ...ctx(), loans: [loan()] })
    const created = buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] }).create[0]!
    expect(created).toMatchObject({ kind: 'loan', loanId: LOAN })
  })

  it('N14: decyzja „pożyczka” i „podatek” nie zostaje regułą; reguła pożyczki sprzed 1.5.1 – tylko propozycja z pożyczką z Radaru', () => {
    const f = fixture()
    const rows = tomasz()
    const plan = planImport(withRows(f, rows), MBANK_ACCOUNT_ID, [], ctx())
    const group = plan.rows.find((p): p is NewRow => p.status === 'new')!.group
    for (const kind of ['loan', 'tax'] as const) {
      const choices = emptyChoices()
      choices.groups[group] = { ...choiceOf(plan.rows.find((p): p is NewRow => p.status === 'new')!.decision), kind }
      choices.remember[group] = true
      expect(buildImport(plan, choices, { now: NOW, makeId, rules: [] }).rules).toEqual([])
    }
    const old: ImportRule = { id: makeId(), match: plan.rows.find((p): p is NewRow => p.status === 'new')!.brand, mode: 'exact', direction: 'in', label: 'TOMASZ', kind: 'loan', categoryId: null, refundable: false, household: false, memberId: null, counterAccountId: null, learned: true, hits: 2, updatedAt: NOW }
    expect(classifyRow(rows[0]!, { ...ctx([old]), loans: [loan()] }).decision).toMatchObject({ kind: 'loan', loanId: LOAN, source: 'builtin' })
  })

  it('B37: wydatek bez kategorii (nikt inny nie płaci) nie uczy reguły – zasłoniłby sieć', () => {
    const f = fixture()
    const rows = f.rows.filter((r) => r.counterparty.startsWith('KOLEO') && r.amount < 0).slice(0, 1)
    const plan = planImport(withRows(f, rows), MBANK_ACCOUNT_ID, [], ctx())
    const group = plan.rows.find((p): p is NewRow => p.status === 'new')!.group
    const choices = emptyChoices()
    choices.groups[group] = { kind: 'expense', categoryId: null, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    choices.remember[group] = true
    expect(buildImport(plan, choices, { now: NOW, makeId, rules: [] }).rules).toEqual([])
  })

  it('B35 a numery rachunków: ta sama płatność na dwóch rachunkach banku to dwie operacje – nie plik złego konta ani duplikat', () => {
    const f = fixture()
    const rows = f.rows.filter((r) => r.counterparty.startsWith('KOLEO')).slice(0, 2)
    const OTHER = `01KXTBW${'0'.repeat(18)}2`
    const fileA = { ...withRows(f, rows), account: 'eKonto - 11 1111 1111 1111 1111 1111 1111' }
    const fileB = { ...withRows(f, rows), account: 'eKonto - 22 2222 2222 2222 2222 2222 2222' }
    const numA = accountNumberOf(fileA.account)!
    const onA = buildImport(planImport(fileA, OTHER, [], ctx()), emptyChoices(), { now: NOW, makeId, rules: [] }).create
    // The other account's files come from another bank account: its operations are its own.
    const plan = planImport(fileB, MBANK_ACCOUNT_ID, onA, { ...ctx(), accountNumbers: { [OTHER]: numA } })
    expect(counts(plan)).toEqual({ new: 2 })
    // No numbers known (files of before 1.5.1), or this file's number there – its rows went there by mistake: moved here.
    expect(counts(planImport(fileB, MBANK_ACCOUNT_ID, onA, ctx()))).toEqual({ elsewhere: 2 })
    expect(counts(planImport(fileA, MBANK_ACCOUNT_ID, onA, { ...ctx(), accountNumbers: { [OTHER]: numA } }))).toEqual({ elsewhere: 2 })
    // Duplicates: the same payment of two bank accounts is not one.
    const both = [...onA, ...buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] }).create]
    expect(findDuplicates(both, [], {}, { [OTHER]: numA, [MBANK_ACCOUNT_ID]: accountNumberOf(fileB.account)! })).toEqual([])
    expect(findDuplicates(both, [])).toHaveLength(2)
  })

  it('B35: plik zaimportowany najpierw na złe konto – przy imporcie na właściwe operacje się przenoszą, nie wchodzą drugi raz; przeniesiona przez użytkownika zostaje', () => {
    const f = fixture()
    const rows = f.rows.filter((r) => r.counterparty.startsWith('KOLEO')).slice(0, 2)
    const file = withRows(f, rows)
    const WALLET = `01KXTBW${'0'.repeat(18)}1`
    // Imported onto the wallet by mistake.
    const wrong = buildImport(planImport(file, WALLET, [], ctx()), emptyChoices(), { now: NOW, makeId, rules: [] }).create
    const plan = planImport(file, MBANK_ACCOUNT_ID, wrong, ctx())
    expect(plan.rows.map((p) => [p.status, p.status === 'elsewhere' && p.move])).toEqual([
      ['elsewhere', true],
      ['elsewhere', true]
    ])
    const moved = buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] })
    expect(moved.create).toEqual([])
    expect(moved.counts.moved).toBe(2)
    expect(moved.update.map((t) => t.accountId)).toEqual([MBANK_ACCOUNT_ID, MBANK_ACCOUNT_ID])
    // The next file of this account knows them at once.
    expect(counts(planImport(file, MBANK_ACCOUNT_ID, moved.update, ctx()))).toEqual({ known: 2 })
    // One the user moved to another account on purpose: known – it stays there, never a second operation.
    const right = buildImport(planImport(file, MBANK_ACCOUNT_ID, [], ctx()), emptyChoices(), { now: NOW, makeId, rules: [] }).create
    const elsewhere = [{ ...right[0]!, accountId: WALLET }, right[1]!]
    const again = planImport(file, MBANK_ACCOUNT_ID, elsewhere, ctx())
    // (The operations are created by date – the file lists the newest first.)
    expect(again.rows.map((p) => [p.status, p.status === 'elsewhere' && p.move, 'tx' in p ? p.tx.id : '']).sort()).toEqual(
      [
        ['elsewhere', false, right[0]!.id],
        ['known', false, right[1]!.id]
      ].sort()
    )
    const kept = buildImport(again, emptyChoices(), { now: NOW, makeId, rules: [] })
    expect([kept.create.length, kept.update.length, kept.counts.known]).toEqual([0, 0, 2])
    // Moved here from the wrong account by hand: known, its key of this account taken.
    const back = planImport(file, MBANK_ACCOUNT_ID, wrong.map((t) => ({ ...t, accountId: MBANK_ACCOUNT_ID })), ctx())
    expect(back.rows.map((p) => [p.status, p.status === 'known' && p.moved])).toEqual([
      ['known', true],
      ['known', true]
    ])
    const rekeyed = buildImport(back, emptyChoices(), { now: NOW, makeId, rules: [] }).update
    expect(rekeyed.map((t) => t.bank!.key).sort()).toEqual(back.rows.map((p) => p.key).sort())
    // Imported twice before 1.5.1 (once on each account): the duplicates panel sees one row of the bank.
    expect(findDuplicates([...wrong, ...right], []).filter((g) => g.kind === 'same-row')).toHaveLength(2)
  })

  it('B36: możliwy duplikat niepołączony (domyślnie przy „zaznacz sam”) wchodzi z rozpoznaniem – wypłata XTB, nie zwykły wpływ', () => {
    const f = fixture()
    const base = tomasz()[0]!
    const xtb = { ...base, counterparty: 'XTB S.A.', description: base.description.replace('TOMASZ xxx', 'XTB S.A.') }
    const own = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: NOW, updatedAt: NOW, date: xtb.date, accountId: MBANK_ACCOUNT_ID, kind: 'income', amount: xtb.amount, counterparty: 'Ania zwrot za bilety' })
    const plan = planImport(withRows(f, [xtb]), MBANK_ACCOUNT_ID, [own], ctx())
    const p = plan.rows[0]!
    expect([p.status, p.status === 'merge' && p.ask]).toEqual(['merge', true])
    const created = buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] }).create[0]!
    expect(created).toMatchObject({ kind: 'trading', amount: xtb.amount })
  })
})

describe('grupa K (1.5.4): plan i rozpoznanie bez przeglądania wszystkiego (W18, W20)', () => {
  const manualOf = (over: Partial<Transaction>) => transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: NOW, updatedAt: NOW, date: '2025-10-02', accountId: MBANK_ACCOUNT_ID, amount: -1616, counterparty: 'Biedronka', categoryId: GROCERIES, ...over })

  it('wpis ręczny 3 dni od wiersza łączy się, 4 dni – nie; z kilku do wyboru ten bliżej, potem pierwszy na liście', () => {
    const f = fixture()
    const row = f.rows.find((r) => r.amount === -1616 && r.counterparty.includes('Biedronka'))!
    expect(row.date).toBe('2025-10-03')
    const near = manualOf({ date: addDays(row.date, -3) })
    const far = manualOf({ date: addDays(row.date, 4) })
    const merged = (existing: Transaction[]) => planImport(f, MBANK_ACCOUNT_ID, existing, ctx()).rows.find((p) => p.status === 'merge')
    expect(merged([far])).toBeUndefined()
    expect(merged([far, near])?.status === 'merge' && merged([far, near])).toMatchObject({ tx: { id: near.id } })
    // Two of the same distance: the one first on the list.
    const a = manualOf({ date: addDays(row.date, 2) })
    const b = manualOf({ date: addDays(row.date, -2) })
    expect(merged([a, b])).toMatchObject({ tx: { id: a.id } })
    expect(merged([b, a])).toMatchObject({ tx: { id: b.id } })
    expect(merged([a, b, manualOf({ date: addDays(row.date, 1) })])).toMatchObject({ tx: { date: addDays(row.date, 1) } })
  })

  it('plan znowu na tej samej liście operacji: nowa reguła działa od razu; nowa lista (wpis ręczny dopisany) – łączy', () => {
    const f = fixture()
    const existing: Transaction[] = []
    const lidl = (plan: ImportPlan) => plan.rows.find((p): p is NewRow => p.status === 'new' && p.row.counterparty === 'LIDL')!
    const first = planImport(f, MBANK_ACCOUNT_ID, existing, ctx())
    expect(lidl(first).decision).toMatchObject({ source: 'brand', categoryId: GROCERIES })
    // A rule of the brand (a new list of rules): the same list of operations, the new decision.
    const rules = upsertRule([], { match: lidl(first).brand, direction: 'out', label: 'LIDL', kind: 'expense', categoryId: AUTO, refundable: false, household: false, memberId: null, gift: false, share: null, counterAccountId: null }, { now: NOW, makeId, hits: 1 })
    expect(lidl(planImport(f, MBANK_ACCOUNT_ID, existing, ctx(rules))).decision).toMatchObject({ source: 'rule', categoryId: AUTO })
    // A rule deleted: the brand's proposal again (no rule kept from an earlier list).
    expect(lidl(planImport(f, MBANK_ACCOUNT_ID, existing, ctx([]))).decision).toMatchObject({ source: 'brand' })
    // A hand-typed entry in a new list of operations: joined.
    const withManual = [...existing, manualOf({})]
    expect(counts(planImport(f, MBANK_ACCOUNT_ID, withManual, ctx()))).toEqual({ new: 268, merge: 1 })
    expect(counts(planImport(f, MBANK_ACCOUNT_ID, existing, ctx()))).toEqual({ new: 269 })
  })

  it('słowo kluczowe i połączone nazwy: ta sama nazwa, inne połączenia – inna marka (pamięć rozpoznania po połączeniach)', () => {
    const f = fixture()
    const row = f.rows.find((r) => r.counterparty === 'LIDL')!
    const before = classifyRow(row, { ...ctx(), aliases: {} })
    expect(before.brand.key).toBe('lidl')
    const merged = classifyRow(row, { ...ctx(), aliases: { lidl: { to: 'biedronka', label: 'LIDL', toLabel: 'Biedronka', at: NOW } } })
    expect(merged.brand.key).toBe('biedronka')
    expect(classifyRow(row, { ...ctx(), aliases: {} }).brand.key).toBe('lidl')
    // A keyword of the user's: in the name, then gone with the rule.
    const kw: ImportRule = { id: makeId(), match: 'lidl', mode: 'keyword', direction: 'out', label: 'lidl', kind: 'expense', categoryId: AUTO, refundable: false, household: false, memberId: null, counterAccountId: null, learned: false, hits: 0, updatedAt: NOW }
    expect(classifyRow(row, ctx([kw])).decision).toMatchObject({ source: 'rule', categoryId: AUTO })
    expect(classifyRow(row, ctx([])).decision).toMatchObject({ source: 'brand' })
  })
})
