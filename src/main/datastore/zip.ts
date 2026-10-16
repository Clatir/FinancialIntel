// adapted from ICTTJ src/main/datastore/zip.ts @ 84a8339
import fsCb, { createReadStream, createWriteStream, promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import yazl from 'yazl'
import { withRetry, tempPathFor } from './atomic'
import { walkFiles } from './fsutil'

export interface ZipResult {
  files: number
  bytes: number
}

async function writeZip(root: string, files: Array<{ rel: string; mtime: Date }>, tmp: string): Promise<void> {
  const zip = new yazl.ZipFile()
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(tmp)
    let failed = false
    const fail = (e: unknown) => {
      if (failed) return
      failed = true
      // Release the file handle before the caller removes the temp file (Windows would refuse).
      if (out.closed) reject(e)
      else {
        out.once('close', () => reject(e))
        out.destroy()
      }
    }
    // yazl reports unreadable / vanished source files on the ZipFile itself, not on its output stream.
    zip.on('error', fail)
    zip.outputStream.on('error', fail)
    out.on('error', fail)
    out.on('close', () => {
      if (!failed) resolve()
    })
    zip.outputStream.pipe(out)
    for (const { rel, mtime } of files) {
      const compress = !/\.(webp|png|jpe?g|zip)$/i.test(rel)
      const path = join(root, ...rel.split('/'))
      // Opened only when its turn comes and without a size fixed in advance: a record rewritten meanwhile (the
      // app may save records right after start, when the daily backup runs) goes in whole, old or new – an
      // atomic write replaces the file, the open handle keeps reading the version it opened.
      zip.addReadStreamLazy(rel, { compress, mtime }, (cb) => {
        fsCb.open(path, 'r', (err, fd) => (err ? cb(err, undefined as never) : cb(null, createReadStream('', { fd }))))
      })
    }
    zip.end()
  })
}

/**
 * Zip files under `root` (relative paths accepted by `include`) into `outFile`, atomically.
 * Already-compressed images are stored without recompression. A file that vanished before zipping
 * is left out; one that disappears or is locked while zipping (sync tools, the app renaming a record)
 * fails the attempt; it is retried once with a fresh listing before giving up. Files rewritten while
 * zipping are fine (see `writeZip`).
 */
export async function zipFolder(root: string, outFile: string, include: (rel: string) => boolean): Promise<ZipResult> {
  await fs.mkdir(dirname(outFile), { recursive: true })
  for (let attempt = 1; ; attempt++) {
    const rels = (await walkFiles(root, root)).filter(include).sort()
    const files: Array<{ rel: string; mtime: Date }> = []
    for (const rel of rels) {
      const st = await fs.stat(join(root, ...rel.split('/'))).catch(() => null)
      if (st?.isFile()) files.push({ rel, mtime: st.mtime })
    }
    const tmp = tempPathFor(outFile)
    try {
      await writeZip(root, files, tmp)
      await withRetry(() => fs.rename(tmp, outFile))
      const st = await fs.stat(outFile)
      return { files: files.length, bytes: st.size }
    } catch (e) {
      await fs.rm(tmp, { force: true }).catch(() => undefined)
      if (attempt >= 2) throw e
    }
  }
}
