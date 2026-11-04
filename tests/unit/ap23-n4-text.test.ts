import { describe, expect, it, vi } from 'vitest'
import { rateText } from '@shared/calc/fuel'
import { monthsCsv } from '@shared/export/budget'
import { countLabel, decimalText, percentText, plDate, plDateTime, plural, salariesText } from '@shared/format'
import { GLOSSARY, ICT_GLOSSARY, glossaryOf, ictOf } from '@shared/glossary'
import { clampZoom } from '@shared/machine'
import { formatValue } from '@shared/merge'
import { jsonErrorText, plainError, schemaIssueText } from '@shared/plainError'
import { parseRecordText } from '@shared/records'
import type { BackupDiffItem } from '@shared/api'

// The renderer's helpers import the stores, which talk to the main process through window.fi.
vi.stubGlobal('window', { fi: {} })
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
const { monthLocLabel, periodLabel } = await import('../../src/renderer/lib/format')
const { recordTitle } = await import('../../src/renderer/lib/recordTitle')
const { summary, countOf } = await import('../../src/renderer/features/settings/recover')
const { problemLabel } = await import('../../src/renderer/features/sync/SyncPage')

describe('AP-23: daty, liczby i liczebniki jednym sposobem', () => {
  it('data zawsze dd.mm.rrrr, chwila z dwiema cyframi dnia i miesiąca (AF-55, IM.1)', () => {
    expect(plDate('2026-11-03')).toBe('03.11.2026')
    expect(plDateTime(new Date(2025, 8, 1, 10, 0))).toBe('01.09.2025, 10:00')
    expect(plDateTime(new Date(2026, 10, 3, 11, 23, 8), true)).toBe('03.11.2026, 11:23:08')
    expect(plDateTime(null)).toBe('—')
    expect(plDateTime('to nie data')).toBe('—')
  })

  it('liczby z przecinkiem i minusem typograficznym; zero bez znaku (US sp. 3, WY sp. 6)', () => {
    expect(decimalText(1)).toBe('1,0')
    expect(decimalText(52.94)).toBe('52,9')
    expect(decimalText(-6.2)).toBe('−6,2')
    expect(decimalText(-0.04)).toBe('0,0')
    expect(decimalText(2.5, 2)).toBe('2,50')
    expect(percentText(-60)).toBe('−60,0%')
  })

  it('stopa oszczędności zawsze z jednym miejscem po przecinku (T294, AF-69)', () => {
    expect(rateText(55)).toBe('55,0%')
    expect(rateText(32)).toBe('32,0%')
    expect(rateText(52.9)).toBe('52,9%')
    expect(rateText(-60)).toBe('−60,0%')
    expect(rateText(null)).toBe('—')
    const csv = monthsCsv([{ month: '2025-10', salary: null, costs: 4500, income: 10000, plus: true, loot: null, inProgress: false, balance: 5500, rate: 55, energy: null, financed: 0 }])
    // The rate's column – the 8th (the energy and the financed after it since AP-29).
    expect(csv.split('\r\n')[1]!.split(';')[7]).toBe('55,0')
  })

  it('odmiana liczebników: jeden wspólny pomocnik (KR sp. 8)', () => {
    expect([1, 2, 4, 5, 12, 14, 22, 25].map((n) => plural(n, 'pensja', 'pensje', 'pensji'))).toEqual(['pensja', 'pensje', 'pensje', 'pensji', 'pensji', 'pensji', 'pensje', 'pensji'])
    expect(countLabel(3, 'cel', 'cele', 'celów')).toBe('3 cele')
    expect(salariesText(1)).toBe('1 pensja')
    expect(salariesText(3)).toBe('3 pensje')
    expect(salariesText(1.5)).toBe('1,5 pensji')
    expect(salariesText(6)).toBe('6 pensji')
  })

  it('miesiąc po „w” w miejscowniku, zakres Operacji z datami dd.mm.rrrr (MG.3, OP.3)', () => {
    expect(monthLocLabel('2026-11')).toBe('listopadzie 2026')
    expect(monthLocLabel('2026-12')).toBe('grudniu 2026')
    expect(periodLabel({ kind: 'range', from: '2025-12-31', to: '2026-01-01' })).toBe('31.12.2025 – 01.01.2026')
    expect(periodLabel({ kind: 'range', from: '2026-10-26', to: null })).toBe('26.10.2026 – …')
    expect(periodLabel({ kind: 'month', month: '2026-10' })).toBe('październik 2026')
    expect(periodLabel({ kind: 'all' })).toBe('cała historia')
  })

  it('zoom ręcznie wpisany w config.json leży na siatce 10 % (AF-71)', () => {
    expect(clampZoom(1.23)).toBe(1.2)
    expect(clampZoom(1.25)).toBe(1.3)
    expect(clampZoom(3)).toBe(1.5)
  })
})

describe('AP-23: komunikaty systemu po polsku, szczegół w logu', () => {
  it('kody systemu plików (DA sp. 2)', () => {
    const text = plainError("Kopia dzienna nie powstała: ENOENT: no such file or directory, mkdir '\\\\?' – sprawdź folder.")
    expect(text).toBe('Kopia dzienna nie powstała: nie ma takiego pliku ani folderu (może dysk jest odłączony) – sprawdź folder.')
    expect(plainError("EBUSY: resource busy or locked, open 'C:\\x\\2026-10-30_01KAZ.json'")).toBe('plik jest zajęty przez inny program (np. OneDrive jeszcze go pobiera)')
    expect(plainError("EPERM: operation not permitted, rename 'a' -> 'b'")).toContain('system nie pozwala')
    expect(plainError('ENOSPC: no space left on device, write')).toBe('brak miejsca na dysku')
  })

  it('archiwum i JSON bez angielskich zdań', () => {
    expect(plainError('End of central directory record signature not found. Either not a zip file')).toBe('archiwum ZIP jest uszkodzone albo niepełne')
    expect(plainError('Nie udało się (Unterminated string in JSON at position 12 (line 1 column 13)).')).toBe('Nie udało się (plik nie jest poprawnym zapisem JSON (błąd przy znaku 13)).')
    expect(jsonErrorText(new Error('Unexpected end of JSON input'))).toBe('plik urywa się w połowie')
    expect(plainError('Unexpected token \'}\', "{"a":}" is not valid JSON')).toBe('plik nie jest poprawnym zapisem JSON')
  })

  it('własne polskie zdania i podwójne użycie nic nie psują', () => {
    const own = 'Nie udało się zapisać: EBUSY: plik zablokowany. Aplikacja ponowi zapis automatycznie.'
    expect(plainError(own)).toBe(own)
    const once = plainError("EBUSY: resource busy or locked, open 'x'")
    expect(plainError(once)).toBe(once)
  })

  it('plik z uszkodzonym JSON-em i zła struktura – opis po polsku (DA.31)', () => {
    const bad = parseRecordText('transactions', '{"a": "ucięty')
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.error).toMatch(/^Uszkodzony JSON: plik/)
      expect(bad.error).not.toMatch(/Unterminated|position|in JSON at/)
    }
    const wrong = parseRecordText('transactions', JSON.stringify({ schemaVersion: 1, id: '01KAZ0000000000000000000AA', date: '2026-10-01' }))
    expect(wrong.ok).toBe(false)
    if (!wrong.ok) expect(wrong.error).not.toMatch(/Invalid|expected|received/)
    expect(schemaIssueText('Invalid input: expected number, received undefined')).toBe('powinno być: liczba, jest: brak wartości')
  })

  it('plik zablokowany przez OneDrive to „zablokowany”, nie „uszkodzony” (DA.31)', () => {
    expect(problemLabel({ kind: 'corrupt', unreadable: true })).toBe('zablokowany')
    expect(problemLabel({ kind: 'corrupt' })).toBe('uszkodzony')
    expect(problemLabel({ kind: 'invalid' })).toBe('zła struktura')
  })
})

describe('AP-23: tytuły, różnice i podsumowania bez ISO ani błędów odmiany', () => {
  it('tytuł wpisu w dzienniku zmian i historii (IN.21, SA.1, OP.26)', () => {
    expect(recordTitle('balances', { date: '2025-09-02' })).toBe('Saldo 02.09.2025')
    expect(recordTitle('transactions', { date: '2026-11-03', counterparty: 'Mokka' })).toBe('Operacja 03.11.2026: Mokka')
    expect(recordTitle('months', { month: '2026-10' })).toBe('Plan miesiąca październik 2026')
    expect(recordTitle('dockings', { date: '2026-10-24' })).toBe('Dokowanie 24.10.2026')
    expect(recordTitle('imports', { at: '2026-11-03T11:23:00.000Z', fileName: 'a.csv' })).toBe('Import z banku 03.11.2026: a.csv')
  })

  it('wartości w różnicach: dzień, chwila, miesiąc, przecinek, tak / nie (DA sp. 3, SA.1)', () => {
    expect(formatValue('2025-09-01')).toBe('01.09.2025')
    expect(formatValue('2026-11-03T11:24:23.355Z')).toBe(plDateTime('2026-11-03T11:24:23.355Z'))
    expect(formatValue('2026-10')).toBe('10.2026')
    expect(formatValue(1.5)).toBe('1,5')
    expect(formatValue(true)).toBe('tak')
    expect(formatValue('01KAZ00000000000000000AAAA')).toBe('01KAZ00000000000000000AAAA')
    // A list of objects by its count, in the Polish forms (AP-23); a list of values – the values (AP-27).
    const items = (n: number) => Array.from({ length: n }, (_, i) => ({ a: i }))
    expect([formatValue(items(12)), formatValue(items(22)), formatValue(items(25))]).toEqual(['12 pozycji', '22 pozycje', '25 pozycji'])
    expect(formatValue([1, 2, 3])).toBe('1, 2, 3')
  })

  it('podsumowanie odzyskania: imiesłów zgodny z rzeczownikiem (DA.17)', () => {
    const item = (collection: BackupDiffItem['collection'], change: BackupDiffItem['change'], n: number): BackupDiffItem[] =>
      Array.from({ length: n }, (_, i) => ({ collection, id: `${collection}${i}`, change, backup: null }))
    expect(summary(item('months', 'changed', 1))).toEqual(['1 plan miesiąca zmieniony'])
    expect(summary(item('transactions', 'changed', 1))).toEqual(['1 operacja zmieniona'])
    expect(summary(item('dockings', 'deleted', 1))).toEqual(['1 dokowanie usunięte'])
    expect(summary(item('containers', 'deleted', 3))).toEqual(['3 kontenery usunięte'])
    expect(summary([...item('transactions', 'changed', 5), ...item('transactions', 'deleted', 1)])).toEqual(['5 operacji zmienionych, 1 operacja usunięta'])
    expect(countOf('months', 5)).toBe('5 planów miesięcy')
  })
})

describe('AP-23: słowniczek Terminy ICT i dymki', () => {
  it('każdy termin ICT ma objaśnienie po polsku, termin zostaje po angielsku (WY sp. 2, MO.33)', () => {
    const terms = ICT_GLOSSARY.map((g) => g.term)
    for (const t of ['Daily Bias', 'BOS', 'CHoCH', 'FVG', 'Killzone', 'Order Block', 'Silver Bullet', 'Judas Swing', 'Turtle Soup', 'Liquidity sweep', 'Premium / Discount', 'DOL']) expect(terms).toContain(t)
    expect(ICT_GLOSSARY.every((g) => g.meaning.length > 20 && !/\b[TDBF]\d{2}\b|spec/.test(g.meaning))).toBe(true)
    expect(ictOf('Daily Bias')).toMatch(/^Daily Bias – Kierunek dnia/)
  })

  it('wszystkie linie „Stanu okrętu” mają objaśnienie w słowniczku okrętu (PR sp. 4)', () => {
    const terms = GLOSSARY.map((g) => g.term)
    for (const t of ['Osłony', 'Energia', 'Kadłub', 'Układy gwiezdne', 'Zbiornik', 'Podatek', 'Depozyt', 'Łupy', 'Dług', 'Klasa okrętu', 'Masa ładunku', 'Zasięg', 'Do zadokowania']) expect(terms).toContain(t)
    expect(glossaryOf('Dług')).toMatch(/^Dług – /)
  })
})
