/**
 * Wywiad (spec „Wywiad i raporty”, E8, D73): the structure of the own money in the language of ICT – the wealth week by
 * week with its drawdown and BOS / CHoCH, the killzones of spending, the FVG of the envelopes (plan against fact), the
 * spending over time with the cargo as the Order Block, the range forecast without any payout, the captain's log.
 */
import { useMemo, useState } from 'react'
import { addMonths, monthRange } from '@shared/calc/dates'
import { killzoneGrid, logAccuracy, rangeForecast, spendingByMonth } from '@shared/calc/intel'
import { debriefing } from '@shared/calc/plan'
import { sum } from '@shared/calc/operations'
import { rangeText } from '@shared/format'
import { useData } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { useRecordList } from '../../store/records'
import { plnText } from '../../components/fields'
import { Meter } from '../../components/meters'
import { Columns } from '../../components/layout'
import { Empty, Panel, Segmented, cx } from '../../components/ui'
import { monthLabel, plDate } from '../../lib/format'
import { useCategories } from '../operations/pickers'
import { KillzoneMap, WealthChart } from './charts'
import { useWealth } from './wealth'

const zl = (g: number) => `${plnText(g)} zł`
type Period = '3' | '6' | '12'
const PERIODS: Array<{ value: Period; label: string }> = [
  { value: '3', label: '3 mies.' },
  { value: '6', label: '6 mies.' },
  { value: '12', label: '12 mies.' }
]

export function IntelPage() {
  const fleet = useFleet()
  const settings = useData((s) => s.fi?.settings ?? null)
  const transactions = useRecordList('transactions')
  const plans = useRecordList('months')
  const containers = useRecordList('containers')
  const cats = useCategories()
  const [period, setPeriod] = useState<Period>('6')
  // The day and the month only: the fleet is a new object every minute, the analyses change with the day.
  const today = fleet?.today ?? null
  const month = fleet?.month ?? null
  const { points: wealth, ...structure } = useWealth(today)
  const months = useMemo(() => (month ? monthRange(addMonths(month, -(Number(period) - 1)), month) : []), [month, period])
  const killzones = useMemo(() => (today && months.length ? killzoneGrid(transactions, `${months[0]}-01`, today) : null), [transactions, months, today])
  const spending = useMemo(() => spendingByMonth(transactions, settings?.categories ?? [], months), [transactions, settings, months])
  const log = useMemo(() => (settings ? logAccuracy(transactions, settings.orders, months) : []), [transactions, settings, months])
  const [fvgMonth, setFvgMonth] = useState<string | null>(null)
  if (!fleet || !settings) return <Empty>Wczytywanie…</Empty>
  const fvgOf = fvgMonth ?? (fleet.start && addMonths(fleet.month, -1) >= fleet.start.slice(0, 7) ? addMonths(fleet.month, -1) : fleet.month)
  const brief = debriefing(fvgOf, { transactions, categories: settings.categories, plans, log: fleet.log, alarms: fleet.alarms, containers, today: fleet.today })
  const forecast = rangeForecast({ shields: fleet.shields.amount, hull: fleet.hull.amount, debt: fleet.debt, costs: fleet.costs.average, month: fleet.month })
  const last = wealth.at(-1)
  const peak = wealth.length ? Math.max(...wealth.map((p) => p.value)) : 0
  const maxDd = wealth.reduce((m, p) => Math.min(m, p.drawdown), 0)
  const maxSpend = Math.max(1, ...spending.rows.flatMap((r) => r.values), ...spending.cargo)
  const fvgMonths = monthRange(fleet.start ? fleet.start.slice(0, 7) : fleet.month, fleet.month).reverse().slice(0, 12)
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-intel">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Wywiad</h1>
        <span className="text-[12px] text-muted">struktura pieniędzy w języku ICT</span>
        <span className="flex-1" />
        <Segmented size="sm" value={period} onChange={setPeriod} options={PERIODS} aria-label="Okres analiz" />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Columns id="intel" tracks={['minmax(460px,3fr)', 'minmax(360px,2fr)']} className="grid min-h-full items-start">
          <div className="flex min-w-0 flex-col">
            <Panel title="Krzywa majątku" testId="intel-wealth">
              {wealth.length < 2 ? (
                <Empty>Za mało danych – krzywa pojawi się po dwóch tygodniach historii.</Empty>
              ) : (
                <div className="flex flex-col gap-2 text-[12px]">
                  <div className="flex flex-wrap items-baseline gap-4">
                    <Fact label="Na kontach" value={last ? zl(last.value) : '—'} strong />
                    <Fact label="Szczyt" value={zl(peak)} />
                    <Fact label="Największy drawdown" value={zl(maxDd)} />
                    <Fact
                      label="Struktura"
                      value={structure.trend === 'up' ? 'bullish – wyższe szczyty' : structure.trend === 'down' ? 'bearish – niższe dołki' : 'bez struktury'}
                      testId="intel-trend"
                    />
                  </div>
                  <WealthChart points={wealth} marks={structure.marks} />
                  <span className="text-[11px] text-dim">
                    Suma sald kont budżetu na koniec każdego tygodnia – z pieniędzmi pożyczonymi i depozytem domowników (zasięg i klasa okrętu odejmują
                    dług). BOS – przebicie ostatniego swingu zgodnie z trendem, CHoCH – pierwsze przebicie przeciw
                    trendowi (zmiana charakteru). Pod spodem drawdown od szczytu.
                  </span>
                  {structure.marks.length > 0 && (
                    <div className="flex flex-col" data-testid="intel-marks">
                      {structure.marks
                        .slice(-5)
                        .reverse()
                        .map((m) => (
                          <span key={m.date + m.kind} className="text-[11.5px]">
                            <span className="num text-dim">{plDate(m.date)}</span> <span className={m.kind === 'choch' ? 'text-accent' : 'text-fg-strong'}>{m.kind === 'choch' ? 'CHoCH' : 'BOS'}</span>{' '}
                            {m.direction === 'up' ? 'w górę' : 'w dół'} – poziom {zl(m.level)}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </Panel>
            <Panel title="Wydatki w czasie" testId="intel-spending">
              <div className="overflow-x-auto">
                <table className="w-full text-[11.5px]">
                  <thead>
                    <tr className="text-dim">
                      <th className="py-0.5 pr-2 text-left font-normal">Kategoria</th>
                      {months.map((m) => (
                        <th key={m} className="px-1 text-right font-normal">
                          {monthLabel(m).slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <SpendRow label="Order Block · ładownia" values={spending.cargo} max={maxSpend} accent title="Kontenery ładowni – stała strefa kosztów (Order Block)" testId="intel-order-block" />
                    {spending.rows.map((r) => (
                      <SpendRow key={r.id} label={r.id === '-' ? 'bez kategorii' : cats.label(r.id)} values={r.values} max={maxSpend} />
                    ))}
                    <tr className="border-t border-line text-fg-strong">
                      <td className="py-0.5 pr-2">Razem</td>
                      {spending.totals.map((v, i) => (
                        <td key={months[i]} className="num px-1 text-right">
                          {plnText(v)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="Killzones wydatków" testId="intel-killzones-panel">
              {!killzones || !killzones.withTime ? (
                <Empty>Brak zakupów z godziną w tym okresie – godzinę mają wpisy z szybkiego wpisu i Operacji (import z mBanku jej nie ma).</Empty>
              ) : (
                <div className="flex flex-col gap-1.5 text-[12px]">
                  <KillzoneMap cells={killzones.cells} />
                  <span className="text-[11px] text-dim">
                    Zakupy z godziną: {killzones.withTime}, bez godziny: {killzones.withoutTime}. Najjaśniejsze pole (z obwódką) to Twoja killzone wydatków.
                  </span>
                </div>
              )}
            </Panel>
          </div>
          <div className="flex min-w-0 flex-col">
            <Panel title={`FVG kopert – ${monthLabel(fvgOf)}`} name="FVG kopert" testId="intel-fvg">
              <div className="flex flex-col gap-1.5 text-[12px]">
                <select className="input h-[24px] self-start" value={fvgOf} onChange={(e) => setFvgMonth(e.currentTarget.value)} aria-label="Miesiąc FVG" data-testid="intel-fvg-month">
                  {fvgMonths.map((m) => (
                    <option key={m} value={m}>
                      {monthLabel(m)}
                    </option>
                  ))}
                </select>
                {!brief.envelopes.length && <span className="text-muted">Bez kopert w tym miesiącu.</span>}
                {brief.envelopes.map((e) => (
                  <div key={e.categoryId} className="flex flex-col gap-0.5" data-testid="intel-fvg-row">
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate">{cats.label(e.categoryId)}</span>
                      <span className="num text-dim">
                        {plnText(e.spent)} / {plnText(e.limit)}
                      </span>
                      <span className={cx('num w-[96px] text-right', e.gap < 0 ? 'text-down' : 'text-up')}>{e.gap >= 0 ? `+${zl(e.gap)}` : zl(e.gap)}</span>
                    </div>
                    <Meter value={e.spent} max={e.limit} over />
                  </div>
                ))}
                <span className="text-[11px] text-dim">Fair Value Gap: luka między planem a faktem – na plus zostało w kopercie, na minus przekroczenie.</span>
              </div>
            </Panel>
            <Panel title="Prognoza zasięgu" testId="intel-range">
              <div className="flex flex-col gap-1.5 text-[12px]">
                <span className="text-fg-strong" data-testid="intel-range-text">
                  {forecast.emptyIn == null
                    ? 'Brak średnich kosztów – prognoza po pierwszym pełnym miesiącu.'
                    : `Bez żadnej wypłaty paliwa starczy na ${rangeText(forecast.emptyIn)} (${monthLabel(addMonths(fleet.month, Math.floor(forecast.emptyIn)))}).`}
                </span>
                {forecast.points.map((p) => (
                  <div key={p.month} className="flex items-center gap-2 text-[11.5px]">
                    <span className="w-[70px] text-dim">{monthLabel(p.month).slice(0, 3)} {p.month.slice(2, 4)}</span>
                    <div className="h-[5px] flex-1 bg-line">
                      <div className="h-full bg-accent" style={{ width: `${forecast.points[0]!.fuel ? (p.fuel / forecast.points[0]!.fuel) * 100 : 0}%` }} />
                    </div>
                    <span className="num w-[90px] text-right">{plnText(p.fuel)}</span>
                  </div>
                ))}
                <span className="text-[11px] text-dim">Osłony (bufor na pensje) i kadłub (fundusz awaryjny) pomniejszone o dług, wydawane po średnich kosztach netto.</span>
              </div>
            </Panel>
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
            </Panel>
          </div>
        </Columns>
      </div>
    </div>
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

function SpendRow({ label, values, max, accent, title, testId }: { label: string; values: number[]; max: number; accent?: boolean; title?: string; testId?: string }) {
  return (
    <tr className={cx(accent && 'bg-accent-soft')} title={title} data-testid={testId}>
      <td className={cx('max-w-[180px] truncate py-0.5 pr-2', accent ? 'text-accent' : 'text-fg')}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-1 text-right">
          <div className="flex flex-col items-end">
            <span className="num">{v ? plnText(v) : '—'}</span>
            <div className="h-[2px] bg-accent/60" style={{ width: `${Math.round((Math.max(0, v) / max) * 60)}px` }} />
          </div>
        </td>
      ))}
    </tr>
  )
}
