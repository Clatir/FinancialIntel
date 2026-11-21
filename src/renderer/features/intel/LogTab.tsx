/**
 * Wywiad → „Dziennik” (D106 pt 6): the captain's log – the plans against the impulses of the period (trafność) and what was
 * written in the log (AP-20, SW sp. 11), the newest first.
 */
import { useMemo } from 'react'
import type { FleetState } from '@shared/calc/fleet'
import { logAccuracy, logEntries } from '@shared/calc/intel'
import { sum } from '@shared/calc/operations'
import type { Settings } from '@shared/schema'
import { plnText } from '../../components/fields'
import { Panel } from '../../components/ui'
import { monthLabel, plDate } from '../../lib/format'
import { useRecordList } from '../../store/records'
import { openOperation } from '../operations/state'
import { periodMonths, type Period } from './tabs'

const zl = (g: number) => `${plnText(g)} zł`
/** The log's entries shown in Wywiad (AP-20): the newest of the period. */
const LOG_SHOWN = 12

export function LogTab({ fleet, settings, period }: { fleet: FleetState; settings: Settings; period: Period }) {
  const transactions = useRecordList('transactions')
  const { today, month } = fleet
  const months = useMemo(() => periodMonths(month, period), [month, period])
  const log = useMemo(() => logAccuracy(transactions, settings.orders, months), [transactions, settings.orders, months])
  const logWritten = useMemo(() => (months.length ? logEntries(transactions, `${months[0]}-01`, today, LOG_SHOWN) : { entries: [], total: 0 }), [transactions, months, today])
  return (
    <div className="max-w-[900px]">
      <Panel title="Dziennik kapitański" testId="intel-log">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="text-dim">
              <th className="py-0.5 text-left font-normal">Miesiąc</th>
              <th className="text-right font-normal">plan</th>
              <th className="text-right font-normal">impuls</th>
              <th className="text-right font-normal">bez oznaczenia</th>
              <th className="text-right font-normal">trafność</th>
            </tr>
          </thead>
          <tbody>
            {log.map((l) => {
              const marked = l.plan.count + l.impulse.count
              return (
                <tr key={l.month} data-testid="intel-log-row">
                  <td className="py-0.5">{monthLabel(l.month)}</td>
                  <td className="num text-right">
                    {l.plan.count} · {plnText(l.plan.amount)}
                  </td>
                  <td className="num text-right">
                    {l.impulse.count} · {plnText(l.impulse.amount)}
                  </td>
                  <td className="num text-right text-dim">{l.unmarked}</td>
                  <td className="num text-right text-fg-strong">{marked ? `${Math.round((l.plan.count / marked) * 100)}%` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <span className="text-[11px] text-dim">
          Trafność = zakupy zaplanowane wśród oznaczonych. Impulsy łącznie: {sum(log.map((l) => l.impulse.count))} na {zl(sum(log.map((l) => l.impulse.amount)))}.
        </span>
        {/* What was written in the log (AP-20, SW sp. 11), the newest first – a click opens the operation. */}
        {logWritten.total > 0 && (
          <div className="mt-1.5 flex flex-col border-t border-line pt-1 text-[11.5px]" data-testid="intel-log-entries">
            <span className="label pb-0.5">Wpisy dziennika</span>
            {logWritten.entries.map((e) => (
              <button
                key={e.id}
                type="button"
                className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-baseline gap-x-2 py-[2px] text-left hover:bg-hover"
                onClick={() => openOperation({ id: e.id, date: e.date })}
                title="Pokaż operację"
                data-testid="intel-log-entry"
              >
                <span className="num text-muted">{plDate(e.date)}</span>
                <span className="min-w-0 truncate">
                  <span className="text-fg-strong">„{e.note}”</span>
                  <span className="text-dim">
                    {' '}
                    · {e.name || 'wydatek'}
                    {e.impulse ? ` · ${e.impulse === 'plan' ? 'plan' : 'impuls'}` : ''}
                  </span>
                </span>
                <span className="num text-right">{plnText(e.amount)}</span>
              </button>
            ))}
            {logWritten.total > logWritten.entries.length && (
              <span className="pt-0.5 text-[11px] text-dim">
                {logWritten.entries.length} najnowszych z {logWritten.total} – reszta w Operacjach (filtr znaczników).
              </span>
            )}
          </div>
        )}
      </Panel>
    </div>
  )
}
