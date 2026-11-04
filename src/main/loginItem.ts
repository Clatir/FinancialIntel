/**
 * The start with the system – what to write in Windows' Run key (AP-28, the incident of 03.11.2026): pure, so the rules
 * are tested without the registry. Every start of a packaged copy wrote its entry from config.json before any window, and
 * an entry is removed by its name whatever program it starts – a lab run with its own config.json (start with Windows
 * off) removed the user's „Financial Intel”. The rules:
 * - a profile other than the app's own (user data moved by `FI_USER_DATA` – tests, the lab) never writes: the entry would
 *   start the app's own profile anyway;
 * - removing only when the setting was switched off just now on this computer, and only the entries of this very exe – an
 *   entry of another copy (the installed app, another portable) is never touched;
 * - at a start (the setting not changed) nothing is removed – „off” there may be no choice of the user at all (config.json
 *   broken and set aside, gone with a cleaned AppData: the defaults – przegląd 2 N5); with the setting on, only a missing
 *   entry of this exe is written (a portable copy moved to another folder starts again from its new place); old entries
 *   of this exe under other names (B52) go only with a change of the setting. The switch applies to the system before
 *   config.json's write (`config.ts` `changeTray`), so a refused write never leaves the entry behind the setting.
 */

/** An entry of the Run key as Electron gives it (`getLoginItemSettings({ path, args }).launchItems` – of this exe). */
export interface LaunchItem {
  name: string
  path: string
  args: string[]
  /** Windows: false = turned off in Task Manager (the system does not start it). */
  enabled?: boolean
}

/** One call of `app.setLoginItemSettings`. */
export interface LoginWrite {
  openAtLogin: boolean
  name: string
  path: string
  args: string[]
}

export interface LoginContext {
  /** The setting of this computer (config.json `tray.launchAtLogin`). */
  want: boolean
  /** Switched just now (Ustawienia, the start wizard, the banner) – false at a start of the app or a late read of config.json. */
  changed: boolean
  /** The app's own profile (user data where the app keeps it); false = a test or lab run. */
  ownProfile: boolean
  /** Windows (the Run key, `items` known); false = macOS (one login item, no list). */
  windows: boolean
  /** The entry's name of this kind of the app (`loginItemName`), the exe it starts and its arguments. */
  name: string
  path: string
  args: string[]
  /** The Run key's entries of this exe. */
  items: readonly LaunchItem[]
}

const samePath = (a: string, b: string, windows: boolean) => (windows ? a.toLowerCase() === b.toLowerCase() : a === b)
const sameArgs = (a: readonly string[] | undefined, b: readonly string[]) => (a ?? []).length === b.length && b.every((x, i) => a?.[i] === x)

/**
 * Whether the system starts this copy at login now (przegląd 3 N5, T433) – what the switch shows, also when config.json
 * says otherwise (set aside, gone, an entry of an older version): an entry of this exe the system starts (Windows), the
 * app's login item (macOS); null = not known – a test or lab profile, whose entries are never looked at.
 */
export function loginEntryOf(c: { ownProfile: boolean; windows: boolean; path: string; items: readonly LaunchItem[]; openAtLogin?: boolean }): boolean | null {
  if (!c.ownProfile) return null
  if (!c.windows) return c.openAtLogin ?? null
  return c.items.some((i) => samePath(i.path, c.path, true) && i.enabled !== false)
}

/** The writes of the start with the system, in order; [] = nothing to write. */
export function loginItemWrites(c: LoginContext): LoginWrite[] {
  if (!c.ownProfile) return []
  const entry = { name: c.name, path: c.path, args: c.args }
  // macOS: one login item of the app, no list to look at – written when switched, or kept on.
  if (!c.windows) return c.changed || c.want ? [{ openAtLogin: c.want, ...entry }] : []
  const mine = c.items.filter((i) => samePath(i.path, c.path, true))
  const own = mine.find((i) => i.name === c.name)
  // Entries of this exe under other names (before 1.5.3 named after a temporary folder – B52): they would start it twice.
  const stale = mine.filter((i) => i.name !== c.name).map((i): LoginWrite => ({ openAtLogin: false, name: i.name, path: i.path, args: i.args }))
  if (!c.want) return c.changed ? [...(own ? [{ openAtLogin: false, ...entry }] : []), ...stale] : []
  // Ours first: a failed write never leaves the computer without any entry of this exe.
  const write = !own || !sameArgs(own.args, c.args) ? [{ openAtLogin: true, ...entry }] : []
  return [...write, ...(c.changed ? stale : [])]
}
