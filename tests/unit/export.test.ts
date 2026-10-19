import { describe, expect, it } from 'vitest'
import { monthRows, monthsCsv, operationRows, operationsCsv, operationsSheet, plnCell, reportHtml, toCsv } from '@shared/export/budget'
import { xlsxParts } from '@shared/export/xlsx'
import { defaultWatchMonday } from '@shared/calc/intel'
import { createDefaultSettings } from '@shared/defaults'
import { defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1, 1)
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: FOOD, ...over })
const s = createDefaultSettings(AT).settings

describe('eksport (E8): CSV dla polskiego Excela, Excel, raport do PDF', () => {
  it('kwota w groszach jako tekst Excela, cudzysłowy przy średniku', () => {
    expect([plnCell(-123456), plnCell(5), plnCell(0)]).toEqual(['-1234,56', '0,05', '0,00'])
    expect(toCsv(['a', 'b'], [['x;y', 'z"q']])).toBe('﻿a;b\r\n"x;y";"z""q"\r\n')
    // A text Excel would run as a formula is defused; a negative amount is not.
    expect(toCsv(['a', 'b', 'c'], [['=HYPERLINK("x")', '-12,50', '-sklep']]).split('\r\n')[1]).toBe(`"'=HYPERLINK(""x"")";-12,50;'-sklep`)
  })

  it('operacje w okresie, po dacie i godzinie, z kategorią i oznaczeniami', () => {
    const rows = operationRows([tx('2026-10-03', -zl(12.5), { time: '09:15', counterparty: 'Biedronka', impulse: 'impulse' }), tx('2026-10-02', -zl(80), { refundable: true }), tx('2026-11-01', -zl(1))], s.categories, s.accounts, '2026-10-01', '2026-10-31', s.household.members)
    // Financed by a household member (D80): their name – an operation marked before 1.3.0 is the first member's („Dom”).
    expect(rows.map((r) => [r.date, r.amount, r.financed, r.log])).toEqual([
      ['2026-10-02', -zl(80), 'Dom', ''],
      ['2026-10-03', -zl(12.5), '', 'impuls']
    ])
    expect(rows[1]!.category).toBe('Jedzenie · zakupy spożywcze')
    expect(operationsCsv(rows).split('\r\n')[2]).toBe('2026-10-03;09:15;mBank;Wydatek;-12,50;Jedzenie · zakupy spożywcze;Biedronka;;;impuls;')
    expect(operationsSheet(rows).rows[1]![4]).toBe(-12.5)
    expect(xlsxParts([operationsSheet(rows)]).map((p) => p.path)).toContain('xl/worksheets/sheet1.xml')
    // An income carrying two members' money (D81): whose it is, no categories of its parts.
    const shared = tx('2026-10-04', zl(500), {
      kind: 'income',
      categoryId: null,
      memberId: HOUSE_MEMBER_ID,
      splits: [{ id: nextId(), amount: zl(200), categoryId: null, refundable: false, memberId: null, advance: false, note: '' }]
    })
    expect(operationRows([shared], s.categories, s.accounts, '2026-10-01', '2026-10-31', s.household.members).map((r) => [r.category, r.financed])).toEqual([['', 'od: Dom']])
  })

  it('miesiące: pensja, koszty, wpływy, na plus', () => {
    const plans = [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(3000) })]
    const rows = monthRows({ transactions: [tx('2026-10-05', -zl(500)), tx('2026-10-06', zl(4000), { kind: 'income', categoryId: null })], categories: s.categories, plans, log: [], today: '2026-11-02' }, ['2026-10'])
    expect(rows).toEqual([{ month: '2026-10', salary: zl(3000), costs: zl(500), income: zl(4000), plus: true, inProgress: false, loot: null }])
    // A household member's money is no income (D80: their advance here).
    const member = s.household.members[0]!.id
    const advance = tx('2026-10-07', zl(300), { kind: 'income', categoryId: null, memberId: member, advance: true })
    expect(monthRows({ transactions: [advance], categories: s.categories, plans, log: [], today: '2026-10-20' }, ['2026-10'])[0]!.income).toBe(0)
    expect(monthsCsv(rows).split('\r\n')[1]).toBe('2026-10;3000,00;500,00;4000,00;tak;')
  })

  it('raport HTML bez skryptów, teksty uciekane', () => {
    const html = reportHtml('Debriefing <X>', 'sub', [{ title: 'A & B', lines: [['k', '<script>']] }, { title: 'T', table: { head: ['x', 'y'], rows: [['1', '2']], numeric: [1] } }])
    expect(html).toContain("default-src 'none'")
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('<td class="num">2</td>')
  })

  it('raport wachty: w niedzielę od 18:00 ten tydzień, wcześniej poprzedni', () => {
    expect(defaultWatchMonday('2026-10-18', '18:05')).toBe('2026-10-12')
    expect(defaultWatchMonday('2026-10-18', '12:00')).toBe('2026-10-05')
    expect(defaultWatchMonday('2026-10-14', '20:00')).toBe('2026-10-05')
  })
})
