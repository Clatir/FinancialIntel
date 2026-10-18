// adapted from ICTTJ src/shared/api.ts @ 84a8339
/** Contract between the main process (data folder owner) and the renderer. */
import type { XlsxSheet } from './export/xlsx'
import type { Collection, FileKind } from './paths'
import type { RecordTypes } from './records'
import type { SettingsFile } from './schema'
import type { PendingUpdate, UpdatePrefs, UpdateState } from './update'
import type { MachinePrefs } from './machine'
import type { IctjSnapshot } from './ictj'

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
  /** The shortcut, notifications, sounds and the hiding of amounts of this computer (`shared/machine.ts`). */
  prefs: MachinePrefs
  /** ICT Trade Journal on this computer (D72): its data folder (read only) and its program chosen by hand (portable). */
  ictj: { dir: string | null; exe: string | null }
}

/** ICTTJ's program on this computer: chosen by hand (a portable copy) or found installed. */
export interface IctjProgram {
  exe: string | null
  source: 'chosen' | 'installed' | null
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
  | { ok: false; reason: 'cancelled' | 'aborted' | 'not-data' | 'error'; message: string; dir?: string }

/** The steps of reading the folder itself (1.4.1). */
export type LoadStep = 'list' | 'read' | 'migrate' | 'prepare'
/** The steps of opening a data folder: checking it, reading it, the other computers' presence. */
export type OpenStep = 'inspect' | LoadStep | 'machines'

export interface SlowFile {
  relPath: string
  ms: number
}

/** Opening a data folder in progress (1.4.1): sent to the window about four times a second. */
export interface OpenProgress {
  dir: string
  step: OpenStep
  /** Files read; files found (while listing: found so far). */
  done: number
  total: number
  /** The file waiting longest right now (OneDrive fetching it from the cloud, an antivirus…). */
  waiting: SlowFile | null
  /** Reads that took at least `slowMs`. */
  slow: number
  /** The threshold of a slow read (`SLOW_FILE_MS`). */
  slowMs: number
  elapsedMs: number
}

/** A read this long means the file was not on the disk (OneDrive online-only) or something holds it. */
export const SLOW_FILE_MS = 3000

/** A month's record written beside the month's file of another record (two computers made it – B46): the start of the error's message. */
export const CONFLICT_COPY_MESSAGE = 'Ten miesiąc zapisał już inny komputer'

export const OPEN_ABORTED_MESSAGE =
  'Przerwano wczytywanie folderu – nic w nim nie zostało zmienione. Jeśli pliki pobiera OneDrive, ustaw na folderze „Zawsze zachowuj na tym urządzeniu”, poczekaj na zielone ptaszki i spróbuj ponownie.'

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
  /** Stop opening a folder (1.4.1): the open in progress returns `aborted`, nothing in the folder changes. */
  cancelOpen(): Promise<void>
  onOpenProgress(cb: (p: OpenProgress) => void): () => void
  /** A long computation in the window (1.4.1): `ms` undefined = it starts, a number = it took so long (logged ≥ 500 ms). */
  rendererStep(name: string, ms?: number): void
  saveRecord<C extends Collection>(collection: C, record: RecordTypes[C]): Promise<RecordEntry<RecordTypes[C]>>
  /** Many records with one call (an import, a bulk change – W1): each written, or why not. */
  saveRecords<C extends Collection>(collection: C, records: readonly RecordTypes[C][]): Promise<Array<{ id: string; entry?: RecordEntry<RecordTypes[C]>; error?: string }>>
  deleteRecord(collection: Collection, id: string): Promise<void>
  /** Many records deleted with one call (W1): each deleted, or why not. */
  deleteRecords(collection: Collection, ids: readonly string[]): Promise<Array<{ id: string; error?: string }>>
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
  /** A text file (CSV) saved where the user says; its path, or null when cancelled (E8). */
  saveTextFile(defaultName: string, content: string, filter: { name: string; extensions: string[] }): Promise<string | null>
  saveXlsx(defaultName: string, sheets: XlsxSheet[]): Promise<string | null>
  /** A report's self-contained HTML printed to an A4 PDF. */
  savePdf(defaultName: string, html: string): Promise<string | null>
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
  /** Preferences of this computer (shortcut, notifications, sounds, hidden amounts): a patch, the result for all windows. */
  setMachinePrefs(patch: Partial<MachinePrefs>): Promise<MachinePrefs>
  onMachinePrefs(cb: (prefs: MachinePrefs) => void): () => void
  /** The quick entry's global shortcut: registered, or taken by another program. */
  quickShortcutState(): Promise<{ accelerator: string; registered: boolean }>
  /** Show the quick entry window (the tray, the palette, the bridge). */
  quickOpen(): Promise<void>
  /** Main window: the quick window wants its data (categories, today's energy…) – answer with `quickData`. */
  onQuickRequest(cb: () => void): () => void
  quickData(data: QuickData | null): Promise<void>
  /** Main window: an operation typed in the quick window to add – answer with `quickResult`. */
  onQuickAdd(cb: (draft: unknown) => void): () => void
  quickResult(result: QuickResult): Promise<void>
  /** Quick window: its data, adding an operation (the main window saves it), closing. */
  onQuickData(cb: (data: QuickData | null) => void): () => void
  quickAdd(draft: unknown): Promise<void>
  /** Quick window: its renderer is ready – the data again (the first answer may have come before it listened). */
  quickRefresh(): Promise<void>
  onQuickResult(cb: (result: QuickResult) => void): () => void
  quickClose(): Promise<void>
  /** The tray's tooltip: today's energy (null = only the app's name). */
  setTrayStatus(text: string | null): Promise<void>
  /** A Windows notification; clicking it shows the window and sends `tag` back. */
  notify(n: { title: string; body: string; tag: string; silent?: boolean }): Promise<void>
  onNotificationClick(cb: (tag: string) => void): () => void
  /** The ICTTJ folder of this computer as read now (payouts and forecast goals, D72). */
  ictjState(): Promise<IctjSnapshot>
  /** The folder ICTTJ itself uses on this computer (only its path is read), to confirm; null = none found. */
  ictjSuggest(): Promise<string | null>
  /** A folder chosen in a dialog (not used yet); null = cancelled. */
  ictjPickDir(): Promise<string | null>
  /** Use this folder on this computer (null = none): it must hold ICTTJ's data; read and watched from now on. */
  ictjSetDir(dir: string | null): Promise<IctjSnapshot>
  /** Start ICTTJ (the chosen program, else the installed one); `ok: false` = not found – choose its .exe. */
  ictjOpen(): Promise<{ ok: boolean; message: string }>
  ictjProgram(): Promise<IctjProgram>
  /** Choose ICTTJ's .exe in a dialog ('pick'; cancelled = unchanged) or forget the choice ('clear'). */
  ictjPickExe(mode: 'pick' | 'clear'): Promise<IctjProgram>
  onIctj(cb: (snap: IctjSnapshot) => void): () => void
}

/** What the quick entry window shows (sent by the main window, which owns the data). */
export interface QuickData {
  categories: Array<{ id: string; label: string; mainId: string; envelope: 'daily' | 'planned' | null }>
  accounts: Array<{ id: string; name: string }>
  /** The account used last on this computer. */
  accountId: string
  /** Today's energy left (null = no plan this month) and the envelopes left. */
  energyLeft: number | null
  envelopesLeft: Record<string, number>
  quietHours: { from: string; to: string }
  impulseThreshold: number
  /** The officer: the category used last with a counterparty (its key) and the recent counterparties. */
  lastCategory: Record<string, string>
  counterparties: string[]
  /**
   * The household (D80): the active members, what each owes now (their money repays it first) and their advance (a
   * purchase they finance takes it first); `inflow` – what their money beyond their debt is by default; `via` – whom
   * their money comes through (D81: „w tym za …” at that member's money).
   */
  members: Array<{ id: string; name: string; owed: number; deposit: number; inflow: 'ask' | 'advance' | 'income'; via: string | null }>
  hideAmounts: boolean
  readOnly: boolean
}

export interface QuickResult {
  ok: boolean
  message: string
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
