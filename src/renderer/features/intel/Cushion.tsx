/**
 * „Osłony + kadłub i zasięg” at each month's end (1.15.7, AP-31 – kryterium 2): Wywiad's 12 months, the debriefing's
 * month and its 12 months, the year's months in its review. The states are the engine's (`calc/cushion.ts`, T4) –
 * computed once per run of the engine and the records it reads, never per render.
 */
import { useMemo } from 'react'
import { arrowOf, cushionMonths, cushionTrend, rangeDeltaText, type CushionPoint } from '@shared/calc/cushion'
import { addMonths, warsawEndOf } from '@shared/calc/dates'
import { computeFleet } from '@shared/calc/fleet'
import { rangeText } from '@shared/format'
import type { ReportSection } from '@shared/export/budget'
import { amountsHidden, plnText } from '../../components/fields'
import { Empty, Panel, cx } from '../../components/ui'
import { monthLabel } from '../../lib/format'
import { timed } from '../../lib/timing'
import { useData } from '../../store/data'
import { fleetInputNow, useFleet } from '../../store/fleet'
import { useRecordList } from '../../store/records'

const zl = (g: number) => `${plnText(g)} zł`
const NOT_STARTED = { started: false, shields: { amount: 0 }, hull: { amount: 0 }, range: null }

/** A log that does not add up to the state (a move the engine does not log): the engine run at the day's end. */
const engineAt = (date: string) => {
  const input = fleetInputNow()
  return input ? computeFleet({ ...input, now: warsawEndOf(date) }) : NOT_STARTED
}

/** The `count` months that ended before `before`, oldest first – the running month and later ones left out. */
export function useCushion(before: string | null, count = 12): CushionPoint[] {
  const fleet = useFleet()
  const transactions = useRecordList('transactions')
  const loans = useRecordList('loans')
  const containers = useRecordList('containers')
  const assumedCosts = useData((s) => s.fi?.settings.layers.assumedCosts ?? null)
  return useMemo(
    () => (fleet && before ? timed('osłony i kadłub na koniec miesięcy', () => cushionTrend({ fleet, transactions, loans, containers, assumedCosts, months: cushionMonths(before, count), engineAt })) : []),
    [fleet, transactions, loans, containers, assumedCosts, before, count]
  )
}

/** A change of the cushion: „↑ +1 500,00 zł”; masked while the amounts are hidden (no sign, no arrow – WY sp. 5). */
export function cushionDeltaText(delta: number | null, money: (g: number) => string = zl): string {
  if (delta == null) return '—'
  const text = money(delta)
  if (!/\d/.test(text)) return text
  return `${arrowOf(delta)} ${delta > 0 ? `+${text}` : text}`
}

/** A change of the range: „↑ +0,6 mies.” (a range is no amount – shown with the amounts hidden too). */
export const rangeChangeText = (change: number | null): string => (change == null ? '—' : `${arrowOf(change)} ${rangeDeltaText(change)}`)

/** The report's section (the debriefing, the year's review – the screen and the PDF alike). */
export function cushionSection(title: string, points: readonly CushionPoint[], money: (g: number) => string, newestFirst: boolean): ReportSection {
  const rows = points.map((p) => [monthLabel(p.month), money(p.cushion), cushionDeltaText(p.delta, money), rangeText(p.range), rangeChangeText(p.rangeDelta)])
  return {
    title,
    table: { head: ['Miesiąc', 'Osłony + kadłub', 'm/m', 'Zasięg', 'Zasięg m/m'], rows: newestFirst ? rows.reverse() : rows, numeric: [1, 2, 3, 4] },
    text: points.length
      ? 'Osłony (bufor na pensje) i kadłub (fundusz awaryjny) w ostatnim dniu miesiąca, zasięg tego dnia; m/m – zmiana wobec końca poprzedniego miesiąca. Miesiąc w toku – po jego końcu.'
      : 'Brak zakończonych miesięcy budżetu w tym okresie.'
  }
}

/** „Rosną w N z M mies.” – of the months with a change, how many grew. */
const growText = (points: readonly CushionPoint[]): string | null => {
  const changes = points.filter((p) => p.delta != null)
  return changes.length ? `rosną w ${changes.filter((p) => p.delta! > 0).length} z ${changes.length} mies.` : null
}

/** Wywiad: the 12 months that ended, newest first. */
export function CushionPanel({ month }: { month: string }) {
  const points = useCushion(month)
  const grow = growText(points)
  return (
    <Panel title="Osłony i kadłub – 12 miesięcy" testId="intel-cushion">
      {!points.length ? (
        <Empty>Pojawi się po końcu pierwszego miesiąca budżetu.</Empty>
      ) : (
        <div className="flex flex-col gap-1.5 text-[12px]">
          {grow && (
            <span className="text-[11.5px] text-muted" data-testid="intel-cushion-grow">
              Osłony + kadłub {grow}
            </span>
          )}
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="text-dim">
                <th className="py-0.5 text-left font-normal">Miesiąc</th>
                <th className="px-1 text-right font-normal">osłony + kadłub</th>
                <th className="px-1 text-right font-normal">m/m</th>
                <th className="px-1 text-right font-normal">zasięg</th>
                <th className="px-1 text-right font-normal">m/m</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.month} className="border-t border-line/50" data-testid="intel-cushion-row" data-month={p.month}>
                  <td className="py-0.5">{monthLabel(p.month)}</td>
                  <td className="num px-1 text-right" title={`Osłony ${zl(p.shields)} · kadłub ${zl(p.hull)}`} data-testid="intel-cushion-amount">
                    {plnText(p.cushion)}
                  </td>
                  <td
                    className={cx('num px-1 text-right', amountsHidden() || p.delta == null ? 'text-muted' : p.delta > 0 ? 'text-up' : p.delta < 0 ? 'text-down' : 'text-muted')}
                    data-testid="intel-cushion-delta"
                    data-dir={p.delta == null ? undefined : p.delta > 0 ? 'up' : p.delta < 0 ? 'down' : 'same'}
                  >
                    {cushionDeltaText(p.delta, plnText)}
                  </td>
                  <td className="num px-1 text-right text-fg-strong" data-testid="intel-cushion-range">
                    {rangeText(p.range)}
                  </td>
                  <td className="num px-1 text-right text-muted" data-testid="intel-cushion-range-delta">
                    {rangeChangeText(p.rangeDelta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="text-[11px] text-dim">
            Osłony (bufor na pensje) i kadłub (fundusz awaryjny) w ostatnim dniu miesiąca, zasięg tego dnia (osłony + kadłub − dług przez średnie koszty netto); m/m – zmiana wobec końca poprzedniego
            miesiąca. Bieżący miesiąc – po jego końcu (pensja już przeszła do energii).
          </span>
        </div>
      )}
    </Panel>
  )
}

/** The debriefing of a month (Plan miesiąca): its end against the month before. */
export function CushionLine({ month }: { month: string }) {
  const p = useCushion(addMonths(month, 1), 1)[0]
  if (!p) return null
  return (
    <div className="text-[11.5px] text-muted" data-testid="debrief-cushion">
      Osłony + kadłub na koniec miesiąca: <span className="num text-fg-strong">{zl(p.cushion)}</span>
      {p.delta != null && <span className={cx('num', !amountsHidden() && (p.delta > 0 ? 'text-up' : p.delta < 0 ? 'text-down' : ''))}> ({cushionDeltaText(p.delta, plnText)} zł m/m)</span>} · zasięg{' '}
      <span className="num text-fg-strong">{rangeText(p.range)}</span>
      {p.rangeDelta != null && ` (${rangeChangeText(p.rangeDelta)})`}
    </div>
  )
}
