/**
 * N5 (1.15.9), the reviews of the window – finding 5 of the first one and the start of the budget (KR.29, T446 – przegląd 3):
 * - 5: „Potwierdź” of a top-up of XTB found only in the bank (DO sp. 12, T438) writes its docking counted from the
 *   operation's arrival (`countedFrom`, T363) – a goal's transfer or a hull top-up made between the import and the click
 *   keeps its place after it: the layers, the firewall's alarm and the game's day are the same before and after;
 * - KR.29 (T446, przegląd 3 N5): „Uruchom budżet” writes fi.json first, and only once the folder took it does the window
 *   get the start together with its records – a refusal leaves nothing of the start in the folder nor in the window
 *   (nothing to take back), a record refused after it is retried while the background writes (the game) wait for it, a slow
 *   folder is awaited, a close in the middle waits for the records (here a small folder answering as the main process).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import type { FleetState } from '@shared/calc/fleet'
import { rateDay } from '@shared/calc/game'
import { transferGoal } from '@shared/calc/goals'
import type { RecurringPayment } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { counterpartyKey } from '@shared/import/classify'
import { COLLECTIONS } from '@shared/paths'
import { balanceSchema, goalSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Balance, type Goal, type MonthPlan, type SettingsFile, type Transaction } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here a mock with a small folder: what was
// written (records and fi.json), the collections whose writes the folder refuses.
const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const disk = new Map<string, Record<string, unknown>>()
const refuse = new Map<string, string>()
let fiOnDisk: SettingsFile | null = null
const onDisk = (c: string, r: { id: string }) => void disk.set(`${c}:${r.id}`, r as Record<string, unknown>)
const tray = { closeToTray: false, launchAtLogin: false, autostartAsked: true, notified: false, loginSupported: false }
const saveRecord = async (c: string, r: { id: string }) => {
  if (refuse.has(c)) throw new Error(refuse.get(c))
  onDisk(c, r)
  return saved(r)
}
const saveRecords = async (c: string, rs: Array<{ id: string }>): Promise<Array<{ id: string; entry?: RecordEntry<unknown>; error?: string }>> =>
  rs.map((r) => {
    if (refuse.has(c)) return { id: r.id, error: refuse.get(c)! }
    onDisk(c, r)
    return { id: r.id, entry: saved(r) }
  })
const saveSettings = async (f: SettingsFile) => {
  fiOnDisk = f
  return f
}
const api = {
  saveRecord: vi.fn(saveRecord),
  saveRecords: vi.fn(saveRecords),
  saveSettings: vi.fn(saveSettings),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: string[]) => ids.map((id) => ({ id }))),
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
const { advancePortion, gameInputOf } = await import('../../src/renderer/store/game')
const { useRemote } = await import('../../src/renderer/store/remote')
const { useUi } = await import('../../src/renderer/store/ui')
const cargo = await import('../../src/renderer/features/cargo/actions')
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
  // A one-off answer a test left unused never reaches the next test.
  api.saveRecord.mockReset().mockImplementation(saveRecord)
  api.saveRecords.mockReset().mockImplementation(saveRecords)
  api.saveSettings.mockReset().mockImplementation(saveSettings)
  useRemote.setState({ pending: [] })
  useUi.setState({ toasts: [] })
  storage.clear()
  disk.clear()
  refuse.clear()
  fiOnDisk = null
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

describe('przegląd 3 N5: start budżetu – najpierw fi.json, potem rekordy startu (KR.29, T446)', () => {
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
  /** The car's insurance once a year: a periodic fee – its tank gets money at the start (N-PC-7). */
  const insurance: RecurringPayment = { ...proposal, key: 'pzu sa', label: 'PZU SA', amount: 120_000, cycleMonths: 12, dueMonth: '2027-03', dueDay: 15, payments: 2, last: '2026-03-15' }
  /** Netflix in October (linked by a start – from the month before it) and in September (not). */
  const october = transactionSchema.parse({ ...base(), date: '2026-10-07', accountId: MBANK_ACCOUNT_ID, amount: -4999, counterparty: 'NETFLIX.COM' })
  const september = transactionSchema.parse({ ...base(), date: '2026-09-07', accountId: MBANK_ACCOUNT_ID, amount: -4999, counterparty: 'NETFLIX.COM' })
  const DIR = '/dane-n5r3'

  /** A folder before the start (no `budget.start`): the wizard with every answer, at its last step; its files on the disk. */
  function load(o: { balances?: Balance[]; months?: MonthPlan[]; cargo?: RecurringPayment[] } = {}): void {
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
    const cargo = Object.fromEntries((o.cargo ?? [proposal]).map((p) => [p.key, p]))
    wizard.patchWizard({ balances: { [MBANK_ACCOUNT_ID]: 1_000_000, [XTB_WALLET_ACCOUNT_ID]: 0 }, salary: 500_000, cargo, step: 6 })
  }
  const list = <C extends keyof Snapshot['records']>(c: C) => Object.values(data.useData.getState().records[c])
  const finish = (tanks: Record<string, number> = {}) => wizard.finishWizard({ salary: 500_000, hull: 0, goals: {}, tanks, envelopes: {} })
  const linked = () => list('transactions').map((e) => [e.record.date, e.record.containerId ?? null])
  /** What of the start is in the folder: its records' files by collection (the operations were there before). */
  const startFiles = () =>
    [...disk.keys()]
      .filter((k) => !k.startsWith('transactions:'))
      .map((k) => k.split(':')[0])
      .sort()
  /** The moments of the folder's writes of records (`invocationCallOrder`) – each after fi.json's. */
  const recordWrites = () => [...api.saveRecord.mock.invocationCallOrder, ...api.saveRecords.mock.invocationCallOrder]
  const held = () => !data.writesInBackground(data.useData.getState())

  it('fi.json odrzucony: w folderze nie ma nic ze startu – nic nie zapisane, nic do wycofania; silnik nie startuje, odpowiedzi zostają', async () => {
    load()
    api.saveSettings.mockRejectedValue(EPERM)
    expect(await finish()).toBe(false)
    // Nothing of the start in the window either – nothing to take back, nothing waiting to be written.
    expect(data.useData.getState().fi!.settings.budget.start).toBeNull()
    expect(data.hasUnsaved()).toBe(false)
    // Before (przegląd 2): the openings, the plan and the container written before fi.json and deleted after the refusal –
    // a deletion that could read a cached file, miss a file still there, or meet another computer's version (przegląd 3).
    expect(api.saveRecord).not.toHaveBeenCalled()
    expect(api.saveRecords).not.toHaveBeenCalled()
    expect(api.deleteRecords).not.toHaveBeenCalled()
    expect(startFiles()).toEqual([])
    expect([list('balances'), list('months'), list('containers')]).toEqual([[], [], []])
    expect(linked()).toEqual([
      ['2026-10-07', null],
      ['2026-09-07', null]
    ])
    expect(fleet.fleetNow()!.started).toBe(false)
    expect(toasts().at(-1)).toMatch(/^Budżet nie wystartował – nie udało się zapisać ustawień w folderze \(.+\)\. Nic ze startu nie trafiło do folderu – odpowiedzi kreatora zostają, ponowne „Uruchom budżet” zacznie od nowa\.$/)
    expect(wizard.useWizard.getState()).toMatchObject({ active: true, salary: 500_000, cargo: { [proposal.key]: proposal } })
    expect(wizard.wizardDraftOf(DIR)).toMatchObject({ active: true, salary: 500_000 })
    expect(held()).toBe(false)
    // „Przerwij kreator” says the truth (N4): the answers go – nothing of the start to take back.
    expect(wizard.cancelWizardText(wizard.useWizard.getState().traces)).toBe('Odpowiedzi kreatora (salda, plan, wybór kontenerów) przepadną, budżet się nie uruchomi.')
    wizard.cancelWizard()
    expect(wizard.useWizard.getState().active).toBe(false)
    expect(wizard.wizardDraftOf(DIR)).toBeNull()
    expect(api.deleteRecords).not.toHaveBeenCalled()
  })

  it('ponowne „Uruchom budżet” po odmowie: start w całości – fi.json przed rekordami, po jednym kontenerze, płatność połączona, zbiornik pod id kontenera', async () => {
    load({ cargo: [proposal, insurance] })
    api.saveSettings.mockRejectedValueOnce(EPERM)
    expect(await finish({ [insurance.key]: 30_000 })).toBe(false)
    expect(startFiles()).toEqual([])
    expect(await finish({ [insurance.key]: 30_000 })).toBe(true)
    // One container a proposal – never a second (before: a container of a refused start left behind had to be found again).
    const containers = list('containers').map((e) => e.record)
    expect(containers.map((c) => c.counterparty).sort()).toEqual(['NETFLIX.COM', 'PZU SA'])
    expect(startFiles()).toEqual(['balances', 'balances', 'containers', 'containers', 'months'])
    const netflix = containers.find((c) => c.counterparty === 'NETFLIX.COM')!
    const pzu = containers.find((c) => c.counterparty === 'PZU SA')!
    expect(linked()).toEqual([
      ['2026-10-07', netflix.id],
      ['2026-09-07', null]
    ])
    // fi.json on the disk before any record of the start – with the tank of a container written after it (its id known).
    expect(fiOnDisk!.settings.budget).toMatchObject({ start: DAY, initial: { tanks: { [pzu.id]: 30_000 } } })
    expect(Math.min(...recordWrites())).toBeGreaterThan(api.saveSettings.mock.invocationCallOrder.at(-1)!)
    const state = fleet.fleetNow()!
    expect(state.started).toBe(true)
    expect(state.tanks.find((t) => t.containerId === pzu.id)).toBeDefined()
    expect(toasts().at(-1)).toBe('Okręt wypłynął: budżet działa od dziś.')
    expect(held()).toBe(false)
  })

  it('saldo otwarcia i plan sprzed kreatora: odmowa fi.json zostawia je nietknięte, udany start je zmienia', async () => {
    // An opening typed in Settings before the wizard (N23) and this month's plan.
    const mine = balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })
    const plan = monthPlanSchema.parse({ ...base(), id: '01KMTH00000000000000202611', month: '2026-11', salary: zl(3000), envelopes: {} })
    load({ balances: [mine], months: [plan] })
    api.saveSettings.mockRejectedValueOnce(EPERM)
    expect(await finish()).toBe(false)
    expect(list('balances').map((e) => e.record)).toEqual([mine])
    expect(list('months').map((e) => e.record.salary)).toEqual([zl(3000)])
    expect(api.saveRecord).not.toHaveBeenCalled()
    expect(await finish()).toBe(true)
    expect(list('balances').find((e) => e.record.id === mine.id)!.record).toMatchObject({ amount: 1_000_000, date: DAY })
    expect(list('months').map((e) => e.record.salary)).toEqual([500_000])
  })

  it('okno zamykane w trakcie startu: zamknięcie czeka na rekordy startu – w folderze nigdy fi.json bez nich', async () => {
    load()
    let take!: () => void
    api.saveSettings.mockImplementationOnce((f: SettingsFile) => new Promise<SettingsFile>((resolve) => (take = () => resolve(saveSettings(f)))))
    const done = finish()
    await vi.waitFor(() => expect(api.saveSettings).toHaveBeenCalled())
    const closing = data.flushForClose()
    take()
    const r = await closing
    expect(r.saved).toBe(true)
    expect(fiOnDisk!.settings.budget.start).toBe(DAY)
    expect(startFiles()).toEqual(['balances', 'balances', 'containers', 'months'])
    expect(await done).toBe(true)
  })

  describe('ponowienia i wolny folder (zegar udawany)', () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }))
    afterEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-11-03T19:00:00.000Z'))
    })

    it('fi.json przyjęty, saldo odrzucone: saldo czeka i ponawia się samo, komunikat to mówi, gra nie startuje ani nie zamraża dni do jego zapisu', async () => {
      load()
      refuse.set('balances', 'EBUSY: resource busy or locked')
      expect(await finish()).toBe(true)
      // The budget runs: fi.json, the plan and the container on the disk; the openings wait – unsaved, with the folder's reason.
      expect(fiOnDisk!.settings.budget.start).toBe(DAY)
      expect(startFiles()).toEqual(['containers', 'months'])
      const openings = list('balances').map((e) => e.record)
      expect(openings).toHaveLength(2)
      for (const b of openings) expect(data.unsavedOf('balances', b.id)).toContain('zajęty')
      expect(toasts().at(-1)).toMatch(/^Budżet uruchomiony – część zmian nie zapisała się jeszcze w folderze \(.+\) – aplikacja ponawia zapis automatycznie\.$/)
      // The window counts the budget from them meanwhile; the folder does not have them yet – nothing in the background: the
      // game neither starts nor freezes a day (without the wait it would write its start at once).
      expect(fleet.fleetNow()!.started).toBe(true)
      expect(held()).toBe(true)
      expect(advancePortion(null, new Date('2026-11-07T12:00:00.000Z'))).toBe(false)
      expect(data.useData.getState().fi!.settings.game.start).toBeNull()
      // Retried by itself, still refused: still waited for.
      await vi.advanceTimersByTimeAsync(5_000)
      expect(startFiles()).toEqual(['containers', 'months'])
      expect(held()).toBe(true)
      // The folder takes them at the next retry: the background writes go on – the game starts the next day.
      refuse.clear()
      await vi.advanceTimersByTimeAsync(20_000)
      expect(startFiles()).toEqual(['balances', 'balances', 'containers', 'months'])
      expect(data.hasUnsaved()).toBe(false)
      expect(held()).toBe(false)
      advancePortion(null)
      expect(data.useData.getState().fi!.settings.game.start).toBe('2026-11-04')
    })

    it('fi.json zapisuje się dłużej niż 15 s: komunikat, start czeka na odpowiedź folderu – nic ze startu przed nią; odmowa po czasie – nic ze startu', async () => {
      load()
      let refuseNow!: (e: unknown) => void
      api.saveSettings.mockImplementationOnce(() => new Promise<SettingsFile>((_, reject) => (refuseNow = reject)))
      const done = finish()
      await vi.advanceTimersByTimeAsync(15_000)
      expect(toasts()).toContain(wizard.SLOW_START_TEXT)
      // Before: after 15 s the start went on – its records made and written whatever the folder answered later.
      await vi.advanceTimersByTimeAsync(45_000)
      expect([list('balances'), list('months'), list('containers')]).toEqual([[], [], []])
      expect(api.saveRecord).not.toHaveBeenCalled()
      expect(api.saveRecords).not.toHaveBeenCalled()
      // The window has no start either while the folder has not answered: the engine, the game and the notifications see
      // the folder as it is (before: the budget ran in the window without the openings); the background writes wait for
      // the start's answer (przegląd 4 N5 1).
      expect(data.useData.getState().fi!.settings.budget.start).toBeNull()
      expect(fleet.fleetNow()!.started).toBe(false)
      expect(held()).toBe(true)
      refuseNow(EPERM)
      expect(await done).toBe(false)
      expect(startFiles()).toEqual([])
      expect(data.useData.getState().fi!.settings.budget.start).toBeNull()
      expect(data.hasUnsaved()).toBe(false)
      expect(toasts().at(-1)).toMatch(/^Budżet nie wystartował – nie udało się zapisać ustawień w folderze \(.+\)\. Nic ze startu nie trafiło do folderu/)
      expect(held()).toBe(false)
    })

    it('fi.json przyjęty po czasie: start kończy się, rekordy zapisane po nim', async () => {
      load()
      let take!: () => void
      api.saveSettings.mockImplementationOnce((f: SettingsFile) => new Promise<SettingsFile>((resolve) => (take = () => resolve(saveSettings(f)))))
      const done = finish()
      await vi.advanceTimersByTimeAsync(20_000)
      expect(toasts()).toContain(wizard.SLOW_START_TEXT)
      expect(list('balances')).toEqual([])
      expect(data.useData.getState().fi!.settings.budget.start).toBeNull()
      take()
      expect(await done).toBe(true)
      expect(data.useData.getState().fi!.settings.budget.start).toBe(DAY)
      expect(startFiles()).toEqual(['balances', 'balances', 'containers', 'months'])
      expect(Math.min(...recordWrites())).toBeGreaterThan(api.saveSettings.mock.invocationCallOrder.at(-1)!)
      expect(toasts().at(-1)).toBe('Okręt wypłynął: budżet działa od dziś.')
    })
  })

  describe('przegląd 4 N5: start niedokończony, decyzja o fi.json, inny folder, rekordy sprawdzone przed fi.json, kontener z czasu czekania', () => {
    /** The folder shown again (a restart, the window closed „bez zapisu”): what its disk has – the window's memory gone. */
    function reopen(dir = DIR): void {
      const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
      for (const [k, r] of disk) {
        const c = k.slice(0, k.indexOf(':')) as keyof Snapshot['records']
        ;(records[c] as unknown[]).push(entry(c, r as { id: string }))
      }
      data.applySnapshot({
        fi: fiOnDisk ?? createDefaultSettings(AT),
        records,
        problems: [],
        conflicts: [],
        status: { dataDir: dir, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
        loadMs: 0
      })
    }
    const kept = () => storage.get(`fi.start.left:${DIR}`)
    /** fi.json's write waiting for the folder's answer: the returned function answers it. */
    function slowSettings(): () => void {
      let take!: () => void
      api.saveSettings.mockImplementationOnce((f: SettingsFile) => new Promise<SettingsFile>((resolve) => (take = () => resolve(saveSettings(f)))))
      return () => take()
    }

    it('1: zapisy w tle wstrzymane przez cały zapis fi.json, a fi.json własnego zapisu z main nie wchodzi do okna przed rekordami – bez drugiego zapisu', async () => {
      load()
      const during: unknown[] = []
      api.saveSettings.mockImplementationOnce(async (f: SettingsFile) => {
        // Main sends the change of its own write before it answers (`sendFrom` – a change set that carries fi.json).
        data.applyChange({ upserts: [], removals: [], fi: f, problems: [], conflicts: [], status: data.useData.getState().status!, origin: 'local' })
        advancePortion(null)
        const s = data.useData.getState()
        during.push(held(), s.fi!.settings.budget.start, s.fi!.settings.game.start)
        return saveSettings(f)
      })
      expect(await finish()).toBe(true)
      // Before: the background writes free during the write, the start in the window before its openings (the game wrote
      // its start), fi.json written a second time.
      expect(during).toEqual([true, null, null])
      await data.flushSaves()
      expect(api.saveSettings).toHaveBeenCalledTimes(1)
      expect(list('balances')).toHaveLength(2)
    })

    it('2: unsavedOf zna fi.json (Synchronizacja – własna niezapisana wersja ustawień przed decyzją konfliktu)', async () => {
      load()
      api.saveSettings.mockRejectedValue(EPERM)
      data.updateSettings((f) => ({ ...f, settings: { ...f.settings, shipName: 'Sokół' } }))
      await data.flushSaves()
      expect(data.unsavedOf('fi', 'fi')).toContain('nie pozwala')
    })

    it('3: rekordy startu zostają na tym komputerze, aż każdy jest w folderze; po ponownym otwarciu baner „Dokończ” zapisuje tylko brakujące', async () => {
      load()
      refuse.set('balances', 'EBUSY: resource busy or locked')
      expect(await finish()).toBe(true)
      expect(
        data.useData
          .getState()
          .startLeft!.records.map((r) => r.collection)
          .sort()
      ).toEqual(['balances', 'balances', 'containers', 'months', 'transactions'])
      expect(kept()).toBeDefined()
      // The window closed without them („Zamknij mimo to”): the folder shown again – fi.json with the start, no openings.
      reopen()
      expect(list('balances')).toEqual([])
      const s = data.useData.getState()
      expect(s.startMissing.map((k) => k.slice(0, k.indexOf(':')))).toEqual(['balances', 'balances'])
      expect(wizard.startLeftText(s.startLeft!, s.startMissing)).toBe(
        'Start budżetu niedokończony – w folderze brakuje: saldo otwarcia „mBank”, saldo otwarcia „Portfel XTB”. Do ich zapisu gra, cele ICTTJ i rozliczenia czekają.'
      )
      // Before: the budget ran from today without its openings, the game free to start – nothing told.
      expect(held()).toBe(true)
      advancePortion(null)
      expect(data.useData.getState().fi!.settings.game.start).toBeNull()
      // „Dokończ”: only what the folder lacks – the plan and the container there are not written again.
      refuse.clear()
      api.saveRecord.mockClear()
      api.saveRecords.mockClear()
      await wizard.finishStart()
      expect(startFiles()).toEqual(['balances', 'balances', 'containers', 'months'])
      expect([...api.saveRecord.mock.calls, ...api.saveRecords.mock.calls].map(([c]) => c)).toEqual(['balances', 'balances'])
      expect(toasts().at(-1)).toBe('Start budżetu dokończony – salda otwarcia, plan i kontenery są w folderze.')
      expect([data.useData.getState().startLeft, data.useData.getState().startMissing, kept(), held()]).toEqual([null, [], undefined, false])
    })

    it('3: start zapisany w całości – nic nie zostaje na tym komputerze, po ponownym otwarciu bez banera', async () => {
      load()
      expect(await finish()).toBe(true)
      expect([data.useData.getState().startLeft, kept()]).toEqual([null, undefined])
      reopen()
      expect([data.useData.getState().startLeft, data.useData.getState().startMissing, held()]).toEqual([null, [], false])
    })

    it('5: decyzja o zmianie fi.json z drugiego komputera czeka – start odmawia z komunikatem, nic nie zapisane', async () => {
      load()
      const fi = data.useData.getState().fi!
      useRemote.setState({ pending: [{ key: 'fi:fi', collection: 'fi', id: 'fi', type: 'update', base: fi, theirs: { ...fi, updatedBy: 'LAPTOP' }, hadLocalEdits: false, receivedAt: '2026-11-03T18:59:00.000Z' }] })
      expect(await finish()).toBe(false)
      // Before: fi.json written over the version waiting for the decision, unseen.
      expect(api.saveSettings).not.toHaveBeenCalled()
      expect(toasts().at(-1)).toBe(
        'Budżet nie wystartował – czeka Twoja decyzja o zmianie ustawień z drugiego komputera (okno decyzji jest otwarte). Nic ze startu nie trafiło do folderu – odpowiedzi kreatora zostają, ponowne „Uruchom budżet” zacznie od nowa.'
      )
      expect([startFiles(), kept(), data.useData.getState().fi!.settings.budget.start]).toEqual([[], undefined, null])
    })

    it('6: inny folder pokazany w trakcie zapisu: prawdziwy komunikat, rekordy startu czekają na tamten folder – „Dokończ” po jego otwarciu', async () => {
      load()
      const take = slowSettings()
      const done = finish()
      await vi.waitFor(() => expect(api.saveSettings).toHaveBeenCalled())
      reopen('/inny')
      take()
      expect(await done).toBe(false)
      // Before: „Nic ze startu nie trafiło do folderu” – while that folder's fi.json had the start.
      expect(toasts().at(-1)).toBe(
        'Budżet wystartował w poprzednim folderze (ustawienia zapisane), ale w trakcie pokazano inny folder – salda otwarcia, plan i kontenery startu dopisze baner „Dokończ” po ponownym otwarciu tamtego folderu.'
      )
      expect(data.useData.getState().startLeft).toBeNull()
      expect(kept()).toBeDefined()
      reopen()
      expect(data.useData.getState().startMissing).toHaveLength(4)
      await wizard.finishStart()
      expect(startFiles()).toEqual(['balances', 'balances', 'containers', 'months'])
      expect(linked()).toEqual([
        ['2026-10-07', list('containers')[0]!.record.id],
        ['2026-09-07', null]
      ])
      expect([data.useData.getState().startLeft, kept()]).toEqual([null, undefined])
    })

    it('7: rekord startu, którego nie przyjmuje schemat – start odmawia przed zapisem fi.json, nic nie zapisane', async () => {
      load({ cargo: [{ ...proposal, key: 'bez nazwy', label: '' }] })
      // Before: fi.json written first, then the container's schema threw – the start in the folder without its records.
      expect(await finish()).toBe(false)
      expect(api.saveSettings).not.toHaveBeenCalled()
      expect(toasts().at(-1)).toBe('Budżet nie wystartował – nie da się zapisać rekordu startu: kontener „” (pole name). Nic ze startu nie trafiło do folderu – odpowiedzi kreatora zostają.')
      expect([startFiles(), kept(), data.useData.getState().fi!.settings.budget.start, held()]).toEqual([[], undefined, null, false])
    })

    it('8: rekord startu czekający na decyzję o zmianie z drugiego komputera – zapisy w tle nie czekają dłużej, komunikat mówi dlaczego', async () => {
      load()
      refuse.set('months', 'EBUSY: resource busy or locked')
      expect(await finish()).toBe(true)
      expect(held()).toBe(true)
      // Another computer's plan of the month arrives; this one's is not written – the decision waits (both changed it).
      const plan = list('months')[0]!.record
      data.applyChange({
        upserts: [{ collection: 'months', entry: { record: { ...plan, salary: 700_000, updatedBy: 'LAPTOP', updatedAt: '2026-11-03T19:00:05.000Z' }, relPath: 'months/2026-11.json', readOnly: false } }],
        removals: [],
        fi: null,
        problems: [],
        conflicts: [],
        status: data.useData.getState().status!,
        origin: 'external'
      })
      expect(useRemote.getState().pending.map((p) => p.key)).toEqual([`months:${plan.id}`])
      // Before: the background writes held for the whole session, nothing said.
      expect(held()).toBe(false)
      expect(toasts().at(-1)).toBe(
        'Start budżetu: folder ma już swoją wersję części rekordów startu (czeka na Twoją decyzję o zmianie z drugiego komputera) – gra, cele ICTTJ i rozliczenia nie czekają na nie dłużej.'
      )
      expect([data.useData.getState().startLeft, kept()]).toEqual([null, undefined])
    })

    it('9: kontener odbiorcy dodany w czasie czekania na fi.json – start go używa (bez drugiego), zbiornik przechodzi na niego', async () => {
      const pzu: RecurringPayment = { ...insurance, key: counterpartyKey('PZU SA') }
      load({ cargo: [pzu] })
      const take = slowSettings()
      const done = finish({ [pzu.key]: 30_000 })
      await vi.waitFor(() => expect(api.saveSettings).toHaveBeenCalled())
      // Ładownia meanwhile: the payee's container added by hand.
      const mine = cargo.addContainer({ ...cargo.draftFromPayment(pzu), name: 'Ubezpieczenie auta' })!
      take()
      expect(await done).toBe(true)
      // Before: a second container of the payee – the start's matched its payees before the wait.
      expect(list('containers').map((e) => e.record.id)).toEqual([mine])
      await data.flushSaves()
      expect(fiOnDisk!.settings.budget.initial!.tanks).toEqual({ [mine]: 30_000 })
      expect(held()).toBe(false)
    })

    it('10: płatności połączone przez start też czekają na zapis (klucze zapisów przed i po zrobieniu rekordów)', async () => {
      load()
      refuse.set('transactions', 'EBUSY: resource busy or locked')
      expect(await finish()).toBe(true)
      expect(held()).toBe(true)
      refuse.clear()
      await data.flushSaves()
      expect(held()).toBe(false)
    })
  })
})

describe('przegląd 3 N5: magazyn okna – zapisy startu budżetu (T446)', () => {
  /** An empty folder (nothing to write). */
  function load(dir = '/dane-n5r3-store'): void {
    const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
    data.applySnapshot({
      fi: createDefaultSettings(AT),
      records,
      problems: [],
      conflicts: [],
      status: { dataDir: dir, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
      loadMs: 0
    })
  }
  const opening = () => balanceSchema.parse({ ...base(), date: DAY, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(100) })
  const startOn = (f: SettingsFile): SettingsFile => ({ ...f, settings: { ...f.settings, budget: { ...f.settings.budget, start: DAY } } })
  /** A start of the given openings: kept before fi.json, made once it is on the disk. */
  const start = (openings: Balance[] = []) =>
    data.writeStart({
      update: startOn,
      start: DAY,
      records: openings.map((record) => ({ collection: 'balances' as const, record })),
      apply: () => {
        for (const b of openings) data.addRecord('balances', b)
      },
      limitMs: 15_000,
      slow: () => undefined
    })
  const held = () => !data.writesInBackground(data.useData.getState())
  /** fi.json's write waiting for the folder's answer: `take` answers it. */
  function slowSettings(): () => void {
    let take!: () => void
    api.saveSettings.mockImplementationOnce((f: SettingsFile) => new Promise<SettingsFile>((resolve) => (take = () => resolve(saveSettings(f)))))
    return () => take()
  }

  it('okno nie ma nic ze startu przed odpowiedzią folderu; zapis wszystkiego (zamknięcie okna, inny folder, Ctrl+S) czeka na nią i zapisuje rekordy startu', async () => {
    load()
    const take = slowSettings()
    const b = opening()
    const started = start([b])
    let flushed = false
    const flush = data.flushSaves().then(() => (flushed = true))
    for (let i = 0; i < 20; i++) await Promise.resolve()
    expect(flushed).toBe(false)
    expect(data.useData.getState().fi!.settings.budget.start).toBeNull()
    expect(data.useData.getState().records.balances[b.id]).toBeUndefined()
    take()
    await flush
    // The flush answers with the start's record on the disk – never fi.json alone.
    expect(disk.has(`balances:${b.id}`)).toBe(true)
    expect(await started).toEqual({ kind: 'started' })
    expect(data.useData.getState().fi!.settings.budget.start).toBe(DAY)
  })

  it('zmiana fi.json w oknie w trakcie zapisu startu zostaje – start nałożony na nią, zapisany razem z nią', async () => {
    load()
    const take = slowSettings()
    const started = start()
    await vi.waitFor(() => expect(api.saveSettings).toHaveBeenCalled())
    data.updateSettings((f) => ({ ...f, settings: { ...f.settings, shipName: 'Sokół' } }))
    take()
    expect(await started).toEqual({ kind: 'started' })
    expect(data.useData.getState().fi!.settings).toMatchObject({ shipName: 'Sokół', budget: { start: DAY } })
    await data.flushSaves()
    expect(fiOnDisk!.settings).toMatchObject({ shipName: 'Sokół', budget: { start: DAY } })
    expect(data.hasUnsaved()).toBe(false)
  })

  it('rekordy startu: zapisy w tle czekają, aż każdy jest w folderze – zapisany, usunięty albo pokazanie innego folderu zwalnia', async () => {
    load()
    refuse.set('balances', 'EBUSY: resource busy or locked')
    const b = opening()
    expect(await start([b])).toEqual({ kind: 'started' })
    expect(held()).toBe(true)
    await data.flushSaves()
    // Refused: still waited for.
    expect(data.unsavedOf('balances', b.id)).not.toBeNull()
    expect(held()).toBe(true)
    refuse.clear()
    await data.flushSaves()
    expect(held()).toBe(false)
    // Deleted before it was written: nothing to wait for – nor to bring back.
    refuse.set('balances', 'EBUSY: resource busy or locked')
    const c = opening()
    await start([c])
    await data.flushSaves()
    expect(held()).toBe(true)
    await data.deleteRecord('balances', c.id)
    expect([held(), data.useData.getState().startLeft]).toEqual([false, null])
    // Another folder shown: the wait of this one's start is over there (it waits for this folder, on this computer).
    const d = opening()
    await start([d])
    await data.flushSaves()
    expect(held()).toBe(true)
    load('/inny-n5r3')
    expect(held()).toBe(false)
  })
})
