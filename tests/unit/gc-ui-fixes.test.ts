import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { IMPORT_MAX_BYTES } from '@shared/import/text'
import { isOver, monthComparison } from '@shared/calc/drill'
import { wealthCurve } from '@shared/calc/intel'
import { createDefaultSettings } from '@shared/defaults'
import { operationRows, partRowsOf } from '@shared/export/budget'
import { notesOf } from '@shared/releaseNotes'
import { balanceSchema, defaultCategoryId, loanSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'
import { categoryIndex } from '@shared/calc/operations'

vi.stubGlobal('window', { fi: {} })
const loadModule = (p: string): Promise<Record<string, unknown>> => import(p) as Promise<Record<string, unknown>>
const importState = (await loadModule('@renderer/features/import/state')) as {
  dropImportFile: (f: File) => Promise<void>
  fileError: (name: string, error: string) => void
  useImport: { getState: () => { error: string | null; errorName: string | null } }
}
const { dropImportFile, fileError, useImport } = importState
const { operationRowText } = (await loadModule('@renderer/features/operations/rowText')) as {
  operationRowText: (t: Transaction, o: Record<string, unknown>) => { shown: string }
}

const root = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5GC0000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1, 1)
const s = createDefaultSettings(AT).settings
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: FOOD, ...over })

describe('GC (T512–T518): interfejs, telefon, eksport i drobne', () => {
  it('T512: Plan miesiąca zawiera wykres Sankeya (month-plan-sankey) oraz wyjaśnienie braku rat celów (PM sp. 2)', () => {
    const monthPage = read('src/renderer/features/month/MonthPage.tsx')
    expect(monthPage).toContain('MonthSankey')
    expect(monthPage).toContain('month-plan-sankey')
    expect(monthPage).toContain('split-rates-skipped')
    expect(monthPage).toContain('w dniu 1. miesiąca osłony lub kadłub nie były pełne')
  })

  it('T513: Telefon – lista operacji przekazuje pożyczki do operationRowText, a ustawienia mają wybór godziny odprawy', () => {
    const loan = loanSchema.parse({
      ...base(),
      name: 'Jan',
      direction: 'given',
      amount: zl(1000),
      date: '2026-09-01'
    })
    const cats = categoryIndex(s.categories)
    const inflowWithLoan = tx('2026-10-05', zl(500), {
      kind: 'income',
      categoryId: null,
      splits: [{ id: nextId(), amount: zl(200), categoryId: null, refundable: false, memberId: null, advance: false, loanId: loan.id, note: '' }]
    })
    const directLoan = tx('2026-10-06', -zl(1000), {
      kind: 'loan',
      categoryId: null,
      loanId: loan.id
    })
    expect(operationRowText(inflowWithLoan, { categories: cats, accounts: s.accounts, members: s.household.members, loans: [loan] }).shown).toContain('spłata pożyczki: Jan')
    expect(operationRowText(directLoan, { categories: cats, accounts: s.accounts, members: s.household.members, loans: [loan] }).shown).toBe('Pożyczka: Jan')

    const phoneOps = read('src/mobile/app/PhoneOperations.tsx')
    expect(phoneOps).toContain("useRecordList('loans')")
    expect(phoneOps).toMatch(/operationRowText\([^)]*loans/)

    const phoneSettings = read('src/mobile/app/PhoneSettings.tsx')
    expect(phoneSettings).toContain('data-testid="phone-briefing-time"')
  })

  it('T514: Eksport – operacje i części uwzględniają pożyczkę (D100) bez przesunięcia kolumn', () => {
    const loan = loanSchema.parse({
      ...base(),
      name: 'Pożyczka dla Jana',
      direction: 'given',
      amount: zl(1000),
      date: '2026-09-01'
    })
    const inflow = tx('2026-10-10', zl(500), {
      kind: 'income',
      categoryId: null,
      counterparty: 'JAN KOWALSKI',
      splits: [{ id: nextId(), amount: zl(200), categoryId: null, refundable: false, memberId: null, advance: false, loanId: loan.id, note: 'rata' }]
    })
    const loanOp = tx('2026-10-02', -zl(1000), {
      kind: 'loan',
      categoryId: null,
      counterparty: 'JAN KOWALSKI',
      loanId: loan.id
    })
    const mainRows = operationRows([inflow, loanOp], s.categories, s.accounts, '2026-10-01', '2026-10-31', s.household.members, [loan])
    expect(mainRows.map((r) => [r.counterparty, r.amount, r.financed])).toEqual([
      ['JAN KOWALSKI', -zl(1000), 'Pożyczka: Pożyczka dla Jana'],
      ['JAN KOWALSKI', zl(500), 'Pożyczka: Pożyczka dla Jana']
    ])

    const parts = partRowsOf([inflow, loanOp], s.categories, s.accounts, s.household.members, null, [loan])
    expect(parts.map((r) => [r.part, r.amount, r.financed, r.note])).toEqual([
      ['1 z 2', zl(200), 'Pożyczka: Pożyczka dla Jana', 'rata'],
      ['2 z 2', zl(300), '', ''],
      ['', -zl(1000), 'Pożyczka: Pożyczka dla Jana', '']
    ])
  })

  it('T515: Teksty i styl – zaliczka na przyszłość, otagowanie w Szybkim wpisie, kontrast .kbd, releaseNotes bez kodów', () => {
    const pickers = read('src/renderer/features/household/MemberPickers.tsx')
    expect(pickers).toContain('zaliczka na przyszłość')
    expect(pickers).not.toContain('depozyt na przyszłość')

    const quick = read('src/renderer/features/quick/QuickApp.tsx')
    expect(quick).toContain('basis-full')

    const css = read('src/renderer/styles/index.css')
    expect(css).toContain('prefers-contrast: more')

    const notes = notesOf(read('CHANGELOG.md'), '1.15.9', '1.0.0')
    expect(notes.length).toBeGreaterThan(0)
    expect(notes).not.toMatch(/\((?:D|B|F|T|N-PC-|AP-|AF-)\d+/)
  })

  it('T516 (IM sp. 7): odrzucenie za dużego pliku nadpisuje poprzedni baner błędu w stanie importu', async () => {
    fileError('stary.csv', 'Nie udało się rozpoznać formatu')
    expect(useImport.getState().errorName).toBe('stary.csv')

    const bigFile = {
      name: 'za-duzy.csv',
      size: IMPORT_MAX_BYTES + 1024,
      arrayBuffer: async () => new ArrayBuffer(0)
    } as unknown as File

    await dropImportFile(bigFile)
    expect(useImport.getState().errorName).toBe('za-duzy.csv')
    expect(useImport.getState().error).toContain('za-duzy.csv')
  })

  it('T516–T518: skrót Synchronizacji (IN sp. 1), strażnik salda (OP.20), blokada + Nowa (OP.42), + Zapisz widok (OP.10), podgląd przelewów (ME sp. 4)', () => {
    const app = read('src/renderer/app/App.tsx')
    expect(app).toContain('keys="Ctrl Shift Y"')
    expect(app).not.toContain('badge ? (')

    const editor = read('src/renderer/features/operations/OperationEditor.tsx')
    expect(editor).not.toContain('isDraft || fresh')

    const opsPage = read('src/renderer/features/operations/OperationsPage.tsx')
    expect(opsPage).toMatch(/folderLocked[\s\S]{0,200}data-testid="operation-new"/)

    const listTools = read('src/renderer/features/operations/ListTools.tsx')
    expect(listTools).toContain('Ustaw filtr, aby zapisać widok')

    const inboxPage = read('src/renderer/features/inbox/InboxPage.tsx')
    expect(inboxPage).toContain('inbox-transfer-preview')
  })

  it('T518 (AF-54 / MO.30): wealthCurve wymaga co najmniej 14 dni historii', () => {
    const shortOpening = balanceSchema.parse({ ...base(), date: '2026-10-29', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(25000) })
    expect(wealthCurve([tx('2026-11-02', -zl(60))], [shortOpening], [MBANK_ACCOUNT_ID], '2026-11-03')).toEqual([])

    const weekOpening = balanceSchema.parse({ ...base(), date: '2026-10-27', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(25000) })
    expect(wealthCurve([tx('2026-11-02', -zl(60))], [weekOpening], [MBANK_ACCOUNT_ID], '2026-11-03')).toEqual([])

    const twoWeeksOpening = balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(1000) })
    expect(wealthCurve([tx('2026-10-06', -zl(200))], [twoWeeksOpening], [MBANK_ACCOUNT_ID], '2026-10-15').length).toBeGreaterThanOrEqual(3)
  })

  it('T518 (WY.14): monthComparison zwraca pustą tablicę dla miesiąca bez wydatków, a isOver wykrywa wydatek przy średniej 0 zł', () => {
    const prevOnly = [tx('2026-09-10', -zl(200))]
    expect(monthComparison(prevOnly, s.categories, '2026-10', ['2026-09'])).toEqual([])
    expect(isOver(zl(50), 0)).toBe(true)
    expect(isOver(0, 0)).toBe(false)
  })
})
