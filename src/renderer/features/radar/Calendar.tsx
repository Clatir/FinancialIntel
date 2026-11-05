/**
 * The month's calendar on Radar (AP-42, T472–T475): the days Monday to Sunday, in each its energy (the engine's – as
 * the game rated the days past, today as Mostek, a forecast of the days ahead) and the radar's items of the day (the
 * same list as „Na radarze”, `calc/calendar.ts`). A day clicked – its items and its operations in Operacje; the months
 * of the radar's window (90 days) to look through. On the phone (T311) the cells keep the day, the energy and marks;
 * the clicked day says the rest under the grid.
 */
import { useContext } from 'react'
import { calendarMonth, calendarMonths, type CalendarDay, type CellEnergy } from '@shared/calc/calendar'
import { addDays, weekdayOf } from '@shared/calc/dates'
import type { FleetState } from '@shared/calc/fleet'
import { RADAR_DAYS, type RadarItem } from '@shared/calc/radar'
import { WEEKDAY_NAME } from '@shared/calc/game'
import { noNarrowing } from '@shared/operationsView'
import { plnText } from '../../components/fields'
import { CompactContext, cx } from '../../components/ui'
import { monthLabel, plDate, WEEKDAY_PL } from '../../lib/format'
import { useDraft } from '../../store/drafts'
import { navigate } from '../../store/ui'
import { showFilter } from '../operations/state'
import { KIND_LABEL } from './labels'

const zl = (g: number) => `${plnText(g)} zł`

/** The day's operations in Operacje (a view – the stored filter stays, B88). */
export function openDay(date: string): void {
  showFilter({ period: { kind: 'range', from: date, to: date }, ...noNarrowing() })
  navigate({ page: 'operations' })
}

/** The calendar's month and day – kept while another screen is looked at (the day's operations and back). */
interface Shown {
  month: string | null
  day: string | null
}

export function RadarCalendar({ fleet, items }: { fleet: FleetState; items: readonly RadarItem[] }) {
  const compact = useContext(CompactContext)
  const [shown, setShown] = useDraft<Shown>('radar:calendar', () => ({ month: null, day: null }))
  const months = calendarMonths(fleet.today)
  // A month out of the window (the next day, a restart of the app in the tray) – the current one.
  const month = shown.month && months.includes(shown.month) ? shown.month : months[0]!
  const at = months.indexOf(month)
  const grid = calendarMonth(month, fleet, items)
  const selected = grid.cells.find((c) => c && c.date === (shown.day ?? (month === months[0] ? fleet.today : null))) ?? null
  const go = (step: number) => setShown({ month: months[at + step] ?? month, day: null })
  return (
    <div className="flex flex-col gap-2 text-[12px]" data-testid="radar-calendar" data-month={month}>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-ghost h-[22px] px-2" disabled={at <= 0} onClick={() => go(-1)} title={at <= 0 ? 'Wcześniejsze miesiące są poza Radarem' : 'Poprzedni miesiąc'} data-testid="radar-calendar-prev">
          ‹
        </button>
        <span className="min-w-[130px] text-center font-medium text-fg-strong" data-testid="radar-calendar-month">
          {monthLabel(month)}
        </span>
        <button type="button" className="btn btn-ghost h-[22px] px-2" disabled={at >= months.length - 1} onClick={() => go(1)} title={at >= months.length - 1 ? 'Dalsze miesiące są poza 90 dniami Radaru' : 'Następny miesiąc'} data-testid="radar-calendar-next">
          ›
        </button>
        {/* Why ‹ and › stop (AP-15): the radar's window, said beside them. */}
        <span className="text-[11px] text-dim" data-testid="radar-calendar-window">
          Radar do {plDate(addDays(fleet.today, RADAR_DAYS))}
        </span>
        {!compact && <span className="ml-auto text-[11px] text-dim">w dniu: przydział energii i wydane z puli dziennej · płatności i wpływy z Radaru</span>}
      </div>
      {grid.earlier.length > 0 && (
        <div className="flex flex-col gap-0.5 border border-line px-2 py-1" data-testid="radar-calendar-earlier">
          <span className="text-[11px] text-accent">Z wcześniejszych miesięcy, niezapłacone ({grid.earlier.length})</span>
          {grid.earlier.map((i) => (
            <ItemRow key={i.key} i={i} />
          ))}
        </div>
      )}
      <div className="grid grid-cols-7 gap-px border border-line bg-line" role="grid" aria-label={`Kalendarz: ${monthLabel(month)}`}>
        {WEEKDAY_PL.slice(1).map((d) => (
          <span key={d} className="bg-panel py-0.5 text-center text-[10.5px] text-dim" role="columnheader">
            {d}
          </span>
        ))}
        {grid.cells.map((c, n) =>
          c ? (
            <Cell key={c.date} c={c} today={fleet.today} selected={selected?.date === c.date} compact={compact} onClick={() => setShown({ month, day: c.date })} />
          ) : (
            <span key={`empty:${n}`} className="bg-bg" />
          )
        )}
      </div>
      {selected ? <DayDetails c={selected} today={fleet.today} /> : <span className="text-[11.5px] text-dim">Kliknij dzień – jego pozycje Radaru i operacje.</span>}
    </div>
  )
}

/** Over the day: spent more than its allowance (the game's violation – the energy below zero). */
const overOf = (e: CellEnergy | null): boolean => !!e && e.state !== 'ahead' && e.spent > e.allowance

function Cell({ c, today, selected, compact, onClick }: { c: CalendarDay; today: string; selected: boolean; compact: boolean; onClick: () => void }) {
  const e = c.energy
  const over = overOf(e)
  const late = c.items.some((i) => i.overdue)
  const marks = c.items.filter((i) => i.amount == null).length
  return (
    <button
      type="button"
      role="gridcell"
      aria-selected={selected}
      className={cx(
        'flex flex-col items-stretch gap-0.5 px-1 py-0.5 text-left',
        compact ? 'min-h-[52px]' : 'min-h-[64px]',
        selected ? 'bg-raised' : 'bg-panel hover:bg-raised',
        c.date === today && 'outline outline-1 -outline-offset-1 outline-accent',
        c.beyond && 'opacity-50'
      )}
      onClick={onClick}
      title={cellTitle(c, today)}
      data-testid="radar-calendar-cell"
      data-date={c.date}
      data-state={e?.state ?? 'none'}
      data-over={over ? 'yes' : undefined}
      data-items={c.items.length}
    >
      <span className="flex items-baseline gap-1">
        <span className={cx('num text-[11px]', c.date === today ? 'text-accent' : c.date < today ? 'text-muted' : 'text-fg-strong')}>{Number(c.date.slice(8, 10))}</span>
        {(marks > 0 || late) && <span className={cx('ml-auto text-[10px]', late ? 'text-accent' : 'text-dim')}>{late ? '!' : '•'.repeat(Math.min(3, marks))}</span>}
      </span>
      {e && <EnergyLines e={e} over={over} compact={compact} />}
      {!compact && c.out > 0 && <span className="num truncate text-[10.5px] text-fg" data-testid="radar-calendar-out">−{plnText(c.out)}</span>}
      {!compact && c.in > 0 && <span className="num truncate text-[10.5px] text-up" data-testid="radar-calendar-in">+{plnText(c.in)}</span>}
      {compact && (c.out > 0 || c.in > 0) && (
        <span className="flex gap-0.5">
          {c.out > 0 && <span className="h-[4px] w-[4px] bg-fg" />}
          {c.in > 0 && <span className="h-[4px] w-[4px] bg-up" />}
        </span>
      )}
    </button>
  )
}

function EnergyLines({ e, over, compact }: { e: CellEnergy; over: boolean; compact: boolean }) {
  if (e.state === 'ahead')
    return (
      <span className="num truncate text-[10.5px] text-dim" data-testid="radar-calendar-energy">
        ≈{plnText(e.allowance)}
      </span>
    )
  return (
    <>
      <span className="num truncate text-[10.5px] text-muted" data-testid="radar-calendar-energy">
        {plnText(e.allowance)}
      </span>
      {!compact && (
        <span className={cx('num truncate text-[10.5px]', over ? 'text-accent' : 'text-fg')} data-testid="radar-calendar-spent">
          {plnText(e.spent)}
        </span>
      )}
    </>
  )
}

/** The cell's hover: what its numbers are, with the names and amounts (the metaphor beside the real name). */
function cellTitle(c: CalendarDay, today: string): string {
  const lines = [plDate(c.date), energyText(c, today)]
  for (const i of c.items) lines.push(`${KIND_LABEL[i.kind]}: ${i.name}${i.amount == null ? '' : ` ${amountText(i)}`}`)
  return lines.filter(Boolean).join('\n')
}

const amountText = (i: RadarItem): string => (i.amount == null ? '—' : `${i.direction === 'in' ? '+' : i.direction === 'out' ? '−' : ''}${zl(i.amount)}`)

/** What the day's energy is, in words (T472, T473). */
function energyText(c: CalendarDay, today: string): string {
  const e = c.energy
  if (!e) return c.date.slice(0, 7) > today.slice(0, 7) ? 'Energia dnia: przydział tego miesiąca policzy jego plan po pensji 1. dnia' : 'Energia dnia: brak planu miesiąca – bez przydziału'
  if (e.state === 'ahead') return `Energia dnia (prognoza): ok. ${zl(e.allowance)} – przydział od jutra, jeśli dziś nic więcej nie wydasz`
  const left = e.allowance - e.spent
  const head = e.state === 'today' ? `Energia dziś: ${zl(e.energy)}` : `Energia dnia: zostało ${zl(left)}`
  return `${head} (przydział ${zl(e.allowance)} − wydane ${zl(e.spent)})${left < 0 ? ` – ponad przydział o ${zl(-left)}` : ''}`
}

function ItemRow({ i }: { i: RadarItem }) {
  const note = i.overdue ? i.note || 'po terminie' : i.note
  return (
    <div className="flex items-baseline gap-2" data-testid="radar-calendar-item" data-kind={i.kind}>
      <span className="w-[64px] shrink-0 text-[11px] text-dim">{KIND_LABEL[i.kind]}</span>
      <span className="min-w-0 flex-1 truncate text-fg-strong">{i.name}</span>
      {note && <span className={cx('max-w-[40%] truncate text-[11px]', i.overdue ? 'text-accent' : 'text-dim')}>{note}</span>}
      <span className={cx('num shrink-0 whitespace-nowrap text-right', i.direction === 'in' ? 'text-up' : 'text-fg')}>{amountText(i)}</span>
    </div>
  )
}

function DayDetails({ c, today }: { c: CalendarDay; today: string }) {
  const weekday = WEEKDAY_NAME[weekdayOf(c.date) - 1]
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-1.5" data-testid="radar-calendar-day" data-date={c.date}>
      <div className="flex items-baseline gap-2">
        <span className="font-medium text-fg-strong">
          {weekday}, {plDate(c.date)}
          {c.date === today ? ' · dziś' : ''}
        </span>
        <button type="button" className="ml-auto text-[11.5px] text-accent hover:underline" onClick={() => openDay(c.date)} data-testid="radar-calendar-operations">
          operacje tego dnia ›
        </button>
      </div>
      <span className={cx('text-[11.5px]', overOf(c.energy) ? 'text-accent' : 'text-muted')} data-testid="radar-calendar-day-energy">
        {energyText(c, today)}
      </span>
      {c.beyond && <span className="text-[11.5px] text-dim">Poza 90 dniami Radaru – pozycji tego dnia Radar jeszcze nie pokazuje.</span>}
      {c.items.length ? c.items.map((i) => <ItemRow key={i.key} i={i} />) : !c.beyond && <span className="text-[11.5px] text-dim">Nic na radarze tego dnia.</span>}
    </div>
  )
}
