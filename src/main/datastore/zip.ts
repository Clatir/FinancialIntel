// adapted from ICTTJ src/main/datastore/zip.ts @ 84a8339 (the writer replaced: W7)
import { promises as fs, type Stats } from 'node:fs'
import { dirname, join } from 'node:path'
import zlib from 'node:zlib'
import { tempPathFor, withRetry } from './atomic'
import { mapLimit, walkFiles } from './fsutil'

/**
 * Compression of one small file: in place, a file at a time – handing ~1 KB to the thread pool costs more than
 * compressing it (3 s against 1 s for 30 thousand files, W7). A 4 KB window: the files are small, and its smaller
 * state is quicker to set up.
 */
const DEFLATE: zlib.ZlibOptions = { windowBits: 12, memLevel: 6 }
/** Files compressed between two turns of the event loop (about 2 ms): the main process stays responsive. */
const SLICE = 32
const tick = () => new Promise<void>((r) => setImmediate(r))

export interface ZipResult {
  files: number
  bytes: number
}

/** Files got at a time: the disk kept busy, little memory held. */
const BATCH = 256
const READ_CONCURRENCY = 16
/** Written in chunks of about this size. */
const FLUSH_BYTES = 1 << 20

const VERSION_MADE_BY = (3 << 8) | 63 // UNIX, spec 6.3 – the external attributes carry the file mode
const VERSION_NEEDED = 20
const VERSION_ZIP64 = 45
const FLAG_UTF8 = 0x0800
const FILE_MODE = 0o100664
const MAX16 = 0xffff
const MAX32 = 0xffffffff

interface Entry {
  name: Buffer
  crc: number
  size: number
  csize: number
  method: number
  time: number
  date: number
  unix: number
  offset: number
}

function dosDateTime(d: Date): { date: number; time: number } {
  const year = Math.max(1980, d.getFullYear())
  return {
    date: (d.getDate() & 0x1f) | (((d.getMonth() + 1) & 0xf) << 5) | (((year - 1980) & 0x7f) << 9),
    time: Math.floor(d.getSeconds() / 2) | ((d.getMinutes() & 0x3f) << 5) | ((d.getHours() & 0x1f) << 11)
  }
}

/** The extended timestamp (0x5455): the modification time in seconds, UTC – the DOS time has no zone and 2 s steps. */
function timestampExtra(unix: number): Buffer {
  const b = Buffer.alloc(9)
  b.writeUInt16LE(0x5455, 0)
  b.writeUInt16LE(5, 2)
  b.writeUInt8(1, 4)
  b.writeUInt32LE(unix >>> 0, 5)
  return b
}

/**
 * A ZIP written in one pass (W7): entries appended in order with their sizes and CRC known (no data descriptors), the
 * central directory at the end, ZIP64 end records past 65 535 entries or 4 GB. Its cost grows with the number of
 * files – yazl looked for the next entry from the first one at every step, minutes at 150 thousand files.
 */
class ZipWriter {
  private readonly entries: Entry[] = []
  private offset = 0
  private chunks: Buffer[] = []
  private pending = 0

  constructor(private readonly fh: fs.FileHandle) {}

  /** One file: `deflated` = its compressed content (null = stored as it is, also when compressing gained nothing). */
  async add(name: string, data: Buffer, mtime: Date, deflated: Buffer | null): Promise<void> {
    const stored = !deflated || deflated.length >= data.length
    const body = stored ? data : deflated
    const { date, time } = dosDateTime(mtime)
    const entry: Entry = {
      name: Buffer.from(name, 'utf8'),
      crc: zlib.crc32(data) >>> 0,
      size: data.length,
      csize: body.length,
      method: stored ? 0 : 8,
      time,
      date,
      unix: Math.floor(mtime.getTime() / 1000),
      offset: this.offset
    }
    if (entry.size >= MAX32) throw new Error(`Plik za duży do kopii: ${name}`)
    const extra = timestampExtra(entry.unix)
    const head = Buffer.alloc(30)
    head.writeUInt32LE(0x04034b50, 0)
    head.writeUInt16LE(VERSION_NEEDED, 4)
    head.writeUInt16LE(FLAG_UTF8, 6)
    head.writeUInt16LE(entry.method, 8)
    head.writeUInt16LE(entry.time, 10)
    head.writeUInt16LE(entry.date, 12)
    head.writeUInt32LE(entry.crc, 14)
    head.writeUInt32LE(entry.csize, 18)
    head.writeUInt32LE(entry.size, 22)
    head.writeUInt16LE(entry.name.length, 26)
    head.writeUInt16LE(extra.length, 28)
    this.entries.push(entry)
    await this.write(head, entry.name, extra, body)
  }

  /** The central directory and the end records; the file is complete once this resolves. */
  async finish(): Promise<number> {
    const cdStart = this.offset
    for (const e of this.entries) {
      const zip64 = e.offset >= MAX32
      const extra = zip64 ? Buffer.alloc(12) : Buffer.alloc(0)
      if (zip64) {
        extra.writeUInt16LE(0x0001, 0)
        extra.writeUInt16LE(8, 2)
        extra.writeBigUInt64LE(BigInt(e.offset), 4)
      }
      const time = timestampExtra(e.unix)
      const rec = Buffer.alloc(46)
      rec.writeUInt32LE(0x02014b50, 0)
      rec.writeUInt16LE(VERSION_MADE_BY, 4)
      rec.writeUInt16LE(zip64 ? VERSION_ZIP64 : VERSION_NEEDED, 6)
      rec.writeUInt16LE(FLAG_UTF8, 8)
      rec.writeUInt16LE(e.method, 10)
      rec.writeUInt16LE(e.time, 12)
      rec.writeUInt16LE(e.date, 14)
      rec.writeUInt32LE(e.crc, 16)
      rec.writeUInt32LE(e.csize, 20)
      rec.writeUInt32LE(e.size, 24)
      rec.writeUInt16LE(e.name.length, 28)
      rec.writeUInt16LE(time.length + extra.length, 30)
      rec.writeUInt16LE(0, 32)
      rec.writeUInt16LE(0, 34)
      rec.writeUInt16LE(0, 36)
      rec.writeUInt32LE((FILE_MODE << 16) >>> 0, 38)
      rec.writeUInt32LE(zip64 ? MAX32 : e.offset, 42)
      await this.write(rec, e.name, time, extra)
    }
    const cdSize = this.offset - cdStart
    const count = this.entries.length
    const zip64 = count >= MAX16 || cdStart >= MAX32 || cdSize >= MAX32
    if (zip64) {
      const recordAt = this.offset
      const rec = Buffer.alloc(56)
      rec.writeUInt32LE(0x06064b50, 0)
      rec.writeBigUInt64LE(44n, 4)
      rec.writeUInt16LE(VERSION_MADE_BY, 12)
      rec.writeUInt16LE(VERSION_ZIP64, 14)
      rec.writeUInt32LE(0, 16)
      rec.writeUInt32LE(0, 20)
      rec.writeBigUInt64LE(BigInt(count), 24)
      rec.writeBigUInt64LE(BigInt(count), 32)
      rec.writeBigUInt64LE(BigInt(cdSize), 40)
      rec.writeBigUInt64LE(BigInt(cdStart), 48)
      const locator = Buffer.alloc(20)
      locator.writeUInt32LE(0x07064b50, 0)
      locator.writeUInt32LE(0, 4)
      locator.writeBigUInt64LE(BigInt(recordAt), 8)
      locator.writeUInt32LE(1, 16)
      await this.write(rec, locator)
    }
    const end = Buffer.alloc(22)
    end.writeUInt32LE(0x06054b50, 0)
    end.writeUInt16LE(0, 4)
    end.writeUInt16LE(0, 6)
    end.writeUInt16LE(zip64 ? MAX16 : count, 8)
    end.writeUInt16LE(zip64 ? MAX16 : count, 10)
    end.writeUInt32LE(zip64 ? MAX32 : cdSize, 12)
    end.writeUInt32LE(zip64 ? MAX32 : cdStart, 16)
    end.writeUInt16LE(0, 20)
    await this.write(end)
    await this.flush()
    return count
  }

  private async write(...parts: Buffer[]): Promise<void> {
    for (const p of parts) {
      if (!p.length) continue
      this.chunks.push(p)
      this.pending += p.length
      this.offset += p.length
    }
    if (this.pending >= FLUSH_BYTES) await this.flush()
  }

  private async flush(): Promise<void> {
    if (!this.chunks.length) return
    const buf = Buffer.concat(this.chunks)
    this.chunks = []
    this.pending = 0
    for (let at = 0; at < buf.length; ) at += (await this.fh.write(buf, at, buf.length - at)).bytesWritten
  }
}

/** A file's stat and content through one open; null = gone (or no file any more). */
async function readFile(abs: string): Promise<{ st: Stats; data: Buffer } | null> {
  let fh
  try {
    fh = await withRetry(() => fs.open(abs, 'r'))
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
  try {
    const st = await fh.stat()
    return st.isFile() ? { st, data: await fh.readFile() } : null
  } finally {
    await fh.close()
  }
}

/** One file of a ZIP: its name, and its content with its time (null = left out – gone meanwhile). */
export interface ZipSource {
  name: string
  read: () => ZipContent | null | Promise<ZipContent | null>
}

export interface ZipContent {
  data: Buffer
  mtime: Date
}

/** A file on the disk, read whole at once when its turn comes; gone = left out, unreadable = an error. */
export function diskSource(abs: string, name: string): ZipSource {
  return {
    name,
    read: async () => {
      const f = await readFile(abs)
      return f && { data: f.data, mtime: f.st.mtime }
    }
  }
}

/**
 * Write the files in the order given into `outFile`, atomically (a temp file renamed over it). Already-compressed
 * images are stored; the contents of a batch are got side by side (disk reads), compressed and appended in order.
 */
export async function writeZipFile(outFile: string, items: readonly ZipSource[]): Promise<ZipResult> {
  await fs.mkdir(dirname(outFile), { recursive: true })
  const tmp = tempPathFor(outFile)
  try {
    const fh = await fs.open(tmp, 'w')
    let files: number
    try {
      const zip = new ZipWriter(fh)
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH)
        const contents = await mapLimit(batch, READ_CONCURRENCY, async (item) => item.read())
        for (let j = 0; j < batch.length; j++) {
          const content = contents[j]
          if (!content) continue
          const name = batch[j]!.name
          const compress = content.data.length > 0 && !/\.(webp|png|jpe?g|zip)$/i.test(name)
          await zip.add(name, content.data, content.mtime, compress ? zlib.deflateRawSync(content.data, DEFLATE) : null)
          if (j % SLICE === SLICE - 1) await tick()
        }
      }
      files = await zip.finish()
      await fh.sync()
    } finally {
      await fh.close()
    }
    await withRetry(() => fs.rename(tmp, outFile))
    return { files, bytes: (await fs.stat(outFile)).size }
  } catch (e) {
    await fs.rm(tmp, { force: true }).catch(() => undefined)
    throw e
  }
}

/**
 * Zip files under `root` (relative paths accepted by `include`; directories `skip` says are not walked – `.history/`
 * with a directory per record, W7) into `outFile`, atomically. Each file is read whole at once, so one rewritten
 * meanwhile (an atomic write replaces it) goes in old or new, never half; one gone before its turn is left out. A file
 * locked while zipping (sync tools) fails the attempt; it is retried once with a fresh listing before giving up.
 */
export async function zipFolder(root: string, outFile: string, include: (rel: string) => boolean, skip?: (rel: string) => boolean): Promise<ZipResult> {
  for (let attempt = 1; ; attempt++) {
    const rels = (await walkFiles(root, root, skip)).filter(include).sort()
    const items = rels.map((rel) => diskSource(join(root, ...rel.split('/')), rel))
    try {
      return await writeZipFile(outFile, items)
    } catch (e) {
      if (attempt >= 2) throw e
    }
  }
}
