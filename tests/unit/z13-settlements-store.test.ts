import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { addDays, warsawNow } from '@shared/calc/dates'
import { balanceText } from '@shared/calc/household'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { CASH_ACCOUNT_ID, defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type SettingsFile, type Transaction } from '@shared/schema'

// Z13 (1.21.0, UX-82, D106 pkt 11, T547): „Rozliczenia z domownikami” in Radar – per member the balance both ways (AF-16),
// the open purchases (the part, what is left), the money waiting to be assigned (D91); „Oddał(a) gotówką…” – a draft of
// their inflow in the editor (nothing written), „Pokaż w Operacjach” – their operations, links from Mostek and Meldunki.
const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, records: Array<{ id: string }>) => records.map((record) => ({ id: record.id, entry: { record, relPath: `${record.id}.json`, readOnly: false } }))),
  saveSettings: vi.fn(async (f: SettingsFile) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: readonly string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined)
}
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const fleet = await import('../../src/renderer/store/fleet')
const panels = await import('../../src/renderer/store/panels')
const ops = await import('../../src/renderer/features/operations/state')
const settle = await import('../../src/renderer/features/radar/settlements')

const AT = '2026-09-01T10:00:00.000Z'
const OLA = '01KZ13PERS0000000000000001'
const MAREK = '01KZ13MAREK000000000000002'
const ANIA = '01KZ13ANNA0000000000000003'
const TATA = '01KZ13TATA0000000000000004'
const BABCIA = '01KZ13BABCAA00000000000005'
const id = (n: number) => `01KZ13TX${String(n).padStart(18, '0')}`
const P1 = id(1)
const P2 = id(2)
const R1 = id(3)
const R2 = id(4)
const P3 = id(5)
const A1 = id(6)
const P4 = id(7)
const R3 = id(8)
const today = warsawNow().date
const day = (n: number) => addDays(today, -n)
const person = (pid: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id: pid, name, bankNames: [], inflow: 'ask', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const tx = (tid: string, date: string, amount: number, over: Partial<Transaction>): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: tid, createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const bought = (tid: string, date: string, zl: number, memberId: string, counterparty: string) =>
  tx(tid, date, -zl * 100, { categoryId: defaultCategoryId(6, 1), refundable: true, memberId, counterparty })
const repaid = (tid: string, date: string, zl: number, memberId: string, over: Partial<Transaction> = {}) => tx(tid, date, zl * 100, { kind: 'income', memberId, inflowKind: 'repay', ...over })

/**
 * Ola: Biedronka 80 zł (30 zł of it paid back, named), Apteka 40 zł, 25 zł repaid without a purchase named (D91 – to be
 * assigned) → owes 65 zł. Marek: Eventim 150 zł, then an explicit advance of 100 zł that skips the debt (D99 S4) → owes
 * 150 zł and holds 100 zł at once (AF-16). Ania paid back all. Tata – nothing. Babcia – her balance at the settlements'
 * start (30 zł).
 */
let folder = 0
function open(over: { readOnly?: boolean; cashArchived?: boolean } = {}): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const list = [
    bought(P1, day(20), 80, OLA, 'Biedronka'),
    bought(P2, day(10), 40, OLA, 'Apteka'),
    repaid(R1, day(5), 30, OLA, { covers: [P1], counterparty: 'OLA TESTOWA' }),
    repaid(R2, day(3), 25, OLA, { counterparty: 'OLA TESTOWA' }),
    bought(P3, day(12), 150, MAREK, 'Eventim'),
    repaid(A1, day(6), 100, MAREK, { inflowKind: 'advance', advance: true, counterparty: 'MAREK' }),
    bought(P4, day(8), 20, ANIA, 'Kiosk'),
    repaid(R3, day(4), 20, ANIA, { covers: [P4] })
  ]
  records.transactions = list.map((record) => ({ record, relPath: `transactions/${record.date.slice(0, 4)}/${record.date}_${record.id}.json`, readOnly: false }))
  const status: FolderStatus = { dataDir: `/dane-z13-${++folder}`, available: true, readOnly: !!over.readOnly, readOnlyReason: over.readOnly ? 'Tylko do odczytu.' : null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  const members = [
    ...fi.settings.household.members,
    person(OLA, 'Ola'),
    person(MAREK, 'Marek', { inflow: 'advance' }),
    person(ANIA, 'Ania', { inflow: 'income' }),
    person(TATA, 'Tata'),
    person(BABCIA, 'Babcia', { opening: { owed: 3000, deposit: 0 } })
  ]
  const accounts = fi.settings.accounts.map((a) => (a.id === CASH_ACCOUNT_ID && over.cashArchived ? { ...a, archived: true } : a))
  data.applySnapshot({
    fi: { ...fi, settings: { ...fi.settings, accounts, budget: { ...fi.settings.budget, start: day(60) }, household: { ...fi.settings.household, since: day(30), assignFrom: null, members } } },
    records,
    problems: [],
    conflicts: [],
    status,
    loadMs: 0
  })
}
const view = () => {
  const f = fleet.fleetNow()!
  return settle.settlementsOf(f.receivables.members, f.household)
}
const of = (memberId: string) => view().find((m) => m.memberId === memberId)

beforeEach(() => {
  vi.clearAllMocks()
  ui.useUi.setState({ toasts: [], focus: null, route: { page: 'radar' } })
})

describe('Z13: rozliczenia z domownikami – liczby z księgi silnika', () => {
  it('osoby: tylko z długiem, zaliczką albo zwrotem do przypisania – rozliczona i bez niczego nie', () => {
    open()
    // The ledger's order: the balance at the start first, then as they first appear.
    expect(view().map((m) => m.memberId)).toEqual([BABCIA, OLA, MAREK])
    expect(of(ANIA)).toBeUndefined()
    expect(of(TATA)).toBeUndefined()
  })

  it('AF-16: dług i zaliczka naraz – oba w saldzie osoby (balanceText)', () => {
    open()
    const m = of(MAREK)!
    expect([m.owed, m.deposit]).toEqual([15000, 10000])
    expect(balanceText(m, (g) => (g / 100).toFixed(2))).toBe('ma oddać 150.00 zł · zaliczka 100.00 zł')
  })

  it('zakupy do oddania: kwota (część osoby) i ile zostało – częściowo oddany zakup', () => {
    open()
    const m = of(OLA)!
    expect(m.purchases.map((p) => [p.txId, p.date, p.amount, p.left, p.opening])).toEqual([
      [P1, day(20), 8000, 5000, false],
      [P2, day(10), 4000, 4000, false]
    ])
    // Their money waiting to be assigned is not taken off the purchases (D91): owed = open − waiting.
    expect(m.owed).toBe(9000 - 2500)
  })

  it('zwrot do przypisania (D91): wpłata bez wskazanego zakupu – jej operacja i kwota', () => {
    open()
    const m = of(OLA)!
    expect(m.waiting.map((w) => [w.txId, w.date, w.amount])).toEqual([[R2, day(3), 2500]])
    expect(m.waitingSum).toBe(2500)
    expect(of(MAREK)!.waiting).toEqual([])
  })

  it('panel w Radarze (i link „rozlicz na Radarze ›” Mostka): ktoś do rozliczenia albo osoby obok domyślnego „Dom”', () => {
    open()
    const f = fleet.fleetNow()!
    const people = data.useData.getState().fi!.settings.household.members
    expect(settle.settlementsShown(f.receivables.members, people)).toBe(true)
    // Only the default „Dom” (and an archived person), nobody to settle – as with the loans given alone on Mostek: no panel.
    const house = createDefaultSettings().settings.household.members
    const archived = [...house, person(TATA, 'Tata', { archived: true })]
    const none = { memberId: OLA, owed: 0, deposit: 0, open: [], since: null, unassigned: [] }
    expect(settle.settlementsShown([], house)).toBe(false)
    expect(settle.settlementsShown([none], archived)).toBe(false)
    // A person beside „Dom”, a debt, an advance, money waiting to be assigned – each shows it.
    expect(settle.settlementsShown([], [...house, person(TATA, 'Tata')])).toBe(true)
    expect(settle.settlementsShown([{ ...none, owed: 100 }], house)).toBe(true)
    expect(settle.settlementsShown([{ ...none, deposit: 100 }], house)).toBe(true)
    expect(settle.settlementsShown([{ ...none, unassigned: [{ txId: R2, date: day(3), amount: 100 }] }], house)).toBe(true)
  })

  it('saldo na start rozliczeń: pozycja bez operacji, oznaczona', () => {
    open()
    const m = of(BABCIA)!
    expect(m.owed).toBe(3000)
    expect(m.purchases).toHaveLength(1)
    expect(m.purchases[0]).toMatchObject({ amount: 3000, left: 3000, opening: true })
  })
})

describe('Z13: działania – szkic wpływu, Operacje, przejścia', () => {
  it('„Oddał(a) gotówką…”: nowy szkic wpływu domownika na koncie Gotówka – nic nie zapisane, otwarty w edytorze', () => {
    open()
    const draftId = settle.startRepayment(OLA)
    expect(draftId).toBeTruthy()
    const s = data.useData.getState()
    const t = s.records.transactions[draftId!]!.record
    expect(t).toMatchObject({ kind: 'income', amount: 0, memberId: OLA, inflowKind: 'repay', advance: false, repaid: 0, covers: [], accountId: CASH_ACCOUNT_ID, counterparty: 'Ola', title: 'Zwrot gotówką: Ola' })
    expect(s.drafts[draftId!]).toBe(true)
    expect(api.saveRecord).not.toHaveBeenCalled()
    expect(api.saveRecords).not.toHaveBeenCalled()
    expect(ui.useUi.getState().route.page).toBe('operations')
    expect(ops.useOperationsUi.getState().selectedId).toBe(draftId)
  })

  it('szkic: reszta jak ustawienie osoby (D80 b) – „zaliczka” u Marka', () => {
    open()
    const draftId = settle.startRepayment(MAREK)!
    expect(data.useData.getState().records.transactions[draftId]!.record).toMatchObject({ memberId: MAREK, inflowKind: 'repay', advance: true })
  })

  it('szkic zapisuje się dopiero po pierwszej zmianie (wpisana kwota) – zwykłą ścieżką edytora', async () => {
    open()
    const draftId = settle.startRepayment(OLA)!
    expect(ops.updateOperation(draftId, (r) => ({ ...r, amount: 6500 }), true)).toBe(true)
    await vi.waitFor(() => expect(api.saveRecord.mock.calls.length + api.saveRecords.mock.calls.length).toBeGreaterThan(0))
    expect(data.useData.getState().drafts[draftId]).toBeUndefined()
  })

  it('bez aktywnego konta gotówki: szkic na koncie domyślnym, bez tytułu zwrotu gotówką', () => {
    open({ cashArchived: true })
    const draftId = settle.startRepayment(OLA)!
    const t = data.useData.getState().records.transactions[draftId]!.record
    expect(t.accountId).not.toBe(CASH_ACCOUNT_ID)
    expect(t.title).toBe('')
    expect(settle.repaysInCash(data.useData.getState().fi!.settings.accounts)).toBe(false)
  })

  it('folder tylko do odczytu: brak szkicu', () => {
    open({ readOnly: true })
    const before = Object.keys(data.useData.getState().records.transactions).length
    expect(settle.startRepayment(OLA)).toBeNull()
    expect(Object.keys(data.useData.getState().records.transactions)).toHaveLength(before)
    expect(ui.useUi.getState().route.page).toBe('radar')
  })

  it('„Pokaż w Operacjach”: wszystkie operacje osoby z całej historii (filtr domownika)', () => {
    open()
    ops.showFilter({ query: 'xyz', kinds: ['expense'] })
    settle.openMemberOperations(OLA)
    const f = ops.useOperationsUi.getState().filter
    expect(f.members).toEqual([OLA])
    expect(f.period).toEqual({ kind: 'all' })
    expect([f.kinds, f.marks, f.query]).toEqual([[], [], ''])
    expect(ui.useUi.getState().route.page).toBe('operations')
  })

  it('przejście do rozliczeń (Mostek, Meldunki): Radar, panel pokazany i rozwinięty, osoba wskazana', () => {
    open()
    const key = `radar:${settle.SETTLEMENTS_PANEL}`
    panels.setPanelLayout(key, { hidden: true, collapsed: true })
    ui.useUi.setState({ route: { page: 'bridge' } })
    settle.openSettlements(OLA)
    expect(ui.useUi.getState().route.page).toBe('radar')
    expect(ui.useUi.getState().focus).toEqual({ kind: 'settlements', id: OLA })
    expect(panels.usePanels.getState()[key]).toBeUndefined()
    settle.openSettlements()
    expect(ui.useUi.getState().focus).toEqual({ kind: 'settlements', id: settle.SETTLEMENTS_ALL })
  })
})
