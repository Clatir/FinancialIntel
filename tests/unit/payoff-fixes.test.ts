/**
 * Plan spłaty pożyczek – review of R2 (1.17.0, point 2 – T482): the plan's end is decided loan by loan, never by the sum
 * of all balances. A loan the money over the installments still makes less has a payoff date even while another one,
 * whose interest eats that money, grows; „nigdy” only for a loan that money never reaches or never makes less.
 */
import { describe, expect, it } from 'vitest'
import { addMonths, monthOf, monthsBetween } from '@shared/calc/dates'
import { payoff, payoffOrder, principalOf, PAYOFF_MAX_MONTHS, type PayoffDebt, type PayoffInput, type PayoffVariant } from '@shared/calc/payoff'

const zl = (v: number) => Math.round(v * 100)
const debt = (id: string, open: number, installments: Array<[string, number]>, rate: number | null, date = '2026-01-01'): PayoffDebt => ({
  id,
  name: id,
  open,
  installments: installments.map(([d, amount]) => ({ date: d, amount })),
  rate,
  date
})
const offs = (input: PayoffInput, v: PayoffVariant) => Object.fromEntries(payoff(input)[v].debts.map((d) => [d.id, d.paidOff]))

describe('przegląd R2 (2): koniec planu pożyczka po pożyczce (T482)', () => {
  // The review's case: A 100 000 zł at 24 %, B 3 000 zł without a rate, both without a schedule; 1 500 zł a month.
  const A = debt('A', zl(100000), [], 24, '2026-01-01')
  const B = debt('B', zl(3000), [], null, '2026-02-01')
  const input: PayoffInput = { debts: [A, B], month: '2026-11', extra: zl(1500), once: 0 }

  it('kula śnieżna: B spłacona w drugim miesiącu, choć A rośnie (2 000 zł odsetek > 1 500 zł) – tylko A „nigdy”', () => {
    // Nov: A 2 000,00 → 102 000; B 1 500 → 1 500. Dec: A 2 040,00 → 104 040; B 1 500 → paid off. Then A takes the
    // 1 500 zł and its interest is 2 080,80 – never less.
    const p = payoff(input).snowball
    expect(p.months.map((m) => [m.month, m.lines.map((l) => [l.id, l.interest, l.extra, l.balance])])).toEqual([
      ['2026-11', [['A', zl(2000), 0, zl(102000)], ['B', 0, zl(1500), zl(1500)]]],
      ['2026-12', [['A', zl(2040), 0, zl(104040)], ['B', 0, zl(1500), 0]]]
    ])
    expect(offs(input, 'snowball')).toEqual({ A: null, B: '2026-12' })
    expect(p.end).toBeNull()
  })

  it('lawina: całe 1 500 zł idzie na A, której odsetki je zjadają – obie „nigdy” (B nic nie dostaje); bez nadpłat też', () => {
    expect(offs(input, 'avalanche')).toEqual({ A: null, B: null })
    expect(payoff(input).avalanche.months).toHaveLength(1)
    expect(offs(input, 'none')).toEqual({ A: null, B: null })
  })

  it('pożyczka, która czeka w kolejce i rośnie, ale potem pula ją zmniejsza – ma datę (A 1 000 zł przy 24 % po B 2 000 zł)', () => {
    // The avalanche takes B (36 %) first: A waits, its 20 zł of interest a month adds up, then 500 zł a month pays it.
    const A2 = debt('A', zl(1000), [], 24)
    const B2 = debt('B', zl(2000), [], 36)
    const p = payoff({ debts: [A2, B2], month: '2026-11', extra: zl(500), once: 0 }).avalanche
    expect(p.order).toEqual(['B', 'A'])
    // A grows while B is paid (20 zł interest a month < 500 zł): it is reached later and paid off.
    expect(p.debts.every((d) => d.paidOff != null)).toBe(true)
    expect(p.end).not.toBeNull()
  })
})

// ---------------------------------------------------------------- the property on random sets

/** A small deterministic generator (mulberry32): the same sets at every run. */
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

/** A random set of taken loans: some without a schedule, some without a rate, installments before the plan too. */
function randomInput(r: () => number, month: string): PayoffInput {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))
  const debts: PayoffDebt[] = []
  for (let i = 0, n = int(1, 4); i < n; i++) {
    const rate = r() < 0.25 ? null : r() < 0.15 ? 0 : int(50, 3600) / 100
    const scheduled = r() < 0.7
    const open = int(1, 200_000) * 100
    const installments: Array<[string, number]> = []
    if (scheduled) {
      const count = int(1, 24)
      const first = int(-2, 6)
      const each = Math.trunc(open / count)
      for (let k = 0; k < count; k++) installments.push([`${addMonths(month, first + k)}-15`, k < count - 1 ? each : open - each * (count - 1)])
    }
    debts.push(debt(`L${i}`, open, installments, rate, `2026-0${int(1, 9)}-01`))
  }
  return { debts, month, extra: r() < 0.2 ? 0 : int(0, 500_000), once: r() < 0.6 ? 0 : int(0, 2_000_000) }
}

/**
 * The rules of T481–T482 month by month, without any early end – every month up to the plan's horizon: a loan not paid
 * off by then is never. Written apart from `calc/payoff.ts` (its principal and order only are shared).
 */
function reference(input: PayoffInput, variant: PayoffVariant): Record<string, { paidOff: string | null; interest: number; paid: number }> {
  const order = variant === 'none' ? [] : payoffOrder(input.debts, variant)
  const over = variant !== 'none' && input.extra + input.once > 0
  const s = input.debts.map((d) => {
    const dues = new Map<number, number>()
    for (const i of d.installments) {
      const k = Math.max(0, monthsBetween(input.month, monthOf(i.date)))
      dues.set(k, (dues.get(k) ?? 0) + i.amount)
    }
    const bp = d.rate == null ? 0 : Math.round(d.rate * 100)
    const balance = principalOf(d, input.month)
    return { id: d.id, bp, dues, last: dues.size ? Math.max(...dues.keys()) : -1, balance, interest: 0, paid: 0, paidOff: balance <= 0 ? input.month : (null as string | null) }
  })
  for (let k = 0; k < PAYOFF_MAX_MONTHS; k++) {
    const month = addMonths(input.month, k)
    let free = 0
    const open = new Set<string>()
    for (const x of s) {
      const due = x.dues.get(k) ?? 0
      if (x.balance <= 0) {
        free += due
        continue
      }
      open.add(x.id)
      const interest = Math.round((x.balance * x.bp) / 120_000)
      x.balance += interest
      x.interest += interest
      const pay = k === x.last ? x.balance : Math.min(due, x.balance)
      x.balance -= pay
      x.paid += pay
      free += Math.max(0, due - pay)
    }
    let pool = over ? input.extra + (k === 0 ? input.once : 0) + free : 0
    for (const id of order) {
      const x = s.find((y) => y.id === id)!
      if (pool <= 0 || !open.has(id) || x.balance <= 0) continue
      const take = Math.min(pool, x.balance)
      x.balance -= take
      x.paid += take
      pool -= take
    }
    for (const x of s) if (x.balance <= 0 && x.paidOff == null) x.paidOff = month
  }
  return Object.fromEntries(s.map((x) => [x.id, { paidOff: x.balance <= 0 ? x.paidOff : null, interest: x.interest, paid: x.paid }]))
}

describe('przegląd R2 (2): własność – plan kończy się dopiero, gdy żadna pożyczka nie może być już spłacona', () => {
  it('300 losowych zestawów: każda pożyczka, którą pula zmniejsza, ma tę samą datę spłaty co liczenie przez cały horyzont', () => {
    const r = random(41)
    let neverSome = 0
    let paidLate = 0
    for (let n = 0; n < 300; n++) {
      const input = randomInput(r, '2026-11')
      for (const v of ['none', 'avalanche', 'snowball'] as const) {
        const plan = payoff(input)[v]
        const ref = reference(input, v)
        for (const d of plan.debts) {
          expect(d.paidOff, `zestaw ${n}, ${v}, ${d.id}`).toBe(ref[d.id]!.paidOff)
          // A loan paid off: the same money and interest as month by month to the horizon.
          if (d.paidOff) expect([d.interest, d.paid], `zestaw ${n}, ${v}, ${d.id}`).toEqual([ref[d.id]!.interest, ref[d.id]!.paid])
          if (!d.paidOff) neverSome++
          else if (monthsBetween(input.month, d.paidOff) > 30) paidLate++
        }
        expect(plan.end).toBe(plan.debts.every((d) => d.paidOff) ? plan.debts.map((d) => d.paidOff!).sort().at(-1) : null)
      }
    }
    // The sets reach both sides: loans never paid off and loans paid off long after the schedules.
    expect(neverSome).toBeGreaterThan(20)
    expect(paidLate).toBeGreaterThan(5)
  })
})
