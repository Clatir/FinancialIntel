import { describe, expect, it } from 'vitest'
import { computeFleet } from '@shared/calc/fleet'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS, machinePrefsFrom, patchMachinePrefs, shortcutLabel } from '@shared/machine'
import { dueNotices, eveningState, eveningText } from '@shared/notify'
import { quickTemplates } from '@shared/calc/quick'
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

  it('raport wachty w niedzielę od 18:00, raz w tygodniu (E8)', () => {
    const f = fleetAt('2026-10-18T08:00:00.000Z')
    expect(dueNotices(input(f, '17:59')).map((n) => n.tag)).not.toContain('reports')
    expect(dueNotices(input(f, '18:30')).filter((n) => n.tag === 'reports').map((n) => [n.key, n.title])).toEqual([['watch:2026-10-18', 'Raport wachty']])
    expect(dueNotices(input(f, '18:30', { prefs: { ...DEFAULT_MACHINE_PREFS.notify, watch: false } })).map((n) => n.tag)).not.toContain('reports')
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

describe('wieczorny raport wachty (1.6.0, F13)', () => {
  const typed = (date: string, time: string | null, createdAt: string, v = -zl(12)) => transactionSchema.parse({ ...base(), date, time, createdAt, accountId: MBANK_ACCOUNT_ID, amount: v })
  it('ile dziś wpisano z godziną; dzień zamknięty – potwierdzony albo wydatek dopisany od 18:00', () => {
    const today = '2026-10-14'
    const morning = typed(today, '08:10', '2026-10-14T06:15:00.000Z')
    expect(eveningState([morning], today, {})).toEqual({ written: 1, done: false, snooze: null })
    // Written at 19:30 Warsaw time without an hour (a purchase of the day written in the evening).
    expect(eveningState([morning, typed(today, null, '2026-10-14T17:30:00.000Z')], today, {}).done).toBe(true)
    expect(eveningState([typed(today, '18:40', '2026-10-14T06:00:00.000Z')], today, {}).done).toBe(true)
    expect(eveningState([], today, { [today]: '2026-10-14T19:00:00.000Z' })).toMatchObject({ written: 0, done: true })
    expect(eveningText(0)).toContain('Dziś nic jeszcze nie dopisano')
    expect(eveningText(1)).toContain('1 operację')
    expect(eveningText(3)).toContain('3 operacje')
    expect(eveningText(12)).toContain('12 operacji')
    expect(eveningText(22)).toContain('22 operacje')
  })

  it('powiadomienie: tekst z liczbą, nie po zamknięciu dnia, odłożone – znowu od swojej godziny, pod nowym kluczem', () => {
    const f = fleetAt('2026-10-14T08:00:00.000Z')
    const at = (time: string, evening: Parameters<typeof dueNotices>[0]['evening']) => dueNotices(input(f, time, { evening })).filter((n) => n.tag === 'evening')
    expect(at('21:05', { written: 2, done: false, snooze: null }).map((n) => [n.key, n.body])).toEqual([['evening:2026-10-14', eveningText(2)]])
    expect(at('21:05', { written: 2, done: true, snooze: null })).toEqual([])
    expect(at('21:20', { written: 0, done: false, snooze: { until: '21:35', n: 1 } })).toEqual([])
    expect(at('21:35', { written: 0, done: false, snooze: { until: '21:35', n: 1 } }).map((n) => n.key)).toEqual(['evening:2026-10-14:1'])
  })
})

describe('szablony szybkiego wpisu (1.6.0, F7)', () => {
  it('ostatni wpis ręczny i 5 ostatnich par kontrahent + kategoria – bez importu, paragonów i powtórzeń pary', () => {
    const op = (createdAt: string, counterparty: string, categoryId: string | null, over: Record<string, unknown> = {}) =>
      transactionSchema.parse({ ...base(), date: '2026-10-14', createdAt, accountId: MBANK_ACCOUNT_ID, amount: -zl(10), counterparty, categoryId, ...over })
    const list = [
      op('2026-10-10T10:00:00.000Z', 'Kawiarnia', FOOD),
      op('2026-10-11T10:00:00.000Z', 'KAWIARNIA', FOOD),
      op('2026-10-12T10:00:00.000Z', 'Stacja', AUTO),
      op('2026-10-13T10:00:00.000Z', 'Bank', FOOD, { bank: { format: 'mbank', key: 'k', description: '', counterparty: 'Bank', operation: '', category: '', pending: false, importedAt: AT } }),
      op('2026-10-14T10:00:00.000Z', 'Paragon', FOOD, { splits: [{ id: base().id, amount: -zl(10), categoryId: FOOD, refundable: false, memberId: null, advance: false, note: '' }] }),
      op('2026-10-14T11:00:00.000Z', 'Bez kategorii', null),
      op('2026-10-14T12:00:00.000Z', 'Pensja', null, { kind: 'income', amount: zl(5000) })
    ]
    const { last, templates } = quickTemplates(list)
    expect(last).toMatchObject({ kind: 'income', counterparty: 'Pensja', amount: zl(5000), categoryId: null })
    expect(templates.map((t) => [t.counterparty, t.categoryId])).toEqual([
      ['Stacja', AUTO],
      ['KAWIARNIA', FOOD]
    ])
    // The same list: the same answer (once per list of the store).
    expect(quickTemplates(list).templates).toBe(templates)
    // At most 5 pairs, the newest; the order of the list does not matter.
    const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((n, i) => op(`2026-10-0${i + 1}T10:00:00.000Z`, `Sklep ${n}`, FOOD)).reverse()
    expect(quickTemplates(many).templates.map((t) => t.counterparty)).toEqual(['Sklep G', 'Sklep F', 'Sklep E', 'Sklep D', 'Sklep C'])
    expect(quickTemplates(many).last?.counterparty).toBe('Sklep G')
    // Whose money it was goes with „Powtórz ostatni”: a member's gift, a member's income kept as their advance.
    const member = '01K3000000000000000000MEM1'
    const gift = op('2026-10-15T10:00:00.000Z', 'Prezent', FOOD, { refundable: true, memberId: member, gift: true })
    expect(quickTemplates([gift]).last).toMatchObject({ kind: 'refundable', memberId: member, gift: true, advance: false })
    const money = op('2026-10-15T10:00:00.000Z', 'Babcia', null, { kind: 'income', amount: zl(200), memberId: member, advance: true })
    expect(quickTemplates([money]).last).toMatchObject({ kind: 'income', memberId: member, advance: true, gift: false })
    expect(quickTemplates([op('2026-10-15T10:00:00.000Z', 'Pensja', null, { kind: 'income', amount: zl(5000) })]).last).toMatchObject({ memberId: null, advance: false })
  })
})
