/**
 * N5 (1.15.9), the xhigh review – findings 5, 8, 9, 10 (pure): the confirmation of a top-up of XTB moves nothing in the
 * engine on any day (a property over random days: transfers of goals, hull top-ups and operations around it – T438,
 * T363), the export „Miesiące” counts the month in progress up to today, the later operations apart (T421), no
 * „propozycje zmniejszone” with nothing proposed (T445), a return losing its pair named as the docking window names it
 * (T429).
 */
import { describe, expect, it } from 'vitest'
import { lostPairText } from '@shared/calc/effect'
import { budgetStartOf, computeFleet, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { fuelMonths } from '@shared/calc/fuel'
import { transferGoal } from '@shared/calc/goals'
import { topUpConfirmation } from '@shared/calc/inbox'
import { plainIncomeContext } from '@shared/calc/income'
import { fitEnvelopes } from '@shared/calc/start'
import { createDefaultSettings } from '@shared/defaults'
import { monthRows, monthsCsv, monthsSheet } from '@shared/export/budget'
import { contentMark } from '@shared/merge'
import { balanceSchema, goalSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Goal, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9R5F000000000000000${String(++seq).padStart(4, '0')}`
const base = (createdAt = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt, updatedAt: createdAt })

/** A small deterministic generator (mulberry32): the same days on every run. */
function random(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('przegląd N5 5: potwierdzenie dopłaty do XTB nie zmienia silnika w żadnym dniu (własność, T438)', () => {
  const DAY = '2026-11-03'
  // Midnight of the day in Warsaw (CET): 23:00 UTC the day before.
  const dayStart = Date.parse('2026-11-02T23:00:00.000Z')
  const at = (minute: number) => new Date(dayStart + minute * 60_000).toISOString()
  /** What the confirmation must not touch: the money of every layer, the alarms, the engine's whole log. */
  const view = (s: FleetState) => ({
    shields: s.shields,
    hull: s.hull,
    goals: s.goals,
    energy: s.energy,
    taxHold: s.taxHold,
    deposit: s.deposit,
    toDock: s.toDock,
    daily: s.daily,
    envelopes: s.envelopes,
    accounts: s.accounts,
    alarms: s.alarms,
    log: s.log
  })

  it('300 losowych dni: przeniesienia celów, dopełnienia kadłuba, wydatki i wpływ z XTB wokół dopłaty – stan identyczny', () => {
    const next = random(20261103)
    const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1))
    let differed = 0
    for (let run = 0; run < 300; run++) {
      const s0 = createDefaultSettings(AT).settings
      const goals: Goal[] = [goalSchema.parse({ ...base(), name: 'Wakacje', target: zl(5000), priority: 1 }), goalSchema.parse({ ...base(), name: 'Rower', target: zl(3000), priority: 2 })]
      const initialGoals = { [goals[0]!.id]: zl(int(0, 4000)), [goals[1]!.id]: zl(int(0, 2000)) }
      // The goals' money moved during the day: to the shields or to the other goal.
      const moved = goals.map((g, i) => {
        let goal = g
        for (let k = int(0, 2); k > 0; k--) goal = transferGoal(goal, next() < 0.6 ? 'shields' : goals[1 - i]!.id, zl(int(100, 3000)), at(int(0, 1439)))
        return goal
      })
      const hullTopUps = Array.from({ length: int(0, 2) }, () => ({ id: nextId(), amount: zl(int(100, 1500)), at: at(int(0, 1439)) }))
      const op = (amount: number, kind: Transaction['kind'], createdMinute: number, time?: string) =>
        transactionSchema.parse({ ...base(at(createdMinute)), date: DAY, accountId: MBANK_ACCOUNT_ID, kind, amount, counterparty: kind === 'trading' ? 'XTB S.A.' : 'Sklep', ...(time ? { time } : {}) })
      // Created from the day before (an import of yesterday) to the day's end; some with an hour of the bank.
      const created = () => int(-600, 1439)
      const hour = () => (next() < 0.3 ? `${String(int(0, 23)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}` : undefined)
      const top = op(-zl(int(50, 3000)), 'trading', created(), hour())
      const others = [
        ...Array.from({ length: int(0, 3) }, () => op(-zl(int(10, 500)), 'expense', created(), hour())),
        ...(next() < 0.5 ? [op(zl(int(500, 6000)), 'trading', created(), hour())] : []),
        ...(next() < 0.3 ? [op(zl(int(100, 2000)), 'income', created(), hour())] : [])
      ]
      const settings: Settings = {
        ...s0,
        budget: { ...s0.budget, start: '2026-11-01', initial: { shields: 0, hull: zl(int(8000, 12000)), goals: initialGoals } },
        layers: { ...s0.layers, assumedCosts: zl(2000) }
      }
      const input: FleetInput = {
        settings,
        balances: [balanceSchema.parse({ ...base(), date: '2026-11-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(int(15000, 40000)) })],
        months: [monthPlanSchema.parse({ ...base(), month: '2026-11', salary: zl(4000), envelopes: {}, hullTopUps })],
        goals: moved,
        transactions: [top, ...others],
        // The engine's day: the top-up's day or two days later.
        now: next() < 0.5 ? '2026-11-03T22:30:00.000Z' : '2026-11-05T11:00:00.000Z'
      }
      // The click: from the operation's arrival to two days later.
      const click = new Date(Math.max(Date.parse(top.createdAt), dayStart) + int(1, 3 * 1440) * 60_000).toISOString()
      const before = computeFleet(input)
      const after = computeFleet({ ...input, dockings: [topUpConfirmation(top, click)] })
      expect(layersSum(after)).toBe(after.total)
      expect(view(after)).toEqual(view(before))
      // How many of the days would have counted differently from the click (the finding): the property is not empty.
      const clickOnly = computeFleet({ ...input, dockings: [{ ...topUpConfirmation(top, click), countedFrom: undefined }] })
      if (JSON.stringify(view(clickOnly)) !== JSON.stringify(view(before))) differed++
    }
    expect(differed).toBeGreaterThan(20)
  })
})

describe('przegląd N5 8: eksport „Miesiące” – miesiąc w toku do dziś, jak Bilans paliwa (T421)', () => {
  const s = createDefaultSettings(AT).settings
  const op = (date: string, amount: number, over: Partial<Transaction> = {}) =>
    transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, counterparty: 'X', ...(amount > 0 ? { kind: 'income', categoryId: null } : {}), ...over })

  it('przychód i koszty z tego samego okresu (do dziś); operacje z datą po dziś – „Zaplanowane” koszty i przychody osobno', () => {
    // 20.11: the salary of 5 000 zł on the 10th and a bonus of 3 000 zł typed ahead for the 25th; 1 000 zł spent on the
    // 5th, 400 zł planned for the 28th.
    const transactions = [op('2026-11-10', zl(5000)), op('2026-11-25', zl(3000)), op('2026-11-05', -zl(1000)), op('2026-11-28', -zl(400))]
    const plans = [monthPlanSchema.parse({ ...base(), month: '2026-11', salary: zl(4000) })]
    const today = '2026-11-20'
    const [row] = monthRows({ transactions, categories: s.categories, plans, log: [], today }, ['2026-11'])
    // Before: the income of the whole month (8 000 zł) against the costs up to today – the balance 7 000 zł, 87,5%.
    expect(row).toMatchObject({ costs: zl(1000), income: zl(5000), balance: zl(4000), rate: 80, planned: zl(400), inProgress: true })
    // One period with „Bilans paliwa” of Raporty.
    const [fuel] = fuelMonths(transactions, plainIncomeContext(transactions), ['2026-11'], today)
    expect([row!.income, row!.costs, row!.balance, row!.rate]).toEqual([fuel!.income, fuel!.costs, fuel!.balance, fuel!.rate])
    // Przegląd 2 N5: the bonus dated after today is not lost from the file – its own column beside the planned costs.
    expect(row!.plannedIncome).toBe(zl(3000))
    const csv = monthsCsv([row!]).split('\r\n')
    expect(csv[0]!.endsWith(';Sfinansowane przez domowników (zł);Zaplanowane koszty – data po dziś (zł);Zaplanowane przychody – data po dziś (zł)')).toBe(true)
    expect(csv[1]).toBe('2026-11;4000,00;1000,00;5000,00;w toku;;4000,00;80,0;;0,00;400,00;3000,00')
    expect(monthsSheet([row!]).rows[0]!.slice(-2)).toEqual([400, 3000])
    // A month that has ended: everything in it, nothing planned.
    const [ended] = monthRows({ transactions, categories: s.categories, plans, log: [], today: '2026-12-02' }, ['2026-11'])
    expect(ended).toMatchObject({ costs: zl(1400), income: zl(8000), balance: zl(6600), planned: 0, plannedIncome: 0, inProgress: false })
  })
})

describe('przegląd N5 9: dopasowanie kopert bez propozycji (T445)', () => {
  it('nic nie zaproponowano – nic nie zmniejszono, także gdy pensja nic nie zostawia', () => {
    // Before: `fitted` true – „Średnie wydatki (0,00 zł) są wyższe… – propozycje zmniejszone” with nothing proposed.
    expect(fitEnvelopes({}, -zl(100))).toEqual({ envelopes: {}, fitted: false, asked: 0 })
    expect(fitEnvelopes({}, 0)).toEqual({ envelopes: {}, fitted: false, asked: 0 })
    // Something proposed and nothing left: made smaller (to 0), said.
    expect(fitEnvelopes({ food: zl(500) }, -zl(1))).toEqual({ envelopes: { food: 0 }, fitted: true, asked: zl(500) })
    expect(fitEnvelopes({ food: zl(500) }, zl(500))).toEqual({ envelopes: { food: zl(500) }, fitted: false, asked: zl(500) })
  })
})

describe('przegląd N5 10: podgląd zmiany zbiorczej – zwrot ICTTJ tracący parę (T429, N43)', () => {
  const money = (g: number) => `${(g / 100).toFixed(2).replace('.', ',')} zł`
  it('zwrot do masy nazwany jak w oknie dokowania, wypłata bez zmian', () => {
    expect(lostPairText({ direction: 'out', date: '2026-10-19', amount: zl(300) }, money)).toBe('Zwrot do masy w ICTTJ z 19.10.2026 (300,00 zł) straci parę w banku – Dokowanie pokaże ją bez pary.')
    expect(lostPairText({ direction: 'in', date: '2026-10-19', amount: zl(800) }, money)).toBe('Wypłata z ICTTJ z 19.10.2026 (800,00 zł) straci parę w banku – Dokowanie pokaże ją bez pary.')
  })
})

describe('przegląd 2 N5: saldo otwarcia nieudanego startu nie uruchamia warstw (`byStart`, T446)', () => {
  const s0 = createDefaultSettings(AT).settings
  const opening = (over: Record<string, unknown> = {}) => balanceSchema.parse({ ...base(), date: '2026-11-03', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(10000), ...over })

  it('bez `budget.start` – nie od salda ze startu kreatora; od salda wpisanego ręcznie jak dotąd (T25); z `budget.start` – start', () => {
    // Before: the earliest opening, whatever wrote it – a start the folder refused ran the layers from its money.
    expect(budgetStartOf(s0, [opening({ byStart: true })], '2026-11-03')).toBeNull()
    expect(computeFleet({ settings: s0, balances: [opening({ byStart: true })], transactions: [], now: '2026-11-03T12:00:00.000Z' }).started).toBe(false)
    expect(budgetStartOf(s0, [opening()], '2026-11-03')).toBe('2026-11-03')
    expect(budgetStartOf({ budget: { ...s0.budget, start: '2026-11-03' } }, [opening({ byStart: true })], '2026-11-03')).toBe('2026-11-03')
    // Only `true` is the mark (a value of another version – none).
    expect(opening({ byStart: 'tak' }).byStart).toBeUndefined()
  })

  it('znacznik treści rekordu: ten sam bez względu na kolejność pól i stemple zapisu, inny przy każdej zmianie pola', () => {
    const r = { id: 'x', amount: 1, nested: { a: 1, b: [1, 2] }, updatedAt: '2026-11-03T10:00:00.000Z', updatedBy: 'PC' }
    expect(contentMark({ nested: { b: [1, 2], a: 1 }, amount: 1, id: 'x', updatedAt: '2026-11-04T10:00:00.000Z', updatedBy: 'LAPTOP', note: undefined })).toBe(contentMark(r))
    expect(contentMark({ ...r, amount: 2 })).not.toBe(contentMark(r))
    expect(contentMark({ ...r, nested: { a: 1, b: [2, 1] } })).not.toBe(contentMark(r))
  })
})
