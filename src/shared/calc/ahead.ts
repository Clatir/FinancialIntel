/**
 * The accounts' balances ahead (1.8.0, F26): each account of the budget day by day over the radar's window – today's
 * balance, the payments of the radar with their account (the containers', the loans', the planned operations' – F16)
 * and the operations already written with a later day (a transfer planned ahead: both its sides). The layers are
 * virtual (D10), the payments are not: money on the wrong account (a payout docked on Portfel XTB – D56) leaves mBank
 * short for its rent. Pure.
 */
import type { Account } from '../schema/budget'
import type { Transaction } from '../schema/records'
import { accountAmounts } from './operations'
import type { RadarItem } from './radar'

export interface AccountMove {
  date: string
  /** Grosze, signed (out < 0). */
  amount: number
  name: string
}

export interface AccountAhead {
  accountId: string
  name: string
  balance: number
  /** The lowest balance in the window and its first day (today's when nothing takes it lower). */
  low: { date: string; amount: number }
  /**
   * The first day a payment takes it below zero, with the balance had today been enough – `amount` = what lacks then,
   * `cause` = the payment; null = never (or below zero today already: the bank's matter, not a forecast).
   */
  short: { date: string; amount: number; cause: string } | null
  /** Another account to move the money from (the most it keeps to that day, enough for it); null = none has it. */
  source: { accountId: string; name: string } | null
  moves: AccountMove[]
}

export interface AheadInput {
  today: string
  /** Each account's balance today (the engine's `FleetState.accounts`). */
  balances: ReadonlyArray<{ id: string; balance: number }>
  accounts: readonly Pick<Account, 'id' | 'name' | 'archived' | 'kind'>[]
  /** The radar's items (`radar()`): those with an amount and an account move it. */
  items: readonly RadarItem[]
  transactions: readonly Transaction[]
  /** The window's last day (the radar's). */
  end: string
}

export function accountsAhead(o: AheadInput): AccountAhead[] {
  const moves = new Map<string, AccountMove[]>()
  const add = (id: string, m: AccountMove) => {
    const list = moves.get(id)
    if (list) list.push(m)
    else moves.set(id, [m])
  }
  for (const i of o.items) {
    if (i.amount == null || !i.accountId || (i.direction !== 'in' && i.direction !== 'out')) continue
    // A late one is still to come – today.
    add(i.accountId, { date: i.date < o.today ? o.today : i.date, amount: i.direction === 'in' ? i.amount : -i.amount, name: i.name })
  }
  // Operations written ahead (a transfer planned for a later day): each side on its account and day.
  for (const t of o.transactions)
    for (const [id, amount, date] of accountAmounts(t)) if (date > o.today && date <= o.end) add(id, { date, amount, name: t.counterparty || t.title || 'operacja z późniejszą datą' })
  const balanceOf = new Map(o.balances.map((b) => [b.id, b.balance]))
  const out: AccountAhead[] = []
  for (const a of o.accounts) {
    if (a.archived) continue
    const list = (moves.get(a.id) ?? []).sort((x, y) => x.date.localeCompare(y.date) || x.amount - y.amount)
    const balance = balanceOf.get(a.id) ?? 0
    let run = balance
    let low = { date: o.today, amount: balance }
    let short: AccountAhead['short'] = null
    for (const m of list) {
      run += m.amount
      if (run < low.amount) low = { date: m.date, amount: run }
      if (!short && balance >= 0 && run < 0) short = { date: m.date, amount: -run, cause: m.name }
    }
    out.push({ accountId: a.id, name: a.name, balance, low, short, source: null, moves: list })
  }
  // The account to move it from: one (not the cash – a transfer moves bank money) that keeps the most up to that day.
  for (const a of out) {
    if (!a.short) continue
    let best: { id: string; name: string; keeps: number } | null = null
    for (const b of out) {
      if (b.accountId === a.accountId || o.accounts.find((x) => x.id === b.accountId)?.kind === 'cash') continue
      let run = b.balance
      let keeps = b.balance
      for (const m of b.moves) {
        if (m.date > a.short.date) break
        run += m.amount
        keeps = Math.min(keeps, run)
      }
      if (keeps >= a.short.amount && (!best || keeps > best.keeps)) best = { id: b.accountId, name: b.name, keeps }
    }
    a.source = best ? { accountId: best.id, name: best.name } : null
  }
  return out
}

/** The amount of a transfer that covers a shortfall: up to whole złoty. */
export const coverAmount = (short: number): number => Math.ceil(short / 100) * 100
