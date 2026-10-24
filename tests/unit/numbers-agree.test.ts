import { describe, expect, it } from 'vitest'
import { briefing, confirmationsOf } from '@shared/calc/briefing'
import { computeFleet, energyAfter, fitSplit, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { monthlySchedule } from '@shared/calc/loans'
import { withKind } from '@shared/calc/kinds'
import { isConfirmedNight, splitEvenly, sum as sumOf } from '@shared/calc/operations'
import { isAmountKey, isAmountPath } from '@shared/merge'
import { parseDateInput } from '../../src/renderer/lib/format'
import { coveredMonths } from '@shared/calc/history'
import { debriefing, lootExtraOf, proposeSalary, salarySplit, sinkingOf } from '@shared/calc/plan'
import { createDefaultSettings } from '@shared/defaults'
import {
  balanceSchema,
  containerSchema,
  defaultCategoryId,
  dockingSchema,
  goalSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
  type Settings,
  type Transaction
} from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5G00000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })

const FOOD = defaultCategoryId(1)
const GROCERIES = defaultCategoryId(1, 1)
const HOME = defaultCategoryId(2)

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const fromBank = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  tx(date, amount, { categoryId: GROCERIES, bank: { key: `k-${nextId()}`, importedAt: AT } as Transaction['bank'], ...over })
const plan = (month: string, salary: number, envelopes: Record<string, number> = {}, over = {}) => monthPlanSchema.parse({ ...base(), month, salary, envelopes, ...over })
const opening = (date: string, amount: number, accountId = MBANK_ACCOUNT_ID) => balanceSchema.parse({ ...base(), date, accountId, kind: 'opening', amount })

function settingsWith(over: { budget?: Partial<Settings['budget']>; layers?: Partial<Settings['layers']> } = {}): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, budget: { ...s.budget, ...over.budget }, layers: { ...s.layers, ...over.layers } }
}

function fleet(input: Partial<FleetInput> & { now: string }): FleetState {
  const state = computeFleet({ settings: settingsWith(), transactions: [], ...input })
  if (state.started) expect(layersSum(state)).toBe(state.total)
  return state
}

describe('liczby się zgadzają (1.5.2, grupa I)', () => {
  it('średnie od historii z banku: stara pożyczka z Radaru i wpis ręczny sprzed importu nie dokładają pustych miesięcy (B25); bieżący miesiąc nigdy pełny (B23)', () => {
    const transactions = [
      tx('2024-03-15', zl(-1000), { kind: 'loan' }),
      tx('2026-06-20', zl(-50), { categoryId: GROCERIES }),
      fromBank('2026-07-01', zl(-100)),
      fromBank('2026-07-10', zl(-2900)),
      fromBank('2026-08-10', zl(-3000)),
      fromBank('2026-09-10', zl(-3000)),
      fromBank('2026-10-05', zl(-500))
    ]
    const state = fleet({ transactions, now: '2026-10-18T12:00:00+02:00' })
    expect(state.historyMonths).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(state.costs).toEqual({ average: zl(3000), months: 3, source: 'history' })
    // November's salary from the engine's months – October has 18 days of costs only.
    expect(proposeSalary(transactions, '2026-11', state.historyMonths)).toMatchObject({ months: ['2026-07', '2026-08', '2026-09'], average: zl(3000), amount: zl(3000) })
    // A month without any operation (a gap of the imports) is left out, not a month of no costs.
    expect(coveredMonths([fromBank('2026-01-01', zl(-10)), fromBank('2026-03-04', zl(-10)), fromBank('2026-04-02', zl(-10))], '2026-05')).toEqual(['2026-01', '2026-03', '2026-04'])
    // Typed by hand only: the earliest purchase or income, never a loan or a correction dated back.
    expect(coveredMonths([tx('2025-01-10', zl(-5), { kind: 'correction' }), tx('2026-02-01', zl(-20)), tx('2026-03-02', zl(-20))], '2026-04')).toEqual(['2026-02', '2026-03'])
    // …from before the wizard's openings too (review of 1.5.2): the openings of today never cut the history typed earlier.
    expect(coveredMonths([tx('2026-06-01', zl(-20)), tx('2026-07-03', zl(-20)), tx('2026-08-02', zl(-20))], '2026-10', ['2026-10-19'])).toEqual(['2026-06', '2026-07', '2026-08'])
    // An opening on the 1st with purchases typed from the 3rd: that month is whole.
    expect(coveredMonths([tx('2026-09-03', zl(-20)), tx('2026-10-02', zl(-20))], '2026-11', ['2026-09-01'])).toEqual(['2026-09', '2026-10'])
    // With the bank's history an opening dated earlier never makes its first, half-imported month whole.
    expect(coveredMonths([fromBank('2026-06-15', zl(-10)), fromBank('2026-07-02', zl(-10)), fromBank('2026-08-02', zl(-10))], '2026-09', ['2026-01-01'])).toEqual(['2026-07', '2026-08'])
  })

  it('konto z saldem otwarcia 1. dnia miesiąca wpływa do osłon przed pensją tego dnia (B60)', () => {
    const state = fleet({
      settings: settingsWith({ budget: { start: '2026-09-15' } }),
      balances: [opening('2026-09-15', zl(4500)), opening('2026-10-01', zl(20000), XTB_WALLET_ACCOUNT_ID)],
      months: [plan('2026-09', zl(4000))],
      now: '2026-10-05T12:00:00+02:00'
    })
    expect(state.alarms.filter((a) => a.kind === 'salary-partial' || a.kind === 'salary-from-hull')).toEqual([])
    expect(state.salary).toMatchObject({ paid: zl(4000), alarm: null })
    expect(state.energy).toBe(zl(4000))
  })

  it('„Pożyczka” bez rekordu z Radaru: tylko osłony – nie dokuje do celów jak przychód, jej spłata nie jest należnością (B57)', () => {
    const wakacje = goalSchema.parse({ ...base(), name: 'Wakacje', target: zl(5000), priority: 1 })
    const input = {
      settings: settingsWith({ budget: { start: '2026-10-01', initial: { shields: 0, hull: zl(21900), goals: {} } }, layers: { assumedCosts: zl(3650) } }),
      balances: [opening('2026-10-01', zl(37900))],
      months: [plan('2026-10', zl(4000))],
      goals: [wakacje]
    }
    const borrowed = tx('2026-10-10', zl(2000), { kind: 'loan' })
    const after = fleet({ ...input, transactions: [borrowed], now: '2026-10-11T12:00:00+02:00' })
    expect(after.goals[0]!.amount).toBe(0)
    expect(after.shields.amount).toBe(zl(14000))
    const repaid = fleet({ ...input, transactions: [borrowed, tx('2026-10-12', zl(-2000), { kind: 'loan' })], now: '2026-10-13T12:00:00+02:00' })
    expect([repaid.receivables.loans, repaid.shields.amount, repaid.goals[0]!.amount]).toEqual([{}, zl(12000), 0])
    // Lent without a record, then back: a receivable by „-” in between, nothing after – and nothing docked.
    const lent = tx('2026-10-14', zl(-500), { kind: 'loan' })
    expect(fleet({ ...input, transactions: [lent], now: '2026-10-15T12:00:00+02:00' }).receivables.loans).toEqual({ '-': zl(500) })
    const back = fleet({ ...input, transactions: [lent, tx('2026-10-16', zl(500), { kind: 'loan' })], now: '2026-10-17T12:00:00+02:00' })
    expect([back.receivables.loans, back.goals[0]!.amount]).toEqual([{}, 0])
  })

  it('płatność usuniętego kontenera liczy się do koperty, przydziału i debriefingu jak zwykły wydatek (B58)', () => {
    const gone = tx('2026-10-05', zl(-200), { categoryId: GROCERIES, containerId: nextId() })
    const input = {
      settings: settingsWith({ budget: { start: '2026-10-01' } }),
      balances: [opening('2026-10-01', zl(10000))],
      months: [plan('2026-10', zl(4000), { [FOOD]: zl(1500) })],
      transactions: [gone]
    }
    const state = fleet({ ...input, now: '2026-10-10T12:00:00+02:00' })
    expect(state.envelopes.find((e) => e.categoryId === FOOD)?.spent).toBe(zl(200))
    expect(state.daily?.spentBefore).toBe(zl(200))
    const categories = input.settings.categories
    const ended = fleet({ ...input, now: '2026-11-02T12:00:00+01:00' })
    const brief = debriefing('2026-10', { transactions: [gone], categories, plans: input.months, log: ended.log, alarms: ended.alarms, containers: [], today: '2026-11-02' })
    expect([brief.cargo, brief.envelopes.find((e) => e.categoryId === FOOD)?.spent]).toEqual([0, zl(200)])
  })

  it('zapisany podział dokowania przy mniejszej kwocie operacji: części do kwoty, osłony nie dopłacają (B59)', () => {
    expect(fitSplit(zl(4000), { hull: zl(3000), goals: { g: zl(2000) }, taxHold: 0 })).toEqual({ hull: zl(3000), goals: { g: zl(1000) }, taxHold: 0, shields: 0 })
    expect(fitSplit(zl(6000), { hull: zl(3000), goals: { g: zl(2000) }, taxHold: zl(500) })).toEqual({ hull: zl(3000), goals: { g: zl(2000) }, taxHold: zl(500), shields: zl(500) })
    const g = goalSchema.parse({ ...base(), name: 'Cel', target: zl(10000), priority: 1 })
    const income = tx('2026-10-10', zl(4000), { kind: 'income' })
    const docking = dockingSchema.parse({ ...base(), date: '2026-10-10', transactionId: income.id, split: { shields: 0, hull: zl(3000), goals: { [g.id]: zl(2000) }, taxHold: 0 } })
    const state = fleet({
      settings: settingsWith({ budget: { start: '2026-10-01' } }),
      balances: [opening('2026-10-01', zl(20000))],
      months: [plan('2026-10', zl(4000))],
      goals: [g],
      dockings: [docking],
      transactions: [income],
      now: '2026-10-11T12:00:00+02:00'
    })
    expect(state.log.find((e) => e.txId === income.id)?.moves).toEqual({ hull: zl(3000), goals: { [g.id]: zl(1000) }, shields: 0 })
  })

  it('„wolne do decyzji” tylko przy pełnym kadłubie – inaczej to tylko nadwyżka ponad cel osłon (N21)', () => {
    const input = (hull: number, total: number) => ({
      settings: settingsWith({ budget: { start: '2026-10-01', initial: { shields: 0, hull, goals: {} } }, layers: { assumedCosts: zl(3650) } }),
      balances: [opening('2026-10-01', total)],
      months: [plan('2026-10', zl(4000))],
      now: '2026-10-05T12:00:00+02:00'
    })
    // Hull 1 000 / 21 900 zł: the shields 25 000 / 12 000 zł after the salary – 13 000 zł over, nothing free.
    const low = fleet(input(zl(1000), zl(30000)))
    expect([low.shields.over, low.shields.free]).toEqual([zl(13000), 0])
    // A full hull: what is over the shields' target is free to decide.
    const full = fleet(input(zl(21900), zl(50000)))
    expect([full.shields.over, full.shields.free]).toEqual([zl(12100), zl(12100)])
  })

  it('„miesiąc na plus” jak silnik: rata odkładki zjada energię, opłata ze zbiornika nie jest kosztem pensji, miesiąc trwa = bez oceny (N6)', () => {
    const categories = settingsWith().categories
    // (a) The salary 5 000 zł, the tank's installment 100 zł, the spending 4 950 zł – 50 zł from the shields.
    const oc = containerSchema.parse({ ...base(), name: 'OC', amount: zl(1200), cycleMonths: 12, dueMonth: '2027-09', dueDay: 10 })
    const months = [plan('2026-10', zl(5000))]
    const spend = [tx('2026-10-12', zl(-4950), { categoryId: GROCERIES })]
    const inputA = { settings: settingsWith({ budget: { start: '2026-10-01' } }), balances: [opening('2026-10-01', zl(30000))], months, containers: [oc], transactions: spend }
    const a = fleet({ ...inputA, now: '2026-11-02T12:00:00+01:00' })
    const briefA = debriefing('2026-10', { transactions: spend, categories, plans: months, log: a.log, alarms: a.alarms, containers: [oc], today: '2026-11-02' })
    expect(briefA.plus).toBe(false)
    expect(briefA.energy).toMatchObject({ salary: zl(5000), sinking: zl(100), budget: zl(4900), used: zl(4950), exhausted: zl(50), result: zl(-50) })
    // Without the engine's month: net costs against the salary, as before.
    expect(debriefing('2026-10', { transactions: spend, categories, plans: months, today: '2026-11-02' }).plus).toBe(true)
    // While the month runs, no verdict yet.
    const running = fleet({ ...inputA, now: '2026-10-20T12:00:00+02:00' })
    expect(debriefing('2026-10', { transactions: spend, categories, plans: months, log: running.log, alarms: running.alarms, containers: [oc], today: '2026-10-20' }).plus).toBeNull()

    // (b) A quarterly fee of 300 zł paid in December from its tank: the month's costs 1 150 zł > the salary, yet on plus.
    const quarterly = containerSchema.parse({ ...base(), name: 'Abonament', amount: zl(300), cycleMonths: 3, dueMonth: '2026-12', dueDay: 10 })
    const plansB = [plan('2026-10', zl(1000))]
    const dec = [tx('2026-12-05', zl(-850), { categoryId: GROCERIES }), tx('2026-12-10', zl(-300), { categoryId: HOME, containerId: quarterly.id })]
    const b = fleet({ settings: settingsWith({ budget: { start: '2026-10-01' } }), balances: [opening('2026-10-01', zl(10000))], months: plansB, containers: [quarterly], transactions: dec, now: '2027-01-02T12:00:00+01:00' })
    const briefB = debriefing('2026-12', { transactions: dec, categories, plans: plansB, log: b.log, alarms: b.alarms, containers: [quarterly], today: '2027-01-02' })
    expect(briefB.costs).toBe(zl(1150))
    expect(briefB.plus).toBe(true)
    expect(briefB.energy).toMatchObject({ budget: zl(900), used: zl(850), result: zl(50) })
  })

  it('łupy „na następny miesiąc” w podziale pensji i w puli codziennej debriefingu – jak dzienny przydział silnika (N11)', () => {
    const categories = settingsWith().categories
    // October leaves 300 zł; on 2 November it goes to November.
    const months = [plan('2026-10', zl(4000), { [FOOD]: zl(3000) }, { loot: { decidedAt: '2026-11-02T09:00:00.000Z', shields: 0, nextMonth: zl(300), goals: {} } }), plan('2026-11', zl(4000), { [FOOD]: zl(3000) })]
    const transactions = [tx('2026-10-15', zl(-3700), { categoryId: GROCERIES }), tx('2026-11-10', zl(-3000), { categoryId: GROCERIES }), tx('2026-11-11', zl(-250), { categoryId: null })]
    const input = { settings: settingsWith({ budget: { start: '2026-10-01' } }), balances: [opening('2026-10-01', zl(20000))], months, transactions }
    const during = fleet({ ...input, now: '2026-11-15T12:00:00+01:00' })
    expect(lootExtraOf(during.log, '2026-11')).toBe(zl(300))
    expect(during.daily?.limit).toBe(zl(3300))
    const split = salarySplit(months[1]!, '2026-11', [], categories, sinkingOf(during.log, '2026-11'), lootExtraOf(during.log, '2026-11'))
    expect([split.lootExtra, split.dailyBase, split.unallocated]).toEqual([zl(300), zl(110), zl(1000)])
    const after = fleet({ ...input, now: '2026-12-02T12:00:00+01:00' })
    const brief = debriefing('2026-11', { transactions, categories, plans: months, log: after.log, alarms: after.alarms, containers: [], today: '2026-12-02' })
    expect(brief.daily).toEqual({ limit: zl(3300), extra: zl(300), spent: zl(3250), gap: zl(50) })
    expect(brief.envelopes.find((e) => e.categoryId === FOOD)?.gap).toBe(0)
  })
})

describe('pola i ekrany (1.5.2, grupa I)', () => {
  it('data „dd.mm” operacji bez roku nie trafia w przyszły rok; z rokiem zostaje (B12)', () => {
    expect(parseDateInput('28.12', 2027, '2027-01-03')).toBe('2026-12-28')
    expect(parseDateInput('02.01', 2027, '2027-01-03')).toBe('2027-01-02')
    // A week ahead still counts as this year (a planned purchase), a year typed is kept.
    expect(parseDateInput('09.01', 2027, '2027-01-03')).toBe('2027-01-09')
    expect(parseDateInput('28.12.2027', 2027, '2027-01-03')).toBe('2027-12-28')
    expect(parseDateInput('28.12', 2027)).toBe('2027-12-28')
    // The day nearest to the field's date (review of 1.5.2): an operation of 30.12 corrected to 02.01 is the January
    // after; an old one keeps its year.
    expect(parseDateInput('02.01', 2025, '2026-01-03', '2025-12-30')).toBe('2026-01-02')
    expect(parseDateInput('12.05', 2024, '2026-10-19', '2024-05-10')).toBe('2024-05-12')
    // 29.02 more than a week ahead: no earlier year has it – it stays (the editor marks it „w przyszłości”).
    expect(parseDateInput('29.02', 2028, '2028-02-10', '2028-02-10')).toBe('2028-02-29')
    expect(parseDateInput('31.04', 2026, '2026-10-19', '2026-10-19')).toBeNull()
  })

  it('kwoty w groszach w historii, oknie zmian i Synchronizacji rozpoznane po ścieżce (B7)', () => {
    expect(isAmountPath(['amount'])).toBe(true)
    expect(isAmountPath(['splits', '#01K', 'amount'])).toBe(true)
    expect(isAmountPath(['envelopes', FOOD])).toBe(true)
    expect(isAmountPath(['settings', 'household', 'members', '#01K', 'opening', 'owed'])).toBe(true)
    expect(isAmountPath(['note'])).toBe(false)
    expect(isAmountPath(['cycleMonths'])).toBe(false)
    expect(isAmountKey('splits[0].amount')).toBe(true)
    expect(isAmountKey('settings.budget.initial.hull')).toBe(true)
    expect(isAmountKey('dueDay')).toBe(false)
  })

  it('przypomnienie o saldzie dla każdego konta – potwierdzony mBank nie ukrywa Portfela XTB (B28)', () => {
    const settings = settingsWith()
    const confirmed = balanceSchema.parse({ ...base(), date: '2026-10-15', accountId: MBANK_ACCOUNT_ID, kind: 'confirmation', amount: zl(100) })
    const list = confirmationsOf(settings.accounts, [confirmed])
    expect(list.find((a) => a.accountId === MBANK_ACCOUNT_ID)?.last).toBe('2026-10-15')
    expect(list.find((a) => a.accountId === XTB_WALLET_ACCOUNT_ID)?.last).toBeNull()
    // The cash is counted when it matters (D83) – never asked weekly.
    expect(list.some((a) => settings.accounts.find((x) => x.id === a.accountId)?.kind === 'cash')).toBe(false)
    const state = fleet({ settings: settingsWith({ budget: { start: '2026-10-01' } }), balances: [opening('2026-10-01', zl(5000))], months: [plan('2026-10', zl(4000))], now: '2026-10-18T12:00:00+02:00' })
    const items = briefing({ fleet: state, containers: [], imports: [], confirmations: list, label: () => '' }).filter((i) => i.kind === 'balances')
    expect(items.map((i) => i.key)).toEqual([`balances:${XTB_WALLET_ACCOUNT_ID}:2026-10-18`])
  })

  it('podgląd energii szybkiego wpisu jak silnik: wczorajszy zakup rozłożony na dni, inny miesiąc i przyszłość bez zmian (N3)', () => {
    const d = { today: '2026-10-18', limit: zl(3100), spentBefore: zl(1700), spentToday: 0, days: 31 }
    // 14 days left with today: (3 100 − 1 700) / 14 = 100 zł today.
    expect(energyAfter(d, '2026-10-18', zl(140))).toEqual({ before: zl(100), after: zl(-40) })
    expect(energyAfter(d, '2026-10-17', zl(140))).toEqual({ before: zl(100), after: zl(90) })
    expect(energyAfter(d, '2026-09-30', zl(140))).toBeNull()
    expect(energyAfter(d, '2026-10-19', zl(140))).toBeNull()
  })

  it('pola liczb całkowitych: harmonogram z 2,5 raty liczy się jak z 2 – bez zgubionej kwoty (B26)', () => {
    expect(splitEvenly(zl(600), 2.5)).toEqual([zl(300), zl(300)])
    expect(sumOf(monthlySchedule(zl(600), 2.5, '2026-10-10', nextId).map((s) => s.amount))).toBe(zl(600))
  })

  it('zakup w ciszy nocnej potwierdzony wpisem w dzienniku – naruszenie; godzina nocna bez wpisu – dopisany zakup z dnia (N10)', () => {
    const orders = settingsWith().orders
    expect(isConfirmedNight(tx('2026-10-10', zl(-30), { time: '23:30', logNote: 'głodny' }), orders)).toBe(true)
    expect(isConfirmedNight(tx('2026-10-10', zl(-30), { time: '23:30' }), orders)).toBe(false)
    expect(isConfirmedNight(tx('2026-10-10', zl(-30), { time: '12:30', logNote: 'obiad' }), orders)).toBe(false)
  })

  it('wyjaśniona korekta salda nie świeci żółtym alarmem w Odprawie; zmiana rodzaju czyści flagę (N-PC-1)', () => {
    const corr = tx('2026-10-12', zl(-50), { kind: 'correction' })
    const baseInput = { settings: settingsWith({ budget: { start: '2026-10-01' } }), balances: [opening('2026-10-01', zl(5000))], months: [plan('2026-10', zl(3000))], now: '2026-10-15T12:00:00+02:00' }
    expect(fleet({ ...baseInput, transactions: [corr] }).alarms.some((a) => a.kind === 'correction')).toBe(true)
    const explained = { ...corr, explained: true }
    expect(fleet({ ...baseInput, transactions: [explained] }).alarms.some((a) => a.kind === 'correction')).toBe(false)
    expect(withKind(explained, 'expense').explained).toBeUndefined()
  })

  it('zwrot towaru po wyczerpaniu energii miesiąca najpierw oddaje osłonom – alarm znika, a debriefing i łupy się zgadzają (N-PC-3)', () => {
    const categories = settingsWith().categories
    const months = [plan('2026-10', zl(4000))]
    const over = tx('2026-10-10', zl(-4200), { categoryId: GROCERIES })
    const ret = tx('2026-10-15', zl(500), { categoryId: GROCERIES })
    const after = fleet({
      settings: settingsWith({ budget: { start: '2026-10-01' } }),
      balances: [opening('2026-10-01', zl(10000))],
      months,
      transactions: [over, ret],
      now: '2026-11-02T12:00:00+01:00'
    })
    expect(after.alarms.filter((a) => a.kind === 'energy-exhausted')).toEqual([])
    expect(after.loot).toEqual({ month: '2026-10', amount: zl(300) })
    const brief = debriefing('2026-10', { transactions: [over, ret], categories, plans: months, log: after.log, alarms: after.alarms, today: '2026-11-02' })
    expect(brief.plus).toBe(true)
    expect(brief.energy).toMatchObject({ budget: zl(4000), used: zl(3700), exhausted: 0, result: zl(300) })
  })

  it('stan początkowy zbiorników odkładek na starcie budżetu pomniejsza pierwszą ratę do normalnej części miesięcznej (N-PC-7)', () => {
    const oc = containerSchema.parse({ ...base(), name: 'OC', amount: zl(1200), cycleMonths: 12, dueMonth: '2027-03', dueDay: 10 })
    const s = fleet({
      settings: settingsWith({ budget: { start: '2026-10-01', initial: { shields: 0, hull: zl(5000), goals: {}, tanks: { [oc.id]: zl(600) } } } }),
      balances: [opening('2026-10-01', zl(20000))],
      months: [plan('2026-10', zl(4000))],
      containers: [oc],
      now: '2026-10-15T12:00:00+02:00'
    })
    // 600 zł at start + 100 zł (October's 1/12th share of the remaining 6 months) = 700 zł in tank; 3 900 zł left in energy.
    expect(s.tanks.find((t) => t.containerId === oc.id)?.amount).toBe(zl(700))
    expect(s.energy).toBe(zl(3900))
    expect(isAmountKey(`settings.budget.initial.tanks.${oc.id}`)).toBe(true)
  })
})
