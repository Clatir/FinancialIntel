/**
 * The quick entry (spec, „Szybki wpis”, D46): a small window over all others, opened by a global shortcut (default
 * Ctrl+Alt+B, per computer) or from the tray. It is created hidden at the start, so the shortcut shows it at once. The
 * window draws what the main window sends (categories, today's energy, the officer's hints) and gives the typed
 * operation back to it: the main window owns the data and saves it.
 */
import { BrowserWindow, globalShortcut, ipcMain, screen, type IpcMainInvokeEvent } from 'electron'
import type { QuickData, QuickResult } from '@shared/api'

export interface QuickDeps {
  main: () => BrowserWindow | null
  preload: string
  /** Load the renderer with `?quick=1`. */
  load: (win: BrowserWindow) => Promise<void>
  devUrl: string | null
  log: (level: 'info' | 'warn', msg: string, e?: unknown) => void
}

export class QuickEntry {
  private win: BrowserWindow | null = null
  private accelerator = ''
  private registered = false
  /** The shortcut config.json had before the start replaced it (it took a Polish letter – B29): told to the window once. */
  replaced: string | null = null

  constructor(private readonly d: QuickDeps) {
    const fromMain = (e: IpcMainInvokeEvent) => {
      const main = d.main()
      return !!main && !main.isDestroyed() && e.sender === main.webContents
    }
    const fromQuick = (e: IpcMainInvokeEvent) => !!this.win && !this.win.isDestroyed() && e.sender === this.win.webContents
    ipcMain.handle('fi:quickOpen', (e) => {
      if (fromMain(e)) this.show()
    })
    ipcMain.handle('fi:quickData', (e, data: QuickData | null) => {
      if (fromMain(e)) this.send('fi:quickData', data)
    })
    ipcMain.handle('fi:quickResult', (e, result: QuickResult) => {
      if (fromMain(e)) this.send('fi:quickResult', result)
    })
    ipcMain.handle('fi:quickAdd', (e, draft: unknown) => {
      if (!fromQuick(e)) return
      const main = d.main()
      if (main && !main.isDestroyed()) main.webContents.send('fi:quickAdd', draft)
      else this.send('fi:quickResult', { ok: false, message: 'Główne okno nie działa – otwórz aplikację.' } satisfies QuickResult)
    })
    // The quick window's renderer starts after the first request went out: it asks again when it is ready.
    ipcMain.handle('fi:quickRefresh', (e) => {
      if (!fromQuick(e)) return
      const main = d.main()
      if (main && !main.isDestroyed()) main.webContents.send('fi:quickRequest')
      else this.send('fi:quickData', null)
    })
    ipcMain.handle('fi:quickClose', (e) => {
      if (fromQuick(e)) this.hide()
    })
    ipcMain.handle('fi:quickShortcutState', () => ({ accelerator: this.accelerator, registered: this.registered, replaced: this.replaced }))
  }

  private send(channel: string, payload: unknown): void {
    if (this.win && !this.win.isDestroyed()) this.win.webContents.send(channel, payload)
  }

  /** The window, created hidden once (later shows are instant). */
  ensure(): BrowserWindow {
    if (this.win && !this.win.isDestroyed()) return this.win
    const win = new BrowserWindow({
      width: 440,
      height: 600,
      show: false,
      frame: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      backgroundColor: '#111418',
      title: 'Szybki wpis – Financial Intel',
      webPreferences: { preload: this.d.preload, contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
    })
    this.win = win
    win.setAlwaysOnTop(true, 'floating')
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('will-navigate', (e, url) => {
      if (!this.d.devUrl || !url.startsWith(this.d.devUrl)) e.preventDefault()
    })
    win.on('page-title-updated', (e) => e.preventDefault())
    // Closing hides: the next shortcut shows it again at once.
    win.on('close', (e) => {
      if (!this.quitting) {
        e.preventDefault()
        win.hide()
      }
    })
    win.on('closed', () => {
      if (this.win === win) this.win = null
    })
    void this.d.load(win)
    return win
  }

  private quitting = false

  /** Show it centred on the display with the cursor; the main window sends fresh data first. */
  show(): void {
    const win = this.ensure()
    const main = this.d.main()
    if (main && !main.isDestroyed()) main.webContents.send('fi:quickRequest')
    else this.send('fi:quickData', null)
    const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
    const [w, h] = win.getSize() as [number, number]
    win.setPosition(Math.round(area.x + (area.width - w) / 2), Math.round(area.y + (area.height - h) / 3))
    win.show()
    win.focus()
  }

  hide(): void {
    if (this.win && !this.win.isDestroyed()) this.win.hide()
  }

  get isOpen(): boolean {
    return !!this.win && !this.win.isDestroyed() && this.win.isVisible()
  }

  /** Register the global shortcut ('' = none); another program holding it leaves `registered` false. */
  applyShortcut(accelerator: string): { accelerator: string; registered: boolean } {
    if (accelerator === this.accelerator && (this.registered || !accelerator)) return { accelerator, registered: this.registered }
    if (this.accelerator && this.registered) globalShortcut.unregister(this.accelerator)
    this.accelerator = accelerator
    this.registered = false
    if (accelerator) {
      try {
        this.registered = globalShortcut.register(accelerator, () => this.show())
      } catch (e) {
        this.d.log('warn', `skrót szybkiego wpisu ${accelerator} – niepoprawny`, e)
      }
      this.d.log(this.registered ? 'info' : 'warn', `skrót szybkiego wpisu ${accelerator}: ${this.registered ? 'zarejestrowany' : 'zajęty przez inny program'}`)
    }
    return { accelerator, registered: this.registered }
  }

  /** On quit: the window really closes, the shortcut is released. */
  destroy(): void {
    this.quitting = true
    if (this.accelerator && this.registered) globalShortcut.unregister(this.accelerator)
    this.registered = false
    if (this.win && !this.win.isDestroyed()) this.win.destroy()
    this.win = null
  }

  /** Windows that are not the main one but need the preferences (the quick window). */
  windows(): BrowserWindow[] {
    return this.win && !this.win.isDestroyed() ? [this.win] : []
  }
}
