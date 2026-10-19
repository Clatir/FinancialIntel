/**
 * A purchase financed by several people in one move (D83): equally, by percents or by amounts, without splitting it into
 * categories. My part is my expense; each member's part goes to their balance – their advance first, the rest the
 * shields lend until they pay it back (D80) – or is their gift (nobody owes it). The engine reads the operation's lines
 * (`splits`: one per person, the operation's category – any version reads them as a split receipt); `share` says how
 * they were made, so a new amount (the editor, a pending row of the bank settling) gives them again. Pure.
 */
import { newId } from '../ids'
import type { Share, ShareLine, ShareMode, Split, Transaction } from '../schema/records'

export const SHARE_MODE_LABEL: Record<ShareMode, string> = { equal: 'równo', percent: 'procenty', amounts: 'kwoty' }

/** Percents are typed with two decimals at most; a sum within this of 100 is 100. */
const PERCENT_EPS = 0.005

/** The percents' sum (`percent` mode): 100 when they cover the whole amount. */
export const percentSum = (share: Pick<Share, 'lines'>): number => Math.round(share.lines.reduce((a, l) => a + l.value, 0) * 100) / 100

/** Does a share split the whole amount as typed (percents summing to 100, amounts not over it)? */
export function shareComplete(share: Share, total: number | null): boolean {
  if (share.mode === 'percent') return Math.abs(percentSum(share) - 100) < PERCENT_EPS
  if (share.mode === 'amounts' && total != null) return paidByOthers(share) <= total
  return true
}

/** The amounts typed for the others (`amounts` mode: my line takes the rest). */
const paidByOthers = (share: Share): number => share.lines.reduce((a, l, i) => a + (takesRest(share, i) ? 0 : Math.round(l.value)), 0)

/** The line that takes the rest of `amounts`: mine, else the last one. */
export function restIndex(share: Pick<Share, 'lines'>): number {
  const mine = share.lines.findIndex((l) => l.memberId == null)
  return mine >= 0 ? mine : share.lines.length - 1
}
const takesRest = (share: Pick<Share, 'lines'>, i: number): boolean => i === restIndex(share)

/** Equal percents of `n` people (two decimals cut), the last one the rest of 100 – as equal amounts give it the rest (T3). */
export function equalPercents(n: number): number[] {
  const each = Math.floor(10000 / n) / 100
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? Math.round((100 - each * (n - 1)) * 100) / 100 : each))
}

/**
 * The lines' amounts (grosze ≥ 0) of `total` (≥ 0): 'equal' – equal parts, the rest in the last one (T3); 'percent' – each
 * its percent rounded, the last one the rest; 'amounts' – each its amount (cut at what is left), my line (else the last)
 * the rest. Always summing to `total`.
 */
export function shareAmounts(total: number, share: Pick<Share, 'mode' | 'lines'>): number[] {
  const n = share.lines.length
  if (!n) return []
  const t = Math.max(0, Math.round(total))
  if (share.mode === 'equal') {
    const base = Math.trunc(t / n)
    return share.lines.map((_, i) => (i < n - 1 ? base : t - base * (n - 1)))
  }
  if (share.mode === 'percent') {
    let left = t
    return share.lines.map((l, i) => {
      if (i === n - 1) return left
      const v = Math.min(left, Math.max(0, Math.round((t * l.value) / 100)))
      left -= v
      return v
    })
  }
  const out = share.lines.map(() => 0)
  let left = t
  const rest = restIndex(share)
  share.lines.forEach((l, i) => {
    if (i === rest) return
    const v = Math.min(left, Math.max(0, Math.round(l.value)))
    out[i] = v
    left -= v
  })
  out[rest] = (out[rest] ?? 0) + left
  return out
}

type Shared = Pick<Transaction, 'amount' | 'categoryId'>

/** The operation's lines for a share (signed like its amount); the ids of `prev` kept by position (a merge per line). */
export function shareSplits(t: Shared, share: Share, prev: readonly Split[] = []): Split[] {
  const sign = t.amount < 0 ? -1 : 1
  const amounts = shareAmounts(Math.abs(t.amount), share)
  return share.lines.map((l, i) => ({
    id: prev[i]?.id ?? newId(),
    amount: sign * amounts[i]! || 0,
    categoryId: t.categoryId,
    refundable: l.memberId != null,
    memberId: l.memberId,
    advance: false,
    ...(l.memberId != null && l.gift ? { gift: true } : {}),
    note: ''
  }))
}

/** The share an operation's lines still follow (null = none, or lines changed apart from it – a split receipt then). */
export function shareOf(t: Pick<Transaction, 'kind' | 'amount' | 'categoryId' | 'splits' | 'share'>): Share | null {
  const share = t.share ?? null
  if (t.kind !== 'expense' || !share || share.lines.length < 2 || t.splits.length !== share.lines.length) return null
  const want = shareSplits(t, share, t.splits)
  for (let i = 0; i < want.length; i++) {
    const a = want[i]!
    const b = t.splits[i]!
    if (a.amount !== b.amount || a.categoryId !== b.categoryId || a.refundable !== b.refundable || (a.memberId ?? null) !== (b.memberId ?? null) || !!a.gift !== !!b.gift) return null
  }
  return share
}

/** The operation financed by these people (its lines made from the share); null = back to one line – my expense. */
export function withShare(t: Transaction, share: Share | null): Transaction {
  if (!share) return { ...t, share: null, splits: [], refundable: false, memberId: null, gift: undefined }
  return { ...t, share, splits: shareSplits(t, share, t.splits), refundable: false, memberId: null, gift: undefined }
}

/**
 * The operation with a new amount typed in the editor: a shared purchase's lines made again; a split receipt's lines keep
 * their amounts and take its sign, as its direction (what they do not cover is the operation's own line – `partsOf`).
 */
export function withAmount(t: Transaction, amount: number): Transaction {
  const share = shareOf(t)
  if (share) return withShare({ ...t, amount }, share)
  const sign = amount < 0 ? -1 : amount > 0 ? 1 : 0
  return { ...t, amount, splits: sign ? t.splits.map((s) => ({ ...s, amount: sign * Math.abs(s.amount) })) : t.splits }
}

/**
 * The operation with the bank's amount (a pending row settled, a manual entry merged with its row, a duplicate merged): a
 * shared purchase's lines made again; a receipt's lines in proportion (B99: a purchase abroad settled at another rate –
 * a member's part stays theirs, nothing left over without a category). An income's parts are what each person gave:
 * the bank's difference is the sender's rest.
 */
export function withBankAmount(t: Transaction, amount: number): Transaction {
  const share = shareOf(t)
  if (share) return withShare({ ...t, amount }, share)
  return t.kind === 'expense' && t.splits.length && amount !== t.amount ? { ...t, amount, splits: scaledSplits(t.splits, t.amount, amount) } : { ...t, amount }
}

/**
 * Lines of `from` for a total of `to`, each in proportion (grosze; what rounding leaves goes to the largest line); lines
 * that did not take the whole amount take the same part of the new one.
 */
export function scaledSplits<T extends { amount: number }>(splits: readonly T[], from: number, to: number): T[] {
  if (!from || from === to) return [...splits]
  const sum = splits.reduce((n, s) => n + s.amount, 0)
  const target = Math.round((sum * to) / from)
  const out = splits.map((s) => ({ ...s, amount: Math.round((s.amount * to) / from) }))
  const left = target - out.reduce((n, s) => n + s.amount, 0)
  if (left && out.length) {
    let at = 0
    for (let i = 1; i < out.length; i++) if (Math.abs(out[i]!.amount) > Math.abs(out[at]!.amount)) at = i
    out[at] = { ...out[at]!, amount: out[at]!.amount + left }
  }
  return out
}

/** Two people – me and the first member – equally: the start of a shared purchase. */
export function startShare(memberId: string, gift = false): Share {
  return { mode: 'equal', lines: [line(null), line(memberId, gift)] }
}

export const line = (memberId: string | null, gift = false, value = 0): ShareLine => ({ memberId, value, gift })

/** A share in another mode: the values that keep the amounts as they are now (percents of `total`, amounts). */
export function changeMode(share: Share, mode: ShareMode, total: number): Share {
  if (mode === share.mode) return share
  const amounts = shareAmounts(total, share)
  if (mode === 'equal') return { mode, lines: share.lines.map((l) => ({ ...l, value: 0 })) }
  if (mode === 'amounts') return { mode, lines: share.lines.map((l, i) => ({ ...l, value: amounts[i]! })) }
  // Percents of the amounts (two decimals), the last one the rest of 100; no amount yet – equal percents.
  const n = share.lines.length
  if (!(total > 0)) {
    const equal = equalPercents(n)
    return { mode, lines: share.lines.map((l, i) => ({ ...l, value: equal[i]! })) }
  }
  const pct = amounts.map((a) => Math.round((a / total) * 10000) / 100)
  const rest = Math.round((100 - pct.slice(0, -1).reduce((a, b) => a + b, 0)) * 100) / 100
  return { mode, lines: share.lines.map((l, i) => ({ ...l, value: i === n - 1 ? rest : pct[i]! })) }
}
