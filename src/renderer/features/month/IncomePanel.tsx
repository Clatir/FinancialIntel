import type { FleetState } from '@shared/calc/fleet'
import type { IncomeFigures, IncomeWindow } from '@shared/calc/income'
import { plnText } from '../../components/fields'
import { Panel, cx } from '../../components/ui'

const zl = (grosze: number | null) => (grosze == null ? '—' : `${plnText(grosze)} zł`)

const COLUMNS = [
  { key: '3', label: '3 mies.' },
  { key: '6', label: '6 mies.' },
  { key: '12', label: '12 mies.' },
  { key: 'median', label: 'mediana' }
] as const

const LINES: Array<{ key: keyof IncomeFigures; label: string; title: string }> = [
  { key: 'work', label: 'Praca i inne', title: 'Wpływy bez przelewów własnych, spłat i zaliczek domowników (D81)' },
  { key: 'trading', label: 'Trading (XTB)', title: 'Wypłaty z konta tradingowego minus dopłaty, bez puli Podatek (rezerwa na PIT-38)' },
  { key: 'total', label: 'Razem', title: 'Praca i inne + trading' }
]

/**
 * „Przychody” (D81): what came in as mine on average – of the last 3, 6 and 12 full months and their median (a single
 * bonus does not move it) – work and trading apart, against the salary paid to myself.
 */
export function IncomePanel({ fleet, salary, testId = 'income-panel' }: { fleet: Pick<FleetState, 'incomeStats'>; salary: number | null; testId?: string }) {
  const s = fleet.incomeStats
  const cols: Record<(typeof COLUMNS)[number]['key'], IncomeWindow> = { '3': s.windows[3], '6': s.windows[6], '12': s.windows[12], median: s.median }
  const avg6 = s.windows[6].total
  const diff = avg6 != null && salary != null && salary > 0 ? avg6 - salary : null
  return (
    <Panel title="Przychody" testId={testId}>
      {!s.months.length ? (
        <p className="text-[11.5px] text-muted">Średnie będą po pierwszym pełnym miesiącu historii.</p>
      ) : (
        <div className="flex flex-col gap-1.5 text-[12px]">
          <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,minmax(64px,auto))] items-baseline gap-x-3 gap-y-0.5">
            <span />
            {COLUMNS.map((c) => (
              <span key={c.key} className="text-right text-[11px] text-muted" title={cols[c.key].months < Number(c.key) ? `z ${cols[c.key].months} pełnych mies.` : undefined}>
                {c.label}
              </span>
            ))}
            {LINES.map((l) => (
              <IncomeRow key={l.key} label={l.label} title={l.title} values={COLUMNS.map((c) => cols[c.key][l.key])} strong={l.key === 'total'} testId={`income-${l.key}`} />
            ))}
          </div>
          {s.months.length < 12 && <span className="text-[11px] text-dim">Pełnych miesięcy historii: {s.months.length} – dłuższe okna liczą tyle, ile jest.</span>}
          {diff != null && (
            <span className="text-[11.5px] text-muted" data-testid="income-vs-salary">
              Pensja {zl(salary)} · średni przychód (6 mies.) {zl(avg6)} →{' '}
              <span className={cx('num', diff < 0 ? 'text-down' : 'text-up')}>
                {diff < 0 ? '−' : '+'}
                {plnText(Math.abs(diff))} zł / mies.
              </span>
            </span>
          )}
        </div>
      )}
    </Panel>
  )
}

function IncomeRow({ label, title, values, strong, testId }: { label: string; title: string; values: Array<number | null>; strong?: boolean; testId: string }) {
  return (
    <>
      <span className={cx('truncate', strong ? 'text-fg-strong' : 'text-muted')} title={title}>
        {label}
      </span>
      {values.map((v, i) => (
        <span key={i} className={cx('num text-right', strong ? 'text-fg-strong' : 'text-fg')} data-testid={`${testId}-${COLUMNS[i]!.key}`}>
          {zl(v)}
        </span>
      ))}
    </>
  )
}
