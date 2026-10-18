// adapted from ICTTJ src/main/datastore/store.ts @ 84a8339
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import { CONFLICT_COPY_MESSAGE, SLOW_FILE_MS, type ChangeSet, type ConflictEntry, type ConflictSide, type FolderStatus, type HistoryEntry, type HistoryKind, type HistoryReason, type Problem, type ProblemKind, type RecordEntry, type RecordLists, type Snapshot } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import {
  BACKUPS_DIR,
  COLLECTIONS,
  LAYOUTS,
  SETTINGS_FILE,
  classifyCanonical,
  detectConflictName,
  idFromPath,
  isIgnoredPath,
  kindOfDir,
  recordRelPath,
  sanitizeRelPath,
  type Collection,
  type ConflictName,
  type FileKind
} from '@shared/paths'
import { SCHEMAS, parseRecordText, serializeRecord, type AnyRecord, type RecordTypes } from '@shared/records'
import { SCHEMA_VERSION, type SettingsFile } from '@shared/schema'
import { pathExists, removeFile, sha1, withRetry, writeFileAtomic } from './atomic'
import { mapLimit, walkFiles } from './fsutil'
import { ReadTracker, type LoadProgress, type LoadStats } from './progress'
import { RecordHistory } from './history'
import { zipFolder } from './zip'

/** The settings file of an ICT Trade Journal data folder. */
const ICTJ_FILE = 'journal.json'

interface FileState {
  relPath: string
  kind: FileKind
  mtimeMs: number
  size: number
  hash: string
  status: 'record' | 'copy' | 'problem'
  record: AnyRecord | SettingsFile | null
  readOnly: boolean
  error: string | null
  problemKind: ProblemKind | null
  conflict: ConflictName | null
  migrated: boolean
  fromVersion: number
  text: string | null
  /** The file could not be read (OneDrive still bringing it, B42): read again next time, never kept as its content. */
  readError?: boolean
}

export class ReadOnlyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReadOnlyError'
  }
}

/**
 * A month's record written as a sync copy beside the month's file of another record (B46): the user picks in
 * Synchronizacja. `change` – the copy, for the window at once.
 */
export class ConflictCopyError extends Error {
  constructor(
    readonly relPath: string,
    readonly change: ChangeSet | null = null
  ) {
    super(`${CONFLICT_COPY_MESSAGE} – Twoja wersja czeka w Synchronizacji jako kopia do wyboru.`)
    this.name = 'ConflictCopyError'
  }
}

/**
 * The record's file was removed from outside a moment before its write (B49): the write is refused, the window asks.
 * `change` – the removal as a change from outside, for the window at once (a later write's change would carry it as
 * this computer's own).
 */
export class RemovedOutsideError extends Error {
  constructor(
    readonly relPath: string,
    readonly change: ChangeSet | null = null
  ) {
    super('Ten wpis został właśnie usunięty na innym komputerze – zdecyduj, czy go zachować.')
    this.name = 'RemovedOutsideError'
  }
}

export interface DataStoreOptions {
  machineName: string
  /** Move a file to the recycle bin (Electron shell.trashItem); defaults to deleting it. */
  trash?: (absPath: string) => Promise<void>
  now?: () => string
  /** Per-machine override of the backups folder (absolute). */
  backupDir?: string | null
}

/**
 * 'partial' = FI's folders without fi.json (OneDrive has not synced it yet – never initialize over it);
 * 'ictj' = the data folder of ICT Trade Journal (FI never writes there).
 */
export interface OpenOptions {
  /** Stop opening: no more files are read and nothing is written (no migration, no clean-up). */
  signal?: AbortSignal
  /** A read at least this long counts as slow (default `SLOW_FILE_MS`). */
  slowMs?: number
  /** Test hook (E2E of the progress screen): every file read waits this long first. */
  readDelayMs?: number
  /** Called once the folder is read, right before the migration: from here on the open no longer stops. */
  onCommit?: () => void
}

/** Files read at once (open, rescan): fewer than the thread pool (`main/threadpool.ts`), so other work still runs. */
export const READ_CONCURRENCY = 24

export type FolderKind = 'data' | 'partial' | 'ictj' | 'empty' | 'other' | 'missing'

type ViewKey = string

interface Views {
  records: Record<Collection, Map<string, FileState>>
  conflicts: ConflictEntry[]
  problems: Problem[]
}

const emptyRecords = (): Record<Collection, Map<string, FileState>> => Object.fromEntries(COLLECTIONS.map((c) => [c, new Map()])) as Record<Collection, Map<string, FileState>>

function stamp(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
}

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Collections whose file name ends with `_<id>.json` under a dated path (a date change moves the file). */
const ID_NAMED = new Set<Collection>(COLLECTIONS.filter((c) => LAYOUTS[c] === 'dated'))

/** Fields of the file that are not the record's content: the save stamps. */
const STAMP_FIELDS = new Set(['schemaVersion', 'updatedAt', 'updatedBy'])

function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`
  if (v && typeof v === 'object') {
    const keys = Object.keys(v as Record<string, unknown>).filter((k) => (v as Record<string, unknown>)[k] !== undefined).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`).join(',')}}`
  }
  return JSON.stringify(v) ?? 'null'
}

/** The same record content (key order and the save stamps aside). */
export function sameContent(a: unknown, b: unknown): boolean {
  const strip = (r: unknown) =>
    r && typeof r === 'object' ? Object.fromEntries(Object.entries(r as Record<string, unknown>).filter(([k]) => !STAMP_FIELDS.has(k))) : r
  return canonicalJson(strip(a)) === canonicalJson(strip(b))
}

/** Serializes async operations so scans and writes never interleave. */
class Mutex {
  private tail: Promise<unknown> = Promise.resolve()
  run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.tail.then(fn, fn)
    this.tail = result.catch(() => undefined)
    return result
  }
  /** Everything queued so far is done. */
  idle(): Promise<void> {
    return this.tail.then(() => undefined)
  }
}

export class DataStore {
  readonly root: string
  private files = new Map<string, FileState>()
  /**
   * Records seen removed from outside (`kind:id`): another computer may have moved one by a date change and its
   * new file come later – a save of such a record looks for it first.
   */
  private removedOutside = new Set<string>()
  /** Paths whose last read failed (B42) – a write's check of them costs nothing when there are none. */
  private unreadable = new Set<string>()
  private prevKeys: Record<Collection, Map<string, ViewKey>> = Object.fromEntries(COLLECTIONS.map((c) => [c, new Map()])) as Record<Collection, Map<string, ViewKey>>
  private prevMeta = ''
  private readonly mutex = new Mutex()
  /** The open in progress (1.4.1): what `progress()` reports. */
  private tracker: ReadTracker | null = null
  /** How the last open went (logged by the main process). */
  loadStats: LoadStats | null = null
  private readonly opts: Required<Omit<DataStoreOptions, 'backupDir'>> & { backupDir: string | null }
  fi!: SettingsFile
  private folderReadOnlyReason: string | null = null
  private folderSchemaVersion = SCHEMA_VERSION
  private available = true
  migratedFrom: number | null = null
  backupPath: string | null = null
  otherMachines: FolderStatus['otherMachines'] = []
  readonly history: RecordHistory

  constructor(root: string, opts: DataStoreOptions) {
    this.root = root
    this.opts = {
      machineName: opts.machineName,
      trash: opts.trash ?? ((p) => fs.rm(p, { force: true })),
      now: opts.now ?? (() => new Date().toISOString()),
      backupDir: opts.backupDir ?? null
    }
    this.history = new RecordHistory(root, this.opts.machineName, this.opts.now)
  }

  // ---------------------------------------------------------------- folder lifecycle

  static async inspect(root: string): Promise<FolderKind> {
    try {
      const st = await fs.stat(root)
      if (!st.isDirectory()) return 'missing'
    } catch {
      return 'missing'
    }
    if (await pathExists(join(root, SETTINGS_FILE))) return 'data'
    if (await pathExists(join(root, ICTJ_FILE))) return 'ictj'
    const entries = (await fs.readdir(root)).filter((n) => !n.startsWith('.') && n !== 'desktop.ini' && n !== 'Thumbs.db')
    if (entries.length === 0) return 'empty'
    return entries.some((n) => (COLLECTIONS as readonly string[]).includes(n)) ? 'partial' : 'other'
  }

  /** Create the folder layout and a default fi.json in an empty folder. */
  static async initialize(root: string, fi: SettingsFile = createDefaultSettings()): Promise<void> {
    await fs.mkdir(root, { recursive: true })
    if (await pathExists(join(root, SETTINGS_FILE))) throw new Error('Ten folder zawiera już dane Financial Intel (fi.json).')
    for (const dir of [...COLLECTIONS, BACKUPS_DIR]) await fs.mkdir(join(root, dir), { recursive: true })
    await writeFileAtomic(join(root, SETTINGS_FILE), serializeRecord('fi', fi))
  }

  get backupsDir(): string {
    return this.opts.backupDir ?? join(this.root, BACKUPS_DIR)
  }

  /** Per-machine backup location (null = backups/ inside the data folder). */
  setBackupDir(dir: string | null): void {
    this.opts.backupDir = dir
  }

  abs(rel: string): string {
    const clean = sanitizeRelPath(rel)
    if (!clean) throw new Error(`Niedozwolona ścieżka: ${rel}`)
    return join(this.root, ...clean.split('/'))
  }

  open(opts: OpenOptions = {}): Promise<Snapshot> {
    return this.mutex.run(async () => {
      const t0 = performance.now()
      const tracker = new ReadTracker(opts.slowMs ?? SLOW_FILE_MS)
      this.tracker = tracker
      try {
        const kind = await DataStore.inspect(this.root)
        if (kind !== 'data') throw new Error('W tym folderze nie ma pliku fi.json.')
        const times = await this.scanAll(tracker, opts)
        // Stopped: an open nobody waits for any more never migrates or cleans up the folder. Past this point it is
        // not stopped any more – the caller is told (no „nothing changed” while the migration rewrites files).
        opts.signal?.throwIfAborted()
        opts.onCommit?.()
        this.applySettingsState()
        tracker.step = 'migrate'
        const tm = performance.now()
        if (!this.folderReadOnlyReason) await this.migrateIfNeeded()
        const migrateMs = Math.round(performance.now() - tm)
        await this.cleanupTempFiles()
        tracker.step = 'prepare'
        const views = this.buildViews()
        this.commit(views)
        this.loadStats = { files: tracker.total, ...times, migrateMs, slow: tracker.slow, slowest: tracker.slowest() }
        return { ...this.snapshotFrom(views), loadMs: Math.round(performance.now() - t0) }
      } finally {
        this.tracker = null
      }
    })
  }

  /** Where the open in progress is (null when none). */
  progress(): LoadProgress | null {
    return this.tracker?.progress() ?? null
  }

  status(): FolderStatus {
    return {
      dataDir: this.root,
      available: this.available,
      readOnly: !!this.folderReadOnlyReason || !this.available,
      readOnlyReason: !this.available
        ? 'Folder danych jest niedostępny (odłączony dysk lub brak dostępu). Zmiany nie są zapisywane.'
        : this.folderReadOnlyReason,
      folderSchemaVersion: this.folderSchemaVersion,
      appSchemaVersion: SCHEMA_VERSION,
      otherMachines: this.otherMachines,
      migratedFrom: this.migratedFrom,
      backupPath: this.backupPath
    }
  }

  // ---------------------------------------------------------------- reading

  private async listDataFiles(tracker?: ReadTracker, signal?: AbortSignal): Promise<string[]> {
    const rels: string[] = []
    const onFile = tracker ? () => void tracker.total++ : undefined
    // One by one: spreading a list of 125k+ names into `push` overflows the call stack (B50).
    for (const c of COLLECTIONS) for (const rel of await walkFiles(this.root, join(this.root, c), isIgnoredPath, { signal, onFile })) rels.push(rel)
    const rootEntries = await fs.readdir(this.root, { withFileTypes: true })
    for (const e of rootEntries) if (e.isFile() && e.name.toLowerCase().endsWith('.json') && !isIgnoredPath(e.name)) rels.push(e.name)
    return rels
  }

  private async scanAll(tracker = new ReadTracker(SLOW_FILE_MS), opts: OpenOptions = {}): Promise<{ listMs: number; readMs: number }> {
    const t0 = performance.now()
    tracker.step = 'list'
    const rels = await this.listDataFiles(tracker, opts.signal)
    tracker.total = rels.length
    tracker.step = 'read'
    const t1 = performance.now()
    const delay = opts.readDelayMs ?? 0
    const states = await mapLimit(
      rels,
      READ_CONCURRENCY,
      async (rel) => {
        tracker.start(rel)
        try {
          if (delay) await new Promise((r) => setTimeout(r, delay))
          return await this.loadFile(rel)
        } finally {
          tracker.end(rel)
        }
      },
      opts.signal
    )
    const next = new Map<string, FileState>()
    states.forEach((s) => s && next.set(s.relPath, s))
    this.files = next
    return { listMs: Math.round(t1 - t0), readMs: Math.round(performance.now() - t1) }
  }

  private async loadFile(rel: string): Promise<FileState | null> {
    const abs = join(this.root, ...rel.split('/'))
    let st
    try {
      st = await fs.stat(abs)
    } catch {
      return null
    }
    if (!st.isFile()) return null
    const prev = this.files.get(rel)
    if (prev && !prev.readError && prev.mtimeMs === st.mtimeMs && prev.size === st.size) return prev
    let buf: Buffer
    try {
      buf = await withRetry(() => fs.readFile(abs))
    } catch (e) {
      // A record read before stays as it was (read again next time – its stamps differ); else a problem read again later.
      if (prev?.status === 'record' && !prev.readError) return prev
      this.unreadable.add(rel)
      return { ...this.problemState(rel, st, '', 'corrupt', `Nie można odczytać pliku (OneDrive może go jeszcze pobierać): ${(e as Error).message}`), readError: true }
    }
    const hash = sha1(buf)
    if (prev && prev.hash === hash) return { ...prev, mtimeMs: st.mtimeMs, size: st.size }
    const text = buf.toString('utf8')

    const canonical = classifyCanonical(rel)
    if (canonical) return this.parseState(rel, canonical, text, hash, st)
    const conflict = detectConflictName(rel)
    if (conflict) {
      const parsed = this.parseState(rel, conflict.kind, text, hash, st)
      return { ...parsed, status: 'copy', conflict, problemKind: null }
    }
    if (rel.toLowerCase().endsWith('.json') && kindOfDir(rel)) {
      return this.problemState(rel, st, hash, 'unknown-file', 'Nieznany plik JSON (nazwa nie pasuje do układu folderu danych).')
    }
    return null
  }

  private problemState(
    rel: string,
    st: { mtimeMs: number; size: number },
    hash: string,
    kind: ProblemKind,
    message: string
  ): FileState {
    return {
      relPath: rel,
      kind: kindOfDir(rel) ?? 'fi',
      mtimeMs: st.mtimeMs,
      size: st.size,
      hash,
      status: 'problem',
      record: null,
      readOnly: true,
      error: message,
      problemKind: kind,
      conflict: null,
      migrated: false,
      fromVersion: SCHEMA_VERSION,
      text: null
    }
  }

  private parseState(rel: string, kind: FileKind, text: string, hash: string, st: { mtimeMs: number; size: number }): FileState {
    const base = {
      relPath: rel,
      kind,
      mtimeMs: st.mtimeMs,
      size: st.size,
      hash,
      conflict: null,
      text
    }
    const outcome = parseRecordText(kind, text, idFromPath(rel))
    if (outcome.ok) {
      return {
        ...base,
        status: 'record',
        record: outcome.value,
        readOnly: false,
        error: null,
        problemKind: null,
        migrated: outcome.migrated,
        fromVersion: outcome.fromVersion
      }
    }
    if (outcome.tooNewVersion != null) {
      // Newer format: show it read-only if it still fits the current schema, never overwrite it.
      try {
        const raw = JSON.parse(text) as Record<string, unknown>
        const parsed = SCHEMAS[kind].safeParse(raw)
        if (parsed.success) {
          return {
            ...base,
            status: 'record',
            record: parsed.data,
            readOnly: true,
            error: outcome.error,
            problemKind: null,
            migrated: false,
            fromVersion: outcome.tooNewVersion
          }
        }
      } catch {
        /* fall through */
      }
      return this.problemState(rel, st, hash, 'too-new', outcome.error)
    }
    const problemKind: ProblemKind = outcome.error.startsWith('Uszkodzony JSON') ? 'corrupt' : 'invalid'
    return { ...this.problemState(rel, st, hash, problemKind, outcome.error), kind }
  }

  private applySettingsState(): void {
    const state = this.files.get(SETTINGS_FILE)
    if (!state || state.status !== 'record' || !state.record) {
      const msg = state?.error ?? 'Brak pliku fi.json'
      throw new Error(`Nie można wczytać fi.json: ${msg}`)
    }
    this.fi = state.record as SettingsFile
    this.folderSchemaVersion = state.readOnly ? state.fromVersion : SCHEMA_VERSION
    this.folderReadOnlyReason = state.readOnly
      ? `Folder danych ma format v${state.fromVersion}, a ta wersja aplikacji obsługuje v${SCHEMA_VERSION}. ` +
        'Zaktualizuj aplikację - do tego czasu dane są tylko do odczytu.'
      : null
  }

  /**
   * fi.json changed on disk while the folder is open. A broken file (e.g. half-synced) must not
   * take the folder down: the last good settings stay in memory and the file shows up as a problem.
   * Returns true when new settings were loaded.
   */
  private refreshSettingsState(): boolean {
    const state = this.files.get(SETTINGS_FILE)
    if (state?.status === 'record' && state.record) {
      this.applySettingsState()
      return true
    }
    if (state?.problemKind === 'too-new') {
      this.folderReadOnlyReason =
        'fi.json zapisała nowsza wersja aplikacji (nowszy format danych). Zaktualizuj aplikację - do tego czasu dane są tylko do odczytu.'
    }
    return false
  }

  // ---------------------------------------------------------------- migrations

  private async migrateIfNeeded(): Promise<void> {
    const pending = [...this.files.values()].filter((s) => s.status === 'record' && s.migrated && !s.readOnly)
    if (pending.length === 0) return
    const settingsState = this.files.get(SETTINGS_FILE)
    const from = pending.reduce((m, s) => Math.min(m, s.fromVersion), SCHEMA_VERSION)
    if (settingsState?.migrated) {
      // Folder-level migration: full ZIP backup first.
      const out = join(this.backupsDir, 'pre-migration', `${stamp(this.opts.now())}_v${from}-v${SCHEMA_VERSION}.zip`)
      await zipFolder(this.root, out, (rel) => !isIgnoredPath(rel))
      this.backupPath = out
      this.migratedFrom = settingsState.fromVersion
    } else {
      await this.backupOriginals(pending)
    }
    for (const s of pending) await this.rewrite(s)
  }

  /** Keep the original text of single migrated files (e.g. synced from an older app version). */
  private async backupOriginals(states: FileState[]): Promise<void> {
    const dir = join(this.backupsDir, 'pre-migration', stamp(this.opts.now()))
    for (const s of states) {
      if (s.text == null) continue
      await writeFileAtomic(join(dir, ...s.relPath.split('/')), s.text)
    }
    this.backupPath = dir
  }

  private async rewrite(s: FileState): Promise<void> {
    const text = serializeRecord(s.kind, s.record as AnyRecord)
    await this.writeState(s.relPath, s.kind, s.record as AnyRecord, text)
  }

  private async writeState(rel: string, kind: FileKind, record: AnyRecord | SettingsFile, text: string): Promise<FileState> {
    const abs = this.abs(rel)
    await writeFileAtomic(abs, text)
    const st = await fs.stat(abs)
    const state: FileState = {
      relPath: rel,
      kind,
      mtimeMs: st.mtimeMs,
      size: st.size,
      hash: sha1(text),
      status: 'record',
      record,
      readOnly: false,
      error: null,
      problemKind: null,
      conflict: null,
      migrated: false,
      fromVersion: SCHEMA_VERSION,
      text
    }
    this.files.set(rel, state)
    return state
  }

  private async cleanupTempFiles(): Promise<void> {
    const cutoff = Date.now() - 60 * 60 * 1000
    for (const dir of COLLECTIONS) {
      const all = await walkFiles(this.root, join(this.root, dir))
      for (const rel of all.filter((r) => r.includes('.tmp-'))) {
        try {
          const st = await fs.stat(join(this.root, rel))
          if (st.mtimeMs < cutoff) await removeFile(join(this.root, rel))
        } catch {
          /* ignore */
        }
      }
    }
  }

  // ---------------------------------------------------------------- views & diffs

  private buildViews(): Views {
    const records = emptyRecords()
    const conflicts: ConflictEntry[] = []
    const problems: Problem[] = []
    const groups = new Map<string, FileState[]>()

    for (const s of this.files.values()) {
      if (s.status === 'problem') {
        problems.push({ relPath: s.relPath, kind: s.problemKind ?? 'invalid', message: s.error ?? '' })
        continue
      }
      if (s.status === 'copy' || s.kind === 'fi') continue
      const id = (s.record as AnyRecord).id
      const key = `${s.kind}:${id}`
      const g = groups.get(key)
      if (g) g.push(s)
      else groups.set(key, [s])
    }

    for (const [key, group] of groups) {
      const kind = key.split(':')[0] as Collection
      const sorted = [...group].sort((a, b) => {
        const ua = (a.record as AnyRecord).updatedAt
        const ub = (b.record as AnyRecord).updatedAt
        if (ua !== ub) return ua < ub ? 1 : -1
        return a.relPath < b.relPath ? -1 : 1
      })
      const primary = sorted[0] as FileState
      records[kind].set((primary.record as AnyRecord).id, primary)
      for (const dup of sorted.slice(1)) {
        conflicts.push({
          id: dup.relPath,
          kind,
          type: 'duplicate',
          source: 'ten sam identyfikator w dwóch plikach',
          canonical: this.side(primary),
          copy: this.side(dup)
        })
      }
    }

    for (const s of this.files.values()) {
      if (s.status !== 'copy' || !s.conflict) continue
      const canonicalState = this.files.get(s.conflict.canonicalPath)
      conflicts.push({
        id: s.relPath,
        kind: s.kind,
        type: 'copy',
        source: s.conflict.source,
        canonical: canonicalState
          ? this.side(canonicalState)
          : { relPath: s.conflict.canonicalPath, record: null, error: 'Brak pliku oryginalnego', updatedAt: null, mtimeMs: 0 },
        copy: this.side(s)
      })
    }

    conflicts.sort((a, b) => a.id.localeCompare(b.id))
    problems.sort((a, b) => a.relPath.localeCompare(b.relPath))
    return { records, conflicts, problems }
  }

  private side(s: FileState): ConflictSide {
    return {
      relPath: s.relPath,
      record: s.record,
      error: s.error,
      updatedAt: (s.record as { updatedAt?: string } | null)?.updatedAt ?? null,
      mtimeMs: s.mtimeMs
    }
  }

  private entry<C extends Collection>(s: FileState): RecordEntry<RecordTypes[C]> {
    return { record: s.record as RecordTypes[C], relPath: s.relPath, readOnly: s.readOnly }
  }

  private snapshotFrom(views: Views): Omit<Snapshot, 'loadMs'> {
    const list = <C extends Collection>(c: C) => [...views.records[c].values()].map((s) => this.entry<C>(s))
    return {
      fi: this.fi,
      records: Object.fromEntries(COLLECTIONS.map((c) => [c, list(c)])) as RecordLists,
      problems: views.problems,
      conflicts: views.conflicts,
      status: this.status()
    }
  }

  private viewKey(s: FileState): ViewKey {
    return `${s.relPath}|${s.hash}|${s.readOnly ? 1 : 0}`
  }

  private metaKey(views: Views): string {
    return JSON.stringify([views.problems, views.conflicts.map((c) => [c.id, c.canonical.mtimeMs, c.copy.mtimeMs]), this.status(), this.fi.updatedAt])
  }

  private commit(views: Views): void {
    for (const c of COLLECTIONS) {
      const keys = new Map<string, ViewKey>()
      for (const [id, s] of views.records[c]) keys.set(id, this.viewKey(s))
      this.prevKeys[c] = keys
    }
    this.prevMeta = this.metaKey(views)
  }

  private diff(views: Views, settingsChanged: boolean, origin: 'external' | 'local' = 'local'): ChangeSet | null {
    const change: ChangeSet = {
      upserts: [],
      removals: [],
      fi: settingsChanged ? this.fi : null,
      problems: views.problems,
      conflicts: views.conflicts,
      status: this.status(),
      origin
    }
    for (const c of COLLECTIONS) {
      const prev = this.prevKeys[c]
      for (const [id, s] of views.records[c]) {
        if (prev.get(id) !== this.viewKey(s)) change.upserts.push({ collection: c, entry: this.entry(s) })
      }
      for (const id of prev.keys()) if (!views.records[c].has(id)) change.removals.push({ collection: c, id })
    }
    const metaChanged = this.metaKey(views) !== this.prevMeta
    this.commit(views)
    if (!change.upserts.length && !change.removals.length && !settingsChanged && !metaChanged) return null
    return change
  }

  // ---------------------------------------------------------------- external changes

  /**
   * Re-read changed files. `paths` = relative paths reported by the watcher; omit for a full rescan.
   * Returns null when nothing visible changed. `origin` 'local' marks a refresh after this app's own action.
   * `settingsWritten`: fi.json was just rewritten by this store (a resolved conflict) – the change set carries it.
   */
  refresh(paths?: string[], origin: 'external' | 'local' = 'external', settingsWritten = false): Promise<ChangeSet | null> {
    return this.mutex.run(async () => {
      const wasAvailable = this.available
      this.available = (await DataStore.inspect(this.root)) === 'data'
      if (!this.available) {
        // Keep everything in memory; the folder may come back (pendrive, network drive).
        return wasAvailable ? this.diff(this.buildViews(), false, origin) : null
      }
      const settingsBefore = this.files.get(SETTINGS_FILE)?.hash
      const needsFull = !paths || !wasAvailable || paths.some((p) => !p.toLowerCase().endsWith('.json'))
      if (needsFull) {
        const rels = await this.listDataFiles()
        const seen = new Set(rels)
        const states = await mapLimit(rels, READ_CONCURRENCY, (rel) => this.loadFile(rel))
        for (const rel of [...this.files.keys()]) if (!seen.has(rel)) this.files.delete(rel)
        states.forEach((s) => s && this.files.set(s.relPath, s))
      } else {
        const gone: FileState[] = []
        for (const p of new Set(paths)) {
          const rel = sanitizeRelPath(p)
          if (!rel || isIgnoredPath(rel)) continue
          const s = await this.loadFile(rel)
          if (s) this.files.set(rel, s)
          else {
            const old = this.files.get(rel)
            if (old) gone.push(old)
            this.files.delete(rel)
          }
        }
        // A record moved by a date change on another computer: the watcher may report its old file's removal before
        // the new file – read the new one now, so the change is an update, not a removal. One walk of a
        // collection for all its removed records.
        const lost = new Map<Collection, Set<string>>()
        for (const old of gone) {
          if (old.status !== 'record' || old.kind === 'fi' || !old.record) continue
          const id = (old.record as AnyRecord).id
          if (this.currentState(old.kind, id)) continue
          const ids = lost.get(old.kind) ?? new Set<string>()
          lost.set(old.kind, ids.add(id))
        }
        for (const [kind, ids] of lost) {
          const found = await this.findMoved(kind, ids)
          for (const id of ids) if (!found.has(id)) this.removedOutside.add(`${kind}:${id}`)
        }
      }
      const settingsChanged = settingsWritten || (this.files.get(SETTINGS_FILE)?.hash !== settingsBefore && this.refreshSettingsState())
      if (!this.folderReadOnlyReason) {
        const migrated = [...this.files.values()].filter((s) => s.status === 'record' && s.migrated && !s.readOnly)
        if (migrated.length) {
          await this.backupOriginals(migrated)
          for (const s of migrated) await this.rewrite(s)
        }
      }
      return this.diff(this.buildViews(), settingsChanged, origin)
    })
  }

  // ---------------------------------------------------------------- writing

  private assertWritable(): void {
    const status = this.status()
    if (status.readOnly) throw new ReadOnlyError(status.readOnlyReason ?? 'Tylko do odczytu')
  }

  /**
   * The file of a record under a path this store has not read yet: the collections whose file name ends with the id
   * and whose path holds a date (transactions, dockings, balances) – another computer changed the date, the new file is
   * on disk, the watcher has not reported it. Every such file found is loaded; returns the record's state.
   */
  private async findMoved(collection: Collection, ids: ReadonlySet<string>): Promise<Map<string, FileState>> {
    const found = new Map<string, FileState>()
    if (!ID_NAMED.has(collection) || ids.size === 0) return found
    for (const rel of await walkFiles(this.root, join(this.root, collection), isIgnoredPath).catch(() => [] as string[])) {
      if (!rel.endsWith('.json') || this.files.has(rel)) continue
      if (!ids.has(rel.slice(rel.lastIndexOf('_') + 1, -'.json'.length))) continue
      const st = await this.loadFile(rel)
      if (!st) continue
      this.files.set(rel, st)
      const id = (st.record as AnyRecord | null)?.id
      if (st.status === 'record' && st.kind === collection && id && ids.has(id)) found.set(id, st)
    }
    return found
  }

  /**
   * Another file of the same record sits where it is about to be written (a duplicate id from two computers, each
   * with another date): its version is kept in the history before it is overwritten; one in a newer format is
   * never replaced.
   */
  private async keepDuplicate(occupant: FileState | undefined, existing: FileState | null, kind: Collection, id: string): Promise<void> {
    if (occupant?.status !== 'record' || occupant === existing || (occupant.record as AnyRecord | null)?.id !== id) return
    if (occupant.readOnly) throw new ReadOnlyError(`Plik ${occupant.relPath} zapisała nowsza wersja aplikacji – zaktualizuj aplikację, żeby go zmienić.`)
    await this.history.snapshot(kind, occupant.record as AnyRecord, 'discarded')
  }

  private currentState(collection: Collection, id: string): FileState | null {
    const candidates = [...this.files.values()].filter(
      (s) => s.status === 'record' && s.kind === collection && (s.record as AnyRecord).id === id
    )
    if (candidates.length === 0) return null
    return candidates.sort((a, b) => ((a.record as AnyRecord).updatedAt < (b.record as AnyRecord).updatedAt ? 1 : -1))[0] ?? null
  }

  /**
   * A corrupt / invalid file sits where a record is about to be written (e.g. a half-synced day plan):
   * move it aside as a conflict copy instead of overwriting it. A file in a newer format is never replaced.
   */
  private async setAsideProblem(state: FileState): Promise<void> {
    if (state.problemKind === 'too-new') {
      throw new ReadOnlyError(`Plik ${state.relPath} zapisała nowsza wersja aplikacji – zaktualizuj aplikację, żeby go zmienić.`)
    }
    // Unreadable now, not broken: never moved aside – the write waits (B42).
    if (state.readError) throw new Error(`Plik ${state.relPath} jest teraz niedostępny (OneDrive może go jeszcze pobierać) – zapis wstrzymany, spróbuj za chwilę.`)
    const copyRel = state.relPath.replace(/\.json$/i, `-uszkodzona-${stamp(this.opts.now())}.json`)
    try {
      await withRetry(() => fs.rename(this.abs(state.relPath), this.abs(copyRel)))
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
    this.files.delete(state.relPath)
    const copy = await this.loadFile(copyRel)
    if (copy) this.files.set(copyRel, copy)
  }

  /**
   * If the file on disk changed behind our back, keep that version as a conflict copy before overwriting – unless it
   * says the same as the version being written or as the one this write started from (only the stamps differ: e.g.
   * another computer made the same change).
   */
  private async preserveExternalChange(existing: FileState, kind: FileKind, next: AnyRecord | SettingsFile, target = existing.relPath): Promise<void> {
    const abs = this.abs(existing.relPath)
    let buf: Buffer
    try {
      const st = await fs.stat(abs)
      if (st.mtimeMs === existing.mtimeMs && st.size === existing.size) return
      buf = await fs.readFile(abs)
    } catch {
      return
    }
    if (sha1(buf) === existing.hash) return
    const theirs = SCHEMAS[kind].safeParse(parseJsonSafe(buf.toString('utf8')))
    if (theirs.success && (sameContent(theirs.data, next) || (existing.record != null && sameContent(theirs.data, existing.record)))) return
    await this.keepCopy(buf, target)
  }

  /**
   * A version from outside kept as a conflict copy of `target` – named after where the record is written (a changed
   * date moves it), so the conflict pairs it with the version written now, not with a path about to be removed.
   */
  private async keepCopy(buf: Buffer, target: string): Promise<void> {
    const copyRel = target.replace(/\.json$/, `-zewnetrzna-${stamp(this.opts.now())}.json`)
    await writeFileAtomic(this.abs(copyRel), buf)
    const st = await this.loadFile(copyRel)
    if (st) this.files.set(copyRel, st)
  }

  /**
   * Files that could not be read (B42) and concern this write – its record's (the id in the name) or the one at its
   * path: read again first, OneDrive may have brought them. Only those: a folder offline may have thousands.
   */
  private async reread(concerns: (rel: string) => boolean): Promise<void> {
    for (const rel of [...this.unreadable]) {
      // Read since (or gone): no longer one of them.
      if (!this.files.get(rel)?.readError) {
        this.unreadable.delete(rel)
        continue
      }
      if (!concerns(rel)) continue
      this.unreadable.delete(rel)
      const again = await this.loadFile(rel)
      if (again) this.files.set(rel, again)
      else this.files.delete(rel)
    }
  }

  saveRecord<C extends Collection>(collection: C, input: RecordTypes[C]): Promise<{ entry: RecordEntry<RecordTypes[C]>; change: ChangeSet | null }> {
    return this.mutex.run(async () => {
      this.assertWritable()
      await this.reread((rel) => rel.includes(input.id))
      // Seen removed from outside: maybe moved on another computer, its new file not reported yet – then this
      // write replaces that file instead of adding a duplicate under the old date, and that version stays as a conflict
      // copy (the user decides; "keep mine" answered a removal, not that edit).
      const removedKey = `${collection}:${input.id}`
      let moved = !this.currentState(collection, input.id) && this.removedOutside.has(removedKey) ? ((await this.findMoved(collection, new Set([input.id]))).get(input.id) ?? null) : null
      // Its file gone this moment (another computer deleted or moved it, the watcher not here yet – B49): a move is taken
      // like a reported one; a removal is never undone by this write – the window gets it and asks.
      const known = this.currentState(collection, input.id)
      if (known && !moved && !(await pathExists(this.abs(known.relPath)))) {
        this.files.delete(known.relPath)
        moved = (await this.findMoved(collection, new Set([input.id]))).get(input.id) ?? null
        if (!moved) {
          this.removedOutside.add(removedKey)
          throw new RemovedOutsideError(known.relPath, this.diff(this.buildViews(), false, 'external'))
        }
      }
      const parsed = SCHEMAS[collection].safeParse({
        ...input,
        schemaVersion: SCHEMA_VERSION,
        updatedAt: this.opts.now(),
        updatedBy: this.opts.machineName
      })
      if (!parsed.success) throw new Error(`Niepoprawne dane: ${parsed.error.issues[0]?.path.join('.')}: ${parsed.error.issues[0]?.message}`)
      const record = parsed.data as RecordTypes[C]
      const rel = recordRelPath(collection, record as unknown as Record<string, unknown>)
      await this.reread((r) => r === rel)
      const existing = this.currentState(collection, input.id)
      if (existing?.readOnly) throw new ReadOnlyError('Ten wpis zapisała nowsza wersja aplikacji - jest tylko do odczytu.')
      const occupant = this.files.get(rel)
      if (occupant?.status === 'record' && (occupant.record as AnyRecord).id !== record.id) {
        // The month's file of another record (two computers made the month's plan before syncing – B46): this version
        // waits beside it as a sync copy for the user to pick – never written over it, never retried for ever.
        if (LAYOUTS[collection] === 'month') {
          const copyRel = rel.replace(/\.json$/, `-${this.opts.machineName.replace(/[^0-9A-Za-z]+/g, '-') || 'PC'}.json`)
          await writeFileAtomic(this.abs(copyRel), serializeRecord(collection, record))
          const copy = await this.loadFile(copyRel)
          if (copy) this.files.set(copyRel, copy)
          throw new ConflictCopyError(copyRel, this.diff(this.buildViews(), false))
        }
        throw new Error(`Plik ${rel} należy do innego wpisu (np. plan tego miesiąca już istnieje).`)
      }
      if (occupant?.status === 'problem') await this.setAsideProblem(occupant)
      await this.keepDuplicate(occupant, existing, collection, record.id)
      if (moved && existing === moved && existing.record && !sameContent(existing.record, record)) {
        const buf = await fs.readFile(this.abs(existing.relPath)).catch(() => null)
        if (buf) await this.keepCopy(buf, rel)
      } else if (existing) await this.preserveExternalChange(existing, collection, record as AnyRecord, rel)
      if (existing?.record) await this.history.snapshot(collection, existing.record as AnyRecord, 'edit')
      const text = serializeRecord(collection, record)
      const state = await this.writeState(rel, collection, record, text)
      this.removedOutside.delete(removedKey)
      if (existing && existing.relPath !== rel) {
        await removeFile(this.abs(existing.relPath))
        this.files.delete(existing.relPath)
      }
      const change = this.diff(this.buildViews(), false)
      return { entry: this.entry<C>(state), change }
    })
  }

  /**
   * Records the app writes itself (e.g. frozen game months): many at once, one change set, no versions in `.history/`
   * (the app reproduces them). Fields the user owns (`keep`) are carried over from the file.
   */
  saveGenerated<C extends Collection>(collection: C, inputs: readonly RecordTypes[C][], keep: readonly string[] = []): Promise<ChangeSet | null> {
    return this.mutex.run(async () => {
      this.assertWritable()
      for (const input of inputs) {
        const existing = this.currentState(collection, input.id)
        if (existing?.readOnly) continue
        const old = (existing?.record ?? null) as Record<string, unknown> | null
        const carried: Record<string, unknown> = {}
        for (const k of keep) if (old && old[k] !== null && old[k] !== undefined) carried[k] = old[k]
        const parsed = SCHEMAS[collection].safeParse({ ...input, ...carried, schemaVersion: SCHEMA_VERSION, updatedAt: this.opts.now(), updatedBy: this.opts.machineName })
        if (!parsed.success) continue
        const record = parsed.data as RecordTypes[C]
        const rel = recordRelPath(collection, record as unknown as Record<string, unknown>)
        const occupant = this.files.get(rel)
        if (occupant?.status === 'record' && (occupant.record as AnyRecord).id !== record.id) continue
        if (occupant?.status === 'problem') {
          if (occupant.problemKind === 'too-new' || occupant.readError) continue
          await this.setAsideProblem(occupant)
        }
        await this.writeState(rel, collection, record, serializeRecord(collection, record))
        if (existing && existing.relPath !== rel) {
          await removeFile(this.abs(existing.relPath))
          this.files.delete(existing.relPath)
        }
      }
      return this.diff(this.buildViews(), false)
    })
  }

  deleteRecord(collection: Collection, id: string): Promise<ChangeSet | null> {
    return this.mutex.run(async () => {
      this.assertWritable()
      const state = this.currentState(collection, id)
      if (!state) return null
      if (state.readOnly) throw new ReadOnlyError('Ten wpis jest tylko do odczytu.')
      const kept = await this.history.snapshot(collection, state.record as AnyRecord, 'delete')
      try {
        await this.opts.trash(this.abs(state.relPath))
      } catch (e) {
        // The file stays (held by OneDrive, an antivirus): no „deleted” version in the history either (B9).
        await this.history.drop(kept)
        throw new Error(`Nie udało się usunąć pliku ${state.relPath} (zajęty przez inny program?) – spróbuj ponownie. ${(e as Error).message}`)
      }
      this.files.delete(state.relPath)
      return this.diff(this.buildViews(), false)
    })
  }

  /** Write imported records as-is (keeping their updatedAt), moving files whose canonical path changed. */
  importRecords(items: Array<{ kind: Collection; record: AnyRecord }>): Promise<ChangeSet | null> {
    return this.mutex.run(async () => {
      this.assertWritable()
      for (const { kind, record } of items) {
        const parsed = SCHEMAS[kind].parse({ ...record, schemaVersion: SCHEMA_VERSION }) as AnyRecord
        const existing = this.currentState(kind, parsed.id)
        if (existing?.readOnly) continue
        const rel = recordRelPath(kind, parsed as unknown as Record<string, unknown>)
        const occupant = this.files.get(rel)
        if (occupant?.status === 'record' && (occupant.record as AnyRecord).id !== parsed.id) {
          if (occupant.readOnly) continue
          // The same month's file with a different id: the imported one replaces it.
          await this.opts.trash(this.abs(rel))
          this.files.delete(rel)
        }
        if (occupant?.status === 'problem') {
          if (occupant.problemKind === 'too-new') continue
          await this.setAsideProblem(occupant)
        }
        if (occupant?.status === 'record' && occupant !== existing && occupant.readOnly) continue
        await this.keepDuplicate(occupant, existing, kind, parsed.id)
        if (existing?.record) await this.history.snapshot(kind, existing.record as AnyRecord, 'import')
        await this.writeState(rel, kind, parsed, serializeRecord(kind, parsed))
        if (existing && existing.relPath !== rel) {
          await removeFile(this.abs(existing.relPath))
          this.files.delete(existing.relPath)
        }
      }
      return this.diff(this.buildViews(), false)
    })
  }

  saveSettings(input: SettingsFile): Promise<SettingsFile> {
    return this.mutex.run(async () => {
      this.assertWritable()
      const fi = SCHEMAS.fi.parse({ ...input, schemaVersion: SCHEMA_VERSION, updatedAt: this.opts.now(), updatedBy: this.opts.machineName })
      await this.reread((rel) => rel === SETTINGS_FILE)
      const existing = this.files.get(SETTINGS_FILE)
      if (existing?.status === 'problem') await this.setAsideProblem(existing)
      else if (existing) await this.preserveExternalChange(existing, 'fi', fi)
      if (existing?.status === 'record' && existing.record) await this.history.snapshot('fi', existing.record as SettingsFile, 'edit')
      await this.writeState(SETTINGS_FILE, 'fi', fi, serializeRecord('fi', fi))
      this.fi = fi
      this.commit(this.buildViews())
      return fi
    })
  }

  // ---------------------------------------------------------------- conflicts & problems

  async resolveConflict(conflictId: string, keep: 'canonical' | 'copy'): Promise<ChangeSet | null> {
    // Keeping a copy of fi.json rewrites it here: the window must get the kept settings (the rescan sees no new hash).
    let settingsWritten = false
    await this.mutex.run(async () => {
      this.assertWritable()
      const conflict = this.buildViews().conflicts.find((c) => c.id === conflictId)
      if (!conflict) throw new Error('Konflikt już nie istnieje (mógł zostać rozwiązany na innym komputerze).')
      const canonicalState = this.files.get(conflict.canonical.relPath)
      const copyState = this.files.get(conflict.copy.relPath)
      // The version let go goes to the history first – it syncs to every computer, the bin does not (B44): a version of
      // the record kept – a month's plan of another id (B46) too, never a „deleted” record to bring back over the month.
      const keepAside = async (state: FileState | undefined, keptId: string) => {
        if (state?.status === 'problem' || !state?.record) return
        const record = state.record as AnyRecord
        const month = conflict.kind !== 'fi' && LAYOUTS[conflict.kind] === 'month'
        await this.history.snapshot(conflict.kind, month && record.id !== keptId ? { ...record, id: keptId } : record, 'discarded')
      }
      if (keep === 'canonical') {
        // No original to keep (missing, unreadable): never the only readable version thrown away (B45).
        if (canonicalState?.status !== 'record' || !canonicalState.record) throw new Error('Oryginału nie ma albo nie da się go odczytać – zachowaj kopię.')
        await keepAside(copyState, (canonicalState.record as AnyRecord).id)
        await this.opts.trash(this.abs(conflict.copy.relPath))
        this.files.delete(conflict.copy.relPath)
        return
      }
      if (!copyState?.record) throw new Error('Kopii nie da się odczytać - można zachować tylko oryginał.')
      // A newer format is never written over, nor written by this version (B45).
      if (copyState.readOnly) throw new ReadOnlyError('Kopię zapisała nowsza wersja aplikacji – zaktualizuj aplikację, żeby ją zachować.')
      if (canonicalState?.readOnly || canonicalState?.problemKind === 'too-new') throw new ReadOnlyError('Oryginał zapisała nowsza wersja aplikacji – nie zostanie nadpisany; zaktualizuj aplikację.')
      await keepAside(canonicalState, (copyState.record as AnyRecord).id)
      // A broken original is moved aside, never overwritten (B45).
      if (canonicalState?.status === 'problem') await this.setAsideProblem(canonicalState)
      // The kept version is rewritten (newest updatedAt) at its canonical path; every other file of the pair goes to the bin.
      let keptPath: string
      let keptId: string
      if (conflict.kind === 'fi') {
        const fi = SCHEMAS.fi.parse({ ...(copyState.record as SettingsFile), updatedAt: this.opts.now() })
        await this.writeState(SETTINGS_FILE, 'fi', fi, serializeRecord('fi', fi))
        this.fi = fi
        settingsWritten = true
        keptPath = SETTINGS_FILE
        keptId = fi.id
      } else {
        const kind = conflict.kind as Collection
        const record = { ...(copyState.record as AnyRecord), updatedAt: this.opts.now() } as AnyRecord
        keptPath = recordRelPath(kind, record as unknown as Record<string, unknown>)
        keptId = record.id
        await this.writeState(keptPath, kind, record, serializeRecord(kind, record))
      }
      for (const side of [conflict.canonical, conflict.copy]) {
        if (side.relPath === keptPath) continue
        const state = this.files.get(side.relPath)
        if (!state) continue
        const sameRecord = (state.record as { id?: string } | null)?.id === keptId
        if (state.status !== 'record' || sameRecord) {
          await this.opts.trash(this.abs(side.relPath))
          this.files.delete(side.relPath)
        }
      }
    })
    return this.refresh(undefined, 'local', settingsWritten)
  }

  async trashFile(relPath: string): Promise<ChangeSet | null> {
    await this.mutex.run(async () => {
      this.assertWritable()
      const s = this.files.get(relPath)
      if (!s || s.status === 'record') throw new Error('Można usuwać tylko pliki z listy problemów lub kopie konfliktów.')
      await this.opts.trash(this.abs(relPath))
      this.files.delete(relPath)
    })
    return this.refresh(undefined, 'local')
  }

  // ---------------------------------------------------------------- history

  historyList(kind: HistoryKind, id: string): Promise<HistoryEntry[]> {
    return this.history.list(kind, id)
  }

  historyRead(kind: HistoryKind, id: string, file: string): Promise<unknown> {
    return this.history.read(kind, id, file)
  }

  historyDeleted(collection: Collection): Promise<Array<HistoryEntry & { id: string; record: unknown }>> {
    return this.mutex.run(async () => {
      const existing = new Set(this.buildViews().records[collection].keys())
      return this.history.deleted(collection, existing)
    })
  }

  /** Keep a version that is dropped without ever being written (local edits discarded when merging). */
  async historyKeep(kind: HistoryKind, record: unknown, reason: HistoryReason): Promise<void> {
    if (this.status().readOnly) return
    if (!record || typeof record !== 'object') return
    await this.history.snapshot(kind, record as AnyRecord, reason)
  }

  /**
   * Make a kept version current again: the current version (if any) is kept first, the old one is written with a
   * new updatedAt at its canonical path (a deleted record comes back).
   */
  historyRestore(kind: HistoryKind, id: string, file: string): Promise<{ change: ChangeSet | null; fi: SettingsFile | null }> {
    return this.mutex.run(async () => {
      this.assertWritable()
      const old = await this.history.read(kind, id, file)
      if (!old) throw new Error('Tej wersji nie ma już w historii (mogła zostać usunięta na innym komputerze).')
      const stampNow = { schemaVersion: SCHEMA_VERSION, updatedAt: this.opts.now(), updatedBy: this.opts.machineName }
      if (kind === 'fi') {
        const fi = SCHEMAS.fi.parse({ ...old, ...stampNow })
        const existing = this.files.get(SETTINGS_FILE)
        if (existing?.status === 'record' && existing.record) await this.history.snapshot('fi', existing.record as SettingsFile, 'restore')
        await this.writeState(SETTINGS_FILE, 'fi', fi, serializeRecord('fi', fi))
        this.fi = fi
        this.commit(this.buildViews())
        return { change: null, fi }
      }
      const parsed = SCHEMAS[kind].safeParse({ ...old, id, ...stampNow })
      if (!parsed.success) throw new Error(`Tej wersji nie da się odtworzyć: ${parsed.error.issues[0]?.path.join('.')}: ${parsed.error.issues[0]?.message}`)
      const record = parsed.data as AnyRecord
      const existing = this.currentState(kind, id)
      if (existing?.readOnly) throw new ReadOnlyError('Ten wpis jest tylko do odczytu.')
      const rel = recordRelPath(kind, record as unknown as Record<string, unknown>)
      const occupant = this.files.get(rel)
      if (occupant?.status === 'record' && (occupant.record as AnyRecord).id !== id) {
        throw new Error(`Plik ${rel} należy do innego wpisu (np. plan tego miesiąca już istnieje) – usuń go albo zmień datę.`)
      }
      if (occupant?.status === 'problem') await this.setAsideProblem(occupant)
      await this.keepDuplicate(occupant, existing, kind, id)
      if (existing?.record) await this.history.snapshot(kind, existing.record as AnyRecord, 'restore')
      await this.writeState(rel, kind, record, serializeRecord(kind, record))
      if (existing && existing.relPath !== rel) {
        await removeFile(this.abs(existing.relPath))
        this.files.delete(existing.relPath)
      }
      return { change: this.diff(this.buildViews(), false), fi: null }
    })
  }

  /** Snapshot of everything currently loaded (used after reconnecting the renderer). */
  snapshot(): Promise<Snapshot> {
    return this.mutex.run(async () => ({ ...this.snapshotFrom(this.buildViews()), loadMs: 0 }))
  }

  /** The writes queued so far are done (quitting waits for them – B43). */
  idle(): Promise<void> {
    return this.mutex.idle()
  }

  /** Directory of a file, for "show in folder". */
  dirOf(rel: string): string {
    return dirname(this.abs(rel))
  }
}
