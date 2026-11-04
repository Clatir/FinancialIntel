import { describe, expect, it } from 'vitest'
import { briefing } from '@shared/calc/briefing'
import { cargoStatuses } from '@shared/calc/cargoStatus'
import { computeFleet, layersSum, nextUnpaidOf, paidBeforeStart, tankWant, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { sinkingOf } from '@shared/calc/plan'
import { startTanks } from '@shared/calc/start'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Container, type Settings, type Transaction } from '@shared/schema'

/**
 * AP-5 (AF-12, KR.16, PM sp. 8): a periodic fee paid before the budget's start closes its cycle as a payment in the run
 * does (T135) – the first salary never sets the fee aside a second time, the asteroid of a paid fee does not come, the
 * start wizard counts the same.
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N2A000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const GROCERIES = defaultCategoryId(1, 1)
const INSURANCE = defaultCategoryId(3, 3)

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2026-01', ...over })
const plan = (month: string, salary: number) => monthPlanSchema.parse({ ...base(), month, salary, envelopes: {} })
const opening = (date: string, amount: number) => balanceSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount })
const settings = (start: string): Settings => {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, start, initial: { shields: 0, hull: 0, goals: {} } } }
}
function fleet(input: Partial<FleetInput> & { now: string }): FleetState {
  const state = computeFleet({ settings: createDefaultSettings(AT).settings, transactions: [], ...input })
  if (state.started) expect(layersSum(state)).toBe(state.total)
  return state
}

describe('AP-5: opłata okresowa zapłacona przed startem (AF-12, T135)', () => {
  // KR.16: the OC of PZU, 1 240 zł a year due on the 3rd of November, paid on 2 November; the budget starts on the 3rd.
  const pzu = container({ name: 'PZU SA', amount: zl(1240), cycleMonths: 12, dueMonth: '2026-11', dueDay: 3, categoryId: INSURANCE, counterparty: 'PZU SA' })
  // Spent this month before the start: 129 + 85,40 + 210 − 40 (a return) = 384,40 zł; the OC is its tank's (T45, T220).
  const before = [
    tx('2026-11-01', -zl(129), { categoryId: GROCERIES }),
    tx('2026-11-01', -zl(85.4), { categoryId: GROCERIES }),
    tx('2026-11-02', -zl(210), { categoryId: GROCERIES }),
    tx('2026-11-02', zl(40), { categoryId: GROCERIES }),
    tx('2026-11-02', -zl(1240), { containerId: pzu.id, categoryId: INSURANCE, counterparty: 'PZU SA' })
  ]
  const input = {
    settings: settings('2026-11-03'),
    balances: [opening('2026-11-03', zl(100000))],
    months: [plan('2026-11', zl(3400))],
    containers: [pzu],
    transactions: before
  }

  it('pierwsza pensja nie odkłada drugi raz opłaty zapłaconej 02.11: energia 3 015,60 zł, zbiornik zbiera na listopad 2027', () => {
    const s = fleet({ ...input, now: '2026-11-03T12:00:00+01:00' })
    expect(s.salary?.paid).toBe(zl(3015.6))
    // The cycle of November 2026 is paid: no installment for it (it was 1 240 zł – the energy 1 775,60 zł).
    expect(sinkingOf(s.log, '2026-11').get(pzu.id)).toBeUndefined()
    expect(s.energy).toBe(zl(3015.6))
    expect(s.tanks).toEqual([expect.objectContaining({ containerId: pzu.id, amount: 0, paidDue: '2026-11', dueMonth: '2027-11' })])
    // From December the next cycle: 11 × 103,33 + 103,37 zł (T29).
    const dec = fleet({ ...input, months: [plan('2026-11', zl(3400)), plan('2026-12', zl(3400))], now: '2026-12-02T12:00:00+01:00' })
    expect(sinkingOf(dec.log, '2026-12').get(pzu.id)).toBe(10333)
  })

  it('bez fałszywej asteroidy „dziś”: odprawa, następny termin i Ładownia mówią to samo – zapłacone', () => {
    const s = fleet({ ...input, now: '2026-11-03T12:00:00+01:00' })
    const items = briefing({ fleet: s, containers: [pzu], imports: [], lastConfirmation: null, label: () => '' })
    expect(items.filter((i) => i.kind === 'asteroid')).toEqual([])
    expect(nextUnpaidOf(pzu, '2026-11-03', s.tanks[0]?.paidDue)).toBe('2027-11-03')
    expect(cargoStatuses({ containers: [pzu], transactions: before, today: '2026-11-03', coveredTo: {} })[0]).toMatchObject({ state: 'paid', paid: zl(1240) })
  })

  it('cykl ≥ 3 mies. zapłacony przed startem w miesiącu przed terminem też jest zamknięty; zaległa zapłata poprzedniego cyklu – nie', () => {
    // A quarterly fee of 300 zł due on 3 November, paid on 10 October; the budget starts on 15 October.
    const water = container({ name: 'Woda', amount: zl(300), cycleMonths: 3, dueMonth: '2026-11', dueDay: 3 })
    const early = {
      settings: settings('2026-10-15'),
      balances: [opening('2026-10-15', zl(50000))],
      months: [plan('2026-10', zl(4000))],
      containers: [water],
      transactions: [tx('2026-10-10', -zl(300), { containerId: water.id })]
    }
    const oct = fleet({ ...early, now: '2026-10-20T12:00:00+02:00' })
    expect(sinkingOf(oct.log, '2026-10').get(water.id)).toBeUndefined()
    expect(oct.tanks[0]).toMatchObject({ amount: 0, paidDue: '2026-11', dueMonth: '2027-02' })
    // November: still the paid cycle – nothing; December: the next one, 300 / 3.
    expect(sinkingOf(fleet({ ...early, now: '2026-11-05T12:00:00+01:00' }).log, '2026-11').get(water.id)).toBeUndefined()
    expect(sinkingOf(fleet({ ...early, now: '2026-12-05T12:00:00+01:00' }).log, '2026-12').get(water.id)).toBe(zl(100))

    // Due in December, paid in October before the start: the September cycle paid late (T135) – December still collected.
    const dec = container({ name: 'Śmieci', amount: zl(300), cycleMonths: 3, dueMonth: '2026-12', dueDay: 3 })
    const late = fleet({ ...early, containers: [dec], transactions: [tx('2026-10-10', -zl(300), { containerId: dec.id })], now: '2026-10-20T12:00:00+02:00' })
    // October is the first month of the cycle to December: its 100 zł (closed, it would be nothing).
    expect(sinkingOf(late.log, '2026-10').get(dec.id)).toBe(zl(100))
    expect(late.tanks[0]).toMatchObject({ paidDue: null, dueMonth: '2026-12' })
  })

  it('jedna reguła silnika i kreatora: `paidBeforeStart` i rata `tankWant`', () => {
    expect([...paidBeforeStart(pzu, ['2026-11-02'], '2026-11-03')]).toEqual(['2026-11'])
    // A payment on the start's day is the run's; one of a fee before its life (`from`) closes nothing it follows.
    expect([...paidBeforeStart(pzu, ['2026-11-03'], '2026-11-03')]).toEqual([])
    expect(tankWant(pzu, '2026-11', 0, new Set(['2026-11']))).toBe(0)
    expect(tankWant(pzu, '2026-11', 0, null)).toBe(zl(1240))
  })

  it('kreator (kroki 4 i 6): odkładki pierwszego miesiąca i „do planu” z tej samej reguły – PZU 0 zł, WARTA z nadrabianiem', () => {
    // KR.21 / KR.25: WARTA 480 zł a year due in January, nothing paid – November is the 10th month of its cycle.
    const life = { archived: false, from: null, until: null }
    const items = [
      { key: 'pzu', amount: zl(1240), cycleMonths: 12, dueMonth: '2026-11', schedule: [], paid: ['2025-11-03', '2026-11-02'], ...life },
      { key: 'warta', amount: zl(480), cycleMonths: 12, dueMonth: '2027-01', schedule: [], paid: ['2026-01-05'], ...life }
    ]
    expect(startTanks(items, '2026-11-03', {})).toEqual([
      { key: 'pzu', installment: 0, planAmount: 0, paid: true },
      // 9 × 40 = 360 zł behind the plan, spread over November – January: 40 + 120 zł.
      { key: 'warta', installment: zl(160), planAmount: zl(360), paid: false }
    ])
    // „do planu” for WARTA: then its installment is the plan's.
    expect(startTanks(items, '2026-11-03', { warta: zl(360) })[1]).toEqual({ key: 'warta', installment: zl(40), planAmount: zl(360), paid: false })
    // A fee out of its life in the start's month (its `until` passed): the engine takes nothing – the wizard neither.
    expect(startTanks([{ ...items[1]!, until: '2026-10' }], '2026-11-03', {})).toEqual([{ key: 'warta', installment: 0, planAmount: 0, paid: false }])
  })
})
