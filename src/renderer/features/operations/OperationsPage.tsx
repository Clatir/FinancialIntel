import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { addMonths, warsawNow, weekdayOf } from '@shared/calc/dates'
import { MARK_LABEL, OPERATION_MARKS, amountTone, compareOperations, marksOf, matchesFilter, needsLog, sumOperations, type OperationMark, type PeriodFilter } from '@shared/operationsView'
import { useDuplicates } from '../import/DuplicatesPanel'
import { keywordOfSearch } from '../import/rules'
import { TX_KIND_LABEL, TX_KINDS, type Transaction, type TxKind } from '@shared/schema'
import { discardDraft, useData } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { navigate, useUi } from '../../store/ui'
import { showPanel } from '../../store/layout'
import { usePanels } from '../../store/panels'
import { plnText, signedPln } from '../../components/fields'
import { IconBack, IconNext, IconPlus, IconSearch, IconSidebarRight } from '../../components/icons'
import { PaneEdge, usePaneWidth } from '../../components/layout'
import { Popover } from '../../components/Popover'
import { Badge, Kbd, cx } from '../../components/ui'
import { WEEKDAY_PL, plural } from '../../lib/format'
import { OperationEditor } from './OperationEditor'
import { CategorySelect, useAccounts, useCategories } from './pickers'
import { categorizeTicked, clearTicked, financeTicked, newOperation, resetFilter, selectOperation, setFilter, tickOperations, useOperationsUi } from './state'
import { useMembers } from '../household/actions'

/** The details pane can be hidden like a panel: the list takes its width. */
const DETAILS_KEY = 'operations:Szczegóły'
const ROW = 28
const TEMPLATE = '16px 78px 44px minmax(120px, 1.6fr) minmax(90px, 1fr) minmax(0, auto) 110px'

const MONTHS_PL = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień']
const monthLabel = (m: string) => `${MONTHS_PL[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`

const TONE_CLASS = { up: 'text-up', plain: 'text-fg-strong', muted: 'text-muted', accent: 'text-accent' } as const

function PeriodBar({ period }: { period: PeriodFilter }) {
  const month = period.kind === 'month' ? period.month : warsawNow().month
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button className="btn btn-ghost h-[24px] px-1" title="Poprzedni miesiąc" onClick={() => setFilter({ period: { kind: 'month', month: addMonths(month, -1) } })} data-testid="operations-prev-month">
        <IconBack size={13} />
      </button>
      <Popover
        buttonClassName="btn h-[24px] min-w-[150px] justify-center"
        label={<span data-testid="operations-period">{period.kind === 'month' ? monthLabel(period.month) : period.kind === 'all' ? 'cała historia' : `${period.from ?? '…'} – ${period.to ?? '…'}`}</span>}
        width={250}
        testId="operations-period-menu"
      >
        {(close) => (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className="btn h-[24px] justify-start"
              onClick={() => {
                setFilter({ period: { kind: 'month', month: warsawNow().month } })
                close()
              }}
            >
              Bieżący miesiąc
            </button>
            <button
              type="button"
              className="btn h-[24px] justify-start"
              onClick={() => {
                setFilter({ period: { kind: 'all' } })
                close()
              }}
              data-testid="operations-period-all"
            >
              Cała historia
            </button>
            <label className="mt-1 flex items-center gap-2 text-muted">
              od
              <input
                type="date"
                className="input"
                value={period.kind === 'range' ? (period.from ?? '') : ''}
                onChange={(e) => setFilter({ period: { kind: 'range', from: e.currentTarget.value || null, to: period.kind === 'range' ? period.to : null } })}
              />
            </label>
            <label className="flex items-center gap-2 text-muted">
              do
              <input
                type="date"
                className="input"
                value={period.kind === 'range' ? (period.to ?? '') : ''}
                onChange={(e) => setFilter({ period: { kind: 'range', from: period.kind === 'range' ? period.from : null, to: e.currentTarget.value || null } })}
              />
            </label>
          </div>
        )}
      </Popover>
      <button className="btn btn-ghost h-[24px] px-1" title="Następny miesiąc" onClick={() => setFilter({ period: { kind: 'month', month: addMonths(month, 1) } })} data-testid="operations-next-month">
        <IconNext size={13} />
      </button>
    </div>
  )
}

function CheckMenu<T extends string>({ label, options, value, onChange, testId }: { label: string; options: Array<{ value: T; label: string }>; value: T[]; onChange: (v: T[]) => void; testId: string }) {
  const summary = value.length === 0 ? 'wszystkie' : value.length <= 2 ? value.map((v) => options.find((o) => o.value === v)?.label ?? v).join(', ') : `${value.length} z ${options.length}`
  return (
    <Popover
      buttonClassName="chip"
      pressed={value.length > 0}
      width={240}
      testId={testId}
      panelTestId={`${testId}-menu`}
      label={
        <>
          {label}: <span className="ml-1">{summary}</span>
          <span className="ml-1 text-[9px] opacity-60" aria-hidden>
            ▾
          </span>
        </>
      }
    >
      {() => (
        <div className="flex max-h-[320px] flex-col gap-1 overflow-y-auto">
          {options.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={value.includes(o.value)}
                onChange={() => onChange(value.includes(o.value) ? value.filter((x) => x !== o.value) : [...value, o.value])}
                data-testid={`${testId}-${o.value || 'none'}`}
              />
              {o.label}
            </label>
          ))}
          <button type="button" className="mt-1 self-start text-dim hover:text-fg-strong" onClick={() => onChange([])}>
            wszystkie
          </button>
        </div>
      )}
    </Popover>
  )
}

function Row({ t, selected, index, top }: { t: Transaction; selected: boolean; index: number; top: number }) {
  const cats = useCategories()
  const accounts = useAccounts()
  const orders = useData((s) => s.fi?.settings.orders)
  const draft = useData((s) => !!s.drafts[t.id])
  const marks = orders ? marksOf(t, orders) : []
  const tone = amountTone(t)
  const category = t.splits.length ? `${t.splits.length} części` : t.kind === 'expense' ? cats.label(t.categoryId) : TX_KIND_LABEL[t.kind]
  const account = accounts.find((a) => a.id === t.accountId)?.name ?? '?'
  const shownMarks = marks.filter((m): m is Exclude<OperationMark, 'bank' | 'manual' | 'uncategorized' | 'split'> => !['bank', 'manual', 'uncategorized', 'split'].includes(m))
  const ticked = useOperationsUi((s) => !!s.ticked[t.id])
  return (
    <div
      data-testid="operation-row"
      data-key={t.id}
      onClick={() => selectOperation(t.id)}
      className={cx(
        'absolute left-0 grid w-full items-center gap-x-2 border-b border-line/70 px-2 text-[12px]',
        selected ? 'bg-accent-soft' : index % 2 ? 'bg-white/[0.012] hover:bg-hover' : 'hover:bg-hover'
      )}
      style={{ top, height: ROW, gridTemplateColumns: TEMPLATE }}
    >
      <input
        type="checkbox"
        checked={ticked}
        disabled={draft}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => tickOperations([t.id], e.currentTarget.checked)}
        aria-label="Zaznacz operację"
        data-testid="operation-tick"
      />
      <span className="num truncate text-fg">
        {t.date.slice(8, 10)}.{t.date.slice(5, 7)} <span className="text-dim">{WEEKDAY_PL[weekdayOf(t.date)]}</span>
      </span>
      <span className="num text-muted">{t.time ?? ''}</span>
      <span className="min-w-0 truncate">
        <span className={cx(draft ? 'text-accent' : 'text-fg-strong')}>{draft ? 'nowa operacja' : t.counterparty || t.title || TX_KIND_LABEL[t.kind]}</span>
        <span className="ml-2 text-[11px] text-dim">{account}</span>
      </span>
      <span className={cx('min-w-0 truncate', t.kind === 'expense' && !t.categoryId && !t.splits.length ? 'text-dim' : 'text-muted')}>
        {t.kind === 'expense' && !t.categoryId && !t.splits.length ? (t.refundable ? 'domownik' : 'bez kategorii') : category}
      </span>
      <span className="flex min-w-0 items-center justify-end gap-1 overflow-hidden">
        {shownMarks.map((m) => (
          <Badge key={m} tone={m === 'impulse' || m === 'night' || m === 'pending' ? 'warn' : 'default'}>
            {MARK_LABEL[m]}
          </Badge>
        ))}
        {orders && needsLog(t, orders) && (
          <Badge tone="warn" title="Od progu dziennika kapitańskiego: plan czy impuls?">
            ?
          </Badge>
        )}
      </span>
      <span className={cx('num text-right font-medium', TONE_CLASS[tone])} data-testid="operation-amount-cell">
        {signedPln(t.amount)}
      </span>
    </div>
  )
}

/** Duplicates waiting (D77): to the import screen, where they are merged. */
function DuplicatesLink() {
  const n = useDuplicates().groups.length
  if (!n) return null
  return (
    <button type="button" className="text-accent hover:underline" onClick={() => navigate({ page: 'import' })} title="Ta sama operacja dwa razy – scal na ekranie Import" data-testid="operations-duplicates">
      Możliwe duplikaty: {n}
    </button>
  )
}

/** Tick every operation the filters and the search show (or none). */
function TickAll({ rows }: { rows: readonly Transaction[] }) {
  const drafts = useData((s) => s.drafts)
  // A new entry being written is no operation yet.
  const ids = useMemo(() => rows.filter((t) => !drafts[t.id]).map((t) => t.id), [rows, drafts])
  const all = useOperationsUi((s) => ids.length > 0 && ids.every((id) => s.ticked[id]))
  return (
    <input
      type="checkbox"
      checked={all}
      disabled={!ids.length}
      onChange={(e) => tickOperations(ids, e.currentTarget.checked)}
      title="Zaznacz wszystkie widoczne (wynik wyszukiwania i filtrów)"
      aria-label="Zaznacz wszystkie widoczne"
      data-testid="operations-tick-all"
    />
  )
}

/** One category for the ticked operations (D76), remembered for the import if the user wants. */
function BulkBar({ visible }: { visible: readonly Transaction[] }) {
  const ticked = useOperationsUi((s) => s.ticked)
  const query = useOperationsUi((s) => s.filter.query)
  const cats = useCategories()
  const members = useMembers()
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [remember, setRemember] = useState<'none' | 'brands' | 'keyword'>('none')
  const [financer, setFinancer] = useState<string>('')
  // Only what the list shows: an operation that left it (edited, deleted, changed elsewhere) is not changed.
  const shown = visible.filter((t) => ticked[t.id])
  const n = shown.length
  if (!n) return null
  const sum = shown.reduce((s, t) => s + t.amount, 0)
  const keyword = keywordOfSearch(query)
  const mode = remember === 'keyword' && !keyword ? 'none' : remember
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-accent/50 bg-raised px-3 py-1.5 text-[12px]" data-testid="operations-bulk">
      <span className="text-fg-strong" data-testid="operations-bulk-count">
        Zaznaczone: {n} {plural(n, 'operacja', 'operacje', 'operacji')} · <span className="num">{signedPln(sum)} zł</span>
      </span>
      <span className="text-muted">kategoria</span>
      <CategorySelect className="h-[24px] min-w-[190px] py-0" value={categoryId} onChange={setCategoryId} emptyLabel="— wybierz kategorię —" data-testid="operations-bulk-category" />
      <select className="input h-[24px] w-[250px] py-0" value={mode} onChange={(e) => setRemember(e.currentTarget.value as typeof remember)} aria-label="Zapamiętaj dla importu" data-testid="operations-bulk-remember">
        <option value="none">bez zapamiętania</option>
        <option value="brands">zapamiętaj dla ich marek (import)</option>
        {keyword && <option value="keyword">zapamiętaj „{keyword}” jako słowo kluczowe</option>}
      </select>
      <button
        type="button"
        className="btn btn-accent h-[24px]"
        disabled={!categoryId}
        onClick={() => categoryId && categorizeTicked(shown.map((t) => t.id), categoryId, mode, cats.label(categoryId))}
        data-testid="operations-bulk-apply"
      >
        Ustaw
      </button>
      {/* Who finances them (D80 g): a household member or me again. */}
      <select className="input h-[24px] w-[170px] py-0" value={financer} onChange={(e) => setFinancer(e.currentTarget.value)} aria-label="Kto finansuje zaznaczone" data-testid="operations-bulk-financer">
        <option value="">— finansuje… —</option>
        <option value="-">ja (mój wydatek)</option>
        {members
          .filter((m) => !m.archived)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
      </select>
      <button
        type="button"
        className="btn h-[24px]"
        disabled={!financer}
        onClick={() => {
          const id = financer === '-' ? null : financer
          financeTicked(
            shown.map((t) => t.id),
            id,
            id ? `Finansuje ${members.find((m) => m.id === id)?.name ?? 'domownik'}` : 'Mój wydatek'
          )
          setFinancer('')
        }}
        data-testid="operations-bulk-finance"
      >
        Ustaw finansującego
      </button>
      <button type="button" className="btn btn-ghost h-[24px]" onClick={clearTicked} data-testid="operations-bulk-clear">
        Odznacz
      </button>
    </div>
  )
}

export function OperationsPage() {
  const records = useData((s) => s.records.transactions)
  const drafts = useData((s) => s.drafts)
  const fi = useData((s) => s.fi)
  const filter = useOperationsUi((s) => s.filter)
  const selectedId = useOperationsUi((s) => s.selectedId)
  const cats = useCategories()
  const accounts = useAccounts()
  const fleet = useFleet()
  const detailsHidden = usePanels((s) => !!s[DETAILS_KEY]?.hidden)
  const details = usePaneWidth('szczegoly', 400, 320, 640)
  const scrollRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const deferred = useDeferredValue(filter)

  const all = useMemo(() => Object.values(records).map((e) => e.record), [records])
  const rows = useMemo(() => {
    if (!fi) return []
    const ctx = { categories: cats, accounts, orders: fi.settings.orders }
    // A new entry being written always shows, whatever the filters.
    return all.filter((t) => drafts[t.id] || matchesFilter(t, deferred, ctx)).sort(compareOperations)
  }, [all, deferred, cats, accounts, fi, drafts])
  const sums = useMemo(() => sumOperations(rows), [rows])
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => ROW, overscan: 20 })
  const selectedIndex = rows.findIndex((t) => t.id === selectedId)

  // Leaving the page drops an untouched new entry.
  useEffect(
    () => () => {
      const id = useOperationsUi.getState().selectedId
      if (id && useData.getState().drafts[id]) discardDraft('transactions', id)
    },
    []
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useUi.getState().paletteOpen || document.querySelector('[role="dialog"]')) return
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        newOperation()
        return
      }
      const el = document.activeElement as HTMLElement | null
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      if ((typing && el !== searchRef.current) || e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const next = Math.min(rows.length - 1, Math.max(0, (selectedIndex < 0 ? -1 : selectedIndex) + (e.key === 'ArrowDown' ? 1 : -1)))
        const t = rows[next]
        if (t) {
          selectOperation(t.id)
          virtualizer.scrollToIndex(next, { align: 'auto' })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, selectedIndex, virtualizer])

  if (!fi) return null
  const active = filter.accounts.length + filter.kinds.length + filter.categories.length + filter.marks.length > 0 || !!filter.query || filter.period.kind !== 'month'
  const balances = fleet?.accounts.filter((a) => accounts.some((x) => x.id === a.id && !x.archived) || a.balance !== 0) ?? []

  return (
    <div className="flex h-full min-h-0" data-testid="page-operations">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-[38px] shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-line bg-panel px-2 py-[6px]">
          <PeriodBar period={filter.period} />
          <div className="relative w-[210px] shrink-0">
            <IconSearch size={13} className="absolute top-1/2 left-2 -translate-y-1/2 text-dim" />
            <input
              ref={searchRef}
              className="input pl-7"
              placeholder="Szukaj: kontrahent, notatka, kwota…  ( / )"
              value={filter.query}
              onChange={(e) => setFilter({ query: e.currentTarget.value })}
              data-testid="operations-search"
            />
          </div>
          <CheckMenu label="Konto" options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={filter.accounts} onChange={(v) => setFilter({ accounts: v })} testId="operations-accounts" />
          <CheckMenu<TxKind> label="Rodzaj" options={TX_KINDS.map((k) => ({ value: k, label: TX_KIND_LABEL[k] }))} value={filter.kinds} onChange={(v) => setFilter({ kinds: v })} testId="operations-kinds" />
          <CheckMenu
            label="Kategoria"
            options={[...cats.mains.filter((c) => !c.archived).map((c) => ({ value: c.id, label: c.name })), { value: '', label: 'bez kategorii' }]}
            value={filter.categories}
            onChange={(v) => setFilter({ categories: v })}
            testId="operations-categories"
          />
          <CheckMenu<OperationMark> label="Oznaczenia" options={OPERATION_MARKS.map((m) => ({ value: m, label: MARK_LABEL[m] }))} value={filter.marks} onChange={(v) => setFilter({ marks: v })} testId="operations-marks" />
          {active && (
            <button type="button" className="shrink-0 text-[11px] text-muted hover:text-fg-strong hover:underline" onClick={resetFilter} data-testid="operations-clear">
              wyczyść filtry
            </button>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              className={cx('btn h-[24px] px-1.5', !detailsHidden && 'border-accent/60 text-accent')}
              aria-pressed={!detailsHidden}
              title={detailsHidden ? 'Pokaż szczegóły zaznaczonej operacji' : 'Ukryj szczegóły – lista na całą szerokość'}
              aria-label="Szczegóły operacji"
              onClick={() => showPanel(DETAILS_KEY, detailsHidden)}
              data-testid="toggle-details"
            >
              <IconSidebarRight size={14} />
            </button>
            <button className="btn btn-accent" onClick={() => newOperation()} title="Nowa operacja (Ctrl+N)" data-testid="operation-new">
              <IconPlus size={13} /> Nowa
            </button>
          </div>
        </div>

        <div className="flex min-h-[30px] shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-b border-line px-3 py-1 text-[11.5px]" data-testid="operations-sums">
          <span className="text-muted">
            Operacje <span className="num text-fg-strong">{rows.length === all.length ? all.length : `${rows.length} / ${all.length}`}</span>
          </span>
          <span className="text-muted">
            Wpływy <span className="num text-up">{signedPln(sums.inflow)} zł</span>
          </span>
          <span className="text-muted">
            Wydatki <span className="num text-fg-strong" data-testid="operations-outflow">{plnText(-sums.outflow)} zł</span>
          </span>
          <span className="text-muted" title="Wydatki minus zwroty towaru (bez przelewów własnych, XTB i wydatków finansowanych przez domowników)">
            Koszty <span className="num text-fg-strong">{plnText(sums.costs)} zł</span>
          </span>
          <DuplicatesLink />
          <span className="flex-1" />
          {balances.map((a) => (
            <span key={a.id} className="text-muted" title={a.opening ? `Saldo otwarcia ${plnText(a.opening.amount)} zł na początek ${a.opening.date}` : 'Bez salda otwarcia – suma operacji (Ustawienia → Konta)'}>
              {a.name}{' '}
              <span className={cx('num', a.balance < 0 ? 'text-down' : 'text-fg-strong')} data-testid={`balance-${a.name}`}>
                {plnText(a.balance)} zł
              </span>
              {!a.opening && <span className="text-dim"> *</span>}
            </span>
          ))}
        </div>

        <BulkBar visible={rows} />
        <div className="grid h-[24px] shrink-0 items-center gap-x-2 border-b border-line bg-panel px-2 text-[10.5px] tracking-wide text-muted uppercase" style={{ gridTemplateColumns: TEMPLATE }}>
          <TickAll rows={rows} />
          <span>Data</span>
          <span>Godz.</span>
          <span>Kontrahent · konto</span>
          <span>Kategoria</span>
          <span />
          <span className="text-right">Kwota</span>
        </div>
        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto" data-testid="operations-list">
          {rows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
              {all.length === 0 ? (
                <>
                  <span>Brak operacji.</span>
                  <span>
                    <Kbd>Ctrl N</Kbd> dodaje operację; historię z mBanku wczytasz na ekranie Import.
                  </span>
                </>
              ) : (
                <span>Brak operacji dla wybranych filtrów.</span>
              )}
            </div>
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((v) => {
                const t = rows[v.index] as Transaction
                return <Row key={t.id} t={t} index={v.index} top={v.start} selected={t.id === selectedId} />
              })}
            </div>
          )}
        </div>
      </div>

      {detailsHidden ? (
        <aside hidden data-panel={DETAILS_KEY} data-hidden="1" />
      ) : (
        <>
          <PaneEdge pane={details} side="right" />
          <aside className="flex min-h-0 shrink-0 flex-col overflow-y-auto border-l border-line bg-panel" style={{ width: details.width }} data-panel={DETAILS_KEY}>
            {selectedId ? <OperationEditor key={selectedId} id={selectedId} /> : <div className="p-6 text-center text-muted">Wybierz operację z listy albo dodaj nową (Ctrl+N).</div>}
          </aside>
        </>
      )}
    </div>
  )
}
