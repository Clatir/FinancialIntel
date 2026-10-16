// adapted from ICTTJ src/main/detach.ts @ 84a8339
/**
 * Detached panels (decision D45): a panel of the main window opened in its own window (full screen at first, e.g. on
 * a second monitor). The window runs the same renderer in "detached" mode: it only draws what the main window sends
 * (the panel's data as plain JSON, again on every change) and sends events back. Closing it puts the
 * panel back; closing or reloading the main window closes all of them.
 */
import { BrowserWindow, ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron'
import type { DetachEvent, DetachPayload } from '@shared/api'

interface Detached {
  win: BrowserWindow
  payload: DetachPayload
}

export interface DetachDeps {
  main: () => BrowserWindow | null
  preload: string
  /** Load the renderer with `?detached=<key>`. */
  load: (win: BrowserWindow, key: string) => Promise<void>
  /** Navigation allowed inside renderer windows (the dev server), null = none. */
  devUrl: string | null
}

const validKey = (key: unknown): key is string => typeof key === 'string' && key.length > 0 && key.length <= 200
const validPayload = (p: unknown): p is DetachPayload =>
  !!p && typeof p === 'object' && typeof (p as DetachPayload).kind === 'string' && typeof (p as DetachPayload).title === 'string'

export function setupDetach(deps: DetachDeps): { closeAll: () => void; windows: () => BrowserWindow[] } {
  const windows = new Map<string, Detached>()
  const keyOf = (wc: WebContents): string | null => {
    for (const [key, d] of windows) if (!d.win.isDestroyed() && d.win.webContents === wc) return key
    return null
  }
  const fromMain = (e: IpcMainInvokeEvent) => {
    const main = deps.main()
    if (!main || main.isDestroyed() || e.sender !== main.webContents) throw new Error('Tylko z głównego okna.')
  }

  const open = (key: string, payload: DetachPayload) => {
    const cur = windows.get(key)
    if (cur && !cur.win.isDestroyed()) {
      cur.payload = payload
      cur.win.webContents.send('fi:detachProps', payload)
      if (cur.win.isMinimized()) cur.win.restore()
      cur.win.show()
      cur.win.focus()
      return
    }
    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 640,
      minHeight: 420,
      show: false,
      backgroundColor: '#0b0d10',
      title: `${payload.title} – Financial Intel`,
      autoHideMenuBar: true,
      webPreferences: { preload: deps.preload, contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
    })
    windows.set(key, { win, payload })
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('will-navigate', (e, url) => {
      if (!deps.devUrl || !url.startsWith(deps.devUrl)) e.preventDefault()
    })
    // The title set by the page (index.html) would replace the panel's name.
    win.on('page-title-updated', (e) => e.preventDefault())
    win.once('ready-to-show', () => {
      win.setFullScreen(true)
      win.show()
    })
    win.on('closed', () => {
      if (windows.get(key)?.win === win) windows.delete(key)
      const main = deps.main()
      if (main && !main.isDestroyed()) main.webContents.send('fi:detachClosed', key)
    })
    void deps.load(win, key)
  }

  ipcMain.handle('fi:detachOpen', (e, key: unknown, payload: unknown) => {
    fromMain(e)
    if (!validKey(key) || !validPayload(payload)) throw new Error('Niepoprawny panel.')
    open(key, payload)
  })
  ipcMain.handle('fi:detachSend', (e, key: unknown, payload: unknown) => {
    fromMain(e)
    const d = validKey(key) ? windows.get(key) : undefined
    if (!d || d.win.isDestroyed() || !validPayload(payload)) return
    d.payload = payload
    d.win.webContents.send('fi:detachProps', payload)
  })
  ipcMain.handle('fi:detachClose', (e, key: unknown) => {
    fromMain(e)
    const d = validKey(key) ? windows.get(key) : undefined
    if (d && !d.win.isDestroyed()) d.win.close()
    else if (validKey(key)) e.sender.send('fi:detachClosed', key)
  })
  ipcMain.handle('fi:detachFocus', (e, key: unknown) => {
    fromMain(e)
    const d = validKey(key) ? windows.get(key) : undefined
    if (!d || d.win.isDestroyed()) return
    if (d.win.isMinimized()) d.win.restore()
    d.win.show()
    d.win.focus()
  })
  ipcMain.handle('fi:detachReady', (e) => {
    const key = keyOf(e.sender)
    return key ? (windows.get(key)?.payload ?? null) : null
  })
  ipcMain.handle('fi:detachEmit', (e, event: unknown) => {
    const key = keyOf(e.sender)
    const main = deps.main()
    if (!key || !main || main.isDestroyed() || !event || typeof event !== 'object' || typeof (event as DetachEvent).type !== 'string') return
    main.webContents.send('fi:detachEvent', key, event)
  })
  ipcMain.handle('fi:detachFullscreen', (e, on: unknown) => {
    const key = keyOf(e.sender)
    const win = key ? windows.get(key)?.win : undefined
    if (!win || win.isDestroyed()) return false
    win.setFullScreen(typeof on === 'boolean' ? on : !win.isFullScreen())
    return on ?? win.isFullScreen()
  })

  return {
    /** Open detached windows. */
    windows: () => [...windows.values()].map((d) => d.win).filter((w) => !w.isDestroyed()),
    closeAll: () => {
      for (const d of [...windows.values()]) if (!d.win.isDestroyed()) d.win.destroy()
      windows.clear()
    }
  }
}
