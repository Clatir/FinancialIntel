// adapted from ICTTJ src/renderer/store/journal.ts @ 84a8339
import { create } from 'zustand'
import { CONFLICT_COPY_MESSAGE, type AppInfo, type ChangeSet, type ConflictEntry, type FlushResult, type FolderStatus, type OpenFolderResult, type Problem, type RecordEntry, type Snapshot } from '@shared/api'
import { COLLECTIONS, type Collection } from '@shared/paths'
import type { RecordTypes } from '@shared/records'
import type { SettingsFile } from '@shared/schema'
import { chooser, deepEqual, merge3, pathKey, sameContentAs, type Path, type Side } from '@shared/merge'
import { changedPaths, decideRemote, decideRemoteRemoval, isoMs, newerChoice, newerFields, relatedPaths, type RemoteMode } from '@shared/remoteChanges'
import { api, errorMessage, isNewerFileError } from '../lib/api'
import { setRemoteDialog, useRemote, type PendingRemote } from './remote'
import { commitActiveField, toast } from './ui'

type EntryMap<C extends Collection> = Record<string, RecordEntry<RecordTypes[C]>>
type AnyMap = Record<string, RecordEntry<RecordTypes[Collection]>>
export type RecordMaps = { [C in Collection]: EntryMap<C> }

export interface SaveState {
  pending: number
  lastSavedAt: string | null
  error: string | null
}

interface DataState {
  phase: 'boot' | 'setup' | 'ready'
  setupMessage: string | null
  setupDir: string | null
  /** Why the folder did not open (B53): the setup screen's buttons by it, never by the message. */
  setupProblem: SetupProblem | null
  /** Another folder opening from Settings (B31): nothing is edited or written until it opens or fails. */
  switching: boolean
  /** Changes being written (the window closing, Ctrl+S, a step that needs them on the disk – T301): no write starts in the background. */
  backgroundHeld: boolean
  /** When the folder opened in this window, and when a change from another computer came last (B33: the first
   * freeze of the game's days waits for them). */
  openedAt: number
  externalAt: number
  /** The newest record another computer wrote (F21): which one and when – kept as changes come, never by a scan. */
  lastRemote: { machine: string; at: string } | null
  appInfo: AppInfo | null
  /** fi.json: the folder's settings. */
  fi: SettingsFile | null
  records: RecordMaps
  problems: Problem[]
  conflicts: ConflictEntry[]
  status: FolderStatus | null
  loadMs: number
  save: SaveState
  /** Records created in the UI that were never edited (not written to disk yet). */
  drafts: Record<string, true>
}

const SAVE_DELAY_DEFAULT = 400
/** Even while typing continuously, a change is written at most this long after it was made. */
const SAVE_MAX_WAIT_DEFAULT = 2000
/** E2E hook: a longer autosave delay (window.__FI_SAVE_DELAY__) keeps edits unsaved long enough to test merges. */
const testDelay = () => (globalThis as { __FI_SAVE_DELAY__?: number }).__FI_SAVE_DELAY__
const saveDelay = () => testDelay() ?? SAVE_DELAY_DEFAULT
const saveMaxWait = () => Math.max(testDelay() ?? 0, SAVE_MAX_WAIT_DEFAULT)
/** A failed save (file locked by OneDrive, pendrive briefly gone…) is retried with backoff. */
const RETRY_FIRST = 2000
const RETRY_MAX = 60_000

const timers = new Map<string, ReturnType<typeof setTimeout>>()
const versions = new Map<string, number>()
const dirty = new Map<string, { collection: Collection | 'fi'; id: string }>()
const inFlight = new Map<string, Promise<void>>()
const firstDirtyAt = new Map<string, number>()
const retryDelay = new Map<string, number>()
/** Keys whose last save attempt failed, with the error message. */
const failed = new Map<string, string>()
/**
 * Keys this version cannot write (B67): a newer version of the app wrote the record's file. No retry loop – the change
 * stays in memory with its message; another edit or „ponów” tries once more.
 */
const newer = new Set<string>()
/**
 * Version of a dirty record as it is on disk (before the local edits, or the last version this computer wrote):
 * the base of a three-way merge when the same record changes on another computer.
 */
const bases = new Map<string, unknown>()
/**
 * Edits made on this computer since the version on disk ("Zaakceptuj nowszą"): when each field changed (any
 * edit, background fills too – they changed that field) and the user's last edit (not background fills) for deletions.
 */
const fieldEdits = new Map<string, Map<string, { path: Path; at: string }>>()
const userEditedAt = new Map<string, string>()

function stampEdits(key: string, before: unknown, after: unknown, background: boolean): void {
  const changes = changedPaths(before, after)
  if (!changes.length) return
  const at = new Date().toISOString()
  let fields = fieldEdits.get(key)
  if (!fields) fieldEdits.set(key, (fields = new Map()))
  for (const c of changes) fields.set(pathKey(c.path), { path: c.path, at })
  if (!background) userEditedAt.set(key, at)
}

function forgetEdits(key: string): void {
  fieldEdits.delete(key)
  userEditedAt.delete(key)
}

/** When this computer last changed `path` (or a field on its line); null = never since the version on disk. */
function fieldEditTime(key: string, path: Path): string | null {
  let last: string | null = null
  for (const e of fieldEdits.get(key)?.values() ?? []) if (relatedPaths(e.path, path) && (!last || e.at > last)) last = e.at
  return last
}

const lastEditTime = (key: string): string | null => fieldEditTime(key, [])

const saveError = (): string | null => [...failed.values()].at(-1) ?? null

function forget(key: string): void {
  const t = timers.get(key)
  if (t) clearTimeout(t)
  timers.delete(key)
  dirty.delete(key)
  firstDirtyAt.delete(key)
  retryDelay.delete(key)
  failed.delete(key)
  newer.delete(key)
  bases.delete(key)
  forgetEdits(key)
}

const keyOf = (collection: Collection | 'fi', id: string) => `${collection}:${id}`
const FI_KEY = keyOf('fi', 'fi')
const emptyMaps = (): RecordMaps => Object.fromEntries(COLLECTIONS.map((c) => [c, {}])) as unknown as RecordMaps

function toMap<C extends Collection>(entries: RecordEntry<RecordTypes[C]>[]): EntryMap<C> {
  const out: EntryMap<C> = {}
  for (const e of entries) out[e.record.id] = e
  return out
}

export const useData = create<DataState>(() => ({
  phase: 'boot',
  setupMessage: null,
  setupDir: null,
  setupProblem: null,
  switching: false,
  backgroundHeld: false,
  openedAt: 0,
  externalAt: 0,
  lastRemote: null,
  appInfo: null,
  fi: null,
  records: emptyMaps(),
  problems: [],
  conflicts: [],
  status: null,
  loadMs: 0,
  save: { pending: 0, lastSavedAt: null, error: null },
  drafts: {}
}))

const set = useData.setState
const get = useData.getState
/** The records of one collection as a loosely typed map (the store is generic over collections). */
const mapOf = (s: DataState, c: Collection): AnyMap => s.records[c] as AnyMap

/** The records of a map as a list: one list per map object, shared by every screen and the engine (W5, W13). */
const lists = new WeakMap<object, unknown[]>()
export function listOf<T>(map: Record<string, RecordEntry<T>>): T[] {
  let list = lists.get(map) as T[] | undefined
  if (!list) lists.set(map, (list = Object.values(map).map((e) => e.record)))
  return list
}

/** The same entry but its save stamps: the path, the read-only mark and the content (W3). */
const sameEntry = (a: RecordEntry<unknown>, b: RecordEntry<unknown>) => a.relPath === b.relPath && a.readOnly === b.readOnly && sameContentAs(a.record, b.record)

/**
 * The version on the disk of what memory has (a save's stamps only – W3): put in place, no new map, so the screens and
 * the engine do not count everything again; the map's list is built anew when asked. False = it differs.
 */
function stampInPlace(map: AnyMap, id: string, entry: RecordEntry<RecordTypes[Collection]>): boolean {
  const latest = map[id]
  if (!latest || !sameEntry(latest, entry)) return false
  map[id] = entry
  lists.delete(map)
  return true
}

const STAMPS = ['updatedAt', 'updatedBy', 'schemaVersion'] as const

/** `next` with the settings' parts equal to `prev`'s as `prev`'s objects: memories keyed on them stay (W10). */
function shareSettings(prev: SettingsFile | null, next: SettingsFile): SettingsFile {
  if (!prev) return next
  const before = prev.settings as Record<string, unknown>
  const settings = { ...next.settings } as Record<string, unknown>
  for (const k of Object.keys(settings)) if (k in before && deepEqual(before[k], settings[k])) settings[k] = before[k]
  return { ...next, settings: settings as SettingsFile['settings'] }
}

/** Settings from the disk: the same content – memory's object with the new stamps (nothing counted again); else shared parts. */
function adoptSaved(prev: SettingsFile | null, saved: SettingsFile): SettingsFile | null {
  if (prev && sameContentAs(prev, saved)) {
    for (const k of STAMPS) (prev as Record<string, unknown>)[k] = saved[k]
    return null
  }
  return shareSettings(prev, saved)
}
/** State patch replacing the map of one collection. */
const withMap = (s: DataState, c: Collection, map: AnyMap): Pick<DataState, 'records'> => ({ records: { ...s.records, [c]: map } as RecordMaps })

function bumpPending(delta: number, patch: Partial<SaveState> = {}): void {
  set((s) => ({ save: { ...s.save, pending: Math.max(0, s.save.pending + delta), ...patch } }))
}

type Stamped = { updatedAt?: string; updatedBy?: string }

/** `cur` or a newer record written by another computer of `records` (F21). */
function laterRemote(cur: DataState['lastRemote'], records: Iterable<Stamped>): DataState['lastRemote'] {
  const me = get().appInfo?.machineName
  let out = cur
  for (const r of records) if (r.updatedBy && r.updatedBy !== me && r.updatedAt && (!out || r.updatedAt > out.at)) out = { machine: r.updatedBy, at: r.updatedAt }
  return out
}

function newestRemote(snapshot: Snapshot): DataState['lastRemote'] {
  let out = laterRemote(null, [snapshot.fi as Stamped])
  for (const list of Object.values(snapshot.records)) out = laterRemote(out, list.map((e) => e.record as Stamped))
  return out
}

export function applySnapshot(snapshot: Snapshot): void {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
  dirty.clear()
  firstDirtyAt.clear()
  retryDelay.clear()
  failed.clear()
  newer.clear()
  bases.clear()
  fieldEdits.clear()
  userEditedAt.clear()
  useRemote.setState({ pending: [], open: false })
  // A folder shown anew: the hold of a close that did not come is over (T301).
  clearTimeout(closeHold)
  closeHold = undefined
  set({
    backgroundHeld: holds > 0,
    phase: 'ready',
    setupMessage: null,
    setupDir: null,
    setupProblem: null,
    openedAt: Date.now(),
    externalAt: 0,
    lastRemote: newestRemote(snapshot),
    fi: snapshot.fi,
    records: Object.fromEntries(COLLECTIONS.map((c) => [c, toMap(snapshot.records[c] ?? [])])) as unknown as RecordMaps,
    problems: snapshot.problems,
    conflicts: snapshot.conflicts,
    status: snapshot.status,
    loadMs: snapshot.loadMs,
    drafts: {},
    save: { pending: 0, lastSavedAt: null, error: null }
  })
  // Before any write of this folder leaves the window (B31): main takes writes only for the folder shown.
  if (snapshot.generation != null) void api.folderShown(snapshot.generation).catch(() => undefined)
}

const pendingFor = (key: string) => useRemote.getState().pending.find((p) => p.key === key)

/**
 * Apply changes coming from disk.
 * - Own actions (origin 'local') and anything without local unsaved edits in "merge" mode: taken as they are.
 * - From outside (another computer): a record with local unsaved edits is merged field by field (shared/merge.ts);
 *   fields changed on both sides – or every change in "ask" mode – wait for a decision in the dialog
 *   (store/remote.ts), and the record is not saved until then. Nothing is overwritten silently.
 */
export function applyChange(change: ChangeSet): void {
  const external = change.origin === 'external'
  const mode: RemoteMode = get().fi?.settings.sync.remoteChanges ?? 'merge'
  const queued: PendingRemote[] = []
  // Pending removals answered by the record itself: moved by a date change on another computer – its old file went
  // before the new one arrived.
  const returned: string[] = []
  const toSave: Array<{ collection: Collection | 'fi'; id: string; from: string | null }> = []
  const now = new Date().toISOString()
  // The waiting changes looked up by key (W25: a large batch arriving while many wait).
  const waiting = new Map(useRemote.getState().pending.map((p) => [p.key, p]))
  const queue = (item: Omit<PendingRemote, 'receivedAt' | 'hadLocalEdits'>, localEdits: boolean) => {
    const prev = waiting.get(item.key)
    queued.push({ ...item, base: prev ? prev.base : item.base, hadLocalEdits: localEdits || !!prev?.hadLocalEdits, receivedAt: now })
  }
  set((s) => {
    const next: Partial<DataState> = {
      problems: change.problems,
      conflicts: change.conflicts,
      status: change.status
    }
    // Another computer's records arriving (B33): the game's first freeze waits until they stop for a while. A change
    // of the presence alone is none.
    if (external && (change.upserts.length || change.removals.length || change.fi)) next.externalAt = Date.now()
    const remote = laterRemote(s.lastRemote, [...change.upserts.map((u) => u.entry.record as Stamped), ...(change.fi ? [change.fi as Stamped] : [])])
    if (remote !== s.lastRemote) next.lastRemote = remote
    const maps: Partial<Record<Collection, AnyMap>> = {}
    const mapFor = (c: Collection) => (maps[c] ??= { ...mapOf(s, c) })
    for (const { collection, entry } of change.upserts) {
      const id = entry.record.id
      const key = keyOf(collection, id)
      const local = mapOf(s, collection)[id]
      if (!external) {
        // This computer's own write as memory has it (its stamps only): in place, nothing counted again (W3).
        if (!dirty.has(key) && !stampInPlace(maps[collection] ?? mapOf(s, collection), id, entry)) mapFor(collection)[id] = entry
        continue
      }
      const pending = waiting.get(key)
      const localEdits = dirty.has(key)
      const busy = localEdits || !!pending
      const base = pending ? pending.base : (bases.get(key) ?? (busy ? undefined : local?.record))
      const d = decideRemote({ mode, dirty: busy, base, mine: local?.record ?? null, theirs: entry.record })
      if (pending?.type === 'removal' && d.action !== 'ask') returned.push(key)
      if (d.action === 'take') mapFor(collection)[id] = entry
      else if (d.action === 'ignore') {
        if (!pending) bases.set(key, entry.record)
      } else if (d.action === 'merge') {
        mapFor(collection)[id] = { ...entry, record: d.merged as RecordTypes[Collection] }
        bases.set(key, entry.record)
        toSave.push({ collection, id, from: entry.record.updatedBy ?? null })
      } else queue({ key, collection, id, type: 'update', base, theirs: entry }, localEdits)
    }
    for (const { collection, id } of change.removals) {
      const key = keyOf(collection, id)
      const local = mapOf(s, collection)[id]
      if (!external) {
        // Gone from memory already (deleted here): no new map (W3).
        if (!dirty.has(key) && id in (maps[collection] ?? mapOf(s, collection))) delete mapFor(collection)[id]
        continue
      }
      if (!local) continue
      const localEdits = dirty.has(key)
      if (decideRemoteRemoval({ mode, dirty: localEdits || waiting.has(key) }) === 'remove') delete mapFor(collection)[id]
      else queue({ key, collection, id, type: 'removal', base: bases.get(key) ?? local.record, theirs: null }, localEdits)
    }
    if (Object.keys(maps).length) next.records = { ...s.records, ...maps } as RecordMaps
    if (change.fi) {
      const key = FI_KEY
      if (!external) {
        if (!dirty.has(key)) {
          const fi = adoptSaved(s.fi, change.fi)
          if (fi) next.fi = fi
        }
      } else if (s.fi) {
        const pending = waiting.get(key)
        const localEdits = dirty.has(key)
        const busy = localEdits || !!pending
        const base = pending ? pending.base : (bases.get(key) ?? (busy ? undefined : s.fi))
        const d = decideRemote({ mode, dirty: busy, base, mine: s.fi, theirs: change.fi })
        if (d.action === 'take') next.fi = shareSettings(s.fi, change.fi)
        else if (d.action === 'ignore') {
          if (!pending) bases.set(key, change.fi)
        } else if (d.action === 'merge') {
          next.fi = shareSettings(s.fi, d.merged as SettingsFile)
          bases.set(key, change.fi)
          toSave.push({ collection: 'fi', id: 'fi', from: change.fi.updatedBy ?? null })
        } else queue({ key, collection: 'fi', id: 'fi', type: 'update', base, theirs: change.fi }, localEdits)
      } else next.fi = change.fi
    }
    return next
  })
  for (const t of toSave) scheduleSave(t.collection, t.id)
  if (toSave.length) {
    const from = toSave.find((t) => t.from)?.from
    toast(`Scalono zmiany${from ? ` z komputera ${from}` : ' z dysku'} z Twoimi niezapisanymi (${toSave.length}).`, 'success', 4500)
  }
  if (queued.length || returned.length) {
    const replaced = new Set([...queued.map((q) => q.key), ...returned])
    useRemote.setState((r) => {
      const pending = [...r.pending.filter((p) => !replaced.has(p.key)), ...queued]
      return { pending, open: queued.length > 0 || (r.open && pending.length > 0) }
    })
  }
}

/** A decision about a change from another computer (`resolveRemoteMany`). */
export interface RemoteDecision {
  key: string
  choice: 'merge' | Side
  /** Fields changed on both sides: which side each takes (default mine). */
  fields?: Record<string, Side>
}

/**
 * Decide about a change from another computer: merge (fields changed on both sides as `fieldChoices` say, default
 * mine), keep this computer's version (written over theirs; theirs stays in the history) or take theirs (local
 * unsaved edits go to the history).
 */
export function resolveRemote(key: string, choice: 'merge' | Side, fieldChoices: Record<string, Side> = {}): void {
  resolveRemoteMany([{ key, choice, fields: fieldChoices }])
}

/**
 * Several decisions at once (W25: „Zastosuj” and „Zaakceptuj nowsze” over a large batch from the other computer): the
 * waiting list changed once, one new map per collection, the saves scheduled after it.
 */
export function resolveRemoteMany(decisions: readonly RemoteDecision[]): void {
  const waiting = new Map(useRemote.getState().pending.map((p) => [p.key, p]))
  const items: Array<{ item: PendingRemote; choice: 'merge' | Side; fields: Record<string, Side> }> = []
  for (const d of decisions) {
    const item = waiting.get(d.key)
    if (!item) continue
    // Once per change: a second decision about it finds nothing waiting (as one by one).
    waiting.delete(d.key)
    items.push({ item, choice: d.choice, fields: d.fields ?? {} })
  }
  if (!items.length) return
  const done = new Set(items.map((x) => x.item.key))
  useRemote.setState((r) => {
    const pending = r.pending.filter((p) => !done.has(p.key))
    return { pending, open: r.open && pending.length > 0 }
  })
  const entries = new Map<Collection, Map<string, RecordEntry<RecordTypes[Collection]> | null>>()
  const setEntry = (c: Collection, id: string, entry: RecordEntry<RecordTypes[Collection]> | null) => {
    let changes = entries.get(c)
    if (!changes) entries.set(c, (changes = new Map()))
    changes.set(id, entry)
  }
  const saves = new Map<Collection, string[]>()
  const save = (c: Collection, id: string) => {
    const ids = saves.get(c)
    if (ids) ids.push(id)
    else saves.set(c, [id])
  }
  for (const { item, choice, fields } of items) {
    const key = item.key
    if (item.collection === 'fi') {
      resolveSettings(item, choice, fields)
      continue
    }
    const c = item.collection
    const local = mapOf(get(), c)[item.id]
    if (item.type === 'removal') {
      if (choice === 'theirs') {
        if (dirty.has(key) && local) void api.historyKeep(c, local.record, 'discarded').catch(() => undefined)
        forget(key)
        setEntry(c, item.id, null)
        // Mine was written after the deletion came (B48): the file is back on the disk – deleted again.
        if (item.savedAfter) void api.deleteRecord(c, item.id).catch((e) => toast(errorMessage(e), 'error', 8000))
      } else if (local) save(c, item.id)
      continue
    }
    const theirs = item.theirs as RecordEntry<RecordTypes[Collection]>
    if (choice === 'theirs' || !local) {
      if (dirty.has(key) && local) void api.historyKeep(c, local.record, 'discarded').catch(() => undefined)
      forget(key)
      setEntry(c, item.id, theirs)
      // Mine was written after theirs came (B48): theirs written back.
      if (item.savedAfter) save(c, item.id)
      continue
    }
    bases.set(key, theirs.record)
    const record = choice === 'mine' ? local.record : merge3(item.base, local.record, theirs.record, chooser(fields)).merged
    setEntry(c, item.id, { ...theirs, record })
    save(c, item.id)
  }
  if (entries.size)
    set((s) => {
      let records = s.records
      for (const [c, changes] of entries) {
        const map = { ...mapOf(s, c) }
        for (const [id, entry] of changes) {
          if (entry) map[id] = entry
          else delete map[id]
        }
        records = { ...records, [c]: map } as RecordMaps
      }
      return { records }
    })
  // Many of one collection with one call (W1), one as before.
  for (const [c, ids] of saves) {
    if (ids.length > 1) saveBatch(c, ids)
    else scheduleSave(c, ids[0]!, 0)
  }
}

/** A decision about the settings (`fi.json`) from another computer. */
function resolveSettings(item: PendingRemote, choice: 'merge' | Side, fieldChoices: Record<string, Side>): void {
  const key = item.key
  const mine = get().fi
  const theirs = item.theirs as SettingsFile
  if (!mine) return
  if (choice === 'theirs') {
    if (dirty.has(key)) void api.historyKeep('fi', mine, 'discarded').catch(() => undefined)
    forget(key)
    set({ fi: theirs })
    // Mine was written after theirs came (B48): theirs written back.
    if (item.savedAfter) scheduleSave('fi', 'fi', 0)
    return
  }
  const fi = choice === 'mine' ? mine : merge3(item.base, mine, theirs, chooser(fieldChoices)).merged
  bases.set(key, theirs)
  set({ fi })
  scheduleSave('fi', 'fi', 0)
}

/**
 * "Zaakceptuj nowszą" for a waiting change, decided now (edits made while the dialog waits count): without
 * local edits the version saved later as it is; with them a merge, each field changed on both sides from its newer
 * side; a deletion without local edits – delete, with the user's edit after it arrived – keep. `reason` when it stays
 * for the user: a deletion over an edit made before it arrived, or a time unknown.
 */
export type NewerPlan =
  | { choice: 'merge' | Side; fields: Record<string, Side>; newer: Side | 'both' }
  | { choice: null; reason: 'removal' | 'time' }

export function newerOf(item: PendingRemote): NewerPlan {
  const s = get()
  const mine = item.collection === 'fi' ? s.fi : (mapOf(s, item.collection)[item.id]?.record ?? null)
  const theirs = !item.theirs ? null : item.collection === 'fi' ? (item.theirs as SettingsFile) : (item.theirs as RecordEntry<RecordTypes[Collection]>).record
  const theirsAt = theirs?.updatedAt ?? null
  if (item.type === 'removal') {
    const n = newerChoice({ type: 'removal', hadLocalEdits: userEditedAt.has(item.key), mineAt: userEditedAt.get(item.key) ?? null, theirsAt: null, receivedAt: item.receivedAt })
    return n ? { choice: n.newer, fields: {}, newer: n.newer } : { choice: null, reason: 'removal' }
  }
  if (!mine || !theirs) return { choice: 'theirs', fields: {}, newer: 'theirs' }
  if (!(item.hadLocalEdits || dirty.has(item.key))) {
    const n = newerChoice({ type: 'update', hadLocalEdits: false, mineAt: (mine as { updatedAt?: string }).updatedAt ?? null, theirsAt, receivedAt: item.receivedAt })
    return n ? { choice: n.newer, fields: {}, newer: n.newer } : { choice: null, reason: 'time' }
  }
  // Local edits: a merge, each field changed on both sides from its newer side (not changed here = theirs).
  const fields = newerFields(merge3(item.base, mine, theirs).conflicts, theirsAt, (path) => fieldEditTime(item.key, path))
  if (!fields) return { choice: null, reason: 'time' }
  const sides = new Set(Object.values(fields))
  const last = isoMs(lastEditTime(item.key))
  const overall: Side = last != null && last > (isoMs(theirsAt) ?? Infinity) ? 'mine' : 'theirs'
  return { choice: 'merge', fields, newer: sides.size > 1 ? 'both' : ([...sides][0] ?? overall) }
}

/** "Zaakceptuj nowszą" for the given waiting changes (`newerOf`). Returns how many were decided and how many stayed. */
export function acceptNewer(keys: readonly string[]): { decided: number; left: number } {
  const waiting = new Map(useRemote.getState().pending.map((p) => [p.key, p]))
  const decisions: RemoteDecision[] = []
  let left = 0
  for (const key of keys) {
    const item = waiting.get(key)
    if (!item) continue
    const n = newerOf(item)
    if (n.choice == null) left++
    else decisions.push({ key, choice: n.choice, fields: n.fields })
  }
  // All at once (W25).
  resolveRemoteMany(decisions)
  return { decided: decisions.length, left }
}

type Saved = { id: string; key: string; version: number; entry: RecordEntry<RecordTypes[Collection]> }

/**
 * Saves answered: the versions on the disk in memory – in place when only their stamps changed (W3), the rest with one
 * change of the state for all of them (W1).
 */
function applySaved(c: Collection, saved: readonly Saved[]): void {
  const reactive: Array<{ id: string; entry: RecordEntry<RecordTypes[Collection]>; latestVersion: boolean }> = []
  for (const { id, key, version, entry } of saved) {
    const latestVersion = (versions.get(key) ?? 0) === version
    if (latestVersion) {
      dirty.delete(key)
      bases.delete(key)
      forgetEdits(key)
    } else if (mapOf(get(), c)[id]) {
      // Disk now holds what was sent: the base of a later merge.
      bases.set(key, entry.record)
    }
    const s = get()
    const latest = mapOf(s, c)[id]
    // Deleted while the save was in flight: do not bring it back.
    if (!latest) continue
    if (!s.drafts[id] && (latestVersion ? stampInPlace(mapOf(s, c), id, entry) : latest.relPath === entry.relPath)) continue
    reactive.push({ id, entry, latestVersion })
  }
  if (!reactive.length) return
  set((st) => {
    const map = { ...mapOf(st, c) }
    let drafts = st.drafts
    for (const { id, entry, latestVersion } of reactive) {
      // Newer local edits pending: keep them, but adopt the new path.
      if (map[id]) map[id] = latestVersion ? entry : { ...map[id]!, relPath: entry.relPath }
      if (drafts[id]) {
        if (drafts === st.drafts) drafts = { ...drafts }
        delete drafts[id]
      }
    }
    return { ...withMap(st, c, map), drafts }
  })
}

/**
 * A save that failed: its month made on another computer (B46) – the copy waits in Synchronizacja; its file a newer
 * version of the app wrote (B67) – kept unsaved without retries; else retried.
 */
function saveFailed(c: Collection | 'fi', id: string, key: string, message: string, newerFile = false): void {
  if (newerFile) return refusedForGood(key, message)
  if (c !== 'fi' && message.startsWith(CONFLICT_COPY_MESSAGE)) {
    forget(key)
    set((s) => {
      const map = { ...mapOf(s, c) }
      delete map[id]
      return withMap(s, c, map)
    })
    toast(message, 'info', 9000)
    return
  }
  // A record deleted meanwhile is no longer dirty: nothing to report or retry.
  if (dirty.has(key)) failed.set(key, message)
  scheduleRetry(key)
}

export const NEWER_RECORD_MESSAGE = 'Ten wpis zapisała nowsza wersja aplikacji (na drugim komputerze) – ta wersja go nie zmieni. Zaktualizuj aplikację (Ustawienia → Aktualizacje).'

/** A write this version can never make (B67): said once, no retry loop; the change stays in memory, unsaved. */
function refusedForGood(key: string, message: string): void {
  if (!dirty.has(key)) return
  failed.set(key, message)
  if (newer.has(key)) return
  newer.add(key)
  toast(`${message} Zmiana zostaje w tym oknie, ale ta wersja jej nie zapisze – zaktualizuj aplikację (Ustawienia → Aktualizacje).`, 'error', 10000)
}

/** Many records saved with one call (W1: an import, a bulk change), after any save of them already on its way. */
function saveBatch(c: Collection, ids: readonly string[]): void {
  const keys = ids.map((id) => keyOf(c, id))
  for (const [i, key] of keys.entries()) {
    versions.set(key, (versions.get(key) ?? 0) + 1)
    dirty.set(key, { collection: c, id: ids[i]! })
    const t = timers.get(key)
    if (t) clearTimeout(t)
    timers.delete(key)
    firstDirtyAt.delete(key)
  }
  const p = Promise.all(keys.map((k) => settled(inFlight.get(k)))).then(() => runSaveMany(c, ids))
  for (const key of keys) {
    inFlight.set(key, p)
    void p.finally(() => {
      if (inFlight.get(key) === p) inFlight.delete(key)
    })
  }
}

async function runSaveMany(c: Collection, ids: readonly string[]): Promise<void> {
  const s = get()
  const waiting = new Set(useRemote.getState().pending.map((p) => p.key))
  // Gone from memory meanwhile with its key still unsaved: nothing to write – forgotten, as one save does (`runSave`).
  let gone = false
  for (const id of ids) {
    const key = keyOf(c, id)
    if (dirty.has(key) && !waiting.has(key) && !mapOf(s, c)[id]) {
      forget(key)
      gone = true
    }
  }
  if (gone) bumpPending(0, { error: saveError() })
  // Still to write: changed, no decision about another computer's change waiting, still in memory.
  const sent = ids
    .map((id) => ({ id, key: keyOf(c, id) }))
    .filter(({ id, key }) => dirty.has(key) && !waiting.has(key) && mapOf(s, c)[id])
    .map(({ id, key }) => ({ id, key, version: versions.get(key) ?? 0, record: mapOf(s, c)[id]!.record }))
  if (!sent.length) return
  bumpPending(1)
  let savedAt: string | null = null
  try {
    const results = await api.saveRecords(c, sent.map((x) => x.record))
    const byId = new Map(results.map((r) => [r.id, r]))
    const saved: Saved[] = []
    for (const x of sent) {
      const r = byId.get(x.id)
      if (r?.entry) saved.push({ id: x.id, key: x.key, version: x.version, entry: r.entry as RecordEntry<RecordTypes[Collection]> })
      else saveFailed(c, x.id, x.key, r?.error ?? 'Nie udało się zapisać.', !!r?.newer)
    }
    applySaved(c, saved)
    for (const x of saved) {
      retryDelay.delete(x.key)
      failed.delete(x.key)
      newer.delete(x.key)
    }
    savedAt = new Date().toISOString()
    // A change from another computer came while these writes were on their way (B48): the decision must reach the disk.
    const keys = new Set(saved.map((x) => x.key))
    if (useRemote.getState().pending.some((p) => keys.has(p.key))) useRemote.setState((r) => ({ pending: r.pending.map((p) => (keys.has(p.key) ? { ...p, savedAfter: true } : p)) }))
  } catch (e) {
    // The whole call failed (the folder gone) or its answer could not be taken: what is still unsaved is retried on its own.
    const message = errorMessage(e)
    for (const x of sent) if (dirty.has(x.key)) saveFailed(c, x.id, x.key, message, isNewerFileError(e))
  } finally {
    bumpPending(-1, savedAt ? { lastSavedAt: savedAt, error: saveError() } : { error: saveError() })
  }
}

async function runSave(key: string): Promise<void> {
  const target = dirty.get(key)
  if (!target) return
  // Waiting for a decision about a change from another computer: writing now would overwrite it.
  if (pendingFor(key)) return
  const version = versions.get(key) ?? 0
  if (target.collection === 'fi' ? !get().fi : !mapOf(get(), target.collection)[target.id]) {
    forget(key)
    bumpPending(0, { error: saveError() })
    return
  }
  bumpPending(1)
  try {
    if (target.collection === 'fi') {
      const fi = get().fi as SettingsFile
      const saved = await api.saveSettings(fi)
      if ((versions.get(key) ?? 0) === version) {
        dirty.delete(key)
        bases.delete(key)
        forgetEdits(key)
        const next = adoptSaved(get().fi, saved)
        if (next) set({ fi: next })
      } else bases.set(key, saved)
    } else {
      const c = target.collection
      const current = mapOf(get(), c)[target.id] as RecordEntry<RecordTypes[Collection]>
      const entry = await api.saveRecord(c, current.record)
      applySaved(c, [{ id: target.id, key, version, entry }])
    }
    retryDelay.delete(key)
    failed.delete(key)
    newer.delete(key)
    bumpPending(-1, { lastSavedAt: new Date().toISOString(), error: saveError() })
    // A change from another computer came while this write was on its way (B48): the decision about it must reach the disk.
    if (pendingFor(key)) useRemote.setState((r) => ({ pending: r.pending.map((p) => (p.key === key ? { ...p, savedAfter: true } : p)) }))
  } catch (e) {
    saveFailed(target.collection, target.id, key, errorMessage(e), isNewerFileError(e))
    bumpPending(-1, { error: saveError() })
  }
}

/** A save's promise that never rejects: the next save of its records runs whatever became of it. */
const settled = (p: Promise<void> | undefined): Promise<void> | undefined => p?.catch(() => undefined)

/** Run the save of `key` after any save of it that is already in progress. */
function enqueue(key: string): Promise<void> {
  const prev = settled(inFlight.get(key)) ?? Promise.resolve()
  const p = prev.then(() => runSave(key))
  inFlight.set(key, p)
  void p.finally(() => {
    if (inFlight.get(key) === p) inFlight.delete(key)
  })
  return p
}

/** Deletions on their way (T301): a flush waits for them – a file the disk keeps brings its record back, unsaved edits and all. */
const deletions = new Set<Promise<unknown>>()

function deleting<T>(run: () => Promise<T>): Promise<T> {
  const p = run()
  deletions.add(p)
  const done = () => deletions.delete(p)
  void p.then(done, done)
  return p
}

/** A save failed: keep the change and try again later (never drop it silently). */
function scheduleRetry(key: string): void {
  if (timers.has(key) || !dirty.has(key)) return
  const delay = retryDelay.get(key) ?? RETRY_FIRST
  retryDelay.set(key, Math.min(RETRY_MAX, delay * 2))
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key)
      void enqueue(key)
    }, delay)
  )
}

function scheduleSave(collection: Collection | 'fi', id: string, delay = saveDelay()): void {
  const key = keyOf(collection, id)
  versions.set(key, (versions.get(key) ?? 0) + 1)
  dirty.set(key, { collection, id })
  const existing = timers.get(key)
  if (existing) clearTimeout(existing)
  const now = Date.now()
  if (!firstDirtyAt.has(key)) firstDirtyAt.set(key, now)
  const waited = now - (firstDirtyAt.get(key) ?? now)
  const wait = Math.min(delay, Math.max(0, saveMaxWait() - waited))
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key)
      firstDirtyAt.delete(key)
      void enqueue(key)
    }, wait)
  )
}

const folderReadOnly = () => !!get().status?.readOnly || get().switching

/** Fields and buttons that change data off: a read-only folder, or another one opening (B31). */
export const useFolderLocked = (): boolean => useData((s) => !!s.status?.readOnly || s.switching)

/**
 * Writes the app makes on its own – the game's days frozen, ICTTJ's goals followed, the settlements' start (D86: on a
 * computer in use only): in a writable folder shown in full, never while changes are being written (T301) – a write
 * started then would keep the flush going or reach the disk after its answer („zapis jeszcze trwa” at the window's close).
 */
export const writesInBackground = (s: DataState): boolean => s.phase === 'ready' && !s.status?.readOnly && !s.switching && !s.backgroundHeld

/** Flushes and steps running now that hold the background writes (T301). */
let holds = 0
/** The window closing with everything written: the background writes held until it goes (T301). */
let closeHold: ReturnType<typeof setTimeout> | undefined
/** How long at most: the window goes in a moment – unless main keeps it (its question after a minute of writing, „Anuluj”). */
const CLOSE_HOLD_MS = 10_000

function syncHeld(): void {
  const held = holds > 0 || closeHold !== undefined
  if (get().backgroundHeld !== held) set({ backgroundHeld: held })
}

/** `run` with the background writes held: none starts until it ends (T301). */
async function holding<T>(run: () => Promise<T>): Promise<T> {
  holds++
  syncHeld()
  try {
    return await run()
  } finally {
    holds--
    syncHeld()
  }
}

export const READ_ONLY_MESSAGE = 'Folder jest tylko do odczytu – zmiany nie są zapisywane.'
export const SWITCHING_MESSAGE = 'Trwa otwieranie innego folderu – zmiany w tej chwili nie są przyjmowane.'
let readOnlyNoticedAt = 0

/** A change the read-only folder does not take (N2): said once in a few seconds – never silently, never as a success. */
function readOnlyNotice(message = get().switching ? SWITCHING_MESSAGE : READ_ONLY_MESSAGE): void {
  const now = Date.now()
  // A clock set back meanwhile never silences it.
  if (now >= readOnlyNoticedAt && now - readOnlyNoticedAt < 4000) return
  readOnlyNoticedAt = now
  toast(message, 'error', 5000)
}

/** A record a newer version of the app wrote (B67): its editor's fields and buttons off, as in a read-only folder, with a note. */
export const useEntryNewer = (collection: Collection, id: string | null | undefined): boolean =>
  useData((s) => !!id && !!(s.records[collection] as AnyMap | undefined)?.[id]?.readOnly)

/**
 * Months of a collection kept a file per month (game, months) whose file a newer version of the app wrote and this one
 * cannot read (B67): no record is made over it – the window has none of it, the disk does.
 */
export function tooNewMonths(problems: readonly Problem[], collection: 'game' | 'months'): Set<string> {
  const out = new Set<string>()
  for (const p of problems) {
    if (p.kind !== 'too-new' || !p.relPath.startsWith(`${collection}/`)) continue
    const m = /^[^/]+\/(\d{4}-\d{2})\.json$/.exec(p.relPath)
    if (m) out.add(m[1]!)
  }
  return out
}

/** A month's file of `collection` written by a newer version of the app (B67): said, and nothing made over it. */
export function monthTooNew(collection: 'game' | 'months', month: string): boolean {
  if (!tooNewMonths(get().problems, collection).has(month)) return false
  readOnlyNotice(NEWER_RECORD_MESSAGE)
  return true
}

/**
 * Another folder from Settings (B31): this one's changes are written first, then – while the other one opens – nothing
 * is edited or written: a change never lands in the other folder, nor gets lost when this one closes. A failed or
 * stopped open leaves this folder as it was. `unsaved` = why this folder's changes could not be written: no switch.
 */
export async function switchFolder(open: () => Promise<OpenFolderResult>): Promise<OpenFolderResult | { unsaved: string }> {
  // No background write between this folder's last writes and the switch (T301).
  return holding(async () => {
    await flushSaves()
    // Decisions about another computer's changes, or a failed write: no switch, said why (B108). Changes this version can
    // never write (B67) stay behind – they would not reach the disk here either.
    const hold = unsavedHold('zmiana folderu')
    if (hold) return { unsaved: hold }
    set({ switching: true })
    try {
      const res = await open()
      if (res.ok) applySnapshot(res.snapshot)
      return res
    } finally {
      set({ switching: false })
    }
  })
}

/** A user's action may write: false – with the one message – in a read-only folder (N2); its success is never shown. */
export function canWrite(): boolean {
  if (!folderReadOnly()) return true
  readOnlyNotice()
  return false
}

/**
 * Update a record in memory immediately and save it to disk shortly after (autosave). `background` = a fill by the app,
 * not the user. false = nothing changed (no such record, a read-only file or folder – N2).
 */
export function updateRecord<C extends Collection>(collection: C, id: string, updater: (r: RecordTypes[C]) => RecordTypes[C], opts: { background?: boolean } = {}): boolean {
  const current = (get().records[collection] as EntryMap<C>)[id]
  // Read-only folder (newer format, unavailable drive) or file: no edits that could never be saved.
  if (folderReadOnly()) {
    if (!opts.background) readOnlyNotice()
    return false
  }
  if (!current) return false
  // Written by a newer version of the app (B67): never a silent no-op – said, as a read-only folder's change is.
  if (current.readOnly) {
    if (!opts.background) readOnlyNotice(NEWER_RECORD_MESSAGE)
    return false
  }
  const key = keyOf(collection, id)
  if (!dirty.has(key) && !bases.has(key) && !get().drafts[id]) bases.set(key, current.record)
  const record = updater(current.record)
  stampEdits(key, current.record, record, !!opts.background)
  set((s) => {
    // The first edit turns a draft into a real record (saved shortly), so leaving the page never discards it.
    let drafts = s.drafts
    if (drafts[id]) {
      drafts = { ...drafts }
      delete drafts[id]
    }
    return { ...withMap(s, collection, { ...mapOf(s, collection), [id]: { ...current, record } as RecordEntry<RecordTypes[Collection]> }), drafts }
  })
  scheduleSave(collection, id)
  return true
}

/** Add a record. Drafts live only in memory until the first edit. false = a read-only folder (N2). */
export function addRecord<C extends Collection>(collection: C, record: RecordTypes[C], opts: { draft?: boolean; background?: boolean } = {}): boolean {
  if (folderReadOnly()) {
    if (!opts.background) readOnlyNotice()
    return false
  }
  set((s) => ({
    ...withMap(s, collection, { ...mapOf(s, collection), [record.id]: { record, relPath: '', readOnly: false } as RecordEntry<RecordTypes[Collection]> }),
    drafts: opts.draft ? { ...s.drafts, [record.id]: true as const } : s.drafts
  }))
  if (!opts.draft) scheduleSave(collection, record.id, 0)
  return true
}

/** Many new records at once (an import): one change of the state, all saved with one call right after (W1). */
export function addRecords<C extends Collection>(collection: C, records: readonly RecordTypes[C][]): boolean {
  if (!records.length) return true
  if (folderReadOnly()) {
    readOnlyNotice()
    return false
  }
  set((s) => {
    const map = { ...mapOf(s, collection) }
    for (const r of records) map[r.id] = { record: r, relPath: '', readOnly: false } as RecordEntry<RecordTypes[Collection]>
    return withMap(s, collection, map)
  })
  saveBatch(collection, records.map((r) => r.id))
  return true
}

/** Many changed records at once (an import's merges and settled rows): each like `updateRecord`, one change of the state. */
export function replaceRecords<C extends Collection>(collection: C, records: readonly RecordTypes[C][]): boolean {
  if (!records.length) return true
  if (folderReadOnly()) {
    readOnlyNotice()
    return false
  }
  const current = get().records[collection] as EntryMap<C>
  const changed = records.filter((r) => current[r.id] && !current[r.id]!.readOnly)
  for (const r of changed) {
    const key = keyOf(collection, r.id)
    if (!dirty.has(key) && !bases.has(key) && !get().drafts[r.id]) bases.set(key, current[r.id]!.record)
    stampEdits(key, current[r.id]!.record, r, false)
  }
  set((s) => {
    const map = { ...mapOf(s, collection) }
    for (const r of changed) map[r.id] = { ...map[r.id]!, record: r } as RecordEntry<RecordTypes[Collection]>
    const drafts = { ...s.drafts }
    for (const r of changed) delete drafts[r.id]
    return { ...withMap(s, collection, map), drafts }
  })
  saveBatch(collection, changed.map((r) => r.id))
  return true
}

/** Drop an untouched draft (never written to disk). */
export function discardDraft(collection: Collection, id: string): void {
  if (!get().drafts[id]) return
  set((s) => {
    const map = { ...mapOf(s, collection) }
    delete map[id]
    const drafts = { ...s.drafts }
    delete drafts[id]
    return { ...withMap(s, collection, map), drafts }
  })
}

export async function deleteRecord(collection: Collection, id: string): Promise<void> {
  const key = keyOf(collection, id)
  const entry = mapOf(get(), collection)[id]
  // Written by a newer version of the app (B67): this one never deletes it – it stays on the screen, the caller says why.
  if (entry?.readOnly) throw new Error(NEWER_RECORD_MESSAGE)
  const unsaved = dirty.has(key)
  forget(key)
  useRemote.setState((r) => ({ pending: r.pending.filter((p) => p.key !== key) }))
  bumpPending(0, { error: saveError() })
  const wasDraft = !!get().drafts[id]
  set((s) => {
    const map = { ...mapOf(s, collection) }
    delete map[id]
    const drafts = { ...s.drafts }
    delete drafts[id]
    return { ...withMap(s, collection, map), drafts }
  })
  return deleting(async () => {
    await settled(inFlight.get(key))
    if (wasDraft) return
    try {
      await api.deleteRecord(collection, id)
    } catch (e) {
      // The file stays on the disk (held by another program – B9): the record back on the screen, the caller says why;
      // its unsaved edits are saved after all.
      if (entry && !mapOf(get(), collection)[id]) {
        set((s) => withMap(s, collection, { ...mapOf(s, collection), [id]: entry }))
        if (unsaved) scheduleSave(collection, id)
      }
      throw e
    }
  })
}

/** `deleteRecord` nobody waits for (an undo, a cleanup): its refusal said (B9, B67), never an unhandled error. */
export function deleteOrSay(collection: Collection, id: string): void {
  deleteRecord(collection, id).catch((e: unknown) => toast(errorMessage(e), 'error', 8000))
}

/**
 * Many records deleted with one call (W1: an import's, duplicates): gone from memory at once; those the disk refused come
 * back. Returns the ids deleted and the first error. `reason` 'undo': taken back with their import (F4 – T39); 'drop': old
 * batches of `imports`, no version in the history.
 */
export async function deleteRecords(collection: Collection, ids: readonly string[], opts: { reason?: 'undo' | 'drop' } = {}): Promise<{ deleted: string[]; error: string | null }> {
  const s = get()
  const entries = new Map(ids.map((id) => [id, mapOf(s, collection)[id]]))
  const drafts = ids.filter((id) => s.drafts[id])
  const keys = ids.map((id) => keyOf(collection, id))
  const unsaved = new Set(keys.filter((k) => dirty.has(k)))
  for (const key of keys) forget(key)
  useRemote.setState((r) => ({ pending: r.pending.filter((p) => !keys.includes(p.key)) }))
  bumpPending(0, { error: saveError() })
  set((st) => {
    const map = { ...mapOf(st, collection) }
    const left = { ...st.drafts }
    for (const id of ids) {
      delete map[id]
      delete left[id]
    }
    return { ...withMap(st, collection, map), drafts: left }
  })
  return deleting(async () => {
    await Promise.all(keys.map((k) => settled(inFlight.get(k))))
    const onDisk = ids.filter((id) => !drafts.includes(id))
    if (!onDisk.length) return { deleted: [...ids], error: null }
    let results: Array<{ id: string; error?: string }>
    try {
      results = await api.deleteRecords(collection, onDisk, opts.reason)
    } catch (e) {
      results = onDisk.map((id) => ({ id, error: errorMessage(e) }))
    }
    // The files that stay on the disk (held by another program – B9): their records back on the screen, with their unsaved
    // edits saved after all.
    const refused = results.filter((r) => r.error)
    const back: string[] = []
    if (refused.length)
      set((st) => {
        const map = { ...mapOf(st, collection) }
        for (const r of refused) {
          const entry = entries.get(r.id)
          if (entry && !map[r.id]) {
            map[r.id] = entry
            back.push(r.id)
          }
        }
        return withMap(st, collection, map)
      })
    for (const id of back) if (unsaved.has(keyOf(collection, id))) scheduleSave(collection, id)
    const failedIds = new Set(refused.map((r) => r.id))
    return { deleted: ids.filter((id) => !failedIds.has(id)), error: refused[0]?.error ?? null }
  })
}

/** Settings written by the main process (restored from the history): replace the in-memory copy. */
export function adoptSettings(fi: SettingsFile): void {
  forget(FI_KEY)
  set((s) => ({ fi: shareSettings(s.fi, fi) }))
  bumpPending(0, { error: saveError() })
}

/** Change fi.json in memory now and save it shortly after (autosave). */
export function updateSettings(updater: (f: SettingsFile) => SettingsFile, opts: { background?: boolean } = {}): boolean {
  const f = get().fi
  if (!f) return false
  if (folderReadOnly()) {
    if (!opts.background) readOnlyNotice()
    return false
  }
  if (!dirty.has(FI_KEY) && !bases.has(FI_KEY)) bases.set(FI_KEY, f)
  const next = updater(f)
  stampEdits(FI_KEY, f, next, !!opts.background)
  set({ fi: next })
  scheduleSave('fi', 'fi')
  return true
}

/** A flush writes again what changed while it wrote – at most this many times (T301). */
const FLUSH_ROUNDS = 10

/**
 * Write every pending change now (window close, folder switch, Ctrl+S, "retry"), including changes
 * whose earlier save failed. Resolves to true when nothing is left unsaved.
 */
export async function flushSaves(): Promise<boolean> {
  return holding(async () => {
    const t0 = performance.now()
    let rounds = 0
    // A field still being typed in (window closing, Ctrl+S): its value first.
    commitActiveField()
    // In rounds (T301): a record changed while its write was on its way – a field committed, an edit, a write started
    // just before, a record a refused deletion brought back – is written once more before the answer. The version each
    // record was sent at: a write that failed or waits for a decision about another computer's change is not sent again –
    // its error or the decision is the answer.
    const sent = new Map<string, number>()
    for (let round = 0; round < FLUSH_ROUNDS; round++) {
      for (const key of new Set([...timers.keys(), ...dirty.keys()])) {
        const version = versions.get(key) ?? 0
        if (sent.get(key) === version) continue
        sent.set(key, version)
        const t = timers.get(key)
        if (t) clearTimeout(t)
        timers.delete(key)
        firstDirtyAt.delete(key)
        void enqueue(key)
      }
      if (!inFlight.size && !deletions.size) break
      rounds++
      await Promise.all([...inFlight.values(), ...deletions].map((p) => p.catch(() => undefined)))
    }
    // A long one in the log (from 500 ms): its rounds and what it left unsaved.
    api.rendererStep?.(`zapis wszystkiego: rundy ${rounds}, niezapisane ${dirty.size}`, performance.now() - t0)
    return !hasUnsaved()
  })
}

export function hasUnsaved(): boolean {
  return dirty.size > 0
}

/**
 * What is unsaved and why (B108): records held by a decision about another computer's change (only the decision saves
 * them), records a newer version of the app wrote (B67 – this one never saves them), the others' last write error.
 */
export function unsavedReport(): FlushResult {
  const waitingKeys = new Set(useRemote.getState().pending.map((p) => p.key))
  let waiting = 0
  let newerCount = 0
  let error: string | null = null
  for (const key of dirty.keys()) {
    if (waitingKeys.has(key)) waiting++
    else if (newer.has(key)) newerCount++
    else error = failed.get(key) ?? error ?? 'zapis jeszcze trwa'
  }
  return { saved: dirty.size === 0, waiting, newer: newerCount, error }
}

/** The window closing (B108): everything written, the reason of what is not – a waiting decision's dialog opened behind the question. */
export async function flushForClose(): Promise<FlushResult> {
  return holding(async () => {
    await flushSaves()
    const r = unsavedReport()
    if (r.waiting) setRemoteDialog(true)
    // Everything written: the window goes now – no background write starts on its way out (T301). Not written: main asks,
    // and the window may stay – the background writes go on.
    if (r.saved) {
      clearTimeout(closeHold)
      closeHold = setTimeout(() => {
        closeHold = undefined
        syncHeld()
      }, CLOSE_HOLD_MS)
    }
    return r
  })
}

/**
 * Every change on the disk before a step that reads the folder or replaces records (a copy, an export, an import, a
 * version brought back, an update, another folder – B108). Throws the real reason: decisions about another computer's
 * changes – their dialog opens, no write saves those records before it –, or a failed write, which the app retries.
 * Changes this version can never write (B67) do not hold the step: they are not on the disk for anybody.
 */
export async function saveFirst(what: string): Promise<void> {
  await flushSaves()
  const hold = unsavedHold(what)
  if (hold) throw new Error(hold)
}

/** Why `what` waits for the unsaved changes (`saveFirst`); null = nothing holds it. Decisions waiting: their dialog opens. */
function unsavedHold(what: string): string | null {
  const r = unsavedReport()
  if (r.waiting) {
    setRemoteDialog(true)
    return `Czekają zmiany z drugiego komputera (${r.waiting}) – ${what} czeka na Twoją decyzję w otwartym oknie.`
  }
  return r.error ? `Nie udało się zapisać bieżących zmian (${r.error}), więc ${what} czeka – aplikacja ponawia zapis, spróbuj ponownie za chwilę.` : null
}

/**
 * After a step done in memory (an import, its undo, the start wizard): what of it is not on the disk yet and why (B108);
 * null = all saved. Decisions about another computer's changes waiting: their dialog opens.
 */
export async function unsavedNote(): Promise<string | null> {
  await flushSaves()
  const r = unsavedReport()
  if (r.waiting) {
    setRemoteDialog(true)
    return `część zmian zapisze się po Twojej decyzji o zmianach z drugiego komputera (${r.waiting})`
  }
  if (r.error) return `część zmian nie zapisała się jeszcze w folderze (${r.error}) – aplikacja ponawia zapis automatycznie`
  return r.newer ? 'części zmian ta wersja nie zapisze – te wpisy zapisała nowsza wersja aplikacji' : null
}

/** Ctrl+S and the palette's „Zapisz teraz” (N62): one way – decisions about another computer's changes open their dialog. */
export async function saveNow(): Promise<void> {
  const saved = await flushSaves()
  const r = unsavedReport()
  if (useRemote.getState().pending.length) {
    setRemoteDialog(true)
    const rest = !r.error && !r.newer
    toast(
      r.waiting
        ? `Czekają zmiany z drugiego komputera (${r.waiting}) – te wpisy zapiszą się po Twojej decyzji.`
        : `${rest ? 'Zapisano. ' : ''}Czekają zmiany z drugiego komputera – zdecyduj o nich w oknie.`,
      'info',
      5000
    )
    if (rest) return
  } else if (saved) return toast('Zapisano. (Zapis jest automatyczny – Ctrl+S nie jest potrzebne.)', 'success', 2200)
  if (r.error) toast(`Nie udało się zapisać: ${r.error}. Aplikacja ponowi zapis automatycznie.`, 'error', 6000)
  else if (r.newer) toast(`Nie zapisano: ${NEWER_RECORD_MESSAGE}`, 'error', 8000)
}

export async function boot(): Promise<void> {
  const info = await api.appInfo()
  set({ appInfo: info })
  api.onChange(applyChange)
  api.onFlushRequest(flushForClose)
  // This computer's settings read at last (B114): its folder opens now, unless another was chosen meanwhile.
  api.onConfigReady(() => {
    if (get().phase === 'setup') void loadCurrent()
  })
  await loadCurrent()
}

async function loadCurrent(): Promise<void> {
  const res = await api.loadCurrent()
  if (res?.ok) applySnapshot(res.snapshot)
  else set({ phase: 'setup', ...setupOf(res) })
}

export type SetupProblem = Pick<Extract<OpenFolderResult, { ok: false }>, 'reason' | 'problem' | 'remembered' | 'subfolder'>

function setupOf(res: OpenFolderResult | null): Pick<DataState, 'setupMessage' | 'setupDir' | 'setupProblem'> {
  if (!res || res.ok) return { setupMessage: null, setupDir: null, setupProblem: null }
  return { setupMessage: res.message, setupDir: res.dir ?? null, setupProblem: { reason: res.reason, problem: res.problem, remembered: res.remembered, subfolder: res.subfolder } }
}

export async function openResult(res: Awaited<ReturnType<typeof api.pickDataDir>>): Promise<boolean> {
  if (res.ok) {
    applySnapshot(res.snapshot)
    return true
  }
  if (res.reason !== 'cancelled') set(setupOf(res))
  return false
}
