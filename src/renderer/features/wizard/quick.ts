/**
 * The start wizard's first run and „Szybki start” (UX-79, D106 pkt 11, T546): pure, tested without the window. The
 * quick start is no second way of starting – the same answers of the wizard, three of them on one screen, the rest left
 * as the wizard proposes it; „Uruchom budżet” writes it as ever (`finishWizard` → `writeStart`, T446).
 */
import { countLabel, salariesText } from '@shared/format'
import { envelopeKind, type Category } from '@shared/schema'

/** A folder that holds no record of any collection yet – a new one (its fi.json alone). */
export function folderIsEmpty(records: Readonly<Record<string, Readonly<Record<string, unknown>>>>): boolean {
  return Object.values(records).every((c) => Object.keys(c).length === 0)
}

/** The main categories the quick start asks an amount for: the daily envelopes (not archived) – the plan's „Energia dziś”. */
export function quickEnvelopes<C extends Pick<Category, 'archived' | 'envelope'>>(mains: readonly C[]): C[] {
  return mains.filter((c) => !c.archived && envelopeKind(c) === 'daily')
}

/** What the quick start leaves as the wizard proposes it – said on its screen (nothing set without a word, AP-15). */
export interface QuickRest {
  shieldSalaries: number
  hullMonths: number
  /** The split of the money at the start (step 6): the shields, the hull, the goals and the tanks together. */
  shields: number
  hull: number
  others: number
  /** The planned envelopes of the first month (the averages' proposals; none without history). */
  planned: { count: number; total: number }
  /** Containers the start makes of the payments chosen in step 4. */
  containers: number
  autostart: boolean
}

export function quickRestLines(r: QuickRest, zl: (grosze: number) => string): string[] {
  return [
    `Cele warstw: osłony – ${salariesText(r.shieldSalaries)}, kadłub – ${countLabel(r.hullMonths, 'miesiąc', 'miesiące', 'miesięcy')} średnich kosztów.`,
    `Podział środków na start: osłony ${zl(r.shields)}, kadłub ${zl(r.hull)}${r.others > 0 ? `, cele i zbiorniki ${zl(r.others)}` : ''}.`,
    r.planned.count > 0
      ? `Koperty planowe ze średnich: ${countLabel(r.planned.count, 'koperta', 'koperty', 'kopert')}, razem ${zl(r.planned.total)}.`
      : 'Koperty planowe bez kwot – ustawisz je w Planie miesiąca.',
    r.containers > 0 ? `Ładownia: ${countLabel(r.containers, 'kontener', 'kontenery', 'kontenerów')} z wybranych płatności.` : 'Ładownia pusta – stałe opłaty dodasz w Ładowni.',
    `Rozkazy i nazwa okrętu – z ustawień budżetu; start z Windows ${r.autostart ? 'włączony' : 'wyłączony'} (Ustawienia → Zasobnik i start).`
  ]
}
