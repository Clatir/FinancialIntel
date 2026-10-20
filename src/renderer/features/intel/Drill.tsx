/**
 * Wywiad to the detail (1.10.0, F20): the spending table opening its subcategories, each cell its operations in Operacje;
 * „Namierzone cele” – the brands one spends at; a month against its averages and the year before (colour only for the
 * overruns); the counterparty's year in the operation's editor („Rozpoznanie celu”).
 */
import { Fragment, useMemo, useState } from 'react'
import { brandStats, brandYearOf, brandYears, isOver, monthComparison, type BrandYears } from '@shared/calc/drill'
import { addMonths, monthRange } from '@shared/calc/dates'
import type { SpendingRow } from '@shared/calc/intel'
import { noNarrowing } from '@shared/operationsView'
import type { BrandAliases } from '@shared/import/aliases'
import type { Transaction } from '@shared/schema'
import { plnText } from '../../components/fields'
import { Empty, Panel, cx } from '../../components/ui'
import { monthLabel, plDate, plural } from '../../lib/format'
import { listOf, useData } from '../../store/data'
import { useRecordList } from '../../store/records'
import { navigate } from '../../store/ui'
import { showFilter } from '../operations/state'
import { useCategories } from '../operations/pickers'

const zl = (g: number) => `${plnText(g)} zł`
const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%`

/** A cell of the spending: its operations in Operacje (a view – the stored filter stays, B88). */
export function showSpending(month: string, id: string, containerIds: readonly string[]): void {
  const base = { period: { kind: 'month' as const, month }, ...noNarrowing(), kinds: ['expense' as const] }
  if (id === 'cargo') showFilter({ ...base, containers: [...containerIds] })
  else showFilter({ ...base, categories: [id === '-' ? '' : id] })
  navigate({ page: 'operations' })
}

/** Every purchase at a brand, the whole history (a view). */
export function showBrandKey(key: string): void {
  showFilter({ period: { kind: 'all' }, ...noNarrowing(), brands: [key] })
  navigate({ page: 'operations' })
}

// ------------------------------------------------------------------ the spending table (F20)

/** „Wydatki w czasie”: the cargo, each main category opening its subcategories; a cell – its operations. */
export function SpendingTable({ months, spending, max }: { months: readonly string[]; spending: { rows: SpendingRow[]; totals: number[]; cargo: number[] }; max: number }) {
  const cats = useCategories()
  const containers = useRecordList('containers')
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())
  const toggle = (id: string) => setOpen((x) => (x.has(id) ? new Set([...x].filter((y) => y !== id)) : new Set([...x, id])))
  const containerIds = containers.map((c) => c.id)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11.5px]">
        <thead>
          <tr className="text-dim">
            <th className="py-0.5 pr-2 text-left font-normal">Kategoria</th>
            {months.map((m) => (
              <th key={m} className="px-1 text-right font-normal">
                {monthLabel(m).slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <SpendRow label="Order Block · ładownia" values={spending.cargo} max={max} accent title="Kontenery ładowni – stała strefa kosztów (Order Block)" testId="intel-order-block" onCell={(i) => showSpending(months[i]!, 'cargo', containerIds)} />
          {spending.rows.map((r) => {
            // Subcategories to open: one beyond the main's own money (a single line of the main itself says nothing new).
            const children = r.children.filter((c) => c.total || c.values.some(Boolean))
            const opens = children.length > 1 || (children.length === 1 && children[0]!.id !== r.id)
            return (
              <Fragment key={r.id}>
                <SpendRow
                  label={r.id === '-' ? 'bez kategorii' : cats.label(r.id)}
                  values={r.values}
                  max={max}
                  open={opens ? open.has(r.id) : undefined}
                  onToggle={opens ? () => toggle(r.id) : undefined}
                  onCell={(i) => showSpending(months[i]!, r.id, containerIds)}
                  testId="intel-spend-row"
                />
                {opens &&
                  open.has(r.id) &&
                  children.map((c) =>
                    // The main's own line: the filter of Operacje takes a main category with its subcategories (F18), so
                    // its amounts lead nowhere of their own – plain values.
                    c.id === r.id ? (
                      <SpendRow key={c.id} label="bez podkategorii" values={c.values} max={max} sub testId="intel-spend-sub" />
                    ) : (
                      <SpendRow key={c.id} label={cats.byId.get(c.id)?.name ?? cats.label(c.id)} values={c.values} max={max} sub onCell={(i) => showSpending(months[i]!, c.id, containerIds)} testId="intel-spend-sub" />
                    )
                  )}
              </Fragment>
            )
          })}
          <tr className="border-t border-line text-fg-strong">
            <td className="py-0.5 pr-2">Razem</td>
            {spending.totals.map((v, i) => (
              <td key={months[i]} className="num px-1 text-right">
                {plnText(v)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <span className="text-[11px] text-dim">Kliknij kategorię, żeby rozwinąć podkategorie, a kwotę – żeby zobaczyć jej operacje.</span>
    </div>
  )
}

function SpendRow({
  label,
  values,
  max,
  accent,
  sub,
  title,
  open,
  onToggle,
  onCell,
  testId
}: {
  label: string
  values: number[]
  max: number
  accent?: boolean
  sub?: boolean
  title?: string
  /** A main category with subcategories: open or not (undefined – nothing to open). */
  open?: boolean
  onToggle?: () => void
  /** A cell's operations in Operacje (undefined – plain values). */
  onCell?: (i: number) => void
  testId?: string
}) {
  return (
    <tr className={cx(accent && 'bg-accent-soft')} title={title} data-testid={testId} data-label={label}>
      <td className={cx('max-w-[180px] truncate py-0.5 pr-2', accent ? 'text-accent' : sub ? 'pl-3 text-muted' : 'text-fg')}>
        {onToggle ? (
          <button type="button" className="flex max-w-full items-center gap-1 truncate text-left hover:text-fg-strong" onClick={onToggle} aria-expanded={open} data-testid="intel-spend-toggle">
            <span className="w-[8px] text-[9px] text-dim" aria-hidden>
              {open ? '▾' : '▸'}
            </span>
            <span className="truncate">{label}</span>
          </button>
        ) : (
          label
        )}
      </td>
      {values.map((v, i) => (
        <td key={i} className="px-1 text-right">
          {v && onCell ? (
            <button type="button" className="flex w-full flex-col items-end hover:text-fg-strong" onClick={() => onCell(i)} title="Pokaż operacje" data-testid="intel-spend-cell">
              <span className="num">{plnText(v)}</span>
              <span className="h-[2px] bg-accent/60" style={{ width: `${Math.round((Math.max(0, v) / max) * 60)}px` }} />
            </button>
          ) : v ? (
            <span className="flex w-full flex-col items-end" data-testid="intel-spend-value">
              <span className="num">{plnText(v)}</span>
              <span className="h-[2px] bg-accent/60" style={{ width: `${Math.round((Math.max(0, v) / max) * 60)}px` }} />
            </span>
          ) : (
            <span className="num text-dim">—</span>
          )}
        </td>
      ))}
    </tr>
  )
}

// ------------------------------------------------------------------ „Namierzone cele” (F20)

/** The brands one spends at in the page's period, the most money first. */
export function TargetsPanel({ from, to, aliases }: { from: string; to: string; aliases: BrandAliases | undefined }) {
  const transactions = useRecordList('transactions')
  const categories = useData((s) => s.fi?.settings.categories)
  const cats = useCategories()
  const [all, setAll] = useState(false)
  const stats = useMemo(() => (categories ? brandStats(transactions, categories, from, to, aliases) : []), [transactions, categories, from, to, aliases])
  const shown = all ? stats.slice(0, 100) : stats.slice(0, 10)
  return (
    <Panel title="Namierzone cele" testId="intel-targets">
      {!stats.length ? (
        <Empty>Brak zakupów w tym okresie.</Empty>
      ) : (
        <div className="flex flex-col text-[11.5px]">
          <div className="grid grid-cols-[minmax(0,1fr)_88px_56px_64px_58px] gap-x-2 pb-0.5 text-[10.5px] text-dim">
            <span>Kontrahent · kategoria</span>
            <span className="text-right">razem</span>
            <span className="text-right">kontakty</span>
            <span className="text-right">średnio</span>
            <span className="text-right">trend</span>
          </div>
          {shown.map((b) => (
            <button
              key={b.key}
              type="button"
              className="grid grid-cols-[minmax(0,1fr)_88px_56px_64px_58px] items-baseline gap-x-2 border-t border-line/50 py-[3px] text-left hover:bg-hover"
              onClick={() => showBrandKey(b.key)}
              title={`Rozpoznanie celu – ${b.name}, ${b.count} ${plural(b.count, 'kontakt', 'kontakty', 'kontaktów')}, ${zl(b.total)}. Ostatnio ${plDate(b.last)}. Pokaż w Operacjach.`}
              data-testid="intel-target"
              data-name={b.name}
            >
              <span className="min-w-0 truncate">
                <span className="text-fg-strong">{b.name}</span>
                <span className="text-dim">
                  {' '}
                  · {b.categoryId ? cats.label(b.categoryId) : 'bez kategorii'}
                  {b.share != null ? ` (${b.share.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%)` : ''}
                </span>
              </span>
              <span className="num text-right" data-testid="intel-target-total">
                {plnText(b.total)}
              </span>
              <span className="num text-right">{b.count}</span>
              <span className="num text-right">{plnText(b.average)}</span>
              <span className={cx('num text-right', b.trend != null && b.trend > 10 ? 'text-accent' : 'text-muted')}>{b.trend == null ? 'nowy' : pct(b.trend)}</span>
            </button>
          ))}
          {stats.length > 10 && (
            <button type="button" className="self-start pt-1 text-accent hover:underline" onClick={() => setAll(!all)} data-testid="intel-targets-more">
              {all ? 'pokaż 10' : `pokaż więcej (${Math.min(100, stats.length)})`}
            </button>
          )}
          <span className="pt-1 text-[11px] text-dim">
            Marki z połączonymi nazwami importu; w nawiasie udział w wydatkach kategorii. Trend – wobec tak samo długiego okresu wcześniej. Opłaty ładowni pominięte.
          </span>
        </div>
      )}
    </Panel>
  )
}

// ------------------------------------------------------------------ a month against its averages (F20)

/** A month's money by category beside the average of 3 and 12 months and the year before – the accent only for overruns. */
export function ComparisonPanel({ month, start, covered }: { month: string; start: string | null; covered: readonly string[] }) {
  const transactions = useRecordList('transactions')
  const categories = useData((s) => s.fi?.settings.categories)
  const cats = useCategories()
  const months = monthRange(start ? start.slice(0, 7) : month, month).reverse().slice(0, 24)
  const [picked, setPicked] = useState<string | null>(null)
  // The month ended last by default: the running one is still being spent.
  const of = picked ?? (months.includes(addMonths(month, -1)) ? addMonths(month, -1) : month)
  const rows = useMemo(() => (categories ? monthComparison(transactions, categories, of, covered) : []), [transactions, categories, of, covered])
  const cell = (value: number, base: number | null, testId: string) => (
    <td className={cx('num px-1 text-right', base == null ? 'text-dim' : 'text-muted')} data-testid={testId}>
      {base == null ? '—' : plnText(base)}
      {isOver(value, base) ? <span className="ml-0.5 text-accent">▲</span> : null}
    </td>
  )
  return (
    <Panel title={`Porównanie – ${monthLabel(of)}`} name="Porównanie miesiąca" testId="intel-comparison">
      <div className="flex flex-col gap-1.5 text-[11.5px]">
        <select className="input h-[24px] self-start" value={of} onChange={(e) => setPicked(e.currentTarget.value)} aria-label="Miesiąc porównania" data-testid="intel-comparison-month">
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        {!rows.length ? (
          <span className="text-muted">Bez wydatków w tym miesiącu.</span>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-dim">
                <th className="py-0.5 text-left font-normal">Kategoria</th>
                <th className="px-1 text-right font-normal">miesiąc</th>
                <th className="px-1 text-right font-normal">śr. 3 mies.</th>
                <th className="px-1 text-right font-normal">śr. 12 mies.</th>
                <th className="px-1 text-right font-normal">rok temu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const over = isOver(r.value, r.avg3) || isOver(r.value, r.avg12) || isOver(r.value, r.yearAgo)
                return (
                  <tr key={r.id} className="border-t border-line/50" data-testid="intel-comparison-row" data-id={r.id} data-over={over ? 'true' : 'false'}>
                    <td className="max-w-[150px] truncate py-0.5">{r.id === 'cargo' ? 'Ładownia (kontenery)' : r.id === '-' ? 'bez kategorii' : cats.label(r.id)}</td>
                    <td className={cx('num px-1 text-right', over ? 'text-accent' : 'text-fg-strong')}>{plnText(r.value)}</td>
                    {cell(r.value, r.avg3, 'intel-comparison-avg3')}
                    {cell(r.value, r.avg12, 'intel-comparison-avg12')}
                    {cell(r.value, r.yearAgo, 'intel-comparison-year')}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <span className="text-[11px] text-dim">▲ – ponad 10% więcej niż średnia albo rok temu. Średnie z miesięcy, które obejmuje historia (import z banku).</span>
      </div>
    </Panel>
  )
}

// ------------------------------------------------------------------ the counterparty's year in the editor (F20)

const yearsMemo = new WeakMap<readonly Transaction[], { aliases: BrandAliases | undefined; index: BrandYears }>()

/** „u tego kontrahenta w 2026: 34 operacje, 1 240 zł, średnio 36 zł” – its brand's purchases of the operation's year. */
export function BrandYearLine({ t }: { t: Transaction }) {
  const map = useData((s) => s.records.transactions)
  const aliases = useData((s) => s.fi?.settings.import.aliases)
  if (t.kind !== 'expense' || t.containerId || !(t.counterparty || t.bank)) return null
  const list = listOf(map)
  let memo = yearsMemo.get(list)
  if (!memo || memo.aliases !== aliases) yearsMemo.set(list, (memo = { aliases, index: brandYears(list, aliases) }))
  const y = brandYearOf(memo.index, t, aliases)
  if (!y) return null
  return (
    <span className="text-[11px] text-dim" data-testid="operation-brand-year">
      Rozpoznanie celu: u tego kontrahenta w {y.year} – {y.count} {plural(y.count, 'zakup', 'zakupy', 'zakupów')}, {zl(y.total)}, średnio {zl(y.average)}
    </span>
  )
}
