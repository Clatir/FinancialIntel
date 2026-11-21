// Z8 (1.21.0, UX-39): the numbers of the bar at the bottom of the import – what the import makes and how many of those
// operations come in without a category. The store talks to the main process through window.fi: a mock writing nothing.
import { describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { importGroups } from '@shared/import/reconcile'
import { COLLECTIONS } from '@shared/paths'
import { listaCsv } from '../e2e/mbank-csv'

vi.stubGlobal('window', { fi: { saveRecord: vi.fn(), saveRecords: vi.fn(), saveSettings: vi.fn(), deleteRecord: vi.fn(), deleteRecords: vi.fn(), historyKeep: vi.fn(), historyDeleted: vi.fn(async () => []), folderShown: vi.fn(async () => undefined) } })
const data = await import('../../src/renderer/store/data')
const state = await import('../../src/renderer/features/import/state')
const { previewCounts, uncategorizedIn } = await import('../../src/renderer/features/import/counts')

const status = (): FolderStatus => ({ dataDir: '/dane-z8', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null })
function open(): void {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  data.applySnapshot({ fi, records, problems: [], conflicts: [], status: status(), loadMs: 0 })
}
const s = () => state.useImport.getState()
const groups = () => importGroups(s().plan, s().choices.restoreDeleted)
const unknown = () => groups().find((g) => g.names.some((n) => n.includes('ZZ SKLEP')))!
const counted = () => uncategorizedIn(s().plan!, s().choices, groups())
const CSV = () =>
  listaCsv(
    [
      { date: '2026-10-03', amount: 16.16, name: 'ZZ SKLEP TESTOWY' },
      { date: '2026-10-04', amount: 9, name: 'ZZ SKLEP TESTOWY' }
    ],
    { from: '2026-10-01', to: '2026-10-31' },
    null
  )
const topCategory = () => data.useData.getState().fi!.settings.categories.find((c) => !c.archived && !c.parentId)!.id

describe('pasek importu: licznik „bez decyzji” (UX-39)', () => {
  it('wydatek bez kategorii liczy się, dopóki nie dostanie decyzji; pominięty i z kategorią – nie', async () => {
    open()
    await state.loadImportFile('lista.csv', new TextEncoder().encode(CSV()))
    expect(previewCounts(s().plan!, s().choices)).toMatchObject({ created: 2, total: 2, nothing: false })
    expect(counted()).toBe(2)
    // One row left out: it does not come in at all.
    state.setSkip([unknown().rows[0]!.key], true)
    expect(previewCounts(s().plan!, s().choices).total).toBe(1)
    expect(counted()).toBe(1)
    // The group decided as an expense with a category: nothing is left without one.
    const g = unknown()
    state.decideGroup(g.group, { ...g.proposed, kind: 'expense', categoryId: topCategory() })
    expect(counted()).toBe(0)
  })

  it('decyzja na jednym wierszu grupy zdejmuje z licznika tylko ten wiersz', async () => {
    open()
    await state.loadImportFile('lista.csv', new TextEncoder().encode(CSV()))
    const g = unknown()
    state.chooseRow(g.rows[0]!.key, { ...g.proposed, kind: 'expense', categoryId: topCategory() })
    expect(counted()).toBe(1)
  })
})
