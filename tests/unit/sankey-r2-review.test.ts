import { describe, expect, it } from 'vitest'
import { computeFleet, layersSum } from '@shared/calc/fleet'
import { fuelSummary } from '@shared/calc/fuel'
import { categoryIndex } from '@shared/calc/operations'
import { debriefing, transactionsOfMonth, type Debriefing } from '@shared/calc/plan'
import { energyFlows, monthFlows, MONTH_NODE, nodeValues, OUTSIDE_GROUP, outsideMoney, type Flows } from '@shared/calc/sankey'
import { layoutOf, sankeyLayout, sankeySvg, type SankeyLayout } from '@shared/sankeyLayout'
import { FOREIGN_AMOUNT_FIELDS, isAmountPath, isForeignAmountPath } from '@shared/merge'
import { createDefaultSettings } from '@shared/defaults'
import {
  balanceSchema,
  containerSchema,
  defaultCategoryId,
  goalSchema,
  HOUSE_MEMBER_ID,
  loanSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  type Settings,
  type Transaction
} from '@shared/schema'

/**
 * Przegląd R2 (1.17.0 – T490, T491, T492): the Sankey's order and nodes (pkt 3, 6, 9), the energy always balanced
 * (pkt 7), the PDF's labels keeping the amount (pkt 4), the layout once per flows and width (pkt 12), the foreign amount's
 * path by the amounts' one rule (pkt 14); on random months: every node balanced, the sums the debriefing's.
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2026-08-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9R2V000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const CATS = [defaultCategoryId(1, 1), defaultCategoryId(1, 2), defaultCategoryId(2, 1), defaultCategoryId(3, 1), defaultCategoryId(5), defaultCategoryId(6), defaultCategoryId(7, 1)]
const HOME = defaultCategoryId(2)

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const settings: Settings = (() => {
  const s = createDefaultSettings(AT).settings
  return { ...s, household: { ...s.household, since: '2026-08-01' } }
})()
const goal = goalSchema.parse({ ...base(), name: 'Wakacje', target: zl(5000) })
const lent = loanSchema.parse({ ...base(), name: 'Dla Marka', direction: 'given', amount: zl(10000), date: '2026-09-03' })
const rent = containerSchema.parse({ ...base(), name: 'Czynsz', amount: zl(500), dueMonth: '2026-09', dueDay: 15, counterparty: 'WSPÓLNOTA', amountAt: AT })
const fee = containerSchema.parse({ ...base(), name: 'OC', amount: zl(1200), cycleMonths: 12, dueMonth: '2026-12', dueDay: 10, amountAt: AT })

function flowsOf(transactions: Transaction[], o: { salary?: number; now?: string; month?: string } = {}) {
  const month = o.month ?? '2026-09'
  const months = [monthPlanSchema.parse({ ...base(), month: '2026-08', salary: o.salary ?? zl(6000), envelopes: { [FOOD]: zl(1500), [HOME]: zl(2000) } })]
  const balances = [balanceSchema.parse({ ...base(), date: '2026-08-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(40000) })]
  const fleet = computeFleet({ settings, transactions, months, balances, goals: [goal], loans: [lent], containers: [rent, fee], now: o.now ?? '2026-10-10T12:00:00+02:00' })
  expect(layersSum(fleet)).toBe(fleet.total)
  const brief = debriefing(month, { transactions, categories: settings.categories, plans: months, log: fleet.log, alarms: fleet.alarms, containers: [rent, fee], today: fleet.today })
  const fuel = fuelSummary(transactions, fleet.incomeContext, month, fleet.historyMonths, fleet.today).month!
  const ops = transactionsOfMonth(transactions, month).filter((t) => t.date <= fleet.today)
  const cats = categoryIndex(settings.categories)
  const money = monthFlows({ brief, fuel, outside: outsideMoney(ops, month, fleet.incomeContext, brief.financed), label: (id) => cats.label(id) })
  return { brief, fuel, money, energy: energyFlows(brief) }
}

const value = (f: Flows, from: string, to?: string) => f.links.filter((l) => l.from === from && (to == null || l.to === to)).reduce((a, l) => a + l.value, 0)
const node = (f: Flows, id: string) => f.nodes.find((n) => n.id === id)

function balanced(f: Flows) {
  const v = nodeValues(f)
  for (const n of f.nodes) {
    const x = v.get(n.id)!
    if (n.column === 0) expect(x.in, n.id).toBe(0)
    else if (n.column === 2) expect(x.out, n.id).toBe(0)
    else expect(x.in, n.id).toBe(x.out)
  }
  for (const l of f.links) expect(l.value, `${l.from}>${l.to}`).toBeGreaterThan(0)
  const sources = f.links.filter((l) => node(f, l.from)!.column === 0).reduce((a, l) => a + l.value, 0)
  expect(sources).toBe(f.total)
}

/** No two bands cross between two neighbouring columns: their order at one column is their order at the next. */
function noCrossing(l: SankeyLayout) {
  for (let c = 0; c < l.columns.length - 1; c++) {
    const at = (x: number) => Math.abs(x - l.columns[c]!) < l.bar + 1 || Math.abs(x - (l.columns[c]! + l.bar / 2)) < 1
    const next = (x: number) => Math.abs(x - l.columns[c + 1]!) < l.bar + 1
    const spans = l.links.flatMap((k) => {
      const i = k.points.findIndex((p) => at(p.x))
      const j = k.points.findIndex((p, n) => n > i && next(p.x))
      return i >= 0 && j === i + 1 ? [{ a: k.points[i]!.y, b: k.points[j]!.y, id: `${k.from}>${k.to}` }] : []
    })
    for (const s of spans) for (const t of spans) if (s.a < t.a) expect(s.b, `${s.id} / ${t.id}`).toBeLessThanOrEqual(t.b)
  }
}

describe('przegląd R2: kolejność i węzły Sankeya (pkt 3, 6, 9)', () => {
  const month = [
    tx('2026-09-02', zl(3000), { kind: 'income', counterparty: 'FIRMA' }),
    tx('2026-09-04', zl(-2000), { categoryId: CATS[0] }),
    tx('2026-09-05', zl(-1000), { categoryId: CATS[2] }),
    tx('2026-09-15', zl(-500), { containerId: rent.id, categoryId: CATS[2] }),
    tx('2026-09-06', zl(-300), { categoryId: CATS[0], goalId: goal.id }),
    tx('2026-09-07', zl(-200), { categoryId: CATS[0], refundable: true, memberId: HOUSE_MEMBER_ID }),
    tx('2026-09-03', zl(-10000), { kind: 'loan', loanId: lent.id }),
    tx('2026-09-20', zl(400), { kind: 'loan', loanId: lent.id }),
    tx('2026-09-21', zl(-700), { kind: 'transfer', counterAccountId: null }),
    tx('2026-09-22', zl(150), { kind: 'income', memberId: HOUSE_MEMBER_ID, counterparty: 'MAMA' })
  ]

  it('pkt 6: deficyt 500 zł + pożyczka 10 000 zł – czerwony węzeł „Z osłon i kadłuba” = 500 zł; pożyczka z własnego źródła pod nagłówkiem', () => {
    const { money, fuel } = flowsOf(month)
    expect(fuel.balance).toBe(-zl(500))
    balanced(money)
    expect(value(money, 'reserve')).toBe(zl(500))
    expect(value(money, 'reserve', MONTH_NODE)).toBe(zl(500))
    expect(node(money, 'reserve')).toMatchObject({ tone: 'down' })
    expect(node(money, 'reserve')!.group).toBeUndefined()
    // The outflows outside the income and the costs: their own source, never red, under the heading.
    expect(value(money, 'reserve-out', 'loans-out')).toBe(zl(10000))
    expect(value(money, 'reserve-out', 'transfers-out')).toBe(zl(700))
    expect(node(money, 'reserve-out')).toMatchObject({ group: OUTSIDE_GROUP, label: 'Z osłon i kadłuba' })
    expect(node(money, 'reserve-out')!.tone).toBeUndefined()
  })

  it('pkt 3: w kolumnach najpierw przepływy miesiąca (Ładownia, okręt), potem „Poza przychodem i kosztami”; wstęgi się nie krzyżują', () => {
    const surplus = flowsOf([...month, tx('2026-09-25', zl(5000), { kind: 'income', counterparty: 'PREMIA' })]).money
    for (const f of [flowsOf(month).money, surplus]) {
      const l = sankeyLayout(f, { width: 900, left: 240, right: 260 })
      for (const c of [0, 2]) {
        const col = l.nodes.filter((n) => n.column === c)
        const own = col.filter((n) => n.group !== OUTSIDE_GROUP)
        const outside = col.filter((n) => n.group === OUTSIDE_GROUP)
        expect(outside.length, `kolumna ${c}`).toBeGreaterThan(0)
        for (const x of outside) for (const y of own) expect(x.y0, `${x.id} pod ${y.id}`).toBeGreaterThan(y.y1)
      }
      expect(l.nodes.find((n) => n.id === 'cargo')).toBeDefined()
      noCrossing(l)
    }
    expect(node(surplus, 'ship')).toBeDefined()
  })

  it('pkt 9: „Dostawy z ICTTJ (netto)” – gdy w miesiącu były dopłaty, kwota = trading netto Bilansu paliwa', () => {
    const net = flowsOf([tx('2026-09-03', zl(2000), { kind: 'trading', counterparty: 'XTB' }), tx('2026-09-10', zl(-500), { kind: 'trading', counterparty: 'XTB' }), tx('2026-09-04', zl(-100), { categoryId: CATS[0] })])
    expect(node(net.money, 'trading')!.label).toBe('Dostawy z ICTTJ (netto)')
    expect(value(net.money, 'trading')).toBe(net.fuel.trading)
    expect(net.fuel.trading).toBe(zl(1500))
    const plain = flowsOf([tx('2026-09-03', zl(2000), { kind: 'trading', counterparty: 'XTB' })])
    expect(node(plain.money, 'trading')!.label).toBe('Dostawy z ICTTJ')
    // More top-ups than withdrawals: no delivery, the rest beyond them from the shields under the heading.
    const over = flowsOf([tx('2026-09-03', zl(500), { kind: 'trading', counterparty: 'XTB' }), tx('2026-09-10', zl(-2000), { kind: 'trading', counterparty: 'XTB' })])
    expect(node(over.money, 'trading')).toBeUndefined()
    expect(value(over.money, 'reserve-out', 'xtb')).toBe(zl(1500))
  })
})

describe('przegląd R2: energia zawsze zbilansowana (pkt 7)', () => {
  const brief = (energy: NonNullable<Debriefing['energy']>, ended = true) => ({ energy, ended }) as unknown as Debriefing
  const e = (o: { salary: number; loot?: number; sinking?: number; rates?: number; used: number }) => {
    const budget = o.salary - (o.sinking ?? 0) - (o.rates ?? 0) + (o.loot ?? 0)
    return { salary: o.salary, sinking: o.sinking ?? 0, rates: o.rates ?? 0, loot: o.loot ?? 0, budget, used: o.used, exhausted: 0, result: budget - o.used }
  }

  it('zwroty ponad wydatki (wydane poniżej zera): źródło, „Zostało” = wynik, węzeł zbilansowany', () => {
    const f = energyFlows(brief(e({ salary: zl(3000), used: -zl(200) })))!
    balanced(f)
    expect(value(f, 'energy', 'left')).toBe(zl(3200))
    expect(value(f, 'used-back', 'energy')).toBe(zl(200))
    expect(node(f, 'used')).toBeUndefined()
  })

  it('każda część ujemna po swojej stronie – losowe energie zawsze zbilansowane, sumy = energia debriefingu', () => {
    const rnd = rng(7)
    for (let i = 0; i < 300; i++) {
      const pick = () => Math.round((rnd() * 2 - 0.6) * zl(3000))
      const x = e({ salary: Math.max(0, pick()), loot: Math.max(0, pick()), sinking: pick(), rates: pick(), used: pick() })
      const f = energyFlows(brief(x))
      if (!f) continue
      balanced(f)
      const ins = sumBy(f.links.filter((l) => l.to === 'energy'))
      const outs = sumBy(f.links.filter((l) => l.from === 'energy'))
      expect(ins).toBe(outs)
      // salary + loot = sinking + rates + used + result, whatever the signs.
      const backs = value(f, 'sinking-back') + value(f, 'rates-back') + value(f, 'used-back') + value(f, 'over')
      expect(value(f, 'salary') + value(f, 'loot') - value(f, 'energy', 'sinking') - value(f, 'energy', 'rates') - value(f, 'energy', 'used') - value(f, 'energy', 'left') + backs).toBe(0)
      expect(x.salary + x.loot).toBe(x.sinking + x.rates + x.used + x.result)
    }
  })
})

describe('przegląd R2: losowe miesiące – każdy węzeł zbilansowany, sumy = debriefing i Bilans paliwa (T490)', () => {
  it('40 losowych miesięcy (zakończone i w toku)', () => {
    const rnd = rng(46)
    const amount = (max: number) => zl(Math.round(rnd() * max * 100) / 100 + 0.01)
    for (let n = 0; n < 40; n++) {
      const ops: Transaction[] = []
      const count = 4 + Math.floor(rnd() * 20)
      for (let i = 0; i < count; i++) {
        const date = `2026-09-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`
        const cat = CATS[Math.floor(rnd() * CATS.length)]
        const r = rnd()
        if (r < 0.35) ops.push(tx(date, -amount(400), { categoryId: cat }))
        else if (r < 0.42) ops.push(tx(date, amount(150), { categoryId: cat }))
        else if (r < 0.47) ops.push(tx(date, -amount(300), { categoryId: cat, refundable: true, memberId: HOUSE_MEMBER_ID }))
        else if (r < 0.52) ops.push(tx(date, -amount(300), { categoryId: cat, goalId: goal.id }))
        else if (r < 0.56) ops.push(tx(date, -zl(500), { containerId: rent.id, categoryId: cat }))
        else if (r < 0.66) ops.push(tx(date, amount(4000), { kind: 'income', counterparty: 'FIRMA' }))
        else if (r < 0.71) ops.push(tx(date, amount(400), { kind: 'income', memberId: HOUSE_MEMBER_ID, advance: rnd() < 0.5, counterparty: 'MAMA' }))
        else if (r < 0.78) ops.push(tx(date, (rnd() < 0.6 ? 1 : -1) * amount(2000), { kind: 'trading', counterparty: 'XTB' }))
        else if (r < 0.83) ops.push(tx(date, (rnd() < 0.5 ? 1 : -1) * amount(1000), { kind: 'loan', loanId: lent.id }))
        else if (r < 0.88) ops.push(tx(date, (rnd() < 0.5 ? 1 : -1) * amount(800), { kind: 'transfer', counterAccountId: null }))
        else ops.push(tx(date, -amount(80)))
      }
      const now = rnd() < 0.3 ? '2026-09-18T12:00:00+02:00' : '2026-10-10T12:00:00+02:00'
      const { brief, fuel, money, energy } = flowsOf(ops, { salary: amount(7000), now })
      balanced(money)
      // The costs, the income and the fuel balance to the grosz.
      const costsOut = sumBy(money.links.filter((l) => l.from === MONTH_NODE && l.to !== 'ship'))
      expect(costsOut - value(money, 'returns', MONTH_NODE), `miesiąc ${n}`).toBe(brief.costs)
      expect(value(money, 'work', MONTH_NODE) + value(money, 'trading', MONTH_NODE)).toBe(fuel.income)
      expect(value(money, MONTH_NODE, 'ship') - value(money, 'reserve', MONTH_NODE)).toBe(fuel.balance)
      // The red node is the deficit alone.
      expect(value(money, 'reserve')).toBe(Math.max(0, -fuel.balance))
      if (energy) {
        balanced(energy)
        expect(value(energy, 'salary', 'energy')).toBe(brief.energy!.salary)
      }
      noCrossing(sankeyLayout(money, { width: 900, left: 240, right: 260 }))
    }
  })
})

describe('przegląd R2: PDF, układ raz, ścieżki kwot (pkt 4, 12, 14)', () => {
  const flows: Flows = {
    nodes: [
      { id: 'a', label: 'Przychody', column: 0 },
      { id: MONTH_NODE, label: 'Miesiąc', column: 1 },
      { id: 'b', label: 'Bardzo długa nazwa kategorii, która nie mieści się w miejscu na etykiety po prawej stronie wykresu', column: 2 }
    ],
    links: [
      { from: 'a', to: MONTH_NODE, value: 123456 },
      { from: MONTH_NODE, to: 'b', value: 123456 }
    ],
    total: 123456
  }

  it('pkt 4: długa nazwa w PDF ucięta, kwota zawsze cała', () => {
    const svg = sankeySvg(sankeyLayout(flows, { width: 760, left: 200, right: 180 }), {
      label: (n) => ({ name: n.label, amount: '1 234,56 zł' }),
      heading: (h) => ({ name: h.group, amount: '1 234,56 zł' }),
      colors: { band: '#999', bandOpacity: 0.4, bar: '#555', text: '#111', muted: '#666', up: '#2ebd85', down: '#f6465d', halo: '#fff' }
    })
    expect(svg).toMatch(/Bardzo długa[^<]*… · 1 234,56 zł</)
  })

  it('pkt 12: układ liczony raz dla tych samych przepływów i szerokości', () => {
    const a = layoutOf(flows, 700)
    expect(layoutOf(flows, 700)).toBe(a)
    expect(layoutOf(flows, 800)).not.toBe(a)
    expect(layoutOf({ ...flows }, 700)).not.toBe(a)
  })

  it('pkt 14: kwota w walucie – ta sama reguła ścieżek co kwoty w groszach (pozycje list pominięte)', () => {
    expect(FOREIGN_AMOUNT_FIELDS).toEqual([['foreign', 'amount']])
    expect(isForeignAmountPath(['foreign', 'amount'])).toBe(true)
    expect(isForeignAmountPath(['#01K9', 'foreign', 'amount'])).toBe(true)
    expect(isForeignAmountPath(['foreign'])).toBe(false)
    expect(isAmountPath(['foreign', 'amount'])).toBe(false)
  })
})

function sumBy(links: ReadonlyArray<{ value: number }>): number {
  return links.reduce((a, l) => a + l.value, 0)
}

/** A seeded generator (mulberry32): the same random months every run. */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
