/**
 * „Skąd i dokąd” – the month's money as a Sankey (1.17.0, AP-46, T490). Nothing is counted anew: the debriefing (the
 * costs by envelope, the cargo, what household members financed, the month's energy as the engine ran it), the fuel
 * balance (the income – the work and the trading net – less the net costs, F25) and the existing parts of an operation
 * (`partsOf`, `incomeParts`, the loans' repayments `loanBacks`, the household's ledger) are only laid out as flows.
 *
 * Two views:
 * - „Przychód i koszty” (`monthFlows`): the income (and, when the costs were above it, the shields and the hull) through
 *   the month to the envelopes by main category, the cargo and what the month added to the ship – the debriefing's costs
 *   and the fuel balance to the grosz; beside them, straight from their source, the money that is neither income nor a
 *   cost (a goal's money, household members' purchases and money, loans, own transfers out of or into the budget, XTB
 *   top-ups beyond the withdrawals);
 * - „Pensja i energia” (`energyFlows`): the salary and the loot given to the month through the energy to the tanks'
 *   installments, the goals' installments, the spending and what is left – the debriefing's energy to the grosz.
 *
 * The month in progress counts up to the budget's day (AP-36), as the debriefing does.
 */
import type { Transaction } from '../schema/records'
import { incomeByMonth, incomeParts, type IncomeContext } from './income'
import { isTwoSided, partsOf, sum } from './operations'
import type { FuelMonth } from './fuel'
import type { Debriefing } from './plan'

export interface FlowNode {
  id: string
  label: string
  /** 0 – where from, 1 – the month (its energy), 2 – where to. */
  column: number
  /** Where to: the layer a purpose belongs to („Koperty codzienne” – its main categories under it). */
  group?: string
  /** An amount on the plus / on the minus (the fuel balance, the energy's result): green / red, as every such amount. */
  tone?: 'up' | 'down'
  /** What a group holds („Pozostałe”, the returns): the names, for the tooltip. */
  detail?: readonly string[]
}

export interface FlowLink {
  from: string
  to: string
  /** Grosze, > 0. */
  value: number
}

export interface Flows {
  nodes: FlowNode[]
  links: FlowLink[]
  /** All the money on the chart: the sum of its sources (the percents' base). */
  total: number
}

/** A stream below this part of all the money on the chart goes to „Pozostałe” of its group (two of them at least). */
export const SMALL_SHARE = 0.01

/** The node of the month („Przychód i koszty”) and of its energy („Pensja i energia”). */
export const MONTH_NODE = 'month'
export const ENERGY_NODE = 'energy'

/** The heading of the money outside the month's income and costs (both sides). */
export const OUTSIDE_GROUP = 'Poza przychodem i kosztami'

/** What of the month's operations is neither income nor a cost (T490): each from the parts the engine and the reports read. */
export interface OutsideMoney {
  /** Purchases paid from a goal's money (my lines, `goalId`; < 0 – returns of such purchases beyond them). */
  goals: number
  /** What household members financed (the debriefing's `financed`; < 0 – returns beyond their purchases). */
  financed: number
  /** Household members' money in that is not income (repaying what they owe, their advances)… */
  members: number
  /** …of it their advances (to their deposit). */
  membersDeposit: number
  /** Loans: money out (lent, a taken loan repaid) and money in (a loan given repaid up to its debt, a loan taken). */
  loansOut: number
  loansIn: number
  /** Own transfers leaving the budget / coming into it (a two-sided one between its accounts moves nothing). */
  transfersOut: number
  transfersIn: number
  /** XTB top-ups beyond the month's withdrawals (the fuel balance counts the trading net, never below zero – N4). */
  topUps: number
  /** The month's XTB top-ups whole (the tax pool's money not – `incomeParts`): the deliveries are their net. */
  topUpsGross: number
}

/**
 * The money of the month's operations (`transactions` – the debriefing's: of the month, up to the budget's day) outside
 * the income and the costs. `ctx` – the engine's income context (`FleetState.incomeContext`): the same parts `incomeParts`
 * leaves out of the income.
 */
export function outsideMoney(transactions: readonly Transaction[], month: string, ctx: IncomeContext, financed: Debriefing['financed']): OutsideMoney {
  let goals = 0
  let members = 0
  let membersDeposit = 0
  let loansOut = 0
  let loansIn = 0
  let transfersOut = 0
  let transfersIn = 0
  let topUpsGross = 0
  // One-sided transfers between the budget's accounts (before 1.7.0 – each side its own operation): their pair cancels out.
  let inside = 0
  for (const t of transactions) {
    if (t.kind === 'trading' && t.amount < 0) topUpsGross -= incomeParts(t, ctx).trading
    if (t.kind === 'expense') {
      // My lines paid from a goal's money (T24 – no cost): the rest of the purchase is the costs' or the household's.
      for (const p of partsOf(t)) if (!p.refundable && p.goalId) goals -= p.amount
    } else if (t.kind === 'income' && t.amount > 0) {
      const own = incomeParts(t, ctx).work
      const loans = sum((ctx.loanBacks?.get(t.id) ?? []).map((x) => x.back))
      loansIn += loans
      // What is neither income, the loans' nor the tax pool's: the household members' money (debts repaid, advances).
      const rest = t.amount - own - loans - (ctx.tax.get(t.id) ?? 0)
      if (rest > 0) {
        members += rest
        membersDeposit += Math.min(rest, sum((ctx.ledger.byTx.get(t.id) ?? []).map((f) => f.advance)))
      }
    } else if (t.kind === 'loan') {
      if (t.amount < 0) loansOut -= t.amount
      // Beyond a given loan's debt it is interest – income (T70): the rest is the loan's money.
      else loansIn += t.amount - incomeParts(t, ctx).work
    } else if (t.kind === 'transfer' && !isTwoSided(t)) {
      if (t.counterAccountId) inside += t.amount
      else if (t.amount < 0) transfersOut -= t.amount
      else transfersIn += t.amount
    }
  }
  if (inside < 0) transfersOut -= inside
  else transfersIn += inside
  const trading = incomeByMonth(transactions, ctx).get(month)?.trading ?? 0
  return { goals, financed: sum(financed.map((f) => f.amount)), members, membersDeposit, loansOut, loansIn, transfersOut, transfersIn, topUps: Math.max(0, -trading), topUpsGross }
}

export interface MonthFlowsInput {
  brief: Debriefing
  /** The month's fuel balance (`fuelSummary(…).month`): its income; null – none. */
  fuel: Pick<FuelMonth, 'work' | 'trading'> | null
  outside: OutsideMoney
  /** A main category's name as the screens write it. */
  label: (categoryId: string) => string
}

/**
 * „Przychód i koszty” (T490): the sources (work, ICTTJ, returns beyond purchases, the shields and the hull when the costs
 * were above the income) → the month → the envelopes (daily, planned, none) by main category, the cargo and what the
 * month added to the ship; the money outside the income and the costs from its source straight to its end. The
 * debriefing's costs = the envelopes + the cargo − the returns; the fuel balance = the ship's part (− the shields' and the
 * hull's).
 */
export function monthFlows(input: MonthFlowsInput): Flows {
  const { brief: b, fuel, outside: o } = input
  const nodes: FlowNode[] = []
  const links: FlowLink[] = []
  const node = (n: FlowNode) => {
    if (!nodes.some((x) => x.id === n.id)) nodes.push(n)
  }
  const link = (from: string, to: string, value: number) => {
    if (value > 0) links.push({ from, to, value })
  }
  const running = !b.ended
  // The costs' parts (the debriefing's rows): a part below zero (returns beyond the purchases) is a source.
  const returned: string[] = []
  let returns = 0
  const groups: Array<{ id: string; label: string; items: Array<{ id: string; label: string; value: number }> }> = [
    { id: 'daily', label: 'Koperty codzienne', items: [] },
    { id: 'planned', label: 'Koperty planowe', items: [] },
    { id: 'outside', label: 'Bez koperty', items: [] }
  ]
  const part = (group: number, id: string, label: string, value: number) => {
    if (value > 0) groups[group]!.items.push({ id, label, value })
    else if (value < 0) {
      returns -= value
      returned.push(label)
    }
  }
  for (const e of b.envelopes) part(e.kind === 'daily' ? 0 : 1, `cat:${e.categoryId}`, input.label(e.categoryId), e.spent)
  for (const x of b.outside) part(2, `cat:${x.categoryId}`, input.label(x.categoryId), x.spent)
  // Without a category – the daily pool's (the debriefing's „Bez kategorii (w puli codziennej)”).
  part(0, 'cat:none', 'Bez kategorii', b.uncategorized)
  if (b.cargo < 0) {
    returns -= b.cargo
    returned.push('Ładownia')
  }
  const work = fuel?.work ?? 0
  const trading = fuel?.trading ?? 0
  // The fuel balance (F25): the income less the debriefing's net costs – Bilans paliwa's, the same operations up to the
  // budget's day; on the plus what the month added to the ship, on the minus what the shields and the hull gave.
  const balance = work + trading - b.costs
  const deficit = Math.max(0, -balance)
  const surplus = Math.max(0, balance)
  // Outside the income and the costs (each from its source to its end once): the chart's whole for the percents.
  const passes = [Math.abs(o.goals), Math.abs(o.financed), o.members, o.loansIn, o.transfersIn, o.loansOut, o.transfersOut, o.topUps]
  const total = work + trading + returns + deficit + sum(passes.map((v) => Math.max(0, v)))
  const small = total * SMALL_SHARE
  if (work) node({ id: 'work', label: 'Przychody z pracy', column: 0 })
  // Bilans paliwa's trading net (R2 review, item 9): „netto” when the month topped XTB up.
  if (trading) node({ id: 'trading', label: o.topUpsGross ? 'Dostawy z ICTTJ (netto)' : 'Dostawy z ICTTJ', column: 0 })
  if (returns) node({ id: 'returns', label: 'Zwroty ponad zakupy', column: 0, detail: returned })
  if (deficit) node({ id: 'reserve', label: 'Z osłon i kadłuba', column: 0, tone: 'down' })
  if (work + trading + returns + deficit) node({ id: MONTH_NODE, label: running ? 'Miesiąc (do dziś)' : 'Miesiąc', column: 1 })
  link('work', MONTH_NODE, work)
  link('trading', MONTH_NODE, trading)
  link('returns', MONTH_NODE, returns)
  link('reserve', MONTH_NODE, deficit)
  // The costs by envelope (the layer – a heading) and main category; the categories of a tiny part („pozostałe”)
  // together, two at least.
  for (const g of groups) {
    const items = [...g.items].sort((a, c) => c.value - a.value || a.label.localeCompare(c.label, 'pl'))
    const tiny = items.filter((x) => x.value < small)
    const shown = tiny.length >= 2 ? items.filter((x) => x.value >= small) : items
    for (const x of shown) {
      node({ id: x.id, label: x.label, column: 2, group: g.label })
      link(MONTH_NODE, x.id, x.value)
    }
    if (tiny.length >= 2) {
      const id = `${g.id}:rest`
      node({ id, label: 'Pozostałe', column: 2, group: g.label, detail: tiny.map((x) => x.label) })
      link(MONTH_NODE, id, sum(tiny.map((x) => x.value)))
    }
  }
  if (b.cargo > 0) {
    node({ id: 'cargo', label: 'Ładownia', column: 2 })
    link(MONTH_NODE, 'cargo', b.cargo)
  }
  if (surplus) {
    node({ id: 'ship', label: running ? 'Ponad koszty (do dziś)' : 'Dołożone do okrętu', column: 2, tone: 'up' })
    link(MONTH_NODE, 'ship', surplus)
  }
  // Outside the income and the costs: from its source straight to its end (the layout passes the month by), under their
  // own heading on both sides – the shields' and the hull's money for them its own source (R2 review, item 6): the red
  // „Z osłon i kadłuba” of the month is its deficit alone, as Bilans paliwa.
  const pass = (from: FlowNode, to: FlowNode, value: number) => {
    if (value <= 0) return
    node({ ...from, group: OUTSIDE_GROUP })
    node({ ...to, group: OUTSIDE_GROUP })
    link(from.id, to.id, value)
  }
  const RESERVE: FlowNode = { id: 'reserve-out', label: 'Z osłon i kadłuba', column: 0 }
  const TO_RESERVE: FlowNode = { id: 'to-reserve', label: 'Do osłon i kadłuba', column: 2 }
  const MEMBERS: FlowNode = { id: 'members', label: 'Wpłaty domowników', column: 0 }
  pass({ id: 'goals', label: 'Ze środków celów', column: 0 }, { id: 'goals-spent', label: 'Zakupy ze środków celów', column: 2 }, o.goals)
  pass({ id: 'goals-back', label: 'Zwroty zakupów ze środków celów', column: 0 }, { id: 'to-goals', label: 'Do celów', column: 2 }, -o.goals)
  pass({ id: 'financed', label: 'Domownicy (ich część zakupów)', column: 0 }, { id: 'members-spent', label: 'Zakupy domowników', column: 2 }, o.financed)
  pass({ id: 'financed-back', label: 'Zwroty zakupów domowników', column: 0 }, { id: 'members-back', label: 'Domownicy (zwroty)', column: 2 }, -o.financed)
  pass(MEMBERS, { id: 'deposit', label: 'Depozyt domowników', column: 2 }, o.membersDeposit)
  pass(MEMBERS, TO_RESERVE, o.members - o.membersDeposit)
  pass({ id: 'loans-in', label: 'Spłaty pożyczek i pożyczki wzięte', column: 0 }, TO_RESERVE, o.loansIn)
  pass({ id: 'transfers-in', label: 'Przelewy własne spoza budżetu', column: 0 }, TO_RESERVE, o.transfersIn)
  pass(RESERVE, { id: 'loans-out', label: 'Pożyczki (udzielone i spłaty wziętych)', column: 2 }, o.loansOut)
  pass(RESERVE, { id: 'transfers-out', label: 'Przelewy własne poza budżet', column: 2 }, o.transfersOut)
  pass(RESERVE, { id: 'xtb', label: 'Dopłaty do XTB (ponad wypłaty)', column: 2 }, o.topUps)
  return { nodes: ordered(nodes), links, total }
}

/**
 * The order in a column (R2 review, item 3): the month's own flows first, the money outside it below them – its sources in
 * the order of their ends, so no two bands cross (the layout keeps the order).
 */
const ORDER = [
  'work',
  'trading',
  'returns',
  'reserve',
  'goals',
  'goals-back',
  'financed',
  'financed-back',
  'members',
  'loans-in',
  'transfers-in',
  'reserve-out',
  MONTH_NODE,
  // The main categories under their envelopes (in the groups' order, the most first).
  'costs',
  'cargo',
  'ship',
  'goals-spent',
  'to-goals',
  'members-spent',
  'members-back',
  'deposit',
  'to-reserve',
  'loans-out',
  'transfers-out',
  'xtb'
]

function ordered(nodes: FlowNode[]): FlowNode[] {
  // An envelope's category – the costs' place; the money outside the month – its own.
  const rank = (n: FlowNode) => {
    const i = ORDER.indexOf(n.group && n.group !== OUTSIDE_GROUP ? 'costs' : n.id)
    return i >= 0 ? i : ORDER.length
  }
  // Stable: the categories keep their groups' order and, in a group, the most first.
  return nodes
    .map((n, i) => ({ n, i }))
    .sort((a, c) => rank(a.n) - rank(c.n) || a.i - c.i)
    .map((x) => x.n)
}

/**
 * „Pensja i energia” (T490): the salary the engine paid and the loot given to the month through its energy to the tanks'
 * installments, the goals' ones, the spending (from the energy and beyond it from the shields – the debriefing's line) and
 * what is left; spent beyond the energy – its source „z osłon”. The debriefing's energy to the grosz: budget = salary −
 * the installments + the loot, result = budget − used. null – the engine paid no salary that month.
 */
export function energyFlows(brief: Debriefing): Flows | null {
  const e = brief.energy
  if (!e) return null
  const running = !brief.ended
  const nodes: FlowNode[] = []
  const links: FlowLink[] = []
  // salary + loot = sinking + rates + used + result (the debriefing's): a part below zero goes to the other side under
  // its own name (R2 review, item 7 – refunds beyond the spending), so the energy's node is always balanced.
  const source = (id: string, label: string, value: number, tone?: 'up' | 'down') => {
    if (value <= 0) return
    nodes.push({ id, label, column: 0, ...(tone ? { tone } : {}) })
    links.push({ from: id, to: ENERGY_NODE, value })
  }
  const end = (id: string, label: string, value: number, tone?: 'up' | 'down') => {
    if (value <= 0) return
    nodes.push({ id, label, column: 2, ...(tone ? { tone } : {}) })
    links.push({ from: ENERGY_NODE, to: id, value })
  }
  source('salary', 'Pensja od siebie', e.salary)
  source('loot', 'Łupy poprzedniego miesiąca', e.loot)
  source('sinking-back', 'Odkładki – zwrot do energii', -e.sinking)
  source('rates-back', 'Raty celów – zwrot do energii', -e.rates)
  source('used-back', 'Zwroty ponad wydatki', -e.used)
  source('over', 'Ponad energię – z osłon', -e.result, 'down')
  const total = sum(links.map((l) => l.value))
  if (!total) return null
  nodes.push({ id: ENERGY_NODE, label: running ? 'Energia miesiąca (do dziś)' : 'Energia miesiąca', column: 1 })
  end('salary-back', 'Pensja – oddana', -e.salary)
  end('loot-back', 'Łupy – oddane', -e.loot)
  end('sinking', 'Odkładki do zbiorników (Ładownia)', e.sinking)
  end('rates', 'Raty celów', e.rates)
  end('used', 'Wydane (z energii i ponad nią)', e.used)
  end('left', running ? 'Zostało (do dziś)' : 'Zostało – łupy', e.result, 'up')
  return { nodes, links, total }
}

/** Each node's money in and out (a node of the chart is balanced – T490; a source has only out, an end only in). */
export function nodeValues(flows: Pick<Flows, 'links'>): Map<string, { in: number; out: number }> {
  const out = new Map<string, { in: number; out: number }>()
  const at = (id: string) => out.get(id) ?? out.set(id, { in: 0, out: 0 }).get(id)!
  for (const l of flows.links) {
    at(l.from).out += l.value
    at(l.to).in += l.value
  }
  return out
}
