/**
 * Raporty (spec „Wywiad i raporty”, E8, D73): the morning briefing, the watch report of a week (on Sunday), the
 * debriefing of a month (plan against fact – the FVG –, the game, the log, the loot), the year's review; the exports –
 * CSV and Excel (operations, months), PDF (debriefing, year's review), the whole data as a ZIP. The files carry the real
 * amounts (the hidden amounts are the screen's).
 */
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { addDays, addMonths, isoWeekOf, monthOf, monthRange, warsawNow, weekdayOf } from '@shared/calc/dates'
import { missionStatus, missionText, missionTitle, sundayOf, ACHIEVEMENT_INFO, ACHIEVEMENTS, type AchievementId } from '@shared/calc/game'
import { defaultWatchMonday, goalsReachedIn, killzoneGrid, logAccuracy, nextWeekEnvelopes, weekCovers, weekNumbers, yearNumbers, yearSpan, yearWealth } from '@shared/calc/intel'
import { readExportPeriod, setReportTab, setWatchMonday, storeExportPeriod, useReportsUi, watchMondayOf, type ReportTab } from './state'
import { debriefing, lootApplied, lootChange, planFor, transactionsOfMonth } from '@shared/calc/plan'
import { energyFlows, monthFlows, outsideMoney } from '@shared/calc/sankey'
import { memberName } from '@shared/calc/household'
import { SHIP_CLASS_LABEL } from '@shared/calc/fleet'
import { arrangeBriefing, BIAS_LABEL, dailyBias } from '@shared/calc/briefing'
import { categoryIndex, sum } from '@shared/calc/operations'
import { fuelSummary, rateText, savingsRate } from '@shared/calc/fuel'
import { netAdjustments } from '@shared/calc/netWorth'
import { budgetWorkbook, monthRows, monthsCsv, operationRows, operationsCsv, operationsOfPeriod, partRowsOf, partsCsv, reportHtml, type ReportSection } from '@shared/export/budget'
import { formatPln, rangeText } from '@shared/format'
import { ictOf } from '@shared/glossary'
import { useData } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { useGameView } from '../../store/game'
import { useRecordList } from '../../store/records'
import { toast } from '../../store/ui'
import { api } from '../../lib/api'
import { orderRange, swappedText } from '../../lib/guards'
import { DateField, plnText } from '../../components/fields'
import { Columns } from '../../components/layout'
import { Empty, Panel, Segmented, cx } from '../../components/ui'
import { countLabel, dayLabel, monthLabel, plDate, WEEKDAY_PL } from '../../lib/format'
import { useCategories } from '../operations/pickers'
import { useBriefingItems } from '../bridge/BridgePage'
import { cushionSection, useCushion } from '../intel/Cushion'
import { MonthSankey, sankeyPdfSvg, type SankeyView } from './MonthSankey'

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
const NO_OPERATIONS = 'Brak operacji w okresie.'
const NO_MONTHS = 'Brak miesięcy w okresie.'
const NO_DATA = 'Brak operacji i miesięcy w okresie.'
const failed = (e: unknown) => toast(`Nie udało się zapisać: ${e instanceof Error ? e.message : String(e)}`, 'error', 8000)

/** The costs linked to the cargo's containers (N72): one name in every report – monthly and periodic fees alike. */
const CARGO_LABEL = 'Ładownia (kontenery i opłaty okresowe)'
/** The net costs of operations dated after today (AP-36): apart, as the balances and the engine see them. */
const PLANNED_LABEL = 'Zaplanowane (operacje z datą po dziś – poza kosztami)'

/** A gap of the plan (FVG) as on the screens (N33): a plus sign on the plus – unless the amounts are hidden. */
const signed = (money: (g: number) => string, g: number): string => {
  const text = money(g)
  return g > 0 && /\d/.test(text) ? `+${text}` : text
}

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
  const bias = dailyBias(fleet)
  // The whole briefing in the bridge's order (AP-16): alarms, the day's matters, the rest – one line per matter.
  const view = arrangeBriefing(items, fleet.today)
  const rows = [...view.shown, ...view.rest]
  return (
    <Columns id="reports-briefing" tracks={['minmax(420px,1fr)']} className="grid items-start">
      <Panel title={`Odprawa – ${dayLabel(fleet.today)}`} name="Odprawa" testId="reports-briefing">
        <div className="flex flex-col text-[12px]">
          {fleet.daily && <Line label="Energia dziś" value={zl(fleet.daily.energy)} strong />}
          {/* The briefing's first element (spec, N26) – as on the bridge. */}
          {bias && <Line label={<span title={ictOf('Daily Bias')}>Daily Bias</span>} value={`${bias === 'bullish' ? '▲' : bias === 'bearish' ? '▼' : '◆'} ${BIAS_LABEL[bias]}`} testId="reports-briefing-bias" />}
          {!rows.length && <span className="text-muted">Bez alarmów – kurs stabilny.</span>}
          {rows.map((i) => (
            <span key={i.key} className={cx('py-0.5', i.level === 'red' ? 'text-down' : 'text-fg')} data-testid="reports-briefing-item" data-tier={i.tier}>
              {[i.text, ...i.also].join(' ')}
            </span>
          ))}
        </div>
      </Panel>
    </Columns>
  )
}

function WatchReport() {
  const fleet = useFleet()!
  const game = useGameView()
  const settings = useData((s) => s.fi!.settings)
  const transactions = useRecordList('transactions')
  const cats = useCategories()
  // A week chosen weeks ago is not kept (N71): the week due now once another one is due.
  const due = defaultWatchMonday(fleet.today, warsawNow().time)
  const monday = watchMondayOf(useReportsUi((s) => s.watch), due)
  const setMonday = setWatchMonday
  const sunday = addDays(monday, 6)
  const w = useMemo(() => weekNumbers(transactions, settings.categories, monday, fleet.incomeContext), [transactions, settings, monday, fleet.incomeContext])
  const kz = useMemo(() => killzoneGrid(transactions, monday, sunday), [transactions, monday, sunday])
  const top = [...kz.cells.values()].sort((a, b) => b.cost - a.cost)[0] ?? null
  const week = isoWeekOf(monday)
  const mission = game?.view.missions.find((m) => m.week === week) ?? null
  const status = useMemo(() => (mission && game ? missionStatus(game.input, mission, fleet.today) : null), [mission, game, fleet.today])
  const days = game ? new Map(game.input.game.flatMap((g) => Object.entries(g.days))) : new Map()
  // One „current” week (AP-24, RY sp. 2): the week due – its plan for the next days; a week in progress is not reported.
  const next = monday === due ? nextWeekEnvelopes(fleet.envelopes, fleet.today) : []
  // The covers of the week's overruns (PM sp. 12, F28): as the command's log says them.
  const plans = useRecordList('months')
  const covers = useMemo(() => weekCovers(plans, monday, (iso) => warsawNow(iso).date), [plans, monday])
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
              <button className="btn h-[22px]" disabled={monday >= due} onClick={() => setMonday(addDays(monday, 7))} data-testid="reports-watch-next">
                później ›
              </button>
              {monday !== due && (
                <button className="btn btn-ghost h-[22px]" onClick={() => setMonday(due)} data-testid="reports-watch-current">
                  bieżący
                </button>
              )}
            </div>
            <Line label="Koszty netto" value={zl(w.costs)} strong testId="reports-watch-costs" />
            <Line label={<span title="Przychód: praca i trading netto – bez zwrotów, pożyczek i pieniędzy domowników">Przychody</span>} value={zl(w.income)} />
            <div className="flex flex-col pt-1">
              {w.days.map((d) => {
                const g = days.get(d.date)
                return (
                  <div key={d.date} className="flex items-center gap-2 text-[11.5px]" data-testid="reports-watch-day">
                    <span className="w-[54px] text-dim">
                      {WEEKDAY_PL[weekdayOf(d.date)]} {d.date.slice(8, 10)}.{d.date.slice(5, 7)}
                    </span>
                    <div className="h-[5px] flex-1 bg-line">
                      <div className="h-full bg-accent" style={{ width: `${(d.costs / maxDay) * 100}%` }} />
                    </div>
                    <span className="num w-[96px] text-right">{zl(d.costs)}</span>
                    <span className={cx('w-[64px] text-right text-[10.5px]', g?.status === 'broken' ? 'text-accent' : 'text-dim')}>{g ? (g.status === 'ok' ? 'zgodny' : 'naruszenie') : '—'}</span>
                  </div>
                )
              })}
            </div>
            {w.categories.length > 0 && (
              <div className="flex flex-col border-t border-line pt-1.5">
                <span className="label pb-0.5">Kategorie tygodnia</span>
                {w.categories.slice(0, 6).map((c) => (
                  <Line key={c.id} label={c.id === 'cargo' ? CARGO_LABEL : c.id === '-' ? 'bez kategorii' : cats.label(c.id)} value={zl(c.cost)} />
                ))}
              </div>
            )}
            {covers.length > 0 && (
              <div className="flex flex-col border-t border-line pt-1.5" data-testid="reports-watch-covers">
                <span className="label pb-0.5">Pokrycia przekroczonych kopert</span>
                {covers.map((c, i) => (
                  <Line key={i} label={`${plDate(c.date).slice(0, 5)} ${cats.label(c.to)} z koperty ${cats.label(c.from)}`} value={`${zl(c.amount)} limitu`} />
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
              ? `${missionTitle(mission.template)}: ${missionText(mission, cats.label, zl).replace(/\.$/, '')} ${mission.evaluatedAt ? (mission.done ? '– wykonana.' : '– niewykonana.') : status?.ok ? '– na razie na kursie.' : '– na razie chybiona.'}`
              : 'Bez misji w tym tygodniu.'}
          </span>
        </Panel>
        {next.length > 0 && (
          <Panel title="Koperty na następny tydzień" testId="reports-watch-envelopes">
            <div className="flex flex-col text-[12px]">
              {next.map((e) => (
                <Line key={e.categoryId} label={cats.label(e.categoryId)} value={`${zl(e.week)} na ${countLabel(e.days, 'dzień', 'dni', 'dni')} (zostało ${zl(e.left)})`} />
              ))}
              <span className="text-[11px] text-dim">To, co zostało w kopercie, rozłożone na dni do końca miesiąca – na najbliższe dni (od 1. koperty startują od nowa).</span>
            </div>
          </Panel>
        )}
      </div>
    </Columns>
  )
}

/** What household members financed (D80): the sum and each member's part („640,00 zł (Mama 400,00 zł · Tata 240,00 zł)”). */
function financedText(rows: ReadonlyArray<{ memberId: string; amount: number }>, money: (g: number) => string, members: ReadonlyArray<{ id: string; name: string }>): string {
  if (!rows.length) return '—'
  const total = rows.reduce((a, r) => a + r.amount, 0)
  return rows.length === 1 ? `${money(total)} (${memberName(rows[0]!.memberId, members)})` : `${money(total)} (${rows.map((r) => `${memberName(r.memberId, members)} ${money(r.amount)}`).join(' · ')})`
}

/** The debriefing's content: on the screen and in the PDF the same. */
function useDebrief(month: string) {
  const fleet = useFleet()!
  const settings = useData((s) => s.fi!.settings)
  const transactions = useRecordList('transactions')
  const plans = useRecordList('months')
  const containers = useRecordList('containers')
  const game = useGameView()
  return useMemo(() => {
    const brief = debriefing(month, { transactions, categories: settings.categories, plans, log: fleet.log, alarms: fleet.alarms, containers, today: fleet.today })
    const log = logAccuracy(transactions, settings.orders, [month])[0]!
    const g = game?.input.game.find((x) => x.month === month)
    const days = Object.values(g?.days ?? {})
    // The missions judged in the month (their Sunday in it).
    const missions = (game?.input.game ?? []).flatMap((x) => x.missions).filter((m) => m.evaluatedAt && sundayOf(m.week).startsWith(month))
    const achievements = (game?.input.game ?? []).flatMap((x) => x.achievements).filter((a) => (a.day ?? '').startsWith(month))
    const fuel = fuelSummary(transactions, fleet.incomeContext, month, fleet.historyMonths, fleet.today)
    // AP-46 (T490): the month's flows from these numbers – the operations the debriefing reads (up to the budget's day).
    const ops = transactionsOfMonth(transactions, month).filter((t) => t.date <= fleet.today)
    const cats = categoryIndex(settings.categories)
    const money = monthFlows({ brief, fuel: fuel.month, outside: outsideMoney(ops, month, fleet.incomeContext, brief.financed), label: (id) => cats.label(id) })
    return {
      brief,
      log,
      fuel,
      flows: { money, energy: energyFlows(brief) },
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
  }, [month, fleet, settings, transactions, plans, containers, game])
}

function DebriefReport() {
  const fleet = useFleet()!
  const settings = useData((s) => s.fi!.settings)
  const cats = useCategories()
  const first = fleet.start ? monthOf(fleet.start) : fleet.month
  const months = monthRange(first, fleet.month).reverse()
  const [month, setMonth] = useState(() => (months[1] ?? months[0])!)
  const [view, setView] = useState<SankeyView>('money')
  const d = useDebrief(month)
  const b = d.brief
  // AP-31: the shields and the hull at the end of the 12 months up to this one (a month running – up to the one before).
  const cushion = useCushion(addMonths(month, 1))
  // The split as the engine made it (B10): the loot now, a late import included – and said, when it changed after the
  // decision (AP-24, RY sp. 3), as the month's plan says it.
  const loot = lootApplied(fleet.log, month)
  const changed = lootChange(d.plan?.month === month ? d.plan.loot : null, loot)
  const sections = (money: (g: number) => string, label: (id: string) => string): ReportSection[] => [
    {
      title: 'Wynik wobec planu',
      lines: [
        ['Pensja od siebie', b.salary == null ? '—' : money(b.salary)],
        ['Koszty netto', money(b.costs)],
        // The month counted up to today (AP-36): operations dated later apart, never in the costs.
        ...(b.planned ? ([[PLANNED_LABEL, money(b.planned)]] as Array<[string, string]>) : []),
        [CARGO_LABEL, money(b.cargo)],
        // The parts of the costs without an envelope (N25): the rows add up to the net costs with the envelopes below.
        ...(b.outside.length ? ([['Bez koperty', `${money(sum(b.outside.map((o) => o.spent)))} (${b.outside.map((o) => label(o.categoryId)).join(', ')})`]] as Array<[string, string]>) : []),
        ...(b.uncategorized > 0 ? ([['Bez kategorii (w puli codziennej)', money(b.uncategorized)]] as Array<[string, string]>) : []),
        // What household members financed (D80): not my costs, shown apart.
        ['Sfinansowane przez domowników', financedText(b.financed, money, settings.household.members)],
        // The month's energy as the engine ran it (N6): the salary less the tanks' installments, the loot given to it.
        ...(b.energy
          ? ([
              ['Energia miesiąca (pensja po odkładkach, z łupami)', money(b.energy.budget)],
              ['Wydane z energii (i ponad nią z osłon)', money(b.energy.used)]
            ] as Array<[string, string]>)
          : []),
        // F25: what the month added to the ship and its savings rate beside the median of the 6 months before – a month in
        // progress has no balance yet (AP-24, RY sp. 6: before the salary from work it is only a minus).
        ...(d.fuel.month
          ? !b.ended
            ? ([['Bilans paliwa (przychód − koszty netto)', 'miesiąc trwa – wynik po jego końcu']] as Array<[string, string]>)
            : ([
                ['Bilans paliwa (przychód − koszty netto)', signed(money, d.fuel.month.balance)],
                ['Stopa oszczędności', `${rateText(d.fuel.month.rate)}${d.fuel.median6 != null ? ` (mediana 6 mies.: ${rateText(d.fuel.median6)})` : ''}`]
              ] as Array<[string, string]>)
          : []),
        // A month in progress is never „na plus” yet (N65).
        ['Miesiąc zamknięty na plus', !b.ended ? 'miesiąc trwa' : b.plus == null ? '—' : b.plus ? 'tak' : 'nie'],
        ['Łupy (energia na koniec miesiąca)', b.loot == null ? 'miesiąc trwa' : money(b.loot)]
      ]
    },
    {
      title: 'FVG kopert (plan − fakt)',
      table: {
        head: ['Koperta', 'Limit', 'Wydane', 'FVG'],
        rows: [
          ...b.envelopes.map((e) => [label(e.categoryId), money(e.limit), money(e.spent), signed(money, e.gap)]),
          // The daily pool as the engine's daily energy (N11): the daily envelopes, the loot, the spending without a category.
          ...(b.daily ? [['Pula codzienna (z łupami i bez kategorii)', money(b.daily.limit), money(b.daily.spent), signed(money, b.daily.gap)]] : [])
        ],
        numeric: [1, 2, 3]
      }
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
        ['Bez oznaczenia (od progu)', String(d.log.unmarked)],
        // As the Wywiad counts it (N26): planned among the marked.
        ['Trafność (plan wśród oznaczonych)', d.log.plan.count + d.log.impulse.count ? `${Math.round((d.log.plan.count / (d.log.plan.count + d.log.impulse.count)) * 100)}%` : '—']
      ]
    },
    cushionSection('Osłony i kadłub – 12 miesięcy', cushion, money, true),
    ...(loot
      ? [
          {
            title: 'Podział łupów',
            lines: [
              ['Na następny miesiąc', money(loot.nextMonth)],
              ['Do celów', money(loot.goals)],
              ['Do osłon', money(loot.shields)]
            ] as Array<[string, string]>,
            ...(changed
              ? { text: `Łupy zmieniły się po decyzji (było ${money(changed.decided)}, jest ${money(changed.now)} – późniejszy import operacji miesiąca): podział przeliczony – cele, następny miesiąc, reszta do osłon.` }
              : {})
          }
        ]
      : [])
  ]
  // AP-46 (T491): the PDF draws both views of „Skąd i dokąd” after the result, with the real amounts (D73).
  const flowSections = (): ReportSection[] => [
    ...(d.flows.money.links.length ? [{ title: 'Skąd i dokąd – przychód i koszty', svg: sankeyPdfSvg(d.flows.money, fileZl) }] : []),
    ...(d.flows.energy?.links.length ? [{ title: 'Skąd i dokąd – pensja i energia', svg: sankeyPdfSvg(d.flows.energy, fileZl) }] : [])
  ]
  const pdf = () => {
    const [result, ...rest] = sections(fileZl, cats.label)
    return api
      .savePdf(`debriefing_${month}.pdf`, reportHtml(`Debriefing – ${monthLabel(month)}`, `Financial Intel · ${plDate(fleet.today)}`, [result!, ...flowSections(), ...rest]))
      .then(saved, failed)
  }
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
          {sections(zl, cats.label).map((s, i) => (
            <Fragment key={s.title}>
              <SectionView s={s} />
              {i === 0 && <MonthSankey money={d.flows.money} energy={d.flows.energy} empty="Brak przychodów i kosztów w tym miesiącu." view={view} onView={setView} />}
            </Fragment>
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
  const game = useGameView()
  const cats = useCategories()
  const thisYear = fleet.today.slice(0, 4)
  // In January the review of the year just closed (spec).
  const [year, setYear] = useState(() => (fleet.today.slice(5, 7) === '01' ? String(Number(thisYear) - 1) : thisYear))
  const y = useMemo(() => yearNumbers(transactions, settings.categories, year, fleet.incomeContext, fleet.today), [transactions, settings, year, fleet.incomeContext, fleet.today])
  const today = fleet.today
  // The year's months with history only (AP-24, R-19): before the data's first day – „brak historii”, never 0,00 zł.
  const span = useMemo(() => yearSpan(transactions, balances, year, today), [transactions, balances, year, today])
  // „Zaplanowane” beside the months shown (AP-36, T421) when one of them has operations dated after today – a later
  // month's are in the year's line „Zaplanowane”.
  const plannedShown = y.months.some((m) => m.planned > 0 && span.months.includes(m.month))
  const goalRecords = useRecordList('goals')
  const wealth = useMemo(() => yearWealth(transactions, balances, settings.accounts.map((a) => a.id), year, today), [transactions, balances, settings, year, today])
  // F24: „Siła floty netto” at both ends – the loans' open amounts and the household's balance beside the accounts.
  const loans = useRecordList('loans')
  const containers = useRecordList('containers')
  const net = useMemo(() => {
    const ends = [addDays(`${year}-01-01`, -1), `${year}-12-31` < today ? `${year}-12-31` : today]
    const adj = netAdjustments(ends, { loans, transactions, containers, household: fleet.household, today })
    return { start: wealth.start + adj[0]!, end: wealth.end + adj[1]! }
  }, [wealth, year, today, loans, transactions, containers, fleet.household])
  const achievements = (game?.input.game ?? []).flatMap((g) => g.achievements).filter((a) => (a.day ?? '').startsWith(year) && (ACHIEVEMENTS as readonly string[]).includes(a.id))
  // Every goal reached in the year – archived since, or marked achieved, too (RY sp. 5).
  const reached = goalsReachedIn(fleet.log, goalRecords, year, (iso) => warsawNow(iso).date)
  const endLabel = `${year}-12-31` < today ? '31.12' : 'dziś'
  const startLabel = span.startsOn ? `${span.startsOn.opening ? 'saldo otwarcia' : 'początek historii'} ${plDate(span.startsOn.date)}` : '31.12 roku wcześniej'
  // AP-31: the year's months that ended – the shields and the hull at each one's end.
  const cushion = useCushion(`${Number(year) + 1}-01`)
  const sections = (money: (g: number) => string): ReportSection[] => [
    {
      title: 'Rok w liczbach',
      lines: [
        ['Koszty netto', money(y.costs)],
        // The year counted up to today (AP-36): operations dated later apart, never in the costs.
        ...(y.planned ? ([[PLANNED_LABEL, money(y.planned)]] as Array<[string, string]>) : []),
        ['Sfinansowane przez domowników', financedText(y.financed, money, settings.household.members)],
        ['Przychody', money(y.income)],
        // The sum of the accounts' balances (T81, N63) – borrowed money and the household's advances in it.
        [`Pieniądze na kontach na początku (${startLabel})`, money(wealth.start)],
        [`Pieniądze na kontach na końcu (${endLabel})`, money(wealth.end)],
        // Net of the debt (RY sp. 5): „bez długu” read as „the debt left out”.
        [`Siła floty netto na początku (${startLabel}; z należnościami, po odjęciu długu)`, money(net.start)],
        [`Siła floty netto na końcu (${endLabel})`, money(net.end)],
        // F25: what the year added to the ship.
        ['Bilans paliwa roku (przychody − koszty netto)', `${signed(money, y.income - y.costs)} · stopa oszczędności ${rateText(savingsRate(y.income - y.costs, y.income))}`],
        ['Zasięg teraz', fleet.range == null ? '—' : `${rangeText(fleet.range)}${fleet.shipClass ? ` (${SHIP_CLASS_LABEL[fleet.shipClass]})` : ''}`]
      ]
    },
    {
      title: 'Miesiące',
      // The months with history only (AP-24, T449), „Zaplanowane” apart (AP-36, T421).
      table: {
        head: ['Miesiąc', 'Koszty', 'Przychody', ...(plannedShown ? ['Zaplanowane'] : [])],
        rows: [
          ...(span.before.length ? [[span.before.length > 1 ? `${monthLabel(span.before[0]!)} – ${monthLabel(span.before.at(-1)!)}` : monthLabel(span.before[0]!), 'brak historii', '—', ...(plannedShown ? ['—'] : [])]] : []),
          ...y.months.filter((m) => span.months.includes(m.month)).map((m) => [monthLabel(m.month), money(m.costs), money(m.income), ...(plannedShown ? [m.planned ? money(m.planned) : '—'] : [])])
        ],
        numeric: plannedShown ? [1, 2, 3] : [1, 2]
      },
      // Why the months do not add up to the year's income (N66, T119).
      text: 'Trading netto liczony w każdym miesiącu osobno (dopłaty do XTB nie schodzą poniżej zera); przychody roku nettują dopłaty z całego roku. Pieniądze na kontach to suma sald – z pożyczonymi i depozytem domowników.'
    },
    cushionSection('Osłony i kadłub na koniec miesięcy', cushion, money, false),
    { title: 'Kategorie', table: { head: ['Kategoria', 'Koszty'], rows: y.categories.slice(0, 12).map((c) => [c.id === 'cargo' ? CARGO_LABEL : c.id === '-' ? 'bez kategorii' : cats.label(c.id), money(c.cost)]), numeric: [1] } },
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
  const pdf = () => api.savePdf(`przeglad_${year}.pdf`, reportHtml(`Przegląd roczny ${year}`, `Financial Intel · ${plDate(fleet.today)}`, sections(fileZl))).then(saved, failed)
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
          <select className="input h-[24px] self-start" value={year} onChange={(e) => setYear(e.currentTarget.value)} aria-label="Rok przeglądu" data-testid="reports-year-select">
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
  const containers = useRecordList('containers')
  // The period as last chosen on this computer (AP-29): another tab, a restart keep it.
  const [period, setPeriod] = useState(() => readExportPeriod(fleet.today))
  const { from, to } = period
  const choose = (next: { from: string; to: string }) => {
    setPeriod(next)
    storeExportPeriod(next.from, next.to, fleet.today)
  }
  const ops = () => operationRows(transactions, settings.categories, settings.accounts, from, to, settings.household.members)
  // The operations' lines (AP-29) in the order of „Operacje” – the same operations, so „Nr operacji” is its row.
  const parts = () => partRowsOf(operationsOfPeriod(transactions, from, to), settings.categories, settings.accounts, settings.household.members)
  const months = () =>
    monthRows({ transactions, categories: settings.categories, plans, log: fleet.log, alarms: fleet.alarms, containers, today: fleet.today, income: fleet.incomeContext }, monthRange(monthOf(from), monthOf(to) > fleet.month ? fleet.month : monthOf(to)))
  const name = (what: string, ext: string) => `financial-intel_${what}_${from}_${to}.${ext}`
  // „Od” after „do” swap with a word (AP-15, AF-36): a range read backwards is no empty file with „Zapisano”. Both ends
  // at once (AP-29 keeps the period): one after the other, the second would write the first one's end as it was.
  const setEnds = (nextFrom: string, nextTo: string) => {
    const r = orderRange(nextFrom, nextTo)
    choose({ from: r.from!, to: r.to! })
    if (r.swapped) toast(swappedText('daty', plDate(r.from!), plDate(r.to!)), 'info', 6000)
  }
  // Nothing in the period: said, no empty file (RE sp. 5). The rows counted once – the same ones written.
  const save = <R,>(rows: R | null, none: string, write: (rows: R) => Promise<string | null>) => (rows == null ? toast(none, 'info', 5000) : write(rows).then(saved, failed))
  const some = <R,>(rows: readonly R[]) => (rows.length ? rows : null)
  const csv = { name: 'CSV', extensions: ['csv'] }
  return (
    <Columns id="reports-export" tracks={['minmax(420px,1fr)']} className="grid items-start">
      <Panel title="Eksport" testId="reports-export">
        <div className="flex flex-col gap-2 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="text-muted">Okres</span>
            <DateField className="h-[24px] w-[100px]" value={from} onChange={(d) => setEnds(d, to)} aria-label="Od" data-testid="export-from" />
            <span className="text-muted">–</span>
            <DateField className="h-[24px] w-[100px]" value={to} onChange={(d) => setEnds(from, d)} aria-label="Do" data-testid="export-to" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn h-[26px]" onClick={() => save(some(ops()), NO_OPERATIONS, (rows) => api.saveTextFile(name('operacje', 'csv'), operationsCsv(rows), csv))} data-testid="export-operations-csv">
              Operacje – CSV
            </button>
            <button
              className="btn h-[26px]"
              onClick={() => save(some(parts()), NO_OPERATIONS, (rows) => api.saveTextFile(name('czesci', 'csv'), partsCsv(rows), csv))}
              title="Każda część paragonu i wspólnego zakupu osobno, z kwotą i kategorią – operacja bez części jako jeden wiersz"
              data-testid="export-parts-csv"
            >
              Części – CSV
            </button>
            <button className="btn h-[26px]" onClick={() => save(some(months()), NO_MONTHS, (rows) => api.saveTextFile(name('miesiace', 'csv'), monthsCsv(rows), csv))} data-testid="export-months-csv">
              Miesiące – CSV
            </button>
            <button className="btn h-[26px]" onClick={() => save(budgetWorkbook(ops(), months(), parts()), NO_DATA, (sheets) => api.saveXlsx(name('budzet', 'xlsx'), sheets))} data-testid="export-xlsx">
              Excel (operacje + części + miesiące)
            </button>
            <button className="btn h-[26px]" onClick={() => api.exportZip().then(saved, failed)} data-testid="export-zip">
              Pełna kopia danych – ZIP
            </button>
          </div>
          <span className="text-[11px] text-dim">
            Pliki zawsze z prawdziwymi kwotami – ukrycie kwot (Ctrl+$) dotyczy tylko ekranu. CSV dla polskiego Excela (średnik, przecinek dziesiętny). „Części” – wiersz na
            każdą część paragonu (suma części = kwota operacji), do sumowania kategorii. Okres zapamiętany na tym komputerze. Debriefing i przegląd roczny jako PDF – w
            ich zakładkach.
          </span>
        </div>
      </Panel>
    </Columns>
  )
}
