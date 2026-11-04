// adapted from ICTTJ src/main/datastore/atomic.ts @ 84a8339
import { createHash, randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'

const RETRYABLE = new Set(['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY', 'EMFILE'])

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Retry an fs operation that may transiently fail on Windows when OneDrive, an antivirus
 * or the indexer briefly locks a file.
 */
export async function withRetry<T>(op: () => Promise<T>, attempts = 8): Promise<T> {
  let delay = 15
  for (let i = 0; ; i++) {
    try {
      return await op()
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code
      if (i >= attempts - 1 || !code || !RETRYABLE.has(code)) throw e
      await sleep(delay)
      delay = Math.min(delay * 2, 500)
    }
  }
}

export function sha1(data: string | Uint8Array): string {
  return createHash('sha1').update(data).digest('hex')
}

/** Temp files are hidden (leading dot) and contain ".tmp-", so scanners and the watcher ignore them. */
export function tempPathFor(target: string): string {
  return join(dirname(target), `.${basename(target)}.tmp-${randomBytes(4).toString('hex')}`)
}

const errCode = (e: unknown): string | undefined => (e as NodeJS.ErrnoException).code

/** A directory made if missing – its parent must be there (no recursive creation). */
export async function mkdirOne(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir)
  } catch (e) {
    if (errCode(e) !== 'EEXIST') throw e
  }
}

/**
 * `dir` made where missing, but only below `root` (AP-1): the data folder itself is never made by a write – gone
 * (renamed, a drive unplugged, OneDrive away), the write fails with ENOENT instead of a new empty folder in its old place
 * taking the records („folder-widmo”). The common case – the directory there – costs one call.
 */
export async function mkdirWithin(root: string, dir: string): Promise<void> {
  const rel = relative(resolve(root), resolve(dir))
  // The root itself: never made here – a write into it fails by itself when it is gone.
  if (!rel) return
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Ścieżka poza folderem danych: ${dir}`)
  try {
    await fs.mkdir(dir)
    return
  } catch (e) {
    if (errCode(e) === 'EEXIST') return
    if (errCode(e) !== 'ENOENT') throw e
  }
  // A parent missing too: made one by one from the root down – a root that is gone fails the first of them.
  let cur = resolve(root)
  for (const part of rel.split(/[\\/]+/)) {
    cur = join(cur, part)
    await mkdirOne(cur)
  }
}

/** `root` when `path` is it or lies in it, else null: what a write of `path` passes as its `within` (AP-1). */
export function dataRootOf(root: string, path: string): string | null {
  const rel = relative(resolve(root), resolve(path))
  return !rel || (rel.split(/[\\/]/)[0] !== '..' && !isAbsolute(rel)) ? root : null
}

/**
 * The directory of a file about to be written. `within` – the data folder the file lies in: directories made only below
 * it, never the folder itself (AP-1, T314); null – no data folder's file (this computer's settings, a file the user saved
 * elsewhere, a folder of backups set on this computer): made as needed. Required of every writer, so none forgets it.
 */
export async function mkdirFor(target: string, within: string | null): Promise<void> {
  if (within) await mkdirWithin(within, dirname(target))
  else await fs.mkdir(dirname(target), { recursive: true })
}

/**
 * Atomic write: write to a temp file in the same directory, fsync, then rename over the target.
 * A crash leaves either the old or the new file, never a truncated one. `within` – the data folder the target lies in,
 * null when none (`mkdirFor`). `attempts` – given (the write probe's presence, T335): each step a lock may refuse for a
 * moment – the directory, the temp file, the replacement – tried that many times; by default the directory and the temp
 * file once, the replacement 8 times.
 */
export async function writeFileAtomic(target: string, data: string | Uint8Array, within: string | null, attempts?: number): Promise<void> {
  await withRetry(() => mkdirFor(target, within), attempts ?? 1)
  const tmp = tempPathFor(target)
  const handle = await withRetry(() => fs.open(tmp, 'w'), attempts ?? 1)
  try {
    try {
      await handle.writeFile(data)
      await handle.sync()
    } finally {
      await handle.close()
    }
    await withRetry(() => fs.rename(tmp, target), attempts)
  } catch (e) {
    // e.g. disk full or the target locked for too long: never leave a half-written temp file behind.
    await fs.rm(tmp, { force: true }).catch(() => undefined)
    throw e
  }
}

export async function removeFile(target: string): Promise<void> {
  await withRetry(() => fs.rm(target, { force: true }))
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
