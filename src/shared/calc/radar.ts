/**
 * The radar (spec, „Ekrany”: 90 days – the salaries, the asteroids, the expected payments, PIT-38; E6, D72): what comes
 * in the next 90 days, in order. Pure.
 */
import type { Container, MonthPlan } from '../schema/records'
import { addDays, addMonths, daysBetween, firstDayOf, monthOf } from './dates'
import { activeIn, nextPaymentOf, type FleetState } from './fleet'
import { OVERDUE_DAYS, type LoanState } from './loans'

export const RADAR_DAYS = 90
/** PIT-38 (D58, D72): its deadline on the radar from 1 February, without an amount (the amount is ICTTJ's). */
export const PIT38_DAY = '04-30'
export const PIT38_FROM = '02-01'

export type RadarKind = 'salary' | 'asteroid' | 'installment' | 'repayment' | 'pit38'

export interface RadarItem {
  key: string
  date: string
  kind: RadarKind
  name: string
  /** Grosze; null = no amount (PIT-38). */
  amount: number | null
  /** Money out of the budget, into it, or a move inside (the salary: shields → energy). */
  direction: 'out' | 'in' | 'inside' | null
  note: string
  /** A container or a loan. */
  ref?: string
  /** An installment already late (3 days and more). */
  overdue?: boolean
}

/** The PIT-38 deadline this year while it is on the radar (1 February – 30 April), else null. */
export function pit38Deadline(today: string): string | null {
  const md = today.slice(5)
  return md >= PIT38_FROM && md <= PIT38_DAY ? `${today.slice(0, 4)}-${PIT38_DAY}` : null
}

const ORDER: Record<RadarKind, number> = { pit38: 0, salary: 1, installment: 2, repayment: 3, asteroid: 4 }

export interface RadarInput {
  today: string
  plans: readonly MonthPlan[]
  containers: readonly Container[]
  tanks: FleetState['tanks']
  loans: readonly LoanState[]
  days?: number
  /** Formats an amount (the hidden amounts mask the notes). */
  money: (grosze: number) => string
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
  // The asteroids: every payment of a periodic fee in the window, during the container's life.
  for (const c of o.containers) {
    if (c.cycleMonths <= 1 || c.archived) continue
    for (let date = nextPaymentOf(c, o.today), first = true; date <= end; date = nextPaymentOf(c, addDays(date, 1)), first = false) {
      if (!activeIn(c, date.slice(0, 7))) continue
      const tank = o.tanks.find((t) => t.containerId === c.id)?.amount ?? 0
      out.push({ key: `asteroid:${c.id}:${date}`, date, kind: 'asteroid', name: c.name, amount: c.amount, direction: 'out', note: first ? `w zbiorniku ${o.money(tank)}` : '', ref: c.id })
    }
  }
  // The loans' installments not paid yet: own ones out, the expected repayments in (late ones too).
  for (const s of o.loans) {
    if (s.loan.closedAt) continue
    const taken = s.loan.direction === 'taken'
    for (const inst of s.left) {
      if (inst.date > end) break
      const late = inst.date < o.today
      out.push({
        key: `loan:${s.loan.id}:${inst.date}`,
        date: inst.date,
        kind: taken ? 'installment' : 'repayment',
        name: `${taken ? 'Rata' : 'Spłata'}: ${s.loan.name}`,
        amount: inst.amount,
        direction: taken ? 'out' : 'in',
        note: late ? (taken ? 'zaległa' : 'spóźniona') : s.loan.counterparty,
        ref: s.loan.id,
        overdue: daysBetween(inst.date, o.today) >= OVERDUE_DAYS
      })
    }
  }
  const pit = pit38Deadline(o.today)
  if (pit) out.push({ key: `pit38:${pit}`, date: pit, kind: 'pit38', name: 'PIT-38', amount: null, direction: null, note: `rozliczenie za ${Number(pit.slice(0, 4)) - 1} – kwota w ICTTJ` })
  return out.sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.kind] - ORDER[b.kind] || a.key.localeCompare(b.key))
}
