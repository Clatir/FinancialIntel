// AP-16 (N4, 1.15.8): the briefing with a hierarchy – alarms, the day's matters, the rest folded; the old matters only in
// Meldunki; one line per matter; the spoken briefing as a summary; the serious violation in red.
import { describe, expect, it } from 'vitest'
import { arrangeBriefing, BRIEFING_SHOWN, briefing, briefingSpeech, spokenText, type BriefingItem } from '@shared/calc/briefing'
import { anomalies } from '@shared/calc/anomalies'
import { categoryIndex } from '@shared/calc/operations'
import { computeFleet } from '@shared/calc/fleet'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Settings } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: `01K3100000000000000000${String(++seq).padStart(4, '0')}`, createdAt: AT, updatedAt: AT })
const TODAY = '2026-11-04'

const item = (key: string, level: BriefingItem['level'], kind: BriefingItem['kind'], over: Partial<BriefingItem> = {}): BriefingItem => ({ key, level, kind, text: key, ...over })

describe('odprawa z hierarchią (AP-16)', () => {
  it('alarmy (czerwone, potem żółte) → sprawy dnia → reszta zwinięta; kolejność briefingu w obrębie poziomu', () => {
    const items = [
      item('end', 'info', 'end'),
      item('import', 'info', 'import'),
      item('loot', 'yellow', 'loot'),
      item('price', 'info', 'price'),
      item('red', 'red', 'alarm'),
      item('mission', 'info', 'mission'),
      item('asteroid-far', 'info', 'asteroid'),
      item('loan', 'yellow', 'loan')
    ]
    const v = arrangeBriefing(items, TODAY)
    expect(v.shown.map((r) => r.key)).toEqual(['red', 'loot', 'loan', 'import', 'mission'])
    expect(v.shown.map((r) => r.tier)).toEqual(['alarm', 'alarm', 'alarm', 'day', 'day'])
    expect(v.rest.map((r) => [r.key, r.tier])).toEqual([
      ['end', 'rest'],
      ['price', 'rest'],
      ['asteroid-far', 'rest']
    ])
    expect(v.older).toBe(0)
  })

  it(`na wierzchu najwyżej ${BRIEFING_SHOWN} pozycji – nadmiar żółtych się zwija, czerwone nigdy`, () => {
    const yellow = Array.from({ length: 10 }, (_, i) => item(`y${i}`, 'yellow', 'plan'))
    const v = arrangeBriefing(yellow, TODAY)
    expect(v.shown).toHaveLength(BRIEFING_SHOWN)
    expect(v.rest.map((r) => r.key)).toEqual(['y8', 'y9'])
    const red = Array.from({ length: 10 }, (_, i) => item(`r${i}`, 'red', 'alarm'))
    const w = arrangeBriefing([...yellow, ...red], TODAY)
    expect(w.shown.map((r) => r.key)).toEqual(red.map((r) => r.key))
    expect(w.rest).toHaveLength(10)
  })

  it('sprawy z Meldunków starsze niż 30 dni tylko tam (dostawa z 8 miesięcy, zwrot, saldo) – powiadomienia mają je dalej', () => {
    const items = [
      item('dock-old', 'yellow', 'dock', { since: '2026-03-05' }),
      item('dock-new', 'yellow', 'dock', { since: '2026-10-20' }),
      item('return-31', 'yellow', 'return', { since: '2026-10-04' }),
      item('return-30', 'yellow', 'return', { since: '2026-10-05' }),
      item('balances-old', 'info', 'balances', { since: '2026-09-01' }),
      // A member's purchases owed (D80 e) – its 30-day reminder itself: not aged.
      item('house', 'info', 'house')
    ]
    const v = arrangeBriefing(items, TODAY)
    expect([...v.shown, ...v.rest].map((r) => r.key)).toEqual(['dock-new', 'return-30', 'house'])
    expect(v.older).toBe(3)
  })

  it('jedna pozycja na sprawę: nieznany sygnał kategorii z przekroczoną kopertą mówi się przy jej alarmie (MO sp. 2)', () => {
    const HEALTH = defaultCategoryId(5)
    const items = [
      item('alarm:envelope-over:health', 'yellow', 'alarm', { ref: HEALTH, text: 'Koperta Zdrowie ponad limit o 52,50 zł.' }),
      item('anomaly:category', 'info', 'anomaly', { ref: HEALTH, text: 'Nieznany sygnał na radarze – Zdrowie: 202,50 zł w tym miesiącu – 2,9× średniej.' }),
      item('anomaly:double', 'yellow', 'anomaly', { ref: 'other', text: 'Dwa obciążenia' })
    ]
    const v = arrangeBriefing(items, TODAY)
    const rows = [...v.shown, ...v.rest]
    expect(rows.map((r) => r.key)).toEqual(['alarm:envelope-over:health', 'anomaly:double'])
    expect(rows[0]!.also).toEqual(['Nieznany sygnał na radarze – Zdrowie: 202,50 zł w tym miesiącu – 2,9× średniej.'])
  })

  it('sygnał zakupu (marka) niesie kategorię zakupu – ten sam alarm koperty go zabiera', () => {
    const FUEL = defaultCategoryId(3)
    const tx = (date: string, v: number) => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -zl(v), counterparty: 'ORLEN', categoryId: FUEL })
    const history = [0, 1, 2, 3, 4, 5].map((i) => tx(`2026-0${4 + i}-10`, 100))
    const found = anomalies({ transactions: [...history, tx('2026-11-02', 400)], today: TODAY, categories: categoryIndex(createDefaultSettings(AT).settings.categories), orders: { impulseThreshold: 0 } })
    expect(found.find((a) => a.kind === 'brand')?.categoryId).toBe(FUEL)
  })

  it('osłony poniżej minimum – poważne naruszenie gry – na czerwono w odprawie (DW sp. 3)', () => {
    const s = createDefaultSettings(AT).settings
    const settings: Settings = { ...s, budget: { ...s.budget, start: '2026-10-01' }, orders: { ...s.orders, minShieldSalaries: 2 } }
    const fleet = computeFleet({
      settings,
      transactions: [],
      months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(3000), envelopes: { [defaultCategoryId(1)]: zl(3000) } })],
      balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) })],
      now: '2026-10-14T08:00:00.000Z'
    })
    const line = briefing({ fleet, containers: [], imports: [], label: () => '' }).find((i) => i.key.startsWith('alarm:shields-below-min'))
    expect(line?.level).toBe('red')
  })
})

describe('odsłuch – skrót odprawy (AP-16, T214)', () => {
  const view = arrangeBriefing(
    [
      item('import', 'info', 'import', { text: 'mBank: ostatni import 5 dni temu – zaimportuj nowy plik.' }),
      item('loot', 'yellow', 'loot', { text: 'Łupy z poprzedniego miesiąca: 1 303,48 zł – podział do 7. dnia.' }),
      item('red', 'red', 'alarm', { text: 'Koperta Auto ponad limit o 52,50 zł.' }),
      item('end', 'info', 'end', { text: 'Koniec kontenera: Netflix.' })
    ],
    TODAY
  )

  it('energia, Daily Bias, najważniejszy alarm i liczba pozostałych spraw – nie każda pozycja', () => {
    const said = briefingSpeech({ day: '4 listopada', daily: { energy: 4028 }, bias: 'bearish', view, hidden: false, mask: '•••' })
    expect(said).toBe('Odprawa, 4 listopada. Energia na dziś: 40 złotych 28 groszy. Daily Bias: Bearish. Najważniejsze: Koperta Auto ponad limit o 52 złote 50 groszy. Na Mostku jeszcze 3 sprawy.')
    expect(said).not.toContain('Łupy')
  })

  it('ukryte kwoty: „kwota ukryta”, zdanie o energii zostaje (MO sp. 7); bez alarmów – „Bez alarmów.”', () => {
    const hidden = arrangeBriefing([item('a', 'yellow', 'alarm', { text: 'Przydział dnia przekroczony o ••• zł.' })], TODAY)
    expect(briefingSpeech({ day: '4 listopada', daily: { energy: 4028 }, bias: null, view: hidden, hidden: true, mask: '•••' })).toBe(
      'Odprawa, 4 listopada. Energia na dziś: kwota ukryta. Najważniejsze: Przydział dnia przekroczony o kwota ukryta.'
    )
    const calm = arrangeBriefing([item('i', 'info', 'import')], TODAY)
    expect(briefingSpeech({ day: '4 listopada', daily: { energy: -500 }, capReason: null, bias: 'neutral', view: calm, hidden: false, mask: '•••' })).toBe(
      'Odprawa, 4 listopada. Energia na dziś przekroczona o 5 złotych. Daily Bias: Neutral. Bez alarmów. Na Mostku 1 sprawa.'
    )
  })

  it('kwoty tekstu jak kwota energii, bez strzałek', () => {
    expect(spokenText('Netflix: 43,00 zł → 49,00 zł, razem 1 234,56 zł', '•••')).toBe('Netflix: 43 złote na 49 złotych, razem 1234 złote 56 groszy')
  })
})
