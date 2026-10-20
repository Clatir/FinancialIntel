/**
 * Preferences of this computer (spec, „Dane i synchronizacja”: the shortcut, notifications, sounds and the hiding of
 * amounts live in config.json, never on OneDrive): defaults and a reader that keeps what it knows from a hand-edited or
 * older file.
 */
export const SOUND_KINDS = ['entry', 'docking', 'alarm', 'promotion', 'plus'] as const
export type SoundKind = (typeof SOUND_KINDS)[number]

export const SOUND_LABEL: Record<SoundKind, string> = {
  entry: 'Wpis operacji',
  docking: 'Dokowanie dostawy',
  alarm: 'Alarm',
  promotion: 'Awans',
  plus: 'Miesiąc zamknięty na plus'
}

/** Notifications (spec, „Powiadomienia”): each with its own switch; the evening one with its time. */
export interface NotifyPrefs {
  /** The morning briefing: at the first opening of the window after the quiet hours. */
  briefing: boolean
  /** „Raport wachty dnia: dopisz dzisiejsze wydatki” at this time. */
  evening: boolean
  eveningTime: string
  /** Today's energy below 20% or an envelope above 80%. */
  low: boolean
  /** Today's allowance or an envelope overrun. */
  overrun: boolean
  /** A periodic fee (asteroid) 14 and 3 days before its month. */
  asteroid: boolean
  /** A fixed fee (a container) 3 days after its due without a payment (F1). */
  cargo: boolean
  /** No import from mBank for 3 days. */
  importOverdue: boolean
  /** Confirm the balances on Sunday. */
  balances: boolean
  /** The debriefing from the 1st of the month. */
  debriefing: boolean
  /** The watch report on Sunday from 18:00 (E8). */
  watch: boolean
  /** A new payout in ICTTJ to dock (E5). */
  ictj: boolean
  /** An installment of a loan 3 days late (E6). */
  loans: boolean
  /** PIT-38: 14 and 3 days before 30 April (E6). */
  pit38: boolean
  /** A household member owes for longer than 30 days (D80). */
  house: boolean
  /** A planned operation or term before its day, a late one, a container's end (F16). */
  plans: boolean
  /** An account short before a payment (F26). */
  accounts: boolean
  /** The cargo hold's watch (1.9.0, F9, F23): a container's new price, one gone quiet, a fee new in the history. */
  cargoWatch: boolean
  /** An unknown signal (1.9.0, F31): an unusual amount, a new payee, a possible double charge. */
  anomalies: boolean
  /** A return of money not come by its day (1.9.0, F34). */
  returns: boolean
}

export interface SoundPrefs {
  enabled: boolean
  /** 0–1. */
  volume: number
  events: Record<SoundKind, boolean>
}

export interface MachinePrefs {
  /** The quick entry's global shortcut, an Electron accelerator ('' = none). */
  quickShortcut: string
  /** Amounts masked in the window and the tray's tooltip (Ctrl+$). */
  hideAmounts: boolean
  /** Hidden by themselves after this many minutes without a move of the mouse or a key in the system (F40); 0 = never. */
  hideIdleMin: number
  /** Every start of the app with the amounts hidden (F40). */
  hideOnStart: boolean
  /** The size of every window of the app on this computer (F30): 0.9–1.5, 1 = as ICTTJ. */
  zoom: number
  /** Brighter dimmed texts and the smallest ones at 12 px (F30). */
  highContrast: boolean
  /** New files of mBank looked for in Pobrane and the last folder of the import (1.9.0, F14). */
  bankFiles: boolean
  notify: NotifyPrefs
  sounds: SoundPrefs
}

export const DEFAULT_QUICK_SHORTCUT = 'Control+Alt+B'

/**
 * Ctrl+Alt+letter is AltGr+letter on the Polish keyboard (B29, D86): ą ć ę ł ń ó ś ź ż – and € on U; with Shift the
 * capitals (Ą … Ż). A global shortcut there would take the letter from every program, so it is never set; with the
 * Windows key it is free.
 */
export const ALTGR_CHARS: Readonly<Record<string, string>> = { A: 'ą', C: 'ć', E: 'ę', L: 'ł', N: 'ń', O: 'ó', S: 'ś', U: '€', X: 'ź', Z: 'ż' }

const CTRL_NAMES = new Set(['control', 'ctrl', 'commandorcontrol', 'cmdorctrl'])

/** The AltGr character a global shortcut would take ('ś' for Ctrl+Alt+S, 'Ś' with Shift); null = no conflict. */
export function altGrConflict(accelerator: string): string | null {
  const parts = accelerator.split('+').map((p) => p.trim().toLowerCase())
  const key = (parts.pop() ?? '').toUpperCase()
  const mods = new Set(parts.map((m) => (CTRL_NAMES.has(m) ? 'control' : m === 'option' ? 'alt' : m)))
  const altGr = mods.has('altgr') || (mods.has('control') && mods.has('alt'))
  const free = mods.has('super') || mods.has('meta') || mods.has('command') || mods.has('cmd')
  const char = altGr && !free ? (ALTGR_CHARS[key] ?? null) : null
  return char && mods.has('shift') ? char.toUpperCase() : char
}

/** The window's size (F30): 90–150 % in steps of 10. */
export const ZOOM_MIN = 0.9
export const ZOOM_MAX = 1.5
export const ZOOM_STEP = 0.1

/** A size within the bounds, to a whole per cent. */
export const clampZoom = (z: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100))

/** One step bigger or smaller, on the grid of 10 % (an odd size from a hand-edited file snaps to it). */
export const zoomStep = (z: number, dir: 1 | -1): number => clampZoom((dir > 0 ? Math.floor(z * 10 + 1e-6) + 1 : Math.ceil(z * 10 - 1e-6) - 1) / 10)

/** A key pressed in a window (its keydown). */
export interface KeyInput {
  key: string
  code: string
  control: boolean
  meta: boolean
  alt: boolean
  shift: boolean
}

/** A key of the size (F30): one step bigger, one step smaller, 100 %. */
export type ZoomKey = 'in' | 'out' | 'reset'

export const isZoomKey = (v: unknown): v is ZoomKey => v === 'in' || v === 'out' || v === 'reset'

/**
 * The key of the size a window's key is (F30), null = not one: Ctrl+Plus (also Ctrl+= and the numeric keypad's plus),
 * Ctrl+Minus, Ctrl+Shift+0 = 100 % (Ctrl+0 is Raporty); AltGr (Ctrl+Alt) never. The application menu is off – nothing
 * else zooms.
 */
export function zoomKeyOf(input: KeyInput): ZoomKey | null {
  if (!(input.control || input.meta) || input.alt) return null
  if (input.key === '+' || input.key === '=' || input.code === 'NumpadAdd') return 'in'
  if (input.key === '-' || input.code === 'NumpadSubtract' || input.code === 'Minus') return 'out'
  if (input.shift && input.code === 'Digit0') return 'reset'
  return null
}

/**
 * The size after the key – worked out by the main process from the size it has, never by the window: its copy of the
 * preferences may not have another window's change yet (T300).
 */
export const zoomByKey = (zoom: number, key: ZoomKey): number => (key === 'reset' ? 1 : zoomStep(zoom, key === 'in' ? 1 : -1))

/** The idle times offered (F40), in minutes; 0 = never. */
export const HIDE_IDLE_CHOICES = [0, 1, 5, 10, 15, 30, 60] as const

export const DEFAULT_MACHINE_PREFS: MachinePrefs = {
  quickShortcut: DEFAULT_QUICK_SHORTCUT,
  hideAmounts: false,
  hideIdleMin: 0,
  hideOnStart: false,
  zoom: 1,
  highContrast: false,
  bankFiles: true,
  notify: { briefing: true, evening: true, eveningTime: '21:00', low: true, overrun: true, asteroid: true, cargo: true, importOverdue: true, balances: true, debriefing: true, watch: true, ictj: true, loans: true, pit38: true, house: true, plans: true, accounts: true, cargoWatch: true, anomalies: true, returns: true },
  // Sounds on and quiet (D70).
  sounds: { enabled: true, volume: 0.3, events: { entry: true, docking: true, alarm: true, promotion: true, plus: true } }
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
const clock = (v: unknown, d: string) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d)

/** The preferences from config.json: what is missing or wrong takes the default. */
export function machinePrefsFrom(raw: unknown): MachinePrefs {
  const r = obj(raw)
  const n = obj(r.notify)
  const s = obj(r.sounds)
  const e = obj(s.events)
  const d = DEFAULT_MACHINE_PREFS
  const volume = typeof s.volume === 'number' && Number.isFinite(s.volume) ? Math.min(1, Math.max(0, s.volume)) : d.sounds.volume
  return {
    // One that takes a Polish letter (set before 1.5.3, a hand-edited file) gives way to the default (B29).
    quickShortcut: typeof r.quickShortcut === 'string' && r.quickShortcut.length <= 60 && !altGrConflict(r.quickShortcut) ? r.quickShortcut : d.quickShortcut,
    hideAmounts: bool(r.hideAmounts, d.hideAmounts),
    hideIdleMin: typeof r.hideIdleMin === 'number' && Number.isInteger(r.hideIdleMin) && r.hideIdleMin >= 0 && r.hideIdleMin <= 240 ? r.hideIdleMin : d.hideIdleMin,
    hideOnStart: bool(r.hideOnStart, d.hideOnStart),
    zoom: typeof r.zoom === 'number' && Number.isFinite(r.zoom) ? clampZoom(r.zoom) : d.zoom,
    highContrast: bool(r.highContrast, d.highContrast),
    bankFiles: bool(r.bankFiles, d.bankFiles),
    notify: {
      briefing: bool(n.briefing, d.notify.briefing),
      evening: bool(n.evening, d.notify.evening),
      eveningTime: clock(n.eveningTime, d.notify.eveningTime),
      low: bool(n.low, d.notify.low),
      overrun: bool(n.overrun, d.notify.overrun),
      asteroid: bool(n.asteroid, d.notify.asteroid),
      cargo: bool(n.cargo, d.notify.cargo),
      importOverdue: bool(n.importOverdue, d.notify.importOverdue),
      balances: bool(n.balances, d.notify.balances),
      debriefing: bool(n.debriefing, d.notify.debriefing),
      ictj: bool(n.ictj, d.notify.ictj),
      loans: bool(n.loans, d.notify.loans),
      pit38: bool(n.pit38, d.notify.pit38),
      house: bool(n.house, d.notify.house),
      plans: bool(n.plans, d.notify.plans),
      accounts: bool(n.accounts, d.notify.accounts),
      cargoWatch: bool(n.cargoWatch, d.notify.cargoWatch),
      anomalies: bool(n.anomalies, d.notify.anomalies),
      returns: bool(n.returns, d.notify.returns),
      watch: bool(n.watch, d.notify.watch)
    },
    sounds: {
      enabled: bool(s.enabled, d.sounds.enabled),
      volume,
      events: Object.fromEntries(Object.keys(d.sounds.events).map((k) => [k, bool(e[k], d.sounds.events[k as SoundKind])])) as Record<SoundKind, boolean>
    }
  }
}

/** A patch of the preferences (one section at a time) over the current ones. */
export function patchMachinePrefs(cur: MachinePrefs, patch: unknown): MachinePrefs {
  const p = obj(patch)
  return machinePrefsFrom({
    ...cur,
    ...p,
    notify: { ...cur.notify, ...obj(p.notify) },
    sounds: { ...cur.sounds, ...obj(p.sounds), events: { ...cur.sounds.events, ...obj(obj(p.sounds).events) } }
  })
}

/** „Ctrl+Alt+B” as people read it, from the accelerator 'Control+Alt+B'. */
export function shortcutLabel(accelerator: string): string {
  return accelerator.replace(/Control|CommandOrControl|CmdOrCtrl/g, 'Ctrl')
}
