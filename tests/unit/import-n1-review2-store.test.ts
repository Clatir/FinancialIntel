import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { latestImport } from '@shared/import/batch'
import type { MbankFile, MbankRow } from '@shared/import/mbank'
import { buildImport, importGroups, importThemes, planImport, type Choice, type ImportChoices, type ImportPlan } from '@shared/import/reconcile'
import { COLLECTIONS } from '@shared/paths'
import { defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type SettingsFile, type Transaction } from '@shared/schema'
import { listaCsv, type CsvBuy, type CsvTransfer } from '../e2e/mbank-csv'
import type { SharesView } from '../../src/renderer/features/import/state'

// The second to fourth code reviews of N1 (1.15.5): their findings in the window's import (renderer's stores), each with
// the scenario that failed before the fix. The stores talk to the main process through window.fi (preload): a mock
// writing nothing.
const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, records: Array<{ id: string }>) => records.map((record) => ({ id: record.id, entry: { record, relPath: `${record.id}.json`, readOnly: false } }))),
  saveSettings: vi.fn(async (f: SettingsFile) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: readonly string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined),
  historyList: vi.fn(async (): Promise<unknown[]> => []),
  historyDeleted: vi.fn(async (): Promise<unknown[]> => []),
  importBackup: vi.fn(async () => 'C:\\dane\\backups\\pre-import\\2026-11-04.zip'),
  folderShown: vi.fn(async () => undefined)
}
const stored = new Map<string, string>()
vi.stubGlobal('window', { fi: api })
vi.stubGlobal('localStorage', {
  getItem: (k: string) => stored.get(k) ?? null,
  setItem: (k: string, v: string) => void stored.set(k, String(v)),
  removeItem: (k: string) => void stored.delete(k)
})
const data = await import('../../src/renderer/store/data')
const ui = await import('../../src/renderer/store/ui')
const fleet = await import('../../src/renderer/store/fleet')
const state = await import('../../src/renderer/features/import/state')
const options = await import('../../src/renderer/features/import/options')
const batches = await import('../../src/renderer/features/import/batches')
const returned = await import('../../src/renderer/features/import/returned')

const AT = '2026-09-01T10:00:00.000Z'
const bytes = (text: string) => new TextEncoder().encode(text)
let folder = 0
/** A new folder: its settings as `patch` makes them, its operations. */
function open(over: { dir?: string; transactions?: Transaction[]; patch?: (s: SettingsFile['settings']) => SettingsFile['settings'] } = {}): string {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = (over.transactions ?? []).map((record) => ({ record, relPath: `transactions/${record.id}.json`, readOnly: false }))
  const dataDir = over.dir ?? `/dane-r2-${++folder}`
  const status: FolderStatus = { dataDir, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  data.applySnapshot({ fi: { ...fi, settings: (over.patch ?? ((s) => s))(fi.settings) }, records, problems: [], conflicts: [], status, loadMs: 0 })
  return dataDir
}
const operations = () => data.listOf(data.useData.getState().records.transactions)
const withImports = (lastImport: Record<string, string>) => (s: SettingsFile['settings']) => ({ ...s, import: { ...s.import, lastImport } })

beforeEach(() => {
  vi.clearAllMocks()
  api.historyDeleted.mockImplementation(async () => [])
  ui.useUi.setState({ toasts: [] })
})

describe('przegląd N1 2, 1: „Cofnij” cofnięcia importu usuwa jego operacje znowu jako usunięte przez import (T331)', () => {
  const PERIOD = { from: '2026-10-19', to: '2026-10-26' }
  const BUYS: CsvBuy[] = [
    { date: '2026-10-20', amount: 87.91, name: 'SLUSARZ KOWAL' },
    { date: '2026-10-25', amount: 31.95, name: 'ZABKA Z1234' }
  ]

  it('nierozliczona usunięta przez import, przywrócona przez „Cofnij import”, usunięta znowu przez „Cofnij” – z powodem „import”', async () => {
    open()
    // Import 1 brings a pending purchase; import 2 (the bank no longer shows it) removes it – as the import's own.
    await state.loadImportFile('lista.csv', bytes(listaCsv([...BUYS, { date: '2026-10-26', amount: 5, name: 'KIOSK RUCH', pending: true }], PERIOD)))
    await state.runImport()
    const kiosk = operations().find((t) => t.counterparty === 'KIOSK RUCH')!
    await state.loadImportFile('lista-2.csv', bytes(listaCsv(BUYS, { from: '2026-10-19', to: '2026-10-27' })))
    state.setRemoveVanished(kiosk.id, true)
    await state.runImport()
    expect(api.deleteRecords).toHaveBeenLastCalledWith('transactions', [kiosk.id], 'import')
    // „Cofnij import”: the pending one back.
    const batch = latestImport(data.listOf(data.useData.getState().records.imports))!
    expect(await batches.undoImport(batch.id)).toBe(true)
    expect(operations().some((t) => t.id === kiosk.id)).toBe(true)
    // „Cofnij” in its toast: the import as it was – the pending one removed again by the import, not by the user (before:
    // the default reason – after the batch rotated out, a deletion of the user's hiding the bank's booked row).
    const redo = ui.useUi.getState().toasts.find((t) => t.action?.label === 'Cofnij')!
    redo.action!.run()
    await vi.waitFor(() => expect(ui.useUi.getState().toasts.map((t) => t.text)).toContain('Import znowu w budżecie.'))
    expect(operations().some((t) => t.id === kiosk.id)).toBe(false)
    expect(api.deleteRecords).toHaveBeenLastCalledWith('transactions', [kiosk.id], 'import')
  })
})

describe('przegląd N1 2, 5, N1 3, 1, 4 i N1 4, 1, 2, 5, 6, 8: temat z jednakową decyzją marek – ich „w tym za” zostaje w markach, zmiana w temacie trafia do każdej marki', () => {
  const TATA = '01KN2STATA0000000000000001'
  const BABCIA = '01KN2SBABC0000000000000002'
  const LEKI = '01KN2SAPTK0000000000000003'
  const CIOCIA = '01KN2SCIOC0000000000000005'
  const PERIOD = { from: '2026-10-26', to: '2026-11-02' }
  const person = (id: string, name: string, over: object = {}) => ({ id, name, bankNames: [] as string[], inflow: 'advance' as const, archived: false, via: null as string | null, opening: { owed: 0, deposit: 0 }, ...over })
  /** Babcia owes `owes` (300 zł; 0 – nothing) for „Leki” and passes her money through Tata; Ciocia owes nothing. */
  function openFamily(owes = 30000): void {
    const leki = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: LEKI, createdAt: AT, updatedAt: AT, date: '2026-10-20', accountId: MBANK_ACCOUNT_ID, amount: -owes, categoryId: defaultCategoryId(5, 0), refundable: true, memberId: BABCIA, counterparty: 'Apteka' })
    open({
      transactions: owes ? [leki] : [],
      patch: (s) => ({
        ...s,
        household: { ...s.household, since: null, assignFrom: null, members: [...s.household.members, person(TATA, 'Tata', { bankNames: ['PIOTR TESTOWY'] }), person(BABCIA, 'Babcia', { via: TATA }), person(CIOCIA, 'Ciocia')] }
      })
    })
  }
  const groups = () => importGroups(state.useImport.getState().plan, state.useImport.getState().choices.restoreDeleted)
  const groupOf = (name: string) => groups().find((g) => g.label === name || g.names.includes(name))!
  const view = () => {
    const s = state.useImport.getState()
    return state.sharesView(s.plan, s.choices, fleet.fleetNow()?.household ?? null, data.useData.getState().fi!.settings.household.members)!
  }

  it('jedna marka, bez „w tym za” albo z nim: co pokazuje temat – decyzja pierwszej marki jak jest, nic nie sumowane; temat ze swoją decyzją, marki różne albo nie wszystkie – żadna', () => {
    type Theme = Parameters<typeof state.themeCommon>[0]
    const c: Choice = { kind: 'income', categoryId: null, refundable: false, household: true, memberId: TATA, advance: true, counterAccountId: null }
    const one = { ...c, shares: [{ memberId: BABCIA, amount: 10000, advance: true }, { memberId: TATA, amount: 5000, advance: true }] }
    const single = { theme: 'x', groups: [{ group: 'a' }] } as unknown as Theme
    const two = { theme: 'x', groups: [{ group: 'a' }, { group: 'b' }] } as unknown as Theme
    const of = (t: Theme, ch: Pick<ImportChoices, 'themes' | 'groups'>) => [state.themeShows(t, ch), state.themeCommon(t, ch), state.themeSharesFrom(t, state.themeShows(t, ch))]
    // One brand: its decision with its lines – the theme's row shows its spread (its own key), a change there is the theme's.
    expect(of(single, { themes: {}, groups: { a: one } })).toEqual(['same', one, 'g:a'])
    // Brands alike without lines of an amount (of 0 zł aside – `sameChoice`): their decision, a line typed there the theme's.
    const zero = { ...c, shares: [{ memberId: CIOCIA, amount: 0, advance: true }] }
    expect(of(two, { themes: {}, groups: { a: c, b: { ...c } } })).toEqual(['same', c, ['g:a', 'g:b']])
    expect(of(two, { themes: {}, groups: { a: zero, b: c } })).toEqual(['same', zero, ['g:a', 'g:b']])
    // Brands alike with lines: the first brand's decision as it is – what each typed, never their sum (review N1 2, 3, 4).
    expect(state.themeCommon(two, { themes: {}, groups: { a: one, b: { ...one } } })).toBe(one)
    expect(state.themeShows(two, { themes: {}, groups: { a: { ...one, shares: [{ memberId: CIOCIA, amount: 0, advance: true }, ...one.shares] }, b: one } })).toBe('brands')
    // The theme's own decision, brands not all decided or decided differently: nothing of theirs.
    expect(of(two, { themes: { x: c }, groups: { a: c, b: c } })).toEqual(['theme', undefined, 't:x'])
    expect(of(two, { themes: {}, groups: { a: c } })).toEqual(['open', undefined, 't:x'])
    expect(of(two, { themes: {}, groups: { a: c, b: { ...c, advance: false } } })).toEqual(['mixed', undefined, 't:x'])
  })

  it('lineSpreads: linie jednej decyzji na swoim miejscu (także 0 zł) – mniej niż wpisano, bo osoba nic więcej nie ma oddać, albo bo zabrakło pieniędzy', () => {
    const line = (n: number, memberId: string, typed: number, given: number[]) => ({ line: n, memberId, typed, given: given.map((amount, i) => ({ key: `r${n}${i}`, date: `2026-10-2${i}`, amount })) })
    const v: SharesView = {
      parts: new Map(),
      rows: new Map(),
      // Babcia owes 150 zł and is credited with all of it; Ciocia owes 100 zł, credited with 30 zł.
      owed: new Map([
        [BABCIA, 15000],
        [CIOCIA, 10000]
      ]),
      total: new Map([
        [BABCIA, 15000],
        [CIOCIA, 3000]
      ]),
      spread: new Map([['g:a', [line(0, CIOCIA, 0, []), line(1, BABCIA, 10000, [6000]), line(2, CIOCIA, 5000, [3000])]]])
    }
    // Review N1 4, 8: each line at its own place in the decision's lines – of one decision only, nothing to misalign.
    expect(state.lineSpreads(v, 'g:a')).toEqual({
      0: { typed: 0, given: [], capped: false },
      1: { typed: 10000, given: [{ date: '2026-10-20', amount: 6000 }], capped: true },
      2: { typed: 5000, given: [{ date: '2026-10-20', amount: 3000 }], capped: false }
    })
    expect(state.lineSpreads(v, 'g:b')).toEqual({})
  })

  const choicesNow = () => state.useImport.getState().choices
  /** Tata's transfers under two of his names (two brands of one theme), each brand „w tym za Babcia 100 zł”. */
  async function twoBrands(transfers: CsvTransfer[], owes?: number, buys: CsvBuy[] = []) {
    openFamily(owes)
    await state.loadImportFile('lista.csv', bytes(listaCsv(buys, PERIOD, null, transfers)))
    const big = groupOf('PIOTR TESTOWY')
    const small = groupOf('TESTOWY PIOTR')
    expect(small.theme).toBe(big.theme)
    const theme = () => importThemes(groups()).find((t) => t.theme === big.theme)!
    const shares = [{ memberId: BABCIA, amount: 10000, advance: true }]
    state.decideGroup(big.group, { ...big.proposed, shares })
    state.decideGroup(small.group, { ...small.proposed, shares })
    expect(state.themeShows(theme(), choicesNow())).toBe('brands')
    // What the theme's row shows – the screen's own call (review N1 3, 4: ThemeRow calls themeCommon), else its own decision.
    const shown = () => state.themeCommon(theme(), choicesNow()) ?? choicesNow().themes[theme().theme]!
    return { big, small, theme, shown }
  }

  it('przegląd N1 2, 5: dwie marki po „w tym za Babcia 100 zł” – razem 200 zł; zmiana w temacie – każda marka dalej daje swoje 100 zł', async () => {
    const { big, small, theme, shown } = await twoBrands([
      { date: '2026-10-29', amount: 200, name: 'PIOTR TESTOWY', title: 'ZWROT' },
      { date: '2026-11-01', amount: 300, name: 'PIOTR TESTOWY', title: 'OD TATY I BABCI' },
      { date: '2026-10-30', amount: 150, name: 'TESTOWY PIOTR', title: 'NA ZAKUPY' }
    ])
    expect(view().total.get(BABCIA)).toBe(20000)
    // The theme's row shows the brands' decision as each typed it: 100 zł – theirs, not the theme's (before: one brand's
    // 100 zł made the theme's decision – Babcia's half lost).
    expect(shown().shares).toEqual([{ memberId: BABCIA, amount: 10000, advance: true }])
    state.chooseThemeRow(theme(), { ...shown(), advance: false, inflowKind: 'repay' })
    expect(state.themeShows(theme(), choicesNow())).toBe('brands')
    expect([choicesNow().groups[big.group]?.advance, choicesNow().groups[small.group]?.advance]).toEqual([false, false])
    expect(view().total.get(BABCIA)).toBe(20000)
  })

  it('przegląd N1 3, 1: wpłatom marki zabrakło pieniędzy – przy marce „30 z 100 zł (tyle zostało we wpłatach)”; zmiana w temacie – Babcia dalej 130 zł', async () => {
    const { small, theme, shown } = await twoBrands([
      { date: '2026-10-29', amount: 200, name: 'PIOTR TESTOWY', title: 'ZWROT' },
      { date: '2026-11-01', amount: 300, name: 'PIOTR TESTOWY', title: 'OD TATY I BABCI' },
      { date: '2026-10-30', amount: 30, name: 'TESTOWY PIOTR', title: 'NA ZAKUPY' }
    ])
    // The small brand's only transfer has 30 zł: its 100 zł gives 30 – said at its line (the money, not the debt).
    expect(view().total.get(BABCIA)).toBe(13000)
    expect(state.lineSpreads(view(), `g:${small.group}`)).toEqual({ 0: { typed: 10000, given: [{ date: '2026-10-30', amount: 3000 }], capped: false } })
    // A change on the theme's row (before review N1 3: 200 zł spread over all the rows – Babcia given 70 zł nobody sent).
    state.chooseThemeRow(theme(), { ...shown(), advance: false, inflowKind: 'repay' })
    expect(view().total.get(BABCIA)).toBe(13000)
  })

  it('przegląd N1 3, 1: wiersz marki z własną decyzją – jej „w tym za” nic nie daje (bez uwagi); zmiana w temacie – Babcia dalej 100 zł', async () => {
    const { small, theme, shown } = await twoBrands([
      { date: '2026-10-29', amount: 200, name: 'PIOTR TESTOWY', title: 'ZWROT' },
      { date: '2026-11-01', amount: 300, name: 'PIOTR TESTOWY', title: 'OD TATY I BABCI' },
      { date: '2026-10-30', amount: 150, name: 'TESTOWY PIOTR', title: 'NA ZAKUPY' }
    ])
    // The small brand's only row decided on its own (no „w tym za”): the brand's decision takes no row.
    state.chooseRow(small.rows[0]!.key, { ...small.proposed })
    expect(view().total.get(BABCIA)).toBe(10000)
    expect(state.lineSpreads(view(), `g:${small.group}`)).toEqual({})
    state.chooseThemeRow(theme(), { ...shown(), advance: false, inflowKind: 'repay' })
    expect(view().total.get(BABCIA)).toBe(10000)
  })

  // Review N1 4: the theme's row of two brands with „w tym za” showed one line made of what they gave now – with no sign of
  // a brand's amount not credited (1), and any change there saved that line as the theme's decision (2).
  const TATA_TWICE: CsvTransfer[] = [
    { date: '2026-10-29', amount: 200, name: 'PIOTR TESTOWY', title: 'ZWROT' },
    { date: '2026-11-01', amount: 300, name: 'PIOTR TESTOWY', title: 'OD TATY I BABCI' },
    { date: '2026-10-30', amount: 150, name: 'TESTOWY PIOTR', title: 'NA ZAKUPY' }
  ]
  /** What each member is credited with in the file (their repayments: own money and parts). */
  const credited = () => Object.fromEntries(view().total)

  it('przegląd N1 4, 1: dwie marki po „w tym za Babcia 100 zł”, Babcia ma oddać 100 zł albo nic – temat nie składa linii z marek; przy marce, której 100 zł nie poszło: „nie ma nic do oddania”', async () => {
    for (const owes of [10000, 0]) {
      const { big, small, theme, shown } = await twoBrands(TATA_TWICE, owes)
      // The theme's row: the brands' decision as each typed it – its lines are the brands' (said there, edited in each).
      expect(state.themeShows(theme(), choicesNow())).toBe('brands')
      expect(shown()).toBe(choicesNow().groups[big.group])
      // Each brand's line, with its note (before: the theme's one line – 100 zł „z wpłaty …”, or empty with no note).
      const lines = (g: typeof big) => state.lineSpreads(view(), `g:${g.group}`)
      expect(lines(big)).toEqual({ 0: { typed: 10000, given: owes ? [{ date: '2026-10-29', amount: 10000 }] : [], capped: !owes } })
      expect(lines(small)).toEqual({ 0: { typed: 10000, given: [], capped: true } })
      expect(view().total.get(BABCIA) ?? 0).toBe(owes)
    }
  })

  it('przegląd N1 4, 2: zmiana w temacie marek z „w tym za” (tylko kategoria, cel wpłaty) – każda marka zostaje ze swoimi liniami; zaliczone bez zmian, a gdy dług urośnie – tyle, ile wpisano', async () => {
    const APTEKA: CsvBuy = { date: '2026-10-31', amount: 180, name: 'APTEKA POD LIPA' }
    for (const owes of [12000, 0]) {
      const { big, small, theme, shown } = await twoBrands(TATA_TWICE, owes, [APTEKA])
      // The small brand has a line of 0 zł first (Ciocia's, being typed): the same decision – lines of 0 zł aside.
      const typed = [{ memberId: CIOCIA, amount: 0, advance: true }, { memberId: BABCIA, amount: 10000, advance: true }]
      state.decideGroup(small.group, { ...small.proposed, shares: typed })
      // Babcia owes 120 zł: the brands give 100 + 20 now (owes nothing: 0).
      expect(view().total.get(BABCIA) ?? 0).toBe(owes)
      const before = credited()
      // Only the category changed on the theme's row: every member credited as before.
      state.chooseThemeRow(theme(), { ...shown(), categoryId: defaultCategoryId(5, 0) })
      expect(credited()).toEqual(before)
      // The sender's money as his income now (the row's „cel wpłaty”): Babcia's parts the same.
      state.chooseThemeRow(theme(), { ...shown(), inflowKind: 'income', advance: false })
      expect(view().total.get(BABCIA) ?? 0).toBe(owes)
      // Later the pharmacy becomes Babcia's purchase (+180 zł): the brands give what each typed (before: the theme's
      // 120 zł – or 0 zł, its „w tym za” cleared – whatever she owes).
      const apteka = groupOf('APTEKA POD LIPA')
      state.decideGroup(apteka.group, { ...apteka.proposed, kind: 'expense', refundable: true, memberId: BABCIA, categoryId: defaultCategoryId(5, 0) })
      expect(view().total.get(BABCIA)).toBe(Math.min(20000, owes + 18000))
      // Never a theme decision: each brand's own with the changes, its lines as typed (a line of 0 zł too).
      expect(choicesNow().themes[theme().theme]).toBeUndefined()
      expect(choicesNow().groups[big.group]).toMatchObject({ categoryId: defaultCategoryId(5, 0), inflowKind: 'income', shares: [{ memberId: BABCIA, amount: 10000, advance: true }] })
      expect(choicesNow().groups[small.group]).toMatchObject({ categoryId: defaultCategoryId(5, 0), inflowKind: 'income', shares: typed })
      expect(state.themeShows(theme(), choicesNow())).toBe('brands')
      // Its note at its own line, after the line of 0 zł (review N1 4, 8: never another member's line).
      expect(state.lineSpreads(view(), `g:${small.group}`)).toEqual({ 0: { typed: 0, given: [], capped: false }, 1: { typed: 10000, given: [{ date: '2026-10-30', amount: owes ? 10000 : 8000 }], capped: !owes } })
    }
  })

  it('przegląd N1 4, 2: inny rodzaj w temacie marek – każda marka bez linii, jak zmiana rodzaju w marce; temat bez linii – zmiana tam to decyzja tematu', async () => {
    const { big, small, theme, shown } = await twoBrands(TATA_TWICE)
    expect(view().total.get(BABCIA)).toBe(20000)
    // „Od domownika: Tata – reszta jako przychód” on the theme's row: the kind changed – the lines go, in every brand alike.
    state.chooseThemeRow(theme(), options.choiceFor(`household:${TATA}:income`, shown()))
    expect([choicesNow().groups[big.group]?.shares, choicesNow().groups[small.group]?.shares]).toEqual([undefined, undefined])
    expect(state.themeShows(theme(), choicesNow())).toBe('same')
    // Their decision without lines: a line typed on the theme's row is the theme's – for all its rows together (T328).
    state.chooseThemeRow(theme(), { ...shown(), shares: [{ memberId: BABCIA, amount: 10000, advance: true }] })
    expect(state.themeShows(theme(), choicesNow())).toBe('theme')
    expect(view().total.get(BABCIA)).toBe(10000)
  })
})

describe('przegląd N1 3, 6: kopia, której zakupów operacja tutaj nie przejmie – podgląd mówi, co da jej usunięcie, nie że jest usunięta', () => {
  it('nie zaznaczona (inna decyzja): „po usunięciu … znów do oddania”; kopia ze swoimi zakupami – tylko ten powód; zostaje – dlaczego', () => {
    const copy = { conflict: true, otherCovers: false, dropsCovers: true, blocked: null }
    expect(state.copyNotes(copy)).toEqual(['inna decyzja w kopii', 'po usunięciu spłacane przez nią zakupy będą znów do oddania'])
    expect(state.copyNotes({ ...copy, conflict: false, otherCovers: true })).toEqual(['kopia spłaca inne zakupy niż operacja tutaj'])
    expect(state.copyNotes({ conflict: false, otherCovers: false, dropsCovers: false, blocked: 'docked' })).toEqual(['zadokowana – zostaje (usuń ją sam po przeniesieniu dokowania)'])
    expect(state.copyNotes({ conflict: false, otherCovers: false, dropsCovers: false, blocked: null })).toEqual([])
  })
})

describe('przegląd N1 3, 7: sprawdzenie po imporcie tego komputera nie zakrywa importu drugiego komputera na tym samym koncie (T332)', () => {
  const PERIOD = { from: '2026-10-19', to: '2026-10-26' }
  /** The other computer's import on mBank (an older version: a deleted operation of the bank back), its clock behind. */
  const B = '2026-11-04T11:55:00.000Z'
  const due = (dir: string) => returned.deletedReadDue(dir, returned.importsMark(data.useData.getState().fi))
  /** The folder opened again with the import settings `imp` (fi.json as it came from the disk). */
  const reopen = (dir: string, imp: Partial<SettingsFile['settings']['import']>) => open({ dir, transactions: operations(), patch: (s) => ({ ...s, import: { ...s.import, ...imp } }) })
  const importHere = async () => {
    await state.loadImportFile('lista.csv', bytes(listaCsv([{ date: '2026-10-20', amount: 87.91, name: 'SLUSARZ KOWAL' }], PERIOD)))
    await state.runImport()
  }

  it('import drugiego komputera scalony pod czasem importu tego komputera (ostatni import konta – ten stąd): przy następnym otwarciu czytane', async () => {
    const dir = open()
    await importHere()
    const mine = data.useData.getState().fi!.settings.import
    // This computer's import alone: nothing else to read at the next opening.
    reopen(dir, { lastImport: mine.lastImport, log: mine.log })
    expect(due(dir)).toBe(false)
    // fi.json merged with the other computer's: the account's last import kept as this one's (a conflict – „mine”), the
    // other's import in the log (a key of its own). Before: the mark – the accounts' last imports only – the same as this
    // computer's own after its import; the history never read at the opening, „Wróciły po usunięciu” not shown.
    reopen(dir, { lastImport: mine.lastImport, log: { ...mine.log, [B]: MBANK_ACCOUNT_ID } })
    expect(due(dir)).toBe(true)
  })

  it('import drugiego komputera dotarł, gdy import tego komputera czytał usunięte – jego czas zastąpiony tutejszym: czytane', async () => {
    const dir = open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([{ date: '2026-10-20', amount: 87.91, name: 'SLUSARZ KOWAL' }], PERIOD)))
    // The other computer's fi.json synced while the import reads the deleted ones (after the check's mark was taken).
    api.historyDeleted.mockImplementationOnce(async () => {
      const fi = data.useData.getState().fi!
      const imp = fi.settings.import
      data.useData.setState({ fi: { ...fi, settings: { ...fi.settings, import: { ...imp, lastImport: { ...imp.lastImport, [MBANK_ACCOUNT_ID]: B }, log: { ...imp.log, [B]: MBANK_ACCOUNT_ID } } } } })
      return []
    })
    await state.runImport()
    // The import writes its own time over the other's (lastImport) – before: the check moved onto it, so the folder's mark
    // equalled this computer's; never read.
    expect(data.useData.getState().fi!.settings.import.lastImport[MBANK_ACCOUNT_ID]).not.toBe(B)
    expect(due(dir)).toBe(true)
  })
})

describe('przegląd N1 2, 9: usunięte czytane po otwarciu folderu, gdy zmienił się którykolwiek import – bez porównywania zegarów komputerów', () => {
  const A = '2026-11-04T12:00:00.000Z'
  /** Another computer's import, its clock 10 minutes behind: after this computer's check, its time earlier. */
  const B = '2026-11-04T11:55:00.000Z'
  const due = (dir: string) => returned.deletedReadDue(dir, returned.importsMark(data.useData.getState().fi))

  it('import drugiego komputera z zegarem do tyłu – na innym koncie albo na tym samym: czytane', async () => {
    const dir = open({ patch: withImports({ [MBANK_ACCOUNT_ID]: A }) })
    expect(due(dir)).toBe(true)
    await returned.readDeletedBank()
    expect(due(dir)).toBe(false)
    // Before: its time not later than the newest one checked – never read at the opening.
    open({ dir, patch: withImports({ [MBANK_ACCOUNT_ID]: A, [XTB_WALLET_ACCOUNT_ID]: B }) })
    expect(due(dir)).toBe(true)
    await returned.readDeletedBank()
    expect(due(dir)).toBe(false)
    open({ dir, patch: withImports({ [MBANK_ACCOUNT_ID]: B, [XTB_WALLET_ACCOUNT_ID]: B }) })
    expect(due(dir)).toBe(true)
  })

  it('import tego komputera przesuwa sprawdzenie o swój import – import drugiego komputera z wcześniejszą godziną dalej czytany', async () => {
    const dir = open()
    const PERIOD = { from: '2026-10-19', to: '2026-10-26' }
    await state.loadImportFile('lista.csv', bytes(listaCsv([{ date: '2026-10-20', amount: 87.91, name: 'SLUSARZ KOWAL' }], PERIOD)))
    await state.runImport()
    expect(due(dir)).toBe(false)
    // The other computer's import on the wallet, stamped before this one's (its clock behind): read at the next opening.
    const mine = data.useData.getState().fi!.settings.import.lastImport
    open({ dir, transactions: operations(), patch: withImports({ ...mine, [XTB_WALLET_ACCOUNT_ID]: '2026-01-02T00:00:00.000Z' }) })
    expect(due(dir)).toBe(true)
  })

  it('zapamiętany stan w starszej postaci (sam czas) – czytane jak bez sprawdzenia', () => {
    const dir = open({ patch: withImports({ [MBANK_ACCOUNT_ID]: A }) })
    stored.set(`fi.returned.checked:${dir}`, A)
    expect(due(dir)).toBe(true)
  })
})

describe('przegląd N1 2, 10: podpis planu (B38) obejmuje to, czy kopia ma inną decyzję i czy spłaca zakupy', () => {
  const MAMA = '01KN2SMAMA0000000000000004'
  const mama = { id: MAMA, name: 'Mama', bankNames: ['ANNA MAMA'], inflow: 'income' as const, archived: false }
  const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
  const family = { rules: [], ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings.categories), loans: [], members: [...settings.household.members, mama] }
  const PERIOD = { from: '2026-10-19', to: '2026-10-26' }
  const IN = 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY'
  const row = (format: MbankFile['format']): MbankRow => ({
    line: 1,
    date: '2026-10-22',
    description: format === 'lista' ? `ANNA MAMA, ZA ZAKUPY  ${IN}` : `${IN} ANNA MAMA ZA ZAKUPY`,
    operation: IN,
    counterparty: 'ANNA MAMA',
    title: 'ZA ZAKUPY',
    accountNo: '',
    category: '',
    amount: 10000,
    pending: false,
    balanceAfter: null
  })
  const fromMama = (format: MbankFile['format']): MbankFile => ({ format, client: 'JAN KAPITAN', account: null, period: PERIOD, rows: [row(format)], skipped: [] })
  const choices: ImportChoices = { themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} }
  let seq = 0
  const makeId = () => `01KN2S${String(++seq).padStart(20, '0')}`
  const buy = (date: string, amount: number, counterparty: string) =>
    transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: defaultCategoryId(1, 1), refundable: true, memberId: MAMA, counterparty })
  const apply = (plan: ImportPlan, existing: readonly Transaction[], now: string) => {
    const result = buildImport(plan, choices, { now, makeId, rules: [] })
    const byId = new Map(existing.map((t) => [t.id, t]))
    for (const t of [...result.update, ...result.create]) byId.set(t.id, t)
    for (const id of result.remove) byId.delete(id)
    return [...byId.values()]
  }

  it('operacja tutaj dostała własne zakupy (albo inną decyzję) po podglądzie: inny podpis – import staje „sprawdź podgląd”', () => {
    const lidl = buy('2026-10-10', -6000, 'Lidl')
    const rossmann = buy('2026-10-12', -4000, 'Rossmann')
    // Mama's transfer imported onto the wallet by mistake (its copy pays back Lidl), then here in the other format.
    const wrong = apply(planImport(fromMama('lista'), XTB_WALLET_ACCOUNT_ID, [lidl, rossmann], family), [lidl, rossmann], '2026-10-27T10:00:00.000Z').map((t) =>
      t.accountId === XTB_WALLET_ACCOUNT_ID ? { ...t, covers: [lidl.id] } : t
    )
    const both = apply(planImport(fromMama('historia'), MBANK_ACCOUNT_ID, wrong, family), wrong, '2026-10-28T10:00:00.000Z')
    const here = (over: Partial<Transaction>) => both.map((t) => (t.accountId === MBANK_ACCOUNT_ID && t.kind === 'income' ? { ...t, ...over } : t))
    const shown = planImport(fromMama('lista'), MBANK_ACCOUNT_ID, both, family)
    const copy = (plan: ImportPlan) => (plan.rows[0]!.status === 'known' ? plan.rows[0]!.copy : undefined)
    expect(copy(shown)).toMatchObject({ remove: true, otherCovers: false, conflict: false })
    // Meanwhile (Operacje, the other computer) the operation here names its own purchase: the copy is not removed now.
    const named = planImport(fromMama('lista'), MBANK_ACCOUNT_ID, here({ covers: [rossmann.id] }), family)
    expect(copy(named)).toMatchObject({ remove: false, otherCovers: true })
    expect(state.planSignature(named)).not.toBe(state.planSignature(shown))
    // … or decides otherwise (plain income): the same.
    const other = planImport(fromMama('lista'), MBANK_ACCOUNT_ID, here({ memberId: null }), family)
    expect(copy(other)).toMatchObject({ remove: false, conflict: true })
    expect(state.planSignature(other)).not.toBe(state.planSignature(shown))
  })
})
