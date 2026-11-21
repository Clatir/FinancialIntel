// 1.21.0 Z12 (UX-79, D106 pkt 11, T546): the start wizard opens by itself in a new empty folder – once on this computer,
// never again there (also when it was left without „Uruchom budżet”) – and its first step offers „Szybki start”: the
// balances, the salary and the daily envelopes on one screen, the rest of the start from the wizard's defaults, started
// by the very same „Uruchom budżet” (`finishWizard` → `writeStart`, T446).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppInfo, RecordEntry, Snapshot } from '@shared/api'
import { warsawNow } from '@shared/calc/dates'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { COLLECTIONS } from '@shared/paths'
import { MBANK_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID, envelopeKind, type Category } from '@shared/schema'
import { quickBlockers } from '../../src/renderer/features/wizard/blockers'
import { folderIsEmpty, quickEnvelopes, quickRestLines } from '../../src/renderer/features/wizard/quick'

const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const tray = { closeToTray: false, launchAtLogin: false, autostartAsked: true, notified: false, loginSupported: false }
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: Array<{ id: string }>) => rs.map((r) => ({ id: r.id, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(),
  deleteRecords: vi.fn(),
  historyKeep: vi.fn(),
  folderShown: vi.fn(async () => undefined),
  trayPrefs: vi.fn(async () => tray),
  setTrayPrefs: vi.fn(async () => tray),
  setMachinePrefs: vi.fn(async () => DEFAULT_MACHINE_PREFS)
}
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) })
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const { navigate, useUi } = await import('../../src/renderer/store/ui')
const wizard = await import('../../src/renderer/features/wizard/state')

const FOOD = '01KDEFCAT00000000000000100'
const zl = (g: number) => `${(g / 100).toFixed(2).replace('.', ',')} zł`
const info = (wizardAuto?: boolean): AppInfo => ({ version: '1.21.0', machineName: 'PC', platform: 'win32', userDataDir: '', freeze: { afterOpenMs: 0, quietMs: 0 }, ...(wizardAuto === undefined ? {} : { wizardAuto }) })

/** A folder shown in the window, as an open of it brings it (a new one: fi.json alone). */
function show(dir: string, o: { start?: string; transactions?: number; readOnly?: boolean } = {}): void {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  if (o.start) fi.settings.budget.start = o.start
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  for (let i = 0; i < (o.transactions ?? 0); i++)
    (records.transactions as unknown[]).push(saved({ id: `01KTX0000000000000000000${String(i).padStart(2, '0')}`, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, amount: -1000 }))
  data.applySnapshot({
    fi,
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: dir, available: true, readOnly: !!o.readOnly, readOnlyReason: o.readOnly ? 'Folder jest tylko do odczytu.' : null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
}
const page = () => useUi.getState().route.page
let n = 0
const fresh = () => `C:\\Dane\\Nowy${++n}`

wizard.initWizardAutoOpen()
// Twice (StrictMode runs the effects twice): still one subscription – one opening.
wizard.initWizardAutoOpen()

beforeEach(() => {
  for (const f of Object.values(api)) f.mockClear()
  api.saveSettings.mockImplementation(async (f: unknown) => f)
  storage.clear()
  // A folder with data in between: every test's folder is shown anew.
  data.useData.setState({ appInfo: info() })
  show('C:\\Dane\\Stary', { transactions: 1 })
  wizard.cancelWizard()
  useUi.setState({ route: { page: 'bridge' }, history: [], forward: [], toasts: [] })
})

describe('UX-79: kreator otwiera się sam w nowym pustym folderze – raz', () => {
  it('pusty folder bez startu: kreator na pierwszym kroku, bez szybkiego startu wybranego z góry', () => {
    show(fresh())
    expect(page()).toBe('wizard')
    expect(wizard.useWizard.getState()).toMatchObject({ active: true, step: 0, quick: false, shipName: 'Flagowiec' })
  })

  it('przerwany kreator: ten sam folder pokazany ponownie (drugie uruchomienie) – bez kreatora, baner zostaje', () => {
    const dir = fresh()
    show(dir)
    expect(page()).toBe('wizard')
    wizard.cancelWizard()
    show('C:\\Dane\\Stary', { transactions: 1 })
    show(dir)
    expect(page()).toBe('bridge')
    expect(wizard.useWizard.getState().active).toBe(false)
  })

  it('kreator zostawiony bez zapisu (inny ekran, zamknięte okno): odpowiedzi czekają, ale okno nie przenosi do kreatora', () => {
    const dir = fresh()
    show(dir)
    wizard.patchWizard({ salary: 500_000 })
    navigate({ page: 'bridge' })
    show('C:\\Dane\\Stary', { transactions: 1 })
    show(dir)
    expect(page()).toBe('bridge')
    // The draft is there for the banner's „Wróć do kreatora” (AF-11).
    expect(wizard.useWizard.getState()).toMatchObject({ active: true, salary: 500_000 })
  })

  it('pamięć jest per folder: inny nowy folder też otwiera kreator raz (wielkość liter i ukośnik ścieżki bez znaczenia)', () => {
    const dir = fresh()
    show(dir)
    wizard.cancelWizard()
    show(`${dir.toLowerCase().replace(/\\/g, '/')}/`)
    expect(page()).toBe('bridge')
    show(fresh())
    expect(page()).toBe('wizard')
  })

  it('folder z danymi, działający budżet, wyłączone uruchomienie (testy) – bez kreatora', () => {
    show(fresh(), { transactions: 3 })
    expect(page()).toBe('bridge')
    show(fresh(), { start: warsawNow().date })
    expect(page()).toBe('bridge')
    data.useData.setState({ appInfo: info(false) })
    show(fresh())
    expect(page()).toBe('bridge')
    expect(wizard.useWizard.getState().active).toBe(false)
  })

  it('folder tylko do odczytu: bez kreatora i bez zapamiętania – otworzy się, gdy folder przyjmie zapis', () => {
    const dir = fresh()
    show(dir, { readOnly: true })
    expect(page()).toBe('bridge')
    show('C:\\Dane\\Stary', { transactions: 1 })
    show(dir)
    expect(page()).toBe('wizard')
  })
})

describe('UX-79: „Szybki start” – trzy pola, reszta z wartości domyślnych', () => {
  it('pola kopert: tylko codzienne kategorie główne, bez zarchiwizowanych', () => {
    const cats = createDefaultSettings().settings.categories
    const mains = cats.filter((c) => c.parentId == null)
    expect(quickEnvelopes(mains).map((c) => c.name)).toEqual(['Jedzenie', 'Rozrywka i hobby', 'Osobiste', 'Gotówka'])
    const archived: Category[] = mains.map((c) => (c.name === 'Osobiste' ? { ...c, archived: true } : c))
    expect(quickEnvelopes(archived).map((c) => c.name)).toEqual(['Jedzenie', 'Rozrywka i hobby', 'Gotówka'])
    expect(quickEnvelopes(mains).every((c) => envelopeKind(c) === 'daily')).toBe(true)
  })

  it('czego brakuje „Uruchom budżet” – bez numerów kroków (jeden ekran); podział ponad środki wskazuje pełny kreator', () => {
    expect(quickBlockers({ missing: ['mBank', 'Portfel XTB'], salary: null, overSplit: false })).toEqual(['saldo teraz: mBank, Portfel XTB', 'pensja'])
    expect(quickBlockers({ missing: [], salary: 0, overSplit: false })).toEqual(['pensja'])
    expect(quickBlockers({ missing: [], salary: 500_000, overSplit: false })).toEqual([])
    expect(quickBlockers({ missing: [], salary: 500_000, overSplit: true })).toEqual(['kadłub, cele i zbiorniki w granicach środków (wszystkie kroki – krok 6)'])
  })

  it('reszta startu nazwana na ekranie – nic po cichu', () => {
    expect(
      quickRestLines({ shieldSalaries: 3, hullMonths: 6, shields: 2_000_000, hull: 500_000, others: 0, planned: { count: 0, total: 0 }, containers: 0, autostart: true }, zl)
    ).toEqual([
      'Cele warstw: osłony – 3 pensje, kadłub – 6 miesięcy średnich kosztów.',
      'Podział środków na start: osłony 20000,00 zł, kadłub 5000,00 zł.',
      'Koperty planowe bez kwot – ustawisz je w Planie miesiąca.',
      'Ładownia pusta – stałe opłaty dodasz w Ładowni.',
      'Rozkazy i nazwa okrętu – z ustawień budżetu; start z Windows włączony (Ustawienia → Zasobnik i start).'
    ])
    expect(
      quickRestLines({ shieldSalaries: 1.5, hullMonths: 1, shields: 0, hull: 0, others: 12_000, planned: { count: 2, total: 80_000 }, containers: 1, autostart: false }, zl)
    ).toEqual([
      'Cele warstw: osłony – 1,5 pensji, kadłub – 1 miesiąc średnich kosztów.',
      'Podział środków na start: osłony 0,00 zł, kadłub 0,00 zł, cele i zbiorniki 120,00 zł.',
      'Koperty planowe ze średnich: 2 koperty, razem 800,00 zł.',
      'Ładownia: 1 kontener z wybranych płatności.',
      'Rozkazy i nazwa okrętu – z ustawień budżetu; start z Windows wyłączony (Ustawienia → Zasobnik i start).'
    ])
  })

  it('folder pusty = żaden rekord w żadnej kolekcji', () => {
    const empty = Object.fromEntries(COLLECTIONS.map((c) => [c, {}]))
    expect(folderIsEmpty(empty)).toBe(true)
    expect(folderIsEmpty({ ...empty, balances: { x: saved({ id: 'x' }) } })).toBe(false)
  })

  it('szybki start kończy ta sama droga co „Uruchom budżet”: fi.json ze startem, salda, plan z kopertą codzienną; tryb gaśnie', async () => {
    show(fresh())
    wizard.patchWizard({ quick: true, balances: { [MBANK_ACCOUNT_ID]: 2_500_000, [XTB_WALLET_ACCOUNT_ID]: 0 }, salary: 500_000, envelopes: { [FOOD]: 90_000 } })
    expect(await wizard.finishWizard({ salary: 500_000, hull: 0, goals: {}, tanks: {}, envelopes: { [FOOD]: 90_000 } })).toBe(true)
    const s = data.useData.getState()
    expect(s.fi!.settings.budget.start).toBe(warsawNow().date)
    expect(Object.values(s.records.balances).map((e) => e.record.amount).sort((a, b) => a - b)).toEqual([0, 2_500_000])
    expect(Object.values(s.records.months)[0]!.record).toMatchObject({ salary: 500_000, envelopes: { [FOOD]: 90_000 } })
    // fi.json first (T446): the settings are the first write of the start.
    expect(api.saveSettings.mock.invocationCallOrder[0]!).toBeLessThan(Math.min(...api.saveRecords.mock.invocationCallOrder, ...api.saveRecord.mock.invocationCallOrder))
    expect(wizard.useWizard.getState()).toMatchObject({ active: false, quick: false })
    expect(page()).toBe('bridge')
  })
})
