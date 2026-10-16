// adapted from ICTTJ src/shared/remoteChanges.ts @ 84a8339
/**
 * What to do with a version of a record that arrived from outside (another computer through cloud sync) while
 * this computer has the data folder open. Pure; the renderer store applies the decision.
 */
import { BOOKKEEPING, deepEqual, diffRecords, merge3, pathKey, type FieldChange, type MergeConflict, type Path, type Side } from './merge'

export type RemoteMode = 'merge' | 'ask'

export type RemoteDecision =
  /** Take the incoming version as it is. */
  | { action: 'take' }
  /** Nothing to do (the incoming version is what this computer already has). */
  | { action: 'ignore' }
  /** Local unsaved edits and incoming changes touch different fields: use `merged` and save it. */
  | { action: 'merge'; merged: unknown }
  /** Ask the user (conflicting fields, or "ask" mode). */
  | { action: 'ask'; conflicts: MergeConflict[] }

export interface RemoteInput {
  mode: RemoteMode
  /** The local record has unsaved edits (or edits waiting for a decision). */
  dirty: boolean
  /** Version both sides started from: what this computer had on disk before its edits (undefined = unknown). */
  base: unknown
  /** What this computer has now (null = it does not have the record). */
  mine: unknown | null
  /** The incoming version. */
  theirs: unknown
}

export function decideRemote({ mode, dirty, base, mine, theirs }: RemoteInput): RemoteDecision {
  if (mine == null) return { action: 'take' }
  if (diffRecords(mine, theirs).length === 0) return dirty ? { action: 'ignore' } : { action: 'take' }
  if (!dirty) return mode === 'merge' ? { action: 'take' } : { action: 'ask', conflicts: [] }
  const { merged, conflicts } = merge3(base, mine, theirs)
  if (mode === 'merge' && conflicts.length === 0) return { action: 'merge', merged }
  return { action: 'ask', conflicts }
}

/** Deletion on the other computer: delete here too, or ask (local edits, or "ask" mode). */
export function decideRemoteRemoval({ mode, dirty }: { mode: RemoteMode; dirty: boolean }): 'remove' | 'ask' {
  return !dirty && mode === 'merge' ? 'remove' : 'ask'
}

/** True when two versions differ only in bookkeeping (updatedAt…). */
export const sameContent = (a: unknown, b: unknown) => deepEqual(a, b) || diffRecords(a, b).length === 0

/**
 * "Zaakceptuj nowszą" for a change waiting in the dialog: which side is newer and how to apply it.
 * - an update without local edits: the version saved later (theirs = `updatedAt` on the other computer, mine = the
 *   version on disk here) is taken as it is;
 * - an update with local unsaved edits: merged – fields changed on both sides from the newer side (mine = the time of
 *   the last edit here), the other changes of both sides kept;
 * - a deletion without local edits: the deletion; with local edits only when they come after the deletion arrived
 *   (kept) – an edit made before it may be older or newer than the deletion (its time on the other computer is not
 *   known), so that one stays for the user's decision (null).
 * Equal times: the incoming version (it is what arrived last). Unknown time on either side: null.
 */
export interface NewerInput {
  type: 'update' | 'removal'
  hadLocalEdits: boolean
  /** Last local edit (with local edits) or `updatedAt` of this computer's version (without). */
  mineAt: string | null
  /** `updatedAt` of the incoming version (null for a deletion). */
  theirsAt: string | null
  /** When the change arrived here. */
  receivedAt: string
}

export type NewerChoice = { choice: Side; newer: Side } | { choice: 'merge'; newer: Side } | null

/**
 * The fields changed on both sides, each from its newer side: mine = when this computer changed that field
 * (`mineAt(path)`; null = not changed here since the version on disk – e.g. a difference of an unknown base, or a
 * value merged in earlier –, so the other computer's change is the change), theirs = when the other computer saved
 * its version. null when that time is unknown.
 */
export function newerFields(conflicts: readonly MergeConflict[], theirsAt: string | null, mineAt: (path: Path) => string | null): Record<string, Side> | null {
  const theirs = at(theirsAt)
  if (theirs == null) return conflicts.length ? null : {}
  const out: Record<string, Side> = {}
  for (const c of conflicts) {
    const mine = at(mineAt(c.path))
    out[pathKey(c.path)] = mine != null && mine > theirs ? 'mine' : 'theirs'
  }
  return out
}

/**
 * The fields an edit changed (paths as `diffRecords` / `merge3` give them), skipping subtrees the edit left as the
 * same object – an edit of fi.json touches one corner of the settings, not worth a deep comparison of all.
 */
export function changedPaths(before: unknown, after: unknown, path: Path = []): FieldChange[] {
  if (before === after) return []
  const plain = (v: unknown): v is Record<string, unknown> => v != null && typeof v === 'object' && !Array.isArray(v)
  if (!plain(before) || !plain(after)) return diffRecords(before, after, path)
  const out: FieldChange[] = []
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (path.length === 0 && BOOKKEEPING.has(k)) continue
    if (before[k] !== after[k]) out.push(...changedPaths(before[k], after[k], [...path, k]))
  }
  return out
}

/** Two paths on one line (one is the other or contains it): an edit of one changes the other. */
export const relatedPaths = (a: Path, b: Path): boolean => a.slice(0, Math.min(a.length, b.length)).every((k, i) => k === b[i])

/** An ISO instant in ms; null when missing or unreadable. */
export const isoMs = (iso: string | null | undefined): number | null => {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isFinite(t) ? t : null
}
const at = isoMs

export function newerChoice(x: NewerInput): NewerChoice {
  if (x.type === 'removal') {
    if (!x.hadLocalEdits) return { choice: 'theirs', newer: 'theirs' }
    const mine = at(x.mineAt)
    const received = at(x.receivedAt)
    return mine != null && received != null && mine > received ? { choice: 'mine', newer: 'mine' } : null
  }
  const mine = at(x.mineAt)
  const theirs = at(x.theirsAt)
  if (mine == null || theirs == null) return null
  const newer: Side = mine > theirs ? 'mine' : 'theirs'
  return x.hadLocalEdits ? { choice: 'merge', newer } : { choice: newer, newer }
}
