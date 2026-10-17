// adapted from ICTTJ src/shared/api.ts @ 84a8339
/** Contract between the main process (data folder owner) and the renderer. */
import type { Collection, FileKind } from './paths'
import type { RecordTypes } from './records'
import type { SettingsFile } from './schema'
import type { PendingUpdate, UpdatePrefs, UpdateState } from './update'

export interface RecordEntry<T> {
  record: T
  relPath: string
  /** File written by a newer app version: shown, never overwritten. */
  readOnly: boolean
}

export type ProblemKind = 'corrupt' | 'invalid' | 'too-new' | 'unknown-file'

export interface Problem {
  relPath: string
  kind: ProblemKind
  message: string
}

export interface ConflictSide {
  relPath: string
  record: unknown | null
  error: string | null
  updatedAt: string | null
  mtimeMs: number
}

export interface ConflictEntry {
  /** Stable id = relative path of the copy. */
  id: string
  kind: FileKind
  /** 'copy' = file created by a sync tool; 'duplicate' = two canonical files with the same record id. */
  type: 'copy' | 'duplicate'
  source: string
  canonical: ConflictSide
  copy: ConflictSide
}

export interface FolderStatus {
  dataDir: string
  available: boolean
  readOnly: boolean
  readOnlyReason: string | null
  folderSchemaVersion: number
  appSchemaVersion: number
  /** Other machines that used this folder within the last few minutes. */
  otherMachines: Array<{ machine: string; lastSeen: string }>
  migratedFrom: number | null
  backupPath: string | null
}

/** Records of every collection. */
export type RecordLists = { [C in Collection]: RecordEntry<RecordTypes[C]>[] }

export interface Snapshot {
  fi: SettingsFile
  records: RecordLists
  problems: Problem[]
  conflicts: ConflictEntry[]
  status: FolderStatus
  loadMs: number
}

export interface ChangeSet {
  upserts: Array<{ collection: Collection; entry: RecordEntry<RecordTypes[Collection]> }>
  removals: Array<{ collection: Collection; id: string }>
  /** fi.json when it changed. */
  fi: SettingsFile | null
  problems: Problem[]
  conflicts: ConflictEntry[]
  status: FolderStatus
  /**
   * 'external': files changed outside this app instance (another computer through cloud sync, a manual edit, a
   * rescan); 'local': the result of this app's own action (save, delete, conflict resolution).
   */
  origin?: 'external' | 'local'
}

/** Why a version was kept in the history. */
export type HistoryReason = 'edit' | 'delete' | 'restore' | 'import' | 'merge' | 'discarded'

/** One kept version of a record (`.history/`). */
export interface HistoryEntry {
  file: string
  /** When the version was put into the history (= when it was replaced or deleted). */
  savedAt: string
  /** Computer that replaced it. */
  savedBy: string | null
  reason: HistoryReason
  /** updatedAt / updatedBy of the kept version itself. */
  updatedAt: string | null
  updatedBy: string | null
}

export type HistoryKind = FileKind

export interface BackupInfo {
  name: string
  path: string
  kind: 'daily' | 'manual' | 'pre-import' | 'pre-migration'
  bytes: number
  mtimeMs: number
}

/** Settings of this computer (userData/config.json, never synced – decision T12). */
export interface MachineConfig {
  dataDir: string | null
  recentDirs: string[]
  backupDirOverride: string | null
  window: { x?: number; y?: number; width: number; height: number; maximized: boolean } | null
  updates: {
    prefs: UpdatePrefs
    pending: PendingUpdate | null
    /** Version that ran last on this machine (to say "updated to …" once). */
    lastRunVersion: string | null
    /** GitHub token (only needed when the repository is private): encrypted with the system's protection when available. */
    token: string | null
    tokenEncrypted: boolean
  }
  tray: TrayPrefs
}

export interface TrayPrefs {
  /** Closing the window hides it to the tray (notifications keep working); "Zakończ" in the tray menu quits. */
  closeToTray: boolean
  /** Start with Windows, hidden in the tray. */
  launchAtLogin: boolean
  /** The "works in the tray" notification was shown once. */
  notified: boolean
}

export interface AppInfo {
  version: string
  machineName: string
  platform: string
  userDataDir: string
  isPortable: boolean
}

export type OpenFolderResult =
  | { ok: true; snapshot: Snapshot }
  | { ok: false; reason: 'cancelled' | 'not-data' | 'error'; message: string; dir?: string }

export interface FiApi {
  appInfo(): Promise<AppInfo>
  getConfig(): Promise<MachineConfig>
  /** Open the configured folder (or null when none is configured yet). */
  loadCurrent(): Promise<OpenFolderResult | null>
  /** Proposed folder for new data: `OneDrive\FinancialIntel`, without OneDrive `Dokumenty\FinancialIntel`. */
  defaultDataDir(): Promise<{ dir: string; oneDrive: boolean }>
  /** Show a folder picker. mode=create initializes an empty folder as new data. */
  pickDataDir(mode: 'open' | 'create'): Promise<OpenFolderResult>
  openDataDir(dir: string, createIfEmpty: boolean): Promise<OpenFolderResult>
  saveRecord<C extends Collection>(collection: C, record: RecordTypes[C]): Promise<RecordEntry<RecordTypes[C]>>
  deleteRecord(collection: Collection, id: string): Promise<void>
  /** Kept versions of a record, newest first (the settings: `kind` 'fi', `id` = the id of fi.json). */
  historyList(kind: HistoryKind, id: string): Promise<HistoryEntry[]>
  /** The record of one kept version (null when gone). */
  historyRead(kind: HistoryKind, id: string, file: string): Promise<unknown>
  /** Deleted records of a collection that can be brought back. */
  historyDeleted(collection: Collection): Promise<Array<HistoryEntry & { id: string; record: unknown }>>
  /** Make a kept version the current one (the current version goes to the history first); restored settings are returned. */
  historyRestore(kind: HistoryKind, id: string, file: string): Promise<SettingsFile | null>
  /** Keep a version that is about to be dropped without being written (e.g. local edits discarded in a merge). */
  historyKeep(kind: HistoryKind, record: unknown, reason: HistoryReason): Promise<void>
  saveSettings(fi: SettingsFile): Promise<SettingsFile>
  resolveConflict(conflictId: string, keep: 'canonical' | 'copy'): Promise<void>
  trashProblemFile(relPath: string): Promise<void>
  showInFolder(relPath: string | null): Promise<void>
  openExternal(url: string): Promise<void>
  /** Opens the folder of this computer's application log (userData/logs) in the file manager. */
  openLogs(): Promise<void>
  /** Tray of this computer; `loginSupported` = start with the system is possible (packaged, Windows). */
  trayPrefs(): Promise<TrayPrefs & { loginSupported: boolean }>
  setTrayPrefs(patch: Partial<Pick<TrayPrefs, 'closeToTray' | 'launchAtLogin'>>): Promise<TrayPrefs & { loginSupported: boolean }>
  rescan(): Promise<void>
  /** ZIP of the whole data folder (without backups). */
  exportZip(): Promise<string | null>
  copyText(text: string): Promise<void>
  listBackups(): Promise<{ dir: string; files: BackupInfo[] }>
  backupNow(): Promise<string>
  /** The backup before an import from the bank (backups/pre-import); returns its path. */
  importBackup(): Promise<string>
  /** Choose a bank's export file (CSV): its name and bytes (decoded by the renderer); null = cancelled. */
  pickImportFile(): Promise<{ name: string; bytes: Uint8Array } | null>
  /** Change the backups folder on this machine: 'pick' shows a dialog, 'default' = backups/ in the data folder. */
  setBackupDir(mode: 'pick' | 'default'): Promise<string | null>
  showPath(absPath: string): Promise<void>
  /** Updates from GitHub Releases. */
  updateState(): Promise<UpdateState>
  checkForUpdates(): Promise<UpdateState>
  downloadUpdate(): Promise<UpdateState>
  /** Quit, install the downloaded update and start the new version (call after flushing saves). */
  installUpdateNow(): Promise<void>
  setUpdatePrefs(prefs: Partial<UpdatePrefs>): Promise<UpdateState>
  /** Saves (or with null removes) the GitHub token of this computer and checks for updates with it. */
  setUpdateToken(token: string | null): Promise<UpdateState>
  dismissUpdateNotice(): Promise<UpdateState>
  onUpdateState(cb: (state: UpdateState) => void): () => void
  onChange(cb: (change: ChangeSet) => void): () => void
  /** Main asks the renderer to flush pending saves before the window closes (false = something stayed unsaved). */
  onFlushRequest(cb: () => Promise<boolean>): () => void
  /** Detached panels, main window side: open (or focus) the window of `key`, its new data, close, focus. */
  detachOpen(key: string, payload: DetachPayload): Promise<void>
  detachSend(key: string, payload: DetachPayload): Promise<void>
  detachClose(key: string): Promise<void>
  detachFocus(key: string): Promise<void>
  onDetachClosed(cb: (key: string) => void): () => void
  onDetachEvent(cb: (key: string, event: DetachEvent) => void): () => void
  /** Detached window side: its data so far (null = not a detached window), new data, events for the main window. */
  detachReady(): Promise<DetachPayload | null>
  onDetachProps(cb: (payload: DetachPayload) => void): () => void
  detachEmit(event: DetachEvent): Promise<void>
  /** Full screen of this (detached) window: switch on / off, or toggle when no value; answers the new state. */
  detachFullscreen(on?: boolean): Promise<boolean>
}

/** A panel shown in its own window: what to draw (a known kind) and its data (plain JSON, sent again on change). */
export interface DetachPayload {
  kind: string
  title: string
  props: unknown
}

/** Something done in a detached window for the main window to handle. */
export interface DetachEvent {
  type: string
  [key: string]: unknown
}
