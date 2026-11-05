import { describe, expect, it } from 'vitest'
import { effectOf, monthsEffectOf, noEffect, pairsLost } from '@shared/calc/effect'
import type { Delivery } from '@shared/calc/dock'
import { computeFleet, type FleetState } from '@shared/calc/fleet'
import { debriefing } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

// AP-38 (N5, F11 / T265, AF-24, OP sp. 2): the bulk preview also tells the loot and the envelopes of the month the
// operations leave, the goals and the ICTTJ payouts losing their pair – read from the engine, no money rule of its own.

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5Q00000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const GROCERIES = defaultCategoryId(1, 1)
const s = createDefaultSettings(AT).settings
const settings = { ...s, budget: { ...s.budget, start: '2026-09-01' } }
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: GROCERIES, ...over })
const plans = [monthPlanSchema.parse({ ...base(), month: '2026-09', salary: zl(3000), envelopes: { [FOOD]: zl(1000) } })]
const balances = [balanceSchema.parse({ ...base(), date: '2026-09-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })]
const NOW = '2026-10-10T10:00:00.000Z'
const run = (transactions: Transaction[]) => computeFleet({ settings, transactions, months: plans, balances, now: NOW })

describe('AP-38: podgląd zmiany zbiorczej – cały skutek', () => {
  it('przesunięcie przez granicę miesiąca: łupy i koperta miesiąca, z którego operacja wychodzi – jak debriefing', () => {
    const lunch = tx('2026-09-30', -zl(100), { counterparty: 'Obiad' })
    const others = [tx('2026-09-10', -zl(200)), tx('2026-10-05', -zl(50))]
    const moved = { ...lunch, date: '2026-10-01' }
    const before = run([...others, lunch])
    const after = run([...others, moved])
    const months = monthsEffectOf(before, after, {
      categories: s.categories,
      plans,
      transactionsBefore: [...others, lunch],
      transactionsAfter: [...others, moved],
      changed: [lunch, moved]
    })
    const input = { categories: s.categories, plans, today: before.today }
    const was = debriefing('2026-09', { ...input, transactions: [...others, lunch], log: before.log, alarms: before.alarms })
    const is = debriefing('2026-09', { ...input, transactions: [...others, moved], log: after.log, alarms: after.alarms })
    expect(was.loot).not.toBe(is.loot)
    // Only September – October runs still (its envelopes are the effect's own lines).
    expect(months.map((m) => m.month)).toEqual(['2026-09'])
    expect(months[0]!.loot).toEqual({ before: was.loot, after: is.loot })
    const food = (d: typeof was) => d.envelopes.find((e) => e.categoryId === FOOD)!.gap
    expect(months[0]!.envelopes).toEqual([{ categoryId: FOOD, before: food(was), after: food(is) }])
    expect(food(is) - food(was)).toBe(zl(100))
  })

  it('zmiana bez skutku w minionych miesiącach – pusto', () => {
    const a = tx('2026-10-05', -zl(50))
    const before = run([a])
    const after = run([{ ...a, date: '2026-10-06' }])
    expect(monthsEffectOf(before, after, { categories: s.categories, plans, transactionsBefore: [a], transactionsAfter: [{ ...a, date: '2026-10-06' }], changed: [a] })).toEqual([])
  })

  it('cele: pieniądze celu przed i po zmianie', () => {
    const state = run([])
    const goal = { id: 'G1', name: 'Rower', amount: zl(3000), target: zl(5000), priority: 1, takes: true }
    const before: FleetState = { ...state, goals: [goal] }
    const after: FleetState = { ...state, goals: [{ ...goal, amount: 0 }] }
    const e = effectOf(before, after)
    expect(e.goals).toEqual([{ id: 'G1', name: 'Rower', before: zl(3000), after: 0 }])
    expect(noEffect(e)).toBe(false)
    expect(effectOf(before, before).goals).toEqual([])
  })

  it('pary ICTTJ: wpis z operacją przed zmianą, bez niej po – traci parę', () => {
    const entry = { id: 'E1', kind: 'withdrawal' as const, date: '2026-10-19', amount: zl(3000), pool: 'surplus', note: '', updatedAt: null }
    const op = tx('2026-10-20', zl(3000), { kind: 'trading', categoryId: null })
    const delivery = (over: Partial<Delivery>): Delivery =>
      ({ key: 'ictj:E1', state: 'docked', direction: 'in', date: entry.date, amount: entry.amount, entry, transaction: op, docking: null, wallet: false, missingEntry: false, mismatch: false, near: false, poolChanged: false, extra: [], orphans: [], entryGone: false, walletTyped: false, ...over }) as Delivery
    expect(pairsLost([delivery({})], [delivery({ state: 'pending', transaction: null })])).toEqual([{ date: '2026-10-19', amount: zl(3000), direction: 'in' }])
    expect(pairsLost([delivery({})], [delivery({})])).toEqual([])
    // An operation without an entry (an XTB inflow without ICTTJ) – no pair to lose.
    expect(pairsLost([delivery({ key: 'tx:1', entry: null })], [])).toEqual([])
  })
})
