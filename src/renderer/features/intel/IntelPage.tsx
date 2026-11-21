/**
 * Wywiad (spec „Wywiad i raporty”, E8, D73) in tabs (D106 pt 6, T539): the structure of the own money in the language of ICT.
 * „Struktura” – the wealth week by week with its drawdown and BOS / CHoCH (beside it the net worth – F24), the fuel balance
 * (F25), the shields and the hull at each month's end (AP-31); „Wydatki” – the FVG of the envelopes, a month against its
 * averages, the spending over time with the cargo as the Order Block (F20), the brands, the killzones, the expeditions (F17),
 * the personal inflation (F36); „Prognozy” – the range forecast, the course and the maneuvers' simulator, the forecast for
 * years (AP-44); „Dziennik” – the captain's log. The last tab is kept on this computer.
 */
import { useState } from 'react'
import { useData } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { Empty, Segmented, cx } from '../../components/ui'
import { ForecastsTab } from './ForecastsTab'
import { LogTab } from './LogTab'
import { SpendingTab } from './SpendingTab'
import { StructureTab } from './StructureTab'
import { INTEL_TABS, PERIODS, readIntelTab, storeIntelTab, tabReadsPeriod, type IntelTab, type Period } from './tabs'

/** What the 3 / 6 / 12 months switch reads on the tab – said beside it. */
const PERIOD_NOTE: Partial<Record<IntelTab, string>> = {
  spending: 'dotyczy: wydatków w czasie, namierzonych celów i Killzones',
  log: 'dotyczy: trafności i wpisów dziennika'
}

export function IntelPage() {
  const fleet = useFleet()
  const settings = useData((s) => s.fi?.settings ?? null)
  const [tab, setTabState] = useState<IntelTab>(readIntelTab)
  const [period, setPeriod] = useState<Period>('6')
  const setTab = (t: IntelTab) => {
    setTabState(t)
    storeIntelTab(t)
  }
  if (!fleet || !settings) return <Empty>Wczytywanie…</Empty>
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-intel">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Wywiad</h1>
        <span className="text-[12px] text-muted">struktura pieniędzy w języku ICT</span>
        <div role="tablist" aria-label="Zakładki Wywiadu" className="ml-3 flex items-center gap-1" data-testid="intel-tabs">
          {INTEL_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`intel-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="intel-tabpanel"
              title={t.title}
              onClick={() => setTab(t.id)}
              className={cx('h-[24px] border px-2.5 text-[12px] transition-colors duration-150', tab === t.id ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-muted hover:bg-hover hover:text-fg-strong')}
              data-testid={`intel-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        {tabReadsPeriod(tab) && (
          <>
            <span className="text-[11px] text-dim" data-testid="intel-period-note">
              {PERIOD_NOTE[tab]}
            </span>
            <span className="text-[12px] text-muted">Okres</span>
            <Segmented size="sm" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ ...p }))} aria-label="Okres analiz" data-testid="intel-period" />
          </>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto" role="tabpanel" id="intel-tabpanel" aria-labelledby={`intel-tab-${tab}`} data-tab={tab} data-testid="intel-tabpanel">
        {tab === 'structure' && <StructureTab fleet={fleet} />}
        {tab === 'spending' && <SpendingTab fleet={fleet} settings={settings} period={period} />}
        {tab === 'forecasts' && <ForecastsTab fleet={fleet} />}
        {tab === 'log' && <LogTab fleet={fleet} settings={settings} period={period} />}
      </div>
    </div>
  )
}
