/**
 * Selection of operations on the list (D105): pure functions over the ticked set (`ticked`, D76 – the one set of
 * selected operations) and the anchor a range starts from. `order` = the rows shown, drafts left out, in the sort
 * of the moment – a range is taken in it. A function that changes nothing returns the same `ticked` object.
 */
export type Ticked = Readonly<Record<string, true>>

export interface Selection {
  ticked: Ticked
  /** The row a Shift+click range starts from: the last one clicked or ticked with its box (null – none yet). */
  anchor: string | null
}

export interface Modifiers {
  shift: boolean
  ctrl: boolean
}

/** `ticked` with `ids` added; the same object when all of them are already in. */
function withAdded(ticked: Ticked, ids: readonly string[]): Ticked {
  if (ids.every((id) => ticked[id])) return ticked
  const next: Record<string, true> = { ...ticked }
  for (const id of ids) next[id] = true
  return next
}

/**
 * A click on a row with modifiers. Ctrl toggles the row; Shift (also with Ctrl) adds the range from the anchor to the
 * row – no anchor among the rows shown works like Ctrl; no modifier only moves the anchor.
 */
export function clickTick(state: Selection, order: readonly string[], id: string, { shift, ctrl }: Modifiers): Selection {
  if (shift) {
    const from = state.anchor === null ? -1 : order.indexOf(state.anchor)
    const to = order.indexOf(id)
    if (from >= 0 && to >= 0) {
      const [a, b] = from <= to ? [from, to] : [to, from]
      return { ticked: withAdded(state.ticked, order.slice(a, b + 1)), anchor: state.anchor }
    }
  }
  if (shift || ctrl) {
    const ticked: Record<string, true> = { ...state.ticked }
    if (ticked[id]) delete ticked[id]
    else ticked[id] = true
    return { ticked, anchor: id }
  }
  return { ticked: state.ticked, anchor: id }
}

/**
 * Shift+arrow from the cursor: the cursor moves one row (`dir` 1 = down, -1 = up; at the end it stays) and the row it
 * left and the one it reaches are ticked. Going back does not untick. No cursor among the rows shown – the first row.
 */
export function extendTick(state: Selection, order: readonly string[], cursorId: string | null, dir: 1 | -1): Selection & { cursor: string | null } {
  if (!order.length) return { ...state, cursor: cursorId }
  const at = cursorId === null ? -1 : order.indexOf(cursorId)
  const next = at < 0 ? 0 : Math.min(order.length - 1, Math.max(0, at + dir))
  const cursor = order[next]!
  const ids = at < 0 ? [cursor] : [order[at]!, cursor]
  return { ticked: withAdded(state.ticked, ids), anchor: state.anchor ?? (at < 0 ? cursor : order[at]!), cursor }
}

/** `ticked` without the rows no longer in `order` (a change hid them from the list); the same object when none is. */
export function pruneTicked(ticked: Ticked, order: readonly string[]): Ticked {
  const ids = Object.keys(ticked)
  if (!ids.length) return ticked
  const shown = new Set(order)
  if (ids.every((id) => shown.has(id))) return ticked
  const next: Record<string, true> = {}
  for (const id of ids) if (shown.has(id)) next[id] = true
  return next
}

/** Ctrl+A: every row shown is ticked, the ticked ones stay. */
export function tickAll(ticked: Ticked, order: readonly string[]): Ticked {
  return withAdded(ticked, order)
}
