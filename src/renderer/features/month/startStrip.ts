/**
 * „Na początek miesiąca” (UX-48): the first week's order of work after the salary day – the debriefing of the month that
 * ended, the loot, the salary and the envelopes, the docking – each with its state. Pure: the page gives it what it knows.
 */
import { countLabel, plural } from '@shared/format'
import { dayLabel, monthGenLabel, monthLabel } from '../../lib/format'

/** The strip is shown up to this day of the month (the loot's decision falls due on it). */
export const START_STRIP_LAST_DAY = 7

export type StartStepState = 'todo' | 'done' | 'info' | 'skip'
export interface StartStep {
  key: 'debrief' | 'loot' | 'plan' | 'dock'
  state: StartStepState
  title: string
  text: string
}

export interface StartStripInput {
  today: string
  /** The month shown on the page. */
  month: string
  /** The debriefing of the month that ended (null – the budget has none yet). */
  brief: { month: string; plus: boolean | null; loot: number | null } | null
  /** The loot waiting for its decision (null – none, or its day passed). */
  lootPending: { amount: number; deadline: string } | null
  lootDecided: boolean
  salary: number | null
  /** The envelopes with a limit in the plan. */
  envelopes: number
  /** The month whose plan this month uses when it has none of its own. */
  inherited: string | null
  toDock: number
  zl: (grosze: number) => string
}

export function startStrip(i: StartStripInput): StartStep[] | null {
  if (i.today.slice(0, 7) !== i.month || Number(i.today.slice(8, 10)) > START_STRIP_LAST_DAY) return null
  const { brief } = i
  const debrief: StartStep = brief
    ? {
        key: 'debrief',
        state: 'info',
        title: `Debriefing – ${monthLabel(brief.month)}`,
        text: brief.plus === true ? 'miesiąc zamknięty na plus' : brief.plus === false ? 'miesiąc zamknięty na minus' : 'bez pensji – nie ma z czym porównać kosztów'
      }
    : { key: 'debrief', state: 'skip', title: 'Debriefing', text: 'pierwszy debriefing po pierwszym miesiącu budżetu' }
  const loot: StartStep = { key: 'loot', title: 'Łupy', ...lootStep(i) }
  const salaryText = i.salary != null && i.salary > 0 ? `pensja ${i.zl(i.salary)}` : ''
  const plan: StartStep = {
    key: 'plan',
    title: 'Pensja i koperty',
    ...(!salaryText
      ? { state: 'todo' as const, text: 'wpisz pensję' }
      : !i.envelopes
        ? { state: 'todo' as const, text: `${salaryText} – wpisz koperty` }
        : { state: 'done' as const, text: `${salaryText}, ${countLabel(i.envelopes, 'koperta', 'koperty', 'kopert')}${i.inherited ? ` · plan z ${monthGenLabel(i.inherited)}` : ''}` })
  }
  const dock: StartStep = {
    key: 'dock',
    title: 'Dokowanie',
    ...(i.toDock > 0
      ? { state: 'todo' as const, text: `${i.toDock} ${plural(i.toDock, 'dostawa czeka', 'dostawy czekają', 'dostaw czeka')} na dokowanie` }
      : { state: 'skip' as const, text: 'brak dostaw do zadokowania' })
  }
  return [debrief, loot, plan, dock]
}

function lootStep(i: StartStripInput): { state: StartStepState; text: string } {
  if (i.lootDecided) return { state: 'done', text: 'podział zatwierdzony' }
  if (i.lootPending) return { state: 'todo', text: `do podziału ${i.zl(i.lootPending.amount)} – decyzja do ${dayLabel(i.lootPending.deadline)}` }
  if (i.brief && (i.brief.loot ?? 0) > 0) return { state: 'done', text: 'trafiły do osłon' }
  return { state: 'skip', text: 'bez łupów' }
}
