// adapted from ICTTJ src/main/datastore/presence.ts @ 84a8339
import { constants as fsConstants, promises as fs } from 'node:fs'
import { join } from 'node:path'
import { PRESENCE_DIR } from '@shared/paths'
import { atomicFailure, writeFileAtomic } from './atomic'

/** A machine counts as running if it refreshed its heartbeat within this window (in the tray every 5 min – N20). */
export const PRESENCE_WINDOW_MS = 11 * 60 * 1000
/** In use (D86): a move in one of the machine's windows within the last 10 minutes. */
export const IN_USE_MS = 10 * 60 * 1000
/** Another computer's clock a little ahead: its heartbeat „from the future” still counts. */
const CLOCK_AHEAD_MS = 5 * 60 * 1000

/** Another computer with the folder open: in use, or only running (in the tray). */
export interface MachinePresence {
  machine: string
  lastSeen: string
  /** Its last move in a window; undefined = a version before 1.5.3 (counted as in use, as it then was). */
  activeAt?: string | null
  inUse: boolean
}

export function safeMachineName(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || 'KOMPUTER'
}

/**
 * `attempts` – the write probe's tries of each step (`writeFileAtomic`, T335); the heartbeat's write as every write.
 * This computer's own file not replaced for its attribute „tylko do odczytu” (a restored backup, a copy from elsewhere –
 * T337): the attribute cleared and the file written once more – else it would keep its old heartbeat for good and the
 * other computer take this one for not running. A file held (a lock) is left as it is – the next heartbeat tries again.
 */
export async function writePresence(root: string, machine: string, appVersion: string, activeAt: string | null = null, attempts?: number): Promise<void> {
  const file = join(root, PRESENCE_DIR, `${safeMachineName(machine)}.json`)
  const data = `${JSON.stringify({ machine, lastSeen: new Date().toISOString(), appVersion, activeAt }, null, 2)}\n`
  // The data folder gone: no presence – never a new empty folder in its old place for it (AP-1, DA.40).
  const write = () => writeFileAtomic(file, data, root, attempts)
  try {
    await write()
  } catch (e) {
    const failed = atomicFailure(e)
    if (!(failed?.step === 'replace' && ['EPERM', 'EACCES'].includes(failed.code ?? '') && (await madeWritable(file)))) throw e
    await write()
  }
}

/** `file` given back its owner's write right when it had none (on Windows: its attribute „tylko do odczytu” cleared); true = it was. */
async function madeWritable(file: string): Promise<boolean> {
  try {
    await fs.access(file, fsConstants.W_OK)
    return false
  } catch {
    try {
      await fs.chmod(file, ((await fs.stat(file)).mode & 0o777) | 0o200)
      return true
    } catch {
      return false
    }
  }
}

export async function clearPresence(root: string, machine: string): Promise<void> {
  await fs.rm(join(root, PRESENCE_DIR, `${safeMachineName(machine)}.json`), { force: true })
}

type Log = (level: 'info' | 'warn' | 'error', message: string, detail?: unknown) => void

/** What this computer's presence says (`PresenceKeeper`), read at each write: its version, its last move in a window (D86). */
export interface PresenceContent {
  appVersion: string
  activeAt: string | null
}

/**
 * This computer's presence in the folders (T316, przegląd 3 and 4). Kept: the folder open and each folder an open in
 * progress has – its write probe may have written the presence there already; cleared from a folder only when none keeps
 * it, so an open that failed or gave way never removes the presence a newer open of the same folder wrote. Its writes and
 * clears in a folder go one at a time (`write`, `beat`, `clear`): a clear on its way never lands after a newer write
 * there. The queue runs only the keeper's own writes and clears (`writePresence`, `clearPresence` – the content from
 * `content`), never a caller's op: none of them can wait in the queue for itself (przegląd N1 5).
 */
export class PresenceKeeper {
  private readonly roots: string[] = []
  /** Per folder, the last of the writes and clears queued there – each waits for the one before (other folders do not). */
  private readonly queues: { root: string; last: Promise<void> }[] = []
  /**
   * The folder whose heartbeat writes fail (`beat`): said in the log when it starts and ends. Ended unsaid too when the
   * folder is closed – its presence cleared or the heartbeat writing in another folder: a failure there again is a new
   * one (przegląd N1 5).
   */
  private failing: string | null = null

  constructor(
    private readonly machine: string,
    private readonly same: (a: string, b: string) => boolean,
    private readonly content: () => PresenceContent,
    private readonly log?: Log
  ) {}

  /** `root` kept until the returned release (called once or more). */
  keep(root: string): () => void {
    this.roots.push(root)
    let released = false
    return () => {
      if (released) return
      released = true
      this.roots.splice(this.roots.indexOf(root), 1)
    }
  }

  kept(root: string): boolean {
    return this.roots.some((r) => this.same(r, root))
  }

  /** `op` run on this computer's presence in `root` once the writes and clears queued there before it are done. */
  private queued(root: string, op: () => Promise<void>): Promise<void> {
    const found = this.queues.find((q) => this.same(q.root, root))
    const queue = found ?? { root, last: Promise.resolve() }
    if (!found) this.queues.push(queue)
    const result = queue.last.then(op)
    const last = result.catch(() => undefined)
    queue.last = last
    void last.then(() => {
      if (queue.last === last) this.queues.splice(this.queues.indexOf(queue), 1)
    })
    return result
  }

  /**
   * This computer's presence written in `root` in its turn there – the heartbeat's write (`beat`) and the write probe's
   * (`attempts` – its tries of each step, T335). What it says is read when its turn comes.
   */
  write(root: string, attempts?: number): Promise<void> {
    return this.queued(root, () => {
      const { appVersion, activeAt } = this.content()
      return writePresence(root, this.machine, appVersion, activeAt, attempts)
    })
  }

  /**
   * This computer's presence cleared from `root` in its turn – unless the folder open or an open of it in progress keeps
   * it then: checked right before the removal, not when asked (an open of the same folder may begin meanwhile).
   */
  clear(root: string): Promise<void> {
    return this.queued(root, async () => {
      if (this.kept(root)) return
      if (this.failing != null && this.same(this.failing, root)) this.failing = null
      await clearPresence(root, this.machine)
    })
  }

  /**
   * `clear` waited for `ms` at most (closing a folder, quitting – przegląd N1 5): a removal behind a slow write there
   * (OneDrive, a file held) never holds the close nor the next folder's open. Not waited for, it still goes in its turn
   * and checks the keeping then – a newer open's presence stays (T316). True = done (or failed) in time.
   */
  async clearWithin(root: string, ms: number): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const late = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), ms)
      timer.unref?.()
    })
    try {
      return await Promise.race([this.clear(root).then(() => true, () => true), late])
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * The heartbeat's write (T337): never rejects, never swallowed – a failure said in the log when it starts in a folder
   * (with its error) and when the presence is written there again, not at each retry in between (every minute, in the
   * tray every 5 – weeks of them would rotate the rest out of the log). Meanwhile the other computer takes this one for
   * not running.
   */
  async beat(root: string): Promise<void> {
    // The heartbeat writes in the open folder only: one in another folder means the failing one is closed (przegląd N1 5).
    if (this.failing != null && !this.same(this.failing, root)) this.failing = null
    const failingHere = () => this.failing != null && this.same(this.failing, root)
    try {
      await this.write(root)
    } catch (e) {
      if (!failingHere()) this.log?.('warn', `heartbeat: presence not written in ${root} – other computers take this one for not running until it is`, e)
      this.failing = root
      return
    }
    if (!failingHere()) return
    this.failing = null
    this.log?.('info', `heartbeat: presence written again in ${root}`)
  }
}

export async function readOtherMachines(root: string, machine: string, now = Date.now()): Promise<MachinePresence[]> {
  const dir = join(root, PRESENCE_DIR)
  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return []
  }
  const self = `${safeMachineName(machine)}.json`
  const out: MachinePresence[] = []
  for (const name of names) {
    if (!name.endsWith('.json') || name === self || name.includes('.tmp-')) continue
    try {
      const data = JSON.parse(await fs.readFile(join(dir, name), 'utf8')) as { machine?: string; lastSeen?: string; activeAt?: string | null }
      if (!data.lastSeen) continue
      const age = now - Date.parse(data.lastSeen)
      if (!(age > -CLOCK_AHEAD_MS && age < PRESENCE_WINDOW_MS)) continue
      // A version before 1.5.3 writes no `activeAt` and its heartbeat every minute: in use while it beats (as before).
      const old = !('activeAt' in data)
      const inUse = old ? age < 3 * 60 * 1000 : !!data.activeAt && now - Date.parse(data.activeAt) < IN_USE_MS
      out.push({ machine: data.machine ?? name.replace(/\.json$/, ''), lastSeen: data.lastSeen, ...(old ? {} : { activeAt: data.activeAt ?? null }), inUse })
    } catch {
      /* partially synced file */
    }
  }
  return out
}
