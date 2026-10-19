/**
 * The sensors in the operation's editor (1.9.0): an unknown signal about it (F31) with „to w porządku”, and „czekam na
 * zwrot” of a purchase (F34) – its amount and day, its state, „zamknij”.
 */
import { anomalyText } from '@shared/calc/anomalies'
import { dm } from '@shared/format'
import type { Transaction } from '@shared/schema'
import { AmountField, DateField, plnText } from '../../components/fields'
import { cx } from '../../components/ui'
import { closeReturn, dismissAnomaly, setAwaitReturn, startAwaitReturn, useAnomalies, useReturns } from './state'

const zl = (g: number) => `${plnText(g)} zł`

/** „Nieznany sygnał na radarze” (F31): what is unusual about this operation. */
export function AnomalyNote({ t }: { t: Transaction }) {
  const list = useAnomalies().filter((a) => a.txIds.includes(t.id))
  if (!list.length) return null
  return (
    <div className="flex flex-col gap-1 border-l-2 border-accent pl-2 text-[12px]" data-testid="operation-anomaly">
      <span className="label text-accent">Nieznany sygnał na radarze</span>
      {list.map((a) => (
        <div key={a.key} className="flex flex-wrap items-baseline gap-2">
          <span className="text-fg-strong">{anomalyText(a, zl)}</span>
          <button type="button" className="btn h-[22px]" onClick={() => dismissAnomaly(a)} data-testid="operation-anomaly-ok">
            To w porządku
          </button>
        </div>
      ))}
    </div>
  )
}

/** „Czekam na zwrot” (F34): the money of a purchase expected back – its state as the bank's operations show it. */
export function AwaitReturnBox({ t, readOnly }: { t: Transaction; readOnly: boolean }) {
  const state = useReturns().find((r) => r.tx.id === t.id)
  const r = t.awaitReturn
  if (!r)
    return (
      <button
        type="button"
        className="self-start text-[11.5px] text-accent hover:underline disabled:opacity-40"
        disabled={readOnly || t.amount === 0}
        title={t.amount === 0 ? 'Najpierw kwota zakupu' : undefined}
        onClick={() => startAwaitReturn(t)}
        data-testid="operation-await"
      >
        Czekam na zwrot pieniędzy (oddany towar, reklamacja, anulowana rezerwacja)
      </button>
    )
  const text = !state
    ? ''
    : state.state === 'arrived' && state.refund
      ? `Dotarł: ${zl(state.refund.amount)} ${dm(state.refund.date)}${state.refund.counterparty ? ` (${state.refund.counterparty})` : ''}.`
      : state.state === 'closed'
        ? 'Zamknięty – nie jest już oczekiwany.'
        : state.state === 'late'
          ? `Po terminie ${state.days} ${state.days === 1 ? 'dzień' : 'dni'} – zwrot nie dotarł.`
          : `W drodze – do ${dm(r.until)}${state.days > 0 ? ` (jeszcze ${state.days} ${state.days === 1 ? 'dzień' : 'dni'})` : ' (dziś)'}.`
  const open = state?.state === 'waiting' || state?.state === 'late'
  return (
    <div className={cx('flex flex-col gap-1 border-l-2 pl-2 text-[12px]', state?.state === 'late' ? 'border-accent' : 'border-line-strong')} data-testid="operation-await-box" data-state={state?.state}>
      <span className="label">Zwrot w drodze</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted">Kwota</span>
        <AmountField className="w-[110px]" value={r.amount} onChange={(v) => v != null && v > 0 && setAwaitReturn(t, { ...r, amount: v })} aria-label="Kwota zwrotu" data-testid="operation-await-amount" />
        <span className="text-muted">do</span>
        <DateField className="w-[110px]" value={r.until} onChange={(until) => until && setAwaitReturn(t, { ...r, until })} aria-label="Termin zwrotu" data-testid="operation-await-until" />
      </div>
      <span className={cx(state?.state === 'late' ? 'text-accent' : state?.state === 'arrived' ? 'text-fg-strong' : 'text-muted')} data-testid="operation-await-state">
        {text}
      </span>
      <span className="text-[11px] text-dim">Wpływ tej samej marki (±10%) – z importu albo wpisany – zamyka go sam.</span>
      <div className="flex flex-wrap items-center gap-2">
        {open && (
          <button type="button" className="btn h-[22px]" disabled={readOnly} onClick={() => closeReturn(t)} data-testid="operation-await-close">
            Zamknij – dotarł inaczej albo nie przyjdzie
          </button>
        )}
        <button type="button" className="btn btn-ghost h-[22px] text-[11px]" disabled={readOnly} onClick={() => setAwaitReturn(t, null)} data-testid="operation-await-off">
          Nie czekam na zwrot
        </button>
      </div>
    </div>
  )
}
