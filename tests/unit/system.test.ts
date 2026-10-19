import { describe, expect, it } from 'vitest'
import { windowBounds } from '@shared/bounds'
import { DEFAULT_QUICK_SHORTCUT, altGrConflict, machinePrefsFrom } from '@shared/machine'
import { SAVED, unsavedQuestion } from '@shared/unsaved'

describe('system (1.5.3, grupa J)', () => {
  it('skrót Ctrl+Alt+litera polskiego znaku to AltGr – nie do ustawienia, ustawiony wraca do domyślnego (B29)', () => {
    expect(altGrConflict('Control+Alt+S')).toBe('ś')
    expect(altGrConflict('Alt+Control+Z')).toBe('ż')
    expect(altGrConflict('CommandOrControl+Alt+u')).toBe('€')
    expect(altGrConflict('AltGr+L')).toBe('ł')
    // With Shift – the capital letter (AltGr+Shift+S = „Ś”); the Windows key makes it free; other letters are not AltGr
    // characters.
    expect(altGrConflict('Control+Alt+Shift+S')).toBe('Ś')
    expect(altGrConflict('Control+Super+S')).toBeNull()
    expect(altGrConflict('Control+Alt+B')).toBeNull()
    expect(altGrConflict('Control+Shift+S')).toBeNull()
    expect(machinePrefsFrom({ quickShortcut: 'Control+Alt+E' }).quickShortcut).toBe(DEFAULT_QUICK_SHORTCUT)
    expect(machinePrefsFrom({ quickShortcut: 'Control+Alt+Shift+E' }).quickShortcut).toBe(DEFAULT_QUICK_SHORTCUT)
    expect(machinePrefsFrom({ quickShortcut: 'Control+Alt+D' }).quickShortcut).toBe('Control+Alt+D')
    expect(machinePrefsFrom({ quickShortcut: '' }).quickShortcut).toBe('')
  })

  it('okno zapamiętane na odłączonym monitorze otwiera się na głównym ekranie (B54)', () => {
    const primary = { x: 0, y: 0, width: 1920, height: 1040 }
    const external = { x: 1920, y: 0, width: 2560, height: 1400 }
    const saved = { x: 2200, y: 100, width: 1600, height: 1000 }
    // The monitor is here: the window where it was.
    expect(windowBounds(saved, [primary, external], primary)).toEqual(saved)
    // Gone: no position (centred), the size within the primary display.
    expect(windowBounds(saved, [primary], primary)).toEqual({ width: 1600, height: 1000 })
    expect(windowBounds({ ...saved, width: 2400, height: 1300 }, [primary], primary)).toEqual({ width: 1920, height: 1040 })
    // A title bar only a sliver on the screen (or above it) is not enough.
    expect(windowBounds({ x: 1880, y: 100, width: 1600, height: 1000 }, [primary], primary)).toEqual({ width: 1600, height: 1000 })
    expect(windowBounds({ x: 100, y: -20, width: 1600, height: 1000 }, [primary], primary)).toEqual({ width: 1600, height: 1000 })
    expect(windowBounds(null, [primary], primary)).toEqual({ width: 1440, height: 900 })
  })
})

describe('pytanie przy zamykaniu z niezapisanymi zmianami (1.6.5, B108, B67)', () => {
  it('przyczyna: decyzja o zmianach z drugiego komputera, błąd zapisu, wpis nowszej wersji', () => {
    const waiting = unsavedQuestion({ saved: false, waiting: 2, newer: 0, error: null })
    expect(waiting.message).toBe('Zdecyduj o zmianach z drugiego komputera (2).')
    expect(waiting.detail).not.toMatch(/zablokowany/)
    const failed = unsavedQuestion({ saved: false, waiting: 0, newer: 1, error: 'EBUSY: plik zablokowany.' })
    // A write that may still work goes first – and says its reason once, without a doubled full stop.
    expect(failed.detail).toMatch(/^Powód: EBUSY: plik zablokowany\. Folder danych może być niedostępny/)
    const newer = unsavedQuestion({ saved: false, waiting: 0, newer: 1, error: null })
    expect(newer.detail).toMatch(/nowsza wersja aplikacji/)
    expect(newer.detail).toMatch(/Zaktualizuj aplikację/)
    expect(SAVED.saved).toBe(true)
  })
})
