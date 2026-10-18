// adapted from ICTTJ src/main/datastore/fsutil.ts @ 84a8339
import { promises as fs } from 'node:fs'
import { join, relative } from 'node:path'
import { toPosix } from '@shared/paths'

export interface WalkOptions {
  /** Stop listing (the walk rejects with the signal's reason). */
  signal?: AbortSignal
  /** Called with each file found (opening a folder counts them on screen). */
  onFile?: (rel: string) => void
}

/** Recursively list files under `dir`, returning paths relative to `root` with forward slashes. */
export async function walkFiles(root: string, dir: string, skip?: (rel: string) => boolean, opts: WalkOptions = {}): Promise<string[]> {
  const out: string[] = []
  async function visit(abs: string): Promise<void> {
    opts.signal?.throwIfAborted()
    let entries
    try {
      entries = await fs.readdir(abs, { withFileTypes: true })
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return
      throw e
    }
    for (const entry of entries) {
      const childAbs = join(abs, entry.name)
      const rel = toPosix(relative(root, childAbs))
      if (skip?.(rel)) continue
      if (entry.isDirectory()) await visit(childAbs)
      else if (entry.isFile()) {
        out.push(rel)
        opts.onFile?.(rel)
      }
    }
  }
  await visit(dir)
  return out
}

/**
 * Run `fn` over items with bounded concurrency, preserving order of results. An aborted `signal` starts no more items
 * and rejects with its reason once the ones in flight are done.
 */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>, signal?: AbortSignal): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function worker(): Promise<void> {
    while (next < items.length && !signal?.aborted) {
      const i = next++
      results[i] = await fn(items[i] as T, i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  signal?.throwIfAborted()
  return results
}

export async function dirSize(dir: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0
  let files = 0
  const rels = await walkFiles(dir, dir)
  await mapLimit(rels, 24, async (rel) => {
    try {
      const st = await fs.stat(join(dir, rel))
      bytes += st.size
      files++
    } catch {
      /* removed meanwhile */
    }
  })
  return { bytes, files }
}
