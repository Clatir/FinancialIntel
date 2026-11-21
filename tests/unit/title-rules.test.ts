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
const { matchesTitle, findMatchingByTitle, applyTargetToTransaction, applyTitleRule, titleKeyword, titleRuleChanges } = await import('../../src/renderer/features/operations/titleRules')
const { useBulkPreview, closeBulkPreview } = await import('../../src/renderer/features/operations/bulkPreview')
const { addKeywordRule, rememberCategory } = await import('../../src/renderer/features/import/rules')
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

  it('licznik „Zapisz i zaktualizuj (N)” – tylko te, które reguła zmieni (kierunek, już takie) – jak podgląd', () => {
    const refund = tx({ amount: 5000, title: 'Zwrot Zara', categoryId: null })
    const purchase = tx({ amount: -12000, title: 'Zwrot Zara', categoryId: null })
    const done = tx({ amount: 3000, title: 'Zwrot Zara', categoryId: FOOD })
    const open = tx({ amount: 2000, title: 'Zwrot Zara', categoryId: null })
    load([refund, purchase, done, open])
    const matching = findMatchingByTitle(data.useData.getState().records.transactions, 'zara', open.id)
    expect(matching).toHaveLength(3)
    expect(titleRuleChanges(matching, refundRule)).toBe(1)
    applyTitleRule({ ...refundRule, updateHistory: true })
    // The preview of the same history (the open one not excluded here): the same ones besides it.
    expect(useBulkPreview.getState().preview!.plan.before.map((t) => t.id).filter((id) => id !== open.id)).toEqual([refund.id])
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
