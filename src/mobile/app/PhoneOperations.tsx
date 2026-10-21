/**
 * Operacje on the phone (IP3, IP4): the computers' list as cards – the search, the month, the accounts, the categories
 * and the marks of the list's filter (`features/operations/state.ts`, stored on this phone like on a computer), the
 * sums; a tap opens the computers' editor over the whole screen, „+ Nowa” a new operation in it.
 */
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { addMonths, warsawNow } from '@shared/calc/dates'
import { isTwoSided } from '@shared/calc/operations'
import { memberName, incomeShares } from '@shared/calc/household'
import { MARK_LABEL, OPERATION_MARKS, amountTone, marksOf, matchesFilter, narrows, noNarrowing, sortOperations, sumOperations, type OperationMark, type OperationsFilter, type PeriodFilter } from '@shared/operationsView'
import { TX_KIND_LABEL, type Transaction } from '@shared/schema'
import { discardDraft, listOf, useData } from '@renderer/store/data'
import { useMinute } from '@renderer/store/fleet'
import { plnText, signedPln } from '@renderer/components/fields'
import { Empty, cx } from '@renderer/components/ui'
import { monthLabel } from '@renderer/lib/format'
import { useMarkFlags } from '@renderer/features/sensors/state'
import { useMembers } from '@renderer/features/household/actions'
import { OperationEditor } from '@renderer/features/operations/OperationEditor'
import { useAccounts, useCategories } from '@renderer/features/operations/pickers'
import { followCurrentMonth, newOperation, resetFilter, selectOperation, setFilter, showStoredFilter, useOperationsUi } from '@renderer/features/operations/state'

const CARD = 58
const TONE = { up: 'text-up', plain: 'text-fg-strong', muted: 'text-muted', accent: 'text-accent' } as const
/** The marks a phone's filter offers (the rest stays in the stored filter, shown as „inne filtry”). */
const MARKS: readonly OperationMark[] = OPERATION_MARKS

const toggle = <T,>(list: readonly T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

const periodLabel = (p: PeriodFilter): string => (p.kind === 'month' ? monthLabel(p.month) : p.kind === 'all' ? 'cała historia' : `${p.from ?? '…'} – ${p.to ?? '…'}`)

/** The filters set beyond the phone's own (amounts, members, brands, tags… – a computer's), the search apart. */
const otherFilters = (f: OperationsFilter): boolean => narrows({ ...f, accounts: [], categories: [], marks: [], query: '' })

export function PhoneOperations() {
  const selectedId = useOperationsUi((s) => s.selectedId)
  // Leaving the screen drops an untouched new entry (as on a computer).
  useEffect(
    () => () => {
      const id = useOperationsUi.getState().selectedId
      if (id && useData.getState().drafts[id]) discardDraft('transactions', id)
    },
    []
  )
  return selectedId ? <EditorSheet id={selectedId} /> : <OperationsList />
}

/** The computers' editor over the screen; „← Operacje” back to the list (an untouched new entry dropped). */
function EditorSheet({ id }: { id: string }) {
  const draft = useData((s) => !!s.drafts[id])
  const exists = useData((s) => !!s.records.transactions[id])
  // Deleted (here or on a computer): back to the list.
  useEffect(() => {
    if (!exists) selectOperation(null)
  }, [exists])
  return (
    <div className="flex min-h-full flex-col" data-testid="phone-operation">
      <div className="sticky top-0 z-10 flex h-[44px] items-center gap-2 border-b border-line bg-panel px-2">
        <button className="btn btn-ghost h-[36px] px-2 text-[13px]" onClick={() => selectOperation(null)} data-testid="phone-operation-back">
          ← Operacje
        </button>
        <span className="text-[12px] text-muted">{draft ? 'nowa operacja – zapis po pierwszej zmianie' : 'zapis po wyjściu z pola'}</span>
      </div>
      {exists && <OperationEditor key={id} id={id} />}
    </div>
  )
}

function OperationsList() {
  const records = useData((s) => s.records.transactions)
  const drafts = useData((s) => s.drafts)
  const fi = useData((s) => s.fi)
  const filter = useOperationsUi((s) => s.filter)
  const shown = useOperationsUi((s) => s.shown)
  const minute = useMinute()
  useEffect(() => followCurrentMonth(warsawNow(new Date(minute)).month), [minute])
  const cats = useCategories()
  const accounts = useAccounts()
  const flags = useMarkFlags()
  const deferred = useDeferredValue(filter)
  const all = useMemo(() => listOf(records), [records])
  const rows = useMemo(() => {
    if (!fi) return []
    const ctx = { categories: cats, accounts, orders: fi.settings.orders, aliases: fi.settings.import.aliases, flags }
    return sortOperations(
      all.filter((t) => drafts[t.id] || matchesFilter(t, deferred, ctx)),
      deferred.sort
    )
  }, [all, deferred, cats, accounts, fi, drafts, flags])
  const sums = useMemo(() => sumOperations(rows), [rows])
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => CARD, overscan: 12 })
  const [filters, setFilters] = useState(false)
  const month = filter.period.kind === 'month' ? filter.period.month : null
  const active = filter.accounts.length + filter.categories.length + filter.marks.length + (otherFilters(filter) ? 1 : 0)
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-operations">
      <div className="flex shrink-0 flex-col gap-2 border-b border-line bg-panel px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            type="search"
            className="input h-[36px] min-w-0 flex-1 text-[14px]"
            placeholder="Szukaj: nazwa, notatka, kwota, #tag"
            value={filter.query}
            onChange={(e) => setFilter({ query: e.target.value })}
            data-testid="operations-search"
          />
          <button className={cx('btn h-[36px] px-3 text-[13px]', active > 0 && 'border-accent/60 text-accent')} onClick={() => setFilters(true)} data-testid="phone-operations-filters">
            Filtry{active ? ` · ${active}` : ''}
          </button>
          <button className="btn btn-accent h-[36px] px-3 text-[13px]" onClick={() => newOperation()} data-testid="operation-new">
            + Nowa
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost h-[32px] w-[40px] text-[16px]" aria-label="Poprzedni miesiąc" onClick={() => setFilter({ period: { kind: 'month', month: addMonths(month ?? warsawNow().month, -1) } })} data-testid="operations-prev-month">
            ‹
          </button>
          <button className="btn h-[32px] min-w-0 flex-1 justify-center text-[13px]" onClick={() => setFilter({ period: month ? { kind: 'all' } : { kind: 'month', month: warsawNow().month } })} data-testid="operations-period" title="Cała historia albo bieżący miesiąc">
            {periodLabel(filter.period)}
          </button>
          <button className="btn btn-ghost h-[32px] w-[40px] text-[16px]" aria-label="Następny miesiąc" onClick={() => setFilter({ period: { kind: 'month', month: addMonths(month ?? warsawNow().month, 1) } })} data-testid="operations-next-month">
            ›
          </button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-muted" data-testid="operations-sums">
          <span>
            Operacje <span className="num text-fg-strong">{rows.length}</span>
          </span>
          <span>
            Wpływy <span className="num text-up">{signedPln(sums.inflow)} zł</span>
          </span>
          <span>
            Wydatki <span className="num text-fg-strong" data-testid="operations-outflow">{plnText(-sums.outflow)} zł</span>
          </span>
          {shown && (
            <button className="text-accent underline-offset-2 hover:underline" onClick={showStoredFilter} data-testid="operations-stored-filter">
              mój filtr
            </button>
          )}
        </div>
      </div>
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto" data-testid="operations-list">
        {rows.length === 0 ? (
          <Empty>{all.length ? 'Brak operacji dla wybranych filtrów.' : 'Brak operacji – dodaj szybkim wpisem albo „+ Nowa”.'}</Empty>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((v) => {
              const t = rows[v.index] as Transaction
              return <Card key={t.id} t={t} top={v.start} />
            })}
          </div>
        )}
      </div>
      {filters && <FiltersSheet onClose={() => setFilters(false)} />}
    </div>
  )
}

function Card({ t, top }: { t: Transaction; top: number }) {
  const cats = useCategories()
  const accounts = useAccounts()
  const members = useMembers()
  const orders = useData((s) => s.fi?.settings.orders)
  const draft = useData((s) => !!s.drafts[t.id])
  const flags = useMarkFlags()
  const marks = orders ? marksOf(t, orders, flags) : []
  const nameOf = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? '?'
  const account = isTwoSided(t) ? (t.amount < 0 ? `${nameOf(t.accountId)} → ${nameOf(t.counterAccountId)}` : `${nameOf(t.counterAccountId)} → ${nameOf(t.accountId)}`) : nameOf(t.accountId)
  const whose = t.kind === 'income' ? [...new Set(incomeShares(t).map((x) => x.memberId))].filter((x): x is string => !!x) : []
  const what = whose.length
    ? `od: ${whose.map((id) => memberName(id, members)).join(', ')}`
    : t.splits.length
      ? `${t.splits.length} części`
      : t.kind === 'expense'
        ? cats.label(t.categoryId) || 'bez kategorii'
        : TX_KIND_LABEL[t.kind]
  const name = t.counterparty || t.title || t.note.split('\n')[0] || TX_KIND_LABEL[t.kind]
  const tone = amountTone(t)
  // „bez kategorii” is said by the category itself (in the accent).
  const uncategorized = marks.includes('uncategorized')
  const shownMarks = marks.filter((m) => m === 'impulse' || m === 'anomaly' || m === 'awaiting' || m === 'pending' || m === 'owed')
  return (
    <button
      type="button"
      onClick={() => selectOperation(t.id)}
      className="absolute left-0 flex w-full items-center gap-3 border-b border-line/70 px-3 text-left active:bg-hover"
      style={{ top, height: CARD }}
      data-testid="operation-row"
      data-key={t.id}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cx('truncate text-[14px]', draft ? 'text-accent' : 'text-fg-strong')}>{draft ? 'nowa operacja' : name}</span>
        <span className="truncate text-[11.5px] text-muted">
          <span className={cx(uncategorized && 'text-accent')}>{what}</span> · {account}
          {shownMarks.map((m) => (
            <span key={m} className="text-accent">
              {' '}
              · {MARK_LABEL[m]}
            </span>
          ))}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span className={cx('num text-[14px]', TONE[tone])}>{signedPln(t.amount)} zł</span>
        <span className="num text-[11px] text-dim">
          {t.date.slice(8, 10)}.{t.date.slice(5, 7)}
          {t.time ? ` ${t.time}` : ''}
        </span>
      </span>
    </button>
  )
}

/** The phone's filters: accounts, categories (main ones), marks; „Wyczyść” clears the stored filter too. */
function FiltersSheet({ onClose }: { onClose: () => void }) {
  const filter = useOperationsUi((s) => s.filter)
  const cats = useCategories()
  const accounts = useAccounts().filter((a) => !a.archived || filter.accounts.includes(a.id))
  const mains = cats.mains.filter((c) => !c.archived || filter.categories.includes(c.id))
  const others = otherFilters(filter)
  const Check = ({ on, label, onClick, testId }: { on: boolean; label: string; onClick: () => void; testId: string }) => (
    <label className="flex min-h-[40px] items-center gap-3 border-b border-line/50 text-[14px] text-fg">
      <input type="checkbox" className="h-[18px] w-[18px]" checked={on} onChange={onClick} data-testid={testId} />
      {label}
    </label>
  )
  return (
    <div className="phone-sheet fixed inset-0 z-40 flex flex-col bg-bg" data-testid="phone-filters">
      <div className="flex h-[48px] shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
        <span className="flex-1 text-[15px] font-medium text-fg-strong">Filtry operacji</span>
        <button
          className="btn h-[36px] px-3 text-[13px]"
          onClick={() => {
            resetFilter()
            onClose()
          }}
          data-testid="phone-filters-clear"
        >
          Wyczyść
        </button>
        <button className="btn btn-accent h-[36px] px-4 text-[13px]" onClick={onClose} data-testid="phone-filters-done">
          Gotowe
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        <h2 className="label mt-3 mb-1">Konto</h2>
        {accounts.map((a) => (
          <Check key={a.id} on={filter.accounts.includes(a.id)} label={a.name} onClick={() => setFilter({ accounts: toggle(filter.accounts, a.id) })} testId={`phone-filter-account-${a.name}`} />
        ))}
        <h2 className="label mt-4 mb-1">Kategoria</h2>
        <Check on={filter.categories.includes('')} label="bez kategorii" onClick={() => setFilter({ categories: toggle(filter.categories, '') })} testId="phone-filter-category-none" />
        {mains.map((c) => (
          <Check key={c.id} on={filter.categories.includes(c.id)} label={c.name} onClick={() => setFilter({ categories: toggle(filter.categories, c.id) })} testId={`phone-filter-category-${c.name}`} />
        ))}
        <h2 className="label mt-4 mb-1">Oznaczenia</h2>
        {MARKS.map((m) => (
          <Check key={m} on={filter.marks.includes(m)} label={MARK_LABEL[m]} onClick={() => setFilter({ marks: toggle(filter.marks, m) })} testId={`phone-filter-mark-${m}`} />
        ))}
        {others && (
          <div className="mt-4 flex items-center gap-2 text-[12px] text-muted">
            <span className="flex-1">Filtry ustawione na komputerze (kwota, domownik, marka, tagi…) też działają.</span>
            <button className="btn h-[32px] px-2 text-[12px]" onClick={() => setFilter({ ...noNarrowing(), accounts: filter.accounts, categories: filter.categories, marks: filter.marks, query: filter.query, amountMin: null, amountMax: null })} data-testid="phone-filters-others">
              Zdejmij
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
