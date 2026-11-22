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
const { matchesTitle, findMatchingByTitle, applyTargetToTransaction, applyTitleRule, titleKeyword, titleRulePlan } = await import('../../src/renderer/features/operations/titleRules')
const { useBulkPreview, closeBulkPreview } = await import('../../src/renderer/features/operations/bulkPreview')
const { addKeywordRule, rememberCategory, addAmountRule, saveConditionsRule } = await import('../../src/renderer/features/import/rules')
const { updateOperation } = await import('../../src/renderer/features/operations/state')
const { confirmedChanges } = await import('@shared/calc/balances')
const { balanceSchema } = await import('@shared/schema')

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
  closeBulkPreview()
  ui.useUi.setState({ toasts: [] })
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
    // Money in (the rule „in” takes the inflows of the history – review of 1.21.0); the open one as the editor sets it.
    const tPast = tx({ date: '2024-03-01', kind: 'expense', amount: 5000, title: 'Zwrot od ubezpieczyciela' })
    const tFuture = tx({ date: '2027-02-15', kind: 'expense', amount: 5000, title: 'Zwrot od ubezpieczyciela za leki' })
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

    // T535: the history goes through the bulk changes' preview – written once it is confirmed.
    useBulkPreview.getState().preview!.apply!()

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
    expect(restoredRecords[tPast.id]?.record.amount).toBe(5000)
    expect(restoredRecords[tFuture.id]?.record.kind).toBe('expense')
    expect(restoredRecords[tCurrent.id]?.record.amount).toBe(-5000)
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

const rulesNow = () => data.useData.getState().fi?.settings.import.rules ?? []
const rec = (id: string) => data.useData.getState().records.transactions[id]!.record
const lastToast = () => ui.useUi.getState().toasts.at(-1)

// T535 (D106 pkt 3, UX-1, UX-2): the history changed only through the bulk changes' preview – asked at the confirmed
// balances, „Cofnij” of what is still as it left it, the rule taken back with it; off by default.
describe('reguła tytułu przez zmiany zbiorcze (T535)', () => {
  const FOOD = defaultCategoryId(1)
  const income = { keyword: 'ubezpieczyciel', kind: 'income', direction: 'in' } as const

  it('bez zaznaczenia historii (domyślnie): tylko reguła – historia bez zmian, bieżąca przez edytor', () => {
    const past = tx({ date: '2024-03-01', title: 'Zwrot od ubezpieczyciela' })
    const current = tx({ title: 'Zwrot od ubezpieczyciela' })
    load([past, current])
    const applied = vi.fn()
    const res = applyTitleRule(income, current, applied)
    expect(res).toMatchObject({ ok: true })
    expect(rec(past.id)).toEqual(past)
    expect(rec(current.id)).toEqual(current)
    expect(applied).toHaveBeenCalledOnce()
    expect(rulesNow().some((r) => r.match === 'ubezpieczyciel' && r.kind === 'income')).toBe(true)
    expect(useBulkPreview.getState().preview).toBeNull()
  })

  it('z historią: najpierw wspólny podgląd – nic nie zapisane, reguła też nie; zatwierdzenie zapisuje oba', () => {
    const past = tx({ date: '2024-03-01', amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    const future = tx({ date: '2027-02-15', amount: 1000, title: 'Zwrot od ubezpieczyciela za leki' })
    const current = tx({ title: 'Zwrot od ubezpieczyciela' })
    const other = tx({ title: 'Biedronka' })
    load([past, future, current, other])
    const applied = vi.fn()
    const res = applyTitleRule({ ...income, updateHistory: true }, current, applied)
    expect(res).toMatchObject({ ok: true, preview: true })
    const preview = useBulkPreview.getState().preview!
    expect(preview.plan.change.kind).toBe('titleRule')
    expect(preview.plan.before.map((t) => t.id).sort()).toEqual([past.id, future.id, current.id].sort())
    expect(preview.what).toBe('„ubezpieczyciel”')
    expect([rec(past.id), rec(future.id), rec(current.id)]).toEqual([past, future, current])
    expect(rulesNow()).toEqual([])
    preview.apply!()
    expect([rec(past.id).kind, rec(past.id).amount, rec(future.id).kind, rec(current.id).kind]).toEqual(['income', 1000, 'income', 'income'])
    expect(rec(other.id)).toEqual(other)
    expect(rulesNow().some((r) => r.match === 'ubezpieczyciel' && r.kind === 'income')).toBe(true)
    // The open one was among them – the editor writes nothing more (no second edit outside the „Cofnij”).
    expect(applied).not.toHaveBeenCalled()
    expect(lastToast()?.text).toBe('Zastosowano regułę dla tytułu „ubezpieczyciel”: 3 operacje · reguła zapamiętana dla kolejnych importów.')
  })

  it('„Cofnij” cofa tylko niezmienione od tego czasu i zdejmuje regułę', async () => {
    const a = tx({ date: '2024-03-01', amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    const b = tx({ date: '2025-03-01', amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    load([a, b])
    applyTitleRule({ ...income, updateHistory: true })
    useBulkPreview.getState().preview!.apply!()
    await Promise.resolve()
    const undo = lastToast()!.action!.run
    // Changed since: its kind again by hand.
    data.updateRecord('transactions', b.id, (r) => ({ ...r, kind: 'expense', amount: 1000, note: 'ręcznie' }))
    undo()
    expect(rec(a.id)).toMatchObject({ kind: 'expense', amount: 1000 })
    expect(rec(b.id)).toMatchObject({ kind: 'expense', note: 'ręcznie' })
    expect(rulesNow()).toEqual([])
    expect(lastToast()?.text).toBe('Cofnięto 1 z 2 – jedna zmieniła się w międzyczasie i zostaje bez zmian.')
  })

  it('potwierdzone saldo: plan podglądu niesie zmianę salda (podgląd pyta), przed zatwierdzeniem nic nie zapisane', () => {
    const a = tx({ date: '2026-10-05', title: 'Zwrot od ubezpieczyciela' })
    load([a])
    const AT = '2026-10-01T10:00:00.000Z'
    const balances = [
      balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, accountId: MBANK_ACCOUNT_ID, date: '2026-10-01', kind: 'opening', amount: 100000 }),
      balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, accountId: MBANK_ACCOUNT_ID, date: '2026-10-10', kind: 'confirmation', amount: 99000 })
    ]
    // The open one: its sign as the editor sets it (the history's others – of the rule's direction only).
    applyTitleRule({ ...income, updateHistory: true }, a)
    const { plan } = useBulkPreview.getState().preview!
    expect(confirmedChanges(plan.before.map((t, i) => [t, plan.after[i]!] as const), balances)).toEqual([{ accountId: MBANK_ACCOUNT_ID, date: '2026-10-10', delta: 2000 }])
    expect(rec(a.id)).toEqual(a)
  })

  it('wszystkie już takie jak reguła: bez podglądu – sama reguła', () => {
    const a = tx({ kind: 'income', amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    load([a])
    expect(applyTitleRule({ ...income, updateHistory: true }, a)).toMatchObject({ ok: true })
    expect(useBulkPreview.getState().preview).toBeNull()
    expect(rulesNow()).toHaveLength(1)
  })

  it('odmowa reguły (UX-2) zwraca błąd do pokazania przy polu – bez podglądu i bez zapisu', () => {
    const a = tx({ title: 'Przelew za obiad' })
    load([a])
    expect(applyTitleRule({ keyword: 'obiad', kind: 'expense', direction: 'out', categoryId: null, updateHistory: true }, a)).toEqual({ ok: false, error: 'Wybierz kategorię.' })
    expect(applyTitleRule({ keyword: 'przelew', kind: 'expense', direction: 'out', categoryId: FOOD, updateHistory: true }, a).error).toMatch(/za ogólne/)
    expect(applyTitleRule({ keyword: 'a', kind: 'expense', direction: 'out', categoryId: FOOD }, a).error).toBe('Słowo kluczowe musi mieć co najmniej 2 litery.')
    expect(useBulkPreview.getState().preview).toBeNull()
    expect(rulesNow()).toEqual([])
    expect(rec(a.id)).toEqual(a)
  })

  it('reguła odmówiona przy zatwierdzeniu (folder tylko do odczytu w międzyczasie) – historia bez zmian', () => {
    const a = tx({ amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    load([a])
    applyTitleRule({ ...income, updateHistory: true })
    const preview = useBulkPreview.getState().preview!
    data.useData.setState((s) => ({ status: { ...s.status!, readOnly: true, readOnlyReason: 'test' } }))
    preview.apply!()
    expect(rec(a.id)).toEqual(a)
    expect(rulesNow()).toEqual([])
  })
})

const settle = () => new Promise((r) => setTimeout(r, 0))

// Review of 1.21.0 (T549): the rule's direction in the history, the preview's operations changed meanwhile, the words of
// a history left as it is, „Cofnij” of the rule alone.
describe('reguła tytułu – poprawki po przeglądzie 1.21.0 (T549)', () => {
  const FOOD = defaultCategoryId(1)
  const income = { keyword: 'ubezpieczyciel', kind: 'income', direction: 'in' } as const
  const refundRule = { keyword: 'zara', kind: 'expense', direction: 'in', categoryId: FOOD } as const

  it('kierunek: „Zwrot Zara” +50 i −120 – reguła zwrotu z historią zmienia tylko +50, zakup pominięty ze słowem', async () => {
    const refund = tx({ amount: 5000, title: 'Zwrot Zara', categoryId: null })
    const purchase = tx({ amount: -12000, title: 'Zwrot Zara', categoryId: null })
    load([refund, purchase])
    expect(applyTitleRule({ ...refundRule, updateHistory: true })).toMatchObject({ ok: true, preview: true, count: 1 })
    const preview = useBulkPreview.getState().preview!
    expect(preview.plan.before.map((t) => t.id)).toEqual([refund.id])
    expect(preview.plan.skipped).toBe(1)
    preview.apply!()
    await settle()
    expect(rec(refund.id)).toMatchObject({ amount: 5000, categoryId: FOOD })
    expect(rec(purchase.id)).toEqual(purchase)
    expect(lastToast()?.text).toBe('Zastosowano regułę dla tytułu „zara”: 1 operacja, pominięte (zmiana do nich nie pasuje): 1 · reguła zapamiętana dla kolejnych importów.')
  })

  it('kierunek: reguła wydatku nie zamienia wpływów o tym tytule; otwarta operacja bierze regułę jak w edytorze', async () => {
    const inflow = tx({ amount: 3000, title: 'Zara zakupy', categoryId: null })
    const open = tx({ amount: 4000, title: 'Zara zakupy', categoryId: null })
    const buy = tx({ amount: -2000, title: 'Zara zakupy', categoryId: null })
    load([inflow, open, buy])
    applyTitleRule({ keyword: 'zara', kind: 'expense', direction: 'out', categoryId: FOOD, updateHistory: true }, open)
    useBulkPreview.getState().preview!.apply!()
    await settle()
    expect(rec(inflow.id)).toEqual(inflow)
    expect(rec(open.id)).toMatchObject({ amount: -4000, categoryId: FOOD })
    expect(rec(buy.id)).toMatchObject({ amount: -2000, categoryId: FOOD })
  })

  it('operacja zmieniona po otwarciu podglądu (synchronizacja, autozapis) nie jest nadpisana – zostaje ze słowem', async () => {
    const a = tx({ amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    const b = tx({ date: '2025-03-01', amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    load([a, b])
    applyTitleRule({ ...income, updateHistory: true })
    const preview = useBulkPreview.getState().preview!
    expect(preview.plan.before).toHaveLength(2)
    data.updateRecord('transactions', b.id, (r) => ({ ...r, note: 'z drugiego komputera' }))
    preview.apply!()
    await settle()
    expect(rec(a.id)).toMatchObject({ kind: 'income' })
    expect(rec(b.id)).toMatchObject({ kind: 'expense', note: 'z drugiego komputera' })
    expect(rulesNow()).toHaveLength(1)
    expect(lastToast()?.text).toBe('Zastosowano regułę dla tytułu „ubezpieczyciel”: 1 operacja, zmienione od podglądu zostają, jak są: 1 · reguła zapamiętana dla kolejnych importów.')
  })

  it('wszystkie zmienione od podglądu: nic nie zapisane, reguła też nie – ze słowem', async () => {
    const a = tx({ amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    load([a])
    applyTitleRule({ ...income, updateHistory: true })
    const preview = useBulkPreview.getState().preview!
    data.updateRecord('transactions', a.id, (r) => ({ ...r, kind: 'income' }))
    preview.apply!()
    await settle()
    expect(rec(a.id)).toMatchObject({ kind: 'income', amount: 1000 })
    expect(rulesNow()).toEqual([])
    expect(lastToast()?.text).toBe('Nic nie zapisano – operacja zmieniła się od podglądu i zostaje, jak jest.')
  })

  it('„Zapisz i zaktualizuj”, gdy w historii nic się nie zmieni: toast mówi, ile już takich i ile pominiętych – z „Cofnij” reguły', () => {
    const already = tx({ kind: 'income', amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    const out = tx({ amount: -1000, title: 'Zwrot od ubezpieczyciela' })
    load([already, out])
    expect(applyTitleRule({ ...income, updateHistory: true })).toMatchObject({ ok: true, count: 0 })
    expect(useBulkPreview.getState().preview).toBeNull()
    expect([rec(already.id), rec(out.id)]).toEqual([already, out])
    expect(lastToast()?.text).toBe('Reguła dla tytułu „ubezpieczyciel” zapamiętana na przyszłość. Operacje w historii bez zmian – już takie: 1, pominięte (zmiana do nich nie pasuje): 1.')
    expect(rulesNow()).toHaveLength(1)
    lastToast()!.action!.run()
    expect(rulesNow()).toEqual([])
  })

  it('licznik „Zapisz i zaktualizuj (N)” = plan podglądu: kierunek, już takie, otwarta operacja, bez szkiców', () => {
    const refund = tx({ amount: 5000, title: 'Zwrot Zara', categoryId: null })
    const purchase = tx({ amount: -12000, title: 'Zwrot Zara', categoryId: null })
    const done = tx({ amount: 3000, title: 'Zwrot Zara', categoryId: FOOD })
    const draft = tx({ amount: 1500, title: 'Zwrot Zara', categoryId: null })
    const open = tx({ amount: -2000, title: 'Zwrot Zara', categoryId: null })
    load([refund, purchase, done, draft, open])
    data.useData.setState((s) => ({ drafts: { ...s.drafts, [draft.id]: true as const } }))
    const input = { ...refundRule, updateHistory: true }
    // The open one with the history (another direction, set by hand – `openId`); the draft and the others left.
    const count = titleRulePlan(input, open).plan.before.length
    expect(count).toBe(2)
    applyTitleRule(input, open)
    expect(useBulkPreview.getState().preview!.plan.before.map((t) => t.id).sort()).toEqual([refund.id, open.id].sort())
  })

  it('sama reguła (bez historii) ma „Cofnij”: reguła znika, inne zostają; zmieniona od tego czasu zostaje ze słowem', () => {
    const current = tx({ title: 'Zwrot od ubezpieczyciela' })
    load([current])
    expect(addKeywordRule({ keyword: 'automat', direction: 'out', kind: 'expense', categoryId: FOOD })).toBeNull()
    applyTitleRule(income, current, vi.fn())
    const undo = lastToast()!.action!
    expect(undo.label).toBe('Cofnij')
    undo.run()
    expect(rulesNow().map((r) => r.match)).toEqual(['automat'])

    applyTitleRule(income, current, vi.fn())
    const again = lastToast()!.action!.run
    data.updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: f.settings.import.rules.map((r) => (r.match === 'ubezpieczyciel' ? { ...r, household: true } : r)) } } }))
    again()
    expect(rulesNow()).toHaveLength(2)
    expect(lastToast()!.text).toBe('Nic nie cofnięto – zmieniło się od tego czasu i zostaje, jak jest.')
  })
})

// U1 (1.21.1, T550): „Cofnij” of the rule alone takes back the open operation's own edit in the editor too (while it is
// as the edit left it – T418) and stays at least `UNDO_MIN_MS` (the toast's action, no fixed time).
describe('„Cofnij” samej reguły tytułu – też edycja otwartej operacji (U1, T550)', () => {
  const FOOD = defaultCategoryId(1)
  const income = { keyword: 'ubezpieczyciel', kind: 'income', direction: 'in' } as const
  /** The editor's `patch` as `TitleRuleAction` runs it (`updateOperation`), returning the fields it set. */
  const editor = (id: string, p: Partial<Transaction>, draft = false) => () => {
    updateOperation(id, (r) => ({ ...r, ...p }), draft)
    return p
  }
  const toIncome = { kind: 'income', amount: 1000, categoryId: null, memberId: null, refundable: false, inflowKind: undefined, advance: false, counterAccountId: null } as const

  it('„Cofnij” zdejmuje regułę i oddaje otwartej operacji pola sprzed reguły', () => {
    const current = tx({ title: 'Zwrot od ubezpieczyciela', categoryId: FOOD })
    load([current])
    expect(applyTitleRule(income, current, editor(current.id, toIncome))).toMatchObject({ ok: true })
    expect(rec(current.id)).toMatchObject({ kind: 'income', amount: 1000, categoryId: null })
    lastToast()!.action!.run()
    expect(rulesNow()).toEqual([])
    // Before: the rule went, the operation stayed an income – half of what the toast's „Cofnij” took.
    expect(rec(current.id)).toMatchObject({ kind: 'expense', amount: -1000, categoryId: FOOD })
  })

  it('z historią, gdy w niej nic do zmiany, a otwarta to szkic: „Cofnij” cofa też jego edycję', () => {
    const already = tx({ kind: 'income', amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    const draft = tx({ title: 'Zwrot od ubezpieczyciela', categoryId: FOOD })
    load([already, draft])
    data.useData.setState((s) => ({ drafts: { ...s.drafts, [draft.id]: true as const } }))
    expect(applyTitleRule({ ...income, updateHistory: true }, draft, editor(draft.id, toIncome, true))).toMatchObject({ ok: true, count: 0 })
    expect(rec(draft.id)).toMatchObject({ kind: 'income', amount: 1000 })
    lastToast()!.action!.run()
    expect(rec(draft.id)).toMatchObject({ kind: 'expense', amount: -1000, categoryId: FOOD })
    expect(rulesNow()).toEqual([])
  })

  it('pole edycji zmienione od tego czasu: operacja zostaje, jak jest – ze słowem; reguła cofnięta', () => {
    const current = tx({ title: 'Zwrot od ubezpieczyciela', categoryId: FOOD, note: 'stara' })
    load([current])
    applyTitleRule(income, current, editor(current.id, toIncome))
    const undo = lastToast()!.action!.run
    data.updateRecord('transactions', current.id, (r) => ({ ...r, amount: 2500 }))
    undo()
    expect(rulesNow()).toEqual([])
    expect(rec(current.id)).toMatchObject({ kind: 'income', amount: 2500 })
    expect(lastToast()!.text).toBe('Otwarta operacja zmieniła się od tego czasu – zostaje, jak jest.')
  })

  it('zmiana innego pola od tego czasu (notatka) zostaje, pola reguły wracają', () => {
    const current = tx({ title: 'Zwrot od ubezpieczyciela', categoryId: FOOD })
    load([current])
    applyTitleRule(income, current, editor(current.id, toIncome))
    const undo = lastToast()!.action!.run
    data.updateRecord('transactions', current.id, (r) => ({ ...r, note: 'dopisana' }))
    undo()
    expect(rec(current.id)).toMatchObject({ kind: 'expense', amount: -1000, categoryId: FOOD, note: 'dopisana' })
  })

  it('edycja, która nic nie zmieniła (operacja już taka): „Cofnij” nie zapisuje operacji', () => {
    const current = tx({ kind: 'income', amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    load([current])
    applyTitleRule(income, current, editor(current.id, toIncome))
    const after = rec(current.id)
    lastToast()!.action!.run()
    expect(rec(current.id)).toBe(after)
    expect(rulesNow()).toEqual([])
  })

  it('toast z „Cofnij” trwa co najmniej UNDO_MIN_MS – reguła tytułu, reguła z warunkami, reguła marki do kwoty', () => {
    const current = tx({ title: 'Zwrot od ubezpieczyciela' })
    load([current])
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      applyTitleRule(income, current, vi.fn())
      expect(
        saveConditionsRule(null, {
          label: '',
          direction: 'out',
          conditions: [{ field: 'counterparty', value: 'Orlen' }, { field: 'amount', min: null, max: 4000 }],
          combine: 'all',
          choice: { kind: 'expense', categoryId: FOOD, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null },
          manual: false,
          tags: []
        })
      ).toBeNull()
      addAmountRule({ brand: 'orlen', label: 'Orlen', maxAmount: 4000, categoryId: FOOD })
      const texts = () => ui.useUi.getState().toasts.filter((t) => t.action?.label === 'Cofnij').map((t) => t.text)
      expect(texts()).toHaveLength(3)
      vi.advanceTimersByTime(ui.UNDO_MIN_MS - 1)
      expect(texts()).toHaveLength(3)
      vi.advanceTimersByTime(1)
      expect(texts()).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })
})

// U1 – review (T550): the edit with the preview, the edit waiting at its question (F12), a draft written by the edit, the
// edit only with the rule taken back, „Cofnij” asking as an edit does; the amount of a brand's rule through `plnText`.
describe('„Cofnij” reguły tytułu – poprawki przeglądu U1 (T550)', () => {
  const FOOD = defaultCategoryId(1)
  const income = { keyword: 'ubezpieczyciel', kind: 'income', direction: 'in' } as const
  const editor = (id: string, p: Partial<Transaction>, draft = false) => () => {
    updateOperation(id, (r) => ({ ...r, ...p }), draft)
    return p
  }
  const toIncome = { kind: 'income', amount: 1000, categoryId: null, memberId: null, refundable: false, inflowKind: undefined, advance: false, counterAccountId: null } as const
  const asDraft = (id: string) => data.useData.setState((s) => ({ drafts: { ...s.drafts, [id]: true as const } }))
  const AT = '2026-10-01T10:00:00.000Z'
  /** A balance confirmed on 10.10 – an edit of an operation of 5.10 changing its amount asks first (F12). */
  function confirmedBalance(): void {
    const balance = (over: Record<string, unknown>) => balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, accountId: MBANK_ACCOUNT_ID, ...over })
    const list = [balance({ date: '2026-10-01', kind: 'opening', amount: 100000 }), balance({ date: '2026-10-10', kind: 'confirmation', amount: 99000 })]
    data.useData.setState((s) => ({ records: { ...s.records, balances: Object.fromEntries(list.map((b) => [b.id, { record: b, relPath: `balances/${b.id}.json`, readOnly: false }])) } }))
  }
  const guard = async () => (await import('../../src/renderer/store/guard')).useGuard
  beforeEach(async () => (await import('../../src/renderer/store/guard')).clearGuards())

  it('z podglądem, otwarta to szkic: „Cofnij” zmiany zbiorczej cofa historię, regułę i edycję szkicu', async () => {
    const past = tx({ date: '2024-03-01', amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    const draft = tx({ title: 'Zwrot od ubezpieczyciela', categoryId: FOOD })
    load([past, draft])
    asDraft(draft.id)
    expect(applyTitleRule({ ...income, updateHistory: true }, draft, editor(draft.id, toIncome, true))).toMatchObject({ ok: true, preview: true })
    useBulkPreview.getState().preview!.apply!()
    await settle()
    expect([rec(past.id).kind, rec(draft.id).kind]).toEqual(['income', 'income'])
    ui.useUi.getState().toasts.find((t) => t.text.startsWith('Zastosowano regułę'))!.action!.run()
    expect(rec(past.id)).toMatchObject({ kind: 'expense', amount: 1000 })
    expect(rulesNow()).toEqual([])
    // Before: the draft's edit stayed – the rule and the history went, the open one kept what the rule had set.
    expect(rec(draft.id)).toMatchObject({ kind: 'expense', amount: -1000, categoryId: FOOD })
  })

  it('edycja czeka na pytanie przy potwierdzonym saldzie: „Cofnij” reguły zdejmuje też to pytanie', async () => {
    const a = tx({ date: '2026-10-05', title: 'Zwrot od ubezpieczyciela', categoryId: FOOD })
    load([a])
    confirmedBalance()
    const asks = await guard()
    applyTitleRule(income, a, editor(a.id, toIncome))
    expect(asks.getState().asks.map((x) => x.id)).toEqual([a.id])
    expect(rec(a.id)).toEqual(a)
    lastToast()!.action!.run()
    expect(rulesNow()).toEqual([])
    // Before: the question stayed – „Zmień mimo to” would write the rule's edit with the rule gone, beyond any „Cofnij”.
    expect(asks.getState().asks).toEqual([])
    expect(rec(a.id)).toEqual(a)
  })

  it('pytanie innej, późniejszej edycji tej operacji zostaje', async () => {
    const a = tx({ date: '2026-10-05', title: 'Zwrot od ubezpieczyciela', categoryId: FOOD })
    load([a])
    confirmedBalance()
    const asks = await guard()
    applyTitleRule(income, a, editor(a.id, toIncome))
    // Typed again in the editor: the question of the rule's edit replaced by the newest one (`askGuard`).
    updateOperation(a.id, (r) => ({ ...r, amount: -3000 }), false)
    const mine = asks.getState().asks.map((x) => x.seq)
    lastToast()!.action!.run()
    expect(asks.getState().asks.map((x) => x.seq)).toEqual(mine)
  })

  it('„Cofnij” edycji po „Zmień mimo to” pyta jak edycja (potwierdzone saldo) – zapis dopiero po odpowiedzi', async () => {
    const a = tx({ date: '2026-10-05', title: 'Zwrot od ubezpieczyciela', categoryId: FOOD })
    load([a])
    confirmedBalance()
    const asks = await guard()
    const { answerGuard } = await import('../../src/renderer/store/guard')
    applyTitleRule(income, a, editor(a.id, toIncome))
    answerGuard(asks.getState().asks[0]!.seq, true)
    expect(rec(a.id)).toMatchObject({ kind: 'income', amount: 1000 })
    lastToast()!.action!.run()
    // Before: written at once, past the question of the confirmed balance.
    expect(rec(a.id)).toMatchObject({ kind: 'income', amount: 1000 })
    expect(asks.getState().asks.map((x) => x.id)).toEqual([a.id])
    answerGuard(asks.getState().asks[0]!.seq, true)
    expect(rec(a.id)).toMatchObject({ kind: 'expense', amount: -1000, categoryId: FOOD })
  })

  it('szkic zapisany przez edycję reguły: „Cofnij” oddaje pola i mówi, że wpis zostaje zapisany', () => {
    const draft = tx({ title: 'Zwrot od ubezpieczyciela', categoryId: FOOD })
    load([draft])
    asDraft(draft.id)
    applyTitleRule(income, draft, editor(draft.id, toIncome, true))
    expect(data.useData.getState().drafts[draft.id]).toBeUndefined()
    lastToast()!.action!.run()
    expect(rec(draft.id)).toMatchObject({ kind: 'expense', amount: -1000, categoryId: FOOD })
    expect(lastToast()!.text).toBe('Nowy wpis zostaje zapisany, z polami sprzed reguły.')
  })

  it('reguła zmieniona od tego czasu zostaje – edycja otwartej operacji też (nie pół cofnięcia)', () => {
    const current = tx({ title: 'Zwrot od ubezpieczyciela', categoryId: FOOD })
    load([current])
    applyTitleRule(income, current, editor(current.id, toIncome))
    const undo = lastToast()!.action!.run
    data.updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: f.settings.import.rules.map((r) => ({ ...r, household: true })) } } }))
    undo()
    expect(rulesNow()).toHaveLength(1)
    // Before: the operation's fields went back while the rule stayed.
    expect(rec(current.id)).toMatchObject({ kind: 'income', amount: 1000 })
    expect(lastToast()!.text).toBe('Nic nie cofnięto – zmieniło się od tego czasu i zostaje, jak jest.')
  })

  it('reguła marki do kwoty: kwota w toaście jak na ekranach – z groszami, ukryta przy ukrytych kwotach', async () => {
    const { setAmountsHidden } = await import('../../src/renderer/components/fields')
    load([])
    addAmountRule({ brand: 'orlen', label: 'Orlen', maxAmount: 4050, categoryId: FOOD })
    // Before: „do 40,5 zł” – and the amount shown with the amounts hidden.
    expect(lastToast()!.text).toBe('Nowa reguła: Orlen do 40,50 zł.')
    setAmountsHidden(true)
    try {
      addAmountRule({ brand: 'shell', label: 'Shell', maxAmount: 3000, categoryId: FOOD })
      expect(lastToast()!.text).toBe('Nowa reguła: Shell do ••• zł.')
    } finally {
      setAmountsHidden(false)
    }
  })

  it('z podglądem, otwarta to szkic, a reguła zmieniona od tego czasu: „Cofnij” zostawia regułę i edycję szkicu (T558)', async () => {
    const past = tx({ date: '2024-03-01', amount: 1000, title: 'Zwrot od ubezpieczyciela' })
    const draft = tx({ title: 'Zwrot od ubezpieczyciela', categoryId: FOOD })
    load([past, draft])
    asDraft(draft.id)
    applyTitleRule({ ...income, updateHistory: true }, draft, editor(draft.id, toIncome, true))
    useBulkPreview.getState().preview!.apply!()
    await settle()
    data.updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: f.settings.import.rules.map((r) => ({ ...r, household: true })) } } }))
    ui.useUi.getState().toasts.find((t) => t.text.startsWith('Zastosowano regułę'))!.action!.run()
    expect(rec(past.id)).toMatchObject({ kind: 'expense', amount: 1000 })
    expect(rulesNow()).toHaveLength(1)
    expect(rec(draft.id)).toMatchObject({ kind: 'income', amount: 1000 })
  })

  it('szkic zapisany dopiero po „Zmień mimo to” (F12): „Cofnij” mówi, że nowy wpis zostaje zapisany (T558)', async () => {
    const draft = tx({ date: '2026-10-05', title: 'Zwrot od ubezpieczyciela', categoryId: FOOD })
    load([draft])
    asDraft(draft.id)
    confirmedBalance()
    const asks = await guard()
    const { answerGuard } = await import('../../src/renderer/store/guard')
    applyTitleRule(income, draft, () => {
      updateOperation(
        draft.id,
        (r) => ({ ...r, ...toIncome }),
        false,
        () => data.useData.setState((s) => {
          const next = { ...s.drafts }
          delete next[draft.id]
          return { drafts: next }
        })
      )
      return toIncome
    })
    // Before „Zmień mimo to” the operation is still a draft.
    expect(data.useData.getState().drafts[draft.id]).toBe(true)
    answerGuard(asks.getState().asks[0]!.seq, true)
    expect(data.useData.getState().drafts[draft.id]).toBeUndefined()
    // „Cofnij” asks at the confirmed balance too; once answered, it says the new entry stays written.
    lastToast()!.action!.run()
    answerGuard(asks.getState().asks[0]!.seq, true)
    expect(rec(draft.id)).toMatchObject({ kind: 'expense', amount: -1000, categoryId: FOOD })
    expect(lastToast()!.text).toBe('Nowy wpis zostaje zapisany, z polami sprzed reguły.')
  })

  it('wcześniejsze pytanie F12 tej operacji zastąpione przez edycję reguły wraca po „Cofnij” reguły (T558)', async () => {
    const a = tx({ date: '2026-10-05', title: 'Zwrot od ubezpieczyciela', categoryId: FOOD })
    load([a])
    confirmedBalance()
    const asks = await guard()
    const { answerGuard } = await import('../../src/renderer/store/guard')
    // An earlier edit waiting at the confirmed balance (e.g. amount typed to -2500).
    updateOperation(a.id, (r) => ({ ...r, amount: -2500 }), false)
    const earlierSeq = asks.getState().asks[0]!.seq
    applyTitleRule(income, a, editor(a.id, toIncome))
    expect(asks.getState().asks[0]!.seq).not.toBe(earlierSeq)
    lastToast()!.action!.run()
    expect(rulesNow()).toEqual([])
    expect(asks.getState().asks.map((x) => x.seq)).toEqual([earlierSeq])
    answerGuard(earlierSeq, true)
    expect(rec(a.id)).toMatchObject({ kind: 'expense', amount: -2500 })
  })
})

describe('słowo początkowe reguły – najdłuższy wyraz tytułu (T535)', () => {
  it('najdłuższy wyraz z co najmniej 3 literami, z pominięciem słów ogólnych banku', () => {
    expect(titleKeyword('Zwrot od ubezpieczyciela za leki')).toBe('ubezpieczyciela')
    expect(titleKeyword('NETFLIX.COM 123456789')).toBe('netflix')
    expect(titleKeyword('Przelew za obiad')).toBe('obiad')
    expect(titleKeyword('Kręgle w sobotę wieczorem')).toBe('wieczorem')
    // The first of the longest, as written (Polish letters kept).
    expect(titleKeyword('Kręgle sobota')).toBe('kręgle')
  })

  it('same słowa ogólne – najdłuższe z nich; bez wyrazu z 3 literami – cały tytuł', () => {
    expect(titleKeyword('Przelew BLIK')).toBe('przelew')
    expect(titleKeyword('AB 12')).toBe('AB 12')
  })
})

// UX-24 (T535): „Zapamiętaj” of the editor and „Dodaj” of the keywords with „Cofnij” – the rules as they were.
describe('„Zapamiętaj” i „Dodaj” słowo z „Cofnij” (UX-24, T535)', () => {
  const FOOD = defaultCategoryId(1)

  it('„Zapamiętaj” kategorię kontrahenta: toast z „Cofnij” – reguła znika, inne reguły zostają', () => {
    const t = tx({ counterparty: 'Cukiernia Sowa', categoryId: FOOD })
    load([t])
    rememberCategory(t, 'Jedzenie')
    expect(rulesNow()).toHaveLength(1)
    const undo = lastToast()!.action!
    expect(undo.label).toBe('Cofnij')
    expect(addKeywordRule({ keyword: 'automat', direction: 'out', kind: 'expense', categoryId: FOOD })).toBeNull()
    undo.run()
    expect(rulesNow().map((r) => r.match)).toEqual(['automat'])
  })

  it('„Dodaj” słowo: toast z „Cofnij”; reguła zmieniona od tego czasu zostaje ze słowem', () => {
    load([])
    expect(addKeywordRule({ keyword: 'cukiernia', direction: 'out', kind: 'expense', categoryId: FOOD })).toBeNull()
    const undo = lastToast()!.action!
    expect(lastToast()!.text).toBe('Zapamiętano słowo „cukiernia”.')
    data.updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: f.settings.import.rules.map((r) => ({ ...r, categoryId: defaultCategoryId(6) })) } } }))
    undo.run()
    expect(rulesNow()).toHaveLength(1)
    expect(lastToast()!.text).toBe('Nic nie cofnięto – zmieniło się od tego czasu i zostaje, jak jest.')
    // Refused: said by the caller at the field, no toast.
    ui.useUi.setState({ toasts: [] })
    expect(addKeywordRule({ keyword: 'ab', direction: 'out', kind: 'expense', categoryId: FOOD })).toBe('Słowo kluczowe musi mieć co najmniej 3 litery.')
    expect(ui.useUi.getState().toasts).toEqual([])
  })
})
