import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { answer, csvAccountsFor, planFor, planFromWire, type AnalyzeMessage, type PlanSource } from '@shared/import/analyze'
import { columnsFor, completeMapping, decodeAs, draftOf, guessCsv, NO_COLUMNS, operationOf, parseCsvAmount, parseMappedCsv, type CsvDraft } from '@shared/import/csv'
import type { MbankFile } from '@shared/import/mbank'
import { parseCsv } from '@shared/import/text'
import { buildImport, isSideView, planImport, type ImportChoices } from '@shared/import/reconcile'
import { CASH_ACCOUNT_ID, MBANK_ACCOUNT_ID, SCHEMA_VERSION, csvMappingSchema, householdMemberSchema, loanSchema, transactionSchema, type Account, type CsvMapping, type Transaction } from '@shared/schema'

const CSV = new Uint8Array(readFileSync(join(__dirname, '..', 'fixtures', 'csv', 'inny_bank.csv')))
const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const BANK_B = '01K4BANKB00000000000000001'
const NOW = '2026-10-17T09:00:00.000Z'
let seq = 0
const makeId = () => `01K8${String(++seq).padStart(22, '0')}`
const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })
const ctx = (over: Partial<Parameters<typeof planImport>[3]> = {}) => ({ rules: [], ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings.categories), ...over })

function mappingOf(draft: CsvDraft): CsvMapping {
  const done = completeMapping(draft)
  if (!('mapping' in done)) throw new Error(done.missing)
  return done.mapping
}
const guessed = () => guessCsv(CSV)!.draft
const read = (m: CsvMapping): MbankFile => parseMappedCsv(decodeAs(CSV, 'auto'), m)

function importOnto(f: MbankFile, existing: Transaction[]) {
  const plan = planImport(f, BANK_B, existing, ctx())
  const result = buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] })
  const byId = new Map(existing.map((t) => [t.id, t]))
  for (const t of result.update) byId.set(t.id, t)
  for (const t of result.create) byId.set(t.id, t)
  return { plan, result, after: [...byId.values()] }
}

describe('przegląd R1 1 – tożsamość wiersza CSV niezależna od ról kolumn (T461)', () => {
  it('import, zmiana ról kolumn, ponowny import tego samego pliku – 0 nowych, nic podwójnie', () => {
    const first = importOnto(read(mappingOf(guessed())), [])
    expect(first.result.counts.created).toBe(16)
    // The roles changed: the type of operation no longer read, the title as the other side, the counterparty as the title.
    const g = guessed()
    const other = mappingOf({ ...g, columns: { ...g.columns, operation: null, counterparty: g.columns.description, description: g.columns.counterparty } })
    const again = importOnto(read(other), first.after)
    expect(again.plan.rows.filter((p) => p.status === 'new')).toEqual([])
    expect(again.result.counts.created).toBe(0)
    expect(again.after).toHaveLength(16)
  })

  it('bank zmienił komórki wiersza (saldo, stan): klucz inny – miara B5 znajduje operację, klucz dopisany; nowy zakup taki sam dzień później – nowy', () => {
    const m = mappingOf(guessed())
    const first = importOnto(read(m), [])
    const text = decodeAs(CSV, 'auto').replace('10 247,48', '10 247,49')
    const changed = parseMappedCsv(text, m)
    const plan = planImport(changed, BANK_B, first.after, ctx())
    const kino = plan.rows.find((p) => p.row.counterparty === 'KINO TESTOWE')!
    expect(kino).toMatchObject({ status: 'known', other: true })
    const result = buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] })
    expect(result.create).toEqual([])
    expect(result.update.find((t) => t.counterparty === 'KINO TESTOWE' || t.bank?.counterparty === 'KINO TESTOWE')!.bank!.altKeys).toHaveLength(1)
    // Another purchase like the kept ones (the same shop and amount a day later): every operation of the file is found by
    // its key – nothing left for the measure, the purchase is new.
    const more = parseMappedCsv(`${decodeAs(CSV, 'auto')}02.10.2026;02.10.2026;PŁATNOŚĆ KARTĄ;BIEDRONKA 1234 TESTOWO;Płatność kartą 02.10.2026;;;87,45;1,00;PLN\r\n`, m)
    expect(planImport(more, BANK_B, first.after, ctx()).rows.filter((p) => p.status === 'new').map((p) => p.row.counterparty)).toEqual(['BIEDRONKA 1234 TESTOWO'])
  })
})

describe('przegląd R1 4 – rozpoznanie bez kolumny rodzaju operacji (T462)', () => {
  const header = 'Data;Kontrahent;Opis;Rachunek;Kwota'
  const rows = [
    '01.10.2026;ANNA PRZYKŁADOWA;za zakupy;33 3333 3333 3333 3333 3333 3333;150,00',
    '02.10.2026;PIOTR POŻYCZKOWY;oddaję część;55 5555 5555 5555 5555 5555 5555;200,00',
    '03.10.2026;JAN KAPITAN;na oszczędności;22 2222 2222 2222 2222 2222 2222;-500,00',
    '04.10.2026;EURONET;Wypłata z bankomatu TESTOWO;;-100,00',
    '05.10.2026;SKLEP TESTOWY;Zwrot towaru 123;;19,99',
    '06.10.2026;BANK PRZYKŁADOWY;Opłata za kartę;;-7,00',
    '07.10.2026;KAWIARNIA RYNEK;Płatność kartą;;-12,00'
  ]
  const m = csvMappingSchema.parse({ headers: header.split(';'), dateFormat: 'DD.MM.RRRR', columns: { date: 0, counterparty: 1, description: 2, accountNo: 3, amount: 4 } })
  const file = parseMappedCsv([header, ...rows, ''].join('\r\n'), m)
  const anna = householdMemberSchema.parse({ id: '01K9MEMANNA000000000000001', name: 'Anna', bankNames: ['ANNA PRZYKŁADOWA'], inflow: 'income' })
  const loan = loanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01K9PZYCZKA000000000000001', createdAt: NOW, updatedAt: NOW, name: 'Piotr', direction: 'given', counterparty: 'PIOTR POŻYCZKOWY', amount: 100000, date: '2026-09-01' })

  it('domownik, spłata pożyczki, przelew własny, bankomat, zwrot towaru, opłata banku – jak w pliku z mBanku', () => {
    expect(file.rows.map((r) => r.operation)).toEqual(['PRZELEW PRZYCHODZĄCY', 'PRZELEW PRZYCHODZĄCY', 'PRZELEW WYCHODZĄCY', 'WYPŁATA Z BANKOMATU', 'ZWROT', 'OPŁATA', 'PŁATNOŚĆ KARTĄ'])
    const plan = planImport(file, BANK_B, [], ctx({ members: [anna], loans: [loan], cash: { id: CASH_ACCOUNT_ID, name: 'Gotówka' } }))
    const decided = plan.rows.map((p) => (p.status === 'new' ? p.decision : null))
    expect(decided[0]).toMatchObject({ kind: 'income', household: true, memberId: anna.id })
    expect(decided[1]).toMatchObject({ kind: 'loan', loanId: loan.id })
    expect(decided[2]).toMatchObject({ kind: 'transfer', reason: 'przelew własny' })
    expect(decided[3]).toMatchObject({ kind: 'transfer', counterAccountId: CASH_ACCOUNT_ID })
    expect(decided[4]).toMatchObject({ kind: 'expense', reason: 'zwrot towaru' })
  })

  it('rodzaje operacji innych banków (po angielsku) czytane słowami; znane słowa mBanku – jak bank je pisze', () => {
    expect(operationOf('CARD_PAYMENT', 'Coffee', -1200, '')).toBe('PŁATNOŚĆ KARTĄ')
    expect(operationOf('TOPUP', 'Top-up by card', 50000, '')).toBe('PRZELEW PRZYCHODZĄCY')
    expect(operationOf('ATM', 'Cash at Euronet', -20000, '')).toBe('WYPŁATA Z BANKOMATU')
    expect(operationOf('FEE', 'Monthly fee', -999, '')).toBe('OPŁATA')
    expect(operationOf('CARD_REFUND', 'Refund from shop', 1999, '')).toBe('ZWROT')
    expect(operationOf('TRANSFER', 'To Anna', -3000, '')).toBe('PRZELEW WYCHODZĄCY')
    expect(operationOf('PŁATNOŚĆ BLIK', 'Allegro', -14999, '')).toBe('PŁATNOŚĆ BLIK')
    // A purchase's outflow of no word: as the bank wrote it (nothing told) – the name decides.
    expect(operationOf('', 'BIEDRONKA 1234', -4000, '')).toBe('')
  })
})

describe('przegląd R1 5, 7, 11, 14 – mapowanie, konta, kolumny, kwoty', () => {
  it('5: mapowanie, którego fi.json nie zachowa (kolumna od 200, nagłówek po 200 znaków), nie jest zapisywane – kreator mówi dlaczego', () => {
    const g = guessed()
    expect(completeMapping({ ...g, columns: { ...g.columns, balance: 205 } })).toMatchObject({ missing: expect.stringContaining('najwyżej 200') })
    expect(completeMapping({ ...g, headers: [...g.headers, 'x'.repeat(250)] })).toMatchObject({ missing: expect.stringContaining('Nagłówek') })
    expect(csvMappingSchema.safeParse(mappingOf(g)).success).toBe(true)
  })

  it('7: konto „bez importu” z mapowaniem nie dostaje plików; mapowanie nieczytelne dla tej wersji – pominięte, bez błędu', () => {
    const m = mappingOf(guessed())
    const accounts: Account[] = [
      { id: BANK_B, name: 'Bank B', kind: 'bank', importFormat: null, csvMapping: m, archived: false },
      { id: '01K4BANKC00000000000000001', name: 'Bank C', kind: 'bank', importFormat: 'csv', csvMapping: { columns: { date: 'pierwsza' } } as unknown as CsvMapping, archived: false },
      { id: '01K4BANKD00000000000000001', name: 'Bank D', kind: 'bank', importFormat: 'csv', csvMapping: m, archived: false }
    ]
    expect(csvAccountsFor(CSV, accounts, BANK_B).map((a) => a.accountId)).toEqual(['01K4BANKD00000000000000001'])
  })

  it('11: inny separator – role po nazwach nowego nagłówka albo tylko w kolumnach pliku; rola poza plikiem nie zostaje', () => {
    const g = guessed()
    const text = decodeAs(CSV, 'auto')
    // A comma: three cells per row (the commas of the amounts) – no role on a column the file has not (the amounts' 6, 7…).
    const commas = parseCsv(text, ',')
    const cut = columnsFor({ ...g, separator: ',' }, commas)
    expect(Object.values(cut).filter((c) => c != null && c >= 3)).toEqual([])
    expect(cut).toMatchObject({ credit: null, debit: null, balance: null, currency: null })
    expect(completeMapping({ ...g, separator: ',', columns: cut })).toEqual({ missing: 'Wskaż kolumnę z kwotą (albo kolumny uznań i obciążeń).' })
    // Back to the semicolon: the roles by the header's names again.
    expect(columnsFor({ ...g, columns: { ...NO_COLUMNS } }, parseCsv(text, ';'))).toEqual(g.columns)
    // The saved mapping as a draft: the same roles.
    expect(draftOf(mappingOf(g)).columns).toEqual(g.columns)
  })

  it('14: kwota z drugim znakiem dziesiętnym – nieczytelna (wiersz pominięty z powodem), nigdy 100 razy większa', () => {
    expect(parseCsvAmount('12.50', ',')).toBeNull()
    expect(parseCsvAmount('-12.5 PLN', ',')).toBeNull()
    expect(parseCsvAmount('12,50', '.')).toBeNull()
    expect(parseCsvAmount('1.234,56', ',')).toEqual({ grosze: 123456, currency: null })
    expect(parseCsvAmount('1.234.567,00', ',')).toEqual({ grosze: 123456700, currency: null })
    expect(parseCsvAmount('1,234.56', '.')).toEqual({ grosze: 123456, currency: null })
    expect(parseCsvAmount('1.234', ',')).toEqual({ grosze: 123400, currency: null })
    const m = csvMappingSchema.parse({ headers: ['Data', 'Opis', 'Kwota'], columns: { date: 0, description: 1, amount: 2 } })
    const f = parseMappedCsv(['Data;Opis;Kwota', '2026-10-01;Sklep;-12.50', '2026-10-02;Sklep;-12,50', ''].join('\n'), m)
    expect(f.rows.map((r) => r.amount)).toEqual([-1250])
    expect(f.skipped).toEqual([{ line: 2, reason: 'nieczytelna kwota „-12.50”' }])
  })
})

describe('przegląd R1 15 – ponowny plan otwartego pliku w Workerze', () => {
  it('prośba o ponowny plan: plan z Workera równy planowi okna – te same wiersze pliku i operacje (także widoki stron)', () => {
    const m = mappingOf(guessed())
    const f = read(m)
    const existing: Transaction[] = [
      transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: NOW, updatedAt: NOW, kind: 'transfer', amount: 100000, date: '2026-10-03', accountId: MBANK_ACCOUNT_ID, counterAccountId: BANK_B, bothSides: true, counterparty: 'Z Banku B' }),
      transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: NOW, updatedAt: NOW, amount: -8745, date: '2026-10-01', accountId: BANK_B, counterparty: 'Biedronka' })
    ]
    const source: PlanSource = { transactions: existing, containers: [], loans: [], accounts: settings.accounts, categories: settings.categories, rules: [], aliases: {}, members: [], ownNames: ['JAN KAPITAN'], accountNumbers: {}, locked: new Set(), docked: new Set() }
    const input = { file: f, accountId: BANK_B, source, deletedKeys: new Set<string>(), deletedRows: [] }
    const direct = planFor(input)
    const messages: AnalyzeMessage[] = []
    answer(structuredClone({ id: 3, replan: input }), (msg) => messages.push(structuredClone(msg)))
    const done = messages.at(-1)!
    if (done.type !== 'planned') throw new Error(done.type)
    // Without the file's rows (the window has them): the message is the plan's own.
    expect(done.plan.rows.every((r) => !('row' in r))).toBe(true)
    const back = planFromWire(done.plan, existing, f.rows)
    expect(back).toEqual(direct)
    back.rows.forEach((p, i) => {
      expect(p.row).toBe(f.rows[i])
      const q = direct.rows[i]!
      if ('tx' in p && 'tx' in q) expect(p.tx).toBe(q.tx)
    })
    expect(back.rows.some((p) => p.status === 'merge' && p.side === 'other' && isSideView(p.tx))).toBe(true)
    expect(() => planFromWire(done.plan, existing, f.rows.slice(1))).toThrow()
  })
})
