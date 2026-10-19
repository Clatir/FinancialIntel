// adapted from ICTTJ src/renderer/store/journal.ts @ 84a8339
import { create } from 'zustand'
import { CONFLICT_COPY_MESSAGE, type AppInfo, type ChangeSet, type ConflictEntry, type FolderStatus, type OpenFolderResult, type Problem, type RecordEntry, type Snapshot } from '@shared/api'
import { COLLECTIONS, type Collection } from '@shared/paths'
import type { RecordTypes } from '@shared/records'
import type { SettingsFile } from '@shared/schema'
import { chooser, deepEqual, merge3, pathKey, sameContentAs, type Path, type Side } from '@shared/merge'
import { changedPaths, decideRemote, decideRemoteRemoval, isoMs, newerChoice, newerFields, relatedPaths, type RemoteMode } from '@shared/remoteChanges'
import { api, errorMessage } from '../lib/api'
import { useRemote, type PendingRemote } from './remote'
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
  /** When the folder opened in this window, and when a change from another computer came last (B33: the first
   * freeze of the game's days waits for them). */
  openedAt: number
  externalAt: number
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
  openedAt: 0,
  externalAt: 0,
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

export function applySnapshot(snapshot: Snapshot): void {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
  dirty.clear()
  firstDirtyAt.clear()
  retryDelay.clear()
  failed.clear()
  bases.clear()
  fieldEdits.clear()
  userEditedAt.clear()
  useRemote.setState({ pending: [], open: false })
  set({
    phase: 'ready',
    setupMessage: null,
    setupDir: null,
    setupProblem: null,
    openedAt: Date.now(),
    externalAt: 0,
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
  const queue = (item: Omit<PendingRemote, 'receivedAt' | 'hadLocalEdits'>, localEdits: boolean) => {
    const prev = pendingFor(item.key)
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
      const pending = pendingFor(key)
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
      if (decideRemoteRemoval({ mode, dirty: localEdits || !!pendingFor(key) }) === 'remove') delete mapFor(collection)[id]
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
        const pending = pendingFor(key)
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
    useRemote.setState((r) => {
      const pending = [...r.pending.filter((p) => !queued.some((q) => q.key === p.key) && !returned.includes(p.key)), ...queued]
      return { pending, open: queued.length > 0 || (r.open && pending.length > 0) }
    })
  }
}

/**
 * Decide about a change from another computer: merge (fields changed on both sides as `fieldChoices` say, default
 * mine), keep this computer's version (written over theirs; theirs stays in the history) or take theirs (local
 * unsaved edits go to the history).
 */
export function resolveRemote(key: string, choice: 'merge' | Side, fieldChoices: Record<string, Side> = {}): void {
  const item = pendingFor(key)
  if (!item) return
  useRemote.setState((r) => {
    const pending = r.pending.filter((p) => p.key !== key)
    return { pending, open: r.open && pending.length > 0 }
  })
  if (item.collection === 'fi') {
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
    return
  }
  const c = item.collection
  const local = mapOf(get(), c)[item.id]
  const setEntry = (entry: RecordEntry<RecordTypes[Collection]> | null) =>
    set((s) => {
      const map = { ...mapOf(s, c) }
      if (entry) map[item.id] = entry
      else delete map[item.id]
      return withMap(s, c, map)
    })
  if (item.type === 'removal') {
    if (choice === 'theirs') {
      if (dirty.has(key) && local) void api.historyKeep(c, local.record, 'discarded').catch(() => undefined)
      forget(key)
      setEntry(null)
      // Mine was written after the deletion came (B48): the file is back on the disk – deleted again.
      if (item.savedAfter) void api.deleteRecord(c, item.id).catch((e) => toast(errorMessage(e), 'error', 8000))
    } else if (local) scheduleSave(c, item.id, 0)
    return
  }
  const theirs = item.theirs as RecordEntry<RecordTypes[Collection]>
  if (choice === 'theirs' || !local) {
    if (dirty.has(key) && local) void api.historyKeep(c, local.record, 'discarded').catch(() => undefined)
    forget(key)
    setEntry(theirs)
    // Mine was written after theirs came (B48): theirs written back.
    if (item.savedAfter) scheduleSave(c, item.id, 0)
    return
  }
  bases.set(key, theirs.record)
  const record = choice === 'mine' ? local.record : merge3(item.base, local.record, theirs.record, chooser(fieldChoices)).merged
  setEntry({ ...theirs, record })
  scheduleSave(c, item.id, 0)
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
  let decided = 0
  let left = 0
  for (const key of keys) {
    const item = pendingFor(key)
    if (!item) continue
    const n = newerOf(item)
    if (n.choice == null) {
      left++
      continue
    }
    resolveRemote(key, n.choice, n.fields)
    decided++
  }
  return { decided, left }
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

/** A save that failed: its month made on another computer (B46) – the copy waits in Synchronizacja; else retried. */
function saveFailed(c: Collection, id: string, key: string, message: string): void {
  if (message.startsWith(CONFLICT_COPY_MESSAGE)) {
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
  // Still to write: changed, no decision about another computer's change waiting, still in memory.
  const sent = ids
    .map((id) => ({ id, key: keyOf(c, id) }))
    .filter(({ id, key }) => dirty.has(key) && !pendingFor(key) && mapOf(s, c)[id])
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
      else saveFailed(c, x.id, x.key, r?.error ?? 'Nie udało się zapisać.')
    }
    applySaved(c, saved)
    for (const x of saved) {
      retryDelay.delete(x.key)
      failed.delete(x.key)
    }
    savedAt = new Date().toISOString()
    // A change from another computer came while these writes were on their way (B48): the decision must reach the disk.
    const keys = new Set(saved.map((x) => x.key))
    if (useRemote.getState().pending.some((p) => keys.has(p.key))) useRemote.setState((r) => ({ pending: r.pending.map((p) => (keys.has(p.key) ? { ...p, savedAfter: true } : p)) }))
  } catch (e) {
    // The whole call failed (the folder gone) or its answer could not be taken: what is still unsaved is retried on its own.
    const message = errorMessage(e)
    for (const x of sent) if (dirty.has(x.key)) saveFailed(c, x.id, x.key, message)
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
    bumpPending(-1, { lastSavedAt: new Date().toISOString(), error: saveError() })
    // A change from another computer came while this write was on its way (B48): the decision about it must reach the disk.
    if (pendingFor(key)) useRemote.setState((r) => ({ pending: r.pending.map((p) => (p.key === key ? { ...p, savedAfter: true } : p)) }))
  } catch (e) {
    const message = errorMessage(e)
    if (target.collection !== 'fi') saveFailed(target.collection, target.id, key, message)
    else {
      if (dirty.has(key)) failed.set(key, message)
      scheduleRetry(key)
    }
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

export const READ_ONLY_MESSAGE = 'Folder jest tylko do odczytu – zmiany nie są zapisywane.'
export const SWITCHING_MESSAGE = 'Trwa otwieranie innego folderu – zmiany w tej chwili nie są przyjmowane.'
let readOnlyNoticedAt = 0

/** A change the read-only folder does not take (N2): said once in a few seconds – never silently, never as a success. */
function readOnlyNotice(): void {
  if (Date.now() - readOnlyNoticedAt < 4000) return
  readOnlyNoticedAt = Date.now()
  toast(get().switching ? SWITCHING_MESSAGE : READ_ONLY_MESSAGE, 'error', 5000)
}

/**
 * Another folder from Settings (B31): this one's changes are written first, then – while the other one opens – nothing
 * is edited or written: a change never lands in the other folder, nor gets lost when this one closes. A failed or
 * stopped open leaves this folder as it was. 'unsaved' = this folder's changes could not be written: no switch.
 */
export async function switchFolder(open: () => Promise<OpenFolderResult>): Promise<OpenFolderResult | 'unsaved'> {
  if (!(await flushSaves())) return 'unsaved'
  set({ switching: true })
  try {
    const res = await open()
    if (res.ok) applySnapshot(res.snapshot)
    return res
  } finally {
    set({ switching: false })
  }
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
  if (!current || current.readOnly) return false
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

/**
 * Write every pending change now (window close, folder switch, Ctrl+S, "retry"), including changes
 * whose earlier save failed. Resolves to true when nothing is left unsaved.
 */
export async function flushSaves(): Promise<boolean> {
  // A field still being typed in (window closing, Ctrl+S): its value first.
  commitActiveField()
  for (const key of new Set([...timers.keys(), ...dirty.keys()])) {
    const t = timers.get(key)
    if (t) clearTimeout(t)
    timers.delete(key)
    firstDirtyAt.delete(key)
    void enqueue(key)
  }
  await Promise.all([...inFlight.values()].map(settled))
  return !hasUnsaved()
}

export function hasUnsaved(): boolean {
  return dirty.size > 0
}

export async function boot(): Promise<void> {
  const info = await api.appInfo()
  set({ appInfo: info })
  api.onChange(applyChange)
  api.onFlushRequest(flushSaves)
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
