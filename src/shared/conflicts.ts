// adapted from ICTTJ src/shared/conflicts.ts @ 84a8339
/**
 * Sync conflicts (cloud copies, duplicate ids – `ConflictEntry` from main): "Zachowaj nowsze" for chosen
 * conflicts or all of them. Pure; the renderer resolves them one by one through `resolveConflict`.
 */
import type { ConflictEntry, ConflictSide } from './api'
import { isoMs } from './remoteChanges'

export type Keep = 'canonical' | 'copy'

const stamp = (s: ConflictSide): number | null => isoMs(s.updatedAt)

/**
 * Which side was changed later: by the records' `updatedAt` when both have it, by the file times when neither has it
 * (one clock for both – a record's stamp is never weighed against another file's time; a copy without a stamp may be
 * an old file the sync tool has just written, so then: equal); an unreadable side never wins. > 0 = `a`.
 */
export function compareSides(a: ConflictSide, b: ConflictSide): number {
  if (a.record == null || b.record == null) return a.record == null ? (b.record == null ? 0 : -1) : 1
  const ta = stamp(a)
  const tb = stamp(b)
  if (ta != null && tb != null) return Math.sign(ta - tb)
  if (ta != null || tb != null) return 0
  return Math.sign((a.mtimeMs || 0) - (b.mtimeMs || 0))
}

/** The newer side of one conflict; null = equally new (the bulk action keeps the original then). */
export function newerSide(c: ConflictEntry): Keep | null {
  const d = compareSides(c.copy, c.canonical)
  return d > 0 ? 'copy' : d < 0 ? 'canonical' : null
}

/**
 * Resolutions keeping the newest version, in the order to apply them. Conflicts of one file (several copies of the
 * same original) are decided together (`group`): the newest of the original and the chosen copies wins – when it is
 * a copy, its conflict goes first ("keep the copy" rewrites the original) and the other chosen copies are dropped
 * after it; if that first step fails, the rest of the group must be skipped. A conflict with an unreadable side (a
 * missing original, a broken or newer-format copy) is never decided here – `skipped`, for the user. Ids not in
 * `conflicts` are left out.
 */
export function newestResolutions(conflicts: readonly ConflictEntry[], ids: Iterable<string>): { resolutions: Array<{ id: string; keep: Keep; group: string }>; skipped: string[] } {
  const chosen = new Set(ids)
  const groups = new Map<string, ConflictEntry[]>()
  const skipped: string[] = []
  for (const c of conflicts) {
    if (!chosen.has(c.id)) continue
    if (c.canonical.record == null || c.copy.record == null) {
      skipped.push(c.id)
      continue
    }
    const list = groups.get(c.canonical.relPath)
    if (list) list.push(c)
    else groups.set(c.canonical.relPath, [c])
  }
  const out: Array<{ id: string; keep: Keep; group: string }> = []
  for (const [group, list] of groups) {
    let best: ConflictEntry | null = null
    let bestSide = list[0]!.canonical
    for (const c of list) {
      if (compareSides(c.copy, bestSide) > 0) {
        best = c
        bestSide = c.copy
      }
    }
    if (best) out.push({ id: best.id, keep: 'copy', group })
    for (const c of list) if (c !== best) out.push({ id: c.id, keep: 'canonical', group })
  }
  return { resolutions: out, skipped }
}
