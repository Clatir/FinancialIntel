import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MACHINE_PREFS, patchMachinePrefs, type MachinePrefs } from '@shared/machine'

// The window's side of this computer's preferences: window.fi answers when the test says so (the main process's order).
const answers: Array<(p: MachinePrefs) => void> = []
let broadcast: ((p: MachinePrefs) => void) | null = null
const api = {
  getConfig: vi.fn(async () => ({ prefs: DEFAULT_MACHINE_PREFS })),
  setMachinePrefs: vi.fn(() => new Promise<MachinePrefs>((resolve) => answers.push(resolve))),
  zoomBy: vi.fn(() => new Promise<MachinePrefs>((resolve) => answers.push(resolve))),
  onMachinePrefs: vi.fn((cb: (p: MachinePrefs) => void) => {
    broadcast = cb
    return () => undefined
  }),
  revealAmounts: vi.fn(async (minutes: number | null) => ({ ...DEFAULT_MACHINE_PREFS, hideAmounts: false, _minutes: minutes }))
}
const dataset: Record<string, string> = {}
const win = Object.assign(new EventTarget(), { fi: api })
vi.stubGlobal('window', win)
vi.stubGlobal('document', { documentElement: { dataset } })
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
const machine = await import('../../src/renderer/store/machine')
await machine.loadMachinePrefs()
machine.installLook()
machine.installZoomKeys()

const prefs = () => machine.useMachine.getState().prefs
const flush = () => new Promise((r) => setTimeout(r, 0))
/** A key in the window, as the browser sends it. */
function press(key: string, code: string, mods: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}): Event {
  const e = Object.assign(new Event('keydown', { cancelable: true }), { key, code, ctrlKey: mods.ctrl ?? true, metaKey: false, altKey: mods.alt ?? false, shiftKey: mods.shift ?? false })
  win.dispatchEvent(e)
  return e
}

beforeEach(async () => {
  // Every change of the test before answered – the next test starts from the defaults.
  while (answers.length) answers.shift()!(prefs())
  await flush()
  machine.useMachine.setState({ prefs: DEFAULT_MACHINE_PREFS })
  api.setMachinePrefs.mockClear()
  api.zoomBy.mockClear()
})

describe('ustawienia komputera w oknie (1.6.6, F30)', () => {
  it('dwie zmiany jedna po drugiej: odpowiedź pierwszej nie cofa drugiej, echo z procesu głównego też nie', async () => {
    void machine.setMachinePrefs({ zoom: 1.1 })
    void machine.setMachinePrefs({ zoom: 1.2 })
    expect(prefs().zoom).toBe(1.2)
    broadcast!(patchMachinePrefs(DEFAULT_MACHINE_PREFS, { zoom: 1.1 }))
    answers.shift()!(patchMachinePrefs(DEFAULT_MACHINE_PREFS, { zoom: 1.1 }))
    await flush()
    expect(prefs().zoom).toBe(1.2)
    // The last answer carries them all.
    answers.shift()!(patchMachinePrefs(DEFAULT_MACHINE_PREFS, { zoom: 1.2, hideIdleMin: 5 }))
    await flush()
    expect(prefs()).toMatchObject({ zoom: 1.2, hideIdleMin: 5 })
    // With nothing on its way: another window's change shown.
    broadcast!(patchMachinePrefs(DEFAULT_MACHINE_PREFS, { zoom: 1.4 }))
    expect(prefs().zoom).toBe(1.4)
  })

  it('odpowiedź getConfig (okno dopiero wczytuje ustawienia) nie cofa zmiany, która jest w drodze', async () => {
    void machine.setMachinePrefs({ zoom: 1.3 })
    await machine.loadMachinePrefs()
    expect(prefs().zoom).toBe(1.3)
  })

  it('Ctrl+Plus / Ctrl+Minus / Ctrl+Shift+0 w oknie: krok do procesu głównego, klawisz nie idzie dalej (Ctrl+0 – Raporty); AltGr i Ctrl+0 – nie', () => {
    const plus = press('=', 'Equal')
    expect(plus.defaultPrevented).toBe(true)
    expect(api.zoomBy).toHaveBeenLastCalledWith('in')
    press('+', 'NumpadAdd')
    expect(api.zoomBy).toHaveBeenLastCalledWith('in')
    press('-', 'Minus')
    expect(api.zoomBy).toHaveBeenLastCalledWith('out')
    press(')', 'Digit0', { shift: true })
    expect(api.zoomBy).toHaveBeenLastCalledWith('reset')
    // Ctrl+0 (Raporty) and AltGr+minus: the page's.
    expect(press('0', 'Digit0').defaultPrevented).toBe(false)
    expect(press('-', 'Minus', { alt: true }).defaultPrevented).toBe(false)
    expect(api.zoomBy).toHaveBeenCalledTimes(4)
    // No size of the window's own making – no absolute size sent.
    expect(api.setMachinePrefs).not.toHaveBeenCalled()
  })

  it('Ctrl+Minus w oknie, którego kopia ustawień jest starsza (T300): rozmiar z procesu głównego, nie krok od kopii', async () => {
    // The quick entry still at 130 % – the main window has just made it 150 %, its echo is on the way.
    machine.useMachine.setState({ prefs: patchMachinePrefs(DEFAULT_MACHINE_PREFS, { zoom: 1.3 }) })
    press('-', 'Minus')
    expect(api.zoomBy).toHaveBeenLastCalledWith('out')
    // Nothing guessed from the old copy (it would be 120 %): the echoes and the answer of the main process.
    expect(prefs().zoom).toBe(1.3)
    broadcast!(patchMachinePrefs(DEFAULT_MACHINE_PREFS, { zoom: 1.5 }))
    expect(prefs().zoom).toBe(1.5)
    answers.shift()!(patchMachinePrefs(DEFAULT_MACHINE_PREFS, { zoom: 1.4 }))
    await flush()
    expect(prefs().zoom).toBe(1.4)
  })

  it('odpowiedź klawisza rozmiaru nie cofa zmiany tego okna, która jest w drodze – pokazuje ją jej odpowiedź', async () => {
    press('=', 'Equal')
    void machine.setMachinePrefs({ highContrast: true })
    expect(prefs()).toMatchObject({ zoom: 1, highContrast: true })
    // The key's answer is from before the switch: not shown over it.
    answers.shift()!(patchMachinePrefs(DEFAULT_MACHINE_PREFS, { zoom: 1.1 }))
    await flush()
    expect(prefs()).toMatchObject({ zoom: 1, highContrast: true })
    // The switch's answer carries both.
    answers.shift()!(patchMachinePrefs(DEFAULT_MACHINE_PREFS, { zoom: 1.1, highContrast: true }))
    await flush()
    expect(prefs()).toMatchObject({ zoom: 1.1, highContrast: true })
  })

  it('nieudany zapis (T300): okno bierze ustawienia procesu głównego – echa innych zmian nie były w tym czasie pokazane', async () => {
    api.setMachinePrefs.mockImplementationOnce(() => Promise.reject(new Error('EPERM')))
    api.getConfig.mockResolvedValueOnce({ prefs: patchMachinePrefs(DEFAULT_MACHINE_PREFS, { zoom: 1.2, highContrast: true }) })
    void machine.setMachinePrefs({ highContrast: true })
    // Meanwhile another window's change: not shown while this one is on its way.
    broadcast!(patchMachinePrefs(DEFAULT_MACHINE_PREFS, { zoom: 1.2 }))
    expect(prefs()).toMatchObject({ zoom: 1, highContrast: true })
    await flush()
    await flush()
    expect(prefs()).toMatchObject({ zoom: 1.2, highContrast: true })
  })

  it('wyższy kontrast jako atrybut strony – w każdym oknie z ustawień komputera', () => {
    machine.useMachine.setState({ prefs: patchMachinePrefs(DEFAULT_MACHINE_PREFS, { highContrast: true }) })
    expect(dataset.contrast).toBe('high')
    machine.useMachine.setState({ prefs: DEFAULT_MACHINE_PREFS })
    expect(dataset.contrast).toBeUndefined()
  })

  it('„Pokaż na 5 minut” / „do końca sesji” (F40): minuty do procesu głównego, kwoty pokazane od razu', async () => {
    machine.useMachine.setState({ prefs: patchMachinePrefs(DEFAULT_MACHINE_PREFS, { hideAmounts: true }) })
    await machine.revealAmounts(5)
    expect(api.revealAmounts).toHaveBeenLastCalledWith(5)
    expect(prefs().hideAmounts).toBe(false)
    await machine.revealAmounts(null)
    expect(api.revealAmounts).toHaveBeenLastCalledWith(null)
  })
})
