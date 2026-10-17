import { create } from 'zustand'
import { warsawNow } from '@shared/calc/dates'
import { newId } from '@shared/ids'
import { emptyFilter, OPERATION_MARKS, type OperationsFilter } from '@shared/operationsView'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, TX_KINDS, transactionSchema, type Transaction } from '@shared/schema'
import { addRecord, discardDraft, useData } from '../../store/data'
import { commitActiveField, navigate } from '../../store/ui'
import { deleteWithUndo } from '../history/actions'

/** Filters of this computer (the period and the search start fresh: this month, empty). */
const FILTER_KEY = 'fi.operations.filter'
const ACCOUNT_KEY = 'fi.operations.account'

function readStored(): Partial<OperationsFilter> {
  try {
    const raw = JSON.parse(localStorage.getItem(FILTER_KEY) ?? '{}') as Partial<OperationsFilter>
    const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    return {
      accounts: strings(raw.accounts),
      kinds: strings(raw.kinds).filter((k): k is OperationsFilter['kinds'][number] => (TX_KINDS as readonly string[]).includes(k)),
      categories: strings(raw.categories),
      marks: strings(raw.marks).filter((m): m is OperationsFilter['marks'][number] => (OPERATION_MARKS as readonly string[]).includes(m))
    }
  } catch {
    return {}
  }
}

function store(f: OperationsFilter): void {
  try {
    localStorage.setItem(FILTER_KEY, JSON.stringify({ accounts: f.accounts, kinds: f.kinds, categories: f.categories, marks: f.marks }))
  } catch {
    /* storage unavailable: the filter lives for the session */
  }
}

interface OperationsUi {
  filter: OperationsFilter
  selectedId: string | null
}

export const useOperationsUi = create<OperationsUi>(() => ({
  filter: { ...emptyFilter(warsawNow().month), ...readStored() },
  selectedId: null
}))

export function setFilter(patch: Partial<OperationsFilter>): void {
  useOperationsUi.setState((s) => {
    const filter = { ...s.filter, ...patch }
    store(filter)
    return { filter }
  })
}

export function resetFilter(): void {
  const filter = emptyFilter(warsawNow().month)
  store(filter)
  useOperationsUi.setState({ filter })
}

/** Select an operation; an untouched new entry left behind is dropped (it was never written). */
export function selectOperation(id: string | null): void {
  // The field being typed in saves first: a new entry with a typed amount is no longer untouched.
  commitActiveField()
  const prev = useOperationsUi.getState().selectedId
  if (prev && prev !== id && useData.getState().drafts[prev]) discardDraft('transactions', prev)
  useOperationsUi.setState({ selectedId: id })
}

const lastAccount = (): string => {
  try {
    return localStorage.getItem(ACCOUNT_KEY) ?? MBANK_ACCOUNT_ID
  } catch {
    return MBANK_ACCOUNT_ID
  }
}

export function rememberAccount(id: string): void {
  try {
    localStorage.setItem(ACCOUNT_KEY, id)
  } catch {
    /* ignore */
  }
}

/**
 * A new operation as a draft (written on the first change – leaving it untouched drops it): an expense now, on the
 * account used last on this computer.
 */
export function newOperation(over: Partial<Transaction> = {}): string {
  const fi = useData.getState().fi
  const accounts = fi?.settings.accounts.filter((a) => !a.archived) ?? []
  const account = accounts.find((a) => a.id === lastAccount())?.id ?? accounts[0]?.id ?? MBANK_ACCOUNT_ID
  const now = new Date().toISOString()
  const { date, time } = warsawNow()
  const record = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: now, updatedAt: now, date, time, accountId: account, amount: 0, ...over })
  addRecord('transactions', record, { draft: true })
  navigate({ page: 'operations' })
  // A new entry is always visible: its month, without filters that could hide it.
  const f = useOperationsUi.getState().filter
  if (f.period.kind === 'month' && f.period.month !== record.date.slice(0, 7)) setFilter({ period: { kind: 'month', month: record.date.slice(0, 7) } })
  if (f.accounts.length || f.kinds.length || f.categories.length || f.marks.length || f.query) setFilter({ accounts: [], kinds: [], categories: [], marks: [], query: '' })
  selectOperation(record.id)
  return record.id
}

export async function deleteOperation(t: Transaction, label: string): Promise<void> {
  if (useOperationsUi.getState().selectedId === t.id) useOperationsUi.setState({ selectedId: null })
  await deleteWithUndo('transactions', t.id, label, `Usunięto: ${label}.`)
}
