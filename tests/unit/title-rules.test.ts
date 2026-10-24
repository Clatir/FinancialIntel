import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type ImportRule, type Transaction } from '@shared/schema'

const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: unknown[]) => rs.map((r) => ({ ok: true, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(),
  deleteRecords: vi.fn(),
  historyKeep: vi.fn(),
  historyList: vi.fn(async () => [] as unknown[])
}
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) })
vi.stubGlobal('window', { fi: api })

const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const { matchesTitle, findMatchingByTitle, applyTargetToTransaction, applyTitleRule } = await import('../../src/renderer/features/operations/titleRules')

let seq = 0
const nextId = () => `01K7S00000000000000000${String(++seq).padStart(4, '0')}`
const tx = (over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: nextId(),
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    date: '2026-10-14',
    accountId: MBANK_ACCOUNT_ID,
    amount: -1000,
    ...over
  })

function load(txs: Transaction[], rules: ImportRule[] = []): void {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = txs.map((t) => ({ record: t, relPath: `transactions/2026/2026-10-14_${t.id}.json`, readOnly: false }))
  data.applySnapshot({
    fi: { ...fi, settings: { ...fi.settings, import: { ...fi.settings.import, rules } } },
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
}

beforeEach(() => {
  seq = 0
  storage.clear()
  vi.clearAllMocks()
})

describe('matchesTitle', () => {
  it('matches keyword in title', () => {
    const matcher = (words: readonly string[]) => words.includes('zwrot')
    expect(matchesTitle({ title: 'Zwrot za zakupy' }, matcher)).toBe(true)
    expect(matchesTitle({ title: 'Zwykły zakup' }, matcher)).toBe(false)
  })

  it('matches keyword in bank description if title is absent', () => {
    const matcher = (words: readonly string[]) => words.includes('stypendium')
    expect(matchesTitle({ title: '', bank: { description: 'Przelew: stypendium naukowe' } }, matcher)).toBe(true)
  })
})

describe('findMatchingByTitle', () => {
  it('finds transactions with matching keyword across past and future', () => {
    const tPast = tx({ date: '2025-05-10', title: 'Kieszonkowe dla syna' })
    const tFuture = tx({ date: '2027-01-15', title: 'Kieszonkowe na nowy rok' })
    const tOther = tx({ date: '2026-06-01', title: 'Zakupy Biedronka' })

    const dict = {
      [tPast.id]: { record: tPast },
      [tFuture.id]: { record: tFuture },
      [tOther.id]: { record: tOther }
    }

    const matches = findMatchingByTitle(dict, 'kieszonkowe')
    expect(matches.map((m) => m.id)).toEqual([tFuture.id, tPast.id])
  })

  it('excludes transaction with excludeId', () => {
    const t1 = tx({ title: 'Zwrot Allegro' })
    const t2 = tx({ title: 'Zwrot Allegro buty' })
    const dict = { [t1.id]: { record: t1 }, [t2.id]: { record: t2 } }

    const matches = findMatchingByTitle(dict, 'zwrot', t1.id)
    expect(matches.map((m) => m.id)).toEqual([t2.id])
  })

  it('filters by counterparty when specified', () => {
    const t1 = tx({ counterparty: 'Jan Kowalski', title: 'Zwrot za obiad' })
    const t2 = tx({ counterparty: 'Anna Nowak', title: 'Zwrot za obiad' })
    const dict = { [t1.id]: { record: t1 }, [t2.id]: { record: t2 } }

    const matches = findMatchingByTitle(dict, 'obiad', undefined, 'Jan Kowalski')
    expect(matches.map((m) => m.id)).toEqual([t1.id])
  })
})

describe('applyTargetToTransaction', () => {
  it('transforms transaction to expense with category', () => {
    const cat = defaultCategoryId(1)
    const original = tx({ kind: 'transfer', amount: 5000, title: 'Opłata za prąd' })
    const converted = applyTargetToTransaction(original, {
      keyword: 'prąd',
      kind: 'expense',
      direction: 'out',
      categoryId: cat
    })
    expect(converted.kind).toBe('expense')
    expect(converted.amount).toBe(-5000)
    expect(converted.categoryId).toBe(cat)
  })

  it('transforms transaction to refund (expense with positive amount)', () => {
    const original = tx({ kind: 'expense', amount: -3000, title: 'Zwrot Zara' })
    const converted = applyTargetToTransaction(original, {
      keyword: 'zara',
      kind: 'expense',
      direction: 'in'
    })
    expect(converted.kind).toBe('expense')
    expect(converted.amount).toBe(3000)
  })

  it('transforms transaction to income with inflowKind (independent income or advance)', () => {
    const original = tx({ kind: 'expense', amount: -15000, title: 'Wpłata od współlokatora' })
    const converted = applyTargetToTransaction(original, {
      keyword: 'współlokator',
      kind: 'income',
      direction: 'in',
      household: true,
      memberId: 'm-alice',
      inflowKind: 'income'
    })
    expect(converted.kind).toBe('income')
    expect(converted.amount).toBe(15000)
    expect(converted.memberId).toBe('m-alice')
    expect(converted.inflowKind).toBe('income')
    expect(converted.advance).toBe(false)

    const convertedAdvance = applyTargetToTransaction(original, {
      keyword: 'współlokator',
      kind: 'income',
      direction: 'in',
      household: true,
      memberId: 'm-alice',
      inflowKind: 'advance'
    })
    expect(convertedAdvance.advance).toBe(true)
    expect(convertedAdvance.inflowKind).toBe('advance')
  })

  it('transforms transaction to transfer with counterAccountId', () => {
    const original = tx({ kind: 'expense', amount: -20000, title: 'Przelew własny' })
    const converted = applyTargetToTransaction(original, {
      keyword: 'własny',
      kind: 'transfer',
      direction: 'out',
      counterAccountId: 'acc-savings'
    })
    expect(converted.kind).toBe('transfer')
    expect(converted.counterAccountId).toBe('acc-savings')
    expect(converted.categoryId).toBeNull()
  })
})

describe('applyTitleRule', () => {
  it('saves keyword rule and updates history across past and future dates with undo capability', () => {
    const tPast = tx({ date: '2024-03-01', kind: 'expense', amount: -5000, title: 'Zwrot od ubezpieczyciela' })
    const tFuture = tx({ date: '2027-02-15', kind: 'expense', amount: -5000, title: 'Zwrot od ubezpieczyciela za leki' })
    const tCurrent = tx({ date: '2026-10-14', kind: 'expense', amount: -5000, title: 'Zwrot od ubezpieczyciela' })

    load([tPast, tFuture, tCurrent])

    const res = applyTitleRule(
      {
        keyword: 'ubezpieczyciel',
        kind: 'income',
        direction: 'in',
        updateHistory: true
      },
      tCurrent
    )

    expect(res.ok).toBe(true)
    expect(res.count).toBe(3)

    // Check that all 3 transactions got converted to income
    const records = data.useData.getState().records.transactions
    expect(records[tPast.id]?.record.kind).toBe('income')
    expect(records[tPast.id]?.record.amount).toBe(5000)
    expect(records[tFuture.id]?.record.kind).toBe('income')
    expect(records[tFuture.id]?.record.amount).toBe(5000)
    expect(records[tCurrent.id]?.record.kind).toBe('income')
    expect(records[tCurrent.id]?.record.amount).toBe(5000)

    // Check that import rules contain the new rule
    const rules = data.useData.getState().fi?.settings.import.rules ?? []
    expect(rules.some((r) => r.match.includes('ubezpieczyciel') && r.kind === 'income')).toBe(true)

    // Test undo toast
    const lastToast = ui.useUi.getState().toasts.at(-1)
    expect(lastToast?.action).toBeDefined()
    lastToast?.action?.run()

    // After undo, transactions are restored
    const restoredRecords = data.useData.getState().records.transactions
    expect(restoredRecords[tPast.id]?.record.kind).toBe('expense')
    expect(restoredRecords[tPast.id]?.record.amount).toBe(-5000)
    expect(restoredRecords[tFuture.id]?.record.kind).toBe('expense')
  })

  it('classifies incoming transfer from counterparty Y with title Y as category Z', async () => {
    const { findRule, ruleTargetOf } = await import('../../src/shared/import/classify')
    const targetCat = defaultCategoryId(1, 1)

    // Rule for incoming transfer from 'Jan Kowalski' with title keyword 'obiad' -> category Z
    const rule: ImportRule = {
      id: nextId(),
      match: 'obiad',
      mode: 'keyword',
      direction: 'in',
      counterparty: 'Jan Kowalski',
      label: 'Jan Kowalski · obiad',
      kind: 'expense',
      categoryId: targetCat,
      refundable: false,
      household: false,
      memberId: null,
      counterAccountId: null,
      learned: false,
      hits: 0,
      updatedAt: '2026-10-24T12:00:00.000Z'
    }

    const target = ruleTargetOf({ counterparty: 'Jan Kowalski', title: 'Przelew za obiad wczoraj' }).target
    const matched = findRule([rule], target, 'in', 5000)

    expect(matched).not.toBeNull()
    expect(matched?.categoryId).toBe(targetCat)
    expect(matched?.kind).toBe('expense')

    // Different counterparty does not match this rule
    const otherTarget = ruleTargetOf({ counterparty: 'Piotr Nowak', title: 'Przelew za obiad' }).target
    const notMatched = findRule([rule], otherTarget, 'in', 5000)
    expect(notMatched).toBeNull()
  })
})
