import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { latestImport } from '@shared/import/batch'
import type { MbankFile, MbankRow } from '@shared/import/mbank'
import { buildImport, importGroups, importThemes, planImport, type Choice, type ImportChoices, type ImportPlan } from '@shared/import/reconcile'
import { COLLECTIONS } from '@shared/paths'
import { defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type SettingsFile, type Transaction } from '@shared/schema'
import { listaCsv, type CsvBuy, type CsvTransfer } from '../e2e/mbank-csv'

// The second code review of N1 (1.15.5): its findings in the window's import (renderer's stores), each with the scenario
// that failed before the fix. The stores talk to the main process through window.fi (preload): a mock writing nothing.
const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, records: Array<{ id: string }>) => records.map((record) => ({ id: record.id, entry: { record, relPath: `${record.id}.json`, readOnly: false } }))),
  saveSettings: vi.fn(async (f: SettingsFile) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: readonly string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined),
  historyList: vi.fn(async (): Promise<unknown[]> => []),
  historyDeleted: vi.fn(async (): Promise<unknown[]> => []),
  importBackup: vi.fn(async () => 'C:\\dane\\backups\\pre-import\\2026-11-04.zip'),
  folderShown: vi.fn(async () => undefined)
}
const stored = new Map<string, string>()
vi.stubGlobal('window', { fi: api })
vi.stubGlobal('localStorage', {
  getItem: (k: string) => stored.get(k) ?? null,
  setItem: (k: string, v: string) => void stored.set(k, String(v)),
  removeItem: (k: string) => void stored.delete(k)
})
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const fleet = await import('../../src/renderer/store/fleet')
const state = await import('../../src/renderer/features/import/state')
const batches = await import('../../src/renderer/features/import/batches')
const returned = await import('../../src/renderer/features/import/returned')

const AT = '2026-09-01T10:00:00.000Z'
const bytes = (text: string) => new TextEncoder().encode(text)
let folder = 0
/** A new folder: its settings as `patch` makes them, its operations. */
function open(over: { dir?: string; transactions?: Transaction[]; patch?: (s: SettingsFile['settings']) => SettingsFile['settings'] } = {}): string {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = (over.transactions ?? []).map((record) => ({ record, relPath: `transactions/${record.id}.json`, readOnly: false }))
  const dataDir = over.dir ?? `/dane-r2-${++folder}`
  const status: FolderStatus = { dataDir, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  data.applySnapshot({ fi: { ...fi, settings: (over.patch ?? ((s) => s))(fi.settings) }, records, problems: [], conflicts: [], status, loadMs: 0 })
  return dataDir
}
const operations = () => data.listOf(data.useData.getState().records.transactions)
const withImports = (lastImport: Record<string, string>) => (s: SettingsFile['settings']) => ({ ...s, import: { ...s.import, lastImport } })

beforeEach(() => {
  vi.clearAllMocks()
  api.historyDeleted.mockImplementation(async () => [])
  ui.useUi.setState({ toasts: [] })
})

describe('przegląd N1 2, 1: „Cofnij” cofnięcia importu usuwa jego operacje znowu jako usunięte przez import (T331)', () => {
  const PERIOD = { from: '2026-10-19', to: '2026-10-26' }
  const BUYS: CsvBuy[] = [
    { date: '2026-10-20', amount: 87.91, name: 'SLUSARZ KOWAL' },
    { date: '2026-10-25', amount: 31.95, name: 'ZABKA Z1234' }
  ]

  it('nierozliczona usunięta przez import, przywrócona przez „Cofnij import”, usunięta znowu przez „Cofnij” – z powodem „import”', async () => {
    open()
    // Import 1 brings a pending purchase; import 2 (the bank no longer shows it) removes it – as the import's own.
    await state.loadImportFile('lista.csv', bytes(listaCsv([...BUYS, { date: '2026-10-26', amount: 5, name: 'KIOSK RUCH', pending: true }], PERIOD)))
    await state.runImport()
    const kiosk = operations().find((t) => t.counterparty === 'KIOSK RUCH')!
    await state.loadImportFile('lista-2.csv', bytes(listaCsv(BUYS, { from: '2026-10-19', to: '2026-10-27' })))
    state.setRemoveVanished(kiosk.id, true)
    await state.runImport()
    expect(api.deleteRecords).toHaveBeenLastCalledWith('transactions', [kiosk.id], 'import')
    // „Cofnij import”: the pending one back.
    const batch = latestImport(data.listOf(data.useData.getState().records.imports))!
    expect(await batches.undoImport(batch.id)).toBe(true)
    expect(operations().some((t) => t.id === kiosk.id)).toBe(true)
    // „Cofnij” in its toast: the import as it was – the pending one removed again by the import, not by the user (before:
    // the default reason – after the batch rotated out, a deletion of the user's hiding the bank's booked row).
    const redo = ui.useUi.getState().toasts.find((t) => t.action?.label === 'Cofnij')!
    redo.action!.run()
    await vi.waitFor(() => expect(ui.useUi.getState().toasts.map((t) => t.text)).toContain('Import znowu w budżecie.'))
    expect(operations().some((t) => t.id === kiosk.id)).toBe(false)
    expect(api.deleteRecords).toHaveBeenLastCalledWith('transactions', [kiosk.id], 'import')
  })
})

describe('przegląd N1 2, 5: temat z decyzją swoich marek pokazuje „w tym za” marek razem – zmiana tam nie zmienia sumy', () => {
  const TATA = '01KN2STATA0000000000000001'
  const BABCIA = '01KN2SBABC0000000000000002'
  const LEKI = '01KN2SAPTK0000000000000003'
  const PERIOD = { from: '2026-10-26', to: '2026-11-02' }
  const person = (id: string, name: string, over: object = {}) => ({ id, name, bankNames: [] as string[], inflow: 'advance' as const, archived: false, via: null as string | null, opening: { owed: 0, deposit: 0 }, ...over })
  /** Babcia owes 300 zł for „Leki” and passes her money through Tata. */
  function openFamily(): void {
    const leki = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: LEKI, createdAt: AT, updatedAt: AT, date: '2026-10-20', accountId: MBANK_ACCOUNT_ID, amount: -30000, categoryId: defaultCategoryId(5, 0), refundable: true, memberId: BABCIA, counterparty: 'Apteka' })
    open({
      transactions: [leki],
      patch: (s) => ({ ...s, household: { ...s.household, since: null, assignFrom: null, members: [...s.household.members, person(TATA, 'Tata', { bankNames: ['PIOTR TESTOWY'] }), person(BABCIA, 'Babcia', { via: TATA })] } })
    })
  }
  const groups = () => importGroups(state.useImport.getState().plan, state.useImport.getState().choices.restoreDeleted)
  const groupOf = (name: string) => groups().find((g) => g.label === name || g.names.includes(name))!
  const view = () => {
    const s = state.useImport.getState()
    return state.sharesView(s.plan, s.choices, fleet.fleetNow()?.household ?? null, data.useData.getState().fi!.settings.household.members)!
  }

  it('dwie marki po „w tym za Babcia 100 zł”: temat pokazuje 200 zł; zmiana w temacie – Babcia dalej dostaje razem 200 zł', async () => {
    openFamily()
    // Tata's money under two of his names in the bank: two brands of one theme.
    const TATA_IN: CsvTransfer[] = [
      { date: '2026-10-29', amount: 200, name: 'PIOTR TESTOWY', title: 'ZWROT' },
      { date: '2026-11-01', amount: 300, name: 'PIOTR TESTOWY', title: 'OD TATY I BABCI' },
      { date: '2026-10-30', amount: 150, name: 'TESTOWY PIOTR', title: 'NA ZAKUPY' }
    ]
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, TATA_IN)))
    const big = groupOf('PIOTR TESTOWY')
    const small = groupOf('TESTOWY PIOTR')
    expect(small.theme).toBe(big.theme)
    const theme = () => importThemes(groups()).find((t) => t.theme === big.theme)!
    const shares = [{ memberId: BABCIA, amount: 10000, advance: true }]
    state.decideGroup(big.group, { ...big.proposed, shares })
    state.decideGroup(small.group, { ...small.proposed, shares })
    expect(state.themeShows(theme(), state.useImport.getState().choices)).toBe('same')
    expect(view().total.get(BABCIA)).toBe(20000)
    // The theme's row shows the brands' decision with their lines together: 200 zł, as its spread says it typed.
    const shown = state.themeCommon(theme(), state.useImport.getState().choices)!
    expect(shown.shares).toEqual([{ memberId: BABCIA, amount: 20000, advance: true }])
    const keys = state.themeSharesFrom(theme(), 'same')
    expect([...state.decisionSpread(view(), keys, shown)].map(([line, l]) => [line, l.typed])).toEqual([[0, 20000]])
    // Any change there makes the theme's decision of what it shows (before: of one brand's 100 zł – Babcia's half lost).
    state.chooseThemeOverGroups(theme(), { ...shown, advance: false })
    expect(state.themeShows(theme(), state.useImport.getState().choices)).toBe('theme')
    expect(view().total.get(BABCIA)).toBe(20000)
  })

  it('jedna marka albo bez „w tym za”: decyzja marki jak jest; temat ze swoją decyzją, marki różne albo nie wszystkie – żadna', () => {
    type Theme = Parameters<typeof state.themeCommon>[0]
    const c: Choice = { kind: 'income', categoryId: null, refundable: false, household: true, memberId: TATA, advance: true, counterAccountId: null }
    const one = { ...c, shares: [{ memberId: BABCIA, amount: 10000, advance: true }, { memberId: TATA, amount: 5000, advance: true }] }
    const single = { theme: 'x', groups: [{ group: 'a' }] } as unknown as Theme
    const two = { theme: 'x', groups: [{ group: 'a' }, { group: 'b' }] } as unknown as Theme
    expect(state.themeCommon(single, { themes: {}, groups: { a: one } })).toBe(one)
    expect(state.themeCommon(two, { themes: {}, groups: { a: c, b: { ...c } } })).toBe(c)
    // Two brands: the other members' lines together, the sender's own line as it is (it never spreads).
    expect(state.themeCommon(two, { themes: {}, groups: { a: one, b: { ...one } } })?.shares).toEqual([
      { memberId: BABCIA, amount: 20000, advance: true },
      { memberId: TATA, amount: 5000, advance: true }
    ])
    expect(state.themeCommon(two, { themes: { x: c }, groups: { a: c, b: c } })).toBeUndefined()
    expect(state.themeCommon(two, { themes: {}, groups: { a: c } })).toBeUndefined()
    expect(state.themeCommon(two, { themes: {}, groups: { a: c, b: { ...c, advance: false } } })).toBeUndefined()
  })
})

describe('przegląd N1 2, 9: usunięte czytane po otwarciu folderu, gdy zmienił się którykolwiek import – bez porównywania zegarów komputerów', () => {
  const A = '2026-11-04T12:00:00.000Z'
  /** Another computer's import, its clock 10 minutes behind: after this computer's check, its time earlier. */
  const B = '2026-11-04T11:55:00.000Z'
  const due = (dir: string) => returned.deletedReadDue(dir, returned.importsMark(data.useData.getState().fi))

  it('import drugiego komputera z zegarem do tyłu – na innym koncie albo na tym samym: czytane', async () => {
    const dir = open({ patch: withImports({ [MBANK_ACCOUNT_ID]: A }) })
    expect(due(dir)).toBe(true)
    await returned.readDeletedBank()
    expect(due(dir)).toBe(false)
    // Before: its time not later than the newest one checked – never read at the opening.
    open({ dir, patch: withImports({ [MBANK_ACCOUNT_ID]: A, [XTB_WALLET_ACCOUNT_ID]: B }) })
    expect(due(dir)).toBe(true)
    await returned.readDeletedBank()
    expect(due(dir)).toBe(false)
    open({ dir, patch: withImports({ [MBANK_ACCOUNT_ID]: B, [XTB_WALLET_ACCOUNT_ID]: B }) })
    expect(due(dir)).toBe(true)
  })

  it('import tego komputera przesuwa sprawdzenie o swój import – import drugiego komputera z wcześniejszą godziną dalej czytany', async () => {
    const dir = open()
    const PERIOD = { from: '2026-10-19', to: '2026-10-26' }
    await state.loadImportFile('lista.csv', bytes(listaCsv([{ date: '2026-10-20', amount: 87.91, name: 'SLUSARZ KOWAL' }], PERIOD)))
    await state.runImport()
    expect(due(dir)).toBe(false)
    // The other computer's import on the wallet, stamped before this one's (its clock behind): read at the next opening.
    const mine = data.useData.getState().fi!.settings.import.lastImport
    open({ dir, transactions: operations(), patch: withImports({ ...mine, [XTB_WALLET_ACCOUNT_ID]: '2026-01-02T00:00:00.000Z' }) })
    expect(due(dir)).toBe(true)
  })

  it('zapamiętany stan w starszej postaci (sam czas) – czytane jak bez sprawdzenia', () => {
    const dir = open({ patch: withImports({ [MBANK_ACCOUNT_ID]: A }) })
    stored.set(`fi.returned.checked:${dir}`, A)
    expect(due(dir)).toBe(true)
  })
})

describe('przegląd N1 2, 10: podpis planu (B38) obejmuje to, czy kopia ma inną decyzję i czy spłaca zakupy', () => {
  const MAMA = '01KN2SMAMA0000000000000004'
  const mama = { id: MAMA, name: 'Mama', bankNames: ['ANNA MAMA'], inflow: 'income' as const, archived: false }
  const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
  const family = { rules: [], ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings.categories), loans: [], members: [...settings.household.members, mama] }
  const PERIOD = { from: '2026-10-19', to: '2026-10-26' }
  const IN = 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY'
  const row = (format: MbankFile['format']): MbankRow => ({
    line: 1,
    date: '2026-10-22',
    description: format === 'lista' ? `ANNA MAMA, ZA ZAKUPY  ${IN}` : `${IN} ANNA MAMA ZA ZAKUPY`,
    operation: IN,
    counterparty: 'ANNA MAMA',
    title: 'ZA ZAKUPY',
    accountNo: '',
    category: '',
    amount: 10000,
    pending: false,
    balanceAfter: null
  })
  const fromMama = (format: MbankFile['format']): MbankFile => ({ format, client: 'JAN KAPITAN', account: null, period: PERIOD, rows: [row(format)], skipped: [] })
  const choices: ImportChoices = { themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} }
  let seq = 0
  const makeId = () => `01KN2S${String(++seq).padStart(20, '0')}`
  const buy = (date: string, amount: number, counterparty: string) =>
    transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: defaultCategoryId(1, 1), refundable: true, memberId: MAMA, counterparty })
  const apply = (plan: ImportPlan, existing: readonly Transaction[], now: string) => {
    const result = buildImport(plan, choices, { now, makeId, rules: [] })
    const byId = new Map(existing.map((t) => [t.id, t]))
    for (const t of [...result.update, ...result.create]) byId.set(t.id, t)
    for (const id of result.remove) byId.delete(id)
    return [...byId.values()]
  }

  it('operacja tutaj dostała własne zakupy (albo inną decyzję) po podglądzie: inny podpis – import staje „sprawdź podgląd”', () => {
    const lidl = buy('2026-10-10', -6000, 'Lidl')
    const rossmann = buy('2026-10-12', -4000, 'Rossmann')
    // Mama's transfer imported onto the wallet by mistake (its copy pays back Lidl), then here in the other format.
    const wrong = apply(planImport(fromMama('lista'), XTB_WALLET_ACCOUNT_ID, [lidl, rossmann], family), [lidl, rossmann], '2026-10-27T10:00:00.000Z').map((t) =>
      t.accountId === XTB_WALLET_ACCOUNT_ID ? { ...t, covers: [lidl.id] } : t
    )
    const both = apply(planImport(fromMama('historia'), MBANK_ACCOUNT_ID, wrong, family), wrong, '2026-10-28T10:00:00.000Z')
    const here = (over: Partial<Transaction>) => both.map((t) => (t.accountId === MBANK_ACCOUNT_ID && t.kind === 'income' ? { ...t, ...over } : t))
    const shown = planImport(fromMama('lista'), MBANK_ACCOUNT_ID, both, family)
    const copy = (plan: ImportPlan) => (plan.rows[0]!.status === 'known' ? plan.rows[0]!.copy : undefined)
    expect(copy(shown)).toMatchObject({ remove: true, otherCovers: false, conflict: false })
    // Meanwhile (Operacje, the other computer) the operation here names its own purchase: the copy is not removed now.
    const named = planImport(fromMama('lista'), MBANK_ACCOUNT_ID, here({ covers: [rossmann.id] }), family)
    expect(copy(named)).toMatchObject({ remove: false, otherCovers: true })
    expect(state.planSignature(named)).not.toBe(state.planSignature(shown))
    // … or decides otherwise (plain income): the same.
    const other = planImport(fromMama('lista'), MBANK_ACCOUNT_ID, here({ memberId: null }), family)
    expect(copy(other)).toMatchObject({ remove: false, conflict: true })
    expect(state.planSignature(other)).not.toBe(state.planSignature(shown))
  })
})
