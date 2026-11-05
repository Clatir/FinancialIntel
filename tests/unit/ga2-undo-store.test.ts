import { describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { findDuplicates } from '@shared/import/duplicates'
import { accountNumberOf, type MbankFile, type MbankRow } from '@shared/import/mbank'
import { importGroups, planImport } from '@shared/import/reconcile'
import { categoryIndex } from '@shared/calc/operations'
import { COLLECTIONS } from '@shared/paths'
import { SCHEMAS } from '@shared/records'
import {
  containerSchema,
  defaultCategoryId,
  HOUSE_MEMBER_ID,
  loanSchema,
  MBANK_ACCOUNT_ID,
  SCHEMA_VERSION,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
  type Container,
  type Loan,
  type MonthPlan,
  type Scheduled,
  type Transaction
} from '@shared/schema'

const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: unknown[]) => rs.map((r) => ({ ok: true, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(async () => ({ ok: true as const })),
  deleteRecords: vi.fn(async (_c: string, ids: string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined),
  importBackup: vi.fn(async () => ''),
  unlockReadOnlyFiles: vi.fn(async () => 0),
  rescan: vi.fn(async () => null)
}
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: api })

const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const cargo = await import('../../src/renderer/features/cargo/actions')
const radar = await import('../../src/renderer/features/radar/actions')
const scheduled = await import('../../src/renderer/features/radar/scheduled')
const cats = await import('../../src/renderer/features/settings/categories')
const ops = await import('../../src/renderer/features/operations/state')
const impState = await import('../../src/renderer/features/import/state')
const { loanState } = await import('@shared/calc/loans')

const AT = '2026-10-15T10:00:00.000Z'
let seq = 0
const nextId = () => `01KGA2${String(++seq).padStart(20, '0')}`

function openStore(opts: {
  transactions?: Transaction[]
  containers?: Container[]
  loans?: Loan[]
  scheduled?: Scheduled[]
  months?: MonthPlan[]
  accountNumbers?: Record<string, string>
} = {}): void {
  const fi = createDefaultSettings(AT)
  if (opts.accountNumbers) fi.settings.import.accountNumbers = { ...opts.accountNumbers }
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = (opts.transactions ?? []).map((r) => ({ record: r, relPath: `transactions/${r.id}.json`, readOnly: false }))
  records.containers = (opts.containers ?? []).map((r) => ({ record: r, relPath: `containers/${r.id}.json`, readOnly: false }))
  records.loans = (opts.loans ?? []).map((r) => ({ record: r, relPath: `loans/${r.id}.json`, readOnly: false }))
  records.scheduled = (opts.scheduled ?? []).map((r) => ({ record: r, relPath: `scheduled/${r.id}.json`, readOnly: false }))
  records.months = (opts.months ?? []).map((r) => ({ record: r, relPath: `months/${r.id}.json`, readOnly: false }))
  data.applySnapshot({
    fi,
    records,
    problems: [],
    conflicts: [],
    status: {
      dataDir: '/dane',
      available: true,
      readOnly: false,
      readOnlyReason: null,
      folderSchemaVersion: 1,
      appSchemaVersion: 1,
      otherMachines: [],
      migratedFrom: null,
      backupPath: null
    },
    loadMs: 0
  })
  ui.useUi.setState({ toasts: [] })
}

const lastToast = () => ui.useUi.getState().toasts.at(-1)!
const lastUndo = () => {
  const t = [...ui.useUi.getState().toasts].reverse().find((x) => x.action?.label === 'Cofnij')
  expect(t).toBeDefined()
  return t!.action!.run
}

describe('T501 – „Cofnij” poza regułami i domownikami nie nadpisuje zmian zrobionych w międzyczasie', () => {
  const FOOD = defaultCategoryId(1, 1)
  const HOME = defaultCategoryId(2, 1)

  it('cargo/actions: updatePrice, archiveContainer, payContainer, clearPast, settleDue odmawiają nadpisania zmienionego wpisu', () => {
    const c = containerSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: nextId(),
      createdAt: AT,
      updatedAt: AT,
      name: 'Prąd',
      amount: 15000,
      cycleMonths: 1,
      dueMonth: '2026-10',
      amountAt: AT
    })
    openStore({ containers: [c] })

    // 1. updatePrice modified before undo
    cargo.updatePrice(c, 20000)
    const undoPrice = lastUndo()
    cargo.patchContainer(c.id, { name: 'Prąd zmieniony' })
    undoPrice()
    expect(data.useData.getState().records.containers[c.id]!.record.name).toBe('Prąd zmieniony')
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // 2. archiveContainer modified before undo
    openStore({ containers: [c] })
    cargo.archiveContainer(c, true)
    const undoArchive = lastUndo()
    cargo.patchContainer(c.id, { amount: 25000 })
    undoArchive()
    expect(data.useData.getState().records.containers[c.id]!.record.archived).toBe(true)
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // 3. payContainer modified before undo
    openStore({ containers: [c] })
    const txId = cargo.payContainer(c, 15000)!
    const undoPay = lastUndo()
    data.updateRecord('transactions', txId, (t) => ({ ...t, amount: -18000 }))
    undoPay()
    expect(data.useData.getState().records.transactions[txId]?.record.amount).toBe(-18000)
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // 4. clearPast modified before undo
    const cWithPast = { ...c, past: [{ until: '2026-09-15', amount: 12000 }] }
    openStore({ containers: [cWithPast] })
    cargo.clearPast(cWithPast)
    const undoClear = lastUndo()
    cargo.patchContainer(c.id, { name: 'Prąd 2' })
    undoClear()
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // 5. settleDue modified before undo
    openStore({ containers: [c] })
    cargo.settleDue(c, '2026-10-15')
    const undoSettle = lastUndo()
    cargo.patchContainer(c.id, { name: 'Prąd 3' })
    undoSettle()
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')
  })

  it('radar/actions: closeLoan, recordPayment, ensureLoanContainer, planTransfer odmawiają nadpisania zmienionego wpisu', () => {
    const l = loanSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: nextId(),
      createdAt: AT,
      updatedAt: AT,
      date: '2026-10-15',
      direction: 'given',
      name: 'Pożyczka dla Marka',
      counterparty: 'Marek',
      amount: 50000,
      total: 50000,
      installments: 1,
      firstDue: '2026-10-20',
      accountId: MBANK_ACCOUNT_ID
    })
    openStore({ loans: [l] })

    // closeLoan modified before undo
    radar.closeLoan(l, true)
    const undoClose = lastUndo()
    data.updateRecord('loans', l.id, (r) => ({ ...r, note: 'inna notatka' }))
    undoClose()
    expect(data.useData.getState().records.loans[l.id]!.record.closedAt).not.toBeNull()
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // recordPayment modified before undo
    openStore({ loans: [l] })
    const st = loanState(l, [], [], '2026-10-15')
    radar.recordPayment(st, 10000, '2026-10-15')
    const undoPayment = lastUndo()
    const payTxId = Object.keys(data.useData.getState().records.transactions)[0]!
    data.updateRecord('transactions', payTxId, (t) => ({ ...t, amount: 20000 }))
    undoPayment()
    expect(data.useData.getState().records.transactions[payTxId]?.record.amount).toBe(20000)
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // ensureLoanContainer modified before undo
    const takenLoan = loanSchema.parse({
      ...l,
      id: nextId(),
      direction: 'taken',
      name: 'Kredyt',
      installments: 5,
      total: 100000
    })
    openStore({ loans: [takenLoan] })
    radar.ensureLoanContainer(loanState(takenLoan, [], [], '2026-10-15'))
    const undoEnsure = lastUndo()
    const cId = Object.keys(data.useData.getState().records.containers)[0]!
    cargo.patchContainer(cId, { name: 'Zmieniony kredyt' })
    undoEnsure()
    expect(data.useData.getState().records.containers[cId]!.record.name).toBe('Zmieniony kredyt')
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // planTransfer modified before undo
    openStore()
    radar.planTransfer({
      accountId: MBANK_ACCOUNT_ID,
      name: 'mBank',
      balance: 0,
      low: { date: '2026-10-20', amount: -10000 },
      short: { date: '2026-10-20', amount: -10000, cause: 'Czynsz' },
      source: { accountId: XTB_WALLET_ACCOUNT_ID, name: 'Portfel XTB' },
      moves: []
    })
    const undoTransfer = lastUndo()
    const transferId = Object.keys(data.useData.getState().records.transactions)[0]!
    data.updateRecord('transactions', transferId, (t) => ({ ...t, amount: -15000 }))
    undoTransfer()
    expect(data.useData.getState().records.transactions[transferId]?.record.amount).toBe(-15000)
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')
  })

  it('radar/scheduled: addScheduled, tickDay i executeDay odmawiają nadpisania zmienionego wpisu', () => {
    openStore()
    const s = scheduled.addScheduled({
      name: 'Internet',
      direction: 'out',
      amount: 7900,
      accountId: MBANK_ACCOUNT_ID,
      categoryId: FOOD,
      counterparty: 'UPC',
      date: '2026-10-10',
      yearly: false,
      note: '',
      remind: []
    })!
    const undoAdd = lastUndo()
    scheduled.patchScheduled(s.id, { name: 'Internet światłowód' })
    undoAdd()
    expect(data.useData.getState().records.scheduled[s.id]!.record.name).toBe('Internet światłowód')
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // tickDay modified before undo
    scheduled.tickDay(data.useData.getState().records.scheduled[s.id]!.record, '2026-10-10')
    const undoTick = lastUndo()
    scheduled.patchScheduled(s.id, { note: 'inna zmiana' })
    undoTick()
    expect(data.useData.getState().records.scheduled[s.id]!.record.done['2026-10-10']).toBe('')
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // executeDay modified before undo
    const tx = scheduled.executeDay(data.useData.getState().records.scheduled[s.id]!.record, '2026-11-10')!
    const undoExec = lastUndo()
    data.updateRecord('transactions', tx.id, (t) => ({ ...t, note: 'zapłacone ręcznie' }))
    undoExec()
    expect(data.useData.getState().records.transactions[tx.id]?.record.note).toBe('zapłacone ręcznie')
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')
  })

  it('settings/categories i operations/state: archiveMain, deleteCategory, changeKind, deleteView, categorizeTicked odmawiają nadpisania zmian', () => {
    const m = SCHEMAS.months.parse({
      schemaVersion: SCHEMA_VERSION,
      id: nextId(),
      month: '2026-10',
      salary: 1000000,
      createdAt: AT,
      updatedAt: AT,
      envelopes: { [defaultCategoryId(1)]: 50000 }
    }) as MonthPlan
    openStore({ months: [m] })
    const mainCat = data.useData.getState().fi!.settings.categories.find((c) => c.id === defaultCategoryId(1))!

    // 1. archiveMain modified before undo
    cats.archiveMain(mainCat)
    const undoArchiveMain = lastUndo()
    cats.patchCategory(mainCat.id, { name: 'Żywność zmieniona' })
    undoArchiveMain()
    expect(data.useData.getState().fi!.settings.categories.find((c) => c.id === mainCat.id)!.archived).toBe(true)
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // 2. deleteCategory when same name added in the meantime
    const subId = cats.addSubcategory(defaultCategoryId(2), 'Warsztat')!
    expect(cats.deleteCategory(subId)).toBe(true)
    const undoDelCat = lastUndo()
    cats.addSubcategory(defaultCategoryId(2), 'Warsztat')
    undoDelCat()
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // 3. deleteView when same view name added in the meantime
    ops.saveCurrentView('Mój widok')
    const viewId = data.useData.getState().fi!.settings.operationViews[0]!.id
    ops.deleteView(viewId)
    const undoView = lastUndo()
    ops.saveCurrentView('Mój widok')
    undoView()
    expect(data.useData.getState().fi!.settings.operationViews).toHaveLength(1)
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // 4. changeKind when kind changed again in the meantime
    const c = containerSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: nextId(),
      createdAt: AT,
      updatedAt: AT,
      name: 'Gaz',
      amount: 10000,
      cycleMonths: 1,
      dueMonth: '2026-10',
      amountAt: AT
    })
    const tx = transactionSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: nextId(),
      createdAt: AT,
      updatedAt: AT,
      date: '2026-10-12',
      accountId: MBANK_ACCOUNT_ID,
      kind: 'expense',
      amount: -10000,
      containerId: c.id,
      counterparty: 'PGNiG'
    })
    openStore({ containers: [c], transactions: [tx] })
    ops.changeKind(tx.id, 'transfer', false)
    const undoKind = lastUndo()
    data.updateRecord('transactions', tx.id, (r) => ({ ...r, kind: 'income', amount: 10000 }))
    undoKind()
    expect(data.useData.getState().records.transactions[tx.id]!.record.kind).toBe('income')
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')

    // 5. categorizeTicked single item modified in the meantime
    ops.tickOperations([tx.id], true)
    data.updateRecord('transactions', tx.id, (r) => ({ ...r, kind: 'expense', amount: -10000, categoryId: null }))
    ops.categorizeTicked([tx.id], FOOD, 'none', 'Jedzenie')
    const undoCat = lastUndo()
    data.updateRecord('transactions', tx.id, (r) => ({ ...r, categoryId: HOME }))
    undoCat()
    expect(data.useData.getState().records.transactions[tx.id]!.record.categoryId).toBe(HOME)
    expect(lastToast().text).toBe('Nie cofnięto – wpis został w międzyczasie zmieniony.')
  })
})

describe('T502 – czyszczenie błędnego accountNumbers i duplikaty między kontami bez importu naprawczego', () => {
  const NUMBER = 'eKonto - 12 1140 2004 0000 3102 0000 0001'
  const NUM = accountNumberOf(NUMBER)!

  it('czyści błędnie zapamiętany numer rachunku ze złego konta, gdy nie ma już na nim zaimportowanych operacji', () => {
    const bankTx = transactionSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: nextId(),
      createdAt: AT,
      updatedAt: AT,
      date: '2026-10-15',
      accountId: MBANK_ACCOUNT_ID,
      kind: 'expense',
      amount: -3500,
      counterparty: 'LIDL',
      bank: {
        format: 'mbank',
        source: 'lista',
        key: 'mbank:lidl:0',
        description: 'LIDL',
        counterparty: 'LIDL',
        operation: 'ZAKUP PRZY UŻYCIU KARTY W KRAJU',
        category: '',
        pending: false,
        importedAt: AT
      }
    })
    // WALLET had NUM remembered from a mistaken import, but all its imported transactions were moved to MBANK or deleted
    const cleaned = impState.pruneStaleAccountNumbers(
      { [XTB_WALLET_ACCOUNT_ID]: NUM },
      [bankTx],
      MBANK_ACCOUNT_ID,
      NUM
    )
    expect(cleaned).toEqual({ [MBANK_ACCOUNT_ID]: NUM })
  })

  it('findDuplicates paruje operacje z listy na jednym koncie i historii na drugim koncie (bez przelewów własnych i różnych rachunków)', () => {
    const onMbankHistoria = transactionSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: nextId(),
      createdAt: AT,
      updatedAt: AT,
      date: '2026-10-15',
      accountId: MBANK_ACCOUNT_ID,
      kind: 'expense',
      amount: -4560,
      counterparty: 'BIEDRONKA 1234',
      bank: {
        format: 'mbank',
        source: 'historia',
        key: 'mbank:hist:0',
        description: 'ZAKUP PRZY UŻYCIU KARTY BIEDRONKA 1234',
        counterparty: 'BIEDRONKA 1234',
        operation: 'ZAKUP PRZY UŻYCIU KARTY',
        category: '',
        pending: false,
        importedAt: AT
      }
    })
    const onWalletLista = transactionSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: nextId(),
      createdAt: AT,
      updatedAt: '2026-10-16T10:00:00.000Z',
      date: '2026-10-15',
      accountId: XTB_WALLET_ACCOUNT_ID,
      kind: 'expense',
      amount: -4560,
      counterparty: 'BIEDRONKA 1234',
      bank: {
        format: 'mbank',
        source: 'lista',
        key: 'mbank:lista:0',
        description: 'BIEDRONKA 1234  ZAKUP PRZY UŻYCIU KARTY W KRAJU',
        counterparty: 'BIEDRONKA 1234',
        operation: 'ZAKUP PRZY UŻYCIU KARTY W KRAJU',
        category: '',
        pending: false,
        importedAt: '2026-10-16T10:00:00.000Z'
      }
    })

    // Cross-account lista vs historia is paired in findDuplicates!
    const groups = findDuplicates([onMbankHistoria, onWalletLista], [])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ kind: 'bank-format' })

    // When the two accounts have different known bank account numbers, they are NOT paired
    expect(
      findDuplicates([onMbankHistoria, onWalletLista], [], {}, {
        [MBANK_ACCOUNT_ID]: NUM,
        [XTB_WALLET_ACCOUNT_ID]: '22222222222222222222222222'
      })
    ).toEqual([])

    // When either operation is a self-transfer, they are NOT paired across accounts
    const asTransfer = { ...onWalletLista, kind: 'transfer' as const, counterAccountId: MBANK_ACCOUNT_ID }
    expect(findDuplicates([onMbankHistoria, asTransfer], [])).toEqual([])
  })
})

describe('T503 – zbiorcza decyzja dla tej samej osoby w imporcie zachowuje linie „w tym za”', () => {
  it('chooseSelected zachowuje istniejące shares (linie „w tym za” i spłatę pożyczki) dla grupy i pojedynczego wiersza tej samej osoby', () => {
    const fi = createDefaultSettings(AT)
    const row1: MbankRow = {
      line: 1,
      date: '2026-10-20',
      description: 'ANNA TESTOWA PRZELEW',
      operation: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY',
      counterparty: 'ANNA TESTOWA',
      title: 'Zwrot i zaliczka',
      accountNo: '',
      category: '',
      amount: 50000,
      pending: false,
      balanceAfter: null
    }
    const row2: MbankRow = {
      ...row1,
      line: 2,
      counterparty: 'INNY PODMIOT',
      title: 'Inny przelew',
      amount: 40000
    }
    const file: MbankFile = {
      format: 'lista',
      client: 'KAPITAN',
      account: '11111111111111111111111111',
      period: null,
      rows: [row1, row2],
      skipped: []
    }

    const plan = planImport(file, MBANK_ACCOUNT_ID, [], {
      accountNumbers: {},
      categories: categoryIndex(fi.settings.categories),
      containers: [],
      loans: [],
      rules: [],
      aliases: {},
      members: fi.settings.household.members,
      ownNames: [],
      locked: new Set(),
      docked: new Set()
    })

    const groups = importGroups(plan)
    const g1 = groups[0]!
    const r2Key = plan.rows[1]!.key

    const shares = [
      { id: 's1', memberId: HOUSE_MEMBER_ID, amount: 15000, categoryId: defaultCategoryId(1, 1), advance: false, note: 'zakupy' },
      { id: 's2', memberId: HOUSE_MEMBER_ID, amount: 35000, categoryId: null, advance: true, note: 'reszta' }
    ]
    const initialChoice = {
      kind: 'income' as const,
      categoryId: null,
      refundable: false,
      household: true,
      memberId: HOUSE_MEMBER_ID,
      advance: true,
      counterAccountId: null,
      shares
    }

    openStore()
    impState.useImport.setState({
      file,
      plan,
      accountId: MBANK_ACCOUNT_ID,
      choices: {
        ...impState.useImport.getState().choices,
        groups: { [g1.group]: initialChoice },
        rows: { [r2Key]: initialChoice }
      },
      selected: {
        groups: { [g1.group]: true },
        rows: { [r2Key]: true }
      }
    })

    // Bulk change for the SAME member (e.g. from advance to income) on both a ticked group and a ticked single row
    const res = impState.chooseSelected(groups, `household:${HOUSE_MEMBER_ID}:income`, null)
    expect(res.applied).toBe(2)

    const afterChoices = impState.useImport.getState().choices
    expect(afterChoices.groups[g1.group]?.shares).toEqual(shares)
    expect(afterChoices.groups[g1.group]?.advance).toBe(false)
    expect(afterChoices.rows[r2Key]?.shares).toEqual(shares)
    expect(afterChoices.rows[r2Key]?.advance).toBe(false)
  })
})
