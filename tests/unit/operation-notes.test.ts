import { describe, expect, it } from 'vitest'
import { categoryIndex, notesOf } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { operationRowsOf, operationsCsv } from '@shared/export/budget'
import { emptyFilter, matchesFilter, noteLineOf } from '@shared/operationsView'
import { searchRecords } from '@shared/search'
import { findDuplicates } from '@shared/import/duplicates'
import { defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

const AT = '2026-10-01T10:00:00.000Z'
const settings = createDefaultSettings(AT).settings
const ctx = { categories: categoryIndex(settings.categories), accounts: settings.accounts, orders: settings.orders }
const FOOD = defaultCategoryId(1, 1)
const FUN = defaultCategoryId(6)
let seq = 0
const tx = (over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: `01K8N00000000000000000${String(++seq).padStart(4, '0')}`, createdAt: AT, updatedAt: AT, date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, amount: -5000, ...over })
const line = (amount: number, note: string, categoryId: string | null = FOOD) => ({ id: `01K8N0000000000000000S${String(++seq).padStart(4, '0')}`, amount, categoryId, refundable: false, memberId: null, advance: false, note })

describe('opis wydatku (1.11.0, D89)', () => {
  const receipt = tx({ counterparty: 'Auchan', splits: [line(-3000, 'zakupy na tydzień'), line(-2000, '  kabel HDMI \n do telewizora ', FUN)] })
  const described = tx({ counterparty: 'Allegro', note: '\n  Prezent dla mamy – szalik\nzamówione w promocji', splits: [line(-5000, 'szalik')] })
  const plain = tx({ counterparty: 'Orlen' })

  it('notatka na liście: pierwsza linia notatki, bez niej – opisy części paragonu', () => {
    expect(noteLineOf(described)).toBe('Prezent dla mamy – szalik')
    expect(noteLineOf(receipt)).toBe('zakupy na tydzień · kabel HDMI do telewizora')
    expect(noteLineOf(plain)).toBe('')
    // The whole for the hint and the export: the note, then the lines'.
    expect(notesOf(described)).toEqual(['Prezent dla mamy – szalik\nzamówione w promocji', 'szalik'])
    expect(notesOf(receipt)).toEqual(['zakupy na tydzień', 'kabel HDMI \n do telewizora'])
    expect(notesOf(plain)).toEqual([])
  })

  it('wyszukiwarka listy i paleta szukają też w opisach części', () => {
    const all = [receipt, described, plain]
    const found = (query: string) => all.filter((t) => matchesFilter(t, { ...emptyFilter('2026-10'), query }, ctx)).map((t) => t.counterparty)
    expect(found('hdmi')).toEqual(['Auchan'])
    expect(found('szalik')).toEqual(['Allegro'])
    expect(found('promocji')).toEqual(['Allegro'])
    expect(searchRecords('kabel', { transactions: all, containers: [], goals: [], loans: [], members: [], settings: [], ctx }).operations.map((t) => t.counterparty)).toEqual(['Auchan'])
  })

  it('eksport: kolumna „Notatka” – notatka operacji jak jest, potem opisy części z ich kategorią', () => {
    const partly = tx({ counterparty: 'Media Expert', note: 'gwarancja 2 lata ', splits: [line(-3000, ''), line(-2000, 'kabel', null)] })
    const rows = operationRowsOf([receipt, described, plain, partly], settings.categories, settings.accounts, settings.household.members)
    expect(rows.map((r) => r.note)).toEqual([
      'Jedzenie · zakupy spożywcze: zakupy na tydzień · Rozrywka i hobby: kabel HDMI \n do telewizora',
      '\n  Prezent dla mamy – szalik\nzamówione w promocji · Jedzenie · zakupy spożywcze: szalik',
      '',
      // A line of no category: its description alone; an undescribed line – nothing.
      'gwarancja 2 lata  · kabel'
    ])
    expect(operationsCsv(rows).split('\r\n')[0]).toContain(';Notatka;')
  })

  it('duplikaty: opis części paragonu to treść użytkownika – kopia z nim zostaje', () => {
    const bank = { format: 'mbank' as const, key: 'k1', description: 'AUCHAN', counterparty: 'Auchan', operation: '', category: '', pending: false, importedAt: AT }
    const bare = tx({ counterparty: 'Auchan', bank, splits: [line(-3000, ''), line(-2000, '', FUN)] })
    // The same row of the bank twice (two computers): the copy with the line's description is kept.
    const told = tx({ counterparty: 'Auchan', bank, splits: [line(-3000, 'zakupy'), line(-2000, '', FUN)], createdAt: '2026-10-01T11:00:00.000Z' })
    const groups = findDuplicates([bare, told], [])
    expect(groups.map((g) => [g.kind, g.keep, g.remove])).toEqual([['same-row', told.id, [bare.id]]])
  })
})
