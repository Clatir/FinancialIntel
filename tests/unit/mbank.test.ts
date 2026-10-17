import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MbankFormatError, parseBankAmount, parseBankDate, parseMbank, rowKeys, splitDescription } from '@shared/import/mbank'
import { decodeText } from '@shared/import/text'
import { MBANK_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID } from '@shared/schema'

/** The user's file, anonymized (names, places, account numbers, dates moved 52 weeks back, amounts scaled per counterparty – docs/postep.md, E2). */
const FIXTURE = join(__dirname, '..', 'fixtures', 'mbank', 'lista_operacji.csv')
const fixture = () => parseMbank(decodeText(new Uint8Array(readFileSync(FIXTURE))))

const pad = (s: string, width: number) => s.padEnd(width, ' ')

/** Polish letters in Windows-1250 (older mBank exports). */
const CP1250: Record<string, number> = { ą: 0xb9, ć: 0xe6, ę: 0xea, ł: 0xb3, ń: 0xf1, ó: 0xf3, ś: 0x9c, ź: 0x9f, ż: 0xbf, Ą: 0xa5, Ć: 0xc6, Ę: 0xca, Ł: 0xa3, Ń: 0xd1, Ó: 0xd3, Ś: 0x8c, Ź: 0x8f, Ż: 0xaf }
const cp1250 = (text: string) => new Uint8Array([...text].map((ch) => CP1250[ch] ?? (ch.charCodeAt(0) < 0x80 ? ch.charCodeAt(0) : 0x3f)))

describe('CSV z mBanku – odczyt', () => {
  it('kodowanie: UTF-8 z BOM, UTF-8 bez BOM, Windows-1250 (starsze eksporty)', () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0xc5, 0xbb, 0x61]))).toBe('Ża')
    expect(decodeText(new TextEncoder().encode('Żabka;-1,00'))).toBe('Żabka;-1,00')
    // „Żabka Łódź” in Windows-1250: Ż = 0xAF, Ł = 0xA3, ó = 0xF3, ź = 0x9F.
    expect(decodeText(new Uint8Array([0xaf, 0x61, 0x62, 0x6b, 0x61, 0x20, 0xa3, 0xf3, 0x64, 0x9f]))).toBe('Żabka Łódź')
  })

  it('daty i kwoty w formatach mBanku', () => {
    expect(parseBankDate('16.10.2026')).toBe('2026-10-16')
    expect(parseBankDate('2026-10-16')).toBe('2026-10-16')
    expect(parseBankDate('31.02.2026')).toBeNull()
    expect(parseBankAmount('-26,44 PLN')).toEqual({ grosze: -2644, currency: 'PLN' })
    expect(parseBankAmount('-1 750,00 PLN')).toEqual({ grosze: -175000, currency: 'PLN' })
    expect(parseBankAmount('1 234,5')).toEqual({ grosze: 123450, currency: null })
    expect(parseBankAmount('1.234,56')).toEqual({ grosze: 123456, currency: null })
    expect(parseBankAmount('−0.57 PLN')).toEqual({ grosze: -57, currency: 'PLN' })
    expect(parseBankAmount('abc')).toBeNull()
  })

  it('plik użytkownika (zanonimizowany): nagłówek, okres, 269 operacji bez pominięć, suma kwot', () => {
    const f = fixture()
    expect(f.format).toBe('lista')
    expect(f.client).toBe('JAN KAPITAN')
    expect(f.period).toEqual({ from: '2024-10-18', to: '2025-10-18' })
    expect(f.skipped).toEqual([])
    expect(f.rows).toHaveLength(269)
    expect(f.rows[0]).toMatchObject({ line: 27, date: '2025-10-17', counterparty: 'SKLEP REMONTOWY', operation: 'ZAKUP PRZY UŻYCIU KARTY - INTERNET', pending: true, amount: -2776, category: 'Remont i ogród' })
    expect(f.rows.filter((r) => r.pending)).toHaveLength(5)
    expect(f.rows.at(-1)).toMatchObject({ date: '2025-08-07', counterparty: 'Apteka Rynek', amount: -2289 })
    // The header's „#Wpływy” is the sum of the money in.
    const inflow = f.rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0)
    expect(inflow).toBe(2980716)
    for (const r of f.rows) expect(Number.isInteger(r.amount)).toBe(true)
  })

  it('opis rozkładany na pola: kontrahent, tytuł, rodzaj operacji, rachunek', () => {
    const f = fixture()
    const find = (text: string) => f.rows.find((r) => r.description.includes(text))!
    expect(find('Withdrawal from')).toMatchObject({ counterparty: 'XTB SPÓŁKA AKCYJNA', title: 'Withdrawal from xxxxxxxxxxxxxxxxx', operation: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY' })
    expect(find('UL.TESTOWA 1')).toMatchObject({ counterparty: 'TOMASZ xxx', title: 'Przelew', operation: 'PRZELEW WEWNĘTRZNY PRZYCHODZĄCY', accountNo: '[REDACTED]' })
    expect(find('KOLACJA')).toMatchObject({ counterparty: 'MAREK xxx', title: 'KOLACJA', operation: 'BLIK P2P-WYCHODZĄCY', accountNo: '00114000000000000000000000' })
    expect(find('BLUE MEDIA')).toMatchObject({ counterparty: 'BLUE MEDIA SPÓŁKA AKCYJNA', title: 'Doładowanie telefonu', operation: 'PRZELEW MTRANSFER WYCHODZACY' })
    expect(find('ZWROT ZAKUPU')).toMatchObject({ counterparty: 'KOLEO', operation: 'ZWROT ZAKUPU', amount: 697 })
    expect(find('wpłata własna')).toMatchObject({ counterparty: 'ANNA xxx', title: 'wpłata własna' })
    expect(find('JAN KAPITAN, PRZELEW')).toMatchObject({ counterparty: 'JAN KAPITAN', operation: 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY', amount: -3200 })
    expect(find('xtb.com')).toMatchObject({ counterparty: 'xtb.com', operation: 'BLIK ZAKUP E-COMMERCE' })
    // The own name in a title (a friend's BLIK „Dla Jan Kapitan”) is not the counterparty.
    expect(find('Wyjście na paintball')).toMatchObject({ counterparty: 'xxx MAREK', operation: 'BLIK P2P-PRZYCHODZĄCY' })
  })

  it('rodzaj operacji z dopiskiem i sama prowizja banku (wiersze syntetyczne)', () => {
    expect(splitDescription(`${pad('PUNKT TEST', 12)}${pad('ZAKUP PRZY UŻYCIU KARTY W KRAJU - GRY HAZARDOWE', 60)}`)).toMatchObject({
      counterparty: 'PUNKT TEST',
      operation: 'ZAKUP PRZY UŻYCIU KARTY W KRAJU - GRY HAZARDOWE'
    })
    expect(splitDescription(pad('PROWIZJA OD ZAKUPU PRZY UŻYCIU KARTY W KRAJU', 70))).toMatchObject({ counterparty: '', operation: 'PROWIZJA OD ZAKUPU PRZY UŻYCIU KARTY W KRAJU' })
    expect(splitDescription('Bolt  ZAKUP PRZY UŻYCIU KARTY - INTERNET                 transakcja nierozliczona')).toMatchObject({
      description: 'Bolt ZAKUP PRZY UŻYCIU KARTY - INTERNET',
      pending: true
    })
    expect(splitDescription('BANKOMAT 123 WARSZAWA  WYPŁATA W BANKOMACIE')).toMatchObject({ counterparty: 'BANKOMAT 123 WARSZAWA', operation: 'WYPŁATA W BANKOMACIE' })
  })

  it('historia rachunku (starszy eksport, Windows-1250): kolumny tytułu, nadawcy i salda; inna waluta pominięta', () => {
    const csv = [
      'mBank S.A. Bankowość Detaliczna;',
      '#Klient;',
      'JAN KAPITAN;',
      '#Za okres:;',
      '01.10.2026;15.10.2026;',
      '#Data operacji;#Data księgowania;#Opis operacji;#Tytuł;#Nadawca/Odbiorca;#Numer konta;#Kwota;#Saldo po operacji;',
      '2026-10-01;2026-10-02;ZAKUP PRZY UŻYCIU KARTY;"ŻABKA Z1234 WARSZAWA";"";\'\';-12,34;1 000,00;',
      '2026-10-02;2026-10-03;ZAKUP PRZY UŻYCIU KARTY;"BAR POD LIPA        /OLESNICA                DATA TRANSAKCJI: 2026-10-01";"";\'\';-20,00;980,00;',
      '2026-10-03;2026-10-03;PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY;"zwrot za obiad";"ANNA KOWALSKA  UL. TESTOWA 1";\'12105000000000000000000001\';50,00;1 050,00;',
      '2026-10-04;2026-10-04;ZAKUP PRZY UŻYCIU KARTY;"SHOP";"";\'\';-10,00 EUR;1 050,00;',
      ';',
      '#Saldo końcowe;1 050,00;'
    ].join('\r\n')
    expect(decodeText(cp1250(csv))).toBe(csv)
    const f = parseMbank(decodeText(cp1250(csv)))
    expect(f.format).toBe('historia')
    expect(f.rows.map((r) => [r.date, r.counterparty, r.title, r.amount, r.balanceAfter])).toEqual([
      ['2026-10-01', 'ŻABKA Z1234 WARSZAWA', '', -1234, 100000],
      ['2026-10-02', 'BAR POD LIPA', '', -2000, 98000],
      ['2026-10-03', 'ANNA KOWALSKA', 'zwrot za obiad', 5000, 105000]
    ])
    // The shop without the bank's additions (the town after „/”, the date of the transaction); the row's key as before.
    expect(f.rows[1]).toMatchObject({ bankName: 'BAR POD LIPA /OLESNICA DATA TRANSAKCJI: 2026-10-01', description: 'ZAKUP PRZY UŻYCIU KARTY BAR POD LIPA /OLESNICA DATA TRANSAKCJI: 2026-10-01' })
    expect(f.rows[0]!.bankName).toBeUndefined()
    expect(f.rows[2]!.operation).toBe('PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY')
    expect(f.rows[2]!.accountNo).toBe('12105000000000000000000001')
    expect(f.skipped).toEqual([{ line: 10, reason: 'kwota w EUR – FI prowadzi tylko PLN' }])
  })

  it('nie CSV z mBanku: czytelny błąd', () => {
    expect(() => parseMbank('Data;Kwota\n2026-10-01;12')).toThrow(MbankFormatError)
  })
})

describe('klucz wiersza między importami', () => {
  it('ten sam wiersz = ten sam klucz; dwa identyczne wiersze – dwa klucze; nierozliczona i rozliczona – ten sam', () => {
    const f = fixture()
    const keys = rowKeys(f.rows, MBANK_ACCOUNT_ID)
    expect(new Set(keys).size).toBe(keys.length)
    expect(rowKeys(f.rows, MBANK_ACCOUNT_ID)).toEqual(keys)
    const bolts = f.rows.map((r, i) => [r, keys[i]] as const).filter(([r]) => r.date === '2025-10-09' && r.amount === -1261)
    expect(bolts.map(([, k]) => k?.slice(-2))).toEqual([':0', ':1'])
    const pending = f.rows[0]!
    expect(rowKeys([{ ...pending, pending: false }], MBANK_ACCOUNT_ID)).toEqual([keys[0]])
    expect(rowKeys([pending], XTB_WALLET_ACCOUNT_ID)).not.toEqual([keys[0]])
  })
})
