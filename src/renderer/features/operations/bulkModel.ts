/**
 * Operacje: what a bulk change makes of each ticked operation (F11, D105) – pure, tested in node. The fields go through the
 * same assignments as the editor's (`OperationEditor.tsx`) and fit the operations the editor lets them be set on; no
 * money rule here – the engine reads the fields as it reads them from the editor.
 */
import { addDays, daysBetween } from '@shared/calc/dates'
import { withKind } from '@shared/calc/kinds'
import { shareOf } from '@shared/calc/share'
import { MAX_TAGS, tagKey, tagsOf, withTags } from '@shared/calc/tags'
import type { Transaction, TxKind } from '@shared/schema'

/**
 * A change of the ticked operations at once (F11, D105): deleted, moved onto another account, another kind, a shifted
 * date; a day chosen in the calendar, a tag put on or taken off, the tags cleared, plan / impulse, a correction explained,
 * a container of the cargo or a goal (one excludes the other), a loan.
 */
export type BulkChange =
  | { kind: 'delete' }
  | { kind: 'account'; accountId: string }
  | { kind: 'kind'; to: TxKind; counterAccountId?: string | null }
  | { kind: 'shift'; days: number }
  /** The operation's day; its transfer's other side moves by as many days. */
  | { kind: 'day'; date: string }
  /** One tag of the operation itself (its receipt's lines keep theirs), by its key (`tagKey`). */
  | { kind: 'tag'; tag: string; on: boolean }
  | { kind: 'tagsClear' }
  | { kind: 'impulse'; to: 'plan' | 'impulse' | null }
  | { kind: 'explained'; on: boolean }
  /** Paid from a container of the cargo (null – not from the cargo); a container takes the goal off. */
  | { kind: 'container'; containerId: string | null }
  /** Paid from a goal's money (null – not from a goal); a goal takes the container off. */
  | { kind: 'goal'; goalId: string | null }
  | { kind: 'loan'; loanId: string | null }

/** The menu's mark of a change (D105): in effect on every ticked operation it fits (✓), on some („—”), on none. */
export type OpState = 'on' | 'mixed' | 'off'

const NONE: ReadonlySet<string> = new Set()

/** Money out of an expense as the editor shows it (a zero amount – out, its default direction). */
const outgoing = (t: Transaction): boolean => t.amount <= 0

/**
 * A split receipt (lines of their own categories, members, goals or containers – N-PC-13): the operation's container,
 * goal and loan are not changed in bulk – its lines say them (D105); a shared purchase's lines follow its share – it takes
 * the change.
 */
const splitReceipt = (t: Transaction): boolean => t.splits.length > 0 && !shareOf(t)

/** The tags field of the editor: an expense and an income always, another kind once it has tags. */
const takesTags = (t: Transaction): boolean => t.kind === 'expense' || t.kind === 'income' || tagsOf(t).length > 0

/** The operation without one of its optional fields (the editor writes `undefined` – the record keeps no such key). */
function without<K extends 'tags' | 'explained'>(t: Transaction, key: K): Transaction {
  const out = { ...t }
  delete out[key]
  return out
}

/**
 * What a change makes of one operation: the same object – nothing to change (it is as the change leaves it); null – it
 * does not fit (the editor would not let the field be set on it: another kind, the other direction, a split receipt, a
 * docked one's kind, a transfer onto its own other account, no room for one more tag).
 */
export function changedBy(t: Transaction, c: BulkChange, docked: ReadonlySet<string> = NONE): Transaction | null {
  switch (c.kind) {
    case 'delete':
      return { ...t }
    case 'account':
      if (t.accountId === c.accountId) return t
      // A transfer onto the account of its other side would be a transfer to itself.
      if (t.kind === 'transfer' && t.counterAccountId === c.accountId) return null
      return { ...t, accountId: c.accountId }
    case 'kind': {
      const counter = c.to === 'transfer' ? (c.counterAccountId ?? null) : null
      if (t.kind === c.to && (c.to !== 'transfer' || t.counterAccountId === counter)) return t
      // A docked one keeps its kind (the docking is about it – Mostek → Dokowanie); a transfer never goes to its own account.
      if ((docked.has(t.id) && t.kind !== c.to) || (counter && counter === t.accountId)) return null
      const k = withKind(t, c.to)
      if (c.to !== 'transfer') return k
      // Another account: its bank row and day go. A new transfer is one operation for both sides (`withKind` – F10); one
      // of before 1.7.0 stays one side (its other side may be an operation of its own – the inbox joins them).
      return { ...k, counterAccountId: counter, ...(counter !== t.counterAccountId ? { counterBank: undefined, counterDate: undefined } : {}) }
    }
    case 'shift':
      if (!c.days) return t
      return { ...t, date: addDays(t.date, c.days), ...(t.counterDate ? { counterDate: addDays(t.counterDate, c.days) } : {}) }
    case 'day':
      // The other side's day moves with it, as by „Przesuń o N dni”.
      return t.date === c.date ? t : changedBy(t, { kind: 'shift', days: daysBetween(t.date, c.date) })
    case 'tag': {
      const key = tagKey(c.tag)
      if (!key || !takesTags(t)) return null
      const tags = tagsOf(t)
      const has = tags.some((x) => tagKey(x) === key)
      if (has === c.on) return t
      if (!c.on) {
        const rest = tags.filter((x) => tagKey(x) !== key)
        return rest.length ? { ...t, tags: rest } : without(t, 'tags')
      }
      const more = withTags(tags, [c.tag])
      // Full (`MAX_TAGS`): the tag does not get in – never a change that says it did.
      return more.length > tags.length ? { ...t, tags: more } : null
    }
    case 'tagsClear':
      return tagsOf(t).length ? without(t, 'tags') : t
    case 'impulse':
      // The captain's log of a purchase – the game reads it on expenses only.
      if (t.kind !== 'expense') return null
      return (t.impulse ?? null) === c.to ? t : { ...t, impulse: c.to }
    case 'explained':
      if (t.kind !== 'correction') return null
      if (!!t.explained === c.on) return t
      return c.on ? { ...t, explained: true } : without(t, 'explained')
    case 'container':
      // The editor's „Ładownia”: an expense's money out, no split receipt.
      if (t.kind !== 'expense' || !outgoing(t) || splitReceipt(t)) return null
      if (t.containerId === c.containerId && (!c.containerId || !t.goalId)) return t
      return { ...t, containerId: c.containerId, goalId: c.containerId ? null : t.goalId }
    case 'goal':
      // The editor's „Z celu”: an expense either way (a product returned goes back to the goal), no split receipt.
      if (t.kind !== 'expense' || splitReceipt(t)) return null
      if (t.goalId === c.goalId && (!c.goalId || !t.containerId)) return t
      return { ...t, goalId: c.goalId, containerId: c.goalId ? null : t.containerId }
    case 'loan':
      // The loan's own operation only: an inflow's lines repaying a loan (D100) are its parts, never changed in bulk.
      if (t.kind !== 'loan' || splitReceipt(t)) return null
      return t.loanId === c.loanId ? t : { ...t, loanId: c.loanId }
  }
}

/**
 * „Cofnij” of one tag put on or taken off (B66 – the change's own field is the one tag, not the list): the operation as it
 * is now with that tag taken off again (or put back where it was – the others, those added since too, stay); null – the
 * tag is no longer as the change left it (taken off or put back meanwhile), or there is no room for it any more.
 */
export function tagUndone(current: Transaction, before: Transaction, c: Extract<BulkChange, { kind: 'tag' }>): Transaction | null {
  const key = tagKey(c.tag)
  const tags = tagsOf(current)
  if (tags.some((x) => tagKey(x) === key) !== c.on) return null
  if (c.on) {
    const rest = tags.filter((x) => tagKey(x) !== key)
    return rest.length ? { ...current, tags: rest } : without(current, 'tags')
  }
  if (tags.length >= MAX_TAGS) return null
  const was = tagsOf(before)
  const at = was.findIndex((x) => tagKey(x) === key)
  if (at < 0) return null
  // Its place among the tags that were before it and are still there.
  const ahead = new Set(was.slice(0, at).map(tagKey))
  let i = 0
  while (i < tags.length && ahead.has(tagKey(tags[i]!))) i++
  return { ...current, tags: [...tags.slice(0, i), was[at]!, ...tags.slice(i)] }
}

/** How many of the operations the change fits – the ones it changes and the ones already as it leaves them. */
export function bulkApplies(records: readonly Transaction[], change: BulkChange, docked: ReadonlySet<string> = NONE): number {
  let n = 0
  for (const t of records) if (changedBy(t, change, docked)) n++
  return n
}

/**
 * Is the change in effect on the operations it fits (the writable ticked ones, no drafts): on all – 'on', on some –
 * 'mixed', on none (or none fits) – 'off'. The menu's tag toggle: `{ kind: 'tag', tag, on: opState(records, { kind:
 * 'tag', tag, on: true }) !== 'on' }` – on every one, it takes the tag off; otherwise it puts it on.
 */
export function opState(records: readonly Transaction[], change: BulkChange, docked: ReadonlySet<string> = NONE): OpState {
  return bulkProbe(records, change, docked).state
}

/**
 * `bulkApplies` and `opState` in one pass (the menu asks both of every item): how many operations the change fits, how
 * many of them are already as it leaves them, and the mark that gives.
 */
export function bulkProbe(records: readonly Transaction[], change: BulkChange, docked: ReadonlySet<string> = NONE): { fit: number; done: number; state: OpState } {
  let fit = 0
  let done = 0
  for (const t of records) {
    const next = changedBy(t, change, docked)
    if (!next) continue
    fit++
    if (next === t) done++
  }
  return { fit, done, state: !done ? 'off' : done === fit ? 'on' : 'mixed' }
}
