/**
 * Tags and expeditions (1.10.0, F17): a category says „na co”, a tag „po co” – a trip, a renovation, a wedding gift
 * across fuel, food, lodgings and tools. An operation's tags, and a receipt's line's own besides them; the same tag
 * written differently („#wakacje”, „Wakacje ”) is one (`tagKey`). A tag's card: its money, by category and by month, and
 * its goal of the star map. Pure.
 */
import { fold } from '../fold'
import type { Transaction } from '../schema/records'
import { addDays, monthOf } from './dates'
import { incomeShares } from './household'
import { partsOf, sum, type CategoryIndex } from './operations'

/** The most tags an operation keeps (the schema's limit). */
export const MAX_TAGS = 20
/** The last tag used is offered in the quick entry this many days (a trip of a week or two). */
export const LAST_TAG_DAYS = 7

/** A tag as typed, tidied: no „#”, single spaces, at most 40 characters ('' – none). */
export const tagLabel = (s: string): string => s.trim().replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, 40)

/** The tag's identity: „#Wakacje  Chorwacja” = „wakacje chorwacja” (no case, no Polish marks). */
export const tagKey = (s: string): string => fold(tagLabel(s))

/** Tags typed in one field: „#wakacje #remont”, „wakacje, remont łazienki” – each once, in their order. */
export function parseTags(text: string): string[] {
  const raw = text.includes(',') ? text.split(',') : text.includes('#') ? text.split('#') : [text]
  return withTags([], raw)
}

/** `list` with `more` added – each tag once (the first spelling stays), at most `MAX_TAGS`. */
export function withTags(list: readonly string[], more: readonly string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const t of [...list, ...more]) {
    const label = tagLabel(t)
    const key = fold(label)
    if (!label || seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out.slice(0, MAX_TAGS)
}

/** „#słowo” in a note (the quick entry – F17): the words marked so, as tags – a letter first („Pizzeria #1” is a name). */
export function hashTags(note: string): string[] {
  return withTags(
    [],
    [...note.matchAll(/(?:^|\s)#(\p{L}[\p{L}\p{N}_-]*)/gu)].map((m) => m[1]!)
  )
}

/** A text with its „#słowo” taken out (the quick entry's counterparty – the brand is the name without them). */
export const withoutHashTags = (text: string): string => text.replace(/(?:^|\s)#\p{L}[\p{L}\p{N}_-]*/gu, ' ').replace(/\s+/g, ' ').trim()

/** The tags of an operation (none – []). */
export const tagsOf = (t: Pick<Transaction, 'tags'>): readonly string[] => t.tags ?? []

/** The operation's tags and its lines' as one text („#Chorwacja #Paliwo”) – the list's „Tagi”, the export's. */
export const tagsText = (t: Pick<Transaction, 'tags' | 'splits'>): string =>
  withTags(tagsOf(t), t.splits.flatMap((s) => s.tags ?? []))
    .map((x) => `#${x}`)
    .join(' ')

/** Does the operation carry the tag (its own, or a line's of its receipt)? */
export function hasTag(t: Pick<Transaction, 'tags' | 'splits'>, key: string): boolean {
  if (tagsOf(t).some((x) => tagKey(x) === key)) return true
  return t.splits.some((s) => (s.tags ?? []).some((x) => tagKey(x) === key))
}

/** Every tag of an operation's parts – the operation's and its lines' (keys). */
export function tagKeysOf(t: Pick<Transaction, 'tags' | 'splits'>): Set<string> {
  const keys = new Set(tagsOf(t).map(tagKey))
  for (const s of t.splits) for (const x of s.tags ?? []) keys.add(tagKey(x))
  return keys
}

/**
 * The parts of an operation with their tags: a line of a receipt – the operation's tags and its own; the rest of the
 * receipt (no line) – the operation's. Money out < 0, as the parts are signed.
 */
export function taggedParts(t: Transaction): Array<{ amount: number; categoryId: string | null; refundable: boolean; keys: Set<string>; labels: string[] }> {
  const own = tagsOf(t)
  const parts = partsOf(t)
  return parts.map((p, i) => {
    const line = i < t.splits.length ? (t.splits[i]!.tags ?? []) : []
    const labels = withTags(own, line)
    return { amount: p.amount, categoryId: p.categoryId, refundable: p.refundable, keys: new Set(labels.map(tagKey)), labels }
  })
}

export interface TagSummary {
  key: string
  /** The tag as written first. */
  label: string
  /** Its money spent (grosze > 0; refunds and money back net it – a trip's deposit returned). */
  spent: number
  /** Operations with it. */
  count: number
  first: string
  last: string
  /** By main category (its id; '-' – none) and by month, money spent. */
  byCategory: Map<string, number>
  byMonth: Map<string, number>
}

/**
 * An income's money back of mine (F17): a household member's money in it – their repayment, their advance, their part
 * of a transfer (D80, D81) – is theirs, never less spent on a trip; each own line with its tags and category.
 */
function incomeParts(t: Transaction): ReturnType<typeof taggedParts> {
  const own = tagsOf(t)
  const out: ReturnType<typeof taggedParts> = []
  for (const x of incomeShares(t)) {
    if (x.memberId != null) continue
    // A line's money – its category and tags beside the operation's; the rest of the amount – the operation's.
    const line = x.line != null ? t.splits[x.line] : undefined
    const labels = withTags(own, line?.tags ?? [])
    out.push({ amount: x.amount, categoryId: line ? line.categoryId : t.categoryId, refundable: false, keys: new Set(labels.map(tagKey)), labels })
  }
  return out
}

/**
 * Every tag's money (F17): the expenses and the money back of its parts – a household member's line is not mine (D80),
 * nor their money coming in; a purchase from a goal's money counts (the trip's money is spent so). Own transfers and
 * the trading's money aside.
 */
export function tagSummaries(transactions: readonly Transaction[], cats: CategoryIndex): TagSummary[] {
  const out = new Map<string, TagSummary>()
  for (const t of transactions) {
    if (t.kind !== 'expense' && t.kind !== 'income') continue
    if (!tagKeysOf(t).size) continue
    const counted = new Set<string>()
    for (const p of t.kind === 'income' ? incomeParts(t) : taggedParts(t)) {
      if (p.refundable) continue
      // Money out a cost, money back (a deposit returned, goods sent back) less of it.
      const cost = -p.amount
      for (const [i, key] of [...p.keys].entries()) {
        let s = out.get(key)
        if (!s) out.set(key, (s = { key, label: p.labels[i] ?? key, spent: 0, count: 0, first: t.date, last: t.date, byCategory: new Map(), byMonth: new Map() }))
        if (!counted.has(key)) {
          counted.add(key)
          s.count++
          if (t.date < s.first) s.first = t.date
          if (t.date > s.last) s.last = t.date
        }
        if (!cost) continue
        s.spent += cost
        const main = cats.mainOf(p.categoryId)?.id ?? '-'
        s.byCategory.set(main, (s.byCategory.get(main) ?? 0) + cost)
        const m = monthOf(t.date)
        s.byMonth.set(m, (s.byMonth.get(m) ?? 0) + cost)
      }
    }
  }
  return [...out.values()].sort((a, b) => b.last.localeCompare(a.last) || b.spent - a.spent || a.label.localeCompare(b.label))
}

/** The tags written in the history, each once (the first spelling): the editor's and the quick entry's suggestions. */
export function knownTags(transactions: readonly Transaction[]): string[] {
  const out = new Map<string, string>()
  for (const t of transactions) {
    for (const x of tagsOf(t)) if (!out.has(tagKey(x))) out.set(tagKey(x), tagLabel(x))
    for (const s of t.splits) for (const x of s.tags ?? []) if (!out.has(tagKey(x))) out.set(tagKey(x), tagLabel(x))
  }
  return [...out.values()].sort((a, b) => a.localeCompare(b))
}

/** The tag used last within `LAST_TAG_DAYS` (the operation's date) – offered in the quick entry; null – none. */
export function lastTag(transactions: readonly Transaction[], today: string): string | null {
  const from = addDays(today, -LAST_TAG_DAYS)
  let best: { date: string; at: string; tag: string } | null = null
  for (const t of transactions) {
    if (t.date < from || t.date > today) continue
    const tags = tagsOf(t)
    if (!tags.length) continue
    const at = t.updatedAt ?? t.createdAt
    if (!best || t.date > best.date || (t.date === best.date && at > best.at)) best = { date: t.date, at, tag: tags[tags.length - 1]! }
  }
  return best?.tag ?? null
}

/** A tag's spending against its goal (F17): „wydano 4 320 z 5 000 zł celu” – the share spent (0–∞). */
export const tagGoalShare = (spent: number, target: number): number | null => (target > 0 ? spent / target : null)

/** The first tag of `tags` mapped to a goal in `tagGoals` (N-PC-5); null when none. */
export function tagGoalMatch(
  tags: readonly string[] | undefined,
  tagGoals: Readonly<Record<string, string>> | undefined,
  usable?: (goalId: string) => boolean
): { tag: string; goalId: string } | null {
  if (!tags?.length || !tagGoals) return null
  for (const raw of tags) {
    const label = tagLabel(raw)
    const id = tagGoals[tagKey(label)]
    if (label && id && (!usable || usable(id))) return { tag: label, goalId: id }
  }
  return null
}
