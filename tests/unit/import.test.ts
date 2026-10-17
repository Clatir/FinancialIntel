import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { computeFleet } from '@shared/calc/fleet'
import { createDefaultSettings } from '@shared/defaults'
import { classifyRow, counterpartyKey, hintFor, isOwnName, matchRule, upsertRule } from '@shared/import/classify'
import { parseMbank, type MbankFile, type MbankRow } from '@shared/import/mbank'
import { buildImport, choiceOf, groupKey, planImport, similarCounterparty, type ImportChoices, type ImportPlan } from '@shared/import/reconcile'
import { decodeText } from '@shared/import/text'
import { CASH_CATEGORY_ID, defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type ImportRule, type Transaction } from '@shared/schema'

const FIXTURE = join(__dirname, '..', 'fixtures', 'mbank', 'lista_operacji.csv')
const fixture = (): MbankFile => parseMbank(decodeText(new Uint8Array(readFileSync(FIXTURE))))
const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const categories = categoryIndex(settings.categories)
const NOW = '2026-10-17T09:00:00.000Z'
let seq = 0
const makeId = () => `01K1${String(++seq).padStart(22, '0')}`
const ctx = (rules: ImportRule[] = [], ownNames: string[] = ['JAN KAPITAN']) => ({ rules, ownNames, categories })
const emptyChoices = (): ImportChoices => ({ groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {} })

const AUTO = defaultCategoryId(3)
const GROCERIES = defaultCategoryId(1, 1)

/** Import a file into `existing` with the decisions as proposed (plus `choices`): the operations after it. */
function runImport(file: MbankFile, existing: Transaction[], choices: ImportChoices = emptyChoices(), rules: ImportRule[] = [], house = 0) {
  const plan = planImport(file, MBANK_ACCOUNT_ID, existing, ctx(rules))
  const result = buildImport(plan, choices, { now: NOW, house, makeId, rules })
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
    expect(kinds('ZWROT ZAKUPU')).toMatchObject({ kind: 'expense', reason: 'zwrot towaru', categoryId: null })
    expect(kinds('TOMASZ xxx, PRZELEW')).toMatchObject({ kind: 'income', source: 'none' })
    expect(kinds('Bolt')).toMatchObject({ kind: 'expense', categoryId: null, source: 'none' })
    // mBank calls XTB „Ubezpieczenia”: no hint; groceries hint at „Jedzenie · zakupy spożywcze”, never applied by itself.
    expect(hintFor('Ubezpieczenia', categories)).toBeNull()
    const lidl = classifyRow(f.rows.find((r) => r.counterparty === 'LIDL')!, ctx())
    expect(lidl.hint).toBe(GROCERIES)
    expect(lidl.decision.categoryId).toBeNull()
    expect(hintFor('Wypłata gotówki', categories)).toBe(CASH_CATEGORY_ID)
    expect(isOwnName('KAPITAN JAN', ['Jan Kapitan'])).toBe(true)
    expect(isOwnName('JAN NOWAK', ['Jan Kapitan'])).toBe(false)
  })

  it('reguła zapamiętana drugi raz: to samo id, licznik trafień, nowa decyzja', () => {
    const one = upsertRule([], { match: 'bolt', direction: 'out', label: 'Bolt', kind: 'expense', categoryId: AUTO, refundable: false, household: false, counterAccountId: null }, { now: NOW, makeId, hits: 3 })
    const two = upsertRule(one, { match: 'bolt', direction: 'out', label: 'Bolt', kind: 'expense', categoryId: GROCERIES, refundable: false, household: false, counterAccountId: null }, { now: NOW, makeId, hits: 2 })
    expect(two).toHaveLength(1)
    expect(two[0]).toMatchObject({ id: one[0]!.id, categoryId: GROCERIES, hits: 5, learned: true, mode: 'exact' })
    expect(upsertRule(two, { ...two[0]!, direction: 'in' }, { now: NOW, makeId, hits: 1 })).toHaveLength(2)
  })

  it('reguły: dokładny klucz przed „zawiera”, kierunek, zwrot towaru z kategorią zakupów', () => {
    const rule = (over: Partial<ImportRule>): ImportRule => ({ id: makeId(), match: 'bolt', mode: 'exact', direction: 'out', label: 'Bolt', kind: 'expense', categoryId: AUTO, refundable: false, household: false, counterAccountId: null, learned: true, hits: 1, updatedAt: NOW, ...over })
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
    const rule: ImportRule = { id: '01K6H3Z0W8Q4M2N5P7R9S1T3V2', match: 'spotify', mode: 'exact', direction: 'out', label: 'Spotify', kind: 'expense', categoryId: defaultCategoryId(6, 2), refundable: false, household: false, counterAccountId: null, learned: true, hits: 1, updatedAt: NOW }
    expect(classifyRow(spotify, { ...ctx([rule]), containers }).decision).toMatchObject({ containerId: containers[0]!.id, categoryId: defaultCategoryId(6, 2), source: 'rule' })
    // An archived container, or money in from that counterparty: no link.
    expect(classifyRow(spotify, { ...ctx(), containers: [{ ...containers[0]!, archived: true }] }).decision.containerId).toBeNull()
    const plan = planImport(withRows(file, [spotify]), MBANK_ACCOUNT_ID, [], { ...ctx(), containers })
    expect(buildImport(plan, emptyChoices(), { now: NOW, house: 0, makeId, rules: [] }).create[0]).toMatchObject({ containerId: containers[0]!.id, kind: 'expense' })
  })
})

describe('import: plan, zapis, kolejne importy', () => {
  it('pierwszy import pliku użytkownika: 269 nowych operacji w grupach po kontrahencie; drugi import tego samego – nic nowego', () => {
    const f = fixture()
    const { plan, result, after } = runImport(f, [])
    expect(counts(plan)).toEqual({ new: 269 })
    expect(result.counts).toMatchObject({ created: 269, merged: 0, settled: 0, known: 0 })
    const groups = new Set(plan.rows.map((p) => (p.status === 'new' ? p.group : '')))
    expect(groups.has(groupKey('bolt', 'out'))).toBe(true)
    expect(groups.size).toBeLessThan(90)
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
    choices.groups[groupKey('bolt', 'out')] = { kind: 'expense', categoryId: AUTO, refundable: false, household: false, counterAccountId: null }
    choices.remember[groupKey('bolt', 'out')] = true
    const tomasz = groupKey('tomaszxxx', 'in')
    choices.groups[tomasz] = { kind: 'income', categoryId: null, refundable: false, household: true, counterAccountId: null }
    choices.remember[tomasz] = true
    // One row of the group decided apart (a row override wins over the group).
    const oneBolt = plan.rows.find((p) => p.status === 'new' && p.group === groupKey('bolt', 'out'))!
    choices.rows[oneBolt.key] = { kind: 'expense', categoryId: defaultCategoryId(6, 3), refundable: false, household: false, counterAccountId: null }
    const result = buildImport(plan, choices, { now: NOW, house: 10000, makeId, rules: [] })
    expect(result.rules.map((r) => [r.match, r.direction, r.kind, r.categoryId, r.household])).toEqual([
      ['bolt', 'out', 'expense', AUTO, false],
      ['tomaszxxx', 'in', 'income', null, true]
    ])
    const bolts = result.create.filter((t) => t.counterparty === 'Bolt')
    expect(bolts.filter((t) => t.categoryId === AUTO)).toHaveLength(bolts.length - 1)
    // 100 zł open: the earliest payments of the household member repay it (D20), the rest is income.
    const payments = result.create.filter((t) => t.counterparty === 'TOMASZ xxx')
    const first = payments.map((t) => t.date).sort()[0]
    expect(first).toBe('2025-08-08')
    expect(payments.filter((t) => t.repaid > 0).every((t) => t.date === first)).toBe(true)
    expect(payments.reduce((s, t) => s + t.repaid, 0)).toBe(10000)
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
    expect(buildImport(plan, emptyChoices(), { now: NOW, house: 0, makeId, rules: [] }).counts).toMatchObject({ created: 0, skipped: 1 })
    const back = buildImport(plan, { ...emptyChoices(), restoreDeleted: { [gone.bank!.key]: true } }, { now: NOW, house: 0, makeId, rules: [] })
    expect(back.create.map((t) => t.counterparty)).toEqual(['SKLEP REMONTOWY'])
  })

  it('zakup „do zwrotu” i wpłata domownika w jednym pliku: wpłata spłaca należność w kolejności dat', () => {
    const f = fixture()
    const plan = planImport(f, MBANK_ACCOUNT_ID, [], ctx())
    const choices = emptyChoices()
    // Allegro (out) for the house, Tomasz (in) a household member: nothing open before the file.
    choices.groups[groupKey('allegro', 'out')] = { kind: 'expense', categoryId: null, refundable: true, household: false, counterAccountId: null }
    choices.groups[groupKey('tomaszxxx', 'in')] = { kind: 'income', categoryId: null, refundable: false, household: true, counterAccountId: null }
    const result = buildImport(plan, choices, { now: NOW, house: 0, makeId, rules: [] })
    const bought = result.create.filter((t) => t.counterparty === 'Allegro').reduce((s, t) => s - t.amount, 0)
    const repaid = result.create.filter((t) => t.counterparty === 'TOMASZ xxx').reduce((s, t) => s + t.repaid, 0)
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

