import { beforeEach, describe, expect, it, vi } from 'vitest'

// The columns live in this computer's storage (D89): a stand-in for the window's localStorage.
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) })
storage.set('fi.operations.columns', JSON.stringify({ hidden: ['tags', 'kolumna-nowszej-wersji'] }))
const cols = await import('../../src/renderer/features/operations/columns')
// What this version read at its start, and what it writes after a change: a newer version's column stays hidden.
const atStart = cols.useOperationColumns.getState().hidden
cols.showColumn('note', false)
const written = JSON.parse(storage.get('fi.operations.columns')!) as unknown

beforeEach(() => cols.resetColumns())

describe('kolumny listy operacji (1.11.0, D89)', () => {
  it('wybór z tego komputera przy starcie – kolumna nowszej wersji zostaje ukryta w zapisie', () => {
    expect(atStart).toEqual(['tags'])
    expect(written).toEqual({ hidden: ['note', 'tags', 'kolumna-nowszej-wersji'] })
    expect(cols.hiddenOf({ hidden: ['tags', 'kolumna-nowszej-wersji'] })).toEqual(['tags'])
    expect(cols.hiddenOf(null)).toEqual([])
    expect(cols.hiddenOf({ hidden: 'note' })).toEqual([])
    expect(cols.hiddenOf({ hidden: [3, 'time'] })).toEqual(['time'])
    // In the list's order, whatever the stored one.
    expect(cols.hiddenOf({ hidden: ['note', 'time'] })).toEqual(['time', 'note'])
    expect(cols.hiddenOf([])).toEqual([])
  })

  it('domyślnie wszystkie widoczne; data i kwota zawsze w siatce', () => {
    expect(cols.useOperationColumns.getState().hidden).toEqual([])
    expect(cols.columnsTemplate([])).toBe('16px 78px 44px minmax(64px, 1.4fr) minmax(0, 0.7fr) minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.5fr) minmax(0, auto) 110px')
    expect(cols.columnsTemplate([...cols.OPERATION_COLUMNS])).toBe('16px 78px 110px')
  })

  it('ukrycie i pokazanie zapamiętane, „Przywróć domyślne” czyści zapis', () => {
    cols.showColumn('note', false)
    cols.showColumn('time', false)
    cols.showColumn('time', false)
    // The list's order, whatever the order of the clicks.
    expect(cols.useOperationColumns.getState().hidden).toEqual(['time', 'note'])
    expect(JSON.parse(storage.get('fi.operations.columns')!)).toEqual({ hidden: ['time', 'note'] })
    expect(cols.columnsTemplate(cols.useOperationColumns.getState().hidden)).toBe('16px 78px minmax(64px, 1.4fr) minmax(0, 0.7fr) minmax(0, 1fr) minmax(0, 0.5fr) minmax(0, auto) 110px')
    cols.showColumn('time', true)
    expect(cols.useOperationColumns.getState().hidden).toEqual(['note'])
    cols.resetColumns()
    expect(cols.useOperationColumns.getState().hidden).toEqual([])
    expect(storage.has('fi.operations.columns')).toBe(false)
  })
})
