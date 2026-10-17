/**
 * The ICTTJ folder of this computer (D60, D72): read at the start and again on every change of its `payouts/` and
 * `forecasts/` (a watcher, and a re-read every half minute for what a sync tool does without events). A snapshot that
 * changed goes to the windows; FI never writes there.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { EMPTY_ICTJ, type IctjSnapshot } from '@shared/ictj'
import { FolderWatcher } from '../datastore/watch'
import { readIctjFolder } from './reader'

const SUBDIRS = ['payouts', 'forecasts'] as const
const POLL_MS = 30_000

/** What a window needs to know changed (the time of the reading does not count). */
const signature = (s: IctjSnapshot) => JSON.stringify([s.dir, s.status, s.message, s.entries, s.forecasts, s.warnings])

export class IctjSource {
  private snap: IctjSnapshot = EMPTY_ICTJ
  private dir: string | null = null
  private watchers = new Map<string, FolderWatcher>()
  private poll: NodeJS.Timeout | null = null
  private reading: Promise<IctjSnapshot> | null = null
  /** The folder of the read in progress: another folder's read is never reused. */
  private readingDir: string | null = null
  private again = false
  private published = signature(EMPTY_ICTJ)

  constructor(private readonly opts: { onSnapshot: (s: IctjSnapshot) => void; log: (level: 'info' | 'warn' | 'error', msg: string, e?: unknown) => void }) {}

  get snapshot(): IctjSnapshot {
    return this.snap
  }

  /** Read another folder (null = none on this computer): the old watchers go, the new snapshot goes out. */
  async setDir(dir: string | null): Promise<IctjSnapshot> {
    this.stop()
    this.dir = dir
    if (!dir) {
      this.publish(EMPTY_ICTJ)
      return this.snap
    }
    this.poll = setInterval(() => void this.refresh(), POLL_MS)
    this.poll.unref?.()
    return this.refresh()
  }

  /**
   * Read the folder again (one reading of a folder at a time; a change during it reads once more after). A read of a
   * folder that is no longer the chosen one (changed, stopped) publishes nothing and watches nothing.
   */
  refresh(): Promise<IctjSnapshot> {
    const dir = this.dir
    if (!dir) return Promise.resolve(this.snap)
    if (this.reading && this.readingDir === dir) {
      this.again = true
      return this.reading
    }
    this.again = false
    this.readingDir = dir
    const reading: Promise<IctjSnapshot> = (async () => {
      let snap = await readIctjFolder(dir)
      while (this.again && this.dir === dir) {
        this.again = false
        snap = await readIctjFolder(dir)
      }
      if (this.dir !== dir) return snap
      this.attach(dir)
      this.publish(snap)
      return snap
    })().finally(() => {
      if (this.reading === reading) {
        this.reading = null
        this.readingDir = null
      }
    })
    this.reading = reading
    return reading
  }

  /** Watch `payouts/` and `forecasts/` once they exist (ICTTJ creates them with the first entry). */
  private attach(dir: string): void {
    for (const sub of SUBDIRS) {
      const root = join(dir, sub)
      if (this.watchers.has(root) || !existsSync(root)) continue
      const w = new FolderWatcher(root, () => void this.refresh(), {
        // The half-minute re-read is the source's own (one for both folders).
        pollMs: 24 * 3600_000,
        onError: (e) => this.opts.log('warn', `obserwacja ${sub} ICTTJ`, e)
      })
      w.start()
      this.watchers.set(root, w)
    }
  }

  private publish(snap: IctjSnapshot): void {
    const sig = signature(snap)
    const changed = sig !== this.published
    if (changed && snap.status !== this.snap.status) this.opts.log('info', `ICTTJ: ${snap.status}${snap.dir ? ` (${snap.entries.length} wpisów, ${snap.forecasts.length} scenariuszy)` : ''}`)
    this.snap = snap
    this.published = sig
    if (changed) this.opts.onSnapshot(snap)
  }

  /** No folder any more (another one comes with `setDir`): a read in progress ends without effect. */
  stop(): void {
    this.dir = null
    for (const w of this.watchers.values()) w.stop()
    this.watchers.clear()
    if (this.poll) clearInterval(this.poll)
    this.poll = null
  }
}
