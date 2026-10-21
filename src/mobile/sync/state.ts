/**
 * What the phone's sync keeps between runs (T306): the folders of the data folder on OneDrive (a change's path comes
 * from its parents – Graph's delta gives ids, not paths), the delta link of the last pull and small values.
 */

export interface FolderNode {
  id: string
  name: string
  /** null = the data folder itself. */
  parentId: string | null
}

export interface SyncPersistence {
  loadFolders(): Promise<FolderNode[]>
  saveFolders(puts: readonly FolderNode[], deletes: readonly string[]): Promise<void>
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  clear(): Promise<void>
}

export class MemorySyncPersistence implements SyncPersistence {
  readonly folders = new Map<string, FolderNode>()
  readonly kv = new Map<string, unknown>()
  async loadFolders(): Promise<FolderNode[]> {
    return [...this.folders.values()].map((f) => ({ ...f }))
  }
  async saveFolders(puts: readonly FolderNode[], deletes: readonly string[]): Promise<void> {
    for (const f of puts) this.folders.set(f.id, { ...f })
    for (const id of deletes) this.folders.delete(id)
  }
  async get<T>(key: string): Promise<T | undefined> {
    return structuredClone(this.kv.get(key)) as T | undefined
  }
  async set(key: string, value: unknown): Promise<void> {
    if (value === undefined) this.kv.delete(key)
    else this.kv.set(key, structuredClone(value))
  }
  async clear(): Promise<void> {
    this.folders.clear()
    this.kv.clear()
  }
}
