/**
 * N3 (1.15.7), AP-13 (S6, D99 pkt 4): today's energy never more than the month's energy left – a partial salary (PM sp. 1,
 * PM.3 w2), the month's energy spent (MO sp. 5) – with the reason beside (T371); a refund of an earlier purchase is not
 * today's energy, from tomorrow the days left share it (MO sp. 6 – T370); „Pokryj z koperty…” says what it does to
 * today's energy (PM sp. 6).
 */
import { describe, expect, it } from 'vitest'
import { dailyBias } from '@shared/calc/briefing'
import { effectOf } from '@shared/calc/effect'
import { computeFleet, energyAfter, energyAfterLimit, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { energyWhy } from '@shared/calc/why'
import { dueNotices } from '@shared/notify'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, CASH_CATEGORY_ID, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type MonthPlan, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5300000000000000000${String(++seq).padStart(4, '0')}`
const base = (createdAt = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt, updatedAt: createdAt })

const FOOD = defaultCategoryId(1)
const GROCERIES = defaultCategoryId(1, 1)
const COFFEE = defaultCategoryId(1, 3)
const HOME = defaultCategoryId(2)
const FUN = defaultCategoryId(6)
const PERSONAL = defaultCategoryId(8)
const CLOTHES = defaultCategoryId(8, 1)
const GIFTS = defaultCategoryId(9)

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(over.createdAt), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const plan = (month: string, salary: number, envelopes: Record<string, number>, over: Partial<MonthPlan> = {}) => monthPlanSchema.parse({ ...base(), month, salary, envelopes, ...over })
const opening = (date: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount })

function settingsFrom(start: string): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, start } }
}

function fleet(input: Partial<FleetInput> & { now: string }): FleetState {
  const state = computeFleet({ settings: settingsFrom('2026-11-01'), transactions: [], ...input })
  // The invariant: every złoty on the accounts belongs to exactly one layer.
  if (state.started) expect(layersSum(state)).toBe(state.total)
  return state
}

/**
 * PM.3 w2 (pm-4c): the budget from 1 October with 4 000 zł, October's plan 4 000 zł (Jedzenie 1 500 and Rozrywka 500 –
 * daily, Dom 500 and Prezenty 1 000 – planned), November living on it; October spent all 4 000 zł – on 1 November the
 * shields and the hull are empty, the salary 0 zł of 4 000 zł.
 */
function partialSalary(now = '2026-11-03T12:00:00+01:00', extra: Transaction[] = []): FleetState {
  return fleet({
    settings: settingsFrom('2026-10-01'),
    balances: [opening('2026-10-01', zl(4000))],
    months: [plan('2026-10', zl(4000), { [FOOD]: zl(1500), [FUN]: zl(500), [HOME]: zl(500), [GIFTS]: zl(1000) })],
    transactions: [
      tx('2026-10-05', -zl(1500), { categoryId: GROCERIES }),
      tx('2026-10-10', -zl(500), { categoryId: FUN }),
      tx('2026-10-15', -zl(1000), { categoryId: GIFTS }),
      tx('2026-10-20', -zl(1000), { categoryId: HOME }),
      ...extra
    ],
    now
  })
}

/**
 * November 2026 from the 1st: 20 000 zł on mBank (no costs known – everything in the shields), the salary 4 000 zł with
 * the persona's daily envelopes 2 500 zł (Jedzenie 1 600, Rozrywka 450, Osobiste 350, Gotówka 100) and Prezenty 1 000 zł
 * planned. On 3 November 28 days are left: (2 500 zł − 0) / 28 = 89,28 zł.
 */
function november(transactions: Transaction[], now = '2026-11-03T20:00:00+01:00'): FleetState {
  return fleet({
    balances: [opening('2026-11-01', zl(20000))],
    months: [plan('2026-11', zl(4000), { [FOOD]: zl(1600), [FUN]: zl(450), [PERSONAL]: zl(350), [CASH_CATEGORY_ID]: zl(100), [GIFTS]: zl(1000) })],
    transactions,
    now
  })
}

describe('AP-13: energia dziś nie większa niż energia miesiąca (T371)', () => {
  it('PM.3 w2 / PM sp. 1: pensja częściowa 0,00 zł – energia dziś 0,00 zł zamiast 71,42 zł, z powodem „pensja częściowa”', () => {
    const s = partialSalary()
    expect(s.salary).toEqual({ fromShields: 0, fromHull: 0, paid: 0, alarm: 'red' })
    expect(s.energy).toBe(0)
    // The daily pool says (2 000 zł − 0) / 28 = 71,42 zł – the month has nothing to give.
    expect(s.daily).toMatchObject({ allowance: 7142, left: 7142, energy: 0, cap: { month: 0, why: 'partial' } })
    // Before: „Energia dziś 71,42 zł” and Daily Bias Bullish (71,42 ≥ 66,66 podstawowego) beside „Energia miesiąca 0,00 zł”.
    expect(dailyBias(s)).toBe('bearish')
  })

  it('MO sp. 5: energia miesiąca wydana na kopertę planową – energia dziś = to, co zostało (50,00 zł), powód „spent”', () => {
    const s = november([tx('2026-11-02', -zl(3950), { categoryId: GIFTS, counterparty: 'JUBILER' })])
    expect(s.salary?.alarm).toBeNull()
    expect(s.energy).toBe(zl(50))
    expect(s.daily).toMatchObject({ allowance: 8928, left: 8928, energy: zl(50), cap: { month: zl(50), why: 'spent' } })
    // Wholly spent: 0,00 zł and the red alarm of the energy exhausted.
    const all = november([tx('2026-11-02', -zl(4795), { categoryId: GIFTS, counterparty: 'APART' })])
    expect(all.energy).toBe(0)
    expect(all.daily).toMatchObject({ left: 8928, energy: 0, cap: { month: 0, why: 'spent' } })
    expect(all.alarms.find((a) => a.kind === 'energy-exhausted')?.amount).toBe(zl(795))
    // Daily Bias by today's energy as shown (the shields 16 000 zł – far above their minimum): 30 zł left in the month is
    // under half the base 83,33 zł – Bearish; before: Neutral by the pool's 89,28 zł (MO sp. 5 – „◆ Neutral”).
    const low = november([tx('2026-11-02', -zl(3970), { categoryId: GIFTS, counterparty: 'JUBILER' })])
    expect(low.shields.amount).toBe(zl(16000))
    expect(low.daily).toMatchObject({ base: 8333, left: 8928, energy: zl(30) })
    expect(dailyBias(low)).toBe('bearish')
  })

  it('bez ograniczenia, gdy energii miesiąca jest dość – energia dziś = przydział − wydane dziś (T295)', () => {
    const s = november([tx('2026-11-03', -zl(12), { categoryId: COFFEE, time: '08:10', counterparty: 'Mokka' })])
    expect(s.daily).toMatchObject({ allowance: 8928, spentToday: zl(12), left: 7728, energy: 7728, cap: null })
  })

  it('przekroczenie dnia zostaje przekroczeniem: energia dziś poniżej zera taka jak przydział − wydane (alarm i gra bez zmian)', () => {
    const s = partialSalary('2026-11-03T12:00:00+01:00', [tx('2026-11-03', -zl(100), { categoryId: GROCERIES })])
    // The purchase came from the shields? No – they are empty too: the deficit; today's energy over by 28,58 zł.
    expect(s.daily).toMatchObject({ left: 7142 - zl(100), energy: 7142 - zl(100), cap: null })
    expect(s.alarms.find((a) => a.kind === 'daily-over')?.amount).toBe(zl(100) - 7142)
  })

  it('bez pensji w tym miesiącu (plan 0 zł) – powód „none”', () => {
    const s = fleet({
      balances: [opening('2026-11-01', zl(20000))],
      months: [plan('2026-11', 0, { [FOOD]: zl(1600) })],
      now: '2026-11-03T12:00:00+01:00'
    })
    expect(s.salary).toBeNull()
    expect(s.daily).toMatchObject({ left: Math.floor(zl(1600) / 28), energy: 0, cap: { month: 0, why: 'none' } })
  })

  it('przed startem budżetu bez ograniczenia (warstwy nie liczą się jeszcze)', () => {
    const s = fleet({ settings: settingsFrom('2026-11-10'), balances: [opening('2026-11-10', zl(20000))], months: [plan('2026-11', zl(4000), { [FOOD]: zl(1600) })], now: '2026-11-03T12:00:00+01:00' })
    expect(s.started).toBe(false)
    expect(s.daily).toMatchObject({ left: Math.floor(zl(1600) / 28), energy: Math.floor(zl(1600) / 28), cap: null })
  })

  it('„Skąd ta liczba?”, powiadomienie i podgląd zmian zbiorczych mówią tę samą liczbę z powodem', () => {
    const s = partialSalary()
    const lines = energyWhy(s.daily!, s.month)
    expect(lines.at(-1)).toEqual({ label: 'Energia dziś', amount: 0, total: true })
    expect(lines.find((l) => l.label.startsWith('Energia miesiąca'))).toEqual({ label: 'Energia miesiąca (pensja do wydania) – pensja częściowa', amount: 0 })
    expect(lines.find((l) => l.label === 'Przydział po dzisiejszych wydatkach')?.amount).toBe(7142)
    const notices = dueNotices({
      fleet: s,
      containers: [],
      imports: [],
      label: () => '',
      money: (g) => `${(g / 100).toFixed(2)} zł`,
      prefs: { ...DEFAULT_MACHINE_PREFS.notify, briefing: true, low: true },
      quietHours: { from: '23:00', to: '05:00' },
      time: '12:00',
      opened: true
    })
    expect(notices.find((n) => n.tag === 'briefing')?.body).toContain('Energia dziś: 0.00 zł')
    expect(notices.find((n) => n.key === `low:daily:${s.today}`)?.body).toBe('Zostało 0.00 zł z 71.42 zł – pensja częściowa.')
    // A bulk change (F11) that adds 600 zł of salary-free spending changes nothing of today's (0 → 0 – no line).
    expect(effectOf(s, partialSalary(undefined, [tx('2026-11-02', -zl(600), { categoryId: HOME })])).energy).toBeNull()
  })
})

describe('AP-13: zwrot dawnego zakupu nie do dziś – od jutra na pozostałe dni (T370)', () => {
  it('MO sp. 6: zwrot ZARA +49,99 zł (Osobiste) i Mokka 12 zł dziś – energia dziś 77,28 zł, nie 127,27 zł', () => {
    const transactions = [
      tx('2026-11-01', -zl(49.99), { categoryId: CLOTHES, counterparty: 'ZARA' }),
      tx('2026-11-03', -zl(12), { categoryId: COFFEE, time: '08:10', counterparty: 'Mokka' }),
      tx('2026-11-03', zl(49.99), { categoryId: CLOTHES, counterparty: 'ZARA', title: 'zwrot towaru' })
    ]
    const s = november(transactions)
    // Before 1 November's purchase counted: (2 500 − 49,99) / 28 = 87,50 zł; the refund came back today.
    expect(s.daily).toMatchObject({ spentBefore: zl(49.99), allowance: 8750, spentToday: zl(12), returned: zl(49.99), returnedBy: { [PERSONAL]: zl(49.99) }, left: 7550, energy: 7550 })
    // Before (T295 alone): spent today 12 − 49,99 = −37,99 zł → 87,50 + 37,99 = 125,49 zł.
    expect(s.daily!.left).not.toBe(8750 + 3799)
    // The month's energy has the refund at once (it is money on the account): 4 000 − 49,99 − 12 + 49,99.
    expect(s.energy).toBe(zl(4000) - zl(12))
    // Tomorrow the refund is spent before (less): (2 500 − 49,99 − 12 + 49,99) / 27 = 92,14 zł for each of the days left.
    const tomorrow = november(transactions, '2026-11-04T08:00:00+01:00')
    expect(tomorrow.daily).toMatchObject({ spentBefore: zl(12), allowance: Math.floor((zl(2500) - zl(12)) / 27), returned: 0, spentToday: 0 })
  })

  it('zwrot dzisiejszego zakupu tej samej kategorii wraca do energii dziś (towar oddany tego samego dnia)', () => {
    const s = november([
      tx('2026-11-03', -zl(200), { categoryId: CLOTHES, time: '10:00', counterparty: 'Reserved' }),
      tx('2026-11-03', zl(200), { categoryId: CLOTHES, time: '15:00', counterparty: 'Reserved' })
    ])
    expect(s.daily).toMatchObject({ allowance: 8928, spentToday: 0, returned: 0, left: 8928, energy: 8928 })
    expect(s.alarms.some((a) => a.kind === 'daily-over')).toBe(false)
  })

  it('zwrot ponad dzisiejsze zakupy tej kategorii: część pokrywa dzisiejszy zakup, reszta od jutra', () => {
    const s = november([
      tx('2026-11-03', -zl(30), { categoryId: CLOTHES, counterparty: 'Skarpetki' }),
      tx('2026-11-03', -zl(12), { categoryId: COFFEE, counterparty: 'Mokka' }),
      tx('2026-11-03', zl(49.99), { categoryId: CLOTHES, counterparty: 'ZARA' })
    ])
    // Osobiste: 30 − 49,99 = −19,99 zł → returned; Jedzenie 12 zł today.
    expect(s.daily).toMatchObject({ spentToday: zl(12), returned: zl(19.99), returnedBy: { [PERSONAL]: zl(19.99) }, left: 8928 - zl(12) })
  })

  it('zwrot dawnego zakupu nie zasłania przekroczenia dnia: zakupy 100 zł i zwrot 49,99 zł – przydział przekroczony o 10,72 zł', () => {
    const s = november([tx('2026-11-03', -zl(100), { categoryId: GROCERIES }), tx('2026-11-03', zl(49.99), { categoryId: CLOTHES, counterparty: 'ZARA' })])
    expect(s.daily).toMatchObject({ spentToday: zl(100), returned: zl(49.99), left: 8928 - zl(100), energy: 8928 - zl(100) })
    // Before: 100 − 49,99 = 50,01 zł spent – within the day's 89,28 zł.
    expect(s.alarms.find((a) => a.kind === 'daily-over')?.amount).toBe(zl(100) - 8928)
  })

  it('zwrot bez kategorii: ta sama reguła (bez kategorii = codzienny, T30)', () => {
    const s = november([tx('2026-11-03', zl(25), { counterparty: 'Zwrot' })])
    expect(s.daily).toMatchObject({ spentToday: 0, returned: zl(25), returnedBy: { '': zl(25) }, left: 8928 })
  })
})

describe('AP-13: podgląd szybkiego wpisu i „Pokryj z koperty…” jak silnik', () => {
  it('szybki wpis: energia dziś ograniczona energią miesiąca przed i po wydatku – także koperty planowej', () => {
    const d = { today: '2026-11-03', limit: zl(2500), spentBefore: 0, spentToday: 0, days: 30, month: { energy: zl(50), spends: true } }
    // 89,28 zł from the pool, 50 zł left in the month.
    expect(energyAfter(d, '2026-11-03', zl(20))).toEqual({ before: zl(50), after: zl(30) })
    // A planned purchase of 40 zł: the pool as it is, the month's energy 10 zł.
    expect(energyAfter(d, '2026-11-03', 0, zl(40))).toEqual({ before: zl(50), after: zl(10) })
    // Without a salary paid the shields pay – the month's energy stays.
    expect(energyAfter({ ...d, month: { energy: 0, spends: false } }, '2026-11-03', zl(20))).toEqual({ before: 0, after: 0 })
    // The engine says the same after the purchase.
    const s = november([tx('2026-11-02', -zl(3950), { categoryId: GIFTS }), tx('2026-11-03', -zl(20), { categoryId: GROCERIES })])
    expect(s.daily!.energy).toBe(zl(30))
  })

  it('szybki wpis: zakup kategorii z dzisiejszym zwrotem dawnego zakupu – najpierw ten zwrot (jak silnik)', () => {
    const refund = tx('2026-11-03', zl(49.99), { categoryId: CLOTHES, counterparty: 'ZARA' })
    const s = november([refund])
    const d = { today: s.today, limit: s.daily!.limit, spentBefore: s.daily!.spentBefore, spentToday: s.daily!.spentToday, days: 30, returned: s.daily!.returnedBy, month: { energy: s.energy, spends: true } }
    const socks = new Map([[PERSONAL, zl(30)]])
    expect(energyAfter(d, '2026-11-03', socks)).toEqual({ before: 8928, after: 8928 })
    expect(november([refund, tx('2026-11-03', -zl(30), { categoryId: CLOTHES })]).daily!.energy).toBe(8928)
    const shoes = new Map([[PERSONAL, zl(60)]])
    expect(energyAfter(d, '2026-11-03', shoes)).toEqual({ before: 8928, after: 8928 - (zl(60) - zl(49.99)) })
    expect(november([refund, tx('2026-11-03', -zl(60), { categoryId: CLOTHES })]).daily!.energy).toBe(8928 - (zl(60) - zl(49.99)))
  })

  it('PM sp. 6: „Pokryj z koperty…” z koperty codziennej obniża energię dziś – tyle, ile policzy silnik po pokryciu', () => {
    const transactions = [tx('2026-11-02', -zl(1100), { categoryId: GIFTS, counterparty: 'Kwiaciarnia' })]
    const before = november(transactions)
    // 100 zł of Jedzenie's limit to Prezenty's overrun: the pool 2 400 zł → 85,71 zł today.
    expect(energyAfterLimit(before, -zl(100))).toEqual({ before: 8928, after: Math.floor(zl(2400) / 28) })
    const covered = fleet({
      balances: [opening('2026-11-01', zl(20000))],
      months: [
        plan('2026-11', zl(4000), { [FOOD]: zl(1600), [FUN]: zl(450), [PERSONAL]: zl(350), [CASH_CATEGORY_ID]: zl(100), [GIFTS]: zl(1000) }, {
          envelopeCovers: [{ id: nextId(), from: FOOD, to: GIFTS, amount: zl(100), at: '2026-11-03T10:00:00.000Z' }]
        })
      ],
      transactions,
      now: '2026-11-03T20:00:00+01:00'
    })
    expect(covered.daily!.energy).toBe(energyAfterLimit(before, -zl(100))!.after)
    // A planned envelope's reserve covering: the pool as it is.
    expect(energyAfterLimit(before, 0)).toEqual({ before: 8928, after: 8928 })
    // Capped by the month's energy: the cover changes no money – still the month's 50 zł.
    const capped = november([tx('2026-11-02', -zl(3950), { categoryId: GIFTS })])
    expect(energyAfterLimit(capped, -zl(100))).toEqual({ before: zl(50), after: zl(50) })
  })
})
