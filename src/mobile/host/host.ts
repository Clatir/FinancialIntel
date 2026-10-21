/**
 * The phone's `window.fi` (T307): what the main process of the computers does, in the app's web view – the data store of
 * the computers over the mirror of OneDrive, the sync, this phone's presence, the quick entry in the same window and the
 * notifications. The screens of the computers' renderer run over it unchanged; what only a computer can do (import,
 * backups, ICTTJ, updates, files) says so.
 */
import type {
  AppInfo,
  ChangeSet,
  FiApi,
  FlushResult,
  MachineConfig,
  OpenFolderResult,
  QuickData,
  QuickResult,
  Snapshot,
  TrayPrefs
} from '@shared/api'
import { EMPTY_ICTJ } from '@shared/ictj'
import { DEFAULT_MACHINE_PREFS, machinePrefsFrom, patchMachinePrefs, zoomByKey, type MachinePrefs, type ZoomKey } from '@shared/machine'
import { DEFAULT_UPDATE_PREFS, NO_UPDATE_TOKEN, type UpdateState } from '@shared/update'
import type { Collection } from '@shared/paths'
import { ConflictCopyError, DataStore, RemovedOutsideError } from '../../main/datastore/store'
import { IN_USE_MS, readOtherMachines, writePresence } from '../../main/datastore/presence'
import { MIRROR } from '../sync/engine'

/** What only a computer does. */
export const PC_ONLY = 'To zrobisz na komputerze – na telefonie tej funkcji nie ma.'

/** This phone's small values (Capacitor Preferences; localStorage in the browser). */
export interface KeyValue {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

export interface PhoneNotice {
  title: string
  body: string
  /** Where its tap leads (the notifier's tag). */
  tag: string
  /** Shown once per key (a planned one and the same one due later are one). */
  key?: string
  silent?: boolean
}

export interface Notifications {
  /** At once. */
  show(n: PhoneNotice): Promise<void>
  onTap(cb: (tag: string) => void): void
}

export interface HostDeps {
  version: string
  kv: KeyValue
  notifications: Notifications
  openUrl: (url: string) => Promise<void>
  /** The time (tests). */
  now?: () => number
}

/** The Electron way an error crosses to the window (`lib/api.ts` `errorMessage` takes the prefix off). */
function remote(channel: string, e: unknown): Error {
  const inner = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  return new Error(`Error invoking remote method 'fi:${channel}': ${inner}`)
}

type Listener<A extends unknown[]> = (...args: A) => void

class Emitter<A extends unknown[]> {
  private readonly set = new Set<Listener<A>>()
  get size(): number {
    return this.set.size
  }
  on(cb: Listener<A>): () => void {
    this.set.add(cb)
    return () => this.set.delete(cb)
  }
  emit(...args: A): void {
    for (const cb of [...this.set]) {
      try {
        cb(...args)
      } catch (e) {
        console.error(e)
      }
    }
  }
}

/** The notifications' screens the phone has (iA: Mostek); a tap on any other leads to Mostek, whose briefing lists it. */
const PHONE_TAGS: ReadonlySet<string> = new Set(['briefing'])

export function phoneTapTag(tag: string): string {
  return PHONE_TAGS.has(tag) ? tag : 'briefing'
}

/** The notifier's notices shown in the app (key → day): the plan for iOS leaves them out. */
const SHOWN_KEY = 'fi.phone.shown'
const SHOWN_KEEP_MS = 2 * 86_400_000

const MACHINE_KEY = 'fi.phone.machine'
const PREFS_KEY = 'fi.phone.prefs'
/** In use on the phone: the app in front and touched within 10 minutes (D86). */
const HEARTBEAT_MS = 60_000

export class PhoneHost {
  store: DataStore | null = null
  machineName = 'iPhone'
  prefs: MachinePrefs = DEFAULT_MACHINE_PREFS
  /** The app in front (iOS: not paused). */
  foreground = true
  private activeAt = 0
  private toldInUse: boolean | null = null
  private generation = 0
  private shownGeneration = 0
  private unshown: ChangeSet[] = []
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private revealTimer: ReturnType<typeof setTimeout> | null = null
  private flusher: (() => Promise<FlushResult>) | null = null
  private quickVisible = false
  /** A notification tapped before the window listened (the app started by the tap). */
  private pendingTap: string | null = null
  private shown: Record<string, number> = {}
  private readonly now: () => number

  readonly changes = new Emitter<[ChangeSet]>()
  readonly prefsChanged = new Emitter<[MachinePrefs]>()
  readonly inUse = new Emitter<[boolean]>()
  readonly taps = new Emitter<[string]>()
  readonly quickRequest = new Emitter<[]>()
  readonly quickVisibility = new Emitter<[boolean]>()
  readonly quickDataOut = new Emitter<[QuickData | null]>()
  readonly quickUpdateOut = new Emitter<[QuickData | null]>()
  readonly quickAddIn = new Emitter<[unknown]>()
  readonly quickResultOut = new Emitter<[QuickResult]>()
  /** The shell: the quick entry's sheet shown or hidden. */
  readonly quickSheet = new Emitter<[boolean]>()

  constructor(private readonly d: HostDeps) {
    this.now = d.now ?? Date.now
    d.notifications.onTap((tag) => {
      const target = phoneTapTag(tag)
      if (this.taps.size) this.taps.emit(target)
      else this.pendingTap = target
    })
    this.api = this.buildApi()
  }

  /** This phone's name and preferences, kept between runs. */
  async load(): Promise<void> {
    this.machineName = (await this.d.kv.get(MACHINE_KEY)) || 'iPhone'
    const raw = await this.d.kv.get(PREFS_KEY)
    let parsed: unknown = null
    try {
      parsed = raw ? JSON.parse(raw) : null
    } catch {
      parsed = null
    }
    // The phone has no global shortcut and no file watching (the prefs keep their place for the computers' code).
    this.prefs = { ...machinePrefsFrom(parsed), quickShortcut: '', bankFiles: false }
    if (this.prefs.hideOnStart) this.prefs = { ...this.prefs, hideAmounts: true }
    try {
      const kept = JSON.parse((await this.d.kv.get(SHOWN_KEY)) ?? '{}') as Record<string, unknown>
      this.shown = Object.fromEntries(Object.entries(kept).filter((e): e is [string, number] => typeof e[1] === 'number'))
    } catch {
      this.shown = {}
    }
  }

  /** The notifier showed it in the app (the morning briefing at an early opening): not planned for later. */
  wasShown(key: string): boolean {
    return key in this.shown
  }

  private noteShown(key: string): void {
    const now = this.now()
    this.shown = Object.fromEntries(Object.entries({ ...this.shown, [key]: now }).filter(([, at]) => at >= now - SHOWN_KEEP_MS))
    void this.d.kv.set(SHOWN_KEY, JSON.stringify(this.shown)).catch(() => undefined)
  }

  async setMachineName(name: string): Promise<void> {
    this.machineName = name.trim().slice(0, 40) || 'iPhone'
    await this.d.kv.set(MACHINE_KEY, this.machineName)
  }

  // ------------------------------------------------------------------ the folder

  /** The mirror holds a data folder (fi.json came with the first copy). */
  async hasFolder(): Promise<boolean> {
    return (await DataStore.inspect(MIRROR)) === 'data'
  }

  /** The data store opened over the mirror (once; again after `close`). */
  async open(): Promise<Snapshot> {
    if (!this.store) {
      const store = new DataStore(MIRROR, { machineName: this.machineName, log: (level, message, detail) => console[level === 'info' ? 'log' : level](message, detail ?? '') })
      const snap = await store.open()
      this.store = store
      this.generation++
      this.unshown = []
      store.otherMachines = await readOtherMachines(MIRROR, this.machineName).catch(() => [])
      snap.status = store.status()
      snap.generation = this.generation
      this.startHeartbeat()
      return snap
    }
    const snap = await this.store.snapshot()
    this.generation++
    this.unshown = []
    snap.generation = this.generation
    snap.status = this.store.status()
    return snap
  }

  /** Signed out, another folder: nothing of this one any more. */
  async close(): Promise<void> {
    const s = this.store
    this.store = null
    this.stopHeartbeat()
    if (s) await s.idle()
  }

  /** The sync's changes in the data store's turn (`SyncEngine` `apply`). */
  applyExternal = async (rels: string[], write: () => Promise<void>): Promise<void> => {
    const s = this.store
    if (!s) return write()
    this.send(await s.applyExternal(rels, write))
  }

  private send(change: ChangeSet | null): void {
    if (!change) return
    if (this.shownGeneration !== this.generation) {
      this.unshown.push(change)
      return
    }
    this.changes.emit(change)
  }

  private requireStore(): DataStore {
    if (!this.store) throw new Error('Folder danych nie jest jeszcze gotowy – trwa pierwsza synchronizacja z OneDrive.')
    return this.store
  }

  /** The window's unsaved changes saved, then everything written to IndexedDB (the app going to the background). */
  async flush(): Promise<FlushResult | null> {
    const f = this.flusher
    const res = f ? await f().catch(() => null) : null
    await this.store?.idle()
    return res
  }

  // ------------------------------------------------------------------ presence and use

  private startHeartbeat(): void {
    this.stopHeartbeat()
    void this.beat(true)
    this.heartbeat = setInterval(() => void this.beat(), HEARTBEAT_MS)
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat)
    this.heartbeat = null
  }

  inUseNow(): boolean {
    return this.foreground && this.activeAt > 0 && this.now() - this.activeAt < IN_USE_MS
  }

  private tellInUse(): void {
    const v = this.inUseNow()
    if (v === this.toldInUse) return
    this.toldInUse = v
    this.inUse.emit(v)
  }

  noteActivity(): void {
    const was = this.inUseNow()
    this.activeAt = this.now()
    if (!was) {
      this.tellInUse()
      void this.beat(true)
    }
  }

  /** The app back in front / to the background (iOS). */
  setForeground(on: boolean): void {
    this.foreground = on
    if (on) this.noteActivity()
    else {
      this.tellInUse()
      // The computers see the phone not in use at once (its presence written now, sent with the last sync).
      void this.beat(true)
    }
  }

  /** This phone's presence in `.presence/` (in use: every minute) and the other computers' read again. */
  async beat(force = false): Promise<void> {
    this.tellInUse()
    const s = this.store
    if (!s || s.status().readOnly) return
    try {
      if (force || this.inUseNow()) {
        await writePresence(MIRROR, this.machineName, this.d.version, this.inUseNow() ? new Date(this.activeAt).toISOString() : null)
      }
      const others = await readOtherMachines(MIRROR, this.machineName, this.now())
      if (s !== this.store) return
      if (JSON.stringify(others) !== JSON.stringify(s.otherMachines)) {
        s.otherMachines = others
        this.send(await s.refresh([]))
      }
    } catch (e) {
      console.warn('heartbeat', e)
    }
  }

  // ------------------------------------------------------------------ this phone's preferences

  private async savePrefs(next: MachinePrefs): Promise<MachinePrefs> {
    this.prefs = next
    this.prefsChanged.emit(next)
    await this.d.kv.set(PREFS_KEY, JSON.stringify(next))
    return next
  }

  private reveal(minutes: number | null): Promise<MachinePrefs> {
    if (this.revealTimer) clearTimeout(this.revealTimer)
    this.revealTimer = null
    if (minutes != null)
      this.revealTimer = setTimeout(() => {
        this.revealTimer = null
        void this.savePrefs({ ...this.prefs, hideAmounts: true })
      }, minutes * 60_000)
    return this.savePrefs({ ...this.prefs, hideAmounts: false })
  }

  // ------------------------------------------------------------------ the quick entry (one window: a sheet)

  openQuick(): void {
    this.quickVisible = true
    this.quickSheet.emit(true)
    this.quickVisibility.emit(true)
    this.quickRequest.emit()
  }

  closeQuick(): void {
    if (!this.quickVisible) return
    this.quickVisible = false
    this.quickSheet.emit(false)
    this.quickVisibility.emit(false)
  }

  // ------------------------------------------------------------------ window.fi

  private config(): MachineConfig {
    return {
      dataDir: MIRROR,
      recentDirs: [],
      backupDirOverride: null,
      window: null,
      updates: { prefs: DEFAULT_UPDATE_PREFS, pending: null, lastRunVersion: this.d.version, token: null, tokenEncrypted: false },
      tray: this.tray(),
      prefs: this.prefs,
      ictj: { dir: null, exe: null },
      importDir: null
    }
  }

  private tray(): TrayPrefs & { loginSupported: boolean } {
    return { closeToTray: false, launchAtLogin: false, notified: true, autostartAsked: true, loginSupported: false }
  }

  private updates(): UpdateState {
    return {
      phase: 'idle',
      currentVersion: this.d.version,
      mode: 'manual',
      modeNote: 'Na telefonie nowe wersje instaluje AltStore (źródło Financial Intel).',
      release: null,
      progress: null,
      error: null,
      lastCheckAt: null,
      justUpdated: null,
      prefs: DEFAULT_UPDATE_PREFS,
      token: NO_UPDATE_TOKEN
    }
  }

  readonly api: FiApi

  private buildApi(): FiApi {
    const call =
      <A extends unknown[], R>(channel: string, fn: (...args: A) => Promise<R> | R) =>
      async (...args: A): Promise<R> => {
        try {
          return await fn(...args)
        } catch (e) {
          throw remote(channel, e)
        }
      }
    const pcOnly = (channel: string) => call(channel, () => Promise.reject(new Error(PC_ONLY)))
    const store = () => this.requireStore()
    const self = this
    const api: FiApi = {
      appInfo: call(
        'appInfo',
        (): AppInfo => ({ version: this.d.version, machineName: this.machineName, platform: 'ios', userDataDir: '', freeze: { afterOpenMs: 3 * 60_000, quietMs: 60_000 } })
      ),
      getConfig: call('getConfig', () => this.config()),
      loadCurrent: call('loadCurrent', async (): Promise<OpenFolderResult | null> => {
        if (!this.store && !(await this.hasFolder())) return null
        return { ok: true, snapshot: await this.open() }
      }),
      repairSettings: pcOnly('repairSettings'),
      defaultDataDir: call('defaultDataDir', () => ({ dir: MIRROR, oneDrive: true })),
      pickDataDir: pcOnly('pickDataDir'),
      openDataDir: pcOnly('openDataDir'),
      cancelOpen: call('cancelOpen', () => undefined),
      onOpenProgress: () => () => undefined,
      rendererStep: (name, ms) => {
        if (ms != null && ms >= 500) console.log(`krok okna: ${name} ${ms} ms`)
      },
      saveRecord: call('saveRecord', async (collection: Collection, record: never) => {
        const s = store()
        try {
          const { entry, change } = await s.saveRecord(collection, record)
          this.send(change)
          return entry
        } catch (e) {
          if (e instanceof RemovedOutsideError || e instanceof ConflictCopyError) this.send(e.change)
          throw e
        }
      }) as FiApi['saveRecord'],
      saveRecords: call('saveRecords', async (collection: Collection, records: never[]) => {
        const s = store()
        const { results, changes } = await s.saveRecords(collection, records)
        for (const c of changes) this.send(c)
        return results
      }) as FiApi['saveRecords'],
      deleteRecords: call('deleteRecords', async (collection: Collection, ids: readonly string[], reason?: 'delete' | 'undo' | 'drop') => {
        const s = store()
        const { results, change } = await s.deleteRecords(collection, ids, reason === 'undo' ? 'undo' : reason === 'drop' && collection === 'imports' ? 'drop' : 'delete')
        this.send(change)
        return results
      }),
      deleteRecord: call('deleteRecord', async (collection: Collection, id: string) => {
        this.send(await store().deleteRecord(collection, id))
      }),
      historyList: call('historyList', (kind, id) => store().historyList(kind, id)),
      historyRead: call('historyRead', (kind, id, file) => store().historyRead(kind, id, file)),
      historyDeleted: call('historyDeleted', (collection) => store().historyDeleted(collection)),
      historyKeep: call('historyKeep', async (kind, record, reason) => {
        await store().historyKeep(kind, record, reason)
      }),
      historyRestore: call('historyRestore', async (kind, id, file) => {
        const { change, fi } = await store().historyRestore(kind, id, file)
        this.send(change)
        return fi
      }),
      saveSettings: call('saveSettings', async (fi: never) => {
        const { fi: saved, change } = await store().writeSettings(fi)
        this.send(change)
        return saved
      }),
      folderShown: call('folderShown', (generation: number) => {
        if (generation !== this.generation || generation === this.shownGeneration) return
        this.shownGeneration = generation
        const waiting = this.unshown
        this.unshown = []
        for (const c of waiting) this.changes.emit(c)
      }),
      resolveConflict: pcOnly('resolveConflict'),
      mergeConflict: pcOnly('mergeConflict'),
      resolveConflicts: pcOnly('resolveConflicts'),
      trashProblemFile: pcOnly('trashProblemFile'),
      showInFolder: call('showInFolder', () => undefined),
      openExternal: call('openExternal', (url: string) => this.d.openUrl(url)),
      openLogs: call('openLogs', () => undefined),
      trayPrefs: call('trayPrefs', () => this.tray()),
      setTrayPrefs: call('setTrayPrefs', () => this.tray()),
      rescan: call('rescan', () => undefined),
      exportZip: pcOnly('exportZip'),
      saveTextFile: pcOnly('saveTextFile'),
      saveXlsx: pcOnly('saveXlsx'),
      savePdf: pcOnly('savePdf'),
      listBackups: pcOnly('listBackups'),
      backupNow: pcOnly('backupNow'),
      importBackup: pcOnly('importBackup'),
      backupPreview: pcOnly('backupPreview'),
      backupRecover: pcOnly('backupRecover'),
      backupToFolder: pcOnly('backupToFolder'),
      putVersions: pcOnly('putVersions'),
      pickImportFile: pcOnly('pickImportFile'),
      bankFiles: call('bankFiles', () => []),
      onBankFiles: () => () => undefined,
      readBankFile: call('readBankFile', () => null),
      trashBankFile: call('trashBankFile', () => false),
      setBackupDir: pcOnly('setBackupDir'),
      showPath: call('showPath', () => undefined),
      updateState: call('updateState', () => this.updates()),
      checkForUpdates: call('checkForUpdates', () => this.updates()),
      downloadUpdate: call('downloadUpdate', () => this.updates()),
      installUpdateNow: pcOnly('installUpdateNow'),
      setUpdatePrefs: call('setUpdatePrefs', () => this.updates()),
      setUpdateToken: call('setUpdateToken', () => this.updates()),
      dismissUpdateNotice: call('dismissUpdateNotice', () => this.updates()),
      onUpdateState: () => () => undefined,
      onChange: (cb) => this.changes.on(cb),
      onFlushRequest: (cb) => {
        this.flusher = cb
        return () => {
          if (this.flusher === cb) this.flusher = null
        }
      },
      detachOpen: call('detachOpen', () => undefined),
      detachSend: call('detachSend', () => undefined),
      detachClose: call('detachClose', () => undefined),
      detachFocus: call('detachFocus', () => undefined),
      onDetachClosed: () => () => undefined,
      onDetachEvent: () => () => undefined,
      detachReady: call('detachReady', () => null),
      onDetachProps: () => () => undefined,
      detachEmit: call('detachEmit', () => undefined),
      detachFullscreen: call('detachFullscreen', () => false),
      setMachinePrefs: call('setMachinePrefs', (patch: Partial<MachinePrefs>) => {
        // The phone has no global shortcut and no file watching, whatever a screen of the computers sets.
        const next = { ...patchMachinePrefs(this.prefs, patch), quickShortcut: '', bankFiles: false }
        return this.savePrefs(next)
      }),
      zoomBy: call('zoomBy', (key: ZoomKey) => this.savePrefs({ ...this.prefs, zoom: zoomByKey(this.prefs.zoom, key) })),
      onMachinePrefs: (cb) => this.prefsChanged.on(cb),
      revealAmounts: call('revealAmounts', (minutes: number | null) => this.reveal(minutes)),
      reportActivity: call('reportActivity', () => this.noteActivity()),
      inUseNow: call('inUseNow', () => this.inUseNow()),
      onInUse: (cb) => this.inUse.on(cb),
      onConfigReady: () => () => undefined,
      quickShortcutState: call('quickShortcutState', () => ({ accelerator: '', registered: false, replaced: null })),
      quickOpen: call('quickOpen', () => this.openQuick()),
      onQuickRequest: (cb) => this.quickRequest.on(cb),
      quickData: call('quickData', (data: QuickData | null) => this.quickDataOut.emit(data)),
      onQuickVisible: (cb) => this.quickVisibility.on(cb),
      quickUpdate: call('quickUpdate', (data: QuickData | null) => {
        if (self.quickVisible) this.quickUpdateOut.emit(data)
      }),
      onQuickAdd: (cb) => this.quickAddIn.on(cb),
      quickResult: call('quickResult', (r: QuickResult) => this.quickResultOut.emit(r)),
      onQuickData: (cb) => this.quickDataOut.on(cb),
      onQuickUpdate: (cb) => this.quickUpdateOut.on(cb),
      quickAdd: call('quickAdd', (draft: unknown) => this.quickAddIn.emit(draft)),
      quickRefresh: call('quickRefresh', () => {
        if (self.quickVisible) this.quickRequest.emit()
      }),
      onQuickResult: (cb) => this.quickResultOut.on(cb),
      quickClose: call('quickClose', () => this.closeQuick()),
      setTrayStatus: call('setTrayStatus', () => undefined),
      notify: call('notify', (n: { title: string; body: string; tag: string; silent?: boolean; key?: string }) => {
        if (n.key) this.noteShown(n.key)
        return this.d.notifications.show({ title: n.title, body: n.body, tag: n.tag, silent: n.silent, key: n.key })
      }),
      onNotificationClick: (cb) => {
        let listening = true
        const off = this.taps.on(cb)
        const tag = this.pendingTap
        this.pendingTap = null
        if (tag)
          queueMicrotask(() => {
            if (listening) cb(tag)
            else if (this.taps.size) this.taps.emit(tag)
            else this.pendingTap = tag
          })
        return () => {
          listening = false
          off()
        }
      },
      ictjState: call('ictjState', () => EMPTY_ICTJ),
      ictjSuggest: call('ictjSuggest', () => null),
      ictjPickDir: call('ictjPickDir', () => null),
      ictjSetDir: call('ictjSetDir', () => EMPTY_ICTJ),
      ictjOpen: call('ictjOpen', () => ({ ok: false, message: 'ICT Trade Journal działa na komputerze.' })),
      ictjProgram: call('ictjProgram', () => ({ exe: null, source: null })),
      ictjPickExe: call('ictjPickExe', () => ({ exe: null, source: null })),
      onIctj: () => () => undefined
    }
    return api
  }
}
