/**
 * N5 (1.15.9), the reviews of the window – finding 5 of the first one and 2, 3, 8, 9 of the second one:
 * - 5: „Potwierdź” of a top-up of XTB found only in the bank (DO sp. 12, T438) writes its docking counted from the
 *   operation's arrival (`countedFrom`, T363) – a goal's transfer or a hull top-up made between the import and the click
 *   keeps its place after it: the layers, the firewall's alarm and the game's day are the same before and after;
 * - KR.29 (T446): a start the folder refused takes back only its new records and only while they are what it wrote – in
 *   the window and on the disk (`deleteRecords` with the marks; here a small folder answering as the main process);
 *   what was there before changes only once fi.json is written; a record not to take back now keeps the wizard from
 *   ending in silence; the draft keeps only ids and marks.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import type { FleetState } from '@shared/calc/fleet'
import { rateDay } from '@shared/calc/game'
import { transferGoal } from '@shared/calc/goals'
import type { RecurringPayment } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { contentMark } from '@shared/merge'
import { COLLECTIONS } from '@shared/paths'
import { balanceSchema, goalSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Balance, type Goal, type MonthPlan, type Transaction } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here a mock with a small folder: what was
// written, what another computer changed behind the window, deletions the folder refuses.
const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const disk = new Map<string, Record<string, unknown>>()
const refuse = new Map<string, string>()
const onDisk = (c: string, r: { id: string }) => void disk.set(`${c}:${r.id}`, r as Record<string, unknown>)
const tray = { closeToTray: false, launchAtLogin: false, autostartAsked: true, notified: false, loginSupported: false }
const saveRecord = async (c: string, r: { id: string }) => {
  onDisk(c, r)
  return saved(r)
}
const saveRecords = async (c: string, rs: Array<{ id: string }>): Promise<Array<{ id: string; entry?: RecordEntry<unknown>; error?: string }>> =>
  rs.map((r) => {
    onDisk(c, r)
    return { id: r.id, entry: saved(r) }
  })
/** As `DataStore.deleteRecords` with `expected`: the file as it is now – another content is never deleted. */
const deleteRecords = async (c: string, ids: string[], _reason?: string, expected?: Record<string, string>): Promise<Array<{ id: string; error?: string; changed?: true }>> =>
  ids.map((id) => {
    const key = `${c}:${id}`
    if (refuse.has(c)) return { id, error: refuse.get(c)! }
    const now = disk.get(key)
    if (now && expected?.[id] != null && contentMark(now) !== expected[id]) return { id, error: 'Ten wpis zmienił się od zapisu, który miał zostać wycofany – zostaje, jak jest.', changed: true as const }
    disk.delete(key)
    return { id }
  })
const api = {
  saveRecord: vi.fn(saveRecord),
  saveRecords: vi.fn(saveRecords),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(deleteRecords),
  historyKeep: vi.fn(async () => undefined),
  trayPrefs: vi.fn(async () => tray),
  setTrayPrefs: vi.fn(async () => tray),
  setMachinePrefs: vi.fn(async () => DEFAULT_MACHINE_PREFS)
}
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) })
vi.stubGlobal('window', { fi: api })
// The click: 3 November 2026, 20:00 in Warsaw.
vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date('2026-11-03T19:00:00.000Z'))
afterAll(() => vi.useRealTimers())
const data = await import('../../src/renderer/store/data')
const fleet = await import('../../src/renderer/store/fleet')
const { gameInputOf } = await import('../../src/renderer/store/game')
const { useRemote } = await import('../../src/renderer/store/remote')
const { useUi } = await import('../../src/renderer/store/ui')
const balances = await import('../../src/renderer/features/balances/actions')
const dock = await import('../../src/renderer/features/dock/actions')
const wizard = await import('../../src/renderer/features/wizard/state')

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9R5D000000000000000${String(++seq).padStart(4, '0')}`
const base = (createdAt = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt, updatedAt: createdAt })
const DAY = '2026-11-03'
const entry = <R extends { id: string }>(dir: string, record: R) => ({ record, relPath: `${dir}/${record.id}.json`, readOnly: false })
const toasts = () => useUi.getState().toasts.map((t) => t.text)

beforeEach(() => {
  for (const f of Object.values(api)) f.mockClear()
  api.saveRecord.mockImplementation(saveRecord)
  api.saveRecords.mockImplementation(saveRecords)
  api.saveSettings.mockImplementation(async (f: unknown) => f)
  api.deleteRecords.mockImplementation(deleteRecords)
  useRemote.setState({ pending: [] })
  useUi.setState({ toasts: [] })
  storage.clear()
  disk.clear()
  refuse.clear()
})

/** The top-up of XTB, 200 zł from mBank, imported at 09:00 (Warsaw). */
const topUp = (): Transaction => transactionSchema.parse({ ...base('2026-11-03T08:00:00.000Z'), date: DAY, accountId: MBANK_ACCOUNT_ID, kind: 'trading', amount: -zl(200), counterparty: 'XTB S.A.' })

/**
 * November 2026 from the 1st: the salary 4 000 zł (the shields' target 12 000 zł), the costs assumed 2 000 zł (the hull's
 * target 12 000 zł) – `opening` on mBank, `hull` and the goals' money at the start.
 */
function open(o: { opening: number; hull: number; goals?: Goal[]; goalsAtStart?: Record<string, number>; plan?: Partial<MonthPlan>; transactions: Transaction[] }): void {
  const fi = createDefaultSettings(AT)
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.balances = [entry('balances', balanceSchema.parse({ ...base(), date: '2026-11-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: o.opening }))]
  records.months = [entry('months', monthPlanSchema.parse({ ...base(), month: '2026-11', salary: zl(4000), envelopes: {}, ...o.plan }))]
  records.goals = (o.goals ?? []).map((g) => entry('goals', g))
  records.transactions = o.transactions.map((t) => entry('transactions', t))
  data.applySnapshot({
    fi: {
      ...fi,
      settings: {
        ...fi.settings,
        budget: { ...fi.settings.budget, start: '2026-11-01', initial: { shields: 0, hull: o.hull, goals: o.goalsAtStart ?? {} } },
        layers: { ...fi.settings.layers, assumedCosts: zl(2000) },
        game: { ...fi.settings.game, start: '2026-11-01' }
      }
    },
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane-n5r5', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
}
/** What the confirmation must not touch: the layers, the alarms and the engine's log of the day. */
const money = (s: FleetState) => ({
  shields: s.shields.amount,
  hull: s.hull.amount,
  goals: s.goals.map((g) => [g.name, g.amount]),
  energy: s.energy,
  alarms: s.alarms,
  log: s.log.filter((e) => e.date === DAY)
})
const firewall = (s: FleetState) => s.alarms.filter((a) => a.kind === 'firewall').map((a) => [a.txId, a.amount])
/** The game's day as `rateDay` judges it from the records now (the serious violation „firewall”). */
const gameDay = () => {
  const s = data.useData.getState()
  return rateDay(gameInputOf(s.fi!, s.records), DAY).violations.filter((v) => v.order === 'firewall').map((v) => [v.serious, v.amount, v.ref])
}

describe('przegląd N5 5: „Potwierdź” dopłaty do XTB niczego nie zmienia w silniku (T438, T363)', () => {
  it('przeniesienie środków celu o 12:00 (dopłata 09:00, potwierdzenie 20:00): alarm firewalla i naruszenie w grze zostają', () => {
    const t = topUp()
    // 28 500 zł: the hull full (12 000 zł), Wakacje 3 000 zł, the shields 13 500 zł less the salary – 9 500 zł; at 12:00
    // all 3 000 zł of Wakacje to the shields. At the top-up (09:00) the shields are below their target – against the order.
    const goal = goalSchema.parse({ ...base(), name: 'Wakacje', target: zl(3000), priority: 1 })
    open({ opening: zl(28500), hull: zl(12000), goals: [transferGoal(goal, 'shields', zl(3000), '2026-11-03T11:00:00.000Z')], goalsAtStart: { [goal.id]: zl(3000) }, transactions: [t] })
    const before = fleet.fleetNow()!
    expect(firewall(before)).toEqual([[t.id, zl(200)]])
    expect(gameDay()).toEqual([[true, zl(200), t.id]])

    expect(dock.confirmTopUp(t.id)).toBe(true)
    const after = fleet.fleetNow()!
    // Before: counted from the click (20:00) – the transfer of 12:00 first, the shields 12 500 zł at the top-up: no alarm,
    // no violation, although the toast says it stays.
    expect(firewall(after)).toEqual([[t.id, zl(200)]])
    expect(gameDay()).toEqual([[true, zl(200), t.id]])
    expect(money(after)).toEqual(money(before))
    // The record: the operation's own docking, no entry, pool or split – counted from the operation's arrival.
    const written = Object.values(data.useData.getState().records.dockings).map((e) => e.record)
    expect(written.map((d) => [d.transactionId, d.ictjEntryId, d.pool, d.split, d.countedFrom, d.createdAt])).toEqual([[t.id, null, null, null, t.createdAt, '2026-11-03T19:00:00.000Z']])
  })

  it('„Dopełnij kadłub z osłon” o 12:00: kadłub i osłony po potwierdzeniu takie jak przed nim', () => {
    const t = topUp()
    // 27 500 zł: the hull 11 000 / 12 000 zł, the shields 16 500 zł less the salary – 12 500 zł (500 zł above the target);
    // at 12:00 „Dopełnij kadłub” 500 zł. After the top-up (09:00) only 300 zł are above the target – that is what moves.
    open({ opening: zl(27500), hull: zl(11000), plan: { hullTopUps: [{ id: nextId(), amount: zl(500), at: '2026-11-03T11:00:00.000Z' }] }, transactions: [t] })
    const before = fleet.fleetNow()!
    expect([before.hull.amount, before.shields.amount]).toEqual([zl(11300), zl(12000)])
    expect(firewall(before)).toEqual([[t.id, zl(200)]])

    expect(dock.confirmTopUp(t.id)).toBe(true)
    const after = fleet.fleetNow()!
    // Before: the top-up of the hull first (500 zł), the shields 11 800 zł after the top-up of XTB.
    expect(money(after)).toEqual(money(before))
    expect([after.hull.amount, after.shields.amount]).toEqual([zl(11300), zl(12000)])
  })
})

describe('przegląd 2 N5: start odrzucony przez folder – wycofanie tylko tego, co start zapisał (KR.29, T446)', () => {
  const EPERM = Object.assign(new Error("EPERM: operation not permitted, rename 'C:\\dane\\.fi.json.tmp-1' -> 'C:\\dane\\fi.json'"), { code: 'EPERM' })
  const proposal: RecurringPayment = {
    key: 'netflix com',
    label: 'NETFLIX.COM',
    amount: 4999,
    cycleMonths: 1,
    schedule: [],
    variable: false,
    dueMonth: '2026-10',
    dueDay: 7,
    categoryId: null,
    accountId: MBANK_ACCOUNT_ID,
    payments: 6,
    last: '2026-10-07',
    fresh: false
  }
  /** Netflix in October (linked by a start – from the month before it) and in September (not). */
  const october = transactionSchema.parse({ ...base(), date: '2026-10-07', accountId: MBANK_ACCOUNT_ID, amount: -4999, counterparty: 'NETFLIX.COM' })
  const september = transactionSchema.parse({ ...base(), date: '2026-09-07', accountId: MBANK_ACCOUNT_ID, amount: -4999, counterparty: 'NETFLIX.COM' })
  const DIR = '/dane-n5r2'

  /** A folder before the start (no `budget.start`): the wizard with every answer, at its last step; its files on the disk. */
  function load(o: { balances?: Balance[]; months?: MonthPlan[] } = {}): void {
    const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
    records.transactions = [entry('transactions', october), entry('transactions', september)]
    records.balances = (o.balances ?? []).map((b) => entry('balances', b))
    records.months = (o.months ?? []).map((m) => entry('months', m))
    for (const [c, list] of Object.entries(records)) for (const e of list as Array<{ record: { id: string } }>) onDisk(c, e.record)
    data.applySnapshot({
      fi: createDefaultSettings(AT),
      records,
      problems: [],
      conflicts: [],
      status: { dataDir: DIR, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
      loadMs: 0
    })
    wizard.startWizard()
    wizard.patchWizard({ balances: { [MBANK_ACCOUNT_ID]: 1_000_000, [XTB_WALLET_ACCOUNT_ID]: 0 }, salary: 500_000, cargo: { [proposal.key]: proposal }, step: 6 })
  }
  const list = <C extends keyof Snapshot['records']>(c: C) => Object.values(data.useData.getState().records[c])
  const finish = () => wizard.finishWizard({ salary: 500_000, hull: 0, goals: {}, tanks: {}, envelopes: {} })
  const linked = () => list('transactions').map((e) => [e.record.date, e.record.containerId ?? null])
  /** The deletions asked of the main process: collection, how many, the reason, how many with the mark of the start's version. */
  const deletions = () => api.deleteRecords.mock.calls.map(([c, ids, reason, expected]) => [c, ids.length, reason, Object.keys(expected ?? {}).length])

  it('fi.json odrzucony: nowe salda, plan i kontener wycofane ze znacznikiem wersji startu; płatności nietknięte do fi.json; silnik nie rusza', async () => {
    load()
    api.saveSettings.mockRejectedValue(EPERM)
    expect(await finish()).toBe(false)
    expect(data.useData.getState().fi!.settings.budget.start).toBeNull()
    expect([list('balances'), list('months'), list('containers')]).toEqual([[], [], []])
    // Each with the mark of what the start wrote – the main process reads the file again (przegląd 2 N5 3).
    expect(deletions()).toEqual(expect.arrayContaining([['balances', 2, 'undo', 2], ['months', 1, 'undo', 1], ['containers', 1, 'undo', 1]]))
    // Nothing of what was there changed before fi.json (before: the payments linked, then let go again).
    expect(linked()).toEqual([
      ['2026-10-07', null],
      ['2026-09-07', null]
    ])
    expect(api.saveRecords.mock.calls.filter(([c]) => c === 'transactions')).toEqual([])
    expect(fleet.fleetNow()!.started).toBe(false)
    expect(toasts().at(-1)).toMatch(/w folderze nie ma nic ze startu, „Uruchom budżet” zapisze je od nowa\.$/)
    const w = wizard.useWizard.getState()
    expect(w).toMatchObject({ active: true, cargo: { [proposal.key]: proposal }, startWrites: [] })
    expect(wizard.cancelWizardText(w.traces, wizard.startWriteLabels(w.startWrites))).toBe('Odpowiedzi kreatora (salda, plan, wybór kontenerów) przepadną, budżet się nie uruchomi.')

    // The folder takes fi.json again: the start whole – the payments linked once fi.json is on the disk (T379).
    api.saveSettings.mockImplementation(async (f: unknown) => f)
    expect(await finish()).toBe(true)
    expect([list('balances'), list('months'), list('containers')].map((l) => l.length)).toEqual([2, 1, 1])
    expect(linked()).toEqual([
      ['2026-10-07', list('containers')[0]!.record.id],
      ['2026-09-07', null]
    ])
    expect(fleet.fleetNow()!.started).toBe(true)
  })

  it('saldo otwarcia i plan sprzed kreatora zmieniają się dopiero po zapisie fi.json – odmowa zostawia je nietknięte', async () => {
    // An opening typed in Settings before the wizard (N23) and this month's plan.
    const mine = balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })
    const plan = monthPlanSchema.parse({ ...base(), id: '01KMTH00000000000000202611', month: '2026-11', salary: zl(3000), envelopes: {} })
    load({ balances: [mine], months: [plan] })
    api.saveSettings.mockRejectedValue(EPERM)
    expect(await finish()).toBe(false)
    expect(list('balances').map((e) => e.record)).toEqual([mine])
    expect(list('months').map((e) => e.record.salary)).toEqual([zl(3000)])
    expect(api.saveRecord.mock.calls.filter(([c, r]) => (c === 'balances' && r.id === mine.id) || c === 'months')).toEqual([])
    // The start goes through: now they change – the opening at the start of today, the plan with the salary.
    api.saveSettings.mockImplementation(async (f: unknown) => f)
    expect(await finish()).toBe(true)
    expect(list('balances').find((e) => e.record.id === mine.id)!.record).toMatchObject({ amount: 1_000_000, date: DAY })
    expect(list('months').map((e) => e.record.salary)).toEqual([500_000])
  })

  it('rekordy startu odrzucone już przy zapisie: wycofane z okna – autozapis ich później nie zapisze', async () => {
    load()
    api.saveRecords.mockImplementation(async (_c: string, rs: Array<{ id: string }>) => rs.map((r) => ({ id: r.id, error: 'EPERM: operation not permitted' })))
    api.saveRecord.mockImplementation(async () => {
      throw EPERM
    })
    expect(await finish()).toBe(false)
    expect([list('balances'), list('months'), list('containers')]).toEqual([[], [], []])
    expect(data.hasUnsaved()).toBe(false)
    expect(toasts().at(-1)).toMatch(/^Budżet nie wystartował – nie udało się zapisać rekordów startu w folderze \(.*\)\. Zapisane już salda otwarcia, plan i kontenery wycofano/)
    expect(fleet.fleetNow()!.started).toBe(false)
  })

  it('przegląd 2 N5 3: plan zmieniony na dysku przez inny komputer (watcher jeszcze go nie przyniósł) zostaje – usunięcie tylko wersji ze startu', async () => {
    load()
    // Another computer writes the month's plan a moment after this start wrote it: only the disk knows.
    api.saveSettings.mockImplementation(async () => {
      for (const [k, r] of disk) if (k.startsWith('months:')) disk.set(k, { ...r, salary: 700_000, updatedBy: 'LAPTOP' })
      throw EPERM
    })
    expect(await finish()).toBe(false)
    expect(list('months')).toHaveLength(1)
    expect([...disk.values()].filter((r) => r.month === '2026-11').map((r) => r.salary)).toEqual([700_000])
    expect([list('balances'), list('containers')]).toEqual([[], []])
    expect(toasts().at(-1)).toContain('Zostają w folderze, bo zmieniły się od zapisu startu: plan miesiąca (listopad 2026). Resztę rekordów startu wycofano.')
    // Changed since – the user's now: not tracked, the wizard ends at once.
    expect(wizard.useWizard.getState().startWrites).toEqual([])
  })

  it('przegląd 2 N5 2: druga odmowa nie cofa zmian z przerwy między startami – plan poprawiony po pierwszej odmowie zostaje', async () => {
    load()
    api.saveSettings.mockRejectedValue(EPERM)
    refuse.set('months', 'Nie udało się usunąć pliku months/2026-11.json (zajęty przez inny program?)')
    expect(await finish()).toBe(false)
    expect(wizard.useWizard.getState().startWrites.map((w) => w.collection)).toEqual(['months'])
    // Between the starts the plan left in the folder is changed (here; the same from another computer): the user's now.
    const plan = list('months')[0]!.record
    data.updateRecord('months', plan.id, (p) => ({ ...p, salary: 650_000 }))
    await data.flushSaves()
    refuse.clear()
    api.deleteRecords.mockClear()
    // The second start counts what was there before it: the plan is there – its change waits for fi.json, refused again.
    expect(await finish()).toBe(false)
    // Before: the plan of the first start („made by the start”) deleted with the change, or set back to before the first.
    expect(list('months').map((e) => e.record.salary)).toEqual([650_000])
    expect(deletions().filter(([c]) => c === 'months')).toEqual([])
    expect(toasts().at(-1)).toContain('Zostają w folderze, bo zmieniły się od zapisu startu: plan miesiąca (listopad 2026).')
    expect(wizard.useWizard.getState().startWrites).toEqual([])
  })

  it('przegląd 2 N5 8: czekający na decyzję o zmianie z drugiego komputera albo zapisany przez nowszą wersję – „nie da się teraz wycofać”, kreator go pamięta, „Przerwij” nie kończy po cichu', async () => {
    load()
    api.saveSettings.mockRejectedValue(EPERM)
    refuse.set('balances', 'zajęty')
    expect(await finish()).toBe(false)
    const [one, two] = list('balances').map((e) => e.record)
    expect(wizard.useWizard.getState().startWrites.map((w) => w.collection)).toEqual(['balances', 'balances'])
    refuse.clear()
    // One waits for a decision about another computer's change, the other a newer version of the app wrote.
    useRemote.setState({ pending: [{ key: `balances:${one!.id}`, collection: 'balances', id: one!.id, type: 'update', base: undefined, theirs: null, hadLocalEdits: false, receivedAt: '2026-11-03T19:00:00.000Z' }] })
    data.useData.setState((s) => ({ records: { ...s.records, balances: { ...s.records.balances, [two!.id]: { ...s.records.balances[two!.id]!, readOnly: true } } } }))
    await wizard.cancelWizard()
    // Before: „Zmienione od tego czasu zostają, jak są” – and dropped from the answers: an opening of the start untracked.
    expect(wizard.useWizard.getState()).toMatchObject({ active: true, salary: 500_000 })
    expect(wizard.useWizard.getState().startWrites).toHaveLength(2)
    expect(toasts().at(-1)).toMatch(/^Kreator nie został przerwany – nie da się teraz wycofać: /)
    expect(toasts().at(-1)).toContain('saldo otwarcia „mBank” (czeka na Twoją decyzję o zmianie z drugiego komputera)')
    expect(toasts().at(-1)).toContain('saldo otwarcia „Portfel XTB” (zapisała go nowsza wersja aplikacji)')
    // And the engine never runs from them without the start (`byStart` – T25 skips them).
    expect(fleet.fleetNow()!.started).toBe(false)
    // The decision made, the file this version's again: „Przerwij kreator” takes them back and ends.
    useRemote.setState({ pending: [] })
    data.useData.setState((s) => ({ records: { ...s.records, balances: { ...s.records.balances, [two!.id]: { ...s.records.balances[two!.id]!, readOnly: false } } } }))
    await wizard.cancelWizard()
    expect(list('balances')).toEqual([])
    expect(wizard.useWizard.getState().active).toBe(false)
    expect(toasts().at(-1)).toBe('Kreator przerwany. Rekordy nieudanego startu usunięte z folderu.')
  })

  it('przegląd 2 N5 9: szkic kreatora na tym komputerze – tylko id i znaczniki rekordów startu; po restarcie „Przerwij” je wycofuje', async () => {
    load()
    api.saveSettings.mockRejectedValue(EPERM)
    refuse.set('containers', 'zajęty')
    expect(await finish()).toBe(false)
    const raw = storage.get(`fi.wizard.draft:${DIR}`)!
    const kept = (JSON.parse(raw) as { state: { startWrites: Array<Record<string, unknown>> } }).state.startWrites
    // Before: every record whole, before and after the start (all the payments linked too) – at every answer.
    expect(kept.map((w) => Object.keys(w).sort())).toEqual([['collection', 'id', 'mark', 'proposal']])
    // The proposal is that container in the answers (the next start uses it, never a second).
    expect(wizard.useWizard.getState().cargo).toEqual({})
    // A restart: the answers from the draft – „Przerwij kreator” takes the container back, the proposal back too was the answer.
    wizard.useWizard.setState(wizard.wizardDraftOf(DIR)!)
    refuse.clear()
    await wizard.cancelWizard()
    expect(list('containers')).toEqual([])
    expect(wizard.useWizard.getState().active).toBe(false)
  })

  it('kontener, którego folder nie dał wycofać, po udanym starcie ma połączone płatności jak nowy (T379)', async () => {
    load()
    api.saveSettings.mockRejectedValue(EPERM)
    refuse.set('containers', 'zajęty')
    expect(await finish()).toBe(false)
    const container = list('containers')[0]!.record.id
    // The proposal is that container in the answers; the start runs now – one container, its October payment linked.
    expect(wizard.useWizard.getState()).toMatchObject({ cargo: {}, startContainers: [container] })
    refuse.clear()
    api.saveSettings.mockImplementation(async (f: unknown) => f)
    expect(await finish()).toBe(true)
    expect(list('containers').map((e) => e.record.id)).toEqual([container])
    expect(linked()).toEqual([
      ['2026-10-07', container],
      ['2026-09-07', null]
    ])
  })

  it('saldo nieudanego startu poprawione ręcznie staje się zwykłym saldem (T25) – znacznik `byStart` znika', async () => {
    load()
    api.saveSettings.mockRejectedValue(EPERM)
    refuse.set('balances', 'zajęty')
    expect(await finish()).toBe(false)
    const one = list('balances').find((e) => e.record.accountId === MBANK_ACCOUNT_ID)!.record
    expect([one.byStart, fleet.fleetNow()!.started]).toEqual([true, false])
    // Ustawienia → Konta: the opening set by hand – the user's from now on.
    balances.setOpening(MBANK_ACCOUNT_ID, one.amount, one.date)
    expect(data.useData.getState().records.balances[one.id]!.record.byStart).toBeUndefined()
    expect(fleet.fleetNow()!.started).toBe(true)
  })
})
