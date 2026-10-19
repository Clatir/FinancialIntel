/**
 * Wywiad → „Bilans paliwa” (1.10.0, F25): what each of the last 12 months added to the ship – the income less the net
 * costs – and the savings rate with its medians; beside it the variant without the trading (does the work alone cover
 * the costs).
 */
import { useMemo } from 'react'
import { glossaryOf } from '@shared/glossary'
import { addMonths } from '@shared/calc/dates'
import { fuelMonths, fuelSummary, fuelWindow, rateText } from '@shared/calc/fuel'
import type { FleetState } from '@shared/calc/fleet'
import { amountsHidden, plnText, signedPln } from '../../components/fields'
import { Empty, Panel, cx } from '../../components/ui'
import { monthLabel } from '../../lib/format'
import { useRecordList } from '../../store/records'

export function FuelPanel({ fleet }: { fleet: FleetState }) {
  const transactions = useRecordList('transactions')
  const ctx = fleet.incomeContext
  const covered = fleet.historyMonths
  // The full months the history sees, newest first: the running month is still being spent.
  const months = useMemo(() => {
    const have = new Set(covered)
    return fuelWindow(addMonths(fleet.month, -1)).filter((m) => have.has(m))
  }, [covered, fleet.month])
  const rows = useMemo(() => fuelMonths(transactions, ctx, months).reverse(), [transactions, ctx, months])
  const summary = useMemo(() => fuelSummary(transactions, ctx, fleet.month, covered), [transactions, ctx, fleet.month, covered])
  return (
    <Panel title="Bilans paliwa" hint={glossaryOf('Bilans paliwa')} testId="intel-fuel">
      {!rows.length ? (
        <Empty>Bilans pojawi się po pierwszym pełnym miesiącu historii.</Empty>
      ) : (
        <div className="flex flex-col gap-1.5 text-[12px]">
          <div className="flex flex-wrap items-baseline gap-4">
            <Fact label="Stopa oszczędności · mediana 6 mies." value={rateText(summary.median6)} strong testId="intel-fuel-median6" />
            <Fact label="mediana 12 mies." value={rateText(summary.median12)} />
            <Fact label="bez tradingu · 6 mies." value={rateText(summary.workMedian6)} testId="intel-fuel-work" />
            {summary.trend && <Fact label="trend (3 mies.)" value={summary.trend === 'up' ? 'rośnie' : 'spada'} />}
          </div>
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="text-dim">
                <th className="py-0.5 text-left font-normal">Miesiąc</th>
                <th className="px-1 text-right font-normal">przychód</th>
                <th className="px-1 text-right font-normal">koszty</th>
                <th className="px-1 text-right font-normal">bilans</th>
                <th className="px-1 text-right font-normal">stopa</th>
                <th className="px-1 text-right font-normal">bez tradingu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-t border-line/50" data-testid="intel-fuel-row" data-month={r.month}>
                  <td className="py-0.5">{monthLabel(r.month)}</td>
                  <td className="num px-1 text-right">{plnText(r.income)}</td>
                  <td className="num px-1 text-right">{plnText(r.costs)}</td>
                  <td className={cx('num px-1 text-right', amountsHidden() ? 'text-muted' : r.balance > 0 ? 'text-up' : r.balance < 0 ? 'text-down' : 'text-muted')} data-testid="intel-fuel-balance">
                    {signedPln(r.balance)}
                  </td>
                  <td className="num px-1 text-right text-fg-strong" data-testid="intel-fuel-rate">
                    {rateText(r.rate)}
                  </td>
                  <td className="num px-1 text-right text-muted">{rateText(r.workRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="text-[11px] text-dim">
            Przychód – praca i trading netto (bez pieniędzy domowników); koszty netto jak w debriefingu. Bilans – ile miesiąc dołożył do okrętu, stopa oszczędności – bilans w % przychodu. Bez
            tradingu – czy praca sama pokrywa koszty.
          </span>
        </div>
      )}
    </Panel>
  )
}

function Fact({ label, value, strong, testId }: { label: string; value: string; strong?: boolean; testId?: string }) {
  return (
    <div className="flex flex-col">
      <span className="label">{label}</span>
      <span className={cx('num', strong ? 'text-[16px] text-fg-strong' : 'text-fg')} data-testid={testId}>
        {value}
      </span>
    </div>
  )
}
