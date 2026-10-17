/**
 * Raporty (spec „Wywiad i raporty”, E8, D73): the morning briefing, the watch report of a week (on Sunday), the
 * debriefing of a month (plan against fact – the FVG –, the game, the log, the loot), the year's review; the exports –
 * CSV and Excel (operations, months), PDF (debriefing, year's review), the whole data as a ZIP. The files carry the real
 * amounts (the hidden amounts are the screen's).
 */
import { useMemo, useState, type ReactNode } from 'react'
import { addDays, isoWeekOf, mondayOf, monthOf, monthRange, warsawNow, weekdayOf } from '@shared/calc/dates'
import { missionStatus, missionText, missionTitle, sundayOf, ACHIEVEMENT_INFO, ACHIEVEMENTS, type AchievementId } from '@shared/calc/game'
import { defaultWatchMonday, goalsReachedIn, killzoneGrid, logAccuracy, nextWeekEnvelopes, weekNumbers, yearNumbers, yearWealth } from '@shared/calc/intel'
import { setReportTab, setWatchMonday, useReportsUi, type ReportTab } from './state'
import { debriefing, planFor } from '@shared/calc/plan'
import { SHIP_CLASS_LABEL } from '@shared/calc/fleet'
import { monthRows, monthsCsv, monthsSheet, operationRows, operationsCsv, operationsSheet, reportHtml, type ReportSection } from '@shared/export/budget'
import { formatPln } from '@shared/format'
import { useData } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { useGame } from '../../store/game'
import { useRecordList } from '../../store/records'
import { toast } from '../../store/ui'
import { api } from '../../lib/api'
import { DateField, plnText } from '../../components/fields'
import { Columns } from '../../components/layout'
import { Empty, Panel, Segmented, cx } from '../../components/ui'
import { dayLabel, monthLabel, plDate, WEEKDAY_PL } from '../../lib/format'
import { useCategories } from '../operations/pickers'
import { useBriefingItems } from '../bridge/BridgePage'

const zl = (g: number) => `${plnText(g)} zł`
/** The files: the real amounts (D73). */
const fileZl = (g: number) => `${formatPln(g)} zł`

type Tab = ReportTab
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'briefing', label: 'Odprawa' },
  { value: 'watch', label: 'Raport wachty' },
  { value: 'debrief', label: 'Debriefing' },
  { value: 'year', label: 'Przegląd roczny' },
  { value: 'export', label: 'Eksport' }
]

const saved = (path: string | null) => {
  if (path) toast(`Zapisano: ${path}`, 'success', 6000)
}
const failed = (e: unknown) => toast(`Nie udało się zapisać: ${e instanceof Error ? e.message : String(e)}`, 'error', 8000)

export function ReportsPage() {
  const fleet = useFleet()
  const tab = useReportsUi((s) => s.tab)
  if (!fleet) return <Empty>Wczytywanie…</Empty>
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-reports">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Raporty</h1>
        <Segmented size="sm" value={tab} onChange={setReportTab} options={TABS} aria-label="Raport" />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'briefing' && <BriefingReport />}
        {tab === 'watch' && <WatchReport />}
        {tab === 'debrief' && <DebriefReport />}
        {tab === 'year' && <YearReport />}
        {tab === 'export' && <ExportPanel />}
      </div>
    </div>
  )
}

function Line({ label, value, strong, testId }: { label: ReactNode; value: ReactNode; strong?: boolean; testId?: string }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span className="text-muted">{label}</span>
      <span className={cx('num ml-auto', strong ? 'text-fg-strong' : 'text-fg')} data-testid={testId}>
        {value}
      </span>
    </div>
  )
}

function BriefingReport() {
  const fleet = useFleet()
  const items = useBriefingItems(fleet)
  if (!fleet) return null
  return (
    <Columns id="reports-briefing" tracks={['minmax(420px,1fr)']} className="grid items-start">
      <Panel title={`Odprawa – ${dayLabel(fleet.today)}`} name="Odprawa" testId="reports-briefing">
        <div className="flex flex-col text-[12px]">
          {fleet.daily && <Line label="Energia dziś" value={zl(fleet.daily.left)} strong />}
          {!items.length && <span className="text-muted">Bez alarmów – kurs stabilny.</span>}
          {items.map((i) => (
            <span key={i.key} className={cx('py-0.5', i.level === 'red' ? 'text-down' : 'text-fg')} data-testid="reports-briefing-item">
              {i.text}
            </span>
          ))}
        </div>
      </Panel>
    </Columns>
  )
}

function WatchReport() {
  const fleet = useFleet()!
  const game = useGame()
  const settings = useData((s) => s.fi!.settings)
  const transactions = useRecordList('transactions')
  const cats = useCategories()
  const monday = useReportsUi((s) => s.watchMonday) ?? defaultWatchMonday(fleet.today, warsawNow().time)
  const setMonday = setWatchMonday
  const sunday = addDays(monday, 6)
  const w = useMemo(() => weekNumbers(transactions, settings.categories, monday), [transactions, settings, monday])
  const kz = useMemo(() => killzoneGrid(transactions, monday, sunday), [transactions, monday, sunday])
  const top = [...kz.cells.values()].sort((a, b) => b.cost - a.cost)[0] ?? null
  const week = isoWeekOf(monday)
  const mission = game?.view.missions.find((m) => m.week === week) ?? null
  const status = mission && game ? missionStatus(game.input, mission, fleet.today) : null
  const days = game ? new Map(game.input.game.flatMap((g) => Object.entries(g.days))) : new Map()
  const current = monday === mondayOf(fleet.today)
  const next = current || addDays(monday, 7) === mondayOf(fleet.today) ? nextWeekEnvelopes(fleet.envelopes, fleet.today) : []
  const maxDay = Math.max(1, ...w.days.map((d) => d.costs))
  return (
    <Columns id="reports-watch" tracks={['minmax(420px,1fr)', 'minmax(340px,1fr)']} className="grid items-start">
      <div className="flex min-w-0 flex-col">
        <Panel title={`Raport wachty – ${plDate(monday)} – ${plDate(sunday)}`} name="Raport wachty" testId="reports-watch">
          <div className="flex flex-col gap-1.5 text-[12px]">
            <div className="flex items-center gap-2">
              <button className="btn h-[22px]" onClick={() => setMonday(addDays(monday, -7))} data-testid="reports-watch-prev">
                ‹ tydzień wcześniej
              </button>
              <button className="btn h-[22px]" disabled={monday >= mondayOf(fleet.today)} onClick={() => setMonday(addDays(monday, 7))}>
                później ›
              </button>
            </div>
            <Line label="Koszty netto" value={zl(w.costs)} strong testId="reports-watch-costs" />
            <Line label="Wpływy" value={zl(w.income)} />
            <div className="flex flex-col pt-1">
              {w.days.map((d) => {
                const g = days.get(d.date)
                return (
                  <div key={d.date} className="flex items-center gap-2 text-[11.5px]">
                    <span className="w-[54px] text-dim">
                      {WEEKDAY_PL[weekdayOf(d.date)]} {d.date.slice(8, 10)}.{d.date.slice(5, 7)}
                    </span>
                    <div className="h-[5px] flex-1 bg-line">
                      <div className="h-full bg-accent" style={{ width: `${(d.costs / maxDay) * 100}%` }} />
                    </div>
                    <span className="num w-[80px] text-right">{plnText(d.costs)}</span>
                    <span className={cx('w-[64px] text-right text-[10.5px]', g?.status === 'broken' ? 'text-accent' : 'text-dim')}>{g ? (g.status === 'ok' ? 'zgodny' : 'naruszenie') : '—'}</span>
                  </div>
                )
              })}
            </div>
            {w.categories.length > 0 && (
              <div className="flex flex-col border-t border-line pt-1.5">
                <span className="label pb-0.5">Kategorie tygodnia</span>
                {w.categories.slice(0, 6).map((c) => (
                  <Line key={c.id} label={c.id === 'cargo' ? 'Ładownia' : c.id === '-' ? 'bez kategorii' : cats.label(c.id)} value={zl(c.cost)} />
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>
      <div className="flex min-w-0 flex-col">
        <Panel title="Killzone tygodnia" testId="reports-watch-killzone">
          <span className="text-[12px]">
            {top
              ? `${WEEKDAY_PL[top.weekday]} ${String(top.hour).padStart(2, '0')}:00–${String(top.hour + 1).padStart(2, '0')}:00 – ${zl(top.cost)} (${top.count} zak.)`
              : 'Brak zakupów z godziną w tym tygodniu.'}
          </span>
        </Panel>
        <Panel title="Misja tygodnia" testId="reports-watch-mission">
          <span className="text-[12px]">
            {mission
              ? `${missionTitle(mission.template)}: ${missionText(mission, cats.label, zl)} ${mission.evaluatedAt ? (mission.done ? '– wykonana.' : '– niewykonana.') : status?.ok ? '– na razie na kursie.' : '– na razie chybiona.'}`
              : 'Bez misji w tym tygodniu.'}
          </span>
        </Panel>
        {next.length > 0 && (
          <Panel title="Koperty na następny tydzień" testId="reports-watch-envelopes">
            <div className="flex flex-col text-[12px]">
              {next.map((e) => (
                <Line key={e.categoryId} label={cats.label(e.categoryId)} value={`${zl(e.week)} na ${e.days} dni (zostało ${zl(e.left)})`} />
              ))}
              <span className="text-[11px] text-dim">To, co zostało w kopercie, rozłożone na dni do końca miesiąca – na najbliższe dni (od 1. koperty startują od nowa).</span>
            </div>
          </Panel>
        )}
      </div>
    </Columns>
  )
}

/** The debriefing's content: on the screen and in the PDF the same. */
function useDebrief(month: string) {
  const fleet = useFleet()!
  const settings = useData((s) => s.fi!.settings)
  const transactions = useRecordList('transactions')
  const plans = useRecordList('months')
  const game = useGame()
  return useMemo(() => {
    const brief = debriefing(month, { transactions, categories: settings.categories, plans, log: fleet.log, today: fleet.today })
    const log = logAccuracy(transactions, settings.orders, [month])[0]!
    const g = game?.input.game.find((x) => x.month === month)
    const days = Object.values(g?.days ?? {})
    // The missions judged in the month (their Sunday in it).
    const missions = (game?.input.game ?? []).flatMap((x) => x.missions).filter((m) => m.evaluatedAt && sundayOf(m.week).startsWith(month))
    const achievements = (game?.input.game ?? []).flatMap((x) => x.achievements).filter((a) => (a.day ?? '').startsWith(month))
    return {
      brief,
      log,
      plan: planFor(plans, month),
      game: {
        ok: days.filter((d) => d.status === 'ok').length,
        broken: days.filter((d) => d.status === 'broken').length,
        serious: days.reduce((n, d) => n + d.violations.filter((v) => v.serious).length, 0),
        missions: missions.filter((m) => m.done).length,
        missionsAll: missions.length,
        achievements: achievements.map((a) => a.id).filter((id): id is AchievementId => (ACHIEVEMENTS as readonly string[]).includes(id))
      }
    }
  }, [month, fleet, settings, transactions, plans, game])
}

function DebriefReport() {
  const fleet = useFleet()!
  const cats = useCategories()
  const first = fleet.start ? monthOf(fleet.start) : fleet.month
  const months = monthRange(first, fleet.month).reverse()
  const [month, setMonth] = useState(() => (months[1] ?? months[0])!)
  const d = useDebrief(month)
  const b = d.brief
  const loot = d.plan?.month === month ? d.plan.loot : null
  const sections = (money: (g: number) => string, label: (id: string) => string): ReportSection[] => [
    {
      title: 'Wynik wobec planu',
      lines: [
        ['Pensja od siebie', b.salary == null ? '—' : money(b.salary)],
        ['Koszty netto', money(b.costs)],
        ['Ładownia i odkładki', money(b.cargo)],
        ['Miesiąc zamknięty na plus', b.plus == null ? '—' : b.plus ? 'tak' : 'nie'],
        ['Łupy (energia na koniec miesiąca)', b.loot == null ? 'miesiąc trwa' : money(b.loot)]
      ]
    },
    {
      title: 'FVG kopert (plan − fakt)',
      table: { head: ['Koperta', 'Limit', 'Wydane', 'FVG'], rows: b.envelopes.map((e) => [label(e.categoryId), money(e.limit), money(e.spent), money(e.gap)]), numeric: [1, 2, 3] }
    },
    {
      title: 'Dowództwo',
      lines: [
        ['Dni zgodne / z naruszeniem', `${d.game.ok} / ${d.game.broken}`],
        ['Poważne naruszenia', String(d.game.serious)],
        ['Misje wykonane', `${d.game.missions} z ${d.game.missionsAll}`],
        ['Osiągnięcia', d.game.achievements.map((id) => ACHIEVEMENT_INFO[id].name).join(', ') || '—']
      ]
    },
    {
      title: 'Dziennik kapitański',
      lines: [
        ['Plan', `${d.log.plan.count} · ${money(d.log.plan.amount)}`],
        ['Impuls', `${d.log.impulse.count} · ${money(d.log.impulse.amount)}`],
        ['Bez oznaczenia (od progu)', String(d.log.unmarked)]
      ]
    },
    ...(loot
      ? [
          {
            title: 'Podział łupów',
            lines: [
              ['Na następny miesiąc', money(loot.nextMonth)],
              ['Do celów', money(Object.values(loot.goals).reduce((a, x) => a + x, 0))],
              ['Do osłon', money(loot.shields)]
            ] as Array<[string, string]>
          }
        ]
      : [])
  ]
  const pdf = () =>
    api
      .savePdf(`debriefing_${month}.pdf`, reportHtml(`Debriefing – ${monthLabel(month)}`, `Financial Intel · ${fleet.today}`, sections(fileZl, cats.label)))
      .then(saved, failed)
  return (
    <Columns id="reports-debrief" tracks={['minmax(460px,1fr)']} className="grid items-start">
      <Panel
        title={`Debriefing – ${monthLabel(month)}`}
        name="Debriefing"
        testId="reports-debrief"
        actions={
          <button className="btn h-[22px]" onClick={pdf} data-testid="reports-debrief-pdf">
            PDF
          </button>
        }
      >
        <div className="flex flex-col gap-2 text-[12px]">
          <select className="input h-[24px] self-start" value={month} onChange={(e) => setMonth(e.currentTarget.value)} aria-label="Miesiąc debriefingu" data-testid="reports-debrief-month">
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          {sections(zl, cats.label).map((s) => (
            <SectionView key={s.title} s={s} />
          ))}
        </div>
      </Panel>
    </Columns>
  )
}

function SectionView({ s }: { s: ReportSection }) {
  return (
    <div className="flex flex-col border-t border-line pt-1.5" data-testid="report-section">
      <span className="label pb-0.5">{s.title}</span>
      {s.lines?.map(([k, v]) => <Line key={k} label={k} value={v} />)}
      {s.table && (
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="text-dim">
              {s.table.head.map((h, i) => (
                <th key={h} className={cx('py-0.5 font-normal', s.table?.numeric?.includes(i) ? 'text-right' : 'text-left')}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.table.rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, i) => (
                  <td key={i} className={cx('py-0.5', s.table?.numeric?.includes(i) && 'num text-right')}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {s.text && <span className="text-muted">{s.text}</span>}
    </div>
  )
}

function YearReport() {
  const fleet = useFleet()!
  const settings = useData((s) => s.fi!.settings)
  const transactions = useRecordList('transactions')
  const balances = useRecordList('balances')
  const game = useGame()
  const cats = useCategories()
  const thisYear = fleet.today.slice(0, 4)
  // In January the review of the year just closed (spec).
  const [year, setYear] = useState(() => (fleet.today.slice(5, 7) === '01' ? String(Number(thisYear) - 1) : thisYear))
  const y = useMemo(() => yearNumbers(transactions, settings.categories, year), [transactions, settings, year])
  const today = fleet.today
  const wealth = useMemo(() => yearWealth(transactions, balances, settings.accounts.map((a) => a.id), year, today), [transactions, balances, settings, year, today])
  const achievements = (game?.input.game ?? []).flatMap((g) => g.achievements).filter((a) => (a.day ?? '').startsWith(year) && (ACHIEVEMENTS as readonly string[]).includes(a.id))
  const reached = goalsReachedIn(fleet.log, fleet.goals, year)
  const sections = (money: (g: number) => string): ReportSection[] => [
    {
      title: 'Rok w liczbach',
      lines: [
        ['Koszty netto', money(y.costs)],
        ['Wpływy', money(y.income)],
        ['Majątek na początku (31.12 roku wcześniej)', money(wealth.start)],
        [`Majątek na końcu (${`${year}-12-31` < today ? '31.12' : 'dziś'})`, money(wealth.end)],
        ['Zasięg teraz', fleet.range == null ? '—' : `${fleet.range.toFixed(1).replace('.', ',')} mies.${fleet.shipClass ? ` (${SHIP_CLASS_LABEL[fleet.shipClass]})` : ''}`]
      ]
    },
    { title: 'Miesiące', table: { head: ['Miesiąc', 'Koszty', 'Wpływy'], rows: y.months.map((m) => [monthLabel(m.month), money(m.costs), money(m.income)]), numeric: [1, 2] } },
    { title: 'Kategorie', table: { head: ['Kategoria', 'Koszty'], rows: y.categories.slice(0, 12).map((c) => [c.id === 'cargo' ? 'Ładownia' : c.id === '-' ? 'bez kategorii' : cats.label(c.id), money(c.cost)]), numeric: [1] } },
    {
      title: 'Cele i osiągnięcia',
      lines: [
        ['Cele osiągnięte w roku', reached.join(', ') || '—'],
        ['Osiągnięcia roku', achievements.map((a) => ACHIEVEMENT_INFO[a.id as AchievementId].name).join(', ') || '—']
      ]
    },
    { title: 'PIT-38', text: `Rozliczenie za ${year}: termin 30 kwietnia ${Number(year) + 1}. Kwotę liczy ICT Trade Journal (rezerwa podatkowa).` }
  ]
  const years = [...new Set([...transactions.map((t) => t.date.slice(0, 4)), thisYear])].sort().reverse()
  const pdf = () => api.savePdf(`przeglad_${year}.pdf`, reportHtml(`Przegląd roczny ${year}`, `Financial Intel · ${fleet.today}`, sections(fileZl))).then(saved, failed)
  return (
    <Columns id="reports-year" tracks={['minmax(460px,1fr)']} className="grid items-start">
      <Panel
        title={`Przegląd roczny ${year}`}
        name="Przegląd roczny"
        testId="reports-year"
        actions={
          <button className="btn h-[22px]" onClick={pdf} data-testid="reports-year-pdf">
            PDF
          </button>
        }
      >
        <div className="flex flex-col gap-2 text-[12px]">
          <select className="input h-[24px] self-start" value={year} onChange={(e) => setYear(e.currentTarget.value)} aria-label="Rok przeglądu">
            {years.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          {sections(zl).map((s) => (
            <SectionView key={s.title} s={s} />
          ))}
        </div>
      </Panel>
    </Columns>
  )
}

function ExportPanel() {
  const fleet = useFleet()!
  const settings = useData((s) => s.fi!.settings)
  const transactions = useRecordList('transactions')
  const plans = useRecordList('months')
  const [from, setFrom] = useState(`${fleet.today.slice(0, 4)}-01-01`)
  const [to, setTo] = useState(fleet.today)
  const ops = () => operationRows(transactions, settings.categories, settings.accounts, from, to)
  const months = () =>
    monthRows({ transactions, categories: settings.categories, plans, log: fleet.log, today: fleet.today }, monthRange(monthOf(from), monthOf(to) > fleet.month ? fleet.month : monthOf(to)))
  const name = (what: string, ext: string) => `financial-intel_${what}_${from}_${to}.${ext}`
  const csv = { name: 'CSV', extensions: ['csv'] }
  return (
    <Columns id="reports-export" tracks={['minmax(420px,1fr)']} className="grid items-start">
      <Panel title="Eksport" testId="reports-export">
        <div className="flex flex-col gap-2 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="text-muted">Okres</span>
            <DateField className="h-[24px] w-[100px]" value={from} onChange={setFrom} aria-label="Od" data-testid="export-from" />
            <span className="text-muted">–</span>
            <DateField className="h-[24px] w-[100px]" value={to} onChange={setTo} aria-label="Do" data-testid="export-to" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn h-[26px]" onClick={() => api.saveTextFile(name('operacje', 'csv'), operationsCsv(ops()), csv).then(saved, failed)} data-testid="export-operations-csv">
              Operacje – CSV
            </button>
            <button className="btn h-[26px]" onClick={() => api.saveTextFile(name('miesiace', 'csv'), monthsCsv(months()), csv).then(saved, failed)} data-testid="export-months-csv">
              Miesiące – CSV
            </button>
            <button className="btn h-[26px]" onClick={() => api.saveXlsx(name('budzet', 'xlsx'), [operationsSheet(ops()), monthsSheet(months())]).then(saved, failed)} data-testid="export-xlsx">
              Excel (operacje + miesiące)
            </button>
            <button className="btn h-[26px]" onClick={() => api.exportZip().then(saved, failed)} data-testid="export-zip">
              Pełna kopia danych – ZIP
            </button>
          </div>
          <span className="text-[11px] text-dim">
            Pliki zawsze z prawdziwymi kwotami – ukrycie kwot (Ctrl+$) dotyczy tylko ekranu. CSV dla polskiego Excela (średnik, przecinek dziesiętny). Debriefing i
            przegląd roczny jako PDF – w ich zakładkach.
          </span>
        </div>
      </Panel>
    </Columns>
  )
}
