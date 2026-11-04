/**
 * N2 (1.15.6), the review's findings in the window's stores: a kind change asked about a confirmed balance says what it
 * unlinked, its „Cofnij” keeps the edits made since (T362); „Cofnij” of „Wycofaj dokowanie” after a docking again (T360);
 * one scan of the deliveries for the docking's list and the engine's pairs (T341); a category used by an import in
 * progress (T361).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { EMPTY_ICTJ, type IctjEntry, type IctjSnapshot } from '@shared/ictj'
import { COLLECTIONS } from '@shared/paths'
import { isDuplicatePairKey, REPORT_KEY_PREFIXES } from '@shared/import/duplicates'
import {
  balanceSchema,
  containerSchema,
  defaultCategoryId,
  dockingSchema,
  MBANK_ACCOUNT_ID,
  SCHEMA_VERSION,
  transactionSchema,
  type Balance,
  type Container,
  type Docking,
  type Transaction
} from '@shared/schema'

// One scan of the deliveries (przegląd N2): the real `deliveries`, counted.
vi.mock('@shared/calc/dock', async (importOriginal) => {
  const real = await importOriginal<typeof import('@shared/calc/dock')>()
  return { ...real, deliveries: vi.fn(real.deliveries) }
})

// The renderer's stores talk to the main process through window.fi (preload); here a mock that takes every write.
const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: unknown[]) => rs.map((r) => ({ ok: true, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(),
  historyList: vi.fn(async () => [] as unknown[])
}
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: api })
const dockCalc = await import('@shared/calc/dock')
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const guard = await import('../../src/renderer/store/guard')
const fleet = await import('../../src/renderer/store/fleet')
const { useIctj } = await import('../../src/renderer/store/ictj')
const operations = await import('../../src/renderer/features/operations/state')
const { transferKey } = await import('../../src/renderer/features/operations/transfers')
const dock = await import('../../src/renderer/features/dock/actions')
const dockState = await import('../../src/renderer/features/dock/state')
const cats = await import('../../src/renderer/features/settings/categories')
const { useImport } = await import('../../src/renderer/features/import/state')

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-10-01T08:00:00.000Z'
let seq = 0
const nextId = () => `01K9R2S000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const bankRow = (key: string): NonNullable<Transaction['bank']> => ({ format: 'mbank', key, description: 'XTB S.A.', counterparty: 'XTB S.A.', operation: 'PRZELEW', category: '', pending: false, importedAt: AT })
const tx = (over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, kind: 'expense', amount: -zl(120), ...over })

function load(o: { transactions?: Transaction[]; dockings?: Docking[]; containers?: Container[]; balances?: Balance[]; start?: string } = {}): void {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const entry = <T extends { id: string }>(dir: string, record: T) => ({ record, relPath: `${dir}/${record.id}.json`, readOnly: false })
  records.transactions = (o.transactions ?? []).map((t) => entry('transactions', t))
  records.dockings = (o.dockings ?? []).map((d) => entry('dockings', d))
  records.containers = (o.containers ?? []).map((c) => entry('containers', c))
  records.balances = (o.balances ?? []).map((b) => entry('balances', b))
  data.applySnapshot({
    fi: { ...fi, settings: { ...fi.settings, budget: { ...fi.settings.budget, start: o.start ?? null } } },
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane-n2r', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
}
const lastToast = () => ui.useUi.getState().toasts.at(-1)
const record = (id: string) => data.useData.getState().records.transactions[id]!.record
const dockingsNow = () => data.listOf(data.useData.getState().records.dockings)

beforeEach(() => {
  ui.useUi.setState({ toasts: [] })
  guard.clearGuards()
  useIctj.setState({ snap: EMPTY_ICTJ })
})

describe('przegląd N2: zmiana rodzaju w potwierdzonym okresie – komunikat po „Zmień mimo to”, „Cofnij” zostawia późniejsze zmiany (T362)', () => {
  const PRAD = containerSchema.parse({ ...base(), name: 'Prąd', amount: zl(120), cycleMonths: 1, dueMonth: '2026-10', dueDay: 14 })
  const opening = balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })
  const confirmation = balanceSchema.parse({ ...base(), date: '2026-10-20', accountId: MBANK_ACCOUNT_ID, kind: 'confirmation', amount: zl(4880) })

  it('przychód zamiast wydatku Ładowni: pytanie; po potwierdzeniu toast z „Cofnij” (przedtem cisza); „Cofnij” po zmianie kontrahenta ją zostawia', () => {
    const paid = tx({ counterparty: 'TAURON', containerId: PRAD.id })
    load({ transactions: [paid], containers: [PRAD], balances: [opening, confirmation] })
    expect(operations.changeKind(paid.id, 'income', false)).toBe(false)
    expect(guard.useGuard.getState().asks).toHaveLength(1)
    expect(record(paid.id).kind).toBe('expense')
    expect(lastToast()).toBeUndefined()
    guard.answerGuard(guard.useGuard.getState().asks[0]!.seq, true)
    expect(record(paid.id)).toMatchObject({ kind: 'income', amount: zl(120), containerId: null })
    const t = lastToast()!
    expect(t.text).toBe('Rodzaj „Wpływ” nie bierze pieniędzy z celu ani z Ładowni – operację odpięto: kontener „Prąd”.')
    expect(t.action?.label).toBe('Cofnij')
    // Typed within the toast's 8 s: stays after „Cofnij” (before – the whole record from before came back).
    data.updateRecord('transactions', paid.id, (r) => ({ ...r, counterparty: 'TAURON SPRZEDAŻ' }))
    t.action!.run()
    expect(record(paid.id)).toMatchObject({ kind: 'expense', amount: -zl(120), containerId: PRAD.id, counterparty: 'TAURON SPRZEDAŻ' })
  })

  it('„Anuluj”: nic nie zapisane, żadnego komunikatu; bez potwierdzonego salda – od razu', () => {
    const paid = tx({ containerId: PRAD.id })
    load({ transactions: [paid], containers: [PRAD], balances: [opening, confirmation] })
    operations.changeKind(paid.id, 'transfer', false)
    // The same sign: no confirmed balance moves – written at once, said.
    expect(record(paid.id)).toMatchObject({ kind: 'transfer', containerId: null })
    expect(lastToast()?.text).toContain('kontener „Prąd”')
    ui.useUi.setState({ toasts: [] })
    load({ transactions: [paid], containers: [PRAD], balances: [opening, confirmation] })
    operations.changeKind(paid.id, 'income', false)
    guard.answerGuard(guard.useGuard.getState().asks[0]!.seq, false)
    expect(record(paid.id).kind).toBe('expense')
    expect(lastToast()).toBeUndefined()
  })
})

describe('przegląd N2: „Cofnij” wycofania dokowania po ponownym dokowaniu nie dodaje drugiego (T360)', () => {
  it('wpływ z XTB bez wpisu ICTTJ (dokowanie bez stałego id): po ponownym dokowaniu jedno dokowanie, nie dwa', () => {
    const inflow = tx({ kind: 'trading', amount: zl(700), counterparty: 'XTB S.A.', bank: bankRow('k-xtb') })
    const old = dockingSchema.parse({ ...base(), date: inflow.date, transactionId: inflow.id, ictjEntryId: null, pool: null })
    load({ transactions: [inflow], dockings: [old] })
    const delivery = () => {
      const s = data.useData.getState()
      return dockCalc.deliveries({ entries: [], transactions: data.listOf(s.records.transactions), dockings: data.listOf(s.records.dockings), start: '2026-10-01', today: '2026-10-28', skipped: [], ictjOn: true, entriesComplete: true, coveredTo: '2026-10-27' }).find((d) => d.key === `tx:${inflow.id}`)!
    }
    expect(delivery().state).toBe('docked')
    expect(dock.undockDelivery(delivery())).toBe(true)
    const undo = lastToast()!
    expect(dockingsNow()).toEqual([])
    expect(dock.dockDelivery(delivery(), null)).toBe(true)
    const again = dockingsNow()
    expect(again).toHaveLength(1)
    expect(again[0]!.id).not.toBe(old.id)
    undo.action!.run()
    expect(dockingsNow().map((d) => d.id)).toEqual([again[0]!.id])
    expect(delivery().state).toBe('docked')
  })

  it('nic nie zadokowano ponownie: „Cofnij” przywraca dokowanie bez stałego id', () => {
    const inflow = tx({ kind: 'trading', amount: zl(700), counterparty: 'XTB S.A.', bank: bankRow('k-xtb2') })
    const old = dockingSchema.parse({ ...base(), date: inflow.date, transactionId: inflow.id, ictjEntryId: null, pool: null })
    load({ transactions: [inflow], dockings: [old] })
    const s = data.useData.getState()
    const d = dockCalc.deliveries({ entries: [], transactions: data.listOf(s.records.transactions), dockings: data.listOf(s.records.dockings), start: '2026-10-01', today: '2026-10-28', skipped: [], ictjOn: true, entriesComplete: true, coveredTo: '2026-10-27' }).find((x) => x.key === `tx:${inflow.id}`)!
    expect(dock.undockDelivery(d)).toBe(true)
    lastToast()!.action!.run()
    expect(dockingsNow().map((x) => x.id)).toEqual([old.id])
  })
})

describe('przegląd N2: lista dostaw i pary silnika – jedno przejście po operacjach (T341)', () => {
  const entry: IctjEntry = { id: '01K9R2SE00000000000000000E', kind: 'withdrawal', date: '2026-10-14', amount: zl(800), pool: 'current', note: '', updatedAt: null }
  const snapshot: IctjSnapshot = { ...EMPTY_ICTJ, dir: 'C:\\ICTJ', status: 'ok', entries: [entry], readAt: '2026-10-20T09:59:00.000Z' }

  it('silnik i panel Dokowanie liczą dostawy raz, po zmianie operacji – znowu raz (przedtem dwa razy)', () => {
    const inflow = tx({ kind: 'trading', amount: zl(800), date: '2026-10-14', counterparty: 'XTB S.A.' })
    const opening = balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })
    load({ transactions: [inflow], balances: [opening], start: '2026-10-01' })
    useIctj.setState({ snap: snapshot })
    const scans = vi.mocked(dockCalc.deliveries)
    scans.mockClear()
    expect(fleet.fleetNow()!.started).toBe(true)
    expect([...fleet.pendingPairsNow()]).toEqual([[inflow.id, { pool: 'current', entryDate: '2026-10-14' }]])
    const list = dockState.deliveriesNow()
    expect(list.find((d) => d.key === `ictj:${entry.id}`)).toMatchObject({ state: 'pending', transaction: { id: inflow.id } })
    expect(scans).toHaveBeenCalledTimes(1)
    data.updateRecord('transactions', inflow.id, (r) => ({ ...r, note: 'wypłata' }))
    fleet.fleetNow()
    dockState.deliveriesNow()
    expect(scans).toHaveBeenCalledTimes(2)
  })
})

describe('przegląd N2: kategoria w decyzjach otwartego importu nie znika (T361)', () => {
  const SUB = defaultCategoryId(1, 1)

  it('grupa importu z tą podkategorią: odmowa z powodem; po zamknięciu pliku – usuwa', () => {
    load()
    const choice = { kind: 'expense' as const, categoryId: SUB, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    const before = useImport.getState()
    useImport.setState({ plan: { rows: [] } as never, choices: { ...before.choices, groups: { 'g:biedronka': choice } } })
    try {
      expect(cats.deleteCategory(SUB)).toBe(false)
      expect(lastToast()?.text).toContain('jest w użyciu (1 decyzja otwartego importu)')
    } finally {
      useImport.setState({ plan: before.plan, choices: before.choices })
    }
    expect(cats.deleteCategory(SUB)).toBe(true)
  })
})

describe('przegląd N2: klucze „zostaw” innych meldunków mają zarejestrowany przedrostek', () => {
  it('przelew zostawiony i samotna strona przelewu – nie pary panelu duplikatów', () => {
    const a = tx({ kind: 'transfer' })
    const b = tx({ kind: 'transfer' })
    for (const key of [transferKey({ kind: 'lone', tx: a } as never), transferKey({ kind: 'pair', keep: a, drop: b } as never)]) {
      expect(REPORT_KEY_PREFIXES.some((p) => key.startsWith(p))).toBe(true)
      expect(isDuplicatePairKey(key)).toBe(false)
    }
  })
})
