/**
 * The palette's search (1.7.0, F19): the records of the budget a query names – operations (as the search of Operacje:
 * the words in their texts without Polish letters, or the amount typed), the cargo's containers, the goals, the loans,
 * the household members and the settings' items. Pure – the palette and the tests share it.
 */
import type { Container, Goal, Loan, Transaction } from './schema/records'
import type { HouseholdMember } from './schema/budget'
import { compareOperations, matchesQuery, queryAmount, type FilterContext } from './operationsView'
import { fold } from './fold'

export type SearchKind = 'operation' | 'container' | 'goal' | 'loan' | 'member' | 'setting'

export interface SettingsItem {
  id: string
  label: string
  /** The tab of Ustawienia it is on. */
  tab: string
  /** More words it is found by. */
  words?: string
}

export interface SearchHits {
  operations: Transaction[]
  containers: Container[]
  goals: Goal[]
  loans: Loan[]
  members: HouseholdMember[]
  settings: SettingsItem[]
}

export interface SearchInput {
  transactions: readonly Transaction[]
  containers: readonly Container[]
  goals: readonly Goal[]
  loans: readonly Loan[]
  members: readonly HouseholdMember[]
  settings: readonly SettingsItem[]
  ctx: FilterContext
}

/** How many of each the palette shows (the newest operations first). */
export const SEARCH_LIMITS = { operations: 30, others: 10 }

const words = (q: string): string[] => fold(q).split(/\s+/).filter(Boolean)
const hasAll = (text: string, ws: readonly string[]) => ws.every((w) => text.includes(w))

/** Every word of the query in one of the texts (folded), or the amount typed equal to one of the amounts (grosze, either sign). */
function named(ws: readonly string[], amount: number | null, texts: ReadonlyArray<string | null | undefined>, amounts: ReadonlyArray<number | null | undefined> = []): boolean {
  if (amount != null && amounts.some((a) => a != null && Math.abs(a) === amount)) return true
  return hasAll(fold(texts.filter(Boolean).join(' \u0001 ')), ws)
}

export function searchRecords(query: string, input: SearchInput): SearchHits {
  const q = query.trim()
  const empty: SearchHits = { operations: [], containers: [], goals: [], loans: [], members: [], settings: [] }
  if (!q) return empty
  const ws = words(q)
  const amount = queryAmount(q)
  // The newest matches without sorting the whole history: the matches only.
  const operations = input.transactions.filter((t) => matchesQuery(t, q, input.ctx)).sort(compareOperations).slice(0, SEARCH_LIMITS.operations)
  const some = <T>(list: readonly T[], match: (x: T) => boolean) => list.filter(match).slice(0, SEARCH_LIMITS.others)
  return {
    operations,
    containers: some(input.containers, (c) => named(ws, amount, [c.name, c.counterparty, c.note], [c.amount])),
    goals: some(input.goals, (g) => named(ws, amount, [g.name, g.note], [g.target])),
    loans: some(input.loans, (l) => named(ws, amount, [l.name, l.counterparty, l.note], [l.amount])),
    members: some(input.members, (m) => named(ws, null, [m.name, ...m.bankNames])),
    settings: amount != null && !ws.some((w) => /\p{L}/u.test(w)) ? [] : some(input.settings, (s) => named(ws, null, [s.label, s.words]))
  }
}
