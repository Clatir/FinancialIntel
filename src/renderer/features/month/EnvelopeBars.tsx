import type { EnvelopeKind } from '@shared/schema'
import { plnText } from '../../components/fields'
import { Meter } from '../../components/meters'
import { cx } from '../../components/ui'
import { useCategories } from '../operations/pickers'

/**
 * The envelopes against their limits (a mark at 80% – the spec's warning), on the bridge and the month's plan; `labels`
 * names them in a detached window (no folder loaded there).
 */
export function EnvelopeBars({ rows, labels }: { rows: ReadonlyArray<{ categoryId: string; kind: EnvelopeKind; limit: number; spent: number }>; labels?: Readonly<Record<string, string>> }) {
  const cats = useCategories()
  const label = (id: string) => labels?.[id] ?? cats.label(id)
  return (
    <div className="flex flex-col gap-1.5 text-[12px]">
      {rows.map((e) => (
        <div key={e.categoryId} className="flex flex-col gap-0.5" data-testid="envelope-state" data-name={label(e.categoryId)}>
          <div className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate">{label(e.categoryId)}</span>
            <span className="text-[10.5px] text-dim">{e.kind === 'daily' ? 'codzienna' : 'planowa'}</span>
            <span className={cx('num', e.spent > e.limit ? 'text-down' : 'text-fg-strong')}>
              {plnText(e.spent)} / {plnText(e.limit)} zł
            </span>
          </div>
          <Meter value={e.spent} max={e.limit} over mark={e.limit > 0 ? 0.8 : undefined} />
        </div>
      ))}
    </div>
  )
}
