import { describe, expect, it } from 'vitest'
import { computeFleet, layersSum, type FleetState } from '@shared/calc/fleet'
import { fuelSummary } from '@shared/calc/fuel'
import { categoryIndex } from '@shared/calc/operations'
import { debriefing, transactionsOfMonth, type Debriefing } from '@shared/calc/plan'
import { energyFlows, monthFlows, MONTH_NODE, nodeValues, OUTSIDE_GROUP, outsideMoney, type Flows } from '@shared/calc/sankey'
import { fitText, sankeyLayout, sankeySvg } from '@shared/sankeyLayout'
import { createDefaultSettings } from '@shared/defaults'
import { reportHtml } from '@shared/export/budget'
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
 * AP-46 (1.17.0, R2 – T490, T491): the Sankey of a month lays out the debriefing's and Bilans paliwa's numbers, never
 * new ones – every node balanced, the costs, the income and the fuel balance to the grosz; the energy as the engine ran it.
 */
const zl = (v: number) => Math.round(v * 100)
const AT = '2026-08-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K9R2S000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })

const FOOD = defaultCategoryId(1)
const GROCERIES = defaultCategoryId(1, 1)
const HOME = defaultCategoryId(2)
const CAR = defaultCategoryId(3)
const SMALL_A = defaultCategoryId(5)
const SMALL_B = defaultCategoryId(6)

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, ...over })

function settingsWith(): Settings {
  const s = createDefaultSettings(AT).settings
  return { ...s, household: { ...s.household, since: '2026-08-01' } }
}

const goal = goalSchema.parse({ ...base(), name: 'Wakacje', target: zl(5000) })
const loan = loanSchema.parse({ ...base(), name: 'Dla Marka', direction: 'given', amount: zl(1000), date: '2026-09-05' })
const rent = containerSchema.parse({ ...base(), name: 'Czynsz', amount: zl(500), dueMonth: '2026-09', dueDay: 15, counterparty: 'WSPÓLNOTA', amountAt: AT })

function world(now: string, extra: Transaction[] = []) {
  const settings = settingsWith()
  const transactions = [
    tx('2026-09-02', zl(9000), { kind: 'income', counterparty: 'FIRMA' }),
    tx('2026-09-03', zl(2000), { kind: 'trading', counterparty: 'XTB' }),
    tx('2026-09-04', zl(-1200), { categoryId: GROCERIES }),
    tx('2026-09-05', zl(-1800), { categoryId: HOME }),
    tx('2026-09-06', zl(-50)),
    // Two tiny categories (below 1 % of the chart): „Pozostałe” of their group.
    tx('2026-09-07', zl(-10), { categoryId: SMALL_A }),
    tx('2026-09-07', zl(-15), { categoryId: SMALL_B }),
    // A return beyond the category's purchases (no purchase of Auto this month): a source.
    tx('2026-09-08', zl(100), { categoryId: CAR }),
    // A purchase a household member finances, one from a goal's money, the cargo's payment.
    tx('2026-09-09', zl(-300), { categoryId: GROCERIES, refundable: true, memberId: HOUSE_MEMBER_ID }),
    tx('2026-09-10', zl(-400), { categoryId: HOME, goalId: goal.id }),
    tx('2026-09-15', zl(-500), { categoryId: HOME, containerId: rent.id, counterparty: 'WSPÓLNOTA' }),
    // A loan given and its part repaid; an own transfer out of the budget; the member's money back.
    tx('2026-09-05', zl(-1000), { kind: 'loan', loanId: loan.id }),
    tx('2026-09-20', zl(300), { kind: 'loan', loanId: loan.id }),
    tx('2026-09-21', zl(-700), { kind: 'transfer', counterAccountId: null }),
    tx('2026-09-22', zl(250), { kind: 'income', memberId: HOUSE_MEMBER_ID, counterparty: 'MAMA' }),
    ...extra
  ]
  const months = [monthPlanSchema.parse({ ...base(), month: '2026-09', salary: zl(6000), envelopes: { [FOOD]: zl(1500), [HOME]: zl(2000) } })]
  const balances = [balanceSchema.parse({ ...base(), date: '2026-08-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(30000) })]
  const fleet = computeFleet({ settings, transactions, months, balances, goals: [goal], loans: [loan], containers: [rent], now })
  expect(layersSum(fleet)).toBe(fleet.total)
  return { settings, transactions, months, fleet }
}

function flowsOf(w: ReturnType<typeof world>, month: string): { brief: Debriefing; flows: Flows; fuel: NonNullable<ReturnType<typeof fuelSummary>['month']>; fleet: FleetState } {
  const { settings, transactions, months, fleet } = w
  const brief = debriefing(month, { transactions, categories: settings.categories, plans: months, log: fleet.log, alarms: fleet.alarms, containers: [rent], today: fleet.today })
  const fuel = fuelSummary(transactions, fleet.incomeContext, month, fleet.historyMonths, fleet.today).month!
  const all = transactionsOfMonth(transactions, month).filter((t) => t.date <= fleet.today)
  const cats = categoryIndex(settings.categories)
  const flows = monthFlows({ brief, fuel, outside: outsideMoney(all, month, fleet.incomeContext, brief.financed), label: (id) => cats.label(id) })
  return { brief, flows, fuel, fleet }
}

const value = (f: Flows, from: string, to: string) => f.links.filter((l) => l.from === from && l.to === to).reduce((a, l) => a + l.value, 0)
const node = (f: Flows, id: string) => f.nodes.find((n) => n.id === id)

function balanced(f: Flows) {
  const v = nodeValues(f)
  for (const n of f.nodes) {
    const x = v.get(n.id)!
    if (n.column === 0) expect(x.in, n.id).toBe(0)
    else if (n.column === 2) expect(x.out, n.id).toBe(0)
    else expect(x.in, n.id).toBe(x.out)
  }
  const sources = f.links.filter((l) => node(f, l.from)!.column === 0).reduce((a, l) => a + l.value, 0)
  const ends = f.links.filter((l) => node(f, l.to)!.column === 2).reduce((a, l) => a + l.value, 0)
  expect(sources).toBe(f.total)
  expect(ends).toBe(f.total)
  for (const l of f.links) expect(l.value).toBeGreaterThan(0)
}

describe('AP-46: Sankey miesiąca – liczby debriefingu i Bilansu paliwa (T490)', () => {
  it('miesiąc zakończony: koszty netto, przychód i bilans paliwa co do grosza; każdy węzeł zbilansowany', () => {
    const { brief, flows, fuel } = flowsOf(world('2026-10-10T12:00:00+02:00'), '2026-09')
    balanced(flows)
    expect(brief.ended).toBe(true)
    // The income: the work and ICTTJ as Bilans paliwa.
    expect(value(flows, 'work', MONTH_NODE) + value(flows, 'trading', MONTH_NODE)).toBe(fuel.income)
    expect(value(flows, 'work', MONTH_NODE)).toBe(fuel.work)
    expect(node(flows, 'work')!.detail).toEqual(['FIRMA · 9 000,00 zł'])
    expect(value(flows, 'trading', MONTH_NODE)).toBe(fuel.trading)
    // The costs: the envelopes' categories and the cargo less the returns beyond the purchases = the debriefing's.
    const out = flows.links.filter((l) => l.from === MONTH_NODE && l.to !== 'ship').reduce((a, l) => a + l.value, 0)
    expect(out - value(flows, 'returns', MONTH_NODE)).toBe(brief.costs)
    expect(fuel.costs).toBe(brief.costs)
    // The fuel balance: what the month added to the ship.
    expect(value(flows, MONTH_NODE, 'ship') - value(flows, 'reserve', MONTH_NODE)).toBe(fuel.balance)
    expect(fuel.balance).toBeGreaterThan(0)
    expect(node(flows, 'ship')).toMatchObject({ label: 'Dołożone do okrętu', tone: 'up' })
    // Each category as the debriefing's row, under its envelope's heading.
    const food = brief.envelopes.find((e) => e.categoryId === FOOD)!
    expect(value(flows, MONTH_NODE, `cat:${FOOD}`)).toBe(food.spent)
    expect(node(flows, `cat:${FOOD}`)).toMatchObject({ group: 'Koperty codzienne', label: 'Jedzenie' })
    expect(node(flows, `cat:${HOME}`)).toMatchObject({ group: 'Koperty planowe' })
    expect(value(flows, MONTH_NODE, 'cat:none')).toBe(brief.uncategorized)
    expect(value(flows, MONTH_NODE, 'cargo')).toBe(brief.cargo)
    expect(brief.cargo).toBe(zl(500))
    // Auto: a return with no purchase – its category's spending below zero is a source, never a band below zero.
    expect(value(flows, 'returns', MONTH_NODE)).toBe(zl(100))
    expect(node(flows, 'returns')!.detail).toEqual(['Auto'])
    // Two categories below 1 % of the chart – „Pozostałe” of their group, with their names.
    const rest = flows.nodes.find((n) => n.label === 'Pozostałe')!
    expect(rest.group).toBe('Bez koperty')
    expect(rest.detail).toHaveLength(2)
    expect(value(flows, MONTH_NODE, rest.id)).toBe(zl(25))
    expect(node(flows, `cat:${SMALL_A}`)).toBeUndefined()
  })

  it('poza przychodem i kosztami: cel, domownicy, pożyczka, przelew – każde od źródła do celu, w nagłówku', () => {
    const { brief, flows } = flowsOf(world('2026-10-10T12:00:00+02:00'), '2026-09')
    expect(value(flows, 'goals', 'goals-spent')).toBe(zl(400))
    expect(value(flows, 'financed', 'members-spent')).toBe(brief.financed.reduce((a, f) => a + f.amount, 0))
    expect(value(flows, 'financed', 'members-spent')).toBe(zl(300))
    expect(value(flows, 'reserve-out', 'loans-out')).toBe(zl(1000))
    expect(value(flows, 'loans-in', 'to-reserve')).toBe(zl(300))
    expect(value(flows, 'reserve-out', 'transfers-out')).toBe(zl(700))
    // The member's 250 zł repays the 300 zł purchase (back to the shields) – not income, not the deposit.
    expect(value(flows, 'members', 'to-reserve')).toBe(zl(250))
    expect(value(flows, 'members', 'deposit')).toBe(0)
    for (const id of ['goals', 'goals-spent', 'financed', 'members-spent', 'loans-out', 'loans-in', 'to-reserve', 'transfers-out', 'members', 'reserve-out']) expect(node(flows, id)!.group, id).toBe(OUTSIDE_GROUP)
    // With a surplus the shields and the hull give the month nothing (przegląd R2 pkt 6: the money outside – its own source).
    expect(node(flows, 'reserve')).toBeUndefined()
  })

  it('koszty ponad przychód: „Z osłon i kadłuba” do miesiąca (na minus) = bilans paliwa; zaliczka domownika do depozytu', () => {
    const big = [tx('2026-09-25', zl(-12000), { categoryId: HOME }), tx('2026-09-26', zl(400), { kind: 'income', memberId: HOUSE_MEMBER_ID, advance: true, counterparty: 'MAMA' })]
    const { flows, fuel } = flowsOf(world('2026-10-10T12:00:00+02:00', big), '2026-09')
    balanced(flows)
    expect(fuel.balance).toBeLessThan(0)
    expect(value(flows, 'reserve', MONTH_NODE)).toBe(-fuel.balance)
    expect(node(flows, 'reserve')).toMatchObject({ tone: 'down' })
    expect(node(flows, 'reserve')!.group).toBeUndefined()
    expect(node(flows, 'ship')).toBeUndefined()
    // 250 + 400 zł of the member: 300 zł repays the purchase, the rest is their advance (the deposit) – „reszta jako zaliczka”.
    expect(value(flows, 'members', 'to-reserve')).toBe(zl(300))
    expect(value(flows, 'members', 'deposit')).toBe(zl(350))
  })

  it('miesiąc w toku: tylko do dziś (AP-36), nazwy „do dziś”; operacja z datą po dziś poza wykresem', () => {
    const later = [tx('2026-09-28', zl(-3000), { categoryId: HOME })]
    const { brief, flows, fuel } = flowsOf(world('2026-09-25T12:00:00+02:00', later), '2026-09')
    balanced(flows)
    expect(brief.ended).toBe(false)
    expect(brief.planned).toBe(zl(3000))
    const out = flows.links.filter((l) => l.from === MONTH_NODE && l.to !== 'ship').reduce((a, l) => a + l.value, 0)
    expect(out - value(flows, 'returns', MONTH_NODE)).toBe(brief.costs)
    expect(value(flows, MONTH_NODE, 'ship') - value(flows, 'reserve', MONTH_NODE)).toBe(fuel.balance)
    expect(node(flows, MONTH_NODE)!.label).toBe('Miesiąc (do dziś)')
    expect(node(flows, 'ship')!.label).toBe('Ponad koszty (do dziś)')
  })

  it('pensja i energia: pensja i łupy = odkładki + raty + wydane + zostało (energia debriefingu); ponad energię – z osłon', () => {
    const { brief } = flowsOf(world('2026-10-10T12:00:00+02:00'), '2026-09')
    const e = brief.energy!
    const flows = energyFlows(brief)!
    balanced(flows)
    expect(value(flows, 'salary', 'energy')).toBe(e.salary)
    expect(value(flows, 'energy', 'used')).toBe(e.used)
    expect(value(flows, 'energy', 'left')).toBe(Math.max(0, e.result))
    expect(flows.total).toBe(e.salary + e.loot + Math.max(0, -e.result))
    // Spent beyond the energy (the shields paid): its source, the result's minus.
    const over = energyFlows({ ...brief, energy: { ...e, used: e.budget + zl(700), result: -zl(700) } })!
    balanced(over)
    expect(value(over, 'over', 'energy')).toBe(zl(700))
    expect(value(over, 'energy', 'left')).toBe(0)
    // No salary paid by the engine – no energy view.
    expect(energyFlows({ ...brief, energy: null })).toBeNull()
  })

  it('składniki „Przychodów z pracy” (detail węzła work): lista transakcji z kwotą incomeParts.work i kontrahentem/tytułem', () => {
    const extra = [
      tx('2026-09-12', zl(1500), { kind: 'income', counterparty: 'ACME', title: 'Premia' }),
      tx('2026-09-14', zl(800), { kind: 'income', counterparty: '', title: 'Zlecenie' }),
      // Member inflow: 250 zł earlier + 250 zł now = 500 zł; 300 zł repays the purchase, 200 zł surplus is work income.
      tx('2026-09-24', zl(250), { kind: 'income', memberId: HOUSE_MEMBER_ID, counterparty: 'MAMA', title: 'Dopłata' }),
      // Loan repayment beyond the remaining 700 zł debt: 700 zł repays the loan, 50 zł interest is work income (T70).
      tx('2026-09-25', zl(750), { kind: 'loan', loanId: loan.id, counterparty: 'Marek' })
    ]
    const { flows, fuel } = flowsOf(world('2026-10-10T12:00:00+02:00', extra), '2026-09')
    balanced(flows)
    expect(fuel.work).toBe(zl(9000 + 1500 + 800 + 200 + 50))
    expect(value(flows, 'work', MONTH_NODE)).toBe(fuel.work)
    expect(node(flows, 'work')!.detail).toEqual([
      'FIRMA · 9 000,00 zł',
      'ACME (Premia) · 1 500,00 zł',
      'Zlecenie · 800,00 zł',
      'MAMA (Dopłata) · 200,00 zł',
      'Marek · 50,00 zł'
    ])
  })
})

describe('AP-46: geometria (T491)', () => {
  it('słupki i wstęgi proporcjonalne do kwot, bez nakładania w kolumnie; wstęga obok miesiąca nie przecina go', () => {
    const { flows } = flowsOf(world('2026-10-10T12:00:00+02:00'), '2026-09')
    const l = sankeyLayout(flows, { width: 900, left: 220, right: 260, bands: 300 })
    const k = 300 / flows.total
    for (const n of l.nodes) expect(n.y1 - n.y0).toBeCloseTo(n.value * k, 6)
    for (const x of l.links) expect(x.width).toBeCloseTo(x.value * k, 6)
    for (const c of [0, 1, 2]) {
      const col = l.nodes.filter((n) => n.column === c).sort((a, b) => a.y0 - b.y0)
      for (let i = 1; i < col.length; i++) expect(col[i]!.y0).toBeGreaterThanOrEqual(col[i - 1]!.y1)
    }
    // The money outside the month passes below the month's node (through an invisible node of its column).
    const month = l.nodes.find((n) => n.id === MONTH_NODE)!
    expect(l.nodes.some((n) => n.id.startsWith('via:'))).toBe(false)
    const loan = l.links.find((x) => x.to === 'loans-out')!
    const ys = [...loan.d.matchAll(/C[\d.]+,[\d.]+ [\d.]+,[\d.]+ ([\d.]+),([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const)
    const atMonth = ys.find(([x]) => Math.abs(x - (month.x0 + 5)) < 0.2)
    expect(atMonth).toBeDefined()
    expect(atMonth![1]).toBeGreaterThanOrEqual(month.y1)
    // The headings: the envelopes' layers and the money outside, each with its nodes' total.
    expect(l.headings.map((h) => [h.column, h.group])).toEqual([
      [0, OUTSIDE_GROUP],
      [2, 'Koperty codzienne'],
      [2, 'Koperty planowe'],
      [2, 'Bez koperty'],
      [2, OUTSIDE_GROUP]
    ])
    const daily = l.headings.find((h) => h.group === 'Koperty codzienne')!
    expect(daily.value).toBe(l.nodes.filter((n) => n.group === 'Koperty codzienne').reduce((a, n) => a + n.value, 0))
    expect(l.height).toBeGreaterThan(300)
  })

  it('SVG do PDF: etykiety z kwotami, znaki specjalne uciekają, długa etykieta ucięta', () => {
    const flows: Flows = {
      nodes: [
        { id: 'a', label: 'Przychody <praca> & "ICTTJ"', column: 0 },
        { id: MONTH_NODE, label: 'Miesiąc', column: 1 },
        { id: 'b', label: 'Bardzo długa nazwa kategorii, która nie mieści się w miejscu na etykiety po prawej stronie wykresu', column: 2 }
      ],
      links: [
        { from: 'a', to: MONTH_NODE, value: 1000 },
        { from: MONTH_NODE, to: 'b', value: 1000 }
      ],
      total: 1000
    }
    const l = sankeyLayout(flows, { width: 760, left: 240, right: 180 })
    const svg = sankeySvg(l, {
      label: (n) => ({ name: n.label, amount: `${n.value / 100} zł` }),
      heading: (h) => ({ name: h.group, amount: '' }),
      colors: { band: '#999', bandOpacity: 0.4, bar: '#555', text: '#111', muted: '#666', up: '#2ebd85', down: '#f6465d', halo: '#fff' }
    })
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('Przychody &lt;praca&gt; &amp; &quot;ICTTJ&quot; · 10 zł')
    expect(svg).not.toContain('<praca>')
    expect(svg).toContain('Bardzo długa nazwa')
    expect(svg).toContain('…')
    expect(fitText('krótka', 100)).toBe('krótka')
    // The debriefing's PDF: the chart in its section, before its lines.
    const html = reportHtml('Debriefing', 'FI', [{ title: 'Skąd i dokąd', svg, lines: [['Koszty', '1,00 zł']] }])
    expect(html).toContain('<h2>Skąd i dokąd</h2><div class="chart"><svg')
    expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('Koszty'))
  })
})
