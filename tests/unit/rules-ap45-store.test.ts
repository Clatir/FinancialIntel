import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { auditRules } from '@shared/import/audit'
import { COLLECTIONS } from '@shared/paths'
import type { ConditionsDraft } from '../../src/renderer/features/import/rules'
import { defaultCategoryId, importRuleSchema, SCHEMA_VERSION, transactionSchema, type ImportRule, type SettingsFile, type Transaction } from '@shared/schema'

// AP-45 (1.16.0, T467–T470): the window's actions of the rules of conditions – saving with refusals said, „Cofnij”
// (T418: only while as saved), „także dla wpisów ręcznych”, „Zastosuj do historii” with a rule of conditions. The stores
// talk to the main process through window.fi (preload): a mock.
const ipc = () => new Promise((r) => setTimeout(r, 3))
const stamped = <T extends { id: string }>(record: T) => ({ ...record, updatedAt: new Date().toISOString() })
const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => (await ipc(), { record: stamped(record), relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, records: Array<{ id: string }>) => (await ipc(), records.map((record) => ({ id: record.id, entry: { record: stamped(record), relPath: `${record.id}.json`, readOnly: false } })))),
  saveSettings: vi.fn(async (f: SettingsFile) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: readonly string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined),
  folderShown: vi.fn(async () => undefined)
}
vi.stubGlobal('window', { fi: api })
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const rules = await import('../../src/renderer/features/import/rules')

const AT = '2026-11-01T10:00:00.000Z'
const COFFEE = defaultCategoryId(1, 3)
const FUN = defaultCategoryId(6, 0)
const OTHER = defaultCategoryId(9, 0)
const EXPENSE = { kind: 'expense' as const, categoryId: COFFEE, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
let folder = 0
function open(over: { rules?: ImportRule[]; transactions?: Transaction[] } = {}): string {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = (over.transactions ?? []).map((record) => ({ record, relPath: `transactions/2026/${record.date}_${record.id}.json`, readOnly: false }))
  const status: FolderStatus = { dataDir: `/dane-ap45-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  data.applySnapshot({ fi: { ...fi, settings: { ...fi.settings, import: { ...fi.settings.import, rules: over.rules ?? [] } } }, records, problems: [], conflicts: [], status, loadMs: 0 })
  return fi.settings.accounts[0]!.id
}
const ruleList = () => data.useData.getState().fi!.settings.import.rules
const lastToast = () => ui.useUi.getState().toasts.at(-1)!
const undoAction = (start: string) => ui.useUi.getState().toasts.find((t) => t.action?.label === 'Cofnij' && t.text.startsWith(start))!.action!.run
const draft = (over: Partial<ConditionsDraft> = {}): ConditionsDraft => ({
  label: '',
  direction: 'out',
  conditions: [
    { field: 'counterparty', value: ' Orlen ' },
    { field: 'amount', min: null, max: 4000 }
  ],
  combine: 'all',
  choice: EXPENSE,
  manual: false,
  tags: [],
  ...over
})

beforeEach(() => {
  vi.clearAllMocks()
  ui.useUi.setState({ toasts: [] })
})

describe('AP-45: zapis reguły z warunkami (T467)', () => {
  it('odmowy ze słowem: bez warunku, pusty kontrahent / tytuł, kwota bez końców, bez konta, wydatek bez kategorii – nic nie zapisane', () => {
    open()
    expect(rules.saveConditionsRule(null, draft({ conditions: [] }))).toBe('Dodaj co najmniej jeden warunek.')
    expect(rules.saveConditionsRule(null, draft({ conditions: [{ field: 'counterparty', value: ' – ' }] }))).toBe('Wpisz fragment nazwy kontrahenta – litery albo cyfry.')
    expect(rules.saveConditionsRule(null, draft({ conditions: [{ field: 'title', value: '' }] }))).toBe('Wpisz słowo z tytułu.')
    expect(rules.saveConditionsRule(null, draft({ conditions: [{ field: 'amount', min: null, max: null }] }))).toBe('Podaj kwotę „od”, „do” albo obie.')
    expect(rules.saveConditionsRule(null, draft({ conditions: [{ field: 'account', value: '01K6NIEMA00000000000000001' }] }))).toBe('Wybierz konto.')
    expect(rules.saveConditionsRule(null, draft({ choice: { ...EXPENSE, categoryId: null } }))).toBe('Wybierz kategorię.')
    expect(rules.saveConditionsRule(null, draft({ conditions: [{ field: 'waluta', value: 'EUR' }] }))).toBe('Warunek nowszej wersji aplikacji – usuń go albo zaktualizuj aplikację.')
    expect(ruleList()).toEqual([])
  })

  it('nowa reguła: tryb „conditions”, warunki przycięte, nazwa z pierwszego warunku, kierunek reguły, „także dla wpisów ręcznych”; „Cofnij” ją usuwa', () => {
    open()
    expect(rules.saveConditionsRule(null, draft({ manual: true, tags: ['kawa'] }))).toBeNull()
    const r = ruleList()[0]!
    expect(r).toMatchObject({ mode: 'conditions', match: 'Orlen', label: 'Orlen', combine: 'all', direction: 'out', kind: 'expense', categoryId: COFFEE, manual: true, tags: ['kawa'], learned: false, hits: 0 })
    expect(r.conditions).toEqual([
      { field: 'counterparty', value: 'Orlen' },
      { field: 'amount', min: null, max: 4000 }
    ])
    expect(importRuleSchema.parse(JSON.parse(JSON.stringify(r)))).toEqual(JSON.parse(JSON.stringify(r)))
    expect(lastToast().text).toBe('Nowa reguła: „Orlen”.')
    undoAction('Nowa reguła')()
    expect(ruleList()).toEqual([])
  })

  it('nowa reguła zmieniona po dodaniu: „Cofnij” dodania jej nie usuwa i to mówi (T418)', () => {
    open()
    rules.saveConditionsRule(null, draft())
    const undo = undoAction('Nowa reguła')
    rules.saveConditionsRule(ruleList()[0]!.id, draft({ choice: { ...EXPENSE, categoryId: FUN } }))
    undo()
    expect(ruleList()).toHaveLength(1)
    expect(lastToast().text).toBe('Reguła „Orlen” zmieniła się od dodania – zostaje, jak jest.')
  })

  it('zmiana reguły w miejscu (LUB, inna decyzja, bez „ręcznych”); „Cofnij” – tylko gdy nikt jej od tego czasu nie zmienił', () => {
    open()
    rules.saveConditionsRule(null, draft({ label: 'Orlen – kawa', manual: true }))
    const id = ruleList()[0]!.id
    expect(rules.saveConditionsRule(id, draft({ label: 'Orlen – kawa', combine: 'any', choice: { ...EXPENSE, categoryId: FUN } }))).toBeNull()
    expect(ruleList()).toHaveLength(1)
    expect(ruleList()[0]).toMatchObject({ id, combine: 'any', categoryId: FUN })
    expect(ruleList()[0]!.manual).toBeUndefined()
    const undo = undoAction('Reguła „Orlen – kawa” zmieniona')
    rules.saveConditionsRule(id, draft({ label: 'Orlen – kawa', choice: { ...EXPENSE, categoryId: OTHER } }))
    undo()
    expect(ruleList()[0]!.categoryId).toBe(OTHER)
    expect(lastToast().text).toBe('Reguła „Orlen – kawa” zmieniła się od tego czasu – zostaje, jak jest.')
    // A rule deleted meanwhile: said, nothing written.
    rules.deleteRule(id)
    expect(rules.saveConditionsRule(id, draft())).toBe('Tej reguły już nie ma – usunięto ją w międzyczasie.')
    expect(ruleList()).toEqual([])
  })

  it('folder tylko do odczytu: odmowa ze słowem', () => {
    open()
    data.useData.setState({ status: { ...data.useData.getState().status!, readOnly: true } })
    expect(rules.saveConditionsRule(null, draft())).toBe(data.READ_ONLY_MESSAGE)
    expect(ruleList()).toEqual([])
  })

  it('warunki słowami na liście reguł', () => {
    const acc = open()
    expect(rules.conditionsText({ conditions: draft().conditions, combine: 'all' })).toBe('kontrahent zawiera „ Orlen ” i kwota do 40,00 zł')
    expect(
      rules.conditionsText({
        conditions: [
          { field: 'title', value: 'czynsz' },
          { field: 'account', value: acc },
          { field: 'amount', min: 1000, max: 2000 }
        ],
        combine: 'any'
      })
    ).toBe(`tytuł zawiera „czynsz” lub konto ${data.useData.getState().fi!.settings.accounts[0]!.name} lub kwota 10,00–20,00 zł`)
  })
})

describe('AP-45: „także dla wpisów ręcznych” w edytorze reguły i na liście słów (T470)', () => {
  const orlen = () => importRuleSchema.parse({ id: '01K6RXXE000000000000000001', match: 'orlen', mode: 'exact', direction: 'out', label: 'Orlen', kind: 'expense', categoryId: COFFEE, learned: true, hits: 3, updatedAt: AT })

  it('edytor reguły marki: włączone – pole `manual`; wyłączone – pole znika (jak przed 1.16.0)', () => {
    open({ rules: [orlen()] })
    rules.editRule(orlen().id, { direction: 'out', choice: rules.choiceOfRule(orlen()), manual: true })
    expect(ruleList()[0]!.manual).toBe(true)
    rules.editRule(orlen().id, { direction: 'out', choice: rules.choiceOfRule(orlen()), manual: false })
    expect(Object.hasOwn(JSON.parse(JSON.stringify(ruleList()[0])), 'manual')).toBe(false)
    // Without the field in the patch (another editor): kept.
    rules.editRule(orlen().id, { direction: 'out', choice: rules.choiceOfRule(orlen()), manual: true })
    rules.editRule(orlen().id, { direction: 'in', choice: rules.choiceOfRule(orlen()) })
    expect(ruleList()[0]!.manual).toBe(true)
  })

  it('przełącznik na liście słów kluczowych', () => {
    open({ rules: [orlen()] })
    rules.setRuleManual(orlen().id, true)
    expect(ruleList()[0]).toMatchObject({ manual: true, learned: false })
    rules.setRuleManual(orlen().id, false)
    expect(ruleList()[0]!.manual).toBeUndefined()
  })
})

describe('AP-45: „Zastosuj do historii” reguły z warunkami (T469)', () => {
  it('operacje, które reguła łapie, z inną kategorią – zmienione; „Cofnij” je przywraca', async () => {
    const acc = '01KDEFACC00000000000000001'
    const op = (id: string, amount: number) =>
      transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id, createdAt: AT, updatedAt: AT, date: '2026-10-20', accountId: acc, amount, counterparty: 'ORLEN', categoryId: FUN, bank: { key: id, importedAt: AT, source: 'lista', counterparty: 'ORLEN STACJA 12', operation: 'ZAKUP PRZY UŻYCIU KARTY', description: 'ORLEN STACJA 12' } })
    open({ transactions: [op('01K6TX00000000000000000001', -1500), op('01K6TX00000000000000000002', -9000)] })
    rules.saveConditionsRule(null, draft({ label: 'Orlen – kawa' }))
    const r = ruleList()[0]!
    const audit = auditRules(ruleList(), data.listOf(data.useData.getState().records.transactions), {})
    const differ = audit.differ.get(r.id)!
    expect(differ.map((x) => x.before.id)).toEqual(['01K6TX00000000000000000001'])
    rules.applyRuleToHistory(differ, r.label)
    const tx = (id: string) => data.useData.getState().records.transactions[id]!.record
    expect(tx('01K6TX00000000000000000001').categoryId).toBe(COFFEE)
    expect(tx('01K6TX00000000000000000002').categoryId).toBe(FUN)
    undoAction('Reguła „Orlen – kawa” zastosowana')()
    expect(tx('01K6TX00000000000000000001').categoryId).toBe(FUN)
  })
})

describe('przegląd R1 6: reguła operacji w edytorze („Zapamiętaj”) – z kwotą i kontem operacji', () => {
  it('reguła [konto i kontrahent] operacji z banku na tym koncie jest jej regułą – „Zapamiętaj” nie dokłada reguły marki (dawniej: nie znaleziona)', () => {
    const acc = '01KDEFACC00000000000000001'
    const t = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01K6TX00000000000000000009', createdAt: AT, updatedAt: AT, date: '2026-10-20', accountId: acc, amount: -1500, counterparty: 'ORLEN', categoryId: COFFEE, bank: { key: 'k9', importedAt: AT, source: 'lista', counterparty: 'ORLEN STACJA 12', operation: 'ZAKUP PRZY UŻYCIU KARTY', description: 'ORLEN STACJA 12' } })
    open({ transactions: [t] })
    rules.saveConditionsRule(null, draft({ conditions: [{ field: 'counterparty', value: 'orlen' }, { field: 'account', value: acc }] }))
    const r = ruleList()[0]!
    expect(rules.ruleFor(t)?.id).toBe(r.id)
    expect(rules.ruleFor({ ...t, accountId: '01KDEFACC00000000000000002' })).toBeNull()
  })
})

describe('przegląd R1 2.3: reguła z warunkami z czymkolwiek nieczytelnym – edycja odmawia ze słowem, reguła bez zmian', () => {
  const locked = (over: Record<string, unknown>) =>
    importRuleSchema.parse({ id: '01K6RXXE000000000000000020', match: 'Bolt', mode: 'conditions', conditions: [{ field: 'counterparty', value: 'bolt' }], combine: 'all', direction: 'out', label: 'Bolt', kind: 'expense', categoryId: COFFEE, learned: false, hits: 0, updatedAt: AT, ...over })

  it('„Zapisz” edytora: `combine` nowszej wersji – odmowa, wartość zostaje (dawniej: zamieniona na „all”)', () => {
    open({ rules: [locked({ combine: 'none' })] })
    expect(rules.saveConditionsRule(locked({}).id, draft({ conditions: [{ field: 'counterparty', value: 'bolt' }] }))).toBe(rules.LOCKED_RULE_TEXT)
    expect(ruleList()[0]).toEqual(locked({ combine: 'none' }))
  })

  it('zmiana decyzji, „Zmień na spłatę”, „też ręczne”: reguła z kierunkiem / rodzajem nowszej wersji zostaje, toast mówi dlaczego', () => {
    const r = locked({ direction: 'both', kind: 'income', categoryId: null, household: true, inflowKind: 'advance' })
    open({ rules: [r] })
    rules.editRule(r.id, { direction: 'out', choice: rules.choiceOfRule(r) })
    expect(ruleList()[0]).toEqual(r)
    expect(lastToast().text).toBe(rules.LOCKED_RULE_TEXT)
    rules.repayingRule(r)
    rules.setRuleManual(r.id, true)
    expect(ruleList()[0]).toEqual(r)
    const k = locked({ kind: 'przyszly' })
    open({ rules: [k] })
    rules.editRule(k.id, { direction: 'out', choice: rules.choiceOfRule(k) })
    expect(ruleList()[0]).toEqual(k)
    // Deleting it – yes.
    rules.removeRule(k.id)
    expect(ruleList()).toEqual([])
  })
})
