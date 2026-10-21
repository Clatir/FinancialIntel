/**
 * Operacje (1.7.0, F18): more filters (the amount, the members, the counterparty, what an operation is linked to, the
 * other account of a transfer), the list's order by its headers, the views saved in the folder, the visible list to
 * CSV / Excel – exactly what the list shows, in its order – and (1.11.0, D89) the columns the list shows.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { brandTargetOf, inPeriod, type OperationSort, type OperationsFilter } from '@shared/operationsView'
import { operationRowsOf, operationsCsv, operationsSheet } from '@shared/export/budget'
import { warsawNow } from '@shared/calc/dates'
import { fold } from '@shared/fold'
import type { Transaction } from '@shared/schema'
import { AmountField } from '../../components/fields'
import { Popover } from '../../components/Popover'
import { cx } from '../../components/ui'
import { api } from '../../lib/api'
import { countLabel, plural } from '../../lib/format'
import { listOf, useData, useFolderLocked } from '../../store/data'
import { useRecordList } from '../../store/records'
import { toast } from '../../store/ui'
import { useMembers } from '../household/actions'
import { useAccounts } from './pickers'
import { tagKey } from '@shared/calc/tags'
import { useKnownTags } from '../tags/state'
import { applyView, deleteView, isShownView, saveView, setFilter, useOperationsUi } from './state'
import { COLUMN_LABEL, OPERATION_COLUMNS, resetColumns, showColumn, useOperationColumns } from './columns'

/** How many of the extra filters are on (the chip „Więcej filtrów: N”). */
export function extraFilters(f: OperationsFilter): number {
  return (
    (f.amountMin != null || f.amountMax != null ? 1 : 0) +
    (f.members.length ? 1 : 0) +
    (f.brands.length ? 1 : 0) +
    (f.containers.length ? 1 : 0) +
    (f.goals.length ? 1 : 0) +
    (f.loans.length ? 1 : 0) +
    (f.transferAccounts.length ? 1 : 0) +
    (f.tags.length ? 1 : 0)
  )
}

/** The list shows other than a month's operations by date (F18): a view to save – Operacje on a computer and the phone. */
export function viewable(f: OperationsFilter): boolean {
  return f.accounts.length + f.kinds.length + f.categories.length + f.marks.length + extraFilters(f) > 0 || !!f.query || f.period.kind !== 'month' || f.sort !== 'date'
}

const toggled = (list: readonly string[], v: string): string[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

function Checks({ options, value, onChange, testId }: { options: Array<{ value: string; label: string }>; value: readonly string[]; onChange: (v: string[]) => void; testId: string }) {
  if (!options.length) return <span className="text-dim">brak</span>
  return (
    <div className="flex max-h-[132px] flex-col gap-0.5 overflow-y-auto">
      {options.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={value.includes(o.value)} onChange={() => onChange(toggled(value, o.value))} data-testid={`${testId}-${o.value || 'none'}`} />
          <span className="truncate">{o.label}</span>
        </label>
      ))}
    </div>
  )
}

function Section({ title, children, testId }: { title: string; children: ReactNode; testId: string }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-1.5 first:border-t-0 first:pt-0" data-testid={testId}>
      <span className="text-[10.5px] tracking-wide text-muted uppercase">{title}</span>
      {children}
    </div>
  )
}

/** The brands of the operations of the list's period, the most used first (the filter's own too, whatever the period). */
function useBrandOptions(filter: OperationsFilter): Array<{ value: string; label: string }> {
  const transactions = useData((s) => s.records.transactions)
  const aliases = useData((s) => s.fi?.settings.import.aliases)
  return useMemo(() => {
    const byKey = new Map<string, { count: number; names: Map<string, number>; chain: string | null }>()
    for (const t of listOf(transactions)) {
      const inList = inPeriod(t.date, filter.period)
      const target = brandTargetOf(t, aliases)
      const key = target.brand.key
      if (!key || (!inList && !filter.brands.includes(key))) continue
      let b = byKey.get(key)
      if (!b) byKey.set(key, (b = { count: 0, names: new Map(), chain: target.brand.brand?.label ?? null }))
      b.count++
      const name = (t.counterparty || t.title).trim()
      if (name) b.names.set(name, (b.names.get(name) ?? 0) + 1)
    }
    const label = (b: { names: Map<string, number>; chain: string | null }, key: string) => b.chain ?? [...b.names].sort((x, y) => y[1] - x[1])[0]?.[0] ?? key
    return [...byKey]
      .map(([key, b]) => ({ value: key, label: label(b, key), count: b.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pl'))
      .map(({ value, label: l, count }) => ({ value, label: `${l} (${count})` }))
  }, [transactions, aliases, filter.period, filter.brands])
}

function BrandPicker({ filter }: { filter: OperationsFilter }) {
  const options = useBrandOptions(filter)
  const [query, setQuery] = useState('')
  const q = fold(query.trim())
  // The filter's brands first, then the matches – a long history names hundreds of shops.
  const shown = options.filter((o) => filter.brands.includes(o.value) || !q || fold(o.label).includes(q)).slice(0, 60)
  return (
    <>
      <input className="input h-[24px]" placeholder="szukaj kontrahenta…" value={query} onChange={(e) => setQuery(e.currentTarget.value)} data-testid="operations-more-brand-search" />
      <Checks options={shown} value={filter.brands} onChange={(brands) => setFilter({ brands })} testId="operations-more-brand" />
    </>
  )
}

/** The tags to tick (F17): the history's, by their key – the filter's own too, when no operation has it now. */
function tagOptions(known: readonly string[], picked: readonly string[]): Array<{ value: string; label: string }> {
  const options = known.map((t) => ({ value: tagKey(t), label: `#${t}` }))
  const have = new Set(options.map((o) => o.value))
  return [...options, ...picked.filter((k) => !have.has(k)).map((k) => ({ value: k, label: `#${k}` }))]
}

/** „Więcej filtrów” (F18): what the bar's menus do not cover. */
export function MoreFilters({ filter }: { filter: OperationsFilter }) {
  const accounts = useAccounts()
  const members = useMembers()
  const containers = useRecordList('containers')
  const goals = useRecordList('goals')
  const loans = useRecordList('loans')
  const knownTags = useKnownTags()
  const on = extraFilters(filter)
  // Archived ones only while the filter has them (to untick).
  const live = <T extends { id: string; name: string; archived?: boolean }>(list: readonly T[], picked: readonly string[]) =>
    list.filter((x) => !x.archived || picked.includes(x.id)).map((x) => ({ value: x.id, label: x.archived ? `${x.name} (archiwum)` : x.name }))
  return (
    <Popover
      buttonClassName="chip"
      pressed={on > 0}
      width={300}
      testId="operations-more"
      panelTestId="operations-more-menu"
      label={
        <>
          Więcej filtrów{on ? `: ${on}` : ''}
          <span className="ml-1 text-[9px] opacity-60" aria-hidden>
            ▾
          </span>
        </>
      }
    >
      {() => (
        <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto text-[12px]">
          <Section title="Kwota (bez znaku)" testId="operations-more-amount">
            <div className="flex items-center gap-1.5">
              od
              <AmountField className="w-[90px]" value={filter.amountMin} allowEmpty placeholder="—" onChange={(amountMin) => setFilter({ amountMin, amountMax: filter.amountMax != null && amountMin != null && filter.amountMax < amountMin ? null : filter.amountMax })} aria-label="Kwota od" data-testid="operations-amount-min" />
              do
              <AmountField className="w-[90px]" value={filter.amountMax} allowEmpty placeholder="—" onChange={(amountMax) => setFilter({ amountMax, amountMin: filter.amountMin != null && amountMax != null && amountMax < filter.amountMin ? null : filter.amountMin })} aria-label="Kwota do" data-testid="operations-amount-max" />
              zł
            </div>
          </Section>
          <Section title="Domownik – finansuje albo od niego" testId="operations-more-members">
            <Checks options={members.filter((m) => !m.archived || filter.members.includes(m.id)).map((m) => ({ value: m.id, label: m.name }))} value={filter.members} onChange={(v) => setFilter({ members: v })} testId="operations-more-member" />
          </Section>
          <Section title="Kontrahent" testId="operations-more-brands">
            <BrandPicker filter={filter} />
          </Section>
          <Section title="Ładownia" testId="operations-more-containers">
            <Checks options={containers.filter((c) => !c.archived || filter.containers.includes(c.id)).map((c) => ({ value: c.id, label: c.archived ? `${c.name} (archiwum)` : c.name }))} value={filter.containers} onChange={(v) => setFilter({ containers: v })} testId="operations-more-container" />
          </Section>
          <Section title="Cel" testId="operations-more-goals">
            <Checks options={live(goals, filter.goals)} value={filter.goals} onChange={(v) => setFilter({ goals: v })} testId="operations-more-goal" />
          </Section>
          <Section title="Pożyczka" testId="operations-more-loans">
            <Checks options={loans.map((l) => ({ value: l.id, label: l.name }))} value={filter.loans} onChange={(v) => setFilter({ loans: v })} testId="operations-more-loan" />
          </Section>
          <Section title="Tag (wyprawa, projekt)" testId="operations-more-tags">
            <Checks options={tagOptions(knownTags, filter.tags)} value={filter.tags} onChange={(v) => setFilter({ tags: v })} testId="operations-more-tag" />
          </Section>
          <Section title="Konto przelewu" testId="operations-more-transfer">
            <Checks options={[...live(accounts, filter.transferAccounts), { value: '', label: 'konto spoza budżetu' }]} value={filter.transferAccounts} onChange={(v) => setFilter({ transferAccounts: v })} testId="operations-more-transfer" />
          </Section>
          {on > 0 && (
            <button
              type="button"
              className="self-start text-dim hover:text-fg-strong"
              onClick={() => setFilter({ amountMin: null, amountMax: null, members: [], brands: [], containers: [], goals: [], loans: [], transferAccounts: [], tags: [] })}
              data-testid="operations-more-clear"
            >
              wyczyść te filtry
            </button>
          )}
        </div>
      )}
    </Popover>
  )
}

/** A header of the list that orders it (F18): pressed – the list's order now. */
export function SortHeader({ sort, by, children, className }: { sort: OperationSort; by: OperationSort; children: ReactNode; className?: string }) {
  const on = sort === by
  return (
    <button
      type="button"
      className={cx('flex min-w-0 items-center gap-1 truncate text-left uppercase hover:text-fg-strong', on && 'text-accent', className)}
      aria-pressed={on}
      title={by === 'date' ? 'Najnowsze najpierw' : by === 'amount' ? 'Największe kwoty najpierw (wydatki i wpływy)' : 'Kontrahenci od A do Z'}
      onClick={() => setFilter({ sort: by })}
      data-testid={`operations-sort-${by}`}
    >
      {children}
      {on && <span aria-hidden>▾</span>}
    </button>
  )
}

/** The views saved in the folder (F18) as chips; „Zapisz widok” keeps the list's filter under a name. */
export function ViewsBar({ filter, active }: { filter: OperationsFilter; active: boolean }) {
  const views = useData((s) => s.fi?.settings.operationViews)
  const locked = useFolderLocked()
  if (!views?.length && !active) return null
  return (
    <div className="flex min-h-[30px] shrink-0 flex-wrap items-center gap-1.5 border-b border-line px-2 py-1 text-[11.5px]" data-testid="operations-views">
      <span className="text-muted">Widoki:</span>
      {(views ?? []).map((v) => {
        const shown = isShownView(filter, v)
        return (
          <span key={v.id} className={cx('chip gap-1 pr-1', shown && 'border-accent/60 text-accent')} data-testid="operations-view" data-active={shown ? '1' : undefined}>
            <button type="button" className="max-w-[200px] truncate" onClick={() => applyView(v)} title={v.withPeriod ? 'Widok z okresem' : 'Widok bez okresu – zostaje okres listy'} data-testid="operations-view-apply">
              {v.name}
            </button>
            {!locked && (
              <button type="button" className="px-0.5 text-dim hover:text-fg-strong" onClick={() => deleteView(v.id)} aria-label={`Usuń widok ${v.name}`} data-testid="operations-view-delete">
                ×
              </button>
            )}
          </span>
        )
      })}
      {!views?.length && <span className="text-dim">brak – zapisz bieżące filtry jako widok</span>}
      {active && !locked && <SaveView />}
    </div>
  )
}

function SaveView() {
  const [name, setName] = useState('')
  const [withPeriod, setWithPeriod] = useState(false)
  return (
    <Popover buttonClassName="btn h-[22px] px-1.5" width={280} testId="operations-view-save" label="+ Zapisz widok">
      {(close) => (
        <form
          className="flex flex-col gap-2 text-[12px]"
          onSubmit={(e) => {
            e.preventDefault()
            if (saveView(name, withPeriod)) {
              toast(`Widok „${name.trim()}” zapisany – na każdym komputerze.`, 'success', 4000)
              setName('')
              close()
            }
          }}
        >
          <input className="input" autoFocus maxLength={80} placeholder="np. Jedzenie na mieście > 50 zł" value={name} onChange={(e) => setName(e.currentTarget.value)} data-testid="operations-view-name" />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={withPeriod} onChange={(e) => setWithPeriod(e.currentTarget.checked)} data-testid="operations-view-period" />z okresem listy (inaczej okres zostaje taki, jaki jest)
          </label>
          <button type="submit" className="btn btn-accent self-end" disabled={!name.trim()} data-testid="operations-view-confirm">
            Zapisz
          </button>
        </form>
      )}
    </Popover>
  )
}

/** The visible list to CSV / Excel (F18): the operations shown, in the list's order. */
export function ExportVisible({ rows, view }: { rows: readonly Transaction[]; view: string | null }) {
  const fi = useData((s) => s.fi)
  if (!fi || !rows.length) return null
  // The list of one account: a transfer's money on it, as the list shows it.
  const out = () => operationRowsOf(rows, fi.settings.categories, fi.settings.accounts, fi.settings.household.members, view)
  const day = warsawNow().date
  // What the window shows – the records in memory, the list's order (nothing to save first: no file of the folder).
  const run = (save: () => Promise<string | null>) =>
    save().then(
      (path) => path && toast(`Zapisano ${countLabel(rows.length, 'operację', 'operacje', 'operacji')}: ${path}`, 'success', 6000),
      (e: unknown) => toast(`Nie udało się zapisać: ${e instanceof Error ? e.message : String(e)}`, 'error', 8000)
    )
  return (
    <span className="flex items-center gap-1" title="Operacje widoczne na liście – z jej filtrami i w jej kolejności">
      <button type="button" className="btn h-[22px] px-1.5" onClick={() => void run(() => api.saveTextFile(`operacje_${day}.csv`, operationsCsv(out()), { name: 'CSV', extensions: ['csv'] }))} data-testid="operations-export-csv">
        CSV
      </button>
      <button type="button" className="btn h-[22px] px-1.5" onClick={() => void run(() => api.saveXlsx(`operacje_${day}.xlsx`, [operationsSheet(out())]))} data-testid="operations-export-xlsx">
        Excel
      </button>
    </span>
  )
}

/**
 * „Kolumny” (1.11.0, D89): which columns the list shows – on this computer. The date and the amount always; the export
 * takes every column whatever is shown.
 */
export function ColumnsMenu() {
  const hidden = useOperationColumns((s) => s.hidden)
  const n = hidden.length
  return (
    <Popover
      buttonClassName="btn h-[22px] px-1.5"
      pressed={n > 0}
      width={230}
      testId="operations-columns"
      panelTestId="operations-columns-menu"
      label={
        <>
          Kolumny{n ? `: ${n} ${plural(n, 'ukryta', 'ukryte', 'ukrytych')}` : ''}
          <span className="ml-1 text-[9px] opacity-60" aria-hidden>
            ▾
          </span>
        </>
      }
    >
      {() => (
        <div className="flex flex-col gap-1 text-[12px]">
          <label className="flex items-center gap-2 text-dim">
            <input type="checkbox" checked disabled />
            Data
          </label>
          {OPERATION_COLUMNS.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={!hidden.includes(c)}
                onChange={(e) => {
                  const on = e.currentTarget.checked
                  // The counterparty's header is the only one of its order: without it the list goes newest first again.
                  if (!on && c === 'counterparty' && useOperationsUi.getState().filter.sort === 'counterparty') setFilter({ sort: 'date' })
                  showColumn(c, on)
                }}
                data-testid={`operations-column-${c}`}
              />
              {COLUMN_LABEL[c]}
            </label>
          ))}
          <label className="flex items-center gap-2 text-dim">
            <input type="checkbox" checked disabled />
            Kwota
          </label>
          {n > 0 && (
            <button type="button" className="mt-1 self-start text-accent hover:underline" onClick={resetColumns} data-testid="operations-columns-reset">
              przywróć domyślne
            </button>
          )}
          <span className="text-[11px] text-dim">Na tym komputerze. Data i kwota zawsze widoczne; eksport CSV / Excel ma wszystkie kolumny.</span>
        </div>
      )}
    </Popover>
  )
}
