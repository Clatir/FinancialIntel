// adapted from ICTTJ tests/unit/panels.test.ts @ 84a8339
import { describe, expect, it } from 'vitest'
import {
  clampPanelHeight,
  COLUMNS_STORAGE_KEY,
  columnsTemplate,
  dragColumns,
  dragPane,
  hiddenPanels,
  isEmptyPageLayout,
  mergePanelLayout,
  PAGE_LABELS,
  pageLayoutOf,
  panelKey,
  panelName,
  PANELS_STORAGE_KEY,
  parseColumnLayouts,
  parsePanelLayouts,
  parseTrackWidths,
  samePageLayout,
  visibleColumnsKey,
  visibleTemplate,
  withPageLayout
} from '@shared/panels'
import { settingsSchema } from '@shared/schema'

describe('układ paneli', () => {
  it('nazwa panelu z tytułu: bez liczników, nawiasy bez liczb zostają', () => {
    expect(panelName('Stan okrętu')).toBe('Stan okrętu')
    expect(panelName('Operacje (3)')).toBe('Operacje')
    expect(panelName('Koperty (12) – ✎ edycja')).toBe('Koperty – ✎ edycja')
    expect(panelName('Zasięg (dni) i bufor')).toBe('Zasięg (dni) i bufor')
    expect(panelName('Do dokowania – wpływy z mBanku (5 operacji)')).toBe('Do dokowania – wpływy z mBanku')
    expect(panelName('Wydatki miesiąca (średnia 6, zmierzone: 4)')).toBe('Wydatki miesiąca')
    expect(panelName('Podgląd – 2026-09')).toBe('Podgląd')
    expect(panelName(null)).toBeNull()
    expect(panelName({})).toBeNull()
    expect(panelName('12')).toBeNull()
    expect(panelKey('bridge', 'Stan okrętu')).toBe('bridge:Stan okrętu')
  })

  it('zapisany układ: tylko poprawne wpisy, wysokość w granicach; zmiana usuwa pusty wpis', () => {
    expect(parsePanelLayouts('{"a:b":{"collapsed":true},"a:c":{"height":12},"a:d":{"height":"x"},"a:e":null,"a:f":{"height":99999}}')).toEqual({
      'a:b': { collapsed: true },
      'a:c': { height: 60 },
      'a:f': { height: 4000 }
    })
    expect(parsePanelLayouts('nie json')).toEqual({})
    expect(parsePanelLayouts('[1]')).toEqual({})
    expect(parsePanelLayouts(null)).toEqual({})
    expect(clampPanelHeight(240.6)).toBe(241)
    expect(mergePanelLayout(undefined, { collapsed: true })).toEqual({ collapsed: true })
    expect(mergePanelLayout({ collapsed: true }, { height: 300 })).toEqual({ collapsed: true, height: 300 })
    expect(mergePanelLayout({ collapsed: true, height: 300 }, { collapsed: false })).toEqual({ height: 300 })
    expect(mergePanelLayout({ height: 300 }, { height: undefined })).toBeNull()
  })

  it('kolumny: przesunięcie granicy z minimum po obu stronach, szablon proporcjonalny, panel boczny', () => {
    expect(parseTrackWidths('455.5px 420px 503px')).toEqual([455.5, 420, 503])
    expect(dragColumns([400, 400, 500], 0, 120)).toEqual([520, 280, 500])
    expect(dragColumns([400, 400, 500], 1, 500)).toEqual([400, 700, 200]) // the right column keeps 200 px
    expect(dragColumns([400, 400, 500], 0, -500)).toEqual([200, 600, 500])
    expect(dragColumns([150, 400], 0, -100)).toEqual([150, 400]) // already below the minimum: not narrower
    expect(dragColumns([400, 400], 1, 50)).toEqual([400, 400]) // the last column has no boundary to its right
    expect(columnsTemplate([520, 280.04, 150])).toBe('minmax(200px, 520fr) minmax(200px, 280fr) minmax(150px, 150fr)')
    expect(dragPane(340, -120, 'right', 260, 760)).toBe(460)
    expect(dragPane(340, 600, 'right', 260, 760)).toBe(260)
    expect(dragPane(190, 40, 'left', 150, 320)).toBe(230)
    expect(parseColumnLayouts('{"bridge:kolumny":[520,280,500],"x":[],"y":[1,"a"],"z":[-1],"pane:operations:podglad":[460]}')).toEqual({
      'bridge:kolumny': [520, 280, 500],
      'pane:operations:podglad': [460]
    })
    expect(parseColumnLayouts('{')).toEqual({})
  })

  it('ukryty panel: zapisany, scalany i usuwany jak zwinięcie', () => {
    expect(parsePanelLayouts('{"a:b":{"hidden":true},"a:c":{"hidden":"tak"},"a:d":{"hidden":true,"height":300}}')).toEqual({
      'a:b': { hidden: true },
      'a:d': { hidden: true, height: 300 }
    })
    expect(mergePanelLayout(undefined, { hidden: true })).toEqual({ hidden: true })
    expect(mergePanelLayout({ hidden: true }, { hidden: false })).toBeNull()
    expect(mergePanelLayout({ hidden: true, collapsed: true }, { hidden: false })).toEqual({ collapsed: true })
    expect(hiddenPanels('bridge', { 'bridge:Osłony': { hidden: true }, 'bridge:Kadłub': { collapsed: true }, 'month:Koperty': { hidden: true } })).toEqual(['Osłony'])
  })

  it('kolumny z ukrytymi panelami: osobne szerokości dla zestawu widocznych, domyślne tory widocznych', () => {
    const tracks = ['minmax(360px,1fr)', 'minmax(340px,1fr)', 'minmax(420px,1.2fr)']
    expect(visibleColumnsKey('bridge:kolumny', [0, 1, 2], 3)).toBe('bridge:kolumny')
    expect(visibleColumnsKey('bridge:kolumny', [0, 2], 3)).toBe('bridge:kolumny|0,2')
    expect(visibleTemplate(tracks, [0, 1, 2], undefined)).toBe(tracks.join(' '))
    expect(visibleTemplate(tracks, [0, 2], undefined)).toBe('minmax(360px,1fr) minmax(420px,1.2fr)')
    expect(visibleTemplate(tracks, [0, 2], [600, 400])).toBe('minmax(200px, 600fr) minmax(200px, 400fr)')
    // Widths of another set of columns are not used.
    expect(visibleTemplate(tracks, [0, 2], [500, 400, 300])).toBe('minmax(360px,1fr) minmax(420px,1.2fr)')
    expect(visibleTemplate(tracks, [], undefined)).toBe('minmax(0, 1fr)')
  })

  it('układ strony: wycinek do presetu, podmiana i domyślny bez ruszania innych stron', () => {
    const panels = { 'bridge:Osłony': { hidden: true }, 'bridge:Kadłub': { height: 200 }, 'month:Koperty': { collapsed: true } }
    const columns = { 'bridge:kolumny': [400, 300, 500], 'bridge:kolumny|0,2': [600, 400], 'pane:operations:podglad': [460], 'pane:bridge:x': [300] }
    const layout = pageLayoutOf('bridge', panels, columns)
    expect(layout).toEqual({
      panels: { Osłony: { hidden: true }, Kadłub: { height: 200 } },
      columns: { kolumny: [400, 300, 500], 'kolumny|0,2': [600, 400], 'pane:x': [300] }
    })
    expect(isEmptyPageLayout(layout)).toBe(false)
    expect(isEmptyPageLayout(pageLayoutOf('radar', panels, columns))).toBe(true)

    const reset = withPageLayout('bridge', panels, columns, null)
    expect(reset.panels).toEqual({ 'month:Koperty': { collapsed: true } })
    expect(reset.columns).toEqual({ 'pane:operations:podglad': [460] })

    const preset = { panels: { Ładownia: { collapsed: true }, Zle: { height: 'x' } as never }, columns: { kolumny: [1, 2, 3], 'pane:x': [320], zle: [-1] } }
    const applied = withPageLayout('bridge', panels, columns, preset)
    expect(applied.panels).toEqual({ 'month:Koperty': { collapsed: true }, 'bridge:Ładownia': { collapsed: true } })
    expect(applied.columns).toEqual({ 'pane:operations:podglad': [460], 'bridge:kolumny': [1, 2, 3], 'pane:bridge:x': [320] })
    // Back and forth gives the same layout.
    expect(pageLayoutOf('bridge', withPageLayout('bridge', {}, {}, layout).panels, withPageLayout('bridge', {}, {}, layout).columns)).toEqual(layout)

    expect(samePageLayout(layout, { columns: { 'pane:x': [300], 'kolumny|0,2': [600, 400], kolumny: [400, 300, 500] }, panels: { Kadłub: { height: 200 }, Osłony: { hidden: true } } })).toBe(true)
    expect(samePageLayout(layout, { ...layout, panels: { Osłony: { hidden: true } } })).toBe(false)
  })

  it('klucze localStorage i nazwy stron menu „Układ”', () => {
    expect(PANELS_STORAGE_KEY).toBe('fi.panels')
    expect(COLUMNS_STORAGE_KEY).toBe('fi.columns')
    expect(PAGE_LABELS.settings).toBe('Ustawienia')
    expect(PAGE_LABELS.sync).toBe('Synchronizacja')
    expect(Object.keys(PAGE_LABELS)).not.toContain('journal')
  })

  it('presety w ustawieniach: domyślnie pusto, błędny preset pominięty, reszta zostaje', () => {
    expect(settingsSchema.parse({}).layoutPresets).toEqual([])
    const ok = { id: '01JAAAAAAAAAAAAAAAAAAAAAAA', name: 'Duża mapa', page: 'bridge', panels: { Osłony: { hidden: true } }, columns: { kolumny: [1, 2, 3] } }
    const parsed = settingsSchema.parse({ layoutPresets: [ok, { id: 'x', name: '' }, 5] }).layoutPresets
    expect(parsed).toEqual([ok])
    expect(settingsSchema.parse({ layoutPresets: 'zle' }).layoutPresets).toEqual([])
  })
})
