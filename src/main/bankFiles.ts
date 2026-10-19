/**
 * New files from mBank in the downloads (1.9.0, F14): the folder Pobrane and the last folder a file of the import was
 * chosen from, watched while the app runs (`fs.watch`, a scan every minute besides). Each CSV of mBank there – its header
 * read by the import's own parser –, changed within the last days, goes to the window with the period it covers; the
 * window announces it once and opens it in Import with one click. A file is read only when it is a CSV within the
 * import's limit; nothing leaves the computer. The window may read or move to the Recycle Bin only a file it was told
 * of (its id).
 */
import { createHash } from 'node:crypto'
import { promises as fs, watch, type FSWatcher } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { IMPORT_MAX_BYTES, decodeText } from '@shared/import/text'
import { parseMbank } from '@shared/import/mbank'
import type { BankFile } from '@shared/api'

/** A file changed within these days is looked at – an older one was there before (and imported or not, long ago). */
export const BANK_FILE_DAYS = 14
const SCAN_DEBOUNCE_MS = 1500
/** The start of a file read first: mBank's header row is within its first lines. */
const HEAD_BYTES = 16 * 1024

/**
 * The start of a CSV of mBank: its header row (`#Data operacji` / `#Data księgowania` … `#Kwota`) – any other CSV (a
 * data export of many MB) is never read whole. The header's words are ASCII: UTF-8 and Windows-1250 read them alike.
 */
export function looksLikeMbank(head: Uint8Array): boolean {
  const utf16 = (head[0] === 0xff && head[1] === 0xfe) || (head.length >= 4 && head[1] === 0 && head[3] === 0 && head[0] !== 0)
  const text = new TextDecoder(utf16 ? 'utf-16le' : 'utf-8').decode(head)
  return /#data (operacji|ksi)/i.test(text) && /#kwota/i.test(text)
}

async function readHead(path: string): Promise<Uint8Array> {
  const file = await fs.open(path, 'r')
  try {
    const buf = new Uint8Array(HEAD_BYTES)
    const { bytesRead } = await file.read(buf, 0, HEAD_BYTES, 0)
    return buf.subarray(0, bytesRead)
  } finally {
    await file.close()
  }
}

interface Seen {
  /** Its modification time and size: a file written again is read again. */
  stamp: string
  file: BankFile | null
}

export interface BankFilesOptions {
  onChange: (files: BankFile[]) => void
  log: (line: string) => void
  /** A scan of every folder this often besides the watching (a folder on a network share is never watched well). */
  pollMs?: number
}

const idOf = (path: string) => createHash('sha1').update(path).digest('hex').slice(0, 16)

export class BankFiles {
  private dirs: Array<{ dir: string; label: string }> = []
  private watchers = new Map<string, FSWatcher>()
  private seen = new Map<string, Seen>()
  /** Every path the window may ask for, by its id: the files found, and the files chosen in the import's dialog. */
  private paths = new Map<string, string>()
  private list: BankFile[] = []
  private poll: NodeJS.Timeout | null = null
  private debounce: NodeJS.Timeout | null = null
  private scanning: Promise<void> | null = null
  private again = false

  constructor(private readonly o: BankFilesOptions) {}

  /** The folders to watch, each with its name for the window ('Pobrane'); empty – watching off. */
  setDirs(dirs: ReadonlyArray<{ dir: string; label: string }>): void {
    const unique = dirs.filter((d, i) => d.dir && dirs.findIndex((x) => x.dir === d.dir) === i)
    if (unique.map((d) => d.dir).join('\u0000') === this.dirs.map((d) => d.dir).join('\u0000')) return
    this.stopWatching()
    this.dirs = unique
    if (!unique.length) {
      this.setList([])
      return
    }
    for (const { dir } of unique) {
      try {
        const w = watch(dir, { persistent: false }, () => this.soon())
        w.on('error', () => undefined)
        this.watchers.set(dir, w)
      } catch {
        // A folder missing or not watchable: the scans see it when it is there.
      }
    }
    this.poll = setInterval(() => void this.scan(), this.o.pollMs ?? 60_000)
    this.poll.unref?.()
    void this.scan()
  }

  stop(): void {
    this.stopWatching()
    this.dirs = []
  }

  get files(): BankFile[] {
    return this.list
  }

  /** A file chosen in the import's dialog: its id, so the window may offer moving it to the Recycle Bin after the import. */
  register(path: string): string {
    const id = idOf(path)
    this.paths.set(id, path)
    return id
  }

  /** The bytes of a file the window was told of (null – unknown id, gone or over the limit). */
  async read(id: string): Promise<{ name: string; bytes: Uint8Array } | null> {
    const path = this.paths.get(id)
    if (!path) return null
    const st = await fs.stat(path).catch(() => null)
    if (!st?.isFile() || st.size > IMPORT_MAX_BYTES) return null
    return { name: basename(path), bytes: new Uint8Array(await fs.readFile(path)) }
  }

  /** The path of a file the window was told of and still there – for the Recycle Bin (null – unknown id, or gone). */
  async pathOf(id: string): Promise<string | null> {
    const path = this.paths.get(id)
    if (!path) return null
    const st = await fs.stat(path).catch(() => null)
    return st?.isFile() ? path : null
  }

  /** After a file was moved away: looked at again at once. */
  refresh(): void {
    void this.scan()
  }

  private stopWatching(): void {
    for (const w of this.watchers.values()) w.close()
    this.watchers.clear()
    if (this.poll) clearInterval(this.poll)
    if (this.debounce) clearTimeout(this.debounce)
    this.poll = null
    this.debounce = null
  }

  private soon(): void {
    if (this.debounce) clearTimeout(this.debounce)
    this.debounce = setTimeout(() => {
      this.debounce = null
      void this.scan()
    }, SCAN_DEBOUNCE_MS)
  }

  /** One scan at a time; a change meanwhile scans once more after it. */
  private scan(): Promise<void> {
    if (this.scanning) {
      this.again = true
      return this.scanning
    }
    this.scanning = this.scanAll()
      .catch((e) => this.o.log(`bank files: scan failed – ${e instanceof Error ? e.message : String(e)}`))
      .finally(() => {
        this.scanning = null
        if (this.again) {
          this.again = false
          void this.scan()
        }
      })
    return this.scanning
  }

  private async scanAll(): Promise<void> {
    const since = Date.now() - BANK_FILE_DAYS * 86_400_000
    const found: BankFile[] = []
    const present = new Set<string>()
    for (const { dir, label } of this.dirs) {
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
      for (const e of entries) {
        if (!e.isFile() || extname(e.name).toLowerCase() !== '.csv') continue
        const path = join(dir, e.name)
        const st = await fs.stat(path).catch(() => null)
        if (!st || st.mtimeMs < since || st.size > IMPORT_MAX_BYTES || st.size === 0) continue
        present.add(path)
        const stamp = `${st.mtimeMs}:${st.size}`
        let seen = this.seen.get(path)
        if (!seen || seen.stamp !== stamp) {
          seen = { stamp, file: await this.parse(path, label, st.mtimeMs, st.size) }
          this.seen.set(path, seen)
        }
        if (seen.file) {
          this.paths.set(seen.file.id, path)
          found.push(seen.file)
        }
      }
    }
    for (const path of [...this.seen.keys()]) if (!present.has(path)) this.seen.delete(path)
    this.setList(found.sort((a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name)))
  }

  /** A CSV of mBank (its header – „Lista operacji”, „Historia rachunku”), else null: read whole only when its start is mBank's. */
  private async parse(path: string, label: string, mtime: number, size: number): Promise<BankFile | null> {
    try {
      if (!looksLikeMbank(await readHead(path))) return null
      const file = parseMbank(decodeText(new Uint8Array(await fs.readFile(path))))
      return { id: idOf(path), name: basename(path), where: label, mtime, size, format: file.format, period: file.period, account: file.account, rows: file.rows.length }
    } catch {
      return null
    }
  }

  private setList(list: BankFile[]): void {
    const key = (xs: readonly BankFile[]) => xs.map((f) => `${f.id}:${f.mtime}:${f.size}`).join('|')
    if (key(list) === key(this.list)) return
    this.list = list
    this.o.onChange(list)
  }
}
