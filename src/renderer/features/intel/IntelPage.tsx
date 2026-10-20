/**
 * Wywiad (spec „Wywiad i raporty”, E8, D73): the structure of the own money in the language of ICT – the wealth week by
 * week with its drawdown and BOS / CHoCH (1.10.0: beside it the net worth – F24), the fuel balance of the months (F25),
 * the killzones of spending, the FVG of the envelopes (plan against fact), the spending over time with the cargo as the
 * Order Block – to the detail (F20) –, the brands, a month against its averages, the range forecast without any payout,
 * the expeditions (F17), the personal inflation (F36), the captain's log.
 */
import { useMemo, useState } from 'react'
import { addDays, addMonths, monthOf, monthRange } from '@shared/calc/dates'
import { glossaryOf } from '@shared/glossary'
import { openDays, scheduledDays } from '@shared/calc/scheduled'
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
import { monthGenLabel, monthLabel, plDate } from '../../lib/format'
import { useCategories } from '../operations/pickers'
import { KillzoneMap, WealthChart } from './charts'
import { CoursePanel, ManeuverPanel, useCourseInput } from './Course'
import { useNetWorth, useWealth } from './wealth'
import { ComparisonPanel, SpendingTable, TargetsPanel } from './Drill'
import { ExpeditionsPanel } from './Expeditions'
import { FuelPanel } from './Fuel'
import { InflationPanel } from './Inflation'

const zl = (g: number) => `${plnText(g)} zł`
type Period = '3' | '6' | '12'
const PERIODS: Array<{ value: Period; label: string }> = [
  { value: '3', label: '3 mies.' },
  { value: '6', label: '6 mies.' },
  { value: '12', label: '12 mies.' }
]

/** Which line of the wealth the structure and the drawdown read (F24), kept on this computer. */
type Basis = 'accounts' | 'net'
const BASIS_KEY = 'fi.intel.wealthBasis'
function readBasis(): Basis {
  try {
    return localStorage.getItem(BASIS_KEY) === 'net' ? 'net' : 'accounts'
  } catch {
    return 'accounts'
  }
}

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
  const accounts = useWealth(today)
  const net = useNetWorth(accounts.points, today, fleet?.household ?? null)
  const [basis, setBasisState] = useState<Basis>(readBasis)
  const setBasis = (b: Basis) => {
    setBasisState(b)
    try {
      localStorage.setItem(BASIS_KEY, b)
    } catch {
      /* storage unavailable: the choice lives for the session */
    }
  }
  // The line the structure, the peak and the drawdown are of; the other one drawn thin beside it.
  const chosen = basis === 'net' && net.points.length ? net : accounts
  const { points: wealth, ...structure } = chosen
  const second = chosen === net ? accounts.points : net.points
  const months = useMemo(() => (month ? monthRange(addMonths(month, -(Number(period) - 1)), month) : []), [month, period])
  const killzones = useMemo(() => (today && months.length ? killzoneGrid(transactions, `${months[0]}-01`, today) : null), [transactions, months, today])
  const spending = useMemo(() => spendingByMonth(transactions, settings?.categories ?? [], months), [transactions, settings, months])
  const log = useMemo(() => (settings ? logAccuracy(transactions, settings.orders, months) : []), [transactions, settings, months])
  const [fvgMonth, setFvgMonth] = useState<string | null>(null)
  // The buoys' money by month for the range's variant (F16): their open days of two years, a late one this month.
  const scheduled = useRecordList('scheduled')
  const buoys = useMemo(() => {
    if (!today || !month) return undefined
    const out = new Map<string, number>()
    for (const d of openDays(scheduledDays(scheduled, transactions, today, addDays(today, -33), addDays(today, 760))))
      if (d.scheduled.amount != null) out.set(d.date < today ? month : monthOf(d.date), (out.get(d.date < today ? month : monthOf(d.date)) ?? 0) + d.scheduled.amount)
    return out
  }, [scheduled, transactions, today, month])
  const courseInput = useCourseInput(fleet)
  if (!fleet || !settings) return <Empty>Wczytywanie…</Empty>
  const fvgOf = fvgMonth ?? (fleet.start && addMonths(fleet.month, -1) >= fleet.start.slice(0, 7) ? addMonths(fleet.month, -1) : fleet.month)
  const brief = debriefing(fvgOf, { transactions, categories: settings.categories, plans, log: fleet.log, alarms: fleet.alarms, containers, today: fleet.today })
  const forecast = rangeForecast({ shields: fleet.shields.amount, hull: fleet.hull.amount, debt: fleet.debt, costs: fleet.costs.average, month: fleet.month, plans: buoys })
  const peak = wealth.length ? Math.max(...wealth.map((p) => p.value)) : 0
  const maxDd = wealth.reduce((m, p) => Math.min(m, p.drawdown), 0)
  const maxSpend = Math.max(1, ...spending.rows.flatMap((r) => r.values), ...spending.cargo)
  const lastNet = net.points.at(-1)
  const lastAccounts = accounts.points.at(-1)
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Segmented
                      size="sm"
                      value={chosen === net ? 'net' : 'accounts'}
                      onChange={setBasis}
                      options={[
                        { value: 'accounts', label: 'na kontach', title: 'Suma sald kont budżetu' },
                        { value: 'net', label: 'siła floty netto', title: 'Konta + należności (domownicy, pożyczki udzielone) − dług (pożyczki wzięte, pieniądze domowników)' }
                      ]}
                      aria-label="Linia majątku"
                    />
                    <span className="text-[11px] text-dim">struktura i drawdown liczone na wybranej linii, druga – przerywana</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-4">
                    <Fact label="Na kontach" value={lastAccounts ? zl(lastAccounts.value) : '—'} strong={chosen !== net} testId="intel-wealth-accounts" />
                    {lastNet && <Fact label="Siła floty netto" value={zl(lastNet.value)} strong={chosen === net} testId="intel-wealth-net" />}
                    <Fact label="Szczyt" value={zl(peak)} />
                    <Fact label="Największy drawdown" value={zl(maxDd)} />
                    <Fact
                      label="Struktura"
                      value={structure.trend === 'up' ? 'bullish – wyższe szczyty' : structure.trend === 'down' ? 'bearish – niższe dołki' : 'bez struktury'}
                      testId="intel-trend"
                    />
                  </div>
                  <WealthChart points={wealth} marks={structure.marks} net={second} />
                  <span className="text-[11px] text-dim">
                    Na kontach – suma sald kont budżetu na koniec każdego tygodnia, z pieniędzmi pożyczonymi i depozytem domowników. Siła floty netto – do tego należności
                    (domownicy, pożyczki udzielone) minus dług (pożyczki wzięte, pieniądze domowników na kontach): wzięta pożyczka jej nie podnosi. BOS – przebicie
                    ostatniego swingu zgodnie z trendem, CHoCH – pierwsze przebicie przeciw trendowi (zmiana charakteru). Pod spodem drawdown od szczytu.
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
            <FuelPanel fleet={fleet} />
            <Panel title="Wydatki w czasie" testId="intel-spending">
              <SpendingTable months={months} spending={spending} max={maxSpend} />
            </Panel>
            <TargetsPanel from={`${months[0] ?? fleet.month}-01`} to={fleet.today} aliases={settings.import.aliases} />
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
            <ComparisonPanel month={fleet.month} start={fleet.start} covered={fleet.historyMonths} />
            <Panel title="Prognoza zasięgu" testId="intel-range">
              <div className="flex flex-col gap-1.5 text-[12px]">
                <span className="text-fg-strong" data-testid="intel-range-text">
                  {forecast.emptyIn == null
                    ? 'Brak średnich kosztów – prognoza po pierwszym pełnym miesiącu.'
                    : `Bez żadnej wypłaty paliwa starczy na ${rangeText(forecast.emptyIn)} (${monthLabel(addMonths(fleet.month, Math.floor(forecast.emptyIn)))}).`}
                </span>
                {forecast.plansEmpty !== undefined && (
                  <span className="text-[11.5px] text-muted" data-testid="intel-range-plans">
                    Z bojami (zaplanowane wydatki i wpływy): {forecast.plansEmpty ? `do ${monthGenLabel(forecast.plansEmpty)}` : 'starczy dłużej niż prognoza'} – druga kreska w każdym miesiącu.
                  </span>
                )}
                {forecast.points.map((p) => (
                  <div key={p.month} className="flex items-center gap-2 text-[11.5px]">
                    <span className="w-[70px] text-dim">{monthLabel(p.month).slice(0, 3)} {p.month.slice(2, 4)}</span>
                    <div className="flex flex-1 flex-col gap-[2px]">
                      <div className="h-[5px] bg-line">
                        <div className="h-full bg-accent" style={{ width: `${forecast.points[0]!.fuel ? (p.fuel / forecast.points[0]!.fuel) * 100 : 0}%` }} />
                      </div>
                      {p.withPlans != null && (
                        <div className="h-[3px] bg-line" title={`Z bojami: ${zl(p.withPlans)}`}>
                          <div className="h-full bg-fg-strong" style={{ width: `${forecast.points[0]!.fuel ? Math.min(100, (p.withPlans / forecast.points[0]!.fuel) * 100) : 0}%` }} />
                        </div>
                      )}
                    </div>
                    <span className="num w-[90px] text-right">{plnText(p.fuel)}</span>
                  </div>
                ))}
                <span className="text-[11px] text-dim">Osłony (bufor na pensje) i kadłub (fundusz awaryjny) pomniejszone o dług, wydawane po średnich kosztach netto.</span>
              </div>
            </Panel>
            <CoursePanel fleet={fleet} input={courseInput} />
            <ManeuverPanel fleet={fleet} input={courseInput} />
            <ExpeditionsPanel />
            <InflationPanel fleet={fleet} />
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
