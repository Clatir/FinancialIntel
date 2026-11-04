import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { bankNameHolder, memberOf, nameIn, sameBankName, skippedDebtsOf } from '@shared/calc/household'
import { COLLECTIONS } from '@shared/paths'
import { defaultCategoryId, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type SettingsFile, type Transaction } from '@shared/schema'

// The merge of N3 (with N2) into N4 (1.15.8): N2's actions held to N4's rules, and the names of N2 and N4 read by one
// rule. The stores talk to the main process through window.fi (preload); here it is a mock writing nothing.
const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, records: Array<{ id: string }>) => records.map((record) => ({ id: record.id, entry: { record, relPath: `${record.id}.json`, readOnly: false } }))),
  saveSettings: vi.fn(async (f: SettingsFile) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: readonly string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined),
  folderShown: vi.fn(async () => undefined)
}
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const fleet = await import('../../src/renderer/store/fleet')
const actions = await import('../../src/renderer/features/household/actions')

const AT = '2026-09-01T10:00:00.000Z'
const MAREK = '01KN4MMAREK000000000000001'
const EVENTIM = '01KN4MEVENT000000000000002'
const MAMA = '01KN4MMAMA0000000000000004'
const ADVANCE = '01KN4MADVAN000000000000003'
const person = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
let folder = 0

/** Marek owes 360 zł for the tickets; his 100 zł of 25.10 as an advance for the future skipped it (AP-4). */
function open(): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const acc = fi.settings.accounts[0]!.id
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const tx = (over: Partial<Transaction>) => transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, createdAt: AT, updatedAt: AT, accountId: acc, ...over })
  const list = [
    tx({ id: EVENTIM, date: '2026-10-20', amount: -36000, categoryId: defaultCategoryId(6, 1), refundable: true, memberId: MAREK, counterparty: 'EVENTIM' }),
    tx({ id: ADVANCE, date: '2026-10-25', kind: 'income', amount: 10000, memberId: MAREK, counterparty: 'MAREK TESTOWY', inflowKind: 'advance', advance: true })
  ]
  records.transactions = list.map((record) => ({ record, relPath: `transactions/2026/${record.date}_${record.id}.json`, readOnly: false }))
  const status: FolderStatus = { dataDir: `/dane-n4m-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  const members = [...fi.settings.household.members, person(MAREK, 'Marek', { bankNames: ['MAREK TESTOWY'] })]
  data.applySnapshot({ fi: { ...fi, settings: { ...fi.settings, household: { ...fi.settings.household, since: null, assignFrom: null, members } } }, records, problems: [], conflicts: [], status, loadMs: 0 })
}
const advances = () => skippedDebtsOf(fleet.fleetNow()!.household, fleet.fleetNow()!.receivables.members, data.useData.getState().fi!.settings.import.notDuplicates)
const toasts = () => ui.useUi.getState().toasts.map((t) => t.text)

beforeEach(() => {
  vi.clearAllMocks()
  ui.useUi.setState({ toasts: [] })
})

describe('po scaleniu N3 z N4: „Spłać” i „zostaw” zaliczek (N2) nigdy po cichu (AP-15)', () => {
  it('„Spłać” na meldunku już nieaktualnym (wpłata zmieniona w międzyczasie): nic nie zmienia i mówi to', () => {
    open()
    expect(advances().map((a) => a.memberId)).toEqual([MAREK])
    // Changed meanwhile (an edit, another computer): the advance repays the debt already – the report is stale.
    data.updateRecord('transactions', ADVANCE, (t) => ({ ...t, inflowKind: 'repay' }))
    expect(advances()).toEqual([])
    const before = data.useData.getState().records.transactions
    expect(actions.repayAdvances(MAREK)).toBe(false)
    expect(data.useData.getState().records.transactions).toBe(before)
    expect(toasts()).toEqual(['Marek: nic do zmiany – zaliczki na przyszłość nie zostawiają już długu.'])
  })

  it('„zostaw” na meldunku już nieaktualnym: nic nie zapisuje i mówi to; na aktualnym – zostawia z „Cofnij”', () => {
    open()
    data.updateRecord('transactions', ADVANCE, (t) => ({ ...t, inflowKind: 'repay' }))
    actions.keepAdvances(MAREK)
    expect(data.useData.getState().fi!.settings.import.notDuplicates).toEqual({})
    expect(toasts()).toEqual(['Marek: nic do zmiany – zaliczki na przyszłość nie zostawiają już długu.'])
    open()
    ui.useUi.setState({ toasts: [] })
    actions.keepAdvances(MAREK)
    expect(advances()).toEqual([])
    expect(toasts()).toEqual(['Zaliczki zostają – meldunek nie wróci dla tych wpłat.'])
  })
})

describe('po scaleniu N3 z N4: nazwy w banku jedną regułą słów (memberOf, nameIn – N2, sameBankName – N4)', () => {
  const members = [person(MAREK, 'Marek', { bankNames: ['Jan Żółw'] }), person(MAMA, 'Mama', { bankNames: ['MAMA'] })]

  it('te same słowa w dowolnej kolejności, bez wielkości liter i polskich znaków – kontrahent, pożyczkobiorca i druga nazwa', () => {
    for (const counterparty of ['ZOLW JAN', 'jan żółw', 'PRZELEW OD JAN ZOLW']) {
      expect(memberOf(counterparty, members)?.id).toBe(MAREK)
      expect(nameIn('Jan Żółw', counterparty)).toBe(true)
    }
    expect(sameBankName('Jan Żółw', 'ZOLW  JAN')).toBe(true)
    expect(bankNameHolder(members, 'zolw jan')?.id).toBe(MAREK)
  })

  it('nazwa z jednego słowa – tylko cały kontrahent; słowa jednoliterowe się nie liczą', () => {
    expect(memberOf('MAMA', members)?.id).toBe(MAMA)
    expect(nameIn('MAMA', 'MAMA')).toBe(true)
    expect(memberOf('MAMA I TATA', members)).toBeNull()
    expect(nameIn('MAMA', 'MAMA I TATA')).toBe(false)
    expect(nameIn('J Żółw', 'ZOLW')).toBe(true)
    expect(memberOf('JAN', members)).toBeNull()
    expect(nameIn('Jan Żółw', 'JAN')).toBe(false)
    expect(nameIn('—', 'JAN')).toBe(false)
  })
})
