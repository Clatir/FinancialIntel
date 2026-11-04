import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { balanceOf, skippedDebtsOf, skippedKey } from '@shared/calc/household'
import { isDuplicatePairKey } from '@shared/import/duplicates'
import { importGroups, type Choice } from '@shared/import/reconcile'
import { COLLECTIONS } from '@shared/paths'
import { defaultCategoryId, importRuleSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type SettingsFile, type Transaction } from '@shared/schema'
import { listaCsv, type CsvTransfer } from '../e2e/mbank-csv'

// The renderer's stores talk to the main process through window.fi (preload); here it is a mock writing nothing.
const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, records: Array<{ id: string }>) => records.map((record) => ({ id: record.id, entry: { record, relPath: `${record.id}.json`, readOnly: false } }))),
  saveSettings: vi.fn(async (f: SettingsFile) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: readonly string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined),
  historyDeleted: vi.fn(async (): Promise<unknown[]> => []),
  importBackup: vi.fn(async () => 'C:\\dane\\backups\\pre-import\\2026-11-04.zip'),
  folderShown: vi.fn(async () => undefined)
}
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const fleet = await import('../../src/renderer/store/fleet')
const state = await import('../../src/renderer/features/import/state')
const options = await import('../../src/renderer/features/import/options')
const actions = await import('../../src/renderer/features/household/actions')

const AT = '2026-09-01T10:00:00.000Z'
const MAREK = '01KN2SMAREK000000000000001'
const TATA = '01KN2STATA0000000000000002'
const EVENTIM = '01KN2SEVENT000000000000003'
const PERIOD = { from: '2026-10-26', to: '2026-11-02' }
const bytes = (text: string) => new TextEncoder().encode(text)
const FROM_MAREK: CsvTransfer = { date: '2026-11-02', amount: 500, name: 'MAREK TESTOWY', title: 'ZWROT ZA BILETY' }

const person = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
let folder = 0
/** Marek owes 360 zł for the tickets (P.3, IM.23); purchases paid back as named (D91) from the start. */
function open(extra: Transaction[] = [], over: { members?: HouseholdMember[]; rules?: SettingsFile['settings']['import']['rules'] } = {}): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const acc = fi.settings.accounts[0]!.id
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const tickets = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: EVENTIM, createdAt: AT, updatedAt: AT, date: '2026-10-20', accountId: acc, amount: -36000, categoryId: defaultCategoryId(6, 1), refundable: true, memberId: MAREK, counterparty: 'EVENTIM' })
  records.transactions = [tickets, ...extra.map((t) => ({ ...t, accountId: acc }))].map((record) => ({ record, relPath: `transactions/2026/${record.date}_${record.id}.json`, readOnly: false }))
  const status: FolderStatus = { dataDir: `/dane-n2-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  const members = over.members ?? [...fi.settings.household.members, person(MAREK, 'Marek', { bankNames: ['MAREK TESTOWY'] }), person(TATA, 'Tata', { inflow: 'ask', bankNames: ['PIOTR TESTOWY'] })]
  data.applySnapshot({
    fi: { ...fi, settings: { ...fi.settings, household: { ...fi.settings.household, since: null, assignFrom: null, members }, import: { ...fi.settings.import, rules: over.rules ?? [] } } },
    records,
    problems: [],
    conflicts: [],
    status,
    loadMs: 0
  })
}
const groups = () => importGroups(state.useImport.getState().plan, state.useImport.getState().choices.restoreDeleted)
const groupOf = (name: string) => groups().find((g) => g.label === name || g.names.includes(name))!
const ops = () => data.listOf(data.useData.getState().records.transactions)
const ledger = () => fleet.fleetNow()!.household
const lastToast = () => ui.useUi.getState().toasts.at(-1)
const income = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: `01KN2SWP${String(++folder).padStart(18, '0')}`, createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, kind: 'income', amount, memberId: MAREK, counterparty: 'MAREK TESTOWY', ...over })

beforeEach(() => {
  vi.clearAllMocks()
  ui.useUi.setState({ toasts: [] })
})

describe('AP-4 (AF-8, P.3, IM.23): „spłata, reszta jako zaliczka” w imporcie najpierw spłaca, reguła bez zaliczki na przyszłość', () => {
  it('Marek 500 zł: bilety 360 zł spłacone (wskazane same), 140 zł zaliczki; reguła „spłata” – resztę daje ustawienie osoby (D80 b)', async () => {
    const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
    open([], { members: [...fi.settings.household.members, person(MAREK, 'Marek', { inflow: 'income', bankNames: ['MAREK TESTOWY'] })] })
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [FROM_MAREK])))
    const g = groupOf('MAREK TESTOWY')
    // The proposal for Marek (the rest as income – his setting): the list's own option and name.
    expect(options.optionOf(g.proposed, 'in')).toBe(`household:${MAREK}:income`)
    // The user picks „spłata, reszta jako zaliczka” and remembers it – before AP-4 it was saved as „całość jako zaliczka”
    // (the debt skipped, the rule learned so).
    const picked = options.choiceFor(`household:${MAREK}:advance`, g.proposed)
    expect(picked).toMatchObject({ kind: 'income', household: true, memberId: MAREK, advance: true, inflowKind: 'repay' })
    state.decideGroup(g.group, picked)
    await state.runImport()
    const money = ops().find((t) => t.counterparty === 'MAREK TESTOWY')!
    expect(money).toMatchObject({ amount: 50000, memberId: MAREK, advance: true, inflowKind: 'repay', covers: [EVENTIM] })
    expect(balanceOf(ledger(), MAREK)).toMatchObject({ owed: 0, deposit: 14000, open: [], unassigned: [] })
    const rule = data.useData.getState().fi!.settings.import.rules.find((r) => r.match === 'marektestowy')!
    expect(rule).toMatchObject({ kind: 'income', household: true, memberId: MAREK, inflowKind: 'repay' })
    // The rule's „spłata”: the rest beyond the debt as Marek's setting says (D80 b – before: always income).
    actions.patchMember(MAREK, { inflow: 'advance' })
    await state.loadImportFile('lista2.csv', bytes(listaCsv([], { from: '2026-11-03', to: '2026-11-03' }, null, [{ ...FROM_MAREK, date: '2026-11-03', amount: 100, title: 'NA KONCERT' }])))
    const next = groupOf('MAREK TESTOWY')
    expect(next.source).toBe('rule')
    expect(next.proposed).toMatchObject({ inflowKind: 'repay', advance: true })
    expect(options.optionOf(next.proposed, 'in')).toBe(`household:${MAREK}:advance`)
  })

  it('jedna nazwa wyboru: cztery opcje na osobę, każda wraca do siebie (`optionOf` rozróżnia „resztę” od „całości”)', () => {
    open()
    const members = data.useData.getState().fi!.settings.household.members
    const marek = options.optionsFor('in', members).filter((o) => o.value.startsWith(`household:${MAREK}:`))
    expect(marek.map((o) => o.label)).toEqual([
      'Od domownika: Marek – spłata, reszta jako przychód',
      'Od domownika: Marek – spłata, reszta jako zaliczka',
      'Od domownika: Marek – niezależny przychód (bez spłaty)',
      'Od domownika: Marek – zaliczka na przyszłość (bez spłaty)'
    ])
    const base: Choice = { kind: 'income', categoryId: null, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    for (const o of marek) expect(options.optionOf(options.choiceFor(o.value, base), 'in')).toBe(o.value)
    expect(marek.map((o) => options.choiceFor(o.value, base)).map((c) => [c.inflowKind, c.advance])).toEqual([
      ['repay', false],
      ['repay', true],
      ['income', false],
      ['advance', true]
    ])
    // A record of 1.15.3–1.15.5 („reszta jako zaliczka” saved as an advance for the future): its explicit name now.
    expect(options.optionOf({ ...base, household: true, memberId: MAREK, advance: true, inflowKind: 'advance' }, 'in')).toBe(`household:${MAREK}:all-advance`)
    // The bulk decision offers the same four.
    expect(options.bulkOptions(members).filter((o) => o.value.startsWith(`household:${MAREK}:`)).map((o) => o.value)).toEqual(marek.map((o) => o.value))
  })

  it('jawny rodzaj przy długu mówi, czego nie spłaci; edytor reguły – tylko reszta z ustawienia osoby', () => {
    const c = (over: Partial<Choice>): Choice => ({ kind: 'income', categoryId: null, refundable: false, household: true, memberId: MAREK, advance: true, counterAccountId: null, ...over })
    const zl = (g: number) => (g / 100).toFixed(2)
    expect(options.skipsDebtText(c({ inflowKind: 'advance' }), 36000, 'Marek', zl)).toBe('Marek ma oddać 360.00 zł – zaliczka na przyszłość tego nie spłaci')
    expect(options.skipsDebtText(c({ inflowKind: 'income', advance: false }), 36000, 'Marek', zl)).toBe('Marek ma oddać 360.00 zł – niezależny przychód tego nie spłaci')
    expect(options.skipsDebtText(c({ inflowKind: 'repay' }), 36000, 'Marek', zl)).toBeNull()
    expect(options.skipsDebtText(c({ inflowKind: 'advance' }), 0, 'Marek', zl)).toBeNull()
    const members = [person(MAREK, 'Marek'), person(TATA, 'Tata', { inflow: 'ask' })]
    expect([`household:${MAREK}:income`, `household:${MAREK}:advance`, `household:${MAREK}:all-income`, `household:${MAREK}:all-advance`].map((o) => options.restNotOfRule(o, members))).toEqual([true, false, false, false])
    expect([`household:${TATA}:income`, `household:${TATA}:advance`, 'income'].map((o) => options.restNotOfRule(o, members))).toEqual([false, true, false])
  })

  it('„zaliczka czy przychód?” zapamiętane tylko z odpowiedzi o resztę – jawny rodzaj nie odpowiada (D80 b)', async () => {
    open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [{ date: '2026-11-01', amount: 80, name: 'PIOTR TESTOWY', title: 'ZWROT' }])))
    const g = groupOf('PIOTR TESTOWY')
    const choices = (option: string) => ({ ...state.useImport.getState().choices, groups: { [g.group]: options.choiceFor(option, g.proposed) } })
    expect(state.inflowVotes(groups(), choices(`household:${TATA}:all-advance`))).toEqual([])
    expect(state.inflowVotes(groups(), choices(`household:${TATA}:all-income`))).toEqual([])
    expect(state.inflowVotes(groups(), choices(`household:${TATA}:advance`))).toEqual([{ kind: 'income', memberId: TATA, advance: true }])
  })
})

describe('AP-4: naprawa zapisanych wpłat – meldunek „nie spłaciły długu – spłacić?”', () => {
  it('„Spłać”: zaliczki Marka na przyszłość wyrównują dług (wskazany pewny zakup), reszta zostaje zaliczką; „Cofnij” przywraca', () => {
    const blind = income('2026-10-25', 10000, { inflowKind: 'advance', advance: true })
    const whole = income('2026-10-28', 36000, { inflowKind: 'advance', advance: true })
    open([blind, whole])
    // 100 zł skipped 360 zł of debt, the next 360 zł skipped it too (the tickets still open, 460 zł in the deposit); the
    // first repays 100 zł of it, the second what is left – 260 zł (review 2 of N2), each its whole part.
    expect(skippedDebtsOf(ledger(), fleet.fleetNow()!.receivables.members, {})).toEqual([
      {
        memberId: MAREK,
        owed: 36000,
        repays: 36000,
        items: [
          { txId: blind.id, date: '2026-10-25', amount: 10000, repays: 10000, whole: true, repaidLater: false },
          { txId: whole.id, date: '2026-10-28', amount: 36000, repays: 26000, whole: true, repaidLater: false }
        ]
      }
    ])
    expect(balanceOf(ledger(), MAREK)).toMatchObject({ owed: 36000, deposit: 46000 })
    expect(actions.repayAdvances(MAREK)).toBe(true)
    const now = () => data.useData.getState().records.transactions
    // The first: no purchase sure for 100 zł – it waits to be assigned (D91 a), the debt lower all the same.
    expect(now()[blind.id]!.record).toMatchObject({ inflowKind: 'repay', advance: true, covers: [] })
    // The second: the whole debt – sure (D91 b, T329), named by itself as the import does.
    expect(now()[whole.id]!.record).toMatchObject({ inflowKind: 'repay', advance: true, covers: [EVENTIM] })
    expect(balanceOf(ledger(), MAREK)).toMatchObject({ owed: 0, deposit: 10000, open: [], unassigned: [] })
    expect(ledger().skipped).toEqual([])
    lastToast()!.action!.run()
    expect(now()[blind.id]!.record).toMatchObject({ inflowKind: 'advance', covers: [] })
    expect(now()[whole.id]!.record).toMatchObject({ inflowKind: 'advance', covers: [] })
    expect(balanceOf(ledger(), MAREK)).toMatchObject({ owed: 36000, deposit: 46000 })
  })

  it('„zostaw”: meldunek nie wraca dla tych wpłat (klucz poza parami duplikatów), nowa zaliczka – znowu pyta; „Cofnij”', () => {
    const blind = income('2026-10-25', 10000, { inflowKind: 'advance', advance: true })
    open([blind])
    actions.keepAdvances(MAREK)
    const kept = data.useData.getState().fi!.settings.import.notDuplicates
    expect(Object.keys(kept)).toEqual([skippedKey({ txId: blind.id, memberId: MAREK })])
    expect(skippedDebtsOf(ledger(), fleet.fleetNow()!.receivables.members, kept)).toEqual([])
    lastToast()!.action!.run()
    expect(data.useData.getState().fi!.settings.import.notDuplicates).toEqual({})
  })

  it('reguła z „zaliczką na przyszłość” do przeglądu: „Zmień na spłatę” – reguła „spłata” z „Cofnij”', async () => {
    const learned = importRuleSchema.parse({ id: '01KN2SREGXA000000000000001', match: 'marektestowy', mode: 'exact', direction: 'in', label: 'MAREK TESTOWY', kind: 'income', household: true, memberId: MAREK, inflowKind: 'advance', learned: true, hits: 3, updatedAt: AT })
    open([], { rules: [learned] })
    const rules = await import('../../src/renderer/features/import/rules')
    // The import shows its explicit name – and the editor of the rule offers no rest other than Marek's setting.
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [FROM_MAREK])))
    expect(options.optionOf(groupOf('MAREK TESTOWY').proposed, 'in')).toBe(`household:${MAREK}:all-advance`)
    rules.repayingRule(learned)
    expect(data.useData.getState().fi!.settings.import.rules[0]).toMatchObject({ inflowKind: 'repay', learned: false })
    lastToast()!.action!.run()
    expect(data.useData.getState().fi!.settings.import.rules[0]).toMatchObject({ inflowKind: 'advance', learned: true })
    // Kept as it is: out of the review – the key not a pair of the duplicates panel.
    rules.keepAdvanceRule(learned)
    expect(Object.keys(data.useData.getState().fi!.settings.import.notDuplicates).filter(isDuplicatePairKey)).toEqual([])
  })
})
