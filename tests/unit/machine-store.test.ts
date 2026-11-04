import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MACHINE_PREFS, patchMachinePrefs, type MachinePrefs } from '@shared/machine'

// The window's side of this computer's preferences: window.fi answers when the test says so (the main process's order).
const answers: Array<(p: MachinePrefs) => void> = []
let mainTray = { closeToTray: true, launchAtLogin: true, notified: true, autostartAsked: true, loginSupported: true }
let broadcast: ((p: MachinePrefs) => void) | null = null
const api = {
  getConfig: vi.fn(async () => ({ prefs: DEFAULT_MACHINE_PREFS })),
  setMachinePrefs: vi.fn(() => new Promise<MachinePrefs>((resolve) => answers.push(resolve))),
  zoomBy: vi.fn(() => new Promise<MachinePrefs>((resolve) => answers.push(resolve))),
  onMachinePrefs: vi.fn((cb: (p: MachinePrefs) => void) => {
    broadcast = cb
    return () => undefined
  }),
  revealAmounts: vi.fn(async (minutes: number | null) => ({ ...DEFAULT_MACHINE_PREFS, hideAmounts: false, _minutes: minutes })),
  // The tray of this computer as the main process has it (config.json in memory).
  trayPrefs: vi.fn(async () => mainTray),
  setTrayPrefs: vi.fn(async (_patch: { launchAtLogin?: boolean }) => mainTray)
}
const dataset: Record<string, string> = {}
const win = Object.assign(new EventTarget(), { fi: api })
vi.stubGlobal('window', win)
vi.stubGlobal('document', { documentElement: { dataset } })
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
const machine = await import('../../src/renderer/store/machine')
const trayStore = await import('../../src/renderer/store/tray')
const { useUi } = await import('../../src/renderer/store/ui')
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

describe('zasobnik i start z Windows przy zajętym config.json (przegląd N5, uwaga 1)', () => {
  it('nieudany zapis: ekran pokazuje ustawienie, które działa (proces główny zmienił je i ponawia zapis) – z przyczyną, bez błędu w górę', async () => {
    await trayStore.loadTrayPrefs()
    expect(trayStore.useTray.getState().prefs?.launchAtLogin).toBe(true)
    // Switched off: the main process applies it (the system's entry too) and its write of config.json is refused.
    api.setTrayPrefs.mockImplementationOnce(async () => {
      mainTray = { ...mainTray, launchAtLogin: false }
      throw new Error('EPERM: operation not permitted, rename config.json')
    })
    const shown = await trayStore.setTrayPrefs({ launchAtLogin: false })
    // Before: the switch stayed „on” on the screen while the system and the retried write said „off”.
    expect(shown.launchAtLogin).toBe(false)
    expect(trayStore.useTray.getState().prefs?.launchAtLogin).toBe(false)
    expect(useUi.getState().toasts.at(-1)?.text).toMatch(/działają, a zapis ponawia się sam/)
  })
})

describe('przełącznik startu z Windows pokazuje stan systemu (przegląd 3 N5, T433)', () => {
  const view = (launchAtLogin: boolean, loginEntry: boolean | null | undefined) => ({ closeToTray: true, launchAtLogin, notified: true, autostartAsked: false, loginSupported: true, loginEntry })
  it('config.json mówi „nie”, a Windows ma wpis tej kopii (plik odłożony albo usunięty): przełącznik włączony z notką; zgodne albo nieznane – bez notki', () => {
    // Before: the switch showed config.json's „off” while Windows kept starting the app.
    expect(trayStore.autostartOf(view(false, true))).toMatchObject({ on: true, note: expect.stringMatching(/stan systemu/) })
    expect(trayStore.autostartOf(view(true, false))).toMatchObject({ on: false, note: expect.stringMatching(/stan systemu/) })
    expect(trayStore.autostartOf(view(true, true))).toEqual({ on: true, note: null })
    expect(trayStore.autostartOf(view(false, null))).toEqual({ on: false, note: null })
    expect(trayStore.autostartOf(view(false, undefined))).toEqual({ on: false, note: null })
    // A computer whose app starts with Windows already is never asked whether it should.
    expect(trayStore.asksAutostart(view(false, true), true)).toBe(false)
    expect(trayStore.asksAutostart(view(false, false), true)).toBe(true)
  })

  it('pokazanie Ustawień czyta stan systemu od nowa (nie z pierwszego odczytu)', async () => {
    mainTray = { ...mainTray, launchAtLogin: false, loginEntry: true } as typeof mainTray
    await trayStore.refreshTrayPrefs()
    expect(trayStore.autostartOf(trayStore.useTray.getState().prefs!).on).toBe(true)
  })
})
