/**
 * Wywiad (1.8.0): the course for 12 months (F27 – three courses by the income: without the payouts from XTB, the median,
 * the average) and the maneuvers' simulator (F35 – „co jeśli”: the same course with a changed input side by side; nothing
 * is stored, „Zastosuj” only where it is an ordinary edit – the salary of a month on).
 */
import { useMemo, useState } from 'react'
import { addMonths, monthOf } from '@shared/calc/dates'
import { course, COURSE_KINDS, COURSE_LABEL, courseIncome, maneuver, MANEUVER_GOAL, type Course, type CourseInput, type CourseKind, type Maneuver } from '@shared/calc/course'
import { SHIP_CLASS_LABEL, shipClass, type FleetState } from '@shared/calc/fleet'
import { planFor } from '@shared/calc/plan'
import { openDays, scheduledWindow } from '@shared/calc/scheduled'
import { rangeText } from '@shared/format'
import { byPriority } from '@shared/calc/goals'
import { AmountField, plnText } from '../../components/fields'
import { Field, NumberField, Panel, Segmented, Toggle, cx } from '../../components/ui'
import { useData } from '../../store/data'
import { useRecordList } from '../../store/records'
import { toast } from '../../store/ui'
import { monthLabel } from '../../lib/format'
import { setSalary } from '../month/actions'

const zl = (g: number) => `${plnText(g)} zł`
const mm = (m: string | null) => (m ? `${m.slice(5, 7)}.${m.slice(0, 4)}` : '—')
/** The buoys the course reads: its 12 months after this one, whole. */
const COURSE_DAYS = 400

/** The course's input from the engine's state now and the records: the plans, the buoys, the loans. */
export function useCourseInput(fleet: FleetState | null): CourseInput | null {
  const settings = useData((s) => s.fi?.settings ?? null)
  const plans = useRecordList('months')
  const goals = useRecordList('goals')
  const scheduled = useRecordList('scheduled')
  const transactions = useRecordList('transactions')
  return useMemo(() => {
    if (!fleet?.started || !settings) return null
    const extras = new Map<string, number>()
    const add = (month: string, v: number) => extras.set(month, (extras.get(month) ?? 0) + v)
    // The buoys' open days of the course's year (a late one in this month), the repayments expected of the loans given.
    for (const d of openDays(scheduledWindow(scheduled, transactions, fleet.today, COURSE_DAYS))) if (d.scheduled.amount != null) add(d.date < fleet.today ? fleet.month : monthOf(d.date), d.scheduled.amount)
    const installments: Array<{ month: string; amount: number }> = []
    for (const l of fleet.loans) {
      if (l.loan.closedAt) continue
      for (const i of l.left) {
        if (l.loan.direction === 'given') add(i.date < fleet.today ? fleet.month : monthOf(i.date), i.amount)
        else installments.push({ month: monthOf(i.date), amount: i.amount })
      }
    }
    const records = new Map(goals.map((g) => [g.id, g]))
    return {
      month: fleet.month,
      shields: fleet.shields.amount,
      hull: fleet.hull.amount,
      goals: byPriority(fleet.goals.filter((g) => g.takes).map((g) => ({ ...g, createdAt: records.get(g.id)?.createdAt ?? '' }))).map((g) => ({
        id: g.id,
        name: g.name,
        amount: g.amount,
        target: g.target,
        deadline: records.get(g.id)?.deadline ?? null,
        rates: records.get(g.id)?.rates ?? []
      })),
      salaryOf: (m: string) => planFor(plans, m)?.salary ?? null,
      planMonths: plans.map((p) => p.month),
      costs: fleet.costs.average,
      layers: settings.layers,
      minShieldSalaries: settings.orders.minShieldSalaries,
      income: { work: 0, trading: 0 },
      extras,
      debt: fleet.debt,
      installments
    }
  }, [fleet, settings, plans, goals, scheduled, transactions])
}

export function CoursePanel({ fleet, input }: { fleet: FleetState; input: CourseInput | null }) {
  const courses = useMemo(() => (input ? COURSE_KINDS.map((k) => course({ ...input, income: courseIncome(fleet.incomeStats, k) }, k)) : []), [input, fleet.incomeStats])
  return (
    <Panel title="Kurs na 12 miesięcy" testId="intel-course">
      {!input ? (
        <span className="text-[12px] text-muted">Kurs policzy się po starcie budżetu.</span>
      ) : (
        <div className="flex flex-col gap-2 text-[12px]">
          <table className="w-full text-[11.5px]" data-testid="intel-course-summary">
            <thead>
              <tr className="text-dim">
                <th className="py-0.5 text-left font-normal" />
                {courses.map((c) => (
                  <th key={c.kind} className="text-right font-normal" title={`Wpływy ${zl(c.income)} miesięcznie`}>
                    {COURSE_LABEL[c.kind]}
                    <span className="block num">{zl(c.income)}/mies.</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SummaryRow label="Osłony pełne" values={courses.map((c) => mm(c.shieldsFull))} />
              <SummaryRow label="Kadłub pełny" values={courses.map((c) => mm(c.hullFull))} />
              {input.goals
                .filter((g) => g.target > 0)
                .map((g) => (
                  <SummaryRow key={g.id} label={`Cel: ${g.name}`} values={courses.map((c) => (c.goalEta[g.id] ? mm(c.goalEta[g.id]!) : 'poza kursem'))} late={courses.map((c) => !!g.deadline && (c.goalEta[g.id] ?? '9999-99') > g.deadline)} />
                ))}
              <SummaryRow label="Poniżej minimum osłon" values={courses.map((c) => (c.belowMin.length ? c.belowMin.map(mm).join(', ') : 'nie'))} late={courses.map((c) => c.belowMin.length > 0)} testId="intel-course-below" />
              <SummaryRow label="Pensja z kadłuba" values={courses.map((c) => (c.fromHull.length ? c.fromHull.map(mm).join(', ') : 'nie'))} late={courses.map((c) => c.fromHull.length > 0)} />
            </tbody>
          </table>
          <table className="w-full text-[11.5px]" data-testid="intel-course-months">
            <thead>
              <tr className="text-dim">
                <th className="py-0.5 text-left font-normal">Miesiąc</th>
                {courses.map((c) => (
                  <th key={c.kind} className="text-right font-normal">
                    osłony · kadłub
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courses[0]?.months.map((m, i) => (
                <tr key={m.month} className="border-t border-line/50">
                  <td className="py-0.5 text-muted">{monthLabel(m.month).slice(0, 3)} {m.month.slice(2, 4)}</td>
                  {courses.map((c) => {
                    const x = c.months[i]!
                    return (
                      <td key={c.kind} className={cx('num text-right', x.belowMin && 'text-accent')} title={x.belowMin ? `Najniżej w miesiącu ${zl(x.low)} – poniżej minimum osłon` : `Najniżej w miesiącu ${zl(x.low)}`}>
                        {plnText(x.shields)} · <span className="text-muted">{plnText(x.hull)}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <span className="text-[11px] text-dim">
            Pensja z osłon 1. dnia, koszty po średniej (nad pensję – z osłon), wpływy dokowane: osłony → kadłub → cele; boje i spodziewane spłaty w swoich miesiącach. Wpływy: mediana albo średnia z 12 miesięcy (panel Przychody).
          </span>
        </div>
      )}
    </Panel>
  )
}

function SummaryRow({ label, values, late, testId }: { label: string; values: string[]; late?: boolean[]; testId?: string }) {
  return (
    <tr className="border-t border-line/50" data-testid={testId}>
      <td className="py-0.5 text-muted">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={cx('num text-right', late?.[i] ? 'text-accent' : 'text-fg-strong')}>
          {v}
        </td>
      ))}
    </tr>
  )
}

interface Form {
  salary: number | null
  salaryFrom: string
  purchase: number | null
  purchaseMonth: string
  purchaseFrom: string
  noXtb: number | null
  costsPct: number | null
  goalName: string
  goalTarget: number | null
  goalDeadline: string
  goalRate: boolean
  container: number | null
  containerCycle: number
}

/** The form's maneuver (F35): only what is typed. */
const maneuverOf = (f: Form): Maneuver => ({
  salary: f.salary ? { amount: f.salary, from: f.salaryFrom } : null,
  purchase: f.purchase ? { amount: f.purchase, month: f.purchaseMonth, from: f.purchaseFrom } : null,
  noXtbMonths: f.noXtb || null,
  costsPct: f.costsPct || null,
  goal: f.goalTarget ? { name: f.goalName, target: f.goalTarget, deadline: /^\d{4}-(0[1-9]|1[0-2])$/.test(f.goalDeadline) ? f.goalDeadline : null, rate: f.goalRate } : null,
  container: f.container ? { amount: f.container, cycleMonths: f.containerCycle } : null
})

const summaryOf = (c: Course) => ({
  range: c.rangeNow,
  shieldsFull: c.shieldsFull,
  hullFull: c.hullFull,
  below: c.belowMin,
  fromHull: c.fromHull
})

const classOf = (range: number | null) => (range == null ? '—' : SHIP_CLASS_LABEL[shipClass(range)])

export function ManeuverPanel({ fleet, input }: { fleet: FleetState; input: CourseInput | null }) {
  const next = addMonths(fleet.month, 1)
  const [kind, setKind] = useState<CourseKind>('median')
  const [f, setF] = useState<Form>({ salary: null, salaryFrom: next, purchase: null, purchaseMonth: fleet.month, purchaseFrom: 'shields', noXtb: null, costsPct: null, goalName: '', goalTarget: null, goalDeadline: '', goalRate: false, container: null, containerCycle: 1 })
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }))
  const m = useMemo(() => maneuverOf(f), [f])
  const changed = Object.values(m).some((v) => v != null)
  const [before, after] = useMemo(() => {
    if (!input) return [null, null]
    const base = { ...input, income: courseIncome(fleet.incomeStats, kind) }
    return [course(base, kind), course(maneuver(base, m), kind)]
  }, [input, fleet.incomeStats, kind, m])
  const months = Array.from({ length: 13 }, (_, i) => addMonths(fleet.month, i))
  return (
    <Panel title="Symulator manewrów" testId="intel-maneuver">
      {!input || !before || !after ? (
        <span className="text-[12px] text-muted">Symulator ruszy po starcie budżetu.</span>
      ) : (
        <div className="flex flex-col gap-2 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="text-muted">Kurs</span>
            <Segmented size="sm" value={kind} onChange={setKind} options={COURSE_KINDS.map((k) => ({ value: k, label: COURSE_LABEL[k] }))} aria-label="Kurs symulatora" />
          </div>
          <Field label="Pensja" labelWidth={130}>
            <div className="flex items-center gap-2">
              <AmountField className="h-[24px] w-[100px]" value={f.salary} allowEmpty onChange={(salary) => set({ salary })} aria-label="Nowa pensja" data-testid="maneuver-salary" />
              <span className="text-muted">od</span>
              <MonthSelect value={f.salaryFrom} months={months.slice(1)} onChange={(salaryFrom) => set({ salaryFrom })} label="Pensja od miesiąca" />
            </div>
          </Field>
          <Field label="Zakup" labelWidth={130}>
            <div className="flex items-center gap-2">
              <AmountField className="h-[24px] w-[100px]" value={f.purchase} allowEmpty onChange={(purchase) => set({ purchase })} aria-label="Kwota zakupu" data-testid="maneuver-purchase" />
              <MonthSelect value={f.purchaseMonth} months={months} onChange={(purchaseMonth) => set({ purchaseMonth })} label="Miesiąc zakupu" />
              <select className="input h-[24px]" value={f.purchaseFrom} onChange={(e) => set({ purchaseFrom: e.currentTarget.value })} aria-label="Zakup z" data-testid="maneuver-purchase-from">
                <option value="shields">z osłon</option>
                {input.goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    z celu {g.name}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="Bez wypłat z XTB" labelWidth={130} hint="Przez tyle miesięcy od następnego.">
            <NumberField className="h-[24px] w-[60px]" value={f.noXtb} decimals={0} step={1} isValid={(v) => v == null || (v >= 0 && v <= 12)} onChange={(noXtb) => set({ noXtb })} aria-label="Miesiące bez wypłat z XTB" data-testid="maneuver-noxtb" />
          </Field>
          <Field label="Koszty wyższe o" labelWidth={130} hint={input.costs == null ? 'Średnie koszty jeszcze nieznane (bez pełnego miesiąca) – kurs liczy wydatki jako pensję; zmiana kosztów i kontener bez skutku.' : undefined}>
            <div className="flex items-center gap-1">
              <NumberField className="h-[24px] w-[60px]" value={f.costsPct} decimals={0} step={5} isValid={(v) => v == null || (v >= -50 && v <= 200)} onChange={(costsPct) => set({ costsPct })} aria-label="Koszty wyższe o procent" data-testid="maneuver-costs" />
              <span className="text-muted">%</span>
            </div>
          </Field>
          <Field label="Nowy cel" labelWidth={130}>
            <div className="flex flex-wrap items-center gap-2">
              <input className="input h-[24px] w-[110px]" value={f.goalName} maxLength={80} placeholder="nazwa" onChange={(e) => set({ goalName: e.currentTarget.value })} aria-label="Nazwa nowego celu" />
              <AmountField className="h-[24px] w-[100px]" value={f.goalTarget} allowEmpty onChange={(goalTarget) => set({ goalTarget })} aria-label="Kwota nowego celu" data-testid="maneuver-goal" />
              <input className="input num h-[24px] w-[76px]" value={f.goalDeadline} placeholder="RRRR-MM" onChange={(e) => set({ goalDeadline: e.currentTarget.value.trim() })} aria-label="Termin nowego celu" />
              <Toggle checked={f.goalRate} onChange={(goalRate) => set({ goalRate })} label="rata z pensji" />
            </div>
          </Field>
          <Field label="Nowy kontener" labelWidth={130}>
            <div className="flex items-center gap-2">
              <AmountField className="h-[24px] w-[100px]" value={f.container} allowEmpty onChange={(container) => set({ container })} aria-label="Kwota nowego kontenera" data-testid="maneuver-container" />
              <span className="text-muted">co</span>
              <NumberField className="h-[24px] w-[50px]" value={f.containerCycle} decimals={0} step={1} isValid={(v) => v != null && v >= 1 && v <= 60} onChange={(v) => v != null && set({ containerCycle: v })} aria-label="Cykl nowego kontenera" />
              <span className="text-muted">mies.</span>
            </div>
          </Field>
          <table className="w-full text-[11.5px]" data-testid="maneuver-result">
            <thead>
              <tr className="text-dim">
                <th className="py-0.5 text-left font-normal" />
                <th className="text-right font-normal">teraz</th>
                <th className="text-right font-normal">po manewrze</th>
              </tr>
            </thead>
            <tbody>
              <Compare label="Zasięg i klasa" a={summaryOf(before).range} b={summaryOf(after).range} text={(r) => (r == null ? '—' : `${rangeText(r)} · ${classOf(r)}`)} worse={(a, b) => (b ?? 0) < (a ?? 0)} testId="maneuver-range" />
              <Compare label="Osłony pełne" a={before.shieldsFull} b={after.shieldsFull} text={mm} worse={(a, b) => (b ?? '9999') > (a ?? '9999')} />
              <Compare label="Kadłub pełny" a={before.hullFull} b={after.hullFull} text={mm} worse={(a, b) => (b ?? '9999') > (a ?? '9999')} />
              {[...input.goals, ...(m.goal ? [{ id: MANEUVER_GOAL, name: m.goal.name || 'nowy cel' }] : [])].map((g) => (
                <Compare key={g.id} label={`Cel: ${g.name}`} a={before.goalEta[g.id] ?? null} b={after.goalEta[g.id] ?? null} text={(v) => (v ? mm(v) : 'poza kursem')} worse={(a, b) => (b ?? '9999') > (a ?? '9999')} />
              ))}
              <Compare label="Poniżej minimum osłon" a={before.belowMin} b={after.belowMin} text={(v) => (v.length ? v.map(mm).join(', ') : 'nie')} worse={(a, b) => b.length > a.length} testId="maneuver-below" />
              <Compare label="Pensja z kadłuba" a={before.fromHull} b={after.fromHull} text={(v) => (v.length ? v.map(mm).join(', ') : 'nie')} worse={(a, b) => b.length > a.length} />
            </tbody>
          </table>
          <div className="flex items-center gap-2">
            {m.salary && (
              <button
                className="btn h-[24px]"
                onClick={() => {
                  setSalary(m.salary!.from, m.salary!.amount)
                  toast(`Pensja ${zl(m.salary!.amount)} od ${mm(m.salary!.from)} w planie miesiąca.`, 'success')
                }}
                data-testid="maneuver-apply-salary"
              >
                Zastosuj pensję od {mm(m.salary.from)}
              </button>
            )}
            {changed && (
              <button className="whitespace-nowrap text-[11.5px] text-muted hover:text-fg-strong" onClick={() => setF((x) => ({ ...x, salary: null, purchase: null, noXtb: null, costsPct: null, goalTarget: null, container: null }))}>
                wyczyść manewr
              </button>
            )}
          </div>
          <span className="text-[11px] text-dim">Symulacja – nic się nie zapisuje; plan miesiąca zmienia tylko „Zastosuj pensję”.</span>
        </div>
      )}
    </Panel>
  )
}

function MonthSelect({ value, months, onChange, label }: { value: string; months: string[]; onChange: (m: string) => void; label: string }) {
  return (
    <select className="input h-[24px]" value={value} onChange={(e) => onChange(e.currentTarget.value)} aria-label={label}>
      {months.map((m) => (
        <option key={m} value={m}>
          {mm(m)}
        </option>
      ))}
    </select>
  )
}

function Compare<T>({ label, a, b, text, worse, testId }: { label: string; a: T; b: T; text: (v: T) => string; worse: (a: T, b: T) => boolean; testId?: string }) {
  const ta = text(a)
  const tb = text(b)
  return (
    <tr className="border-t border-line/50" data-testid={testId}>
      <td className="py-0.5 text-muted">{label}</td>
      <td className="num text-right">{ta}</td>
      <td className={cx('num text-right', tb !== ta && (worse(a, b) ? 'text-accent' : 'text-fg-strong'))}>{tb}</td>
    </tr>
  )
}
