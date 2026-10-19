/**
 * What a change of operations does (F11: before a bulk change of Operacje is applied): today's energy, the envelopes,
 * the accounts' balances and the shields – the engine's state now against the one with the change.
 */
import type { FleetState } from './fleet'

export interface Change {
  before: number
  after: number
}

export interface Effect {
  /** Today's energy after today's spending (`daily.left`); null – no plan of the month, or no change. */
  energy: Change | null
  shields: Change | null
  /** The envelopes of this month whose rest changes. */
  envelopes: Array<Change & { categoryId: string }>
  /** The accounts whose balance changes. */
  accounts: Array<Change & { id: string; name: string }>
}

const change = (before: number, after: number): Change | null => (before === after ? null : { before, after })

export function effectOf(before: FleetState, after: FleetState): Effect {
  const envelopes: Effect['envelopes'] = []
  const afterEnvelopes = new Map(after.envelopes.map((e) => [e.categoryId, e.left]))
  for (const e of before.envelopes) {
    const left = afterEnvelopes.get(e.categoryId)
    if (left != null && left !== e.left) envelopes.push({ categoryId: e.categoryId, before: e.left, after: left })
  }
  const accounts: Effect['accounts'] = []
  const afterAccounts = new Map(after.accounts.map((a) => [a.id, a.balance]))
  for (const a of before.accounts) {
    const balance = afterAccounts.get(a.id) ?? 0
    if (balance !== a.balance) accounts.push({ id: a.id, name: a.name, before: a.balance, after: balance })
  }
  // An account the change brings in (an operation moved onto one without any yet).
  for (const a of after.accounts) if (!before.accounts.some((b) => b.id === a.id) && a.balance) accounts.push({ id: a.id, name: a.name, before: 0, after: a.balance })
  return {
    energy: before.daily && after.daily ? change(before.daily.left, after.daily.left) : null,
    shields: before.started && after.started ? change(before.shields.amount, after.shields.amount) : null,
    envelopes,
    accounts
  }
}

/** Does the change move nothing the captain sees? */
export const noEffect = (e: Effect): boolean => !e.energy && !e.shields && !e.envelopes.length && !e.accounts.length
