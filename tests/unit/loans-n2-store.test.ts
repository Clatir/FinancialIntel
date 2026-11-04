// D100 (2), T357–T359 in the window: the quick entry's „Spłata pożyczki” (whole or a part of any inflow), the import's
// part of a row and of a group with „zapamiętaj” off by default, a loan with such parts never deleted.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, QuickData, QuickResult, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { warsawNow } from '@shared/calc/dates'
import { loanPayers } from '@shared/calc/loans'
import { importGroups, loanKey, type Choice } from '@shared/import/reconcile'
import { COLLECTIONS } from '@shared/paths'
import { defaultCategoryId, loanSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type Loan, type SettingsFile, type Transaction } from '@shared/schema'
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
  quickResult: vi.fn(async (_r: QuickResult) => undefined),
  quickData: vi.fn(async (_d: QuickData | null) => undefined)
}
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) })
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const fleet = await import('../../src/renderer/store/fleet')
const ui = await import('../../src/renderer/store/ui')
const state = await import('../../src/renderer/features/import/state')
const radar = await import('../../src/renderer/features/radar/actions')
const options = await import('../../src/renderer/features/import/options')
const { quickAdd, quickData } = await import('../../src/renderer/store/quickHost')

const AT = '2026-09-01T10:00:00.000Z'
const MAMA = '01KN2RMAMA0000000000000001'
const JAN_LOAN = '01KN2RJAN00000000000000001'
const PERIOD = { from: '2026-10-26', to: '2026-11-02' }
const bytes = (text: string) => new TextEncoder().encode(text)
const person = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const jan = (over: Partial<Loan> = {}): Loan => loanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: JAN_LOAN, createdAt: AT, updatedAt: AT, name: 'Pożyczka dla Jana', direction: 'given', counterparty: 'JAN KOWALSKI', amount: 100000, date: '2026-10-01', ...over })
let folder = 0
let acc = ''
/** Jan owes 1 000 zł (lent on 01.10); Mama owes 350 zł for groceries she finances. */
function open(loan: Loan = jan(), extra: Transaction[] = []): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  acc = fi.settings.accounts[0]!.id
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const tx = (id: string, over: Partial<Transaction>) => transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id, createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: acc, amount: 0, ...over })
  const lent = tx('01KN2RGAVE0000000000000001', { kind: 'loan', amount: -100000, loanId: JAN_LOAN, counterparty: 'JAN KOWALSKI' })
  const bought = tx('01KN2RSHP00000000000000001', { date: '2026-10-20', amount: -35000, categoryId: defaultCategoryId(1, 1), refundable: true, memberId: MAMA, counterparty: 'Sklep' })
  records.transactions = [lent, bought, ...extra].map((record) => ({ record, relPath: `transactions/2026/${record.date}_${record.id}.json`, readOnly: false }))
  records.loans = [{ record: loan, relPath: `loans/${loan.id}.json`, readOnly: false }]
  const status: FolderStatus = { dataDir: `/dane-n2l-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  const members = [...fi.settings.household.members, person(MAMA, 'Mama', { bankNames: ['ANNA NOWAK'] })]
  data.applySnapshot({
    fi: { ...fi, settings: { ...fi.settings, budget: { ...fi.settings.budget, start: '2026-09-01' }, household: { ...fi.settings.household, since: null, assignFrom: null, members } } },
    records,
    problems: [],
    conflicts: [],
    status,
    loadMs: 0
  })
}
const ops = () => data.listOf(data.useData.getState().records.transactions)
const loanNow = () => fleet.fleetNow()!.loans.find((l) => l.loan.id === JAN_LOAN)!
const groups = () => importGroups(state.useImport.getState().plan, state.useImport.getState().choices.restoreDeleted)
const groupOf = (name: string) => groups().find((g) => g.label === name || g.names.includes(name))!
const quick = (over: Partial<Parameters<typeof quickAdd>[0]>): Parameters<typeof quickAdd>[0] => ({
  kind: 'income',
  amount: 40000,
  categoryId: null,
  accountId: acc,
  date: warsawNow().date,
  time: null,
  counterparty: 'Ewa Kowalska',
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
  vi.clearAllMocks()
  ui.useUi.setState({ toasts: [] })
})

describe('D100 w oknie: szybki wpis, import, Radar', () => {
  it('szybki wpis: mama Jana 400 zł „Spłata pożyczki” – pożyczka 600 zł, kto zapłacił: Ewa Kowalska', async () => {
    open()
    // The quick window gets the open loans given with what is left.
    expect(quickData()!.loans).toEqual([{ id: JAN_LOAN, name: 'Pożyczka dla Jana', open: 100000 }])
    await quickAdd(quick({ loanPart: { loanId: JAN_LOAN, amount: 40000 } }))
    expect(api.quickResult.mock.calls.at(-1)![0]).toMatchObject({ ok: true })
    const t = ops().find((x) => x.counterparty === 'Ewa Kowalska')!
    expect(t).toMatchObject({ kind: 'income', amount: 40000, memberId: null })
    expect(t.splits.map((s) => [s.memberId, s.loanId, s.amount])).toEqual([[null, JAN_LOAN, 40000]])
    expect(loanNow()).toMatchObject({ paid: 40000, open: 60000 })
    expect(loanPayers(loanNow(), data.useData.getState().fi!.settings.household.members)).toEqual([{ name: 'Ewa Kowalska', amount: 40000, borrower: false }])
    expect(quickData()!.loans).toEqual([{ id: JAN_LOAN, name: 'Pożyczka dla Jana', open: 60000 }])
  })

  it('szybki wpis: Mama 500 zł, w tym 200 zł spłaty pożyczki – reszta 300 zł spłaca jej zakupy (ma oddać 50 zł)', async () => {
    open()
    await quickAdd(quick({ amount: 50000, counterparty: 'Mama', household: true, memberId: MAMA, loanPart: { loanId: JAN_LOAN, amount: 20000 } }))
    const t = ops().find((x) => x.counterparty === 'Mama')!
    expect(t).toMatchObject({ kind: 'income', amount: 50000, memberId: MAMA })
    expect(t.splits.map((s) => [s.memberId, s.loanId ?? null, s.amount])).toEqual([[null, JAN_LOAN, 20000]])
    expect(fleet.fleetNow()!.receivables.members.find((m) => m.memberId === MAMA)).toMatchObject({ owed: 5000 })
    expect(loanNow()).toMatchObject({ open: 80000 })
    expect(loanPayers(loanNow(), data.useData.getState().fi!.settings.household.members)).toEqual([{ name: 'Mama', amount: 20000, borrower: false }])
  })

  it('szybki wpis odmawia: części ponad kwotę wpłaty, pożyczka zamknięta w międzyczasie (lista okna starsza)', async () => {
    open()
    await quickAdd(quick({ loanPart: { loanId: JAN_LOAN, amount: 50000 } }))
    expect(api.quickResult.mock.calls.at(-1)![0]).toMatchObject({ ok: false, message: 'Spłata pożyczki i części innych osób przekraczają kwotę wpłaty.' })
    open(jan({ closedAt: '2026-10-30T10:00:00.000Z' }))
    expect(quickData()!.loans).toEqual([])
    await quickAdd(quick({ loanPart: { loanId: JAN_LOAN, amount: 40000 } }))
    expect(api.quickResult.mock.calls.at(-1)![0]).toMatchObject({ ok: false, message: 'Lista pożyczek się zmieniła – wybierz pożyczkę ponownie.' })
    expect(ops().some((x) => x.counterparty === 'Ewa Kowalska')).toBe(false)
  })

  it('import: grupa z częścią pożyczki – „zapamiętaj” domyślnie wyłączone, część najwyżej dług; zaznaczone – reguła nazywa pożyczkę', async () => {
    open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [{ date: '2026-10-30', amount: 500, name: 'ANNA NOWAK', title: 'PRZELEW' }, { date: '2026-11-01', amount: 1200, name: 'EWA KOWALSKA', title: 'SPLATA POZYCZKI' }])))
    const mama = groupOf('ANNA NOWAK')
    const ewa = groupOf('EWA KOWALSKA')
    const part = (amount: number) => [{ memberId: '', amount, advance: false, loanId: JAN_LOAN }]
    state.decideGroup(mama.group, { ...mama.proposed, shares: part(20000) })
    // Over the debt (1 000 zł − Mama's 200 zł = 800 zł): the group's part stops there – the rest is income.
    state.decideGroup(ewa.group, { ...(ewa.proposed as Choice), shares: part(120000) })
    expect(state.useImport.getState().choices.remember).toEqual({ [mama.group]: false, [ewa.group]: false })
    const view = state.sharesView(state.useImport.getState().plan, state.useImport.getState().choices, fleet.fleetNow()!.household, data.useData.getState().fi!.settings.household.members, fleet.fleetNow()!.loans)!
    expect(view.owed.get(loanKey(JAN_LOAN))).toBe(100000)
    state.setRemember(mama.group, true)
    await state.runImport()
    const byName = (name: string) => ops().find((t) => t.counterparty === name && t.bank)!
    expect(byName('ANNA NOWAK').splits.map((s) => [s.loanId, s.amount])).toEqual([[JAN_LOAN, 20000]])
    expect(byName('EWA KOWALSKA').splits.map((s) => [s.loanId, s.amount])).toEqual([[JAN_LOAN, 80000]])
    expect(loanNow()).toMatchObject({ paid: 100000, open: 0 })
    const rules = data.useData.getState().fi!.settings.import.rules
    // Only the one ticked – the starter rules aside.
    expect(rules.filter((r) => r.loanId).map((r) => [r.label, r.kind, r.household, r.memberId, r.loanId, r.loanAmount])).toEqual([['ANNA NOWAK', 'income', true, MAMA, JAN_LOAN, 20000]])
  })

  it('decyzja zbiorcza innego rodzaju nie zabiera części pożyczki (AP-6) – tylko spłata całością tej pożyczki; bez części – jak dotąd', () => {
    const mamaMoney: Choice = { kind: 'income', categoryId: null, refundable: false, household: true, memberId: MAMA, advance: false, inflowKind: 'repay', counterAccountId: null }
    const part: Choice = { ...mamaMoney, shares: [{ memberId: '', amount: 20000, advance: false, loanId: JAN_LOAN }] }
    expect([options.bulkKeeps('income', part), options.bulkKeeps(`household:${MAMA}:income`, part), options.bulkKeeps(`loan:${JAN_LOAN}`, part), options.bulkKeeps(`household:${MAMA}:income`, mamaMoney)]).toEqual([true, true, false, false])
    // „+ domownik” never at a loan's repayment (AF-62).
    const plainPart: Choice = { ...part, household: false, memberId: null }
    const g = { direction: 'in' as const, rows: [{ row: { operation: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY' } }], names: ['EWA KOWALSKA'], label: 'EWA KOWALSKA' } as unknown as Parameters<typeof options.offersNewMember>[0]
    expect([options.offersNewMember(g, { ...plainPart, shares: undefined }, [], []), options.offersNewMember(g, plainPart, [], [])]).toEqual([true, false])
  })

  it('Radar: pożyczki z częścią wpłaty nie usuwa się (byłaby przychodem) – „zamknij” zamiast „usuń”', async () => {
    const part = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01KN2RPART0000000000000001', createdAt: AT, updatedAt: AT, date: '2026-10-10', accountId: MBANK_ACCOUNT_ID, kind: 'income', amount: 40000, counterparty: 'EWA KOWALSKA', splits: [{ id: '01KN2RPRT20000000000000001', amount: 40000, categoryId: null, refundable: false, memberId: null, advance: false, loanId: JAN_LOAN, note: '' }] })
    open(jan(), [part])
    // Only the inflow's part ties it (the loan's own operation aside).
    data.useData.setState((s) => {
      const transactions = { ...s.records.transactions }
      delete transactions['01KN2RGAVE0000000000000001']
      return { records: { ...s.records, transactions } }
    })
    await radar.deleteLoan(jan())
    expect(api.deleteRecord).not.toHaveBeenCalled()
    expect(ui.useUi.getState().toasts.at(-1)).toMatchObject({ text: 'Ta pożyczka ma operacje – zamknij ją zamiast usuwać.' })
  })
})
