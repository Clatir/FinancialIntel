// adapted from ICTTJ src/main/datastore/history.ts @ 84a8339
/**
 * Version history of records: before a record is overwritten or deleted, the version on disk is kept in
 * `.history/<kind>/<id>/<time>_<reason>_<rand>.json` (a dot folder: the folder scan, the watcher and the ZIP backups skip
 * it; cloud sync carries it, so every computer sees the same history). Edits are throttled (one snapshot per record
 * per 10 minutes of editing); a version written by another computer, a deletion, a restore and a merge are always kept.
 * The newest MAX_PER_RECORD snapshots of a record stay.
 */
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import type { HistoryEntry, HistoryReason } from '@shared/api'
import type { FileKind } from '@shared/paths'
import { removeFile, writeFileAtomic } from './atomic'
import { mapLimit } from './fsutil'

export const HISTORY_DIR = '.history'
/** Versions of the deleted records read at once (W19). */
const HISTORY_READS = 16
const EDIT_THROTTLE_MS = 10 * 60 * 1000
export const MAX_PER_RECORD = 40

interface SnapshotFile {
  savedAt: string
  savedBy: string
  reason: HistoryReason
  record: { id?: string; updatedAt?: string; updatedBy?: string | null } & Record<string, unknown>
}

const safeId = (id: string) => id.replace(/[^0-9A-Za-z_-]/g, '')
const fileStamp = (iso: string) => iso.replace(/[-:.]/g, '')

export class RecordHistory {
  private lastSnapshot = new Map<string, number>()

  constructor(
    private readonly root: string,
    private readonly machineName: string,
    private readonly now: () => string
  ) {}

  private dir(kind: FileKind, id: string): string {
    return join(this.root, HISTORY_DIR, kind, safeId(id))
  }

  /**
   * Keep `record` (the version about to be replaced or deleted). Never throws: a failed snapshot must not block
   * the save itself (it is reported through `onError`). Returns the file written (null = none: throttled or failed) –
   * `drop` takes it back (a delete the disk refused).
   */
  async snapshot(kind: FileKind, record: SnapshotFile['record'], reason: HistoryReason, onError?: (e: unknown) => void): Promise<string | null> {
    try {
      const id = String(record.id ?? 'fi')
      const key = `${kind}/${id}`
      const nowIso = this.now()
      const nowMs = Date.parse(nowIso)
      const fromOther = record.updatedBy != null && record.updatedBy !== this.machineName
      if (reason === 'edit' && !fromOther) {
        const last = this.lastSnapshot.get(key)
        if (last != null && nowMs - last < EDIT_THROTTLE_MS) return null
      }
      this.lastSnapshot.set(key, nowMs)
      const dir = this.dir(kind, id)
      const name = `${fileStamp(nowIso)}_${reason}_${randomBytes(2).toString('hex')}.json`
      const body: SnapshotFile = { savedAt: nowIso, savedBy: this.machineName, reason, record }
      const file = join(dir, name)
      await writeFileAtomic(file, `${JSON.stringify(body, null, 2)}\n`)
      await this.prune(dir)
      return file
    } catch (e) {
      onError?.(e)
      return null
    }
  }

  /** A version kept for an action that did not happen (a delete the disk refused, B9). */
  async drop(file: string | null): Promise<void> {
    if (file) await fs.rm(file, { force: true }).catch(() => undefined)
  }

  private async files(dir: string): Promise<string[]> {
    try {
      return (await fs.readdir(dir)).filter((n) => n.endsWith('.json') && !n.startsWith('.')).sort()
    } catch {
      return []
    }
  }

  private async prune(dir: string): Promise<void> {
    const names = await this.files(dir)
    for (const name of names.slice(0, Math.max(0, names.length - MAX_PER_RECORD))) await removeFile(join(dir, name))
  }

  private async readFile(dir: string, name: string): Promise<SnapshotFile | null> {
    try {
      const parsed = JSON.parse(await fs.readFile(join(dir, name), 'utf8')) as SnapshotFile
      return parsed && typeof parsed === 'object' && parsed.record && typeof parsed.record === 'object' ? parsed : null
    } catch {
      return null
    }
  }

  private entryOf(name: string, s: SnapshotFile): HistoryEntry {
    return {
      file: name,
      savedAt: s.savedAt,
      savedBy: s.savedBy ?? null,
      reason: s.reason,
      updatedAt: typeof s.record.updatedAt === 'string' ? s.record.updatedAt : null,
      updatedBy: typeof s.record.updatedBy === 'string' ? s.record.updatedBy : null
    }
  }

  /** Versions of a record, newest first (unreadable files are skipped). */
  async list(kind: FileKind, id: string): Promise<HistoryEntry[]> {
    const dir = this.dir(kind, id)
    const out: HistoryEntry[] = []
    for (const name of (await this.files(dir)).reverse()) {
      const s = await this.readFile(dir, name)
      if (s) out.push(this.entryOf(name, s))
    }
    return out
  }

  /** The stored record of one version; null when the file is gone or unreadable. */
  async read(kind: FileKind, id: string, file: string): Promise<SnapshotFile['record'] | null> {
    if (!/^[0-9A-Za-z_.-]+\.json$/.test(file)) return null
    return (await this.readFile(this.dir(kind, id), file))?.record ?? null
  }

  /**
   * Records of `kind` whose latest version is a deletion and that do not exist any more, newest first – also those taken
   * back with their import (reason 'undo', F4: their versions can be brought back; the import's own rows are not
   * blocked by them – T39).
   */
  async deleted(kind: FileKind, existing: { has(id: string): boolean }): Promise<Array<HistoryEntry & { id: string; record: SnapshotFile['record'] }>> {
    const base = join(this.root, HISTORY_DIR, kind)
    let ids: string[]
    try {
      ids = await fs.readdir(base)
    } catch {
      return []
    }
    // Several at once (W19): a file of the history on the second computer may come from the cloud first.
    const found = await mapLimit(
      ids.filter((id) => !existing.has(id)),
      HISTORY_READS,
      async (id) => {
        const dir = join(base, id)
        const last = (await this.files(dir)).at(-1)
        if (!last || !(last.includes('_delete_') || last.includes('_undo_'))) return null
        const s = await this.readFile(dir, last)
        return s ? { ...this.entryOf(last, s), id, record: s.record } : null
      }
    )
    return found.filter((x) => x != null).sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
  }
}
