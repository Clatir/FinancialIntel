import { describe, expect, it } from 'vitest'
import { computeFleet } from '@shared/calc/fleet'
import { debriefing, linkFromOf, unlinkedPayments } from '@shared/calc/plan'
import { pastStateOf, scheduledDays } from '@shared/calc/scheduled'
import { startTanks } from '@shared/calc/start'
import { createDefaultSettings } from '@shared/defaults'
import { balanceSchema, containerSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, scheduledSchema, transactionSchema, type Container, type Scheduled, type Settings, type Transaction } from '@shared/schema'

/**
 * AP-10, the rest (T378, T379): the alarm „za mało w zbiorniku” in the month's debriefing too (LA sp. 5); a buoy closed
 * by an operation of its name, not by the amount alone (RA sp. 1); a buoy long past says what became of it (RA sp. 4);
 * the start links a fee's payments from the month before its first month (N2 – a payment on 28.10 for a due on 03.11).
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9N3F000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const sched = (over: Partial<Scheduled> & { name: string; date: string }): Scheduled => scheduledSchema.parse({ ...base(), ...over })
const container = (over: Partial<Container>): Container => containerSchema.parse({ ...base(), name: 'X', amount: 0, dueMonth: '2026-11', accountId: MBANK_ACCOUNT_ID, ...over })

describe('AP-10: „Za mało w zbiorniku” także w debriefingu (LA sp. 5)', () => {
  it('Wywóz śmieci 240 zł zapłacony 22.10 przy zbiorniku 160 zł: debriefing października – 80,00 zł z energii', () => {
    const waste = container({ name: 'Wywóz śmieci', amount: zl(240), cycleMonths: 3, dueDay: 20 })
    const s0 = createDefaultSettings(AT).settings
    const settings: Settings = { ...s0, budget: { ...s0.budget, start: '2026-09-01' } }
    const transactions = [tx('2026-10-22', -zl(240), { containerId: waste.id, counterparty: 'MPO' })]
    const months = [monthPlanSchema.parse({ ...base(), month: '2026-09', salary: zl(4000), envelopes: {} })]
    const fleet = computeFleet({ settings, balances: [balanceSchema.parse({ ...base(), date: '2026-09-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })], months, transactions, containers: [waste], now: '2026-11-03T12:00:00+01:00' })
    expect(fleet.alarms.filter((a) => a.kind === 'sinking-short').map((a) => [a.date, a.amount])).toEqual([['2026-10-22', zl(80)]])
    const brief = debriefing('2026-10', { transactions, categories: settings.categories, plans: months, log: fleet.log, alarms: fleet.alarms, containers: [waste], today: '2026-11-03' })
    expect(brief.tanksShort).toEqual([{ containerId: waste.id, amount: zl(80) }])
    // November's debriefing has none.
    expect(debriefing('2026-11', { transactions, categories: settings.categories, plans: months, log: fleet.log, alarms: fleet.alarms, containers: [waste], today: '2026-11-03' }).tanksShort).toEqual([])
  })
})

describe('AP-10: boja zamyka się operacją o tej samej nazwie, nie samą kwotą (RA sp. 1)', () => {
  const TODAY = '2026-11-03'
  it('„Przegląd komina” 250 zł i ZALANDO 250 zł dzień później – nie; „Serwis auta” i AUTO SERWIS KOWALSKI – tak', () => {
    const chimney = sched({ name: 'Przegląd komina', date: '2026-10-24', amount: -zl(250), accountId: MBANK_ACCOUNT_ID })
    expect(scheduledDays([chimney], [tx('2026-10-25', -zl(250), { counterparty: 'ZALANDO' })], TODAY, '2026-10-01', '2026-11-30')[0]).toMatchObject({ state: 'late', txId: null })
    const service = sched({ name: 'Serwis auta', date: '2026-11-01', amount: -zl(600), accountId: MBANK_ACCOUNT_ID })
    const op = tx('2026-11-02', -zl(600), { counterparty: 'AUTO SERWIS KOWALSKI' })
    expect(scheduledDays([service], [op], TODAY, '2026-10-01', '2026-11-30')[0]).toMatchObject({ state: 'done', txId: op.id, matched: true })
    // Its word in the bank's name (the first 5 letters: „komina” – KOMINIARZ) – yes; a word of a payment („opłata”) – no.
    expect(scheduledDays([chimney], [tx('2026-10-25', -zl(250), { counterparty: 'KOMINIARZ JAN NOWAK' })], TODAY, '2026-10-01', '2026-11-30')[0]!.state).toBe('done')
    const fee = sched({ name: 'Opłata za przedszkole', date: '2026-11-02', amount: -zl(400) })
    expect(scheduledDays([fee], [tx('2026-11-02', -zl(400), { counterparty: 'PARKING', title: 'OPLATA ZA POSTOJ' })], TODAY, '2026-10-01', '2026-11-30')[0]!.state).toBe('late')
    expect(scheduledDays([fee], [tx('2026-11-02', -zl(400), { counterparty: 'PRZEDSZKOLE NR 5' })], TODAY, '2026-10-01', '2026-11-30')[0]!.state).toBe('done')
    // An operation without a name (written by hand) – by its amount, as before (T282).
    const own = tx('2026-10-24', -zl(250))
    expect(scheduledDays([chimney], [own], TODAY, '2026-10-01', '2026-11-30')[0]).toMatchObject({ state: 'done', txId: own.id })
  })
})

describe('AP-10: „Pozostałe boje” sprzed ponad 30 dni mówią, co się z nimi stało (RA sp. 4)', () => {
  const TODAY = '2026-11-03'
  it('Mandat 03.10 (D−31) bez operacji – minęła; odhaczona albo z operacją MANDAT – zrobiona; przyszła i coroczna – brak stanu', () => {
    const fine = sched({ name: 'Mandat', date: '2026-10-03', amount: -zl(80) })
    expect(pastStateOf(fine, [], TODAY)).toBe('lapsed')
    expect(pastStateOf({ ...fine, done: { '2026-10-03': '' } }, [], TODAY)).toBe('done')
    expect(pastStateOf(fine, [tx('2026-10-04', -zl(80), { counterparty: 'MANDAT STRAZ MIEJSKA' })], TODAY)).toBe('done')
    expect(pastStateOf(sched({ name: 'Składka', date: '2026-10-20', amount: -zl(100) }), [], TODAY)).toBe('late')
    expect(pastStateOf(sched({ name: 'Prezent', date: '2026-11-13', amount: -zl(200) }), [], TODAY)).toBeNull()
    expect(pastStateOf(sched({ name: 'Urodziny', date: '2024-02-29', amount: -zl(300), yearly: true }), [], TODAY)).toBeNull()
  })
})

describe('AP-10: start łączy płatności od 1. dnia miesiąca przed miesiącem startu (T379, N2)', () => {
  it('start 04.11: płatność 28.10 za termin 03.11 – połączona i cykl zapłacony, kreator nie odkłada drugi raz', () => {
    expect(linkFromOf('2026-11-04')).toBe('2026-10-01')
    const txs = [tx('2026-09-28', -zl(240), { counterparty: 'MPO TESTOWO' }), tx('2026-10-28', -zl(240), { counterparty: 'MPO TESTOWO' })]
    expect(unlinkedPayments(txs, 'MPO TESTOWO', linkFromOf('2026-11-04')).map((t) => t.date)).toEqual(['2026-10-28'])
    // The start wizard's tank of a quarterly fee due on 3 November, its payment of 28 October seen: paid, no installment.
    const fee = { key: 'p', name: 'Wywóz', amount: zl(240), cycleMonths: 3, dueMonth: '2026-11', schedule: [], archived: false, from: null, until: null }
    expect(startTanks([{ ...fee, paid: ['2026-10-28'] }], '2026-11-04', {})).toEqual([{ key: 'p', installment: 0, planAmount: 0, paid: true }])
    // From the 1st of the start's month (before 1.15.7) the payment was not seen: the whole fee again.
    expect(startTanks([{ ...fee, paid: unlinkedPayments(txs, 'MPO TESTOWO', '2026-11-01').map((t) => t.date) }], '2026-11-04', {})[0]).toMatchObject({ installment: zl(240), paid: false })
  })
})
