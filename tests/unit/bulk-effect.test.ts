import { describe, expect, it } from 'vitest'
import { effectOf, noEffect } from '@shared/calc/effect'
import { computeFleet, type FleetState } from '@shared/calc/fleet'
import { loanState } from '@shared/calc/loans'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, defaultCategoryId, loanSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'

// D105 (2): the preview of a bulk change of the cargo or a loan says what it does to them – the tanks of the periodic fees
// and the loans' rest, read from the engine's state before and after (no money rule of the preview's own).

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K7V00000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const s = createDefaultSettings(AT).settings
const settings = { ...s, budget: { ...s.budget, start: '2026-09-01' } }
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: FOOD, ...over })
const plans = [monthPlanSchema.parse({ ...base(), month: '2026-09', salary: zl(3000), envelopes: { [FOOD]: zl(1000) } })]
const balances = [balanceSchema.parse({ ...base(), date: '2026-09-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })]
const NOW = '2026-10-10T10:00:00.000Z'

describe('skutek zmiany zbiorczej: ładownia i pożyczki', () => {
  it('zbiornik ładowni, którego pieniądze się zmieniają – przed i po; bez zmiany – pusto', () => {
    const state = computeFleet({ settings, transactions: [], months: plans, balances, now: NOW })
    const tank = { containerId: 'C1', name: 'OC', amount: zl(400), dueMonth: '2027-03', paidDue: null, due: zl(1200) }
    const before: FleetState = { ...state, tanks: [tank] }
    const after: FleetState = { ...state, tanks: [{ ...tank, amount: zl(150) }] }
    const e = effectOf(before, after)
    expect(e.cargo).toEqual([{ id: 'C1', name: 'OC', before: zl(400), after: zl(150) }])
    expect(noEffect({ ...e, energy: null, shields: null, envelopes: [], accounts: [], goals: [], loans: [] })).toBe(false)
    expect(effectOf(before, before).cargo).toEqual([])
  })

  it('zbiornik, który pojawia się albo znika (nieaktywny kontener ma zbiornik tylko z pieniędzmi) – brakujący po jednej stronie = 0', () => {
    const state = computeFleet({ settings, transactions: [], months: plans, balances, now: NOW })
    const tank = { containerId: 'C2', name: 'Stare OC', amount: zl(200), dueMonth: '2026-03', paidDue: null, due: zl(900) }
    const full: FleetState = { ...state, tanks: [tank] }
    const none: FleetState = { ...state, tanks: [] }
    expect(effectOf(full, none).cargo).toEqual([{ id: 'C2', name: 'Stare OC', before: zl(200), after: 0 }])
    expect(effectOf(none, full).cargo).toEqual([{ id: 'C2', name: 'Stare OC', before: 0, after: zl(200) }])
    expect(effectOf(none, none).cargo).toEqual([])
  })

  it('pożyczka, której zostało do spłaty mniej albo więcej – przed i po', () => {
    const state = computeFleet({ settings, transactions: [], months: plans, balances, now: NOW })
    const loan = loanSchema.parse({ ...base(), name: 'Dla brata', direction: 'given', amount: zl(1000), date: '2026-09-05' })
    const was = loanState(loan, [], [], state.today)
    const before: FleetState = { ...state, loans: [was] }
    const after: FleetState = { ...state, loans: [{ ...was, paid: zl(300), open: zl(700) }] }
    const e = effectOf(before, after)
    expect(e.loans).toEqual([{ id: loan.id, name: 'Dla brata', before: zl(1000), after: zl(700) }])
    expect(noEffect({ ...e, energy: null, shields: null, envelopes: [], accounts: [], goals: [], cargo: [] })).toBe(false)
    expect(effectOf(before, before).loans).toEqual([])
  })

  it('silnik: spłata przypisana do pożyczki udzielonej – zostaje mniej do oddania', () => {
    const loan = loanSchema.parse({ ...base(), name: 'Dla brata', direction: 'given', amount: zl(1000), date: '2026-09-05' })
    const back = tx('2026-10-05', zl(400), { kind: 'loan', categoryId: null })
    const run = (t: Transaction) => computeFleet({ settings, transactions: [t], months: plans, balances, loans: [loan], now: NOW })
    const e = effectOf(run(back), run({ ...back, loanId: loan.id }))
    expect(e.loans).toEqual([{ id: loan.id, name: 'Dla brata', before: zl(1000), after: zl(600) }])
  })

  it('silnik: płatność przypisana do kontenera opłaty okresowej – zbiornik jak w stanie silnika', () => {
    const oc = containerSchema.parse({ ...base(), name: 'OC', amount: zl(1200), cycleMonths: 12, dueMonth: '2026-10', dueDay: 8 })
    const pay = tx('2026-10-08', -zl(1200))
    const run = (t: Transaction) => computeFleet({ settings, transactions: [t], months: plans, balances, containers: [oc], now: NOW })
    const before = run(pay)
    const after = run({ ...pay, containerId: oc.id })
    const tank = (f: FleetState) => f.tanks.find((t) => t.containerId === oc.id)!.amount
    expect(tank(before)).not.toBe(tank(after))
    expect(effectOf(before, after).cargo).toEqual([{ id: oc.id, name: 'OC', before: tank(before), after: tank(after) }])
  })
})
