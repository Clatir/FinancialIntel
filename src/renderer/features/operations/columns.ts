/**
 * The columns of the list of operations (1.11.0, D89): which of them show – on this computer (a laptop and a big screen
 * differ), not in the folder nor in a saved view. The date and the amount always show. What is stored is the hidden
 * ones, so a column a newer version adds shows until it is hidden.
 */
import { create } from 'zustand'

export const OPERATION_COLUMNS = ['time', 'counterparty', 'account', 'note', 'category', 'tags', 'marks'] as const
export type OperationColumn = (typeof OPERATION_COLUMNS)[number]

export const COLUMN_LABEL: Record<OperationColumn, string> = {
  time: 'Godzina',
  counterparty: 'Kontrahent',
  account: 'Konto',
  note: 'Notatka',
  category: 'Kategoria',
  tags: 'Tagi',
  marks: 'Oznaczenia'
}

/**
 * Each column's width: the text columns give way in a narrow window (the window's least width with the details at their
 * width – CI on Windows), so the header never reaches under the details' panel; the marks take what their badges need.
 */
const WIDTH: Record<OperationColumn, string> = {
  time: '44px',
  counterparty: 'minmax(64px, 1.4fr)',
  account: 'minmax(0, 0.7fr)',
  note: 'minmax(0, 1.2fr)',
  category: 'minmax(0, 1fr)',
  tags: 'minmax(0, 0.5fr)',
  marks: 'minmax(0, auto)'
}

const COLUMNS_KEY = 'fi.operations.columns'

/** The names stored as hidden (another shape – none). */
function storedOf(raw: unknown): string[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { hidden?: unknown }).hidden) ? (raw as { hidden: unknown[] }).hidden : []
  return list.filter((x): x is string => typeof x === 'string')
}

/** The hidden columns this version knows, in the list's order. */
export function hiddenOf(raw: unknown): OperationColumn[] {
  const list = storedOf(raw)
  return OPERATION_COLUMNS.filter((c) => list.includes(c))
}

/** The grid of the list's header and rows: the tick, the date, the columns shown, the amount. */
export function columnsTemplate(hidden: readonly OperationColumn[]): string {
  return ['16px', '78px', ...OPERATION_COLUMNS.filter((c) => !hidden.includes(c)).map((c) => WIDTH[c]), '110px'].join(' ')
}

function read(): unknown {
  try {
    return JSON.parse(localStorage.getItem(COLUMNS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** Columns of a newer version hidden there (an older portable exe on the same computer keeps them hidden). */
let newer: string[] = storedOf(read()).filter((x) => !(OPERATION_COLUMNS as readonly string[]).includes(x))

function keep(known: readonly OperationColumn[]): void {
  const hidden = [...known, ...newer]
  try {
    if (hidden.length) localStorage.setItem(COLUMNS_KEY, JSON.stringify({ hidden }))
    else localStorage.removeItem(COLUMNS_KEY)
  } catch {
    /* storage unavailable: the choice lasts for the session */
  }
}

export const useOperationColumns = create<{ hidden: readonly OperationColumn[] }>(() => ({ hidden: hiddenOf(read()) }))

export function showColumn(column: OperationColumn, shown: boolean): void {
  const was = useOperationColumns.getState().hidden
  const hidden = OPERATION_COLUMNS.filter((c) => (c === column ? !shown : was.includes(c)))
  keep(hidden)
  useOperationColumns.setState({ hidden })
}

/** „Przywróć domyślne”: every column shows – a newer version's too. */
export function resetColumns(): void {
  newer = []
  keep([])
  useOperationColumns.setState({ hidden: [] })
}
