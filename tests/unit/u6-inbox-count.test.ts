// U6 (T555): the inbox's count is computed once and only read elsewhere; the settlement rows are memoized.
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { publishInboxCount, stageInboxCount, useInboxCountStore } from '../../src/renderer/store/inboxCount'

const src = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8')

describe('inbox count store', () => {
  it('notifies a subscriber only when the count changes', () => {
    publishInboxCount(0)
    let calls = 0
    const off = useInboxCountStore.subscribe(() => calls++)
    publishInboxCount(3)
    publishInboxCount(3)
    publishInboxCount(3)
    expect(calls).toBe(1)
    publishInboxCount(0)
    expect(calls).toBe(2)
    off()
  })
})

describe('where the inbox is computed', () => {
  it('only the host computes it: Mostek and the side menu badge read the stored count', () => {
    const bridge = src('renderer/features/bridge/BridgePage.tsx')
    expect(bridge).not.toMatch(/useInbox\(|useInboxCountHost\(/)
    expect(bridge).toMatch(/store\/inboxCount'/)
    const state = src('renderer/features/inbox/state.ts')
    // The hook computing the whole list for the count exists once, called once (the side menu).
    expect(state.match(/export function useInboxCountHost\(/g)).toHaveLength(1)
    expect(src('renderer/app/App.tsx').match(/useInboxCountHost\(/g)).toHaveLength(1)
    expect(src('renderer/app/App.tsx')).not.toMatch(/useInboxCount\(/)
  })

  it('the phone watcher publishes the count it already has', () => {
    expect(src('mobile/app/PhoneInbox.tsx')).toMatch(/stageInboxCount\(all\.length\)/)
    expect(src('mobile/app/PhoneInbox.tsx')).toMatch(/publishInboxCount\(all\.length\)/)
    expect(src('renderer/features/inbox/state.ts')).toMatch(/stageInboxCount\(count\)/)
    // On the phone, PhoneInboxWatcher renders before <main> so Mostek reads the staged count on its first render (T560).
    const shell = src('mobile/app/Shell.tsx')
    expect(shell.indexOf('<PhoneInboxWatcher')).toBeLessThan(shell.indexOf('<main'))
  })

  it('W3 (T560): stageInboxCount udostępnia licznik przed useEffect bez wywoływania subskrybentów w trakcie renderu', () => {
    publishInboxCount(0)
    let calls = 0
    const off = useInboxCountStore.subscribe(() => calls++)
    stageInboxCount(5)
    expect(calls).toBe(0)
    expect(useInboxCountStore.getState().count).toBe(0)
    publishInboxCount(5)
    expect(calls).toBe(1)
    expect(useInboxCountStore.getState().count).toBe(5)
    off()
  })
})

describe('W3 (T560): QuickEntry show() i ogrodzenie quickWindow w E2E', () => {
  it('show() i quickRefresh wysyłają fi:quickRequest dokładnie raz niezależnie od kolejności utworzenia okna', async () => {
    const handlers = new Map<string, (e: { sender: unknown }, ...args: unknown[]) => unknown>()
    const mainSent: string[] = []
    const mainWebContents = { send: (ch: string) => mainSent.push(ch) }
    const quickWebContents = {
      send: () => undefined,
      setWindowOpenHandler: () => undefined,
      on: () => undefined
    }
    let visible = false
    vi.doMock('electron', () => ({
      ipcMain: {
        handle: (ch: string, fn: (e: { sender: unknown }, ...args: unknown[]) => unknown) => handlers.set(ch, fn)
      },
      globalShortcut: { register: () => true, unregister: () => undefined },
      screen: {
        getCursorScreenPoint: () => ({ x: 0, y: 0 }),
        getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }),
        getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } })
      },
      BrowserWindow: class {
        webContents = quickWebContents
        isDestroyed() {
          return false
        }
        isVisible() {
          return visible
        }
        setAlwaysOnTop() {}
        on() {}
        getSize() {
          return [440, 600]
        }
        setResizable() {}
        setSize() {}
        setPosition() {}
        show() {
          visible = true
        }
        hide() {
          visible = false
        }
        focus() {}
        destroy() {}
      }
    }))
    const { QuickEntry } = await import('../../src/main/quick')
    const q = new QuickEntry({
      main: () => ({ isDestroyed: () => false, webContents: mainWebContents }) as never,
      preload: '',
      load: async () => undefined,
      devUrl: null,
      log: () => undefined
    })

    // Case 1: ensure() creates the hidden window in the background; quickRefresh mounts while hidden -> 0 requests;
    // then show() opens it -> 1 request.
    q.ensure()
    handlers.get('fi:quickRefresh')!({ sender: quickWebContents })
    expect(mainSent).toEqual([])
    q.show()
    expect(mainSent).toEqual(['fi:quickRequest'])

    // Case 2: show() on a fresh window before quickRefresh has mounted -> show() waits, quickRefresh sends 1 request.
    mainSent.length = 0
    const q2 = new QuickEntry({
      main: () => ({ isDestroyed: () => false, webContents: mainWebContents }) as never,
      preload: '',
      load: async () => undefined,
      devUrl: null,
      log: () => undefined
    })
    q2.show()
    expect(mainSent).toEqual([])
    handlers.get('fi:quickRefresh')!({ sender: quickWebContents })
    expect(mainSent).toEqual(['fi:quickRequest'])
  })

  it('wszystkie testy E2E korzystają ze wspólnego ogrodzonego quickWindow w tests/e2e/app.ts', () => {
    const dir = new URL('../e2e/', import.meta.url)
    const files = readdirSync(dir).filter((f) => f.endsWith('.spec.ts'))
    for (const f of files) {
      const text = readFileSync(new URL(f, dir), 'utf8')
      expect(text, f).not.toMatch(/function quickWindow\(/)
    }
  })
})

describe('settlement rows', () => {
  it('the purchase row is memoized', () => {
    expect(src('renderer/features/radar/SettlementsPanel.tsx')).toMatch(/const PurchaseRow = memo\(/)
  })
})
