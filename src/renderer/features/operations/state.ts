import { create } from 'zustand'
import { inClockWindow, warsawNow } from '@shared/calc/dates'
import { newId } from '@shared/ids'
import { emptyFilter, inPeriod, OPERATION_MARKS, type OperationsFilter } from '@shared/operationsView'
import { shareOf, withShare } from '@shared/calc/share'
import { deepEqual } from '@shared/merge'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, TX_KINDS, transactionSchema, type ImportRule, type Share, type Transaction } from '@shared/schema'
import { addRecord, canWrite, deleteRecords, discardDraft, replaceRecords, updateSettings, useData } from '../../store/data'
import { plural } from '../../lib/format'
import { commitActiveField, navigate, toast } from '../../store/ui'
import { deleteWithUndo, restoreDeleted } from '../history/actions'
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
  /**
   * A view asked from elsewhere (B88: a notification, the bridge, the inbox, a jump to an operation, a new entry) that
   * hides the filter stored on this computer: changes made in it stay the view's – the stored filter is one click away
   * (`showStoredFilter`), and changes after it are stored again.
   */
  shown: boolean
}

/** The month the list's default period was last set to (B81): the app lives in the tray for weeks. */
let currentMonth = warsawNow().month

export const useOperationsUi = create<OperationsUi>(() => ({
  filter: { ...emptyFilter(currentMonth), ...readStored() },
  selectedId: null,
  ticked: {},
  shown: false
}))

/** The parts of the filter remembered on this computer (the period and the search start fresh). */
const STORED_KEYS: ReadonlyArray<keyof OperationsFilter> = ['accounts', 'kinds', 'categories', 'marks']

export function setFilter(patch: Partial<OperationsFilter>): void {
  useOperationsUi.setState((s) => {
    const filter = { ...s.filter, ...patch }
    // In a view asked from elsewhere the change is the view's (B88): the stored filter stays as it was.
    if (!s.shown) store(filter)
    return { filter, ticked: {} }
  })
}

const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)

/**
 * A view of the list asked from elsewhere (B88): set now, never stored over the user's own filter. Only a view that
 * hides a part of the stored filter is one (`shown`) – a period moved or a search cleared is not.
 */
export function showFilter(patch: Partial<OperationsFilter>): void {
  useOperationsUi.setState((s) => ({
    filter: { ...s.filter, ...patch },
    ticked: {},
    shown: s.shown || STORED_KEYS.some((k) => k in patch && !sameValue(patch[k], s.filter[k]))
  }))
}

/** The filter stored on this computer again (after a view asked from elsewhere): changes are stored from now on. */
export function showStoredFilter(): void {
  useOperationsUi.setState((s) => ({ filter: { ...s.filter, accounts: [], kinds: [], categories: [], marks: [], ...readStored() }, ticked: {}, shown: false }))
}

/** „Wyczyść filtry”: the stored filter too – but in a view asked from elsewhere only the view (B88). */
export function resetFilter(): void {
  const filter = emptyFilter(warsawNow().month)
  const { shown } = useOperationsUi.getState()
  if (!shown) store(filter)
  useOperationsUi.setState({ filter, ticked: {} })
}

/**
 * A new month in Warsaw (B81): the list showing the month that was the current one moves on to the new one; a month
 * the user chose stays. Called by the page every minute.
 */
export function followCurrentMonth(now: string = warsawNow().month): void {
  if (now === currentMonth) return
  const was = currentMonth
  currentMonth = now
  const p = useOperationsUi.getState().filter.period
  if (p.kind === 'month' && p.month === was) useOperationsUi.setState((s) => ({ filter: { ...s.filter, period: { kind: 'month', month: now } }, ticked: {} }))
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
  // A read-only folder: one message, never a success with „Cofnij” for nothing (N2).
  if (!canWrite()) return
  const { ticked, filter } = useOperationsUi.getState()
  const data = useData.getState()
  const ops = visibleIds
    .filter((id) => ticked[id] && !data.drafts[id])
    .map((id) => data.records.transactions[id]?.record)
    .filter((t): t is Transaction => !!t)
  // Written by a newer version of the app (B67): this one changes none of them – counted apart, never as changed.
  const newer = ops.filter((t) => data.records.transactions[t.id]?.readOnly).length
  // One category: an expense without lines, or a shared purchase (D83 – its lines take the category with it).
  const fit = ops.filter((t) => t.kind === 'expense' && (!t.splits.length || shareOf(t)) && !data.records.transactions[t.id]?.readOnly)
  const before = fit.filter((t) => t.categoryId !== categoryId)
  const rulesBefore = data.fi?.settings.import.rules ?? null
  replaceRecords(
    'transactions',
    before.map((t) => {
      const share = shareOf(t)
      return share ? withShare({ ...t, categoryId }, share) : { ...t, categoryId }
    })
  )
  let note = ''
  if (remember === 'brands') note = ` · reguły importu: ${rememberBrands(fit, categoryId)}`
  if (remember === 'keyword') {
    // Purchases and their returns alike: the keyword holds for both directions when both are ticked.
    const direction = fit.some((t) => t.amount > 0) ? null : 'out'
    const err = saveKeywordRule({ keyword: filter.query, direction, kind: 'expense', categoryId })
    note = err ? ` · słowo kluczowe: ${err}` : ` · słowo kluczowe „${filter.query.trim()}”`
  }
  const skipped = ops.length - fit.length - newer
  const rulesAfter = useData.getState().fi?.settings.import.rules ?? null
  clearTicked()
  // „Cofnij” takes back what the action set and nothing else (B66): a category still the one set (a change made since –
  // here or on the other computer – stays), the rules the action wrote.
  const undo = () => {
    const now = useData.getState().records.transactions
    const back = before.flatMap((t) => {
      const cur = now[t.id]?.record
      if (!cur || cur.categoryId !== categoryId) return []
      const share = shareOf(cur)
      return [share ? withShare({ ...cur, categoryId: t.categoryId }, share) : { ...cur, categoryId: t.categoryId }]
    })
    replaceRecords('transactions', back)
    if (remember !== 'none' && rulesBefore && rulesAfter) undoRules(rulesBefore, rulesAfter)
    undoneNote(back.length, before.length)
  }
  toast(
    `${label}: ${before.length} ${plural(before.length, 'operacja', 'operacje', 'operacji')}${skipped ? `, pominięte (nie wydatek albo podział): ${skipped}` : ''}${newerNote(newer)}${note}.`,
    'success',
    7000,
    before.length || remember !== 'none' ? { label: 'Cofnij', run: undo } : undefined
  )
}

/** Who finances the ticked (D80 g, D83): me (`memberId` null), a household member or their gift, or several people. */
export type FinanceChoice = { memberId: string | null; gift?: boolean } | { share: Share }

/** What of an operation the financing is: compared before a bulk change (an unchanged one is not written). */
const financing = (t: Transaction) => JSON.stringify([t.refundable, t.refundable ? t.memberId : null, !!t.gift, t.share ?? null, t.splits.map((s) => [s.amount, s.refundable, s.memberId, !!s.gift])])

/**
 * Who finances an operation, without its amounts (B66): a shared purchase is its description – its lines follow the
 * amount, so an amount changed after a bulk change leaves the financing the one set.
 */
const financers = (t: Transaction): unknown => [t.refundable, t.refundable ? t.memberId : null, !!t.gift, t.share ?? null, t.share ? null : t.splits.map((s) => [s.refundable, s.memberId, !!s.gift])]

/** Ticked operations a newer version of the app wrote (B67): left as they are, said in the toast. */
const newerNote = (n: number): string => (n ? `, bez zmian (zapisane przez nowszą wersję aplikacji): ${n}` : '')

/** „Cofnij” of a bulk change that left out operations changed since (B66): said, never a silent half. */
function undoneNote(done: number, of: number): void {
  if (done < of) toast(`Cofnięto ${done} z ${of} – ${of - done === 1 ? 'jedna zmieniła' : 'pozostałe zmieniły'} się w międzyczasie i ${of - done === 1 ? 'zostaje' : 'zostają'} bez zmian.`, 'info', 6000)
}

/**
 * Who finances the ticked expenses (D80 g, D83): a household member (not my cost, not the energy's), their gift, several
 * people (each operation's amount split so) or me again. A split receipt keeps its lines (each says it) – skipped, as
 * other kinds of operations; a shared purchase takes the new financing.
 */
export function financeTicked(visibleIds: readonly string[], choice: FinanceChoice, label: string): void {
  if (!canWrite()) return
  const { ticked } = useOperationsUi.getState()
  const data = useData.getState()
  const ops = visibleIds
    .filter((id) => ticked[id] && !data.drafts[id])
    .map((id) => data.records.transactions[id]?.record)
    .filter((t): t is Transaction => !!t)
  const newer = ops.filter((t) => data.records.transactions[t.id]?.readOnly).length
  const fit = ops.filter((t) => t.kind === 'expense' && (!t.splits.length || shareOf(t)) && !data.records.transactions[t.id]?.readOnly)
  const next = (t: Transaction): Transaction => {
    if ('share' in choice) return withShare(t, choice.share)
    const plain = shareOf(t) ? withShare(t, null) : t
    return { ...plain, refundable: !!choice.memberId, memberId: choice.memberId, gift: choice.memberId && choice.gift ? true : undefined }
  }
  const pairs = fit.map((t) => [t, next(t)] as const).filter(([a, b]) => financing(a) !== financing(b))
  const before = pairs.map(([a]) => a)
  replaceRecords(
    'transactions',
    pairs.map(([, b]) => b)
  )
  const skipped = ops.length - fit.length - newer
  clearTicked()
  // Only the financing, and only while it is still the one set (B66): an amount or a note changed since stays.
  const undo = () => {
    const now = useData.getState().records.transactions
    const back = pairs.flatMap(([b, a]) => {
      const cur = now[b.id]?.record
      if (!cur || !deepEqual(financers(cur), financers(a))) return []
      const base = { ...cur, refundable: b.refundable, memberId: b.memberId, gift: b.gift }
      const share = shareOf(b)
      // A shared purchase's lines made again for the amount it has now.
      return [share ? withShare(base, share) : { ...base, share: null, splits: [] }]
    })
    replaceRecords('transactions', back)
    undoneNote(back.length, pairs.length)
  }
  toast(
    `${label}: ${before.length} ${plural(before.length, 'operacja', 'operacje', 'operacji')}${skipped ? `, pominięte (nie wydatek albo podział paragonu): ${skipped}` : ''}${newerNote(newer)}.`,
    'success',
    7000,
    before.length ? { label: 'Cofnij', run: undo } : undefined
  )
}

/**
 * The rules an action wrote taken back (B66): each rule it added or changed – while it is still that one (by content:
 * the settings read again after a save are other objects) – goes or is the one before again; the rules written
 * meanwhile stay.
 */
function undoRules(before: readonly ImportRule[], after: readonly ImportRule[]): void {
  const was = new Map(before.map((r) => [r.id, r]))
  const set = new Map(after.filter((r) => !deepEqual(was.get(r.id), r)).map((r) => [r.id, r]))
  if (!set.size) return
  updateSettings((f) => {
    const rules = f.settings.import.rules.flatMap((r) => {
      const wrote = set.get(r.id)
      if (!wrote || !deepEqual(wrote, r)) return [r]
      const old = was.get(r.id)
      return old ? [old] : []
    })
    return { ...f, settings: { ...f.settings, import: { ...f.settings.import, rules } } }
  })
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
  const { date, time: clock } = warsawNow()
  // Written in the quiet hours, it is most likely a purchase of the day written down at night (N10): no time – a night
  // time is typed (and confirmed in the log) only for a purchase made then.
  const quiet = fi?.settings.orders.quietHours
  const time = quiet && inClockWindow(clock, quiet.from, quiet.to) ? null : clock
  const record = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: now, updatedAt: now, date, time, accountId: account, amount: 0, ...over })
  addRecord('transactions', record, { draft: true })
  navigate({ page: 'operations' })
  // A new entry is always visible: its month when the period does not hold its day (B77 – a range too), without filters
  // that could hide it – a view, the stored filters stay (B88).
  const f = useOperationsUi.getState().filter
  if (!inPeriod(record.date, f.period)) showFilter({ period: { kind: 'month', month: record.date.slice(0, 7) } })
  if (f.accounts.length || f.kinds.length || f.categories.length || f.marks.length || f.query) showFilter({ accounts: [], kinds: [], categories: [], marks: [], query: '' })
  selectOperation(record.id)
  return record.id
}

export async function deleteOperation(t: Transaction, label: string): Promise<void> {
  if (useOperationsUi.getState().selectedId === t.id) useOperationsUi.setState({ selectedId: null })
  // Its dockings go with it (B15): the ICTTJ payout docked on it docks again – with another operation, or Portfel XTB;
  // „Cofnij” brings them back too.
  const dockings = Object.values(useData.getState().records.dockings ?? {})
    .map((e) => e.record)
    .filter((d) => d.transactionId === t.id)
    .map((d) => d.id)
  const ok = await deleteWithUndo('transactions', t.id, label, `Usunięto: ${label}.`, undefined, dockings.length ? () => restoreDeleted('dockings', dockings) : undefined)
  if (ok && dockings.length) await deleteRecords('dockings', dockings)
}

/** One operation open in Operacje: its month, no filters hiding it (the bank's balances – F5, the rules – F22). */
export function openOperation(t: Pick<Transaction, 'id' | 'date'>): void {
  showFilter({ period: { kind: 'month', month: t.date.slice(0, 7) }, accounts: [], kinds: [], categories: [], marks: [], query: '' })
  navigate({ page: 'operations' })
  selectOperation(t.id)
}

/** Operacje with the purchases household members finance, of the whole history (the bridge, the radar – D80). */
export function openRefundables(): void {
  showFilter({ period: { kind: 'all' }, marks: ['refundable'], accounts: [], kinds: [], categories: [], query: '' })
  navigate({ page: 'operations' })
}
