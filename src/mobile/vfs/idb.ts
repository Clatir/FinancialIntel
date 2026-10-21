/**
 * The phone's IndexedDB (T305, T306): the mirror's files with their marks for the upload, the OneDrive folders and the
 * sync's small values – one database, each write one transaction (a file and its mark never apart).
 */
import type { FolderNode, SyncPersistence } from '../sync/state'
import type { StoredEntry, VfsPersistence } from './vfs'

const DB = 'fi-phone'
const VERSION = 1

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error ?? new Error('IndexedDB'))
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB: zapis przerwany (brak miejsca?)'))
  })
}

export async function openPhoneDb(name = DB): Promise<IDBDatabase> {
  const open = indexedDB.open(name, VERSION)
  open.onupgradeneeded = () => {
    const db = open.result
    if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'path' })
    if (!db.objectStoreNames.contains('folders')) db.createObjectStore('folders', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
  }
  return request(open)
}

export class IdbVfsPersistence implements VfsPersistence {
  constructor(private readonly db: IDBDatabase) {}
  async load(): Promise<StoredEntry[]> {
    const tx = this.db.transaction('entries', 'readonly')
    return request(tx.objectStore('entries').getAll() as IDBRequest<StoredEntry[]>)
  }
  async write(puts: readonly StoredEntry[], deletes: readonly string[]): Promise<void> {
    const tx = this.db.transaction('entries', 'readwrite')
    const store = tx.objectStore('entries')
    for (const e of puts) store.put(e)
    for (const p of deletes) store.delete(p)
    await done(tx)
  }
  async clear(): Promise<void> {
    const tx = this.db.transaction('entries', 'readwrite')
    tx.objectStore('entries').clear()
    await done(tx)
  }
}

export class IdbSyncPersistence implements SyncPersistence {
  constructor(private readonly db: IDBDatabase) {}
  async loadFolders(): Promise<FolderNode[]> {
    const tx = this.db.transaction('folders', 'readonly')
    return request(tx.objectStore('folders').getAll() as IDBRequest<FolderNode[]>)
  }
  async saveFolders(puts: readonly FolderNode[], deletes: readonly string[]): Promise<void> {
    if (!puts.length && !deletes.length) return
    const tx = this.db.transaction('folders', 'readwrite')
    const store = tx.objectStore('folders')
    for (const f of puts) store.put(f)
    for (const id of deletes) store.delete(id)
    await done(tx)
  }
  async get<T>(key: string): Promise<T | undefined> {
    const tx = this.db.transaction('kv', 'readonly')
    return (await request(tx.objectStore('kv').get(key))) as T | undefined
  }
  async set(key: string, value: unknown): Promise<void> {
    const tx = this.db.transaction('kv', 'readwrite')
    if (value === undefined) tx.objectStore('kv').delete(key)
    else tx.objectStore('kv').put(value, key)
    await done(tx)
  }
  async clear(): Promise<void> {
    const tx = this.db.transaction(['folders', 'kv'], 'readwrite')
    tx.objectStore('folders').clear()
    tx.objectStore('kv').clear()
    await done(tx)
  }
}
