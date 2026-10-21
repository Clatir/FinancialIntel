/**
 * When the phone syncs (T304): a change made here goes up after a moment, OneDrive is asked every half minute while the
 * app is in front, at its return to the front and on demand; one run at a time (pull, then push). Without a connection
 * it waits longer each time; a sign-in needed stops it until the user signs in again.
 */
import { AuthError, GraphError } from './graph'
import { NetworkError } from './http'
import { SignInError } from './auth'
import { RootGoneError, type SyncEngine } from './engine'

export type SyncState = 'idle' | 'syncing' | 'offline' | 'auth' | 'error'

export interface SyncStatus {
  state: SyncState
  /** Local changes not on OneDrive yet. */
  pending: number
  /** The last run that went through (ISO). */
  lastSync: string | null
  message: string | null
  /** The first copy of the folder: files read of all. */
  progress: { done: number; total: number } | null
  /** Copies made of this phone's changes that met a computer's – the latest run's. */
  copies: string[]
}

export interface SchedulerOptions {
  intervalMs?: number
  debounceMs?: number
  /** Waits after failures (offline, a server's error), the longest last. */
  backoffMs?: number[]
  onStatus?: (s: SyncStatus) => void
  /** Before each run: the data store's saves in flight finish first (their files go up in this run). */
  beforeRun?: () => Promise<void>
}

export class SyncScheduler {
  status: SyncStatus = { state: 'idle', pending: 0, lastSync: null, message: null, progress: null, copies: [] }
  private timer: ReturnType<typeof setTimeout> | null = null
  private interval: ReturnType<typeof setInterval> | null = null
  private running: Promise<void> | null = null
  private again = false
  private failures = 0
  private stopped = true
  private readonly intervalMs: number
  private readonly debounceMs: number
  private readonly backoff: number[]

  constructor(
    private readonly engine: SyncEngine,
    private readonly o: SchedulerOptions = {}
  ) {
    this.intervalMs = o.intervalMs ?? 30_000
    this.debounceMs = o.debounceMs ?? 1500
    this.backoff = o.backoffMs ?? [10_000, 30_000, 60_000, 120_000]
  }

  private set(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch }
    this.o.onStatus?.(this.status)
  }

  /** Asking OneDrive regularly (the app in front). */
  start(): void {
    this.stopped = false
    if (!this.interval) this.interval = setInterval(() => void this.syncNow(), this.intervalMs)
    void this.syncNow()
  }

  /** The app in the background: no asking (iOS suspends it anyway). */
  stop(): void {
    this.stopped = true
    if (this.interval) clearInterval(this.interval)
    this.interval = null
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  /** A change made here: up after a moment (several changes at once go together). */
  kick(): void {
    this.set({ pending: this.engine.pending() })
    if (this.stopped || this.status.state === 'auth') return
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.syncNow()
    }, this.debounceMs)
  }

  /** One run now (a run in progress: another right after it). */
  syncNow(): Promise<void> {
    if (this.running) {
      this.again = true
      return this.running
    }
    this.running = this.run().finally(() => {
      this.running = null
      if (this.again && !this.stopped) {
        this.again = false
        void this.syncNow()
      }
    })
    return this.running
  }

  private async run(): Promise<void> {
    if (this.status.state === 'auth') return
    this.set({ state: 'syncing', message: null })
    try {
      await this.o.beforeRun?.()
      const pulled = await this.engine.pull((done, total) => this.set({ progress: total > 20 ? { done, total } : null }))
      const pushed = await this.engine.push()
      this.failures = 0
      this.set({ state: 'idle', progress: null, lastSync: new Date().toISOString(), pending: this.engine.pending(), copies: [...pulled.copies, ...pushed.copies] })
    } catch (e) {
      this.failures++
      const wait = this.backoff[Math.min(this.failures - 1, this.backoff.length - 1)]!
      if (e instanceof AuthError || e instanceof SignInError) {
        this.set({ state: 'auth', progress: null, pending: this.engine.pending(), message: e.message })
        return
      }
      if (e instanceof NetworkError) this.set({ state: 'offline', progress: null, pending: this.engine.pending(), message: 'Brak połączenia – zmiany czekają na telefonie i pójdą, gdy wróci sieć.' })
      else if (e instanceof RootGoneError) {
        this.set({ state: 'error', progress: null, pending: this.engine.pending(), message: e.message })
        return
      } else {
        const msg = e instanceof GraphError ? `OneDrive: ${e.message}` : e instanceof Error ? e.message : String(e)
        this.set({ state: 'error', progress: null, pending: this.engine.pending(), message: msg })
      }
      if (!this.stopped) {
        if (this.timer) clearTimeout(this.timer)
        this.timer = setTimeout(() => {
          this.timer = null
          void this.syncNow()
        }, wait)
      }
    }
  }

  /** Signed in again: the runs resume. */
  resume(): void {
    if (this.status.state === 'auth') this.set({ state: 'idle', message: null })
    this.failures = 0
    if (!this.stopped) void this.syncNow()
  }
}
