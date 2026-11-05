// AP-25 / KR.29 (1.15.9, N5 – AF-14): „Uruchom budżet” writes the start whole or not at all. A folder that refuses
// fi.json (the attribute „tylko do odczytu” on the file) leaves no budget running in the window, the answers kept; fi.json
// goes first, so nothing of the start's records was written (przegląd 3 N5 – `n5-review1-fixb-store.test.ts`) – the next
// try writes the start whole, one container.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { warsawNow } from '@shared/calc/dates'
import type { RecurringPayment } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { COLLECTIONS } from '@shared/paths'
import { MBANK_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID } from '@shared/schema'

const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const tray = { closeToTray: false, launchAtLogin: false, autostartAsked: true, notified: false, loginSupported: false }
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: Array<{ id: string }>) => rs.map((r) => ({ id: r.id, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(),
  deleteRecords: vi.fn(),
  historyKeep: vi.fn(),
  trayPrefs: vi.fn(async () => tray),
  setTrayPrefs: vi.fn(async () => tray),
  setMachinePrefs: vi.fn(async () => DEFAULT_MACHINE_PREFS)
}
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) })
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const { useUi } = await import('../../src/renderer/store/ui')
const wizard = await import('../../src/renderer/features/wizard/state')

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

function load(): void {
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  data.applySnapshot({
    fi: createDefaultSettings('2026-01-01T00:00:00.000Z'),
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
}
const toasts = () => useUi.getState().toasts.map((t) => t.text)
const list = <C extends keyof Snapshot['records']>(c: C) => Object.values(data.useData.getState().records[c])
const finish = () => wizard.finishWizard({ salary: 500_000, hull: 0, goals: {}, tanks: {}, envelopes: {} })

beforeEach(() => {
  for (const f of Object.values(api)) f.mockClear()
  api.saveSettings.mockImplementation(async (f: unknown) => f)
  useUi.setState({ toasts: [] })
  storage.clear()
  load()
  wizard.startWizard()
  wizard.patchWizard({ balances: { [MBANK_ACCOUNT_ID]: 1_000_000, [XTB_WALLET_ACCOUNT_ID]: 0 }, salary: 500_000, cargo: { [proposal.key]: proposal }, step: 6 })
})

describe('KR.29: start budżetu w całości albo wcale (AF-14)', () => {
  it('fi.json odrzucony: budżet nie działa w oknie, odpowiedzi zostają, nic ze startu nie zapisane; ponowny start zapisuje go w całości', async () => {
    api.saveSettings.mockRejectedValue(EPERM)
    expect(await finish()).toBe(false)
    // The window shows what the folder has: no start, nothing waiting to be retried for fi.json.
    expect(data.useData.getState().fi!.settings.budget.start).toBeNull()
    expect(data.hasUnsaved()).toBe(false)
    expect(toasts().at(-1)).toMatch(/^Budżet nie wystartował – nie udało się zapisać ustawień w folderze .*Nic ze startu nie trafiło do folderu – odpowiedzi kreatora zostają, ponowne „Uruchom budżet” zacznie od nowa\./)
    expect(toasts().some((t) => t.startsWith('Okręt wypłynął') || t.startsWith('Budżet uruchomiony'))).toBe(false)
    // fi.json goes first (przegląd 3 N5): no opening, plan or container was written – nothing to take back either.
    expect([list('balances'), list('months'), list('containers')]).toEqual([[], [], []])
    expect(api.saveRecord).not.toHaveBeenCalled()
    expect(api.saveRecords).not.toHaveBeenCalled()
    expect(api.deleteRecords).not.toHaveBeenCalled()
    // The answers stay – in the window and on this computer (a restart keeps them), the proposal among them.
    expect(wizard.useWizard.getState()).toMatchObject({ active: true, salary: 500_000, cargo: { [proposal.key]: proposal } })
    expect(wizard.wizardDraftOf('/dane')).toMatchObject({ active: true, salary: 500_000 })

    // The attribute taken off: the next „Uruchom budżet” writes the start whole – one container.
    api.saveSettings.mockImplementation(async (f: unknown) => f)
    expect(await finish()).toBe(true)
    const fi = data.useData.getState().fi!
    expect(fi.settings.budget.start).toBe(warsawNow().date)
    expect(list('containers')).toHaveLength(1)
    expect(list('balances')).toHaveLength(2)
    expect(list('months')).toHaveLength(1)
    expect(wizard.useWizard.getState().active).toBe(false)
    expect(wizard.wizardDraftOf('/dane')).toBeNull()
  })

  it('zmiana sprzed startu, której folder nie przyjmuje: start nie zapisuje niczego i mówi dlaczego', async () => {
    api.saveSettings.mockRejectedValue(EPERM)
    // A member added in step 1 (fi.json) – its write refused.
    data.updateSettings((f) => ({ ...f, settings: { ...f.settings, shipName: 'Sokół' } }))
    await data.flushSaves()
    api.saveRecord.mockClear()
    api.saveRecords.mockClear()
    expect(await finish()).toBe(false)
    expect(api.saveRecord).not.toHaveBeenCalled()
    expect(api.saveRecords).not.toHaveBeenCalled()
    expect(list('balances')).toHaveLength(0)
    expect(list('containers')).toHaveLength(0)
    expect(data.useData.getState().fi!.settings.budget.start).toBeNull()
    expect(toasts().at(-1)).toMatch(/^Budżet nie wystartował – nie udało się zapisać bieżących zmian .*start budżetu czeka/)
    expect(wizard.useWizard.getState()).toMatchObject({ active: true, cargo: { [proposal.key]: proposal } })
  })

  it('podpowiedź przycisku: tylko to, czego brakuje (AF-14 – nie cała lista przy wypełnionych krokach)', () => {
    expect(wizard.finishBlockers({ missing: [], salary: 500_000, overSplit: false })).toEqual([])
    expect(wizard.finishBlockers({ missing: ['mBank'], salary: null, overSplit: false })).toEqual(['saldo teraz (krok 1): mBank', 'pensja (krok 3)'])
    expect(wizard.finishBlockers({ missing: [], salary: 500_000, overSplit: true })).toEqual(['kadłub, cele i zbiorniki w granicach środków (krok 6)'])
  })

  it('przerwanie: ślady kreatora z folderem ICTTJ i importem – i gdzie je usunąć (KR sp. 6)', () => {
    wizard.noteImportTrace(null, '01K9N5IMP00000000000000001')
    wizard.noteImportTrace('01K9N5IMP00000000000000001', '01K9N5IMP00000000000000001')
    wizard.noteTrace(wizard.ICTJ_TRACE)
    const text = wizard.cancelWizardText(wizard.useWizard.getState().traces)
    expect(text).toContain(`Zostaje w folderze: ${wizard.IMPORT_TRACE}, ${wizard.ICTJ_TRACE}`)
    expect(text).toContain('w Ustawieniach, na Mapie gwiezdnej albo w Imporcie („Cofnij import”)')
    expect(wizard.cancelWizardText(['cel „Wakacje”'])).toContain('usuniesz to w Ustawieniach albo na Mapie gwiezdnej.')
  })
})
