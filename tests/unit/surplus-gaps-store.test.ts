/**
 * 1.19.0, step 0 (D102): what is missing today – each test states the wanted behaviour and is marked `it.fails` until
 * its step makes it pass (then `it.fails` becomes `it`). A member „pytaj” carried in another member's transfer
 * („w tym za”) gets the rest beyond their debt as income without being asked (D80 b broken for the parts – the import
 * and the quick entry); the quick entry cannot say what a part's surplus is.
 */
import { describe, expect, it, vi } from 'vitest'
import type { FolderStatus, Snapshot } from '@shared/api'
import { balanceOf, settleHousehold } from '@shared/calc/household'
import { createDefaultSettings } from '@shared/defaults'
import { importGroups, importThemes } from '@shared/import/reconcile'
import { COLLECTIONS } from '@shared/paths'
import { defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type SettingsFile } from '@shared/schema'
import { listaCsv } from '../e2e/mbank-csv'

const api = {
  saveRecord: vi.fn(async (_c: string, record: { id: string }) => ({ record, relPath: `${record.id}.json`, readOnly: false })),
  saveRecords: vi.fn(async (_c: string, records: Array<{ id: string }>) => records.map((record) => ({ id: record.id, entry: { record, relPath: `${record.id}.json`, readOnly: false } }))),
  saveSettings: vi.fn(async (f: SettingsFile) => f),
  deleteRecord: vi.fn(async () => undefined),
  deleteRecords: vi.fn(async (_c: string, ids: readonly string[]) => ids.map((id) => ({ id }))),
  historyKeep: vi.fn(async () => undefined),
  historyDeleted: vi.fn(async (): Promise<unknown[]> => []),
  importBackup: vi.fn(async () => 'C:\\dane\\backups\\pre-import\\2026-11-04.zip'),
  folderShown: vi.fn(async () => undefined),
  quickResult: vi.fn(async () => undefined)
}
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) })
vi.stubGlobal('window', { fi: api })
const data = await import('../../src/renderer/store/data')
const state = await import('../../src/renderer/features/import/state')
const { quickAdd, quickTransaction } = await import('../../src/renderer/store/quickHost')

const AT = '2026-09-01T10:00:00.000Z'
const TATA = '01KN9GTATA0000000000000001'
const MAMA = '01KN9GMAMA0000000000000002'
const MAMA_BUY = '01KN9GBVY00000000000000003'
const PERIOD = { from: '2026-10-26', to: '2026-11-02' }
const bytes = (text: string) => new TextEncoder().encode(text)
const person = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
/** Tata („przychód”) sends money for Mama too („pytaj”, through Tata); Mama owes 100 zł. */
const MEMBERS = [person(TATA, 'Tata', { bankNames: ['PIOTR TESTOWY'] }), person(MAMA, 'Mama', { inflow: 'ask', via: TATA })]
const mamaBuy = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: MAMA_BUY, createdAt: AT, updatedAt: AT, date: '2026-10-20', accountId: MBANK_ACCOUNT_ID, amount: -10000, categoryId: defaultCategoryId(1, 1), refundable: true, memberId: MAMA, counterparty: 'Apteka' })

let folder = 0
function open(): void {
  const fi: SettingsFile = createDefaultSettings('2026-01-01T00:00:00.000Z')
  const records = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Snapshot['records']
  records.transactions = [{ record: mamaBuy, relPath: `transactions/2026/${mamaBuy.date}_${mamaBuy.id}.json`, readOnly: false }]
  const status: FolderStatus = { dataDir: `/dane-surplus-${++folder}`, available: true, readOnly: false, readOnlyReason: null, folderSchemaVersion: 1, appSchemaVersion: 1, otherMachines: [], migratedFrom: null, backupPath: null }
  data.applySnapshot({
    fi: { ...fi, settings: { ...fi.settings, household: { ...fi.settings.household, since: null, assignFrom: null, members: [...fi.settings.household.members, ...MEMBERS] } } },
    records,
    problems: [],
    conflicts: [],
    status,
    loadMs: 0
  })
}

describe('D102 krok 0 – dziś: część „w tym za” osoby „pytaj” ponad jej dług', () => {
  it('OBECNIE (błąd): import zapisuje nadwyżkę Mamy („pytaj”) jako jej przychód bez pytania', async () => {
    open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [{ date: '2026-11-01', amount: 400, name: 'PIOTR TESTOWY', title: 'ZA MNIE I MAME' }])))
    const g = tataGroup()
    // As „+ w tym za Mama” makes the line today: `advance` from her setting – „pytaj” reads as false (income).
    const key = g.rows[0]!.key
    state.chooseRow(key, { ...g.proposed, shares: [{ memberId: MAMA, amount: 17500, advance: false }] })
    await state.runImport()
    const ops = data.listOf(data.useData.getState().records.transactions)
    const t = ops.find((x) => x.counterparty === 'PIOTR TESTOWY')!
    const flow = settleHousehold(ops).byTx.get(t.id)!.find((f) => f.memberId === MAMA)!
    expect([flow.repaid, flow.advance, flow.income]).toEqual([10000, 0, 7500])
  })

  // Wanted (step 3): the question „zaliczka czy przychód?” stays open for her part's surplus – the theme is to do (as N85
  // for a new member), nothing of it saved as income until answered.
  it('CEL kroku 3: temat Taty „do zrobienia”, dopóki nadwyżka części Mamy („pytaj”) nie ma odpowiedzi', async () => {
    open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [{ date: '2026-11-01', amount: 400, name: 'PIOTR TESTOWY', title: 'ZA MNIE I MAME' }])))
    const g = tataGroup()
    // A row's own line beyond her debt (as typed – T327): 75 zł of hers beyond the 100 zł she owes, nobody asked.
    state.decideGroup(g.group, { ...g.proposed })
    state.chooseRow(g.rows[0]!.key, { ...g.proposed, shares: [{ memberId: MAMA, amount: 17500, advance: false }] })
    const theme = importThemes(groups()).find((x) => x.groups.some((y) => y.group === g.group))!
    expect(state.themeStatus(theme, state.useImport.getState().choices)).toBe('todo')
  })

  it('T522: odpowiedź dla nadwyżki Mamy („pytaj”) w „w tym za” zamyka pytanie tematu i zapisuje ustawienie Mamy w fi.json', async () => {
    open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [{ date: '2026-11-01', amount: 400, name: 'PIOTR TESTOWY', title: 'ZA MNIE I MAME' }])))
    const g = tataGroup()
    state.decideGroup(g.group, {
      ...g.proposed,
      surplusSplit: 'even',
      shares: [
        { memberId: MAMA, amount: 10000, advance: false },
        { memberId: MAMA, amount: 7500, advance: false, surplus: true }
      ]
    })
    const theme = importThemes(groups()).find((x) => x.groups.some((y) => y.group === g.group))!
    expect(state.themeStatus(theme, state.useImport.getState().choices)).toBe('todo')
    // User answers „zaliczka” for Mama's surplus:
    state.decideGroup(g.group, {
      ...g.proposed,
      surplusSplit: 'even',
      shares: [
        { memberId: MAMA, amount: 10000, advance: true },
        { memberId: MAMA, amount: 7500, advance: true, inflowKind: 'advance' }
      ]
    })
    expect(state.themeStatus(theme, state.useImport.getState().choices)).toBe('done')
    await state.runImport()
    expect(data.useData.getState().fi!.settings.household.members.find((m) => m.id === MAMA)?.inflow).toBe('advance')
    const ops = data.listOf(data.useData.getState().records.transactions)
    expect(balanceOf(settleHousehold(ops), MAMA)).toMatchObject({ owed: 0, deposit: 7500 })
  })
})

describe('D102 krok 3: reguły pamiętają „w tym za” (bez stałych kwot, najpierw dług) i podział nadwyżki', () => {
  it('T523: decyzja grupy uczy regułę z `alsoFor` i `surplusSplit` (bez stałych kwot); kolejny import najpierw spłaca aktualne długi i dzieli górkę', async () => {
    open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [{ date: '2026-11-01', amount: 400, name: 'PIOTR TESTOWY', title: 'ZA MNIE I MAME' }])))
    const g = tataGroup()
    state.decideGroup(g.group, {
      ...g.proposed,
      surplusSplit: 'even',
      shares: [
        { memberId: MAMA, amount: 10000, advance: false },
        { memberId: MAMA, amount: 7500, advance: false, inflowKind: 'income' }
      ]
    })
    await state.runImport()
    const rule = data.useData.getState().fi!.settings.import.rules.find((r) => r.match === 'piotrtestowy')
    expect(rule).toMatchObject({
      household: true,
      memberId: TATA,
      inflowKind: 'repay',
      alsoFor: [MAMA],
      surplusSplit: 'even'
    })
    expect(rule!.loanAmount).toBeUndefined()

    // Second import: new purchases (Tata owes 40 zł, Mama owes 80 zł) and a 200 zł transfer from Tata.
    // Debts first: 80 zł for Mama + 40 zł for Tata = 120 zł; remaining 80 zł surplus split evenly -> 40 zł for Mama, 40 zł for Tata.
    await state.loadImportFile(
      'lista2.csv',
      bytes(
        listaCsv([], { from: '2026-11-02', to: '2026-11-05' }, null, [
          { date: '2026-11-02', amount: -40, name: 'BIEDRONKA', title: 'ZAKUP' },
          { date: '2026-11-03', amount: -80, name: 'APTEKA', title: 'LEKI' },
          { date: '2026-11-04', amount: 200, name: 'PIOTR TESTOWY', title: 'PRZELEW' }
        ])
      )
    )
    for (const grp of groups()) {
      if (grp.label.toLowerCase().includes('biedronka')) state.decideGroup(grp.group, { ...grp.proposed, refundable: true, memberId: TATA })
      if (grp.label.toLowerCase().includes('apteka')) state.decideGroup(grp.group, { ...grp.proposed, refundable: true, memberId: MAMA })
    }
    await state.runImport()
    const ops = data.listOf(data.useData.getState().records.transactions)
    const second = ops.find((x) => x.date === '2026-11-04' && x.counterparty === 'PIOTR TESTOWY')!
    expect(second.splits.map((s) => [s.memberId, s.amount, s.inflowKind ?? 'repay'])).toEqual([
      [MAMA, 8000, 'repay'],
      [MAMA, 4000, 'income']
    ])
    const ledger = settleHousehold(ops)
    expect(balanceOf(ledger, TATA).owed).toBe(0)
    expect(balanceOf(ledger, MAMA).owed).toBe(0)
  })

  it('T524: reguła z `surplusSplit: "debts"` dzieli górkę proporcjonalnie do długów, a gdy brak górki – spłaca tylko długi (pytaj nie pyta bez górki)', async () => {
    open()
    // Rule already exists for Piotr Testowy with alsoFor: [MAMA], surplusSplit: 'debts'
    data.updateSettings((f) => ({
      ...f,
      settings: {
        ...f.settings,
        import: {
          ...f.settings.import,
          rules: [
            {
              id: '01KN9RULE0000000000000001',
              match: 'piotrtestowy',
              mode: 'exact',
              direction: 'in',
              label: 'PIOTR TESTOWY',
              kind: 'income',
              categoryId: null,
              refundable: false,
              household: true,
              memberId: TATA,
              inflowKind: 'repay',
              alsoFor: [MAMA],
              surplusSplit: 'debts',
              counterAccountId: null,
              learned: false,
              hits: 1,
              updatedAt: AT
            }
          ]
        }
      }
    }))
    // 1) Transfer of 100 zł covers only Mama's 100 zł debt -> 0 surplus -> Mama ('ask') has no surplus, so theme is 'done'!
    await state.loadImportFile('lista-exact.csv', bytes(listaCsv([], PERIOD, null, [{ date: '2026-11-01', amount: 100, name: 'PIOTR TESTOWY', title: 'PRZELEW' }])))
    const themeExact = importThemes(groups()).find((x) => x.groups.some((y) => y.label === 'PIOTR TESTOWY'))!
    expect(state.themeStatus(themeExact, state.useImport.getState().choices)).toBe('done')

    // 2) Transfer of 250 zł -> 100 zł debt (Mama 100, Tata 0) + 150 zł surplus (Mama gets 100/100 * 150 = 150 zł) -> Mama is 'ask', so theme is 'todo'!
    await state.loadImportFile('lista-surplus.csv', bytes(listaCsv([], PERIOD, null, [{ date: '2026-11-01', amount: 250, name: 'PIOTR TESTOWY', title: 'PRZELEW' }])))
    const themeSurplus = importThemes(groups()).find((x) => x.groups.some((y) => y.label === 'PIOTR TESTOWY'))!
    expect(state.themeStatus(themeSurplus, state.useImport.getState().choices)).toBe('todo')

    // 3) T526: User answers „zaliczka” on the rule's `each: true` line on the group/theme -> theme becomes 'done',
    // import writes [MAMA, 10000, 'repay'] + [MAMA, 15000, 'advance'] and remembers Mama's inflow = 'advance' in fi.json.
    const g = tataGroup()
    state.decideGroup(g.group, {
      ...g.proposed,
      shares: [{ memberId: MAMA, amount: 0, each: true, advance: true, advanceChosen: true }]
    })
    expect(state.themeStatus(themeSurplus, state.useImport.getState().choices)).toBe('done')
    await state.runImport()
    expect(data.useData.getState().fi!.settings.household.members.find((m) => m.id === MAMA)?.inflow).toBe('advance')
    const ops = data.listOf(data.useData.getState().records.transactions)
    const t = ops.find((x) => x.counterparty === 'PIOTR TESTOWY')!
    expect(t.splits.map((s) => [s.memberId, s.amount, s.inflowKind ?? 'repay'])).toEqual([
      [MAMA, 10000, 'repay'],
      [MAMA, 15000, 'advance']
    ])
  })

  it('T525: `choiceOfRule`, `ruleDecisionText` i edycja reguły zachowują `alsoFor` i `surplusSplit` (bez stałych kwot)', async () => {
    open()
    const rulesMod = await import('../../src/renderer/features/import/rules')
    const id = '01KN9RULE0000000000000002'
    data.updateSettings((f) => ({
      ...f,
      settings: {
        ...f.settings,
        import: {
          ...f.settings.import,
          rules: [
            {
              id,
              match: 'piotrtestowy',
              mode: 'exact',
              direction: 'in',
              label: 'PIOTR TESTOWY',
              kind: 'income',
              categoryId: null,
              refundable: false,
              household: true,
              memberId: TATA,
              inflowKind: 'repay',
              alsoFor: [MAMA],
              surplusSplit: 'even',
              counterAccountId: null,
              learned: true,
              hits: 1,
              updatedAt: AT
            }
          ]
        }
      }
    }))
    const r0 = data.useData.getState().fi!.settings.import.rules[0]!
    expect(rulesMod.ruleDecisionText(r0, () => '')).toBe('od domownika: Tata · w tym za: Mama · nadwyżka: po równo')
    const c0 = rulesMod.choiceOfRule(r0)
    expect(c0.surplusSplit).toBe('even')
    expect(c0.shares).toEqual([{ memberId: MAMA, amount: 0, advance: false, each: true }])
    rulesMod.editRule(id, { direction: 'in', choice: { ...c0, surplusSplit: 'debts' } })
    const r1 = data.useData.getState().fi!.settings.import.rules[0]!
    expect(r1).toMatchObject({ alsoFor: [MAMA], surplusSplit: 'debts', learned: false })
    expect(rulesMod.ruleDecisionText(r1, () => '')).toBe('od domownika: Tata · w tym za: Mama · nadwyżka: proporcjonalnie do długów')
  })
})

describe('D102 krok 0 – dziś: grupa nie daje nadwyżki innej osobie przez „spłatę”', () => {
  it('OBECNIE (zgodnie z AF-27): linia grupy „w tym za Mama 175” ucięta do jej długu 100 – nadwyżka 75 zł idzie do Taty', async () => {
    open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [{ date: '2026-11-01', amount: 400, name: 'PIOTR TESTOWY', title: 'ZA MNIE I MAME' }])))
    const g = tataGroup()
    state.decideGroup(g.group, { ...g.proposed, shares: [{ memberId: MAMA, amount: 17500, advance: true }] })
    await state.runImport()
    const ops = data.listOf(data.useData.getState().records.transactions)
    const t = ops.find((x) => x.counterparty === 'PIOTR TESTOWY')!
    expect(t.splits.map((s) => [s.memberId, s.amount])).toEqual([[MAMA, 10000]])
    expect(balanceOf(settleHousehold(ops), MAMA)).toMatchObject({ owed: 0, deposit: 0 })
  })

  it('już działa (AP-7): druga linia Mamy z jawnym celem „zaliczka” – jak wpisana; brakuje tylko wyboru celu przy linii w imporcie (krok 3)', async () => {
    open()
    await state.loadImportFile('lista.csv', bytes(listaCsv([], PERIOD, null, [{ date: '2026-11-01', amount: 400, name: 'PIOTR TESTOWY', title: 'ZA MNIE I MAME' }])))
    const g = tataGroup()
    state.decideGroup(g.group, { ...g.proposed, shares: [{ memberId: MAMA, amount: 10000, advance: true }, { memberId: MAMA, amount: 7500, advance: true, inflowKind: 'advance' }] })
    await state.runImport()
    const ops = data.listOf(data.useData.getState().records.transactions)
    expect(balanceOf(settleHousehold(ops), MAMA)).toMatchObject({ owed: 0, deposit: 7500 })
  })
})

describe('D102 krok 0 – dziś: szybki wpis „W tym za” bez celu części', () => {
  const draft = (shares: Array<Record<string, unknown>>) => ({
    kind: 'income' as const,
    amount: 40000,
    categoryId: null,
    accountId: MBANK_ACCOUNT_ID,
    date: '2026-11-01',
    time: '12:00',
    counterparty: 'Tata',
    note: '',
    impulse: null,
    logNote: '',
    household: true,
    memberId: TATA,
    advance: false,
    splits: [],
    shares: shares as never
  })

  // Wanted (step 4): a part's purpose (D102 – „jako”: zaliczka / przychód) kept on its line, as the editor and the import.
  it('CEL kroku 4: część Mamy z celem „zaliczka” zapisana z `inflowKind` na linii', () => {
    const t = quickTransaction(draft([{ memberId: MAMA, amount: 10000, advance: false }, { memberId: MAMA, amount: 7500, advance: true, inflowKind: 'advance' }]))
    if (typeof t === 'string') throw new Error(t)
    expect(t.splits.map((s) => [s.memberId, s.amount, s.inflowKind ?? 'repay'])).toEqual([
      [MAMA, 10000, 'repay'],
      [MAMA, 7500, 'advance']
    ])
  })

  it('krok 4: część Mamy z celem „przychód” zapisana z `inflowKind` na linii', () => {
    const t = quickTransaction(draft([{ memberId: MAMA, amount: 10000, advance: false }, { memberId: MAMA, amount: 7500, advance: false, inflowKind: 'income' }]))
    if (typeof t === 'string') throw new Error(t)
    expect(t.splits.map((s) => [s.memberId, s.amount, s.inflowKind ?? 'repay'])).toEqual([
      [MAMA, 10000, 'repay'],
      [MAMA, 7500, 'income']
    ])
  })

  it('krok 4: quickAdd z jawnym wyborem „zaliczka” w części zapamiętuje wybór w fi.json (D80 b, D102)', async () => {
    open()
    expect(data.useData.getState().fi!.settings.household.members.find((m) => m.id === MAMA)?.inflow).toBe('ask')
    await quickAdd({
      id: '01KN9SP00000000000000001',
      kind: 'income',
      amount: 40000,
      categoryId: null,
      accountId: MBANK_ACCOUNT_ID,
      date: '2026-11-01',
      time: '12:00',
      counterparty: 'Tata',
      note: '',
      impulse: null,
      logNote: '',
      household: true,
      memberId: TATA,
      advance: false,
      splits: [],
      shares: [
        { memberId: MAMA, amount: 10000, advance: false },
        { memberId: MAMA, amount: 7500, advance: true, inflowKind: 'advance', advanceChosen: true }
      ]
    })
    expect(data.useData.getState().fi!.settings.household.members.find((m) => m.id === MAMA)?.inflow).toBe('advance')
  })

  it('krok 4: części sumujące się powyżej kwoty wpłaty są odrzucane z błędem', () => {
    const r = quickTransaction({ ...draft([{ memberId: MAMA, amount: 30000, advance: false }, { memberId: MAMA, amount: 15000, advance: true, inflowKind: 'advance' }]), amount: 40000 })
    expect(r).toBe('Części innych osób przekraczają kwotę wpłaty.')
  })
})

const groups = () => importGroups(state.useImport.getState().plan, state.useImport.getState().choices.restoreDeleted)
const tataGroup = () => groups().find((g) => g.label === 'PIOTR TESTOWY')!
