import { describe, expect, it } from 'vitest'
import { alarmText } from '@shared/calc/briefing'
import { ACHIEVEMENT_INFO, MISSION_TITLE, RANK_GENITIVE, RANK_LABEL, RANKS, VIOLATION_LABEL } from '@shared/calc/game'
import { DEFAULT_MACHINE_PREFS, HIDE_IDLE_CHOICES, clampZoom, machinePrefsFrom, patchMachinePrefs, zoomFromKey, zoomStep, type KeyInput } from '@shared/machine'
import { PAGE_LABELS } from '@shared/panels'
import { formatPln } from '@shared/format'

const key = (over: Partial<KeyInput>): KeyInput => ({ key: '', code: '', control: true, meta: false, alt: false, shift: false, ...over })

describe('rozmiar interfejsu (1.6.6, F30)', () => {
  it('kroki po 10 % w granicach 90–150 %, rozmiar spoza siatki dochodzi do niej', () => {
    expect(zoomStep(1, 1)).toBe(1.1)
    expect(zoomStep(1, -1)).toBe(0.9)
    expect(zoomStep(1.1, 1)).toBe(1.2)
    expect(zoomStep(1.1, -1)).toBe(1)
    expect(zoomStep(1.5, 1)).toBe(1.5)
    expect(zoomStep(0.9, -1)).toBe(0.9)
    expect(zoomStep(1.25, 1)).toBe(1.3)
    expect(zoomStep(1.25, -1)).toBe(1.2)
    expect(clampZoom(3)).toBe(1.5)
    expect(clampZoom(0.2)).toBe(0.9)
    expect(clampZoom(1.234)).toBe(1.23)
  })

  it('klawisze: Ctrl+Plus (też Ctrl+= i plus z klawiatury numerycznej), Ctrl+Minus, Ctrl+Shift+0 = 100 %; reszta nie', () => {
    expect(zoomFromKey(key({ key: '+', shift: true, code: 'Equal' }), 1)).toBe(1.1)
    expect(zoomFromKey(key({ key: '=', code: 'Equal' }), 1)).toBe(1.1)
    expect(zoomFromKey(key({ key: '+', code: 'NumpadAdd' }), 1.2)).toBe(1.3)
    expect(zoomFromKey(key({ key: '-', code: 'Minus' }), 1.2)).toBe(1.1)
    expect(zoomFromKey(key({ key: '-', code: 'NumpadSubtract' }), 1)).toBe(0.9)
    expect(zoomFromKey(key({ key: ')', code: 'Digit0', shift: true }), 1.4)).toBe(1)
    // Ctrl+0 is Raporty; without Ctrl or with Alt (AltGr) – not the size.
    expect(zoomFromKey(key({ key: '0', code: 'Digit0' }), 1.4)).toBeNull()
    expect(zoomFromKey(key({ key: '+', control: false }), 1)).toBeNull()
    expect(zoomFromKey(key({ key: '+', alt: true }), 1)).toBeNull()
    expect(zoomFromKey(key({ key: '$', code: 'Digit4', shift: true }), 1)).toBeNull()
  })
})

describe('ustawienia komputera: rozmiar, kontrast, ukrywanie kwot (1.6.6, F30, F40)', () => {
  it('domyślnie jak ICTTJ: 100 %, zwykły kontrast, bez ukrywania po bezczynności i przy starcie', () => {
    expect(DEFAULT_MACHINE_PREFS).toMatchObject({ zoom: 1, highContrast: false, hideIdleMin: 0, hideOnStart: false })
    expect(machinePrefsFrom({})).toMatchObject({ zoom: 1, highContrast: false, hideIdleMin: 0, hideOnStart: false })
    expect(HIDE_IDLE_CHOICES[0]).toBe(0)
  })

  it('wartości z pliku ręcznie poprawionego: rozmiar w granicach, minuty całkowite 0–240, reszta domyślna', () => {
    expect(machinePrefsFrom({ zoom: 3, hideIdleMin: 10, hideOnStart: true, highContrast: true })).toMatchObject({ zoom: 1.5, hideIdleMin: 10, hideOnStart: true, highContrast: true })
    expect(machinePrefsFrom({ zoom: 'duży', hideIdleMin: -1 })).toMatchObject({ zoom: 1, hideIdleMin: 0 })
    expect(machinePrefsFrom({ zoom: Number.NaN, hideIdleMin: 2.5 })).toMatchObject({ zoom: 1, hideIdleMin: 0 })
    expect(machinePrefsFrom({ hideIdleMin: 241 }).hideIdleMin).toBe(0)
    // One field changed – the others kept.
    const p = patchMachinePrefs(machinePrefsFrom({ zoom: 1.2, hideAmounts: true }), { hideIdleMin: 5 })
    expect(p).toMatchObject({ zoom: 1.2, hideAmounts: true, hideIdleMin: 5 })
  })
})

describe('teksty (1.6.6, N31, N33, N61, N72)', () => {
  const zl = (g: number) => `${formatPln(g)} zł`

  it('alarmy z prawdziwą nazwą obok metafory (D34)', () => {
    type A = Parameters<typeof alarmText>[0]
    const text = (kind: string, amount: number) => alarmText({ kind, date: '2026-10-10', amount } as unknown as A, () => '', zl)
    expect(text('salary-from-hull', 50000)).toMatch(/kadłuba \(funduszu awaryjnego\).*osłonach \(buforze na pensje\)/)
    expect(text('cargo-over', 150000)).toMatch(/stałe koszty 1\s500,00 zł\/mies\./)
    expect(text('correction', 1200)).toMatch(/^Rozbieżność salda: korekta 12,00 zł/)
    expect(text('salary-above-income', 1000)).toMatch(/do 6 ostatnich mies\./)
  })

  it('gra: stopień w dopełniaczu po „do stopnia”, misja domowników, metafory z nazwą', () => {
    for (const r of RANKS) expect(RANK_GENITIVE[r]).toMatch(/(a|ego)$/)
    expect(RANK_GENITIVE.ensign).toBe('chorążego')
    expect(RANK_LABEL.ensign).toBe('Chorąży')
    expect(MISSION_TITLE.house).toBe('Rozliczenie z domownikami')
    expect(VIOLATION_LABEL.shields).toMatch(/bufor na pensje/)
    expect(VIOLATION_LABEL.cargo).toMatch(/stałe koszty/)
    expect(ACHIEVEMENT_INFO.hull.text).toMatch(/fundusz awaryjny/)
  })

  it('menu „Układ”: strony po polsku – także kreator i meldunki', () => {
    expect(PAGE_LABELS.wizard).toBe('Kreator startu')
    expect(PAGE_LABELS.inbox).toBe('Meldunki')
  })
})
