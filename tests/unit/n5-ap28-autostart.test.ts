import { describe, expect, it } from 'vitest'
import { loginEntryDisabled, loginEntryOf, loginItemWrites, type LaunchItem, type LoginContext } from '../../src/main/loginItem'

// The Run key is never touched here: the rules decide the writes, the test reads them (AP-28, incident of 03.11.2026).
const INSTALLED = 'C:\\Users\\Kapitan\\AppData\\Local\\Programs\\Financial Intel\\Financial Intel.exe'
const LAB = 'C:\\CC-Projekty\\FinancialIntel\\release\\win-unpacked\\Financial Intel.exe'
const ctx = (patch: Partial<LoginContext>): LoginContext => ({
  want: false,
  changed: false,
  ownProfile: true,
  windows: true,
  name: 'Financial Intel',
  path: INSTALLED,
  args: ['--hidden'],
  items: [],
  ...patch
})
const own = { name: 'Financial Intel', path: INSTALLED, args: ['--hidden'] }

describe('autostart przy dwóch profilach (AP-28)', () => {
  it('start z ustawieniem wyłączonym nie usuwa żadnego wpisu – także wpisu tego samego exe (przegląd 2 N5: „wyłączone” bywa domyślne)', () => {
    // „Off” at a start may be no choice at all (config.json broken and set aside, or gone): the user's entry stays.
    expect(loginItemWrites(ctx({ want: false, changed: false, items: [own] }))).toEqual([])
    expect(loginItemWrites(ctx({ want: false, changed: false, items: [] }))).toEqual([])
    // Another copy (the lab's unpacked build) with the user's entry of the installed app in the Run key: not even asked.
    expect(loginItemWrites(ctx({ want: false, changed: false, path: LAB, items: [] }))).toEqual([])
    // The portable copy beside the installed one (T433: another name of the entry) – the installed app's entry is not its.
    const portable = { name: 'Financial Intel (portable)', path: 'D:\\Programy\\Financial-Intel-portable.exe' }
    expect(loginItemWrites(ctx({ want: false, changed: false, ...portable, items: [] }))).toEqual([])
    // An old entry of this exe under another name (B52) – only with a change of the setting.
    const old = { name: 'app.financialintel.desktop', path: INSTALLED, args: [] }
    expect(loginItemWrites(ctx({ want: false, changed: false, items: [old] }))).toEqual([])
  })

  it('profil testowy (FI_USER_DATA) nigdy nie pisze – ani przy starcie, ani po przełączeniu', () => {
    for (const want of [true, false]) for (const changed of [true, false]) expect(loginItemWrites(ctx({ ownProfile: false, want, changed, items: [own] }))).toEqual([])
  })

  it('wyłączenie tutaj usuwa tylko wpis tego exe; wpis o tej nazwie innej kopii zostaje', () => {
    expect(loginItemWrites(ctx({ want: false, changed: true, items: [own] }))).toEqual([{ openAtLogin: false, ...own }])
    // This copy is the lab's: the user's „Financial Intel” starts another exe – it is not in this exe's items.
    expect(loginItemWrites(ctx({ want: false, changed: true, path: LAB, items: [] }))).toEqual([])
  })

  it('start z ustawieniem włączonym: wpis jest – nic; brak albo inne argumenty – zapis', () => {
    expect(loginItemWrites(ctx({ want: true, items: [own] }))).toEqual([])
    expect(loginItemWrites(ctx({ want: true, items: [] }))).toEqual([{ openAtLogin: true, ...own }])
    expect(loginItemWrites(ctx({ want: true, items: [{ ...own, args: [] }] }))).toEqual([{ openAtLogin: true, ...own }])
  })

  it('stare wpisy tego exe pod inną nazwą (B52) – tylko przy zmianie ustawienia, po zapisie własnego', () => {
    const old = { name: 'app.financialintel.desktop', path: INSTALLED.toUpperCase(), args: [] }
    expect(loginItemWrites(ctx({ want: true, items: [own, old] }))).toEqual([])
    expect(loginItemWrites(ctx({ want: true, changed: true, items: [old] }))).toEqual([{ openAtLogin: true, ...own }, { openAtLogin: false, ...old }])
    expect(loginItemWrites(ctx({ want: false, changed: true, items: [own, old] }))).toEqual([{ openAtLogin: false, ...own }, { openAtLogin: false, ...old }])
  })

  it('macOS: przy starcie tylko włączone, zmiana – zawsze', () => {
    const mac = { windows: false, path: '/Applications/Financial Intel.app/Contents/MacOS/Financial Intel' }
    expect(loginItemWrites(ctx({ ...mac, want: false }))).toEqual([])
    expect(loginItemWrites(ctx({ ...mac, want: false, changed: true }))).toHaveLength(1)
    expect(loginItemWrites(ctx({ ...mac, want: true }))).toMatchObject([{ openAtLogin: true }])
  })
})

describe('stan wpisu w systemie tej kopii (przegląd 3 N5, T433)', () => {
  const base = { ownProfile: true, windows: true, path: INSTALLED, items: [] as LaunchItem[] }
  it('wpis tego exe – tak (także pod starą nazwą); wyłączony w Menedżerze zadań albo innej kopii – nie; profil testowy – nieznany', () => {
    expect(loginEntryOf({ ...base, items: [own] })).toBe(true)
    expect(loginEntryOf({ ...base, items: [{ name: 'app.financialintel.desktop', path: INSTALLED.toUpperCase(), args: [] }] })).toBe(true)
    expect(loginEntryOf({ ...base, items: [{ ...own, enabled: false }] })).toBe(false)
    expect(loginEntryOf({ ...base, items: [] })).toBe(false)
    expect(loginEntryOf({ ...base, path: LAB, items: [own] })).toBe(false)
    expect(loginEntryOf({ ...base, ownProfile: false, items: [own] })).toBeNull()
    expect(loginEntryOf({ ...base, windows: false, openAtLogin: true })).toBe(true)
  })
})

describe('wpis wyłączony w Menedżerze zadań (przegląd 4 N5)', () => {
  /** An atrapa of Electron's login settings: the Run key with its startup approval (`enabled`), by the entry's name. */
  function system(items: LaunchItem[]) {
    let run = items
    return {
      getLoginItemSettings: () => ({ launchItems: run }),
      setLoginItemSettings: (w: { openAtLogin: boolean; name: string; path: string; args: string[]; enabled?: boolean }) => {
        run = run.filter((i) => i.name !== w.name)
        // Electron: `enabled` defaults to true – a write without it leaves the approval as it was only when nothing is written.
        if (w.openAtLogin) run.push({ name: w.name, path: w.path, args: w.args, enabled: w.enabled ?? true })
      }
    }
  }
  const state = (s: ReturnType<typeof system>) => ({ ownProfile: true, windows: true, path: INSTALLED, items: s.getLoginItemSettings().launchItems })

  it('przełącznik „włącz” zapisuje wpis włączony – przełącznik pokazuje „włączony”; start nie zmienia wyboru z Menedżera zadań', () => {
    const s = system([{ ...own, enabled: false }])
    expect(loginEntryOf(state(s))).toBe(false)
    expect(loginEntryDisabled(state(s))).toBe(true)
    // A start with the setting on: the user's choice in Task Manager stays.
    expect(loginItemWrites(ctx({ want: true, changed: false, items: s.getLoginItemSettings().launchItems }))).toEqual([])
    // Switched on here: before, nothing was written (the entry there, its arguments the same) and the switch flipped back.
    const writes = loginItemWrites(ctx({ want: true, changed: true, items: s.getLoginItemSettings().launchItems }))
    expect(writes).toEqual([{ openAtLogin: true, ...own, enabled: true }])
    for (const w of writes) s.setLoginItemSettings(w)
    expect(loginEntryOf(state(s))).toBe(true)
    expect(loginEntryDisabled(state(s))).toBe(false)
  })
})
