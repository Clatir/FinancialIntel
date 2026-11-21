/**
 * The rows of „Na radarze” (UX-30, D106 pkt 5, T548): each radar item its own row – but a container's dues overdue, more
 * than one, in one row at its oldest due's place, as the briefing says them (`lateFees` over the fees' state, never a
 * rule of their own): „Czynsz: 4 terminy bez płatności (sie–lis)”, their sum in the amount. „osłony po” stays a running
 * sum of the rows as the list shows them (T551): the row's dues all go at its place, so it and the rows after it, up to
 * its later dues' days, see them gone. Only the list – the items themselves (the calendar, the accounts ahead) stay as
 * `radar` gives them. Pure.
 */
import { lateFees, lateFeeSpan, type LateFee } from '@shared/calc/briefing'
import type { CargoStatus } from '@shared/calc/cargoStatus'
import type { RadarItem } from '@shared/calc/radar'

export interface RadarRow {
  item: RadarItem
  /** The container's overdue dues this one row says (more than one). */
  late?: LateFee
  /** What the row says of them: „4 terminy bez płatności (sie–lis)” (`item.name` – with the container's name before it). */
  span?: string
}

/** A due of a fee on the radar: its container and its day (the items of the fees' dues are on their days). */
const dueKey = (containerId: string, due: string) => `${containerId}|${due}`

/** A grouped row's later due: its row and its place among the items. */
interface Later {
  row: number
  index: number
}

export function radarRows(items: readonly RadarItem[], cargo: readonly CargoStatus[], today: string): RadarRow[] {
  const groups = new Map<string, LateFee>()
  for (const f of lateFees(cargo)) if (f.dues.length > 1) for (const s of f.dues) groups.set(dueKey(f.containerId, s.due), f)
  if (!groups.size) return items.map((item) => ({ item }))
  // Each grouped container's row, by its place in the list.
  const at = new Map<string, number>()
  const rows: RadarRow[] = []
  // Each row's first item (its place among the items); the grouped rows' later dues.
  const first: number[] = []
  const later: Later[] = []
  items.forEach((item, index) => {
    const f = (item.kind === 'fixed' || item.kind === 'asteroid') && item.overdue && item.ref ? groups.get(dueKey(item.ref, item.date)) : undefined
    if (!f) {
      first.push(index)
      rows.push({ item })
      return
    }
    // The items are in their order: the first of the container's is its oldest due – the row stands there, its amount the
    // sum of them all.
    const n = at.get(f.containerId)
    if (n != null) {
      later.push({ row: n, index })
      return
    }
    at.set(f.containerId, rows.length)
    first.push(index)
    const span = lateFeeSpan(f, today)
    rows.push({ item: { ...item, key: `late:${f.containerId}`, name: `${f.name}: ${span}`, amount: f.amount }, late: f, span })
  })
  return later.length ? withShields(rows, items, first, later) : rows
}

/**
 * „osłony po” of the rows (T551) – a running sum, as the single rows have it: a row's shields are the line's after its
 * first item, with what the grouped rows' later dues moved them by when those rows stand at or above it and the dues come
 * after it. What a due moves them by is what the line says of it (its shields after, less those before it); a due the
 * line does not count – the fees, the shields never see them (F27) – moves nothing, and a row none of whose items the
 * line counts says none. Not known (no shields before the due) – none.
 */
function withShields(rows: RadarRow[], items: readonly RadarItem[], first: readonly number[], later: readonly Later[]): RadarRow[] {
  // The shields after each item as the line has them: the last item up to it that moves them (none yet – undefined).
  const line: Array<number | undefined> = []
  let shields: number | undefined
  for (const i of items) line.push((shields = i.shieldsAfter ?? shields))
  const moves = later.map(({ row, index }) => {
    const after = items[index]!.shieldsAfter
    const before = index > 0 ? line[index - 1] : undefined
    return { row, index, counted: after != null, by: after == null ? 0 : before == null ? null : after - before }
  })
  return rows.map((r, n) => {
    const a = first[n]!
    const own = moves.filter((m) => m.row === n)
    if (items[a]!.shieldsAfter == null && !own.some((m) => m.counted)) return r.item.shieldsAfter == null ? r : { ...r, item: bare(r.item) }
    let value = line[a]
    for (const m of moves) if (m.row <= n && m.index > a) value = value == null || m.by == null ? undefined : value + m.by
    if (value === r.item.shieldsAfter) return r
    return { ...r, item: value == null ? bare(r.item) : { ...r.item, shieldsAfter: value } }
  })
}

/** The item without the shields after it. */
function bare(item: RadarItem): RadarItem {
  const { shieldsAfter: _, ...rest } = item
  return rest
}
