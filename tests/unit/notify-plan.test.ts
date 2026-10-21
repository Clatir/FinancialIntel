// The phone's notifications planned ahead (IP0.4, T306): the morning briefing, the evening report and the radar's days
// for the next week – never in the quiet hours or the past, the switches of the phone, iOS's limit, the plan kept
// between openings so the notifier of the open app does not show the same one again.
import { describe, expect, it } from 'vitest'
import { DEFAULT_MACHINE_PREFS, type NotifyPrefs } from '../../src/shared/machine'
import { BRIEFING_FROM, PLANNED_MAX, RADAR_FROM, keepPlanned, morningAt, plannedDue, plannedNotices, warsawAt, type PlanInput } from '../../src/shared/notifyPlan'
import type { RadarItem } from '../../src/shared/calc/radar'

const prefs = (patch: Partial<NotifyPrefs> = {}): NotifyPrefs => ({ ...DEFAULT_MACHINE_PREFS.notify, briefing: true, evening: true, eveningTime: '21:00', ...patch })

const item = (patch: Partial<RadarItem>): RadarItem => ({ key: 'k', date: '2026-10-23', kind: 'fixed', name: 'OC auta', amount: 124000, direction: 'out', note: '', ...patch })

const input = (patch: Partial<PlanInput> = {}): PlanInput => ({
  today: '2026-10-21',
  time: '10:00',
  days: 7,
  prefs: prefs(),
  quietHours: { from: '23:00', to: '05:00' },
  items: [],
  money: (g) => `${(g / 100).toFixed(2)} zł`,
  evening: null,
  started: true,
  ...patch
})

describe('plan powiadomień na telefonie', () => {
  it('odprawa rano (nie przed 7:00) i raport wieczorem na 7 dni; dziś bez minionej odprawy', () => {
    const list = plannedNotices(input())
    const briefings = list.filter((n) => n.key.startsWith('briefing:'))
    const evenings = list.filter((n) => n.key.startsWith('evening:'))
    // Today's 7:00 is past at 10:00: six mornings, seven evenings.
    expect(briefings.map((n) => n.key)).toEqual(['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'].map((d) => `briefing:${d}`))
    expect(evenings).toHaveLength(7)
    expect(briefings[0]?.at).toBe(warsawAt('2026-10-22', BRIEFING_FROM))
    expect(evenings[0]?.at).toBe(warsawAt('2026-10-21', '21:00'))
    // In time order.
    expect(list.map((n) => n.at)).toEqual([...list.map((n) => n.at)].sort())
  })

  it('godzina z czasem warszawskim – także po zmianie czasu (koniec października)', () => {
    expect(warsawAt('2026-10-24', '07:00')).toBe('2026-10-24T05:00:00Z')
    expect(warsawAt('2026-10-26', '07:00')).toBe('2026-10-26T06:00:00Z')
  })

  it('rano po ciszy nocnej, nie wcześniej niż próg; bez ciszy albo z ciszą w dzień – próg', () => {
    expect(morningAt({ from: '23:00', to: '05:00' }, '07:00')).toBe('07:00')
    expect(morningAt({ from: '23:30', to: '08:15' }, '07:00')).toBe('08:15')
    expect(morningAt({ from: '22:00', to: '22:00' }, '07:00')).toBe('07:00')
    expect(morningAt({ from: '13:00', to: '15:00' }, '07:00')).toBe('07:00')
  })

  it('nic w ciszy nocnej: raport wieczorny przed nią', () => {
    const list = plannedNotices(input({ prefs: prefs({ eveningTime: '23:30' }) }))
    const evening = list.find((n) => n.key === 'evening:2026-10-21')
    // The evening time in the quiet hours: a minute before them (as on a computer).
    expect(evening?.at).toBe(warsawAt('2026-10-21', '22:59'))
  })

  it('raport dziś zrobiony – bez przypomnienia dziś; wyłączone – nic; budżet bez startu – nic', () => {
    const done = plannedNotices(input({ evening: { written: 2, done: true, snooze: null } }))
    expect(done.some((n) => n.key === 'evening:2026-10-21')).toBe(false)
    expect(done.some((n) => n.key === 'evening:2026-10-22')).toBe(true)
    expect(plannedNotices(input({ prefs: prefs({ briefing: false, evening: false }) }))).toEqual([])
    expect(plannedNotices(input({ started: false }))).toEqual([])
  })

  it('dni radaru rano (nie przed 9:00): kwota, przełączniki, zaległe i spoza tygodnia pominięte', () => {
    const items = [
      item({ key: 'fee', date: '2026-10-23' }),
      item({ key: 'late', date: '2026-10-23', overdue: true }),
      item({ key: 'far', date: '2026-11-20' }),
      item({ key: 'rate', kind: 'installment', name: 'Pożyczka od Ani', amount: 50000, date: '2026-10-22' }),
      item({ key: 'pit', kind: 'pit38', name: 'PIT-38', amount: null, date: '2026-10-24', note: 'termin' }),
      item({ key: 'salary', kind: 'salary', name: 'Pensja', date: '2026-10-22' })
    ]
    const list = plannedNotices(input({ items, prefs: prefs({ briefing: false, evening: false, cargo: true, asteroid: false, loans: true, pit38: false }) }))
    expect(list.map((n) => n.key)).toEqual(['planned:rate', 'planned:fee'])
    expect(list[0]).toMatchObject({ title: 'Rata pożyczki dziś', body: 'Pożyczka od Ani · 500.00 zł', tag: 'radar', at: warsawAt('2026-10-22', RADAR_FROM) })
    const pit = plannedNotices(input({ items, prefs: prefs({ briefing: false, evening: false, cargo: false, asteroid: false, loans: false, pit38: true }) }))
    expect(pit.map((n) => [n.key, n.body])).toEqual([['planned:pit', 'PIT-38 – termin']])
  })

  it('najwyżej tyle, ile iOS trzyma (z zapasem) – najbliższe', () => {
    const items = Array.from({ length: 80 }, (_, i) => item({ key: `f${i}`, date: '2026-10-25' }))
    const list = plannedNotices(input({ items }))
    expect(list).toHaveLength(PLANNED_MAX)
    expect(list[0]?.key).toBe('evening:2026-10-21')
  })

  it('pamięć planu: minione zostają (iOS je pokazał), anulowane znikają, starsze niż 2 dni też', () => {
    const now = Date.parse('2026-10-22T08:00:00Z')
    const kept = {
      'briefing:2026-10-22': '2026-10-22T05:00:00Z',
      'briefing:2026-10-19': '2026-10-19T05:00:00Z',
      'evening:2026-10-22': '2026-10-22T19:00:00Z'
    }
    const next = keepPlanned(kept, [{ key: 'briefing:2026-10-23', at: '2026-10-23T05:00:00Z', title: '', body: '', tag: 'briefing' }], now)
    expect(next).toEqual({ 'briefing:2026-10-22': '2026-10-22T05:00:00Z', 'briefing:2026-10-23': '2026-10-23T05:00:00Z' })
    // Due within two minutes: the notifier's as sent.
    expect(plannedDue(next, now + 120_000)).toEqual(['briefing:2026-10-22'])
    expect(plannedDue(next, Date.parse('2026-10-23T05:00:00Z'))).toEqual(['briefing:2026-10-22', 'briefing:2026-10-23'])
  })
})
