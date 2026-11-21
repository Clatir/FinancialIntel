/**
 * The category field's and the counterparty field's data as pure functions (Z7, UX-70, UX-72): the tree of choices, the
 * search by a fragment (no Polish marks, no case), the „Ostatnie” categories of the newest operations, the counterparties
 * of the history. No React, no store – the quick window feeds the same functions from its own data.
 */
import type { CategoryIndex } from '@shared/calc/operations'
import { fold } from '@shared/fold'
import type { Category, Transaction } from '@shared/schema'

export interface CategoryChoice {
  id: string
  /** „Jedzenie · zakupy spożywcze” (a main category: its name). */
  label: string
  main: boolean
}

/** How many of the newest operations' categories the „Ostatnie” section shows. */
export const RECENT_CATEGORIES = 5
/** How many counterparties the field suggests at most. */
export const MAX_SUGGESTIONS = 8

/** The tree's choices (W17): made once per tree and archived choice, the same array for every field. */
const choicesMemo = new WeakMap<CategoryIndex, Map<string, CategoryChoice[]>>()

/**
 * The tree: the main categories, each followed by its subcategories. An archived category is offered only as the current
 * value (also a subcategory of an archived main one, B80 – shown as the value it is, never as „bez kategorii”).
 */
export function categoryChoices(cats: CategoryIndex, value: string | null): CategoryChoice[] {
  const archived = value && (cats.byId.get(value)?.archived || cats.mainOf(value)?.archived) ? value : ''
  let byArchived = choicesMemo.get(cats)
  if (!byArchived) choicesMemo.set(cats, (byArchived = new Map()))
  let out = byArchived.get(archived)
  if (out) return out
  out = []
  const shown = (c: Category) => !c.archived || c.id === archived
  const holder = archived ? cats.mainOf(archived)?.id : undefined
  for (const main of cats.mains) {
    if (!(shown(main) || main.id === holder)) continue
    // An archived main category shown for the current value only: that value alone.
    const only = main.archived
    if (!only || main.id === archived) out.push({ id: main.id, label: main.name, main: true })
    for (const c of cats.childrenOf(main.id)) {
      if (only ? c.id !== archived : !shown(c)) continue
      out.push({ id: c.id, label: `${main.name} · ${c.name}`, main: false })
    }
  }
  byArchived.set(archived, out)
  return out
}

/** The choices whose label holds every word of `query` (any order); nothing typed = the same array. */
export function filterChoices(choices: CategoryChoice[], query: string): CategoryChoice[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return choices
  return choices.filter((c) => {
    const label = fold(c.label)
    return words.every((w) => label.includes(w))
  })
}

const newer = (a: string, b: string) => a > b

const recentMemo = new WeakMap<readonly Transaction[], string[]>()

/**
 * The categories of the newest expenses (lines of a receipt too), the newest first, each once. Every category of the
 * list – the caller drops the ones it does not offer and takes the first few. One list, one answer.
 */
export function recentCategoryIds(transactions: readonly Transaction[]): string[] {
  const hit = recentMemo.get(transactions)
  if (hit) return hit
  const last = new Map<string, string>()
  for (const t of transactions) {
    if (t.kind !== 'expense') continue
    const at = `${t.date}|${t.createdAt}`
    const see = (id: string | null | undefined) => {
      if (!id) return
      const was = last.get(id)
      if (was === undefined || newer(at, was)) last.set(id, at)
    }
    see(t.categoryId)
    for (const s of t.splits) see(s.categoryId)
  }
  const out = [...last.entries()].sort((a, b) => (a[1] === b[1] ? 0 : newer(a[1], b[1]) ? -1 : 1)).map(([id]) => id)
  recentMemo.set(transactions, out)
  return out
}

/** A counterparty of the history: its latest spelling, how many operations carry it, the category of the latest one. */
export interface CounterpartyUse {
  name: string
  n: number
  categoryId: string | null
}

const historyMemo = new WeakMap<readonly Transaction[], CounterpartyUse[]>()

/** The counterparties typed in the operations (one per name, case and Polish marks aside), the most used first. */
export function counterpartyHistory(transactions: readonly Transaction[]): CounterpartyUse[] {
  const hit = historyMemo.get(transactions)
  if (hit) return hit
  const byName = new Map<string, CounterpartyUse & { at: string; catAt: string }>()
  for (const t of transactions) {
    if (t.kind !== 'expense' && t.kind !== 'income') continue
    const name = t.counterparty.trim()
    if (!name) continue
    const key = fold(name)
    const at = `${t.date}|${t.createdAt}`
    const use = byName.get(key)
    if (!use) {
      byName.set(key, { name, n: 1, categoryId: t.kind === 'expense' ? t.categoryId : null, at, catAt: t.kind === 'expense' && t.categoryId ? at : '' })
      continue
    }
    use.n++
    if (newer(at, use.at)) Object.assign(use, { name, at })
    if (t.kind === 'expense' && t.categoryId && newer(at, use.catAt)) Object.assign(use, { categoryId: t.categoryId, catAt: at })
  }
  const out = [...byName.values()]
    .sort((a, b) => b.n - a.n || (a.at === b.at ? 0 : newer(a.at, b.at) ? -1 : 1))
    .map(({ name, n, categoryId }) => ({ name, n, categoryId }))
  historyMemo.set(transactions, out)
  return out
}

/**
 * The history's counterparties holding the fragment typed (the most used first, at most `limit`); empty when nothing is
 * typed and when what is typed is the only name that fits (nothing left to suggest).
 */
export function suggestCounterparties<T extends { name: string }>(history: readonly T[], query: string, limit = MAX_SUGGESTIONS): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const typed = fold(query.trim())
  const out: T[] = []
  for (const h of history) {
    const name = fold(h.name)
    if (name === typed || !words.every((w) => name.includes(w))) continue
    out.push(h)
    if (out.length >= limit) break
  }
  return out
}
