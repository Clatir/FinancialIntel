// adapted from ICTTJ src/main/index.ts @ 84a8339
import { existsSync, promises as fs } from 'node:fs'
import { hostname } from 'node:os'
import { basename, dirname, join, parse } from 'node:path'
import { Readable } from 'node:stream'
import { BrowserWindow, Menu, Notification, app, clipboard, dialog, globalShortcut, ipcMain, net, safeStorage, shell, type IpcMainInvokeEvent } from 'electron'
import type { AppInfo, ChangeSet, HistoryKind, HistoryReason, OpenFolderResult, TrayPrefs } from '@shared/api'
import type { Collection } from '@shared/paths'
import { APP_TITLE, GITHUB_API, detectInstallMode, validUpdateToken, type UpdatePrefs, type UpdateTokenState } from '@shared/update'
import { ConfigStore, publicConfig } from './config'
import { DataStore } from './datastore/store'
import { FolderWatcher } from './datastore/watch'
import { clearPresence, readOtherMachines, writePresence } from './datastore/presence'
import { initLog, log } from './log'
import { importBackup, isDataFile, listBackups, manualBackup, runBackups } from './datastore/backup'
import { zipFolder } from './datastore/zip'
import { Updater } from './update/updater'
import { startPortableSwap, startSilentInstaller } from './update/apply'
import { setupDetach } from './detach'
import { AppTray, HIDDEN_ARG, applyLoginItem } from './tray'
import { QuickEntry } from './quick'
import { patchMachinePrefs, type MachinePrefs } from '@shared/machine'

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
let presenceTimer: NodeJS.Timeout | null = null
let updater: Updater | null = null
let tray: AppTray | null = null
let quick: QuickEntry | null = null
/** Notifications shown and not closed yet (a dropped reference loses its click). */
const notifications = new Set<Notification>()
/** The app really quits (from the tray, an update, the system): closing the window then closes it, not hides it. */
let quitting = false
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

function send(change: ChangeSet | null): void {
  if (change && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('fi:change', change)
}

async function trash(absPath: string): Promise<void> {
  try {
    await shell.trashItem(absPath)
  } catch {
    // Removable or network drives may have no recycle bin.
    await fs.rm(absPath, { force: true })
  }
}

async function closeStore(): Promise<void> {
  watcher?.stop()
  watcher = null
  if (presenceTimer) clearInterval(presenceTimer)
  presenceTimer = null
  if (store) await clearPresence(store.root, machineName).catch(() => undefined)
  store = null
}

async function heartbeat(): Promise<void> {
  const s = store
  if (!s) return
  try {
    if (!s.status().readOnly) await writePresence(s.root, machineName, app.getVersion()).catch(() => undefined)
    const others = await readOtherMachines(s.root, machineName)
    if (JSON.stringify(others) !== JSON.stringify(s.otherMachines)) {
      s.otherMachines = others
      send(await s.refresh([]))
    }
  } catch (e) {
    log('warn', 'heartbeat failed', e)
  }
}

async function openFolder(dir: string, createIfEmpty: boolean): Promise<OpenFolderResult> {
  try {
    let target = dir
    let kind = await DataStore.inspect(target)
    if (kind === 'ictj' || (await insideIctj(dir))) {
      return { ok: false, reason: 'not-data', message: 'To folder danych ICT Trade Journal – Financial Intel nigdy w nim nie zapisuje. Wybierz inny folder.' }
    }
    // A folder of other files gets a FinancialIntel subfolder – not the proposal itself (already named so) and not a
    // folder of FI data whose fi.json has not arrived yet.
    if (kind === 'other' && createIfEmpty && basename(dir) !== DATA_FOLDER_NAME) {
      target = join(dir, DATA_FOLDER_NAME)
      kind = await DataStore.inspect(target)
    }
    if (kind === 'partial' || (kind === 'other' && createIfEmpty)) {
      return {
        ok: false,
        reason: 'not-data',
        dir: target,
        message:
          kind === 'partial'
            ? 'W tym folderze są już dane Financial Intel, ale bez pliku fi.json – OneDrive pewnie jeszcze go pobiera. Poczekaj chwilę i spróbuj ponownie (nowe dane nie są tworzone, żeby nie rozdzielić budżetu).'
            : `Folder ${DATA_FOLDER_NAME} zawiera inne pliki – wybierz pusty folder.`
      }
    }
    if (kind === 'missing' || kind === 'empty') {
      if (!createIfEmpty) {
        return {
          ok: false,
          reason: 'not-data',
          dir,
          message:
            kind === 'empty'
              ? 'Folder jest pusty – można w nim utworzyć nowe dane.'
              : 'Zapamiętany folder danych jest niedostępny (np. OneDrive jeszcze się nie uruchomił albo dysk jest odłączony). Spróbuj ponownie albo wskaż inny folder.'
        }
      }
      await DataStore.initialize(target)
    } else if (kind === 'other') {
      return {
        ok: false,
        reason: 'not-data',
        dir,
        message: `W tym folderze nie ma danych Financial Intel (fi.json). Można utworzyć w nim podfolder „${DATA_FOLDER_NAME}”.`
      }
    }
    const next = new DataStore(target, { machineName, trash, backupDir: config.get().backupDirOverride })
    // Open the new folder first: if it fails, the current one stays open and keeps saving.
    const snapshot = await next.open()
    await closeStore()
    store = next
    next.otherMachines = await readOtherMachines(target, machineName)
    snapshot.status = next.status()
    watcher = new FolderWatcher(
      target,
      (paths) => {
        const s = store
        if (s !== next) return
        s.refresh(paths ?? undefined).then(send, (e) => log('error', 'refresh failed', e))
      },
      { onError: (e) => log('warn', 'watcher error', e) }
    )
    watcher.start()
    void heartbeat()
    presenceTimer = setInterval(() => void heartbeat(), 60_000)
    if (!next.status().readOnly) {
      // Daily backup (decision D31), in the background.
      runBackups(target, next.backupsDir).then(
        (file) => file && log('info', `backup ${file}`),
        (e) => log('warn', 'backup failed', e)
      )
    }
    await config.rememberDir(target)
    const count = Object.values(snapshot.records).reduce((n, list) => n + list.length, 0)
    log('info', `opened ${target}: ${count} records, ${snapshot.problems.length} problems, ${snapshot.conflicts.length} conflicts, ${snapshot.loadMs} ms`)
    return { ok: true, snapshot }
  } catch (e) {
    log('error', `open failed ${dir}`, e)
    return { ok: false, reason: 'error', dir, message: (e as Error).message }
  }
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
    if (preset) return openFolder(preset, true)
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
  handle('openDataDir', (dir: string, createIfEmpty: boolean) => openFolder(dir, createIfEmpty))
  handle('saveRecord', async (collection: Collection, record: never) => {
    const { entry, change } = await requireStore().saveRecord(collection, record)
    send(change)
    return entry
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
    if (store) send(await store.refresh())
  })
  handle('exportZip', async () => {
    const s = requireStore()
    const res = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `Financial-Intel-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: 'ZIP', extensions: ['zip'] }]
    })
    if (res.canceled || !res.filePath) return null
    await zipFolder(s.root, res.filePath, isDataFile)
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
    return manualBackup(s.root, s.backupsDir)
  })
  handle('importBackup', async () => {
    const s = requireStore()
    return importBackup(s.root, s.backupsDir)
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
    if (patch && typeof patch === 'object' && 'quickShortcut' in patch) quick?.applyShortcut(prefs.quickShortcut)
    broadcastPrefs(prefs)
    return prefs
  })
  handle('setTrayStatus', (text: unknown) => {
    tray?.setStatus(typeof text === 'string' && text ? text.slice(0, 200) : null)
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

function createWindow(): void {
  const saved = config.get().window
  const win = new BrowserWindow({
    width: saved?.width ?? 1440,
    height: saved?.height ?? 900,
    x: saved?.x,
    y: saved?.y,
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
    const b = win.getNormalBounds()
    void config.update({ window: { ...b, maximized: win.isMaximized() } })
    const finish = (saved: boolean) => {
      clearTimeout(timeout)
      ipcMain.removeListener('fi:flushed', onFlushed)
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
          quitting = false
          updater?.cancelRestart()
          return
        }
      }
      allowClose = true
      win.close()
    }
    const onFlushed = (_e: Electron.IpcMainEvent, saved?: boolean) => finish(saved !== false)
    // An unresponsive renderer must not keep the window open forever.
    const timeout = setTimeout(() => finish(true), 4000)
    ipcMain.on('fi:flushed', onFlushed)
    win.webContents.send('fi:flush')
  })
  win.on('focus', () => {
    store?.refresh().then(send, () => undefined)
  })
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

app.on('second-instance', () => showMainWindow())

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
  // Created hidden a moment after the start: the shortcut then shows it at once.
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) quick?.ensure()
  }, 3000).unref?.()
  tray?.refresh()
  const u = updater
  void u.init().then(
    () => u.startAuto(updateCheckDelayMs()),
    (e) => log('warn', 'update init failed', e)
  )
})

app.on('window-all-closed', () => {
  log('info', 'zamykanie: okno zamknięte')
  tray?.destroy()
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
