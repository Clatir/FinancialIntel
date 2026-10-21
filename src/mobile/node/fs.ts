/**
 * `node:fs` on the phone (T305): the promise API the data store of the computers uses (`main/datastore/`), over the
 * mirror of the OneDrive folder (`vfs/vfs.ts`). `useVfs` sets the mirror the calls go to.
 */
import { Buffer } from 'buffer'
import { FsError, type Vfs } from '../vfs/vfs'

let current: Vfs | null = null

export function useVfs(vfs: Vfs | null): void {
  current = vfs
}

function vfs(): Vfs {
  if (!current) throw new FsError('ENOENT', 'open', '/')
  return current
}

type Encoding = string | { encoding?: string | null } | null | undefined

function encodingOf(opts: Encoding): string | null {
  if (!opts) return null
  if (typeof opts === 'string') return opts
  return opts.encoding ?? null
}

function decoded(bytes: Uint8Array, opts: Encoding): string | Buffer {
  const enc = encodingOf(opts)
  if (!enc) return Buffer.from(bytes)
  if (enc === 'utf8' || enc === 'utf-8') return new TextDecoder('utf-8').decode(bytes)
  return Buffer.from(bytes).toString(enc as BufferEncoding)
}

/** A file opened: what `readWithStat` (read) and `writeFileAtomic` (write) do with it. */
class FileHandle {
  private chunks: Uint8Array[] = []
  /** Written since the last `sync` (closing writes only what is not written yet). */
  private unsynced = false
  constructor(
    private readonly path: string,
    private readonly mode: 'r' | 'w'
  ) {}
  async stat() {
    return vfs().stat(this.path)
  }
  async readFile(opts?: Encoding): Promise<string | Buffer> {
    return decoded(await vfs().readFile(this.path), opts)
  }
  async writeFile(data: string | Uint8Array): Promise<void> {
    if (this.mode !== 'w') throw new FsError('EBADF', 'write', this.path)
    this.chunks.push(typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data))
    this.unsynced = true
  }
  async write(data: string | Uint8Array): Promise<{ bytesWritten: number }> {
    await this.writeFile(data)
    return { bytesWritten: typeof data === 'string' ? new TextEncoder().encode(data).length : data.length }
  }
  async sync(): Promise<void> {
    if (this.mode !== 'w' || !this.unsynced) return
    this.unsynced = false
    const total = this.chunks.reduce((n, c) => n + c.length, 0)
    const all = new Uint8Array(total)
    let at = 0
    for (const c of this.chunks) {
      all.set(c, at)
      at += c.length
    }
    await vfs().writeFile(this.path, all)
  }
  async close(): Promise<void> {
    await this.sync()
    this.chunks = []
  }
}

export const promises = {
  async stat(path: string) {
    return vfs().stat(path)
  },
  async lstat(path: string) {
    return vfs().stat(path)
  },
  async access(path: string) {
    return vfs().access(path)
  },
  async readFile(path: string, opts?: Encoding): Promise<string | Buffer> {
    return decoded(await vfs().readFile(path), opts)
  },
  async writeFile(path: string, data: string | Uint8Array): Promise<void> {
    return vfs().writeFile(path, data)
  },
  async mkdir(path: string, opts?: { recursive?: boolean }) {
    return vfs().mkdir(path, opts)
  },
  async readdir(path: string, opts?: { withFileTypes?: boolean }) {
    return opts?.withFileTypes ? vfs().readdirEntries(path) : vfs().readdir(path)
  },
  async rm(path: string, opts?: { force?: boolean; recursive?: boolean }) {
    return vfs().rm(path, opts)
  },
  async unlink(path: string) {
    return vfs().unlink(path)
  },
  async rename(from: string, to: string) {
    return vfs().rename(from, to)
  },
  async copyFile(from: string, to: string) {
    return vfs().copyFile(from, to)
  },
  async open(path: string, flags: string = 'r'): Promise<FileHandle> {
    if (flags === 'r') {
      // Opening a missing file fails at once, as the system's does.
      await vfs().stat(path)
      return new FileHandle(path, 'r')
    }
    if (flags === 'w') {
      await vfs().create(path)
      return new FileHandle(path, 'w')
    }
    throw new FsError('EINVAL', 'open', path)
  }
}

export function watch(): never {
  throw new Error('Obserwacja folderu nie działa na telefonie – zmiany przynosi synchronizacja z OneDrive.')
}

export function createWriteStream(): never {
  throw new Error('Zapis strumieniem nie działa na telefonie.')
}

export default { promises, watch, createWriteStream }
