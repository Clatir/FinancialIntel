import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { duplicateKey, findDuplicates, mergeDuplicate } from '@shared/import/duplicates'
import type { MbankFile, MbankRow } from '@shared/import/mbank'
import { buildImport, planImport, type ImportChoices } from '@shared/import/reconcile'
import { defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, XTB_WALLET_ACCOUNT_ID, dockingSchema, transactionSchema, type Transaction } from '@shared/schema'

const NOW = '2026-10-17T12:00:00.000Z'
let seq = 0
const id = () => `01K3${String(++seq).padStart(22, '0')}`
const settings = createDefaultSettings(NOW).settings
const ctx = { rules: [], ownNames: [], categories: categoryIndex(settings.categories) }
const FOOD = defaultCategoryId(1, 1)
const COFFEE = defaultCategoryId(1, 3)

const tx = (over: Partial<Transaction>): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: id(), createdAt: NOW, updatedAt: NOW, date: '2026-10-10', accountId: MBANK_ACCOUNT_ID, amount: -2500, ...over })
const bank = (key: string, counterparty: string, pending = false) => ({ format: 'mbank' as const, key, description: counterparty, counterparty, operation: 'ZAKUP PRZY UŻYCIU KARTY W KRAJU', category: '', pending, importedAt: NOW })
const row = (over: Partial<MbankRow>): MbankRow => ({
  line: 1,
  date: '2026-10-10',
  description: '',
  operation: 'ZAKUP PRZY UŻYCIU KARTY W KRAJU',
  counterparty: '',
  title: '',
  accountNo: '',
  category: '',
  amount: -2500,
  pending: false,
  balanceAfter: null,
  ...over
})
const file = (rows: MbankRow[]): MbankFile => ({ format: 'lista', client: null, account: null, period: null, rows, skipped: [] })
const empty = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {} })

describe('import: wpis ręczny nie wchodzi drugi raz (D77)', () => {
  it('możliwy duplikat: ta sama kwota pod inną nazwą albo prawie ta sama przy podobnej – łączony, oznaczony', () => {
    const coffee = tx({ counterparty: 'Kawa z rana', categoryId: COFFEE, time: '08:10' })
    const shop = tx({ counterparty: 'Biedronka', amount: -4990, date: '2026-10-11', categoryId: FOOD })
    const plan = planImport(file([row({ counterparty: 'STARBUCKS 123', date: '2026-10-11' }), row({ counterparty: 'BIEDRONKA 4411', amount: -4999, date: '2026-10-12' })]), MBANK_ACCOUNT_ID, [coffee, shop], ctx)
    expect(plan.rows.map((p) => (p.status === 'merge' ? [p.tx.id, p.loose] : p.status))).toEqual([
      [coffee.id, 'name'],
      [shop.id, 'amount']
    ])
    const result = buildImport(plan, empty(), { now: NOW, house: 0, makeId: id, rules: [] })
    expect(result.create).toEqual([])
    expect(result.update.find((t) => t.id === shop.id)).toMatchObject({ amount: -4999, date: '2026-10-12', categoryId: FOOD, counterparty: 'Biedronka' })
    // Too far off, another direction, over 3 days: a new operation.
    const far = planImport(file([row({ counterparty: 'LIDL', amount: -6000 }), row({ amount: 2500 }), row({ date: '2026-10-20' })]), MBANK_ACCOUNT_ID, [tx({ counterparty: 'Lidl' })], ctx)
    expect(far.rows.map((p) => p.status)).toEqual(['new', 'new', 'new'])
  })
})

describe('duplikaty zapisanych operacji (D77)', () => {
  it('wpis ręczny i jego kopia z banku: zostaje wpis, bierze dane banku; inna decyzja w kopii = konflikt', () => {
    const own = tx({ counterparty: 'Kawa', categoryId: COFFEE, time: '08:10', note: 'z Anią' })
    const copy = tx({ counterparty: 'STARBUCKS', date: '2026-10-11', bank: bank('mbank:aa:0', 'STARBUCKS') })
    const [g] = findDuplicates([own, copy], [])
    expect(g).toMatchObject({ kind: 'manual', keep: own.id, remove: [copy.id], conflict: false, blocked: null, differs: 'name' })
    expect(mergeDuplicate(own, [copy], 'manual', NOW)).toMatchObject({ id: own.id, date: '2026-10-11', bank: { key: 'mbank:aa:0' }, categoryId: COFFEE, time: '08:10', note: 'z Anią', counterparty: 'Kawa' })
    const decided = { ...copy, categoryId: FOOD }
    expect(findDuplicates([own, decided], [])[0]?.conflict).toBe(true)
    // „To nie duplikat”: not offered again; another account or over 3 days: none.
    expect(findDuplicates([own, copy], [], { [duplicateKey([own.id, copy.id])]: NOW })).toEqual([])
    expect(findDuplicates([own, { ...copy, accountId: XTB_WALLET_ACCOUNT_ID }], [])).toEqual([])
    expect(findDuplicates([own, { ...copy, date: '2026-10-20' }], [])).toEqual([])
  })

  it('ten sam wiersz banku dwa razy (dwa komputery): zostaje nowsza wersja, chyba że druga ma więcej Twoich danych albo dokowanie', () => {
    const older = tx({ bank: bank('mbank:bb:0', 'LIDL', true), updatedAt: '2026-10-11T08:00:00.000Z' })
    const newer = tx({ bank: bank('mbank:bb:0', 'LIDL'), updatedAt: '2026-10-11T09:00:00.000Z' })
    expect(findDuplicates([older, newer], [])[0]).toMatchObject({ kind: 'same-row', keep: newer.id, remove: [older.id] })
    const categorized = { ...older, categoryId: FOOD }
    expect(findDuplicates([categorized, newer], [])[0]?.keep).toBe(categorized.id)
    expect(mergeDuplicate(categorized, [newer], 'same-row', NOW).bank?.pending).toBe(false)
    const dock = (transactionId: string) => dockingSchema.parse({ schemaVersion: SCHEMA_VERSION, id: id(), createdAt: NOW, updatedAt: NOW, date: '2026-10-11', transactionId })
    expect(findDuplicates([older, newer], [dock(older.id)])[0]?.keep).toBe(older.id)
    expect(findDuplicates([older, newer], [dock(older.id), dock(newer.id)])[0]?.blocked).toMatch(/zadokowane/)
  })

  it('każda strona najwyżej raz: dwa wpisy ręczne, jedna operacja banku – bliższy dzień', () => {
    const a = tx({ counterparty: 'Biedronka', date: '2026-10-08' })
    const b = tx({ counterparty: 'Biedronka', date: '2026-10-10' })
    const copy = tx({ counterparty: 'BIEDRONKA', date: '2026-10-10', bank: bank('mbank:cc:0', 'BIEDRONKA') })
    const groups = findDuplicates([a, b, copy], [])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ keep: b.id, remove: [copy.id] })
  })
})
