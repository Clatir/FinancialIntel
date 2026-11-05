/**
 * Wywiad (1.17.0, AP-44): the forecast for years beside the course for 12 months – three scenarios of the net worth at
 * each year's end (`calc/forecast.ts`, T485–T487): a chart, the table of the years, the goals' months, the shields' end
 * and the first lack; the scenarios' assumptions edited here and kept in fi.json (`settings.intel.forecast`, T488),
 * the years shown on this computer. A forecast, not a guarantee – its assumptions are said under it (T489).
 */
import { useMemo, useState } from 'react'
import type { CourseInput } from '@shared/calc/course'
import type { FleetState } from '@shared/calc/fleet'
import {
  assumptionsOf,
  FORECAST_DEFAULTS,
  FORECAST_SCENARIOS,
  forecastInputOf,
  forecasts,
  sameAssumptions,
  SCENARIO_LABEL,
  type Forecast,
  type ForecastAssumptions,
  type ForecastScenario
} from '@shared/calc/forecast'
import { countLabel, decimalText, percentText, plMonth as mm, rangeText } from '@shared/format'
import { AmountField, amountsHidden, plnText } from '../../components/fields'
import { NumberField, Panel, Segmented, cx } from '../../components/ui'
import { updateSettings, useData } from '../../store/data'
import { useRecordList } from '../../store/records'
import { toast } from '../../store/ui'
import { useCargoStatuses } from '../cargo/status'

const zl = (g: number) => `${plnText(g)} zł`
/** A month of the forecast: this month – „teraz” (as the course). */
const eta = (m: string | null, now: string, none: string) => (m == null ? none : m === now ? 'teraz' : mm(m))
const signedPct = (v: number) => (v > 0 ? `+${percentText(v)}` : percentText(v))

/** The years shown (T488): a view's choice, kept on this computer (as the wealth's line). */
type Years = '3' | '5' | '10'
const YEARS: Array<{ value: Years; label: string }> = [
  { value: '3', label: '3 lata' },
  { value: '5', label: '5 lat' },
  { value: '10', label: '10 lat' }
]
const YEARS_KEY = 'fi.intel.forecastYears'
function readYears(): Years {
  try {
    const v = localStorage.getItem(YEARS_KEY)
    return v === '3' || v === '10' ? v : '5'
  } catch {
    return '5'
  }
}

/** A scenario's assumptions saved (T488); null – back to its defaults. */
export function setForecastScenario(s: ForecastScenario, a: ForecastAssumptions | null): boolean {
  return updateSettings((f) => {
    const forecast = { ...(f.settings.intel.forecast ?? {}) }
    if (a) forecast[s] = { ...(forecast[s] ?? {}), ...a }
    else delete forecast[s]
    return { ...f, settings: { ...f.settings, intel: { ...f.settings.intel, forecast } } }
  })
}

/** „domyślne” (AP-22): the scenario back to its defaults with „Cofnij” – taken back only while it still is by them. */
function resetScenario(s: ForecastScenario): void {
  const before = useData.getState().fi?.settings.intel.forecast?.[s]
  if (!before || !setForecastScenario(s, null)) return
  toast(`Scenariusz ${SCENARIO_LABEL[s]}: założenia domyślne.`, 'success', 8000, {
    label: 'Cofnij',
    run: () => {
      if (useData.getState().fi?.settings.intel.forecast?.[s]) toast(`Scenariusz ${SCENARIO_LABEL[s]} zmieniony od tego czasu – zostaje.`, 'info', 6000)
      else setForecastScenario(s, { wages: before.wages, inflation: before.inflation, deliveries: before.deliveries, oneOff: before.oneOff })
    }
  })
}

/** The scenarios' assumptions in words – the note under the forecast (T489). */
function assumptionsText(a: Readonly<Record<ForecastScenario, ForecastAssumptions>>): string {
  return FORECAST_SCENARIOS.map(
    (s) =>
      `${SCENARIO_LABEL[s]} – wpływy z pracy ${signedPct(a[s].wages)}/rok, koszty ${signedPct(a[s].inflation)}/rok, dostawy z ICTTJ ${a[s].deliveries ? `${zl(a[s].deliveries)}/rok` : 'bez dostaw'}, wydatki jednorazowe ${a[s].oneOff ? `${zl(a[s].oneOff)}/rok` : 'brak'}`
  ).join('; ')
}

export function ForecastPanel({ fleet, input }: { fleet: FleetState; input: CourseInput | null }) {
  const scheduled = useRecordList('scheduled')
  const transactions = useRecordList('transactions')
  const containers = useRecordList('containers')
  const cargo = useCargoStatuses()
  const saved = useData((s) => s.fi?.settings.intel.forecast)
  const [years, setYearsState] = useState<Years>(readYears)
  const setYears = (v: Years) => {
    setYearsState(v)
    try {
      localStorage.setItem(YEARS_KEY, v)
    } catch {
      /* storage unavailable: the choice lives for the session */
    }
  }
  const fi = useMemo(() => (input ? forecastInputOf(fleet, input, { scheduled, transactions, containers, cargo }) : null), [fleet, input, scheduled, transactions, containers, cargo])
  const assumptions = useMemo(() => assumptionsOf(saved), [saved])
  const results = useMemo(() => (fi ? forecasts(fi, assumptions, Number(years)) : []), [fi, assumptions, years])
  const edit = (s: ForecastScenario, patch: Partial<ForecastAssumptions>) => {
    const next = { ...assumptions[s], ...patch }
    if (!sameAssumptions(next, assumptions[s])) setForecastScenario(s, next)
  }
  const hidden = amountsHidden()
  const first = results[0]
  return (
    <Panel
      title="Prognoza wieloletnia"
      testId="intel-forecast"
      actions={first ? <Segmented size="sm" value={years} onChange={setYears} options={YEARS} aria-label="Lata prognozy" /> : undefined}
    >
      {!input || !first ? (
        <span className="text-[12px] text-muted">Prognoza policzy się po starcie budżetu.</span>
      ) : (
        <div className="flex flex-col gap-2 text-[12px]">
          <div className="flex flex-wrap items-baseline gap-4">
            <div className="flex flex-col">
              <span className="label">Siła floty netto teraz</span>
              <span className="num text-[16px] text-fg-strong" data-testid="intel-forecast-now">
                {zl(first.now)}
              </span>
            </div>
            {results.map((f) => (
              <div key={f.scenario} className="flex flex-col">
                <span className="label">
                  {SCENARIO_LABEL[f.scenario]} – za {countLabel(f.years.length, 'rok', 'lata', 'lat')}
                </span>
                <span className={cx('num', f.scenario === 'base' ? 'text-[16px] text-fg-strong' : 'text-fg', f.years.at(-1)!.net < 0 && !hidden && 'text-down')} data-testid="intel-forecast-end" data-scenario={f.scenario}>
                  {zl(f.years.at(-1)!.net)}
                </span>
              </div>
            ))}
          </div>
          <ForecastChart results={results} />
          <table className="w-full text-[11.5px]" data-testid="intel-forecast-years">
            <thead>
              <tr className="text-dim">
                <th className="py-0.5 text-left font-normal">Siła floty netto</th>
                {results.map((f) => (
                  <th key={f.scenario} className="text-right font-normal">
                    {SCENARIO_LABEL[f.scenario]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {first.years.map((y, i) => (
                <tr key={y.year} className="border-t border-line/50" data-testid="intel-forecast-year" data-year={y.year} data-month={y.month}>
                  <td className="py-0.5 text-muted">
                    za {countLabel(y.year, 'rok', 'lata', 'lat')} <span className="num text-dim">· {mm(y.month)}</span>
                  </td>
                  {results.map((f) => {
                    const x = f.years[i]!
                    const tip = [
                      `Na kontach ${zl(x.money)} (osłony ${zl(x.shields)}, kadłub ${zl(x.hull)}, cele ${zl(x.goals)})`,
                      `należności ${zl(x.receivables)}`,
                      `dług ${zl(x.debt)}`,
                      ...(x.short ? [`brakuje w roku ${zl(x.short)}`] : []),
                      `wpływy roku ${zl(x.income)}`,
                      x.costs == null ? 'koszty – pensja planu' : `koszty roku ${zl(x.costs)}`,
                      ...(x.oneOff ? [`wydatki jednorazowe ${zl(x.oneOff)}`] : []),
                      `zasięg ${x.range == null ? '—' : rangeText(x.range)}`
                    ]
                    return (
                      <td
                        key={f.scenario}
                        className={cx('num text-right', f.scenario === 'base' && 'text-fg-strong', x.net < 0 && !hidden && 'text-down', x.short > 0 && 'underline decoration-accent decoration-dotted')}
                        title={tip.join(' · ')}
                        data-testid="intel-forecast-net"
                        data-scenario={f.scenario}
                        data-short={x.short || undefined}
                      >
                        {plnText(x.net)}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {input.goals
                .filter((g) => g.target > 0)
                .map((g) => (
                  <Row
                    key={g.id}
                    label={`Cel: ${g.name}`}
                    values={results.map((f) => eta(f.goalEta[g.id] ?? null, input.month, 'poza prognozą'))}
                    late={results.map((f) => (f.goalEta[g.id] ?? null) == null || (!!g.deadline && f.goalEta[g.id]! > g.deadline))}
                    testId="intel-forecast-goal"
                  />
                ))}
              <Row
                label="Osłony do zera"
                title="Pierwszy miesiąc, w którym osłony spadają do zera – resztę pensji i kosztów płaci kadłub albo brakuje"
                values={results.map((f) => eta(f.shieldsEmpty, input.month, 'nie'))}
                late={results.map((f) => f.shieldsEmpty != null)}
                testId="intel-forecast-shields-empty"
              />
              <Row
                label="Brakuje na koszty od"
                title="Pierwszy miesiąc, w którym osłony, kadłub i wpływy nie pokrywają kosztów i płatności – brak odejmuje się od siły floty"
                values={results.map((f) => eta(f.shortFrom, input.month, 'nie'))}
                late={results.map((f) => f.shortFrom != null)}
                testId="intel-forecast-short"
              />
              <Row label="Zasięg na koniec" values={results.map((f) => (f.years.at(-1)!.range == null ? '—' : rangeText(f.years.at(-1)!.range!)))} />
            </tbody>
          </table>
          <AssumptionsTable assumptions={assumptions} edit={edit} />
          <span className="text-[11px] text-dim" data-testid="intel-forecast-note">
            Prognoza – nie gwarancja. Założenia: {assumptionsText(assumptions)}. Rok 1 to kurs na 12 miesięcy bez wypłat z XTB (wpływy z pracy – mediana z 12 miesięcy) z
            dostawami scenariusza; od roku 2 wpływy z pracy rosną o wzrost, koszty i pensja planu – o inflację, wydatki jednorazowe w ostatnim miesiącu roku z osłon (w cenach
            dziś), boje w swoich miesiącach (roczne co roku), pożyczki według harmonogramu. Dostawy z ICTTJ to tylko Twoje założenie – prognoza nie czyta wyników tradingu.
            Siła floty netto: pieniądze na kontach + należności − dług − braki (rezerwa podatkowa poza nią – PIT-38 w ciągu roku); bez IKE, IKZE, PPK i inwestycji.
          </span>
        </div>
      )}
    </Panel>
  )
}

function Row({ label, values, late, title, testId }: { label: string; values: string[]; late?: boolean[]; title?: string; testId?: string }) {
  return (
    <tr className="border-t border-line/50" data-testid={testId}>
      <td className="py-0.5 text-muted" title={title}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className={cx('num text-right', late?.[i] ? 'text-accent' : 'text-fg-strong')}>
          {v}
        </td>
      ))}
    </tr>
  )
}

/** The scenarios' assumptions, each saved on leaving its field (T488); „domyślne” under a scenario changed. */
function AssumptionsTable({ assumptions, edit }: { assumptions: Readonly<Record<ForecastScenario, ForecastAssumptions>>; edit: (s: ForecastScenario, patch: Partial<ForecastAssumptions>) => void }) {
  const pct = (field: 'wages' | 'inflation', what: string) =>
    FORECAST_SCENARIOS.map((s) => (
      <td key={s} className="py-[2px] pl-2">
        <div className="flex items-center justify-end gap-1">
          <NumberField
            className="h-[22px] w-[64px]"
            value={assumptions[s][field]}
            step={0.5}
            commitOnBlur
            range={[-50, 100]}
            isValid={(v) => v != null && v >= -50 && v <= 100}
            onChange={(v) => v != null && edit(s, { [field]: v })}
            aria-label={`${what} – scenariusz ${SCENARIO_LABEL[s]}`}
            data-testid={`intel-forecast-${field}-${s}`}
          />
          <span className="text-muted">%</span>
        </div>
      </td>
    ))
  const amount = (field: 'deliveries' | 'oneOff', what: string) =>
    FORECAST_SCENARIOS.map((s) => (
      <td key={s} className="py-[2px] pl-2">
        <div className="flex justify-end">
          <AmountField
            className="h-[22px] w-[96px]"
            value={assumptions[s][field]}
            allowEmpty
            onChange={(v) => edit(s, { [field]: v ?? 0 })}
            aria-label={`${what} – scenariusz ${SCENARIO_LABEL[s]}`}
            data-testid={`intel-forecast-${field}-${s}`}
          />
        </div>
      </td>
    ))
  return (
    <table className="w-full text-[11.5px]" data-testid="intel-forecast-assumptions">
      <thead>
        <tr className="text-dim">
          <th className="py-0.5 text-left font-normal">Założenia scenariuszy</th>
          {FORECAST_SCENARIOS.map((s) => (
            <th key={s} className="text-right font-normal">
              {SCENARIO_LABEL[s]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr className="border-t border-line/50">
          <td className="text-muted" title="Od roku 2 – rok 1 to kurs na 12 miesięcy">
            Wzrost wpływów z pracy rocznie
          </td>
          {pct('wages', 'Wzrost wpływów z pracy')}
        </tr>
        <tr className="border-t border-line/50">
          <td className="text-muted" title="Od roku 2: koszty i pensja planu (pensja płaci koszty)">
            Inflacja kosztów rocznie
          </td>
          {pct('inflation', 'Inflacja kosztów')}
        </tr>
        <tr className="border-t border-line/50">
          <td className="text-muted" title="Twoje założenie, nie wyniki tradingu – po 1/12 co miesiąc">
            Dostawy z ICTTJ rocznie
          </td>
          {amount('deliveries', 'Dostawy z ICTTJ rocznie')}
        </tr>
        <tr className="border-t border-line/50">
          <td className="text-muted" title="Remonty, auto, sprzęt – w ostatnim miesiącu każdego roku prognozy, z osłon, w cenach dziś">
            Wydatki jednorazowe rocznie
          </td>
          {amount('oneOff', 'Wydatki jednorazowe rocznie')}
        </tr>
        {FORECAST_SCENARIOS.some((s) => !sameAssumptions(assumptions[s], FORECAST_DEFAULTS[s])) && (
          <tr>
            <td />
            {FORECAST_SCENARIOS.map((s) => (
              <td key={s} className="pt-0.5 text-right">
                {!sameAssumptions(assumptions[s], FORECAST_DEFAULTS[s]) && (
                  <button type="button" className="text-[11px] text-muted hover:text-fg-strong" onClick={() => resetScenario(s)} data-testid={`intel-forecast-reset-${s}`}>
                    domyślne
                  </button>
                )}
              </td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  )
}

// ------------------------------------------------------------------ the chart

const W = 480
const H = 190
const LEFT = 56
const RIGHT = 10
const TOP = 10
const BOTTOM = 22
/** Each scenario's line: the base strong and whole, the other two muted and dashed – identity never by colour alone. */
const LINE: Record<ForecastScenario, { color: string; width: number; dash?: string }> = {
  cautious: { color: '#7a838e', width: 1.5, dash: '5 3' },
  base: { color: '#e8edf2', width: 2 },
  optimistic: { color: '#c3cbd4', width: 1.5, dash: '1.5 3' }
}

/** A step of the axis: 1, 2, 2,5 or 5 × 10ⁿ grosze, about `count` of them over the span. */
function niceStep(span: number, count: number): number {
  const raw = Math.max(1, span / count)
  const pow = 10 ** Math.floor(Math.log10(raw))
  return ([1, 2, 2.5, 5, 10].find((k) => k * pow >= raw) ?? 10) * pow
}

/** The axis' amount, short: „120 tys.”, „1,2 mln”, „800 zł”; hidden amounts – the mask. */
function axisText(g: number): string {
  if (amountsHidden()) return '•••'
  const v = g / 100
  if (Math.abs(v) >= 1_000_000) return `${decimalText(v / 1_000_000, 1)} mln`
  if (Math.abs(v) >= 10_000) return `${decimalText(v / 1000, 0)} tys.`
  return `${decimalText(v, 0)} zł`
}

/** The net worth now and at each year's end of the three scenarios; the band between the lowest and the highest. */
function ForecastChart({ results }: { results: readonly Forecast[] }) {
  const n = results[0]?.years.length ?? 0
  const series = results.map((f) => ({ f, values: [f.now, ...f.years.map((y) => y.net)] }))
  const all = series.flatMap((s) => s.values)
  const step = niceStep(Math.max(...all, 0) - Math.min(...all, 0), 4)
  const lo = Math.floor(Math.min(...all, 0) / step) * step
  const hi = Math.max(lo + step, Math.ceil(Math.max(...all, 0) / step) * step)
  const x = (i: number) => LEFT + (n ? (i / n) * (W - LEFT - RIGHT) : 0)
  const y = (v: number) => TOP + (1 - (v - lo) / (hi - lo)) * (H - TOP - BOTTOM)
  const ticks: number[] = []
  for (let v = lo; v <= hi + 0.5; v += step) ticks.push(v)
  const labels = ['dziś', ...(results[0]?.years.map((yr) => yr.month.slice(0, 4)) ?? [])]
  const band = all.length
    ? [
        ...labels.map((_, i) => `${x(i)},${y(Math.max(...series.map((s) => s.values[i]!)))}`),
        ...labels.map((_, i) => `${x(i)},${y(Math.min(...series.map((s) => s.values[i]!)))}`).reverse()
      ].join(' ')
    : ''
  const hidden = amountsHidden()
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted" data-testid="intel-forecast-legend">
        {results.map((f) => (
          <span key={f.scenario} className="flex items-center gap-1">
            <svg width="22" height="6" aria-hidden="true">
              <line x1="0" y1="3" x2="22" y2="3" stroke={LINE[f.scenario].color} strokeWidth={LINE[f.scenario].width} strokeDasharray={LINE[f.scenario].dash} strokeLinecap="round" />
            </svg>
            {SCENARIO_LABEL[f.scenario]}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Siła floty netto na koniec każdego roku – trzy scenariusze" data-testid="intel-forecast-chart" data-years={n}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={LEFT} x2={W - RIGHT} y1={y(v)} y2={y(v)} stroke={v === 0 && lo < 0 ? '#4f5862' : '#171b20'} strokeWidth="1" />
            <text x={LEFT - 6} y={y(v) + 3} fontSize="9.5" fill="#7a838e" textAnchor="end" fontFamily="JetBrains Mono, monospace">
              {axisText(v)}
            </text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={i} x={x(i)} y={H - 6} fontSize="9.5" fill="#7a838e" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {l}
          </text>
        ))}
        {band && <polygon points={band} fill="#e8edf2" fillOpacity="0.05" />}
        {series.map(({ f, values }) => (
          <polyline
            key={f.scenario}
            points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            fill="none"
            stroke={LINE[f.scenario].color}
            strokeWidth={LINE[f.scenario].width}
            strokeDasharray={LINE[f.scenario].dash}
            strokeLinecap="round"
            strokeLinejoin="round"
            data-testid="intel-forecast-line"
            data-scenario={f.scenario}
          />
        ))}
        {series.map(({ f, values }) =>
          values.map((v, i) => (
            <g key={`${f.scenario}-${i}`}>
              <circle cx={x(i)} cy={y(v)} r={f.scenario === 'base' ? 2.5 : 2} fill={LINE[f.scenario].color} />
              {/* A hit target bigger than the mark: the scenario, the year and its amount on hover. */}
              <circle cx={x(i)} cy={y(v)} r="7" fill="transparent">
                <title>{`${SCENARIO_LABEL[f.scenario]} · ${i ? `za ${countLabel(i, 'rok', 'lata', 'lat')}` : 'dziś'}: ${hidden ? '•••' : zl(v)}`}</title>
              </circle>
            </g>
          ))
        )}
      </svg>
    </div>
  )
}
