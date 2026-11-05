/**
 * „Skąd i dokąd” of the debriefing (1.17.0, AP-46, T491): the month's flows (`calc/sankey.ts`) as a Sankey of own SVG
 * (`shared/sankeyLayout.ts`) – two views, „Przychód i koszty” and „Pensja i energia”. The look of the app: no gradients,
 * no shadows, the bands and bars neutral, the accent only for what the pointer is on, green / red only for an amount on
 * the plus / on the minus; every label with its amount, the tooltip with the amount and its percent of the chart. The
 * hidden amounts (Ctrl+$) hide the amounts – the bands and the bars stay as they are (the layout reads the real ones).
 */
import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { Flows } from '@shared/calc/sankey'
import { fitLabel, headingRoomOf, layoutOf, roomOf, sankeySvg, type LaidNode } from '@shared/sankeyLayout'
import { percentText } from '@shared/format'
import { plnText } from '../../components/fields'
import { Segmented } from '../../components/ui'

export type SankeyView = 'money' | 'energy'

const VIEWS: Array<{ value: SankeyView; label: string }> = [
  { value: 'money', label: 'Przychód i koszty' },
  { value: 'energy', label: 'Pensja i energia' }
]

/** The narrowest the chart is drawn (a narrower window scrolls it sideways – the phone). */
const MIN_WIDTH = 640

/** The amount of a node: in or out of it (a node is balanced). */
const nodeAmount = (n: LaidNode) => n.value

/** „13,8%” of the chart's whole. */
const share = (value: number, total: number) => (total > 0 ? percentText((value / total) * 100) : '—')

const COLORS = { band: '#7a838e', bar: '#7a838e', text: '#c3cbd4', muted: '#7a838e', up: '#2ebd85', down: '#f6465d', accent: '#e8a33d', halo: '#111418' }

/** The debriefing's PDF (light paper): the same layout, real amounts (D73). */
export function sankeyPdfSvg(flows: Flows, money: (g: number) => string): string {
  return sankeySvg(layoutOf(flows, 700, 240), {
    label: (n) => ({ name: n.label, amount: money(nodeAmount(n)) }),
    heading: (h) => ({ name: h.group, amount: money(h.value) }),
    colors: { band: '#9aa3ad', bandOpacity: 0.35, bar: '#5f6873', text: '#1d232a', muted: '#5f6873', up: '#1f9e6c', down: '#d63c50', halo: '#ffffff' }
  })
}

type Hover = { kind: 'node'; id: string; x: number; y: number } | { kind: 'link'; index: number; x: number; y: number } | null

export function MonthSankey({ money, energy, empty, view, onView }: { money: Flows; energy: Flows | null; empty: string; view: SankeyView; onView: (v: SankeyView) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(MIN_WIDTH)
  const [hover, setHover] = useState<Hover>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setWidth(Math.max(MIN_WIDTH, Math.floor(el.clientWidth)))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const flows = view === 'energy' ? energy : money
  const shown = flows && flows.links.length ? flows : null
  // Laid out once per flows and width (R2 review, item 12): a move of the pointer renders, never lays out again.
  const layout = useMemo(() => (shown ? layoutOf(shown, width) : null), [shown, width])
  const labelOf = useMemo(() => new Map(layout?.nodes.map((n) => [n.id, n.label]) ?? []), [layout])
  const zl = (g: number) => `${plnText(g)} zł`
  const at = (e: MouseEvent) => {
    const r = box.current!.getBoundingClientRect()
    return { x: e.clientX - r.left + box.current!.scrollLeft, y: e.clientY - r.top }
  }
  const tip = (() => {
    if (!hover || !layout || !shown) return null
    if (hover.kind === 'node') {
      const n = layout.nodes.find((x) => x.id === hover.id)
      if (!n) return null
      return { title: n.label, value: n.value, detail: n.detail }
    }
    const k = layout.links[hover.index]
    if (!k) return null
    return { title: `${labelOf.get(k.from) ?? ''} → ${labelOf.get(k.to) ?? ''}`, value: k.value, detail: undefined }
  })()
  const lit = (from: string, to: string, i: number) =>
    hover?.kind === 'link' ? hover.index === i : hover?.kind === 'node' ? hover.id === from || hover.id === to : false
  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-1.5" data-testid="reports-sankey" data-view={view}>
      <div className="flex items-center gap-2">
        <span className="label">Skąd i dokąd</span>
        <span className="flex-1" />
        <Segmented size="sm" value={view} onChange={onView} options={VIEWS} aria-label="Widok przepływów" />
      </div>
      <div ref={box} className="relative overflow-x-auto" onMouseLeave={() => setHover(null)}>
        {!layout || !shown ? (
          <p className="py-2 text-muted" data-testid="reports-sankey-empty">
            {view === 'energy' ? 'Silnik nie wypłacił pensji w tym miesiącu – energia bez przepływów.' : empty}
          </p>
        ) : (
          <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={view === 'energy' ? 'Pensja i energia miesiąca' : 'Przychód i koszty miesiąca'} className="block">
            {layout.links.map((k, i) => (
              <path
                key={`${k.from}>${k.to}`}
                d={k.d}
                fill={lit(k.from, k.to, i) ? COLORS.accent : COLORS.band}
                fillOpacity={lit(k.from, k.to, i) ? 0.45 : 0.22}
                onMouseMove={(e) => setHover({ kind: 'link', index: i, ...at(e) })}
                data-testid="reports-sankey-link"
                data-from={k.from}
                data-to={k.to}
              />
            ))}
            {layout.nodes.map((n) => (
              <rect
                key={n.id}
                x={n.x0}
                y={n.y0}
                width={n.x1 - n.x0}
                height={Math.max(1, n.y1 - n.y0)}
                fill={hover?.kind === 'node' && hover.id === n.id ? COLORS.accent : COLORS.bar}
                onMouseMove={(e) => setHover({ kind: 'node', id: n.id, ...at(e) })}
                data-testid="reports-sankey-node"
                data-id={n.id}
              />
            ))}
            {layout.headings.map((h) => {
              const x = h.column === 0 ? layout.columns[0]! - 6 : layout.columns[h.column]! + layout.bar + 6
              return (
                <text key={`${h.column}:${h.group}`} x={x} y={h.y} textAnchor={h.column === 0 ? 'end' : 'start'} fontSize={10.5} fill={COLORS.muted} className="pointer-events-none" data-testid="reports-sankey-heading">
                  {fitLabel({ name: h.group, amount: zl(h.value) }, headingRoomOf(layout, h))} · <tspan className="num">{zl(h.value)}</tspan>
                </text>
              )
            })}
            {layout.nodes.map((n) => {
              const amount = zl(nodeAmount(n))
              // The PDF's cut (R2 review 2, item 5): the same room, the name cut, the amount whole.
              const name = fitLabel({ name: n.label, amount }, roomOf(layout, n))
              const tone = n.tone === 'up' ? COLORS.up : n.tone === 'down' ? COLORS.down : COLORS.text
              return (
                <text
                  key={n.id}
                  x={n.column === 0 ? n.x0 - 6 : n.x1 + 6}
                  y={(n.y0 + n.y1) / 2 + 4}
                  textAnchor={n.column === 0 ? 'end' : 'start'}
                  fontSize={11}
                  fill={COLORS.text}
                  stroke={COLORS.halo}
                  strokeWidth={3}
                  paintOrder="stroke"
                  strokeLinejoin="round"
                  className="pointer-events-none"
                  data-testid="reports-sankey-label"
                  data-id={n.id}
                >
                  {name} · <tspan className="num" fill={tone}>{amount}</tspan>
                </text>
              )
            })}
          </svg>
        )}
        {tip && hover && layout && shown && (
          <div
            className="pointer-events-none absolute z-10 flex max-w-[280px] flex-col border border-line-strong bg-raised px-2 py-1 text-[11.5px]"
            style={{ left: Math.min(hover.x + 12, layout.width - 290), top: hover.y + 12 }}
            data-testid="reports-sankey-tip"
          >
            <span className="text-fg-strong">{tip.title}</span>
            <span>
              <span className="num">{zl(tip.value)}</span> · <span className="num">{share(tip.value, shown.total)}</span> wszystkich przepływów na wykresie
            </span>
            {tip.detail?.length ? <span className="text-muted">{tip.detail.join(', ')}</span> : null}
          </div>
        )}
      </div>
    </div>
  )
}
