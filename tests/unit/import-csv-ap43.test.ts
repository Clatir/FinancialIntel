import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { analyzeImport, csvAccountsFor, type PlanSource } from '@shared/import/analyze'
import { completeMapping, decodeAs, guessCsv, mappingFits, NO_COLUMNS, parseCsvAmount, parseCsvDate, parseMappedCsv, previewMapped, type CsvDraft } from '@shared/import/csv'
import { keyKindOf, rowKeys, type MbankFile } from '@shared/import/mbank'
import { buildImport, formatOfBanks, planImport, type ImportChoices } from '@shared/import/reconcile'
import { MBANK_ACCOUNT_ID, accountSchema, csvMappingSchema, settingsFileSchema, transactionSchema, type Account, type CsvMapping, type Transaction } from '@shared/schema'

const FIXTURE = join(__dirname, '..', 'fixtures', 'csv', 'inny_bank.csv')
const MBANK = join(__dirname, '..', 'fixtures', 'mbank', 'lista_operacji.csv')
const bytes = (): Uint8Array => new Uint8Array(readFileSync(FIXTURE))
const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const ctx = () => ({ rules: [], ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings.categories) })
const BANK_B = '01K4BANKB00000000000000001'
const NOW = '2026-10-17T09:00:00.000Z'
let seq = 0
const makeId = () => `01K5${String(++seq).padStart(22, '0')}`
const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })

/** The fixture's mapping as the wizard proposes it. */
function mapping(): CsvMapping {
  const done = completeMapping(guessCsv(bytes())!.draft)
  if (!('mapping' in done)) throw new Error(done.missing)
  return done.mapping
}
const file = (): MbankFile => parseMappedCsv(decodeAs(bytes(), 'auto'), mapping())

/** Import a file onto BANK_B against `existing` with the proposals: the operations after it. */
function importOnto(f: MbankFile, existing: Transaction[]) {
  const plan = planImport(f, BANK_B, existing, ctx())
  const result = buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] })
  const byId = new Map(existing.map((t) => [t.id, t]))
  for (const t of result.update) byId.set(t.id, t)
  for (const t of result.create) byId.set(t.id, t)
  return { plan, result, after: [...byId.values()] }
}

describe('AP-43 – CSV innego banku: kreator i odczyt', () => {
  it('propozycja kreatora z nagłówka: separator, wiersze nad nagłówkiem, kolumny, format daty i liczb', () => {
    const guess = guessCsv(bytes())!
    expect(guess.draft).toMatchObject({ separator: ';', encoding: 'auto', skipRows: 4, header: true, dateFormat: 'DD.MM.RRRR', decimal: ',' })
    expect(guess.draft.columns).toEqual({ date: 0, booked: 1, operation: 2, counterparty: 3, description: 4, accountNo: 5, credit: 6, debit: 7, balance: 8, currency: 9, amount: null })
    expect(guess.draft.headers[0]).toBe('Data operacji')
    // The preview: the file's first rows (the bank's lines, then the header).
    expect(guess.rows[4]![7]).toBe('Obciążenia')
    // No table at all (a binary file): no proposal – the import says it is no CSV.
    expect(guessCsv(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0, 1, 2, 0, 0, 3]))).toBeNull()
  })

  it('odczyt pliku po kolumnach: grosze ze znakiem (uznania +, obciążenia −), daty, polskie znaki z Windows-1250, data księgowania, saldo', () => {
    const f = file()
    expect(f).toMatchObject({ format: 'csv', client: null, account: null, period: null, skipped: [] })
    expect(f.rows).toHaveLength(16)
    const [czynsz] = f.rows
    expect(czynsz).toMatchObject({ date: '2026-10-14', amount: -65000, counterparty: 'SPÓŁDZIELNIA MIESZKANIOWA TESTOWO', title: 'Czynsz za październik', operation: 'PRZELEW WYCHODZĄCY', accountNo: '44444444444444444444444444', balanceAfter: 959748, pending: false })
    const salary = f.rows.at(-1)!
    expect(salary).toMatchObject({ date: '2026-10-01', amount: 720000, counterparty: 'FIRMA TESTOWA SP. Z O.O.' })
    // Booked the next day: the balances follow the booking (`statementOf`).
    expect(f.rows.find((r) => r.counterparty === 'NETFLIX.COM')).toMatchObject({ date: '2026-10-07', booked: '2026-10-08', amount: -6000 })
    expect(f.rows.find((r) => r.counterparty === 'APTEKA POD LIPĄ')!.booked).toBeUndefined()
    // The row as the bank wrote it – all its cells: its identity across imports, whatever the roles (T461).
    expect(czynsz!.description).toBe('14.10.2026 | 14.10.2026 | PRZELEW WYCHODZĄCY | SPÓŁDZIELNIA MIESZKANIOWA TESTOWO | Czynsz za październik | 44 4444 4444 4444 4444 4444 4444 |  | 650,00 | 9 597,48 | PLN')
  })

  it('kwoty i daty w formatach banków; wiersze bez daty, kwoty albo w innej walucie – pominięte z powodem', () => {
    expect(parseCsvAmount('-1 234,56', ',')).toEqual({ grosze: -123456, currency: null })
    expect(parseCsvAmount('1.234,56 PLN', ',')).toEqual({ grosze: 123456, currency: 'PLN' })
    expect(parseCsvAmount('PLN -12,5', ',')).toEqual({ grosze: -1250, currency: 'PLN' })
    expect(parseCsvAmount('(12,00)', ',')).toEqual({ grosze: -1200, currency: null })
    expect(parseCsvAmount('12,00 zł', ',')).toEqual({ grosze: 1200, currency: 'PLN' })
    expect(parseCsvAmount('−7,10', ',')).toEqual({ grosze: -710, currency: null })
    expect(parseCsvAmount('-1,234.56', '.')).toEqual({ grosze: -123456, currency: null })
    expect(parseCsvAmount('12.30EUR', '.')).toEqual({ grosze: 1230, currency: 'EUR' })
    expect(parseCsvAmount('12,345', ',')).toBeNull()
    expect(parseCsvAmount('', ',')).toBeNull()
    expect(parseCsvDate('2026-10-05 14:22:01', 'RRRR-MM-DD')).toBe('2026-10-05')
    expect(parseCsvDate('5.10.2026', 'DD.MM.RRRR')).toBe('2026-10-05')
    expect(parseCsvDate('10/05/2026', 'MM/DD/RRRR')).toBe('2026-10-05')
    expect(parseCsvDate('31.02.2026', 'DD.MM.RRRR')).toBeNull()
    expect(parseCsvDate('2026-10-05', 'nowy-format')).toBeNull()
    const text = ['Data,Opis,Kwota,Waluta', '2026-10-01,Sklep,-12.50,PLN', 'wczoraj,Sklep,-1.00,PLN', '2026-10-02,Sklep,abc,PLN', '2026-10-03,Hotel,-99.00,EUR', ''].join('\n')
    const m: CsvMapping = csvMappingSchema.parse({ separator: ',', header: true, headers: ['Data', 'Opis', 'Kwota', 'Waluta'], decimal: '.', columns: { date: 0, description: 1, amount: 2, currency: 3 } })
    const f = parseMappedCsv(text, m)
    expect(f.rows.map((r) => [r.date, r.amount, r.counterparty])).toEqual([['2026-10-01', -1250, 'Sklep']])
    expect(f.skipped).toEqual([
      { line: 3, reason: 'nieczytelna data „wczoraj”' },
      { line: 4, reason: 'nieczytelna kwota „abc”' },
      { line: 5, reason: 'kwota w EUR – FI prowadzi tylko PLN' }
    ])
  })

  it('kreator mówi, czego brakuje; podgląd wyniku pierwszych operacji', () => {
    const base = guessCsv(bytes())!.draft
    const draft = (columns: Partial<CsvDraft['columns']>): CsvDraft => ({ ...base, columns: { ...NO_COLUMNS, ...columns } })
    expect(completeMapping(draft({ amount: 6, description: 4 }))).toEqual({ missing: 'Wskaż kolumnę z datą operacji.' })
    expect(completeMapping(draft({ date: 0, description: 4 }))).toEqual({ missing: 'Wskaż kolumnę z kwotą (albo kolumny uznań i obciążeń).' })
    expect(completeMapping(draft({ date: 0, credit: 6, description: 4 }))).toMatchObject({ missing: expect.stringContaining('wskaż obie') })
    expect(completeMapping(draft({ date: 0, amount: 6 }))).toMatchObject({ missing: expect.stringContaining('opisem albo z kontrahentem') })
    expect(completeMapping(draft({ date: 0, amount: 6, description: 6 }))).toMatchObject({ missing: expect.stringContaining('dwa razy') })
    const preview = previewMapped(bytes(), base)!
    expect(preview.rows).toHaveLength(8)
    expect(preview.rows[0]).toMatchObject({ date: '2026-10-14', amount: -65000 })
  })
})

describe('AP-43 – tożsamość wiersza (T461) i ten sam przebieg importu', () => {
  it('klucz wiersza CSV: konto, komórki wiersza i kolejność wśród takich samych wierszy dnia; inny niż klucz mBanku', () => {
    const f = file()
    const keys = rowKeys(f.rows, BANK_B, 'csv')
    expect(keys.every((k) => k.startsWith('csv:') && keyKindOf(k) === 'csv')).toBe(true)
    expect(new Set(keys).size).toBe(16)
    // Two purchases alike the same day (ŻABKA 12,99 twice): their balances differ – two rows of their own.
    const zabka = f.rows.flatMap((r, i) => (r.counterparty.startsWith('ŻABKA') ? [keys[i]!] : []))
    expect(new Set(zabka).size).toBe(2)
    // A file without balances: the same cells twice the same day – the occurrence tells them apart.
    const same = parseMappedCsv(['Data;Opis;Kwota', '2026-10-04;ŻABKA;-12,99', '2026-10-04;ŻABKA;-12,99', ''].join('\n'), csvMappingSchema.parse({ headers: ['Data', 'Opis', 'Kwota'], columns: { date: 0, description: 1, amount: 2 } }))
    expect(rowKeys(same.rows, BANK_B, 'csv').map((k) => k.slice(-2))).toEqual([':0', ':1'])
    // The same file read again – the same keys; another account – other keys; mBank's key of the same row – another.
    expect(rowKeys(file().rows, BANK_B, 'csv')).toEqual(keys)
    expect(rowKeys(f.rows, MBANK_ACCOUNT_ID, 'csv')).not.toEqual(keys)
    expect(rowKeys(f.rows, BANK_B)[0]).toMatch(/^mbank:/)
    expect(formatOfBanks([])({ key: keys[0]!, operation: '', description: '', importedAt: NOW })).toBe('csv')
  })

  it('import pliku → ponowny import tego samego pliku nic nie dubluje → plik zachodzącego okresu łączy się z wczytanymi', () => {
    const first = importOnto(file(), [])
    expect(first.result.counts.created).toBe(16)
    for (const t of first.result.create) {
      expect(t.accountId).toBe(BANK_B)
      expect(t.bank!.key.startsWith('csv:')).toBe(true)
      // No `source` an older version would drop (T461): the key tells the CSV; the record is read by every version.
      expect(t.bank!.source).toBeUndefined()
      expect(t.bank!.format).toBe('mbank')
      expect(transactionSchema.parse(t)).toEqual(t)
    }
    // The own transfer (the holder's name) and the bank's fee recognized as with mBank.
    expect(first.plan.rows.find((p) => p.row.counterparty === 'JAN KAPITAN')).toMatchObject({ status: 'new', decision: { kind: 'transfer' } })

    const again = importOnto(file(), first.after)
    expect(again.plan.rows.every((p) => p.status === 'known')).toBe(true)
    expect(again.result.counts).toMatchObject({ created: 0, known: 16 })

    // A later file of 08.10–18.10: its days up to 14.10 known, the new days new – the pair of ŻABKA from 04.10 is not in it.
    const later: MbankFile = { ...file(), rows: [...file().rows.filter((r) => r.date >= '2026-10-08'), ...newRows()] }
    const overlap = importOnto(later, first.after)
    expect(overlap.plan.rows.map((p) => p.status)).toEqual([...Array(7).fill('known'), 'new', 'new'])
    expect(overlap.result.counts.created).toBe(2)
    // A file holding only one of the two ŻABKA rows of 04.10 knows it as the first (the same occurrence), never a third.
    const one: MbankFile = { ...file(), rows: file().rows.filter((r) => r.counterparty.startsWith('ŻABKA')).slice(0, 1) }
    expect(importOnto(one, first.after).plan.rows.map((p) => p.status)).toEqual(['known'])
  })

  it('mapowanie przy koncie: następny plik banku rozpoznany po nagłówku (także z dodatkową linią nad nim); plik mBanku – nie', () => {
    const m = mapping()
    expect(mappingFits(bytes(), m)).toBe(true)
    const text = decodeAs(bytes(), 'auto')
    const shifted = new TextEncoder().encode(`Dodatkowa linia banku;;;;;;;;;\r\n${text}`)
    expect(mappingFits(shifted, m)).toBe(true)
    expect(parseMappedCsv(decodeAs(shifted, 'auto'), m).rows).toHaveLength(16)
    expect(mappingFits(new Uint8Array(readFileSync(MBANK)), m)).toBe(false)
    const accounts: Account[] = [
      { id: MBANK_ACCOUNT_ID, name: 'mBank', kind: 'bank', importFormat: 'mbank', archived: false },
      { id: BANK_B, name: 'Bank B', kind: 'bank', importFormat: 'csv', csvMapping: m, archived: false },
      { id: '01K4BANKC00000000000000001', name: 'Bank C', kind: 'bank', importFormat: 'csv', csvMapping: m, archived: false }
    ]
    expect(csvAccountsFor(bytes(), accounts, '').map((a) => a.accountId)).toEqual([BANK_B, '01K4BANKC00000000000000001'])
    expect(csvAccountsFor(bytes(), accounts, '01K4BANKC00000000000000001')[0]!.accountId).toBe('01K4BANKC00000000000000001')
    expect(csvAccountsFor(bytes(), accounts.map((a) => ({ ...a, archived: true })), '')).toEqual([])
  })

  it('analiza pliku: mBank – jak dotąd; CSV z mapowaniem konta – na to konto; CSV bez mapowania – kreator', () => {
    const fi = createDefaultSettings(NOW).settings
    const source = (accounts: Account[]): PlanSource => ({ transactions: [], containers: [], loans: [], accounts, categories: fi.categories, rules: [], aliases: {}, members: [], ownNames: [], accountNumbers: {}, locked: new Set(), docked: new Set() })
    const input = (b: Uint8Array, accounts: Account[]) => ({ bytes: b, chosen: '', fallback: MBANK_ACCOUNT_ID, source: source(accounts), deletedKeys: new Set<string>(), deletedRows: [] })
    const mb = analyzeImport(input(new Uint8Array(readFileSync(MBANK)), fi.accounts))
    expect(mb).toMatchObject({ kind: 'plan', accountId: MBANK_ACCOUNT_ID, mapping: null, file: { format: 'lista' } })
    expect(analyzeImport(input(bytes(), fi.accounts))).toEqual({ kind: 'csv' })
    const withB: Account[] = [...fi.accounts, { id: BANK_B, name: 'Bank B', kind: 'bank', importFormat: 'csv', csvMapping: mapping(), archived: false }]
    const csv = analyzeImport(input(bytes(), withB))
    expect(csv).toMatchObject({ kind: 'plan', accountId: BANK_B, file: { format: 'csv' }, plan: { format: 'csv', accountId: BANK_B } })
    if (csv.kind === 'plan') expect(csv.plan.rows).toHaveLength(16)
  })
})

describe('AP-43 – fi.json addytywnie (bez podbijania SCHEMA_VERSION)', () => {
  it('konto z mapowaniem: zapis i odczyt bez zmian; mapowanie nieczytelne nie gubi konta; wartości nowszej wersji zostają', () => {
    const m = mapping()
    const account = { id: BANK_B, name: 'Bank B', kind: 'bank', importFormat: 'csv', csvMapping: m, archived: false }
    expect(accountSchema.parse(JSON.parse(JSON.stringify(account)))).toEqual(account)
    // A mapping this version cannot read: the account stays, without it.
    expect(accountSchema.parse({ ...account, csvMapping: { columns: { date: 'pierwsza' } } })).toEqual({ ...account, csvMapping: undefined })
    // A newer version's separator, date format and a field of its own: kept as written.
    const newer = { ...m, separator: '#', dateFormat: 'RRRRMMDD', quoting: 'none', columns: { ...m.columns, fee: 11 } }
    expect(accountSchema.parse({ ...account, importFormat: 'pdf', csvMapping: newer })).toMatchObject({ importFormat: 'pdf', csvMapping: newer })
    const fi = createDefaultSettings(NOW)
    const parsed = settingsFileSchema.parse(JSON.parse(JSON.stringify({ ...fi, settings: { ...fi.settings, accounts: [...fi.settings.accounts, account] } })))
    expect(parsed.schemaVersion).toBe(fi.schemaVersion)
    expect(parsed.settings.accounts.at(-1)).toEqual(account)
  })

  it('wersja 1.15.9 czyta konto z importem CSV i oddaje je niezmienione (jej schemat konta: looseObject, importFormat – dowolny tekst)', () => {
    // The account's schema of 1.15.9 (`schema/budget.ts` before AP-43): the fields it knows, the rest kept as it is.
    const openEnum = () => z.custom<string>((v) => typeof v === 'string' && v.length > 0 && v.length <= 60)
    const account1159 = z.looseObject({ id: z.string(), name: z.string().trim().min(1).max(40), kind: openEnum().default('bank'), importFormat: openEnum().nullable().default(null), archived: z.boolean().default(false) })
    const account = { id: BANK_B, name: 'Bank B', kind: 'bank', importFormat: 'csv', csvMapping: mapping(), archived: false }
    const read = account1159.parse(JSON.parse(JSON.stringify(account)))
    expect(read).toEqual(account)
    // Its mBank checks see no mBank import there – no reminder of a late import, no mission of it.
    expect(read.importFormat === 'mbank').toBe(false)
  })
})

/** Two operations after the fixture's period (15.10, 18.10). */
function newRows(): MbankFile['rows'] {
  const m = mapping()
  const text = [
    ...Array(4).fill(';;;;;;;;;'),
    'Data operacji;Data księgowania;Rodzaj operacji;Kontrahent;Tytuł;Rachunek kontrahenta;Uznania;Obciążenia;Saldo po operacji;Waluta',
    '18.10.2026;18.10.2026;PŁATNOŚĆ KARTĄ;PIEKARNIA TESTOWA;Płatność kartą;;;9,50;9 557,98;PLN',
    '15.10.2026;15.10.2026;PŁATNOŚĆ KARTĄ;BIEDRONKA 1234 TESTOWO;Płatność kartą;;;30,00;9 567,48;PLN'
  ].join('\r\n')
  return parseMappedCsv(text, m).rows
}
