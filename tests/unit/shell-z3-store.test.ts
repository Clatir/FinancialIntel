import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Z3 (1.21.0, UX-10, UX-12, UX-78): the window's shell stores – the history of screens, the toasts' time, the palette's
// recent list. The renderer modules are loaded by a path in a variable (as `gc-ui-fixes.test.ts`): the file stays in the node project.
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k)
})
type Route = { page: string; tab?: string }
interface UiModule {
  useUi: {
    getState: () => { route: Route; history: Route[]; forward: Route[]; toasts: Array<{ id: number }> }
    setState: (s: Record<string, unknown>) => void
  }
  navigate: (r: Route) => void
  goBack: () => void
  goForward: () => void
  toast: (text: string, kind?: 'info' | 'success' | 'error', ms?: number, action?: { label: string; run: () => void }) => void
  toastMs: (text: string, kind: 'info' | 'success' | 'error') => number
  pauseToast: (id: number) => void
  resumeToast: (id: number) => void
  closeToast: (id: number) => void
  UNDO_MIN_MS: number
}
interface RecentModule {
  rememberRecent: (id: string) => void
  readRecent: () => string[]
}
const load = <T,>(p: string): Promise<T> => import(p) as Promise<T>
const ui = await load<UiModule>('@renderer/store/ui')
const recent = await load<RecentModule>('@renderer/features/palette/recent')
const root = resolve(__dirname, '../..')
const read = (p: string): string => readFileSync(resolve(root, p), 'utf8')

function reset(): void {
  ui.useUi.setState({ route: { page: 'bridge' }, history: [], forward: [], toasts: [] })
}

describe('UX-12: „wstecz” i „dalej”', () => {
  beforeEach(reset)

  it('ta sama trasa nie dokłada wpisu do historii (Ctrl+2 dwa razy)', () => {
    ui.navigate({ page: 'operations' })
    ui.navigate({ page: 'operations' })
    expect(ui.useUi.getState().history).toEqual([{ page: 'bridge' }])
    ui.goBack()
    expect(ui.useUi.getState().route).toEqual({ page: 'bridge' })
  })

  it('Ustawienia: inna zakładka to inna trasa, ta sama – nie', () => {
    ui.navigate({ page: 'settings', tab: 'general' })
    ui.navigate({ page: 'settings', tab: 'general' })
    expect(ui.useUi.getState().history).toHaveLength(1)
    ui.navigate({ page: 'settings', tab: 'folder' })
    expect(ui.useUi.getState().history).toHaveLength(2)
  })

  it('U4 (T553): Ustawienia bez nazwanej zakładki to zapamiętana zakładka – Alt+← wraca do niej, nie do ostatniej', () => {
    store.set('fi.settings.tab', 'accounts')
    ui.navigate({ page: 'settings' }) // Ctrl+, – shows the remembered tab (accounts)
    expect(ui.useUi.getState().route).toEqual({ page: 'settings', tab: 'accounts' })
    ui.navigate({ page: 'settings', tab: 'accounts' }) // the same tab again: no new entry
    expect(ui.useUi.getState().history).toHaveLength(1)
    ui.navigate({ page: 'settings', tab: 'folder' })
    store.set('fi.settings.tab', 'folder') // what the page remembers after showing it
    ui.goBack()
    expect(ui.useUi.getState().route).toEqual({ page: 'settings', tab: 'accounts' })
    ui.goForward()
    expect(ui.useUi.getState().route).toEqual({ page: 'settings', tab: 'folder' })
    store.clear()
  })

  it('„dalej” wraca tam, skąd zawrócił „wstecz”; nowy ekran czyści „dalej”', () => {
    ui.navigate({ page: 'operations' })
    ui.navigate({ page: 'month' })
    ui.goBack()
    expect(ui.useUi.getState().route).toEqual({ page: 'operations' })
    ui.goForward()
    expect(ui.useUi.getState().route).toEqual({ page: 'month' })
    expect(ui.useUi.getState().history.at(-1)).toEqual({ page: 'operations' })
    ui.goBack()
    ui.navigate({ page: 'cargo' })
    expect(ui.useUi.getState().forward).toEqual([])
    ui.goForward()
    expect(ui.useUi.getState().route).toEqual({ page: 'cargo' })
  })
})

describe('UX-10: czas toastów', () => {
  beforeEach(() => {
    reset()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('domyślnie: błąd 8 s, reszta 4 s, +40 ms na znak ponad 60, najwyżej 12 s', () => {
    expect(ui.toastMs('krótki', 'info')).toBe(4000)
    expect(ui.toastMs('krótki', 'error')).toBe(8000)
    expect(ui.toastMs('x'.repeat(100), 'info')).toBe(4000 + 40 * 40)
    expect(ui.toastMs('x'.repeat(1000), 'error')).toBe(12000)
  })

  it('toast znika po swoim czasie, nie po 3,2 s', () => {
    ui.toast('Zapisano.', 'success')
    vi.advanceTimersByTime(3500)
    expect(ui.useUi.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(600)
    expect(ui.useUi.getState().toasts).toHaveLength(0)
  })

  it('błąd zostaje 8 s, a podany krótszy czas go nie skraca', () => {
    ui.toast('Nie udało się.', 'error', 2000)
    vi.advanceTimersByTime(7900)
    expect(ui.useUi.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(ui.useUi.getState().toasts).toHaveLength(0)
  })

  it('myszka nad toastem go zatrzymuje, po zejściu dokańcza resztę czasu', () => {
    ui.toast('Zapisano.', 'success')
    const id = ui.useUi.getState().toasts[0]!.id
    vi.advanceTimersByTime(1000)
    ui.pauseToast(id)
    vi.advanceTimersByTime(60_000)
    expect(ui.useUi.getState().toasts).toHaveLength(1)
    ui.resumeToast(id)
    vi.advanceTimersByTime(2900)
    expect(ui.useUi.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(ui.useUi.getState().toasts).toHaveLength(0)
  })

  it('zamknięcie kliknięciem zatrzymuje licznik; ten sam tekst zastępuje poprzedni', () => {
    ui.toast('Raz.', 'info')
    const id = ui.useUi.getState().toasts[0]!.id
    ui.closeToast(id)
    expect(ui.useUi.getState().toasts).toHaveLength(0)
    ui.toast('Dwa.', 'info')
    ui.toast('Dwa.', 'info')
    expect(ui.useUi.getState().toasts).toHaveLength(1)
  })

  it('„Cofnij” zostaje co najmniej UNDO_MIN_MS', () => {
    ui.toast('Usunięto.', 'info', 1000, { label: 'Cofnij', run: () => undefined })
    vi.advanceTimersByTime(ui.UNDO_MIN_MS - 100)
    expect(ui.useUi.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(ui.useUi.getState().toasts).toHaveLength(0)
  })
})

describe('UX-78: „Ostatnio” w palecie', () => {
  beforeEach(() => store.clear())

  it('ostatnie na początku, bez powtórzeń, najwyżej 5', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'c']) recent.rememberRecent(id)
    expect(recent.readRecent()).toEqual(['c', 'f', 'e', 'd', 'b'])
  })

  it('„Zakończ aplikację” nie trafia do ostatnich; zepsuty zapis daje pustą listę', () => {
    recent.rememberRecent('save')
    recent.rememberRecent('quit')
    expect(recent.readRecent()).toEqual(['save'])
    store.set('fi.palette.recent', '{nie json')
    expect(recent.readRecent()).toEqual([])
  })
})

describe('Z3: kod powłoki', () => {
  it('UX-43/53/63: dolne pozycje menu bez podpisu skrótu, jeden format skrótów', () => {
    const app = read('src/renderer/app/App.tsx')
    expect(app).toContain('hint={KEYS.inbox}')
    expect(app).not.toMatch(/keys="Ctrl/)
    const help = read('src/renderer/app/ShortcutsHelp.tsx')
    expect(help).toContain("title: 'Szybki wpis'")
    expect(help).toContain("title: 'Panele'")
    expect(help).toContain('Alt+P / Alt+I')
    expect(read('src/renderer/components/shortcuts.ts')).toContain("hideAmounts: 'Ctrl+Shift+4 ($)'")
  })

  it('UX-3: Enter na przycisku i liście nie zapisuje szybkiego wpisu', () => {
    expect(read('src/renderer/features/quick/QuickApp.tsx')).toMatch(/ownEnter = e\.target instanceof HTMLButtonElement \|\| e\.target instanceof HTMLSelectElement/)
  })

  it('W3 (T560): store/ui.ts nie importuje z features/settings', () => {
    expect(read('src/renderer/store/ui.ts')).not.toMatch(/features\/settings/)
  })
})
