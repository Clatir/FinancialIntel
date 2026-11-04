/**
 * N2 (1.15.6), the second review in the window: a rule's loan part of each inflow kept by a group's change in the list
 * (T358), „zapamiętaj” back after a loan's repayment chosen by mistake, the import's salary rows without the file's spread
 * read on every change, „+ spłata pożyczki” never a second line of one loan, the note of an explicit kind naming purchases
 * as the ledger reads it, the quick entry's loan part emptied back to what the loan owes.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, QuickData, Snapshot } from '@shared/api'
import { categoryIndex } from '@shared/calc/operations'
import { balanceOf, namesFor, settleHousehold } from '@shared/calc/household'
import { createDefaultSettings } from '@shared/defaults'
import { classifyRow } from '@shared/import/classify'
import { importGroups, type Choice } from '@shared/import/reconcile'
import { COLLECTIONS } from '@shared/paths'
import { importRuleSchema, loanSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type ImportRule, type Loan, type SettingsFile, type Transaction } from '@shared/schema'
import { listaCsv } from '../e2e/mbank-csv'

const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, records: Array<{ id: string }>) => records.map((record) => ({ id: record.id, entry: { record, relPath: `${record.id}.json`, readOnly: false } }))),
  saveSettings: vi.fn(async (f: SettingsFile) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: readonly string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined),
  historyDeleted: vi.fn(async (): Promise<unknown[]> => []),
  importBackup: vi.fn(async () => 'C:\\dane\\backups\\pre-import\\2026-11-04.zip'),
  folderShown: vi.fn(async () => undefined),
  quickData: vi.fn(async (_d: QuickData | null) => undefined)
}
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) })
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const fleet = await import('../../src/renderer/store/fleet')
const ui = await import('../../src/renderer/store/ui')
const state = await import('../../src/renderer/features/import/state')
const options = await import('../../src/renderer/features/import/options')
const { changedLine, rowPartsOf } = await import('../../src/renderer/features/import/DecisionFields')
const { loanToName } = await import('../../src/renderer/features/radar/loanChoices')
const { quickLoanPart, typedLoan } = await import('../../src/renderer/features/quick/QuickApp')

const AT = '2026-09-01T10:00:00.000Z'
const MAMA = '01KN2SMAMA0000000000000001'
const TATA = '01KN2STATA0000000000000001'
const JAN_LOAN = '01KN2SJAN00000000000000001'
const PERIOD = { from: '2026-10-01', to: '2026-11-02' }
const bytes = (text: string) => new TextEncoder().encode(text)
const person = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const jan: Loan = loanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: JAN_LOAN, createdAt: AT, updatedAt: AT, name: 'Pożyczka dla Jana', direction: 'given', counterparty: 'JAN KOWALSKI', amount: 100000, date: '2026-10-01' })
let folder = 0
function open(rules: ImportRule[] = []): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const acc = fi.settings.accounts[0]!.id
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const lent = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01KN2SGAVE0000000000000001', createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: acc, kind: 'loan', amount: -100000, loanId: JAN_LOAN, counterparty: 'JAN KOWALSKI' })
  records.transactions = [{ record: lent, relPath: `transactions/2026/${lent.date}_${lent.id}.json`, readOnly: false }]
  records.loans = [{ record: jan, relPath: `loans/${jan.id}.json`, readOnly: false }]
  const status: FolderStatus = { dataDir: `/dane-n2r2-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  const members = [...fi.settings.household.members, person(MAMA, 'Mama', { bankNames: ['ANNA NOWAK'] }), person(TATA, 'Tata')]
  data.applySnapshot({
    fi: {
      ...fi,
      settings: {
        ...fi.settings,
        budget: { ...fi.settings.budget, start: '2026-09-01' },
        household: { ...fi.settings.household, since: null, assignFrom: null, members },
        import: { ...fi.settings.import, rules: [...fi.settings.import.rules, ...rules] }
      }
    },
    records,
    problems: [],
    conflicts: [],
    status,
    loadMs: 0
  })
}
const groups = () => importGroups(state.useImport.getState().plan, state.useImport.getState().choices.restoreDeleted)
const groupOf = (name: string) => groups().find((g) => g.label === name || g.names.includes(name))!
const view = () => {
  const s = state.useImport.getState()
  return state.sharesView(s.plan, s.choices, fleet.fleetNow()!.household, data.useData.getState().fi!.settings.household.members, fleet.fleetNow()!.loans)!
}
const partsByDate = (g: ReturnType<typeof groupOf>) => {
  const v = view()
  return [...g.rows].sort((a, b) => a.row.date.localeCompare(b.row.date)).map((p) => (v.parts.get(p.key) ?? []).map((x) => x.amount))
}

beforeEach(() => {
  vi.clearAllMocks()
  ui.useUi.setState({ toasts: [] })
})

describe('przegląd N2 2 w oknie: import', () => {
  it('2.2 + 2.9: reguła Mamy „w tym spłata pożyczki 200 zł”, 3 wpłaty – zmiana w liście zostawia 200 zł z każdej; pożyczka przez pomyłkę i z powrotem – „zapamiętaj” znowu włączone', async () => {
    const settings = createDefaultSettings(AT).settings
    const brand = classifyRow(
      { line: 1, date: '2026-10-05', description: 'ANNA NOWAK, PRZELEW  PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY', operation: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY', counterparty: 'ANNA NOWAK', title: 'PRZELEW', accountNo: '', category: '', amount: 1, pending: false, balanceAfter: null },
      { rules: [], ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings.categories), members: [], loans: [] }
    ).target.brand
    const partRule = importRuleSchema.parse({ id: '01KN2SR0000000000000000001', match: brand, label: 'ANNA NOWAK', direction: 'in', kind: 'income', household: true, memberId: MAMA, loanId: JAN_LOAN, loanAmount: 20000, updatedAt: AT })
    open([partRule])
    const rows = ['2026-10-05', '2026-10-15', '2026-10-25'].map((date) => ({ date, amount: 500, name: 'ANNA NOWAK', title: 'PRZELEW' }))
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, rows)))
    const g = groupOf('ANNA NOWAK')
    expect(g.rows.length).toBe(3)
    expect(partsByDate(g)).toEqual([[20000], [20000], [20000]])
    // „spłata, reszta jako zaliczka” chosen in the list: the same member's money keeps its lines (T351) – of each inflow.
    state.decideGroup(g.group, options.listChoice(`household:${MAMA}:advance`, g.proposed))
    expect(partsByDate(g)).toEqual([[20000], [20000], [20000]])
    expect(state.lineSpreads(view(), `g:${g.group}`)).toMatchObject({ 0: { typed: 60000, each: 20000, capped: false } })
    // Its amount changed at the group: the group's own – together for its inflows (T358, T328).
    const typed = state.useImport.getState().choices.groups[g.group]!
    state.decideGroup(g.group, { ...typed, shares: typed.shares!.map((x) => changedLine(x, { amount: 30000 })) })
    expect(state.useImport.getState().choices.groups[g.group]!.shares).toEqual([{ memberId: '', amount: 30000, advance: false, loanId: JAN_LOAN }])
    expect(partsByDate(g)).toEqual([[30000], [], []])
    // A loan's whole repayment by mistake – „zapamiętaj” off; back to Mama's money – on again (was: off for good).
    state.decideGroup(g.group, options.listChoice(`loan:${JAN_LOAN}`, g.proposed))
    expect(state.useImport.getState().choices.remember[g.group]).toBe(false)
    state.decideGroup(g.group, options.listChoice(`household:${MAMA}:income`, state.useImport.getState().choices.groups[g.group]!))
    expect(state.useImport.getState().choices.remember[g.group]).toBe(true)
  })

  it('2.13: 100 przelewów pensji przy otwartej pożyczce – żaden wiersz nie czyta rozkładu przy każdej zmianie (tylko „+ w tym spłata pożyczki”)', async () => {
    open()
    const rows = Array.from({ length: 100 }, (_, i) => ({ date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, amount: 5000 + i, name: 'PRACODAWCA SA', title: `PENSJA ${i}` }))
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, rows)))
    const g = groupOf('PRACODAWCA SA')
    const members = data.useData.getState().fi!.settings.household.members.length
    const modes = (c: Choice) => g.rows.map((p) => rowPartsOf(c, p.row.amount, members, true))
    // Before: every one of them mounted the rows' parts – the file's spread read for each of them on any change.
    expect(modes(g.proposed).filter((m) => m === 'lines').length).toBe(0)
    expect(modes(g.proposed).filter((m) => m === 'add').length).toBe(g.rows.length)
    // No loan open – nothing at all; a group with a loan's line, a member's money among more members – their lines.
    expect(g.rows.map((p) => rowPartsOf(g.proposed, p.row.amount, members, false)).every((m) => m === null)).toBe(true)
    const withLine: Choice = { ...g.proposed, shares: [{ memberId: '', amount: 10000, advance: false, loanId: JAN_LOAN }] }
    expect(new Set(modes(withLine))).toEqual(new Set(['lines']))
    expect(rowPartsOf({ ...g.proposed, household: true }, 5000, members, false)).toBe('lines')
    expect(rowPartsOf({ ...g.proposed, kind: 'expense' }, 5000, members, true)).toBeNull()
  })
})

describe('przegląd N2 2 w oknie: edytor wpływu i szybki wpis', () => {
  it('2.11: „+ spłata pożyczki” tylko dla pożyczki jeszcze nienazwanej – nigdy druga linia tej samej (przedtem pierwsza otwarta)', () => {
    const loans = [
      { id: JAN_LOAN, closed: false },
      { id: '01KN2SEWA00000000000000001', closed: true }
    ]
    expect(loanToName(loans, [])?.id).toBe(JAN_LOAN)
    expect(loanToName(loans, [{ loanId: JAN_LOAN }])).toBeUndefined()
    expect(loanToName([...loans, { id: '01KN2SA0000000000000000001', closed: false }], [{ loanId: JAN_LOAN }, { loanId: null }])?.id).toBe('01KN2SA0000000000000000001')
  })

  it('2.10: uwaga „poza wskazanymi wcześniej zakupami: te spłaca” – jak księga: dług startowy wskazanych domowników (coversOpeningMembers)', () => {
    const t = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01KN2SADV00000000000000001', createdAt: AT, updatedAt: AT, date: '2026-10-10', accountId: MBANK_ACCOUNT_ID, kind: 'income', amount: 30000, memberId: MAMA, inflowKind: 'advance', advance: true, coversOpening: true, coversOpeningMembers: [TATA] }) as Transaction
    // Before: true for Mama too – the note said her advance repays, the ledger does not.
    expect([namesFor(t, MAMA), namesFor(t, TATA)]).toEqual([false, true])
    expect(namesFor({ ...t, coversOpeningMembers: undefined }, MAMA)).toBe(true)
    expect(namesFor({ ...t, coversOpening: undefined, coversOpeningMembers: undefined, covers: ['01KN2SSHP00000000000000001'] }, MAMA)).toBe(true)
    // The ledger agrees: Mama's opening debt is not repaid by it – her advance holds all of it.
    const members = [person(MAMA, 'Mama', { opening: { owed: 10000, deposit: 0 } }), person(TATA, 'Tata')]
    expect(balanceOf(settleHousehold([t], { members, from: '2026-09-01' }), MAMA)).toMatchObject({ owed: 10000, deposit: 30000 })
  })

  it('2.12: szybki wpis – wyczyszczona kwota spłaty pożyczki wraca do tego, co pożyczka ma do spłaty (przedtem 0 zł i „Wpisz kwotę”)', () => {
    const quick = { loans: [{ id: JAN_LOAN, name: 'Pożyczka dla Jana', open: 30000 }], members: [] }
    const d = { kind: 'income' as const, household: false, memberId: null, amount: 50000 }
    const chosen = { loanId: JAN_LOAN, amount: null }
    expect(quickLoanPart(chosen, quick, d, {})?.amount).toBe(30000)
    const typed = typedLoan(chosen, 12000)
    expect(quickLoanPart(typed, quick, d, {})?.amount).toBe(12000)
    const emptied = typedLoan(typed, null)
    expect(emptied).toEqual({ loanId: JAN_LOAN, amount: null })
    expect(quickLoanPart(emptied, quick, d, {})?.amount).toBe(30000)
    expect(typedLoan(null, 100)).toBeNull()
  })
})
