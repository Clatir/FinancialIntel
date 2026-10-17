import { create } from 'zustand'
import { warsawNow } from '@shared/calc/dates'
import { newId } from '@shared/ids'
import { emptyFilter, OPERATION_MARKS, type OperationsFilter } from '@shared/operationsView'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, TX_KINDS, transactionSchema, type Transaction } from '@shared/schema'
import { addRecord, discardDraft, replaceRecords, updateSettings, useData } from '../../store/data'
import { plural } from '../../lib/format'
import { commitActiveField, navigate, toast } from '../../store/ui'
import { deleteWithUndo } from '../history/actions'
import { rememberBrands, saveKeywordRule } from '../import/rules'

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
  /** Operations ticked for a bulk change (D76); another filter clears them – nothing hidden is changed. */
  ticked: Record<string, true>
}

export const useOperationsUi = create<OperationsUi>(() => ({
  filter: { ...emptyFilter(warsawNow().month), ...readStored() },
  selectedId: null,
  ticked: {}
}))

export function setFilter(patch: Partial<OperationsFilter>): void {
  useOperationsUi.setState((s) => {
    const filter = { ...s.filter, ...patch }
    store(filter)
    return { filter, ticked: {} }
  })
}

export function resetFilter(): void {
  const filter = emptyFilter(warsawNow().month)
  store(filter)
  useOperationsUi.setState({ filter, ticked: {} })
}

export function tickOperations(ids: readonly string[], on: boolean): void {
  useOperationsUi.setState((s) => {
    const ticked = { ...s.ticked }
    for (const id of ids) if (on) ticked[id] = true
    else delete ticked[id]
    return { ticked }
  })
}

export const clearTicked = () => useOperationsUi.setState({ ticked: {} })

/**
 * One category for the ticked expenses the list shows (D76; operations split into parts and other kinds stay –
 * counted), with „Cofnij” – of the operations and of the import rules written with them. `remember`: 'brands' = a rule
 * of each brand for the import, 'keyword' = the search as a keyword rule.
 */
export function categorizeTicked(visibleIds: readonly string[], categoryId: string, remember: 'none' | 'brands' | 'keyword', label: string): void {
  const { ticked, filter } = useOperationsUi.getState()
  const data = useData.getState()
  const ops = visibleIds
    .filter((id) => ticked[id] && !data.drafts[id])
    .map((id) => data.records.transactions[id]?.record)
    .filter((t): t is Transaction => !!t)
  const fit = ops.filter((t) => t.kind === 'expense' && !t.splits.length)
  const before = fit.filter((t) => t.categoryId !== categoryId)
  const rulesBefore = data.fi?.settings.import.rules ?? null
  replaceRecords(
    'transactions',
    before.map((t) => ({ ...t, categoryId }))
  )
  let note = ''
  if (remember === 'brands') note = ` · reguły importu: ${rememberBrands(fit, categoryId)}`
  if (remember === 'keyword') {
    // Purchases and their returns alike: the keyword holds for both directions when both are ticked.
    const direction = fit.some((t) => t.amount > 0) ? null : 'out'
    const err = saveKeywordRule({ keyword: filter.query, direction, kind: 'expense', categoryId })
    note = err ? ` · słowo kluczowe: ${err}` : ` · słowo kluczowe „${filter.query.trim()}”`
  }
  const skipped = ops.length - fit.length
  clearTicked()
  const undo = () => {
    replaceRecords('transactions', before)
    if (remember !== 'none' && rulesBefore) updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: rulesBefore } } }))
  }
  toast(
    `${label}: ${before.length} ${plural(before.length, 'operacja', 'operacje', 'operacji')}${skipped ? `, pominięte (nie wydatek albo podział): ${skipped}` : ''}${note}.`,
    'success',
    7000,
    before.length || remember !== 'none' ? { label: 'Cofnij', run: undo } : undefined
  )
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

/** Operacje with the purchases „do zwrotu” of the whole history (the bridge, the radar). */
export function openRefundables(): void {
  setFilter({ period: { kind: 'all' }, marks: ['refundable'], accounts: [], kinds: [], categories: [], query: '' })
  navigate({ page: 'operations' })
}
