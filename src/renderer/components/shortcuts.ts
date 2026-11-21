/**
 * The window's shortcuts as people read them (UX-53, UX-63): one format – „Ctrl+Shift+4” – in the menu, the palette,
 * the page bar and the help (F1). The format of the quick entry's own shortcut is `shortcutLabel` (`@shared/machine`).
 */
export const KEYS = {
  palette: 'Ctrl+K',
  newOperation: 'Ctrl+N',
  save: 'Ctrl+S',
  /** On a Polish keyboard the dollar sign needs Shift+4 – said both ways (UX-63). */
  hideAmounts: 'Ctrl+Shift+4 ($)',
  sync: 'Ctrl+Shift+Y',
  inbox: 'Ctrl+Shift+M',
  settings: 'Ctrl+,',
  help: '? / F1'
} as const

/** Ctrl + the screen's digit (Ctrl+1…0 in the menu's order). */
export const pageKeys = (key: string): string => `Ctrl+${key}`
