import { useMemo } from 'react'
import { structureOf, wealthCurve, type StructureMark, type WealthPoint } from '@shared/calc/intel'
import type { Account, Balance, Transaction } from '@shared/schema'
import { useData } from '../../store/data'
import { useRecordList } from '../../store/records'

interface Wealth {
  points: WealthPoint[]
  marks: StructureMark[]
  trend: 'up' | 'down' | null
}

const NONE: Wealth = { points: [], marks: [], trend: null }
let last: { tx: readonly Transaction[]; bal: readonly Balance[]; accounts: readonly Account[]; today: string; value: Wealth } | null = null

/**
 * The wealth curve and its structure (E8) – once per state of the data for the bridge and Wywiad (N58): years of
 * history are gone through once per save, not by every screen showing the curve.
 */
export function wealthOf(tx: readonly Transaction[], bal: readonly Balance[], accounts: readonly Account[], today: string): Wealth {
  if (last && last.tx === tx && last.bal === bal && last.accounts === accounts && last.today === today) return last.value
  const points = wealthCurve(tx, bal, accounts.map((a) => a.id), today)
  const value: Wealth = { points, ...structureOf(points) }
  last = { tx, bal, accounts, today, value }
  return value
}

export function useWealth(today: string | null): Wealth {
  const transactions = useRecordList('transactions')
  const balances = useRecordList('balances')
  const accounts = useData((s) => s.fi?.settings.accounts)
  return useMemo(() => (today && accounts ? wealthOf(transactions, balances, accounts, today) : NONE), [transactions, balances, accounts, today])
}
