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
  /** The quick entry window (E4); null = not available. */
  quick: (() => void) | null
  /** „Raport wachty dnia”: the window on today's operations. */
  today: () => void
  quit: () => void
  /** A downloaded update waits for the restart. */
  updateReady: () => boolean
  restartForUpdate: () => void
  log: (level: 'info' | 'warn', msg: string, e?: unknown) => void
}

export class AppTray {
  private tray: Tray | null = null
  private status: string | null = null

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
      this.tray.setToolTip(this.tooltip())
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

  private tooltip(): string {
    return this.status ? `${this.d.title}\n${this.status}` : this.d.title
  }

  /** The tooltip's second line: today's energy (masked while the amounts are hidden – the window decides). */
  setStatus(text: string | null): void {
    this.status = text
    if (this.active) this.tray!.setToolTip(this.tooltip())
  }

  /** The menu again (an update became ready). */
  refresh(): void {
    if (!this.active) return
    const ready = this.d.updateReady()
    const quick = this.d.quick
    this.tray!.setContextMenu(
      Menu.buildFromTemplate([
        ...(quick ? [{ label: 'Szybki wpis', click: () => quick() }] : []),
        { label: 'Otwórz', click: () => this.d.show() },
        { label: 'Raport wachty dnia', click: () => this.d.today() },
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

/** The name of the entry in Windows' Run key: one per kind of the app, the same in every version (B52). */
export const loginItemName = (portable: boolean): string => (portable ? 'Financial Intel (portable)' : 'Financial Intel')

const samePath = (a: string, b: string) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)

/** Start at login (Windows / macOS; packaged app only – in development it would register electron.exe). */
export function applyLoginItem(prefs: TrayPrefs, log: TrayDeps['log']): void {
  if (!app.isPackaged || (process.platform !== 'win32' && process.platform !== 'darwin')) return
  try {
    // The portable build runs from a temporary folder: its launcher exe is the one to start.
    const portable = !!process.env.PORTABLE_EXECUTABLE_FILE
    const path = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
    const args = [HIDDEN_ARG]
    const name = loginItemName(portable)
    if (process.platform === 'win32') {
      // Before 1.5.3 the entry was named after the app's id – for the portable a temporary folder new in every version:
      // the entries piled up and switching off removed only the last one (B52). Every other entry of this exe goes.
      for (const item of app.getLoginItemSettings({ path, args }).launchItems ?? []) {
        if (item.name === name || !samePath(item.path, path)) continue
        app.setLoginItemSettings({ openAtLogin: false, name: item.name, path: item.path, args: item.args })
        log('info', `uruchamianie z systemem: usunięty stary wpis „${item.name}”`)
      }
    }
    app.setLoginItemSettings({ openAtLogin: prefs.launchAtLogin, path, args, name })
  } catch (e) {
    log('warn', 'uruchamianie z systemem – nie udało się zapisać', e)
  }
}
