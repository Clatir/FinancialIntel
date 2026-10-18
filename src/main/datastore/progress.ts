/**
 * Opening a data folder step by step (1.4.1): which file is being read, how many are done, which ones were slow. On
 * a new computer OneDrive keeps the files online-only and fetches each one on its first read – a folder of a thousand
 * small files then takes minutes, and without this nothing on screen or in the log told what was going on.
 */
import type { LoadStep, OpenStep, SlowFile } from '@shared/api'

export interface LoadProgress {
  step: LoadStep
  /** Files read; files found (while listing: found so far). */
  done: number
  total: number
  /** The file waiting longest right now. */
  waiting: SlowFile | null
  /** Reads that took at least the slow threshold. */
  slow: number
}

export interface LoadStats {
  files: number
  listMs: number
  readMs: number
  migrateMs: number
  slow: number
  /** The slowest reads (at most `SLOWEST_KEPT`, slowest first). */
  slowest: SlowFile[]
}

export const SLOWEST_KEPT = 5

export class ReadTracker {
  private readonly started = new Map<string, number>()
  step: LoadStep = 'list'
  done = 0
  total = 0
  slow = 0
  private readonly slowestList: SlowFile[] = []

  constructor(
    private readonly slowMs: number,
    private readonly now: () => number = () => performance.now()
  ) {}

  start(relPath: string): void {
    this.started.set(relPath, this.now())
  }

  end(relPath: string): void {
    const at = this.started.get(relPath)
    this.started.delete(relPath)
    this.done++
    if (at == null) return
    const ms = Math.round(this.now() - at)
    if (ms >= this.slowMs) this.slow++
    this.keep({ relPath, ms })
  }

  private keep(file: SlowFile): void {
    const list = this.slowestList
    if (list.length >= SLOWEST_KEPT && file.ms <= list[list.length - 1]!.ms) return
    list.push(file)
    list.sort((a, b) => b.ms - a.ms)
    if (list.length > SLOWEST_KEPT) list.pop()
  }

  /** The file in flight the longest (Map keeps the insertion order: the first one started earliest). */
  waiting(): SlowFile | null {
    for (const [relPath, at] of this.started) return { relPath, ms: Math.round(this.now() - at) }
    return null
  }

  slowest(): SlowFile[] {
    return [...this.slowestList]
  }

  progress(): LoadProgress {
    return { step: this.step, done: this.done, total: this.total, waiting: this.waiting(), slow: this.slow }
  }
}

/** One line of the log about an open in progress or stopped: the step, the counts, the file waiting. */
export function describeProgress(p: Omit<LoadProgress, 'step'> & { step: OpenStep }, elapsedMs: number): string {
  const parts = [`step ${p.step}`, `${p.done}/${p.total} files`, `${p.slow} slow`, `${Math.round(elapsedMs / 1000)} s`]
  if (p.waiting) parts.push(`waiting ${p.waiting.relPath} ${Math.round(p.waiting.ms / 1000)} s`)
  return parts.join(', ')
}

/** Resolve with `p`, or reject as soon as `signal` aborts (the work itself goes on, its result is dropped). */
export function untilAborted<T>(p: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    p.catch(() => undefined)
    return Promise.reject(signal.reason)
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      p.catch(() => undefined)
      reject(signal.reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    p.then(
      (v) => {
        signal.removeEventListener('abort', onAbort)
        resolve(v)
      },
      (e) => {
        signal.removeEventListener('abort', onAbort)
        reject(e)
      }
    )
  })
}
