/**
 * Wywiad → „Wydatki” (D106 pt 6): the FVG of the envelopes (plan against fact), a month against its averages, the spending
 * over time with the cargo as the Order Block, the brands one spends at, the killzones, the expeditions, the personal
 * inflation. The 3 / 6 / 12 months switch reads the spending table, the brands and the killzones.
 */
import { useMemo, useState } from 'react'
import { addMonths, isoWeekOf, monthRange } from '@shared/calc/dates'
import type { FleetState } from '@shared/calc/fleet'
import { killzoneNote } from '@shared/calc/game'
import { killzoneGrid, spendingByMonth } from '@shared/calc/intel'
import { costOf, upToDay } from '@shared/calc/operations'
import { debriefing } from '@shared/calc/plan'
import { operationName } from '@shared/import/names'
import type { Settings } from '@shared/schema'
import { amountsHidden, plnText, signedPln } from '../../components/fields'
import { Columns } from '../../components/layout'
import { Meter } from '../../components/meters'
import { Empty, Panel, cx } from '../../components/ui'
import { monthLabel, plDate } from '../../lib/format'
import { useGameRecords } from '../../store/game'
import { useRecordList } from '../../store/records'
import { useCategories } from '../operations/pickers'
import { openOperation } from '../operations/state'
import { KillzoneMap } from './charts'
import { ComparisonPanel, SpendingTable, TargetsPanel } from './Drill'
import { ExpeditionsPanel } from './Expeditions'
import { InflationPanel } from './Inflation'
import { killzoneOperations } from './killzoneDrill'
import { periodMonths, type Period } from './tabs'

const DAY_NAME = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela']
/** The purchases of a killzone cell listed beside the map. */
const CELL_SHOWN = 8

export function SpendingTab({ fleet, settings, period }: { fleet: FleetState; settings: Settings; period: Period }) {
  const transactions = useRecordList('transactions')
  const plans = useRecordList('months')
  const containers = useRecordList('containers')
  const cats = useCategories()
  // The day and the month only: the fleet is a new object every minute, the analyses change with the day.
  const { today, month } = fleet
  const months = useMemo(() => periodMonths(month, period), [month, period])
  const killzones = useMemo(() => (months.length ? killzoneGrid(transactions, `${months[0]}-01`, today) : null), [transactions, months, today])
  // The week's mission (AP-30): a killzone mission's hour said beside the period's – one „Twoja killzone”.
  const game = useGameRecords()
  const weekMission = useMemo(() => game.flatMap((g) => g.missions).find((m) => m.week === isoWeekOf(today)) ?? null, [game, today])
  // The month in progress up to today (AP-36), as the debriefing and the fuel balance beside it.
  const spending = useMemo(() => spendingByMonth(upToDay(transactions, today), settings.categories, months), [transactions, settings.categories, months, today])
  const [fvgMonth, setFvgMonth] = useState<string | null>(null)
  const [cell, setCell] = useState<string | null>(null)
  const fvgOf = fvgMonth ?? (fleet.start && addMonths(month, -1) >= fleet.start.slice(0, 7) ? addMonths(month, -1) : month)
  const brief = useMemo(
    () =>
      debriefing(fvgOf, {
        transactions,
        categories: settings.categories,
        plans,
        log: fleet.log,
        alarms: fleet.alarms,
        containers,
        today
      }),
    [fvgOf, transactions, settings.categories, plans, fleet.log, fleet.alarms, containers, today]
  )
  const maxSpend = Math.max(1, ...spending.rows.flatMap((r) => r.values), ...spending.cargo)
  const fvgMonths = monthRange(fleet.start ? fleet.start.slice(0, 7) : month, month)
    .reverse()
    .slice(0, 12)
  const cellOps = useMemo(() => {
    if (!cell || !months.length) return []
    const [d, h] = cell.split(':').map(Number)
    return killzoneOperations(transactions, `${months[0]}-01`, today, d!, h!)
  }, [cell, transactions, months, today])
  const [cellDay, cellHour] = cell ? cell.split(':').map(Number) : [0, 0]
  return (
    <Columns id="intel-spending" tracks={['minmax(460px,3fr)', 'minmax(360px,2fr)']} className="grid min-h-full items-start">
      <div className="flex min-w-0 flex-col">
        <Panel title="Wydatki w czasie" testId="intel-spending">
          <SpendingTable months={months} spending={spending} max={maxSpend} />
        </Panel>
        <TargetsPanel from={`${months[0] ?? month}-01`} to={today} aliases={settings.import.aliases} />
        <Panel title="Killzones wydatków" testId="intel-killzones-panel">
          {!killzones || !killzones.withTime ? (
            <Empty>Brak zakupów z godziną w tym okresie – godzinę mają wpisy z szybkiego wpisu i Operacji (import z mBanku jej nie ma).</Empty>
          ) : (
            <div className="flex flex-col gap-1.5 text-[12px]">
              <KillzoneMap cells={killzones.cells} selected={cell} onCell={(d, h) => setCell((c) => (c === `${d}:${h}` ? null : `${d}:${h}`))} />
              <span className="text-[11px] text-dim">
                Zakupy z godziną: {killzones.withTime}, bez godziny: {killzones.withoutTime}. {killzoneNote(Number(period), weekMission)}
              </span>
              {/* UX-74: a cell's purchases – Operacje has no filter by the hour, so they are listed here. */}
              {cell && (
                <div className="flex flex-col border-t border-line pt-1 text-[11.5px]" data-testid="intel-killzone-ops" data-cell={cell}>
                  <span className="label pb-0.5">
                    {DAY_NAME[cellDay! - 1]} {String(cellHour).padStart(2, '0')}
                    :00–{String(cellHour! + 1).padStart(2, '0')}:00
                  </span>
                  {cellOps.slice(0, CELL_SHOWN).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-baseline gap-x-2 py-[2px] text-left hover:bg-hover"
                      onClick={() => openOperation({ id: t.id, date: t.date })}
                      title="Pokaż operację"
                      data-testid="intel-killzone-op"
                    >
                      <span className="num text-muted">{plDate(t.date)}</span>
                      <span className="min-w-0 truncate">{operationName(t) || (t.categoryId ? cats.label(t.categoryId) : 'wydatek')}</span>
                      <span className="num text-right">{plnText(costOf(t))}</span>
                    </button>
                  ))}
                  {cellOps.length > CELL_SHOWN && (
                    <span className="pt-0.5 text-[11px] text-dim">
                      {CELL_SHOWN} największych z {cellOps.length}.
                    </span>
                  )}
                </div>
              )}
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
                  {/* Neutral and without a sign while the amounts are hidden (B61, WY sp. 5) – as on the screens of the month. */}
                  <span className={cx('num w-[96px] text-right', !amountsHidden() && (e.gap < 0 ? 'text-down' : 'text-up'))}>{e.gap >= 0 && !amountsHidden() ? `+${plnText(e.gap)} zł` : `${signedPln(e.gap)} zł`}</span>
                </div>
                <Meter value={e.spent} max={e.limit} over />
              </div>
            ))}
            <span className="text-[11px] text-dim">Fair Value Gap: luka między planem a faktem – na plus zostało w kopercie, na minus przekroczenie.</span>
          </div>
        </Panel>
        <ComparisonPanel month={month} start={fleet.start} covered={fleet.historyMonths} />
        <ExpeditionsPanel />
        <InflationPanel fleet={fleet} />
      </div>
    </Columns>
  )
}
