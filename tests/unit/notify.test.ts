import { describe, expect, it } from 'vitest'
import { computeFleet } from '@shared/calc/fleet'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS, machinePrefsFrom, patchMachinePrefs, shortcutLabel } from '@shared/machine'
import { dueNotices } from '@shared/notify'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Settings } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: `01K3000000000000000000${String(++seq).padStart(4, '0')}`, createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const AUTO = defaultCategoryId(3)
const settings = (): Settings => {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, start: '2026-10-01' } }
}
const spend = (date: string, v: number, categoryId: string) => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -zl(v), categoryId })

function fleetAt(now: string, spent: Array<[string, number, string]> = []) {
  const balances = [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })]
  const months = [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(3100), envelopes: { [FOOD]: zl(3100), [AUTO]: zl(300) } })]
  return computeFleet({ settings: settings(), transactions: spent.map(([d, v, c]) => spend(d, v, c)), months, balances, now })
}

const input = (fleet: ReturnType<typeof fleetAt>, time: string, over: Partial<Parameters<typeof dueNotices>[0]> = {}) => ({
  fleet,
  containers: [],
  imports: [{ name: 'mBank', last: `${fleet.today}T08:00:00.000Z` }],
  lastConfirmation: fleet.today,
  label: (id: string) => (id === AUTO ? 'Auto' : 'Jedzenie'),
  prefs: DEFAULT_MACHINE_PREFS.notify,
  quietHours: { from: '23:00', to: '05:00' },
  time,
  opened: false,
  money: (g: number) => `${(g / 100).toFixed(2)} zł`,
  ...over
})

describe('powiadomienia (spec, D70)', () => {
  it('odprawa przy otwarciu okna, wieczorne dopisanie od 21:00, nic w ciszy nocnej', () => {
    const f = fleetAt('2026-10-14T08:00:00.000Z')
    expect(dueNotices(input(f, '10:00')).map((n) => n.key)).toEqual([])
    expect(dueNotices(input(f, '10:00', { opened: true })).map((n) => [n.key, n.title])).toEqual([['briefing:2026-10-14', 'Odprawa poranna']])
    expect(dueNotices(input(f, '21:05')).map((n) => n.tag)).toEqual(['evening'])
    expect(dueNotices(input(f, '23:30', { opened: true }))).toEqual([])
    // Switched off on this computer.
    expect(dueNotices(input(f, '21:05', { prefs: { ...DEFAULT_MACHINE_PREFS.notify, evening: false } }))).toEqual([])
  })

  it('przekroczenie (dźwięk alarmu) i koperta ponad 80%, raz na miesiąc i kategorię', () => {
    const f = fleetAt('2026-10-14T08:00:00.000Z', [['2026-10-05', 260, AUTO], ['2026-10-14', 900, FOOD]])
    const n = dueNotices(input(f, '12:00'))
    expect(n.map((x) => [x.key, x.alarm ?? false])).toEqual([
      ['overrun:daily:2026-10-14', true],
      ['low:01KDEFCAT00000000000000300:2026-10', false]
    ])
  })

  it('niedziela – salda, gdy nie potwierdzone w tym tygodniu; debriefing od 1. do 7. dnia; zaległy import', () => {
    // 18.10.2026 is a Sunday: confirmed last Sunday – asked; confirmed on Saturday – not.
    const sunday = fleetAt('2026-10-18T09:00:00.000Z')
    expect(dueNotices(input(sunday, '10:00', { lastConfirmation: '2026-10-11' })).map((n) => n.tag)).toEqual(['balances'])
    expect(dueNotices(input(sunday, '10:00', { lastConfirmation: '2026-10-17' }))).toEqual([])
    // 1.11.2026 (a Sunday too): the import of 20.10 overdue, the balances, the debriefing of October.
    const first = fleetAt('2026-11-01T09:00:00.000Z')
    expect(dueNotices(input(first, '10:00', { imports: [{ name: 'mBank', last: '2026-10-20T08:00:00.000Z' }], lastConfirmation: '2026-10-25' })).map((n) => n.key)).toEqual([
      'import:mBank:2026-11-01',
      'balances:2026-11-01',
      'debriefing:2026-11'
    ])
    // The computer off on the 1st: the debriefing at the first look until the 7th, then not.
    expect(dueNotices(input(fleetAt('2026-11-05T09:00:00.000Z'), '10:00')).map((n) => n.key)).toEqual(['debriefing:2026-11'])
    expect(dueNotices(input(fleetAt('2026-11-08T09:00:00.000Z'), '10:00', { lastConfirmation: '2026-11-08' }))).toEqual([])
    // The budget's first month has nothing to debrief yet.
    expect(dueNotices(input(fleetAt('2026-10-01T09:00:00.000Z'), '10:00')).map((n) => n.tag)).toEqual([])
  })

  it('przekroczenie z wyłączonym „przekroczeniem” nie udaje „na wyczerpaniu”', () => {
    const f = fleetAt('2026-10-14T08:00:00.000Z', [['2026-10-05', 260, AUTO], ['2026-10-14', 900, FOOD]])
    const quiet = { ...DEFAULT_MACHINE_PREFS.notify, overrun: false }
    expect(dueNotices(input(f, '12:00', { prefs: quiet })).map((n) => n.key)).toEqual(['low:01KDEFCAT00000000000000300:2026-10'])
  })
})

describe('ustawienia komputera (config.json)', () => {
  it('domyślne, łatka jednej sekcji, złe wartości → domyślne', () => {
    expect(machinePrefsFrom(undefined)).toEqual(DEFAULT_MACHINE_PREFS)
    expect(DEFAULT_MACHINE_PREFS.sounds).toMatchObject({ enabled: true, volume: 0.3 })
    const p = patchMachinePrefs(DEFAULT_MACHINE_PREFS, { notify: { evening: false }, sounds: { events: { alarm: false } } })
    expect(p.notify).toMatchObject({ evening: false, briefing: true, eveningTime: '21:00' })
    expect(p.sounds.events).toMatchObject({ alarm: false, entry: true })
    expect(machinePrefsFrom({ quickShortcut: 5, notify: { eveningTime: '25:00' }, sounds: { volume: 7 } })).toMatchObject({ quickShortcut: 'Control+Alt+B', notify: { eveningTime: '21:00' }, sounds: { volume: 1 } })
    expect(shortcutLabel('Control+Alt+B')).toBe('Ctrl+Alt+B')
  })
})
