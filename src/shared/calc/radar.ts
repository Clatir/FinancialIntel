/**
 * The radar (spec, „Ekrany”: 90 days – the salaries, the asteroids, the fixed fees, the expected payments, PIT-38; E6,
 * D72, F1): what comes in the next 90 days, in order – with the planned operations and terms (F16), the containers'
 * ends and the shields after each event that moves them (F27). Pure.
 */
import type { Container, MonthPlan } from '../schema/records'
import { dueIn, type CargoStatus } from './cargoStatus'
import { addDays, addMonths, daysBetween, firstDayOf, monthOf } from './dates'
import { activeIn, amountIn, cyclePosition, dockAmount, monthlyWeight, nextPaymentOf, nextUnpaidOf, type DockTargets, type FleetState } from './fleet'
import { OVERDUE_DAYS, type LoanState } from './loans'
import type { ScheduledDay } from './scheduled'
import type { AwaitedReturn } from './returns'

export const RADAR_DAYS = 90
/** PIT-38 (D58, D72): its deadline on the radar from 1 February, without an amount (the amount is ICTTJ's). */
export const PIT38_DAY = '04-30'
export const PIT38_FROM = '02-01'

export type RadarKind = 'salary' | 'asteroid' | 'fixed' | 'installment' | 'repayment' | 'pit38' | 'plan' | 'end' | 'return'

export interface RadarItem {
  key: string
  date: string
  kind: RadarKind
  name: string
  /** Grosze; null = no amount (PIT-38, a term, a container's end). */
  amount: number | null
  /** Money out of the budget, into it, or a move inside (the salary: shields → energy). */
  direction: 'out' | 'in' | 'inside' | null
  note: string
  /** A container, a loan or a planned one (F16). */
  ref?: string
  /** An installment or a fee already late (3 days and more); a planned one past its day. */
  overdue?: boolean
  /** The account the money goes from or to (F26): the container's, the loan's, the planned one's; none – not known. */
  accountId?: string | null
  /** The shields after it (F27): the salary, a planned operation, a repayment – the events that move them. */
  shieldsAfter?: number
}

/** The PIT-38 deadline this year while it is on the radar (1 February – 30 April), else null. */
export function pit38Deadline(today: string): string | null {
  const md = today.slice(5)
  return md >= PIT38_FROM && md <= PIT38_DAY ? `${today.slice(0, 4)}-${PIT38_DAY}` : null
}

const ORDER: Record<RadarKind, number> = { pit38: 0, salary: 1, installment: 2, repayment: 3, asteroid: 4, fixed: 5, plan: 6, end: 7, return: 8 }

export interface RadarInput {
  today: string
  plans: readonly MonthPlan[]
  containers: readonly Container[]
  tanks: FleetState['tanks']
  loans: readonly LoanState[]
  days?: number
  /** Formats an amount (the hidden amounts mask the notes). */
  money: (grosze: number) => string
  /** The fixed fees of this month (F1, `cargoStatuses`): their state and payment day. */
  cargo?: readonly CargoStatus[]
  /** The purchases awaiting a return (F34, `awaitedReturns`). */
  returns?: readonly AwaitedReturn[]
  /** The planned operations' days (F16, `scheduledWindow`): the open ones are on it. */
  scheduled?: readonly ScheduledDay[]
  /**
   * The shields, the hull and the goals taking money now, with the targets (F27): each event moving the shields says what
   * they hold after it.
   */
  layers?: { shields: number; hull: number; goals: ReadonlyArray<{ id: string; amount: number; target: number }>; targets: DockTargets }
}

/** A container's last payment in its life (its `until`), on or after `today`; null = none left (or no end). */
export function lastPaymentOf(c: Pick<Container, 'until' | 'cycleMonths' | 'dueMonth' | 'dueDay'> & { schedule?: readonly number[] | null }, today: string): string | null {
  if (!c.until) return null
  let due = c.until
  if (c.cycleMonths > 1) {
    const pos = cyclePosition(c, c.until)
    due = pos.dueMonth > c.until ? addMonths(pos.dueMonth, -pos.length) : pos.dueMonth
  }
  const date = dueIn(due, c.dueDay)
  return date >= today ? date : null
}

/** What a planned operation's day says on the radar (F16). */
function planNote(d: ScheduledDay): string {
  if (d.state === 'late') return `po terminie ${-d.days} ${-d.days === 1 ? 'dzień' : 'dni'}`
  return d.scheduled.amount == null ? 'termin' : d.scheduled.yearly ? 'co roku' : ''
}

export function radar(o: RadarInput): RadarItem[] {
  const end = addDays(o.today, o.days ?? RADAR_DAYS)
  const out: RadarItem[] = []
  const plans = [...o.plans].sort((a, b) => a.month.localeCompare(b.month))
  const salaryOf = (m: string) => {
    let found: MonthPlan | null = null
    for (const p of plans) if (p.month <= m) found = p
    return found?.salary ?? null
  }
  // The salary on the 1st of each month ahead (from the shields to the month's energy).
  for (let m = addMonths(monthOf(o.today), 1); firstDayOf(m) <= end; m = addMonths(m, 1)) {
    const salary = salaryOf(m)
    if (salary) out.push({ key: `salary:${m}`, date: firstDayOf(m), kind: 'salary', name: 'Pensja od siebie', amount: salary, direction: 'inside', note: 'z osłon do energii miesiąca' })
  }
  // A periodic fee due this month (F1): its cycle on the payment day of its history – once, below.
  const cycleNow = new Map((o.cargo ?? []).filter((s) => s.cycleMonths > 1).map((s) => [s.containerId, s]))
  // The asteroids: every payment of a periodic fee in the window, during the container's life.
  for (const c of o.containers) {
    if (c.cycleMonths <= 1 || c.archived) continue
    const tankOf = o.tanks.find((t) => t.containerId === c.id)
    const now = cycleNow.get(c.id)
    // A cycle paid already (early – B55) has no asteroid left: the next one.
    for (let date = nextUnpaidOf(c, o.today, tankOf?.paidDue), first = true; date <= end; date = nextPaymentOf(c, addDays(date, 1)), first = false) {
      if (!activeIn(c, date.slice(0, 7)) || (now && date.slice(0, 7) === now.due.slice(0, 7))) continue
      const tank = tankOf?.amount ?? 0
      out.push({ key: `asteroid:${c.id}:${date}`, date, kind: 'asteroid', name: c.name, amount: amountIn(c, date.slice(0, 7)), direction: 'out', note: first ? `w zbiorniku ${o.money(tank)}` : '', ref: c.id })
    }
  }
  // The fixed fees (F1): this month's still to pay – a late one too – and each month's ahead, on its payment day.
  const status = new Map((o.cargo ?? []).map((s) => [s.containerId, s]))
  const thisMonth = monthOf(o.today)
  for (const c of o.containers) {
    if (c.cycleMonths > 1 || c.archived || c.loanId) continue
    const s = status.get(c.id)
    const day = s?.day ?? c.dueDay
    for (let m = thisMonth; firstDayOf(m) <= end; m = addMonths(m, 1)) {
      const date = m === thisMonth && s ? s.due : dueIn(m, day)
      if (date > end || !activeIn(c, m)) continue
      if (m === thisMonth && (!s || s.state === 'paid')) continue
      const late = m === thisMonth && s && date < o.today
      out.push({ key: `fixed:${c.id}:${date}`, date, kind: 'fixed', name: c.name, amount: amountIn(c, m), direction: 'out', note: late && s.importPending ? 'czeka na import' : '', ref: c.id, ...(s && m === thisMonth && s.state === 'overdue' ? { overdue: true } : {}) })
    }
  }
  // The periodic fees due this month, not paid yet – a late one too.
  for (const s of cycleNow.values()) {
    if (s.state === 'paid' || s.due > end) continue
    const tank = o.tanks.find((t) => t.containerId === s.containerId)?.amount ?? 0
    const note = s.due < o.today ? (s.importPending ? 'czeka na import' : '') : `w zbiorniku ${o.money(tank)}`
    out.push({ key: `asteroid:${s.containerId}:${s.due}`, date: s.due, kind: 'asteroid', name: s.name, amount: s.amount, direction: 'out', note, ref: s.containerId, ...(s.state === 'overdue' ? { overdue: true } : {}) })
  }
  // The loans' installments not paid yet: own ones out, the expected repayments in (late ones too).
  for (const s of o.loans) {
    if (s.loan.closedAt) continue
    const taken = s.loan.direction === 'taken'
    for (const inst of s.left) {
      if (inst.date > end) break
      // „Zaległa” as the loans and the briefing say it (N59, D72): from 3 days after the due; before – days past it.
      const days = daysBetween(inst.date, o.today)
      const note = days >= OVERDUE_DAYS ? (taken ? 'zaległa rata' : 'spóźniona spłata') : days > 0 ? `po terminie ${days} ${days === 1 ? 'dzień' : 'dni'}` : s.loan.counterparty
      out.push({
        key: `loan:${s.loan.id}:${inst.date}`,
        date: inst.date,
        kind: taken ? 'installment' : 'repayment',
        name: `${taken ? 'Rata' : 'Spłata'}: ${s.loan.name}`,
        amount: inst.amount,
        direction: taken ? 'out' : 'in',
        note,
        ref: s.loan.id,
        overdue: days >= OVERDUE_DAYS
      })
    }
  }
  const pit = pit38Deadline(o.today)
  if (pit) out.push({ key: `pit38:${pit}`, date: pit, kind: 'pit38', name: 'PIT-38', amount: null, direction: null, note: `rozliczenie za ${Number(pit.slice(0, 4)) - 1} – kwota w ICTTJ` })
  // The planned operations and terms (F16): their days still open in the window – a late one on its day, marked.
  for (const d of o.scheduled ?? []) {
    if (d.state !== 'ahead' && d.state !== 'today' && d.state !== 'late') continue
    if (d.date > end) continue
    const s = d.scheduled
    out.push({
      key: `plan:${s.id}:${d.date}`,
      date: d.date,
      kind: 'plan',
      name: s.name,
      amount: s.amount == null ? null : Math.abs(s.amount),
      direction: s.amount == null ? null : s.amount < 0 ? 'out' : 'in',
      note: planNote(d),
      ref: s.id,
      accountId: s.accountId,
      ...(d.state === 'late' ? { overdue: true } : {})
    })
  }
  // The containers' ends (F16): the last payment of a fee or an installment – the hold is lighter after it.
  for (const c of o.containers) {
    if (c.archived) continue
    const date = lastPaymentOf(c, o.today)
    if (!date || date > end) continue
    const monthly = monthlyWeight(c)
    out.push({ key: `end:${c.id}:${date}`, date, kind: 'end', name: c.name, amount: null, direction: null, note: `ostatnia płatność – potem ładownia lżejsza o ${o.money(monthly)}/mies.`, ref: c.id })
  }
  // The returns on the way (F34 – Turtle Soup „w drodze”): expected money, on its day – a late one today. No account:
  // a return is no certain payment, the balances ahead never count on it.
  for (const r of o.returns ?? []) {
    if (r.state !== 'waiting' && r.state !== 'late') continue
    const date = r.state === 'late' ? o.today : r.until
    if (date > end) continue
    const name = r.tx.counterparty || r.tx.title || 'zakup'
    out.push({
      key: `return:${r.tx.id}`,
      date,
      kind: 'return',
      name: `Zwrot: ${name}`,
      amount: r.amount,
      direction: 'in',
      note: r.state === 'late' ? `nie dotarł – po terminie ${r.days} ${r.days === 1 ? 'dzień' : 'dni'}` : 'w drodze',
      ref: r.tx.id,
      ...(r.state === 'late' ? { overdue: true } : {})
    })
  }
  // The accounts of the payments (F26): the container's, the loan's.
  const containerAccount = new Map(o.containers.map((c) => [c.id, c.accountId]))
  const loanAccount = new Map(o.loans.map((l) => [l.loan.id, l.loan.accountId]))
  for (const i of out) {
    if (i.accountId !== undefined || !i.ref) continue
    if (i.kind === 'fixed' || i.kind === 'asteroid') i.accountId = containerAccount.get(i.ref) ?? null
    else if (i.kind === 'installment' || i.kind === 'repayment') i.accountId = loanAccount.get(i.ref) ?? null
  }
  const sorted = out.sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.kind] - ORDER[b.kind] || a.key.localeCompare(b.key))
  if (o.layers) shieldsLine(sorted, o.layers)
  return sorted
}

/**
 * The shields after each event that moves them (F27), from today's: the salary on the 1st (from the shields, the hull
 * when they lack – D14), a planned expense out of them, a planned income docked (D13: the shields first), a repayment
 * back to them (as the engine counts a loan given). The payments of the cargo and the tanks come from the salary – the
 * shields do not see them; income nobody can date is not counted (a line from today's money alone).
 */
function shieldsLine(items: RadarItem[], layers: NonNullable<RadarInput['layers']>): void {
  let shields = layers.shields
  let hull = layers.hull
  const goals = layers.goals.map((g) => ({ ...g }))
  for (const i of items) {
    if (i.amount == null) continue
    if (i.kind === 'salary') {
      const fromShields = Math.min(i.amount, Math.max(0, shields))
      hull -= Math.min(i.amount - fromShields, Math.max(0, hull))
      shields -= fromShields
    } else if (i.kind === 'plan' && i.direction === 'out') {
      const fromShields = Math.min(i.amount, Math.max(0, shields))
      const fromHull = Math.min(i.amount - fromShields, Math.max(0, hull))
      hull -= fromHull
      shields -= i.amount - fromHull
    } else if (i.kind === 'plan' && i.direction === 'in') {
      const split = dockAmount(i.amount, { shields, hull, goals }, layers.targets)
      shields += split.shields
      hull += split.hull
      for (const g of goals) g.amount += split.goals[g.id] ?? 0
    } else if (i.kind === 'repayment') shields += i.amount
    else continue
    i.shieldsAfter = shields
  }
}
