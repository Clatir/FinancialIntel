import { describe, expect, it } from 'vitest'
import { computeFleet } from '@shared/calc/fleet'
import { monthsAverageOf } from '@shared/calc/income'
import { debriefing } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import { exportPeriodOf, exportPeriodText, monthRows, monthsCsv, monthsSheet, operationRows, operationsOfPeriod, operationsSheet, partRowsOf, partsCsv, partsSheet } from '@shared/export/budget'
import { excelDay, excelTime, xlsxParts } from '@shared/export/xlsx'
import { asideOfOperations } from '@shared/operationsView'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Transaction } from '@shared/schema'

// AP-29 (N5): the export sums – the receipt's lines with their amounts, dates as dates, the period kept, the month's
// energy and the financed, the notes beside the bar and the 12 months' income.

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5P00000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1, 1)
const HOME = defaultCategoryId(2, 1)
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: FOOD, ...over })
const line = (amount: number, over: Record<string, unknown> = {}) => ({ id: nextId(), amount, categoryId: null, refundable: false, memberId: null, advance: false, note: '', ...over })
const s = createDefaultSettings(AT).settings
const MAMA = '01KMEMMAMA0000000000000001'
const members = [...s.household.members, { id: MAMA, name: 'Mama' }]

describe('AP-29: eksport do sumowania', () => {
  it('„Części”: wiersz na każdą część paragonu z kwotą i kategorią – suma części = kwota operacji; operacja bez części jednym wierszem', () => {
    const receipt = tx('2026-10-14', -zl(130), {
      counterparty: 'Carrefour',
      note: 'zakupy',
      tags: ['Dom'],
      splits: [line(-zl(100), { categoryId: FOOD, note: 'na tydzień' }), line(-zl(30), { categoryId: HOME, note: 'kabel', tags: ['Remont'] })]
    })
    const shared = tx('2026-10-15', -zl(90), { counterparty: 'Pizzeria', splits: [line(-zl(45), { categoryId: FOOD }), line(-zl(45), { categoryId: FOOD, refundable: true, memberId: MAMA, gift: true })] })
    // A file edited by hand: the lines cover 50 of 80 – the rest is the operation's own line, as the engine counts it.
    const partial = tx('2026-10-16', -zl(80), { counterparty: 'Rossmann', splits: [line(-zl(50), { categoryId: HOME })] })
    const plain = tx('2026-10-13', -zl(12.5), { counterparty: 'Żabka', note: 'bułki' })
    const ops = operationsOfPeriod([receipt, shared, partial, plain], '2026-10-01', '2026-10-31')
    const rows = partRowsOf(ops, s.categories, s.accounts, members)
    expect(rows.map((r) => [r.operation, r.counterparty, r.part, r.amount, r.category, r.financed, r.note, r.tags])).toEqual([
      [1, 'Żabka', '', -zl(12.5), 'Jedzenie · zakupy spożywcze', '', 'bułki', ''],
      [2, 'Carrefour', '1 z 2', -zl(100), 'Jedzenie · zakupy spożywcze', '', 'na tydzień', '#Dom'],
      [2, 'Carrefour', '2 z 2', -zl(30), 'Dom · czynsz i opłaty', '', 'kabel', '#Dom #Remont'],
      [3, 'Pizzeria', '1 z 2', -zl(45), 'Jedzenie · zakupy spożywcze', '', '', ''],
      [3, 'Pizzeria', '2 z 2', -zl(45), 'Jedzenie · zakupy spożywcze', 'Mama (prezent)', '', ''],
      [4, 'Rossmann', '1 z 2', -zl(50), 'Dom · czynsz i opłaty', '', '', ''],
      [4, 'Rossmann', '2 z 2', -zl(30), 'Jedzenie · zakupy spożywcze', '', '', '']
    ])
    // Each operation's lines sum to its amount – the main row of „Operacje” unchanged (D89 / T303).
    const main = operationRows([receipt, shared, partial, plain], s.categories, s.accounts, '2026-10-01', '2026-10-31', members)
    for (const [i, r] of main.entries()) expect(rows.filter((p) => p.operation === i + 1).reduce((a, p) => a + p.amount, 0)).toBe(r.amount)
    expect(main[1]!.category).toBe('Jedzenie · zakupy spożywcze + Dom · czynsz i opłaty')
    const csv = partsCsv(rows).split('\r\n')
    expect(csv[0]).toBe('﻿Nr operacji;Data;Konto;Rodzaj;Kontrahent;Tytuł;Część;Kwota części (zł);Kategoria;Finansuje;Opis;Tagi')
    expect(csv[3]).toBe('2;2026-10-14;mBank;Wydatek;Carrefour;;2 z 2;-30,00;Dom · czynsz i opłaty;;kabel;#Dom #Remont')
    const sheet = partsSheet(rows)
    expect(sheet.name).toBe('Części')
    expect(sheet.rows[2]!.slice(0, 2)).toEqual([2, '2026-10-14'])
    expect(sheet.rows[2]![7]).toBe(-30)
  })

  it('„Części”: część wpływu domownika – „od: …”, bez kategorii; przelew na liście jednego konta – jego strona', () => {
    const income = tx('2026-10-04', zl(500), { kind: 'income', categoryId: null, splits: [line(zl(200), { memberId: MAMA })] })
    const rows = partRowsOf([income], s.categories, s.accounts, members)
    expect(rows.map((r) => [r.part, r.amount, r.category, r.financed])).toEqual([
      ['1 z 2', zl(200), '', 'od: Mama'],
      ['2 z 2', zl(300), '', '']
    ])
    const transfer = tx('2026-10-05', -zl(300), { kind: 'transfer', categoryId: null, counterAccountId: XTB_WALLET_ACCOUNT_ID, bothSides: true })
    const onWallet = partRowsOf([transfer], s.categories, s.accounts, members, XTB_WALLET_ACCOUNT_ID)
    expect(onWallet.map((r) => [r.amount, r.account])).toEqual([[zl(300), 'mBank → Portfel XTB']])
  })

  it('Excel: daty, miesiące i godziny jako daty Excela; tekst, który nie jest datą, zostaje tekstem', () => {
    expect(excelDay('2025-01-01')).toBe(45658)
    expect(excelDay('2026-10-14')).toBe(46309)
    expect(excelDay('2026-02-30')).toBeNull()
    expect(excelTime('19:30')).toBeCloseTo(19.5 / 24, 10)
    expect(excelTime('25:00')).toBeNull()
    const rows = operationRows([tx('2026-10-14', -zl(10), { time: '19:30' })], s.categories, s.accounts, '2026-10-01', '2026-10-31')
    const sheet = xlsxParts([operationsSheet(rows)]).find((p) => p.path === 'xl/worksheets/sheet1.xml')!.content
    expect(sheet).toContain('<c r="A2" s="6"><v>46309</v></c>')
    expect(sheet).toContain(`<c r="B2" s="8"><v>${19.5 / 24}</v></c>`)
    const styles = xlsxParts([]).find((p) => p.path === 'xl/styles.xml')!.content
    expect(styles).toContain('formatCode="yyyy-mm-dd"')
    // With the savings rate's one place (T294, N4): style 9, „0.0”.
    expect(styles).toContain('<cellXfs count="10">')
    expect(styles).toContain('<numFmt numFmtId="168" formatCode="0.0"/>')
    // The month of „Miesiące” – its first day shown as RRRR-MM; the rate with one place.
    const months = xlsxParts([monthsSheet([{ month: '2026-10', salary: null, costs: 0, income: 0, plus: null, inProgress: true, loot: null, balance: 0, rate: 55, energy: null, financed: 0, planned: 0, plannedIncome: 0 }])])
    const monthsXml = months.find((p) => p.path === 'xl/worksheets/sheet1.xml')!.content
    expect(monthsXml).toContain('<c r="A2" s="7"><v>46296</v></c>')
    expect(monthsXml).toContain('<c r="H2" s="9"><v>55</v></c>')
    // Not a date: a text, without a date's style.
    const odd = xlsxParts([{ name: 'X', columns: [{ header: 'Data', kind: 'date' }], rows: [['wkrótce']] }])
    expect(odd.find((p) => p.path === 'xl/worksheets/sheet1.xml')!.content).toContain('<c r="A2" t="inlineStr"><is><t xml:space="preserve">wkrótce</t></is></c>')
  })

  it('„Miesiące”: energia miesiąca i sfinansowane przez domowników – jak debriefing', () => {
    const settings = { ...s, budget: { ...s.budget, start: '2026-09-01' } }
    const plans = [monthPlanSchema.parse({ ...base(), month: '2026-09', salary: zl(3000) })]
    const transactions = [tx('2026-09-05', -zl(500)), tx('2026-09-06', -zl(100), { refundable: true, memberId: s.household.members[0]!.id })]
    const balances = [balanceSchema.parse({ ...base(), date: '2026-09-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(10000) })]
    const fleet = computeFleet({ settings, transactions, months: plans, balances, now: '2026-10-10T10:00:00.000Z' })
    const input = { transactions, categories: s.categories, plans, log: fleet.log, alarms: fleet.alarms, today: fleet.today }
    const d = debriefing('2026-09', input)
    expect(d.energy?.budget).toBeGreaterThan(0)
    const [row] = monthRows(input, ['2026-09'])
    expect([row!.energy, row!.financed]).toEqual([d.energy!.budget, zl(100)])
    const csv = monthsCsv([row!]).split('\r\n')
    // The planned costs and income (przegląd N5 8, 2 N5) after them: the columns before them where they were.
    expect(csv[0]!.endsWith(';Energia miesiąca (zł);Sfinansowane przez domowników (zł);Zaplanowane koszty – data po dziś (zł);Zaplanowane przychody – data po dziś (zł)')).toBe(true)
    expect(csv[1]!.endsWith(`;${(d.energy!.budget / 100).toFixed(2).replace('.', ',')};100,00;0,00;0,00`)).toBe(true)
    expect(monthsSheet([row!]).rows[0]!.slice(-4)).toEqual([d.energy!.budget / 100, 100, 0, 0])
  })

  it('pasek Operacji: przelewy własne i korekty poza sumami – suma pliku = Wpływy − Wydatki + one', () => {
    const own = tx('2026-10-05', -zl(200), { kind: 'transfer', categoryId: null, counterAccountId: XTB_WALLET_ACCOUNT_ID, bothSides: true })
    const fix = tx('2026-10-06', zl(5), { kind: 'correction', categoryId: null })
    const buy = tx('2026-10-07', -zl(40))
    expect(asideOfOperations([own, buy])).toEqual({ count: 1, amount: -zl(200), corrections: false })
    expect(asideOfOperations([own, fix, buy])).toEqual({ count: 2, amount: -zl(195), corrections: true })
    // The list of Portfel XTB: the transfer's money on it, as the file writes it.
    expect(asideOfOperations([own], XTB_WALLET_ACCOUNT_ID).amount).toBe(zl(200))
    expect(asideOfOperations([buy])).toEqual({ count: 0, amount: 0, corrections: false })
  })

  it('„Przychody” 12 mies.: przy miesiącu z dopłatą do XTB – średnia miesięcy jak w Bilansie paliwa; bez dopłat – nic', () => {
    const months = [
      { month: '2026-01', work: zl(9000), trading: zl(2000), total: zl(11000) },
      { month: '2026-02', work: zl(9000), trading: -zl(1000), total: zl(9000) }
    ]
    expect(monthsAverageOf({ months })).toBe(zl(10000))
    expect(monthsAverageOf({ months: [months[0]!] })).toBeNull()
  })

  it('okres eksportu zapamiętany: bez zapisu – od początku roku do dziś; wybrany – wraca; „do dziś” idzie z nowym dniem', () => {
    expect(exportPeriodOf(null, '2026-11-04')).toEqual({ from: '2026-01-01', to: '2026-11-04' })
    expect(exportPeriodOf(exportPeriodText('2025-08-01', '2026-11-04', '2026-11-04'), '2026-11-10')).toEqual({ from: '2025-08-01', to: '2026-11-10' })
    expect(exportPeriodOf(exportPeriodText('2025-08-01', '2026-10-31', '2026-11-04'), '2026-11-10')).toEqual({ from: '2025-08-01', to: '2026-10-31' })
    expect(exportPeriodOf('{"from":"zły"}', '2026-11-04')).toEqual({ from: '2026-01-01', to: '2026-11-04' })
    expect(exportPeriodOf('nie json', '2026-11-04')).toEqual({ from: '2026-01-01', to: '2026-11-04' })
  })
})
