/**
 * The rows of „Na radarze” (UX-30, D106 pkt 5, T548): each radar item its own row – but a container's dues overdue, more
 * than one, in one row at its oldest due's place, as the briefing says them (`lateFees` over the fees' state, never a
 * rule of their own): „Czynsz: 4 terminy bez płatności (sie–lis)”, their sum in the amount, the shields after the last of
 * them in „osłony po”. Only the list – the items themselves (the calendar, the accounts ahead) stay as `radar` gives
 * them. Pure.
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

/** The item with the shields after another one (none – none). */
function shieldsOf(item: RadarItem, from: RadarItem): RadarItem {
  const { shieldsAfter: _, ...rest } = item
  return from.shieldsAfter == null ? rest : { ...rest, shieldsAfter: from.shieldsAfter }
}

export function radarRows(items: readonly RadarItem[], cargo: readonly CargoStatus[], today: string): RadarRow[] {
  const groups = new Map<string, LateFee>()
  for (const f of lateFees(cargo)) if (f.dues.length > 1) for (const s of f.dues) groups.set(dueKey(f.containerId, s.due), f)
  if (!groups.size) return items.map((item) => ({ item }))
  // Each grouped container's row, by its place in the list.
  const at = new Map<string, number>()
  const rows: RadarRow[] = []
  for (const item of items) {
    const f = (item.kind === 'fixed' || item.kind === 'asteroid') && item.overdue && item.ref ? groups.get(dueKey(item.ref, item.date)) : undefined
    if (!f) {
      rows.push({ item })
      continue
    }
    // The items are in their order: the first of the container's is its oldest due – the row stands there; its amount is
    // the sum of them all, so the shields after it are those after the last of them.
    const n = at.get(f.containerId)
    if (n != null) {
      rows[n] = { ...rows[n]!, item: shieldsOf(rows[n]!.item, item) }
      continue
    }
    at.set(f.containerId, rows.length)
    const span = lateFeeSpan(f, today)
    rows.push({ item: { ...item, key: `late:${f.containerId}`, name: `${f.name}: ${span}`, amount: f.amount }, late: f, span })
  }
  return rows
}
