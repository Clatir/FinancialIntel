import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { searchRecords } from '@shared/search'

// Z9 (1.21.0, UX-19, 44, 45, 78): Ustawienia in groups, the notifications' switches in groups, the last tab remembered,
// the palette's index of the settings complete, the rescan told. The renderer modules are loaded by a path in a variable
// (as `shell-z3-store.test.ts`): the files stay in the node project.
const store = new Map<string, string>()
let storageBroken = false
vi.stubGlobal('localStorage', {
  getItem: (k: string) => {
    if (storageBroken) throw new Error('blocked')
    return store.get(k) ?? null
  },
  setItem: (k: string, v: string) => {
    if (storageBroken) throw new Error('blocked')
    store.set(k, v)
  },
  removeItem: (k: string) => void store.delete(k)
})
let rescan: () => Promise<void> = async () => undefined
vi.stubGlobal('window', Object.assign(new EventTarget(), { fi: { rescan: () => rescan() } }))

interface NavModule {
  SETTINGS_GROUPS: ReadonlyArray<{ id: string; label: string; tabs: ReadonlyArray<{ id: string; label: string }> }>
  SETTINGS_TABS: Array<{ id: string; label: string }>
  isSettingsTab: (v: unknown) => boolean
  readSettingsTab: () => string
  rememberSettingsTab: (t: string) => void
}
interface NotifyModule {
  NOTIFY_GROUPS: ReadonlyArray<{ id: string; label: string; rows: ReadonlyArray<[string, string]> }>
  NOTIFY_KEYS: readonly string[]
  notifyCount: (n: typeof DEFAULT_MACHINE_PREFS.notify, keys?: readonly string[]) => { on: number; all: number }
  notifySetAll: (n: typeof DEFAULT_MACHINE_PREFS.notify, keys: readonly string[], on: boolean) => typeof DEFAULT_MACHINE_PREFS.notify
}
interface ItemsModule {
  SETTINGS_ITEMS: ReadonlyArray<{ id: string; label: string; tab: string; words?: string }>
}
const load = <T,>(p: string): Promise<T> => import(p) as Promise<T>
const nav = await load<NavModule>('@renderer/features/settings/settingsNav')
const notify = await load<NotifyModule>('@renderer/features/settings/notifyGroups')
const items = await load<ItemsModule>('@renderer/features/palette/settingsItems')
const rescanModule = await load<{ rescanWithToast: (done?: string) => Promise<void> }>('@renderer/features/sync/rescan')
const ui = await load<{ useUi: { getState: () => { toasts: Array<{ text: string; kind: string }> }; setState: (s: Record<string, unknown>) => void } }>('@renderer/store/ui')
const root = resolve(__dirname, '../..')
const read = (p: string): string => readFileSync(resolve(root, p), 'utf8')

const ALL_TABS = ['general', 'accounts', 'categories', 'layers', 'household', 'import', 'ictj', 'notify', 'view', 'folder', 'system', 'updates']

describe('UX-44: Ustawienia w grupach', () => {
  it('trzy grupy w ustalonej kolejności, każda zakładka w jednej z nich dokładnie raz', () => {
    expect(nav.SETTINGS_GROUPS.map((g) => g.label)).toEqual(['Budżet (wspólne)', 'Ten komputer', 'Dane i system'])
    expect(nav.SETTINGS_TABS.map((t) => t.id).sort()).toEqual([...ALL_TABS].sort())
  })

  it('nazwy zakładek bez zmian (słownik się nie zmienia)', () => {
    const label = Object.fromEntries(nav.SETTINGS_TABS.map((t) => [t.id, t.label]))
    expect(label).toEqual({
      general: 'Okręt',
      accounts: 'Konta',
      categories: 'Kategorie',
      layers: 'Warstwy i rozkazy',
      household: 'Domownicy',
      import: 'Import z banku',
      ictj: 'ICTTJ',
      notify: 'Powiadomienia i dźwięki',
      view: 'Wygląd i prywatność',
      folder: 'Folder i kopie',
      system: 'Zasobnik i start',
      updates: 'Aktualizacje'
    })
  })

  it('ustawienia budżetu (fi.json) są w pierwszej grupie, reszta – nie', () => {
    expect(nav.SETTINGS_GROUPS[0]!.tabs.map((t) => t.id)).toEqual(['general', 'accounts', 'categories', 'layers', 'household', 'import'])
  })
})

describe('UX-78: pamięć ostatniej zakładki Ustawień', () => {
  beforeEach(() => {
    store.clear()
    storageBroken = false
  })

  it('bez pamięci – „Okręt”; zapamiętana zakładka wraca', () => {
    expect(nav.readSettingsTab()).toBe('general')
    nav.rememberSettingsTab('folder')
    expect(nav.readSettingsTab()).toBe('folder')
  })

  it('nieznana wartość w pamięci (inna wersja) – „Okręt”', () => {
    store.set('fi.settings.tab', 'nie-ma-takiej')
    expect(nav.readSettingsTab()).toBe('general')
  })

  it('zablokowana pamięć nie psuje okna', () => {
    storageBroken = true
    expect(() => nav.rememberSettingsTab('view')).not.toThrow()
    expect(nav.readSettingsTab()).toBe('general')
  })

  it('SettingsPage zapamiętuje pokazaną zakładkę i bez nazwanej otwiera ostatnią', () => {
    const src = read('src/renderer/features/settings/SettingsPage.tsx')
    expect(src).toMatch(/route\.tab\) \|\| readSettingsTab\(\)/)
    expect(src).toMatch(/rememberSettingsTab\(tab\)/)
  })
})

describe('UX-45: powiadomienia w grupach', () => {
  const switches = Object.entries(DEFAULT_MACHINE_PREFS.notify)
    .filter(([, v]) => typeof v === 'boolean')
    .map(([k]) => k)

  it('każdy przełącznik z NotifyPrefs jest w jednej grupie, dokładnie raz (20)', () => {
    expect(notify.NOTIFY_KEYS).toHaveLength(20)
    expect([...notify.NOTIFY_KEYS].sort()).toEqual([...switches].sort())
  })

  it('liczy włączone: domyślnie wszystkie; po wyłączeniu jednego – 19 z 20', () => {
    expect(notify.notifyCount(DEFAULT_MACHINE_PREFS.notify)).toEqual({ on: 20, all: 20 })
    expect(notify.notifyCount({ ...DEFAULT_MACHINE_PREFS.notify, loans: false })).toEqual({ on: 19, all: 20 })
  })

  it('„wyłącz wszystkie” i „włącz wszystkie” zostawiają godziny, grupa rusza tylko swoje', () => {
    const n = { ...DEFAULT_MACHINE_PREFS.notify, briefingTime: '07:30', eveningTime: '20:15' }
    const off = notify.notifySetAll(n, notify.NOTIFY_KEYS, false)
    expect(notify.notifyCount(off)).toEqual({ on: 0, all: 20 })
    expect(off.briefingTime).toBe('07:30')
    expect(off.eveningTime).toBe('20:15')
    const keys = notify.NOTIFY_GROUPS[1]!.rows.map(([k]) => k)
    const some = notify.notifySetAll(off, keys, true)
    expect(notify.notifyCount(some)).toEqual({ on: keys.length, all: 20 })
    expect(notify.notifyCount(some, keys)).toEqual({ on: keys.length, all: keys.length })
  })
})

describe('UX-19 / UX-78: indeks ustawień w palecie', () => {
  it('każda pozycja wskazuje istniejącą zakładkę, identyfikatory się nie powtarzają, każda zakładka ma pozycję', () => {
    const ids = items.SETTINGS_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const i of items.SETTINGS_ITEMS) expect(nav.isSettingsTab(i.tab), i.id).toBe(true)
    for (const t of ALL_TABS) expect(items.SETTINGS_ITEMS.some((i) => i.tab === t), t).toBe(true)
  })

  it('brakujące wcześniej: tryb scalania, progi gry, pliki w Pobranych, „Ustaw na tym komputerze” – na swoich zakładkach', () => {
    const tab = (id: string) => items.SETTINGS_ITEMS.find((i) => i.id === id)?.tab
    expect(tab('merge-mode')).toBe('folder')
    expect(tab('game')).toBe('layers')
    expect(tab('bank-files')).toBe('import')
    expect(tab('machine-setup')).toBe('folder')
    // The quick entry's shortcut moved to the tray's tab.
    expect(tab('shortcut')).toBe('system')
  })

  it('szukanie po słowach znajduje te pozycje', () => {
    const find = (q: string) =>
      searchRecords(q, {
        transactions: [],
        containers: [],
        goals: [],
        loans: [],
        members: [],
        settings: items.SETTINGS_ITEMS,
        ctx: {} as never
      }).settings.map((s) => s.id)
    expect(find('tryb scalania')).toContain('merge-mode')
    expect(find('progi gry')).toContain('game')
    expect(find('pobrane')).toContain('bank-files')
    expect(find('ustaw na tym komputerze')).toContain('machine-setup')
  })
})

describe('UX-19: „Przeskanuj teraz” mówi o błędzie', () => {
  beforeEach(() => ui.useUi.setState({ toasts: [] }))

  it('udane skanowanie – toast z potwierdzeniem', async () => {
    rescan = async () => undefined
    await rescanModule.rescanWithToast()
    expect(ui.useUi.getState().toasts.map((t) => t.kind)).toEqual(['success'])
  })

  it('nieudane – toast z błędem, bez odrzuconej obietnicy', async () => {
    rescan = async () => {
      throw new Error('Folder jest zajęty')
    }
    await expect(rescanModule.rescanWithToast()).resolves.toBeUndefined()
    const t = ui.useUi.getState().toasts
    expect(t).toHaveLength(1)
    expect(t[0]!.kind).toBe('error')
  })

  it('Synchronizacja i Ustawienia używają wspólnego pomocnika', () => {
    expect(read('src/renderer/features/sync/SyncPage.tsx')).not.toMatch(/api\.rescan\(\)\.then/)
    expect(read('src/renderer/features/settings/SettingsPage.tsx')).not.toMatch(/api\.rescan\(\)\.then/)
  })
})
