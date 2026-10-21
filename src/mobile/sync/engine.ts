/**
 * The phone's sync with the data folder on OneDrive (T306, IP0.1, IP0.5): the changes of OneDrive come in (Graph's
 * delta), the changes made here go up (each with the version it replaces). The same file changed on a computer and
 * here before either saw the other's: OneDrive keeps the computer's version, the phone's goes beside it as a copy
 * (`…-telefon-<czas>.json`) – Synchronizacja on the computer shows both (nothing is lost, the choice is made there).
 */
import { isIgnoredPath, kindOfDir } from '@shared/paths'
import type { Vfs, RemoteMeta, StoredEntry } from '../vfs/vfs'
import { GraphError, type DriveItem, type GraphClient } from './graph'
import type { FolderNode, SyncPersistence } from './state'

/** Where the data folder lives in the phone's mirror. */
export const MIRROR = '/fi'

export const absOf = (rel: string): string => `${MIRROR}/${rel}`
export const relOf = (abs: string): string | null => (abs.startsWith(`${MIRROR}/`) ? abs.slice(MIRROR.length + 1) : null)

/**
 * The files the phone keeps a copy of: the data folder's records and settings and the computers' presence – not the
 * history of versions (each computer keeps its own reading of it), not the backups, no temp files.
 */
export function mirrored(rel: string): boolean {
  if (!rel.toLowerCase().endsWith('.json') || rel.includes('.tmp-')) return false
  const parts = rel.split('/')
  const top = parts[0]!
  if (top === 'backups' || top === '.history') return false
  if (top.startsWith('.') && top !== '.presence') return false
  return parts.slice(1).every((p) => !p.startsWith('.'))
}

/** A record or the settings (a conflict there is kept as a copy); presence and history are the phone's own. */
const isDataFile = (rel: string): boolean => !isIgnoredPath(rel) && kindOfDir(rel) != null

const stampOf = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((x, i) => x === b[i])

const metaOf = (item: DriveItem): RemoteMeta => ({ id: item.id, eTag: item.eTag ?? '', cTag: item.cTag ?? null })

/** The same content as known (cTag – a rename changes only the eTag). */
const sameVersion = (meta: RemoteMeta, item: DriveItem): boolean => (item.cTag && meta.cTag ? item.cTag === meta.cTag : item.eTag === meta.eTag)

export class RootGoneError extends Error {
  constructor() {
    super('Folderu danych nie ma już na OneDrive (usunięty albo przeniesiony do Kosza). Wybierz folder ponownie w ustawieniach telefonu.')
    this.name = 'RootGoneError'
  }
}

export interface PullResult {
  /** Paths written or removed here (relative to the data folder). */
  changed: string[]
  /** Copies made of this phone's changes that met the computer's. */
  copies: string[]
}

export interface PushResult {
  sent: number
  copies: string[]
}

export interface EngineDeps {
  vfs: Vfs
  graph: GraphClient
  state: SyncPersistence
  /** The data folder's OneDrive item. */
  rootId: string
  /**
   * Files written by the sync in the data store's turn (`DataStore.applyExternal` while a folder is open): `write`
   * changes the mirror, then the store reads those paths as a change from outside.
   */
  apply?: (relPaths: string[], write: () => Promise<void>) => Promise<void>
  now?: () => Date
  /** Downloads at once. */
  parallel?: number
}

const BATCH = 50

export class SyncEngine {
  private readonly folders = new Map<string, FolderNode>()
  /** File item id → its path (from the mirror's marks and the pulls). */
  private readonly byId = new Map<string, string>()
  private paths = new Map<string, string | null>()
  private readonly now: () => Date
  private readonly parallel: number

  constructor(private readonly d: EngineDeps) {
    this.now = d.now ?? (() => new Date())
    this.parallel = d.parallel ?? 8
  }

  async init(): Promise<void> {
    this.folders.clear()
    for (const f of await this.d.state.loadFolders()) this.folders.set(f.id, f)
    this.byId.clear()
    for (const e of this.d.vfs.entriesUnder(MIRROR)) {
      const rel = relOf(e.path)
      if (rel && e.meta) this.byId.set(e.meta.id, rel)
    }
    this.paths.clear()
  }

  /** Local changes still to go up. */
  pending(): number {
    return this.d.vfs.dirtyEntries().filter((e) => relOf(e.path) != null).length
  }

  private write(rels: string[], fn: () => Promise<void>): Promise<void> {
    return this.d.apply ? this.d.apply(rels, fn) : fn()
  }

  private folderPath(id: string | undefined): string | null {
    if (!id) return null
    if (id === this.d.rootId) return ''
    const known = this.paths.get(id)
    if (known !== undefined) return known
    const f = this.folders.get(id)
    let out: string | null = null
    if (f && f.parentId) {
      const parent = this.folderPath(f.parentId)
      out = parent == null ? null : parent ? `${parent}/${f.name}` : f.name
    }
    this.paths.set(id, out)
    return out
  }

  private filePath(item: DriveItem): string | null {
    const dir = this.folderPath(item.parentReference?.id)
    if (dir == null || !item.name) return null
    return dir ? `${dir}/${item.name}` : item.name
  }

  /** A copy of this phone's version beside the computer's: a name no file has. */
  private copyPath(rel: string): string {
    const stem = rel.replace(/\.json$/i, '')
    let name = `${stem}-telefon-${stampOf(this.now())}.json`
    for (let n = 2; this.d.vfs.get(absOf(name)); n++) name = `${stem}-telefon-${stampOf(this.now())}-${n}.json`
    return name
  }

  /**
   * OneDrive's version of a file taken here. A change made here and not sent yet: the same content – only the mark goes;
   * another one – this phone's version is kept as a copy (a record or the settings) and OneDrive's becomes the file.
   */
  private async takeRemote(rel: string, bytes: Uint8Array, meta: RemoteMeta, copies: string[]): Promise<void> {
    const abs = absOf(rel)
    const e = this.d.vfs.get(abs)
    if (e && e.dirty > 0) {
      if (e.data && sameBytes(e.data, bytes)) {
        await this.d.vfs.markSynced(abs, e.dirty, meta)
        this.byId.set(meta.id, rel)
        return
      }
      if (e.data && isDataFile(rel)) {
        const copy = this.copyPath(rel)
        await this.d.vfs.writeFile(absOf(copy), e.data)
        copies.push(copy)
      }
    }
    await this.d.vfs.applyRemote(abs, bytes, meta)
    this.byId.set(meta.id, rel)
  }

  /** A file gone from OneDrive: gone here too – unless changed here since (it goes up again as a new file). */
  private async dropRemote(rel: string): Promise<void> {
    const abs = absOf(rel)
    const e = this.d.vfs.get(abs)
    if (!e) return
    if (e.meta) this.byId.delete(e.meta.id)
    if (e.dirty > 0 && e.data) await this.d.vfs.setMeta(abs, null)
    else await this.d.vfs.applyRemote(abs, null, null)
  }

  /** The changes of OneDrive since the last pull (everything the first time), each file read as it is there now. */
  async pull(progress?: (done: number, total: number) => void): Promise<PullResult> {
    let link = (await this.d.state.get<string>('deltaLink')) ?? null
    let full = !link
    const items: DriveItem[] = []
    let deltaLink: string | null = null
    for (;;) {
      let page
      try {
        page = await this.d.graph.delta(this.d.rootId, link)
      } catch (e) {
        // The link too old (410 resyncRequired): the whole folder listed again and compared.
        if (e instanceof GraphError && e.status === 410 && link) {
          link = null
          full = true
          items.length = 0
          continue
        }
        throw e
      }
      items.push(...page.value)
      if (page['@odata.nextLink']) {
        link = page['@odata.nextLink']
        continue
      }
      deltaLink = page['@odata.deltaLink'] ?? null
      break
    }

    // The folders first (a file's path comes from them), the paths of the ones renamed or moved before and after.
    const before = new Map<string, string | null>()
    const folderPuts: FolderNode[] = []
    const folderDeletes: string[] = []
    const deletedFolders: string[] = []
    for (const it of items) {
      if (it.id === this.d.rootId) {
        if (it.deleted) throw new RootGoneError()
        continue
      }
      const known = this.folders.get(it.id)
      if (it.deleted) {
        if (known) {
          before.set(it.id, this.folderPath(it.id))
          deletedFolders.push(it.id)
        }
        continue
      }
      if (!it.folder) continue
      const node: FolderNode = { id: it.id, name: it.name ?? '', parentId: it.parentReference?.id ?? null }
      if (known && known.name === node.name && known.parentId === node.parentId) continue
      if (known) before.set(it.id, this.folderPath(it.id))
      this.folders.set(it.id, node)
      folderPuts.push(node)
    }
    // A folder removed: its whole subtree (its files are removed below).
    const removedPrefixes: string[] = []
    for (const id of deletedFolders) {
      const path = before.get(id)
      if (path) removedPrefixes.push(path)
      for (const [fid, f] of this.folders) {
        if (fid === id) continue
        let p: string | null = f.parentId
        while (p && p !== id) p = this.folders.get(p)?.parentId ?? null
        if (p === id) folderDeletes.push(fid)
      }
      folderDeletes.push(id)
    }
    for (const id of folderDeletes) this.folders.delete(id)
    this.paths = new Map()

    const moves: Array<[string, string]> = []
    for (const [id, old] of before) {
      if (!old || deletedFolders.includes(id)) continue
      const now = this.folderPath(id)
      if (now == null || now === old) continue
      for (const rel of this.byId.values()) if (rel.startsWith(`${old}/`)) moves.push([rel, `${now}${rel.slice(old.length)}`])
    }

    const removals = new Set<string>()
    for (const prefix of removedPrefixes) for (const rel of this.byId.values()) if (rel.startsWith(`${prefix}/`)) removals.add(rel)
    const downloads: Array<{ item: DriveItem; rel: string }> = []
    const metaOnly: Array<{ rel: string; meta: RemoteMeta }> = []
    const seen = new Set<string>()
    const goneFolders = new Set(folderDeletes)
    for (const it of items) {
      if (it.id === this.d.rootId || it.folder || goneFolders.has(it.id)) continue
      if (it.deleted) {
        const rel = this.byId.get(it.id)
        if (rel) removals.add(rel)
        continue
      }
      if (!it.file) continue
      const rel = this.filePath(it)
      if (rel == null) continue
      seen.add(it.id)
      const prev = this.byId.get(it.id)
      if (prev && prev !== rel) moves.push([prev, rel])
      if (!mirrored(rel)) continue
      const e = this.d.vfs.get(absOf(rel))
      if (e?.meta && e.meta.id === it.id && sameVersion(e.meta, it)) {
        if (e.meta.eTag !== it.eTag) metaOnly.push({ rel, meta: metaOf(it) })
        continue
      }
      downloads.push({ item: it, rel })
    }
    // Listed whole: what the phone has from OneDrive and the list lacks is gone there.
    if (full)
      for (const e of this.d.vfs.entriesUnder(MIRROR)) {
        const rel = relOf(e.path)
        if (rel && e.meta && mirrored(rel) && !seen.has(e.meta.id)) removals.add(rel)
      }

    const changed: string[] = []
    const copies: string[] = []
    const moved = moves.filter(([a, b]) => a !== b)
    if (moved.length || metaOnly.length)
      await this.write(
        moved.flatMap(([a, b]) => [a, b]),
        async () => {
          for (const [a, b] of moved) {
            const meta = this.d.vfs.get(absOf(a))?.meta
            await this.d.vfs.moveEntry(absOf(a), absOf(b))
            if (meta) this.byId.set(meta.id, b)
            changed.push(a, b)
          }
          for (const m of metaOnly) await this.d.vfs.setMeta(absOf(m.rel), m.meta)
        }
      )
    const dropped = [...removals].filter((rel) => mirrored(rel) || this.d.vfs.get(absOf(rel)))
    for (let i = 0; i < dropped.length; i += BATCH) {
      const batch = dropped.slice(i, i + BATCH)
      await this.write(batch, async () => {
        for (const rel of batch) await this.dropRemote(rel)
      })
      changed.push(...batch)
    }

    let done = 0
    progress?.(0, downloads.length)
    for (let i = 0; i < downloads.length; i += BATCH) {
      const batch = downloads.slice(i, i + BATCH)
      const got = new Array<Uint8Array | null>(batch.length).fill(null)
      let next = 0
      const worker = async () => {
        while (next < batch.length) {
          const k = next++
          try {
            got[k] = await this.d.graph.download(batch[k]!.item)
          } catch (e) {
            // Gone meanwhile: the next pull reports its removal.
            if (e instanceof GraphError && (e.status === 404 || e.status === 410)) got[k] = null
            else throw e
          }
          progress?.(++done, downloads.length)
        }
      }
      await Promise.all(Array.from({ length: Math.min(this.parallel, batch.length) }, worker))
      const rels = batch.map((b) => b.rel)
      const before = copies.length
      await this.write(rels, async () => {
        for (let k = 0; k < batch.length; k++) {
          const bytes = got[k]
          if (bytes) await this.takeRemote(batch[k]!.rel, bytes, metaOf(batch[k]!.item), copies)
        }
      })
      // The copies made in this batch are read by the store too.
      if (copies.length > before && this.d.apply) await this.write(copies.slice(before), async () => undefined)
      changed.push(...rels)
    }

    await this.d.state.saveFolders(folderPuts.filter((f) => this.folders.has(f.id)), folderDeletes)
    await this.d.vfs.flushed()
    if (deltaLink) await this.d.state.set('deltaLink', deltaLink)
    await this.d.state.set('lastPull', this.now().toISOString())
    return { changed, copies }
  }

  /** The changes made here sent to OneDrive, the oldest first. */
  async push(): Promise<PushResult> {
    let sent = 0
    const copies: string[] = []
    for (const listed of this.d.vfs.dirtyEntries()) {
      const rel = relOf(listed.path)
      if (rel == null) continue
      const e = this.d.vfs.get(listed.path)
      if (!e || e.dirty === 0) continue
      if (e.data == null) await this.pushRemoval(rel, e)
      else await this.pushFile(rel, e, copies)
      sent++
    }
    await this.d.vfs.flushed()
    if (sent) await this.d.state.set('lastPush', this.now().toISOString())
    return { sent, copies }
  }

  private async pushFile(rel: string, e: StoredEntry, copies: string[]): Promise<void> {
    const abs = absOf(rel)
    // Presence: this phone's own file – written over whatever is there.
    const own = !isDataFile(rel)
    let res = await this.d.graph.upload(this.d.rootId, rel, e.data!, { ifMatch: own ? null : (e.meta?.eTag ?? null), newOnly: !own && !e.meta })
    if (!res.ok && res.status === 404) {
      // A folder of the path missing there (a new year of operations): made, then the upload again.
      const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
      if (dir) await this.d.graph.ensureFolders(this.d.rootId, dir)
      res = await this.d.graph.upload(this.d.rootId, rel, e.data!, { ifMatch: own ? null : (e.meta?.eTag ?? null), newOnly: !own && !e.meta })
    }
    if (res.ok) {
      const meta = metaOf(res.item)
      this.byId.set(meta.id, rel)
      if (!this.d.vfs.get(abs)) {
        // Removed here while it went up (never there before): removed there too.
        await this.d.graph.remove(meta.id, meta.eTag)
        this.byId.delete(meta.id)
        return
      }
      await this.d.vfs.markSynced(abs, e.dirty, meta)
      return
    }
    if (res.status === 404) throw new GraphError(404, 'itemNotFound', `Nie udało się wysłać ${rel} – brak folderu na OneDrive.`)
    await this.resolveConflict(rel, copies)
  }

  /** The upload refused – the file changed (or appeared) there since: OneDrive's version here, this phone's as a copy. */
  private async resolveConflict(rel: string, copies: string[]): Promise<void> {
    const abs = absOf(rel)
    const remote = await this.d.graph.itemUnder(this.d.rootId, rel)
    if (!remote) {
      // Gone there meanwhile: this phone's version goes up as a new file next time.
      await this.d.vfs.setMeta(abs, null)
      return
    }
    const bytes = await this.d.graph.download(remote)
    const before = copies.length
    await this.write([rel], () => this.takeRemote(rel, bytes, metaOf(remote), copies))
    if (copies.length > before && this.d.apply) await this.write(copies.slice(before), async () => undefined)
  }

  private async pushRemoval(rel: string, e: StoredEntry): Promise<void> {
    const abs = absOf(rel)
    if (!e.meta) {
      await this.d.vfs.markSynced(abs, e.dirty, null)
      return
    }
    const r = await this.d.graph.remove(e.meta.id, e.meta.eTag || null)
    if (r === 'ok' || r === 'gone') {
      this.byId.delete(e.meta.id)
      await this.d.vfs.markSynced(abs, e.dirty, null)
      return
    }
    // Changed there since it was read here: that version comes back (nothing a computer wrote is removed unseen).
    const remote = await this.d.graph.itemUnder(this.d.rootId, rel)
    if (!remote) {
      await this.d.vfs.markSynced(abs, e.dirty, null)
      return
    }
    const bytes = await this.d.graph.download(remote)
    await this.write([rel], async () => {
      await this.d.vfs.applyRemote(abs, bytes, metaOf(remote))
      this.byId.set(remote.id, rel)
    })
  }
}
