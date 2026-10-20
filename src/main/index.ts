// adapted from ICTTJ src/main/index.ts @ 84a8339
// First: sizes the file thread pool before anything uses it (1.4.1).
import './threadpool'
import { existsSync, promises as fs } from 'node:fs'
import { hostname } from 'node:os'
import { basename, dirname, join, parse, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { BrowserWindow, Menu, Notification, app, dialog, globalShortcut, ipcMain, net, powerMonitor, safeStorage, screen, shell, type IpcMainInvokeEvent } from 'electron'
import { IMPORT_MAX_BYTES } from '@shared/import/text'
import { OPEN_ABORTED_MESSAGE, SLOW_FILE_MS, type AppInfo, type BackupInfo, type ChangeSet, type FlushResult, type HistoryKind, type HistoryReason, type OpenFolderResult, type OpenProgress, type OpenStep, type TrayPrefs } from '@shared/api'
import { SAVED, unsavedQuestion } from '@shared/unsaved'
import { COLLECTIONS, type Collection } from '@shared/paths'
import type { AnyRecord } from '@shared/records'
import type { SettingsFile } from '@shared/schema'
import { APP_TITLE, GITHUB_API, detectInstallMode, validUpdateToken, type UpdatePrefs, type UpdateTokenState } from '@shared/update'
import { ConfigStore, publicConfig } from './config'
import { ConflictCopyError, DataStore, RemovedOutsideError, SettingsFileError } from './datastore/store'
import { FolderWatcher, RefreshQueue } from './datastore/watch'
import { IN_USE_MS, clearPresence, readOtherMachines, writePresence } from './datastore/presence'
import { initLog, log } from './log'
import { importBackup, listBackups, manualBackup, runBackups, type DataSource } from './datastore/backup'
import { readBackupZip, unpackBackup, type BackupData } from './datastore/restore'
import { pathExists, sleep, withRetry, writeFileAtomic } from './datastore/atomic'
import { describeProgress, untilAborted } from './datastore/progress'
import { htmlToPdf } from './export/pdf'
import { writeXlsx } from './export/xlsx'
import type { XlsxSheet } from '@shared/export/xlsx'
import { Updater } from './update/updater'
import { startPortableSwap, startSilentInstaller } from './update/apply'
import { setupDetach } from './detach'
import { AppTray, HIDDEN_ARG, applyLoginItem } from './tray'
import { QuickEntry } from './quick'
import { isZoomKey, patchMachinePrefs, zoomByKey, type MachinePrefs } from '@shared/machine'
import { windowBounds } from '@shared/bounds'
import { warsawNow } from '@shared/calc/dates'
import { IctjSource } from './ictj/source'
import { BankFiles } from './bankFiles'
import { findIctjExe, suggestIctjDir } from './ictj/locate'

// Test hooks: isolated user data and a preselected data folder (no dialogs in E2E runs).
if (process.env.FI_USER_DATA) app.setPath('userData', process.env.FI_USER_DATA)

// One instance per app (the lock is tied to userData): a second window would autosave over the first one in the same
// data folder. Starting the app again just brings the open window to front.
const isPrimaryInstance = app.requestSingleInstanceLock()
if (!isPrimaryInstance) app.quit()

// Windows shows toasts only for a known AppUserModelId: the installer's Start Menu shortcut carries the appId of
// electron-builder.cjs; the portable copy has no shortcut, so its own exe path stands for the app (Electron's usual way).
if (process.platform === 'win32') app.setAppUserModelId(process.env.PORTABLE_EXECUTABLE_FILE ? process.execPath : 'app.financialintel.desktop')

const machineName = process.env.FI_MACHINE_NAME || hostname() || 'KOMPUTER'
const config = new ConfigStore(app.getPath('userData'), Number(process.env.FI_CONFIG_WRITE_DELAY_MS) || 0)
/** Name of the folder created for new data inside a chosen folder that holds other files. */
const DATA_FOLDER_NAME = 'FinancialIntel'

let mainWindow: BrowserWindow | null = null
let detach: { closeAll: () => void; windows: () => BrowserWindow[] } | null = null
let store: DataStore | null = null
let watcher: FolderWatcher | null = null
/** The open folder's refreshes, one at a time (W21). */
let refreshes: RefreshQueue | null = null
/** A full check on the window's focus at most this often (W21): the watcher reports changes, this catches a miss. */
const FOCUS_REFRESH_MS = 60_000
let lastFocusRefresh = 0
let presenceTimer: NodeJS.Timeout | null = null
/** This computer's presence file written last; in the tray (not in use) it is written this seldom (N20). */
let presenceWrittenAt = 0
const TRAY_PRESENCE_MS = 5 * 60_000
/** The last move in one of this computer's windows (D86): in use for 10 min after it. */
let activeAt = 0
/** What the main window was told last (`fi:inUse`); the moment it stops being in use is told when it comes. */
let toldInUse: boolean | null = null
let idleTimer: NodeJS.Timeout | null = null
let updater: Updater | null = null
let tray: AppTray | null = null
let quick: QuickEntry | null = null
let ictj: IctjSource | null = null
let bankFiles: BankFiles | null = null
/** Notifications shown and not closed yet (a dropped reference loses its click). */
const notifications = new Set<Notification>()
/** The app really quits (from the tray, an update, the system): closing the window then closes it, not hides it. */
let quitting = false
/** The main window is closing (its last writes on the way): no rescans start meanwhile (B43). */
let windowClosing = false
/** A renderer silent this long while closing is taken as unresponsive; one still saving gets at most the limit. */
const FLUSH_SILENT_MS = 4000
const FLUSH_LIMIT_MS = 60_000
/** Started hidden (with the system) from a maximized window: maximize when first shown – maximize() would show it now. */
let pendingMaximize = false
/** The system ends the session (logoff, shutdown) – no way back. */
let sessionEnding = false
/** How long a session-end query holds the "quit for real" state when no session-end follows (cancelled logoff). */
const SESSION_QUERY_MS = 30_000
/** A delay from the environment (test runs), else the default. */
const envMs = (name: string, fallback: number): number => {
  const v = Number(process.env[name])
  return process.env[name] != null && Number.isFinite(v) && v >= 0 ? v : fallback
}
/** First automatic update check after start (test runs shorten it). */
const updateCheckDelayMs = (): number => Number(process.env.FI_UPDATE_CHECK_DELAY_MS) || 15_000

const inUseNow = (): boolean => activeAt > 0 && Date.now() - activeAt < IN_USE_MS

/** The main window learns whether this computer is in use (its background writes and notifications go by it). */
function tellInUse(): void {
  const inUse = inUseNow()
  if (inUse === toldInUse || !mainWindow || mainWindow.isDestroyed()) return
  toldInUse = inUse
  mainWindow.webContents.send('fi:inUse', inUse)
}

/**
 * A move in one of the windows (D86, N20): the computer is in use – the others see it at once (its presence written
 * now), the main window resumes its background writes.
 */
function noteActivity(): void {
  const was = inUseNow()
  activeAt = Date.now()
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(tellInUse, IN_USE_MS + 1000)
  idleTimer.unref?.()
  if (was) return
  tellInUse()
  void heartbeat(true)
}

function showMainWindow(): void {
  noteActivity()
  if (!mainWindow || mainWindow.isDestroyed()) return
  inTray = false
  if (mainWindow.isMinimized()) mainWindow.restore()
  if (pendingMaximize) {
    pendingMaximize = false
    mainWindow.maximize()
  }
  mainWindow.show()
  mainWindow.focus()
}

/** Quit for real from the tray or for an update: the window closes through the usual flush path. */
function quitApp(): void {
  quitting = true
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close()
  else app.quit()
}

/** The tray's second line (today's energy) as the window sent it last – also while there is no icon (N99). */
let trayStatus: string | null = null
/** The window hidden in the tray (started with the system, or closed to it) – shown again by `showMainWindow`. */
let inTray = false
/** The update version a notification said is ready (N98). */
let readyNoticed: string | null = null

function appTray(): AppTray {
  if (tray) return tray
  tray = new AppTray({
    title: APP_TITLE,
    show: showMainWindow,
    quick: () => quick?.show(),
    today: () => {
      showMainWindow()
      mainWindow?.webContents.send('fi:notificationClick', 'today')
    },
    // Answered without showing the window (F13).
    evening: (answer) => mainWindow?.webContents.send('fi:notificationClick', `evening:${answer}`),
    quit: quitApp,
    updateReady: () => !!updater?.isReady,
    restartForUpdate: () => {
      updater?.requestRestart()
      quitApp()
    },
    log
  })
  tray.setStatus(trayStatus)
  return tray
}

/** Tray settings as the window shows them. */
function trayView(): TrayPrefs & { loginSupported: boolean } {
  return { ...config.get().tray, loginSupported: app.isPackaged && (process.platform === 'win32' || process.platform === 'darwin') }
}

/**
 * The proposed folder for new data (decision D62): `OneDrive\FinancialIntel` when OneDrive is set up on this
 * computer, otherwise `Dokumenty\FinancialIntel`. FI_DEFAULT_DATA_DIR in test runs.
 */
function defaultDataDir(): { dir: string; oneDrive: boolean } {
  const preset = process.env.FI_DEFAULT_DATA_DIR
  if (preset) return { dir: preset, oneDrive: true }
  const oneDrive = process.env.OneDrive || process.env.OneDriveConsumer || process.env.OneDriveCommercial
  if (oneDrive && existsSync(oneDrive)) return { dir: join(oneDrive, DATA_FOLDER_NAME), oneDrive: true }
  return { dir: join(app.getPath('documents'), DATA_FOLDER_NAME), oneDrive: false }
}

/** The GitHub token of this computer (only needed for a private repository); FI_UPDATE_TOKEN in tests. */
function updateToken(): string | null {
  const u = config.get().updates
  if (u.token) {
    if (!u.tokenEncrypted) return u.token
    try {
      return safeStorage.decryptString(Buffer.from(u.token, 'base64'))
    } catch {
      return null
    }
  }
  return process.env.FI_UPDATE_TOKEN?.trim() || null
}

function updateTokenState(): UpdateTokenState {
  const token = updateToken()
  return { present: !!token, hint: token ? `…${token.slice(-4)}` : null, encrypted: config.get().updates.tokenEncrypted }
}

/** Saves (or removes) the GitHub token of this computer, encrypted when the system allows it. */
async function saveUpdateToken(token: string | null): Promise<void> {
  const value = typeof token === 'string' ? token.trim() : ''
  if (value && !validUpdateToken(value)) throw new Error('Token GitHub ma niepoprawny format (litery, cyfry i „_”, np. github_pat_…).')
  const encrypt = !!value && safeStorage.isEncryptionAvailable()
  await config.updateUpdates({ token: value ? (encrypt ? safeStorage.encryptString(value).toString('base64') : value) : null, tokenEncrypted: encrypt })
}

/**
 * net.fetch with `redirect: 'manual'` (the token's request of a release file): net.fetch itself refuses that mode, and
 * following the redirect would send the Authorization header on to GitHub's file storage. A redirect is answered with
 * its status and Location; anything else is the response itself.
 */
function netFetchManual(url: string, init: { headers?: Record<string, string>; signal?: AbortSignal }): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = net.request({ url, method: 'GET', redirect: 'manual' })
    for (const [k, v] of Object.entries(init.headers ?? {})) req.setHeader(k, v)
    const onAbort = () => {
      req.abort()
      reject(new Error('aborted'))
    }
    if (init.signal?.aborted) return onAbort()
    init.signal?.addEventListener('abort', onAbort, { once: true })
    req.on('redirect', (status, _method, redirectUrl) => {
      req.abort()
      init.signal?.removeEventListener('abort', onAbort)
      resolve(new Response(null, { status, headers: { location: redirectUrl } }))
    })
    req.on('response', (res) => {
      // An abort while the body streams (a stalled download) cancels the transfer, which ends the stream with an error.
      res.on('end', () => init.signal?.removeEventListener('abort', onAbort))
      const headers = new Headers()
      for (const [k, v] of Object.entries(res.headers)) headers.set(k, Array.isArray(v) ? v.join(', ') : String(v))
      resolve(new Response(Readable.toWeb(res as unknown as Readable) as ReadableStream, { status: res.statusCode, headers }))
    })
    req.on('error', (e) => {
      init.signal?.removeEventListener('abort', onAbort)
      reject(e)
    })
    req.end()
  })
}

function createUpdater(): Updater {
  const portableFile = process.env.PORTABLE_EXECUTABLE_FILE || null
  const uninstaller = join(dirname(process.execPath), `Uninstall ${app.getName()}.exe`)
  // Test hook: a local release server instead of api.github.com (also allows plain http).
  const override = process.env.FI_UPDATE_URL?.replace(/\/+$/, '') || null
  const { mode, note } = detectInstallMode({
    platform: process.platform,
    isPackaged: app.isPackaged,
    portableFile: portableFile ?? undefined,
    uninstallerExists: existsSync(uninstaller)
  })
  return new Updater({
    currentVersion: app.getVersion(),
    mode,
    modeNote: note,
    portableFile,
    userDataDir: app.getPath('userData'),
    fetch: (url, init) => (init?.redirect === 'manual' ? netFetchManual(url, init) : net.fetch(url, init)),
    apiBase: override ?? GITHUB_API,
    allowInsecure: !!override,
    prefs: () => config.get().updates.prefs,
    savePrefs: (prefs: UpdatePrefs) => config.updateUpdates({ prefs }).then(() => undefined),
    token: updateToken,
    tokenState: updateTokenState,
    pending: () => config.get().updates.pending,
    savePending: (pending) => config.updateUpdates({ pending }).then(() => undefined),
    lastRunVersion: () => config.get().updates.lastRunVersion,
    saveLastRunVersion: (lastRunVersion) => config.updateUpdates({ lastRunVersion }).then(() => undefined),
    applyPortable: startPortableSwap,
    applyInstaller: startSilentInstaller,
    // The portable launcher (parent process) keeps its exe open until the app exits.
    waitPids: [process.pid, process.ppid],
    appProcess: parse(process.execPath).name,
    log,
    onState: (state) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('fi:update', state)
      tray?.refresh()
      // Ready while the window lives in the tray (N98): closing it installs nothing – said once a version.
      const v = state.phase === 'ready' ? state.release?.version : undefined
      if (v && v !== readyNoticed && inTray) {
        readyNoticed = v
        systemNotify('Aktualizacja czeka', `Wersja ${v} jest pobrana – zainstaluje się po „Zakończ” albo „Uruchom ponownie i zaktualizuj” w menu ikony przy zegarze.`, 'update')
      }
    }
  })
}

/** The ICTTJ folder of this computer, read only (D60, D72); its snapshots go to the main window, which owns the budget. */
function ictjSource(): IctjSource {
  ictj ??= new IctjSource({
    onSnapshot: (snap) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('fi:ictj', snap)
    },
    log
  })
  return ictj
}

/** New files of mBank in the downloads (F14): their changes to the main window. */
function bankFilesWatch(): BankFiles {
  bankFiles ??= new BankFiles({
    onChange: (files) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('fi:bankFiles', files)
    },
    log: (line) => log('info', line),
    pollMs: Number(process.env.FI_BANK_FILES_POLL_MS) || undefined
  })
  return bankFiles
}

/** The folders watched for files of mBank (F14): Pobrane (FI_DOWNLOADS_DIR in test runs) and the import's last folder. */
function watchBankFiles(): void {
  if (!config.get().prefs.bankFiles) return bankFilesWatch().setDirs([])
  const downloads = process.env.FI_DOWNLOADS_DIR || app.getPath('downloads')
  const last = config.get().importDir
  bankFilesWatch().setDirs([{ dir: downloads, label: 'Pobrane' }, ...(last ? [{ dir: last, label: basename(last) || last }] : [])])
}

/** The ICTTJ folder chosen on this computer (FI_ICTJ_DIR in test runs). */
const ictjDirOf = (): string | null => process.env.FI_ICTJ_DIR || config.get().ictj.dir

function send(change: ChangeSet | null): void {
  if (!change) return
  // The window not showing this folder yet (B31): its snapshot is older than the change – sent once it does.
  if (shownGeneration !== storeGeneration) {
    unshown.push(change)
    return
  }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('fi:change', change)
}

/** A write's changes, only while its folder is still the open one: the window never gets the previous folder's records (B31). */
function sendFrom(s: DataStore, change: ChangeSet | null): void {
  if (s === store) send(change)
}

async function trash(absPath: string): Promise<void> {
  try {
    await shell.trashItem(absPath)
  } catch {
    // Removable or network drives may have no recycle bin; a file held for a moment (OneDrive, an antivirus) – retried
    // (`fs.rm` retries only recursive removals by itself).
    await withRetry(() => fs.rm(absPath, { force: true }))
  }
}

/** The daily backup in progress (one at a time). */
let backupRun: Promise<void> | null = null
/** How often the daily backup is checked while the app runs – it lives in the tray for weeks (F2, N19). */
const BACKUP_CHECK_MS = 60 * 60_000

/**
 * The data for a backup the folder's state of now: a full check first (what another computer changed and the watcher
 * has not reported yet goes in too), then the ZIP from the store (W7).
 */
function checkedData(s: DataStore): DataSource {
  return {
    zipData: async (out) => {
      if (store === s) await refreshes?.request().catch(() => undefined)
      return s.zipData(out)
    }
  }
}

/**
 * The last daily backup that did not come (B123): Ustawienia → Kopie say it; cleared by the next one made. Several days
 * without a backup – one notification a day.
 */
let backupFailure: { at: string; message: string; dir: string } | null = null
/** Since when the daily backups of the folder fail without a break (a success, or another folder, clears it). */
let backupFailingSince: number | null = null
let backupNoticeDay: string | null = null
const BACKUP_STALE_DAYS = 3

/** Today's backup if it is not there yet (D31): after an open, every hour and when the computer wakes up. */
function dailyBackup(): void {
  const s = store
  if (!s || backupRun || opening || windowClosing || s.status().readOnly) return
  backupRun = runBackups(checkedData(s), s.backupsDir)
    .then(
      (file) => {
        if (s === store) backupSucceeded()
        if (file) log('info', `backup ${file}`)
      },
      async (e) => {
        log('warn', 'backup failed', e)
        if (s !== store) return
        backupFailure = { at: new Date().toISOString(), message: e instanceof Error ? e.message : String(e), dir: s.backupsDir }
        backupFailingSince ??= Date.now()
        await noticeStaleBackups(s)
      }
    )
    .finally(() => {
      backupRun = null
    })
}

/** A backup made (daily or by hand): the warning of the failed ones goes. */
function backupSucceeded(): void {
  backupFailure = null
  backupFailingSince = null
}

/**
 * Backups failing for days (a backup folder on a drive unplugged for weeks – B123): said once a day, not only logged. The
 * newest backup seen – or, none to be seen (the folder away, a new subfolder), the failures lasting – 3 days at least.
 */
async function noticeStaleBackups(s: DataStore): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  if (backupNoticeDay === today) return
  const files = (await listBackups(s.backupsDir).catch(() => [])).filter((f) => f.kind !== 'pre-migration')
  const newest = files.length ? Math.max(...files.map((f) => f.mtimeMs)) : null
  const days = newest == null ? null : Math.floor((Date.now() - newest) / 86_400_000)
  const failingDays = backupFailingSince == null ? 0 : (Date.now() - backupFailingSince) / 86_400_000
  if (days != null ? days < BACKUP_STALE_DAYS : failingDays < BACKUP_STALE_DAYS) return
  backupNoticeDay = today
  systemNotify('Kopie zapasowe nie powstają', `${days == null ? `Kopie dzienne nie powstają od ${Math.floor(failingDays)} dni` : `Ostatnia kopia: ${days} dni temu`} – folder kopii jest niedostępny. Ustawienia → Folder i kopie.`, 'backups')
}

/** The longest quitting waits for the writes already queued (B43). */
const QUIT_DRAIN_MS = 30_000

async function closeStore(): Promise<void> {
  // Detach everything first: an open that switches meanwhile is never undone by this close resuming later.
  const closing = store
  watcher?.stop()
  watcher = null
  refreshes = null
  if (presenceTimer) clearInterval(presenceTimer)
  presenceTimer = null
  store = null
  if (!closing) return
  // The writes the window sent before closing finish first (a rescan ahead of them in the queue takes seconds – B43).
  const drained = await Promise.race([closing.idle().then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), QUIT_DRAIN_MS).unref?.())])
  if (!drained) log('warn', `zamykanie: zapisy trwały ponad ${QUIT_DRAIN_MS / 1000} s`)
  await clearPresence(closing.root, machineName).catch(() => undefined)
}

async function heartbeat(force = false): Promise<void> {
  tellInUse()
  const s = store
  if (!s) return
  try {
    // In use: every minute; only in the tray: every 5 minutes – OneDrive is not woken all night for it (N20).
    if (!s.status().readOnly && (force || inUseNow() || Date.now() - presenceWrittenAt >= TRAY_PRESENCE_MS)) {
      presenceWrittenAt = Date.now()
      await writePresence(s.root, machineName, app.getVersion(), activeAt ? new Date(activeAt).toISOString() : null).catch(() => undefined)
    }
    // Another folder opened meanwhile (B116): nothing of the closed one goes on – its presence cleared stays cleared; the
    // same folder opened again keeps the presence its new store wrote.
    if (s !== store) return void (store?.root === s.root ? undefined : await clearPresence(s.root, machineName).catch(() => undefined))
    const others = await readOtherMachines(s.root, machineName)
    if (s !== store) return
    if (JSON.stringify(others) !== JSON.stringify(s.otherMachines)) {
      s.otherMachines = others
      await refreshes?.request([])
    }
  } catch (e) {
    log('warn', 'heartbeat failed', e)
  }
}

/** The open in progress (1.4.1): „Przerwij” aborts it, a new open replaces it – until its folder is read. */
let opening: AbortController | null = null
/** Every open counts up: an older one that finished reading gives way to a newer one instead of switching folders. */
let openGeneration = 0
/** Test hooks (E2E of the progress screen): every file read waits so long; a read this long is slow. */
const OPEN_DELAY_MS = Number(process.env.FI_OPEN_DELAY_MS) || 0
const OPEN_SLOW_MS = Number(process.env.FI_OPEN_SLOW_MS) || undefined
/** Progress to the window this often; a line to the log this often while an open takes long. */
const PROGRESS_MS = 250
const PROGRESS_LOG_MS = 10_000
/** The other computers' heartbeats are a nicety: an open never waits for them longer than this. */
const MACHINES_WAIT_MS = 2000

const sameDir = (a: string, b: string): boolean => {
  const n = (p: string) => resolve(p).replace(/[\\/]+$/, '')
  return process.platform === 'linux' ? n(a) === n(b) : n(a).toLowerCase() === n(b).toLowerCase()
}

/** This computer's data folder now or before (B53): found empty or missing, it gets no new data unasked. */
const rememberedDir = (dir: string): boolean => [config.get().dataDir, ...config.get().recentDirs].some((d) => !!d && sameDir(d, dir))

/** A backup of the list (F3): only a ZIP the backups folder holds is read. */
async function listedBackup(s: DataStore, path: string): Promise<BackupInfo> {
  const listed = (await listBackups(s.backupsDir)).find((f) => f.path === path)
  if (!listed) throw new Error('Tej kopii nie ma już na liście kopii (mogła zostać usunięta) – odśwież listę.')
  return listed
}

/**
 * The backup taken back (F3): read once for its preview, kept for the records chosen from it – for 10 minutes at most
 * (a large folder's backup is a lot of memory), and not after the recovery.
 */
let backupRead: { path: string; mtimeMs: number; data: BackupData } | null = null
const BACKUP_KEPT_MS = 10 * 60_000

async function backupData(s: DataStore, path: string): Promise<BackupData> {
  const listed = await listedBackup(s, path)
  if (backupRead?.path === path && backupRead.mtimeMs === listed.mtimeMs) return backupRead.data
  const data = await readBackupZip(path)
  const read = { path, mtimeMs: listed.mtimeMs, data }
  backupRead = read
  setTimeout(() => {
    if (backupRead === read) backupRead = null
  }, BACKUP_KEPT_MS).unref()
  return data
}

async function openFolder(dir: string, createIfEmpty: boolean, force = false): Promise<OpenFolderResult> {
  opening?.abort()
  const controller = new AbortController()
  opening = controller
  const generation = ++openGeneration
  const superseded = (): OpenFolderResult => {
    log('warn', `open superseded ${dir}: a newer open took over`)
    return { ok: false, reason: 'aborted', dir, message: OPEN_ABORTED_MESSAGE }
  }
  const signal = controller.signal
  const t0 = Date.now()
  let step: OpenStep = 'inspect'
  let next: DataStore | null = null
  const progress = (): OpenProgress => {
    const p = step === 'machines' || step === 'inspect' ? null : next?.progress()
    return {
      dir,
      step: p?.step ?? step,
      done: p?.done ?? 0,
      total: p?.total ?? 0,
      waiting: p?.waiting ?? null,
      slow: p?.slow ?? 0,
      slowMs: OPEN_SLOW_MS ?? SLOW_FILE_MS,
      elapsedMs: Date.now() - t0
    }
  }
  let lastLog = t0
  const report = () => {
    const p = progress()
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('fi:openProgress', p)
    if (Date.now() - lastLog >= PROGRESS_LOG_MS) {
      lastLog = Date.now()
      log('info', `open progress ${dir}: ${describeProgress(p, p.elapsedMs)}`)
    }
  }
  const ticker = setInterval(report, PROGRESS_MS)
  log('info', `open start ${dir}`)
  try {
    report()
    let target = dir
    let kind = await untilAborted(DataStore.inspect(target), signal)
    if (kind === 'ictj' || (await untilAborted(insideIctj(dir), signal))) {
      return { ok: false, reason: 'not-data', problem: 'ictj', message: 'To folder danych ICT Trade Journal – Financial Intel nigdy w nim nie zapisuje. Wybierz inny folder.' }
    }
    // A folder of other files gets a FinancialIntel subfolder – not the proposal itself (already named so) and not a
    // folder of FI data whose fi.json has not arrived yet.
    if (kind === 'other' && createIfEmpty && basename(dir) !== DATA_FOLDER_NAME) {
      target = join(dir, DATA_FOLDER_NAME)
      kind = await untilAborted(DataStore.inspect(target), signal)
    }
    if (kind === 'partial' || (kind === 'other' && createIfEmpty)) {
      return {
        ok: false,
        reason: 'not-data',
        dir: target,
        problem: kind,
        remembered: rememberedDir(target),
        message:
          kind === 'partial'
            ? 'W tym folderze są już dane Financial Intel, ale bez pliku fi.json – OneDrive pewnie jeszcze go pobiera. Poczekaj chwilę i spróbuj ponownie (nowe dane nie są tworzone, żeby nie rozdzielić budżetu).'
            : `Folder ${DATA_FOLDER_NAME} zawiera inne pliki – wybierz pusty folder.`
      }
    }
    if (kind === 'unavailable') {
      return {
        ok: false,
        reason: 'not-data',
        dir: target,
        problem: kind,
        remembered: rememberedDir(target),
        message: 'Folder danych jest teraz niedostępny (np. OneDrive jeszcze się nie uruchomił, dysk nie jest gotowy albo brak dostępu). Spróbuj ponownie albo wskaż inny folder.'
      }
    }
    if (kind === 'missing' || kind === 'empty') {
      // The remembered folder found empty or missing is most likely not synced yet: new data there would split the
      // budget when OneDrive brings the old one – only with the user's confirmation (B53).
      const remembered = rememberedDir(target)
      if (!createIfEmpty || (remembered && !force)) {
        return {
          ok: false,
          reason: 'not-data',
          dir: target,
          problem: kind,
          remembered,
          message: remembered
            ? kind === 'empty'
              ? 'Zapamiętany folder danych jest pusty – OneDrive mógł go jeszcze nie pobrać. Spróbuj ponownie za chwilę; nowe dane twórz tu tylko, gdy budżet ma zacząć się od nowa.'
              : 'Zapamiętany folder danych jest niedostępny (np. OneDrive jeszcze się nie uruchomił albo dysk jest odłączony). Spróbuj ponownie albo wskaż inny folder.'
            : kind === 'empty'
              ? 'Folder jest pusty – można w nim utworzyć nowe dane.'
              : 'Tego folderu nie ma. Wskaż inny folder.'
        }
      }
      signal.throwIfAborted()
      await DataStore.initialize(target)
    } else if (kind === 'other') {
      return {
        ok: false,
        reason: 'not-data',
        dir,
        problem: kind,
        subfolder: join(dir, DATA_FOLDER_NAME),
        message: `W tym folderze nie ma danych Financial Intel (fi.json). Można utworzyć w nim podfolder „${DATA_FOLDER_NAME}”.`
      }
    }
    next = new DataStore(target, { machineName, trash, backupDir: config.get().backupDirOverride, log })
    step = 'list'
    // Open the new folder first: if it fails or is stopped, the current one stays open and keeps saving. Once read
    // (before a migration) it no longer stops: „Przerwij” would promise an untouched folder.
    const commit = () => {
      if (opening === controller) opening = null
    }
    const snapshot = await untilAborted(next.open({ signal, readDelayMs: OPEN_DELAY_MS, slowMs: OPEN_SLOW_MS, onCommit: commit }), signal)
    commit()
    step = 'machines'
    const others = await Promise.race([readOtherMachines(target, machineName).catch(() => []), sleep(MACHINES_WAIT_MS).then(() => [])])
    if (generation !== openGeneration) return superseded()
    await closeStore()
    // A newer open may have closed the store meanwhile: it switches, this one gives way. From here on no await until
    // the watcher and the heartbeat are set, so two opens never interleave.
    if (generation !== openGeneration) return superseded()
    const opened = next
    store = opened
    // Another folder: its own backups – the failures of the one before are not its (the same folder keeps them).
    if (backupFailure?.dir !== opened.backupsDir) backupSucceeded()
    snapshot.generation = ++storeGeneration
    unshown = []
    opened.otherMachines = others
    snapshot.status = opened.status()
    const queue = new RefreshQueue(async (paths) => {
      // Closing: no rescan before the last writes (B43); another folder opened meanwhile: nothing to read here.
      if (store !== opened || windowClosing) return
      try {
        // A refresh finishing after another folder opened is that folder's no more (B31).
        sendFrom(opened, await opened.refresh(paths))
      } catch (e) {
        log('error', 'refresh failed', e)
        throw e
      }
    })
    refreshes = queue
    watcher = new FolderWatcher(target, (paths) => void queue.request(paths ?? undefined).catch(() => undefined), {
      onError: (e, repeated) => log('warn', `watcher error${repeated ? ` (i ${repeated} kolejnych od poprzedniego wpisu)` : ''}`, e)
    })
    watcher.start()
    void heartbeat(true)
    presenceTimer = setInterval(() => void heartbeat(), 60_000)
    // Daily backup (decision D31), in the background.
    dailyBackup()
    // The folder is open from here on: remembering it failing must not report the open as failed – the window would
    // keep the previous folder while main writes to this one (B31).
    await config.rememberDir(target).catch((e) => log('warn', `remember ${target} failed`, e))
    const count = Object.values(snapshot.records).reduce((n, list) => n + list.length, 0)
    const st = opened.loadStats
    const times = st ? ` (list ${st.listMs} ms, read ${st.readMs} ms of ${st.files} files, ${st.slow} slow, migrate ${st.migrateMs} ms)` : ''
    log('info', `opened ${target}: ${count} records, ${snapshot.problems.length} problems, ${snapshot.conflicts.length} conflicts, ${snapshot.loadMs} ms${times}`)
    if (st?.slowest.length && st.slowest[0]!.ms >= 1000) log('info', `open slowest files: ${st.slowest.map((f) => `${f.relPath} ${f.ms} ms`).join(', ')}`)
    return { ok: true, snapshot }
  } catch (e) {
    if (signal.aborted) {
      log('warn', `open aborted ${dir}: ${describeProgress(progress(), Date.now() - t0)}`)
      return { ok: false, reason: 'aborted', dir, message: OPEN_ABORTED_MESSAGE }
    }
    log('error', `open failed ${dir}: ${describeProgress(progress(), Date.now() - t0)}`, e)
    // fi.json not readable now (the start with Windows before OneDrive) or broken (B109): a retry, or its history.
    if (e instanceof SettingsFileError && e.kind !== 'too-new') {
      const target = next?.root ?? dir
      return e.kind === 'unreadable'
        ? {
            ok: false,
            reason: 'not-data',
            dir: target,
            problem: 'settings-unreadable',
            remembered: rememberedDir(target),
            message: 'Plik fi.json jest teraz niedostępny – OneDrive pewnie jeszcze się nie uruchomił albo dopiero go pobiera. Aplikacja spróbuje ponownie sama za chwilę.'
          }
        : {
            ok: false,
            reason: 'not-data',
            dir: target,
            problem: 'settings-broken',
            remembered: rememberedDir(target),
            message: `Plik fi.json jest uszkodzony (${e.message.replace(/^Nie można wczytać fi\.json: /, '')}). Ostatnią dobrą wersję ustawień można wziąć z historii zmian – uszkodzony plik zostanie obok jako kopia.`
          }
    }
    return { ok: false, reason: 'error', dir, message: openErrorMessage(e) }
  } finally {
    clearInterval(ticker)
    if (opening === controller) opening = null
  }
}

/**
 * A folder's open failure for the screen: the app's own messages as they are; a system's (an error code) or the
 * runtime's (English, e.g. a stack overflow – B50) said in Polish, the details in the log.
 */
function openErrorMessage(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e)
  const foreign = !(e instanceof Error) || (e as NodeJS.ErrnoException).code != null || e instanceof RangeError || e instanceof TypeError || e instanceof SyntaxError || e instanceof ReferenceError
  return foreign ? `Nie udało się wczytać folderu danych (${message}). Szczegóły są w logu – „Otwórz folder logów”.` : message
}

/**
 * The folder or one of its parents up to the drive is an ICT Trade Journal data folder (journal.json). Only the file is
 * looked for – a parent that may not be listed (a network share – B120) is no ICTTJ folder, never an error.
 */
async function insideIctj(dir: string): Promise<boolean> {
  for (let d = dirname(dir), prev = dir; d !== prev; prev = d, d = dirname(d)) if (await pathExists(join(d, 'journal.json'))) return true
  return false
}

function requireStore(): DataStore {
  if (!store) throw new Error('Nie wybrano folderu danych.')
  return store
}

/** Every folder opened counts up; the window says which one it shows (B31). */
let storeGeneration = 0
let shownGeneration = 0
/** The open folder's changes from before the window showed it. */
let unshown: ChangeSet[] = []

/**
 * The folder a write from the window may go to (B31): only the one the window shows – a write sent for the previous
 * folder while another one was opening is refused, never written into the new one.
 */
function writableStore(): DataStore {
  const s = requireStore()
  if (shownGeneration !== storeGeneration) throw new Error('Trwa otwieranie innego folderu – zmiana nie została zapisana.')
  return s
}

function requireUpdater(): Updater {
  if (!updater) throw new Error('Moduł aktualizacji nie jest gotowy.')
  return updater
}

/** A bank's export is small (a year of operations ≈ 100 KB); anything far bigger is not one. */

function handle<A extends unknown[], R>(channel: string, fn: (...args: A) => Promise<R> | R): void {
  ipcMain.handle(`fi:${channel}`, async (_e: IpcMainInvokeEvent, ...args: unknown[]) => {
    try {
      return await fn(...(args as A))
    } catch (e) {
      log('error', channel, e)
      throw e
    }
  })
}

function registerIpc(): void {
  registerRendererSteps()
  handle(
    'appInfo',
    (): AppInfo => ({
      version: app.getVersion(),
      machineName,
      platform: process.platform,
      userDataDir: app.getPath('userData'),
      freeze: { afterOpenMs: envMs('FI_FREEZE_AFTER_OPEN_MS', 3 * 60_000), quietMs: envMs('FI_FREEZE_QUIET_MS', 60_000) }
    })
  )
  handle('reportActivity', () => noteActivity())
  handle('inUseNow', () => inUseNow())
  // The renderer needs the recent folders; the GitHub token stays here.
  handle('getConfig', () => publicConfig(config.get()))
  handle('loadCurrent', async (): Promise<OpenFolderResult | null> => {
    const preset = process.env.FI_DATA_DIR
    // This computer's settings not readable yet (B114): its folder is not known – no first-run screen pretending it is.
    if (config.loadFailed && !preset) {
      return {
        ok: false,
        reason: 'error',
        message: `Ustawienia tego komputera (config.json) są chwilowo niedostępne – pewnie trzyma je antywirus albo program kopii. Nic nie zostało nadpisane; aplikacja spróbuje ponownie sama za chwilę. (${config.loadFailed})`
      }
    }
    const dir = preset || config.get().dataDir
    // A window loaded again (its renderer crashed – W37): the folder open here, kept current by the watcher, is given
    // from memory – never read from the disk again while the old copy waits. Its changes wait for the new window's
    // snapshot (a new generation, B31).
    const open = store
    if (dir && open && !opening && sameDir(open.root, dir)) {
      const generation = ++storeGeneration
      unshown = []
      const snapshot = await open.snapshot()
      if (open === store && generation === storeGeneration) {
        snapshot.generation = generation
        snapshot.status = open.status()
        log('info', `window loaded again: ${open.root} from memory`)
        return { ok: true, snapshot }
      }
    }
    // The tests' folder (FI_DATA_DIR) is meant for new data whatever this computer remembers.
    if (preset) return openFolder(preset, true, true)
    return dir ? openFolder(dir, false) : null
  })
  handle('repairSettings', async (dir: string): Promise<OpenFolderResult> => {
    if ((await DataStore.inspect(dir)) !== 'data') return { ok: false, reason: 'error', dir, message: 'W tym folderze nie ma pliku fi.json.' }
    const at = await DataStore.repairSettings(dir, machineName)
    if (!at) return { ok: false, reason: 'error', dir, message: 'W historii zmian nie ma poprawnej wersji ustawień. Rozpakuj ostatnią kopię zapasową (backups/daily w folderze danych) do pustego folderu i otwórz go.' }
    log('warn', `fi.json uszkodzony – wzięty z historii (${at}) w ${dir}`)
    return openFolder(dir, false)
  })
  handle('defaultDataDir', () => defaultDataDir())
  handle('pickDataDir', async (mode: 'open' | 'create'): Promise<OpenFolderResult> => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: mode === 'create' ? 'Wybierz folder na nowe dane' : 'Wskaż folder z danymi Financial Intel',
      properties: ['openDirectory', 'createDirectory', 'promptToCreate']
    })
    const dir = res.filePaths[0]
    if (res.canceled || !dir) return { ok: false, reason: 'cancelled', message: '' }
    return openFolder(dir, mode === 'create')
  })
  handle('openDataDir', (dir: string, createIfEmpty: boolean, force?: boolean) => openFolder(dir, createIfEmpty, force === true))
  handle('cancelOpen', () => {
    opening?.abort()
  })
  // The window shows this folder now (B31): its writes are taken from here on.
  handle('folderShown', (generation: number) => {
    if (generation !== storeGeneration || generation === shownGeneration) return
    shownGeneration = generation
    const waiting = unshown
    unshown = []
    for (const change of waiting) send(change)
  })
  handle('saveRecord', async (collection: Collection, record: never) => {
    const s = writableStore()
    try {
      const { entry, change } = await s.saveRecord(collection, record)
      sendFrom(s, change)
      return entry
    } catch (e) {
      // Removed on another computer a moment ago (B49): the window gets the removal (its question), the write waits.
      // Its month made on another computer (B46): the copy shows in Synchronizacja.
      if (e instanceof RemovedOutsideError || e instanceof ConflictCopyError) sendFrom(s, e.change)
      throw e
    }
  })
  handle('saveRecords', async (collection: Collection, records: never[]) => {
    const s = writableStore()
    const { results, changes } = await s.saveRecords(collection, records)
    for (const change of changes) sendFrom(s, change)
    return results
  })
  handle('deleteRecords', async (collection: Collection, ids: string[], reason?: unknown) => {
    const s = writableStore()
    // 'drop' (no version in the history) only for the imports' batches: never the user's records.
    const { results, change } = await s.deleteRecords(collection, ids, reason === 'undo' ? 'undo' : reason === 'drop' && collection === 'imports' ? 'drop' : 'delete')
    sendFrom(s, change)
    return results
  })
  handle('deleteRecord', async (collection: Collection, id: string) => {
    const s = writableStore()
    sendFrom(s, await s.deleteRecord(collection, id))
  })
  handle('historyList', (kind: HistoryKind, id: string) => requireStore().historyList(kind, id))
  handle('historyRead', (kind: HistoryKind, id: string, file: string) => requireStore().historyRead(kind, id, file))
  handle('historyDeleted', (collection: Collection) => requireStore().historyDeleted(collection))
  handle('historyKeep', (kind: HistoryKind, record: unknown, reason: HistoryReason) => writableStore().historyKeep(kind, record, reason))
  handle('historyRestore', async (kind: HistoryKind, id: string, file: string) => {
    const s = writableStore()
    const { change, fi } = await s.historyRestore(kind, id, file)
    sendFrom(s, change)
    // Restored settings go back to the caller (they are not part of a change set's upserts).
    return fi
  })
  handle('saveSettings', async (fi: never) => {
    const s = writableStore()
    const { fi: saved, change } = await s.writeSettings(fi)
    sendFrom(s, change)
    return saved
  })
  handle('resolveConflict', async (id: string, keep: 'canonical' | 'copy') => {
    const s = writableStore()
    sendFrom(s, await s.resolveConflict(id, keep))
  })
  handle('mergeConflict', async (id: string, merged: unknown, seen?: unknown) => {
    const s = writableStore()
    const sides = seen && typeof seen === 'object' ? (seen as { canonical?: unknown; copy?: unknown }) : {}
    const asOf = typeof sides.canonical === 'number' && typeof sides.copy === 'number' ? { canonical: sides.canonical, copy: sides.copy } : undefined
    sendFrom(s, await s.mergeConflict(id, merged, asOf))
  })
  handle('resolveConflicts', async (items: Array<{ id: string; keep: 'canonical' | 'copy'; group?: string }>) => {
    const s = writableStore()
    const { results, change } = await s.resolveConflicts(items)
    sendFrom(s, change)
    return results
  })
  handle('trashProblemFile', async (rel: string) => {
    const s = writableStore()
    sendFrom(s, await s.trashFile(rel))
  })
  handle('showInFolder', async (rel: string | null) => {
    const s = requireStore()
    if (!rel) {
      await shell.openPath(s.root)
      return
    }
    shell.showItemInFolder(s.abs(rel))
  })
  handle('trayPrefs', () => trayView())
  handle('setTrayPrefs', async (patch: Partial<Pick<TrayPrefs, 'closeToTray' | 'launchAtLogin' | 'autostartAsked'>>) => {
    const cur = config.get().tray
    const next: TrayPrefs = {
      ...cur,
      ...(typeof patch?.closeToTray === 'boolean' ? { closeToTray: patch.closeToTray } : {}),
      // The start with Windows set or answered here: chosen on this computer, never asked again (N100).
      ...(typeof patch?.launchAtLogin === 'boolean' ? { launchAtLogin: patch.launchAtLogin, autostartAsked: true } : {}),
      ...(patch?.autostartAsked === true ? { autostartAsked: true } : {})
    }
    await config.update({ tray: next })
    const view = trayView()
    applyLoginItem(view, log)
    if (view.closeToTray) appTray().ensure()
    else tray?.destroy()
    log('info', `zasobnik: zamykaj do zasobnika ${view.closeToTray ? 'tak' : 'nie'}, z systemem ${next.launchAtLogin ? 'tak' : 'nie'}`)
    return view
  })
  handle('openLogs', async () => {
    const dir = join(app.getPath('userData'), 'logs')
    await fs.mkdir(dir, { recursive: true })
    const err = await shell.openPath(dir)
    if (err) throw new Error(err)
  })
  handle('openExternal', async (url: string) => {
    if (!/^https:\/\//i.test(url)) throw new Error('Można otwierać tylko adresy https://')
    await shell.openExternal(url)
  })
  handle('rescan', async () => {
    await refreshes?.request()
  })
  handle('exportZip', async () => {
    const s = requireStore()
    const res = await dialog.showSaveDialog(mainWindow!, {
      // The Warsaw date, as the daily backups and the rest of the app (N33) – not the UTC one before 2 a.m.
      defaultPath: `Financial-Intel-${warsawNow().date}.zip`,
      filters: [{ name: 'ZIP', extensions: ['zip'] }]
    })
    if (res.canceled || !res.filePath) return null
    await s.zipData(res.filePath, { history: true })
    return res.filePath
  })
  // Exports (E8): a file the user names – CSV, Excel, PDF of a report (the window prints it, nothing else loads).
  handle('saveTextFile', async (name: string, content: string, filter: { name: string; extensions: string[] }) => {
    const res = await dialog.showSaveDialog(mainWindow!, { defaultPath: name, filters: [filter] })
    if (res.canceled || !res.filePath) return null
    await writeFileAtomic(res.filePath, content)
    return res.filePath
  })
  handle('saveXlsx', async (name: string, sheets: XlsxSheet[]) => {
    const res = await dialog.showSaveDialog(mainWindow!, { defaultPath: name, filters: [{ name: 'Excel', extensions: ['xlsx'] }] })
    if (res.canceled || !res.filePath) return null
    await writeXlsx(res.filePath, sheets)
    return res.filePath
  })
  handle('savePdf', async (name: string, html: string) => {
    const res = await dialog.showSaveDialog(mainWindow!, { defaultPath: name, filters: [{ name: 'PDF', extensions: ['pdf'] }] })
    if (res.canceled || !res.filePath) return null
    await writeFileAtomic(res.filePath, await htmlToPdf(html))
    return res.filePath
  })
  handle('listBackups', async () => {
    const s = requireStore()
    return { dir: s.backupsDir, files: await listBackups(s.backupsDir), failure: backupFailure?.dir === s.backupsDir ? backupFailure : null }
  })
  handle('backupNow', async () => {
    const s = requireStore()
    const file = await manualBackup(checkedData(s), s.backupsDir)
    // A backup made in the folder of the failed ones: the warning goes (B123).
    if (s === store && backupFailure?.dir === s.backupsDir) backupSucceeded()
    return file
  })
  handle('importBackup', async () => {
    const s = writableStore()
    return importBackup(s, s.backupsDir)
  })
  handle('backupPreview', async (path: string) => {
    const s = requireStore()
    return { path, ...(await s.compareBackup(await backupData(s, path))) }
  })
  handle('backupRecover', async (path: string, picks: Array<{ collection: Collection; id: string }>, settings: boolean) => {
    const s = writableStore()
    const data = await backupData(s, path)
    const items: Array<{ kind: Collection; record: AnyRecord }> = []
    const byId = new Map<Collection, Map<string, AnyRecord>>()
    for (const p of Array.isArray(picks) ? picks : []) {
      if (!COLLECTIONS.includes(p.collection) || p.collection === 'imports') continue
      let ids = byId.get(p.collection)
      if (!ids) byId.set(p.collection, (ids = new Map(data.records[p.collection].map((r) => [r.id, r]))))
      const record = ids.get(p.id)
      if (record) items.push({ kind: p.collection, record })
    }
    const { change, fi, done, failed } = await s.restoreVersions(items, settings === true ? data.fi : null)
    backupRead = null
    sendFrom(s, change)
    log('info', `backup recover ${basename(path)}: ${done.length} records${fi ? ' + settings' : ''}${failed.length ? `, ${failed.length} failed` : ''}`)
    return { fi, done, failed }
  })
  handle('putVersions', async (items: Array<{ collection: Collection; record: AnyRecord }>, fi: unknown) => {
    const s = writableStore()
    const list = (Array.isArray(items) ? items : []).filter((i) => COLLECTIONS.includes(i.collection) && i.collection !== 'imports' && !!i.record)
    const { change, fi: written, done, failed } = await s.restoreVersions(
      list.map((i) => ({ kind: i.collection, record: i.record })),
      fi ? (fi as SettingsFile) : null
    )
    sendFrom(s, change)
    return { fi: written, done, failed }
  })
  handle('backupToFolder', async (path: string) => {
    const s = requireStore()
    const listed = await listedBackup(s, path)
    const dir = await unpackBackup(path, s.root, listed.mtimeMs)
    log('info', `backup unpacked ${basename(path)} -> ${dir}`)
    return openFolder(dir, false)
  })
  handle('pickImportFile', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Plik CSV z mBanku (lista operacji albo historia rachunku)',
      properties: ['openFile'],
      filters: [
        { name: 'CSV z banku', extensions: ['csv', 'txt'] },
        { name: 'Wszystkie pliki', extensions: ['*'] }
      ]
    })
    const path = res.canceled ? undefined : res.filePaths[0]
    if (!path) return null
    const st = await fs.stat(path)
    if (st.size > IMPORT_MAX_BYTES) throw new Error(`Plik ma ${Math.round(st.size / 1024 / 1024)} MB – to nie wygląda na wyciąg z banku (limit ${IMPORT_MAX_BYTES / 1024 / 1024} MB).`)
    // Its folder is watched for the next files of mBank (F14) – unless it is Pobrane already.
    const dir = dirname(path)
    if (dir !== config.get().importDir) {
      await config.update({ importDir: dir }).catch((e) => log('warn', 'folder importu – zapis nie udał się', e))
      watchBankFiles()
    }
    return { name: basename(path), bytes: new Uint8Array(await fs.readFile(path)), ref: bankFilesWatch().register(path) }
  })
  handle('bankFiles', () => bankFilesWatch().files)
  handle('readBankFile', (id: unknown) => (typeof id === 'string' ? bankFilesWatch().read(id) : null))
  handle('trashBankFile', async (id: unknown) => {
    // A file gone already (deleted in Explorer): nothing to move – said so, not an error (F14).
    const path = typeof id === 'string' ? await bankFilesWatch().pathOf(id) : null
    if (!path) return false
    await withRetry(() => shell.trashItem(path), 5)
    log('info', `plik z banku przeniesiony do Kosza: ${basename(path)}`)
    bankFilesWatch().refresh()
    return true
  })
  handle('setBackupDir', async (mode: 'pick' | 'default') => {
    const s = requireStore()
    let dir: string | null = null
    if (mode === 'pick') {
      const res = await dialog.showOpenDialog(mainWindow!, { title: 'Folder na kopie zapasowe (na tym komputerze)', properties: ['openDirectory', 'createDirectory', 'promptToCreate'] })
      if (res.canceled || !res.filePaths[0]) return s.backupsDir
      dir = res.filePaths[0]
      // Financial Intel never writes in ICT Trade Journal's data folder (B121) – its backups neither.
      if ((await DataStore.inspect(dir)) === 'ictj' || (await insideIctj(dir))) throw new Error('To folder danych ICT Trade Journal – Financial Intel nigdy w nim nie zapisuje. Wybierz inny folder na kopie.')
    }
    await config.update({ backupDirOverride: dir })
    s.setBackupDir(dir)
    return s.backupsDir
  })
  handle('showPath', async (abs: string) => {
    shell.showItemInFolder(abs)
  })
  handle('updateState', () => requireUpdater().getState())
  handle('checkForUpdates', () => requireUpdater().check(true))
  handle('downloadUpdate', () => requireUpdater().download())
  handle('installUpdateNow', async () => {
    const u = requireUpdater()
    if (!u.isReady) throw new Error('Aktualizacja nie jest jeszcze pobrana.')
    u.requestRestart()
    // The usual close path: flush in the renderer, close the folder, then will-quit applies the update.
    quitApp()
  })
  handle('setUpdatePrefs', (prefs: Partial<UpdatePrefs>) => requireUpdater().setPrefs(prefs, updateCheckDelayMs()))
  handle('setUpdateToken', async (token: string | null) => {
    await saveUpdateToken(token)
    log('info', `update token ${token ? 'saved' : 'removed'}${token && !config.get().updates.tokenEncrypted ? ' (no system encryption)' : ''}`)
    return requireUpdater().tokenChanged()
  })
  handle('dismissUpdateNotice', () => requireUpdater().dismissNotice())
  handle('setMachinePrefs', (patch: unknown) => changePrefs(patch))
  // A key of the size (F30): the step from the size this process has – a window's copy may not have another window's
  // change yet (T300: Ctrl+Plus in the main window, at once Ctrl+Minus in the quick entry).
  handle('zoomBy', (key: unknown) => {
    const prefs = config.get().prefs
    const zoom = isZoomKey(key) ? zoomByKey(prefs.zoom, key) : prefs.zoom
    return zoom === prefs.zoom ? prefs : changePrefs({ zoom })
  })
  // „Pokaż na 5 minut” / „Pokaż do końca sesji” (F40): the amounts shown, hidden again then – or not by idleness till the quit.
  handle('revealAmounts', (minutes: unknown) => {
    // Shown already: a showing for a while has nothing to hide later – and a running one goes on as it was.
    if (!config.get().prefs.hideAmounts && typeof minutes === 'number') return config.get().prefs
    clearReveal()
    if (typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0) {
      revealTimer = setTimeout(() => {
        revealTimer = null
        hideAmountsNow('koniec pokazania')
      }, Math.min(minutes, 240) * 60_000)
    } else revealedForSession = true
    return changePrefs({ hideAmounts: false })
  })
  handle('setTrayStatus', (text: unknown) => {
    // Kept also without the icon (N99): one made later (closing to the tray turned on) shows today's energy at once.
    trayStatus = typeof text === 'string' && text ? text.slice(0, 200) : null
    tray?.setStatus(trayStatus)
  })
  handle('ictjState', () => ictjSource().snapshot)
  // Only the path from ICTTJ's own config.json (FI_ICTJ_APPDATA in test runs).
  handle('ictjSuggest', () => suggestIctjDir(process.env.FI_ICTJ_APPDATA || app.getPath('appData')))
  handle('ictjPickDir', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, { title: 'Folder danych ICT Trade Journal (tylko do odczytu)', properties: ['openDirectory'] })
    return res.canceled ? null : (res.filePaths[0] ?? null)
  })
  handle('ictjSetDir', async (dir: unknown) => {
    const next = typeof dir === 'string' && dir ? dir : null
    if (next) {
      const kind = await DataStore.inspect(next)
      if (kind === 'data') throw new Error('To folder danych Financial Intel – wskaż folder ICT Trade Journal.')
      if (kind !== 'ictj') throw new Error('W tym folderze nie ma danych ICT Trade Journal (brak pliku journal.json).')
    }
    await config.update({ ictj: { ...config.get().ictj, dir: next } })
    log('info', `ICTTJ: folder ${next ? 'wybrany' : 'wyłączony'}`)
    return ictjSource().setDir(next)
  })
  handle('ictjProgram', () => findIctjExe(config.get().ictj.exe))
  handle('ictjPickExe', async (mode: 'pick' | 'clear') => {
    if (mode === 'clear') await config.update({ ictj: { ...config.get().ictj, exe: null } })
    else {
      const res = await dialog.showOpenDialog(mainWindow!, {
        title: 'Program ICT Trade Journal (plik .exe)',
        properties: ['openFile'],
        filters: [
          { name: 'Program', extensions: ['exe'] },
          { name: 'Wszystkie pliki', extensions: ['*'] }
        ]
      })
      const exe = res.canceled ? undefined : res.filePaths[0]
      if (exe) await config.update({ ictj: { ...config.get().ictj, exe } })
    }
    return findIctjExe(config.get().ictj.exe)
  })
  handle('ictjOpen', async () => {
    const { exe } = await findIctjExe(config.get().ictj.exe)
    if (!exe) return { ok: false, message: 'Nie znaleziono ICT Trade Journal na tym komputerze – wskaż jego plik .exe (wersja portable) w Ustawienia → ICTTJ.' }
    // Test runs: the program is only named, not started.
    if (process.env.FI_ICTJ_LAUNCH === 'dry') {
      log('info', `ICTTJ: start ${exe} (próba)`)
      return { ok: true, message: exe }
    }
    const err = await shell.openPath(exe)
    if (err) return { ok: false, message: `Nie udało się uruchomić ICT Trade Journal: ${err}` }
    log('info', 'ICTTJ uruchomiony')
    return { ok: true, message: exe }
  })
  handle('notify', (n: { title?: unknown; body?: unknown; tag?: unknown; silent?: unknown }) => systemNotify(String(n?.title ?? APP_TITLE), String(n?.body ?? ''), String(n?.tag ?? ''), n?.silent === true))
}

/** A system notification; its click shows the window on what it is about (`tag`, the window's `openTag`). */
function systemNotify(title: string, body: string, tag: string, silent = false): void {
  if (!Notification.isSupported()) return
  const note = new Notification({ title: title.slice(0, 120), body: body.slice(0, 500), silent })
  note.on('click', () => {
    showMainWindow()
    mainWindow?.webContents.send('fi:notificationClick', tag)
  })
  note.on('close', () => notifications.delete(note))
  notifications.add(note)
  note.show()
}

/** Every window of the app: the main one, the quick entry, the detached panels. */
const appWindows = (): BrowserWindow[] => [mainWindow, ...(quick?.windows() ?? []), ...(detach?.windows() ?? [])].filter((w): w is BrowserWindow => !!w && !w.isDestroyed())

/** The preferences of this computer to every window of the app (the main one, the quick entry, detached panels). */
function broadcastPrefs(prefs: MachinePrefs): void {
  for (const w of appWindows()) w.webContents.send('fi:machinePrefs', prefs)
}

/**
 * This computer's preferences changed (a window, a key of the size, the idleness): in memory, applied and told to every
 * window at once, then saved – a write waits for the ones before it (a slow disk), and windows told only after it would
 * show older preferences meanwhile, one after another (T300). The answer: the preferences after the write (the newest).
 */
async function changePrefs(patch: unknown): Promise<MachinePrefs> {
  const before = config.get().prefs
  const prefs = patchMachinePrefs(before, patch)
  const p = patch && typeof patch === 'object' ? (patch as Partial<MachinePrefs>) : {}
  // Hidden by hand (or by the end of a showing): the idleness hides them again from the next showing on (F40) – at the
  // change, not after its write: a showing asked meanwhile (a slow disk) is newer and stays.
  if (p.hideAmounts === true) clearReveal()
  const saved = config.update({ prefs })
  // Awaited after the changes below – a failure of one of them must not leave the write's failure unheard of.
  saved.catch(() => undefined)
  // The shortcut registered again only when it was set (also the same one: a retry after another program let it go).
  if ('quickShortcut' in p) {
    quick?.applyShortcut(prefs.quickShortcut)
    if (quick) quick.replaced = null
  }
  if (prefs.zoom !== before.zoom) applyZoom()
  if (prefs.bankFiles !== before.bankFiles) watchBankFiles()
  broadcastPrefs(prefs)
  await saved
  return config.get().prefs
}

/** The size of this computer (F30) on every window – the quick entry's grows with it. */
function applyZoom(): void {
  const zoom = config.get().prefs.zoom
  for (const w of appWindows()) w.webContents.setZoomFactor(zoom)
  quick?.rescale()
}

/**
 * Every window of the app (F30): its size after each load (a reload starts at 100 %). The keys of the size are each
 * window's (`installZoomKeys`) – the preferences bring the size to all of them.
 */
function prepareWindow(win: BrowserWindow): void {
  win.webContents.on('did-finish-load', () => {
    if (!win.isDestroyed()) win.webContents.setZoomFactor(config.get().prefs.zoom)
  })
}

/** „Pokaż na N minut” (F40): the amounts hidden again at this time. */
let revealTimer: ReturnType<typeof setTimeout> | null = null
/** „Pokaż do końca sesji” (F40): no hiding by idleness until the app quits. */
let revealedForSession = false

function clearReveal(): void {
  if (revealTimer) clearTimeout(revealTimer)
  revealTimer = null
  revealedForSession = false
}

/** „Startuj z ukrytymi kwotami” done this run (F40): once, with this computer's settings read. */
let startHideDone = false

async function hideOnStart(): Promise<void> {
  if (startHideDone) return
  startHideDone = true
  const p = config.get().prefs
  if (!p.hideOnStart || p.hideAmounts) return
  log('info', 'kwoty ukryte: start aplikacji')
  await changePrefs({ hideAmounts: true }).catch((e) => log('warn', 'ukrycie kwot przy starcie – zapis nie udał się', e))
}

function hideAmountsNow(why: string): void {
  if (config.get().prefs.hideAmounts) return
  log('info', `kwoty ukryte: ${why}`)
  void changePrefs({ hideAmounts: true }).catch((e) => log('warn', 'ukrycie kwot – zapis ustawień nie udał się', e))
}

/** How often the idleness is looked at (F40). */
const IDLE_CHECK_MS = Number(process.env.FI_IDLE_CHECK_MS) || 15_000
/** The system's idle seconds – fixed in test runs (`FI_SYSTEM_IDLE`). */
const systemIdleSeconds = (): number => (process.env.FI_SYSTEM_IDLE != null ? Number(process.env.FI_SYSTEM_IDLE) : powerMonitor.getSystemIdleTime())

/**
 * The amounts hidden by themselves (F40, not a lock – D30): after the minutes of idleness this computer set (never while
 * they are shown for a while or for the session), or the screen locked.
 */
function watchIdleAmounts(): void {
  setInterval(() => {
    const p = config.get().prefs
    if (p.hideIdleMin > 0 && !p.hideAmounts && !revealTimer && !revealedForSession && systemIdleSeconds() >= p.hideIdleMin * 60) hideAmountsNow(`${p.hideIdleMin} min bez ruchu`)
  }, IDLE_CHECK_MS).unref?.()
  // A locked screen hides them whatever was shown before – also „do końca sesji” (hiding ends every showing).
  powerMonitor.on('lock-screen', () => {
    if (config.get().prefs.hideIdleMin > 0) hideAmountsNow('ekran zablokowany')
  })
}

/** The long computation each window started last and has not finished (1.4.1): names a hang in the log. */
const rendererSteps = new Map<number, { name: string; at: number }>()
/** Log a computation of the window this long or longer. */
const RENDERER_STEP_LOG_MS = 500
/** The window not answering this long after Chromium noticed: tell the user (once per hang). */
const HANG_NOTICE_MS = 10_000

function registerRendererSteps(): void {
  ipcMain.on('fi:step', (e, name: unknown, ms: unknown) => {
    if (typeof name !== 'string') return
    const id = e.sender.id
    if (typeof ms !== 'number') {
      rendererSteps.set(id, { name, at: Date.now() })
      return
    }
    if (rendererSteps.get(id)?.name === name) rendererSteps.delete(id)
    if (ms >= RENDERER_STEP_LOG_MS) log('info', `window ${name} ${Math.round(ms)} ms`)
  })
}

/** A window that stops answering (a long computation) leaves a line in the log and, after a while, a message. */
function watchHangs(win: BrowserWindow): void {
  const id = win.webContents.id
  const stepText = () => {
    const step = rendererSteps.get(id)
    return step ? `, last step ${step.name} started ${Math.round((Date.now() - step.at) / 1000)} s ago` : ''
  }
  let since = 0
  let timer: NodeJS.Timeout | null = null
  const reset = () => {
    since = 0
    if (timer) clearTimeout(timer)
    timer = null
  }
  win.on('unresponsive', () => {
    if (since) return
    since = Date.now()
    log('warn', `window unresponsive${stepText()}`)
    timer = setTimeout(() => {
      timer = null
      if (win.isDestroyed()) return
      const step = rendererSteps.get(id)
      log('warn', `window still unresponsive after ${Math.round((Date.now() - since) / 1000)} s${stepText()}`)
      void dialog
        .showMessageBox({
          type: 'warning',
          title: APP_TITLE,
          message: 'Okno Financial Intel nie odpowiada',
          detail: `Aplikacja coś liczy albo się zawiesiła${step ? ` (etap: ${step.name})` : ''}. Szczegóły są w logu – folder logów można otworzyć poniżej. Jeśli to się powtarza, prześlij plik main.log.`,
          buttons: ['Czekaj', 'Otwórz folder logów'],
          defaultId: 0,
          cancelId: 0,
          noLink: true
        })
        .then(({ response }) => {
          if (response === 1) void shell.openPath(join(app.getPath('userData'), 'logs'))
        })
    }, HANG_NOTICE_MS)
  })
  win.on('responsive', () => {
    if (!since) return
    log('info', `window responsive again after ${Math.round((Date.now() - since) / 1000)} s`)
    reset()
  })
  // A renderer that died or reloaded while hung never says 'responsive': start over, forget its step.
  win.webContents.on('render-process-gone', () => {
    reset()
    rendererSteps.delete(id)
  })
  win.webContents.on('did-start-loading', () => rendererSteps.delete(id))
  win.on('closed', () => {
    reset()
    rendererSteps.delete(id)
  })
}

function createWindow(): void {
  const saved = config.get().window
  // Closed on a monitor that is not here now: centred on the primary one instead of off every screen (B54).
  const bounds = windowBounds(saved, screen.getAllDisplays().map((d) => d.workArea), screen.getPrimaryDisplay().workArea)
  const win = new BrowserWindow({
    ...bounds,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#0b0d10',
    title: APP_TITLE,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  })
  mainWindow = win
  prepareWindow(win)
  // Started with the system: stay hidden in the tray (decision D46). A maximized window waits for its first show:
  // maximize() of a hidden window shows it on Windows.
  const startHidden = process.argv.includes(HIDDEN_ARG)
  pendingMaximize = !!saved?.maximized
  if (pendingMaximize && !startHidden) {
    pendingMaximize = false
    win.maximize()
  }
  win.once('ready-to-show', () => {
    if (startHidden && appTray().ensure()) {
      inTray = true
      log('info', 'start w zasobniku (uruchomienie z systemem)')
    }
    else showMainWindow()
  })

  const devUrl = process.env.ELECTRON_RENDERER_URL
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (e, url) => {
    if (!devUrl || !url.startsWith(devUrl)) e.preventDefault()
  })

  let allowClose = false
  let closing = false
  win.on('close', (e) => {
    if (allowClose) return
    e.preventDefault()
    if (closing) return
    // "Zamykaj do zasobnika": the window only hides; reminders and notifications keep working.
    if (!quitting && config.get().tray.closeToTray && appTray().ensure()) {
      const b = win.getNormalBounds()
      void config.update({ window: { ...b, maximized: win.isMaximized() || pendingMaximize } })
      win.hide()
      inTray = true
      log('info', 'okno ukryte w zasobniku')
      if (!config.get().tray.notified) {
        appTray().notifyHidden()
        void config.update({ tray: { ...config.get().tray, notified: true } })
      }
      return
    }
    closing = true
    windowClosing = true
    const b = win.getNormalBounds()
    // Started in the tray and never shown (B119): its maximize is still to come – kept for the next start.
    void config.update({ window: { ...b, maximized: win.isMaximized() || pendingMaximize } })
    const finish = (result: FlushResult) => {
      clearTimeout(timeout)
      clearTimeout(limit)
      ipcMain.removeListener('fi:flushed', onFlushed)
      ipcMain.removeListener('fi:flushing', onFlushing)
      if (allowClose || win.isDestroyed()) return
      if (!result.saved) {
        // The renderer keeps unsaved changes; closing now would lose them. The question says why (B108) – the window
        // is shown for it (closed from the tray), and a waiting decision's dialog is open in it already. The log says
        // it too: the question holds the main process until it is answered.
        log('warn', `zamykanie: niezapisane zmiany (decyzje: ${result.waiting}, nowsza wersja: ${result.newer}, błąd: ${result.error ?? 'brak'})`)
        if (!win.isVisible() || win.isMinimized()) showMainWindow()
        const choice = dialog.showMessageBoxSync(win, { type: 'warning', ...unsavedQuestion(result), buttons: ['Anuluj', 'Zamknij mimo to'], defaultId: 0, cancelId: 0 })
        if (choice === 0) {
          closing = false
          windowClosing = false
          quitting = false
          updater?.cancelRestart()
          return
        }
      }
      allowClose = true
      win.close()
    }
    const onFlushed = (_e: Electron.IpcMainEvent, result?: FlushResult) => finish(result ?? SAVED)
    // An unresponsive renderer must not keep the window open forever; one still saving (it says so every second)
    // gets time – up to a minute, then the question (B43).
    let timeout = setTimeout(() => finish(SAVED), FLUSH_SILENT_MS)
    const onFlushing = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => finish(SAVED), FLUSH_SILENT_MS)
    }
    const limit = setTimeout(() => finish({ saved: false, waiting: 0, newer: 0, error: 'zapis trwa ponad minutę' }), FLUSH_LIMIT_MS)
    ipcMain.on('fi:flushed', onFlushed)
    ipcMain.on('fi:flushing', onFlushing)
    win.webContents.send('fi:flush')
  })
  win.on('focus', () => {
    noteActivity()
    // No full rescan while closing: it would stand before the last writes (B43); at most once a minute (W21).
    if (windowClosing || Date.now() - lastFocusRefresh < FOCUS_REFRESH_MS) return
    lastFocusRefresh = Date.now()
    void refreshes?.request().catch(() => undefined)
  })
  watchHangs(win)
  // Shutdown / log-off (Windows): no installer or swap helper now, the update waits for the next close.
  // Shutdown also closes for real when the window would go to the tray.
  win.on('query-session-end', () => {
    const was = quitting
    quitting = true
    updater?.postponeInstall()
    // Only a query: another application can cancel the logoff. Without session-end the window closes to the tray again.
    if (!was)
      setTimeout(() => {
        if (!sessionEnding && !win.isDestroyed()) quitting = false
      }, SESSION_QUERY_MS).unref?.()
  })
  win.on('session-end', () => {
    sessionEnding = true
    quitting = true
    updater?.postponeInstall()
  })
  win.on('closed', () => {
    mainWindow = null
    // Detached panels and the quick entry belong to the main window (and would keep the app running).
    detach?.closeAll()
    quick?.destroy()
  })
  // A reloaded renderer knows nothing about windows opened before.
  win.webContents.on('did-finish-load', () => detach?.closeAll())

  detach ??= setupDetach({
    main: () => mainWindow,
    preload: join(__dirname, '../preload/index.js'),
    devUrl: devUrl ?? null,
    load: (child, key) => {
      prepareWindow(child)
      return devUrl ? child.loadURL(`${devUrl}?detached=${encodeURIComponent(key)}`) : child.loadFile(join(__dirname, '../renderer/index.html'), { query: { detached: key } })
    }
  })

  if (devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

// A second start with the system (an old autostart entry – B52) leaves the window in the tray; any other shows it.
app.on('second-instance', (_e, argv) => {
  if (!argv.includes(HIDDEN_ARG)) showMainWindow()
})

// app.quit() from anywhere (the system, the updater): windows close for real, not to the tray.
app.on('before-quit', () => {
  quitting = true
})

/** config.json read again while it is not readable (B114) – this often. */
const CONFIG_RETRY_MS = Number(process.env.FI_CONFIG_RETRY_MS) || 15_000

/** Reads config.json again until it is readable; then this computer's settings take effect and the window may open its folder. */
function retryConfig(): void {
  const timer = setInterval(() => {
    void config.load().then(() => {
      if (config.loadFailed) return
      clearInterval(timer)
      log('info', 'config.json odczytany ponownie – ustawienia tego komputera wczytane')
      applyLoginItem(trayView(), log)
      if (config.get().tray.closeToTray) appTray().ensure()
      else tray?.destroy()
      quick?.applyShortcut(config.get().prefs.quickShortcut)
      void ictjSource().setDir(ictjDirOf())
      watchBankFiles()
      // The checks of updates as this computer set them (the defaults ran meanwhile).
      updater?.startAuto(updateCheckDelayMs())
      broadcastPrefs(config.get().prefs)
      void hideOnStart()
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('fi:configReady')
    })
  }, CONFIG_RETRY_MS)
  timer.unref?.()
}

app.whenReady().then(async () => {
  if (!isPrimaryInstance) return
  Menu.setApplicationMenu(null)
  initLog(app.getPath('userData'))
  log('info', `start v${app.getVersion()} on ${machineName}`)
  await config.load()
  if (config.setAside) log('warn', `config.json uszkodzony – odłożony jako ${config.setAside}, ustawienia domyślne`)
  if (config.loadFailed) {
    log('warn', `config.json nieczytelny: ${config.loadFailed} – nic nie jest nadpisywane, ponowna próba co ${CONFIG_RETRY_MS / 1000} s`)
    retryConfig()
  }
  // „Startuj z ukrytymi kwotami” (F40): before the first window reads the preferences – or when config.json is read later.
  if (!config.loadFailed) await hideOnStart()
  updater = createUpdater()
  registerIpc()
  void ictjSource().setDir(ictjDirOf())
  watchBankFiles()
  // The autostart only from a config.json read (B114): defaults in its place would remove the entry.
  if (!config.loadFailed) applyLoginItem(trayView(), log)
  // The tray icon is there from the start while closing hides to it: the app is reachable after the first close.
  if (config.get().tray.closeToTray) appTray().ensure()
  createWindow()
  quick = new QuickEntry({
    main: () => mainWindow,
    preload: join(__dirname, '../preload/index.js'),
    devUrl: process.env.ELECTRON_RENDERER_URL ?? null,
    load: (w) => {
      prepareWindow(w)
      return process.env.ELECTRON_RENDERER_URL ? w.loadURL(`${process.env.ELECTRON_RENDERER_URL}?quick=1`) : w.loadFile(join(__dirname, '../renderer/index.html'), { query: { quick: '1' } })
    },
    zoom: () => config.get().prefs.zoom,
    log
  })
  quick.applyShortcut(config.get().prefs.quickShortcut)
  // A shortcut that took a Polish letter (AltGr – B29) is the default now: saved, and the window says so once.
  if (config.replacedShortcut) {
    quick.replaced = config.replacedShortcut
    log('warn', `skrót szybkiego wpisu ${config.replacedShortcut} zabierał polską literę (AltGr) – zamieniony na ${config.get().prefs.quickShortcut}`)
    void config.update({ prefs: config.get().prefs }).catch((e) => log('warn', 'zapis skrótu – nie udało się', e))
  }
  // Created hidden a moment after the start: the shortcut then shows it at once.
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) quick?.ensure()
  }, 3000).unref?.()
  tray?.refresh()
  // The daily backup also while the app lives in the tray (F2): every hour and after the computer slept.
  setInterval(dailyBackup, BACKUP_CHECK_MS).unref?.()
  powerMonitor.on('resume', dailyBackup)
  watchIdleAmounts()
  const u = updater
  void u.init().then(
    () => u.startAuto(updateCheckDelayMs()),
    (e) => log('warn', 'update init failed', e)
  )
})

app.on('window-all-closed', () => {
  log('info', 'zamykanie: okno zamknięte')
  tray?.destroy()
  ictj?.stop()
  quitting = true
  void closeStore()
    .catch(() => undefined)
    .finally(() => app.quit())
})

// Last step of quitting (data flushed, folder closed): a downloaded update is installed now; the
// installer / swap helper finishes after this process has exited.
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  updater?.applyOnQuit()
  log('info', 'koniec pracy')
})

// Why the application died: a log that ends without „koniec pracy” means the process was killed from outside – these
// lines name what the process itself still saw.
process.on('uncaughtException', (e) => log('error', 'nieobsłużony wyjątek w procesie głównym', e))
process.on('unhandledRejection', (reason) => log('error', 'nieobsłużone odrzucenie w procesie głównym', reason))
let lastRendererReload = 0
app.on('render-process-gone', (_e, contents, details) => {
  const main = mainWindow && !mainWindow.isDestroyed() && contents === mainWindow.webContents
  log('error', `okno przestało działać (${main ? 'główne' : 'inne'}): ${details.reason}, kod ${details.exitCode}`)
  // The main window after a crash of its renderer (e.g. out of memory): load the app again, at most once a minute.
  if (main && details.reason !== 'clean-exit' && details.reason !== 'killed' && Date.now() - lastRendererReload > 60_000) {
    lastRendererReload = Date.now()
    mainWindow?.webContents.reload()
  }
})
app.on('child-process-gone', (_e, details) => log('warn', `proces pomocniczy zakończył się: ${details.type} ${details.name ?? ''} ${details.reason}, kod ${details.exitCode}`))
