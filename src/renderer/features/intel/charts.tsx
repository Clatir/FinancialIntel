// adapted from ICTTJ src/renderer/components/charts/EquityChart.tsx and WeekdayHourHeatmap.tsx @ 84a8339
/**
 * The intelligence's charts (E8): the wealth week by week with BOS / CHoCH marks and the drawdown pane
 * (lightweight-charts), the killzones of spending (weekday × hour, SVG).
 */
import { useEffect, useRef } from 'react'
import { ColorType, createChart, createSeriesMarkers, CrosshairMode, HistogramSeries, LineSeries, LineStyle, type IChartApi, type Time } from 'lightweight-charts'
import type { KillzoneCell, StructureMark, WealthPoint } from '@shared/calc/intel'
import { amountsHidden, plnText } from '../../components/fields'
import { usePanelFill } from '../../components/ui'
import { cx } from '../../components/ui'

const zl = (g: number) => `${plnText(g)} zł`

/** The wealth (the budget's money) at each week's end; the drawdown below; BOS / CHoCH where the structure broke. */
export function WealthChart({ points, marks, height = 280, testId = 'intel-wealth-chart' }: { points: readonly WealthPoint[]; marks: readonly StructureMark[]; height?: number; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const fill = usePanelFill()
  const hidden = amountsHidden()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#111418' },
        textColor: '#7a838e',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
        attributionLogo: false,
        panes: { separatorColor: '#1e232a', separatorHoverColor: '#2b323b' }
      },
      grid: { vertLines: { color: '#171b20' }, horzLines: { color: '#171b20' } },
      rightPriceScale: { borderColor: '#1e232a', visible: !hidden },
      timeScale: { borderColor: '#1e232a' },
      crosshair: { mode: CrosshairMode.Magnet, vertLine: { color: '#4f5862', labelBackgroundColor: '#2b323b' }, horzLine: { color: '#4f5862', labelBackgroundColor: '#2b323b' } },
      localization: { locale: 'pl-PL', priceFormatter: (p: number) => (hidden ? '•••' : zl(Math.round(p * 100))) }
    })
    chartRef.current = chart
    const line = chart.addSeries(LineSeries, { color: '#e8edf2', lineWidth: 2, priceLineVisible: false, lastValueVisible: !hidden })
    line.setData(points.map((p) => ({ time: p.date as Time, value: p.value / 100 })))
    createSeriesMarkers(
      line,
      marks.map((m) => ({
        time: m.date as Time,
        position: m.direction === 'up' ? ('aboveBar' as const) : ('belowBar' as const),
        shape: m.direction === 'up' ? ('arrowUp' as const) : ('arrowDown' as const),
        color: m.kind === 'choch' ? '#e8a33d' : '#7a838e',
        text: m.kind === 'choch' ? 'CHoCH' : 'BOS'
      }))
    )
    for (const m of marks.slice(-3)) line.createPriceLine({ price: m.level / 100, color: '#2b323b', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false })
    const dd = chart.addSeries(HistogramSeries, { color: 'rgba(246,70,93,0.55)', priceLineVisible: false, lastValueVisible: false }, 1)
    dd.setData(points.map((p) => ({ time: p.date as Time, value: p.drawdown / 100 })))
    chart.panes()[1]?.setHeight(Math.round((fill ? Math.max(el.clientHeight, height) : height) * 0.24))
    chart.timeScale().fitContent()
    return () => {
      chart.remove()
      chartRef.current = null
    }
  }, [points, marks, height, fill, hidden])
  return (
    <div className={cx(fill ? 'flex min-h-0 w-full flex-1 flex-col' : 'w-full')}>
      <div ref={ref} style={fill ? { minHeight: 200 } : { height }} className={cx(fill ? 'w-full flex-1' : 'w-full')} data-testid={testId} data-points={points.length} data-marks={marks.length} />
    </div>
  )
}

const DAYS = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd']
const CELL_W = 26
const CELL_H = 20
const LEFT = 30
const TOP = 16

/** Weekday × hour of the purchases with a time: the costs in the accent's intensity, details on hover. */
export function KillzoneMap({ cells }: { cells: ReadonlyMap<string, KillzoneCell> }) {
  const list = [...cells.values()]
  const lo = list.length ? Math.min(6, ...list.map((c) => c.hour)) : 6
  const hi = list.length ? Math.max(22, ...list.map((c) => c.hour)) : 22
  const hours = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  const max = Math.max(1, ...list.map((c) => c.cost))
  const top = list.sort((a, b) => b.cost - a.cost)[0]
  const W = LEFT + hours.length * CELL_W
  const H = TOP + 7 * CELL_H
  const hidden = amountsHidden()
  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} role="img" aria-label="Killzones wydatków" data-testid="intel-killzones">
        {hours.map((h, i) => (
          <text key={h} x={LEFT + i * CELL_W + CELL_W / 2} y={10} fontSize="9" fill="#7a838e" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {String(h).padStart(2, '0')}
          </text>
        ))}
        {DAYS.map((d, di) => (
          <g key={d}>
            <text x={0} y={TOP + di * CELL_H + CELL_H / 2 + 3} fontSize="9.5" fill="#7a838e" fontFamily="Inter, sans-serif">
              {d}
            </text>
            {hours.map((h, i) => {
              const c = cells.get(`${di + 1}:${h}`)
              const k = c ? 0.2 + 0.8 * (c.cost / max) : 0
              return (
                <rect
                  key={h}
                  x={LEFT + i * CELL_W}
                  y={TOP + di * CELL_H}
                  width={CELL_W - 2}
                  height={CELL_H - 2}
                  fill={c ? `rgba(232,163,61,${k.toFixed(2)})` : '#12161b'}
                  stroke={c && top && c === top ? '#e8edf2' : c ? 'none' : '#1e232a'}
                  data-testid={c ? 'killzone-cell' : undefined}
                >
                  <title>{c ? `${d} ${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00 · ${c.count} zak. · ${hidden ? '•••' : zl(c.cost)}` : `${d} ${String(h).padStart(2, '0')}:00 · bez zakupów`}</title>
                </rect>
              )
            })}
          </g>
        ))}
      </svg>
    </div>
  )
}
