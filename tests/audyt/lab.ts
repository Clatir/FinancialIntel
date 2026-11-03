/**
 * The functional audit's lab (docs/audyt/plan.md, D97): the released Financial Intel run on folders of C:\FI-audyt.
 * Nothing of the user's computer is touched: own user data (the single-instance lock is per user data, so the user's
 * own app keeps running), no global shortcut, no sounds, no updates; Windows notifications, the start with Windows,
 * file dialogs and the opening of files, folders and links are caught in the main process and recorded instead. The
 * windows are shown off every screen, without taking the focus.
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ElectronApplication, Page } from '@playwright/test'
import { launch, type Launched } from '../e2e/app'

export const LAB = process.env.FI_AUDIT_LAB ?? 'C:\\FI-audyt'
export const SHOTS = join(LAB, 'zrzuty')
export const READINGS = join(LAB, 'odczyty')

export interface Run extends Launched {
  name: string
  dir: string
}

export interface StartOptions {
  /** The data folder (default: the run's own `dane`). */
  dataDir?: string
  /** Start from an empty user data folder (default: true). */
  fresh?: boolean
  machine?: string
  /** ICT Trade Journal's data folder (a fixture of the lab). */
  ictjDir?: string
  /** The first-run screen: no data folder preset. */
  usePreset?: boolean
  /** Machine preferences of config.json over the lab's (no shortcut, no sounds). */
  prefs?: Record<string, unknown>
  env?: Record<string, string>
  /** Nobody touches the window after the start (the computer not „in use”). */
  idle?: boolean
}

const RUN_KEYS = ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run']

/** The Run entries of Financial Intel in this user's registry, read only (`reg query`) – the lab must never change them. */
export function autostartEntries(): string {
  if (process.platform !== 'win32') return ''
  return RUN_KEYS.map((k) => {
    try {
      return execFileSync('reg', ['query', k], { encoding: 'utf8' })
        .split(/\r?\n/)
        .filter((l) => /financial/i.test(l))
        .map((l) => l.trim())
        .sort()
        .join('\n')
    } catch {
      return '(brak klucza)'
    }
  }).join('\n--\n')
}

/** Ends the app with all its processes (Chromium's renderers, the GPU process) – a main process killed alone may leave them. */
export function killTree(app: ElectronApplication): void {
  const pid = app.process().pid
  if (!pid) return
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
    else app.process().kill('SIGKILL')
  } catch {
    /* already gone */
  }
}

/** A move of the mouse over the window – what makes the app count this computer as in use (D86). */
export async function useWindow(page: Page): Promise<void> {
  await page.mouse.move(400, 300)
  await page.mouse.move(420, 320, { steps: 3 })
}

/** Start the released app for a run of the audit. */
export async function start(name: string, opts: StartOptions = {}): Promise<Run> {
  const dir = join(LAB, 'przebiegi', name)
  const userData = join(dir, 'userdata')
  if (opts.fresh !== false) rmSync(userData, { recursive: true, force: true })
  mkdirSync(userData, { recursive: true })
  const config = join(userData, 'config.json')
  if (!existsSync(config))
    writeFileSync(
      config,
      JSON.stringify(
        {
          prefs: { quickShortcut: '', sounds: { enabled: false }, ...opts.prefs },
          updates: { prefs: { autoCheck: false, autoDownload: false } }
        },
        null,
        2
      )
    )
  else {
    // A run continued (`fresh: false`): its preferences, with `opts.prefs` on top – but never the start with Windows or
    // a global shortcut. Both are applied by the app at its start, before the guard: „Uruchamiaj z Windows” chosen in a
    // run (the wizard) would write a real Run entry, a shortcut would take keys of the user's programs. Their changes
    // within a run are only recorded (guard); the shortcut's persistence after a restart is the machine's to check.
    const c = JSON.parse(readFileSync(config, 'utf8')) as { prefs?: Record<string, unknown>; tray?: Record<string, unknown> }
    writeFileSync(config, JSON.stringify({ ...c, prefs: { ...c.prefs, ...opts.prefs, quickShortcut: '' }, tray: { ...c.tray, launchAtLogin: false } }, null, 2))
  }
  const dataDir = opts.dataDir ?? join(dir, 'dane')
  const env: Record<string, string> = {
    FI_DOWNLOADS_DIR: join(dir, 'pobrane'),
    FI_DEFAULT_DATA_DIR: join(dir, 'OneDrive', 'FinancialIntel'),
    FI_ICTJ_LAUNCH: 'dry',
    ...opts.env
  }
  if (opts.ictjDir) env.FI_ICTJ_DIR = opts.ictjDir
  else env.FI_ICTJ_APPDATA = join(dir, 'brak-ictj')
  mkdirSync(env.FI_DOWNLOADS_DIR, { recursive: true })
  // The start with Windows: every start of the app writes its Run entry from config.json BEFORE any window – a removal by
  // name, whatever the path („Financial Intel” of the user's own installed app was removed so on 03.11.2026). As a
  // portable copy its entry is „Financial Intel (portable)” – one the user does not have; later calls are caught (guard).
  // The user's entries are read before and after every start; any change stops the run.
  env.PORTABLE_EXECUTABLE_FILE = process.env.FI_E2E_EXECUTABLE ?? ''
  const before = autostartEntries()
  // Fail closed: an entry of the portable copy is the one the start would remove – never started then.
  if (/Financial Intel \(portable\)/i.test(before)) throw new Error(`Masz wpis autostartu „Financial Intel (portable)” – laboratorium go nie uruchomi (start usunąłby ten wpis).\n${before}`)
  const launched = await launch({
    dataDir,
    userData,
    machine: opts.machine ?? 'AUDYT',
    usePreset: opts.usePreset,
    env,
    hidden: true,
    args: ['--hidden', '--disable-features=CalculateNativeWinOcclusion', '--disable-backgrounding-occluded-windows']
  })
  try {
    await guard(launched.app)
    const after = autostartEntries()
    if (after !== before) throw new Error(`Laboratorium zmieniło wpisy autostartu Financial Intel w rejestrze – przebieg przerwany.\nPrzed:\n${before}\nPo:\n${after}`)
    await showOffScreen(launched.app)
    await launched.page.waitForFunction(() => document.visibilityState === 'visible', null, { timeout: 30_000 })
    // The captain moves the mouse over the window: this computer is „in use” (D86) – its background writes run (the
    // game's frozen days, ICTTJ goals), as on a computer someone works at. `idle: true` – a computer left alone.
    if (!opts.idle) await useWindow(launched.page)
  } catch (e) {
    // Never a released app left running with its tray icon and a lock on the run's user data.
    killTree(launched.app)
    throw e
  }
  // A close that fails (the app held by its question about unsaved changes: e2e's guard kills the main process only) ends
  // the whole tree of the app's processes.
  const close = launched.app.close.bind(launched.app)
  launched.app.close = async () => {
    try {
      await close()
    } catch (e) {
      killTree(launched.app)
      throw e
    }
  }
  note(name, `start ${new Date().toISOString()} dane=${dataDir}`)
  return { ...launched, name, dir }
}

/**
 * The main process's ways out to the user's desktop, replaced by records (read back with `recorded`): notifications,
 * the start with Windows, opening of paths and links, Explorer. Windows are moved off every screen whenever shown.
 */
async function guard(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ app: a, BrowserWindow, Notification, shell, screen, globalShortcut }) => {
    type Rec = { toasts: Array<{ title: string; body: string; at: string }>; login: unknown[]; opened: string[]; shortcuts: string[] }
    const g = globalThis as unknown as { __audit?: Rec }
    if (g.__audit) return
    const rec: Rec = { toasts: [], login: [], opened: [], shortcuts: [] }
    g.__audit = rec
    // A global shortcut would take the keys of the user's programs: recorded, never registered.
    globalShortcut.register = ((acc: string) => {
      rec.shortcuts.push(acc)
      return true
    }) as typeof globalShortcut.register
    globalShortcut.unregister = (() => undefined) as typeof globalShortcut.unregister
    Notification.prototype.show = function (this: Electron.Notification) {
      rec.toasts.push({ title: this.title, body: this.body, at: new Date().toISOString() })
    }
    let login: Electron.LoginItemSettings | null = null
    const realGet = a.getLoginItemSettings.bind(a)
    a.setLoginItemSettings = (s: Electron.Settings) => {
      rec.login.push(s)
      login = { ...realGet(), openAtLogin: !!s.openAtLogin, launchItems: [] } as Electron.LoginItemSettings
    }
    a.getLoginItemSettings = ((o?: Electron.LoginItemSettingsOptions) => login ?? { ...realGet(o), openAtLogin: false, launchItems: [] }) as typeof a.getLoginItemSettings
    shell.openPath = async (p: string) => {
      rec.opened.push(`path:${p}`)
      return ''
    }
    shell.openExternal = async (u: string) => {
      rec.opened.push(`url:${u}`)
    }
    shell.showItemInFolder = (p: string) => {
      rec.opened.push(`folder:${p}`)
    }
    const away = () => {
      const left = Math.min(...screen.getAllDisplays().map((d) => d.bounds.x))
      return { x: left - 6000, y: 40 }
    }
    const proto = BrowserWindow.prototype as unknown as { show: () => void; focus: () => void; showInactive: () => void; setPosition: (x: number, y: number) => void }
    proto.show = function (this: Electron.BrowserWindow) {
      const p = away()
      this.setPosition(p.x, p.y)
      this.showInactive()
    }
    proto.focus = function () {
      /* never takes the focus from the user's programs */
    }
  })
}

async function showOffScreen(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && !w.isVisible()) w.show()
  })
}

/** Windows of the app shown on the screens (should be none). */
export async function onScreen(app: ElectronApplication): Promise<number> {
  return app.evaluate(({ BrowserWindow, screen }) => {
    const ds = screen.getAllDisplays().map((d) => d.bounds)
    return BrowserWindow.getAllWindows().filter((w) => {
      if (w.isDestroyed() || !w.isVisible()) return false
      const b = w.getBounds()
      return ds.some((d) => b.x < d.x + d.width && b.x + b.width > d.x && b.y < d.y + d.height && b.y + b.height > d.y)
    }).length
  })
}

/** What the app tried to do on the desktop: notifications, start with Windows, opened paths and links, global shortcuts. */
export interface Recorded {
  toasts: Array<{ title: string; body: string; at: string }>
  login: unknown[]
  opened: string[]
  shortcuts: string[]
}
export async function recorded(app: ElectronApplication): Promise<Recorded> {
  return app.evaluate(() => (globalThis as unknown as { __audit: Recorded }).__audit)
}

/** File dialogs answered by the audit: the next open dialog gets `paths`, the next save dialog `savePath`. */
export async function answerDialogs(app: ElectronApplication, a: { paths?: string[]; savePath?: string; cancel?: boolean }): Promise<void> {
  await app.evaluate(({ dialog }, ans) => {
    dialog.showOpenDialog = (async () => (ans.cancel ? { canceled: true, filePaths: [] } : { canceled: false, filePaths: ans.paths ?? [] })) as typeof dialog.showOpenDialog
    dialog.showSaveDialog = (async () => (ans.cancel ? { canceled: true, filePath: '' } : { canceled: false, filePath: ans.savePath ?? '' })) as typeof dialog.showSaveDialog
  }, a)
}

/** The visible text of the window (or of a part of it). */
export async function text(page: Page, selector = 'body'): Promise<string> {
  return page.locator(selector).first().innerText()
}

/** A screenshot of the window for a point of the audit: C:\FI-audyt\zrzuty\<id>.png. */
export async function shot(page: Page, id: string): Promise<string> {
  mkdirSync(SHOTS, { recursive: true })
  const file = join(SHOTS, `${id.replace(/[^\w.-]+/g, '_')}.png`)
  await page.screenshot({ path: file })
  return file
}

/** Numbers read from a screen, for the oracle (AU-9): one JSON line per reading. */
export function reading(group: string, point: string, state: string, values: Record<string, string | number | null>): void {
  mkdirSync(READINGS, { recursive: true })
  const now = new Date()
  const warsaw = now.toLocaleString('sv-SE', { timeZone: 'Europe/Warsaw' })
  appendFileSync(join(READINGS, `${group}.jsonl`), `${JSON.stringify({ point, state, at: now.toISOString(), warsaw, values })}\n`)
}

/**
 * A state of the persona (C:\FI-audyt\stany\<state>, made by persona.spec.ts) copied for a run: the run works on its own
 * copy, the state stays as generated. Returns the data folder and the copy of ICTTJ's folder (if the state has one).
 */
export function useState(state: string, run: string): { dataDir: string; ictjDir: string | undefined } {
  const src = join(LAB, 'stany', state)
  if (!existsSync(join(src, 'fi.json'))) throw new Error(`Brak stanu ${state} – najpierw tests/audyt/persona.spec.ts`)
  const dir = join(LAB, 'przebiegi', run)
  const dataDir = join(dir, 'dane')
  rmSync(dataDir, { recursive: true, force: true })
  cpSync(src, dataDir, { recursive: true })
  const ictjSrc = join(LAB, 'stany', `ictj-${state}`)
  let ictjDir: string | undefined
  if (existsSync(ictjSrc)) {
    ictjDir = join(dir, 'ictj')
    rmSync(ictjDir, { recursive: true, force: true })
    cpSync(ictjSrc, ictjDir, { recursive: true })
  }
  return { dataDir, ictjDir }
}

/** A line of the run's log (C:\FI-audyt\przebiegi\<name>\przebieg.log). */
export function note(name: string, line: string): void {
  const dir = join(LAB, 'przebiegi', name)
  mkdirSync(dir, { recursive: true })
  appendFileSync(join(dir, 'przebieg.log'), `${line}\n`)
}
