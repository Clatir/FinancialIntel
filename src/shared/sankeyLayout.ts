/**
 * The geometry of a Sankey (1.17.0, AP-46, T491): own SVG, no library – the columns of a flows' chart
 * (`calc/sankey.ts`) side by side, each node a bar as tall as its money, each link a band as wide as its money. A link
 * past a column (the money outside the month's income and costs, from its source straight to its end) goes through an
 * invisible node of that column, under the column's own nodes – it never crosses them. Pure: the screen and the PDF draw
 * the same layout.
 */
import { nodeValues, type FlowNode, type Flows } from './calc/sankey'

export interface SankeyOptions {
  width: number
  /** The label areas: left of the sources, right of the ends (px). */
  left: number
  right: number
  /** The bands' height of the fullest column (px) – the money's scale. */
  bands?: number
  bar?: number
  /** Between two nodes of a column. */
  pad?: number
  /** A group's heading above its first node („Koperty codzienne”). */
  heading?: number
  top?: number
}

export interface LaidNode extends FlowNode {
  /** Grosze: what flows through it. */
  value: number
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface LaidLink {
  from: string
  to: string
  value: number
  /** The band's width (px). */
  width: number
  /** The band as an SVG path (filled). */
  d: string
}

export interface LaidHeading {
  group: string
  /** Grosze: the group's nodes together. */
  value: number
  column: number
  /** Its baseline. */
  y: number
}

export interface SankeyLayout {
  width: number
  height: number
  /** The drawn nodes (not the invisible ones a link passes a column by). */
  nodes: LaidNode[]
  links: LaidLink[]
  headings: LaidHeading[]
  /** Where each column's bars start (px). */
  columns: number[]
  bar: number
}

const r1 = (v: number) => Math.round(v * 10) / 10

interface Seg {
  from: string
  to: string
  value: number
  /** Which of the flows' links it belongs to. */
  link: number
  sy: number
  ty: number
}

export function sankeyLayout(flows: Flows, o: SankeyOptions): SankeyLayout {
  const bar = o.bar ?? 10
  const pad = o.pad ?? 10
  const headingH = o.heading ?? 16
  const top = o.top ?? 4
  const bands = o.bands ?? 260
  const cols = Math.max(1, ...flows.nodes.map((n) => n.column))
  const columnX = Array.from({ length: cols + 1 }, (_, c) => o.left + (c * (o.width - o.left - o.right - bar)) / cols)
  // The links past a column: through an invisible node of each column between (under the column's own nodes).
  const column = new Map(flows.nodes.map((n) => [n.id, n.column]))
  const vias: Array<{ id: string; column: number }> = []
  const segs: Seg[] = []
  flows.links.forEach((l, i) => {
    const a = column.get(l.from) ?? 0
    const b = column.get(l.to) ?? cols
    let prev = l.from
    for (let c = a + 1; c < b; c++) {
      const id = `via:${i}:${c}`
      vias.push({ id, column: c })
      segs.push({ from: prev, to: id, value: l.value, link: i, sy: 0, ty: 0 })
      prev = id
    }
    segs.push({ from: prev, to: l.to, value: l.value, link: i, sy: 0, ty: 0 })
  })
  const values = nodeValues({ links: segs })
  const valueOf = (id: string) => {
    const v = values.get(id)
    return v ? Math.max(v.in, v.out) : 0
  }
  const byColumn: Array<Array<{ id: string; node?: FlowNode }>> = Array.from({ length: cols + 1 }, () => [])
  for (const n of flows.nodes) byColumn[n.column]!.push({ id: n.id, node: n })
  for (const v of vias) byColumn[v.column]!.push({ id: v.id })
  const fullest = Math.max(0, ...byColumn.map((list) => list.reduce((a, x) => a + valueOf(x.id), 0)))
  const k = fullest > 0 ? bands / fullest : 0
  const pos = new Map<string, { y0: number; y1: number; x0: number; x1: number }>()
  const nodes: LaidNode[] = []
  const headings: LaidHeading[] = []
  let height = 0
  byColumn.forEach((list, c) => {
    let y = top
    let group: string | undefined
    let heading: LaidHeading | null = null
    for (const x of list) {
      const v = valueOf(x.id)
      if (x.node && x.node.group !== group) {
        // A group's heading above its first node; the nodes after a group (of none) – apart by the same gap.
        if (x.node.group) {
          heading = { group: x.node.group, value: 0, column: c, y: y + headingH - 5 }
          headings.push(heading)
        } else heading = null
        y += headingH
        group = x.node.group
      }
      if (heading && x.node?.group === heading.group) heading.value += v
      const x0 = x.node ? columnX[c]! : columnX[c]! + bar / 2
      const p = { x0, x1: x.node ? x0 + bar : x0, y0: y, y1: y + v * k }
      pos.set(x.id, p)
      if (x.node) nodes.push({ ...x.node, value: v, ...p })
      y = p.y1 + pad
    }
    height = Math.max(height, y - pad + top)
  })
  // Each node's bands: out of it in the order of their ends, into it in the order of their sources.
  const yOf = (id: string) => pos.get(id)?.y0 ?? 0
  const outOf = new Map<string, Seg[]>()
  const inOf = new Map<string, Seg[]>()
  for (const s of segs) {
    ;(outOf.get(s.from) ?? outOf.set(s.from, []).get(s.from)!).push(s)
    ;(inOf.get(s.to) ?? inOf.set(s.to, []).get(s.to)!).push(s)
  }
  for (const [id, list] of outOf) {
    let y = yOf(id)
    for (const s of list.sort((a, b) => yOf(a.to) - yOf(b.to) || a.link - b.link)) {
      s.sy = y
      y += s.value * k
    }
  }
  for (const [id, list] of inOf) {
    let y = yOf(id)
    for (const s of list.sort((a, b) => yOf(a.from) - yOf(b.from) || a.link - b.link)) {
      s.ty = y
      y += s.value * k
    }
  }
  const links: LaidLink[] = flows.links.map((l, i) => {
    const parts = segs.filter((s) => s.link === i)
    const w = l.value * k
    const curve = (x0: number, y0: number, x1: number, y1: number) => {
      const xm = r1((x0 + x1) / 2)
      return `C${xm},${r1(y0)} ${xm},${r1(y1)} ${r1(x1)},${r1(y1)}`
    }
    const xs = (s: Seg) => pos.get(s.from)!.x1
    const xt = (s: Seg) => pos.get(s.to)!.x0
    const first = parts[0]!
    const last = parts[parts.length - 1]!
    const topEdge = parts.map((s) => curve(xs(s), s.sy, xt(s), s.ty)).join(' ')
    const bottomEdge = [...parts]
      .reverse()
      .map((s) => curve(xt(s), s.ty + w, xs(s), s.sy + w))
      .join(' ')
    const d = `M${r1(xs(first))},${r1(first.sy)} ${topEdge} L${r1(xt(last))},${r1(last.ty + w)} ${bottomEdge} Z`
    return { from: l.from, to: l.to, value: l.value, width: w, d }
  })
  return { width: o.width, height: Math.ceil(height), nodes, links, headings, columns: columnX, bar }
}

/** A text's width at the chart's 11 px (an estimate – the label areas and the cut of a long label). */
export const textWidth = (text: string): number => text.length * 6.1

/** A label cut to `px` with „…” (a long one never runs out of the chart). */
export function fitText(text: string, px: number): string {
  if (textWidth(text) <= px) return text
  const n = Math.max(1, Math.floor(px / 6.1) - 1)
  return `${text.slice(0, n).trimEnd()}…`
}

export interface SankeySvgOptions {
  /** A node's label with its amount („Jedzenie · 1 520,00 zł”). */
  label: (n: LaidNode) => string
  heading: (h: LaidHeading) => string
  colors: { band: string; bandOpacity: number; bar: string; text: string; muted: string; up: string; down: string; halo: string }
}

const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/**
 * The layout as a self-contained SVG (the PDF of the debriefing – script-free, no fonts loaded): the bands, the bars,
 * the labels (the sources' left of them, the rest right), the groups' headings.
 */
export function sankeySvg(l: SankeyLayout, o: SankeySvgOptions): string {
  const c = o.colors
  const last = l.columns.length - 1
  const parts: string[] = []
  for (const k of l.links) parts.push(`<path d="${k.d}" fill="${c.band}" fill-opacity="${c.bandOpacity}"/>`)
  for (const n of l.nodes) parts.push(`<rect x="${r1(n.x0)}" y="${r1(n.y0)}" width="${r1(n.x1 - n.x0)}" height="${r1(Math.max(1, n.y1 - n.y0))}" fill="${c.bar}"/>`)
  const text = (x: number, y: number, s: string, anchor: string, fill: string, size = 11) =>
    `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" fill="${fill}" font-size="${size}" stroke="${c.halo}" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${esc(s)}</text>`
  for (const h of l.headings) parts.push(h.column === 0 ? text(l.columns[0]! - 6, h.y, o.heading(h), 'end', c.muted, 10) : text(l.columns[h.column]! + l.bar + 6, h.y, o.heading(h), 'start', c.muted, 10))
  for (const n of l.nodes) {
    const y = (n.y0 + n.y1) / 2 + 4
    const fill = n.tone === 'up' ? c.up : n.tone === 'down' ? c.down : c.text
    if (n.column === 0) parts.push(text(n.x0 - 6, y, fitText(o.label(n), l.columns[0]! - 10), 'end', fill))
    else parts.push(text(n.x1 + 6, y, fitText(o.label(n), n.column === last ? l.width - n.x1 - 10 : l.columns[n.column + 1]! - n.x1 - 10), 'start', fill))
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.width}" height="${l.height}" viewBox="0 0 ${l.width} ${l.height}" font-family="Segoe UI, Arial, sans-serif">${parts.join('')}</svg>`
}
