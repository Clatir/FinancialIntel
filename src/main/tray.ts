// adapted from ICTTJ src/main/tray.ts @ 84a8339
/**
 * The tray of the app (decision D46): closing the window only hides it – notifications keep working – and the tray
 * icon brings it back. "Uruchamiaj z systemem" registers the app (the portable launcher or the installed exe) to start
 * hidden at login. Both are per computer (config.json `tray`). Later stages add "energia dziś" to the tooltip and the
 * quick entry to the menu (E4).
 */
import { Menu, Notification, Tray, app, nativeImage } from 'electron'
import type { TrayPrefs } from '@shared/api'
import icon from '../../resources/icon.png?asset'

/** Argument of the login start: the window stays hidden (in the tray). */
export const HIDDEN_ARG = '--hidden'

export interface TrayDeps {
  title: string
  show: () => void
  quit: () => void
  /** A downloaded update waits for the restart. */
  updateReady: () => boolean
  restartForUpdate: () => void
  log: (level: 'info' | 'warn', msg: string, e?: unknown) => void
}

export class AppTray {
  private tray: Tray | null = null

  constructor(private readonly d: TrayDeps) {}

  get active(): boolean {
    return !!this.tray && !this.tray.isDestroyed()
  }

  /** Creates the icon (once); false when the system has no tray (the window then closes as usual). */
  ensure(): boolean {
    if (this.active) return true
    try {
      const image = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
      this.tray = new Tray(image)
      this.tray.setToolTip(this.d.title)
      this.tray.on('click', () => this.d.show())
      this.tray.on('double-click', () => this.d.show())
      this.refresh()
      return true
    } catch (e) {
      this.d.log('warn', 'zasobnik niedostępny', e)
      this.tray = null
      return false
    }
  }

  /** The menu again (an update became ready). */
  refresh(): void {
    if (!this.active) return
    const ready = this.d.updateReady()
    this.tray!.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Otwórz', click: () => this.d.show() },
        ...(ready ? [{ label: 'Uruchom ponownie i zaktualizuj', click: () => this.d.restartForUpdate() }] : []),
        { type: 'separator' },
        { label: 'Zakończ', click: () => this.d.quit() }
      ])
    )
  }

  destroy(): void {
    if (this.active) this.tray!.destroy()
    this.tray = null
  }

  /** The first hide: tell where the app went. */
  notifyHidden(): void {
    if (!Notification.isSupported()) return
    new Notification({
      title: this.d.title,
      body: 'Financial Intel działa w zasobniku – przypomnienia i powiadomienia pracują dalej. Ikona przy zegarze: Otwórz / Zakończ.',
      silent: true
    }).show()
  }
}

/** Start at login (Windows / macOS; packaged app only – in development it would register electron.exe). */
export function applyLoginItem(prefs: TrayPrefs, log: TrayDeps['log']): void {
  if (!app.isPackaged || (process.platform !== 'win32' && process.platform !== 'darwin')) return
  try {
    // The portable build runs from a temporary folder: its launcher exe is the one to start.
    const path = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
    app.setLoginItemSettings({ openAtLogin: prefs.launchAtLogin, path, args: [HIDDEN_ARG] })
  } catch (e) {
    log('warn', 'uruchamianie z systemem – nie udało się zapisać', e)
  }
}
