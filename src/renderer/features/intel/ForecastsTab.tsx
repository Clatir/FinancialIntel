/**
 * Wywiad → „Prognozy” (D106 pt 6, UX-41): the range forecast without any payout (F16), the course for 12 months and the
 * maneuvers' simulator (F27, F35), the forecast for years beside the course (AP-44) – each with its own assumptions,
 * said in one sentence at the top.
 */
import { useMemo } from 'react'
import { addDays, monthOf } from '@shared/calc/dates'
import type { FleetState } from '@shared/calc/fleet'
import { rangeForecast } from '@shared/calc/intel'
import { openDays, scheduledDays } from '@shared/calc/scheduled'
import { rangeText } from '@shared/format'
import { plnText } from '../../components/fields'
import { Columns } from '../../components/layout'
import { Panel } from '../../components/ui'
import { monthGenLabel, monthLabel } from '../../lib/format'
import { useRecordList } from '../../store/records'
import { CoursePanel, ManeuverPanel, useCourseInput } from './Course'
import { ForecastPanel } from './Forecast'

const zl = (g: number) => `${plnText(g)} zł`

export function ForecastsTab({ fleet }: { fleet: FleetState }) {
  const transactions = useRecordList('transactions')
  const scheduled = useRecordList('scheduled')
  const { today, month } = fleet
  // The buoys' money by month for the range's variant (F16): their open days of two years, a late one this month.
  const buoys = useMemo(() => {
    const out = new Map<string, number>()
    for (const d of openDays(scheduledDays(scheduled, transactions, today, addDays(today, -33), addDays(today, 760))))
      if (d.scheduled.amount != null) out.set(d.date < today ? month : monthOf(d.date), (out.get(d.date < today ? month : monthOf(d.date)) ?? 0) + d.scheduled.amount)
    return out
  }, [scheduled, transactions, today, month])
  const forecast = useMemo(
    () =>
      rangeForecast({
        shields: fleet.shields.amount,
        hull: fleet.hull.amount,
        debt: fleet.debt,
        costs: fleet.costs.average,
        month,
        plans: buoys
      }),
    [fleet.shields.amount, fleet.hull.amount, fleet.debt, fleet.costs.average, month, buoys]
  )
  const courseInput = useCourseInput(fleet)
  return (
    <div className="flex flex-col" data-testid="intel-forecasts">
      <p className="border-b border-line px-4 py-2 text-[11.5px] text-muted" data-testid="intel-forecasts-note">
        Trzy prognozy, trzy zestawy założeń. Zasięg – ile paliwa starczy bez żadnej wypłaty, po średnich kosztach. Kurs na 12 miesięcy – miesiąc po miesiącu, z wpływami (mediana, średnia albo bez wypłat z XTB), planem miesiąca, bojami i ratami.
        Prognoza wieloletnia – scenariusze z własnymi założeniami o płacach, inflacji i dostawach; jej pierwszy rok to kurs. Symulator zmienia dane kursu, niczego nie zapisuje.
      </p>
      <Columns id="intel-forecasts" tracks={['minmax(460px,3fr)', 'minmax(360px,2fr)']} className="grid min-h-full items-start">
        <div className="flex min-w-0 flex-col">
          <CoursePanel fleet={fleet} input={courseInput} />
          {/* AP-44: the forecast for years beside the course – its first year is the course. */}
          <ForecastPanel fleet={fleet} input={courseInput} />
        </div>
        <div className="flex min-w-0 flex-col">
          <Panel title="Prognoza zasięgu" testId="intel-range">
            <div className="flex flex-col gap-1.5 text-[12px]">
              <span className="text-fg-strong" data-testid="intel-range-text">
                {forecast.emptyIn == null ? 'Brak średnich kosztów – prognoza po pierwszym pełnym miesiącu.' : `Bez żadnej wypłaty paliwa starczy na ${rangeText(forecast.emptyIn)} (${monthLabel(forecast.emptyMonth!)}).`}
              </span>
              {forecast.plansEmpty !== undefined && (
                <span className="text-[11.5px] text-muted" data-testid="intel-range-plans">
                  Z bojami (zaplanowane wydatki i wpływy): {forecast.plansEmpty ? `do ${monthGenLabel(forecast.plansEmpty)}` : 'starczy dłużej niż prognoza'} – druga kreska w każdym miesiącu.
                </span>
              )}
              {forecast.points.map((p) => (
                <div key={p.month} className="flex items-center gap-2 text-[11.5px]">
                  <span className="w-[70px] text-dim">
                    {monthLabel(p.month).slice(0, 3)} {p.month.slice(2, 4)}
                  </span>
                  <div className="flex flex-1 flex-col gap-[2px]">
                    <div className="h-[5px] bg-line">
                      <div
                        className="h-full bg-accent"
                        style={{
                          width: `${forecast.points[0]!.fuel ? (p.fuel / forecast.points[0]!.fuel) * 100 : 0}%`
                        }}
                      />
                    </div>
                    {p.withPlans != null && (
                      <div className="h-[3px] bg-line" title={`Z bojami: ${zl(p.withPlans)}`}>
                        <div
                          className="h-full bg-fg-strong"
                          style={{
                            width: `${forecast.points[0]!.fuel ? Math.min(100, (p.withPlans / forecast.points[0]!.fuel) * 100) : 0}%`
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <span className="num w-[90px] text-right">{plnText(p.fuel)}</span>
                </div>
              ))}
              <span className="text-[11px] text-dim">Osłony (bufor na pensje) i kadłub (fundusz awaryjny) pomniejszone o dług, wydawane po średnich kosztach netto.</span>
            </div>
          </Panel>
          <ManeuverPanel fleet={fleet} input={courseInput} />
        </div>
      </Columns>
    </div>
  )
}
