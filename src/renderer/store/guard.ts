import { create } from 'zustand'
import type { ConfirmedChange } from '@shared/calc/balances'

/**
 * An edit of an operation that changes a confirmed balance or a bank's amount (F12), typed and waiting for „Zmień mimo
 * to” (AP-8, AF-3). It lives here, not in its editor: leaving the editor (another screen, another operation) shows the
 * question still, and the window's close, a folder switch and „zapisz przed…” count it as a change not saved yet.
 */
export interface GuardAsk {
  /** Unique while it waits. */
  seq: number
  /** The operation's id. */
  id: string
  changes: ConfirmedChange[]
  /** The bank's amount of the operation as it is (grosze) – the edit changes it; null = not the bank's amount. */
  bankAmount: number | null
  /** Makes the edit. */
  run: () => void
}

interface GuardState {
  /** The questions waiting, the first shown. */
  asks: GuardAsk[]
}

export const useGuard = create<GuardState>(() => ({ asks: [] }))

let seq = 0

/** An edit to ask about; one of the same operation waiting is replaced (its newest typing is what was meant). */
export function askGuard(ask: Omit<GuardAsk, 'seq'>): void {
  const next = { ...ask, seq: ++seq }
  useGuard.setState((s) => ({ asks: [...s.asks.filter((a) => a.id !== ask.id), next] }))
}

/** „Zmień mimo to” (`confirm`) or „Anuluj”: the edit made or dropped, the question gone. */
export function answerGuard(seqOf: number, confirm: boolean): void {
  const ask = useGuard.getState().asks.find((a) => a.seq === seqOf)
  if (!ask) return
  useGuard.setState((s) => ({ asks: s.asks.filter((a) => a.seq !== seqOf) }))
  if (confirm) ask.run()
}

/** How many edits wait for „Zmień mimo to”. */
export const guardsWaiting = (): number => useGuard.getState().asks.length

/** Another folder shown: the questions about the previous one's operations go. */
export function clearGuards(): void {
  if (useGuard.getState().asks.length) useGuard.setState({ asks: [] })
}
