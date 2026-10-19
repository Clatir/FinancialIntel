// adapted from ICTTJ src/main/index.ts @ 84a8339
// First: sizes the file thread pool before anything uses it (1.4.1).
import './threadpool'
import { existsSync, promises as fs } from 'node:fs'
import { hostname } from 'node:os'
import { basename, dirname, join, parse, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { BrowserWindow, Menu, Notification, app, clipboard, dialog, globalShortcut, ipcMain, net, powerMonitor, safeStorage, screen, shell, type IpcMainInvokeEvent } from 'electron'
import { OPEN_ABORTED_MESSAGE, SLOW_FILE_MS, type AppInfo, type ChangeSet, type HistoryKind, type HistoryReason, type OpenFolderResult, type OpenProgress, type OpenStep, type TrayPrefs } from '@shared/api'
import type { Collection } from '@shared/paths'
import { APP_TITLE, GITHUB_API, detectInstallMode, validUpdateToken, type UpdatePrefs, type UpdateTokenState } from '@shared/update'
import { ConfigStore, publicConfig } from './config'
import { ConflictCopyError, DataStore, RemovedOutsideError } from './datastore/store'
import { FolderWatcher, RefreshQueue } from './datastore/watch'
import { clearPresence, readOtherMachines, writePresence } from './datastore/presence'
import { initLog, log } from './log'
import { importBackup, listBackups, manualBackup, runBackups, type DataSource } from './datastore/backup'
import { sleep, withRetry, writeFileAtomic } from './datastore/atomic'
import { describeProgress, untilAborted } from './datastore/progress'
import { htmlToPdf } from './export/pdf'
import { writeXlsx } from './export/xlsx'
import type { XlsxSheet } from '@shared/export/xlsx'
import { Updater } from './update/updater'
import { startPortableSwap, startSilentInstaller } from './update/apply'
import { setupDetach } from './detach'
import { AppTray, HIDDEN_ARG, applyLoginItem } from './tray'
import { QuickEntry } from './quick'
import { patchMachinePrefs, type MachinePrefs } from '@shared/machine'
import { windowBounds } from '@shared/bounds'
import { IctjSource } from './ictj/source'
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
const config = new ConfigStore(app.getPath('userData'))
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
let updater: Updater | null = null
let tray: AppTray | null = null
let quick: QuickEntry | null = null
let ictj: IctjSource | null = null
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
/** First automatic update check after start (test runs shorten it). */
const updateCheckDelayMs = (): number => Number(process.env.FI_UPDATE_CHECK_DELAY_MS) || 15_000

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
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

function appTray(): AppTray {
  tray ??= new AppTray({
    title: APP_TITLE,
    show: showMainWindow,
    quick: () => quick?.show(),
    today: () => {
      showMainWindow()
      mainWindow?.webContents.send('fi:notificationClick', 'today')
    },
    quit: quitApp,
    updateReady: () => !!updater?.isReady,
    restartForUpdate: () => {
      updater?.requestRestart()
      quitApp()
    },
    log
  })
  return tray
}

/** Tray settings as the window shows them. */
function trayView(): TrayPrefs & { loginSupported: boolean } {
  return { ...config.get().tray, loginSupported: app.isPackaged && (process.platform === 'win32' || process.platform === 'darwin') }
}

/**
 * The proposed folder for new data (decision E0-2): `OneDrive\FinancialIntel` when OneDrive is set up on this
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

/** The ICTTJ folder chosen on this computer (FI_ICTJ_DIR in test runs). */
const ictjDirOf = (): string | null => process.env.FI_ICTJ_DIR || config.get().ictj.dir

function send(change: ChangeSet | null): void {
  if (change && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('fi:change', change)
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

/** Today's backup if it is not there yet (D31): after an open, every hour and when the computer wakes up. */
function dailyBackup(): void {
  const s = store
  if (!s || backupRun || opening || windowClosing || s.status().readOnly) return
  backupRun = runBackups(checkedData(s), s.backupsDir)
    .then(
      (file) => void (file && log('info', `backup ${file}`)),
      (e) => log('warn', 'backup failed', e)
    )
    .finally(() => {
      backupRun = null
    })
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

async function heartbeat(): Promise<void> {
  const s = store
  if (!s) return
  try {
    if (!s.status().readOnly) await writePresence(s.root, machineName, app.getVersion()).catch(() => undefined)
    const others = await readOtherMachines(s.root, machineName)
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
    next = new DataStore(target, { machineName, trash, backupDir: config.get().backupDirOverride })
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
    opened.otherMachines = others
    snapshot.status = opened.status()
    const queue = new RefreshQueue(async (paths) => {
      // Closing: no rescan before the last writes (B43); another folder opened meanwhile: nothing to read here.
      if (store !== opened || windowClosing) return
      try {
        send(await opened.refresh(paths))
      } catch (e) {
        log('error', 'refresh failed', e)
        throw e
      }
    })
    refreshes = queue
    watcher = new FolderWatcher(target, (paths) => void queue.request(paths ?? undefined).catch(() => undefined), {
      onError: (e) => log('warn', 'watcher error', e)
    })
    watcher.start()
    void heartbeat()
    presenceTimer = setInterval(() => void heartbeat(), 60_000)
    // Daily backup (decision D31), in the background.
    dailyBackup()
    await config.rememberDir(target)
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

/** The folder or one of its parents up to the drive is an ICT Trade Journal data folder (journal.json). */
async function insideIctj(dir: string): Promise<boolean> {
  for (let d = dirname(dir), prev = dir; d !== prev; prev = d, d = dirname(d)) if ((await DataStore.inspect(d)) === 'ictj') return true
  return false
}

function requireStore(): DataStore {
  if (!store) throw new Error('Nie wybrano folderu danych.')
  return store
}

function requireUpdater(): Updater {
  if (!updater) throw new Error('Moduł aktualizacji nie jest gotowy.')
  return updater
}

/** A bank's export is small (a year of operations ≈ 100 KB); anything far bigger is not one. */
const IMPORT_MAX_BYTES = 20 * 1024 * 1024

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
      isPortable: !!process.env.PORTABLE_EXECUTABLE_DIR
    })
  )
  // The renderer needs the recent folders; the GitHub token stays here.
  handle('getConfig', () => publicConfig(config.get()))
  handle('loadCurrent', async () => {
    const preset = process.env.FI_DATA_DIR
    // The tests' folder (FI_DATA_DIR) is meant for new data whatever this computer remembers.
    if (preset) return openFolder(preset, true, true)
    const dir = config.get().dataDir
    return dir ? openFolder(dir, false) : null
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
  handle('saveRecord', async (collection: Collection, record: never) => {
    const s = requireStore()
    try {
      const { entry, change } = await s.saveRecord(collection, record)
      send(change)
      return entry
    } catch (e) {
      // Removed on another computer a moment ago (B49): the window gets the removal (its question), the write waits.
      // Its month made on another computer (B46): the copy shows in Synchronizacja.
      if (e instanceof RemovedOutsideError || e instanceof ConflictCopyError) send(e.change)
      throw e
    }
  })
  handle('saveRecords', async (collection: Collection, records: never[]) => {
    const { results, changes } = await requireStore().saveRecords(collection, records)
    for (const change of changes) send(change)
    return results
  })
  handle('deleteRecords', async (collection: Collection, ids: string[], reason?: unknown) => {
    // 'drop' (no version in the history) only for the imports' batches: never the user's records.
    const { results, change } = await requireStore().deleteRecords(collection, ids, reason === 'undo' ? 'undo' : reason === 'drop' && collection === 'imports' ? 'drop' : 'delete')
    send(change)
    return results
  })
  handle('deleteRecord', async (collection: Collection, id: string) => {
    send(await requireStore().deleteRecord(collection, id))
  })
  handle('historyList', (kind: HistoryKind, id: string) => requireStore().historyList(kind, id))
  handle('historyRead', (kind: HistoryKind, id: string, file: string) => requireStore().historyRead(kind, id, file))
  handle('historyDeleted', (collection: Collection) => requireStore().historyDeleted(collection))
  handle('historyKeep', (kind: HistoryKind, record: unknown, reason: HistoryReason) => requireStore().historyKeep(kind, record, reason))
  handle('historyRestore', async (kind: HistoryKind, id: string, file: string) => {
    const { change, fi } = await requireStore().historyRestore(kind, id, file)
    send(change)
    // Restored settings go back to the caller (they are not part of a change set's upserts).
    return fi
  })
  handle('saveSettings', (fi: never) => requireStore().saveSettings(fi))
  handle('resolveConflict', async (id: string, keep: 'canonical' | 'copy') => {
    send(await requireStore().resolveConflict(id, keep))
  })
  handle('resolveConflicts', async (items: Array<{ id: string; keep: 'canonical' | 'copy'; group?: string }>) => {
    const { results, change } = await requireStore().resolveConflicts(items)
    send(change)
    return results
  })
  handle('trashProblemFile', async (rel: string) => {
    send(await requireStore().trashFile(rel))
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
  handle('setTrayPrefs', async (patch: Partial<Pick<TrayPrefs, 'closeToTray' | 'launchAtLogin'>>) => {
    const cur = config.get().tray
    const next: TrayPrefs = {
      ...cur,
      ...(typeof patch?.closeToTray === 'boolean' ? { closeToTray: patch.closeToTray } : {}),
      ...(typeof patch?.launchAtLogin === 'boolean' ? { launchAtLogin: patch.launchAtLogin } : {})
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
      defaultPath: `Financial-Intel-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: 'ZIP', extensions: ['zip'] }]
    })
    if (res.canceled || !res.filePath) return null
    await s.zipData(res.filePath)
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
  handle('copyText', async (text: string) => {
    clipboard.writeText(text)
  })
  handle('listBackups', async () => {
    const s = requireStore()
    return { dir: s.backupsDir, files: await listBackups(s.backupsDir) }
  })
  handle('backupNow', async () => {
    const s = requireStore()
    return manualBackup(checkedData(s), s.backupsDir)
  })
  handle('importBackup', async () => {
    const s = requireStore()
    return importBackup(s, s.backupsDir)
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
    return { name: basename(path), bytes: new Uint8Array(await fs.readFile(path)) }
  })
  handle('setBackupDir', async (mode: 'pick' | 'default') => {
    const s = requireStore()
    let dir: string | null = null
    if (mode === 'pick') {
      const res = await dialog.showOpenDialog(mainWindow!, { title: 'Folder na kopie zapasowe (na tym komputerze)', properties: ['openDirectory', 'createDirectory', 'promptToCreate'] })
      if (res.canceled || !res.filePaths[0]) return s.backupsDir
      dir = res.filePaths[0]
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
  handle('setMachinePrefs', async (patch: unknown) => {
    const prefs = patchMachinePrefs(config.get().prefs, patch)
    await config.update({ prefs })
    // The shortcut registered again only when it was set (also the same one: a retry after another program let it go).
    if (patch && typeof patch === 'object' && 'quickShortcut' in patch) {
      quick?.applyShortcut(prefs.quickShortcut)
      if (quick) quick.replaced = null
    }
    broadcastPrefs(prefs)
    return prefs
  })
  handle('setTrayStatus', (text: unknown) => {
    tray?.setStatus(typeof text === 'string' && text ? text.slice(0, 200) : null)
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
  handle('notify', (n: { title?: unknown; body?: unknown; tag?: unknown; silent?: unknown }) => {
    if (!Notification.isSupported()) return
    const note = new Notification({ title: String(n?.title ?? APP_TITLE).slice(0, 120), body: String(n?.body ?? '').slice(0, 500), silent: n?.silent === true })
    const tag = String(n?.tag ?? '')
    note.on('click', () => {
      showMainWindow()
      mainWindow?.webContents.send('fi:notificationClick', tag)
    })
    note.on('close', () => notifications.delete(note))
    notifications.add(note)
    note.show()
  })
}

/** The preferences of this computer to every window of the app (the main one, the quick entry, detached panels). */
function broadcastPrefs(prefs: MachinePrefs): void {
  const wins = [mainWindow, ...(quick?.windows() ?? []), ...(detach?.windows() ?? [])]
  for (const w of wins) if (w && !w.isDestroyed()) w.webContents.send('fi:machinePrefs', prefs)
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
  // Started with the system: stay hidden in the tray (decision D46). A maximized window waits for its first show:
  // maximize() of a hidden window shows it on Windows.
  const startHidden = process.argv.includes(HIDDEN_ARG)
  pendingMaximize = !!saved?.maximized
  if (pendingMaximize && !startHidden) {
    pendingMaximize = false
    win.maximize()
  }
  win.once('ready-to-show', () => {
    if (startHidden && appTray().ensure()) log('info', 'start w zasobniku (uruchomienie z systemem)')
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
      void config.update({ window: { ...b, maximized: win.isMaximized() } })
      win.hide()
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
    void config.update({ window: { ...b, maximized: win.isMaximized() } })
    const finish = (saved: boolean) => {
      clearTimeout(timeout)
      clearTimeout(limit)
      ipcMain.removeListener('fi:flushed', onFlushed)
      ipcMain.removeListener('fi:flushing', onFlushing)
      if (allowClose || win.isDestroyed()) return
      if (!saved) {
        // The renderer keeps unsaved changes and retries; closing now would lose them.
        const choice = dialog.showMessageBoxSync(win, {
          type: 'warning',
          title: 'Niezapisane zmiany',
          message: 'Nie udało się zapisać ostatnich zmian.',
          detail:
            'Folder danych może być niedostępny albo plik jest zablokowany (OneDrive, antywirus). Wybierz „Anuluj”, żeby aplikacja spróbowała ponownie, albo zamknij i utrać te zmiany.',
          buttons: ['Anuluj', 'Zamknij mimo to'],
          defaultId: 0,
          cancelId: 0
        })
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
    const onFlushed = (_e: Electron.IpcMainEvent, saved?: boolean) => finish(saved !== false)
    // An unresponsive renderer must not keep the window open forever; one still saving (it says so every second)
    // gets time – up to a minute, then the question (B43).
    let timeout = setTimeout(() => finish(true), FLUSH_SILENT_MS)
    const onFlushing = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => finish(true), FLUSH_SILENT_MS)
    }
    const limit = setTimeout(() => finish(false), FLUSH_LIMIT_MS)
    ipcMain.on('fi:flushed', onFlushed)
    ipcMain.on('fi:flushing', onFlushing)
    win.webContents.send('fi:flush')
  })
  win.on('focus', () => {
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
    load: (child, key) =>
      devUrl ? child.loadURL(`${devUrl}?detached=${encodeURIComponent(key)}`) : child.loadFile(join(__dirname, '../renderer/index.html'), { query: { detached: key } })
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

app.whenReady().then(async () => {
  if (!isPrimaryInstance) return
  Menu.setApplicationMenu(null)
  initLog(app.getPath('userData'))
  log('info', `start v${app.getVersion()} on ${machineName}`)
  await config.load()
  updater = createUpdater()
  registerIpc()
  void ictjSource().setDir(ictjDirOf())
  applyLoginItem(trayView(), log)
  // The tray icon is there from the start while closing hides to it: the app is reachable after the first close.
  if (config.get().tray.closeToTray) appTray().ensure()
  createWindow()
  quick = new QuickEntry({
    main: () => mainWindow,
    preload: join(__dirname, '../preload/index.js'),
    devUrl: process.env.ELECTRON_RENDERER_URL ?? null,
    load: (w) => (process.env.ELECTRON_RENDERER_URL ? w.loadURL(`${process.env.ELECTRON_RENDERER_URL}?quick=1`) : w.loadFile(join(__dirname, '../renderer/index.html'), { query: { quick: '1' } })),
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
