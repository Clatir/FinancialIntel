import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { importGroups, importThemes, type Choice } from '@shared/import/reconcile'
import { COLLECTIONS } from '@shared/paths'
import { balanceOf } from '@shared/calc/household'
import { defaultCategoryId, loanSchema, SCHEMA_VERSION, transactionSchema, type SettingsFile } from '@shared/schema'
import { listaCsv, type CsvBuy, type CsvTransfer } from '../e2e/mbank-csv'

// The renderer's stores talk to the main process through window.fi (preload); here it is a mock writing nothing.
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
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const state = await import('../../src/renderer/features/import/state')
const options = await import('../../src/renderer/features/import/options')
const fleet = await import('../../src/renderer/store/fleet')

const FUEL = defaultCategoryId(3, 1)
const PERIOD = { from: '2026-10-26', to: '2026-11-02' }
const LOAN = '01KN1HPZYCZKA0000000000001'
const ANNA = '01KN1HANNA0000000000000002'
const AT = '2026-09-01T10:00:00.000Z'
const ORLEN: CsvBuy = { date: '2026-10-28', amount: 210, name: 'ORLEN STACJA 7' }
const REPAID: CsvTransfer = { date: '2026-10-30', amount: 500, name: 'TOMASZ KOLEGA', title: 'ZWROT POZYCZKI' }
const FROM_ANNA: CsvTransfer = { date: '2026-10-31', amount: 120, name: 'ANNA TESTOWA', title: 'ZA ZAKUPY' }
const bytes = (text: string) => new TextEncoder().encode(text)

let folder = 0
/** A new folder with the Radar's loan to Tomasz and Anna in the household. */
function open(): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  const loan = loanSchema.parse({ schemaVersion: SCHEMA_VERSION, id: LOAN, createdAt: AT, updatedAt: AT, name: 'Pożyczka dla Tomka', direction: 'given', counterparty: 'Tomasz Kolega', amount: 200000, date: '2026-09-01' })
  records.loans = [{ record: loan, relPath: `loans/${LOAN}.json`, readOnly: false }]
  const status: FolderStatus = { dataDir: `/dane-h-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  const members = [...fi.settings.household.members, { id: ANNA, name: 'Anna', bankNames: ['ANNA TESTOWA'], inflow: 'income' as const, archived: false, via: null, opening: { owed: 0, deposit: 0 } }]
  data.applySnapshot({ fi: { ...fi, settings: { ...fi.settings, household: { ...fi.settings.household, members } } }, records, problems: [], conflicts: [], status, loadMs: 0 })
}
const groups = () => importGroups(state.useImport.getState().plan, state.useImport.getState().choices.restoreDeleted)
const groupOf = (name: string) => groups().find((g) => g.label === name || g.names.includes(name))!

beforeEach(() => vi.clearAllMocks())

describe('decyzja zbiorcza – AP-6 (AF-26)', () => {
  it('„Wydatek / zwrot towaru” dla zaznaczonych: zwrot pożyczki i wpłata domownika bez zmian, liczone jako „nie pasuje”; bez reguły na nazwisko', async () => {
    open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([ORLEN], PERIOD, null, [REPAID, FROM_ANNA])))
    expect(groupOf('TOMASZ KOLEGA').proposed).toMatchObject({ kind: 'loan', loanId: LOAN })
    expect(groupOf('ANNA TESTOWA').proposed).toMatchObject({ kind: 'income', household: true, memberId: ANNA })
    state.selectImport({ groups: groups().map((g) => g.group) }, true)
    expect(state.chooseSelected(groups(), 'expense', FUEL)).toEqual({ applied: 1, unfit: 2, kept: 2 })
    const { choices } = state.useImport.getState()
    expect(choices.groups[groupOf('ORLEN STACJA 7').group]).toMatchObject({ kind: 'expense', categoryId: FUEL })
    expect(choices.groups[groupOf('TOMASZ KOLEGA').group]).toBeUndefined()
    expect(choices.groups[groupOf('ANNA TESTOWA').group]).toBeUndefined()
    // A decision of their kind still takes them: Anna's rest as her advance; the same loan.
    expect(state.chooseSelected(groups(), `household:${ANNA}:advance`, null)).toEqual({ applied: 1, unfit: 2, kept: 1 })
    expect(state.useImport.getState().choices.groups[groupOf('ANNA TESTOWA').group]).toMatchObject({ household: true, memberId: ANNA, advance: true })
    // The import: the loan's repayment and Anna's money as recognized, no rule on Tomasz's name.
    await state.runImport()
    const ops = data.listOf(data.useData.getState().records.transactions)
    expect(ops.find((t) => t.counterparty === 'TOMASZ KOLEGA')).toMatchObject({ kind: 'loan', loanId: LOAN, amount: 50000 })
    expect(data.useData.getState().fi!.settings.import.rules.map((r) => r.match)).not.toContain('tomaszkolega')
  })

  it('operacja zaznaczona osobno: zwrot pożyczki zostaje, zakup – zmieniony', async () => {
    open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([ORLEN], PERIOD, null, [REPAID])))
    const rows = groups().flatMap((g) => g.rows.map((p) => p.key))
    state.selectImport({ rows }, true)
    expect(state.chooseSelected(groups(), 'expense', FUEL)).toEqual({ applied: 1, unfit: 1, kept: 1 })
    const loanRow = groupOf('TOMASZ KOLEGA').rows[0]!.key
    expect(state.useImport.getState().choices.rows[loanRow]).toBeUndefined()
  })
})

describe('pomocnicze – AP-6', () => {
  const choice = (over: Partial<Choice>): Choice => ({ kind: 'expense', categoryId: null, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null, ...over })

  it('bulkKeeps: pożyczka, PIT-38, XTB i pieniądze domownika – tylko decyzją ich rodzaju', () => {
    const loan = choice({ kind: 'loan', loanId: LOAN })
    expect(['expense', 'income', 'refund', 'transfer', 'trading', 'tax', 'loan', `loan:${LOAN}`, 'loan:01KN1H00000000000000000099'].map((o) => options.bulkKeeps(o, loan))).toEqual([true, true, true, true, true, true, true, false, true])
    // A loan without its record takes a loan of the Radar.
    expect([`loan:${LOAN}`, 'loan', 'expense'].map((o) => options.bulkKeeps(o, choice({ kind: 'loan', loanId: null })))).toEqual([false, false, true])
    expect(['tax', 'expense'].map((o) => options.bulkKeeps(o, choice({ kind: 'tax' })))).toEqual([false, true])
    expect(['trading', 'income'].map((o) => options.bulkKeeps(o, choice({ kind: 'trading' })))).toEqual([false, true])
    const anna = choice({ kind: 'income', household: true, memberId: ANNA })
    expect([`household:${ANNA}:income`, `household:${ANNA}:advance`, 'household:01KN1H00000000000000000099:income', 'income', 'refund'].map((o) => options.bulkKeeps(o, anna))).toEqual([false, false, true, true, true])
    expect(['income', 'expense', 'transfer'].map((o) => options.bulkKeeps(o, choice({ kind: 'income' })))).toEqual([false, false, false])
  })

  it('bulkResultText: kierunek pieniędzy i rodzaje zmieniane tylko w grupie', () => {
    expect(options.bulkResultText(3, 0, 0)).toBe('Ustawiono dla 3.')
    expect(options.bulkResultText(2, 1, 0)).toBe('Ustawiono dla 2; 1 nie pasuje do kierunku pieniędzy (wpływ / wydatek) – bez zmian.')
    expect(options.bulkResultText(1, 1, 1)).toBe('Ustawiono dla 1; 1 nie pasuje (zwrot pożyczki, XTB, PIT-38 i wpłatę domownika zmienisz tylko w ich grupie) – bez zmian.')
    expect(options.bulkResultText(1, 2, 1)).toContain('2 nie pasuje (kierunek pieniędzy; zwrot pożyczki')
  })

  it('„+ domownik” (AF-62): tylko przy wpływie od osoby spoza listy – nie przy przelewie własnym, XTB i zwrocie pożyczki', async () => {
    open()
    const transfers: CsvTransfer[] = [REPAID, { date: '2026-10-29', amount: 900, name: 'XTB SPÓŁKA AKCYJNA', title: 'WITHDRAWAL' }, { date: '2026-10-29', amount: 300, name: 'JAN KAPITAN', title: 'PRZELEW' }, { date: '2026-10-27', amount: 80, name: 'MAREK OBCY', title: 'ZA BILETY' }, FROM_ANNA]
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, transfers)))
    const members = data.useData.getState().fi!.settings.household.members
    const offered = (name: string, c?: Partial<Choice>) => {
      const g = groupOf(name)
      return options.offersNewMember(g, c ? choice(c) : g.proposed, members, ['JAN KAPITAN'])
    }
    expect(['TOMASZ KOLEGA', 'XTB SPÓŁKA AKCYJNA', 'JAN KAPITAN', 'MAREK OBCY', 'ANNA TESTOWA'].map((n) => offered(n))).toEqual([false, false, false, true, false])
    // The holder's name decided as income by hand – still not a member; a stranger's money as a product return – no.
    expect(offered('JAN KAPITAN', { kind: 'income' })).toBe(false)
    expect(offered('MAREK OBCY', { kind: 'expense' })).toBe(false)
  })
})

describe('„w tym za” w imporcie – AP-7 (AF-27)', () => {
  const TATA = '01KN1STATA0000000000000001'
  const BABCIA = '01KN1SBABC0000000000000002'
  const LEKI = '01KN1SPZYCZKA0000000000003'
  const TATA_IN: CsvTransfer[] = [
    { date: '2026-11-01', amount: 300, name: 'PIOTR TESTOWY', title: 'OD TATY I BABCI' },
    { date: '2026-10-29', amount: 200, name: 'PIOTR TESTOWY', title: 'ZWROT ZA KURS XTB' }
  ]
  const person = (id: string, name: string, over: object = {}) => ({ id, name, bankNames: [] as string[], inflow: 'advance' as const, archived: false, via: null as string | null, opening: { owed: 0, deposit: 0 }, ...over })
  /** Babcia owes 100 zł for „Leki” and passes her money through Tata (IM.25); purchases paid back as named (D91). */
  function openFamily(): void {
    const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
    const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
    const leki = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: LEKI, createdAt: AT, updatedAt: AT, date: '2026-10-20', accountId: fi.settings.accounts[0]!.id, amount: -10000, categoryId: defaultCategoryId(5, 0), refundable: true, memberId: BABCIA, counterparty: 'Apteka' })
    records.transactions = [{ record: leki, relPath: `transactions/2026/2026-10-20_${LEKI}.json`, readOnly: false }]
    const status: FolderStatus = { dataDir: `/dane-s-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
    const members = [...fi.settings.household.members, person(TATA, 'Tata', { bankNames: ['PIOTR TESTOWY'] }), person(BABCIA, 'Babcia', { via: TATA })]
    data.applySnapshot({ fi: { ...fi, settings: { ...fi.settings, household: { ...fi.settings.household, since: null, assignFrom: null, members } } }, records, problems: [], conflicts: [], status, loadMs: 0 })
  }
  const view = () => {
    const s = state.useImport.getState()
    return state.sharesView(s.plan, s.choices, fleet.fleetNow()?.household ?? null, data.useData.getState().fi!.settings.household.members)!
  }
  const choice = (over: Partial<Choice>): Choice => ({ kind: 'income', categoryId: null, refundable: false, household: true, memberId: TATA, advance: true, counterAccountId: null, ...over })

  it('wiersz: nowa linia „w tym za” (także 0 zł) zostaje własną decyzją wiersza; bez linii – wraca do grupy', () => {
    const group = choice({})
    const line0 = { ...group, shares: [{ memberId: BABCIA, amount: 0, advance: true }] }
    // A row without its own decision: a line of 0 zł is a change (before: „the same as the group's” – dropped at once).
    expect(options.rowSharesChoice(line0, group, group, false)).toBe(line0)
    expect(options.rowSharesChoice({ ...group }, group, group, false)).toBeNull()
    // Its own: kept while typed and with lines; none and none in the group – back to the group's.
    expect(options.rowSharesChoice(line0, group, line0, true)).toBe(line0)
    expect(options.rowSharesChoice({ ...group, shares: undefined }, group, line0, true)).toBeNull()
    // The group gives the row parts: no lines is the row's own choice then.
    const shared = { ...group, shares: [{ memberId: BABCIA, amount: 10000, advance: true }] }
    const none = { ...group, shares: undefined }
    expect(options.rowSharesChoice(none, shared, shared, true)).toBe(none)
  })

  it('grupa: start = to, co Babcia ma oddać; rozkład po kolei, nigdy ponad dług; import – Babcia raz 100 zł z wskazanymi lekami, Tacie reszta', async () => {
    openFamily()
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, TATA_IN)))
    const g = groupOf('PIOTR TESTOWY')
    expect(g.proposed).toMatchObject({ kind: 'income', household: true, memberId: TATA })
    expect(state.decisionStart(view(), `g:${g.group}`, BABCIA, [])).toBe(10000)
    // Typed more than she owes: never beyond her debt.
    state.decideGroup(g.group, { ...g.proposed, shares: [{ memberId: BABCIA, amount: 15000, advance: true }] })
    const [first, second] = [...g.rows].sort((a, b) => a.row.date.localeCompare(b.row.date))
    expect(view().parts.get(first!.key)).toEqual([{ memberId: BABCIA, amount: 10000, advance: true }])
    expect(view().parts.get(second!.key)).toBeUndefined()
    // The later transfer's own „w tym za Babcia” would start at 0: her debt is in the first one already.
    expect(state.rowStart(view(), second!.key, second!.row.amount, BABCIA, [])).toBe(0)
    expect(state.owedLeftOfDecision(view(), `g:${g.group}`, BABCIA)).toBe(10000)
    await state.runImport()
    const ops = data
      .listOf(data.useData.getState().records.transactions)
      .filter((t) => t.counterparty === 'PIOTR TESTOWY')
      .sort((a, b) => a.date.localeCompare(b.date))
    expect(ops.map((t) => [t.date, t.splits.map((s) => [s.memberId, s.amount]), t.covers])).toEqual([
      ['2026-10-29', [[BABCIA, 10000]], [LEKI]],
      ['2026-11-01', [], []]
    ])
    const ledger = fleet.fleetNow()!.household
    expect(balanceOf(ledger, BABCIA)).toMatchObject({ owed: 0, deposit: 0 })
    expect(balanceOf(ledger, TATA)).toMatchObject({ deposit: 40000 })
  })

  it('przegląd N1, 12: temat z decyzją swoich marek (N78) – „w tym za” tematu startuje od długu, przy linii rozkład z marek', async () => {
    openFamily()
    // Tata's money under two of his names in the bank: two brands of one theme.
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [...TATA_IN, { date: '2026-10-30', amount: 50, name: 'TESTOWY PIOTR', title: 'NA ZAKUPY' }])))
    const big = groupOf('PIOTR TESTOWY')
    const small = groupOf('TESTOWY PIOTR')
    expect(small.theme).toBe(big.theme)
    const theme = () => importThemes(groups()).find((t) => t.theme === big.theme)!
    const keysNow = () => state.themeSharesFrom(theme(), state.themeShows(theme(), state.useImport.getState().choices))
    expect(keysNow()).toBe(`t:${big.theme}`)
    // Both brands decided alike, no „w tym za”: the theme shows their decision, a change there replaces theirs.
    state.decideGroup(big.group, { ...big.proposed })
    state.decideGroup(small.group, { ...small.proposed })
    expect(state.themeShows(theme(), state.useImport.getState().choices)).toBe('same')
    const keys = keysNow()
    expect([...keys].sort()).toEqual([`g:${big.group}`, `g:${small.group}`].sort())
    // Its own key has no rows then (each takes its brand's decision): a new line started at 0 zł there.
    expect(state.decisionStart(view(), `t:${big.theme}`, BABCIA, [])).toBe(0)
    expect(state.decisionStart(view(), keys, BABCIA, [])).toBe(10000)
    expect(state.owedLeftOfDecision(view(), keys, BABCIA)).toBe(10000)
    // „w tym za Babcia 100” in each brand's decision (T336): the lines are each brand's – the theme's row says so, each
    // brand's line where its part went (Babcia owes 100 zł: the second brand gives nothing – she owes no more).
    const shares = [{ memberId: BABCIA, amount: 10000, advance: true }]
    state.decideGroup(big.group, { ...big.proposed, shares })
    state.decideGroup(small.group, { ...small.proposed, shares })
    expect(state.themeShows(theme(), state.useImport.getState().choices)).toBe('brands')
    expect(state.themeCommon(theme(), state.useImport.getState().choices)?.shares).toEqual(shares)
    const earlier = big.rows.find((p) => p.row.date === '2026-10-29')!
    expect(state.lineSpreads(view(), `g:${big.group}`)).toEqual({ 0: { typed: 10000, given: [{ date: earlier.row.date, amount: 10000 }], capped: false } })
    expect(state.lineSpreads(view(), `g:${small.group}`)).toEqual({ 0: { typed: 10000, given: [], capped: true } })
    expect(state.owedLeftOfDecision(view(), `g:${big.group}`, BABCIA)).toBe(10000)
    // The brands without lines again: a line typed on the theme's row makes the theme decide them all – its own key, its
    // line spread over all the rows.
    state.decideGroup(big.group, { ...big.proposed })
    state.decideGroup(small.group, { ...small.proposed })
    state.chooseThemeRow(theme(), { ...big.proposed, shares })
    expect(keysNow()).toBe(`t:${big.theme}`)
    expect(state.lineSpreads(view(), `t:${big.theme}`)).toEqual({ 0: { typed: 10000, given: [{ date: earlier.row.date, amount: 10000 }], capped: false } })
  })
})
