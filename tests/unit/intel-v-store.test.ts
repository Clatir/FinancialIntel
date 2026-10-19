import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { defaultCategoryId, importRuleSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type ImportRule, type Transaction } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here a mock that takes every write.
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
const { quickTransaction } = await import('../../src/renderer/store/quickHost')
const { editRule } = await import('../../src/renderer/features/import/rules')
const { choiceOfRule } = await import('../../src/renderer/features/import/rules')
const tags = await import('../../src/renderer/features/tags/state')
const ops = await import('../../src/renderer/features/operations/state')

const FOOD = defaultCategoryId(1)
const NET = defaultCategoryId(7, 2)
let seq = 0
const nextId = () => `01K7V00000000000000000${String(++seq).padStart(4, '0')}`
const tx = (over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, amount: -1000, ...over })

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

const draft = (over: Record<string, unknown> = {}) => ({
  kind: 'expense' as const,
  amount: 2500,
  categoryId: FOOD,
  accountId: MBANK_ACCOUNT_ID,
  date: '2026-10-14',
  time: '12:00',
  counterparty: 'Kawiarnia',
  note: '',
  impulse: null,
  logNote: '',
  household: false,
  memberId: null,
  advance: false,
  splits: [],
  ...over
})

beforeEach(() => {
  storage.clear()
})

describe('tagi w szybkim wpisie (1.10.0, F17)', () => {
  it('pole tagów i #słowo w nazwie albo notatce: tagi operacji, nazwa bez nich (marka bez #)', () => {
    const t = quickTransaction(draft({ counterparty: 'Kawiarnia #Chorwacja', note: 'z widokiem #morze', tags: ['wakacje 2027', 'Chorwacja'] }))
    if (typeof t === 'string') throw new Error(t)
    expect(t.counterparty).toBe('Kawiarnia')
    // The field's first, the #words after; one tag once (its spelling of the field).
    expect(t.tags).toEqual(['wakacje 2027', 'Chorwacja', 'morze'])
    expect(t.note).toBe('z widokiem #morze')
    // None: no field at all (the record of before 1.10.0 as it was).
    const plain = quickTransaction(draft())
    if (typeof plain === 'string') throw new Error(plain)
    expect(plain.tags).toBeUndefined()
    // A window of another version sending garbage in the list: only the texts are tags.
    const odd = quickTransaction(draft({ tags: ['ok', 7, null] }))
    if (typeof odd === 'string') throw new Error(odd)
    expect(odd.tags).toEqual(['ok'])
  })
})

describe('tagi reguły importu (1.10.0, F17 – „Netia → #ulga-internet”)', () => {
  it('„zmień” zapisuje tagi reguły; pusta lista zdejmuje pole; decyzja reguły bez zmian', () => {
    const rule = importRuleSchema.parse({ id: nextId(), match: 'netia', mode: 'exact', direction: 'out', label: 'Netia', kind: 'expense', categoryId: NET, learned: true, hits: 3, updatedAt: '2026-10-01T10:00:00.000Z' })
    load([], [rule])
    editRule(rule.id, { direction: 'out', choice: choiceOfRule(rule), tags: ['ulga-internet'] })
    const after = data.useData.getState().fi!.settings.import.rules[0]!
    expect(after).toMatchObject({ id: rule.id, categoryId: NET, tags: ['ulga-internet'], learned: false })
    editRule(rule.id, { direction: 'out', choice: choiceOfRule(after), tags: [] })
    expect(data.useData.getState().fi!.settings.import.rules[0]!.tags).toBeUndefined()
    // Not asked about the tags (an older editor): they stay.
    editRule(rule.id, { direction: 'out', choice: choiceOfRule(after), tags: ['a'] })
    editRule(rule.id, { direction: 'in', choice: choiceOfRule(after) })
    expect(data.useData.getState().fi!.settings.import.rules[0]).toMatchObject({ direction: 'in', tags: ['a'] })
  })
})

describe('wyprawy w oknie (1.10.0, F17)', () => {
  it('tagi historii raz na listę operacji, cel tagu w fi.json po kluczu, „Pokaż w Operacjach” – filtr tagu z całej historii', () => {
    const a = tx({ tags: ['Chorwacja'] })
    const b = tx({ tags: ['remont'], splits: [{ id: nextId(), amount: -1000, categoryId: FOOD, refundable: false, memberId: null, advance: false, note: '', tags: ['Prezent'] }] })
    load([a, b])
    const list = data.listOf(data.useData.getState().records.transactions)
    expect(tags.knownTagsOf(list)).toEqual(['Chorwacja', 'Prezent', 'remont'])
    expect(tags.knownTagsOf(list)).toBe(tags.knownTagsOf(list))
    tags.setTagGoal('#Chorwacja', '01K7VGOAL0000000000000000A')
    expect(data.useData.getState().fi!.settings.intel.tagGoals).toEqual({ chorwacja: '01K7VGOAL0000000000000000A' })
    tags.setTagGoal('chorwacja', null)
    expect(data.useData.getState().fi!.settings.intel.tagGoals).toEqual({})
    tags.showTag('Chorwacja')
    expect(ops.useOperationsUi.getState()).toMatchObject({ shown: true, filter: { period: { kind: 'all' }, tags: ['chorwacja'], categories: [] } })
  })
})

describe('ostatni tag szybkiego wpisu (1.10.0, T298)', () => {
  it('liczony raz na listę operacji i dzień – inny dzień liczy od nowa', () => {
    load([tx({ date: '2026-10-15', tags: ['Chorwacja'] })])
    const list = data.listOf(data.useData.getState().records.transactions)
    expect(tags.lastTagOf(list, '2026-10-20')).toBe('Chorwacja')
    // Beyond the 7 days: none – not the day before's answer.
    expect(tags.lastTagOf(list, '2026-10-30')).toBeNull()
    expect(tags.lastTagOf(list, '2026-10-16')).toBe('Chorwacja')
  })
})
