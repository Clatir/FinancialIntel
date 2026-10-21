import { useContext, useMemo } from 'react'
import { envelopeExtraOf } from '@shared/calc/plan'
import { yearPlan, type YearCell, type YearRow } from '@shared/calc/yearPlan'
import { listOf, useData } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { useRecordList } from '../../store/records'
import { AmountField, plnText } from '../../components/fields'
import { CompactContext, Panel, cx } from '../../components/ui'
import { IconBack, IconNext } from '../../components/icons'
import { monthGenLabel, monthLabel } from '../../lib/format'
import { useCategories } from '../operations/pickers'
import { copyOnward, setEnvelope, setSalary, usePlans } from './actions'

const MONTH_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
const zl = (g: number) => `${plnText(g)} zł`
const KIND_NOTE: Record<YearRow['kind'], string> = { salary: 'fakt: koszty', planned: 'planowa', daily: 'codzienna' }

/**
 * „Plan kampanii” (F37): the salary and each envelope over the 12 months of a year – the limit in force (a month with
 * its own plan in full colour), the fact under it, the same month a year before in the tooltip (the season). The current
 * month and the ones ahead are edited in place; „»” copies a value to the rest of the year. A month past keeps its plan.
 */
export function YearPlanPanel({ year, today, readOnly, onYear, onMonth }: { year: string; today: string; readOnly: boolean; onYear: (year: string) => void; onMonth: (month: string) => void }) {
  const plans = usePlans()
  const transactionsMap = useData((s) => s.records.transactions)
  const containers = useRecordList('containers')
  const categories = useData((s) => s.fi?.settings.categories)
  const cats = useCategories()
  const fleet = useFleet()
  // The phone (T311): wider months to scroll through, the row's name kept in sight.
  const compact = useContext(CompactContext)
  const pinned = compact ? 'sticky left-0 z-[1] max-w-[120px] bg-panel' : ''
  const plan = useMemo(() => {
    if (!categories) return null
    // What the engine added to the limits of the months it ran (F28): the loot kept, the covers.
    const log = fleet?.log ?? []
    const extraOf = (m: string) => (m <= today.slice(0, 7) ? envelopeExtraOf(log, m, plans) : new Map<string, number>())
    return yearPlan(year, { plans, categories, transactions: listOf(transactionsMap), containers, today, extraOf })
  }, [year, plans, categories, transactionsMap, containers, today, fleet])
  if (!plan) return null
  const label = (r: YearRow) => (r.id === 'salary' ? 'Pensja' : cats.label(r.id))
  const prev = String(Number(year) - 1)
  const next = String(Number(year) + 1)
  return (
    <Panel
      title={`Plan kampanii ${year}`}
      name="Plan kampanii"
      testId="year-plan"
      actions={
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost h-[22px] px-1" onClick={() => onYear(prev)} title={`Rok ${prev}`} aria-label="Poprzedni rok" data-testid="year-plan-prev">
            <IconBack size={14} />
          </button>
          <button className="btn btn-ghost h-[22px] px-1" onClick={() => onYear(next)} title={`Rok ${next}`} aria-label="Następny rok" data-testid="year-plan-next">
            <IconNext size={14} />
          </button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className={cx('border-collapse text-[11.5px]', compact ? 'w-[1136px] table-fixed' : 'w-full min-w-[900px]')} data-testid="year-plan-grid">
          <thead>
            <tr className="text-[10.5px] text-dim">
              <th className={cx('w-[120px] py-1 pr-2 text-left font-normal', pinned)}>pozycja</th>
              {plan.months.map((m, i) => (
                <th key={m} className={cx('px-0.5 py-1 text-right font-normal', compact && 'w-[76px]')}>
                  <button className={cx('hover:text-accent', m === today.slice(0, 7) && 'text-accent')} onClick={() => onMonth(m)} title={monthLabel(m)} data-testid="year-plan-month">
                    {MONTH_SHORT[i]}
                  </button>
                </th>
              ))}
              <th className={cx('py-1 pl-2 text-right font-normal', compact ? 'w-[104px]' : 'w-[84px]')}>rok</th>
            </tr>
          </thead>
          <tbody>
            {plan.rows.map((r) => (
              <tr key={r.id} className="border-t border-line" data-testid="year-row" data-id={r.id} data-name={label(r)}>
                <td className={cx('py-1 pr-2 align-top', pinned)}>
                  <div className="truncate text-fg">{label(r)}</div>
                  <div className="text-[10px] text-dim">{KIND_NOTE[r.kind]}</div>
                </td>
                {r.cells.map((c) => (
                  <Cell key={c.month} row={r} cell={c} name={label(r)} readOnly={readOnly} />
                ))}
                <td className="whitespace-nowrap py-1 pl-2 text-right align-top" data-testid="year-row-total">
                  <div className="num text-fg-strong">{zl(r.total)}</div>
                  {r.cells.some((c) => c.spent != null) && (
                    <div className={cx('num text-[10px]', r.spent > r.total ? 'text-accent' : 'text-dim')} title="Fakt do dziś">
                      {zl(r.spent)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[10.5px] text-dim">
        Pełny kolor – miesiąc z własnym planem; przygaszony – bierze plan ostatniego wcześniejszego. Pod limitem fakt (akcent – ponad limit z zapasem i pokryciami, „+” / „−” – limit miesiąca
        zmieniony nimi), w podpowiedzi ten sam miesiąc rok wcześniej. „»” kopiuje wartość na resztę roku.
      </p>
    </Panel>
  )
}

function Cell({ row, cell, name, readOnly }: { row: YearRow; cell: YearCell; name: string; readOnly: boolean }) {
  const title = `${monthLabel(cell.month)}${cell.extra ? ` · limit w miesiącu ${zl(Math.max(0, (cell.limit ?? 0) + cell.extra))} (w tym ${cell.extra > 0 ? '+' : '−'}${zl(Math.abs(cell.extra))} zapasu i pokryć)` : ''} · rok wcześniej: ${zl(cell.yearAgo)}`
  const set = (v: number | null) => (row.id === 'salary' ? setSalary(cell.month, v ?? 0) : setEnvelope(cell.month, row.id, v))
  return (
    <td className="group px-0.5 py-1 text-right align-top" title={title} data-testid="year-cell" data-month={cell.month} data-own={cell.own || undefined} data-over={cell.over || undefined}>
      {cell.editable && !readOnly ? (
        <div className="relative">
          <AmountField
            className={cx('h-[20px] w-full min-w-[58px] px-1 text-[11px]', !cell.own && 'text-dim')}
            value={cell.limit}
            allowEmpty={row.id !== 'salary'}
            placeholder="—"
            onChange={set}
            aria-label={`${name}, ${monthLabel(cell.month)}`}
            data-testid="year-cell-input"
          />
          <button
            className="absolute -top-[9px] right-0 h-[12px] border border-line bg-raised px-0.5 text-[10px] leading-[10px] text-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:text-accent focus:opacity-100"
            onClick={() => copyOnward(cell.month, row.id, name)}
            title="Kopiuj tę wartość na dalsze miesiące roku"
            aria-label={`Kopiuj ${name} od ${monthGenLabel(cell.month)} na dalsze miesiące`}
            data-testid="year-cell-copy"
          >
            »
          </button>
        </div>
      ) : (
        <div className={cx('num', cell.own ? 'text-fg' : 'text-dim')} data-testid="year-cell-limit">
          {cell.limit == null ? '—' : plnText(cell.limit)}
        </div>
      )}
      {cell.spent != null && (
        <div className={cx('num text-[10px]', cell.over ? 'text-accent' : 'text-dim')} data-testid="year-cell-spent">
          {cell.extra ? <span className="mr-1 text-muted">{cell.extra > 0 ? '+' : '−'}</span> : null}
          {plnText(cell.spent)}
        </div>
      )}
    </td>
  )
}
