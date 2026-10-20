/**
 * Wywiad → „Osobista inflacja” (1.10.0, F36, D87 – the CPI of GUS typed by hand, no network): the costs of each category
 * year on year (the same months), the average receipt at the same brands, the prices of the cargo, „Twoja inflacja”
 * weighted by the money of the year before against the CPI typed, and the hull's target growing with the costs.
 */
import { useMemo, useState } from 'react'
import { addMonths } from '@shared/calc/dates'
import { parseCpi, personalInflation, type PriceItem } from '@shared/calc/inflation'
import type { FleetState } from '@shared/calc/fleet'
import { plnText } from '../../components/fields'
import { Empty, Panel, cx } from '../../components/ui'
import { monthLabel } from '../../lib/format'
import { updateSettings, useData, useFolderLocked } from '../../store/data'
import { useRecordList } from '../../store/records'
import { toast } from '../../store/ui'
import { useCategories } from '../operations/pickers'

const zl = (g: number) => `${plnText(g)} zł`
const pct = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%`)
const NO_CPI: Record<string, number> = {}

/** The CPI typed for a month (F36): the year-on-year change in % as GUS publishes it; null – the month's value taken off. */
export function setCpi(month: string, value: number | null): void {
  updateSettings((f) => {
    const cpi = { ...f.settings.intel.cpi }
    if (value == null) delete cpi[month]
    else cpi[month] = value
    return { ...f, settings: { ...f.settings, intel: { ...f.settings.intel, cpi } } }
  })
}

export function InflationPanel({ fleet }: { fleet: FleetState }) {
  const transactions = useRecordList('transactions')
  const containers = useRecordList('containers')
  const categories = useData((s) => s.fi?.settings.categories)
  const cpi = useData((s) => s.fi?.settings.intel.cpi ?? NO_CPI)
  const aliases = useData((s) => s.fi?.settings.import.aliases)
  const hullMonths = useData((s) => s.fi?.settings.layers.hullMonths ?? 6)
  const cats = useCategories()
  const report = useMemo(
    () => (categories ? personalInflation({ transactions, categories, containers, month: fleet.month, covered: fleet.historyMonths, cpi, hullMonths, aliases }) : null),
    [transactions, categories, containers, fleet.month, fleet.historyMonths, cpi, hullMonths, aliases]
  )
  if (!report) return null
  const compared = report.categories.filter((c) => c.change != null).slice(0, 8)
  return (
    <Panel title="Osobista inflacja" testId="intel-inflation">
      <div className="flex flex-col gap-2 text-[12px]">
        <div className="flex flex-wrap items-baseline gap-4">
          <div className="flex flex-col">
            <span className="label">Twoja inflacja (ceny rok do roku)</span>
            <span className={cx('num text-[16px]', report.personal != null && report.personal > 0 ? 'text-accent' : 'text-fg-strong')} data-testid="intel-inflation-personal">
              {pct(report.personal)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="label">GUS (CPI){report.cpi ? ` – ${monthLabel(report.cpi.month)}` : ''}</span>
            <span className="num text-fg" data-testid="intel-inflation-cpi">
              {report.cpi ? pct(report.cpi.value) : 'nie wpisano'}
            </span>
          </div>
          {report.hull.now != null && (
            <div className="flex flex-col" data-testid="intel-inflation-hull">
              <span className="label">Cel kadłuba ({hullMonths} × koszty)</span>
              <span className="num text-fg">
                {report.hull.before != null ? `${zl(report.hull.before)} → ` : ''}
                {zl(report.hull.now)}
                {report.hull.change != null ? <span className={cx(report.hull.change > 0 ? 'text-accent' : 'text-muted')}> ({pct(report.hull.change)})</span> : null}
              </span>
            </div>
          )}
        </div>
        <CpiField cpi={cpi} month={fleet.month} />
        {!report.months.length ? (
          <Empty>Porównanie rok do roku potrzebuje roku historii z banku – te same miesiące rok wcześniej.</Empty>
        ) : (
          <>
            <span className="text-[11px] text-dim" data-testid="intel-inflation-months">
              Porównane miesiące: {report.months.length} (każdy z tym samym miesiącem rok wcześniej).
            </span>
            <PriceList title="Średni paragon u tych samych marek" items={report.brands} testId="intel-inflation-brand" unit="średnio" />
            <PriceList title="Kontenery ładowni" items={report.containers} testId="intel-inflation-container" unit="kwota" />
            {compared.length > 0 && (
              <div className="flex flex-col" data-testid="intel-inflation-categories">
                <span className="label">Koszty kategorii – te same miesiące (ceny i nawyki razem)</span>
                {compared.map((c) => (
                  <div key={c.id} className="flex items-baseline gap-2 text-[11.5px]">
                    <span className="min-w-0 flex-1 truncate">{c.id === '-' ? 'bez kategorii' : cats.label(c.id)}</span>
                    <span className="num text-dim">
                      {plnText(c.before)} → {plnText(c.now)}
                    </span>
                    <span className={cx('num w-[64px] text-right', c.change != null && c.change > 0 ? 'text-accent' : 'text-muted')}>{pct(c.change)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <span className="text-[11px] text-dim">
          Twoja inflacja – zmiany średniego paragonu u tych samych marek (co najmniej 3 zakupy w obu latach) i kwot kontenerów, ważone pieniędzmi sprzed roku. Koszty kategorii
          mieszają ceny z nawykami. Stała pensja od siebie traci wartość o tyle, o ile rosną ceny.
        </span>
      </div>
    </Panel>
  )
}

function PriceList({ title, items, testId, unit }: { title: string; items: readonly PriceItem[]; testId: string; unit: string }) {
  if (!items.length) return null
  return (
    <div className="flex flex-col">
      <span className="label">{title}</span>
      {items.slice(0, 8).map((i) => (
        <div key={i.key} className="flex items-baseline gap-2 text-[11.5px]" data-testid={testId} data-name={i.name}>
          <span className="min-w-0 flex-1 truncate">{i.name}</span>
          <span className="num text-dim">
            {unit} {plnText(i.before)} → {plnText(i.now)}
          </span>
          <span className={cx('num w-[64px] text-right', i.change > 0 ? 'text-accent' : 'text-muted')}>{pct(i.change)}</span>
        </div>
      ))}
    </div>
  )
}

/** The CPI typed by hand, month by month (F36: no network). */
function CpiField({ cpi, month }: { cpi: Readonly<Record<string, number>>; month: string }) {
  const readOnly = useFolderLocked()
  // GUS publishes a month's CPI in the middle of the next one: the month before by default.
  const months = Array.from({ length: 13 }, (_, i) => addMonths(month, -1 - i))
  const [picked, setPicked] = useState(months[0]!)
  const [text, setText] = useState<string | null>(null)
  const shown = text ?? (cpi[picked] != null ? String(cpi[picked]).replace('.', ',') : '')
  const commit = () => {
    if (text == null) return
    const v = parseCpi(text)
    setText(null)
    if (v === undefined) return toast('Wpisz zmianę cen w procentach, np. 4,9 albo -0,5.', 'error')
    if (v === (cpi[picked] ?? null)) return
    setCpi(picked, v)
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted" data-testid="intel-cpi">
      <span>CPI GUS (rok do roku) za</span>
      <select className="input h-[24px] py-0" value={picked} onChange={(e) => setPicked(e.currentTarget.value)} aria-label="Miesiąc CPI" data-testid="intel-cpi-month">
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>
      <input
        className="input h-[24px] w-[70px] text-right"
        value={shown}
        disabled={readOnly}
        placeholder="np. 4,9"
        onChange={(e) => setText(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setText(null)
        }}
        aria-label="CPI w procentach"
        data-testid="intel-cpi-value"
      />
      <span>%</span>
    </div>
  )
}
