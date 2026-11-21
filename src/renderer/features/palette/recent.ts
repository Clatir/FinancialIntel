/**
 * The palette's „Ostatnio” (UX-78): the commands used last, on this computer (`localStorage`, like the other small
 * choices of the view). Only ids are kept; the palette shows the ones that still exist.
 */
const KEY = 'fi.palette.recent'
export const RECENT_MAX = 5

/** Commands that are never offered again on a bare Enter (what ends the work). */
export const NOT_REMEMBERED: readonly string[] = ['quit']

/** `id` in front, the rest after it without `id` – the list kept to `RECENT_MAX`. */
export function withRecent(list: readonly string[], id: string): string[] {
  if (NOT_REMEMBERED.includes(id)) return [...list]
  return [id, ...list.filter((x) => x !== id)].slice(0, RECENT_MAX)
}

export function readRecent(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

export function rememberRecent(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(withRecent(readRecent(), id)))
  } catch {
    // A full or blocked storage: the list is only a convenience.
  }
}
