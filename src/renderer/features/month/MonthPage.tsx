import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { addMonths, warsawNow } from '@shared/calc/dates'
import type { FleetState } from '@shared/calc/fleet'
import { debriefing, lootDeadline, planFor, proposeEnvelopes, proposeSalary, salarySplit, sinkingOf, type Debriefing } from '@shared/calc/plan'
import { envelopeKind, type EnvelopeKind, type MonthPlan } from '@shared/schema'
import { useData } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { useRecordList } from '../../store/records'
import { navigate } from '../../store/ui'
import { AmountField, plnText } from '../../components/fields'
import { Meter } from '../../components/meters'
import { Columns } from '../../components/layout'
import { Badge, Empty, Panel, cx } from '../../components/ui'
import { IconBack, IconNext } from '../../components/icons'
import { dayLabel, monthLabel, plDate } from '../../lib/format'
import { useCategories } from '../operations/pickers'
import { decideLoot, setEnvelope, setEnvelopes, setSalary, usePlans } from './actions'
import { EnvelopeBars } from './EnvelopeBars'
import { playSound } from '../../lib/sounds'

const zl = (grosze: number) => `${plnText(grosze)} zł`
const KIND_TITLE: Record<EnvelopeKind, string> = { planned: 'Koperty planowe', daily: 'Koperty codzienne' }

function Row({ label, value, sub, className, testId }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string; testId?: string }) {
  return (
    <div className={cx('flex items-baseline gap-2 py-0.5', className)} data-testid={testId}>
      <span className="min-w-0 flex-1 truncate text-muted">{label}</span>
      {sub && <span className="text-[11px] text-dim">{sub}</span>}
      <span className="num text-fg-strong">{value}</span>
    </div>
  )
}

/**
 * Plan miesiąca (spec, „Plan miesiąca i dzienny przydział”): the salary and its split into the cargo, the tanks and
 * the envelopes, today's energy, the envelopes against their limits, and the debriefing of the month that ended –
 * plan against fact, „Miesiąc zamknięty na plus” and the loot split (D18).
 */
export function MonthPage() {
  const fleet = useFleet()
  const today = fleet?.today ?? warsawNow().date
  const current = today.slice(0, 7)
  const [month, setMonth] = useState(current)
  const plans = usePlans()
  const transactions = useRecordList('transactions')
  const containers = useRecordList('containers')
  const categories = useData((s) => s.fi?.settings.categories)
  const readOnly = useData((s) => !!s.status?.readOnly)
  const plan = planFor(plans, month)
  const own = plans.find((p) => p.month === month) ?? null
  const split = useMemo(() => (plan && categories ? salarySplit(plan, month, containers, categories, month <= current && fleet ? sinkingOf(fleet.log, month) : undefined) : null), [plan, month, containers, categories, current, fleet])
  const briefMonth = month < current ? month : addMonths(current, -1)
  const brief = useMemo(
    () => (categories ? debriefing(briefMonth, { transactions, categories, plans, log: fleet?.log ?? [], today }) : null),
    [briefMonth, transactions, categories, plans, fleet, today]
  )
  if (!fleet || !categories) return <Empty>Wczytywanie…</Empty>

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-month">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Plan miesiąca</h1>
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost h-[24px] px-1" onClick={() => setMonth(addMonths(month, -1))} title="Poprzedni miesiąc" data-testid="month-prev">
            <IconBack size={14} />
          </button>
          <span className="w-[150px] text-center text-[13px] text-fg-strong" data-testid="month-label">
            {monthLabel(month)}
          </span>
          <button className="btn btn-ghost h-[24px] px-1" onClick={() => setMonth(addMonths(month, 1))} title="Następny miesiąc" data-testid="month-next">
            <IconNext size={14} />
          </button>
          {month !== current && (
            <button className="btn h-[22px]" onClick={() => setMonth(current)}>
              bieżący
            </button>
          )}
        </div>
        <span className="text-[11.5px] text-muted" data-testid="month-source">
          {own ? 'plan tego miesiąca' : plan ? `korzysta z planu: ${monthLabel(plan.month)} – zmiana utworzy własny` : 'brak planu – wpisz pensję'}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Columns id="month" tracks={['minmax(380px,1.1fr)', 'minmax(340px,1fr)']} className="grid min-h-full items-start">
          <div className="flex min-w-0 flex-col">
            <SalaryPanel month={month} plan={plan} fleet={fleet} current={current} readOnly={readOnly} transactions={transactions} />
            {split && plan ? (
              <SplitPanel month={month} plan={plan} split={split} readOnly={readOnly} onPropose={() => applyProposals(month)} />
            ) : (
              <Panel title="Podział pensji">
                <Empty>Najpierw pensja – potem jej podział na ładownię, odkładki i koperty.</Empty>
              </Panel>
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            {month === current && <DailyPanel fleet={fleet} />}
            <EnvelopesPanel month={month} current={current} fleet={fleet} brief={month < current ? debriefing(month, { transactions, categories, plans, log: fleet.log, today }) : null} />
            {brief && (!fleet.start || brief.month >= fleet.start.slice(0, 7)) ? (
              <DebriefPanel brief={brief} fleet={fleet} today={today} plans={plans} readOnly={readOnly} />
            ) : (
              <Panel title="Debriefing" testId="month-debrief">
                <Empty>Pierwszy debriefing po pierwszym miesiącu budżetu{fleet.start ? ` – od ${dayLabel(`${addMonths(fleet.start.slice(0, 7), 1)}-01`)}` : ''}.</Empty>
              </Panel>
            )}
          </div>
        </Columns>
      </div>
    </div>
  )

  function applyProposals(m: string) {
    const p = proposeEnvelopes(transactions, categories!, m, containers)
    const limits = Object.fromEntries(p.envelopes.filter((e) => e.limit > 0).map((e) => [e.categoryId, e.limit]))
    if (!Object.keys(limits).length) return
    setEnvelopes(m, limits)
  }
}

function SalaryPanel({ month, plan, fleet, current, readOnly, transactions }: { month: string; plan: MonthPlan | null; fleet: FleetState; current: string; readOnly: boolean; transactions: ReturnType<typeof useRecordList<'transactions'>> }) {
  const proposal = useMemo(() => proposeSalary(transactions, month), [transactions, month])
  const alarms = fleet.alarms.filter((a) => (a.kind === 'salary-from-hull' || a.kind === 'salary-partial') && a.ref === month)
  const aboveIncome = month === current ? fleet.alarms.find((a) => a.kind === 'salary-above-income') : undefined
  const paid = month === current ? fleet.salary : null
  return (
    <Panel title="Pensja" testId="month-salary-panel">
      <div className="flex flex-col gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <AmountField className="w-[140px]" value={plan?.salary ?? null} allowEmpty onChange={(v) => !readOnly && setSalary(month, v ?? 0)} aria-label="Pensja" data-testid="month-salary" />
          <span className="text-muted">zł · wypłata z osłon 1. dnia miesiąca</span>
        </div>
        {proposal && proposal.amount !== plan?.salary && (
          <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
            <span>
              Średnie koszty z {proposal.months.length} mies.: {zl(proposal.average)} ·
            </span>
            <button className="text-accent hover:underline" onClick={() => setSalary(month, proposal.amount)} disabled={readOnly} data-testid="month-salary-propose">
              przyjmij {zl(proposal.amount)}
            </button>
          </div>
        )}
        {paid && (
          <div className="text-[11.5px] text-muted" data-testid="month-salary-paid">
            Wypłacono: {zl(paid.paid)}
            {paid.fromHull > 0 && ` (z osłon ${zl(paid.fromShields)}, z kadłuba ${zl(paid.fromHull)})`}
            {fleet.start && fleet.start.slice(0, 7) === month && plan && paid.paid < plan.salary && paid.alarm == null && ' – pierwszy miesiąc budżetu: bez tego, co wydał przed startem'}
          </div>
        )}
        {alarms.map((a) => (
          <div key={a.kind} className={cx('text-[11.5px]', a.level === 'red' ? 'text-down' : 'text-accent')}>
            {a.kind === 'salary-from-hull' ? `Za mało w osłonach: ${zl(a.amount)} z kadłuba (żółty alarm).` : `Pensja częściowa: brakuje ${zl(a.amount)} (czerwony alarm).`}
          </div>
        ))}
        {aboveIncome && (
          <div className="text-[11.5px] text-accent" data-testid="month-salary-above-income">
            Pensja wyższa niż średnie wpływy z 6 mies. o {zl(aboveIncome.amount)} – osłony będą się kurczyć.
          </div>
        )}
        {plan && plan.salary > 0 && fleet.shields.target != null && month === current && (
          <div className="text-[11px] text-dim">Cel osłon: {zl(fleet.shields.target)} (pensje × {Math.round(fleet.shields.target / plan.salary)})</div>
        )}
      </div>
    </Panel>
  )
}

function SplitPanel({ month, plan, split, readOnly, onPropose }: { month: string; plan: MonthPlan; split: NonNullable<ReturnType<typeof salarySplit>>; readOnly: boolean; onPropose: () => void }) {
  const cats = useCategories()
  const mains = cats.mains.filter((c) => !c.archived && envelopeKind(c))
  const [open, setOpen] = useState(false)
  return (
    <Panel
      title="Podział pensji"
      testId="month-split"
      actions={
        <button className="btn h-[22px]" onClick={onPropose} disabled={readOnly} title="Średnie wydatki kategorii z 3 pełnych miesięcy, do 10 zł (bez opłat z ładowni)" data-testid="month-envelopes-propose">
          Koperty ze średnich
        </button>
      }
    >
      <div className="flex flex-col text-[12px]">
        <Row label={<button className="hover:text-accent" onClick={() => navigate({ page: 'cargo' })}>Ładownia – stałe koszty ›</button>} value={zl(split.cargo.total)} testId="split-cargo" />
        <Row
          label={
            <button className="hover:text-accent" onClick={() => setOpen(!open)}>
              Odkładki – opłaty okresowe {split.tanks.items.length ? (open ? '▾' : '▸') : ''}
            </button>
          }
          value={zl(split.tanks.total)}
          testId="split-tanks"
        />
        {open &&
          split.tanks.items.map((t) => (
            <Row key={t.containerId} className="pl-3 text-[11.5px]" label={t.name} sub={`termin ${monthLabel(t.dueMonth)} · ${zl(t.due)}`} value={zl(t.amount)} />
          ))}
        {(['planned', 'daily'] as const).map((kind) => (
          <div key={kind} className="mt-2 flex flex-col">
            <div className="flex items-baseline justify-between border-b border-line pb-0.5">
              <span className="label">{KIND_TITLE[kind]}</span>
              <span className="num text-[11.5px] text-muted">{zl(split.envelopes[kind].total)}</span>
            </div>
            {mains
              .filter((c) => envelopeKind(c) === kind)
              .map((c) => (
                <div key={c.id} className="flex items-center gap-2 py-0.5" data-testid="month-envelope" data-name={c.name}>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <AmountField
                    className="h-[22px] w-[110px]"
                    value={plan.envelopes[c.id] ?? null}
                    allowEmpty
                    placeholder="—"
                    onChange={(v) => !readOnly && setEnvelope(month, c.id, v)}
                    aria-label={`Koperta ${c.name}`}
                    data-testid="month-envelope-input"
                  />
                </div>
              ))}
            {kind === 'daily' && <div className="mt-0.5 text-[11px] text-dim">Podstawowy przydział: {zl(split.dailyBase)} dziennie</div>}
          </div>
        ))}
        <div className="mt-2 border-t border-line pt-1.5">
          <Row label="Rozdzielone" value={zl(split.allocated)} />
          <Row
            label={split.unallocated < 0 ? 'Plan przekracza pensję o' : 'Niezaplanowane – zostaje w energii (łupy)'}
            value={<span className={split.unallocated < 0 ? 'text-down' : ''}>{zl(Math.abs(split.unallocated))}</span>}
            testId="month-unallocated"
          />
        </div>
      </div>
    </Panel>
  )
}

function DailyPanel({ fleet }: { fleet: FleetState }) {
  const d = fleet.daily
  return (
    <Panel title="Dzienny przydział" testId="month-daily">
      {!d ? (
        <Empty>Bez planu tego miesiąca nie ma przydziału – wpisz pensję i koperty codzienne.</Empty>
      ) : (
        <div className="flex flex-col gap-1 text-[12px]">
          <div className="flex items-baseline gap-2">
            <span className="text-muted">Energia dziś</span>
            <span className={cx('num text-[20px]', d.left < 0 ? 'text-down' : 'text-fg-strong')} data-testid="month-energy-today">
              {zl(d.left)}
            </span>
            <span className="text-[11.5px] text-dim">z {zl(d.allowance)}</span>
          </div>
          <Meter value={d.allowance - Math.max(0, d.left)} max={d.allowance} over />
          <Row label="Wydane dziś (koperty codzienne)" value={zl(d.spentToday)} />
          <Row label="Podstawowy przydział" value={zl(d.base)} />
          <Row label={`Koperty codzienne: wydane / limit`} value={`${zl(d.spentBefore + d.spentToday)} / ${zl(d.limit)}`} />
          <Row label="Dni do końca miesiąca (z dziś)" value={d.daysLeft} />
          <Row label="Energia miesiąca (pensja do wydania)" value={zl(fleet.energy)} />
          <p className="text-[11px] text-dim">Niewydana energia przechodzi na kolejne dni, przekroczenie zmniejsza przydział kolejnych dni.</p>
        </div>
      )}
    </Panel>
  )
}

function EnvelopesPanel({ month, current, fleet, brief }: { month: string; current: string; fleet: FleetState; brief: Debriefing | null }) {
  const rows = month === current ? fleet.envelopes : (brief?.envelopes ?? [])
  if (month > current) return null
  return (
    <Panel title="Koperty" testId="month-envelopes">
      {!rows.length ? <Empty>Brak kopert w tym miesiącu.</Empty> : <EnvelopeBars rows={rows} />}
    </Panel>
  )
}

function DebriefPanel({ brief, fleet, today, plans, readOnly }: { brief: Debriefing; fleet: FleetState; today: string; plans: MonthPlan[]; readOnly: boolean }) {
  const cats = useCategories()
  const deadline = lootDeadline(brief.month)
  const decision = plans.find((p) => p.month === brief.month)?.loot ?? null
  const pending = fleet.loot.month === brief.month && fleet.loot.amount > 0 && today <= deadline
  const [next, setNext] = useState(0)
  const [goals, setGoals] = useState<Record<string, number>>({})
  const goalsTotal = Object.values(goals).reduce((a, b) => a + b, 0)
  const toShields = Math.max(0, fleet.loot.amount - next - goalsTotal)
  usePlusFanfare(brief)
  return (
    <Panel title={`Debriefing – ${monthLabel(brief.month)}`} testId="month-debrief">
      <div className="flex flex-col gap-2 text-[12px]">
        {brief.plus === true && (
          <div className="relative overflow-hidden border border-accent/40 px-3 py-2" data-testid="month-plus">
            <div className="animate-event-in text-[13px] font-medium text-accent">Miesiąc zamknięty na plus</div>
            <div className="animate-event-in text-[11.5px] text-muted">Koszty netto {zl(brief.costs)} nie przekroczyły pensji {zl(brief.salary ?? 0)}.</div>
            <div className="absolute bottom-0 left-0 h-px w-full origin-left animate-sweep bg-accent" />
          </div>
        )}
        {brief.plus === false && (
          <div className="text-[11.5px] text-accent" data-testid="month-minus">
            Koszty netto {zl(brief.costs)} – ponad pensję {zl(brief.salary ?? 0)} o {zl(brief.costs - (brief.salary ?? 0))}.
          </div>
        )}
        {brief.plus === null && <div className="text-[11.5px] text-dim">Bez pensji w tym miesiącu – nie ma z czym porównać kosztów ({zl(brief.costs)}).</div>}
        <div className="flex flex-col">
          <Row label="Ładownia i odkładki" value={zl(brief.cargo)} />
          {brief.uncategorized > 0 && <Row label="Bez kategorii" value={zl(brief.uncategorized)} />}
          {brief.envelopes.map((e) => (
            <Row
              key={e.categoryId}
              label={cats.label(e.categoryId)}
              sub={`${zl(e.spent)} z ${zl(e.limit)}`}
              value={<span className={e.gap < 0 ? 'text-down' : 'text-up'}>{e.gap >= 0 ? `+${plnText(e.gap)}` : plnText(e.gap)} zł</span>}
            />
          ))}
          <p className="text-[11px] text-dim">FVG kopert: luka między planem a faktem (+ zostało, − ponad plan).</p>
        </div>
        <div className="border-t border-line pt-1.5" data-testid="loot">
          <span className="label">Podział łupów</span>
          {brief.loot == null ? (
            <p className="text-[11.5px] text-dim">Łupy (niewydana energia) policzymy po końcu miesiąca.</p>
          ) : decision ? (
            <p className="text-[11.5px] text-muted" data-testid="loot-decided">
              Decyzja z {plDate(decision.decidedAt.slice(0, 10))}: osłony {zl(decision.shields)}, następny miesiąc {zl(decision.nextMonth)}
              {Object.keys(decision.goals).length ? `, cele ${zl(Object.values(decision.goals).reduce((a, b) => a + b, 0))}` : ''}.
            </p>
          ) : pending ? (
            <div className="mt-1 flex flex-col gap-1.5">
              <div className="text-[11.5px] text-muted">
                Do podziału: <span className="num text-fg-strong">{zl(fleet.loot.amount)}</span> – decyzja do {dayLabel(deadline)}, potem trafią do osłon.
              </div>
              <div className="flex items-center gap-2">
                <span className="w-[150px] text-muted">na następny miesiąc</span>
                <AmountField className="h-[22px] w-[110px]" value={next} onChange={(v) => setNext(Math.min(fleet.loot.amount, v ?? 0))} aria-label="Na następny miesiąc" data-testid="loot-next" />
              </div>
              {fleet.goals.map((g) => (
                <div key={g.id} className="flex items-center gap-2">
                  <span className="w-[150px] truncate text-muted">cel: {g.name}</span>
                  <AmountField className="h-[22px] w-[110px]" value={goals[g.id] ?? 0} onChange={(v) => setGoals({ ...goals, [g.id]: v ?? 0 })} aria-label={`Cel ${g.name}`} />
                </div>
              ))}
              <Row label="do osłon (reszta)" value={zl(toShields)} />
              <button className="btn btn-accent h-[24px] self-start" disabled={readOnly || next + goalsTotal > fleet.loot.amount} onClick={() => decideLoot(brief.month, fleet.loot.amount, { nextMonth: next, goals })} data-testid="loot-confirm">
                Zatwierdź podział łupów
              </button>
            </div>
          ) : brief.loot > 0 ? (
            <p className="text-[11.5px] text-muted">Łupy {zl(brief.loot)} bez decyzji do {dayLabel(deadline)} – trafiły do osłon.</p>
          ) : (
            <p className="text-[11.5px] text-dim">Energia wydana do końca – bez łupów.</p>
          )}
        </div>
        {decision && <Badge tone="accent">zamknięty</Badge>}
      </div>
    </Panel>
  )
}

/** „Miesiąc zamknięty na plus” plays its sound once per month on this computer. */
function usePlusFanfare(brief: Debriefing): void {
  useEffect(() => {
    if (brief.plus !== true) return
    const key = `fi.month.plus.${brief.month}`
    try {
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
    } catch {
      return
    }
    playSound('plus')
  }, [brief.month, brief.plus])
}
