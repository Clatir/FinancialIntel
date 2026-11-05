import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { columnsFor, completeMapping, decodeAs, guessCsv, operationKindText, operationOf, parseMappedCsv, readsOperation } from '@shared/import/csv'
import { isAtmOperation } from '@shared/import/classify'
import { deletedBankRows } from '@shared/import/deleted'
import { rowKeys, type MbankFile } from '@shared/import/mbank'
import { parseCsv } from '@shared/import/text'
import { buildImport, opKindOf, planImport, type ImportChoices } from '@shared/import/reconcile'
import { CASH_ACCOUNT_ID, csvMappingSchema, householdMemberSchema, transactionSchema, type CsvMapping, type Transaction } from '@shared/schema'

const CSV = new Uint8Array(readFileSync(join(__dirname, '..', 'fixtures', 'csv', 'inny_bank.csv')))
const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const BANK_B = '01K4BANKB00000000000000001'
const SAVINGS = '01K4SAVE000000000000000001'
const NOW = '2026-10-17T09:00:00.000Z'
let seq = 0
const makeId = () => `01KA${String(++seq).padStart(22, '0')}`
const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })
const ctx = (over: Partial<Parameters<typeof planImport>[3]> = {}) => ({ rules: [], ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings.categories), ...over })

function mapping(): CsvMapping {
  const done = completeMapping(guessCsv(CSV)!.draft)
  if (!('mapping' in done)) throw new Error(done.missing)
  return done.mapping
}
const text = () => decodeAs(CSV, 'auto')
const read = (t = text()): MbankFile => parseMappedCsv(t, mapping())

function importOnto(f: MbankFile, existing: Transaction[]) {
  const plan = planImport(f, BANK_B, existing, ctx())
  const result = buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] })
  const byId = new Map(existing.map((t) => [t.id, t]))
  for (const t of result.update) byId.set(t.id, t)
  for (const t of result.create) byId.set(t.id, t)
  return { plan, result, after: [...byId.values()] }
}

describe('drugi przegląd R1 1 – usunięta operacja CSV nie wraca, gdy bank zmienił komórki jej wiersza', () => {
  const imported = () => importOnto(read(), []).after
  /** The operation of KINO TESTOWE deleted by the user: the history's version, what the import reads of it. */
  function withoutKino(after: Transaction[]) {
    const kino = after.find((t) => t.bank?.counterparty === 'KINO TESTOWE')!
    const left = after.filter((t) => t !== kino)
    const { keys, rows } = deletedBankRows([{ id: kino.id, savedAt: '2026-10-18T10:00:00.000Z', record: kino }], left, new Set())
    return { left, keys, rows }
  }

  it('saldo w wierszu inne (inny klucz) – miara znajduje usuniętą: wiersz zostaje poza importem', () => {
    const { left, keys, rows } = withoutKino(imported())
    const changed = read(text().replace('10 247,48', '10 247,49'))
    const plan = planImport(changed, BANK_B, left, ctx(), keys, rows)
    expect(plan.rows.find((p) => p.row.counterparty === 'KINO TESTOWE')).toMatchObject({ status: 'deleted', other: true })
    expect(plan.rows.filter((p) => p.status === 'new')).toEqual([])
  })

  it('wiersz usuniętej w pliku po kluczu i nowy taki sam zakup dzień później – nowy wchodzi (zabezpieczenie T461)', () => {
    const { left, keys, rows } = withoutKino(imported())
    const more = read(`${text()}14.10.2026;14.10.2026;PŁATNOŚĆ KARTĄ;KINO TESTOWE;Płatność kartą 14.10.2026;;;42,00;9 555,48;PLN\r\n`)
    const plan = planImport(more, BANK_B, left, ctx(), keys, rows)
    const kino = plan.rows.filter((p) => p.row.counterparty === 'KINO TESTOWE').map((p) => [p.row.date, p.status])
    expect(kino).toEqual([
      ['2026-10-13', 'deleted'],
      ['2026-10-14', 'new']
    ])
  })
})

describe('drugi przegląd R1 2, 8, 9 – jedno rozpoznanie rodzaju operacji', () => {
  it('2: rodzaj banku zostaje tylko, gdy rozpoznanie go czyta – „BLIK” od osoby to przelew (wpłata domownika), „OBCIĄŻENIE” z rachunkiem – przelew', () => {
    expect(operationOf('BLIK', 'ANNA PRZYKŁADOWA', 5000, '')).toBe('PRZELEW PRZYCHODZĄCY')
    expect(operationOf('OBCIĄŻENIE', 'SPÓŁDZIELNIA', -65000, '44444444444444444444444444')).toBe('PRZELEW WYCHODZĄCY')
    expect(operationOf('TRANSAKCJA KARTĄ', 'LIDL', -1000, '')).toBe('TRANSAKCJA KARTĄ')
    expect(operationOf('BLIK P2P', 'ANNA', 5000, '')).toBe('BLIK P2P')
    expect(readsOperation('BLIK', 5000)).toBe(false)
    expect(readsOperation('UZNANIE', 5000)).toBe(true)
    expect(readsOperation('UZNANIE', -5000)).toBe(false)
    const anna = householdMemberSchema.parse({ id: '01K9MEMANNA000000000000001', name: 'Anna', bankNames: ['ANNA PRZYKŁADOWA'], inflow: 'income' })
    const m = csvMappingSchema.parse({ headers: ['Data', 'Typ', 'Kontrahent', 'Kwota'], dateFormat: 'DD.MM.RRRR', columns: { date: 0, operation: 1, counterparty: 2, amount: 3 } })
    const f = parseMappedCsv(['Data;Typ;Kontrahent;Kwota', '01.10.2026;BLIK;ANNA PRZYKŁADOWA;50,00', ''].join('\r\n'), m)
    expect(planImport(f, BANK_B, [], ctx({ members: [anna] })).rows[0]).toMatchObject({ status: 'new', decision: { kind: 'income', household: true, memberId: anna.id } })
  })

  it('8: wpłata we wpłatomacie (wpływ) to nie wypłata z bankomatu – bez przelewu na konto gotówki', () => {
    expect(operationOf('', 'Wpłata gotówki we wpłatomacie TESTOWO', 50000, '')).toBe('WPŁATA WE WPŁATOMACIE')
    expect(operationOf('', 'Bankomat Euronet', -20000, '')).toBe('WYPŁATA Z BANKOMATU')
    expect(operationOf('ATM', 'Cash deposit', 30000, '')).toBe('WPŁATA WE WPŁATOMACIE')
    const m = csvMappingSchema.parse({ headers: ['Data', 'Opis', 'Kwota'], dateFormat: 'DD.MM.RRRR', columns: { date: 0, description: 1, amount: 2 } })
    const f = parseMappedCsv(['Data;Opis;Kwota', '01.10.2026;Wpłata w bankomacie TESTOWO;500,00', ''].join('\r\n'), m)
    expect(isAtmOperation(f.rows[0]!.operation)).toBe(false)
    expect(planImport(f, BANK_B, [], ctx({ cash: { id: CASH_ACCOUNT_ID, name: 'Gotówka' } })).rows[0]).not.toMatchObject({ decision: { counterAccountId: CASH_ACCOUNT_ID } })
  })

  it('9: podgląd kreatora nazywa rodzaj wspólnym rozpoznaniem (opKindOf, isAtmOperation)', () => {
    for (const op of ['WYPŁATA W BANKOMACIE', 'BLIK WYPŁATA GOTÓWKI', 'ZAKUP PRZY UŻYCIU KARTY', 'PŁATNOŚĆ KARTĄ', 'BLIK P2P', 'PRZELEW WYCHODZĄCY', 'OPŁATA', 'PROWIZJA', 'ZWROT', 'BLIK', ''])
      expect(operationKindText(op)).toBe(isAtmOperation(op) ? 'bankomat' : op === 'ZWROT' ? 'zwrot' : ({ card: 'karta', transfer: 'przelew', fee: 'opłata banku', other: '' } as const)[opKindOf(op)])
  })
})

describe('drugi przegląd R1 4 – kolumny kreatora', () => {
  it('role ustawione ręcznie w kolumnach pliku zostają przy innym separatorze; żadnej – po nazwach nagłówka', () => {
    const g = guessCsv(CSV)!.draft
    const manual = { ...g.columns, description: g.columns.counterparty, counterparty: g.columns.description }
    const rows = parseCsv(text(), ';')
    expect(columnsFor({ ...g, columns: manual }, rows)).toEqual(manual)
    expect(columnsFor({ ...g, columns: { ...manual, balance: null, currency: 30 } }, rows)).toEqual({ ...manual, balance: null, currency: null })
  })
})

describe('drugi przegląd R1 6, 7 – przelew własny i długi wiersz', () => {
  it('6: przelew własny z kolumną numeru własnego rachunku – konto drugiej strony, nigdy to samo konto', () => {
    const own = '11 1111 1111 1111 1111 1111 1111'
    const saving = '22 2222 2222 2222 2222 2222 2222'
    const m = csvMappingSchema.parse({ headers: ['Data', 'Rachunek', 'Kontrahent', 'Rachunek kontrahenta', 'Opis', 'Kwota'], dateFormat: 'DD.MM.RRRR', columns: { date: 0, counterparty: 2, accountNo: 3, description: 4, amount: 5 } })
    const f = parseMappedCsv(['Data;Rachunek;Kontrahent;Rachunek kontrahenta;Opis;Kwota', `03.10.2026;${own};JAN KAPITAN;${saving};Przelew na oszczędności;-500,00`, ''].join('\r\n'), m)
    const digits = (n: string) => n.replace(/\D/g, '')
    const plan = planImport(f, BANK_B, [], ctx({ accountNumbers: { [BANK_B]: digits(own), [SAVINGS]: digits(saving) } }))
    expect(plan.rows[0]).toMatchObject({ status: 'new', decision: { kind: 'transfer', reason: 'przelew własny', counterAccountId: SAVINGS } })
  })

  it('7: wiersz ponad 2000 znaków – opis skrócony do limitu wpisu, tożsamość z całego tekstu; zapis i ponowny import bez kopii', () => {
    const m = csvMappingSchema.parse({ headers: ['Data', 'Opis', 'Kwota'], dateFormat: 'DD.MM.RRRR', columns: { date: 0, description: 1, amount: 2 } })
    const long = 'Opis '.repeat(500)
    const f = parseMappedCsv(['Data;Opis;Kwota', `01.10.2026;${long}A;-10,00`, `01.10.2026;${long}B;-10,00`, ''].join('\r\n'), m)
    for (const r of f.rows) expect(r.description.length).toBeLessThanOrEqual(2000)
    expect(f.rows[0]!.description).not.toBe(f.rows[1]!.description)
    const keys = rowKeys(f.rows, BANK_B, 'csv')
    expect(new Set(keys).size).toBe(2)
    const first = importOnto(f, [])
    expect(first.result.create).toHaveLength(2)
    for (const t of first.result.create) expect(transactionSchema.safeParse(t).success).toBe(true)
    expect(importOnto(f, first.after).result.counts).toMatchObject({ created: 0, known: 2 })
  })
})
