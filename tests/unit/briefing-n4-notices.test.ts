// AP-16 (N4, 1.15.8): the briefing before the other notifications, one notification instead of ten at once, the briefing's
// hour as an option (D99 pkt 7 – by default at the first opening).
import { describe, expect, it } from 'vitest'
import { computeFleet } from '@shared/calc/fleet'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS, machinePrefsFrom } from '@shared/machine'
import { briefingAt, bundleNotices, dueNotices, morningTouch, type Notice } from '@shared/notify'
import { plannedNotices } from '@shared/notifyPlan'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, type Settings } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: `01K3200000000000000000${String(++seq).padStart(4, '0')}`, createdAt: AT, updatedAt: AT })
const settings = (): Settings => {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, start: '2026-10-01' } }
}
const fleet = computeFleet({
  settings: settings(),
  transactions: [],
  months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(3100), envelopes: { [defaultCategoryId(1)]: zl(3100) } })],
  balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })],
  now: '2026-10-14T08:00:00.000Z'
})

// An import overdue (never imported): a notice of the day besides the briefing.
const input = (time: string, over: Partial<Parameters<typeof dueNotices>[0]> = {}): Parameters<typeof dueNotices>[0] => ({
  fleet,
  containers: [],
  imports: [{ name: 'mBank', last: null }],
  lastConfirmation: fleet.today,
  label: () => 'Jedzenie',
  prefs: DEFAULT_MACHINE_PREFS.notify,
  quietHours: { from: '23:00', to: '05:00' },
  time,
  opened: false,
  money: (g: number) => `${(g / 100).toFixed(2)} zł`,
  ...over
})
const tags = (list: Notice[]) => list.map((n) => n.tag)

describe('odprawa przed innymi powiadomieniami (AP-16, RY sp. 4)', () => {
  it('po ciszy nocnej bez otwarcia okna inne powiadomienia czekają na odprawę – najwyżej do 9:00', () => {
    expect(dueNotices(input('05:01'))).toEqual([])
    expect(dueNotices(input('08:59'))).toEqual([])
    expect(tags(dueNotices(input('09:00')))).toEqual(['import'])
    // The first opening: the briefing first, the others with it.
    expect(tags(dueNotices(input('05:30', { opened: true })))).toEqual(['briefing', 'import'])
    // The briefing shown already today: nothing waits.
    expect(tags(dueNotices(input('06:00', { briefingShown: true })))).toEqual(['import'])
    // The briefing switched off: nothing waits for it.
    expect(tags(dueNotices(input('06:00', { prefs: { ...DEFAULT_MACHINE_PREFS.notify, briefing: false } })))).toEqual(['import'])
  })

  it('godzina odprawy (D99 pkt 7): odprawa o niej bez otwarcia okna, wcześniej – ani przy otwarciu; inne czekają do niej', () => {
    const prefs = { ...DEFAULT_MACHINE_PREFS.notify, briefingTime: '07:30' }
    expect(dueNotices(input('07:29', { prefs, opened: true }))).toEqual([])
    expect(tags(dueNotices(input('07:30', { prefs })))).toEqual(['briefing', 'import'])
    // A briefing set for the evening holds nothing back past noon.
    const late = { ...DEFAULT_MACHINE_PREFS.notify, briefingTime: '19:00' }
    expect(dueNotices(input('11:59', { prefs: late }))).toEqual([])
    expect(tags(dueNotices(input('12:00', { prefs: late })))).toEqual(['import'])
    expect(tags(dueNotices(input('19:00', { prefs: late })))).toEqual(['briefing', 'import'])
  })

  it('godzina w ciszy nocnej – odprawa na jej końcu', () => {
    expect(briefingAt('04:00', { from: '23:00', to: '05:00' })).toBe('05:00')
    expect(briefingAt('06:15', { from: '23:00', to: '05:00' })).toBe('06:15')
    expect(briefingAt(null, { from: '23:00', to: '05:00' })).toBeNull()
  })

  it('telefon planuje odprawę na jej godzinę', () => {
    const plan = (briefingTime: string | null) =>
      plannedNotices({ today: '2026-10-14', time: '05:00', days: 1, prefs: { ...DEFAULT_MACHINE_PREFS.notify, briefingTime }, quietHours: { from: '23:00', to: '05:00' }, items: [], money: String, evening: null, started: true }).find((n) => n.tag === 'briefing')?.at
    expect(plan(null)).toBe('2026-10-14T05:00:00Z')
    expect(plan('06:45')).toBe('2026-10-14T04:45:00Z')
  })

  it('godzina odprawy w config.json – addytywnie: brak albo błędna = przy pierwszym otwarciu', () => {
    expect(DEFAULT_MACHINE_PREFS.notify.briefingTime).toBeNull()
    expect(machinePrefsFrom({ notify: {} }).notify.briefingTime).toBeNull()
    expect(machinePrefsFrom({ notify: { briefingTime: '06:30' } }).notify.briefingTime).toBe('06:30')
    expect(machinePrefsFrom({ notify: { briefingTime: '25:00' } }).notify.briefingTime).toBeNull()
  })
})

describe('okno zostawione na noc: pierwszy dotyk po ciszy nocnej prowadzi na Mostek (AF-67)', () => {
  const quiet = { from: '23:00', to: '05:00' }
  const at = (iso: string) => Date.parse(iso)
  it('ostatni dotyk przed końcem ciszy – poranny; po nim – już nie (kreator, praca w ciągu dnia)', () => {
    // 05:00 Warsaw on 14.10 = 03:00 UTC.
    expect(morningTouch(at('2026-10-13T20:00:00Z'), { date: '2026-10-14', time: '06:10' }, quiet)).toBe(true)
    expect(morningTouch(0, { date: '2026-10-14', time: '10:00' }, quiet)).toBe(true)
    expect(morningTouch(at('2026-10-14T03:30:00Z'), { date: '2026-10-14', time: '10:00' }, quiet)).toBe(false)
    // Before the quiet hours end today: yesterday's end counts.
    expect(morningTouch(at('2026-10-13T12:00:00Z'), { date: '2026-10-14', time: '01:00' }, quiet)).toBe(false)
    expect(morningTouch(0, { date: '2026-10-14', time: '10:00' }, { from: '00:00', to: '00:00' })).toBe(false)
  })
})

describe('jedno zbiorcze powiadomienie zamiast 10 (AP-16, US sp. 1)', () => {
  const n = (key: string, tag: Notice['tag'], title: string, alarm = false): Notice => ({ key, tag, title, body: `${title}.`, ...(alarm ? { alarm } : {}) })
  const start = [
    n('asteroid:1', 'asteroid', 'Asteroida na kursie'),
    n('import:1', 'import', 'Zaległy import z mBanku'),
    n('loan:1', 'radar', 'Rata pożyczki po terminie'),
    n('loan:2', 'radar', 'Rata pożyczki po terminie'),
    n('house:1', 'radar', 'Rozliczenie z domownikiem'),
    n('overrun:1', 'overrun', 'Koperta Auto przekroczona', true),
    { key: 'briefing:2026-10-14', tag: 'briefing' as const, title: 'Odprawa poranna', body: 'Energia dziś: 77,28 zł. Alarmy: 5.' }
  ]

  it('odprawa na czele, reszta wymieniona w niej – jedno powiadomienie, dźwięk alarmu, gdy któreś go ma', () => {
    const out = bundleNotices(start)
    expect(out).toHaveLength(1)
    expect(out[0]).toEqual({
      key: 'briefing:2026-10-14',
      tag: 'briefing',
      title: 'Odprawa poranna',
      alarm: true,
      body: 'Energia dziś: 77,28 zł. Alarmy: 5. Do tego 6 innych powiadomień: Asteroida na kursie, Zaległy import z mBanku, Rata pożyczki po terminie (2), Rozliczenie z domownikiem, Koperta Auto przekroczona – Mostek.'
    })
  })

  it('bez odprawy – „Powiadomienia (N)”; mniej niż 3 – osobno, odprawa pierwsza', () => {
    const out = bundleNotices(start.slice(0, 3))
    expect(out.map((x) => [x.title, x.body, x.tag])).toEqual([['Powiadomienia (3)', 'Asteroida na kursie, Zaległy import z mBanku, Rata pożyczki po terminie – Mostek.', 'briefing']])
    expect(bundleNotices([start[0]!, start[6]!]).map((x) => x.tag)).toEqual(['briefing', 'asteroid'])
  })
})
