import { describe, expect, it } from 'vitest'
import { briefing, dailyBias, nextPaymentOf } from '@shared/calc/briefing'
import { computeFleet } from '@shared/calc/fleet'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Settings } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: `01K2000000000000000000${String(++seq).padStart(4, '0')}`, createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const AUTO = defaultCategoryId(3)
const settings = (): Settings => {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, start: '2026-10-01' } }
}
const spend = (date: string, v: number, categoryId: string) => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount: -zl(v), categoryId })

function state(spent: Array<[string, number, string]>, now = '2026-10-17T09:00:00.000Z', shields = 12000) {
  const balances = [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(shields) })]
  const months = [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(3100), envelopes: { [FOOD]: zl(3100), [AUTO]: zl(300) } })]
  return computeFleet({ settings: settings(), transactions: spent.map(([d, v, c]) => spend(d, v, c)), months, balances, now })
}

describe('odprawa (spec: „Rytuały”, Daily Bias)', () => {
  it('Daily Bias: Bullish z pełnym przydziałem, Bearish poniżej połowy albo z osłonami pod minimum, inaczej Neutral', () => {
    // 3 100 zł of daily envelopes in 31 days: base 100 zł a day.
    expect(dailyBias(state([]))).toBe('bullish')
    // 1 300 zł spent before today: (3 100 − 1 300) / 15 = 120 → still ≥ 100, but Auto over its limit: Neutral.
    expect(dailyBias(state([['2026-10-05', 1300, FOOD], ['2026-10-06', 350, AUTO]]))).toBe('neutral')
    // Unspent energy carries over: 70 zł today of (3 100 − 0) / 15 still leaves more than the base.
    expect(dailyBias(state([['2026-10-17', 70, FOOD]]))).toBe('bullish')
    // 2 500 zł spent before today: (3 100 − 2 500) / 15 = 40 zł – under half the base.
    expect(dailyBias(state([['2026-10-10', 2500, FOOD]]))).toBe('bearish')
    // The shields under their minimum (1 salary = 3 100 zł) after the salary.
    expect(dailyBias(state([], '2026-10-17T09:00:00.000Z', 4000))).toBe('bearish')
  })

  it('alarmy miesiąca, asteroida w 14 dni, zaległy import, salda do potwierdzenia, łupy', () => {
    const f = state([['2026-10-06', 350, AUTO]])
    const oc = containerSchema.parse({ ...base(), name: 'OC', amount: zl(1240), cycleMonths: 12, dueMonth: '2026-10', dueDay: 29 })
    const netflix = containerSchema.parse({ ...base(), name: 'Netflix', amount: zl(49.99), dueMonth: '2026-10', dueDay: 20 })
    expect(nextPaymentOf(oc, '2026-10-17')).toBe('2026-10-29')
    expect(nextPaymentOf({ cycleMonths: 12, dueMonth: '2026-10', dueDay: 3 }, '2026-10-17')).toBe('2027-10-03')
    const items = briefing({ fleet: f, containers: [oc, netflix], imports: [{ name: 'mBank', last: '2026-10-12T10:00:00.000Z' }], lastConfirmation: '2026-10-15', label: (id) => (id === AUTO ? 'Auto' : id) })
    expect(items.map((i) => [i.kind, i.level, i.text])).toEqual([
      ['alarm', 'yellow', 'Koperta Auto ponad limit o 50,00 zł.'],
      ['asteroid', 'info', 'Asteroida: OC za 12 dni – 1 240,00 zł, w zbiorniku 0,00 zł.'],
      ['import', 'info', 'mBank: ostatni import 5 dni temu – zaimportuj nowy plik (w mBanku: Historia → lista operacji → „Eksportuj” CSV).']
    ])
    // Never confirmed, never imported: both asked.
    const fresh = briefing({ fleet: f, containers: [], imports: [{ name: 'mBank', last: null }], lastConfirmation: null, label: () => '' })
    expect(fresh.map((i) => i.kind)).toEqual(['alarm', 'import', 'balances'])
    // A payment outside the container's life is no asteroid: ended before it, or not started yet.
    const ended = containerSchema.parse({ ...base(), name: 'Stare OC', amount: zl(900), cycleMonths: 12, dueMonth: '2026-10', dueDay: 29, until: '2026-09' })
    const later = containerSchema.parse({ ...base(), name: 'Nowe OC', amount: zl(900), cycleMonths: 12, dueMonth: '2026-10', dueDay: 29, from: '2026-11' })
    expect(briefing({ fleet: f, containers: [ended, later], imports: [], lastConfirmation: '2026-10-15', label: () => '' }).filter((i) => i.kind === 'asteroid')).toEqual([])
    // The import's day is its Warsaw date: 00:30 on 14.10 (22:30 UTC on 13.10) is 3 days before 17.10 – not overdue.
    expect(briefing({ fleet: f, containers: [], imports: [{ name: 'mBank', last: '2026-10-13T22:30:00.000Z' }], lastConfirmation: '2026-10-15', label: () => '' }).filter((i) => i.kind === 'import')).toEqual([])
    // The hidden amounts (Ctrl+$): the bridge and the notifications get the texts masked.
    const masked = briefing({ fleet: f, containers: [oc], imports: [], lastConfirmation: '2026-10-15', label: (id) => (id === AUTO ? 'Auto' : id), money: () => '••• zł' })
    expect(masked.map((i) => i.text)).toEqual(['Koperta Auto ponad limit o ••• zł.', 'Asteroida: OC za 12 dni – ••• zł, w zbiorniku ••• zł.'])
  })
})
