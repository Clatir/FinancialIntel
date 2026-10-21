/**
 * The mirror of the data folder on the phone (T305): files in memory, kept in IndexedDB, every local change marked for
 * the upload to OneDrive. The data store of the computers runs over it through `node/fs.ts` – the same reading, writing,
 * history and conflicts as on Windows; the sync engine (`sync/engine.ts`) brings the other computers' changes in.
 *
 * A file changed here carries `dirty` (the order of the change) until its upload succeeds; a file removed here stays as a
 * tombstone (`data` null) until the removal reached OneDrive. Temp files of atomic writes never leave memory.
 */

export interface RemoteMeta {
  /** The OneDrive item. */
  id: string
  eTag: string
  /** The content's tag: another value = another content (a rename changes the eTag only). */
  cTag: string | null
}

export interface StoredEntry {
  path: string
  /** null = removed here, the removal not yet on OneDrive. */
  data: Uint8Array | null
  mtimeMs: number
  /** 0 = as on OneDrive; else the order of the local change still to upload. */
  dirty: number
  /** The OneDrive item this path was last synced with (null = never). */
  meta: RemoteMeta | null
}

export interface VfsPersistence {
  load(): Promise<StoredEntry[]>
  write(puts: readonly StoredEntry[], deletes: readonly string[]): Promise<void>
  clear(): Promise<void>
}

/** Tests and the first start: nothing kept between runs. */
export class MemoryPersistence implements VfsPersistence {
  readonly entries = new Map<string, StoredEntry>()
  /** Test hook: the next write fails (a full disk). */
  failNext: Error | null = null
  writes = 0
  async load(): Promise<StoredEntry[]> {
    return [...this.entries.values()].map((e) => ({ ...e }))
  }
  async write(puts: readonly StoredEntry[], deletes: readonly string[]): Promise<void> {
    if (this.failNext) {
      const e = this.failNext
      this.failNext = null
      throw e
    }
    this.writes++
    for (const p of puts) this.entries.set(p.path, { ...p, data: p.data ? new Uint8Array(p.data) : null })
    for (const d of deletes) this.entries.delete(d)
  }
  async clear(): Promise<void> {
    this.entries.clear()
  }
}

export interface FsStats {
  mtimeMs: number
  ctimeMs: number
  birthtimeMs: number
  mtime: Date
  size: number
  isFile(): boolean
  isDirectory(): boolean
  isSymbolicLink(): boolean
}

export interface FsDirent {
  name: string
  isFile(): boolean
  isDirectory(): boolean
  isSymbolicLink(): boolean
}

export class FsError extends Error {
  constructor(
    readonly code: string,
    syscall: string,
    path: string
  ) {
    const what: Record<string, string> = {
      ENOENT: 'no such file or directory',
      EEXIST: 'file already exists',
      ENOTDIR: 'not a directory',
      EISDIR: 'illegal operation on a directory',
      ENOTEMPTY: 'directory not empty',
      EINVAL: 'invalid argument'
    }
    super(`${code}: ${what[code] ?? 'error'}, ${syscall} '${path}'`)
    this.name = 'Error'
  }
}

/** A local change: the sync engine uploads it (paths it never syncs – temp files – are not told). */
export type LocalChange = { path: string; removed: boolean }

const encoder = new TextEncoder()

function normalizeAbs(p: string): string {
  if (!p.startsWith('/')) throw new FsError('EINVAL', 'path', p)
  const parts: string[] = []
  for (const part of p.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return `/${parts.join('/')}`
}

function parentOf(p: string): string {
  const i = p.lastIndexOf('/')
  return i <= 0 ? '/' : p.slice(0, i)
}

function nameOf(p: string): string {
  return p.slice(p.lastIndexOf('/') + 1)
}

/** A temp file of an atomic write (`atomic.ts` `tempPathFor`): never kept, never synced. */
export const isTempPath = (p: string): boolean => nameOf(p).includes('.tmp-')

export function toBytes(data: string | Uint8Array): Uint8Array {
  return typeof data === 'string' ? encoder.encode(data) : new Uint8Array(data)
}

export interface VfsOptions {
  /** The paths whose local changes go to OneDrive (the data folder, its history and presence). */
  synced?: (path: string) => boolean
}

export class Vfs {
  private readonly entries = new Map<string, StoredEntry>()
  /** Directories made here or holding a file (a removed file's directory stays, like on a disk). */
  private readonly dirs = new Set<string>(['/'])
  private readonly pending = new Set<string>()
  private scheduled: Promise<void> | null = null
  private chain: Promise<void> = Promise.resolve()
  private clock = 0
  private seq = 0
  private readonly listeners = new Set<(c: LocalChange) => void>()
  private readonly synced: (path: string) => boolean

  constructor(
    private readonly persistence: VfsPersistence,
    opts: VfsOptions = {}
  ) {
    this.synced = opts.synced ?? (() => true)
  }

  /** Everything kept from the last run. */
  async load(): Promise<void> {
    const all = await this.persistence.load()
    this.entries.clear()
    this.dirs.clear()
    this.dirs.add('/')
    for (const e of all) {
      this.entries.set(e.path, e)
      if (e.data) this.addDirs(parentOf(e.path))
      if (e.mtimeMs > this.clock) this.clock = e.mtimeMs
      if (e.dirty > this.seq) this.seq = e.dirty
    }
  }

  /** Everything forgotten (the account signed out, another folder chosen). */
  async reset(): Promise<void> {
    await this.flushed()
    this.entries.clear()
    this.dirs.clear()
    this.dirs.add('/')
    this.pending.clear()
    await this.persistence.clear()
  }

  onLocalChange(cb: (c: LocalChange) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  /** Every write so far kept in IndexedDB. */
  flushed(): Promise<void> {
    return (this.scheduled ?? Promise.resolve()).then(() => this.chain)
  }

  // ------------------------------------------------------------------ the sync engine's side

  get(path: string): StoredEntry | undefined {
    return this.entries.get(normalizeAbs(path))
  }

  /** Files and tombstones under a directory (deep). */
  entriesUnder(dir: string): StoredEntry[] {
    const prefix = `${normalizeAbs(dir).replace(/\/$/, '')}/`
    return [...this.entries.values()].filter((e) => e.path.startsWith(prefix))
  }

  /** The local changes still to upload, the oldest first. */
  dirtyEntries(): StoredEntry[] {
    return [...this.entries.values()].filter((e) => e.dirty > 0).sort((a, b) => a.dirty - b.dirty)
  }

  /**
   * OneDrive's version of a path (null = removed there): written without a mark for upload. Directories are made as
   * needed; a removal leaves no tombstone.
   */
  applyRemote(path: string, data: Uint8Array | null, meta: RemoteMeta | null): Promise<void> {
    const p = normalizeAbs(path)
    if (data == null) {
      if (!this.entries.has(p)) return Promise.resolve()
      this.entries.delete(p)
      return this.queue(p)
    }
    this.addDirs(parentOf(p))
    this.entries.set(p, { path: p, data: new Uint8Array(data), mtimeMs: this.tick(), dirty: 0, meta })
    return this.queue(p)
  }

  /** The upload of a change done: the mark goes – unless the path changed again meanwhile (`seq` older). */
  markSynced(path: string, seq: number, meta: RemoteMeta | null): Promise<void> {
    const p = normalizeAbs(path)
    const e = this.entries.get(p)
    if (!e) return Promise.resolve()
    if (e.data == null) {
      // A removal on OneDrive done: the tombstone goes. Removed here while its upload ran: the removal goes with the
      // version just uploaded (an older one would be refused as changed there).
      if (e.dirty !== seq) {
        if (!meta) return Promise.resolve()
        this.entries.set(p, { ...e, meta })
      } else this.entries.delete(p)
      return this.queue(p)
    }
    this.entries.set(p, { ...e, dirty: e.dirty === seq ? 0 : e.dirty, meta })
    return this.queue(p)
  }

  /** A path's OneDrive item learned (an echo of our own upload, a rename) without touching the content. */
  setMeta(path: string, meta: RemoteMeta | null): Promise<void> {
    const p = normalizeAbs(path)
    const e = this.entries.get(p)
    if (!e) return Promise.resolve()
    this.entries.set(p, { ...e, meta })
    return this.queue(p)
  }

  /** A file moved on OneDrive (renamed, another folder): its content and marks go with it. */
  moveEntry(from: string, to: string): Promise<void> {
    const a = normalizeAbs(from)
    const b = normalizeAbs(to)
    const e = this.entries.get(a)
    if (!e || a === b) return Promise.resolve()
    this.entries.delete(a)
    if (e.data) this.addDirs(parentOf(b))
    this.entries.set(b, { ...e, path: b, mtimeMs: this.tick() })
    return Promise.all([this.queue(a), this.queue(b)]).then(() => undefined)
  }

  // ------------------------------------------------------------------ the file system (node/fs.ts)

  private live(p: string): StoredEntry | null {
    const e = this.entries.get(p)
    return e && e.data ? e : null
  }

  private isDir(p: string): boolean {
    return this.dirs.has(p)
  }

  private addDirs(dir: string): void {
    for (let d = dir; !this.dirs.has(d); d = parentOf(d)) {
      this.dirs.add(d)
      if (d === '/') break
    }
  }

  private tick(): number {
    // Unique and growing: the data store tells a changed file by its time and size.
    const now = Date.now()
    this.clock = now > this.clock ? now : this.clock + 0.001
    return this.clock
  }

  private queue(p: string): Promise<void> {
    if (isTempPath(p)) return Promise.resolve()
    this.pending.add(p)
    if (!this.scheduled)
      this.scheduled = new Promise<void>((r) => setTimeout(r, 0)).then(() => {
        this.scheduled = null
        const paths = [...this.pending]
        this.pending.clear()
        const puts: StoredEntry[] = []
        const deletes: string[] = []
        for (const path of paths) {
          const e = this.entries.get(path)
          if (e) puts.push(e)
          else deletes.push(path)
        }
        const run = this.chain.then(() => this.persistence.write(puts, deletes))
        // One failed write never blocks the next ones (each caller is told of its own).
        this.chain = run.catch(() => undefined)
        return run
      })
    return this.scheduled
  }

  /** A local write of a file (the data store's): marked for the upload. */
  private writeLocal(p: string, data: Uint8Array): Promise<void> {
    const prev = this.entries.get(p)
    const track = this.synced(p) && !isTempPath(p)
    this.entries.set(p, { path: p, data, mtimeMs: this.tick(), dirty: track ? ++this.seq : (prev?.dirty ?? 0), meta: prev?.meta ?? null })
    if (track) this.tell({ path: p, removed: false })
    return this.queue(p)
  }

  /** A local removal: a tombstone while OneDrive has the file, else nothing. */
  private removeLocal(p: string): Promise<void> {
    const prev = this.entries.get(p)
    if (!prev) return Promise.resolve()
    const track = this.synced(p) && !isTempPath(p)
    if (track && prev.meta) {
      this.entries.set(p, { ...prev, data: null, mtimeMs: this.tick(), dirty: ++this.seq })
      this.tell({ path: p, removed: true })
    } else this.entries.delete(p)
    return this.queue(p)
  }

  private tell(c: LocalChange): void {
    for (const cb of this.listeners) cb(c)
  }

  private needParentDir(p: string, syscall: string): void {
    const parent = parentOf(p)
    if (this.live(parent)) throw new FsError('ENOTDIR', syscall, p)
    if (!this.isDir(parent)) throw new FsError('ENOENT', syscall, p)
  }

  private statOf(p: string, syscall: string): FsStats {
    const e = this.live(p)
    if (e) {
      const size = e.data!.length
      return { mtimeMs: e.mtimeMs, ctimeMs: e.mtimeMs, birthtimeMs: e.mtimeMs, mtime: new Date(e.mtimeMs), size, isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false }
    }
    if (this.isDir(p)) return { mtimeMs: 0, ctimeMs: 0, birthtimeMs: 0, mtime: new Date(0), size: 0, isFile: () => false, isDirectory: () => true, isSymbolicLink: () => false }
    throw new FsError('ENOENT', syscall, p)
  }

  async stat(path: string): Promise<FsStats> {
    return this.statOf(normalizeAbs(path), 'stat')
  }

  async access(path: string): Promise<void> {
    this.statOf(normalizeAbs(path), 'access')
  }

  async readFile(path: string): Promise<Uint8Array> {
    const p = normalizeAbs(path)
    if (this.isDir(p) && !this.live(p)) throw new FsError('EISDIR', 'read', p)
    const e = this.live(p)
    if (!e) throw new FsError('ENOENT', 'open', p)
    return new Uint8Array(e.data!)
  }

  async writeFile(path: string, data: string | Uint8Array): Promise<void> {
    const p = normalizeAbs(path)
    if (this.isDir(p)) throw new FsError('EISDIR', 'open', p)
    this.needParentDir(p, 'open')
    await this.writeLocal(p, toBytes(data))
  }

  /** `open(path, 'w')` creates (truncates) the file at once – as the system does. */
  async create(path: string): Promise<void> {
    await this.writeFile(path, new Uint8Array(0))
  }

  async mkdir(path: string, opts: { recursive?: boolean } = {}): Promise<string | undefined> {
    const p = normalizeAbs(path)
    if (this.live(p)) throw new FsError('EEXIST', 'mkdir', p)
    if (this.isDir(p)) {
      if (opts.recursive) return undefined
      throw new FsError('EEXIST', 'mkdir', p)
    }
    if (opts.recursive) {
      for (let d = parentOf(p); d !== '/'; d = parentOf(d)) if (this.live(d)) throw new FsError('ENOTDIR', 'mkdir', p)
      this.addDirs(p)
      return p
    }
    this.needParentDir(p, 'mkdir')
    this.dirs.add(p)
    return undefined
  }

  async readdir(path: string): Promise<string[]> {
    return this.list(normalizeAbs(path)).map((d) => d.name)
  }

  async readdirEntries(path: string): Promise<FsDirent[]> {
    return this.list(normalizeAbs(path))
  }

  private list(p: string): FsDirent[] {
    if (this.live(p)) throw new FsError('ENOTDIR', 'scandir', p)
    if (!this.isDir(p)) throw new FsError('ENOENT', 'scandir', p)
    const prefix = p === '/' ? '/' : `${p}/`
    const names = new Map<string, boolean>()
    for (const e of this.entries.values()) {
      if (!e.data || !e.path.startsWith(prefix)) continue
      const rest = e.path.slice(prefix.length)
      const i = rest.indexOf('/')
      if (i < 0) names.set(rest, true)
      else if (!names.has(rest.slice(0, i))) names.set(rest.slice(0, i), false)
    }
    for (const d of this.dirs) {
      if (d === p || !d.startsWith(prefix)) continue
      const rest = d.slice(prefix.length)
      const first = rest.split('/')[0]!
      if (first && !names.has(first)) names.set(first, false)
    }
    return [...names.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([name, file]) => ({ name, isFile: () => file, isDirectory: () => !file, isSymbolicLink: () => false }))
  }

  async rm(path: string, opts: { force?: boolean; recursive?: boolean } = {}): Promise<void> {
    const p = normalizeAbs(path)
    if (this.live(p)) {
      await this.removeLocal(p)
      return
    }
    if (this.isDir(p)) {
      if (!opts.recursive) throw new FsError('EISDIR', 'rm', p)
      const prefix = `${p}/`
      const jobs: Promise<void>[] = []
      for (const e of [...this.entries.values()]) if (e.data && e.path.startsWith(prefix)) jobs.push(this.removeLocal(e.path))
      for (const d of [...this.dirs]) if (d === p || d.startsWith(prefix)) this.dirs.delete(d)
      await Promise.all(jobs)
      return
    }
    if (!opts.force) throw new FsError('ENOENT', 'rm', p)
  }

  async unlink(path: string): Promise<void> {
    const p = normalizeAbs(path)
    if (!this.live(p)) throw new FsError(this.isDir(p) ? 'EISDIR' : 'ENOENT', 'unlink', p)
    await this.removeLocal(p)
  }

  async rename(from: string, to: string): Promise<void> {
    const a = normalizeAbs(from)
    const b = normalizeAbs(to)
    const src = this.live(a)
    if (!src) {
      if (this.isDir(a)) return this.renameDir(a, b)
      throw new FsError('ENOENT', 'rename', a)
    }
    if (a === b) return
    if (this.isDir(b)) throw new FsError('EISDIR', 'rename', b)
    this.needParentDir(b, 'rename')
    const data = src.data!
    // The target first: a reader never sees the file gone in between (the atomic write's rename).
    const write = this.writeLocal(b, data)
    const remove = this.removeLocal(a)
    await Promise.all([write, remove])
  }

  private async renameDir(a: string, b: string): Promise<void> {
    if (this.live(b)) throw new FsError('ENOTDIR', 'rename', b)
    const prefix = `${a}/`
    const jobs: Promise<void>[] = []
    for (const e of [...this.entries.values()]) {
      if (!e.data || !e.path.startsWith(prefix)) continue
      const target = b + e.path.slice(a.length)
      this.addDirs(parentOf(target))
      jobs.push(this.writeLocal(target, e.data), this.removeLocal(e.path))
    }
    for (const d of [...this.dirs]) if (d === a || d.startsWith(prefix)) this.dirs.delete(d)
    this.addDirs(b)
    await Promise.all(jobs)
  }

  async copyFile(from: string, to: string): Promise<void> {
    const data = await this.readFile(from)
    await this.writeFile(to, data)
  }

  /** Every live file's path (tests, the status of the mirror). */
  files(): string[] {
    return [...this.entries.values()].filter((e) => e.data).map((e) => e.path)
  }
}
