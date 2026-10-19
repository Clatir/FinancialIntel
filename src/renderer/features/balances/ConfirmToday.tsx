import { useState } from 'react'
import { planConfirmation, type ConfirmationPlan } from '@shared/calc/balances'
import { warsawNow } from '@shared/calc/dates'
import { listOf, useData } from '../../store/data'
import { signedPln } from '../../components/fields'
import { confirmBalance } from './actions'

export interface ConfirmToday {
  /** A difference waiting for the answer „are today's operations written?”; null = none. */
  ask: { amount: number; diff: number } | null
  /** The bank's balance now: confirmed at once when it matches (or sets the opening); a difference asks first. */
  confirm: (amount: number) => void
  /** „Tak – zapisz korektę”: the difference as a correction to explain. */
  yes: () => void
  /** „Dopiszę i potwierdzę później” (or the typed balance changed): nothing written. */
  later: () => void
}

/**
 * „Potwierdź saldo” of today (B83, doprecyzowuje T25): the bank's balance now is compared with the operations to the
 * end of the day – one confirmed before the day's expenses are written down (the evening's ritual) would add a wrong
 * correction. A difference asks first whether today's operations are all written. `onDone` – the balance written (the
 * typed value can go); until then it stays for the next „Potwierdź”.
 */
export function useConfirmToday(accountId: string, accountName: string, onDone?: () => void): ConfirmToday {
  const [ask, setAsk] = useState<{ amount: number; diff: number } | null>(null)
  const done = (plan: ConfirmationPlan | null) => {
    if (plan && plan.kind !== 'before-opening') onDone?.()
  }
  return {
    ask,
    confirm: (amount) => {
      const s = useData.getState()
      const today = warsawNow().date
      const plan = planConfirmation(accountId, amount, today, listOf(s.records.transactions), listOf(s.records.balances))
      if (plan.kind === 'correction') {
        setAsk({ amount, diff: plan.diff })
        return
      }
      setAsk(null)
      done(confirmBalance(accountId, amount, today, accountName, plan))
    },
    yes: () => {
      if (ask) done(confirmBalance(accountId, ask.amount, warsawNow().date, accountName))
      setAsk(null)
    },
    later: () => setAsk(null)
  }
}

/** The question of a difference (B83). */
export function ConfirmTodayAsk({ c }: { c: ConfirmToday }) {
  if (!c.ask) return null
  return (
    <div className="flex w-full flex-wrap items-center gap-2 text-[11.5px]" data-testid="confirm-ask">
      <span className="text-accent">
        Różnica {signedPln(c.ask.diff)} zł wobec operacji do końca dnia. Dzisiejsze operacje są już dopisane?
      </span>
      <button type="button" className="btn h-[22px]" onClick={c.yes} data-testid="confirm-ask-yes">
        Tak – zapisz korektę
      </button>
      <button type="button" className="btn btn-ghost h-[22px]" onClick={c.later} data-testid="confirm-ask-later">
        Dopiszę i potwierdzę później
      </button>
    </div>
  )
}
