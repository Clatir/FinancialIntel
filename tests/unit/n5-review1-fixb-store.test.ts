/**
 * N5 (1.15.9), the xhigh review in the window – findings 5 and 2:
 * - 5: „Potwierdź” of a top-up of XTB found only in the bank (DO sp. 12, T438) writes its docking counted from the
 *   operation's arrival (`countedFrom`, T363) – a goal's transfer or a hull top-up made between the import and the click
 *   keeps its place after it: the layers, the firewall's alarm and the game's day are the same before and after;
 * - 2: a start the folder refused (KR.29, T446) leaves none of its records – no opening the engine would run from without
 *   the start (T25), no plan, no container, no payment linked to one; what the folder would not let go is kept with the
 *   answers, said, and „Przerwij kreator” takes it back.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import type { FleetState } from '@shared/calc/fleet'
import { rateDay } from '@shared/calc/game'
import { transferGoal } from '@shared/calc/goals'
import type { RecurringPayment } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { COLLECTIONS } from '@shared/paths'
import { balanceSchema, goalSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Goal, type MonthPlan, type Transaction } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here a mock that takes every write.
const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const tray = { closeToTray: false, launchAtLogin: false, autostartAsked: true, notified: false, loginSupported: false }
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: Array<{ id: string }>): Promise<Array<{ id: string; entry?: RecordEntry<unknown>; error?: string }>> => rs.map((r) => ({ id: r.id, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: string[], _reason?: string): Promise<Array<{ id: string; error?: string }>> => ids.map((id) => ({ id }))),
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
const { useUi } = await import('../../src/renderer/store/ui')
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
  api.saveSettings.mockImplementation(async (f: unknown) => f)
  api.deleteRecords.mockImplementation(async (_c: string, ids: string[]) => ids.map((id) => ({ id })))
  useUi.setState({ toasts: [] })
  storage.clear()
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

describe('przegląd N5 2: start odrzucony przez folder nie zostawia rekordów startu (KR.29, T446)', () => {
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
  /** Netflix in October (linked by the start – from the month before it) and in September (not). */
  const october = transactionSchema.parse({ ...base(), date: '2026-10-07', accountId: MBANK_ACCOUNT_ID, amount: -4999, counterparty: 'NETFLIX.COM' })
  const september = transactionSchema.parse({ ...base(), date: '2026-09-07', accountId: MBANK_ACCOUNT_ID, amount: -4999, counterparty: 'NETFLIX.COM' })
  const DIR = '/dane-n5r2'

  /** A folder before the start (no `budget.start`, no opening): the wizard with every answer, at its last step. */
  function load(): void {
    const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
    records.transactions = [entry('transactions', october), entry('transactions', september)]
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
  /** The deletions asked of the folder: collection, ids, reason. */
  const deletions = () => api.deleteRecords.mock.calls.map(([c, ids, reason]) => [c, ids.length, reason])

  it('fi.json odrzucony: salda otwarcia, plan, kontener i połączenie płatności wycofane – silnik nie rusza, „przepadną” mówi prawdę', async () => {
    load()
    api.saveSettings.mockRejectedValue(EPERM)
    expect(await finish()).toBe(false)
    expect(data.useData.getState().fi!.settings.budget.start).toBeNull()
    // Before: the openings (dated today), the plan and the container stayed – the engine ran from the openings (T25).
    expect(list('balances')).toEqual([])
    expect(list('months')).toEqual([])
    expect(list('containers')).toEqual([])
    expect(linked()).toEqual([
      ['2026-10-07', null],
      ['2026-09-07', null]
    ])
    expect(fleet.fleetNow()!.started).toBe(false)
    // Taken back as the start's own (to the history, not the user's deletion), and the payment's link given back on the disk.
    expect(deletions()).toEqual(expect.arrayContaining([['balances', 2, 'undo'], ['months', 1, 'undo'], ['containers', 1, 'undo']]))
    expect(data.hasUnsaved()).toBe(false)
    expect(toasts().at(-1)).toMatch(/^Budżet nie wystartował – nie udało się zapisać ustawień w folderze \(system nie pozwala na tę operację.*\)\. Zapisane już salda otwarcia, plan i kontenery wycofano – w folderze nie ma nic ze startu/)
    // The answers stay – the proposal too (its container went): the question at „Przerwij” says only what is true.
    const w = wizard.useWizard.getState()
    expect(w).toMatchObject({ active: true, salary: 500_000, cargo: { [proposal.key]: proposal }, startWrites: [] })
    expect(wizard.cancelWizardText(w.traces, wizard.startWriteLabels(w.startWrites))).toBe('Odpowiedzi kreatora (salda, plan, wybór kontenerów) przepadną, budżet się nie uruchomi.')

    // The folder takes fi.json again: the next „Uruchom budżet” writes the start whole – one container, its payment linked.
    api.saveSettings.mockImplementation(async (f: unknown) => f)
    expect(await finish()).toBe(true)
    expect(data.useData.getState().fi!.settings.budget.start).toBe(DAY)
    expect(list('balances')).toHaveLength(2)
    expect(list('months')).toHaveLength(1)
    expect(list('containers')).toHaveLength(1)
    const container = list('containers')[0]!.record.id
    expect(linked()).toEqual([
      ['2026-10-07', container],
      ['2026-09-07', null]
    ])
    expect(fleet.fleetNow()!.started).toBe(true)
  })

  it('rekordy startu odrzucone przy zapisie: wycofane z okna – autozapis ich później nie zapisze', async () => {
    load()
    // The folder takes the payments, refuses the openings, the plan and the container.
    api.saveRecords.mockImplementation(async (c: string, rs: Array<{ id: string }>) => rs.map((r) => (c === 'transactions' ? { id: r.id, entry: saved(r) } : { id: r.id, error: 'EPERM: operation not permitted' })))
    api.saveRecord.mockImplementation(async (c: string, r: unknown) => {
      if (c !== 'transactions') throw EPERM
      return saved(r)
    })
    expect(await finish()).toBe(false)
    expect([list('balances'), list('months'), list('containers')]).toEqual([[], [], []])
    expect(linked().map(([, c]) => c)).toEqual([null, null])
    // Nothing of the start waits to be written (before: retried by the autosave – a budget running from them later).
    expect(data.hasUnsaved()).toBe(false)
    expect(toasts().at(-1)).toMatch(/^Budżet nie wystartował – nie udało się zapisać rekordów startu w folderze \(system nie pozwala na tę operację.*\)\. Zapisane już salda otwarcia, plan i kontenery wycofano/)
    expect(fleet.fleetNow()!.started).toBe(false)
    api.saveRecords.mockImplementation(async (_c: string, rs: Array<{ id: string }>) => rs.map((r) => ({ id: r.id, entry: saved(r) })))
    api.saveRecord.mockImplementation(async (_c: string, r: unknown) => saved(r))
  })

  it('folder nie pozwala wycofać kontenera: zostaje z płatnością, zapamiętany i nazwany; „Przerwij kreator” go usuwa', async () => {
    load()
    api.saveSettings.mockRejectedValue(EPERM)
    api.deleteRecords.mockImplementation(async (c: string, ids: string[]) => ids.map((id) => (c === 'containers' ? { id, error: 'Nie udało się usunąć pliku containers/x.json (zajęty przez inny program?)' } : { id })))
    expect(await finish()).toBe(false)
    expect([list('balances'), list('months')]).toEqual([[], []])
    const container = list('containers')[0]!.record.id
    // The container and its payment stay together – the next start uses them, never a second container.
    expect(linked()).toEqual([
      ['2026-10-07', container],
      ['2026-09-07', null]
    ])
    expect(toasts().at(-1)).toContain('Nie udało się wycofać z folderu: kontener „NETFLIX.COM”, 1 płatność połączona z kontenerem (Nie udało się usunąć pliku containers/x.json')
    expect(toasts().at(-1)).toMatch(/„Przerwij kreator” albo ponowny start spróbuje jeszcze raz\. Resztę rekordów startu wycofano\.$/)
    const w = wizard.useWizard.getState()
    expect(w.startWrites.map((x) => x.collection).sort()).toEqual(['containers', 'transactions'])
    // The proposal is that container in the answers (T446): the step of the cargo does not count it twice.
    expect(w.cargo).toEqual({})
    // Kept on this computer too: a restart knows what to take back.
    expect(wizard.wizardDraftOf(DIR)?.startWrites).toHaveLength(2)
    const text = wizard.cancelWizardText(w.traces, wizard.startWriteLabels(w.startWrites))
    expect(text).toContain('Zapisane już w folderze rekordy nieudanego startu (kontener „NETFLIX.COM”, 1 płatność połączona z kontenerem) kreator usunie')

    // „Przerwij kreator” while the folder still holds the file: the wizard stays – nothing said done that is not.
    await wizard.cancelWizard()
    expect(wizard.useWizard.getState()).toMatchObject({ active: true, salary: 500_000 })
    expect(wizard.useWizard.getState().startWrites).toHaveLength(2)
    expect(toasts().at(-1)).toMatch(/^Kreator nie został przerwany – nie udało się wycofać z folderu: kontener „NETFLIX.COM”, 1 płatność połączona z kontenerem \(.*\) – spróbuj ponownie za chwilę\.$/)

    // Again, the folder letting go: the container goes, its payment is let go.
    api.deleteRecords.mockImplementation(async (_c: string, ids: string[]) => ids.map((id) => ({ id })))
    await wizard.cancelWizard()
    expect(list('containers')).toEqual([])
    expect(linked().map(([, c]) => c)).toEqual([null, null])
    expect(wizard.useWizard.getState().active).toBe(false)
    expect(wizard.wizardDraftOf(DIR)).toBeNull()
    expect(toasts().at(-1)).toBe('Kreator przerwany. Rekordy nieudanego startu usunięte z folderu.')
  })

  it('druga odmowa wycofuje kontener zostawiony przez pierwszą – propozycja wraca do odpowiedzi (wybór nie ginie)', async () => {
    load()
    api.saveSettings.mockRejectedValue(EPERM)
    api.deleteRecords.mockImplementation(async (c: string, ids: string[]) => ids.map((id) => (c === 'containers' ? { id, error: 'zajęty' } : { id })))
    expect(await finish()).toBe(false)
    expect(wizard.useWizard.getState().cargo).toEqual({})
    // The folder lets the container go now, fi.json still refused: the next start is refused again, all of it taken back.
    api.deleteRecords.mockImplementation(async (_c: string, ids: string[]) => ids.map((id) => ({ id })))
    expect(await finish()).toBe(false)
    expect([list('balances'), list('months'), list('containers')]).toEqual([[], [], []])
    expect(linked().map(([, c]) => c)).toEqual([null, null])
    expect(wizard.useWizard.getState()).toMatchObject({ cargo: { [proposal.key]: proposal }, startWrites: [] })
  })

  it('zmienione od startu zostaje, jak jest: plan poprawiony po odmowie – „Przerwij” go nie usuwa i to mówi', async () => {
    load()
    api.saveSettings.mockRejectedValue(EPERM)
    api.deleteRecords.mockImplementation(async (c: string, ids: string[]) => ids.map((id) => (c === 'months' ? { id, error: 'zajęty' } : { id })))
    expect(await finish()).toBe(false)
    const plan = list('months')[0]!.record
    // The user changes the plan left in the folder: from now on it is theirs.
    data.updateRecord('months', plan.id, (p) => ({ ...p, salary: 600_000 }))
    api.deleteRecords.mockImplementation(async (_c: string, ids: string[]) => ids.map((id) => ({ id })))
    await wizard.cancelWizard()
    expect(list('months').map((e) => e.record.salary)).toEqual([600_000])
    expect(toasts().at(-1)).toBe('Kreator przerwany. Zmienione od tego czasu zostają, jak są: plan miesiąca (listopad 2026).')
  })
})
