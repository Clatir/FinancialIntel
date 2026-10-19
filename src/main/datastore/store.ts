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
import { isDataFile } from './backup'
import { diskSource, writeZipFile, zipFolder, type ZipResult, type ZipSource } from './zip'

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

type FileStat = { mtimeMs: number; size: number }

/** One conflict of `resolveConflicts`: resolved, failed (why) or left as it is (`skipped`). */
export type ConflictResult = { id: string; error?: string; skipped?: boolean }

/** One record of `saveRecords`: written (the entry as on the disk) or why not. */
export type SaveResult<C extends Collection> = { id: string; entry?: RecordEntry<RecordTypes[C]>; error?: string }

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

/**
 * The files read, by path – with what keeps a write cheap at any size of the folder (W8): the paths of each record
 * (`kind:id`), of the problems and of the conflict copies, and what changed since the views were last built.
 */
class FileMap extends Map<string, FileState> {
  readonly ids = new Map<string, Set<string>>()
  readonly problemPaths = new Set<string>()
  readonly copyPaths = new Set<string>()
  /** The files directly in each directory ('' = the folder's root) – a directory's event compares its entries (W22). */
  readonly dirs = new Map<string, Set<string>>()
  /** Records read in an older format and not rewritten yet. */
  readonly migratedPaths = new Set<string>()
  /** Copies by the path of their original (a change of an original changes its conflict). */
  private readonly canonicals = new Map<string, number>()
  /** Records (`kind:id`) changed since the views were built. */
  readonly dirty = new Set<string>()
  /** Problems or conflicts changed since the views were built. */
  metaDirty = true

  static keyOf(s: FileState): string | null {
    return s.status === 'record' && s.kind !== 'fi' && s.record ? `${s.kind}:${(s.record as AnyRecord).id}` : null
  }

  override set(rel: string, s: FileState): this {
    const prev = super.get(rel)
    if (prev) this.track(rel, prev, -1)
    else this.inDir(rel, 1)
    super.set(rel, s)
    this.track(rel, s, 1)
    return this
  }

  override delete(rel: string): boolean {
    const prev = super.get(rel)
    if (!prev) return false
    this.track(rel, prev, -1)
    this.inDir(rel, -1)
    return super.delete(rel)
  }

  /** Whether any file under `dir` (in it or deeper) is known. */
  hasUnder(dir: string): boolean {
    for (const d of this.dirs.keys()) if (d === dir || d.startsWith(`${dir}/`)) return true
    return false
  }

  private inDir(rel: string, sign: 1 | -1): void {
    const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
    let files = this.dirs.get(dir)
    if (sign > 0) {
      if (!files) this.dirs.set(dir, (files = new Set()))
      files.add(rel)
    } else if (files) {
      files.delete(rel)
      if (!files.size) this.dirs.delete(dir)
    }
  }

  private track(rel: string, s: FileState, sign: 1 | -1): void {
    const key = FileMap.keyOf(s)
    if (key) {
      let paths = this.ids.get(key)
      if (sign > 0) {
        if (!paths) this.ids.set(key, (paths = new Set()))
        paths.add(rel)
      } else if (paths) {
        paths.delete(rel)
        if (!paths.size) this.ids.delete(key)
      }
      this.dirty.add(key)
    }
    if (s.status === 'record' && s.migrated && !s.readOnly) {
      if (sign > 0) this.migratedPaths.add(rel)
      else this.migratedPaths.delete(rel)
    }
    if (s.status === 'problem') {
      if (sign > 0) this.problemPaths.add(rel)
      else this.problemPaths.delete(rel)
      this.metaDirty = true
    }
    if (s.status === 'copy') {
      if (sign > 0) this.copyPaths.add(rel)
      else this.copyPaths.delete(rel)
      const canonical = s.conflict?.canonicalPath
      if (canonical) {
        const n = (this.canonicals.get(canonical) ?? 0) + sign
        if (n > 0) this.canonicals.set(canonical, n)
        else this.canonicals.delete(canonical)
      }
      this.metaDirty = true
    }
    if (this.canonicals.has(rel)) this.metaDirty = true
  }
}

/** A record's files, the one that counts first: the newest `updatedAt`, then the path. */
const byNewest = (a: FileState, b: FileState): number => {
  const ua = (a.record as AnyRecord).updatedAt
  const ub = (b.record as AnyRecord).updatedAt
  if (ua !== ub) return ua < ub ? 1 : -1
  return a.relPath < b.relPath ? -1 : 1
}

function stamp(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
}

/** A file's stat and content through one open (W24); null = not a file. */
async function readWithStat(abs: string): Promise<{ st: { mtimeMs: number; size: number }; buf: Buffer } | null> {
  const fh = await withRetry(() => fs.open(abs, 'r'))
  try {
    const st = await fh.stat()
    if (!st.isFile()) return null
    return { st, buf: await fh.readFile() }
  } finally {
    await fh.close()
  }
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
  private files = new FileMap()
  /** The views built last (W8): rebuilt where the files changed – never walked whole at every write. */
  private views: Views | null = null
  /** The duplicate-id conflicts of each record (`kind:id`), kept with the views. */
  private dupConflicts = new Map<string, ConflictEntry[]>()
  /** Records (`kind:id`) whose view may have changed since the last change set; null = any (a full build since). */
  private uncommitted: Set<string> | null = null
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
        const temps: string[] = []
        const times = await this.scanAll(tracker, opts, temps)
        // Stopped: an open nobody waits for any more never migrates or cleans up the folder. Past this point it is
        // not stopped any more – the caller is told (no „nothing changed” while the migration rewrites files).
        opts.signal?.throwIfAborted()
        opts.onCommit?.()
        this.applySettingsState()
        tracker.step = 'migrate'
        const tm = performance.now()
        if (!this.folderReadOnlyReason) await this.migrateIfNeeded()
        const migrateMs = Math.round(performance.now() - tm)
        await this.cleanupTempFiles(temps)
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

  /** The data files of the folder; the temp files of interrupted writes met on the way go to `temps` (W24). */
  private async listDataFiles(tracker?: ReadTracker, signal?: AbortSignal, temps?: string[]): Promise<string[]> {
    const rels: string[] = []
    const onFile = tracker ? () => void tracker.total++ : undefined
    const skip = (rel: string) => {
      if (!isIgnoredPath(rel)) return false
      if (temps && rel.includes('.tmp-')) temps.push(rel)
      return true
    }
    // One by one: spreading a list of 125k+ names into `push` overflows the call stack (B50).
    for (const c of COLLECTIONS) for (const rel of await walkFiles(this.root, join(this.root, c), skip, { signal, onFile })) rels.push(rel)
    const rootEntries = await fs.readdir(this.root, { withFileTypes: true })
    for (const e of rootEntries) if (e.isFile() && !skip(e.name) && e.name.toLowerCase().endsWith('.json')) rels.push(e.name)
    return rels
  }

  private async scanAll(tracker = new ReadTracker(SLOW_FILE_MS), opts: OpenOptions = {}, temps?: string[]): Promise<{ listMs: number; readMs: number }> {
    const t0 = performance.now()
    tracker.step = 'list'
    const rels = await this.listDataFiles(tracker, opts.signal, temps)
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
    const next = new FileMap()
    states.forEach((s) => s && next.set(s.relPath, s))
    this.files = next
    this.views = null
    return { listMs: Math.round(t1 - t0), readMs: Math.round(performance.now() - t1) }
  }

  private async loadFile(rel: string): Promise<FileState | null> {
    const abs = join(this.root, ...rel.split('/'))
    const prev = this.files.get(rel)
    let st: { mtimeMs: number; size: number }
    let buf: Buffer
    if (prev && !prev.readError) {
      // Known: read again only when its stat says it changed.
      let now
      try {
        now = await fs.stat(abs)
      } catch {
        return null
      }
      if (!now.isFile()) return null
      if (prev.mtimeMs === now.mtimeMs && prev.size === now.size) return prev
      st = now
      try {
        buf = await withRetry(() => fs.readFile(abs))
      } catch (e) {
        // A record read before stays as it was (read again next time – its stamps differ); else a problem read again later.
        if (prev.status === 'record') return prev
        return this.unreadableState(rel, st, e)
      }
    } else {
      // Nothing to compare with (an open, a new file): one open for the stat and the content (W24).
      try {
        const read = await readWithStat(abs)
        if (!read) return null
        ;({ st, buf } = read)
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code
        if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'EISDIR') return null
        return this.unreadableState(rel, (await fs.stat(abs).catch(() => null)) ?? { mtimeMs: 0, size: 0 }, e)
      }
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

  /** A file that could not be read (B42): a problem read again next time. */
  private unreadableState(rel: string, st: { mtimeMs: number; size: number }, e: unknown): FileState {
    this.unreadable.add(rel)
    return { ...this.problemState(rel, st, '', 'corrupt', `Nie można odczytać pliku (OneDrive może go jeszcze pobierać): ${(e as Error).message}`), readError: true }
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
    const outcome = parseRecordText(kind, text, idFromPath(rel))
    const base = {
      relPath: rel,
      kind,
      mtimeMs: st.mtimeMs,
      size: st.size,
      hash,
      conflict: null,
      // The text only of what a migration rewrites (its original kept first – `backupOriginals`); else half the
      // store's memory for nothing (W26).
      text: outcome.ok && outcome.migrated ? text : null
    }
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
    const pending = [...this.files.migratedPaths].map((rel) => this.files.get(rel)!)
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
      text: null
    }
    this.files.set(rel, state)
    return state
  }

  /** Temp files of writes interrupted over an hour ago (met by the open's listing – W24) are removed. */
  private async cleanupTempFiles(temps: readonly string[]): Promise<void> {
    const cutoff = Date.now() - 60 * 60 * 1000
    for (const rel of temps) {
      try {
        const abs = join(this.root, ...rel.split('/'))
        const st = await fs.stat(abs)
        if (st.isFile() && st.mtimeMs < cutoff) await removeFile(abs)
      } catch {
        /* ignore */
      }
    }
  }

  // ---------------------------------------------------------------- views & diffs

  /** The views: built whole the first time, then updated where the files changed (W8). */
  private buildViews(): Views {
    const views = this.views ? this.updateViews(this.views) : this.fullViews()
    if (process.env.FI_VERIFY_VIEWS) this.verifyViews(views)
    return views
  }

  /** The views from all the files, the caches set from them. */
  private fullViews(): Views {
    const { views, dups } = this.computeViews()
    this.views = views
    this.dupConflicts = dups
    this.files.dirty.clear()
    this.files.metaDirty = false
    this.uncommitted = null
    return views
  }

  private computeViews(): { views: Views; dups: Map<string, ConflictEntry[]> } {
    const records = emptyRecords()
    const dups = new Map<string, ConflictEntry[]>()
    for (const [key, paths] of this.files.ids) {
      const kind = key.slice(0, key.indexOf(':')) as Collection
      const sorted = [...paths].map((rel) => this.files.get(rel)!).sort(byNewest)
      const primary = sorted[0]!
      records[kind].set((primary.record as AnyRecord).id, primary)
      if (sorted.length > 1) dups.set(key, sorted.slice(1).map((dup) => this.duplicateConflict(kind, primary, dup)))
    }
    return { views: { records, problems: this.problemList(), conflicts: this.conflictList(dups) }, dups }
  }

  /** The views where the files changed since they were built: the records touched, problems and conflicts when changed. */
  private updateViews(views: Views): Views {
    const files = this.files
    for (const key of files.dirty) {
      const i = key.indexOf(':')
      const kind = key.slice(0, i) as Collection
      const id = key.slice(i + 1)
      const sorted = [...(files.ids.get(key) ?? [])].map((rel) => files.get(rel)!).sort(byNewest)
      const primary = sorted[0]
      if (primary) views.records[kind].set(id, primary)
      else views.records[kind].delete(id)
      if (sorted.length > 1) {
        this.dupConflicts.set(key, sorted.slice(1).map((dup) => this.duplicateConflict(kind, primary!, dup)))
        files.metaDirty = true
      } else if (this.dupConflicts.delete(key)) files.metaDirty = true
      this.uncommitted?.add(key)
    }
    files.dirty.clear()
    if (files.metaDirty) {
      views.problems = this.problemList()
      views.conflicts = this.conflictList(this.dupConflicts)
      files.metaDirty = false
    }
    return views
  }

  /** Test aid (`FI_VERIFY_VIEWS`): the views updated in place are the views built whole. */
  private verifyViews(views: Views): void {
    const full = this.computeViews().views
    for (const c of COLLECTIONS) {
      const a = views.records[c]
      const b = full.records[c]
      if (a.size !== b.size || [...b].some(([id, st]) => a.get(id) !== st)) throw new Error(`views out of step: ${c}`)
    }
    const json = (v: Views) => JSON.stringify([v.problems, v.conflicts])
    if (json(views) !== json(full)) throw new Error('views out of step: problems / conflicts')
  }

  private duplicateConflict(kind: Collection, primary: FileState, dup: FileState): ConflictEntry {
    return { id: dup.relPath, kind, type: 'duplicate', source: 'ten sam identyfikator w dwóch plikach', canonical: this.side(primary), copy: this.side(dup) }
  }

  private problemList(): Problem[] {
    return [...this.files.problemPaths]
      .map((rel) => {
        const s = this.files.get(rel)!
        return { relPath: s.relPath, kind: s.problemKind ?? 'invalid', message: s.error ?? '' }
      })
      .sort((a, b) => a.relPath.localeCompare(b.relPath))
  }

  private conflictList(dups: Map<string, ConflictEntry[]>): ConflictEntry[] {
    const conflicts = [...dups.values()].flat()
    for (const rel of this.files.copyPaths) {
      const s = this.files.get(rel)!
      if (!s.conflict) continue
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
    return conflicts.sort((a, b) => a.id.localeCompare(b.id))
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
    const keys = this.uncommitted
    if (keys == null)
      for (const c of COLLECTIONS) {
        const map = new Map<string, ViewKey>()
        for (const [id, s] of views.records[c]) map.set(id, this.viewKey(s))
        this.prevKeys[c] = map
      }
    else
      for (const key of keys) {
        const i = key.indexOf(':')
        const c = key.slice(0, i) as Collection
        const id = key.slice(i + 1)
        const s = views.records[c].get(id)
        if (s) this.prevKeys[c].set(id, this.viewKey(s))
        else this.prevKeys[c].delete(id)
      }
    this.uncommitted = new Set()
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
    const keys = this.uncommitted
    if (keys == null)
      for (const c of COLLECTIONS) {
        const prev = this.prevKeys[c]
        for (const [id, s] of views.records[c]) {
          if (prev.get(id) !== this.viewKey(s)) change.upserts.push({ collection: c, entry: this.entry(s) })
        }
        for (const id of prev.keys()) if (!views.records[c].has(id)) change.removals.push({ collection: c, id })
      }
    else
      // Only the records whose files changed since the last change set (W8).
      for (const key of keys) {
        const i = key.indexOf(':')
        const c = key.slice(0, i) as Collection
        const id = key.slice(i + 1)
        const s = views.records[c].get(id)
        const prev = this.prevKeys[c].get(id)
        if (s) {
          if (prev !== this.viewKey(s)) change.upserts.push({ collection: c, entry: this.entry(s) })
        } else if (prev !== undefined) change.removals.push({ collection: c, id })
      }
    const metaChanged = this.metaKey(views) !== this.prevMeta
    this.commit(views)
    if (!change.upserts.length && !change.removals.length && !settingsChanged && !metaChanged) return null
    return change
  }

  // ---------------------------------------------------------------- external changes

  /**
   * Re-read changed files. `paths` = relative paths reported by the watcher (files, or directories whose entries
   * changed); omit for a full rescan. Returns null when nothing visible changed.
   */
  refresh(paths?: string[]): Promise<ChangeSet | null> {
    if (paths) return this.mutex.run(() => this.refreshInQueue(paths))
    // A full check lists and stats the folder before it joins the queue – seconds at 150 thousand files, writes go on
    // meanwhile; in the queue only what differs is read again (W21).
    return this.statAll()
      .catch(() => null)
      .then((listing) => this.mutex.run(() => this.refreshInQueue(undefined, listing ?? undefined)))
  }

  /** The refresh in its turn of the queue; `listing` = a full check's files and their stats made before it. */
  private async refreshInQueue(paths?: string[], listing?: Map<string, FileStat | null>): Promise<ChangeSet | null> {
    const wasAvailable = this.available
    this.available = (await DataStore.inspect(this.root)) === 'data'
    if (!this.available) {
      // Keep everything in memory; the folder may come back (pendrive, network drive).
      return wasAvailable ? this.diff(this.buildViews(), false, 'external') : null
    }
    const settingsBefore = this.files.get(SETTINGS_FILE)?.hash
    if (!paths || !wasAvailable || !(await this.rescanPaths(paths))) await this.rescanAll(listing)
    const settingsChanged = this.files.get(SETTINGS_FILE)?.hash !== settingsBefore && this.refreshSettingsState()
    if (!this.folderReadOnlyReason && this.files.migratedPaths.size) {
      const migrated = [...this.files.migratedPaths].map((rel) => this.files.get(rel)!)
      await this.backupOriginals(migrated)
      for (const s of migrated) await this.rewrite(s)
    }
    return this.diff(this.buildViews(), settingsChanged, 'external')
  }

  /** The folder's data files with their stat (null = gone meanwhile), outside the queue. */
  private async statAll(): Promise<Map<string, FileStat | null>> {
    const rels = await this.listDataFiles()
    const stats = await mapLimit(rels, READ_CONCURRENCY, (rel) =>
      fs.stat(join(this.root, ...rel.split('/'))).then(
        (st) => (st.isFile() ? { mtimeMs: st.mtimeMs, size: st.size } : null),
        () => null
      )
    )
    return new Map(rels.map((rel, i) => [rel, stats[i] ?? null]))
  }

  /**
   * Every file of the folder, read again where its stat changed. `listing` (made before the queue's turn): files
   * whose stat there is the known one are taken as they are; any other – new, changed, gone or written by this
   * store meanwhile – goes through `loadFile` (stat again, read when changed).
   */
  private async rescanAll(listing?: Map<string, FileStat | null>): Promise<void> {
    const seen = listing ?? new Map((await this.listDataFiles()).map((rel) => [rel, undefined]))
    const check: string[] = []
    for (const [rel, st] of seen) {
      const known = this.files.get(rel)
      if (!known || known.readError || !st || known.mtimeMs !== st.mtimeMs || known.size !== st.size) check.push(rel)
    }
    for (const rel of this.files.keys()) if (!seen.has(rel)) check.push(rel)
    const states = await mapLimit(check, READ_CONCURRENCY, (rel) => this.loadFile(rel))
    check.forEach((rel, i) => this.put(rel, states[i] ?? null))
  }

  /** A file's state after a read: kept (the same object leaves the views alone), replaced or gone. */
  private put(rel: string, state: FileState | null): FileState | null {
    const old = this.files.get(rel) ?? null
    if (state) {
      if (state !== old) this.files.set(rel, state)
    } else if (old) this.files.delete(rel)
    return old
  }

  /**
   * The paths the watcher reported: the files read again, and of a directory (on Windows every write into it reports
   * it too – W22) its entries compared with the files known there. False = a directory could not be listed (not
   * gone, e.g. no access): the caller rescans everything instead.
   */
  private async rescanPaths(paths: readonly string[]): Promise<boolean> {
    const rels = new Set<string>()
    for (const p of new Set(paths)) {
      // `dir/`: a directory that appeared, went or was renamed – everything under it (FolderWatcher).
      const deep = p.endsWith('/')
      const rel = sanitizeRelPath(deep ? p.slice(0, -1) : p)
      if (!rel || isIgnoredPath(rel)) continue
      if (!deep && rel.toLowerCase().endsWith('.json')) rels.add(rel)
      else if (!(await this.changedInDir(rel, rels, deep))) return false
    }
    const list = [...rels]
    const states = await mapLimit(list, READ_CONCURRENCY, (rel) => this.loadFile(rel))
    const gone: FileState[] = []
    list.forEach((rel, i) => {
      const old = this.put(rel, states[i] ?? null)
      if (old && !states[i]) gone.push(old)
    })
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
    return true
  }

  /**
   * A reported path that is no JSON file: of a directory, the files to read – those added since and those known
   * there that are gone; a subdirectory with no file known under it, whole (new, or brought back). A path gone or
   * not a directory: the files known under it. `deep` (the directory itself appeared, went or was renamed): every file
   * known under it and every file in it, each read again where its stat changed. False = the directory could not be
   * listed.
   */
  private async changedInDir(dir: string, out: Set<string>, deep = false): Promise<boolean> {
    // Outside the collections nothing is data (a full rescan does not look there either).
    if (!(COLLECTIONS as readonly string[]).includes(dir.split('/')[0]!)) return true
    if (deep) {
      let found: string[]
      try {
        found = await walkFiles(this.root, this.abs(dir), isIgnoredPath)
      } catch (e) {
        // A file of another kind renamed: nothing under it; a directory that cannot be listed: everything rescanned.
        if ((e as NodeJS.ErrnoException).code !== 'ENOTDIR') return false
        found = []
      }
      for (const f of found) if (f.toLowerCase().endsWith('.json')) out.add(f)
      for (const [d, files] of this.files.dirs) if (d === dir || d.startsWith(`${dir}/`)) for (const rel of files) out.add(rel)
      return true
    }
    let entries
    try {
      entries = await fs.readdir(this.abs(dir), { withFileTypes: true })
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code
      if (code !== 'ENOENT' && code !== 'ENOTDIR') return false
      for (const [d, files] of this.files.dirs) if (d === dir || d.startsWith(`${dir}/`)) for (const rel of files) out.add(rel)
      return true
    }
    const known = this.files.dirs.get(dir)
    const listed = new Set<string>()
    for (const e of entries) {
      const rel = `${dir}/${e.name}`
      if (isIgnoredPath(rel)) continue
      if (e.isFile()) {
        listed.add(rel)
        if (!known?.has(rel) && rel.toLowerCase().endsWith('.json')) out.add(rel)
      } else if (e.isDirectory() && !this.files.hasUnder(rel)) {
        for (const f of await walkFiles(this.root, this.abs(rel), isIgnoredPath).catch(() => [] as string[])) if (f.toLowerCase().endsWith('.json')) out.add(f)
      }
    }
    if (known) for (const rel of known) if (!listed.has(rel)) out.add(rel)
    return true
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
    // The record's files from the index (W8), never a walk of all.
    let best: FileState | null = null
    for (const rel of this.files.ids.get(`${collection}:${id}`) ?? []) {
      const s = this.files.get(rel)!
      if (!best || (s.record as AnyRecord).updatedAt > (best.record as AnyRecord).updatedAt) best = s
    }
    return best
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
      try {
        const state = await this.writeRecord(collection, input)
        return { entry: this.entry<C>(state), change: this.diff(this.buildViews(), false) }
      } catch (e) {
        // The window gets what happened with the error (B49 – as a change from outside; B46 – the copy).
        if (e instanceof RemovedOutsideError) throw new RemovedOutsideError(e.relPath, this.diff(this.buildViews(), false, 'external'))
        if (e instanceof ConflictCopyError) throw new ConflictCopyError(e.relPath, this.diff(this.buildViews(), false))
        throw e
      }
    })
  }

  /**
   * Many records at once (an import, a bulk change – W1): each written as `saveRecord` writes it, one change set at the
   * end; a record that fails says why, the others are written. A record removed on another computer a moment ago
   * (B49) goes to the window in a change set of its own, from outside.
   */
  saveRecords<C extends Collection>(collection: C, inputs: readonly RecordTypes[C][]): Promise<{ results: SaveResult<C>[]; changes: ChangeSet[] }> {
    return this.mutex.run(async () => {
      this.assertWritable()
      const results: SaveResult<C>[] = []
      const removed = new Set<string>()
      for (const input of inputs) {
        try {
          results.push({ id: input.id, entry: this.entry<C>(await this.writeRecord(collection, input)) })
        } catch (e) {
          if (e instanceof RemovedOutsideError) removed.add(input.id)
          results.push({ id: input.id, error: (e as Error).message })
        }
      }
      const change = this.diff(this.buildViews(), false)
      if (!change) return { results, changes: [] }
      if (!removed.size) return { results, changes: [change] }
      const outside = (r: { collection: Collection; id: string }) => r.collection === collection && removed.has(r.id)
      return {
        results,
        changes: [
          { ...change, upserts: [], removals: change.removals.filter(outside), origin: 'external' },
          { ...change, removals: change.removals.filter((r) => !outside(r)) }
        ]
      }
    })
  }

  /** One record written (inside the queue): `saveRecord`'s work without the change set. */
  private async writeRecord<C extends Collection>(collection: C, input: RecordTypes[C]): Promise<FileState> {
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
        throw new RemovedOutsideError(known.relPath)
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
        throw new ConflictCopyError(copyRel)
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
    return state
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
      if (!(await this.removeRecord(collection, id))) return null
      return this.diff(this.buildViews(), false)
    })
  }

  /**
   * Many records deleted at once (an import's, duplicates – W1): one change set; a record that fails says why. `reason`
   * 'undo': taken back with its import (F4) – its last version in the history is no deletion by the user (T39); 'drop':
   * no version kept (old batches of `imports`).
   */
  deleteRecords(collection: Collection, ids: readonly string[], reason: 'delete' | 'undo' | 'drop' = 'delete'): Promise<{ results: Array<{ id: string; error?: string }>; change: ChangeSet | null }> {
    return this.mutex.run(async () => {
      this.assertWritable()
      const results: Array<{ id: string; error?: string }> = []
      for (const id of ids) {
        try {
          await this.removeRecord(collection, id, reason)
          results.push({ id })
        } catch (e) {
          results.push({ id, error: (e as Error).message })
        }
      }
      return { results, change: this.diff(this.buildViews(), false) }
    })
  }

  /** One record deleted (inside the queue); false = not there. */
  private async removeRecord(collection: Collection, id: string, reason: 'delete' | 'undo' | 'drop' = 'delete'): Promise<boolean> {
    const state = this.currentState(collection, id)
    if (!state) return false
    if (state.readOnly) throw new ReadOnlyError('Ten wpis jest tylko do odczytu.')
    const kept = reason === 'drop' ? null : await this.history.snapshot(collection, state.record as AnyRecord, reason)
    try {
      await this.opts.trash(this.abs(state.relPath))
    } catch (e) {
      // The file stays (held by OneDrive, an antivirus): no „deleted” version in the history either (B9).
      await this.history.drop(kept)
      throw new Error(`Nie udało się usunąć pliku ${state.relPath} (zajęty przez inny program?) – spróbuj ponownie. ${(e as Error).message}`)
    }
    this.files.delete(state.relPath)
    return true
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

  /** One conflict resolved (`keep` = the version that stays): the change from inside the queue, no rescan (W23). */
  resolveConflict(conflictId: string, keep: 'canonical' | 'copy'): Promise<ChangeSet | null> {
    return this.mutex.run(async () => {
      this.assertWritable()
      const settingsWritten = await this.resolveOne(conflictId, keep)
      return this.diff(this.buildViews(), settingsWritten)
    })
  }

  /**
   * Many conflicts at once („Zachowaj nowsze” – W23), in the order given, one change set at the end. A group whose copy
   * could not be kept leaves its other conflicts as they are (nothing newer goes to the bin).
   */
  resolveConflicts(items: ReadonlyArray<{ id: string; keep: 'canonical' | 'copy'; group?: string }>): Promise<{ results: ConflictResult[]; change: ChangeSet | null }> {
    return this.mutex.run(async () => {
      this.assertWritable()
      const results: ConflictResult[] = []
      const failed = new Set<string>()
      let settingsWritten = false
      for (const item of items) {
        if (item.group != null && failed.has(item.group)) {
          results.push({ id: item.id, skipped: true })
          continue
        }
        try {
          if (await this.resolveOne(item.id, item.keep)) settingsWritten = true
          results.push({ id: item.id })
        } catch (e) {
          results.push({ id: item.id, error: (e as Error).message })
          if (item.keep === 'copy' && item.group != null) failed.add(item.group)
        }
      }
      return { results, change: this.diff(this.buildViews(), settingsWritten) }
    })
  }

  /**
   * One conflict resolved inside the queue. True = fi.json was rewritten with the kept copy (the change set carries the
   * settings: its hash is this store's own).
   */
  private async resolveOne(conflictId: string, keep: 'canonical' | 'copy'): Promise<boolean> {
    let settingsWritten = false
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
      return false
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
    return settingsWritten
  }

  /** A problem file or a conflict copy to the bin: the change from inside the queue, no rescan (W23). */
  trashFile(relPath: string): Promise<ChangeSet | null> {
    return this.mutex.run(async () => {
      this.assertWritable()
      const s = this.files.get(relPath)
      if (!s || s.status === 'record') throw new Error('Można usuwać tylko pliki z listy problemów lub kopie konfliktów.')
      await this.opts.trash(this.abs(relPath))
      this.files.delete(relPath)
      return this.diff(this.buildViews(), false)
    })
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

  /**
   * A ZIP of the data (`isDataFile`) as this store has it (W7): a record whose text written from memory is the file's
   * very bytes (the same hash) goes from memory – no file read, none scanned by the antivirus; any other file (a copy,
   * a problem, a record its parsing changed – an older or newer version wrote it, a hand edit) is read from the disk:
   * one gone meanwhile is left out, one that cannot be read (OneDrive) fails the backup – never a backup without it.
   */
  async zipData(outFile: string): Promise<ZipResult> {
    const states = await this.mutex.run(async () => [...this.files.values()].filter((s) => isDataFile(s.relPath)))
    states.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0))
    const items = states.map((s): ZipSource => {
      const { relPath, kind, record, mtimeMs, hash } = s
      const disk = diskSource(this.abs(relPath), relPath)
      if (s.status !== 'record' || !record) return disk
      return {
        name: relPath,
        read: () => {
          const text = serializeRecord(kind, record)
          return sha1(text) === hash ? { data: Buffer.from(text, 'utf8'), mtime: new Date(mtimeMs) } : disk.read()
        }
      }
    })
    return writeZipFile(outFile, items)
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
