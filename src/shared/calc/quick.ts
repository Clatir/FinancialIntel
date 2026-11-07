/** The quick entry's templates (F7): what „Powtórz ostatni” and the template buttons fill. Pure. */
import type { QuickTemplate } from '../api'
import { counterpartyKey } from '../import/names'
import type { Scheduled, Transaction } from '../schema/records'
import { CASH_REPAY_TITLE, memberPartLines, type MemberPartLine, type SurplusAs, type SurplusInput } from './household'

/**
 * The rest of a household member's money beyond what they owe, still to be called income or their advance (D80 b, AP-19 –
 * SW sp. 3, T439): a member „pytaj” is asked – no answer is given beforehand, so the quick entry does not save until
 * it is chosen; 0 – nothing to ask (an answer remembered, chosen in the window, or all of it repays what they owe).
 */
export function restToChoose(amount: number, member: { owed: number; inflow: string } | undefined, chosen: boolean): number {
  if (!member || member.inflow !== 'ask' || chosen) return 0
  return Math.max(0, amount - Math.max(0, member.owed))
}

/**
 * The sender's own part of a member's inflow in the quick entry (D81, D100): the amount less the others' parts in it
 * („w tym za …” – `shares`) and the part repaying a loan (`loan`) – as the operation's lines save it. What they owe comes
 * out of it first, a member „pytaj” chooses what is left (`restToChoose`). Below 0 – the parts are over the amount.
 */
export function senderOwn(amount: number, senderId: string, members: ReadonlyArray<{ id: string; via?: string | null }>, shares: Readonly<Record<string, number>>, loan: number): number {
  return amount - members.filter((m) => m.via === senderId).reduce((a, m) => a + Math.max(0, shares[m.id] ?? 0), 0) - Math.max(0, loan)
}

/** A member as the quick entry knows them (`QuickData.members`). */
type QuickMember = { id: string; owed: number; inflow: string }
/** A member's surplus „as” chosen in the quick entry's „W tym za” (D102). */
export type QuickShareAs = Readonly<Record<string, { as: SurplusAs; chosen: boolean } | undefined>>

/** A member's surplus „as” in the quick entry: chosen in the window, else their setting (D80 b); null – „pytaj”. */
export function quickShareAs(m: QuickMember, chosen: QuickShareAs): SurplusAs | null {
  return chosen[m.id]?.as ?? (m.inflow === 'ask' ? null : m.inflow === 'advance' ? 'advance' : 'income')
}

/**
 * The quick entry's „W tym za” as the split of 1.19.0 sees it (D102, `surplusView`): a line of each member passing money
 * through the sender – their part typed, else their whole debt (what „po równo” and „proporcjonalnie do długów” start
 * from) – with `advance` of their surplus „as” (T521: a member „zaliczka” by their setting keeps it through „po równo”),
 * and the part repaying a loan when its amount is typed (`loan` – one not typed takes what the others leave, after the
 * split). null – nothing to split (not a member's inflow, nobody through them).
 */
export function quickSurplusInput(
  q: { amount: number; payerId: string | null; payerAdvance: boolean; loan: { id: string; amount: number } | null },
  through: readonly QuickMember[],
  members: readonly QuickMember[],
  shares: Readonly<Record<string, number>>,
  chosen: QuickShareAs
): SurplusInput | null {
  if (!q.payerId || !through.length || q.amount <= 0) return null
  const line = { categoryId: null, refundable: false, note: '' }
  return {
    amount: q.amount,
    payerId: q.payerId,
    payerAdvance: q.payerAdvance,
    splits: [
      ...through.map((m) => ({ ...line, id: m.id, amount: shares[m.id] ?? Math.max(0, m.owed), memberId: m.id, advance: quickShareAs(m, chosen) === 'advance' })),
      ...(q.loan && q.loan.amount > 0 ? [{ ...line, id: `loan:${q.loan.id}`, amount: q.loan.amount, memberId: null, advance: false, loanId: q.loan.id }] : [])
    ],
    owed: (id) => members.find((m) => m.id === id)?.owed ?? 0,
    defaultAs: (id) => {
      const m = members.find((x) => x.id === id)
      return m ? quickShareAs(m, chosen) : 'income'
    }
  }
}

/**
 * The quick entry's „W tym za” parts as saved (D81, D102 – `memberPartLines`): each member's debt repaid first, what is
 * beyond it their surplus with its „as” – remembered for a member „pytaj” when chosen in the window (`advanceChosen`).
 */
export function quickPartLines(through: readonly QuickMember[], shares: Readonly<Record<string, number>>, chosen: QuickShareAs): Array<MemberPartLine & { memberId: string; advanceChosen: boolean }> {
  return through.flatMap((m) => memberPartLines(shares[m.id] ?? 0, m.owed, quickShareAs(m, chosen)).map((l) => ({ memberId: m.id, ...l, advanceChosen: !!chosen[m.id]?.chosen })))
}

/** The templates a pair keeps (F7): the latest ones, newest first. */
export const QUICK_TEMPLATES = 5

type Templates = { last: QuickTemplate | null; templates: QuickTemplate[] }
const recentMemo = new WeakMap<readonly Transaction[], Templates>()

/** Typed later (the id breaks a tie). */
const newer = (a: Transaction, b: Transaction) => a.createdAt > b.createdAt || (a.createdAt === b.createdAt && a.id > b.id)

const templateOf = (t: Transaction): QuickTemplate => ({
  kind: t.kind === 'income' ? 'income' : t.refundable ? 'refundable' : 'expense',
  amount: Math.abs(t.amount),
  counterparty: t.counterparty,
  categoryId: t.kind === 'income' ? null : t.categoryId,
  accountId: t.accountId,
  // Whose money it was, as the quick entry writes it (D80, D83): a member's purchase or gift, a member's income.
  memberId: t.refundable || t.kind === 'income' ? t.memberId : null,
  gift: !!t.refundable && !!t.gift,
  advance: t.kind === 'income' && !!t.memberId && t.advance
})

const NO_IDS: ReadonlySet<string> = new Set()

/**
 * An operation the user typed (AP-20, SW sp. 8 – T441): a purchase or an income of the quick entry or the editor, with its
 * amount. No record says who made it, so the ones the app writes itself are told by their kind and known fields: the
 * bank's (`bank` – an import, a hand-typed one joined with its row too); a balance's correction, the Portfel XTB
 * operation of a docking, a transfer („Zaplanuj przelew własny”, a join), a loan's operations and a tax – not a purchase
 * nor an income (`correction`, `trading`, `transfer`, `loan`, `tax`); a cargo payment („Zapłacone”, a loan's installment –
 * `containerId`); a member's repayment in cash (`CASH_REPAY_TITLE`); a buoy's „Wykonaj teraz” (`byBuoy` – the operations
 * of the buoys' days done). An empty draft says nothing either.
 */
export function typedByHand(t: Transaction, byBuoy: ReadonlySet<string> = NO_IDS): boolean {
  if (t.bank || t.amount === 0 || (t.kind !== 'expense' && t.kind !== 'income') || t.containerId != null) return false
  if (t.kind === 'income' && t.title.startsWith(CASH_REPAY_TITLE)) return false
  return !byBuoy.has(t.id)
}

type BuoyDays = Pick<Scheduled, 'done'>
const NO_BUOYS: readonly BuoyDays[] = []
const accountMemo = new WeakMap<readonly Transaction[], { scheduled: readonly BuoyDays[]; newest: ReadonlyMap<string, Transaction> }>()

/** Each account's operation typed by hand latest (`typedByHand`) – once per list of operations and of buoys. */
function newestTypedOf(transactions: readonly Transaction[], scheduled: readonly BuoyDays[]): ReadonlyMap<string, Transaction> {
  const hit = accountMemo.get(transactions)
  if (hit && hit.scheduled === scheduled) return hit.newest
  const byBuoy = new Set<string>()
  for (const b of scheduled) for (const id of Object.values(b.done)) if (id) byBuoy.add(id)
  const newest = new Map<string, Transaction>()
  for (const t of transactions) {
    if (!typedByHand(t, byBuoy)) continue
    const was = newest.get(t.accountId)
    if (!was || newer(t, was)) newest.set(t.accountId, t)
  }
  accountMemo.set(transactions, { scheduled, newest })
  return newest
}

/**
 * The account used last in the folder (AP-20, AP-28, SW sp. 8): the account of the operation typed by hand latest
 * (`typedByHand`; its creation – on any computer of the folder), so the second computer and a new one propose it too.
 * `scheduled` – the buoys, whose „Wykonaj teraz” operations do not count; `open` – the accounts still open (one closed
 * since – the latest of the open ones). null – none typed.
 */
export function lastAccountOf(transactions: readonly Transaction[], scheduled: readonly BuoyDays[] = NO_BUOYS, open?: ReadonlySet<string>): string | null {
  let last: Transaction | null = null
  for (const [id, t] of newestTypedOf(transactions, scheduled)) if ((!open || open.has(id)) && (!last || newer(t, last))) last = t
  return last?.accountId ?? null
}

/**
 * The operations typed by hand (F7): the last one („Powtórz ostatni”) and the latest counterparty + category pairs of
 * purchases (the templates), newest first. One line only – a split receipt or a shared purchase is no template. One pass
 * over the list, without sorting the history (150 tys. operacji): the newest of each pair, then the pairs sorted.
 */
export function quickTemplates(transactions: readonly Transaction[]): Templates {
  let found = recentMemo.get(transactions)
  if (found) return found
  let last: Transaction | null = null
  const pairs = new Map<string, Transaction>()
  for (const t of transactions) {
    if (t.bank || t.splits.length || (t.kind !== 'expense' && t.kind !== 'income') || t.amount === 0) continue
    if (!last || newer(t, last)) last = t
    if (t.kind !== 'expense' || t.refundable || !t.categoryId || !t.counterparty.trim()) continue
    const key = `${counterpartyKey(t.counterparty)}|${t.categoryId}`
    const was = pairs.get(key)
    if (!was || newer(t, was)) pairs.set(key, t)
  }
  const templates = [...pairs.values()]
    .sort((a, b) => (newer(a, b) ? -1 : 1))
    .slice(0, QUICK_TEMPLATES)
    .map(templateOf)
  found = { last: last ? templateOf(last) : null, templates }
  recentMemo.set(transactions, found)
  return found
}

/**
 * The account a new entry starts on (the editor, Ctrl+N and the quick entry – AP-20, AP-28, SW sp. 8): the account used
 * last in the folder (`lastAccountOf` – an open one), so a new computer and the second one start where the budget is;
 * none typed by hand yet – the one used last on this computer (`mine`), else the first open one.
 */
export function entryAccount(accounts: ReadonlyArray<{ id: string }>, mine: string | null, transactions: readonly Transaction[], scheduled: readonly BuoyDays[] = NO_BUOYS): string | null {
  const open = new Set(accounts.map((a) => a.id))
  return lastAccountOf(transactions, scheduled, open) ?? (mine && open.has(mine) ? mine : null) ?? accounts[0]?.id ?? null
}
