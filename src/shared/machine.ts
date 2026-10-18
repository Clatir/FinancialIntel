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
  notify: NotifyPrefs
  sounds: SoundPrefs
}

export const DEFAULT_QUICK_SHORTCUT = 'Control+Alt+B'

export const DEFAULT_MACHINE_PREFS: MachinePrefs = {
  quickShortcut: DEFAULT_QUICK_SHORTCUT,
  hideAmounts: false,
  notify: { briefing: true, evening: true, eveningTime: '21:00', low: true, overrun: true, asteroid: true, importOverdue: true, balances: true, debriefing: true, watch: true, ictj: true, loans: true, pit38: true, house: true },
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
    quickShortcut: typeof r.quickShortcut === 'string' && r.quickShortcut.length <= 60 ? r.quickShortcut : d.quickShortcut,
    hideAmounts: bool(r.hideAmounts, d.hideAmounts),
    notify: {
      briefing: bool(n.briefing, d.notify.briefing),
      evening: bool(n.evening, d.notify.evening),
      eveningTime: clock(n.eveningTime, d.notify.eveningTime),
      low: bool(n.low, d.notify.low),
      overrun: bool(n.overrun, d.notify.overrun),
      asteroid: bool(n.asteroid, d.notify.asteroid),
      importOverdue: bool(n.importOverdue, d.notify.importOverdue),
      balances: bool(n.balances, d.notify.balances),
      debriefing: bool(n.debriefing, d.notify.debriefing),
      ictj: bool(n.ictj, d.notify.ictj),
      loans: bool(n.loans, d.notify.loans),
      pit38: bool(n.pit38, d.notify.pit38),
      house: bool(n.house, d.notify.house),
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
