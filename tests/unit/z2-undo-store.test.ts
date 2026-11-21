/**
 * Z2 (1.21.0, D106, T536) – „Cofnij” and summaries in the window's store:
 * - UX-7: „Koperty ze średnich” – „Cofnij” sets back each envelope's limit from before (`setProposedEnvelopes`, as
 *   `copyOnward`); a limit changed since stays, said (`undoKept`); a plan of its own the proposal made (T46) goes while it
 *   is still just that (as `decideLoot` – review of the group);
 * - UX-8: the loot split – one line of what goes where (`lootSplitText`) and „Cofnij” giving the month's plan back as it
 *   was before (`decideLoot`): the decision from before, or no plan of its own when the decision made it;
 * - UX-9: „Pomiń wpis” in the docking window – a toast with „Cofnij” bringing the entry back (`skipDelivery`).
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Snapshot } from '@shared/api'
import { addMonths, warsawNow } from '@shared/calc/dates'
import { lootDecision, monthPlanId } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import type { IctjEntry } from '@shared/ictj'
import { COLLECTIONS } from '@shared/paths'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, type MonthPlan } from '@shared/schema'

const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, list: Array<{ id: string }>) => list.map((record) => ({ record, relPath: `${record.id}.json`, readOnly: false }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined)
}
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: api })
// Now: Wednesday 4 November 2026, noon in Warsaw.
vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
vi.setSystemTime(new Date('2026-11-04T11:00:00.000Z'))
afterAll(() => vi.useRealTimers())
const data = await import('../../src/renderer/store/data')
const month = await import('../../src/renderer/features/month/actions')
const dock = await import('../../src/renderer/features/dock/actions')
const { useRemote } = await import('../../src/renderer/store/remote')
const { useUi } = await import('../../src/renderer/store/ui')

const zl = (v: number) => Math.round(v * 100)
/** The app's thousands are split by a no-break space („1 000,00”). */
const nb = (text: string) => text.replace(/(\d) (\d{3})/g, '$1\u00a0$2')
const AT = '2026-01-01T00:00:00.000Z'
const NOW = warsawNow()
const BEFORE = addMonths(NOW.month, -1)
const EARLIER = addMonths(NOW.month, -2)
const FOOD = defaultCategoryId(1)
const HOME = defaultCategoryId(2)
const FUN = defaultCategoryId(6)
const GOAL = '01K9Z2G0000000000000000001'
let seq = 0
const nextId = () => `01K9Z2T000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const plan = (m: string, over: Partial<MonthPlan> = {}): MonthPlan => monthPlanSchema.parse({ ...base(), id: monthPlanId(m), month: m, salary: zl(4000), envelopes: {}, ...over })

/**
 * A budget from the month before last's 1st with the plans given (default: that month's – the others live on it);
 * `readOnly` – the folder only to look at, `ask` – the other computers' changes wait for a decision.
 */
function open(plans: MonthPlan[] = [plan(EARLIER)], { readOnly = false, ask = false } = {}): void {
  const fi = createDefaultSettings(AT)
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const entry = <T extends { id: string }>(dir: string, record: T) => ({ record, relPath: `${dir}/${record.id}.json`, readOnly: false })
  records.balances = [entry('balances', balanceSchema.parse({ ...base(), date: `${EARLIER}-01`, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) }))]
  records.months = plans.map((p) => entry('months', p))
  const s0 = fi.settings
  data.applySnapshot({
    fi: { ...fi, settings: { ...s0, budget: { ...s0.budget, start: `${EARLIER}-01` }, sync: { ...s0.sync, remoteChanges: ask ? 'ask' : s0.sync.remoteChanges } } },
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane-z2', available: true, readOnly, readOnlyReason: readOnly ? 'Folder danych tylko do odczytu.' : null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
  useUi.setState({ toasts: [] })
  useRemote.setState({ pending: [] })
}
beforeEach(() => {
  api.deleteRecord.mockClear()
  api.saveRecord.mockClear()
  api.saveSettings.mockClear()
})

const own = (m: string) => data.useData.getState().records.months[monthPlanId(m)]?.record as (MonthPlan & Record<string, unknown>) | undefined
const toasts = () => useUi.getState().toasts
const toastOf = (start: string) => toasts().find((t) => t.text.startsWith(start))
const undo = (start: string) => toastOf(start)!.action!.run()

/** A month's plan written by another computer: `record` – as it arrives (the folder's watcher, OneDrive). */
function arrives(record: Record<string, unknown>): void {
  data.applyChange({
    upserts: [{ collection: 'months', entry: { record: record as MonthPlan, relPath: `months/${record.month}.json`, readOnly: false } }],
    removals: [],
    fi: null,
    problems: [],
    conflicts: [],
    status: data.useData.getState().status!,
    origin: 'external'
  })
}

describe('UX-7: „Koperty ze średnich” z „Cofnij” – limity sprzed propozycji wracają (jak „Kopiuj dalej”)', () => {
  const TEXT = 'Koperty ze średnich z 3 mies. (sierpień, wrzesień, październik).'

  it('własny plan miesiąca: zmienione koperty wracają do limitów sprzed, nowa koperta znika, pozostałe bez zmian', () => {
    open([plan(EARLIER), plan(NOW.month, { envelopes: { [FOOD]: zl(300), [HOME]: zl(200) } })])
    expect(month.setProposedEnvelopes(NOW.month, { [FOOD]: zl(780), [FUN]: zl(150), [HOME]: zl(200) }, TEXT)).toBe(true)
    expect(own(NOW.month)!.envelopes).toEqual({ [FOOD]: zl(780), [HOME]: zl(200), [FUN]: zl(150) })
    const t = toastOf(TEXT)!
    // Before: the toast had no „Cofnij” – the hand-set limits were gone.
    expect(t.action?.label).toBe('Cofnij')
    t.action!.run()
    expect(own(NOW.month)!.envelopes).toEqual({ [FOOD]: zl(300), [HOME]: zl(200) })
  })

  it('miesiąc na wcześniejszym planie: propozycja założyła jego plan – „Cofnij” go usuwa (miesiąc znowu na planie w mocy, jak przy łupach)', async () => {
    open([plan(EARLIER, { envelopes: { [FOOD]: zl(500) } })])
    expect(own(NOW.month)).toBeUndefined()
    month.setProposedEnvelopes(NOW.month, { [FOOD]: zl(780), [FUN]: zl(150) }, TEXT)
    expect(own(NOW.month)!.envelopes).toEqual({ [FOOD]: zl(780), [FUN]: zl(150) })
    expect(await data.writeNow('months', monthPlanId(NOW.month))).toBe(true)
    undo(TEXT)
    // Before: the copy stayed with the limits from before – the month pinned to it (T46), the earlier plan's changes lost to it.
    expect(own(NOW.month)).toBeUndefined()
    await vi.waitFor(() => expect(api.deleteRecord).toHaveBeenCalledWith('months', monthPlanId(NOW.month)))
    expect(own(EARLIER)!.envelopes).toEqual({ [FOOD]: zl(500) })
  })

  it('założony plan zmieniony od tego czasu (pensja) – zostaje, limity wracają do tych z planu w mocy', async () => {
    open([plan(EARLIER, { envelopes: { [FOOD]: zl(500) } })])
    month.setProposedEnvelopes(NOW.month, { [FOOD]: zl(780), [FUN]: zl(150) }, TEXT)
    month.setSalary(NOW.month, zl(4500))
    await data.writeNow('months', monthPlanId(NOW.month))
    undo(TEXT)
    expect(own(NOW.month)).toMatchObject({ salary: zl(4500), envelopes: { [FOOD]: zl(500) } })
    expect(api.deleteRecord).not.toHaveBeenCalled()
  })

  it('założony plan z limitem zmienionym od tego czasu – zostaje ten limit (ze słowem), reszta wraca', () => {
    open([plan(EARLIER, { envelopes: { [FOOD]: zl(500) } })])
    month.setProposedEnvelopes(NOW.month, { [FOOD]: zl(780), [FUN]: zl(150) }, TEXT)
    month.setEnvelope(NOW.month, FUN, zl(200))
    undo(TEXT)
    expect(own(NOW.month)!.envelopes).toEqual({ [FOOD]: zl(500), [FUN]: zl(200) })
    expect(toasts().map((x) => x.text)).toContain('Cofnięte koperty: 1; zmienione od tego czasu zostają, jak są: 1.')
    expect(api.deleteRecord).not.toHaveBeenCalled()
  })

  it('założony plan usunięty w tym czasie (drugi komputer) – „Cofnij” nie zakłada go od nowa', async () => {
    open([plan(EARLIER, { envelopes: { [FOOD]: zl(500) } })])
    month.setProposedEnvelopes(NOW.month, { [FOOD]: zl(780), [FUN]: zl(150) }, TEXT)
    await data.writeNow('months', monthPlanId(NOW.month))
    data.applyChange({ upserts: [], removals: [{ collection: 'months', id: monthPlanId(NOW.month) }], fi: null, problems: [], conflicts: [], status: data.useData.getState().status!, origin: 'external' })
    expect(own(NOW.month)).toBeUndefined()
    api.saveRecord.mockClear()
    undo(TEXT)
    expect(own(NOW.month)).toBeUndefined()
    expect(data.hasUnsaved()).toBe(false)
  })

  it('limit zmieniony po propozycji zostaje – ze słowem; reszta wraca', () => {
    open([plan(EARLIER), plan(NOW.month, { envelopes: { [FOOD]: zl(300) } })])
    month.setProposedEnvelopes(NOW.month, { [FOOD]: zl(780), [FUN]: zl(150) }, TEXT)
    month.setEnvelope(NOW.month, FOOD, zl(900))
    undo(TEXT)
    expect(own(NOW.month)!.envelopes).toEqual({ [FOOD]: zl(900) })
    expect(toasts().map((x) => x.text)).toContain('Cofnięte koperty: 1; zmienione od tego czasu zostają, jak są: 1.')
  })

  it('propozycja równa planowi: nic nie zapisuje, bez „Cofnij” – i mówi, że limity bez zmian', () => {
    open([plan(EARLIER, { envelopes: { [FOOD]: zl(780) } })])
    expect(month.setProposedEnvelopes(NOW.month, { [FOOD]: zl(780) }, TEXT)).toBe(true)
    // Before: a copy of the plan in force made the month's own plan (T46) – for nothing.
    expect(own(NOW.month)).toBeUndefined()
    expect(data.hasUnsaved()).toBe(false)
    const t = toasts().at(-1)!
    expect(t.text).toBe(`${TEXT.slice(0, -1)} – limity bez zmian.`)
    expect(t.action).toBeUndefined()
  })

  it('folder tylko do odczytu: nic nie zapisuje, bez toastu sukcesu', () => {
    open([plan(EARLIER)], { readOnly: true })
    expect(month.setProposedEnvelopes(NOW.month, { [FOOD]: zl(780) }, TEXT)).toBe(false)
    expect(toastOf(TEXT)).toBeUndefined()
  })
})

describe('UX-8: podział łupów – linia podsumowania i „Cofnij” przywracające plan miesiąca sprzed decyzji', () => {
  it('linia podsumowania w kolejności silnika (cele, zapas kopert, następny miesiąc), reszta do osłon zawsze', () => {
    expect(month.lootSplitText({ goals: zl(300), envelopes: zl(50), nextMonth: zl(200), shields: zl(450) })).toBe('300,00 zł → cele · 50,00 zł → zapas kopert · 200,00 zł → następny miesiąc · 450,00 zł → osłony')
    expect(month.lootSplitText({ goals: 0, envelopes: 0, nextMonth: zl(200), shields: zl(800) })).toBe('200,00 zł → następny miesiąc · 800,00 zł → osłony')
    expect(month.lootSplitText({ goals: 0, envelopes: 0, nextMonth: 0, shields: zl(1000) })).toBe(nb('1 000,00 zł → osłony'))
  })

  it('własny plan miesiąca bez decyzji: toast z podziałem i „Cofnij” – decyzja znika, plik zostaje', () => {
    open([plan(EARLIER), plan(BEFORE, { note: 'październik' })])
    expect(month.decideLoot(BEFORE, zl(1000), { nextMonth: zl(200), goals: { [GOAL]: zl(300) } })).toBe(true)
    expect(own(BEFORE)!.loot).toMatchObject({ nextMonth: zl(200), goals: { [GOAL]: zl(300) }, shields: zl(500) })
    const t = toastOf('Podział łupów')!
    expect(t.text).toBe('Podział łupów zatwierdzony: 300,00 zł → cele · 200,00 zł → następny miesiąc · 500,00 zł → osłony.')
    // Before: no toast at all – the decision could not be taken back.
    expect(t.action?.label).toBe('Cofnij')
    t.action!.run()
    expect(own(BEFORE)).toMatchObject({ loot: null, note: 'październik', salary: zl(4000) })
    expect(api.deleteRecord).not.toHaveBeenCalled()
  })

  it('miesiąc na wcześniejszym planie: decyzja założyła jego plan – „Cofnij” go usuwa (miesiąc znowu na planie w mocy)', async () => {
    open([plan(EARLIER, { envelopes: { [FOOD]: zl(500) } })])
    month.decideLoot(BEFORE, zl(1000), { nextMonth: zl(200), goals: {} })
    expect(own(BEFORE)).toMatchObject({ month: BEFORE, envelopes: { [FOOD]: zl(500) }, loot: { nextMonth: zl(200), shields: zl(800) } })
    expect(await data.writeNow('months', monthPlanId(BEFORE))).toBe(true)
    undo('Podział łupów')
    expect(own(BEFORE)).toBeUndefined()
    await vi.waitFor(() => expect(api.deleteRecord).toHaveBeenCalledWith('months', monthPlanId(BEFORE)))
  })

  it('założony plan zmieniony od tego czasu (notatka z drugiego komputera) – zostaje, znika tylko decyzja', async () => {
    open([plan(EARLIER)])
    month.decideLoot(BEFORE, zl(1000), { nextMonth: zl(200), goals: {} })
    await data.writeNow('months', monthPlanId(BEFORE))
    arrives({ ...own(BEFORE)!, updatedAt: '2026-11-04T11:00:05.000Z', updatedBy: 'LAPTOP', note: 'Premia' })
    undo('Podział łupów')
    expect(own(BEFORE)).toMatchObject({ note: 'Premia', loot: null })
    expect(api.deleteRecord).not.toHaveBeenCalled()
  })

  it('założony plan ze zmianą z drugiego komputera czekającą na decyzję – plik zostaje, znika tylko decyzja', async () => {
    open([plan(EARLIER)], { ask: true })
    month.decideLoot(BEFORE, zl(1000), { nextMonth: zl(200), goals: {} })
    await data.writeNow('months', monthPlanId(BEFORE))
    arrives({ ...own(BEFORE)!, updatedAt: '2026-11-04T11:00:05.000Z', updatedBy: 'LAPTOP', salary: zl(4500) })
    expect(useRemote.getState().pending.map((p) => p.id)).toEqual([monthPlanId(BEFORE)])
    undo('Podział łupów')
    expect(own(BEFORE)).toMatchObject({ loot: null })
    expect(useRemote.getState().pending.map((p) => p.id)).toEqual([monthPlanId(BEFORE)])
    expect(api.deleteRecord).not.toHaveBeenCalled()
  })

  it('zmiana podziału: „Cofnij” przywraca poprzednią decyzję', () => {
    const was = lootDecision(zl(1000), { nextMonth: zl(100), goals: {} }, '2026-11-02T08:00:00.000Z')
    open([plan(EARLIER), plan(BEFORE, { loot: was })])
    month.decideLoot(BEFORE, zl(1000), { nextMonth: zl(600), goals: {} })
    expect(own(BEFORE)!.loot).toMatchObject({ nextMonth: zl(600), shields: zl(400) })
    undo('Podział łupów')
    expect(own(BEFORE)!.loot).toEqual(was)
  })

  it('decyzja zmieniona od tego czasu (drugi podział) – „Cofnij” pierwszego nic nie cofa, ze słowem', () => {
    open([plan(EARLIER), plan(BEFORE)])
    month.decideLoot(BEFORE, zl(1000), { nextMonth: zl(200), goals: {} })
    const first = toastOf('Podział łupów')!
    useUi.setState({ toasts: [] })
    vi.setSystemTime(new Date('2026-11-04T11:05:00.000Z'))
    month.decideLoot(BEFORE, zl(1000), { nextMonth: zl(700), goals: {} })
    first.action!.run()
    expect(own(BEFORE)!.loot).toMatchObject({ nextMonth: zl(700) })
    expect(toasts().map((x) => x.text)).toContain('Nic nie cofnięto – zmieniło się od tego czasu i zostaje, jak jest.')
    vi.setSystemTime(new Date('2026-11-04T11:00:00.000Z'))
  })

  it('„Cofnij” woła `onUndo` (szkic podziału wraca na ekran) – tylko gdy coś cofnięto', async () => {
    open([plan(EARLIER), plan(BEFORE)])
    const back = vi.fn()
    month.decideLoot(BEFORE, zl(1000), { nextMonth: zl(200), goals: {} }, back)
    undo('Podział łupów')
    expect(back).toHaveBeenCalledTimes(1)
    // Taken back on another computer meanwhile: nothing to give back – the draft stays as it is.
    const again = vi.fn()
    useUi.setState({ toasts: [] })
    month.decideLoot(BEFORE, zl(1000), { nextMonth: zl(300), goals: {} }, again)
    await data.writeNow('months', monthPlanId(BEFORE))
    arrives({ ...own(BEFORE)!, updatedAt: '2026-11-04T11:00:05.000Z', updatedBy: 'LAPTOP', loot: null })
    undo('Podział łupów')
    expect(again).not.toHaveBeenCalled()
  })

  it('folder tylko do odczytu: nic nie zapisuje, bez toastu', () => {
    open([plan(EARLIER), plan(BEFORE)], { readOnly: true })
    expect(month.decideLoot(BEFORE, zl(1000), { nextMonth: zl(200), goals: {} })).toBe(false)
    expect(toastOf('Podział łupów')).toBeUndefined()
  })
})

describe('UX-9: „Pomiń wpis” w dokowaniu – toast z „Cofnij” przywracającym wpis', () => {
  const e: IctjEntry = { id: '01K9Z2PAY00000000000000001', kind: 'withdrawal', date: '2026-10-30', amount: zl(1200), pool: 'current', note: '', updatedAt: null }
  const skipped = () => data.useData.getState().fi!.settings.ictj.skipped

  it('wpis pominięty, „Cofnij” go przywraca (`skipEntry(id, false)`)', () => {
    open()
    expect(dock.skipDelivery({ entry: e, transaction: null, direction: 'in' })).toBe(true)
    expect(skipped()).toEqual([e.id])
    const t = toastOf('Pominięto wpis')!
    expect(t.text).toBe(nb('Pominięto wpis z ICTTJ: 1 200,00 zł z 30.10.2026 – FI nie będzie go dokować.'))
    // Before: the window closed without a word – brought back only from the folded list („przywróć”).
    expect(t.action?.label).toBe('Cofnij')
    t.action!.run()
    expect(skipped()).toEqual([])
  })

  it('wpis z parą w banku – toast mówi, że wpływ (wypływ przy zwrocie) zostaje w budżecie zwykłą kolejnością', () => {
    open()
    dock.skipDelivery({ entry: e, transaction: { date: '2026-10-31' } as never, direction: 'in' })
    expect(toastOf('Pominięto wpis')!.text).toBe(nb('Pominięto wpis z ICTTJ: 1 200,00 zł z 30.10.2026 – wpływ w banku zostaje w budżecie zwykłą kolejnością dokowania.'))
    // A return to the trading capital paired with the bank's outflow: its own word.
    open()
    dock.skipDelivery({ entry: { ...e, kind: 'return' }, transaction: { date: '2026-10-31' } as never, direction: 'out' })
    expect(toastOf('Pominięto wpis')!.text).toBe(nb('Pominięto wpis z ICTTJ: 1 200,00 zł z 30.10.2026 – wypływ w banku zostaje w budżecie zwykłą kolejnością dokowania.'))
  })

  it('wpis przywrócony już inaczej („przywróć” w panelu) – „Cofnij” nic nie zapisuje', () => {
    open()
    dock.skipDelivery({ entry: e, transaction: null, direction: 'in' })
    dock.skipEntry(e.id, false)
    api.saveSettings.mockClear()
    const before = data.useData.getState().fi
    undo('Pominięto wpis')
    expect(data.useData.getState().fi).toBe(before)
    expect(skipped()).toEqual([])
  })

  it('folder tylko do odczytu: nic nie pomija, bez toastu sukcesu', () => {
    open(undefined, { readOnly: true })
    expect(dock.skipDelivery({ entry: e, transaction: null, direction: 'in' })).toBe(false)
    expect(skipped()).toEqual([])
    expect(toastOf('Pominięto wpis')).toBeUndefined()
  })
})
