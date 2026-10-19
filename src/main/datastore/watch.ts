// adapted from ICTTJ src/main/datastore/watch.ts @ 84a8339
import { promises as fs, watch, type FSWatcher } from 'node:fs'
import { join, relative } from 'node:path'
import { isIgnoredPath, toPosix } from '@shared/paths'

export interface WatcherOptions {
  debounceMs?: number
  /**
   * Safety-net full rescan interval (sync tools and network drives may not emit events): 5 min with the native
   * watcher, 30 s per directory (W21).
   */
  pollMs?: number
  /**
   * A failure of the watcher (B113): the first one, then at most one an hour – `repeated` = the failures since the last
   * one reported.
   */
  onError?: (e: unknown, repeated: number) => void
  /**
   * 'native' = fs.watch({recursive}) (Windows ReadDirectoryChangesW, macOS FSEvents).
   * 'per-directory' = one non-recursive watcher per directory. Used on Linux, where Node's emulated
   * recursive watcher tracks file inodes and misses edits after an atomic rename replaced the file.
   */
  mode?: 'native' | 'per-directory'
}

const RESTART_FIRST_MS = 5000
const RESTART_MAX_MS = 5 * 60_000
/** A watcher that ran this long before failing starts the waits from the first again. */
const STABLE_MS = 60_000
const REPORT_EVERY_MS = 60 * 60_000

/**
 * Watches the data folder recursively. Calls `onChange(paths)` with relative paths after a debounce (`dir/` = check
 * everything under it), or `onChange(null)` when a full rescan is needed (periodic poll, watcher error, unknown event).
 */
export class FolderWatcher {
  private native: FSWatcher | null = null
  private dirWatchers = new Map<string, FSWatcher>()
  private pending = new Set<string>()
  private full = false
  private stopped = false
  private timer: NodeJS.Timeout | null = null
  private poll: NodeJS.Timeout | null = null
  private restart: NodeJS.Timeout | null = null
  /** The next restart's wait (B113): 5 s, doubled up to 5 min while the folder stays away. */
  private restartMs = RESTART_FIRST_MS
  private attachedAt = 0
  /** Failures not reported yet, and when one was reported last (B113: one an hour). */
  private unreported = 0
  private reportedAt = 0
  private readonly debounceMs: number
  private readonly pollMs: number
  private readonly onError?: (e: unknown, repeated: number) => void
  readonly mode: 'native' | 'per-directory'

  constructor(
    private readonly root: string,
    private readonly onChange: (paths: string[] | null) => void,
    opts: WatcherOptions = {}
  ) {
    this.debounceMs = opts.debounceMs ?? 300
    this.onError = opts.onError
    this.mode = opts.mode ?? (process.platform === 'win32' || process.platform === 'darwin' ? 'native' : 'per-directory')
    this.pollMs = opts.pollMs ?? (this.mode === 'native' ? 5 * 60_000 : 30_000)
  }

  start(): void {
    this.stopped = false
    if (this.mode === 'native') this.attachNative()
    else void this.watchTree(this.root)
    this.poll = setInterval(() => this.onChange(null), this.pollMs)
  }

  /** Resolves once per-directory watchers for the existing tree are attached (tests). */
  async ready(): Promise<void> {
    if (this.mode === 'per-directory') await this.watchTree(this.root)
  }

  /**
   * A path to read again. A name that is no JSON file appeared, went or was renamed (`rename`): a directory brought
   * back from the bin or by sync comes with its files reported only as itself – reported as `dir/`, everything under it
   * is checked (W22); a directory only changed (`change`: a file renamed in it) – its entries are compared.
   */
  private record(rel: string, event?: string): void {
    if (isIgnoredPath(rel)) return
    this.pending.add(event === 'rename' && !rel.toLowerCase().endsWith('.json') ? `${rel}/` : rel)
    this.schedule()
  }

  private attachNative(): void {
    try {
      this.attachedAt = Date.now()
      this.native = watch(this.root, { recursive: true }, (event, filename) => {
        if (!filename) {
          this.full = true
          this.schedule()
        } else this.record(toPosix(filename.toString()), event)
      })
      this.native.on('error', (e) => this.failed(e))
    } catch (e) {
      this.failed(e)
    }
  }

  private async watchTree(dir: string): Promise<void> {
    if (this.stopped) return
    const rel = toPosix(relative(this.root, dir))
    if (rel && isIgnoredPath(rel)) return
    if (!this.dirWatchers.has(dir)) {
      try {
        if (dir === this.root) this.attachedAt = Date.now()
        const w = watch(dir, (event, filename) => {
          if (!filename) {
            this.full = true
            this.schedule()
            return
          }
          const childAbs = join(dir, filename.toString())
          const childRel = toPosix(relative(this.root, childAbs))
          this.record(childRel, event)
          // A new subdirectory needs its own watcher.
          void fs
            .stat(childAbs)
            .then((st) => (st.isDirectory() ? this.watchTree(childAbs) : undefined))
            .catch(() => this.unwatch(childAbs))
        })
        w.on('error', () => this.unwatch(dir))
        this.dirWatchers.set(dir, w)
      } catch (e) {
        if (dir === this.root) this.failed(e)
        return
      }
    }
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    await Promise.all(entries.filter((e) => e.isDirectory()).map((e) => this.watchTree(join(dir, e.name))))
  }

  private unwatch(dir: string): void {
    for (const [d, w] of this.dirWatchers) {
      if (d === dir || d.startsWith(`${dir}/`) || d.startsWith(`${dir}\\`)) {
        w.close()
        this.dirWatchers.delete(d)
      }
    }
    if (dir === this.root) this.failed(new Error('root watcher closed'))
  }

  private failed(e: unknown): void {
    // A folder away for weeks (a drive unplugged – B113): the log gets the first failure, then one an hour with their
    // number – never one every few seconds.
    this.unreported++
    // A watcher that ran a while failed anew: a new outage – logged at once, as the first one.
    const stable = !!this.attachedAt && Date.now() - this.attachedAt >= STABLE_MS
    if (!this.reportedAt || stable || Date.now() - this.reportedAt >= REPORT_EVERY_MS) {
      this.onError?.(e, this.unreported - 1)
      this.unreported = 0
      this.reportedAt = Date.now()
    }
    this.native?.close()
    this.native = null
    for (const w of this.dirWatchers.values()) w.close()
    this.dirWatchers.clear()
    this.full = true
    this.schedule()
    if (this.restart || this.stopped) return
    // A watcher that ran a while failed anew: the waits start over; one failing at once – each wait twice the last.
    if (this.attachedAt && Date.now() - this.attachedAt >= STABLE_MS) this.restartMs = RESTART_FIRST_MS
    const wait = this.restartMs
    this.restartMs = Math.min(this.restartMs * 2, RESTART_MAX_MS)
    this.restart = setTimeout(() => {
      this.restart = null
      if (this.stopped) return
      if (this.mode === 'native') this.attachNative()
      else void this.watchTree(this.root)
    }, wait)
  }

  /** The next restart's wait (tests). */
  get nextRestartMs(): number {
    return this.restartMs
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      const paths = this.full ? null : [...this.pending]
      this.pending.clear()
      this.full = false
      if (paths && paths.length === 0) return
      this.onChange(paths)
    }, this.debounceMs)
  }

  stop(): void {
    this.stopped = true
    this.native?.close()
    this.native = null
    for (const w of this.dirWatchers.values()) w.close()
    this.dirWatchers.clear()
    for (const t of [this.timer, this.restart]) if (t) clearTimeout(t)
    if (this.poll) clearInterval(this.poll)
    this.timer = this.restart = this.poll = null
  }
}

/**
 * Refreshes of the folder one at a time (W21): what is asked while one runs waits as one more – the paths joined, a
 * full rescan instead when any asks for it. `request` resolves when the refresh covering it is done.
 */
export class RefreshQueue {
  private running: Promise<void> | null = null
  private full = false
  private paths: Set<string> | null = null

  constructor(private readonly run: (paths: string[] | undefined) => Promise<void>) {}

  request(paths?: readonly string[]): Promise<void> {
    if (!paths) this.full = true
    else if (!this.full) {
      this.paths ??= new Set()
      for (const p of paths) this.paths.add(p)
    }
    this.running ??= this.drain()
    return this.running
  }

  /** Runs until nothing waits; a run that failed fails the requests it covered, the next ones still run. */
  private async drain(): Promise<void> {
    let failure: unknown = null
    try {
      while (this.full || this.paths) {
        const paths = this.full ? undefined : [...this.paths!]
        this.full = false
        this.paths = null
        try {
          await this.run(paths)
        } catch (e) {
          failure = e
        }
      }
    } finally {
      this.running = null
    }
    if (failure) throw failure
  }
}
