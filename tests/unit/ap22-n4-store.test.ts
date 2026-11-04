import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordEntry, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { contentHash, undoPlan } from '@shared/import/batch'
import { COLLECTIONS } from '@shared/paths'
import { containerSchema, defaultCategoryId, importBatchSchema, importRuleSchema, SCHEMA_VERSION, transactionSchema, type Container, type ImportRule, type Transaction } from '@shared/schema'

// The renderer's stores talk to the main process through window.fi (preload); here a mock that takes every write.
const saved = <T,>(r: T): RecordEntry<T> => ({ record: r, relPath: 'x.json', readOnly: false })
const api = {
  saveRecord: vi.fn(async (_c: string, r: unknown) => saved(r)),
  saveRecords: vi.fn(async (_c: string, rs: unknown[]) => rs.map((r) => ({ ok: true, entry: saved(r) }))),
  saveSettings: vi.fn(async (f: unknown) => f),
  deleteRecord: vi.fn(),
  deleteRecords: vi.fn(),
  historyKeep: vi.fn(),
  historyList: vi.fn(async () => [] as unknown[])
}
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const rules = await import('../../src/renderer/features/import/rules')
const cargo = await import('../../src/renderer/features/cargo/actions')
const inbox = await import('../../src/renderer/features/inbox/state')
const wizard = await import('../../src/renderer/features/wizard/state')
const batches = await import('../../src/renderer/features/import/batches')

const NOW = '2026-10-01T10:00:00.000Z'
const FUEL = defaultCategoryId(3, 1)
const rule = (id: string, label: string): ImportRule => importRuleSchema.parse({ id, match: label.toLowerCase(), mode: 'contains', direction: 'out', label, kind: 'expense', categoryId: FUEL, learned: false, hits: 0, updatedAt: NOW })
const CID = '01K7S000000000000000000C01'
const container = (over: Partial<Container> = {}): Container => containerSchema.parse({ schemaVersion: SCHEMA_VERSION, createdAt: NOW, updatedAt: NOW, id: CID, name: 'Netflix', amount: 4300, cycleMonths: 1, dueMonth: '2026-10', amountAt: NOW, ...over })

function load(over: { rules?: ImportRule[]; containers?: Container[]; settings?: (s: ReturnType<typeof createDefaultSettings>['settings']) => ReturnType<typeof createDefaultSettings>['settings'] } = {}): void {
  const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.containers = (over.containers ?? []).map((c) => ({ record: c, relPath: `containers/${c.id}.json`, readOnly: false }))
  const settings = over.settings ? over.settings(fi.settings) : fi.settings
  data.applySnapshot({
    fi: { ...fi, settings: { ...settings, import: { ...settings.import, rules: over.rules ?? settings.import.rules } } },
    records,
    problems: [],
    conflicts: [],
    status: { dataDir: '/dane', available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null },
    loadMs: 0
  })
}
const imp = () => data.useData.getState().fi!.settings.import
const lastToast = () => ui.useUi.getState().toasts.at(-1)!

beforeEach(() => {
  ui.useUi.setState({ toasts: [] })
})

describe('AP-22: usunięcie, rozłączenie i zrzut z „Cofnij”', () => {
  it('usunięta reguła wraca na swoje miejsce; po jej powrocie inną drogą „Cofnij” nie dubluje (AF-29)', () => {
    load({ rules: [rule('01K7R0000000000000000000A1', 'Orlen'), rule('01K7R0000000000000000000A2', 'Shell'), rule('01K7R0000000000000000000A3', 'BP')] })
    rules.removeRule('01K7R0000000000000000000A2')
    expect(imp().rules.map((r) => r.label)).toEqual(['Orlen', 'BP'])
    expect(lastToast().text).toContain('„Shell” usunięta')
    expect(lastToast().action?.label).toBe('Cofnij')
    lastToast().action!.run()
    expect(imp().rules.map((r) => r.label)).toEqual(['Orlen', 'Shell', 'BP'])
    lastToast().action!.run()
    expect(imp().rules).toHaveLength(3)
  })

  it('rozłączona nazwa wraca jednym „Cofnij” (AF-60)', () => {
    load({ settings: (s) => ({ ...s, import: { ...s.import, aliases: { mokka: { to: 'kawiarnia mokka', label: 'MOKKA', toLabel: 'KAWIARNIA MOKKA', at: NOW } } } }) })
    rules.unmergeName('mokka')
    expect(Object.keys(imp().aliases)).toEqual([])
    expect(lastToast().action?.label).toBe('Cofnij')
    lastToast().action!.run()
    expect(imp().aliases.mokka?.to).toBe('kawiarnia mokka')
  })

  it('„to nie to samo” zapomniane: „Cofnij” przywraca pary (AF-60)', () => {
    load({ settings: (s) => ({ ...s, import: { ...s.import, notSimilar: { 'a|b': NOW } } }) })
    rules.clearDismissedSimilar()
    expect(imp().notSimilar).toEqual({})
    lastToast().action!.run()
    expect(imp().notSimilar).toEqual({ 'a|b': NOW })
  })

  it('„to nie powtórzenie” zdejmuje meldunek z „Cofnij”, które go przywraca (ME sp. 1)', () => {
    load()
    inbox.dismissCorrection('CORR1')
    expect(Object.keys(imp().notDuplicates)).toEqual(['correction:CORR1'])
    expect(lastToast().action?.label).toBe('Cofnij')
    lastToast().action!.run()
    expect(imp().notDuplicates).toEqual({})
  })

  it('„Zrzuć z ładowni” z „Cofnij” i słowem o masie (AF-77, LA sp. 7)', () => {
    load({ containers: [container()] })
    cargo.archiveContainer(container(), true)
    expect(data.useData.getState().records.containers[CID]!.record.archived).toBe(true)
    expect(lastToast().text).toContain('liczy się do końca miesiąca')
    lastToast().action!.run()
    expect(data.useData.getState().records.containers[CID]!.record.archived).toBe(false)
    // Brought back to the hold: nothing to undo.
    ui.useUi.setState({ toasts: [] })
    cargo.archiveContainer(data.useData.getState().records.containers[CID]!.record, false)
    expect(ui.useUi.getState().toasts).toEqual([])
  })

  it('toast z „Cofnij” trwa co najmniej 8 s, bez przycisku – tyle, ile podano (AF-7)', () => {
    vi.useFakeTimers()
    try {
      ui.toast('Usunięto.', 'info', 5000, { label: 'Cofnij', run: () => undefined })
      ui.toast('Zapisano.', 'info', 3000)
      vi.advanceTimersByTime(5100)
      expect(ui.useUi.getState().toasts.map((t) => t.text)).toEqual(['Usunięto.'])
      vi.advanceTimersByTime(3000)
      expect(ui.useUi.getState().toasts).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('AP-22: przerwanie kreatora i okno „Cofnij import”', () => {
  it('pytanie przy przerwaniu mówi, co przepada i co zostaje w folderze (KR.30)', () => {
    expect(wizard.cancelWizardText([])).not.toContain('Zostaje')
    wizard.noteTrace('domownik „Kasia”')
    wizard.noteTrace('cel „Wakacje”')
    wizard.noteTrace('cel „Wakacje”')
    expect(wizard.useWizard.getState().traces).toEqual(['domownik „Kasia”', 'cel „Wakacje”'])
    expect(wizard.cancelWizardText(wizard.useWizard.getState().traces)).toContain('Zostaje w folderze: domownik „Kasia”, cel „Wakacje”')
  })

  const T1 = '01K7T000000000000000000001'
  const T2 = '01K7T000000000000000000002'
  const tx = (id: string, updatedAt: string): Transaction =>
    transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id, createdAt: NOW, updatedAt, date: '2026-10-05', accountId: '01KDEFACC00000000000000001', amount: -1000 })
  const batch = (over: Partial<Parameters<typeof importBatchSchema.parse>[0]> = {}) =>
    importBatchSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01K7B0000000000000000000B1', createdAt: NOW, updatedAt: NOW, at: NOW, savedAt: NOW, accountId: '01KDEFACC00000000000000001', fileName: 'H1.csv', created: [T1, T2], ...over })

  it('„zmienione później przez Ciebie” nie liczy zapisów późniejszego importu ani jego cofnięcia (IM.30, IM.31)', () => {
    const later = '2026-10-02T10:00:00.000Z'
    const rows = new Map([
      [T1, tx(T1, later)],
      [T2, tx(T2, later)]
    ])
    // Written again later with the content the import wrote (a later import's undo, the „Cofnij”) – T415: no change; an
    // import without fingerprints (before 1.15.8) – by the stamp.
    const hashes = { [T1]: contentHash(tx(T1, NOW)), [T2]: contentHash(tx(T2, NOW)) }
    const plan = (over: Partial<Parameters<typeof importBatchSchema.parse>[0]> = {}) => undoPlan(batch(over), { tx: (id) => rows.get(id), rules: [] })
    expect(plan().changed).toBe(2)
    expect(plan({ createdHashes: hashes }).changed).toBe(0)
    rows.set(T2, { ...tx(T2, later), note: 'moja' })
    expect(plan({ createdHashes: hashes }).changed).toBe(1)
  })

  it('okno cofania pomija ślady późniejszych importów, a lista pełn(IM.31)', () => {
    load()
    const later = importBatchSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: '01K7B0000000000000000000B2',
      createdAt: NOW,
      updatedAt: NOW,
      at: '2026-10-03T10:00:00.000Z',
      savedAt: '2026-10-03T10:00:00.000Z',
      accountId: '01KDEFACC00000000000000001',
      fileName: 'L2.csv',
      created: [],
      updated: [{ before: tx(T1, NOW), after: tx(T1, NOW) }],
      // Taken back: its undo wrote T1 back as it was (T415 – the content tells, not the stamp).
      undoneAt: '2026-10-04T10:00:00.000Z'
    })
    data.addRecord('imports', batch({ createdHashes: { [T1]: contentHash(tx(T1, NOW)), [T2]: contentHash(tx(T2, NOW)) } }))
    data.addRecord('imports', later)
    data.addRecord('transactions', tx(T1, '2026-10-04T10:00:00.000Z'))
    data.addRecord('transactions', { ...tx(T2, '2026-10-04T10:00:00.000Z'), note: 'moja' })
    // T1 was rewritten by the later import (and its undo), T2 is the user's.
    expect(batches.undoPreview(data.useData.getState().records.imports['01K7B0000000000000000000B1']!.record).changed).toBe(1)
  })
})
