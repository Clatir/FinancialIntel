import { cx } from './ui'

/**
 * A thin bar of a value against its target or limit (a layer, an envelope, the load line). `over` = past the limit is
 * bad (red); without it a full bar is just full.
 */
export function Meter({
  value,
  max,
  over = false,
  mark,
  className,
  ...rest
}: {
  value: number
  max: number | null
  /** Past the max is an overrun (an envelope, the load line): red. */
  over?: boolean
  /** A line at this fraction of the bar (the load line, the minimum shields). */
  mark?: number
  className?: string
  'data-testid'?: string
}) {
  const frac = max && max > 0 ? Math.max(0, value) / max : value > 0 ? 1 : 0
  const bad = over && max != null && value > max
  return (
    <div className={cx('relative h-[5px] w-full bg-line', className)} data-testid={rest['data-testid']} data-frac={frac.toFixed(3)}>
      <div className={cx('h-full transition-[width] duration-150', bad ? 'bg-down' : 'bg-accent')} style={{ width: `${Math.min(100, frac * 100)}%` }} />
      {mark != null && mark > 0 && mark < 1 && <div className="absolute top-[-2px] h-[9px] w-px bg-fg-strong/70" style={{ left: `${mark * 100}%` }} />}
    </div>
  )
}
