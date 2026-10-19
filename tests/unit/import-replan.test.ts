import { describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import type { ImportRule, SettingsFile } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here it is a mock.
const api = {
  saveRecord: vi.fn(),
  saveRecords: vi.fn(),
  saveSettings: vi.fn(),
  deleteRecord: vi.fn(),
  deleteRecords: vi.fn(),
  historyKeep: vi.fn(),
  historyDeleted: vi.fn(async () => []),
  folderShown: vi.fn(async () => undefined)
}
vi.stubGlobal('window', { fi: api })
// Every plan counted: the import screen plans again only when what the plan reads changed (W18).
const planned = vi.fn()
vi.mock('@shared/import/reconcile', async (original) => {
  const m = await original<typeof import('@shared/import/reconcile')>()
  return { ...m, planImport: (...args: Parameters<typeof m.planImport>) => (planned(), m.planImport(...args)) }
})
const data = await import('../../src/renderer/store/data')
const state = await import('../../src/renderer/features/import/state')

const NOW = '2026-10-17T09:00:00.000Z'
/** A list of operations of two purchases (the format of `tests/fixtures/mbank`). */
const CSV = [
  'mBank S.A. Bankowość Detaliczna;;;',
  ';;;',
  '#Klient;;;',
  'JAN KAPITAN;;;',
  ';;;',
  'Lista operacji;;;',
  ';;;',
  '#Za okres:;;;',
  '01.10.2025;31.10.2025;;',
  ';;;',
  '#Data operacji;#Opis operacji;#Kategoria;#Kwota',
  `03.10.2025;LIDL  ZAKUP PRZY UŻYCIU KARTY W KRAJU${' '.repeat(50)};Żywność i chemia domowa;-16,16 PLN`,
  `05.10.2025;KAWIARNIA MOKKA  ZAKUP PRZY UŻYCIU KARTY W KRAJU${' '.repeat(50)};Jedzenie poza domem;-20,00 PLN`
].join('\r\n')

const status = (): FolderStatus => ({ dataDir: '/dane', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null })

function open(): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  data.applySnapshot({ fi, records, problems: [], conflicts: [], status: status(), loadMs: 0 })
}

/** The settings' import part changed in memory as a save or a sync would bring it. */
function setImport(patch: (i: SettingsFile['settings']['import']) => SettingsFile['settings']['import']): void {
  data.useData.setState((s) => ({ fi: { ...s.fi!, settings: { ...s.fi!.settings, import: patch(s.fi!.settings.import) } } }))
}

describe('ekran importu: plan znowu tylko przy zmianie treści (W18)', () => {
  it('te same reguły, nazwy i domownicy w nowych obiektach – bez nowego planu; słowo kluczowe – nowy plan', async () => {
    open()
    await state.loadImportFile('lista.csv', new TextEncoder().encode(CSV))
    expect(state.useImport.getState().plan).not.toBeNull()
    expect(planned).toHaveBeenCalledTimes(1)
    // Another part of the import's settings changed („to nie to samo”), its rules copied as a save or a sync makes them.
    setImport((i) => ({ ...i, notSimilar: { 'a|b': NOW }, rules: i.rules.map((r) => ({ ...r })), aliases: { ...i.aliases }, ownNames: [...i.ownNames] }))
    data.useData.setState((s) => ({ fi: { ...s.fi!, settings: { ...s.fi!.settings, household: { ...s.fi!.settings.household, members: s.fi!.settings.household.members.map((m) => ({ ...m })) } } } }))
    state.replanIfChanged(state.planInputsNow())
    expect(planned).toHaveBeenCalledTimes(1)
    // Once kept, the new objects are compared by reference again.
    state.replanIfChanged(state.planInputsNow())
    expect(planned).toHaveBeenCalledTimes(1)
    // A keyword of the user's: planned again.
    const kw: ImportRule = { id: '01K9KW0000000000000000000A', match: 'lidl', mode: 'keyword', direction: 'out', label: 'lidl', kind: 'expense', categoryId: null, refundable: false, household: false, memberId: null, counterAccountId: null, learned: false, hits: 0, updatedAt: NOW }
    setImport((i) => ({ ...i, rules: [...i.rules, kw] }))
    state.replanIfChanged(state.planInputsNow())
    expect(planned).toHaveBeenCalledTimes(2)
  })
})
