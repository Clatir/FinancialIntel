// The phone's `window.fi` (T305): errors cross like Electron's (the window strips the prefix), what only a computer does
// says so, the quick entry in the same window, a notification's tap kept until the window listens, this phone's
// preferences, its use and presence, the folder's changes after the window shows the folder.
import { beforeEach, describe, expect, it } from 'vitest'
import { PC_ONLY, PhoneHost, phoneTapTag, type KeyValue, type Notifications, type PhoneNotice } from '../../src/mobile/host/host'
import { useVfs } from '../../src/mobile/node/fs'
import { MemoryPersistence, Vfs } from '../../src/mobile/vfs/vfs'
import { MIRROR } from '../../src/mobile/sync/engine'
import type { ChangeSet, QuickData } from '@shared/api'
import { createDefaultSettings } from '@shared/defaults'
import { newId } from '@shared/ids'
import { serializeRecord } from '@shared/records'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION } from '@shared/schema'

const CREATED = '2026-01-01T00:00:00.000Z'
const enc = new TextEncoder()
const dec = new TextDecoder()

function memoryKv(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, get: async (k) => data.get(k) ?? null, set: async (k, v) => void data.set(k, v), remove: async (k) => void data.delete(k) }
}

function fakeNotifications(): Notifications & { shown: PhoneNotice[]; tap(tag: string): void } {
  let cb: ((tag: string) => void) | null = null
  return {
    shown: [],
    show: async function (n) {
      this.shown.push(n)
    },
    onTap: (fn) => {
      cb = fn
    },
    tap: (tag) => cb?.(tag)
  }
}

let vfs: Vfs
let now = Date.parse('2026-10-21T10:00:00Z')

beforeEach(async () => {
  vfs = new Vfs(new MemoryPersistence())
  await vfs.load()
  useVfs(vfs)
  now = Date.parse('2026-10-21T10:00:00Z')
})

function host(kv = memoryKv(), notifications = fakeNotifications()) {
  const h = new PhoneHost({ version: '1.11.0', kv, notifications, openUrl: async () => undefined, now: () => now })
  return { h, kv, notifications }
}

async function seedFolder(): Promise<void> {
  await vfs.mkdir(MIRROR, { recursive: true })
  await vfs.writeFile(`${MIRROR}/fi.json`, enc.encode(serializeRecord('fi', createDefaultSettings(CREATED))))
}

describe('window.fi na telefonie', () => {
  it('błąd jak z Electrona – okno zdejmuje przedrostek; funkcja komputera mówi, że jest na komputerze', async () => {
    const { h } = host()
    const g = globalThis as unknown as { window?: unknown }
    g.window = { fi: h.api }
    const { errorMessage } = await import('../../src/renderer/lib/api')
    const e = await h.api.saveRecord('transactions', {} as never).catch((x: unknown) => x)
    expect((e as Error).message).toMatch(/^Error invoking remote method 'fi:saveRecord': Error: Folder danych nie jest jeszcze gotowy/)
    expect(errorMessage(e)).toMatch(/^Folder danych nie jest jeszcze gotowy/)
    const pc = await h.api.exportZip().catch((x: unknown) => x)
    expect(errorMessage(pc)).toBe(PC_ONLY)
    expect(await h.api.loadCurrent()).toBeNull()
    expect((await h.api.appInfo()).platform).toBe('ios')
  })

  it('szybki wpis w tym samym oknie: arkusz, prośba o dane, odświeżenie tylko przy otwartym, wpis i wynik', async () => {
    const { h } = host()
    const sheet: boolean[] = []
    const requests: number[] = []
    const updates: Array<QuickData | null> = []
    const drafts: unknown[] = []
    h.quickSheet.on((v) => sheet.push(v))
    h.api.onQuickRequest(() => requests.push(1))
    h.api.onQuickUpdate((d) => updates.push(d))
    h.api.onQuickAdd((d) => drafts.push(d))
    const results: unknown[] = []
    h.api.onQuickResult((r) => results.push(r))
    await h.api.quickUpdate(null)
    expect(updates).toEqual([])
    await h.api.quickOpen()
    expect(sheet).toEqual([true])
    expect(requests).toHaveLength(1)
    await h.api.quickUpdate(null)
    expect(updates).toEqual([null])
    await h.api.quickAdd({ amount: -1250 })
    expect(drafts).toEqual([{ amount: -1250 }])
    await h.api.quickResult({ ok: true } as never)
    expect(results).toEqual([{ ok: true }])
    await h.api.quickClose()
    await h.api.quickClose()
    expect(sheet).toEqual([true, false])
    await h.api.quickRefresh()
    expect(requests).toHaveLength(1)
  })

  it('dotknięcie powiadomienia przed startem okna dochodzi raz; ekrany spoza telefonu prowadzą na Mostek', async () => {
    const { h, notifications } = host()
    notifications.tap('radar')
    const taps: string[] = []
    h.api.onNotificationClick((t) => taps.push(t))
    await Promise.resolve()
    expect(taps).toEqual(['briefing'])
    notifications.tap('briefing')
    expect(taps).toEqual(['briefing', 'briefing'])
    expect(phoneTapTag('dock:abc')).toBe('briefing')
    // A second listener gets no old tap.
    const later: string[] = []
    h.api.onNotificationClick((t) => later.push(t))
    await Promise.resolve()
    expect(later).toEqual([])
    await h.api.notify({ title: 'Odprawa poranna', body: 'x', tag: 'briefing', silent: true })
    expect(notifications.shown).toEqual([{ title: 'Odprawa poranna', body: 'x', tag: 'briefing', silent: true }])
  })

  it('ustawienia telefonu: bez skrótu globalnego i plików z banku, zapamiętane; ukrycie kwot przy starcie', async () => {
    const kv = memoryKv()
    const { h } = host(kv)
    await h.load()
    const seen: boolean[] = []
    h.api.onMachinePrefs((p) => seen.push(p.hideAmounts))
    const saved = await h.api.setMachinePrefs({ quickShortcut: 'Control+Alt+Q', bankFiles: true, hideOnStart: true })
    expect(saved).toMatchObject({ quickShortcut: '', bankFiles: false, hideOnStart: true, hideAmounts: false })
    expect(seen).toEqual([false])
    const again = new PhoneHost({ version: '1.11.0', kv, notifications: fakeNotifications(), openUrl: async () => undefined })
    await again.load()
    expect(again.prefs).toMatchObject({ hideOnStart: true, hideAmounts: true })
    await h.setMachineName('  iPhone Szymona  ')
    expect(kv.data.get('fi.phone.machine')).toBe('iPhone Szymona')
  })

  it('w użyciu po dotknięciu, nie po 10 minutach ani w tle', async () => {
    const { h } = host()
    const told: boolean[] = []
    h.api.onInUse((v) => told.push(v))
    h.noteActivity()
    expect(await h.api.inUseNow()).toBe(true)
    now += 11 * 60_000
    expect(h.inUseNow()).toBe(false)
    // The minute's heartbeat tells it.
    await h.beat()
    h.noteActivity()
    h.setForeground(false)
    expect(told).toEqual([true, false, true, false])
  })

  it('folder z lustra: zmiany dochodzą po pokazaniu folderu; obecność telefonu zapisana', async () => {
    await seedFolder()
    const { h } = host()
    await h.setMachineName('iPhone')
    const changes: ChangeSet[] = []
    h.api.onChange((c) => changes.push(c))
    const res = await h.api.loadCurrent()
    expect(res?.ok).toBe(true)
    const snap = res && res.ok ? res.snapshot : null
    expect(snap?.fi?.settings.shipName).toBeTruthy()
    const t = { schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: CREATED, updatedAt: CREATED, date: '2026-10-21', accountId: MBANK_ACCOUNT_ID, amount: -700, note: '' }
    const entry = await h.api.saveRecord('transactions', t as never)
    expect(entry.record.updatedBy).toBe('iPhone')
    // Not shown yet: kept for the window.
    expect(changes).toHaveLength(0)
    await h.api.folderShown(snap!.generation!)
    expect(changes.length).toBeGreaterThan(0)
    await h.beat(true)
    const presence = JSON.parse(dec.decode(await vfs.readFile(`${MIRROR}/.presence/iPhone.json`))) as { machine: string; appVersion: string }
    expect(presence).toMatchObject({ machine: 'iPhone', appVersion: '1.11.0' })
    await h.close()
  })
})
