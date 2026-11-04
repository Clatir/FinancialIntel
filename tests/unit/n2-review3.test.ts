/**
 * N2 (1.15.6), the third review (low): the user's own „zapamiętaj” back after a loan's repayment chosen by mistake (1),
 * a docking counted from its pair's operation only for a pair the engine counts by its pool (2), the income without the
 * engine never counting a loan's part when the loans are not given (3), „Spłać” from one ledger (4), the deliveries'
 * memo kept per what each caller reads (6) – each failing before its fix. (5 – the note's `namesFor` – in
 * `n2-review2-import-store.test.ts`.)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, QuickData, Snapshot } from '@shared/api'
import { deliveries, type Delivery } from '@shared/calc/dock'
import { countsByPool, householdOf } from '@shared/calc/fleet'
import { balanceOf, settleHousehold, skippedDebtsOf } from '@shared/calc/household'
import { incomeParts, plainIncomeContext } from '@shared/calc/income'
import { weekNumbers } from '@shared/calc/intel'
import { repayingAdvancesOf } from '@shared/calc/repayments'
import { createDefaultSettings } from '@shared/defaults'
import { EMPTY_ICTJ, type IctjEntry, type IctjSnapshot } from '@shared/ictj'
import { COLLECTIONS } from '@shared/paths'
import { balanceSchema, defaultCategoryId, loanSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type Loan, type Settings, type SettingsFile, type Split, type Transaction } from '@shared/schema'
import { listaCsv } from '../e2e/mbank-csv'

// How many ledgers „Spłać” counts (4) and how many times the deliveries are counted (6): the very functions, counted.
vi.mock('@shared/calc/fleet', async (importOriginal) => {
  const m = await importOriginal<typeof import('@shared/calc/fleet')>()
  return { ...m, householdOf: vi.fn(m.householdOf) }
})
vi.mock('@shared/calc/dock', async (importOriginal) => {
  const m = await importOriginal<typeof import('@shared/calc/dock')>()
  return { ...m, deliveries: vi.fn(m.deliveries) }
})

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
const ui = await import('../../src/renderer/store/ui')
const state = await import('../../src/renderer/features/import/state')
const options = await import('../../src/renderer/features/import/options')
const dock = await import('../../src/renderer/features/dock/actions')
const { deliveriesFor } = await import('../../src/renderer/store/deliveries')
const { importGroups } = await import('@shared/import/reconcile')

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-09-01T10:00:00.000Z'
const MAMA = '01KN2R3MAMA000000000000001'
const MAREK = '01KN2R3MAREK00000000000001'
const JAN_LOAN = '01KN2R3JAN0000000000000001'
const PERIOD = { from: '2026-10-01', to: '2026-11-02' }
let seq = 0
const nextId = () => `01KN2R3X${String(++seq).padStart(18, '0')}`
const bytes = (text: string) => new TextEncoder().encode(text)
const person = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const jan: Loan = loanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: JAN_LOAN, createdAt: AT, updatedAt: AT, name: 'Pożyczka dla Jana', direction: 'given', counterparty: 'JAN KOWALSKI', amount: zl(1000), date: '2026-10-01' })
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const lent = tx('2026-10-01', -zl(1000), { kind: 'loan', loanId: JAN_LOAN, counterparty: 'JAN KOWALSKI' })
const loanLine = (amount: number): Split => ({ id: nextId(), amount: zl(amount), categoryId: null, refundable: false, memberId: null, advance: false, loanId: JAN_LOAN, note: '' })

let folder = 0
function open(): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = [{ record: lent, relPath: `transactions/2026/${lent.date}_${lent.id}.json`, readOnly: false }]
  records.loans = [{ record: jan, relPath: `loans/${jan.id}.json`, readOnly: false }]
  const status: FolderStatus = { dataDir: `/dane-n2r3-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  data.applySnapshot({
    fi: {
      ...fi,
      settings: {
        ...fi.settings,
        budget: { ...fi.settings.budget, start: '2026-09-01' },
        household: { ...fi.settings.household, since: null, assignFrom: null, members: [...fi.settings.household.members, person(MAMA, 'Mama', { bankNames: ['ANNA NOWAK'] })] }
      }
    },
    records,
    problems: [],
    conflicts: [],
    status,
    loadMs: 0
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ui.useUi.setState({ toasts: [] })
})

describe('przegląd N2 3.1: „zapamiętaj” po pożyczce wybranej przez pomyłkę wraca do tego, co użytkownik miał', () => {
  it('pieniądze Mamy bez „zapamiętaj” → pożyczka → znowu pieniądze Mamy: dalej wyłączone (przedtem włączone – reguła wbrew użytkownikowi); grupa i temat', async () => {
    open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [{ date: '2026-10-05', amount: 500, name: 'ANNA NOWAK', title: 'PRZELEW' }])))
    const s = () => state.useImport.getState()
    const g = importGroups(s().plan, s().choices.restoreDeleted).find((x) => x.label === 'ANNA NOWAK')!
    const mama = options.listChoice(`household:${MAMA}:income`, g.proposed)
    const loan = options.listChoice(`loan:${JAN_LOAN}`, g.proposed)
    state.decideGroup(g.group, mama)
    expect(s().choices.remember[g.group]).toBe(true)
    state.setRemember(g.group, false)
    state.decideGroup(g.group, loan)
    expect(s().choices.remember[g.group]).toBe(false)
    state.decideGroup(g.group, options.listChoice(`household:${MAMA}:income`, s().choices.groups[g.group]!))
    // Before: true – the rule of Mama's money learned though the user had unticked it.
    expect(s().choices.remember[g.group]).toBe(false)
    // Its own „tak” after the loan comes back as well; between two decisions repaying none – as it was.
    state.setRemember(g.group, true)
    state.decideGroup(g.group, loan)
    state.decideGroup(g.group, mama)
    expect(s().choices.remember[g.group]).toBe(true)
    // A theme the same way.
    state.chooseTheme(g.theme, mama)
    state.setRememberTheme(g.theme, false)
    state.chooseTheme(g.theme, loan)
    expect(s().choices.rememberThemes[g.theme]).toBe(false)
    state.chooseTheme(g.theme, mama)
    expect(s().choices.rememberThemes[g.theme]).toBe(false)
    // The decision taken back: nothing kept for the group.
    state.decideGroup(g.group, loan)
    state.clearGroup(g.group)
    expect(s().choices.rememberBeforeLoan?.[g.group]).toBeUndefined()
  })
})

describe('przegląd N2 3.2: `countedFrom` tylko dla pary, którą silnik liczy według puli (`countsByPool`)', () => {
  it('para wpisu ICTTJ z wpływem innego rodzaju (przelew, korekta): dokowanie od swojego utworzenia, jak liczy silnik', () => {
    const E: IctjEntry = { id: nextId(), kind: 'withdrawal', date: '2026-11-03', amount: zl(1000), pool: 'goals', note: '', updatedAt: null }
    const T = tx('2026-11-03', zl(1000), { kind: 'trading', counterparty: 'XTB S.A.', createdAt: '2026-11-03T08:00:00.000Z' })
    const [pair] = deliveries({ entries: [E], transactions: [T], dockings: [], start: '2026-11-01', today: '2026-11-03', skipped: [], ictjOn: true, coveredTo: null })
    expect(pair).toMatchObject({ state: 'pending', transaction: { id: T.id } })
    const counted = (kind: Transaction['kind']) => {
      const d: Delivery = { ...pair!, transaction: { ...T, kind } }
      return [kind, countsByPool({ kind }), dock.dockingOf(d, d.transaction!, null, '2026-11-03T19:00:00.000Z').countedFrom ?? null]
    }
    // Before: the operation's moment for every kind – a transfer's docking backdated though the engine never counted the pair.
    expect((['trading', 'income', 'transfer', 'correction'] as const).map(counted)).toEqual([
      ['trading', true, T.createdAt],
      ['income', true, T.createdAt],
      ['transfer', false, null],
      ['correction', false, null]
    ])
  })
})

describe('przegląd N2 3.3: przychody bez silnika – część pożyczki nie jest przychodem, gdy pożyczek nie podano', () => {
  it('wpłata 1 000 zł z linią 300 zł pożyczki: bez listy pożyczek 700 zł (przedtem 1 000 zł); pożyczki podane – jak silnik', () => {
    const money = tx('2026-10-14', zl(1000), { kind: 'income', counterparty: 'PRACA', splits: [loanLine(300)] })
    const list = [lent, money]
    expect(incomeParts(money, plainIncomeContext(list)).work).toBe(zl(700))
    // The loan known: its debt repaid up to it (T355); none known – a loan's part is income (AF-5).
    expect([incomeParts(money, plainIncomeContext(list, [jan])).work, incomeParts(money, plainIncomeContext(list, [])).work]).toEqual([zl(700), zl(1000)])
    // The report's default of a week (`weekNumbers` without the engine's context).
    expect(weekNumbers(list, createDefaultSettings(AT).settings.categories, '2026-10-12').income).toBe(zl(700))
  })
})

describe('przegląd N2 3.4: „Spłać” z jednej księgi – nie jednej na każdą zaliczkę', () => {
  it('5 zaliczek po 20 zł przy długu 100 zł: 2 księgi (przedtem 6), każda spłaca 20 zł, dług 0', () => {
    const s: Settings = createDefaultSettings(AT).settings
    const settings: Settings = { ...s, budget: { ...s.budget, start: '2026-10-01' }, household: { ...s.household, since: null, assignFrom: null, members: [...s.household.members, person(MAREK, 'Marek', { bankNames: ['MAREK TESTOWY'] })] } }
    const balances = [balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })]
    const p0 = tx('2026-10-02', -zl(100), { categoryId: defaultCategoryId(1, 1), refundable: true, memberId: MAREK, counterparty: 'Sklep' })
    const ahead = [3, 4, 5, 6, 7].map((d) => tx(`2026-10-0${d}`, zl(20), { kind: 'income', memberId: MAREK, counterparty: 'MAREK TESTOWY', inflowKind: 'advance', advance: true }))
    const input = { settings, balances, transactions: [p0, ...ahead] }
    const ledger = householdOf(input, '2026-10-20')
    expect(skippedDebtsOf(ledger, ledger.members, {})[0]!.items.map((i) => i.repays)).toEqual(ahead.map(() => zl(20)))
    vi.mocked(householdOf).mockClear()
    const changed = repayingAdvancesOf(input, MAREK, {}, '2026-10-20')
    expect(vi.mocked(householdOf).mock.calls.length).toBe(2)
    expect(changed.map((t) => [t.id, t.inflowKind])).toEqual(ahead.map((t) => [t.id, 'repay']))
    const after = settleHousehold([p0, ...changed], { assignFrom: null })
    expect(balanceOf(after, MAREK)).toMatchObject({ owed: 0, deposit: 0 })
  })
})

describe('przegląd N2 3.6: dostawy – lista Dokowania i pary silnika z innym dniem nie wypierają się z pamięci', () => {
  it('na zmianę dzień floty i dzień teraz (po północy): dostawy liczone 2 razy, nie przy każdym wywołaniu (przedtem 4)', () => {
    const records = { transactions: {}, dockings: {} }
    const snap: IctjSnapshot = { ...EMPTY_ICTJ, dir: 'C:\\ICTJ', status: 'ok', entries: [], readAt: AT }
    const [skipped, covered] = [[], {}]
    const ask = (today: string) => deliveriesFor(records, skipped, snap, '2026-10-01', today, covered)
    vi.mocked(deliveries).mockClear()
    const lists = [ask('2026-11-03'), ask('2026-11-04'), ask('2026-11-03'), ask('2026-11-04')]
    expect(vi.mocked(deliveries).mock.calls.length).toBe(2)
    expect([lists[2] === lists[0], lists[3] === lists[1]]).toEqual([true, true])
  })
})
