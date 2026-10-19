/**
 * The main window's saved place against the displays there are now (B54): a window closed on a monitor that is gone
 * would open off every screen – only its button on the taskbar to see.
 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const DEFAULT_WINDOW_SIZE = { width: 1440, height: 900 }
/** The title bar must show this much on some display for the saved place to stay. */
const TITLE_BAR = 32
const MIN_VISIBLE_WIDTH = 100

const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))

/**
 * Bounds for the main window: the saved place when its title bar shows on one of the work areas; otherwise none (the
 * window centres) and the size within the primary display's work area.
 */
export function windowBounds(saved: Partial<Rect> | null | undefined, workAreas: readonly Rect[], primary: Rect): { x?: number; y?: number; width: number; height: number } {
  const width = saved?.width ?? DEFAULT_WINDOW_SIZE.width
  const height = saved?.height ?? DEFAULT_WINDOW_SIZE.height
  const { x, y } = saved ?? {}
  if (x != null && y != null) {
    const shows = workAreas.some((a) => overlap(x, x + width, a.x, a.x + a.width) >= MIN_VISIBLE_WIDTH && overlap(y, y + TITLE_BAR, a.y, a.y + a.height) >= TITLE_BAR)
    if (shows) return { x, y, width, height }
  }
  return { width: Math.min(width, primary.width), height: Math.min(height, primary.height) }
}
