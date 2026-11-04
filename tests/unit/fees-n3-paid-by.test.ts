import { describe, expect, it } from 'vitest'
import { cargoStatuses, paymentsIndex, type CargoStatus } from '@shared/calc/cargoStatus'
import { computeFleet, layersSum, type FleetState } from '@shared/calc/fleet'
import { sinkingOf } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import {
  balanceSchema,
  containerSchema,
  defaultCategoryId,
  goalSchema,
  HOUSE_MEMBER_ID,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  type Container,
  type Goal,
  type Settings,
  type Transaction
} from '@shared/schema'

/**
 * Po scaleniu N2 z N3 (T393, T345): which payment pays a fee is one rule for Ładownia and the engine – the hold's
 * `paymentsIndex`. A fee's bill paid from a goal or by a purchase to be refunded is paid (the money the goal's or the
 * household's – the tank not drawn, its cycle closed, a refund later just an inflow); an old transfer with a hidden
 * container (T362) pays no due in either. Before: Ładownia counted a goal's payment, a whole refundable one and the old
 * transfer, the engine none of them (and a refundable line of a receipt – neither).
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2025-08-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N3S000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2025-11', accountId: MBANK_ACCOUNT_ID, ...over })
const tx = (date: string, amount: number, over: Partial<Transaction>): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })

// Woda 180 zł a quarter on the 15th (November, February…), the budget from 1 September 2025: 60 zł a month in its tank.
const water = container({ name: 'Woda', amount: zl(180), cycleMonths: 3, dueMonth: '2025-11', dueDay: 15 })
const repairs: Goal = goalSchema.parse({ ...base(), name: 'Remont', target: zl(5000), priority: 1 })
const START = '2025-09-01'

/** The ship from 1 September 2025: 30 000 zł on mBank (1 000 zł of it in the goal), a salary of 5 000 zł every month. */
function fleetOf(transactions: Transaction[], now: string): FleetState {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = { ...s0, budget: { ...s0.budget, start: START, initial: { shields: 0, hull: 0, goals: { [repairs.id]: zl(1000) } } } }
  const state = computeFleet({
    settings,
    balances: [balanceSchema.parse({ ...base(), date: START, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(30000) })],
    months: [monthPlanSchema.parse({ ...base(), month: '2025-09', salary: zl(5000), envelopes: {} })],
    goals: [repairs],
    transactions,
    containers: [water],
    now
  })
  expect(layersSum(state)).toBe(state.total)
  return state
}
const cargoOf = (transactions: Transaction[], today: string) => cargoStatuses({ containers: [water], transactions, today, coveredTo: {}, start: START })
const paidWith = (list: CargoStatus[]) => list.map((s) => [s.due, s.state, s.payments.map((p) => [p.date, p.amount])])
/** The engine took nothing from the tank for this operation. */
const tankDrawn = (f: FleetState, t: Transaction) => f.log.filter((e) => e.txId === t.id).reduce((a, e) => a + Math.min(0, e.moves.tanks?.[water.id] ?? 0), 0)

describe('po scaleniu N2 z N3: opłata zapłacona z celu albo zakupem do zwrotu – zapłacona w Ładowni i w silniku (T393)', () => {
  it('z celu: cykl listopada zapłacony, zbiornik nietknięty (180 zł na luty), cel −180 zł, bez „za mało w zbiorniku”', () => {
    const bill = tx('2025-11-15', -zl(180), { categoryId: FOOD, containerId: water.id, goalId: repairs.id, counterparty: 'Wodociągi' })
    const f = fleetOf([bill], '2025-11-20T12:00:00+01:00')
    // Before: paidDue null, the cycle of November still to pay – Ładownia showed it paid.
    expect(f.tanks[0]).toMatchObject({ amount: zl(180), paidDue: '2025-11', dueMonth: '2026-02' })
    expect(f.goals[0]?.amount).toBe(zl(820))
    expect(tankDrawn(f, bill)).toBe(0)
    expect(f.alarms.filter((a) => a.kind === 'sinking-short')).toEqual([])
    expect(paidWith(cargoOf([bill], '2025-11-20'))).toEqual([['2025-11-15', 'paid', [['2025-11-15', zl(180)]]]])
    // The next cycle: the tank holds its whole amount already – December sets nothing aside, February pays from it.
    const later = fleetOf([bill], '2025-12-05T12:00:00+01:00')
    expect(sinkingOf(later.log, '2025-12').get(water.id)).toBeUndefined()
    expect(later.tanks[0]).toMatchObject({ amount: zl(180), paidDue: null, dueMonth: '2026-02', want: 0 })
  })

  it('do zwrotu (cały zakup): cykl zapłacony, zbiornik nietknięty; zwrot domownika potem tylko spłaca jego dług', () => {
    const bill = tx('2025-11-15', -zl(180), { categoryId: FOOD, containerId: water.id, refundable: true, memberId: HOUSE_MEMBER_ID, counterparty: 'Wodociągi' })
    const f = fleetOf([bill], '2025-11-16T12:00:00+01:00')
    expect(f.tanks[0]).toMatchObject({ amount: zl(180), paidDue: '2025-11', dueMonth: '2026-02' })
    expect(tankDrawn(f, bill)).toBe(0)
    expect(f.receivables.house).toBe(zl(180))
    expect(paidWith(cargoOf([bill], '2025-11-16'))).toEqual([['2025-11-15', 'paid', [['2025-11-15', zl(180)]]]])
    // The household's money back (D80): it repays the debt – the tank and the paid cycle stay.
    const back = tx('2025-11-18', zl(180), { kind: 'income', memberId: HOUSE_MEMBER_ID, counterparty: 'Dom' })
    const after = fleetOf([bill, back], '2025-11-20T12:00:00+01:00')
    expect(after.receivables.house).toBe(0)
    expect(after.tanks[0]).toMatchObject({ amount: zl(180), paidDue: '2025-11', dueMonth: '2026-02' })
    expect(after.shields.amount - f.shields.amount).toBe(zl(180))
  })

  it('do zwrotu (linia paragonu): opłata zapłacona kwotą linii – Ładownia i silnik (wcześniej żadne z nich)', () => {
    const receipt = tx('2025-11-15', -zl(230), {
      categoryId: FOOD,
      counterparty: 'Wodociągi',
      splits: [
        { id: nextId(), amount: -zl(180), categoryId: FOOD, refundable: true, memberId: HOUSE_MEMBER_ID, containerId: water.id },
        { id: nextId(), amount: -zl(50), categoryId: FOOD }
      ] as Transaction['splits']
    })
    const f = fleetOf([receipt], '2025-11-20T12:00:00+01:00')
    expect(f.tanks[0]).toMatchObject({ amount: zl(180), paidDue: '2025-11' })
    expect(tankDrawn(f, receipt)).toBe(0)
    expect(paidWith(cargoOf([receipt], '2025-11-20'))).toEqual([['2025-11-15', 'paid', [['2025-11-15', zl(180)]]]])
  })

  it('jedna płatność na operację: dwie linie tej samej opłaty (moja i do zwrotu) – jedna płatność 180 zł, nie dwie', () => {
    const receipt = tx('2025-11-15', -zl(180), {
      categoryId: FOOD,
      containerId: water.id,
      splits: [
        { id: nextId(), amount: -zl(90), categoryId: FOOD },
        { id: nextId(), amount: -zl(90), categoryId: FOOD, refundable: true, memberId: HOUSE_MEMBER_ID }
      ] as Transaction['splits']
    })
    expect(paymentsIndex([receipt]).byContainer.get(water.id)).toEqual([{ id: receipt.id, date: '2025-11-15', amount: zl(180), accountId: MBANK_ACCOUNT_ID }])
    const f = fleetOf([receipt], '2025-11-20T12:00:00+01:00')
    // My half from the tank, the household's half theirs – the cycle paid once.
    expect(f.tanks[0]).toMatchObject({ amount: zl(90), paidDue: '2025-11', dueMonth: '2026-02' })
  })
})

describe('po scaleniu N2 z N3: dawny przelew z ukrytym kontenerem (T362) – nie płaci terminu ani w Ładowni, ani w silniku', () => {
  it('listopad niezapłacony w obu: „po terminie” w Ładowni, zbiornik trzyma 180 zł, przelew tylko z osłon', () => {
    const transfer = tx('2025-11-15', -zl(180), { kind: 'transfer', categoryId: null, containerId: water.id, counterparty: 'Wodociągi' })
    // Before: Ładownia „zapłacone” (each kind with a container), the engine not – one fee, two states.
    expect(paymentsIndex([transfer]).byContainer.get(water.id)).toBeUndefined()
    expect(paidWith(cargoOf([transfer], '2025-11-20'))).toEqual([['2025-11-15', 'overdue', []]])
    const f = fleetOf([transfer], '2025-11-20T12:00:00+01:00')
    expect(f.tanks[0]).toMatchObject({ amount: zl(180), paidDue: null, dueMonth: '2025-11' })
    expect(tankDrawn(f, transfer)).toBe(0)
  })
})
