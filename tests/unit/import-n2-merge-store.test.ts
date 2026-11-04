// N2 (1.15.6) merged: AP-4 / D100 in the import (the member's money in the list – T351, a loan's part of an inflow –
// T357, „zapamiętaj” of a loan's repayment – T358) with N1's theme of brands (T336) and the one bookkeeping of group
// decisions (`groupsDecided`, N1 review 5). Each scenario failed before its fix. The stores talk to the main process
// through window.fi (preload): a mock writing nothing.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { importGroups, importThemes, loanKey, type Choice, type SharePart } from '@shared/import/reconcile'
import { COLLECTIONS } from '@shared/paths'
import { loanSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type Loan, type SettingsFile } from '@shared/schema'
import { listaCsv, type CsvTransfer } from '../e2e/mbank-csv'

const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, records: Array<{ id: string }>) => records.map((record) => ({ id: record.id, entry: { record, relPath: `${record.id}.json`, readOnly: false } }))),
  saveSettings: vi.fn(async (f: SettingsFile) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: readonly string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined),
  historyDeleted: vi.fn(async (): Promise<unknown[]> => []),
  importBackup: vi.fn(async () => 'C:\\dane\\backups\\pre-import\\2026-11-04.zip'),
  folderShown: vi.fn(async () => undefined)
}
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) })
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const fleet = await import('../../src/renderer/store/fleet')
const ui = await import('../../src/renderer/store/ui')
const state = await import('../../src/renderer/features/import/state')
const options = await import('../../src/renderer/features/import/options')

const AT = '2026-09-01T10:00:00.000Z'
const TATA = '01KN2MTATA0000000000000001'
const BABCIA = '01KN2MBABC0000000000000002'
const JAN_LOAN = '01KN2MJAN00000000000000003'
const PERIOD = { from: '2026-10-26', to: '2026-11-02' }
const bytes = (text: string) => new TextEncoder().encode(text)
const person = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
let folder = 0
/** Jan owes 150 zł of the loan given on 01.10; Tata's money comes under two of his names (two brands of one theme). */
function open(): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const loan: Loan = loanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: JAN_LOAN, createdAt: AT, updatedAt: AT, name: 'Pożyczka dla Jana', direction: 'given', counterparty: 'JAN KOWALSKI', amount: 15000, date: '2026-10-01' })
  const lent = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01KN2MGAVE0000000000000004', createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'loan', amount: -15000, loanId: JAN_LOAN, counterparty: 'JAN KOWALSKI' })
  records.transactions = [{ record: lent, relPath: `transactions/2026/${lent.date}_${lent.id}.json`, readOnly: false }]
  records.loans = [{ record: loan, relPath: `loans/${loan.id}.json`, readOnly: false }]
  const status: FolderStatus = { dataDir: `/dane-n2m-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  const members = [...fi.settings.household.members, person(TATA, 'Tata', { bankNames: ['PIOTR TESTOWY'] }), person(BABCIA, 'Babcia', { via: TATA })]
  data.applySnapshot({
    fi: { ...fi, settings: { ...fi.settings, budget: { ...fi.settings.budget, start: '2026-09-01' }, household: { ...fi.settings.household, since: null, assignFrom: null, members } } },
    records,
    problems: [],
    conflicts: [],
    status,
    loadMs: 0
  })
}
const TATA_TWICE: CsvTransfer[] = [
  { date: '2026-10-29', amount: 200, name: 'PIOTR TESTOWY', title: 'ZWROT' },
  { date: '2026-10-30', amount: 150, name: 'TESTOWY PIOTR', title: 'NA ZAKUPY' }
]
const s = () => state.useImport.getState()
const groups = () => importGroups(s().plan, s().choices.restoreDeleted)
const groupOf = (name: string) => groups().find((g) => g.label === name || g.names.includes(name))!
const view = () => state.sharesView(s().plan, s().choices, fleet.fleetNow()!.household, data.useData.getState().fi!.settings.household.members, fleet.fleetNow()!.loans)!
const loanPart = (amount: number): SharePart => ({ memberId: '', amount, advance: false, loanId: JAN_LOAN })

/** Each brand of Tata's money with these lines. */
async function twoBrands(lines: SharePart[], extra: CsvTransfer[] = []) {
  open()
  await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [...TATA_TWICE, ...extra])))
  const big = groupOf('PIOTR TESTOWY')
  const small = groupOf('TESTOWY PIOTR')
  expect(small.theme).toBe(big.theme)
  const theme = () => importThemes(groups()).find((t) => t.theme === big.theme)!
  for (const g of [big, small]) state.decideGroup(g.group, { ...g.proposed, shares: lines })
  // What the theme's row shows (ThemeRow: `themeCommon`, else its own decision).
  const shown = () => state.themeCommon(theme(), s().choices) ?? s().choices.themes[theme().theme]!
  return { big, small, theme, shown }
}

beforeEach(() => {
  vi.clearAllMocks()
  ui.useUi.setState({ toasts: [] })
})

describe('T336 i D100: temat marek z częścią pożyczki – linie zostają w markach, nic nie sumowane', () => {
  it('dwie marki po „w tym spłata pożyczki 100 zł”, Jan ma oddać 150 zł: temat pokazuje decyzję pierwszej marki, uwagi przy każdej marce z jej klucza', async () => {
    const { big, small, theme, shown } = await twoBrands([loanPart(10000)])
    expect(state.themeShows(theme(), s().choices)).toBe('brands')
    // A reference to the first brand's decision – its 100 zł, never what the brands give together (150 zł) nor their sum.
    expect(shown()).toBe(s().choices.groups[theme().groups[0]!.group])
    expect(state.themeSharesFrom(theme(), 'brands')).toEqual(theme().groups.map((g) => `g:${g.group}`))
    // Each brand's line by its own key: the older transfer gives 100 zł, the other the 50 zł the loan has left.
    expect(state.lineSpreads(view(), `g:${big.group}`)).toEqual({ 0: { typed: 10000, given: [{ date: '2026-10-29', amount: 10000 }], capped: false } })
    expect(state.lineSpreads(view(), `g:${small.group}`)).toEqual({ 0: { typed: 10000, given: [{ date: '2026-10-30', amount: 5000 }], capped: true } })
    expect(view().total.get(loanKey(JAN_LOAN))).toBe(15000)
  })

  it('zmiana w temacie tego, czym są pieniądze Taty (lista – AP-4): każda marka ze swoją częścią pożyczki i „w tym za”; inna osoba – bez linii', async () => {
    const lines = [{ memberId: BABCIA, amount: 5000, advance: true }, loanPart(10000)]
    const { big, small, theme, shown } = await twoBrands(lines)
    expect(options.optionOf(shown(), 'in')).toBe(`household:${TATA}:advance`)
    // „spłata, reszta jako przychód” – before: the list's change dropped every brand's lines (the switch beside the list,
    // which kept them – T336 „cel wpłaty”, went with AP-4).
    state.chooseThemeRow(theme(), options.listChoice(`household:${TATA}:income`, shown()))
    for (const g of [big, small]) expect(s().choices.groups[g.group]).toMatchObject({ inflowKind: 'repay', advance: false, shares: lines })
    expect(state.themeShows(theme(), s().choices)).toBe('brands')
    expect(view().total.get(loanKey(JAN_LOAN))).toBe(15000)
    // „niezależny przychód (bez spłaty)”: the same member's money – the lines stay too.
    state.chooseThemeRow(theme(), options.listChoice(`household:${TATA}:all-income`, shown()))
    for (const g of [big, small]) expect(s().choices.groups[g.group]).toMatchObject({ inflowKind: 'income', shares: lines })
    // Another member's money – another kind of decision (`choiceFor`): no lines in any brand.
    state.chooseThemeRow(theme(), options.listChoice(`household:${BABCIA}:income`, shown()))
    expect([s().choices.groups[big.group]?.shares, s().choices.groups[small.group]?.shares]).toEqual([undefined, undefined])
    expect(state.themeShows(theme(), s().choices)).toBe('same')
  })

  it('lista: ta sama osoba zostawia linie, inny rodzaj albo osoba – jak `choiceFor`, bez linii', () => {
    const tata: Choice = { kind: 'income', categoryId: null, refundable: false, household: true, memberId: TATA, advance: true, inflowKind: 'repay', counterAccountId: null, shares: [loanPart(10000)] }
    expect(options.listChoice(`household:${TATA}:all-advance`, tata)).toMatchObject({ inflowKind: 'advance', advance: true, shares: [loanPart(10000)] })
    expect(options.listChoice(`household:${BABCIA}:advance`, tata).shares).toBeUndefined()
    expect(options.listChoice('income', tata).shares).toBeUndefined()
    expect(options.listChoice(`loan:${JAN_LOAN}`, tata)).toMatchObject({ kind: 'loan', loanId: JAN_LOAN })
    expect(options.listChoice(`household:${TATA}:income`, { ...tata, shares: undefined }).shares).toBeUndefined()
  })

  it('wiersz tematu marek mówi, czyje linie są w markach: „w tym za”, „w tym spłata pożyczki” albo oba', () => {
    const babcia = { memberId: BABCIA, amount: 5000, advance: true }
    // Of members only – as N1 said it (a loan's line of 0 zł aside).
    expect(options.linesInBrands([babcia, loanPart(0)])).toEqual({ text: 'w tym za – ustawione w markach', title: 'Każda marka ma swoje „w tym za” – kwotę i rozkład zmienisz przy marce' })
    expect(options.linesInBrands([loanPart(10000)])).toEqual({ text: 'w tym spłata pożyczki – ustawiona w markach', title: 'Każda marka ma swoją spłatę pożyczki – kwotę i rozkład zmienisz przy marce' })
    expect(options.linesInBrands([babcia, loanPart(10000)]).text).toBe('w tym za i spłata pożyczki – ustawione w markach')
  })
})

describe('groupsDecided i T358: spłata pożyczki zapamiętana tylko na życzenie – każdą drogą decyzji grupy', () => {
  it('decyzja zbiorcza „Zwrot pożyczki – Jan”: grupa, która nie spłacała pożyczki – bez „zapamiętaj”; grupa, która już ją spłacała – jak dotąd', async () => {
    open()
    const ewaAndJan: CsvTransfer[] = [
      { date: '2026-10-31', amount: 40, name: 'EWA KOWALSKA', title: 'ZA JANA' },
      { date: '2026-11-01', amount: 50, name: 'JAN KOWALSKI', title: 'ODDAJE' }
    ]
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, ewaAndJan)))
    const ewa = groupOf('EWA KOWALSKA')
    const jan = groupOf('JAN KOWALSKI')
    // Jan's transfer is recognized as his loan's repayment (B34); Ewa's is plain income.
    expect([options.optionOf(ewa.proposed, 'in'), options.optionOf(jan.proposed, 'in')]).toEqual(['income', `loan:${JAN_LOAN}`])
    state.selectImport({ groups: [ewa.group, jan.group] }, true)
    expect(state.chooseSelected(groups(), `loan:${JAN_LOAN}`, null).applied).toBe(2)
    // Before (one `remember: true` for every ticked group): Ewa's money taught a loan rule nobody asked for.
    expect([s().choices.remember[ewa.group], s().choices.remember[jan.group]]).toEqual([false, true])
  })

  it('zmiana w temacie marek z „w tym za” na spłatę całością pożyczki: każda marka bez „zapamiętaj” (wcześniej każda zapamiętana)', async () => {
    const { big, small, theme, shown } = await twoBrands([{ memberId: BABCIA, amount: 5000, advance: true }])
    expect([s().choices.remember[big.group], s().choices.remember[small.group]]).toEqual([true, true])
    state.chooseThemeRow(theme(), options.listChoice(`loan:${JAN_LOAN}`, shown()))
    for (const g of [big, small]) expect([s().choices.groups[g.group]?.kind, s().choices.groups[g.group]?.loanId, s().choices.remember[g.group]]).toEqual(['loan', JAN_LOAN, false])
  })

  it('część pożyczki dodana w grupie przez „Zmień” (decideGroup) i „jak temat” (clearGroup): bez zapamiętania, potem bez śladu', async () => {
    open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, TATA_TWICE)))
    const g = groupOf('PIOTR TESTOWY')
    state.decideGroup(g.group, { ...g.proposed, shares: [loanPart(5000)] })
    expect([s().choices.remember[g.group], s().lastDecided]).toEqual([false, g.group])
    state.clearGroup(g.group)
    expect([s().choices.groups[g.group], s().choices.remember[g.group], s().lastDecided]).toEqual([undefined, undefined, null])
  })
})
