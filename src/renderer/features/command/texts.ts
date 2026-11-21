/** Dowództwo's and the freezing question's texts (UX-51, UX-54, UX-55): pure, tested without the window. */
import { mondayOfWeek } from '@shared/calc/dates'
import { countLabel, plDate } from '@shared/format'

export interface CommandSummaryInput {
  /** Today's rating so far (null – the game has not started). */
  today: { violations: number; serious: boolean } | null
  streak: number
  mission: { title: string; status: string | null } | null
}

/** „Dziś: zgodny · seria 12 dni · misja: … – na razie: 3 z 5” – the three things the screen is opened for. */
export function commandSummary(i: CommandSummaryInput): string {
  const parts: string[] = []
  if (i.today) parts.push(`Dziś: ${i.today.violations ? (i.today.serious ? 'poważne naruszenie' : 'naruszenie') : 'zgodny'}`)
  parts.push(`seria ${countLabel(i.streak, 'dzień', 'dni', 'dni')}`)
  if (i.mission) parts.push(`misja: ${i.mission.title}${i.mission.status ? ` – ${i.mission.status}` : ''}`)
  return parts.join(' · ')
}

/** An ISO week as words with its first day (the year in it): „tydzień 47 (od 16.11.2026)” – never „W47”. */
export function weekLabel(week: string): string {
  return `tydzień ${Number(week.slice(6, 8))} (od ${plDate(mondayOfWeek(week))})`
}

/** What freezing does, in one sentence (UX-54): the days are rated by what the budget has now. */
export function freezeEffectText(range: string): string {
  return `Zamrożenie ocenia ${range} z operacji, które są teraz w budżecie – późniejszy import zmieni budżet, ale nie ocenę dnia, serię ani stopień.`
}
