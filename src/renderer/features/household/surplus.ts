/**
 * The surplus of one transfer repaying several household members (1.19.0, D102): what is beyond what each of them owes
 * – said in the editor's „Nadwyżka” panel and given to a person „as” their income or advance, or to repay a loan given
 * (D100). No change of the format (step 0, `tests/unit/surplus-baseline.test.ts`): a member's part = a line repaying
 * their debt + a line of their surplus with its purpose (`inflowKind`); the sender's surplus – the rest of the amount,
 * as `advance` says; a loan's part – a `loanId` line. A member „pytaj” not answered yet keeps their surplus on the
 * repaying line (counted as income until chosen – asked, as the sender's rest is). Debts first, always (D102).
 * Pure – the editor's, and (step 4) the quick entry's; step 1 moves it to `calc/household.ts`.
 */
import { splitEvenly } from '@shared/calc/operations'
import { newId } from '@shared/ids'
import type { Split } from '@shared/schema'

/** What a person's surplus is: their income or their advance. */
export type SurplusAs = 'income' | 'advance'

export interface SurplusInput {
  amount: number
  payerId: string
  /** The sender's rest as `advance` says (`t.advance`). */
  payerAdvance: boolean
  splits: readonly Split[]
  /** What each owed before this inflow (the ledger before it – `useLedgerBefore`). */
  owed: (memberId: string) => number
  /** A member's surplus by their setting (D80 b): null – „pytaj”, not answered yet. */
  defaultAs: (memberId: string) => SurplusAs | null
}

/** One person of the panel: the sender first, then the members with a part, in the lines' order. */
export interface SurplusPerson {
  memberId: string
  payer: boolean
  /** What they owed before this inflow. */
  owed: number
  /** What the operation repays of it now (their repaying lines – the sender: the rest of the amount). */
  repaid: number
  /** Their share of the surplus. */
  amount: number
  /** null – not chosen (a member „pytaj”: counted as income until chosen), or `mixed`. */
  as: SurplusAs | null
  /**
   * Not one „jako”: a member's surplus lines of both kinds (income and advance); the sender – lines of their own in the
   * split besides the rest (the panel sets the rest only – their lines are changed in the list of parts).
   */
  mixed: boolean
}

export interface SurplusView {
  people: SurplusPerson[]
  /** The parts repaying loans given (D100) – a part of the surplus, apart from the people. */
  loans: number
  /** Beyond what is repaid now: the people's shares and the loans' parts. */
  surplus: number
  /**
   * To split among the people once every debt is repaid in full (D102 – debts first) and the loans' parts kept; below 0
   * – the amount does not cover all the debts.
   */
  free: number
  /** The sender's surplus in the rest of the amount (no line of theirs) – what a loan's line may take of it. */
  payerRest: number
}

const sum = (xs: readonly number[]): number => xs.reduce((a, x) => a + x, 0)
const isLoan = (s: Split): boolean => !!s.loanId
const repays = (s: Split): boolean => !s.inflowKind || s.inflowKind === 'repay'
const linesOf = (splits: readonly Split[], memberId: string): Split[] => splits.filter((s) => !isLoan(s) && s.memberId === memberId)

/** The members with a part of the inflow other than the sender, in the order of their first line. */
function othersOf(splits: readonly Split[], payerId: string): string[] {
  const out: string[] = []
  for (const s of splits) if (!isLoan(s) && s.memberId && s.memberId !== payerId && !out.includes(s.memberId)) out.push(s.memberId)
  return out
}

/** The surplus of an inflow as its lines say it; null – no member's part besides the sender's (nothing to split). */
export function surplusView(input: SurplusInput): SurplusView | null {
  const { amount, payerId, splits, owed, defaultAs } = input
  const others = othersOf(splits, payerId)
  if (!others.length || amount <= 0) return null
  const mine = sum(splits.filter((s) => !isLoan(s) && !s.memberId).map((s) => s.amount))
  const loans = sum(splits.filter(isLoan).map((s) => s.amount))
  const rest = Math.max(0, amount - sum(splits.map((s) => s.amount)))
  // The sender: the rest of the amount (with any line of their own) repays what they owe, the rest as `advance` says.
  const payerLines = linesOf(splits, payerId)
  const payerOwed = Math.max(0, owed(payerId))
  const payerPool = rest + sum(payerLines.filter(repays).map((s) => s.amount))
  const payerRepaid = Math.min(payerOwed, payerPool)
  const payerAs: SurplusAs | null = input.payerAdvance ? 'advance' : defaultAs(payerId) === null ? null : 'income'
  const payerExplicit = sum(payerLines.filter((s) => !repays(s)).map((s) => s.amount))
  const people: SurplusPerson[] = [
    { memberId: payerId, payer: true, owed: payerOwed, repaid: payerRepaid, amount: payerPool - payerRepaid + payerExplicit, as: payerAs, mixed: payerLines.length > 0 }
  ]
  for (const id of others) {
    const lines = linesOf(splits, id)
    const o = Math.max(0, owed(id))
    const toRepay = sum(lines.filter(repays).map((s) => s.amount))
    const repaid = Math.min(o, toRepay)
    const explicit = lines.filter((s) => !repays(s))
    const beyond = toRepay - repaid
    const kinds = new Set([...explicit.map((s) => s.inflowKind), ...(beyond > 0 ? [lines.find(repays)?.advance ? 'advance' : 'income'] : [])])
    const mixed = kinds.size > 1
    const kind = explicit[0]?.inflowKind
    // An explicit line says it; else the repaying line's rest (`advance`) – its income counts as chosen only for a
    // member not „pytaj” (D80 b: asked, not answered beforehand).
    const as: SurplusAs | null = mixed ? null : kind === 'income' || kind === 'advance' ? kind : lines.find(repays)?.advance ? 'advance' : defaultAs(id) === null ? null : 'income'
    people.push({ memberId: id, payer: false, owed: o, repaid, amount: beyond + sum(explicit.map((s) => s.amount)), as, mixed })
  }
  // What the members' shares may take: the amount less mine, the loans', the sender's own lines, every member's debt in
  // full and what the rest of the amount must still repay of the sender's.
  const othersOwed = sum(people.filter((p) => !p.payer).map((p) => p.owed))
  const payerRepayLines = sum(payerLines.filter(repays).map((s) => s.amount))
  const free = amount - mine - loans - sum(payerLines.map((s) => s.amount)) - othersOwed - Math.max(0, payerOwed - payerRepayLines)
  return { people, loans, surplus: sum(people.map((p) => p.amount)) + loans, free, payerRest: Math.max(0, Math.min(rest, payerPool - payerRepaid)) }
}

/** A member's share as the panel sets it (the sender's is the rest – never set). */
export interface SurplusShare {
  amount: number
  as: SurplusAs | null
}

/** The shares as they are now (`surplusView`), each member's – the starting point of a change. */
export const sharesOf = (view: SurplusView): Map<string, SurplusShare> => new Map(view.people.filter((p) => !p.payer).map((p) => [p.memberId, { amount: p.amount, as: p.as }]))

/** „Po równo”: the free surplus in equal parts, the grosze left over – the sender's (the last part, T3). */
export function evenShares(view: SurplusView): Map<string, SurplusShare> {
  const parts = splitEvenly(Math.max(0, view.free), view.people.length)
  return new Map(view.people.filter((p) => !p.payer).map((p, i) => [p.memberId, { amount: parts[i] ?? 0, as: p.as }]))
}

/** „Proporcjonalnie do długów”: the free surplus by what each owed, the grosze left – the sender's; null – nobody owed. */
export function debtShares(view: SurplusView): Map<string, SurplusShare> | null {
  const total = sum(view.people.map((p) => p.owed))
  if (total <= 0) return null
  const free = Math.max(0, view.free)
  return new Map(view.people.filter((p) => !p.payer).map((p) => [p.memberId, { amount: Math.floor((free * p.owed) / total), as: p.as }]))
}

/** The most a member's share may be: the free surplus less the other members' shares (the sender keeps the rest). */
export function shareMax(view: SurplusView, shares: ReadonlyMap<string, SurplusShare>, memberId: string): number {
  let others = 0
  for (const [id, s] of shares) if (id !== memberId) others += s.amount
  return Math.max(0, view.free - others)
}

/**
 * The shares changed (`changed` – only these members' lines are rewritten) fitted into the free surplus with the other
 * members' shares as they are: each cut to what is left, in the people's order. `cut` – who was cut, from how much to
 * how much (said by the panel – AP-15); `raised` – the members whose part is lifted to their whole debt (D102 – debts
 * first: the sender's rest pays for it). The amount not covering every debt – nothing fitted, nothing raised.
 */
export function fitShares(view: SurplusView, changed: ReadonlyMap<string, SurplusShare>): { shares: Map<string, SurplusShare>; cut: Array<{ memberId: string; from: number; to: number }>; raised: string[] } {
  const shares = new Map(changed)
  const cut: Array<{ memberId: string; from: number; to: number }> = []
  if (view.free < 0) return { shares, cut, raised: [] }
  let left = view.free
  for (const p of view.people) if (!p.payer && !changed.has(p.memberId)) left -= p.amount
  for (const p of view.people) {
    const s = shares.get(p.memberId)
    if (p.payer || !s) continue
    const to = Math.max(0, Math.min(s.amount, left))
    if (to < s.amount) cut.push({ memberId: p.memberId, from: s.amount, to })
    shares.set(p.memberId, { ...s, amount: to })
    left -= to
  }
  const raised = view.people.filter((p) => !p.payer && shares.has(p.memberId) && p.repaid < p.owed).map((p) => p.memberId)
  return { shares, cut, raised }
}

/** A line without the keys left `undefined` (the record keeps no `inflowKind: undefined`). */
function clean(s: Split): Split {
  const out: Record<string, unknown> = { ...s }
  for (const k of ['inflowKind', 'loanId']) if (out[k] === undefined) delete out[k]
  return out as Split
}

/**
 * The lines with the shares of the members in `shares` set (debts first – D102; fit them first – `fitShares`): each such
 * member's lines become one repaying all they owed (it keeps its id, note and `advance`) and one of their surplus with
 * its purpose; a member „pytaj” not answered – the surplus stays on the repaying line, counted as income until chosen.
 * A zero line goes, unless it is the member's only one (they stay in the split). The other members' lines, the
 * sender's, mine and the loans' stay as they are, in their places. The amount not covering every debt – what the lines
 * repay stays (a change of „jako” only).
 */
export function writeSurplus(input: SurplusInput, shares: ReadonlyMap<string, SurplusShare>): Split[] {
  const { splits, payerId, owed } = input
  // The amount not covering every debt: a change of „jako” only – what the lines repay stays (never taken silently from
  // the sender's rest).
  const covered = (surplusView(input)?.free ?? 0) >= 0
  const out: Split[] = []
  const done = new Set<string>()
  for (const s of splits) {
    const id = s.memberId
    if (isLoan(s) || !id || id === payerId) {
      out.push(s)
      continue
    }
    if (done.has(id)) continue
    done.add(id)
    const lines = linesOf(splits, id)
    const share = shares.get(id)
    if (!share) {
      out.push(...lines)
      continue
    }
    const asked = share.as === null
    const repayBase = lines.find(repays)
    const extraBase = lines.find((x) => !repays(x))
    const repayLine: Split = {
      ...(repayBase ?? extraBase ?? s),
      // A line turned from the surplus into the repayment keeps its id only when no surplus line takes it.
      id: repayBase?.id ?? (asked || share.amount <= 0 ? (extraBase ?? s).id : newId()),
      memberId: id,
      amount: (covered ? Math.max(0, owed(id)) : Math.min(Math.max(0, owed(id)), sum(lines.filter(repays).map((x) => x.amount)))) + (asked ? share.amount : 0),
      inflowKind: undefined,
      advance: false,
      loanId: undefined
    }
    const extra: Split | null =
      !asked && share.amount > 0
        ? {
            ...(extraBase ?? { id: newId(), categoryId: null, refundable: false, note: '' }),
            id: extraBase && extraBase.id !== repayLine.id ? extraBase.id : newId(),
            memberId: id,
            amount: share.amount,
            inflowKind: share.as ?? undefined,
            advance: share.as === 'advance',
            loanId: undefined
          }
        : null
    if (repayLine.amount > 0 || !extra) out.push(repayLine)
    if (extra) out.push(extra)
  }
  return out.map(clean)
}

/**
 * A person's surplus given to repay a loan given (D100, „jako: spłata pożyczki”): up to what the loan has open; what is
 * beyond it stays the person's. A member's share gets smaller (`writeSurplus`), the sender's – the rest – by itself.
 * `moved` – how much went to the loan (0 – nothing given, the lines as they were).
 */
export function loanPart(input: SurplusInput, view: SurplusView, memberId: string, loan: { id: string; open: number }): { splits: Split[]; moved: number } {
  const person = view.people.find((p) => p.memberId === memberId)
  const moved = person ? Math.max(0, Math.min(person.payer ? view.payerRest : person.amount, loan.open)) : 0
  if (!person || moved <= 0) return { splits: [...input.splits], moved: 0 }
  const line: Split = { id: newId(), amount: moved, categoryId: null, refundable: false, memberId: null, advance: false, loanId: loan.id, note: '' }
  if (person.payer) return { splits: [...input.splits, line], moved }
  const shares = sharesOf(view)
  shares.set(memberId, { amount: person.amount - moved, as: person.as })
  return { splits: [...writeSurplus(input, shares), line], moved }
}
