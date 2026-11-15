import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clickTick, extendTick, pruneTicked, tickAll, type Selection } from '../../src/renderer/features/operations/rangeSelect'

// The store half talks to window.fi through the stores it imports; nothing is written here.
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) })
vi.stubGlobal('window', { fi: {} })
const ops = await import('../../src/renderer/features/operations/state')

const ORDER = ['a', 'b', 'c', 'd', 'e']
const none: Selection = { ticked: {}, anchor: null }
const sel = (ids: string[], anchor: string | null = null): Selection => ({ ticked: Object.fromEntries(ids.map((i) => [i, true as const])), anchor })
const keys = (s: { ticked: Readonly<Record<string, true>> }) => Object.keys(s.ticked).sort()

describe('clickTick – Ctrl i Shift+klik', () => {
  it('Ctrl+klik przełącza wiersz i ustawia kotwicę', () => {
    const on = clickTick(none, ORDER, 'b', { ctrl: true, shift: false })
    expect(keys(on)).toEqual(['b'])
    expect(on.anchor).toBe('b')
    const off = clickTick(on, ORDER, 'b', { ctrl: true, shift: false })
    expect(keys(off)).toEqual([])
    expect(off.anchor).toBe('b')
  })

  it('Ctrl+klik nie rusza innych zaznaczonych', () => {
    const s = clickTick(sel(['a'], 'a'), ORDER, 'd', { ctrl: true, shift: false })
    expect(keys(s)).toEqual(['a', 'd'])
  })

  it('Shift+klik dokłada zakres od kotwicy do wiersza (w obie strony), kotwica zostaje', () => {
    const down = clickTick(sel(['b'], 'b'), ORDER, 'd', { ctrl: false, shift: true })
    expect(keys(down)).toEqual(['b', 'c', 'd'])
    expect(down.anchor).toBe('b')
    const up = clickTick(sel(['d'], 'd'), ORDER, 'b', { ctrl: false, shift: true })
    expect(keys(up)).toEqual(['b', 'c', 'd'])
  })

  it('Shift+klik dokłada do istniejącego zaznaczenia, nie zastępuje go', () => {
    const s = clickTick(sel(['a', 'c'], 'c'), ORDER, 'e', { ctrl: false, shift: true })
    expect(keys(s)).toEqual(['a', 'c', 'd', 'e'])
  })

  it('Ctrl+Shift+klik działa jak Shift', () => {
    const s = clickTick(sel(['a'], 'a'), ORDER, 'c', { ctrl: true, shift: true })
    expect(keys(s)).toEqual(['a', 'b', 'c'])
  })

  it('Shift+klik na kotwicy dokłada tylko ten wiersz', () => {
    const s = clickTick(sel([], 'c'), ORDER, 'c', { ctrl: false, shift: true })
    expect(keys(s)).toEqual(['c'])
  })

  it('brak kotwicy albo kotwica poza widocznymi (filtr, szkic) – Shift jak Ctrl', () => {
    const noAnchor = clickTick(none, ORDER, 'c', { ctrl: false, shift: true })
    expect(keys(noAnchor)).toEqual(['c'])
    expect(noAnchor.anchor).toBe('c')
    const hidden = clickTick(sel([], 'zzz'), ORDER, 'c', { ctrl: false, shift: true })
    expect(keys(hidden)).toEqual(['c'])
    expect(hidden.anchor).toBe('c')
  })

  it('wiersz spoza `order` (szkic) przy Shift nie dokłada niczego spoza widocznych', () => {
    const s = clickTick(sel(['a'], 'a'), ORDER, 'draft', { ctrl: false, shift: true })
    expect(keys(s)).toEqual(['a', 'draft'])
    expect(keys(clickTick(sel(['a'], 'a'), ORDER, 'c', { ctrl: false, shift: true }))).not.toContain('draft')
  })

  it('zakres liczy się w bieżącym porządku, nie w kolejności zaznaczania; szkice poza `order` nie wchodzą w zakres', () => {
    const order = ['e', 'a', 'c']
    const s = clickTick(sel(['e'], 'e'), order, 'c', { ctrl: false, shift: true })
    expect(keys(s)).toEqual(['a', 'c', 'e'])
  })

  it('bez modyfikatorów: tylko kotwica, ta sama referencja `ticked`', () => {
    const start = sel(['a'], 'a')
    const s = clickTick(start, ORDER, 'c', { ctrl: false, shift: false })
    expect(s.ticked).toBe(start.ticked)
    expect(s.anchor).toBe('c')
  })

  it('Shift+klik, gdy cały zakres już zaznaczony – ta sama referencja `ticked`', () => {
    const start = sel(['a', 'b', 'c'], 'a')
    const s = clickTick(start, ORDER, 'c', { ctrl: false, shift: true })
    expect(s.ticked).toBe(start.ticked)
  })
})

describe('extendTick – Shift+strzałki', () => {
  it('dokłada wiersz startowy i nowy kursor, kotwica = kursor, gdy brak', () => {
    const r = extendTick(none, ORDER, 'b', 1)
    expect(keys(r)).toEqual(['b', 'c'])
    expect(r.anchor).toBe('b')
    expect(r.cursor).toBe('c')
  })

  it('kolejne naciśnięcia rozszerzają zakres, kotwica zostaje', () => {
    const one = extendTick(none, ORDER, 'b', 1)
    const two = extendTick(one, ORDER, one.cursor, 1)
    expect(keys(two)).toEqual(['b', 'c', 'd'])
    expect(two.anchor).toBe('b')
    expect(two.cursor).toBe('d')
  })

  it('w górę; powrót nie zdejmuje zaznaczenia', () => {
    const down = extendTick(none, ORDER, 'c', 1)
    const back = extendTick(down, ORDER, down.cursor, -1)
    expect(keys(back)).toEqual(['c', 'd'])
    expect(back.cursor).toBe('c')
    const up = extendTick(back, ORDER, back.cursor, -1)
    expect(keys(up)).toEqual(['b', 'c', 'd'])
  })

  it('na końcu listy kursor stoi, wiersz zostaje zaznaczony', () => {
    const r = extendTick(none, ORDER, 'e', 1)
    expect(keys(r)).toEqual(['e'])
    expect(r.cursor).toBe('e')
    const top = extendTick(none, ORDER, 'a', -1)
    expect(keys(top)).toEqual(['a'])
    expect(top.cursor).toBe('a')
  })

  it('bez kursora (albo poza widocznymi) zaczyna od pierwszego wiersza', () => {
    const r = extendTick(none, ORDER, null, 1)
    expect(keys(r)).toEqual(['a'])
    expect(r.cursor).toBe('a')
    const gone = extendTick(none, ORDER, 'zzz', -1)
    expect(keys(gone)).toEqual(['a'])
    expect(gone.cursor).toBe('a')
  })

  it('pusta lista – bez zmian', () => {
    const start = sel(['a'], 'a')
    const r = extendTick(start, [], 'a', 1)
    expect(r.ticked).toBe(start.ticked)
    expect(r.cursor).toBe('a')
  })

  it('wiersze już zaznaczone – ta sama referencja `ticked`', () => {
    const start = sel(['b', 'c'], 'b')
    const r = extendTick(start, ORDER, 'b', 1)
    expect(r.ticked).toBe(start.ticked)
    expect(r.cursor).toBe('c')
  })
})

describe('tickAll – Ctrl+A', () => {
  it('zaznacza widoczne i zostawia już zaznaczone', () => {
    const out = tickAll({ a: true, zzz: true }, ORDER)
    expect(Object.keys(out).sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'zzz'])
  })

  it('wszystkie już zaznaczone – ta sama referencja', () => {
    const start = sel(ORDER).ticked
    expect(tickAll(start, ORDER)).toBe(start)
  })

  it('pusta lista – ta sama referencja', () => {
    const start = {}
    expect(tickAll(start, [])).toBe(start)
  })
})

describe('zaznaczenie w stanie listy (`tickAnchor`)', () => {
  beforeEach(() => {
    storage.clear()
    ops.showStoredFilter()
    ops.resetFilter()
    ops.clearTicked()
    ops.selectOperation(null)
  })
  const st = () => ops.useOperationsUi.getState()

  it('Ctrl+klik i Shift+klik składają zaznaczenie, kotwica jest w stanie', () => {
    ops.clickTickRow(ORDER, 'b', { ctrl: true, shift: false })
    expect(st().tickAnchor).toBe('b')
    ops.clickTickRow(ORDER, 'd', { ctrl: false, shift: true })
    expect(Object.keys(st().ticked).sort()).toEqual(['b', 'c', 'd'])
    expect(st().tickAnchor).toBe('b')
  })

  it('pole w wierszu ustawia kotwicę, zwykły klik też – bez zmiany zaznaczenia', () => {
    ops.tickRow('b', true)
    expect(st().tickAnchor).toBe('b')
    const before = st().ticked
    ops.anchorTick('d')
    expect(st().tickAnchor).toBe('d')
    expect(st().ticked).toBe(before)
  })

  it('Shift+strzałki: kursor to wiersz wybrany, zwraca nowy kursor', () => {
    ops.useOperationsUi.setState({ selectedId: 'b' })
    expect(ops.extendTickFromCursor(ORDER, 1)).toBe('c')
    expect(Object.keys(st().ticked).sort()).toEqual(['b', 'c'])
    expect(st().tickAnchor).toBe('b')
  })

  it('Ctrl+A zaznacza widoczne', () => {
    ops.tickAllVisible(ORDER)
    expect(Object.keys(st().ticked).sort()).toEqual(ORDER)
  })

  it('czyszczenie: clearTicked, zmiana filtra, reset, widok z zewnątrz, filtr zapamiętany – kasują kotwicę', () => {
    const arm = () => ops.useOperationsUi.setState({ ticked: { a: true }, tickAnchor: 'a' })
    arm()
    ops.clearTicked()
    expect(st().tickAnchor).toBeNull()
    expect(st().ticked).toEqual({})
    arm()
    ops.setFilter({ query: 'x' })
    expect(st().tickAnchor).toBeNull()
    expect(st().ticked).toEqual({})
    arm()
    ops.showFilter({ query: 'y' })
    expect(st().tickAnchor).toBeNull()
    arm()
    ops.showStoredFilter()
    expect(st().tickAnchor).toBeNull()
    arm()
    ops.resetFilter()
    expect(st().tickAnchor).toBeNull()
    expect(st().ticked).toEqual({})
  })

  it('nowy miesiąc na liście kasuje zaznaczenie i kotwicę', () => {
    ops.followCurrentMonth('2099-01')
    ops.useOperationsUi.setState({ ticked: { a: true }, tickAnchor: 'a' })
    ops.followCurrentMonth('2099-02')
    expect(st().tickAnchor).toBeNull()
  })
})

describe('pruneTicked – zaznaczone, które zmiana ukryła, odpadają', () => {
  it('zostają tylko widoczne; gdy nic nie odpada – ta sama referencja', () => {
    const next = pruneTicked(sel(['a', 'c', 'x']).ticked, ORDER)
    expect(keys({ ticked: next })).toEqual(['a', 'c'])
    const same = sel(['a', 'c']).ticked
    expect(pruneTicked(same, ORDER)).toBe(same)
  })

  it('wszystko ukryte – puste zaznaczenie', () => {
    expect(keys({ ticked: pruneTicked(sel(['x', 'y']).ticked, ORDER) })).toEqual([])
  })

  it('sklep: pruneTickedTo odrzuca ukryte; nic do odrzucenia – to samo zaznaczenie', () => {
    ops.useOperationsUi.setState({ ticked: { a: true, x: true }, tickAnchor: 'a' })
    ops.pruneTickedTo(ORDER)
    expect(Object.keys(ops.useOperationsUi.getState().ticked)).toEqual(['a'])
    const ref = ops.useOperationsUi.getState().ticked
    ops.pruneTickedTo(ORDER)
    expect(ops.useOperationsUi.getState().ticked).toBe(ref)
    ops.clearTicked()
  })
})
