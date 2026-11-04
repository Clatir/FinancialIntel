import { describe, expect, it } from 'vitest'
import { loginItemWrites, type LoginContext } from '../../src/main/loginItem'

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
  it('start z ustawieniem wyłączonym nie usuwa żadnego wpisu – także wpisu tego samego exe', () => {
    expect(loginItemWrites(ctx({ want: false, changed: false, items: [own] }))).toEqual([])
    // Another copy (the lab's unpacked build) with the user's entry of the installed app in the Run key: not even asked.
    expect(loginItemWrites(ctx({ want: false, changed: false, path: LAB, items: [] }))).toEqual([])
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
