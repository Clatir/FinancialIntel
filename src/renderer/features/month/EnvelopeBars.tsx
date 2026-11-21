import { daysInMonth } from '@shared/calc/dates'
import { ictOf } from '@shared/glossary'
import { noNarrowing } from '@shared/operationsView'
import type { EnvelopeKind } from '@shared/schema'
import { plnText } from '../../components/fields'
import { Meter } from '../../components/meters'
import { cx } from '../../components/ui'
import { navigate } from '../../store/ui'
import { showFilter } from '../operations/state'
import { useCategories } from '../operations/pickers'
import { overPace, paceOf } from './envelopePace'

/** An envelope's operations in its month (UX-34, UX-74): Operacje with the category (its subcategories too) and the month. */
export function showEnvelope(month: string, categoryId: string): void {
  showFilter({ period: { kind: 'month', month }, ...noNarrowing(), categories: [categoryId] })
  navigate({ page: 'operations' })
}

/**
 * The envelopes against their limits (a mark at 80% – the spec's warning), on the bridge and the month's plan; `labels`
 * names them in a detached window (no folder loaded there). `elapsed` – the part of the month gone (this month only):
 * the Equilibrium line (D73, ICT) – spent above it is said „+X zł ponad tempo” (Premium in its hint, D106 pkt 2), at or
 * below it nothing. `month` – the rows' month: a click on an envelope opens its operations (`onOpen` instead – a detached
 * window leads the main one).
 */
export function EnvelopeBars({
  rows,
  labels,
  elapsed,
  month,
  onOpen,
  onCover
}: {
  rows: ReadonlyArray<{ categoryId: string; kind: EnvelopeKind; limit: number; spent: number }>
  labels?: Readonly<Record<string, string>>
  elapsed?: number
  month?: string
  onOpen?: (categoryId: string) => void
  /** A planned envelope over its limit: „pokryj z koperty…” (F28) – this month only. */
  onCover?: (categoryId: string) => void
}) {
  const cats = useCategories()
  const label = (id: string) => labels?.[id] ?? cats.label(id)
  const open = onOpen ?? (month ? (id: string) => showEnvelope(month, id) : undefined)
  return (
    <div className="flex flex-col gap-1.5 text-[12px]">
      {rows.map((e) => {
        const over = overPace(e, elapsed)
        const head = (
          <>
            <span className="min-w-0 flex-1 truncate">{label(e.categoryId)}</span>
            <span className="text-[10.5px] text-dim">{e.kind === 'daily' ? 'codzienna' : 'planowa'}</span>
            {over != null && elapsed != null && (
              <span className="cursor-help text-[10.5px] text-accent" title={`${ictOf('Premium / Discount')} Tempo na dziś: ${plnText(paceOf(e.limit, elapsed))} zł.`} data-testid="envelope-zone" data-zone="premium">
                +{plnText(over)} zł ponad tempo
              </span>
            )}
            <span className={cx('num', e.spent > e.limit ? 'text-down' : 'text-fg-strong')}>
              {plnText(e.spent)} / {plnText(e.limit)} zł
            </span>
          </>
        )
        return (
          <div key={e.categoryId} className="flex flex-col gap-0.5" data-testid="envelope-state" data-name={label(e.categoryId)}>
            {open ? (
              <button type="button" className="flex items-baseline gap-2 text-left hover:text-fg-strong" onClick={() => open(e.categoryId)} title="Operacje tej koperty w miesiącu" data-testid="envelope-open">
                {head}
              </button>
            ) : (
              <div className="flex items-baseline gap-2">{head}</div>
            )}
            {onCover && e.kind === 'planned' && e.spent > e.limit && (
              <button className="self-end text-[11px] text-accent hover:underline" onClick={() => onCover(e.categoryId)} title="Przesuń limit z koperty, w której jest zapas" data-testid="envelope-cover">
                pokryj z koperty…
              </button>
            )}
            <Meter value={e.spent} max={e.limit} over mark={e.limit > 0 ? 0.8 : undefined} tick={elapsed != null && e.limit > 0 ? elapsed : undefined} />
          </div>
        )
      })}
    </div>
  )
}

/** The part of the month gone at the end of `today` (the Equilibrium of the envelopes). */
export const monthElapsed = (today: string): number => Number(today.slice(8, 10)) / daysInMonth(today.slice(0, 7))
