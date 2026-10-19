import { daysInMonth } from '@shared/calc/dates'
import type { EnvelopeKind } from '@shared/schema'
import { plnText } from '../../components/fields'
import { Meter } from '../../components/meters'
import { cx } from '../../components/ui'
import { useCategories } from '../operations/pickers'

/**
 * The envelopes against their limits (a mark at 80% – the spec's warning), on the bridge and the month's plan; `labels`
 * names them in a detached window (no folder loaded there). `elapsed` – the part of the month gone (this month only):
 * the Equilibrium line (D73, ICT) – spent above it is Premium, below it Discount.
 */
export function EnvelopeBars({
  rows,
  labels,
  elapsed,
  onCover
}: {
  rows: ReadonlyArray<{ categoryId: string; kind: EnvelopeKind; limit: number; spent: number }>
  labels?: Readonly<Record<string, string>>
  elapsed?: number
  /** A planned envelope over its limit: „pokryj z koperty…” (F28) – this month only. */
  onCover?: (categoryId: string) => void
}) {
  const cats = useCategories()
  const label = (id: string) => labels?.[id] ?? cats.label(id)
  return (
    <div className="flex flex-col gap-1.5 text-[12px]">
      {rows.map((e) => (
        <div key={e.categoryId} className="flex flex-col gap-0.5" data-testid="envelope-state" data-name={label(e.categoryId)}>
          <div className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate">{label(e.categoryId)}</span>
            <span className="text-[10.5px] text-dim">{e.kind === 'daily' ? 'codzienna' : 'planowa'}</span>
            {elapsed != null && e.limit > 0 && (
              <span
                className={cx('text-[10.5px]', e.spent > e.limit * elapsed ? 'text-accent' : 'text-muted')}
                title="Equilibrium: część miesiąca, która minęła – wydane ponad nią to Premium, poniżej Discount"
                data-testid="envelope-zone"
              >
                {e.spent > e.limit * elapsed ? 'Premium' : 'Discount'}
              </span>
            )}
            <span className={cx('num', e.spent > e.limit ? 'text-down' : 'text-fg-strong')}>
              {plnText(e.spent)} / {plnText(e.limit)} zł
            </span>
          </div>
          {onCover && e.kind === 'planned' && e.spent > e.limit && (
            <button className="self-end text-[11px] text-accent hover:underline" onClick={() => onCover(e.categoryId)} title="Przesuń limit z koperty, w której jest zapas" data-testid="envelope-cover">
              pokryj z koperty…
            </button>
          )}
          <Meter value={e.spent} max={e.limit} over mark={e.limit > 0 ? 0.8 : undefined} tick={elapsed != null && e.limit > 0 ? elapsed : undefined} />
        </div>
      ))}
    </div>
  )
}

/** The part of the month gone at the end of `today` (the Equilibrium of the envelopes). */
export const monthElapsed = (today: string): number => Number(today.slice(8, 10)) / daysInMonth(today.slice(0, 7))
