import type { SettingsTab } from '../../store/ui'

/**
 * The navigation of Ustawienia in groups (UX-44): what the budget shares between computers (fi.json), what only this
 * computer holds (config.json), and the data and the system. Names of the tabs stay as they were (the vocabulary does
 * not change); only their order and the headings are new.
 */
export interface SettingsGroup {
  id: 'budget' | 'machine' | 'data'
  label: string
  tabs: ReadonlyArray<{ id: SettingsTab; label: string }>
}

export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  {
    id: 'budget',
    label: 'Budżet (wspólne)',
    tabs: [
      { id: 'general', label: 'Okręt' },
      { id: 'accounts', label: 'Konta' },
      { id: 'categories', label: 'Kategorie' },
      { id: 'layers', label: 'Warstwy i rozkazy' },
      { id: 'household', label: 'Domownicy' },
      { id: 'import', label: 'Import z banku' }
    ]
  },
  {
    id: 'machine',
    label: 'Ten komputer',
    tabs: [
      { id: 'ictj', label: 'ICTTJ' },
      { id: 'notify', label: 'Powiadomienia i dźwięki' },
      { id: 'view', label: 'Wygląd i prywatność' },
      { id: 'system', label: 'Zasobnik i start' }
    ]
  },
  {
    id: 'data',
    label: 'Dane i system',
    tabs: [
      { id: 'folder', label: 'Folder i kopie' },
      { id: 'updates', label: 'Aktualizacje' }
    ]
  }
]

/** Every tab, in the order of the groups (the palette's list and the lookups of a label). */
export const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = SETTINGS_GROUPS.flatMap((g) => g.tabs.map((t) => ({ ...t })))

export const isSettingsTab = (v: unknown): v is SettingsTab => typeof v === 'string' && SETTINGS_TABS.some((t) => t.id === v)

const KEY = 'fi.settings.tab'

/** The tab shown last, on this computer (`localStorage`, like the other small choices of the view); none = `general`. */
export function readSettingsTab(): SettingsTab {
  try {
    const v = localStorage.getItem(KEY)
    return isSettingsTab(v) ? v : 'general'
  } catch {
    return 'general'
  }
}

export function rememberSettingsTab(tab: SettingsTab): void {
  try {
    localStorage.setItem(KEY, tab)
  } catch {
    // A full or blocked storage: the memory is only a convenience.
  }
}
