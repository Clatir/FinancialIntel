import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { mergeDuplicate } from '@shared/import/copies'
import { deletedBankRows, returnedOf, type DeletedVersion } from '@shared/import/deleted'
import type { MbankFile, MbankRow } from '@shared/import/mbank'
import { buildImport, planImport, type ImportChoices, type ImportPlan } from '@shared/import/reconcile'
import { COLLECTIONS } from '@shared/paths'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type SettingsFile, type Transaction } from '@shared/schema'
import { listaCsv, type CsvBuy } from '../e2e/mbank-csv'

// The renderer's stores talk to the main process through window.fi (preload); here it is a mock writing nothing.
const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, records: Array<{ id: string }>) => records.map((record) => ({ id: record.id, entry: { record, relPath: `${record.id}.json`, readOnly: false } }))),
  saveSettings: vi.fn(async (f: SettingsFile) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: readonly string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined),
  historyDeleted: vi.fn(async (): Promise<unknown[]> => []),
  importBackup: vi.fn(async () => 'C:\\dane\\backups\\pre-import\\2026-10-27.zip'),
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
const state = await import('../../src/renderer/features/import/state')
const returned = await import('../../src/renderer/features/import/returned')

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const ctx = () => ({ rules: [], ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings.categories) })
let seq = 0
const makeId = () => `01KN1R${String(++seq).padStart(20, '0')}`
const zl = (v: number) => Math.round(v * 100)

const CARD = 'ZAKUP PRZY UŻYCIU KARTY W KRAJU'
type Buy = { date: string; amount: number; name: string; pending?: boolean }
const rowOf = (b: Buy, format: MbankFile['format']): MbankRow => ({
  line: 1,
  date: b.date,
  description: format === 'lista' ? `${b.name} ${CARD}` : `${CARD} ${b.name}`,
  operation: CARD,
  counterparty: b.name,
  title: '',
  accountNo: '',
  category: '',
  amount: -zl(b.amount),
  pending: !!b.pending,
  balanceAfter: null
})
const fileOf = (format: MbankFile['format'], buys: Buy[]): MbankFile => ({
  format,
  client: 'JAN KAPITAN',
  account: null,
  period: { from: '2026-10-19', to: '2026-10-26' },
  rows: buys.map((b) => rowOf(b, format)),
  skipped: []
})
const choicesOf = (over: Partial<ImportChoices> = {}): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {}, ...over })
const statuses = (plan: ImportPlan) => plan.rows.map((p) => p.status)
function run(plan: ImportPlan, existing: readonly Transaction[], now: string) {
  const result = buildImport(plan, choicesOf(), { now, makeId, rules: [] })
  const byId = new Map(existing.map((t) => [t.id, t]))
  for (const t of result.update) byId.set(t.id, t)
  for (const id of result.remove) byId.delete(id)
  for (const t of result.create) byId.set(t.id, t)
  return [...byId.values()]
}
/** An import as 1.15.4 ran it: the deleted ones known by their keys only. */
const imported = (file: MbankFile, existing: readonly Transaction[], now: string, keys: ReadonlySet<string> = new Set()) => run(planImport(file, MBANK_ACCOUNT_ID, existing, ctx(), keys), existing, now)
const deletion = (txs: readonly Transaction[], savedAt: string): DeletedVersion[] => txs.map((t) => ({ id: t.id, savedAt, reason: 'delete', record: t }))
const handTyped = (date: string, amount: number, counterparty: string, at: string): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: at, updatedAt: at, date, accountId: MBANK_ACCOUNT_ID, kind: 'expense', amount, categoryId: null, counterparty, title: '' })

const ZABKA: Buy = { date: '2026-10-25', amount: 31.95, name: 'ZABKA Z1234' }
const KIOSK: Buy = { date: '2026-10-22', amount: 12.4, name: 'KIOSK RUCH' }
const T1 = '2026-10-26T18:00:00.000Z'
const T2 = '2026-10-27T18:00:00.000Z'
const T3 = '2026-10-28T18:00:00.000Z'

describe('przegląd N1 – „Wróciły po usunięciu” tylko dla operacji, którą zrobił import (T330)', () => {
  it('ręcznie wpisana połączona z wierszem drugiego formatu po usunięciu duplikatu z banku – bez meldunku; także scalona w panelu duplikatów', () => {
    // The user typed ZABKA by hand; the list brought its row as another operation – deleted as the duplicate.
    const hand = handTyped('2026-10-25', -zl(31.95), 'ZABKA Z1234', '2026-10-25T19:00:00.000Z')
    const lista = imported(fileOf('lista', [KIOSK, ZABKA]), [], T1)
    const copy = lista.find((t) => t.counterparty === 'ZABKA Z1234')!
    const left = [...lista.filter((t) => t !== copy), hand]
    const { keys, rows } = deletedBankRows(deletion([copy], T2), left, new Set())
    // The history as 1.15.4 imported it: its row joined with the hand-typed one.
    const plan = planImport(fileOf('historia', [KIOSK, ZABKA]), MBANK_ACCOUNT_ID, left, ctx(), keys)
    expect(statuses(plan)).toEqual(['known', 'merge'])
    const after = run(plan, left, T3)
    const joined = after.find((t) => t.id === hand.id)!
    expect([joined.bank?.source, joined.bank?.importedAt]).toEqual(['historia', T3])
    expect(returnedOf(after, rows)).toEqual([])
    // Joined in the duplicates panel (the hand-typed one kept, the row of the history from its copy): the same.
    const back = imported(fileOf('historia', [KIOSK, ZABKA]), lista.filter((t) => t !== copy), T3, keys).find((t) => t.counterparty === 'ZABKA Z1234')!
    expect(returnedOf([...left, back], rows).map((r) => r.tx.id)).toEqual([back.id])
    const kept = mergeDuplicate(hand, [back], 'manual', '2026-10-29T08:00:00.000Z')
    expect(returnedOf([...left.filter((t) => t !== hand), kept], rows)).toEqual([])
  })

  it('nierozliczona rozliczona plikiem drugiego formatu po usunięciu duplikatu – bez meldunku', () => {
    // A copy of the purchase from a list (booked), deleted by the user; the pending one of another list stays.
    const copy = imported(fileOf('lista', [ZABKA]), [], T1)[0]!
    const pending = imported(fileOf('lista', [{ ...ZABKA, date: '2026-10-24', pending: true }]), [], T1)
    const { keys, rows } = deletedBankRows(deletion([copy], T2), pending, new Set())
    // The history settles the pending one: its row now the history's, imported after the deletion.
    const plan = planImport(fileOf('historia', [ZABKA]), MBANK_ACCOUNT_ID, pending, ctx(), keys)
    expect(statuses(plan)).toEqual(['settle'])
    const after = run(plan, pending, T3)
    expect([after[0]!.id, after[0]!.bank?.source, after[0]!.bank?.pending]).toEqual([pending[0]!.id, 'historia', false])
    expect(returnedOf(after, rows)).toEqual([])
  })
})

describe('przegląd N1 – usunięcia przez import w historii (T331)', () => {
  it('wersja usunięta przez import (`byImport`) – tylko klucze, także gdy jej paczki importu już nie ma', () => {
    const history = imported(fileOf('historia', [KIOSK, ZABKA]), [], T1)
    const zabka = history.find((t) => t.counterparty === 'ZABKA Z1234')!
    const { keys, rows } = deletedBankRows([{ ...deletion([zabka], T2)[0]!, byImport: true }], [], new Set())
    expect([keys.has(zabka.bank!.key), rows]).toEqual([true, []])
  })
})

describe('przegląd N1 – meldunek liczony tanio (T332)', () => {
  it('operacje innej kwoty niż usunięte – ich wiersz z banku nieczytany', () => {
    const history = imported(fileOf('historia', [KIOSK, ZABKA]), [], T1)
    const zabka = history.find((t) => t.counterparty === 'ZABKA Z1234')!
    const { rows } = deletedBankRows(deletion([zabka], T2), [], new Set())
    let reads = 0
    const others = Array.from({ length: 500 }, (_, i) => {
      const t = { ...history[0]!, id: `${history[0]!.id.slice(0, -4)}${String(i).padStart(4, '0')}`, amount: -(1000 + i) }
      const bank = t.bank
      return Object.defineProperty(t, 'bank', {
        get: () => {
          reads++
          return bank
        }
      }) as Transaction
    })
    expect(returnedOf(others, rows)).toEqual([])
    expect(reads).toBe(0)
  })
})

// ---------------------------------------------------------------------------- the window (renderer's stores)

const PERIOD = { from: '2026-10-19', to: '2026-10-26' }
const BUYS: CsvBuy[] = [
  { date: '2026-10-20', amount: 87.91, name: 'SLUSARZ KOWAL' },
  { date: '2026-10-25', amount: 31.95, name: 'ZABKA Z1234' }
]
const bytes = (text: string) => new TextEncoder().encode(text)
let folder = 0
function open(over: { readOnly?: boolean; transactions?: Transaction[]; lastImport?: Record<string, string>; dir?: string } = {}): string {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = (over.transactions ?? []).map((record) => ({ record, relPath: `transactions/${record.id}.json`, readOnly: false }))
  const dataDir = over.dir ?? `/dane-r-${++folder}`
  const status: FolderStatus = { dataDir, available: true, readOnly: !!over.readOnly, readOnlyReason: over.readOnly ? 'test' : null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  const s = { ...fi, settings: { ...fi.settings, import: { ...fi.settings.import, lastImport: over.lastImport ?? {} } } }
  data.applySnapshot({ fi: s, records, problems: [], conflicts: [], status, loadMs: 0 })
  return dataDir
}
const operations = () => data.listOf(data.useData.getState().records.transactions)
const toasts = () => ui.useUi.getState().toasts.map((t) => t.text)
/** The history as `api.historyDeleted` gives it: `txs` deleted by the user. */
const historyOf = (txs: readonly Transaction[], savedAt: string) => txs.map((t) => ({ id: t.id, file: 'x', savedAt, savedBy: 'PC', reason: 'delete', updatedAt: null, updatedBy: null, record: t }))
/** A list's ZABKA as 1.15.4 imported it after the user deleted the history's one: come back. */
function cameBack(): { back: Transaction; gone: Transaction; all: Transaction[] } {
  const history = imported(fileOf('historia', [KIOSK, ZABKA]), [], T1)
  const gone = history.find((t) => t.counterparty === 'ZABKA Z1234')!
  const left = history.filter((t) => t !== gone)
  const all = imported(fileOf('lista', [KIOSK, ZABKA]), left, T3, new Set([gone.bank!.key]))
  return { back: all.find((t) => t.counterparty === 'ZABKA Z1234')!, gone, all }
}

beforeEach(() => {
  vi.clearAllMocks()
  api.historyDeleted.mockImplementation(async () => [])
  ui.useUi.setState({ toasts: [] })
})

describe('przegląd N1 – meldunek w oknie', () => {
  it('„Usuń” nie usuwa operacji, która ma już inny wiersz z banku (połączona albo rozliczona) – T330', async () => {
    const hand = handTyped('2026-10-25', -zl(31.95), 'ZABKA Z1234', '2026-10-25T19:00:00.000Z')
    const joined = { ...hand, bank: imported(fileOf('historia', [ZABKA]), [], T3)[0]!.bank }
    open({ transactions: [joined] })
    await returned.removeReturned(joined.id)
    expect(api.deleteRecord).not.toHaveBeenCalled()
    expect(operations().map((t) => t.id)).toEqual([joined.id])
    // The copy the import made: deleted again.
    const { back } = cameBack()
    open({ transactions: [back] })
    await returned.removeReturned(back.id)
    expect(operations()).toEqual([])
  })

  it('„zostaw” w folderze tylko do odczytu – bez komunikatu „Operacja zostaje”, nic nie zapamiętane', () => {
    const { back } = cameBack()
    open({ transactions: [back], readOnly: true })
    returned.keepReturned(back.id)
    expect(toasts()).not.toContain('Operacja zostaje – nie będzie zgłaszana.')
    expect(data.useData.getState().fi!.settings.import.notDuplicates).toEqual({})
    open({ transactions: [back] })
    returned.keepReturned(back.id)
    expect(toasts()).toContain('Operacja zostaje – nie będzie zgłaszana.')
    expect(data.useData.getState().fi!.settings.import.notDuplicates).toHaveProperty(`back:${back.id}`)
  })

  it('usunięte czytane po otwarciu folderu tylko, gdy jest po co: po imporcie od ostatniego sprawdzenia albo z meldunkami', async () => {
    const { back, gone, all } = cameBack()
    // Nothing come back: read once, then not at the next opening – until an import (another computer's too).
    const dir = open({ transactions: all.filter((t) => t !== back), lastImport: { [MBANK_ACCOUNT_ID]: T3 } })
    expect(returned.deletedReadDue(dir, T3)).toBe(true)
    api.historyDeleted.mockImplementation(async () => historyOf([gone], T2))
    await returned.readDeletedBank()
    expect(returned.deletedReadDue(dir, T3)).toBe(false)
    expect(returned.deletedReadDue(dir, '2026-11-01T10:00:00.000Z')).toBe(true)
    // One come back: read at every opening while it waits.
    const other = open({ transactions: all, lastImport: { [MBANK_ACCOUNT_ID]: T3 } })
    await returned.readDeletedBank()
    expect(returned.deletedReadDue(other, T3)).toBe(true)
    // The history not read: as never checked.
    open({ dir, transactions: all.filter((t) => t !== back), lastImport: { [MBANK_ACCOUNT_ID]: T3 } })
    api.historyDeleted.mockImplementation(async () => {
      throw new Error('EBUSY')
    })
    await returned.readDeletedBank()
    expect(returned.deletedReadDue(dir, T3)).toBe(true)
  })

  /** A list with a pending purchase, then a list of the same days without it (gone from the bank): removed by the import. */
  async function vanishedImport(): Promise<string> {
    await state.loadImportFile('lista.csv', bytes(listaCsv([...BUYS, { date: '2026-10-26', amount: 5, name: 'KIOSK RUCH', pending: true }], PERIOD)))
    await state.runImport()
    const kiosk = operations().find((t) => t.counterparty === 'KIOSK RUCH')!
    expect(kiosk.bank?.pending).toBe(true)
    await state.loadImportFile('lista-2.csv', bytes(listaCsv(BUYS, { from: '2026-10-19', to: '2026-10-27' })))
    expect(state.useImport.getState().plan!.vanished.map((t) => t.id)).toEqual([kiosk.id])
    state.setRemoveVanished(kiosk.id, true)
    await state.runImport()
    expect(operations().map((t) => t.counterparty).sort()).toEqual(['SLUSARZ KOWAL', 'ZABKA Z1234'])
    return kiosk.id
  }
  const latestImport = () => data.useData.getState().fi!.settings.import.lastImport[MBANK_ACCOUNT_ID]!

  it('import usuwa nierozliczoną, której bank już nie pokazuje: jako usuniętą przez import (T331)', async () => {
    open()
    const id = await vanishedImport()
    expect(api.deleteRecords).toHaveBeenCalledWith('transactions', [id], 'import')
  })

  it('import z tego komputera (z usuniętymi przeczytanymi): sprawdzenie przesunięte na jego czas – bez czytania przy następnym otwarciu (T332)', async () => {
    const dir = open()
    await vanishedImport()
    expect(returned.deletedReadDue(dir, latestImport())).toBe(false)
  })
})
