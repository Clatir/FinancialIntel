/**
 * The phone's platform (T305): on the iPhone Capacitor's plugins (Preferences, LocalNotifications, App, Browser, the
 * native HTTP for the token); in the browser of the tests and of `npm run dev:mobile` their stand-ins (localStorage, a
 * list of notices, a fake sign-in, `fetch` to the fake OneDrive – `window.__FI_PHONE_TEST__`).
 */
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import type { PlannedNotice } from '@shared/notifyPlan'
import type { KeyValue, Notifications, PhoneNotice } from './host/host'
import { AUTHORITY, REDIRECT_URI } from './sync/auth'
import { GRAPH_BASE } from './sync/graph'
import { capacitorHttp, fetchHttp, type Http } from './sync/http'

/** The tests' and the browser's settings (set before the app's script runs). */
export interface PhoneTestConfig {
  graphBase?: string
  authority?: string
  /** The redirect the fake sign-in answers with ('code-1' by default). */
  code?: string
  clientId?: string
  version?: string
}

declare global {
  interface Window {
    __FI_PHONE_TEST__?: PhoneTestConfig
    /** The notices shown or planned in the browser (tests read them). */
    __FI_NOTICES__?: { shown: PhoneNotice[]; planned: PlannedNotice[] }
  }
}

export interface Platform {
  native: boolean
  version: string
  kv: KeyValue
  notifications: Notifications & {
    /** The planned ones replaced by these. */
    plan(list: readonly PlannedNotice[]): Promise<void>
    permission(): Promise<boolean>
  }
  openUrl(url: string): Promise<void>
  /** Graph and the downloads: `fetch` (Graph allows the browser's CORS; the files' links too). */
  graphHttp: Http
  /** The token endpoint: native on the phone (a web page's request for an app's code is refused by Microsoft). */
  tokenHttp: Http
  graphBase: string
  authority: string
  /** Microsoft's sign-in page shown; resolves with the redirect (`financialintel://auth?…`). */
  signIn(url: string): Promise<string>
  onForeground(cb: (front: boolean) => void): void
  /** The client id built into the app (`VITE_FI_CLIENT_ID`), else the one the user types. */
  builtInClientId: string
}

/** A number for a notification from its key (iOS wants integers). */
export function noticeId(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  return Math.abs(h) % 2_000_000_000
}

function nativePlatform(version: string): Platform {
  const kv: KeyValue = {
    get: async (key) => (await Preferences.get({ key })).value,
    set: async (key, value) => void (await Preferences.set({ key, value })),
    remove: async (key) => void (await Preferences.remove({ key }))
  }
  let tap: ((tag: string) => void) | null = null
  // The app started by the tap: kept until the host listens.
  let tapped: string | null = null
  void LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    const tag = (a.notification.extra as { tag?: string } | undefined)?.tag
    if (!tag) return
    if (tap) tap(tag)
    else tapped = tag
  })
  const notifications: Platform['notifications'] = {
    show: async (n) => {
      if (!(await notifications.permission())) return
      await LocalNotifications.schedule({ notifications: [{ id: noticeId(`now:${n.key ?? n.tag}:${Date.now()}`), title: n.title, body: n.body, extra: { tag: n.tag, key: n.key ?? null } }] })
    },
    onTap: (cb) => {
      tap = cb
      if (tapped) cb(tapped)
      tapped = null
    },
    plan: async (list) => {
      // Every planned one is the app's: all replaced by the new list.
      const pending = (await LocalNotifications.getPending()).notifications.map((x) => ({ id: x.id }))
      if (pending.length) await LocalNotifications.cancel({ notifications: pending })
      if (!list.length || !(await notifications.permission())) return
      await LocalNotifications.schedule({
        notifications: list.map((n) => ({ id: noticeId(n.key), title: n.title, body: n.body, schedule: { at: new Date(n.at), allowWhileIdle: true }, extra: { tag: n.tag, key: n.key } }))
      })
    },
    permission: async () => {
      const cur = await LocalNotifications.checkPermissions()
      if (cur.display === 'granted') return true
      if (cur.display === 'denied') return false
      return (await LocalNotifications.requestPermissions()).display === 'granted'
    }
  }
  return {
    native: true,
    version,
    kv,
    notifications,
    openUrl: async (url) => void (await Browser.open({ url })),
    graphHttp: fetchHttp,
    tokenHttp: capacitorHttp((opts) => CapacitorHttp.request(opts as unknown as Parameters<typeof CapacitorHttp.request>[0]) as Promise<{ status: number; headers: Record<string, string>; data: unknown }>),
    graphBase: GRAPH_BASE,
    authority: AUTHORITY,
    signIn: (url) =>
      new Promise<string>((resolve, reject) => {
        let done = false
        const handles: Array<Promise<{ remove: () => Promise<void> }>> = []
        const finish = (fn: () => void) => {
          if (done) return
          done = true
          for (const h of handles) void h.then((x) => x.remove())
          fn()
        }
        handles.push(
          App.addListener('appUrlOpen', ({ url: back }) => {
            if (!back.startsWith(REDIRECT_URI)) return
            void Browser.close().catch(() => undefined)
            finish(() => resolve(back))
          })
        )
        handles.push(Browser.addListener('browserFinished', () => setTimeout(() => finish(() => reject(new Error('Logowanie przerwane – zamknięto okno Microsoft.'))), 800)))
        void Browser.open({ url, presentationStyle: 'popover' }).catch((e: unknown) => finish(() => reject(e instanceof Error ? e : new Error(String(e)))))
      }),
    onForeground: (cb) => {
      void App.addListener('appStateChange', ({ isActive }) => cb(isActive))
    },
    builtInClientId: import.meta.env.VITE_FI_CLIENT_ID ?? ''
  }
}

function webPlatform(cfg: PhoneTestConfig, version: string): Platform {
  const notices = (window.__FI_NOTICES__ ??= { shown: [], planned: [] })
  const kv: KeyValue = {
    get: async (key) => localStorage.getItem(key),
    set: async (key, value) => localStorage.setItem(key, value),
    remove: async (key) => localStorage.removeItem(key)
  }
  let tap: ((tag: string) => void) | null = null
  // The tests tap a notice by its tag.
  window.addEventListener('fi:notice-tap', (e) => tap?.((e as CustomEvent<string>).detail))
  return {
    native: false,
    version,
    kv,
    notifications: {
      show: async (n) => void notices.shown.push(n),
      onTap: (cb) => {
        tap = cb
      },
      plan: async (list) => {
        notices.planned = [...list]
      },
      permission: async () => true
    },
    openUrl: async (url) => void window.open(url, '_blank'),
    graphHttp: fetchHttp,
    tokenHttp: fetchHttp,
    graphBase: cfg.graphBase ?? GRAPH_BASE,
    authority: cfg.authority ?? AUTHORITY,
    signIn: async (url) => {
      const state = new URL(url).searchParams.get('state') ?? ''
      return `${REDIRECT_URI}?code=${encodeURIComponent(cfg.code ?? 'code-1')}&state=${encodeURIComponent(state)}`
    },
    onForeground: (cb) => document.addEventListener('visibilitychange', () => cb(document.visibilityState === 'visible')),
    builtInClientId: cfg.clientId ?? import.meta.env.VITE_FI_CLIENT_ID ?? ''
  }
}

export function createPlatform(): Platform {
  const version = window.__FI_PHONE_TEST__?.version ?? __APP_VERSION__
  return Capacitor.isNativePlatform() ? nativePlatform(version) : webPlatform(window.__FI_PHONE_TEST__ ?? {}, version)
}
