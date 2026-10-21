/**
 * The phone's start and connection (T305): the mirror loaded from IndexedDB, the account signed in, the OneDrive folder
 * chosen and copied the first time, then the sync running while the app is in front. The screens follow `usePhone`.
 */
import { create } from 'zustand'
import { useVfs } from './node/fs'
import { MemoryPersistence, Vfs } from './vfs/vfs'
import { IdbSyncPersistence, IdbVfsPersistence, openPhoneDb } from './vfs/idb'
import { MemorySyncPersistence, type SyncPersistence } from './sync/state'
import { GraphClient, GraphError, AuthError } from './sync/graph'
import { NetworkError } from './sync/http'
import { MIRROR, SyncEngine } from './sync/engine'
import { SyncScheduler, type SyncStatus } from './sync/scheduler'
import { SignInError, TokenSource, authorizeUrl, codeFromRedirect, exchangeCode, pkce, randomString, type AuthStore, type SavedAuth } from './sync/auth'
import type { PhoneHost } from './host/host'
import type { Platform } from './platform'

export type PhonePhase = 'starting' | 'signin' | 'folder' | 'first-sync' | 'ready'

export interface PhoneFolder {
  /** The path from OneDrive's root ('FinancialIntel'). */
  path: string
  id: string
}

export interface PhoneState {
  phase: PhonePhase
  account: string | null
  clientId: string
  folder: PhoneFolder | null
  sync: SyncStatus
  /** The last problem of the connecting screens. */
  message: string | null
  busy: boolean
}

const AUTH_KEY = 'fi.phone.auth'
const FOLDER_KEY = 'fi.phone.folder'
/** The data folder proposed (D62: `OneDrive\FinancialIntel`). */
export const DEFAULT_FOLDER = 'FinancialIntel'

const IDLE: SyncStatus = { state: 'idle', pending: 0, lastSync: null, message: null, progress: null, copies: [] }

export const usePhone = create<PhoneState>(() => ({ phase: 'starting', account: null, clientId: '', folder: null, sync: IDLE, message: null, busy: false }))

interface Ctx {
  host: PhoneHost
  platform: Platform
  vfs: Vfs
  state: SyncPersistence
  tokens: TokenSource
  graph: GraphClient
  engine: SyncEngine | null
  scheduler: SyncScheduler | null
}

let ctx: Ctx | null = null

function need(): Ctx {
  if (!ctx) throw new Error('Telefon jeszcze się uruchamia.')
  return ctx
}

const set = (patch: Partial<PhoneState>) => usePhone.setState(patch)

function authStore(platform: Platform): AuthStore {
  return {
    get: async () => {
      const raw = await platform.kv.get(AUTH_KEY)
      try {
        return raw ? (JSON.parse(raw) as SavedAuth) : null
      } catch {
        return null
      }
    },
    set: async (a) => {
      if (a) await platform.kv.set(AUTH_KEY, JSON.stringify(a))
      else await platform.kv.remove(AUTH_KEY)
    }
  }
}

/** The mirror's own storage: IndexedDB, or memory when the browser refuses it (a private window). */
async function storage(): Promise<{ files: Vfs; state: SyncPersistence }> {
  const synced = (p: string) => p.startsWith(`${MIRROR}/`)
  try {
    const db = await openPhoneDb()
    return { files: new Vfs(new IdbVfsPersistence(db), { synced }), state: new IdbSyncPersistence(db) }
  } catch (e) {
    console.warn('IndexedDB niedostępne – lustro tylko w pamięci', e)
    return { files: new Vfs(new MemoryPersistence(), { synced }), state: new MemorySyncPersistence() }
  }
}

/** The start: the mirror, the account and the folder as they were; the sync once the folder is there. */
export async function startPhone(host: PhoneHost, platform: Platform): Promise<void> {
  const { files, state } = await storage()
  await files.load()
  useVfs(files)
  await host.load()
  const auths = authStore(platform)
  const tokens = new TokenSource(platform.tokenHttp, `${platform.authority}/token`, auths)
  const graph = new GraphClient({ http: platform.graphHttp, token: () => tokens.token(), renew: () => tokens.renew(), base: platform.graphBase })
  ctx = { host, platform, vfs: files, state, tokens, graph, engine: null, scheduler: null }
  // A change made here goes up after a moment (the scheduler of the folder open now).
  files.onLocalChange(() => ctx?.scheduler?.kick())
  const saved = await auths.get()
  const folder = await readFolder(platform)
  set({ account: saved?.account ?? null, clientId: saved?.clientId ?? platform.builtInClientId, folder })
  platform.onForeground((front) => {
    host.setForeground(front)
    const s = need().scheduler
    if (!s) return
    if (front) s.start()
    else {
      // Going to the background: the window's unsaved changes saved and sent while iOS still lets the app run.
      void host.flush().then(() => s.syncNow()).finally(() => s.stop())
    }
  })
  if (!saved) return set({ phase: 'signin' })
  if (!folder) return set({ phase: 'folder' })
  // A folder copied before: the app works from the mirror at once (also offline), the sync catches up.
  if (await host.hasFolder()) {
    startSync(folder)
    return set({ phase: 'ready' })
  }
  await firstSync(folder)
}

async function readFolder(platform: Platform): Promise<PhoneFolder | null> {
  const raw = await platform.kv.get(FOLDER_KEY)
  try {
    return raw ? (JSON.parse(raw) as PhoneFolder) : null
  } catch {
    return null
  }
}

function startSync(folder: PhoneFolder): void {
  const c = need()
  c.scheduler?.stop()
  const engine = new SyncEngine({ vfs: c.vfs, graph: c.graph, state: c.state, rootId: folder.id, apply: c.host.applyExternal })
  c.engine = engine
  const scheduler = new SyncScheduler(engine, {
    onStatus: (sync) => set({ sync }),
    // The saves the window sent finish first: their files go up in this run.
    beforeRun: async () => void (await c.host.store?.idle())
  })
  c.scheduler = scheduler
  void engine.init().then(() => {
    set({ sync: { ...scheduler.status, pending: engine.pending() } })
    if (c.host.foreground) scheduler.start()
  })
}

function messageOf(e: unknown): string {
  if (e instanceof NetworkError) return 'Brak połączenia z internetem – połącz się i spróbuj ponownie.'
  if (e instanceof AuthError || e instanceof SignInError) return e.message
  if (e instanceof GraphError) return `OneDrive: ${e.message}`
  return e instanceof Error ? e.message : String(e)
}

/** Microsoft's sign-in with this app's registration (the client id from Entra). */
export async function signIn(clientId: string): Promise<boolean> {
  const c = need()
  const id = clientId.trim()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    set({ message: 'Identyfikator aplikacji (klienta) z Entra ma postać 8-4-4-4-12 znaków, np. 0a1b2c3d-…' })
    return false
  }
  set({ busy: true, message: null, clientId: id })
  try {
    const { verifier, challenge } = await pkce()
    const state = randomString(16)
    const back = await c.platform.signIn(authorizeUrl(id, challenge, state, c.platform.authority))
    const code = codeFromRedirect(back, state)
    const tokens = await exchangeCode(c.platform.tokenHttp, `${c.platform.authority}/token`, id, code, verifier)
    await c.tokens.adopt(id, tokens, null)
    let account: string | null = null
    try {
      const me = await c.graph.me()
      account = me.userPrincipalName ?? me.mail ?? me.displayName ?? null
    } catch {
      /* the name is only for the screen */
    }
    await c.tokens.adopt(id, tokens, account)
    set({ account })
    c.scheduler?.resume()
    const folder = usePhone.getState().folder
    set({ phase: folder && (await c.host.hasFolder()) ? 'ready' : 'folder', busy: false })
    return true
  } catch (e) {
    set({ busy: false, message: messageOf(e) })
    return false
  }
}

/** The OneDrive folder of the data: checked (fi.json there), copied, opened. */
export async function chooseFolder(path: string): Promise<boolean> {
  const c = need()
  const clean = path.trim().replace(/^\/+|\/+$/g, '')
  set({ busy: true, message: null })
  try {
    const item = await c.graph.itemByPath(clean)
    if (!item || !item.folder) {
      set({ busy: false, message: clean ? `Na OneDrive nie ma folderu „${clean}”. Sprawdź nazwę (wielkość liter bez znaczenia).` : 'Wpisz nazwę folderu z danymi.' })
      return false
    }
    const fi = await c.graph.itemUnder(item.id, 'fi.json')
    if (!fi) {
      set({ busy: false, message: `W folderze „${clean}” nie ma pliku fi.json – to nie są dane Financial Intel (albo OneDrive jeszcze ich nie wysłał z komputera).` })
      return false
    }
    const prev = usePhone.getState().folder
    if (prev && prev.id !== item.id) await forgetMirror()
    const folder = { path: clean, id: item.id }
    await c.platform.kv.set(FOLDER_KEY, JSON.stringify(folder))
    set({ folder, busy: false })
    return firstSync(folder)
  } catch (e) {
    set({ busy: false, message: messageOf(e) })
    return false
  }
}

/** The first copy of the folder with its progress; then the app opens it. */
async function firstSync(folder: PhoneFolder): Promise<boolean> {
  const c = need()
  set({ phase: 'first-sync', message: null, sync: { ...IDLE, state: 'syncing', progress: { done: 0, total: 0 } } })
  const engine = new SyncEngine({ vfs: c.vfs, graph: c.graph, state: c.state, rootId: folder.id })
  try {
    await engine.init()
    await engine.pull((done, total) => set({ sync: { ...IDLE, state: 'syncing', progress: { done, total } } }))
    if (!(await c.host.hasFolder())) throw new Error('Po pobraniu w folderze nie ma pliku fi.json – sprawdź folder na komputerze.')
    startSync(folder)
    set({ phase: 'ready', sync: { ...IDLE, lastSync: new Date().toISOString() } })
    return true
  } catch (e) {
    set({ sync: { ...IDLE, state: e instanceof NetworkError ? 'offline' : 'error', message: messageOf(e) }, message: messageOf(e) })
    return false
  }
}

/** Again after a failed first copy. */
export function retryFirstSync(): Promise<boolean> {
  const folder = usePhone.getState().folder
  return folder ? firstSync(folder) : Promise.resolve(false)
}

export function syncNow(): Promise<void> {
  return need().scheduler?.syncNow() ?? Promise.resolve()
}

/** The copy and the sync's state forgotten (another folder; signed out). */
async function forgetMirror(): Promise<void> {
  const c = need()
  c.scheduler?.stop()
  c.scheduler = null
  c.engine = null
  await c.host.close()
  await c.vfs.reset()
  await c.state.clear()
}

/** Changes not on OneDrive yet (signing out would lose them). */
export function pendingChanges(): number {
  return need().engine?.pending() ?? 0
}

/** Signed out: the account, the folder and the copy gone from the phone; the app starts afresh. */
export async function signOut(): Promise<void> {
  const c = need()
  await forgetMirror()
  c.tokens.forget()
  await authStore(c.platform).set(null)
  await c.platform.kv.remove(FOLDER_KEY)
  location.reload()
}

/** Another folder: back to the folder's screen (the copy goes once another folder is chosen). */
export function changeFolder(): void {
  set({ phase: 'folder', message: null })
}

/** The planned notifications replaced (IP0.4). */
export function planNotifications(list: Parameters<Platform['notifications']['plan']>[0]): Promise<void> {
  return need().platform.notifications.plan(list)
}

export function phoneVersion(): string {
  return need().platform.version
}

export function isNative(): boolean {
  return need().platform.native
}
